export type AuthorizationDecision = "ALLOW" | "DENY" | "UNKNOWN";

export type AuthorizationVerificationState =
  | "PRE_FLIGHT"
  | "CONFIGURATION_APPLIED"
  | "CONFIGURATION_MISMATCH"
  | "LIVE_PENDING"
  | "LIVE_STALE"
  | "CONVERGED"
  | "EVIDENCE_INCOMPLETE"
  | "VERIFIED"
  | "UNAVAILABLE";

export interface PermissionProofRow {
  readonly id: string;
  readonly resource: string;
  readonly permission: string;
  readonly expectedDecision: AuthorizationDecision;
  readonly configuredDecision: AuthorizationDecision;
  readonly liveDecision: AuthorizationDecision;
}

export interface ConvergenceWitness {
  readonly required: boolean;
  readonly stalePid: number | null;
  readonly oldPidGone: boolean;
  readonly freshPid: number | null;
  readonly freshPidDiffers: boolean;
}

export interface AuthorizationProofInput {
  readonly configuredApplied: boolean;
  readonly configuredSourceAvailable: boolean;
  readonly liveSourceAvailable: boolean;
  readonly rows: readonly PermissionProofRow[];
  readonly convergence: ConvergenceWitness;
  readonly nativeEvidenceComplete: boolean;
  readonly canonicalReceiptPersisted: boolean;
}

export interface AuthorizationProofResult {
  readonly state: AuthorizationVerificationState;
  readonly verified: boolean;
  readonly configuredMismatchCount: number;
  readonly liveMismatchCount: number;
  readonly unknownExpectedCount: number;
  readonly unknownConfiguredCount: number;
  readonly unknownLiveCount: number;
}

export interface VerificationPresentation {
  readonly statusLabel: string;
  readonly detail: string;
  readonly success: boolean;
}

function countUnknown(
  rows: readonly PermissionProofRow[],
  select: (row: PermissionProofRow) => AuthorizationDecision,
): number {
  return rows.filter((row) => select(row) === "UNKNOWN").length;
}

function convergenceComplete(witness: ConvergenceWitness): boolean {
  if (!witness.required) {
    return true;
  }

  return (
    witness.stalePid !== null &&
    witness.oldPidGone &&
    witness.freshPid !== null &&
    witness.freshPidDiffers &&
    witness.freshPid !== witness.stalePid
  );
}

export function deriveAuthorizationProof(
  input: AuthorizationProofInput,
): AuthorizationProofResult {
  const unknownExpectedCount = countUnknown(
    input.rows,
    (row) => row.expectedDecision,
  );
  const unknownConfiguredCount = countUnknown(
    input.rows,
    (row) => row.configuredDecision,
  );
  const unknownLiveCount = countUnknown(
    input.rows,
    (row) => row.liveDecision,
  );

  const configuredMismatchCount = input.rows.filter(
    (row) =>
      row.expectedDecision !== "UNKNOWN" &&
      row.configuredDecision !== "UNKNOWN" &&
      row.expectedDecision !== row.configuredDecision,
  ).length;

  const liveMismatchCount = input.rows.filter(
    (row) =>
      row.configuredDecision !== "UNKNOWN" &&
      row.liveDecision !== "UNKNOWN" &&
      row.configuredDecision !== row.liveDecision,
  ).length;

  let state: AuthorizationVerificationState;

  if (
    !input.configuredSourceAvailable ||
    !input.liveSourceAvailable
  ) {
    state = "UNAVAILABLE";
  } else if (!input.configuredApplied) {
    state = "PRE_FLIGHT";
  } else if (configuredMismatchCount > 0) {
    state = "CONFIGURATION_MISMATCH";
  } else if (
    unknownExpectedCount > 0 ||
    unknownConfiguredCount > 0
  ) {
    state = "CONFIGURATION_APPLIED";
  } else if (unknownLiveCount > 0) {
    state = "LIVE_PENDING";
  } else if (liveMismatchCount > 0) {
    state = "LIVE_STALE";
  } else if (!convergenceComplete(input.convergence)) {
    state = "EVIDENCE_INCOMPLETE";
  } else if (
    !input.nativeEvidenceComplete ||
    !input.canonicalReceiptPersisted
  ) {
    state = "EVIDENCE_INCOMPLETE";
  } else {
    state = "VERIFIED";
  }

  return {
    state,
    verified: state === "VERIFIED",
    configuredMismatchCount,
    liveMismatchCount,
    unknownExpectedCount,
    unknownConfiguredCount,
    unknownLiveCount,
  };
}

export function verificationPresentation(
  state: AuthorizationVerificationState,
): VerificationPresentation {
  if (state === "VERIFIED") {
    return {
      statusLabel: "VERIFIED",
      detail: "CONFIGURED AND LIVE AUTHORIZATION CONVERGED",
      success: true,
    };
  }

  if (state === "LIVE_STALE") {
    return {
      statusLabel: "NOT VERIFIED",
      detail: "LIVE AUTHORITY HAS NOT CONVERGED",
      success: false,
    };
  }

  if (state === "LIVE_PENDING") {
    return {
      statusLabel: "NOT VERIFIED",
      detail: "LIVE AUTHORIZATION EVIDENCE IS PENDING",
      success: false,
    };
  }

  if (state === "CONFIGURATION_MISMATCH") {
    return {
      statusLabel: "NOT VERIFIED",
      detail: "CONFIGURATION DOES NOT MATCH REVIEWED INTENT",
      success: false,
    };
  }

  if (state === "UNAVAILABLE") {
    return {
      statusLabel: "NOT VERIFIED",
      detail: "AUTHORITATIVE EVIDENCE SOURCE IS UNAVAILABLE",
      success: false,
    };
  }

  if (state === "EVIDENCE_INCOMPLETE") {
    return {
      statusLabel: "NOT VERIFIED",
      detail: "CLOSURE EVIDENCE IS INCOMPLETE",
      success: false,
    };
  }

  if (state === "CONVERGED") {
    return {
      statusLabel: "NOT VERIFIED",
      detail: "AUTHORIZATION CONVERGED; RECEIPT CLOSURE IS PENDING",
      success: false,
    };
  }

  if (state === "CONFIGURATION_APPLIED") {
    return {
      statusLabel: "NOT VERIFIED",
      detail: "CONFIGURATION APPLIED; AUTHORIZATION PROOF IS INCOMPLETE",
      success: false,
    };
  }

  return {
    statusLabel: "NOT VERIFIED",
    detail: "CHANGE HAS NOT BEEN APPLIED",
    success: false,
  };
}