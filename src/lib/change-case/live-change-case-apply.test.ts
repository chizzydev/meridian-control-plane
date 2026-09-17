import {
  describe,
  expect,
  it,
} from "vitest";

import {
  DEMO_FIXTURE_DIRECT_ROLES_AFTER,
  DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
  DEMO_FIXTURE_DISPLAY_NAME,
  DEMO_FIXTURE_ID,
  DEMO_FIXTURE_NAMESPACE,
  DEMO_FIXTURE_TARGET_ROLE,
  DEMO_FIXTURE_USERNAME,
} from "./demo-fixture";

import {
  appliedDemoFixtureMutation,
  failedDemoFixtureMutation,
} from "./demo-fixture-apply";

import {
  DURABLE_CHANGE_CASE_EVENT_SCHEMA_VERSION,
  createLiveDemoDurableChangeCase,
  validateDurableChangeCaseSnapshot,
  type DurableChangeCaseEventMutation,
  type DurableChangeCaseSnapshot,
} from "./durable-change-case";

import type {
  ReviewablePreflightForReady,
} from "./ready-preflight";

import {
  LiveChangeCaseApplyRefusalError,
  applyLiveDemoChangeCaseCore,
  preflightLiveDemoChangeCaseCore,
  reviewLiveDemoChangeCaseCore,
  type LiveChangeCaseApplyDependencies,
} from "./live-change-case-apply";

const REVIEWED_DIGEST =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

const FRESH_MISMATCH_DIGEST =
  "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";

function reviewable(
  digest:
    string = REVIEWED_DIGEST,
): ReviewablePreflightForReady {
  return {
    state:
      "PREFLIGHTED",
    digestAlgorithm:
      "SHA-256",
    digest,
    canonical: {
      schemaVersion:
        "meridian.preflight.v1",
      change: {
        username:
          DEMO_FIXTURE_USERNAME,
        operation:
          "REMOVE",
        role:
          DEMO_FIXTURE_TARGET_ROLE,
      },
    },
  };
}

function initialSnapshot():
  DurableChangeCaseSnapshot {
  const now =
    "2026-09-17T21:40:00.000Z";

  const record =
    createLiveDemoDurableChangeCase({
      caseId:
        "a4c-test-case",
      expectedFixtureGeneration:
        "generation-1",
      nowUtc:
        now,
    });

  const snapshot:
    DurableChangeCaseSnapshot = {
      record,
      events: [
        {
          schemaVersion:
            DURABLE_CHANGE_CASE_EVENT_SCHEMA_VERSION,
          caseId:
            record.caseId,
          sequence:
            1,
          eventType:
            "CASE_CREATED",
          fromState:
            "NONE",
          toState:
            "PROPOSED",
          versionBefore:
            0,
          versionAfter:
            1,
          occurredAtUtc:
            now,
          detailJson:
            "{}",
        },
      ],
    };

  validateDurableChangeCaseSnapshot(
    snapshot,
  );

  return snapshot;
}

function appliedResult() {
  return appliedDemoFixtureMutation({
    before: {
      username:
        DEMO_FIXTURE_USERNAME,
      displayName:
        DEMO_FIXTURE_DISPLAY_NAME,
      namespace:
        DEMO_FIXTURE_NAMESPACE,
      enabled:
        true,
      directRoles:
        DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
    },
    after: {
      username:
        DEMO_FIXTURE_USERNAME,
      displayName:
        DEMO_FIXTURE_DISPLAY_NAME,
      namespace:
        DEMO_FIXTURE_NAMESPACE,
      enabled:
        true,
      directRoles:
        DEMO_FIXTURE_DIRECT_ROLES_AFTER,
    },
  });
}

function harness(
  fresh:
    () => ReviewablePreflightForReady =
      () =>
        reviewable(),
) {
  let snapshot =
    initialSnapshot();

  let mutationCalls =
    0;

  let executeMutationImpl:
    LiveChangeCaseApplyDependencies["executeMutation"] =
      async () => {
        mutationCalls +=
          1;

        return appliedResult();
      };

  let timestampIndex =
    0;

  const dependencies:
    LiveChangeCaseApplyDependencies = {
      readCase:
        async () =>
          snapshot,

      appendEvent:
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

          validateDurableChangeCaseSnapshot(
            snapshot,
          );

          return snapshot;
        },

      readFreshPreflight:
        async () =>
          fresh(),

      executeMutation:
        async (
          record,
        ) =>
          executeMutationImpl(
            record,
          ),

      nowUtc:
        () => {
          timestampIndex +=
            1;

          return new Date(
            Date.UTC(
              2026,
              8,
              17,
              21,
              40,
              timestampIndex,
            ),
          ).toISOString();
        },

      newApplyAttemptId:
        () =>
          "apply-attempt-1",
    };

  return {
    dependencies,
    get snapshot() {
      return snapshot;
    },
    get mutationCalls() {
      return mutationCalls;
    },
    setExecuteMutation(
      executeMutation:
        LiveChangeCaseApplyDependencies["executeMutation"],
    ) {
      executeMutationImpl =
        executeMutation;
    },
  };
}

async function makeReady(
  h:
    ReturnType<typeof harness>,
): Promise<void> {
  const preflighted =
    await preflightLiveDemoChangeCaseCore(
      {
        caseId:
          "a4c-test-case",
        expectedCaseVersion:
          1,
      },
      h.dependencies,
    );

  expect(
    preflighted.record.state,
  ).toBe(
    "PREFLIGHTED",
  );

  const ready =
    await reviewLiveDemoChangeCaseCore(
      {
        caseId:
          "a4c-test-case",
        expectedCaseVersion:
          2,
        reviewedDigest:
          REVIEWED_DIGEST,
      },
      h.dependencies,
    );

  expect(
    ready.record.state,
  ).toBe(
    "READY",
  );
}

describe(
  "A4C end-to-end Apply state-machine orchestration",
  () => {
    it(
      "persists authoritative preflight and review before READY",
      async () => {
        const h =
          harness();

        await makeReady(
          h,
        );

        expect(
          h.snapshot.record.version,
        ).toBe(
          3,
        );

        expect(
          h.snapshot.record.preflight,
        ).toMatchObject({
          digest:
            REVIEWED_DIGEST,
        });

        expect(
          h.snapshot.record.review,
        ).toMatchObject({
          reviewedDigest:
            REVIEWED_DIGEST,
        });
      },
    );

    it(
      "READY plus fresh digest mismatch transitions STALE with zero mutation dispatch",
      async () => {
        let freshReadCount =
          0;

        const h =
          harness(
            () => {
              freshReadCount +=
                1;

              return reviewable(
                freshReadCount ===
                    1
                  ? REVIEWED_DIGEST
                  : FRESH_MISMATCH_DIGEST,
              );
            },
          );

        await makeReady(
          h,
        );

        const outcome =
          await applyLiveDemoChangeCaseCore(
            {
              caseId:
                "a4c-test-case",
              expectedCaseVersion:
                3,
            },
            h.dependencies,
          );

        expect(
          freshReadCount,
        ).toBe(
          2,
        );

        expect(
          outcome.state,
        ).toBe(
          "STALE",
        );

        expect(
          outcome.mutationDispatchCount,
        ).toBe(
          0,
        );

        expect(
          h.mutationCalls,
        ).toBe(
          0,
        );

        expect(
          outcome.snapshot.events.at(-1)?.eventType,
        ).toBe(
          "APPLY_REVALIDATION_STALE",
        );
      },
    );

    it(
      "READY plus matching digest accounts for exactly one mutation and stops APPLIED",
      async () => {
        const h =
          harness();

        await makeReady(
          h,
        );

        const outcome =
          await applyLiveDemoChangeCaseCore(
            {
              caseId:
                "a4c-test-case",
              expectedCaseVersion:
                3,
            },
            h.dependencies,
          );

        expect(
          outcome.state,
        ).toBe(
          "APPLIED",
        );

        expect(
          h.mutationCalls,
        ).toBe(
          1,
        );

        expect(
          outcome.mutationDispatchCount,
        ).toBe(
          1,
        );

        expect(
          outcome.verified,
        ).toBe(
          false,
        );

        expect(
          outcome.snapshot.events.slice(-4).map(
            (event) =>
              event.eventType,
          ),
        ).toEqual([
          "APPLY_REVALIDATION_MATCHED",
          "APPLY_ATTEMPT_STARTED",
          "APPLY_SUCCEEDED",
          "CONFIGURED_STATE_VERIFIED",
        ]);
      },
    );

    it(
      "configured uncertainty becomes APPLY_FAILED with one accounted dispatch and no retry",
      async () => {
        const h =
          harness();

        await makeReady(
          h,
        );

        let calls =
          0;

        h.setExecuteMutation(
          async () => {
            calls +=
              1;

            return failedDemoFixtureMutation(
              "CONFIGURED_POSTSTATE_MISMATCH:test",
            );
          },
        );

        const outcome =
          await applyLiveDemoChangeCaseCore(
            {
              caseId:
                "a4c-test-case",
              expectedCaseVersion:
                3,
            },
            h.dependencies,
          );

        expect(
          outcome.state,
        ).toBe(
          "APPLY_FAILED",
        );

        expect(
          calls,
        ).toBe(
          1,
        );

        expect(
          outcome.verified,
        ).toBe(
          false,
        );

        expect(
          outcome.snapshot.record.applyAttempt,
        ).toMatchObject({
          automaticRetry:
            false,
          mutationDispatchCount:
            1,
        });
      },
    );

    it(
      "rejects a stale case version before revalidation or mutation",
      async () => {
        const h =
          harness();

        await makeReady(
          h,
        );

        await expect(
          applyLiveDemoChangeCaseCore(
            {
              caseId:
                "a4c-test-case",
              expectedCaseVersion:
                2,
            },
            h.dependencies,
          ),
        ).rejects.toMatchObject({
          code:
            "CASE_VERSION_CONFLICT",
        } satisfies Partial<LiveChangeCaseApplyRefusalError>);

        expect(
          h.mutationCalls,
        ).toBe(
          0,
        );
      },
    );

    it(
      "refuses review when the browser-provided digest does not match authoritative preflight",
      async () => {
        const h =
          harness();

        await preflightLiveDemoChangeCaseCore(
          {
            caseId:
              "a4c-test-case",
            expectedCaseVersion:
              1,
          },
          h.dependencies,
        );

        await expect(
          reviewLiveDemoChangeCaseCore(
            {
              caseId:
                "a4c-test-case",
              expectedCaseVersion:
                2,
              reviewedDigest:
                FRESH_MISMATCH_DIGEST,
            },
            h.dependencies,
          ),
        ).rejects.toMatchObject({
          code:
            "CASE_REVIEW_INVALID",
        } satisfies Partial<LiveChangeCaseApplyRefusalError>);
      },
    );
  },
);
