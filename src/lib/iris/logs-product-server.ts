import "server-only";

import {
  spawn,
} from "node:child_process";

const DEFAULT_RUNTIME_USER =
  "meridian.runtime";

const PROCESS_QUERY_SOURCE =
  String.raw`
import json
import re
import sys

import iris

payload = json.load(sys.stdin)
password = payload.get("password", "")

if not isinstance(password, str) or not password:
    raise RuntimeError("Runtime password missing.")

conn = None
cursor = None

def text(value):
    if value is None:
        return None

    return str(value)

def redact_message(value):
    if value is None:
        return None

    result = str(value)

    rules = [
        (
            re.compile(
                r"(?i)(authorization\s*[:=]\s*bearer\s+)[^\s,;]+"
            ),
            r"\1[REDACTED]",
        ),
        (
            re.compile(
                r"(?i)\b(password|passwd|pwd|secret|token|api[_-]?key)\b(\s*[:=]\s*)([^\s,;]+)"
            ),
            r"\1\2[REDACTED]",
        ),
        (
            re.compile(
                r"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b"
            ),
            "[REDACTED_JWT]",
        ),
    ]

    for pattern, replacement in rules:
        result = pattern.sub(
            replacement,
            result,
        )

    if len(result) > 320:
        result = result[:317] + "..."

    return result

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
        "SELECT TOP 200 "
        "Category,LogLevel,Message,Namespace,Pid,Routine,TimeAdded "
        "FROM %Library.SysLogTable "
        "ORDER BY TimeAdded DESC"
    )

    description = cursor.description or []
    columns = [
        str(column[0])
        for column in description
    ]

    rows = cursor.fetchall()

    logs = []

    for row in rows:
        category = text(row[0])
        log_level = text(row[1])
        namespace = text(row[3])
        pid = text(row[4])
        routine = text(row[5])
        time_added = text(row[6])

        source = (
            category
            or namespace
            or routine
            or "Unclassified subsystem"
        )

        logs.append(
            {
                "source": source,
                "category": category,
                "severity": log_level,
                "namespace": namespace,
                "pid": pid,
                "routine": routine,
                "timeAdded": time_added,
                "messagePreview": redact_message(row[2]),
            }
        )

    print(
        json.dumps(
            {
                "ok": True,
                "columns": columns,
                "logs": logs,
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

export interface OperationalLogRow {
  readonly source:
    string;

  readonly category:
    string | null;

  readonly severity:
    string | null;

  readonly namespace:
    string | null;

  readonly pid:
    string | null;

  readonly routine:
    string | null;

  readonly timeAdded:
    string | null;

  readonly messagePreview:
    string | null;
}

export interface LogsFilter {
  readonly severity:
    string | null;

  readonly source:
    string | null;

  readonly hours:
    number | null;
}

export interface LogsSurface {
  readonly ok:
    boolean;

  readonly reason:
    string | null;

  readonly readOnly:
    true;

  readonly sqlObject:
    "%Library.SysLogTable";

  readonly sqlPrivilege:
    "SELECT only";

  readonly transport:
    "InterSystems DBAPI external SQL";

  readonly auditAuthorityDistinct:
    true;

  readonly logMutationControls:
    false;

  readonly browserCredentialExposure:
    false;

  readonly rawMessageExposure:
    false;

  readonly schemaColumns:
    readonly string[];

  readonly sourceIdentitySchema:
    true;

  readonly severitySchema:
    true;

  readonly timeSchema:
    true;

  readonly currentDataState:
    "EMPTY" | "NONEMPTY" | "UNAVAILABLE";

  readonly availableSeverities:
    readonly string[];

  readonly availableSources:
    readonly string[];

  readonly activeFilter:
    LogsFilter;

  readonly totalRows:
    number;

  readonly visibleRows:
    number;

  readonly logs:
    readonly OperationalLogRow[];
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

function optionalString(
  value:
    unknown,
): string | null {
  return typeof value ===
      "string" &&
    value.length >
      0
    ? value
    : null;
}

function sanitizeFilterText(
  value:
    string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const trimmed =
    value.trim().slice(
      0,
      80,
    );

  return trimmed.length >
      0
    ? trimmed
    : null;
}

function sanitizeHours(
  value:
    number | null | undefined,
): number | null {
  if (
    value ===
      1 ||
    value ===
      6 ||
    value ===
      24 ||
    value ===
      72
  ) {
    return value;
  }

  return null;
}

function timestampWithinHours(
  value:
    string | null,

  hours:
    number | null,
): boolean {
  if (
    hours ===
      null
  ) {
    return true;
  }

  if (!value) {
    return false;
  }

  const timestamp =
    Date.parse(
      value,
    );

  if (
    Number.isNaN(
      timestamp,
    )
  ) {
    return false;
  }

  return timestamp >=
    Date.now() -
      hours *
        60 *
        60 *
        1000;
}

function readOperationalLogs(
  input: {
    readonly pythonExecutable:
      string;

    readonly password:
      string;
  },
): Promise<{
  readonly columns:
    readonly string[];

  readonly logs:
    readonly OperationalLogRow[];
}> {
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

      let settled =
        false;

      const fail =
        (
          reason:
            string,
        ) => {
          if (settled) {
            return;
          }

          settled =
            true;

          reject(
            new Error(
              reason,
            ),
          );
        };

      const timeout =
        setTimeout(
          () => {
            child.kill();

            fail(
              "SYSLOGTABLE_TIMEOUT",
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

            fail(
              "SYSLOGTABLE_OUTPUT_LIMIT",
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

          fail(
            "SYSLOGTABLE_SPAWN_FAILED",
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

          if (settled) {
            return;
          }

          if (
            code !==
              0
          ) {
            void stderr;

            fail(
              "SYSLOGTABLE_READ_FAILED",
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
                payload.columns,
              ) ||
              !Array.isArray(
                payload.logs,
              )
            ) {
              fail(
                "SYSLOGTABLE_PAYLOAD_INVALID",
              );

              return;
            }

            const columns =
              payload.columns.filter(
                (
                  value,
                ): value is string =>
                  typeof value ===
                    "string",
              );

            const logs:
              OperationalLogRow[] =
              [];

            for (
              const value
              of payload.logs
            ) {
              if (
                !isRecord(
                  value,
                ) ||
                typeof value.source !==
                  "string"
              ) {
                fail(
                  "SYSLOGTABLE_ROW_INVALID",
                );

                return;
              }

              logs.push({
                source:
                  value.source,

                category:
                  optionalString(
                    value.category,
                  ),

                severity:
                  optionalString(
                    value.severity,
                  ),

                namespace:
                  optionalString(
                    value.namespace,
                  ),

                pid:
                  optionalString(
                    value.pid,
                  ),

                routine:
                  optionalString(
                    value.routine,
                  ),

                timeAdded:
                  optionalString(
                    value.timeAdded,
                  ),

                messagePreview:
                  optionalString(
                    value.messagePreview,
                  ),
              });
            }

            settled =
              true;

            resolve({
              columns,
              logs,
            });
          } catch {
            fail(
              "SYSLOGTABLE_JSON_INVALID",
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
  input: {
    readonly reason:
      string;

    readonly filter:
      LogsFilter;
  },
): LogsSurface {
  return {
    ok:
      false,

    reason:
      input.reason,

    readOnly:
      true,

    sqlObject:
      "%Library.SysLogTable",

    sqlPrivilege:
      "SELECT only",

    transport:
      "InterSystems DBAPI external SQL",

    auditAuthorityDistinct:
      true,

    logMutationControls:
      false,

    browserCredentialExposure:
      false,

    rawMessageExposure:
      false,

    schemaColumns:
      [],

    sourceIdentitySchema:
      true,

    severitySchema:
      true,

    timeSchema:
      true,

    currentDataState:
      "UNAVAILABLE",

    availableSeverities:
      [],

    availableSources:
      [],

    activeFilter:
      input.filter,

    totalRows:
      0,

    visibleRows:
      0,

    logs:
      [],
  };
}

export async function readLogsSurfaceFromEnvironment(
  input: {
    readonly severity?:
      string | null;

    readonly source?:
      string | null;

    readonly hours?:
      number | null;
  } = {},
): Promise<LogsSurface> {
  const password =
    process.env
      .MERIDIAN_RUNTIME_PASSWORD ??
    "";

  const pythonExecutable =
    process.env
      .MERIDIAN_IRISPYTHON_EXECUTABLE ??
    "";

  const username =
    process.env
      .MERIDIAN_RUNTIME_USERNAME ??
    DEFAULT_RUNTIME_USER;

  const filter:
    LogsFilter = {
    severity:
      sanitizeFilterText(
        input.severity,
      ),

    source:
      sanitizeFilterText(
        input.source,
      ),

    hours:
      sanitizeHours(
        input.hours,
      ),
  };

  if (
    username !==
      DEFAULT_RUNTIME_USER
  ) {
    return unavailable({
      reason:
        "RUNTIME_USERNAME_NOT_CERTIFIED",

      filter,
    });
  }

  if (
    password.length ===
      0
  ) {
    return unavailable({
      reason:
        "RUNTIME_CREDENTIAL_NOT_CONFIGURED",

      filter,
    });
  }

  if (
    pythonExecutable.length ===
      0
  ) {
    return unavailable({
      reason:
        "SYSLOGTABLE_RUNTIME_NOT_CONFIGURED",

      filter,
    });
  }

  try {
    const result =
      await readOperationalLogs({
        pythonExecutable,
        password,
      });

    const requiredColumns =
      new Set([
        "CATEGORY",
        "LOGLEVEL",
        "MESSAGE",
        "NAMESPACE",
        "PID",
        "ROUTINE",
        "TIMEADDED",
      ]);

    const actualColumns =
      new Set(
        result.columns.map(
          (
            value,
          ) =>
            value.toUpperCase(),
        ),
      );

    for (
      const column
      of requiredColumns
    ) {
      if (
        !actualColumns.has(
          column,
        )
      ) {
        return unavailable({
          reason:
            "SYSLOGTABLE_SCHEMA_MISMATCH",

          filter,
        });
      }
    }

    const availableSeverities =
      Array.from(
        new Set(
          result.logs
            .map(
              (
                row,
              ) =>
                row.severity,
            )
            .filter(
              (
                value,
              ): value is string =>
                value !==
                  null,
            ),
        ),
      ).sort();

    const availableSources =
      Array.from(
        new Set(
          result.logs.map(
            (
              row,
            ) =>
              row.source,
          ),
        ),
      ).sort();

    const visible =
      result.logs.filter(
        (
          row,
        ) => {
          if (
            filter.severity &&
            row.severity !==
              filter.severity
          ) {
            return false;
          }

          if (
            filter.source &&
            !row.source
              .toLowerCase()
              .includes(
                filter.source.toLowerCase(),
              )
          ) {
            return false;
          }

          if (
            !timestampWithinHours(
              row.timeAdded,
              filter.hours,
            )
          ) {
            return false;
          }

          return true;
        },
      );

    return {
      ok:
        true,

      reason:
        null,

      readOnly:
        true,

      sqlObject:
        "%Library.SysLogTable",

      sqlPrivilege:
        "SELECT only",

      transport:
        "InterSystems DBAPI external SQL",

      auditAuthorityDistinct:
        true,

      logMutationControls:
        false,

      browserCredentialExposure:
        false,

      rawMessageExposure:
        false,

      schemaColumns:
        result.columns,

      sourceIdentitySchema:
        true,

      severitySchema:
        true,

      timeSchema:
        true,

      currentDataState:
        result.logs.length >
          0
          ? "NONEMPTY"
          : "EMPTY",

      availableSeverities,

      availableSources,

      activeFilter:
        filter,

      totalRows:
        result.logs.length,

      visibleRows:
        visible.length,

      logs:
        visible.slice(
          0,
          100,
        ),
    };
  } catch {
    return unavailable({
      reason:
        "LIVE_OPERATIONAL_LOG_READ_UNAVAILABLE",

      filter,
    });
  }
}
