export const T01_TASK_ROLE =
  "MeridianTaskMetadataReader" as const;

export const T01_TASK_PATH =
  "/v2/task" as const;

export const T01_TASKS_PATH =
  "/v2/tasks?maxRows=1000" as const;

export const T01_TASK_MANAGER_PATH =
  "/v2/task/manager" as const;

export const T01_TASK_UPCOMING_PATH =
  "/v2/task/upcoming?maxRows=1000" as const;

export const T01_TASK_HISTORY_PATH =
  "/v2/task/history" as const;

export const T01_TASK_NAME =
  "Meridian R5 T01 Isolated Witness" as const;

export const T01_TASK_DESCRIPTION_PREFIX =
  "Meridian R5 T01 isolated on-demand task-create witness" as const;

export const T01_TASK_DESCRIPTION_MAX_LENGTH =
  100 as const;

export function t01TaskDescription(
  generation: string,
): string {
  const trimmed = generation.trim();

  if (trimmed.length === 0) {
    throw new Error("T01 task description requires a fixture generation.");
  }

  return (
    `${T01_TASK_DESCRIPTION_PREFIX} | generation=${trimmed}`
      .slice(
        0,
        T01_TASK_DESCRIPTION_MAX_LENGTH,
      )
  );
}

export interface T01TaskDefinition {
  readonly Name: typeof T01_TASK_NAME;
  readonly RunAsUser: "meridian.runtime";
  readonly EmailOnCompletion: readonly string[];
  readonly EmailOnError: readonly string[];
  readonly EmailOnExpiration: readonly string[];
  readonly EmailOutput: false;
  readonly Expires: false;
  readonly ExpiresDays: 0;
  readonly ExpiresHours: 0;
  readonly ExpiresMinutes: 0;
  readonly OpenOutputFile: false;
  readonly OutputDirectory: "";
  readonly OutputFilename: "";
  readonly OutputFileIsBinary: false;
  readonly SuspendOnError: false;
  readonly SuspendTerminated: false;
  readonly Priority: "Normal";
  readonly TaskClass: "%SYS.Task.SwitchJournal";
  readonly IsBatch: false;
  readonly NameSpace: "%SYS";
  readonly TimePeriod: "On Demand";
  readonly TimePeriodEvery: "";
  readonly TimePeriodDay: "";
  readonly DailyFrequency: "Once";
  readonly DailyFrequencyTime: "Hourly";
  readonly DailyIncrement: "";
  readonly DailyStartTime: "00:00:00";
  readonly DailyEndTime: "23:59:59";
  readonly RunAfterGUID: "";
  readonly StartDate: "2099-12-31";
  readonly EndDate: "2099-12-31";
  readonly MirrorStatus: "Primary";
  readonly RescheduleOnStart: false;
  readonly Description: string;
  readonly Settings: Readonly<Record<string, never>>;
}

export function t01TaskDefinition(
  generation: string,
): T01TaskDefinition {
  const trimmed = generation.trim();

  if (trimmed.length === 0) {
    throw new Error("T01 task definition requires a fixture generation.");
  }

  return Object.freeze({
    Name: T01_TASK_NAME,
    RunAsUser: "meridian.runtime" as const,
    EmailOnCompletion: Object.freeze([]),
    EmailOnError: Object.freeze([]),
    EmailOnExpiration: Object.freeze([]),
    EmailOutput: false as const,
    Expires: false as const,
    ExpiresDays: 0 as const,
    ExpiresHours: 0 as const,
    ExpiresMinutes: 0 as const,
    OpenOutputFile: false as const,
    OutputDirectory: "" as const,
    OutputFilename: "" as const,
    OutputFileIsBinary: false as const,
    SuspendOnError: false as const,
    SuspendTerminated: false as const,
    Priority: "Normal" as const,
    TaskClass: "%SYS.Task.SwitchJournal" as const,
    IsBatch: false as const,
    NameSpace: "%SYS" as const,
    TimePeriod: "On Demand" as const,
    TimePeriodEvery: "" as const,
    TimePeriodDay: "" as const,
    DailyFrequency: "Once" as const,
    DailyFrequencyTime: "Hourly" as const,
    DailyIncrement: "" as const,
    DailyStartTime: "00:00:00" as const,
    DailyEndTime: "23:59:59" as const,
    RunAfterGUID: "" as const,
    StartDate: "2099-12-31" as const,
    EndDate: "2099-12-31" as const,
    MirrorStatus: "Primary" as const,
    RescheduleOnStart: false as const,
    Description: t01TaskDescription(trimmed),
    Settings: Object.freeze({}),
  });
}


interface JsonRecord {
  readonly [key: string]: unknown;
}

export interface T01EscalatedSession {
  readonly accessToken: string;
  readonly refreshToken: string;
}

export interface T01TaskSummary {
  readonly id: number;
  readonly name: string;
  readonly type: string;
  readonly namespace: string;
  readonly description: string;
  readonly suspended: boolean;
  readonly lastFinished: string;
  readonly nextScheduled: string;
}

export interface T01TaskSnapshot {
  readonly id: number;
  readonly name: string;
  readonly runAsUser: string;
  readonly emailOnCompletion: readonly string[];
  readonly emailOnError: readonly string[];
  readonly emailOnExpiration: readonly string[];
  readonly emailOutput: boolean;
  readonly expires: boolean;
  readonly expiresDays: number;
  readonly expiresHours: number;
  readonly expiresMinutes: number;
  readonly openOutputFile: boolean;
  readonly outputDirectory: string;
  readonly outputFilename: string;
  readonly outputFileIsBinary: boolean;
  readonly suspendOnError: boolean;
  readonly suspendTerminated: boolean;
  readonly priority: string;
  readonly taskClass: string;
  readonly isBatch: boolean;
  readonly namespace: string;
  readonly timePeriod: string;
  readonly timePeriodEvery: string;
  readonly timePeriodDay: string;
  readonly dailyFrequency: string;
  readonly dailyFrequencyTime: string;
  readonly dailyIncrement: string;
  readonly dailyStartTime: string;
  readonly dailyEndTime: string;
  readonly runAfterGuid: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly mirrorStatus: string;
  readonly rescheduleOnStart: boolean;
  readonly description: string;
}

export interface T01TaskHistoryRow {
  readonly taskId: number;
  readonly name: string;
  readonly namespace: string;
  readonly lastStart: string;
  readonly completed: string;
  readonly status: string;
  readonly result: string;
}

export interface T01UpcomingTaskRow {
  readonly id: number;
  readonly name: string;
  readonly namespace: string;
  readonly datetime: string;
  readonly suspended: boolean;
}

export class T01TaskAuthorityDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "T01TaskAuthorityDeniedError";
  }
}

export class T01TaskMutationRejectedError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "T01TaskMutationRejectedError";
  }
}

export class T01TaskMutationUnknownAfterDispatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "T01TaskMutationUnknownAfterDispatchError";
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsedJson(text: string, label: string): unknown {
  if (text.trim().length === 0) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`${label} returned non-JSON content.`);
  }
}

function resultValue(value: unknown): unknown {
  if (!isRecord(value)) {
    throw new Error("IRIS T01 response is not an object.");
  }

  return Object.prototype.hasOwnProperty.call(value, "result")
    ? value.result
    : value;
}

function resultObject(value: unknown): JsonRecord {
  const result = resultValue(value);

  if (!isRecord(result)) {
    throw new Error("IRIS T01 result is not an object.");
  }

  return result;
}

function resultArray(value: unknown): readonly JsonRecord[] {
  const result = resultValue(value);

  if (!Array.isArray(result)) {
    throw new Error("IRIS T01 result is not an array.");
  }

  return Object.freeze(
    result.map((item) => {
      if (!isRecord(item)) {
        throw new Error("IRIS T01 array contains a non-object row.");
      }

      return item;
    }),
  );
}

function first(value: JsonRecord, keys: readonly string[]): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      return value[key];
    }
  }

  return undefined;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown, label: string): number {
  const parsed =
    typeof value === "number"
      ? value
      : (
          typeof value === "string" && /^\d+$/.test(value.trim())
        )
          ? Number(value)
          : Number.NaN;

  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`${label} is not a non-negative safe integer.`);
  }

  return parsed;
}

function boolValue(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    (typeof value === "string" && value.toLowerCase() === "true")
  );
}

function stringArray(value: unknown): readonly string[] {
  if (value === undefined || value === null || value === "") {
    return Object.freeze([]);
  }

  if (Array.isArray(value)) {
    return Object.freeze(
      value.map((item) => {
        if (typeof item !== "string") {
          throw new Error("IRIS T01 string array contains a non-string value.");
        }

        return item.trim();
      }).filter(Boolean),
    );
  }

  if (typeof value === "string") {
    return Object.freeze(
      value.split(",").map((item) => item.trim()).filter(Boolean),
    );
  }

  throw new Error("IRIS T01 string-array representation is unsupported.");
}

function joinUrl(baseUrl: string, path: string): string {
  return baseUrl.replace(/\/+$/, "") + path;
}

function authorityHeaders(accessToken: string): HeadersInit {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
}

async function readJsonResponse(input: {
  readonly apiBaseUrl: string;
  readonly accessToken: string;
  readonly path: string;
  readonly label: string;
  readonly fetchImpl?: typeof fetch;
}): Promise<unknown> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(
    joinUrl(input.apiBaseUrl, input.path),
    {
      method: "GET",
      cache: "no-store",
      redirect: "error",
      headers: authorityHeaders(input.accessToken),
    },
  );

  const text = await response.text();

  if (response.status === 401 || response.status === 403) {
    throw new T01TaskAuthorityDeniedError(
      `${input.label} denied with HTTP ${response.status}.`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `${input.label} returned HTTP ${response.status}. Body=${text.slice(0, 500)}`,
    );
  }

  return parsedJson(text, input.label);
}

export async function loginT01TaskSession(input: {
  readonly apiBaseUrl: string;
  readonly username: "meridian.runtime";
  readonly password: string;
  readonly fetchImpl?: typeof fetch;
}): Promise<T01EscalatedSession> {
  if (input.password.length === 0) {
    throw new Error("T01 task escalation login requires the runtime credential.");
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(
    joinUrl(input.apiBaseUrl, "/login"),
    {
      method: "POST",
      cache: "no-store",
      redirect: "error",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user: input.username,
        password: input.password,
        role: T01_TASK_ROLE,
      }),
    },
  );

  const text = await response.text();

  if (response.status !== 200) {
    throw new T01TaskAuthorityDeniedError(
      `T01 explicit task escalation login failed with HTTP ${response.status}.`,
    );
  }

  const result = resultObject(parsedJson(text, "T01 task escalation login"));
  const accessToken = stringValue(first(result, ["access_token", "accessToken"]));
  const refreshToken = stringValue(first(result, ["refresh_token", "refreshToken"]));

  if (accessToken.length === 0 || refreshToken.length === 0) {
    throw new Error("T01 task escalation login did not return both tokens.");
  }

  return Object.freeze({accessToken, refreshToken});
}

export async function listT01Tasks(input: {
  readonly apiBaseUrl: string;
  readonly accessToken: string;
  readonly fetchImpl?: typeof fetch;
}): Promise<readonly T01TaskSummary[]> {
  const rows = resultArray(
    await readJsonResponse({
      ...input,
      path: T01_TASKS_PATH,
      label: "T01 task inventory",
    }),
  );

  return Object.freeze(
    rows.map((row) => Object.freeze({
      id: numberValue(first(row, ["Id", "id"]), "T01 task id"),
      name: stringValue(first(row, ["Name", "name"])),
      type: stringValue(first(row, ["Type", "type"])),
      namespace: stringValue(first(row, ["Namespace", "NameSpace", "namespace"])),
      description: stringValue(first(row, ["Description", "description"])),
      suspended: boolValue(first(row, ["Suspended", "suspended"])),
      lastFinished: stringValue(first(row, ["LastFinished", "lastFinished"])),
      nextScheduled: stringValue(first(row, ["NextScheduled", "nextScheduled"])),
    })),
  );
}

export async function readT01Task(input: {
  readonly apiBaseUrl: string;
  readonly accessToken: string;
  readonly taskId: number;
  readonly fetchImpl?: typeof fetch;
}): Promise<T01TaskSnapshot | null> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(
    joinUrl(
      input.apiBaseUrl,
      `${T01_TASK_PATH}?id=${encodeURIComponent(String(input.taskId))}`,
    ),
    {
      method: "GET",
      cache: "no-store",
      redirect: "error",
      headers: authorityHeaders(input.accessToken),
    },
  );

  const text = await response.text();

  if (response.status === 404) {
    return null;
  }

  if (response.status === 401 || response.status === 403) {
    throw new T01TaskAuthorityDeniedError(
      `T01 task detail read denied with HTTP ${response.status}.`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `T01 task detail read returned HTTP ${response.status}. Body=${text.slice(0, 500)}`,
    );
  }

  const result = resultObject(parsedJson(text, "T01 task detail read"));

  return Object.freeze({
    id: input.taskId,
    name: stringValue(first(result, ["Name", "name"])),
    runAsUser: stringValue(first(result, ["RunAsUser", "runAsUser"])),
    emailOnCompletion: stringArray(first(result, ["EmailOnCompletion", "emailOnCompletion"])),
    emailOnError: stringArray(first(result, ["EmailOnError", "emailOnError"])),
    emailOnExpiration: stringArray(first(result, ["EmailOnExpiration", "emailOnExpiration"])),
    emailOutput: boolValue(first(result, ["EmailOutput", "emailOutput"])),
    expires: boolValue(first(result, ["Expires", "expires"])),
    expiresDays: numberValue(first(result, ["ExpiresDays", "expiresDays"]) ?? 0, "T01 ExpiresDays"),
    expiresHours: numberValue(first(result, ["ExpiresHours", "expiresHours"]) ?? 0, "T01 ExpiresHours"),
    expiresMinutes: numberValue(first(result, ["ExpiresMinutes", "expiresMinutes"]) ?? 0, "T01 ExpiresMinutes"),
    openOutputFile: boolValue(first(result, ["OpenOutputFile", "openOutputFile"])),
    outputDirectory: stringValue(first(result, ["OutputDirectory", "outputDirectory"])),
    outputFilename: stringValue(first(result, ["OutputFilename", "outputFilename"])),
    outputFileIsBinary: boolValue(first(result, ["OutputFileIsBinary", "outputFileIsBinary"])),
    suspendOnError: boolValue(first(result, ["SuspendOnError", "suspendOnError"])),
    suspendTerminated: boolValue(first(result, ["SuspendTerminated", "suspendTerminated"])),
    priority: stringValue(first(result, ["Priority", "priority"])),
    taskClass: stringValue(first(result, ["TaskClass", "taskClass"])),
    isBatch: boolValue(first(result, ["IsBatch", "isBatch"])),
    namespace: stringValue(first(result, ["NameSpace", "Namespace", "namespace"])),
    timePeriod: stringValue(first(result, ["TimePeriod", "timePeriod"])),
    timePeriodEvery: stringValue(first(result, ["TimePeriodEvery", "timePeriodEvery"])),
    timePeriodDay: stringValue(first(result, ["TimePeriodDay", "timePeriodDay"])),
    dailyFrequency: stringValue(first(result, ["DailyFrequency", "dailyFrequency"])),
    dailyFrequencyTime: stringValue(first(result, ["DailyFrequencyTime", "dailyFrequencyTime"])),
    dailyIncrement: stringValue(first(result, ["DailyIncrement", "dailyIncrement"])),
    dailyStartTime: stringValue(first(result, ["DailyStartTime", "dailyStartTime"])),
    dailyEndTime: stringValue(first(result, ["DailyEndTime", "dailyEndTime"])),
    runAfterGuid: stringValue(first(result, ["RunAfterGUID", "runAfterGuid"])),
    startDate: stringValue(first(result, ["StartDate", "startDate"])),
    endDate: stringValue(first(result, ["EndDate", "endDate"])),
    mirrorStatus: stringValue(first(result, ["MirrorStatus", "mirrorStatus"])),
    rescheduleOnStart: boolValue(first(result, ["RescheduleOnStart", "rescheduleOnStart"])),
    description: stringValue(first(result, ["Description", "description"])),
  });
}

export async function readT01TaskManagerStatus(input: {
  readonly apiBaseUrl: string;
  readonly accessToken: string;
  readonly fetchImpl?: typeof fetch;
}): Promise<string> {
  const result = resultObject(
    await readJsonResponse({
      ...input,
      path: T01_TASK_MANAGER_PATH,
      label: "T01 task manager",
    }),
  );

  return stringValue(first(result, ["Status", "status"]));
}

export async function readT01UpcomingTasks(input: {
  readonly apiBaseUrl: string;
  readonly accessToken: string;
  readonly fetchImpl?: typeof fetch;
}): Promise<readonly T01UpcomingTaskRow[]> {
  const rows = resultArray(
    await readJsonResponse({
      ...input,
      path: T01_TASK_UPCOMING_PATH,
      label: "T01 upcoming task inventory",
    }),
  );

  return Object.freeze(
    rows.map((row) => Object.freeze({
      id: numberValue(first(row, ["Id", "id"]), "T01 upcoming task id"),
      name: stringValue(first(row, ["Name", "name"])),
      namespace: stringValue(first(row, ["Namespace", "NameSpace", "namespace"])),
      datetime: stringValue(first(row, ["Datetime", "datetime"])),
      suspended: boolValue(first(row, ["Suspended", "suspended"])),
    })),
  );
}

export async function readT01TaskHistory(input: {
  readonly apiBaseUrl: string;
  readonly accessToken: string;
  readonly taskId: number;
  readonly fetchImpl?: typeof fetch;
}): Promise<readonly T01TaskHistoryRow[]> {
  const params = new URLSearchParams();
  params.set("taskId", String(input.taskId));
  params.set("maxRows", "100");

  const rows = resultArray(
    await readJsonResponse({
      ...input,
      path: `${T01_TASK_HISTORY_PATH}?${params.toString()}`,
      label: "T01 task history",
    }),
  );

  return Object.freeze(
    rows.map((row) => Object.freeze({
      taskId: numberValue(first(row, ["TaskId", "taskId"]), "T01 history task id"),
      name: stringValue(first(row, ["Name", "name"])),
      namespace: stringValue(first(row, ["Namespace", "NameSpace", "namespace"])),
      lastStart: stringValue(first(row, ["LastStart", "lastStart"])),
      completed: stringValue(first(row, ["Completed", "completed"])),
      status: stringValue(first(row, ["Status", "status"])),
      result: stringValue(first(row, ["Result", "result"])),
    })),
  );
}

function parseTaskIdFromLocation(location: string | null): number | null {
  if (location === null || location.trim().length === 0) {
    return null;
  }

  const match = /(?:\?|&)id=(\d+)(?:&|$)/i.exec(location);

  if (match === null) {
    return null;
  }

  const parsed = Number(match[1]);
  return Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : null;
}

export async function postT01TaskCreate(input: {
  readonly apiBaseUrl: string;
  readonly accessToken: string;
  readonly definition: T01TaskDefinition;
  readonly fetchImpl?: typeof fetch;
}): Promise<Readonly<{
  status: 201;
  taskId: number;
  location: string;
  mutationRequestCount: 1;
}>> {
  const fetchImpl = input.fetchImpl ?? fetch;
  let response: Response;

  try {
    response = await fetchImpl(
      joinUrl(input.apiBaseUrl, T01_TASK_PATH),
      {
        method: "POST",
        cache: "no-store",
        redirect: "error",
        headers: {
          ...authorityHeaders(input.accessToken),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input.definition),
      },
    );
  } catch (error) {
    throw new T01TaskMutationUnknownAfterDispatchError(
      "Official SysAdmin POST /v2/task transport ended without an authoritative response. " +
      "Automatic retry is forbidden. " +
      (error instanceof Error ? error.message : "Unknown transport failure."),
    );
  }

  const text = await response.text();

  if (response.status === 401 || response.status === 403) {
    throw new T01TaskMutationRejectedError(
      response.status,
      `T01 authority rejected by SysAdmin API with HTTP ${response.status}.`,
    );
  }

  if (response.status >= 500) {
    throw new T01TaskMutationUnknownAfterDispatchError(
      `Official SysAdmin POST /v2/task returned HTTP ${response.status}; mutation outcome requires authoritative reconciliation. Body=${text.slice(0, 500)}`,
    );
  }

  if (!response.ok) {
    throw new T01TaskMutationRejectedError(
      response.status,
      `Official SysAdmin POST /v2/task rejected T01 with HTTP ${response.status}. Body=${text.slice(0, 500)}`,
    );
  }

  if (response.status !== 201) {
    throw new T01TaskMutationUnknownAfterDispatchError(
      `Official SysAdmin POST /v2/task returned unexpected success status ${response.status}.`,
    );
  }

  const location = response.headers.get("location") ?? "";
  let taskId = parseTaskIdFromLocation(location);

  if (taskId === null && text.trim().length > 0) {
    const result = resultObject(parsedJson(text, "T01 task create response"));
    const candidate = first(result, ["Id", "id"]);

    if (candidate !== undefined) {
      taskId = numberValue(candidate, "T01 created task id");
    }
  }

  if (taskId === null || taskId < 1) {
    throw new T01TaskMutationUnknownAfterDispatchError(
      "T01 create returned HTTP 201 but no stable server task id could be recovered from Location or response body.",
    );
  }

  return Object.freeze({
    status: 201 as const,
    taskId,
    location,
    mutationRequestCount: 1 as const,
  });
}

export async function deleteT01FixtureTask(input: {
  readonly apiBaseUrl: string;
  readonly accessToken: string;
  readonly taskId: number;
  readonly fetchImpl?: typeof fetch;
}): Promise<void> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(
    joinUrl(
      input.apiBaseUrl,
      `${T01_TASK_PATH}?id=${encodeURIComponent(String(input.taskId))}`,
    ),
    {
      method: "DELETE",
      cache: "no-store",
      redirect: "error",
      headers: authorityHeaders(input.accessToken),
    },
  );

  const text = await response.text();

  if (response.status !== 200) {
    throw new Error(
      `T01 fixture cleanup DELETE failed HTTP ${response.status}. Body=${text.slice(0, 500)}`,
    );
  }
}
