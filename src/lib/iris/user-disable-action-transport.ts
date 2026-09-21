import {
  DEMO_FIXTURE_USERNAME,
} from "../change-case/demo-fixture";

export const P06_USER_SECURITY_PATH =
  `/v2/security/user?name=${encodeURIComponent(DEMO_FIXTURE_USERNAME)}` as const;

export const P06_LOGIN_PATH = "/login" as const;

interface JsonRecord {
  readonly [key: string]: unknown;
}

export interface P06UserSnapshot {
  readonly username: typeof DEMO_FIXTURE_USERNAME;
  readonly accountNeverExpires: boolean;
  readonly autheEnabled: number;
  readonly changePassword: boolean;
  readonly comment: string;
  readonly emailAddress: string;
  readonly enabled: boolean;
  readonly expirationDate: string;
  readonly fullName: string;
  readonly hotpKeyDisplay: boolean;
  readonly namespace: string;
  readonly passwordNeverExpires: boolean;
  readonly phoneNumber: string;
  readonly phoneProvider: string;
  readonly roles: readonly string[];
  readonly escalationRoles: readonly string[];
  readonly routine: string;
}

export interface P06LoginProbe {
  readonly status: 200 | 401;
  readonly authenticated: boolean;
  readonly accessTokenObserved: boolean;
  readonly refreshTokenObserved: boolean;
}

export class P06UserAuthorityDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "P06UserAuthorityDeniedError";
  }
}

export class P06UserMutationRejectedError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "P06UserMutationRejectedError";
  }
}

export class P06UserMutationUnknownAfterDispatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "P06UserMutationUnknownAfterDispatchError";
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

function resultObject(value: unknown): JsonRecord {
  if (!isRecord(value)) {
    throw new Error("IRIS P06 response is not an object.");
  }

  if (isRecord(value.result)) {
    return value.result;
  }

  return value;
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

function boolValue(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    (typeof value === "string" && value.toLowerCase() === "true")
  );
}

function integerValue(value: unknown): number {
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return value;
  }

  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) {
      return parsed;
    }
  }

  if (value === undefined || value === null || value === "") {
    return 0;
  }

  throw new Error("IRIS P06 integer representation is unsupported.");
}

function stringArray(value: unknown): readonly string[] {
  if (value === undefined || value === null || value === "") {
    return Object.freeze([]);
  }

  if (Array.isArray(value)) {
    return Object.freeze(
      value.map((item) => {
        if (typeof item !== "string") {
          throw new Error("IRIS P06 string list contains a non-string value.");
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

  throw new Error("IRIS P06 string-list representation is unsupported.");
}

function authorityHeaders(accessToken: string): HeadersInit {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function readP06User(input: {
  readonly apiBaseUrl: string;
  readonly accessToken: string;
  readonly fetchImpl?: typeof fetch;
}): Promise<P06UserSnapshot | null> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(
    input.apiBaseUrl.replace(/\/+$/, "") + P06_USER_SECURITY_PATH,
    {
      method: "GET",
      cache: "no-store",
      headers: authorityHeaders(input.accessToken),
    },
  );

  const text = await response.text();

  if (response.status === 404) {
    return null;
  }

  if (response.status === 401 || response.status === 403) {
    throw new P06UserAuthorityDeniedError(
      `Official SysAdmin user read denied with HTTP ${response.status}.`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Official SysAdmin user read returned HTTP ${response.status}. Body=${text.slice(0, 500)}`,
    );
  }

  const result = resultObject(parsedJson(text, "Official SysAdmin user read"));

  return Object.freeze({
    username: DEMO_FIXTURE_USERNAME,
    accountNeverExpires: boolValue(first(result, ["AccountNeverExpires", "accountNeverExpires"])),
    autheEnabled: integerValue(first(result, ["AutheEnabled", "autheEnabled"])),
    changePassword: boolValue(first(result, ["ChangePassword", "changePassword"])),
    comment: stringValue(first(result, ["Comment", "comment"])),
    emailAddress: stringValue(first(result, ["EmailAddress", "emailAddress"])),
    enabled: boolValue(first(result, ["Enabled", "enabled"])),
    expirationDate: stringValue(first(result, ["ExpirationDate", "expirationDate"])),
    fullName: stringValue(first(result, ["FullName", "fullName"])),
    hotpKeyDisplay: boolValue(first(result, ["HOTPKeyDisplay", "hotpKeyDisplay"])),
    namespace: stringValue(first(result, ["NameSpace", "Namespace", "namespace"])),
    passwordNeverExpires: boolValue(first(result, ["PasswordNeverExpires", "passwordNeverExpires"])),
    phoneNumber: stringValue(first(result, ["PhoneNumber", "phoneNumber"])),
    phoneProvider: stringValue(first(result, ["PhoneProvider", "phoneProvider"])),
    roles: stringArray(first(result, ["Roles", "roles"])),
    escalationRoles: stringArray(first(result, ["EscalationRoles", "escalationRoles"])),
    routine: stringValue(first(result, ["Routine", "routine"])),
  });
}

export async function probeP06Login(input: {
  readonly apiBaseUrl: string;
  readonly username: typeof DEMO_FIXTURE_USERNAME;
  readonly password: string;
  readonly fetchImpl?: typeof fetch;
}): Promise<P06LoginProbe> {
  if (input.password.length === 0) {
    throw new Error("P06 login probe requires the in-memory synthetic credential.");
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(
    input.apiBaseUrl.replace(/\/+$/, "") + P06_LOGIN_PATH,
    {
      method: "POST",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user: input.username,
        password: input.password,
      }),
    },
  );

  const text = await response.text();

  if (response.status === 401) {
    return Object.freeze({
      status: 401 as const,
      authenticated: false,
      accessTokenObserved: false,
      refreshTokenObserved: false,
    });
  }

  if (response.status !== 200) {
    throw new Error(
      `P06 login probe returned unexpected HTTP ${response.status}. Body=${text.slice(0, 500)}`,
    );
  }

  const result = resultObject(parsedJson(text, "P06 successful login probe"));
  const accessToken = stringValue(first(result, ["access_token", "accessToken"]));
  const refreshToken = stringValue(first(result, ["refresh_token", "refreshToken"]));

  if (accessToken.length === 0 || refreshToken.length === 0) {
    throw new Error("P06 successful login probe did not return both tokens.");
  }

  return Object.freeze({
    status: 200 as const,
    authenticated: true,
    accessTokenObserved: true,
    refreshTokenObserved: true,
  });
}

export async function putP06UserDisable(input: {
  readonly apiBaseUrl: string;
  readonly accessToken: string;
  readonly fetchImpl?: typeof fetch;
}): Promise<Readonly<{
  status: 200;
  mutationRequestCount: 1;
}>> {
  const fetchImpl = input.fetchImpl ?? fetch;
  let response: Response;

  try {
    response = await fetchImpl(
      input.apiBaseUrl.replace(/\/+$/, "") + P06_USER_SECURITY_PATH,
      {
        method: "PUT",
        cache: "no-store",
        headers: {
          ...authorityHeaders(input.accessToken),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Enabled: false,
        }),
      },
    );
  } catch (error) {
    throw new P06UserMutationUnknownAfterDispatchError(
      "Official SysAdmin PUT /v2/security/user transport ended without an " +
      "authoritative response. Automatic retry is forbidden. " +
      (error instanceof Error ? error.message : "Unknown transport failure."),
    );
  }

  const text = await response.text();

  if (response.status === 401 || response.status === 403) {
    throw new P06UserMutationRejectedError(
      response.status,
      `P06 authority rejected by SysAdmin API with HTTP ${response.status}.`,
    );
  }

  if (response.status >= 500) {
    throw new P06UserMutationUnknownAfterDispatchError(
      `Official SysAdmin PUT /v2/security/user returned HTTP ${response.status}; mutation outcome requires authoritative reconciliation. Body=${text.slice(0, 500)}`,
    );
  }

  if (!response.ok) {
    throw new P06UserMutationRejectedError(
      response.status,
      `Official SysAdmin PUT /v2/security/user rejected P06 with HTTP ${response.status}. Body=${text.slice(0, 500)}`,
    );
  }

  if (response.status !== 200) {
    throw new P06UserMutationUnknownAfterDispatchError(
      `Official SysAdmin PUT /v2/security/user returned unexpected success status ${response.status}.`,
    );
  }

  return Object.freeze({
    status: 200 as const,
    mutationRequestCount: 1 as const,
  });
}
