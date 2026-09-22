import {
  listT01Tasks,
  readT01Task,
  readT01TaskHistory,
  readT01TaskManagerStatus,
  readT01UpcomingTasks,
  T01TaskAuthorityDeniedError,
  type T01TaskHistoryRow,
  type T01TaskSnapshot,
  type T01TaskSummary,
  type T01UpcomingTaskRow,
} from "./task-create-action-transport";

export const T04_TASK_ROLE =
  "MeridianTaskActionExecutor" as const;

export const T04_TASK_PATH =
  "/v2/task" as const;

export const T04_TASK_SUSPEND_PATH =
  "/v2/task/suspend" as const;

export const T04_TASK_NAME =
  "MeridianLab.OrderExporter" as const;

export const T04_TASK_CLASS =
  "MeridianLab.OrderExporter" as const;

export const T04_TASK_DESCRIPTION_PREFIX =
  "Meridian R5 T04-T06 shared task witness" as const;

export const T04_SUSPEND_BODY =
  Object.freeze({
    LeaveInQueue:
      true as const,
  });

export type T04TaskSummary =
  T01TaskSummary;

export type T04TaskSnapshot =
  T01TaskSnapshot;

export type T04TaskHistoryRow =
  T01TaskHistoryRow;

export type T04UpcomingTaskRow =
  T01UpcomingTaskRow;

export { T01TaskAuthorityDeniedError as T04TaskAuthorityDeniedError };

export class T04TaskMutationRejectedError
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
      "T04TaskMutationRejectedError";
  }
}

export class T04TaskMutationUnknownAfterDispatchError
  extends Error {
  constructor(
    message:
      string,
  ) {
    super(
      message,
    );

    this.name =
      "T04TaskMutationUnknownAfterDispatchError";
  }
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

    "Content-Type":
      "application/json",
  };
}

function assertTaskId(
  taskId:
    number,
): void {
  if (
    !Number.isSafeInteger(
      taskId,
    ) ||
    taskId <
      1
  ) {
    throw new Error(
      "T04 task id must be a positive safe integer.",
    );
  }
}

function assertSuspendBody(
  body:
    Readonly<{
      LeaveInQueue:
        true;
    }>,
): void {
  if (
    body.LeaveInQueue !==
      true ||
    Object.keys(
      body,
    ).length !==
      1
  ) {
    throw new Error(
      "T04 suspend body must contain exactly LeaveInQueue=true.",
    );
  }
}

export function t04TaskDescription(
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
      "T04 task description requires a fixture generation.",
    );
  }

  return (
    `${T04_TASK_DESCRIPTION_PREFIX} | generation=${trimmed}`
  );
}

export const listT04Tasks =
  listT01Tasks;

export const readT04Task =
  readT01Task;

export const readT04TaskHistory =
  readT01TaskHistory;

export const readT04TaskManagerStatus =
  readT01TaskManagerStatus;

export const readT04UpcomingTasks =
  readT01UpcomingTasks;

export async function postT04TaskSuspend(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly taskId:
      number;

    readonly body:
      Readonly<{
        LeaveInQueue:
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
  assertTaskId(
    input.taskId,
  );

  assertSuspendBody(
    input.body,
  );

  const fetchImpl =
    input.fetchImpl ??
    fetch;

  const url =
    new URL(
      joinUrl(
        input.apiBaseUrl,
        T04_TASK_SUSPEND_PATH,
      ),
    );

  url.searchParams.set(
    "id",
    String(
      input.taskId,
    ),
  );

  let response:
    Response;

  try {
    response =
      await fetchImpl(
        url,
        {
          method:
            "POST",

          cache:
            "no-store",

          redirect:
            "error",

          headers:
            authorityHeaders(
              input.accessToken,
            ),

          body:
            JSON.stringify(
              input.body,
            ),
        },
      );
  } catch (
    error
  ) {
    throw new T04TaskMutationUnknownAfterDispatchError(
      (
        "T04 POST /v2/task/suspend transport ended after dispatch without " +
        "an authoritative response. Automatic retry is forbidden. " +
        (
          error instanceof Error
            ? error.message
            : "Unknown transport failure."
        )
      ),
    );
  }

  if (
    response.status ===
      200
  ) {
    return Object.freeze({
      status:
        200 as const,

      taskId:
        input.taskId,

      mutationRequestCount:
        1 as const,
    });
  }

  if (
    response.status ===
      401 ||
    response.status ===
      403
  ) {
    throw new T01TaskAuthorityDeniedError(
      `T04 suspend authority denied with HTTP ${response.status}.`,
    );
  }

  if (
    response.status >=
      500
  ) {
    throw new T04TaskMutationUnknownAfterDispatchError(
      (
        `T04 POST /v2/task/suspend returned HTTP ${response.status} after dispatch. ` +
        "Automatic retry is forbidden."
      ),
    );
  }

  throw new T04TaskMutationRejectedError(
    response.status,
    `T04 POST /v2/task/suspend was rejected with HTTP ${response.status}.`,
  );
}
