import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  ActionReceiptV2,
} from "../../proof/receipt";

import {
  O02_PROCESS_RESUME_CLOSURE_PLANES,
  O02_PROCESS_RESUME_CONTRACT_ID,
  O02_PROCESS_RESUME_PROOF_REQUIREMENTS,
  O02_PROCESS_RESUME_RECEIPT_ID,
  certifyO02ProcessResumeAction,
  createO02ProcessResumeProofContract,
  o02AuthorizedResumeRequestDigest,
  o02PoststateMatches,
  o02PrestateMatches,
  o02ProcessResumeIntent,
  reconcileUnknownO02ProcessResume,
  type O02ProcessResumePreflight,
  type O02ProcessStateReadback,
} from "./process-resume";

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
  const suspended =
    state.toUpperCase().startsWith(
      "SUSP",
    );

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
      !suspended,
    canBeTerminated:
      true,
    state,
  });
}

function preflight():
  O02ProcessResumePreflight {
  return Object.freeze({
    schemaVersion:
      "meridian.process-resume-preflight.v1",
    expectedFixtureGeneration:
      GENERATION,
    expectedPid:
      PID,
    expectedPurposeMarker:
      PURPOSE,
    authorizedResumeRequestDigest:
      o02AuthorizedResumeRequestDigest(
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
        "SUSP",
      ),
    nativeProcess:
      process(
        "SUSP",
      ),
    matchingNativeCount:
      1,
    officialReadOperation:
      "GET /v2/process",
    officialMutationOperation:
      "POST /v2/process/resume",
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
): O02ProcessStateReadback {
  return Object.freeze({
    schemaVersion:
      "meridian.process-resume-state-readback.v1",
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
  "O02 process resume proof contract",
  () => {
    it(
      "freezes HIGH-risk reversible metadata and exact six-field target identity",
      () => {
        const contract =
          createO02ProcessResumeProofContract({
            readFreshPreflight:
              async () =>
                preflight(),
            executeResume:
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
                  "RUN",
                ),
          });

        expect(
          contract.contractId,
        ).toBe(
          O02_PROCESS_RESUME_CONTRACT_ID,
        );

        expect(
          contract.actionType,
        ).toBe(
          "PROCESS_RESUME",
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
            o02ProcessResumeIntent(
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
                "meridian.process-resume-execution.v1",
              state:
                "APPLIED",
              actionId:
                "O02_PROCESS_RESUME",
              generation:
                GENERATION,
              pid:
                PID,
              purposeMarker:
                PURPOSE,
              startTimeUtc:
                START,
              resumeStatus:
                200,
              httpResumeResponseVerified:
                true,
              mutationRequestCount:
                1,
              exactIdentityPreserved:
                true,
              sysAdminRunningObserved:
                true,
              nativeRunningObserved:
                true,
              resolutionSource:
                "DIRECT_EXECUTION",
            },
            [],
          ),
        ).toMatchObject({
          recoveryActionType:
            "PROCESS_SUSPEND",
          automatic:
            false,
        });
      },
    );

    it(
      "accepts only the exact dual SUSP prestate and exact dual RUN poststate",
      () => {
        const before =
          preflight();

        expect(
          o02PrestateMatches(
            before,
          ),
        ).toBe(
          true,
        );

        expect(
          o02PoststateMatches(
            state(
              "RUN",
            ),
            before,
          ),
        ).toBe(
          true,
        );

        expect(
          o02PrestateMatches({
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
          o02PrestateMatches({
            ...before,
            sysAdminProcess: {
              ...process(
                "SUSP",
              ),
              canBeSuspended:
                true,
            },
          }),
        ).toBe(
          false,
        );

        expect(
          o02PoststateMatches(
            {
              ...state(
                "RUN",
              ),
              nativeProcess: {
                ...process(
                  "RUN",
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
          o02PoststateMatches(
            {
              ...state(
                "RUN",
              ),
              sysAdminProcess: {
                ...process(
                  "RUN",
                ),
                canBeSuspended:
                  false,
              },
            },
            before,
          ),
        ).toBe(
          false,
        );

        expect(
          o02PoststateMatches(
            {
              ...state(
                "RUN",
              ),
              sysAdminProcess: {
                ...process(
                  "RUN",
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
      "classifies reconciliation RUN applied, SUSP not-applied, or identity drift still-unknown",
      () => {
        const before =
          preflight();

        expect(
          reconcileUnknownO02ProcessResume(
            state(
              "RUN",
            ),
            before,
          ).outcome,
        ).toBe(
          "APPLIED",
        );

        expect(
          reconcileUnknownO02ProcessResume(
            state(
              "SUSP",
            ),
            before,
          ).outcome,
        ).toBe(
          "NOT_APPLIED",
        );

        expect(
          reconcileUnknownO02ProcessResume(
            {
              ...state(
                "RUN",
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
          O02_PROCESS_RESUME_CLOSURE_PLANES,
        ).toEqual([
          "PROCESS_STATE",
          "PERSISTENT_RECEIPT",
        ]);

        expect(
          O02_PROCESS_RESUME_PROOF_REQUIREMENTS.map(
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
          O02_PROCESS_RESUME_RECEIPT_ID,
        ).toBe(
          "meridian-o02-process-resume-r7-a-001",
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
          await certifyO02ProcessResumeAction(
            {
              intent:
                o02ProcessResumeIntent(
                  GENERATION,
                  PID,
                ),
              actionId:
                "o02-process-resume-r7-a-001",
              receiptId:
                O02_PROCESS_RESUME_RECEIPT_ID,
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
                executeResume:
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
                      "RUN",
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
          O02_PROCESS_RESUME_RECEIPT_ID,
        );

        const persistedReceipt =
          persisted as
            ActionReceiptV2 | null;

        expect(
          persistedReceipt?.receiptId,
        ).toBe(
          O02_PROCESS_RESUME_RECEIPT_ID,
        );
      },
    );
  },
);
