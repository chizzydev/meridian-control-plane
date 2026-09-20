import {
  actionReceiptV2FromGenericHistory,
  buildActionReceiptHistoryRecord,
} from "../src/lib/proof/action-history";

import {
  certifyW03AuthzRecoveryAction,
  W03_AUTHZ_RECOVERY_INTENT,
} from "../src/lib/actions/web-app/enable-authz-recovery";

import {
  ORDERS_WEB_APP_NAME,
  ORDERS_WEB_APP_TARGET_CANONICAL_ID,
  W02_ORDERS_WEB_APP_EXPECTED,
  W03_ORDERS_WEB_APP_EXPECTED,
  ordersWebAppSnapshotMatches,
} from "../src/lib/actions/web-app/fixture";

import {
  readOrdersWebAppState,
  updateOrdersWebAppW02,
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
  "w03-web-app-enable-authz-recovery-r3b-c-r2e-001";

const RECEIPT_ID =
  "meridian-w03-web-app-enable-authz-recovery-r3b-c-r2e-001";

const W01_RECEIPT_ID =
  "meridian-w01-web-app-create-r3b-a-r9-001";

const W02_RECEIPT_ID =
  "meridian-w02-web-app-update-r3b-b-001";

const ORIGINAL_FAILED_W03_RECEIPT_ID =
  "meridian-w03-web-app-enable-r3b-c-001";

const PRIOR_RECOVERY_RECEIPT_ID =
  "meridian-w03-web-app-enable-recovery-r3b-c-r2a-001";

const CORRECTED_FAILED_W03_RECEIPT_ID =
  "meridian-w03-web-app-enable-r3b-c-r2b-001";

const W01_RECEIPT_SHA256 =
  "693B47009BD1B74C3949FA896302AACBFB5DF3397AD9C2A7A46B425CEFC3246F";

const W02_RECEIPT_SHA256 =
  "DDCDFB0BE1057831040429FBA1EB069C2A352F787C5630ACF2D79C28E2BAE442";

const PRIOR_RECOVERY_RECEIPT_SHA256 =
  "1C3334BBE2AA69ED2197CEF56949D60FA4C7C9402163E91FAFE1849F36C4F603";

if (
  typeof PASSWORD !==
    "string" ||
  PASSWORD.length ===
    0
) {
  throw new Error(
    "MERIDIAN_RUNTIME_PASSWORD is required for W03 authorization compensating recovery.",
  );
}

async function observeHealth(): Promise<
  Readonly<{
    url:
      string;
    status:
      number;
  }>
> {
  const url =
    WEB_BASE.replace(
      /\/+$/,
      "",
    ) +
    ORDERS_WEB_APP_NAME +
    "/health";

  const response =
    await fetch(
      url,
      {
        method:
          "GET",
        cache:
          "no-store",
        redirect:
          "manual",
        headers: {
          Accept:
            "application/json",
        },
      },
    );

  await response.arrayBuffer();

  return Object.freeze({
    url,
    status:
      response.status,
  });
}

console.log(
  "===== MERIDIAN R3B-C-R2E W03 AUTHORIZATION COMPENSATING RECOVERY =====",
);
console.log(
  "RECOVERY_OF_ACTION_ID=w03-web-app-enable-r3b-c-r2b-001",
);
console.log(
  "RECOVERY_DELTA=ENABLED_TRUE_TO_FALSE_AND_CSPZEN_TRUE_TO_FALSE",
);
console.log(
  "RECOVERY_RECURSE_PRESERVED=true",
);
console.log(
  "RECOVERY_MATCHROLES_CHANGE=NO",
);
console.log(
  "RECOVERY_W03_RETRY=NO",
);
console.log(
  "RECOVERY_OFFICIAL_MUTATION=PUT /v2/web-app",
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
      W03_ORDERS_WEB_APP_EXPECTED,
    ) ||
    before.routing ===
      null ||
    before.routing.recurse !==
      true ||
    before.routing.cspZenEnabled !==
      true
  ) {
    throw new Error(
      "Authorization recovery safety gate failed: live state is not exact applied-but-unverified corrected W03 state.",
    );
  }

  console.log(
    "W03_AUTHZ_RECOVERY_PRESTATE_EXACT=PASS",
  );

  const historyBefore =
    await readTargetActionHistory({
      baseUrl:
        HISTORY_BASE,

      accessToken:
        session.accessToken,

      targetCanonicalId:
        ORDERS_WEB_APP_TARGET_CANONICAL_ID,
    });

  const idsBefore =
    new Set(
      historyBefore.map(
        (
          record,
        ) =>
          record.receiptId,
      ),
    );

  if (
    historyBefore.length !==
      3 ||
    !idsBefore.has(
      W01_RECEIPT_ID,
    ) ||
    !idsBefore.has(
      W02_RECEIPT_ID,
    ) ||
    !idsBefore.has(
      PRIOR_RECOVERY_RECEIPT_ID,
    ) ||
    idsBefore.has(
      ORIGINAL_FAILED_W03_RECEIPT_ID,
    ) ||
    idsBefore.has(
      CORRECTED_FAILED_W03_RECEIPT_ID,
    ) ||
    idsBefore.has(
      RECEIPT_ID,
    )
  ) {
    throw new Error(
      "Authorization recovery requires exactly W01, W02, and the first verified recovery as durable predecessors, with both failed W03 receipts and the new recovery receipt absent.",
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

  const priorRecoveryBefore =
    actionReceiptV2FromGenericHistory(
      await readActionReceiptHistory({
        baseUrl:
          HISTORY_BASE,
        accessToken:
          session.accessToken,
        receiptId:
          PRIOR_RECOVERY_RECEIPT_ID,
      }),
    );

  if (
    w01Before.receiptSha256 !==
      W01_RECEIPT_SHA256 ||
    w02Before.receiptSha256 !==
      W02_RECEIPT_SHA256 ||
    priorRecoveryBefore.receiptSha256 !==
      PRIOR_RECOVERY_RECEIPT_SHA256 ||
    priorRecoveryBefore.actionType !==
      "WEB_APP_ENABLE_RECOVERY"
  ) {
    throw new Error(
      "Authorization recovery predecessor receipt material changed.",
    );
  }

  console.log(
    "W03_AUTHZ_RECOVERY_TARGET_HISTORY_PRESTATE_COUNT=3",
  );
  console.log(
    `W03_AUTHZ_RECOVERY_PRIOR_RECEIPT_SHA256=${priorRecoveryBefore.receiptSha256}`,
  );

  const result =
    await certifyW03AuthzRecoveryAction(
      {
        intent:
          W03_AUTHZ_RECOVERY_INTENT,

        actionId:
          ACTION_ID,

        receiptId:
          RECEIPT_ID,

        logicalActor:
          "R3B-C-R2E frozen authorization compensating recovery",

        irisRuntimeUser:
          USERNAME,
      },
      {
        contract: {
          async readConfiguredApp() {
            return (
              await readOrdersWebAppState({
                apiBaseUrl:
                  API_BASE,

                accessToken:
                  session.accessToken,
              })
            ).configuration;
          },

          async readRoutingState() {
            const state =
              await readOrdersWebAppState({
                apiBaseUrl:
                  API_BASE,

                accessToken:
                  session.accessToken,
              });

            if (
              state.routing ===
                null
            ) {
              throw new Error(
                "Authorization recovery routing state is absent.",
              );
            }

            return state.routing;
          },

          async executeRestore() {
            const mutation =
              await updateOrdersWebAppW02({
                apiBaseUrl:
                  API_BASE,

                accessToken:
                  session.accessToken,
              });

            console.log(
              `W03_AUTHZ_RECOVERY_PUT_RESPONSE_STATUS=${mutation.status}`,
            );

            console.log(
              `W03_AUTHZ_RECOVERY_MUTATION_REQUEST_COUNT=${mutation.mutationRequestCount}`,
            );
          },

          async observeDisabledHttp() {
            const observation =
              await observeHealth();

            console.log(
              `W03_AUTHZ_RECOVERY_HTTP_STATUS=${observation.status}`,
            );

            return observation;
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
            if (
              review.preflight
                .observed ===
                null ||
              review.preflight
                .observed.enabled !==
                true ||
              review.preflight
                .routing.recurse !==
                true ||
              review.preflight
                .routing.cspZenEnabled !==
                true ||
              review.expectedDelta
                .before.enabled !==
                true ||
              review.expectedDelta
                .after.enabled !==
                false ||
              review.expectedDelta
                .before.cspZenEnabled !==
                true ||
              review.expectedDelta
                .after.cspZenEnabled !==
                false ||
              review.impact
                .certainty !==
                "KNOWN"
            ) {
              throw new Error(
                "Frozen authorization-recovery review packet does not match the approved compensating delta.",
              );
            }

            console.log(
              `W03_AUTHZ_RECOVERY_REVIEWED_PREFLIGHT_DIGEST=${review.preflightDigest}`,
            );
            console.log(
              "W03_AUTHZ_RECOVERY_REVIEWED_DELTA=ENABLED_TRUE_TO_FALSE_AND_CSPZEN_TRUE_TO_FALSE",
            );
            console.log(
              "W03_AUTHZ_RECOVERY_IMPACT_CERTAINTY=KNOWN",
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
                  "Authorization recovery receipt acknowledgement differs from the frozen receipt.",
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
    `W03_AUTHZ_RECOVERY_CERTIFICATION_OUTCOME=${result.outcome}`,
  );
  console.log(
    `W03_AUTHZ_RECOVERY_FINAL_ACTION_STATE=${result.record.state}`,
  );
  console.log(
    `W03_AUTHZ_RECOVERY_EVENT_COUNT=${result.events.length}`,
  );
  console.log(
    `W03_AUTHZ_RECOVERY_PROOF_RESULT_COUNT=${result.proofResults.length}`,
  );
  console.log(
    `W03_AUTHZ_RECOVERY_REASON=${result.reason ?? "NONE"}`,
  );

  for (
    const event
    of result.events
  ) {
    console.log(
      "W03_AUTHZ_RECOVERY_EVENT_LEDGER=" +
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
      `W03 authorization compensating recovery did not close VERIFIED. Reason=${result.reason ?? "none"}`,
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
      W02_ORDERS_WEB_APP_EXPECTED,
    ) ||
    after.routing ===
      null ||
    after.routing.recurse !==
      true ||
    after.routing.cspZenEnabled !==
      false
  ) {
    throw new Error(
      "Authorization recovery poststate is not exact restored W02.",
    );
  }

  console.log(
    "W03_AUTHZ_RECOVERY_AUTHORITATIVE_W02_RESTORATION=PASS",
  );

  const historyAfter =
    await readTargetActionHistory({
      baseUrl:
        HISTORY_BASE,

      accessToken:
        session.accessToken,

      targetCanonicalId:
        ORDERS_WEB_APP_TARGET_CANONICAL_ID,
    });

  const idsAfter =
    new Set(
      historyAfter.map(
        (
          record,
        ) =>
          record.receiptId,
      ),
    );

  if (
    historyAfter.length !==
      4 ||
    !idsAfter.has(
      W01_RECEIPT_ID,
    ) ||
    !idsAfter.has(
      W02_RECEIPT_ID,
    ) ||
    !idsAfter.has(
      PRIOR_RECOVERY_RECEIPT_ID,
    ) ||
    !idsAfter.has(
      RECEIPT_ID,
    ) ||
    idsAfter.has(
      ORIGINAL_FAILED_W03_RECEIPT_ID,
    ) ||
    idsAfter.has(
      CORRECTED_FAILED_W03_RECEIPT_ID,
    )
  ) {
    throw new Error(
      "Authorization recovery history must contain W01, W02, prior recovery, and new recovery only.",
    );
  }

  const recoveryReceipt =
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
    recoveryReceipt.receiptId !==
      result.receipt.receiptId ||
    recoveryReceipt.receiptSha256 !==
      result.receipt.receiptSha256 ||
    recoveryReceipt.actionType !==
      "WEB_APP_ENABLE_RECOVERY"
  ) {
    throw new Error(
      "Authorization recovery exact receipt readback differs from certified receipt.",
    );
  }

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

  const priorRecoveryAfter =
    actionReceiptV2FromGenericHistory(
      await readActionReceiptHistory({
        baseUrl:
          HISTORY_BASE,
        accessToken:
          session.accessToken,
        receiptId:
          PRIOR_RECOVERY_RECEIPT_ID,
      }),
    );

  if (
    w01After.receiptSha256 !==
      W01_RECEIPT_SHA256 ||
    w02After.receiptSha256 !==
      W02_RECEIPT_SHA256 ||
    priorRecoveryAfter.receiptSha256 !==
      PRIOR_RECOVERY_RECEIPT_SHA256
  ) {
    throw new Error(
      "Authorization recovery append changed historical predecessor receipts.",
    );
  }

  console.log(
    `W03_AUTHZ_RECOVERY_RECEIPT_ID=${recoveryReceipt.receiptId}`,
  );
  console.log(
    `W03_AUTHZ_RECOVERY_RECEIPT_SHA256=${recoveryReceipt.receiptSha256}`,
  );
  console.log(
    "W03_AUTHZ_RECOVERY_GENERIC_RECEIPT_EXACT_READBACK=PASS",
  );
  console.log(
    "W03_AUTHZ_RECOVERY_HISTORICAL_RECEIPTS_UNCHANGED=PASS",
  );
  console.log(
    "R3B_C_R2E_AUTHORIZATION_COMPENSATING_RECOVERY=PASS",
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
