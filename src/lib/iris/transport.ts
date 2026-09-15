export interface IrisSession {
  accessToken: string;
  refreshToken: string;
}

interface JsonObject {
  [key: string]: unknown;
}

export interface IrisRuntimeInfo {
  username: string;
  serverVersion: string;
  apiVersion: number;
}

export interface IrisUserRead {
  username: string;
  displayName: string;
  enabled: boolean;
  namespace: string;
  directRoles: string[];
}

export interface IrisNativeRecurseRead {
  actor: string;
  processId: number;
  inputRoles: string[];
  effectiveRoles: string[];
}

export interface IrisNativePermissionRead {
  actor: string;
  processId: number;
  roles: string[];
  resource: string;
  permission: "READ" | "WRITE" | "USE";
  allowed: boolean;
}

function objectValue(
  value: unknown,
): JsonObject {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(
      "IRIS response is not an object.",
    );
  }

  return value as JsonObject;
}

function unwrapResult(
  value: unknown,
): JsonObject {
  const outer =
    objectValue(value);

  if (
    typeof outer.result === "object" &&
    outer.result !== null &&
    !Array.isArray(
      outer.result,
    )
  ) {
    return outer.result as JsonObject;
  }

  return outer;
}

function first(
  object: JsonObject,
  keys: readonly string[],
): unknown {
  for (const key of keys) {
    if (
      Object.prototype.hasOwnProperty.call(
        object,
        key,
      )
    ) {
      return object[key];
    }
  }

  return undefined;
}

function requiredString(
  value: unknown,
  label: string,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      `${label} is missing.`,
    );
  }

  return value.trim();
}

function optionalString(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizedRoles(
  value: unknown,
): string[] {
  let roles:
    string[];

  if (Array.isArray(value)) {
    roles =
      value
        .filter(
          (
            item,
          ): item is string =>
            typeof item ===
            "string",
        )
        .map((item) =>
          item.trim(),
        )
        .filter(Boolean);
  } else if (
    typeof value ===
    "string"
  ) {
    roles =
      value
        .split(",")
        .map((item) =>
          item.trim(),
        )
        .filter(Boolean);
  } else if (
    value === undefined ||
    value === null
  ) {
    roles = [];
  } else {
    throw new Error(
      "IRIS role representation is unsupported.",
    );
  }

  return [
    ...new Set(
      roles,
    ),
  ].sort((left, right) =>
    left.localeCompare(
      right,
    ),
  );
}

function numberValue(
  value: unknown,
  label: string,
): number {
  if (
    typeof value ===
      "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value ===
      "string" &&
    value.trim().length >
      0
  ) {
    const parsed =
      Number(value);

    if (
      Number.isFinite(parsed)
    ) {
      return parsed;
    }
  }

  throw new Error(
    `${label} is not numeric.`,
  );
}

async function jsonRequest(input: {
  url: string;
  method?: "GET" | "POST";
  accessToken?: string;
  body?: unknown;
}): Promise<unknown> {
  const headers =
    new Headers({
      Accept:
        "application/json",
    });

  if (input.accessToken) {
    headers.set(
      "Authorization",
      `Bearer ${input.accessToken}`,
    );
  }

  let body:
    string | undefined;

  if (
    input.body !==
    undefined
  ) {
    headers.set(
      "Content-Type",
      "application/json",
    );

    body =
      JSON.stringify(
        input.body,
      );
  }

  const response =
    await fetch(
      input.url,
      {
        method:
          input.method ??
          "GET",
        headers,
        body,
        cache:
          "no-store",
      },
    );

  const text =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `IRIS request failed with HTTP ${response.status}.`,
    );
  }

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
  } catch {
    throw new Error(
      "IRIS returned non-JSON content.",
    );
  }
}

export async function loginIris(input: {
  baseUrl: string;
  username: string;
  password: string;
}): Promise<IrisSession> {
  const raw =
    await jsonRequest({
      url:
        `${input.baseUrl}/login`,
      method:
        "POST",
      body: {
        user:
          input.username,
        password:
          input.password,
      },
    });

  const result =
    unwrapResult(raw);

  const accessToken =
    requiredString(
      first(
        result,
        [
          "access_token",
          "accessToken",
        ],
      ),
      "IRIS access token",
    );

  const refreshToken =
    requiredString(
      first(
        result,
        [
          "refresh_token",
          "refreshToken",
        ],
      ),
      "IRIS refresh token",
    );

  return {
    accessToken,
    refreshToken,
  };
}

export async function logoutIris(input: {
  baseUrl: string;
  accessToken: string;
}): Promise<void> {
  await jsonRequest({
    url:
      `${input.baseUrl}/logout`,
    method:
      "POST",
    accessToken:
      input.accessToken,
  });
}

export async function readRuntimeInfo(input: {
  baseUrl: string;
  accessToken: string;
}): Promise<IrisRuntimeInfo> {
  const raw =
    await jsonRequest({
      url:
        `${input.baseUrl}/info`,
      accessToken:
        input.accessToken,
    });

  const result =
    unwrapResult(raw);

  return {
    username:
      requiredString(
        first(
          result,
          [
            "username",
            "Username",
          ],
        ),
        "IRIS runtime username",
      ),
    serverVersion:
      requiredString(
        first(
          result,
          [
            "serverVersion",
            "ServerVersion",
          ],
        ),
        "IRIS server version",
      ),
    apiVersion:
      numberValue(
        first(
          result,
          [
            "apiVersion",
            "ApiVersion",
          ],
        ),
        "IRIS API version",
      ),
  };
}

export async function readIrisUser(input: {
  baseUrl: string;
  accessToken: string;
  username: string;
}): Promise<IrisUserRead> {
  const url =
    new URL(
      `${input.baseUrl}/v2/security/user`,
    );

  url.searchParams.set(
    "name",
    input.username,
  );

  const raw =
    await jsonRequest({
      url:
        url.toString(),
      accessToken:
        input.accessToken,
    });

  const result =
    unwrapResult(raw);

  const username =
    requiredString(
      input.username,
      "IRIS user name",
    );

  const displayName =
    optionalString(
      first(
        result,
        [
          "FullName",
          "fullName",
          "fullname",
        ],
      ),
    );

  const namespace =
    optionalString(
      first(
        result,
        [
          "NameSpace",
          "namespace",
          "Namespace",
        ],
      ),
    );

  const enabledRaw =
    first(
      result,
      [
        "Enabled",
        "enabled",
      ],
    );

  const enabled =
    enabledRaw === true ||
    enabledRaw === 1 ||
    enabledRaw === "1";

  return {
    username,
    displayName:
      displayName ||
      username,
    enabled,
    namespace,
    directRoles:
      normalizedRoles(
        first(
          result,
          [
            "Roles",
            "roles",
          ],
        ),
      ),
  };
}

export async function readNativeRecursion(input: {
  helperBaseUrl: string;
  accessToken: string;
  roles: string[];
}): Promise<IrisNativeRecurseRead> {
  const url =
    new URL(
      `${input.helperBaseUrl}/recurse`,
    );

  url.searchParams.set(
    "roles",
    input.roles.join(","),
  );

  const raw =
    await jsonRequest({
      url:
        url.toString(),
      accessToken:
        input.accessToken,
    });

  const result =
    objectValue(raw);

  if (
    first(
      result,
      ["ok"],
    ) !== 1
  ) {
    throw new Error(
      "Native IRIS recursion helper did not report success.",
    );
  }

  return {
    actor:
      requiredString(
        first(
          result,
          ["user"],
        ),
        "Native recursion actor",
      ),
    processId:
      numberValue(
        first(
          result,
          ["pid"],
        ),
        "Native recursion PID",
      ),
    inputRoles:
      normalizedRoles(
        first(
          result,
          [
            "inputRoles",
          ],
        ),
      ),
    effectiveRoles:
      normalizedRoles(
        first(
          result,
          [
            "recursedRoles",
          ],
        ),
      ),
  };
}

export async function readNativePermission(input: {
  helperBaseUrl: string;
  accessToken: string;
  roles: string[];
  resource: string;
  permission:
    "READ" |
    "WRITE" |
    "USE";
}): Promise<IrisNativePermissionRead> {
  const url =
    new URL(
      `${input.helperBaseUrl}/permission`,
    );

  url.searchParams.set(
    "roles",
    input.roles.join(","),
  );

  url.searchParams.set(
    "resource",
    input.resource,
  );

  url.searchParams.set(
    "permission",
    input.permission,
  );

  const raw =
    await jsonRequest({
      url:
        url.toString(),
      accessToken:
        input.accessToken,
    });

  const result =
    objectValue(raw);

  if (
    first(
      result,
      ["ok"],
    ) !== 1
  ) {
    throw new Error(
      "Native IRIS permission helper did not report success.",
    );
  }

  const allowedRaw =
    first(
      result,
      ["allowed"],
    );

  return {
    actor:
      requiredString(
        first(
          result,
          ["user"],
        ),
        "Native permission actor",
      ),
    processId:
      numberValue(
        first(
          result,
          ["pid"],
        ),
        "Native permission PID",
      ),
    roles:
      normalizedRoles(
        first(
          result,
          ["roles"],
        ),
      ),
    resource:
      requiredString(
        first(
          result,
          ["resource"],
        ),
        "Permission resource",
      ),
    permission:
      requiredString(
        first(
          result,
          ["permission"],
        ),
        "Permission name",
      ) as
        | "READ"
        | "WRITE"
        | "USE",
    allowed:
      allowedRaw === 1 ||
      allowedRaw === true ||
      allowedRaw === "1",
  };
}