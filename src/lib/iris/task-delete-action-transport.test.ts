import {
  describe,
  expect,
  it,
} from "vitest";

import {
  T06_TASK_CLASS,
  T06_TASK_NAME,
  T06_TASK_ROLE,
  T06TaskAuthorityDeniedError,
  T06TaskMutationRejectedError,
  T06TaskMutationUnknownAfterDispatchError,
  deleteT06Task,
  t06TaskDescription,
} from "./task-delete-action-transport";

describe(
  "T06 task delete transport",
  () => {
    it(
      "freezes the shared fixture identity and least-privilege action role",
      () => {
        expect(
          T06_TASK_NAME,
        ).toBe(
          "MeridianLab.OrderExporter",
        );

        expect(
          T06_TASK_CLASS,
        ).toBe(
          "MeridianLab.OrderExporter",
        );

        expect(
          T06_TASK_ROLE,
        ).toBe(
          "MeridianTaskActionExecutor",
        );

        expect(
          t06TaskDescription(
            "5d1764a2-1cdf-4fc6-9bb9-eaf40ec62144",
          ),
        ).toBe(
          "Meridian R5 T04-T06 shared task witness | generation=5d1764a2-1cdf-4fc6-9bb9-eaf40ec62144",
        );
      },
    );

    it(
      "dispatches exactly one bodyless DELETE /v2/task?id=<id>",
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
          await deleteT06Task({
            apiBaseUrl:
              "http://iris.example/api/admin",
            accessToken:
              "token",
            taskId:
              1006,
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
              "http://iris.example/api/admin/v2/task?id=1006",
            method:
              "DELETE",
            body:
              undefined,
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
          deleteT06Task({
            apiBaseUrl:
              "http://iris.example/api/admin",
            accessToken:
              "token",
            taskId:
              1006,
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
          T06TaskMutationUnknownAfterDispatchError,
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
          deleteT06Task({
            apiBaseUrl:
              "http://iris.example/api/admin",
            accessToken:
              "token",
            taskId:
              1006,
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
          T06TaskMutationUnknownAfterDispatchError,
        );
      },
    );

    it(
      "preserves authority denial and deterministic rejection classes",
      async () => {
        await expect(
          deleteT06Task({
            apiBaseUrl:
              "http://iris.example/api/admin",
            accessToken:
              "token",
            taskId:
              1006,
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
          T06TaskAuthorityDeniedError,
        );

        await expect(
          deleteT06Task({
            apiBaseUrl:
              "http://iris.example/api/admin",
            accessToken:
              "token",
            taskId:
              1006,
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
          T06TaskMutationRejectedError,
        );
      },
    );

    it(
      "refuses invalid task ids before dispatch",
      async () => {
        let calls =
          0;

        await expect(
          deleteT06Task({
            apiBaseUrl:
              "http://iris.example/api/admin",
            accessToken:
              "token",
            taskId:
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
