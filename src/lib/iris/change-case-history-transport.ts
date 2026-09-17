import {
  DURABLE_CHANGE_CASE_EVENT_COMMAND_SCHEMA_VERSION,
  type DurableChangeCaseEventMutation,
  type DurableChangeCaseRecord,
} from "../change-case/durable-change-case";

export const DURABLE_CHANGE_CASE_CREATE_PATH =
  "/cases" as const;

export interface ChangeCaseHistoryRequestPlan {
  readonly method:
    "GET" | "POST";

  readonly path:
    string;

  readonly body?:
    unknown;
}

function requiredSegment(
  value:
    string,
  label:
    string,
): string {
  if (
    value.trim().length ===
    0
  ) {
    throw new Error(
      `${label} is required.`,
    );
  }

  return encodeURIComponent(
    value,
  );
}

export function durableChangeCasePath(
  caseId:
    string,
): string {
  return (
    `/cases/${
      requiredSegment(
        caseId,
        "Case id",
      )
    }`
  );
}

export function durableChangeCaseEventsPath(
  caseId:
    string,
): string {
  return (
    `${
      durableChangeCasePath(
        caseId,
      )
    }/events`
  );
}

export function buildDurableChangeCaseCreatePlan(
  record:
    DurableChangeCaseRecord,
): ChangeCaseHistoryRequestPlan {
  return {
    method:
      "POST",

    path:
      DURABLE_CHANGE_CASE_CREATE_PATH,

    body:
      record,
  };
}

export function buildDurableChangeCaseReadPlan(
  caseId:
    string,
): ChangeCaseHistoryRequestPlan {
  return {
    method:
      "GET",

    path:
      durableChangeCasePath(
        caseId,
      ),
  };
}

export function buildDurableChangeCaseEventsReadPlan(
  caseId:
    string,
): ChangeCaseHistoryRequestPlan {
  return {
    method:
      "GET",

    path:
      durableChangeCaseEventsPath(
        caseId,
      ),
  };
}

export function buildDurableChangeCaseAppendPlan(
  mutation:
    DurableChangeCaseEventMutation,
): ChangeCaseHistoryRequestPlan {
  return {
    method:
      "POST",

    path:
      durableChangeCaseEventsPath(
        mutation.record.caseId,
      ),

    body: {
      schemaVersion:
        DURABLE_CHANGE_CASE_EVENT_COMMAND_SCHEMA_VERSION,

      expectedVersion:
        mutation.event.versionBefore,

      eventType:
        mutation.event.eventType,

      occurredAtUtc:
        mutation.event.occurredAtUtc,

      detailJson:
        mutation.event.detailJson,

      record:
        mutation.record,
    },
  };
}
