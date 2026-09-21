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
  T02_PRIORITY_AFTER,
  T02_PRIORITY_BEFORE,
  T02_TASK_NAME,
  T02_TASK_ROLE,
  T02TaskAuthorityDeniedError,
  T02TaskMutationUnknownAfterDispatchError,
  t02TaskDefinition,
  t02PriorityUpdatePatch,
  type T02TaskDefinition,
  type T02TaskHistoryRow,
  type T02TaskSnapshot,
  type T02TaskSummary,
} from "../../iris/task-update-action-transport";

export const T02_TASK_UPDATE_CONTRACT_ID =
  "meridian.tasks.task-update.v2" as const;

export const T02_TASK_UPDATE_EXECUTION_SCHEMA_VERSION =
  "meridian.task-update-execution.v2" as const;

export const T02_TASK_TARGET_CANONICAL_ID =
  "task:meridian-r5-t02-update-witness" as const;

export const T02_TASK_UPDATE_DELTA_SUMMARY =
  "Update exactly one reviewed On Demand task definition through one PUT /v2/task?id=<reviewed-id> whose body contains only Priority=Low. Prove Priority Normal to Low, preserve every other authoritative configuration/state field, preserve task identity and manager state, preserve the reviewed task-history snapshot exactly, and observe zero execution/upcoming leakage." as const;

export interface T02TaskUpdateIntent {
  readonly actionId:
    "T02_TASK_UPDATE";

  readonly taskName:
    typeof T02_TASK_NAME;

  readonly expectedFixtureGeneration:
    string;

  readonly expectedTaskId:
    number;
}

export interface T02TaskUpdatePreflight {
  readonly schemaVersion:
    "meridian.task-update-preflight.v1";

  readonly expectedFixtureGeneration:
    string;

  readonly taskName:
    typeof T02_TASK_NAME;

  readonly expectedTaskId:
    number;

  readonly expectedBeforeDefinitionDigest:
    string;

  readonly authorizedPatchDigest:
    string;

  readonly matchingTaskCount:
    number;

  readonly matchingTask:
    T02TaskSnapshot | null;

  readonly matchingSummary:
    T02TaskSummary | null;

  readonly taskInventoryCount:
    number;

  readonly matchingUpcomingCount:
    number;

  readonly matchingHistoryCount:
    number;

  readonly matchingHistory:
    readonly T02TaskHistoryRow[];

  readonly taskManagerStatus:
    string;

  readonly officialMutationOperation:
    "PUT /v2/task";

  readonly requiredAuthority:
    "%Admin_Task:U";

  readonly authorityRole:
    typeof T02_TASK_ROLE;

  readonly authorityMode:
    "EXPLICIT_ESCALATION_ROLE";
}

export interface T02TaskUpdateExecution {
  readonly schemaVersion:
    typeof T02_TASK_UPDATE_EXECUTION_SCHEMA_VERSION;

  readonly state:
    "APPLIED";

  readonly actionId:
    "T02_TASK_UPDATE";

  readonly taskName:
    typeof T02_TASK_NAME;

  readonly generation:
    string;

  readonly taskId:
    number;

  readonly updateStatus:
    200 | null;

  readonly httpUpdateResponseVerified:
    boolean;

  readonly mutationRequestCount:
    1;

  readonly priorityBefore:
    typeof T02_PRIORITY_BEFORE;

  readonly priorityAfter:
    typeof T02_PRIORITY_AFTER;

  readonly nonTargetConfigurationPreserved:
    true;

  readonly noExecutionObserved:
    true;

  readonly resolutionSource:
    "DIRECT_EXECUTION" |
    "AUTHORITATIVE_RECONCILIATION_READBACK";
}

export interface T02TaskUpdateEvidenceInput {
  readonly observedAtUtc:
    string;

  readonly httpUpdateVerified:
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

export interface T02TaskUpdateContractDependencies {
  readonly readFreshPreflight:
    (
      intent:
        T02TaskUpdateIntent,
    ) =>
      Promise<
        T02TaskUpdatePreflight
      >;

  readonly executeUpdate:
    (
      intent:
        T02TaskUpdateIntent,
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
        T02TaskUpdateExecution,
    ) =>
      Promise<
        readonly ProofResult[]
      >;
}

export interface T02TaskUpdateCertificationDependencies {
  readonly contract:
    T02TaskUpdateContractDependencies;

  readonly certification:
    VerifiedActionCertificationDependencies<
      T02TaskUpdatePreflight
    >;
}

export const T02_TASK_UPDATE_PROOF_REQUIREMENTS:
  readonly ProofRequirement[] =
  Object.freeze([
    Object.freeze({
      requirementId:
        "t02-http-priority-update",

      plane:
        "HTTP_BEHAVIOR",

      applicability:
        "REQUIRED",

      description:
        "Exactly one official PUT /v2/task targets the exact reviewed positive task id, carries exactly one body property Priority=Low, returns HTTP 200, and is never automatically retried.",

      source:
        "IRIS SysAdmin API PUT /v2/task",
    }),

    Object.freeze({
      requirementId:
        "t02-one-field-configuration-delta",

      plane:
        "CONFIGURATION_READBACK",

      applicability:
        "REQUIRED",

      description:
        "Authoritative GET /v2/task readback proves Priority changed from Normal to Low while every other normalized persisted Task field, including Settings, remains identical to the reviewed A snapshot.",

      source:
        "IRIS SysAdmin API GET /v2/task",
    }),

    Object.freeze({
      requirementId:
        "t02-task-state-invariance",

      plane:
        "TASK_STATE",

      applicability:
        "REQUIRED",

      description:
        "The exact task id/name and inventory cardinality remain stable, Task Manager state and summary scheduling/suspension fields remain unchanged, and the witness remains absent from upcoming execution.",

      source:
        "IRIS SysAdmin API GET /v2/tasks + GET /v2/task/manager + GET /v2/task/upcoming",
    }),

    Object.freeze({
      requirementId:
        "t02-task-history-stability",

      plane:
        "TASK_HISTORY",

      applicability:
        "REQUIRED",

      description:
        "The authoritative task-history snapshot remains exactly equal to the reviewed pre-PUT snapshot. No new history row is permitted, proving the Priority edit did not execute the task or leak into run history.",

      source:
        "IRIS SysAdmin API GET /v2/task/history (pinned spec: history of previously run tasks)",
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

export function t02TaskSnapshotMatchesDefinition(
  snapshot:
    T02TaskSnapshot,
  definition:
    T02TaskDefinition,
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

export function t02SnapshotsEqualExceptPriority(
  before:
    T02TaskSnapshot,
  after:
    T02TaskSnapshot,
): boolean {
  return (
    before.id ===
      after.id &&
    before.name ===
      after.name &&
    before.runAsUser ===
      after.runAsUser &&
    exactArray(
      before.emailOnCompletion,
      after.emailOnCompletion,
    ) &&
    exactArray(
      before.emailOnError,
      after.emailOnError,
    ) &&
    exactArray(
      before.emailOnExpiration,
      after.emailOnExpiration,
    ) &&
    before.emailOutput ===
      after.emailOutput &&
    before.expires ===
      after.expires &&
    before.expiresDays ===
      after.expiresDays &&
    before.expiresHours ===
      after.expiresHours &&
    before.expiresMinutes ===
      after.expiresMinutes &&
    before.openOutputFile ===
      after.openOutputFile &&
    before.outputDirectory ===
      after.outputDirectory &&
    before.outputFilename ===
      after.outputFilename &&
    before.outputFileIsBinary ===
      after.outputFileIsBinary &&
    before.suspendOnError ===
      after.suspendOnError &&
    before.suspendTerminated ===
      after.suspendTerminated &&
    before.taskClass ===
      after.taskClass &&
    before.isBatch ===
      after.isBatch &&
    before.namespace ===
      after.namespace &&
    before.timePeriod ===
      after.timePeriod &&
    before.timePeriodEvery ===
      after.timePeriodEvery &&
    before.timePeriodDay ===
      after.timePeriodDay &&
    before.dailyFrequency ===
      after.dailyFrequency &&
    before.dailyFrequencyTime ===
      after.dailyFrequencyTime &&
    before.dailyIncrement ===
      after.dailyIncrement &&
    before.dailyStartTime ===
      after.dailyStartTime &&
    before.dailyEndTime ===
      after.dailyEndTime &&
    before.runAfterGuid ===
      after.runAfterGuid &&
    before.startDate ===
      after.startDate &&
    before.endDate ===
      after.endDate &&
    before.mirrorStatus ===
      after.mirrorStatus &&
    before.rescheduleOnStart ===
      after.rescheduleOnStart &&
    before.description ===
      after.description &&
    settingsEqual(
      before.settings,
      after.settings,
    )
  );
}

export function t02TaskHistoryMatchesCreateOnly(
  history:
    readonly T02TaskHistoryRow[],
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
      T02_TASK_NAME &&
    row.namespace.toUpperCase() ===
      "%SYS" &&
    row.status ===
      "1" &&
    row.routine.toUpperCase() ===
      "TASKMGR" &&
    row.username ===
      "meridian.runtime" &&
    row.result ===
      `Create ${T02_TASK_NAME}`
  );
}

export function t02TaskHistoryPreserved(
  current:
    readonly T02TaskHistoryRow[],
  reviewed:
    readonly T02TaskHistoryRow[],
): boolean {
  return (
    digestCanonicalJson(
      current,
    ) ===
    digestCanonicalJson(
      reviewed,
    )
  );
}

function summaryPreserved(
  before:
    T02TaskSummary,
  after:
    T02TaskSummary,
): boolean {
  return (
    before.id ===
      after.id &&
    before.name ===
      after.name &&
    before.type ===
      after.type &&
    before.namespace ===
      after.namespace &&
    before.description ===
      after.description &&
    before.suspended ===
      after.suspended &&
    before.lastFinished ===
      after.lastFinished &&
    before.nextScheduled ===
      after.nextScheduled
  );
}

export function t02PrestateMatches(
  preflight:
    T02TaskUpdatePreflight,
): boolean {
  const task =
    preflight.matchingTask;

  const summary =
    preflight.matchingSummary;

  const expected =
    t02TaskDefinition(
      preflight.expectedFixtureGeneration,
    );

  return (
    preflight.schemaVersion ===
      "meridian.task-update-preflight.v1" &&
    preflight.taskName ===
      T02_TASK_NAME &&
    preflight.expectedFixtureGeneration.trim().length >
      0 &&
    preflight.expectedTaskId >
      0 &&
    preflight.expectedBeforeDefinitionDigest ===
      digestCanonicalJson(
        expected,
      ) &&
    preflight.authorizedPatchDigest ===
      digestCanonicalJson(
        t02PriorityUpdatePatch(),
      ) &&
    preflight.matchingTaskCount ===
      1 &&
    task !==
      null &&
    summary !==
      null &&
    task.id ===
      preflight.expectedTaskId &&
    summary.id ===
      preflight.expectedTaskId &&
    t02TaskSnapshotMatchesDefinition(
      task,
      expected,
    ) &&
    summary.name ===
      T02_TASK_NAME &&
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
    preflight.taskInventoryCount >
      0 &&
    preflight.matchingUpcomingCount ===
      0 &&
    preflight.matchingHistoryCount ===
      1 &&
    t02TaskHistoryMatchesCreateOnly(
      preflight.matchingHistory,
      preflight.expectedTaskId,
    ) &&
    preflight.taskManagerStatus.trim().length >
      0 &&
    preflight.officialMutationOperation ===
      "PUT /v2/task" &&
    preflight.requiredAuthority ===
      "%Admin_Task:U" &&
    preflight.authorityRole ===
      T02_TASK_ROLE &&
    preflight.authorityMode ===
      "EXPLICIT_ESCALATION_ROLE"
  );
}

export function t02PoststateMatches(
  current:
    T02TaskUpdatePreflight,
  reviewed:
    T02TaskUpdatePreflight,
): boolean {
  const before =
    reviewed.matchingTask;

  const after =
    current.matchingTask;

  const beforeSummary =
    reviewed.matchingSummary;

  const afterSummary =
    current.matchingSummary;

  return (
    t02PrestateMatches(
      reviewed,
    ) &&
    before !==
      null &&
    after !==
      null &&
    beforeSummary !==
      null &&
    afterSummary !==
      null &&
    current.expectedFixtureGeneration ===
      reviewed.expectedFixtureGeneration &&
    current.expectedTaskId ===
      reviewed.expectedTaskId &&
    current.expectedBeforeDefinitionDigest ===
      reviewed.expectedBeforeDefinitionDigest &&
    current.authorizedPatchDigest ===
      reviewed.authorizedPatchDigest &&
    current.matchingTaskCount ===
      1 &&
    after.id ===
      reviewed.expectedTaskId &&
    scalarText(
      before.priority,
    ) ===
      scalarText(
        T02_PRIORITY_BEFORE,
      ) &&
    scalarText(
      after.priority,
    ) ===
      scalarText(
        T02_PRIORITY_AFTER,
      ) &&
    t02SnapshotsEqualExceptPriority(
      before,
      after,
    ) &&
    current.taskInventoryCount ===
      reviewed.taskInventoryCount &&
    summaryPreserved(
      beforeSummary,
      afterSummary,
    ) &&
    current.matchingUpcomingCount ===
      0 &&
    current.taskManagerStatus ===
      reviewed.taskManagerStatus &&
    current.matchingHistoryCount ===
      reviewed.matchingHistoryCount &&
    t02TaskHistoryPreserved(
      current.matchingHistory,
      reviewed.matchingHistory,
    )
  );
}

export function t02TaskUpdateIntent(
  generation:
    string,
  taskId:
    number,
): T02TaskUpdateIntent {
  const trimmed =
    generation.trim();

  if (
    trimmed.length ===
      0
  ) {
    throw new Error(
      "T02 fixture generation is required.",
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
      "T02 task id must be a positive safe integer.",
    );
  }

  return Object.freeze({
    actionId:
      "T02_TASK_UPDATE" as const,

    taskName:
      T02_TASK_NAME,

    expectedFixtureGeneration:
      trimmed,

    expectedTaskId:
      taskId,
  });
}

function assertIntent(
  intent:
    T02TaskUpdateIntent,
): void {
  if (
    intent.actionId !==
      "T02_TASK_UPDATE" ||
    intent.taskName !==
      T02_TASK_NAME ||
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
      "T02 intent is outside the frozen isolated task-update boundary.",
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
      T02TaskUpdateExecution[
        "resolutionSource"
      ];
  },
): T02TaskUpdateExecution {
  return Object.freeze({
    schemaVersion:
      T02_TASK_UPDATE_EXECUTION_SCHEMA_VERSION,

    state:
      "APPLIED" as const,

    actionId:
      "T02_TASK_UPDATE" as const,

    taskName:
      T02_TASK_NAME,

    generation:
      input.generation,

    taskId:
      input.taskId,

    updateStatus:
      input.source ===
        "DIRECT_EXECUTION"
        ? 200 as const
        : null,

    httpUpdateResponseVerified:
      input.source ===
        "DIRECT_EXECUTION",

    mutationRequestCount:
      1 as const,

    priorityBefore:
      T02_PRIORITY_BEFORE,

    priorityAfter:
      T02_PRIORITY_AFTER,

    nonTargetConfigurationPreserved:
      true as const,

    noExecutionObserved:
      true as const,

    resolutionSource:
      input.source,
  });
}

function mapAuthorityDenied(
  error:
    unknown,
): RevalidationDecision<
  T02TaskUpdatePreflight
> | null {
  if (
    error instanceof
      T02TaskAuthorityDeniedError
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

export function reconcileUnknownT02TaskUpdate(
  current:
    T02TaskUpdatePreflight,
  reviewed:
    T02TaskUpdatePreflight,
): ReconciliationDecision<
  T02TaskUpdateExecution
> {
  if (
    t02PoststateMatches(
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
    t02PrestateMatches(
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
        "AUTHORITATIVE_READBACK_MATCHED_EXACT_T02_REVIEWED_PRIORITY_NORMAL_PRESTATE",
    });
  }

  return Object.freeze({
    outcome:
      "STILL_UNKNOWN" as const,

    reason:
      "AUTHORITATIVE_READBACK_MATCHED_NEITHER_EXACT_T02_PRIORITY_NORMAL_PRESTATE_NOR_ONE_FIELD_PRIORITY_LOW_POSTSTATE",
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

export function buildT02TaskUpdateProofResults(
  input:
    T02TaskUpdateEvidenceInput,
): readonly ProofResult[] {
  const [
    http,
    configuration,
    taskState,
    taskHistory,
  ] =
    T02_TASK_UPDATE_PROOF_REQUIREMENTS;

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
      "T02 proof requirement registry is incomplete.",
    );
  }

  return Object.freeze([
    proofResult({
      requirement:
        http,

      passed:
        input.httpUpdateVerified,

      observedAtUtc:
        input.observedAtUtc,

      sourceReference:
        input.httpSourceReference,

      observedSummary:
        input.httpUpdateVerified
          ? "Exactly one PUT /v2/task targeted the reviewed id with the single Priority=Low property and returned HTTP 200."
          : "The T02 HTTP plane did not prove one exact reviewed-id Priority-only PUT with HTTP 200.",
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
          ? "Priority changed Normal to Low while every other authoritative normalized Task field, including Settings, remained equal to the reviewed A snapshot."
          : "Authoritative task detail readback contains non-Priority drift or did not prove the reviewed Priority delta.",
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
          ? "Task identity/cardinality, manager state, suspension and schedule summary remained invariant with zero upcoming execution."
          : "Task state did not prove identity/schedule invariance without execution leakage.",
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
          ? "Task history remained exactly equal to the reviewed pre-PUT snapshot; no new execution/history row appeared."
          : "Task history changed after the Priority-only PUT, so no-execution/history stability was not proven.",
    }),
  ]);
}

export function createT02TaskUpdateProofContract(
  dependencies:
    T02TaskUpdateContractDependencies,
): ProofContract<
  T02TaskUpdateIntent,
  T02TaskUpdatePreflight,
  T02TaskUpdateExecution
> {
  const contract:
    ProofContract<
      T02TaskUpdateIntent,
      T02TaskUpdatePreflight,
      T02TaskUpdateExecution
    > =
  {
    schemaVersion:
      PROOF_CONTRACT_SCHEMA_VERSION,

    contractId:
      T02_TASK_UPDATE_CONTRACT_ID,

    contractVersion:
      2,

    actionType:
      "TASK_UPDATE",

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
      T02_TASK_UPDATE_PROOF_REQUIREMENTS,

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
          T02_TASK_TARGET_CANONICAL_ID,

        displayName:
          T02_TASK_NAME,

        fixtureId:
          "meridian-r5-t02-task-update-fixture",

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
        !t02PrestateMatches(
          preflight,
        )
      ) {
        throw new ProofEngineError(
          "STALE_PRECONDITION",
          "T02 preflight requires one exact generation-bound On Demand Priority=Normal fixture with Create-only history and zero upcoming execution.",
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
        !t02PrestateMatches(
          preflight,
        )
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "T02 expected delta requires the exact reviewed Priority=Normal prestate.",
        );
      }

      return Object.freeze({
        summary:
          T02_TASK_UPDATE_DELTA_SUMMARY,

        before:
          Object.freeze({
            taskId:
              preflight.expectedTaskId,

            priority:
              T02_PRIORITY_BEFORE,

            taskSnapshotDigest:
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
          }),

        after:
          Object.freeze({
            taskId:
              preflight.expectedTaskId,

            priority:
              T02_PRIORITY_AFTER,

            authorizedChangedFieldCount:
              1,

            authorizedChangedField:
              "Priority",

            taskInventoryCount:
              preflight.taskInventoryCount,

            taskManagerStatus:
              preflight.taskManagerStatus,

            historyCount:
              preflight.matchingHistoryCount,

            upcomingCount:
              0,

            nonTargetConfigurationPreserved:
              true,

            noExecutionObserved:
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
        !t02PrestateMatches(
          preflight,
        )
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "T02 impact analysis requires the exact reviewed fixture prestate.",
        );
      }

      return Object.freeze({
        certainty:
          "KNOWN" as const,

        summary:
          "T02 changes only the reviewed fixture task Priority from Normal to Low through a one-property partial PUT. It does not change scheduling, run-now state, suspension, manager state, task identity, task class, run-as principal, output/email behavior, or Settings.",

        affectedEntities:
          Object.freeze([
            Object.freeze({
              kind:
                "TASK",

              canonicalId:
                T02_TASK_TARGET_CANONICAL_ID,

              displayName:
                T02_TASK_NAME,

              effect:
                "Exactly one reviewed task configuration property changes: Priority Normal to Low.",
            }),
          ]),

        limitations:
          Object.freeze([
            "T02 does not certify task creation; its synthetic fixture setup is separate lifecycle preparation.",
            "T02 does not authorize run-now; T03 owns task execution.",
            "T02 does not authorize suspend/resume; T04 and T05 own those state transitions.",
            "The pinned SysAdmin spec describes /v2/task/history as history of previously run tasks. Live IRIS 2026.2 Build 221U did not append a history row for a Priority-only PUT; T02 v2 therefore requires exact history preservation as the no-execution invariant.",
            "Automatic retry or inverse update is forbidden after an ambiguous PUT dispatch.",
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
          T02TaskUpdateIntent,
          T02TaskUpdatePreflight
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
          !t02PrestateMatches(
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
              "T02 task configuration/state/history changed after review; zero business PUT dispatched.",
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
              "T02 fresh preflight digest differs from the reviewed digest.",
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
          "T02 execute refused because reviewed and fresh preflight digests differ.",
        );
      }

      let updated:
        Readonly<{
          taskId:
            number;

          status:
            200;

          mutationRequestCount:
            1;
        }>;

      try {
        updated =
          await dependencies.executeUpdate(
            ready.intent,
          );
      } catch (
        error
      ) {
        if (
          error instanceof
            T02TaskMutationUnknownAfterDispatchError
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
        updated.status !==
          200 ||
        updated.taskId !==
          ready.intent.expectedTaskId ||
        updated.mutationRequestCount !==
          1
      ) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          "T02 PUT response did not prove exact HTTP 200 reviewed task identity with one mutation request. Automatic retry is forbidden.",
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
        !t02PoststateMatches(
          after,
          ready.preflight,
        )
      ) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          "T02 PUT returned success but authoritative readback did not prove the single-field Priority delta with complete non-target/state/history preservation. Automatic retry is forbidden.",
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

      return reconcileUnknownT02TaskUpdate(
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
        !executionResult.nonTargetConfigurationPreserved ||
        !executionResult.noExecutionObserved ||
        executionResult.mutationRequestCount !==
          1 ||
        executionResult.taskId <
          1
      ) {
        throw new ProofEngineError(
          "PROOF_INCOMPLETE",
          "T02 execution evidence is incomplete.",
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
          "TASK_UPDATE",

        automatic:
          false as const,

        summary:
          "A reviewed inverse TASK_UPDATE may restore Priority from Low to Normal. Automatic rollback is forbidden; synthetic fixture deletion is allowed only after verified receipt closure or separately reconciled lifecycle cleanup.",
      });
    },
  };

  return Object.freeze(
    contract,
  );
}

export async function certifyT02TaskUpdateAction(
  input: {
    readonly intent:
      T02TaskUpdateIntent;

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
    T02TaskUpdateCertificationDependencies,
): Promise<
  VerifiedActionCertificationResult<
    T02TaskUpdateExecution
  >
> {
  return certifyVerifiedAction(
    {
      contract:
        createT02TaskUpdateProofContract(
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
