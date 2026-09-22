import {
  describe,
  expect,
  it,
} from "vitest";

import {
  T04_SUSPEND_BODY,
  T04_TASK_CLASS,
  T04_TASK_NAME,
  T04_TASK_ROLE,
  T04TaskAuthorityDeniedError,
  T04TaskMutationRejectedError,
  T04TaskMutationUnknownAfterDispatchError,
  postT04TaskSuspend,
  t04TaskDescription,
} from "./task-suspend-action-transport";

describe(
  "T04 task suspend transport",
  () => {
    it(
      "freezes the shared fixture identity and dedicated action role",
      () => {
        expect(
          T04_TASK_NAME,
        ).toBe(
          "MeridianLab.OrderExporter",
        );

        expect(
          T04_TASK_CLASS,
        ).toBe(
          "MeridianLab.OrderExporter",
        );

        expect(
          T04_TASK_ROLE,
        ).toBe(
          "MeridianTaskActionExecutor",
        );

        expect(
          t04TaskDescription(
            "5d1764a2-1cdf-4fc6-9bb9-eaf40ec62144",
          ),
        ).toBe(
          "Meridian R5 T04-T06 shared task witness | generation=5d1764a2-1cdf-4fc6-9bb9-eaf40ec62144",
        );
      },
    );

    it(
      "dispatches exactly one POST /v2/task/suspend?id=<id> with LeaveInQueue=true",
      async () => {
        const calls:
          Array<{
            url:
              string;
            method:
              string;
            body:
              string;
          }> = [];

        const result =
          await postT04TaskSuspend({
            apiBaseUrl:
              "http://iris.example/api/admin",

            accessToken:
              "token",

            taskId:
              1006,

            body:
              T04_SUSPEND_BODY,

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
                    String(
                      init?.body,
                    ),
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
              "http://iris.example/api/admin/v2/task/suspend?id=1006",

            method:
              "POST",

            body:
              '{"LeaveInQueue":true}',
          },
        ]);

        expect(
          result,
        ).toEqual({
          status:
            200,

          taskId:
            1006,

          mutationRequestCount:
            1,
        });
      },
    );

    it(
      "classifies transport failure after dispatch as unknown and never retries",
      async () => {
        let calls =
          0;

        await expect(
          postT04TaskSuspend({
            apiBaseUrl:
              "http://iris.example/api/admin",

            accessToken:
              "token",

            taskId:
              1006,

            body:
              T04_SUSPEND_BODY,

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
          T04TaskMutationUnknownAfterDispatchError,
        );

        expect(
          calls,
        ).toBe(
          1,
        );
      },
    );

    it(
      "classifies HTTP 500 after dispatch as unknown",
      async () => {
        await expect(
          postT04TaskSuspend({
            apiBaseUrl:
              "http://iris.example/api/admin",

            accessToken:
              "token",

            taskId:
              1006,

            body:
              T04_SUSPEND_BODY,

            fetchImpl:
              async () =>
                new Response(
                  "server error",
                  {
                    status:
                      500,
                  },
                ),
          }),
        ).rejects.toBeInstanceOf(
          T04TaskMutationUnknownAfterDispatchError,
        );
      },
    );

    it(
      "preserves authoritative denial and deterministic rejection classes",
      async () => {
        await expect(
          postT04TaskSuspend({
            apiBaseUrl:
              "http://iris.example/api/admin",

            accessToken:
              "token",

            taskId:
              1006,

            body:
              T04_SUSPEND_BODY,

            fetchImpl:
              async () =>
                new Response(
                  "forbidden",
                  {
                    status:
                      403,
                  },
                ),
          }),
        ).rejects.toBeInstanceOf(
          T04TaskAuthorityDeniedError,
        );

        await expect(
          postT04TaskSuspend({
            apiBaseUrl:
              "http://iris.example/api/admin",

            accessToken:
              "token",

            taskId:
              1006,

            body:
              T04_SUSPEND_BODY,

            fetchImpl:
              async () =>
                new Response(
                  "not found",
                  {
                    status:
                      404,
                  },
                ),
          }),
        ).rejects.toBeInstanceOf(
          T04TaskMutationRejectedError,
        );
      },
    );

    it(
      "refuses invalid task ids before dispatch",
      async () => {
        let calls =
          0;

        await expect(
          postT04TaskSuspend({
            apiBaseUrl:
              "http://iris.example/api/admin",

            accessToken:
              "token",

            taskId:
              0,

            body:
              T04_SUSPEND_BODY,

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
