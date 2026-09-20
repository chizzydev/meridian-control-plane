import {
  createHash,
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
  DEMO_FIXTURE_APPLY_PREFLIGHT_DIGEST_ALGORITHM,
  DEMO_FIXTURE_APPLY_PREFLIGHT_ROLE_NAMES,
  buildDemoFixtureApplyPreflightCanonical,
  type DemoFixtureApplyRoleSnapshot,
} from "../src/lib/change-case/demo-fixture-apply-preflight";

import {
  DEMO_FIXTURE_DISPLAY_NAME,
  DEMO_FIXTURE_ID,
  DEMO_FIXTURE_TARGET_ROLE,
  DEMO_FIXTURE_TRANSPORT_ROLE,
  DEMO_FIXTURE_USERNAME,
  assertExactDemoTransportRole,
  resetDemoFixture,
  seedDemoFixture,
  type DemoFixtureAdapter,
  type DemoFixtureCredentialVault,
  type DemoFixtureSecretFactory,
  type DemoFixtureUserSnapshot,
} from "../src/lib/change-case/demo-fixture";

import {
  assertDemoFixtureConfiguredAfter,
} from "../src/lib/change-case/demo-fixture-apply";

import type {
  VerifiedReceiptHistoryRecord,
} from "../src/lib/change-case/receipt-history";

import {
  deriveMayaV1ProofCompatibility,
} from "../src/lib/actions/security-role-remove/maya-compatibility";

import {
  buildUserRemoveRoleProofResults,
} from "../src/lib/actions/security-role-remove/evidence";

import {
  certifyUserRemoveRoleAction,
} from "../src/lib/actions/security-role-remove/certification";

import {
  assertUserRemoveRolePreApplyWitness,
  proveUserRemoveRoleLiveConvergence,
} from "../src/lib/actions/security-role-remove/live-evidence";

import {
  executeFixtureScopedRoleRemovalCore,
} from "../src/lib/iris/demo-fixture-apply-executor";

import {
  createOfficialSysAdminDemoFixtureAdapter,
} from "../src/lib/iris/demo-fixture-sysadmin";

import {
  findFixtureRoleRemovalAuditOnce,
} from "../src/lib/iris/native-userchange-audit";

import type {
  NativeUserChangeAuditBinding,
} from "../src/lib/change-case/live-receipt-closure";

import {
  readLiveWitnessProcessRows,
  startLiveWitnessNativeSession,
  waitForOldWitnessPidGone,
  type LiveWitnessNativeSession,
} from "../src/lib/iris/live-witness-native";

import {
  buildReceiptHistoryReadPlan,
  buildReceiptHistoryWritePlan,
  type ReceiptHistoryRequestPlan,
} from "../src/lib/iris/receipt-history-transport";

import {
  loginIris,
  logoutIris,
  readRuntimeInfo,
} from "../src/lib/iris/transport";

import {
  actionReceiptV2FromHistoryRecord,
  buildActionReceiptHistoryEnvelopeRecord,
} from "../src/lib/proof/receipt-history-envelope";

import {
  assertExactReceiptReadback,
  type ActionReceiptV2,
} from "../src/lib/proof/receipt";

const API_BASE_URL =
  "http://localhost:52773/api/admin";

const HISTORY_BASE_URL =
  "http://localhost:52773/meridian-control-plane-history";

const HELPER_BASE_URL =
  "http://localhost:52773/meridian-control-plane-internal";

const RUNTIME_USERNAME =
  "meridian.runtime";

const ACTION_ID_PREFIX =
  "r1e-b-user-remove-role-";

const RECEIPT_ID_PREFIX =
  "meridian-v2-user-remove-role-";

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

interface JsonObject {
  readonly [key: string]:
    unknown;
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

function sha256(
  value:
    string,
): string {
  return createHash(
    "sha256",
  )
    .update(
      value,
      "utf8",
    )
    .digest(
      "hex",
    )
    .toUpperCase();
}

function joinUrl(
  baseUrl:
    string,
  path:
    string,
): string {
  return (
    baseUrl.replace(
      /\/+$/,
      "",
    ) +
    path
  );
}

async function responseJson(
  response:
    Response,
  label:
    string,
): Promise<unknown> {
  const text =
    await response.text();

  if (
    !response.ok
  ) {
    let code =
      "UNKNOWN";

    try {
      const parsed =
        objectValue(
          JSON.parse(
            text,
          ) as unknown,
          label,
        );

      if (
        typeof parsed.code ===
          "string"
      ) {
        code =
          parsed.code;
      }
    } catch {
      // Keep safe generic code.
    }

    throw new Error(
      `${label}_HTTP_${response.status}_${code}`,
    );
  }

  if (
    text.trim().length ===
      0
  ) {
    throw new Error(
      `${label}_EMPTY`,
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

function resultObject(
  value:
    unknown,
): JsonObject {
  const outer =
    objectValue(
      value,
      "IRIS result",
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
      return object[
        key
      ];
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
          entry,
        ): entry is string =>
          typeof entry ===
            "string",
      )
      .map(
        (
          entry,
        ) =>
          entry.trim(),
      )
      .filter(Boolean);
  }

  if (
    typeof value ===
      "string"
  ) {
    return value
      .split(
        ",",
      )
      .map(
        (
          entry,
        ) =>
          entry.trim(),
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
    "R1E-B role-list representation is unsupported.",
  );
}

function roleResources(
  value:
    unknown,
): DemoFixtureApplyRoleSnapshot["resources"] {
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
      "R1E-B role resources are not an array.",
    );
  }

  return value.map(
    (
      entry,
    ) => {
      const object =
        objectValue(
          entry,
          "Role resource",
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
          "R1E-B role resource entry is incomplete.",
        );
      }

      return {
        resource,
        permission,
      };
    },
  );
}

async function readPreflightUser(
  accessToken:
    string,
): Promise<
  DemoFixtureUserSnapshot
> {
  const response =
    await fetch(
      joinUrl(
        API_BASE_URL,
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
            `Bearer ${accessToken}`,
        },
      },
    );

  const result =
    resultObject(
      await responseJson(
        response,
        "R1E_B_PREFLIGHT_USER",
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

async function readPreflightRole(
  accessToken:
    string,
  roleName:
    string,
): Promise<
  DemoFixtureApplyRoleSnapshot
> {
  const response =
    await fetch(
      joinUrl(
        API_BASE_URL,
        `/v2/security/role?name=${encodeURIComponent(roleName)}`,
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

  const result =
    resultObject(
      await responseJson(
        response,
        `R1E_B_PREFLIGHT_ROLE_${roleName}`,
      ),
    );

  return {
    name:
      roleName,

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

async function readReviewablePreflight(
  accessToken:
    string,
  generation:
    string,
) {
  const user =
    await readPreflightUser(
      accessToken,
    );

  const roles =
    await Promise.all(
      DEMO_FIXTURE_APPLY_PREFLIGHT_ROLE_NAMES.map(
        (
          roleName,
        ) =>
          readPreflightRole(
            accessToken,
            roleName,
          ),
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

  return Object.freeze({
    state:
      "PREFLIGHTED" as const,

    digestAlgorithm:
      DEMO_FIXTURE_APPLY_PREFLIGHT_DIGEST_ALGORITHM,

    digest:
      sha256(
        canonicalJson,
      ),

    canonical,

    canonicalJson,
  });
}

async function receiptHistoryRequest(
  accessToken:
    string,
  plan:
    ReceiptHistoryRequestPlan,
): Promise<unknown> {
  const headers =
    new Headers({
      Accept:
        "application/json",

      Authorization:
        `Bearer ${accessToken}`,
    });

  let body:
    string | undefined;

  if (
    plan.body !==
      undefined
  ) {
    headers.set(
      "Content-Type",
      "application/json",
    );

    body =
      JSON.stringify(
        plan.body,
      );
  }

  const response =
    await fetch(
      joinUrl(
        HISTORY_BASE_URL,
        plan.path,
      ),
      {
        method:
          plan.method,
        headers,
        body,
        cache:
          "no-store",
        redirect:
          "error",
      },
    );

  return responseJson(
    response,
    "R1E_B_RECEIPT_HISTORY",
  );
}

async function persistV2Receipt(
  accessToken:
    string,
  receipt:
    ActionReceiptV2,
  audit:
    NativeUserChangeAuditBinding,
): Promise<void> {
  const record =
    buildActionReceiptHistoryEnvelopeRecord({
      receipt,

      binding: {
        username:
          DEMO_FIXTURE_USERNAME,

        displayName:
          DEMO_FIXTURE_DISPLAY_NAME,

        operation:
          "REMOVE",

        role:
          DEMO_FIXTURE_TARGET_ROLE,

        applyPid:
          audit.pid,

        nativeAuditSystemId:
          audit.systemId,

        nativeAuditIndex:
          audit.auditIndex,

        nativeAuditUtc:
          audit.utcTimeStamp,

        nativeAuditEvent:
          audit.event,

        nativeAuditActor:
          audit.username,
      },
    });

  const raw =
    await receiptHistoryRequest(
      accessToken,
      buildReceiptHistoryWritePlan(
        record,
      ),
    );

  const object =
    objectValue(
      raw,
      "V2 receipt-history write response",
    );

  if (
    object.status !==
      "CREATED"
  ) {
    throw new Error(
      `R1E-B expected a new durable V2 receipt envelope, observed ${String(object.status)}.`,
    );
  }

  console.log(
    `R1E_B_HISTORY_ENVELOPE_SHA256=${record.receiptSha256}`,
  );
}

async function readV2Receipt(
  accessToken:
    string,
  receiptId:
    string,
): Promise<
  ActionReceiptV2
> {
  const raw =
    await receiptHistoryRequest(
      accessToken,
      buildReceiptHistoryReadPlan(
        receiptId,
      ),
    );

  const object =
    objectValue(
      raw,
      "V2 receipt-history read response",
    );

  const record =
    object.record as
      VerifiedReceiptHistoryRecord;

  return actionReceiptV2FromHistoryRecord(
    record,
  );
}

async function auditBinding(
  accessToken:
    string,
  applyStartedAtUtc:
    string,
): Promise<
  NativeUserChangeAuditBinding
> {
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
        accessToken,
        applyStartedAtUtc,
      });

    if (
      binding !==
        null
    ) {
      console.log(
        `R1E_B_NATIVE_AUDIT_POLL_ATTEMPT=${attempt}`,
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

  throw new Error(
    "R1E-B native UserChange audit binding did not appear.",
  );
}

if (
  !existsSync(
    pythonExecutable,
  )
) {
  throw new Error(
    `R1E-B repo-local IRIS Python executable is missing: ${pythonExecutable}`,
  );
}

const runId =
  (
    process.argv[2] ??
    ""
  ).trim();

if (
  !/^[A-Za-z0-9-]{8,80}$/.test(
    runId,
  )
) {
  throw new Error(
    "R1E-B verifier requires one opaque alphanumeric run id.",
  );
}

const actionId =
  ACTION_ID_PREFIX +
  runId;

const receiptId =
  RECEIPT_ID_PREFIX +
  runId;

const rawInput =
  await stdinText();

const parsedInput =
  objectValue(
    JSON.parse(
      rawInput,
    ) as unknown,
    "R1E-B input",
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
    "R1E-B runtime password is missing.",
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

const credentialVault:
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
            "R1E-B credential vault refused fixture identity.",
          );
        }

        storedCredential = {
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
          storedCredential =
            null;
        }
      },
  };

const secretFactory:
  DemoFixtureSecretFactory = {
    generation:
      randomUUID,

    password:
      () =>
        `Aa1!${randomBytes(10).toString("hex")}`,
  };

function credentialPresent(
  generation:
    string,
): boolean {
  return (
    storedCredential
      ?.generation ===
    generation
  );
}

function fixturePassword(
  generation:
    string,
): string {
  if (
    storedCredential
      ?.generation !==
        generation ||
    storedCredential.password
      .length ===
        0
  ) {
    throw new Error(
      "R1E-B fixture credential is unavailable for the requested generation.",
    );
  }

  return storedCredential.password;
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
  DemoFixtureAdapter |
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

let physicalPutCount =
  0;

let applyDispatchStartedAtUtc:
  string |
  null =
    null;

let audit:
  NativeUserChangeAuditBinding |
  null =
    null;

let liveProof:
  ReturnType<
    typeof proveUserRemoveRoleLiveConvergence
  > |
  null =
    null;

function requireAuditBinding(
  value:
    NativeUserChangeAuditBinding |
    null,
): NativeUserChangeAuditBinding {
  if (
    value ===
      null
  ) {
    throw new Error(
      "R1E-B native audit binding is unavailable after VERIFIED certification.",
    );
  }

  return value;
}

function requireLiveProof(
  value:
    ReturnType<
      typeof proveUserRemoveRoleLiveConvergence
    > |
    null,
): ReturnType<
  typeof proveUserRemoveRoleLiveConvergence
> {
  if (
    value ===
      null
  ) {
    throw new Error(
      "R1E-B live convergence proof is unavailable after VERIFIED certification.",
    );
  }

  return value;
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
    "R1E_B_LOGIN_HTTP=200",
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
    !runtime.serverVersion
      .includes(
        "2026.2",
      ) ||
    !runtime.serverVersion
      .includes(
        "Build 221U",
      )
  ) {
    throw new Error(
      "R1E-B pinned runtime identity/version guard failed.",
    );
  }

  console.log(
    "R1E_B_RUNTIME_IDENTITY_VERSION=PASS",
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
        API_BASE_URL,
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

  if (
    await adapter.readUser(
      DEMO_FIXTURE_USERNAME,
    )
  ) {
    throw new Error(
      "R1E-B requires the synthetic fixture user to be absent before seed.",
    );
  }

  if (
    (
      await processRows()
    ).length !==
      0
  ) {
    throw new Error(
      "R1E-B requires zero synthetic fixture processes before seed.",
    );
  }

  console.log(
    "R1E_B_PRE_FIXTURE_CLEAN=PASS",
  );

  const publicState =
    await seedDemoFixture({
      adapter,
      vault:
        credentialVault,
      secrets:
        secretFactory,
    });

  seeded =
    true;

  console.log(
    "R1E_B_FIXTURE_SEED=PASS",
  );
  console.log(
    "R1E_B_FIXTURE_GENERATION_BOUND=PASS",
  );
  console.log(
    "R1E_B_SYNTHETIC_CREDENTIAL_EXPOSED=NO",
  );

  const preApplyUser =
    await adapter.readUser(
      DEMO_FIXTURE_USERNAME,
    );

  if (
    preApplyUser ===
      null
  ) {
    throw new Error(
      "R1E-B seeded fixture user is missing.",
    );
  }

  const transportRole =
    await adapter.readRole(
      DEMO_FIXTURE_TRANSPORT_ROLE,
    );

  if (
    transportRole ===
      null
  ) {
    throw new Error(
      "R1E-B synthetic transport role is missing.",
    );
  }

  assertExactDemoTransportRole(
    transportRole,
  );

  witness =
    await startLiveWitnessNativeSession({
      pythonExecutable,
      workerScriptPath:
        workerScript,
      fixturePassword:
        fixturePassword(
          publicState.generation,
        ),
      expectedFixtureGeneration:
        publicState.generation,
    });

  const baselineRows =
    await processRows();

  assertUserRemoveRolePreApplyWitness({
    snapshot:
      witness.startup,
    processRows:
      baselineRows,
  });

  console.log(
    `R1E_B_PRE_APPLY_SERVER_PID=${witness.startup.serverPid}`,
  );
  console.log(
    "R1E_B_PRE_APPLY_LIVE_AUTHORITY=PASS",
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
        `${API_BASE_URL}/v2/security/user?name=${encodeURIComponent(DEMO_FIXTURE_USERNAME)}`;

      if (
        method ===
          "PUT" &&
        url ===
          expectedUrl
      ) {
        physicalPutCount +=
          1;

        if (
          physicalPutCount ===
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

  const result =
    await certifyUserRemoveRoleAction(
      {
        intent: {
          fixtureId:
            DEMO_FIXTURE_ID,
          username:
            DEMO_FIXTURE_USERNAME,
          operation:
            "REMOVE",
          role:
            DEMO_FIXTURE_TARGET_ROLE,
          expectedFixtureGeneration:
            publicState.generation,
        },

        actionId,

        receiptId,

        logicalActor:
          "r1e-b-certification-operator",

        irisRuntimeUser:
          RUNTIME_USERNAME,
      },
      {
        contract: {
          readFreshPreflight:
            async () =>
              readReviewablePreflight(
                session!.accessToken,
                publicState.generation,
              ),

          executeMutation:
            async () =>
              executeFixtureScopedRoleRemovalCore(
                {
                  apiBaseUrl:
                    API_BASE_URL,
                  accessToken:
                    session!.accessToken,
                  expectedFixtureGeneration:
                    publicState.generation,
                },
                {
                  credentialPresent,
                  fetchImpl:
                    mutationFetch,
                },
              ),

          readConfiguredUserForReconciliation:
            async () =>
              adapter!.readUser(
                DEMO_FIXTURE_USERNAME,
              ),

          fixtureGenerationCurrent:
            credentialPresent,

          collectProofResults:
            async (
              execution,
            ) => {
              if (
                physicalPutCount !==
                  1 ||
                applyDispatchStartedAtUtc ===
                  null ||
                execution.configurationVerified !==
                  true
              ) {
                throw new Error(
                  "R1E-B configured execution did not prove exactly one physical mutation.",
                );
              }

              const configuredUser =
                await adapter!.readUser(
                  DEMO_FIXTURE_USERNAME,
                );

              if (
                configuredUser ===
                  null
              ) {
                throw new Error(
                  "R1E-B configured post-state user is missing.",
                );
              }

              assertDemoFixtureConfiguredAfter(
                configuredUser,
              );

              const prerequisiteState =
                await adapter!
                  .readPrerequisites();

              if (
                prerequisiteState
                  .missingRoles
                  .length !==
                  0 ||
                prerequisiteState
                  .missingResources
                  .length !==
                  0
              ) {
                throw new Error(
                  "R1E-B configured role/resource graph drifted during role removal.",
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
                proveUserRemoveRoleLiveConvergence({
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
                await auditBinding(
                  session!.accessToken,
                  applyDispatchStartedAtUtc,
                );

              return buildUserRemoveRoleProofResults({
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
                  audit.roleRemovalBound &&
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
              input,
            ) => {
              console.log(
                `R1E_B_REVIEWED_PREFLIGHT_DIGEST=${input.preflightDigest}`,
              );

              return input
                .preflightDigest;
            },

          receiptStore: {
            persist:
              async (
                receipt,
              ) => {
                if (
                  audit ===
                    null
                ) {
                  throw new Error(
                    "R1E-B cannot persist Action Receipt V2 before native audit binding.",
                  );
                }

                await persistV2Receipt(
                  session!.accessToken,
                  receipt,
                  audit,
                );
              },

            read:
              async (
                id,
              ) =>
                readV2Receipt(
                  session!.accessToken,
                  id,
                ),
          },
        },
      },
    );

  if (
    result.outcome !==
      "VERIFIED" ||
    result.record.state !==
      "VERIFIED" ||
    result.receipt ===
      null ||
    physicalPutCount !==
      1 ||
    audit ===
      null ||
    liveProof ===
      null
  ) {
    throw new Error(
      `R1E-B generic live certification failed: ${result.outcome}; ${result.reason ?? "no reason"}.`,
    );
  }

  const certifiedAudit =
    requireAuditBinding(
      audit,
    );

  const certifiedLiveProof =
    requireLiveProof(
      liveProof,
    );

  const secondReadback =
    await readV2Receipt(
      session.accessToken,
      result.receipt.receiptId,
    );

  assertExactReceiptReadback(
    result.receipt,
    secondReadback,
  );

  const maya =
    deriveMayaV1ProofCompatibility();

  if (
    maya.historicalReceiptMutated !==
      false ||
    maya.convertedToV2 !==
      false
  ) {
    throw new Error(
      "R1E-B historical Maya receipt compatibility boundary drifted.",
    );
  }

  console.log(
    "R1E_B_GENERIC_V2_LIVE_CERTIFICATION=PASS",
  );
  console.log(
    "R1E_B_PHYSICAL_SYSADMIN_PUT_COUNT=1",
  );
  console.log(
    "R1E_B_STALE_SAME_CONNECTION_PROOF=PASS",
  );
  console.log(
    "R1E_B_OLD_PID_GONE=PASS",
  );
  console.log(
    "R1E_B_FRESH_RUNTIME_CONVERGENCE=PASS",
  );
  console.log(
    `R1E_B_FRESH_SERVER_PID=${certifiedLiveProof.freshServerPid}`,
  );
  console.log(
    `R1E_B_NATIVE_AUDIT_INDEX=${certifiedAudit.auditIndex}`,
  );
  console.log(
    `R1E_B_NATIVE_AUDIT_PID=${certifiedAudit.pid}`,
  );
  console.log(
    "R1E_B_NATIVE_AUDIT_BOUND=PASS",
  );
  console.log(
    `R1E_B_ACTION_ID=${result.record.actionId}`,
  );
  console.log(
    `R1E_B_V2_RECEIPT_ID=${result.receipt.receiptId}`,
  );
  console.log(
    `R1E_B_V2_RECEIPT_SHA256=${result.receipt.receiptSha256}`,
  );
  console.log(
    "R1E_B_V2_RECEIPT_PERSISTED_IN_IRIS=PASS",
  );
  console.log(
    "R1E_B_V2_RECEIPT_EXACT_READBACK=PASS",
  );
  console.log(
    "R1E_B_V2_RECEIPT_SECOND_FRESH_READBACK=PASS",
  );
  console.log(
    "R1E_B_ACTION_VERIFIED_AFTER_READBACK_ONLY=PASS",
  );
  console.log(
    `R1E_B_EVENT_COUNT=${result.events.length}`,
  );
  console.log(
    "R1E_B_AUTOMATIC_RETRY_AFTER_UNKNOWN=NO",
  );
  console.log(
    "R1E_B_MAYA_V1_RECEIPT_MUTATED=NO",
  );
  console.log(
    "R1E_B_MAYA_V1_CONVERTED_TO_V2=NO",
  );
  console.log(
    `R1E_B_MAYA_V1_RECEIPT_SHA256=${maya.legacyReceiptSha256}`,
  );
} finally {
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
        "R1E_B_WITNESS_NORMAL_EXIT=PASS",
      );
    } catch (
      error
    ) {
      cleanupFailure =
        error instanceof Error
          ? error
          : new Error(
              "Unknown R1E-B witness cleanup failure.",
            );
    }
  }

  if (
    adapter !==
      null &&
    seeded &&
    !resetComplete
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
          "R1E-B cannot reset while a fixture process remains.",
        );
      }

      await resetDemoFixture({
        adapter,
        vault:
          credentialVault,
      });

      resetComplete =
        true;

      if (
        await adapter.readUser(
          DEMO_FIXTURE_USERNAME,
        )
      ) {
        throw new Error(
          "R1E-B fixture user remained after reset.",
        );
      }

      console.log(
        "R1E_B_FIXTURE_RESET=PASS",
      );
    } catch (
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
                "Unknown R1E-B fixture cleanup failure.",
              );
      }
    }
  }

  storedCredential =
    null;

  if (
    session !==
      null
  ) {
    try {
      await logoutIris({
        baseUrl:
          API_BASE_URL,
        accessToken:
          session.accessToken,
      });

      console.log(
        "R1E_B_LOGOUT_HTTP=200",
      );
    } catch (
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
                "Unknown R1E-B logout failure.",
              );
      }
    }
  }

  runtimePassword =
    "";

  console.log(
    "R1E_B_RUNTIME_PASSWORD_STORED=NO",
  );
  console.log(
    "R1E_B_FIXTURE_PASSWORD_PRINTED=NO",
  );
  console.log(
    "R1E_B_JWT_STORED=NO",
  );

  if (
    cleanupFailure !==
      null
  ) {
    throw cleanupFailure;
  }
}

console.log(
  "R1E_B_COMMAND_COMPLETE=YES",
);
