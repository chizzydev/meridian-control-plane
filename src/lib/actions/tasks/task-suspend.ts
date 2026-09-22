import {
  PROOF_CONTRACT_SCHEMA_VERSION,
  type ActionContext,
  type ProofContract,
  type ReconciliationDecision,
  type RevalidationDecision,
  type ReviewedAction,
} from "../../proof/contract";

import {
  certifyVerifiedAction,
  type VerifiedActionCertificationDependencies,
  type VerifiedActionCertificationResult,
} from "../../proof/certification-runner";

import {
  digestCanonicalJson,
} from "../../proof/digest";

import type {
  ProofRequirement,
  ProofResult,
} from "../../proof/evidence";

import {
  ProofEngineError,
} from "../../proof/errors";

import {
  T04_SUSPEND_BODY,
  T04_TASK_CLASS,
  T04_TASK_NAME,
  T04_TASK_ROLE,
  T04TaskAuthorityDeniedError,
  T04TaskMutationUnknownAfterDispatchError,
  t04TaskDescription,
  type T04TaskHistoryRow,
  type T04TaskSnapshot,
  type T04TaskSummary,
} from "../../iris/task-suspend-action-transport";

export const T04_TASK_SUSPEND_CONTRACT_ID =
  "meridian.tasks.task-suspend.v1" as const;

export const T04_TASK_SUSPEND_EXECUTION_SCHEMA_VERSION =
  "meridian.task-suspend-execution.v1" as const;

export const T04_TASK_TARGET_CANONICAL_ID =
  "task:meridianlab-orderexporter" as const;

export const T04_EXPECTED_FIXTURE_PROJECTION_DIGEST =
  "CF2301CD71109BA5AF328A80F17CBD460BD602BE34A3D61B6101425684D6408A" as const;

export const T04_EXPECTED_CREATE_BODY_DIGEST =
  "E2EC53953FCEAA3FC26682312727EB112C046EA2CD65EBEA159F89FE5B1F9F13" as const;

export const T04_TASK_SUSPEND_DELTA_SUMMARY =
  "Suspend exactly one reviewed shared On Demand task through one POST /v2/task/suspend?id=<reviewed-id> with explicit LeaveInQueue=true. Prove the applied suspension through the exact Task Manager management-history transition plus independent native task-state certification, while preserving task identity, complete task configuration, Task Manager state, zero upcoming execution, and forbidding automatic retry after dispatch. The SysAdmin /v2/tasks Suspended field is not treated as authoritative poststate because live R5-D8-R2 forensics proved it can remain false after the native task state is suspended. T05_TASK_RESUME is the explicit reviewed recovery action." as const;

export interface T04TaskSuspendIntent {
  readonly actionId:
    "T04_TASK_SUSPEND";

  readonly taskName:
    typeof T04_TASK_NAME;

  readonly expectedFixtureGeneration:
    string;

  readonly expectedTaskId:
    number;
}

export interface T04TaskSuspendPreflight {
  readonly schemaVersion:
    "meridian.task-suspend-preflight.v1";

  readonly expectedFixtureGeneration:
    string;

  readonly taskName:
    typeof T04_TASK_NAME;

  readonly expectedTaskId:
    number;

  readonly expectedFixtureProjectionDigest:
    typeof T04_EXPECTED_FIXTURE_PROJECTION_DIGEST;

  readonly expectedCreateBodyDigest:
    typeof T04_EXPECTED_CREATE_BODY_DIGEST;

  readonly authorizedSuspendRequestDigest:
    string;

  readonly matchingTaskCount:
    number;

  readonly matchingTask:
    T04TaskSnapshot | null;

  readonly matchingSummary:
    T04TaskSummary | null;

  readonly taskInventoryCount:
    number;

  readonly matchingUpcomingCount:
    number;

  readonly matchingHistoryCount:
    number;

  readonly matchingHistory:
    readonly T04TaskHistoryRow[];

  readonly taskManagerStatus:
    string;

  readonly officialMutationOperation:
    "POST /v2/task/suspend";

  readonly requiredAuthority:
    "%Admin_Task:U";

  readonly authorityRole:
    typeof T04_TASK_ROLE;

  readonly authorityMode:
    "EXPLICIT_ESCALATION_ROLE";
}

export interface T04TaskSuspendExecution {
  readonly schemaVersion:
    typeof T04_TASK_SUSPEND_EXECUTION_SCHEMA_VERSION;

  readonly state:
    "APPLIED";

  readonly actionId:
    "T04_TASK_SUSPEND";

  readonly taskName:
    typeof T04_TASK_NAME;

  readonly generation:
    string;

  readonly taskId:
    number;

  readonly suspendStatus:
    200 | null;

  readonly httpSuspendResponseVerified:
    boolean;

  readonly mutationRequestCount:
    1;

  readonly configurationPreserved:
    true;

  readonly suspendedObserved:
    true;

  readonly historyPreserved:
    true;

  readonly zeroUpcomingPreserved:
    true;

  readonly resolutionSource:
    "DIRECT_EXECUTION" |
    "AUTHORITATIVE_RECONCILIATION_READBACK";
}

export interface T04TaskSuspendEvidenceInput {
  readonly observedAtUtc:
    string;

  readonly httpSuspendVerified:
    boolean;

  readonly configurationPreserved:
    boolean;

  readonly taskStateVerified:
    boolean;

  readonly taskHistoryVerified:
    boolean;

  readonly httpSourceReference:
    string | null;

  readonly configurationSourceReference:
    string | null;

  readonly taskStateSourceReference:
    string | null;

  readonly taskHistorySourceReference:
    string | null;
}

export interface T04TaskSuspendContractDependencies {
  readonly readFreshPreflight:
    (
      intent:
        T04TaskSuspendIntent,
    ) =>
      Promise<
        T04TaskSuspendPreflight
      >;

  readonly executeSuspend:
    (
      intent:
        T04TaskSuspendIntent,
    ) =>
      Promise<
        Readonly<{
          taskId:
            number;

          status:
            200;

          mutationRequestCount:
            1;
        }>
      >;

  readonly collectProofResults:
    (
      execution:
        T04TaskSuspendExecution,
    ) =>
      Promise<
        readonly ProofResult[]
      >;
}

export interface T04TaskSuspendCertificationDependencies {
  readonly contract:
    T04TaskSuspendContractDependencies;

  readonly certification:
    VerifiedActionCertificationDependencies<
      T04TaskSuspendPreflight
    >;
}

export const T04_TASK_SUSPEND_PROOF_REQUIREMENTS:
  readonly ProofRequirement[] =
  Object.freeze([
    Object.freeze({
      requirementId:
        "t04-http-suspend",

      plane:
        "HTTP_BEHAVIOR",

      applicability:
        "REQUIRED",

      description:
        "Exactly one official POST /v2/task/suspend targets the exact reviewed positive task id, carries exactly LeaveInQueue=true, returns HTTP 200, and is never automatically retried.",

      source:
        "IRIS SysAdmin API POST /v2/task/suspend",
    }),

    Object.freeze({
      requirementId:
        "t04-configuration-preservation",

      plane:
        "CONFIGURATION_READBACK",

      applicability:
        "REQUIRED",

      description:
        "Authoritative GET /v2/task readback proves the complete persisted task definition is byte-semantically unchanged from the reviewed State A snapshot.",

      source:
        "IRIS SysAdmin API GET /v2/task",
    }),

    Object.freeze({
      requirementId:
        "t04-suspended-state-transition",

      plane:
        "TASK_STATE",

      applicability:
        "REQUIRED",

      description:
        "The exact reviewed task is proven suspended by one successful Task Manager management-history transition plus independent native %SYS.Task.Suspended=1 certification. The SysAdmin /v2/tasks Suspended field is advisory only for T04 poststate because R5-D8-R2 proved it can remain false after suspension is applied.",

      source:
        "IRIS native %SYS.Task.Suspended + SysAdmin API GET /v2/task/history",
    }),

    Object.freeze({
      requirementId:
        "t04-history-no-execution-preservation",

      plane:
        "TASK_HISTORY",

      applicability:
        "REQUIRED",

      description:
        "Task history preserves the reviewed Create row and appends exactly one successful Suspended task management row for the reviewed task id, with no execution-like history row.",

      source:
        "IRIS SysAdmin API GET /v2/task/history",
    }),
  ]);

function scalarText(
  value:
    string,
): string {
  return value
    .trim()
    .toLowerCase();
}

function fixtureProjection(
  task:
    T04TaskSnapshot,
  summary:
    T04TaskSummary,
): Readonly<
  Record<
    string,
    unknown
  >
> {
  return Object.freeze({
    Description:
      task.description,

    EndDate:
      task.endDate,

    Name:
      task.name,

    NameSpace:
      task.namespace.toUpperCase(),

    Priority:
      task.priority,

    RunAsUser:
      task.runAsUser,

    Settings:
      Object.freeze({}),

    StartDate:
      task.startDate,

    Suspended:
      summary.suspended,

    TaskClass:
      task.taskClass,

    TimePeriod:
      (
        scalarText(
          task.timePeriod,
        ) ===
          "5"
          ? "On Demand"
          : task.timePeriod
      ),
  });
}

function taskMatchesFrozenFixture(
  task:
    T04TaskSnapshot,
  summary:
    T04TaskSummary,
  generation:
    string,
  expectedTaskId:
    number,
): boolean {
  return (
    task.id ===
      expectedTaskId &&
    summary.id ===
      expectedTaskId &&
    task.name ===
      T04_TASK_NAME &&
    summary.name ===
      T04_TASK_NAME &&
    task.taskClass ===
      T04_TASK_CLASS &&
    task.runAsUser ===
      "meridian.runtime" &&
    task.namespace.toUpperCase() ===
      "%SYS" &&
    summary.namespace.toUpperCase() ===
      "%SYS" &&
    task.priority ===
      "Normal" &&
    (
      scalarText(
        task.timePeriod,
      ) ===
        "on demand" ||
      scalarText(
        task.timePeriod,
      ) ===
        "5"
    ) &&
    task.startDate ===
      "2099-12-31" &&
    task.endDate ===
      "2099-12-31" &&
    task.description ===
      t04TaskDescription(
        generation,
      ) &&
    summary.description ===
      task.description
  );
}

export function t04TaskHistoryMatchesCreateOnly(
  history:
    readonly T04TaskHistoryRow[],
  expectedTaskId:
    number,
): boolean {
  if (
    history.length !==
      1 ||
    expectedTaskId <
      1
  ) {
    return false;
  }

  const row =
    history[0];

  if (
    row ===
      undefined
  ) {
    return false;
  }

  return (
    row.taskId ===
      expectedTaskId &&
    row.name ===
      T04_TASK_NAME &&
    row.namespace.toUpperCase() ===
      "%SYS" &&
    row.status ===
      "1" &&
    row.result ===
      `Create ${T04_TASK_NAME}`
  );
}

function suspendManagementHistoryRow(
  row:
    T04TaskHistoryRow,
  expectedTaskId:
    number,
): boolean {
  return (
    row.taskId ===
      expectedTaskId &&
    row.name ===
      T04_TASK_NAME &&
    row.namespace.toUpperCase() ===
      "%SYS" &&
    row.status ===
      "1" &&
    scalarText(
      row.result,
    ) ===
      "suspended task" &&
    row.lastStart.trim().length >
      0 &&
    row.completed.trim().length >
      0
  );
}

export function t04TaskHistoryMatchesSingleSuspendTransition(
  current:
    readonly T04TaskHistoryRow[],
  reviewed:
    readonly T04TaskHistoryRow[],
  expectedTaskId:
    number,
): boolean {
  if (
    !t04TaskHistoryMatchesCreateOnly(
      reviewed,
      expectedTaskId,
    ) ||
    current.length !==
      reviewed.length +
        1
  ) {
    return false;
  }

  const reviewedCreate =
    reviewed[0];

  if (
    reviewedCreate ===
      undefined
  ) {
    return false;
  }

  const reviewedCreateDigest =
    digestCanonicalJson(
      reviewedCreate,
    );

  const matchingCreateRows =
    current.filter(
      (
        row,
      ) =>
        digestCanonicalJson(
          row,
        ) ===
          reviewedCreateDigest,
    );

  const suspendManagementRows =
    current.filter(
      (
        row,
      ) =>
        suspendManagementHistoryRow(
          row,
          expectedTaskId,
        ),
    );

  return (
    matchingCreateRows.length ===
      1 &&
    suspendManagementRows.length ===
      1
  );
}

export function t04AuthorizedSuspendRequestDigest(
  taskId:
    number,
): string {
  if (
    !Number.isSafeInteger(
      taskId,
    ) ||
    taskId <
      1
  ) {
    throw new Error(
      "T04 suspend request digest requires a positive safe task id.",
    );
  }

  return digestCanonicalJson({
    method:
      "POST",

    path:
      "/v2/task/suspend",

    query:
      {
        id:
          taskId,
      },

    body:
      T04_SUSPEND_BODY,

    automaticRetryAllowed:
      false,
  });
}

export function t04PrestateMatches(
  preflight:
    T04TaskSuspendPreflight,
): boolean {
  const task =
    preflight.matchingTask;

  const summary =
    preflight.matchingSummary;

  return (
    preflight.schemaVersion ===
      "meridian.task-suspend-preflight.v1" &&
    preflight.taskName ===
      T04_TASK_NAME &&
    preflight.expectedFixtureGeneration.trim().length >
      0 &&
    preflight.expectedTaskId >
      0 &&
    preflight.expectedFixtureProjectionDigest ===
      T04_EXPECTED_FIXTURE_PROJECTION_DIGEST &&
    preflight.expectedCreateBodyDigest ===
      T04_EXPECTED_CREATE_BODY_DIGEST &&
    preflight.authorizedSuspendRequestDigest ===
      t04AuthorizedSuspendRequestDigest(
        preflight.expectedTaskId,
      ) &&
    preflight.matchingTaskCount ===
      1 &&
    task !==
      null &&
    summary !==
      null &&
    taskMatchesFrozenFixture(
      task,
      summary,
      preflight.expectedFixtureGeneration,
      preflight.expectedTaskId,
    ) &&
    summary.suspended ===
      false &&
    digestCanonicalJson(
      fixtureProjection(
        task,
        summary,
      ),
    ) ===
      T04_EXPECTED_FIXTURE_PROJECTION_DIGEST &&
    preflight.taskInventoryCount ===
      17 &&
    preflight.matchingUpcomingCount ===
      0 &&
    preflight.matchingHistoryCount ===
      1 &&
    t04TaskHistoryMatchesCreateOnly(
      preflight.matchingHistory,
      preflight.expectedTaskId,
    ) &&
    preflight.taskManagerStatus ===
      "Running" &&
    preflight.officialMutationOperation ===
      "POST /v2/task/suspend" &&
    preflight.requiredAuthority ===
      "%Admin_Task:U" &&
    preflight.authorityRole ===
      T04_TASK_ROLE &&
    preflight.authorityMode ===
      "EXPLICIT_ESCALATION_ROLE"
  );
}

export function t04PoststateMatches(
  current:
    T04TaskSuspendPreflight,
  reviewed:
    T04TaskSuspendPreflight,
): boolean {
  const beforeTask =
    reviewed.matchingTask;

  const afterTask =
    current.matchingTask;

  const beforeSummary =
    reviewed.matchingSummary;

  const afterSummary =
    current.matchingSummary;

  return (
    t04PrestateMatches(
      reviewed,
    ) &&
    beforeTask !==
      null &&
    afterTask !==
      null &&
    beforeSummary !==
      null &&
    afterSummary !==
      null &&
    current.schemaVersion ===
      reviewed.schemaVersion &&
    current.expectedFixtureGeneration ===
      reviewed.expectedFixtureGeneration &&
    current.taskName ===
      reviewed.taskName &&
    current.expectedTaskId ===
      reviewed.expectedTaskId &&
    current.expectedFixtureProjectionDigest ===
      reviewed.expectedFixtureProjectionDigest &&
    current.expectedCreateBodyDigest ===
      reviewed.expectedCreateBodyDigest &&
    current.authorizedSuspendRequestDigest ===
      reviewed.authorizedSuspendRequestDigest &&
    current.matchingTaskCount ===
      1 &&
    digestCanonicalJson(
      afterTask,
    ) ===
      digestCanonicalJson(
        beforeTask,
      ) &&
    current.taskInventoryCount ===
      reviewed.taskInventoryCount &&
    afterSummary.id ===
      beforeSummary.id &&
    afterSummary.name ===
      beforeSummary.name &&
    afterSummary.type ===
      beforeSummary.type &&
    afterSummary.namespace ===
      beforeSummary.namespace &&
    afterSummary.description ===
      beforeSummary.description &&
    afterSummary.lastFinished ===
      beforeSummary.lastFinished &&
    afterSummary.nextScheduled ===
      beforeSummary.nextScheduled &&
    beforeSummary.suspended ===
      false &&
    current.matchingUpcomingCount ===
      reviewed.matchingUpcomingCount &&
    current.matchingUpcomingCount ===
      0 &&
    current.matchingHistoryCount ===
      reviewed.matchingHistoryCount +
        1 &&
    t04TaskHistoryMatchesSingleSuspendTransition(
      current.matchingHistory,
      reviewed.matchingHistory,
      reviewed.expectedTaskId,
    ) &&
    current.taskManagerStatus ===
      reviewed.taskManagerStatus &&
    current.officialMutationOperation ===
      reviewed.officialMutationOperation &&
    current.requiredAuthority ===
      reviewed.requiredAuthority &&
    current.authorityRole ===
      reviewed.authorityRole &&
    current.authorityMode ===
      reviewed.authorityMode
  );
}

export function t04TaskSuspendIntent(
  generation:
    string,
  taskId:
    number,
): T04TaskSuspendIntent {
  const trimmed =
    generation.trim();

  if (
    trimmed.length ===
      0
  ) {
    throw new Error(
      "T04 fixture generation is required.",
    );
  }

  if (
    !Number.isSafeInteger(
      taskId,
    ) ||
    taskId <
      1
  ) {
    throw new Error(
      "T04 task id must be a positive safe integer.",
    );
  }

  return Object.freeze({
    actionId:
      "T04_TASK_SUSPEND" as const,

    taskName:
      T04_TASK_NAME,

    expectedFixtureGeneration:
      trimmed,

    expectedTaskId:
      taskId,
  });
}

function assertIntent(
  intent:
    T04TaskSuspendIntent,
): void {
  if (
    intent.actionId !==
      "T04_TASK_SUSPEND" ||
    intent.taskName !==
      T04_TASK_NAME ||
    intent.expectedFixtureGeneration.trim().length ===
      0 ||
    !Number.isSafeInteger(
      intent.expectedTaskId,
    ) ||
    intent.expectedTaskId <
      1
  ) {
    throw new ProofEngineError(
      "INVALID_TARGET",
      "T04 intent is outside the frozen shared task-suspend boundary.",
    );
  }
}

function execution(
  input: {
    readonly generation:
      string;

    readonly taskId:
      number;

    readonly source:
      T04TaskSuspendExecution[
        "resolutionSource"
      ];
  },
): T04TaskSuspendExecution {
  return Object.freeze({
    schemaVersion:
      T04_TASK_SUSPEND_EXECUTION_SCHEMA_VERSION,

    state:
      "APPLIED" as const,

    actionId:
      "T04_TASK_SUSPEND" as const,

    taskName:
      T04_TASK_NAME,

    generation:
      input.generation,

    taskId:
      input.taskId,

    suspendStatus:
      input.source ===
        "DIRECT_EXECUTION"
        ? 200 as const
        : null,

    httpSuspendResponseVerified:
      input.source ===
        "DIRECT_EXECUTION",

    mutationRequestCount:
      1 as const,

    configurationPreserved:
      true as const,

    suspendedObserved:
      true as const,

    historyPreserved:
      true as const,

    zeroUpcomingPreserved:
      true as const,

    resolutionSource:
      input.source,
  });
}

function mapAuthorityDenied(
  error:
    unknown,
): RevalidationDecision<
  T04TaskSuspendPreflight
> | null {
  if (
    error instanceof
      T04TaskAuthorityDeniedError
  ) {
    return Object.freeze({
      outcome:
        "DENIED" as const,

      freshPreflight:
        null,

      freshDigest:
        null,

      reason:
        error.message,
    });
  }

  return null;
}

export function reconcileUnknownT04TaskSuspend(
  current:
    T04TaskSuspendPreflight,
  reviewed:
    T04TaskSuspendPreflight,
): ReconciliationDecision<
  T04TaskSuspendExecution
> {
  if (
    t04PoststateMatches(
      current,
      reviewed,
    )
  ) {
    return Object.freeze({
      outcome:
        "APPLIED" as const,

      execution:
        execution({
          generation:
            reviewed.expectedFixtureGeneration,

          taskId:
            reviewed.expectedTaskId,

          source:
            "AUTHORITATIVE_RECONCILIATION_READBACK",
        }),
    });
  }

  if (
    t04PrestateMatches(
      current,
    ) &&
    digestCanonicalJson(
      current,
    ) ===
      digestCanonicalJson(
        reviewed,
      )
  ) {
    return Object.freeze({
      outcome:
        "NOT_APPLIED" as const,

      reason:
        "AUTHORITATIVE_READBACK_MATCHED_EXACT_T04_UNSUSPENDED_REVIEWED_PRESTATE",
    });
  }

  return Object.freeze({
    outcome:
      "STILL_UNKNOWN" as const,

    reason:
      "AUTHORITATIVE_READBACK_MATCHED_NEITHER_EXACT_T04_UNSUSPENDED_PRESTATE_NOR_CORRECTED_SUSPEND_MANAGEMENT_POSTSTATE",
  });
}

function proofResult(
  input: {
    readonly requirement:
      ProofRequirement;

    readonly passed:
      boolean;

    readonly observedAtUtc:
      string;

    readonly sourceReference:
      string | null;

    readonly observedSummary:
      string;
  },
): ProofResult {
  return Object.freeze({
    requirementId:
      input.requirement.requirementId,

    plane:
      input.requirement.plane,

    applicability:
      input.requirement.applicability,

    status:
      input.passed
        ? "PASS"
        : "FAIL",

    sourceType:
      input.requirement.source,

    sourceReference:
      input.sourceReference,

    observedAtUtc:
      input.observedAtUtc,

    expectedSummary:
      input.requirement.description,

    observedSummary:
      input.observedSummary,

    provenance:
      "AUTHORITATIVE_IRIS" as const,

    safeEvidenceDigest:
      null,
  });
}

export function buildT04TaskSuspendProofResults(
  input:
    T04TaskSuspendEvidenceInput,
): readonly ProofResult[] {
  const [
    http,
    configuration,
    taskState,
    taskHistory,
  ] =
    T04_TASK_SUSPEND_PROOF_REQUIREMENTS;

  if (
    http ===
      undefined ||
    configuration ===
      undefined ||
    taskState ===
      undefined ||
    taskHistory ===
      undefined
  ) {
    throw new Error(
      "T04 proof requirement registry is incomplete.",
    );
  }

  return Object.freeze([
    proofResult({
      requirement:
        http,

      passed:
        input.httpSuspendVerified,

      observedAtUtc:
        input.observedAtUtc,

      sourceReference:
        input.httpSourceReference,

      observedSummary:
        input.httpSuspendVerified
          ? "Exactly one POST /v2/task/suspend targeted the reviewed task id with LeaveInQueue=true and returned HTTP 200."
          : "The T04 HTTP plane did not prove one exact reviewed-id suspend POST with HTTP 200.",
    }),

    proofResult({
      requirement:
        configuration,

      passed:
        input.configurationPreserved,

      observedAtUtc:
        input.observedAtUtc,

      sourceReference:
        input.configurationSourceReference,

      observedSummary:
        input.configurationPreserved
          ? "The authoritative task definition remained exactly equal to the reviewed State A task snapshot."
          : "Authoritative task detail readback did not prove complete configuration preservation.",
    }),

    proofResult({
      requirement:
        taskState,

      passed:
        input.taskStateVerified,

      observedAtUtc:
        input.observedAtUtc,

      sourceReference:
        input.taskStateSourceReference,

      observedSummary:
        input.taskStateVerified
          ? "The reviewed task suspension is proven by the successful Task Manager suspend-management transition plus independent native task-state certification, with stable identity, manager state, and zero upcoming execution."
          : "The authoritative evidence did not prove the reviewed suspension transition.",
    }),

    proofResult({
      requirement:
        taskHistory,

      passed:
        input.taskHistoryVerified,

      observedAtUtc:
        input.observedAtUtc,

      sourceReference:
        input.taskHistorySourceReference,

      observedSummary:
        input.taskHistoryVerified
          ? "Task history preserved the reviewed Create row and appended exactly one Suspended task management row with no execution-like history."
          : "Task history did not prove exactly one reviewed Create row plus one suspend-management transition.",
    }),
  ]);
}

export function createT04TaskSuspendProofContract(
  dependencies:
    T04TaskSuspendContractDependencies,
): ProofContract<
  T04TaskSuspendIntent,
  T04TaskSuspendPreflight,
  T04TaskSuspendExecution
> {
  const contract:
    ProofContract<
      T04TaskSuspendIntent,
      T04TaskSuspendPreflight,
      T04TaskSuspendExecution
    > =
  {
    schemaVersion:
      PROOF_CONTRACT_SCHEMA_VERSION,

    contractId:
      T04_TASK_SUSPEND_CONTRACT_ID,

    contractVersion:
      2,

    actionType:
      "TASK_SUSPEND",

    domain:
      "TASKS",

    risk:
      "MEDIUM",

    reversibility:
      "REVERSIBLE",

    requiredAuthority:
      Object.freeze([
        Object.freeze({
          resource:
            "%Admin_Task",

          permission:
            "U",

          standing:
            false,

          escalationOnly:
            true,
        }),
      ]),

    proofRequirements:
      T04_TASK_SUSPEND_PROOF_REQUIREMENTS,

    target(
      intent,
    ) {
      assertIntent(
        intent,
      );

      return Object.freeze({
        kind:
          "TASK",

        canonicalId:
          T04_TASK_TARGET_CANONICAL_ID,

        displayName:
          T04_TASK_NAME,

        fixtureId:
          "meridian-r5-t04-t06-shared-task-fixture",

        generation:
          intent.expectedFixtureGeneration,
      });
    },

    async preflight(
      context,
      intent,
    ) {
      void context;

      assertIntent(
        intent,
      );

      const preflight =
        await dependencies.readFreshPreflight(
          intent,
        );

      if (
        !t04PrestateMatches(
          preflight,
        )
      ) {
        throw new ProofEngineError(
          "STALE_PRECONDITION",
          "T04 preflight requires one exact unsuspended shared On Demand fixture with create-only history and zero upcoming execution.",
        );
      }

      return preflight;
    },

    expectedDelta(
      intent,
      preflight,
    ) {
      assertIntent(
        intent,
      );

      if (
        !t04PrestateMatches(
          preflight,
        )
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "T04 expected delta requires the exact reviewed unsuspended State A.",
        );
      }

      return Object.freeze({
        summary:
          T04_TASK_SUSPEND_DELTA_SUMMARY,

        before:
          Object.freeze({
            taskId:
              preflight.expectedTaskId,

            suspended:
              false,

            taskSnapshotDigest:
              digestCanonicalJson(
                preflight.matchingTask,
              ),

            historyDigest:
              digestCanonicalJson(
                preflight.matchingHistory,
              ),

            upcomingCount:
              preflight.matchingUpcomingCount,

            taskInventoryCount:
              preflight.taskInventoryCount,

            taskManagerStatus:
              preflight.taskManagerStatus,
          }),

        after:
          Object.freeze({
            taskId:
              preflight.expectedTaskId,

            suspended:
              true,

            leaveInQueue:
              true,

            configurationPreserved:
              true,

            historyPreserved:
              false,

            historyTransition:
              "APPEND_ONE_SUSPENDED_TASK_MANAGEMENT_ROW",

            upcomingCount:
              0,

            taskInventoryCount:
              preflight.taskInventoryCount,

            taskManagerStatus:
              preflight.taskManagerStatus,

            recoveryActionId:
              "T05_TASK_RESUME",
          }),
      });
    },

    async analyzeImpact(
      context,
      intent,
      preflight,
    ) {
      void context;

      assertIntent(
        intent,
      );

      if (
        !t04PrestateMatches(
          preflight,
        )
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "T04 impact analysis requires the exact reviewed unsuspended fixture.",
        );
      }

      return Object.freeze({
        certainty:
          "KNOWN" as const,

        summary:
          "T04 changes only the reviewed fixture suspension state through POST /v2/task/suspend with explicit LeaveInQueue=true. It preserves persisted task configuration, task identity, manager state, and zero upcoming execution; Task Manager appends one successful Suspended task management-history row and does not execute the On Demand task.",

        affectedEntities:
          Object.freeze([
            Object.freeze({
              kind:
                "TASK",

              canonicalId:
                T04_TASK_TARGET_CANONICAL_ID,

              displayName:
                T04_TASK_NAME,

              effect:
                "Exactly one reviewed shared fixture changes from unsuspended to suspended.",
            }),
          ]),

        limitations:
          Object.freeze([
            "T04 does not authorize arbitrary task ids; the server binds the exact reviewed shared fixture identity.",
            "T04 does not execute the task; one Task Manager Suspended task management-history row is expected and is distinct from task execution history.",
            "The SysAdmin /v2/tasks Suspended field is not authoritative for T04 poststate because certified R5-D8-R2 live forensics observed false while native %SYS.Task.Suspended was 1.",
            "T04 does not delete the task; T06 owns fixture deletion after T05 verification.",
            "T05_TASK_RESUME is the explicit reviewed recovery action; automatic rollback is forbidden.",
            "Automatic retry is forbidden after an ambiguous suspend dispatch.",
          ]),
      });
    },

    digestPreflight(
      preflight,
    ) {
      return digestCanonicalJson(
        preflight,
      );
    },

    async revalidate(
      context:
        ActionContext,
      reviewed:
        ReviewedAction<
          T04TaskSuspendIntent,
          T04TaskSuspendPreflight
        >,
    ) {
      void context;

      assertIntent(
        reviewed.intent,
      );

      try {
        const fresh =
          await dependencies.readFreshPreflight(
            reviewed.intent,
          );

        const freshDigest =
          digestCanonicalJson(
            fresh,
          );

        if (
          !t04PrestateMatches(
            fresh,
          ) ||
          fresh.expectedFixtureGeneration !==
            reviewed.intent.expectedFixtureGeneration ||
          fresh.expectedTaskId !==
            reviewed.intent.expectedTaskId
        ) {
          return Object.freeze({
            outcome:
              "STALE" as const,

            freshPreflight:
              fresh,

            freshDigest,

            reason:
              "T04 task configuration/state/history changed after review; zero suspend POST dispatched.",
          });
        }

        if (
          freshDigest !==
            reviewed.reviewedPreflightDigest
        ) {
          return Object.freeze({
            outcome:
              "STALE" as const,

            freshPreflight:
              fresh,

            freshDigest,

            reason:
              "T04 fresh preflight digest differs from the reviewed digest.",
          });
        }

        return Object.freeze({
          outcome:
            "MATCH" as const,

          freshPreflight:
            fresh,

          freshDigest,
        });
      } catch (
        error
      ) {
        const denied =
          mapAuthorityDenied(
            error,
          );

        if (
          denied !==
            null
        ) {
          return denied;
        }

        throw error;
      }
    },

    async execute(
      context,
      ready,
    ) {
      void context;

      assertIntent(
        ready.intent,
      );

      if (
        ready.reviewedPreflightDigest !==
          ready.freshRevalidationDigest
      ) {
        throw new ProofEngineError(
          "STALE_PRECONDITION",
          "T04 execute refused because reviewed and fresh preflight digests differ.",
        );
      }

      let suspended:
        Readonly<{
          taskId:
            number;

          status:
            200;

          mutationRequestCount:
            1;
        }>;

      try {
        suspended =
          await dependencies.executeSuspend(
            ready.intent,
          );
      } catch (
        error
      ) {
        if (
          error instanceof
            T04TaskMutationUnknownAfterDispatchError
        ) {
          throw new ProofEngineError(
            "UNKNOWN_AFTER_DISPATCH",
            error.message,
            {
              automaticRetry:
                false,
            },
          );
        }

        throw error;
      }

      if (
        suspended.status !==
          200 ||
        suspended.taskId !==
          ready.intent.expectedTaskId ||
        suspended.mutationRequestCount !==
          1
      ) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          "T04 suspend response did not prove exact HTTP 200 reviewed task identity with one mutation request. Automatic retry is forbidden.",
          {
            automaticRetry:
              false,
          },
        );
      }

      const after =
        await dependencies.readFreshPreflight(
          ready.intent,
        );

      if (
        !t04PoststateMatches(
          after,
          ready.preflight,
        )
      ) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          "T04 suspend returned success but authoritative readback did not prove the exact configuration-preserving suspend-management history transition required by the corrected cross-surface contract. Automatic retry is forbidden.",
          {
            automaticRetry:
              false,
          },
        );
      }

      return execution({
        generation:
          ready.intent.expectedFixtureGeneration,

        taskId:
          ready.intent.expectedTaskId,

        source:
          "DIRECT_EXECUTION",
      });
    },

    async reconcileUnknown(
      context,
      reviewed,
    ) {
      void context;

      assertIntent(
        reviewed.intent,
      );

      return reconcileUnknownT04TaskSuspend(
        await dependencies.readFreshPreflight(
          reviewed.intent,
        ),
        reviewed.preflight,
      );
    },

    async verify(
      context,
      executionResult,
    ) {
      void context;

      if (
        !executionResult.configurationPreserved ||
        !executionResult.suspendedObserved ||
        !executionResult.historyPreserved ||
        !executionResult.zeroUpcomingPreserved ||
        executionResult.mutationRequestCount !==
          1 ||
        executionResult.taskId <
          1
      ) {
        throw new ProofEngineError(
          "PROOF_INCOMPLETE",
          "T04 execution evidence is incomplete.",
        );
      }

      return dependencies.collectProofResults(
        executionResult,
      );
    },

    buildRecoveryPlan(
      executionResult,
      results,
    ) {
      void executionResult;
      void results;

      return Object.freeze({
        recoveryActionType:
          "TASK_RESUME",

        automatic:
          false as const,

        summary:
          "T05_TASK_RESUME is the explicit reviewed recovery action for the shared fixture. Automatic rollback or automatic resume is forbidden.",
      });
    },
  };

  return Object.freeze(
    contract,
  );
}

export async function certifyT04TaskSuspendAction(
  input: {
    readonly intent:
      T04TaskSuspendIntent;

    readonly actionId:
      string;

    readonly receiptId:
      string;

    readonly logicalActor:
      string;

    readonly irisRuntimeUser:
      string;
  },
  dependencies:
    T04TaskSuspendCertificationDependencies,
): Promise<
  VerifiedActionCertificationResult<
    T04TaskSuspendExecution
  >
> {
  return certifyVerifiedAction(
    {
      contract:
        createT04TaskSuspendProofContract(
          dependencies.contract,
        ),

      intent:
        input.intent,

      actionId:
        input.actionId,

      receiptId:
        input.receiptId,

      parentChangeSetId:
        null,

      logicalActor:
        input.logicalActor,

      irisRuntimeUser:
        input.irisRuntimeUser,
    },
    dependencies.certification,
  );
}
