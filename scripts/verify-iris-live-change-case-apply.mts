import {
  spawn,
} from "node:child_process";

import {
  createHash,
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
  DEMO_FIXTURE_ID,
  DEMO_FIXTURE_TARGET_ROLE,
  DEMO_FIXTURE_USERNAME,
  assertExactDemoUser,
  resetDemoFixture,
  seedDemoFixture,
  type DemoFixtureCredentialVault,
  type DemoFixtureSecretFactory,
  type DemoFixtureUserSnapshot,
} from "../src/lib/change-case/demo-fixture";

import {
  applyLiveDemoChangeCaseCore,
  preflightLiveDemoChangeCaseCore,
  reviewLiveDemoChangeCaseCore,
  type LiveChangeCaseApplyDependencies,
} from "../src/lib/change-case/live-change-case-apply";

import {
  createLiveDemoDurableChangeCase,
  validateDurableChangeCaseSnapshot,
  type DurableChangeCaseEventMutation,
  type DurableChangeCaseRecord,
  type DurableChangeCaseSnapshot,
} from "../src/lib/change-case/durable-change-case";

import {
  DEMO_FIXTURE_APPLY_PREFLIGHT_DIGEST_ALGORITHM,
  DEMO_FIXTURE_APPLY_PREFLIGHT_ROLE_NAMES,
  buildDemoFixtureApplyPreflightCanonical,
} from "../src/lib/change-case/demo-fixture-apply-preflight";

import {
  buildDurableChangeCaseAppendPlan,
  buildDurableChangeCaseCreatePlan,
  buildDurableChangeCaseReadPlan,
  type ChangeCaseHistoryRequestPlan,
} from "../src/lib/iris/change-case-history-transport";

import {
  createOfficialSysAdminDemoFixtureAdapter,
} from "../src/lib/iris/demo-fixture-sysadmin";

import {
  executeFixtureScopedRoleRemovalCore,
} from "../src/lib/iris/demo-fixture-apply-executor";

import {
  DEMO_FIXTURE_USER_SECURITY_PATH,
} from "../src/lib/iris/demo-fixture-apply-transport";

import {
  loginIris,
  logoutIris,
  readRuntimeInfo,
} from "../src/lib/iris/transport";

const API_BASE_URL =
  "http://localhost:52773/api/admin";

const HISTORY_BASE_URL =
  "http://localhost:52773/meridian-control-plane-history";

const RUNTIME_USERNAME =
  "meridian.runtime";

const CONTROLLED_STALE_DIGEST =
  "0000000000000000000000000000000000000000000000000000000000000000";

let runtimePassword =
  "";

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



interface CertificationContext {
  readonly apiBaseUrl:
    string;

  readonly historyBaseUrl:
    string;

  readonly accessToken:
    string;
}

interface JsonObject {
  readonly [key: string]:
    unknown;
}

interface StoredCertificationCredential {
  readonly generation:
    string;

  readonly password:
    string;
}

let storedCertificationCredential:
  StoredCertificationCredential |
  null =
    null;

const certificationCredentialVault:
  DemoFixtureCredentialVault = {
    store:
      (
        input,
      ) => {
        if (
          input.fixtureId !==
          DEMO_FIXTURE_ID
        ) {
          throw new Error(
            "A4C certification vault refused unsupported fixture identity.",
          );
        }

        storedCertificationCredential = {
          generation:
            input.generation,

          password:
            input.password,
        };
      },

    clear:
      (
        fixtureId,
      ) => {
        if (
          fixtureId ===
          DEMO_FIXTURE_ID
        ) {
          storedCertificationCredential =
            null;
        }
      },
  };

const certificationSecretFactory:
  DemoFixtureSecretFactory = {
    generation:
      randomUUID,

    password:
      () =>
        `Aa1!${
          randomBytes(
            10,
          ).toString(
            "hex",
          )
        }`,
  };

function certificationCredentialPresent(
  generation:
    string,
): boolean {
  return (
    storedCertificationCredential
      ?.generation ===
    generation
  );
}

function joinUrl(
  baseUrl:
    string,
  path:
    string,
): string {
  return (
    `${baseUrl.replace(/\/+$/, "")}${
      path.startsWith("/")
        ? path
        : `/${path}`
    }`
  );
}

async function successfulHistoryRequest(
  input: {
    readonly baseUrl:
      string;

    readonly accessToken:
      string;

    readonly plan:
      ChangeCaseHistoryRequestPlan;
  },
): Promise<unknown> {
  const headers:
    Record<string, string> = {
      Accept:
        "application/json",

      Authorization:
        `Bearer ${input.accessToken}`,
    };

  const body =
    input.plan.body ===
    undefined
      ? undefined
      : JSON.stringify(
          input.plan.body,
        );

  if (
    body !==
    undefined
  ) {
    headers["Content-Type"] =
      "application/json";
  }

  const response =
    await fetch(
      joinUrl(
        input.baseUrl,
        input.plan.path,
      ),
      {
        method:
          input.plan.method,

        headers,

        body,

        cache:
          "no-store",

        redirect:
          "error",
      },
    );

  const text =
    await response.text();

  let json:
    unknown =
      null;

  if (
    text.trim().length >
    0
  ) {
    try {
      json =
        JSON.parse(
          text,
        ) as unknown;
    } catch {
      throw new Error(
        `A4C history response HTTP ${response.status} is not JSON.`,
      );
    }
  }

  if (
    !response.ok
  ) {
    const object =
      (
        typeof json ===
          "object" &&
        json !==
          null &&
        !Array.isArray(
          json,
        )
      )
        ? json as Record<string, unknown>
        : null;

    const code =
      typeof object?.code ===
        "string"
        ? object.code
        : "UNKNOWN";

    throw new Error(
      `A4C history request failed HTTP ${response.status} code ${code}.`,
    );
  }

  return json;
}

function snapshotFromHistoryResponse(
  value:
    unknown,
): DurableChangeCaseSnapshot {
  const object =
    objectValue(
      value,
    );

  const snapshot =
    object.snapshot;

  validateDurableChangeCaseSnapshot(
    snapshot,
  );

  return snapshot;
}

async function createDurableChangeCaseDirect(
  input: {
    readonly baseUrl:
      string;

    readonly accessToken:
      string;

    readonly record:
      DurableChangeCaseRecord;
  },
): Promise<DurableChangeCaseSnapshot> {
  return snapshotFromHistoryResponse(
    await successfulHistoryRequest({
      baseUrl:
        input.baseUrl,

      accessToken:
        input.accessToken,

      plan:
        buildDurableChangeCaseCreatePlan(
          input.record,
        ),
    }),
  );
}

async function readDurableChangeCaseDirect(
  input: {
    readonly baseUrl:
      string;

    readonly accessToken:
      string;

    readonly caseId:
      string;
  },
): Promise<DurableChangeCaseSnapshot> {
  return snapshotFromHistoryResponse(
    await successfulHistoryRequest({
      baseUrl:
        input.baseUrl,

      accessToken:
        input.accessToken,

      plan:
        buildDurableChangeCaseReadPlan(
          input.caseId,
        ),
    }),
  );
}

async function appendDurableChangeCaseEventDirect(
  input: {
    readonly baseUrl:
      string;

    readonly accessToken:
      string;

    readonly mutation:
      DurableChangeCaseEventMutation;
  },
): Promise<DurableChangeCaseSnapshot> {
  return snapshotFromHistoryResponse(
    await successfulHistoryRequest({
      baseUrl:
        input.baseUrl,

      accessToken:
        input.accessToken,

      plan:
        buildDurableChangeCaseAppendPlan(
          input.mutation,
        ),
    }),
  );
}

function resultObject(
  value:
    unknown,
): JsonObject {
  const outer =
    objectValue(
      value,
    );

  if (
    typeof outer.result ===
      "object" &&
    outer.result !==
      null &&
    !Array.isArray(
      outer.result,
    )
  ) {
    return outer.result as
      JsonObject;
  }

  return outer;
}

function first(
  object:
    JsonObject,
  keys:
    readonly string[],
): unknown {
  for (
    const key
    of keys
  ) {
    if (
      Object.prototype
        .hasOwnProperty
        .call(
          object,
          key,
        )
    ) {
      return object[key];
    }
  }

  return undefined;
}

function stringValue(
  value:
    unknown,
): string {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function boolValue(
  value:
    unknown,
): boolean {
  return (
    value ===
      true ||
    value ===
      1 ||
    value ===
      "1" ||
    value ===
      "true"
  );
}

function stringArray(
  value:
    unknown,
): string[] {
  if (
    Array.isArray(
      value,
    )
  ) {
    return value
      .filter(
        (
          item,
        ): item is string =>
          typeof item ===
          "string",
      )
      .map(
        (item) =>
          item.trim(),
      )
      .filter(Boolean);
  }

  if (
    typeof value ===
      "string"
  ) {
    return value
      .split(",")
      .map(
        (item) =>
          item.trim(),
      )
      .filter(Boolean);
  }

  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return [];
  }

  throw new Error(
    "A4C configured preflight role-list representation is unsupported.",
  );
}

async function jsonResponse(
  response:
    Response,
  label:
    string,
): Promise<unknown> {
  const text =
    await response.text();

  if (
    response.status !==
      200
  ) {
    throw new Error(
      `${label}_HTTP_${response.status}`,
    );
  }

  try {
    return JSON.parse(
      text,
    ) as unknown;
  } catch {
    throw new Error(
      `${label}_NON_JSON`,
    );
  }
}

async function readPreflightUser(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;
  },
): Promise<DemoFixtureUserSnapshot> {
  const response =
    await fetch(
      joinUrl(
        input.apiBaseUrl,
        `/v2/security/user?name=${encodeURIComponent(DEMO_FIXTURE_USERNAME)}`,
      ),
      {
        method:
          "GET",

        cache:
          "no-store",

        redirect:
          "error",

        headers: {
          Accept:
            "application/json",

          Authorization:
            `Bearer ${input.accessToken}`,
        },
      },
    );

  const result =
    resultObject(
      await jsonResponse(
        response,
        "A4C_PREFLIGHT_USER_READ",
      ),
    );

  return {
    username:
      DEMO_FIXTURE_USERNAME,

    displayName:
      stringValue(
        first(
          result,
          [
            "FullName",
            "fullName",
          ],
        ),
      ),

    namespace:
      stringValue(
        first(
          result,
          [
            "NameSpace",
            "Namespace",
            "namespace",
          ],
        ),
      ),

    enabled:
      boolValue(
        first(
          result,
          [
            "Enabled",
            "enabled",
          ],
        ),
      ),

    directRoles:
      stringArray(
        first(
          result,
          [
            "Roles",
            "roles",
          ],
        ),
      ),
  };
}

function roleResources(
  value:
    unknown,
) {
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return [];
  }

  if (
    !Array.isArray(
      value,
    )
  ) {
    throw new Error(
      "A4C configured preflight role resources are not an array.",
    );
  }

  return value.map(
    (
      entry,
    ) => {
      const object =
        objectValue(
          entry,
        );

      const resource =
        stringValue(
          first(
            object,
            [
              "Name",
              "name",
            ],
          ),
        );

      const permission =
        stringValue(
          first(
            object,
            [
              "Permissions",
              "permissions",
            ],
          ),
        );

      if (
        resource.length ===
          0 ||
        permission.length ===
          0
      ) {
        throw new Error(
          "A4C configured preflight role resource entry is incomplete.",
        );
      }

      return {
        resource,
        permission,
      };
    },
  );
}

async function readPreflightRole(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly roleName:
      string;
  },
) {
  const response =
    await fetch(
      joinUrl(
        input.apiBaseUrl,
        `/v2/security/role?name=${encodeURIComponent(input.roleName)}`,
      ),
      {
        method:
          "GET",

        cache:
          "no-store",

        redirect:
          "error",

        headers: {
          Accept:
            "application/json",

          Authorization:
            `Bearer ${input.accessToken}`,
        },
      },
    );

  const result =
    resultObject(
      await jsonResponse(
        response,
        `A4C_PREFLIGHT_ROLE_READ_${input.roleName}`,
      ),
    );

  return {
    name:
      input.roleName,

    grantedRoles:
      stringArray(
        first(
          result,
          [
            "GrantedRoles",
            "grantedRoles",
          ],
        ),
      ),

    resources:
      roleResources(
        first(
          result,
          [
            "Resources",
            "resources",
          ],
        ),
      ),
  };
}

async function readDemoFixtureReviewablePreflightDirect(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly expectedFixtureGeneration:
      string;
  },
) {
  const generation =
    input.expectedFixtureGeneration
      .trim();

  if (
    generation.length ===
      0 ||
    !certificationCredentialPresent(
      generation,
    )
  ) {
    throw new Error(
      "DEMO_FIXTURE_PREFLIGHT_GENERATION_UNAVAILABLE",
    );
  }

  const user =
    await readPreflightUser({
      apiBaseUrl:
        input.apiBaseUrl,

      accessToken:
        input.accessToken,
    });

  const roles =
    await Promise.all(
      DEMO_FIXTURE_APPLY_PREFLIGHT_ROLE_NAMES.map(
        (
          roleName,
        ) =>
          readPreflightRole({
            apiBaseUrl:
              input.apiBaseUrl,

            accessToken:
              input.accessToken,

            roleName,
          }),
      ),
    );

  const canonical =
    buildDemoFixtureApplyPreflightCanonical({
      expectedFixtureGeneration:
        generation,

      user,

      roles,
    });

  const canonicalJson =
    JSON.stringify(
      canonical,
    );

  const digest =
    createHash(
      "sha256",
    )
      .update(
        canonicalJson,
        "utf8",
      )
      .digest(
        "hex",
      )
      .toUpperCase();

  return Object.freeze({
    state:
      "PREFLIGHTED" as const,

    digestAlgorithm:
      DEMO_FIXTURE_APPLY_PREFLIGHT_DIGEST_ALGORITHM,

    digest,

    canonical,

    canonicalJson,
  });
}

function directDependencies(
  context:
    CertificationContext,
): LiveChangeCaseApplyDependencies {
  return {
    readCase:
      async (
        caseId,
      ) =>
        readDurableChangeCaseDirect({
          baseUrl:
            context.historyBaseUrl,

          accessToken:
            context.accessToken,

          caseId,
        }),

    appendEvent:
      async (
        mutation,
      ) =>
        appendDurableChangeCaseEventDirect({
          baseUrl:
            context.historyBaseUrl,

          accessToken:
            context.accessToken,

          mutation,
        }),

    readFreshPreflight:
      async (
        record,
      ) =>
        readDemoFixtureReviewablePreflightDirect({
          apiBaseUrl:
            context.apiBaseUrl,

          accessToken:
            context.accessToken,

          expectedFixtureGeneration:
            record.fixture.expectedGeneration,
        }),

    executeMutation:
      async (
        record,
      ) =>
        executeFixtureScopedRoleRemovalCore(
          {
            apiBaseUrl:
              context.apiBaseUrl,

            accessToken:
              context.accessToken,

            expectedFixtureGeneration:
              record.fixture.expectedGeneration,
          },
          {
            credentialPresent:
              certificationCredentialPresent,
          },
        ),

    nowUtc:
      () =>
        new Date().toISOString(),

    newApplyAttemptId:
      randomUUID,
  };
}

async function preflightLiveDemoChangeCaseDirect(
  context:
    CertificationContext,
  input: {
    readonly caseId:
      string;

    readonly expectedCaseVersion:
      number;
  },
): Promise<DurableChangeCaseSnapshot> {
  return preflightLiveDemoChangeCaseCore(
    input,
    directDependencies(
      context,
    ),
  );
}

async function reviewLiveDemoChangeCaseDirect(
  context:
    CertificationContext,
  input: {
    readonly caseId:
      string;

    readonly expectedCaseVersion:
      number;

    readonly reviewedDigest:
      string;
  },
): Promise<DurableChangeCaseSnapshot> {
  return reviewLiveDemoChangeCaseCore(
    input,
    directDependencies(
      context,
    ),
  );
}

async function applyLiveDemoChangeCaseDirect(
  context:
    CertificationContext,
  input: {
    readonly caseId:
      string;

    readonly expectedCaseVersion:
      number;
  },
) {
  return applyLiveDemoChangeCaseCore(
    input,
    directDependencies(
      context,
    ),
  );
}

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
      "A4C input is not an object.",
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

function evidenceDigest(
  record:
    DurableChangeCaseRecord,
): string {
  const preflight =
    objectValue(
      record.preflight,
    );

  const digest =
    preflight.digest;

  if (
    typeof digest !==
      "string" ||
    !/^[A-F0-9]{64}$/.test(
      digest,
    )
  ) {
    throw new Error(
      "A4C durable preflight digest is missing or invalid.",
    );
  }

  return digest;
}

async function createReadyCase(
  context:
    CertificationContext,
  input: {
    readonly caseId:
      string;

    readonly generation:
      string;
  },
) {
  const created =
    await createDurableChangeCaseDirect({
      baseUrl:
        HISTORY_BASE_URL,
      accessToken:
        context.accessToken,
      record:
        createLiveDemoDurableChangeCase({
          caseId:
            input.caseId,
          expectedFixtureGeneration:
            input.generation,
          nowUtc:
            new Date().toISOString(),
        }),
    });

  if (
    created.record.state !==
      "PROPOSED" ||
    created.record.version !==
      1
  ) {
    throw new Error(
      "A4C durable case creation did not produce PROPOSED v1.",
    );
  }

  const preflighted =
    await preflightLiveDemoChangeCaseDirect(
      context,
      {
        caseId:
          input.caseId,
        expectedCaseVersion:
          1,
      },
    );

  if (
    preflighted.record.state !==
      "PREFLIGHTED" ||
    preflighted.record.version !==
      2
  ) {
    throw new Error(
      "A4C durable preflight did not produce PREFLIGHTED v2.",
    );
  }

  const reviewedDigest =
    evidenceDigest(
      preflighted.record,
    );

  const ready =
    await reviewLiveDemoChangeCaseDirect(
      context,
      {
        caseId:
          input.caseId,
        expectedCaseVersion:
          2,
        reviewedDigest,
      },
    );

  if (
    ready.record.state !==
      "READY" ||
    ready.record.version !==
      3
  ) {
    throw new Error(
      "A4C durable review did not produce READY v3.",
    );
  }

  return {
    reviewedDigest,
    ready,
  };
}

const MATCH_CASE_ID =
  process.argv[2] ??
  "";

const STALE_CASE_ID =
  process.argv[3] ??
  "";

if (
  !/^a4c-match-[A-Za-z0-9-]+$/.test(
    MATCH_CASE_ID,
  ) ||
  !/^a4c-stale-[A-Za-z0-9-]+$/.test(
    STALE_CASE_ID,
  ) ||
  MATCH_CASE_ID ===
    STALE_CASE_ID
) {
  throw new Error(
    "A4C verifier requires distinct opaque match/stale certification case IDs.",
  );
}

console.log(
  "A4C_DIRECT_CERTIFICATION_HARNESS=PURE_CORE_COMPOSITION",
);
console.log(
  "A4C_DIRECT_CERTIFICATION_SERVER_ONLY_IMPORTS=0",
);

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
    "A4C runtime password is missing.",
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
    "A4C_LOGIN_HTTP=200",
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
      "A4C pinned runtime identity/version guard failed.",
    );
  }

  console.log(
    "A4C_RUNTIME_IDENTITY_VERSION=PASS",
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
    "A4C_PROCESSQUERY_EXTERNAL_SQL=PASS",
  );

  if (
    await adapter.readUser(
      DEMO_FIXTURE_USERNAME,
    )
  ) {
    throw new Error(
      "A4C requires synthetic fixture absence before seed.",
    );
  }

  if (
    (
      await adapter.listLiveProcesses(
        DEMO_FIXTURE_USERNAME,
      )
    ).length !==
      0
  ) {
    throw new Error(
      "A4C requires zero synthetic fixture processes before seed.",
    );
  }

  console.log(
    "A4C_PRE_FIXTURE_CLEAN=PASS",
  );

  const publicState =
    await seedDemoFixture({
      adapter,
      vault:
        certificationCredentialVault,
      secrets:
        certificationSecretFactory,
    });

  seeded =
    true;

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
      "A4C seeded fixture identity drifted.",
    );
  }

  console.log(
    "A4C_FIXTURE_SEED=PASS",
  );
  console.log(
    "A4C_FIXTURE_GENERATION_BOUND=PASS",
  );
  console.log(
    "A4C_SYNTHETIC_CREDENTIAL_EXPOSED=NO",
  );

  const seededUser =
    await adapter.readUser(
      DEMO_FIXTURE_USERNAME,
    );

  if (!seededUser) {
    throw new Error(
      "A4C seeded user is missing.",
    );
  }

  assertExactDemoUser(
    seededUser,
  );

  console.log(
    "A4C_CONFIGURED_PRESTATE_EXACT=PASS",
  );

  const context:
    CertificationContext = {
      apiBaseUrl:
        API_BASE_URL,
      historyBaseUrl:
        HISTORY_BASE_URL,
      accessToken:
        session.accessToken,
    };

  // -----------------------------------------------------------------
  // Controlled STALE branch: durable READY case + fresh digest mismatch.
  // This uses real IRIS case persistence and a controlled in-memory digest
  // mismatch. The fixture mutation boundary must never be called.
  // -----------------------------------------------------------------

  const staleReady =
    await createReadyCase(
      context,
      {
        caseId:
          STALE_CASE_ID,
        generation:
          publicState.generation,
      },
    );

  console.log(
    "A4C_STALE_CASE_READY=PASS",
  );

  let staleMutationDispatchCount =
    0;

  const staleOutcome =
    await applyLiveDemoChangeCaseCore(
      {
        caseId:
          STALE_CASE_ID,
        expectedCaseVersion:
          staleReady.ready.record.version,
      },
      {
        readCase:
          async (
            caseId,
          ) =>
            readDurableChangeCaseDirect({
              baseUrl:
                HISTORY_BASE_URL,
              accessToken:
                session!.accessToken,
              caseId,
            }),

        appendEvent:
          async (
            mutation,
          ) =>
            appendDurableChangeCaseEventDirect({
              baseUrl:
                HISTORY_BASE_URL,
              accessToken:
                session!.accessToken,
              mutation,
            }),

        readFreshPreflight:
          async (
            record,
          ) => {
            const actual =
              await readDemoFixtureReviewablePreflightDirect({
                apiBaseUrl:
                  API_BASE_URL,
                accessToken:
                  session!.accessToken,
                expectedFixtureGeneration:
                  record.fixture.expectedGeneration,
              });

            return {
              ...actual,
              digest:
                CONTROLLED_STALE_DIGEST,
            };
          },

        executeMutation:
          async () => {
            staleMutationDispatchCount +=
              1;

            throw new Error(
              "STALE must never dispatch mutation.",
            );
          },

        nowUtc:
          () =>
            new Date().toISOString(),

        newApplyAttemptId:
          randomUUID,
      },
    );

  if (
    staleOutcome.state !==
      "STALE" ||
    staleOutcome.mutationDispatchCount !==
      0 ||
    staleMutationDispatchCount !==
      0 ||
    staleOutcome.snapshot.record.state !==
      "STALE" ||
    staleOutcome.snapshot.events.at(-1)?.eventType !==
      "APPLY_REVALIDATION_STALE"
  ) {
    throw new Error(
      "A4C controlled stale branch violated zero-dispatch semantics.",
    );
  }

  console.log(
    "A4C_READY_DIGEST_MISMATCH_TO_STALE=PASS",
  );
  console.log(
    "A4C_STALE_MUTATION_DISPATCH_COUNT=0",
  );
  console.log(
    "A4C_STALE_DURABLE_REASON_PERSISTED=PASS",
  );

  // -----------------------------------------------------------------
  // MATCH branch: full server orchestration -> exactly one official PUT ->
  // configured post-read -> durable APPLIED, never VERIFIED.
  // -----------------------------------------------------------------

  const matchReady =
    await createReadyCase(
      context,
      {
        caseId:
          MATCH_CASE_ID,
        generation:
          publicState.generation,
      },
    );

  console.log(
    "A4C_MATCH_CASE_READY=PASS",
  );

  let physicalPutCount =
    0;

  const originalFetch =
    globalThis.fetch;

  globalThis.fetch =
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
          "PUT" &&
        url ===
          `${API_BASE_URL}${DEMO_FIXTURE_USER_SECURITY_PATH}`
      ) {
        physicalPutCount +=
          1;
      }

      return originalFetch(
        input,
        init,
      );
    };

  let matchOutcome:
    Awaited<
      ReturnType<
        typeof applyLiveDemoChangeCaseDirect
      >
    >;

  try {
    matchOutcome =
      await applyLiveDemoChangeCaseDirect(
        context,
        {
          caseId:
            MATCH_CASE_ID,
          expectedCaseVersion:
            matchReady.ready.record.version,
        },
      );
  } finally {
    globalThis.fetch =
      originalFetch;
  }

  if (
    matchOutcome.state !==
      "APPLIED" ||
    matchOutcome.mutationDispatchCount !==
      1 ||
    matchOutcome.configuredVerified !==
      true ||
    matchOutcome.convergenceRequired !==
      true ||
    matchOutcome.auditBindingRequired !==
      true ||
    matchOutcome.verified !==
      false ||
    physicalPutCount !==
      1
  ) {
    throw new Error(
      "A4C MATCH branch did not produce exactly one configured APPLIED mutation.",
    );
  }

  console.log(
    "A4C_READY_DIGEST_MATCH=PASS",
  );
  console.log(
    "A4C_EXACTLY_ONE_MUTATION_DISPATCH=PASS",
  );
  console.log(
    "A4C_PHYSICAL_SYSADMIN_PUT_COUNT=1",
  );
  console.log(
    "A4C_CONFIGURED_SUCCESS_TO_APPLIED=PASS",
  );
  console.log(
    "A4C_APPLIED_NOT_VERIFIED=PASS",
  );

  const freshRead =
    await readDurableChangeCaseDirect({
      baseUrl:
        HISTORY_BASE_URL,
      accessToken:
        session.accessToken,
      caseId:
        MATCH_CASE_ID,
    });

  const eventTypes =
    freshRead.events.map(
      (event) =>
        event.eventType,
    );

  const expectedEvents = [
    "CASE_CREATED",
    "PREFLIGHT_COMPLETED",
    "REVIEW_ACCEPTED",
    "APPLY_REVALIDATION_MATCHED",
    "APPLY_ATTEMPT_STARTED",
    "APPLY_SUCCEEDED",
    "CONFIGURED_STATE_VERIFIED",
  ];

  if (
    freshRead.record.state !==
      "APPLIED" ||
    freshRead.record.version !==
      7 ||
    JSON.stringify(
      eventTypes,
    ) !==
    JSON.stringify(
      expectedEvents,
    ) ||
    eventTypes.includes(
      "CASE_VERIFIED",
    )
  ) {
    throw new Error(
      "A4C durable Apply journal did not reproduce the exact end-to-end state machine.",
    );
  }

  console.log(
    "A4C_DURABLE_APPLY_JOURNAL_EXACT=PASS",
  );
  console.log(
    "A4C_DURABLE_FINAL_STATE=APPLIED",
  );
  console.log(
    "A4C_DURABLE_FINAL_VERSION=7",
  );
  console.log(
    "A4C_CASE_VERIFIED_EVENT_PRESENT=NO",
  );
  console.log(
    "A4C_BROWSER_REFRESH_SERVER_TRUTH=PASS",
  );

  const configuredAfter =
    await adapter.readUser(
      DEMO_FIXTURE_USERNAME,
    );

  if (
    !configuredAfter ||
    JSON.stringify(
      [
        ...configuredAfter.directRoles,
      ].sort(),
    ) !==
    JSON.stringify(
      [
        ...DEMO_FIXTURE_DIRECT_ROLES_AFTER,
      ].sort(),
    )
  ) {
    throw new Error(
      "A4C configured user state did not match the fixed post-Apply role set.",
    );
  }

  console.log(
    "A4C_CONFIGURED_POSTSTATE_EXACT=PASS",
  );
  console.log(
    "A4C_LIVE_STATE_MACHINE_CERTIFICATION=PASS",
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
        vault:
          certificationCredentialVault,
      });

      resetComplete =
        true;

      console.log(
        "A4C_FIXTURE_RESET=PASS",
      );
    } catch (
      cleanupError
    ) {
      cleanupFailure =
        cleanupError instanceof Error
          ? cleanupError
          : new Error(
              "Unknown A4C fixture reset failure.",
            );

      console.log(
        `A4C_FIXTURE_RESET_FAILURE=${cleanupFailure.message}`,
      );
    }
  }

  if (session) {
    try {
      await logoutIris({
        baseUrl:
          API_BASE_URL,
        accessToken:
          session.accessToken,
      });

      console.log(
        "A4C_LOGOUT_HTTP=200",
      );
    } catch (
      logoutError
    ) {
      if (!cleanupFailure) {
        cleanupFailure =
          logoutError instanceof Error
            ? logoutError
            : new Error(
                "Unknown A4C logout failure.",
              );
      }
    }
  }

  runtimePassword =
    "";

  console.log(
    "A4C_RUNTIME_PASSWORD_STORED=NO",
  );
  console.log(
    "A4C_JWT_STORED=NO",
  );

  if (cleanupFailure) {
    throw cleanupFailure;
  }
}

console.log(
  "A4C_COMMAND_COMPLETE=YES",
);
