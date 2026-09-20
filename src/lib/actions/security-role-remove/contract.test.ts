import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  DEMO_FIXTURE_DIRECT_ROLES_AFTER,
  DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
  DEMO_FIXTURE_DISPLAY_NAME,
  DEMO_FIXTURE_NAMESPACE,
  DEMO_FIXTURE_TARGET_ROLE,
  DEMO_FIXTURE_USERNAME,
} from "../../change-case/demo-fixture";

import {
  appliedDemoFixtureMutation,
  failedDemoFixtureMutation,
  type DemoFixtureApplyResult,
} from "../../change-case/demo-fixture-apply";

import {
  describeProofContract,
} from "../../proof/registry";

import {
  ProofEngineError,
} from "../../proof/errors";

import {
  createUserRemoveRoleProofContract,
  type UserRemoveRoleIntent,
} from "./contract";

import {
  buildUserRemoveRoleProofResults,
} from "./evidence";

function reviewable(
  digest:
    string = "A".repeat(
      64,
    ),
) {
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
          DEMO_FIXTURE_USERNAME,

        operation:
          "REMOVE",

        role:
          DEMO_FIXTURE_TARGET_ROLE,
      },
    },
  };
}

const intent:
  UserRemoveRoleIntent = {
    fixtureId:
      "meridian-live-demo-v1",

    username:
      DEMO_FIXTURE_USERNAME,

    operation:
      "REMOVE",

    role:
      DEMO_FIXTURE_TARGET_ROLE,

    expectedFixtureGeneration:
      "generation-1",
  };

function user(
  roles:
    readonly string[],
) {
  return {
    username:
      DEMO_FIXTURE_USERNAME,

    displayName:
      DEMO_FIXTURE_DISPLAY_NAME,

    namespace:
      DEMO_FIXTURE_NAMESPACE,

    enabled:
      true,

    directRoles:
      roles,
  };
}

function dependencies() {
  return {
    readFreshPreflight:
      vi.fn(
        async () =>
          reviewable(),
      ),

    executeMutation:
      vi.fn(
        async (): Promise<
          DemoFixtureApplyResult
        > =>
          appliedDemoFixtureMutation({
            before:
              user(
                DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
              ),

            after:
              user(
                DEMO_FIXTURE_DIRECT_ROLES_AFTER,
              ),
          }),
      ),

    readConfiguredUserForReconciliation:
      vi.fn(
        async () =>
          user(
            DEMO_FIXTURE_DIRECT_ROLES_AFTER,
          ),
      ),

    fixtureGenerationCurrent:
      vi.fn(
        () =>
          true,
      ),

    collectProofResults:
      vi.fn(
        async () =>
          buildUserRemoveRoleProofResults({
            observedAtUtc:
              "2026-09-20T14:00:10.000Z",

            configurationVerified:
              true,

            permissionEffectVerified:
              true,

            liveRuntimeConverged:
              true,

            nativeAuditBound:
              true,

            configurationSourceReference:
              "config",

            permissionSourceReference:
              "role-graph",

            liveRuntimeSourceReference:
              "runtime",

            nativeAuditSourceReference:
              "audit",
          }),
      ),
  };
}

const context = {
  actionId:
    "action:role-remove-001",
  logicalActor:
    "operator",
  irisRuntimeUser:
    "meridian.runtime",
  nowUtc:
    "2026-09-20T14:00:00.000Z",
};

describe(
  "USER_REMOVE_ROLE Proof Contract adapter",
  () => {
    it(
      "registers the exact permission contract and four action-specific proofs",
      () => {
        const contract =
          createUserRemoveRoleProofContract(
            dependencies(),
          );

        expect(
          describeProofContract(
            contract,
          ),
        ).toEqual({
          schemaVersion:
            "meridian.proof-contract.v2",
          contractId:
            "meridian.permission.user-remove-role",
          contractVersion:
            1,
          actionType:
            "USER_REMOVE_ROLE",
          domain:
            "PERMISSIONS",
          risk:
            "MEDIUM",
          reversibility:
            "REVERSIBLE",
          requiredProofCount:
            4,
          requiredAuthorityCount:
            1,
        });
      },
    );

    it(
      "binds the exact live fixture generation into target identity",
      () => {
        const contract =
          createUserRemoveRoleProofContract(
            dependencies(),
          );

        expect(
          contract.target(
            intent,
          ),
        ).toEqual({
          kind:
            "USER",
          canonicalId:
            `user:${DEMO_FIXTURE_USERNAME}`,
          displayName:
            DEMO_FIXTURE_DISPLAY_NAME,
          fixtureId:
            "meridian-live-demo-v1",
          generation:
            "generation-1",
        });
      },
    );

    it(
      "preserves the already-reviewed V1 preflight digest for generic revalidation",
      async () => {
        const deps =
          dependencies();

        const contract =
          createUserRemoveRoleProofContract(
            deps,
          );

        const preflight =
          await contract.preflight(
            context,
            intent,
          );

        const decision =
          await contract.revalidate(
            context,
            {
              intent,
              preflight,
              reviewedPreflightDigest:
                preflight.digest,
            },
          );

        expect(
          decision.outcome,
        ).toBe(
          "MATCH",
        );

        expect(
          decision.freshDigest,
        ).toBe(
          preflight.digest,
        );
      },
    );

    it(
      "returns STALE before execution when the fresh digest changed",
      async () => {
        const deps =
          dependencies();

        deps.readFreshPreflight
          .mockResolvedValueOnce(
            reviewable(
              "A".repeat(
                64,
              ),
            ),
          )
          .mockResolvedValueOnce(
            reviewable(
              "B".repeat(
                64,
              ),
            ),
          );

        const contract =
          createUserRemoveRoleProofContract(
            deps,
          );

        const preflight =
          await contract.preflight(
            context,
            intent,
          );

        const decision =
          await contract.revalidate(
            context,
            {
              intent,
              preflight,
              reviewedPreflightDigest:
                preflight.digest,
            },
          );

        expect(
          decision.outcome,
        ).toBe(
          "STALE",
        );

        expect(
          deps.executeMutation,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "refuses execution when reviewed and fresh digests differ",
      async () => {
        const contract =
          createUserRemoveRoleProofContract(
            dependencies(),
          );

        await expect(
          contract.execute(
            context,
            {
              intent,
              preflight:
                reviewable(),
              reviewedPreflightDigest:
                "A".repeat(
                  64,
                ),
              freshRevalidationDigest:
                "B".repeat(
                  64,
                ),
            },
          ),
        ).rejects.toBeInstanceOf(
          ProofEngineError,
        );
      },
    );

    it(
      "maps known direct apply into the generic execution contract",
      async () => {
        const contract =
          createUserRemoveRoleProofContract(
            dependencies(),
          );

        const execution =
          await contract.execute(
            context,
            {
              intent,
              preflight:
                reviewable(),
              reviewedPreflightDigest:
                "A".repeat(
                  64,
                ),
              freshRevalidationDigest:
                "A".repeat(
                  64,
                ),
            },
          );

        expect(
          execution,
        ).toMatchObject({
          state:
            "APPLIED",
          configurationVerified:
            true,
          resolutionSource:
            "DIRECT_EXECUTION",
        });
      },
    );

    it(
      "surfaces transport uncertainty as UNKNOWN_AFTER_DISPATCH instead of retrying",
      async () => {
        const deps =
          dependencies();

        deps.executeMutation
          .mockResolvedValue(
            failedDemoFixtureMutation(
              "MUTATION_TRANSPORT_FAILURE:socket closed",
            ),
          );

        const contract =
          createUserRemoveRoleProofContract(
            deps,
          );

        await expect(
          contract.execute(
            context,
            {
              intent,
              preflight:
                reviewable(),
              reviewedPreflightDigest:
                "A".repeat(
                  64,
                ),
              freshRevalidationDigest:
                "A".repeat(
                  64,
                ),
            },
          ),
        ).rejects.toMatchObject({
          code:
            "UNKNOWN_AFTER_DISPATCH",
        });

        expect(
          deps.executeMutation,
        ).toHaveBeenCalledTimes(
          1,
        );
      },
    );

    it(
      "reconciles unknown applied outcome with one authoritative read and no mutation retry",
      async () => {
        const deps =
          dependencies();

        const contract =
          createUserRemoveRoleProofContract(
            deps,
          );

        const decision =
          await contract.reconcileUnknown(
            context,
            {
              intent,
              preflight:
                reviewable(),
              reviewedPreflightDigest:
                "A".repeat(
                  64,
                ),
            },
          );

        expect(
          decision.outcome,
        ).toBe(
          "APPLIED",
        );

        expect(
          deps.readConfiguredUserForReconciliation,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          deps.executeMutation,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "returns the separately reviewed USER_ADD_ROLE recovery plan",
      () => {
        const contract =
          createUserRemoveRoleProofContract(
            dependencies(),
          );

        expect(
          contract.buildRecoveryPlan(
            {
              schemaVersion:
                "meridian.user-remove-role-execution.v1",
              state:
                "APPLIED",
              fixtureId:
                "meridian-live-demo-v1",
              username:
                DEMO_FIXTURE_USERNAME,
              operation:
                "REMOVE",
              role:
                DEMO_FIXTURE_TARGET_ROLE,
              beforeDirectRoles:
                DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
              afterDirectRoles:
                DEMO_FIXTURE_DIRECT_ROLES_AFTER,
              configurationVerified:
                true,
              resolutionSource:
                "DIRECT_EXECUTION",
            },
            [],
          ),
        ).toMatchObject({
          recoveryActionType:
            "USER_ADD_ROLE",
          automatic:
            false,
        });
      },
    );
  },
);
