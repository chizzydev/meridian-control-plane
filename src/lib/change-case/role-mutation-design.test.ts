import {
  describe,
  expect,
  it,
} from "vitest";

import {
  authorizeCenterpieceRoleMutationDesign,
  type FreshRoleMutationPreflight,
} from "./role-mutation-design";

import {
  type ApplyTimeRevalidationDecision,
} from "./apply-revalidation";

import {
  buildCenterpieceRoleMutationTransportPlan,
} from "../iris/role-mutation-transport";

const DIGEST =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

function decision():
  ApplyTimeRevalidationDecision {
  return {
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
  };
}

function preflight():
  FreshRoleMutationPreflight {
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

      current: {
        directRoles: [
          "MeridianSupervisor",
          "MeridianEmployee",
        ],
      },

      proposed: {
        directRoles: [
          "MeridianEmployee",
        ],
      },
    },
  };
}

describe(
  "centerpiece role mutation design",
  () => {
    it(
      "derives the exact supported mutation from a successful untouched 10C decision",
      () => {
        expect(
          authorizeCenterpieceRoleMutationDesign({
            decision:
              decision(),

            freshPreflight:
              preflight(),
          }),
        ).toEqual({
          contractVersion:
            "centerpiece-remove-v1",

          primitive:
            "Security.Users.RemoveRoles",

          username:
            "maya.patel",

          operation:
            "REMOVE",

          role:
            "MeridianSupervisor",

          reviewedDigest:
            DIGEST,

          freshDigest:
            DIGEST,

          expectedBeforeDirectRoles: [
            "MeridianEmployee",
            "MeridianSupervisor",
          ],

          expectedAfterDirectRoles: [
            "MeridianEmployee",
          ],
        });
      },
    );

    it(
      "refuses STALE before a mutation transport can be built",
      () => {
        const stale:
          ApplyTimeRevalidationDecision = {
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
          };

        expect(
          () =>
            authorizeCenterpieceRoleMutationDesign({
              decision:
                stale,

              freshPreflight:
                preflight(),
            }),
        ).toThrow(
          "requires an untouched successful 10C MATCH decision",
        );
      },
    );

    it(
      "refuses a different target role",
      () => {
        const fresh =
          preflight();

        expect(
          () =>
            authorizeCenterpieceRoleMutationDesign({
              decision:
                decision(),

              freshPreflight: {
                ...fresh,

                canonical: {
                  ...fresh.canonical,

                  change: {
                    ...fresh.canonical.change,

                    role:
                      "DifferentRole",
                  },
                },
              },
            }),
        ).toThrow(
          "only the frozen centerpiece change",
        );
      },
    );

    it(
      "refuses proposed direct roles that are not exactly current minus target",
      () => {
        const fresh =
          preflight();

        expect(
          () =>
            authorizeCenterpieceRoleMutationDesign({
              decision:
                decision(),

              freshPreflight: {
                ...fresh,

                canonical: {
                  ...fresh.canonical,

                  proposed: {
                    directRoles: [
                      "MeridianEmployee",
                      "UnexpectedRole",
                    ],
                  },
                },
              },
            }),
        ).toThrow(
          "not exactly current direct roles minus the target role",
        );
      },
    );

    it(
      "builds one bodyless POST transport plan and performs no network request",
      () => {
        const fresh =
          preflight();

        const plan =
          buildCenterpieceRoleMutationTransportPlan({
            freshPreflight:
              fresh as never,

            decision:
              decision(),
          });

        expect(
          plan.method,
        ).toBe(
          "POST",
        );

        expect(
          plan.path,
        ).toBe(
          "/apply/remove-centerpiece-role",
        );

        expect(
          plan.requestBody,
        ).toBeNull();

        expect(
          plan.networkRequestPerformed,
        ).toBe(
          false,
        );

        expect(
          plan.command.primitive,
        ).toBe(
          "Security.Users.RemoveRoles",
        );
      },
    );
  },
);