import "server-only";

import {
  validateDurableChangeCaseSnapshot,
  type DurableChangeCaseEventMutation,
  type DurableChangeCaseRecord,
  type DurableChangeCaseSnapshot,
} from "../change-case/durable-change-case";

import {
  buildDurableChangeCaseAppendPlan,
  buildDurableChangeCaseCreatePlan,
  buildDurableChangeCaseEventsReadPlan,
  buildDurableChangeCaseReadPlan,
  type ChangeCaseHistoryRequestPlan,
} from "./change-case-history-transport";

interface JsonObject {
  [key: string]:
    unknown;
}

export interface DurableChangeCaseHistoryServerInput {
  readonly baseUrl:
    string;

  readonly accessToken:
    string;
}

export class DurableChangeCaseHistoryError extends Error {
  readonly status:
    number;

  readonly code:
    string | null;

  constructor(
    message:
      string,
    status:
      number,
    code:
      string | null,
  ) {
    super(
      message,
    );

    this.name =
      "DurableChangeCaseHistoryError";

    this.status =
      status;

    this.code =
      code;
  }
}

function joinUrl(
  baseUrl:
    string,
  path:
    string,
): string {
  return (
    `${baseUrl.replace(/\/+$/, "")}${
      path.startsWith("/")
        ? path
        : `/${path}`
    }`
  );
}

function objectValue(
  value:
    unknown,
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
      "IRIS durable Change Case response must be an object.",
    );
  }

  return value as JsonObject;
}

async function executePlan(
  input:
    DurableChangeCaseHistoryServerInput & {
      readonly plan:
        ChangeCaseHistoryRequestPlan;

      readonly fetchImpl?:
        typeof fetch;
    },
): Promise<unknown> {
  const fetchImpl =
    input.fetchImpl ??
    fetch;

  const headers:
    Record<string, string> = {
      Accept:
        "application/json",

      Authorization:
        `Bearer ${input.accessToken}`,
    };

  const body =
    input.plan.body ===
    undefined
      ? undefined
      : JSON.stringify(
          input.plan.body,
        );

  if (
    body !==
      undefined
  ) {
    headers["Content-Type"] =
      "application/json";
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

  let parsed:
    unknown = null;

  if (
    text.trim().length >
    0
  ) {
    try {
      parsed =
        JSON.parse(
          text,
        ) as unknown;
    }
    catch {
      throw new DurableChangeCaseHistoryError(
        "IRIS durable Change Case response is not JSON.",
        response.status,
        null,
      );
    }
  }

  if (
    !response.ok
  ) {
    const object =
      (
        typeof parsed ===
          "object" &&
        parsed !==
          null &&
        !Array.isArray(
          parsed,
        )
      )
        ? parsed as JsonObject
        : null;

    const code =
      typeof object?.code ===
        "string"
        ? object.code
        : null;

    const message =
      typeof object?.message ===
        "string"
        ? object.message
        : `IRIS durable Change Case request failed with HTTP ${response.status}.`;

    throw new DurableChangeCaseHistoryError(
      message,
      response.status,
      code,
    );
  }

  return parsed;
}

function snapshotFromResponse(
  raw:
    unknown,
): DurableChangeCaseSnapshot {
  const object =
    objectValue(
      raw,
    );

  const snapshot =
    object.snapshot;

  validateDurableChangeCaseSnapshot(
    snapshot,
  );

  return snapshot;
}

export async function createDurableChangeCase(
  input:
    DurableChangeCaseHistoryServerInput & {
      readonly record:
        DurableChangeCaseRecord;

      readonly fetchImpl?:
        typeof fetch;
    },
): Promise<DurableChangeCaseSnapshot> {
  return snapshotFromResponse(
    await executePlan({
      ...input,

      plan:
        buildDurableChangeCaseCreatePlan(
          input.record,
        ),
    }),
  );
}

export async function readDurableChangeCase(
  input:
    DurableChangeCaseHistoryServerInput & {
      readonly caseId:
        string;

      readonly fetchImpl?:
        typeof fetch;
    },
): Promise<DurableChangeCaseSnapshot> {
  return snapshotFromResponse(
    await executePlan({
      ...input,

      plan:
        buildDurableChangeCaseReadPlan(
          input.caseId,
        ),
    }),
  );
}

export async function appendDurableChangeCaseEvent(
  input:
    DurableChangeCaseHistoryServerInput & {
      readonly mutation:
        DurableChangeCaseEventMutation;

      readonly fetchImpl?:
        typeof fetch;
    },
): Promise<DurableChangeCaseSnapshot> {
  return snapshotFromResponse(
    await executePlan({
      ...input,

      plan:
        buildDurableChangeCaseAppendPlan(
          input.mutation,
        ),
    }),
  );
}

export async function readDurableChangeCaseEvents(
  input:
    DurableChangeCaseHistoryServerInput & {
      readonly caseId:
        string;

      readonly fetchImpl?:
        typeof fetch;
    },
): Promise<
  DurableChangeCaseSnapshot["events"]
> {
  const object =
    objectValue(
      await executePlan({
        ...input,

        plan:
          buildDurableChangeCaseEventsReadPlan(
            input.caseId,
          ),
      }),
    );

  const events =
    object.events;

  if (
    !Array.isArray(
      events,
    )
  ) {
    throw new Error(
      "IRIS durable Change Case journal response is missing events.",
    );
  }

  const snapshot =
    await readDurableChangeCase({
      ...input,
    });

  validateDurableChangeCaseSnapshot({
    record:
      snapshot.record,

    events,
  });

  return events;
}
