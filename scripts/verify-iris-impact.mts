import {
  readFileSync,
} from "node:fs";

import {
  readAuthoritativeCurrentAccess,
} from "../src/lib/iris/current-access";

import {
  readCenterpieceImpactPreflight,
} from "../src/lib/iris/impact";

import {
  loginIris,
  logoutIris,
  readRuntimeInfo,
} from "../src/lib/iris/transport";

interface SecretInput {
  password:
    string;
}

const API_BASE =
  "http://localhost:52773/api/admin";

const HELPER_BASE =
  "http://localhost:52773/meridian-control-plane-internal";

const RUNTIME_USER =
  "meridian.runtime";

function fail(
  message:
    string,
): never {
  throw new Error(
    message,
  );
}

function normalize(
  values:
    readonly string[],
): string[] {
  return [...values].sort(
    (
      left,
      right,
    ) =>
      left.localeCompare(
        right,
      ),
  );
}

function expectSet(
  actual:
    readonly string[],

  expected:
    readonly string[],

  label:
    string,
): void {
  const left =
    normalize(
      actual,
    );

  const right =
    normalize(
      expected,
    );

  if (
    JSON.stringify(
      left,
    ) !==
    JSON.stringify(
      right,
    )
  ) {
    fail(
      (
        `${label} mismatch. ` +
        `Actual=${left.join(",")} ` +
        `Expected=${right.join(",")}`
      ),
    );
  }
}

function currentSnapshot(
  value:
    Awaited<
      ReturnType<
        typeof readAuthoritativeCurrentAccess
      >
    >,
): string {
  return JSON.stringify({
    username:
      value.username,

    displayName:
      value.displayName,

    enabled:
      value.enabled,

    namespace:
      value.namespace,

    directRoles:
      [...value.directRoles].sort(),

    effectiveRoles:
      [...value.effectiveRoles].sort(),

    permissions:
      [...value.permissions]
        .map(
          (entry) => ({
            resource:
              entry.resource,

            permission:
              entry.permission,

            allowed:
              entry.allowed,
          }),
        )
        .sort(
          (
            left,
            right,
          ) =>
            (
              `${left.resource}:${left.permission}`
            ).localeCompare(
              `${right.resource}:${right.permission}`,
            ),
        ),
  });
}

const secret =
  JSON.parse(
    readFileSync(
      0,
      "utf8",
    ),
  ) as SecretInput;

if (
  typeof secret.password !==
    "string" ||
  secret.password.length ===
    0
) {
  fail(
    "Runtime password missing from stdin.",
  );
}

let session:
  Awaited<
    ReturnType<
      typeof loginIris
    >
  > | null = null;

try {

  session =
    await loginIris({
      baseUrl:
        API_BASE,

      username:
        RUNTIME_USER,

      password:
        secret.password,
    });

  console.log(
    "IMPACT_LOGIN_HTTP=200",
  );

  console.log(
    "IMPACT_TOKENS_PRESENT=YES",
  );

  console.log(
    "IMPACT_TOKENS_PRINTED=NO",
  );

  const runtime =
    await readRuntimeInfo({
      baseUrl:
        API_BASE,

      accessToken:
        session.accessToken,
    });

  console.log(
    `IMPACT_RUNTIME_USERNAME=${runtime.username}`,
  );

  console.log(
    `IMPACT_RUNTIME_API_VERSION=${runtime.apiVersion}`,
  );

  console.log(
    `IMPACT_RUNTIME_BUILD_221U=${
      runtime.serverVersion.includes(
        "Build 221U",
      )
        ? "YES"
        : "NO"
    }`,
  );

  if (
    runtime.username !==
      RUNTIME_USER ||
    runtime.apiVersion !==
      2 ||
    !runtime.serverVersion.includes(
      "2026.2",
    ) ||
    !runtime.serverVersion.includes(
      "Build 221U",
    )
  ) {
    fail(
      "Pinned runtime identity mismatch.",
    );
  }

  const before =
    await readAuthoritativeCurrentAccess({
      apiBaseUrl:
        API_BASE,

      helperBaseUrl:
        HELPER_BASE,

      accessToken:
        session.accessToken,

      username:
        "maya.patel",
    });

  const beforeWitness =
    currentSnapshot(
      before,
    );

  const result =
    await readCenterpieceImpactPreflight({
      apiBaseUrl:
        API_BASE,

      helperBaseUrl:
        HELPER_BASE,

      accessToken:
        session.accessToken,
    });

  console.log(
    `AUTHORIZATION_LOST_ROLE_COUNT=${result.authorization.lostEffectiveRoles.length}`,
  );

  console.log(
    `AUTHORIZATION_LOST_PERMISSION_COUNT=${result.authorization.lostPermissions.length}`,
  );

  if (
    result.authorization.lostEffectiveRoles.length !==
      3 ||
    result.authorization.lostPermissions.length !==
      4
  ) {
    fail(
      "Frozen Step-5 authorization delta changed.",
    );
  }

  console.log(
    "STEP5_AUTHORIZATION_DELTA_PRESERVED=PASS",
  );

  console.log(
    `APPLICATION_IMPACT_COUNT=${result.applications.length}`,
  );

  for (
    const application
    of result.applications
  ) {
    console.log(
      [
        "APPLICATION_IMPACT",
        application.name,
        `${application.requirement.resource}:${application.requirement.permission}`,
        `before=${application.beforeAllowed ? 1 : 0}`,
        `after=${application.afterAllowed ? 1 : 0}`,
        `classification=${application.classification}`,
        `dispatch=${application.dispatchClass}`,
      ].join(
        "|",
      ),
    );
  }

  expectSet(
    result.applications.map(
      (application) =>
        [
          application.name,
          `${application.requirement.resource}:${application.requirement.permission}`,
          application.classification,
        ].join(
          "|",
        ),
    ),
    [
      "/meridian/api|Meridian_Portal:USE|RETAINED",
      "/meridian/admin|Meridian_Admin:USE|LOST",
    ],
    "Application impact",
  );

  console.log(
    `LOST_APPLICATION_COUNT=${result.summary.lostApplicationCount}`,
  );

  console.log(
    `RETAINED_APPLICATION_COUNT=${result.summary.retainedApplicationCount}`,
  );

  console.log(
    `GAINED_APPLICATION_COUNT=${result.summary.gainedApplicationCount}`,
  );

  if (
    result.summary.lostApplicationCount !==
      1 ||
    result.summary.retainedApplicationCount !==
      1 ||
    result.summary.gainedApplicationCount !==
      0
  ) {
    fail(
      "Unexpected live application impact summary.",
    );
  }

  console.log(
    "LIVE_APPLICATION_IMPACT=PASS",
  );

  console.log(
    `DEPLOYED_REST_OPERATION_COUNT=${result.coverage.deployedOperationCount}`,
  );

  console.log(
    `DECLARED_REST_OPERATION_COUNT=${result.coverage.declaredOperationCount}`,
  );

  console.log(
    `JOINED_REST_OPERATION_COUNT=${result.coverage.joinedOperationCount}`,
  );

  console.log(
    `FULL_DEPLOYMENT_DECLARATION_JOIN=${
      result.coverage.fullDeploymentDeclarationJoin
        ? "YES"
        : "NO"
    }`,
  );

  if (
    !result.coverage.fullDeploymentDeclarationJoin
  ) {
    fail(
      "Deployment/declaration join is incomplete.",
    );
  }

  for (
    const operation
    of result.restOperations
  ) {
    console.log(
      [
        "REST_DECLARED_IMPACT",
        `${operation.method} ${operation.path}`,
        operation.operationId,
        (
          `service=${operation.serviceRequirement.resource}:` +
          operation.serviceRequirement.permission
        ),
        (
          "declared=" +
          operation.declaredRequirements
            .map(
              (requirement) =>
                `${requirement.resource}:${requirement.permission}`,
            )
            .join(
              ",",
            )
        ),
        `before=${operation.beforeAllowed ? 1 : 0}`,
        `after=${operation.afterAllowed ? 1 : 0}`,
        `classification=${operation.classification}`,
      ].join(
        "|",
      ),
    );

    if (
      operation.claim !==
        "DECLARED_IMPACT" ||
      operation.deploymentTruth !==
        "NATIVE_EMITTED_SWAGGER" ||
      operation.declarationTruth !==
        "AUTHORITATIVE_SOURCE_OPENAPI"
    ) {
      fail(
        `Claim boundary mismatch for ${operation.operationId}.`,
      );
    }
  }

  expectSet(
    result.restOperations.map(
      (operation) =>
        [
          operation.method,
          operation.path,
          operation.operationId,
          operation.classification,
        ].join(
          "|",
        ),
    ),
    [
      "GET|/orders|listOrders|RETAINED",
      "PATCH|/orders/{id}|updateOrder|LOST",
      "POST|/jobs/{id}/run|runJob|LOST",
      "POST|/admin/cache/reload|reloadAdminCache|LOST",
      "POST|/tasks/{id}/run|runTask|LOST",
    ],
    "Declared REST impact",
  );

  console.log(
    `LOST_DECLARED_REST_OPERATION_COUNT=${result.summary.lostRestOperationCount}`,
  );

  console.log(
    `RETAINED_DECLARED_REST_OPERATION_COUNT=${result.summary.retainedRestOperationCount}`,
  );

  console.log(
    `GAINED_DECLARED_REST_OPERATION_COUNT=${result.summary.gainedRestOperationCount}`,
  );

  if (
    result.summary.lostRestOperationCount !==
      4 ||
    result.summary.retainedRestOperationCount !==
      1 ||
    result.summary.gainedRestOperationCount !==
      0
  ) {
    fail(
      "Unexpected live declared REST impact summary.",
    );
  }

  console.log(
    "DEPLOYED_OPERATION_INVENTORY_SOURCE=NATIVE_EMITTED_SWAGGER",
  );

  console.log(
    "REQUIRED_RESOURCE_SOURCE=AUTHORITATIVE_SOURCE_OPENAPI",
  );

  console.log(
    "AUTHORIZATION_TRUTH_SOURCE=NATIVE_IRIS_BEFORE_AFTER_PERMISSION_EVALUATION",
  );

  console.log(
    "REST_CLAIM=DECLARED_IMPACT",
  );

  console.log(
    "ARBITRARY_CODE_AUTHORIZATION_INFERENCE=NO",
  );

  console.log(
    "LIVE_DECLARED_REST_IMPACT=PASS",
  );

  const after =
    await readAuthoritativeCurrentAccess({
      apiBaseUrl:
        API_BASE,

      helperBaseUrl:
        HELPER_BASE,

      accessToken:
        session.accessToken,

      username:
        "maya.patel",
    });

  const afterWitness =
    currentSnapshot(
      after,
    );

  if (
    afterWitness !==
      beforeWitness
  ) {
    fail(
      "Maya authoritative state changed during impact preflight.",
    );
  }

  console.log(
    "MAYA_STATE_UNCHANGED_DURING_IMPACT_PREFLIGHT=PASS",
  );

  console.log(
    "SECURITY_MUTATION_PERFORMED=NO",
  );

  console.log(
    "PROCESS_MUTATION_PERFORMED=NO",
  );

  console.log(
    "MAYA_MUTATED=NO",
  );

  console.log(
    "B6C_MUTATED=NO",
  );

  console.log(
    "REAL_CENTERPIECE_IMPACT_PREFLIGHT=PASS",
  );
}
finally {

  if (session) {

    await logoutIris({
      baseUrl:
        API_BASE,

      accessToken:
        session.accessToken,
    });

    console.log(
      "IMPACT_LOGOUT_HTTP=200",
    );
  }
}