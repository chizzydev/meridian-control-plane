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
  ORDERS_WEB_APP_DESCRIPTION_CREATE,
  ORDERS_WEB_APP_DESCRIPTION_UPDATE,
  ORDERS_WEB_APP_FIXTURE_ID,
  ORDERS_WEB_APP_GENERATION,
  ORDERS_WEB_APP_NAME,
  ORDERS_WEB_APP_TARGET_CANONICAL_ID,
  WEB_APP_READ_OPERATION,
  WEB_APP_WRITE_OPERATION,
  W01_ORDERS_WEB_APP_EXPECTED,
  W02_ORDERS_WEB_APP_EXPECTED,
  assertW02OrdersWebAppSnapshot,
  ordersWebAppSnapshotMatches,
  type OrdersWebAppSnapshot,
} from "./fixture";

export const W02_WEB_APP_UPDATE_CONTRACT_ID =
  "meridian.web-rest.web-app-update.v1" as const;

export const W02_WEB_APP_UPDATE_EXECUTION_SCHEMA_VERSION =
  "meridian.web-app-update-execution.v1" as const;

export interface W02WebAppUpdateIntent {
  readonly actionId:
    "W02_WEB_APP_UPDATE";

  readonly fixtureGeneration:
    typeof ORDERS_WEB_APP_GENERATION;

  readonly expectedFromDescription:
    typeof ORDERS_WEB_APP_DESCRIPTION_CREATE;

  readonly desiredDescription:
    typeof ORDERS_WEB_APP_DESCRIPTION_UPDATE;
}

export interface W02WebAppUpdatePreflight {
  readonly schemaVersion:
    "meridian.web-app-update-preflight.v1";

  readonly targetCanonicalId:
    typeof ORDERS_WEB_APP_TARGET_CANONICAL_ID;

  readonly observed:
    OrdersWebAppSnapshot |
    null;

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

export interface W02WebAppUpdateExecution {
  readonly schemaVersion:
    typeof W02_WEB_APP_UPDATE_EXECUTION_SCHEMA_VERSION;

  readonly state:
    "APPLIED";

  readonly actionId:
    "W02_WEB_APP_UPDATE";

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

  readonly after:
    OrdersWebAppSnapshot;

  readonly configurationVerified:
    true;

  readonly mutationRequestCount:
    1;

  readonly resolutionSource:
    "DIRECT_EXECUTION" |
    "AUTHORITATIVE_RECONCILIATION_READBACK";
}

export interface W02WebAppUpdateContractDependencies {
  readonly readConfiguredApp:
    (
      intent:
        W02WebAppUpdateIntent,
    ) => Promise<
      OrdersWebAppSnapshot |
      null
    >;

  readonly executeUpdate:
    (
      intent:
        W02WebAppUpdateIntent,
    ) => Promise<void>;
}

export interface W02WebAppUpdateCertificationDependencies {
  readonly contract:
    W02WebAppUpdateContractDependencies;

  readonly certification:
    VerifiedActionCertificationDependencies<
      W02WebAppUpdatePreflight
    >;
}

export const W02_WEB_APP_UPDATE_INTENT:
  W02WebAppUpdateIntent =
  Object.freeze({
    actionId:
      "W02_WEB_APP_UPDATE" as const,

    fixtureGeneration:
      ORDERS_WEB_APP_GENERATION,

    expectedFromDescription:
      ORDERS_WEB_APP_DESCRIPTION_CREATE,

    desiredDescription:
      ORDERS_WEB_APP_DESCRIPTION_UPDATE,
  });

export const W02_WEB_APP_UPDATE_PROOF_REQUIREMENTS:
  readonly ProofRequirement[] =
  Object.freeze([
    Object.freeze({
      requirementId:
        "w02-web-app-configuration-readback",

      plane:
        "CONFIGURATION_READBACK",

      applicability:
        "REQUIRED",

      description:
        "Authoritative SysAdmin readback proves /meridian-lab/orders moved from the exact W01 configuration to the exact W02 updated configuration while remaining disabled.",

      source:
        "IRIS SysAdmin API GET /v2/web-app",
    }),

    Object.freeze({
      requirementId:
        "w02-web-app-http-behavior",

      plane:
        "HTTP_BEHAVIOR",

      applicability:
        "NOT_APPLICABLE",

      description:
        "W02 preserves Enabled=false. Enabled HTTP behavior is certified separately by W03.",

      source:
        "Meridian W03 HTTP behavior probe",
    }),
  ]);

function assertIntent(
  intent:
    W02WebAppUpdateIntent,
): void {
  if (
    intent.actionId !==
      "W02_WEB_APP_UPDATE" ||
    intent.fixtureGeneration !==
      ORDERS_WEB_APP_GENERATION ||
    intent.expectedFromDescription !==
      ORDERS_WEB_APP_DESCRIPTION_CREATE ||
    intent.desiredDescription !==
      ORDERS_WEB_APP_DESCRIPTION_UPDATE
  ) {
    throw new ProofEngineError(
      "INVALID_TARGET",
      "W02 intent does not match the frozen /meridian-lab/orders update.",
    );
  }
}

function preflightValue(
  observed:
    OrdersWebAppSnapshot |
    null,
): W02WebAppUpdatePreflight {
  return Object.freeze({
    schemaVersion:
      "meridian.web-app-update-preflight.v1" as const,

    targetCanonicalId:
      ORDERS_WEB_APP_TARGET_CANONICAL_ID,

    observed,

    desired:
      W02_ORDERS_WEB_APP_EXPECTED,

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
  W02WebAppUpdatePreflight
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

function execution(
  source:
    W02WebAppUpdateExecution["resolutionSource"],
): W02WebAppUpdateExecution {
  return Object.freeze({
    schemaVersion:
      W02_WEB_APP_UPDATE_EXECUTION_SCHEMA_VERSION,

    state:
      "APPLIED" as const,

    actionId:
      "W02_WEB_APP_UPDATE" as const,

    officialOperation:
      WEB_APP_WRITE_OPERATION,

    fixtureId:
      ORDERS_WEB_APP_FIXTURE_ID,

    generation:
      ORDERS_WEB_APP_GENERATION,

    webAppName:
      ORDERS_WEB_APP_NAME,

    before:
      W01_ORDERS_WEB_APP_EXPECTED,

    after:
      W02_ORDERS_WEB_APP_EXPECTED,

    configurationVerified:
      true as const,

    mutationRequestCount:
      1 as const,

    resolutionSource:
      source,
  });
}

export function executionFromW02Readback(
  observed:
    OrdersWebAppSnapshot,
): W02WebAppUpdateExecution {
  assertW02OrdersWebAppSnapshot(
    observed,
  );

  return execution(
    "DIRECT_EXECUTION",
  );
}

export function reconcileUnknownW02WebAppUpdate(
  observed:
    OrdersWebAppSnapshot |
    null,
): ReconciliationDecision<
  W02WebAppUpdateExecution
> {
  if (
    observed !==
      null &&
    ordersWebAppSnapshotMatches(
      observed,
      W02_ORDERS_WEB_APP_EXPECTED,
    )
  ) {
    return Object.freeze({
      outcome:
        "APPLIED" as const,

      execution:
        execution(
          "AUTHORITATIVE_RECONCILIATION_READBACK",
        ),
    });
  }

  if (
    observed !==
      null &&
    ordersWebAppSnapshotMatches(
      observed,
      W01_ORDERS_WEB_APP_EXPECTED,
    )
  ) {
    return Object.freeze({
      outcome:
        "NOT_APPLIED" as const,

      reason:
        "AUTHORITATIVE_READBACK_CONFIRMED_EXACT_W01_PRESTATE",
    });
  }

  return Object.freeze({
    outcome:
      "STILL_UNKNOWN" as const,

    reason:
      observed ===
        null
        ? "AUTHORITATIVE_READBACK_TARGET_ABSENT_AFTER_W02_DISPATCH"
        : "AUTHORITATIVE_READBACK_MATCHED_NEITHER_EXACT_W01_PRESTATE_NOR_EXACT_W02_POSTSTATE",
  });
}

function buildW02ProofResults(
  input: {
    readonly observedAtUtc:
      string;

    readonly configurationEvidenceDigest:
      string;
  },
): readonly ProofResult[] {
  const configuration =
    W02_WEB_APP_UPDATE_PROOF_REQUIREMENTS[
      0
    ];

  const http =
    W02_WEB_APP_UPDATE_PROOF_REQUIREMENTS[
      1
    ];

  if (
    configuration ===
      undefined ||
    http ===
      undefined
  ) {
    throw new Error(
      "W02 proof requirement registry is incomplete.",
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
        "Authoritative readback matches the exact disabled W02 web-app configuration.",

      provenance:
        "AUTHORITATIVE_IRIS" as const,

      safeEvidenceDigest:
        input.configurationEvidenceDigest,
    }),

    Object.freeze({
      requirementId:
        http.requirementId,

      plane:
        http.plane,

      applicability:
        http.applicability,

      status:
        "NOT_APPLICABLE" as const,

      sourceType:
        http.source,

      sourceReference:
        null,

      observedAtUtc:
        null,

      expectedSummary:
        http.description,

      observedSummary:
        "W02 deliberately keeps the fixture disabled and makes no enabled HTTP behavior claim.",

      provenance:
        "NOT_APPLICABLE" as const,

      safeEvidenceDigest:
        null,
    }),
  ]);
}

export function createW02WebAppUpdateProofContract(
  dependencies:
    W02WebAppUpdateContractDependencies,
): ProofContract<
  W02WebAppUpdateIntent,
  W02WebAppUpdatePreflight,
  W02WebAppUpdateExecution
> {
  const contract:
    ProofContract<
      W02WebAppUpdateIntent,
      W02WebAppUpdatePreflight,
      W02WebAppUpdateExecution
    > = {
    schemaVersion:
      PROOF_CONTRACT_SCHEMA_VERSION,

    contractId:
      W02_WEB_APP_UPDATE_CONTRACT_ID,

    contractVersion:
      1,

    actionType:
      "WEB_APP_UPDATE",

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
      W02_WEB_APP_UPDATE_PROOF_REQUIREMENTS,

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
        observed ===
          null
      ) {
        throw new ProofEngineError(
          "SAFETY_BLOCKED",
          "W02 refused because /meridian-lab/orders is absent. W02 requires the exact certified W01 poststate.",
        );
      }

      if (
        !ordersWebAppSnapshotMatches(
          observed,
          W01_ORDERS_WEB_APP_EXPECTED,
        )
      ) {
        throw new ProofEngineError(
          "SAFETY_BLOCKED",
          "W02 refused because the authoritative prestate is not the exact certified W01 poststate.",
        );
      }

      return preflightValue(
        observed,
      );
    },

    expectedDelta(
      intent,
      preflight,
    ) {
      assertIntent(
        intent,
      );

      if (
        preflight.observed ===
          null ||
        !ordersWebAppSnapshotMatches(
          preflight.observed,
          W01_ORDERS_WEB_APP_EXPECTED,
        )
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "W02 expected delta requires the exact W01 predecessor state.",
        );
      }

      return Object.freeze({
        summary:
          "Update only the frozen Meridian lab fixture description from stage=created to stage=updated through official PUT /v2/web-app while preserving Enabled=false and all canonical identity fields.",

        before:
          Object.freeze({
            present:
              true,
            enabled:
              false,
            namespace:
              W01_ORDERS_WEB_APP_EXPECTED.namespace,
            resource:
              W01_ORDERS_WEB_APP_EXPECTED.resource,
            dispatchClass:
              W01_ORDERS_WEB_APP_EXPECTED.dispatchClass,
            description:
              ORDERS_WEB_APP_DESCRIPTION_CREATE,
          }),

        after:
          Object.freeze({
            present:
              true,
            enabled:
              false,
            namespace:
              W02_ORDERS_WEB_APP_EXPECTED.namespace,
            resource:
              W02_ORDERS_WEB_APP_EXPECTED.resource,
            dispatchClass:
              W02_ORDERS_WEB_APP_EXPECTED.dispatchClass,
            description:
              ORDERS_WEB_APP_DESCRIPTION_UPDATE,
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
        preflight.observed ===
          null ||
        !ordersWebAppSnapshotMatches(
          preflight.observed,
          W01_ORDERS_WEB_APP_EXPECTED,
        )
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "W02 impact analysis requires the exact W01 predecessor state.",
        );
      }

      return Object.freeze({
        certainty:
          "KNOWN" as const,

        summary:
          "W02 changes only description metadata on the isolated Meridian lab web application. Enabled remains false and canonical identity fields are preserved.",

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
                "Description changes from stage=created to stage=updated while Enabled remains false.",
            }),
          ]),

        limitations:
          Object.freeze([
            "W02 makes no enabled HTTP behavior claim because the fixture remains disabled.",
            "The current meridian.runtime identity holds %Admin_Secure:U as standing authority.",
            "No verified recovery is claimed by W02; a compensating update requires its own review and proof.",
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
          W02WebAppUpdateIntent,
          W02WebAppUpdatePreflight
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

        const fresh =
          preflightValue(
            observed,
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
            W01_ORDERS_WEB_APP_EXPECTED,
          )
        ) {
          return Object.freeze({
            outcome:
              "STALE" as const,
            freshPreflight:
              fresh,
            freshDigest,
            reason:
              "W02 authoritative target state changed after review; zero mutation dispatched.",
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
              "W02 fresh preflight digest differs from the reviewed digest.",
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
          "W02 execute refused because reviewed and fresh preflight digests differ.",
        );
      }

      try {
        await dependencies
          .executeUpdate(
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
          "W02 PUT returned success but authoritative readback is absent. Automatic retry is forbidden.",
          {
            automaticRetry:
              false,
          },
        );
      }

      try {
        return executionFromW02Readback(
          observed,
        );
      }
      catch (
        error
      ) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          `W02 PUT returned success but authoritative readback is not the exact W02 poststate: ${
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

      return reconcileUnknownW02WebAppUpdate(
        observed,
      );
    },

    async verify(
      context,
      executionResult,
    ) {
      const observed =
        await dependencies
          .readConfiguredApp(
            W02_WEB_APP_UPDATE_INTENT,
          );

      if (
        observed ===
          null
      ) {
        throw new ProofEngineError(
          "PROOF_INCOMPLETE",
          "W02 verification could not read the updated web application.",
        );
      }

      assertW02OrdersWebAppSnapshot(
        observed,
      );

      if (
        executionResult.configurationVerified !==
          true
      ) {
        throw new ProofEngineError(
          "PROOF_INCOMPLETE",
          "W02 execution did not carry verified configuration evidence.",
        );
      }

      return buildW02ProofResults({
        observedAtUtc:
          context.nowUtc,

        configurationEvidenceDigest:
          digestCanonicalJson(
            observed,
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
          "W02 does not claim verified recovery. A compensating update must be separately reviewed, freshly revalidated, executed, verified, and receipted.",
      });
    },
  };

  return Object.freeze(
    contract,
  );
}

export async function certifyW02WebAppUpdateAction(
  input: {
    readonly intent:
      W02WebAppUpdateIntent;

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
    W02WebAppUpdateCertificationDependencies,
): Promise<
  VerifiedActionCertificationResult<
    W02WebAppUpdateExecution
  >
> {
  return certifyVerifiedAction(
    {
      contract:
        createW02WebAppUpdateProofContract(
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
