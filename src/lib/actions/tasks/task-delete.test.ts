import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildT06TaskDeleteProofResults,
  createT06TaskDeleteProofContract,
  reconcileUnknownT06TaskDelete,
  t06AuthorizedDeleteRequestDigest,
  t06PoststateMatches,
  t06PrestateMatches,
  t06TaskDeleteIntent,
  T06_TASK_DELETE_ACTION_ID,
  T06_TASK_DELETE_LEGACY_CLEANUP_ALIAS,
  T06_TASK_TARGET_CANONICAL_ID,
  T06_EXPECTED_FIXTURE_PROJECTION_DIGEST,
  type T06TaskDeletePreflight,
} from "./task-delete";

function taskSnapshot() {
  return Object.freeze({
    id:
      1006,
    name:
      "MeridianLab.OrderExporter",
    runAsUser:
      "meridian.runtime",
    emailOnCompletion:
      Object.freeze([]),
    emailOnError:
      Object.freeze([]),
    emailOnExpiration:
      Object.freeze([]),
    emailOutput:
      false,
    expires:
      false,
    expiresDays:
      0,
    expiresHours:
      0,
    expiresMinutes:
      0,
    openOutputFile:
      false,
    outputDirectory:
      "",
    outputFilename:
      "",
    outputFileIsBinary:
      false,
    suspendOnError:
      false,
    suspendTerminated:
      false,
    priority:
      "Normal",
    taskClass:
      "MeridianLab.OrderExporter",
    isBatch:
      false,
    namespace:
      "%SYS",
    timePeriod:
      "On Demand",
    timePeriodEvery:
      "",
    timePeriodDay:
      "",
    dailyFrequency:
      "Once",
    dailyFrequencyTime:
      "Hourly",
    dailyIncrement:
      "",
    dailyStartTime:
      "00:00:00",
    dailyEndTime:
      "23:59:59",
    runAfterGuid:
      "",
    startDate:
      "2099-12-31",
    endDate:
      "2099-12-31",
    mirrorStatus:
      "Primary",
    rescheduleOnStart:
      false,
    description:
      "Meridian R5 T04-T06 shared task witness | generation=5d1764a2-1cdf-4fc6-9bb9-eaf40ec62144",
  });
}

function taskSummary() {
  return Object.freeze({
    id:
      1006,
    name:
      "MeridianLab.OrderExporter",
    type:
      "User",
    namespace:
      "%SYS",
    description:
      "Meridian R5 T04-T06 shared task witness | generation=5d1764a2-1cdf-4fc6-9bb9-eaf40ec62144",
    suspended:
      false,
    lastFinished:
      "",
    nextScheduled:
      "",
  });
}

function prestate(): T06TaskDeletePreflight {
  return Object.freeze({
    schemaVersion:
      "meridian.task-delete-preflight.v1" as const,
    expectedFixtureGeneration:
      "5d1764a2-1cdf-4fc6-9bb9-eaf40ec62144",
    taskName:
      "MeridianLab.OrderExporter" as const,
    expectedTaskId:
      1006,
    expectedFixtureProjectionDigest:
      T06_EXPECTED_FIXTURE_PROJECTION_DIGEST,
    authorizedDeleteRequestDigest:
      t06AuthorizedDeleteRequestDigest(
        1006,
      ),
    predecessorT05ReceiptVerified:
      true,
    authoritativeExists:
      true,
    authoritativeSuspended:
      false,
    matchingTaskCount:
      1,
    matchingTask:
      taskSnapshot(),
    matchingSummary:
      taskSummary(),
    taskInventoryCount:
      17,
    matchingUpcomingCount:
      0,
    matchingHistoryCount:
      3,
    matchingHistory:
      Object.freeze([]),
    taskManagerStatus:
      "Running",
    officialMutationOperation:
      "DELETE /v2/task" as const,
    requiredAuthority:
      "%Admin_Task:U" as const,
    authorityRole:
      "MeridianTaskActionExecutor" as const,
    authorityMode:
      "EXPLICIT_ESCALATION_ROLE" as const,
  });
}

function poststate(
  reviewed:
    T06TaskDeletePreflight,
): T06TaskDeletePreflight {
  return Object.freeze({
    ...reviewed,
    authoritativeExists:
      false,
    authoritativeSuspended:
      null,
    matchingTaskCount:
      0,
    matchingTask:
      null,
    matchingSummary:
      null,
    taskInventoryCount:
      16,
    matchingHistoryCount:
      0,
    matchingHistory:
      Object.freeze([]),
  });
}

describe(
  "T06 task delete proof contract",
  () => {
    it(
      "freezes canonical T06 identity while preserving the T05 cleanup alias",
      () => {
        expect(
          T06_TASK_DELETE_ACTION_ID,
        ).toBe(
          "T06_TASK_DELETE",
        );

        expect(
          T06_TASK_DELETE_LEGACY_CLEANUP_ALIAS,
        ).toBe(
          "T06_TASK_DELETE_FIXTURE",
        );

        expect(
          T06_TASK_TARGET_CANONICAL_ID,
        ).toBe(
          "task:meridianlab-orderexporter",
        );
      },
    );

    it(
      "accepts only the exact verified resumed State A",
      () => {
        expect(
          t06PrestateMatches(
            prestate(),
          ),
        ).toBe(
          true,
        );

        expect(
          t06PrestateMatches({
            ...prestate(),
            authoritativeSuspended:
              true,
          }),
        ).toBe(
          false,
        );

        expect(
          t06PrestateMatches({
            ...prestate(),
            predecessorT05ReceiptVerified:
              false,
          }),
        ).toBe(
          false,
        );
      },
    );

    it(
      "freezes a bodyless no-retry DELETE request digest",
      () => {
        const digest =
          t06AuthorizedDeleteRequestDigest(
            1006,
          );

        expect(
          digest,
        ).toMatch(
          /^[A-F0-9]{64}$/,
        );

        expect(
          t06AuthorizedDeleteRequestDigest(
            1006,
          ),
        ).toBe(
          digest,
        );

        expect(
          () =>
            t06AuthorizedDeleteRequestDigest(
              0,
            ),
        ).toThrow(
          "positive safe integer",
        );
      },
    );

    it(
      "accepts only complete authoritative task absence as State B",
      () => {
        const reviewed =
          prestate();

        expect(
          t06PoststateMatches(
            poststate(
              reviewed,
            ),
            reviewed,
          ),
        ).toBe(
          true,
        );

        expect(
          t06PoststateMatches(
            {
              ...poststate(
                reviewed,
              ),
              matchingTaskCount:
                1,
            },
            reviewed,
          ),
        ).toBe(
          false,
        );
      },
    );

    it(
      "reconciles unknown outcome without retry",
      () => {
        const reviewed =
          prestate();

        expect(
          reconcileUnknownT06TaskDelete(
            poststate(
              reviewed,
            ),
            reviewed,
          ).outcome,
        ).toBe(
          "APPLIED",
        );

        expect(
          reconcileUnknownT06TaskDelete(
            reviewed,
            reviewed,
          ).outcome,
        ).toBe(
          "NOT_APPLIED",
        );

        expect(
          reconcileUnknownT06TaskDelete(
            {
              ...reviewed,
              authoritativeSuspended:
                true,
            },
            reviewed,
          ).outcome,
        ).toBe(
          "STILL_UNKNOWN",
        );
      },
    );

    it(
      "freezes HIGH irreversible least-privilege contract metadata with no recovery",
      () => {
        const reviewed =
          prestate();

        const contract =
          createT06TaskDeleteProofContract({
            readFreshPreflight:
              async () =>
                reviewed,
            executeDelete:
              async () =>
                Object.freeze({
                  taskId:
                    1006,
                  status:
                    200 as const,
                  mutationRequestCount:
                    1 as const,
                }),
            collectProofResults:
              async () =>
                Object.freeze([]),
          });

        expect(
          contract.actionType,
        ).toBe(
          "TASK_DELETE",
        );

        expect(
          contract.domain,
        ).toBe(
          "TASKS",
        );

        expect(
          contract.risk,
        ).toBe(
          "HIGH",
        );

        expect(
          contract.reversibility,
        ).toBe(
          "IRREVERSIBLE",
        );

        expect(
          contract.requiredAuthority,
        ).toEqual([
          {
            resource:
              "%Admin_Task",
            permission:
              "U",
            standing:
              false,
            escalationOnly:
              true,
          },
        ]);

        expect(
          contract.buildRecoveryPlan(
            {
              schemaVersion:
                "meridian.task-delete-execution.v1",
              state:
                "APPLIED",
              actionId:
                "T06_TASK_DELETE",
              taskName:
                "MeridianLab.OrderExporter",
              generation:
                "5d1764a2-1cdf-4fc6-9bb9-eaf40ec62144",
              taskId:
                1006,
              deleteStatus:
                200,
              httpDeleteResponseVerified:
                true,
              mutationRequestCount:
                1,
              taskAbsenceObserved:
                true,
              zeroUpcomingPreserved:
                true,
              resolutionSource:
                "DIRECT_EXECUTION",
            },
            [],
          ).recoveryActionType,
        ).toBeNull();
      },
    );

    it(
      "builds required HTTP and task-state proof results",
      () => {
        const results =
          buildT06TaskDeleteProofResults({
            observedAtUtc:
              "2026-09-22T12:00:00.000Z",
            httpDeleteVerified:
              true,
            taskAbsenceVerified:
              true,
            httpSourceReference:
              "DELETE /v2/task?id=1006",
            taskStateSourceReference:
              "native:%SYS.Task + GET /v2/tasks",
          });

        expect(
          results,
        ).toHaveLength(
          2,
        );

        expect(
          results.every(
            (
              result,
            ) =>
              result.status ===
                "PASS" &&
              result.applicability ===
                "REQUIRED",
          ),
        ).toBe(
          true,
        );
      },
    );

    it(
      "constructs only the canonical T06 intent",
      () => {
        expect(
          t06TaskDeleteIntent(
            "5d1764a2-1cdf-4fc6-9bb9-eaf40ec62144",
            1006,
          ),
        ).toEqual({
          actionId:
            "T06_TASK_DELETE",
          taskName:
            "MeridianLab.OrderExporter",
          expectedFixtureGeneration:
            "5d1764a2-1cdf-4fc6-9bb9-eaf40ec62144",
          expectedTaskId:
            1006,
        });
      },
    );
  },
);
