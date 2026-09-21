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
  SecurityRoleAuthorityDeniedError,
  SecurityRoleMutationUnknownAfterDispatchError,
} from "../../iris/security-role-action-transport";

import {
  R4_PERMISSION_FIXTURE_GENERATION,
  R4_PERMISSION_FIXTURE_ID,
  R4_PERMISSION_ROLE_CANONICAL_ID,
  R4_PERMISSION_ROLE_DESCRIPTION,
  R4_PERMISSION_ROLE_EXPECTED,
  R4_PERMISSION_ROLE_NAME,
  R4_PERMISSION_ROLE_PERMISSION,
  R4_PERMISSION_ROLE_RESOURCE,
  SECURITY_RESOURCE_READ_OPERATION,
  SECURITY_ROLE_READ_OPERATION,
  SECURITY_ROLE_WRITE_OPERATION,
  r4PermissionRoleMatches,
  type R4PermissionRoleSnapshot,
} from "./role-fixture";

export const P01_ROLE_CREATE_CONTRACT_ID =
  "meridian.permissions.role-create.v1" as const;

export const P01_ROLE_CREATE_EXECUTION_SCHEMA_VERSION =
  "meridian.role-create-execution.v1" as const;

export const P01_ROLE_CREATE_DELTA_SUMMARY =
  "Create only the frozen MeridianR4ProofRole through official PUT /v2/security/role. The role grants Meridian_Orders:R, is not assigned to a user by P01, and requires exact authoritative role readback before closure." as const;

export interface P01RoleCreateIntent {
  readonly actionId:
    "P01_ROLE_CREATE";

  readonly fixtureGeneration:
    typeof R4_PERMISSION_FIXTURE_GENERATION;
}

export interface P01RoleCreatePreflight {
  readonly schemaVersion:
    "meridian.role-create-preflight.v1";

  readonly targetCanonicalId:
    typeof R4_PERMISSION_ROLE_CANONICAL_ID;

  readonly observedRole:
    R4PermissionRoleSnapshot |
    null;

  readonly prerequisiteResourcePresent:
    boolean;

  readonly officialRoleReadOperation:
    typeof SECURITY_ROLE_READ_OPERATION;

  readonly officialResourceReadOperation:
    typeof SECURITY_RESOURCE_READ_OPERATION;

  readonly officialMutationOperation:
    typeof SECURITY_ROLE_WRITE_OPERATION;

  readonly requiredAuthority:
    "%Admin_Secure:U";

  readonly authorityMode:
    "CURRENT_STANDING_RUNTIME_AUTHORITY";
}

export interface P01RoleCreateExecution {
  readonly schemaVersion:
    typeof P01_ROLE_CREATE_EXECUTION_SCHEMA_VERSION;

  readonly state:
    "APPLIED";

  readonly actionId:
    "P01_ROLE_CREATE";

  readonly officialOperation:
    typeof SECURITY_ROLE_WRITE_OPERATION;

  readonly fixtureId:
    typeof R4_PERMISSION_FIXTURE_ID;

  readonly generation:
    typeof R4_PERMISSION_FIXTURE_GENERATION;

  readonly roleName:
    typeof R4_PERMISSION_ROLE_NAME;

  readonly beforePresent:
    false;

  readonly after:
    R4PermissionRoleSnapshot;

  readonly mutationRequestCount:
    1;

  readonly resolutionSource:
    "DIRECT_EXECUTION" |
    "AUTHORITATIVE_RECONCILIATION_READBACK";
}

export interface P01RoleCreateContractDependencies {
  readonly readRole:
    (
      intent:
        P01RoleCreateIntent,
    ) => Promise<
      R4PermissionRoleSnapshot |
      null
    >;

  readonly readPrerequisiteResource:
    (
      intent:
        P01RoleCreateIntent,
    ) => Promise<boolean>;

  readonly executeCreate:
    (
      intent:
        P01RoleCreateIntent,
    ) => Promise<void>;
}

export interface P01RoleCreateCertificationDependencies {
  readonly contract:
    P01RoleCreateContractDependencies;

  readonly certification:
    VerifiedActionCertificationDependencies<
      P01RoleCreatePreflight
    >;
}

export const P01_ROLE_CREATE_INTENT:
  P01RoleCreateIntent =
  Object.freeze({
    actionId:
      "P01_ROLE_CREATE" as const,

    fixtureGeneration:
      R4_PERMISSION_FIXTURE_GENERATION,
  });

export const P01_ROLE_CREATE_PROOF_REQUIREMENTS:
  readonly ProofRequirement[] =
  Object.freeze([
    Object.freeze({
      requirementId:
        "p01-role-security-metadata",

      plane:
        "SECURITY_METADATA",

      applicability:
        "REQUIRED",

      description:
        "Authoritative SysAdmin GET /v2/security/role proves the exact frozen MeridianR4ProofRole definition after creation.",

      source:
        "IRIS SysAdmin API GET /v2/security/role",
    }),

    Object.freeze({
      requirementId:
        "p01-role-permission-effect",

      plane:
        "PERMISSION_EFFECT",

      applicability:
        "NOT_APPLICABLE",

      description:
        "P01 creates a role definition only; it does not assign that role to any user and therefore does not claim a user permission-effect witness.",

      source:
        "P01 semantic boundary",
    }),
  ]);

function assertIntent(
  intent:
    P01RoleCreateIntent,
): void {
  if (
    intent.actionId !==
      "P01_ROLE_CREATE" ||
    intent.fixtureGeneration !==
      R4_PERMISSION_FIXTURE_GENERATION
  ) {
    throw new ProofEngineError(
      "INVALID_TARGET",
      "P01 intent does not match the frozen R4 permission-role fixture.",
    );
  }
}

function preflightValue(
  observedRole:
    R4PermissionRoleSnapshot |
    null,
  prerequisiteResourcePresent:
    boolean,
): P01RoleCreatePreflight {
  return Object.freeze({
    schemaVersion:
      "meridian.role-create-preflight.v1" as const,

    targetCanonicalId:
      R4_PERMISSION_ROLE_CANONICAL_ID,

    observedRole,

    prerequisiteResourcePresent,

    officialRoleReadOperation:
      SECURITY_ROLE_READ_OPERATION,

    officialResourceReadOperation:
      SECURITY_RESOURCE_READ_OPERATION,

    officialMutationOperation:
      SECURITY_ROLE_WRITE_OPERATION,

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
  P01RoleCreatePreflight
> | null {
  if (
    error instanceof
      SecurityRoleAuthorityDeniedError
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
    P01RoleCreateExecution["resolutionSource"],
): P01RoleCreateExecution {
  return Object.freeze({
    schemaVersion:
      P01_ROLE_CREATE_EXECUTION_SCHEMA_VERSION,

    state:
      "APPLIED" as const,

    actionId:
      "P01_ROLE_CREATE" as const,

    officialOperation:
      SECURITY_ROLE_WRITE_OPERATION,

    fixtureId:
      R4_PERMISSION_FIXTURE_ID,

    generation:
      R4_PERMISSION_FIXTURE_GENERATION,

    roleName:
      R4_PERMISSION_ROLE_NAME,

    beforePresent:
      false as const,

    after:
      R4_PERMISSION_ROLE_EXPECTED,

    mutationRequestCount:
      1 as const,

    resolutionSource:
      source,
  });
}

export function reconcileUnknownP01RoleCreate(
  observedRole:
    R4PermissionRoleSnapshot |
    null,
): ReconciliationDecision<
  P01RoleCreateExecution
> {
  if (
    observedRole !==
      null &&
    r4PermissionRoleMatches(
      observedRole,
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
    observedRole ===
      null
  ) {
    return Object.freeze({
      outcome:
        "NOT_APPLIED" as const,

      reason:
        "AUTHORITATIVE_READBACK_CONFIRMED_ROLE_ABSENT",
    });
  }

  return Object.freeze({
    outcome:
      "STILL_UNKNOWN" as const,

    reason:
      "AUTHORITATIVE_READBACK_FOUND_NONCANONICAL_ROLE_STATE",
  });
}

function buildProofResults(
  input: {
    readonly observedAtUtc:
      string;

    readonly role:
      R4PermissionRoleSnapshot |
      null;
  },
): readonly ProofResult[] {
  const metadata =
    P01_ROLE_CREATE_PROOF_REQUIREMENTS[
      0
    ];

  const effect =
    P01_ROLE_CREATE_PROOF_REQUIREMENTS[
      1
    ];

  if (
    metadata ===
      undefined ||
    effect ===
      undefined
  ) {
    throw new Error(
      "P01 proof requirement registry is incomplete.",
    );
  }

  if (
    input.role ===
      null ||
    !r4PermissionRoleMatches(
      input.role,
    )
  ) {
    throw new ProofEngineError(
      "PROOF_INCOMPLETE",
      "P01 authoritative role readback does not match the frozen role definition.",
    );
  }

  return Object.freeze([
    Object.freeze({
      requirementId:
        metadata.requirementId,

      plane:
        metadata.plane,

      applicability:
        metadata.applicability,

      status:
        "PASS" as const,

      sourceType:
        metadata.source,

      sourceReference:
        `${SECURITY_ROLE_READ_OPERATION}?name=${encodeURIComponent(R4_PERMISSION_ROLE_NAME)}`,

      observedAtUtc:
        input.observedAtUtc,

      expectedSummary:
        metadata.description,

      observedSummary:
        `Exact role readback: ${R4_PERMISSION_ROLE_NAME}; resource=${R4_PERMISSION_ROLE_RESOURCE}:${R4_PERMISSION_ROLE_PERMISSION}.`,

      provenance:
        "AUTHORITATIVE_IRIS" as const,

      safeEvidenceDigest:
        digestCanonicalJson(
          input.role,
        ),
    }),

    Object.freeze({
      requirementId:
        effect.requirementId,

      plane:
        effect.plane,

      applicability:
        effect.applicability,

      status:
        "NOT_APPLICABLE" as const,

      sourceType:
        effect.source,

      sourceReference:
        null,

      observedAtUtc:
        null,

      expectedSummary:
        effect.description,

      observedSummary:
        "No user-role assignment is part of P01; permission-effect proof is intentionally not claimed.",

      provenance:
        "NOT_APPLICABLE" as const,

      safeEvidenceDigest:
        null,
    }),
  ]);
}

export function createP01RoleCreateProofContract(
  dependencies:
    P01RoleCreateContractDependencies,
): ProofContract<
  P01RoleCreateIntent,
  P01RoleCreatePreflight,
  P01RoleCreateExecution
> {
  const contract:
    ProofContract<
      P01RoleCreateIntent,
      P01RoleCreatePreflight,
      P01RoleCreateExecution
    > = {
    schemaVersion:
      PROOF_CONTRACT_SCHEMA_VERSION,

    contractId:
      P01_ROLE_CREATE_CONTRACT_ID,

    contractVersion:
      1,

    actionType:
      "ROLE_CREATE",

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
            true,

          escalationOnly:
            false,
        }),
      ]),

    proofRequirements:
      P01_ROLE_CREATE_PROOF_REQUIREMENTS,

    target(
      intent,
    ) {
      assertIntent(
        intent,
      );

      return Object.freeze({
        kind:
          "ROLE",

        canonicalId:
          R4_PERMISSION_ROLE_CANONICAL_ID,

        displayName:
          R4_PERMISSION_ROLE_NAME,

        fixtureId:
          R4_PERMISSION_FIXTURE_ID,

        generation:
          R4_PERMISSION_FIXTURE_GENERATION,
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

      const [
        observedRole,
        prerequisiteResourcePresent,
      ] =
        await Promise.all([
          dependencies
            .readRole(
              intent,
            ),

          dependencies
            .readPrerequisiteResource(
              intent,
            ),
        ]);

      if (
        observedRole !==
          null
      ) {
        throw new ProofEngineError(
          "SAFETY_BLOCKED",
          "P01 requires the frozen role name to be absent before creation.",
        );
      }

      if (
        !prerequisiteResourcePresent
      ) {
        throw new ProofEngineError(
          "SAFETY_BLOCKED",
          "P01 requires the Meridian_Orders resource to exist before role creation.",
        );
      }

      return preflightValue(
        observedRole,
        prerequisiteResourcePresent,
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
        preflight.observedRole !==
          null ||
        preflight.prerequisiteResourcePresent !==
          true
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "P01 expected delta requires absent role and present prerequisite resource.",
        );
      }

      return Object.freeze({
        summary:
          P01_ROLE_CREATE_DELTA_SUMMARY,

        before:
          Object.freeze({
            present:
              false,
          }),

        after:
          Object.freeze({
            present:
              true,

            name:
              R4_PERMISSION_ROLE_NAME,

            description:
              R4_PERMISSION_ROLE_DESCRIPTION,

            grantedRoles:
              Object.freeze([]),

            resource:
              `${R4_PERMISSION_ROLE_RESOURCE}:${R4_PERMISSION_ROLE_PERMISSION}`,

            assignedToUser:
              false,
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
        preflight.observedRole !==
          null ||
        preflight.prerequisiteResourcePresent !==
          true
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "P01 impact analysis requires exact role-absent prestate.",
        );
      }

      return Object.freeze({
        certainty:
          "KNOWN" as const,

        summary:
          "P01 creates one unassigned fixture-bound role granting Meridian_Orders:R. No user assignment is performed, so no user authority is claimed to change.",

        affectedEntities:
          Object.freeze([
            Object.freeze({
              kind:
                "ROLE",

              canonicalId:
                R4_PERMISSION_ROLE_CANONICAL_ID,

              displayName:
                R4_PERMISSION_ROLE_NAME,

              effect:
                "A new role definition is created with exactly Meridian_Orders:R and no granted roles.",
            }),
          ]),

        limitations:
          Object.freeze([
            "P01 is bound to MeridianR4ProofRole and cannot create an arbitrary role.",
            "P01 does not assign the role to a user.",
            "P01 does not claim a permission-effect witness; that evidence belongs to role-assignment actions.",
            "Automatic retry is forbidden after an ambiguous PUT dispatch.",
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
          P01RoleCreateIntent,
          P01RoleCreatePreflight
        >,
    ) {
      void context;

      assertIntent(
        reviewed.intent,
      );

      try {
        const [
          observedRole,
          prerequisiteResourcePresent,
        ] =
          await Promise.all([
            dependencies
              .readRole(
                reviewed.intent,
              ),

            dependencies
              .readPrerequisiteResource(
                reviewed.intent,
              ),
          ]);

        const fresh =
          preflightValue(
            observedRole,
            prerequisiteResourcePresent,
          );

        const freshDigest =
          digestCanonicalJson(
            fresh,
          );

        if (
          observedRole !==
            null ||
          !prerequisiteResourcePresent
        ) {
          return Object.freeze({
            outcome:
              "STALE" as const,

            freshPreflight:
              fresh,

            freshDigest,

            reason:
              "P01 role/resource prestate changed after review; zero PUT dispatched.",
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
              "P01 fresh preflight digest differs from the reviewed digest.",
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
          "P01 execute refused because reviewed and fresh preflight digests differ.",
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
            SecurityRoleMutationUnknownAfterDispatchError
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

      const observedRole =
        await dependencies
          .readRole(
            ready.intent,
          );

      if (
        observedRole ===
          null ||
        !r4PermissionRoleMatches(
          observedRole,
        )
      ) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          "P01 PUT returned success but authoritative role readback is not exact. Automatic retry is forbidden.",
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

      return reconcileUnknownP01RoleCreate(
        await dependencies
          .readRole(
            reviewed.intent,
          ),
      );
    },

    async verify(
      context,
      executionResult,
    ) {
      if (
        !r4PermissionRoleMatches(
          executionResult.after,
        )
      ) {
        throw new ProofEngineError(
          "PROOF_INCOMPLETE",
          "P01 execution evidence does not carry the exact role definition.",
        );
      }

      const role =
        await dependencies
          .readRole(
            P01_ROLE_CREATE_INTENT,
          );

      return buildProofResults({
        observedAtUtc:
          context.nowUtc,

        role,
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
          "ROLE_DELETE",

        automatic:
          false as const,

        summary:
          "Prepare a separately reviewed P02 ROLE_DELETE action that removes MeridianR4ProofRole only after fresh role readback and revalidation.",
      });
    },
  };

  return Object.freeze(
    contract,
  );
}

export async function certifyP01RoleCreateAction(
  input: {
    readonly intent:
      P01RoleCreateIntent;

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
    P01RoleCreateCertificationDependencies,
): Promise<
  VerifiedActionCertificationResult<
    P01RoleCreateExecution
  >
> {
  return certifyVerifiedAction(
    {
      contract:
        createP01RoleCreateProofContract(
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
