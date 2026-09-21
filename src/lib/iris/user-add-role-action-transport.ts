import {
  DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
  DEMO_FIXTURE_TRANSPORT_ROLE,
  DEMO_FIXTURE_USERNAME,
  type DemoFixtureUserSnapshot,
} from "../change-case/demo-fixture";

export const P03_USER_SECURITY_PATH =
  `/v2/security/user?name=${encodeURIComponent(DEMO_FIXTURE_USERNAME)}` as const;

export const P03_PREFLIGHT_ROLE_NAMES =
  Object.freeze([
    "MeridianViewer",
    "MeridianJobRunner",
    "MeridianEmployee",
    "MeridianOperator",
    "MeridianSupervisor",
    DEMO_FIXTURE_TRANSPORT_ROLE,
  ] as const);

export type P03PreflightRoleName =
  (typeof P03_PREFLIGHT_ROLE_NAMES)[number];

export interface P03RoleSnapshot {
  readonly name:
    P03PreflightRoleName;

  readonly grantedRoles:
    readonly string[];

  readonly resources:
    readonly Readonly<{
      resource:
        string;

      permission:
        string;
    }>[];
}

interface JsonRecord {
  readonly [key: string]:
    unknown;
}

export class P03UserAuthorityDeniedError
  extends Error {
  constructor(
    message:
      string,
  ) {
    super(
      message,
    );

    this.name =
      "P03UserAuthorityDeniedError";
  }
}

export class P03UserMutationRejectedError
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
      "P03UserMutationRejectedError";
  }
}

export class P03UserMutationUnknownAfterDispatchError
  extends Error {
  constructor(
    message:
      string,
  ) {
    super(
      message,
    );

    this.name =
      "P03UserMutationUnknownAfterDispatchError";
  }
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

function parsedJson(
  text:
    string,
  label:
    string,
): unknown {
  if (
    text.trim().length ===
      0
  ) {
    return {};
  }

  try {
    return JSON.parse(
      text,
    ) as unknown;
  }
  catch {
    throw new Error(
      `${label} returned non-JSON content.`,
    );
  }
}

function resultObject(
  value:
    unknown,
): JsonRecord {
  if (!isRecord(value)) {
    throw new Error(
      "IRIS P03 response is not an object.",
    );
  }

  if (
    isRecord(
      value.result,
    )
  ) {
    return value.result;
  }

  return value;
}

function first(
  value:
    JsonRecord,
  keys:
    readonly string[],
): unknown {
  for (
    const key
    of keys
  ) {
    if (
      Object.prototype
        .hasOwnProperty
        .call(
          value,
          key,
        )
    ) {
      return value[key];
    }
  }

  return undefined;
}

function stringValue(
  value:
    unknown,
): string {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function boolValue(
  value:
    unknown,
): boolean {
  return (
    value ===
      true ||
    value ===
      1 ||
    value ===
      "1" ||
    value ===
      "true"
  );
}

function stringArray(
  value:
    unknown,
): readonly string[] {
  if (
    value ===
      undefined ||
    value ===
      null ||
    value ===
      ""
  ) {
    return Object.freeze([]);
  }

  if (
    Array.isArray(
      value,
    )
  ) {
    return Object.freeze(
      value.map(
        (
          item,
        ) => {
          if (
            typeof item !==
              "string"
          ) {
            throw new Error(
              "IRIS P03 string list contains a non-string value.",
            );
          }

          return item.trim();
        },
      ).filter(Boolean),
    );
  }

  if (
    typeof value ===
      "string"
  ) {
    return Object.freeze(
      value
        .split(
          ",",
        )
        .map(
          (
            item,
          ) =>
            item.trim(),
        )
        .filter(Boolean),
    );
  }

  throw new Error(
    "IRIS P03 string-list representation is unsupported.",
  );
}

function shortPermission(
  value:
    string,
): string {
  const normalized =
    value
      .trim()
      .toUpperCase();

  if (
    normalized ===
      "READ" ||
    normalized ===
      "R"
  ) {
    return "R";
  }

  if (
    normalized ===
      "WRITE" ||
    normalized ===
      "W"
  ) {
    return "W";
  }

  if (
    normalized ===
      "USE" ||
    normalized ===
      "U"
  ) {
    return "U";
  }

  throw new Error(
    `Unsupported IRIS permission ${value}.`,
  );
}

function resources(
  value:
    unknown,
): P03RoleSnapshot["resources"] {
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return Object.freeze([]);
  }

  if (!Array.isArray(value)) {
    throw new Error(
      "IRIS P03 role Resources is not an array.",
    );
  }

  return Object.freeze(
    value.map(
      (
        item,
      ) => {
        if (!isRecord(item)) {
          throw new Error(
            "IRIS P03 role resource is not an object.",
          );
        }

        const resource =
          stringValue(
            first(
              item,
              [
                "Name",
                "name",
              ],
            ),
          );

        const permission =
          stringValue(
            first(
              item,
              [
                "Permissions",
                "permissions",
              ],
            ),
          );

        if (
          resource.length ===
            0 ||
          permission.length ===
            0
        ) {
          throw new Error(
            "IRIS P03 role resource is incomplete.",
          );
        }

        return Object.freeze({
          resource,

          permission:
            shortPermission(
              permission,
            ),
        });
      },
    ),
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

function rolePath(
  name:
    P03PreflightRoleName,
): string {
  return (
    "/v2/security/role?name=" +
    encodeURIComponent(
      name,
    )
  );
}

export async function readP03User(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly fetchImpl?:
      typeof fetch;
  },
): Promise<
  DemoFixtureUserSnapshot |
  null
> {
  const fetchImpl =
    input.fetchImpl ??
    fetch;

  const response =
    await fetchImpl(
      input.apiBaseUrl.replace(
        /\/+$/,
        "",
      ) +
      P03_USER_SECURITY_PATH,
      {
        method:
          "GET",

        cache:
          "no-store",

        headers:
          authorityHeaders(
            input.accessToken,
          ),
      },
    );

  const text =
    await response.text();

  if (
    response.status ===
      404
  ) {
    return null;
  }

  if (
    response.status ===
      401 ||
    response.status ===
      403
  ) {
    throw new P03UserAuthorityDeniedError(
      `Official SysAdmin user read denied with HTTP ${response.status}.`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Official SysAdmin user read returned HTTP ${response.status}. Body=${text.slice(0, 500)}`,
    );
  }

  const result =
    resultObject(
      parsedJson(
        text,
        "Official SysAdmin user read",
      ),
    );

  return Object.freeze({
    username:
      DEMO_FIXTURE_USERNAME,

    displayName:
      stringValue(
        first(
          result,
          [
            "FullName",
            "fullName",
          ],
        ),
      ),

    namespace:
      stringValue(
        first(
          result,
          [
            "NameSpace",
            "Namespace",
            "namespace",
          ],
        ),
      ),

    enabled:
      boolValue(
        first(
          result,
          [
            "Enabled",
            "enabled",
          ],
        ),
      ),

    directRoles:
      stringArray(
        first(
          result,
          [
            "Roles",
            "roles",
          ],
        ),
      ),
  });
}

export async function readP03Role(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly name:
      P03PreflightRoleName;

    readonly fetchImpl?:
      typeof fetch;
  },
): Promise<
  P03RoleSnapshot |
  null
> {
  if (
    !(
      P03_PREFLIGHT_ROLE_NAMES as
        readonly string[]
    ).includes(
      input.name,
    )
  ) {
    throw new Error(
      "P03 refused a role read outside the frozen preflight graph.",
    );
  }

  const fetchImpl =
    input.fetchImpl ??
    fetch;

  const response =
    await fetchImpl(
      input.apiBaseUrl.replace(
        /\/+$/,
        "",
      ) +
      rolePath(
        input.name,
      ),
      {
        method:
          "GET",

        cache:
          "no-store",

        headers:
          authorityHeaders(
            input.accessToken,
          ),
      },
    );

  const text =
    await response.text();

  if (
    response.status ===
      404
  ) {
    return null;
  }

  if (
    response.status ===
      401 ||
    response.status ===
      403
  ) {
    throw new P03UserAuthorityDeniedError(
      `Official SysAdmin role read denied with HTTP ${response.status}.`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Official SysAdmin role read returned HTTP ${response.status}. Body=${text.slice(0, 500)}`,
    );
  }

  const result =
    resultObject(
      parsedJson(
        text,
        "Official SysAdmin role read",
      ),
    );

  return Object.freeze({
    name:
      input.name,

    grantedRoles:
      stringArray(
        first(
          result,
          [
            "GrantedRoles",
            "grantedRoles",
          ],
        ),
      ),

    resources:
      resources(
        first(
          result,
          [
            "Resources",
            "resources",
          ],
        ),
      ),
  });
}

export async function putP03UserAddRole(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly fetchImpl?:
      typeof fetch;
  },
): Promise<
  Readonly<{
    status:
      200;

    mutationRequestCount:
      1;
  }>
> {
  const fetchImpl =
    input.fetchImpl ??
    fetch;

  let response:
    Response;

  try {
    response =
      await fetchImpl(
        input.apiBaseUrl.replace(
          /\/+$/,
          "",
        ) +
        P03_USER_SECURITY_PATH,
        {
          method:
            "PUT",

          cache:
            "no-store",

          headers: {
            ...authorityHeaders(
              input.accessToken,
            ),

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              Roles:
                [
                  ...DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
                ],
            }),
        },
      );
  }
  catch (
    error
  ) {
    throw new P03UserMutationUnknownAfterDispatchError(
      (
        "Official SysAdmin PUT /v2/security/user transport ended without an " +
        "authoritative response. Automatic retry is forbidden. " +
        (
          error instanceof Error
            ? error.message
            : "Unknown transport failure."
        )
      ),
    );
  }

  const text =
    await response.text();

  if (
    response.status ===
      401 ||
    response.status ===
      403
  ) {
    throw new P03UserMutationRejectedError(
      response.status,
      `P03 authority rejected by SysAdmin API with HTTP ${response.status}.`,
    );
  }

  if (
    response.status >=
      500
  ) {
    throw new P03UserMutationUnknownAfterDispatchError(
      `Official SysAdmin PUT /v2/security/user returned HTTP ${response.status}; mutation outcome requires authoritative reconciliation. Body=${text.slice(0, 500)}`,
    );
  }

  if (!response.ok) {
    throw new P03UserMutationRejectedError(
      response.status,
      `Official SysAdmin PUT /v2/security/user rejected P03 with HTTP ${response.status}. Body=${text.slice(0, 500)}`,
    );
  }

  if (
    response.status !==
      200
  ) {
    throw new P03UserMutationUnknownAfterDispatchError(
      `Official SysAdmin PUT /v2/security/user returned unexpected success status ${response.status}.`,
    );
  }

  return Object.freeze({
    status:
      200 as const,

    mutationRequestCount:
      1 as const,
  });
}
