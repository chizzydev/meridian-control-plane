import {
  type RecordedVerifiedReceipt,
  validateRecordedVerifiedReceipt,
} from "./recorded-receipt";

export const RECEIPT_HISTORY_SCHEMA_VERSION =
  "meridian.receipt-history.v1" as const;

export interface VerifiedReceiptHistoryRecord {
  schemaVersion:
    typeof RECEIPT_HISTORY_SCHEMA_VERSION;

  receiptId:
    string;

  username:
    string;

  displayName:
    string;

  operation:
    "ADD" | "REMOVE";

  role:
    string;

  lifecycleState:
    "VERIFIED";

  reviewedPreflightDigest:
    string;

  freshApplyTimePreflightDigest:
    string;

  receiptSha256:
    string;

  receiptJson:
    string;

  applyUtc:
    string;

  applyActor:
    string;

  applyPid:
    number;

  nativeAuditSystemId:
    string;

  nativeAuditIndex:
    number;

  nativeAuditUtc:
    string;

  nativeAuditEvent:
    string;

  nativeAuditActor:
    string;
}

export type ReceiptHistorySummary =
  Omit<
    VerifiedReceiptHistoryRecord,
    "receiptJson"
  >;

const sha256Pattern =
  /^[0-9A-F]{64}$/;

function invariant(
  condition:
    boolean,

  message:
    string,
): asserts condition {
  if (!condition) {
    throw new Error(
      `Receipt history invariant failed: ${message}`,
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

function parseReceiptJson(
  value:
    string,
): {
  receiptId?:
    unknown;

  lifecycleState?:
    unknown;

  change?: {
    username?:
      unknown;

    operation?:
      unknown;

    role?:
      unknown;
  };
} {
  let parsed:
    unknown;

  try {
    parsed =
      JSON.parse(
        value,
      ) as unknown;
  }
  catch {
    throw new Error(
      "Receipt history invariant failed: receipt JSON parse",
    );
  }

  invariant(
    typeof parsed ===
      "object" &&
      parsed !==
        null &&
      !Array.isArray(
        parsed,
      ),
    "receipt JSON object",
  );

  return parsed as {
    receiptId?:
      unknown;

    lifecycleState?:
      unknown;

    change?: {
      username?:
        unknown;

      operation?:
        unknown;

      role?:
        unknown;
    };
  };
}

export function validateVerifiedReceiptHistoryRecord(
  value:
    unknown,
): asserts value is VerifiedReceiptHistoryRecord {
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
      VerifiedReceiptHistoryRecord
    >;

  invariant(
    record.schemaVersion ===
      RECEIPT_HISTORY_SCHEMA_VERSION,
    "schema version",
  );

  nonEmpty(
    record.receiptId,
    "receipt id",
  );

  nonEmpty(
    record.username,
    "username",
  );

  nonEmpty(
    record.displayName,
    "display name",
  );

  invariant(
    record.operation ===
      "ADD" ||
      record.operation ===
        "REMOVE",
    "operation",
  );

  nonEmpty(
    record.role,
    "role",
  );

  invariant(
    record.lifecycleState ===
      "VERIFIED",
    "lifecycle state",
  );

  nonEmpty(
    record.reviewedPreflightDigest,
    "reviewed preflight digest",
  );

  invariant(
    sha256Pattern.test(
      record.reviewedPreflightDigest,
    ),
    "reviewed preflight digest SHA-256",
  );

  nonEmpty(
    record.freshApplyTimePreflightDigest,
    "fresh preflight digest",
  );

  invariant(
    sha256Pattern.test(
      record.freshApplyTimePreflightDigest,
    ),
    "fresh preflight digest SHA-256",
  );

  nonEmpty(
    record.receiptSha256,
    "receipt SHA-256",
  );

  invariant(
    sha256Pattern.test(
      record.receiptSha256,
    ),
    "receipt SHA-256",
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

  invariant(
    typeof record.applyPid ===
      "number" &&
      Number.isInteger(
        record.applyPid,
      ) &&
      record.applyPid >
        0,
    "apply PID",
  );

  nonEmpty(
    record.nativeAuditSystemId,
    "native audit SystemID",
  );

  invariant(
    typeof record.nativeAuditIndex ===
      "number" &&
      Number.isInteger(
        record.nativeAuditIndex,
      ) &&
      record.nativeAuditIndex >
        0,
    "native audit index",
  );

  nonEmpty(
    record.nativeAuditUtc,
    "native audit UTC",
  );

  nonEmpty(
    record.nativeAuditEvent,
    "native audit event",
  );

  nonEmpty(
    record.nativeAuditActor,
    "native audit actor",
  );

  const persistedReceipt =
    parseReceiptJson(
      record.receiptJson,
    );

  invariant(
    persistedReceipt.receiptId ===
      record.receiptId,
    "receipt JSON identity",
  );

  invariant(
    persistedReceipt.lifecycleState ===
      record.lifecycleState,
    "receipt JSON lifecycle",
  );

  invariant(
    persistedReceipt.change
      ?.username ===
      record.username,
    "receipt JSON username",
  );

  invariant(
    persistedReceipt.change
      ?.operation ===
      record.operation,
    "receipt JSON operation",
  );

  invariant(
    persistedReceipt.change
      ?.role ===
      record.role,
    "receipt JSON role",
  );
}

export function buildVerifiedReceiptHistoryRecord(
  input: {
    receipt:
      RecordedVerifiedReceipt;

    receiptJson:
      string;

    receiptSha256:
      string;
  },
): VerifiedReceiptHistoryRecord {
  validateRecordedVerifiedReceipt(
    input.receipt,
  );

  const record:
    VerifiedReceiptHistoryRecord = {
      schemaVersion:
        RECEIPT_HISTORY_SCHEMA_VERSION,

      receiptId:
        input.receipt.receiptId,

      username:
        input.receipt.change.username,

      displayName:
        input.receipt.change.displayName,

      operation:
        input.receipt.change.operation,

      role:
        input.receipt.change.role,

      lifecycleState:
        input.receipt.lifecycleState,

      reviewedPreflightDigest:
        input.receipt.authorization
          .reviewedPreflightDigest,

      freshApplyTimePreflightDigest:
        input.receipt.authorization
          .freshApplyTimePreflightDigest,

      receiptSha256:
        input.receiptSha256,

      receiptJson:
        input.receiptJson,

      applyUtc:
        input.receipt.apply.utcTimestamp,

      applyActor:
        input.receipt.apply.actor,

      applyPid:
        input.receipt.apply.pid,

      nativeAuditSystemId:
        input.receipt.nativeAudit.systemId,

      nativeAuditIndex:
        input.receipt.nativeAudit.auditIndex,

      nativeAuditUtc:
        input.receipt.nativeAudit.utcTimestamp,

      nativeAuditEvent:
        input.receipt.nativeAudit.event,

      nativeAuditActor:
        input.receipt.nativeAudit.username,
    };

  validateVerifiedReceiptHistoryRecord(
    record,
  );

  return record;
}

export function receiptHistorySummary(
  record:
    VerifiedReceiptHistoryRecord,
): ReceiptHistorySummary {
  validateVerifiedReceiptHistoryRecord(
    record,
  );

  const {
    receiptJson:
      _receiptJson,

    ...summary
  } =
    record;

  void _receiptJson;

  return summary;
}