import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import iris

USER = "meridian.demo.witness"
HOST = "127.0.0.1"
PORT = 1972
NAMESPACE = "USER"

PURPOSE_MARKER_PREFIX = "meridian:process-witness:"
PURPOSE_MARKER_MAX_BYTES = 64
GENERATION_MAX_UTF8_BYTES = (
    PURPOSE_MARKER_MAX_BYTES
    - len(PURPOSE_MARKER_PREFIX.encode("utf-8"))
)

BUSINESS = [
    ("Meridian_Admin", "USE"),
    ("%Admin_Task", "USE"),
    ("Meridian_Orders", "WRITE"),
    ("Meridian_Jobs", "USE"),
    ("Meridian_Portal", "USE"),
    ("Meridian_Orders", "READ"),
]

TRANSPORT = [
    ("%Native_GlobalAccess", "USE"),
    ("%Native_ClassExecution", "USE"),
    ("%Native_Transaction", "USE"),
    ("%Native_Concurrency", "USE"),
]

if len(sys.argv) != 2:
    raise SystemExit("control directory argument required")

control = Path(sys.argv[1])
control.mkdir(parents=True, exist_ok=True)

payload = json.load(sys.stdin)
password = payload.get("password", "")
generation = payload.get("generation", "")

if not isinstance(password, str) or not password:
    raise SystemExit("fixture password missing")

if not isinstance(generation, str) or not generation:
    raise SystemExit("fixture generation missing")

if generation != generation.strip():
    raise SystemExit("fixture generation must be canonical")

if len(generation.encode("utf-8")) > GENERATION_MAX_UTF8_BYTES:
    raise SystemExit("fixture generation exceeds purpose-marker capacity")

purpose_marker = PURPOSE_MARKER_PREFIX + generation

if len(purpose_marker.encode("utf-8")) > PURPOSE_MARKER_MAX_BYTES:
    raise SystemExit("process purpose marker exceeds 64-byte UserInfo capacity")

payload.clear()

conn = None
irispy = None


def now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def sanitize(value):
    text = str(value)

    if password:
        text = text.replace(password, "<redacted>")

    return text[:1600]


def atomic_json(path, data):
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(
        json.dumps(data, sort_keys=True, separators=(",", ":")),
        encoding="utf-8",
    )
    os.replace(temp, path)


def checks():
    observed = {}

    for resource, permission in BUSINESS + TRANSPORT:
        key = resource + ":" + permission
        value = irispy.classMethodValue(
            "%SYSTEM.Security",
            "Check",
            resource,
            permission,
        )
        observed[key] = int(bool(value))

    return observed


def snapshot(label):
    result = {
        "ok": False,
        "label": label,
        "capturedAtUtc": now(),
        "generation": generation,
        "controllerOsPid": os.getpid(),
        "failureStage": "begin",
    }

    cursor = None

    try:
        if conn is None or irispy is None:
            raise RuntimeError("native connection is not open")

        result["failureStage"] = "shared-memory"
        result["usingSharedMemory"] = bool(
            conn.isUsingSharedMemory()
        )

        result["failureStage"] = "process-methods"
        result["systemProcessUserNameMethod"] = irispy.classMethodString(
            "%SYSTEM.Process",
            "UserName",
        )
        result["systemProcessNamespaceMethod"] = irispy.classMethodString(
            "%SYSTEM.Process",
            "NameSpace",
        )

        result["failureStage"] = "cursor"
        cursor = conn.cursor()

        cursor.execute("SELECT USER AS CurrentUser")
        row = cursor.fetchone()
        result["sqlCurrentUser"] = str(row[0])

        cursor.execute("SELECT $USERNAME AS DollarUsername")
        row = cursor.fetchone()
        result["sqlDollarUsername"] = str(row[0])

        cursor.execute("SELECT $JOB AS CurrentPid")
        row = cursor.fetchone()
        result["sqlCurrentPid"] = int(row[0])

        result["failureStage"] = "purpose-marker"
        process = irispy.classMethodObject(
            "%SYS.ProcessQuery",
            "%OpenId",
            result["sqlCurrentPid"],
        )

        if process is None:
            raise RuntimeError("self ProcessQuery object open failed")

        observed_user_info = process.get("UserInfo")
        result["purposeMarker"] = purpose_marker
        result["selfUserInfo"] = (
            ""
            if observed_user_info is None
            else str(observed_user_info)
        )

        if result["selfUserInfo"] != purpose_marker:
            raise RuntimeError("self UserInfo purpose marker drifted")

        result["failureStage"] = "cursor"
        cursor.execute("SELECT $NAMESPACE AS CurrentNamespace")
        row = cursor.fetchone()
        result["sqlCurrentNamespace"] = str(row[0])

        result["failureStage"] = "security-checks"
        result["checks"] = checks()

        result["failureStage"] = "none"
        result["ok"] = True

    except Exception as exc:
        result["errorType"] = type(exc).__name__
        result["errorMessage"] = sanitize(exc)
        result["errorArgs"] = [
            sanitize(item)
            for item in getattr(exc, "args", ())
        ]

    finally:
        if cursor is not None:
            try:
                cursor.close()
            except Exception:
                pass

    return result


def bind_process_purpose_marker():
    cursor = None

    try:
        if conn is None or irispy is None:
            raise RuntimeError("native connection is not open")

        cursor = conn.cursor()
        cursor.execute("SELECT $JOB AS CurrentPid")
        row = cursor.fetchone()

        if row is None:
            raise RuntimeError("self PID query returned no row")

        pid = int(row[0])

        if pid < 1:
            raise RuntimeError("self PID is not positive")

        process = irispy.classMethodObject(
            "%SYS.ProcessQuery",
            "%OpenId",
            pid,
        )

        if process is None:
            raise RuntimeError("self ProcessQuery object open failed")

        process.set("UserInfo", purpose_marker)
        observed = process.get("UserInfo")
        observed_text = "" if observed is None else str(observed)

        if observed_text != purpose_marker:
            raise RuntimeError("self UserInfo purpose-marker readback drifted")

        return pid

    finally:
        if cursor is not None:
            try:
                cursor.close()
            except Exception:
                pass


def connect():
    global conn, irispy

    if conn is not None:
        raise RuntimeError("native connection is already open")

    conn = iris.connect(
        hostname=HOST,
        port=PORT,
        namespace=NAMESPACE,
        username=USER,
        password=password,
        timeout=5000,
        sharedmemory=False,
    )

    irispy = iris.createIRIS(conn)
    bind_process_purpose_marker()


def close_connection():
    global conn, irispy

    if conn is not None:
        try:
            conn.close()
        finally:
            conn = None
            irispy = None


def respond(request_id, data):
    atomic_json(
        control / ("response-" + request_id + ".json"),
        data,
    )


try:
    connect()
    startup = snapshot("startup")
    atomic_json(control / "startup.json", startup)

    if not startup.get("ok"):
        raise RuntimeError("startup snapshot failed")

except Exception as exc:
    atomic_json(
        control / "startup.json",
        {
            "ok": False,
            "capturedAtUtc": now(),
            "generation": generation,
            "controllerOsPid": os.getpid(),
            "failureStage": "connect",
            "errorType": type(exc).__name__,
            "errorMessage": sanitize(exc),
        },
    )
    close_connection()
    password = ""
    generation = ""
    raise SystemExit(31)


while True:
    try:
        commands = sorted(control.glob("command-*.json"))

        if not commands:
            time.sleep(0.10)
            continue

        command_path = commands[0]

        try:
            command = json.loads(
                command_path.read_text(encoding="utf-8")
            )
        finally:
            command_path.unlink(missing_ok=True)

        request_id = str(command.get("requestId", "")).strip()
        action = str(command.get("action", "")).strip()

        if not request_id:
            continue

        if action == "observe":
            respond(
                request_id,
                snapshot("observe"),
            )
            continue

        if action == "close":
            close_connection()
            respond(
                request_id,
                {
                    "ok": True,
                    "action": "close",
                    "capturedAtUtc": now(),
                    "generation": generation,
                    "controllerOsPid": os.getpid(),
                },
            )
            continue

        if action == "reconnect":
            result = {
                "ok": False,
                "action": "reconnect",
                "capturedAtUtc": now(),
                "generation": generation,
                "controllerOsPid": os.getpid(),
            }

            try:
                connect()
                result["connectOk"] = True
                result["ok"] = True
                result["observation"] = snapshot("fresh")
            except Exception as exc:
                result["errorType"] = type(exc).__name__
                result["errorMessage"] = sanitize(exc)

            respond(
                request_id,
                result,
            )
            continue

        if action == "exit":
            close_connection()
            password = ""
            generation = ""
            respond(
                request_id,
                {
                    "ok": True,
                    "action": "exit",
                    "capturedAtUtc": now(),
                    "controllerOsPid": os.getpid(),
                },
            )
            raise SystemExit(0)

        respond(
            request_id,
            {
                "ok": False,
                "action": action,
                "capturedAtUtc": now(),
                "errorType": "UnsupportedAction",
                "errorMessage": "unsupported witness action",
            },
        )

    except SystemExit:
        raise

    except Exception as exc:
        atomic_json(
            control / "controller-error.json",
            {
                "ok": False,
                "capturedAtUtc": now(),
                "controllerOsPid": os.getpid(),
                "errorType": type(exc).__name__,
                "errorMessage": sanitize(exc),
            },
        )
        time.sleep(0.20)
