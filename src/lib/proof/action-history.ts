import {
  canonicalJson,
} from "./digest";

import {
  assertActionReceiptV2,
  type ActionReceiptV2,
} from "./receipt";

export const ACTION_RECEIPT_HISTORY_SCHEMA_VERSION =
  "meridian.action-receipt-history.v1" as const;

export interface ActionReceiptHistoryRecord {
  readonly schemaVersion:
    typeof ACTION_RECEIPT_HISTORY_SCHEMA_VERSION;

  readonly receiptId:
    string;

  readonly actionId:
    string;

  readonly actionType:
    string;

  readonly domain:
    string;

  readonly targetKind:
    string;

  readonly targetCanonicalId:
    string;

  readonly targetDisplayName:
    string;

  readonly lifecycleState:
    "VERIFIED";

  readonly receiptSha256:
    string;

  readonly receiptJson:
    string;

  readonly applyUtc:
    string;

  readonly applyActor:
    string;
}

export type ActionReceiptHistorySummary =
  Omit<
    ActionReceiptHistoryRecord,
    "receiptJson"
  >;

function invariant(
  condition:
    boolean,

  message:
    string,
): asserts condition {
  if (!condition) {
    throw new Error(
      `Action receipt history invariant failed: ${message}`,
    );
  }
}

function nonEmpty(
  value:
    unknown,

  label:
    string,
): asserts value is string {
  invariant(
    typeof value ===
      "string" &&
      value.trim().length >
        0,
    label,
  );
}

export function validateActionReceiptHistoryRecord(
  value:
    unknown,
): asserts value is ActionReceiptHistoryRecord {
  invariant(
    typeof value ===
      "object" &&
      value !==
        null &&
      !Array.isArray(
        value,
      ),
    "record object",
  );

  const record =
    value as Partial<
      ActionReceiptHistoryRecord
    >;

  invariant(
    record.schemaVersion ===
      ACTION_RECEIPT_HISTORY_SCHEMA_VERSION,
    "schema version",
  );

  nonEmpty(
    record.receiptId,
    "receipt id",
  );

  nonEmpty(
    record.actionId,
    "action id",
  );

  nonEmpty(
    record.actionType,
    "action type",
  );

  nonEmpty(
    record.domain,
    "domain",
  );

  nonEmpty(
    record.targetKind,
    "target kind",
  );

  nonEmpty(
    record.targetCanonicalId,
    "target canonical id",
  );

  nonEmpty(
    record.targetDisplayName,
    "target display name",
  );

  invariant(
    record.lifecycleState ===
      "VERIFIED",
    "lifecycle state",
  );

  nonEmpty(
    record.receiptSha256,
    "receipt SHA-256",
  );

  invariant(
    /^[0-9A-F]{64}$/.test(
      record.receiptSha256,
    ),
    "receipt SHA-256 shape",
  );

  nonEmpty(
    record.receiptJson,
    "receipt JSON",
  );

  nonEmpty(
    record.applyUtc,
    "apply UTC",
  );

  nonEmpty(
    record.applyActor,
    "apply actor",
  );

  let receipt:
    ActionReceiptV2;

  try {
    receipt =
      JSON.parse(
        record.receiptJson,
      ) as ActionReceiptV2;
  }
  catch {
    throw new Error(
      "Action receipt history invariant failed: receipt JSON parse",
    );
  }

  assertActionReceiptV2(
    receipt,
  );

  invariant(
    canonicalJson(
      receipt,
    ) ===
      record.receiptJson,
    "receipt canonical JSON",
  );

  invariant(
    receipt.receiptId ===
      record.receiptId,
    "receipt id binding",
  );

  invariant(
    receipt.actionId ===
      record.actionId,
    "action id binding",
  );

  invariant(
    receipt.actionType ===
      record.actionType,
    "action type binding",
  );

  invariant(
    receipt.domain ===
      record.domain,
    "domain binding",
  );

  invariant(
    receipt.target.kind ===
      record.targetKind,
    "target kind binding",
  );

  invariant(
    receipt.target.canonicalId ===
      record.targetCanonicalId,
    "target canonical id binding",
  );

  invariant(
    receipt.target.displayName ===
      record.targetDisplayName,
    "target display name binding",
  );

  invariant(
    receipt.receiptSha256 ===
      record.receiptSha256,
    "receipt digest binding",
  );

  invariant(
    receipt.lifecycle
      .applyStartedAtUtc ===
      record.applyUtc,
    "apply UTC binding",
  );

  invariant(
    receipt.actor
      .irisRuntimeUser ===
      record.applyActor,
    "apply actor binding",
  );
}

export function actionReceiptV2FromGenericHistory(
  record:
    ActionReceiptHistoryRecord,
): ActionReceiptV2 {
  validateActionReceiptHistoryRecord(
    record,
  );

  const receipt =
    JSON.parse(
      record.receiptJson,
    ) as ActionReceiptV2;

  assertActionReceiptV2(
    receipt,
  );

  return receipt;
}

export function buildActionReceiptHistoryRecord(
  receipt:
    ActionReceiptV2,
): ActionReceiptHistoryRecord {
  assertActionReceiptV2(
    receipt,
  );

  const record:
    ActionReceiptHistoryRecord =
    Object.freeze({
      schemaVersion:
        ACTION_RECEIPT_HISTORY_SCHEMA_VERSION,

      receiptId:
        receipt.receiptId,

      actionId:
        receipt.actionId,

      actionType:
        receipt.actionType,

      domain:
        receipt.domain,

      targetKind:
        receipt.target.kind,

      targetCanonicalId:
        receipt.target
          .canonicalId,

      targetDisplayName:
        receipt.target
          .displayName,

      lifecycleState:
        "VERIFIED" as const,

      receiptSha256:
        receipt.receiptSha256,

      receiptJson:
        canonicalJson(
          receipt,
        ),

      applyUtc:
        receipt.lifecycle
          .applyStartedAtUtc,

      applyActor:
        receipt.actor
          .irisRuntimeUser,
    });

  validateActionReceiptHistoryRecord(
    record,
  );

  return record;
}
