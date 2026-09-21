import {
  describe,
  expect,
  it,
} from "vitest";

import {
  ORDERS_WEB_APP_FIXTURE_ID,
  ORDERS_WEB_APP_GENERATION,
  ORDERS_WEB_APP_NAME,
  ORDERS_WEB_APP_TARGET_CANONICAL_ID,
} from "../actions/web-app/fixture";

import {
  buildActionReceiptHistoryRecord,
} from "../proof/action-history";

import {
  digestCanonicalJson,
} from "../proof/digest";

import {
  buildActionReceiptV2,
} from "../proof/receipt";

import {
  buildSafeWebRestLifecycleView,
} from "./web-rest-history-view";

function frozenReceipt() {
  const proofResults =
    Object.freeze([
      Object.freeze({
        requirementId:
          "r3c-test-configuration",

        plane:
          "CONFIGURATION_READBACK" as const,

        applicability:
          "REQUIRED" as const,

        status:
          "PASS" as const,

        sourceType:
          "IRIS SysAdmin API",

        sourceReference:
          "GET /v2/web-app",

        observedAtUtc:
          "2026-09-21T00:00:03.000Z",

        expectedSummary:
          "Target is absent.",

        observedSummary:
          "Target is absent.",

        provenance:
          "AUTHORITATIVE_IRIS" as const,

        safeEvidenceDigest:
          digestCanonicalJson({
            absent:
              true,
          }),
      }),
    ]);

  return buildActionReceiptV2({
    receiptId:
      "meridian-r3c-test-receipt",

    actionId:
      "r3c-test-action",

    parentChangeSetId:
      null,

    actionType:
      "WEB_APP_DELETE",

    contractId:
      "meridian.r3c.test",

    contractVersion:
      1,

    domain:
      "WEB_REST",

    risk:
      "HIGH",

    reversibility:
      "COMPENSATABLE",

    target:
      Object.freeze({
        kind:
          "WEB_APP",

        canonicalId:
          ORDERS_WEB_APP_TARGET_CANONICAL_ID,

        displayName:
          ORDERS_WEB_APP_NAME,

        fixtureId:
          ORDERS_WEB_APP_FIXTURE_ID,

        generation:
          ORDERS_WEB_APP_GENERATION,
      }),

    actor:
      Object.freeze({
        logicalActor:
          "test",

        irisRuntimeUser:
          "meridian.runtime",
      }),

    authority:
      Object.freeze([
        Object.freeze({
          resource:
            "%Admin_Secure",

          permission:
            "U",

          standing:
            true,

          escalationOnly:
            false,
        }),
      ]),

    intentDigest:
      digestCanonicalJson({
        material:
          "intent",
      }),

    reviewedPreflightDigest:
      digestCanonicalJson({
        material:
          "review",
      }),

    freshRevalidationDigest:
      digestCanonicalJson({
        material:
          "review",
      }),

    executionDigest:
      digestCanonicalJson({
        material:
          "execution",
      }),

    evidenceDigest:
      digestCanonicalJson(
        proofResults,
      ),

    proofResults,

    lifecycle:
      Object.freeze({
        createdAtUtc:
          "2026-09-21T00:00:00.000Z",

        applyStartedAtUtc:
          "2026-09-21T00:00:01.000Z",

        applyCompletedAtUtc:
          "2026-09-21T00:00:02.000Z",

        evidenceCompletedAtUtc:
          "2026-09-21T00:00:03.000Z",
      }),

    recovery:
      Object.freeze({
        class:
          "COMPENSATABLE",

        available:
          false,

        recoveryActionType:
          null,
      }),

    terminalEventHash:
      digestCanonicalJson({
        material:
          "terminal-event",
      }),
  });
}

describe(
  "R3C Web/REST verified lifecycle view",
  () => {
    it(
      "binds durable receipt history while keeping current state a separate live recheck",
      () => {
        const receipt =
          frozenReceipt();

        const record =
          buildActionReceiptHistoryRecord(
            receipt,
          );

        const {
          receiptJson:
            ignored,
          ...summary
        } =
          record;

        void ignored;

        const view =
          buildSafeWebRestLifecycleView({
            summaries:
              [
                summary,
              ],

            receipts:
              [
                receipt,
              ],

            currentState:
              Object.freeze({
                configuration:
                  null,

                routing:
                  null,

                matchRoles:
                  null,
              }),

            currentHealth:
              Object.freeze({
                url:
                  "http://localhost:52773/meridian-lab/orders/health",

                status:
                  404,

                body:
                  Object.freeze({
                    ok:
                      -1,

                    fixtureId:
                      "",

                    generation:
                      "",

                    service:
                      "",

                    state:
                      "",
                  }),
              }),
          });

        expect(
          view.historyCount,
        ).toBe(
          1,
        );

        expect(
          view.historyIntegrity,
        ).toBe(
          "CANONICAL_HASH_VALIDATED",
        );

        expect(
          view.currentStateSource,
        ).toBe(
          "AUTHORITATIVE_CURRENT_RECHECK",
        );

        expect(
          view.currentApplicationState,
        ).toBe(
          "ABSENT",
        );

        expect(
          view.currentHttpStatus,
        ).toBe(
          404,
        );

        expect(
          view.receipts[0],
        ).toMatchObject({
          receiptId:
            receipt.receiptId,

          lifecycleState:
            "VERIFIED",

          receiptSha256:
            receipt.receiptSha256,
        });
      },
    );

    it(
      "refuses a summary that is not bound to the canonical full receipt",
      () => {
        const receipt =
          frozenReceipt();

        const record =
          buildActionReceiptHistoryRecord(
            receipt,
          );

        const {
          receiptJson:
            ignored,
          ...summary
        } =
          record;

        void ignored;

        expect(
          () =>
            buildSafeWebRestLifecycleView({
              summaries:
                [
                  {
                    ...summary,

                    receiptSha256:
                      "A".repeat(
                        64,
                      ),
                  },
                ],

              receipts:
                [
                  receipt,
                ],

              currentState:
                Object.freeze({
                  configuration:
                    null,

                  routing:
                    null,

                  matchRoles:
                    null,
                }),

              currentHealth:
                Object.freeze({
                  url:
                    "http://localhost:52773/meridian-lab/orders/health",

                  status:
                    404,

                  body:
                    Object.freeze({
                      ok:
                        -1,

                      fixtureId:
                        "",

                      generation:
                        "",

                      service:
                        "",

                      state:
                        "",
                    }),
                }),
            }),
        ).toThrow(
          "summary binding differs",
        );
      },
    );
  },
);
