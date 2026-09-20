import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  ActionReceiptV2,
} from "../../proof/receipt";

import {
  createW02WebAppUpdateProofContract,
  certifyW02WebAppUpdateAction,
  reconcileUnknownW02WebAppUpdate,
  W02_WEB_APP_UPDATE_INTENT,
} from "./update";

import {
  ORDERS_WEB_APP_DESCRIPTION_CREATE,
  ORDERS_WEB_APP_DESCRIPTION_UPDATE,
  W01_ORDERS_WEB_APP_EXPECTED,
  W02_ORDERS_WEB_APP_EXPECTED,
} from "./fixture";

describe(
  "W02 WEB_APP_UPDATE proof path",
  () => {
    it(
      "binds a description-only disabled delta",
      async () => {
        const contract =
          createW02WebAppUpdateProofContract({
            async readConfiguredApp() {
              return W01_ORDERS_WEB_APP_EXPECTED;
            },

            async executeUpdate() {
            },
          });

        const preflight =
          await contract.preflight(
            {
              actionId:
                "test-w02",
              logicalActor:
                "test",
              irisRuntimeUser:
                "meridian.runtime",
              nowUtc:
                "2026-09-20T22:00:00.000Z",
            },
            W02_WEB_APP_UPDATE_INTENT,
          );

        const delta =
          contract.expectedDelta(
            W02_WEB_APP_UPDATE_INTENT,
            preflight,
          );

        expect(
          delta.before.description,
        ).toBe(
          ORDERS_WEB_APP_DESCRIPTION_CREATE,
        );

        expect(
          delta.after.description,
        ).toBe(
          ORDERS_WEB_APP_DESCRIPTION_UPDATE,
        );

        expect(
          delta.before.enabled,
        ).toBe(
          false,
        );

        expect(
          delta.after.enabled,
        ).toBe(
          false,
        );
      },
    );

    it(
      "marks post-review drift stale with zero mutation",
      async () => {
        let executeCount =
          0;

        let observed =
          W01_ORDERS_WEB_APP_EXPECTED;

        const contract =
          createW02WebAppUpdateProofContract({
            async readConfiguredApp() {
              return observed;
            },

            async executeUpdate() {
              executeCount +=
                1;
            },
          });

        const preflight =
          await contract.preflight(
            {
              actionId:
                "test-w02",
              logicalActor:
                "test",
              irisRuntimeUser:
                "meridian.runtime",
              nowUtc:
                "2026-09-20T22:00:00.000Z",
            },
            W02_WEB_APP_UPDATE_INTENT,
          );

        observed =
          W02_ORDERS_WEB_APP_EXPECTED;

        const decision =
          await contract.revalidate(
            {
              actionId:
                "test-w02",
              logicalActor:
                "test",
              irisRuntimeUser:
                "meridian.runtime",
              nowUtc:
                "2026-09-20T22:00:01.000Z",
            },
            {
              intent:
                W02_WEB_APP_UPDATE_INTENT,
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
      "reconciles exact W02 as applied, exact W01 as not applied, and anything else as unknown",
      () => {
        expect(
          reconcileUnknownW02WebAppUpdate(
            W02_ORDERS_WEB_APP_EXPECTED,
          ).outcome,
        ).toBe(
          "APPLIED",
        );

        expect(
          reconcileUnknownW02WebAppUpdate(
            W01_ORDERS_WEB_APP_EXPECTED,
          ),
        ).toEqual({
          outcome:
            "NOT_APPLIED",
          reason:
            "AUTHORITATIVE_READBACK_CONFIRMED_EXACT_W01_PRESTATE",
        });

        expect(
          reconcileUnknownW02WebAppUpdate(
            null,
          ).outcome,
        ).toBe(
          "STILL_UNKNOWN",
        );
      },
    );

    it(
      "closes VERIFIED only after W02 proof and receipt readback",
      async () => {
        let now =
          Date.parse(
            "2026-09-20T22:00:00.000Z",
          );

        let observed =
          W01_ORDERS_WEB_APP_EXPECTED;

        let persisted:
          ActionReceiptV2 |
          null =
          null;

        const result =
          await certifyW02WebAppUpdateAction(
            {
              intent:
                W02_WEB_APP_UPDATE_INTENT,

              actionId:
                "w02-web-app-update-test",

              receiptId:
                "meridian-w02-web-app-update-test",

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

                async executeUpdate() {
                  observed =
                    W02_ORDERS_WEB_APP_EXPECTED;
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
                        "Missing persisted W02 test receipt.",
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
          "WEB_APP_UPDATE",
        );

        expect(
          result.receipt?.recovery.available,
        ).toBe(
          false,
        );
      },
    );
  },
);
