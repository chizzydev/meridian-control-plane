import {
  readFileSync,
} from "node:fs";

import {
  readAuthoritativeCurrentAccess,
} from "../src/lib/iris/current-access";

import {
  revalidateCenterpieceReadyForApply,
  type CenterpieceApplyTimeRevalidation,
} from "../src/lib/iris/apply-revalidation";

import {
  executeCenterpieceRoleMutation,
} from "../src/lib/iris/role-mutation-executor";

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

const CONTROLLED_STALE_DIGEST =
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
    "EXECUTOR_LOGIN_HTTP=200",
  );

  console.log(
    "EXECUTOR_TOKENS_PRESENT=YES",
  );

  console.log(
    "EXECUTOR_TOKENS_PRINTED=NO",
  );

  const runtime =
    await readRuntimeInfo({
      baseUrl:
        API_BASE,

      accessToken:
        session.accessToken,
    });

  console.log(
    `EXECUTOR_RUNTIME_USERNAME=${runtime.username}`,
  );

  console.log(
    `EXECUTOR_RUNTIME_API_VERSION=${runtime.apiVersion}`,
  );

  console.log(
    `EXECUTOR_RUNTIME_BUILD_221U=${
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

  if (
    ready.state !==
      "READY" ||
    ready.reviewedDigest !==
      EXPECTED_DIGEST
  ) {
    fail(
      "Could not materialize certified READY state.",
    );
  }

  console.log(
    "EXECUTOR_READY_RECONFIRMED=PASS",
  );

  // ---------------------------------------------------------------
  // MATCH PATH:
  // real live fresh 10C revalidation
  // synthetic in-process fetch implementation
  // absolutely no request is sent to the live POST endpoint.
  // ---------------------------------------------------------------

  let syntheticFetchCount =
    0;

  let syntheticUrl =
    "";

  let syntheticMethod =
    "";

  let syntheticBodyPresent =
    false;

  let syntheticAuthorizationPresent =
    false;

  const syntheticFetch:
    typeof fetch =
      async (
        resource,
        init,
      ) => {
        syntheticFetchCount +=
          1;

        syntheticUrl =
          String(
            resource,
          );

        syntheticMethod =
          init?.method ??
          "";

        syntheticBodyPresent =
          init?.body !==
            undefined &&
          init?.body !==
            null;

        const authorization =
          new Headers(
            init?.headers,
          ).get(
            "Authorization",
          );

        syntheticAuthorizationPresent =
          typeof authorization ===
            "string" &&
          authorization.startsWith(
            "Bearer ",
          );

        return new Response(
          JSON.stringify({
            designVersion:
              "centerpiece-remove-v1",

            operation:
              "REMOVE",

            target:
              "maya.patel",

            role:
              "MeridianSupervisor",

            actor:
              "synthetic-10f-certifier",

            applyPid:
              "SYNTHETIC",

            applyTimestamp:
              "2026-09-16T00:00:00Z",

            beforeRoles:
              "MeridianEmployee,MeridianSupervisor",

            statusOK:
              1,

            postReadOK:
              1,

            afterRoles:
              "MeridianEmployee",

            ok:
              1,
          }),
          {
            status:
              200,

            headers: {
              "Content-Type":
                "application/json",
            },
          },
        );
      };

  const simulated =
    await executeCenterpieceRoleMutation(
      {
        apiBaseUrl:
          API_BASE,

        helperBaseUrl:
          HELPER_BASE,

        accessToken:
          session.accessToken,

        ready,
      },
      {
        fetchImpl:
          syntheticFetch,
      },
    );

  console.log(
    "EXECUTOR_MATCH_REVALIDATION_SOURCE=LIVE_IRIS",
  );

  console.log(
    "EXECUTOR_POST_TRANSPORT=SYNTHETIC_IN_PROCESS",
  );

  console.log(
    `SYNTHETIC_FETCH_COUNT=${syntheticFetchCount}`,
  );

  console.log(
    `SYNTHETIC_POST_URL=${syntheticUrl}`,
  );

  console.log(
    `SYNTHETIC_POST_METHOD=${syntheticMethod}`,
  );

  console.log(
    `SYNTHETIC_POST_BODY_PRESENT=${
      syntheticBodyPresent
        ? "YES"
        : "NO"
    }`,
  );

  console.log(
    `SYNTHETIC_AUTHORIZATION_HEADER_PRESENT=${
      syntheticAuthorizationPresent
        ? "YES"
        : "NO"
    }`,
  );

  console.log(
    `SIMULATED_EXECUTION_STATE=${simulated.state}`,
  );

  if (
    syntheticFetchCount !==
      1 ||
    syntheticUrl !==
      (
        HELPER_BASE +
        "/apply/remove-centerpiece-role"
      ) ||
    syntheticMethod !==
      "POST" ||
    syntheticBodyPresent !==
      false ||
    !syntheticAuthorizationPresent ||
    simulated.state !==
      "APPLIED"
  ) {
    fail(
      "Synthetic executor MATCH path failed.",
    );
  }

  if (
    simulated.state !==
      "APPLIED"
  ) {
    fail(
      "Synthetic execution did not classify APPLIED.",
    );
  }

  console.log(
    `SIMULATED_CONFIGURATION_VERIFIED=${
      simulated.configurationVerified
        ? "YES"
        : "NO"
    }`,
  );

  console.log(
    `SIMULATED_CONVERGENCE_REQUIRED=${
      simulated.convergenceRequired
        ? "YES"
        : "NO"
    }`,
  );

  console.log(
    `SIMULATED_AUDIT_BINDING_REQUIRED=${
      simulated.auditBindingRequired
        ? "YES"
        : "NO"
    }`,
  );

  console.log(
    `SIMULATED_VERIFIED=${
      simulated.verified
        ? "YES"
        : "NO"
    }`,
  );

  if (
    simulated.configurationVerified !==
      true ||
    simulated.convergenceRequired !==
      true ||
    simulated.auditBindingRequired !==
      true ||
    simulated.verified !==
      false
  ) {
    fail(
      "Executor incorrectly collapsed configuration completion into VERIFIED.",
    );
  }

  console.log(
    "SYNTHETIC_MATCH_EXECUTOR_CERTIFIED=PASS",
  );

  // ---------------------------------------------------------------
  // CONTROLLED STALE PATH:
  // obtain a genuine current live revalidation, then replace only the
  // comparison digest in memory and inject that controlled result.
  // The executor must return STALE before syntheticFetch is touched.
  // ---------------------------------------------------------------

  const current =
    await revalidateCenterpieceReadyForApply({
      apiBaseUrl:
        API_BASE,

      helperBaseUrl:
        HELPER_BASE,

      accessToken:
        session.accessToken,

      ready,
    });

  if (
    current.decision.state !==
      "READY" ||
    current.freshPreflight.digest !==
      EXPECTED_DIGEST
  ) {
    fail(
      "Current live state stopped matching before stale control.",
    );
  }

  const controlledStale:
    CenterpieceApplyTimeRevalidation = {
      freshPreflight: {
        ...current.freshPreflight,

        digest:
          CONTROLLED_STALE_DIGEST,
      },

      decision: {
        state:
          "STALE",

        sourceState:
          "READY",

        freshPreflightState:
          "PREFLIGHTED",

        outcome:
          "STALE",

        reason:
          "FRESH_PREFLIGHT_DIGEST_MISMATCH",

        reviewedDigest:
          EXPECTED_DIGEST,

        freshDigest:
          CONTROLLED_STALE_DIGEST,

        digestMatch:
          false,

        mayProceedToMutationBoundary:
          false,

        mutationAttempted:
          false,

        mutationCount:
          0,
      },
    };

  let staleFetchCount =
    0;

  const staleResult =
    await executeCenterpieceRoleMutation(
      {
        apiBaseUrl:
          API_BASE,

        helperBaseUrl:
          HELPER_BASE,

        accessToken:
          session.accessToken,

        ready,
      },
      {
        revalidate:
          async () =>
            controlledStale,

        fetchImpl:
          (async () => {
            staleFetchCount +=
              1;

            throw new Error(
              "STALE must never reach transport",
            );
          }) as typeof fetch,
      },
    );

  console.log(
    "EXECUTOR_STALE_CONTROL=CONTROLLED_IN_MEMORY_DIGEST_MISMATCH",
  );

  console.log(
    `STALE_EXECUTOR_STATE=${staleResult.state}`,
  );

  console.log(
    `STALE_EXECUTOR_FETCH_COUNT=${staleFetchCount}`,
  );

  console.log(
    `STALE_EXECUTOR_MUTATION_REQUEST_SENT=${
      staleResult.mutationRequestSent
        ? "YES"
        : "NO"
    }`,
  );

  console.log(
    `STALE_EXECUTOR_CONFIRMED_SECURITY_MUTATION_COUNT=${staleResult.confirmedSecurityMutationCount}`,
  );

  if (
    staleResult.state !==
      "STALE" ||
    staleFetchCount !==
      0 ||
    staleResult.mutationRequestSent !==
      false ||
    staleResult.confirmedSecurityMutationCount !==
      0
  ) {
    fail(
      "Executor failed stale-before-POST safety.",
    );
  }

  console.log(
    "STALE_BEFORE_POST_REFUSAL=PASS",
  );

  // ---------------------------------------------------------------
  // Real Maya state must remain exactly unchanged.
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
      "Maya changed during 10F executor certification.",
    );
  }

  console.log(
    "MAYA_STATE_UNCHANGED_DURING_EXECUTOR_CERTIFICATION=PASS",
  );

  console.log(
    "LIVE_MUTATION_ENDPOINT_REQUEST_COUNT=0",
  );

  console.log(
    "LIVE_POST_TO_MUTATION_ENDPOINT_PERFORMED=NO",
  );

  console.log(
    "SECURITY_USERS_REMOVEROLES_INVOKED_BY_10F=NO",
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
    "PRODUCT_MUTATION_EXECUTOR_CERTIFIED=PASS",
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
      "EXECUTOR_LOGOUT_HTTP=200",
    );
  }
}