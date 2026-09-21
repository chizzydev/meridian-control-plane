import {
  R4_PERMISSION_ROLE_CREATE_BODY,
  R4_PERMISSION_ROLE_NAME,
  R4_PERMISSION_ROLE_RESOURCE,
  type R4PermissionRoleSnapshot,
} from "../actions/permissions/role-fixture";

interface JsonRecord {
  readonly [key: string]:
    unknown;
}

export class SecurityRoleAuthorityDeniedError
  extends Error {
  constructor(
    message:
      string,
  ) {
    super(
      message,
    );

    this.name =
      "SecurityRoleAuthorityDeniedError";
  }
}

export class SecurityRoleMutationRejectedError
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
      "SecurityRoleMutationRejectedError";
  }
}

export class SecurityRoleMutationUnknownAfterDispatchError
  extends Error {
  constructor(
    message:
      string,
  ) {
    super(
      message,
    );

    this.name =
      "SecurityRoleMutationUnknownAfterDispatchError";
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
      "IRIS security-role response is not an object.",
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
              "IRIS role string list contains a non-string value.",
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
    "IRIS role string-list representation is unsupported.",
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

function parseResources(
  value:
    unknown,
): R4PermissionRoleSnapshot["resources"] {
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
      "IRIS role Resources is not an array.",
    );
  }

  return Object.freeze(
    value.map(
      (
        item,
      ) => {
        if (!isRecord(item)) {
          throw new Error(
            "IRIS role resource is not an object.",
          );
        }

        const name =
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
          name.length ===
            0 ||
          permission.length ===
            0
        ) {
          throw new Error(
            "IRIS role resource identity is incomplete.",
          );
        }

        return Object.freeze({
          name,

          permission:
            shortPermission(
              permission,
            ),
        });
      },
    ),
  );
}

function roleEndpoint(
  apiBaseUrl:
    string,
): string {
  return (
    apiBaseUrl.replace(
      /\/+$/,
      "",
    ) +
    "/v2/security/role?name=" +
    encodeURIComponent(
      R4_PERMISSION_ROLE_NAME,
    )
  );
}

function resourceEndpoint(
  apiBaseUrl:
    string,
): string {
  return (
    apiBaseUrl.replace(
      /\/+$/,
      "",
    ) +
    "/v2/security/resource?name=" +
    encodeURIComponent(
      R4_PERMISSION_ROLE_RESOURCE,
    )
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

export async function readR4PermissionRole(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly fetchImpl?:
      typeof fetch;
  },
): Promise<
  R4PermissionRoleSnapshot |
  null
> {
  const fetchImpl =
    input.fetchImpl ??
    fetch;

  const response =
    await fetchImpl(
      roleEndpoint(
        input.apiBaseUrl,
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
    throw new SecurityRoleAuthorityDeniedError(
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
      R4_PERMISSION_ROLE_NAME,

    description:
      stringValue(
        first(
          result,
          [
            "Description",
            "description",
          ],
        ),
      ),

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
      parseResources(
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

export async function readR4PermissionResourceExists(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly fetchImpl?:
      typeof fetch;
  },
): Promise<boolean> {
  const fetchImpl =
    input.fetchImpl ??
    fetch;

  const response =
    await fetchImpl(
      resourceEndpoint(
        input.apiBaseUrl,
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

  await response.text();

  if (
    response.status ===
      404
  ) {
    return false;
  }

  if (
    response.status ===
      401 ||
    response.status ===
      403
  ) {
    throw new SecurityRoleAuthorityDeniedError(
      `Official SysAdmin resource read denied with HTTP ${response.status}.`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Official SysAdmin resource read returned HTTP ${response.status}.`,
    );
  }

  return true;
}

export async function createR4PermissionRole(
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
      number;

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
        roleEndpoint(
          input.apiBaseUrl,
        ),
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
            JSON.stringify(
              R4_PERMISSION_ROLE_CREATE_BODY,
            ),
        },
      );
  }
  catch (
    error
  ) {
    throw new SecurityRoleMutationUnknownAfterDispatchError(
      (
        "Official SysAdmin PUT /v2/security/role transport ended without an " +
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
    throw new SecurityRoleMutationRejectedError(
      response.status,
      `P01 authority rejected by SysAdmin API with HTTP ${response.status}.`,
    );
  }

  if (
    response.status >=
      500
  ) {
    throw new SecurityRoleMutationUnknownAfterDispatchError(
      `Official SysAdmin PUT /v2/security/role returned HTTP ${response.status}; mutation outcome requires authoritative reconciliation. Body=${text.slice(0, 500)}`,
    );
  }

  if (!response.ok) {
    throw new SecurityRoleMutationRejectedError(
      response.status,
      `Official SysAdmin PUT /v2/security/role rejected P01 with HTTP ${response.status}. Body=${text.slice(0, 500)}`,
    );
  }

  if (
    response.status !==
      200 &&
    response.status !==
      201
  ) {
    throw new SecurityRoleMutationUnknownAfterDispatchError(
      `Official SysAdmin PUT /v2/security/role returned unexpected success status ${response.status}.`,
    );
  }

  return Object.freeze({
    status:
      response.status,

    mutationRequestCount:
      1 as const,
  });
}
