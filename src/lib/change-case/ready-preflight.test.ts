import {
  describe,
  expect,
  it,
} from "vitest";

import {
  freezeReviewedPreflight,
  readyDigestForFutureApply,
  type ReviewablePreflightForReady,
} from "./ready-preflight";

const DIGEST =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

function preflight():
  ReviewablePreflightForReady {
  return {
    state:
      "PREFLIGHTED",

    digestAlgorithm:
      "SHA-256",

    digest:
      DIGEST,

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
  "reviewed preflight READY transition",
  () => {
    it(
      "freezes the exact reviewed PREFLIGHTED digest into READY",
      () => {
        const ready =
          freezeReviewedPreflight({
            preflight:
              preflight(),

            reviewedDigest:
              DIGEST,

            reviewedAtUtc:
              "2026-09-16T06:30:00.000Z",
          });

        expect(
          ready,
        ).toEqual({
          state:
            "READY",

          sourceState:
            "PREFLIGHTED",

          digestAlgorithm:
            "SHA-256",

          reviewedDigest:
            DIGEST,

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
        });
      },
    );

    it(
      "refuses a reviewed digest that differs from the authoritative preflight",
      () => {
        expect(
          () =>
            freezeReviewedPreflight({
              preflight:
                preflight(),

              reviewedDigest:
                "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",

              reviewedAtUtc:
                "2026-09-16T06:30:00.000Z",
            }),
        ).toThrow(
          "Reviewed digest does not match",
        );
      },
    );

    it(
      "refuses to mark a non-PREFLIGHTED state READY",
      () => {
        expect(
          () =>
            freezeReviewedPreflight({
              preflight: {
                ...preflight(),

                state:
                  "PROPOSED",
              },

              reviewedDigest:
                DIGEST,

              reviewedAtUtc:
                "2026-09-16T06:30:00.000Z",
            }),
        ).toThrow(
          "Only a PREFLIGHTED Change Case may become READY",
        );
      },
    );

    it(
      "keeps review time outside the frozen reviewed digest",
      () => {
        const first =
          freezeReviewedPreflight({
            preflight:
              preflight(),

            reviewedDigest:
              DIGEST,

            reviewedAtUtc:
              "2026-09-16T06:30:00.000Z",
          });

        const second =
          freezeReviewedPreflight({
            preflight:
              preflight(),

            reviewedDigest:
              DIGEST,

            reviewedAtUtc:
              "2026-09-16T06:31:00.000Z",
          });

        expect(
          second.reviewedDigest,
        ).toBe(
          first.reviewedDigest,
        );

        expect(
          second.reviewedAtUtc,
        ).not.toBe(
          first.reviewedAtUtc,
        );
      },
    );

    it(
      "lets only READY expose the reviewed digest for future revalidation",
      () => {
        const ready =
          freezeReviewedPreflight({
            preflight:
              preflight(),

            reviewedDigest:
              DIGEST,

            reviewedAtUtc:
              "2026-09-16T06:30:00.000Z",
          });

        expect(
          readyDigestForFutureApply(
            ready,
          ),
        ).toBe(
          DIGEST,
        );

        expect(
          () =>
            readyDigestForFutureApply({
              state:
                "PREFLIGHTED",

              reviewedDigest:
                DIGEST,

              applyRequiresFreshRevalidation:
                true,
            }),
        ).toThrow(
          "Only READY may provide",
        );
      },
    );
  },
);