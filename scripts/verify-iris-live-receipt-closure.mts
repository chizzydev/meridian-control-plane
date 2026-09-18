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
  setTimeout as delay,
} from "node:timers/promises";

import {
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
  advanceLiveConvergenceCore,
  buildPostApplyWitnessObservation,
  buildPreApplyWitnessBaseline,
  recordStaleLiveWitnessCore,
  type LiveConvergenceDependencies,
} from "../src/lib/change-case/live-convergence";

import {
  closeLiveReceiptCore,
  type LiveReceiptClosureDependencies,
} from "../src/lib/change-case/live-receipt-closure";

import {
  type ReceiptHistorySummary,
  type VerifiedReceiptHistoryRecord,
  validateVerifiedReceiptHistoryRecord,
} from "../src/lib/change-case/receipt-history";

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
  findFixtureRoleRemovalAuditOnce,
} from "../src/lib/iris/native-userchange-audit";

import {
  buildReceiptHistoryReadPlan,
  buildReceiptHistoryWritePlan,
  type ReceiptHistoryRequestPlan,
} from "../src/lib/iris/receipt-history-transport";

import {
  createOfficialSysAdminDemoFixtureAdapter,
} from "../src/lib/iris/demo-fixture-sysadmin";

import {
  executeFixtureScopedRoleRemovalCore,
} from "../src/lib/iris/demo-fixture-apply-executor";

import {
  readLiveWitnessProcessRows,
  startLiveWitnessNativeSession,
  waitForOldWitnessPidGone,
  type LiveWitnessNativeSession,
} from "../src/lib/iris/live-witness-native";

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

const HELPER_BASE_URL =
  "http://localhost:52773/meridian-control-plane-internal";

const RUNTIME_USERNAME =
  "meridian.runtime";

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

function certificationCredentialPassword(
  generation:
    string,
): string {
  if (
    storedCertificationCredential
      ?.generation !==
    generation ||
    storedCertificationCredential.password.length ===
      0
  ) {
    throw new Error(
      "A5 certification fixture credential is unavailable for this generation.",
    );
  }

  return storedCertificationCredential.password;
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


async function successfulReceiptHistoryRequest(
  input: {
    readonly baseUrl:
      string;

    readonly accessToken:
      string;

    readonly plan:
      ReceiptHistoryRequestPlan;
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
        `A6 receipt-history HTTP ${response.status} is not JSON.`,
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
      `A6 receipt-history request failed HTTP ${response.status} code ${code}.`,
    );
  }

  return json;
}

function receiptSummaryFromUnknown(
  value:
    unknown,
): ReceiptHistorySummary {
  const object =
    objectValue(
      value,
    );

  const required =
    (
      key:
        string,
    ) => {
      const value =
        object[
          key
        ];

      if (
        typeof value !==
          "string" ||
        value.trim().length ===
          0
      ) {
        throw new Error(
          `A6 receipt-history summary missing ${key}.`,
        );
      }

      return value.trim();
    };

  const applyPid =
    Number(
      object.applyPid,
    );

  const nativeAuditIndex =
    Number(
      object.nativeAuditIndex,
    );

  if (
    !Number.isSafeInteger(
      applyPid,
    ) ||
    applyPid <
      1 ||
    !Number.isSafeInteger(
      nativeAuditIndex,
    ) ||
    nativeAuditIndex <
      1
  ) {
    throw new Error(
      "A6 receipt-history summary numeric identity is invalid.",
    );
  }

  return {
    schemaVersion:
      required(
        "schemaVersion",
      ) as ReceiptHistorySummary["schemaVersion"],

    receiptId:
      required(
        "receiptId",
      ),

    username:
      required(
        "username",
      ),

    displayName:
      required(
        "displayName",
      ),

    operation:
      required(
        "operation",
      ) as ReceiptHistorySummary["operation"],

    role:
      required(
        "role",
      ),

    lifecycleState:
      required(
        "lifecycleState",
      ) as ReceiptHistorySummary["lifecycleState"],

    reviewedPreflightDigest:
      required(
        "reviewedPreflightDigest",
      ),

    freshApplyTimePreflightDigest:
      required(
        "freshApplyTimePreflightDigest",
      ),

    receiptSha256:
      required(
        "receiptSha256",
      ),

    applyUtc:
      required(
        "applyUtc",
      ),

    applyActor:
      required(
        "applyActor",
      ),

    applyPid,

    nativeAuditSystemId:
      required(
        "nativeAuditSystemId",
      ),

    nativeAuditIndex,

    nativeAuditUtc:
      required(
        "nativeAuditUtc",
      ),

    nativeAuditEvent:
      required(
        "nativeAuditEvent",
      ),

    nativeAuditActor:
      required(
        "nativeAuditActor",
      ),
  };
}

async function persistReceiptHistoryDirect(
  input: {
    readonly baseUrl:
      string;

    readonly accessToken:
      string;

    readonly record:
      VerifiedReceiptHistoryRecord;
  },
): Promise<{
  readonly status:
    "CREATED" |
    "IDEMPOTENT";

  readonly record:
    ReceiptHistorySummary;
}> {
  const raw =
    await successfulReceiptHistoryRequest({
      baseUrl:
        input.baseUrl,

      accessToken:
        input.accessToken,

      plan:
        buildReceiptHistoryWritePlan(
          input.record,
        ),
    });

  const object =
    objectValue(
      raw,
    );

  const status =
    object.status;

  if (
    status !==
      "CREATED" &&
    status !==
      "IDEMPOTENT"
  ) {
    throw new Error(
      "A6 receipt-history write status is invalid.",
    );
  }

  return {
    status,

    record:
      receiptSummaryFromUnknown(
        object.record,
      ),
  };
}

async function readReceiptHistoryDirect(
  input: {
    readonly baseUrl:
      string;

    readonly accessToken:
      string;

    readonly receiptId:
      string;
  },
): Promise<VerifiedReceiptHistoryRecord> {
  const raw =
    await successfulReceiptHistoryRequest({
      baseUrl:
        input.baseUrl,

      accessToken:
        input.accessToken,

      plan:
        buildReceiptHistoryReadPlan(
          input.receiptId,
        ),
    });

  const object =
    objectValue(
      raw,
    );

  const record =
    object.record;

  validateVerifiedReceiptHistoryRecord(
    record,
  );

  return record;
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


function receiptClosureDependencies(
  context:
    CertificationContext,
): LiveReceiptClosureDependencies {
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

    findNativeAudit:
      async (
        input,
      ) => {
        for (
          let attempt =
            1;
          attempt <=
            20;
          attempt +=
            1
        ) {
          const binding =
            await findFixtureRoleRemovalAuditOnce({
              helperBaseUrl:
                HELPER_BASE_URL,

              accessToken:
                context.accessToken,

              applyStartedAtUtc:
                input.applyStartedAtUtc,
            });

          if (
            binding !==
              null
          ) {
            console.log(
              `A6_NATIVE_AUDIT_POLL_ATTEMPT=${attempt}`,
            );

            return binding;
          }

          if (
            attempt <
              20
          ) {
            await delay(
              250,
            );
          }
        }

        return null;
      },

    persistReceipt:
      async (
        record,
      ) =>
        persistReceiptHistoryDirect({
          baseUrl:
            context.historyBaseUrl,

          accessToken:
            context.accessToken,

          record,
        }),

    readReceipt:
      async (
        receiptId,
      ) =>
        readReceiptHistoryDirect({
          baseUrl:
            context.historyBaseUrl,

          accessToken:
            context.accessToken,

          receiptId,
        }),

    sha256Utf8:
      (
        value,
      ) =>
        createHash(
          "sha256",
        )
          .update(
            value,
            "utf8",
          )
          .digest(
            "hex",
          )
          .toUpperCase(),

    nowUtc:
      () =>
        new Date().toISOString(),
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


const CASE_ID =
  process.argv[2] ??
  "";

if (
  !/^a6-live-[A-Za-z0-9-]+$/.test(
    CASE_ID,
  )
) {
  throw new Error(
    "A6 verifier requires one opaque a6-live-* certification case id.",
  );
}

console.log(
  "A5_DIRECT_CERTIFICATION_HARNESS=PURE_CORE_COMPOSITION",
);
console.log(
  "A5_DIRECT_CERTIFICATION_SERVER_ONLY_IMPORTS=0",
);
console.log(
  "A6_DIRECT_CERTIFICATION_HARNESS=PURE_CORE_COMPOSITION",
);
console.log(
  "A6_DIRECT_CERTIFICATION_SERVER_ONLY_IMPORTS=0",
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
    "A5 runtime password is missing.",
  );
}

const WORKER_SCRIPT =
  join(
    process.cwd(),
    "scripts",
    "iris-live-witness-worker.py",
  );

const PROCESS_READER_SCRIPT =
  join(
    process.cwd(),
    "scripts",
    "iris-processquery-witness-reader.py",
  );

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

let witness:
  LiveWitnessNativeSession |
  null =
    null;

let seeded =
  false;

let witnessExited =
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
    "A5_LOGIN_HTTP=200",
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
      "A5 pinned runtime identity/version guard failed.",
    );
  }

  console.log(
    "A5_RUNTIME_IDENTITY_VERSION=PASS",
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
    "A5_PROCESSQUERY_EXTERNAL_SQL=PASS",
  );

  if (
    await adapter.readUser(
      DEMO_FIXTURE_USERNAME,
    )
  ) {
    throw new Error(
      "A5 requires synthetic fixture absence before seed.",
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
      "A5 requires zero synthetic fixture processes before seed.",
    );
  }

  console.log(
    "A5_PRE_FIXTURE_CLEAN=PASS",
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
      "A5 seeded fixture identity drifted.",
    );
  }

  console.log(
    "A5_FIXTURE_SEED=PASS",
  );
  console.log(
    "A5_FIXTURE_GENERATION_BOUND=PASS",
  );
  console.log(
    "A5_SYNTHETIC_CREDENTIAL_EXPOSED=NO",
  );

  const seededUser =
    await adapter.readUser(
      DEMO_FIXTURE_USERNAME,
    );

  if (!seededUser) {
    throw new Error(
      "A5 seeded user is missing.",
    );
  }

  assertExactDemoUser(
    seededUser,
  );

  console.log(
    "A5_CONFIGURED_PRESTATE_EXACT=PASS",
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

  const ready =
    await createReadyCase(
      context,
      {
        caseId:
          CASE_ID,
        generation:
          publicState.generation,
      },
    );

  console.log(
    "A5_CASE_READY=PASS",
  );

  // -----------------------------------------------------------------
  // Pre-Apply persistent Native SDK witness.
  // It must exist BEFORE the role mutation and stay on the same open
  // connection across that mutation.
  // -----------------------------------------------------------------

  const rowsBeforeWitness =
    await readLiveWitnessProcessRows({
      pythonExecutable:
        PROCESS_QUERY_PYTHON,
      readerScriptPath:
        PROCESS_READER_SCRIPT,
      runtimePassword,
    });

  if (
    rowsBeforeWitness.length !==
      0
  ) {
    throw new Error(
      "A5 pre-witness ProcessQuery state is not clean.",
    );
  }

  witness =
    await startLiveWitnessNativeSession({
      pythonExecutable:
        PROCESS_QUERY_PYTHON,
      workerScriptPath:
        WORKER_SCRIPT,
      fixturePassword:
        certificationCredentialPassword(
          publicState.generation,
        ),
      expectedFixtureGeneration:
        publicState.generation,
    });

  const baselineRows =
    await readLiveWitnessProcessRows({
      pythonExecutable:
        PROCESS_QUERY_PYTHON,
      readerScriptPath:
        PROCESS_READER_SCRIPT,
      runtimePassword,
    });

  const baseline =
    buildPreApplyWitnessBaseline({
      record:
        ready.ready.record,
      observationId:
        randomUUID(),
      self:
        witness.startup,
      processRows:
        baselineRows,
    });

  if (
    baseline.serverPid <=
      0 ||
    baselineRows.length !==
      1 ||
    !baseline.permissions.every(
      (row) =>
        row.live ===
          "ALLOW",
    )
  ) {
    throw new Error(
      "A5 pre-Apply live witness baseline is incomplete.",
    );
  }

  console.log(
    `A5_PRE_APPLY_SERVER_PID=${baseline.serverPid}`,
  );
  console.log(
    "A5_PRE_APPLY_DIRECT_ALL_SCOPED_ALLOWED=PASS",
  );
  console.log(
    "A5_PRE_APPLY_PROCESSQUERY_BINDING=PASS",
  );
  console.log(
    "A5_PRE_APPLY_SAME_CONNECTION_HELD_OPEN=YES",
  );

  // -----------------------------------------------------------------
  // A4C Apply while the old witness remains connected.
  // -----------------------------------------------------------------

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

  let applied:
    Awaited<
      ReturnType<
        typeof applyLiveDemoChangeCaseDirect
      >
    >;

  try {
    applied =
      await applyLiveDemoChangeCaseDirect(
        context,
        {
          caseId:
            CASE_ID,
          expectedCaseVersion:
            ready.ready.record.version,
        },
      );
  } finally {
    globalThis.fetch =
      originalFetch;
  }

  if (
    applied.state !==
      "APPLIED" ||
    applied.mutationDispatchCount !==
      1 ||
    applied.configuredVerified !==
      true ||
    applied.verified !==
      false ||
    physicalPutCount !==
      1
  ) {
    throw new Error(
      "A5 prerequisite Apply did not produce one configured-only APPLIED mutation.",
    );
  }

  console.log(
    "A5_CONFIGURED_APPLY=PASS",
  );
  console.log(
    "A5_PHYSICAL_SYSADMIN_PUT_COUNT=1",
  );
  console.log(
    "A5_APPLIED_NOT_VERIFIED=PASS",
  );

  // -----------------------------------------------------------------
  // SAME live connection after configured removal.
  // -----------------------------------------------------------------

  const staleSelf =
    await witness.observe();

  const staleRows =
    await readLiveWitnessProcessRows({
      pythonExecutable:
        PROCESS_QUERY_PYTHON,
      readerScriptPath:
        PROCESS_READER_SCRIPT,
      runtimePassword,
    });

  const staleObservation =
    buildPostApplyWitnessObservation({
      record:
        applied.snapshot.record,
      observationId:
        randomUUID(),
      phase:
        "STALE",
      self:
        staleSelf,
      processRows:
        staleRows,
    });

  if (
    staleObservation.serverPid !==
      baseline.serverPid ||
    staleObservation.lostPermissionMismatchCount !==
      4 ||
    staleObservation.everyRequiredDecisionMatchesExpected
  ) {
    throw new Error(
      "A5 same-process stale authorization proof did not reproduce exactly.",
    );
  }

  console.log(
    `A5_STALE_SERVER_PID=${staleObservation.serverPid}`,
  );
  console.log(
    "A5_SAME_SERVER_PID_AFTER_APPLY=PASS",
  );
  console.log(
    "A5_CONFIGURED_DENIED_LIVE_STILL_ALLOWED_COUNT=4",
  );
  console.log(
    "A5_STALE_DIRECT_SELF_WITNESS=PASS",
  );
  console.log(
    "A5_STALE_PROCESSQUERY_BINDING=PASS",
  );

  const convergenceDependencies:
    LiveConvergenceDependencies = {
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

      nowUtc:
        () =>
          new Date().toISOString(),

      newObservationId:
        randomUUID,
    };

  const converging =
    await recordStaleLiveWitnessCore(
      {
        caseId:
          CASE_ID,
        expectedCaseVersion:
          applied.snapshot.record.version,
        preApplyBaseline:
          baseline,
        staleObservation,
      },
      convergenceDependencies,
    );

  if (
    converging.state !==
      "CONVERGING" ||
    converging.verified !==
      false ||
    converging.snapshot.record.version !==
      8 ||
    converging.snapshot.events.at(-1)
      ?.eventType !==
      "LIVE_STALE_OBSERVED"
  ) {
    throw new Error(
      "A5 durable stale observation did not transition APPLIED -> CONVERGING.",
    );
  }

  console.log(
    "A5_DURABLE_LIVE_STALE_OBSERVED=PASS",
  );
  console.log(
    "A5_CONVERGING_NOT_VERIFIED=PASS",
  );

  // -----------------------------------------------------------------
  // Controlled witness advance: NORMAL CLOSE -> old PID gone ->
  // fresh connection -> fresh different PID -> direct convergence.
  // No process kill exists anywhere in this surface.
  // -----------------------------------------------------------------

  const advanced =
    await advanceLiveConvergenceCore(
      {
        caseId:
          CASE_ID,
        expectedCaseVersion:
          converging.snapshot.record.version,
      },
      {
        ...convergenceDependencies,

        closeOldWitness:
          async () => {
            const closed =
              await witness!
                .closeConnection();

            console.log(
              "A5_OLD_WITNESS_NORMAL_CLOSE=PASS",
            );

            return closed;
          },

        proveOldPidGone:
          async (
            stale,
          ) => {
            const gone =
              await waitForOldWitnessPidGone({
                pythonExecutable:
                  PROCESS_QUERY_PYTHON,
                readerScriptPath:
                  PROCESS_READER_SCRIPT,
                runtimePassword,
                oldPid:
                  stale.serverPid,
              });

            console.log(
              "A5_OLD_PID_GONE=PASS",
            );
            console.log(
              "A5_ZERO_FIXTURE_PROCESSES_AFTER_OLD_CLOSE=PASS",
            );

            return gone;
          },

        openFreshWitness:
          async (
            record,
            stale,
          ) => {
            const freshSelf =
              await witness!
                .reconnect();

            const freshRows =
              await readLiveWitnessProcessRows({
                pythonExecutable:
                  PROCESS_QUERY_PYTHON,
                readerScriptPath:
                  PROCESS_READER_SCRIPT,
                runtimePassword,
              });

            const fresh =
              buildPostApplyWitnessObservation({
                record,
                observationId:
                  randomUUID(),
                phase:
                  "CONVERGED",
                self:
                  freshSelf,
                processRows:
                  freshRows,
              });

            if (
              fresh.serverPid ===
                stale.serverPid
            ) {
              throw new Error(
                "A5 fresh witness reused the stale PID.",
              );
            }

            console.log(
              `A5_FRESH_SERVER_PID=${fresh.serverPid}`,
            );
            console.log(
              "A5_FRESH_PID_DIFFERS_FROM_STALE_PID=PASS",
            );
            console.log(
              "A5_FRESH_PROCESSQUERY_BINDING=PASS",
            );

            return fresh;
          },
      },
    );

  if (
    advanced.state !==
      "AUDIT_PENDING" ||
    advanced.verified !==
      false ||
    advanced.oldServerPid !==
      baseline.serverPid ||
    advanced.freshServerPid ===
      baseline.serverPid ||
    advanced.snapshot.record.version !==
      13 ||
    advanced.snapshot.record.audit !==
      null ||
    advanced.snapshot.record.receipt !==
      null
  ) {
    throw new Error(
      "A5 controlled convergence did not stop exactly at AUDIT_PENDING v13.",
    );
  }

  console.log(
    "A5_FRESH_DIRECT_LOST_DENIED_COUNT=4",
  );
  console.log(
    "A5_FRESH_DIRECT_RETAINED_ALLOWED_COUNT=2",
  );
  console.log(
    "A5_FRESH_DIRECT_TRANSPORT_ALLOWED_COUNT=4",
  );
  console.log(
    "A5_LIVE_CONVERGED=PASS",
  );
  console.log(
    "A5_AUDIT_PENDING_NOT_VERIFIED=PASS",
  );

  const durable =
    await readDurableChangeCaseDirect({
      baseUrl:
        HISTORY_BASE_URL,
      accessToken:
        session.accessToken,
      caseId:
        CASE_ID,
    });

  const eventTypes =
    durable.events.map(
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
    "LIVE_STALE_OBSERVED",
    "OLD_WITNESS_CLOSED",
    "OLD_PID_GONE",
    "FRESH_WITNESS_BOUND",
    "LIVE_CONVERGED",
    "AUDIT_PENDING",
  ];

  if (
    durable.record.state !==
      "AUDIT_PENDING" ||
    durable.record.version !==
      13 ||
    durable.record.liveObservations.length !==
      3 ||
    JSON.stringify(
      eventTypes,
    ) !==
    JSON.stringify(
      expectedEvents,
    ) ||
    eventTypes.includes(
      "AUDIT_BOUND",
    ) ||
    eventTypes.includes(
      "RECEIPT_WRITE_STARTED",
    ) ||
    eventTypes.includes(
      "CASE_VERIFIED",
    )
  ) {
    throw new Error(
      "A5 durable convergence journal crossed the A6 boundary or lost evidence.",
    );
  }

  console.log(
    "A5_DURABLE_CONVERGENCE_JOURNAL_EXACT=PASS",
  );
  console.log(
    "A5_DURABLE_FINAL_STATE=AUDIT_PENDING",
  );
  console.log(
    "A5_DURABLE_FINAL_VERSION=13",
  );
  console.log(
    "A5_LIVE_OBSERVATION_COUNT=3",
  );
  console.log(
    "A5_AUDIT_BOUND_EVENT_PRESENT=NO",
  );
  console.log(
    "A5_RECEIPT_WRITE_EVENT_PRESENT=NO",
  );
  console.log(
    "A5_CASE_VERIFIED_EVENT_PRESENT=NO",
  );
  console.log(
    "A5_BROWSER_REFRESH_SERVER_TRUTH=PASS",
  );

  console.log(
    "A6_A5_AUDIT_PENDING_BOUNDARY=PASS",
  );

  const closure =
    await closeLiveReceiptCore(
      {
        caseId:
          CASE_ID,

        expectedCaseVersion:
          13,
      },
      receiptClosureDependencies(
        context,
      ),
    );

  if (
    closure.state !==
      "VERIFIED" ||
    closure.verified !==
      true ||
    closure.auditBound !==
      true ||
    closure.receiptId ===
      null ||
    closure.snapshot.record.state !==
      "VERIFIED" ||
    closure.snapshot.record.version !==
      18
  ) {
    throw new Error(
      "A6 closure did not reach VERIFIED v18 after native audit and exact receipt readback.",
    );
  }

  const verifiedDurable =
    await readDurableChangeCaseDirect({
      baseUrl:
        HISTORY_BASE_URL,

      accessToken:
        session.accessToken,

      caseId:
        CASE_ID,
    });

  const verifiedEventTypes =
    verifiedDurable.events.map(
      (
        event,
      ) =>
        event.eventType,
    );

  const expectedVerifiedEvents = [
    "CASE_CREATED",
    "PREFLIGHT_COMPLETED",
    "REVIEW_ACCEPTED",
    "APPLY_REVALIDATION_MATCHED",
    "APPLY_ATTEMPT_STARTED",
    "APPLY_SUCCEEDED",
    "CONFIGURED_STATE_VERIFIED",
    "LIVE_STALE_OBSERVED",
    "OLD_WITNESS_CLOSED",
    "OLD_PID_GONE",
    "FRESH_WITNESS_BOUND",
    "LIVE_CONVERGED",
    "AUDIT_PENDING",
    "AUDIT_BOUND",
    "RECEIPT_WRITE_STARTED",
    "RECEIPT_PERSISTED",
    "RECEIPT_READBACK_VERIFIED",
    "CASE_VERIFIED",
  ];

  if (
    verifiedDurable.record.state !==
      "VERIFIED" ||
    verifiedDurable.record.version !==
      18 ||
    JSON.stringify(
      verifiedEventTypes,
    ) !==
    JSON.stringify(
      expectedVerifiedEvents,
    )
  ) {
    throw new Error(
      "A6 durable closure journal is not the exact 18-event verified chain.",
    );
  }

  const auditEvidence =
    objectValue(
      verifiedDurable.record.audit,
    );

  const receiptEvidence =
    objectValue(
      verifiedDurable.record.receipt,
    );

  if (
    auditEvidence.auditTransportVersion !==
      "health-v1" ||
    auditEvidence.eventSource !==
      "%System" ||
    auditEvidence.eventType !==
      "%Security" ||
    auditEvidence.event !==
      "UserChange" ||
    auditEvidence.username !==
      RUNTIME_USERNAME ||
    auditEvidence.targetUsername !==
      DEMO_FIXTURE_USERNAME ||
    auditEvidence.targetRole !==
      DEMO_FIXTURE_TARGET_ROLE ||
    auditEvidence.targetBound !==
      true ||
    auditEvidence.roleRemovalBound !==
      true ||
    auditEvidence.pidRebound !==
      true
  ) {
    throw new Error(
      "A6 durable native-audit binding lost its exact UserChange identity.",
    );
  }

  if (
    receiptEvidence.status !==
      "VERIFIED" ||
    typeof receiptEvidence.receiptId !==
      "string" ||
    receiptEvidence.receiptId !==
      closure.receiptId ||
    typeof receiptEvidence.receiptSha256 !==
      "string"
  ) {
    throw new Error(
      "A6 durable receipt evidence is not VERIFIED.",
    );
  }

  const persistedReceipt =
    await readReceiptHistoryDirect({
      baseUrl:
        HISTORY_BASE_URL,

      accessToken:
        session.accessToken,

      receiptId:
        closure.receiptId,
    });

  if (
    persistedReceipt.receiptId !==
      closure.receiptId ||
    persistedReceipt.receiptSha256 !==
      receiptEvidence.receiptSha256 ||
    persistedReceipt.username !==
      DEMO_FIXTURE_USERNAME ||
    persistedReceipt.role !==
      DEMO_FIXTURE_TARGET_ROLE ||
    persistedReceipt.operation !==
      "REMOVE" ||
    persistedReceipt.lifecycleState !==
      "VERIFIED" ||
    persistedReceipt.nativeAuditIndex !==
      auditEvidence.auditIndex
  ) {
    throw new Error(
      "A6 persisted receipt readback lost closure identity.",
    );
  }

  console.log(
    `A6_NATIVE_AUDIT_INDEX=${String(auditEvidence.auditIndex)}`,
  );
  console.log(
    `A6_NATIVE_AUDIT_PID=${String(auditEvidence.pid)}`,
  );
  console.log(
    "A6_NATIVE_AUDIT_SOURCE=%System",
  );
  console.log(
    "A6_NATIVE_AUDIT_TYPE=%Security",
  );
  console.log(
    "A6_NATIVE_AUDIT_EVENT=UserChange",
  );
  console.log(
    "A6_NATIVE_AUDIT_ACTOR=meridian.runtime",
  );
  console.log(
    "A6_NATIVE_AUDIT_TARGET=meridian.demo.witness",
  );
  console.log(
    "A6_NATIVE_AUDIT_ROLE=MeridianSupervisor",
  );
  console.log(
    "A6_NATIVE_AUDIT_PID_REBOUND=PASS",
  );
  console.log(
    "A6_AUDIT_BOUND=PASS",
  );
  console.log(
    `A6_RECEIPT_ID=${closure.receiptId}`,
  );
  console.log(
    `A6_RECEIPT_SHA256=${persistedReceipt.receiptSha256}`,
  );
  console.log(
    "A6_RECEIPT_PERSISTED=PASS",
  );
  console.log(
    "A6_RECEIPT_READBACK_EXACT=PASS",
  );
  console.log(
    "A6_DURABLE_FINAL_STATE=VERIFIED",
  );
  console.log(
    "A6_DURABLE_FINAL_VERSION=18",
  );
  console.log(
    "A6_CASE_VERIFIED_EVENT=PASS",
  );
  console.log(
    "A6_VERIFIED_ONLY_AFTER_AUDIT_AND_READBACK=PASS",
  );
  console.log(
    "A6_LIVE_RECEIPT_CLOSURE_CERTIFICATION=PASS",
  );

  await witness.exit();
  witnessExited =
    true;

  const rowsAfterWitnessExit =
    await readLiveWitnessProcessRows({
      pythonExecutable:
        PROCESS_QUERY_PYTHON,
      readerScriptPath:
        PROCESS_READER_SCRIPT,
      runtimePassword,
    });

  if (
    rowsAfterWitnessExit.length !==
      0
  ) {
    throw new Error(
      "A5 fresh witness process remained after normal controller exit.",
    );
  }

  console.log(
    "A5_FRESH_WITNESS_NORMAL_CLOSE=PASS",
  );
  console.log(
    "A5_ZERO_FIXTURE_PROCESSES_BEFORE_RESET=PASS",
  );
  console.log(
    "A5_LIVE_CONVERGENCE_CERTIFICATION=PASS",
  );
} finally {
  let cleanupFailure:
    Error |
    null =
      null;

  if (
    witness &&
    !witnessExited
  ) {
    try {
      await witness.exit();

      witnessExited =
        true;

      console.log(
        "A5_WITNESS_COMPENSATING_NORMAL_EXIT=PASS",
      );
    } catch (
      witnessCleanupError
    ) {
      cleanupFailure =
        witnessCleanupError instanceof Error
          ? witnessCleanupError
          : new Error(
              "Unknown A5 witness cleanup failure.",
            );

      console.log(
        `A5_WITNESS_CLEANUP_FAILURE=${cleanupFailure.message}`,
      );
    }
  }

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
        "A5_FIXTURE_RESET=PASS",
      );
    } catch (
      fixtureCleanupError
    ) {
      if (!cleanupFailure) {
        cleanupFailure =
          fixtureCleanupError instanceof Error
            ? fixtureCleanupError
            : new Error(
                "Unknown A5 fixture reset failure.",
              );
      }

      console.log(
        `A5_FIXTURE_RESET_FAILURE=${
          fixtureCleanupError instanceof Error
            ? fixtureCleanupError.message
            : "unknown"
        }`,
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
        "A5_LOGOUT_HTTP=200",
      );
    } catch (
      logoutError
    ) {
      if (!cleanupFailure) {
        cleanupFailure =
          logoutError instanceof Error
            ? logoutError
            : new Error(
                "Unknown A5 logout failure.",
              );
      }
    }
  }

  runtimePassword =
    "";

  console.log(
    "A5_RUNTIME_PASSWORD_STORED=NO",
  );
  console.log(
    "A5_FIXTURE_PASSWORD_PRINTED=NO",
  );
  console.log(
    "A5_JWT_STORED=NO",
  );

  if (cleanupFailure) {
    throw cleanupFailure;
  }
}

console.log(
  "A6_COMMAND_COMPLETE=YES",
);

console.log(
  "A5_COMMAND_COMPLETE=YES",
);
