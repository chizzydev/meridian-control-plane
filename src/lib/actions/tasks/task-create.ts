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
  T01_TASK_NAME,
  T01_TASK_ROLE,
  T01TaskAuthorityDeniedError,
  T01TaskMutationUnknownAfterDispatchError,
  t01TaskDefinition,
  type T01TaskDefinition,
  type T01TaskHistoryRow,
  type T01TaskSnapshot,
} from "../../iris/task-create-action-transport";

export const T01_TASK_CREATE_CONTRACT_ID =
  "meridian.tasks.task-create.v2" as const;

export const T01_TASK_CREATE_EXECUTION_SCHEMA_VERSION =
  "meridian.task-create-execution.v2" as const;

export const T01_TASK_TARGET_CANONICAL_ID =
  "task:meridian-r5-t01-isolated-witness" as const;

export const T01_TASK_CREATE_DELTA_SUMMARY =
  "Create exactly one isolated On Demand IRIS task definition through POST /v2/task under explicit MeridianTaskMetadataReader escalation. Bind the server-assigned task id, prove canonical configuration readback, exactly one new inventory row with no upcoming execution, exactly one create-management history row with zero execution rows, and preserve the task manager state." as const;

export interface T01TaskCreateIntent {
  readonly actionId: "T01_TASK_CREATE";
  readonly taskName: typeof T01_TASK_NAME;
  readonly expectedFixtureGeneration: string;
}

export interface T01TaskCreatePreflight {
  readonly schemaVersion: "meridian.task-create-preflight.v1";
  readonly expectedFixtureGeneration: string;
  readonly taskName: typeof T01_TASK_NAME;
  readonly expectedDefinitionDigest: string;
  readonly matchingTaskIds: readonly number[];
  readonly matchingTaskCount: number;
  readonly matchingTask: T01TaskSnapshot | null;
  readonly taskInventoryCount: number;
  readonly matchingUpcomingCount: number;
  readonly matchingHistoryCount: number;
  readonly matchingHistory: readonly T01TaskHistoryRow[];
  readonly taskManagerStatus: string;
  readonly officialMutationOperation: "POST /v2/task";
  readonly requiredAuthority: "%Admin_Task:U";
  readonly authorityRole: typeof T01_TASK_ROLE;
  readonly authorityMode: "EXPLICIT_ESCALATION_ROLE";
}

export interface T01TaskCreateExecution {
  readonly schemaVersion: typeof T01_TASK_CREATE_EXECUTION_SCHEMA_VERSION;
  readonly state: "APPLIED";
  readonly actionId: "T01_TASK_CREATE";
  readonly taskName: typeof T01_TASK_NAME;
  readonly generation: string;
  readonly taskId: number;
  readonly createStatus: 201 | null;
  readonly httpCreateResponseVerified: boolean;
  readonly mutationRequestCount: 1;
  readonly configurationVerified: true;
  readonly noExecutionObserved: true;
  readonly resolutionSource:
    "DIRECT_EXECUTION" |
    "AUTHORITATIVE_RECONCILIATION_READBACK";
}

export interface T01TaskCreateEvidenceInput {
  readonly observedAtUtc: string;
  readonly httpIdentityVerified: boolean;
  readonly configurationVerified: boolean;
  readonly taskStateVerified: boolean;
  readonly taskHistoryVerified: boolean;
  readonly httpSourceReference: string | null;
  readonly configurationSourceReference: string | null;
  readonly taskStateSourceReference: string | null;
  readonly taskHistorySourceReference: string | null;
}

export interface T01TaskCreateContractDependencies {
  readonly readFreshPreflight:
    (intent: T01TaskCreateIntent) => Promise<T01TaskCreatePreflight>;

  readonly executeCreate:
    (intent: T01TaskCreateIntent) => Promise<Readonly<{
      taskId: number;
      status: 201;
      mutationRequestCount: 1;
    }>>;

  readonly collectProofResults:
    (execution: T01TaskCreateExecution) => Promise<readonly ProofResult[]>;
}

export interface T01TaskCreateCertificationDependencies {
  readonly contract: T01TaskCreateContractDependencies;
  readonly certification:
    VerifiedActionCertificationDependencies<T01TaskCreatePreflight>;
}

export const T01_TASK_CREATE_PROOF_REQUIREMENTS:
  readonly ProofRequirement[] =
  Object.freeze([
    Object.freeze({
      requirementId: "t01-http-create-identity",
      plane: "HTTP_BEHAVIOR",
      applicability: "REQUIRED",
      description:
        "Exactly one official POST /v2/task returns HTTP 201 and yields one stable positive server task id from the creation response/Location identity.",
      source: "IRIS SysAdmin API POST /v2/task",
    }),
    Object.freeze({
      requirementId: "t01-task-definition-readback",
      plane: "CONFIGURATION_READBACK",
      applicability: "REQUIRED",
      description:
        "GET /v2/task for the created id reproduces the reviewed isolated On Demand definition, including the generation-bound description canonicalized to the observed IRIS 100-character persistence limit, task class, namespace, run-as principal, priority, schedule mode, and no-output/no-email safety fields.",
      source: "IRIS SysAdmin API GET /v2/task",
    }),
    Object.freeze({
      requirementId: "t01-task-state",
      plane: "TASK_STATE",
      applicability: "REQUIRED",
      description:
        "The authoritative task inventory gains exactly one row with the created id and exact witness name, the task manager status remains unchanged, and the task is absent from upcoming execution state.",
      source: "IRIS SysAdmin API GET /v2/tasks + GET /v2/task/manager + GET /v2/task/upcoming",
    }),
    Object.freeze({
      requirementId: "t01-task-history-create-only",
      plane: "TASK_HISTORY",
      applicability: "REQUIRED",
      description:
        "The new task id has exactly one task-history row representing the Create management event and zero execution rows, proving T01 did not run the task or silently include run-now behavior.",
      source: "IRIS SysAdmin API GET /v2/task/history",
    }),
  ]);

function normalizedDate(value: string): string | null {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = Date.parse(trimmed);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return new Date(parsed).toISOString().slice(0, 10);
}

function stringsEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function scalarText(value: string): string {
  return value.trim().toLowerCase();
}

export function t01TaskHistoryMatchesCreateOnly(
  history: readonly T01TaskHistoryRow[],
  expectedTaskId: number,
): boolean {
  if (
    history.length !== 1 ||
    !Number.isInteger(expectedTaskId) ||
    expectedTaskId < 1
  ) {
    return false;
  }

  const row = history[0];

  if (row === undefined) {
    return false;
  }

  return (
    row.taskId === expectedTaskId &&
    row.name === T01_TASK_NAME &&
    row.namespace.toUpperCase() === "%SYS" &&
    row.status === "1" &&
    row.result === `Create ${T01_TASK_NAME}`
  );
}

export function t01TaskSnapshotMatchesDefinition(
  snapshot: T01TaskSnapshot,
  definition: T01TaskDefinition,
): boolean {
  const timePeriod = scalarText(snapshot.timePeriod);
  const dailyFrequency = scalarText(snapshot.dailyFrequency);
  const dailyFrequencyTime = scalarText(snapshot.dailyFrequencyTime);
  const mirrorStatus = scalarText(snapshot.mirrorStatus);

  return (
    snapshot.id > 0 &&
    snapshot.name === definition.Name &&
    snapshot.runAsUser === definition.RunAsUser &&
    stringsEqual(snapshot.emailOnCompletion, definition.EmailOnCompletion) &&
    stringsEqual(snapshot.emailOnError, definition.EmailOnError) &&
    stringsEqual(snapshot.emailOnExpiration, definition.EmailOnExpiration) &&
    snapshot.emailOutput === definition.EmailOutput &&
    snapshot.expires === definition.Expires &&
    snapshot.expiresDays === definition.ExpiresDays &&
    snapshot.expiresHours === definition.ExpiresHours &&
    snapshot.expiresMinutes === definition.ExpiresMinutes &&
    snapshot.openOutputFile === definition.OpenOutputFile &&
    snapshot.outputDirectory === definition.OutputDirectory &&
    snapshot.outputFilename === definition.OutputFilename &&
    snapshot.outputFileIsBinary === definition.OutputFileIsBinary &&
    snapshot.suspendOnError === definition.SuspendOnError &&
    snapshot.suspendTerminated === definition.SuspendTerminated &&
    scalarText(snapshot.priority) === scalarText(definition.Priority) &&
    snapshot.taskClass === definition.TaskClass &&
    snapshot.isBatch === definition.IsBatch &&
    snapshot.namespace.toUpperCase() === definition.NameSpace.toUpperCase() &&
    (timePeriod === "on demand" || timePeriod === "5") &&
    snapshot.timePeriodEvery === definition.TimePeriodEvery &&
    snapshot.timePeriodDay === definition.TimePeriodDay &&
    (dailyFrequency === "once" || dailyFrequency === "0") &&
    (
      dailyFrequencyTime === scalarText(definition.DailyFrequencyTime) ||
      dailyFrequencyTime === "" ||
      dailyFrequencyTime === "0"
    ) &&
    snapshot.dailyIncrement === definition.DailyIncrement &&
    (
      snapshot.dailyStartTime === definition.DailyStartTime ||
      snapshot.dailyStartTime === ""
    ) &&
    (
      snapshot.dailyEndTime === definition.DailyEndTime ||
      snapshot.dailyEndTime === ""
    ) &&
    snapshot.runAfterGuid === definition.RunAfterGUID &&
    normalizedDate(snapshot.startDate) === definition.StartDate &&
    normalizedDate(snapshot.endDate) === definition.EndDate &&
    (mirrorStatus === "primary" || mirrorStatus === "1") &&
    snapshot.rescheduleOnStart === definition.RescheduleOnStart &&
    snapshot.description === definition.Description
  );
}

export function t01PrestateMatches(
  preflight: T01TaskCreatePreflight,
): boolean {
  const expected = t01TaskDefinition(preflight.expectedFixtureGeneration);

  return (
    preflight.schemaVersion === "meridian.task-create-preflight.v1" &&
    preflight.taskName === T01_TASK_NAME &&
    preflight.expectedFixtureGeneration.trim().length > 0 &&
    preflight.expectedDefinitionDigest === digestCanonicalJson(expected) &&
    preflight.matchingTaskIds.length === 0 &&
    preflight.matchingTaskCount === 0 &&
    preflight.matchingTask === null &&
    preflight.matchingUpcomingCount === 0 &&
    preflight.matchingHistoryCount === 0 &&
    preflight.matchingHistory.length === 0 &&
    preflight.taskInventoryCount >= 0 &&
    preflight.taskManagerStatus.trim().length > 0 &&
    preflight.officialMutationOperation === "POST /v2/task" &&
    preflight.requiredAuthority === "%Admin_Task:U" &&
    preflight.authorityRole === T01_TASK_ROLE &&
    preflight.authorityMode === "EXPLICIT_ESCALATION_ROLE"
  );
}

export function t01PoststateMatches(
  current: T01TaskCreatePreflight,
  reviewed: T01TaskCreatePreflight,
  expectedTaskId?: number,
): boolean {
  const task = current.matchingTask;
  const expected = t01TaskDefinition(reviewed.expectedFixtureGeneration);

  return (
    reviewed.matchingTaskCount === 0 &&
    current.expectedFixtureGeneration === reviewed.expectedFixtureGeneration &&
    current.expectedDefinitionDigest === reviewed.expectedDefinitionDigest &&
    current.matchingTaskCount === 1 &&
    current.matchingTaskIds.length === 1 &&
    task !== null &&
    current.matchingTaskIds[0] === task.id &&
    (expectedTaskId === undefined || task.id === expectedTaskId) &&
    t01TaskSnapshotMatchesDefinition(task, expected) &&
    current.taskInventoryCount === reviewed.taskInventoryCount + 1 &&
    current.matchingUpcomingCount === 0 &&
    current.matchingHistoryCount === 1 &&
    t01TaskHistoryMatchesCreateOnly(
      current.matchingHistory,
      task.id,
    ) &&
    current.taskManagerStatus === reviewed.taskManagerStatus
  );
}

export function t01TaskCreateIntent(
  generation: string,
): T01TaskCreateIntent {
  const trimmed = generation.trim();

  if (trimmed.length === 0) {
    throw new Error("T01 fixture generation is required.");
  }

  return Object.freeze({
    actionId: "T01_TASK_CREATE" as const,
    taskName: T01_TASK_NAME,
    expectedFixtureGeneration: trimmed,
  });
}

function assertIntent(intent: T01TaskCreateIntent): void {
  if (
    intent.actionId !== "T01_TASK_CREATE" ||
    intent.taskName !== T01_TASK_NAME ||
    intent.expectedFixtureGeneration.trim().length === 0
  ) {
    throw new ProofEngineError(
      "INVALID_TARGET",
      "T01 intent is outside the frozen isolated task-create boundary.",
    );
  }
}

function execution(
  input: {
    readonly generation: string;
    readonly taskId: number;
    readonly source: T01TaskCreateExecution["resolutionSource"];
  },
): T01TaskCreateExecution {
  return Object.freeze({
    schemaVersion: T01_TASK_CREATE_EXECUTION_SCHEMA_VERSION,
    state: "APPLIED" as const,
    actionId: "T01_TASK_CREATE" as const,
    taskName: T01_TASK_NAME,
    generation: input.generation,
    taskId: input.taskId,
    createStatus: input.source === "DIRECT_EXECUTION" ? 201 as const : null,
    httpCreateResponseVerified: input.source === "DIRECT_EXECUTION",
    mutationRequestCount: 1 as const,
    configurationVerified: true as const,
    noExecutionObserved: true as const,
    resolutionSource: input.source,
  });
}

function mapAuthorityDenied(
  error: unknown,
): RevalidationDecision<T01TaskCreatePreflight> | null {
  if (error instanceof T01TaskAuthorityDeniedError) {
    return Object.freeze({
      outcome: "DENIED" as const,
      freshPreflight: null,
      freshDigest: null,
      reason: error.message,
    });
  }

  return null;
}

export function reconcileUnknownT01TaskCreate(
  current: T01TaskCreatePreflight,
  reviewed: T01TaskCreatePreflight,
): ReconciliationDecision<T01TaskCreateExecution> {
  if (t01PoststateMatches(current, reviewed)) {
    const task = current.matchingTask;

    if (task === null) {
      throw new Error("T01 reconciled task disappeared unexpectedly.");
    }

    return Object.freeze({
      outcome: "APPLIED" as const,
      execution: execution({
        generation: current.expectedFixtureGeneration,
        taskId: task.id,
        source: "AUTHORITATIVE_RECONCILIATION_READBACK",
      }),
    });
  }

  if (
    t01PrestateMatches(current) &&
    digestCanonicalJson(current) === digestCanonicalJson(reviewed)
  ) {
    return Object.freeze({
      outcome: "NOT_APPLIED" as const,
      reason: "AUTHORITATIVE_READBACK_MATCHED_EXACT_T01_REVIEWED_ABSENCE_PRESTATE",
    });
  }

  return Object.freeze({
    outcome: "STILL_UNKNOWN" as const,
    reason: "AUTHORITATIVE_READBACK_MATCHED_NEITHER_EXACT_T01_ABSENCE_NOR_ONE_EXACT_GENERATION_BOUND_TASK_POSTSTATE",
  });
}

function proofResult(input: {
  readonly requirement: ProofRequirement;
  readonly passed: boolean;
  readonly observedAtUtc: string;
  readonly sourceReference: string | null;
  readonly observedSummary: string;
}): ProofResult {
  return Object.freeze({
    requirementId: input.requirement.requirementId,
    plane: input.requirement.plane,
    applicability: input.requirement.applicability,
    status: input.passed ? "PASS" : "FAIL",
    sourceType: input.requirement.source,
    sourceReference: input.sourceReference,
    observedAtUtc: input.observedAtUtc,
    expectedSummary: input.requirement.description,
    observedSummary: input.observedSummary,
    provenance: "AUTHORITATIVE_IRIS" as const,
    safeEvidenceDigest: null,
  });
}

export function buildT01TaskCreateProofResults(
  input: T01TaskCreateEvidenceInput,
): readonly ProofResult[] {
  const [
    httpIdentity,
    configuration,
    taskState,
    taskHistory,
  ] = T01_TASK_CREATE_PROOF_REQUIREMENTS;

  if (
    httpIdentity === undefined ||
    configuration === undefined ||
    taskState === undefined ||
    taskHistory === undefined
  ) {
    throw new Error("T01 proof requirement registry is incomplete.");
  }

  return Object.freeze([
    proofResult({
      requirement: httpIdentity,
      passed: input.httpIdentityVerified,
      observedAtUtc: input.observedAtUtc,
      sourceReference: input.httpSourceReference,
      observedSummary: input.httpIdentityVerified
        ? "Exactly one POST /v2/task returned HTTP 201 and yielded one stable positive task id."
        : "The task-create HTTP response did not prove one stable server identity.",
    }),
    proofResult({
      requirement: configuration,
      passed: input.configurationVerified,
      observedAtUtc: input.observedAtUtc,
      sourceReference: input.configurationSourceReference,
      observedSummary: input.configurationVerified
        ? "Authoritative task detail readback matches the reviewed generation-bound On Demand task definition after deterministic 100-character Description canonicalization."
        : "Task detail readback does not match the reviewed canonical definition.",
    }),
    proofResult({
      requirement: taskState,
      passed: input.taskStateVerified,
      observedAtUtc: input.observedAtUtc,
      sourceReference: input.taskStateSourceReference,
      observedSummary: input.taskStateVerified
        ? "Task inventory gained exactly one witness id, manager status remained stable, and no upcoming execution exists."
        : "Task inventory/manager/upcoming state did not prove isolated creation without scheduling.",
    }),
    proofResult({
      requirement: taskHistory,
      passed: input.taskHistoryVerified,
      observedAtUtc: input.observedAtUtc,
      sourceReference: input.taskHistorySourceReference,
      observedSummary: input.taskHistoryVerified
        ? "The created task id has exactly one Create management-history row and zero task-execution rows."
        : "Task history does not prove one Create management row with zero execution rows.",
    }),
  ]);
}

export function createT01TaskCreateProofContract(
  dependencies: T01TaskCreateContractDependencies,
): ProofContract<
  T01TaskCreateIntent,
  T01TaskCreatePreflight,
  T01TaskCreateExecution
> {
  const contract: ProofContract<
    T01TaskCreateIntent,
    T01TaskCreatePreflight,
    T01TaskCreateExecution
  > = {
    schemaVersion: PROOF_CONTRACT_SCHEMA_VERSION,
    contractId: T01_TASK_CREATE_CONTRACT_ID,
    contractVersion: 2,
    actionType: "TASK_CREATE",
    domain: "TASKS",
    risk: "MEDIUM",
    reversibility: "REVERSIBLE",
    requiredAuthority: Object.freeze([
      Object.freeze({
        resource: "%Admin_Task",
        permission: "U",
        standing: false,
        escalationOnly: true,
      }),
    ]),
    proofRequirements: T01_TASK_CREATE_PROOF_REQUIREMENTS,

    target(intent) {
      assertIntent(intent);

      return Object.freeze({
        kind: "TASK",
        canonicalId: T01_TASK_TARGET_CANONICAL_ID,
        displayName: T01_TASK_NAME,
        fixtureId: "meridian-r5-t01-task-fixture",
        generation: intent.expectedFixtureGeneration,
      });
    },

    async preflight(context, intent) {
      void context;
      assertIntent(intent);

      const preflight = await dependencies.readFreshPreflight(intent);

      if (
        preflight.expectedFixtureGeneration !== intent.expectedFixtureGeneration ||
        !t01PrestateMatches(preflight)
      ) {
        throw new ProofEngineError(
          "SAFETY_BLOCKED",
          "T01 requires exact witness-name absence, zero matching upcoming/history state, a stable task manager status, and explicit MeridianTaskMetadataReader escalation before POST.",
        );
      }

      return preflight;
    },

    expectedDelta(intent, preflight) {
      assertIntent(intent);

      if (!t01PrestateMatches(preflight)) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "T01 expected delta requires the exact reviewed task-absence prestate.",
        );
      }

      return Object.freeze({
        summary: T01_TASK_CREATE_DELTA_SUMMARY,
        before: Object.freeze({
          matchingTaskCount: 0,
          taskInventoryCount: preflight.taskInventoryCount,
          matchingUpcomingCount: 0,
          matchingHistoryCount: 0,
          taskManagerStatus: preflight.taskManagerStatus,
        }),
        after: Object.freeze({
          matchingTaskCount: 1,
          taskInventoryCount: preflight.taskInventoryCount + 1,
          matchingUpcomingCount: 0,
          matchingHistoryCount: 1,
          taskHistorySemantics: "CREATE_MANAGEMENT_ROW_ONLY",
          executionHistoryCount: 0,
          taskManagerStatus: preflight.taskManagerStatus,
          timePeriod: "On Demand",
          taskClass: "%SYS.Task.SwitchJournal",
        }),
      });
    },

    async analyzeImpact(context, intent, preflight) {
      void context;
      assertIntent(intent);

      if (!t01PrestateMatches(preflight)) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "T01 impact analysis requires the exact task-absence prestate.",
        );
      }

      return Object.freeze({
        certainty: "KNOWN" as const,
        summary:
          "T01 adds one isolated task definition only. It is On Demand, uses a far-future schedule envelope, produces no output or email, and is never run by T01. The mutation uses explicit MeridianTaskMetadataReader escalation rather than broadening standing runtime authority.",
        affectedEntities: Object.freeze([
          Object.freeze({
            kind: "TASK",
            canonicalId: T01_TASK_TARGET_CANONICAL_ID,
            displayName: T01_TASK_NAME,
            effect: "One generation-bound On Demand task definition is created; no run, suspend, resume, manager mutation, or unrelated task mutation is authorized.",
          }),
        ]),
        limitations: Object.freeze([
          "T01 certifies creation only; run-now behavior belongs to T03.",
          "The witness task is deleted only after verified receipt closure as fixture cleanup; that cleanup is not T06 certification.",
          "Automatic retry is forbidden after an ambiguous POST dispatch.",
          "No native task-change audit plane is claimed; proof uses authoritative task HTTP/state/history surfaces exposed by IRIS.",
        ]),
      });
    },

    digestPreflight(preflight) {
      return digestCanonicalJson(preflight);
    },

    async revalidate(
      context: ActionContext,
      reviewed: ReviewedAction<T01TaskCreateIntent, T01TaskCreatePreflight>,
    ) {
      void context;
      assertIntent(reviewed.intent);

      try {
        const fresh = await dependencies.readFreshPreflight(reviewed.intent);
        const freshDigest = digestCanonicalJson(fresh);

        if (
          fresh.expectedFixtureGeneration !== reviewed.intent.expectedFixtureGeneration ||
          !t01PrestateMatches(fresh)
        ) {
          return Object.freeze({
            outcome: "STALE" as const,
            freshPreflight: fresh,
            freshDigest,
            reason:
              "T01 task inventory, manager state, witness-name absence, authority, or fixture generation changed after review; zero business POST dispatched.",
          });
        }

        if (freshDigest !== reviewed.reviewedPreflightDigest) {
          return Object.freeze({
            outcome: "STALE" as const,
            freshPreflight: fresh,
            freshDigest,
            reason: "T01 fresh preflight digest differs from the reviewed digest.",
          });
        }

        return Object.freeze({
          outcome: "MATCH" as const,
          freshPreflight: fresh,
          freshDigest,
        });
      } catch (error) {
        const denied = mapAuthorityDenied(error);

        if (denied !== null) {
          return denied;
        }

        throw error;
      }
    },

    async execute(context, ready) {
      void context;
      assertIntent(ready.intent);

      if (ready.reviewedPreflightDigest !== ready.freshRevalidationDigest) {
        throw new ProofEngineError(
          "STALE_PRECONDITION",
          "T01 execute refused because reviewed and fresh preflight digests differ.",
        );
      }

      let created: Readonly<{
        taskId: number;
        status: 201;
        mutationRequestCount: 1;
      }>;

      try {
        created = await dependencies.executeCreate(ready.intent);
      } catch (error) {
        if (error instanceof T01TaskMutationUnknownAfterDispatchError) {
          throw new ProofEngineError(
            "UNKNOWN_AFTER_DISPATCH",
            error.message,
            {automaticRetry: false},
          );
        }

        throw error;
      }

      if (
        created.status !== 201 ||
        created.taskId < 1 ||
        created.mutationRequestCount !== 1
      ) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          "T01 create response did not provide an exact HTTP 201 stable task identity. Automatic retry is forbidden.",
          {automaticRetry: false},
        );
      }

      const after = await dependencies.readFreshPreflight(ready.intent);

      if (!t01PoststateMatches(after, ready.preflight, created.taskId)) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          "T01 POST returned success but authoritative task detail/state/history did not match the reviewed isolated create delta. Automatic retry is forbidden.",
          {automaticRetry: false},
        );
      }

      return execution({
        generation: ready.intent.expectedFixtureGeneration,
        taskId: created.taskId,
        source: "DIRECT_EXECUTION",
      });
    },

    async reconcileUnknown(context, reviewed) {
      void context;
      assertIntent(reviewed.intent);

      return reconcileUnknownT01TaskCreate(
        await dependencies.readFreshPreflight(reviewed.intent),
        reviewed.preflight,
      );
    },

    async verify(context, executionResult) {
      void context;

      if (
        !executionResult.configurationVerified ||
        !executionResult.noExecutionObserved ||
        executionResult.mutationRequestCount !== 1 ||
        executionResult.taskId < 1
      ) {
        throw new ProofEngineError(
          "PROOF_INCOMPLETE",
          "T01 execution evidence is incomplete.",
        );
      }

      return dependencies.collectProofResults(executionResult);
    },

    buildRecoveryPlan(executionResult, results) {
      void executionResult;
      void results;

      return Object.freeze({
        recoveryActionType: "TASK_DELETE",
        automatic: false as const,
        summary:
          "Use the separately certified T06 TASK_DELETE proof contract for product recovery; synthetic T01 fixture cleanup is permitted only after receipt closure or pre-dispatch failure.",
      });
    },
  };

  return Object.freeze(contract);
}

export async function certifyT01TaskCreateAction(
  input: {
    readonly intent: T01TaskCreateIntent;
    readonly actionId: string;
    readonly receiptId: string;
    readonly logicalActor: string;
    readonly irisRuntimeUser: string;
  },
  dependencies: T01TaskCreateCertificationDependencies,
): Promise<VerifiedActionCertificationResult<T01TaskCreateExecution>> {
  return certifyVerifiedAction(
    {
      contract: createT01TaskCreateProofContract(dependencies.contract),
      intent: input.intent,
      actionId: input.actionId,
      receiptId: input.receiptId,
      parentChangeSetId: null,
      logicalActor: input.logicalActor,
      irisRuntimeUser: input.irisRuntimeUser,
    },
    dependencies.certification,
  );
}
