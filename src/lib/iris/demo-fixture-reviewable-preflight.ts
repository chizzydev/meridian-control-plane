import "server-only";

import {
  createHash,
} from "node:crypto";

import {
  DEMO_FIXTURE_APPLY_PREFLIGHT_DIGEST_ALGORITHM,
  DEMO_FIXTURE_APPLY_PREFLIGHT_ROLE_NAMES,
  buildDemoFixtureApplyPreflightCanonical,
  type DemoFixtureApplyRoleSnapshot,
} from "../change-case/demo-fixture-apply-preflight";

import {
  DEMO_FIXTURE_USERNAME,
  type DemoFixtureUserSnapshot,
} from "../change-case/demo-fixture";

import type {
  ReviewablePreflightForReady,
} from "../change-case/ready-preflight";

import {
  demoFixtureCredentialPresentForServer,
} from "./demo-fixture-server";

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

export interface DemoFixtureReviewablePreflight
  extends ReviewablePreflightForReady {
  readonly state:
    "PREFLIGHTED";

  readonly digestAlgorithm:
    typeof DEMO_FIXTURE_APPLY_PREFLIGHT_DIGEST_ALGORITHM;

  readonly canonicalJson:
    string;
}

export interface DemoFixtureReviewablePreflightDependencies {
  readonly credentialPresent?:
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
      "IRIS fixture preflight response is not an object.",
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
  object:
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
          object,
          key,
        )
    ) {
      return object[key];
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
        (item) =>
          item.trim(),
      )
      .filter(Boolean);
  }

  if (
    typeof value ===
      "string"
  ) {
    return value
      .split(",")
      .map(
        (item) =>
          item.trim(),
      )
      .filter(Boolean);
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
    "IRIS fixture preflight role-list representation is unsupported.",
  );
}

async function jsonResponse(
  response:
    Response,
  label:
    string,
): Promise<unknown> {
  const text =
    await response.text();

  if (
    response.status !==
      200
  ) {
    throw new Error(
      `${label}_HTTP_${response.status}`,
    );
  }

  try {
    return JSON.parse(
      text,
    ) as unknown;
  } catch {
    throw new Error(
      `${label}_NON_JSON`,
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

async function readUser(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly fetchImpl:
      FetchLike;
  },
): Promise<DemoFixtureUserSnapshot> {
  const path =
    `/v2/security/user?name=${encodeURIComponent(DEMO_FIXTURE_USERNAME)}`;

  const response =
    await input.fetchImpl(
      joinUrl(
        input.apiBaseUrl,
        path,
      ),
      {
        method:
          "GET",

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

  const result =
    resultObject(
      await jsonResponse(
        response,
        "DEMO_FIXTURE_PREFLIGHT_USER_READ",
      ),
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
  };
}

function roleResources(
  value:
    unknown,
): DemoFixtureApplyRoleSnapshot["resources"] {
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return [];
  }

  if (
    !Array.isArray(
      value,
    )
  ) {
    throw new Error(
      "IRIS fixture preflight role resources are not an array.",
    );
  }

  return value.map(
    (entry) => {
      const object =
        objectValue(
          entry,
        );

      const resource =
        stringValue(
          first(
            object,
            [
              "Name",
              "name",
            ],
          ),
        );

      const permission =
        stringValue(
          first(
            object,
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
          "IRIS fixture preflight role resource entry is incomplete.",
        );
      }

      return {
        resource,
        permission,
      };
    },
  );
}

async function readRole(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly roleName:
      string;

    readonly fetchImpl:
      FetchLike;
  },
): Promise<DemoFixtureApplyRoleSnapshot> {
  const path =
    `/v2/security/role?name=${encodeURIComponent(input.roleName)}`;

  const response =
    await input.fetchImpl(
      joinUrl(
        input.apiBaseUrl,
        path,
      ),
      {
        method:
          "GET",

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

  const result =
    resultObject(
      await jsonResponse(
        response,
        `DEMO_FIXTURE_PREFLIGHT_ROLE_READ_${input.roleName}`,
      ),
    );

  return {
    name:
      input.roleName,

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
      roleResources(
        first(
          result,
          [
            "Resources",
            "resources",
          ],
        ),
      ),
  };
}

function sha256(
  value:
    string,
): string {
  return createHash(
    "sha256",
  )
    .update(
      value,
      "utf8",
    )
    .digest(
      "hex",
    )
    .toUpperCase();
}

/**
 * Full configured-state apply-time preflight for the closed A3 demo graph.
 *
 * The digest binds the exact A3 user prestate, the complete configured
 * business/transport role graph, the fixed REMOVE intent, and the server-held
 * fixture generation. It performs no mutation.
 */
export async function readDemoFixtureReviewablePreflight(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly expectedFixtureGeneration:
      string;
  },

  dependencies:
    DemoFixtureReviewablePreflightDependencies = {},
): Promise<DemoFixtureReviewablePreflight> {
  const generation =
    input.expectedFixtureGeneration.trim();

  const credentialPresent =
    dependencies.credentialPresent ??
    demoFixtureCredentialPresentForServer;

  if (
    generation.length ===
      0 ||
    !credentialPresent(
      generation,
    )
  ) {
    throw new Error(
      "DEMO_FIXTURE_PREFLIGHT_GENERATION_UNAVAILABLE",
    );
  }

  const fetchImpl =
    dependencies.fetchImpl ??
    globalThis.fetch.bind(
      globalThis,
    );

  const user =
    await readUser({
      apiBaseUrl:
        input.apiBaseUrl,

      accessToken:
        input.accessToken,

      fetchImpl,
    });

  const roles =
    await Promise.all(
      DEMO_FIXTURE_APPLY_PREFLIGHT_ROLE_NAMES.map(
        (roleName) =>
          readRole({
            apiBaseUrl:
              input.apiBaseUrl,

            accessToken:
              input.accessToken,

            roleName,

            fetchImpl,
          }),
      ),
    );

  const canonical =
    buildDemoFixtureApplyPreflightCanonical({
      expectedFixtureGeneration:
        generation,

      user,

      roles,
    });

  const canonicalJson =
    JSON.stringify(
      canonical,
    );

  return Object.freeze({
    state:
      "PREFLIGHTED" as const,

    digestAlgorithm:
      DEMO_FIXTURE_APPLY_PREFLIGHT_DIGEST_ALGORITHM,

    digest:
      sha256(
        canonicalJson,
      ),

    canonical,

    canonicalJson,
  });
}
