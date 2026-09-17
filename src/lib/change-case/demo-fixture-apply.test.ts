import {
  describe,
  expect,
  it,
} from "vitest";

import {
  DEMO_FIXTURE_DIRECT_ROLES_AFTER,
  DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
  DEMO_FIXTURE_DISPLAY_NAME,
  DEMO_FIXTURE_ID,
  DEMO_FIXTURE_NAMESPACE,
  DEMO_FIXTURE_TARGET_ROLE,
  DEMO_FIXTURE_USERNAME,
  type DemoFixtureUserSnapshot,
} from "./demo-fixture";

import {
  DEMO_FIXTURE_APPLY_CONTRACT_VERSION,
  DEMO_FIXTURE_APPLY_OPERATION,
  DemoFixtureApplyRefusalError,
  appliedDemoFixtureMutation,
  assertDemoFixtureApplyPrestate,
  assertDemoFixtureConfiguredAfter,
  demoFixtureApplyCommand,
  demoFixtureApplyUserBody,
  failedDemoFixtureMutation,
} from "./demo-fixture-apply";

function user(
  directRoles:
    readonly string[],
): DemoFixtureUserSnapshot {
  return {
    username:
      DEMO_FIXTURE_USERNAME,

    displayName:
      DEMO_FIXTURE_DISPLAY_NAME,

    namespace:
      DEMO_FIXTURE_NAMESPACE,

    enabled:
      true,

    directRoles,
  };
}

describe(
  "A4B fixed synthetic fixture Apply contract",
  () => {
    it(
      "owns the exact fixture identity and role removal without caller target parameters",
      () => {
        expect(
          demoFixtureApplyCommand(),
        ).toEqual({
          contractVersion:
            DEMO_FIXTURE_APPLY_CONTRACT_VERSION,

          fixtureId:
            DEMO_FIXTURE_ID,

          username:
            DEMO_FIXTURE_USERNAME,

          operation:
            DEMO_FIXTURE_APPLY_OPERATION,

          role:
            DEMO_FIXTURE_TARGET_ROLE,

          expectedBeforeDirectRoles:
            DEMO_FIXTURE_DIRECT_ROLES_BEFORE,

          expectedAfterDirectRoles:
            DEMO_FIXTURE_DIRECT_ROLES_AFTER,
        });
      },
    );

    it(
      "builds the official SysAdmin User edit body with only the fixed after-role set",
      () => {
        const body =
          demoFixtureApplyUserBody();

        expect(
          body.Roles,
        ).toEqual(
          DEMO_FIXTURE_DIRECT_ROLES_AFTER,
        );

        expect(
          body,
        ).toEqual({
          Roles:
            [
              ...DEMO_FIXTURE_DIRECT_ROLES_AFTER,
            ],
        });

        expect(
          Object.keys(
            body,
          ),
        ).toEqual([
          "Roles",
        ]);

        expect(
          body,
        ).not.toHaveProperty(
          "Password",
        );

        expect(
          body,
        ).not.toHaveProperty(
          "User",
        );
      },
    );

    it(
      "requires the exact A3 seeded configured prestate",
      () => {
        expect(
          () =>
            assertDemoFixtureApplyPrestate(
              user(
                DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
              ),
            ),
        ).not.toThrow();

        expect(
          () =>
            assertDemoFixtureApplyPrestate(
              user(
                DEMO_FIXTURE_DIRECT_ROLES_AFTER,
              ),
            ),
        ).toThrow(
          DemoFixtureApplyRefusalError,
        );
      },
    );

    it(
      "requires the exact configured post-state after removal",
      () => {
        expect(
          () =>
            assertDemoFixtureConfiguredAfter(
              user(
                DEMO_FIXTURE_DIRECT_ROLES_AFTER,
              ),
            ),
        ).not.toThrow();

        expect(
          () =>
            assertDemoFixtureConfiguredAfter(
              user(
                DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
              ),
            ),
        ).toThrow(
          "Synthetic fixture configured post-state does not match",
        );
      },
    );

    it(
      "classifies configured success as APPLIED but never VERIFIED",
      () => {
        const result =
          appliedDemoFixtureMutation({
            before:
              user(
                DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
              ),

            after:
              user(
                DEMO_FIXTURE_DIRECT_ROLES_AFTER,
              ),
          });

        expect(
          result.state,
        ).toBe(
          "APPLIED",
        );

        expect(
          result.mutationRequestCount,
        ).toBe(
          1,
        );

        expect(
          result.configurationVerified,
        ).toBe(
          true,
        );

        expect(
          result.convergenceRequired,
        ).toBe(
          true,
        );

        expect(
          result.verified,
        ).toBe(
          false,
        );
      },
    );

    it(
      "classifies any post-dispatch uncertainty as non-retryable APPLY_FAILED",
      () => {
        const result =
          failedDemoFixtureMutation(
            "MUTATION_TRANSPORT_FAILURE:socket closed",
          );

        expect(
          result,
        ).toMatchObject({
          state:
            "APPLY_FAILED",

          mutationRequestSent:
            true,

          mutationRequestCount:
            1,

          securityMutationOutcomeKnown:
            false,

          configurationVerified:
            false,

          requiresFreshAuthoritativeRead:
            true,

          mayRetryWithoutFreshRead:
            false,

          verified:
            false,

          outcome:
            "UNKNOWN_AFTER_DISPATCH",
        });
      },
    );
  },
);
