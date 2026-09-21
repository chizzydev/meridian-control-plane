import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  R4_PERMISSION_ROLE_CREATE_BODY,
} from "../actions/permissions/role-fixture";

import {
  SecurityRoleMutationUnknownAfterDispatchError,
  createR4PermissionRole,
  deleteR4PermissionRole,
  readR4PermissionResourceExists,
  readR4PermissionRole,
  readR4PermissionRoleOwners,
} from "./security-role-action-transport";

describe(
  "bounded R4 permission-role transport",
  () => {
    it(
      "treats role 404 as authoritative absence",
      async () => {
        const fetchImpl =
          vi.fn(
            async () =>
              new Response(
                "",
                {
                  status:
                    404,
                },
              ),
          );

        await expect(
          readR4PermissionRole({
            apiBaseUrl:
              "http://localhost:52773/api/admin",

            accessToken:
              "test",

            fetchImpl:
              fetchImpl as typeof fetch,
          }),
        ).resolves.toBeNull();
      },
    );

    it(
      "reads the prerequisite resource without mutation",
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
                "/v2/security/resource?name=Meridian_Orders",
              );

              expect(
                init?.method,
              ).toBe(
                "GET",
              );

              return new Response(
                JSON.stringify({
                  result: {
                    Name:
                      "Meridian_Orders",
                  },
                }),
                {
                  status:
                    200,
                },
              );
            },
          );

        await expect(
          readR4PermissionResourceExists({
            apiBaseUrl:
              "http://localhost:52773/api/admin",

            accessToken:
              "test",

            fetchImpl:
              fetchImpl as typeof fetch,
          }),
        ).resolves.toBe(
          true,
        );

        expect(
          fetchImpl,
        ).toHaveBeenCalledTimes(
          1,
        );
      },
    );

    it(
      "dispatches exactly one official PUT to the frozen role target",
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
                "/v2/security/role?name=MeridianR4ProofRole",
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
              ).toEqual(
                R4_PERMISSION_ROLE_CREATE_BODY,
              );

              return new Response(
                "",
                {
                  status:
                    201,
                },
              );
            },
          );

        const result =
          await createR4PermissionRole({
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
            201,

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
      "classifies server failure after dispatch as unknown and never retries",
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
          createR4PermissionRole({
            apiBaseUrl:
              "http://localhost:52773/api/admin",

            accessToken:
              "test",

            fetchImpl:
              fetchImpl as typeof fetch,
          }),
        ).rejects.toBeInstanceOf(
          SecurityRoleMutationUnknownAfterDispatchError,
        );

        expect(
          fetchImpl,
        ).toHaveBeenCalledTimes(
          1,
        );
      },
    );

    it(
      "reads the complete role-owner list for the frozen P02 target",
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
                "/v2/security/role/owners?name=MeridianR4ProofRole",
              );

              expect(
                init?.method,
              ).toBe(
                "GET",
              );

              return new Response(
                JSON.stringify({
                  result: [],
                }),
                {
                  status:
                    200,
                },
              );
            },
          );

        await expect(
          readR4PermissionRoleOwners({
            apiBaseUrl:
              "http://localhost:52773/api/admin",

            accessToken:
              "test",

            fetchImpl:
              fetchImpl as typeof fetch,
          }),
        ).resolves.toEqual([]);

        expect(
          fetchImpl,
        ).toHaveBeenCalledTimes(
          1,
        );
      },
    );

    it(
      "dispatches exactly one official DELETE to the frozen role target",
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
                "/v2/security/role?name=MeridianR4ProofRole",
              );

              expect(
                init?.method,
              ).toBe(
                "DELETE",
              );

              return new Response(
                "",
                {
                  status:
                    200,
                },
              );
            },
          );

        const result =
          await deleteR4PermissionRole({
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
      "classifies DELETE server failure as unknown and never retries",
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
          deleteR4PermissionRole({
            apiBaseUrl:
              "http://localhost:52773/api/admin",

            accessToken:
              "test",

            fetchImpl:
              fetchImpl as typeof fetch,
          }),
        ).rejects.toBeInstanceOf(
          SecurityRoleMutationUnknownAfterDispatchError,
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
