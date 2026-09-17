import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
  DEMO_FIXTURE_DISPLAY_NAME,
  DEMO_FIXTURE_ID,
  DEMO_FIXTURE_NAMESPACE,
  DEMO_FIXTURE_TRANSPORT_RESOURCES,
  DEMO_FIXTURE_TRANSPORT_ROLE,
  DEMO_FIXTURE_USERNAME,
  type DemoFixtureAdapter,
  type DemoFixtureCredentialVault,
  type DemoFixtureRoleSnapshot,
  type DemoFixtureUserSnapshot,
} from "./demo-fixture";

import {
  DemoFixtureControlError,
  executeDemoFixtureCommand,
  inspectDemoFixtureReadiness,
} from "./demo-fixture-control";

function exactRole():
  DemoFixtureRoleSnapshot {
  return {
    name:
      DEMO_FIXTURE_TRANSPORT_ROLE,

    grantedRoles:
      [],

    resources:
      DEMO_FIXTURE_TRANSPORT_RESOURCES,
  };
}

function exactUser():
  DemoFixtureUserSnapshot {
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
      DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
  };
}

function harness(
  input: {
    readonly existingUser?:
      "exact" | "drift";

    readonly existingRole?:
      "exact" | "drift";

    readonly liveProcesses?:
      readonly number[];

    readonly missingRoles?:
      readonly string[];

    readonly missingResources?:
      readonly string[];
  } = {},
) {
  let user:
    DemoFixtureUserSnapshot | null =
      input.existingUser
        ? exactUser()
        : null;

  if (
    input.existingUser ===
      "drift"
  ) {
    user = {
      ...exactUser(),

      directRoles: [
        "MeridianEmployee",
      ],
    };
  }

  let role:
    DemoFixtureRoleSnapshot | null =
      input.existingRole
        ? exactRole()
        : null;

  if (
    input.existingRole ===
      "drift"
  ) {
    role = {
      ...exactRole(),

      grantedRoles: [
        "MeridianViewer",
      ],
    };
  }

  const calls:
    string[] =
      [];

  const adapter:
    DemoFixtureAdapter = {
      readPrerequisites:
        vi.fn(
          async () => ({
            missingRoles:
              input.missingRoles ??
              [],

            missingResources:
              input.missingResources ??
              [],
          }),
        ),

      listLiveProcesses:
        vi.fn(
          async () =>
            (
              input.liveProcesses ??
              []
            ).map(
              (
                pid,
              ) => ({
                pid,

                username:
                  DEMO_FIXTURE_USERNAME,
              }),
            ),
        ),

      readUser:
        vi.fn(
          async () =>
            user,
        ),

      readRole:
        vi.fn(
          async () =>
            role,
        ),

      createRole:
        vi.fn(
          async (
            spec,
          ) => {
            calls.push(
              "create-role",
            );

            role = {
              name:
                spec.name,

              grantedRoles:
                spec.grantedRoles,

              resources:
                spec.resources,
            };
          },
        ),

      deleteRole:
        vi.fn(
          async () => {
            calls.push(
              "delete-role",
            );

            role =
              null;
          },
        ),

      createUser:
        vi.fn(
          async (
            spec,
          ) => {
            calls.push(
              "create-user",
            );

            user = {
              username:
                spec.username,

              displayName:
                spec.displayName,

              namespace:
                spec.namespace,

              enabled:
                true,

              directRoles:
                spec.directRoles,
            };
          },
        ),

      deleteUser:
        vi.fn(
          async () => {
            calls.push(
              "delete-user",
            );

            user =
              null;
          },
        ),
    };

  const stored:
    {
      generation:
        string;

      password:
        string;
    }[] =
      [];

  const vault:
    DemoFixtureCredentialVault = {
      store:
        vi.fn(
          (
            value,
          ) => {
            stored.splice(
              0,
              stored.length,
              {
                generation:
                  value.generation,

                password:
                  value.password,
              },
            );
          },
        ),

      clear:
        vi.fn(
          (
            fixtureId,
          ) => {
            expect(
              fixtureId,
            ).toBe(
              DEMO_FIXTURE_ID,
            );

            stored.length =
              0;
          },
        ),
    };

  return {
    adapter,
    vault,
    calls,
    stored,
    user: () =>
      user,
    role: () =>
      role,
  };
}

describe(
  "demo fixture readiness and command surface",
  () => {
    it(
      "reports a clean fixed synthetic boundary as ready to seed",
      async () => {
        const h =
          harness();

        const result =
          await inspectDemoFixtureReadiness(
            h.adapter,
          );

        expect(
          result,
        ).toMatchObject({
          state:
            "READY_CLEAN",

          fixtureId:
            DEMO_FIXTURE_ID,

          username:
            DEMO_FIXTURE_USERNAME,

          transportRole:
            DEMO_FIXTURE_TRANSPORT_ROLE,

          userState:
            "ABSENT",

          roleState:
            "ABSENT",

          seedAllowed:
            true,

          resetAllowed:
            true,

          credentialEvaluated:
            false,
        });

        expect(
          result.liveProcessPids,
        ).toEqual(
          [],
        );

        expect(
          result.missingRoles,
        ).toEqual(
          [],
        );

        expect(
          result.missingResources,
        ).toEqual(
          [],
        );
      },
    );

    it(
      "returns actionable prerequisite diagnostics without mutating the fixture",
      async () => {
        const h =
          harness({
            missingRoles: [
              "MeridianSupervisor:DRIFT",
            ],

            missingResources: [
              "Meridian_Admin",
            ],
          });

        const result =
          await inspectDemoFixtureReadiness(
            h.adapter,
          );

        expect(
          result.state,
        ).toBe(
          "BLOCKED_PREREQUISITES",
        );

        expect(
          result.seedAllowed,
        ).toBe(
          false,
        );

        expect(
          result.actions.join(
            "\n",
          ),
        ).toContain(
          "MeridianSupervisor:DRIFT",
        );

        expect(
          result.actions.join(
            "\n",
          ),
        ).toContain(
          "Meridian_Admin",
        );

        expect(
          h.calls,
        ).toEqual(
          [],
        );
      },
    );

    it(
      "blocks seed and reset while the fixed synthetic principal owns a live process",
      async () => {
        const h =
          harness({
            existingUser:
              "exact",

            existingRole:
              "exact",

            liveProcesses: [
              8181,
            ],
          });

        const result =
          await inspectDemoFixtureReadiness(
            h.adapter,
          );

        expect(
          result.state,
        ).toBe(
          "BLOCKED_LIVE_PROCESS",
        );

        expect(
          result.seedAllowed,
        ).toBe(
          false,
        );

        expect(
          result.resetAllowed,
        ).toBe(
          false,
        );

        expect(
          result.liveProcessPids,
        ).toEqual([
          8181,
        ]);
      },
    );

    it(
      "classifies partial or inexact synthetic objects as drift instead of ready",
      async () => {
        const h =
          harness({
            existingUser:
              "drift",

            existingRole:
              "exact",
          });

        const result =
          await inspectDemoFixtureReadiness(
            h.adapter,
          );

        expect(
          result.state,
        ).toBe(
          "BLOCKED_FIXTURE_DRIFT",
        );

        expect(
          result.userState,
        ).toBe(
          "DRIFT",
        );

        expect(
          result.seedAllowed,
        ).toBe(
          false,
        );

        expect(
          result.resetAllowed,
        ).toBe(
          true,
        );
      },
    );

    it(
      "seeds through the fixed command surface and returns only public fixture state",
      async () => {
        const h =
          harness();

        const result =
          await executeDemoFixtureCommand({
            command:
              "seed",

            adapter:
              h.adapter,

            vault:
              h.vault,

            secrets: {
              generation:
                () =>
                  "generation-a3c-1",

              password:
                () =>
                  "Aa1!0123456789abcd",
            },
          });

        expect(
          result.command,
        ).toBe(
          "seed",
        );

        expect(
          result.readiness.state,
        ).toBe(
          "READY_EXISTING_EXACT",
        );

        expect(
          result.publicState,
        ).toMatchObject({
          fixtureId:
            DEMO_FIXTURE_ID,

          generation:
            "generation-a3c-1",

          credentialExposed:
            false,
        });

        expect(
          JSON.stringify(
            result,
          ),
        ).not.toContain(
          "Aa1!0123456789abcd",
        );

        expect(
          h.stored,
        ).toEqual([
          {
            generation:
              "generation-a3c-1",

            password:
              "Aa1!0123456789abcd",
          },
        ]);

        expect(
          h.calls,
        ).toEqual([
          "create-role",
          "create-user",
        ]);
      },
    );

    it(
      "resets only the fixed synthetic fixture and returns to clean readiness",
      async () => {
        const h =
          harness({
            existingUser:
              "exact",

            existingRole:
              "exact",
          });

        h.stored.push({
          generation:
            "generation-a3c-2",

          password:
            "Aa1!fedcba9876543210",
        });

        const result =
          await executeDemoFixtureCommand({
            command:
              "reset",

            adapter:
              h.adapter,

            vault:
              h.vault,

            secrets: {
              generation:
                () =>
                  "unused",

              password:
                () =>
                  "Aa1!unused0000000000",
            },
          });

        expect(
          result.readiness.state,
        ).toBe(
          "READY_CLEAN",
        );

        expect(
          h.user(),
        ).toBeNull();

        expect(
          h.role(),
        ).toBeNull();

        expect(
          h.stored,
        ).toEqual(
          [],
        );

        expect(
          h.calls,
        ).toEqual([
          "delete-user",
          "delete-role",
        ]);
      },
    );

    it(
      "refuses seed on drift before any synthetic mutation",
      async () => {
        const h =
          harness({
            existingRole:
              "drift",
          });

        await expect(
          executeDemoFixtureCommand({
            command:
              "seed",

            adapter:
              h.adapter,

            vault:
              h.vault,

            secrets: {
              generation:
                () =>
                  "generation-a3c-3",

              password:
                () =>
                  "Aa1!0123456789abcd",
            },
          }),
        ).rejects.toMatchObject({
          name:
            "DemoFixtureControlError",

          code:
            "DEMO_FIXTURE_SEED_NOT_READY",
        });

        expect(
          h.calls,
        ).toEqual(
          [],
        );
      },
    );

    it(
      "refuses reset with a live process and exposes no process-kill escape hatch",
      async () => {
        const h =
          harness({
            existingUser:
              "exact",

            existingRole:
              "exact",

            liveProcesses: [
              9991,
            ],
          });

        await expect(
          executeDemoFixtureCommand({
            command:
              "reset",

            adapter:
              h.adapter,

            vault:
              h.vault,

            secrets: {
              generation:
                () =>
                  "unused",

              password:
                () =>
                  "Aa1!unused0000000000",
            },
          }),
        ).rejects.toBeInstanceOf(
          DemoFixtureControlError,
        );

        expect(
          h.calls,
        ).toEqual(
          [],
        );
      },
    );
  },
);
