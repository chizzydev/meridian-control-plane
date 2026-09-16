import {
  describe,
  expect,
  it,
} from "vitest";

import {
  canonicalPreflightJson,
  type CanonicalPreflightInput,
} from "./preflight-material";

function fixture():
  CanonicalPreflightInput {
  return {
    change: {
      username:
        "maya.patel",

      operation:
        "REMOVE",

      role:
        "MeridianSupervisor",
    },

    current: {
      username:
        "maya.patel",

      enabled:
        true,

      namespace:
        "USER",

      directRoles: [
        "MeridianSupervisor",
        "MeridianEmployee",
      ],

      effectiveRoles: [
        "MeridianViewer",
        "MeridianSupervisor",
        "MeridianOperator",
        "MeridianJobRunner",
        "MeridianEmployee",
      ],

      permissions: [
        {
          resource:
            "Meridian_Orders",
          permission:
            "WRITE",
          allowed:
            true,
        },
        {
          resource:
            "Meridian_Portal",
          permission:
            "USE",
          allowed:
            true,
        },
      ],
    },

    proposed: {
      username:
        "maya.patel",

      enabled:
        true,

      namespace:
        "USER",

      directRoles: [
        "MeridianEmployee",
      ],

      effectiveRoles: [
        "MeridianViewer",
        "MeridianEmployee",
      ],

      permissions: [
        {
          resource:
            "Meridian_Portal",
          permission:
            "USE",
          allowed:
            true,
        },
        {
          resource:
            "Meridian_Orders",
          permission:
            "WRITE",
          allowed:
            false,
        },
      ],
    },

    lostEffectiveRoles: [
      "MeridianSupervisor",
      "MeridianOperator",
      "MeridianJobRunner",
    ],

    gainedEffectiveRoles:
      [],

    lostPermissions: [
      {
        resource:
          "Meridian_Orders",
        permission:
          "WRITE",
      },
    ],

    gainedPermissions:
      [],

    retainedPermissions: [
      {
        resource:
          "Meridian_Portal",
        permission:
          "USE",
      },
    ],

    applications: [
      {
        name:
          "/meridian/api",

        namespace:
          "USER",

        resource:
          "Meridian_Portal",

        dispatchClass:
          "Meridian.API.disp",

        requirement: {
          resource:
            "Meridian_Portal",

          permission:
            "USE",
        },

        beforeAllowed:
          true,

        afterAllowed:
          true,

        classification:
          "RETAINED",

        evidence:
          "OFFICIAL_SYSADMIN_APPLICATION_RESOURCE",
      },
      {
        name:
          "/meridian/admin",

        namespace:
          "USER",

        resource:
          "Meridian_Admin",

        dispatchClass:
          "",

        requirement: {
          resource:
            "Meridian_Admin",

          permission:
            "USE",
        },

        beforeAllowed:
          true,

        afterAllowed:
          false,

        classification:
          "LOST",

        evidence:
          "OFFICIAL_SYSADMIN_APPLICATION_RESOURCE",
      },
    ],

    restOperations: [
      {
        method:
          "PATCH",

        path:
          "/orders/{id}",

        operationId:
          "updateOrder",

        serviceRequirement: {
          resource:
            "Meridian_Portal",

          permission:
            "USE",
        },

        declaredRequirements: [
          {
            resource:
              "Meridian_Orders",

            permission:
              "WRITE",
          },
        ],

        effectiveRequirements: [
          {
            resource:
              "Meridian_Orders",

            permission:
              "WRITE",
          },
          {
            resource:
              "Meridian_Portal",

            permission:
              "USE",
          },
        ],

        beforeAllowed:
          true,

        afterAllowed:
          false,

        classification:
          "LOST",

        claim:
          "DECLARED_IMPACT",

        deploymentTruth:
          "NATIVE_EMITTED_SWAGGER",

        declarationTruth:
          "AUTHORITATIVE_SOURCE_OPENAPI",
      },
      {
        method:
          "GET",

        path:
          "/orders",

        operationId:
          "listOrders",

        serviceRequirement: {
          resource:
            "Meridian_Portal",

          permission:
            "USE",
        },

        declaredRequirements: [
          {
            resource:
              "Meridian_Orders",

            permission:
              "READ",
          },
        ],

        effectiveRequirements: [
          {
            resource:
              "Meridian_Portal",

            permission:
              "USE",
          },
          {
            resource:
              "Meridian_Orders",

            permission:
              "READ",
          },
        ],

        beforeAllowed:
          true,

        afterAllowed:
          true,

        classification:
          "RETAINED",

        claim:
          "DECLARED_IMPACT",

        deploymentTruth:
          "NATIVE_EMITTED_SWAGGER",

        declarationTruth:
          "AUTHORITATIVE_SOURCE_OPENAPI",
      },
    ],

    summary: {
      lostApplicationCount:
        1,

      retainedApplicationCount:
        1,

      gainedApplicationCount:
        0,

      lostRestOperationCount:
        1,

      retainedRestOperationCount:
        1,

      gainedRestOperationCount:
        0,
    },

    coverage: {
      deployedOperationCount:
        2,

      declaredOperationCount:
        2,

      joinedOperationCount:
        2,

      fullDeploymentDeclarationJoin:
        true,
    },
  };
}

describe(
  "canonical preflight material",
  () => {
    it(
      "is invariant to semantically irrelevant array ordering",
      () => {
        const left =
          fixture();

        const source =
          fixture();

        const right:
          CanonicalPreflightInput = {
            ...source,

            current: {
              ...source.current,

              directRoles:
                [
                  ...source.current.directRoles,
                ].reverse(),

              effectiveRoles:
                [
                  ...source.current.effectiveRoles,
                ].reverse(),

              permissions:
                [
                  ...source.current.permissions,
                ].reverse(),
            },

            proposed: {
              ...source.proposed,

              directRoles:
                [
                  ...source.proposed.directRoles,
                ].reverse(),

              effectiveRoles:
                [
                  ...source.proposed.effectiveRoles,
                ].reverse(),

              permissions:
                [
                  ...source.proposed.permissions,
                ].reverse(),
            },

            lostEffectiveRoles:
              [
                ...source.lostEffectiveRoles,
              ].reverse(),

            lostPermissions:
              [
                ...source.lostPermissions,
              ].reverse(),

            retainedPermissions:
              [
                ...source.retainedPermissions,
              ].reverse(),

            applications:
              [
                ...source.applications,
              ].reverse(),

            restOperations:
              [
                ...source.restOperations,
              ]
                .reverse()
                .map(
                  (operation) => ({
                    ...operation,

                    effectiveRequirements:
                      [
                        ...operation.effectiveRequirements,
                      ].reverse(),
                  }),
                ),
          };

        expect(
          canonicalPreflightJson(
            right,
          ),
        ).toBe(
          canonicalPreflightJson(
            left,
          ),
        );
      },
    );

    it(
      "changes when authoritative proposed permission truth changes",
      () => {
        const left =
          fixture();

        const source =
          fixture();

        const right:
          CanonicalPreflightInput = {
            ...source,

            proposed: {
              ...source.proposed,

              permissions:
                source.proposed.permissions.map(
                  (
                    permission,
                    index,
                  ) =>
                    index === 1
                      ? {
                          ...permission,
                          allowed:
                            true,
                        }
                      : permission,
                ),
            },
          };

        expect(
          canonicalPreflightJson(
            right,
          ),
        ).not.toBe(
          canonicalPreflightJson(
            left,
          ),
        );
      },
    );

    it(
      "changes when stable application metadata changes",
      () => {
        const left =
          fixture();

        const source =
          fixture();

        const right:
          CanonicalPreflightInput = {
            ...source,

            applications:
              source.applications.map(
                (
                  application,
                  index,
                ) =>
                  index === 0
                    ? {
                        ...application,

                        dispatchClass:
                          "Meridian.API.changed",
                      }
                    : application,
              ),
          };

        expect(
          canonicalPreflightJson(
            right,
          ),
        ).not.toBe(
          canonicalPreflightJson(
            left,
          ),
        );
      },
    );

    it(
      "contains no timestamp or UI-narration field",
      () => {
        const canonical =
          canonicalPreflightJson(
            fixture(),
          );

        expect(
          canonical,
        ).not.toContain(
          "capturedAt",
        );

        expect(
          canonical,
        ).not.toContain(
          "timestamp",
        );

        expect(
          canonical,
        ).not.toContain(
          "headline",
        );

        expect(
          canonical,
        ).not.toContain(
          "description",
        );
      },
    );
  },
);