import "server-only";

import {
  logoutIris,
} from "./transport";

const TASK_ROLE =
  "MeridianTaskMetadataReader";

const DEFAULT_API_BASE =
  "http://localhost:52773/api/admin";

const DEFAULT_RUNTIME_USER =
  "meridian.runtime";

interface JsonRecord {
  readonly [key: string]:
    unknown;
}

interface EscalatedSession {
  readonly accessToken:
    string;

  readonly refreshToken:
    string;
}

export interface TaskSummary {
  readonly id:
    number;

  readonly name:
    string;

  readonly type:
    string;

  readonly namespace:
    string;

  readonly description:
    string;

  readonly suspended:
    boolean;

  readonly lastFinished:
    string;

  readonly nextScheduled:
    string;
}

export interface UpcomingTaskSummary {
  readonly id:
    number;

  readonly name:
    string;

  readonly namespace:
    string;

  readonly datetime:
    string;

  readonly suspended:
    boolean;
}

export interface TaskHistorySummary {
  readonly taskId:
    number;

  readonly name:
    string;

  readonly namespace:
    string;

  readonly lastStart:
    string;

  readonly completed:
    string;

  readonly status:
    string;

  readonly result:
    string;
}

export interface AvailableTaskManagementSurface {
  readonly status:
    "available";

  readonly authority: {
    readonly role:
      typeof TASK_ROLE;

    readonly explicitEscalation:
      true;

    readonly defaultRuntimeBroadened:
      false;

    readonly adminOperateGranted:
      false;
  };

  readonly managerStatus:
    string;

  readonly tasks:
    readonly TaskSummary[];

  readonly upcoming:
    readonly UpcomingTaskSummary[];

  readonly history:
    readonly TaskHistorySummary[];

  readonly boundaries: {
    readonly readOnly:
      true;

    readonly taskMutationControls:
      false;

    readonly publicTaskProxy:
      false;

    readonly broadOperateAuthority:
      false;

    readonly browserCredentialExposure:
      false;
  };
}

export interface UnavailableTaskManagementSurface {
  readonly status:
    "unavailable";

  readonly reason:
    "RUNTIME_CREDENTIAL_NOT_CONFIGURED" |
    "LIVE_TASK_READ_UNAVAILABLE";

  readonly message:
    string;

  readonly boundaries:
    AvailableTaskManagementSurface["boundaries"];
}

export type TaskManagementSurface =
  AvailableTaskManagementSurface |
  UnavailableTaskManagementSurface;

const boundaries =
  Object.freeze({
    readOnly:
      true as const,

    taskMutationControls:
      false as const,

    publicTaskProxy:
      false as const,

    broadOperateAuthority:
      false as const,

    browserCredentialExposure:
      false as const,
  });

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

function asString(
  value:
    unknown,
): string {
  return (
    typeof value ===
      "string"
      ? value
      : ""
  );
}

function asNumber(
  value:
    unknown,
): number {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value,
    )
      ? value
      : 0
  );
}

function asBoolean(
  value:
    unknown,
): boolean {
  return (
    value ===
      true ||
    value ===
      1 ||
    value ===
      "1"
  );
}

function firstString(
  source:
    JsonRecord,

  keys:
    readonly string[],
): string | null {
  for (
    const key
    of keys
  ) {
    const value =
      source[key];

    if (
      typeof value ===
        "string" &&
      value.length >
        0
    ) {
      return value;
    }
  }

  return null;
}

async function loginWithTaskEscalation(
  input: {
    readonly apiBaseUrl:
      string;

    readonly username:
      string;

    readonly password:
      string;
  },
): Promise<EscalatedSession> {
  const response =
    await fetch(
      `${input.apiBaseUrl}/login`,
      {
        method:
          "POST",

        headers: {
          Accept:
            "application/json",

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            user:
              input.username,

            password:
              input.password,

            role:
              TASK_ROLE,
          }),

        cache:
          "no-store",
      },
    );

  const text =
    await response.text();

  if (
    response.status !==
      200
  ) {
    throw new Error(
      "Explicit task-metadata escalation login failed.",
    );
  }

  const payload:
    unknown =
    text.trim().length >
      0
      ? JSON.parse(
          text,
        )
      : {};

  if (!isRecord(payload)) {
    throw new Error(
      "Task escalation login returned an invalid payload.",
    );
  }

  const result =
    isRecord(
      payload.result,
    )
      ? payload.result
      : payload;

  const accessToken =
    firstString(
      result,
      [
        "access_token",
        "accessToken",
      ],
    );

  const refreshToken =
    firstString(
      result,
      [
        "refresh_token",
        "refreshToken",
      ],
    );

  if (
    !accessToken ||
    !refreshToken
  ) {
    throw new Error(
      "Task escalation login did not return both tokens.",
    );
  }

  return Object.freeze({
    accessToken,
    refreshToken,
  });
}

async function readJson(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly path:
      string;

    readonly label:
      string;
  },
): Promise<unknown> {
  const response =
    await fetch(
      `${input.apiBaseUrl}${input.path}`,
      {
        method:
          "GET",

        headers: {
          Accept:
            "application/json",

          Authorization:
            `Bearer ${input.accessToken}`,
        },

        cache:
          "no-store",
      },
    );

  const text =
    await response.text();

  if (
    response.status !==
      200
  ) {
    throw new Error(
      `${input.label} read failed.`,
    );
  }

  return (
    text.trim().length >
      0
      ? JSON.parse(
          text,
        )
      : {}
  );
}

async function readResultArray(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly path:
      string;

    readonly label:
      string;
  },
): Promise<
  readonly JsonRecord[]
> {
  const payload =
    await readJson(
      input,
    );

  if (
    !isRecord(
      payload,
    ) ||
    !Array.isArray(
      payload.result,
    )
  ) {
    throw new Error(
      `${input.label} response is invalid.`,
    );
  }

  return Object.freeze(
    payload.result.filter(
      (
        item,
      ): item is JsonRecord =>
        isRecord(
          item,
        ),
    ),
  );
}

async function readTaskManagerStatus(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;
  },
): Promise<string> {
  const payload =
    await readJson({
      ...input,

      path:
        "/v2/task/manager",

      label:
        "Task manager",
    });

  if (
    !isRecord(
      payload,
    ) ||
    !isRecord(
      payload.result,
    ) ||
    typeof payload.result.Status !==
      "string"
  ) {
    throw new Error(
      "Task manager status response is invalid.",
    );
  }

  return payload.result.Status;
}

export async function readTaskManagementSurface(
  config: {
    readonly apiBaseUrl:
      string;

    readonly username:
      string;

    readonly password:
      string;
  },
): Promise<
  AvailableTaskManagementSurface
> {
  const session =
    await loginWithTaskEscalation(
      config,
    );

  try {
    const [
      taskRows,
      managerStatus,
      upcomingRows,
      historyRows,
    ] =
      await Promise.all([
        readResultArray({
          apiBaseUrl:
            config.apiBaseUrl,

          accessToken:
            session.accessToken,

          path:
            "/v2/tasks?maxRows=100",

          label:
            "Task inventory",
        }),

        readTaskManagerStatus({
          apiBaseUrl:
            config.apiBaseUrl,

          accessToken:
            session.accessToken,
        }),

        readResultArray({
          apiBaseUrl:
            config.apiBaseUrl,

          accessToken:
            session.accessToken,

          path:
            "/v2/task/upcoming?maxRows=100",

          label:
            "Upcoming task",
        }),

        readResultArray({
          apiBaseUrl:
            config.apiBaseUrl,

          accessToken:
            session.accessToken,

          path:
            "/v2/task/history?maxRows=100",

          label:
            "Task history",
        }),
      ]);

    const tasks =
      Object.freeze(
        taskRows
          .map(
            (
              row,
            ): TaskSummary =>
              Object.freeze({
                id:
                  asNumber(
                    row.Id,
                  ),

                name:
                  asString(
                    row.Name,
                  ),

                type:
                  asString(
                    row.Type,
                  ),

                namespace:
                  asString(
                    row.Namespace,
                  ),

                description:
                  asString(
                    row.Description,
                  ),

                suspended:
                  asBoolean(
                    row.Suspended,
                  ),

                lastFinished:
                  asString(
                    row.LastFinished,
                  ),

                nextScheduled:
                  asString(
                    row.NextScheduled,
                  ),
              }),
          )
          .sort(
            (
              left,
              right,
            ) =>
              left.name.localeCompare(
                right.name,
              ),
          ),
      );

    const upcoming =
      Object.freeze(
        upcomingRows
          .map(
            (
              row,
            ): UpcomingTaskSummary =>
              Object.freeze({
                id:
                  asNumber(
                    row.Id,
                  ),

                name:
                  asString(
                    row.Name,
                  ),

                namespace:
                  asString(
                    row.Namespace,
                  ),

                datetime:
                  asString(
                    row.Datetime,
                  ),

                suspended:
                  asBoolean(
                    row.Suspended,
                  ),
              }),
          )
          .sort(
            (
              left,
              right,
            ) =>
              left.datetime.localeCompare(
                right.datetime,
              ),
          ),
      );

    const history =
      Object.freeze(
        historyRows.map(
          (
            row,
          ): TaskHistorySummary =>
            Object.freeze({
              taskId:
                asNumber(
                  row.TaskId,
                ),

              name:
                asString(
                  row.Name,
                ),

              namespace:
                asString(
                  row.Namespace,
                ),

              lastStart:
                asString(
                  row.LastStart,
                ),

              completed:
                asString(
                  row.Completed,
                ),

              status:
                asString(
                  row.Status,
                ),

              result:
                asString(
                  row.Result,
                ),
            }),
        ),
      );

    return Object.freeze({
      status:
        "available" as const,

      authority:
        Object.freeze({
          role:
            TASK_ROLE,

          explicitEscalation:
            true as const,

          defaultRuntimeBroadened:
            false as const,

          adminOperateGranted:
            false as const,
        }),

      managerStatus,
      tasks,
      upcoming,
      history,
      boundaries,
    });
  } finally {
    await logoutIris({
      baseUrl:
        config.apiBaseUrl,

      accessToken:
        session.accessToken,
    });
  }
}

export async function readTaskManagementSurfaceFromEnvironment():
  Promise<TaskManagementSurface> {
  const password =
    process.env
      .MERIDIAN_RUNTIME_PASSWORD;

  if (
    typeof password !==
      "string" ||
    password.length ===
      0
  ) {
    return Object.freeze({
      status:
        "unavailable" as const,

      reason:
        "RUNTIME_CREDENTIAL_NOT_CONFIGURED" as const,

      message:
        (
          "Task metadata is unavailable because the server-owned " +
          "meridian.runtime credential is not configured."
        ),

      boundaries,
    });
  }

  try {
    return await readTaskManagementSurface({
      apiBaseUrl:
        process.env
          .MERIDIAN_IRIS_API_BASE_URL ??
        DEFAULT_API_BASE,

      username:
        process.env
          .MERIDIAN_RUNTIME_USERNAME ??
        DEFAULT_RUNTIME_USER,

      password,
    });
  } catch {
    return Object.freeze({
      status:
        "unavailable" as const,

      reason:
        "LIVE_TASK_READ_UNAVAILABLE" as const,

      message:
        (
          "Live task metadata could not be read. Meridian exposes " +
          "no task-mutation fallback and no broad operational proxy."
        ),

      boundaries,
    });
  }
}
