import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  WebAppMutationUnknownAfterDispatchError,
  deleteOrdersWebApp,
} from "./web-app-action-transport";

describe(
  "bounded W04 Web App delete transport",
  () => {
    it(
      "dispatches exactly one official DELETE to the frozen orders target",
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
                "DELETE",
              );

              expect(
                init?.headers,
              ).toMatchObject({
                Accept:
                  "application/json",
                Authorization:
                  "Bearer test",
              });

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
          await deleteOrdersWebApp({
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
          deleteOrdersWebApp({
            apiBaseUrl:
              "http://localhost:52773/api/admin",

            accessToken:
              "test",

            fetchImpl:
              fetchImpl as typeof fetch,
          }),
        ).rejects.toBeInstanceOf(
          WebAppMutationUnknownAfterDispatchError,
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
