import {
  buildActionReceiptHistoryRecord,
  actionReceiptV2FromGenericHistory,
} from "../src/lib/proof/action-history";

import {
  certifyW01WebAppCreateAction,
} from "../src/lib/actions/web-app/certification";

import {
  W01_WEB_APP_CREATE_INTENT,
} from "../src/lib/actions/web-app/contract";

import {
  ORDERS_WEB_APP_NAME,
  ORDERS_WEB_APP_TARGET_CANONICAL_ID,
  assertW01OrdersWebAppSnapshot,
} from "../src/lib/actions/web-app/fixture";

import {
  createOrdersWebAppW01,
  readOrdersWebApp,
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
  "w01-web-app-create-r3b-a-r9-001";

const RECEIPT_ID =
  "meridian-w01-web-app-create-r3b-a-r9-001";

if (
  typeof PASSWORD !==
    "string" ||
  PASSWORD.length ===
    0
) {
  throw new Error(
    "MERIDIAN_RUNTIME_PASSWORD is required for W01 live certification.",
  );
}

console.log(
  "===== MERIDIAN R3B-A W01 LIVE CERTIFICATION =====",
);
console.log(
  "W01_TARGET=/meridian-lab/orders",
);
console.log(
  "W01_OFFICIAL_MUTATION=PUT /v2/web-app",
);
console.log(
  "W01_OFFICIAL_READBACK=GET /v2/web-app",
);
console.log(
  "W01_REQUIRED_AUTHORITY=%Admin_Secure:U",
);
console.log(
  "W01_AUTHORITY_MODE=CURRENT_STANDING_RUNTIME_AUTHORITY",
);
console.log(
  "W01_AUTOMATIC_RETRY_ALLOWED=NO",
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
    before !==
      null
  ) {
    throw new Error(
      "W01 safety gate failed: /meridian-lab/orders already exists.",
    );
  }

  console.log(
    "W01_AUTHORITATIVE_PRESTATE_ABSENT=PASS",
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
      0
  ) {
    throw new Error(
      "W01 target already has generic receipt history.",
    );
  }

  console.log(
    "W01_TARGET_HISTORY_PRESTATE_COUNT=0",
  );

  const result =
    await certifyW01WebAppCreateAction(
      {
        intent:
          W01_WEB_APP_CREATE_INTENT,

        actionId:
          ACTION_ID,

        receiptId:
          RECEIPT_ID,

        logicalActor:
          "R3B-A frozen operator invocation",

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

          async executeCreate() {
            const mutation =
              await createOrdersWebAppW01({
                apiBaseUrl:
                  API_BASE,

                accessToken:
                  session.accessToken,
              });

            console.log(
              `W01_PUT_RESPONSE_STATUS=${mutation.status}`,
            );

            console.log(
              `W01_MUTATION_REQUEST_COUNT=${mutation.mutationRequestCount}`,
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
                .observed !==
                "ABSENT" ||
              review.expectedDelta
                .before.present !==
                false ||
              review.expectedDelta
                .after.present !==
                true ||
              review.expectedDelta
                .after.enabled !==
                false ||
              review.impact
                .certainty !==
                "KNOWN"
            ) {
              throw new Error(
                "Frozen W01 review packet does not satisfy the approved contract.",
              );
            }

            console.log(
              `W01_REVIEWED_PREFLIGHT_DIGEST=${review.preflightDigest}`,
            );

            console.log(
              "W01_REVIEW_MODE=FROZEN_SCRIPT_INVOCATION_APPROVAL",
            );

            console.log(
              "W01_REVIEWED_DELTA=ABSENT_TO_PRESENT_DISABLED",
            );

            console.log(
              "W01_IMPACT_CERTAINTY=KNOWN",
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
                  "Generic receipt write acknowledgement does not match W01 receipt identity.",
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
    `W01_CERTIFICATION_OUTCOME=${result.outcome}`,
  );

  console.log(
    `W01_FINAL_ACTION_STATE=${result.record.state}`,
  );

  console.log(
    `W01_EVENT_COUNT=${result.events.length}`,
  );

  console.log(
    `W01_PROOF_RESULT_COUNT=${result.proofResults.length}`,
  );

  console.log(
    `W01_CERTIFICATION_REASON=${result.reason ?? "NONE"}`,
  );

  for (
    const event
    of result.events
  ) {
    console.log(
      "W01_EVENT_LEDGER=" +
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
      `W01 certification did not close VERIFIED. Reason=${result.reason ?? "none"}`,
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
      "W01 authoritative poststate is absent after VERIFIED certification.",
    );
  }

  assertW01OrdersWebAppSnapshot(
    after,
  );

  console.log(
    "W01_AUTHORITATIVE_POSTSTATE=PASS",
  );
  console.log(
    "W01_POSTSTATE_ENABLED=false",
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

  if (
    targetHistoryAfter.length !==
      1 ||
    targetHistoryAfter[0]
      ?.receiptId !==
      RECEIPT_ID
  ) {
    throw new Error(
      "W01 target history does not contain exactly the first expected generic receipt.",
    );
  }

  console.log(
    "W01_TARGET_HISTORY_POSTSTATE_COUNT=1",
  );

  const persisted =
    await readActionReceiptHistory({
      baseUrl:
        HISTORY_BASE,

      accessToken:
        session.accessToken,

      receiptId:
        RECEIPT_ID,
    });

  const receipt =
    actionReceiptV2FromGenericHistory(
      persisted,
    );

  if (
    receipt.receiptId !==
      result.receipt.receiptId ||
    receipt.receiptSha256 !==
      result.receipt.receiptSha256 ||
    receipt.target.canonicalId !==
      ORDERS_WEB_APP_TARGET_CANONICAL_ID ||
    receipt.actionType !==
      "WEB_APP_CREATE"
  ) {
    throw new Error(
      "W01 exact persistent receipt readback differs from the certified in-memory receipt.",
    );
  }

  console.log(
    `W01_RECEIPT_ID=${receipt.receiptId}`,
  );

  console.log(
    `W01_RECEIPT_SHA256=${receipt.receiptSha256}`,
  );

  console.log(
    "W01_GENERIC_RECEIPT_EXACT_READBACK=PASS",
  );

  console.log(
    "W01_FIRST_GENERIC_RECEIPT_TARGET=" +
    ORDERS_WEB_APP_NAME,
  );

  console.log(
    "R3B_A_W01_LIVE_CERTIFICATION=PASS",
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
