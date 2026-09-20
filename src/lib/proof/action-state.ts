export const VERIFIED_ACTION_STATES =
  Object.freeze([
    "CREATED",
    "PREFLIGHTING",
    "PREFLIGHTED",
    "APPROVED",
    "REVALIDATING",
    "READY",
    "APPLYING",
    "APPLIED",
    "RECONCILING",
    "VERIFYING",
    "EVIDENCE_COMPLETE",
    "RECEIPT_PERSISTING",
    "VERIFIED",
    "STALE",
    "DENIED",
    "APPLY_FAILED",
    "UNKNOWN_AFTER_DISPATCH",
    "VERIFY_FAILED",
    "RECEIPT_WRITE_FAILED",
  ] as const);

export type VerifiedActionState =
  (typeof VERIFIED_ACTION_STATES)[number];

export const VERIFIED_ACTION_FAILURE_STATES =
  Object.freeze([
    "STALE",
    "DENIED",
    "APPLY_FAILED",
    "UNKNOWN_AFTER_DISPATCH",
    "VERIFY_FAILED",
    "RECEIPT_WRITE_FAILED",
  ] as const);

export type VerifiedActionFailureState =
  (typeof VERIFIED_ACTION_FAILURE_STATES)[number];

const TRANSITIONS:
  Readonly<
    Record<
      VerifiedActionState,
      readonly VerifiedActionState[]
    >
  > =
  Object.freeze({
    CREATED:
      Object.freeze([
        "PREFLIGHTING",
      ] as const),

    PREFLIGHTING:
      Object.freeze([
        "PREFLIGHTED",
        "DENIED",
      ] as const),

    PREFLIGHTED:
      Object.freeze([
        "APPROVED",
      ] as const),

    APPROVED:
      Object.freeze([
        "REVALIDATING",
      ] as const),

    REVALIDATING:
      Object.freeze([
        "READY",
        "STALE",
        "DENIED",
      ] as const),

    READY:
      Object.freeze([
        "APPLYING",
        "DENIED",
      ] as const),

    APPLYING:
      Object.freeze([
        "APPLIED",
        "APPLY_FAILED",
        "UNKNOWN_AFTER_DISPATCH",
      ] as const),

    APPLIED:
      Object.freeze([
        "VERIFYING",
      ] as const),

    RECONCILING:
      Object.freeze([
        "APPLIED",
        "APPLY_FAILED",
        "UNKNOWN_AFTER_DISPATCH",
      ] as const),

    VERIFYING:
      Object.freeze([
        "EVIDENCE_COMPLETE",
        "VERIFY_FAILED",
        "UNKNOWN_AFTER_DISPATCH",
      ] as const),

    EVIDENCE_COMPLETE:
      Object.freeze([
        "RECEIPT_PERSISTING",
      ] as const),

    RECEIPT_PERSISTING:
      Object.freeze([
        "VERIFIED",
        "RECEIPT_WRITE_FAILED",
      ] as const),

    VERIFIED:
      Object.freeze(
        [] as const,
      ),

    STALE:
      Object.freeze(
        [] as const,
      ),

    DENIED:
      Object.freeze(
        [] as const,
      ),

    APPLY_FAILED:
      Object.freeze(
        [] as const,
      ),

    UNKNOWN_AFTER_DISPATCH:
      Object.freeze([
        "RECONCILING",
      ] as const),

    VERIFY_FAILED:
      Object.freeze(
        [] as const,
      ),

    RECEIPT_WRITE_FAILED:
      Object.freeze(
        [] as const,
      ),
  });

export function canTransitionVerifiedAction(
  from:
    VerifiedActionState,
  to:
    VerifiedActionState,
): boolean {
  return TRANSITIONS[
    from
  ].includes(
    to,
  );
}

export function assertVerifiedActionTransition(
  from:
    VerifiedActionState,
  to:
    VerifiedActionState,
): void {
  if (
    !canTransitionVerifiedAction(
      from,
      to,
    )
  ) {
    throw new Error(
      `Invalid Verified Action transition: ${from} -> ${to}`,
    );
  }
}

export function isVerifiedActionTerminal(
  state:
    VerifiedActionState,
): boolean {
  return (
    TRANSITIONS[
      state
    ].length ===
      0
  );
}

export function isVerifiedActionFailure(
  state:
    VerifiedActionState,
): state is VerifiedActionFailureState {
  return (
    VERIFIED_ACTION_FAILURE_STATES as readonly string[]
  ).includes(
    state,
  );
}
