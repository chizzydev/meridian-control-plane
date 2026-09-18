import {
  createHash,
} from "node:crypto";

import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  DEMO_FIXTURE_ID,
  DEMO_FIXTURE_TARGET_ROLE,
  DEMO_FIXTURE_TRANSPORT_ROLE,
  DEMO_FIXTURE_USERNAME,
} from "./demo-fixture";

import {
  LIVE_NATIVE_AUDIT_SCHEMA_VERSION,
  LiveReceiptClosureError,
  closeLiveReceiptCore,
  type LiveReceiptClosureDependencies,
  type NativeUserChangeAuditBinding,
} from "./live-receipt-closure";

import {
  type DurableChangeCaseEventMutation,
  type DurableChangeCaseJournalEvent,
  type DurableChangeCaseRecord,
  type DurableChangeCaseSnapshot,
} from "./durable-change-case";

import {
  type ReceiptHistorySummary,
  type VerifiedReceiptHistoryRecord,
} from "./receipt-history";

const DIGEST =
  "A".repeat(
    64,
  );

function historicalEvent(
  sequence:
    number,
  eventType:
    string,
): DurableChangeCaseJournalEvent {
  return {
    schemaVersion:
      "meridian.live-change-case-event.v1",

    caseId:
      "a6-test-case",

    sequence,

    eventType:
      eventType as
        DurableChangeCaseJournalEvent["eventType"],

    fromState:
      sequence ===
        1
        ? "NONE"
        : "AUDIT_PENDING",

    toState:
      "AUDIT_PENDING",

    versionBefore:
      sequence -
        1,

    versionAfter:
      sequence,

    occurredAtUtc:
      sequence ===
        5
        ? "2026-09-18T01:00:00.000Z"
        : `2026-09-18T00:00:${String(sequence).padStart(2, "0")}.000Z`,

    detailJson:
      "{}",
  };
}

function initialSnapshot():
  DurableChangeCaseSnapshot {
  const eventTypes = [
    "CASE_CREATED",
    "PREFLIGHT_COMPLETED",
    "REVIEW_ACCEPTED",
    "APPLY_REVALIDATION_MATCHED",
    "APPLY_ATTEMPT_STARTED",
    "APPLY_SUCCEEDED",
    "CONFIGURED_STATE_VERIFIED",
    "LIVE_STALE_OBSERVED",
    "OLD_WITNESS_CLOSED",
    "OLD_PID_GONE",
    "FRESH_WITNESS_BOUND",
    "LIVE_CONVERGED",
    "AUDIT_PENDING",
  ];

  const record:
    DurableChangeCaseRecord = {
      schemaVersion:
        "meridian.live-change-case.v1",

      caseId:
        "a6-test-case",

      mode:
        "LIVE_ISOLATED_DEMO",

      state:
        "AUDIT_PENDING",

      version:
        13,

      createdAtUtc:
        "2026-09-18T00:00:01.000Z",

      updatedAtUtc:
        "2026-09-18T01:00:08.000Z",

      fixture: {
        fixtureId:
          DEMO_FIXTURE_ID,

        username:
          DEMO_FIXTURE_USERNAME,

        targetRole:
          DEMO_FIXTURE_TARGET_ROLE,

        expectedGeneration:
          "generation-a6-test",
      },

      intent: {
        operation:
          "REMOVE",

        targetRole:
          DEMO_FIXTURE_TARGET_ROLE,
      },

      preflight: {
        digest:
          DIGEST,
      },

      review: {
        reviewedDigest:
          DIGEST,
      },

      applyAttempt: {
        applyAttemptId:
          "attempt-a6-test",

        completionClassification:
          "APPLIED",

        mutationDispatchCount:
          1,

        configuredVerified:
          true,

        afterDirectRoles: [
          "MeridianEmployee",
          DEMO_FIXTURE_TRANSPORT_ROLE,
        ],
      },

      liveObservations: [
        {
          phase:
            "PRE_APPLY",

          serverPid:
            700,
        },
        {
          phase:
            "STALE",

          serverPid:
            700,
        },
        {
          phase:
            "CONVERGED",

          serverPid:
            701,

          everyRequiredDecisionMatchesExpected:
            true,

          lostPermissionMismatchCount:
            0,
        },
      ],

      audit:
        null,

      receipt:
        null,
    };

  return {
    record,

    events:
      eventTypes.map(
        (
          eventType,
          index,
        ) =>
          historicalEvent(
            index +
              1,
            eventType,
          ),
      ),
  };
}

function audit():
  NativeUserChangeAuditBinding {
  return {
    schemaVersion:
      LIVE_NATIVE_AUDIT_SCHEMA_VERSION,

    auditTransportVersion:
      "health-v1",

    systemId:
      "a88ee4007559:IRIS",

    auditIndex:
      999,

    utcTimeStamp:
      "2026-09-18 01:00:00.250",

    eventSource:
      "%System",

    eventType:
      "%Security",

    event:
      "UserChange",

    pid:
      812,

    username:
      "meridian.runtime",

    description:
      "Modify User meridian.demo.witness",

    eventData:
      "Modify User: meridian.demo.witness\n\nRoles modified:\n  New value: MeridianEmployee,MeridianDemoNativeTransport\n  Old value: MeridianSupervisor\n",

    namespace:
      "%SYS",

    roles:
      "MeridianControlPlaneRuntime,MeridianControlPlaneHelperExecution",

    authentication:
      "Password",

    status:
      "",

    targetUsername:
      DEMO_FIXTURE_USERNAME,

    targetRole:
      DEMO_FIXTURE_TARGET_ROLE,

    targetBound:
      true,

    roleRemovalBound:
      true,

    pidRebound:
      true,
  };
}

function summary(
  record:
    VerifiedReceiptHistoryRecord,
): ReceiptHistorySummary {
  const {
    receiptJson:
      _receiptJson,

    ...rest
  } =
    record;

  void _receiptJson;

  return rest;
}

function harness(
  options?: {
    readonly audit?:
      NativeUserChangeAuditBinding |
      null;

    readonly writeFailure?:
      boolean;

    readonly readFailure?:
      boolean;

    readonly corruptReadback?:
      boolean;
  },
) {
  let current =
    initialSnapshot();

  let persisted:
    VerifiedReceiptHistoryRecord |
    null =
      null;

  let tick =
    0;

  const appendEvent =
    vi.fn(
      async (
        mutation:
          DurableChangeCaseEventMutation,
      ) => {
        current = {
          record:
            mutation.record,

          events: [
            ...current.events,
            mutation.event,
          ],
        };

        return current;
      },
    );

  const persistReceipt =
    vi.fn(
      async (
        record:
          VerifiedReceiptHistoryRecord,
      ) => {
        if (
          options?.writeFailure
        ) {
          throw new Error(
            "controlled write failure",
          );
        }

        persisted =
          record;

        return {
          status:
            "CREATED" as const,

          record:
            summary(
              record,
            ),
        };
      },
    );

  const readReceipt =
    vi.fn(
      async () => {
        if (
          options?.readFailure
        ) {
          throw new Error(
            "controlled readback failure",
          );
        }

        if (
          persisted ===
            null
        ) {
          throw new Error(
            "receipt not persisted",
          );
        }

        if (
          options?.corruptReadback
        ) {
          return {
            ...persisted,

            receiptSha256:
              "B".repeat(
                64,
              ),
          };
        }

        return persisted;
      },
    );

  const dependencies:
    LiveReceiptClosureDependencies = {
      readCase:
        async () =>
          current,

      appendEvent,

      findNativeAudit:
        vi.fn(
          async () =>
            options?.audit ===
              undefined
              ? audit()
              : options.audit,
        ),

      persistReceipt,

      readReceipt,

      sha256Utf8:
        (
          value,
        ) =>
          createHash(
            "sha256",
          )
            .update(
              value,
              "utf8",
            )
            .digest(
              "hex",
            )
            .toUpperCase(),

      nowUtc:
        () => {
          tick +=
            1;

          return `2026-09-18T01:10:${String(tick).padStart(2, "0")}.000Z`;
        },
    };

  return {
    dependencies,
    appendEvent,
    persistReceipt,
    readReceipt,
    current:
      () =>
        current,
  };
}

describe(
  "A6 live native-audit plus receipt closure",
  () => {
    it(
      "keeps AUDIT_PENDING and writes no receipt when native audit is not yet available",
      async () => {
        const h =
          harness({
            audit:
              null,
          });

        const result =
          await closeLiveReceiptCore(
            {
              caseId:
                "a6-test-case",

              expectedCaseVersion:
                13,
            },
            h.dependencies,
          );

        expect(
          result.state,
        ).toBe(
          "AUDIT_PENDING",
        );

        expect(
          result.verified,
        ).toBe(
          false,
        );

        expect(
          h.appendEvent,
        ).not.toHaveBeenCalled();

        expect(
          h.persistReceipt,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "stops after RECEIPT_WRITE_STARTED when receipt persistence fails",
      async () => {
        const h =
          harness({
            writeFailure:
              true,
          });

        await expect(
          closeLiveReceiptCore(
            {
              caseId:
                "a6-test-case",

              expectedCaseVersion:
                13,
            },
            h.dependencies,
          ),
        ).rejects.toMatchObject({
          name:
            "LiveReceiptClosureError",

          code:
            "RECEIPT_WRITE_FAILED",
        });

        expect(
          h.current().record.state,
        ).toBe(
          "AUDIT_PENDING",
        );

        expect(
          h.current().events
            .slice(
              -2,
            )
            .map(
              (
                event,
              ) =>
                event.eventType,
            ),
        ).toEqual([
          "AUDIT_BOUND",
          "RECEIPT_WRITE_STARTED",
        ]);

        expect(
          h.readReceipt,
        ).not.toHaveBeenCalled();

        expect(
          h.current().events.some(
            (
              event,
            ) =>
              event.eventType ===
              "CASE_VERIFIED",
          ),
        ).toBe(
          false,
        );
      },
    );

    it(
      "persists but never verifies when exact receipt readback fails",
      async () => {
        const h =
          harness({
            readFailure:
              true,
          });

        await expect(
          closeLiveReceiptCore(
            {
              caseId:
                "a6-test-case",

              expectedCaseVersion:
                13,
            },
            h.dependencies,
          ),
        ).rejects.toMatchObject({
          code:
            "RECEIPT_READBACK_FAILED",
        });

        expect(
          h.current().events
            .slice(
              -3,
            )
            .map(
              (
                event,
              ) =>
                event.eventType,
            ),
        ).toEqual([
          "AUDIT_BOUND",
          "RECEIPT_WRITE_STARTED",
          "RECEIPT_PERSISTED",
        ]);

        expect(
          h.current().record.state,
        ).toBe(
          "AUDIT_PENDING",
        );
      },
    );

    it(
      "refuses mismatched receipt readback and never emits CASE_VERIFIED",
      async () => {
        const h =
          harness({
            corruptReadback:
              true,
          });

        await expect(
          closeLiveReceiptCore(
            {
              caseId:
                "a6-test-case",

              expectedCaseVersion:
                13,
            },
            h.dependencies,
          ),
        ).rejects.toMatchObject({
          code:
            "RECEIPT_READBACK_MISMATCH",
        });

        expect(
          h.current().events.some(
            (
              event,
            ) =>
              event.eventType ===
              "CASE_VERIFIED",
          ),
        ).toBe(
          false,
        );
      },
    );

    it(
      "emits the exact five-event closure chain and reaches VERIFIED only after exact readback",
      async () => {
        const h =
          harness();

        const result =
          await closeLiveReceiptCore(
            {
              caseId:
                "a6-test-case",

              expectedCaseVersion:
                13,
            },
            h.dependencies,
          );

        expect(
          result.state,
        ).toBe(
          "VERIFIED",
        );

        expect(
          result.verified,
        ).toBe(
          true,
        );

        expect(
          result.snapshot.record.version,
        ).toBe(
          18,
        );

        expect(
          result.snapshot.events
            .slice(
              -5,
            )
            .map(
              (
                event,
              ) =>
                event.eventType,
            ),
        ).toEqual([
          "AUDIT_BOUND",
          "RECEIPT_WRITE_STARTED",
          "RECEIPT_PERSISTED",
          "RECEIPT_READBACK_VERIFIED",
          "CASE_VERIFIED",
        ]);

        expect(
          result.snapshot.record.audit,
        ).toMatchObject({
          auditIndex:
            999,

          roleRemovalBound:
            true,
        });

        expect(
          result.snapshot.record.receipt,
        ).toMatchObject({
          status:
            "VERIFIED",
        });

        expect(
          h.persistReceipt,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          h.readReceipt,
        ).toHaveBeenCalledTimes(
          1,
        );
      },
    );

    it(
      "rejects stale case version before audit lookup or receipt write",
      async () => {
        const h =
          harness();

        await expect(
          closeLiveReceiptCore(
            {
              caseId:
                "a6-test-case",

              expectedCaseVersion:
                12,
            },
            h.dependencies,
          ),
        ).rejects.toBeInstanceOf(
          LiveReceiptClosureError,
        );

        expect(
          h.appendEvent,
        ).not.toHaveBeenCalled();

        expect(
          h.persistReceipt,
        ).not.toHaveBeenCalled();
      },
    );
  },
);
