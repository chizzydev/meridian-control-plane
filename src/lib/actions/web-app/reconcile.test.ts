import {
  describe,
  expect,
  it,
} from "vitest";

import {
  W01_ORDERS_WEB_APP_EXPECTED,
} from "./fixture";

import {
  reconcileUnknownW01WebAppCreate,
} from "./reconcile";

describe(
  "W01 unknown-after-dispatch reconciliation",
  () => {
    it(
      "proves applied only from the exact authoritative poststate",
      () => {
        const decision =
          reconcileUnknownW01WebAppCreate(
            W01_ORDERS_WEB_APP_EXPECTED,
          );

        expect(
          decision.outcome,
        ).toBe(
          "APPLIED",
        );

        if (
          decision.outcome ===
            "APPLIED"
        ) {
          expect(
            decision.execution
              .resolutionSource,
          ).toBe(
            "AUTHORITATIVE_RECONCILIATION_READBACK",
          );
        }
      },
    );

    it(
      "proves not applied from authoritative absence",
      () => {
        expect(
          reconcileUnknownW01WebAppCreate(
            null,
          ),
        ).toEqual({
          outcome:
            "NOT_APPLIED",
          reason:
            "AUTHORITATIVE_READBACK_CONFIRMED_TARGET_ABSENT",
        });
      },
    );

    it(
      "keeps a partial or alien poststate unknown",
      () => {
        expect(
          reconcileUnknownW01WebAppCreate({
            ...W01_ORDERS_WEB_APP_EXPECTED,
            enabled:
              true,
          }).outcome,
        ).toBe(
          "STILL_UNKNOWN",
        );
      },
    );
  },
);
