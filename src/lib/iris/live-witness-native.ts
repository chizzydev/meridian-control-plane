import {
  spawn,
  type ChildProcessWithoutNullStreams,
} from "node:child_process";

import {
  randomUUID,
} from "node:crypto";

import {
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";

import {
  tmpdir,
} from "node:os";

import {
  join,
} from "node:path";

import {
  setTimeout as delay,
} from "node:timers/promises";

import {
  DEMO_FIXTURE_NAMESPACE,
  DEMO_FIXTURE_USERNAME,
} from "../change-case/demo-fixture";

import {
  LIVE_WITNESS_REQUIRED_PERMISSION_KEYS,
  liveWitnessProcessPurposeMarker,
  type LiveWitnessPermissionKey,
  type LiveWitnessProcessRow,
  type LiveWitnessSelfSnapshot,
} from "../change-case/live-convergence";

export const LIVE_WITNESS_NATIVE_TRANSPORT_VERSION =
  "meridian.live-witness-native.v1" as const;

const RESPONSE_TIMEOUT_MS =
  15_000;

interface JsonObject {
  readonly [key: string]:
    unknown;
}

interface WorkerSnapshotJson {
  readonly ok:
    boolean;

  readonly capturedAtUtc:
    string;

  readonly generation:
    string;

  readonly purposeMarker:
    string;

  readonly selfUserInfo:
    string;

  readonly usingSharedMemory:
    boolean;

  readonly sqlCurrentUser:
    string;

  readonly sqlDollarUsername:
    string;

  readonly sqlCurrentPid:
    number;

  readonly sqlCurrentNamespace:
    string;

  readonly checks:
    Readonly<Record<string, unknown>>;
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

  return value as
    JsonObject;
}

function stringValue(
  object:
    JsonObject,
  key:
    string,
): string {
  const value =
    object[key];

  return typeof value ===
    "string"
    ? value
    : "";
}

function numberValue(
  object:
    JsonObject,
  key:
    string,
): number {
  const value =
    object[key];

  if (
    typeof value !==
      "number" ||
    !Number.isSafeInteger(
      value,
    )
  ) {
    throw new Error(
      `${key} is not a safe integer.`,
    );
  }

  return value;
}

function boolValue(
  object:
    JsonObject,
  key:
    string,
): boolean {
  const value =
    object[key];

  if (
    typeof value !==
      "boolean"
  ) {
    throw new Error(
      `${key} is not a boolean.`,
    );
  }

  return value;
}

function parseChecks(
  value:
    unknown,
): LiveWitnessSelfSnapshot["checks"] {
  const object =
    objectValue(
      value,
      "Worker checks",
    );

  const result:
    Partial<
      Record<
        LiveWitnessPermissionKey,
        0 | 1
      >
    > =
    {};

  for (
    const key
    of LIVE_WITNESS_REQUIRED_PERMISSION_KEYS
  ) {
    const observed =
      object[
        key
      ];

    if (
      observed !==
        0 &&
      observed !==
        1
    ) {
      throw new Error(
        `Worker omitted direct permission decision ${key}.`,
      );
    }

    result[
      key
    ] =
      observed;
  }

  return result as
    LiveWitnessSelfSnapshot["checks"];
}

function parseWorkerSnapshot(
  value:
    unknown,
  expectedGeneration:
    string,
): LiveWitnessSelfSnapshot {
  const object =
    objectValue(
      value,
      "Worker observation",
    );

  if (
    object.ok !==
      true
  ) {
    const error =
      stringValue(
        object,
        "errorMessage",
      );

    throw new Error(
      `Native witness observation failed: ${error || "unknown worker error"}`,
    );
  }

  if (
    stringValue(
      object,
      "generation",
    ) !==
      expectedGeneration
  ) {
    throw new Error(
      "Native witness generation binding drifted.",
    );
  }

  const expectedPurposeMarker =
    liveWitnessProcessPurposeMarker(
      expectedGeneration,
    );

  if (
    stringValue(
      object,
      "purposeMarker",
    ) !==
      expectedPurposeMarker ||
    stringValue(
      object,
      "selfUserInfo",
    ) !==
      expectedPurposeMarker
  ) {
    throw new Error(
      "Native witness process purpose marker drifted.",
    );
  }

  const username =
    stringValue(
      object,
      "sqlCurrentUser",
    );

  const dollarUsername =
    stringValue(
      object,
      "sqlDollarUsername",
    );

  const namespace =
    stringValue(
      object,
      "sqlCurrentNamespace",
    );

  if (
    username.toLowerCase() !==
      DEMO_FIXTURE_USERNAME.toLowerCase() ||
    dollarUsername.toLowerCase() !==
      DEMO_FIXTURE_USERNAME.toLowerCase() ||
    namespace.toUpperCase() !==
      DEMO_FIXTURE_NAMESPACE
  ) {
    throw new Error(
      "Native witness authenticated process identity drifted.",
    );
  }

  return Object.freeze({
    capturedAtUtc:
      stringValue(
        object,
        "capturedAtUtc",
      ),

    generation:
      expectedGeneration,

    purposeMarker:
      expectedPurposeMarker,

    username:
      DEMO_FIXTURE_USERNAME,

    namespace:
      DEMO_FIXTURE_NAMESPACE,

    serverPid:
      numberValue(
        object,
        "sqlCurrentPid",
      ),

    usingSharedMemory:
      boolValue(
        object,
        "usingSharedMemory",
      ),

    checks:
      parseChecks(
        object.checks,
      ),
  });
}

async function readJsonFile(
  path:
    string,
): Promise<unknown> {
  const text =
    await readFile(
      path,
      "utf8",
    );

  return JSON.parse(
    text,
  ) as unknown;
}

async function waitForJson(
  path:
    string,
  timeoutMs =
    RESPONSE_TIMEOUT_MS,
): Promise<unknown> {
  const deadline =
    Date.now() +
    timeoutMs;

  while (
    Date.now() <
    deadline
  ) {
    try {
      return await readJsonFile(
        path,
      );
    } catch (
      error
    ) {
      if (
        typeof error ===
          "object" &&
        error !==
          null &&
        "code" in
          error &&
        (
          error as {
            readonly code?:
              string;
          }
        ).code ===
          "ENOENT"
      ) {
        await delay(
          75,
        );

        continue;
      }

      throw error;
    }
  }

  throw new Error(
    `Timed out waiting for live witness response ${path}.`,
  );
}

async function writeCommand(
  controlDir:
    string,
  action:
    "observe" |
    "close" |
    "reconnect" |
    "exit",
): Promise<{
  readonly requestId:
    string;

  readonly responsePath:
    string;
}> {
  const requestId =
    randomUUID();

  const commandPath =
    join(
      controlDir,
      `command-${requestId}.json`,
    );

  const tempPath =
    `${commandPath}.tmp`;

  await writeFile(
    tempPath,
    JSON.stringify({
      requestId,
      action,
    }),
    {
      encoding:
        "utf8",
      flag:
        "wx",
    },
  );

  await rename(
    tempPath,
    commandPath,
  );

  return {
    requestId,
    responsePath:
      join(
        controlDir,
        `response-${requestId}.json`,
      ),
  };
}

export interface LiveWitnessNativeSession {
  readonly generation:
    string;

  readonly startup:
    LiveWitnessSelfSnapshot;

  observe():
    Promise<LiveWitnessSelfSnapshot>;

  closeConnection():
    Promise<{
      readonly closedAtUtc:
        string;
    }>;

  reconnect():
    Promise<LiveWitnessSelfSnapshot>;

  exit():
    Promise<void>;
}

export async function startLiveWitnessNativeSession(
  input: {
    readonly pythonExecutable:
      string;

    readonly workerScriptPath:
      string;

    readonly fixturePassword:
      string;

    readonly expectedFixtureGeneration:
      string;
  },
): Promise<LiveWitnessNativeSession> {
  const generation =
    input.expectedFixtureGeneration.trim();

  if (
    generation.length ===
      0 ||
    input.fixturePassword.length ===
      0
  ) {
    throw new Error(
      "Native witness requires server-held fixture generation and credential.",
    );
  }

  const controlDir =
    await mkdtemp(
      join(
        tmpdir(),
        "meridian-live-witness-",
      ),
    );

  const child:
    ChildProcessWithoutNullStreams =
    spawn(
      input.pythonExecutable,
      [
        input.workerScriptPath,
        controlDir,
      ],
      {
        shell:
          false,
        windowsHide:
          true,
        stdio: [
          "pipe",
          "pipe",
          "pipe",
        ],
      },
    );

  let stderr =
    "";

  child.stdout.setEncoding(
    "utf8",
  );

  child.stderr.setEncoding(
    "utf8",
  );

  child.stderr.on(
    "data",
    (
      chunk:
        string,
    ) => {
      stderr +=
        String(
          chunk,
        );
    },
  );

  child.stdin.end(
    JSON.stringify({
      password:
        input.fixturePassword,

      generation,
    }),
  );

  let startup:
    LiveWitnessSelfSnapshot;

  try {
    startup =
      parseWorkerSnapshot(
        await waitForJson(
          join(
            controlDir,
            "startup.json",
          ),
        ),
        generation,
      );
  } catch (
    error
  ) {
    const safeStderr =
      stderr
        .split(
          input.fixturePassword,
        )
        .join(
          "<redacted>",
        )
        .trim()
        .slice(
          0,
          800,
        );

    await rm(
      controlDir,
      {
        recursive:
          true,
        force:
          true,
      },
    );

    throw new Error(
      `${
        error instanceof Error
          ? error.message
          : "Native witness startup failed."
      }${safeStderr ? ` stderr=${safeStderr}` : ""}`,
    );
  }

  let exited =
    false;

  async function command(
    action:
      "observe" |
      "close" |
      "reconnect" |
      "exit",
  ): Promise<unknown> {
    if (
      exited
    ) {
      throw new Error(
        "Native witness controller has already exited.",
      );
    }

    const request =
      await writeCommand(
        controlDir,
        action,
      );

    const response =
      await waitForJson(
        request.responsePath,
      );

    if (
      action ===
        "exit"
    ) {
      exited =
        true;
    }

    return response;
  }

  return Object.freeze({
    generation,
    startup,

    observe:
      async () =>
        parseWorkerSnapshot(
          await command(
            "observe",
          ),
          generation,
        ),

    closeConnection:
      async () => {
        const response =
          objectValue(
            await command(
              "close",
            ),
            "Native witness close response",
          );

        if (
          response.ok !==
            true
        ) {
          throw new Error(
            "Native witness normal connection close failed.",
          );
        }

        return {
          closedAtUtc:
            stringValue(
              response,
              "capturedAtUtc",
            ),
        };
      },

    reconnect:
      async () => {
        const response =
          objectValue(
            await command(
              "reconnect",
            ),
            "Native witness reconnect response",
          );

        if (
          response.ok !==
            true ||
          response.connectOk !==
            true
        ) {
          throw new Error(
            `Native witness reconnect failed: ${
              stringValue(
                response,
                "errorMessage",
              ) ||
              "unknown worker error"
            }`,
          );
        }

        return parseWorkerSnapshot(
          response.observation,
          generation,
        );
      },

    exit:
      async () => {
        if (
          exited
        ) {
          return;
        }

        const response =
          objectValue(
            await command(
              "exit",
            ),
            "Native witness exit response",
          );

        if (
          response.ok !==
            true
        ) {
          throw new Error(
            "Native witness controller exit failed.",
          );
        }

        const exitDeadline =
          Date.now() +
          RESPONSE_TIMEOUT_MS;

        while (
          child.exitCode ===
            null &&
          Date.now() <
            exitDeadline
        ) {
          await delay(
            50,
          );
        }

        if (
          child.exitCode ===
            null
        ) {
          throw new Error(
            "Native witness controller did not exit after normal exit command; process kill is intentionally unavailable.",
          );
        }

        await rm(
          controlDir,
          {
            recursive:
              true,
            force:
              true,
          },
        );
      },
  });
}

function splitRoleCsv(
  value:
    string,
): readonly string[] {
  return Object.freeze(
    [
      ...new Set(
        value
          .split(
            ",",
          )
          .map(
            (entry) =>
              entry.trim(),
          )
          .filter(Boolean),
      ),
    ].sort(
      (
        left,
        right,
      ) =>
        left.localeCompare(
          right,
        ),
    ),
  );
}

export async function readLiveWitnessProcessRows(
  input: {
    readonly pythonExecutable:
      string;

    readonly readerScriptPath:
      string;

    readonly runtimePassword:
      string;

    readonly username?:
      string;
  },
): Promise<readonly LiveWitnessProcessRow[]> {
  if (
    input.runtimePassword.length ===
      0
  ) {
    throw new Error(
      "ProcessQuery witness reader requires the server runtime credential.",
    );
  }

  const username =
    input.username ??
    DEMO_FIXTURE_USERNAME;

  if (
    username.toLowerCase() !==
      DEMO_FIXTURE_USERNAME.toLowerCase()
  ) {
    throw new Error(
      "ProcessQuery witness reader accepts only the fixed A3 fixture username.",
    );
  }

  const child =
    spawn(
      input.pythonExecutable,
      [
        input.readerScriptPath,
      ],
      {
        shell:
          false,
        windowsHide:
          true,
        stdio: [
          "pipe",
          "pipe",
          "pipe",
        ],
      },
    );

  let stdout =
    "";

  let stderr =
    "";

  child.stdout.setEncoding(
    "utf8",
  );

  child.stderr.setEncoding(
    "utf8",
  );

  child.stdout.on(
    "data",
    (
      chunk:
        string,
    ) => {
      stdout +=
        String(
          chunk,
        );
    },
  );

  child.stderr.on(
    "data",
    (
      chunk:
        string,
    ) => {
      stderr +=
        String(
          chunk,
        );
    },
  );

  const completion =
    new Promise<number>(
      (
        resolve,
        reject,
      ) => {
        child.once(
          "error",
          reject,
        );

        child.once(
          "close",
          (
            code:
              number | null,
          ) => {
            resolve(
              code ??
                -1,
            );
          },
        );
      },
    );

  child.stdin.end(
    JSON.stringify({
      password:
        input.runtimePassword,

      username:
        DEMO_FIXTURE_USERNAME,
    }),
  );

  const exitCode =
    await completion;

  const safeStderr =
    stderr
      .split(
        input.runtimePassword,
      )
      .join(
        "<redacted>",
      )
      .trim()
      .slice(
        0,
        800,
      );

  let parsed:
    unknown;

  try {
    parsed =
      JSON.parse(
        stdout.trim(),
      ) as unknown;
  } catch {
    throw new Error(
      `ProcessQuery witness reader emitted invalid JSON (exit=${exitCode}; stderr=${safeStderr}).`,
    );
  }

  const result =
    objectValue(
      parsed,
      "ProcessQuery witness result",
    );

  if (
    exitCode !==
      0 ||
    result.ok !==
      true ||
    !Array.isArray(
      result.rows,
    )
  ) {
    throw new Error(
      `ProcessQuery witness reader failed: ${
        stringValue(
          result,
          "error",
        ) ||
        safeStderr ||
        "unknown failure"
      }`,
    );
  }

  return Object.freeze(
    result.rows.map(
      (
        value,
      ): LiveWitnessProcessRow => {
        const row =
          objectValue(
            value,
            "ProcessQuery witness row",
          );

        const pid =
          numberValue(
            row,
            "pid",
          );

        const observedUsername =
          stringValue(
            row,
            "username",
          );

        if (
          observedUsername.toLowerCase() !==
            DEMO_FIXTURE_USERNAME.toLowerCase()
        ) {
          throw new Error(
            "ProcessQuery witness reader returned a non-fixture principal.",
          );
        }

        return Object.freeze({
          pid,
          username:
            observedUsername,
          loginRoles:
            splitRoleCsv(
              stringValue(
                row,
                "loginRoles",
              ),
            ),
          roles:
            splitRoleCsv(
              stringValue(
                row,
                "roles",
              ),
            ),
          namespace:
            stringValue(
              row,
              "namespace",
            ),
          startTimeUtc:
            stringValue(
              row,
              "startTimeUtc",
            ),
          clientIPAddress:
            stringValue(
              row,
              "clientIPAddress",
            ),
          startupClientIPAddress:
            stringValue(
              row,
              "startupClientIPAddress",
            ),

          purposeMarker:
            stringValue(
              row,
              "purposeMarker",
            ),

          canBeSuspended:
            boolValue(
              row,
              "canBeSuspended",
            ),

          canBeTerminated:
            boolValue(
              row,
              "canBeTerminated",
            ),

          state:
            stringValue(
              row,
              "state",
            ),
        });
      },
    ),
  );
}

export async function waitForOldWitnessPidGone(
  input: {
    readonly pythonExecutable:
      string;

    readonly readerScriptPath:
      string;

    readonly runtimePassword:
      string;

    readonly oldPid:
      number;

    readonly timeoutMs?:
      number;
  },
): Promise<{
  readonly observedAtUtc:
    string;

  readonly oldPid:
    number;

  readonly userProcessCount:
    0;
}> {
  const deadline =
    Date.now() +
    (
      input.timeoutMs ??
      20_000
    );

  while (
    Date.now() <
    deadline
  ) {
    const rows =
      await readLiveWitnessProcessRows({
        pythonExecutable:
          input.pythonExecutable,
        readerScriptPath:
          input.readerScriptPath,
        runtimePassword:
          input.runtimePassword,
      });

    const oldPidPresent =
      rows.some(
        (row) =>
          row.pid ===
            input.oldPid,
      );

    if (
      !oldPidPresent &&
      rows.length ===
        0
    ) {
      return {
        observedAtUtc:
          new Date().toISOString(),
        oldPid:
          input.oldPid,
        userProcessCount:
          0 as const,
      };
    }

    await delay(
      100,
    );
  }

  throw new Error(
    "Old synthetic witness PID did not disappear after normal connection close.",
  );
}
