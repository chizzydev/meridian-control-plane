import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  ActionReceiptV2,
} from "../../proof/receipt";

import type {
  OrdersWebAppObservedState,
} from "../../iris/web-app-action-transport";

import {
  certifyW03WebAppEnableAction,
  createW03WebAppEnableProofContract,
  reconcileUnknownW03WebAppEnable,
  W02_WEB_APP_MATCH_ROLES,
  W02_WEB_APP_ROUTING_STATE,
  W03_WEB_APP_ENABLE_INTENT,
  W03_WEB_APP_MATCH_ROLES,
  W03_WEB_APP_ROUTING_STATE,
} from "./enable";

import {
  ORDERS_WEB_APP_FIXTURE_ID,
  ORDERS_WEB_APP_GENERATION,
  ORDERS_WEB_APP_HELPER_EXECUTION_ROLE,
  W02_ORDERS_WEB_APP_EXPECTED,
  W03_ORDERS_WEB_APP_EXPECTED,
} from "./fixture";

const HEALTH =
  Object.freeze({
    url:
      "http://localhost:52773/meridian-lab/orders/health",

    status:
      200,

    body:
      Object.freeze({
        ok:
          1 as const,

        fixtureId:
          ORDERS_WEB_APP_FIXTURE_ID,

        generation:
          ORDERS_WEB_APP_GENERATION,

        service:
          "orders" as const,

        state:
          "READY" as const,
      }),
  });

const W02_STATE =
  Object.freeze({
    configuration:
      W02_ORDERS_WEB_APP_EXPECTED,

    routing:
      W02_WEB_APP_ROUTING_STATE,

    matchRoles:
      W02_WEB_APP_MATCH_ROLES,
  });

const W03_STATE =
  Object.freeze({
    configuration:
      W03_ORDERS_WEB_APP_EXPECTED,

    routing:
      W03_WEB_APP_ROUTING_STATE,

    matchRoles:
      W03_WEB_APP_MATCH_ROLES,
  });

describe(
  "final W03 WEB_APP_ENABLE app-scoped helper-role proof path",
  () => {
    it(
      "reviews Enabled, CSPZENEnabled, and app-scoped MatchRoles while preserving Recurse",
      async () => {
        const contract =
          createW03WebAppEnableProofContract({
            async readState() {
              return W02_STATE;
            },

            async executeEnable() {
            },

            async probeHealth() {
              return HEALTH;
            },
          });

        const preflight =
          await contract.preflight(
            {
              actionId:
                "test-w03-corrected",
              logicalActor:
                "test",
              irisRuntimeUser:
                "meridian.runtime",
              nowUtc:
                "2026-09-20T23:45:00.000Z",
            },
            W03_WEB_APP_ENABLE_INTENT,
          );

        const delta =
          contract.expectedDelta(
            W03_WEB_APP_ENABLE_INTENT,
            preflight,
          );

        expect(
          delta.before,
        ).toMatchObject({
          enabled:
            false,
          recurse:
            true,
          cspZenEnabled:
            false,
          matchRoles:
            [],
        });

        expect(
          delta.after,
        ).toMatchObject({
          enabled:
            true,
          recurse:
            true,
          cspZenEnabled:
            true,
          matchRoles: [
            ORDERS_WEB_APP_HELPER_EXECUTION_ROLE,
          ],
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
      "marks routing drift stale with zero mutation",
      async () => {
        let executeCount =
          0;

        let state:
          OrdersWebAppObservedState =
          W02_STATE;

        const contract =
          createW03WebAppEnableProofContract({
            async readState() {
              return state;
            },

            async executeEnable() {
              executeCount +=
                1;
            },

            async probeHealth() {
              return HEALTH;
            },
          });

        const preflight =
          await contract.preflight(
            {
              actionId:
                "test-w03-corrected",
              logicalActor:
                "test",
              irisRuntimeUser:
                "meridian.runtime",
              nowUtc:
                "2026-09-20T23:45:00.000Z",
            },
            W03_WEB_APP_ENABLE_INTENT,
          );

        state =
          Object.freeze({
            configuration:
              W02_ORDERS_WEB_APP_EXPECTED,

            routing:
              W03_WEB_APP_ROUTING_STATE,

            matchRoles:
              W02_WEB_APP_MATCH_ROLES,
          });

        const decision =
          await contract.revalidate(
            {
              actionId:
                "test-w03-corrected",
              logicalActor:
                "test",
              irisRuntimeUser:
                "meridian.runtime",
              nowUtc:
                "2026-09-20T23:45:01.000Z",
            },
            {
              intent:
                W03_WEB_APP_ENABLE_INTENT,
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
      "marks MatchRoles drift stale with zero mutation",
      async () => {
        let executeCount =
          0;

        let state:
          OrdersWebAppObservedState =
          W02_STATE;

        const contract =
          createW03WebAppEnableProofContract({
            async readState() {
              return state;
            },

            async executeEnable() {
              executeCount +=
                1;
            },

            async probeHealth() {
              return HEALTH;
            },
          });

        const preflight =
          await contract.preflight(
            {
              actionId:
                "test-w03-final-matchroles",
              logicalActor:
                "test",
              irisRuntimeUser:
                "meridian.runtime",
              nowUtc:
                "2026-09-21T00:30:00.000Z",
            },
            W03_WEB_APP_ENABLE_INTENT,
          );

        state =
          Object.freeze({
            configuration:
              W02_ORDERS_WEB_APP_EXPECTED,

            routing:
              W02_WEB_APP_ROUTING_STATE,

            matchRoles:
              W03_WEB_APP_MATCH_ROLES,
          });

        const decision =
          await contract.revalidate(
            {
              actionId:
                "test-w03-final-matchroles",
              logicalActor:
                "test",
              irisRuntimeUser:
                "meridian.runtime",
              nowUtc:
                "2026-09-21T00:30:01.000Z",
            },
            {
              intent:
                W03_WEB_APP_ENABLE_INTENT,
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
      "reconciles only exact final W03 as applied and exact restored W02 as not applied",
      () => {
        expect(
          reconcileUnknownW03WebAppEnable(
            W03_STATE,
          ).outcome,
        ).toBe(
          "APPLIED",
        );

        expect(
          reconcileUnknownW03WebAppEnable(
            W02_STATE,
          ),
        ).toEqual({
          outcome:
            "NOT_APPLIED",
          reason:
            "AUTHORITATIVE_READBACK_CONFIRMED_EXACT_W02_PRESTATE",
        });

        expect(
          reconcileUnknownW03WebAppEnable({
            configuration:
              W03_ORDERS_WEB_APP_EXPECTED,

            routing:
              W02_WEB_APP_ROUTING_STATE,

            matchRoles:
              W03_WEB_APP_MATCH_ROLES,
          }).outcome,
        ).toBe(
          "STILL_UNKNOWN",
        );
      },
    );

    it(
      "closes VERIFIED only after final routing, app-scoped helper role, live HTTP evidence, and receipt readback",
      async () => {
        let now =
          Date.parse(
            "2026-09-20T23:45:00.000Z",
          );

        let state:
          OrdersWebAppObservedState =
          W02_STATE;

        let persisted:
          ActionReceiptV2 |
          null =
          null;

        const result =
          await certifyW03WebAppEnableAction(
            {
              intent:
                W03_WEB_APP_ENABLE_INTENT,

              actionId:
                "w03-web-app-enable-r3b-c-r2f-test",

              receiptId:
                "meridian-w03-web-app-enable-r3b-c-r2f-test",

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

                async executeEnable() {
                  state =
                    W03_STATE;
                },

                async probeHealth() {
                  return HEALTH;
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
                        "Missing final W03 test receipt.",
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

        expect(
          result.receipt?.actionType,
        ).toBe(
          "WEB_APP_ENABLE",
        );
      },
    );

    it(
      "does not persist a W03 receipt when READY HTTP behavior is missing",
      async () => {
        let now =
          Date.parse(
            "2026-09-20T23:45:00.000Z",
          );

        let state:
          OrdersWebAppObservedState =
          W02_STATE;

        let persistCount =
          0;

        const result =
          await certifyW03WebAppEnableAction(
            {
              intent:
                W03_WEB_APP_ENABLE_INTENT,

              actionId:
                "w03-web-app-enable-r3b-c-r2f-bad-http",

              receiptId:
                "meridian-w03-web-app-enable-r3b-c-r2f-bad-http",

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

                async executeEnable() {
                  state =
                    W03_STATE;
                },

                async probeHealth() {
                  return {
                    ...HEALTH,
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
                  async persist() {
                    persistCount +=
                      1;
                  },

                  async read() {
                    throw new Error(
                      "Receipt read must not occur after failed final W03 HTTP proof.",
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
