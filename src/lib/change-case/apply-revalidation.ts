import {
  readyDigestForFutureApply,
  type ReadyReviewedPreflight,
  type ReviewablePreflightForReady,
} from "./ready-preflight";

export const APPLY_REVALIDATION_MATCH =
  "MATCH" as const;

export const APPLY_REVALIDATION_STALE =
  "STALE" as const;

export const FRESH_DIGEST_MATCH_REASON =
  "FRESH_PREFLIGHT_DIGEST_MATCH" as const;

export const FRESH_DIGEST_MISMATCH_REASON =
  "FRESH_PREFLIGHT_DIGEST_MISMATCH" as const;

interface ApplyTimeRevalidationBase {
  readonly sourceState:
    "READY";

  readonly freshPreflightState:
    "PREFLIGHTED";

  readonly reviewedDigest:
    string;

  readonly freshDigest:
    string;

  readonly mutationAttempted:
    false;

  readonly mutationCount:
    0;
}

export interface ApplyTimeRevalidationMatch
  extends ApplyTimeRevalidationBase {
  readonly state:
    "READY";

  readonly outcome:
    typeof APPLY_REVALIDATION_MATCH;

  readonly reason:
    typeof FRESH_DIGEST_MATCH_REASON;

  readonly digestMatch:
    true;

  readonly mayProceedToMutationBoundary:
    true;
}

export interface ApplyTimeRevalidationStale
  extends ApplyTimeRevalidationBase {
  readonly state:
    "STALE";

  readonly outcome:
    typeof APPLY_REVALIDATION_STALE;

  readonly reason:
    typeof FRESH_DIGEST_MISMATCH_REASON;

  readonly digestMatch:
    false;

  readonly mayProceedToMutationBoundary:
    false;
}

export type ApplyTimeRevalidationDecision =
  | ApplyTimeRevalidationMatch
  | ApplyTimeRevalidationStale;

function assertSha256(
  value:
    string,

  label:
    string,
): void {
  if (
    !/^[A-F0-9]{64}$/.test(
      value,
    )
  ) {
    throw new Error(
      `${label} must be an uppercase SHA-256.`,
    );
  }
}

function sameChangeIdentity(
  ready:
    ReadyReviewedPreflight,

  fresh:
    ReviewablePreflightForReady,
): boolean {
  return (
    ready.change.username ===
      fresh.canonical.change.username &&
    ready.change.operation ===
      fresh.canonical.change.operation &&
    ready.change.role ===
      fresh.canonical.change.role
  );
}

/**
 * Pure apply-time revalidation gate.
 *
 * This function decides whether the already-reviewed READY digest still
 * matches a freshly recomputed authoritative PREFLIGHTED digest.
 *
 * It performs no mutation.
 */
export function revalidateReadyForApply(
  input: {
    readonly ready:
      ReadyReviewedPreflight;

    readonly freshPreflight:
      ReviewablePreflightForReady;
  },
): ApplyTimeRevalidationDecision {
  const reviewedDigest =
    readyDigestForFutureApply(
      input.ready,
    );

  if (
    input.freshPreflight.state !==
      "PREFLIGHTED"
  ) {
    throw new Error(
      "Apply-time revalidation requires a fresh PREFLIGHTED result.",
    );
  }

  if (
    input.freshPreflight.digestAlgorithm !==
      "SHA-256"
  ) {
    throw new Error(
      "Fresh apply-time preflight must use SHA-256.",
    );
  }

  assertSha256(
    input.freshPreflight.digest,
    "Fresh preflight digest",
  );

  if (
    input.freshPreflight.canonical.schemaVersion !==
      input.ready.canonicalSchema
  ) {
    throw new Error(
      "Fresh preflight canonical schema does not match READY.",
    );
  }

  if (
    !sameChangeIdentity(
      input.ready,
      input.freshPreflight,
    )
  ) {
    throw new Error(
      "Fresh preflight change identity does not match READY.",
    );
  }

  const freshDigest =
    input.freshPreflight.digest;

  if (
    freshDigest !==
      reviewedDigest
  ) {
    const stale:
      ApplyTimeRevalidationStale = {
        state:
          "STALE",

        sourceState:
          "READY",

        freshPreflightState:
          "PREFLIGHTED",

        outcome:
          APPLY_REVALIDATION_STALE,

        reason:
          FRESH_DIGEST_MISMATCH_REASON,

        reviewedDigest,

        freshDigest,

        digestMatch:
          false,

        mayProceedToMutationBoundary:
          false,

        mutationAttempted:
          false,

        mutationCount:
          0,
      };

    return Object.freeze(
      stale,
    );
  }

  const matched:
    ApplyTimeRevalidationMatch = {
      state:
        "READY",

      sourceState:
        "READY",

      freshPreflightState:
        "PREFLIGHTED",

      outcome:
        APPLY_REVALIDATION_MATCH,

      reason:
        FRESH_DIGEST_MATCH_REASON,

      reviewedDigest,

      freshDigest,

      digestMatch:
        true,

      mayProceedToMutationBoundary:
        true,

      mutationAttempted:
        false,

      mutationCount:
        0,
    };

  return Object.freeze(
    matched,
  );
}