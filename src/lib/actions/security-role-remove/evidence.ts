import type {
  ProofRequirement,
  ProofResult,
} from "../../proof/evidence";

export const USER_REMOVE_ROLE_PROOF_REQUIREMENTS:
  readonly ProofRequirement[] =
  Object.freeze([
    Object.freeze({
      requirementId:
        "configured-user-readback",

      plane:
        "CONFIGURATION_READBACK",

      applicability:
        "REQUIRED",

      description:
        "IRIS configured user state no longer contains the removed role.",

      source:
        "IRIS SysAdmin API",
    }),

    Object.freeze({
      requirementId:
        "permission-effect",

      plane:
        "PERMISSION_EFFECT",

      applicability:
        "REQUIRED",

      description:
        "The configured role/resource graph proves the declared permission loss and retention.",

      source:
        "IRIS role/resource configuration",
    }),

    Object.freeze({
      requirementId:
        "live-runtime-convergence",

      plane:
        "LIVE_RUNTIME",

      applicability:
        "REQUIRED",

      description:
        "Fresh live runtime authority matches the post-change expected decisions.",

      source:
        "Meridian live witness backed by IRIS runtime authority",
    }),

    Object.freeze({
      requirementId:
        "native-userchange-audit",

      plane:
        "NATIVE_AUDIT",

      applicability:
        "REQUIRED",

      description:
        "Exactly one relevant native IRIS UserChange audit row is bound to the mutation.",

      source:
        "IRIS native audit",
    }),
  ]);

export interface UserRemoveRoleEvidenceInput {
  readonly observedAtUtc:
    string;

  readonly configurationVerified:
    boolean;

  readonly permissionEffectVerified:
    boolean;

  readonly liveRuntimeConverged:
    boolean;

  readonly nativeAuditBound:
    boolean;

  readonly configurationSourceReference:
    string | null;

  readonly permissionSourceReference:
    string | null;

  readonly liveRuntimeSourceReference:
    string | null;

  readonly nativeAuditSourceReference:
    string | null;
}

function result(
  input: {
    readonly requirement:
      ProofRequirement;

    readonly passed:
      boolean;

    readonly observedAtUtc:
      string;

    readonly sourceReference:
      string | null;

    readonly observedSummary:
      string;
  },
): ProofResult {
  return Object.freeze({
    requirementId:
      input.requirement.requirementId,

    plane:
      input.requirement.plane,

    applicability:
      input.requirement.applicability,

    status:
      input.passed
        ? "PASS"
        : "FAIL",

    sourceType:
      input.requirement.source,

    sourceReference:
      input.sourceReference,

    observedAtUtc:
      input.observedAtUtc,

    expectedSummary:
      input.requirement.description,

    observedSummary:
      input.observedSummary,

    provenance:
      "AUTHORITATIVE_IRIS",

    safeEvidenceDigest:
      null,
  });
}

export function buildUserRemoveRoleProofResults(
  input:
    UserRemoveRoleEvidenceInput,
): readonly ProofResult[] {
  const [
    configuration,
    permission,
    runtime,
    audit,
  ] =
    USER_REMOVE_ROLE_PROOF_REQUIREMENTS;

  if (
    configuration ===
      undefined ||
    permission ===
      undefined ||
    runtime ===
      undefined ||
    audit ===
      undefined
  ) {
    throw new Error(
      "USER_REMOVE_ROLE proof requirement registry is incomplete.",
    );
  }

  return Object.freeze([
    result({
      requirement:
        configuration,

      passed:
        input.configurationVerified,

      observedAtUtc:
        input.observedAtUtc,

      sourceReference:
        input.configurationSourceReference,

      observedSummary:
        input.configurationVerified
          ? "Configured role removal matches the expected post-state."
          : "Configured post-state did not prove the role removal.",
    }),

    result({
      requirement:
        permission,

      passed:
        input.permissionEffectVerified,

      observedAtUtc:
        input.observedAtUtc,

      sourceReference:
        input.permissionSourceReference,

      observedSummary:
        input.permissionEffectVerified
          ? "Declared configured permission loss/retention matches the authoritative role graph."
          : "Configured permission effect is not fully proven.",
    }),

    result({
      requirement:
        runtime,

      passed:
        input.liveRuntimeConverged,

      observedAtUtc:
        input.observedAtUtc,

      sourceReference:
        input.liveRuntimeSourceReference,

      observedSummary:
        input.liveRuntimeConverged
          ? "Fresh runtime authority converged to the expected post-change decisions."
          : "Fresh runtime authority has not converged to the expected post-change decisions.",
    }),

    result({
      requirement:
        audit,

      passed:
        input.nativeAuditBound,

      observedAtUtc:
        input.observedAtUtc,

      sourceReference:
        input.nativeAuditSourceReference,

      observedSummary:
        input.nativeAuditBound
          ? "A unique native UserChange audit row is bound to the change."
          : "Native UserChange audit evidence is not bound.",
    }),
  ]);
}
