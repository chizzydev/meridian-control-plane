import type {
  VerifiedActionState,
} from "./action-state";

import {
  assertTargetIdentity,
  type TargetIdentity,
} from "./contract";

import {
  digestCanonicalJson,
} from "./digest";

import {
  evaluateProofClosure,
  type ProofRequirement,
  type ProofResult,
} from "./evidence";

import {
  ProofEngineError,
} from "./errors";

import {
  createVerifiedActionEvent,
  verifyVerifiedActionEventChain,
  VERIFIED_ACTION_EVENT_GENESIS,
  type VerifiedActionEventType,
  type VerifiedActionEventV2,
} from "./event-chain";

import {
  assertActionReceiptV2,
  assertExactReceiptReadback,
  type ActionReceiptV2,
} from "./receipt";

import {
  assertProofContractDescriptor,
  type ProofContractDescriptor,
} from "./registry";

export const VERIFIED_ACTION_RECORD_SCHEMA_VERSION =
  "meridian.verified-action.v2" as const;

export interface VerifiedActionRecord {
  readonly schemaVersion:
    typeof VERIFIED_ACTION_RECORD_SCHEMA_VERSION;

  readonly actionId:
    string;

  readonly contract:
    ProofContractDescriptor;

  readonly target:
    TargetIdentity;

  readonly state:
    VerifiedActionState;

  readonly version:
    number;

  readonly createdAtUtc:
    string;

  readonly updatedAtUtc:
    string;

  readonly lastEventHash:
    string;

  readonly evidenceDigest:
    string | null;

  readonly receiptSha256:
    string | null;

  readonly receiptEvidenceTerminalHash:
    string | null;

  readonly receiptPersisted:
    boolean;

  readonly receiptReadbackVerified:
    boolean;
}

export interface VerifiedActionMutation {
  readonly record:
    VerifiedActionRecord;

  readonly event:
    VerifiedActionEventV2;
}

const PROTECTED_ENGINE_EVENTS =
  Object.freeze([
    "EVIDENCE_COMPLETE",
    "RECEIPT_WRITE_STARTED",
    "RECEIPT_PERSISTED",
    "RECEIPT_READBACK_VERIFIED",
    "ACTION_VERIFIED",
  ] as const);

function isIsoUtc(
  value:
    string,
): boolean {
  return (
    value.endsWith(
      "Z",
    ) &&
    Number.isFinite(
      Date.parse(
        value,
      ),
    )
  );
}

function mutateRecordWithEvent(
  record:
    VerifiedActionRecord,
  event:
    VerifiedActionEventV2,
  patch:
    Partial<
      Pick<
        VerifiedActionRecord,
        | "evidenceDigest"
        | "receiptSha256"
        | "receiptEvidenceTerminalHash"
        | "receiptPersisted"
        | "receiptReadbackVerified"
      >
    > = {},
): VerifiedActionMutation {
  if (
    event.actionId !==
      record.actionId ||
    event.fromState !==
      record.state ||
    event.versionBefore !==
      record.version ||
    event.versionAfter !==
      record.version +
        1 ||
    event.previousEventHash !==
      record.lastEventHash
  ) {
    throw new ProofEngineError(
      "INVALID_CONTRACT",
      "Verified Action event does not extend the current action record.",
    );
  }

  const next:
    VerifiedActionRecord =
    Object.freeze({
      ...record,

      state:
        event.toState,

      version:
        event.versionAfter,

      updatedAtUtc:
        event.occurredAtUtc,

      lastEventHash:
        event.eventHash,

      ...patch,
    });

  return Object.freeze({
    record:
      next,

    event,
  });
}

function nextEvent(
  record:
    VerifiedActionRecord,
  input: {
    readonly eventType:
      VerifiedActionEventType;

    readonly toState:
      VerifiedActionState;

    readonly occurredAtUtc:
      string;

    readonly detail?:
      Readonly<
        Record<
          string,
          unknown
        >
      >;
  },
): VerifiedActionEventV2 {
  return createVerifiedActionEvent({
    actionId:
      record.actionId,

    sequence:
      record.version +
        1,

    eventType:
      input.eventType,

    fromState:
      record.state,

    toState:
      input.toState,

    versionBefore:
      record.version,

    versionAfter:
      record.version +
        1,

    occurredAtUtc:
      input.occurredAtUtc,

    detail:
      input.detail ??
      {},

    previousEventHash:
      record.lastEventHash,
  });
}

export function createVerifiedActionRecord(
  input: {
    readonly actionId:
      string;

    readonly contract:
      ProofContractDescriptor;

    readonly target:
      TargetIdentity;

    readonly occurredAtUtc:
      string;

    readonly detail?:
      Readonly<
        Record<
          string,
          unknown
        >
      >;
  },
): VerifiedActionMutation {
  if (
    !isIsoUtc(
      input.occurredAtUtc,
    )
  ) {
    throw new ProofEngineError(
      "INVALID_CANONICAL_VALUE",
      "Verified Action creation timestamp must be UTC ISO-8601.",
    );
  }

  assertProofContractDescriptor(
    input.contract,
  );

  assertTargetIdentity(
    input.target,
  );

  const event =
    createVerifiedActionEvent({
      actionId:
        input.actionId,

      sequence:
        1,

      eventType:
        "ACTION_CREATED",

      fromState:
        "NONE",

      toState:
        "CREATED",

      versionBefore:
        0,

      versionAfter:
        1,

      occurredAtUtc:
        input.occurredAtUtc,

      detail:
        input.detail ??
        {},

      previousEventHash:
        VERIFIED_ACTION_EVENT_GENESIS,
    });

  const record:
    VerifiedActionRecord =
    Object.freeze({
      schemaVersion:
        VERIFIED_ACTION_RECORD_SCHEMA_VERSION,

      actionId:
        input.actionId,

      contract:
        input.contract,

      target:
        input.target,

      state:
        "CREATED",

      version:
        1,

      createdAtUtc:
        input.occurredAtUtc,

      updatedAtUtc:
        input.occurredAtUtc,

      lastEventHash:
        event.eventHash,

      evidenceDigest:
        null,

      receiptSha256:
        null,

      receiptEvidenceTerminalHash:
        null,

      receiptPersisted:
        false,

      receiptReadbackVerified:
        false,
    });

  return Object.freeze({
    record,
    event,
  });
}

export function transitionVerifiedActionRecord(
  record:
    VerifiedActionRecord,
  input: {
    readonly eventType:
      VerifiedActionEventType;

    readonly toState:
      VerifiedActionState;

    readonly occurredAtUtc:
      string;

    readonly detail?:
      Readonly<
        Record<
          string,
          unknown
        >
      >;
  },
): VerifiedActionMutation {
  if (
    (
      PROTECTED_ENGINE_EVENTS as readonly string[]
    ).includes(
      input.eventType,
    )
  ) {
    throw new ProofEngineError(
      "INVALID_CONTRACT",
      (
        `${input.eventType} is protected by a specialized ` +
        "Proof Engine closure function."
      ),
    );
  }

  return mutateRecordWithEvent(
    record,
    nextEvent(
      record,
      input,
    ),
  );
}

export function completeVerifiedActionEvidence(
  record:
    VerifiedActionRecord,
  requirements:
    readonly ProofRequirement[],
  results:
    readonly ProofResult[],
  occurredAtUtc:
    string,
): VerifiedActionMutation {
  if (
    record.state !==
      "VERIFYING"
  ) {
    throw new ProofEngineError(
      "PROOF_INCOMPLETE",
      "Evidence completion requires VERIFYING state.",
    );
  }

  const closure =
    evaluateProofClosure(
      requirements,
      results,
    );

  if (
    !closure.satisfied
  ) {
    throw new ProofEngineError(
      "PROOF_INCOMPLETE",
      "Required evidence is incomplete.",
      {
        blockingCount:
          closure.blockingRequirementIds.length,
      },
    );
  }

  const evidenceDigest =
    digestCanonicalJson(
      results,
    );

  const event =
    nextEvent(
      record,
      {
        eventType:
          "EVIDENCE_COMPLETE",

        toState:
          "EVIDENCE_COMPLETE",

        occurredAtUtc,

        detail: {
          evidenceDigest,
          proofResultCount:
            results.length,
        },
      },
    );

  return mutateRecordWithEvent(
    record,
    event,
    {
      evidenceDigest,
    },
  );
}

function assertReceiptBindsRecord(
  record:
    VerifiedActionRecord,
  receipt:
    ActionReceiptV2,
): void {
  assertActionReceiptV2(
    receipt,
  );

  if (
    receipt.actionId !==
      record.actionId ||
    receipt.contractId !==
      record.contract.contractId ||
    receipt.contractVersion !==
      record.contract.contractVersion ||
    receipt.actionType !==
      record.contract.actionType ||
    receipt.target.canonicalId !==
      record.target.canonicalId ||
    record.evidenceDigest ===
      null ||
    receipt.evidenceDigest !==
      record.evidenceDigest
  ) {
    throw new ProofEngineError(
      "RECEIPT_MISMATCH",
      "Action receipt does not bind to the current Verified Action record.",
    );
  }
}

export function startActionReceiptPersistence(
  record:
    VerifiedActionRecord,
  receipt:
    ActionReceiptV2,
  occurredAtUtc:
    string,
): VerifiedActionMutation {
  if (
    record.state !==
      "EVIDENCE_COMPLETE"
  ) {
    throw new ProofEngineError(
      "RECEIPT_MISMATCH",
      "Receipt persistence can start only after evidence completion.",
    );
  }

  assertReceiptBindsRecord(
    record,
    receipt,
  );

  if (
    receipt.terminalEventHash !==
      record.lastEventHash
  ) {
    throw new ProofEngineError(
      "RECEIPT_MISMATCH",
      "Receipt does not bind to the evidence-complete event prefix.",
    );
  }

  const event =
    nextEvent(
      record,
      {
        eventType:
          "RECEIPT_WRITE_STARTED",

        toState:
          "RECEIPT_PERSISTING",

        occurredAtUtc,

        detail: {
          receiptSha256:
            receipt.receiptSha256,
        },
      },
    );

  return mutateRecordWithEvent(
    record,
    event,
    {
      receiptSha256:
        receipt.receiptSha256,

      receiptEvidenceTerminalHash:
        receipt.terminalEventHash,
    },
  );
}

export function recordActionReceiptPersisted(
  record:
    VerifiedActionRecord,
  receipt:
    ActionReceiptV2,
  occurredAtUtc:
    string,
): VerifiedActionMutation {
  if (
    record.state !==
      "RECEIPT_PERSISTING" ||
    record.receiptSha256 ===
      null ||
    record.receiptEvidenceTerminalHash ===
      null
  ) {
    throw new ProofEngineError(
      "RECEIPT_MISMATCH",
      "Receipt persistence evidence requires a started receipt write.",
    );
  }

  assertReceiptBindsRecord(
    record,
    receipt,
  );

  if (
    receipt.receiptSha256 !==
      record.receiptSha256 ||
    receipt.terminalEventHash !==
      record.receiptEvidenceTerminalHash
  ) {
    throw new ProofEngineError(
      "RECEIPT_MISMATCH",
      "Persisted receipt identity differs from the frozen receipt.",
    );
  }

  const event =
    nextEvent(
      record,
      {
        eventType:
          "RECEIPT_PERSISTED",

        toState:
          record.state,

        occurredAtUtc,

        detail: {
          receiptSha256:
            receipt.receiptSha256,
        },
      },
    );

  return mutateRecordWithEvent(
    record,
    event,
    {
      receiptPersisted:
        true,
    },
  );
}

export function recordActionReceiptReadbackVerified(
  record:
    VerifiedActionRecord,
  persisted:
    ActionReceiptV2,
  readback:
    ActionReceiptV2,
  occurredAtUtc:
    string,
): VerifiedActionMutation {
  if (
    record.state !==
      "RECEIPT_PERSISTING" ||
    record.receiptSha256 ===
      null ||
    !record.receiptPersisted
  ) {
    throw new ProofEngineError(
      "RECEIPT_MISMATCH",
      "Receipt readback verification requires a persisted receipt.",
    );
  }

  assertExactReceiptReadback(
    persisted,
    readback,
  );

  if (
    persisted.receiptSha256 !==
      record.receiptSha256
  ) {
    throw new ProofEngineError(
      "RECEIPT_MISMATCH",
      "Receipt readback does not match the action record receipt identity.",
    );
  }

  const event =
    nextEvent(
      record,
      {
        eventType:
          "RECEIPT_READBACK_VERIFIED",

        toState:
          record.state,

        occurredAtUtc,

        detail: {
          receiptSha256:
            persisted.receiptSha256,
        },
      },
    );

  return mutateRecordWithEvent(
    record,
    event,
    {
      receiptReadbackVerified:
        true,
    },
  );
}

export function closeVerifiedAction(
  record:
    VerifiedActionRecord,
  events:
    readonly VerifiedActionEventV2[],
  occurredAtUtc:
    string,
): VerifiedActionMutation {
  verifyActionHistoryMatchesRecord(
    record,
    events,
  );

  const finalEvent =
    events.at(
      -1,
    );

  if (
    finalEvent?.eventType !==
      "RECEIPT_READBACK_VERIFIED"
  ) {
    throw new ProofEngineError(
      "RECEIPT_MISMATCH",
      "Verified closure requires RECEIPT_READBACK_VERIFIED as the current event.",
    );
  }

  if (
    record.state !==
      "RECEIPT_PERSISTING" ||
    record.receiptSha256 ===
      null ||
    !record.receiptPersisted ||
    !record.receiptReadbackVerified
  ) {
    throw new ProofEngineError(
      "RECEIPT_MISMATCH",
      "Action cannot become VERIFIED before exact durable receipt readback.",
    );
  }

  const event =
    nextEvent(
      record,
      {
        eventType:
          "ACTION_VERIFIED",

        toState:
          "VERIFIED",

        occurredAtUtc,

        detail: {
          receiptSha256:
            record.receiptSha256,
        },
      },
    );

  return mutateRecordWithEvent(
    record,
    event,
  );
}

export function verifyActionHistoryMatchesRecord(
  record:
    VerifiedActionRecord,
  events:
    readonly VerifiedActionEventV2[],
): void {
  verifyVerifiedActionEventChain(
    events,
  );

  const finalEvent =
    events.at(
      -1,
    );

  if (
    finalEvent ===
      undefined ||
    finalEvent.actionId !==
      record.actionId ||
    finalEvent.versionAfter !==
      record.version ||
    finalEvent.toState !==
      record.state ||
    finalEvent.eventHash !==
      record.lastEventHash
  ) {
    throw new ProofEngineError(
      "INVALID_CANONICAL_VALUE",
      "Verified Action record is not explained by its event chain.",
    );
  }
}
