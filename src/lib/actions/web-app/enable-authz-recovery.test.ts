import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  ActionReceiptV2,
} from "../../proof/receipt";

import {
  certifyW03AuthzRecoveryAction,
  createW03AuthzRecoveryProofContract,
  reconcileUnknownW03AuthzRecovery,
  type OrdersWebAppRoutingState,
  W03_AUTHZ_RECOVERY_INTENT,
} from "./enable-authz-recovery";

import {
  W02_ORDERS_WEB_APP_EXPECTED,
  W03_ORDERS_WEB_APP_EXPECTED,
} from "./fixture";

const FAILED_CORRECTED_ROUTING =
  Object.freeze({
    recurse:
      true,

    cspZenEnabled:
      true,
  });

const RESTORED_W02_ROUTING =
  Object.freeze({
    recurse:
      true,

    cspZenEnabled:
      false,
  });

describe(
  "W03 corrected-enable authorization failure compensating recovery",
  () => {
    it(
      "reviews Enabled=true to false and CSPZENEnabled=true to false while preserving Recurse=true",
      async () => {
        const contract =
          createW03AuthzRecoveryProofContract({
            async readConfiguredApp() {
              return W03_ORDERS_WEB_APP_EXPECTED;
            },

            async readRoutingState() {
              return FAILED_CORRECTED_ROUTING;
            },

            async executeRestore() {
            },

            async observeDisabledHttp() {
              return {
                url:
                  "http://localhost:52773/meridian-lab/orders/health",
                status:
                  404,
              };
            },
          });

        const preflight =
          await contract.preflight(
            {
              actionId:
                "test-w03-authz-recovery",
              logicalActor:
                "test",
              irisRuntimeUser:
                "meridian.runtime",
              nowUtc:
                "2026-09-20T23:30:00.000Z",
            },
            W03_AUTHZ_RECOVERY_INTENT,
          );

        const delta =
          contract.expectedDelta(
            W03_AUTHZ_RECOVERY_INTENT,
            preflight,
          );

        expect(
          delta.before,
        ).toMatchObject({
          enabled:
            true,
          recurse:
            true,
          cspZenEnabled:
            true,
        });

        expect(
          delta.after,
        ).toMatchObject({
          enabled:
            false,
          recurse:
            true,
          cspZenEnabled:
            false,
        });
      },
    );

    it(
      "marks drift stale before compensating mutation",
      async () => {
        let executeCount =
          0;

        let enabled =
          true;

        const contract =
          createW03AuthzRecoveryProofContract({
            async readConfiguredApp() {
              return enabled
                ? W03_ORDERS_WEB_APP_EXPECTED
                : W02_ORDERS_WEB_APP_EXPECTED;
            },

            async readRoutingState() {
              return FAILED_CORRECTED_ROUTING;
            },

            async executeRestore() {
              executeCount +=
                1;
            },

            async observeDisabledHttp() {
              return {
                url:
                  "http://localhost:52773/meridian-lab/orders/health",
                status:
                  404,
              };
            },
          });

        const preflight =
          await contract.preflight(
            {
              actionId:
                "test-w03-authz-recovery",
              logicalActor:
                "test",
              irisRuntimeUser:
                "meridian.runtime",
              nowUtc:
                "2026-09-20T23:30:00.000Z",
            },
            W03_AUTHZ_RECOVERY_INTENT,
          );

        enabled =
          false;

        const decision =
          await contract.revalidate(
            {
              actionId:
                "test-w03-authz-recovery",
              logicalActor:
                "test",
              irisRuntimeUser:
                "meridian.runtime",
              nowUtc:
                "2026-09-20T23:30:01.000Z",
            },
            {
              intent:
                W03_AUTHZ_RECOVERY_INTENT,
              preflight,
              reviewedPreflightDigest:
                contract.digestPreflight(
                  preflight,
                ),
            },
          );

        expect(
          decision.outcome,
        ).toBe(
          "STALE",
        );

        expect(
          executeCount,
        ).toBe(
          0,
        );
      },
    );

    it(
      "reconciles exact restored W02 as applied and exact failed W03 as not applied",
      () => {
        expect(
          reconcileUnknownW03AuthzRecovery(
            W02_ORDERS_WEB_APP_EXPECTED,
            RESTORED_W02_ROUTING,
          ).outcome,
        ).toBe(
          "APPLIED",
        );

        expect(
          reconcileUnknownW03AuthzRecovery(
            W03_ORDERS_WEB_APP_EXPECTED,
            FAILED_CORRECTED_ROUTING,
          ),
        ).toEqual({
          outcome:
            "NOT_APPLIED",
          reason:
            "AUTHORITATIVE_READBACK_CONFIRMED_FAILED_W03_PRESTATE",
        });
      },
    );

    it(
      "persists a recovery receipt only after exact restoration and disabled HTTP evidence",
      async () => {
        let now =
          Date.parse(
            "2026-09-20T23:30:00.000Z",
          );

        let observed =
          W03_ORDERS_WEB_APP_EXPECTED;

        let routing:
          OrdersWebAppRoutingState =
          FAILED_CORRECTED_ROUTING;

        let persisted:
          ActionReceiptV2 |
          null =
          null;

        const result =
          await certifyW03AuthzRecoveryAction(
            {
              intent:
                W03_AUTHZ_RECOVERY_INTENT,

              actionId:
                "w03-authz-recovery-test",

              receiptId:
                "meridian-w03-authz-recovery-test",

              logicalActor:
                "test-operator",

              irisRuntimeUser:
                "meridian.runtime",
            },
            {
              contract: {
                async readConfiguredApp() {
                  return observed;
                },

                async readRoutingState() {
                  return routing;
                },

                async executeRestore() {
                  observed =
                    W02_ORDERS_WEB_APP_EXPECTED;

                  routing =
                    RESTORED_W02_ROUTING;
                },

                async observeDisabledHttp() {
                  return {
                    url:
                      "http://localhost:52773/meridian-lab/orders/health",
                    status:
                      404,
                  };
                },
              },

              certification: {
                nowUtc() {
                  now +=
                    1000;

                  return new Date(
                    now,
                  ).toISOString();
                },

                async reviewPreflight(
                  review,
                ) {
                  return review
                    .preflightDigest;
                },

                receiptStore: {
                  async persist(
                    receipt,
                  ) {
                    persisted =
                      receipt;
                  },

                  async read(
                    receiptId,
                  ) {
                    if (
                      persisted ===
                        null ||
                      persisted.receiptId !==
                        receiptId
                    ) {
                      throw new Error(
                        "Missing recovery test receipt.",
                      );
                    }

                    return persisted;
                  },
                },
              },
            },
          );

        expect(
          result.outcome,
        ).toBe(
          "VERIFIED",
        );

        expect(
          result.receipt?.actionType,
        ).toBe(
          "WEB_APP_ENABLE_RECOVERY",
        );

        expect(
          result.proofResults.map(
            (
              proof,
            ) =>
              [
                proof.plane,
                proof.status,
              ],
          ),
        ).toEqual([
          [
            "CONFIGURATION_READBACK",
            "PASS",
          ],
          [
            "HTTP_BEHAVIOR",
            "PASS",
          ],
        ]);
      },
    );

    it(
      "refuses recovery receipt closure unless disabled health is exactly 404",
      async () => {
        let now =
          Date.parse(
            "2026-09-20T23:30:00.000Z",
          );

        let observed =
          W03_ORDERS_WEB_APP_EXPECTED;

        let routing:
          OrdersWebAppRoutingState =
          FAILED_CORRECTED_ROUTING;

        let persistCount =
          0;

        const result =
          await certifyW03AuthzRecoveryAction(
            {
              intent:
                W03_AUTHZ_RECOVERY_INTENT,

              actionId:
                "w03-authz-recovery-bad-http",

              receiptId:
                "meridian-w03-authz-recovery-bad-http",

              logicalActor:
                "test-operator",

              irisRuntimeUser:
                "meridian.runtime",
            },
            {
              contract: {
                async readConfiguredApp() {
                  return observed;
                },

                async readRoutingState() {
                  return routing;
                },

                async executeRestore() {
                  observed =
                    W02_ORDERS_WEB_APP_EXPECTED;

                  routing =
                    RESTORED_W02_ROUTING;
                },

                async observeDisabledHttp() {
                  return {
                    url:
                      "http://localhost:52773/meridian-lab/orders/health",
                    status:
                      500,
                  };
                },
              },

              certification: {
                nowUtc() {
                  now +=
                    1000;

                  return new Date(
                    now,
                  ).toISOString();
                },

                async reviewPreflight(
                  review,
                ) {
                  return review
                    .preflightDigest;
                },

                receiptStore: {
                  async persist() {
                    persistCount +=
                      1;
                  },

                  async read() {
                    throw new Error(
                      "Recovery receipt read must not occur after bad HTTP evidence.",
                    );
                  },
                },
              },
            },
          );

        expect(
          result.outcome,
        ).toBe(
          "VERIFY_FAILED",
        );

        expect(
          persistCount,
        ).toBe(
          0,
        );
      },
    );
  },
);
