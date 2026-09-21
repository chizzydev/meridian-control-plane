import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  ActionReceiptV2,
} from "../../proof/receipt";

import {
  buildP03UserAddRoleProofResults,
  certifyP03UserAddRoleAction,
  createP03UserAddRoleProofContract,
  p03ExpectedPostUserSnapshot,
  p03ExpectedPreUserSnapshot,
  p03ExpectedRoleObservations,
  p03PoststateMatches,
  p03PrestateMatches,
  p03UserAddRoleIntent,
  reconcileUnknownP03UserAddRole,
  type P03UserAddRolePreflight,
} from "./user-add-role";

function preflight(
  generation:
    string,
  state:
    "PRE" |
    "POST" =
      "PRE",
): P03UserAddRolePreflight {
  return Object.freeze({
    schemaVersion:
      "meridian.user-add-role-preflight.v1" as const,

    fixtureId:
      "meridian-live-demo-v1" as const,

    expectedFixtureGeneration:
      generation,

    user:
      state ===
        "PRE"
        ? p03ExpectedPreUserSnapshot()
        : p03ExpectedPostUserSnapshot(),

    roles:
      p03ExpectedRoleObservations(),

    credentialPresent:
      true,

    officialMutationOperation:
      "PUT /v2/security/user" as const,

    requiredAuthority:
      "%Admin_Secure:U" as const,

    authorityMode:
      "CURRENT_STANDING_RUNTIME_AUTHORITY" as const,
  });
}

describe(
  "P03 USER_ADD_ROLE proof path",
  () => {
    it(
      "freezes exact prestate and expected role-add delta",
      async () => {
        const generation =
          "p03-test-generation";

        const contract =
          createP03UserAddRoleProofContract({
            async readFreshPreflight() {
              return preflight(
                generation,
              );
            },

            async executeAdd() {
            },

            async collectProofResults() {
              return buildP03UserAddRoleProofResults({
                observedAtUtc:
                  "2026-09-21T00:00:10.000Z",

                configurationVerified:
                  true,

                permissionEffectVerified:
                  true,

                liveRuntimeConverged:
                  true,

                nativeAuditBound:
                  true,

                configurationSourceReference:
                  "config",

                permissionSourceReference:
                  "permissions",

                liveRuntimeSourceReference:
                  "runtime",

                nativeAuditSourceReference:
                  "audit",
              });
            },
          });

        const intent =
          p03UserAddRoleIntent(
            generation,
          );

        const observed =
          await contract.preflight(
            {
              actionId:
                "test-p03",

              logicalActor:
                "test",

              irisRuntimeUser:
                "meridian.runtime",

              nowUtc:
                "2026-09-21T00:00:00.000Z",
            },
            intent,
          );

        expect(
          p03PrestateMatches(
            observed,
          ),
        ).toBe(
          true,
        );

        const delta =
          contract.expectedDelta(
            intent,
            observed,
          );

        expect(
          delta.before,
        ).toMatchObject({
          gainedRolePresent:
            false,
        });

        expect(
          delta.after,
        ).toMatchObject({
          gainedRolePresent:
            true,
        });
      },
    );

    it(
      "returns typed stale preflight with zero mutation dispatch",
      async () => {
        const generation =
          "p03-stale-generation";

        let current =
          preflight(
            generation,
          );

        let mutationCount =
          0;

        const contract =
          createP03UserAddRoleProofContract({
            async readFreshPreflight() {
              return current;
            },

            async executeAdd() {
              mutationCount +=
                1;
            },

            async collectProofResults() {
              return Object.freeze([]);
            },
          });

        const intent =
          p03UserAddRoleIntent(
            generation,
          );

        const reviewed =
          await contract.preflight(
            {
              actionId:
                "test-p03-stale",

              logicalActor:
                "test",

              irisRuntimeUser:
                "meridian.runtime",

              nowUtc:
                "2026-09-21T00:00:00.000Z",
            },
            intent,
          );

        current =
          Object.freeze({
            ...current,

            credentialPresent:
              false,
          });

        const decision =
          await contract.revalidate(
            {
              actionId:
                "test-p03-stale",

              logicalActor:
                "test",

              irisRuntimeUser:
                "meridian.runtime",

              nowUtc:
                "2026-09-21T00:00:01.000Z",
            },
            {
              intent,

              preflight:
                reviewed,

              reviewedPreflightDigest:
                contract.digestPreflight(
                  reviewed,
                ),
            },
          );

        expect(
          decision.outcome,
        ).toBe(
          "STALE",
        );

        expect(
          mutationCount,
        ).toBe(
          0,
        );

        if (
          decision.outcome !==
            "STALE"
        ) {
          throw new Error(
            "Expected P03 stale decision.",
          );
        }

        expect(
          decision
            .freshPreflight
            .credentialPresent,
        ).toBe(
          false,
        );

        expect(
          decision.freshDigest,
        ).toMatch(
          /^[A-F0-9]{64}$/,
        );
      },
    );

    it(
      "reconciles exact poststate as applied, exact prestate as not applied, and drift as still unknown",
      () => {
        const generation =
          "p03-reconcile-generation";

        expect(
          reconcileUnknownP03UserAddRole(
            preflight(
              generation,
              "POST",
            ),
          ).outcome,
        ).toBe(
          "APPLIED",
        );

        expect(
          reconcileUnknownP03UserAddRole(
            preflight(
              generation,
              "PRE",
            ),
          ).outcome,
        ).toBe(
          "NOT_APPLIED",
        );

        expect(
          reconcileUnknownP03UserAddRole(
            Object.freeze({
              ...preflight(
                generation,
                "POST",
              ),

              credentialPresent:
                false,
            }),
          ).outcome,
        ).toBe(
          "STILL_UNKNOWN",
        );
      },
    );

    it(
      "closes VERIFIED with four required proof planes and exact receipt readback",
      async () => {
        const generation =
          "p03-verified-generation";

        let current =
          preflight(
            generation,
          );

        let persisted:
          ActionReceiptV2 |
          null =
          null;

        let now =
          Date.parse(
            "2026-09-21T00:00:00.000Z",
          );

        const result =
          await certifyP03UserAddRoleAction(
            {
              intent:
                p03UserAddRoleIntent(
                  generation,
                ),

              actionId:
                "p03-test-action",

              receiptId:
                "p03-test-receipt",

              logicalActor:
                "test-operator",

              irisRuntimeUser:
                "meridian.runtime",
            },
            {
              contract: {
                async readFreshPreflight() {
                  return current;
                },

                async executeAdd() {
                  current =
                    preflight(
                      generation,
                      "POST",
                    );
                },

                async collectProofResults() {
                  return buildP03UserAddRoleProofResults({
                    observedAtUtc:
                      "2026-09-21T00:00:10.000Z",

                    configurationVerified:
                      true,

                    permissionEffectVerified:
                      true,

                    liveRuntimeConverged:
                      true,

                    nativeAuditBound:
                      true,

                    configurationSourceReference:
                      "config",

                    permissionSourceReference:
                      "permission",

                    liveRuntimeSourceReference:
                      "runtime",

                    nativeAuditSourceReference:
                      "audit",
                  });
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
                        "Missing P03 test receipt.",
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
          "USER_ADD_ROLE",
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
            "PERMISSION_EFFECT",
            "PASS",
          ],
          [
            "LIVE_RUNTIME",
            "PASS",
          ],
          [
            "NATIVE_AUDIT",
            "PASS",
          ],
        ]);

        expect(
          p03PoststateMatches(
            current,
          ),
        ).toBe(
          true,
        );
      },
    );

    it(
      "refuses receipt closure when any required proof plane fails",
      async () => {
        const generation =
          "p03-proof-fail-generation";

        let current =
          preflight(
            generation,
          );

        let persistCount =
          0;

        let now =
          Date.parse(
            "2026-09-21T00:00:00.000Z",
          );

        const result =
          await certifyP03UserAddRoleAction(
            {
              intent:
                p03UserAddRoleIntent(
                  generation,
                ),

              actionId:
                "p03-proof-fail",

              receiptId:
                "p03-proof-fail-receipt",

              logicalActor:
                "test-operator",

              irisRuntimeUser:
                "meridian.runtime",
            },
            {
              contract: {
                async readFreshPreflight() {
                  return current;
                },

                async executeAdd() {
                  current =
                    preflight(
                      generation,
                      "POST",
                    );
                },

                async collectProofResults() {
                  return buildP03UserAddRoleProofResults({
                    observedAtUtc:
                      "2026-09-21T00:00:10.000Z",

                    configurationVerified:
                      true,

                    permissionEffectVerified:
                      true,

                    liveRuntimeConverged:
                      false,

                    nativeAuditBound:
                      true,

                    configurationSourceReference:
                      "config",

                    permissionSourceReference:
                      "permission",

                    liveRuntimeSourceReference:
                      "runtime",

                    nativeAuditSourceReference:
                      "audit",
                  });
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
                      "P03 receipt read must not occur after failed proof.",
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
