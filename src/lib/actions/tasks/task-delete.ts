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
  T06_TASK_CLASS,
  T06_TASK_NAME,
  T06_TASK_ROLE,
  T06TaskAuthorityDeniedError,
  T06TaskMutationUnknownAfterDispatchError,
  t06TaskDescription,
  type T06TaskHistoryRow,
  type T06TaskSnapshot,
  type T06TaskSummary,
} from "../../iris/task-delete-action-transport";

export const T06_TASK_DELETE_CONTRACT_ID =
  "meridian.tasks.task-delete.v1" as const;

export const T06_TASK_DELETE_EXECUTION_SCHEMA_VERSION =
  "meridian.task-delete-execution.v1" as const;

export const T06_TASK_TARGET_CANONICAL_ID =
  "task:meridianlab-orderexporter" as const;

export const T06_TASK_DELETE_ACTION_ID =
  "T06_TASK_DELETE" as const;

export const T06_TASK_DELETE_LEGACY_CLEANUP_ALIAS =
  "T06_TASK_DELETE_FIXTURE" as const;

export const T06_EXPECTED_FIXTURE_PROJECTION_DIGEST =
  "CF2301CD71109BA5AF328A80F17CBD460BD602BE34A3D61B6101425684D6408A" as const;

export const T06_TASK_DELETE_DELTA_SUMMARY =
  "Delete exactly the reviewed shared MeridianLab.OrderExporter fixture through one bodyless DELETE /v2/task?id=<reviewed-id>. T05 verification and native resumed State A are required before dispatch. Closure requires authoritative task absence plus durable generic receipt persistence. Automatic retry and automatic recovery are forbidden because deletion is irreversible." as const;

export interface T06TaskDeleteIntent {
  readonly actionId:
    typeof T06_TASK_DELETE_ACTION_ID;

  readonly taskName:
    typeof T06_TASK_NAME;

  readonly expectedFixtureGeneration:
    string;

  readonly expectedTaskId:
    number;
}

export interface T06TaskDeletePreflight {
  readonly schemaVersion:
    "meridian.task-delete-preflight.v1";

  readonly expectedFixtureGeneration:
    string;

  readonly taskName:
    typeof T06_TASK_NAME;

  readonly expectedTaskId:
    number;

  readonly expectedFixtureProjectionDigest:
    typeof T06_EXPECTED_FIXTURE_PROJECTION_DIGEST;

  readonly authorizedDeleteRequestDigest:
    string;

  readonly predecessorT05ReceiptVerified:
    boolean;

  readonly authoritativeExists:
    boolean;

  readonly authoritativeSuspended:
    boolean | null;

  readonly matchingTaskCount:
    number;

  readonly matchingTask:
    T06TaskSnapshot | null;

  readonly matchingSummary:
    T06TaskSummary | null;

  readonly taskInventoryCount:
    number;

  readonly matchingUpcomingCount:
    number;

  readonly matchingHistoryCount:
    number;

  readonly matchingHistory:
    readonly T06TaskHistoryRow[];

  readonly taskManagerStatus:
    string;

  readonly officialMutationOperation:
    "DELETE /v2/task";

  readonly requiredAuthority:
    "%Admin_Task:U";

  readonly authorityRole:
    typeof T06_TASK_ROLE;

  readonly authorityMode:
    "EXPLICIT_ESCALATION_ROLE";
}

export interface T06TaskDeleteExecution {
  readonly schemaVersion:
    typeof T06_TASK_DELETE_EXECUTION_SCHEMA_VERSION;

  readonly state:
    "APPLIED";

  readonly actionId:
    typeof T06_TASK_DELETE_ACTION_ID;

  readonly taskName:
    typeof T06_TASK_NAME;

  readonly generation:
    string;

  readonly taskId:
    number;

  readonly deleteStatus:
    200 | null;

  readonly httpDeleteResponseVerified:
    boolean;

  readonly mutationRequestCount:
    1;

  readonly taskAbsenceObserved:
    true;

  readonly zeroUpcomingPreserved:
    true;

  readonly resolutionSource:
    "DIRECT_EXECUTION" |
    "AUTHORITATIVE_RECONCILIATION_READBACK";
}

export interface T06TaskDeleteEvidenceInput {
  readonly observedAtUtc:
    string;

  readonly httpDeleteVerified:
    boolean;

  readonly taskAbsenceVerified:
    boolean;

  readonly httpSourceReference:
    string | null;

  readonly taskStateSourceReference:
    string | null;
}

export interface T06TaskDeleteContractDependencies {
  readonly readFreshPreflight:
    (
      intent:
        T06TaskDeleteIntent,
    ) =>
      Promise<
        T06TaskDeletePreflight
      >;

  readonly executeDelete:
    (
      intent:
        T06TaskDeleteIntent,
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
        T06TaskDeleteExecution,
    ) =>
      Promise<
        readonly ProofResult[]
      >;
}

export interface T06TaskDeleteCertificationDependencies {
  readonly contract:
    T06TaskDeleteContractDependencies;

  readonly certification:
    VerifiedActionCertificationDependencies<
      T06TaskDeletePreflight
    >;
}

export const T06_TASK_DELETE_PROOF_REQUIREMENTS:
  readonly ProofRequirement[] =
  Object.freeze([
    Object.freeze({
      requirementId:
        "t06-http-delete",

      plane:
        "HTTP_BEHAVIOR",

      applicability:
        "REQUIRED",

      description:
        "Exactly one official bodyless DELETE /v2/task targets the exact reviewed positive task id, returns HTTP 200, and is never automatically retried.",

      source:
        "IRIS SysAdmin API DELETE /v2/task",
    }),

    Object.freeze({
      requirementId:
        "t06-authoritative-task-absence",

      plane:
        "TASK_STATE",

      applicability:
        "REQUIRED",

      description:
        "Fresh authoritative native and SysAdmin task-state evidence proves the exact reviewed fixture is absent after deletion while the task class, escalation role, Task Manager service, and zero-upcoming boundary remain preserved.",

      source:
        "IRIS native %SYS.Task + SysAdmin task read surfaces",
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
    T06TaskSnapshot,
  summary:
    T06TaskSummary,
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
    T06TaskSnapshot,
  summary:
    T06TaskSummary,
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
      T06_TASK_NAME &&
    summary.name ===
      T06_TASK_NAME &&
    task.taskClass ===
      T06_TASK_CLASS &&
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
      t06TaskDescription(
        generation,
      ) &&
    summary.description ===
      task.description
  );
}

export function t06AuthorizedDeleteRequestDigest(
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
      "T06 delete request digest requires a positive safe integer.",
    );
  }

  return digestCanonicalJson({
    method:
      "DELETE",

    path:
      "/v2/task",

    query:
      {
        id:
          taskId,
      },

    automaticRetryAllowed:
      false,
  });
}

export function t06PrestateMatches(
  preflight:
    T06TaskDeletePreflight,
): boolean {
  const task =
    preflight.matchingTask;

  const summary =
    preflight.matchingSummary;

  return (
    preflight.schemaVersion ===
      "meridian.task-delete-preflight.v1" &&
    preflight.taskName ===
      T06_TASK_NAME &&
    preflight.expectedFixtureGeneration.trim().length >
      0 &&
    preflight.expectedTaskId >
      0 &&
    preflight.expectedFixtureProjectionDigest ===
      T06_EXPECTED_FIXTURE_PROJECTION_DIGEST &&
    preflight.authorizedDeleteRequestDigest ===
      t06AuthorizedDeleteRequestDigest(
        preflight.expectedTaskId,
      ) &&
    preflight.predecessorT05ReceiptVerified ===
      true &&
    preflight.authoritativeExists ===
      true &&
    preflight.authoritativeSuspended ===
      false &&
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
      T06_EXPECTED_FIXTURE_PROJECTION_DIGEST &&
    preflight.taskInventoryCount ===
      17 &&
    preflight.matchingUpcomingCount ===
      0 &&
    preflight.matchingHistoryCount >=
      0 &&
    preflight.taskManagerStatus ===
      "Running" &&
    preflight.officialMutationOperation ===
      "DELETE /v2/task" &&
    preflight.requiredAuthority ===
      "%Admin_Task:U" &&
    preflight.authorityRole ===
      T06_TASK_ROLE &&
    preflight.authorityMode ===
      "EXPLICIT_ESCALATION_ROLE"
  );
}

export function t06PoststateMatches(
  current:
    T06TaskDeletePreflight,
  reviewed:
    T06TaskDeletePreflight,
): boolean {
  return (
    t06PrestateMatches(
      reviewed,
    ) &&
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
    current.authorizedDeleteRequestDigest ===
      reviewed.authorizedDeleteRequestDigest &&
    current.predecessorT05ReceiptVerified ===
      true &&
    current.authoritativeExists ===
      false &&
    current.authoritativeSuspended ===
      null &&
    current.matchingTaskCount ===
      0 &&
    current.matchingTask ===
      null &&
    current.matchingSummary ===
      null &&
    current.taskInventoryCount ===
      reviewed.taskInventoryCount -
        1 &&
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

export function t06TaskDeleteIntent(
  generation:
    string,
  taskId:
    number,
): T06TaskDeleteIntent {
  const trimmed =
    generation.trim();

  if (
    trimmed.length ===
      0
  ) {
    throw new Error(
      "T06 fixture generation is required.",
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
      "T06 task id must be a positive safe integer.",
    );
  }

  return Object.freeze({
    actionId:
      T06_TASK_DELETE_ACTION_ID,

    taskName:
      T06_TASK_NAME,

    expectedFixtureGeneration:
      trimmed,

    expectedTaskId:
      taskId,
  });
}

function assertIntent(
  intent:
    T06TaskDeleteIntent,
): void {
  if (
    intent.actionId !==
      T06_TASK_DELETE_ACTION_ID ||
    intent.taskName !==
      T06_TASK_NAME ||
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
      "T06 intent is outside the frozen shared task-delete boundary.",
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
      T06TaskDeleteExecution[
        "resolutionSource"
      ];
  },
): T06TaskDeleteExecution {
  return Object.freeze({
    schemaVersion:
      T06_TASK_DELETE_EXECUTION_SCHEMA_VERSION,

    state:
      "APPLIED" as const,

    actionId:
      T06_TASK_DELETE_ACTION_ID,

    taskName:
      T06_TASK_NAME,

    generation:
      input.generation,

    taskId:
      input.taskId,

    deleteStatus:
      input.source ===
        "DIRECT_EXECUTION"
        ? 200 as const
        : null,

    httpDeleteResponseVerified:
      input.source ===
        "DIRECT_EXECUTION",

    mutationRequestCount:
      1 as const,

    taskAbsenceObserved:
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
  T06TaskDeletePreflight
> | null {
  if (
    error instanceof
      T06TaskAuthorityDeniedError
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

export function reconcileUnknownT06TaskDelete(
  current:
    T06TaskDeletePreflight,
  reviewed:
    T06TaskDeletePreflight,
): ReconciliationDecision<
  T06TaskDeleteExecution
> {
  if (
    t06PoststateMatches(
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
    t06PrestateMatches(
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
        "AUTHORITATIVE_READBACK_MATCHED_EXACT_T06_RESUMED_REVIEWED_PRESTATE",
    });
  }

  return Object.freeze({
    outcome:
      "STILL_UNKNOWN" as const,

    reason:
      "AUTHORITATIVE_READBACK_MATCHED_NEITHER_EXACT_T06_RESUMED_PRESTATE_NOR_COMPLETE_TASK_ABSENCE",
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

export function buildT06TaskDeleteProofResults(
  input:
    T06TaskDeleteEvidenceInput,
): readonly ProofResult[] {
  const [
    httpDelete,
    taskState,
  ] =
    T06_TASK_DELETE_PROOF_REQUIREMENTS;

  if (
    httpDelete ===
      undefined ||
    taskState ===
      undefined
  ) {
    throw new Error(
      "T06 proof requirement registry is incomplete.",
    );
  }

  return Object.freeze([
    proofResult({
      requirement:
        httpDelete,

      passed:
        input.httpDeleteVerified,

      observedAtUtc:
        input.observedAtUtc,

      sourceReference:
        input.httpSourceReference,

      observedSummary:
        input.httpDeleteVerified
          ? "Exactly one bodyless DELETE /v2/task returned HTTP 200 for the reviewed task id."
          : "The exact reviewed HTTP 200 delete behavior was not proven.",
    }),

    proofResult({
      requirement:
        taskState,

      passed:
        input.taskAbsenceVerified,

      observedAtUtc:
        input.observedAtUtc,

      sourceReference:
        input.taskStateSourceReference,

      observedSummary:
        input.taskAbsenceVerified
          ? "Authoritative readback proved the reviewed fixture task absent while the surrounding task boundary remained preserved."
          : "Authoritative fixture absence was not proven.",
    }),
  ]);
}

export function createT06TaskDeleteProofContract(
  dependencies:
    T06TaskDeleteContractDependencies,
): ProofContract<
  T06TaskDeleteIntent,
  T06TaskDeletePreflight,
  T06TaskDeleteExecution
> {
  const contract:
    ProofContract<
      T06TaskDeleteIntent,
      T06TaskDeletePreflight,
      T06TaskDeleteExecution
    > = {
    schemaVersion:
      PROOF_CONTRACT_SCHEMA_VERSION,

    contractId:
      T06_TASK_DELETE_CONTRACT_ID,

    contractVersion:
      1,

    actionType:
      "TASK_DELETE",

    domain:
      "TASKS",

    risk:
      "HIGH",

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
      T06_TASK_DELETE_PROOF_REQUIREMENTS,

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
          T06_TASK_TARGET_CANONICAL_ID,

        displayName:
          T06_TASK_NAME,

        fixtureId:
          T06_TASK_NAME,

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
        !t06PrestateMatches(
          preflight,
        )
      ) {
        throw new ProofEngineError(
          "SAFETY_BLOCKED",
          "T06 requires the exact verified T05 resumed fixture prestate before deletion.",
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
        !t06PrestateMatches(
          preflight,
        )
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "T06 expected delta requires exact verified resumed State A.",
        );
      }

      return Object.freeze({
        summary:
          T06_TASK_DELETE_DELTA_SUMMARY,

        before:
          Object.freeze({
            taskExists:
              true,

            taskId:
              preflight.expectedTaskId,

            suspended:
              false,
          }),

        after:
          Object.freeze({
            taskExists:
              false,

            taskId:
              preflight.expectedTaskId,

            suspended:
              null,
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
        !t06PrestateMatches(
          preflight,
        )
      ) {
        throw new ProofEngineError(
          "SAFETY_BLOCKED",
          "T06 impact analysis requires exact verified resumed State A.",
        );
      }

      return Object.freeze({
        certainty:
          "KNOWN" as const,

        summary:
          "One reviewed synthetic On Demand task fixture is deleted. The operation is irreversible and has no automatic recovery.",

        affectedEntities:
          Object.freeze([
            Object.freeze({
              kind:
                "TASK",

              canonicalId:
                T06_TASK_TARGET_CANONICAL_ID,

              displayName:
                T06_TASK_NAME,

              effect:
                "DELETE_EXACT_REVIEWED_FIXTURE_REGISTRATION",
            }),
          ]),

        limitations:
          Object.freeze([
            "Only the frozen MeridianLab.OrderExporter fixture identity and reviewed positive task id are permitted.",
            "The browser cannot supply an arbitrary task id or escalation role.",
            "Automatic retry after dispatch is forbidden.",
            "No automatic recovery exists because T06 deletion is irreversible.",
            "Task history is observed before deletion but post-delete history is not required for VERIFIED.",
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
      context,
      reviewed,
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
          !t06PrestateMatches(
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
              "T06 fixture identity/configuration/native state or T05 predecessor proof changed after review; zero DELETE requests dispatched.",
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
              "T06 fresh preflight digest differs from the reviewed digest.",
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
          "T06 execute refused because reviewed and fresh preflight digests differ.",
        );
      }

      let deleted:
        Readonly<{
          taskId:
            number;

          status:
            200;

          mutationRequestCount:
            1;
        }>;

      try {
        deleted =
          await dependencies.executeDelete(
            ready.intent,
          );
      } catch (
        error
      ) {
        if (
          error instanceof
            T06TaskMutationUnknownAfterDispatchError
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
        deleted.status !==
          200 ||
        deleted.taskId !==
          ready.intent.expectedTaskId ||
        deleted.mutationRequestCount !==
          1
      ) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          "T06 delete response did not prove exact HTTP 200 reviewed task identity with one mutation request. Automatic retry is forbidden.",
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
        !t06PoststateMatches(
          after,
          ready.preflight,
        )
      ) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          "T06 delete returned success but authoritative readback did not prove complete reviewed task absence. Automatic retry is forbidden.",
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

      return reconcileUnknownT06TaskDelete(
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
        !executionResult.taskAbsenceObserved ||
        !executionResult.zeroUpcomingPreserved ||
        executionResult.mutationRequestCount !==
          1 ||
        executionResult.taskId <
          1
      ) {
        throw new ProofEngineError(
          "PROOF_INCOMPLETE",
          "T06 execution evidence is incomplete.",
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
          "T06 fixture deletion is irreversible. No automatic recovery is claimed; recreation would require a separately reviewed create sequence.",
      });
    },
  };

  return Object.freeze(
    contract,
  );
}

export async function certifyT06TaskDeleteAction(
  input: {
    readonly intent:
      T06TaskDeleteIntent;

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
    T06TaskDeleteCertificationDependencies,
): Promise<
  VerifiedActionCertificationResult<
    T06TaskDeleteExecution
  >
> {
  return certifyVerifiedAction(
    {
      contract:
        createT06TaskDeleteProofContract(
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
