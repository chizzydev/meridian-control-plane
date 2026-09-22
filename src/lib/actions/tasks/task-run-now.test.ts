import {
  describe,
  expect,
  it,
} from "vitest";

import {
  digestCanonicalJson,
} from "../../proof/digest";

import {
  T03_TASK_NAME,
  T03_TASK_ROLE,
  t03TaskDefinition,
  type T03TaskHistoryRow,
  type T03TaskInfo,
  type T03TaskSnapshot,
  type T03TaskSummary,
} from "../../iris/task-run-now-action-transport";

import {
  T03_TASK_RUN_NOW_CONTRACT_ID,
  T03_TASK_RUN_NOW_PROOF_REQUIREMENTS,
  buildT03TaskRunNowProofResults,
  createT03TaskRunNowProofContract,
  reconcileUnknownT03TaskRunNow,
  t03PoststateMatches,
  t03PrestateMatches,
  t03TaskHistoryMatchesSingleSuccessfulRun,
  t03TaskRunNowIntent,
  type T03TaskRunNowPreflight,
} from "./task-run-now";

const GENERATION =
  "8f68f2e9-6a9c-44ac-a109-e7066a068584";

const TASK_ID =
  1005;

function snapshot():
  T03TaskSnapshot {
  const definition =
    t03TaskDefinition(
      GENERATION,
    );

  return Object.freeze({
    id:
      TASK_ID,

    name:
      definition.Name,

    runAsUser:
      definition.RunAsUser,

    emailOnCompletion:
      definition.EmailOnCompletion,

    emailOnError:
      definition.EmailOnError,

    emailOnExpiration:
      definition.EmailOnExpiration,

    emailOutput:
      definition.EmailOutput,

    expires:
      definition.Expires,

    expiresDays:
      definition.ExpiresDays,

    expiresHours:
      definition.ExpiresHours,

    expiresMinutes:
      definition.ExpiresMinutes,

    openOutputFile:
      definition.OpenOutputFile,

    outputDirectory:
      definition.OutputDirectory,

    outputFilename:
      definition.OutputFilename,

    outputFileIsBinary:
      definition.OutputFileIsBinary,

    suspendOnError:
      definition.SuspendOnError,

    suspendTerminated:
      definition.SuspendTerminated,

    priority:
      definition.Priority,

    taskClass:
      definition.TaskClass,

    isBatch:
      definition.IsBatch,

    namespace:
      definition.NameSpace,

    timePeriod:
      definition.TimePeriod,

    timePeriodEvery:
      definition.TimePeriodEvery,

    timePeriodDay:
      definition.TimePeriodDay,

    dailyFrequency:
      definition.DailyFrequency,

    dailyFrequencyTime:
      definition.DailyFrequencyTime,

    dailyIncrement:
      definition.DailyIncrement,

    dailyStartTime:
      definition.DailyStartTime,

    dailyEndTime:
      definition.DailyEndTime,

    runAfterGuid:
      definition.RunAfterGUID,

    startDate:
      definition.StartDate,

    endDate:
      definition.EndDate,

    mirrorStatus:
      definition.MirrorStatus,

    rescheduleOnStart:
      definition.RescheduleOnStart,

    description:
      definition.Description,

    settings:
      Object.freeze({}),
  });
}

function summary(
  lastFinished =
    "",
): T03TaskSummary {
  const definition =
    t03TaskDefinition(
      GENERATION,
    );

  return Object.freeze({
    id:
      TASK_ID,

    name:
      T03_TASK_NAME,

    type:
      "User",

    namespace:
      "%SYS",

    description:
      definition.Description,

    suspended:
      false,

    lastFinished,

    nextScheduled:
      "",
  });
}

function preInfo():
  T03TaskInfo {
  return Object.freeze({
    lastSchedule:
      "",

    lastStarted:
      "",

    lastFinished:
      "",

    status:
      "1",

    error:
      "",

    type:
      "User",
  });
}

function postInfo():
  T03TaskInfo {
  return Object.freeze({
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
}

function createRow():
  T03TaskHistoryRow {
  return Object.freeze({
    taskId:
      TASK_ID,

    name:
      T03_TASK_NAME,

    namespace:
      "%SYS",

    lastStart:
      "",

    completed:
      "",

    status:
      "1",

    result:
      `Create ${T03_TASK_NAME}`,

    routine:
      "TASKMGR",

    username:
      "meridian.runtime",

    logDatetime:
      "2026-09-21 20:45:00",

    pid:
      "",
  });
}

function runRow():
  T03TaskHistoryRow {
  return Object.freeze({
    taskId:
      TASK_ID,

    name:
      T03_TASK_NAME,

    namespace:
      "%SYS",

    lastStart:
      "2026-09-21 20:55:00",

    completed:
      "2026-09-21 20:55:00",

    status:
      "1",

    result:
      "Success",

    routine:
      "Meridian.R5.T03.RunNowWitness.1",

    username:
      "meridian.runtime",

    logDatetime:
      "2026-09-21 20:55:00",

    pid:
      "1234",
  });
}

function requestDigest():
  string {
  return digestCanonicalJson({
    operation:
      "POST /v2/task/run",

    requiredAuthority:
      "%Admin_Task:U",

    authorityRole:
      T03_TASK_ROLE,

    query: {
      id:
        TASK_ID,
    },

    body: {
      RunNow:
        true,
    },

    automaticRetryAllowed:
      false,
  });
}

function preflight():
  T03TaskRunNowPreflight {
  const definition =
    t03TaskDefinition(
      GENERATION,
    );

  return Object.freeze({
    schemaVersion:
      "meridian.task-run-now-preflight.v1",

    expectedFixtureGeneration:
      GENERATION,

    taskName:
      T03_TASK_NAME,

    expectedTaskId:
      TASK_ID,

    expectedDefinitionDigest:
      digestCanonicalJson(
        definition,
      ),

    authorizedRunRequestDigest:
      requestDigest(),

    matchingTaskCount:
      1,

    matchingTask:
      snapshot(),

    matchingSummary:
      summary(),

    matchingInfo:
      preInfo(),

    taskInventoryCount:
      17,

    matchingUpcomingCount:
      0,

    matchingHistoryCount:
      1,

    matchingHistory:
      Object.freeze([
        createRow(),
      ]),

    taskManagerStatus:
      "Running",

    officialMutationOperation:
      "POST /v2/task/run",

    requiredAuthority:
      "%Admin_Task:U",

    authorityRole:
      T03_TASK_ROLE,

    authorityMode:
      "EXPLICIT_ESCALATION_ROLE",
  });
}

function postflight():
  T03TaskRunNowPreflight {
  const before =
    preflight();

  return Object.freeze({
    ...before,

    matchingTask:
      snapshot(),

    matchingSummary:
      summary(
        "2026-09-21 20:55:00",
      ),

    matchingInfo:
      postInfo(),

    matchingHistoryCount:
      2,

    matchingHistory:
      Object.freeze([
        runRow(),
        createRow(),
      ]),
  });
}

describe(
  "T03 task run-now proof contract",
  () => {
    it(
      "accepts the exact never-started State A and one-successful-run State B",
      () => {
        const before =
          preflight();

        const after =
          postflight();

        expect(
          t03PrestateMatches(
            before,
          ),
        ).toBe(
          true,
        );

        expect(
          t03PoststateMatches(
            after,
            before,
          ),
        ).toBe(
          true,
        );

        expect(
          t03TaskHistoryMatchesSingleSuccessfulRun(
            after.matchingHistory,
            before.matchingHistory,
            TASK_ID,
          ),
        ).toBe(
          true,
        );
      },
    );

    it(
      "accepts either SysAdmin history ordering while preserving the exact reviewed create row",
      () => {
        const before =
          preflight();

        expect(
          t03TaskHistoryMatchesSingleSuccessfulRun(
            Object.freeze([
              runRow(),
              createRow(),
            ]),
            before.matchingHistory,
            TASK_ID,
          ),
        ).toBe(
          true,
        );

        expect(
          t03TaskHistoryMatchesSingleSuccessfulRun(
            Object.freeze([
              createRow(),
              runRow(),
            ]),
            before.matchingHistory,
            TASK_ID,
          ),
        ).toBe(
          true,
        );

        expect(
          t03TaskHistoryMatchesSingleSuccessfulRun(
            Object.freeze([
              runRow(),
              Object.freeze({
                ...createRow(),
                pid:
                  "unexpected-drift",
              }),
            ]),
            before.matchingHistory,
            TASK_ID,
          ),
        ).toBe(
          false,
        );

        expect(
          t03TaskHistoryMatchesSingleSuccessfulRun(
            Object.freeze([
              runRow(),
              runRow(),
            ]),
            before.matchingHistory,
            TASK_ID,
          ),
        ).toBe(
          false,
        );
      },
    );

    it(
      "rejects configuration drift and extra execution rows",
      () => {
        const before =
          preflight();

        const driftedTask =
          Object.freeze({
            ...snapshot(),
            priority:
              "Low",
          });

        expect(
          t03PoststateMatches(
            Object.freeze({
              ...postflight(),
              matchingTask:
                driftedTask,
            }),
            before,
          ),
        ).toBe(
          false,
        );

        expect(
          t03PoststateMatches(
            Object.freeze({
              ...postflight(),
              matchingHistoryCount:
                3,
              matchingHistory:
                Object.freeze([
                  createRow(),
                  runRow(),
                  runRow(),
                ]),
            }),
            before,
          ),
        ).toBe(
          false,
        );
      },
    );

    it(
      "reconciles exact State B as applied and exact State A as not applied",
      () => {
        expect(
          reconcileUnknownT03TaskRunNow(
            postflight(),
            preflight(),
          ).outcome,
        ).toBe(
          "APPLIED",
        );

        expect(
          reconcileUnknownT03TaskRunNow(
            preflight(),
            preflight(),
          ).outcome,
        ).toBe(
          "NOT_APPLIED",
        );
      },
    );

    it(
      "builds four required proof planes",
      () => {
        const results =
          buildT03TaskRunNowProofResults({
            observedAtUtc:
              "2026-09-21T20:55:01.000Z",

            httpRunVerified:
              true,

            configurationPreserved:
              true,

            taskStateVerified:
              true,

            taskHistoryVerified:
              true,

            observedHistoryResult:
              "Success",

            httpSourceReference:
              "POST /v2/task/run?id=1005",

            configurationSourceReference:
              "GET /v2/task?id=1005",

            taskStateSourceReference:
              "GET /v2/task/info?id=1005",

            taskHistorySourceReference:
              "GET /v2/task/history?taskId=1005",
          });

        expect(
          results.map(
            (
              item,
            ) =>
              [
                item.requirementId,
                item.status,
              ],
          ),
        ).toEqual([
          [
            "t03-http-run-now",
            "PASS",
          ],
          [
            "t03-configuration-preservation",
            "PASS",
          ],
          [
            "t03-task-info-completion",
            "PASS",
          ],
          [
            "t03-single-success-history-transition",
            "PASS",
          ],
        ]);
      },
    );

    it(
      "freezes irreversible no-retry metadata and target identity",
      () => {
        const contract =
          createT03TaskRunNowProofContract({
            readFreshPreflight:
              async () =>
                preflight(),

            executeRunNow:
              async () =>
                Object.freeze({
                  taskId:
                    TASK_ID,
                  status:
                    200 as const,
                  mutationRequestCount:
                    1 as const,
                }),

            collectProofResults:
              async () =>
                Object.freeze([]),
          });

        const intent =
          t03TaskRunNowIntent(
            GENERATION,
            TASK_ID,
          );

        expect(
          contract.contractId,
        ).toBe(
          T03_TASK_RUN_NOW_CONTRACT_ID,
        );

        expect(
          contract.actionType,
        ).toBe(
          "TASK_RUN_NOW",
        );

        expect(
          contract.risk,
        ).toBe(
          "MEDIUM",
        );

        expect(
          contract.reversibility,
        ).toBe(
          "IRREVERSIBLE",
        );

        expect(
          contract.target(
            intent,
          ),
        ).toMatchObject({
          canonicalId:
            "task:meridian-r5-t03-run-now-witness",

          generation:
            GENERATION,
        });

        expect(
          T03_TASK_RUN_NOW_PROOF_REQUIREMENTS.map(
            (
              requirement,
            ) =>
              requirement.requirementId,
          ),
        ).toEqual([
          "t03-http-run-now",
          "t03-configuration-preservation",
          "t03-task-info-completion",
          "t03-single-success-history-transition",
        ]);

        expect(
          contract.buildRecoveryPlan(
            {
              schemaVersion:
                "meridian.task-run-now-execution.v1",
              state:
                "APPLIED",
              actionId:
                "T03_TASK_RUN_NOW",
              taskName:
                T03_TASK_NAME,
              generation:
                GENERATION,
              taskId:
                TASK_ID,
              runStatus:
                200,
              httpRunResponseVerified:
                true,
              mutationRequestCount:
                1,
              configurationPreserved:
                true,
              successfulExecutionHistoryObserved:
                true,
              taskInfoCompletionObserved:
                true,
              zeroUpcomingPreserved:
                true,
              resolutionSource:
                "DIRECT_EXECUTION",
            },
            [],
          ),
        ).toMatchObject({
          recoveryActionType:
            null,

          automatic:
            false,
        });
      },
    );
  },
);
