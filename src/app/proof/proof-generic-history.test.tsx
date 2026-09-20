import {
  renderToStaticMarkup,
} from "react-dom/server";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildActionReceiptHistoryRecord,
} from "@/lib/proof/action-history";

import {
  buildActionReceiptV2,
} from "@/lib/proof/receipt";

import {
  ProofReceiptPanel,
} from "./proof-receipt-panel";

describe(
  "generic Action Receipt V2 proof presentation",
  () => {
    it(
      "renders a generic durable action-history binding without inventing legacy native-audit fields",
      () => {
        const receipt =
          buildActionReceiptV2({
            receiptId:
              "meridian-r3a-proof-generic-test",
            actionId:
              "action:r3a-proof-generic-test",
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
                "proof-generic-test",
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
              "AFB3F01A510980EFB9FCFB9D6EDE3BF73F41DA9325C728203C2F6DB419197DC8",
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
                  "2026-09-20T17:32:04.000Z",
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
                "2026-09-20T17:32:00.000Z",
              applyStartedAtUtc:
                "2026-09-20T17:32:01.000Z",
              applyCompletedAtUtc:
                "2026-09-20T17:32:03.000Z",
              evidenceCompletedAtUtc:
                "2026-09-20T17:32:04.000Z",
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
          });

        const historyRecord =
          buildActionReceiptHistoryRecord(
            receipt,
          );

        const html =
          renderToStaticMarkup(
            <ProofReceiptPanel
              receipt={receipt}
              historyRecord={historyRecord}
            />,
          );

        expect(
          html,
        ).toContain(
          "GENERIC_ACTION:WEB_APP_CREATE",
        );

        expect(
          html,
        ).toContain(
          "meridian.runtime",
        );

        expect(
          html,
        ).not.toContain(
          "Native IRIS audit #",
        );
      },
    );
  },
);
