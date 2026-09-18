import {
  DEMO_FIXTURE_ID,
  DEMO_FIXTURE_TARGET_ROLE,
  DEMO_FIXTURE_USERNAME,
} from "./demo-fixture";

import {
  buildDurableChangeCaseEventMutation,
  type DurableChangeCaseEventMutation,
  type DurableChangeCaseJournalEvent,
  type DurableChangeCaseRecord,
  type DurableChangeCaseSnapshot,
  type DurableEvidenceObject,
} from "./durable-change-case";

import {
  RECEIPT_HISTORY_SCHEMA_VERSION,
  type ReceiptHistorySummary,
  type VerifiedReceiptHistoryRecord,
  validateVerifiedReceiptHistoryRecord,
} from "./receipt-history";

export const LIVE_RECEIPT_CLOSURE_SCHEMA_VERSION =
  "meridian.live-receipt-closure.v1" as const;

export const LIVE_NATIVE_AUDIT_SCHEMA_VERSION =
  "meridian.native-userchange-audit.v1" as const;

export const LIVE_VERIFIED_RECEIPT_SCHEMA_VERSION =
  "meridian.live-verified-receipt.v1" as const;

export const LIVE_RECEIPT_DISPLAY_NAME =
  "Meridian Live Demo Witness" as const;

export const LIVE_RECEIPT_ID_PREFIX =
  "meridian-live-demo-receipt-" as const;

const sha256Pattern =
  /^[0-9A-F]{64}$/;

export interface NativeUserChangeAuditBinding {
  readonly schemaVersion:
    typeof LIVE_NATIVE_AUDIT_SCHEMA_VERSION;

  readonly auditTransportVersion:
    "health-v1";

  readonly systemId:
    string;

  readonly auditIndex:
    number;

  readonly utcTimeStamp:
    string;

  readonly eventSource:
    "%System";

  readonly eventType:
    "%Security";

  readonly event:
    "UserChange";

  readonly pid:
    number;

  readonly username:
    "meridian.runtime";

  readonly description:
    string;

  readonly eventData:
    string;

  readonly namespace:
    string;

  readonly roles:
    string;

  readonly authentication:
    string;

  readonly status:
    string;

  readonly targetUsername:
    typeof DEMO_FIXTURE_USERNAME;

  readonly targetRole:
    typeof DEMO_FIXTURE_TARGET_ROLE;

  readonly targetBound:
    true;

  readonly roleRemovalBound:
    true;

  readonly pidRebound:
    true;
}

export interface LiveReceiptEvidence
  extends DurableEvidenceObject {
  readonly schemaVersion:
    typeof LIVE_RECEIPT_CLOSURE_SCHEMA_VERSION;

  readonly receiptId:
    string;

  readonly receiptSha256:
    string;

  readonly status:
    "WRITE_STARTED" |
    "PERSISTED" |
    "READBACK_VERIFIED" |
    "VERIFIED";

  readonly historyWriteStatus?:
    "CREATED" |
    "IDEMPOTENT";

  readonly persistedAtUtc?:
    string;

  readonly readbackVerifiedAtUtc?:
    string;

  readonly verifiedAtUtc?:
    string;
}

export interface LiveReceiptClosureDependencies {
  readonly readCase:
    (
      caseId:
        string,
    ) => Promise<DurableChangeCaseSnapshot>;

  readonly appendEvent:
    (
      mutation:
        DurableChangeCaseEventMutation,
    ) => Promise<DurableChangeCaseSnapshot>;

  readonly findNativeAudit:
    (
      input: {
        readonly record:
          DurableChangeCaseRecord;

        readonly applyStartedAtUtc:
          string;
      },
    ) => Promise<
      NativeUserChangeAuditBinding |
      null
    >;

  readonly persistReceipt:
    (
      record:
        VerifiedReceiptHistoryRecord,
    ) => Promise<{
      readonly status:
        "CREATED" |
        "IDEMPOTENT";

      readonly record:
        ReceiptHistorySummary;
    }>;

  readonly readReceipt:
    (
      receiptId:
        string,
    ) => Promise<VerifiedReceiptHistoryRecord>;

  readonly sha256Utf8:
    (
      value:
        string,
    ) => string;

  readonly nowUtc:
    () => string;
}

export interface LiveReceiptClosureResult {
  readonly state:
    "AUDIT_PENDING" |
    "VERIFIED";

  readonly verified:
    boolean;

  readonly auditBound:
    boolean;

  readonly receiptId:
    string | null;

  readonly snapshot:
    DurableChangeCaseSnapshot;
}

export class LiveReceiptClosureError
  extends Error {
  readonly code:
    "CASE_NOT_CLOSABLE" |
    "CASE_VERSION_CONFLICT" |
    "AUDIT_AMBIGUOUS_OR_INVALID" |
    "RECEIPT_WRITE_FAILED" |
    "RECEIPT_READBACK_FAILED" |
    "RECEIPT_READBACK_MISMATCH";

  constructor(
    code:
      LiveReceiptClosureError["code"],
    message:
      string,
  ) {
    super(
      message,
    );

    this.name =
      "LiveReceiptClosureError";

    this.code =
      code;
  }
}

function objectValue(
  value:
    unknown,
  label:
    string,
): Record<string, unknown> {
  if (
    typeof value !==
      "object" ||
    value ===
      null ||
    Array.isArray(
      value,
    )
  ) {
    throw new LiveReceiptClosureError(
      "CASE_NOT_CLOSABLE",
      `${label} is missing.`,
    );
  }

  return value as
    Record<string, unknown>;
}

function requiredString(
  object:
    Record<string, unknown>,
  key:
    string,
  label:
    string,
): string {
  const value =
    object[
      key
    ];

  if (
    typeof value !==
      "string" ||
    value.trim().length ===
      0
  ) {
    throw new LiveReceiptClosureError(
      "CASE_NOT_CLOSABLE",
      `${label} is missing.`,
    );
  }

  return value.trim();
}

function requiredTrue(
  object:
    Record<string, unknown>,
  key:
    string,
  label:
    string,
): void {
  if (
    object[
      key
    ] !==
      true
  ) {
    throw new LiveReceiptClosureError(
      "CASE_NOT_CLOSABLE",
      `${label} is not proven.`,
    );
  }
}

function requiredInteger(
  object:
    Record<string, unknown>,
  key:
    string,
  label:
    string,
): number {
  const value =
    object[
      key
    ];

  if (
    typeof value !==
      "number" ||
    !Number.isSafeInteger(
      value,
    ) ||
    value <
      1
  ) {
    throw new LiveReceiptClosureError(
      "CASE_NOT_CLOSABLE",
      `${label} is invalid.`,
    );
  }

  return value;
}

function assertSha256(
  value:
    string,
  label:
    string,
): void {
  if (
    !sha256Pattern.test(
      value,
    )
  ) {
    throw new LiveReceiptClosureError(
      "CASE_NOT_CLOSABLE",
      `${label} is not an uppercase SHA-256.`,
    );
  }
}

function applyStartedEvent(
  snapshot:
    DurableChangeCaseSnapshot,
): DurableChangeCaseJournalEvent {
  const matches =
    snapshot.events.filter(
      (
        event,
      ) =>
        event.eventType ===
        "APPLY_ATTEMPT_STARTED",
    );

  if (
    matches.length !==
      1
  ) {
    throw new LiveReceiptClosureError(
      "CASE_NOT_CLOSABLE",
      "Exactly one durable APPLY_ATTEMPT_STARTED event is required.",
    );
  }

  return matches[
    0
  ];
}

function latestConvergedObservation(
  record:
    DurableChangeCaseRecord,
): Record<string, unknown> {
  if (
    record.liveObservations.length <
      1
  ) {
    throw new LiveReceiptClosureError(
      "CASE_NOT_CLOSABLE",
      "Live convergence evidence is missing.",
    );
  }

  const latest =
    objectValue(
      record.liveObservations[
        record.liveObservations.length -
          1
      ],
      "Latest live observation",
    );

  if (
    latest.phase !==
      "CONVERGED"
  ) {
    throw new LiveReceiptClosureError(
      "CASE_NOT_CLOSABLE",
      "Latest live observation is not CONVERGED.",
    );
  }

  requiredTrue(
    latest,
    "everyRequiredDecisionMatchesExpected",
    "Fresh live required decisions",
  );

  if (
    latest.lostPermissionMismatchCount !==
      0
  ) {
    throw new LiveReceiptClosureError(
      "CASE_NOT_CLOSABLE",
      "Fresh live lost-permission mismatch count is not zero.",
    );
  }

  return latest;
}

function assertFixedAuthority(
  record:
    DurableChangeCaseRecord,
): void {
  if (
    record.mode !==
      "LIVE_ISOLATED_DEMO" ||
    record.fixture.fixtureId !==
      DEMO_FIXTURE_ID ||
    record.fixture.username !==
      DEMO_FIXTURE_USERNAME ||
    record.fixture.targetRole !==
      DEMO_FIXTURE_TARGET_ROLE ||
    record.intent.operation !==
      "REMOVE" ||
    record.intent.targetRole !==
      DEMO_FIXTURE_TARGET_ROLE
  ) {
    throw new LiveReceiptClosureError(
      "CASE_NOT_CLOSABLE",
      "Receipt closure refused a case outside the fixed A3 isolated fixture authority.",
    );
  }
}

function assertClosurePrerequisites(
  snapshot:
    DurableChangeCaseSnapshot,
): {
  readonly reviewedDigest:
    string;

  readonly freshDigest:
    string;

  readonly applyAttemptId:
    string;

  readonly applyStartedAtUtc:
    string;

  readonly configuredAfterRoles:
    readonly string[];

  readonly freshServerPid:
    number;
} {
  const record =
    snapshot.record;

  assertFixedAuthority(
    record,
  );

  if (
    record.state !==
      "AUDIT_PENDING"
  ) {
    throw new LiveReceiptClosureError(
      "CASE_NOT_CLOSABLE",
      "Receipt closure requires AUDIT_PENDING.",
    );
  }

  const preflight =
    objectValue(
      record.preflight,
      "Apply-time preflight evidence",
    );

  const review =
    objectValue(
      record.review,
      "Review evidence",
    );

  const attempt =
    objectValue(
      record.applyAttempt,
      "Apply attempt evidence",
    );

  const reviewedDigest =
    requiredString(
      review,
      "reviewedDigest",
      "Reviewed preflight digest",
    );

  const freshDigest =
    requiredString(
      preflight,
      "digest",
      "Fresh apply-time preflight digest",
    );

  assertSha256(
    reviewedDigest,
    "Reviewed preflight digest",
  );

  assertSha256(
    freshDigest,
    "Fresh apply-time preflight digest",
  );

  if (
    reviewedDigest !==
      freshDigest
  ) {
    throw new LiveReceiptClosureError(
      "CASE_NOT_CLOSABLE",
      "Reviewed and apply-time preflight digests do not match.",
    );
  }

  if (
    attempt.completionClassification !==
      "APPLIED"
  ) {
    throw new LiveReceiptClosureError(
      "CASE_NOT_CLOSABLE",
      "Apply attempt is not durably APPLIED.",
    );
  }

  const dispatchCount =
    requiredInteger(
      attempt,
      "mutationDispatchCount",
      "Mutation dispatch count",
    );

  if (
    dispatchCount !==
      1
  ) {
    throw new LiveReceiptClosureError(
      "CASE_NOT_CLOSABLE",
      "Exactly one mutation dispatch is required.",
    );
  }

  requiredTrue(
    attempt,
    "configuredVerified",
    "Configured post-state",
  );

  const applyAttemptId =
    requiredString(
      attempt,
      "applyAttemptId",
      "Apply attempt id",
    );

  const afterRolesRaw =
    attempt.afterDirectRoles;

  if (
    !Array.isArray(
      afterRolesRaw,
    ) ||
    afterRolesRaw.some(
      (
        role,
      ) =>
        typeof role !==
          "string",
    ) ||
    afterRolesRaw.includes(
      DEMO_FIXTURE_TARGET_ROLE,
    )
  ) {
    throw new LiveReceiptClosureError(
      "CASE_NOT_CLOSABLE",
      "Configured after-role evidence is invalid.",
    );
  }

  const fresh =
    latestConvergedObservation(
      record,
    );

  const freshServerPid =
    requiredInteger(
      fresh,
      "serverPid",
      "Fresh witness server PID",
    );

  const applyStart =
    applyStartedEvent(
      snapshot,
    );

  return {
    reviewedDigest,
    freshDigest,
    applyAttemptId,
    applyStartedAtUtc:
      applyStart.occurredAtUtc,
    configuredAfterRoles:
      afterRolesRaw as string[],
    freshServerPid,
  };
}

export function validateNativeUserChangeAuditBinding(
  value:
    unknown,
): asserts value is NativeUserChangeAuditBinding {
  const binding =
    objectValue(
      value,
      "Native audit binding",
    );

  if (
    binding.schemaVersion !==
      LIVE_NATIVE_AUDIT_SCHEMA_VERSION ||
    binding.auditTransportVersion !==
      "health-v1" ||
    binding.eventSource !==
      "%System" ||
    binding.eventType !==
      "%Security" ||
    binding.event !==
      "UserChange" ||
    binding.username !==
      "meridian.runtime" ||
    binding.targetUsername !==
      DEMO_FIXTURE_USERNAME ||
    binding.targetRole !==
      DEMO_FIXTURE_TARGET_ROLE ||
    binding.targetBound !==
      true ||
    binding.roleRemovalBound !==
      true ||
    binding.pidRebound !==
      true
  ) {
    throw new LiveReceiptClosureError(
      "AUDIT_AMBIGUOUS_OR_INVALID",
      "Native UserChange binding identity is invalid.",
    );
  }

  requiredString(
    binding,
    "systemId",
    "Native audit SystemID",
  );

  requiredInteger(
    binding,
    "auditIndex",
    "Native audit index",
  );

  requiredInteger(
    binding,
    "pid",
    "Native audit PID",
  );

  requiredString(
    binding,
    "utcTimeStamp",
    "Native audit UTC",
  );

  requiredString(
    binding,
    "description",
    "Native audit description",
  );

  requiredString(
    binding,
    "eventData",
    "Native audit EventData",
  );
}

function receiptIdForCase(
  caseId:
    string,
): string {
  return (
    LIVE_RECEIPT_ID_PREFIX +
    caseId
  );
}

function canonicalReceipt(
  input: {
    readonly snapshot:
      DurableChangeCaseSnapshot;

    readonly audit:
      NativeUserChangeAuditBinding;

    readonly reviewedDigest:
      string;

    readonly freshDigest:
      string;

    readonly applyAttemptId:
      string;

    readonly applyStartedAtUtc:
      string;

    readonly configuredAfterRoles:
      readonly string[];

    readonly freshServerPid:
      number;
  },
): {
  readonly receiptId:
    string;

  readonly receiptJson:
    string;
} {
  const record =
    input.snapshot.record;

  const receiptId =
    receiptIdForCase(
      record.caseId,
    );

  const document =
    Object.freeze({
      schemaVersion:
        LIVE_VERIFIED_RECEIPT_SCHEMA_VERSION,

      receiptId,

      lifecycleState:
        "VERIFIED" as const,

      caseId:
        record.caseId,

      mode:
        record.mode,

      change:
        Object.freeze({
          username:
            DEMO_FIXTURE_USERNAME,

          displayName:
            LIVE_RECEIPT_DISPLAY_NAME,

          operation:
            "REMOVE" as const,

          role:
            DEMO_FIXTURE_TARGET_ROLE,
        }),

      authorization:
        Object.freeze({
          reviewedPreflightDigest:
            input.reviewedDigest,

          freshApplyTimePreflightDigest:
            input.freshDigest,

          digestsMatch:
            true,

          mutationDispatchCount:
            1,

          configuredPostStateVerified:
            true,
        }),

      apply:
        Object.freeze({
          applyAttemptId:
            input.applyAttemptId,

          utcTimestamp:
            input.applyStartedAtUtc,

          actor:
            input.audit.username,

          pid:
            input.audit.pid,
        }),

      configured:
        Object.freeze({
          afterRoles:
            [
              ...input.configuredAfterRoles,
            ],

          targetRoleRemoved:
            true,
        }),

      live:
        Object.freeze({
          converged:
            true,

          freshServerPid:
            input.freshServerPid,

          everyRequiredDecisionMatchesExpected:
            true,
        }),

      nativeAudit:
        Object.freeze({
          systemId:
            input.audit.systemId,

          auditIndex:
            input.audit.auditIndex,

          utcTimestamp:
            input.audit.utcTimeStamp,

          eventSource:
            input.audit.eventSource,

          eventType:
            input.audit.eventType,

          event:
            input.audit.event,

          username:
            input.audit.username,

          pid:
            input.audit.pid,

          description:
            input.audit.description,

          targetUsername:
            input.audit.targetUsername,

          targetRole:
            input.audit.targetRole,

          roleRemovalBound:
            true,
        }),

      closure:
        Object.freeze({
          receiptStore:
            "IRIS_APPEND_ONLY_HISTORY",

          readbackRequired:
            true,
        }),
    });

  return {
    receiptId,
    receiptJson:
      JSON.stringify(
        document,
      ),
  };
}

function historyRecord(
  input: {
    readonly snapshot:
      DurableChangeCaseSnapshot;

    readonly audit:
      NativeUserChangeAuditBinding;

    readonly reviewedDigest:
      string;

    readonly freshDigest:
      string;

    readonly applyStartedAtUtc:
      string;

    readonly receiptId:
      string;

    readonly receiptJson:
      string;

    readonly receiptSha256:
      string;
  },
): VerifiedReceiptHistoryRecord {
  const record:
    VerifiedReceiptHistoryRecord = {
      schemaVersion:
        RECEIPT_HISTORY_SCHEMA_VERSION,

      receiptId:
        input.receiptId,

      username:
        DEMO_FIXTURE_USERNAME,

      displayName:
        LIVE_RECEIPT_DISPLAY_NAME,

      operation:
        "REMOVE",

      role:
        DEMO_FIXTURE_TARGET_ROLE,

      lifecycleState:
        "VERIFIED",

      reviewedPreflightDigest:
        input.reviewedDigest,

      freshApplyTimePreflightDigest:
        input.freshDigest,

      receiptSha256:
        input.receiptSha256,

      receiptJson:
        input.receiptJson,

      applyUtc:
        input.applyStartedAtUtc,

      applyActor:
        input.audit.username,

      applyPid:
        input.audit.pid,

      nativeAuditSystemId:
        input.audit.systemId,

      nativeAuditIndex:
        input.audit.auditIndex,

      nativeAuditUtc:
        input.audit.utcTimeStamp,

      nativeAuditEvent:
        input.audit.event,

      nativeAuditActor:
        input.audit.username,
    };

  validateVerifiedReceiptHistoryRecord(
    record,
  );

  return record;
}

function parseReceiptEvidence(
  value:
    DurableEvidenceObject |
    null,
): LiveReceiptEvidence |
  null {
  if (
    value ===
      null
  ) {
    return null;
  }

  const object =
    objectValue(
      value,
      "Receipt closure evidence",
    );

  if (
    object.schemaVersion !==
      LIVE_RECEIPT_CLOSURE_SCHEMA_VERSION
  ) {
    throw new LiveReceiptClosureError(
      "CASE_NOT_CLOSABLE",
      "Receipt closure evidence schema is unsupported.",
    );
  }

  const status =
    object.status;

  if (
    status !==
      "WRITE_STARTED" &&
    status !==
      "PERSISTED" &&
    status !==
      "READBACK_VERIFIED" &&
    status !==
      "VERIFIED"
  ) {
    throw new LiveReceiptClosureError(
      "CASE_NOT_CLOSABLE",
      "Receipt closure evidence status is invalid.",
    );
  }

  const receiptId =
    requiredString(
      object,
      "receiptId",
      "Receipt id",
    );

  const receiptSha256 =
    requiredString(
      object,
      "receiptSha256",
      "Receipt SHA-256",
    );

  assertSha256(
    receiptSha256,
    "Receipt SHA-256",
  );

  return value as
    LiveReceiptEvidence;
}

function auditFromRecord(
  record:
    DurableChangeCaseRecord,
): NativeUserChangeAuditBinding |
  null {
  if (
    record.audit ===
      null
  ) {
    return null;
  }

  validateNativeUserChangeAuditBinding(
    record.audit,
  );

  return record.audit as
    unknown as NativeUserChangeAuditBinding;
}

function closureMutation(
  snapshot:
    DurableChangeCaseSnapshot,
  input: {
    readonly eventType:
      "AUDIT_BOUND" |
      "RECEIPT_WRITE_STARTED" |
      "RECEIPT_PERSISTED" |
      "RECEIPT_READBACK_VERIFIED" |
      "CASE_VERIFIED";

    readonly nextState:
      "AUDIT_PENDING" |
      "VERIFIED";

    readonly occurredAtUtc:
      string;

    readonly detail:
      DurableEvidenceObject;

    readonly audit?:
      NativeUserChangeAuditBinding;

    readonly receipt?:
      LiveReceiptEvidence;
  },
): DurableChangeCaseEventMutation {
  return buildDurableChangeCaseEventMutation(
    snapshot.record,
    snapshot.events.length,
    {
      expectedVersion:
        snapshot.record.version,

      eventType:
        input.eventType,

      nextState:
        input.nextState,

      occurredAtUtc:
        input.occurredAtUtc,

      detailJson:
        JSON.stringify(
          input.detail,
        ),

      evidencePatch: {
        audit:
          input.audit ===
          undefined
            ? snapshot.record.audit
            : input.audit as
                unknown as DurableEvidenceObject,

        receipt:
          input.receipt ===
          undefined
            ? snapshot.record.receipt
            : input.receipt,
      },
    },
  );
}

function assertReadbackExact(
  expected:
    VerifiedReceiptHistoryRecord,
  observed:
    VerifiedReceiptHistoryRecord,
): void {
  validateVerifiedReceiptHistoryRecord(
    observed,
  );

  if (
    observed.receiptId !==
      expected.receiptId ||
    observed.receiptSha256 !==
      expected.receiptSha256 ||
    observed.receiptJson !==
      expected.receiptJson ||
    observed.username !==
      expected.username ||
    observed.operation !==
      expected.operation ||
    observed.role !==
      expected.role ||
    observed.lifecycleState !==
      "VERIFIED" ||
    observed.nativeAuditSystemId !==
      expected.nativeAuditSystemId ||
    observed.nativeAuditIndex !==
      expected.nativeAuditIndex
  ) {
    throw new LiveReceiptClosureError(
      "RECEIPT_READBACK_MISMATCH",
      "IRIS receipt readback does not exactly match the canonical live receipt.",
    );
  }
}

export async function closeLiveReceiptCore(
  input: {
    readonly caseId:
      string;

    readonly expectedCaseVersion:
      number;
  },
  dependencies:
    LiveReceiptClosureDependencies,
): Promise<LiveReceiptClosureResult> {
  let snapshot =
    await dependencies.readCase(
      input.caseId,
    );

  if (
    snapshot.record.version !==
      input.expectedCaseVersion
  ) {
    throw new LiveReceiptClosureError(
      "CASE_VERSION_CONFLICT",
      `Receipt closure expected case version ${input.expectedCaseVersion}, current ${snapshot.record.version}.`,
    );
  }

  const prerequisites =
    assertClosurePrerequisites(
      snapshot,
    );

  let audit =
    auditFromRecord(
      snapshot.record,
    );

  if (
    audit ===
      null
  ) {
    audit =
      await dependencies.findNativeAudit({
        record:
          snapshot.record,

        applyStartedAtUtc:
          prerequisites.applyStartedAtUtc,
      });

    if (
      audit ===
        null
    ) {
      return {
        state:
          "AUDIT_PENDING",

        verified:
          false,

        auditBound:
          false,

        receiptId:
          null,

        snapshot,
      };
    }

    validateNativeUserChangeAuditBinding(
      audit,
    );

    snapshot =
      await dependencies.appendEvent(
        closureMutation(
          snapshot,
          {
            eventType:
              "AUDIT_BOUND",

            nextState:
              "AUDIT_PENDING",

            occurredAtUtc:
              dependencies.nowUtc(),

            detail:
              Object.freeze({
                binding:
                  "NATIVE_USERCHANGE",

                auditIndex:
                  audit.auditIndex,

                systemId:
                  audit.systemId,

                pid:
                  audit.pid,
              }),

            audit,
          },
        ),
      );
  }

  validateNativeUserChangeAuditBinding(
    audit,
  );

  const canonical =
    canonicalReceipt({
      snapshot,

      audit,

      reviewedDigest:
        prerequisites.reviewedDigest,

      freshDigest:
        prerequisites.freshDigest,

      applyAttemptId:
        prerequisites.applyAttemptId,

      applyStartedAtUtc:
        prerequisites.applyStartedAtUtc,

      configuredAfterRoles:
        prerequisites.configuredAfterRoles,

      freshServerPid:
        prerequisites.freshServerPid,
    });

  const receiptSha256 =
    dependencies.sha256Utf8(
      canonical.receiptJson,
    )
      .toUpperCase();

  assertSha256(
    receiptSha256,
    "Generated receipt SHA-256",
  );

  const record =
    historyRecord({
      snapshot,

      audit,

      reviewedDigest:
        prerequisites.reviewedDigest,

      freshDigest:
        prerequisites.freshDigest,

      applyStartedAtUtc:
        prerequisites.applyStartedAtUtc,

      receiptId:
        canonical.receiptId,

      receiptJson:
        canonical.receiptJson,

      receiptSha256,
    });

  let receiptEvidence =
    parseReceiptEvidence(
      snapshot.record.receipt,
    );

  if (
    receiptEvidence !==
      null &&
    (
      receiptEvidence.receiptId !==
        canonical.receiptId ||
      receiptEvidence.receiptSha256 !==
        receiptSha256
    )
  ) {
    throw new LiveReceiptClosureError(
      "CASE_NOT_CLOSABLE",
      "Existing receipt evidence does not match the deterministic canonical receipt.",
    );
  }

  if (
    receiptEvidence ===
      null
  ) {
    receiptEvidence =
      Object.freeze({
        schemaVersion:
          LIVE_RECEIPT_CLOSURE_SCHEMA_VERSION,

        receiptId:
          canonical.receiptId,

        receiptSha256,

        status:
          "WRITE_STARTED" as const,
      });

    snapshot =
      await dependencies.appendEvent(
        closureMutation(
          snapshot,
          {
            eventType:
              "RECEIPT_WRITE_STARTED",

            nextState:
              "AUDIT_PENDING",

            occurredAtUtc:
              dependencies.nowUtc(),

            detail:
              Object.freeze({
                receiptId:
                  canonical.receiptId,

                receiptSha256,
              }),

            receipt:
              receiptEvidence,
          },
        ),
      );
  }

  if (
    receiptEvidence.status ===
      "WRITE_STARTED"
  ) {
    let persisted:
      Awaited<
        ReturnType<
          LiveReceiptClosureDependencies["persistReceipt"]
        >
      >;

    try {
      persisted =
        await dependencies.persistReceipt(
          record,
        );
    } catch (
      error
    ) {
      throw new LiveReceiptClosureError(
        "RECEIPT_WRITE_FAILED",
        `IRIS receipt write failed: ${
          error instanceof Error
            ? error.message
            : "unknown error"
        }`,
      );
    }

    if (
      persisted.record.receiptId !==
        canonical.receiptId ||
      persisted.record.receiptSha256 !==
        receiptSha256
    ) {
      throw new LiveReceiptClosureError(
        "RECEIPT_WRITE_FAILED",
        "IRIS receipt write acknowledgement does not match the canonical receipt.",
      );
    }

    const persistedAtUtc =
      dependencies.nowUtc();

    receiptEvidence =
      Object.freeze({
        ...receiptEvidence,

        status:
          "PERSISTED" as const,

        historyWriteStatus:
          persisted.status,

        persistedAtUtc,
      });

    snapshot =
      await dependencies.appendEvent(
        closureMutation(
          snapshot,
          {
            eventType:
              "RECEIPT_PERSISTED",

            nextState:
              "AUDIT_PENDING",

            occurredAtUtc:
              persistedAtUtc,

            detail:
              Object.freeze({
                receiptId:
                  canonical.receiptId,

                historyWriteStatus:
                  persisted.status,
              }),

            receipt:
              receiptEvidence,
          },
        ),
      );
  }

  if (
    receiptEvidence.status ===
      "PERSISTED"
  ) {
    let readback:
      VerifiedReceiptHistoryRecord;

    try {
      readback =
        await dependencies.readReceipt(
          canonical.receiptId,
        );
    } catch (
      error
    ) {
      throw new LiveReceiptClosureError(
        "RECEIPT_READBACK_FAILED",
        `IRIS receipt readback failed: ${
          error instanceof Error
            ? error.message
            : "unknown error"
        }`,
      );
    }

    assertReadbackExact(
      record,
      readback,
    );

    const readbackVerifiedAtUtc =
      dependencies.nowUtc();

    receiptEvidence =
      Object.freeze({
        ...receiptEvidence,

        status:
          "READBACK_VERIFIED" as const,

        readbackVerifiedAtUtc,
      });

    snapshot =
      await dependencies.appendEvent(
        closureMutation(
          snapshot,
          {
            eventType:
              "RECEIPT_READBACK_VERIFIED",

            nextState:
              "AUDIT_PENDING",

            occurredAtUtc:
              readbackVerifiedAtUtc,

            detail:
              Object.freeze({
                receiptId:
                  canonical.receiptId,

                exactReadback:
                  true,
              }),

            receipt:
              receiptEvidence,
          },
        ),
      );
  }

  if (
    receiptEvidence.status !==
      "READBACK_VERIFIED"
  ) {
    throw new LiveReceiptClosureError(
      "CASE_NOT_CLOSABLE",
      "Receipt closure did not reach verified readback.",
    );
  }

  const verifiedAtUtc =
    dependencies.nowUtc();

  const verifiedReceipt =
    Object.freeze({
      ...receiptEvidence,

      status:
        "VERIFIED" as const,

      verifiedAtUtc,
    });

  snapshot =
    await dependencies.appendEvent(
      closureMutation(
        snapshot,
        {
          eventType:
            "CASE_VERIFIED",

          nextState:
            "VERIFIED",

          occurredAtUtc:
            verifiedAtUtc,

          detail:
            Object.freeze({
              receiptId:
                canonical.receiptId,

              receiptSha256,

              nativeAuditIndex:
                audit.auditIndex,

              allClosureEvidence:
                true,
            }),

          receipt:
            verifiedReceipt,
        },
      ),
    );

  return {
    state:
      "VERIFIED",

    verified:
      true,

    auditBound:
      true,

    receiptId:
      canonical.receiptId,

    snapshot,
  };
}
