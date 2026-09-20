import type {
  ActionContext,
  ProofContract,
  ReconciliationDecision,
  ReviewedAction,
} from "./contract";

import {
  digestCanonicalJson,
} from "./digest";

import {
  ProofEngineError,
} from "./errors";

export const RECONCILIATION_RUN_SCHEMA_VERSION =
  "meridian.reconciliation-run.v1" as const;

export interface ReconciliationRunResult<
  Execution,
> {
  readonly schemaVersion:
    typeof RECONCILIATION_RUN_SCHEMA_VERSION;

  readonly decision:
    ReconciliationDecision<
      Execution
    >;

  readonly decisionDigest:
    string;

  readonly automaticRetryAllowed:
    false;
}

function assertReason(
  value:
    string,
  outcome:
    string,
): void {
  if (
    value.trim().length ===
      0
  ) {
    throw new ProofEngineError(
      "INVALID_CONTRACT",
      (
        "Reconciliation decision requires a non-empty " +
        `reason for ${outcome}.`
      ),
      {
        outcome,
      },
    );
  }
}

export async function reconcileUnknownWithContract<
  Intent,
  Preflight,
  Execution,
>(
  contract:
    ProofContract<
      Intent,
      Preflight,
      Execution
    >,
  context:
    ActionContext,
  reviewed:
    ReviewedAction<
      Intent,
      Preflight
    >,
): Promise<
  ReconciliationRunResult<
    Execution
  >
> {
  const decision =
    await contract
      .reconcileUnknown(
        context,
        reviewed,
      );

  if (
    decision.outcome ===
      "NOT_APPLIED" ||
    decision.outcome ===
      "STILL_UNKNOWN"
  ) {
    assertReason(
      decision.reason,
      decision.outcome,
    );
  }

  const decisionDigest =
    digestCanonicalJson(
      decision,
    );

  return Object.freeze({
    schemaVersion:
      RECONCILIATION_RUN_SCHEMA_VERSION,

    decision,

    decisionDigest,

    automaticRetryAllowed:
      false as const,
  });
}
