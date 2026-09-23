import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  ActionReceiptV2,
} from "../../proof/receipt";

import {
  O03_PROCESS_TERMINATE_CLOSURE_PLANES,
  O03_PROCESS_TERMINATE_CONTRACT_ID,
  O03_PROCESS_TERMINATE_PROOF_REQUIREMENTS,
  O03_PROCESS_TERMINATE_RECEIPT_ID,
  certifyO03ProcessTerminateAction,
  createO03ProcessTerminateProofContract,
  o03AuthorizedTerminateRequestDigest,
  o03PoststateMatches,
  o03PrestateMatches,
  o03ProcessTerminateIntent,
  reconcileUnknownO03ProcessTerminate,
  type O03ProcessStateReadback,
  type O03ProcessTerminatePreflight,
} from "./process-terminate";

const GENERATION =
  "00000000-0000-0000-0000-000000000001";

const PID =
  4242;

const PURPOSE =
  `meridian:process-witness:${GENERATION}`;

const START =
  "2026-09-22 17:00:00";

function process(
  overrides: Partial<{
    pid: number;
    username: string;
    namespace: string;
    startTimeUtc: string;
    purposeMarker: string;
    canBeSuspended: boolean;
    canBeTerminated: boolean;
    state: string;
  }> = {},
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
      true,
    canBeTerminated:
      true,
    state:
      "RUN",
    ...overrides,
  });
}

function preflight():
  O03ProcessTerminatePreflight {
  return Object.freeze({
    schemaVersion:
      "meridian.process-terminate-preflight.v1",
    expectedFixtureGeneration:
      GENERATION,
    expectedPid:
      PID,
    expectedPurposeMarker:
      PURPOSE,
    authorizedTerminateRequestDigest:
      o03AuthorizedTerminateRequestDigest(
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
      process(),
    nativeProcess:
      process(),
    matchingNativeCount:
      1,
    officialReadOperation:
      "GET /v2/process",
    officialMutationOperation:
      "POST /v2/process/terminate",
    requiredAuthority:
      "%Admin_Operate:U",
    authorityRole:
      "MeridianProcessActionExecutor",
    authorityMode:
      "EXPLICIT_ESCALATION_ROLE",
  });
}

function absentState():
  O03ProcessStateReadback {
  return Object.freeze({
    schemaVersion:
      "meridian.process-terminate-state-readback.v1",
    expectedFixtureGeneration:
      GENERATION,
    expectedPid:
      PID,
    expectedPurposeMarker:
      PURPOSE,
    sysAdminProcess:
      null,
    nativeProcess:
      null,
    matchingNativeCount:
      0,
  });
}

function runningState():
  O03ProcessStateReadback {
  return Object.freeze({
    schemaVersion:
      "meridian.process-terminate-state-readback.v1",
    expectedFixtureGeneration:
      GENERATION,
    expectedPid:
      PID,
    expectedPurposeMarker:
      PURPOSE,
    sysAdminProcess:
      process(),
    nativeProcess:
      process(),
    matchingNativeCount:
      1,
  });
}

describe(
  "O03 process terminate proof contract",
  () => {
    it(
      "freezes HIGH-risk irreversible metadata, exact target identity, and no recovery action",
      () => {
        const contract =
          createO03ProcessTerminateProofContract({
            readFreshPreflight:
              async () =>
                preflight(),
            executeTerminate:
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
                absentState(),
          });

        expect(
          contract.contractId,
        ).toBe(
          O03_PROCESS_TERMINATE_CONTRACT_ID,
        );

        expect(
          contract.actionType,
        ).toBe(
          "PROCESS_TERMINATE",
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
          "IRREVERSIBLE",
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
            o03ProcessTerminateIntent(
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
                "meridian.process-terminate-execution.v1",
              state:
                "APPLIED",
              actionId:
                "O03_PROCESS_TERMINATE",
              generation:
                GENERATION,
              pid:
                PID,
              purposeMarker:
                PURPOSE,
              startTimeUtc:
                START,
              terminateStatus:
                200,
              httpTerminateResponseVerified:
                true,
              mutationRequestCount:
                1,
              exactReviewedIdentityAbsent:
                true,
              sysAdminAbsenceObserved:
                true,
              nativeAbsenceObserved:
                true,
              resolutionSource:
                "DIRECT_EXECUTION",
            },
            [],
          ),
        ).toMatchObject({
          recoveryActionType:
            null,
          automatic:
            false,
        });
      },
    );

    it(
      "accepts only the exact dual RUN prestate and exact dual absence poststate",
      () => {
        const before =
          preflight();

        expect(
          o03PrestateMatches(
            before,
          ),
        ).toBe(
          true,
        );

        expect(
          o03PoststateMatches(
            absentState(),
            before,
          ),
        ).toBe(
          true,
        );

        expect(
          o03PrestateMatches({
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
          o03PrestateMatches({
            ...before,
            sysAdminProcess: {
              ...process(),
              canBeTerminated:
                false,
            },
          }),
        ).toBe(
          false,
        );

        expect(
          o03PrestateMatches({
            ...before,
            nativeProcess: {
              ...process(),
              startTimeUtc:
                "2026-09-22 17:00:01",
            },
          }),
        ).toBe(
          false,
        );

        expect(
          o03PoststateMatches(
            runningState(),
            before,
          ),
        ).toBe(
          false,
        );

        expect(
          o03PoststateMatches(
            {
              ...absentState(),
              sysAdminProcess:
                process({
                  purposeMarker:
                    "meridian:process-witness:replacement",
                  startTimeUtc:
                    "2026-09-22 17:00:01",
                }),
            },
            before,
          ),
        ).toBe(
          false,
        );
      },
    );

    it(
      "classifies dual absence applied, exact RUN not-applied, and PID reuse or disagreement still-unknown",
      () => {
        const before =
          preflight();

        expect(
          reconcileUnknownO03ProcessTerminate(
            absentState(),
            before,
          ).outcome,
        ).toBe(
          "APPLIED",
        );

        expect(
          reconcileUnknownO03ProcessTerminate(
            runningState(),
            before,
          ).outcome,
        ).toBe(
          "NOT_APPLIED",
        );

        const replacement =
          process({
            startTimeUtc:
              "2026-09-22 17:00:01",
            purposeMarker:
              "meridian:process-witness:replacement",
          });

        expect(
          reconcileUnknownO03ProcessTerminate(
            {
              ...runningState(),
              sysAdminProcess:
                replacement,
              nativeProcess:
                replacement,
            },
            before,
          ).outcome,
        ).toBe(
          "STILL_UNKNOWN",
        );

        expect(
          reconcileUnknownO03ProcessTerminate(
            {
              ...absentState(),
              nativeProcess:
                process(),
              matchingNativeCount:
                1,
            },
            before,
          ).outcome,
        ).toBe(
          "STILL_UNKNOWN",
        );
      },
    );

    it(
      "freezes process-absence proof planes plus persistent-receipt closure semantics",
      () => {
        expect(
          O03_PROCESS_TERMINATE_CLOSURE_PLANES,
        ).toEqual([
          "PROCESS_STATE",
          "PERSISTENT_RECEIPT",
        ]);

        expect(
          O03_PROCESS_TERMINATE_PROOF_REQUIREMENTS.map(
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
          O03_PROCESS_TERMINATE_RECEIPT_ID,
        ).toBe(
          "meridian-o03-process-terminate-r8-a-001",
        );
      },
    );

    it(
      "certifies only after exact absence proof and durable receipt persist/readback with irreversible recovery metadata",
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
          await certifyO03ProcessTerminateAction(
            {
              intent:
                o03ProcessTerminateIntent(
                  GENERATION,
                  PID,
                ),
              actionId:
                "o03-process-terminate-r8-a-001",
              receiptId:
                O03_PROCESS_TERMINATE_RECEIPT_ID,
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
                executeTerminate:
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
                    absentState(),
              },
              certification: {
                nowUtc:
                  () => {
                    const value =
                      new Date(
                        Date.UTC(
                          2026,
                          8,
                          23,
                          8,
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
          O03_PROCESS_TERMINATE_RECEIPT_ID,
        );

        expect(
          result.receipt?.recovery,
        ).toEqual({
          class:
            "IRREVERSIBLE",
          available:
            false,
          recoveryActionType:
            null,
        });

        const persistedReceipt =
          persisted as
            ActionReceiptV2 | null;

        expect(
          persistedReceipt?.receiptId,
        ).toBe(
          O03_PROCESS_TERMINATE_RECEIPT_ID,
        );

        expect(
          persistedReceipt?.recovery,
        ).toEqual({
          class:
            "IRREVERSIBLE",
          available:
            false,
          recoveryActionType:
            null,
        });
      },
    );
  },
);
