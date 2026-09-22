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
  T05_TASK_CLASS,
  T05_TASK_NAME,
  T05_TASK_ROLE,
  T05TaskAuthorityDeniedError,
  T05TaskMutationUnknownAfterDispatchError,
  t05TaskDescription,
  type T05TaskHistoryRow,
  type T05TaskSnapshot,
  type T05TaskSummary,
} from "../../iris/task-resume-action-transport";

export const T05_TASK_RESUME_CONTRACT_ID =
  "meridian.tasks.task-resume.v1" as const;

export const T05_TASK_RESUME_EXECUTION_SCHEMA_VERSION =
  "meridian.task-resume-execution.v1" as const;

export const T05_TASK_TARGET_CANONICAL_ID =
  "task:meridianlab-orderexporter" as const;

export const T05_EXPECTED_FIXTURE_PROJECTION_DIGEST =
  "CF2301CD71109BA5AF328A80F17CBD460BD602BE34A3D61B6101425684D6408A" as const;

export const T05_EXPECTED_CREATE_BODY_DIGEST =
  "E2EC53953FCEAA3FC26682312727EB112C046EA2CD65EBEA159F89FE5B1F9F13" as const;

export const T05_TASK_RESUME_DELTA_SUMMARY =
  "Resume exactly one reviewed shared On Demand task through one POST /v2/task/resume?id=<reviewed-id> with no request body. Prove native Suspended true to false while preserving task identity, complete task configuration, Task Manager state, and zero upcoming execution. SysAdmin summary Suspended is advisory only on Build 221U; task history is observed but is not a REQUIRED T05 proof. Automatic retry after dispatch is forbidden. T04_TASK_SUSPEND is the explicit reviewed recovery action and T06_TASK_DELETE_FIXTURE remains gated on T05 verification." as const;

export interface T05TaskResumeIntent {
  readonly actionId:
    "T05_TASK_RESUME";

  readonly taskName:
    typeof T05_TASK_NAME;

  readonly expectedFixtureGeneration:
    string;

  readonly expectedTaskId:
    number;
}

export interface T05TaskResumePreflight {
  readonly schemaVersion:
    "meridian.task-resume-preflight.v1";

  readonly expectedFixtureGeneration:
    string;

  readonly taskName:
    typeof T05_TASK_NAME;

  readonly expectedTaskId:
    number;

  readonly expectedFixtureProjectionDigest:
    typeof T05_EXPECTED_FIXTURE_PROJECTION_DIGEST;

  readonly expectedCreateBodyDigest:
    typeof T05_EXPECTED_CREATE_BODY_DIGEST;

  readonly authorizedResumeRequestDigest:
    string;

  readonly authoritativeSuspended:
    boolean;

  readonly matchingTaskCount:
    number;

  readonly matchingTask:
    T05TaskSnapshot | null;

  readonly matchingSummary:
    T05TaskSummary | null;

  readonly taskInventoryCount:
    number;

  readonly matchingUpcomingCount:
    number;

  readonly matchingHistoryCount:
    number;

  readonly matchingHistory:
    readonly T05TaskHistoryRow[];

  readonly taskManagerStatus:
    string;

  readonly officialMutationOperation:
    "POST /v2/task/resume";

  readonly requiredAuthority:
    "%Admin_Task:U";

  readonly authorityRole:
    typeof T05_TASK_ROLE;

  readonly authorityMode:
    "EXPLICIT_ESCALATION_ROLE";
}

export interface T05TaskResumeExecution {
  readonly schemaVersion:
    typeof T05_TASK_RESUME_EXECUTION_SCHEMA_VERSION;

  readonly state:
    "APPLIED";

  readonly actionId:
    "T05_TASK_RESUME";

  readonly taskName:
    typeof T05_TASK_NAME;

  readonly generation:
    string;

  readonly taskId:
    number;

  readonly resumeStatus:
    200 | null;

  readonly httpResumeResponseVerified:
    boolean;

  readonly mutationRequestCount:
    1;

  readonly configurationPreserved:
    true;

  readonly resumedObserved:
    true;

  readonly historyObserved:
    true;

  readonly zeroUpcomingPreserved:
    true;

  readonly resolutionSource:
    "DIRECT_EXECUTION" |
    "AUTHORITATIVE_RECONCILIATION_READBACK";
}

export interface T05TaskResumeEvidenceInput {
  readonly observedAtUtc:
    string;

  readonly httpResumeVerified:
    boolean;

  readonly configurationPreserved:
    boolean;

  readonly taskStateVerified:
    boolean;

  readonly taskHistoryObserved:
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

export interface T05TaskResumeContractDependencies {
  readonly readFreshPreflight:
    (
      intent:
        T05TaskResumeIntent,
    ) =>
      Promise<
        T05TaskResumePreflight
      >;

  readonly executeResume:
    (
      intent:
        T05TaskResumeIntent,
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
        T05TaskResumeExecution,
    ) =>
      Promise<
        readonly ProofResult[]
      >;
}

export interface T05TaskResumeCertificationDependencies {
  readonly contract:
    T05TaskResumeContractDependencies;

  readonly certification:
    VerifiedActionCertificationDependencies<
      T05TaskResumePreflight
    >;
}

export const T05_TASK_RESUME_PROOF_REQUIREMENTS:
  readonly ProofRequirement[] =
  Object.freeze([
    Object.freeze({
      requirementId:
        "t05-http-resume",

      plane:
        "HTTP_BEHAVIOR",

      applicability:
        "REQUIRED",

      description:
        "Exactly one official POST /v2/task/resume targets the exact reviewed positive task id, carries no request body, returns HTTP 200, and is never automatically retried.",

      source:
        "IRIS SysAdmin API POST /v2/task/resume",
    }),

    Object.freeze({
      requirementId:
        "t05-configuration-preservation",

      plane:
        "CONFIGURATION_READBACK",

      applicability:
        "REQUIRED",

      description:
        "Authoritative GET /v2/task readback proves the complete persisted task definition is unchanged from the reviewed suspended State A snapshot.",

      source:
        "IRIS SysAdmin API GET /v2/task",
    }),

    Object.freeze({
      requirementId:
        "t05-resumed-native-state-transition",

      plane:
        "TASK_STATE",

      applicability:
        "REQUIRED",

      description:
        "Independent authoritative native task-state evidence proves the exact reviewed task transitions Suspended=true to Suspended=false while identity/cardinality, Task Manager state, and zero-upcoming On Demand scheduling remain stable.",

      source:
        "IRIS native %SYS.Task.Suspended + SysAdmin read surfaces",
    }),

    Object.freeze({
      requirementId:
        "t05-history-observation",

      plane:
        "TASK_HISTORY",

      applicability:
        "OPTIONAL",

      description:
        "Task Manager history is captured as observational evidence only; T05 verification does not depend on a guessed resume-history row shape.",

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
    T05TaskSnapshot,
  summary:
    T05TaskSummary,
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
    T05TaskSnapshot,
  summary:
    T05TaskSummary,
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
      T05_TASK_NAME &&
    summary.name ===
      T05_TASK_NAME &&
    task.taskClass ===
      T05_TASK_CLASS &&
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
      t05TaskDescription(
        generation,
      ) &&
    summary.description ===
      task.description
  );
}

export function t05TaskHistoryMatchesSuspendedStateA(
  history:
    readonly T05TaskHistoryRow[],
  expectedTaskId:
    number,
): boolean {
  if (
    history.length !==
      2 ||
    expectedTaskId <
      1
  ) {
    return false;
  }

  const createRows =
    history.filter(
      (
        row,
      ) =>
        row.taskId ===
          expectedTaskId &&
        row.name ===
          T05_TASK_NAME &&
        row.namespace.toUpperCase() ===
          "%SYS" &&
        row.status ===
          "1" &&
        row.result ===
          `Create ${T05_TASK_NAME}`,
    );

  const suspendRows =
    history.filter(
      (
        row,
      ) =>
        row.taskId ===
          expectedTaskId &&
        row.name ===
          T05_TASK_NAME &&
        row.namespace.toUpperCase() ===
          "%SYS" &&
        row.status ===
          "1" &&
        scalarText(
          row.result,
        ) ===
          "suspended task",
    );

  return (
    createRows.length ===
      1 &&
    suspendRows.length ===
      1
  );
}

export function t05AuthorizedResumeRequestDigest(
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
      "T05 resume request digest requires a positive safe task id.",
    );
  }

  return digestCanonicalJson({
    method:
      "POST",

    path:
      "/v2/task/resume",

    query:
      {
        id:
          taskId,
      },

    automaticRetryAllowed:
      false,
  });
}

export function t05PrestateMatches(
  preflight:
    T05TaskResumePreflight,
): boolean {
  const task =
    preflight.matchingTask;

  const summary =
    preflight.matchingSummary;

  return (
    preflight.schemaVersion ===
      "meridian.task-resume-preflight.v1" &&
    preflight.taskName ===
      T05_TASK_NAME &&
    preflight.expectedFixtureGeneration.trim().length >
      0 &&
    preflight.expectedTaskId >
      0 &&
    preflight.expectedFixtureProjectionDigest ===
      T05_EXPECTED_FIXTURE_PROJECTION_DIGEST &&
    preflight.expectedCreateBodyDigest ===
      T05_EXPECTED_CREATE_BODY_DIGEST &&
    preflight.authorizedResumeRequestDigest ===
      t05AuthorizedResumeRequestDigest(
        preflight.expectedTaskId,
      ) &&
    preflight.authoritativeSuspended ===
      true &&
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
    digestCanonicalJson(
      fixtureProjection(
        task,
        summary,
      ),
    ) ===
      T05_EXPECTED_FIXTURE_PROJECTION_DIGEST &&
    preflight.taskInventoryCount ===
      17 &&
    preflight.matchingUpcomingCount ===
      0 &&
    preflight.matchingHistoryCount ===
      2 &&
    t05TaskHistoryMatchesSuspendedStateA(
      preflight.matchingHistory,
      preflight.expectedTaskId,
    ) &&
    preflight.taskManagerStatus ===
      "Running" &&
    preflight.officialMutationOperation ===
      "POST /v2/task/resume" &&
    preflight.requiredAuthority ===
      "%Admin_Task:U" &&
    preflight.authorityRole ===
      T05_TASK_ROLE &&
    preflight.authorityMode ===
      "EXPLICIT_ESCALATION_ROLE"
  );
}

export function t05PoststateMatches(
  current:
    T05TaskResumePreflight,
  reviewed:
    T05TaskResumePreflight,
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
    t05PrestateMatches(
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
    current.authorizedResumeRequestDigest ===
      reviewed.authorizedResumeRequestDigest &&
    current.authoritativeSuspended ===
      false &&
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
    current.matchingUpcomingCount ===
      reviewed.matchingUpcomingCount &&
    current.matchingUpcomingCount ===
      0 &&
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

export function t05TaskResumeIntent(
  generation:
    string,
  taskId:
    number,
): T05TaskResumeIntent {
  const trimmed =
    generation.trim();

  if (
    trimmed.length ===
      0
  ) {
    throw new Error(
      "T05 fixture generation is required.",
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
      "T05 task id must be a positive safe integer.",
    );
  }

  return Object.freeze({
    actionId:
      "T05_TASK_RESUME" as const,

    taskName:
      T05_TASK_NAME,

    expectedFixtureGeneration:
      trimmed,

    expectedTaskId:
      taskId,
  });
}

function assertIntent(
  intent:
    T05TaskResumeIntent,
): void {
  if (
    intent.actionId !==
      "T05_TASK_RESUME" ||
    intent.taskName !==
      T05_TASK_NAME ||
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
      "T05 intent is outside the frozen shared task-resume boundary.",
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
      T05TaskResumeExecution[
        "resolutionSource"
      ];
  },
): T05TaskResumeExecution {
  return Object.freeze({
    schemaVersion:
      T05_TASK_RESUME_EXECUTION_SCHEMA_VERSION,

    state:
      "APPLIED" as const,

    actionId:
      "T05_TASK_RESUME" as const,

    taskName:
      T05_TASK_NAME,

    generation:
      input.generation,

    taskId:
      input.taskId,

    resumeStatus:
      input.source ===
        "DIRECT_EXECUTION"
        ? 200 as const
        : null,

    httpResumeResponseVerified:
      input.source ===
        "DIRECT_EXECUTION",

    mutationRequestCount:
      1 as const,

    configurationPreserved:
      true as const,

    resumedObserved:
      true as const,

    historyObserved:
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
  T05TaskResumePreflight
> | null {
  if (
    error instanceof
      T05TaskAuthorityDeniedError
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

export function reconcileUnknownT05TaskResume(
  current:
    T05TaskResumePreflight,
  reviewed:
    T05TaskResumePreflight,
): ReconciliationDecision<
  T05TaskResumeExecution
> {
  if (
    t05PoststateMatches(
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
    t05PrestateMatches(
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
        "AUTHORITATIVE_READBACK_MATCHED_EXACT_T05_SUSPENDED_REVIEWED_PRESTATE",
    });
  }

  return Object.freeze({
    outcome:
      "STILL_UNKNOWN" as const,

    reason:
      "AUTHORITATIVE_READBACK_MATCHED_NEITHER_EXACT_T05_SUSPENDED_PRESTATE_NOR_NATIVE_RESUMED_POSTSTATE",
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

export function buildT05TaskResumeProofResults(
  input:
    T05TaskResumeEvidenceInput,
): readonly ProofResult[] {
  const [
    http,
    configuration,
    taskState,
    taskHistory,
  ] =
    T05_TASK_RESUME_PROOF_REQUIREMENTS;

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
      "T05 proof requirement registry is incomplete.",
    );
  }

  return Object.freeze([
    proofResult({
      requirement:
        http,

      passed:
        input.httpResumeVerified,

      observedAtUtc:
        input.observedAtUtc,

      sourceReference:
        input.httpSourceReference,

      observedSummary:
        input.httpResumeVerified
          ? "Exactly one POST /v2/task/resume targeted the reviewed task id with no request body and returned HTTP 200."
          : "The T05 HTTP plane did not prove one exact reviewed-id resume POST with HTTP 200.",
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
          ? "The authoritative task definition remained exactly equal to the reviewed suspended State A task snapshot."
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
          ? "Independent native task-state certification proved Suspended=true to Suspended=false for the exact reviewed task with stable identity, manager state, and zero upcoming execution."
          : "Authoritative native evidence did not prove the reviewed resume transition.",
    }),

    proofResult({
      requirement:
        taskHistory,

      passed:
        input.taskHistoryObserved,

      observedAtUtc:
        input.observedAtUtc,

      sourceReference:
        input.taskHistorySourceReference,

      observedSummary:
        input.taskHistoryObserved
          ? "Task Manager history was captured after resume as observational evidence."
          : "Task Manager history was unavailable or did not meet the observational check; this plane is OPTIONAL for T05.",
    }),
  ]);
}

export function createT05TaskResumeProofContract(
  dependencies:
    T05TaskResumeContractDependencies,
): ProofContract<
  T05TaskResumeIntent,
  T05TaskResumePreflight,
  T05TaskResumeExecution
> {
  const contract:
    ProofContract<
      T05TaskResumeIntent,
      T05TaskResumePreflight,
      T05TaskResumeExecution
    > =
  {
    schemaVersion:
      PROOF_CONTRACT_SCHEMA_VERSION,

    contractId:
      T05_TASK_RESUME_CONTRACT_ID,

    contractVersion:
      1,

    actionType:
      "TASK_RESUME",

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
      T05_TASK_RESUME_PROOF_REQUIREMENTS,

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
          T05_TASK_TARGET_CANONICAL_ID,

        displayName:
          T05_TASK_NAME,

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
        !t05PrestateMatches(
          preflight,
        )
      ) {
        throw new ProofEngineError(
          "STALE_PRECONDITION",
          "T05 preflight requires one exact suspended shared On Demand fixture with frozen T04 management history and zero upcoming execution.",
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
        !t05PrestateMatches(
          preflight,
        )
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "T05 expected delta requires the exact reviewed suspended State A.",
        );
      }

      return Object.freeze({
        summary:
          T05_TASK_RESUME_DELTA_SUMMARY,

        before:
          Object.freeze({
            taskId:
              preflight.expectedTaskId,

            authoritativeSuspended:
              true,

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

            authoritativeSuspended:
              false,

            configurationPreserved:
              true,

            historyProofRequired:
              false,

            upcomingCount:
              0,

            taskInventoryCount:
              preflight.taskInventoryCount,

            taskManagerStatus:
              preflight.taskManagerStatus,

            recoveryActionId:
              "T04_TASK_SUSPEND",

            cleanupActionId:
              "T06_TASK_DELETE_FIXTURE",
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
        !t05PrestateMatches(
          preflight,
        )
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "T05 impact analysis requires the exact reviewed suspended fixture.",
        );
      }

      return Object.freeze({
        certainty:
          "KNOWN" as const,

        summary:
          "T05 changes only the reviewed shared fixture from native Suspended=true to Suspended=false through one POST /v2/task/resume?id=<reviewed-id> with no request body. Persisted task configuration, task identity, manager state, and zero-upcoming On Demand scheduling must remain stable.",

        affectedEntities:
          Object.freeze([
            Object.freeze({
              kind:
                "TASK",

              canonicalId:
                T05_TASK_TARGET_CANONICAL_ID,

              displayName:
                T05_TASK_NAME,

              effect:
                "Exactly one reviewed shared fixture changes from suspended to resumed.",
            }),
          ]),

        limitations:
          Object.freeze([
            "T05 does not authorize arbitrary task ids; the server binds the exact reviewed shared fixture identity.",
            "The SysAdmin /v2/tasks Suspended field is advisory only because R5-D8-R2 proved it can disagree with native %SYS.Task.Suspended on Build 221U.",
            "Task Manager history is captured for observation but is not a REQUIRED T05 proof plane.",
            "T05 does not delete the task; T06 owns fixture deletion only after T05 verification.",
            "T04_TASK_SUSPEND is the explicit reviewed recovery action; automatic rollback is forbidden.",
            "Automatic retry is forbidden after an ambiguous resume dispatch.",
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
          T05TaskResumeIntent,
          T05TaskResumePreflight
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
          !t05PrestateMatches(
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
              "T05 task configuration/state/history changed after review; zero resume POST dispatched.",
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
              "T05 fresh preflight digest differs from the reviewed digest.",
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
          "T05 execute refused because reviewed and fresh preflight digests differ.",
        );
      }

      let resumed:
        Readonly<{
          taskId:
            number;

          status:
            200;

          mutationRequestCount:
            1;
        }>;

      try {
        resumed =
          await dependencies.executeResume(
            ready.intent,
          );
      } catch (
        error
      ) {
        if (
          error instanceof
            T05TaskMutationUnknownAfterDispatchError
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
        resumed.status !==
          200 ||
        resumed.taskId !==
          ready.intent.expectedTaskId ||
        resumed.mutationRequestCount !==
          1
      ) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          "T05 resume response did not prove exact HTTP 200 reviewed task identity with one mutation request. Automatic retry is forbidden.",
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
        !t05PoststateMatches(
          after,
          ready.preflight,
        )
      ) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          "T05 resume returned success but authoritative readback did not prove the exact configuration-preserving native resumed poststate required by the T05 contract. Automatic retry is forbidden.",
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

      return reconcileUnknownT05TaskResume(
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
        !executionResult.resumedObserved ||
        !executionResult.zeroUpcomingPreserved ||
        executionResult.mutationRequestCount !==
          1 ||
        executionResult.taskId <
          1
      ) {
        throw new ProofEngineError(
          "PROOF_INCOMPLETE",
          "T05 execution evidence is incomplete.",
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
          "TASK_SUSPEND",

        automatic:
          false as const,

        summary:
          "T04_TASK_SUSPEND is the explicit reviewed recovery action for the shared fixture. Automatic rollback or automatic suspend is forbidden.",
      });
    },
  };

  return Object.freeze(
    contract,
  );
}

export async function certifyT05TaskResumeAction(
  input: {
    readonly intent:
      T05TaskResumeIntent;

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
    T05TaskResumeCertificationDependencies,
): Promise<
  VerifiedActionCertificationResult<
    T05TaskResumeExecution
  >
> {
  return certifyVerifiedAction(
    {
      contract:
        createT05TaskResumeProofContract(
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
