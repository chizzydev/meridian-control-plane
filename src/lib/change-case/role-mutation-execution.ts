import type {
  CenterpieceRoleMutationCommand,
} from "./role-mutation-design";

export interface StaleRoleMutationExecution {
  readonly state:
    "STALE";

  readonly mutationRequestSent:
    false;

  readonly mutationRequestCount:
    0;

  readonly securityMutationOutcomeKnown:
    true;

  readonly securityMutationConfirmed:
    false;

  readonly confirmedSecurityMutationCount:
    0;

  readonly mayRetryWithoutFreshRead:
    false;

  readonly reviewedDigest:
    string;

  readonly freshDigest:
    string;
}

export interface AppliedRoleMutationExecution {
  readonly state:
    "APPLIED";

  readonly mutationRequestSent:
    true;

  readonly mutationRequestCount:
    1;

  readonly securityMutationOutcomeKnown:
    true;

  readonly securityMutationConfirmed:
    true;

  readonly confirmedSecurityMutationCount:
    1;

  readonly configurationVerified:
    true;

  readonly convergenceRequired:
    true;

  readonly auditBindingRequired:
    true;

  readonly verified:
    false;

  readonly actor:
    string;

  readonly applyPid:
    string;

  readonly applyTimestamp:
    string;

  readonly beforeDirectRoles:
    readonly string[];

  readonly afterDirectRoles:
    readonly string[];
}

export interface FailedRoleMutationExecution {
  readonly state:
    "APPLY_FAILED";

  readonly mutationRequestSent:
    true;

  readonly mutationRequestCount:
    1;

  readonly securityMutationOutcomeKnown:
    false;

  readonly securityMutationConfirmed:
    false;

  readonly confirmedSecurityMutationCount:
    0;

  readonly configurationVerified:
    false;

  readonly requiresFreshAuthoritativeRead:
    true;

  readonly mayRetryWithoutFreshRead:
    false;

  readonly reason:
    string;
}

export type RoleMutationExecutionResult =
  | StaleRoleMutationExecution
  | AppliedRoleMutationExecution
  | FailedRoleMutationExecution;

function isRecord(
  value:
    unknown,
): value is Record<string, unknown> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}

function truthyStatus(
  value:
    unknown,
): boolean {
  return (
    value === true ||
    value === 1 ||
    value === "1"
  );
}

function normalizedRoles(
  value:
    string,
): string[] {
  return value
    .split(
      ",",
    )
    .map(
      (role) =>
        role.trim(),
    )
    .filter(
      Boolean,
    )
    .sort(
      (
        left,
        right,
      ) =>
        left.localeCompare(
          right,
        ),
    );
}

function sameRoles(
  left:
    readonly string[],

  right:
    readonly string[],
): boolean {
  const first =
    [...left].sort(
      (
        a,
        b,
      ) =>
        a.localeCompare(
          b,
        ),
    );

  const second =
    [...right].sort(
      (
        a,
        b,
      ) =>
        a.localeCompare(
          b,
        ),
    );

  return (
    first.length ===
      second.length &&
    first.every(
      (
        role,
        index,
      ) =>
        role ===
          second[index],
    )
  );
}

export function staleMutationExecution(
  input: {
    readonly reviewedDigest:
      string;

    readonly freshDigest:
      string;
  },
): StaleRoleMutationExecution {
  return Object.freeze({
    state:
      "STALE",

    mutationRequestSent:
      false,

    mutationRequestCount:
      0,

    securityMutationOutcomeKnown:
      true,

    securityMutationConfirmed:
      false,

    confirmedSecurityMutationCount:
      0,

    mayRetryWithoutFreshRead:
      false,

    reviewedDigest:
      input.reviewedDigest,

    freshDigest:
      input.freshDigest,
  });
}

export function failedMutationExecution(
  reason:
    string,
): FailedRoleMutationExecution {
  return Object.freeze({
    state:
      "APPLY_FAILED",

    mutationRequestSent:
      true,

    mutationRequestCount:
      1,

    securityMutationOutcomeKnown:
      false,

    securityMutationConfirmed:
      false,

    confirmedSecurityMutationCount:
      0,

    configurationVerified:
      false,

    requiresFreshAuthoritativeRead:
      true,

    mayRetryWithoutFreshRead:
      false,

    reason,
  });
}

export function classifyCenterpieceMutationResponse(
  input: {
    readonly status:
      number;

    readonly payload:
      unknown;

    readonly command:
      CenterpieceRoleMutationCommand;
  },
): RoleMutationExecutionResult {
  if (
    input.status < 200 ||
    input.status >= 300
  ) {
    return failedMutationExecution(
      `MUTATION_HTTP_${input.status}`,
    );
  }

  if (
    !isRecord(
      input.payload,
    )
  ) {
    return failedMutationExecution(
      "INVALID_MUTATION_RESPONSE",
    );
  }

  const payload =
    input.payload;

  if (
    payload.designVersion !==
      input.command.contractVersion ||
    payload.operation !==
      input.command.operation ||
    payload.target !==
      input.command.username ||
    payload.role !==
      input.command.role
  ) {
    return failedMutationExecution(
      "MUTATION_RESPONSE_IDENTITY_MISMATCH",
    );
  }

  if (
    typeof payload.beforeRoles !==
      "string" ||
    typeof payload.afterRoles !==
      "string"
  ) {
    return failedMutationExecution(
      "MUTATION_RESPONSE_ROLESET_MISSING",
    );
  }

  const before =
    normalizedRoles(
      payload.beforeRoles,
    );

  const after =
    normalizedRoles(
      payload.afterRoles,
    );

  if (
    !sameRoles(
      before,
      input.command.expectedBeforeDirectRoles,
    )
  ) {
    return failedMutationExecution(
      "MUTATION_RESPONSE_BEFORE_ROLESET_MISMATCH",
    );
  }

  if (
    !sameRoles(
      after,
      input.command.expectedAfterDirectRoles,
    )
  ) {
    return failedMutationExecution(
      "MUTATION_RESPONSE_AFTER_ROLESET_MISMATCH",
    );
  }

  if (
    !truthyStatus(
      payload.statusOK,
    ) ||
    !truthyStatus(
      payload.postReadOK,
    ) ||
    !truthyStatus(
      payload.ok,
    )
  ) {
    return failedMutationExecution(
      "MUTATION_RESPONSE_NOT_VERIFIED",
    );
  }

  if (
    typeof payload.actor !==
      "string" ||
    payload.actor.length ===
      0 ||
    (
      typeof payload.applyPid !==
        "string" &&
      typeof payload.applyPid !==
        "number"
    ) ||
    typeof payload.applyTimestamp !==
      "string" ||
    payload.applyTimestamp.length ===
      0
  ) {
    return failedMutationExecution(
      "MUTATION_RESPONSE_EVIDENCE_MISSING",
    );
  }

  return Object.freeze({
    state:
      "APPLIED",

    mutationRequestSent:
      true,

    mutationRequestCount:
      1,

    securityMutationOutcomeKnown:
      true,

    securityMutationConfirmed:
      true,

    confirmedSecurityMutationCount:
      1,

    configurationVerified:
      true,

    convergenceRequired:
      true,

    auditBindingRequired:
      true,

    verified:
      false,

    actor:
      payload.actor,

    applyPid:
      String(
        payload.applyPid,
      ),

    applyTimestamp:
      payload.applyTimestamp,

    beforeDirectRoles:
      Object.freeze(
        before,
      ),

    afterDirectRoles:
      Object.freeze(
        after,
      ),
  });
}