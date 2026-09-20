export const EVIDENCE_APPLICABILITIES =
  Object.freeze([
    "REQUIRED",
    "OPTIONAL",
    "NOT_APPLICABLE",
  ] as const);

export type EvidenceApplicability =
  (typeof EVIDENCE_APPLICABILITIES)[number];

export const EVIDENCE_STATUSES =
  Object.freeze([
    "PENDING",
    "PASS",
    "FAIL",
    "MISSING",
    "UNKNOWN",
    "NOT_APPLICABLE",
  ] as const);

export type EvidenceStatus =
  (typeof EVIDENCE_STATUSES)[number];

export const EVIDENCE_PLANES =
  Object.freeze([
    "CONFIGURATION_READBACK",
    "LIVE_RUNTIME",
    "HTTP_BEHAVIOR",
    "PERMISSION_EFFECT",
    "TASK_STATE",
    "TASK_HISTORY",
    "PROCESS_STATE",
    "SECURITY_METADATA",
    "SECRET_INVENTORY",
    "X509_METADATA",
    "TLS_TEST",
    "NATIVE_AUDIT",
    "JOURNAL",
    "OPERATIONAL_LOG",
    "PERSISTENT_RECEIPT",
  ] as const);

export type EvidencePlane =
  (typeof EVIDENCE_PLANES)[number];

export const EVIDENCE_PROVENANCE_CLASSES =
  Object.freeze([
    "AUTHORITATIVE_IRIS",
    "AUTHORITATIVE_EXTERNAL_PROBE",
    "MERIDIAN_DERIVED",
    "CORRELATED",
    "NOT_APPLICABLE",
  ] as const);

export type EvidenceProvenanceClass =
  (typeof EVIDENCE_PROVENANCE_CLASSES)[number];

export interface ProofRequirement {
  readonly requirementId:
    string;

  readonly plane:
    EvidencePlane;

  readonly applicability:
    EvidenceApplicability;

  readonly description:
    string;

  readonly source:
    string;
}

export interface ProofResult {
  readonly requirementId:
    string;

  readonly plane:
    EvidencePlane;

  readonly applicability:
    EvidenceApplicability;

  readonly status:
    EvidenceStatus;

  readonly sourceType:
    string;

  readonly sourceReference:
    string | null;

  readonly observedAtUtc:
    string | null;

  readonly expectedSummary:
    string;

  readonly observedSummary:
    string;

  readonly provenance:
    EvidenceProvenanceClass;

  readonly safeEvidenceDigest:
    string | null;
}

export interface ProofClosureEvaluation {
  readonly satisfied:
    boolean;

  readonly blockingRequirementIds:
    readonly string[];
}

function isNonEmptyString(
  value:
    string,
): boolean {
  return (
    value.trim().length >
      0
  );
}

function isIsoUtc(
  value:
    string,
): boolean {
  return (
    value.endsWith(
      "Z",
    ) &&
    Number.isFinite(
      Date.parse(
        value,
      ),
    )
  );
}

function isSha256(
  value:
    string,
): boolean {
  return /^[A-Fa-f0-9]{64}$/.test(
    value,
  );
}

export function assertProofRequirement(
  requirement:
    ProofRequirement,
): void {
  if (
    !isNonEmptyString(
      requirement.requirementId,
    )
  ) {
    throw new Error(
      "Proof requirement id is required.",
    );
  }

  if (
    !(
      EVIDENCE_PLANES as readonly string[]
    ).includes(
      requirement.plane,
    )
  ) {
    throw new Error(
      `Unsupported evidence plane: ${requirement.plane}.`,
    );
  }

  if (
    !(
      EVIDENCE_APPLICABILITIES as readonly string[]
    ).includes(
      requirement.applicability,
    )
  ) {
    throw new Error(
      `Unsupported evidence applicability: ${requirement.applicability}.`,
    );
  }

  if (
    !isNonEmptyString(
      requirement.description,
    )
  ) {
    throw new Error(
      "Proof requirement description is required.",
    );
  }

  if (
    !isNonEmptyString(
      requirement.source,
    )
  ) {
    throw new Error(
      "Proof requirement source is required.",
    );
  }
}

export function assertProofResult(
  result:
    ProofResult,
): void {
  if (
    !isNonEmptyString(
      result.requirementId,
    )
  ) {
    throw new Error(
      "Proof result requirement id is required.",
    );
  }

  if (
    !(
      EVIDENCE_PLANES as readonly string[]
    ).includes(
      result.plane,
    )
  ) {
    throw new Error(
      `Unsupported proof result plane: ${result.plane}.`,
    );
  }

  if (
    !(
      EVIDENCE_APPLICABILITIES as readonly string[]
    ).includes(
      result.applicability,
    )
  ) {
    throw new Error(
      `Unsupported proof result applicability: ${result.applicability}.`,
    );
  }

  if (
    !(
      EVIDENCE_STATUSES as readonly string[]
    ).includes(
      result.status,
    )
  ) {
    throw new Error(
      `Unsupported proof result status: ${result.status}.`,
    );
  }

  if (
    !(
      EVIDENCE_PROVENANCE_CLASSES as readonly string[]
    ).includes(
      result.provenance,
    )
  ) {
    throw new Error(
      `Unsupported proof provenance: ${result.provenance}.`,
    );
  }

  if (
    !isNonEmptyString(
      result.sourceType,
    )
  ) {
    throw new Error(
      "Proof result source type is required.",
    );
  }

  if (
    result.sourceReference !==
      null &&
    !isNonEmptyString(
      result.sourceReference,
    )
  ) {
    throw new Error(
      "Proof result source reference must be null or non-empty.",
    );
  }

  if (
    result.observedAtUtc !==
      null &&
    !isIsoUtc(
      result.observedAtUtc,
    )
  ) {
    throw new Error(
      "Proof result observedAtUtc must be null or UTC ISO-8601.",
    );
  }

  if (
    !isNonEmptyString(
      result.expectedSummary,
    ) ||
    !isNonEmptyString(
      result.observedSummary,
    )
  ) {
    throw new Error(
      "Proof result expected and observed summaries are required.",
    );
  }

  if (
    result.safeEvidenceDigest !==
      null &&
    !isSha256(
      result.safeEvidenceDigest,
    )
  ) {
    throw new Error(
      "Proof result safeEvidenceDigest must be null or SHA-256 hex.",
    );
  }

  const notApplicable =
    result.applicability ===
      "NOT_APPLICABLE";

  if (
    notApplicable !==
      (
        result.status ===
          "NOT_APPLICABLE"
      )
  ) {
    throw new Error(
      "NOT_APPLICABLE status and applicability must agree.",
    );
  }

  if (
    notApplicable !==
      (
        result.provenance ===
          "NOT_APPLICABLE"
      )
  ) {
    throw new Error(
      "NOT_APPLICABLE provenance and applicability must agree.",
    );
  }

  if (
    result.status ===
      "PENDING" &&
    result.observedAtUtc !==
      null
  ) {
    throw new Error(
      "Pending proof evidence must not claim an observation timestamp.",
    );
  }

  if (
    (
      result.status ===
        "PASS" ||
      result.status ===
        "FAIL" ||
      result.status ===
        "MISSING" ||
      result.status ===
        "UNKNOWN"
    ) &&
    result.observedAtUtc ===
      null
  ) {
    throw new Error(
      "Observed proof evidence requires an observation timestamp.",
    );
  }
}

export function evaluateProofClosure(
  requirements:
    readonly ProofRequirement[],
  results:
    readonly ProofResult[],
): ProofClosureEvaluation {
  const requirementMap =
    new Map<
      string,
      ProofRequirement
    >();

  for (
    const requirement
    of requirements
  ) {
    assertProofRequirement(
      requirement,
    );

    if (
      requirementMap.has(
        requirement.requirementId,
      )
    ) {
      throw new Error(
        `Duplicate proof requirement id: ${requirement.requirementId}.`,
      );
    }

    requirementMap.set(
      requirement.requirementId,
      requirement,
    );
  }

  const resultMap =
    new Map<
      string,
      ProofResult
    >();

  for (
    const result
    of results
  ) {
    assertProofResult(
      result,
    );

    if (
      resultMap.has(
        result.requirementId,
      )
    ) {
      throw new Error(
        `Duplicate proof result id: ${result.requirementId}.`,
      );
    }

    const requirement =
      requirementMap.get(
        result.requirementId,
      );

    if (
      requirement ===
        undefined
    ) {
      throw new Error(
        `Unexpected proof result: ${result.requirementId}.`,
      );
    }

    if (
      result.plane !==
        requirement.plane ||
      result.applicability !==
        requirement.applicability
    ) {
      throw new Error(
        `Proof result does not match requirement contract: ${result.requirementId}.`,
      );
    }

    resultMap.set(
      result.requirementId,
      result,
    );
  }

  const blockingRequirementIds:
    string[] = [];

  for (
    const requirement
    of requirements
  ) {
    const result =
      resultMap.get(
        requirement.requirementId,
      );

    if (
      result ===
        undefined
    ) {
      blockingRequirementIds.push(
        requirement.requirementId,
      );

      continue;
    }

    if (
      requirement.applicability ===
        "REQUIRED" &&
      result.status !==
        "PASS"
    ) {
      blockingRequirementIds.push(
        requirement.requirementId,
      );

      continue;
    }

    if (
      requirement.applicability ===
        "NOT_APPLICABLE" &&
      result.status !==
        "NOT_APPLICABLE"
    ) {
      blockingRequirementIds.push(
        requirement.requirementId,
      );
    }
  }

  return Object.freeze({
    satisfied:
      blockingRequirementIds.length ===
      0,

    blockingRequirementIds:
      Object.freeze(
        [
          ...blockingRequirementIds,
        ],
      ),
  });
}
