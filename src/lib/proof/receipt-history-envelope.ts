import {
  RECEIPT_HISTORY_SCHEMA_VERSION,
  type VerifiedReceiptHistoryRecord,
  validateVerifiedReceiptHistoryRecord,
} from "../change-case/receipt-history";

import {
  canonicalJson,
  digestCanonicalJson,
} from "./digest";

import {
  assertActionReceiptV2,
  type ActionReceiptV2,
} from "./receipt";

export const ACTION_RECEIPT_HISTORY_ENVELOPE_SCHEMA_VERSION =
  "meridian.action-receipt-history-envelope.v1" as const;

export interface ActionReceiptHistoryBinding {
  readonly username:
    string;

  readonly displayName:
    string;

  readonly operation:
    "ADD" | "REMOVE";

  readonly role:
    string;

  readonly applyPid:
    number;

  readonly nativeAuditSystemId:
    string;

  readonly nativeAuditIndex:
    number;

  readonly nativeAuditUtc:
    string;

  readonly nativeAuditEvent:
    string;

  readonly nativeAuditActor:
    string;
}

interface ActionReceiptHistoryEnvelope {
  readonly schemaVersion:
    typeof ACTION_RECEIPT_HISTORY_ENVELOPE_SCHEMA_VERSION;

  readonly receiptId:
    string;

  readonly lifecycleState:
    "VERIFIED";

  readonly change: {
    readonly username:
      string;

    readonly displayName:
      string;

    readonly operation:
      "ADD" | "REMOVE";

    readonly role:
      string;
  };

  readonly actionReceiptV2:
    ActionReceiptV2;
}

function nonEmpty(
  value:
    string,
  label:
    string,
): void {
  if (
    value.trim().length ===
      0
  ) {
    throw new Error(
      `${label} is required.`,
    );
  }
}

function assertBinding(
  binding:
    ActionReceiptHistoryBinding,
): void {
  nonEmpty(
    binding.username,
    "History username",
  );

  nonEmpty(
    binding.displayName,
    "History display name",
  );

  nonEmpty(
    binding.role,
    "History role",
  );

  nonEmpty(
    binding.nativeAuditSystemId,
    "Native audit SystemID",
  );

  nonEmpty(
    binding.nativeAuditUtc,
    "Native audit UTC",
  );

  nonEmpty(
    binding.nativeAuditEvent,
    "Native audit event",
  );

  nonEmpty(
    binding.nativeAuditActor,
    "Native audit actor",
  );

  if (
    !Number.isSafeInteger(
      binding.applyPid,
    ) ||
    binding.applyPid <
      1 ||
    !Number.isSafeInteger(
      binding.nativeAuditIndex,
    ) ||
    binding.nativeAuditIndex <
      1
  ) {
    throw new Error(
      "Action receipt history binding numeric identity is invalid.",
    );
  }
}

function envelopeFor(
  receipt:
    ActionReceiptV2,
  binding:
    ActionReceiptHistoryBinding,
): ActionReceiptHistoryEnvelope {
  return Object.freeze({
    schemaVersion:
      ACTION_RECEIPT_HISTORY_ENVELOPE_SCHEMA_VERSION,

    receiptId:
      receipt.receiptId,

    lifecycleState:
      "VERIFIED" as const,

    change:
      Object.freeze({
        username:
          binding.username,

        displayName:
          binding.displayName,

        operation:
          binding.operation,

        role:
          binding.role,
      }),

    actionReceiptV2:
      receipt,
  });
}

export function buildActionReceiptHistoryEnvelopeRecord(
  input: {
    readonly receipt:
      ActionReceiptV2;

    readonly binding:
      ActionReceiptHistoryBinding;
  },
): VerifiedReceiptHistoryRecord {
  assertActionReceiptV2(
    input.receipt,
  );

  assertBinding(
    input.binding,
  );

  const envelope =
    envelopeFor(
      input.receipt,
      input.binding,
    );

  const receiptJson =
    canonicalJson(
      envelope,
    );

  const receiptSha256 =
    digestCanonicalJson(
      envelope,
    );

  const record:
    VerifiedReceiptHistoryRecord = {
      schemaVersion:
        RECEIPT_HISTORY_SCHEMA_VERSION,

      receiptId:
        input.receipt.receiptId,

      username:
        input.binding.username,

      displayName:
        input.binding.displayName,

      operation:
        input.binding.operation,

      role:
        input.binding.role,

      lifecycleState:
        "VERIFIED",

      reviewedPreflightDigest:
        input.receipt.reviewedPreflightDigest,

      freshApplyTimePreflightDigest:
        input.receipt.freshRevalidationDigest,

      receiptSha256,

      receiptJson,

      applyUtc:
        input.receipt.lifecycle
          .applyStartedAtUtc,

      applyActor:
        input.receipt.actor
          .irisRuntimeUser,

      applyPid:
        input.binding.applyPid,

      nativeAuditSystemId:
        input.binding
          .nativeAuditSystemId,

      nativeAuditIndex:
        input.binding
          .nativeAuditIndex,

      nativeAuditUtc:
        input.binding.nativeAuditUtc,

      nativeAuditEvent:
        input.binding
          .nativeAuditEvent,

      nativeAuditActor:
        input.binding
          .nativeAuditActor,
    };

  validateVerifiedReceiptHistoryRecord(
    record,
  );

  return record;
}

function objectValue(
  value:
    unknown,
  label:
    string,
): Record<
  string,
  unknown
> {
  if (
    typeof value !==
      "object" ||
    value ===
      null ||
    Array.isArray(
      value,
    )
  ) {
    throw new Error(
      `${label} is not an object.`,
    );
  }

  return value as
    Record<
      string,
      unknown
    >;
}

export function actionReceiptV2FromHistoryRecord(
  record:
    VerifiedReceiptHistoryRecord,
): ActionReceiptV2 {
  validateVerifiedReceiptHistoryRecord(
    record,
  );

  let parsed:
    unknown;

  try {
    parsed =
      JSON.parse(
        record.receiptJson,
      ) as unknown;
  } catch {
    throw new Error(
      "Action receipt history envelope JSON is invalid.",
    );
  }

  const envelope =
    objectValue(
      parsed,
      "Action receipt history envelope",
    );

  if (
    envelope.schemaVersion !==
      ACTION_RECEIPT_HISTORY_ENVELOPE_SCHEMA_VERSION ||
    envelope.receiptId !==
      record.receiptId ||
    envelope.lifecycleState !==
      "VERIFIED"
  ) {
    throw new Error(
      "Action receipt history envelope identity is invalid.",
    );
  }

  const change =
    objectValue(
      envelope.change,
      "Action receipt history change",
    );

  if (
    change.username !==
      record.username ||
    change.displayName !==
      record.displayName ||
    change.operation !==
      record.operation ||
    change.role !==
      record.role
  ) {
    throw new Error(
      "Action receipt history envelope change identity differs from its summary.",
    );
  }

  const receipt =
    envelope.actionReceiptV2 as
      ActionReceiptV2;

  assertActionReceiptV2(
    receipt,
  );

  if (
    receipt.receiptId !==
      record.receiptId ||
    receipt.reviewedPreflightDigest !==
      record.reviewedPreflightDigest ||
    receipt.freshRevalidationDigest !==
      record.freshApplyTimePreflightDigest ||
    receipt.lifecycle
      .applyStartedAtUtc !==
      record.applyUtc ||
    receipt.actor
      .irisRuntimeUser !==
      record.applyActor
  ) {
    throw new Error(
      "Action Receipt V2 identity differs from its durable history envelope.",
    );
  }

  const expectedEnvelopeDigest =
    digestCanonicalJson(
      envelope,
    );

  if (
    record.receiptSha256 !==
      expectedEnvelopeDigest
  ) {
    throw new Error(
      "Durable action receipt history envelope digest does not match its content.",
    );
  }

  return receipt;
}
