import {
  freezeReviewedPreflight,
  type ReadyReviewedPreflight,
} from "@/lib/change-case/ready-preflight";

import {
  readCenterpieceReviewablePreflight,
} from "./reviewable-preflight";

/**
 * Re-reads the authoritative PREFLIGHTED material at review time and freezes
 * READY only when the digest the operator says they reviewed is still exactly
 * the digest produced by the server.
 *
 * This performs no IRIS mutation.
 */
export async function reviewCenterpiecePreflightForReady(
  input: {
    readonly apiBaseUrl:
      string;

    readonly helperBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly reviewedDigest:
      string;

    readonly reviewedAtUtc:
      string;
  },
): Promise<
  ReadyReviewedPreflight
> {
  const preflight =
    await readCenterpieceReviewablePreflight({
      apiBaseUrl:
        input.apiBaseUrl,

      helperBaseUrl:
        input.helperBaseUrl,

      accessToken:
        input.accessToken,
    });

  return freezeReviewedPreflight({
    preflight,

    reviewedDigest:
      input.reviewedDigest,

    reviewedAtUtc:
      input.reviewedAtUtc,
  });
}