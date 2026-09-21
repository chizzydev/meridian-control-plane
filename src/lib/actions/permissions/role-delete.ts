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
  type R4PermissionRoleOwner,
} from "../../iris/security-role-action-transport";

import {
  R4_PERMISSION_FIXTURE_GENERATION,
  R4_PERMISSION_FIXTURE_ID,
  R4_PERMISSION_ROLE_CANONICAL_ID,
  R4_PERMISSION_ROLE_EXPECTED,
  R4_PERMISSION_ROLE_NAME,
  SECURITY_RESOURCE_READ_OPERATION,
  SECURITY_ROLE_DELETE_OPERATION,
  SECURITY_ROLE_READ_OPERATION,
  r4PermissionRoleMatches,
  type R4PermissionRoleSnapshot,
} from "./role-fixture";

export const P02_ROLE_DELETE_CONTRACT_ID =
  "meridian.permissions.role-delete.v1" as const;

export const P02_ROLE_DELETE_EXECUTION_SCHEMA_VERSION =
  "meridian.role-delete-execution.v1" as const;

export const P02_RECOVERY_OF_RECEIPT_ID =
  "meridian-p01-role-create-r4-a-001" as const;

export const P02_RECOVERY_OF_RECEIPT_SHA256 =
  "0F3F8B06560A9F91B2C20A9EEB59D5D262FD9BEDE905CB04FDD79F441C94407B" as const;

export const P02_ROLE_DELETE_DELTA_SUMMARY =
  "Delete only the frozen MeridianR4ProofRole through official DELETE /v2/security/role after proving it has zero owners. Preserve Meridian_Orders and restore the exact relevant P01 prestate: role absent, prerequisite resource present." as const;

export interface P02RoleDeleteIntent {
  readonly actionId:
    "P02_ROLE_DELETE";

  readonly fixtureGeneration:
    typeof R4_PERMISSION_FIXTURE_GENERATION;

  readonly recoveryOfReceiptId:
    typeof P02_RECOVERY_OF_RECEIPT_ID;

  readonly recoveryOfReceiptSha256:
    typeof P02_RECOVERY_OF_RECEIPT_SHA256;
}

export interface P02RoleDeletePreflight {
  readonly schemaVersion:
    "meridian.role-delete-preflight.v1";

  readonly targetCanonicalId:
    typeof R4_PERMISSION_ROLE_CANONICAL_ID;

  readonly observedRole:
    R4PermissionRoleSnapshot |
    null;

  readonly observedOwners:
    readonly R4PermissionRoleOwner[] |
    null;

  readonly prerequisiteResourcePresent:
    boolean;

  readonly recoveryOfReceiptId:
    typeof P02_RECOVERY_OF_RECEIPT_ID;

  readonly recoveryOfReceiptSha256:
    typeof P02_RECOVERY_OF_RECEIPT_SHA256;

  readonly officialRoleReadOperation:
    typeof SECURITY_ROLE_READ_OPERATION;

  readonly officialResourceReadOperation:
    typeof SECURITY_RESOURCE_READ_OPERATION;

  readonly officialMutationOperation:
    typeof SECURITY_ROLE_DELETE_OPERATION;

  readonly officialOwnersReadOperation:
    "GET /v2/security/role/owners";

  readonly requiredAuthority:
    "%Admin_Secure:U";

  readonly authorityMode:
    "CURRENT_STANDING_RUNTIME_AUTHORITY";
}

export interface P02RoleDeleteExecution {
  readonly schemaVersion:
    typeof P02_ROLE_DELETE_EXECUTION_SCHEMA_VERSION;

  readonly state:
    "APPLIED";

  readonly actionId:
    "P02_ROLE_DELETE";

  readonly officialOperation:
    typeof SECURITY_ROLE_DELETE_OPERATION;

  readonly fixtureId:
    typeof R4_PERMISSION_FIXTURE_ID;

  readonly generation:
    typeof R4_PERMISSION_FIXTURE_GENERATION;

  readonly roleName:
    typeof R4_PERMISSION_ROLE_NAME;

  readonly before:
    R4PermissionRoleSnapshot;

  readonly ownersBeforeCount:
    0;

  readonly prerequisiteResourceBefore:
    true;

  readonly afterRolePresent:
    false;

  readonly prerequisiteResourceAfter:
    true;

  readonly mutationRequestCount:
    1;

  readonly recoveryOfReceiptId:
    typeof P02_RECOVERY_OF_RECEIPT_ID;

  readonly recoveryOfReceiptSha256:
    typeof P02_RECOVERY_OF_RECEIPT_SHA256;

  readonly resolutionSource:
    "DIRECT_EXECUTION" |
    "AUTHORITATIVE_RECONCILIATION_READBACK";
}

export interface P02RoleDeleteContractDependencies {
  readonly readRole:
    (
      intent:
        P02RoleDeleteIntent,
    ) => Promise<
      R4PermissionRoleSnapshot |
      null
    >;

  readonly readOwners:
    (
      intent:
        P02RoleDeleteIntent,
    ) => Promise<
      readonly R4PermissionRoleOwner[] |
      null
    >;

  readonly readPrerequisiteResource:
    (
      intent:
        P02RoleDeleteIntent,
    ) => Promise<boolean>;

  readonly executeDelete:
    (
      intent:
        P02RoleDeleteIntent,
    ) => Promise<void>;
}

export interface P02RoleDeleteCertificationDependencies {
  readonly contract:
    P02RoleDeleteContractDependencies;

  readonly certification:
    VerifiedActionCertificationDependencies<
      P02RoleDeletePreflight
    >;
}

export const P02_ROLE_DELETE_INTENT:
  P02RoleDeleteIntent =
  Object.freeze({
    actionId:
      "P02_ROLE_DELETE" as const,

    fixtureGeneration:
      R4_PERMISSION_FIXTURE_GENERATION,

    recoveryOfReceiptId:
      P02_RECOVERY_OF_RECEIPT_ID,

    recoveryOfReceiptSha256:
      P02_RECOVERY_OF_RECEIPT_SHA256,
  });

export const P02_ROLE_DELETE_PROOF_REQUIREMENTS:
  readonly ProofRequirement[] =
  Object.freeze([
    Object.freeze({
      requirementId:
        "p02-role-security-metadata",

      plane:
        "SECURITY_METADATA",

      applicability:
        "REQUIRED",

      description:
        "Authoritative SysAdmin readback proves MeridianR4ProofRole absent after delete while Meridian_Orders remains present.",

      source:
        "IRIS SysAdmin API GET /v2/security/role + GET /v2/security/resource",
    }),

    Object.freeze({
      requirementId:
        "p02-role-permission-effect",

      plane:
        "PERMISSION_EFFECT",

      applicability:
        "NOT_APPLICABLE",

      description:
        "P02 deletes only a role proven to have zero owners immediately before delete; no user or role authority is claimed to change.",

      source:
        "IRIS SysAdmin API GET /v2/security/role/owners + P02 semantic boundary",
    }),
  ]);

function assertIntent(
  intent:
    P02RoleDeleteIntent,
): void {
  if (
    intent.actionId !==
      "P02_ROLE_DELETE" ||
    intent.fixtureGeneration !==
      R4_PERMISSION_FIXTURE_GENERATION ||
    intent.recoveryOfReceiptId !==
      P02_RECOVERY_OF_RECEIPT_ID ||
    intent.recoveryOfReceiptSha256 !==
      P02_RECOVERY_OF_RECEIPT_SHA256
  ) {
    throw new ProofEngineError(
      "INVALID_TARGET",
      "P02 intent does not match the frozen P01 recovery binding.",
    );
  }
}

function frozenOwners(
  owners:
    readonly R4PermissionRoleOwner[],
): readonly R4PermissionRoleOwner[] {
  return Object.freeze(
    owners.map(
      (
        owner,
      ) =>
        Object.freeze({
          ...owner,
        }),
    ),
  );
}

function preflightValue(
  observedRole:
    R4PermissionRoleSnapshot |
    null,
  observedOwners:
    readonly R4PermissionRoleOwner[] |
    null,
  prerequisiteResourcePresent:
    boolean,
): P02RoleDeletePreflight {
  return Object.freeze({
    schemaVersion:
      "meridian.role-delete-preflight.v1" as const,

    targetCanonicalId:
      R4_PERMISSION_ROLE_CANONICAL_ID,

    observedRole,

    observedOwners:
      observedOwners ===
        null
        ? null
        : frozenOwners(
            observedOwners,
          ),

    prerequisiteResourcePresent,

    recoveryOfReceiptId:
      P02_RECOVERY_OF_RECEIPT_ID,

    recoveryOfReceiptSha256:
      P02_RECOVERY_OF_RECEIPT_SHA256,

    officialRoleReadOperation:
      SECURITY_ROLE_READ_OPERATION,

    officialResourceReadOperation:
      SECURITY_RESOURCE_READ_OPERATION,

    officialMutationOperation:
      SECURITY_ROLE_DELETE_OPERATION,

    officialOwnersReadOperation:
      "GET /v2/security/role/owners" as const,

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
  P02RoleDeletePreflight
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
    P02RoleDeleteExecution["resolutionSource"],
): P02RoleDeleteExecution {
  return Object.freeze({
    schemaVersion:
      P02_ROLE_DELETE_EXECUTION_SCHEMA_VERSION,

    state:
      "APPLIED" as const,

    actionId:
      "P02_ROLE_DELETE" as const,

    officialOperation:
      SECURITY_ROLE_DELETE_OPERATION,

    fixtureId:
      R4_PERMISSION_FIXTURE_ID,

    generation:
      R4_PERMISSION_FIXTURE_GENERATION,

    roleName:
      R4_PERMISSION_ROLE_NAME,

    before:
      R4_PERMISSION_ROLE_EXPECTED,

    ownersBeforeCount:
      0 as const,

    prerequisiteResourceBefore:
      true as const,

    afterRolePresent:
      false as const,

    prerequisiteResourceAfter:
      true as const,

    mutationRequestCount:
      1 as const,

    recoveryOfReceiptId:
      P02_RECOVERY_OF_RECEIPT_ID,

    recoveryOfReceiptSha256:
      P02_RECOVERY_OF_RECEIPT_SHA256,

    resolutionSource:
      source,
  });
}

export function reconcileUnknownP02RoleDelete(
  input: {
    readonly observedRole:
      R4PermissionRoleSnapshot |
      null;

    readonly observedOwners:
      readonly R4PermissionRoleOwner[] |
      null;

    readonly prerequisiteResourcePresent:
      boolean;
  },
): ReconciliationDecision<
  P02RoleDeleteExecution
> {
  if (
    input.observedRole ===
      null &&
    input.prerequisiteResourcePresent
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
    input.observedRole !==
      null &&
    r4PermissionRoleMatches(
      input.observedRole,
    ) &&
    input.observedOwners !==
      null &&
    input.observedOwners.length ===
      0 &&
    input.prerequisiteResourcePresent
  ) {
    return Object.freeze({
      outcome:
        "NOT_APPLIED" as const,

      reason:
        "AUTHORITATIVE_READBACK_MATCHED_EXACT_P01_POSTSTATE",
    });
  }

  return Object.freeze({
    outcome:
      "STILL_UNKNOWN" as const,

    reason:
      "AUTHORITATIVE_READBACK_MATCHED_NEITHER_EXACT_RECOVERY_POSTSTATE_NOR_EXACT_P01_POSTSTATE",
  });
}

function buildProofResults(
  input: {
    readonly observedAtUtc:
      string;

    readonly role:
      R4PermissionRoleSnapshot |
      null;

    readonly prerequisiteResourcePresent:
      boolean;

    readonly ownersBeforeCount:
      0;
  },
): readonly ProofResult[] {
  const metadata =
    P02_ROLE_DELETE_PROOF_REQUIREMENTS[
      0
    ];

  const effect =
    P02_ROLE_DELETE_PROOF_REQUIREMENTS[
      1
    ];

  if (
    metadata ===
      undefined ||
    effect ===
      undefined
  ) {
    throw new Error(
      "P02 proof requirement registry is incomplete.",
    );
  }

  if (
    input.role !==
      null ||
    !input.prerequisiteResourcePresent
  ) {
    throw new ProofEngineError(
      "PROOF_INCOMPLETE",
      "P02 recovery readback did not prove role absence with prerequisite resource preserved.",
    );
  }

  if (
    input.ownersBeforeCount !==
      0
  ) {
    throw new ProofEngineError(
      "PROOF_INCOMPLETE",
      "P02 cannot claim no permission effect without zero-owner preflight.",
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
        "MeridianR4ProofRole is authoritatively absent and Meridian_Orders remains present.",

      provenance:
        "AUTHORITATIVE_IRIS" as const,

      safeEvidenceDigest:
        digestCanonicalJson({
          role:
            null,

          prerequisiteResourcePresent:
            true,
        }),
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
        "P02 proved zero owners in fresh preflight, so user permission-effect evidence is intentionally not applicable to this role-definition recovery.",

      provenance:
        "NOT_APPLICABLE" as const,

      safeEvidenceDigest:
        null,
    }),
  ]);
}

export function createP02RoleDeleteProofContract(
  dependencies:
    P02RoleDeleteContractDependencies,
): ProofContract<
  P02RoleDeleteIntent,
  P02RoleDeletePreflight,
  P02RoleDeleteExecution
> {
  const contract:
    ProofContract<
      P02RoleDeleteIntent,
      P02RoleDeletePreflight,
      P02RoleDeleteExecution
    > = {
    schemaVersion:
      PROOF_CONTRACT_SCHEMA_VERSION,

    contractId:
      P02_ROLE_DELETE_CONTRACT_ID,

    contractVersion:
      1,

    actionType:
      "ROLE_DELETE",

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
      P02_ROLE_DELETE_PROOF_REQUIREMENTS,

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
        observedOwners,
        prerequisiteResourcePresent,
      ] =
        await Promise.all([
          dependencies
            .readRole(
              intent,
            ),

          dependencies
            .readOwners(
              intent,
            ),

          dependencies
            .readPrerequisiteResource(
              intent,
            ),
        ]);

      if (
        observedRole ===
          null ||
        !r4PermissionRoleMatches(
          observedRole,
        )
      ) {
        throw new ProofEngineError(
          "SAFETY_BLOCKED",
          "P02 requires the exact live-certified P01 role definition before delete.",
        );
      }

      if (
        observedOwners ===
          null ||
        observedOwners.length !==
          0
      ) {
        throw new ProofEngineError(
          "SAFETY_BLOCKED",
          "P02 requires zero role owners before delete.",
        );
      }

      if (
        !prerequisiteResourcePresent
      ) {
        throw new ProofEngineError(
          "SAFETY_BLOCKED",
          "P02 requires Meridian_Orders to remain present before recovery.",
        );
      }

      return preflightValue(
        observedRole,
        observedOwners,
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
        preflight.observedRole ===
          null ||
        !r4PermissionRoleMatches(
          preflight.observedRole,
        ) ||
        preflight.observedOwners ===
          null ||
        preflight.observedOwners.length !==
          0 ||
        !preflight.prerequisiteResourcePresent
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "P02 expected delta requires exact P01 poststate and zero-owner preflight.",
        );
      }

      return Object.freeze({
        summary:
          P02_ROLE_DELETE_DELTA_SUMMARY,

        before:
          Object.freeze({
            role:
              R4_PERMISSION_ROLE_EXPECTED,

            ownersCount:
              0,

            prerequisiteResourcePresent:
              true,
          }),

        after:
          Object.freeze({
            rolePresent:
              false,

            prerequisiteResourcePresent:
              true,

            restoredP01RelevantPrestate:
              true,
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
        preflight.observedRole ===
          null ||
        !r4PermissionRoleMatches(
          preflight.observedRole,
        ) ||
        preflight.observedOwners ===
          null ||
        preflight.observedOwners.length !==
          0 ||
        !preflight.prerequisiteResourcePresent
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "P02 impact cannot be KNOWN unless the exact P01 role, zero-owner state, and prerequisite resource are all present.",
        );
      }

      return Object.freeze({
        certainty:
          "KNOWN" as const,

        summary:
          "P02 removes one fixture-bound role proven to have zero owners, preserves Meridian_Orders, and restores the relevant P01 prestate without changing any user or role authority assignment.",

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
                "The unassigned P01 proof role is removed.",
            }),

            Object.freeze({
              kind:
                "RESOURCE",

              canonicalId:
                "resource:Meridian_Orders",

              displayName:
                "Meridian_Orders",

              effect:
                "Prerequisite resource is explicitly preserved.",
            }),
          ]),

        limitations:
          Object.freeze([
            "P02 is bound to MeridianR4ProofRole and cannot delete an arbitrary role.",
            "P02 refuses to run if any user, role, or escalation owner holds the role.",
            "P02 does not delete Meridian_Orders.",
            "Automatic retry is forbidden after ambiguous DELETE dispatch.",
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
          P02RoleDeleteIntent,
          P02RoleDeletePreflight
        >,
    ) {
      void context;

      assertIntent(
        reviewed.intent,
      );

      try {
        const [
          observedRole,
          observedOwners,
          prerequisiteResourcePresent,
        ] =
          await Promise.all([
            dependencies
              .readRole(
                reviewed.intent,
              ),

            dependencies
              .readOwners(
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
            observedOwners,
            prerequisiteResourcePresent,
          );

        const freshDigest =
          digestCanonicalJson(
            fresh,
          );

        if (
          observedRole ===
            null ||
          !r4PermissionRoleMatches(
            observedRole,
          ) ||
          observedOwners ===
            null ||
          observedOwners.length !==
            0 ||
          !prerequisiteResourcePresent
        ) {
          return Object.freeze({
            outcome:
              "STALE" as const,

            freshPreflight:
              fresh,

            freshDigest,

            reason:
              "P02 role, owner, or resource prestate changed after review; zero DELETE dispatched.",
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
              "P02 fresh preflight digest differs from the reviewed digest.",
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
          "P02 execute refused because reviewed and fresh preflight digests differ.",
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

      const [
        observedRole,
        prerequisiteResourcePresent,
      ] =
        await Promise.all([
          dependencies
            .readRole(
              ready.intent,
            ),

          dependencies
            .readPrerequisiteResource(
              ready.intent,
            ),
        ]);

      if (
        observedRole !==
          null ||
        !prerequisiteResourcePresent
      ) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          "P02 DELETE returned success but authoritative recovery readback is not exact. Automatic retry is forbidden.",
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

      const observedRole =
        await dependencies
          .readRole(
            reviewed.intent,
          );

      const prerequisiteResourcePresent =
        await dependencies
          .readPrerequisiteResource(
            reviewed.intent,
          );

      const observedOwners =
        observedRole ===
          null
          ? null
          : await dependencies
              .readOwners(
                reviewed.intent,
              );

      return reconcileUnknownP02RoleDelete({
        observedRole,

        observedOwners,

        prerequisiteResourcePresent,
      });
    },

    async verify(
      context,
      executionResult,
    ) {
      const [
        role,
        prerequisiteResourcePresent,
      ] =
        await Promise.all([
          dependencies
            .readRole(
              P02_ROLE_DELETE_INTENT,
            ),

          dependencies
            .readPrerequisiteResource(
              P02_ROLE_DELETE_INTENT,
            ),
        ]);

      return buildProofResults({
        observedAtUtc:
          context.nowUtc,

        role,

        prerequisiteResourcePresent,

        ownersBeforeCount:
          executionResult
            .ownersBeforeCount,
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
          "ROLE_CREATE",

        automatic:
          false as const,

        summary:
          "Prepare a separately reviewed P01-compatible ROLE_CREATE action only after fresh recovery preflight and authoritative absence confirmation.",
      });
    },
  };

  return Object.freeze(
    contract,
  );
}

export async function certifyP02RoleDeleteAction(
  input: {
    readonly intent:
      P02RoleDeleteIntent;

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
    P02RoleDeleteCertificationDependencies,
): Promise<
  VerifiedActionCertificationResult<
    P02RoleDeleteExecution
  >
> {
  return certifyVerifiedAction(
    {
      contract:
        createP02RoleDeleteProofContract(
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
