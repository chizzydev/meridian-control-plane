import {
  describe,
  expect,
  it,
} from "vitest";

import {
  assertSafetyGateAllowed,
  evaluateSafetyGate,
  type SafetyPredicateRequirement,
  type SafetyPredicateResult,
} from "./safety";

const FIXTURE:
  SafetyPredicateRequirement = {
    predicateId:
      "fixture-match",

    kind:
      "FIXTURE_IDENTITY_MATCH",

    description:
      "Target is the exact Meridian fixture.",
  };

const GENERATION:
  SafetyPredicateRequirement = {
    predicateId:
      "generation-match",

    kind:
      "GENERATION_MATCH",

    description:
      "Target generation still matches review.",
  };

function result(
  requirement:
    SafetyPredicateRequirement,
  status:
    SafetyPredicateResult["status"] = "PASS",
): SafetyPredicateResult {
  return {
    predicateId:
      requirement.predicateId,

    kind:
      requirement.kind,

    status,

    observedAtUtc:
      "2026-09-20T14:00:00.000Z",

    source:
      "IRIS authoritative readback",

    summary:
      `${requirement.predicateId}:${status}`,
  };
}

describe(
  "server-side safety predicate gate",
  () => {
    it(
      "allows an action only when every declared predicate is PASS",
      () => {
        const evaluation =
          evaluateSafetyGate(
            [
              FIXTURE,
              GENERATION,
            ],
            [
              result(
                FIXTURE,
              ),
              result(
                GENERATION,
              ),
            ],
          );

        expect(
          evaluation,
        ).toEqual({
          allowed:
            true,

          blockingPredicateIds:
            [],

          unknownPredicateIds:
            [],
        });

        expect(
          () =>
            assertSafetyGateAllowed(
              evaluation,
            ),
        ).not.toThrow();
      },
    );

    it(
      "blocks a known failed predicate",
      () => {
        const evaluation =
          evaluateSafetyGate(
            [
              FIXTURE,
              GENERATION,
            ],
            [
              result(
                FIXTURE,
              ),
              result(
                GENERATION,
                "FAIL",
              ),
            ],
          );

        expect(
          evaluation.allowed,
        ).toBe(
          false,
        );

        expect(
          evaluation.blockingPredicateIds,
        ).toEqual([
          "generation-match",
        ]);

        expect(
          evaluation.unknownPredicateIds,
        ).toEqual(
          [],
        );
      },
    );

    it(
      "blocks UNKNOWN instead of treating uncertainty as safety",
      () => {
        const evaluation =
          evaluateSafetyGate(
            [
              FIXTURE,
            ],
            [
              result(
                FIXTURE,
                "UNKNOWN",
              ),
            ],
          );

        expect(
          evaluation.allowed,
        ).toBe(
          false,
        );

        expect(
          evaluation.unknownPredicateIds,
        ).toEqual([
          "fixture-match",
        ]);
      },
    );

    it(
      "treats a missing predicate result as unknown and blocking",
      () => {
        const evaluation =
          evaluateSafetyGate(
            [
              FIXTURE,
            ],
            [],
          );

        expect(
          evaluation,
        ).toEqual({
          allowed:
            false,

          blockingPredicateIds: [
            "fixture-match",
          ],

          unknownPredicateIds: [
            "fixture-match",
          ],
        });
      },
    );

    it(
      "rejects duplicate predicate requirements",
      () => {
        expect(
          () =>
            evaluateSafetyGate(
              [
                FIXTURE,
                FIXTURE,
              ],
              [],
            ),
        ).toThrow(
          "Duplicate safety predicate requirement",
        );
      },
    );

    it(
      "rejects duplicate predicate results",
      () => {
        expect(
          () =>
            evaluateSafetyGate(
              [
                FIXTURE,
              ],
              [
                result(
                  FIXTURE,
                ),
                result(
                  FIXTURE,
                ),
              ],
            ),
        ).toThrow(
          "Duplicate safety predicate result",
        );
      },
    );

    it(
      "rejects undeclared predicate results",
      () => {
        expect(
          () =>
            evaluateSafetyGate(
              [],
              [
                result(
                  FIXTURE,
                ),
              ],
            ),
        ).toThrow(
          "Unexpected safety predicate result",
        );
      },
    );

    it(
      "rejects a result whose kind differs from the requirement",
      () => {
        expect(
          () =>
            evaluateSafetyGate(
              [
                FIXTURE,
              ],
              [
                {
                  ...result(
                    FIXTURE,
                  ),
                  kind:
                    "GENERATION_MATCH",
                },
              ],
            ),
        ).toThrow(
          "does not match requirement",
        );
      },
    );

    it(
      "requires UTC observation timestamps",
      () => {
        expect(
          () =>
            evaluateSafetyGate(
              [
                FIXTURE,
              ],
              [
                {
                  ...result(
                    FIXTURE,
                  ),
                  observedAtUtc:
                    "2026-09-20 14:00:00",
                },
              ],
            ),
        ).toThrow(
          "UTC ISO-8601",
        );
      },
    );

    it(
      "throws a typed safety error when the gate is not allowed",
      () => {
        const evaluation =
          evaluateSafetyGate(
            [
              FIXTURE,
            ],
            [
              result(
                FIXTURE,
                "FAIL",
              ),
            ],
          );

        expect(
          () =>
            assertSafetyGateAllowed(
              evaluation,
            ),
        ).toThrow(
          "Safety predicates did not authorize this action",
        );
      },
    );
  },
);
