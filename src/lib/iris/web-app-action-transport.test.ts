import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  ORDERS_WEB_APP_DESCRIPTION_CREATE,
  ORDERS_WEB_APP_DISPATCH_CLASS,
  ORDERS_WEB_APP_NAME,
} from "../actions/web-app/fixture";

import {
  createOrdersWebAppW01,
  readOrdersWebApp,
} from "./web-app-action-transport";

describe(
  "bounded Web App SysAdmin transport",
  () => {
    it(
      "reads only the fixed /meridian-lab/orders target",
      async () => {
        const fetchImpl =
          vi.fn(
            async (
              input:
                string |
                URL |
                Request,
            ) => {
              expect(
                String(
                  input,
                ),
              ).toContain(
                "/v2/web-app?name=%2Fmeridian-lab%2Forders",
              );

              return new Response(
                JSON.stringify({
                  result: {
                    NameSpace:
                      "USER",
                    Enabled:
                      false,
                    Resource:
                      "",
                    DispatchClass:
                      ORDERS_WEB_APP_DISPATCH_CLASS,
                    Description:
                      ORDERS_WEB_APP_DESCRIPTION_CREATE,
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
              );
            },
          );

        const observed =
          await readOrdersWebApp({
            apiBaseUrl:
              "http://localhost:52773/api/admin",
            accessToken:
              "test",
            fetchImpl:
              fetchImpl as typeof fetch,
          });

        expect(
          observed?.name,
        ).toBe(
          ORDERS_WEB_APP_NAME,
        );

        expect(
          fetchImpl,
        ).toHaveBeenCalledTimes(
          1,
        );
      },
    );

    it(
      "dispatches exactly one official PUT with no caller-supplied path or app name",
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
                  false,
                DispatchClass:
                  ORDERS_WEB_APP_DISPATCH_CLASS,
                Description:
                  ORDERS_WEB_APP_DESCRIPTION_CREATE,
                AutheEnabled:
                  64,
              });

              expect(
                body,
              ).not.toHaveProperty(
                "Type",
              );

              expect(
                body.UseCookies,
              ).toBe(
                0,
              );

              expect(
                body.ServeFiles,
              ).toBe(
                0,
              );

              expect(
                Object.keys(
                  body,
                ).sort(),
              ).toEqual(
                [
                  "AutheEnabled",
                  "AutoCompile",
                  "CSPZENEnabled",
                  "CSRFToken",
                  "Description",
                  "DispatchClass",
                  "Enabled",
                  "InbndWebServicesEnabled",
                  "JWTAuthEnabled",
                  "NameSpace",
                  "Recurse",
                  "RedirectEmptyPath",
                  "ServeFiles",
                  "TraceEnabled",
                  "UseCookies",
                ].sort(),
              );

              return new Response(
                JSON.stringify({
                  result: {},
                }),
                {
                  status:
                    201,
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                },
              );
            },
          );

        const result =
          await createOrdersWebAppW01({
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
  },
);
