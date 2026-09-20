import type {
  ProofRequirement,
  ProofResult,
} from "../../proof/evidence";

export const W01_WEB_APP_CREATE_PROOF_REQUIREMENTS:
  readonly ProofRequirement[] =
  Object.freeze([
    Object.freeze({
      requirementId:
        "web-app-configuration-readback",

      plane:
        "CONFIGURATION_READBACK",

      applicability:
        "REQUIRED",

      description:
        "Authoritative SysAdmin readback proves the exact allowlisted /meridian-lab/orders application exists in its frozen disabled W01 configuration.",

      source:
        "IRIS SysAdmin API GET /v2/web-app",
    }),

    Object.freeze({
      requirementId:
        "web-app-http-behavior",

      plane:
        "HTTP_BEHAVIOR",

      applicability:
        "NOT_APPLICABLE",

      description:
        "W01 intentionally creates the fixture disabled; enabled HTTP behavior is certified separately by W03.",

      source:
        "Meridian W03 HTTP behavior probe",
    }),
  ]);

export function buildW01WebAppCreateProofResults(
  input: {
    readonly observedAtUtc:
      string;

    readonly configurationVerified:
      boolean;

    readonly configurationSourceReference:
      string;

    readonly configurationEvidenceDigest:
      string;
  },
): readonly ProofResult[] {
  const configuration =
    W01_WEB_APP_CREATE_PROOF_REQUIREMENTS[
      0
    ];

  const http =
    W01_WEB_APP_CREATE_PROOF_REQUIREMENTS[
      1
    ];

  if (
    configuration ===
      undefined ||
    http ===
      undefined
  ) {
    throw new Error(
      "W01 proof requirement registry is incomplete.",
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
        input.configurationVerified
          ? "PASS" as const
          : "FAIL" as const,

      sourceType:
        configuration.source,

      sourceReference:
        input.configurationSourceReference,

      observedAtUtc:
        input.observedAtUtc,

      expectedSummary:
        configuration.description,

      observedSummary:
        input.configurationVerified
          ? "Authoritative readback matches the frozen disabled W01 web-app configuration."
          : "Authoritative readback does not match the frozen W01 web-app configuration.",

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
        "No enabled HTTP behavior is claimed by W01 because the fixture is deliberately created disabled.",

      provenance:
        "NOT_APPLICABLE" as const,

      safeEvidenceDigest:
        null,
    }),
  ]);
}
