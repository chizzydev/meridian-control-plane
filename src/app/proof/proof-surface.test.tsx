import {
  readFileSync,
} from "node:fs";

import {
  renderToStaticMarkup,
} from "react-dom/server";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  digestCanonicalJson,
} from "@/lib/proof/digest";

import type {
  ProofResult,
} from "@/lib/proof/evidence";

import {
  buildActionReceiptV2,
} from "@/lib/proof/receipt";

import {
  buildActionReceiptHistoryEnvelopeRecord,
} from "@/lib/proof/receipt-history-envelope";

import {
  ProofReceiptPanel,
} from "./proof-receipt-panel";

function proofResults():
  readonly ProofResult[] {
  const observedAtUtc =
    "2026-09-20T16:59:40.000Z";

  return [
    {
      requirementId:
        "configuration",
      plane:
        "CONFIGURATION_READBACK",
      applicability:
        "REQUIRED",
      status:
        "PASS",
      sourceType:
        "IRIS",
      sourceReference:
        "security-user-readback",
      observedAtUtc,
      expectedSummary:
        "Role absent.",
      observedSummary:
        "Role absent.",
      provenance:
        "AUTHORITATIVE_IRIS",
      safeEvidenceDigest:
        null,
    },
    {
      requirementId:
        "permission-effect",
      plane:
        "PERMISSION_EFFECT",
      applicability:
        "REQUIRED",
      status:
        "PASS",
      sourceType:
        "IRIS",
      sourceReference:
        "configured-role-graph",
      observedAtUtc,
      expectedSummary:
        "Removed authority absent.",
      observedSummary:
        "Removed authority absent.",
      provenance:
        "AUTHORITATIVE_IRIS",
      safeEvidenceDigest:
        null,
    },
    {
      requirementId:
        "live-runtime",
      plane:
        "LIVE_RUNTIME",
      applicability:
        "REQUIRED",
      status:
        "PASS",
      sourceType:
        "IRIS_NATIVE",
      sourceReference:
        "stale-to-fresh-witness",
      observedAtUtc,
      expectedSummary:
        "Fresh process denies removed authority.",
      observedSummary:
        "Fresh process denies removed authority.",
      provenance:
        "AUTHORITATIVE_IRIS",
      safeEvidenceDigest:
        null,
    },
    {
      requirementId:
        "native-audit",
      plane:
        "NATIVE_AUDIT",
      applicability:
        "REQUIRED",
      status:
        "PASS",
      sourceType:
        "IRIS_AUDIT",
      sourceReference:
        "UserChange:803",
      observedAtUtc,
      expectedSummary:
        "One matching native audit event.",
      observedSummary:
        "One matching native audit event.",
      provenance:
        "AUTHORITATIVE_IRIS",
      safeEvidenceDigest:
        null,
    },
  ];
}

function fixture() {
  const results =
    proofResults();

  const receipt =
    buildActionReceiptV2({
      receiptId:
        "meridian-v2-user-remove-role-proof-test",
      actionId:
        "action:proof-test-001",
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
          "generation-proof-test",
      },
      actor: {
        logicalActor:
          "proof-test-operator",
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
          results,
        ),
      proofResults:
        results,
      lifecycle: {
        createdAtUtc:
          "2026-09-20T16:59:30.000Z",
        applyStartedAtUtc:
          "2026-09-20T16:59:31.000Z",
        applyCompletedAtUtc:
          "2026-09-20T16:59:35.000Z",
        evidenceCompletedAtUtc:
          "2026-09-20T16:59:40.000Z",
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
        "4".repeat(
          64,
        ),
    });

  const historyRecord =
    buildActionReceiptHistoryEnvelopeRecord({
      receipt,
      binding: {
        username:
          "meridian.demo.witness",
        displayName:
          "Meridian Live Demo Witness",
        operation:
          "REMOVE",
        role:
          "MeridianSupervisor",
        applyPid:
          875,
        nativeAuditSystemId:
          "audit-system",
        nativeAuditIndex:
          803,
        nativeAuditUtc:
          "2026-09-20T16:59:36.000Z",
        nativeAuditEvent:
          "UserChange",
        nativeAuditActor:
          "meridian.runtime",
      },
    });

  return {
    receipt,
    historyRecord,
  };
}

describe(
  "judge-visible generic proof console",
  () => {
    it(
      "renders a durable V2 receipt as lifecycle, proof planes, authority and cryptographic bindings",
      () => {
        const {
          receipt,
          historyRecord,
        } =
          fixture();

        const html =
          renderToStaticMarkup(
            <ProofReceiptPanel
              receipt={receipt}
              historyRecord={historyRecord}
            />,
          );

        for (
          const marker
          of [
            "Verified Action Receipt V2",
            "Persistent IRIS receipt loaded",
            "PRE-FLIGHT",
            "REVALIDATE",
            "PERSIST",
            "CONFIGURATION_READBACK",
            "PERMISSION_EFFECT",
            "LIVE_RUNTIME",
            "NATIVE_AUDIT",
            "AUTHORITATIVE_IRIS",
            "Exact durable readback required",
            "Recovery is a separate Verified Action",
            receipt.receiptSha256,
            historyRecord.receiptSha256,
          ]
        ) {
          expect(
            html,
          ).toContain(
            marker,
          );
        }
      },
    );

    it(
      "keeps the browser proof route credential-free and navigation-visible",
      () => {
        const page =
          readFileSync(
            "src/app/proof/page.tsx",
            "utf8",
          );

        const shell =
          readFileSync(
            "src/components/meridian/app-shell.tsx",
            "utf8",
          );

        for (
          const marker
          of [
            "readPersistentActionReceiptV2",
            "VERIFIED_ACTION_STATES",
            "EVIDENCE_PLANES",
            "Configuration is not closure.",
            "Read from IRIS history",
          ]
        ) {
          expect(
            page,
          ).toContain(
            marker,
          );
        }

        for (
          const forbidden
          of [
            "process.env",
            "Authorization:",
            "Bearer ",
            "MERIDIAN_RUNTIME_PASSWORD",
          ]
        ) {
          expect(
            page,
          ).not.toContain(
            forbidden,
          );
        }

        expect(
          shell,
        ).toContain(
          'href: "/proof"',
        );

        expect(
          shell,
        ).toContain(
          'label: "Proof"',
        );
      },
    );
  },
);
