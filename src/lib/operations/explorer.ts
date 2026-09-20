import {
  findSysAdminOperation,
  isKnownSysAdminPath,
  type SysAdminOperation,
} from "./manifest";

export const READ_EXPLORER_METHODS =
  Object.freeze([
    "GET",
    "HEAD",
    "OPTIONS",
  ] as const);

export type ReadExplorerMethod =
  (typeof READ_EXPLORER_METHODS)[number];

export const READ_AUTHORITY_MODES =
  Object.freeze([
    "STANDING_RUNTIME",
    "MeridianSecurityMetadataReader",
    "MeridianTaskMetadataReader",
    "MeridianSystemMetadataReader",
  ] as const);

export type ReadAuthorityMode =
  (typeof READ_AUTHORITY_MODES)[number];

export interface ReadExplorerPlan {
  readonly operation:
    SysAdminOperation;

  readonly requestMethod:
    ReadExplorerMethod;

  readonly query:
    readonly (
      readonly [
        string,
        string,
      ]
    )[];

  readonly authorityMode:
    ReadAuthorityMode | null;

  readonly capability:
    "READY" |
    "UNAVAILABLE_RUNTIME";

  readonly reason:
    string | null;
}

const ROLE_PRIVILEGES:
  Readonly<
    Record<
      Exclude<
        ReadAuthorityMode,
        "STANDING_RUNTIME"
      >,
      readonly string[]
    >
  > =
  Object.freeze({
    MeridianSecurityMetadataReader:
      Object.freeze([
        "%Admin_Secure:U",
        "%Admin_Wallet:U",
        "%Admin_OAuth2_Client:U",
        "%Admin_OAuth2_Registration:U",
      ]),
    MeridianTaskMetadataReader:
      Object.freeze([
        "%Admin_Task:U",
      ]),
    MeridianSystemMetadataReader:
      Object.freeze([
        "%Admin_Operate:U",
      ]),
  });

function supportsOption(
  role:
    Exclude<
      ReadAuthorityMode,
      "STANDING_RUNTIME"
    >,
  option:
    readonly string[],
): boolean {
  const privileges =
    ROLE_PRIVILEGES[
      role
    ];

  return option.every(
    (
      privilege,
    ) =>
      privileges.includes(
        privilege,
      ),
  );
}

export function selectReadAuthority(
  operation:
    SysAdminOperation,
): ReadAuthorityMode | null {
  if (
    operation.authorityOptions.length ===
      0
  ) {
    return "STANDING_RUNTIME";
  }

  const preference:
    readonly Exclude<
      ReadAuthorityMode,
      "STANDING_RUNTIME"
    >[] =
    operation.family ===
      "TASKS"
      ? [
          "MeridianTaskMetadataReader",
          "MeridianSystemMetadataReader",
          "MeridianSecurityMetadataReader",
        ]
      : (
          operation.family ===
            "SECURITY_SECRETS" ||
          operation.family ===
            "PERMISSIONS" ||
          operation.family ===
            "WEB_REST"
        )
        ? [
            "MeridianSecurityMetadataReader",
            "MeridianTaskMetadataReader",
            "MeridianSystemMetadataReader",
          ]
        : [
            "MeridianSystemMetadataReader",
            "MeridianTaskMetadataReader",
            "MeridianSecurityMetadataReader",
          ];

  for (
    const role
    of preference
  ) {
    if (
      operation.authorityOptions.some(
        (
          option,
        ) =>
          supportsOption(
            role,
            option,
          ),
      )
    ) {
      return role;
    }
  }

  return null;
}

function cleanParameter(
  value:
    string,
  name:
    string,
): string {
  const trimmed =
    value.trim();

  if (
    trimmed.length >
      512 ||
    /[\r\n]/.test(
      trimmed,
    )
  ) {
    throw new Error(
      `Read explorer parameter ${name} is unsafe.`,
    );
  }

  return trimmed;
}

export function buildReadExplorerPlan(
  input: {
    readonly operationId:
      string;

    readonly requestMethod:
      ReadExplorerMethod;

    readonly rawQuery:
      Readonly<
        Record<
          string,
          string |
          undefined
        >
      >;
  },
): ReadExplorerPlan {
  const operation =
    findSysAdminOperation(
      input.operationId,
    );

  if (
    operation ===
      null
  ) {
    throw new Error(
      "Read explorer operation is not present in the pinned manifest.",
    );
  }

  if (
    !(
      READ_EXPLORER_METHODS as readonly string[]
    ).includes(
      input.requestMethod,
    )
  ) {
    throw new Error(
      "Read explorer method is not allowed.",
    );
  }

  if (
    input.requestMethod ===
      "GET" &&
    operation.method !==
      "GET"
  ) {
    throw new Error(
      "GET explorer dispatch requires a declared GET operation.",
    );
  }

  if (
    input.requestMethod ===
      "HEAD" &&
    operation.method !==
      "HEAD"
  ) {
    throw new Error(
      "HEAD explorer dispatch requires an organizer-declared HEAD companion.",
    );
  }

  if (
    input.requestMethod ===
      "OPTIONS" &&
    !isKnownSysAdminPath(
      operation.path,
    )
  ) {
    throw new Error(
      "OPTIONS explorer dispatch requires a path from the pinned organizer spec.",
    );
  }

  const allowedNames =
    new Set(
      operation.queryParameters.map(
        (
          parameter,
        ) =>
          parameter.name,
      ),
    );

  for (
    const name
    of Object.keys(
      input.rawQuery,
    )
  ) {
    if (
      !allowedNames.has(
        name,
      )
    ) {
      throw new Error(
        `Read explorer rejected unknown query parameter: ${name}.`,
      );
    }
  }

  const query:
    Array<
      readonly [
        string,
        string,
      ]
    > = [];

  for (
    const parameter
    of operation.queryParameters
  ) {
    const raw =
      input.rawQuery[
        parameter.name
      ];

    const value =
      raw ===
        undefined
        ? ""
        : cleanParameter(
            raw,
            parameter.name,
          );

    if (
      input.requestMethod !==
        "OPTIONS" &&
      parameter.required &&
      value.length ===
        0
    ) {
      throw new Error(
        `Read explorer requires query parameter: ${parameter.name}.`,
      );
    }

    if (
      value.length >
        0
    ) {
      query.push([
        parameter.name,
        value,
      ] as const);
    }
  }

  const authorityMode =
    selectReadAuthority(
      operation,
    );

  return Object.freeze({
    operation,
    requestMethod:
      input.requestMethod,
    query:
      Object.freeze(
        query,
      ),
    authorityMode,
    capability:
      authorityMode ===
        null
        ? "UNAVAILABLE_RUNTIME"
        : "READY",
    reason:
      authorityMode ===
        null
        ? (
            "The pinned operation is visible in coverage, but the current " +
            "Meridian runtime has no approved read escalation role for its authority requirement."
          )
        : null,
  });
}
