import {
  ORDERS_WEB_APP_NAME,
  ORDERS_WEB_APP_TARGET_CANONICAL_ID,
} from "../actions/web-app/fixture";

import {
  assertActionReceiptV2,
  type ActionReceiptV2,
} from "../proof/receipt";

import type {
  ActionReceiptHistorySummary,
} from "../proof/action-history";

import type {
  EvidencePlane,
  EvidenceProvenanceClass,
  EvidenceStatus,
} from "../proof/evidence";

import type {
  OrdersWebAppHealthProbe,
  OrdersWebAppObservedState,
} from "./web-app-action-transport";

export interface SafeWebRestProofResult {
  readonly plane:
    EvidencePlane;

  readonly status:
    EvidenceStatus;

  readonly provenance:
    EvidenceProvenanceClass;
}

export interface SafeVerifiedWebRestReceipt {
  readonly receiptId:
    string;

  readonly actionId:
    string;

  readonly actionType:
    string;

  readonly lifecycleState:
    "VERIFIED";

  readonly receiptSha256:
    string;

  readonly evidenceDigest:
    string;

  readonly applyUtc:
    string;

  readonly applyActor:
    string;

  readonly proofResults:
    readonly SafeWebRestProofResult[];

  readonly recoveryAvailable:
    boolean;
}

export interface SafeWebRestLifecycleView {
  readonly targetCanonicalId:
    typeof ORDERS_WEB_APP_TARGET_CANONICAL_ID;

  readonly targetDisplayName:
    typeof ORDERS_WEB_APP_NAME;

  readonly historyCount:
    number;

  readonly historySource:
    "DURABLE_HASHED_RECEIPTS";

  readonly historyIntegrity:
    "CANONICAL_HASH_VALIDATED";

  readonly currentStateSource:
    "AUTHORITATIVE_CURRENT_RECHECK";

  readonly currentApplicationState:
    "ABSENT" |
    "PRESENT" |
    "INCONSISTENT";

  readonly currentHttpStatus:
    number;

  readonly receipts:
    readonly SafeVerifiedWebRestReceipt[];
}

function invariant(
  condition:
    boolean,
  message:
    string,
): asserts condition {
  if (!condition) {
    throw new Error(
      `Web/REST lifecycle invariant failed: ${message}`,
    );
  }
}

function currentApplicationState(
  state:
    OrdersWebAppObservedState,
): SafeWebRestLifecycleView["currentApplicationState"] {
  const allAbsent =
    state.configuration ===
      null &&
    state.routing ===
      null &&
    state.matchRoles ===
      null;

  if (allAbsent) {
    return "ABSENT";
  }

  if (
    state.configuration !==
      null &&
    state.routing !==
      null &&
    state.matchRoles !==
      null
  ) {
    return "PRESENT";
  }

  return "INCONSISTENT";
}

export function buildSafeWebRestLifecycleView(
  input: {
    readonly summaries:
      readonly ActionReceiptHistorySummary[];

    readonly receipts:
      readonly ActionReceiptV2[];

    readonly currentState:
      OrdersWebAppObservedState;

    readonly currentHealth:
      OrdersWebAppHealthProbe;
  },
): SafeWebRestLifecycleView {
  invariant(
    input.summaries.length ===
      input.receipts.length,
    "summary and receipt counts differ",
  );

  const receiptsById =
    new Map<
      string,
      ActionReceiptV2
    >();

  for (
    const receipt
    of input.receipts
  ) {
    assertActionReceiptV2(
      receipt,
    );

    invariant(
      receipt.target.canonicalId ===
        ORDERS_WEB_APP_TARGET_CANONICAL_ID,
      "receipt target differs from frozen orders target",
    );

    invariant(
      !receiptsById.has(
        receipt.receiptId,
      ),
      "duplicate receipt id",
    );

    receiptsById.set(
      receipt.receiptId,
      receipt,
    );
  }

  const entries =
    input.summaries.map(
      (
        summary,
      ): SafeVerifiedWebRestReceipt => {
        const receipt =
          receiptsById.get(
            summary.receiptId,
          );

        invariant(
          receipt !==
            undefined,
          `missing full receipt ${summary.receiptId}`,
        );

        invariant(
          summary.lifecycleState ===
            "VERIFIED" &&
          receipt.receiptId ===
            summary.receiptId &&
          receipt.actionId ===
            summary.actionId &&
          receipt.actionType ===
            summary.actionType &&
          receipt.domain ===
            summary.domain &&
          receipt.target.kind ===
            summary.targetKind &&
          receipt.target.canonicalId ===
            summary.targetCanonicalId &&
          receipt.target.displayName ===
            summary.targetDisplayName &&
          receipt.receiptSha256 ===
            summary.receiptSha256 &&
          receipt.lifecycle.applyStartedAtUtc ===
            summary.applyUtc &&
          receipt.actor.irisRuntimeUser ===
            summary.applyActor,
          `summary binding differs from receipt ${summary.receiptId}`,
        );

        return Object.freeze({
          receiptId:
            receipt.receiptId,

          actionId:
            receipt.actionId,

          actionType:
            receipt.actionType,

          lifecycleState:
            "VERIFIED" as const,

          receiptSha256:
            receipt.receiptSha256,

          evidenceDigest:
            receipt.evidenceDigest,

          applyUtc:
            receipt.lifecycle
              .applyStartedAtUtc,

          applyActor:
            receipt.actor
              .irisRuntimeUser,

          proofResults:
            Object.freeze(
              receipt.proofResults.map(
                (
                  proof,
                ) =>
                  Object.freeze({
                    plane:
                      proof.plane,

                    status:
                      proof.status,

                    provenance:
                      proof.provenance,
                  }),
              ),
            ),

          recoveryAvailable:
            receipt.recovery
              .available,
        });
      },
    )
    .sort(
      (
        left,
        right,
      ) =>
        left.applyUtc
          .localeCompare(
            right.applyUtc,
          ),
    );

  return Object.freeze({
    targetCanonicalId:
      ORDERS_WEB_APP_TARGET_CANONICAL_ID,

    targetDisplayName:
      ORDERS_WEB_APP_NAME,

    historyCount:
      entries.length,

    historySource:
      "DURABLE_HASHED_RECEIPTS" as const,

    historyIntegrity:
      "CANONICAL_HASH_VALIDATED" as const,

    currentStateSource:
      "AUTHORITATIVE_CURRENT_RECHECK" as const,

    currentApplicationState:
      currentApplicationState(
        input.currentState,
      ),

    currentHttpStatus:
      input.currentHealth
        .status,

    receipts:
      Object.freeze(
        entries,
      ),
  });
}
