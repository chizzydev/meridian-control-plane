import {
  describe,
  expect,
  it,
} from "vitest";

import {
  DEMO_FIXTURE_ID,
  DEMO_FIXTURE_TARGET_ROLE,
  DEMO_FIXTURE_USERNAME,
} from "./demo-fixture";

import {
  CHANGE_CASE_EVENT_TYPES,
  buildDurableChangeCaseEventMutation,
  createLiveDemoDurableChangeCase,
  validateDurableChangeCaseSnapshot,
} from "./durable-change-case";

const CASE_ID =
  "a4a-case-foundation-001";

const GENERATION =
  "fixture-generation-a4a-001";

const T0 =
  "2026-09-17T20:00:00.000Z";

const T1 =
  "2026-09-17T20:00:01.000Z";

const T2 =
  "2026-09-17T20:00:02.000Z";

describe(
  "durable live Change Case foundation",
  () => {
    it(
      "creates only the fixed A3 isolated fixture authority",
      () => {
        const record =
          createLiveDemoDurableChangeCase({
            caseId:
              CASE_ID,

            expectedFixtureGeneration:
              GENERATION,

            nowUtc:
              T0,
          });

        expect(
          record,
        ).toMatchObject({
          caseId:
            CASE_ID,

          mode:
            "LIVE_ISOLATED_DEMO",

          state:
            "PROPOSED",

          version:
            1,

          fixture: {
            fixtureId:
              DEMO_FIXTURE_ID,

            username:
              DEMO_FIXTURE_USERNAME,

            targetRole:
              DEMO_FIXTURE_TARGET_ROLE,

            expectedGeneration:
              GENERATION,
          },

          intent: {
            operation:
              "REMOVE",

            targetRole:
              DEMO_FIXTURE_TARGET_ROLE,
          },

          preflight:
            null,

          review:
            null,

          applyAttempt:
            null,

          liveObservations:
            [],

          audit:
            null,

          receipt:
            null,
        });

        expect(
          JSON.stringify(
            record,
          ),
        ).not.toContain(
          "maya.patel",
        );
      },
    );

    it(
      "covers every A2 append-only journal event name",
      () => {
        expect(
          CHANGE_CASE_EVENT_TYPES,
        ).toEqual([
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
        ]);
      },
    );

    it(
      "advances version and journal sequence monotonically through preflight and review",
      () => {
        const proposed =
          createLiveDemoDurableChangeCase({
            caseId:
              CASE_ID,

            expectedFixtureGeneration:
              GENERATION,

            nowUtc:
              T0,
          });

        const preflight =
          buildDurableChangeCaseEventMutation(
            proposed,
            1,
            {
              expectedVersion:
                1,

              eventType:
                "PREFLIGHT_COMPLETED",

              nextState:
                "PREFLIGHTED",

              occurredAtUtc:
                T1,

              detailJson:
                '{"digest":"A4A"}',

              evidencePatch: {
                preflight: {
                  digestAlgorithm:
                    "SHA-256",

                  digest:
                    "A4A",
                },
              },
            },
          );

        expect(
          preflight.record.version,
        ).toBe(
          2,
        );

        expect(
          preflight.event,
        ).toMatchObject({
          sequence:
            2,

          versionBefore:
            1,

          versionAfter:
            2,

          fromState:
            "PROPOSED",

          toState:
            "PREFLIGHTED",
        });

        const reviewed =
          buildDurableChangeCaseEventMutation(
            preflight.record,
            2,
            {
              expectedVersion:
                2,

              eventType:
                "REVIEW_ACCEPTED",

              nextState:
                "READY",

              occurredAtUtc:
                T2,

              detailJson:
                '{"reviewedDigest":"A4A"}',

              evidencePatch: {
                review: {
                  reviewedDigest:
                    "A4A",

                  reviewedAtUtc:
                    T2,
                },
              },
            },
          );

        expect(
          reviewed.record.version,
        ).toBe(
          3,
        );

        expect(
          reviewed.record.state,
        ).toBe(
          "READY",
        );

        expect(
          reviewed.event.sequence,
        ).toBe(
          3,
        );
      },
    );

    it(
      "rejects stale concurrency tokens before producing another event",
      () => {
        const record =
          createLiveDemoDurableChangeCase({
            caseId:
              CASE_ID,

            expectedFixtureGeneration:
              GENERATION,

            nowUtc:
              T0,
          });

        expect(
          () =>
            buildDurableChangeCaseEventMutation(
              record,
              1,
              {
                expectedVersion:
                  0,

                eventType:
                  "PREFLIGHT_COMPLETED",

                nextState:
                  "PREFLIGHTED",

                occurredAtUtc:
                  T1,

                detailJson:
                  "{}",
              },
            ),
        ).toThrow(
          "Durable Change Case version conflict",
        );
      },
    );

    it(
      "refuses event/state combinations that could narrate a false lifecycle",
      () => {
        const record =
          createLiveDemoDurableChangeCase({
            caseId:
              CASE_ID,

            expectedFixtureGeneration:
              GENERATION,

            nowUtc:
              T0,
          });

        expect(
          () =>
            buildDurableChangeCaseEventMutation(
              record,
              1,
              {
                expectedVersion:
                  1,

                eventType:
                  "REVIEW_ACCEPTED",

                nextState:
                  "PREFLIGHTED",

                occurredAtUtc:
                  T1,

                detailJson:
                  "{}",
              },
            ),
        ).toThrow(
          "does not own transition",
        );
      },
    );

    it(
      "requires the journal to explain the durable record version",
      () => {
        const record =
          createLiveDemoDurableChangeCase({
            caseId:
              CASE_ID,

            expectedFixtureGeneration:
              GENERATION,

            nowUtc:
              T0,
          });

        expect(
          () =>
            validateDurableChangeCaseSnapshot({
              record,
              events:
                [],
            }),
        ).toThrow(
          "record state/version is not explained",
        );
      },
    );
  },
);
