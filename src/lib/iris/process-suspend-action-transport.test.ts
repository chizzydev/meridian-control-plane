import {
  describe,
  expect,
  it,
} from "vitest";

import {
  O01_PROCESS_ACTION_ROLE,
  O01ProcessAuthorityDeniedError,
  O01ProcessMutationRejectedError,
  O01ProcessMutationUnknownAfterDispatchError,
  postO01ProcessSuspend,
  readO01Process,
} from "./process-suspend-action-transport";

describe(
  "O01 process suspend transport",
  () => {
    it(
      "freezes the dedicated escalation role and exact witness process read",
      async () => {
        expect(
          O01_PROCESS_ACTION_ROLE,
        ).toBe(
          "MeridianProcessActionExecutor",
        );

        const result =
          await readO01Process({
            apiBaseUrl:
              "http://iris.example/api/admin",

            accessToken:
              "token",

            pid:
              4242,

            fetchImpl:
              async (
                request,
                init,
              ) => {
                expect(
                  request.toString(),
                ).toBe(
                  "http://iris.example/api/admin/v2/process?id=4242",
                );

                expect(
                  init?.method,
                ).toBe(
                  "GET",
                );

                return new Response(
                  JSON.stringify({
                    result: {
                      Pid:
                        4242,
                      UserName:
                        "meridian.demo.witness",
                      NameSpace:
                        "USER",
                      StartTimeUTC:
                        "2026-09-22 17:00:00",
                      UserInfo:
                        "meridian:process-witness:00000000-0000-0000-0000-000000000001",
                      CanBeSuspended:
                        true,
                      CanBeTerminated:
                        true,
                      State:
                        "RUN",
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
          });

        expect(
          result,
        ).toEqual({
          pid:
            4242,
          username:
            "meridian.demo.witness",
          namespace:
            "USER",
          startTimeUtc:
            "2026-09-22 17:00:00",
          purposeMarker:
            "meridian:process-witness:00000000-0000-0000-0000-000000000001",
          canBeSuspended:
            true,
          canBeTerminated:
            true,
          state:
            "RUN",
        });
      },
    );

    it(
      "dispatches exactly one bodyless POST /v2/process/suspend?id=<pid>",
      async () => {
        const calls:
          Array<{
            url:
              string;
            method:
              string;
            body:
              BodyInit | null | undefined;
          }> = [];

        const result =
          await postO01ProcessSuspend({
            apiBaseUrl:
              "http://iris.example/api/admin",

            accessToken:
              "token",

            pid:
              4242,

            fetchImpl:
              async (
                request,
                init,
              ) => {
                calls.push({
                  url:
                    request.toString(),

                  method:
                    String(
                      init?.method,
                    ),

                  body:
                    init?.body,
                });

                return new Response(
                  "",
                  {
                    status:
                      200,
                  },
                );
              },
          });

        expect(
          calls,
        ).toEqual([
          {
            url:
              "http://iris.example/api/admin/v2/process/suspend?id=4242",
            method:
              "POST",
            body:
              undefined,
          },
        ]);

        expect(
          result,
        ).toEqual({
          status:
            200,
          pid:
            4242,
          mutationRequestCount:
            1,
          requestBodyPresent:
            false,
        });
      },
    );

    it(
      "never retries after an ambiguous dispatch",
      async () => {
        let calls =
          0;

        await expect(
          postO01ProcessSuspend({
            apiBaseUrl:
              "http://iris.example/api/admin",

            accessToken:
              "token",

            pid:
              4242,

            fetchImpl:
              async () => {
                calls +=
                  1;

                throw new Error(
                  "connection lost",
                );
              },
          }),
        ).rejects.toBeInstanceOf(
          O01ProcessMutationUnknownAfterDispatchError,
        );

        expect(
          calls,
        ).toBe(
          1,
        );
      },
    );

    it(
      "classifies authority denial, deterministic rejection, and server ambiguity",
      async () => {
        await expect(
          postO01ProcessSuspend({
            apiBaseUrl:
              "http://iris.example/api/admin",
            accessToken:
              "token",
            pid:
              4242,
            fetchImpl:
              async () =>
                new Response(
                  "",
                  {
                    status:
                      403,
                  },
                ),
          }),
        ).rejects.toBeInstanceOf(
          O01ProcessAuthorityDeniedError,
        );

        await expect(
          postO01ProcessSuspend({
            apiBaseUrl:
              "http://iris.example/api/admin",
            accessToken:
              "token",
            pid:
              4242,
            fetchImpl:
              async () =>
                new Response(
                  "",
                  {
                    status:
                      409,
                  },
                ),
          }),
        ).rejects.toBeInstanceOf(
          O01ProcessMutationRejectedError,
        );

        await expect(
          postO01ProcessSuspend({
            apiBaseUrl:
              "http://iris.example/api/admin",
            accessToken:
              "token",
            pid:
              4242,
            fetchImpl:
              async () =>
                new Response(
                  "",
                  {
                    status:
                      500,
                  },
                ),
          }),
        ).rejects.toBeInstanceOf(
          O01ProcessMutationUnknownAfterDispatchError,
        );
      },
    );

    it(
      "refuses a nonpositive pid before dispatch",
      async () => {
        let calls =
          0;

        await expect(
          postO01ProcessSuspend({
            apiBaseUrl:
              "http://iris.example/api/admin",
            accessToken:
              "token",
            pid:
              0,
            fetchImpl:
              async () => {
                calls +=
                  1;

                return new Response(
                  "",
                  {
                    status:
                      200,
                  },
                );
              },
          }),
        ).rejects.toThrow(
          "positive safe integer",
        );

        expect(
          calls,
        ).toBe(
          0,
        );
      },
    );
  },
);
