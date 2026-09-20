import type {
  VerifiedActionState,
} from "./action-state";

import {
  assertVerifiedActionTransition,
} from "./action-state";

import {
  digestCanonicalJson,
} from "./digest";

import {
  ProofEngineError,
} from "./errors";

export const VERIFIED_ACTION_EVENT_SCHEMA_VERSION =
  "meridian.verified-action-event.v2" as const;

export const VERIFIED_ACTION_EVENT_GENESIS =
  "MERIDIAN_VERIFIED_ACTION_EVENT_GENESIS_V1" as const;

export const VERIFIED_ACTION_EVENT_TYPES =
  Object.freeze([
    "ACTION_CREATED",
    "PREFLIGHT_STARTED",
    "PREFLIGHT_COMPLETED",
    "REVIEW_ACCEPTED",
    "REVALIDATION_STARTED",
    "REVALIDATION_MATCHED",
    "REVALIDATION_STALE",
    "AUTHORITY_DENIED",
    "APPLY_DISPATCH_STARTED",
    "APPLY_RESPONSE_ACCEPTED",
    "APPLY_FAILED",
    "APPLY_OUTCOME_UNKNOWN",
    "RECONCILIATION_STARTED",
    "RECONCILIATION_APPLIED",
    "RECONCILIATION_NOT_APPLIED",
    "RECONCILIATION_STILL_UNKNOWN",
    "VERIFY_STARTED",
    "EVIDENCE_RECORDED",
    "VERIFY_FAILED",
    "VERIFY_OUTCOME_UNKNOWN",
    "EVIDENCE_COMPLETE",
    "RECEIPT_WRITE_STARTED",
    "RECEIPT_PERSISTED",
    "RECEIPT_READBACK_VERIFIED",
    "RECEIPT_WRITE_FAILED",
    "ACTION_VERIFIED",
  ] as const);

export type VerifiedActionEventType =
  (typeof VERIFIED_ACTION_EVENT_TYPES)[number];

export interface VerifiedActionEventV2 {
  readonly schemaVersion:
    typeof VERIFIED_ACTION_EVENT_SCHEMA_VERSION;

  readonly actionId:
    string;

  readonly sequence:
    number;

  readonly eventType:
    VerifiedActionEventType;

  readonly fromState:
    VerifiedActionState | "NONE";

  readonly toState:
    VerifiedActionState;

  readonly versionBefore:
    number;

  readonly versionAfter:
    number;

  readonly occurredAtUtc:
    string;

  readonly detail:
    Readonly<
      Record<
        string,
        unknown
      >
    >;

  readonly previousEventHash:
    string;

  readonly eventHash:
    string;
}

export type VerifiedActionEventUnsigned =
  Omit<
    VerifiedActionEventV2,
    "schemaVersion" |
    "eventHash"
  >;

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

function assertSafeActionId(
  actionId:
    string,
): void {
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(
      actionId,
    )
  ) {
    throw new ProofEngineError(
      "INVALID_TARGET",
      "Verified Action id is not an opaque safe identifier.",
      {
        actionId,
      },
    );
  }
}

function assertPositiveInteger(
  value:
    number,
  label:
    string,
): void {
  if (
    !Number.isInteger(
      value,
    ) ||
    value <
      1
  ) {
    throw new ProofEngineError(
      "INVALID_CONTRACT",
      `${label} must be a positive integer.`,
      {
        label,
      },
    );
  }
}

function assertHashOrGenesis(
  value:
    string,
): void {
  if (
    value !==
      VERIFIED_ACTION_EVENT_GENESIS &&
    !/^[A-F0-9]{64}$/.test(
      value,
    )
  ) {
    throw new ProofEngineError(
      "INVALID_CANONICAL_VALUE",
      "Previous action event hash is invalid.",
    );
  }
}

const EVENT_TRANSITIONS:
  Readonly<
    Partial<
      Record<
        VerifiedActionEventType,
        readonly string[]
      >
    >
  > =
  Object.freeze({
    PREFLIGHT_STARTED:
      Object.freeze([
        "CREATED>PREFLIGHTING",
      ] as const),

    PREFLIGHT_COMPLETED:
      Object.freeze([
        "PREFLIGHTING>PREFLIGHTED",
      ] as const),

    REVIEW_ACCEPTED:
      Object.freeze([
        "PREFLIGHTED>APPROVED",
      ] as const),

    REVALIDATION_STARTED:
      Object.freeze([
        "APPROVED>REVALIDATING",
      ] as const),

    REVALIDATION_MATCHED:
      Object.freeze([
        "REVALIDATING>READY",
      ] as const),

    REVALIDATION_STALE:
      Object.freeze([
        "REVALIDATING>STALE",
      ] as const),

    AUTHORITY_DENIED:
      Object.freeze([
        "PREFLIGHTING>DENIED",
        "REVALIDATING>DENIED",
        "READY>DENIED",
      ] as const),

    APPLY_DISPATCH_STARTED:
      Object.freeze([
        "READY>APPLYING",
      ] as const),

    APPLY_RESPONSE_ACCEPTED:
      Object.freeze([
        "APPLYING>APPLIED",
      ] as const),

    APPLY_FAILED:
      Object.freeze([
        "APPLYING>APPLY_FAILED",
      ] as const),

    APPLY_OUTCOME_UNKNOWN:
      Object.freeze([
        "APPLYING>UNKNOWN_AFTER_DISPATCH",
      ] as const),

    RECONCILIATION_STARTED:
      Object.freeze([
        "UNKNOWN_AFTER_DISPATCH>RECONCILING",
      ] as const),

    RECONCILIATION_APPLIED:
      Object.freeze([
        "RECONCILING>APPLIED",
      ] as const),

    RECONCILIATION_NOT_APPLIED:
      Object.freeze([
        "RECONCILING>APPLY_FAILED",
      ] as const),

    RECONCILIATION_STILL_UNKNOWN:
      Object.freeze([
        "RECONCILING>UNKNOWN_AFTER_DISPATCH",
      ] as const),

    VERIFY_STARTED:
      Object.freeze([
        "APPLIED>VERIFYING",
      ] as const),

    VERIFY_FAILED:
      Object.freeze([
        "VERIFYING>VERIFY_FAILED",
      ] as const),

    VERIFY_OUTCOME_UNKNOWN:
      Object.freeze([
        "VERIFYING>UNKNOWN_AFTER_DISPATCH",
      ] as const),

    EVIDENCE_COMPLETE:
      Object.freeze([
        "VERIFYING>EVIDENCE_COMPLETE",
      ] as const),

    RECEIPT_WRITE_STARTED:
      Object.freeze([
        "EVIDENCE_COMPLETE>RECEIPT_PERSISTING",
      ] as const),

    RECEIPT_WRITE_FAILED:
      Object.freeze([
        "RECEIPT_PERSISTING>RECEIPT_WRITE_FAILED",
      ] as const),

    ACTION_VERIFIED:
      Object.freeze([
        "RECEIPT_PERSISTING>VERIFIED",
      ] as const),
  });

const SAME_STATE_EVENTS:
  Readonly<
    Partial<
      Record<
        VerifiedActionEventType,
        readonly VerifiedActionState[]
      >
    >
  > =
  Object.freeze({
    EVIDENCE_RECORDED:
      Object.freeze([
        "VERIFYING",
      ] as const),

    RECEIPT_PERSISTED:
      Object.freeze([
        "RECEIPT_PERSISTING",
      ] as const),

    RECEIPT_READBACK_VERIFIED:
      Object.freeze([
        "RECEIPT_PERSISTING",
      ] as const),
  });

function assertEventStateSemantics(
  eventType:
    VerifiedActionEventType,
  fromState:
    VerifiedActionState | "NONE",
  toState:
    VerifiedActionState,
): void {
  if (
    eventType ===
      "ACTION_CREATED"
  ) {
    if (
      fromState !==
        "NONE" ||
      toState !==
        "CREATED"
    ) {
      throw new ProofEngineError(
        "INVALID_CONTRACT",
        "ACTION_CREATED must establish NONE -> CREATED.",
      );
    }

    return;
  }

  if (
    fromState ===
      "NONE"
  ) {
    throw new ProofEngineError(
      "INVALID_CONTRACT",
      `${eventType} cannot start from NONE.`,
    );
  }

  if (
    fromState ===
      toState
  ) {
    const allowedStates =
      SAME_STATE_EVENTS[
        eventType
      ] ??
      [];

    if (
      !allowedStates.includes(
        fromState,
      )
    ) {
      throw new ProofEngineError(
        "INVALID_CONTRACT",
        (
          `Event ${eventType} cannot append without ` +
          `a lifecycle transition from ${fromState}.`
        ),
      );
    }

    return;
  }

  assertVerifiedActionTransition(
    fromState,
    toState,
  );

  const pair =
    `${fromState}>${toState}`;

  const allowed =
    EVENT_TRANSITIONS[
      eventType
    ] ??
    [];

  if (
    !allowed.includes(
      pair,
    )
  ) {
    throw new ProofEngineError(
      "INVALID_CONTRACT",
      `Event ${eventType} does not own transition ${pair}.`,
    );
  }
}

function eventMaterial(
  event:
    VerifiedActionEventV2,
): Omit<
  VerifiedActionEventV2,
  "eventHash"
> {
  const {
    eventHash:
      ignoredEventHash,
    ...unsigned
  } = event;

  void ignoredEventHash;

  return unsigned;
}

export function createVerifiedActionEvent(
  input:
    VerifiedActionEventUnsigned,
): VerifiedActionEventV2 {
  assertSafeActionId(
    input.actionId,
  );

  assertPositiveInteger(
    input.sequence,
    "Action event sequence",
  );

  if (
    input.versionBefore <
      0 ||
    input.versionAfter !==
      input.versionBefore +
        1
  ) {
    throw new ProofEngineError(
      "INVALID_CONTRACT",
      "Action event versions are not monotonic.",
    );
  }

  if (
    input.sequence !==
      input.versionAfter
  ) {
    throw new ProofEngineError(
      "INVALID_CONTRACT",
      "Action event sequence must equal versionAfter.",
    );
  }

  if (
    !isIsoUtc(
      input.occurredAtUtc,
    )
  ) {
    throw new ProofEngineError(
      "INVALID_CANONICAL_VALUE",
      "Action event timestamp must be UTC ISO-8601.",
    );
  }

  assertHashOrGenesis(
    input.previousEventHash,
  );

  assertEventStateSemantics(
    input.eventType,
    input.fromState,
    input.toState,
  );

  if (
    input.sequence ===
      1
  ) {
    if (
      input.eventType !==
        "ACTION_CREATED" ||
      input.previousEventHash !==
        VERIFIED_ACTION_EVENT_GENESIS
    ) {
      throw new ProofEngineError(
        "INVALID_CONTRACT",
        "First action event must be ACTION_CREATED from the genesis marker.",
      );
    }
  }
  else if (
    input.previousEventHash ===
      VERIFIED_ACTION_EVENT_GENESIS
  ) {
    throw new ProofEngineError(
      "INVALID_CONTRACT",
      "Only the first action event may reference the genesis marker.",
    );
  }

  const withoutHash =
    Object.freeze({
      schemaVersion:
        VERIFIED_ACTION_EVENT_SCHEMA_VERSION,

      ...input,
    });

  return Object.freeze({
    ...withoutHash,

    eventHash:
      digestCanonicalJson(
        withoutHash,
      ),
  });
}

export function appendVerifiedActionEvent(
  previous:
    VerifiedActionEventV2,
  input:
    Omit<
      VerifiedActionEventUnsigned,
      | "actionId"
      | "sequence"
      | "versionBefore"
      | "versionAfter"
      | "previousEventHash"
      | "fromState"
    >,
): VerifiedActionEventV2 {
  assertVerifiedActionEvent(
    previous,
  );

  return createVerifiedActionEvent({
    actionId:
      previous.actionId,

    sequence:
      previous.sequence +
      1,

    eventType:
      input.eventType,

    fromState:
      previous.toState,

    toState:
      input.toState,

    versionBefore:
      previous.versionAfter,

    versionAfter:
      previous.versionAfter +
        1,

    occurredAtUtc:
      input.occurredAtUtc,

    detail:
      input.detail,

    previousEventHash:
      previous.eventHash,
  });
}

export function assertVerifiedActionEvent(
  event:
    VerifiedActionEventV2,
): void {
  if (
    event.schemaVersion !==
      VERIFIED_ACTION_EVENT_SCHEMA_VERSION
  ) {
    throw new ProofEngineError(
      "INVALID_CONTRACT",
      "Unsupported Verified Action event schema.",
    );
  }

  assertSafeActionId(
    event.actionId,
  );

  assertPositiveInteger(
    event.sequence,
    "Action event sequence",
  );

  if (
    !(
      VERIFIED_ACTION_EVENT_TYPES as readonly string[]
    ).includes(
      event.eventType,
    )
  ) {
    throw new ProofEngineError(
      "INVALID_CONTRACT",
      "Unsupported Verified Action event type.",
    );
  }

  if (
    event.versionBefore <
      0 ||
    event.versionAfter !==
      event.versionBefore +
        1 ||
    event.sequence !==
      event.versionAfter
  ) {
    throw new ProofEngineError(
      "INVALID_CONTRACT",
      "Action event sequence/version relationship is invalid.",
    );
  }

  if (
    !isIsoUtc(
      event.occurredAtUtc,
    )
  ) {
    throw new ProofEngineError(
      "INVALID_CANONICAL_VALUE",
      "Action event timestamp must be UTC ISO-8601.",
    );
  }

  assertHashOrGenesis(
    event.previousEventHash,
  );

  assertEventStateSemantics(
    event.eventType,
    event.fromState,
    event.toState,
  );

  if (
    event.sequence ===
      1
  ) {
    if (
      event.eventType !==
        "ACTION_CREATED" ||
      event.previousEventHash !==
        VERIFIED_ACTION_EVENT_GENESIS
    ) {
      throw new ProofEngineError(
        "INVALID_CONTRACT",
        "First action event must be ACTION_CREATED from genesis.",
      );
    }
  }
  else if (
    event.previousEventHash ===
      VERIFIED_ACTION_EVENT_GENESIS
  ) {
    throw new ProofEngineError(
      "INVALID_CONTRACT",
      "Only the first action event may reference genesis.",
    );
  }

  if (
    !/^[A-F0-9]{64}$/.test(
      event.eventHash,
    )
  ) {
    throw new ProofEngineError(
      "INVALID_CANONICAL_VALUE",
      "Action event hash must be uppercase SHA-256.",
    );
  }

  const expected =
    digestCanonicalJson(
      eventMaterial(
        event,
      ),
    );

  if (
    event.eventHash !==
      expected
  ) {
    throw new ProofEngineError(
      "INVALID_CANONICAL_VALUE",
      "Action event hash does not match canonical event material.",
      {
        expected,
        actual:
          event.eventHash,
      },
    );
  }
}

export function verifyVerifiedActionEventChain(
  events:
    readonly VerifiedActionEventV2[],
): void {
  if (
    events.length <
      1
  ) {
    throw new ProofEngineError(
      "INVALID_CONTRACT",
      "Verified Action event chain must not be empty.",
    );
  }

  events.forEach(
    (
      event,
      index,
    ) => {
      assertVerifiedActionEvent(
        event,
      );

      if (
        index ===
          0
      ) {
        if (
          event.sequence !==
            1 ||
          event.versionBefore !==
            0 ||
          event.versionAfter !==
            1 ||
          event.eventType !==
            "ACTION_CREATED" ||
          event.fromState !==
            "NONE" ||
          event.toState !==
            "CREATED" ||
          event.previousEventHash !==
            VERIFIED_ACTION_EVENT_GENESIS
        ) {
          throw new ProofEngineError(
            "INVALID_CONTRACT",
            "Verified Action chain has an invalid genesis event.",
          );
        }

        return;
      }

      const previous =
        events[
          index -
            1
        ];

      if (
        previous ===
          undefined ||
        event.actionId !==
          previous.actionId ||
        event.sequence !==
          previous.sequence +
            1 ||
        event.versionBefore !==
          previous.versionAfter ||
        event.versionAfter !==
          previous.versionAfter +
            1 ||
        event.fromState !==
          previous.toState ||
        event.previousEventHash !==
          previous.eventHash
      ) {
        throw new ProofEngineError(
          "INVALID_CANONICAL_VALUE",
          `Verified Action event chain breaks at sequence ${event.sequence}.`,
        );
      }
    },
  );
}
