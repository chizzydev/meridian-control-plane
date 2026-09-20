import {
  actionReceiptV2FromGenericHistory,
  buildActionReceiptHistoryRecord,
} from "../src/lib/proof/action-history";

import {
  certifyW03WebAppEnableAction,
  W02_WEB_APP_MATCH_ROLES,
  W02_WEB_APP_ROUTING_STATE,
  W03_WEB_APP_ENABLE_INTENT,
  W03_WEB_APP_MATCH_ROLES,
  W03_WEB_APP_ROUTING_STATE,
} from "../src/lib/actions/web-app/enable";

import {
  ORDERS_WEB_APP_HELPER_EXECUTION_ROLE,
  ORDERS_WEB_APP_TARGET_CANONICAL_ID,
  W02_ORDERS_WEB_APP_EXPECTED,
  W03_ORDERS_WEB_APP_EXPECTED,
  ordersWebAppSnapshotMatches,
} from "../src/lib/actions/web-app/fixture";

import {
  enableOrdersWebAppW03,
  probeOrdersWebAppHealth,
  readOrdersWebAppState,
} from "../src/lib/iris/web-app-action-transport";

import {
  persistActionReceiptHistory,
  readActionReceiptHistory,
  readTargetActionHistory,
} from "../src/lib/iris/action-history-server";

import {
  loginIris,
  logoutIris,
} from "../src/lib/iris/transport";

const API_BASE =
  process.env
    .MERIDIAN_IRIS_API_BASE_URL ??
  "http://localhost:52773/api/admin";

const WEB_BASE =
  process.env
    .MERIDIAN_IRIS_WEB_BASE_URL ??
  "http://localhost:52773";

const HISTORY_BASE =
  process.env
    .MERIDIAN_IRIS_HISTORY_BASE_URL ??
  "http://localhost:52773/meridian-control-plane-history";

const USERNAME =
  process.env
    .MERIDIAN_RUNTIME_USERNAME ??
  "meridian.runtime";

const PASSWORD =
  process.env
    .MERIDIAN_RUNTIME_PASSWORD;

const ACTION_ID =
  "w03-web-app-enable-r3b-c-r2f-001";

const RECEIPT_ID =
  "meridian-w03-web-app-enable-r3b-c-r2f-001";

const W01_RECEIPT_ID =
  "meridian-w01-web-app-create-r3b-a-r9-001";

const W02_RECEIPT_ID =
  "meridian-w02-web-app-update-r3b-b-001";

const FAILED_W03_RECEIPT_ID =
  "meridian-w03-web-app-enable-r3b-c-001";

const RECOVERY_RECEIPT_ID =
  "meridian-w03-web-app-enable-recovery-r3b-c-r2a-001";

const FAILED_CORRECTED_W03_RECEIPT_ID =
  "meridian-w03-web-app-enable-r3b-c-r2b-001";

const AUTHZ_RECOVERY_RECEIPT_ID =
  "meridian-w03-web-app-enable-authz-recovery-r3b-c-r2e-001";

const W01_RECEIPT_SHA256 =
  "693B47009BD1B74C3949FA896302AACBFB5DF3397AD9C2A7A46B425CEFC3246F";

const W02_RECEIPT_SHA256 =
  "DDCDFB0BE1057831040429FBA1EB069C2A352F787C5630ACF2D79C28E2BAE442";

const RECOVERY_RECEIPT_SHA256 =
  "1C3334BBE2AA69ED2197CEF56949D60FA4C7C9402163E91FAFE1849F36C4F603";

const AUTHZ_RECOVERY_RECEIPT_SHA256 =
  "6B263F425E2AC4F0A07CBAF0D0D6C5FEC2C5B92F6214E7A09C32768F7B350897";

if (
  typeof PASSWORD !==
    "string" ||
  PASSWORD.length ===
    0
) {
  throw new Error(
    "MERIDIAN_RUNTIME_PASSWORD is required for final W03 live certification.",
  );
}

console.log(
  "===== MERIDIAN R3B-C-R2F FINAL W03 APP-SCOPED HELPER-ROLE CERTIFICATION =====",
);
console.log(
  "W03_TARGET=/meridian-lab/orders",
);
console.log(
  "W03_OFFICIAL_MUTATION=PUT /v2/web-app",
);
console.log(
  "W03_EXPECTED_DELTA=ENABLED_FALSE_TO_TRUE_CSPZEN_FALSE_TO_TRUE_MATCHROLES_EMPTY_TO_HELPER",
);
console.log(
  "W03_RECURSE_PRESERVED=true",
);
console.log(
  "W03_MATCHROLES_TARGET=MeridianControlPlaneHelperExecution",
);
console.log(
  "W03_GLOBAL_UNKNOWNUSER_ROLE_MUTATION=NO",
);
console.log(
  "W03_HTTP_BEHAVIOR_REQUIRED=YES",
);
console.log(
  "W03_PRIOR_FAILED_ATTEMPT_RECEIPT_PRESENT=NO",
);
console.log(
  "W03_RECOVERY_RECEIPT_REQUIRED=YES",
);
console.log(
  "W03_AUTHZ_RECOVERY_RECEIPT_REQUIRED=YES",
);
console.log(
  "W03_AUTOMATIC_RETRY_ALLOWED=NO",
);

const session =
  await loginIris({
    baseUrl:
      API_BASE,

    username:
      USERNAME,

    password:
      PASSWORD,
  });

try {
  const before =
    await readOrdersWebAppState({
      apiBaseUrl:
        API_BASE,

      accessToken:
        session.accessToken,
    });

  if (
    before.configuration ===
      null ||
    !ordersWebAppSnapshotMatches(
      before.configuration,
      W02_ORDERS_WEB_APP_EXPECTED,
    ) ||
    before.routing ===
      null ||
    before.routing.recurse !==
      W02_WEB_APP_ROUTING_STATE.recurse ||
    before.routing.cspZenEnabled !==
      W02_WEB_APP_ROUTING_STATE.cspZenEnabled ||
    before.matchRoles ===
      null ||
    before.matchRoles.length !==
      W02_WEB_APP_MATCH_ROLES.length
  ) {
    throw new Error(
      "Final W03 safety gate failed: authoritative prestate is not exact restored W02 with Recurse=true, CSPZENEnabled=false, and empty MatchRoles.",
    );
  }

  console.log(
    "W03_AUTHORITATIVE_PRESTATE_W02_EXACT=PASS",
  );
  console.log(
    "W03_PRESTATE_ENABLED=false",
  );
  console.log(
    "W03_PRESTATE_RECURSE=true",
  );
  console.log(
    "W03_PRESTATE_CSPZEN=false",
  );
  console.log(
    "W03_PRESTATE_MATCHROLES=EMPTY",
  );

  const targetHistoryBefore =
    await readTargetActionHistory({
      baseUrl:
        HISTORY_BASE,

      accessToken:
        session.accessToken,

      targetCanonicalId:
        ORDERS_WEB_APP_TARGET_CANONICAL_ID,
    });

  const predecessorIds =
    new Set(
      targetHistoryBefore.map(
        (
          record,
        ) =>
          record.receiptId,
      ),
    );

  if (
    targetHistoryBefore.length !==
      4 ||
    !predecessorIds.has(
      W01_RECEIPT_ID,
    ) ||
    !predecessorIds.has(
      W02_RECEIPT_ID,
    ) ||
    !predecessorIds.has(
      RECOVERY_RECEIPT_ID,
    ) ||
    !predecessorIds.has(
      AUTHZ_RECOVERY_RECEIPT_ID,
    ) ||
    predecessorIds.has(
      FAILED_W03_RECEIPT_ID,
    ) ||
    predecessorIds.has(
      FAILED_CORRECTED_W03_RECEIPT_ID,
    ) ||
    predecessorIds.has(
      RECEIPT_ID,
    )
  ) {
    throw new Error(
      "Final W03 requires exactly W01, W02, first recovery, and authorization recovery as durable predecessors, with both failed W03 receipts absent.",
    );
  }

  const w01Before =
    actionReceiptV2FromGenericHistory(
      await readActionReceiptHistory({
        baseUrl:
          HISTORY_BASE,
        accessToken:
          session.accessToken,
        receiptId:
          W01_RECEIPT_ID,
      }),
    );

  const w02Before =
    actionReceiptV2FromGenericHistory(
      await readActionReceiptHistory({
        baseUrl:
          HISTORY_BASE,
        accessToken:
          session.accessToken,
        receiptId:
          W02_RECEIPT_ID,
      }),
    );

  const recoveryBefore =
    actionReceiptV2FromGenericHistory(
      await readActionReceiptHistory({
        baseUrl:
          HISTORY_BASE,
        accessToken:
          session.accessToken,
        receiptId:
          RECOVERY_RECEIPT_ID,
      }),
    );

  const authzRecoveryBefore =
    actionReceiptV2FromGenericHistory(
      await readActionReceiptHistory({
        baseUrl:
          HISTORY_BASE,
        accessToken:
          session.accessToken,
        receiptId:
          AUTHZ_RECOVERY_RECEIPT_ID,
      }),
    );

  if (
    w01Before.receiptSha256 !==
      W01_RECEIPT_SHA256 ||
    w02Before.receiptSha256 !==
      W02_RECEIPT_SHA256 ||
    recoveryBefore.receiptSha256 !==
      RECOVERY_RECEIPT_SHA256 ||
    recoveryBefore.actionType !==
      "WEB_APP_ENABLE_RECOVERY" ||
    authzRecoveryBefore.receiptSha256 !==
      AUTHZ_RECOVERY_RECEIPT_SHA256 ||
    authzRecoveryBefore.actionType !==
      "WEB_APP_ENABLE_RECOVERY"
  ) {
    throw new Error(
      "Final W03 durable predecessor receipt material changed before dispatch.",
    );
  }

  console.log(
    "W03_TARGET_HISTORY_PRESTATE_COUNT=4",
  );
  console.log(
    `W03_W01_RECEIPT_SHA256_BEFORE=${w01Before.receiptSha256}`,
  );
  console.log(
    `W03_W02_RECEIPT_SHA256_BEFORE=${w02Before.receiptSha256}`,
  );
  console.log(
    `W03_RECOVERY_RECEIPT_SHA256_BEFORE=${recoveryBefore.receiptSha256}`,
  );
  console.log(
    `W03_AUTHZ_RECOVERY_RECEIPT_SHA256_BEFORE=${authzRecoveryBefore.receiptSha256}`,
  );

  const result =
    await certifyW03WebAppEnableAction(
      {
        intent:
          W03_WEB_APP_ENABLE_INTENT,

        actionId:
          ACTION_ID,

        receiptId:
          RECEIPT_ID,

        logicalActor:
          "R3B-C-R2B final W03 operator invocation",

        irisRuntimeUser:
          USERNAME,
      },
      {
        contract: {
          async readState() {
            return readOrdersWebAppState({
              apiBaseUrl:
                API_BASE,

              accessToken:
                session.accessToken,
            });
          },

          async executeEnable() {
            const mutation =
              await enableOrdersWebAppW03({
                apiBaseUrl:
                  API_BASE,

                accessToken:
                  session.accessToken,
              });

            console.log(
              `W03_PUT_RESPONSE_STATUS=${mutation.status}`,
            );

            console.log(
              `W03_MUTATION_REQUEST_COUNT=${mutation.mutationRequestCount}`,
            );
          },

          async probeHealth() {
            const health =
              await probeOrdersWebAppHealth({
                webBaseUrl:
                  WEB_BASE,
              });

            console.log(
              `W03_HTTP_STATUS=${health.status}`,
            );

            console.log(
              "W03_HTTP_BODY=" +
              JSON.stringify(
                health.body,
              ),
            );

            return health;
          },
        },

        certification: {
          nowUtc() {
            return new Date()
              .toISOString();
          },

          async reviewPreflight(
            review,
          ) {
            const reviewedBeforeMatchRoles =
              review.expectedDelta
                .before.matchRoles;

            const reviewedAfterMatchRoles =
              review.expectedDelta
                .after.matchRoles;

            if (
              review.preflight
                .observed ===
                null ||
              !ordersWebAppSnapshotMatches(
                review.preflight.observed,
                W02_ORDERS_WEB_APP_EXPECTED,
              ) ||
              review.preflight
                .routing ===
                null ||
              review.preflight
                .routing.recurse !==
                true ||
              review.preflight
                .routing.cspZenEnabled !==
                false ||
              review.preflight
                .matchRoles ===
                null ||
              review.preflight
                .matchRoles.length !==
                0 ||
              review.expectedDelta
                .before.enabled !==
                false ||
              review.expectedDelta
                .after.enabled !==
                true ||
              review.expectedDelta
                .before.recurse !==
                true ||
              review.expectedDelta
                .after.recurse !==
                true ||
              review.expectedDelta
                .before.cspZenEnabled !==
                false ||
              review.expectedDelta
                .after.cspZenEnabled !==
                true ||
              !Array.isArray(
                reviewedBeforeMatchRoles,
              ) ||
              reviewedBeforeMatchRoles.length !==
                0 ||
              !Array.isArray(
                reviewedAfterMatchRoles,
              ) ||
              reviewedAfterMatchRoles.length !==
                1 ||
              reviewedAfterMatchRoles[0] !==
                ORDERS_WEB_APP_HELPER_EXECUTION_ROLE ||
              review.expectedDelta
                .before.description !==
                review.expectedDelta
                  .after.description ||
              review.impact
                .certainty !==
                "KNOWN"
            ) {
              throw new Error(
                "Final W03 review packet does not satisfy the approved routing/exposure/MatchRoles contract.",
              );
            }

            console.log(
              `W03_REVIEWED_PREFLIGHT_DIGEST=${review.preflightDigest}`,
            );
            console.log(
              "W03_REVIEWED_DELTA=ENABLED_FALSE_TO_TRUE_CSPZEN_FALSE_TO_TRUE_MATCHROLES_EMPTY_TO_HELPER",
            );
            console.log(
              "W03_IMPACT_CERTAINTY=KNOWN",
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
                    session.accessToken,

                  record,
                });

              if (
                persisted.record
                  .receiptId !==
                  receipt.receiptId ||
                persisted.record
                  .receiptSha256 !==
                  receipt.receiptSha256
              ) {
                throw new Error(
                  "Generic receipt write acknowledgement does not match W03 receipt identity.",
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
                    session.accessToken,

                  receiptId,
                }),
              );
            },
          },
        },
      },
    );

  console.log(
    `W03_CERTIFICATION_OUTCOME=${result.outcome}`,
  );
  console.log(
    `W03_FINAL_ACTION_STATE=${result.record.state}`,
  );
  console.log(
    `W03_EVENT_COUNT=${result.events.length}`,
  );
  console.log(
    `W03_PROOF_RESULT_COUNT=${result.proofResults.length}`,
  );
  console.log(
    `W03_CERTIFICATION_REASON=${result.reason ?? "NONE"}`,
  );

  for (
    const event
    of result.events
  ) {
    console.log(
      "W03_EVENT_LEDGER=" +
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
      null
  ) {
    throw new Error(
      `W03 certification did not close VERIFIED. Reason=${result.reason ?? "none"}`,
    );
  }

  const after =
    await readOrdersWebAppState({
      apiBaseUrl:
        API_BASE,

      accessToken:
        session.accessToken,
    });

  if (
    after.configuration ===
      null ||
    !ordersWebAppSnapshotMatches(
      after.configuration,
      W03_ORDERS_WEB_APP_EXPECTED,
    ) ||
    after.routing ===
      null ||
    after.routing.recurse !==
      W03_WEB_APP_ROUTING_STATE.recurse ||
    after.routing.cspZenEnabled !==
      W03_WEB_APP_ROUTING_STATE.cspZenEnabled ||
    after.matchRoles ===
      null ||
    after.matchRoles.length !==
      W03_WEB_APP_MATCH_ROLES.length ||
    after.matchRoles[0]?.matchRole !==
      "" ||
    after.matchRoles[0]?.targetRoles.length !==
      1 ||
    after.matchRoles[0]?.targetRoles[0] !==
      ORDERS_WEB_APP_HELPER_EXECUTION_ROLE
  ) {
    throw new Error(
      "Final W03 authoritative poststate is not Enabled=true, Recurse=true, CSPZENEnabled=true with only the app-scoped helper-role binding.",
    );
  }

  console.log(
    "W03_AUTHORITATIVE_POSTSTATE=PASS",
  );
  console.log(
    "W03_POSTSTATE_ENABLED=true",
  );
  console.log(
    "W03_POSTSTATE_RECURSE=true",
  );
  console.log(
    "W03_POSTSTATE_CSPZEN=true",
  );
  console.log(
    "W03_POSTSTATE_MATCHROLES=:MeridianControlPlaneHelperExecution",
  );

  const healthAfter =
    await probeOrdersWebAppHealth({
      webBaseUrl:
        WEB_BASE,
    });

  if (
    healthAfter.status !==
      200 ||
    healthAfter.body.ok !==
      1 ||
    healthAfter.body.fixtureId !==
      "meridian-lab-orders" ||
    healthAfter.body.generation !==
      "r3b-web-app-v1" ||
    healthAfter.body.service !==
      "orders" ||
    healthAfter.body.state !==
      "READY"
  ) {
    throw new Error(
      "W03 independent post-certification HTTP behavior recheck failed.",
    );
  }

  console.log(
    "W03_HTTP_BEHAVIOR_POSTSTATE=PASS",
  );

  const targetHistoryAfter =
    await readTargetActionHistory({
      baseUrl:
        HISTORY_BASE,

      accessToken:
        session.accessToken,

      targetCanonicalId:
        ORDERS_WEB_APP_TARGET_CANONICAL_ID,
    });

  const ids =
    new Set(
      targetHistoryAfter.map(
        (
          record,
        ) =>
          record.receiptId,
      ),
    );

  if (
    targetHistoryAfter.length !==
      5 ||
    !ids.has(
      W01_RECEIPT_ID,
    ) ||
    !ids.has(
      W02_RECEIPT_ID,
    ) ||
    !ids.has(
      RECOVERY_RECEIPT_ID,
    ) ||
    !ids.has(
      AUTHZ_RECOVERY_RECEIPT_ID,
    ) ||
    !ids.has(
      RECEIPT_ID,
    ) ||
    ids.has(
      FAILED_W03_RECEIPT_ID,
    ) ||
    ids.has(
      FAILED_CORRECTED_W03_RECEIPT_ID,
    )
  ) {
    throw new Error(
      "Final W03 target history must contain exactly W01, W02, both verified recoveries, and final W03; both failed W03 attempts must remain unreceipted.",
    );
  }

  console.log(
    "W03_TARGET_HISTORY_POSTSTATE_COUNT=5",
  );
  console.log(
    "W03_FAILED_ATTEMPT_RECEIPTS_ABSENT=PASS",
  );

  const w03Receipt =
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

  if (
    w03Receipt.receiptId !==
      result.receipt.receiptId ||
    w03Receipt.receiptSha256 !==
      result.receipt.receiptSha256 ||
    w03Receipt.actionType !==
      "WEB_APP_ENABLE"
  ) {
    throw new Error(
      "W03 exact persistent receipt readback differs from the certified in-memory receipt.",
    );
  }

  console.log(
    `W03_RECEIPT_ID=${w03Receipt.receiptId}`,
  );
  console.log(
    `W03_RECEIPT_SHA256=${w03Receipt.receiptSha256}`,
  );
  console.log(
    "W03_GENERIC_RECEIPT_EXACT_READBACK=PASS",
  );

  const w01After =
    actionReceiptV2FromGenericHistory(
      await readActionReceiptHistory({
        baseUrl:
          HISTORY_BASE,
        accessToken:
          session.accessToken,
        receiptId:
          W01_RECEIPT_ID,
      }),
    );

  const w02After =
    actionReceiptV2FromGenericHistory(
      await readActionReceiptHistory({
        baseUrl:
          HISTORY_BASE,
        accessToken:
          session.accessToken,
        receiptId:
          W02_RECEIPT_ID,
      }),
    );

  const recoveryAfter =
    actionReceiptV2FromGenericHistory(
      await readActionReceiptHistory({
        baseUrl:
          HISTORY_BASE,
        accessToken:
          session.accessToken,
        receiptId:
          RECOVERY_RECEIPT_ID,
      }),
    );

  const authzRecoveryAfter =
    actionReceiptV2FromGenericHistory(
      await readActionReceiptHistory({
        baseUrl:
          HISTORY_BASE,
        accessToken:
          session.accessToken,
        receiptId:
          AUTHZ_RECOVERY_RECEIPT_ID,
      }),
    );

  if (
    w01After.receiptSha256 !==
      W01_RECEIPT_SHA256 ||
    w02After.receiptSha256 !==
      W02_RECEIPT_SHA256 ||
    recoveryAfter.receiptSha256 !==
      RECOVERY_RECEIPT_SHA256 ||
    authzRecoveryAfter.receiptSha256 !==
      AUTHZ_RECOVERY_RECEIPT_SHA256
  ) {
    throw new Error(
      "Final W03 append changed historical W01/W02/recovery receipt material.",
    );
  }

  console.log(
    "W03_W01_W02_BOTH_RECOVERY_HISTORICAL_RECEIPTS_UNCHANGED=PASS",
  );
  console.log(
    "R3B_C_R2F_FINAL_W03_LIVE_CERTIFICATION=PASS",
  );
}
finally {
  await logoutIris({
    baseUrl:
      API_BASE,

    accessToken:
      session.accessToken,
  });
}
