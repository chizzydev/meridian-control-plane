import {
  DEMO_FIXTURE_USERNAME,
  type DemoFixtureUserSnapshot,
} from "../change-case/demo-fixture";

import {
  DemoFixtureApplyRefusalError,
  appliedDemoFixtureMutation,
  assertDemoFixtureApplyPrestate,
  failedDemoFixtureMutation,
  type DemoFixtureApplyResult,
} from "../change-case/demo-fixture-apply";

import {
  buildDemoFixtureApplyPutPlan,
  buildDemoFixtureConfiguredReadPlan,
} from "./demo-fixture-apply-transport";

interface JsonObject {
  readonly [key: string]:
    unknown;
}

type FetchLike =
  (
    input:
      string | URL | Request,
    init?:
      RequestInit,
  ) => Promise<Response>;

export interface FixtureScopedRoleRemovalDependencies {
  readonly credentialPresent:
    (
      generation:
        string,
    ) => boolean;

  readonly fetchImpl?:
    FetchLike;
}

function objectValue(
  value:
    unknown,
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
      "IRIS fixture Apply response is not an object.",
    );
  }

  return value as
    JsonObject;
}

function resultObject(
  value:
    unknown,
): JsonObject {
  const outer =
    objectValue(
      value,
    );

  if (
    typeof outer.result ===
      "object" &&
    outer.result !==
      null &&
    !Array.isArray(
      outer.result,
    )
  ) {
    return outer.result as
      JsonObject;
  }

  return outer;
}

function first(
  value:
    JsonObject,
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
): string[] {
  if (
    Array.isArray(
      value,
    )
  ) {
    return value
      .filter(
        (
          item,
        ): item is string =>
          typeof item ===
          "string",
      )
      .map(
        (
          item,
        ) =>
          item.trim(),
      )
      .filter(Boolean)
      .sort(
        (
          left,
          right,
        ) =>
          left.localeCompare(
            right,
          ),
      );
  }

  if (
    typeof value ===
    "string"
  ) {
    return value
      .split(",")
      .map(
        (
          item,
        ) =>
          item.trim(),
      )
      .filter(Boolean)
      .sort(
        (
          left,
          right,
        ) =>
          left.localeCompare(
            right,
          ),
      );
  }

  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return [];
  }

  throw new Error(
    "IRIS fixture Apply role-list representation is unsupported.",
  );
}

function userSnapshot(
  body:
    unknown,
): DemoFixtureUserSnapshot {
  const result =
    resultObject(
      body,
    );

  return {
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
      ) ||
      DEMO_FIXTURE_USERNAME,

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
  };
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

async function responsePayload(
  response:
    Response,
): Promise<unknown> {
  const text =
    await response.text();

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
      "IRIS fixture Apply response was not JSON.",
    );
  }
}

async function readConfiguredUser(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly fetchImpl:
      FetchLike;
  },
): Promise<
  DemoFixtureUserSnapshot
> {
  const plan =
    buildDemoFixtureConfiguredReadPlan();

  const response =
    await input.fetchImpl(
      joinUrl(
        input.apiBaseUrl,
        plan.path,
      ),
      {
        method:
          plan.method,

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

  if (
    response.status !==
    200
  ) {
    throw new Error(
      `FIXTURE_CONFIGURED_READ_HTTP_${response.status}`,
    );
  }

  return userSnapshot(
    await responsePayload(
      response,
    ),
  );
}

/**
 * Pure server-side execution core for the one A3 synthetic fixture mutation.
 *
 * The caller supplies only the expected fixture generation; target identity,
 * role, method, endpoint and body are fixed by the product contract.
 *
 * Any uncertainty after PUT dispatch is APPLY_FAILED /
 * UNKNOWN_AFTER_DISPATCH. There is no automatic retry and this core never
 * returns VERIFIED.
 */
export async function executeFixtureScopedRoleRemovalCore(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly expectedFixtureGeneration:
      string;
  },

  dependencies:
    FixtureScopedRoleRemovalDependencies,
): Promise<
  DemoFixtureApplyResult
> {
  const generation =
    input.expectedFixtureGeneration
      .trim();

  if (
    generation.length ===
      0 ||
    !dependencies
      .credentialPresent(
        generation,
      )
  ) {
    throw new DemoFixtureApplyRefusalError(
      "DEMO_FIXTURE_APPLY_GENERATION_UNAVAILABLE",
      "Synthetic fixture Apply generation is unavailable or stale. Reset and reseed the isolated fixture.",
    );
  }

  const fetchImpl =
    dependencies.fetchImpl ??
    globalThis.fetch.bind(
      globalThis,
    );

  const before =
    await readConfiguredUser({
      apiBaseUrl:
        input.apiBaseUrl,

      accessToken:
        input.accessToken,

      fetchImpl,
    });

  assertDemoFixtureApplyPrestate(
    before,
  );

  const plan =
    buildDemoFixtureApplyPutPlan();

  let putResponse:
    Response;

  try {
    putResponse =
      await fetchImpl(
        joinUrl(
          input.apiBaseUrl,
          plan.path,
        ),
        {
          method:
            plan.method,

          cache:
            "no-store",

          redirect:
            "error",

          headers: {
            Accept:
              "application/json",

            Authorization:
              `Bearer ${input.accessToken}`,

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              plan.body,
            ),
        },
      );
  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "unknown transport error";

    return failedDemoFixtureMutation(
      `MUTATION_TRANSPORT_FAILURE:${message}`,
    );
  }

  if (
    putResponse.status !==
    200
  ) {
    return failedDemoFixtureMutation(
      `MUTATION_HTTP_${putResponse.status}`,
    );
  }

  try {
    await responsePayload(
      putResponse,
    );
  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "invalid PUT response";

    return failedDemoFixtureMutation(
      `MUTATION_RESPONSE_FAILURE:${message}`,
    );
  }

  let after:
    DemoFixtureUserSnapshot;

  try {
    after =
      await readConfiguredUser({
        apiBaseUrl:
          input.apiBaseUrl,

        accessToken:
          input.accessToken,

        fetchImpl,
      });
  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "unknown configured readback failure";

    return failedDemoFixtureMutation(
      `CONFIGURED_POSTREAD_FAILURE:${message}`,
    );
  }

  try {
    return appliedDemoFixtureMutation({
      before,
      after,
    });
  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "configured post-state mismatch";

    return failedDemoFixtureMutation(
      `CONFIGURED_POSTSTATE_MISMATCH:${message}`,
    );
  }
}
