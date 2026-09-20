import {
  actionReceiptV2FromGenericHistory,
  buildActionReceiptHistoryRecord,
} from "../src/lib/proof/action-history";

import {
  certifyW03EnableRecoveryAction,
  W03_ENABLE_RECOVERY_INTENT,
  type OrdersWebAppRoutingState,
} from "../src/lib/actions/web-app/enable-recovery";

import {
  ORDERS_WEB_APP_NAME,
  ORDERS_WEB_APP_TARGET_CANONICAL_ID,
  W02_ORDERS_WEB_APP_EXPECTED,
  W03_ORDERS_WEB_APP_EXPECTED,
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
  "w03-web-app-enable-recovery-r3b-c-r2a-001";

const RECEIPT_ID =
  "meridian-w03-web-app-enable-recovery-r3b-c-r2a-001";

const MAIN_W03_RECEIPT_ID =
  "meridian-w03-web-app-enable-r3b-c-001";

const W01_RECEIPT_ID =
  "meridian-w01-web-app-create-r3b-a-r9-001";

const W02_RECEIPT_ID =
  "meridian-w02-web-app-update-r3b-b-001";

const W01_RECEIPT_SHA256 =
  "693B47009BD1B74C3949FA896302AACBFB5DF3397AD9C2A7A46B425CEFC3246F";

const W02_RECEIPT_SHA256 =
  "DDCDFB0BE1057831040429FBA1EB069C2A352F787C5630ACF2D79C28E2BAE442";

if (
  typeof PASSWORD !==
    "string" ||
  PASSWORD.length ===
    0
) {
  throw new Error(
    "MERIDIAN_RUNTIME_PASSWORD is required for W03 compensating recovery.",
  );
}

interface JsonRecord {
  readonly [key: string]:
    unknown;
}

function isRecord(
  value:
    unknown,
): value is JsonRecord {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}

function booleanCompatible(
  value:
    unknown,
  label:
    string,
): boolean {
  if (
    typeof value ===
      "boolean"
  ) {
    return value;
  }

  if (
    value ===
      1 ||
    value ===
      "1" ||
    value ===
      "true"
  ) {
    return true;
  }

  if (
    value ===
      0 ||
    value ===
      "0" ||
    value ===
      "false"
  ) {
    return false;
  }

  throw new Error(
    `${label} is not boolean-compatible.`,
  );
}

async function readRoutingState(
  accessToken:
    string,
): Promise<
  OrdersWebAppRoutingState
> {
  const query =
    new URLSearchParams({
      name:
        ORDERS_WEB_APP_NAME,
    });

  const response =
    await fetch(
      API_BASE.replace(
        /\/+$/,
        "",
      ) +
      "/v2/web-app?" +
      query.toString(),
      {
        method:
          "GET",
        cache:
          "no-store",
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

  if (
    !response.ok
  ) {
    throw new Error(
      `Recovery routing read returned HTTP ${response.status}. Body=${text.slice(0, 500)}`,
    );
  }

  const parsed =
    JSON.parse(
      text,
    ) as unknown;

  const result =
    (
      isRecord(
        parsed,
      ) &&
      Object.prototype.hasOwnProperty.call(
        parsed,
        "result",
      )
    )
      ? parsed.result
      : parsed;

  if (
    !isRecord(
      result,
    )
  ) {
    throw new Error(
      "Recovery routing read result is not an object.",
    );
  }

  return Object.freeze({
    recurse:
      booleanCompatible(
        result.Recurse ??
          result.recurse,
        "Recurse",
      ),

    cspZenEnabled:
      booleanCompatible(
        result.CSPZENEnabled ??
          result.cspZenEnabled,
        "CSPZENEnabled",
      ),
  });
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
  "===== MERIDIAN R3B-C-R2A W03 COMPENSATING RECOVERY =====",
);
console.log(
  "RECOVERY_OF_ACTION_ID=w03-web-app-enable-r3b-c-001",
);
console.log(
  "RECOVERY_DELTA=ENABLED_TRUE_TO_FALSE_ONLY",
);
console.log(
  "RECOVERY_CSPZEN_PRESERVED=false",
);
console.log(
  "RECOVERY_RECURSE_PRESERVED=true",
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
    await readOrdersWebApp({
      apiBaseUrl:
        API_BASE,

      accessToken:
        session.accessToken,
    });

  const routingBefore =
    await readRoutingState(
      session.accessToken,
    );

  if (
    before ===
      null ||
    !ordersWebAppSnapshotMatches(
      before,
      W03_ORDERS_WEB_APP_EXPECTED,
    ) ||
    routingBefore.recurse !==
      true ||
    routingBefore.cspZenEnabled !==
      false
  ) {
    throw new Error(
      "Recovery safety gate failed: live state is not exact applied-but-unverified W03 state.",
    );
  }

  console.log(
    "W03_RECOVERY_PRESTATE_EXACT=PASS",
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
      2 ||
    !idsBefore.has(
      W01_RECEIPT_ID,
    ) ||
    !idsBefore.has(
      W02_RECEIPT_ID,
    ) ||
    idsBefore.has(
      MAIN_W03_RECEIPT_ID,
    ) ||
    idsBefore.has(
      RECEIPT_ID,
    )
  ) {
    throw new Error(
      "Recovery requires exactly W01 and W02 durable predecessors and no W03/recovery receipt.",
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

  if (
    w01Before.receiptSha256 !==
      W01_RECEIPT_SHA256 ||
    w02Before.receiptSha256 !==
      W02_RECEIPT_SHA256
  ) {
    throw new Error(
      "Recovery predecessor receipt hashes changed.",
    );
  }

  const result =
    await certifyW03EnableRecoveryAction(
      {
        intent:
          W03_ENABLE_RECOVERY_INTENT,

        actionId:
          ACTION_ID,

        receiptId:
          RECEIPT_ID,

        logicalActor:
          "R3B-C-R2A frozen compensating recovery",

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

          async readRoutingState() {
            return readRoutingState(
              session.accessToken,
            );
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
              `W03_RECOVERY_PUT_RESPONSE_STATUS=${mutation.status}`,
            );

            console.log(
              `W03_RECOVERY_MUTATION_REQUEST_COUNT=${mutation.mutationRequestCount}`,
            );
          },

          async observeDisabledHttp() {
            const observation =
              await observeHealth();

            console.log(
              `W03_RECOVERY_HTTP_STATUS=${observation.status}`,
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
                false ||
              review.expectedDelta
                .before.enabled !==
                true ||
              review.expectedDelta
                .after.enabled !==
                false ||
              review.expectedDelta
                .before.cspZenEnabled !==
                false ||
              review.expectedDelta
                .after.cspZenEnabled !==
                false ||
              review.impact
                .certainty !==
                "KNOWN"
            ) {
              throw new Error(
                "Frozen W03 recovery review packet does not match the approved compensating delta.",
              );
            }

            console.log(
              `W03_RECOVERY_REVIEWED_PREFLIGHT_DIGEST=${review.preflightDigest}`,
            );
            console.log(
              "W03_RECOVERY_REVIEWED_DELTA=ENABLED_TRUE_TO_FALSE_ONLY",
            );
            console.log(
              "W03_RECOVERY_IMPACT_CERTAINTY=KNOWN",
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
                  "Recovery receipt acknowledgement does not match frozen receipt.",
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
    `W03_RECOVERY_CERTIFICATION_OUTCOME=${result.outcome}`,
  );
  console.log(
    `W03_RECOVERY_FINAL_ACTION_STATE=${result.record.state}`,
  );
  console.log(
    `W03_RECOVERY_EVENT_COUNT=${result.events.length}`,
  );
  console.log(
    `W03_RECOVERY_PROOF_RESULT_COUNT=${result.proofResults.length}`,
  );
  console.log(
    `W03_RECOVERY_REASON=${result.reason ?? "NONE"}`,
  );

  for (
    const event
    of result.events
  ) {
    console.log(
      "W03_RECOVERY_EVENT_LEDGER=" +
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
      `W03 compensating recovery did not close VERIFIED. Reason=${result.reason ?? "none"}`,
    );
  }

  const after =
    await readOrdersWebApp({
      apiBaseUrl:
        API_BASE,

      accessToken:
        session.accessToken,
    });

  const routingAfter =
    await readRoutingState(
      session.accessToken,
    );

  if (
    after ===
      null ||
    !ordersWebAppSnapshotMatches(
      after,
      W02_ORDERS_WEB_APP_EXPECTED,
    ) ||
    routingAfter.recurse !==
      true ||
    routingAfter.cspZenEnabled !==
      false
  ) {
    throw new Error(
      "Recovery poststate is not exact restored W02.",
    );
  }

  console.log(
    "W03_RECOVERY_AUTHORITATIVE_W02_RESTORATION=PASS",
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
      3 ||
    !idsAfter.has(
      W01_RECEIPT_ID,
    ) ||
    !idsAfter.has(
      W02_RECEIPT_ID,
    ) ||
    !idsAfter.has(
      RECEIPT_ID,
    ) ||
    idsAfter.has(
      MAIN_W03_RECEIPT_ID,
    )
  ) {
    throw new Error(
      "Recovery target history does not contain exactly W01, W02, and recovery receipt.",
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
      "Recovery exact receipt readback differs from certified receipt.",
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

  if (
    w01After.receiptSha256 !==
      W01_RECEIPT_SHA256 ||
    w02After.receiptSha256 !==
      W02_RECEIPT_SHA256
  ) {
    throw new Error(
      "Recovery append changed historical W01/W02 receipts.",
    );
  }

  console.log(
    `W03_RECOVERY_RECEIPT_ID=${recoveryReceipt.receiptId}`,
  );
  console.log(
    `W03_RECOVERY_RECEIPT_SHA256=${recoveryReceipt.receiptSha256}`,
  );
  console.log(
    "W03_RECOVERY_GENERIC_RECEIPT_EXACT_READBACK=PASS",
  );
  console.log(
    "W03_RECOVERY_W01_W02_HISTORICAL_RECEIPTS_UNCHANGED=PASS",
  );
  console.log(
    "R3B_C_R2A_COMPENSATING_RECOVERY=PASS",
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
