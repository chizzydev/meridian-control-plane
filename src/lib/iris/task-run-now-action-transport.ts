import {
  T02_TASK_ROLE,
  loginT02TaskSession,
  listT02Tasks,
  readT02Task,
  readT02TaskHistory,
  readT02TaskManagerStatus,
  readT02UpcomingTasks,
  type T02EscalatedSession,
  type T02TaskHistoryRow,
  type T02TaskSnapshot,
  type T02TaskSummary,
  type T02UpcomingTaskRow,
} from "./task-update-action-transport";

export const T03_TASK_ROLE =
  T02_TASK_ROLE;

export const T03_TASK_PATH =
  "/v2/task" as const;

export const T03_TASK_RUN_PATH =
  "/v2/task/run" as const;

export const T03_TASK_INFO_PATH =
  "/v2/task/info" as const;

export const T03_TASK_NAME =
  "Meridian R5 T03 Run Now Witness" as const;

export const T03_TASK_CLASS =
  "Meridian.R5.T03.RunNowWitness" as const;

export const T03_TASK_DESCRIPTION_PREFIX =
  "Meridian R5 T03 inert run-now witness" as const;

export const T03_TASK_DESCRIPTION_MAX_LENGTH =
  100 as const;

export const T03_RUN_NOW_BODY =
  Object.freeze({
    RunNow:
      true as const,
  });

export type T03EscalatedSession =
  T02EscalatedSession;

export type T03TaskSummary =
  T02TaskSummary;

export type T03TaskSnapshot =
  T02TaskSnapshot;

export type T03TaskHistoryRow =
  T02TaskHistoryRow;

export type T03UpcomingTaskRow =
  T02UpcomingTaskRow;

export interface T03TaskInfo {
  readonly lastSchedule:
    string;

  readonly lastStarted:
    string;

  readonly lastFinished:
    string;

  readonly status:
    string;

  readonly error:
    string;

  readonly type:
    string;
}

export interface T03TaskDefinition {
  readonly Name:
    typeof T03_TASK_NAME;

  readonly RunAsUser:
    "meridian.runtime";

  readonly EmailOnCompletion:
    readonly string[];

  readonly EmailOnError:
    readonly string[];

  readonly EmailOnExpiration:
    readonly string[];

  readonly EmailOutput:
    false;

  readonly Expires:
    false;

  readonly ExpiresDays:
    0;

  readonly ExpiresHours:
    0;

  readonly ExpiresMinutes:
    0;

  readonly OpenOutputFile:
    false;

  readonly OutputDirectory:
    "";

  readonly OutputFilename:
    "";

  readonly OutputFileIsBinary:
    false;

  readonly SuspendOnError:
    false;

  readonly SuspendTerminated:
    false;

  readonly Priority:
    "Normal";

  readonly TaskClass:
    typeof T03_TASK_CLASS;

  readonly IsBatch:
    false;

  readonly NameSpace:
    "%SYS";

  readonly TimePeriod:
    "On Demand";

  readonly TimePeriodEvery:
    "";

  readonly TimePeriodDay:
    "";

  readonly DailyFrequency:
    "Once";

  readonly DailyFrequencyTime:
    "Hourly";

  readonly DailyIncrement:
    "";

  readonly DailyStartTime:
    "00:00:00";

  readonly DailyEndTime:
    "23:59:59";

  readonly RunAfterGUID:
    "";

  readonly StartDate:
    "2099-12-31";

  readonly EndDate:
    "2099-12-31";

  readonly MirrorStatus:
    "Primary";

  readonly RescheduleOnStart:
    false;

  readonly Description:
    string;

  readonly Settings:
    Readonly<
      Record<
        string,
        never
      >
    >;
}

export class T03TaskAuthorityDeniedError
  extends Error {
  constructor(
    message:
      string,
  ) {
    super(
      message,
    );

    this.name =
      "T03TaskAuthorityDeniedError";
  }
}

export class T03TaskMutationRejectedError
  extends Error {
  constructor(
    readonly status:
      number,
    message:
      string,
  ) {
    super(
      message,
    );

    this.name =
      "T03TaskMutationRejectedError";
  }
}

export class T03TaskMutationUnknownAfterDispatchError
  extends Error {
  constructor(
    message:
      string,
  ) {
    super(
      message,
    );

    this.name =
      "T03TaskMutationUnknownAfterDispatchError";
  }
}

interface JsonRecord {
  readonly [key: string]:
    unknown;
}

function isRecord(
  value:
    unknown,
): value is JsonRecord {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}

function parsedJson(
  text:
    string,
  label:
    string,
): unknown {
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
  } catch {
    throw new Error(
      `${label} returned non-JSON content.`,
    );
  }
}

function resultValue(
  value:
    unknown,
): unknown {
  if (
    !isRecord(
      value,
    )
  ) {
    throw new Error(
      "IRIS T03 response is not an object.",
    );
  }

  return (
    Object.prototype.hasOwnProperty.call(
      value,
      "result",
    )
      ? value.result
      : value
  );
}

function resultObject(
  value:
    unknown,
): JsonRecord {
  const result =
    resultValue(
      value,
    );

  if (
    !isRecord(
      result,
    )
  ) {
    throw new Error(
      "IRIS T03 result is not an object.",
    );
  }

  return result;
}

function first(
  value:
    JsonRecord,
  keys:
    readonly string[],
): unknown {
  for (
    const key
    of keys
  ) {
    if (
      Object.prototype.hasOwnProperty.call(
        value,
        key,
      )
    ) {
      return value[
        key
      ];
    }
  }

  return undefined;
}

function stringValue(
  value:
    unknown,
): string {
  return (
    typeof value ===
      "string"
      ? value.trim()
      : (
          typeof value ===
            "number" ||
          typeof value ===
            "boolean"
        )
          ? String(
              value,
            )
          : ""
  );
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

function authorityHeaders(
  accessToken:
    string,
): HeadersInit {
  return {
    Accept:
      "application/json",

    Authorization:
      `Bearer ${accessToken}`,
  };
}

export function t03TaskDescription(
  generation:
    string,
): string {
  const trimmed =
    generation.trim();

  if (
    trimmed.length ===
      0
  ) {
    throw new Error(
      "T03 task description requires a fixture generation.",
    );
  }

  return (
    `${T03_TASK_DESCRIPTION_PREFIX} | generation=${trimmed}`
      .slice(
        0,
        T03_TASK_DESCRIPTION_MAX_LENGTH,
      )
  );
}

export function t03TaskDefinition(
  generation:
    string,
): T03TaskDefinition {
  const trimmed =
    generation.trim();

  if (
    trimmed.length ===
      0
  ) {
    throw new Error(
      "T03 task definition requires a fixture generation.",
    );
  }

  return Object.freeze({
    Name:
      T03_TASK_NAME,

    RunAsUser:
      "meridian.runtime" as const,

    EmailOnCompletion:
      Object.freeze([]),

    EmailOnError:
      Object.freeze([]),

    EmailOnExpiration:
      Object.freeze([]),

    EmailOutput:
      false as const,

    Expires:
      false as const,

    ExpiresDays:
      0 as const,

    ExpiresHours:
      0 as const,

    ExpiresMinutes:
      0 as const,

    OpenOutputFile:
      false as const,

    OutputDirectory:
      "" as const,

    OutputFilename:
      "" as const,

    OutputFileIsBinary:
      false as const,

    SuspendOnError:
      false as const,

    SuspendTerminated:
      false as const,

    Priority:
      "Normal" as const,

    TaskClass:
      T03_TASK_CLASS,

    IsBatch:
      false as const,

    NameSpace:
      "%SYS" as const,

    TimePeriod:
      "On Demand" as const,

    TimePeriodEvery:
      "" as const,

    TimePeriodDay:
      "" as const,

    DailyFrequency:
      "Once" as const,

    DailyFrequencyTime:
      "Hourly" as const,

    DailyIncrement:
      "" as const,

    DailyStartTime:
      "00:00:00" as const,

    DailyEndTime:
      "23:59:59" as const,

    RunAfterGUID:
      "" as const,

    StartDate:
      "2099-12-31" as const,

    EndDate:
      "2099-12-31" as const,

    MirrorStatus:
      "Primary" as const,

    RescheduleOnStart:
      false as const,

    Description:
      t03TaskDescription(
        trimmed,
      ),

    Settings:
      Object.freeze({}),
  });
}

export async function loginT03TaskSession(
  input: {
    readonly apiBaseUrl:
      string;

    readonly username:
      "meridian.runtime";

    readonly password:
      string;

    readonly fetchImpl?:
      typeof fetch;
  },
): Promise<T03EscalatedSession> {
  try {
    return await loginT02TaskSession(
      input,
    );
  } catch (
    error
  ) {
    if (
      error instanceof Error &&
      error.name ===
        "T02TaskAuthorityDeniedError"
    ) {
      throw new T03TaskAuthorityDeniedError(
        error.message.replace(
          /\bT02\b/g,
          "T03",
        ),
      );
    }

    throw error;
  }
}

export async function listT03Tasks(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly fetchImpl?:
      typeof fetch;
  },
): Promise<
  readonly T03TaskSummary[]
> {
  return listT02Tasks(
    input,
  );
}

export async function readT03Task(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly taskId:
      number;

    readonly fetchImpl?:
      typeof fetch;
  },
): Promise<
  T03TaskSnapshot |
  null
> {
  return readT02Task(
    input,
  );
}

export async function readT03TaskHistory(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly taskId:
      number;

    readonly fetchImpl?:
      typeof fetch;
  },
): Promise<
  readonly T03TaskHistoryRow[]
> {
  return readT02TaskHistory(
    input,
  );
}

export async function readT03TaskManagerStatus(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly fetchImpl?:
      typeof fetch;
  },
): Promise<string> {
  return readT02TaskManagerStatus(
    input,
  );
}

export async function readT03UpcomingTasks(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly fetchImpl?:
      typeof fetch;
  },
): Promise<
  readonly T03UpcomingTaskRow[]
> {
  return readT02UpcomingTasks(
    input,
  );
}

export async function readT03TaskInfo(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly taskId:
      number;

    readonly fetchImpl?:
      typeof fetch;
  },
): Promise<T03TaskInfo> {
  if (
    !Number.isSafeInteger(
      input.taskId,
    ) ||
    input.taskId <
      1
  ) {
    throw new Error(
      "T03 task info requires one positive task id.",
    );
  }

  const fetchImpl =
    input.fetchImpl ??
    fetch;

  const response =
    await fetchImpl(
      joinUrl(
        input.apiBaseUrl,
        `${T03_TASK_INFO_PATH}?id=${encodeURIComponent(String(input.taskId))}`,
      ),
      {
        method:
          "GET",

        cache:
          "no-store",

        redirect:
          "error",

        headers:
          authorityHeaders(
            input.accessToken,
          ),
      },
    );

  const text =
    await response.text();

  if (
    response.status ===
      401 ||
    response.status ===
      403
  ) {
    throw new T03TaskAuthorityDeniedError(
      `T03 task info denied with HTTP ${response.status}.`,
    );
  }

  if (
    !response.ok
  ) {
    throw new Error(
      `T03 task info returned HTTP ${response.status}. Body=${text.slice(0, 500)}`,
    );
  }

  const result =
    resultObject(
      parsedJson(
        text,
        "T03 task info",
      ),
    );

  return Object.freeze({
    lastSchedule:
      stringValue(
        first(
          result,
          [
            "LastSchedule",
            "lastSchedule",
          ],
        ),
      ),

    lastStarted:
      stringValue(
        first(
          result,
          [
            "LastStarted",
            "lastStarted",
          ],
        ),
      ),

    lastFinished:
      stringValue(
        first(
          result,
          [
            "LastFinished",
            "lastFinished",
          ],
        ),
      ),

    status:
      stringValue(
        first(
          result,
          [
            "Status",
            "status",
          ],
        ),
      ),

    error:
      stringValue(
        first(
          result,
          [
            "Error",
            "error",
          ],
        ),
      ),

    type:
      stringValue(
        first(
          result,
          [
            "Type",
            "type",
          ],
        ),
      ),
  });
}

export async function postT03TaskRunNow(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly taskId:
      number;

    readonly body:
      Readonly<{
        RunNow:
          true;
      }>;

    readonly fetchImpl?:
      typeof fetch;
  },
): Promise<
  Readonly<{
    status:
      200;

    taskId:
      number;

    mutationRequestCount:
      1;
  }>
> {
  if (
    !Number.isSafeInteger(
      input.taskId,
    ) ||
    input.taskId <
      1
  ) {
    throw new Error(
      "T03 run-now requires one positive reviewed task id.",
    );
  }

  const bodyKeys =
    Object.keys(
      input.body,
    );

  if (
    bodyKeys.length !==
      1 ||
    bodyKeys[0] !==
      "RunNow" ||
    input.body.RunNow !==
      true
  ) {
    throw new Error(
      "T03 run-now body must contain exactly RunNow=true.",
    );
  }

  const fetchImpl =
    input.fetchImpl ??
    fetch;

  let response:
    Response;

  try {
    response =
      await fetchImpl(
        joinUrl(
          input.apiBaseUrl,
          `${T03_TASK_RUN_PATH}?id=${encodeURIComponent(String(input.taskId))}`,
        ),
        {
          method:
            "POST",

          cache:
            "no-store",

          redirect:
            "error",

          headers: {
            ...authorityHeaders(
              input.accessToken,
            ),

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              input.body,
            ),
        },
      );
  } catch (
    error
  ) {
    throw new T03TaskMutationUnknownAfterDispatchError(
      (
        "Official SysAdmin POST /v2/task/run transport ended without an authoritative response. " +
        "Automatic retry is forbidden. " +
        (
          error instanceof Error
            ? error.message
            : "Unknown transport failure."
        )
      ),
    );
  }

  const text =
    await response.text();

  if (
    response.status ===
      401 ||
    response.status ===
      403
  ) {
    throw new T03TaskMutationRejectedError(
      response.status,
      `T03 authority rejected by SysAdmin API with HTTP ${response.status}.`,
    );
  }

  if (
    response.status >=
      500
  ) {
    throw new T03TaskMutationUnknownAfterDispatchError(
      `Official SysAdmin POST /v2/task/run returned HTTP ${response.status}; execution outcome requires authoritative reconciliation. Body=${text.slice(0, 500)}`,
    );
  }

  if (
    !response.ok
  ) {
    throw new T03TaskMutationRejectedError(
      response.status,
      `Official SysAdmin POST /v2/task/run rejected T03 with HTTP ${response.status}. Body=${text.slice(0, 500)}`,
    );
  }

  if (
    response.status !==
      200
  ) {
    throw new T03TaskMutationUnknownAfterDispatchError(
      `Official SysAdmin POST /v2/task/run returned unexpected success status ${response.status}.`,
    );
  }

  return Object.freeze({
    status:
      200 as const,

    taskId:
      input.taskId,

    mutationRequestCount:
      1 as const,
  });
}
