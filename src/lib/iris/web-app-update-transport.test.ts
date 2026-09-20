import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  ORDERS_WEB_APP_DESCRIPTION_UPDATE,
  ORDERS_WEB_APP_DISPATCH_CLASS,
} from "../actions/web-app/fixture";

import {
  updateOrdersWebAppW02,
} from "./web-app-action-transport";

describe(
  "bounded W02 Web App update transport",
  () => {
    it(
      "dispatches one official PUT with the frozen disabled update body",
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
                  ORDERS_WEB_APP_DESCRIPTION_UPDATE,
                AutheEnabled:
                  64,
                UseCookies:
                  0,
                ServeFiles:
                  0,
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
          await updateOrdersWebAppW02({
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
  },
);
