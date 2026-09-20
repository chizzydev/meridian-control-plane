import {
  actionReceiptV2FromGenericHistory,
  buildActionReceiptHistoryRecord,
} from "../src/lib/proof/action-history";

import {
  certifyW02WebAppUpdateAction,
  W02_WEB_APP_UPDATE_INTENT,
} from "../src/lib/actions/web-app/update";

import {
  ORDERS_WEB_APP_DESCRIPTION_CREATE,
  ORDERS_WEB_APP_DESCRIPTION_UPDATE,
  ORDERS_WEB_APP_TARGET_CANONICAL_ID,
  W01_ORDERS_WEB_APP_EXPECTED,
  W02_ORDERS_WEB_APP_EXPECTED,
  assertW02OrdersWebAppSnapshot,
  ordersWebAppSnapshotMatches,
} from "../src/lib/actions/web-app/fixture";

import {
  readOrdersWebApp,
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
  "w02-web-app-update-r3b-b-001";

const RECEIPT_ID =
  "meridian-w02-web-app-update-r3b-b-001";

const W01_RECEIPT_ID =
  "meridian-w01-web-app-create-r3b-a-r9-001";

if (
  typeof PASSWORD !==
    "string" ||
  PASSWORD.length ===
    0
) {
  throw new Error(
    "MERIDIAN_RUNTIME_PASSWORD is required for W02 live certification.",
  );
}

console.log(
  "===== MERIDIAN R3B-B W02 LIVE CERTIFICATION =====",
);
console.log(
  "W02_TARGET=/meridian-lab/orders",
);
console.log(
  "W02_OFFICIAL_MUTATION=PUT /v2/web-app",
);
console.log(
  "W02_EXPECTED_DELTA=DESCRIPTION_CREATED_TO_UPDATED_ONLY",
);
console.log(
  "W02_ENABLED_STATE_PRESERVED=false",
);
console.log(
  "W02_AUTOMATIC_RETRY_ALLOWED=NO",
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
    await readOrdersWebApp({
      apiBaseUrl:
        API_BASE,

      accessToken:
        session.accessToken,
    });

  if (
    before ===
      null ||
    !ordersWebAppSnapshotMatches(
      before,
      W01_ORDERS_WEB_APP_EXPECTED,
    )
  ) {
    throw new Error(
      "W02 safety gate failed: authoritative prestate is not the exact W01 poststate.",
    );
  }

  console.log(
    "W02_AUTHORITATIVE_PRESTATE_W01_EXACT=PASS",
  );
  console.log(
    `W02_PRESTATE_DESCRIPTION=${before.description}`,
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

  if (
    targetHistoryBefore.length !==
      1 ||
    targetHistoryBefore[0]
      ?.receiptId !==
      W01_RECEIPT_ID
  ) {
    throw new Error(
      "W02 requires exactly the certified W01 target-history predecessor.",
    );
  }

  const w01RecordBefore =
    await readActionReceiptHistory({
      baseUrl:
        HISTORY_BASE,

      accessToken:
        session.accessToken,

      receiptId:
        W01_RECEIPT_ID,
    });

  const w01ReceiptBefore =
    actionReceiptV2FromGenericHistory(
      w01RecordBefore,
    );

  console.log(
    "W02_TARGET_HISTORY_PRESTATE_COUNT=1",
  );
  console.log(
    `W02_W01_RECEIPT_SHA256_BEFORE=${w01ReceiptBefore.receiptSha256}`,
  );

  const result =
    await certifyW02WebAppUpdateAction(
      {
        intent:
          W02_WEB_APP_UPDATE_INTENT,

        actionId:
          ACTION_ID,

        receiptId:
          RECEIPT_ID,

        logicalActor:
          "R3B-B frozen operator invocation",

        irisRuntimeUser:
          USERNAME,
      },
      {
        contract: {
          async readConfiguredApp() {
            return readOrdersWebApp({
              apiBaseUrl:
                API_BASE,

              accessToken:
                session.accessToken,
            });
          },

          async executeUpdate() {
            const mutation =
              await updateOrdersWebAppW02({
                apiBaseUrl:
                  API_BASE,

                accessToken:
                  session.accessToken,
              });

            console.log(
              `W02_PUT_RESPONSE_STATUS=${mutation.status}`,
            );

            console.log(
              `W02_MUTATION_REQUEST_COUNT=${mutation.mutationRequestCount}`,
            );
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
              !ordersWebAppSnapshotMatches(
                review.preflight.observed,
                W01_ORDERS_WEB_APP_EXPECTED,
              ) ||
              review.expectedDelta
                .before.description !==
                ORDERS_WEB_APP_DESCRIPTION_CREATE ||
              review.expectedDelta
                .after.description !==
                ORDERS_WEB_APP_DESCRIPTION_UPDATE ||
              review.expectedDelta
                .before.enabled !==
                false ||
              review.expectedDelta
                .after.enabled !==
                false ||
              review.impact
                .certainty !==
                "KNOWN"
            ) {
              throw new Error(
                "Frozen W02 review packet does not satisfy the approved contract.",
              );
            }

            console.log(
              `W02_REVIEWED_PREFLIGHT_DIGEST=${review.preflightDigest}`,
            );
            console.log(
              "W02_REVIEWED_DELTA=DESCRIPTION_CREATED_TO_UPDATED_ONLY",
            );
            console.log(
              "W02_IMPACT_CERTAINTY=KNOWN",
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
                  "Generic receipt write acknowledgement does not match W02 receipt identity.",
                );
              }
            },

            async read(
              receiptId,
            ) {
              const record =
                await readActionReceiptHistory({
                  baseUrl:
                    HISTORY_BASE,

                  accessToken:
                    session.accessToken,

                  receiptId,
                });

              return actionReceiptV2FromGenericHistory(
                record,
              );
            },
          },
        },
      },
    );

  console.log(
    `W02_CERTIFICATION_OUTCOME=${result.outcome}`,
  );
  console.log(
    `W02_FINAL_ACTION_STATE=${result.record.state}`,
  );
  console.log(
    `W02_EVENT_COUNT=${result.events.length}`,
  );
  console.log(
    `W02_PROOF_RESULT_COUNT=${result.proofResults.length}`,
  );
  console.log(
    `W02_CERTIFICATION_REASON=${result.reason ?? "NONE"}`,
  );

  for (
    const event
    of result.events
  ) {
    console.log(
      "W02_EVENT_LEDGER=" +
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
      `W02 certification did not close VERIFIED. Reason=${result.reason ?? "none"}`,
    );
  }

  const after =
    await readOrdersWebApp({
      apiBaseUrl:
        API_BASE,

      accessToken:
        session.accessToken,
    });

  if (
    after ===
      null
  ) {
    throw new Error(
      "W02 authoritative poststate is absent after VERIFIED certification.",
    );
  }

  assertW02OrdersWebAppSnapshot(
    after,
  );

  console.log(
    "W02_AUTHORITATIVE_POSTSTATE=PASS",
  );
  console.log(
    "W02_POSTSTATE_ENABLED=false",
  );
  console.log(
    `W02_POSTSTATE_DESCRIPTION=${after.description}`,
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
      2 ||
    !ids.has(
      W01_RECEIPT_ID,
    ) ||
    !ids.has(
      RECEIPT_ID,
    )
  ) {
    throw new Error(
      "W02 target history does not contain exactly W01 plus W02 receipts.",
    );
  }

  console.log(
    "W02_TARGET_HISTORY_POSTSTATE_COUNT=2",
  );

  const persistedW02 =
    await readActionReceiptHistory({
      baseUrl:
        HISTORY_BASE,

      accessToken:
        session.accessToken,

      receiptId:
        RECEIPT_ID,
    });

  const w02Receipt =
    actionReceiptV2FromGenericHistory(
      persistedW02,
    );

  if (
    w02Receipt.receiptId !==
      result.receipt.receiptId ||
    w02Receipt.receiptSha256 !==
      result.receipt.receiptSha256 ||
    w02Receipt.actionType !==
      "WEB_APP_UPDATE"
  ) {
    throw new Error(
      "W02 exact persistent receipt readback differs from the certified in-memory receipt.",
    );
  }

  console.log(
    `W02_RECEIPT_ID=${w02Receipt.receiptId}`,
  );
  console.log(
    `W02_RECEIPT_SHA256=${w02Receipt.receiptSha256}`,
  );
  console.log(
    "W02_GENERIC_RECEIPT_EXACT_READBACK=PASS",
  );

  const w01RecordAfter =
    await readActionReceiptHistory({
      baseUrl:
        HISTORY_BASE,

      accessToken:
        session.accessToken,

      receiptId:
        W01_RECEIPT_ID,
    });

  const w01ReceiptAfter =
    actionReceiptV2FromGenericHistory(
      w01RecordAfter,
    );

  if (
    w01ReceiptAfter.receiptSha256 !==
      w01ReceiptBefore.receiptSha256
  ) {
    throw new Error(
      "W02 append changed the historical W01 receipt.",
    );
  }

  console.log(
    "W02_W01_HISTORICAL_RECEIPT_UNCHANGED=PASS",
  );
  console.log(
    "R3B_B_W02_LIVE_CERTIFICATION=PASS",
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
