import {
  revalidateReadyForApply,
  type ApplyTimeRevalidationDecision,
} from "@/lib/change-case/apply-revalidation";

import {
  type ReadyReviewedPreflight,
} from "@/lib/change-case/ready-preflight";

import {
  readCenterpieceReviewablePreflight,
} from "./reviewable-preflight";

export interface CenterpieceApplyTimeRevalidation {
  readonly freshPreflight:
    Awaited<
      ReturnType<
        typeof readCenterpieceReviewablePreflight
      >
    >;

  readonly decision:
    ApplyTimeRevalidationDecision;
}

/**
 * Recomputes the full authoritative preflight immediately at the future
 * Apply boundary, then compares that fresh digest to READY.
 *
 * This checkpoint intentionally has no mutation executor.
 */
export async function revalidateCenterpieceReadyForApply(
  input: {
    readonly apiBaseUrl:
      string;

    readonly helperBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly ready:
      ReadyReviewedPreflight;
  },
): Promise<
  CenterpieceApplyTimeRevalidation
> {
  const freshPreflight =
    await readCenterpieceReviewablePreflight({
      apiBaseUrl:
        input.apiBaseUrl,

      helperBaseUrl:
        input.helperBaseUrl,

      accessToken:
        input.accessToken,
    });

  const decision =
    revalidateReadyForApply({
      ready:
        input.ready,

      freshPreflight,
    });

  return {
    freshPreflight,
    decision,
  };
}