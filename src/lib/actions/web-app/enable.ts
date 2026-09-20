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
  ORDERS_WEB_APP_DESCRIPTION_UPDATE,
  ORDERS_WEB_APP_FIXTURE_ID,
  ORDERS_WEB_APP_GENERATION,
  ORDERS_WEB_APP_HELPER_EXECUTION_ROLE,
  ORDERS_WEB_APP_NAME,
  ORDERS_WEB_APP_TARGET_CANONICAL_ID,
  WEB_APP_READ_OPERATION,
  WEB_APP_WRITE_OPERATION,
  W02_ORDERS_WEB_APP_EXPECTED,
  W03_ORDERS_WEB_APP_EXPECTED,
  ordersWebAppSnapshotMatches,
  type OrdersWebAppSnapshot,
} from "./fixture";

export const W03_WEB_APP_ENABLE_CONTRACT_ID =
  "meridian.web-rest.web-app-enable.v2" as const;

export const W03_WEB_APP_ENABLE_EXECUTION_SCHEMA_VERSION =
  "meridian.web-app-enable-execution.v2" as const;

export interface W03WebAppEnableIntent {
  readonly actionId:
    "W03_WEB_APP_ENABLE";

  readonly fixtureGeneration:
    typeof ORDERS_WEB_APP_GENERATION;

  readonly desiredEnabled:
    true;

  readonly preservedDescription:
    typeof ORDERS_WEB_APP_DESCRIPTION_UPDATE;
}

export interface W03WebAppEnablePreflight {
  readonly schemaVersion:
    "meridian.web-app-enable-preflight.v1";

  readonly targetCanonicalId:
    typeof ORDERS_WEB_APP_TARGET_CANONICAL_ID;

  readonly observed:
    OrdersWebAppSnapshot |
    null;

  readonly routing:
    OrdersWebAppRoutingState |
    null;

  readonly matchRoles:
    readonly OrdersWebAppMatchRoleBinding[] |
    null;

  readonly desired:
    OrdersWebAppSnapshot;

  readonly desiredRouting:
    OrdersWebAppRoutingState;

  readonly desiredMatchRoles:
    readonly OrdersWebAppMatchRoleBinding[];

  readonly officialReadOperation:
    typeof WEB_APP_READ_OPERATION;

  readonly officialMutationOperation:
    typeof WEB_APP_WRITE_OPERATION;

  readonly requiredAuthority:
    "%Admin_Secure:U";

  readonly authorityMode:
    "CURRENT_STANDING_RUNTIME_AUTHORITY";
}

export interface W03WebAppEnableExecution {
  readonly schemaVersion:
    typeof W03_WEB_APP_ENABLE_EXECUTION_SCHEMA_VERSION;

  readonly state:
    "APPLIED";

  readonly actionId:
    "W03_WEB_APP_ENABLE";

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

  readonly beforeMatchRoles:
    readonly OrdersWebAppMatchRoleBinding[];

  readonly after:
    OrdersWebAppSnapshot;

  readonly afterRouting:
    OrdersWebAppRoutingState;

  readonly afterMatchRoles:
    readonly OrdersWebAppMatchRoleBinding[];

  readonly configurationVerified:
    true;

  readonly mutationRequestCount:
    1;

  readonly resolutionSource:
    "DIRECT_EXECUTION" |
    "AUTHORITATIVE_RECONCILIATION_READBACK";
}

export interface W03WebAppEnableContractDependencies {
  readonly readState:
    (
      intent:
        W03WebAppEnableIntent,
    ) => Promise<
      OrdersWebAppObservedState
    >;

  readonly executeEnable:
    (
      intent:
        W03WebAppEnableIntent,
    ) => Promise<void>;

  readonly probeHealth:
    (
      intent:
        W03WebAppEnableIntent,
    ) => Promise<
      OrdersWebAppHealthProbe
    >;
}

export interface W03WebAppEnableCertificationDependencies {
  readonly contract:
    W03WebAppEnableContractDependencies;

  readonly certification:
    VerifiedActionCertificationDependencies<
      W03WebAppEnablePreflight
    >;
}

export const W03_WEB_APP_ENABLE_INTENT:
  W03WebAppEnableIntent =
  Object.freeze({
    actionId:
      "W03_WEB_APP_ENABLE" as const,

    fixtureGeneration:
      ORDERS_WEB_APP_GENERATION,

    desiredEnabled:
      true as const,

    preservedDescription:
      ORDERS_WEB_APP_DESCRIPTION_UPDATE,
  });

export const W02_WEB_APP_ROUTING_STATE:
  OrdersWebAppRoutingState =
  Object.freeze({
    recurse:
      true,

    cspZenEnabled:
      false,
  });

export const W02_WEB_APP_MATCH_ROLES:
  readonly OrdersWebAppMatchRoleBinding[] =
  Object.freeze([]);

export const W03_WEB_APP_ROUTING_STATE:
  OrdersWebAppRoutingState =
  Object.freeze({
    recurse:
      true,

    cspZenEnabled:
      true,
  });

export const W03_WEB_APP_MATCH_ROLES:
  readonly OrdersWebAppMatchRoleBinding[] =
  Object.freeze([
    Object.freeze({
      matchRole:
        "",

      targetRoles:
        Object.freeze([
          ORDERS_WEB_APP_HELPER_EXECUTION_ROLE,
        ]),
    }),
  ]);

export const W03_WEB_APP_ENABLE_PROOF_REQUIREMENTS:
  readonly ProofRequirement[] =
  Object.freeze([
    Object.freeze({
      requirementId:
        "w03-web-app-configuration-readback",

      plane:
        "CONFIGURATION_READBACK",

      applicability:
        "REQUIRED",

      description:
        "Authoritative SysAdmin readback proves /meridian-lab/orders moved from exact W02 to final W03: Enabled=true, Recurse=true, CSPZENEnabled=true, and MatchRoles always grants only MeridianControlPlaneHelperExecution; canonical identity and stage=updated metadata are preserved.",

      source:
        "IRIS SysAdmin API GET /v2/web-app",
    }),

    Object.freeze({
      requirementId:
        "w03-web-app-http-behavior",

      plane:
        "HTTP_BEHAVIOR",

      applicability:
        "REQUIRED",

      description:
        "Live same-instance HTTP GET /meridian-lab/orders/health returns the deterministic Meridian lab fixture identity and READY state after enablement.",

      source:
        "IRIS CSP/REST live HTTP GET",
    }),
  ]);

function assertIntent(
  intent:
    W03WebAppEnableIntent,
): void {
  if (
    intent.actionId !==
      "W03_WEB_APP_ENABLE" ||
    intent.fixtureGeneration !==
      ORDERS_WEB_APP_GENERATION ||
    intent.desiredEnabled !==
      true ||
    intent.preservedDescription !==
      ORDERS_WEB_APP_DESCRIPTION_UPDATE
  ) {
    throw new ProofEngineError(
      "INVALID_TARGET",
      "W03 intent does not match the frozen /meridian-lab/orders enable action.",
    );
  }
}

function preflightValue(
  state:
    OrdersWebAppObservedState,
): W03WebAppEnablePreflight {
  return Object.freeze({
    schemaVersion:
      "meridian.web-app-enable-preflight.v1" as const,

    targetCanonicalId:
      ORDERS_WEB_APP_TARGET_CANONICAL_ID,

    observed:
      state.configuration,

    routing:
      state.routing,

    matchRoles:
      state.matchRoles,

    desired:
      W03_ORDERS_WEB_APP_EXPECTED,

    desiredRouting:
      W03_WEB_APP_ROUTING_STATE,

    desiredMatchRoles:
      W03_WEB_APP_MATCH_ROLES,

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

function stateMatches(
  state:
    OrdersWebAppObservedState,
  expectedConfiguration:
    OrdersWebAppSnapshot,
  expectedRouting:
    OrdersWebAppRoutingState,
  expectedMatchRoles:
    readonly OrdersWebAppMatchRoleBinding[],
): boolean {
  return (
    state.configuration !==
      null &&
    ordersWebAppSnapshotMatches(
      state.configuration,
      expectedConfiguration,
    ) &&
    routingMatches(
      state.routing,
      expectedRouting,
    ) &&
    matchRolesMatch(
      state.matchRoles,
      expectedMatchRoles,
    )
  );
}

function mapAuthorityDenied(
  error:
    unknown,
): RevalidationDecision<
  W03WebAppEnablePreflight
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
    W03WebAppEnableExecution["resolutionSource"],
): W03WebAppEnableExecution {
  return Object.freeze({
    schemaVersion:
      W03_WEB_APP_ENABLE_EXECUTION_SCHEMA_VERSION,

    state:
      "APPLIED" as const,

    actionId:
      "W03_WEB_APP_ENABLE" as const,

    officialOperation:
      WEB_APP_WRITE_OPERATION,

    fixtureId:
      ORDERS_WEB_APP_FIXTURE_ID,

    generation:
      ORDERS_WEB_APP_GENERATION,

    webAppName:
      ORDERS_WEB_APP_NAME,

    before:
      W02_ORDERS_WEB_APP_EXPECTED,

    beforeRouting:
      W02_WEB_APP_ROUTING_STATE,

    beforeMatchRoles:
      W02_WEB_APP_MATCH_ROLES,

    after:
      W03_ORDERS_WEB_APP_EXPECTED,

    afterRouting:
      W03_WEB_APP_ROUTING_STATE,

    afterMatchRoles:
      W03_WEB_APP_MATCH_ROLES,

    configurationVerified:
      true as const,

    mutationRequestCount:
      1 as const,

    resolutionSource:
      source,
  });
}

export function executionFromW03Readback(
  state:
    OrdersWebAppObservedState,
): W03WebAppEnableExecution {
  if (
    !stateMatches(
      state,
      W03_ORDERS_WEB_APP_EXPECTED,
      W03_WEB_APP_ROUTING_STATE,
      W03_WEB_APP_MATCH_ROLES,
    )
  ) {
    throw new Error(
      "W03 web-app state does not match the final enabled REST fixture.",
    );
  }

  return execution(
    "DIRECT_EXECUTION",
  );
}

export function reconcileUnknownW03WebAppEnable(
  state:
    OrdersWebAppObservedState,
): ReconciliationDecision<
  W03WebAppEnableExecution
> {
  if (
    stateMatches(
      state,
      W03_ORDERS_WEB_APP_EXPECTED,
      W03_WEB_APP_ROUTING_STATE,
      W03_WEB_APP_MATCH_ROLES,
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
    stateMatches(
      state,
      W02_ORDERS_WEB_APP_EXPECTED,
      W02_WEB_APP_ROUTING_STATE,
      W02_WEB_APP_MATCH_ROLES,
    )
  ) {
    return Object.freeze({
      outcome:
        "NOT_APPLIED" as const,

      reason:
        "AUTHORITATIVE_READBACK_CONFIRMED_EXACT_W02_PRESTATE",
    });
  }

  return Object.freeze({
    outcome:
      "STILL_UNKNOWN" as const,

    reason:
      state.configuration ===
        null
        ? "AUTHORITATIVE_READBACK_TARGET_ABSENT_AFTER_W03_DISPATCH"
        : "AUTHORITATIVE_READBACK_MATCHED_NEITHER_EXACT_W02_PRESTATE_NOR_CORRECTED_W03_POSTSTATE",
  });
}

function healthMatches(
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

function buildW03ProofResults(
  input: {
    readonly observedAtUtc:
      string;

    readonly configurationEvidenceDigest:
      string;

    readonly httpEvidenceDigest:
      string;

    readonly health:
      OrdersWebAppHealthProbe;
  },
): readonly ProofResult[] {
  const configuration =
    W03_WEB_APP_ENABLE_PROOF_REQUIREMENTS[
      0
    ];

  const http =
    W03_WEB_APP_ENABLE_PROOF_REQUIREMENTS[
      1
    ];

  if (
    configuration ===
      undefined ||
    http ===
      undefined
  ) {
    throw new Error(
      "W03 proof requirement registry is incomplete.",
    );
  }

  if (
    !healthMatches(
      input.health,
    )
  ) {
    throw new ProofEngineError(
      "PROOF_INCOMPLETE",
      "W03 HTTP behavior probe does not match the frozen Meridian orders READY response.",
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
        "Authoritative readback matches final W03: Enabled=true, Recurse=true, CSPZENEnabled=true, MatchRoles grants only MeridianControlPlaneHelperExecution, stage=updated.",

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
        "Live HTTP health probe returned status 200 and the exact Meridian lab fixture READY payload.",

      provenance:
        "AUTHORITATIVE_IRIS" as const,

      safeEvidenceDigest:
        input.httpEvidenceDigest,
    }),
  ]);
}

export function createW03WebAppEnableProofContract(
  dependencies:
    W03WebAppEnableContractDependencies,
): ProofContract<
  W03WebAppEnableIntent,
  W03WebAppEnablePreflight,
  W03WebAppEnableExecution
> {
  const contract:
    ProofContract<
      W03WebAppEnableIntent,
      W03WebAppEnablePreflight,
      W03WebAppEnableExecution
    > = {
    schemaVersion:
      PROOF_CONTRACT_SCHEMA_VERSION,

    contractId:
      W03_WEB_APP_ENABLE_CONTRACT_ID,

    contractVersion:
      2,

    actionType:
      "WEB_APP_ENABLE",

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
      W03_WEB_APP_ENABLE_PROOF_REQUIREMENTS,

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

      if (
        !stateMatches(
          state,
          W02_ORDERS_WEB_APP_EXPECTED,
          W02_WEB_APP_ROUTING_STATE,
          W02_WEB_APP_MATCH_ROLES,
        )
      ) {
        throw new ProofEngineError(
          "SAFETY_BLOCKED",
          "W03 refused because authoritative prestate is not exact restored W02: Enabled=false, Recurse=true, CSPZENEnabled=false, MatchRoles empty, stage=updated.",
        );
      }

      return preflightValue(
        state,
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
          W02_ORDERS_WEB_APP_EXPECTED,
        ) ||
        !routingMatches(
          preflight.routing,
          W02_WEB_APP_ROUTING_STATE,
        ) ||
        !matchRolesMatch(
          preflight.matchRoles,
          W02_WEB_APP_MATCH_ROLES,
        )
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "W03 expected delta requires exact W02 with empty MatchRoles.",
        );
      }

      return Object.freeze({
        summary:
          "Final W03 changes three reviewed application fields through official PUT /v2/web-app: Enabled=false to true, CSPZENEnabled=false to true, and MatchRoles empty to an app-scoped always-grant of MeridianControlPlaneHelperExecution. Recurse=true, namespace, dispatch class, resource, and stage=updated description are preserved.",

        before:
          Object.freeze({
            present:
              true,
            enabled:
              false,
            recurse:
              true,
            cspZenEnabled:
              false,
            matchRoles:
              Object.freeze([]),
            namespace:
              W02_ORDERS_WEB_APP_EXPECTED.namespace,
            resource:
              W02_ORDERS_WEB_APP_EXPECTED.resource,
            dispatchClass:
              W02_ORDERS_WEB_APP_EXPECTED.dispatchClass,
            description:
              W02_ORDERS_WEB_APP_EXPECTED.description,
          }),

        after:
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
            namespace:
              W03_ORDERS_WEB_APP_EXPECTED.namespace,
            resource:
              W03_ORDERS_WEB_APP_EXPECTED.resource,
            dispatchClass:
              W03_ORDERS_WEB_APP_EXPECTED.dispatchClass,
            description:
              W03_ORDERS_WEB_APP_EXPECTED.description,
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
          W02_ORDERS_WEB_APP_EXPECTED,
        ) ||
        !routingMatches(
          preflight.routing,
          W02_WEB_APP_ROUTING_STATE,
        ) ||
        !matchRolesMatch(
          preflight.matchRoles,
          W02_WEB_APP_MATCH_ROLES,
        )
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "W03 impact analysis requires the exact W02 predecessor state.",
        );
      }

      return Object.freeze({
        certainty:
          "KNOWN" as const,

        summary:
          "Final W03 enables the isolated Meridian lab orders application, enables CSP/ZEN processing for its %CSP.REST Dispatch Class, and grants only the existing MeridianControlPlaneHelperExecution role at this application boundary so request execution can read code in USER. Recurse=true and canonical identity fields remain unchanged.",

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
                "Enabled changes false to true, CSPZENEnabled changes false to true, and MatchRoles always grants only MeridianControlPlaneHelperExecution; the deterministic /health REST route must then become live.",
            }),
          ]),

        limitations:
          Object.freeze([
            "W03 certifies only the allowlisted /meridian-lab/orders fixture and explicitly discloses both the CSPZENEnabled routing-gate change and the app-scoped helper-role binding.",
            "The MatchRoles target is the existing MeridianControlPlaneHelperExecution role, whose live resource scope is %DB_USER:R; W03 does not grant %DB_USER directly to UnknownUser and does not mutate any user or role.",
            "The current meridian.runtime identity holds %Admin_Secure:U as standing authority.",
            "No verified recovery is claimed by W03; disabling or deleting the application requires its own fresh review and proof.",
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
          W03WebAppEnableIntent,
          W03WebAppEnablePreflight
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

        const fresh =
          preflightValue(
            state,
          );

        const freshDigest =
          digestCanonicalJson(
            fresh,
          );

        if (
          !stateMatches(
            state,
            W02_ORDERS_WEB_APP_EXPECTED,
            W02_WEB_APP_ROUTING_STATE,
            W02_WEB_APP_MATCH_ROLES,
          )
        ) {
          return Object.freeze({
            outcome:
              "STALE" as const,

            freshPreflight:
              fresh,

            freshDigest,

            reason:
              "W03 authoritative target state changed after review; zero mutation dispatched.",
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
              "W03 fresh preflight digest differs from the reviewed digest.",
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
          "W03 execute refused because reviewed and fresh preflight digests differ.",
        );
      }

      try {
        await dependencies
          .executeEnable(
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
        state.configuration ===
          null
      ) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          "W03 PUT returned success but authoritative configuration readback is absent. Automatic retry is forbidden.",
          {
            automaticRetry:
              false,
          },
        );
      }

      try {
        return executionFromW03Readback(
          state,
        );
      }
      catch (
        error
      ) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          `W03 PUT returned success but authoritative readback is not the exact W03 poststate: ${
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

      const state =
        await dependencies
          .readState(
            reviewed.intent,
          );

      return reconcileUnknownW03WebAppEnable(
        state,
      );
    },

    async verify(
      context,
      executionResult,
    ) {
      const state =
        await dependencies
          .readState(
            W03_WEB_APP_ENABLE_INTENT,
          );

      if (
        !stateMatches(
          state,
          W03_ORDERS_WEB_APP_EXPECTED,
          W03_WEB_APP_ROUTING_STATE,
          W03_WEB_APP_MATCH_ROLES,
        )
      ) {
        throw new ProofEngineError(
          "PROOF_INCOMPLETE",
          "W03 verification did not read exact final poststate: Enabled=true, Recurse=true, CSPZENEnabled=true, with only the app-scoped helper-role binding.",
        );
      }

      if (
        executionResult.configurationVerified !==
          true
      ) {
        throw new ProofEngineError(
          "PROOF_INCOMPLETE",
          "W03 execution did not carry verified configuration evidence.",
        );
      }

      const health =
        await dependencies
          .probeHealth(
            W03_WEB_APP_ENABLE_INTENT,
          );

      if (
        !healthMatches(
          health,
        )
      ) {
        throw new ProofEngineError(
          "PROOF_INCOMPLETE",
          "W03 live HTTP behavior did not match the frozen Meridian orders health response.",
        );
      }

      return buildW03ProofResults({
        observedAtUtc:
          context.nowUtc,

        configurationEvidenceDigest:
          digestCanonicalJson(
            state,
          ),

        httpEvidenceDigest:
          digestCanonicalJson(
            health,
          ),

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
          "W03 does not claim verified recovery. A future disable/delete action must be separately reviewed, freshly revalidated, executed, behavior-verified, and receipted.",
      });
    },
  };

  return Object.freeze(
    contract,
  );
}

export async function certifyW03WebAppEnableAction(
  input: {
    readonly intent:
      W03WebAppEnableIntent;

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
    W03WebAppEnableCertificationDependencies,
): Promise<
  VerifiedActionCertificationResult<
    W03WebAppEnableExecution
  >
> {
  return certifyVerifiedAction(
    {
      contract:
        createW03WebAppEnableProofContract(
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
