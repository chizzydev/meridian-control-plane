import {
  randomBytes,
  randomUUID,
} from "node:crypto";

import {
  spawn,
} from "node:child_process";

import {
  homedir,
} from "node:os";

import {
  join,
} from "node:path";

import {
  DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
  DEMO_FIXTURE_ID,
  DEMO_FIXTURE_TRANSPORT_ROLE,
  DEMO_FIXTURE_USERNAME,
  resetDemoFixture,
  seedDemoFixture,
  type DemoFixtureCredentialVault,
} from "../src/lib/change-case/demo-fixture";

import {
  createOfficialSysAdminDemoFixtureAdapter,
} from "../src/lib/iris/demo-fixture-sysadmin";

import {
  loginIris,
  logoutIris,
  readIrisUser,
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
      "A3B input is not an object.",
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

function sameSet(
  left:
    readonly string[],
  right:
    readonly string[],
): boolean {
  const normalize =
    (
      values:
        readonly string[],
    ) =>
      [
        ...new Set(
          values,
        ),
      ].sort(
        (
          a,
          b,
        ) =>
          a.localeCompare(
            b,
          ),
      );

  return (
    JSON.stringify(
      normalize(
        left,
      ),
    ) ===
    JSON.stringify(
      normalize(
        right,
      ),
    )
  );
}

function syntheticPassword():
  string {
  return `Aa1!${randomBytes(10).toString("hex")}`;
}

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
    "A3B runtime password is missing.",
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

let seeded =
  false;

let resetComplete =
  false;

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
          "A3B credential vault refused fixture identity.",
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
          "A3B credential vault refused clear identity.",
        );
      }

      storedCredential =
        null;
    },
  };

function readStoredCredential():
  {
    readonly generation:
      string;

    readonly password:
      string;
  } |
  null {
  return storedCredential;
}

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
      "A3B ProcessQuery reader requires the live runtime credential.",
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
      `A3B ProcessQuery bridge emitted invalid JSON (exit=${exitCode}; stderr=${sanitizedStderr.trim().slice(0, 600)}).`,
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
      "A3B ProcessQuery bridge result is not an object.",
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
      `A3B ProcessQuery bridge failed: ${safeError || "unknown failure"}`,
    );
  }

  if (
    !Array.isArray(
      result.processes,
    )
  ) {
    throw new Error(
      "A3B ProcessQuery bridge omitted the process array.",
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
          "A3B ProcessQuery bridge returned a non-object process row.",
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
          "A3B ProcessQuery bridge returned an invalid sanitized process row.",
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
    "A3B_LOGIN_HTTP=200",
  );

  const runtime =
    await readRuntimeInfo({
      baseUrl:
        API_BASE_URL,

      accessToken:
        session.accessToken,
    });

  console.log(
    `A3B_RUNTIME_USERNAME=${runtime.username}`,
  );

  console.log(
    `A3B_RUNTIME_API_VERSION=${runtime.apiVersion}`,
  );

  console.log(
    `A3B_RUNTIME_BUILD_221U=${runtime.serverVersion.includes("Build 221U") ? "YES" : "NO"}`,
  );

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
      "A3B pinned runtime identity/version guard failed.",
    );
  }

  const maya =
    await readIrisUser({
      baseUrl:
        API_BASE_URL,

      accessToken:
        session.accessToken,

      username:
        "maya.patel",
    });

  if (
    !sameSet(
      maya.directRoles,
      [
        "MeridianEmployee",
      ],
    )
  ) {
    throw new Error(
      "A3B Maya frozen direct-role guard failed.",
    );
  }

  console.log(
    "A3B_MAYA_FROZEN_DIRECT_ROLES=PASS",
  );

  const runtimeUser =
    await readIrisUser({
      baseUrl:
        API_BASE_URL,

      accessToken:
        session.accessToken,

      username:
        RUNTIME_USERNAME,
    });

  if (
    !sameSet(
      runtimeUser.directRoles,
      [
        "MeridianControlPlaneRuntime",
      ],
    )
  ) {
    throw new Error(
      "A3B runtime direct-role guard failed.",
    );
  }

  console.log(
    "A3B_RUNTIME_DIRECT_ROLE_BASELINE=PASS",
  );

  const adapter =
    createOfficialSysAdminDemoFixtureAdapter({
      baseUrl:
        API_BASE_URL,

      accessToken:
        session.accessToken,

      listLiveProcesses:
        listLiveProcessesViaProcessQuery,
    });

  const prerequisites =
    await adapter
      .readPrerequisites();

  console.log(
    `A3B_PREREQUISITE_ROLE_ISSUE_COUNT=${prerequisites.missingRoles.length}`,
  );

  console.log(
    `A3B_PREREQUISITE_RESOURCE_ISSUE_COUNT=${prerequisites.missingResources.length}`,
  );

  if (
    prerequisites
      .missingRoles
      .length !==
      0 ||
    prerequisites
      .missingResources
      .length !==
      0
  ) {
    throw new Error(
      "A3B shared Meridian prerequisite graph is missing or drifted.",
    );
  }

  console.log(
    "A3B_SHARED_BUSINESS_GRAPH_READY=PASS",
  );

  const preUser =
    await adapter
      .readUser(
        DEMO_FIXTURE_USERNAME,
      );

  const preRole =
    await adapter
      .readRole(
        DEMO_FIXTURE_TRANSPORT_ROLE,
      );

  const preProcesses =
    await adapter
      .listLiveProcesses(
        DEMO_FIXTURE_USERNAME,
      );

  console.log(
    "A3B_PROCESSQUERY_EXTERNAL_SQL=PASS",
  );

  console.log(
    "A3B_PROCESSQUERY_SANITIZED_ROWS_ONLY=PASS",
  );

  console.log(
    `A3B_PRE_FIXTURE_USER_PRESENT=${preUser ? "YES" : "NO"}`,
  );

  console.log(
    `A3B_PRE_FIXTURE_ROLE_PRESENT=${preRole ? "YES" : "NO"}`,
  );

  console.log(
    `A3B_PRE_FIXTURE_PROCESS_COUNT=${preProcesses.length}`,
  );

  if (
    preUser ||
    preRole ||
    preProcesses.length !==
      0
  ) {
    throw new Error(
      "A3B requires a clean first-certification synthetic fixture prestate.",
    );
  }

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

  const observedStoredCredential =
    readStoredCredential();

  if (
    publicState.fixtureId !==
      DEMO_FIXTURE_ID ||
    publicState.username !==
      DEMO_FIXTURE_USERNAME ||
    publicState.transportRole !==
      DEMO_FIXTURE_TRANSPORT_ROLE ||
    publicState.credentialExposed !==
      false ||
    !observedStoredCredential ||
    observedStoredCredential.generation !==
      publicState.generation
  ) {
    throw new Error(
      "A3B seeded fixture state/credential binding is invalid.",
    );
  }

  console.log(
    "A3B_LIVE_SEED=PASS",
  );

  console.log(
    "A3B_SYNTHETIC_PASSWORD_EMITTED=NO",
  );

  const seededUser =
    await adapter
      .readUser(
        DEMO_FIXTURE_USERNAME,
      );

  const seededRole =
    await adapter
      .readRole(
        DEMO_FIXTURE_TRANSPORT_ROLE,
      );

  const seededProcesses =
    await adapter
      .listLiveProcesses(
        DEMO_FIXTURE_USERNAME,
      );

  if (
    !seededUser ||
    !seededRole ||
    !sameSet(
      seededUser.directRoles,
      DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
    ) ||
    seededProcesses.length !==
      0
  ) {
    throw new Error(
      "A3B live seed readback is not exact.",
    );
  }

  console.log(
    "A3B_LIVE_USER_READBACK=PASS",
  );

  console.log(
    "A3B_LIVE_ROLE_READBACK=PASS",
  );

  console.log(
    "A3B_LIVE_PROCESS_ZERO_AFTER_SEED=PASS",
  );

  await resetDemoFixture({
    adapter,
    vault,
  });

  resetComplete =
    true;

  const finalUser =
    await adapter
      .readUser(
        DEMO_FIXTURE_USERNAME,
      );

  const finalRole =
    await adapter
      .readRole(
        DEMO_FIXTURE_TRANSPORT_ROLE,
      );

  const finalProcesses =
    await adapter
      .listLiveProcesses(
        DEMO_FIXTURE_USERNAME,
      );

  if (
    finalUser ||
    finalRole ||
    finalProcesses.length !==
      0 ||
    storedCredential
  ) {
    throw new Error(
      "A3B live reset left synthetic fixture residue.",
    );
  }

  console.log(
    "A3B_LIVE_RESET=PASS",
  );

  console.log(
    "A3B_ZERO_FIXTURE_RESIDUE=PASS",
  );

  const mayaAfter =
    await readIrisUser({
      baseUrl:
        API_BASE_URL,

      accessToken:
        session.accessToken,

      username:
        "maya.patel",
    });

  const runtimeAfter =
    await readIrisUser({
      baseUrl:
        API_BASE_URL,

      accessToken:
        session.accessToken,

      username:
        RUNTIME_USERNAME,
    });

  if (
    !sameSet(
      mayaAfter.directRoles,
      [
        "MeridianEmployee",
      ],
    ) ||
    !sameSet(
      runtimeAfter.directRoles,
      [
        "MeridianControlPlaneRuntime",
      ],
    )
  ) {
    throw new Error(
      "A3B frozen authority changed during live seed/reset.",
    );
  }

  console.log(
    "A3B_MAYA_POST_GUARD=PASS",
  );

  console.log(
    "A3B_RUNTIME_POST_GUARD=PASS",
  );

  console.log(
    "A3B_LIVE_SEED_RESET_CERTIFICATION=PASS",
  );
} finally {
  if (
    session &&
    seeded &&
    !resetComplete
  ) {
    try {
      const adapter =
        createOfficialSysAdminDemoFixtureAdapter({
          baseUrl:
            API_BASE_URL,

          accessToken:
            session.accessToken,

          listLiveProcesses:
            listLiveProcessesViaProcessQuery,
        });

      const processes =
        await adapter
          .listLiveProcesses(
            DEMO_FIXTURE_USERNAME,
          );

      if (
        processes.length ===
        0
      ) {
        await resetDemoFixture({
          adapter,
          vault,
        });

        console.log(
          "A3B_COMPENSATING_RESET=PASS",
        );
      } else {
        console.log(
          "A3B_COMPENSATING_RESET=REFUSED_LIVE_PROCESS_PRESENT",
        );
      }
    } catch {
      console.log(
        "A3B_COMPENSATING_RESET=FAILED",
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
        "A3B_LOGOUT_HTTP=200",
      );
    } catch {
      console.log(
        "A3B_LOGOUT_HTTP=FAILED",
      );
    }
  }

  console.log(
    "A3B_RUNTIME_PASSWORD_STORED=NO",
  );

  console.log(
    "A3B_JWT_STORED=NO",
  );
}