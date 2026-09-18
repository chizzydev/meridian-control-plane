import json
import sys

import iris

EXPECTED_COLUMNS = [
    "Pid",
    "UserName",
    "LoginRoles",
    "Roles",
    "NameSpace",
    "StartTimeUTC",
    "ClientIPAddress",
    "StartupClientIPAddress",
]

payload = json.load(sys.stdin)
password = payload.get("password", "")
username = payload.get("username", "")

if not isinstance(password, str) or not password:
    raise RuntimeError("runtime password missing")

if not isinstance(username, str) or not username:
    raise RuntimeError("process username missing")

conn = None
cursor = None

try:
    conn = iris.connect(
        hostname="127.0.0.1",
        port=1972,
        namespace="%SYS",
        username="meridian.runtime",
        password=password,
        timeout=5,
        sharedmemory=False,
    )

    cursor = conn.cursor()

    cursor.execute(
        "SELECT Pid, UserName, LoginRoles, Roles, NameSpace, StartTimeUTC, "
        "ClientIPAddress, StartupClientIPAddress FROM %SYS.ProcessQuery"
    )

    actual_columns = [
        str(column[0])
        for column in cursor.description
    ]

    if [
        value.lower()
        for value in actual_columns
    ] != [
        value.lower()
        for value in EXPECTED_COLUMNS
    ]:
        raise RuntimeError("ProcessQuery projection drifted")

    target = username.casefold()
    rows = []

    for row in cursor.fetchall():
        observed = "" if row[1] is None else str(row[1])

        if observed.casefold() != target:
            continue

        rows.append(
            {
                "pid": int(row[0]),
                "username": observed,
                "loginRoles": "" if row[2] is None else str(row[2]),
                "roles": "" if row[3] is None else str(row[3]),
                "namespace": "" if row[4] is None else str(row[4]),
                "startTimeUtc": "" if row[5] is None else str(row[5]),
                "clientIPAddress": "" if row[6] is None else str(row[6]),
                "startupClientIPAddress": "" if row[7] is None else str(row[7]),
            }
        )

    print(
        json.dumps(
            {
                "ok": True,
                "columns": EXPECTED_COLUMNS,
                "rows": rows,
            },
            separators=(",", ":"),
        )
    )

except Exception as exc:
    safe = str(exc)

    if password:
        safe = safe.replace(password, "<redacted>")

    print(
        json.dumps(
            {
                "ok": False,
                "errorClass": type(exc).__name__,
                "error": safe[:1200],
            },
            separators=(",", ":"),
        )
    )

    raise

finally:
    if cursor is not None:
        cursor.close()

    if conn is not None:
        conn.close()

    payload.clear()
    password = ""
