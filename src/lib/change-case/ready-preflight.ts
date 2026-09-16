export const READY_CHANGE_CASE_STATE =
  "READY" as const;

export const READY_SOURCE_STATE =
  "PREFLIGHTED" as const;

export const READY_APPLY_REQUIREMENT =
  "FRESH_DIGEST_MATCH_REQUIRED" as const;

export interface ReviewablePreflightForReady {
  readonly state:
    string;

  readonly digestAlgorithm:
    string;

  readonly digest:
    string;

  readonly canonical: {
    readonly schemaVersion:
      string;

    readonly change: {
      readonly username:
        string;

      readonly operation:
        string;

      readonly role:
        string;
    };
  };
}

export interface ReadyReviewedPreflight {
  readonly state:
    typeof READY_CHANGE_CASE_STATE;

  readonly sourceState:
    typeof READY_SOURCE_STATE;

  readonly digestAlgorithm:
    "SHA-256";

  readonly reviewedDigest:
    string;

  readonly canonicalSchema:
    "meridian.preflight.v1";

  readonly change: {
    readonly username:
      string;

    readonly operation:
      string;

    readonly role:
      string;
  };

  readonly reviewedAtUtc:
    string;

  readonly applyRequirement:
    typeof READY_APPLY_REQUIREMENT;

  readonly applyRequiresFreshRevalidation:
    true;
}

function assertSha256(
  value:
    string,
): void {
  if (
    !/^[A-F0-9]{64}$/.test(
      value,
    )
  ) {
    throw new Error(
      "Reviewed preflight digest must be an uppercase SHA-256.",
    );
  }
}

function assertCanonicalUtcTimestamp(
  value:
    string,
): void {
  const parsed =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      parsed.getTime(),
    ) ||
    parsed.toISOString() !==
      value
  ) {
    throw new Error(
      "reviewedAtUtc must be a canonical UTC ISO timestamp.",
    );
  }
}

/**
 * Materializes the already-frozen PREFLIGHTED -> READY lifecycle edge.
 *
 * READY does not execute or authorize a mutation forever. It records the
 * exact digest the operator reviewed. A future Apply service must recompute
 * the authoritative preflight and require a digest match before mutation.
 */
export function freezeReviewedPreflight(
  input: {
    readonly preflight:
      ReviewablePreflightForReady;

    readonly reviewedDigest:
      string;

    readonly reviewedAtUtc:
      string;
  },
): ReadyReviewedPreflight {
  if (
    input.preflight.state !==
      READY_SOURCE_STATE
  ) {
    throw new Error(
      (
        "Only a PREFLIGHTED Change Case may become READY. " +
        `Received ${input.preflight.state}.`
      ),
    );
  }

  if (
    input.preflight.digestAlgorithm !==
      "SHA-256"
  ) {
    throw new Error(
      "READY requires a SHA-256 reviewed preflight.",
    );
  }

  assertSha256(
    input.preflight.digest,
  );

  assertSha256(
    input.reviewedDigest,
  );

  if (
    input.reviewedDigest !==
      input.preflight.digest
  ) {
    throw new Error(
      "Reviewed digest does not match the authoritative PREFLIGHTED digest.",
    );
  }

  if (
    input.preflight.canonical.schemaVersion !==
      "meridian.preflight.v1"
  ) {
    throw new Error(
      "Unsupported canonical preflight schema for READY.",
    );
  }

  assertCanonicalUtcTimestamp(
    input.reviewedAtUtc,
  );

  const change =
    Object.freeze({
      username:
        input.preflight.canonical.change.username,

      operation:
        input.preflight.canonical.change.operation,

      role:
        input.preflight.canonical.change.role,
    });

  return Object.freeze({
    state:
      READY_CHANGE_CASE_STATE,

    sourceState:
      READY_SOURCE_STATE,

    digestAlgorithm:
      "SHA-256" as const,

    reviewedDigest:
      input.reviewedDigest,

    canonicalSchema:
      "meridian.preflight.v1" as const,

    change,

    reviewedAtUtc:
      input.reviewedAtUtc,

    applyRequirement:
      READY_APPLY_REQUIREMENT,

    applyRequiresFreshRevalidation:
      true as const,
  });
}

/**
 * Future Apply may obtain its comparison target only from READY.
 *
 * This returns comparison authority, not mutation authority. The caller must
 * still recompute the authoritative preflight and compare fresh digest ==
 * reviewed digest before any supported IRIS mutation is invoked.
 */
export function readyDigestForFutureApply(
  input: {
    readonly state:
      string;

    readonly reviewedDigest?:
      string;

    readonly applyRequiresFreshRevalidation?:
      boolean;
  },
): string {
  if (
    input.state !==
      READY_CHANGE_CASE_STATE
  ) {
    throw new Error(
      "Only READY may provide the reviewed digest for future Apply.",
    );
  }

  if (
    input.applyRequiresFreshRevalidation !==
      true
  ) {
    throw new Error(
      "READY must require fresh apply-time digest revalidation.",
    );
  }

  if (
    typeof input.reviewedDigest !==
      "string"
  ) {
    throw new Error(
      "READY reviewed digest is missing.",
    );
  }

  assertSha256(
    input.reviewedDigest,
  );

  return input.reviewedDigest;
}