import type {
  DemoFixtureAdapter,
  DemoFixtureProcessSnapshot,
  DemoFixtureRoleCreate,
  DemoFixtureRoleSnapshot,
  DemoFixtureUserCreate,
  DemoFixtureUserSnapshot,
} from "../change-case/demo-fixture";

import {
  DEMO_FIXTURE_REQUIRED_BUSINESS_RESOURCES,
  DEMO_FIXTURE_TRANSPORT_ROLE,
  DEMO_FIXTURE_USERNAME,
} from "../change-case/demo-fixture";

interface JsonObject {
  readonly [key: string]:
    unknown;
}

interface HttpResult {
  readonly status:
    number;

  readonly body:
    unknown;
}

type FetchLike =
  (
    input:
      string | URL | Request,
    init?:
      RequestInit,
  ) => Promise<Response>;

interface OfficialSysAdminFixtureAdapterInput {
  readonly baseUrl:
    string;

  readonly accessToken:
    string;

  readonly listLiveProcesses?:
    (
      username:
        string,
    ) => Promise<
      readonly DemoFixtureProcessSnapshot[]
    >;

  readonly fetchImpl?:
    FetchLike;
}

interface RoleDefinition {
  readonly name:
    string;

  readonly grantedRoles:
    readonly string[];

  readonly resources:
    readonly string[];
}

const businessRoleContract:
  readonly RoleDefinition[] =
    Object.freeze([
      Object.freeze({
        name:
          "MeridianViewer",

        grantedRoles:
          Object.freeze(
            [],
          ),

        resources:
          Object.freeze([
            "%DB_USER:R",
            "Meridian_Orders:R",
            "Meridian_Portal:U",
          ]),
      }),

      Object.freeze({
        name:
          "MeridianJobRunner",

        grantedRoles:
          Object.freeze(
            [],
          ),

        resources:
          Object.freeze([
            "Meridian_Jobs:U",
          ]),
      }),

      Object.freeze({
        name:
          "MeridianEmployee",

        grantedRoles:
          Object.freeze([
            "MeridianViewer",
          ]),

        resources:
          Object.freeze(
            [],
          ),
      }),

      Object.freeze({
        name:
          "MeridianOperator",

        grantedRoles:
          Object.freeze([
            "MeridianJobRunner",
          ]),

        resources:
          Object.freeze([
            "Meridian_Orders:W",
          ]),
      }),

      Object.freeze({
        name:
          "MeridianSupervisor",

        grantedRoles:
          Object.freeze([
            "MeridianOperator",
          ]),

        resources:
          Object.freeze([
            "%Admin_Task:U",
            "Meridian_Admin:U",
          ]),
      }),
    ]);

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
      "IRIS response is not an object.",
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

function requiredString(
  value:
    unknown,
  label:
    string,
): string {
  const parsed =
    stringValue(
      value,
    );

  if (
    parsed.length ===
    0
  ) {
    throw new Error(
      `${label} is missing.`,
    );
  }

  return parsed;
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
      .filter(Boolean);
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
    "IRIS string-list representation is unsupported.",
  );
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

function longPermission(
  value:
    string,
): string {
  const normalized =
    shortPermission(
      value,
    );

  if (
    normalized ===
    "R"
  ) {
    return "READ";
  }

  if (
    normalized ===
    "W"
  ) {
    return "WRITE";
  }

  return "USE";
}

function normalized(
  values:
    readonly string[],
): string[] {
  return [
    ...new Set(
      values,
    ),
  ].sort(
    (
      left,
      right,
    ) =>
      left.localeCompare(
        right,
      ),
  );
}

function sameSet(
  left:
    readonly string[],
  right:
    readonly string[],
): boolean {
  return (
    JSON.stringify(
      normalized(
        left,
      ),
    ) ===
    JSON.stringify(
      normalized(
        right,
      ),
    )
  );
}

function resourcePairs(
  value:
    unknown,
): {
  readonly resource:
    string;

  readonly permission:
    string;
}[] {
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
      "IRIS role Resources is not an array.",
    );
  }

  return value.map(
    (
      item,
    ) => {
      const object =
        objectValue(
          item,
        );

      return {
        resource:
          requiredString(
            first(
              object,
              [
                "Name",
                "name",
              ],
            ),
            "IRIS role resource name",
          ),

        permission:
          longPermission(
            requiredString(
              first(
                object,
                [
                  "Permissions",
                  "permissions",
                ],
              ),
              "IRIS role permission",
            ),
          ),
      };
    },
  );
}

function roleResourceKeys(
  value:
    unknown,
): string[] {
  return normalized(
    resourcePairs(
      value,
    ).map(
      (
        item,
      ) =>
        `${item.resource}:${shortPermission(item.permission)}`,
    ),
  );
}

function roleSnapshot(
  name:
    string,
  body:
    unknown,
): DemoFixtureRoleSnapshot {
  const result =
    resultObject(
      body,
    );

  return {
    name,

    grantedRoles:
      normalized(
        stringArray(
          first(
            result,
            [
              "GrantedRoles",
              "grantedRoles",
            ],
          ),
        ),
      ),

    resources:
      resourcePairs(
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

function userSnapshot(
  username:
    string,
  body:
    unknown,
): DemoFixtureUserSnapshot {
  const result =
    resultObject(
      body,
    );

  return {
    username,

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
      username,

    namespace:
      stringValue(
        first(
          result,
          [
            "NameSpace",
            "namespace",
            "Namespace",
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
      normalized(
        stringArray(
          first(
            result,
            [
              "Roles",
              "roles",
            ],
          ),
        ),
      ),
  };
}

async function request(
  input: {
    readonly fetchImpl:
      FetchLike;

    readonly baseUrl:
      string;

    readonly accessToken:
      string;

    readonly path:
      string;

    readonly method?:
      "GET" |
      "POST" |
      "PUT" |
      "DELETE";

    readonly body?:
      unknown;
  },
): Promise<HttpResult> {
  const headers =
    new Headers({
      Accept:
        "application/json",

      Authorization:
        `Bearer ${input.accessToken}`,
    });

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
    await input.fetchImpl(
      `${input.baseUrl.replace(/\/+$/, "")}${input.path}`,
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

  let parsed:
    unknown =
      {};

  if (
    text.trim().length >
    0
  ) {
    try {
      parsed =
        JSON.parse(
          text,
        ) as unknown;
    } catch {
      throw new Error(
        `IRIS ${input.method ?? "GET"} ${input.path} returned non-JSON content.`,
      );
    }
  }

  return {
    status:
      response.status,

    body:
      parsed,
  };
}

function requireStatus(
  result:
    HttpResult,
  allowed:
    readonly number[],
  label:
    string,
): void {
  if (
    !allowed.includes(
      result.status,
    )
  ) {
    throw new Error(
      `${label} failed with HTTP ${result.status}.`,
    );
  }
}

function namePath(
  path:
    string,
  name:
    string,
): string {
  return `${path}?name=${encodeURIComponent(name)}`;
}

export function createOfficialSysAdminDemoFixtureAdapter(
  input:
    OfficialSysAdminFixtureAdapterInput,
): DemoFixtureAdapter {
  const fetchImpl =
    input.fetchImpl ??
    fetch;

  const roleRead =
    async (
      name:
        string,
    ): Promise<HttpResult> =>
      request({
        fetchImpl,
        baseUrl:
          input.baseUrl,
        accessToken:
          input.accessToken,
        path:
          namePath(
            "/v2/security/role",
            name,
          ),
      });

  const resourceRead =
    async (
      name:
        string,
    ): Promise<HttpResult> =>
      request({
        fetchImpl,
        baseUrl:
          input.baseUrl,
        accessToken:
          input.accessToken,
        path:
          namePath(
            "/v2/security/resource",
            name,
          ),
      });

  return {
    readPrerequisites:
      async () => {
        const missingRoles:
          string[] =
            [];

        const missingResources:
          string[] =
            [];

        for (
          const expected
          of businessRoleContract
        ) {
          const observed =
            await roleRead(
              expected.name,
            );

          if (
            observed.status ===
            404
          ) {
            missingRoles.push(
              expected.name,
            );

            continue;
          }

          requireStatus(
            observed,
            [200],
            `Read shared role ${expected.name}`,
          );

          const result =
            resultObject(
              observed.body,
            );

          const grantedRoles =
            normalized(
              stringArray(
                first(
                  result,
                  [
                    "GrantedRoles",
                    "grantedRoles",
                  ],
                ),
              ),
            );

          const resources =
            roleResourceKeys(
              first(
                result,
                [
                  "Resources",
                  "resources",
                ],
              ),
            );

          if (
            !sameSet(
              grantedRoles,
              expected.grantedRoles,
            ) ||
            !sameSet(
              resources,
              expected.resources,
            )
          ) {
            missingRoles.push(
              `${expected.name}:DRIFT`,
            );
          }
        }

        for (
          const resource
          of DEMO_FIXTURE_REQUIRED_BUSINESS_RESOURCES
        ) {
          const observed =
            await resourceRead(
              resource,
            );

          if (
            observed.status ===
            404
          ) {
            missingResources.push(
              resource,
            );

            continue;
          }

          requireStatus(
            observed,
            [200],
            `Read shared resource ${resource}`,
          );

          const result =
            resultObject(
              observed.body,
            );

          const publicPermission =
            stringValue(
              first(
                result,
                [
                  "PublicPermission",
                  "publicPermission",
                ],
              ),
            );

          if (
            publicPermission !==
            ""
          ) {
            missingResources.push(
              `${resource}:PUBLIC_${publicPermission}`,
            );
          }
        }

        return {
          missingRoles:
            normalized(
              missingRoles,
            ),

          missingResources:
            normalized(
              missingResources,
            ),
        };
      },

    listLiveProcesses:
      async (
        username,
      ) => {
        const processReader =
          input.listLiveProcesses;

        if (!processReader) {
          throw new Error(
            "Official fixture adapter requires the certified ProcessQuery reader.",
          );
        }

        const rows =
          await processReader(
            username,
          );

        const target =
          username
            .toLowerCase();

        return rows
          .filter(
            (
              process,
            ) =>
              process.username
                .toLowerCase() ===
              target,
          )
          .map(
            (
              process,
            ) => ({
              pid:
                process.pid,

              username:
                process.username,
            }),
          );
      },

    readUser:
      async (
        username,
      ) => {
        const response =
          await request({
            fetchImpl,
            baseUrl:
              input.baseUrl,
            accessToken:
              input.accessToken,
            path:
              namePath(
                "/v2/security/user",
                username,
              ),
          });

        if (
          response.status ===
          404
        ) {
          return null;
        }

        requireStatus(
          response,
          [200],
          "Read synthetic demo user",
        );

        return userSnapshot(
          username,
          response.body,
        );
      },

    readRole:
      async (
        name,
      ) => {
        const response =
          await roleRead(
            name,
          );

        if (
          response.status ===
          404
        ) {
          return null;
        }

        requireStatus(
          response,
          [200],
          "Read synthetic transport role",
        );

        return roleSnapshot(
          name,
          response.body,
        );
      },

    createRole:
      async (
        role:
          DemoFixtureRoleCreate,
      ) => {
        if (
          role.name !==
          DEMO_FIXTURE_TRANSPORT_ROLE
        ) {
          throw new Error(
            "Official fixture adapter refused a non-fixture role.",
          );
        }

        const response =
          await request({
            fetchImpl,
            baseUrl:
              input.baseUrl,
            accessToken:
              input.accessToken,
            path:
              namePath(
                "/v2/security/role",
                role.name,
              ),
            method:
              "PUT",
            body: {
              Description:
                role.description,

              GrantedRoles:
                [
                  ...role.grantedRoles,
                ],

              EscalationOnly:
                false,

              Resources:
                role.resources.map(
                  (
                    resource,
                  ) => ({
                    Name:
                      resource.resource,

                    Permissions:
                      shortPermission(
                        resource.permission,
                      ),
                  }),
                ),
            },
          });

        requireStatus(
          response,
          [200, 201],
          "Create synthetic transport role",
        );
      },

    deleteRole:
      async (
        name,
      ) => {
        if (
          name !==
          DEMO_FIXTURE_TRANSPORT_ROLE
        ) {
          throw new Error(
            "Official fixture adapter refused to delete a non-fixture role.",
          );
        }

        const response =
          await request({
            fetchImpl,
            baseUrl:
              input.baseUrl,
            accessToken:
              input.accessToken,
            path:
              namePath(
                "/v2/security/role",
                name,
              ),
            method:
              "DELETE",
          });

        requireStatus(
          response,
          [200, 404],
          "Delete synthetic transport role",
        );
      },

    createUser:
      async (
        user:
          DemoFixtureUserCreate,
        password:
          string,
      ) => {
        if (
          user.username !==
          DEMO_FIXTURE_USERNAME
        ) {
          throw new Error(
            "Official fixture adapter refused a non-fixture user.",
          );
        }

        const response =
          await request({
            fetchImpl,
            baseUrl:
              input.baseUrl,
            accessToken:
              input.accessToken,
            path:
              namePath(
                "/v2/security/user",
                user.username,
              ),
            method:
              "POST",
            body: {
              User: {
                FullName:
                  user.displayName,

                Enabled:
                  true,

                AccountNeverExpires:
                  true,

                PasswordNeverExpires:
                  true,

                ChangePassword:
                  false,

                NameSpace:
                  user.namespace,

                Routine:
                  "",

                Roles:
                  [
                    ...user.directRoles,
                  ],

                EscalationRoles:
                  [],

                Comment:
                  user.comment,
              },

              Password:
                password,
            },
          });

        requireStatus(
          response,
          [201],
          "Create synthetic demo user",
        );
      },

    deleteUser:
      async (
        username,
      ) => {
        if (
          username !==
          DEMO_FIXTURE_USERNAME
        ) {
          throw new Error(
            "Official fixture adapter refused to delete a non-fixture user.",
          );
        }

        const response =
          await request({
            fetchImpl,
            baseUrl:
              input.baseUrl,
            accessToken:
              input.accessToken,
            path:
              namePath(
                "/v2/security/user",
                username,
              ),
            method:
              "DELETE",
          });

        requireStatus(
          response,
          [200, 404],
          "Delete synthetic demo user",
        );
      },
  };
}