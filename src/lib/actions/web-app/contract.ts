import {
  PROOF_CONTRACT_SCHEMA_VERSION,
  type ActionContext,
  type ProofContract,
  type RevalidationDecision,
  type ReviewedAction,
} from "../../proof/contract";

import {
  digestCanonicalJson,
} from "../../proof/digest";

import {
  ProofEngineError,
} from "../../proof/errors";

import {
  WebAppAuthorityDeniedError,
  WebAppMutationUnknownAfterDispatchError,
} from "../../iris/web-app-action-transport";

import {
  buildW01WebAppCreateProofResults,
  W01_WEB_APP_CREATE_PROOF_REQUIREMENTS,
} from "./evidence";

import {
  ORDERS_WEB_APP_DESCRIPTION_CREATE,
  ORDERS_WEB_APP_DISPATCH_CLASS,
  ORDERS_WEB_APP_FIXTURE_ID,
  ORDERS_WEB_APP_GENERATION,
  ORDERS_WEB_APP_NAME,
  ORDERS_WEB_APP_NAMESPACE,
  ORDERS_WEB_APP_TARGET_CANONICAL_ID,
  WEB_APP_READ_OPERATION,
  WEB_APP_WRITE_OPERATION,
  W01_ORDERS_WEB_APP_EXPECTED,
  assertW01OrdersWebAppSnapshot,
  type OrdersWebAppSnapshot,
} from "./fixture";

import {
  executionFromW01Readback,
  reconcileUnknownW01WebAppCreate,
  type W01WebAppCreateExecution,
} from "./reconcile";

export const W01_WEB_APP_CREATE_CONTRACT_ID =
  "meridian.web-rest.web-app-create.v1" as const;

export interface W01WebAppCreateIntent {
  readonly actionId:
    "W01_WEB_APP_CREATE";

  readonly expectedAbsent:
    true;

  readonly fixtureGeneration:
    typeof ORDERS_WEB_APP_GENERATION;
}

export interface W01WebAppCreatePreflight {
  readonly schemaVersion:
    "meridian.web-app-create-preflight.v1";

  readonly targetCanonicalId:
    typeof ORDERS_WEB_APP_TARGET_CANONICAL_ID;

  readonly observed:
    "ABSENT";

  readonly desired:
    OrdersWebAppSnapshot;

  readonly officialReadOperation:
    typeof WEB_APP_READ_OPERATION;

  readonly officialMutationOperation:
    typeof WEB_APP_WRITE_OPERATION;

  readonly requiredAuthority:
    "%Admin_Secure:U";

  readonly authorityMode:
    "CURRENT_STANDING_RUNTIME_AUTHORITY";
}

export interface W01WebAppCreateContractDependencies {
  readonly readConfiguredApp:
    (
      intent:
        W01WebAppCreateIntent,
    ) => Promise<
      OrdersWebAppSnapshot |
      null
    >;

  readonly executeCreate:
    (
      intent:
        W01WebAppCreateIntent,
    ) => Promise<void>;
}

export const W01_WEB_APP_CREATE_INTENT:
  W01WebAppCreateIntent =
  Object.freeze({
    actionId:
      "W01_WEB_APP_CREATE" as const,

    expectedAbsent:
      true as const,

    fixtureGeneration:
      ORDERS_WEB_APP_GENERATION,
  });

function assertIntent(
  intent:
    W01WebAppCreateIntent,
): void {
  if (
    intent.actionId !==
      "W01_WEB_APP_CREATE" ||
    intent.expectedAbsent !==
      true ||
    intent.fixtureGeneration !==
      ORDERS_WEB_APP_GENERATION
  ) {
    throw new ProofEngineError(
      "INVALID_TARGET",
      "W01 intent does not match the frozen /meridian-lab/orders fixture.",
    );
  }
}

function preflightValue():
  W01WebAppCreatePreflight {
  return Object.freeze({
    schemaVersion:
      "meridian.web-app-create-preflight.v1" as const,

    targetCanonicalId:
      ORDERS_WEB_APP_TARGET_CANONICAL_ID,

    observed:
      "ABSENT" as const,

    desired:
      W01_ORDERS_WEB_APP_EXPECTED,

    officialReadOperation:
      WEB_APP_READ_OPERATION,

    officialMutationOperation:
      WEB_APP_WRITE_OPERATION,

    requiredAuthority:
      "%Admin_Secure:U" as const,

    authorityMode:
      "CURRENT_STANDING_RUNTIME_AUTHORITY" as const,
  });
}

function mapAuthorityDenied(
  error:
    unknown,
): RevalidationDecision<
  W01WebAppCreatePreflight
> | null {
  if (
    error instanceof
      WebAppAuthorityDeniedError
  ) {
    return Object.freeze({
      outcome:
        "DENIED" as const,

      freshPreflight:
        null,

      freshDigest:
        null,

      reason:
        error.message,
    });
  }

  return null;
}

export function createW01WebAppCreateProofContract(
  dependencies:
    W01WebAppCreateContractDependencies,
): ProofContract<
  W01WebAppCreateIntent,
  W01WebAppCreatePreflight,
  W01WebAppCreateExecution
> {
  const contract:
    ProofContract<
      W01WebAppCreateIntent,
      W01WebAppCreatePreflight,
      W01WebAppCreateExecution
    > = {
    schemaVersion:
      PROOF_CONTRACT_SCHEMA_VERSION,

    contractId:
      W01_WEB_APP_CREATE_CONTRACT_ID,

    contractVersion:
      1,

    actionType:
      "WEB_APP_CREATE",

    domain:
      "WEB_REST",

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
            true,

          escalationOnly:
            false,
        }),
      ]),

    proofRequirements:
      W01_WEB_APP_CREATE_PROOF_REQUIREMENTS,

    target(
      intent,
    ) {
      assertIntent(
        intent,
      );

      return Object.freeze({
        kind:
          "WEB_APP",

        canonicalId:
          ORDERS_WEB_APP_TARGET_CANONICAL_ID,

        displayName:
          ORDERS_WEB_APP_NAME,

        fixtureId:
          ORDERS_WEB_APP_FIXTURE_ID,

        generation:
          ORDERS_WEB_APP_GENERATION,
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

      const observed =
        await dependencies
          .readConfiguredApp(
            intent,
          );

      if (
        observed !==
          null
      ) {
        throw new ProofEngineError(
          "SAFETY_BLOCKED",
          "W01 refused because /meridian-lab/orders already exists. Automatic overwrite is forbidden.",
          {
            target:
              ORDERS_WEB_APP_NAME,
          },
        );
      }

      return preflightValue();
    },

    expectedDelta(
      intent,
      preflight,
    ) {
      assertIntent(
        intent,
      );

      if (
        preflight.observed !==
          "ABSENT"
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "W01 expected delta requires an absent authoritative prestate.",
        );
      }

      return Object.freeze({
        summary:
          "Create the exact allowlisted /meridian-lab/orders fixture disabled through official PUT /v2/web-app.",

        before:
          Object.freeze({
            present:
              false,
          }),

        after:
          Object.freeze({
            present:
              true,

            namespace:
              ORDERS_WEB_APP_NAMESPACE,

            enabled:
              false,

            dispatchClass:
              ORDERS_WEB_APP_DISPATCH_CLASS,

            resource:
              "",

            description:
              ORDERS_WEB_APP_DESCRIPTION_CREATE,
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

      if (
        preflight.observed !==
          "ABSENT"
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "W01 impact analysis requires an absent prestate.",
        );
      }

      return Object.freeze({
        certainty:
          "KNOWN" as const,

        summary:
          "W01 creates one isolated Meridian lab web application in a disabled state. It does not expose a generic management proxy and does not enable HTTP traffic.",

        affectedEntities:
          Object.freeze([
            Object.freeze({
              kind:
                "WEB_APP",

              canonicalId:
                ORDERS_WEB_APP_TARGET_CANONICAL_ID,

              displayName:
                ORDERS_WEB_APP_NAME,

              effect:
                "A new disabled IRIS web application definition is created.",
            }),
          ]),

        limitations:
          Object.freeze([
            "W01 proves configuration creation only; enabled request behavior is deliberately deferred to W03.",
            "The current meridian.runtime identity already holds %Admin_Secure:U standing authority; this receipt records that fact rather than claiming action-scoped escalation.",
          ]),
      });
    },

    digestPreflight(
      preflight,
    ) {
      return digestCanonicalJson(
        preflight,
      );
    },

    async revalidate(
      context:
        ActionContext,
      reviewed:
        ReviewedAction<
          W01WebAppCreateIntent,
          W01WebAppCreatePreflight
        >,
    ) {
      void context;

      assertIntent(
        reviewed.intent,
      );

      try {
        const observed =
          await dependencies
            .readConfiguredApp(
              reviewed.intent,
            );

        if (
          observed !==
            null
        ) {
          const fresh =
            preflightValue();

          return Object.freeze({
            outcome:
              "STALE" as const,

            freshPreflight:
              fresh,

            freshDigest:
              digestCanonicalJson({
                ...fresh,
                observedLiveTarget:
                  observed,
              }),

            reason:
              "W01 target appeared after review; zero mutation dispatched.",
          });
        }

        const fresh =
          preflightValue();

        const freshDigest =
          digestCanonicalJson(
            fresh,
          );

        if (
          freshDigest !==
            reviewed.reviewedPreflightDigest
        ) {
          return Object.freeze({
            outcome:
              "STALE" as const,

            freshPreflight:
              fresh,

            freshDigest,

            reason:
              "W01 fresh preflight digest differs from the reviewed digest.",
          });
        }

        return Object.freeze({
          outcome:
            "MATCH" as const,

          freshPreflight:
            fresh,

          freshDigest,
        });
      }
      catch (
        error
      ) {
        const denied =
          mapAuthorityDenied(
            error,
          );

        if (
          denied !==
            null
        ) {
          return denied;
        }

        throw error;
      }
    },

    async execute(
      context,
      ready,
    ) {
      void context;

      assertIntent(
        ready.intent,
      );

      if (
        ready.reviewedPreflightDigest !==
          ready.freshRevalidationDigest
      ) {
        throw new ProofEngineError(
          "STALE_PRECONDITION",
          "W01 execute refused because reviewed and fresh preflight digests differ.",
        );
      }

      try {
        await dependencies
          .executeCreate(
            ready.intent,
          );
      }
      catch (
        error
      ) {
        if (
          error instanceof
            WebAppMutationUnknownAfterDispatchError
        ) {
          throw new ProofEngineError(
            "UNKNOWN_AFTER_DISPATCH",
            error.message,
            {
              automaticRetry:
                false,
            },
          );
        }

        throw error;
      }

      const observed =
        await dependencies
          .readConfiguredApp(
            ready.intent,
          );

      if (
        observed ===
          null
      ) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          "W01 PUT returned success but authoritative readback is absent. Automatic retry is forbidden.",
          {
            automaticRetry:
              false,
          },
        );
      }

      try {
        return executionFromW01Readback(
          observed,
        );
      }
      catch (
        error
      ) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          `W01 PUT returned success but authoritative readback is not the frozen poststate: ${
            error instanceof Error
              ? error.message
              : "unknown mismatch"
          }`,
          {
            automaticRetry:
              false,
          },
        );
      }
    },

    async reconcileUnknown(
      context,
      reviewed,
    ) {
      void context;

      assertIntent(
        reviewed.intent,
      );

      const observed =
        await dependencies
          .readConfiguredApp(
            reviewed.intent,
          );

      return reconcileUnknownW01WebAppCreate(
        observed,
      );
    },

    async verify(
      context,
      execution,
    ) {
      const observed =
        await dependencies
          .readConfiguredApp(
            W01_WEB_APP_CREATE_INTENT,
          );

      if (
        observed ===
          null
      ) {
        throw new ProofEngineError(
          "PROOF_INCOMPLETE",
          "W01 verification could not read the created web application.",
        );
      }

      assertW01OrdersWebAppSnapshot(
        observed,
      );

      if (
        execution.configurationVerified !==
          true
      ) {
        throw new ProofEngineError(
          "PROOF_INCOMPLETE",
          "W01 execution did not carry verified configuration evidence.",
        );
      }

      return buildW01WebAppCreateProofResults({
        observedAtUtc:
          context.nowUtc,

        configurationVerified:
          true,

        configurationSourceReference:
          `${WEB_APP_READ_OPERATION}?name=${encodeURIComponent(ORDERS_WEB_APP_NAME)}`,

        configurationEvidenceDigest:
          digestCanonicalJson(
            observed,
          ),
      });
    },

    buildRecoveryPlan(
      execution,
      results,
    ) {
      void execution;
      void results;

      return Object.freeze({
        recoveryActionType:
          "WEB_APP_DELETE",

        automatic:
          false as const,

        summary:
          "Recovery is a separately reviewed W04-style delete only after fresh recovery preflight proves the exact fixture generation and authoritative current configuration.",
      });
    },
  };

  return Object.freeze(
    contract,
  );
}
