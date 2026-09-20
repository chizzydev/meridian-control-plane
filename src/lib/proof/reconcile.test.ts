import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  ProofContract,
} from "./contract";

import {
  PROOF_CONTRACT_SCHEMA_VERSION,
} from "./contract";

import {
  reconcileUnknownWithContract,
} from "./reconcile";

function contract(
  decision:
    Awaited<
      ReturnType<
        ProofContract<
          { username: string },
          { digest: string },
          { applied: true }
        >["reconcileUnknown"]
      >
    >,
): ProofContract<
  { username: string },
  { digest: string },
  { applied: true }
> {
  return {
    schemaVersion:
      PROOF_CONTRACT_SCHEMA_VERSION,

    contractId:
      "meridian.test.reconcile",

    contractVersion:
      1,

    actionType:
      "TEST_RECONCILE",

    domain:
      "PERMISSIONS",

    risk:
      "LOW",

    reversibility:
      "REVERSIBLE",

    requiredAuthority:
      [],

    proofRequirements:
      [],

    target:
      (
        intent,
      ) => ({
        kind:
          "USER",

        canonicalId:
          `user:${intent.username}`,

        displayName:
          intent.username,

        fixtureId:
          null,

        generation:
          null,
      }),

    preflight:
      async () => ({
        digest:
          "A",
      }),

    expectedDelta:
      () => ({
        summary:
          "test",
        before:
          {},
        after:
          {},
      }),

    analyzeImpact:
      async () => ({
        certainty:
          "KNOWN",
        summary:
          "test",
        affectedEntities:
          [],
        limitations:
          [],
      }),

    digestPreflight:
      () =>
        "A".repeat(
          64,
        ),

    revalidate:
      async (
        _context,
        reviewed,
      ) => ({
        outcome:
          "MATCH",
        freshPreflight:
          reviewed.preflight,
        freshDigest:
          reviewed.reviewedPreflightDigest,
      }),

    execute:
      async () => ({
        applied:
          true,
      }),

    reconcileUnknown:
      async () =>
        decision,

    verify:
      async () =>
        [],

    buildRecoveryPlan:
      () => ({
        recoveryActionType:
          null,
        automatic:
          false,
        summary:
          "none",
      }),
  };
}

const context = {
  actionId:
    "action:test-001",
  logicalActor:
    "operator",
  irisRuntimeUser:
    "meridian.runtime",
  nowUtc:
    "2026-09-20T14:00:00.000Z",
};

const reviewed = {
  intent: {
    username:
      "maya.patel",
  },
  preflight: {
    digest:
      "A",
  },
  reviewedPreflightDigest:
    "A".repeat(
      64,
    ),
};

describe(
  "unknown-after-dispatch reconciliation runner",
  () => {
    it(
      "returns applied evidence without enabling automatic retry",
      async () => {
        const result =
          await reconcileUnknownWithContract(
            contract({
              outcome:
                "APPLIED",
              execution: {
                applied:
                  true,
              },
            }),
            context,
            reviewed,
          );

        expect(
          result.decision.outcome,
        ).toBe(
          "APPLIED",
        );

        expect(
          result.automaticRetryAllowed,
        ).toBe(
          false,
        );

        expect(
          result.decisionDigest,
        ).toMatch(
          /^[A-F0-9]{64}$/,
        );
      },
    );

    it.each([
      "NOT_APPLIED",
      "STILL_UNKNOWN",
    ] as const)(
      "keeps %s fail-closed and retry-disabled",
      async (
        outcome:
          "NOT_APPLIED" |
          "STILL_UNKNOWN",
      ) => {
        const result =
          await reconcileUnknownWithContract(
            contract({
              outcome,
              reason:
                "authoritative-readback",
            }),
            context,
            reviewed,
          );

        expect(
          result.decision.outcome,
        ).toBe(
          outcome,
        );

        expect(
          result.automaticRetryAllowed,
        ).toBe(
          false,
        );
      },
    );

    it(
      "rejects blank fail-closed reasons",
      async () => {
        await expect(
          reconcileUnknownWithContract(
            contract({
              outcome:
                "STILL_UNKNOWN",
              reason:
                " ",
            }),
            context,
            reviewed,
          ),
        ).rejects.toThrow(
          "non-empty reason",
        );
      },
    );

    it(
      "rejects secret-bearing execution material from reconciliation digesting",
      async () => {
        const unsafe =
          contract({
            outcome:
              "APPLIED",
            execution: {
              applied:
                true,
            },
          });

        unsafe.reconcileUnknown =
          async () =>
            ({
              outcome:
                "APPLIED",
              execution: {
                applied:
                  true,
                password:
                  "should-never-enter-proof",
              } as unknown as {
                applied: true;
              },
            });

        await expect(
          reconcileUnknownWithContract(
            unsafe,
            context,
            reviewed,
          ),
        ).rejects.toThrow(
          "secret-bearing field",
        );
      },
    );
  },
);
