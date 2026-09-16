import {
  describe,
  expect,
  it,
} from "vitest";

import declaration
  from "../iris/meridian-api-declaration.json";

import {
  buildDeclaredImpactPreflight,
  parseDeclaredRestOperations,
  parseDeployedRestInventory,
  type ImpactAuthorizationSnapshot,
  type WebApplicationDefinition,
} from "./impact";

const current:
  ImpactAuthorizationSnapshot = {
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
          "READ",
        allowed:
          true,
      },
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
          "Meridian_Admin",
        permission:
          "USE",
        allowed:
          true,
      },
      {
        resource:
          "Meridian_Jobs",
        permission:
          "USE",
        allowed:
          true,
      },
      {
        resource:
          "%Admin_Task",
        permission:
          "USE",
        allowed:
          true,
      },
    ],
  };

const proposed:
  ImpactAuthorizationSnapshot = {
    permissions:
      current.permissions.map(
        (permission) => ({
          ...permission,

          allowed:
            (
              permission.resource ===
                "Meridian_Portal" &&
              permission.permission ===
                "USE"
            ) ||
            (
              permission.resource ===
                "Meridian_Orders" &&
              permission.permission ===
                "READ"
            ),
        }),
      ),
  };

const applications:
  readonly WebApplicationDefinition[] = [
    {
      name:
        "/meridian/api",

      namespace:
        "USER",

      enabled:
        true,

      resource:
        "Meridian_Portal",

      dispatchClass:
        "Meridian.API.disp",
    },
    {
      name:
        "/meridian/admin",

      namespace:
        "USER",

      enabled:
        true,

      resource:
        "Meridian_Admin",

      dispatchClass:
        "",
    },
  ];

const emittedSwagger = {
  swagger:
    "2.0",

  basePath:
    "/meridian/api",

  paths: {
    "/orders": {
      get: {
        operationId:
          "listOrders",
      },
    },

    "/orders/{id}": {
      patch: {
        operationId:
          "updateOrder",
      },
    },

    "/jobs/{id}/run": {
      post: {
        operationId:
          "runJob",
      },
    },

    "/admin/cache/reload": {
      post: {
        operationId:
          "reloadAdminCache",
      },
    },

    "/tasks/{id}/run": {
      post: {
        operationId:
          "runTask",
      },
    },
  },
};

describe(
  "declared impact",
  () => {
    it(
      "joins live deployment identity to authoritative declaration and derives impact",
      () => {
        const result =
          buildDeclaredImpactPreflight({
            current,

            proposed,

            applications,

            deployed:
              parseDeployedRestInventory(
                emittedSwagger,
              ),

            declared:
              parseDeclaredRestOperations(
                declaration,
              ),
          });

        expect(
          result.applications.map(
            (application) =>
              [
                application.name,
                `${application.requirement.resource}:${application.requirement.permission}`,
                application.classification,
              ].join(
                "|",
              ),
          ),
        ).toEqual([
          "/meridian/admin|Meridian_Admin:USE|LOST",
          "/meridian/api|Meridian_Portal:USE|RETAINED",
        ]);

        expect(
          result.restOperations.map(
            (operation) =>
              [
                operation.method,
                operation.path,
                operation.operationId,
                operation.classification,
              ].join(
                "|",
              ),
          ),
        ).toEqual([
          "GET|/orders|listOrders|RETAINED",
          "PATCH|/orders/{id}|updateOrder|LOST",
          "POST|/admin/cache/reload|reloadAdminCache|LOST",
          "POST|/jobs/{id}/run|runJob|LOST",
          "POST|/tasks/{id}/run|runTask|LOST",
        ]);

        expect(
          result.summary,
        ).toEqual({
          lostApplicationCount:
            1,

          retainedApplicationCount:
            1,

          gainedApplicationCount:
            0,

          lostRestOperationCount:
            4,

          retainedRestOperationCount:
            1,

          gainedRestOperationCount:
            0,
        });

        expect(
          result.coverage,
        ).toEqual({
          deployedOperationCount:
            5,

          declaredOperationCount:
            5,

          joinedOperationCount:
            5,

          fullDeploymentDeclarationJoin:
            true,
        });
      },
    );

    it(
      "fails closed when deployment and declaration identity diverge",
      () => {
        const deployed =
          parseDeployedRestInventory(
            emittedSwagger,
          );

        expect(
          () =>
            buildDeclaredImpactPreflight({
              current,

              proposed,

              applications,

              deployed: {
                ...deployed,

                operations:
                  deployed.operations.slice(
                    0,
                    -1,
                  ),
              },

              declared:
                parseDeclaredRestOperations(
                  declaration,
                ),
            }),
        ).toThrow(
          "Authoritative declaration operation is not present in deployed inventory",
        );
      },
    );

    it(
      "accepts string-array required-resource declarations and normalizes permissions",
      () => {
        const parsed =
          parseDeclaredRestOperations({
            swagger:
              "2.0",

            paths: {
              "/example": {
                get: {
                  operationId:
                    "example",

                  "x-ISC_RequiredResource": [
                    "Alpha:read",
                    "Beta:use",
                  ],
                },
              },
            },
          });

        expect(
          parsed[0].requiredResources,
        ).toEqual([
          {
            resource:
              "Alpha",

            permission:
              "READ",
          },
          {
            resource:
              "Beta",

            permission:
              "USE",
          },
        ]);
      },
    );
  },
);