import {
  readFileSync,
} from "node:fs";

import {
  CENTERPIECE_CHANGE,
} from "../src/lib/change-case/domain";

import {
  classifyPreflightReadFoundation,
} from "../src/lib/change-case/preflight-read";

import {
  readAuthoritativeCurrentAccess,
} from "../src/lib/iris/current-access";

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

function expectArray(
  actual: readonly string[],
  expected: readonly string[],
  label: string,
): void {
  if (
    actual.length !==
      expected.length ||
    actual.some(
      (value, index) =>
        value !==
        expected[index],
    )
  ) {
    fail(
      `${label} mismatch: ${actual.join(",")}`,
    );
  }
}

const secretText =
  readFileSync(
    0,
    "utf8",
  );

const secret =
  JSON.parse(
    secretText,
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
    "LOGIN_HTTP=200",
  );

  console.log(
    "ACCESS_TOKEN_PRESENT=YES",
  );

  console.log(
    "REFRESH_TOKEN_PRESENT=YES",
  );

  console.log(
    "TOKENS_PRINTED=NO",
  );

  const runtime =
    await readRuntimeInfo({
      baseUrl:
        API_BASE,
      accessToken:
        session.accessToken,
    });

  console.log(
    `INFO_USERNAME=${runtime.username}`,
  );

  console.log(
    `INFO_API_VERSION=${runtime.apiVersion}`,
  );

  console.log(
    `INFO_BUILD_221U=${
      runtime.serverVersion.includes(
        "Build 221U",
      )
        ? "YES"
        : "NO"
    }`,
  );

  if (
    runtime.username !==
    RUNTIME_USER
  ) {
    fail(
      "Authenticated runtime identity mismatch.",
    );
  }

  if (
    runtime.apiVersion !==
    2
  ) {
    fail(
      "Unexpected SysAdmin API version.",
    );
  }

  if (
    !runtime.serverVersion.includes(
      "2026.2",
    ) ||
    !runtime.serverVersion.includes(
      "Build 221U",
    )
  ) {
    fail(
      "Pinned IRIS runtime mismatch.",
    );
  }

  const current =
    await readAuthoritativeCurrentAccess({
      apiBaseUrl:
        API_BASE,
      helperBaseUrl:
        HELPER_BASE,
      accessToken:
        session.accessToken,
      username:
        CENTERPIECE_CHANGE.username,
    });

  console.log(
    `MAYA_USERNAME=${current.username}`,
  );

  console.log(
    `MAYA_DISPLAY_NAME=${current.displayName}`,
  );

  console.log(
    `MAYA_ENABLED=${current.enabled}`,
  );

  console.log(
    `MAYA_NAMESPACE=${current.namespace}`,
  );

  console.log(
    `MAYA_DIRECT_ROLES=${current.directRoles.join(",")}`,
  );

  console.log(
    `MAYA_EFFECTIVE_ROLES=${current.effectiveRoles.join(",")}`,
  );

  if (
    current.username !==
    "maya.patel"
  ) {
    fail(
      "Unexpected target user.",
    );
  }

  if (
    current.displayName !==
    "Maya Patel"
  ) {
    fail(
      "Unexpected Maya display name.",
    );
  }

  if (
    current.enabled !==
    true
  ) {
    fail(
      "Maya is unexpectedly disabled.",
    );
  }

  if (
    current.namespace !==
    "USER"
  ) {
    fail(
      "Maya namespace mismatch.",
    );
  }

  expectArray(
    current.directRoles,
    [
      "MeridianEmployee",
    ],
    "Maya direct roles",
  );

  expectArray(
    current.effectiveRoles,
    [
      "MeridianEmployee",
      "MeridianViewer",
    ],
    "Maya effective roles",
  );

  const permissionMap =
    new Map(
      current.permissions.map(
        (entry) => [
          `${entry.resource}:${entry.permission}`,
          entry.allowed,
        ],
      ),
    );

  const expectedPermissions =
    [
      [
        "Meridian_Portal:USE",
        true,
      ],
      [
        "Meridian_Orders:READ",
        true,
      ],
      [
        "Meridian_Orders:WRITE",
        false,
      ],
      [
        "Meridian_Admin:USE",
        false,
      ],
      [
        "Meridian_Jobs:USE",
        false,
      ],
      [
        "%Admin_Task:USE",
        false,
      ],
    ] as const;

  for (
    const [
      key,
      expected,
    ]
    of expectedPermissions
  ) {
    const actual =
      permissionMap.get(
        key,
      );

    console.log(
      `PERMISSION_${key.replace(
        /[^A-Za-z0-9]+/g,
        "_",
      )}=${actual ? 1 : 0}`,
    );

    if (
      actual !==
      expected
    ) {
      fail(
        `Permission mismatch for ${key}.`,
      );
    }
  }

  console.log(
    "NATIVE_PERMISSION_AFTER_STATE=PASS",
  );

  const foundation =
    classifyPreflightReadFoundation({
      change:
        CENTERPIECE_CHANGE,
      current,
    });

  console.log(
    `TARGET_ROLE_PRESENT=${foundation.targetRolePresent ? 1 : 0}`,
  );

  console.log(
    `PREFLIGHT_READ_STATUS=${foundation.status}`,
  );

  console.log(
    `REQUIRES_DEMO_RESET=${foundation.requiresDemoReset ? 1 : 0}`,
  );

  if (
    foundation.targetRolePresent
  ) {
    fail(
      "Expected current post-B6C state to lack MeridianSupervisor.",
    );
  }

  if (
    foundation.status !==
    "BASELINE_NOT_READY"
  ) {
    fail(
      "Product should block centerpiece preflight until demo baseline is reset.",
    );
  }

  if (
    !foundation.requiresDemoReset
  ) {
    fail(
      "Demo reset requirement was not surfaced.",
    );
  }

  console.log(
    "AUTHORITATIVE_CURRENT_READ=PASS",
  );

  console.log(
    "NATIVE_RECURSION_READ=PASS",
  );

  console.log(
    "CENTERPIECE_BASELINE_CLASSIFICATION=PASS",
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
} finally {
  if (session) {
    try {
      await logoutIris({
        baseUrl:
          API_BASE,
        accessToken:
          session.accessToken,
      });

      console.log(
        "LOGOUT_HTTP=200",
      );
    } catch {
      console.log(
        "LOGOUT_HTTP=UNCONFIRMED",
      );

      throw new Error(
        "IRIS logout failed.",
      );
    }
  }
}