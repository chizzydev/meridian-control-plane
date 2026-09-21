import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  T01TaskMutationUnknownAfterDispatchError,
  loginT01TaskSession,
  postT01TaskCreate,
  readT01Task,
  T01_TASK_DESCRIPTION_MAX_LENGTH,
  t01TaskDefinition,
  t01TaskDescription,
} from "./task-create-action-transport";

describe(
  "bounded T01 task-create transport",
  () => {
    it(
      "uses explicit MeridianTaskMetadataReader escalation and never prints credentials",
      async () => {
        const fetchImpl = vi.fn(
          async (
            input: string | URL | Request,
            init?: RequestInit,
          ) => {
            expect(String(input)).toContain("/login");
            expect(init?.method).toBe("POST");
            expect(JSON.parse(String(init?.body))).toEqual({
              user: "meridian.runtime",
              password: "runtime-secret",
              role: "MeridianTaskMetadataReader",
            });

            return new Response(
              JSON.stringify({
                result: {
                  access_token: "ephemeral-access",
                  refresh_token: "ephemeral-refresh",
                },
              }),
              {status: 200},
            );
          },
        );

        const session = await loginT01TaskSession({
          apiBaseUrl: "http://localhost:52773/api/admin",
          username: "meridian.runtime",
          password: "runtime-secret",
          fetchImpl: fetchImpl as typeof fetch,
        });

        expect(session).toEqual({
          accessToken: "ephemeral-access",
          refreshToken: "ephemeral-refresh",
        });
      },
    );

    it(
      "canonicalizes the generation-bound description to the observed IRIS persistence limit before POST",
      () => {
        const generation =
          "e879d3b8-3f2e-48b0-a3f9-762b12c173d2";

        const description =
          t01TaskDescription(
            generation,
          );

        expect(
          description.length,
        ).toBe(
          T01_TASK_DESCRIPTION_MAX_LENGTH,
        );

        expect(
          description,
        ).toBe(
          "Meridian R5 T01 isolated on-demand task-create witness | generation=e879d3b8-3f2e-48b0-a3f9-762b12c1",
        );

        expect(
          t01TaskDefinition(
            generation,
          ).Description,
        ).toBe(
          description,
        );
      },
    );

    it(
      "dispatches exactly one official POST with the frozen generation-bound On Demand definition",
      async () => {
        const definition = t01TaskDefinition("generation-1");
        const fetchImpl = vi.fn(
          async (
            input: string | URL | Request,
            init?: RequestInit,
          ) => {
            expect(String(input)).toBe("http://localhost:52773/api/admin/v2/task");
            expect(init?.method).toBe("POST");
            expect(JSON.parse(String(init?.body))).toEqual(definition);

            return new Response(
              JSON.stringify({result: {}}),
              {
                status: 201,
                headers: {
                  Location: "/api/admin/v2/task?id=1075",
                },
              },
            );
          },
        );

        const result = await postT01TaskCreate({
          apiBaseUrl: "http://localhost:52773/api/admin",
          accessToken: "task-token",
          definition,
          fetchImpl: fetchImpl as typeof fetch,
        });

        expect(result).toMatchObject({
          status: 201,
          taskId: 1075,
          mutationRequestCount: 1,
        });
        expect(fetchImpl).toHaveBeenCalledTimes(1);
      },
    );

    it(
      "normalizes authoritative task detail readback",
      async () => {
        const fetchImpl = vi.fn(
          async () => new Response(
            JSON.stringify({
              result: {
                Name: "Meridian R5 T01 Isolated Witness",
                RunAsUser: "meridian.runtime",
                EmailOnCompletion: [],
                EmailOnError: [],
                EmailOnExpiration: [],
                EmailOutput: false,
                Expires: false,
                ExpiresDays: 0,
                ExpiresHours: 0,
                ExpiresMinutes: 0,
                OpenOutputFile: false,
                OutputDirectory: "",
                OutputFilename: "",
                OutputFileIsBinary: false,
                SuspendOnError: false,
                SuspendTerminated: false,
                Priority: "Normal",
                TaskClass: "%SYS.Task.SwitchJournal",
                IsBatch: false,
                NameSpace: "%SYS",
                TimePeriod: "On Demand",
                TimePeriodEvery: "",
                TimePeriodDay: "",
                DailyFrequency: "Once",
                DailyFrequencyTime: "Hourly",
                DailyIncrement: "",
                DailyStartTime: "00:00:00",
                DailyEndTime: "23:59:59",
                RunAfterGUID: "",
                StartDate: "2099-12-31",
                EndDate: "2099-12-31",
                MirrorStatus: "Primary",
                RescheduleOnStart: false,
                Description: "Meridian R5 T01 isolated on-demand task-create witness | generation=g",
              },
            }),
            {status: 200},
          ),
        );

        const task = await readT01Task({
          apiBaseUrl: "http://localhost:52773/api/admin",
          accessToken: "task-token",
          taskId: 1075,
          fetchImpl: fetchImpl as typeof fetch,
        });

        expect(task).toMatchObject({
          id: 1075,
          name: "Meridian R5 T01 Isolated Witness",
          taskClass: "%SYS.Task.SwitchJournal",
          timePeriod: "On Demand",
          description: "Meridian R5 T01 isolated on-demand task-create witness | generation=g",
        });
      },
    );

    it(
      "classifies server failure after POST dispatch as unknown and never retries",
      async () => {
        const fetchImpl = vi.fn(
          async () => new Response(
            "server failure",
            {status: 500},
          ),
        );

        await expect(
          postT01TaskCreate({
            apiBaseUrl: "http://localhost:52773/api/admin",
            accessToken: "task-token",
            definition: t01TaskDefinition("generation-unknown"),
            fetchImpl: fetchImpl as typeof fetch,
          }),
        ).rejects.toBeInstanceOf(
          T01TaskMutationUnknownAfterDispatchError,
        );

        expect(fetchImpl).toHaveBeenCalledTimes(1);
      },
    );
  },
);
