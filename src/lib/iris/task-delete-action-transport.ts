import {
  listT05Tasks,
  readT05Task,
  readT05TaskHistory,
  readT05TaskManagerStatus,
  readT05UpcomingTasks,
  T05_TASK_CLASS,
  T05_TASK_DESCRIPTION_PREFIX,
  T05_TASK_NAME,
  T05_TASK_PATH,
  T05_TASK_ROLE,
  T05TaskAuthorityDeniedError,
  t05TaskDescription,
  type T05TaskHistoryRow,
  type T05TaskSnapshot,
  type T05TaskSummary,
  type T05UpcomingTaskRow,
} from "./task-resume-action-transport";

export const T06_TASK_ROLE =
  T05_TASK_ROLE;

export const T06_TASK_PATH =
  T05_TASK_PATH;

export const T06_TASK_NAME =
  T05_TASK_NAME;

export const T06_TASK_CLASS =
  T05_TASK_CLASS;

export const T06_TASK_DESCRIPTION_PREFIX =
  T05_TASK_DESCRIPTION_PREFIX;

export type T06TaskSummary =
  T05TaskSummary;

export type T06TaskSnapshot =
  T05TaskSnapshot;

export type T06TaskHistoryRow =
  T05TaskHistoryRow;

export type T06UpcomingTaskRow =
  T05UpcomingTaskRow;

export {
  T05TaskAuthorityDeniedError as T06TaskAuthorityDeniedError,
};

export class T06TaskMutationRejectedError
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
      "T06TaskMutationRejectedError";
  }
}

export class T06TaskMutationUnknownAfterDispatchError
  extends Error {
  constructor(
    message:
      string,
  ) {
    super(
      message,
    );

    this.name =
      "T06TaskMutationUnknownAfterDispatchError";
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
      "T06 task id must be a positive safe integer.",
    );
  }
}

export function t06TaskDescription(
  generation:
    string,
): string {
  return t05TaskDescription(
    generation,
  );
}

export const listT06Tasks =
  listT05Tasks;

export const readT06Task =
  readT05Task;

export const readT06TaskHistory =
  readT05TaskHistory;

export const readT06TaskManagerStatus =
  readT05TaskManagerStatus;

export const readT06UpcomingTasks =
  readT05UpcomingTasks;

export async function deleteT06Task(
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
        T06_TASK_PATH,
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
            "DELETE",

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
    throw new T06TaskMutationUnknownAfterDispatchError(
      (
        "T06 DELETE /v2/task transport ended after dispatch without " +
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
    throw new T05TaskAuthorityDeniedError(
      `T06 delete authority denied with HTTP ${response.status}.`,
    );
  }

  if (
    response.status >=
      500
  ) {
    throw new T06TaskMutationUnknownAfterDispatchError(
      (
        `T06 DELETE /v2/task returned HTTP ${response.status} after dispatch. ` +
        "Automatic retry is forbidden."
      ),
    );
  }

  throw new T06TaskMutationRejectedError(
    response.status,
    `T06 DELETE /v2/task was rejected with HTTP ${response.status}.`,
  );
}
