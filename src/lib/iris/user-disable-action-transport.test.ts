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
  P06UserMutationUnknownAfterDispatchError,
  probeP06Login,
  putP06UserDisable,
  readP06User,
} from "./user-disable-action-transport";

describe(
  "bounded P06 user-disable transport",
  () => {
    it(
      "reads the complete normalized Security.Users shape used by P06",
      async () => {
        const fetchImpl = vi.fn(
          async (
            input: string | URL | Request,
            init?: RequestInit,
          ) => {
            expect(String(input)).toContain(
              "/v2/security/user?name=meridian.demo.witness",
            );
            expect(init?.method).toBe("GET");

            return new Response(
              JSON.stringify({
                result: {
                  AccountNeverExpires: true,
                  AutheEnabled: 0,
                  ChangePassword: false,
                  Comment: "Meridian R4 P06 isolated user-disable witness",
                  EmailAddress: "",
                  Enabled: true,
                  ExpirationDate: "1840-12-31",
                  FullName: "Meridian Live Demo Witness",
                  HOTPKeyDisplay: false,
                  NameSpace: "USER",
                  PasswordNeverExpires: true,
                  PhoneNumber: "",
                  PhoneProvider: "",
                  Roles: [...DEMO_FIXTURE_DIRECT_ROLES_BEFORE],
                  EscalationRoles: [],
                  Routine: "",
                },
              }),
              {status: 200},
            );
          },
        );

        const user = await readP06User({
          apiBaseUrl: "http://localhost:52773/api/admin",
          accessToken: "test",
          fetchImpl: fetchImpl as typeof fetch,
        });

        expect(user).toMatchObject({
          username: "meridian.demo.witness",
          enabled: true,
          expirationDate: "1840-12-31",
          roles: [...DEMO_FIXTURE_DIRECT_ROLES_BEFORE],
        });
      },
    );

    it(
      "proves disabled login as exact HTTP 401 without tokens",
      async () => {
        const fetchImpl = vi.fn(
          async () => new Response(
            JSON.stringify({error: "unauthorized"}),
            {status: 401},
          ),
        );

        const result = await probeP06Login({
          apiBaseUrl: "http://localhost:52773/api/admin",
          username: "meridian.demo.witness",
          password: "synthetic-only",
          fetchImpl: fetchImpl as typeof fetch,
        });

        expect(result).toEqual({
          status: 401,
          authenticated: false,
          accessTokenObserved: false,
          refreshTokenObserved: false,
        });
        expect(fetchImpl).toHaveBeenCalledTimes(1);
      },
    );

    it(
      "proves enabled login as HTTP 200 only when both login tokens are returned",
      async () => {
        const fetchImpl = vi.fn(
          async () => new Response(
            JSON.stringify({
              result: {
                access_token: "ephemeral-access",
                refresh_token: "ephemeral-refresh",
              },
            }),
            {status: 200},
          ),
        );

        const result = await probeP06Login({
          apiBaseUrl: "http://localhost:52773/api/admin",
          username: "meridian.demo.witness",
          password: "synthetic-only",
          fetchImpl: fetchImpl as typeof fetch,
        });

        expect(result).toEqual({
          status: 200,
          authenticated: true,
          accessTokenObserved: true,
          refreshTokenObserved: true,
        });
      },
    );

    it(
      "dispatches exactly one official PUT containing only Enabled=false",
      async () => {
        const fetchImpl = vi.fn(
          async (
            input: string | URL | Request,
            init?: RequestInit,
          ) => {
            expect(String(input)).toContain(
              "/v2/security/user?name=meridian.demo.witness",
            );
            expect(init?.method).toBe("PUT");
            expect(JSON.parse(String(init?.body))).toEqual({
              Enabled: false,
            });

            return new Response(
              JSON.stringify({result: {}}),
              {status: 200},
            );
          },
        );

        const result = await putP06UserDisable({
          apiBaseUrl: "http://localhost:52773/api/admin",
          accessToken: "test",
          fetchImpl: fetchImpl as typeof fetch,
        });

        expect(result).toEqual({
          status: 200,
          mutationRequestCount: 1,
        });
        expect(fetchImpl).toHaveBeenCalledTimes(1);
      },
    );

    it(
      "classifies server failure after PUT dispatch as unknown and never retries",
      async () => {
        const fetchImpl = vi.fn(
          async () => new Response(
            "server failure",
            {status: 500},
          ),
        );

        await expect(
          putP06UserDisable({
            apiBaseUrl: "http://localhost:52773/api/admin",
            accessToken: "test",
            fetchImpl: fetchImpl as typeof fetch,
          }),
        ).rejects.toBeInstanceOf(
          P06UserMutationUnknownAfterDispatchError,
        );

        expect(fetchImpl).toHaveBeenCalledTimes(1);
      },
    );
  },
);
