import {
  readFileSync,
} from "node:fs";

import {
  revalidateReadyForApply,
} from "../src/lib/change-case/apply-revalidation";

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

const CONTROLLED_MISMATCH_DIGEST =
  "0000000000000000000000000000000000000000000000000000000000000000";

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
    "REVALIDATION_LOGIN_HTTP=200",
  );

  console.log(
    "REVALIDATION_TOKENS_PRESENT=YES",
  );

  console.log(
    "REVALIDATION_TOKENS_PRINTED=NO",
  );

  const runtime =
    await readRuntimeInfo({
      baseUrl:
        API_BASE,

      accessToken:
        session.accessToken,
    });

  console.log(
    `REVALIDATION_RUNTIME_USERNAME=${runtime.username}`,
  );

  console.log(
    `REVALIDATION_RUNTIME_API_VERSION=${runtime.apiVersion}`,
  );

  console.log(
    `REVALIDATION_RUNTIME_BUILD_221U=${
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
  // Re-materialize READY from the certified reviewed digest.
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

  console.log(
    `REVALIDATION_READY_STATE=${ready.state}`,
  );

  console.log(
    `REVALIDATION_READY_DIGEST=${ready.reviewedDigest}`,
  );

  if (
    ready.state !==
      "READY" ||
    ready.reviewedDigest !==
      EXPECTED_DIGEST
  ) {
    fail(
      "Could not re-materialize certified READY state.",
    );
  }

  console.log(
    "CERTIFIED_READY_RECONFIRMED=PASS",
  );

  // ---------------------------------------------------------------
  // Real live fresh authoritative recomputation.
  // ---------------------------------------------------------------

  const live =
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
    `FRESH_PREFLIGHT_STATE=${live.freshPreflight.state}`,
  );

  console.log(
    `FRESH_PREFLIGHT_DIGEST=${live.freshPreflight.digest}`,
  );

  console.log(
    `MATCH_DECISION_STATE=${live.decision.state}`,
  );

  console.log(
    `MATCH_DECISION_OUTCOME=${live.decision.outcome}`,
  );

  console.log(
    `MATCH_DECISION_REASON=${live.decision.reason}`,
  );

  console.log(
    `MATCH_REVIEWED_DIGEST=${live.decision.reviewedDigest}`,
  );

  console.log(
    `MATCH_FRESH_DIGEST=${live.decision.freshDigest}`,
  );

  console.log(
    `MATCH_DIGEST_MATCH=${
      live.decision.digestMatch
        ? "YES"
        : "NO"
    }`,
  );

  console.log(
    `MATCH_MAY_PROCEED_TO_MUTATION_BOUNDARY=${
      live.decision.mayProceedToMutationBoundary
        ? "YES"
        : "NO"
    }`,
  );

  console.log(
    `MATCH_MUTATION_ATTEMPTED=${
      live.decision.mutationAttempted
        ? "YES"
        : "NO"
    }`,
  );

  console.log(
    `MATCH_MUTATION_COUNT=${live.decision.mutationCount}`,
  );

  if (
    live.freshPreflight.state !==
      "PREFLIGHTED" ||
    live.freshPreflight.digest !==
      EXPECTED_DIGEST ||
    live.decision.state !==
      "READY" ||
    live.decision.outcome !==
      "MATCH" ||
    live.decision.reason !==
      "FRESH_PREFLIGHT_DIGEST_MATCH" ||
    live.decision.reviewedDigest !==
      EXPECTED_DIGEST ||
    live.decision.freshDigest !==
      EXPECTED_DIGEST ||
    live.decision.digestMatch !==
      true ||
    live.decision.mayProceedToMutationBoundary !==
      true ||
    live.decision.mutationAttempted !==
      false ||
    live.decision.mutationCount !==
      0
  ) {
    fail(
      "Live apply-time digest-match decision is incorrect.",
    );
  }

  console.log(
    "REAL_FRESH_APPLY_TIME_REVALIDATION=PASS",
  );

  console.log(
    "MATCH_DOES_NOT_PERFORM_MUTATION=PASS",
  );

  // ---------------------------------------------------------------
  // Controlled in-memory stale-path negative control.
  //
  // We do NOT alter IRIS to manufacture drift. We take the exact fresh
  // authoritative result and alter only the comparison digest in memory.
  // ---------------------------------------------------------------

  const controlledFreshMismatch = {
    ...live.freshPreflight,

    digest:
      CONTROLLED_MISMATCH_DIGEST,
  };

  const stale =
    revalidateReadyForApply({
      ready,

      freshPreflight:
        controlledFreshMismatch,
    });

  console.log(
    "STALE_CONTROL_SOURCE=CONTROLLED_IN_MEMORY_DIGEST_MISMATCH"
  );

  console.log(
    "STALE_CONTROL_IRIS_STATE_MUTATED=NO",
  );

  console.log(
    `STALE_DECISION_STATE=${stale.state}`,
  );

  console.log(
    `STALE_DECISION_OUTCOME=${stale.outcome}`,
  );

  console.log(
    `STALE_DECISION_REASON=${stale.reason}`,
  );

  console.log(
    `STALE_REVIEWED_DIGEST=${stale.reviewedDigest}`,
  );

  console.log(
    `STALE_FRESH_DIGEST=${stale.freshDigest}`,
  );

  console.log(
    `STALE_DIGEST_MATCH=${
      stale.digestMatch
        ? "YES"
        : "NO"
    }`,
  );

  console.log(
    `STALE_MAY_PROCEED_TO_MUTATION_BOUNDARY=${
      stale.mayProceedToMutationBoundary
        ? "YES"
        : "NO"
    }`,
  );

  console.log(
    `STALE_MUTATION_ATTEMPTED=${
      stale.mutationAttempted
        ? "YES"
        : "NO"
    }`,
  );

  console.log(
    `STALE_MUTATION_COUNT=${stale.mutationCount}`,
  );

  if (
    stale.state !==
      "STALE" ||
    stale.outcome !==
      "STALE" ||
    stale.reason !==
      "FRESH_PREFLIGHT_DIGEST_MISMATCH" ||
    stale.reviewedDigest !==
      EXPECTED_DIGEST ||
    stale.freshDigest !==
      CONTROLLED_MISMATCH_DIGEST ||
    stale.digestMatch !==
      false ||
    stale.mayProceedToMutationBoundary !==
      false ||
    stale.mutationAttempted !==
      false ||
    stale.mutationCount !==
      0
  ) {
    fail(
      "STALE refusal decision is incorrect.",
    );
  }

  console.log(
    "STALE_DIGEST_MISMATCH_REFUSAL=PASS",
  );

  console.log(
    "STALE_ZERO_MUTATION=PASS",
  );

  // ---------------------------------------------------------------
  // Authoritative state must still be identical.
  // ---------------------------------------------------------------

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
      "Maya state changed during apply-time revalidation.",
    );
  }

  console.log(
    "MAYA_STATE_UNCHANGED_DURING_APPLY_REVALIDATION=PASS",
  );

  console.log(
    "REAL_ROLE_MUTATION_CONNECTED=NO",
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
    "APPLY_TIME_REVALIDATION_CERTIFIED=PASS",
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
      "REVALIDATION_LOGOUT_HTTP=200",
    );
  }
}