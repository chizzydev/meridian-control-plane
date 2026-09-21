import {
  actionReceiptV2FromGenericHistory,
  buildActionReceiptHistoryRecord,
} from "../src/lib/proof/action-history";

import {
  certifyW04WebAppDeleteAction,
  W04_WEB_APP_DELETE_DELTA_SUMMARY,
  W04_WEB_APP_DELETE_INTENT,
  w04HealthIsAbsent,
  w04HealthIsReady,
  w04PrestateMatchesFinalW03,
  w04StateIsAbsent,
} from "../src/lib/actions/web-app/delete";

import {
  ORDERS_WEB_APP_HELPER_EXECUTION_ROLE,
  ORDERS_WEB_APP_TARGET_CANONICAL_ID,
} from "../src/lib/actions/web-app/fixture";

import {
  deleteOrdersWebApp,
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
  "w04-web-app-delete-r3b-d-001";

const RECEIPT_ID =
  "meridian-w04-web-app-delete-r3b-d-001";

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
  ]);

if (
  typeof PASSWORD !==
    "string" ||
  PASSWORD.length ===
    0
) {
  throw new Error(
    "MERIDIAN_RUNTIME_PASSWORD is required for W04 live certification.",
  );
}

console.log(
  "===== MERIDIAN R3B-D W04 WEB APP DELETE CERTIFICATION =====",
);
console.log(
  "W04_TARGET=/meridian-lab/orders",
);
console.log(
  "W04_OFFICIAL_MUTATION=DELETE /v2/web-app",
);
console.log(
  "W04_EXPECTED_DELTA=EXACT_FINAL_W03_PRESENT_TO_COMPLETE_APPLICATION_ABSENCE",
);
console.log(
  "W04_PREDELETE_HTTP_READY_REQUIRED=YES",
);
console.log(
  "W04_POSTDELETE_HTTP_404_REQUIRED=YES",
);
console.log(
  "W04_REST_CLASS_DELETE=NO",
);
console.log(
  "W04_HELPER_ROLE_DELETE=NO",
);
console.log(
  "W04_AUTOMATIC_RETRY_ALLOWED=NO",
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

  const healthBefore =
    await probeOrdersWebAppHealth({
      webBaseUrl:
        WEB_BASE,
    });

  if (
    !w04PrestateMatchesFinalW03(
      before,
    ) ||
    !w04HealthIsReady(
      healthBefore,
    )
  ) {
    throw new Error(
      "W04 safety gate failed: target is not exact live final W03.",
    );
  }

  console.log(
    "W04_AUTHORITATIVE_PRESTATE_FINAL_W03_EXACT=PASS",
  );
  console.log(
    "W04_PREDELETE_HTTP_READY=PASS",
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
      5 ||
    idsBefore.has(
      RECEIPT_ID,
    )
  ) {
    throw new Error(
      "W04 requires exactly five durable target-history predecessors and no W04 receipt.",
    );
  }

  for (
    const predecessor
    of PREDECESSORS
  ) {
    if (
      !idsBefore.has(
        predecessor.receiptId,
      )
    ) {
      throw new Error(
        `Missing W04 predecessor receipt ${predecessor.receiptId}.`,
      );
    }

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
        `Historical receipt hash changed before W04: ${predecessor.receiptId}.`,
      );
    }

    console.log(
      `W04_PREDECESSOR_RECEIPT_SHA256=${predecessor.receiptId}|${receipt.receiptSha256}`,
    );
  }

  console.log(
    "W04_TARGET_HISTORY_PRESTATE_COUNT=5",
  );

  const result =
    await certifyW04WebAppDeleteAction(
      {
        intent:
          W04_WEB_APP_DELETE_INTENT,

        actionId:
          ACTION_ID,

        receiptId:
          RECEIPT_ID,

        logicalActor:
          "R3B-D frozen operator invocation",

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

          async executeDelete() {
            const mutation =
              await deleteOrdersWebApp({
                apiBaseUrl:
                  API_BASE,

                accessToken:
                  session.accessToken,
              });

            console.log(
              `W04_DELETE_RESPONSE_STATUS=${mutation.status}`,
            );

            console.log(
              `W04_MUTATION_REQUEST_COUNT=${mutation.mutationRequestCount}`,
            );
          },

          async probeHealth() {
            return probeOrdersWebAppHealth({
              webBaseUrl:
                WEB_BASE,
            });
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
            const binding =
              review.preflight
                .observed
                .matchRoles?.[
                  0
                ];

            if (
              !w04PrestateMatchesFinalW03(
                review.preflight
                  .observed,
              ) ||
              !w04HealthIsReady(
                review.preflight
                  .preDeleteHealth,
              ) ||
              binding ===
                undefined ||
              binding.matchRole !==
                "" ||
              binding.targetRoles.length !==
                1 ||
              binding.targetRoles[0] !==
                ORDERS_WEB_APP_HELPER_EXECUTION_ROLE ||
              review.expectedDelta
                .summary !==
                W04_WEB_APP_DELETE_DELTA_SUMMARY ||
              review.impact
                .certainty !==
                "KNOWN"
            ) {
              throw new Error(
                "Frozen W04 review packet does not satisfy the approved delete contract.",
              );
            }

            console.log(
              `W04_REVIEWED_PREFLIGHT_DIGEST=${review.preflightDigest}`,
            );
            console.log(
              "W04_REVIEWED_DELTA=FINAL_W03_PRESENT_TO_ABSENT",
            );
            console.log(
              "W04_IMPACT_CERTAINTY=KNOWN",
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
                  "W04 generic receipt write acknowledgement does not match certified receipt identity.",
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
    `W04_CERTIFICATION_OUTCOME=${result.outcome}`,
  );
  console.log(
    `W04_FINAL_ACTION_STATE=${result.record.state}`,
  );
  console.log(
    `W04_EVENT_COUNT=${result.events.length}`,
  );
  console.log(
    `W04_PROOF_RESULT_COUNT=${result.proofResults.length}`,
  );
  console.log(
    `W04_CERTIFICATION_REASON=${result.reason ?? "NONE"}`,
  );

  for (
    const event
    of result.events
  ) {
    console.log(
      "W04_EVENT_LEDGER=" +
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
      `W04 certification did not close VERIFIED. Reason=${result.reason ?? "none"}`,
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
    !w04StateIsAbsent(
      after,
    )
  ) {
    throw new Error(
      "W04 independent authoritative poststate does not prove application absence.",
    );
  }

  console.log(
    "W04_AUTHORITATIVE_APPLICATION_ABSENCE=PASS",
  );

  const healthAfter =
    await probeOrdersWebAppHealth({
      webBaseUrl:
        WEB_BASE,
    });

  if (
    !w04HealthIsAbsent(
      healthAfter,
    )
  ) {
    throw new Error(
      `W04 independent HTTP absence expected 404, observed ${healthAfter.status}.`,
    );
  }

  console.log(
    `W04_HTTP_POSTDELETE_STATUS=${healthAfter.status}`,
  );
  console.log(
    "W04_HTTP_ABSENCE_POSTSTATE=PASS",
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
      6 ||
    !idsAfter.has(
      RECEIPT_ID,
    )
  ) {
    throw new Error(
      "W04 target history does not contain exactly five predecessors plus W04.",
    );
  }

  for (
    const predecessor
    of PREDECESSORS
  ) {
    if (
      !idsAfter.has(
        predecessor.receiptId,
      )
    ) {
      throw new Error(
        `Historical predecessor disappeared after W04: ${predecessor.receiptId}.`,
      );
    }

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
        `Historical receipt changed after W04: ${predecessor.receiptId}.`,
      );
    }
  }

  const w04Receipt =
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
    w04Receipt.receiptId !==
      result.receipt.receiptId ||
    w04Receipt.receiptSha256 !==
      result.receipt.receiptSha256 ||
    w04Receipt.actionType !==
      "WEB_APP_DELETE"
  ) {
    throw new Error(
      "W04 exact durable receipt readback differs from the certified receipt.",
    );
  }

  console.log(
    "W04_TARGET_HISTORY_POSTSTATE_COUNT=6",
  );
  console.log(
    `W04_RECEIPT_ID=${w04Receipt.receiptId}`,
  );
  console.log(
    `W04_RECEIPT_SHA256=${w04Receipt.receiptSha256}`,
  );
  console.log(
    "W04_GENERIC_RECEIPT_EXACT_READBACK=PASS",
  );
  console.log(
    "W04_ALL_PREDECESSOR_RECEIPTS_UNCHANGED=PASS",
  );
  console.log(
    "R3B_D_W04_LIVE_CERTIFICATION=PASS",
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
