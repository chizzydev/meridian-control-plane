import {
  CHANGE_CASE_STATES,
  assertTransition,
  type ChangeCaseState,
} from "./domain";

import {
  DEMO_FIXTURE_ID,
  DEMO_FIXTURE_TARGET_ROLE,
  DEMO_FIXTURE_USERNAME,
} from "./demo-fixture";

export const DURABLE_CHANGE_CASE_SCHEMA_VERSION =
  "meridian.live-change-case.v1" as const;

export const DURABLE_CHANGE_CASE_EVENT_SCHEMA_VERSION =
  "meridian.live-change-case-event.v1" as const;

export const DURABLE_CHANGE_CASE_EVENT_COMMAND_SCHEMA_VERSION =
  "meridian.live-change-case-event-command.v1" as const;

export const CHANGE_CASE_AUTHORITY_MODES =
  Object.freeze([
    "RECORDED_CERTIFIED",
    "LIVE_ISOLATED_DEMO",
  ] as const);

export type ChangeCaseAuthorityMode =
  (typeof CHANGE_CASE_AUTHORITY_MODES)[number];

export const CHANGE_CASE_EVENT_TYPES =
  Object.freeze([
    "CASE_CREATED",
    "PREFLIGHT_COMPLETED",
    "REVIEW_ACCEPTED",
    "APPLY_REVALIDATION_MATCHED",
    "APPLY_REVALIDATION_STALE",
    "APPLY_ATTEMPT_STARTED",
    "APPLY_SUCCEEDED",
    "APPLY_FAILED",
    "CONFIGURED_STATE_VERIFIED",
    "LIVE_STALE_OBSERVED",
    "OLD_WITNESS_CLOSED",
    "OLD_PID_GONE",
    "FRESH_WITNESS_BOUND",
    "LIVE_CONVERGED",
    "AUDIT_PENDING",
    "AUDIT_BOUND",
    "RECEIPT_WRITE_STARTED",
    "RECEIPT_PERSISTED",
    "RECEIPT_READBACK_VERIFIED",
    "CASE_VERIFIED",
  ] as const);

export type ChangeCaseEventType =
  (typeof CHANGE_CASE_EVENT_TYPES)[number];

export type DurableEvidenceObject =
  Readonly<
    Record<
      string,
      unknown
    >
  >;

export interface DurableChangeCaseRecord {
  readonly schemaVersion:
    typeof DURABLE_CHANGE_CASE_SCHEMA_VERSION;

  readonly caseId:
    string;

  readonly mode:
    "LIVE_ISOLATED_DEMO";

  readonly state:
    ChangeCaseState;

  readonly version:
    number;

  readonly createdAtUtc:
    string;

  readonly updatedAtUtc:
    string;

  readonly fixture: {
    readonly fixtureId:
      typeof DEMO_FIXTURE_ID;

    readonly username:
      typeof DEMO_FIXTURE_USERNAME;

    readonly targetRole:
      typeof DEMO_FIXTURE_TARGET_ROLE;

    readonly expectedGeneration:
      string;
  };

  readonly intent: {
    readonly operation:
      "REMOVE";

    readonly targetRole:
      typeof DEMO_FIXTURE_TARGET_ROLE;
  };

  readonly preflight:
    DurableEvidenceObject | null;

  readonly review:
    DurableEvidenceObject | null;

  readonly applyAttempt:
    DurableEvidenceObject | null;

  readonly liveObservations:
    readonly DurableEvidenceObject[];

  readonly audit:
    DurableEvidenceObject | null;

  readonly receipt:
    DurableEvidenceObject | null;
}

export interface DurableChangeCaseJournalEvent {
  readonly schemaVersion:
    typeof DURABLE_CHANGE_CASE_EVENT_SCHEMA_VERSION;

  readonly caseId:
    string;

  readonly sequence:
    number;

  readonly eventType:
    ChangeCaseEventType;

  readonly fromState:
    ChangeCaseState | "NONE";

  readonly toState:
    ChangeCaseState;

  readonly versionBefore:
    number;

  readonly versionAfter:
    number;

  readonly occurredAtUtc:
    string;

  readonly detailJson:
    string;
}

export interface DurableChangeCaseSnapshot {
  readonly record:
    DurableChangeCaseRecord;

  readonly events:
    readonly DurableChangeCaseJournalEvent[];
}

export interface DurableChangeCaseEvidencePatch {
  readonly preflight?:
    DurableEvidenceObject | null;

  readonly review?:
    DurableEvidenceObject | null;

  readonly applyAttempt?:
    DurableEvidenceObject | null;

  readonly liveObservations?:
    readonly DurableEvidenceObject[];

  readonly audit?:
    DurableEvidenceObject | null;

  readonly receipt?:
    DurableEvidenceObject | null;
}

export interface DurableChangeCaseEventMutation {
  readonly record:
    DurableChangeCaseRecord;

  readonly event:
    DurableChangeCaseJournalEvent;
}

function isObject(
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

function isIsoUtc(
  value:
    unknown,
): value is string {
  return (
    typeof value ===
      "string" &&
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

function isCaseState(
  value:
    unknown,
): value is ChangeCaseState {
  return (
    typeof value ===
      "string" &&
    (
      CHANGE_CASE_STATES as readonly string[]
    ).includes(
      value,
    )
  );
}

function isEventType(
  value:
    unknown,
): value is ChangeCaseEventType {
  return (
    typeof value ===
      "string" &&
    (
      CHANGE_CASE_EVENT_TYPES as readonly string[]
    ).includes(
      value,
    )
  );
}

function assertOpaqueCaseId(
  caseId:
    string,
): void {
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(
      caseId,
    )
  ) {
    throw new Error(
      "Durable Change Case id is not an opaque safe identifier.",
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
    throw new Error(
      `${label} must be a positive integer.`,
    );
  }
}

function assertEvidenceSlot(
  value:
    unknown,
  label:
    string,
): void {
  if (
    value !==
      null &&
    !isObject(
      value,
    )
  ) {
    throw new Error(
      `${label} must be null or a server-owned evidence object.`,
    );
  }
}

function assertLiveObservations(
  value:
    unknown,
): void {
  if (
    !Array.isArray(
      value,
    ) ||
    value.some(
      (entry) =>
        !isObject(
          entry,
        ),
    )
  ) {
    throw new Error(
      "liveObservations must be an array of server-owned evidence objects.",
    );
  }
}

export function createLiveDemoDurableChangeCase(
  input: {
    readonly caseId:
      string;

    readonly expectedFixtureGeneration:
      string;

    readonly nowUtc:
      string;
  },
): DurableChangeCaseRecord {
  assertOpaqueCaseId(
    input.caseId,
  );

  if (
    input.expectedFixtureGeneration.trim().length ===
    0
  ) {
    throw new Error(
      "Expected fixture generation is required.",
    );
  }

  if (
    !isIsoUtc(
      input.nowUtc,
    )
  ) {
    throw new Error(
      "Durable Change Case timestamp must be UTC ISO-8601.",
    );
  }

  return Object.freeze({
    schemaVersion:
      DURABLE_CHANGE_CASE_SCHEMA_VERSION,

    caseId:
      input.caseId,

    mode:
      "LIVE_ISOLATED_DEMO" as const,

    state:
      "PROPOSED" as const,

    version:
      1,

    createdAtUtc:
      input.nowUtc,

    updatedAtUtc:
      input.nowUtc,

    fixture:
      Object.freeze({
        fixtureId:
          DEMO_FIXTURE_ID,

        username:
          DEMO_FIXTURE_USERNAME,

        targetRole:
          DEMO_FIXTURE_TARGET_ROLE,

        expectedGeneration:
          input.expectedFixtureGeneration,
      }),

    intent:
      Object.freeze({
        operation:
          "REMOVE" as const,

        targetRole:
          DEMO_FIXTURE_TARGET_ROLE,
      }),

    preflight:
      null,

    review:
      null,

    applyAttempt:
      null,

    liveObservations:
      Object.freeze(
        [] as DurableEvidenceObject[],
      ),

    audit:
      null,

    receipt:
      null,
  });
}

export function validateDurableChangeCaseRecord(
  value:
    unknown,
): asserts value is DurableChangeCaseRecord {
  if (
    !isObject(
      value,
    )
  ) {
    throw new Error(
      "Durable Change Case record must be an object.",
    );
  }

  if (
    value.schemaVersion !==
      DURABLE_CHANGE_CASE_SCHEMA_VERSION
  ) {
    throw new Error(
      "Unsupported durable Change Case schema.",
    );
  }

  if (
    typeof value.caseId !==
      "string"
  ) {
    throw new Error(
      "Durable Change Case id is missing.",
    );
  }

  assertOpaqueCaseId(
    value.caseId,
  );

  if (
    value.mode !==
      "LIVE_ISOLATED_DEMO"
  ) {
    throw new Error(
      "A4A durable live store accepts only LIVE_ISOLATED_DEMO.",
    );
  }

  if (
    !isCaseState(
      value.state,
    )
  ) {
    throw new Error(
      "Durable Change Case state is invalid.",
    );
  }

  if (
    typeof value.version !==
      "number"
  ) {
    throw new Error(
      "Durable Change Case version is missing.",
    );
  }

  assertPositiveInteger(
    value.version,
    "Durable Change Case version",
  );

  if (
    !isIsoUtc(
      value.createdAtUtc,
    ) ||
    !isIsoUtc(
      value.updatedAtUtc,
    )
  ) {
    throw new Error(
      "Durable Change Case timestamps must be UTC ISO-8601.",
    );
  }

  if (
    !isObject(
      value.fixture,
    ) ||
    value.fixture.fixtureId !==
      DEMO_FIXTURE_ID ||
    value.fixture.username !==
      DEMO_FIXTURE_USERNAME ||
    value.fixture.targetRole !==
      DEMO_FIXTURE_TARGET_ROLE ||
    typeof value.fixture.expectedGeneration !==
      "string" ||
    value.fixture.expectedGeneration.trim().length ===
      0
  ) {
    throw new Error(
      "Durable Change Case fixture binding is not the A3 isolated fixture.",
    );
  }

  if (
    !isObject(
      value.intent,
    ) ||
    value.intent.operation !==
      "REMOVE" ||
    value.intent.targetRole !==
      DEMO_FIXTURE_TARGET_ROLE
  ) {
    throw new Error(
      "Durable Change Case intent is not the fixed fixture-scoped REMOVE operation.",
    );
  }

  assertEvidenceSlot(
    value.preflight,
    "preflight",
  );

  assertEvidenceSlot(
    value.review,
    "review",
  );

  assertEvidenceSlot(
    value.applyAttempt,
    "applyAttempt",
  );

  assertLiveObservations(
    value.liveObservations,
  );

  assertEvidenceSlot(
    value.audit,
    "audit",
  );

  assertEvidenceSlot(
    value.receipt,
    "receipt",
  );
}

export function validateDurableChangeCaseJournalEvent(
  value:
    unknown,
): asserts value is DurableChangeCaseJournalEvent {
  if (
    !isObject(
      value,
    )
  ) {
    throw new Error(
      "Durable Change Case event must be an object.",
    );
  }

  if (
    value.schemaVersion !==
      DURABLE_CHANGE_CASE_EVENT_SCHEMA_VERSION ||
    typeof value.caseId !==
      "string" ||
    typeof value.sequence !==
      "number" ||
    !isEventType(
      value.eventType,
    ) ||
    !isCaseState(
      value.toState,
    ) ||
    typeof value.versionBefore !==
      "number" ||
    typeof value.versionAfter !==
      "number" ||
    !isIsoUtc(
      value.occurredAtUtc,
    ) ||
    typeof value.detailJson !==
      "string"
  ) {
    throw new Error(
      "Durable Change Case event shape is invalid.",
    );
  }

  assertOpaqueCaseId(
    value.caseId,
  );

  assertPositiveInteger(
    value.sequence,
    "Journal sequence",
  );

  if (
    value.fromState !==
      "NONE" &&
    !isCaseState(
      value.fromState,
    )
  ) {
    throw new Error(
      "Durable Change Case event fromState is invalid.",
    );
  }

  if (
    value.versionBefore <
      0 ||
    value.versionAfter !==
      value.versionBefore +
        1
  ) {
    throw new Error(
      "Durable Change Case event versions are not monotonic.",
    );
  }
}

export function validateDurableChangeCaseSnapshot(
  value:
    unknown,
): asserts value is DurableChangeCaseSnapshot {
  if (
    !isObject(
      value,
    )
  ) {
    throw new Error(
      "Durable Change Case snapshot must be an object.",
    );
  }

  const record =
    value.record;

  validateDurableChangeCaseRecord(
    record,
  );

  const events =
    value.events;

  if (
    !Array.isArray(
      events,
    )
  ) {
    throw new Error(
      "Durable Change Case snapshot journal is missing.",
    );
  }

  events.forEach(
    (
      event,
      index,
    ) => {
      validateDurableChangeCaseJournalEvent(
        event,
      );

      if (
        event.caseId !==
          record.caseId ||
        event.sequence !==
          index +
            1 ||
        event.versionBefore !==
          index ||
        event.versionAfter !==
          index +
            1
      ) {
        throw new Error(
          "Durable Change Case journal identity, sequence, or version chain is invalid.",
        );
      }

      if (
        index ===
          0
      ) {
        if (
          event.eventType !==
            "CASE_CREATED" ||
          event.fromState !==
            "NONE" ||
          event.toState !==
            "PROPOSED"
        ) {
          throw new Error(
            "Durable Change Case journal must begin with CASE_CREATED for PROPOSED.",
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
        event.eventType ===
          "CASE_CREATED" ||
        event.fromState !==
          previous.toState
      ) {
        throw new Error(
          "Durable Change Case journal state chain is invalid.",
        );
      }
    },
  );

  if (
    events.length <
      1 ||
    events.at(
      -1,
    )?.versionAfter !==
      record.version ||
    events.at(
      -1,
    )?.toState !==
      record.state
  ) {
    throw new Error(
      "Durable Change Case record state/version is not explained by its append-only journal.",
    );
  }
}

function transitionEventPairAllowed(
  eventType:
    ChangeCaseEventType,
  fromState:
    ChangeCaseState,
  toState:
    ChangeCaseState,
): boolean {
  if (
    eventType ===
      "PREFLIGHT_COMPLETED"
  ) {
    return (
      (
        fromState ===
          "PROPOSED" ||
        fromState ===
          "STALE" ||
        fromState ===
          "APPLY_FAILED"
      ) &&
      toState ===
        "PREFLIGHTED"
    );
  }

  if (
    eventType ===
      "REVIEW_ACCEPTED"
  ) {
    return (
      fromState ===
        "PREFLIGHTED" &&
      toState ===
        "READY"
    );
  }

  if (
    eventType ===
      "APPLY_REVALIDATION_STALE"
  ) {
    return (
      fromState ===
        "READY" &&
      toState ===
        "STALE"
    );
  }

  if (
    eventType ===
      "APPLY_FAILED"
  ) {
    return (
      fromState ===
        "READY" &&
      toState ===
        "APPLY_FAILED"
    );
  }

  if (
    eventType ===
      "CONFIGURED_STATE_VERIFIED"
  ) {
    return (
      fromState ===
        "READY" &&
      toState ===
        "APPLIED"
    );
  }

  if (
    eventType ===
      "LIVE_STALE_OBSERVED"
  ) {
    return (
      fromState ===
        "APPLIED" &&
      toState ===
        "CONVERGING"
    );
  }

  if (
    eventType ===
      "AUDIT_PENDING"
  ) {
    return (
      (
        fromState ===
          "APPLIED" ||
        fromState ===
          "CONVERGING"
      ) &&
      toState ===
        "AUDIT_PENDING"
    );
  }

  if (
    eventType ===
      "CASE_VERIFIED"
  ) {
    return (
      (
        fromState ===
          "CONVERGING" ||
        fromState ===
          "AUDIT_PENDING"
      ) &&
      toState ===
        "VERIFIED"
    );
  }

  return false;
}

function sameStateEventAllowed(
  eventType:
    ChangeCaseEventType,
  state:
    ChangeCaseState,
): boolean {
  if (
    (
      eventType ===
        "APPLY_REVALIDATION_MATCHED" ||
      eventType ===
        "APPLY_ATTEMPT_STARTED" ||
      eventType ===
        "APPLY_SUCCEEDED"
    ) &&
    state ===
      "READY"
  ) {
    return true;
  }

  if (
    (
      eventType ===
        "OLD_WITNESS_CLOSED" ||
      eventType ===
        "OLD_PID_GONE" ||
      eventType ===
        "FRESH_WITNESS_BOUND" ||
      eventType ===
        "LIVE_CONVERGED"
    ) &&
    state ===
      "CONVERGING"
  ) {
    return true;
  }

  if (
    (
      eventType ===
        "AUDIT_BOUND" ||
      eventType ===
        "RECEIPT_WRITE_STARTED" ||
      eventType ===
        "RECEIPT_PERSISTED" ||
      eventType ===
        "RECEIPT_READBACK_VERIFIED"
    ) &&
    (
      state ===
        "CONVERGING" ||
      state ===
        "AUDIT_PENDING"
    )
  ) {
    return true;
  }

  return false;
}

export function assertDurableCaseEventStateSemantics(
  eventType:
    ChangeCaseEventType,
  fromState:
    ChangeCaseState,
  toState:
    ChangeCaseState,
): void {
  if (
    eventType ===
      "CASE_CREATED"
  ) {
    throw new Error(
      "CASE_CREATED may only be emitted by atomic case creation.",
    );
  }

  if (
    fromState ===
      toState
  ) {
    if (
      !sameStateEventAllowed(
        eventType,
        fromState,
      )
    ) {
      throw new Error(
        `Event ${eventType} cannot append without a lifecycle transition from ${fromState}.`,
      );
    }

    return;
  }

  assertTransition(
    fromState,
    toState,
  );

  if (
    !transitionEventPairAllowed(
      eventType,
      fromState,
      toState,
    )
  ) {
    throw new Error(
      `Event ${eventType} does not own transition ${fromState} -> ${toState}.`,
    );
  }
}

export function buildDurableChangeCaseEventMutation(
  record:
    DurableChangeCaseRecord,
  currentEventCount:
    number,
  input: {
    readonly expectedVersion:
      number;

    readonly eventType:
      Exclude<
        ChangeCaseEventType,
        "CASE_CREATED"
      >;

    readonly nextState:
      ChangeCaseState;

    readonly occurredAtUtc:
      string;

    readonly detailJson:
      string;

    readonly evidencePatch?:
      DurableChangeCaseEvidencePatch;
  },
): DurableChangeCaseEventMutation {
  validateDurableChangeCaseRecord(
    record,
  );

  assertPositiveInteger(
    currentEventCount,
    "Current journal event count",
  );

  if (
    input.expectedVersion !==
      record.version
  ) {
    throw new Error(
      `Durable Change Case version conflict: expected ${input.expectedVersion}, current ${record.version}.`,
    );
  }

  if (
    !isIsoUtc(
      input.occurredAtUtc,
    )
  ) {
    throw new Error(
      "Durable Change Case event timestamp must be UTC ISO-8601.",
    );
  }

  if (
    typeof input.detailJson !==
      "string"
  ) {
    throw new Error(
      "Durable Change Case event detailJson must be a string.",
    );
  }

  assertDurableCaseEventStateSemantics(
    input.eventType,
    record.state,
    input.nextState,
  );

  const patch =
    input.evidencePatch ??
    {};

  const nextVersion =
    record.version +
    1;

  const nextRecord:
    DurableChangeCaseRecord =
    Object.freeze({
      ...record,

      state:
        input.nextState,

      version:
        nextVersion,

      updatedAtUtc:
        input.occurredAtUtc,

      preflight:
        patch.preflight ===
        undefined
          ? record.preflight
          : patch.preflight,

      review:
        patch.review ===
        undefined
          ? record.review
          : patch.review,

      applyAttempt:
        patch.applyAttempt ===
        undefined
          ? record.applyAttempt
          : patch.applyAttempt,

      liveObservations:
        patch.liveObservations ===
        undefined
          ? record.liveObservations
          : Object.freeze(
              [
                ...patch.liveObservations,
              ],
            ),

      audit:
        patch.audit ===
        undefined
          ? record.audit
          : patch.audit,

      receipt:
        patch.receipt ===
        undefined
          ? record.receipt
          : patch.receipt,
    });

  validateDurableChangeCaseRecord(
    nextRecord,
  );

  const event:
    DurableChangeCaseJournalEvent =
    Object.freeze({
      schemaVersion:
        DURABLE_CHANGE_CASE_EVENT_SCHEMA_VERSION,

      caseId:
        record.caseId,

      sequence:
        currentEventCount +
        1,

      eventType:
        input.eventType,

      fromState:
        record.state,

      toState:
        input.nextState,

      versionBefore:
        record.version,

      versionAfter:
        nextVersion,

      occurredAtUtc:
        input.occurredAtUtc,

      detailJson:
        input.detailJson,
    });

  validateDurableChangeCaseJournalEvent(
    event,
  );

  return Object.freeze({
    record:
      nextRecord,

    event,
  });
}
