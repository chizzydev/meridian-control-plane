import {
  type VerifiedReceiptHistoryRecord,
  validateVerifiedReceiptHistoryRecord,
} from "../change-case/receipt-history";

export const RECEIPT_HISTORY_WRITE_PATH =
  "/receipts" as const;

export interface ReceiptHistoryRequestPlan {
  method:
    "GET" | "POST";

  path:
    string;

  body?:
    VerifiedReceiptHistoryRecord;
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

export function receiptHistoryReadPath(
  receiptId:
    string,
): string {
  return (
    "/receipts/" +
    requiredSegment(
      receiptId,
      "Receipt id",
    )
  );
}

export function receiptHistoryUserPath(
  username:
    string,
): string {
  return (
    "/history/" +
    requiredSegment(
      username,
      "Username",
    )
  );
}

export function buildReceiptHistoryWritePlan(
  record:
    VerifiedReceiptHistoryRecord,
): ReceiptHistoryRequestPlan {
  validateVerifiedReceiptHistoryRecord(
    record,
  );

  return {
    method:
      "POST",

    path:
      RECEIPT_HISTORY_WRITE_PATH,

    body:
      record,
  };
}

export function buildReceiptHistoryReadPlan(
  receiptId:
    string,
): ReceiptHistoryRequestPlan {
  return {
    method:
      "GET",

    path:
      receiptHistoryReadPath(
        receiptId,
      ),
  };
}

export function buildReceiptHistoryUserPlan(
  username:
    string,
): ReceiptHistoryRequestPlan {
  return {
    method:
      "GET",

    path:
      receiptHistoryUserPath(
        username,
      ),
  };
}