import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildActionReceiptV2,
} from "./receipt";

import {
  actionReceiptV2FromGenericHistory,
  buildActionReceiptHistoryRecord,
  validateActionReceiptHistoryRecord,
} from "./action-history";

function receipt() {
  return buildActionReceiptV2({
    receiptId:
      "meridian-r3a-action-history-test",
    actionId:
      "action:r3a-action-history-test",
    parentChangeSetId:
      null,
    actionType:
      "WEB_APP_CREATE",
    contractId:
      "meridian.web-rest.web-app-create",
    contractVersion:
      1,
    domain:
      "WEB_REST",
    risk:
      "MEDIUM",
    reversibility:
      "REVERSIBLE",
    target: {
      kind:
        "WEB_APPLICATION",
      canonicalId:
        "web-app:/meridian-lab/orders",
      displayName:
        "/meridian-lab/orders",
      fixtureId:
        "meridian-lab-orders-v1",
      generation:
        "fixture-generation-test",
    },
    actor: {
      logicalActor:
        "r3a-test",
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
          true,
        escalationOnly:
          false,
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
      "FFC9358654A94FA6013E2E77090F8AD962A10ABB20567E4F87785851F9BA69C2",
    proofResults: [
      {
        requirementId:
          "configuration-readback",
        plane:
          "CONFIGURATION_READBACK",
        applicability:
          "REQUIRED",
        status:
          "PASS",
        sourceType:
          "IRIS",
        sourceReference:
          "GET /v2/web-app",
        observedAtUtc:
          "2026-09-20T17:30:04.000Z",
        expectedSummary:
          "Fixture exists.",
        observedSummary:
          "Fixture exists.",
        provenance:
          "AUTHORITATIVE_IRIS",
        safeEvidenceDigest:
          null,
      },
    ],
    lifecycle: {
      createdAtUtc:
        "2026-09-20T17:30:00.000Z",
      applyStartedAtUtc:
        "2026-09-20T17:30:01.000Z",
      applyCompletedAtUtc:
        "2026-09-20T17:30:03.000Z",
      evidenceCompletedAtUtc:
        "2026-09-20T17:30:04.000Z",
    },
    recovery: {
      class:
        "REVERSIBLE",
      available:
        true,
      recoveryActionType:
        "WEB_APP_DELETE",
    },
    terminalEventHash:
      "5".repeat(
        64,
      ),
  });
}

describe(
  "generic Action Receipt V2 durable history record",
  () => {
    it(
      "binds the exact canonical Action Receipt V2 without legacy user-role fields",
      () => {
        const frozen =
          receipt();

        const record =
          buildActionReceiptHistoryRecord(
            frozen,
          );

        expect(
          record.schemaVersion,
        ).toBe(
          "meridian.action-receipt-history.v1",
        );

        expect(
          record.targetCanonicalId,
        ).toBe(
          "web-app:/meridian-lab/orders",
        );

        expect(
          record.receiptSha256,
        ).toBe(
          frozen.receiptSha256,
        );

        expect(
          actionReceiptV2FromGenericHistory(
            record,
          ),
        ).toEqual(
          frozen,
        );

        expect(
          record,
        ).not.toHaveProperty(
          "username",
        );

        expect(
          record,
        ).not.toHaveProperty(
          "role",
        );

        expect(
          record,
        ).not.toHaveProperty(
          "nativeAuditIndex",
        );
      },
    );

    it(
      "rejects any outer/inner identity mismatch",
      () => {
        const record =
          buildActionReceiptHistoryRecord(
            receipt(),
          );

        expect(
          () =>
            validateActionReceiptHistoryRecord({
              ...record,
              actionType:
                "WEB_APP_DELETE",
            }),
        ).toThrow(
          /action type binding/,
        );
      },
    );
  },
);
