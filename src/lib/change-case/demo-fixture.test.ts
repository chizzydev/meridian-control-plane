import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
  DEMO_FIXTURE_ID,
  DEMO_FIXTURE_TARGET_ROLE,
  DEMO_FIXTURE_TRANSPORT_RESOURCES,
  DEMO_FIXTURE_TRANSPORT_ROLE,
  DEMO_FIXTURE_USERNAME,
  DemoFixtureError,
  demoFixturePublicState,
  isSafeSyntheticPassword,
  resetDemoFixture,
  seedDemoFixture,
  type DemoFixtureAdapter,
  type DemoFixtureCredentialVault,
  type DemoFixtureRoleSnapshot,
  type DemoFixtureUserSnapshot,
} from "./demo-fixture";

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
      "Meridian Live Demo Witness",

    namespace:
      "USER",

    enabled:
      true,

    directRoles:
      DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
  };
}

function harness(
  input: {
    readonly existingUser?:
      boolean;

    readonly existingRole?:
      boolean;

    readonly liveProcesses?:
      readonly number[];

    readonly missingRoles?:
      readonly string[];

    readonly missingResources?:
      readonly string[];

    readonly driftUserReadback?:
      boolean;

    readonly createUserFailure?:
      boolean;
  } = {},
) {
  let user:
    DemoFixtureUserSnapshot | null =
    input.existingUser
      ? exactUser()
      : null;

  let role:
    DemoFixtureRoleSnapshot | null =
    input.existingRole
      ? exactRole()
      : null;

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
          async () => {
            calls.push(
              "read-user",
            );

            return user;
          },
        ),

      readRole:
        vi.fn(
          async () => {
            calls.push(
              "read-role",
            );

            return role;
          },
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

            if (
              input.createUserFailure
            ) {
              throw new Error(
                "synthetic create failure",
              );
            }

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
                input.driftUserReadback
                  ? [
                      "MeridianEmployee",
                    ]
                  : spec.directRoles,
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
    string[] =
    [];

  const vault:
    DemoFixtureCredentialVault = {
      store:
        vi.fn(
          (
            value,
          ) => {
            stored.push(
              `${value.fixtureId}:${value.generation}`,
            );
          },
        ),

      clear:
        vi.fn(
          () => {
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
  "isolated demo fixture lifecycle kernel",
  () => {
    it(
      "uses a fixed synthetic authority that cannot name Maya",
      () => {
        const state =
          demoFixturePublicState(
            "generation-1",
          );

        expect(
          state.fixtureId,
        ).toBe(
          DEMO_FIXTURE_ID,
        );

        expect(
          state.username,
        ).toBe(
          "meridian.demo.witness",
        );

        expect(
          state.username,
        ).not.toBe(
          "maya.patel",
        );

        expect(
          state.targetRole,
        ).toBe(
          DEMO_FIXTURE_TARGET_ROLE,
        );

        expect(
          state.credentialExposed,
        ).toBe(
          false,
        );
      },
    );

    it(
      "requires a constrained in-memory synthetic credential format",
      () => {
        expect(
          isSafeSyntheticPassword(
            "Aa1!0123456789abcd",
          ),
        ).toBe(
          true,
        );

        expect(
          isSafeSyntheticPassword(
            "too-short!",
          ),
        ).toBe(
          false,
        );

        expect(
          isSafeSyntheticPassword(
            "aaaaaaaaaaaaaaaa",
          ),
        ).toBe(
          false,
        );

        expect(
          isSafeSyntheticPassword(
            "Aa1!0123456789 abc",
          ),
        ).toBe(
          false,
        );
      },
    );

    it(
      "seeds the exact isolated role and user without returning the password",
      async () => {
        const h =
          harness();

        const result =
          await seedDemoFixture({
            adapter:
              h.adapter,

            vault:
              h.vault,

            secrets: {
              generation:
                () =>
                  "generation-1",

              password:
                () =>
                  "Aa1!0123456789abcd",
            },
          });

        expect(
          result,
        ).toEqual({
          fixtureId:
            DEMO_FIXTURE_ID,

          generation:
            "generation-1",

          username:
            DEMO_FIXTURE_USERNAME,

          targetRole:
            DEMO_FIXTURE_TARGET_ROLE,

          transportRole:
            DEMO_FIXTURE_TRANSPORT_ROLE,

          namespace:
            "USER",

          directRolesBefore:
            DEMO_FIXTURE_DIRECT_ROLES_BEFORE,

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
          h.user(),
        ).not.toBeNull();

        expect(
          h.role(),
        ).not.toBeNull();

        expect(
          h.stored,
        ).toEqual([
          `${DEMO_FIXTURE_ID}:generation-1`,
        ]);
      },
    );

    it(
      "fails before mutation when a required shared business prerequisite is missing",
      async () => {
        const h =
          harness({
            missingRoles: [
              "MeridianSupervisor",
            ],
          });

        await expect(
          seedDemoFixture({
            adapter:
              h.adapter,

            vault:
              h.vault,

            secrets: {
              generation:
                () =>
                  "generation-1",

              password:
                () =>
                  "Aa1!0123456789abcd",
            },
          }),
        ).rejects.toMatchObject({
          code:
            "DEMO_FIXTURE_PREREQUISITE_MISSING",
        });

        expect(
          h.calls,
        ).toEqual(
          [],
        );
      },
    );

    it(
      "fails closed before mutation when the synthetic principal already has a live process",
      async () => {
        const h =
          harness({
            liveProcesses: [
              4242,
            ],
          });

        await expect(
          seedDemoFixture({
            adapter:
              h.adapter,

            vault:
              h.vault,

            secrets: {
              generation:
                () =>
                  "generation-1",

              password:
                () =>
                  "Aa1!0123456789abcd",
            },
          }),
        ).rejects.toMatchObject({
          code:
            "DEMO_FIXTURE_LIVE_PROCESS_PRESENT",
        });

        expect(
          h.calls,
        ).toEqual(
          [],
        );
      },
    );

    it(
      "removes stale isolated fixture objects before recreating the known baseline",
      async () => {
        const h =
          harness({
            existingUser:
              true,

            existingRole:
              true,
          });

        await seedDemoFixture({
          adapter:
            h.adapter,

          vault:
            h.vault,

          secrets: {
            generation:
              () =>
                "generation-2",

            password:
              () =>
                "Aa1!fedcba9876543210",
          },
        });

        expect(
          h.calls.indexOf(
            "delete-user",
          ),
        ).toBeLessThan(
          h.calls.indexOf(
            "delete-role",
          ),
        );

        expect(
          h.calls.indexOf(
            "delete-role",
          ),
        ).toBeLessThan(
          h.calls.indexOf(
            "create-role",
          ),
        );

        expect(
          h.calls.indexOf(
            "create-role",
          ),
        ).toBeLessThan(
          h.calls.indexOf(
            "create-user",
          ),
        );
      },
    );

    it(
      "performs compensating cleanup when post-create user readback drifts",
      async () => {
        const h =
          harness({
            driftUserReadback:
              true,
          });

        await expect(
          seedDemoFixture({
            adapter:
              h.adapter,

            vault:
              h.vault,

            secrets: {
              generation:
                () =>
                  "generation-3",

              password:
                () =>
                  "Aa1!0123456789abcd",
            },
          }),
        ).rejects.toBeInstanceOf(
          DemoFixtureError,
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
      },
    );

    it(
      "performs compensating role cleanup when user creation fails",
      async () => {
        const h =
          harness({
            createUserFailure:
              true,
          });

        await expect(
          seedDemoFixture({
            adapter:
              h.adapter,

            vault:
              h.vault,

            secrets: {
              generation:
                () =>
                  "generation-4",

              password:
                () =>
                  "Aa1!0123456789abcd",
            },
          }),
        ).rejects.toThrow(
          "synthetic create failure",
        );

        expect(
          h.role(),
        ).toBeNull();

        expect(
          h.stored,
        ).toEqual(
          [],
        );
      },
    );

    it(
      "reset refuses to delete anything while the synthetic principal has a live process",
      async () => {
        const h =
          harness({
            existingUser:
              true,

            existingRole:
              true,

            liveProcesses: [
              8181,
            ],
          });

        await expect(
          resetDemoFixture({
            adapter:
              h.adapter,

            vault:
              h.vault,
          }),
        ).rejects.toMatchObject({
          code:
            "DEMO_FIXTURE_LIVE_PROCESS_PRESENT",
        });

        expect(
          h.calls,
        ).toEqual(
          [],
        );
      },
    );

    it(
      "reset deletes only the synthetic user then transport role and clears credential state",
      async () => {
        const h =
          harness({
            existingUser:
              true,

            existingRole:
              true,
          });

        await resetDemoFixture({
          adapter:
            h.adapter,

          vault:
            h.vault,
        });

        expect(
          h.user(),
        ).toBeNull();

        expect(
          h.role(),
        ).toBeNull();

        expect(
          h.calls.indexOf(
            "delete-user",
          ),
        ).toBeLessThan(
          h.calls.indexOf(
            "delete-role",
          ),
        );

        expect(
          h.vault.clear,
        ).toHaveBeenCalledWith(
          DEMO_FIXTURE_ID,
        );
      },
    );
  },
);