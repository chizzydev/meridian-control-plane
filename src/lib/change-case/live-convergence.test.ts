import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  DEMO_FIXTURE_ID,
  DEMO_FIXTURE_USERNAME,
} from "./demo-fixture";

import {
  createLiveDemoDurableChangeCase,
  type DurableChangeCaseEventMutation,
  type DurableChangeCaseJournalEvent,
  type DurableChangeCaseRecord,
  type DurableChangeCaseSnapshot,
} from "./durable-change-case";

import {
  LIVE_WITNESS_LOST_PERMISSION_KEYS,
  LIVE_WITNESS_REQUIRED_PERMISSION_KEYS,
  LIVE_WITNESS_RETAINED_PERMISSION_KEYS,
  LIVE_WITNESS_TRANSPORT_PERMISSION_KEYS,
  LiveConvergenceRefusalError,
  advanceLiveConvergenceCore,
  buildPostApplyWitnessObservation,
  buildPreApplyWitnessBaseline,
  recordStaleLiveWitnessCore,
  type LiveWitnessProcessRow,
  type LiveWitnessSelfSnapshot,
} from "./live-convergence";

const GENERATION =
  "a5-test-generation";

function iso(
  second:
    number,
): string {
  return `2026-09-17T22:00:${String(second).padStart(2, "0")}.000Z`;
}

function preflightEvidence() {
  return {
    evidenceVersion:
      "meridian.live-apply-orchestration.v1",

    canonical: {
      schemaVersion:
        "meridian.preflight.v1",

      expectedAuthorizationDelta: {
        lostConfiguredPermissions: [
          "%Admin_Task:U",
          "Meridian_Admin:U",
          "Meridian_Jobs:U",
          "Meridian_Orders:W",
        ],

        retainedConfiguredPermissions: [
          "%DB_USER:R",
          "%Native_ClassExecution:U",
          "%Native_Concurrency:U",
          "%Native_GlobalAccess:U",
          "%Native_Transaction:U",
          "Meridian_Orders:R",
          "Meridian_Portal:U",
        ],
      },
    },
  };
}

function fakeEvents(
  count:
    number,
): DurableChangeCaseJournalEvent[] {
  return Array.from(
    {
      length:
        count,
    },
    (
      _,
      index,
    ) => ({
      schemaVersion:
        "meridian.live-change-case-event.v1",
      caseId:
        "a5-test-case",
      sequence:
        index +
        1,
      eventType:
        "CASE_CREATED",
      fromState:
        "NONE",
      toState:
        "PROPOSED",
      versionBefore:
        index +
        1,
      versionAfter:
        index +
        1,
      occurredAtUtc:
        iso(
          Math.min(
            index,
            59,
          ),
        ),
      detailJson:
        "{}",
    }),
  );
}

function appliedSnapshot():
  DurableChangeCaseSnapshot {
  const created =
    createLiveDemoDurableChangeCase({
      caseId:
        "a5-test-case",
      expectedFixtureGeneration:
        GENERATION,
      nowUtc:
        iso(
          0,
        ),
    });

  const record =
    {
      ...created,
      state:
        "APPLIED" as const,
      version:
        7,
      updatedAtUtc:
        iso(
          7,
        ),
      preflight:
        preflightEvidence(),
    } satisfies DurableChangeCaseRecord;

  return {
    record,
    events:
      fakeEvents(
        7,
      ),
  };
}

function readyRecord():
  DurableChangeCaseRecord {
  const snapshot =
    appliedSnapshot();

  return {
    ...snapshot.record,
    state:
      "READY",
    version:
      3,
  };
}

function processRow(
  pid:
    number,
  roles:
    readonly string[],
): LiveWitnessProcessRow {
  return {
    pid,
    username:
      DEMO_FIXTURE_USERNAME,
    loginRoles:
      roles,
    roles,
    namespace:
      "USER",
    startTimeUtc:
      iso(
        1,
      ),
    clientIPAddress:
      "127.0.0.1",
    startupClientIPAddress:
      "127.0.0.1",
  };
}

function checks(
  mode:
    "ALLOW_ALL" |
    "POST_CONFIG",
): LiveWitnessSelfSnapshot["checks"] {
  return Object.fromEntries(
    LIVE_WITNESS_REQUIRED_PERMISSION_KEYS.map(
      (key) => [
        key,
        (
          mode ===
            "ALLOW_ALL" ||
          !(
            LIVE_WITNESS_LOST_PERMISSION_KEYS as readonly string[]
          ).includes(
            key,
          )
        )
          ? 1
          : 0,
      ],
    ),
  ) as unknown as
    LiveWitnessSelfSnapshot["checks"];
}

function self(
  pid:
    number,
  mode:
    "ALLOW_ALL" |
    "POST_CONFIG",
): LiveWitnessSelfSnapshot {
  return {
    capturedAtUtc:
      iso(
        2,
      ),
    username:
      DEMO_FIXTURE_USERNAME,
    namespace:
      "USER",
    serverPid:
      pid,
    usingSharedMemory:
      false,
    checks:
      checks(
        mode,
      ),
  };
}

function beforeRoles() {
  return [
    "MeridianEmployee",
    "MeridianViewer",
    "MeridianSupervisor",
    "MeridianOperator",
    "MeridianJobRunner",
    "MeridianDemoNativeTransport",
  ];
}

function afterRoles() {
  return [
    "MeridianEmployee",
    "MeridianViewer",
    "MeridianDemoNativeTransport",
  ];
}

function baseline(
  pid =
    7101,
) {
  return buildPreApplyWitnessBaseline({
    record:
      readyRecord(),
    observationId:
      "obs-pre",
    self:
      self(
        pid,
        "ALLOW_ALL",
      ),
    processRows: [
      processRow(
        pid,
        beforeRoles(),
      ),
    ],
  });
}

function stale(
  record:
    DurableChangeCaseRecord,
  pid =
    7101,
) {
  return buildPostApplyWitnessObservation({
    record,
    observationId:
      "obs-stale",
    phase:
      "STALE",
    self:
      self(
        pid,
        "ALLOW_ALL",
      ),
    processRows: [
      processRow(
        pid,
        beforeRoles(),
      ),
    ],
  });
}

function fresh(
  record:
    DurableChangeCaseRecord,
  pid =
    7202,
) {
  return buildPostApplyWitnessObservation({
    record,
    observationId:
      "obs-fresh",
    phase:
      "CONVERGED",
    self:
      self(
        pid,
        "POST_CONFIG",
      ),
    processRows: [
      processRow(
        pid,
        afterRoles(),
      ),
    ],
  });
}

function harness(
  initial =
    appliedSnapshot(),
) {
  let snapshot =
    initial;

  const appendEvent =
    vi.fn(
      async (
        mutation:
          DurableChangeCaseEventMutation,
      ) => {
        snapshot = {
          record:
            mutation.record,
          events: [
            ...snapshot.events,
            mutation.event,
          ],
        };

        return snapshot;
      },
    );

  let observationId =
    0;

  return {
    dependencies: {
      readCase:
        vi.fn(
          async () =>
            snapshot,
        ),

      appendEvent,

      nowUtc:
        () =>
          iso(
            Math.min(
              10 +
                snapshot.record.version,
              59,
            ),
          ),

      newObservationId:
        () =>
          `observation-${++observationId}`,
    },

    snapshot:
      () =>
        snapshot,

    appendEvent,
  };
}

describe(
  "A5 live convergence state machine",
  () => {
    it(
      "binds the fixed fixture pre-Apply baseline to exactly one independent process row",
      () => {
        const observed =
          baseline();

        expect(
          observed.phase,
        ).toBe(
          "PRE_APPLY",
        );

        expect(
          observed.serverPid,
        ).toBe(
          7101,
        );

        expect(
          observed.fixtureId,
        ).toBe(
          DEMO_FIXTURE_ID,
        );

        expect(
          observed.permissions.every(
            (row) =>
              row.live ===
                "ALLOW",
          ),
        ).toBe(
          true,
        );
      },
    );

    it(
      "records configured-vs-live disagreement only when the same pre-Apply PID stays stale",
      async () => {
        const h =
          harness();

        const pre =
          baseline();

        const staleObservation =
          stale(
            h.snapshot().record,
          );

        const result =
          await recordStaleLiveWitnessCore(
            {
              caseId:
                "a5-test-case",
              expectedCaseVersion:
                7,
              preApplyBaseline:
                pre,
              staleObservation,
            },
            h.dependencies,
          );

        expect(
          result.state,
        ).toBe(
          "CONVERGING",
        );

        expect(
          result.verified,
        ).toBe(
          false,
        );

        expect(
          result.staleServerPid,
        ).toBe(
          pre.serverPid,
        );

        expect(
          result.snapshot.record.version,
        ).toBe(
          8,
        );

        expect(
          result.snapshot.events.at(-1)
            ?.eventType,
        ).toBe(
          "LIVE_STALE_OBSERVED",
        );

        expect(
          result.snapshot.record.liveObservations,
        ).toHaveLength(
          2,
        );
      },
    );

    it(
      "refuses a stale claim when the post-Apply observation is not the same PID",
      async () => {
        const h =
          harness();

        const pre =
          baseline(
            7101,
          );

        const staleObservation =
          stale(
            h.snapshot().record,
            7102,
          );

        await expect(
          recordStaleLiveWitnessCore(
            {
              caseId:
                "a5-test-case",
              expectedCaseVersion:
                7,
              preApplyBaseline:
                pre,
              staleObservation,
            },
            h.dependencies,
          ),
        ).rejects.toBeInstanceOf(
          LiveConvergenceRefusalError,
        );

        expect(
          h.appendEvent,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "closes normally, proves old PID gone, binds a different fresh PID, and stops at AUDIT_PENDING",
      async () => {
        const h =
          harness();

        const pre =
          baseline();

        const staleObservation =
          stale(
            h.snapshot().record,
          );

        const converging =
          await recordStaleLiveWitnessCore(
            {
              caseId:
                "a5-test-case",
              expectedCaseVersion:
                7,
              preApplyBaseline:
                pre,
              staleObservation,
            },
            h.dependencies,
          );

        const result =
          await advanceLiveConvergenceCore(
            {
              caseId:
                "a5-test-case",
              expectedCaseVersion:
                converging.snapshot.record.version,
            },
            {
              ...h.dependencies,

              closeOldWitness:
                vi.fn(
                  async () => ({
                    closedAtUtc:
                      iso(
                        20,
                      ),
                  }),
                ),

              proveOldPidGone:
                vi.fn(
                  async () => ({
                    observedAtUtc:
                      iso(
                        21,
                      ),
                    oldPid:
                      7101,
                    userProcessCount:
                      0 as const,
                  }),
                ),

              openFreshWitness:
                vi.fn(
                  async (
                    record:
                      DurableChangeCaseRecord,
                  ) =>
                    fresh(
                      record,
                    ),
                ),
            },
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
          result.oldServerPid,
        ).toBe(
          7101,
        );

        expect(
          result.freshServerPid,
        ).toBe(
          7202,
        );

        expect(
          result.snapshot.record.version,
        ).toBe(
          13,
        );

        expect(
          result.snapshot.record.receipt,
        ).toBeNull();

        expect(
          result.snapshot.record.audit,
        ).toBeNull();

        expect(
          result.snapshot.events.slice(
            -5,
          ).map(
            (event) =>
              event.eventType,
          ),
        ).toEqual([
          "OLD_WITNESS_CLOSED",
          "OLD_PID_GONE",
          "FRESH_WITNESS_BOUND",
          "LIVE_CONVERGED",
          "AUDIT_PENDING",
        ]);

        expect(
          result.snapshot.events.some(
            (event) =>
              event.eventType ===
                "CASE_VERIFIED",
          ),
        ).toBe(
          false,
        );
      },
    );

    it(
      "fails closed when the fresh witness still retains any revoked permission",
      () => {
        const record =
          {
            ...appliedSnapshot().record,
            state:
              "CONVERGING" as const,
          };

        expect(
          () =>
            buildPostApplyWitnessObservation({
              record,
              observationId:
                "obs-not-converged",
              phase:
                "CONVERGED",
              self:
                self(
                  7202,
                  "ALLOW_ALL",
                ),
              processRows: [
                processRow(
                  7202,
                  afterRoles(),
                ),
              ],
            }),
        ).toThrow(
          "Fresh synthetic witness still disagrees",
        );
      },
    );

    it(
      "derives all scoped expected decisions from frozen preflight evidence",
      () => {
        const record =
          appliedSnapshot().record;

        const observed =
          buildPostApplyWitnessObservation({
            record,
            observationId:
              "obs-converged",
            phase:
              "CONVERGED",
            self:
              self(
                7202,
                "POST_CONFIG",
              ),
            processRows: [
              processRow(
                7202,
                afterRoles(),
              ),
            ],
          });

        for (
          const key
          of LIVE_WITNESS_LOST_PERMISSION_KEYS
        ) {
          expect(
            observed.permissions.find(
              (row) =>
                row.key ===
                  key,
            ),
          ).toMatchObject({
            expected:
              "DENY",
            configured:
              "DENY",
            live:
              "DENY",
          });
        }

        for (
          const key
          of [
            ...LIVE_WITNESS_RETAINED_PERMISSION_KEYS,
            ...LIVE_WITNESS_TRANSPORT_PERMISSION_KEYS,
          ]
        ) {
          expect(
            observed.permissions.find(
              (row) =>
                row.key ===
                  key,
            ),
          ).toMatchObject({
            expected:
              "ALLOW",
            configured:
              "ALLOW",
            live:
              "ALLOW",
          });
        }
      },
    );
  },
);
