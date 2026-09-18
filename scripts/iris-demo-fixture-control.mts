import {
  spawn,
} from "node:child_process";

import {
  randomBytes,
  randomUUID,
} from "node:crypto";

import {
  homedir,
} from "node:os";

import {
  join,
  resolve,
} from "node:path";

import {
  DEMO_FIXTURE_ID,
  type DemoFixtureCredentialVault,
} from "../src/lib/change-case/demo-fixture";

import {
  executeDemoFixtureCommand,
  type DemoFixtureReadinessDiagnostic,
} from "../src/lib/change-case/demo-fixture-control";

import {
  createOfficialSysAdminDemoFixtureAdapter,
} from "../src/lib/iris/demo-fixture-sysadmin";

import {
  loginIris,
  logoutIris,
  readRuntimeInfo,
} from "../src/lib/iris/transport";

const API_BASE_URL =
  "http://localhost:52773/api/admin";

const RUNTIME_USERNAME =
  "meridian.runtime";

type CliCommand =
  | "readiness"
  | "cycle";

function objectValue(
  value:
    unknown,
): Record<string, unknown> {
  if (
    typeof value !==
      "object" ||
    value ===
      null ||
    Array.isArray(
      value,
    )
  ) {
    throw new Error(
      "A3C input is not an object.",
    );
  }

  return value as
    Record<string, unknown>;
}

async function stdinText():
  Promise<string> {
  let value =
    "";

  for await (
    const chunk
    of process.stdin
  ) {
    value +=
      String(
        chunk,
      );
  }

  return value;
}

function syntheticPassword():
  string {
  return `Aa1!${randomBytes(10).toString("hex")}`;
}

function yesNo(
  value:
    boolean,
): "YES" | "NO" {
  return value
    ? "YES"
    : "NO";
}

function printReadiness(
  prefix:
    string,
  value:
    DemoFixtureReadinessDiagnostic,
): void {
  console.log(
    `${prefix}_STATE=${value.state}`,
  );

  console.log(
    `${prefix}_USER_STATE=${value.userState}`,
  );

  console.log(
    `${prefix}_ROLE_STATE=${value.roleState}`,
  );

  console.log(
    `${prefix}_ROLE_ISSUE_COUNT=${value.missingRoles.length}`,
  );

  console.log(
    `${prefix}_RESOURCE_ISSUE_COUNT=${value.missingResources.length}`,
  );

  console.log(
    `${prefix}_LIVE_PROCESS_COUNT=${value.liveProcessPids.length}`,
  );

  console.log(
    `${prefix}_SEED_ALLOWED=${yesNo(value.seedAllowed)}`,
  );

  console.log(
    `${prefix}_RESET_ALLOWED=${yesNo(value.resetAllowed)}`,
  );

  console.log(
    `${prefix}_CREDENTIAL_EVALUATED=${yesNo(value.credentialEvaluated)}`,
  );
}

const commandValue =
  process.argv[2] ??
  "";

if (
  commandValue !==
    "readiness" &&
  commandValue !==
    "cycle"
) {
  throw new Error(
    "A3C command must be exactly readiness or cycle.",
  );
}

const command =
  commandValue as
    CliCommand;

const rawInput =
  await stdinText();

const parsedInput =
  objectValue(
    JSON.parse(
      rawInput,
    ) as unknown,
  );

let runtimePassword =
  typeof parsedInput.password ===
    "string"
    ? parsedInput.password
    : "";

if (
  runtimePassword.length ===
  0
) {
  throw new Error(
    "A3C runtime password is missing.",
  );
}

let storedCredential:
  {
    readonly generation:
      string;

    readonly password:
      string;
  } |
  null =
    null;

const vault:
  DemoFixtureCredentialVault = {
    store: (
      input,
    ) => {
      if (
        input.fixtureId !==
        DEMO_FIXTURE_ID
      ) {
        throw new Error(
          "A3C credential vault refused fixture identity.",
        );
      }

      storedCredential = {
        generation:
          input.generation,

        password:
          input.password,
      };
    },

    clear: (
      fixtureId,
    ) => {
      if (
        fixtureId !==
        DEMO_FIXTURE_ID
      ) {
        throw new Error(
          "A3C credential vault refused clear identity.",
        );
      }

      storedCredential =
        null;
    },
};

const PROCESS_QUERY_PYTHON =
  process.env
    .MERIDIAN_IRISPYTHON_EXECUTABLE
    ?.trim() ||
  resolve(
    process.cwd(),
    ".venv-iris",
    process.platform === "win32"
      ? "Scripts/python.exe"
      : "bin/python",
  );

const PROCESS_QUERY_SOURCE =
  String.raw`
import json
import sys

import iris

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

    expected_columns = [
        "Pid",
        "UserName",
        "LoginRoles",
        "Roles",
        "NameSpace",
        "StartTimeUTC",
        "ClientIPAddress",
        "StartupClientIPAddress",
    ]

    actual_columns = [
        str(column[0])
        for column in cursor.description
    ]

    if [
        value.lower()
        for value in actual_columns
    ] != [
        value.lower()
        for value in expected_columns
    ]:
        raise RuntimeError("ProcessQuery projection drifted")

    target = username.casefold()
    matches = []

    for row in cursor.fetchall():
        observed = "" if row[1] is None else str(row[1])

        if observed.casefold() != target:
            continue

        matches.append(
            {
                "pid": int(row[0]),
                "username": observed,
            }
        )

    print(
        json.dumps(
            {
                "ok": True,
                "processes": matches,
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

    sys.exit(1)
finally:
    if cursor is not None:
        cursor.close()

    if conn is not None:
        conn.close()

    payload.clear()
    password = ""
`;

async function listLiveProcessesViaProcessQuery(
  username:
    string,
): Promise<
  readonly {
    readonly pid:
      number;

    readonly username:
      string;
  }[]
> {
  if (
    runtimePassword.length ===
    0
  ) {
    throw new Error(
      "A3C ProcessQuery reader requires the live runtime credential.",
    );
  }

  const child =
    spawn(
      PROCESS_QUERY_PYTHON,
      [
        "-c",
        PROCESS_QUERY_SOURCE,
      ],
      {
        shell:
          false,

        windowsHide:
          true,

        stdio:
          [
            "pipe",
            "pipe",
            "pipe",
          ],
      },
    );

  let stdout =
    "";

  let stderr =
    "";

  child.stdout.setEncoding(
    "utf8",
  );

  child.stderr.setEncoding(
    "utf8",
  );

  child.stdout.on(
    "data",
    (
      chunk,
    ) => {
      stdout +=
        String(
          chunk,
        );
    },
  );

  child.stderr.on(
    "data",
    (
      chunk,
    ) => {
      stderr +=
        String(
          chunk,
        );
    },
  );

  const completion =
    new Promise<number>(
      (
        resolve,
        reject,
      ) => {
        child.once(
          "error",
          reject,
        );

        child.once(
          "close",
          (
            code,
          ) => {
            resolve(
              code ??
                -1,
            );
          },
        );
      },
    );

  child.stdin.end(
    JSON.stringify({
      password:
        runtimePassword,

      username,
    }),
  );

  const exitCode =
    await completion;

  const sanitizedStderr =
    runtimePassword.length >
      0
      ? stderr
          .split(
            runtimePassword,
          )
          .join(
            "<redacted>",
          )
      : stderr;

  let parsed:
    unknown;

  try {
    parsed =
      JSON.parse(
        stdout.trim(),
      ) as unknown;
  } catch {
    throw new Error(
      `A3C ProcessQuery bridge emitted invalid JSON (exit=${exitCode}; stderr=${sanitizedStderr.trim().slice(0, 600)}).`,
    );
  }

  if (
    typeof parsed !==
      "object" ||
    parsed ===
      null ||
    Array.isArray(
      parsed,
    )
  ) {
    throw new Error(
      "A3C ProcessQuery bridge result is not an object.",
    );
  }

  const result =
    parsed as
      Record<string, unknown>;

  if (
    exitCode !==
      0 ||
    result.ok !==
      true
  ) {
    const safeError =
      typeof result.error ===
        "string"
        ? result.error
        : sanitizedStderr
            .trim()
            .slice(
              0,
              600,
            );

    throw new Error(
      `A3C ProcessQuery bridge failed: ${safeError || "unknown failure"}`,
    );
  }

  if (
    !Array.isArray(
      result.processes,
    )
  ) {
    throw new Error(
      "A3C ProcessQuery bridge omitted the process array.",
    );
  }

  return result.processes.map(
    (
      value,
    ) => {
      if (
        typeof value !==
          "object" ||
        value ===
          null ||
        Array.isArray(
          value,
        )
      ) {
        throw new Error(
          "A3C ProcessQuery bridge returned a non-object process row.",
        );
      }

      const processRow =
        value as
          Record<string, unknown>;

      const pid =
        processRow.pid;

      const observedUsername =
        processRow.username;

      if (
        typeof pid !==
          "number" ||
        !Number.isSafeInteger(
          pid,
        ) ||
        pid <
          0 ||
        typeof observedUsername !==
          "string"
      ) {
        throw new Error(
          "A3C ProcessQuery bridge returned an invalid sanitized process row.",
        );
      }

      return {
        pid,

        username:
          observedUsername,
      };
    },
  );
}

let session:
  Awaited<
    ReturnType<
      typeof loginIris
    >
  > |
  null =
    null;

let adapter:
  ReturnType<
    typeof createOfficialSysAdminDemoFixtureAdapter
  > |
  null =
    null;

let seeded =
  false;

let resetComplete =
  false;

try {
  session =
    await loginIris({
      baseUrl:
        API_BASE_URL,

      username:
        RUNTIME_USERNAME,

      password:
        runtimePassword,
    });

  console.log(
    "A3C_LOGIN_HTTP=200",
  );

  const runtime =
    await readRuntimeInfo({
      baseUrl:
        API_BASE_URL,

      accessToken:
        session.accessToken,
    });

  if (
    runtime.username !==
      RUNTIME_USERNAME ||
    runtime.apiVersion !==
      2 ||
    !runtime.serverVersion.includes(
      "2026.2",
    ) ||
    !runtime.serverVersion.includes(
      "Build 221U",
    )
  ) {
    throw new Error(
      "A3C pinned runtime identity/version guard failed.",
    );
  }

  console.log(
    "A3C_RUNTIME_IDENTITY_VERSION=PASS",
  );

  adapter =
    createOfficialSysAdminDemoFixtureAdapter({
      baseUrl:
        API_BASE_URL,

      accessToken:
        session.accessToken,

      listLiveProcesses:
        listLiveProcessesViaProcessQuery,
    });

  console.log(
    "A3C_PROCESSQUERY_EXTERNAL_SQL=PASS",
  );

  if (
    command ===
      "readiness"
  ) {
    const result =
      await executeDemoFixtureCommand({
        command:
          "readiness",

        adapter,

        vault,

        secrets: {
          generation:
            () =>
              randomUUID(),

          password:
            syntheticPassword,
        },
      });

    console.log(
      "A3C_COMMAND=readiness",
    );

    printReadiness(
      "A3C_READINESS",
      result.readiness,
    );

    if (
      !result.readiness.seedAllowed
    ) {
      throw new Error(
        `A3C readiness command is blocked: ${result.readiness.state}; ${result.readiness.actions.join(" | ")}`,
      );
    }

    console.log(
      "A3C_COMMAND_COMPLETE=YES",
    );
  } else {
    const before =
      await executeDemoFixtureCommand({
        command:
          "readiness",

        adapter,

        vault,

        secrets: {
          generation:
            () =>
              randomUUID(),

          password:
            syntheticPassword,
        },
      });

    console.log(
      "A3C_COMMAND=cycle",
    );

    printReadiness(
      "A3C_CYCLE_BEFORE",
      before.readiness,
    );

    if (
      before.readiness.state !==
        "READY_CLEAN"
    ) {
      throw new Error(
        `A3C cycle requires clean readiness, observed ${before.readiness.state}.`,
      );
    }

    const seededResult =
      await executeDemoFixtureCommand({
        command:
          "seed",

        adapter,

        vault,

        secrets: {
          generation:
            () =>
              randomUUID(),

          password:
            syntheticPassword,
        },
      });

    seeded =
      true;

    const credential =
      storedCredential as
        {
          readonly generation:
            string;

          readonly password:
            string;
        } |
        null;

    if (
      !seededResult.publicState ||
      seededResult.publicState
        .credentialExposed !==
        false ||
      !credential ||
      credential.generation !==
        seededResult.publicState
          .generation
    ) {
      throw new Error(
        "A3C seed did not bind an in-memory credential to the public fixture generation.",
      );
    }

    printReadiness(
      "A3C_CYCLE_AFTER_SEED",
      seededResult.readiness,
    );

    console.log(
      "A3C_CREDENTIAL_EXPOSED=NO",
    );

    const resetResult =
      await executeDemoFixtureCommand({
        command:
          "reset",

        adapter,

        vault,

        secrets: {
          generation:
            () =>
              randomUUID(),

          password:
            syntheticPassword,
        },
      });

    resetComplete =
      true;

    printReadiness(
      "A3C_CYCLE_AFTER_RESET",
      resetResult.readiness,
    );

    if (
      storedCredential !==
        null
    ) {
      throw new Error(
        "A3C reset left an in-memory synthetic credential.",
      );
    }

    console.log(
      "A3C_CYCLE=PASS",
    );

    console.log(
      "A3C_COMMAND_COMPLETE=YES",
    );
  }
} finally {
  if (
    adapter &&
    seeded &&
    !resetComplete
  ) {
    try {
      const readiness =
        await executeDemoFixtureCommand({
          command:
            "readiness",

          adapter,

          vault,

          secrets: {
            generation:
              () =>
                randomUUID(),

            password:
              syntheticPassword,
          },
        });

      if (
        readiness.readiness
          .resetAllowed
      ) {
        await executeDemoFixtureCommand({
          command:
            "reset",

          adapter,

          vault,

          secrets: {
            generation:
              () =>
                randomUUID(),

            password:
              syntheticPassword,
          },
        });

        console.log(
          "A3C_COMPENSATING_RESET=PASS",
        );
      } else {
        console.log(
          "A3C_COMPENSATING_RESET=REFUSED_LIVE_PROCESS_PRESENT",
        );
      }
    } catch {
      console.log(
        "A3C_COMPENSATING_RESET=FAILED",
      );
    }
  }

  storedCredential =
    null;

  runtimePassword =
    "";

  if (session) {
    try {
      await logoutIris({
        baseUrl:
          API_BASE_URL,

        accessToken:
          session.accessToken,
      });

      console.log(
        "A3C_LOGOUT_HTTP=200",
      );
    } catch {
      console.log(
        "A3C_LOGOUT_HTTP=FAILED",
      );
    }
  }

  console.log(
    "A3C_RUNTIME_PASSWORD_STORED=NO",
  );

  console.log(
    "A3C_JWT_STORED=NO",
  );
}
