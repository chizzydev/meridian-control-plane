import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildActionReceiptV2,
} from "../proof/receipt";

import {
  buildActionReceiptHistoryRecord,
} from "../proof/action-history";

import {
  ACTION_RECEIPT_HISTORY_WRITE_PATH,
  actionReceiptHistoryReadPath,
  actionReceiptTargetHistoryPath,
  buildActionReceiptHistoryWritePlan,
} from "./action-history-transport";

function record() {
  return buildActionReceiptHistoryRecord(
    buildActionReceiptV2({
      receiptId:
        "meridian-r3a-transport-test",
      actionId:
        "action:r3a-transport-test",
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
          "generation-test",
      },
      actor: {
        logicalActor:
          "transport-test",
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
        "1".repeat(64),
      reviewedPreflightDigest:
        "2".repeat(64),
      freshRevalidationDigest:
        "2".repeat(64),
      executionDigest:
        "3".repeat(64),
      evidenceDigest:
        "CD43FE93486F449F392CC13B98A499AF3A832DFD1257C38F45E43FBBE957EA35",
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
            "2026-09-20T17:31:04.000Z",
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
          "2026-09-20T17:31:00.000Z",
        applyStartedAtUtc:
          "2026-09-20T17:31:01.000Z",
        applyCompletedAtUtc:
          "2026-09-20T17:31:03.000Z",
        evidenceCompletedAtUtc:
          "2026-09-20T17:31:04.000Z",
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
        "5".repeat(64),
    }),
  );
}

describe(
  "generic action receipt history transport",
  () => {
    it(
      "uses dedicated append-only action receipt routes",
      () => {
        expect(
          ACTION_RECEIPT_HISTORY_WRITE_PATH,
        ).toBe(
          "/action-receipts",
        );

        expect(
          actionReceiptHistoryReadPath(
            "receipt:test",
          ),
        ).toBe(
          "/action-receipts/receipt%3Atest",
        );

        expect(
          actionReceiptTargetHistoryPath(
            "web-app:/meridian-lab/orders",
          ),
        ).toBe(
          "/action-history/web-app%253A%252Fmeridian-lab%252Forders",
        );
      },
    );

    it(
      "writes only a validated generic action receipt record",
      () => {
        const value =
          record();

        expect(
          buildActionReceiptHistoryWritePlan(
            value,
          ),
        ).toEqual({
          method:
            "POST",
          path:
            "/action-receipts",
          body:
            value,
        });
      },
    );
  },
);
