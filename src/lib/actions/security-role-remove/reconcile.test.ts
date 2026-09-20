import {
  describe,
  expect,
  it,
} from "vitest";

import {
  DEMO_FIXTURE_DIRECT_ROLES_AFTER,
  DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
  DEMO_FIXTURE_DISPLAY_NAME,
  DEMO_FIXTURE_NAMESPACE,
  DEMO_FIXTURE_USERNAME,
} from "../../change-case/demo-fixture";

import {
  appliedDemoFixtureMutation,
} from "../../change-case/demo-fixture-apply";

import {
  executionFromAppliedMutation,
  reconcileUnknownRoleRemoval,
} from "./reconcile";

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

describe(
  "USER_REMOVE_ROLE unknown-after-dispatch reconciliation",
  () => {
    it(
      "classifies exact authoritative post-state as APPLIED",
      () => {
        const decision =
          reconcileUnknownRoleRemoval({
            expectedFixtureGeneration:
              "generation-1",

            generationStillCurrent:
              true,

            observedUser:
              user(
                DEMO_FIXTURE_DIRECT_ROLES_AFTER,
              ),
          });

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
            decision.execution.resolutionSource,
          ).toBe(
            "AUTHORITATIVE_RECONCILIATION_READBACK",
          );
        }
      },
    );

    it(
      "classifies exact authoritative pre-state as NOT_APPLIED",
      () => {
        expect(
          reconcileUnknownRoleRemoval({
            expectedFixtureGeneration:
              "generation-1",

            generationStillCurrent:
              true,

            observedUser:
              user(
                DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
              ),
          }),
        ).toEqual({
          outcome:
            "NOT_APPLIED",

          reason:
            "AUTHORITATIVE_READBACK_MATCHED_EXACT_PRESTATE",
        });
      },
    );

    it(
      "keeps a drifted partial state unknown",
      () => {
        const decision =
          reconcileUnknownRoleRemoval({
            expectedFixtureGeneration:
              "generation-1",

            generationStillCurrent:
              true,

            observedUser:
              user([
                "MeridianEmployee",
              ]),
          });

        expect(
          decision,
        ).toEqual({
          outcome:
            "STILL_UNKNOWN",

          reason:
            "AUTHORITATIVE_READBACK_MATCHED_NEITHER_PRESTATE_NOR_POSTSTATE",
        });
      },
    );

    it(
      "keeps a missing target unknown rather than inventing failure",
      () => {
        expect(
          reconcileUnknownRoleRemoval({
            expectedFixtureGeneration:
              "generation-1",

            generationStillCurrent:
              true,

            observedUser:
              null,
          }).outcome,
        ).toBe(
          "STILL_UNKNOWN",
        );
      },
    );

    it(
      "refuses conclusive reconciliation when fixture generation changed",
      () => {
        expect(
          reconcileUnknownRoleRemoval({
            expectedFixtureGeneration:
              "generation-1",

            generationStillCurrent:
              false,

            observedUser:
              user(
                DEMO_FIXTURE_DIRECT_ROLES_AFTER,
              ),
          }),
        ).toEqual({
          outcome:
            "STILL_UNKNOWN",

          reason:
            "FIXTURE_GENERATION_NO_LONGER_CURRENT",
        });
      },
    );

    it(
      "maps known direct execution into the same canonical execution contract",
      () => {
        const direct =
          executionFromAppliedMutation(
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

        expect(
          direct,
        ).toMatchObject({
          state:
            "APPLIED",
          configurationVerified:
            true,
          resolutionSource:
            "DIRECT_EXECUTION",
        });
      },
    );
  },
);
