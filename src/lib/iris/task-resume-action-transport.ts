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

export const T05_TASK_ROLE =
  "MeridianTaskActionExecutor" as const;

export const T05_TASK_PATH =
  "/v2/task" as const;

export const T05_TASK_RESUME_PATH =
  "/v2/task/resume" as const;

export const T05_TASK_NAME =
  "MeridianLab.OrderExporter" as const;

export const T05_TASK_CLASS =
  "MeridianLab.OrderExporter" as const;

export const T05_TASK_DESCRIPTION_PREFIX =
  "Meridian R5 T04-T06 shared task witness" as const;

export type T05TaskSummary =
  T01TaskSummary;

export type T05TaskSnapshot =
  T01TaskSnapshot;

export type T05TaskHistoryRow =
  T01TaskHistoryRow;

export type T05UpcomingTaskRow =
  T01UpcomingTaskRow;

export { T01TaskAuthorityDeniedError as T05TaskAuthorityDeniedError };

export class T05TaskMutationRejectedError
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
      "T05TaskMutationRejectedError";
  }
}

export class T05TaskMutationUnknownAfterDispatchError
  extends Error {
  constructor(
    message:
      string,
  ) {
    super(
      message,
    );

    this.name =
      "T05TaskMutationUnknownAfterDispatchError";
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
      "T05 task id must be a positive safe integer.",
    );
  }
}

export function t05TaskDescription(
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
      "T05 task description requires a fixture generation.",
    );
  }

  return (
    `${T05_TASK_DESCRIPTION_PREFIX} | generation=${trimmed}`
  );
}

export const listT05Tasks =
  listT01Tasks;

export const readT05Task =
  readT01Task;

export const readT05TaskHistory =
  readT01TaskHistory;

export const readT05TaskManagerStatus =
  readT01TaskManagerStatus;

export const readT05UpcomingTasks =
  readT01UpcomingTasks;

export async function postT05TaskResume(
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

  const fetchImpl =
    input.fetchImpl ??
    fetch;

  const url =
    new URL(
      joinUrl(
        input.apiBaseUrl,
        T05_TASK_RESUME_PATH,
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
        },
      );
  } catch (
    error
  ) {
    throw new T05TaskMutationUnknownAfterDispatchError(
      (
        "T05 POST /v2/task/resume transport ended after dispatch without " +
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
      `T05 resume authority denied with HTTP ${response.status}.`,
    );
  }

  if (
    response.status >=
      500
  ) {
    throw new T05TaskMutationUnknownAfterDispatchError(
      (
        `T05 POST /v2/task/resume returned HTTP ${response.status} after dispatch. ` +
        "Automatic retry is forbidden."
      ),
    );
  }

  throw new T05TaskMutationRejectedError(
    response.status,
    `T05 POST /v2/task/resume was rejected with HTTP ${response.status}.`,
  );
}
