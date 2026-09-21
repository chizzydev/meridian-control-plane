import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildT02TaskUpdateProofResults,
  createT02TaskUpdateProofContract,
  reconcileUnknownT02TaskUpdate,
  t02PoststateMatches,
  t02PrestateMatches,
  t02SnapshotsEqualExceptPriority,
  t02TaskHistoryMatchesCreateOnly,
  t02TaskHistoryPreserved,
  t02TaskUpdateIntent,
  type T02TaskUpdatePreflight,
} from "./task-update";

import {
  t02PriorityUpdatePatch,
  t02TaskDefinition,
  type T02TaskHistoryRow,
  type T02TaskSnapshot,
} from "../../iris/task-update-action-transport";

import {
  digestCanonicalJson,
} from "../../proof/digest";

function snapshot(
  generation:
    string,
  priority:
    "Normal" |
    "Low" =
      "Normal",
): T02TaskSnapshot {
  const definition =
    t02TaskDefinition(
      generation,
    );

  return Object.freeze({
    id:
      1500,

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

    priority,

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

function createHistory():
  T02TaskHistoryRow {
  return Object.freeze({
    taskId:
      1500,

    name:
      "Meridian R5 T02 Update Witness",

    namespace:
      "%SYS",

    lastStart:
      "2026-09-21 18:00:00",

    completed:
      "2026-09-21 18:00:00",

    status:
      "1",

    result:
      "Create Meridian R5 T02 Update Witness",

    routine:
      "TASKMGR",

    username:
      "meridian.runtime",

    logDatetime:
      "2026-09-21 18:00:01",

    pid:
      "100",
  });
}

function updateHistory(
  result =
    "Edit Meridian R5 T02 Update Witness",
): T02TaskHistoryRow {
  return Object.freeze({
    taskId:
      1500,

    name:
      "Meridian R5 T02 Update Witness",

    namespace:
      "%SYS",

    lastStart:
      "2026-09-21 18:00:02",

    completed:
      "2026-09-21 18:00:02",

    status:
      "1",

    result,

    routine:
      "TASKMGR",

    username:
      "meridian.runtime",

    logDatetime:
      "2026-09-21 18:00:03",

    pid:
      "101",
  });
}

function preflight(
  generation:
    string,
  state:
    "PRE" |
    "POST" =
      "PRE",
): T02TaskUpdatePreflight {
  const definition =
    t02TaskDefinition(
      generation,
    );

  const task =
    snapshot(
      generation,
      state ===
        "PRE"
        ? "Normal"
        : "Low",
    );

  const history =
    Object.freeze([
      createHistory(),
    ]);

  return Object.freeze({
    schemaVersion:
      "meridian.task-update-preflight.v1" as const,

    expectedFixtureGeneration:
      generation,

    taskName:
      "Meridian R5 T02 Update Witness" as const,

    expectedTaskId:
      1500,

    expectedBeforeDefinitionDigest:
      digestCanonicalJson(
        definition,
      ),

    authorizedPatchDigest:
      digestCanonicalJson(
        t02PriorityUpdatePatch(),
      ),

    matchingTaskCount:
      1,

    matchingTask:
      task,

    matchingSummary:
      Object.freeze({
        id:
          1500,

        name:
          "Meridian R5 T02 Update Witness",

        type:
          "User",

        namespace:
          "%SYS",

        description:
          definition.Description,

        suspended:
          false,

        lastFinished:
          "",

        nextScheduled:
          "",
      }),

    taskInventoryCount:
      17,

    matchingUpcomingCount:
      0,

    matchingHistoryCount:
      history.length,

    matchingHistory:
      history,

    taskManagerStatus:
      "Running",

    officialMutationOperation:
      "PUT /v2/task" as const,

    requiredAuthority:
      "%Admin_Task:U" as const,

    authorityRole:
      "MeridianTaskMetadataReader" as const,

    authorityMode:
      "EXPLICIT_ESCALATION_ROLE" as const,
  });
}

describe(
  "T02 TASK_UPDATE proof path",
  () => {
    it(
      "freezes one-field Normal to Low expected delta",
      async () => {
        const generation =
          "t02-delta";

        const contract =
          createT02TaskUpdateProofContract({
            async readFreshPreflight() {
              return preflight(
                generation,
              );
            },

            async executeUpdate() {
              return Object.freeze({
                taskId:
                  1500,

                status:
                  200 as const,

                mutationRequestCount:
                  1 as const,
              });
            },

            async collectProofResults() {
              return Object.freeze([]);
            },
          });

        const intent =
          t02TaskUpdateIntent(
            generation,
            1500,
          );

        const observed =
          await contract.preflight(
            {
              actionId:
                "test-t02",

              logicalActor:
                "test",

              irisRuntimeUser:
                "meridian.runtime",

              nowUtc:
                "2026-09-21T17:00:00.000Z",
            },
            intent,
          );

        expect(
          t02PrestateMatches(
            observed,
          ),
        ).toBe(
          true,
        );

        const delta =
          contract.expectedDelta(
            intent,
            observed,
          ) as unknown as {
            readonly before: {
              readonly priority:
                string;
            };

            readonly after: {
              readonly priority:
                string;

              readonly authorizedChangedFieldCount:
                number;

              readonly authorizedChangedField:
                string;
            };
          };

        expect(
          delta.before.priority,
        ).toBe(
          "Normal",
        );

        expect(
          delta.after,
        ).toMatchObject({
          priority:
            "Low",

          authorizedChangedFieldCount:
            1,

          authorizedChangedField:
            "Priority",
        });
      },
    );

    it(
      "accepts exact Priority-only poststate with task history preserved byte-for-byte",
      () => {
        const reviewed =
          preflight(
            "t02-post",
          );

        const current =
          preflight(
            "t02-post",
            "POST",
          );

        expect(
          t02SnapshotsEqualExceptPriority(
            reviewed.matchingTask as T02TaskSnapshot,
            current.matchingTask as T02TaskSnapshot,
          ),
        ).toBe(
          true,
        );

        expect(
          t02TaskHistoryMatchesCreateOnly(
            reviewed.matchingHistory,
            1500,
          ),
        ).toBe(
          true,
        );

        expect(
          t02TaskHistoryPreserved(
            current.matchingHistory,
            reviewed.matchingHistory,
          ),
        ).toBe(
          true,
        );

        expect(
          t02PoststateMatches(
            current,
            reviewed,
          ),
        ).toBe(
          true,
        );
      },
    );

    it(
      "rejects any non-Priority configuration drift",
      () => {
        const reviewed =
          preflight(
            "t02-drift",
          );

        const current =
          preflight(
            "t02-drift",
            "POST",
          );

        const drifted =
          Object.freeze({
            ...current,

            matchingTask:
              Object.freeze({
                ...(current.matchingTask as T02TaskSnapshot),

                description:
                  "drifted",
              }),
          });

        expect(
          t02PoststateMatches(
            drifted,
            reviewed,
          ),
        ).toBe(
          false,
        );
      },
    );

    it(
      "rejects schedule leakage, summary drift, or a second new history row",
      () => {
        const reviewed =
          preflight(
            "t02-leak",
          );

        const current =
          preflight(
            "t02-leak",
            "POST",
          );

        expect(
          t02PoststateMatches(
            Object.freeze({
              ...current,

              matchingUpcomingCount:
                1,
            }),
            reviewed,
          ),
        ).toBe(
          false,
        );

        const currentSummary =
          current.matchingSummary;

        if (
          currentSummary ===
            null
        ) {
          throw new Error(
            "T02 test fixture summary is unexpectedly null.",
          );
        }

        expect(
          t02PoststateMatches(
            Object.freeze({
              ...current,

              matchingSummary:
                Object.freeze({
                  ...currentSummary,

                  nextScheduled:
                    "2099-12-31 00:00:00",
                }),
            }),
            reviewed,
          ),
        ).toBe(
          false,
        );

        expect(
          t02PoststateMatches(
            Object.freeze({
              ...current,

              matchingHistoryCount:
                2,

              matchingHistory:
                Object.freeze([
                  ...current.matchingHistory,

                  updateHistory(
                    "Run Meridian R5 T02 Update Witness",
                  ),
                ]),
            }),
            reviewed,
          ),
        ).toBe(
          false,
        );
      },
    );

    it(
      "rejects every new history row after the Priority-only PUT",
      () => {
        const reviewed =
          preflight(
            "t02-history",
          );

        for (
          const result
          of [
            "Edit Meridian R5 T02 Update Witness",
            "Run Meridian R5 T02 Update Witness",
            "Suspend Meridian R5 T02 Update Witness",
            "Resume Meridian R5 T02 Update Witness",
            "Delete Meridian R5 T02 Update Witness",
          ]
        ) {
          const changedHistory =
            Object.freeze([
              ...reviewed.matchingHistory,

              updateHistory(
                result,
              ),
            ]);

          expect(
            t02TaskHistoryPreserved(
              changedHistory,
              reviewed.matchingHistory,
            ),
          ).toBe(
            false,
          );

          expect(
            t02PoststateMatches(
              Object.freeze({
                ...preflight(
                  "t02-history",
                  "POST",
                ),

                matchingHistoryCount:
                  changedHistory.length,

                matchingHistory:
                  changedHistory,
              }),
              reviewed,
            ),
          ).toBe(
            false,
          );
        }
      },
    );

    it(
      "returns stale revalidation with zero update dispatch",
      async () => {
        const generation =
          "t02-stale";

        let current =
          preflight(
            generation,
          );

        let mutationCount =
          0;

        const contract =
          createT02TaskUpdateProofContract({
            async readFreshPreflight() {
              return current;
            },

            async executeUpdate() {
              mutationCount +=
                1;

              return Object.freeze({
                taskId:
                  1500,

                status:
                  200 as const,

                mutationRequestCount:
                  1 as const,
              });
            },

            async collectProofResults() {
              return Object.freeze([]);
            },
          });

        const intent =
          t02TaskUpdateIntent(
            generation,
            1500,
          );

        const reviewed =
          await contract.preflight(
            {
              actionId:
                "test-t02-stale",

              logicalActor:
                "test",

              irisRuntimeUser:
                "meridian.runtime",

              nowUtc:
                "2026-09-21T17:00:00.000Z",
            },
            intent,
          );

        current =
          Object.freeze({
            ...current,

            taskManagerStatus:
              "Stopped",
          });

        const decision =
          await contract.revalidate(
            {
              actionId:
                "test-t02-stale",

              logicalActor:
                "test",

              irisRuntimeUser:
                "meridian.runtime",

              nowUtc:
                "2026-09-21T17:00:01.000Z",
            },
            {
              intent,

              preflight:
                reviewed,

              reviewedPreflightDigest:
                contract.digestPreflight(
                  reviewed,
                ),
            },
          );

        expect(
          decision.outcome,
        ).toBe(
          "STALE",
        );

        expect(
          mutationCount,
        ).toBe(
          0,
        );
      },
    );

    it(
      "reconciles only exact A, exact B, or still unknown",
      () => {
        const reviewed =
          preflight(
            "t02-reconcile",
          );

        expect(
          reconcileUnknownT02TaskUpdate(
            preflight(
              "t02-reconcile",
              "POST",
            ),
            reviewed,
          ).outcome,
        ).toBe(
          "APPLIED",
        );

        expect(
          reconcileUnknownT02TaskUpdate(
            reviewed,
            reviewed,
          ).outcome,
        ).toBe(
          "NOT_APPLIED",
        );

        const ambiguous =
          Object.freeze({
            ...preflight(
              "t02-reconcile",
              "POST",
            ),

            matchingTask:
              Object.freeze({
                ...(preflight(
                  "t02-reconcile",
                  "POST",
                ).matchingTask as T02TaskSnapshot),

                outputFilename:
                  "unexpected.txt",
              }),
          });

        expect(
          reconcileUnknownT02TaskUpdate(
            ambiguous,
            reviewed,
          ).outcome,
        ).toBe(
          "STILL_UNKNOWN",
        );
      },
    );

    it(
      "requires the four differentiated T02 proof planes",
      () => {
        const results =
          buildT02TaskUpdateProofResults({
            observedAtUtc:
              "2026-09-21T17:00:10.000Z",

            httpUpdateVerified:
              true,

            configurationPreserved:
              true,

            taskStateVerified:
              true,

            taskHistoryVerified:
              true,

            observedHistoryResult:
              "UNCHANGED",

            httpSourceReference:
              "http",

            configurationSourceReference:
              "config",

            taskStateSourceReference:
              "state",

            taskHistorySourceReference:
              "history",
          });

        expect(
          results.map(
            (
              result,
            ) =>
              result.plane,
          ),
        ).toEqual([
          "HTTP_BEHAVIOR",
          "CONFIGURATION_READBACK",
          "TASK_STATE",
          "TASK_HISTORY",
        ]);

        expect(
          results.every(
            (
              result,
            ) =>
              result.status ===
                "PASS",
          ),
        ).toBe(
          true,
        );
      },
    );

    it(
      "freezes manual inverse TASK_UPDATE recovery and never automatic rollback",
      () => {
        const contract =
          createT02TaskUpdateProofContract({
            async readFreshPreflight() {
              return preflight(
                "t02-recovery",
              );
            },

            async executeUpdate() {
              return Object.freeze({
                taskId:
                  1500,

                status:
                  200 as const,

                mutationRequestCount:
                  1 as const,
              });
            },

            async collectProofResults() {
              return Object.freeze([]);
            },
          });

        const plan =
          contract.buildRecoveryPlan(
            Object.freeze({
              schemaVersion:
                "meridian.task-update-execution.v2" as const,

              state:
                "APPLIED" as const,

              actionId:
                "T02_TASK_UPDATE" as const,

              taskName:
                "Meridian R5 T02 Update Witness" as const,

              generation:
                "t02-recovery",

              taskId:
                1500,

              updateStatus:
                200 as const,

              httpUpdateResponseVerified:
                true,

              mutationRequestCount:
                1 as const,

              priorityBefore:
                "Normal" as const,

              priorityAfter:
                "Low" as const,

              nonTargetConfigurationPreserved:
                true as const,

              noExecutionObserved:
                true as const,

              resolutionSource:
                "DIRECT_EXECUTION" as const,
            }),
            Object.freeze([]),
          );

        expect(
          plan,
        ).toMatchObject({
          recoveryActionType:
            "TASK_UPDATE",

          automatic:
            false,
        });
      },
    );
  },
);
