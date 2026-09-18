import {
  DEMO_FIXTURE_TARGET_ROLE,
  DEMO_FIXTURE_USERNAME,
} from "../change-case/demo-fixture";

import {
  LIVE_NATIVE_AUDIT_SCHEMA_VERSION,
  type NativeUserChangeAuditBinding,
} from "../change-case/live-receipt-closure";

export const NATIVE_AUDIT_TRANSPORT_VERSION =
  "health-v1" as const;

const RUNTIME_USERNAME =
  "meridian.runtime" as const;

interface JsonObject {
  readonly [key: string]:
    unknown;
}

interface NativeAuditRow {
  readonly systemId:
    string;

  readonly auditIndex:
    number;

  readonly utcTimeStamp:
    string;

  readonly eventSource:
    string;

  readonly eventType:
    string;

  readonly event:
    string;

  readonly pid:
    number;

  readonly username:
    string;

  readonly description:
    string;

  readonly eventData:
    string;

  readonly namespace:
    string;

  readonly roles:
    string;

  readonly authentication:
    string;

  readonly status:
    string;
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
    object[
      key
    ];

  return typeof value ===
    "string"
    ? value
    : "";
}

function integerValue(
  object:
    JsonObject,
  key:
    string,
): number {
  const raw =
    object[
      key
    ];

  const value =
    typeof raw ===
      "number"
      ? raw
      : (
          typeof raw ===
            "string" &&
          /^\d+$/.test(
            raw,
          )
            ? Number(
                raw,
              )
            : Number.NaN
        );

  if (
    !Number.isSafeInteger(
      value,
    )
  ) {
    throw new Error(
      `Native audit ${key} is not an integer.`,
    );
  }

  return value;
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

function auditUrl(
  baseUrl:
    string,
  pid?:
    number,
): string {
  const params =
    new URLSearchParams();

  params.set(
    "audit",
    "userchange",
  );

  if (
    pid !==
      undefined
  ) {
    params.set(
      "auditPid",
      String(
        pid,
      ),
    );
  }

  return (
    joinUrl(
      baseUrl,
      "/health",
    ) +
    "?" +
    params.toString()
  );
}

function parseAuditRows(
  value:
    unknown,
  requestedPid?:
    number,
): NativeAuditRow[] {
  const root =
    objectValue(
      value,
      "Native audit response",
    );

  if (
    root.ok !==
      1 &&
    root.ok !==
      true
  ) {
    throw new Error(
      "Native audit helper response is not ok.",
    );
  }

  if (
    root.executeOK !==
      1 &&
    root.executeOK !==
      true
  ) {
    throw new Error(
      "Native audit query did not execute successfully.",
    );
  }

  if (
    root.auditTransportVersion !==
      NATIVE_AUDIT_TRANSPORT_VERSION ||
    root.eventSource !==
      "%System" ||
    root.eventType !==
      "%Security" ||
    root.event !==
      "UserChange" ||
    root.usernameFilter !==
      RUNTIME_USERNAME
  ) {
    throw new Error(
      "Native audit helper contract drifted.",
    );
  }

  if (
    requestedPid !==
      undefined &&
    String(
      root.requestedAuditPid ??
        "",
    ) !==
      String(
        requestedPid,
      )
  ) {
    throw new Error(
      "Native audit PID-bound response does not echo the requested PID.",
    );
  }

  if (
    !Array.isArray(
      root.rows,
    )
  ) {
    throw new Error(
      "Native audit response rows are missing.",
    );
  }

  return root.rows.map(
    (
      raw,
    ) => {
      const row =
        objectValue(
          raw,
          "Native audit row",
        );

      return {
        systemId:
          stringValue(
            row,
            "systemID",
          ),

        auditIndex:
          integerValue(
            row,
            "auditIndex",
          ),

        utcTimeStamp:
          stringValue(
            row,
            "utcTimeStamp",
          ),

        eventSource:
          stringValue(
            row,
            "eventSource",
          ),

        eventType:
          stringValue(
            row,
            "eventType",
          ),

        event:
          stringValue(
            row,
            "event",
          ),

        pid:
          integerValue(
            row,
            "pid",
          ),

        username:
          stringValue(
            row,
            "username",
          ),

        description:
          stringValue(
            row,
            "description",
          ),

        eventData:
          stringValue(
            row,
            "eventData",
          ),

        namespace:
          stringValue(
            row,
            "namespace",
          ),

        roles:
          stringValue(
            row,
            "roles",
          ),

        authentication:
          stringValue(
            row,
            "authentication",
          ),

        status:
          stringValue(
            row,
            "status",
          ),
      };
    },
  );
}

function irisUtcMillis(
  value:
    string,
): number {
  const normalized =
    value.includes(
      "T",
    )
      ? value
      : value.replace(
          " ",
          "T",
        ) +
        "Z";

  const parsed =
    Date.parse(
      normalized,
    );

  if (
    !Number.isFinite(
      parsed,
    )
  ) {
    throw new Error(
      `Native audit UTC is invalid: ${value}`,
    );
  }

  return parsed;
}

function targetRemovalMatches(
  row:
    NativeAuditRow,
  applyStartedAtUtc:
    string,
): boolean {
  if (
    row.eventSource !==
      "%System" ||
    row.eventType !==
      "%Security" ||
    row.event !==
      "UserChange" ||
    row.username !==
      RUNTIME_USERNAME ||
    row.pid <
      1 ||
    row.auditIndex <
      1 ||
    row.systemId.trim().length ===
      0
  ) {
    return false;
  }

  const applyStarted =
    Date.parse(
      applyStartedAtUtc,
    );

  if (
    !Number.isFinite(
      applyStarted,
    )
  ) {
    throw new Error(
      "Apply-start UTC is invalid.",
    );
  }

  if (
    irisUtcMillis(
      row.utcTimeStamp,
    ) <
      applyStarted -
        2_000
  ) {
    return false;
  }

  const escapedUsername =
    DEMO_FIXTURE_USERNAME.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

  const escapedRole =
    DEMO_FIXTURE_TARGET_ROLE.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

  const descriptionMatches =
    new RegExp(
      `^Modify User\\s+${escapedUsername}$`,
      "i",
    ).test(
      row.description.trim(),
    );

  const targetMatches =
    new RegExp(
      `Modify User:\\s*${escapedUsername}(?:\\r?\\n|$)`,
      "i",
    ).test(
      row.eventData,
    );

  const rolesModified =
    /Roles modified:/i.test(
      row.eventData,
    );

  const oldValueMatch =
    /Old value:\s*([^\r\n]*)/i.exec(
      row.eventData,
    );

  const newValueMatch =
    /New value:\s*([^\r\n]*)/i.exec(
      row.eventData,
    );

  const oldRoleMatches =
    oldValueMatch !==
      null &&
    new RegExp(
      `(?:^|,)\\s*${escapedRole}\\s*(?:,|$)`,
      "i",
    ).test(
      oldValueMatch[
        1
      ],
    );

  const newRoleRemoved =
    newValueMatch !==
      null &&
    !new RegExp(
      `(?:^|,)\\s*${escapedRole}\\s*(?:,|$)`,
      "i",
    ).test(
      newValueMatch[
        1
      ],
    );

  return (
    descriptionMatches &&
    targetMatches &&
    rolesModified &&
    oldRoleMatches &&
    newRoleRemoved
  );
}

async function fetchRows(
  input: {
    readonly helperBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly pid?:
      number;

    readonly fetchImpl?:
      typeof fetch;
  },
): Promise<NativeAuditRow[]> {
  const fetchImpl =
    input.fetchImpl ??
    globalThis.fetch.bind(
      globalThis,
    );

  const response =
    await fetchImpl(
      auditUrl(
        input.helperBaseUrl,
        input.pid,
      ),
      {
        method:
          "GET",

        cache:
          "no-store",

        redirect:
          "error",

        headers: {
          Accept:
            "application/json",

          Authorization:
            `Bearer ${input.accessToken}`,
        },
      },
    );

  const text =
    await response.text();

  if (
    !response.ok
  ) {
    throw new Error(
      `Native audit health request failed HTTP ${response.status}.`,
    );
  }

  let json:
    unknown;

  try {
    json =
      JSON.parse(
        text,
      ) as unknown;
  } catch {
    throw new Error(
      "Native audit health response is not JSON.",
    );
  }

  return parseAuditRows(
    json,
    input.pid,
  );
}

export async function findFixtureRoleRemovalAuditOnce(
  input: {
    readonly helperBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly applyStartedAtUtc:
      string;

    readonly fetchImpl?:
      typeof fetch;
  },
): Promise<
  NativeUserChangeAuditBinding |
  null
> {
  const rows =
    await fetchRows({
      helperBaseUrl:
        input.helperBaseUrl,

      accessToken:
        input.accessToken,

      fetchImpl:
        input.fetchImpl,
    });

  const matches =
    rows.filter(
      (
        row,
      ) =>
        targetRemovalMatches(
          row,
          input.applyStartedAtUtc,
        ),
    );

  if (
    matches.length ===
      0
  ) {
    return null;
  }

  if (
    matches.length !==
      1
  ) {
    throw new Error(
      `Native audit binding is ambiguous: ${matches.length} matching UserChange rows.`,
    );
  }

  const match =
    matches[
      0
    ];

  const pidRows =
    await fetchRows({
      helperBaseUrl:
        input.helperBaseUrl,

      accessToken:
        input.accessToken,

      pid:
        match.pid,

      fetchImpl:
        input.fetchImpl,
    });

  const rebound =
    pidRows.filter(
      (
        row,
      ) =>
        row.auditIndex ===
          match.auditIndex &&
        targetRemovalMatches(
          row,
          input.applyStartedAtUtc,
        ),
    );

  if (
    rebound.length !==
      1
  ) {
    throw new Error(
      "Native audit ListByPid rebind did not return exactly the selected UserChange row.",
    );
  }

  return Object.freeze({
    schemaVersion:
      LIVE_NATIVE_AUDIT_SCHEMA_VERSION,

    auditTransportVersion:
      NATIVE_AUDIT_TRANSPORT_VERSION,

    systemId:
      match.systemId,

    auditIndex:
      match.auditIndex,

    utcTimeStamp:
      match.utcTimeStamp,

    eventSource:
      "%System" as const,

    eventType:
      "%Security" as const,

    event:
      "UserChange" as const,

    pid:
      match.pid,

    username:
      RUNTIME_USERNAME,

    description:
      match.description,

    eventData:
      match.eventData,

    namespace:
      match.namespace,

    roles:
      match.roles,

    authentication:
      match.authentication,

    status:
      match.status,

    targetUsername:
      DEMO_FIXTURE_USERNAME,

    targetRole:
      DEMO_FIXTURE_TARGET_ROLE,

    targetBound:
      true as const,

    roleRemovalBound:
      true as const,

    pidRebound:
      true as const,
  });
}
