import {
  PROOF_CONTRACT_SCHEMA_VERSION,
  type ActionContext,
  type ProofContract,
  type ReconciliationDecision,
  type RevalidationDecision,
  type ReviewedAction,
} from "../../proof/contract";

import {
  certifyVerifiedAction,
  type VerifiedActionCertificationDependencies,
  type VerifiedActionCertificationResult,
} from "../../proof/certification-runner";

import {
  digestCanonicalJson,
} from "../../proof/digest";

import type {
  ProofRequirement,
  ProofResult,
} from "../../proof/evidence";

import {
  ProofEngineError,
} from "../../proof/errors";

import {
  WebAppAuthorityDeniedError,
  WebAppMutationUnknownAfterDispatchError,
} from "../../iris/web-app-action-transport";

import {
  ORDERS_WEB_APP_FIXTURE_ID,
  ORDERS_WEB_APP_GENERATION,
  ORDERS_WEB_APP_NAME,
  ORDERS_WEB_APP_TARGET_CANONICAL_ID,
  WEB_APP_READ_OPERATION,
  WEB_APP_WRITE_OPERATION,
  W02_ORDERS_WEB_APP_EXPECTED,
  W03_ORDERS_WEB_APP_EXPECTED,
  ordersWebAppSnapshotMatches,
  type OrdersWebAppSnapshot,
} from "./fixture";

export const W03_AUTHZ_RECOVERY_CONTRACT_ID =
  "meridian.web-rest.web-app-enable-authz-recovery.v1" as const;

export const W03_AUTHZ_RECOVERY_EXECUTION_SCHEMA_VERSION =
  "meridian.web-app-enable-authz-recovery-execution.v1" as const;

export interface OrdersWebAppRoutingState {
  readonly recurse:
    boolean;

  readonly cspZenEnabled:
    boolean;
}

export interface OrdersWebAppHttpObservation {
  readonly url:
    string;

  readonly status:
    number;
}

export interface W03AuthzRecoveryIntent {
  readonly actionId:
    "W03_WEB_APP_ENABLE_AUTHZ_RECOVERY";

  readonly recoveryOfActionId:
    "w03-web-app-enable-r3b-c-r2b-001";

  readonly fixtureGeneration:
    typeof ORDERS_WEB_APP_GENERATION;

  readonly desiredEnabled:
    false;

  readonly desiredCspZenEnabled:
    false;
}

export interface W03AuthzRecoveryPreflight {
  readonly schemaVersion:
    "meridian.web-app-enable-authz-recovery-preflight.v1";

  readonly targetCanonicalId:
    typeof ORDERS_WEB_APP_TARGET_CANONICAL_ID;

  readonly observed:
    OrdersWebAppSnapshot |
    null;

  readonly routing:
    OrdersWebAppRoutingState;

  readonly desired:
    OrdersWebAppSnapshot;

  readonly desiredRouting:
    OrdersWebAppRoutingState;

  readonly officialReadOperation:
    typeof WEB_APP_READ_OPERATION;

  readonly officialMutationOperation:
    typeof WEB_APP_WRITE_OPERATION;

  readonly requiredAuthority:
    "%Admin_Secure:U";

  readonly authorityMode:
    "CURRENT_STANDING_RUNTIME_AUTHORITY";
}

export interface W03AuthzRecoveryExecution {
  readonly schemaVersion:
    typeof W03_AUTHZ_RECOVERY_EXECUTION_SCHEMA_VERSION;

  readonly state:
    "APPLIED";

  readonly actionId:
    "W03_WEB_APP_ENABLE_AUTHZ_RECOVERY";

  readonly recoveryOfActionId:
    "w03-web-app-enable-r3b-c-r2b-001";

  readonly officialOperation:
    typeof WEB_APP_WRITE_OPERATION;

  readonly fixtureId:
    typeof ORDERS_WEB_APP_FIXTURE_ID;

  readonly generation:
    typeof ORDERS_WEB_APP_GENERATION;

  readonly webAppName:
    typeof ORDERS_WEB_APP_NAME;

  readonly before:
    OrdersWebAppSnapshot;

  readonly beforeRouting:
    OrdersWebAppRoutingState;

  readonly after:
    OrdersWebAppSnapshot;

  readonly afterRouting:
    OrdersWebAppRoutingState;

  readonly configurationVerified:
    true;

  readonly mutationRequestCount:
    1;

  readonly resolutionSource:
    "DIRECT_EXECUTION" |
    "AUTHORITATIVE_RECONCILIATION_READBACK";
}

export interface W03AuthzRecoveryContractDependencies {
  readonly readConfiguredApp:
    (
      intent:
        W03AuthzRecoveryIntent,
    ) => Promise<
      OrdersWebAppSnapshot |
      null
    >;

  readonly readRoutingState:
    (
      intent:
        W03AuthzRecoveryIntent,
    ) => Promise<
      OrdersWebAppRoutingState
    >;

  readonly executeRestore:
    (
      intent:
        W03AuthzRecoveryIntent,
    ) => Promise<void>;

  readonly observeDisabledHttp:
    (
      intent:
        W03AuthzRecoveryIntent,
    ) => Promise<
      OrdersWebAppHttpObservation
    >;
}

export interface W03AuthzRecoveryCertificationDependencies {
  readonly contract:
    W03AuthzRecoveryContractDependencies;

  readonly certification:
    VerifiedActionCertificationDependencies<
      W03AuthzRecoveryPreflight
    >;
}

export const W03_AUTHZ_RECOVERY_INTENT:
  W03AuthzRecoveryIntent =
  Object.freeze({
    actionId:
      "W03_WEB_APP_ENABLE_AUTHZ_RECOVERY" as const,

    recoveryOfActionId:
      "w03-web-app-enable-r3b-c-r2b-001" as const,

    fixtureGeneration:
      ORDERS_WEB_APP_GENERATION,

    desiredEnabled:
      false as const,

    desiredCspZenEnabled:
      false as const,
  });

const FAILED_CORRECTED_W03_ROUTING_STATE:
  OrdersWebAppRoutingState =
  Object.freeze({
    recurse:
      true,

    cspZenEnabled:
      true,
  });

const RESTORED_W02_ROUTING_STATE:
  OrdersWebAppRoutingState =
  Object.freeze({
    recurse:
      true,

    cspZenEnabled:
      false,
  });

export const W03_AUTHZ_RECOVERY_PROOF_REQUIREMENTS:
  readonly ProofRequirement[] =
  Object.freeze([
    Object.freeze({
      requirementId:
        "w03-authz-recovery-configuration-readback",

      plane:
        "CONFIGURATION_READBACK",

      applicability:
        "REQUIRED",

      description:
        "Authoritative SysAdmin readback proves the failed corrected W03 applied state was compensated back to the exact disabled W02 configuration, including CSPZENEnabled=true back to false.",

      source:
        "IRIS SysAdmin API GET /v2/web-app",
    }),

    Object.freeze({
      requirementId:
        "w03-authz-recovery-http-disabled",

      plane:
        "HTTP_BEHAVIOR",

      applicability:
        "REQUIRED",

      description:
        "After recovery, the disabled Meridian orders fixture must not expose a successful /health endpoint.",

      source:
        "IRIS CSP/REST live HTTP GET",
    }),
  ]);

function assertIntent(
  intent:
    W03AuthzRecoveryIntent,
): void {
  if (
    intent.actionId !==
      "W03_WEB_APP_ENABLE_AUTHZ_RECOVERY" ||
    intent.recoveryOfActionId !==
      "w03-web-app-enable-r3b-c-r2b-001" ||
    intent.fixtureGeneration !==
      ORDERS_WEB_APP_GENERATION ||
    intent.desiredEnabled !==
      false ||
    intent.desiredCspZenEnabled !==
      false
  ) {
    throw new ProofEngineError(
      "INVALID_TARGET",
      "W03 recovery intent does not match the frozen compensating restoration.",
    );
  }
}

function routingMatches(
  observed:
    OrdersWebAppRoutingState,
  expected:
    OrdersWebAppRoutingState,
): boolean {
  return (
    observed.recurse ===
      expected.recurse &&
    observed.cspZenEnabled ===
      expected.cspZenEnabled
  );
}

function preflightValue(
  observed:
    OrdersWebAppSnapshot |
    null,
  routing:
    OrdersWebAppRoutingState,
): W03AuthzRecoveryPreflight {
  return Object.freeze({
    schemaVersion:
      "meridian.web-app-enable-authz-recovery-preflight.v1" as const,

    targetCanonicalId:
      ORDERS_WEB_APP_TARGET_CANONICAL_ID,

    observed,

    routing,

    desired:
      W02_ORDERS_WEB_APP_EXPECTED,

    desiredRouting:
      RESTORED_W02_ROUTING_STATE,

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

function assertFailedW03State(
  observed:
    OrdersWebAppSnapshot |
    null,
  routing:
    OrdersWebAppRoutingState,
): asserts observed is OrdersWebAppSnapshot {
  if (
    observed ===
      null ||
    !ordersWebAppSnapshotMatches(
      observed,
      W03_ORDERS_WEB_APP_EXPECTED,
    ) ||
    !routingMatches(
      routing,
      FAILED_CORRECTED_W03_ROUTING_STATE,
    )
  ) {
    throw new ProofEngineError(
      "SAFETY_BLOCKED",
      "W03 authorization recovery requires the exact applied-but-unverified corrected state: Enabled=true, Recurse=true, CSPZENEnabled=true, stage=updated.",
    );
  }
}

function restoredW02StateMatches(
  observed:
    OrdersWebAppSnapshot |
    null,
  routing:
    OrdersWebAppRoutingState,
): observed is OrdersWebAppSnapshot {
  return (
    observed !==
      null &&
    ordersWebAppSnapshotMatches(
      observed,
      W02_ORDERS_WEB_APP_EXPECTED,
    ) &&
    routingMatches(
      routing,
      RESTORED_W02_ROUTING_STATE,
    )
  );
}

function recoveryExecution(
  source:
    W03AuthzRecoveryExecution["resolutionSource"],
): W03AuthzRecoveryExecution {
  return Object.freeze({
    schemaVersion:
      W03_AUTHZ_RECOVERY_EXECUTION_SCHEMA_VERSION,

    state:
      "APPLIED" as const,

    actionId:
      "W03_WEB_APP_ENABLE_AUTHZ_RECOVERY" as const,

    recoveryOfActionId:
      "w03-web-app-enable-r3b-c-r2b-001" as const,

    officialOperation:
      WEB_APP_WRITE_OPERATION,

    fixtureId:
      ORDERS_WEB_APP_FIXTURE_ID,

    generation:
      ORDERS_WEB_APP_GENERATION,

    webAppName:
      ORDERS_WEB_APP_NAME,

    before:
      W03_ORDERS_WEB_APP_EXPECTED,

    beforeRouting:
      FAILED_CORRECTED_W03_ROUTING_STATE,

    after:
      W02_ORDERS_WEB_APP_EXPECTED,

    afterRouting:
      RESTORED_W02_ROUTING_STATE,

    configurationVerified:
      true as const,

    mutationRequestCount:
      1 as const,

    resolutionSource:
      source,
  });
}

export function reconcileUnknownW03AuthzRecovery(
  observed:
    OrdersWebAppSnapshot |
    null,
  routing:
    OrdersWebAppRoutingState,
): ReconciliationDecision<
  W03AuthzRecoveryExecution
> {
  if (
    restoredW02StateMatches(
      observed,
      routing,
    )
  ) {
    return Object.freeze({
      outcome:
        "APPLIED" as const,

      execution:
        recoveryExecution(
          "AUTHORITATIVE_RECONCILIATION_READBACK",
        ),
    });
  }

  if (
    observed !==
      null &&
    ordersWebAppSnapshotMatches(
      observed,
      W03_ORDERS_WEB_APP_EXPECTED,
    ) &&
    routingMatches(
      routing,
      FAILED_CORRECTED_W03_ROUTING_STATE,
    )
  ) {
    return Object.freeze({
      outcome:
        "NOT_APPLIED" as const,

      reason:
        "AUTHORITATIVE_READBACK_CONFIRMED_FAILED_W03_PRESTATE",
    });
  }

  return Object.freeze({
    outcome:
      "STILL_UNKNOWN" as const,

    reason:
      "AUTHORITATIVE_READBACK_MATCHED_NEITHER_EXACT_FAILED_W03_STATE_NOR_EXACT_RESTORED_W02_STATE",
  });
}

function mapAuthorityDenied(
  error:
    unknown,
): RevalidationDecision<
  W03AuthzRecoveryPreflight
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

function buildProofResults(
  input: {
    readonly observedAtUtc:
      string;

    readonly configurationDigest:
      string;

    readonly http:
      OrdersWebAppHttpObservation;

    readonly httpDigest:
      string;
  },
): readonly ProofResult[] {
  const configuration =
    W03_AUTHZ_RECOVERY_PROOF_REQUIREMENTS[
      0
    ];

  const http =
    W03_AUTHZ_RECOVERY_PROOF_REQUIREMENTS[
      1
    ];

  if (
    configuration ===
      undefined ||
    http ===
      undefined
  ) {
    throw new Error(
      "W03 recovery proof registry is incomplete.",
    );
  }

  if (
    input.http.status !==
      404
  ) {
    throw new ProofEngineError(
      "PROOF_INCOMPLETE",
      `Recovered disabled application must return HTTP 404 for /health; observed ${input.http.status}.`,
    );
  }

  return Object.freeze([
    Object.freeze({
      requirementId:
        configuration.requirementId,

      plane:
        configuration.plane,

      applicability:
        configuration.applicability,

      status:
        "PASS" as const,

      sourceType:
        configuration.source,

      sourceReference:
        `${WEB_APP_READ_OPERATION}?name=${encodeURIComponent(ORDERS_WEB_APP_NAME)}`,

      observedAtUtc:
        input.observedAtUtc,

      expectedSummary:
        configuration.description,

      observedSummary:
        "Authoritative readback matches exact W02 disabled configuration with Recurse=true and CSPZENEnabled=false.",

      provenance:
        "AUTHORITATIVE_IRIS" as const,

      safeEvidenceDigest:
        input.configurationDigest,
    }),

    Object.freeze({
      requirementId:
        http.requirementId,

      plane:
        http.plane,

      applicability:
        http.applicability,

      status:
        "PASS" as const,

      sourceType:
        http.source,

      sourceReference:
        input.http.url,

      observedAtUtc:
        input.observedAtUtc,

      expectedSummary:
        http.description,

      observedSummary:
        "Disabled /health observation returned the exact expected HTTP 404.",

      provenance:
        "AUTHORITATIVE_IRIS" as const,

      safeEvidenceDigest:
        input.httpDigest,
    }),
  ]);
}

export function createW03AuthzRecoveryProofContract(
  dependencies:
    W03AuthzRecoveryContractDependencies,
): ProofContract<
  W03AuthzRecoveryIntent,
  W03AuthzRecoveryPreflight,
  W03AuthzRecoveryExecution
> {
  const contract:
    ProofContract<
      W03AuthzRecoveryIntent,
      W03AuthzRecoveryPreflight,
      W03AuthzRecoveryExecution
    > = {
    schemaVersion:
      PROOF_CONTRACT_SCHEMA_VERSION,

    contractId:
      W03_AUTHZ_RECOVERY_CONTRACT_ID,

    contractVersion:
      1,

    actionType:
      "WEB_APP_ENABLE_RECOVERY",

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
      W03_AUTHZ_RECOVERY_PROOF_REQUIREMENTS,

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

      const routing =
        await dependencies
          .readRoutingState(
            intent,
          );

      assertFailedW03State(
        observed,
        routing,
      );

      return preflightValue(
        observed,
        routing,
      );
    },

    expectedDelta(
      intent,
      preflight,
    ) {
      assertIntent(
        intent,
      );

      assertFailedW03State(
        preflight.observed,
        preflight.routing,
      );

      return Object.freeze({
        summary:
          "Compensate the failed corrected W03 attempt by restoring Enabled=true to false and CSPZENEnabled=true to false through official PUT /v2/web-app, preserving stage=updated and Recurse=true.",

        before:
          Object.freeze({
            present:
              true,
            enabled:
              true,
            recurse:
              true,
            cspZenEnabled:
              true,
            description:
              W03_ORDERS_WEB_APP_EXPECTED.description,
          }),

        after:
          Object.freeze({
            present:
              true,
            enabled:
              false,
            recurse:
              true,
            cspZenEnabled:
              false,
            description:
              W02_ORDERS_WEB_APP_EXPECTED.description,
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

      assertFailedW03State(
        preflight.observed,
        preflight.routing,
      );

      return Object.freeze({
        certainty:
          "KNOWN" as const,

        summary:
          "This compensating action removes exposure of the failed corrected W03 fixture and restores the exact W02 disabled predecessor state. It does not retry W03 and does not grant application roles.",

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
                "Enabled changes from true back to false and CSPZENEnabled changes from true back to false; Recurse remains true.",
            }),
          ]),

        limitations:
          Object.freeze([
            "This recovery does not certify W03.",
            "This recovery restores CSPZENEnabled=false so the exact W02 predecessor can be re-established before the final authorization-corrected W03 contract is reviewed.",
            "A later corrected W03 action requires a new preflight, review, revalidation, mutation, configuration proof, HTTP behavior proof, and receipt.",
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
          W03AuthzRecoveryIntent,
          W03AuthzRecoveryPreflight
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

        const routing =
          await dependencies
            .readRoutingState(
              reviewed.intent,
            );

        const fresh =
          preflightValue(
            observed,
            routing,
          );

        const freshDigest =
          digestCanonicalJson(
            fresh,
          );

        if (
          observed ===
            null ||
          !ordersWebAppSnapshotMatches(
            observed,
            W03_ORDERS_WEB_APP_EXPECTED,
          ) ||
          !routingMatches(
            routing,
            FAILED_CORRECTED_W03_ROUTING_STATE,
          )
        ) {
          return Object.freeze({
            outcome:
              "STALE" as const,

            freshPreflight:
              fresh,

            freshDigest,

            reason:
              "W03 authorization recovery target changed after review; zero compensating mutation dispatched.",
          });
        }

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
              "W03 authorization recovery fresh preflight digest differs from the reviewed digest.",
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
          "W03 authorization recovery execute refused because reviewed and fresh preflight digests differ.",
        );
      }

      try {
        await dependencies
          .executeRestore(
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

      const routing =
        await dependencies
          .readRoutingState(
            ready.intent,
          );

      if (
        !restoredW02StateMatches(
          observed,
          routing,
        )
      ) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          "W03 authorization compensating PUT returned success but authoritative state is not exact W02. Automatic retry is forbidden.",
          {
            automaticRetry:
              false,
          },
        );
      }

      return recoveryExecution(
        "DIRECT_EXECUTION",
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

      const observed =
        await dependencies
          .readConfiguredApp(
            reviewed.intent,
          );

      const routing =
        await dependencies
          .readRoutingState(
            reviewed.intent,
          );

      return reconcileUnknownW03AuthzRecovery(
        observed,
        routing,
      );
    },

    async verify(
      context,
      executionResult,
    ) {
      const observed =
        await dependencies
          .readConfiguredApp(
            W03_AUTHZ_RECOVERY_INTENT,
          );

      const routing =
        await dependencies
          .readRoutingState(
            W03_AUTHZ_RECOVERY_INTENT,
          );

      if (
        executionResult.configurationVerified !==
          true ||
        !restoredW02StateMatches(
          observed,
          routing,
        )
      ) {
        throw new ProofEngineError(
          "PROOF_INCOMPLETE",
          "W03 authorization recovery authoritative configuration readback does not prove exact W02 restoration.",
        );
      }

      const http =
        await dependencies
          .observeDisabledHttp(
            W03_AUTHZ_RECOVERY_INTENT,
          );

      return buildProofResults({
        observedAtUtc:
          context.nowUtc,

        configurationDigest:
          digestCanonicalJson({
            observed,
            routing,
          }),

        http,

        httpDigest:
          digestCanonicalJson(
            http,
          ),
      });
    },

    buildRecoveryPlan(
      executionResult,
      results,
    ) {
      void executionResult;
      void results;

      return Object.freeze({
        recoveryActionType:
          null,

        automatic:
          false as const,

        summary:
          "This receipt is the bounded compensating recovery for the failed corrected W03 authorization attempt. Further changes require a new Proof Contract.",
      });
    },
  };

  return Object.freeze(
    contract,
  );
}

export async function certifyW03AuthzRecoveryAction(
  input: {
    readonly intent:
      W03AuthzRecoveryIntent;

    readonly actionId:
      string;

    readonly receiptId:
      string;

    readonly logicalActor:
      string;

    readonly irisRuntimeUser:
      string;
  },
  dependencies:
    W03AuthzRecoveryCertificationDependencies,
): Promise<
  VerifiedActionCertificationResult<
    W03AuthzRecoveryExecution
  >
> {
  return certifyVerifiedAction(
    {
      contract:
        createW03AuthzRecoveryProofContract(
          dependencies.contract,
        ),

      intent:
        input.intent,

      actionId:
        input.actionId,

      receiptId:
        input.receiptId,

      parentChangeSetId:
        null,

      logicalActor:
        input.logicalActor,

      irisRuntimeUser:
        input.irisRuntimeUser,
    },
    dependencies.certification,
  );
}
