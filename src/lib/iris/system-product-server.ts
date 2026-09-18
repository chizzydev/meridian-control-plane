import "server-only";

import {
  spawn,
} from "node:child_process";


const SYSTEM_ROLE =
  "MeridianSystemMetadataReader";

const DEFAULT_API_BASE =
  "http://localhost:52773/api/admin";

const DEFAULT_RUNTIME_USER =
  "meridian.runtime";

const PROCESS_QUERY_SOURCE =
  String.raw`
import json
import sys

import iris

payload = json.load(sys.stdin)
password = payload.get("password", "")

if not isinstance(password, str) or not password:
    raise RuntimeError("Runtime password missing.")

conn = None
cursor = None

try:
    conn = iris.connect(
        hostname="127.0.0.1",
        port=1972,
        namespace="%SYS",
        username="meridian.runtime",
        password=password,
        timeout=5,
        sharedmemory=False,
    )

    cursor = conn.cursor()

    cursor.execute(
        "SELECT TOP 100 "
        "Pid,UserName,NameSpace,StartTimeUTC,"
        "ClientIPAddress,StartupClientIPAddress "
        "FROM %SYS.ProcessQuery ORDER BY Pid"
    )

    rows = cursor.fetchall()

    def text(value):
        if value is None:
            return None

        return str(value)

    processes = []

    for row in rows:
        processes.append(
            {
                "pid": text(row[0]),
                "username": text(row[1]),
                "namespace": text(row[2]),
                "startTimeUtc": text(row[3]),
                "clientIp": text(row[4]),
                "startupClientIp": text(row[5]),
            }
        )

    print(
        json.dumps(
            {
                "ok": True,
                "processes": processes,
            },
            separators=(",", ":"),
        )
    )

except Exception as exc:
    print(
        json.dumps(
            {
                "ok": False,
                "errorClass": type(exc).__name__,
            },
            separators=(",", ":"),
        )
    )

    raise

finally:
    if cursor is not None:
        try:
            cursor.close()
        except Exception:
            pass

    if conn is not None:
        try:
            conn.close()
        except Exception:
            pass
`;

type JsonRecord =
  Record<
    string,
    unknown
  >;

export interface SystemProcessRow {
  readonly pid:
    string | null;

  readonly username:
    string | null;

  readonly namespace:
    string | null;

  readonly startTimeUtc:
    string | null;

  readonly clientIp:
    string | null;

  readonly startupClientIp:
    string | null;
}

export interface SystemSurface {
  readonly ok:
    boolean;

  readonly reason:
    string | null;

  readonly systemRole:
    typeof SYSTEM_ROLE;

  readonly systemRoleResources:
    "%Admin_Operate:U + %DB_IRISSYS:R";

  readonly officialProcessEndpointUsed:
    false;

  readonly processTransport:
    "%SYS.ProcessQuery over external SQL";

  readonly readOnly:
    true;

  readonly operationalMutationControls:
    false;

  readonly publicOperationalProxy:
    false;

  readonly browserEscalatedTokenExposure:
    false;

  readonly info:
    JsonRecord | null;

  readonly systemResources:
    readonly JsonRecord[];

  readonly systemUsage:
    JsonRecord | null;

  readonly sharedMemory:
    readonly JsonRecord[];

  readonly locks:
    readonly JsonRecord[];

  readonly processes:
    readonly SystemProcessRow[];
}

interface LoginSession {
  readonly accessToken:
    string;

  readonly refreshToken:
    string;
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

function safeArray(
  payload:
    unknown,
): readonly JsonRecord[] {
  if (!isRecord(payload)) {
    return [];
  }

  if (
    !Array.isArray(
      payload.result,
    )
  ) {
    return [];
  }

  return payload.result.filter(
    isRecord,
  );
}

function safeObject(
  payload:
    unknown,
): JsonRecord | null {
  if (!isRecord(payload)) {
    return null;
  }

  if (
    isRecord(
      payload.result,
    )
  ) {
    return payload.result;
  }

  return null;
}

async function loginSystemRole(
  input: {
    readonly apiBase:
      string;

    readonly username:
      string;

    readonly password:
      string;
  },
): Promise<LoginSession> {
  const response =
    await fetch(
      `${input.apiBase}/login`,
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
              SYSTEM_ROLE,
          }),

        cache:
          "no-store",
      },
    );

  if (
    response.status !==
      200
  ) {
    throw new Error(
      "SYSTEM_ROLE_LOGIN_FAILED",
    );
  }

  const text =
    await response.text();

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
      "SYSTEM_ROLE_LOGIN_PAYLOAD_INVALID",
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
      "SYSTEM_ROLE_LOGIN_TOKEN_MISSING",
    );
  }

  return {
    accessToken,
    refreshToken,
  };
}

async function logout(
  input: {
    readonly apiBase:
      string;

    readonly accessToken:
      string;
  },
): Promise<void> {
  const response =
    await fetch(
      `${input.apiBase}/logout`,
      {
        method:
          "POST",

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

  await response
    .arrayBuffer();
}

async function readOfficial(
  input: {
    readonly apiBase:
      string;

    readonly accessToken:
      string;

    readonly path:
      string;
  },
): Promise<unknown> {
  const response =
    await fetch(
      `${input.apiBase}${input.path}`,
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

  if (
    response.status !==
      200
  ) {
    throw new Error(
      `SYSTEM_READ_FAILED_${response.status}`,
    );
  }

  const text =
    await response.text();

  return text.trim().length >
      0
    ? JSON.parse(
        text,
      )
    : {};
}

function readProcessesViaProcessQuery(
  input: {
    readonly pythonExecutable:
      string;

    readonly password:
      string;
  },
): Promise<
  readonly SystemProcessRow[]
> {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      const child =
        spawn(
          input.pythonExecutable,
          [
            "-c",
            PROCESS_QUERY_SOURCE,
          ],
          {
            windowsHide:
              true,

            shell:
              false,

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

      const timeout =
        setTimeout(
          () => {
            child.kill();

            reject(
              new Error(
                "PROCESSQUERY_TIMEOUT",
              ),
            );
          },
          8000,
        );

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
            chunk;

          if (
            stdout.length >
              2_000_000
          ) {
            child.kill();

            reject(
              new Error(
                "PROCESSQUERY_OUTPUT_LIMIT",
              ),
            );
          }
        },
      );

      child.stderr.on(
        "data",
        (
          chunk:
            string,
        ) => {
          stderr +=
            chunk;

          if (
            stderr.length >
              250_000
          ) {
            child.kill();
          }
        },
      );

      child.on(
        "error",
        () => {
          clearTimeout(
            timeout,
          );

          reject(
            new Error(
              "PROCESSQUERY_SPAWN_FAILED",
            ),
          );
        },
      );

      child.on(
        "close",
        (
          code:
            number | null,
        ) => {
          clearTimeout(
            timeout,
          );

          if (
            code !==
              0
          ) {
            void stderr;

            reject(
              new Error(
                "PROCESSQUERY_READ_FAILED",
              ),
            );

            return;
          }

          try {
            const payload:
              unknown =
              JSON.parse(
                stdout,
              );

            if (
              !isRecord(
                payload,
              ) ||
              payload.ok !==
                true ||
              !Array.isArray(
                payload.processes,
              )
            ) {
              reject(
                new Error(
                  "PROCESSQUERY_PAYLOAD_INVALID",
                ),
              );

              return;
            }

            const processes:
              SystemProcessRow[] =
              [];

            for (
              const value
              of payload.processes
            ) {
              if (!isRecord(value)) {
                reject(
                  new Error(
                    "PROCESSQUERY_ROW_INVALID",
                  ),
                );

                return;
              }

              processes.push({
                pid:
                  typeof value.pid ===
                    "string"
                    ? value.pid
                    : null,

                username:
                  typeof value.username ===
                    "string"
                    ? value.username
                    : null,

                namespace:
                  typeof value.namespace ===
                    "string"
                    ? value.namespace
                    : null,

                startTimeUtc:
                  typeof value.startTimeUtc ===
                    "string"
                    ? value.startTimeUtc
                    : null,

                clientIp:
                  typeof value.clientIp ===
                    "string"
                    ? value.clientIp
                    : null,

                startupClientIp:
                  typeof value.startupClientIp ===
                    "string"
                    ? value.startupClientIp
                    : null,
              });
            }

            resolve(
              processes,
            );
          } catch {
            reject(
              new Error(
                "PROCESSQUERY_JSON_INVALID",
              ),
            );
          }
        },
      );

      child.stdin.end(
        JSON.stringify({
          password:
            input.password,
        }),
      );
    },
  );
}

function unavailable(
  reason:
    string,
): SystemSurface {
  return {
    ok:
      false,

    reason,

    systemRole:
      SYSTEM_ROLE,

    systemRoleResources:
      "%Admin_Operate:U + %DB_IRISSYS:R",

    officialProcessEndpointUsed:
      false,

    processTransport:
      "%SYS.ProcessQuery over external SQL",

    readOnly:
      true,

    operationalMutationControls:
      false,

    publicOperationalProxy:
      false,

    browserEscalatedTokenExposure:
      false,

    info:
      null,

    systemResources:
      [],

    systemUsage:
      null,

    sharedMemory:
      [],

    locks:
      [],

    processes:
      [],
  };
}

export async function readSystemSurfaceFromEnvironment():
  Promise<SystemSurface> {
  const password =
    process.env
      .MERIDIAN_RUNTIME_PASSWORD ??
    "";

  const pythonExecutable =
    process.env
      .MERIDIAN_IRISPYTHON_EXECUTABLE ??
    "";

  const apiBase =
    (
      process.env
        .MERIDIAN_IRIS_API_BASE_URL ??
      DEFAULT_API_BASE
    ).replace(
      /\/+$/,
      "",
    );

  const username =
    process.env
      .MERIDIAN_RUNTIME_USERNAME ??
    DEFAULT_RUNTIME_USER;

  if (
    password.length ===
      0
  ) {
    return unavailable(
      "RUNTIME_CREDENTIAL_NOT_CONFIGURED",
    );
  }

  if (
    pythonExecutable.length ===
      0
  ) {
    return unavailable(
      "PROCESSQUERY_RUNTIME_NOT_CONFIGURED",
    );
  }

  let session:
    LoginSession | null =
    null;

  try {
    session =
      await loginSystemRole({
        apiBase,
        username,
        password,
      });

    const [
      infoPayload,
      systemResourcesPayload,
      systemUsagePayload,
      sharedMemoryPayload,
      locksPayload,
      processes,
    ] =
      await Promise.all([
        readOfficial({
          apiBase,
          accessToken:
            session.accessToken,
          path:
            "/info",
        }),

        readOfficial({
          apiBase,
          accessToken:
            session.accessToken,
          path:
            "/v2/monitor/dashboard/system-resources",
        }),

        readOfficial({
          apiBase,
          accessToken:
            session.accessToken,
          path:
            "/v2/monitor/system-usage",
        }),

        readOfficial({
          apiBase,
          accessToken:
            session.accessToken,
          path:
            "/v2/monitor/system-usage/shared-memory",
        }),

        readOfficial({
          apiBase,
          accessToken:
            session.accessToken,
          path:
            "/v2/locks?maxRows=100",
        }),

        readProcessesViaProcessQuery({
          pythonExecutable,
          password,
        }),
      ]);

    return {
      ok:
        true,

      reason:
        null,

      systemRole:
        SYSTEM_ROLE,

      systemRoleResources:
        "%Admin_Operate:U + %DB_IRISSYS:R",

      officialProcessEndpointUsed:
        false,

      processTransport:
        "%SYS.ProcessQuery over external SQL",

      readOnly:
        true,

      operationalMutationControls:
        false,

      publicOperationalProxy:
        false,

      browserEscalatedTokenExposure:
        false,

      info:
        safeObject(
          infoPayload,
        ),

      systemResources:
        safeArray(
          systemResourcesPayload,
        ),

      systemUsage:
        safeObject(
          systemUsagePayload,
        ),

      sharedMemory:
        safeArray(
          sharedMemoryPayload,
        ),

      locks:
        safeArray(
          locksPayload,
        ),

      processes,
    };
  } catch {
    return unavailable(
      "LIVE_SYSTEM_READ_UNAVAILABLE",
    );
  } finally {
    if (session) {
      try {
        await logout({
          apiBase,
          accessToken:
            session.accessToken,
        });
      } catch {
      }
    }
  }
}
