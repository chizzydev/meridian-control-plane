import {
  DEMO_FIXTURE_DIRECT_ROLES_AFTER,
  DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
  DEMO_FIXTURE_DISPLAY_NAME,
  DEMO_FIXTURE_ID,
  DEMO_FIXTURE_TARGET_ROLE,
  DEMO_FIXTURE_USERNAME,
  type DemoFixtureUserSnapshot,
} from "../../change-case/demo-fixture";

import type {
  DemoFixtureApplyResult,
} from "../../change-case/demo-fixture-apply";

import {
  freezeReviewedPreflight,
  type ReviewablePreflightForReady,
} from "../../change-case/ready-preflight";

import {
  revalidateReadyForApply,
} from "../../change-case/apply-revalidation";

import {
  PROOF_CONTRACT_SCHEMA_VERSION,
  type ActionContext,
  type ProofContract,
  type ReviewedAction,
  type RevalidationDecision,
} from "../../proof/contract";

import {
  ProofEngineError,
} from "../../proof/errors";

import type {
  ProofResult,
} from "../../proof/evidence";

import {
  USER_REMOVE_ROLE_PROOF_REQUIREMENTS,
} from "./evidence";

import {
  executionFromAppliedMutation,
  reconcileUnknownRoleRemoval,
  type UserRemoveRoleExecution,
} from "./reconcile";

export const USER_REMOVE_ROLE_CONTRACT_ID =
  "meridian.permission.user-remove-role" as const;

export const USER_REMOVE_ROLE_CONTRACT_VERSION =
  1 as const;

export interface UserRemoveRoleIntent {
  readonly fixtureId:
    typeof DEMO_FIXTURE_ID;

  readonly username:
    typeof DEMO_FIXTURE_USERNAME;

  readonly operation:
    "REMOVE";

  readonly role:
    typeof DEMO_FIXTURE_TARGET_ROLE;

  readonly expectedFixtureGeneration:
    string;
}

export interface UserRemoveRoleContractDependencies {
  readonly readFreshPreflight:
    (
      intent:
        UserRemoveRoleIntent,
    ) => Promise<
      ReviewablePreflightForReady
    >;

  readonly executeMutation:
    (
      intent:
        UserRemoveRoleIntent,
    ) => Promise<
      DemoFixtureApplyResult
    >;

  readonly readConfiguredUserForReconciliation:
    (
      intent:
        UserRemoveRoleIntent,
    ) => Promise<
      DemoFixtureUserSnapshot | null
    >;

  readonly fixtureGenerationCurrent:
    (
      generation:
        string,
    ) => boolean;

  readonly collectProofResults:
    (
      execution:
        UserRemoveRoleExecution,
    ) => Promise<
      readonly ProofResult[]
    >;
}

function assertIntent(
  intent:
    UserRemoveRoleIntent,
): void {
  if (
    intent.fixtureId !==
      DEMO_FIXTURE_ID ||
    intent.username !==
      DEMO_FIXTURE_USERNAME ||
    intent.operation !==
      "REMOVE" ||
    intent.role !==
      DEMO_FIXTURE_TARGET_ROLE ||
    intent.expectedFixtureGeneration
      .trim()
      .length ===
      0
  ) {
    throw new ProofEngineError(
      "INVALID_TARGET",
      "USER_REMOVE_ROLE intent is outside the fixed Meridian live fixture boundary.",
      {
        actionType:
          "USER_REMOVE_ROLE",
      },
    );
  }
}

function assertPreflightIdentity(
  preflight:
    ReviewablePreflightForReady,
): void {
  if (
    preflight.state !==
      "PREFLIGHTED" ||
    preflight.digestAlgorithm !==
      "SHA-256" ||
    !/^[A-F0-9]{64}$/.test(
      preflight.digest,
    ) ||
    preflight.canonical.schemaVersion !==
      "meridian.preflight.v1" ||
    preflight.canonical.change.username !==
      DEMO_FIXTURE_USERNAME ||
    preflight.canonical.change.operation !==
      "REMOVE" ||
    preflight.canonical.change.role !==
      DEMO_FIXTURE_TARGET_ROLE
  ) {
    throw new ProofEngineError(
      "INVALID_CONTRACT",
      "USER_REMOVE_ROLE preflight does not match the certified live fixture contract.",
    );
  }
}

function mapRevalidation(
  decision:
    ReturnType<
      typeof revalidateReadyForApply
    >,
  freshPreflight:
    ReviewablePreflightForReady,
): RevalidationDecision<
  ReviewablePreflightForReady
> {
  if (
    decision.outcome ===
      "MATCH"
  ) {
    return Object.freeze({
      outcome:
        "MATCH" as const,

      freshPreflight,

      freshDigest:
        decision.freshDigest,
    });
  }

  return Object.freeze({
    outcome:
      "STALE" as const,

    freshPreflight,

    freshDigest:
      decision.freshDigest,

    reason:
      decision.reason,
  });
}

export function createUserRemoveRoleProofContract(
  dependencies:
    UserRemoveRoleContractDependencies,
): ProofContract<
  UserRemoveRoleIntent,
  ReviewablePreflightForReady,
  UserRemoveRoleExecution
> {
  const contract:
    ProofContract<
      UserRemoveRoleIntent,
      ReviewablePreflightForReady,
      UserRemoveRoleExecution
    > = {
    schemaVersion:
      PROOF_CONTRACT_SCHEMA_VERSION,

    contractId:
      USER_REMOVE_ROLE_CONTRACT_ID,

    contractVersion:
      USER_REMOVE_ROLE_CONTRACT_VERSION,

    actionType:
      "USER_REMOVE_ROLE",

    domain:
      "PERMISSIONS",

    risk:
      "MEDIUM",

    reversibility:
      "REVERSIBLE",

    requiredAuthority:
      Object.freeze([
        Object.freeze({
          resource:
            "%Admin_Secure",

          permission:
            "U",

          standing:
            false,

          escalationOnly:
            true,
        }),
      ]),

    proofRequirements:
      USER_REMOVE_ROLE_PROOF_REQUIREMENTS,

    target(
      intent,
    ) {
      assertIntent(
        intent,
      );

      return Object.freeze({
        kind:
          "USER",

        canonicalId:
          `user:${DEMO_FIXTURE_USERNAME}`,

        displayName:
          DEMO_FIXTURE_DISPLAY_NAME,

        fixtureId:
          DEMO_FIXTURE_ID,

        generation:
          intent.expectedFixtureGeneration,
      });
    },

    async preflight(
      context,
      intent,
    ) {
      void context;

      assertIntent(
        intent,
      );

      const preflight =
        await dependencies
          .readFreshPreflight(
            intent,
          );

      assertPreflightIdentity(
        preflight,
      );

      return preflight;
    },

    expectedDelta(
      intent,
      preflight,
    ) {
      assertIntent(
        intent,
      );

      assertPreflightIdentity(
        preflight,
      );

      return Object.freeze({
        summary:
          "Remove MeridianSupervisor from the exact isolated Meridian witness user.",

        before:
          Object.freeze({
            directRoles:
              Object.freeze([
                ...DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
              ]),
          }),

        after:
          Object.freeze({
            directRoles:
              Object.freeze([
                ...DEMO_FIXTURE_DIRECT_ROLES_AFTER,
              ]),
          }),
      });
    },

    async analyzeImpact(
      context,
      intent,
      preflight,
    ) {
      void context;

      assertIntent(
        intent,
      );

      assertPreflightIdentity(
        preflight,
      );

      return Object.freeze({
        certainty:
          "KNOWN" as const,

        summary:
          "Configured role/resource impact is known for the frozen Meridian fixture graph; arbitrary application-code authorization is not inferred.",

        affectedEntities:
          Object.freeze([
            Object.freeze({
              kind:
                "USER",
              canonicalId:
                `user:${DEMO_FIXTURE_USERNAME}`,
              displayName:
                DEMO_FIXTURE_DISPLAY_NAME,
              effect:
                "Direct role MeridianSupervisor is removed.",
            }),

            Object.freeze({
              kind:
                "ROLE",
              canonicalId:
                `role:${DEMO_FIXTURE_TARGET_ROLE}`,
              displayName:
                DEMO_FIXTURE_TARGET_ROLE,
              effect:
                "Inherited MeridianOperator and MeridianJobRunner authority is lost from the fixture user.",
            }),
          ]),

        limitations:
          Object.freeze([
            "Meridian proves the frozen configured role/resource graph and live witness decisions only.",
            "Meridian does not infer arbitrary application-code authorization outside declared IRIS resources.",
          ]),
      });
    },

    digestPreflight(
      preflight,
    ) {
      assertPreflightIdentity(
        preflight,
      );

      return preflight.digest;
    },

    async revalidate(
      context:
        ActionContext,
      reviewed:
        ReviewedAction<
          UserRemoveRoleIntent,
          ReviewablePreflightForReady
        >,
    ) {
      assertIntent(
        reviewed.intent,
      );

      assertPreflightIdentity(
        reviewed.preflight,
      );

      const ready =
        freezeReviewedPreflight({
          preflight:
            reviewed.preflight,

          reviewedDigest:
            reviewed.reviewedPreflightDigest,

          reviewedAtUtc:
            context.nowUtc,
        });

      const freshPreflight =
        await dependencies
          .readFreshPreflight(
            reviewed.intent,
          );

      assertPreflightIdentity(
        freshPreflight,
      );

      return mapRevalidation(
        revalidateReadyForApply({
          ready,
          freshPreflight,
        }),
        freshPreflight,
      );
    },

    async execute(
      context,
      ready,
    ) {
      void context;

      assertIntent(
        ready.intent,
      );

      assertPreflightIdentity(
        ready.preflight,
      );

      if (
        ready.reviewedPreflightDigest !==
          ready.freshRevalidationDigest
      ) {
        throw new ProofEngineError(
          "STALE_PRECONDITION",
          "USER_REMOVE_ROLE execute refused because reviewed and fresh digests differ.",
        );
      }

      const result =
        await dependencies
          .executeMutation(
            ready.intent,
          );

      if (
        result.state ===
          "APPLY_FAILED"
      ) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          result.reason,
          {
            mutationRequestCount:
              result.mutationRequestCount,
          },
        );
      }

      return executionFromAppliedMutation(
        result,
      );
    },

    async reconcileUnknown(
      context,
      reviewed,
    ) {
      void context;

      assertIntent(
        reviewed.intent,
      );

      const observedUser =
        await dependencies
          .readConfiguredUserForReconciliation(
            reviewed.intent,
          );

      return reconcileUnknownRoleRemoval({
        expectedFixtureGeneration:
          reviewed.intent
            .expectedFixtureGeneration,

        generationStillCurrent:
          dependencies
            .fixtureGenerationCurrent(
              reviewed.intent
                .expectedFixtureGeneration,
            ),

        observedUser,
      });
    },

    async verify(
      context,
      execution,
    ) {
      void context;

      return dependencies
        .collectProofResults(
          execution,
        );
    },

    buildRecoveryPlan(
      execution,
      results,
    ) {
      void execution;
      void results;

      return Object.freeze({
        recoveryActionType:
          "USER_ADD_ROLE",

        automatic:
          false as const,

        summary:
          "Prepare a separately reviewed USER_ADD_ROLE action that restores MeridianSupervisor only after fresh recovery preflight and authoritative revalidation.",
      });
    },
  };

  return Object.freeze(
    contract,
  );
}
