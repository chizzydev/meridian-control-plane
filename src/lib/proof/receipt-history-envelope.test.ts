import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildActionReceiptV2,
} from "./receipt";

import {
  digestCanonicalJson,
} from "./digest";

import {
  actionReceiptV2FromHistoryRecord,
  buildActionReceiptHistoryEnvelopeRecord,
} from "./receipt-history-envelope";

function receipt() {
  return buildActionReceiptV2({
    receiptId:
      "receipt:v2-history-001",

    actionId:
      "action:v2-history-001",

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
        "user:meridian.demo.witness",
      displayName:
        "Meridian Live Demo Witness",
      fixtureId:
        "meridian-live-demo-v1",
      generation:
        "generation-1",
    },

    actor: {
      logicalActor:
        "certification-operator",
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
      "1".repeat(
        64,
      ),

    reviewedPreflightDigest:
      "2".repeat(
        64,
      ),

    freshRevalidationDigest:
      "2".repeat(
        64,
      ),

    executionDigest:
      "3".repeat(
        64,
      ),

    evidenceDigest:
      digestCanonicalJson(
        [],
      ),

    proofResults:
      [],

    lifecycle: {
      createdAtUtc:
        "2026-09-20T16:00:00.000Z",
      applyStartedAtUtc:
        "2026-09-20T16:00:01.000Z",
      applyCompletedAtUtc:
        "2026-09-20T16:00:02.000Z",
      evidenceCompletedAtUtc:
        "2026-09-20T16:00:03.000Z",
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
      "5".repeat(
        64,
      ),
  });
}

const binding = {
  username:
    "meridian.demo.witness",
  displayName:
    "Meridian Live Demo Witness",
  operation:
    "REMOVE" as const,
  role:
    "MeridianSupervisor",
  applyPid:
    123,
  nativeAuditSystemId:
    "audit-system",
  nativeAuditIndex:
    481,
  nativeAuditUtc:
    "2026-09-20T16:00:02.500Z",
  nativeAuditEvent:
    "UserChange",
  nativeAuditActor:
    "meridian.runtime",
};

describe(
  "Action Receipt V2 durable history envelope",
  () => {
    it(
      "round-trips the exact inner Action Receipt V2 through the existing append-only history schema",
      () => {
        const original =
          receipt();

        const record =
          buildActionReceiptHistoryEnvelopeRecord({
            receipt:
              original,
            binding,
          });

        const readback =
          actionReceiptV2FromHistoryRecord(
            record,
          );

        expect(
          readback,
        ).toEqual(
          original,
        );

        expect(
          record.receiptJson,
        ).toContain(
          "meridian.action-receipt.v2",
        );

        expect(
          record.receiptSha256,
        ).toMatch(
          /^[A-F0-9]{64}$/,
        );
      },
    );

    it(
      "rejects a summary that no longer agrees with the immutable envelope",
      () => {
        const record =
          buildActionReceiptHistoryEnvelopeRecord({
            receipt:
              receipt(),
            binding,
          });

        expect(
          () =>
            actionReceiptV2FromHistoryRecord({
              ...record,
              role:
                "WrongRole",
            }),
        ).toThrow();
      },
    );

    it(
      "rejects an envelope digest mismatch",
      () => {
        const record =
          buildActionReceiptHistoryEnvelopeRecord({
            receipt:
              receipt(),
            binding,
          });

        expect(
          () =>
            actionReceiptV2FromHistoryRecord({
              ...record,
              receiptSha256:
                "A".repeat(
                  64,
                ),
            }),
        ).toThrow(
          "envelope digest",
        );
      },
    );
  },
);
