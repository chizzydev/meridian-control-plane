import type {
  ActionContext,
  ImpactAssessment,
  ProofContract,
  ReviewedAction,
} from "./contract";

import {
  digestCanonicalJson,
} from "./digest";

import type {
  ProofResult,
} from "./evidence";

import {
  ProofEngineError,
  isProofEngineError,
} from "./errors";

import {
  createVerifiedActionRecord,
  completeVerifiedActionEvidence,
  closeVerifiedAction,
  recordActionReceiptPersisted,
  recordActionReceiptReadbackVerified,
  startActionReceiptPersistence,
  transitionVerifiedActionRecord,
  type VerifiedActionRecord,
} from "./action";

import type {
  VerifiedActionEventV2,
} from "./event-chain";

import {
  buildActionReceiptV2,
  type ActionReceiptV2,
} from "./receipt";

import {
  describeProofContract,
} from "./registry";

import {
  reconcileUnknownWithContract,
} from "./reconcile";

export const VERIFIED_ACTION_CERTIFICATION_SCHEMA_VERSION =
  "meridian.verified-action-certification.v1" as const;

export interface VerifiedActionReceiptStore {
  persist(
    receipt:
      ActionReceiptV2,
  ):
    Promise<void>;

  read(
    receiptId:
      string,
  ):
    Promise<ActionReceiptV2>;
}

export interface VerifiedActionReviewInput<
  Preflight,
> {
  readonly preflight:
    Preflight;

  readonly preflightDigest:
    string;

  readonly impact:
    ImpactAssessment;

  readonly expectedDelta:
    Readonly<{
      summary:
        string;

      before:
        Readonly<
          Record<
            string,
            unknown
          >
        >;

      after:
        Readonly<
          Record<
            string,
            unknown
          >
        >;
    }>;
}

export interface VerifiedActionCertificationDependencies<
  Preflight,
> {
  readonly nowUtc:
    () => string;

  readonly reviewPreflight:
    (
      input:
        VerifiedActionReviewInput<
          Preflight
        >,
    ) => Promise<string>;

  readonly receiptStore:
    VerifiedActionReceiptStore;
}

export type VerifiedActionCertificationOutcome =
  | "VERIFIED"
  | "STALE"
  | "DENIED"
  | "APPLY_FAILED"
  | "UNKNOWN_AFTER_DISPATCH"
  | "VERIFY_FAILED"
  | "RECEIPT_WRITE_FAILED";

export interface VerifiedActionCertificationResult<
  Execution,
> {
  readonly schemaVersion:
    typeof VERIFIED_ACTION_CERTIFICATION_SCHEMA_VERSION;

  readonly outcome:
    VerifiedActionCertificationOutcome;

  readonly record:
    VerifiedActionRecord;

  readonly events:
    readonly VerifiedActionEventV2[];

  readonly execution:
    Execution | null;

  readonly proofResults:
    readonly ProofResult[];

  readonly receipt:
    ActionReceiptV2 | null;

  readonly automaticRetryAllowed:
    false;

  readonly reason:
    string | null;
}

function contextAt(
  input: {
    readonly actionId:
      string;

    readonly logicalActor:
      string;

    readonly irisRuntimeUser:
      string;
  },
  nowUtc:
    string,
): ActionContext {
  return Object.freeze({
    actionId:
      input.actionId,

    logicalActor:
      input.logicalActor,

    irisRuntimeUser:
      input.irisRuntimeUser,

    nowUtc,
  });
}

function failureResult<
  Execution,
>(
  outcome:
    Exclude<
      VerifiedActionCertificationOutcome,
      "VERIFIED"
    >,
  record:
    VerifiedActionRecord,
  events:
    readonly VerifiedActionEventV2[],
  execution:
    Execution | null,
  proofResults:
    readonly ProofResult[],
  reason:
    string,
): VerifiedActionCertificationResult<
  Execution
> {
  return Object.freeze({
    schemaVersion:
      VERIFIED_ACTION_CERTIFICATION_SCHEMA_VERSION,

    outcome,

    record,

    events:
      Object.freeze([
        ...events,
      ]),

    execution,

    proofResults:
      Object.freeze([
        ...proofResults,
      ]),

    receipt:
      null,

    automaticRetryAllowed:
      false as const,

    reason,
  });
}

function assertDigest(
  value:
    string,
  label:
    string,
): void {
  if (
    !/^[A-F0-9]{64}$/.test(
      value,
    )
  ) {
    throw new ProofEngineError(
      "INVALID_CANONICAL_VALUE",
      `${label} must be uppercase SHA-256.`,
      {
        label,
      },
    );
  }
}

export async function certifyVerifiedAction<
  Intent,
  Preflight,
  Execution,
>(
  input: {
    readonly contract:
      ProofContract<
        Intent,
        Preflight,
        Execution
      >;

    readonly intent:
      Intent;

    readonly actionId:
      string;

    readonly receiptId:
      string;

    readonly parentChangeSetId:
      string | null;

    readonly logicalActor:
      string;

    readonly irisRuntimeUser:
      string;
  },
  dependencies:
    VerifiedActionCertificationDependencies<
      Preflight
    >,
): Promise<
  VerifiedActionCertificationResult<
    Execution
  >
> {
  const descriptor =
    describeProofContract(
      input.contract,
    );

  const target =
    input.contract.target(
      input.intent,
    );

  const intentDigest =
    digestCanonicalJson(
      input.intent,
    );

  const createdAtUtc =
    dependencies.nowUtc();

  const created =
    createVerifiedActionRecord({
      actionId:
        input.actionId,

      contract:
        descriptor,

      target,

      occurredAtUtc:
        createdAtUtc,

      detail: {
        actionType:
          descriptor.actionType,
        intentDigest,
      },
    });

  let record =
    created.record;

  const events:
    VerifiedActionEventV2[] = [
      created.event,
    ];

  const append =
    (
      mutation:
        Readonly<{
          record:
            VerifiedActionRecord;

          event:
            VerifiedActionEventV2;
        }>,
    ): void => {
      record =
        mutation.record;

      events.push(
        mutation.event,
      );
    };

  append(
    transitionVerifiedActionRecord(
      record,
      {
        eventType:
          "PREFLIGHT_STARTED",

        toState:
          "PREFLIGHTING",

        occurredAtUtc:
          dependencies.nowUtc(),
      },
    ),
  );

  const preflightContext =
    contextAt(
      input,
      dependencies.nowUtc(),
    );

  const preflight =
    await input.contract.preflight(
      preflightContext,
      input.intent,
    );

  const preflightDigest =
    input.contract.digestPreflight(
      preflight,
    );

  assertDigest(
    preflightDigest,
    "Preflight digest",
  );

  append(
    transitionVerifiedActionRecord(
      record,
      {
        eventType:
          "PREFLIGHT_COMPLETED",

        toState:
          "PREFLIGHTED",

        occurredAtUtc:
          dependencies.nowUtc(),

        detail: {
          preflightDigest,
        },
      },
    ),
  );

  const impact =
    await input.contract.analyzeImpact(
      contextAt(
        input,
        dependencies.nowUtc(),
      ),
      input.intent,
      preflight,
    );

  const expectedDelta =
    input.contract.expectedDelta(
      input.intent,
      preflight,
    );

  const reviewedPreflightDigest =
    (
      await dependencies.reviewPreflight({
        preflight,
        preflightDigest,
        impact,
        expectedDelta,
      })
    ).trim();

  assertDigest(
    reviewedPreflightDigest,
    "Reviewed preflight digest",
  );

  if (
    reviewedPreflightDigest !==
      preflightDigest
  ) {
    throw new ProofEngineError(
      "STALE_PRECONDITION",
      "Certification review did not accept the exact preflight digest.",
    );
  }

  append(
    transitionVerifiedActionRecord(
      record,
      {
        eventType:
          "REVIEW_ACCEPTED",

        toState:
          "APPROVED",

        occurredAtUtc:
          dependencies.nowUtc(),

        detail: {
          reviewedPreflightDigest,
          impactCertainty:
            impact.certainty,
          expectedDeltaSummary:
            expectedDelta.summary,
        },
      },
    ),
  );

  const reviewed:
    ReviewedAction<
      Intent,
      Preflight
    > =
    Object.freeze({
      intent:
        input.intent,

      preflight,

      reviewedPreflightDigest,
    });

  append(
    transitionVerifiedActionRecord(
      record,
      {
        eventType:
          "REVALIDATION_STARTED",

        toState:
          "REVALIDATING",

        occurredAtUtc:
          dependencies.nowUtc(),
      },
    ),
  );

  const revalidation =
    await input.contract.revalidate(
      contextAt(
        input,
        dependencies.nowUtc(),
      ),
      reviewed,
    );

  if (
    revalidation.outcome ===
      "STALE"
  ) {
    append(
      transitionVerifiedActionRecord(
        record,
        {
          eventType:
            "REVALIDATION_STALE",

          toState:
            "STALE",

          occurredAtUtc:
            dependencies.nowUtc(),

          detail: {
            reviewedPreflightDigest,
            freshRevalidationDigest:
              revalidation.freshDigest,
            reason:
              revalidation.reason,
          },
        },
      ),
    );

    return failureResult<Execution>(
      "STALE",
      record,
      events,
      null,
      [],
      revalidation.reason,
    );
  }

  if (
    revalidation.outcome ===
      "DENIED"
  ) {
    append(
      transitionVerifiedActionRecord(
        record,
        {
          eventType:
            "AUTHORITY_DENIED",

          toState:
            "DENIED",

          occurredAtUtc:
            dependencies.nowUtc(),

          detail: {
            reason:
              revalidation.reason,
          },
        },
      ),
    );

    return failureResult<Execution>(
      "DENIED",
      record,
      events,
      null,
      [],
      revalidation.reason,
    );
  }

  const freshRevalidationDigest =
    revalidation.freshDigest;

  assertDigest(
    freshRevalidationDigest,
    "Fresh revalidation digest",
  );

  append(
    transitionVerifiedActionRecord(
      record,
      {
        eventType:
          "REVALIDATION_MATCHED",

        toState:
          "READY",

        occurredAtUtc:
          dependencies.nowUtc(),

        detail: {
          reviewedPreflightDigest,
          freshRevalidationDigest,
        },
      },
    ),
  );

  const applyStartedAtUtc =
    dependencies.nowUtc();

  append(
    transitionVerifiedActionRecord(
      record,
      {
        eventType:
          "APPLY_DISPATCH_STARTED",

        toState:
          "APPLYING",

        occurredAtUtc:
          applyStartedAtUtc,

        detail: {
          automaticRetry:
            false,
        },
      },
    ),
  );

  let execution:
    Execution | null =
      null;

  try {
    execution =
      await input.contract.execute(
        contextAt(
          input,
          applyStartedAtUtc,
        ),
        {
          intent:
            input.intent,

          preflight:
            revalidation.freshPreflight,

          reviewedPreflightDigest,

          freshRevalidationDigest,
        },
      );

    append(
      transitionVerifiedActionRecord(
        record,
        {
          eventType:
            "APPLY_RESPONSE_ACCEPTED",

          toState:
            "APPLIED",

          occurredAtUtc:
            dependencies.nowUtc(),

          detail: {
            executionDigest:
              digestCanonicalJson(
                execution,
              ),
          },
        },
      ),
    );
  } catch (
    error
  ) {
    if (
      isProofEngineError(
        error,
      ) &&
      error.code ===
        "UNKNOWN_AFTER_DISPATCH"
    ) {
      append(
        transitionVerifiedActionRecord(
          record,
          {
            eventType:
              "APPLY_OUTCOME_UNKNOWN",

            toState:
              "UNKNOWN_AFTER_DISPATCH",

            occurredAtUtc:
              dependencies.nowUtc(),

            detail: {
              reason:
                error.message,
              automaticRetry:
                false,
            },
          },
        ),
      );

      append(
        transitionVerifiedActionRecord(
          record,
          {
            eventType:
              "RECONCILIATION_STARTED",

            toState:
              "RECONCILING",

            occurredAtUtc:
              dependencies.nowUtc(),

            detail: {
              automaticRetry:
                false,
            },
          },
        ),
      );

      const reconciliation =
        await reconcileUnknownWithContract(
          input.contract,
          contextAt(
            input,
            dependencies.nowUtc(),
          ),
          reviewed,
        );

      if (
        reconciliation.decision.outcome ===
          "APPLIED"
      ) {
        execution =
          reconciliation.decision.execution;

        append(
          transitionVerifiedActionRecord(
            record,
            {
              eventType:
                "RECONCILIATION_APPLIED",

              toState:
                "APPLIED",

              occurredAtUtc:
                dependencies.nowUtc(),

              detail: {
                decisionDigest:
                  reconciliation.decisionDigest,
                automaticRetry:
                  false,
              },
            },
          ),
        );
      } else if (
        reconciliation.decision.outcome ===
          "NOT_APPLIED"
      ) {
        append(
          transitionVerifiedActionRecord(
            record,
            {
              eventType:
                "RECONCILIATION_NOT_APPLIED",

              toState:
                "APPLY_FAILED",

              occurredAtUtc:
                dependencies.nowUtc(),

              detail: {
                decisionDigest:
                  reconciliation.decisionDigest,
                reason:
                  reconciliation.decision.reason,
                automaticRetry:
                  false,
              },
            },
          ),
        );

        return failureResult<Execution>(
          "APPLY_FAILED",
          record,
          events,
          null,
          [],
          reconciliation.decision.reason,
        );
      } else {
        append(
          transitionVerifiedActionRecord(
            record,
            {
              eventType:
                "RECONCILIATION_STILL_UNKNOWN",

              toState:
                "UNKNOWN_AFTER_DISPATCH",

              occurredAtUtc:
                dependencies.nowUtc(),

              detail: {
                decisionDigest:
                  reconciliation.decisionDigest,
                reason:
                  reconciliation.decision.reason,
                automaticRetry:
                  false,
              },
            },
          ),
        );

        return failureResult<Execution>(
          "UNKNOWN_AFTER_DISPATCH",
          record,
          events,
          null,
          [],
          reconciliation.decision.reason,
        );
      }
    } else {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown apply failure.";

      append(
        transitionVerifiedActionRecord(
          record,
          {
            eventType:
              "APPLY_FAILED",

            toState:
              "APPLY_FAILED",

            occurredAtUtc:
              dependencies.nowUtc(),

            detail: {
              reason:
                message,
            },
          },
        ),
      );

      return failureResult<Execution>(
        "APPLY_FAILED",
        record,
        events,
        null,
        [],
        message,
      );
    }
  }

  if (
    execution ===
      null
  ) {
    throw new ProofEngineError(
      "INVALID_CONTRACT",
      "Certification runner reached APPLIED without execution evidence.",
    );
  }

  const applyCompletedAtUtc =
    dependencies.nowUtc();

  append(
    transitionVerifiedActionRecord(
      record,
      {
        eventType:
          "VERIFY_STARTED",

        toState:
          "VERIFYING",

        occurredAtUtc:
          dependencies.nowUtc(),
      },
    ),
  );

  let proofResults:
    readonly ProofResult[];

  try {
    proofResults =
      await input.contract.verify(
        contextAt(
          input,
          dependencies.nowUtc(),
        ),
        execution,
      );
  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown verification failure.";

    const eventType =
      isProofEngineError(
        error,
      ) &&
      error.code ===
        "UNKNOWN_AFTER_DISPATCH"
        ? "VERIFY_OUTCOME_UNKNOWN"
        : "VERIFY_FAILED";

    const toState =
      eventType ===
        "VERIFY_OUTCOME_UNKNOWN"
        ? "UNKNOWN_AFTER_DISPATCH"
        : "VERIFY_FAILED";

    append(
      transitionVerifiedActionRecord(
        record,
        {
          eventType,
          toState,

          occurredAtUtc:
            dependencies.nowUtc(),

          detail: {
            reason:
              message,
          },
        },
      ),
    );

    return failureResult<Execution>(
      toState,
      record,
      events,
      execution,
      [],
      message,
    );
  }

  for (
    const proofResult
    of proofResults
  ) {
    append(
      transitionVerifiedActionRecord(
        record,
        {
          eventType:
            "EVIDENCE_RECORDED",

          toState:
            "VERIFYING",

          occurredAtUtc:
            dependencies.nowUtc(),

          detail: {
            requirementId:
              proofResult.requirementId,
            plane:
              proofResult.plane,
            status:
              proofResult.status,
            provenance:
              proofResult.provenance,
            safeEvidenceDigest:
              proofResult.safeEvidenceDigest,
          },
        },
      ),
    );
  }

  const evidenceCompletedAtUtc =
    dependencies.nowUtc();

  try {
    append(
      completeVerifiedActionEvidence(
        record,
        input.contract
          .proofRequirements,
        proofResults,
        evidenceCompletedAtUtc,
      ),
    );
  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "Required proof evidence is incomplete.";

    append(
      transitionVerifiedActionRecord(
        record,
        {
          eventType:
            "VERIFY_FAILED",

          toState:
            "VERIFY_FAILED",

          occurredAtUtc:
            dependencies.nowUtc(),

          detail: {
            reason:
              message,
          },
        },
      ),
    );

    return failureResult<Execution>(
      "VERIFY_FAILED",
      record,
      events,
      execution,
      proofResults,
      message,
    );
  }

  const executionDigest =
    digestCanonicalJson(
      execution,
    );

  const recovery =
    input.contract.buildRecoveryPlan(
      execution,
      proofResults,
    );

  const receipt =
    buildActionReceiptV2({
      receiptId:
        input.receiptId,

      actionId:
        input.actionId,

      parentChangeSetId:
        input.parentChangeSetId,

      actionType:
        descriptor.actionType,

      contractId:
        descriptor.contractId,

      contractVersion:
        descriptor.contractVersion,

      domain:
        descriptor.domain,

      risk:
        descriptor.risk,

      reversibility:
        descriptor.reversibility,

      target,

      actor:
        Object.freeze({
          logicalActor:
            input.logicalActor,

          irisRuntimeUser:
            input.irisRuntimeUser,
        }),

      authority:
        input.contract
          .requiredAuthority,

      intentDigest,

      reviewedPreflightDigest,

      freshRevalidationDigest,

      executionDigest,

      evidenceDigest:
        record.evidenceDigest ??
        digestCanonicalJson(
          proofResults,
        ),

      proofResults,

      lifecycle:
        Object.freeze({
          createdAtUtc,
          applyStartedAtUtc,
          applyCompletedAtUtc,
          evidenceCompletedAtUtc,
        }),

      recovery:
        Object.freeze({
          class:
            descriptor.reversibility,

          available:
            recovery.recoveryActionType !==
              null,

          recoveryActionType:
            recovery.recoveryActionType,
        }),

      terminalEventHash:
        record.lastEventHash,
    });

  append(
    startActionReceiptPersistence(
      record,
      receipt,
      dependencies.nowUtc(),
    ),
  );

  try {
    await dependencies.receiptStore
      .persist(
        receipt,
      );

    append(
      recordActionReceiptPersisted(
        record,
        receipt,
        dependencies.nowUtc(),
      ),
    );

    const readback =
      await dependencies.receiptStore
        .read(
          receipt.receiptId,
        );

    append(
      recordActionReceiptReadbackVerified(
        record,
        receipt,
        readback,
        dependencies.nowUtc(),
      ),
    );
  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "Receipt persistence/readback failed.";

    append(
      transitionVerifiedActionRecord(
        record,
        {
          eventType:
            "RECEIPT_WRITE_FAILED",

          toState:
            "RECEIPT_WRITE_FAILED",

          occurredAtUtc:
            dependencies.nowUtc(),

          detail: {
            phase:
              "PERSIST_OR_READBACK",
            reason:
              message,
          },
        },
      ),
    );

    return failureResult<Execution>(
      "RECEIPT_WRITE_FAILED",
      record,
      events,
      execution,
      proofResults,
      message,
    );
  }

  append(
    closeVerifiedAction(
      record,
      events,
      dependencies.nowUtc(),
    ),
  );

  return Object.freeze({
    schemaVersion:
      VERIFIED_ACTION_CERTIFICATION_SCHEMA_VERSION,

    outcome:
      "VERIFIED" as const,

    record,

    events:
      Object.freeze([
        ...events,
      ]),

    execution,

    proofResults:
      Object.freeze([
        ...proofResults,
      ]),

    receipt,

    automaticRetryAllowed:
      false as const,

    reason:
      null,
  });
}
