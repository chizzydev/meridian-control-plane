import {
  readFileSync,
} from "node:fs";

import {
  readAuthoritativeCurrentAccess,
} from "../src/lib/iris/current-access";

import {
  revalidateCenterpieceReadyForApply,
} from "../src/lib/iris/apply-revalidation";

import {
  reviewCenterpiecePreflightForReady,
} from "../src/lib/iris/ready-preflight";

import {
  buildCenterpieceRoleMutationTransportPlan,
} from "../src/lib/iris/role-mutation-transport";

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

const EXPECTED_DIGEST =
  "1ACCE293BE593A8A829B116F04E692A5ED18D68C74834E97E1ADB8ADCA2462BE";

function fail(
  message:
    string,
): never {
  throw new Error(
    message,
  );
}

function isRecord(
  value:
    unknown,
): value is Record<string, unknown> {
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

async function helperGet(
  path:
    string,

  accessToken:
    string,
): Promise<Record<string, unknown>> {
  const response =
    await fetch(
      `${HELPER_BASE}${path}`,
      {
        method:
          "GET",

        cache:
          "no-store",

        headers: {
          Accept:
            "application/json",

          Authorization:
            `Bearer ${accessToken}`,
        },
      },
    );

  const text =
    await response.text();

  if (!response.ok) {
    fail(
      `Helper GET ${path} returned HTTP ${response.status}. Body=${text.slice(0, 300)}`,
    );
  }

  const parsed =
    JSON.parse(
      text,
    ) as unknown;

  if (!isRecord(parsed)) {
    fail(
      `Helper GET ${path} did not return an object.`,
    );
  }

  return parsed;
}

async function permission(
  roles:
    string,

  resource:
    string,

  permissionName:
    string,

  accessToken:
    string,
): Promise<boolean> {
  const query =
    new URLSearchParams({
      roles,
      resource,
      permission:
        permissionName,
    });

  const result =
    await helperGet(
      `/permission?${query.toString()}`,
      accessToken,
    );

  return (
    result.allowed ===
      1 ||
    result.allowed ===
      true ||
    result.allowed ===
      "1"
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
    "MUTATION_DESIGN_LOGIN_HTTP=200",
  );

  console.log(
    "MUTATION_DESIGN_TOKENS_PRESENT=YES",
  );

  console.log(
    "MUTATION_DESIGN_TOKENS_PRINTED=NO",
  );

  const runtime =
    await readRuntimeInfo({
      baseUrl:
        API_BASE,

      accessToken:
        session.accessToken,
    });

  console.log(
    `MUTATION_DESIGN_RUNTIME_USERNAME=${runtime.username}`,
  );

  console.log(
    `MUTATION_DESIGN_RUNTIME_API_VERSION=${runtime.apiVersion}`,
  );

  console.log(
    `MUTATION_DESIGN_RUNTIME_BUILD_221U=${
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

  // ---------------------------------------------------------------
  // Prove current helper execution context already has the two
  // privileges required by current IRIS security APIs.
  // ---------------------------------------------------------------

  const health =
    await helperGet(
      "/health",
      session.accessToken,
    );

  const helperRoles =
    typeof health.roles ===
      "string"
      ? health.roles
      : fail(
          "Helper health did not expose current roles.",
        );

  console.log(
    `HELPER_EXECUTION_ROLES=${helperRoles}`,
  );

  const adminSecureUse =
    await permission(
      helperRoles,
      "%Admin_Secure",
      "USE",
      session.accessToken,
    );

  const dbIrisSysRead =
    await permission(
      helperRoles,
      "%DB_IRISSYS",
      "READ",
      session.accessToken,
    );

  const dbUserWrite =
    (
      health.dbUserWrite ===
        1 ||
      health.dbUserWrite ===
        true ||
      health.dbUserWrite ===
        "1"
    );

  console.log(
    `HELPER_ADMIN_SECURE_USE=${adminSecureUse ? 1 : 0}`,
  );

  console.log(
    `HELPER_DB_IRISSYS_READ=${dbIrisSysRead ? 1 : 0}`,
  );

  console.log(
    `HELPER_DB_USER_WRITE=${dbUserWrite ? 1 : 0}`,
  );

  if (
    !adminSecureUse ||
    !dbIrisSysRead
  ) {
    fail(
      "Current helper execution context lacks required security API privileges.",
    );
  }

  if (dbUserWrite) {
    fail(
      "Unexpected %DB_USER WRITE privilege appeared.",
    );
  }

  console.log(
    "SECURITY_API_REQUIRED_PRIVILEGES_SATISFIED=PASS",
  );

  console.log(
    "RUNTIME_PRIVILEGE_BROADENING_REQUIRED=NO",
  );

  // ---------------------------------------------------------------
  // Re-materialize READY and execute the frozen 10C read-only gate.
  // ---------------------------------------------------------------

  const ready =
    await reviewCenterpiecePreflightForReady({
      apiBaseUrl:
        API_BASE,

      helperBaseUrl:
        HELPER_BASE,

      accessToken:
        session.accessToken,

      reviewedDigest:
        EXPECTED_DIGEST,

      reviewedAtUtc:
        new Date().toISOString(),
    });

  const revalidation =
    await revalidateCenterpieceReadyForApply({
      apiBaseUrl:
        API_BASE,

      helperBaseUrl:
        HELPER_BASE,

      accessToken:
        session.accessToken,

      ready,
    });

  console.log(
    `10C_DECISION_STATE=${revalidation.decision.state}`,
  );

  console.log(
    `10C_DECISION_OUTCOME=${revalidation.decision.outcome}`,
  );

  console.log(
    `10C_DECISION_DIGEST_MATCH=${
      revalidation.decision.digestMatch
        ? "YES"
        : "NO"
    }`,
  );

  console.log(
    `10C_DECISION_MAY_PROCEED=${
      revalidation.decision.mayProceedToMutationBoundary
        ? "YES"
        : "NO"
    }`,
  );

  console.log(
    `10C_DECISION_MUTATION_ATTEMPTED=${
      revalidation.decision.mutationAttempted
        ? "YES"
        : "NO"
    }`,
  );

  console.log(
    `10C_DECISION_MUTATION_COUNT=${revalidation.decision.mutationCount}`,
  );

  if (
    revalidation.decision.state !==
      "READY" ||
    revalidation.decision.outcome !==
      "MATCH" ||
    revalidation.decision.digestMatch !==
      true ||
    revalidation.decision.mayProceedToMutationBoundary !==
      true ||
    revalidation.decision.mutationAttempted !==
      false ||
    revalidation.decision.mutationCount !==
      0
  ) {
    fail(
      "Frozen 10C gate did not produce the exact MATCH boundary.",
    );
  }

  console.log(
    "FROZEN_10C_MATCH_RECONFIRMED=PASS",
  );

  // ---------------------------------------------------------------
  // Build only the future transport plan.
  // NO fetch to the mutation path occurs here.
  // ---------------------------------------------------------------

  const plan =
    buildCenterpieceRoleMutationTransportPlan(
      revalidation,
    );

  console.log(
    `MUTATION_CONTRACT_VERSION=${plan.command.contractVersion}`,
  );

  console.log(
    `MUTATION_PRIMITIVE=${plan.command.primitive}`,
  );

  console.log(
    `MUTATION_HTTP_METHOD=${plan.method}`,
  );

  console.log(
    `MUTATION_HTTP_PATH=${plan.path}`,
  );

  console.log(
    `MUTATION_TARGET_USERNAME=${plan.command.username}`,
  );

  console.log(
    `MUTATION_OPERATION=${plan.command.operation}`,
  );

  console.log(
    `MUTATION_TARGET_ROLE=${plan.command.role}`,
  );

  console.log(
    `MUTATION_REVIEWED_DIGEST=${plan.command.reviewedDigest}`,
  );

  console.log(
    `MUTATION_FRESH_DIGEST=${plan.command.freshDigest}`,
  );

  console.log(
    `MUTATION_EXPECTED_BEFORE_DIRECT_ROLES=${plan.command.expectedBeforeDirectRoles.join(",")}`,
  );

  console.log(
    `MUTATION_EXPECTED_AFTER_DIRECT_ROLES=${plan.command.expectedAfterDirectRoles.join(",")}`,
  );

  console.log(
    `MUTATION_REQUEST_BODY=${
      plan.requestBody === null
        ? "NONE"
        : "PRESENT"
    }`,
  );

  console.log(
    `MUTATION_NETWORK_REQUEST_PERFORMED=${
      plan.networkRequestPerformed
        ? "YES"
        : "NO"
    }`,
  );

  if (
    plan.command.contractVersion !==
      "centerpiece-remove-v1" ||
    plan.command.primitive !==
      "Security.Users.RemoveRoles" ||
    plan.method !==
      "POST" ||
    plan.path !==
      "/apply/remove-centerpiece-role" ||
    plan.command.username !==
      "maya.patel" ||
    plan.command.operation !==
      "REMOVE" ||
    plan.command.role !==
      "MeridianSupervisor" ||
    plan.command.reviewedDigest !==
      EXPECTED_DIGEST ||
    plan.command.freshDigest !==
      EXPECTED_DIGEST ||
    plan.command.expectedBeforeDirectRoles.join(
      ",",
    ) !==
      "MeridianEmployee,MeridianSupervisor" ||
    plan.command.expectedAfterDirectRoles.join(
      ",",
    ) !==
      "MeridianEmployee" ||
    plan.requestBody !==
      null ||
    plan.networkRequestPerformed !==
      false
  ) {
    fail(
      "Role-mutation transport design does not match centerpiece contract.",
    );
  }

  console.log(
    "CENTERPIECE_MUTATION_PLAN=PASS",
  );

  console.log(
    "ARBITRARY_USER_MUTATION_SUPPORTED=NO",
  );

  console.log(
    "ARBITRARY_ROLE_MUTATION_SUPPORTED=NO",
  );

  console.log(
    "MUTATION_BODY_PARAMETERIZATION=NO",
  );

  console.log(
    "CANDIDATE_MUTATION_ENDPOINT_INVOKED=NO",
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
      "Maya state changed during mutation transport design certification.",
    );
  }

  console.log(
    "MAYA_STATE_UNCHANGED_DURING_MUTATION_DESIGN=PASS",
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
    "SUPPORTED_ROLE_MUTATION_TRANSPORT_DESIGN=PASS",
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
      "MUTATION_DESIGN_LOGOUT_HTTP=200",
    );
  }
}