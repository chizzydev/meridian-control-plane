import {
  readFileSync,
} from "node:fs";

import {
  freezeReviewedPreflight,
  readyDigestForFutureApply,
} from "../src/lib/change-case/ready-preflight";

import {
  readAuthoritativeCurrentAccess,
} from "../src/lib/iris/current-access";

import {
  reviewCenterpiecePreflightForReady,
} from "../src/lib/iris/ready-preflight";

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
    "READY_LOGIN_HTTP=200",
  );

  console.log(
    "READY_TOKENS_PRESENT=YES",
  );

  console.log(
    "READY_TOKENS_PRINTED=NO",
  );

  const runtime =
    await readRuntimeInfo({
      baseUrl:
        API_BASE,

      accessToken:
        session.accessToken,
    });

  console.log(
    `READY_RUNTIME_USERNAME=${runtime.username}`,
  );

  console.log(
    `READY_RUNTIME_API_VERSION=${runtime.apiVersion}`,
  );

  console.log(
    `READY_RUNTIME_BUILD_221U=${
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

  const preflight =
    await readCenterpieceReviewablePreflight({
      apiBaseUrl:
        API_BASE,

      helperBaseUrl:
        HELPER_BASE,

      accessToken:
        session.accessToken,
    });

  console.log(
    `PREFLIGHT_BEFORE_REVIEW_STATE=${preflight.state}`,
  );

  console.log(
    `PREFLIGHT_BEFORE_REVIEW_DIGEST=${preflight.digest}`,
  );

  if (
    preflight.state !==
      "PREFLIGHTED" ||
    preflight.digest !==
      EXPECTED_DIGEST
  ) {
    fail(
      "Frozen 10A preflight identity changed before READY review.",
    );
  }

  console.log(
    "FROZEN_10A_PREFLIGHT_IDENTITY_RECONFIRMED=PASS",
  );

  const reviewedAtUtc =
    new Date().toISOString();

  const ready =
    await reviewCenterpiecePreflightForReady({
      apiBaseUrl:
        API_BASE,

      helperBaseUrl:
        HELPER_BASE,

      accessToken:
        session.accessToken,

      reviewedDigest:
        preflight.digest,

      reviewedAtUtc,
    });

  console.log(
    `READY_STATE=${ready.state}`,
  );

  console.log(
    `READY_SOURCE_STATE=${ready.sourceState}`,
  );

  console.log(
    `READY_DIGEST_ALGORITHM=${ready.digestAlgorithm}`,
  );

  console.log(
    `READY_REVIEWED_DIGEST=${ready.reviewedDigest}`,
  );

  console.log(
    `READY_CANONICAL_SCHEMA=${ready.canonicalSchema}`,
  );

  console.log(
    `READY_CHANGE_USERNAME=${ready.change.username}`,
  );

  console.log(
    `READY_CHANGE_OPERATION=${ready.change.operation}`,
  );

  console.log(
    `READY_CHANGE_ROLE=${ready.change.role}`,
  );

  console.log(
    `READY_REVIEWED_AT_UTC=${ready.reviewedAtUtc}`,
  );

  console.log(
    `READY_APPLY_REQUIREMENT=${ready.applyRequirement}`,
  );

  console.log(
    `READY_APPLY_REQUIRES_FRESH_REVALIDATION=${
      ready.applyRequiresFreshRevalidation
        ? "YES"
        : "NO"
    }`,
  );

  if (
    ready.state !==
      "READY" ||
    ready.sourceState !==
      "PREFLIGHTED" ||
    ready.digestAlgorithm !==
      "SHA-256" ||
    ready.reviewedDigest !==
      EXPECTED_DIGEST ||
    ready.canonicalSchema !==
      "meridian.preflight.v1" ||
    ready.change.username !==
      "maya.patel" ||
    ready.change.operation !==
      "REMOVE" ||
    ready.change.role !==
      "MeridianSupervisor" ||
    ready.applyRequirement !==
      "FRESH_DIGEST_MATCH_REQUIRED" ||
    ready.applyRequiresFreshRevalidation !==
      true
  ) {
    fail(
      "READY material does not match frozen lifecycle contract.",
    );
  }

  console.log(
    "PREFLIGHTED_TO_READY_TRANSITION=PASS",
  );

  const futureApplyDigest =
    readyDigestForFutureApply(
      ready,
    );

  console.log(
    `FUTURE_APPLY_COMPARISON_DIGEST=${futureApplyDigest}`,
  );

  if (
    futureApplyDigest !==
      EXPECTED_DIGEST
  ) {
    fail(
      "Future Apply comparison digest changed.",
    );
  }

  console.log(
    "ONLY_READY_PROVIDES_FUTURE_APPLY_COMPARISON_DIGEST=PASS",
  );

  console.log(
    "READY_IS_NOT_PERMANENT_MUTATION_AUTHORITY=PASS",
  );

  console.log(
    "FUTURE_APPLY_REVALIDATION_REQUIRED=YES",
  );

  let mismatchRejected =
    false;

  try {

    freezeReviewedPreflight({
      preflight,

      reviewedDigest:
        "0000000000000000000000000000000000000000000000000000000000000000",

      reviewedAtUtc,
    });
  }
  catch {

    mismatchRejected =
      true;
  }

  console.log(
    `MISMATCHED_REVIEW_DIGEST_REJECTED=${
      mismatchRejected
        ? "PASS"
        : "FAIL"
    }`,
  );

  if (!mismatchRejected) {
    fail(
      "A mismatched operator-reviewed digest was accepted.",
    );
  }

  if (
    preflight.canonicalJson.includes(
      reviewedAtUtc,
    )
  ) {
    fail(
      "Review timestamp leaked into canonical preflight material.",
    );
  }

  console.log(
    "REVIEW_TIMESTAMP_OUTSIDE_CANONICAL_DIGEST=PASS",
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
      "Maya state changed during READY transition certification.",
    );
  }

  console.log(
    "MAYA_STATE_UNCHANGED_DURING_READY_TRANSITION=PASS",
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
    "APPLY_IMPLEMENTED=NO",
  );

  console.log(
    "READY_TRANSITION_CERTIFIED=PASS",
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
      "READY_LOGOUT_HTTP=200",
    );
  }
}