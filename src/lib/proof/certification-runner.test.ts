import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  PROOF_CONTRACT_SCHEMA_VERSION,
  type ProofContract,
} from "./contract";

import type {
  ActionReceiptV2,
} from "./receipt";

import {
  ProofEngineError,
} from "./errors";

import {
  certifyVerifiedAction,
} from "./certification-runner";

interface TestIntent {
  readonly target:
    string;
}

interface TestPreflight {
  readonly digest:
    string;
}

interface TestExecution {
  readonly applied:
    true;
}

function makeContract(
  options?: {
    readonly stale?:
      boolean;

    readonly unknown?:
      boolean;

    readonly reconcile?:
      "APPLIED" |
      "NOT_APPLIED" |
      "STILL_UNKNOWN";

    readonly proofPass?:
      boolean;
  },
): ProofContract<
  TestIntent,
  TestPreflight,
  TestExecution
> {
  return {
    schemaVersion:
      PROOF_CONTRACT_SCHEMA_VERSION,

    contractId:
      "meridian.test.certification",

    contractVersion:
      1,

    actionType:
      "TEST_CERTIFICATION",

    domain:
      "PERMISSIONS",

    risk:
      "LOW",

    reversibility:
      "REVERSIBLE",

    requiredAuthority:
      [],

    proofRequirements: [
      {
        requirementId:
          "config",
        plane:
          "CONFIGURATION_READBACK",
        applicability:
          "REQUIRED",
        description:
          "Config matches.",
        source:
          "IRIS",
      },
    ],

    target:
      (
        intent,
      ) => ({
        kind:
          "TEST",
        canonicalId:
          `test:${intent.target}`,
        displayName:
          intent.target,
        fixtureId:
          null,
        generation:
          null,
      }),

    preflight:
      async () => ({
        digest:
          "A".repeat(
            64,
          ),
      }),

    expectedDelta:
      () => ({
        summary:
          "Apply test change.",
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
          "Known test impact.",
        affectedEntities:
          [],
        limitations:
          [],
      }),

    digestPreflight:
      (
        preflight,
      ) =>
        preflight.digest,

    revalidate:
      async (
        _context,
        reviewed,
      ) => ({
        outcome:
          options?.stale
            ? "STALE"
            : "MATCH",
        freshPreflight:
          {
            digest:
              options?.stale
                ? "B".repeat(
                    64,
                  )
                : reviewed
                    .reviewedPreflightDigest,
          },
        freshDigest:
          options?.stale
            ? "B".repeat(
                64,
              )
            : reviewed
                .reviewedPreflightDigest,
        ...(
          options?.stale
            ? {
                reason:
                  "TEST_STALE",
              }
            : {}
        ),
      } as Awaited<
        ReturnType<
          ProofContract<
            TestIntent,
            TestPreflight,
            TestExecution
          >["revalidate"]
        >
      >),

    execute:
      async () => {
        if (
          options?.unknown
        ) {
          throw new ProofEngineError(
            "UNKNOWN_AFTER_DISPATCH",
            "dispatch uncertain",
          );
        }

        return {
          applied:
            true as const,
        };
      },

    reconcileUnknown:
      async () => {
        const outcome =
          options?.reconcile ??
          "APPLIED";

        if (
          outcome ===
            "APPLIED"
        ) {
          return {
            outcome:
              "APPLIED" as const,
            execution: {
              applied:
                true as const,
            },
          };
        }

        return {
          outcome,
          reason:
            `TEST_${outcome}`,
        } as const;
      },

    verify:
      async () => [
        {
          requirementId:
            "config",
          plane:
            "CONFIGURATION_READBACK",
          applicability:
            "REQUIRED",
          status:
            options?.proofPass ===
              false
              ? "FAIL"
              : "PASS",
          sourceType:
            "IRIS",
          sourceReference:
            "test",
          observedAtUtc:
            "2026-09-20T15:00:10.000Z",
          expectedSummary:
            "Config matches.",
          observedSummary:
            "Observed.",
          provenance:
            "AUTHORITATIVE_IRIS",
          safeEvidenceDigest:
            null,
        },
      ],

    buildRecoveryPlan:
      () => ({
        recoveryActionType:
          "TEST_RECOVERY",
        automatic:
          false,
        summary:
          "Separate recovery.",
      }),
  };
}

function clock() {
  let tick =
    0;

  return () => {
    tick +=
      1;

    return new Date(
      Date.UTC(
        2026,
        8,
        20,
        15,
        0,
        tick,
      ),
    ).toISOString();
  };
}

function memoryStore(
  options?: {
    readonly corruptReadback?:
      boolean;
  },
) {
  let stored:
    ActionReceiptV2 |
    null =
      null;

  const persist =
    vi.fn(
      async (
        receipt:
          ActionReceiptV2,
      ) => {
        stored =
          receipt;
      },
    );

  const read =
    vi.fn(
      async () => {
        if (
          stored ===
            null
        ) {
          throw new Error(
            "missing",
          );
        }

        if (
          options
            ?.corruptReadback
        ) {
          return {
            ...stored,
            receiptId:
              stored.receiptId +
              "-corrupt",
          } as ActionReceiptV2;
        }

        return stored;
      },
    );

  return {
    persist,
    read,
  };
}

async function run(
  contract:
    ProofContract<
      TestIntent,
      TestPreflight,
      TestExecution
    >,
  store =
    memoryStore(),
) {
  return certifyVerifiedAction(
    {
      contract,
      intent: {
        target:
          "fixture",
      },
      actionId:
        "action:certification-001",
      receiptId:
        "receipt:certification-001",
      parentChangeSetId:
        null,
      logicalActor:
        "operator",
      irisRuntimeUser:
        "meridian.runtime",
    },
    {
      nowUtc:
        clock(),
      reviewPreflight:
        async (
          input,
        ) =>
          input.preflightDigest,
      receiptStore:
        store,
    },
  );
}

describe(
  "generic Verified Action certification runner",
  () => {
    it(
      "drives proof evidence through exact receipt readback to VERIFIED",
      async () => {
        const store =
          memoryStore();

        const result =
          await run(
            makeContract(),
            store,
          );

        expect(
          result.outcome,
        ).toBe(
          "VERIFIED",
        );

        expect(
          result.record.state,
        ).toBe(
          "VERIFIED",
        );

        expect(
          result.events.at(
            -1,
          )?.eventType,
        ).toBe(
          "ACTION_VERIFIED",
        );

        expect(
          result.receipt
            ?.schemaVersion,
        ).toBe(
          "meridian.action-receipt.v2",
        );

        expect(
          store.persist,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          store.read,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          result.automaticRetryAllowed,
        ).toBe(
          false,
        );
      },
    );

    it(
      "returns STALE before any Apply dispatch",
      async () => {
        const store =
          memoryStore();

        const result =
          await run(
            makeContract({
              stale:
                true,
            }),
            store,
          );

        expect(
          result.outcome,
        ).toBe(
          "STALE",
        );

        expect(
          result.record.state,
        ).toBe(
          "STALE",
        );

        expect(
          result.events.some(
            (
              event,
            ) =>
              event.eventType ===
              "APPLY_DISPATCH_STARTED",
          ),
        ).toBe(
          false,
        );

        expect(
          store.persist,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "reconciles UNKNOWN_AFTER_DISPATCH without retrying mutation",
      async () => {
        const result =
          await run(
            makeContract({
              unknown:
                true,
              reconcile:
                "APPLIED",
            }),
          );

        expect(
          result.outcome,
        ).toBe(
          "VERIFIED",
        );

        expect(
          result.events.map(
            (
              event,
            ) =>
              event.eventType,
          ),
        ).toEqual(
          expect.arrayContaining([
            "APPLY_OUTCOME_UNKNOWN",
            "RECONCILIATION_STARTED",
            "RECONCILIATION_APPLIED",
            "ACTION_VERIFIED",
          ]),
        );
      },
    );

    it(
      "keeps unresolved reconciliation UNKNOWN and never persists a receipt",
      async () => {
        const store =
          memoryStore();

        const result =
          await run(
            makeContract({
              unknown:
                true,
              reconcile:
                "STILL_UNKNOWN",
            }),
            store,
          );

        expect(
          result.outcome,
        ).toBe(
          "UNKNOWN_AFTER_DISPATCH",
        );

        expect(
          result.record.state,
        ).toBe(
          "UNKNOWN_AFTER_DISPATCH",
        );

        expect(
          store.persist,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "fails verification when a REQUIRED proof is not PASS",
      async () => {
        const store =
          memoryStore();

        const result =
          await run(
            makeContract({
              proofPass:
                false,
            }),
            store,
          );

        expect(
          result.outcome,
        ).toBe(
          "VERIFY_FAILED",
        );

        expect(
          result.record.state,
        ).toBe(
          "VERIFY_FAILED",
        );

        expect(
          store.persist,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "refuses VERIFIED when durable receipt readback is not exact",
      async () => {
        const result =
          await run(
            makeContract(),
            memoryStore({
              corruptReadback:
                true,
            }),
          );

        expect(
          result.outcome,
        ).toBe(
          "RECEIPT_WRITE_FAILED",
        );

        expect(
          result.record.state,
        ).toBe(
          "RECEIPT_WRITE_FAILED",
        );

        expect(
          result.events.some(
            (
              event,
            ) =>
              event.eventType ===
              "ACTION_VERIFIED",
          ),
        ).toBe(
          false,
        );
      },
    );
  },
);
