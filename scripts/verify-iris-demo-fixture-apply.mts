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
} from "node:path";

import {
  DEMO_FIXTURE_DIRECT_ROLES_AFTER,
  DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
  DEMO_FIXTURE_ID,
  DEMO_FIXTURE_TARGET_ROLE,
  DEMO_FIXTURE_USERNAME,
  assertExactDemoUser,
  resetDemoFixture,
  seedDemoFixture,
  type DemoFixtureCredentialVault,
} from "../src/lib/change-case/demo-fixture";

import {
  assertDemoFixtureConfiguredAfter,
} from "../src/lib/change-case/demo-fixture-apply";

import {
  executeFixtureScopedRoleRemovalCore,
} from "../src/lib/iris/demo-fixture-apply-executor";

import {
  DEMO_FIXTURE_USER_SECURITY_PATH,
} from "../src/lib/iris/demo-fixture-apply-transport";

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
      "A4B input is not an object.",
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

let runtimePassword =
  "";

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
          "A4B credential vault refused fixture identity.",
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
          "A4B credential vault refused clear identity.",
        );
      }

      storedCredential =
        null;
    },
};

const PROCESS_QUERY_PYTHON =
  join(
    homedir(),
    "intersystems-inspections",
    "s1a-native-sdk-venv",
    "Scripts",
    "python.exe",
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
      "A4B ProcessQuery reader requires the live runtime credential.",
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
      `A4B ProcessQuery bridge emitted invalid JSON (exit=${exitCode}; stderr=${sanitizedStderr.trim().slice(0, 600)}).`,
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
      "A4B ProcessQuery bridge result is not an object.",
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
      `A4B ProcessQuery bridge failed: ${safeError || "unknown failure"}`,
    );
  }

  if (
    !Array.isArray(
      result.processes,
    )
  ) {
    throw new Error(
      "A4B ProcessQuery bridge omitted the process array.",
    );
  }

  return result.processes.map(
    (
      value,
    ) => {
      const row =
        objectValue(
          value,
        );

      const pid =
        row.pid;

      const observedUsername =
        row.username;

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
          "A4B ProcessQuery bridge returned an invalid sanitized process row.",
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

const rawInput =
  await stdinText();

const parsedInput =
  objectValue(
    JSON.parse(
      rawInput,
    ) as unknown,
  );

runtimePassword =
  typeof parsedInput.password ===
    "string"
    ? parsedInput.password
    : "";

if (
  runtimePassword.length ===
  0
) {
  throw new Error(
    "A4B runtime password is missing.",
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

let putCount =
  0;

let observedPutUrl =
  "";

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
    "A4B_LOGIN_HTTP=200",
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
      "A4B pinned runtime identity/version guard failed.",
    );
  }

  console.log(
    "A4B_RUNTIME_IDENTITY_VERSION=PASS",
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
    "A4B_PROCESSQUERY_EXTERNAL_SQL=PASS",
  );

  const preUser =
    await adapter.readUser(
      DEMO_FIXTURE_USERNAME,
    );

  if (preUser) {
    throw new Error(
      "A4B requires the synthetic fixture user to be absent before seed.",
    );
  }

  const preProcesses =
    await adapter.listLiveProcesses(
      DEMO_FIXTURE_USERNAME,
    );

  if (
    preProcesses.length !==
    0
  ) {
    throw new Error(
      "A4B requires zero synthetic fixture processes before seed.",
    );
  }

  console.log(
    "A4B_PRE_FIXTURE_USER_ABSENT=PASS",
  );

  console.log(
    "A4B_PRE_FIXTURE_PROCESS_ZERO=PASS",
  );

  const publicState =
    await seedDemoFixture({
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

  console.log(
    "A4B_FIXTURE_SEED=PASS",
  );

  if (
    publicState.fixtureId !==
      DEMO_FIXTURE_ID ||
    publicState.username !==
      DEMO_FIXTURE_USERNAME ||
    publicState.targetRole !==
      DEMO_FIXTURE_TARGET_ROLE ||
    publicState.credentialExposed !==
      false
  ) {
    throw new Error(
      "A4B seeded public fixture state drifted.",
    );
  }

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
    !credential ||
    credential.generation !==
      publicState.generation
  ) {
    throw new Error(
      "A4B local server credential generation was not bound to the seeded fixture.",
    );
  }

  console.log(
    "A4B_FIXTURE_GENERATION_BOUND=PASS",
  );

  console.log(
    "A4B_SYNTHETIC_CREDENTIAL_EXPOSED=NO",
  );

  const before =
    await adapter.readUser(
      DEMO_FIXTURE_USERNAME,
    );

  if (!before) {
    throw new Error(
      "A4B synthetic user is absent after seed.",
    );
  }

  assertExactDemoUser(
    before,
  );

  if (
    JSON.stringify(
      [
        ...before.directRoles,
      ].sort(),
    ) !==
    JSON.stringify(
      [
        ...DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
      ].sort(),
    )
  ) {
    throw new Error(
      "A4B configured prestate role set drifted.",
    );
  }

  console.log(
    "A4B_CONFIGURED_PRESTATE_EXACT=PASS",
  );

  const countingFetch:
    typeof fetch =
      async (
        input,
        init,
      ) => {
        const url =
          input.toString();

        const method =
          String(
            init?.method ??
              "GET",
          ).toUpperCase();

        if (
          method ===
          "PUT"
        ) {
          putCount +=
            1;

          observedPutUrl =
            url;
        }

        return fetch(
          input,
          init,
        );
      };

  const result =
    await executeFixtureScopedRoleRemovalCore(
      {
        apiBaseUrl:
          API_BASE_URL,

        accessToken:
          session.accessToken,

        expectedFixtureGeneration:
          publicState.generation,
      },
      {
        credentialPresent:
          (
            generation,
          ) =>
            (
              storedCredential as
                {
                  readonly generation:
                    string;

                  readonly password:
                    string;
                } |
                null
            )?.generation ===
            generation,

        fetchImpl:
          countingFetch,
      },
    );

  console.log(
    `A4B_MUTATION_RESULT_STATE=${result.state}`,
  );

  console.log(
    `A4B_MUTATION_REQUEST_COUNT=${result.mutationRequestCount}`,
  );

  console.log(
    `A4B_MUTATION_PUT_COUNT=${putCount}`,
  );

  if (
    result.state !==
      "APPLIED" ||
    result.configurationVerified !==
      true ||
    result.verified !==
      false ||
    result.mutationRequestCount !==
      1 ||
    putCount !==
      1
  ) {
    throw new Error(
      "A4B fixture-scoped Apply did not produce exactly one configured APPLIED result.",
    );
  }

  const expectedUrl =
    `${API_BASE_URL}${DEMO_FIXTURE_USER_SECURITY_PATH}`;

  if (
    observedPutUrl !==
    expectedUrl
  ) {
    throw new Error(
      "A4B mutation PUT targeted an unexpected URL.",
    );
  }

  console.log(
    "A4B_OFFICIAL_SYSADMIN_USER_PUT=PASS",
  );

  console.log(
    "A4B_EXACTLY_ONE_MUTATION_DISPATCH=PASS",
  );

  console.log(
    "A4B_APPLIED_NOT_VERIFIED=PASS",
  );

  const after =
    await adapter.readUser(
      DEMO_FIXTURE_USERNAME,
    );

  if (!after) {
    throw new Error(
      "A4B synthetic user is absent after configured Apply.",
    );
  }

  assertDemoFixtureConfiguredAfter(
    after,
  );

  if (
    JSON.stringify(
      [
        ...after.directRoles,
      ].sort(),
    ) !==
    JSON.stringify(
      [
        ...DEMO_FIXTURE_DIRECT_ROLES_AFTER,
      ].sort(),
    )
  ) {
    throw new Error(
      "A4B configured post-state role set drifted.",
    );
  }

  console.log(
    "A4B_CONFIGURED_POSTSTATE_EXACT=PASS",
  );

  console.log(
    "A4B_TARGET_ROLE_REMOVED=PASS",
  );

  const processesAfter =
    await adapter.listLiveProcesses(
      DEMO_FIXTURE_USERNAME,
    );

  if (
    processesAfter.length !==
    0
  ) {
    throw new Error(
      "A4B fixture unexpectedly has a live process after configured mutation.",
    );
  }

  console.log(
    "A4B_SYNTHETIC_PROCESS_COUNT_AFTER_APPLY=0",
  );

  console.log(
    "A4B_LIVE_EXECUTOR_CERTIFICATION=PASS",
  );
} finally {
  let cleanupFailure:
    Error |
    null =
      null;

  if (
    seeded &&
    adapter &&
    !resetComplete
  ) {
    try {
      await resetDemoFixture({
        adapter,

        vault,
      });

      resetComplete =
        true;

      console.log(
        "A4B_FIXTURE_RESET=PASS",
      );
    } catch (
      cleanupError
    ) {
      cleanupFailure =
        cleanupError instanceof Error
          ? cleanupError
          : new Error(
              "Unknown A4B fixture reset failure.",
            );

      console.log(
        `A4B_FIXTURE_RESET_FAILURE=${cleanupFailure.message}`,
      );
    }
  }

  if (
    session
  ) {
    try {
      await logoutIris({
        baseUrl:
          API_BASE_URL,

        accessToken:
          session.accessToken,
      });

      console.log(
        "A4B_LOGOUT_HTTP=200",
      );
    } catch (
      logoutError
    ) {
      if (!cleanupFailure) {
        cleanupFailure =
          logoutError instanceof Error
            ? logoutError
            : new Error(
                "Unknown A4B logout failure.",
              );
      }
    }
  }

  runtimePassword =
    "";

  storedCredential =
    null;

  console.log(
    "A4B_RUNTIME_PASSWORD_STORED=NO",
  );

  console.log(
    "A4B_JWT_STORED=NO",
  );

  if (cleanupFailure) {
    throw cleanupFailure;
  }
}

if (
  !resetComplete
) {
  throw new Error(
    "A4B live certification did not complete fixture reset.",
  );
}

console.log(
  "A4B_COMMAND_COMPLETE=YES",
);
