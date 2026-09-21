import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildT01TaskCreateProofResults,
  createT01TaskCreateProofContract,
  reconcileUnknownT01TaskCreate,
  t01PoststateMatches,
  t01PrestateMatches,
  t01TaskCreateIntent,
  t01TaskHistoryMatchesCreateOnly,
  t01TaskSnapshotMatchesDefinition,
  type T01TaskCreatePreflight,
} from "./task-create";

import {
  t01TaskDefinition,
} from "../../iris/task-create-action-transport";

import {
  digestCanonicalJson,
} from "../../proof/digest";

function snapshot(generation: string) {
  const definition = t01TaskDefinition(generation);

  return Object.freeze({
    id: 1200,
    name: definition.Name,
    runAsUser: definition.RunAsUser,
    emailOnCompletion: definition.EmailOnCompletion,
    emailOnError: definition.EmailOnError,
    emailOnExpiration: definition.EmailOnExpiration,
    emailOutput: definition.EmailOutput,
    expires: definition.Expires,
    expiresDays: definition.ExpiresDays,
    expiresHours: definition.ExpiresHours,
    expiresMinutes: definition.ExpiresMinutes,
    openOutputFile: definition.OpenOutputFile,
    outputDirectory: definition.OutputDirectory,
    outputFilename: definition.OutputFilename,
    outputFileIsBinary: definition.OutputFileIsBinary,
    suspendOnError: definition.SuspendOnError,
    suspendTerminated: definition.SuspendTerminated,
    priority: definition.Priority,
    taskClass: definition.TaskClass,
    isBatch: definition.IsBatch,
    namespace: definition.NameSpace,
    timePeriod: definition.TimePeriod,
    timePeriodEvery: definition.TimePeriodEvery,
    timePeriodDay: definition.TimePeriodDay,
    dailyFrequency: definition.DailyFrequency,
    dailyFrequencyTime: definition.DailyFrequencyTime,
    dailyIncrement: definition.DailyIncrement,
    dailyStartTime: definition.DailyStartTime,
    dailyEndTime: definition.DailyEndTime,
    runAfterGuid: definition.RunAfterGUID,
    startDate: definition.StartDate,
    endDate: definition.EndDate,
    mirrorStatus: definition.MirrorStatus,
    rescheduleOnStart: definition.RescheduleOnStart,
    description: definition.Description,
  });
}

function preflight(
  generation: string,
  state: "PRE" | "POST" = "PRE",
): T01TaskCreatePreflight {
  const definition = t01TaskDefinition(generation);

  return Object.freeze({
    schemaVersion: "meridian.task-create-preflight.v1" as const,
    expectedFixtureGeneration: generation,
    taskName: "Meridian R5 T01 Isolated Witness" as const,
    expectedDefinitionDigest: digestCanonicalJson(definition),
    matchingTaskIds: state === "PRE" ? Object.freeze([]) : Object.freeze([1200]),
    matchingTaskCount: state === "PRE" ? 0 : 1,
    matchingTask: state === "PRE" ? null : snapshot(generation),
    taskInventoryCount: state === "PRE" ? 16 : 17,
    matchingUpcomingCount: 0,
    matchingHistoryCount: state === "PRE" ? 0 : 1,
    matchingHistory:
      state === "PRE"
        ? Object.freeze([])
        : Object.freeze([
            Object.freeze({
              taskId: 1200,
              name: "Meridian R5 T01 Isolated Witness",
              namespace: "%SYS",
              lastStart: "2026-09-21 16:44:00",
              completed: "2026-09-21 16:44:00",
              status: "1",
              result: "Create Meridian R5 T01 Isolated Witness",
            }),
          ]),
    taskManagerStatus: "Running",
    officialMutationOperation: "POST /v2/task" as const,
    requiredAuthority: "%Admin_Task:U" as const,
    authorityRole: "MeridianTaskMetadataReader" as const,
    authorityMode: "EXPLICIT_ESCALATION_ROLE" as const,
  });
}

describe(
  "T01 TASK_CREATE proof path",
  () => {
    it(
      "freezes exact absence and one On Demand task expected delta",
      async () => {
        const generation = "t01-test-generation";
        const contract = createT01TaskCreateProofContract({
          async readFreshPreflight() {
            return preflight(generation);
          },
          async executeCreate() {
            return Object.freeze({
              taskId: 1200,
              status: 201 as const,
              mutationRequestCount: 1 as const,
            });
          },
          async collectProofResults() {
            return Object.freeze([]);
          },
        });

        const intent = t01TaskCreateIntent(generation);
        const observed = await contract.preflight(
          {
            actionId: "test-t01",
            logicalActor: "test",
            irisRuntimeUser: "meridian.runtime",
            nowUtc: "2026-09-21T15:00:00.000Z",
          },
          intent,
        );

        expect(t01PrestateMatches(observed)).toBe(true);

        const delta = contract.expectedDelta(intent, observed) as unknown as {
          readonly before: {readonly matchingTaskCount: number};
          readonly after: {readonly matchingTaskCount: number; readonly timePeriod: string};
        };

        expect(delta.before.matchingTaskCount).toBe(0);
        expect(delta.after).toMatchObject({
          matchingTaskCount: 1,
          timePeriod: "On Demand",
        });
      },
    );

    it(
      "requires canonical generation-bound detail plus one create-management history row and zero execution state",
      () => {
        const generation = "t01-readback";
        const reviewed = preflight(generation);
        const current = preflight(generation, "POST");

        expect(
          t01TaskSnapshotMatchesDefinition(
            snapshot(generation),
            t01TaskDefinition(generation),
          ),
        ).toBe(true);
        expect(t01PoststateMatches(current, reviewed, 1200)).toBe(true);

        expect(
          t01TaskHistoryMatchesCreateOnly(
            current.matchingHistory,
            1200,
          ),
        ).toBe(true);

        expect(
          t01PoststateMatches(
            Object.freeze({
              ...current,
              matchingHistoryCount: 2,
              matchingHistory: Object.freeze([
                ...current.matchingHistory,
                Object.freeze({
                  taskId: 1200,
                  name: "Meridian R5 T01 Isolated Witness",
                  namespace: "%SYS",
                  lastStart: "2026-09-21 16:45:00",
                  completed: "2026-09-21 16:45:01",
                  status: "1",
                  result: "Run Meridian R5 T01 Isolated Witness",
                }),
              ]),
            }),
            reviewed,
            1200,
          ),
        ).toBe(false);
      },
    );

    it(
      "returns typed stale revalidation with zero mutation dispatch",
      async () => {
        const generation = "t01-stale";
        let current = preflight(generation);
        let mutationCount = 0;

        const contract = createT01TaskCreateProofContract({
          async readFreshPreflight() {
            return current;
          },
          async executeCreate() {
            mutationCount += 1;
            return Object.freeze({
              taskId: 1200,
              status: 201 as const,
              mutationRequestCount: 1 as const,
            });
          },
          async collectProofResults() {
            return Object.freeze([]);
          },
        });

        const intent = t01TaskCreateIntent(generation);
        const reviewed = await contract.preflight(
          {
            actionId: "test-t01-stale",
            logicalActor: "test",
            irisRuntimeUser: "meridian.runtime",
            nowUtc: "2026-09-21T15:00:00.000Z",
          },
          intent,
        );

        current = Object.freeze({
          ...current,
          taskManagerStatus: "Stopped",
        });

        const decision = await contract.revalidate(
          {
            actionId: "test-t01-stale",
            logicalActor: "test",
            irisRuntimeUser: "meridian.runtime",
            nowUtc: "2026-09-21T15:00:01.000Z",
          },
          {
            intent,
            preflight: reviewed,
            reviewedPreflightDigest: contract.digestPreflight(reviewed),
          },
        );

        expect(decision.outcome).toBe("STALE");
        expect(mutationCount).toBe(0);
      },
    );

    it(
      "reconciles only exact absence or one exact generation-bound task",
      () => {
        const generation = "t01-reconcile";
        const reviewed = preflight(generation);

        expect(
          reconcileUnknownT01TaskCreate(
            preflight(generation, "POST"),
            reviewed,
          ).outcome,
        ).toBe("APPLIED");

        expect(
          reconcileUnknownT01TaskCreate(
            reviewed,
            reviewed,
          ).outcome,
        ).toBe("NOT_APPLIED");

        const ambiguous = Object.freeze({
          ...preflight(generation, "POST"),
          matchingHistoryCount: 2,
          matchingHistory: Object.freeze([
            ...preflight(generation, "POST").matchingHistory,
            Object.freeze({
              taskId: 1200,
              name: "Meridian R5 T01 Isolated Witness",
              namespace: "%SYS",
              lastStart: "2026-09-21 16:45:00",
              completed: "2026-09-21 16:45:01",
              status: "1",
              result: "Run Meridian R5 T01 Isolated Witness",
            }),
          ]),
        });

        expect(
          reconcileUnknownT01TaskCreate(
            ambiguous,
            reviewed,
          ).outcome,
        ).toBe("STILL_UNKNOWN");
      },
    );

    it(
      "requires the four differentiated T01 proof planes",
      () => {
        const results = buildT01TaskCreateProofResults({
          observedAtUtc: "2026-09-21T15:00:10.000Z",
          httpIdentityVerified: true,
          configurationVerified: true,
          taskStateVerified: true,
          taskHistoryVerified: true,
          httpSourceReference: "http",
          configurationSourceReference: "config",
          taskStateSourceReference: "state",
          taskHistorySourceReference: "history",
        });

        expect(results.map((result) => result.plane)).toEqual([
          "HTTP_BEHAVIOR",
          "CONFIGURATION_READBACK",
          "TASK_STATE",
          "TASK_HISTORY",
        ]);
        expect(results.every((result) => result.status === "PASS")).toBe(true);
      },
    );
  },
);
