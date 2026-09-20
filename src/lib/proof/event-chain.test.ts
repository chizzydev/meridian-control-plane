import {
  describe,
  expect,
  it,
} from "vitest";

import {
  appendVerifiedActionEvent,
  createVerifiedActionEvent,
  verifyVerifiedActionEventChain,
  VERIFIED_ACTION_EVENT_GENESIS,
} from "./event-chain";

function genesis() {
  return createVerifiedActionEvent({
    actionId:
      "action:event-chain-001",

    sequence:
      1,

    eventType:
      "ACTION_CREATED",

    fromState:
      "NONE",

    toState:
      "CREATED",

    versionBefore:
      0,

    versionAfter:
      1,

    occurredAtUtc:
      "2026-09-20T14:00:00.000Z",

    detail: {
      actionType:
        "USER_REMOVE_ROLE",
    },

    previousEventHash:
      VERIFIED_ACTION_EVENT_GENESIS,
  });
}

describe(
  "Verified Action event hash chain",
  () => {
    it(
      "builds and verifies a monotonic hash-linked chain",
      () => {
        const first =
          genesis();

        const second =
          appendVerifiedActionEvent(
            first,
            {
              eventType:
                "PREFLIGHT_STARTED",

              toState:
                "PREFLIGHTING",

              occurredAtUtc:
                "2026-09-20T14:00:01.000Z",

              detail:
                {},
            },
          );

        const third =
          appendVerifiedActionEvent(
            second,
            {
              eventType:
                "PREFLIGHT_COMPLETED",

              toState:
                "PREFLIGHTED",

              occurredAtUtc:
                "2026-09-20T14:00:02.000Z",

              detail: {
                digest:
                  "A".repeat(
                    64,
                  ),
              },
            },
          );

        expect(
          () =>
            verifyVerifiedActionEventChain(
              [
                first,
                second,
                third,
              ],
            ),
        ).not.toThrow();
      },
    );

    it(
      "detects historical event mutation",
      () => {
        const first =
          genesis();

        const tampered = {
          ...first,

          detail: {
            actionType:
              "TAMPERED",
          },
        };

        expect(
          () =>
            verifyVerifiedActionEventChain(
              [
                tampered,
              ],
            ),
        ).toThrow(
          "hash does not match",
        );
      },
    );

    it(
      "detects a validly hashed event linked to the wrong predecessor",
      () => {
        const first =
          genesis();

        const wrongSecond =
          createVerifiedActionEvent({
            actionId:
              first.actionId,

            sequence:
              2,

            eventType:
              "PREFLIGHT_STARTED",

            fromState:
              "CREATED",

            toState:
              "PREFLIGHTING",

            versionBefore:
              1,

            versionAfter:
              2,

            occurredAtUtc:
              "2026-09-20T14:00:01.000Z",

            detail:
              {},

            previousEventHash:
              "A".repeat(
                64,
              ),
          });

        expect(
          () =>
            verifyVerifiedActionEventChain(
              [
                first,
                wrongSecond,
              ],
            ),
        ).toThrow(
          "chain breaks",
        );
      },
    );

    it(
      "rejects an event type that does not own the requested transition",
      () => {
        expect(
          () =>
            createVerifiedActionEvent({
              actionId:
                "action:invalid-transition",

              sequence:
                2,

              eventType:
                "ACTION_VERIFIED",

              fromState:
                "CREATED",

              toState:
                "PREFLIGHTING",

              versionBefore:
                1,

              versionAfter:
                2,

              occurredAtUtc:
                "2026-09-20T14:00:01.000Z",

              detail:
                {},

              previousEventHash:
                "A".repeat(
                  64,
                ),
            }),
        ).toThrow(
          "does not own transition",
        );
      },
    );

    it(
      "rejects secret-bearing event detail fields",
      () => {
        expect(
          () =>
            createVerifiedActionEvent({
              actionId:
                "action:secret-event-001",

              sequence:
                1,

              eventType:
                "ACTION_CREATED",

              fromState:
                "NONE",

              toState:
                "CREATED",

              versionBefore:
                0,

              versionAfter:
                1,

              occurredAtUtc:
                "2026-09-20T14:00:00.000Z",

              detail: {
                accessToken:
                  "must-not-be-hashed",
              },

              previousEventHash:
                VERIFIED_ACTION_EVENT_GENESIS,
            }),
        ).toThrow(
          "secret-bearing field",
        );
      },
    );

    it(
      "allows only explicit same-state evidence events",
      () => {
        const verifyEvent =
          createVerifiedActionEvent({
            actionId:
              "action:verify-same-state",

            sequence:
              9,

            eventType:
              "EVIDENCE_RECORDED",

            fromState:
              "VERIFYING",

            toState:
              "VERIFYING",

            versionBefore:
              8,

            versionAfter:
              9,

            occurredAtUtc:
              "2026-09-20T14:00:08.000Z",

            detail:
              {},

            previousEventHash:
              "A".repeat(
                64,
              ),
          });

        expect(
          verifyEvent.toState,
        ).toBe(
          "VERIFYING",
        );

        expect(
          () =>
            createVerifiedActionEvent({
              actionId:
                "action:bad-same-state",

              sequence:
                2,

              eventType:
                "PREFLIGHT_STARTED",

              fromState:
                "CREATED",

              toState:
                "CREATED",

              versionBefore:
                1,

              versionAfter:
                2,

              occurredAtUtc:
                "2026-09-20T14:00:01.000Z",

              detail:
                {},

              previousEventHash:
                "A".repeat(
                  64,
                ),
            }),
        ).toThrow(
          "cannot append without",
        );
      },
    );
  },
);
