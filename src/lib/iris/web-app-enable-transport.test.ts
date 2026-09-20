import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  ORDERS_WEB_APP_DESCRIPTION_UPDATE,
  ORDERS_WEB_APP_DISPATCH_CLASS,
  ORDERS_WEB_APP_FIXTURE_ID,
  ORDERS_WEB_APP_GENERATION,
  ORDERS_WEB_APP_HELPER_EXECUTION_ROLE,
} from "../actions/web-app/fixture";

import {
  enableOrdersWebAppW03,
  probeOrdersWebAppHealth,
  readOrdersWebAppState,
} from "./web-app-action-transport";

describe(
  "bounded final W03 Web App transport",
  () => {
    it(
      "reads configuration, REST routing gates, and MatchRoles from one authoritative response",
      async () => {
        const fetchImpl =
          vi.fn(
            async () =>
              new Response(
                JSON.stringify({
                  result: {
                    Namespace:
                      "USER",
                    Enabled:
                      false,
                    Resource:
                      "",
                    DispatchClass:
                      ORDERS_WEB_APP_DISPATCH_CLASS,
                    Description:
                      ORDERS_WEB_APP_DESCRIPTION_UPDATE,
                    Recurse:
                      1,
                    CSPZENEnabled:
                      false,
                    MatchRoles: [],
                  },
                }),
                {
                  status:
                    200,
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                },
              ),
          );

        const state =
          await readOrdersWebAppState({
            apiBaseUrl:
              "http://localhost:52773/api/admin",
            accessToken:
              "test",
            fetchImpl:
              fetchImpl as typeof fetch,
          });

        expect(
          state.configuration,
        ).toMatchObject({
          namespace:
            "USER",
          enabled:
            false,
          dispatchClass:
            ORDERS_WEB_APP_DISPATCH_CLASS,
          description:
            ORDERS_WEB_APP_DESCRIPTION_UPDATE,
        });

        expect(
          state.routing,
        ).toEqual({
          recurse:
            true,
          cspZenEnabled:
            false,
        });

        expect(
          state.matchRoles,
        ).toEqual([]);

        expect(
          fetchImpl,
        ).toHaveBeenCalledTimes(
          1,
        );
      },
    );

    it(
      "normalizes the final always-grant MatchRoles binding",
      async () => {
        const fetchImpl =
          vi.fn(
            async () =>
              new Response(
                JSON.stringify({
                  result: {
                    Namespace:
                      "USER",
                    Enabled:
                      true,
                    Resource:
                      "",
                    DispatchClass:
                      ORDERS_WEB_APP_DISPATCH_CLASS,
                    Description:
                      ORDERS_WEB_APP_DESCRIPTION_UPDATE,
                    Recurse:
                      1,
                    CSPZENEnabled:
                      true,
                    MatchRoles: [
                      {
                        MatchRole:
                          "",
                        TargetRoles: [
                          ORDERS_WEB_APP_HELPER_EXECUTION_ROLE,
                        ],
                      },
                    ],
                  },
                }),
                {
                  status:
                    200,
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                },
              ),
          );

        const state =
          await readOrdersWebAppState({
            apiBaseUrl:
              "http://localhost:52773/api/admin",
            accessToken:
              "test",
            fetchImpl:
              fetchImpl as typeof fetch,
          });

        expect(
          state.matchRoles,
        ).toEqual([
          {
            matchRole:
              "",
            targetRoles: [
              ORDERS_WEB_APP_HELPER_EXECUTION_ROLE,
            ],
          },
        ]);
      },
    );

    it(
      "dispatches one official PUT with Enabled, CSPZENEnabled, and the app-scoped helper role",
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
                "/v2/web-app?name=%2Fmeridian-lab%2Forders",
              );

              expect(
                init?.method,
              ).toBe(
                "PUT",
              );

              const body =
                JSON.parse(
                  String(
                    init?.body,
                  ),
                ) as Record<
                  string,
                  unknown
                >;

              expect(
                body,
              ).toMatchObject({
                NameSpace:
                  "USER",
                Enabled:
                  true,
                CSPZENEnabled:
                  true,
                Recurse:
                  true,
                DispatchClass:
                  ORDERS_WEB_APP_DISPATCH_CLASS,
                Description:
                  ORDERS_WEB_APP_DESCRIPTION_UPDATE,
                AutheEnabled:
                  64,
                UseCookies:
                  0,
                ServeFiles:
                  0,
                MatchRoles: [
                  {
                    MatchRole:
                      "",
                    TargetRoles: [
                      ORDERS_WEB_APP_HELPER_EXECUTION_ROLE,
                    ],
                  },
                ],
              });

              expect(
                body,
              ).not.toHaveProperty(
                "Type",
              );

              return new Response(
                JSON.stringify({
                  result: {},
                }),
                {
                  status:
                    200,
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                },
              );
            },
          );

        const result =
          await enableOrdersWebAppW03({
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
      "normalizes the exact live health payload",
      async () => {
        const fetchImpl =
          vi.fn(
            async () =>
              new Response(
                JSON.stringify({
                  ok:
                    1,
                  fixtureId:
                    ORDERS_WEB_APP_FIXTURE_ID,
                  generation:
                    ORDERS_WEB_APP_GENERATION,
                  service:
                    "orders",
                  state:
                    "READY",
                }),
                {
                  status:
                    200,
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                },
              ),
          );

        const result =
          await probeOrdersWebAppHealth({
            webBaseUrl:
              "http://localhost:52773",
            fetchImpl:
              fetchImpl as typeof fetch,
          });

        expect(
          result,
        ).toEqual({
          url:
            "http://localhost:52773/meridian-lab/orders/health",
          status:
            200,
          body: {
            ok:
              1,
            fixtureId:
              ORDERS_WEB_APP_FIXTURE_ID,
            generation:
              ORDERS_WEB_APP_GENERATION,
            service:
              "orders",
            state:
              "READY",
          },
        });
      },
    );
  },
);
