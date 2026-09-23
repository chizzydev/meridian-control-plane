import {
  DEMO_FIXTURE_NAMESPACE,
  DEMO_FIXTURE_USERNAME,
} from "../change-case/demo-fixture";

export const O03_PROCESS_ACTION_ROLE =
  "MeridianProcessActionExecutor" as const;

export const O03_PROCESS_PATH =
  "/v2/process" as const;

export const O03_PROCESS_TERMINATE_PATH =
  "/v2/process/terminate" as const;

export interface O03SysAdminProcessSnapshot {
  readonly pid:
    number;

  readonly username:
    string;

  readonly namespace:
    string;

  readonly startTimeUtc:
    string;

  readonly purposeMarker:
    string;

  readonly canBeSuspended:
    boolean;

  readonly canBeTerminated:
    boolean;

  readonly state:
    string;
}

export class O03ProcessAuthorityDeniedError
  extends Error {
  constructor(
    message:
      string,
  ) {
    super(
      message,
    );

    this.name =
      "O03ProcessAuthorityDeniedError";
  }
}

export class O03ProcessMutationRejectedError
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
      "O03ProcessMutationRejectedError";
  }
}

export class O03ProcessMutationUnknownAfterDispatchError
  extends Error {
  constructor(
    message:
      string,
  ) {
    super(
      message,
    );

    this.name =
      "O03ProcessMutationUnknownAfterDispatchError";
  }
}

type JsonObject =
  Record<
    string,
    unknown
  >;

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
      `${label} must be an object.`,
    );
  }

  return value as
    JsonObject;
}

function numberValue(
  value:
    JsonObject,
  key:
    string,
): number {
  const candidate =
    value[
      key
    ];

  if (
    typeof candidate !==
      "number" ||
    !Number.isFinite(
      candidate,
    )
  ) {
    throw new Error(
      `O03 process field ${key} must be a finite number.`,
    );
  }

  return candidate;
}

function stringValue(
  value:
    JsonObject,
  key:
    string,
): string {
  const candidate =
    value[
      key
    ];

  if (
    typeof candidate !==
      "string"
  ) {
    throw new Error(
      `O03 process field ${key} must be a string.`,
    );
  }

  return candidate;
}

function booleanValue(
  value:
    JsonObject,
  key:
    string,
): boolean {
  const candidate =
    value[
      key
    ];

  if (
    typeof candidate !==
      "boolean"
  ) {
    throw new Error(
      `O03 process field ${key} must be a boolean.`,
    );
  }

  return candidate;
}

function assertPid(
  pid:
    number,
): void {
  if (
    !Number.isSafeInteger(
      pid,
    ) ||
    pid <
      1
  ) {
    throw new Error(
      "O03 process id must be a positive safe integer.",
    );
  }
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

function readHeaders(
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

function parseProcess(
  value:
    unknown,
): O03SysAdminProcessSnapshot {
  const process =
    objectValue(
      value,
      "O03 SysAdmin process",
    );

  const snapshot =
    Object.freeze({
      pid:
        numberValue(
          process,
          "Pid",
        ),

      username:
        stringValue(
          process,
          "UserName",
        ),

      namespace:
        stringValue(
          process,
          "NameSpace",
        ),

      startTimeUtc:
        stringValue(
          process,
          "StartTimeUTC",
        ),

      purposeMarker:
        stringValue(
          process,
          "UserInfo",
        ),

      canBeSuspended:
        booleanValue(
          process,
          "CanBeSuspended",
        ),

      canBeTerminated:
        booleanValue(
          process,
          "CanBeTerminated",
        ),

      state:
        stringValue(
          process,
          "State",
        ),
    });

  if (
    snapshot.pid <
      1 ||
    snapshot.username.trim().length ===
      0 ||
    snapshot.namespace.trim().length ===
      0 ||
    snapshot.startTimeUtc.trim().length ===
      0
  ) {
    throw new Error(
      "O03 SysAdmin process identity is incomplete.",
    );
  }

  return snapshot;
}

export async function readO03Process(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly pid:
      number;

    readonly fetchImpl?:
      typeof fetch;
  },
): Promise<
  O03SysAdminProcessSnapshot |
  null
> {
  assertPid(
    input.pid,
  );

  const fetchImpl =
    input.fetchImpl ??
    fetch;

  const url =
    new URL(
      joinUrl(
        input.apiBaseUrl,
        O03_PROCESS_PATH,
      ),
    );

  url.searchParams.set(
    "id",
    String(
      input.pid,
    ),
  );

  const response =
    await fetchImpl(
      url,
      {
        method:
          "GET",

        cache:
          "no-store",

        redirect:
          "error",

        headers:
          readHeaders(
            input.accessToken,
          ),
      },
    );

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
    throw new O03ProcessAuthorityDeniedError(
      `O03 process read authority denied with HTTP ${response.status}.`,
    );
  }

  if (
    response.status !==
      200
  ) {
    throw new Error(
      `O03 GET /v2/process failed with HTTP ${response.status}.`,
    );
  }

  const body:
    unknown =
    await response.json();

  const envelope =
    objectValue(
      body,
      "O03 SysAdmin process response",
    );

  const snapshot =
    parseProcess(
      envelope.result,
    );

  if (
    snapshot.pid !==
      input.pid
  ) {
    throw new Error(
      "O03 SysAdmin process readback returned a different pid.",
    );
  }

  if (
    snapshot.username !==
      DEMO_FIXTURE_USERNAME ||
    snapshot.namespace !==
      DEMO_FIXTURE_NAMESPACE
  ) {
    throw new Error(
      "O03 SysAdmin process readback returned a non-witness principal.",
    );
  }

  return snapshot;
}

export async function postO03ProcessTerminate(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly pid:
      number;

    readonly fetchImpl?:
      typeof fetch;
  },
): Promise<
  Readonly<{
    status:
      200;

    pid:
      number;

    mutationRequestCount:
      1;

    requestBodyPresent:
      false;
  }>
> {
  assertPid(
    input.pid,
  );

  const fetchImpl =
    input.fetchImpl ??
    fetch;

  const url =
    new URL(
      joinUrl(
        input.apiBaseUrl,
        O03_PROCESS_TERMINATE_PATH,
      ),
    );

  url.searchParams.set(
    "id",
    String(
      input.pid,
    ),
  );

  let response:
    Response;

  try {
    response =
      await fetchImpl(
        url,
        {
          method:
            "POST",

          cache:
            "no-store",

          redirect:
            "error",

          headers:
            readHeaders(
              input.accessToken,
            ),
        },
      );
  } catch (
    error
  ) {
    throw new O03ProcessMutationUnknownAfterDispatchError(
      (
        "O03 POST /v2/process/terminate transport ended after dispatch without " +
        "an authoritative response. Automatic retry is forbidden. " +
        (
          error instanceof Error
            ? error.message
            : "Unknown transport failure."
        )
      ),
    );
  }

  if (
    response.status ===
      200
  ) {
    return Object.freeze({
      status:
        200 as const,

      pid:
        input.pid,

      mutationRequestCount:
        1 as const,

      requestBodyPresent:
        false as const,
    });
  }

  if (
    response.status ===
      401 ||
    response.status ===
      403
  ) {
    throw new O03ProcessAuthorityDeniedError(
      `O03 terminate authority denied with HTTP ${response.status}.`,
    );
  }

  if (
    response.status >=
      500
  ) {
    throw new O03ProcessMutationUnknownAfterDispatchError(
      (
        `O03 POST /v2/process/terminate returned HTTP ${response.status} after dispatch. ` +
        "Automatic retry is forbidden."
      ),
    );
  }

  throw new O03ProcessMutationRejectedError(
    response.status,
    `O03 POST /v2/process/terminate was rejected with HTTP ${response.status}.`,
  );
}
