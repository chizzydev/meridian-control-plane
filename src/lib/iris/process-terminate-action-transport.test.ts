import {
  describe,
  expect,
  it,
} from "vitest";

import {
  O03_PROCESS_ACTION_ROLE,
  O03ProcessAuthorityDeniedError,
  O03ProcessMutationRejectedError,
  O03ProcessMutationUnknownAfterDispatchError,
  postO03ProcessTerminate,
  readO03Process,
} from "./process-terminate-action-transport";

describe(
  "O03 process terminate transport",
  () => {
    it(
      "freezes the dedicated escalation role and exact running witness process read",
      async () => {
        expect(
          O03_PROCESS_ACTION_ROLE,
        ).toBe(
          "MeridianProcessActionExecutor",
        );

        const result =
          await readO03Process({
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
      "dispatches exactly one bodyless POST /v2/process/terminate?id=<pid>",
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
          await postO03ProcessTerminate({
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
              "http://iris.example/api/admin/v2/process/terminate?id=4242",
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
      "never retries after an ambiguous irreversible dispatch",
      async () => {
        let calls =
          0;

        await expect(
          postO03ProcessTerminate({
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
          O03ProcessMutationUnknownAfterDispatchError,
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
          postO03ProcessTerminate({
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
          O03ProcessAuthorityDeniedError,
        );

        await expect(
          postO03ProcessTerminate({
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
          O03ProcessMutationRejectedError,
        );

        await expect(
          postO03ProcessTerminate({
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
          O03ProcessMutationUnknownAfterDispatchError,
        );
      },
    );

    it(
      "refuses a nonpositive pid before dispatch",
      async () => {
        let calls =
          0;

        await expect(
          postO03ProcessTerminate({
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
