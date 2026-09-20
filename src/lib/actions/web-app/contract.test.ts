import {
  describe,
  expect,
  it,
} from "vitest";

import {
  describeProofContract,
} from "../../proof/registry";

import {
  createW01WebAppCreateProofContract,
  W01_WEB_APP_CREATE_INTENT,
} from "./contract";

import {
  ORDERS_WEB_APP_TARGET_CANONICAL_ID,
  W01_ORDERS_WEB_APP_EXPECTED,
} from "./fixture";

describe(
  "W01 WEB_APP_CREATE Proof Contract",
  () => {
    it(
      "binds the exact allowlisted fixture and real standing authority",
      () => {
        const contract =
          createW01WebAppCreateProofContract({
            async readConfiguredApp() {
              return null;
            },

            async executeCreate() {
            },
          });

        expect(
          describeProofContract(
            contract,
          ),
        ).toMatchObject({
          actionType:
            "WEB_APP_CREATE",
          domain:
            "WEB_REST",
          risk:
            "MEDIUM",
          reversibility:
            "REVERSIBLE",
          requiredProofCount:
            1,
          requiredAuthorityCount:
            1,
        });

        expect(
          contract.requiredAuthority,
        ).toEqual([
          {
            resource:
              "%Admin_Secure",
            permission:
              "U",
            standing:
              true,
            escalationOnly:
              false,
          },
        ]);

        expect(
          contract.target(
            W01_WEB_APP_CREATE_INTENT,
          ).canonicalId,
        ).toBe(
          ORDERS_WEB_APP_TARGET_CANONICAL_ID,
        );
      },
    );

    it(
      "preflights exact absence and produces a deterministic reviewed delta",
      async () => {
        const contract =
          createW01WebAppCreateProofContract({
            async readConfiguredApp() {
              return null;
            },

            async executeCreate() {
            },
          });

        const preflight =
          await contract.preflight(
            {
              actionId:
                "test-w01",
              logicalActor:
                "test",
              irisRuntimeUser:
                "meridian.runtime",
              nowUtc:
                "2026-09-20T20:00:00.000Z",
            },
            W01_WEB_APP_CREATE_INTENT,
          );

        expect(
          preflight.observed,
        ).toBe(
          "ABSENT",
        );

        expect(
          preflight.desired,
        ).toEqual(
          W01_ORDERS_WEB_APP_EXPECTED,
        );

        expect(
          contract.expectedDelta(
            W01_WEB_APP_CREATE_INTENT,
            preflight,
          ),
        ).toMatchObject({
          before: {
            present:
              false,
          },
          after: {
            present:
              true,
            enabled:
              false,
          },
        });
      },
    );

    it(
      "marks a newly appeared target stale with zero mutation",
      async () => {
        let executeCount =
          0;

        const contract =
          createW01WebAppCreateProofContract({
            async readConfiguredApp() {
              return W01_ORDERS_WEB_APP_EXPECTED;
            },

            async executeCreate() {
              executeCount +=
                1;
            },
          });

        const reviewedPreflight = {
          schemaVersion:
            "meridian.web-app-create-preflight.v1" as const,
          targetCanonicalId:
            ORDERS_WEB_APP_TARGET_CANONICAL_ID,
          observed:
            "ABSENT" as const,
          desired:
            W01_ORDERS_WEB_APP_EXPECTED,
          officialReadOperation:
            "GET /v2/web-app" as const,
          officialMutationOperation:
            "PUT /v2/web-app" as const,
          requiredAuthority:
            "%Admin_Secure:U" as const,
          authorityMode:
            "CURRENT_STANDING_RUNTIME_AUTHORITY" as const,
        };

        const decision =
          await contract.revalidate(
            {
              actionId:
                "test-w01",
              logicalActor:
                "test",
              irisRuntimeUser:
                "meridian.runtime",
              nowUtc:
                "2026-09-20T20:00:01.000Z",
            },
            {
              intent:
                W01_WEB_APP_CREATE_INTENT,
              preflight:
                reviewedPreflight,
              reviewedPreflightDigest:
                contract.digestPreflight(
                  reviewedPreflight,
                ),
            },
          );

        expect(
          decision.outcome,
        ).toBe(
          "STALE",
        );

        expect(
          executeCount,
        ).toBe(
          0,
        );
      },
    );
  },
);
