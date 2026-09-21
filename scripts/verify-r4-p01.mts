import {
  actionReceiptV2FromGenericHistory,
  buildActionReceiptHistoryRecord,
} from "../src/lib/proof/action-history";

import {
  certifyP01RoleCreateAction,
  P01_ROLE_CREATE_DELTA_SUMMARY,
  P01_ROLE_CREATE_INTENT,
} from "../src/lib/actions/permissions/role-create";

import {
  R4_PERMISSION_ROLE_CANONICAL_ID,
  R4_PERMISSION_ROLE_EXPECTED,
  r4PermissionRoleMatches,
} from "../src/lib/actions/permissions/role-fixture";

import {
  createR4PermissionRole,
  readR4PermissionResourceExists,
  readR4PermissionRole,
} from "../src/lib/iris/security-role-action-transport";

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
  "p01-role-create-r4-a-001";

const RECEIPT_ID =
  "meridian-p01-role-create-r4-a-001";

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
  ]);

if (
  typeof PASSWORD !==
    "string" ||
  PASSWORD.length ===
    0
) {
  throw new Error(
    "MERIDIAN_RUNTIME_PASSWORD is required for P01 live certification.",
  );
}

console.log(
  "===== MERIDIAN R4-A P01 ROLE_CREATE CERTIFICATION =====",
);
console.log(
  "P01_TARGET=MeridianR4ProofRole",
);
console.log(
  "P01_OFFICIAL_MUTATION=PUT /v2/security/role",
);
console.log(
  "P01_EXPECTED_DELTA=ABSENT_TO_EXACT_UNASSIGNED_ROLE",
);
console.log(
  "P01_PERMISSION_EFFECT_CLAIM=NOT_APPLICABLE",
);
console.log(
  "P01_AUTOMATIC_RETRY_ALLOWED=NO",
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
  const beforeRole =
    await readR4PermissionRole({
      apiBaseUrl:
        API_BASE,

      accessToken:
        session.accessToken,
    });

  const resourcePresent =
    await readR4PermissionResourceExists({
      apiBaseUrl:
        API_BASE,

      accessToken:
        session.accessToken,
    });

  if (
    beforeRole !==
      null ||
    !resourcePresent
  ) {
    throw new Error(
      "P01 safety gate requires absent role and present Meridian_Orders resource.",
    );
  }

  console.log(
    "P01_AUTHORITATIVE_PRESTATE_ROLE_ABSENT=PASS",
  );
  console.log(
    "P01_PREREQUISITE_RESOURCE_PRESENT=PASS",
  );

  const targetHistoryBefore =
    await readTargetActionHistory({
      baseUrl:
        HISTORY_BASE,

      accessToken:
        session.accessToken,

      targetCanonicalId:
        R4_PERMISSION_ROLE_CANONICAL_ID,
    });

  if (
    targetHistoryBefore.length !==
      0
  ) {
    throw new Error(
      "P01 requires empty durable history for the new R4 role target.",
    );
  }

  console.log(
    "P01_TARGET_HISTORY_PRESTATE_COUNT=0",
  );

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
        `Historical predecessor changed before P01: ${predecessor.receiptId}.`,
      );
    }

    console.log(
      `P01_PREDECESSOR_RECEIPT_SHA256=${receipt.receiptId}|${receipt.receiptSha256}`,
    );
  }

  const result =
    await certifyP01RoleCreateAction(
      {
        intent:
          P01_ROLE_CREATE_INTENT,

        actionId:
          ACTION_ID,

        receiptId:
          RECEIPT_ID,

        logicalActor:
          "R4-A frozen operator invocation",

        irisRuntimeUser:
          USERNAME,
      },
      {
        contract: {
          async readRole() {
            return readR4PermissionRole({
              apiBaseUrl:
                API_BASE,

              accessToken:
                session.accessToken,
            });
          },

          async readPrerequisiteResource() {
            return readR4PermissionResourceExists({
              apiBaseUrl:
                API_BASE,

              accessToken:
                session.accessToken,
            });
          },

          async executeCreate() {
            const mutation =
              await createR4PermissionRole({
                apiBaseUrl:
                  API_BASE,

                accessToken:
                  session.accessToken,
              });

            console.log(
              `P01_PUT_RESPONSE_STATUS=${mutation.status}`,
            );

            console.log(
              `P01_MUTATION_REQUEST_COUNT=${mutation.mutationRequestCount}`,
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
                .observedRole !==
                null ||
              review.preflight
                .prerequisiteResourcePresent !==
                true ||
              review.expectedDelta
                .summary !==
                P01_ROLE_CREATE_DELTA_SUMMARY ||
              review.impact
                .certainty !==
                "KNOWN"
            ) {
              throw new Error(
                "Frozen P01 review packet does not satisfy the approved role-create contract.",
              );
            }

            console.log(
              `P01_REVIEWED_PREFLIGHT_DIGEST=${review.preflightDigest}`,
            );
            console.log(
              "P01_REVIEWED_DELTA=ABSENT_TO_EXACT_UNASSIGNED_ROLE",
            );
            console.log(
              "P01_IMPACT_CERTAINTY=KNOWN",
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
                  "P01 generic receipt write acknowledgement does not match certified receipt identity.",
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
    `P01_CERTIFICATION_OUTCOME=${result.outcome}`,
  );
  console.log(
    `P01_FINAL_ACTION_STATE=${result.record.state}`,
  );
  console.log(
    `P01_EVENT_COUNT=${result.events.length}`,
  );
  console.log(
    `P01_PROOF_RESULT_COUNT=${result.proofResults.length}`,
  );
  console.log(
    `P01_CERTIFICATION_REASON=${result.reason ?? "NONE"}`,
  );

  for (
    const event
    of result.events
  ) {
    console.log(
      "P01_EVENT_LEDGER=" +
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
      `P01 certification did not close VERIFIED. Reason=${result.reason ?? "none"}`,
    );
  }

  const metadataProof =
    result.proofResults.find(
      (
        proof,
      ) =>
        proof.plane ===
          "SECURITY_METADATA",
    );

  const effectProof =
    result.proofResults.find(
      (
        proof,
      ) =>
        proof.plane ===
          "PERMISSION_EFFECT",
    );

  if (
    metadataProof?.status !==
      "PASS" ||
    effectProof?.status !==
      "NOT_APPLICABLE"
  ) {
    throw new Error(
      "P01 proof-plane semantics are incorrect.",
    );
  }

  const afterRole =
    await readR4PermissionRole({
      apiBaseUrl:
        API_BASE,

      accessToken:
        session.accessToken,
    });

  if (
    afterRole ===
      null ||
    !r4PermissionRoleMatches(
      afterRole,
      R4_PERMISSION_ROLE_EXPECTED,
    )
  ) {
    throw new Error(
      "P01 independent authoritative role readback is not exact.",
    );
  }

  console.log(
    "P01_AUTHORITATIVE_ROLE_POSTSTATE=PASS",
  );
  console.log(
    "P01_PERMISSION_EFFECT_NOT_APPLICABLE=PASS",
  );

  const targetHistoryAfter =
    await readTargetActionHistory({
      baseUrl:
        HISTORY_BASE,

      accessToken:
        session.accessToken,

      targetCanonicalId:
        R4_PERMISSION_ROLE_CANONICAL_ID,
    });

  if (
    targetHistoryAfter.length !==
      1 ||
    targetHistoryAfter[0]
      ?.receiptId !==
      RECEIPT_ID
  ) {
    throw new Error(
      "P01 target history does not contain exactly the new role-create receipt.",
    );
  }

  const p01Receipt =
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
    p01Receipt.receiptId !==
      result.receipt.receiptId ||
    p01Receipt.receiptSha256 !==
      result.receipt.receiptSha256 ||
    p01Receipt.actionType !==
      "ROLE_CREATE"
  ) {
    throw new Error(
      "P01 exact durable receipt readback differs from the certified receipt.",
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
        `Historical predecessor changed after P01: ${predecessor.receiptId}.`,
      );
    }
  }

  console.log(
    "P01_TARGET_HISTORY_POSTSTATE_COUNT=1",
  );
  console.log(
    `P01_RECEIPT_ID=${p01Receipt.receiptId}`,
  );
  console.log(
    `P01_RECEIPT_SHA256=${p01Receipt.receiptSha256}`,
  );
  console.log(
    "P01_GENERIC_RECEIPT_EXACT_READBACK=PASS",
  );
  console.log(
    "P01_ALL_PREDECESSOR_RECEIPTS_UNCHANGED=PASS",
  );
  console.log(
    "R4_A_P01_LIVE_CERTIFICATION=PASS",
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
