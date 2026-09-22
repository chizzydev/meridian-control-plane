import {
  describe,
  expect,
  it,
} from "vitest";

import {
  T03_RUN_NOW_BODY,
  T03_TASK_CLASS,
  T03_TASK_NAME,
  T03TaskMutationUnknownAfterDispatchError,
  postT03TaskRunNow,
  readT03TaskInfo,
  t03TaskDefinition,
} from "./task-run-now-action-transport";

describe(
  "T03 task run-now transport",
  () => {
    it(
      "freezes the inert witness definition",
      () => {
        const definition =
          t03TaskDefinition(
            "8f68f2e9-6a9c-44ac-a109-e7066a068584",
          );

        expect(
          definition,
        ).toMatchObject({
          Name:
            T03_TASK_NAME,

          RunAsUser:
            "meridian.runtime",

          Priority:
            "Normal",

          TaskClass:
            T03_TASK_CLASS,

          NameSpace:
            "%SYS",

          TimePeriod:
            "On Demand",

          StartDate:
            "2099-12-31",

          EndDate:
            "2099-12-31",

          Description:
            "Meridian R5 T03 inert run-now witness | generation=8f68f2e9-6a9c-44ac-a109-e7066a068584",
        });

        expect(
          Object.keys(
            definition.Settings,
          ),
        ).toEqual([]);
      },
    );

    it(
      "dispatches exactly POST /v2/task/run?id=<id> with RunNow=true",
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
          await postT03TaskRunNow({
            apiBaseUrl:
              "http://iris.example/api/admin",

            accessToken:
              "token",

            taskId:
              1005,

            body:
              T03_RUN_NOW_BODY,

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
              "http://iris.example/api/admin/v2/task/run?id=1005",

            method:
              "POST",

            body:
              '{"RunNow":true}',
          },
        ]);

        expect(
          result,
        ).toEqual({
          status:
            200,

          taskId:
            1005,

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
          postT03TaskRunNow({
            apiBaseUrl:
              "http://iris.example/api/admin",

            accessToken:
              "token",

            taskId:
              1005,

            body:
              T03_RUN_NOW_BODY,

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
          T03TaskMutationUnknownAfterDispatchError,
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
          postT03TaskRunNow({
            apiBaseUrl:
              "http://iris.example/api/admin",

            accessToken:
              "token",

            taskId:
              1005,

            body:
              T03_RUN_NOW_BODY,

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
          T03TaskMutationUnknownAfterDispatchError,
        );
      },
    );

    it(
      "reads task execution info without mutation",
      async () => {
        const info =
          await readT03TaskInfo({
            apiBaseUrl:
              "http://iris.example/api/admin",

            accessToken:
              "token",

            taskId:
              1005,

            fetchImpl:
              async (
                request,
                init,
              ) => {
                expect(
                  request.toString(),
                ).toBe(
                  "http://iris.example/api/admin/v2/task/info?id=1005",
                );

                expect(
                  init?.method,
                ).toBe(
                  "GET",
                );

                return new Response(
                  JSON.stringify({
                    result: {
                      LastSchedule:
                        "2026-09-21 20:55:00",

                      LastStarted:
                        "2026-09-21 20:55:00",

                      LastFinished:
                        "2026-09-21 20:55:00",

                      Status:
                        "1",

                      Error:
                        "Success",

                      Type:
                        "User",
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
          info,
        ).toEqual({
          lastSchedule:
            "2026-09-21 20:55:00",

          lastStarted:
            "2026-09-21 20:55:00",

          lastFinished:
            "2026-09-21 20:55:00",

          status:
            "1",

          error:
            "Success",

          type:
            "User",
        });
      },
    );
  },
);
