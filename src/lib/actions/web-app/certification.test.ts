import {
  describe,
  expect,
  it,
} from "vitest";

import {
  type ActionReceiptV2,
} from "../../proof/receipt";

import {
  certifyW01WebAppCreateAction,
} from "./certification";

import {
  W01_WEB_APP_CREATE_INTENT,
} from "./contract";

import {
  W01_ORDERS_WEB_APP_EXPECTED,
} from "./fixture";

describe(
  "W01 full Verified Action certification",
  () => {
    it(
      "closes only after proof evidence and exact receipt readback",
      async () => {
        let now =
          Date.parse(
            "2026-09-20T20:00:00.000Z",
          );

        let observed:
          typeof W01_ORDERS_WEB_APP_EXPECTED |
          null =
          null;

        let persisted:
          ActionReceiptV2 |
          null =
          null;

        const result =
          await certifyW01WebAppCreateAction(
            {
              intent:
                W01_WEB_APP_CREATE_INTENT,

              actionId:
                "w01-web-app-create-test",

              receiptId:
                "meridian-w01-web-app-create-test",

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

                async executeCreate() {
                  observed =
                    W01_ORDERS_WEB_APP_EXPECTED;
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
                    const current =
                      persisted;

                    if (
                      current ===
                        null ||
                      current.receiptId !==
                        receiptId
                    ) {
                      throw new Error(
                        "Missing persisted test receipt.",
                      );
                    }

                    return current;
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
          result.record.state,
        ).toBe(
          "VERIFIED",
        );

        expect(
          result.receipt?.actionType,
        ).toBe(
          "WEB_APP_CREATE",
        );

        expect(
          result.receipt?.target
            .canonicalId,
        ).toBe(
          "web-app:/meridian-lab/orders",
        );

        expect(
          result.automaticRetryAllowed,
        ).toBe(
          false,
        );
      },
    );
  },
);
