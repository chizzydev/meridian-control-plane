import {
  readFileSync,
} from "node:fs";

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
} from "../change-case/demo-fixture";

import {
  DemoFixtureApplyRefusalError,
} from "../change-case/demo-fixture-apply";

import {
  executeFixtureScopedRoleRemovalCore,
} from "./demo-fixture-apply-executor";

interface RecordedCall {
  readonly url:
    string;

  readonly method:
    string;
}

function userBody(
  roles:
    readonly string[],
) {
  return {
    result: {
      FullName:
        DEMO_FIXTURE_DISPLAY_NAME,

      Enabled:
        true,

      AccountNeverExpires:
        true,

      PasswordNeverExpires:
        true,

      ChangePassword:
        false,

      NameSpace:
        DEMO_FIXTURE_NAMESPACE,

      Routine:
        "",

      Roles:
        [
          ...roles,
        ],

      EscalationRoles:
        [],

      Comment:
        "Meridian isolated live-demo authorization-convergence witness",
    },
  };
}

function jsonResponse(
  status:
    number,
  body:
    unknown,
): Response {
  return new Response(
    JSON.stringify(
      body,
    ),
    {
      status,

      headers: {
        "Content-Type":
          "application/json",
      },
    },
  );
}

function sequenceFetch(
  handlers:
    readonly (
      () => Promise<Response>
    )[],
) {
  const calls:
    RecordedCall[] =
      [];

  let index =
    0;

  const fetchImpl:
    typeof fetch =
      async (
        input,
        init,
      ) => {
        calls.push({
          url:
            input.toString(),

          method:
            String(
              init?.method ??
                "GET",
            ),
        });

        const handler =
          handlers[index];

        index +=
          1;

        if (!handler) {
          throw new Error(
            "Unexpected fetch call.",
          );
        }

        return handler();
      };

  return {
    calls,
    fetchImpl,
  };
}

describe(
  "A4B fixture-scoped role-removal executor",
  () => {
    it(
      "refuses a missing/stale fixture generation before any network request",
      async () => {
        const h =
          sequenceFetch(
            [],
          );

        await expect(
          executeFixtureScopedRoleRemovalCore(
            {
              apiBaseUrl:
                "http://iris.test/api/admin",

              accessToken:
                "token",

              expectedFixtureGeneration:
                "wrong-generation",
            },
            {
              credentialPresent:
                () =>
                  false,

              fetchImpl:
                h.fetchImpl,
            },
          ),
        ).rejects.toBeInstanceOf(
          DemoFixtureApplyRefusalError,
        );

        expect(
          h.calls,
        ).toHaveLength(
          0,
        );
      },
    );

    it(
      "refuses a non-exact configured prestate with zero PUT dispatch",
      async () => {
        const h =
          sequenceFetch([
            async () =>
              jsonResponse(
                200,
                userBody(
                  DEMO_FIXTURE_DIRECT_ROLES_AFTER,
                ),
              ),
          ]);

        await expect(
          executeFixtureScopedRoleRemovalCore(
            {
              apiBaseUrl:
                "http://iris.test/api/admin",

              accessToken:
                "token",

              expectedFixtureGeneration:
                "generation-1",
            },
            {
              credentialPresent:
                () =>
                  true,

              fetchImpl:
                h.fetchImpl,
            },
          ),
        ).rejects.toBeInstanceOf(
          DemoFixtureApplyRefusalError,
        );

        expect(
          h.calls.filter(
            (
              call,
            ) =>
              call.method ===
              "PUT",
          ),
        ).toHaveLength(
          0,
        );
      },
    );

    it(
      "dispatches exactly one fixed PUT and requires exact configured readback",
      async () => {
        const h =
          sequenceFetch([
            async () =>
              jsonResponse(
                200,
                userBody(
                  DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
                ),
              ),

            async () =>
              jsonResponse(
                200,
                userBody(
                  DEMO_FIXTURE_DIRECT_ROLES_AFTER,
                ),
              ),

            async () =>
              jsonResponse(
                200,
                userBody(
                  DEMO_FIXTURE_DIRECT_ROLES_AFTER,
                ),
              ),
          ]);

        const result =
          await executeFixtureScopedRoleRemovalCore(
            {
              apiBaseUrl:
                "http://iris.test/api/admin",

              accessToken:
                "token",

              expectedFixtureGeneration:
                "generation-1",
            },
            {
              credentialPresent:
                (
                  generation,
                ) =>
                  generation ===
                  "generation-1",

              fetchImpl:
                h.fetchImpl,
            },
          );

        expect(
          result.state,
        ).toBe(
          "APPLIED",
        );

        expect(
          result.verified,
        ).toBe(
          false,
        );

        expect(
          h.calls.filter(
            (
              call,
            ) =>
              call.method ===
              "PUT",
          ),
        ).toHaveLength(
          1,
        );

        expect(
          h.calls[1]?.url,
        ).toBe(
          `http://iris.test/api/admin/v2/security/user?name=${encodeURIComponent(DEMO_FIXTURE_USERNAME)}`,
        );
      },
    );

    it(
      "returns APPLY_FAILED when configured readback does not match, with no second PUT",
      async () => {
        const h =
          sequenceFetch([
            async () =>
              jsonResponse(
                200,
                userBody(
                  DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
                ),
              ),

            async () =>
              jsonResponse(
                200,
                userBody(
                  DEMO_FIXTURE_DIRECT_ROLES_AFTER,
                ),
              ),

            async () =>
              jsonResponse(
                200,
                userBody(
                  DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
                ),
              ),
          ]);

        const result =
          await executeFixtureScopedRoleRemovalCore(
            {
              apiBaseUrl:
                "http://iris.test/api/admin",

              accessToken:
                "token",

              expectedFixtureGeneration:
                "generation-1",
            },
            {
              credentialPresent:
                () =>
                  true,

              fetchImpl:
                h.fetchImpl,
            },
          );

        expect(
          result,
        ).toMatchObject({
          state:
            "APPLY_FAILED",

          mutationRequestCount:
            1,

          configurationVerified:
            false,

          mayRetryWithoutFreshRead:
            false,

          verified:
            false,

          outcome:
            "UNKNOWN_AFTER_DISPATCH",
        });

        expect(
          h.calls.filter(
            (
              call,
            ) =>
              call.method ===
              "PUT",
          ),
        ).toHaveLength(
          1,
        );
      },
    );

    it(
      "does not automatically retry an ambiguous transport failure after PUT dispatch",
      async () => {
        const h =
          sequenceFetch([
            async () =>
              jsonResponse(
                200,
                userBody(
                  DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
                ),
              ),

            async () => {
              throw new Error(
                "socket closed after dispatch",
              );
            },
          ]);

        const result =
          await executeFixtureScopedRoleRemovalCore(
            {
              apiBaseUrl:
                "http://iris.test/api/admin",

              accessToken:
                "token",

              expectedFixtureGeneration:
                "generation-1",
            },
            {
              credentialPresent:
                () =>
                  true,

              fetchImpl:
                h.fetchImpl,
            },
          );

        expect(
          result,
        ).toMatchObject({
          state:
            "APPLY_FAILED",

          mutationRequestCount:
            1,

          securityMutationOutcomeKnown:
            false,

          requiresFreshAuthoritativeRead:
            true,

          mayRetryWithoutFreshRead:
            false,

          outcome:
            "UNKNOWN_AFTER_DISPATCH",

          verified:
            false,
        });

        expect(
          h.calls.filter(
            (
              call,
            ) =>
              call.method ===
              "PUT",
          ),
        ).toHaveLength(
          1,
        );

        expect(
          h.calls,
        ).toHaveLength(
          2,
        );
      },
    );

    it(
      "keeps the production binding server-only and binds generation to the A3 server credential vault",
      () => {
        const source =
          readFileSync(
            "src/lib/iris/demo-fixture-apply-server.ts",
            "utf8",
          );

        expect(
          source,
        ).toContain(
          'import "server-only";',
        );

        expect(
          source,
        ).toContain(
          "demoFixtureCredentialPresentForServer",
        );

        expect(
          source,
        ).toContain(
          "executeFixtureScopedRoleRemovalCore",
        );

        expect(
          source,
        ).not.toContain(
          "maya.patel",
        );

        expect(
          source,
        ).not.toContain(
          "/apply/remove-centerpiece-role",
        );

        expect(
          source,
        ).not.toContain(
          "NEXT_PUBLIC_",
        );
      },
    );
  },
);
