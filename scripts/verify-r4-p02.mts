import {
  actionReceiptV2FromGenericHistory,
  buildActionReceiptHistoryRecord,
} from "../src/lib/proof/action-history";

import {
  P02_RECOVERY_OF_RECEIPT_ID,
  P02_RECOVERY_OF_RECEIPT_SHA256,
  P02_ROLE_DELETE_DELTA_SUMMARY,
  P02_ROLE_DELETE_INTENT,
  certifyP02RoleDeleteAction,
} from "../src/lib/actions/permissions/role-delete";

import {
  R4_PERMISSION_ROLE_CANONICAL_ID,
  R4_PERMISSION_ROLE_EXPECTED,
  r4PermissionRoleMatches,
} from "../src/lib/actions/permissions/role-fixture";

import {
  deleteR4PermissionRole,
  readR4PermissionResourceExists,
  readR4PermissionRole,
  readR4PermissionRoleOwners,
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
  "p02-role-delete-r4-b-001";

const RECEIPT_ID =
  "meridian-p02-role-delete-r4-b-001";

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
        P02_RECOVERY_OF_RECEIPT_ID,

      sha256:
        P02_RECOVERY_OF_RECEIPT_SHA256,
    }),
  ]);

if (
  typeof PASSWORD !==
    "string" ||
  PASSWORD.length ===
    0
) {
  throw new Error(
    "MERIDIAN_RUNTIME_PASSWORD is required for P02 live certification.",
  );
}

console.log(
  "===== MERIDIAN R4-B P02 ROLE_DELETE VERIFIED RECOVERY =====",
);
console.log(
  "P02_TARGET=MeridianR4ProofRole",
);
console.log(
  `P02_RECOVERY_OF_RECEIPT_ID=${P02_RECOVERY_OF_RECEIPT_ID}`,
);
console.log(
  `P02_RECOVERY_OF_RECEIPT_SHA256=${P02_RECOVERY_OF_RECEIPT_SHA256}`,
);
console.log(
  "P02_OFFICIAL_MUTATION=DELETE /v2/security/role",
);
console.log(
  "P02_EXPECTED_DELTA=EXACT_P01_ROLE_TO_ABSENCE_RESOURCE_PRESERVED",
);
console.log(
  "P02_PERMISSION_EFFECT_CLAIM=NOT_APPLICABLE_AFTER_ZERO_OWNER_PREFLIGHT",
);
console.log(
  "P02_AUTOMATIC_RETRY_ALLOWED=NO",
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
  const p01Receipt =
    actionReceiptV2FromGenericHistory(
      await readActionReceiptHistory({
        baseUrl:
          HISTORY_BASE,

        accessToken:
          session.accessToken,

        receiptId:
          P02_RECOVERY_OF_RECEIPT_ID,
      }),
    );

  if (
    p01Receipt.receiptSha256 !==
      P02_RECOVERY_OF_RECEIPT_SHA256 ||
    p01Receipt.actionType !==
      "ROLE_CREATE" ||
    p01Receipt.target.canonicalId !==
      R4_PERMISSION_ROLE_CANONICAL_ID
  ) {
    throw new Error(
      "P02 recovery binding does not match the exact live-certified P01 receipt.",
    );
  }

  console.log(
    "P02_P01_RECOVERY_BINDING=PASS",
  );

  const [
    beforeRole,
    beforeOwners,
    resourcePresent,
  ] =
    await Promise.all([
      readR4PermissionRole({
        apiBaseUrl:
          API_BASE,

        accessToken:
          session.accessToken,
      }),

      readR4PermissionRoleOwners({
        apiBaseUrl:
          API_BASE,

        accessToken:
          session.accessToken,
      }),

      readR4PermissionResourceExists({
        apiBaseUrl:
          API_BASE,

        accessToken:
          session.accessToken,
      }),
    ]);

  if (
    beforeRole ===
      null ||
    !r4PermissionRoleMatches(
      beforeRole,
      R4_PERMISSION_ROLE_EXPECTED,
    ) ||
    beforeOwners ===
      null ||
    beforeOwners.length !==
      0 ||
    !resourcePresent
  ) {
    throw new Error(
      "P02 safety gate requires exact P01 role, zero owners, and preserved Meridian_Orders.",
    );
  }

  console.log(
    "P02_AUTHORITATIVE_PRESTATE_ROLE_EXACT=PASS",
  );
  console.log(
    "P02_AUTHORITATIVE_PRESTATE_OWNER_COUNT=0",
  );
  console.log(
    "P02_PREREQUISITE_RESOURCE_PRESENT=PASS",
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
      1 ||
    targetHistoryBefore[0]
      ?.receiptId !==
      P02_RECOVERY_OF_RECEIPT_ID
  ) {
    throw new Error(
      "P02 requires target history to contain exactly the certified P01 receipt.",
    );
  }

  console.log(
    "P02_TARGET_HISTORY_PRESTATE_COUNT=1",
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
        `Historical predecessor changed before P02: ${predecessor.receiptId}.`,
      );
    }

    console.log(
      `P02_PREDECESSOR_RECEIPT_SHA256=${receipt.receiptId}|${receipt.receiptSha256}`,
    );
  }

  const result =
    await certifyP02RoleDeleteAction(
      {
        intent:
          P02_ROLE_DELETE_INTENT,

        actionId:
          ACTION_ID,

        receiptId:
          RECEIPT_ID,

        logicalActor:
          "R4-B frozen verified-recovery invocation",

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

          async readOwners() {
            return readR4PermissionRoleOwners({
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

          async executeDelete() {
            const mutation =
              await deleteR4PermissionRole({
                apiBaseUrl:
                  API_BASE,

                accessToken:
                  session.accessToken,
              });

            console.log(
              `P02_DELETE_RESPONSE_STATUS=${mutation.status}`,
            );

            console.log(
              `P02_MUTATION_REQUEST_COUNT=${mutation.mutationRequestCount}`,
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
                .observedRole ===
                null ||
              !r4PermissionRoleMatches(
                review.preflight
                  .observedRole,
              ) ||
              review.preflight
                .observedOwners ===
                null ||
              review.preflight
                .observedOwners.length !==
                0 ||
              review.preflight
                .prerequisiteResourcePresent !==
                true ||
              review.preflight
                .recoveryOfReceiptId !==
                P02_RECOVERY_OF_RECEIPT_ID ||
              review.preflight
                .recoveryOfReceiptSha256 !==
                P02_RECOVERY_OF_RECEIPT_SHA256 ||
              review.expectedDelta
                .summary !==
                P02_ROLE_DELETE_DELTA_SUMMARY ||
              review.impact
                .certainty !==
                "KNOWN"
            ) {
              throw new Error(
                "Frozen P02 review packet does not satisfy the approved verified-recovery contract.",
              );
            }

            console.log(
              `P02_REVIEWED_PREFLIGHT_DIGEST=${review.preflightDigest}`,
            );
            console.log(
              "P02_REVIEWED_DELTA=EXACT_P01_ROLE_TO_ABSENCE_RESOURCE_PRESERVED",
            );
            console.log(
              "P02_IMPACT_CERTAINTY=KNOWN",
            );
            console.log(
              "P02_RECOVERY_REVIEW=PASS",
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
                  "P02 generic receipt write acknowledgement does not match certified receipt identity.",
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
    `P02_CERTIFICATION_OUTCOME=${result.outcome}`,
  );
  console.log(
    `P02_FINAL_ACTION_STATE=${result.record.state}`,
  );
  console.log(
    `P02_EVENT_COUNT=${result.events.length}`,
  );
  console.log(
    `P02_PROOF_RESULT_COUNT=${result.proofResults.length}`,
  );
  console.log(
    `P02_CERTIFICATION_REASON=${result.reason ?? "NONE"}`,
  );

  for (
    const event
    of result.events
  ) {
    console.log(
      "P02_EVENT_LEDGER=" +
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
      `P02 certification did not close VERIFIED. Reason=${result.reason ?? "none"}`,
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
      "P02 proof-plane semantics are incorrect.",
    );
  }

  const [
    afterRole,
    afterResourcePresent,
  ] =
    await Promise.all([
      readR4PermissionRole({
        apiBaseUrl:
          API_BASE,

        accessToken:
          session.accessToken,
      }),

      readR4PermissionResourceExists({
        apiBaseUrl:
          API_BASE,

        accessToken:
          session.accessToken,
      }),
    ]);

  if (
    afterRole !==
      null ||
    !afterResourcePresent
  ) {
    throw new Error(
      "P02 independent authoritative recovery readback is not exact.",
    );
  }

  console.log(
    "P02_AUTHORITATIVE_ROLE_ABSENCE=PASS",
  );
  console.log(
    "P02_PREREQUISITE_RESOURCE_PRESERVED=PASS",
  );
  console.log(
    "P02_PERMISSION_EFFECT_NOT_APPLICABLE=PASS",
  );
  console.log(
    "P02_P01_RELEVANT_PRESTATE_RESTORED=PASS",
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

  const targetIds =
    targetHistoryAfter
      .map(
        (
          summary,
        ) =>
          summary.receiptId,
      )
      .sort();

  const expectedTargetIds =
    [
      P02_RECOVERY_OF_RECEIPT_ID,
      RECEIPT_ID,
    ].sort();

  if (
    targetHistoryAfter.length !==
      2 ||
    JSON.stringify(
      targetIds,
    ) !==
      JSON.stringify(
        expectedTargetIds,
      )
  ) {
    throw new Error(
      "P02 target history does not contain exactly P01 plus P02 receipts.",
    );
  }

  const p02Receipt =
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
    p02Receipt.receiptId !==
      result.receipt.receiptId ||
    p02Receipt.receiptSha256 !==
      result.receipt.receiptSha256 ||
    p02Receipt.actionType !==
      "ROLE_DELETE"
  ) {
    throw new Error(
      "P02 exact durable receipt readback differs from the certified receipt.",
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
        `Historical predecessor changed after P02: ${predecessor.receiptId}.`,
      );
    }
  }

  console.log(
    "P02_TARGET_HISTORY_POSTSTATE_COUNT=2",
  );
  console.log(
    `P02_RECEIPT_ID=${p02Receipt.receiptId}`,
  );
  console.log(
    `P02_RECEIPT_SHA256=${p02Receipt.receiptSha256}`,
  );
  console.log(
    "P02_GENERIC_RECEIPT_EXACT_READBACK=PASS",
  );
  console.log(
    "P02_ALL_PREDECESSOR_RECEIPTS_UNCHANGED=PASS",
  );
  console.log(
    "P02_VERIFIED_RECOVERY=PASS",
  );
  console.log(
    "R4_B_P02_LIVE_CERTIFICATION=PASS",
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
