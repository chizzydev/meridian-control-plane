import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  ActionReceiptV2,
} from "../../proof/receipt";

import {
  O01_PROCESS_SUSPEND_CLOSURE_PLANES,
  O01_PROCESS_SUSPEND_CONTRACT_ID,
  O01_PROCESS_SUSPEND_PROOF_REQUIREMENTS,
  O01_PROCESS_SUSPEND_RECEIPT_ID,
  certifyO01ProcessSuspendAction,
  createO01ProcessSuspendProofContract,
  o01AuthorizedSuspendRequestDigest,
  o01PoststateMatches,
  o01PrestateMatches,
  o01ProcessSuspendIntent,
  reconcileUnknownO01ProcessSuspend,
  type O01ProcessStateReadback,
  type O01ProcessSuspendPreflight,
} from "./process-suspend";

const GENERATION =
  "00000000-0000-0000-0000-000000000001";

const PID =
  4242;

const PURPOSE =
  `meridian:process-witness:${GENERATION}`;

const START =
  "2026-09-22 17:00:00";

function process(
  state:
    string,
) {
  return Object.freeze({
    pid:
      PID,
    username:
      "meridian.demo.witness",
    namespace:
      "USER",
    startTimeUtc:
      START,
    purposeMarker:
      PURPOSE,
    canBeSuspended:
      !state.toUpperCase().startsWith(
        "SUSP",
      ),
    canBeTerminated:
      true,
    state,
  });
}

function preflight():
  O01ProcessSuspendPreflight {
  return Object.freeze({
    schemaVersion:
      "meridian.process-suspend-preflight.v1",
    expectedFixtureGeneration:
      GENERATION,
    expectedPid:
      PID,
    expectedPurposeMarker:
      PURPOSE,
    authorizedSuspendRequestDigest:
      o01AuthorizedSuspendRequestDigest(
        PID,
      ),
    directIdentity:
      Object.freeze({
        generation:
          GENERATION,
        pid:
          PID,
        username:
          "meridian.demo.witness",
        namespace:
          "USER",
        purposeMarker:
          PURPOSE,
      }),
    sysAdminProcess:
      process(
        "RUN",
      ),
    nativeProcess:
      process(
        "RUN",
      ),
    matchingNativeCount:
      1,
    officialReadOperation:
      "GET /v2/process",
    officialMutationOperation:
      "POST /v2/process/suspend",
    requiredAuthority:
      "%Admin_Operate:U",
    authorityRole:
      "MeridianProcessActionExecutor",
    authorityMode:
      "EXPLICIT_ESCALATION_ROLE",
  });
}

function state(
  value:
    string,
): O01ProcessStateReadback {
  return Object.freeze({
    schemaVersion:
      "meridian.process-suspend-state-readback.v1",
    expectedFixtureGeneration:
      GENERATION,
    expectedPid:
      PID,
    expectedPurposeMarker:
      PURPOSE,
    sysAdminProcess:
      process(
        value,
      ),
    nativeProcess:
      process(
        value,
      ),
    matchingNativeCount:
      1,
  });
}

describe(
  "O01 process suspend proof contract",
  () => {
    it(
      "freezes HIGH-risk reversible metadata and exact six-field target identity",
      () => {
        const contract =
          createO01ProcessSuspendProofContract({
            readFreshPreflight:
              async () =>
                preflight(),
            executeSuspend:
              async () =>
                Object.freeze({
                  status:
                    200 as const,
                  pid:
                    PID,
                  mutationRequestCount:
                    1 as const,
                  requestBodyPresent:
                    false as const,
                }),
            readFreshProcessState:
              async () =>
                state(
                  "SUSP",
                ),
          });

        expect(
          contract.contractId,
        ).toBe(
          O01_PROCESS_SUSPEND_CONTRACT_ID,
        );

        expect(
          contract.actionType,
        ).toBe(
          "PROCESS_SUSPEND",
        );

        expect(
          contract.domain,
        ).toBe(
          "SYSTEM_PROCESSES",
        );

        expect(
          contract.risk,
        ).toBe(
          "HIGH",
        );

        expect(
          contract.reversibility,
        ).toBe(
          "REVERSIBLE",
        );

        expect(
          contract.requiredAuthority,
        ).toEqual([
          {
            resource:
              "%Admin_Operate",
            permission:
              "U",
            standing:
              false,
            escalationOnly:
              true,
          },
        ]);

        expect(
          contract.target(
            o01ProcessSuspendIntent(
              GENERATION,
              PID,
            ),
          ),
        ).toMatchObject({
          kind:
            "PROCESS",
          canonicalId:
            `process:meridian-live-demo-v1:${GENERATION}`,
          fixtureId:
            "meridian-live-demo-v1",
          generation:
            GENERATION,
        });

        expect(
          contract.buildRecoveryPlan(
            {
              schemaVersion:
                "meridian.process-suspend-execution.v1",
              state:
                "APPLIED",
              actionId:
                "O01_PROCESS_SUSPEND",
              generation:
                GENERATION,
              pid:
                PID,
              purposeMarker:
                PURPOSE,
              startTimeUtc:
                START,
              suspendStatus:
                200,
              httpSuspendResponseVerified:
                true,
              mutationRequestCount:
                1,
              exactIdentityPreserved:
                true,
              sysAdminSuspendedObserved:
                true,
              nativeSuspendedObserved:
                true,
              resolutionSource:
                "DIRECT_EXECUTION",
            },
            [],
          ),
        ).toMatchObject({
          recoveryActionType:
            "PROCESS_RESUME",
          automatic:
            false,
        });
      },
    );

    it(
      "accepts only the exact reviewed six-field prestate and exact dual SUSP poststate",
      () => {
        const before =
          preflight();

        expect(
          o01PrestateMatches(
            before,
          ),
        ).toBe(
          true,
        );

        expect(
          o01PoststateMatches(
            state(
              "SUSP",
            ),
            before,
          ),
        ).toBe(
          true,
        );

        expect(
          o01PrestateMatches({
            ...before,
            directIdentity: {
              ...before.directIdentity,
              pid:
                PID + 1,
            },
          }),
        ).toBe(
          false,
        );

        expect(
          o01PoststateMatches(
            {
              ...state(
                "SUSP",
              ),
              nativeProcess: {
                ...process(
                  "SUSP",
                ),
                startTimeUtc:
                  "2026-09-22 17:00:01",
              },
            },
            before,
          ),
        ).toBe(
          false,
        );

        expect(
          o01PoststateMatches(
            {
              ...state(
                "SUSP",
              ),
              sysAdminProcess: {
                ...process(
                  "SUSP",
                ),
                purposeMarker:
                  "meridian:process-witness:wrong",
              },
            },
            before,
          ),
        ).toBe(
          false,
        );
      },
    );

    it(
      "classifies reconciliation applied, not-applied, or still-unknown without retry",
      () => {
        const before =
          preflight();

        expect(
          reconcileUnknownO01ProcessSuspend(
            state(
              "SUSP",
            ),
            before,
          ).outcome,
        ).toBe(
          "APPLIED",
        );

        expect(
          reconcileUnknownO01ProcessSuspend(
            state(
              "RUN",
            ),
            before,
          ).outcome,
        ).toBe(
          "NOT_APPLIED",
        );

        expect(
          reconcileUnknownO01ProcessSuspend(
            {
              ...state(
                "SUSP",
              ),
              expectedPid:
                PID + 1,
            },
            before,
          ).outcome,
        ).toBe(
          "STILL_UNKNOWN",
        );
      },
    );

    it(
      "freezes PROCESS_STATE plus persistent-receipt closure semantics",
      () => {
        expect(
          O01_PROCESS_SUSPEND_CLOSURE_PLANES,
        ).toEqual([
          "PROCESS_STATE",
          "PERSISTENT_RECEIPT",
        ]);

        expect(
          O01_PROCESS_SUSPEND_PROOF_REQUIREMENTS.map(
            (
              requirement,
            ) =>
              requirement.plane,
          ),
        ).toEqual([
          "PROCESS_STATE",
          "PROCESS_STATE",
        ]);

        expect(
          O01_PROCESS_SUSPEND_RECEIPT_ID,
        ).toBe(
          "meridian-o01-process-suspend-r6-a-001",
        );
      },
    );

    it(
      "certifies through the generic runner only after receipt persist and readback",
      async () => {
        const before =
          preflight();

        let persisted:
          ActionReceiptV2 |
          null =
          null;

        let tick =
          0;

        const result =
          await certifyO01ProcessSuspendAction(
            {
              intent:
                o01ProcessSuspendIntent(
                  GENERATION,
                  PID,
                ),
              actionId:
                "o01-process-suspend-r6-a-001",
              receiptId:
                O01_PROCESS_SUSPEND_RECEIPT_ID,
              logicalActor:
                "operator",
              irisRuntimeUser:
                "meridian.runtime",
            },
            {
              contract: {
                readFreshPreflight:
                  async () =>
                    before,
                executeSuspend:
                  async () =>
                    Object.freeze({
                      status:
                        200 as const,
                      pid:
                        PID,
                      mutationRequestCount:
                        1 as const,
                      requestBodyPresent:
                        false as const,
                    }),
                readFreshProcessState:
                  async () =>
                    state(
                      "SUSP",
                    ),
              },
              certification: {
                nowUtc:
                  () => {
                    const value =
                      new Date(
                        Date.UTC(
                          2026,
                          8,
                          22,
                          17,
                          0,
                          tick,
                        ),
                      ).toISOString();

                    tick +=
                      1;

                    return value;
                  },
                reviewPreflight:
                  async (
                    input,
                  ) =>
                    input.preflightDigest,
                receiptStore: {
                  async persist(
                    receipt,
                  ) {
                    persisted =
                      receipt;
                  },
                  async read(
                    receiptId,
                  ) {
                    if (
                      persisted ===
                        null ||
                      persisted.receiptId !==
                        receiptId
                    ) {
                      throw new Error(
                        "receipt not persisted",
                      );
                    }

                    return persisted;
                  },
                },
              },
            },
          );

        expect(
          result.outcome,
        ).toBe(
          "VERIFIED",
        );

        expect(
          result.automaticRetryAllowed,
        ).toBe(
          false,
        );

        expect(
          result.proofResults,
        ).toHaveLength(
          2,
        );

        expect(
          result.proofResults.every(
            (
              proof,
            ) =>
              proof.plane ===
                "PROCESS_STATE" &&
              proof.status ===
                "PASS",
          ),
        ).toBe(
          true,
        );

        expect(
          result.receipt?.receiptId,
        ).toBe(
          O01_PROCESS_SUSPEND_RECEIPT_ID,
        );

        const persistedReceipt =
          persisted as
            ActionReceiptV2 | null;

        expect(
          persistedReceipt?.receiptId,
        ).toBe(
          O01_PROCESS_SUSPEND_RECEIPT_ID,
        );
      },
    );
  },
);
