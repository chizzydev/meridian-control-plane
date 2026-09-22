import {
  describe,
  expect,
  it,
} from "vitest";

import {
  digestCanonicalJson,
} from "../../proof/digest";

import {
  T05_EXPECTED_CREATE_BODY_DIGEST,
  T05_EXPECTED_FIXTURE_PROJECTION_DIGEST,
  T05_TASK_RESUME_CONTRACT_ID,
  T05_TASK_RESUME_PROOF_REQUIREMENTS,
  buildT05TaskResumeProofResults,
  createT05TaskResumeProofContract,
  reconcileUnknownT05TaskResume,
  t05AuthorizedResumeRequestDigest,
  t05PoststateMatches,
  t05PrestateMatches,
  t05TaskHistoryMatchesSuspendedStateA,
  t05TaskResumeIntent,
  type T05TaskResumePreflight,
} from "./task-resume";

import {
  T05_TASK_NAME,
  T05_TASK_ROLE,
  t05TaskDescription,
  type T05TaskHistoryRow,
  type T05TaskSnapshot,
  type T05TaskSummary,
} from "../../iris/task-resume-action-transport";

const GENERATION =
  "5d1764a2-1cdf-4fc6-9bb9-eaf40ec62144";

const TASK_ID =
  1006;

function snapshot():
  T05TaskSnapshot {
  return Object.freeze({
    id:
      TASK_ID,

    name:
      T05_TASK_NAME,

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
      t05TaskDescription(
        GENERATION,
      ),
  });
}

function summary(
  suspended =
    false,
): T05TaskSummary {
  return Object.freeze({
    id:
      TASK_ID,

    name:
      T05_TASK_NAME,

    type:
      "User",

    namespace:
      "%SYS",

    description:
      t05TaskDescription(
        GENERATION,
      ),

    suspended,

    lastFinished:
      "",

    nextScheduled:
      "",
  });
}

function createRow():
  T05TaskHistoryRow {
  return Object.freeze({
    taskId:
      TASK_ID,

    name:
      T05_TASK_NAME,

    namespace:
      "%SYS",

    lastStart:
      "",

    completed:
      "",

    status:
      "1",

    result:
      `Create ${T05_TASK_NAME}`,
  });
}

function suspendRow():
  T05TaskHistoryRow {
  return Object.freeze({
    taskId:
      TASK_ID,

    name:
      T05_TASK_NAME,

    namespace:
      "%SYS",

    lastStart:
      "2026-09-22 01:36:00",

    completed:
      "2026-09-22 01:36:00",

    status:
      "1",

    result:
      "Suspended task",
  });
}

function preflight(
  authoritativeSuspended =
    true,
  history:
    readonly T05TaskHistoryRow[] =
    Object.freeze([
      suspendRow(),
      createRow(),
    ]),
): T05TaskResumePreflight {
  return Object.freeze({
    schemaVersion:
      "meridian.task-resume-preflight.v1",

    expectedFixtureGeneration:
      GENERATION,

    taskName:
      T05_TASK_NAME,

    expectedTaskId:
      TASK_ID,

    expectedFixtureProjectionDigest:
      T05_EXPECTED_FIXTURE_PROJECTION_DIGEST,

    expectedCreateBodyDigest:
      T05_EXPECTED_CREATE_BODY_DIGEST,

    authorizedResumeRequestDigest:
      t05AuthorizedResumeRequestDigest(
        TASK_ID,
      ),

    authoritativeSuspended,

    matchingTaskCount:
      1,

    matchingTask:
      snapshot(),

    matchingSummary:
      summary(
        false,
      ),

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
      "POST /v2/task/resume",

    requiredAuthority:
      "%Admin_Task:U",

    authorityRole:
      T05_TASK_ROLE,

    authorityMode:
      "EXPLICIT_ESCALATION_ROLE",
  });
}

describe(
  "T05 task resume proof contract",
  () => {
    it(
      "freezes the bodyless request digest and accepts the exact suspended State A even when SysAdmin summary remains false",
      () => {
        const before =
          preflight();

        expect(
          t05AuthorizedResumeRequestDigest(
            TASK_ID,
          ),
        ).toBe(
          "D30F984B082281249BD7119EB233CFC62C4DE3C3A3D0FD6D28481C1C0B10EB7D",
        );

        expect(
          t05TaskHistoryMatchesSuspendedStateA(
            before.matchingHistory,
            TASK_ID,
          ),
        ).toBe(
          true,
        );

        expect(
          t05PrestateMatches(
            before,
          ),
        ).toBe(
          true,
        );

        expect(
          digestCanonicalJson({
            Description:
              snapshot().description,
            EndDate:
              snapshot().endDate,
            Name:
              snapshot().name,
            NameSpace:
              snapshot().namespace.toUpperCase(),
            Priority:
              snapshot().priority,
            RunAsUser:
              snapshot().runAsUser,
            Settings:
              {},
            StartDate:
              snapshot().startDate,
            Suspended:
              false,
            TaskClass:
              snapshot().taskClass,
            TimePeriod:
              snapshot().timePeriod,
          }),
        ).toBe(
          T05_EXPECTED_FIXTURE_PROJECTION_DIGEST,
        );
      },
    );

    it(
      "accepts native resumed State B without trusting the advisory SysAdmin suspended summary",
      () => {
        const before =
          preflight();

        const after =
          preflight(
            false,
            Object.freeze([
              Object.freeze({
                ...suspendRow(),
              }),
              createRow(),
              Object.freeze({
                ...suspendRow(),
                result:
                  "Resumed task",
              }),
            ]),
          );

        expect(
          t05PoststateMatches(
            after,
            before,
          ),
        ).toBe(
          true,
        );

        expect(
          t05PoststateMatches(
            before,
            before,
          ),
        ).toBe(
          false,
        );
      },
    );

    it(
      "classifies reconciliation as applied, not-applied, or still-unknown without retry",
      () => {
        const before =
          preflight();

        expect(
          reconcileUnknownT05TaskResume(
            preflight(
              false,
              Object.freeze([
                suspendRow(),
                createRow(),
                Object.freeze({
                  ...suspendRow(),
                  result:
                    "Resumed task",
                }),
              ]),
            ),
            before,
          ).outcome,
        ).toBe(
          "APPLIED",
        );

        expect(
          reconcileUnknownT05TaskResume(
            before,
            before,
          ).outcome,
        ).toBe(
          "NOT_APPLIED",
        );

        expect(
          reconcileUnknownT05TaskResume(
            {
              ...before,
              taskManagerStatus:
                "Stopped",
            },
            before,
          ).outcome,
        ).toBe(
          "STILL_UNKNOWN",
        );
      },
    );

    it(
      "freezes reversible TASK_RESUME metadata, T04 recovery, and T06 cleanup boundary",
      async () => {
        const contract =
          createT05TaskResumeProofContract({
            readFreshPreflight:
              async () =>
                preflight(),

            executeResume:
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

        expect(
          contract.contractId,
        ).toBe(
          T05_TASK_RESUME_CONTRACT_ID,
        );

        expect(
          contract.contractVersion,
        ).toBe(
          1,
        );

        expect(
          contract.actionType,
        ).toBe(
          "TASK_RESUME",
        );

        expect(
          contract.reversibility,
        ).toBe(
          "REVERSIBLE",
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

        const intent =
          t05TaskResumeIntent(
            GENERATION,
            TASK_ID,
          );

        const recovery =
          contract.buildRecoveryPlan(
            {
              schemaVersion:
                "meridian.task-resume-execution.v1",
              state:
                "APPLIED",
              actionId:
                "T05_TASK_RESUME",
              taskName:
                T05_TASK_NAME,
              generation:
                GENERATION,
              taskId:
                TASK_ID,
              resumeStatus:
                200,
              httpResumeResponseVerified:
                true,
              mutationRequestCount:
                1,
              configurationPreserved:
                true,
              resumedObserved:
                true,
              historyObserved:
                true,
              zeroUpcomingPreserved:
                true,
              resolutionSource:
                "DIRECT_EXECUTION",
            },
            [],
          );

        expect(
          recovery,
        ).toMatchObject({
          recoveryActionType:
            "TASK_SUSPEND",
          automatic:
            false,
        });

        expect(
          contract.target(
            intent,
          ),
        ).toMatchObject({
          kind:
            "TASK",
          canonicalId:
            "task:meridianlab-orderexporter",
          displayName:
            T05_TASK_NAME,
          generation:
            GENERATION,
        });
      },
    );

    it(
      "builds three required proof planes plus optional task-history observation",
      () => {
        expect(
          T05_TASK_RESUME_PROOF_REQUIREMENTS.map(
            (
              requirement,
            ) => [
              requirement.requirementId,
              requirement.applicability,
            ],
          ),
        ).toEqual([
          [
            "t05-http-resume",
            "REQUIRED",
          ],
          [
            "t05-configuration-preservation",
            "REQUIRED",
          ],
          [
            "t05-resumed-native-state-transition",
            "REQUIRED",
          ],
          [
            "t05-history-observation",
            "OPTIONAL",
          ],
        ]);

        const results =
          buildT05TaskResumeProofResults({
            observedAtUtc:
              "2026-09-22T09:30:00.000Z",
            httpResumeVerified:
              true,
            configurationPreserved:
              true,
            taskStateVerified:
              true,
            taskHistoryObserved:
              true,
            httpSourceReference:
              "http",
            configurationSourceReference:
              "configuration",
            taskStateSourceReference:
              "native-state",
            taskHistorySourceReference:
              "history",
          });

        expect(
          results,
        ).toHaveLength(
          4,
        );

        expect(
          results.slice(
            0,
            3,
          ).every(
            (
              result,
            ) =>
              result.status ===
              "PASS",
          ),
        ).toBe(
          true,
        );

        expect(
          results[3]?.applicability,
        ).toBe(
          "OPTIONAL",
        );
      },
    );
  },
);
