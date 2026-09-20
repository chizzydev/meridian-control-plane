import {
  LIVE_WITNESS_LOST_PERMISSION_KEYS,
  LIVE_WITNESS_RETAINED_PERMISSION_KEYS,
  LIVE_WITNESS_TRANSPORT_PERMISSION_KEYS,
  type LiveWitnessProcessRow,
  type LiveWitnessSelfSnapshot,
} from "../../change-case/live-convergence";

export const USER_REMOVE_ROLE_LIVE_EVIDENCE_SCHEMA_VERSION =
  "meridian.user-remove-role-live-evidence.v1" as const;

export interface UserRemoveRoleLiveEvidence {
  readonly schemaVersion:
    typeof USER_REMOVE_ROLE_LIVE_EVIDENCE_SCHEMA_VERSION;

  readonly staleSameConnectionProven:
    true;

  readonly oldServerPid:
    number;

  readonly freshServerPid:
    number;

  readonly oldPidGone:
    true;

  readonly lostPermissionDeniedCount:
    number;

  readonly retainedPermissionAllowedCount:
    number;

  readonly transportPermissionAllowedCount:
    number;

  readonly freshProcessBound:
    true;

  readonly converged:
    true;
}

function assertPositivePid(
  value:
    number,
  label:
    string,
): void {
  if (
    !Number.isSafeInteger(
      value,
    ) ||
    value <
      1
  ) {
    throw new Error(
      `${label} is invalid.`,
    );
  }
}

function allChecksEqual(
  snapshot:
    LiveWitnessSelfSnapshot,
  keys:
    readonly (
      keyof LiveWitnessSelfSnapshot["checks"]
    )[],
  expected:
    0 | 1,
): boolean {
  return keys.every(
    (
      key,
    ) =>
      snapshot.checks[
        key
      ] ===
        expected,
  );
}

export function assertUserRemoveRolePreApplyWitness(
  input: {
    readonly snapshot:
      LiveWitnessSelfSnapshot;

    readonly processRows:
      readonly LiveWitnessProcessRow[];
  },
): void {
  assertPositivePid(
    input.snapshot.serverPid,
    "Pre-Apply witness PID",
  );

  if (
    !allChecksEqual(
      input.snapshot,
      LIVE_WITNESS_LOST_PERMISSION_KEYS,
      1,
    ) ||
    !allChecksEqual(
      input.snapshot,
      LIVE_WITNESS_RETAINED_PERMISSION_KEYS,
      1,
    ) ||
    !allChecksEqual(
      input.snapshot,
      LIVE_WITNESS_TRANSPORT_PERMISSION_KEYS,
      1,
    )
  ) {
    throw new Error(
      "Pre-Apply live witness does not have the exact expected authority.",
    );
  }

  if (
    input.processRows.length !==
      1 ||
    input.processRows[0]
      ?.pid !==
      input.snapshot.serverPid
  ) {
    throw new Error(
      "Pre-Apply ProcessQuery did not bind exactly one witness PID.",
    );
  }
}

export function proveUserRemoveRoleLiveConvergence(
  input: {
    readonly preApply:
      LiveWitnessSelfSnapshot;

    readonly stale:
      LiveWitnessSelfSnapshot;

    readonly fresh:
      LiveWitnessSelfSnapshot;

    readonly oldPidGone:
      boolean;

    readonly freshProcessRows:
      readonly LiveWitnessProcessRow[];
  },
): UserRemoveRoleLiveEvidence {
  assertPositivePid(
    input.preApply.serverPid,
    "Pre-Apply witness PID",
  );

  assertPositivePid(
    input.stale.serverPid,
    "Stale witness PID",
  );

  assertPositivePid(
    input.fresh.serverPid,
    "Fresh witness PID",
  );

  if (
    input.stale.serverPid !==
      input.preApply.serverPid
  ) {
    throw new Error(
      "Post-Apply stale witness did not preserve the same live IRIS process.",
    );
  }

  if (
    !allChecksEqual(
      input.stale,
      LIVE_WITNESS_LOST_PERMISSION_KEYS,
      1,
    )
  ) {
    throw new Error(
      "Same-process stale witness did not retain all four removed permissions.",
    );
  }

  if (
    !input.oldPidGone
  ) {
    throw new Error(
      "Old witness PID disappearance was not proven.",
    );
  }

  if (
    input.fresh.serverPid ===
      input.preApply.serverPid
  ) {
    throw new Error(
      "Fresh witness reused the stale IRIS process PID.",
    );
  }

  if (
    !allChecksEqual(
      input.fresh,
      LIVE_WITNESS_LOST_PERMISSION_KEYS,
      0,
    )
  ) {
    throw new Error(
      "Fresh witness did not deny all four removed permissions.",
    );
  }

  if (
    !allChecksEqual(
      input.fresh,
      LIVE_WITNESS_RETAINED_PERMISSION_KEYS,
      1,
    )
  ) {
    throw new Error(
      "Fresh witness lost a retained business permission.",
    );
  }

  if (
    !allChecksEqual(
      input.fresh,
      LIVE_WITNESS_TRANSPORT_PERMISSION_KEYS,
      1,
    )
  ) {
    throw new Error(
      "Fresh witness lost a required Native SDK transport permission.",
    );
  }

  if (
    input.freshProcessRows.length !==
      1 ||
    input.freshProcessRows[0]
      ?.pid !==
      input.fresh.serverPid
  ) {
    throw new Error(
      "Fresh ProcessQuery did not bind exactly one converged witness PID.",
    );
  }

  return Object.freeze({
    schemaVersion:
      USER_REMOVE_ROLE_LIVE_EVIDENCE_SCHEMA_VERSION,

    staleSameConnectionProven:
      true as const,

    oldServerPid:
      input.preApply.serverPid,

    freshServerPid:
      input.fresh.serverPid,

    oldPidGone:
      true as const,

    lostPermissionDeniedCount:
      LIVE_WITNESS_LOST_PERMISSION_KEYS.length,

    retainedPermissionAllowedCount:
      LIVE_WITNESS_RETAINED_PERMISSION_KEYS.length,

    transportPermissionAllowedCount:
      LIVE_WITNESS_TRANSPORT_PERMISSION_KEYS.length,

    freshProcessBound:
      true as const,

    converged:
      true as const,
  });
}
