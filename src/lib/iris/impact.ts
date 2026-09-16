import declaration
  from "./meridian-api-declaration.json";

import {
  buildDeclaredImpactPreflight,
  parseDeclaredRestOperations,
  parseDeployedRestInventory,
  type DeclaredImpactPreflight,
  type WebApplicationDefinition,
} from "@/lib/change-case/impact";

import {
  type AuthorizationPreflight,
} from "@/lib/change-case/preflight";

import {
  readCenterpieceAuthorizationPreflight,
} from "./preflight";

interface CenterpieceImpactPreflight
  extends DeclaredImpactPreflight {
  readonly authorization:
    AuthorizationPreflight;
}

const MERIDIAN_APPLICATION_FILTER =
  "meridian";

const MERIDIAN_APPLICATION_PREFIX =
  "/meridian/";

const REST_NAMESPACE =
  "USER";

const REST_APPLICATION =
  "/meridian/api";

function isRecord(
  value:
    unknown,
): value is Record<
  string,
  unknown
> {
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

function requiredRecord(
  value:
    unknown,

  label:
    string,
): Record<
  string,
  unknown
> {
  if (!isRecord(value)) {
    throw new Error(
      `${label} must be an object.`,
    );
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
    value ===
      1 ||
    value ===
      "1" ||
    value ===
      "true"
  ) {
    return true;
  }

  if (
    value ===
      0 ||
    value ===
      "0" ||
    value ===
      "false"
  ) {
    return false;
  }

  throw new Error(
    `${label} must be boolean-compatible.`,
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

async function readJson(
  input: {
    readonly url:
      string;

    readonly accessToken:
      string;

    readonly label:
      string;
  },
): Promise<unknown> {
  const response =
    await fetch(
      input.url,
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

  if (!response.ok) {
    throw new Error(
      (
        `${input.label} returned HTTP ${response.status}. ` +
        `Body=${text.slice(0, 500)}`
      ),
    );
  }

  try {
    return JSON.parse(
      text,
    ) as unknown;
  } catch {
    throw new Error(
      `${input.label} returned invalid JSON.`,
    );
  }
}

export async function readMeridianWebApplications(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;
  },
): Promise<
  readonly WebApplicationDefinition[]
> {
  const query =
    new URLSearchParams({
      filter:
        MERIDIAN_APPLICATION_FILTER,

      maxRows:
        "100",
    });

  const payload =
    await readJson({
      url:
        (
          `${input.apiBaseUrl}/v2/web-apps?${query.toString()}`
        ),

      accessToken:
        input.accessToken,

      label:
        "Official SysAdmin web-app list",
    });

  const result =
    unwrapResult(
      payload,
    );

  if (
    !Array.isArray(
      result,
    )
  ) {
    throw new Error(
      "Official SysAdmin web-app result must be an array.",
    );
  }

  const applications =
    result.map(
      (
        raw,
        index,
      ): WebApplicationDefinition => {
        const row =
          requiredRecord(
            raw,
            `Web application row ${index}`,
          );

        const name =
          requiredString(
            row.Name ??
              row.name,

            `Web application row ${index} Name`,
          );

        return {
          name,

          namespace:
            requiredString(
              row.Namespace ??
                row.NameSpace ??
                row.namespace,

              `Web application ${name} namespace`,
            ),

          enabled:
            requiredBoolean(
              row.Enabled ??
                row.enabled,

              `Web application ${name} Enabled`,
            ),

          resource:
            optionalString(
              row.Resource ??
                row.resource,
            ),

          dispatchClass:
            optionalString(
              row.DispatchClass ??
                row.dispatchClass,
            ),
        };
      },
    )
      .filter(
        (application) =>
          application.name.startsWith(
            MERIDIAN_APPLICATION_PREFIX,
          ),
      )
      .sort(
        (
          left,
          right,
        ) =>
          left.name.localeCompare(
            right.name,
          ),
      );

  if (
    applications.length ===
      0
  ) {
    throw new Error(
      "No Meridian web applications were discovered.",
    );
  }

  return applications;
}

export async function readMeridianDeployedRestInventory(
  input: {
    readonly helperBaseUrl:
      string;

    readonly accessToken:
      string;
  },
) {
  const query =
    new URLSearchParams({
      namespace:
        REST_NAMESPACE,

      application:
        REST_APPLICATION,
    });

  const payload =
    await readJson({
      url:
        (
          `${input.helperBaseUrl}/rest-spec?${query.toString()}`
        ),

      accessToken:
        input.accessToken,

      label:
        "Native deployed REST discovery",
    });

  const inventory =
    parseDeployedRestInventory(
      payload,
    );

  if (
    inventory.basePath !==
      REST_APPLICATION
  ) {
    throw new Error(
      (
        "Native deployed REST discovery returned unexpected " +
        `basePath: ${inventory.basePath}`
      ),
    );
  }

  return inventory;
}

export async function readCenterpieceImpactPreflight(
  input: {
    readonly apiBaseUrl:
      string;

    readonly helperBaseUrl:
      string;

    readonly accessToken:
      string;
  },
): Promise<
  CenterpieceImpactPreflight
> {
  const authorization =
    await readCenterpieceAuthorizationPreflight({
      apiBaseUrl:
        input.apiBaseUrl,

      helperBaseUrl:
        input.helperBaseUrl,

      accessToken:
        input.accessToken,
    });

  const [
    applications,
    deployed,
  ] =
    await Promise.all([
      readMeridianWebApplications({
        apiBaseUrl:
          input.apiBaseUrl,

        accessToken:
          input.accessToken,
      }),

      readMeridianDeployedRestInventory({
        helperBaseUrl:
          input.helperBaseUrl,

        accessToken:
          input.accessToken,
      }),
    ]);

  const declared =
    parseDeclaredRestOperations(
      declaration,
    );

  const impact =
    buildDeclaredImpactPreflight({
      current:
        authorization.current,

      proposed:
        authorization.proposed,

      applications,

      deployed,

      declared,
    });

  return {
    authorization,
    ...impact,
  };
}