import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  T02TaskMutationRejectedError,
  T02TaskMutationUnknownAfterDispatchError,
  loginT02TaskSession,
  postT02FixtureTask,
  putT02TaskUpdate,
  readT02Task,
  t02PriorityUpdatePatch,
  t02TaskDefinition,
  t02TaskDescription,
} from "./task-update-action-transport";

describe(
  "bounded T02 task-update transport",
  () => {
    it(
      "uses explicit MeridianTaskMetadataReader escalation",
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
                "/login",
              );

              expect(
                init?.method,
              ).toBe(
                "POST",
              );

              expect(
                JSON.parse(
                  String(
                    init?.body,
                  ),
                ),
              ).toEqual({
                user:
                  "meridian.runtime",

                password:
                  "runtime-secret",

                role:
                  "MeridianTaskMetadataReader",
              });

              return new Response(
                JSON.stringify({
                  result: {
                    access_token:
                      "ephemeral-access",

                    refresh_token:
                      "ephemeral-refresh",
                  },
                }),
                {
                  status:
                    200,
                },
              );
            },
          );

        const session =
          await loginT02TaskSession({
            apiBaseUrl:
              "http://localhost:52773/api/admin",

            username:
              "meridian.runtime",

            password:
              "runtime-secret",

            fetchImpl:
              fetchImpl as typeof fetch,
          });

        expect(
          session,
        ).toEqual({
          accessToken:
            "ephemeral-access",

          refreshToken:
            "ephemeral-refresh",
        });
      },
    );

    it(
      "freezes an On Demand Priority Normal fixture and a one-property Priority Low PUT body",
      () => {
        const generation =
          "d54e4011-a68f-43a2-887d-06b52d6d49f1";

        const definition =
          t02TaskDefinition(
            generation,
          );

        const patch =
          t02PriorityUpdatePatch();

        expect(
          definition.TimePeriod,
        ).toBe(
          "On Demand",
        );

        expect(
          definition.Priority,
        ).toBe(
          "Normal",
        );

        expect(
          definition.Description,
        ).toBe(
          t02TaskDescription(
            generation,
          ),
        );

        expect(
          definition.Description.length,
        ).toBeLessThanOrEqual(
          100,
        );

        expect(
          patch,
        ).toEqual({
          Priority:
            "Low",
        });

        expect(
          Object.keys(
            patch,
          ),
        ).toEqual([
          "Priority",
        ]);
      },
    );

    it(
      "creates only the synthetic setup fixture through one POST",
      async () => {
        const definition =
          t02TaskDefinition(
            "fixture-setup",
          );

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
              ).toBe(
                "http://localhost:52773/api/admin/v2/task",
              );

              expect(
                init?.method,
              ).toBe(
                "POST",
              );

              expect(
                JSON.parse(
                  String(
                    init?.body,
                  ),
                ),
              ).toEqual(
                definition,
              );

              return new Response(
                JSON.stringify({
                  result:
                    {},
                }),
                {
                  status:
                    201,

                  headers: {
                    Location:
                      "/api/admin/v2/task?id=1500",
                  },
                },
              );
            },
          );

        const result =
          await postT02FixtureTask({
            apiBaseUrl:
              "http://localhost:52773/api/admin",

            accessToken:
              "task-token",

            definition,

            fetchImpl:
              fetchImpl as typeof fetch,
          });

        expect(
          result,
        ).toMatchObject({
          status:
            201,

          taskId:
            1500,

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
      "dispatches exactly one reviewed-id PUT whose body contains only Priority Low",
      async () => {
        const patch =
          t02PriorityUpdatePatch();

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
              ).toBe(
                "http://localhost:52773/api/admin/v2/task?id=1500",
              );

              expect(
                init?.method,
              ).toBe(
                "PUT",
              );

              expect(
                JSON.parse(
                  String(
                    init?.body,
                  ),
                ),
              ).toEqual({
                Priority:
                  "Low",
              });

              return new Response(
                JSON.stringify({
                  result:
                    {},
                }),
                {
                  status:
                    200,
                },
              );
            },
          );

        const result =
          await putT02TaskUpdate({
            apiBaseUrl:
              "http://localhost:52773/api/admin",

            accessToken:
              "task-token",

            taskId:
              1500,

            patch,

            fetchImpl:
              fetchImpl as typeof fetch,
          });

        expect(
          result,
        ).toEqual({
          status:
            200,

          taskId:
            1500,

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
      "normalizes full authoritative task readback including Settings",
      async () => {
        const fetchImpl =
          vi.fn(
            async () =>
              new Response(
                JSON.stringify({
                  result: {
                    Name:
                      "Meridian R5 T02 Update Witness",

                    RunAsUser:
                      "meridian.runtime",

                    EmailOnCompletion:
                      [],

                    EmailOnError:
                      [],

                    EmailOnExpiration:
                      [],

                    EmailOutput:
                      false,

                    Expires:
                      false,

                    ExpiresDays:
                      0,

                    ExpiresHours:
                      0,

                    ExpiresMinutes:
                      0,

                    OpenOutputFile:
                      false,

                    OutputDirectory:
                      "",

                    OutputFilename:
                      "",

                    OutputFileIsBinary:
                      false,

                    SuspendOnError:
                      false,

                    SuspendTerminated:
                      false,

                    Priority:
                      "Low",

                    TaskClass:
                      "%SYS.Task.SwitchJournal",

                    IsBatch:
                      false,

                    NameSpace:
                      "%SYS",

                    TimePeriod:
                      "On Demand",

                    TimePeriodEvery:
                      "",

                    TimePeriodDay:
                      "",

                    DailyFrequency:
                      "Once",

                    DailyFrequencyTime:
                      "Hourly",

                    DailyIncrement:
                      "",

                    DailyStartTime:
                      "00:00:00",

                    DailyEndTime:
                      "23:59:59",

                    RunAfterGUID:
                      "",

                    StartDate:
                      "2099-12-31",

                    EndDate:
                      "2099-12-31",

                    MirrorStatus:
                      "Primary",

                    RescheduleOnStart:
                      false,

                    Description:
                      "Meridian R5 T02 update witness | generation=g",

                    Settings: {
                      Example:
                        "preserved",
                    },
                  },
                }),
                {
                  status:
                    200,
                },
              ),
          );

        const task =
          await readT02Task({
            apiBaseUrl:
              "http://localhost:52773/api/admin",

            accessToken:
              "task-token",

            taskId:
              1500,

            fetchImpl:
              fetchImpl as typeof fetch,
          });

        expect(
          task,
        ).toMatchObject({
          id:
            1500,

          priority:
            "Low",

          timePeriod:
            "On Demand",

          settings: {
            Example:
              "preserved",
          },
        });
      },
    );

    it(
      "classifies 500 after PUT dispatch as unknown and never retries",
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
          putT02TaskUpdate({
            apiBaseUrl:
              "http://localhost:52773/api/admin",

            accessToken:
              "task-token",

            taskId:
              1500,

            patch:
              t02PriorityUpdatePatch(),

            fetchImpl:
              fetchImpl as typeof fetch,
          }),
        ).rejects.toBeInstanceOf(
          T02TaskMutationUnknownAfterDispatchError,
        );

        expect(
          fetchImpl,
        ).toHaveBeenCalledTimes(
          1,
        );
      },
    );

    it(
      "rejects deterministic client errors without retry",
      async () => {
        const fetchImpl =
          vi.fn(
            async () =>
              new Response(
                "bad request",
                {
                  status:
                    400,
                },
              ),
          );

        await expect(
          putT02TaskUpdate({
            apiBaseUrl:
              "http://localhost:52773/api/admin",

            accessToken:
              "task-token",

            taskId:
              1500,

            patch:
              t02PriorityUpdatePatch(),

            fetchImpl:
              fetchImpl as typeof fetch,
          }),
        ).rejects.toBeInstanceOf(
          T02TaskMutationRejectedError,
        );

        expect(
          fetchImpl,
        ).toHaveBeenCalledTimes(
          1,
        );
      },
    );

    it(
      "refuses a broadened PUT body before network dispatch",
      async () => {
        const fetchImpl =
          vi.fn();

        const broadened =
          {
            Priority:
              "Low",

            Description:
              "not-authorized",
          } as unknown as ReturnType<
            typeof t02PriorityUpdatePatch
          >;

        await expect(
          putT02TaskUpdate({
            apiBaseUrl:
              "http://localhost:52773/api/admin",

            accessToken:
              "task-token",

            taskId:
              1500,

            patch:
              broadened,

            fetchImpl:
              fetchImpl as typeof fetch,
          }),
        ).rejects.toThrow(
          "exactly one authorized property",
        );

        expect(
          fetchImpl,
        ).not.toHaveBeenCalled();
      },
    );
  },
);
