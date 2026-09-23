import {
  createHash,
} from "node:crypto";

import {
  readFileSync,
  writeFileSync,
} from "node:fs";

import {
  resolve,
} from "node:path";

const SOURCE = Object.freeze({
  repository:
    "intersystems-community/sysadmin-api-specification",
  commit:
    "f764aea427e5c0b1dd08a4c18a0457e0ff7b3b34",
  blobSha:
    "373e8627e755c0cb89fee855fb70514f48376d60",
  path:
    "mainspec_v2.json",
});

const PRIMARY_METHODS =
  new Set([
    "get",
    "post",
    "put",
    "delete",
  ]);

const COMPANION_METHODS =
  new Set([
    "head",
  ]);

const VERIFIED_READS =
  new Set([
    "GET /info",
    "GET /v2/locks",
    "GET /v2/monitor/dashboard/system-resources",
    "GET /v2/monitor/system-usage",
    "GET /v2/monitor/system-usage/shared-memory",
    "GET /v2/security/oauth2/client/client-configurations",
    "GET /v2/security/oauth2/client/server-definitions",
    "GET /v2/security/oauth2/resource-servers",
    "GET /v2/security/oauth2/server/clients",
    "GET /v2/security/role",
    "GET /v2/security/ssl-configurations",
    "GET /v2/security/user",
    "GET /v2/security/x509-credentials",
    "GET /v2/task/history",
    "GET /v2/task/manager",
    "GET /v2/task/upcoming",
    "GET /v2/tasks",
    "GET /v2/wallet/collections",
    "GET /v2/wallet/secrets",
    "GET /v2/web-apps",
  ]);

const ACTIONS:
  Readonly<
    Record<
      string,
      {
        readonly phase:
          string;
        readonly ids:
          readonly string[];
        readonly certified:
          readonly string[];
      }
    >
  > =
  Object.freeze({
    "PUT /v2/web-app": {
      phase:
        "R3",
      ids:
        Object.freeze([
          "W01_WEB_APP_CREATE",
          "W02_WEB_APP_UPDATE",
          "W03_WEB_APP_ENABLE",
        ]),
      certified:
        Object.freeze([
          "W01_WEB_APP_CREATE",
          "W02_WEB_APP_UPDATE",
          "W03_WEB_APP_ENABLE",
        ]),
    },
    "DELETE /v2/web-app": {
      phase:
        "R3",
      ids:
        Object.freeze([
          "W04_WEB_APP_DELETE",
        ]),
      certified:
        Object.freeze([
          "W04_WEB_APP_DELETE",
        ]),
    },
    "PUT /v2/security/role": {
      phase:
        "R4",
      ids:
        Object.freeze([
          "P01_ROLE_CREATE",
        ]),
      certified:
        Object.freeze([
          "P01_ROLE_CREATE",
        ]),
    },
    "DELETE /v2/security/role": {
      phase:
        "R4",
      ids:
        Object.freeze([
          "P02_ROLE_DELETE",
        ]),
      certified:
        Object.freeze([
          "P02_ROLE_DELETE",
        ]),
    },
    "PUT /v2/security/user": {
      phase:
        "R4",
      ids:
        Object.freeze([
          "P03_USER_ADD_ROLE",
          "P04_USER_REMOVE_ROLE",
          "P05_USER_ENABLE",
          "P06_USER_DISABLE",
        ]),
      certified:
        Object.freeze([
          "P03_USER_ADD_ROLE",
          "P04_USER_REMOVE_ROLE",
          "P05_USER_ENABLE",
          "P06_USER_DISABLE",
        ]),
    },
    "POST /v2/task": {
      phase:
        "R5",
      ids:
        Object.freeze([
          "T01_TASK_CREATE",
        ]),
      certified:
        Object.freeze([
          "T01_TASK_CREATE",]),
    },
    "PUT /v2/task": {
      phase:
        "R5",
      ids:
        Object.freeze([
          "T02_TASK_UPDATE",
        ]),
      certified:
        Object.freeze([
          "T02_TASK_UPDATE",
        ]),
    },
    "POST /v2/task/run": {
      phase:
        "R5",
      ids:
        Object.freeze([
          "T03_TASK_RUN_NOW",
        ]),
      certified:
        Object.freeze([
          "T03_TASK_RUN_NOW",
        ]),
    },
    "POST /v2/task/suspend": {
      phase:
        "R5",
      ids:
        Object.freeze([
          "T04_TASK_SUSPEND",
        ]),
      certified:
        Object.freeze([
          "T04_TASK_SUSPEND",
        ]),
    },
    "POST /v2/task/resume": {
      phase:
        "R5",
      ids:
        Object.freeze([
          "T05_TASK_RESUME",
        ]),
      certified:
        Object.freeze([
          "T05_TASK_RESUME",
        ]),
    },
    "DELETE /v2/task": {
      phase:
        "R5",
      ids:
        Object.freeze([
          "T06_TASK_DELETE",
        ]),
      certified:
        Object.freeze([
          "T06_TASK_DELETE",
        ]),
    },
    "PUT /v2/security/oauth2/client/client-configuration": {
      phase:
        "R6",
      ids:
        Object.freeze([
          "S01_OAUTH_CREATE",
          "S02_OAUTH_UPDATE",
          "S03_OAUTH_SET_ENABLED",
        ]),
      certified:
        Object.freeze([]),
    },
    "DELETE /v2/security/oauth2/client/client-configuration": {
      phase:
        "R6",
      ids:
        Object.freeze([
          "S04_OAUTH_DELETE",
        ]),
      certified:
        Object.freeze([]),
    },
    "PUT /v2/wallet/collection": {
      phase:
        "R6",
      ids:
        Object.freeze([
          "S05_WALLET_COLLECTION_CREATE",
        ]),
      certified:
        Object.freeze([]),
    },
    "DELETE /v2/wallet/collection": {
      phase:
        "R6",
      ids:
        Object.freeze([
          "S06_WALLET_COLLECTION_DELETE",
        ]),
      certified:
        Object.freeze([]),
    },
    "PUT /v2/wallet/secret": {
      phase:
        "R6",
      ids:
        Object.freeze([
          "S07_WALLET_SECRET_CREATE",
        ]),
      certified:
        Object.freeze([]),
    },
    "DELETE /v2/wallet/secret": {
      phase:
        "R6",
      ids:
        Object.freeze([
          "S08_WALLET_SECRET_DELETE",
        ]),
      certified:
        Object.freeze([]),
    },
    "POST /v2/security/x509-credential": {
      phase:
        "R6",
      ids:
        Object.freeze([
          "S09_X509_CREDENTIAL_IMPORT",
        ]),
      certified:
        Object.freeze([]),
    },
    "DELETE /v2/security/x509-credential": {
      phase:
        "R6",
      ids:
        Object.freeze([
          "S10_X509_CREDENTIAL_DELETE",
        ]),
      certified:
        Object.freeze([]),
    },
    "PUT /v2/security/ssl-configuration": {
      phase:
        "R6",
      ids:
        Object.freeze([
          "S11_SSL_CONFIG_CREATE_OR_UPDATE",
        ]),
      certified:
        Object.freeze([]),
    },
    "POST /v2/security/ssl-configuration/test": {
      phase:
        "R6",
      ids:
        Object.freeze([
          "S12_SSL_CONFIG_TEST",
        ]),
      certified:
        Object.freeze([]),
    },
    "DELETE /v2/security/ssl-configuration": {
      phase:
        "R6",
      ids:
        Object.freeze([
          "S13_SSL_CONFIG_DELETE",
        ]),
      certified:
        Object.freeze([]),
    },
    "POST /v2/process/suspend": {
      phase:
        "R7",
      ids:
        Object.freeze([
          "O01_PROCESS_SUSPEND",
        ]),
      certified: Object.freeze([
          "O01_PROCESS_SUSPEND",
        ]),
    },
    "POST /v2/process/resume": {
      phase:
        "R7",
      ids:
        Object.freeze([
          "O02_PROCESS_RESUME",
        ]),
      certified: Object.freeze([
          "O02_PROCESS_RESUME",
        ]),
    },
    "POST /v2/process/terminate": {
      phase:
        "R7",
      ids:
        Object.freeze([
          "O03_PROCESS_TERMINATE",
        ]),
      certified:
        Object.freeze([]),
    },
  });

type JsonObject =
  Record<
    string,
    unknown
  >;

function isObject(
  value:
    unknown,
): value is JsonObject {
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

function requiredObject(
  value:
    unknown,
  label:
    string,
): JsonObject {
  if (
    !isObject(
      value,
    )
  ) {
    throw new Error(
      `${label} must be an object.`,
    );
  }

  return value;
}

function stringValue(
  value:
    unknown,
): string {
  return typeof value ===
    "string"
    ? value
    : "";
}

function stringArray(
  value:
    unknown,
): string[] {
  return Array.isArray(
    value,
  )
    ? value.filter(
        (
          item,
        ): item is string =>
          typeof item ===
          "string",
      )
    : [];
}

function resolveLocalRef(
  root:
    JsonObject,
  value:
    unknown,
): unknown {
  if (
    !isObject(
      value,
    ) ||
    typeof value.$ref !==
      "string" ||
    !value.$ref.startsWith(
      "#/",
    )
  ) {
    return value;
  }

  let current:
    unknown =
      root;

  for (
    const encodedSegment
    of value.$ref
      .slice(
        2,
      )
      .split(
        "/",
      )
  ) {
    const segment =
      encodedSegment
        .replace(
          /~1/g,
          "/",
        )
        .replace(
          /~0/g,
          "~",
        );

    if (
      !isObject(
        current,
      )
    ) {
      throw new Error(
        `Unable to resolve ${value.$ref}.`,
      );
    }

    current =
      current[
        segment
      ];
  }

  return current;
}

function parametersFor(
  root:
    JsonObject,
  pathItem:
    JsonObject,
  operation:
    JsonObject,
) {
  const raw =
    [
      ...(
        Array.isArray(
          pathItem.parameters,
        )
          ? pathItem.parameters
          : []
      ),
      ...(
        Array.isArray(
          operation.parameters,
        )
          ? operation.parameters
          : []
      ),
    ];

  const byIdentity =
    new Map<
      string,
      {
        readonly name:
          string;
        readonly required:
          boolean;
        readonly schemaType:
          string;
        readonly description:
          string;
      }
    >();

  for (
    const candidate
    of raw
  ) {
    const resolved =
      resolveLocalRef(
        root,
        candidate,
      );

    if (
      !isObject(
        resolved,
      ) ||
      resolved.in !==
        "query" ||
      typeof resolved.name !==
        "string" ||
      resolved.name.length ===
        0
    ) {
      continue;
    }

    const schema =
      resolveLocalRef(
        root,
        resolved.schema,
      );

    const schemaType =
      isObject(
        schema,
      ) &&
      typeof schema.type ===
        "string"
        ? schema.type
        : "string";

    byIdentity.set(
      resolved.name,
      Object.freeze({
        name:
          resolved.name,
        required:
          resolved.required ===
          true,
        schemaType,
        description:
          stringValue(
            resolved.description,
          ),
      }),
    );
  }

  return Object.freeze(
    [
      ...byIdentity
        .values(),
    ].sort(
      (
        left,
        right,
      ) =>
        left.name <
        right.name
          ? -1
          : (
              left.name >
              right.name
                ? 1
                : 0
            ),
    ),
  );
}

function authorityFor(
  summary:
    string,
) {
  const expression =
    summary.match(
      /^\(([^)]+)\)/,
    )?.[1] ??
    null;

  if (
    expression ===
      null
  ) {
    return {
      expression:
        null,
      options:
        Object.freeze(
          [] as readonly (
            readonly string[]
          )[],
        ),
    };
  }

  const options =
    expression
      .split(
        /\s+or\s+/i,
      )
      .map(
        (
          option,
        ) =>
          Object.freeze(
            (
              option.match(
                /%Admin_[A-Za-z0-9_]+(?::[A-Z]+)?/g,
              ) ??
              []
            ),
          ),
      )
      .filter(
        (
          option,
        ) =>
          option.length >
            0,
      );

  return {
    expression,
    options:
      Object.freeze(
        options,
      ),
  };
}

function familyFor(
  path:
    string,
  tag:
    string,
) {
  if (
    path ===
      "/info"
  ) {
    return "SYSTEM_OS";
  }

  if (
    [
      "/login",
      "/logout",
      "/refresh",
      "/revoke",
    ].includes(
      path,
    )
  ) {
    return "SECURITY_SECRETS";
  }

  if (
    tag ===
      "/v2/web-app" ||
    tag ===
      "/v2/web-session"
  ) {
    return "WEB_REST";
  }

  if (
    tag ===
      "/v2/task" ||
    tag ===
      "/v2/async-result"
  ) {
    return "TASKS";
  }

  if (
    tag ===
      "/v2/journal" ||
    path.startsWith(
      "/v2/security/audit/",
    )
  ) {
    return "LOGS";
  }

  if (
    tag ===
      "/v2/wallet"
  ) {
    return "SECURITY_SECRETS";
  }

  if (
    path.startsWith(
      "/v2/security/",
    )
  ) {
    if (
      /^\/v2\/security\/(user|users|role|roles|resource|resources|privileged-routine|privileged-routines|service|services|sql-admin-privilege|sql-admin-privileges|sql-column-privilege|sql-column-privileges|sql-privilege|sql-privileges)(\/|$)/.test(
        path,
      )
    ) {
      return "PERMISSIONS";
    }

    return "SECURITY_SECRETS";
  }

  return "SYSTEM_OS";
}

function supportFor(
  key:
    string,
  method:
    string,
  summary:
    string,
) {
  const action =
    ACTIONS[
      key
    ];

  if (
    action &&
    action.certified.length >
      0
  ) {
    return {
      status:
        "CERTIFIED_ACTION",
      scopeNote:
        (
          "At least one bounded semantic action using this transport is " +
          "live-certified; the endpoint is not exposed as a generic mutation proxy."
        ),
    };
  }

  if (
    method ===
      "GET"
  ) {
    if (
      VERIFIED_READS.has(
        key,
      )
    ) {
      return {
        status:
          "VERIFIED_READ",
        scopeNote:
          "A dedicated Meridian surface or certified proof path already exercises this official read.",
      };
    }

    return {
      status:
        "EXPLORABLE_READ",
      scopeNote:
        "Available to the bounded same-instance read explorer when an approved server-side authority path exists.",
    };
  }

  if (
    action
  ) {
    return {
      status:
        "OUT_OF_PRODUCT_SCOPE",
      scopeNote:
        (
          `Reserved for ${action.phase}; not certified at R2. ` +
          "No generic mutation dispatch is exposed."
        ),
    };
  }

  if (
    /\b(delete|purge|terminate|compact|defragment|dismount|clear|deactivate)\b/i.test(
      summary,
    )
  ) {
    return {
      status:
        "DECLINED_DESTRUCTIVE",
      scopeNote:
        "Not exposed generically. Destructive behavior requires an explicit fixture-bound proof contract or remains declined.",
    };
  }

  return {
    status:
      "OUT_OF_PRODUCT_SCOPE",
    scopeNote:
      "Not exposed by the R2 product surface; no generic mutation dispatch is exposed.",
  };
}

function operationFrom(
  root:
    JsonObject,
  path:
    string,
  pathItem:
    JsonObject,
  rawMethod:
    string,
  operation:
    JsonObject,
) {
  const method =
    rawMethod.toUpperCase();

  const key =
    `${method} ${path}`;

  const tags =
    stringArray(
      operation.tags,
    );

  const summary =
    stringValue(
      operation.summary,
    );

  const authority =
    authorityFor(
      summary,
    );

  const action =
    ACTIONS[
      key
    ] ??
    null;

  const support =
    supportFor(
      key,
      method,
      summary,
    );

  return Object.freeze({
    id:
      key,
    method,
    path,
    summary,
    tags:
      Object.freeze(
        tags,
      ),
    family:
      familyFor(
        path,
        tags[0] ??
          "",
      ),
    supportStatus:
      support.status,
    scopeNote:
      support.scopeNote,
    releaseTrack:
      action?.phase ??
      null,
    plannedActionIds:
      action?.ids ??
      Object.freeze(
        [] as readonly string[],
      ),
    certifiedActionIds:
      action?.certified ??
      Object.freeze(
        [] as readonly string[],
      ),
    requiredAuthorityExpression:
      authority.expression,
    authorityOptions:
      authority.options,
    queryParameters:
      parametersFor(
        root,
        pathItem,
        operation,
      ),
    hasRequestBody:
      operation.requestBody !==
        undefined,
  });
}

function countBy(
  values:
    readonly JsonObject[],
  field:
    string,
) {
  const result:
    Record<
      string,
      number
    > = {};

  for (
    const value
    of values
  ) {
    const key =
      stringValue(
        value[
          field
        ],
      );

    result[
      key
    ] =
      (
        result[
          key
        ] ??
        0
      ) +
      1;
  }

  return Object.fromEntries(
    Object.entries(
      result,
    ).sort(
      (
        left,
        right,
      ) =>
        left[0] <
        right[0]
          ? -1
          : (
              left[0] >
              right[0]
                ? 1
                : 0
            ),
    ),
  );
}

function arg(
  name:
    string,
): string {
  const index =
    process.argv.indexOf(
      name,
    );

  const value =
    index >=
      0
      ? process.argv[
          index +
          1
        ]
      : undefined;

  if (
    typeof value !==
      "string" ||
    value.length ===
      0
  ) {
    throw new Error(
      `Missing ${name}.`,
    );
  }

  return value;
}

const inputPath =
  resolve(
    arg(
      "--input",
    ),
  );

const outputPath =
  resolve(
    arg(
      "--output",
    ),
  );

const sourceBytes =
  readFileSync(
    inputPath,
  );

const sourceBlobSha =
  createHash(
    "sha1",
  )
    .update(
      `blob ${sourceBytes.length}\0`,
      "utf8",
    )
    .update(
      sourceBytes,
    )
    .digest(
      "hex",
    );

if (
  sourceBlobSha !==
    SOURCE.blobSha
) {
  throw new Error(
    `Pinned organizer spec blob mismatch: ${sourceBlobSha}.`,
  );
}

const sourceSha256 =
  createHash(
    "sha256",
  )
    .update(
      sourceBytes,
    )
    .digest(
      "hex",
    )
    .toUpperCase();

const root =
  requiredObject(
    JSON.parse(
      sourceBytes.toString(
        "utf8",
      ),
    ) as unknown,
    "SysAdmin OpenAPI",
  );

const paths =
  requiredObject(
    root.paths,
    "SysAdmin OpenAPI paths",
  );

const operations:
  JsonObject[] = [];

const companions:
  JsonObject[] = [];

for (
  const path
  of Object.keys(
    paths,
  ).sort()
) {
  const pathItem =
    requiredObject(
      paths[
        path
      ],
      `Path ${path}`,
    );

  for (
    const rawMethod
    of Object.keys(
      pathItem,
    )
  ) {
    const normalizedMethod =
      rawMethod.toLowerCase();

    if (
      !PRIMARY_METHODS.has(
        normalizedMethod,
      ) &&
      !COMPANION_METHODS.has(
        normalizedMethod,
      )
    ) {
      continue;
    }

    const operation =
      requiredObject(
        pathItem[
          rawMethod
        ],
        `${rawMethod.toUpperCase()} ${path}`,
      );

    const material =
      operationFrom(
        root,
        path,
        pathItem,
        rawMethod,
        operation,
      );

    if (
      PRIMARY_METHODS.has(
        normalizedMethod,
      )
    ) {
      operations.push(
        material,
      );
    }
    else {
      companions.push({
        ...material,
        supportStatus:
          "EXPLORABLE_READ",
        scopeNote:
          "Protocol companion declared by the pinned organizer spec; tracked separately from the 273 primary-operation contract.",
        releaseTrack:
          null,
        plannedActionIds:
          Object.freeze(
            [] as readonly string[],
          ),
        certifiedActionIds:
          Object.freeze(
            [] as readonly string[],
          ),
      });
    }
  }
}

operations.sort(
  (
    left,
    right,
  ) =>
    stringValue(
      left.id,
    ) <
    stringValue(
      right.id,
    )
      ? -1
      : (
          stringValue(
            left.id,
          ) >
          stringValue(
            right.id,
          )
            ? 1
            : 0
        ),
);

companions.sort(
  (
    left,
    right,
  ) =>
    stringValue(
      left.id,
    ) <
    stringValue(
      right.id,
    )
      ? -1
      : (
          stringValue(
            left.id,
          ) >
          stringValue(
            right.id,
          )
            ? 1
            : 0
        ),
);

const sourceOperationCount =
  operations.length +
  companions.length;

if (
  sourceOperationCount !==
    276 ||
  operations.length !==
    273 ||
  companions.length !==
    3
) {
  throw new Error(
    (
      "Pinned organizer spec operation count changed: " +
      `source=${sourceOperationCount}, primary=${operations.length}, ` +
      `companions=${companions.length}.`
    ),
  );
}

const plannedActionIds =
  operations.flatMap(
    (
      operation,
    ) =>
      Array.isArray(
        operation.plannedActionIds,
      )
        ? operation.plannedActionIds
        : [],
  );

if (
  plannedActionIds.length !==
    32 ||
  new Set(
    plannedActionIds,
  ).size !==
    32
) {
  throw new Error(
    "Required mutation registry must bind exactly 32 unique action ids.",
  );
}

const manifest =
  Object.freeze({
    schemaVersion:
      "meridian.sysadmin-operation-manifest.v1",
    generatedFrom: {
      ...SOURCE,
      sourceSha256,
      openapiVersion:
        stringValue(
          root.openapi,
        ),
      apiVersion:
        stringValue(
          requiredObject(
            root.info,
            "OpenAPI info",
          ).version,
        ),
      sourceOperationCount,
      primaryOperationCount:
        operations.length,
      protocolCompanionCount:
        companions.length,
      primaryMethods:
        Object.freeze([
          "GET",
          "POST",
          "PUT",
          "DELETE",
        ]),
      companionMethods:
        Object.freeze([
          "HEAD",
        ]),
      countRule:
        (
          "The 273-operation contract counts GET/POST/PUT/DELETE. " +
          "Three organizer-declared HEAD checks are retained separately as protocol companions."
        ),
    },
    counts: {
      byMethod:
        countBy(
          operations,
          "method",
        ),
      byFamily:
        countBy(
          operations,
          "family",
        ),
      byStatus:
        countBy(
          operations,
          "supportStatus",
        ),
    },
    mutationRegistry: {
      requiredActionCount:
        32,
      actionIds:
        Object.freeze(
          [
            ...plannedActionIds,
          ].sort(),
        ),
    },
    operations:
      Object.freeze(
        operations,
      ),
    protocolCompanions:
      Object.freeze(
        companions,
      ),
  });

writeFileSync(
  outputPath,
  (
    JSON.stringify(
      manifest,
      null,
      2,
    ) +
    "\n"
  ),
  "utf8",
);

process.stdout.write(
  [
    "SYSADMIN_MANIFEST_GENERATED=YES",
    `SOURCE_OPERATIONS=${sourceOperationCount}`,
    `PRIMARY_OPERATIONS=${operations.length}`,
    `PROTOCOL_COMPANIONS=${companions.length}`,
    `REQUIRED_ACTION_IDS=${plannedActionIds.length}`,
    `SOURCE_SHA256=${sourceSha256}`,
    `OUTPUT=${outputPath}`,
  ].join(
    "\n",
  ) +
  "\n",
);
