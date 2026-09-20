import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  DEMO_FIXTURE_DIRECT_ROLES_AFTER,
  DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
  DEMO_FIXTURE_DISPLAY_NAME,
  DEMO_FIXTURE_NAMESPACE,
  DEMO_FIXTURE_TARGET_ROLE,
  DEMO_FIXTURE_USERNAME,
} from "../../change-case/demo-fixture";

import {
  appliedDemoFixtureMutation,
} from "../../change-case/demo-fixture-apply";

import {
  buildUserRemoveRoleProofResults,
} from "./evidence";

import {
  certifyUserRemoveRoleAction,
} from "./certification";

function reviewable(
  digest:
    string = "A".repeat(
      64,
    ),
) {
  return {
    state:
      "PREFLIGHTED",
    digestAlgorithm:
      "SHA-256",
    digest,
    canonical: {
      schemaVersion:
        "meridian.preflight.v1",
      change: {
        username:
          DEMO_FIXTURE_USERNAME,
        operation:
          "REMOVE",
        role:
          DEMO_FIXTURE_TARGET_ROLE,
      },
    },
  };
}

function user(
  roles:
    readonly string[],
) {
  return {
    username:
      DEMO_FIXTURE_USERNAME,
    displayName:
      DEMO_FIXTURE_DISPLAY_NAME,
    namespace:
      DEMO_FIXTURE_NAMESPACE,
    enabled:
      true,
    directRoles:
      roles,
  };
}

function clock() {
  let tick =
    0;

  return () => {
    tick +=
      1;

    return new Date(
      Date.UTC(
        2026,
        8,
        20,
        16,
        0,
        tick,
      ),
    ).toISOString();
  };
}

describe(
  "USER_REMOVE_ROLE generic certification integration",
  () => {
    it(
      "runs the real role-removal adapter through the generic V2 receipt gate",
      async () => {
        let stored:
          unknown =
            null;

        const executeMutation =
          vi.fn(
            async () =>
              appliedDemoFixtureMutation({
                before:
                  user(
                    DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
                  ),
                after:
                  user(
                    DEMO_FIXTURE_DIRECT_ROLES_AFTER,
                  ),
              }),
          );

        const result =
          await certifyUserRemoveRoleAction(
            {
              intent: {
                fixtureId:
                  "meridian-live-demo-v1",
                username:
                  DEMO_FIXTURE_USERNAME,
                operation:
                  "REMOVE",
                role:
                  DEMO_FIXTURE_TARGET_ROLE,
                expectedFixtureGeneration:
                  "generation-certification-1",
              },
              actionId:
                "action:user-remove-role-001",
              receiptId:
                "receipt:user-remove-role-001",
              logicalActor:
                "certification-operator",
              irisRuntimeUser:
                "meridian.runtime",
            },
            {
              contract: {
                readFreshPreflight:
                  async () =>
                    reviewable(),

                executeMutation,

                readConfiguredUserForReconciliation:
                  async () =>
                    user(
                      DEMO_FIXTURE_DIRECT_ROLES_AFTER,
                    ),

                fixtureGenerationCurrent:
                  () =>
                    true,

                collectProofResults:
                  async () =>
                    buildUserRemoveRoleProofResults({
                      observedAtUtc:
                        "2026-09-20T16:00:20.000Z",
                      configurationVerified:
                        true,
                      permissionEffectVerified:
                        true,
                      liveRuntimeConverged:
                        true,
                      nativeAuditBound:
                        true,
                      configurationSourceReference:
                        "iris-user-readback",
                      permissionSourceReference:
                        "iris-role-graph",
                      liveRuntimeSourceReference:
                        "iris-live-witness",
                      nativeAuditSourceReference:
                        "iris-userchange",
                    }),
              },

              certification: {
                nowUtc:
                  clock(),

                reviewPreflight:
                  async (
                    input,
                  ) =>
                    input.preflightDigest,

                receiptStore: {
                  persist:
                    async (
                      receipt,
                    ) => {
                      stored =
                        receipt;
                    },

                  read:
                    async () => {
                      if (
                        stored ===
                          null
                      ) {
                        throw new Error(
                          "missing receipt",
                        );
                      }

                      return stored as
                        Awaited<
                          ReturnType<
                            typeof certifyUserRemoveRoleAction
                          >
                        >["receipt"] extends infer Receipt
                          ? Exclude<
                              Receipt,
                              null
                            >
                          : never;
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
          result.receipt,
        ).toMatchObject({
          schemaVersion:
            "meridian.action-receipt.v2",
          actionType:
            "USER_REMOVE_ROLE",
          contractId:
            "meridian.permission.user-remove-role",
          domain:
            "PERMISSIONS",
          reversibility:
            "REVERSIBLE",
        });

        expect(
          result.receipt
            ?.proofResults,
        ).toHaveLength(
          4,
        );

        expect(
          executeMutation,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          result.events.at(
            -1,
          )?.eventType,
        ).toBe(
          "ACTION_VERIFIED",
        );
      },
    );
  },
);
