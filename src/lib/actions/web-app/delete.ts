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
  type OrdersWebAppHealthProbe,
  type OrdersWebAppMatchRoleBinding,
  type OrdersWebAppObservedState,
  type OrdersWebAppRoutingState,
} from "../../iris/web-app-action-transport";

import {
  ORDERS_WEB_APP_FIXTURE_ID,
  ORDERS_WEB_APP_GENERATION,
  ORDERS_WEB_APP_HELPER_EXECUTION_ROLE,
  ORDERS_WEB_APP_NAME,
  ORDERS_WEB_APP_TARGET_CANONICAL_ID,
  WEB_APP_DELETE_OPERATION,
  WEB_APP_READ_OPERATION,
  W03_ORDERS_WEB_APP_EXPECTED,
  ordersWebAppSnapshotMatches,
} from "./fixture";

import {
  W03_WEB_APP_MATCH_ROLES,
  W03_WEB_APP_ROUTING_STATE,
} from "./enable";

export const W04_WEB_APP_DELETE_CONTRACT_ID =
  "meridian.web-rest.web-app-delete.v1" as const;

export const W04_WEB_APP_DELETE_EXECUTION_SCHEMA_VERSION =
  "meridian.web-app-delete-execution.v1" as const;

export const W04_WEB_APP_DELETE_DELTA_SUMMARY =
  "Delete only the frozen /meridian-lab/orders web-application registration through official DELETE /v2/web-app. Exact final W03 is required before dispatch. The REST class and helper role are not deleted. Closure requires authoritative configuration absence plus HTTP 404 behavior." as const;

export interface W04WebAppDeleteIntent {
  readonly actionId:
    "W04_WEB_APP_DELETE";

  readonly fixtureGeneration:
    typeof ORDERS_WEB_APP_GENERATION;
}

export interface W04WebAppDeletePreflight {
  readonly schemaVersion:
    "meridian.web-app-delete-preflight.v1";

  readonly targetCanonicalId:
    typeof ORDERS_WEB_APP_TARGET_CANONICAL_ID;

  readonly observed:
    OrdersWebAppObservedState;

  readonly preDeleteHealth:
    OrdersWebAppHealthProbe;

  readonly officialReadOperation:
    typeof WEB_APP_READ_OPERATION;

  readonly officialMutationOperation:
    typeof WEB_APP_DELETE_OPERATION;

  readonly requiredAuthority:
    "%Admin_Secure:U";

  readonly authorityMode:
    "CURRENT_STANDING_RUNTIME_AUTHORITY";
}

export interface W04WebAppDeleteExecution {
  readonly schemaVersion:
    typeof W04_WEB_APP_DELETE_EXECUTION_SCHEMA_VERSION;

  readonly state:
    "APPLIED";

  readonly actionId:
    "W04_WEB_APP_DELETE";

  readonly officialOperation:
    typeof WEB_APP_DELETE_OPERATION;

  readonly fixtureId:
    typeof ORDERS_WEB_APP_FIXTURE_ID;

  readonly generation:
    typeof ORDERS_WEB_APP_GENERATION;

  readonly webAppName:
    typeof ORDERS_WEB_APP_NAME;

  readonly before:
    OrdersWebAppObservedState;

  readonly afterPresent:
    false;

  readonly absenceVerified:
    true;

  readonly mutationRequestCount:
    1;

  readonly resolutionSource:
    "DIRECT_EXECUTION" |
    "AUTHORITATIVE_RECONCILIATION_READBACK";
}

export interface W04WebAppDeleteContractDependencies {
  readonly readState:
    (
      intent:
        W04WebAppDeleteIntent,
    ) => Promise<
      OrdersWebAppObservedState
    >;

  readonly executeDelete:
    (
      intent:
        W04WebAppDeleteIntent,
    ) => Promise<void>;

  readonly probeHealth:
    (
      intent:
        W04WebAppDeleteIntent,
    ) => Promise<
      OrdersWebAppHealthProbe
    >;
}

export interface W04WebAppDeleteCertificationDependencies {
  readonly contract:
    W04WebAppDeleteContractDependencies;

  readonly certification:
    VerifiedActionCertificationDependencies<
      W04WebAppDeletePreflight
    >;
}

export const W04_WEB_APP_DELETE_INTENT:
  W04WebAppDeleteIntent =
  Object.freeze({
    actionId:
      "W04_WEB_APP_DELETE" as const,

    fixtureGeneration:
      ORDERS_WEB_APP_GENERATION,
  });

export const W04_WEB_APP_DELETE_PROOF_REQUIREMENTS:
  readonly ProofRequirement[] =
  Object.freeze([
    Object.freeze({
      requirementId:
        "w04-web-app-configuration-absence",

      plane:
        "CONFIGURATION_READBACK",

      applicability:
        "REQUIRED",

      description:
        "Authoritative SysAdmin GET /v2/web-app proves the frozen /meridian-lab/orders application registration is absent after DELETE.",

      source:
        "IRIS SysAdmin API GET /v2/web-app",
    }),

    Object.freeze({
      requirementId:
        "w04-web-app-http-absence",

      plane:
        "HTTP_BEHAVIOR",

      applicability:
        "REQUIRED",

      description:
        "Live same-instance HTTP GET /meridian-lab/orders/health returns exact HTTP 404 after the application registration is deleted.",

      source:
        "IRIS CSP/REST live HTTP GET",
    }),
  ]);

function assertIntent(
  intent:
    W04WebAppDeleteIntent,
): void {
  if (
    intent.actionId !==
      "W04_WEB_APP_DELETE" ||
    intent.fixtureGeneration !==
      ORDERS_WEB_APP_GENERATION
  ) {
    throw new ProofEngineError(
      "INVALID_TARGET",
      "W04 intent does not match the frozen /meridian-lab/orders delete action.",
    );
  }
}

function routingMatches(
  observed:
    OrdersWebAppRoutingState |
    null,
  expected:
    OrdersWebAppRoutingState,
): observed is OrdersWebAppRoutingState {
  return (
    observed !==
      null &&
    observed.recurse ===
      expected.recurse &&
    observed.cspZenEnabled ===
      expected.cspZenEnabled
  );
}

function matchRolesMatch(
  observed:
    readonly OrdersWebAppMatchRoleBinding[] |
    null,
  expected:
    readonly OrdersWebAppMatchRoleBinding[],
): boolean {
  if (
    observed ===
      null ||
    observed.length !==
      expected.length
  ) {
    return false;
  }

  for (
    let index =
      0;
    index <
      expected.length;
    index +=
      1
  ) {
    const actualBinding =
      observed[index];

    const expectedBinding =
      expected[index];

    if (
      actualBinding ===
        undefined ||
      expectedBinding ===
        undefined ||
      actualBinding.matchRole !==
        expectedBinding.matchRole ||
      actualBinding.targetRoles.length !==
        expectedBinding.targetRoles.length
    ) {
      return false;
    }

    for (
      let roleIndex =
        0;
      roleIndex <
        expectedBinding.targetRoles.length;
      roleIndex +=
        1
    ) {
      if (
        actualBinding.targetRoles[
          roleIndex
        ] !==
          expectedBinding.targetRoles[
            roleIndex
          ]
      ) {
        return false;
      }
    }
  }

  return true;
}

export function w04PrestateMatchesFinalW03(
  state:
    OrdersWebAppObservedState,
): boolean {
  return (
    state.configuration !==
      null &&
    ordersWebAppSnapshotMatches(
      state.configuration,
      W03_ORDERS_WEB_APP_EXPECTED,
    ) &&
    routingMatches(
      state.routing,
      W03_WEB_APP_ROUTING_STATE,
    ) &&
    matchRolesMatch(
      state.matchRoles,
      W03_WEB_APP_MATCH_ROLES,
    )
  );
}

export function w04StateIsAbsent(
  state:
    OrdersWebAppObservedState,
): boolean {
  return (
    state.configuration ===
      null &&
    state.routing ===
      null &&
    state.matchRoles ===
      null
  );
}

export function w04HealthIsReady(
  health:
    OrdersWebAppHealthProbe,
): boolean {
  return (
    health.status ===
      200 &&
    health.body.ok ===
      1 &&
    health.body.fixtureId ===
      ORDERS_WEB_APP_FIXTURE_ID &&
    health.body.generation ===
      ORDERS_WEB_APP_GENERATION &&
    health.body.service ===
      "orders" &&
    health.body.state ===
      "READY"
  );
}

export function w04HealthIsAbsent(
  health:
    OrdersWebAppHealthProbe,
): boolean {
  return (
    health.status ===
      404
  );
}

function preflightValue(
  state:
    OrdersWebAppObservedState,
  health:
    OrdersWebAppHealthProbe,
): W04WebAppDeletePreflight {
  return Object.freeze({
    schemaVersion:
      "meridian.web-app-delete-preflight.v1" as const,

    targetCanonicalId:
      ORDERS_WEB_APP_TARGET_CANONICAL_ID,

    observed:
      state,

    preDeleteHealth:
      health,

    officialReadOperation:
      WEB_APP_READ_OPERATION,

    officialMutationOperation:
      WEB_APP_DELETE_OPERATION,

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
  W04WebAppDeletePreflight
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
    W04WebAppDeleteExecution["resolutionSource"],
): W04WebAppDeleteExecution {
  return Object.freeze({
    schemaVersion:
      W04_WEB_APP_DELETE_EXECUTION_SCHEMA_VERSION,

    state:
      "APPLIED" as const,

    actionId:
      "W04_WEB_APP_DELETE" as const,

    officialOperation:
      WEB_APP_DELETE_OPERATION,

    fixtureId:
      ORDERS_WEB_APP_FIXTURE_ID,

    generation:
      ORDERS_WEB_APP_GENERATION,

    webAppName:
      ORDERS_WEB_APP_NAME,

    before:
      Object.freeze({
        configuration:
          W03_ORDERS_WEB_APP_EXPECTED,

        routing:
          W03_WEB_APP_ROUTING_STATE,

        matchRoles:
          W03_WEB_APP_MATCH_ROLES,
      }),

    afterPresent:
      false as const,

    absenceVerified:
      true as const,

    mutationRequestCount:
      1 as const,

    resolutionSource:
      source,
  });
}

export function reconcileUnknownW04WebAppDelete(
  state:
    OrdersWebAppObservedState,
): ReconciliationDecision<
  W04WebAppDeleteExecution
> {
  if (
    w04StateIsAbsent(
      state,
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
    w04PrestateMatchesFinalW03(
      state,
    )
  ) {
    return Object.freeze({
      outcome:
        "NOT_APPLIED" as const,

      reason:
        "AUTHORITATIVE_READBACK_CONFIRMED_EXACT_FINAL_W03_PRESTATE",
    });
  }

  return Object.freeze({
    outcome:
      "STILL_UNKNOWN" as const,

    reason:
      "AUTHORITATIVE_READBACK_MATCHED_NEITHER_EXACT_FINAL_W03_PRESTATE_NOR_COMPLETE_APPLICATION_ABSENCE",
  });
}

function buildProofResults(
  input: {
    readonly observedAtUtc:
      string;

    readonly state:
      OrdersWebAppObservedState;

    readonly health:
      OrdersWebAppHealthProbe;
  },
): readonly ProofResult[] {
  const configuration =
    W04_WEB_APP_DELETE_PROOF_REQUIREMENTS[
      0
    ];

  const http =
    W04_WEB_APP_DELETE_PROOF_REQUIREMENTS[
      1
    ];

  if (
    configuration ===
      undefined ||
    http ===
      undefined
  ) {
    throw new Error(
      "W04 proof requirement registry is incomplete.",
    );
  }

  if (
    !w04StateIsAbsent(
      input.state,
    )
  ) {
    throw new ProofEngineError(
      "PROOF_INCOMPLETE",
      "W04 configuration absence proof failed.",
    );
  }

  if (
    !w04HealthIsAbsent(
      input.health,
    )
  ) {
    throw new ProofEngineError(
      "PROOF_INCOMPLETE",
      `W04 HTTP absence requires exact status 404; observed ${input.health.status}.`,
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
        "Authoritative SysAdmin readback reports complete application absence.",

      provenance:
        "AUTHORITATIVE_IRIS" as const,

      safeEvidenceDigest:
        digestCanonicalJson(
          input.state,
        ),
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
        input.health.url,

      observedAtUtc:
        input.observedAtUtc,

      expectedSummary:
        http.description,

      observedSummary:
        "Live /meridian-lab/orders/health returned exact HTTP 404 after deletion.",

      provenance:
        "AUTHORITATIVE_IRIS" as const,

      safeEvidenceDigest:
        digestCanonicalJson(
          input.health,
        ),
    }),
  ]);
}

export function createW04WebAppDeleteProofContract(
  dependencies:
    W04WebAppDeleteContractDependencies,
): ProofContract<
  W04WebAppDeleteIntent,
  W04WebAppDeletePreflight,
  W04WebAppDeleteExecution
> {
  const contract:
    ProofContract<
      W04WebAppDeleteIntent,
      W04WebAppDeletePreflight,
      W04WebAppDeleteExecution
    > = {
    schemaVersion:
      PROOF_CONTRACT_SCHEMA_VERSION,

    contractId:
      W04_WEB_APP_DELETE_CONTRACT_ID,

    contractVersion:
      1,

    actionType:
      "WEB_APP_DELETE",

    domain:
      "WEB_REST",

    risk:
      "HIGH",

    reversibility:
      "COMPENSATABLE",

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
      W04_WEB_APP_DELETE_PROOF_REQUIREMENTS,

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

      const state =
        await dependencies
          .readState(
            intent,
          );

      const health =
        await dependencies
          .probeHealth(
            intent,
          );

      if (
        !w04PrestateMatchesFinalW03(
          state,
        ) ||
        !w04HealthIsReady(
          health,
        )
      ) {
        throw new ProofEngineError(
          "SAFETY_BLOCKED",
          "W04 requires exact final W03 plus live 200 READY behavior before deletion.",
        );
      }

      return preflightValue(
        state,
        health,
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
        !w04PrestateMatchesFinalW03(
          preflight.observed,
        ) ||
        !w04HealthIsReady(
          preflight.preDeleteHealth,
        )
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "W04 expected delta requires exact final W03 plus live READY behavior.",
        );
      }

      return Object.freeze({
        summary:
          W04_WEB_APP_DELETE_DELTA_SUMMARY,

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
            matchRoles:
              Object.freeze([
                ORDERS_WEB_APP_HELPER_EXECUTION_ROLE,
              ]),
            httpStatus:
              200,
            httpState:
              "READY",
          }),

        after:
          Object.freeze({
            present:
              false,
            httpStatus:
              404,
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
        !w04PrestateMatchesFinalW03(
          preflight.observed,
        ) ||
        !w04HealthIsReady(
          preflight.preDeleteHealth,
        )
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "W04 impact analysis requires exact final W03 plus live READY behavior.",
        );
      }

      return Object.freeze({
        certainty:
          "KNOWN" as const,

        summary:
          "W04 removes only the allowlisted /meridian-lab/orders web-application registration. Its REST class, MeridianControlPlaneHelperExecution role, users, resources, databases, and durable receipt history remain intact.",

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
                "The application registration is deleted and the previously live /health route must become HTTP 404.",
            }),
          ]),

        limitations:
          Object.freeze([
            "W04 is fixture-bound and cannot delete an arbitrary web application.",
            "W04 does not delete Meridian.Lab.Orders.REST or MeridianControlPlaneHelperExecution.",
            "W04 does not claim verified recovery; recreation would require a separately reviewed and proven create/update/enable sequence.",
            "Automatic retry is forbidden after an ambiguous DELETE dispatch.",
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
          W04WebAppDeleteIntent,
          W04WebAppDeletePreflight
        >,
    ) {
      void context;

      assertIntent(
        reviewed.intent,
      );

      try {
        const state =
          await dependencies
            .readState(
              reviewed.intent,
            );

        const health =
          await dependencies
            .probeHealth(
              reviewed.intent,
            );

        const fresh =
          preflightValue(
            state,
            health,
          );

        const freshDigest =
          digestCanonicalJson(
            fresh,
          );

        if (
          !w04PrestateMatchesFinalW03(
            state,
          ) ||
          !w04HealthIsReady(
            health,
          )
        ) {
          return Object.freeze({
            outcome:
              "STALE" as const,

            freshPreflight:
              fresh,

            freshDigest,

            reason:
              "W04 target or live behavior changed after review; zero DELETE dispatched.",
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
              "W04 fresh preflight digest differs from the reviewed digest.",
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
          "W04 execute refused because reviewed and fresh preflight digests differ.",
        );
      }

      try {
        await dependencies
          .executeDelete(
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

      const state =
        await dependencies
          .readState(
            ready.intent,
          );

      if (
        !w04StateIsAbsent(
          state,
        )
      ) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          "W04 DELETE returned success but authoritative readback does not prove complete application absence. Automatic retry is forbidden.",
          {
            automaticRetry:
              false,
          },
        );
      }

      return execution(
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

      const state =
        await dependencies
          .readState(
            reviewed.intent,
          );

      return reconcileUnknownW04WebAppDelete(
        state,
      );
    },

    async verify(
      context,
      executionResult,
    ) {
      if (
        executionResult.absenceVerified !==
          true
      ) {
        throw new ProofEngineError(
          "PROOF_INCOMPLETE",
          "W04 execution does not carry verified application absence.",
        );
      }

      const state =
        await dependencies
          .readState(
            W04_WEB_APP_DELETE_INTENT,
          );

      const health =
        await dependencies
          .probeHealth(
            W04_WEB_APP_DELETE_INTENT,
          );

      return buildProofResults({
        observedAtUtc:
          context.nowUtc,

        state,

        health,
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
          "W04 does not claim verified recovery. Recreating the deleted fixture requires a separately reviewed and proven create/update/enable sequence.",
      });
    },
  };

  return Object.freeze(
    contract,
  );
}

export async function certifyW04WebAppDeleteAction(
  input: {
    readonly intent:
      W04WebAppDeleteIntent;

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
    W04WebAppDeleteCertificationDependencies,
): Promise<
  VerifiedActionCertificationResult<
    W04WebAppDeleteExecution
  >
> {
  return certifyVerifiedAction(
    {
      contract:
        createW04WebAppDeleteProofContract(
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
