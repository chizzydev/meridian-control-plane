import {
  describe,
  expect,
  it,
} from "vitest";

import {
  DEMO_FIXTURE_DIRECT_ROLES_AFTER,
  DEMO_FIXTURE_USERNAME,
} from "../change-case/demo-fixture";

import {
  DEMO_FIXTURE_USER_SECURITY_PATH,
  buildDemoFixtureApplyPutPlan,
  buildDemoFixtureConfiguredReadPlan,
} from "./demo-fixture-apply-transport";

describe(
  "A4B fixed official SysAdmin fixture Apply transport",
  () => {
    it(
      "uses only the official PUT /v2/security/user edit surface for the fixed synthetic principal",
      () => {
        const plan =
          buildDemoFixtureApplyPutPlan();

        expect(
          DEMO_FIXTURE_USER_SECURITY_PATH,
        ).toBe(
          `/v2/security/user?name=${encodeURIComponent(DEMO_FIXTURE_USERNAME)}`,
        );

        expect(
          plan.method,
        ).toBe(
          "PUT",
        );

        expect(
          plan.networkRequestPerformed,
        ).toBe(
          false,
        );
      },
    );

    it(
      "uses the User schema directly rather than the create-only User/Password wrapper",
      () => {
        const plan =
          buildDemoFixtureApplyPutPlan();

        expect(
          plan.body,
        ).toEqual({
          Roles:
            [
              ...DEMO_FIXTURE_DIRECT_ROLES_AFTER,
            ],
        });

        expect(
          Object.keys(
            plan.body,
          ),
        ).toEqual([
          "Roles",
        ]);

        expect(
          plan.body,
        ).not.toHaveProperty(
          "Password",
        );

        expect(
          plan.body,
        ).not.toHaveProperty(
          "User",
        );
      },
    );

    it(
      "uses the same fixed principal for configured post-read",
      () => {
        expect(
          buildDemoFixtureConfiguredReadPlan(),
        ).toEqual({
          method:
            "GET",

          path:
            DEMO_FIXTURE_USER_SECURITY_PATH,

          body:
            null,

          networkRequestPerformed:
            false,
        });
      },
    );
  },
);
