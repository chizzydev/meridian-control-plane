import {
  type ActionReceiptHistoryRecord,
  validateActionReceiptHistoryRecord,
} from "../proof/action-history";

export const ACTION_RECEIPT_HISTORY_WRITE_PATH =
  "/action-receipts" as const;

export interface ActionReceiptHistoryRequestPlan {
  readonly method:
    "GET" | "POST";

  readonly path:
    string;

  readonly body?:
    ActionReceiptHistoryRecord;
}

function requiredSegment(
  value:
    string,

  label:
    string,
): string {
  const normalized =
    value.trim();

  if (
    normalized.length ===
      0
  ) {
    throw new Error(
      `${label} is required.`,
    );
  }

  return encodeURIComponent(
    normalized,
  );
}

export function actionReceiptHistoryReadPath(
  receiptId:
    string,
): string {
  return (
    "/action-receipts/" +
    requiredSegment(
      receiptId,
      "Action receipt id",
    )
  );
}

export function actionReceiptTargetHistoryPath(
  targetCanonicalId:
    string,
): string {
  const canonicalSegment =
    requiredSegment(
      targetCanonicalId,
      "Action receipt target",
    );

  return (
    "/action-history/" +
    encodeURIComponent(
      canonicalSegment,
    )
  );
}

export function buildActionReceiptHistoryWritePlan(
  record:
    ActionReceiptHistoryRecord,
): ActionReceiptHistoryRequestPlan {
  validateActionReceiptHistoryRecord(
    record,
  );

  return Object.freeze({
    method:
      "POST" as const,

    path:
      ACTION_RECEIPT_HISTORY_WRITE_PATH,

    body:
      record,
  });
}

export function buildActionReceiptHistoryReadPlan(
  receiptId:
    string,
): ActionReceiptHistoryRequestPlan {
  return Object.freeze({
    method:
      "GET" as const,

    path:
      actionReceiptHistoryReadPath(
        receiptId,
      ),
  });
}

export function buildActionReceiptTargetHistoryPlan(
  targetCanonicalId:
    string,
): ActionReceiptHistoryRequestPlan {
  return Object.freeze({
    method:
      "GET" as const,

    path:
      actionReceiptTargetHistoryPath(
        targetCanonicalId,
      ),
  });
}
