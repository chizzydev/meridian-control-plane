import {
  describe,
  expect,
  it,
} from "vitest";

import {
  DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
  DEMO_FIXTURE_DISPLAY_NAME,
  DEMO_FIXTURE_NAMESPACE,
  DEMO_FIXTURE_TRANSPORT_ROLE,
  DEMO_FIXTURE_USERNAME,
} from "./demo-fixture";

import {
  DEMO_FIXTURE_APPLY_PREFLIGHT_ROLE_NAMES,
  buildDemoFixtureApplyPreflightCanonical,
  type DemoFixtureApplyRoleSnapshot,
} from "./demo-fixture-apply-preflight";

function exactRoles():
  DemoFixtureApplyRoleSnapshot[] {
  return [
    {
      name:
        "MeridianViewer",
      grantedRoles:
        [],
      resources: [
        {
          resource:
            "Meridian_Portal",
          permission:
            "U",
        },
        {
          resource:
            "%DB_USER",
          permission:
            "R",
        },
        {
          resource:
            "Meridian_Orders",
          permission:
            "R",
        },
      ],
    },
    {
      name:
        "MeridianJobRunner",
      grantedRoles:
        [],
      resources: [
        {
          resource:
            "Meridian_Jobs",
          permission:
            "U",
        },
      ],
    },
    {
      name:
        "MeridianEmployee",
      grantedRoles: [
        "MeridianViewer",
      ],
      resources:
        [],
    },
    {
      name:
        "MeridianOperator",
      grantedRoles: [
        "MeridianJobRunner",
      ],
      resources: [
        {
          resource:
            "Meridian_Orders",
          permission:
            "W",
        },
      ],
    },
    {
      name:
        "MeridianSupervisor",
      grantedRoles: [
        "MeridianOperator",
      ],
      resources: [
        {
          resource:
            "Meridian_Admin",
          permission:
            "U",
        },
        {
          resource:
            "%Admin_Task",
          permission:
            "U",
        },
      ],
    },
    {
      name:
        DEMO_FIXTURE_TRANSPORT_ROLE,
      grantedRoles:
        [],
      resources: [
        {
          resource:
            "%Native_GlobalAccess",
          permission:
            "U",
        },
        {
          resource:
            "%Native_ClassExecution",
          permission:
            "U",
        },
        {
          resource:
            "%Native_Transaction",
          permission:
            "U",
        },
        {
          resource:
            "%Native_Concurrency",
          permission:
            "U",
        },
      ],
    },
  ];
}

function exactUser() {
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

describe(
  "A4C synthetic fixture authoritative preflight canonical material",
  () => {
    it(
      "owns the fixed fixture identity and complete configured role graph deterministically",
      () => {
        const canonical =
          buildDemoFixtureApplyPreflightCanonical({
            expectedFixtureGeneration:
              "generation-1",
            user:
              exactUser(),
            roles:
              exactRoles().reverse(),
          });

        expect(
          canonical.schemaVersion,
        ).toBe(
          "meridian.preflight.v1",
        );

        expect(
          canonical.change,
        ).toEqual({
          username:
            DEMO_FIXTURE_USERNAME,
          operation:
            "REMOVE",
          role:
            "MeridianSupervisor",
        });

        expect(
          canonical.configured.roles.map(
            (role) =>
              role.name,
          ),
        ).toEqual(
          [
            ...DEMO_FIXTURE_APPLY_PREFLIGHT_ROLE_NAMES,
          ].sort(),
        );

        expect(
          canonical.configured.user.directRoles,
        ).toEqual(
          [
            ...DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
          ].sort(),
        );
      },
    );

    it(
      "fails closed when the frozen configured role graph drifts",
      () => {
        const roles =
          exactRoles().map(
            (role) =>
              role.name ===
                "MeridianSupervisor"
                ? {
                    ...role,
                    resources: [],
                  }
                : role,
          );

        expect(
          () =>
            buildDemoFixtureApplyPreflightCanonical({
              expectedFixtureGeneration:
                "generation-1",
              user:
                exactUser(),
              roles,
            }),
        ).toThrow(
          /role graph drifted/,
        );
      },
    );

    it(
      "fails closed when the configured user is not the exact A3 seeded prestate",
      () => {
        expect(
          () =>
            buildDemoFixtureApplyPreflightCanonical({
              expectedFixtureGeneration:
                "generation-1",
              user: {
                ...exactUser(),
                directRoles: [
                  "MeridianEmployee",
                  DEMO_FIXTURE_TRANSPORT_ROLE,
                ],
              },
              roles:
                exactRoles(),
            }),
        ).toThrow(
          /Apply prestate is not exact/,
        );
      },
    );
  },
);
