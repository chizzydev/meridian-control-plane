export const CHANGE_CASE_STATES = [
  "PROPOSED",
  "PREFLIGHTED",
  "READY",
  "APPLIED",
  "CONVERGING",
  "AUDIT_PENDING",
  "VERIFIED",
  "STALE",
  "APPLY_FAILED",
] as const;

export type ChangeCaseState = (typeof CHANGE_CASE_STATES)[number];

export const ROLE_MUTATION_OPERATIONS = ["ADD", "REMOVE"] as const;

export type RoleMutationOperation =
  (typeof ROLE_MUTATION_OPERATIONS)[number];

export interface StagedRoleChange {
  username: string;
  displayName: string;
  operation: RoleMutationOperation;
  role: string;
}

export interface ChangeCase {
  id: string;
  state: ChangeCaseState;
  change: StagedRoleChange;
  reviewedPreflightDigest: string | null;
}

export const CENTERPIECE_CHANGE: StagedRoleChange = {
  username: "maya.patel",
  displayName: "Maya Patel",
  operation: "REMOVE",
  role: "MeridianSupervisor",
};

const TRANSITIONS: Readonly<
  Record<ChangeCaseState, readonly ChangeCaseState[]>
> = {
  PROPOSED: ["PREFLIGHTED"],
  PREFLIGHTED: ["READY"],
  READY: ["APPLIED", "STALE", "APPLY_FAILED"],
  APPLIED: ["CONVERGING", "AUDIT_PENDING"],
  CONVERGING: ["VERIFIED", "AUDIT_PENDING"],
  AUDIT_PENDING: ["VERIFIED"],
  VERIFIED: [],
  STALE: ["PREFLIGHTED"],
  APPLY_FAILED: ["PREFLIGHTED"],
};

export function canTransition(
  from: ChangeCaseState,
  to: ChangeCaseState,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(
  from: ChangeCaseState,
  to: ChangeCaseState,
): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid Change Case transition: ${from} -> ${to}`);
  }
}

export function createProposedChangeCase(
  id: string,
  change: StagedRoleChange,
): ChangeCase {
  return {
    id,
    state: "PROPOSED",
    change,
    reviewedPreflightDigest: null,
  };
}