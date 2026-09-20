import {
  describe,
  expect,
  it,
} from "vitest";

import {
  closeVerifiedAction,
  completeVerifiedActionEvidence,
  createVerifiedActionRecord,
  recordActionReceiptPersisted,
  recordActionReceiptReadbackVerified,
  startActionReceiptPersistence,
  transitionVerifiedActionRecord,
  verifyActionHistoryMatchesRecord,
  type VerifiedActionMutation,
} from "./action";

import {
  digestCanonicalJson,
} from "./digest";

import type {
  ProofRequirement,
  ProofResult,
} from "./evidence";

import {
  buildActionReceiptV2,
} from "./receipt";

import type {
  ProofContractDescriptor,
} from "./registry";

const DESCRIPTOR:
  ProofContractDescriptor = {
    schemaVersion:
      "meridian.proof-contract.v2",

    contractId:
      "meridian.permission.user-remove-role",

    contractVersion:
      1,

    actionType:
      "USER_REMOVE_ROLE",

    domain:
      "PERMISSIONS",

    risk:
      "MEDIUM",

    reversibility:
      "REVERSIBLE",

    requiredProofCount:
      1,

    requiredAuthorityCount:
      1,
  };

const TARGET = {
  kind:
    "USER",

  canonicalId:
    "user:maya.patel",

  displayName:
    "Maya Patel",

  fixtureId:
    "meridian-maya-fixture",

  generation:
    "generation-001",
};

const REQUIREMENT:
  ProofRequirement = {
    requirementId:
      "config-readback",

    plane:
      "CONFIGURATION_READBACK",

    applicability:
      "REQUIRED",

    description:
      "Configured role state is authoritatively re-read.",

    source:
      "IRIS SysAdmin API",
  };

const RESULT:
  ProofResult = {
    requirementId:
      "config-readback",

    plane:
      "CONFIGURATION_READBACK",

    applicability:
      "REQUIRED",

    status:
      "PASS",

    sourceType:
      "IRIS SysAdmin API",

    sourceReference:
      "/api/admin/v2/security/user",

    observedAtUtc:
      "2026-09-20T14:00:08.000Z",

    expectedSummary:
      "Role absent.",

    observedSummary:
      "Role absent.",

    provenance:
      "AUTHORITATIVE_IRIS",

    safeEvidenceDigest:
      "F".repeat(
        64,
      ),
  };

function advance(
  mutation:
    VerifiedActionMutation,
  eventType:
    Parameters<
      typeof transitionVerifiedActionRecord
    >[1]["eventType"],
  toState:
    Parameters<
      typeof transitionVerifiedActionRecord
    >[1]["toState"],
  time:
    string,
): VerifiedActionMutation {
  return transitionVerifiedActionRecord(
    mutation.record,
    {
      eventType,
      toState,
      occurredAtUtc:
        time,
      detail:
        {},
    },
  );
}

function reachVerifying() {
  const events = [];

  let mutation =
    createVerifiedActionRecord({
      actionId:
        "action:maya-remove-001",

      contract:
        DESCRIPTOR,

      target:
        TARGET,

      occurredAtUtc:
        "2026-09-20T14:00:00.000Z",
    });

  events.push(
    mutation.event,
  );

  const steps = [
    [
      "PREFLIGHT_STARTED",
      "PREFLIGHTING",
      "2026-09-20T14:00:01.000Z",
    ],
    [
      "PREFLIGHT_COMPLETED",
      "PREFLIGHTED",
      "2026-09-20T14:00:02.000Z",
    ],
    [
      "REVIEW_ACCEPTED",
      "APPROVED",
      "2026-09-20T14:00:03.000Z",
    ],
    [
      "REVALIDATION_STARTED",
      "REVALIDATING",
      "2026-09-20T14:00:04.000Z",
    ],
    [
      "REVALIDATION_MATCHED",
      "READY",
      "2026-09-20T14:00:05.000Z",
    ],
    [
      "APPLY_DISPATCH_STARTED",
      "APPLYING",
      "2026-09-20T14:00:06.000Z",
    ],
    [
      "APPLY_RESPONSE_ACCEPTED",
      "APPLIED",
      "2026-09-20T14:00:07.000Z",
    ],
    [
      "VERIFY_STARTED",
      "VERIFYING",
      "2026-09-20T14:00:08.000Z",
    ],
  ] as const;

  for (
    const [
      eventType,
      state,
      time,
    ]
    of steps
  ) {
    mutation =
      advance(
        mutation,
        eventType,
        state,
        time,
      );

    events.push(
      mutation.event,
    );
  }

  return {
    mutation,
    events,
  };
}

describe(
  "Verified Action engine closure",
  () => {
    it(
      "closes only after required proof, durable persistence, and exact readback",
      () => {
        const verifying =
          reachVerifying();

        let mutation =
          completeVerifiedActionEvidence(
            verifying.mutation.record,
            [
              REQUIREMENT,
            ],
            [
              RESULT,
            ],
            "2026-09-20T14:00:09.000Z",
          );

        const events = [
          ...verifying.events,
          mutation.event,
        ];

        const receipt =
          buildActionReceiptV2({
            receiptId:
              "receipt:maya-remove-001",

            actionId:
              mutation.record.actionId,

            parentChangeSetId:
              null,

            actionType:
              DESCRIPTOR.actionType,

            contractId:
              DESCRIPTOR.contractId,

            contractVersion:
              DESCRIPTOR.contractVersion,

            domain:
              DESCRIPTOR.domain,

            risk:
              DESCRIPTOR.risk,

            reversibility:
              DESCRIPTOR.reversibility,

            target:
              TARGET,

            actor: {
              logicalActor:
                "judge",

              irisRuntimeUser:
                "meridian.runtime",
            },

            authority: [
              {
                resource:
                  "%Admin_Secure",

                permission:
                  "U",

                standing:
                  false,

                escalationOnly:
                  true,
              },
            ],

            intentDigest:
              "A".repeat(
                64,
              ),

            reviewedPreflightDigest:
              "B".repeat(
                64,
              ),

            freshRevalidationDigest:
              "B".repeat(
                64,
              ),

            executionDigest:
              "C".repeat(
                64,
              ),

            evidenceDigest:
              digestCanonicalJson([
                RESULT,
              ]),

            proofResults: [
              RESULT,
            ],

            lifecycle: {
              createdAtUtc:
                "2026-09-20T14:00:00.000Z",

              applyStartedAtUtc:
                "2026-09-20T14:00:06.000Z",

              applyCompletedAtUtc:
                "2026-09-20T14:00:07.000Z",

              evidenceCompletedAtUtc:
                "2026-09-20T14:00:09.000Z",
            },

            recovery: {
              class:
                "REVERSIBLE",

              available:
                true,

              recoveryActionType:
                "USER_ADD_ROLE",
            },

            terminalEventHash:
              mutation.record.lastEventHash,
          });

        mutation =
          startActionReceiptPersistence(
            mutation.record,
            receipt,
            "2026-09-20T14:00:10.000Z",
          );

        events.push(
          mutation.event,
        );

        mutation =
          recordActionReceiptPersisted(
            mutation.record,
            receipt,
            "2026-09-20T14:00:11.000Z",
          );

        events.push(
          mutation.event,
        );

        mutation =
          recordActionReceiptReadbackVerified(
            mutation.record,
            receipt,
            JSON.parse(
              JSON.stringify(
                receipt,
              ),
            ),
            "2026-09-20T14:00:12.000Z",
          );

        events.push(
          mutation.event,
        );

        mutation =
          closeVerifiedAction(
            mutation.record,
            events,
            "2026-09-20T14:00:13.000Z",
          );

        events.push(
          mutation.event,
        );

        expect(
          mutation.record.state,
        ).toBe(
          "VERIFIED",
        );

        expect(
          mutation.record.receiptPersisted,
        ).toBe(
          true,
        );

        expect(
          mutation.record.receiptReadbackVerified,
        ).toBe(
          true,
        );

        expect(
          () =>
            verifyActionHistoryMatchesRecord(
              mutation.record,
              events,
            ),
        ).not.toThrow();
      },
    );

    it(
      "rejects evidence completion when a required proof is not PASS",
      () => {
        const verifying =
          reachVerifying();

        expect(
          () =>
            completeVerifiedActionEvidence(
              verifying.mutation.record,
              [
                REQUIREMENT,
              ],
              [
                {
                  ...RESULT,
                  status:
                    "FAIL",
                },
              ],
              "2026-09-20T14:00:09.000Z",
            ),
        ).toThrow(
          "Required evidence is incomplete",
        );
      },
    );

    it(
      "prevents generic callers from bypassing protected closure events",
      () => {
        const verifying =
          reachVerifying();

        expect(
          () =>
            transitionVerifiedActionRecord(
              verifying.mutation.record,
              {
                eventType:
                  "EVIDENCE_COMPLETE",

                toState:
                  "EVIDENCE_COMPLETE",

                occurredAtUtc:
                  "2026-09-20T14:00:09.000Z",

                detail:
                  {},
              },
            ),
        ).toThrow(
          "protected",
        );
      },
    );

    it(
      "cannot become VERIFIED before receipt readback",
      () => {
        const verifying =
          reachVerifying();

        const complete =
          completeVerifiedActionEvidence(
            verifying.mutation.record,
            [
              REQUIREMENT,
            ],
            [
              RESULT,
            ],
            "2026-09-20T14:00:09.000Z",
          );

        expect(
          () =>
            closeVerifiedAction(
              complete.record,
              [
                ...verifying.events,
                complete.event,
              ],
              "2026-09-20T14:00:10.000Z",
            ),
        ).toThrow(
          "RECEIPT_READBACK_VERIFIED",
        );
      },
    );

    it(
      "rejects a receipt bound to the wrong evidence terminal hash",
      () => {
        const verifying =
          reachVerifying();

        const complete =
          completeVerifiedActionEvidence(
            verifying.mutation.record,
            [
              REQUIREMENT,
            ],
            [
              RESULT,
            ],
            "2026-09-20T14:00:09.000Z",
          );

        const receipt =
          buildActionReceiptV2({
            receiptId:
              "receipt:wrong-prefix-001",

            actionId:
              complete.record.actionId,

            parentChangeSetId:
              null,

            actionType:
              DESCRIPTOR.actionType,

            contractId:
              DESCRIPTOR.contractId,

            contractVersion:
              DESCRIPTOR.contractVersion,

            domain:
              DESCRIPTOR.domain,

            risk:
              DESCRIPTOR.risk,

            reversibility:
              DESCRIPTOR.reversibility,

            target:
              TARGET,

            actor: {
              logicalActor:
                "judge",

              irisRuntimeUser:
                "meridian.runtime",
            },

            authority:
              [],

            intentDigest:
              "A".repeat(
                64,
              ),

            reviewedPreflightDigest:
              "B".repeat(
                64,
              ),

            freshRevalidationDigest:
              "B".repeat(
                64,
              ),

            executionDigest:
              "C".repeat(
                64,
              ),

            evidenceDigest:
              digestCanonicalJson([
                RESULT,
              ]),

            proofResults: [
              RESULT,
            ],

            lifecycle: {
              createdAtUtc:
                "2026-09-20T14:00:00.000Z",

              applyStartedAtUtc:
                "2026-09-20T14:00:06.000Z",

              applyCompletedAtUtc:
                "2026-09-20T14:00:07.000Z",

              evidenceCompletedAtUtc:
                "2026-09-20T14:00:09.000Z",
            },

            recovery: {
              class:
                "REVERSIBLE",

              available:
                true,

              recoveryActionType:
                "USER_ADD_ROLE",
            },

            terminalEventHash:
              "E".repeat(
                64,
              ),
          });

        expect(
          () =>
            startActionReceiptPersistence(
              complete.record,
              receipt,
              "2026-09-20T14:00:10.000Z",
            ),
        ).toThrow(
          "evidence-complete event prefix",
        );
      },
    );

    it(
      "detects a record that is no longer explained by its history",
      () => {
        const verifying =
          reachVerifying();

        const forged = {
          ...verifying.mutation.record,

          version:
            verifying.mutation.record.version +
            1,
        };

        expect(
          () =>
            verifyActionHistoryMatchesRecord(
              forged,
              verifying.events,
            ),
        ).toThrow(
          "not explained by its event chain",
        );
      },
    );
  },
);
