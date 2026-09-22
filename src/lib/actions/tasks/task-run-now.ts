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
  T03_RUN_NOW_BODY,
  T03_TASK_CLASS,
  T03_TASK_NAME,
  T03_TASK_ROLE,
  T03TaskAuthorityDeniedError,
  T03TaskMutationUnknownAfterDispatchError,
  t03TaskDefinition,
  type T03TaskDefinition,
  type T03TaskHistoryRow,
  type T03TaskInfo,
  type T03TaskSnapshot,
  type T03TaskSummary,
} from "../../iris/task-run-now-action-transport";

export const T03_TASK_RUN_NOW_CONTRACT_ID =
  "meridian.tasks.task-run-now.v1" as const;

export const T03_TASK_RUN_NOW_EXECUTION_SCHEMA_VERSION =
  "meridian.task-run-now-execution.v1" as const;

export const T03_TASK_TARGET_CANONICAL_ID =
  "task:meridian-r5-t03-run-now-witness" as const;

export const T03_TASK_RUN_NOW_DELTA_SUMMARY =
  "Execute exactly one reviewed inert On Demand task through one POST /v2/task/run?id=<reviewed-id> with body RunNow=true. Prove one successful execution-history transition and completed task-info transition while preserving task configuration, task identity, manager state, zero upcoming schedule, and forbidding automatic retry after dispatch." as const;

export interface T03TaskRunNowIntent {
  readonly actionId:
    "T03_TASK_RUN_NOW";

  readonly taskName:
    typeof T03_TASK_NAME;

  readonly expectedFixtureGeneration:
    string;

  readonly expectedTaskId:
    number;
}

export interface T03TaskRunNowPreflight {
  readonly schemaVersion:
    "meridian.task-run-now-preflight.v1";

  readonly expectedFixtureGeneration:
    string;

  readonly taskName:
    typeof T03_TASK_NAME;

  readonly expectedTaskId:
    number;

  readonly expectedDefinitionDigest:
    string;

  readonly authorizedRunRequestDigest:
    string;

  readonly matchingTaskCount:
    number;

  readonly matchingTask:
    T03TaskSnapshot | null;

  readonly matchingSummary:
    T03TaskSummary | null;

  readonly matchingInfo:
    T03TaskInfo | null;

  readonly taskInventoryCount:
    number;

  readonly matchingUpcomingCount:
    number;

  readonly matchingHistoryCount:
    number;

  readonly matchingHistory:
    readonly T03TaskHistoryRow[];

  readonly taskManagerStatus:
    string;

  readonly officialMutationOperation:
    "POST /v2/task/run";

  readonly requiredAuthority:
    "%Admin_Task:U";

  readonly authorityRole:
    typeof T03_TASK_ROLE;

  readonly authorityMode:
    "EXPLICIT_ESCALATION_ROLE";
}

export interface T03TaskRunNowExecution {
  readonly schemaVersion:
    typeof T03_TASK_RUN_NOW_EXECUTION_SCHEMA_VERSION;

  readonly state:
    "APPLIED";

  readonly actionId:
    "T03_TASK_RUN_NOW";

  readonly taskName:
    typeof T03_TASK_NAME;

  readonly generation:
    string;

  readonly taskId:
    number;

  readonly runStatus:
    200 | null;

  readonly httpRunResponseVerified:
    boolean;

  readonly mutationRequestCount:
    1;

  readonly configurationPreserved:
    true;

  readonly successfulExecutionHistoryObserved:
    true;

  readonly taskInfoCompletionObserved:
    true;

  readonly zeroUpcomingPreserved:
    true;

  readonly resolutionSource:
    "DIRECT_EXECUTION" |
    "AUTHORITATIVE_RECONCILIATION_READBACK";
}

export interface T03TaskRunNowEvidenceInput {
  readonly observedAtUtc:
    string;

  readonly httpRunVerified:
    boolean;

  readonly configurationPreserved:
    boolean;

  readonly taskStateVerified:
    boolean;

  readonly taskHistoryVerified:
    boolean;

  readonly observedHistoryResult:
    string;

  readonly httpSourceReference:
    string | null;

  readonly configurationSourceReference:
    string | null;

  readonly taskStateSourceReference:
    string | null;

  readonly taskHistorySourceReference:
    string | null;
}

export interface T03TaskRunNowContractDependencies {
  readonly readFreshPreflight:
    (
      intent:
        T03TaskRunNowIntent,
    ) =>
      Promise<
        T03TaskRunNowPreflight
      >;

  readonly executeRunNow:
    (
      intent:
        T03TaskRunNowIntent,
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
        T03TaskRunNowExecution,
    ) =>
      Promise<
        readonly ProofResult[]
      >;
}

export interface T03TaskRunNowCertificationDependencies {
  readonly contract:
    T03TaskRunNowContractDependencies;

  readonly certification:
    VerifiedActionCertificationDependencies<
      T03TaskRunNowPreflight
    >;
}

export const T03_TASK_RUN_NOW_PROOF_REQUIREMENTS:
  readonly ProofRequirement[] =
  Object.freeze([
    Object.freeze({
      requirementId:
        "t03-http-run-now",

      plane:
        "HTTP_BEHAVIOR",

      applicability:
        "REQUIRED",

      description:
        "Exactly one official POST /v2/task/run targets the exact reviewed positive task id, carries exactly RunNow=true, returns HTTP 200, and is never automatically retried.",

      source:
        "IRIS SysAdmin API POST /v2/task/run",
    }),

    Object.freeze({
      requirementId:
        "t03-configuration-preservation",

      plane:
        "CONFIGURATION_READBACK",

      applicability:
        "REQUIRED",

      description:
        "Authoritative GET /v2/task readback proves the complete persisted task configuration is unchanged from the reviewed inert On Demand State A snapshot.",

      source:
        "IRIS SysAdmin API GET /v2/task",
    }),

    Object.freeze({
      requirementId:
        "t03-task-info-completion",

      plane:
        "TASK_STATE",

      applicability:
        "REQUIRED",

      description:
        "The exact task identity/cardinality and Task Manager state remain stable; task info transitions from never-started/never-finished to a completed successful run, summary LastFinished becomes populated, and the On Demand witness remains absent from upcoming schedule.",

      source:
        "IRIS SysAdmin API GET /v2/tasks + GET /v2/task/info + GET /v2/task/manager + GET /v2/task/upcoming",
    }),

    Object.freeze({
      requirementId:
        "t03-single-success-history-transition",

      plane:
        "TASK_HISTORY",

      applicability:
        "REQUIRED",

      description:
        "Task history preserves the reviewed Create management row and appends exactly one successful execution row for the reviewed task id under meridian.runtime, proving exactly one intended run completed.",

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

function exactArray(
  left:
    readonly string[],
  right:
    readonly string[],
): boolean {
  return (
    JSON.stringify(
      left,
    ) ===
    JSON.stringify(
      right,
    )
  );
}

function settingsEqual(
  left:
    Readonly<
      Record<
        string,
        unknown
      >
    >,
  right:
    Readonly<
      Record<
        string,
        unknown
      >
    >,
): boolean {
  return (
    digestCanonicalJson(
      left,
    ) ===
    digestCanonicalJson(
      right,
    )
  );
}

function definitionsEqual(
  snapshot:
    T03TaskSnapshot,
  definition:
    T03TaskDefinition,
): boolean {
  return (
    snapshot.id >
      0 &&
    snapshot.name ===
      definition.Name &&
    snapshot.runAsUser ===
      definition.RunAsUser &&
    exactArray(
      snapshot.emailOnCompletion,
      definition.EmailOnCompletion,
    ) &&
    exactArray(
      snapshot.emailOnError,
      definition.EmailOnError,
    ) &&
    exactArray(
      snapshot.emailOnExpiration,
      definition.EmailOnExpiration,
    ) &&
    snapshot.emailOutput ===
      definition.EmailOutput &&
    snapshot.expires ===
      definition.Expires &&
    snapshot.expiresDays ===
      definition.ExpiresDays &&
    snapshot.expiresHours ===
      definition.ExpiresHours &&
    snapshot.expiresMinutes ===
      definition.ExpiresMinutes &&
    snapshot.openOutputFile ===
      definition.OpenOutputFile &&
    snapshot.outputDirectory ===
      definition.OutputDirectory &&
    snapshot.outputFilename ===
      definition.OutputFilename &&
    snapshot.outputFileIsBinary ===
      definition.OutputFileIsBinary &&
    snapshot.suspendOnError ===
      definition.SuspendOnError &&
    snapshot.suspendTerminated ===
      definition.SuspendTerminated &&
    scalarText(
      snapshot.priority,
    ) ===
      scalarText(
        definition.Priority,
      ) &&
    snapshot.taskClass ===
      definition.TaskClass &&
    snapshot.isBatch ===
      definition.IsBatch &&
    snapshot.namespace.toUpperCase() ===
      definition.NameSpace.toUpperCase() &&
    (
      scalarText(
        snapshot.timePeriod,
      ) ===
        "on demand" ||
      scalarText(
        snapshot.timePeriod,
      ) ===
        "5"
    ) &&
    snapshot.timePeriodEvery ===
      definition.TimePeriodEvery &&
    snapshot.timePeriodDay ===
      definition.TimePeriodDay &&
    (
      scalarText(
        snapshot.dailyFrequency,
      ) ===
        "once" ||
      scalarText(
        snapshot.dailyFrequency,
      ) ===
        "0"
    ) &&
    (
      scalarText(
        snapshot.dailyFrequencyTime,
      ) ===
        scalarText(
          definition.DailyFrequencyTime,
        ) ||
      snapshot.dailyFrequencyTime ===
        "" ||
      scalarText(
        snapshot.dailyFrequencyTime,
      ) ===
        "0"
    ) &&
    snapshot.dailyIncrement ===
      definition.DailyIncrement &&
    (
      snapshot.dailyStartTime ===
        definition.DailyStartTime ||
      snapshot.dailyStartTime ===
        ""
    ) &&
    (
      snapshot.dailyEndTime ===
        definition.DailyEndTime ||
      snapshot.dailyEndTime ===
        ""
    ) &&
    snapshot.runAfterGuid ===
      definition.RunAfterGUID &&
    snapshot.startDate ===
      definition.StartDate &&
    snapshot.endDate ===
      definition.EndDate &&
    (
      scalarText(
        snapshot.mirrorStatus,
      ) ===
        "primary" ||
      scalarText(
        snapshot.mirrorStatus,
      ) ===
        "1"
    ) &&
    snapshot.rescheduleOnStart ===
      definition.RescheduleOnStart &&
    snapshot.description ===
      definition.Description &&
    settingsEqual(
      snapshot.settings,
      definition.Settings,
    )
  );
}

export function t03TaskSnapshotMatchesDefinition(
  snapshot:
    T03TaskSnapshot,
  definition:
    T03TaskDefinition,
): boolean {
  return definitionsEqual(
    snapshot,
    definition,
  );
}

export function t03TaskSnapshotsEqual(
  before:
    T03TaskSnapshot,
  after:
    T03TaskSnapshot,
): boolean {
  return (
    digestCanonicalJson(
      before,
    ) ===
    digestCanonicalJson(
      after,
    )
  );
}

export function t03TaskHistoryMatchesCreateOnly(
  history:
    readonly T03TaskHistoryRow[],
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
      T03_TASK_NAME &&
    row.namespace.toUpperCase() ===
      "%SYS" &&
    row.status ===
      "1" &&
    row.routine.toUpperCase() ===
      "TASKMGR" &&
    row.username ===
      "meridian.runtime" &&
    row.result ===
      `Create ${T03_TASK_NAME}`
  );
}

function successfulExecutionRow(
  row:
    T03TaskHistoryRow,
  expectedTaskId:
    number,
): boolean {
  return (
    row.taskId ===
      expectedTaskId &&
    row.name ===
      T03_TASK_NAME &&
    row.namespace.toUpperCase() ===
      "%SYS" &&
    row.status ===
      "1" &&
    row.username ===
      "meridian.runtime" &&
    scalarText(
      row.result,
    ) ===
      "success" &&
    row.lastStart.trim().length >
      0 &&
    row.completed.trim().length >
      0 &&
    row.logDatetime.trim().length >
      0 &&
    row.routine.trim().length >
      0 &&
    row.routine.toUpperCase() !==
      "TASKMGR"
  );
}

export function t03TaskHistoryMatchesSingleSuccessfulRun(
  current:
    readonly T03TaskHistoryRow[],
  reviewed:
    readonly T03TaskHistoryRow[],
  expectedTaskId:
    number,
): boolean {
  if (
    !t03TaskHistoryMatchesCreateOnly(
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

  const successfulExecutionRows =
    current.filter(
      (
        row,
      ) =>
        successfulExecutionRow(
          row,
          expectedTaskId,
        ),
    );

  return (
    matchingCreateRows.length ===
      1 &&
    successfulExecutionRows.length ===
      1
  );
}

function preInfoMatches(
  info:
    T03TaskInfo,
): boolean {
  return (
    info.lastStarted ===
      "" &&
    info.lastFinished ===
      ""
  );
}

function postInfoMatches(
  info:
    T03TaskInfo,
): boolean {
  return (
    info.lastStarted.trim().length >
      0 &&
    info.lastFinished.trim().length >
      0 &&
    info.status ===
      "1" &&
    scalarText(
      info.error,
    ) ===
      "success"
  );
}

export function t03PrestateMatches(
  preflight:
    T03TaskRunNowPreflight,
): boolean {
  const task =
    preflight.matchingTask;

  const summary =
    preflight.matchingSummary;

  const info =
    preflight.matchingInfo;

  const expected =
    t03TaskDefinition(
      preflight.expectedFixtureGeneration,
    );

  return (
    preflight.schemaVersion ===
      "meridian.task-run-now-preflight.v1" &&
    preflight.taskName ===
      T03_TASK_NAME &&
    preflight.expectedFixtureGeneration.trim().length >
      0 &&
    preflight.expectedTaskId >
      0 &&
    preflight.expectedDefinitionDigest ===
      digestCanonicalJson(
        expected,
      ) &&
    preflight.authorizedRunRequestDigest ===
      digestCanonicalJson({
        operation:
          "POST /v2/task/run",
        requiredAuthority:
          "%Admin_Task:U",
        authorityRole:
          T03_TASK_ROLE,
        query: {
          id:
            preflight.expectedTaskId,
        },
        body:
          T03_RUN_NOW_BODY,
        automaticRetryAllowed:
          false,
      }) &&
    preflight.matchingTaskCount ===
      1 &&
    task !==
      null &&
    summary !==
      null &&
    info !==
      null &&
    task.id ===
      preflight.expectedTaskId &&
    summary.id ===
      preflight.expectedTaskId &&
    t03TaskSnapshotMatchesDefinition(
      task,
      expected,
    ) &&
    summary.name ===
      T03_TASK_NAME &&
    summary.namespace.toUpperCase() ===
      "%SYS" &&
    summary.description ===
      expected.Description &&
    summary.suspended ===
      false &&
    summary.lastFinished ===
      "" &&
    summary.nextScheduled ===
      "" &&
    preInfoMatches(
      info,
    ) &&
    preflight.taskInventoryCount >
      0 &&
    preflight.matchingUpcomingCount ===
      0 &&
    preflight.matchingHistoryCount ===
      1 &&
    t03TaskHistoryMatchesCreateOnly(
      preflight.matchingHistory,
      preflight.expectedTaskId,
    ) &&
    preflight.taskManagerStatus.trim().length >
      0 &&
    preflight.officialMutationOperation ===
      "POST /v2/task/run" &&
    preflight.requiredAuthority ===
      "%Admin_Task:U" &&
    preflight.authorityRole ===
      T03_TASK_ROLE &&
    preflight.authorityMode ===
      "EXPLICIT_ESCALATION_ROLE"
  );
}

export function t03PoststateMatches(
  current:
    T03TaskRunNowPreflight,
  reviewed:
    T03TaskRunNowPreflight,
): boolean {
  const beforeTask =
    reviewed.matchingTask;

  const afterTask =
    current.matchingTask;

  const beforeSummary =
    reviewed.matchingSummary;

  const afterSummary =
    current.matchingSummary;

  const afterInfo =
    current.matchingInfo;

  return (
    t03PrestateMatches(
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
    afterInfo !==
      null &&
    current.expectedFixtureGeneration ===
      reviewed.expectedFixtureGeneration &&
    current.expectedTaskId ===
      reviewed.expectedTaskId &&
    current.expectedDefinitionDigest ===
      reviewed.expectedDefinitionDigest &&
    current.authorizedRunRequestDigest ===
      reviewed.authorizedRunRequestDigest &&
    current.matchingTaskCount ===
      1 &&
    afterTask.id ===
      reviewed.expectedTaskId &&
    t03TaskSnapshotsEqual(
      beforeTask,
      afterTask,
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
    afterSummary.suspended ===
      beforeSummary.suspended &&
    afterSummary.nextScheduled ===
      beforeSummary.nextScheduled &&
    afterSummary.lastFinished.trim().length >
      0 &&
    postInfoMatches(
      afterInfo,
    ) &&
    current.matchingUpcomingCount ===
      0 &&
    current.taskManagerStatus ===
      reviewed.taskManagerStatus &&
    t03TaskHistoryMatchesSingleSuccessfulRun(
      current.matchingHistory,
      reviewed.matchingHistory,
      reviewed.expectedTaskId,
    )
  );
}

export function t03TaskRunNowIntent(
  generation:
    string,
  taskId:
    number,
): T03TaskRunNowIntent {
  const trimmed =
    generation.trim();

  if (
    trimmed.length ===
      0
  ) {
    throw new Error(
      "T03 fixture generation is required.",
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
      "T03 task id must be a positive safe integer.",
    );
  }

  return Object.freeze({
    actionId:
      "T03_TASK_RUN_NOW" as const,

    taskName:
      T03_TASK_NAME,

    expectedFixtureGeneration:
      trimmed,

    expectedTaskId:
      taskId,
  });
}

function assertIntent(
  intent:
    T03TaskRunNowIntent,
): void {
  if (
    intent.actionId !==
      "T03_TASK_RUN_NOW" ||
    intent.taskName !==
      T03_TASK_NAME ||
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
      "T03 intent is outside the frozen inert task run-now boundary.",
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
      T03TaskRunNowExecution[
        "resolutionSource"
      ];
  },
): T03TaskRunNowExecution {
  return Object.freeze({
    schemaVersion:
      T03_TASK_RUN_NOW_EXECUTION_SCHEMA_VERSION,

    state:
      "APPLIED" as const,

    actionId:
      "T03_TASK_RUN_NOW" as const,

    taskName:
      T03_TASK_NAME,

    generation:
      input.generation,

    taskId:
      input.taskId,

    runStatus:
      input.source ===
        "DIRECT_EXECUTION"
        ? 200 as const
        : null,

    httpRunResponseVerified:
      input.source ===
        "DIRECT_EXECUTION",

    mutationRequestCount:
      1 as const,

    configurationPreserved:
      true as const,

    successfulExecutionHistoryObserved:
      true as const,

    taskInfoCompletionObserved:
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
  T03TaskRunNowPreflight
> | null {
  if (
    error instanceof
      T03TaskAuthorityDeniedError
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

export function reconcileUnknownT03TaskRunNow(
  current:
    T03TaskRunNowPreflight,
  reviewed:
    T03TaskRunNowPreflight,
): ReconciliationDecision<
  T03TaskRunNowExecution
> {
  if (
    t03PoststateMatches(
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
    t03PrestateMatches(
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
        "AUTHORITATIVE_READBACK_MATCHED_EXACT_T03_NEVER_STARTED_STATE_A",
    });
  }

  return Object.freeze({
    outcome:
      "STILL_UNKNOWN" as const,

    reason:
      "AUTHORITATIVE_READBACK_MATCHED_NEITHER_EXACT_T03_STATE_A_NOR_SINGLE_SUCCESSFUL_EXECUTION_STATE_B",
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

export function buildT03TaskRunNowProofResults(
  input:
    T03TaskRunNowEvidenceInput,
): readonly ProofResult[] {
  const [
    http,
    configuration,
    taskState,
    taskHistory,
  ] =
    T03_TASK_RUN_NOW_PROOF_REQUIREMENTS;

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
      "T03 proof requirement registry is incomplete.",
    );
  }

  return Object.freeze([
    proofResult({
      requirement:
        http,

      passed:
        input.httpRunVerified,

      observedAtUtc:
        input.observedAtUtc,

      sourceReference:
        input.httpSourceReference,

      observedSummary:
        input.httpRunVerified
          ? "Exactly one POST /v2/task/run targeted the reviewed task id with exactly RunNow=true and returned HTTP 200."
          : "The T03 HTTP plane did not prove one exact reviewed-id RunNow=true POST with HTTP 200.",
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
          ? "The complete authoritative task configuration remained byte-semantically equal to the reviewed inert On Demand State A snapshot."
          : "Authoritative task configuration changed across T03 execution.",
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
          ? "Task identity/cardinality and manager state stayed fixed; task info proved a completed successful run and the On Demand witness remained absent from upcoming schedule."
          : "Task state did not prove one completed execution with identity/manager/upcoming invariants.",
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
          ? `History preserved the Create row and appended exactly one successful execution row; latest result=${input.observedHistoryResult}.`
          : "Task history did not prove exactly one successful execution row after the reviewed Create-only baseline.",
    }),
  ]);
}

export function createT03TaskRunNowProofContract(
  dependencies:
    T03TaskRunNowContractDependencies,
): ProofContract<
  T03TaskRunNowIntent,
  T03TaskRunNowPreflight,
  T03TaskRunNowExecution
> {
  const contract:
    ProofContract<
      T03TaskRunNowIntent,
      T03TaskRunNowPreflight,
      T03TaskRunNowExecution
    > =
  {
    schemaVersion:
      PROOF_CONTRACT_SCHEMA_VERSION,

    contractId:
      T03_TASK_RUN_NOW_CONTRACT_ID,

    contractVersion:
      1,

    actionType:
      "TASK_RUN_NOW",

    domain:
      "TASKS",

    risk:
      "MEDIUM",

    reversibility:
      "IRREVERSIBLE",

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
      T03_TASK_RUN_NOW_PROOF_REQUIREMENTS,

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
          T03_TASK_TARGET_CANONICAL_ID,

        displayName:
          T03_TASK_NAME,

        fixtureId:
          "meridian-r5-t03-task-run-now-fixture",

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
        !t03PrestateMatches(
          preflight,
        )
      ) {
        throw new ProofEngineError(
          "STALE_PRECONDITION",
          "T03 preflight requires one exact generation-bound inert On Demand task that has never started, has Create-only history, and has zero upcoming schedule.",
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
        !t03PrestateMatches(
          preflight,
        )
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "T03 expected delta requires the exact reviewed never-started State A.",
        );
      }

      return Object.freeze({
        summary:
          T03_TASK_RUN_NOW_DELTA_SUMMARY,

        before:
          Object.freeze({
            taskId:
              preflight.expectedTaskId,

            configurationDigest:
              digestCanonicalJson(
                preflight.matchingTask,
              ),

            taskInventoryCount:
              preflight.taskInventoryCount,

            taskManagerStatus:
              preflight.taskManagerStatus,

            historyCount:
              preflight.matchingHistoryCount,

            upcomingCount:
              preflight.matchingUpcomingCount,

            lastStarted:
              preflight.matchingInfo?.lastStarted ??
              "",

            lastFinished:
              preflight.matchingInfo?.lastFinished ??
              "",
          }),

        after:
          Object.freeze({
            taskId:
              preflight.expectedTaskId,

            configurationPreserved:
              true,

            taskInventoryCount:
              preflight.taskInventoryCount,

            taskManagerStatus:
              preflight.taskManagerStatus,

            historyCount:
              preflight.matchingHistoryCount +
              1,

            upcomingCount:
              0,

            lastStartedPopulated:
              true,

            lastFinishedPopulated:
              true,

            successfulExecutionHistoryObserved:
              true,
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
        !t03PrestateMatches(
          preflight,
        )
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "T03 impact analysis requires the exact reviewed inert State A.",
        );
      }

      return Object.freeze({
        certainty:
          "KNOWN" as const,

        summary:
          "T03 executes exactly one dedicated inert synthetic On Demand task. The fixture class OnTask returns success only and performs no custom global writes, file I/O, network I/O, or application mutation; expected persistent changes are limited to Task Manager execution metadata/history.",

        affectedEntities:
          Object.freeze([
            Object.freeze({
              kind:
                "TASK",

              canonicalId:
                T03_TASK_TARGET_CANONICAL_ID,

              displayName:
                T03_TASK_NAME,

              effect:
                "Exactly one reviewed task execution is requested; configuration is preserved while Task Manager records successful execution state/history.",
            }),
          ]),

        limitations:
          Object.freeze([
            "T03 certifies Run Now only for the dedicated inert synthetic witness; it does not expose arbitrary task execution.",
            "T03 task and class provisioning are separate setup lifecycle steps and are not part of the certified business mutation.",
            "Execution is inherently not reversible; no inverse run exists.",
            "Automatic retry is forbidden after any ambiguous POST /v2/task/run dispatch because a retry could execute the task twice.",
            "Synthetic task/class cleanup is allowed only after durable verified receipt closure or separately reconciled failed-attempt lifecycle cleanup.",
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
          T03TaskRunNowIntent,
          T03TaskRunNowPreflight
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
          !t03PrestateMatches(
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
              "T03 task configuration/state/info/history changed after review; zero Run Now request dispatched.",
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
              "T03 fresh preflight digest differs from the reviewed digest.",
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
          "T03 execute refused because reviewed and fresh preflight digests differ.",
        );
      }

      let executed:
        Readonly<{
          taskId:
            number;

          status:
            200;

          mutationRequestCount:
            1;
        }>;

      try {
        executed =
          await dependencies.executeRunNow(
            ready.intent,
          );
      } catch (
        error
      ) {
        if (
          error instanceof
            T03TaskMutationUnknownAfterDispatchError
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
        executed.status !==
          200 ||
        executed.taskId !==
          ready.intent.expectedTaskId ||
        executed.mutationRequestCount !==
          1
      ) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          "T03 POST response did not prove exact HTTP 200 reviewed task identity with one run request. Automatic retry is forbidden.",
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
        !t03PoststateMatches(
          after,
          ready.preflight,
        )
      ) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          "T03 Run Now returned success but authoritative readback did not prove exactly one successful execution with configuration/identity/manager/upcoming preservation. Automatic retry is forbidden.",
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

      return reconcileUnknownT03TaskRunNow(
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
        !executionResult.successfulExecutionHistoryObserved ||
        !executionResult.taskInfoCompletionObserved ||
        !executionResult.zeroUpcomingPreserved ||
        executionResult.mutationRequestCount !==
          1 ||
        executionResult.taskId <
          1
      ) {
        throw new ProofEngineError(
          "PROOF_INCOMPLETE",
          "T03 execution evidence is incomplete.",
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
          null,

        automatic:
          false as const,

        summary:
          "Run Now has no inverse operation. Automatic retry is forbidden. Preserve the executed task and evidence for reconciliation; synthetic fixture cleanup is allowed only after durable receipt closure or separately reviewed lifecycle recovery.",
      });
    },
  };

  return Object.freeze(
    contract,
  );
}

export async function certifyT03TaskRunNowAction(
  input: {
    readonly intent:
      T03TaskRunNowIntent;

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
    T03TaskRunNowCertificationDependencies,
): Promise<
  VerifiedActionCertificationResult<
    T03TaskRunNowExecution
  >
> {
  return certifyVerifiedAction(
    {
      contract:
        createT03TaskRunNowProofContract(
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
