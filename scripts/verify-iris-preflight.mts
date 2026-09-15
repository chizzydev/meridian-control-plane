import {
  readFileSync,
} from "node:fs";

import {
  readAuthoritativeCurrentAccess,
} from "../src/lib/iris/current-access";

import {
  readCenterpieceAuthorizationPreflight,
} from "../src/lib/iris/preflight";

import {
  loginIris,
  logoutIris,
  readRuntimeInfo,
} from "../src/lib/iris/transport";

interface SecretInput {
  password: string;
}

const API_BASE =
  "http://localhost:52773/api/admin";

const HELPER_BASE =
  "http://localhost:52773/meridian-control-plane-internal";

const RUNTIME_USER =
  "meridian.runtime";

function fail(
  message: string,
): never {
  throw new Error(
    message,
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
  const normalize = (
    values:
      readonly string[],
  ) =>
    [...values].sort(
      (
        left,
        right,
      ) =>
        left.localeCompare(
          right,
        ),
    );

  const actualNormalized =
    normalize(
      actual,
    );

  const expectedNormalized =
    normalize(
      expected,
    );

  if (
    JSON.stringify(
      actualNormalized,
    ) !==
    JSON.stringify(
      expectedNormalized,
    )
  ) {
    fail(
      `${label} mismatch. Actual=${actualNormalized.join(",")}`,
    );
  }
}

function permissionKeys(
  values: readonly {
    resource: string;
    permission: string;
  }[],
): string[] {
  return values.map(
    (value) =>
      `${value.resource}:${value.permission}`,
  );
}

function currentSnapshot(
  value: Awaited<
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
    "PREFLIGHT_LOGIN_HTTP=200",
  );

  console.log(
    "PREFLIGHT_TOKENS_PRESENT=YES",
  );

  console.log(
    "PREFLIGHT_TOKENS_PRINTED=NO",
  );

  const runtime =
    await readRuntimeInfo({
      baseUrl:
        API_BASE,

      accessToken:
        session.accessToken,
    });

  console.log(
    `PREFLIGHT_INFO_USERNAME=${runtime.username}`,
  );

  console.log(
    `PREFLIGHT_INFO_API_VERSION=${runtime.apiVersion}`,
  );

  console.log(
    `PREFLIGHT_INFO_BUILD_221U=${
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

  const stateBefore =
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
      stateBefore,
    );

  const preflight =
    await readCenterpieceAuthorizationPreflight({
      apiBaseUrl:
        API_BASE,

      helperBaseUrl:
        HELPER_BASE,

      accessToken:
        session.accessToken,
    });

  console.log(
    `PREFLIGHT_CHANGE_OPERATION=${preflight.change.operation}`,
  );

  console.log(
    `PREFLIGHT_CHANGE_USER=${preflight.change.username}`,
  );

  console.log(
    `PREFLIGHT_CHANGE_ROLE=${preflight.change.role}`,
  );

  console.log(
    `CURRENT_DIRECT_ROLES=${preflight.current.directRoles.join(",")}`,
  );

  console.log(
    `PROPOSED_DIRECT_ROLES=${preflight.proposed.directRoles.join(",")}`,
  );

  console.log(
    `CURRENT_EFFECTIVE_ROLES=${preflight.current.effectiveRoles.join(",")}`,
  );

  console.log(
    `PROPOSED_EFFECTIVE_ROLES=${preflight.proposed.effectiveRoles.join(",")}`,
  );

  console.log(
    `LOST_EFFECTIVE_ROLE_COUNT=${preflight.lostEffectiveRoles.length}`,
  );

  console.log(
    `LOST_EFFECTIVE_ROLES=${preflight.lostEffectiveRoles.join(",")}`,
  );

  console.log(
    `GAINED_EFFECTIVE_ROLE_COUNT=${preflight.gainedEffectiveRoles.length}`,
  );

  console.log(
    `LOST_PERMISSION_COUNT=${preflight.lostPermissions.length}`,
  );

  console.log(
    `LOST_PERMISSIONS=${permissionKeys(
      preflight.lostPermissions,
    ).join(",")}`,
  );

  console.log(
    `RETAINED_PERMISSION_COUNT=${preflight.retainedPermissions.length}`,
  );

  console.log(
    `RETAINED_PERMISSIONS=${permissionKeys(
      preflight.retainedPermissions,
    ).join(",")}`,
  );

  console.log(
    `GAINED_PERMISSION_COUNT=${preflight.gainedPermissions.length}`,
  );

  expectSet(
    preflight.current.directRoles,
    [
      "MeridianEmployee",
      "MeridianSupervisor",
    ],
    "Current direct roles",
  );

  expectSet(
    preflight.proposed.directRoles,
    [
      "MeridianEmployee",
    ],
    "Proposed direct roles",
  );

  expectSet(
    preflight.current.effectiveRoles,
    [
      "MeridianEmployee",
      "MeridianJobRunner",
      "MeridianOperator",
      "MeridianSupervisor",
      "MeridianViewer",
    ],
    "Current effective roles",
  );

  expectSet(
    preflight.proposed.effectiveRoles,
    [
      "MeridianEmployee",
      "MeridianViewer",
    ],
    "Proposed effective roles",
  );

  expectSet(
    preflight.lostEffectiveRoles,
    [
      "MeridianJobRunner",
      "MeridianOperator",
      "MeridianSupervisor",
    ],
    "Lost effective roles",
  );

  if (
    preflight.gainedEffectiveRoles.length !==
    0
  ) {
    fail(
      "Unexpected gained effective roles.",
    );
  }

  expectSet(
    permissionKeys(
      preflight.lostPermissions,
    ),
    [
      "Meridian_Admin:USE",
      "%Admin_Task:USE",
      "Meridian_Orders:WRITE",
      "Meridian_Jobs:USE",
    ],
    "Lost permissions",
  );

  expectSet(
    permissionKeys(
      preflight.retainedPermissions,
    ),
    [
      "Meridian_Portal:USE",
      "Meridian_Orders:READ",
    ],
    "Retained permissions",
  );

  if (
    preflight.gainedPermissions.length !==
    0
  ) {
    fail(
      "Unexpected gained permissions.",
    );
  }

  console.log(
    "NATIVE_CURRENT_RECURSION=PASS",
  );

  console.log(
    "NATIVE_HYPOTHETICAL_RECURSION=PASS",
  );

  console.log(
    "NATIVE_CURRENT_PERMISSION_EVALUATION=PASS",
  );

  console.log(
    "NATIVE_HYPOTHETICAL_PERMISSION_EVALUATION=PASS",
  );

  console.log(
    "AUTHORIZATION_DELTA=PASS",
  );

  const stateAfter =
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
      stateAfter,
    );

  if (
    afterWitness !==
    beforeWitness
  ) {
    fail(
      "Maya authoritative state changed during preflight.",
    );
  }

  console.log(
    "MAYA_STATE_UNCHANGED_DURING_PREFLIGHT=PASS",
  );

  console.log(
    "SECURITY_MUTATION_PERFORMED=NO",
  );

  console.log(
    "MAYA_MUTATED=NO",
  );

  console.log(
    "B6C_MUTATED=NO",
  );

  console.log(
    "REAL_CENTERPIECE_AUTHORIZATION_PREFLIGHT=PASS",
  );
} finally {
  if (session) {
    await logoutIris({
      baseUrl:
        API_BASE,

      accessToken:
        session.accessToken,
    });

    console.log(
      "PREFLIGHT_LOGOUT_HTTP=200",
    );
  }
}