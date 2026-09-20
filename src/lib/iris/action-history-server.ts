import {
  type ActionReceiptHistoryRecord,
  type ActionReceiptHistorySummary,
  validateActionReceiptHistoryRecord,
} from "../proof/action-history";

import {
  buildActionReceiptHistoryReadPlan,
  buildActionReceiptHistoryWritePlan,
  buildActionReceiptTargetHistoryPlan,
  type ActionReceiptHistoryRequestPlan,
} from "./action-history-transport";

interface JsonRecord {
  readonly [key: string]:
    unknown;
}

function objectValue(
  value:
    unknown,

  label:
    string,
): JsonRecord {
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

  return value as JsonRecord;
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

  return value;
}

function summaryFromUnknown(
  value:
    unknown,
): ActionReceiptHistorySummary {
  const object =
    objectValue(
      value,
      "Action receipt history summary",
    );

  const record:
    ActionReceiptHistoryRecord = {
      schemaVersion:
        "meridian.action-receipt-history.v1",

      receiptId:
        requiredString(
          object.receiptId,
          "Action receipt id",
        ),

      actionId:
        requiredString(
          object.actionId,
          "Action id",
        ),

      actionType:
        requiredString(
          object.actionType,
          "Action type",
        ),

      domain:
        requiredString(
          object.domain,
          "Action domain",
        ),

      targetKind:
        requiredString(
          object.targetKind,
          "Target kind",
        ),

      targetCanonicalId:
        requiredString(
          object.targetCanonicalId,
          "Target canonical id",
        ),

      targetDisplayName:
        requiredString(
          object.targetDisplayName,
          "Target display name",
        ),

      lifecycleState:
        "VERIFIED",

      receiptSha256:
        requiredString(
          object.receiptSha256,
          "Action receipt SHA-256",
        ),

      receiptJson:
        "{}",

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
    };

  if (
    object.schemaVersion !==
      "meridian.action-receipt-history.v1" ||
    object.lifecycleState !==
      "VERIFIED"
  ) {
    throw new Error(
      "Action receipt history summary identity is invalid.",
    );
  }

  const {
    receiptJson:
      _receiptJson,

    ...summary
  } =
    record;

  void _receiptJson;

  return Object.freeze(
    summary,
  );
}

async function executePlan(
  input: {
    readonly baseUrl:
      string;

    readonly accessToken:
      string;

    readonly plan:
      ActionReceiptHistoryRequestPlan;

    readonly fetchImpl?:
      typeof fetch;
  },
): Promise<unknown> {
  const fetchImpl =
    input.fetchImpl ??
    fetch;

  const headers =
    new Headers({
      Accept:
        "application/json",

      Authorization:
        `Bearer ${input.accessToken}`,
    });

  let body:
    string |
    undefined;

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
      input.baseUrl.replace(
        /\/+$/,
        "",
      ) +
        input.plan.path,
      {
        method:
          input.plan.method,
        headers,
        body,
        cache:
          "no-store",
      },
    );

  const text =
    await response.text();

  if (!response.ok) {
    let code =
      `HTTP_${response.status}`;

    try {
      const errorPayload =
        objectValue(
          JSON.parse(
            text,
          ) as unknown,
          "Action receipt history error",
        );

      if (
        typeof errorPayload.code ===
          "string"
      ) {
        code =
          errorPayload.code;
      }
    }
    catch {
    }

    throw new Error(
      `Action receipt history request failed: ${code}.`,
    );
  }

  if (
    text.trim().length ===
      0
  ) {
    return {};
  }

  try {
    return JSON.parse(
      text,
    ) as unknown;
  }
  catch {
    throw new Error(
      "Action receipt history response is not valid JSON.",
    );
  }
}

export async function persistActionReceiptHistory(
  input: {
    readonly baseUrl:
      string;

    readonly accessToken:
      string;

    readonly record:
      ActionReceiptHistoryRecord;

    readonly fetchImpl?:
      typeof fetch;
  },
): Promise<
  Readonly<{
    status:
      "CREATED" |
      "IDEMPOTENT";

    record:
      ActionReceiptHistorySummary;
  }>
> {
  const raw =
    await executePlan({
      ...input,

      plan:
        buildActionReceiptHistoryWritePlan(
          input.record,
        ),
    });

  const object =
    objectValue(
      raw,
      "Action receipt history write response",
    );

  const status =
    requiredString(
      object.status,
      "Action receipt history write status",
    );

  if (
    status !==
      "CREATED" &&
    status !==
      "IDEMPOTENT"
  ) {
    throw new Error(
      `Unsupported action receipt history write status: ${status}`,
    );
  }

  return Object.freeze({
    status,

    record:
      summaryFromUnknown(
        object.record,
      ),
  });
}

export async function readActionReceiptHistory(
  input: {
    readonly baseUrl:
      string;

    readonly accessToken:
      string;

    readonly receiptId:
      string;

    readonly fetchImpl?:
      typeof fetch;
  },
): Promise<
  ActionReceiptHistoryRecord
> {
  const raw =
    await executePlan({
      ...input,

      plan:
        buildActionReceiptHistoryReadPlan(
          input.receiptId,
        ),
    });

  const object =
    objectValue(
      raw,
      "Action receipt history read response",
    );

  const record =
    object.record;

  validateActionReceiptHistoryRecord(
    record,
  );

  return record;
}

export async function readTargetActionHistory(
  input: {
    readonly baseUrl:
      string;

    readonly accessToken:
      string;

    readonly targetCanonicalId:
      string;

    readonly fetchImpl?:
      typeof fetch;
  },
): Promise<
  readonly ActionReceiptHistorySummary[]
> {
  const raw =
    await executePlan({
      ...input,

      plan:
        buildActionReceiptTargetHistoryPlan(
          input.targetCanonicalId,
        ),
    });

  const object =
    objectValue(
      raw,
      "Action target history response",
    );

  if (
    !Array.isArray(
      object.records,
    )
  ) {
    throw new Error(
      "Action target history records are missing.",
    );
  }

  return Object.freeze(
    object.records.map(
      (
        record,
      ) =>
        summaryFromUnknown(
          record,
        ),
    ),
  );
}
