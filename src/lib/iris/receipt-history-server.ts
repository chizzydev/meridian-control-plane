import "server-only";

import {
  type ReceiptHistorySummary,
  type VerifiedReceiptHistoryRecord,
  validateVerifiedReceiptHistoryRecord,
} from "../change-case/receipt-history";

import {
  buildReceiptHistoryReadPlan,
  buildReceiptHistoryUserPlan,
  buildReceiptHistoryWritePlan,
  type ReceiptHistoryRequestPlan,
} from "./receipt-history-transport";

interface JsonObject {
  [key: string]:
    unknown;
}

export interface ReceiptHistoryServerInput {
  baseUrl:
    string;

  accessToken:
    string;
}

export interface PersistReceiptHistoryResult {
  status:
    "CREATED" | "IDEMPOTENT";

  record:
    ReceiptHistorySummary;
}

function joinUrl(
  baseUrl:
    string,

  path:
    string,
): string {
  return (
    baseUrl.replace(
      /\/+$/,
      "",
    ) +
    path
  );
}

function objectValue(
  value:
    unknown,

  label:
    string,
): JsonObject {
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

  return value as JsonObject;
}

function requiredString(
  value:
    unknown,

  label:
    string,
): string {
  if (
    typeof value !==
      "string" ||
    value.trim().length ===
      0
  ) {
    throw new Error(
      `${label} is missing.`,
    );
  }

  return value.trim();
}

function summaryFromUnknown(
  value:
    unknown,
): ReceiptHistorySummary {
  const object =
    objectValue(
      value,
      "Receipt history summary",
    );

  const summary:
    ReceiptHistorySummary = {
      schemaVersion:
        requiredString(
          object.schemaVersion,
          "History schema version",
        ) as ReceiptHistorySummary["schemaVersion"],

      receiptId:
        requiredString(
          object.receiptId,
          "Receipt id",
        ),

      username:
        requiredString(
          object.username,
          "Username",
        ),

      displayName:
        requiredString(
          object.displayName,
          "Display name",
        ),

      operation:
        requiredString(
          object.operation,
          "Operation",
        ) as ReceiptHistorySummary["operation"],

      role:
        requiredString(
          object.role,
          "Role",
        ),

      lifecycleState:
        requiredString(
          object.lifecycleState,
          "Lifecycle state",
        ) as ReceiptHistorySummary["lifecycleState"],

      reviewedPreflightDigest:
        requiredString(
          object.reviewedPreflightDigest,
          "Reviewed preflight digest",
        ),

      freshApplyTimePreflightDigest:
        requiredString(
          object.freshApplyTimePreflightDigest,
          "Fresh preflight digest",
        ),

      receiptSha256:
        requiredString(
          object.receiptSha256,
          "Receipt SHA-256",
        ),

      applyUtc:
        requiredString(
          object.applyUtc,
          "Apply UTC",
        ),

      applyActor:
        requiredString(
          object.applyActor,
          "Apply actor",
        ),

      applyPid:
        Number(
          object.applyPid,
        ),

      nativeAuditSystemId:
        requiredString(
          object.nativeAuditSystemId,
          "Native audit SystemID",
        ),

      nativeAuditIndex:
        Number(
          object.nativeAuditIndex,
        ),

      nativeAuditUtc:
        requiredString(
          object.nativeAuditUtc,
          "Native audit UTC",
        ),

      nativeAuditEvent:
        requiredString(
          object.nativeAuditEvent,
          "Native audit event",
        ),

      nativeAuditActor:
        requiredString(
          object.nativeAuditActor,
          "Native audit actor",
        ),
    };

  const synthetic:
    VerifiedReceiptHistoryRecord = {
      ...summary,

      receiptJson:
        JSON.stringify({
          receiptId:
            summary.receiptId,

          lifecycleState:
            summary.lifecycleState,

          change: {
            username:
              summary.username,

            operation:
              summary.operation,

            role:
              summary.role,
          },
        }),
    };

  validateVerifiedReceiptHistoryRecord(
    synthetic,
  );

  return summary;
}

async function executePlan(
  input:
    ReceiptHistoryServerInput & {
      plan:
        ReceiptHistoryRequestPlan;

      fetchImpl?:
        typeof fetch;
    },
): Promise<unknown> {
  const fetchImpl =
    input.fetchImpl ??
    globalThis.fetch.bind(
      globalThis,
    );

  const headers =
    new Headers({
      Accept:
        "application/json",

      Authorization:
        `Bearer ${input.accessToken}`,
    });

  let body:
    string | undefined;

  if (
    input.plan.body !==
      undefined
  ) {
    headers.set(
      "Content-Type",
      "application/json",
    );

    body =
      JSON.stringify(
        input.plan.body,
      );
  }

  const response =
    await fetchImpl(
      joinUrl(
        input.baseUrl,
        input.plan.path,
      ),
      {
        method:
          input.plan.method,

        headers,

        body,

        cache:
          "no-store",

        redirect:
          "error",
      },
    );

  const text =
    await response.text();

  if (
    !response.ok
  ) {
    throw new Error(
      `IRIS receipt-history request failed with HTTP ${response.status}.`,
    );
  }

  if (
    text.trim().length ===
      0
  ) {
    throw new Error(
      "IRIS receipt-history response is empty.",
    );
  }

  try {
    return JSON.parse(
      text,
    ) as unknown;
  }
  catch {
    throw new Error(
      "IRIS receipt-history response is not JSON.",
    );
  }
}

export async function persistVerifiedReceiptHistory(
  input:
    ReceiptHistoryServerInput & {
      record:
        VerifiedReceiptHistoryRecord;

      fetchImpl?:
        typeof fetch;
    },
): Promise<
  PersistReceiptHistoryResult
> {
  const raw =
    await executePlan({
      ...input,

      plan:
        buildReceiptHistoryWritePlan(
          input.record,
        ),
    });

  const object =
    objectValue(
      raw,
      "Receipt history write response",
    );

  const status =
    requiredString(
      object.status,
      "Receipt history write status",
    );

  if (
    status !==
      "CREATED" &&
    status !==
      "IDEMPOTENT"
  ) {
    throw new Error(
      `Unsupported receipt-history write status: ${status}`,
    );
  }

  return {
    status,

    record:
      summaryFromUnknown(
        object.record,
      ),
  };
}

export async function readVerifiedReceiptHistory(
  input:
    ReceiptHistoryServerInput & {
      receiptId:
        string;

      fetchImpl?:
        typeof fetch;
    },
): Promise<
  VerifiedReceiptHistoryRecord
> {
  const raw =
    await executePlan({
      ...input,

      plan:
        buildReceiptHistoryReadPlan(
          input.receiptId,
        ),
    });

  const object =
    objectValue(
      raw,
      "Receipt history read response",
    );

  const record =
    object.record;

  validateVerifiedReceiptHistoryRecord(
    record,
  );

  return record;
}

export async function readUserReceiptHistory(
  input:
    ReceiptHistoryServerInput & {
      username:
        string;

      fetchImpl?:
        typeof fetch;
    },
): Promise<
  ReceiptHistorySummary[]
> {
  const raw =
    await executePlan({
      ...input,

      plan:
        buildReceiptHistoryUserPlan(
          input.username,
        ),
    });

  const object =
    objectValue(
      raw,
      "Receipt history list response",
    );

  if (
    !Array.isArray(
      object.records,
    )
  ) {
    throw new Error(
      "Receipt history list is missing.",
    );
  }

  return object.records.map(
    (record) =>
      summaryFromUnknown(
        record,
      ),
  );
}