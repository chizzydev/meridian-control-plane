import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
} from "../change-case/demo-fixture";

import {
  P03UserMutationUnknownAfterDispatchError,
  putP03UserAddRole,
  readP03Role,
  readP03User,
} from "./user-add-role-action-transport";

describe(
  "bounded P03 user-role transport",
  () => {
    it(
      "reads the exact isolated user shape",
      async () => {
        const fetchImpl =
          vi.fn(
            async (
              input:
                string |
                URL |
                Request,
              init?:
                RequestInit,
            ) => {
              expect(
                String(
                  input,
                ),
              ).toContain(
                "/v2/security/user?name=meridian.demo.witness",
              );

              expect(
                init?.method,
              ).toBe(
                "GET",
              );

              return new Response(
                JSON.stringify({
                  result: {
                    FullName:
                      "Meridian Live Demo Witness",

                    NameSpace:
                      "USER",

                    Enabled:
                      true,

                    Roles: [
                      "MeridianEmployee",
                      "MeridianDemoNativeTransport",
                    ],
                  },
                }),
                {
                  status:
                    200,
                },
              );
            },
          );

        const user =
          await readP03User({
            apiBaseUrl:
              "http://localhost:52773/api/admin",

            accessToken:
              "test",

            fetchImpl:
              fetchImpl as typeof fetch,
          });

        expect(
          user,
        ).toMatchObject({
          username:
            "meridian.demo.witness",

          directRoles: [
            "MeridianEmployee",
            "MeridianDemoNativeTransport",
          ],
        });
      },
    );

    it(
      "reads a role from the frozen P03 role graph",
      async () => {
        const fetchImpl =
          vi.fn(
            async () =>
              new Response(
                JSON.stringify({
                  result: {
                    GrantedRoles: [
                      "MeridianOperator",
                    ],

                    Resources: [
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
                  },
                }),
                {
                  status:
                    200,
                },
              ),
          );

        const role =
          await readP03Role({
            apiBaseUrl:
              "http://localhost:52773/api/admin",

            accessToken:
              "test",

            name:
              "MeridianSupervisor",

            fetchImpl:
              fetchImpl as typeof fetch,
          });

        expect(
          role,
        ).toMatchObject({
          name:
            "MeridianSupervisor",

          grantedRoles: [
            "MeridianOperator",
          ],
        });
      },
    );

    it(
      "dispatches exactly one official PUT with the frozen post-grant role set",
      async () => {
        const fetchImpl =
          vi.fn(
            async (
              input:
                string |
                URL |
                Request,
              init?:
                RequestInit,
            ) => {
              expect(
                String(
                  input,
                ),
              ).toContain(
                "/v2/security/user?name=meridian.demo.witness",
              );

              expect(
                init?.method,
              ).toBe(
                "PUT",
              );

              expect(
                JSON.parse(
                  String(
                    init?.body,
                  ),
                ),
              ).toEqual({
                Roles: [
                  ...DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
                ],
              });

              return new Response(
                JSON.stringify({
                  result: {},
                }),
                {
                  status:
                    200,
                },
              );
            },
          );

        const result =
          await putP03UserAddRole({
            apiBaseUrl:
              "http://localhost:52773/api/admin",

            accessToken:
              "test",

            fetchImpl:
              fetchImpl as typeof fetch,
          });

        expect(
          result,
        ).toEqual({
          status:
            200,

          mutationRequestCount:
            1,
        });

        expect(
          fetchImpl,
        ).toHaveBeenCalledTimes(
          1,
        );
      },
    );

    it(
      "classifies server failure after PUT dispatch as unknown and never retries",
      async () => {
        const fetchImpl =
          vi.fn(
            async () =>
              new Response(
                "server failure",
                {
                  status:
                    500,
                },
              ),
          );

        await expect(
          putP03UserAddRole({
            apiBaseUrl:
              "http://localhost:52773/api/admin",

            accessToken:
              "test",

            fetchImpl:
              fetchImpl as typeof fetch,
          }),
        ).rejects.toBeInstanceOf(
          P03UserMutationUnknownAfterDispatchError,
        );

        expect(
          fetchImpl,
        ).toHaveBeenCalledTimes(
          1,
        );
      },
    );
  },
);
