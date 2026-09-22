import {
  describe,
  expect,
  it,
} from "vitest";

import {
  digestCanonicalJson,
} from "../../proof/digest";

import {
  T04_EXPECTED_CREATE_BODY_DIGEST,
  T04_EXPECTED_FIXTURE_PROJECTION_DIGEST,
  T04_TASK_SUSPEND_CONTRACT_ID,
  T04_TASK_SUSPEND_PROOF_REQUIREMENTS,
  buildT04TaskSuspendProofResults,
  createT04TaskSuspendProofContract,
  reconcileUnknownT04TaskSuspend,
  t04AuthorizedSuspendRequestDigest,
  t04PoststateMatches,
  t04PrestateMatches,
  t04TaskHistoryMatchesSingleSuspendTransition,
  t04TaskSuspendIntent,
  type T04TaskSuspendPreflight,
} from "./task-suspend";

import {
  T04_TASK_NAME,
  T04_TASK_ROLE,
  t04TaskDescription,
  type T04TaskHistoryRow,
  type T04TaskSnapshot,
  type T04TaskSummary,
} from "../../iris/task-suspend-action-transport";

const GENERATION =
  "5d1764a2-1cdf-4fc6-9bb9-eaf40ec62144";

const TASK_ID =
  1006;

function snapshot():
  T04TaskSnapshot {
  return Object.freeze({
    id:
      TASK_ID,

    name:
      T04_TASK_NAME,

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
      t04TaskDescription(
        GENERATION,
      ),
  });
}

function summary(
  suspended:
    boolean,
): T04TaskSummary {
  return Object.freeze({
    id:
      TASK_ID,

    name:
      T04_TASK_NAME,

    type:
      "User",

    namespace:
      "%SYS",

    description:
      t04TaskDescription(
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
  T04TaskHistoryRow {
  return Object.freeze({
    taskId:
      TASK_ID,

    name:
      T04_TASK_NAME,

    namespace:
      "%SYS",

    lastStart:
      "",

    completed:
      "",

    status:
      "1",

    result:
      `Create ${T04_TASK_NAME}`,
  });
}

function suspendRow():
  T04TaskHistoryRow {
  return Object.freeze({
    taskId:
      TASK_ID,

    name:
      T04_TASK_NAME,

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
  suspended =
    false,
  history:
    readonly T04TaskHistoryRow[] =
    Object.freeze([
      createRow(),
    ]),
): T04TaskSuspendPreflight {
  return Object.freeze({
    schemaVersion:
      "meridian.task-suspend-preflight.v1",

    expectedFixtureGeneration:
      GENERATION,

    taskName:
      T04_TASK_NAME,

    expectedTaskId:
      TASK_ID,

    expectedFixtureProjectionDigest:
      T04_EXPECTED_FIXTURE_PROJECTION_DIGEST,

    expectedCreateBodyDigest:
      T04_EXPECTED_CREATE_BODY_DIGEST,

    authorizedSuspendRequestDigest:
      t04AuthorizedSuspendRequestDigest(
        TASK_ID,
      ),

    matchingTaskCount:
      1,

    matchingTask:
      snapshot(),

    matchingSummary:
      summary(
        suspended,
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
      "POST /v2/task/suspend",

    requiredAuthority:
      "%Admin_Task:U",

    authorityRole:
      T04_TASK_ROLE,

    authorityMode:
      "EXPLICIT_ESCALATION_ROLE",
  });
}

describe(
  "T04 task suspend proof contract",
  () => {
    it(
      "freezes the reviewed request digest and accepts exact unsuspended State A",
      () => {
        const before =
          preflight();

        expect(
          t04AuthorizedSuspendRequestDigest(
            TASK_ID,
          ),
        ).toBe(
          "B22836796144DDA3FE919952DE28686383485E4613918985FFE62E40E80B1FD1",
        );

        expect(
          t04PrestateMatches(
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
          T04_EXPECTED_FIXTURE_PROJECTION_DIGEST,
        );
      },
    );

    it(
      "accepts the exact suspend-management history transition even when the SysAdmin summary remains false",
      () => {
        const before =
          preflight();

        const descendingAfter =
          preflight(
            false,
            Object.freeze([
              suspendRow(),
              createRow(),
            ]),
          );

        const ascendingAfter =
          preflight(
            true,
            Object.freeze([
              createRow(),
              suspendRow(),
            ]),
          );

        expect(
          t04TaskHistoryMatchesSingleSuspendTransition(
            descendingAfter.matchingHistory,
            before.matchingHistory,
            TASK_ID,
          ),
        ).toBe(
          true,
        );

        expect(
          t04PoststateMatches(
            descendingAfter,
            before,
          ),
        ).toBe(
          true,
        );

        expect(
          t04PoststateMatches(
            ascendingAfter,
            before,
          ),
        ).toBe(
          true,
        );

        expect(
          t04PoststateMatches(
            preflight(
              false,
              Object.freeze([
                createRow(),
              ]),
            ),
            before,
          ),
        ).toBe(
          false,
        );

        expect(
          t04PoststateMatches(
            preflight(
              false,
              Object.freeze([
                Object.freeze({
                  ...suspendRow(),
                  result:
                    "Success",
                }),
                createRow(),
              ]),
            ),
            before,
          ),
        ).toBe(
          false,
        );
      },
    );

    it(
      "classifies authoritative reconciliation as applied, not-applied, or still-unknown without retry",
      () => {
        const before =
          preflight();

        const applied =
          reconcileUnknownT04TaskSuspend(
            preflight(
              false,
              Object.freeze([
                suspendRow(),
                createRow(),
              ]),
            ),
            before,
          );

        expect(
          applied.outcome,
        ).toBe(
          "APPLIED",
        );

        if (
          applied.outcome ===
            "APPLIED"
        ) {
          expect(
            applied.execution,
          ).toMatchObject({
            actionId:
              "T04_TASK_SUSPEND",
            taskId:
              TASK_ID,
            suspendStatus:
              null,
            httpSuspendResponseVerified:
              false,
            resolutionSource:
              "AUTHORITATIVE_RECONCILIATION_READBACK",
          });
        }

        expect(
          reconcileUnknownT04TaskSuspend(
            before,
            before,
          ).outcome,
        ).toBe(
          "NOT_APPLIED",
        );

        expect(
          reconcileUnknownT04TaskSuspend(
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
      "freezes reversible TASK_SUSPEND metadata and T05 recovery",
      async () => {
        const contract =
          createT04TaskSuspendProofContract({
            readFreshPreflight:
              async () =>
                preflight(),

            executeSuspend:
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
          T04_TASK_SUSPEND_CONTRACT_ID,
        );

        expect(
          contract.contractVersion,
        ).toBe(
          2,
        );

        expect(
          contract.actionType,
        ).toBe(
          "TASK_SUSPEND",
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
          t04TaskSuspendIntent(
            GENERATION,
            TASK_ID,
          );

        const recovery =
          contract.buildRecoveryPlan(
            {
              schemaVersion:
                "meridian.task-suspend-execution.v1",
              state:
                "APPLIED",
              actionId:
                "T04_TASK_SUSPEND",
              taskName:
                T04_TASK_NAME,
              generation:
                GENERATION,
              taskId:
                TASK_ID,
              suspendStatus:
                200,
              httpSuspendResponseVerified:
                true,
              mutationRequestCount:
                1,
              configurationPreserved:
                true,
              suspendedObserved:
                true,
              historyPreserved:
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
            "TASK_RESUME",
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
            T04_TASK_NAME,
          generation:
            GENERATION,
        });
      },
    );

    it(
      "builds all four required proof planes",
      () => {
        expect(
          T04_TASK_SUSPEND_PROOF_REQUIREMENTS.map(
            (
              requirement,
            ) =>
              requirement.requirementId,
          ),
        ).toEqual([
          "t04-http-suspend",
          "t04-configuration-preservation",
          "t04-suspended-state-transition",
          "t04-history-no-execution-preservation",
        ]);

        const results =
          buildT04TaskSuspendProofResults({
            observedAtUtc:
              "2026-09-22T00:45:00.000Z",
            httpSuspendVerified:
              true,
            configurationPreserved:
              true,
            taskStateVerified:
              true,
            taskHistoryVerified:
              true,
            httpSourceReference:
              "http",
            configurationSourceReference:
              "configuration",
            taskStateSourceReference:
              "state",
            taskHistorySourceReference:
              "history",
          });

        expect(
          results,
        ).toHaveLength(
          4,
        );

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
  },
);
