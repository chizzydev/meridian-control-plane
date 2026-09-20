import {
  describe,
  expect,
  it,
} from "vitest";

import {
  digestCanonicalJson,
} from "./digest";

import type {
  ProofResult,
} from "./evidence";

import {
  assertActionReceiptV2,
  assertExactReceiptReadback,
  buildActionReceiptV2,
  type ActionReceiptUnsigned,
} from "./receipt";

const PROOF_RESULT:
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
      "2026-09-20T14:00:03.000Z",

    expectedSummary:
      "Role is absent.",

    observedSummary:
      "Role is absent.",

    provenance:
      "AUTHORITATIVE_IRIS",

    safeEvidenceDigest:
      "F".repeat(
        64,
      ),
  };

function receiptInput(
  overrides:
    Partial<ActionReceiptUnsigned> = {},
): ActionReceiptUnsigned {
  const proofResults = [
    PROOF_RESULT,
  ];

  return {
    receiptId:
      "receipt:maya-remove-001",

    actionId:
      "action:maya-remove-001",

    parentChangeSetId:
      null,

    actionType:
      "USER_REMOVE_ROLE",

    contractId:
      "meridian.permission.user-remove-role",

    contractVersion:
      1,

    domain:
      "PERMISSIONS",

    risk:
      "MEDIUM",

    reversibility:
      "REVERSIBLE",

    target: {
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
    },

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
      digestCanonicalJson(
        proofResults,
      ),

    proofResults,

    lifecycle: {
      createdAtUtc:
        "2026-09-20T14:00:00.000Z",

      applyStartedAtUtc:
        "2026-09-20T14:00:01.000Z",

      applyCompletedAtUtc:
        "2026-09-20T14:00:02.000Z",

      evidenceCompletedAtUtc:
        "2026-09-20T14:00:03.000Z",
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
      "D".repeat(
        64,
      ),

    ...overrides,
  };
}

describe(
  "Action Receipt V2",
  () => {
    it(
      "freezes a canonical receipt hash and validates it",
      () => {
        const receipt =
          buildActionReceiptV2(
            receiptInput(),
          );

        expect(
          receipt.schemaVersion,
        ).toBe(
          "meridian.action-receipt.v2",
        );

        expect(
          receipt.receiptSha256,
        ).toMatch(
          /^[A-F0-9]{64}$/,
        );

        expect(
          () =>
            assertActionReceiptV2(
              receipt,
            ),
        ).not.toThrow();
      },
    );

    it(
      "accepts byte-equivalent canonical durable readback",
      () => {
        const receipt =
          buildActionReceiptV2(
            receiptInput(),
          );

        const readback =
          JSON.parse(
            JSON.stringify(
              receipt,
            ),
          );

        expect(
          () =>
            assertExactReceiptReadback(
              receipt,
              readback,
            ),
        ).not.toThrow();
      },
    );

    it(
      "rejects a receipt whose proof-results digest is inconsistent",
      () => {
        expect(
          () =>
            buildActionReceiptV2(
              receiptInput({
                evidenceDigest:
                  "E".repeat(
                    64,
                  ),
              }),
            ),
        ).toThrow(
          "evidence digest",
        );
      },
    );

    it(
      "rejects non-monotonic receipt lifecycle timestamps",
      () => {
        expect(
          () =>
            buildActionReceiptV2(
              receiptInput({
                lifecycle: {
                  createdAtUtc:
                    "2026-09-20T14:00:00.000Z",

                  applyStartedAtUtc:
                    "2026-09-20T14:00:04.000Z",

                  applyCompletedAtUtc:
                    "2026-09-20T14:00:02.000Z",

                  evidenceCompletedAtUtc:
                    "2026-09-20T14:00:03.000Z",
                },
              }),
            ),
        ).toThrow(
          "not monotonic",
        );
      },
    );

    it(
      "rejects duplicate proof-result identities",
      () => {
        const duplicate = [
          PROOF_RESULT,
          PROOF_RESULT,
        ];

        expect(
          () =>
            buildActionReceiptV2(
              receiptInput({
                proofResults:
                  duplicate,

                evidenceDigest:
                  digestCanonicalJson(
                    duplicate,
                  ),
              }),
            ),
        ).toThrow(
          "Duplicate receipt proof result",
        );
      },
    );

    it(
      "rejects inconsistent recovery metadata",
      () => {
        expect(
          () =>
            buildActionReceiptV2(
              receiptInput({
                recovery: {
                  class:
                    "REVERSIBLE",

                  available:
                    false,

                  recoveryActionType:
                    "USER_ADD_ROLE",
                },
              }),
            ),
        ).toThrow(
          "recovery metadata",
        );
      },
    );

    it(
      "rejects a modified durable readback",
      () => {
        const receipt =
          buildActionReceiptV2(
            receiptInput(),
          );

        const modified = {
          ...receipt,

          target: {
            ...receipt.target,

            displayName:
              "Different Name",
          },
        };

        expect(
          () =>
            assertExactReceiptReadback(
              receipt,
              modified,
            ),
        ).toThrow();
      },
    );
  },
);
