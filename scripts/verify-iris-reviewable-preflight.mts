import {
  readFileSync,
} from "node:fs";

import {
  readAuthoritativeCurrentAccess,
} from "../src/lib/iris/current-access";

import {
  readCenterpieceReviewablePreflight,
} from "../src/lib/iris/reviewable-preflight";

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

function snapshot(
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
          (permission) => ({
            resource:
              permission.resource,

            permission:
              permission.permission,

            allowed:
              permission.allowed,
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

function permissionKeys(
  values:
    readonly {
      readonly resource:
        string;

      readonly permission:
        string;
    }[],
): string[] {
  return values.map(
    (value) =>
      `${value.resource}:${value.permission}`,
  );
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
    "Runtime password missing.",
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
    "DIGEST_LOGIN_HTTP=200",
  );

  console.log(
    "DIGEST_TOKENS_PRESENT=YES",
  );

  console.log(
    "DIGEST_TOKENS_PRINTED=NO",
  );

  const runtime =
    await readRuntimeInfo({
      baseUrl:
        API_BASE,

      accessToken:
        session.accessToken,
    });

  console.log(
    `DIGEST_RUNTIME_USERNAME=${runtime.username}`,
  );

  console.log(
    `DIGEST_RUNTIME_API_VERSION=${runtime.apiVersion}`,
  );

  console.log(
    `DIGEST_RUNTIME_BUILD_221U=${
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

  const beforeSnapshot =
    snapshot(
      before,
    );

  const first =
    await readCenterpieceReviewablePreflight({
      apiBaseUrl:
        API_BASE,

      helperBaseUrl:
        HELPER_BASE,

      accessToken:
        session.accessToken,
    });

  const second =
    await readCenterpieceReviewablePreflight({
      apiBaseUrl:
        API_BASE,

      helperBaseUrl:
        HELPER_BASE,

      accessToken:
        session.accessToken,
    });

  console.log(
    `PREFLIGHT_STATE=${first.state}`,
  );

  console.log(
    `PREFLIGHT_DIGEST_ALGORITHM=${first.digestAlgorithm}`,
  );

  console.log(
    `PREFLIGHT_DIGEST_FIRST=${first.digest}`,
  );

  console.log(
    `PREFLIGHT_DIGEST_SECOND=${second.digest}`,
  );

  if (
    first.state !==
      "PREFLIGHTED" ||
    first.digestAlgorithm !==
      "SHA-256"
  ) {
    fail(
      "Reviewable preflight identity mismatch.",
    );
  }

  if (
    !/^[A-F0-9]{64}$/.test(
      first.digest,
    )
  ) {
    fail(
      "Preflight digest is not an uppercase SHA-256.",
    );
  }

  if (
    first.digest !==
      second.digest
  ) {
    fail(
      "Two unchanged authoritative preflights produced different digests.",
    );
  }

  if (
    first.canonicalJson !==
      second.canonicalJson
  ) {
    fail(
      "Two unchanged authoritative preflights produced different canonical bytes.",
    );
  }

  console.log(
    "UNCHANGED_PREFLIGHT_DIGEST_STABLE=PASS",
  );

  console.log(
    `CANONICAL_SCHEMA_VERSION=${first.canonical.schemaVersion}`,
  );

  console.log(
    `CANONICAL_CHANGE_USERNAME=${first.canonical.change.username}`,
  );

  console.log(
    `CANONICAL_CHANGE_OPERATION=${first.canonical.change.operation}`,
  );

  console.log(
    `CANONICAL_CHANGE_ROLE=${first.canonical.change.role}`,
  );

  if (
    first.canonical.schemaVersion !==
      "meridian.preflight.v1" ||
    first.canonical.change.username !==
      "maya.patel" ||
    first.canonical.change.operation !==
      "REMOVE" ||
    first.canonical.change.role !==
      "MeridianSupervisor"
  ) {
    fail(
      "Canonical centerpiece change identity mismatch.",
    );
  }

  console.log(
    `CANONICAL_CURRENT_DIRECT_ROLES=${first.canonical.current.directRoles.join(",")}`,
  );

  console.log(
    `CANONICAL_PROPOSED_DIRECT_ROLES=${first.canonical.proposed.directRoles.join(",")}`,
  );

  console.log(
    `CANONICAL_LOST_EFFECTIVE_ROLES=${first.canonical.authorizationDelta.lostEffectiveRoles.join(",")}`,
  );

  console.log(
    `CANONICAL_RETAINED_EFFECTIVE_ROLES=${first.canonical.authorizationDelta.retainedEffectiveRoles.join(",")}`,
  );

  console.log(
    `CANONICAL_LOST_PERMISSIONS=${permissionKeys(
      first.canonical.authorizationDelta.lostPermissions,
    ).join(",")}`,
  );

  console.log(
    `CANONICAL_RETAINED_PERMISSIONS=${permissionKeys(
      first.canonical.authorizationDelta.retainedPermissions,
    ).join(",")}`,
  );

  if (
    first.canonical.current.directRoles.join(
      ",",
    ) !==
      "MeridianEmployee,MeridianSupervisor"
  ) {
    fail(
      "Canonical current direct roles mismatch.",
    );
  }

  if (
    first.canonical.proposed.directRoles.join(
      ",",
    ) !==
      "MeridianEmployee"
  ) {
    fail(
      "Canonical proposed direct roles mismatch.",
    );
  }

  if (
    first.canonical.authorizationDelta.lostEffectiveRoles.length !==
      3 ||
    first.canonical.authorizationDelta.lostPermissions.length !==
      4
  ) {
    fail(
      "Canonical authorization delta mismatch.",
    );
  }

  console.log(
    `CANONICAL_APPLICATION_COUNT=${first.canonical.applications.length}`,
  );

  console.log(
    `CANONICAL_LOST_APPLICATION_COUNT=${first.canonical.summary.lostApplicationCount}`,
  );

  console.log(
    `CANONICAL_REST_OPERATION_COUNT=${first.canonical.restOperations.length}`,
  );

  console.log(
    `CANONICAL_LOST_REST_OPERATION_COUNT=${first.canonical.summary.lostRestOperationCount}`,
  );

  console.log(
    `CANONICAL_JOINED_REST_OPERATION_COUNT=${first.canonical.coverage.joinedOperationCount}`,
  );

  console.log(
    `CANONICAL_FULL_DEPLOYMENT_DECLARATION_JOIN=${
      first.canonical.coverage.fullDeploymentDeclarationJoin
        ? "YES"
        : "NO"
    }`,
  );

  if (
    first.canonical.summary.lostApplicationCount !==
      1 ||
    first.canonical.summary.lostRestOperationCount !==
      4 ||
    first.canonical.applications.length !==
      2 ||
    first.canonical.restOperations.length !==
      5 ||
    first.canonical.coverage.joinedOperationCount !==
      5 ||
    !first.canonical.coverage.fullDeploymentDeclarationJoin
  ) {
    fail(
      "Canonical impact material mismatch.",
    );
  }

  for (
    const application
    of first.canonical.applications
  ) {
    console.log(
      [
        "CANONICAL_APPLICATION",
        application.name,
        `${application.requirement.resource}:${application.requirement.permission}`,
        application.classification,
      ].join(
        "|",
      ),
    );
  }

  for (
    const operation
    of first.canonical.restOperations
  ) {
    console.log(
      [
        "CANONICAL_REST_OPERATION",
        `${operation.method} ${operation.path}`,
        operation.operationId,
        operation.classification,
        operation.claim,
      ].join(
        "|",
      ),
    );
  }

  if (
    first.canonicalJson.includes(
      "capturedAt",
    ) ||
    first.canonicalJson.includes(
      "timestamp",
    ) ||
    first.canonicalJson.includes(
      "headline",
    )
  ) {
    fail(
      "Canonical preflight contains forbidden freshness/UI material.",
    );
  }

  console.log(
    "TIMESTAMP_IN_CANONICAL_PREFLIGHT=NO",
  );

  console.log(
    "UI_NARRATION_IN_CANONICAL_PREFLIGHT=NO",
  );

  console.log(
    `CANONICAL_PREFLIGHT_BYTES=${
      Buffer.byteLength(
        first.canonicalJson,
        "utf8",
      )
    }`,
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

  if (
    snapshot(
      after,
    ) !==
      beforeSnapshot
  ) {
    fail(
      "Maya state changed while computing canonical preflight.",
    );
  }

  console.log(
    "MAYA_STATE_UNCHANGED_DURING_DIGEST=PASS",
  );

  console.log(
    "IRIS_HELPER_CODE_MUTATION_PERFORMED=NO",
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
    "CANONICAL_REVIEWED_PREFLIGHT=PASS",
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
      "DIGEST_LOGOUT_HTTP=200",
    );
  }
}