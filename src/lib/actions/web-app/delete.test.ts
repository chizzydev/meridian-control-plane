import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  ActionReceiptV2,
} from "../../proof/receipt";

import type {
  OrdersWebAppHealthProbe,
  OrdersWebAppObservedState,
} from "../../iris/web-app-action-transport";

import {
  W03_ORDERS_WEB_APP_EXPECTED,
} from "./fixture";

import {
  W03_WEB_APP_MATCH_ROLES,
  W03_WEB_APP_ROUTING_STATE,
} from "./enable";

import {
  certifyW04WebAppDeleteAction,
  createW04WebAppDeleteProofContract,
  reconcileUnknownW04WebAppDelete,
  W04_WEB_APP_DELETE_INTENT,
} from "./delete";

const READY =
  Object.freeze({
    url:
      "http://localhost:52773/meridian-lab/orders/health",

    status:
      200,

    body:
      Object.freeze({
        ok:
          1,

        fixtureId:
          "meridian-lab-orders",

        generation:
          "r3b-web-app-v1",

        service:
          "orders",

        state:
          "READY",
      }),
  });

const ABSENT_HEALTH =
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
  });

const FINAL_W03_STATE:
  OrdersWebAppObservedState =
  Object.freeze({
    configuration:
      W03_ORDERS_WEB_APP_EXPECTED,

    routing:
      W03_WEB_APP_ROUTING_STATE,

    matchRoles:
      W03_WEB_APP_MATCH_ROLES,
  });

const ABSENT_STATE:
  OrdersWebAppObservedState =
  Object.freeze({
    configuration:
      null,

    routing:
      null,

    matchRoles:
      null,
  });

describe(
  "W04 WEB_APP_DELETE proof path",
  () => {
    it(
      "reviews exact final W03 to complete application absence",
      async () => {
        const contract =
          createW04WebAppDeleteProofContract({
            async readState() {
              return FINAL_W03_STATE;
            },

            async executeDelete() {
            },

            async probeHealth() {
              return READY;
            },
          });

        const preflight =
          await contract.preflight(
            {
              actionId:
                "test-w04",
              logicalActor:
                "test",
              irisRuntimeUser:
                "meridian.runtime",
              nowUtc:
                "2026-09-21T00:00:00.000Z",
            },
            W04_WEB_APP_DELETE_INTENT,
          );

        const delta =
          contract.expectedDelta(
            W04_WEB_APP_DELETE_INTENT,
            preflight,
          );

        expect(
          delta.before,
        ).toMatchObject({
          present:
            true,
          enabled:
            true,
          cspZenEnabled:
            true,
          httpStatus:
            200,
        });

        expect(
          delta.after,
        ).toEqual({
          present:
            false,
          httpStatus:
            404,
        });

        expect(
          contract.proofRequirements.map(
            (
              requirement,
            ) =>
              [
                requirement.plane,
                requirement.applicability,
              ],
          ),
        ).toEqual([
          [
            "CONFIGURATION_READBACK",
            "REQUIRED",
          ],
          [
            "HTTP_BEHAVIOR",
            "REQUIRED",
          ],
        ]);
      },
    );

    it(
      "marks disappearance after review stale with zero delete dispatch",
      async () => {
        let executeCount =
          0;

        let state:
          OrdersWebAppObservedState =
          FINAL_W03_STATE;

        const contract =
          createW04WebAppDeleteProofContract({
            async readState() {
              return state;
            },

            async executeDelete() {
              executeCount +=
                1;
            },

            async probeHealth() {
              return (
                state.configuration ===
                  null
              )
                ? ABSENT_HEALTH
                : READY;
            },
          });

        const preflight =
          await contract.preflight(
            {
              actionId:
                "test-w04",
              logicalActor:
                "test",
              irisRuntimeUser:
                "meridian.runtime",
              nowUtc:
                "2026-09-21T00:00:00.000Z",
            },
            W04_WEB_APP_DELETE_INTENT,
          );

        state =
          ABSENT_STATE;

        const decision =
          await contract.revalidate(
            {
              actionId:
                "test-w04",
              logicalActor:
                "test",
              irisRuntimeUser:
                "meridian.runtime",
              nowUtc:
                "2026-09-21T00:00:01.000Z",
            },
            {
              intent:
                W04_WEB_APP_DELETE_INTENT,
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
      "reconciles complete absence as applied and exact W03 as not applied",
      () => {
        expect(
          reconcileUnknownW04WebAppDelete(
            ABSENT_STATE,
          ).outcome,
        ).toBe(
          "APPLIED",
        );

        expect(
          reconcileUnknownW04WebAppDelete(
            FINAL_W03_STATE,
          ),
        ).toEqual({
          outcome:
            "NOT_APPLIED",
          reason:
            "AUTHORITATIVE_READBACK_CONFIRMED_EXACT_FINAL_W03_PRESTATE",
        });
      },
    );

    it(
      "closes VERIFIED only after authoritative absence, HTTP 404, persistence, and readback",
      async () => {
        let now =
          Date.parse(
            "2026-09-21T00:00:00.000Z",
          );

        let state:
          OrdersWebAppObservedState =
          FINAL_W03_STATE;

        let health:
          OrdersWebAppHealthProbe =
          READY;

        let persisted:
          ActionReceiptV2 |
          null =
          null;

        const result =
          await certifyW04WebAppDeleteAction(
            {
              intent:
                W04_WEB_APP_DELETE_INTENT,

              actionId:
                "w04-web-app-delete-test",

              receiptId:
                "meridian-w04-web-app-delete-test",

              logicalActor:
                "test-operator",

              irisRuntimeUser:
                "meridian.runtime",
            },
            {
              contract: {
                async readState() {
                  return state;
                },

                async executeDelete() {
                  state =
                    ABSENT_STATE;

                  health =
                    ABSENT_HEALTH;
                },

                async probeHealth() {
                  return health;
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
                        "Missing W04 test receipt.",
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
          "WEB_APP_DELETE",
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
      "refuses receipt persistence when post-delete HTTP behavior is not exact 404",
      async () => {
        let now =
          Date.parse(
            "2026-09-21T00:00:00.000Z",
          );

        let state:
          OrdersWebAppObservedState =
          FINAL_W03_STATE;

        let persistCount =
          0;

        const result =
          await certifyW04WebAppDeleteAction(
            {
              intent:
                W04_WEB_APP_DELETE_INTENT,

              actionId:
                "w04-web-app-delete-bad-http",

              receiptId:
                "meridian-w04-web-app-delete-bad-http",

              logicalActor:
                "test-operator",

              irisRuntimeUser:
                "meridian.runtime",
            },
            {
              contract: {
                async readState() {
                  return state;
                },

                async executeDelete() {
                  state =
                    ABSENT_STATE;
                },

                async probeHealth() {
                  return (
                    state.configuration ===
                      null
                  )
                    ? {
                        ...ABSENT_HEALTH,
                        status:
                          403,
                      }
                    : READY;
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
                      "W04 receipt read must not occur after failed HTTP absence proof.",
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
