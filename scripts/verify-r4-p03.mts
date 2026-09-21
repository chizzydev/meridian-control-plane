import {
  randomBytes,
  randomUUID,
} from "node:crypto";

import {
  existsSync,
} from "node:fs";

import {
  join,
} from "node:path";

import {
  setTimeout as delay,
} from "node:timers/promises";

import {
  DEMO_FIXTURE_DIRECT_ROLES_AFTER,
  DEMO_FIXTURE_DISPLAY_NAME,
  DEMO_FIXTURE_ID,
  DEMO_FIXTURE_NAMESPACE,
  DEMO_FIXTURE_TARGET_ROLE,
  DEMO_FIXTURE_TRANSPORT_ROLE,
  DEMO_FIXTURE_USERNAME,
  demoFixtureTransportRoleSpec,
  resetDemoFixture,
  type DemoFixtureAdapter,
  type DemoFixtureCredentialVault,
} from "../src/lib/change-case/demo-fixture";

import {
  actionReceiptV2FromGenericHistory,
  buildActionReceiptHistoryRecord,
} from "../src/lib/proof/action-history";

import {
  assertExactReceiptReadback,
} from "../src/lib/proof/receipt";

import {
  P03_USER_ADD_ROLE_DELTA_SUMMARY,
  assertP03PreApplyWitness,
  buildP03UserAddRoleProofResults,
  certifyP03UserAddRoleAction,
  p03PoststateMatches,
  p03PrestateMatches,
  p03UserAddRoleIntent,
  proveP03UserAddRoleLiveConvergence,
  type P03UserAddRolePreflight,
} from "../src/lib/actions/permissions/user-add-role";

import {
  P03_PREFLIGHT_ROLE_NAMES,
  P03_USER_SECURITY_PATH,
  putP03UserAddRole,
  readP03Role,
  readP03User,
} from "../src/lib/iris/user-add-role-action-transport";

import {
  createOfficialSysAdminDemoFixtureAdapter,
} from "../src/lib/iris/demo-fixture-sysadmin";

import {
  readLiveWitnessProcessRows,
  startLiveWitnessNativeSession,
  waitForOldWitnessPidGone,
  type LiveWitnessNativeSession,
} from "../src/lib/iris/live-witness-native";

import {
  persistActionReceiptHistory,
  readActionReceiptHistory,
  readTargetActionHistory,
} from "../src/lib/iris/action-history-server";

import {
  loginIris,
  logoutIris,
  readRuntimeInfo,
} from "../src/lib/iris/transport";

const API_BASE =
  process.env
    .MERIDIAN_IRIS_API_BASE_URL ??
  "http://localhost:52773/api/admin";

const HISTORY_BASE =
  process.env
    .MERIDIAN_IRIS_HISTORY_BASE_URL ??
  "http://localhost:52773/meridian-control-plane-history";

const HELPER_BASE =
  process.env
    .MERIDIAN_IRIS_HELPER_BASE_URL ??
  "http://localhost:52773/meridian-control-plane-internal";

const USERNAME =
  process.env
    .MERIDIAN_RUNTIME_USERNAME ??
  "meridian.runtime";

const PASSWORD =
  process.env
    .MERIDIAN_RUNTIME_PASSWORD;

const ACTION_ID =
  "p03-user-add-role-r4-c-001";

const RECEIPT_ID =
  "meridian-p03-user-add-role-r4-c-001";

const TARGET_CANONICAL_ID =
  `user:${DEMO_FIXTURE_USERNAME}`;

const repoRoot =
  process.cwd();

const pythonExecutable =
  process.env
    .MERIDIAN_IRISPYTHON_EXECUTABLE
    ?.trim() ||
  join(
    repoRoot,
    ".venv-iris",
    process.platform ===
      "win32"
      ? "Scripts/python.exe"
      : "bin/python",
  );

const workerScript =
  join(
    repoRoot,
    "scripts",
    "iris-live-witness-worker.py",
  );

const processReaderScript =
  join(
    repoRoot,
    "scripts",
    "iris-processquery-witness-reader.py",
  );

const PREDECESSORS =
  Object.freeze([
    Object.freeze({
      receiptId:
        "meridian-w01-web-app-create-r3b-a-r9-001",

      sha256:
        "693B47009BD1B74C3949FA896302AACBFB5DF3397AD9C2A7A46B425CEFC3246F",
    }),

    Object.freeze({
      receiptId:
        "meridian-w02-web-app-update-r3b-b-001",

      sha256:
        "DDCDFB0BE1057831040429FBA1EB069C2A352F787C5630ACF2D79C28E2BAE442",
    }),

    Object.freeze({
      receiptId:
        "meridian-w03-web-app-enable-recovery-r3b-c-r2a-001",

      sha256:
        "1C3334BBE2AA69ED2197CEF56949D60FA4C7C9402163E91FAFE1849F36C4F603",
    }),

    Object.freeze({
      receiptId:
        "meridian-w03-web-app-enable-authz-recovery-r3b-c-r2e-001",

      sha256:
        "6B263F425E2AC4F0A07CBAF0D0D6C5FEC2C5B92F6214E7A09C32768F7B350897",
    }),

    Object.freeze({
      receiptId:
        "meridian-w03-web-app-enable-r3b-c-r2f-001",

      sha256:
        "2CD0F67C55F868A4CAFE5312DEFB62BBDBC5A11967453AD994826C824110178D",
    }),

    Object.freeze({
      receiptId:
        "meridian-w04-web-app-delete-r3b-d-001",

      sha256:
        "52BE6B4105EE8D2CC660DBDCD749D87D829F416BBD8473CB0EF8A975557E58D8",
    }),

    Object.freeze({
      receiptId:
        "meridian-p01-role-create-r4-a-001",

      sha256:
        "0F3F8B06560A9F91B2C20A9EEB59D5D262FD9BEDE905CB04FDD79F441C94407B",
    }),

    Object.freeze({
      receiptId:
        "meridian-p02-role-delete-r4-b-001",

      sha256:
        "489001EDF5E18320520C208F4F90468ACD0290184FDFF7D1499C8876FB5DE229",
    }),
  ]);

interface JsonObject {
  readonly [key: string]:
    unknown;
}

interface AuditRow {
  readonly systemId:
    string;

  readonly auditIndex:
    number;

  readonly utcTimeStamp:
    string;

  readonly eventSource:
    string;

  readonly eventType:
    string;

  readonly event:
    string;

  readonly pid:
    number;

  readonly username:
    string;

  readonly description:
    string;

  readonly eventData:
    string;
}

interface P03AuditBinding {
  readonly systemId:
    string;

  readonly auditIndex:
    number;

  readonly utcTimeStamp:
    string;

  readonly pid:
    number;

  readonly roleAddBound:
    true;

  readonly pidRebound:
    true;
}

function requireP03AuditBinding(
  value:
    P03AuditBinding |
    null,
): P03AuditBinding {
  if (
    value ===
      null
  ) {
    throw new Error(
      "P03 certified audit binding is unexpectedly null.",
    );
  }

  return value;
}

function requireP03LiveProof(
  value:
    ReturnType<
      typeof proveP03UserAddRoleLiveConvergence
    > |
    null,
): ReturnType<
  typeof proveP03UserAddRoleLiveConvergence
> {
  if (
    value ===
      null
  ) {
    throw new Error(
      "P03 certified live convergence proof is unexpectedly null.",
    );
  }

  return value;
}

function objectValue(
  value:
    unknown,
  label:
    string,
): JsonObject {
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
      `${label} is not an object.`,
    );
  }

  return value as
    JsonObject;
}

function stringValue(
  value:
    unknown,
): string {
  return typeof value ===
    "string"
    ? value
    : "";
}

function integerValue(
  value:
    unknown,
  label:
    string,
): number {
  const parsed =
    typeof value ===
      "number"
      ? value
      : (
          typeof value ===
            "string" &&
          /^\d+$/.test(
            value,
          )
            ? Number(
                value,
              )
            : Number.NaN
        );

  if (
    !Number.isSafeInteger(
      parsed,
    )
  ) {
    throw new Error(
      `${label} is not an integer.`,
    );
  }

  return parsed;
}

function joinUrl(
  base:
    string,
  path:
    string,
): string {
  return (
    base.replace(
      /\/+$/,
      "",
    ) +
    path
  );
}

function irisUtcMillis(
  value:
    string,
): number {
  const normalized =
    value.includes(
      "T",
    )
      ? value
      : value.replace(
          " ",
          "T",
        ) +
        "Z";

  const parsed =
    Date.parse(
      normalized,
    );

  if (
    !Number.isFinite(
      parsed,
    )
  ) {
    throw new Error(
      `P03 audit UTC is invalid: ${value}`,
    );
  }

  return parsed;
}

function parseAuditRows(
  value:
    unknown,
  requestedPid?:
    number,
): readonly AuditRow[] {
  const root =
    objectValue(
      value,
      "P03 native audit response",
    );

  if (
    root.ok !==
      1 &&
    root.ok !==
      true
  ) {
    throw new Error(
      "P03 native audit helper response is not ok.",
    );
  }

  if (
    root.executeOK !==
      1 &&
    root.executeOK !==
      true
  ) {
    throw new Error(
      "P03 native audit query did not execute successfully.",
    );
  }

  if (
    root.auditTransportVersion !==
      "health-v1" ||
    root.eventSource !==
      "%System" ||
    root.eventType !==
      "%Security" ||
    root.event !==
      "UserChange" ||
    root.usernameFilter !==
      USERNAME
  ) {
    throw new Error(
      "P03 native audit helper contract drifted.",
    );
  }

  if (
    requestedPid !==
      undefined &&
    String(
      root.requestedAuditPid ??
        "",
    ) !==
      String(
        requestedPid,
      )
  ) {
    throw new Error(
      "P03 native audit PID-bound response did not echo the requested PID.",
    );
  }

  if (
    !Array.isArray(
      root.rows,
    )
  ) {
    throw new Error(
      "P03 native audit response rows are missing.",
    );
  }

  return Object.freeze(
    root.rows.map(
      (
        raw,
      ) => {
        const row =
          objectValue(
            raw,
            "P03 native audit row",
          );

        return Object.freeze({
          systemId:
            stringValue(
              row.systemID,
            ),

          auditIndex:
            integerValue(
              row.auditIndex,
              "P03 audit index",
            ),

          utcTimeStamp:
            stringValue(
              row.utcTimeStamp,
            ),

          eventSource:
            stringValue(
              row.eventSource,
            ),

          eventType:
            stringValue(
              row.eventType,
            ),

          event:
            stringValue(
              row.event,
            ),

          pid:
            integerValue(
              row.pid,
              "P03 audit PID",
            ),

          username:
            stringValue(
              row.username,
            ),

          description:
            stringValue(
              row.description,
            ),

          eventData:
            stringValue(
              row.eventData,
            ),
        });
      },
    ),
  );
}

function roleInCsv(
  csv:
    string,
  role:
    string,
): boolean {
  return csv
    .split(
      ",",
    )
    .map(
      (
        value,
      ) =>
        value.trim()
          .toLowerCase(),
    )
    .filter(Boolean)
    .includes(
      role.toLowerCase(),
    );
}

function auditMatchesAdd(
  row:
    AuditRow,
  applyStartedAtUtc:
    string,
): boolean {
  if (
    row.eventSource !==
      "%System" ||
    row.eventType !==
      "%Security" ||
    row.event !==
      "UserChange" ||
    row.username !==
      USERNAME ||
    row.pid <
      1 ||
    row.auditIndex <
      1 ||
    row.systemId.trim().length ===
      0
  ) {
    return false;
  }

  const applyStarted =
    Date.parse(
      applyStartedAtUtc,
    );

  if (
    !Number.isFinite(
      applyStarted,
    )
  ) {
    throw new Error(
      "P03 apply-start UTC is invalid.",
    );
  }

  if (
    irisUtcMillis(
      row.utcTimeStamp,
    ) <
      applyStarted -
        2_000
  ) {
    return false;
  }

  const escapedUsername =
    DEMO_FIXTURE_USERNAME.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

  const descriptionMatches =
    new RegExp(
      `^Modify User\\s+${escapedUsername}$`,
      "i",
    ).test(
      row.description.trim(),
    );

  const targetMatches =
    new RegExp(
      `Modify User:\\s*${escapedUsername}(?:\\r?\\n|$)`,
      "i",
    ).test(
      row.eventData,
    );

  const rolesModified =
    /Roles modified:/i.test(
      row.eventData,
    );

  const oldValueMatch =
    /Old value:\s*([^\r\n]*)/i.exec(
      row.eventData,
    );

  const newValueMatch =
    /New value:\s*([^\r\n]*)/i.exec(
      row.eventData,
    );

  return (
    descriptionMatches &&
    targetMatches &&
    rolesModified &&
    oldValueMatch !==
      null &&
    newValueMatch !==
      null &&
    !roleInCsv(
      oldValueMatch[1],
      DEMO_FIXTURE_TARGET_ROLE,
    ) &&
    roleInCsv(
      newValueMatch[1],
      DEMO_FIXTURE_TARGET_ROLE,
    )
  );
}

async function fetchAuditRows(
  accessToken:
    string,
  pid?:
    number,
): Promise<
  readonly AuditRow[]
> {
  const params =
    new URLSearchParams();

  params.set(
    "audit",
    "userchange",
  );

  if (
    pid !==
      undefined
  ) {
    params.set(
      "auditPid",
      String(
        pid,
      ),
    );
  }

  const response =
    await fetch(
      joinUrl(
        HELPER_BASE,
        "/health?" +
        params.toString(),
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
            `Bearer ${accessToken}`,
        },
      },
    );

  const text =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `P03 native audit helper failed HTTP ${response.status}.`,
    );
  }

  return parseAuditRows(
    JSON.parse(
      text,
    ) as unknown,
    pid,
  );
}

async function findP03RoleAddAudit(
  accessToken:
    string,
  applyStartedAtUtc:
    string,
): Promise<
  P03AuditBinding
> {
  for (
    let attempt =
      1;
    attempt <=
      20;
    attempt +=
      1
  ) {
    const rows =
      await fetchAuditRows(
        accessToken,
      );

    const matches =
      rows.filter(
        (
          row,
        ) =>
          auditMatchesAdd(
            row,
            applyStartedAtUtc,
          ),
      );

    if (
      matches.length >
        1
    ) {
      throw new Error(
        `P03 native audit binding is ambiguous: ${matches.length} matching UserChange rows.`,
      );
    }

    if (
      matches.length ===
        1
    ) {
      const match =
        matches[0];

      if (
        match ===
          undefined
      ) {
        throw new Error(
          "P03 native audit match disappeared.",
        );
      }

      const pidRows =
        await fetchAuditRows(
          accessToken,
          match.pid,
        );

      const rebound =
        pidRows.filter(
          (
            row,
          ) =>
            row.auditIndex ===
              match.auditIndex &&
            auditMatchesAdd(
              row,
              applyStartedAtUtc,
            ),
        );

      if (
        rebound.length !==
          1
      ) {
        throw new Error(
          "P03 native audit PID rebind did not return exactly the selected UserChange row.",
        );
      }

      console.log(
        `P03_NATIVE_AUDIT_POLL_ATTEMPT=${attempt}`,
      );

      return Object.freeze({
        systemId:
          match.systemId,

        auditIndex:
          match.auditIndex,

        utcTimeStamp:
          match.utcTimeStamp,

        pid:
          match.pid,

        roleAddBound:
          true as const,

        pidRebound:
          true as const,
      });
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

  throw new Error(
    "P03 native UserChange role-add audit binding did not appear.",
  );
}

async function createP03SetupUser(
  accessToken:
    string,
  password:
    string,
): Promise<void> {
  const response =
    await fetch(
      joinUrl(
        API_BASE,
        `/v2/security/user?name=${encodeURIComponent(DEMO_FIXTURE_USERNAME)}`,
      ),
      {
        method:
          "POST",

        cache:
          "no-store",

        headers: {
          Accept:
            "application/json",

          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            User: {
              FullName:
                DEMO_FIXTURE_DISPLAY_NAME,

              Enabled:
                true,

              AccountNeverExpires:
                true,

              PasswordNeverExpires:
                true,

              ChangePassword:
                false,

              NameSpace:
                DEMO_FIXTURE_NAMESPACE,

              Routine:
                "",

              Roles:
                [
                  ...DEMO_FIXTURE_DIRECT_ROLES_AFTER,
                ],

              EscalationRoles:
                [],

              Comment:
                "Meridian R4 P03 isolated role-add witness",
            },

            Password:
              password,
          }),
      },
    );

  await response.text();

  if (
    response.status !==
      201
  ) {
    throw new Error(
      `P03 fixture user setup failed HTTP ${response.status}.`,
    );
  }
}

async function readP03Preflight(
  accessToken:
    string,
  generation:
    string,
  credentialPresent:
    (
      generation:
        string,
    ) => boolean,
): Promise<
  P03UserAddRolePreflight
> {
  const user =
    await readP03User({
      apiBaseUrl:
        API_BASE,

      accessToken,
    });

  const roles =
    await Promise.all(
      P03_PREFLIGHT_ROLE_NAMES.map(
        async (
          name,
        ) =>
          Object.freeze({
            name,

            snapshot:
              await readP03Role({
                apiBaseUrl:
                  API_BASE,

                accessToken,

                name,
              }),
          }),
      ),
    );

  return Object.freeze({
    schemaVersion:
      "meridian.user-add-role-preflight.v1" as const,

    fixtureId:
      DEMO_FIXTURE_ID,

    expectedFixtureGeneration:
      generation,

    user,

    roles:
      Object.freeze(
        roles,
      ),

    credentialPresent:
      credentialPresent(
        generation,
      ),

    officialMutationOperation:
      "PUT /v2/security/user" as const,

    requiredAuthority:
      "%Admin_Secure:U" as const,

    authorityMode:
      "CURRENT_STANDING_RUNTIME_AUTHORITY" as const,
  });
}

if (
  typeof PASSWORD !==
    "string" ||
  PASSWORD.length ===
    0
) {
  throw new Error(
    "MERIDIAN_RUNTIME_PASSWORD is required for P03 live certification.",
  );
}

if (
  !existsSync(
    pythonExecutable,
  ) ||
  !existsSync(
    workerScript,
  ) ||
  !existsSync(
    processReaderScript,
  )
) {
  throw new Error(
    "P03 repo-local Native SDK witness prerequisites are missing.",
  );
}

console.log(
  "===== MERIDIAN R4-C P03 USER_ADD_ROLE LIVE CERTIFICATION =====",
);
console.log(
  "P03_TARGET=meridian.demo.witness",
);
console.log(
  "P03_ROLE=MeridianSupervisor",
);
console.log(
  "P03_OFFICIAL_MUTATION=PUT /v2/security/user",
);
console.log(
  "P03_FIXTURE_SETUP_MUTATIONS=ROLE_CREATE_PLUS_USER_CREATE",
);
console.log(
  "P03_BUSINESS_MUTATION_COUNT_ALLOWED=1",
);
console.log(
  "P03_FIXTURE_CLEANUP_AFTER_FULL_CERTIFICATION=YES",
);
console.log(
  "P03_FIXTURE_CLEANUP_AFTER_BUSINESS_DISPATCH_FAILURE=NO",
);
console.log(
  "P03_AUTOMATIC_RETRY_ALLOWED=NO",
);

let runtimePassword =
  PASSWORD;

let session:
  Awaited<
    ReturnType<
      typeof loginIris
    >
  > |
  null =
    null;

let adapter:
  DemoFixtureAdapter |
  null =
    null;

let witness:
  LiveWitnessNativeSession |
  null =
    null;

let witnessExited =
  false;

let setupRoleCreated =
  false;

let setupUserCreated =
  false;

let resetComplete =
  false;

let businessDispatchStarted =
  false;

let certificationFullyClosed =
  false;

let physicalBusinessPutCount =
  0;

let applyDispatchStartedAtUtc:
  string |
  null =
    null;

let generation =
  "";

let fixturePassword =
  "";

let audit:
  P03AuditBinding |
  null =
    null;

let liveProof:
  ReturnType<
    typeof proveP03UserAddRoleLiveConvergence
  > |
  null =
    null;

const vault:
  DemoFixtureCredentialVault = {
    store(
      input,
    ) {
      generation =
        input.generation;

      fixturePassword =
        input.password;
    },

    clear(
      fixtureId,
    ) {
      if (
        fixtureId ===
          DEMO_FIXTURE_ID
      ) {
        generation =
          "";

        fixturePassword =
          "";
      }
    },
  };

function credentialPresent(
  expectedGeneration:
    string,
): boolean {
  return (
    generation ===
      expectedGeneration &&
    generation.length >
      0 &&
    fixturePassword.length >
      0
  );
}

try {
  session =
    await loginIris({
      baseUrl:
        API_BASE,

      username:
        USERNAME,

      password:
        runtimePassword,
    });

  console.log(
    "P03_LOGIN_HTTP=200",
  );

  const runtime =
    await readRuntimeInfo({
      baseUrl:
        API_BASE,

      accessToken:
        session.accessToken,
    });

  if (
    runtime.username !==
      USERNAME ||
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
      "P03 pinned runtime identity/version guard failed.",
    );
  }

  console.log(
    "P03_RUNTIME_IDENTITY_VERSION=PASS",
  );

  const processRows =
    async () =>
      readLiveWitnessProcessRows({
        pythonExecutable,

        readerScriptPath:
          processReaderScript,

        runtimePassword,
      });

  adapter =
    createOfficialSysAdminDemoFixtureAdapter({
      baseUrl:
        API_BASE,

      accessToken:
        session.accessToken,

      listLiveProcesses:
        async (
          username,
        ) =>
          (
            await processRows()
          ).map(
            (
              row,
            ) => ({
              pid:
                row.pid,

              username:
                row.username,
            }),
          ).filter(
            (
              row,
            ) =>
              row.username
                .toLowerCase() ===
              username
                .toLowerCase(),
          ),
    });

  const prerequisites =
    await adapter
      .readPrerequisites();

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
      "P03 business prerequisite role/resource graph is not exact.",
    );
  }

  if (
    await adapter.readUser(
      DEMO_FIXTURE_USERNAME,
    )
  ) {
    throw new Error(
      "P03 requires the synthetic witness user absent before fixture setup.",
    );
  }

  if (
    await adapter.readRole(
      DEMO_FIXTURE_TRANSPORT_ROLE,
    )
  ) {
    throw new Error(
      "P03 requires the synthetic transport role absent before fixture setup.",
    );
  }

  if (
    (
      await processRows()
    ).length !==
      0
  ) {
    throw new Error(
      "P03 requires zero synthetic witness processes before fixture setup.",
    );
  }

  const targetHistoryBefore =
    await readTargetActionHistory({
      baseUrl:
        HISTORY_BASE,

      accessToken:
        session.accessToken,

      targetCanonicalId:
        TARGET_CANONICAL_ID,
    });

  if (
    targetHistoryBefore.length !==
      0
  ) {
    throw new Error(
      "P03 requires empty generic action history for the isolated witness target.",
    );
  }

  for (
    const predecessor
    of PREDECESSORS
  ) {
    const receipt =
      actionReceiptV2FromGenericHistory(
        await readActionReceiptHistory({
          baseUrl:
            HISTORY_BASE,

          accessToken:
            session.accessToken,

          receiptId:
            predecessor.receiptId,
        }),
      );

    if (
      receipt.receiptSha256 !==
        predecessor.sha256
    ) {
      throw new Error(
        `Historical predecessor changed before P03: ${predecessor.receiptId}.`,
      );
    }

    console.log(
      `P03_PREDECESSOR_RECEIPT_SHA256=${receipt.receiptId}|${receipt.receiptSha256}`,
    );
  }

  console.log(
    "P03_PRE_FIXTURE_CLEAN=PASS",
  );
  console.log(
    "P03_GENERIC_TARGET_HISTORY_PRESTATE_COUNT=0",
  );
  console.log(
    "P03_ALL_PREDECESSOR_RECEIPTS_PRECHECK=PASS",
  );

  generation =
    randomUUID();

  fixturePassword =
    `Aa1!${randomBytes(10).toString("hex")}`;

  vault.store({
    fixtureId:
      DEMO_FIXTURE_ID,

    generation,

    password:
      fixturePassword,
  });

  await adapter.createRole(
    demoFixtureTransportRoleSpec(),
  );

  setupRoleCreated =
    true;

  console.log(
    "P03_FIXTURE_SETUP_ROLE_CREATE=PASS",
  );

  await createP03SetupUser(
    session.accessToken,
    fixturePassword,
  );

  setupUserCreated =
    true;

  console.log(
    "P03_FIXTURE_SETUP_USER_CREATE=PASS",
  );

  console.log(
    "P03_FIXTURE_SETUP_BUSINESS_PUT_COUNT=0",
  );

  const initialPreflight =
    await readP03Preflight(
      session.accessToken,
      generation,
      credentialPresent,
    );

  if (
    !p03PrestateMatches(
      initialPreflight,
    )
  ) {
    throw new Error(
      "P03 fixture setup did not produce the exact pre-grant state.",
    );
  }

  console.log(
    `P03_FIXTURE_GENERATION=${generation}`,
  );
  console.log(
    "P03_EXACT_PRE_GRANT_CONFIG=PASS",
  );
  console.log(
    "P03_SYNTHETIC_CREDENTIAL_EXPOSED=NO",
  );

  witness =
    await startLiveWitnessNativeSession({
      pythonExecutable,

      workerScriptPath:
        workerScript,

      fixturePassword,

      expectedFixtureGeneration:
        generation,
    });

  const baselineRows =
    await processRows();

  assertP03PreApplyWitness({
    snapshot:
      witness.startup,

    processRows:
      baselineRows,
  });

  console.log(
    `P03_PRE_APPLY_SERVER_PID=${witness.startup.serverPid}`,
  );
  console.log(
    "P03_PRE_APPLY_GAINED_PERMISSIONS_DENIED=PASS",
  );
  console.log(
    "P03_PRE_APPLY_RETAINED_AND_TRANSPORT_ALLOWED=PASS",
  );

  const originalFetch =
    globalThis.fetch.bind(
      globalThis,
    );

  const mutationFetch:
    typeof fetch =
    async (
      input,
      init,
    ) => {
      const method =
        String(
          init?.method ??
          "GET",
        ).toUpperCase();

      const url =
        input.toString();

      const expectedUrl =
        API_BASE.replace(
          /\/+$/,
          "",
        ) +
        P03_USER_SECURITY_PATH;

      if (
        method ===
          "PUT" &&
        url ===
          expectedUrl
      ) {
        physicalBusinessPutCount +=
          1;

        businessDispatchStarted =
          true;

        if (
          physicalBusinessPutCount ===
            1
        ) {
          applyDispatchStartedAtUtc =
            new Date()
              .toISOString();
        }
      }

      return originalFetch(
        input,
        init,
      );
    };

  const intent =
    p03UserAddRoleIntent(
      generation,
    );

  const result =
    await certifyP03UserAddRoleAction(
      {
        intent,

        actionId:
          ACTION_ID,

        receiptId:
          RECEIPT_ID,

        logicalActor:
          "R4-C frozen isolated role-add invocation",

        irisRuntimeUser:
          USERNAME,
      },
      {
        contract: {
          readFreshPreflight:
            async () =>
              readP03Preflight(
                session!.accessToken,
                generation,
                credentialPresent,
              ),

          executeAdd:
            async () => {
              const mutation =
                await putP03UserAddRole({
                  apiBaseUrl:
                    API_BASE,

                  accessToken:
                    session!.accessToken,

                  fetchImpl:
                    mutationFetch,
                });

              console.log(
                `P03_PUT_RESPONSE_STATUS=${mutation.status}`,
              );
              console.log(
                `P03_MUTATION_REQUEST_COUNT=${mutation.mutationRequestCount}`,
              );
            },

          collectProofResults:
            async (
              execution,
            ) => {
              if (
                physicalBusinessPutCount !==
                  1 ||
                applyDispatchStartedAtUtc ===
                  null ||
                execution.configurationVerified !==
                  true
              ) {
                throw new Error(
                  "P03 execution did not prove exactly one physical business PUT.",
                );
              }

              const configured =
                await readP03Preflight(
                  session!.accessToken,
                  generation,
                  credentialPresent,
                );

              if (
                !p03PoststateMatches(
                  configured,
                )
              ) {
                throw new Error(
                  "P03 configured poststate is not exact.",
                );
              }

              const stale =
                await witness!
                  .observe();

              const oldPid =
                witness!.startup
                  .serverPid;

              await witness!
                .closeConnection();

              const gone =
                await waitForOldWitnessPidGone({
                  pythonExecutable,

                  readerScriptPath:
                    processReaderScript,

                  runtimePassword,

                  oldPid,
                });

              const fresh =
                await witness!
                  .reconnect();

              const freshRows =
                await processRows();

              liveProof =
                proveP03UserAddRoleLiveConvergence({
                  preApply:
                    witness!.startup,

                  stale,

                  fresh,

                  oldPidGone:
                    gone.userProcessCount ===
                      0,

                  freshProcessRows:
                    freshRows,
                });

              audit =
                await findP03RoleAddAudit(
                  session!.accessToken,
                  applyDispatchStartedAtUtc,
                );

              return buildP03UserAddRoleProofResults({
                observedAtUtc:
                  new Date()
                    .toISOString(),

                configurationVerified:
                  true,

                permissionEffectVerified:
                  true,

                liveRuntimeConverged:
                  liveProof.converged,

                nativeAuditBound:
                  audit.roleAddBound &&
                  audit.pidRebound,

                configurationSourceReference:
                  `IRIS SysAdmin user readback:${DEMO_FIXTURE_USERNAME}`,

                permissionSourceReference:
                  "IRIS configured role/resource graph:exact",

                liveRuntimeSourceReference:
                  `IRIS Native SDK witness:${liveProof.oldServerPid}->${liveProof.freshServerPid}`,

                nativeAuditSourceReference:
                  `IRIS UserChange:${audit.systemId}:${audit.auditIndex}:${audit.pid}`,
              });
            },
        },

        certification: {
          nowUtc:
            () =>
              new Date()
                .toISOString(),

          reviewPreflight:
            async (
              review,
            ) => {
              if (
                !p03PrestateMatches(
                  review.preflight,
                ) ||
                review.impact
                  .certainty !==
                  "KNOWN" ||
                review.expectedDelta
                  .summary !==
                  P03_USER_ADD_ROLE_DELTA_SUMMARY
              ) {
                throw new Error(
                  "Frozen P03 review packet does not satisfy the approved user-add-role contract.",
                );
              }

              console.log(
                `P03_REVIEWED_PREFLIGHT_DIGEST=${review.preflightDigest}`,
              );
              console.log(
                "P03_REVIEWED_DELTA=ADD_MERIDIANSUPERVISOR_ONLY",
              );
              console.log(
                "P03_IMPACT_CERTAINTY=KNOWN",
              );

              return review
                .preflightDigest;
            },

          receiptStore: {
            async persist(
              receipt,
            ) {
              const record =
                buildActionReceiptHistoryRecord(
                  receipt,
                );

              const persisted =
                await persistActionReceiptHistory({
                  baseUrl:
                    HISTORY_BASE,

                  accessToken:
                    session!.accessToken,

                  record,
                });

              if (
                persisted.status !==
                  "CREATED" ||
                persisted.record
                  .receiptId !==
                  receipt.receiptId ||
                persisted.record
                  .receiptSha256 !==
                  receipt.receiptSha256
              ) {
                throw new Error(
                  "P03 generic receipt write acknowledgement does not match the certified receipt.",
                );
              }
            },

            async read(
              receiptId,
            ) {
              return actionReceiptV2FromGenericHistory(
                await readActionReceiptHistory({
                  baseUrl:
                    HISTORY_BASE,

                  accessToken:
                    session!.accessToken,

                  receiptId,
                }),
              );
            },
          },
        },
      },
    );

  console.log(
    `P03_CERTIFICATION_OUTCOME=${result.outcome}`,
  );
  console.log(
    `P03_FINAL_ACTION_STATE=${result.record.state}`,
  );
  console.log(
    `P03_EVENT_COUNT=${result.events.length}`,
  );
  console.log(
    `P03_PROOF_RESULT_COUNT=${result.proofResults.length}`,
  );
  console.log(
    `P03_CERTIFICATION_REASON=${result.reason ?? "NONE"}`,
  );

  for (
    const event
    of result.events
  ) {
    console.log(
      "P03_EVENT_LEDGER=" +
      JSON.stringify({
        sequence:
          event.sequence,

        eventType:
          event.eventType,

        fromState:
          event.fromState,

        toState:
          event.toState,

        detail:
          event.detail,

        eventHash:
          event.eventHash,
      }),
    );
  }

  if (
    result.outcome !==
      "VERIFIED" ||
    result.record.state !==
      "VERIFIED" ||
    result.receipt ===
      null ||
    physicalBusinessPutCount !==
      1 ||
    audit ===
      null ||
    liveProof ===
      null
  ) {
    throw new Error(
      `P03 certification did not close VERIFIED. Reason=${result.reason ?? "none"}`,
    );
  }

  const certifiedAudit =
    requireP03AuditBinding(
      audit,
    );

  const certifiedLiveProof =
    requireP03LiveProof(
      liveProof,
    );

  const secondReadback =
    actionReceiptV2FromGenericHistory(
      await readActionReceiptHistory({
        baseUrl:
          HISTORY_BASE,

        accessToken:
          session.accessToken,

        receiptId:
          RECEIPT_ID,
      }),
    );

  assertExactReceiptReadback(
    result.receipt,
    secondReadback,
  );

  const targetHistoryAfter =
    await readTargetActionHistory({
      baseUrl:
        HISTORY_BASE,

      accessToken:
        session.accessToken,

      targetCanonicalId:
        TARGET_CANONICAL_ID,
    });

  if (
    targetHistoryAfter.length !==
      1 ||
    targetHistoryAfter[0]
      ?.receiptId !==
      RECEIPT_ID
  ) {
    throw new Error(
      "P03 generic target history does not contain exactly the P03 receipt.",
    );
  }

  for (
    const predecessor
    of PREDECESSORS
  ) {
    const receipt =
      actionReceiptV2FromGenericHistory(
        await readActionReceiptHistory({
          baseUrl:
            HISTORY_BASE,

          accessToken:
            session.accessToken,

          receiptId:
            predecessor.receiptId,
        }),
      );

    if (
      receipt.receiptSha256 !==
        predecessor.sha256
    ) {
      throw new Error(
        `Historical predecessor changed after P03: ${predecessor.receiptId}.`,
      );
    }
  }

  certificationFullyClosed =
    true;

  console.log(
    "P03_CONFIGURATION_READBACK=PASS",
  );
  console.log(
    "P03_PERMISSION_EFFECT=PASS",
  );
  console.log(
    "P03_STALE_SAME_CONNECTION_PROOF=PASS",
  );
  console.log(
    "P03_OLD_PID_GONE=PASS",
  );
  console.log(
    "P03_FRESH_RUNTIME_CONVERGENCE=PASS",
  );
  console.log(
    `P03_FRESH_SERVER_PID=${certifiedLiveProof.freshServerPid}`,
  );
  console.log(
    `P03_NATIVE_AUDIT_INDEX=${certifiedAudit.auditIndex}`,
  );
  console.log(
    `P03_NATIVE_AUDIT_PID=${certifiedAudit.pid}`,
  );
  console.log(
    "P03_NATIVE_AUDIT_BOUND=PASS",
  );
  console.log(
    `P03_RECEIPT_ID=${result.receipt.receiptId}`,
  );
  console.log(
    `P03_RECEIPT_SHA256=${result.receipt.receiptSha256}`,
  );
  console.log(
    "P03_GENERIC_RECEIPT_EXACT_READBACK=PASS",
  );
  console.log(
    "P03_GENERIC_RECEIPT_SECOND_FRESH_READBACK=PASS",
  );
  console.log(
    "P03_GENERIC_TARGET_HISTORY_POSTSTATE_COUNT=1",
  );
  console.log(
    "P03_ALL_PREDECESSOR_RECEIPTS_UNCHANGED=PASS",
  );
  console.log(
    "P03_ACTION_VERIFIED_AFTER_READBACK_ONLY=PASS",
  );
}
finally {
  let cleanupFailure:
    Error |
    null =
      null;

  if (
    witness !==
      null &&
    !witnessExited
  ) {
    try {
      await witness.exit();

      witnessExited =
        true;

      console.log(
        "P03_WITNESS_NORMAL_EXIT=PASS",
      );
    }
    catch (
      error
    ) {
      cleanupFailure =
        error instanceof Error
          ? error
          : new Error(
              "Unknown P03 witness cleanup failure.",
            );
    }
  }

  const cleanupAllowed =
    !businessDispatchStarted ||
    certificationFullyClosed;

  console.log(
    `P03_FIXTURE_CLEANUP_ALLOWED=${cleanupAllowed ? "YES" : "NO"}`,
  );

  if (
    adapter !==
      null &&
    (
      setupRoleCreated ||
      setupUserCreated
    ) &&
    !resetComplete &&
    cleanupAllowed
  ) {
    try {
      const rows =
        await readLiveWitnessProcessRows({
          pythonExecutable,

          readerScriptPath:
            processReaderScript,

          runtimePassword,
        });

      if (
        rows.length !==
          0
      ) {
        throw new Error(
          "P03 cleanup refused while a synthetic witness process remains.",
        );
      }

      await resetDemoFixture({
        adapter,

        vault,
      });

      resetComplete =
        true;

      if (
        await adapter.readUser(
          DEMO_FIXTURE_USERNAME,
        )
      ) {
        throw new Error(
          "P03 fixture user remained after reset.",
        );
      }

      if (
        await adapter.readRole(
          DEMO_FIXTURE_TRANSPORT_ROLE,
        )
      ) {
        throw new Error(
          "P03 fixture transport role remained after reset.",
        );
      }

      console.log(
        "P03_FIXTURE_RESET=PASS",
      );
      console.log(
        "P03_FIXTURE_USER_ABSENT_AFTER_RESET=PASS",
      );
      console.log(
        "P03_FIXTURE_TRANSPORT_ROLE_ABSENT_AFTER_RESET=PASS",
      );
    }
    catch (
      error
    ) {
      if (
        cleanupFailure ===
          null
      ) {
        cleanupFailure =
          error instanceof Error
            ? error
            : new Error(
                "Unknown P03 fixture cleanup failure.",
              );
      }
    }
  }

  if (
    businessDispatchStarted &&
    !certificationFullyClosed
  ) {
    console.log(
      "P03_POST_DISPATCH_FORENSIC_STATE_PRESERVED=YES",
    );
    console.log(
      "P03_AUTOMATIC_FIXTURE_RESET_AFTER_FAILED_DISPATCH=NO",
    );
  }

  generation =
    "";

  fixturePassword =
    "";

  if (
    session !==
      null
  ) {
    try {
      await logoutIris({
        baseUrl:
          API_BASE,

        accessToken:
          session.accessToken,
      });

      console.log(
        "P03_LOGOUT_HTTP=200",
      );
    }
    catch (
      error
    ) {
      if (
        cleanupFailure ===
          null
      ) {
        cleanupFailure =
          error instanceof Error
            ? error
            : new Error(
                "Unknown P03 logout failure.",
              );
      }
    }
  }

  runtimePassword =
    "";

  console.log(
    "P03_RUNTIME_PASSWORD_STORED=NO",
  );
  console.log(
    "P03_FIXTURE_PASSWORD_STORED=NO",
  );
  console.log(
    "P03_JWT_STORED=NO",
  );

  if (
    cleanupFailure !==
      null
  ) {
    throw cleanupFailure;
  }
}

if (
  !certificationFullyClosed ||
  !resetComplete
) {
  throw new Error(
    "P03 live certification did not reach verified receipt closure plus fixture reset.",
  );
}

console.log(
  "P03_LIVE_CERTIFICATION=PASS",
);
console.log(
  "P03_FIXTURE_LIFECYCLE_TRANSPARENT=PASS",
);
console.log(
  "P03_BUSINESS_PUT_COUNT=1",
);
console.log(
  "P03_COMMAND_COMPLETE=YES",
);
