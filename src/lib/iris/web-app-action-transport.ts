import {
  ORDERS_WEB_APP_NAME,
  W01_ORDERS_WEB_APP_CREATE_BODY,
  W02_ORDERS_WEB_APP_UPDATE_BODY,
  type OrdersWebAppSnapshot,
} from "../actions/web-app/fixture";

interface JsonRecord {
  readonly [key: string]:
    unknown;
}

export class WebAppAuthorityDeniedError
  extends Error {
  constructor(
    message:
      string,
  ) {
    super(
      message,
    );

    this.name =
      "WebAppAuthorityDeniedError";
  }
}

export class WebAppMutationRejectedError
  extends Error {
  readonly status:
    number;

  constructor(
    status:
      number,
    message:
      string,
  ) {
    super(
      message,
    );

    this.name =
      "WebAppMutationRejectedError";

    this.status =
      status;
  }
}

export class WebAppMutationUnknownAfterDispatchError
  extends Error {
  constructor(
    message:
      string,
  ) {
    super(
      message,
    );

    this.name =
      "WebAppMutationUnknownAfterDispatchError";
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

function unwrapResult(
  value:
    unknown,
): unknown {
  if (
    isRecord(
      value,
    ) &&
    Object.prototype.hasOwnProperty.call(
      value,
      "result",
    )
  ) {
    return value.result;
  }

  return value;
}

function requiredString(
  value:
    unknown,
  label:
    string,
): string {
  if (
    typeof value !==
      "string"
  ) {
    throw new Error(
      `${label} must be a string.`,
    );
  }

  return value;
}

function optionalString(
  value:
    unknown,
): string {
  return (
    typeof value ===
      "string"
  )
    ? value
    : "";
}

function requiredBoolean(
  value:
    unknown,
  label:
    string,
): boolean {
  if (
    typeof value ===
      "boolean"
  ) {
    return value;
  }

  if (
    value === 1 ||
    value === "1" ||
    value === "true"
  ) {
    return true;
  }

  if (
    value === 0 ||
    value === "0" ||
    value === "false"
  ) {
    return false;
  }

  throw new Error(
    `${label} must be boolean-compatible.`,
  );
}

function parseSnapshot(
  raw:
    unknown,
): OrdersWebAppSnapshot {
  const result =
    unwrapResult(
      raw,
    );

  if (
    !isRecord(
      result,
    )
  ) {
    throw new Error(
      "Official SysAdmin web-app detail is not an object.",
    );
  }

  return Object.freeze({
    name:
      ORDERS_WEB_APP_NAME,

    namespace:
      requiredString(
        result.Namespace ??
          result.NameSpace ??
          result.namespace,
        "Web app namespace",
      ),

    enabled:
      requiredBoolean(
        result.Enabled ??
          result.enabled,
        "Web app Enabled",
      ),

    resource:
      optionalString(
        result.Resource ??
          result.resource,
      ),

    dispatchClass:
      optionalString(
        result.DispatchClass ??
          result.dispatchClass,
      ),

    description:
      optionalString(
        result.Description ??
          result.description,
      ),
  });
}

function endpoint(
  apiBaseUrl:
    string,
): string {
  const query =
    new URLSearchParams({
      name:
        ORDERS_WEB_APP_NAME,
    });

  return (
    apiBaseUrl.replace(
      /\/+$/,
      "",
    ) +
    "/v2/web-app?" +
    query.toString()
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
      `${label} returned invalid JSON.`,
    );
  }
}

export async function readOrdersWebApp(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly fetchImpl?:
      typeof fetch;
  },
): Promise<
  OrdersWebAppSnapshot |
  null
> {
  const fetchImpl =
    input.fetchImpl ??
    fetch;

  const response =
    await fetchImpl(
      endpoint(
        input.apiBaseUrl,
      ),
      {
        method:
          "GET",

        cache:
          "no-store",

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
    throw new WebAppAuthorityDeniedError(
      `Official SysAdmin web-app read denied with HTTP ${response.status}.`,
    );
  }

  if (
    !response.ok
  ) {
    throw new Error(
      `Official SysAdmin web-app read returned HTTP ${response.status}. Body=${text.slice(0, 500)}`,
    );
  }

  return parseSnapshot(
    parsedJson(
      text,
      "Official SysAdmin web-app read",
    ),
  );
}

export async function createOrdersWebAppW01(
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
        endpoint(
          input.apiBaseUrl,
        ),
        {
          method:
            "PUT",

          cache:
            "no-store",

          headers: {
            Accept:
              "application/json",

            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${input.accessToken}`,
          },

          body:
            JSON.stringify(
              W01_ORDERS_WEB_APP_CREATE_BODY,
            ),
        },
      );
  }
  catch (
    error
  ) {
    throw new WebAppMutationUnknownAfterDispatchError(
      (
        "Official SysAdmin PUT /v2/web-app transport ended without an " +
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
    throw new WebAppMutationRejectedError(
      response.status,
      `W01 authority rejected by SysAdmin API with HTTP ${response.status}.`,
    );
  }

  if (
    response.status >=
      500
  ) {
    throw new WebAppMutationUnknownAfterDispatchError(
      `Official SysAdmin PUT /v2/web-app returned HTTP ${response.status}; mutation outcome requires authoritative reconciliation. Body=${text.slice(0, 500)}`,
    );
  }

  if (
    !response.ok
  ) {
    throw new WebAppMutationRejectedError(
      response.status,
      `Official SysAdmin PUT /v2/web-app rejected W01 with HTTP ${response.status}. Body=${text.slice(0, 500)}`,
    );
  }

  if (
    response.status !==
      200 &&
    response.status !==
      201
  ) {
    throw new WebAppMutationUnknownAfterDispatchError(
      `Official SysAdmin PUT /v2/web-app returned unexpected success status ${response.status}.`,
    );
  }

  return Object.freeze({
    status:
      response.status,

    mutationRequestCount:
      1 as const,
  });
}


export async function updateOrdersWebAppW02(
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
        endpoint(
          input.apiBaseUrl,
        ),
        {
          method:
            "PUT",

          cache:
            "no-store",

          headers: {
            Accept:
              "application/json",

            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${input.accessToken}`,
          },

          body:
            JSON.stringify(
              W02_ORDERS_WEB_APP_UPDATE_BODY,
            ),
        },
      );
  }
  catch (
    error
  ) {
    throw new WebAppMutationUnknownAfterDispatchError(
      (
        "Official SysAdmin W02 PUT /v2/web-app transport ended without an " +
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
    throw new WebAppMutationRejectedError(
      response.status,
      `W02 authority rejected by SysAdmin API with HTTP ${response.status}.`,
    );
  }

  if (
    response.status >=
      500
  ) {
    throw new WebAppMutationUnknownAfterDispatchError(
      `Official SysAdmin W02 PUT /v2/web-app returned HTTP ${response.status}; mutation outcome requires authoritative reconciliation. Body=${text.slice(0, 500)}`,
    );
  }

  if (
    !response.ok
  ) {
    throw new WebAppMutationRejectedError(
      response.status,
      `Official SysAdmin PUT /v2/web-app rejected W02 with HTTP ${response.status}. Body=${text.slice(0, 500)}`,
    );
  }

  if (
    response.status !==
      200 &&
    response.status !==
      201
  ) {
    throw new WebAppMutationUnknownAfterDispatchError(
      `Official SysAdmin W02 PUT /v2/web-app returned unexpected success status ${response.status}.`,
    );
  }

  return Object.freeze({
    status:
      response.status,

    mutationRequestCount:
      1 as const,
  });
}
export async function deleteOrdersWebApp(
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
        endpoint(
          input.apiBaseUrl,
        ),
        {
          method:
            "DELETE",

          cache:
            "no-store",

          headers: {
            Accept:
              "application/json",

            Authorization:
              `Bearer ${input.accessToken}`,
          },
        },
      );
  }
  catch (
    error
  ) {
    throw new WebAppMutationUnknownAfterDispatchError(
      (
        "Official SysAdmin DELETE /v2/web-app transport ended without an " +
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
    response.status >=
      500
  ) {
    throw new WebAppMutationUnknownAfterDispatchError(
      `Official SysAdmin DELETE /v2/web-app returned HTTP ${response.status}; mutation outcome requires authoritative reconciliation. Body=${text.slice(0, 500)}`,
    );
  }

  if (
    !response.ok
  ) {
    throw new WebAppMutationRejectedError(
      response.status,
      `Official SysAdmin DELETE /v2/web-app rejected the request with HTTP ${response.status}. Body=${text.slice(0, 500)}`,
    );
  }

  return Object.freeze({
    status:
      response.status,

    mutationRequestCount:
      1 as const,
  });
}
