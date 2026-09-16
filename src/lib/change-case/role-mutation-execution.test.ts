import {
  describe,
  expect,
  it,
} from "vitest";

import {
  executeCenterpieceRoleMutation,
} from "../iris/role-mutation-executor";

import type {
  CenterpieceApplyTimeRevalidation,
} from "../iris/apply-revalidation";

import type {
  ReadyReviewedPreflight,
} from "./ready-preflight";

const DIGEST =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

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
      "2026-09-16T08:00:00.000Z",

    applyRequirement:
      "FRESH_DIGEST_MATCH_REQUIRED",

    applyRequiresFreshRevalidation:
      true,
  };
}

function matchRevalidation():
  CenterpieceApplyTimeRevalidation {
  return {
    freshPreflight: {
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

        current: {
          directRoles: [
            "MeridianEmployee",
            "MeridianSupervisor",
          ],
        },

        proposed: {
          directRoles: [
            "MeridianEmployee",
          ],
        },
      },
    } as never,

    decision: {
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
        DIGEST,

      freshDigest:
        DIGEST,

      digestMatch:
        true,

      mayProceedToMutationBoundary:
        true,

      mutationAttempted:
        false,

      mutationCount:
        0,
    },
  };
}

function staleRevalidation():
  CenterpieceApplyTimeRevalidation {
  return {
    freshPreflight: {
      ...matchRevalidation().freshPreflight,

      digest:
        "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
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
        DIGEST,

      freshDigest:
        "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",

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
}

const input = {
  apiBaseUrl:
    "http://iris/api/admin",

  helperBaseUrl:
    "http://iris/meridian-control-plane-internal",

  accessToken:
    "test-token",

  ready:
    ready(),
};

describe(
  "centerpiece role mutation executor",
  () => {
    it(
      "revalidates first then sends exactly one bodyless centerpiece POST",
      async () => {
        let revalidationCount =
          0;

        let fetchCount =
          0;

        let observedUrl =
          "";

        let observedMethod =
          "";

        let observedBody:
          BodyInit | null | undefined;

        let authorization =
          "";

        const result =
          await executeCenterpieceRoleMutation(
            input,
            {
              revalidate:
                async () => {
                  revalidationCount +=
                    1;

                  return matchRevalidation();
                },

              fetchImpl:
                (async (
                  resource,
                  init,
                ) => {
                  fetchCount +=
                    1;

                  observedUrl =
                    String(
                      resource,
                    );

                  observedMethod =
                    init?.method ??
                    "";

                  observedBody =
                    init?.body;

                  authorization =
                    new Headers(
                      init?.headers,
                    ).get(
                      "Authorization",
                    ) ?? "";

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
                        "meridian.runtime",

                      applyPid:
                        12345,

                      applyTimestamp:
                        "2026-09-16T08:00:00Z",

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
                }) as typeof fetch,
            },
          );

        expect(
          revalidationCount,
        ).toBe(
          1,
        );

        expect(
          fetchCount,
        ).toBe(
          1,
        );

        expect(
          observedUrl,
        ).toBe(
          "http://iris/meridian-control-plane-internal/apply/remove-centerpiece-role",
        );

        expect(
          observedMethod,
        ).toBe(
          "POST",
        );

        expect(
          observedBody,
        ).toBeUndefined();

        expect(
          authorization,
        ).toBe(
          "Bearer test-token",
        );

        expect(
          result.state,
        ).toBe(
          "APPLIED",
        );

        if (
          result.state ===
            "APPLIED"
        ) {
          expect(
            result.configurationVerified,
          ).toBe(
            true,
          );

          expect(
            result.convergenceRequired,
          ).toBe(
            true,
          );

          expect(
            result.verified,
          ).toBe(
            false,
          );
        }
      },
    );

    it(
      "returns STALE without calling POST when fresh digest differs",
      async () => {
        let fetchCount =
          0;

        const result =
          await executeCenterpieceRoleMutation(
            input,
            {
              revalidate:
                async () =>
                  staleRevalidation(),

              fetchImpl:
                (async () => {
                  fetchCount +=
                    1;

                  throw new Error(
                    "must not be called",
                  );
                }) as typeof fetch,
            },
          );

        expect(
          result.state,
        ).toBe(
          "STALE",
        );

        expect(
          fetchCount,
        ).toBe(
          0,
        );

        expect(
          result.mutationRequestSent,
        ).toBe(
          false,
        );

        expect(
          result.confirmedSecurityMutationCount,
        ).toBe(
          0,
        );
      },
    );

    it(
      "fails closed on HTTP failure and forbids blind retry",
      async () => {
        const result =
          await executeCenterpieceRoleMutation(
            input,
            {
              revalidate:
                async () =>
                  matchRevalidation(),

              fetchImpl:
                (async () =>
                  new Response(
                    JSON.stringify({
                      ok:
                        0,
                    }),
                    {
                      status:
                        500,
                    },
                  )) as typeof fetch,
            },
          );

        expect(
          result.state,
        ).toBe(
          "APPLY_FAILED",
        );

        if (
          result.state ===
            "APPLY_FAILED"
        ) {
          expect(
            result.securityMutationOutcomeKnown,
          ).toBe(
            false,
          );

          expect(
            result.requiresFreshAuthoritativeRead,
          ).toBe(
            true,
          );

          expect(
            result.mayRetryWithoutFreshRead,
          ).toBe(
            false,
          );
        }
      },
    );

    it(
      "treats transport uncertainty as APPLY_FAILED rather than retryable",
      async () => {
        const result =
          await executeCenterpieceRoleMutation(
            input,
            {
              revalidate:
                async () =>
                  matchRevalidation(),

              fetchImpl:
                (async () => {
                  throw new Error(
                    "socket closed",
                  );
                }) as typeof fetch,
            },
          );

        expect(
          result.state,
        ).toBe(
          "APPLY_FAILED",
        );

        if (
          result.state ===
            "APPLY_FAILED"
        ) {
          expect(
            result.reason,
          ).toContain(
            "MUTATION_TRANSPORT_FAILURE",
          );

          expect(
            result.mayRetryWithoutFreshRead,
          ).toBe(
            false,
          );
        }
      },
    );

    it(
      "never upgrades configuration completion to VERIFIED",
      async () => {
        const result =
          await executeCenterpieceRoleMutation(
            input,
            {
              revalidate:
                async () =>
                  matchRevalidation(),

              fetchImpl:
                (async () =>
                  new Response(
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
                        "meridian.runtime",

                      applyPid:
                        12345,

                      applyTimestamp:
                        "2026-09-16T08:00:00Z",

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
                    },
                  )) as typeof fetch,
            },
          );

        expect(
          result.state,
        ).toBe(
          "APPLIED",
        );

        if (
          result.state ===
            "APPLIED"
        ) {
          expect(
            result.verified,
          ).toBe(
            false,
          );

          expect(
            result.convergenceRequired,
          ).toBe(
            true,
          );

          expect(
            result.auditBindingRequired,
          ).toBe(
            true,
          );
        }
      },
    );
  },
);