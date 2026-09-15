import type {
  StagedRoleChange,
} from "./domain";

export const PREFLIGHT_READ_STATUSES = [
  "READY_TO_PREFLIGHT",
  "BASELINE_NOT_READY",
] as const;

export type PreflightReadStatus =
  (typeof PREFLIGHT_READ_STATUSES)[number];

export interface PermissionCheck {
  resource: string;
  permission: "READ" | "WRITE" | "USE";
  allowed: boolean;
}

export interface AuthoritativeCurrentAccess {
  username: string;
  displayName: string;
  enabled: boolean;
  namespace: string;
  directRoles: string[];
  effectiveRoles: string[];
  permissions: PermissionCheck[];
}

export interface PreflightReadFoundation {
  change: StagedRoleChange;
  current: AuthoritativeCurrentAccess;
  targetRolePresent: boolean;
  status: PreflightReadStatus;
  requiresDemoReset: boolean;
}

/**
 * This classification is intentionally strict.
 *
 * A REMOVE preflight is meaningful only when the target role is actually
 * present in the authoritative current direct-role definition.
 *
 * We do not synthesize a "before" state from historical evidence.
 */
export function classifyPreflightReadFoundation(input: {
  change: StagedRoleChange;
  current: AuthoritativeCurrentAccess;
}): PreflightReadFoundation {
  const targetRolePresent =
    input.current.directRoles.includes(
      input.change.role,
    );

  const baselineReady =
    input.change.operation === "REMOVE"
      ? targetRolePresent
      : !targetRolePresent;

  return {
    change: input.change,
    current: input.current,
    targetRolePresent,
    status: baselineReady
      ? "READY_TO_PREFLIGHT"
      : "BASELINE_NOT_READY",
    requiresDemoReset: !baselineReady,
  };
}