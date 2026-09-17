import {
  DEMO_FIXTURE_DIRECT_ROLES_AFTER,
  DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
  DEMO_FIXTURE_ID,
  DEMO_FIXTURE_NAMESPACE,
  DEMO_FIXTURE_TARGET_ROLE,
  DEMO_FIXTURE_TRANSPORT_ROLE,
  DEMO_FIXTURE_USERNAME,
  type DemoFixtureUserSnapshot,
} from "./demo-fixture";

import {
  DEMO_FIXTURE_APPLY_OPERATION,
  assertDemoFixtureApplyPrestate,
} from "./demo-fixture-apply";

export const DEMO_FIXTURE_APPLY_PREFLIGHT_SCHEMA_VERSION =
  "meridian.preflight.v1" as const;

export const DEMO_FIXTURE_APPLY_PREFLIGHT_DIGEST_ALGORITHM =
  "SHA-256" as const;

export const DEMO_FIXTURE_APPLY_PREFLIGHT_ROLE_NAMES =
  Object.freeze([
    "MeridianViewer",
    "MeridianJobRunner",
    "MeridianEmployee",
    "MeridianOperator",
    "MeridianSupervisor",
    DEMO_FIXTURE_TRANSPORT_ROLE,
  ] as const);

export interface DemoFixtureApplyRoleSnapshot {
  readonly name:
    string;

  readonly grantedRoles:
    readonly string[];

  readonly resources:
    readonly {
      readonly resource:
        string;

      readonly permission:
        string;
    }[];
}

export interface DemoFixtureApplyPreflightCanonical {
  readonly schemaVersion:
    typeof DEMO_FIXTURE_APPLY_PREFLIGHT_SCHEMA_VERSION;

  readonly change: {
    readonly username:
      typeof DEMO_FIXTURE_USERNAME;

    readonly operation:
      typeof DEMO_FIXTURE_APPLY_OPERATION;

    readonly role:
      typeof DEMO_FIXTURE_TARGET_ROLE;
  };

  readonly fixture: {
    readonly fixtureId:
      typeof DEMO_FIXTURE_ID;

    readonly expectedGeneration:
      string;

    readonly namespace:
      typeof DEMO_FIXTURE_NAMESPACE;

    readonly expectedBeforeDirectRoles:
      readonly string[];

    readonly expectedAfterDirectRoles:
      readonly string[];
  };

  readonly expectedAuthorizationDelta: {
    readonly removedDirectRoles:
      readonly [typeof DEMO_FIXTURE_TARGET_ROLE];

    readonly lostEffectiveRoles:
      readonly string[];

    readonly lostConfiguredPermissions:
      readonly string[];

    readonly retainedConfiguredPermissions:
      readonly string[];
  };

  readonly declaredImpact: {
    readonly configuredAuthorizationChanges:
      true;

    readonly liveAuthorityMayRemainStale:
      true;

    readonly convergenceRequired:
      true;

    readonly nativeAuditRequiredForVerified:
      true;
  };

  readonly coverage: {
    readonly configuredUser:
      "PROVEN";

    readonly configuredRoleGraph:
      "PROVEN";

    readonly liveProcessConvergence:
      "DEFERRED_TO_A5";

    readonly nativeAuditAndReceipt:
      "DEFERRED_TO_A6";
  };

  readonly configured: {
    readonly user: {
      readonly username:
        typeof DEMO_FIXTURE_USERNAME;

      readonly displayName:
        string;

      readonly namespace:
        string;

      readonly enabled:
        boolean;

      readonly directRoles:
        readonly string[];
    };

    readonly roles:
      readonly {
        readonly name:
          string;

        readonly grantedRoles:
          readonly string[];

        readonly resources:
          readonly {
            readonly resource:
              string;

            readonly permission:
              string;
          }[];
      }[];
  };
}

const EXPECTED_ROLE_GRAPH:
  Readonly<
    Record<
      string,
      {
        readonly grantedRoles:
          readonly string[];

        readonly resources:
          readonly string[];
      }
    >
  > =
    Object.freeze({
      MeridianViewer: {
        grantedRoles:
          Object.freeze([]),

        resources:
          Object.freeze([
            "%DB_USER:R",
            "Meridian_Orders:R",
            "Meridian_Portal:U",
          ]),
      },

      MeridianJobRunner: {
        grantedRoles:
          Object.freeze([]),

        resources:
          Object.freeze([
            "Meridian_Jobs:U",
          ]),
      },

      MeridianEmployee: {
        grantedRoles:
          Object.freeze([
            "MeridianViewer",
          ]),

        resources:
          Object.freeze([]),
      },

      MeridianOperator: {
        grantedRoles:
          Object.freeze([
            "MeridianJobRunner",
          ]),

        resources:
          Object.freeze([
            "Meridian_Orders:W",
          ]),
      },

      MeridianSupervisor: {
        grantedRoles:
          Object.freeze([
            "MeridianOperator",
          ]),

        resources:
          Object.freeze([
            "%Admin_Task:U",
            "Meridian_Admin:U",
          ]),
      },

      [DEMO_FIXTURE_TRANSPORT_ROLE]: {
        grantedRoles:
          Object.freeze([]),

        resources:
          Object.freeze([
            "%Native_ClassExecution:U",
            "%Native_Concurrency:U",
            "%Native_GlobalAccess:U",
            "%Native_Transaction:U",
          ]),
      },
    });

function sortedUnique(
  values:
    readonly string[],
): readonly string[] {
  return Object.freeze(
    [
      ...new Set(
        values.map(
          (value) =>
            value.trim(),
        ).filter(Boolean),
      ),
    ].sort(
      (
        left,
        right,
      ) =>
        left.localeCompare(
          right,
        ),
    ),
  );
}

function resourceKeys(
  resources:
    DemoFixtureApplyRoleSnapshot["resources"],
): readonly string[] {
  return sortedUnique(
    resources.map(
      (resource) =>
        `${resource.resource.trim()}:${resource.permission.trim().toUpperCase()}`,
    ),
  );
}

function sameStrings(
  left:
    readonly string[],
  right:
    readonly string[],
): boolean {
  return (
    JSON.stringify(
      sortedUnique(
        left,
      ),
    ) ===
    JSON.stringify(
      sortedUnique(
        right,
      ),
    )
  );
}

function assertExactRoleGraph(
  roles:
    readonly DemoFixtureApplyRoleSnapshot[],
): void {
  const byName =
    new Map(
      roles.map(
        (role) => [
          role.name,
          role,
        ] as const,
      ),
    );

  if (
    byName.size !==
      DEMO_FIXTURE_APPLY_PREFLIGHT_ROLE_NAMES.length ||
    roles.length !==
      DEMO_FIXTURE_APPLY_PREFLIGHT_ROLE_NAMES.length
  ) {
    throw new Error(
      "Synthetic fixture Apply preflight role graph is incomplete or duplicated.",
    );
  }

  for (
    const roleName
    of DEMO_FIXTURE_APPLY_PREFLIGHT_ROLE_NAMES
  ) {
    const observed =
      byName.get(
        roleName,
      );

    const expected =
      EXPECTED_ROLE_GRAPH[
        roleName
      ];

    if (
      !observed ||
      !expected ||
      !sameStrings(
        observed.grantedRoles,
        expected.grantedRoles,
      ) ||
      !sameStrings(
        resourceKeys(
          observed.resources,
        ),
        expected.resources,
      )
    ) {
      throw new Error(
        `Synthetic fixture Apply preflight role graph drifted at ${roleName}.`,
      );
    }
  }
}

export function buildDemoFixtureApplyPreflightCanonical(
  input: {
    readonly expectedFixtureGeneration:
      string;

    readonly user:
      DemoFixtureUserSnapshot;

    readonly roles:
      readonly DemoFixtureApplyRoleSnapshot[];
  },
): DemoFixtureApplyPreflightCanonical {
  const generation =
    input.expectedFixtureGeneration.trim();

  if (
    generation.length ===
    0
  ) {
    throw new Error(
      "Synthetic fixture Apply preflight requires a fixture generation.",
    );
  }

  assertDemoFixtureApplyPrestate(
    input.user,
  );

  assertExactRoleGraph(
    input.roles,
  );

  const canonicalRoles =
    [
      ...input.roles,
    ]
      .sort(
        (
          left,
          right,
        ) =>
          left.name.localeCompare(
            right.name,
          ),
      )
      .map(
        (role) =>
          Object.freeze({
            name:
              role.name,

            grantedRoles:
              sortedUnique(
                role.grantedRoles,
              ),

            resources:
              Object.freeze(
                role.resources
                  .map(
                    (resource) =>
                      Object.freeze({
                        resource:
                          resource.resource.trim(),

                        permission:
                          resource.permission.trim().toUpperCase(),
                      }),
                  )
                  .sort(
                    (
                      left,
                      right,
                    ) =>
                      `${left.resource}:${left.permission}`.localeCompare(
                        `${right.resource}:${right.permission}`,
                      ),
                  ),
              ),
          }));

  return Object.freeze({
    schemaVersion:
      DEMO_FIXTURE_APPLY_PREFLIGHT_SCHEMA_VERSION,

    change:
      Object.freeze({
        username:
          DEMO_FIXTURE_USERNAME,

        operation:
          DEMO_FIXTURE_APPLY_OPERATION,

        role:
          DEMO_FIXTURE_TARGET_ROLE,
      }),

    fixture:
      Object.freeze({
        fixtureId:
          DEMO_FIXTURE_ID,

        expectedGeneration:
          generation,

        namespace:
          DEMO_FIXTURE_NAMESPACE,

        expectedBeforeDirectRoles:
          sortedUnique(
            DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
          ),

        expectedAfterDirectRoles:
          sortedUnique(
            DEMO_FIXTURE_DIRECT_ROLES_AFTER,
          ),
      }),

    expectedAuthorizationDelta:
      Object.freeze({
        removedDirectRoles:
          Object.freeze([
            DEMO_FIXTURE_TARGET_ROLE,
          ] as const),

        lostEffectiveRoles:
          Object.freeze([
            "MeridianJobRunner",
            "MeridianOperator",
            "MeridianSupervisor",
          ]),

        lostConfiguredPermissions:
          Object.freeze([
            "%Admin_Task:U",
            "Meridian_Admin:U",
            "Meridian_Jobs:U",
            "Meridian_Orders:W",
          ]),

        retainedConfiguredPermissions:
          Object.freeze([
            "%DB_USER:R",
            "%Native_ClassExecution:U",
            "%Native_Concurrency:U",
            "%Native_GlobalAccess:U",
            "%Native_Transaction:U",
            "Meridian_Orders:R",
            "Meridian_Portal:U",
          ]),
      }),

    declaredImpact:
      Object.freeze({
        configuredAuthorizationChanges:
          true as const,
        liveAuthorityMayRemainStale:
          true as const,
        convergenceRequired:
          true as const,
        nativeAuditRequiredForVerified:
          true as const,
      }),

    coverage:
      Object.freeze({
        configuredUser:
          "PROVEN" as const,
        configuredRoleGraph:
          "PROVEN" as const,
        liveProcessConvergence:
          "DEFERRED_TO_A5" as const,
        nativeAuditAndReceipt:
          "DEFERRED_TO_A6" as const,
      }),

    configured:
      Object.freeze({
        user:
          Object.freeze({
            username:
              DEMO_FIXTURE_USERNAME,

            displayName:
              input.user.displayName,

            namespace:
              input.user.namespace,

            enabled:
              input.user.enabled,

            directRoles:
              sortedUnique(
                input.user.directRoles,
              ),
          }),

        roles:
          Object.freeze(
            canonicalRoles,
          ),
      }),
  });
}
