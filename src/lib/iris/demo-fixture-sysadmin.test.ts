import {
  describe,
  expect,
  it,
} from "vitest";

import {
  DEMO_FIXTURE_REQUIRED_BUSINESS_RESOURCES,
  DEMO_FIXTURE_TRANSPORT_RESOURCES,
  DEMO_FIXTURE_TRANSPORT_ROLE,
  DEMO_FIXTURE_USERNAME,
  demoFixtureTransportRoleSpec,
  demoFixtureUserSpec,
} from "../change-case/demo-fixture";

import {
  createOfficialSysAdminDemoFixtureAdapter,
} from "./demo-fixture-sysadmin";

interface RecordedCall {
  readonly url:
    string;

  readonly init:
    RequestInit | undefined;
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
  responses:
    readonly Response[],
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

          init,
        });

        const response =
          responses[index];

        index +=
          1;

        if (!response) {
          throw new Error(
            "Unexpected fetch call.",
          );
        }

        return response;
      };

  return {
    calls,
    fetchImpl,
  };
}

function roleBody(
  input: {
    readonly grantedRoles?:
      readonly string[];

    readonly resources?:
      readonly {
        readonly Name:
          string;

        readonly Permissions:
          string;
      }[];
  } = {},
) {
  return {
    result: {
      Description:
        "test",

      GrantedRoles:
        input.grantedRoles ??
        [],

      EscalationOnly:
        false,

      Resources:
        input.resources ??
        [],
    },
  };
}

describe(
  "official SysAdmin demo fixture adapter",
  () => {
    it(
      "creates only the fixed transport role through PUT /v2/security/role",
      async () => {
        const h =
          sequenceFetch([
            jsonResponse(
              201,
              roleBody({
                resources:
                  DEMO_FIXTURE_TRANSPORT_RESOURCES.map(
                    (
                      item,
                    ) => ({
                      Name:
                        item.resource,

                      Permissions:
                        "U",
                    }),
                  ),
              }),
            ),
          ]);

        const adapter =
          createOfficialSysAdminDemoFixtureAdapter({
            baseUrl:
              "http://iris.test/api/admin",

            accessToken:
              "token",

            fetchImpl:
              h.fetchImpl,
          });

        await adapter
          .createRole(
            demoFixtureTransportRoleSpec(),
          );

        expect(
          h.calls,
        ).toHaveLength(
          1,
        );

        expect(
          h.calls[0]?.url,
        ).toBe(
          "http://iris.test/api/admin/v2/security/role?name=MeridianDemoNativeTransport",
        );

        expect(
          h.calls[0]?.init?.method,
        ).toBe(
          "PUT",
        );

        const body =
          JSON.parse(
            String(
              h.calls[0]?.init?.body,
            ),
          ) as {
            Description:
              string;

            GrantedRoles:
              string[];

            EscalationOnly:
              boolean;

            Resources:
              {
                Name:
                  string;

                Permissions:
                  string;
              }[];
          };

        expect(
          body.GrantedRoles,
        ).toEqual(
          [],
        );

        expect(
          body.EscalationOnly,
        ).toBe(
          false,
        );

        expect(
          body.Resources,
        ).toEqual([
          {
            Name:
              "%Native_GlobalAccess",

            Permissions:
              "U",
          },
          {
            Name:
              "%Native_ClassExecution",

            Permissions:
              "U",
          },
          {
            Name:
              "%Native_Transaction",

            Permissions:
              "U",
          },
          {
            Name:
              "%Native_Concurrency",

            Permissions:
              "U",
          },
        ]);
      },
    );

    it(
      "creates only the fixed synthetic user through POST /v2/security/user with password nested outside User",
      async () => {
        const h =
          sequenceFetch([
            jsonResponse(
              201,
              {
                result: {},
              },
            ),
          ]);

        const adapter =
          createOfficialSysAdminDemoFixtureAdapter({
            baseUrl:
              "http://iris.test/api/admin/",

            accessToken:
              "token",

            fetchImpl:
              h.fetchImpl,
          });

        await adapter
          .createUser(
            demoFixtureUserSpec(),
            "Aa1!fixturepassword",
          );

        expect(
          h.calls[0]?.url,
        ).toBe(
          "http://iris.test/api/admin/v2/security/user?name=meridian.demo.witness",
        );

        expect(
          h.calls[0]?.init?.method,
        ).toBe(
          "POST",
        );

        const body =
          JSON.parse(
            String(
              h.calls[0]?.init?.body,
            ),
          ) as {
            User:
              {
                FullName:
                  string;

                Enabled:
                  boolean;

                AccountNeverExpires:
                  boolean;

                PasswordNeverExpires:
                  boolean;

                ChangePassword:
                  boolean;

                NameSpace:
                  string;

                Routine:
                  string;

                Roles:
                  string[];

                EscalationRoles:
                  string[];

                Comment:
                  string;
              };

            Password:
              string;
          };

        expect(
          body.User.FullName,
        ).toBe(
          "Meridian Live Demo Witness",
        );

        expect(
          body.User.Roles,
        ).toEqual([
          "MeridianEmployee",
          "MeridianSupervisor",
          "MeridianDemoNativeTransport",
        ]);

        expect(
          body.User.NameSpace,
        ).toBe(
          "USER",
        );

        expect(
          body.User.AccountNeverExpires,
        ).toBe(
          true,
        );

        expect(
          body.User.PasswordNeverExpires,
        ).toBe(
          true,
        );

        expect(
          body.User.ChangePassword,
        ).toBe(
          false,
        );

        expect(
          body.Password,
        ).toBe(
          "Aa1!fixturepassword",
        );
      },
    );

    it(
      "parses exact synthetic user and transport-role readback",
      async () => {
        const h =
          sequenceFetch([
            jsonResponse(
              200,
              {
                result: {
                  FullName:
                    "Meridian Live Demo Witness",

                  Enabled:
                    true,

                  NameSpace:
                    "USER",

                  Roles: [
                    "MeridianSupervisor",
                    "MeridianEmployee",
                    "MeridianDemoNativeTransport",
                  ],
                },
              },
            ),

            jsonResponse(
              200,
              {
                result: {
                  GrantedRoles:
                    [],

                  Resources:
                    DEMO_FIXTURE_TRANSPORT_RESOURCES.map(
                      (
                        item,
                      ) => ({
                        Name:
                          item.resource,

                        Permissions:
                          "U",
                      }),
                    ),
                },
              },
            ),
          ]);

        const adapter =
          createOfficialSysAdminDemoFixtureAdapter({
            baseUrl:
              "http://iris.test/api/admin",

            accessToken:
              "token",

            fetchImpl:
              h.fetchImpl,
          });

        const user =
          await adapter
            .readUser(
              DEMO_FIXTURE_USERNAME,
            );

        const role =
          await adapter
            .readRole(
              DEMO_FIXTURE_TRANSPORT_ROLE,
            );

        expect(
          user,
        ).toEqual({
          username:
            DEMO_FIXTURE_USERNAME,

          displayName:
            "Meridian Live Demo Witness",

          namespace:
            "USER",

          enabled:
            true,

          directRoles: [
            "MeridianDemoNativeTransport",
            "MeridianEmployee",
            "MeridianSupervisor",
          ],
        });

        expect(
          role?.name,
        ).toBe(
          DEMO_FIXTURE_TRANSPORT_ROLE,
        );

        expect(
          role?.grantedRoles,
        ).toEqual(
          [],
        );

        expect(
          role?.resources,
        ).toEqual(
          DEMO_FIXTURE_TRANSPORT_RESOURCES,
        );
      },
    );

    it(
      "maps 404 reads to absence and keeps delete idempotent",
      async () => {
        const h =
          sequenceFetch([
            jsonResponse(
              404,
              {},
            ),
            jsonResponse(
              404,
              {},
            ),
            jsonResponse(
              404,
              {},
            ),
            jsonResponse(
              404,
              {},
            ),
          ]);

        const adapter =
          createOfficialSysAdminDemoFixtureAdapter({
            baseUrl:
              "http://iris.test/api/admin",

            accessToken:
              "token",

            fetchImpl:
              h.fetchImpl,
          });

        await expect(
          adapter.readUser(
            DEMO_FIXTURE_USERNAME,
          ),
        ).resolves.toBeNull();

        await expect(
          adapter.readRole(
            DEMO_FIXTURE_TRANSPORT_ROLE,
          ),
        ).resolves.toBeNull();

        await expect(
          adapter.deleteUser(
            DEMO_FIXTURE_USERNAME,
          ),
        ).resolves.toBeUndefined();

        await expect(
          adapter.deleteRole(
            DEMO_FIXTURE_TRANSPORT_ROLE,
          ),
        ).resolves.toBeUndefined();

        expect(
          h.calls[2]?.init?.method,
        ).toBe(
          "DELETE",
        );

        expect(
          h.calls[3]?.init?.method,
        ).toBe(
          "DELETE",
        );
      },
    );

    it(
      "filters injected ProcessQuery discovery to the exact synthetic principal without REST",
      async () => {
        let restCallCount =
          0;

        let processReadCount =
          0;

        const adapter =
          createOfficialSysAdminDemoFixtureAdapter({
            baseUrl:
              "http://iris.test/api/admin",

            accessToken:
              "token",

            fetchImpl:
              async () => {
                restCallCount +=
                  1;

                throw new Error(
                  "Process discovery must not use SysAdmin REST.",
                );
              },

            listLiveProcesses:
              async (
                username,
              ) => {
                processReadCount +=
                  1;

                expect(
                  username,
                ).toBe(
                  DEMO_FIXTURE_USERNAME,
                );

                return [
                  {
                    pid:
                      101,

                    username:
                      DEMO_FIXTURE_USERNAME,
                  },
                  {
                    pid:
                      202,

                    username:
                      "meridian.runtime",
                  },
                ];
              },
          });

        await expect(
          adapter.listLiveProcesses(
            DEMO_FIXTURE_USERNAME,
          ),
        ).resolves.toEqual([
          {
            pid:
              101,

            username:
              DEMO_FIXTURE_USERNAME,
          },
        ]);

        expect(
          processReadCount,
        ).toBe(
          1,
        );

        expect(
          restCallCount,
        ).toBe(
          0,
        );
      },
    );

    it(
      "accepts the exact frozen shared role/resource graph as ready",
      async () => {
        const exactRoles =
          [
            roleBody({
              resources: [
                {
                  Name:
                    "%DB_USER",

                  Permissions:
                    "R",
                },
                {
                  Name:
                    "Meridian_Orders",

                  Permissions:
                    "R",
                },
                {
                  Name:
                    "Meridian_Portal",

                  Permissions:
                    "U",
                },
              ],
            }),
            roleBody({
              resources: [
                {
                  Name:
                    "Meridian_Jobs",

                  Permissions:
                    "U",
                },
              ],
            }),
            roleBody({
              grantedRoles: [
                "MeridianViewer",
              ],
            }),
            roleBody({
              grantedRoles: [
                "MeridianJobRunner",
              ],

              resources: [
                {
                  Name:
                    "Meridian_Orders",

                  Permissions:
                    "W",
                },
              ],
            }),
            roleBody({
              grantedRoles: [
                "MeridianOperator",
              ],

              resources: [
                {
                  Name:
                    "%Admin_Task",

                  Permissions:
                    "U",
                },
                {
                  Name:
                    "Meridian_Admin",

                  Permissions:
                    "U",
                },
              ],
            }),
          ];

        const resources =
          DEMO_FIXTURE_REQUIRED_BUSINESS_RESOURCES.map(
            () =>
              jsonResponse(
                200,
                {
                  result: {
                    PublicPermission:
                      "",
                  },
                },
              ),
          );

        const h =
          sequenceFetch([
            ...exactRoles.map(
              (
                body,
              ) =>
                jsonResponse(
                  200,
                  body,
                ),
            ),
            ...resources,
          ]);

        const adapter =
          createOfficialSysAdminDemoFixtureAdapter({
            baseUrl:
              "http://iris.test/api/admin",

            accessToken:
              "token",

            fetchImpl:
              h.fetchImpl,
          });

        await expect(
          adapter.readPrerequisites(),
        ).resolves.toEqual({
          missingRoles:
            [],

          missingResources:
            [],
        });
      },
    );

    it(
      "fails readiness closed when a shared role or protected resource drifts",
      async () => {
        const exactRoles =
          [
            roleBody({
              resources: [
                {
                  Name:
                    "%DB_USER",

                  Permissions:
                    "R",
                },
                {
                  Name:
                    "Meridian_Orders",

                  Permissions:
                    "R",
                },
                {
                  Name:
                    "Meridian_Portal",

                  Permissions:
                    "U",
                },
              ],
            }),
            roleBody({
              resources: [
                {
                  Name:
                    "Meridian_Jobs",

                  Permissions:
                    "U",
                },
              ],
            }),
            roleBody({
              grantedRoles: [
                "MeridianViewer",
              ],
            }),
            roleBody({
              grantedRoles: [
                "MeridianJobRunner",
              ],

              resources: [
                {
                  Name:
                    "Meridian_Orders",

                  Permissions:
                    "W",
                },
              ],
            }),
            roleBody({
              grantedRoles:
                [],

              resources: [
                {
                  Name:
                    "%Admin_Task",

                  Permissions:
                    "U",
                },
              ],
            }),
          ];

        const resourceResponses =
          DEMO_FIXTURE_REQUIRED_BUSINESS_RESOURCES.map(
            (
              resource,
            ) =>
              jsonResponse(
                200,
                {
                  result: {
                    PublicPermission:
                      resource ===
                      "Meridian_Admin"
                        ? "U"
                        : "",
                  },
                },
              ),
          );

        const h =
          sequenceFetch([
            ...exactRoles.map(
              (
                body,
              ) =>
                jsonResponse(
                  200,
                  body,
                ),
            ),
            ...resourceResponses,
          ]);

        const adapter =
          createOfficialSysAdminDemoFixtureAdapter({
            baseUrl:
              "http://iris.test/api/admin",

            accessToken:
              "token",

            fetchImpl:
              h.fetchImpl,
          });

        const readiness =
          await adapter
            .readPrerequisites();

        expect(
          readiness.missingRoles,
        ).toContain(
          "MeridianSupervisor:DRIFT",
        );

        expect(
          readiness.missingResources,
        ).toContain(
          "Meridian_Admin:PUBLIC_U",
        );
      },
    );

    it(
      "refuses create/delete operations outside the fixed synthetic authority",
      async () => {
        const h =
          sequenceFetch(
            [],
          );

        const adapter =
          createOfficialSysAdminDemoFixtureAdapter({
            baseUrl:
              "http://iris.test/api/admin",

            accessToken:
              "token",

            fetchImpl:
              h.fetchImpl,
          });

        await expect(
          adapter.deleteUser(
            "other-user" as
              typeof DEMO_FIXTURE_USERNAME,
          ),
        ).rejects.toThrow(
          "refused",
        );

        await expect(
          adapter.deleteRole(
            "OtherRole" as
              typeof DEMO_FIXTURE_TRANSPORT_ROLE,
          ),
        ).rejects.toThrow(
          "refused",
        );

        expect(
          h.calls,
        ).toHaveLength(
          0,
        );
      },
    );
  },
);