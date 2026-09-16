import {
  describe,
  expect,
  it,
} from "vitest";

import {
  revalidateReadyForApply,
} from "./apply-revalidation";

import {
  type ReadyReviewedPreflight,
  type ReviewablePreflightForReady,
} from "./ready-preflight";

const REVIEWED_DIGEST =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

const CHANGED_DIGEST =
  "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";

function ready():
  ReadyReviewedPreflight {
  return {
    state:
      "READY",

    sourceState:
      "PREFLIGHTED",

    digestAlgorithm:
      "SHA-256",

    reviewedDigest:
      REVIEWED_DIGEST,

    canonicalSchema:
      "meridian.preflight.v1",

    change: {
      username:
        "maya.patel",

      operation:
        "REMOVE",

      role:
        "MeridianSupervisor",
    },

    reviewedAtUtc:
      "2026-09-16T06:30:00.000Z",

    applyRequirement:
      "FRESH_DIGEST_MATCH_REQUIRED",

    applyRequiresFreshRevalidation:
      true,
  };
}

function fresh(
  digest:
    string = REVIEWED_DIGEST,
): ReviewablePreflightForReady {
  return {
    state:
      "PREFLIGHTED",

    digestAlgorithm:
      "SHA-256",

    digest,

    canonical: {
      schemaVersion:
        "meridian.preflight.v1",

      change: {
        username:
          "maya.patel",

        operation:
          "REMOVE",

        role:
          "MeridianSupervisor",
      },
    },
  };
}

describe(
  "apply-time READY revalidation",
  () => {
    it(
      "keeps an exact fresh digest match READY without performing mutation",
      () => {
        expect(
          revalidateReadyForApply({
            ready:
              ready(),

            freshPreflight:
              fresh(),
          }),
        ).toEqual({
          state:
            "READY",

          sourceState:
            "READY",

          freshPreflightState:
            "PREFLIGHTED",

          outcome:
            "MATCH",

          reason:
            "FRESH_PREFLIGHT_DIGEST_MATCH",

          reviewedDigest:
            REVIEWED_DIGEST,

          freshDigest:
            REVIEWED_DIGEST,

          digestMatch:
            true,

          mayProceedToMutationBoundary:
            true,

          mutationAttempted:
            false,

          mutationCount:
            0,
        });
      },
    );

    it(
      "returns STALE and zero mutation when the fresh digest differs",
      () => {
        expect(
          revalidateReadyForApply({
            ready:
              ready(),

            freshPreflight:
              fresh(
                CHANGED_DIGEST,
              ),
          }),
        ).toEqual({
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
            REVIEWED_DIGEST,

          freshDigest:
            CHANGED_DIGEST,

          digestMatch:
            false,

          mayProceedToMutationBoundary:
            false,

          mutationAttempted:
            false,

          mutationCount:
            0,
        });
      },
    );

    it(
      "refuses a non-READY source before comparison",
      () => {
        expect(
          () =>
            revalidateReadyForApply({
              ready: {
                ...ready(),

                state:
                  "PREFLIGHTED" as "READY",
              },

              freshPreflight:
                fresh(),
            }),
        ).toThrow(
          "Only READY may provide",
        );
      },
    );

    it(
      "refuses a fresh result that is not PREFLIGHTED",
      () => {
        expect(
          () =>
            revalidateReadyForApply({
              ready:
                ready(),

              freshPreflight: {
                ...fresh(),

                state:
                  "PROPOSED",
              },
            }),
        ).toThrow(
          "requires a fresh PREFLIGHTED result",
        );
      },
    );

    it(
      "refuses fresh material for a different change identity",
      () => {
        const authoritativeFresh =
          fresh();

        expect(
          () =>
            revalidateReadyForApply({
              ready:
                ready(),

              freshPreflight: {
                ...authoritativeFresh,

                canonical: {
                  ...authoritativeFresh.canonical,

                  change: {
                    ...authoritativeFresh.canonical.change,

                    role:
                      "DifferentRole",
                  },
                },
              },
            }),
        ).toThrow(
          "change identity does not match READY",
        );
      },
    );

    it(
      "never materializes a post-mutation lifecycle state",
      () => {
        const result =
          revalidateReadyForApply({
            ready:
              ready(),

            freshPreflight:
              fresh(),
          });

        expect(
          result.state,
        ).toBe(
          "READY",
        );

        expect(
          result.mutationAttempted,
        ).toBe(
          false,
        );

        expect(
          result.mutationCount,
        ).toBe(
          0,
        );
      },
    );
  },
);