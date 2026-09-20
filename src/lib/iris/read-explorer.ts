import "server-only";

import {
  buildReadExplorerPlan,
  type ReadAuthorityMode,
  type ReadExplorerMethod,
  type ReadExplorerPlan,
} from "../operations/explorer";

const DEFAULT_API_BASE =
  "http://localhost:52773/api/admin";

const DEFAULT_RUNTIME_USER =
  "meridian.runtime";

interface JsonRecord {
  readonly [key: string]:
    unknown;
}

interface ReadSession {
  readonly accessToken:
    string;

  readonly refreshToken:
    string;
}

export interface ReadExplorerResult {
  readonly ok:
    boolean;

  readonly capability:
    "READY" |
    "UNAVAILABLE_RUNTIME" |
    "RUNTIME_CREDENTIAL_NOT_CONFIGURED" |
    "LIVE_READ_UNAVAILABLE";

  readonly operationId:
    string;

  readonly requestMethod:
    ReadExplorerMethod;

  readonly requestPath:
    string;

  readonly authorityMode:
    ReadAuthorityMode | null;

  readonly httpStatus:
    number | null;

  readonly contentType:
    string | null;

  readonly responsePreview:
    string;

  readonly reason:
    string | null;

  readonly browserCredentialExposure:
    false;

  readonly genericMutationDispatch:
    false;
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
      source[
        key
      ];

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

function normalizedKey(
  key:
    string,
): string {
  return key
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      "",
    );
}

const REDACTED_KEYS =
  new Set([
    "authorization",
    "accesstoken",
    "refreshtoken",
    "token",
    "tokens",
    "password",
    "passwords",
    "passphrase",
    "clientpassword",
    "clientsecret",
    "secret",
    "secrets",
    "secretvalue",
    "credential",
    "credentials",
    "privatekey",
    "privatekeypassword",
  ]);

function safeScalarString(
  value:
    string,
): string {
  if (
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/i.test(
      value,
    ) ||
    /\bBearer\s+[A-Za-z0-9._~+\/-]+=*/i.test(
      value,
    ) ||
    /(?:access_token|refresh_token|client_secret|password)=/i.test(
      value,
    ) ||
    /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(
      value.trim(),
    )
  ) {
    return "[REDACTED_STRING]";
  }

  return value.length >
    2048
    ? `${value.slice(0, 2048)}...[TRUNCATED]`
    : value;
}

export function sanitizeReadExplorerValue(
  value:
    unknown,
  depth =
    0,
  redactKeyMaterial =
    false,
): unknown {
  if (
    depth >
      8
  ) {
    return "[DEPTH_LIMIT]";
  }

  if (
    value ===
      null ||
    typeof value ===
      "number" ||
    typeof value ===
      "boolean"
  ) {
    return value;
  }

  if (
    typeof value ===
      "string"
  ) {
    return safeScalarString(
      value,
    );
  }

  if (
    Array.isArray(
      value,
    )
  ) {
    return value
      .slice(
        0,
        100,
      )
      .map(
        (
          item,
        ) =>
          sanitizeReadExplorerValue(
            item,
            depth +
              1,
            redactKeyMaterial,
          ),
      );
  }

  if (
    isRecord(
      value,
    )
  ) {
    const output:
      Record<
        string,
        unknown
      > = {};

    for (
      const key
      of Object.keys(
        value,
      )
        .sort()
        .slice(
          0,
          100,
        )
    ) {
      const normalized =
        normalizedKey(
          key,
        );

      if (
        REDACTED_KEYS.has(
          normalized,
        ) ||
        /(?:accesstoken|refreshtoken|password|secret|privatekey)$/.test(
          normalized,
        ) ||
        (
          redactKeyMaterial &&
          /(?:key|keys|certificate|certificates|pem)$/.test(
            normalized,
          )
        )
      ) {
        output[
          key
        ] =
          "[REDACTED]";
      }
      else {
        output[
          key
        ] =
          sanitizeReadExplorerValue(
            value[
              key
            ],
            depth +
              1,
            redactKeyMaterial,
          );
      }
    }

    return output;
  }

  return "[UNSUPPORTED_VALUE]";
}

function safePreview(
  text:
    string,
  contentType:
    string | null,
  redactKeyMaterial:
    boolean,
): string {
  if (
    text.trim().length ===
      0
  ) {
    return "[EMPTY_RESPONSE]";
  }

  if (
    !(
      contentType ??
      ""
    ).toLowerCase()
      .includes(
        "json",
      )
  ) {
    return "[NON_JSON_RESPONSE_REDACTED]";
  }

  try {
    const parsed:
      unknown =
      JSON.parse(
        text,
      );

    const safe =
      sanitizeReadExplorerValue(
        parsed,
        0,
        redactKeyMaterial,
      );

    return JSON.stringify(
      safe,
      null,
      2,
    ).slice(
      0,
      32768,
    );
  }
  catch {
    return "[INVALID_JSON_RESPONSE_REDACTED]";
  }
}

async function login(
  input: {
    readonly apiBase:
      string;

    readonly username:
      string;

    readonly password:
      string;

    readonly authorityMode:
      ReadAuthorityMode;
  },
): Promise<ReadSession> {
  const body:
    Record<
      string,
      string
    > = {
      user:
        input.username,
      password:
        input.password,
  };

  if (
    input.authorityMode !==
      "STANDING_RUNTIME"
  ) {
    body.role =
      input.authorityMode;
  }

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
          JSON.stringify(
            body,
          ),
        cache:
          "no-store",
        redirect:
          "error",
      },
    );

  const text =
    await response.text();

  if (
    response.status !==
      200
  ) {
    throw new Error(
      `Read explorer login failed with HTTP ${response.status}.`,
    );
  }

  const payload:
    unknown =
    text.trim().length >
      0
      ? JSON.parse(
          text,
        )
      : {};

  if (
    !isRecord(
      payload,
    )
  ) {
    throw new Error(
      "Read explorer login payload is invalid.",
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
      "Read explorer login did not return both tokens.",
    );
  }

  return Object.freeze({
    accessToken,
    refreshToken,
  });
}

async function logout(
  apiBase:
    string,
  accessToken:
    string,
): Promise<void> {
  await fetch(
    `${apiBase}/logout`,
    {
      method:
        "POST",
      headers: {
        Accept:
          "application/json",
        Authorization:
          `Bearer ${accessToken}`,
      },
      cache:
        "no-store",
      redirect:
        "error",
    },
  );
}

function apiBaseFromEnvironment():
  string {
  const raw =
    (
      process.env
        .MERIDIAN_IRIS_API_BASE_URL ??
      DEFAULT_API_BASE
    ).replace(
      /\/+$/,
      "",
    );

  const parsed =
    new URL(
      raw,
    );

  if (
    (
      parsed.protocol !==
        "http:" &&
      parsed.protocol !==
        "https:"
    ) ||
    parsed.username.length >
      0 ||
    parsed.password.length >
      0 ||
    parsed.search.length >
      0 ||
    parsed.hash.length >
      0 ||
    !parsed.pathname.endsWith(
      "/api/admin",
    )
  ) {
    throw new Error(
      "Read explorer IRIS base URL violates the server-owned /api/admin boundary.",
    );
  }

  return parsed
    .toString()
    .replace(
      /\/$/,
      "",
    );
}

function unavailable(
  plan:
    ReadExplorerPlan,
  capability:
    ReadExplorerResult["capability"],
  reason:
    string,
): ReadExplorerResult {
  return Object.freeze({
    ok:
      false,
    capability,
    operationId:
      plan.operation.id,
    requestMethod:
      plan.requestMethod,
    requestPath:
      plan.operation.path,
    authorityMode:
      plan.authorityMode,
    httpStatus:
      null,
    contentType:
      null,
    responsePreview:
      "",
    reason,
    browserCredentialExposure:
      false as const,
    genericMutationDispatch:
      false as const,
  });
}

export async function runReadExplorerFromEnvironment(
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
): Promise<
  ReadExplorerResult
> {
  const plan =
    buildReadExplorerPlan(
      input,
    );

  if (
    plan.capability ===
      "UNAVAILABLE_RUNTIME" ||
    plan.authorityMode ===
      null
  ) {
    return unavailable(
      plan,
      "UNAVAILABLE_RUNTIME",
      plan.reason ??
        "No approved runtime authority path.",
    );
  }

  const password =
    process.env
      .MERIDIAN_RUNTIME_PASSWORD;

  if (
    typeof password !==
      "string" ||
    password.length ===
      0
  ) {
    return unavailable(
      plan,
      "RUNTIME_CREDENTIAL_NOT_CONFIGURED",
      "Server-owned meridian.runtime credential is not configured.",
    );
  }

  const apiBase =
    apiBaseFromEnvironment();

  const username =
    process.env
      .MERIDIAN_RUNTIME_USERNAME ??
    DEFAULT_RUNTIME_USER;

  let session:
    ReadSession | null =
    null;

  try {
    session =
      await login({
        apiBase,
        username,
        password,
        authorityMode:
          plan.authorityMode,
      });

    const url =
      new URL(
        `${apiBase}${plan.operation.path}`,
      );

    for (
      const [
        name,
        value,
      ]
      of plan.query
    ) {
      url.searchParams.append(
        name,
        value,
      );
    }

    const response =
      await fetch(
        url,
        {
          method:
            plan.requestMethod,
          headers: {
            Accept:
              "application/json",
            Authorization:
              `Bearer ${session.accessToken}`,
          },
          cache:
            "no-store",
          redirect:
            "error",
        },
      );

    const contentType =
      response.headers.get(
        "content-type",
      );

    const text =
      plan.requestMethod ===
        "HEAD"
        ? ""
        : await response.text();

    return Object.freeze({
      ok:
        response.ok,
      capability:
        "READY" as const,
      operationId:
        plan.operation.id,
      requestMethod:
        plan.requestMethod,
      requestPath:
        (
          plan.operation.path +
          (
            url.search.length >
              0
              ? url.search
              : ""
          )
        ),
      authorityMode:
        plan.authorityMode,
      httpStatus:
        response.status,
      contentType,
      responsePreview:
        safePreview(
          text,
          contentType,
          plan.operation.family ===
            "SECURITY_SECRETS",
        ),
      reason:
        response.ok
          ? null
          : `IRIS returned HTTP ${response.status}.`,
      browserCredentialExposure:
        false as const,
      genericMutationDispatch:
        false as const,
    });
  }
  catch {
    return unavailable(
      plan,
      "LIVE_READ_UNAVAILABLE",
      "The bounded server-side read could not be completed.",
    );
  }
  finally {
    if (
      session !==
        null
    ) {
      try {
        await logout(
          apiBase,
          session.accessToken,
        );
      }
      catch {
      }
    }
  }
}
