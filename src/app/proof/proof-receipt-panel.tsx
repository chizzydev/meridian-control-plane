import {
  AuthorityCallout,
  CodeValue,
  EvidenceRail,
  KeyValueInspector,
  MetricCell,
  SectionHeader,
  StatusBadge,
  type EvidenceStep,
} from "@/components/meridian/primitives";

import type {
  VerifiedReceiptHistoryRecord,
} from "@/lib/change-case/receipt-history";

import type {
  ProofResult,
} from "@/lib/proof/evidence";

import type {
  ActionReceiptV2,
} from "@/lib/proof/receipt";

import styles from "./proof.module.css";

const verifiedLifecycle:
  EvidenceStep[] = [
    {
      label:
        "PRE-FLIGHT",
      detail:
        "Authoritative prestate bound",
      state:
        "complete",
    },
    {
      label:
        "REVIEW",
      detail:
        "Exact digest accepted",
      state:
        "complete",
    },
    {
      label:
        "REVALIDATE",
      detail:
        "Fresh state matched",
      state:
        "complete",
    },
    {
      label:
        "APPLY",
      detail:
        "Bounded mutation dispatched",
      state:
        "complete",
    },
    {
      label:
        "PROVE",
      detail:
        "Required evidence complete",
      state:
        "complete",
    },
    {
      label:
        "PERSIST",
      detail:
        "Durable receipt read back",
      state:
        "complete",
    },
    {
      label:
        "VERIFIED",
      detail:
        "Closure reached",
      state:
        "complete",
    },
  ];

function proofTone(
  result:
    ProofResult,
):
  | "neutral"
  | "success"
  | "warning"
  | "danger" {
  if (
    result.status ===
      "PASS"
  ) {
    return "success";
  }

  if (
    result.status ===
      "FAIL"
  ) {
    return "danger";
  }

  if (
    result.status ===
      "NOT_APPLICABLE"
  ) {
    return "neutral";
  }

  return "warning";
}

export function ProofReceiptPanel({
  receipt,
  historyRecord,
}: {
  receipt:
    ActionReceiptV2;

  historyRecord:
    VerifiedReceiptHistoryRecord;
}) {
  const passedProofs =
    receipt.proofResults.filter(
      (
        result,
      ) =>
        result.status ===
        "PASS",
    ).length;

  return (
    <div className={styles.receiptPanel}>
      <section
        className={styles.receiptHero}
        aria-label="Verified Action Receipt V2 identity"
      >
        <div className={styles.receiptHeroCopy}>
          <div className={styles.badges}>
            <StatusBadge tone="success">
              Persistent IRIS receipt loaded
            </StatusBadge>
            <StatusBadge tone="success">
              VERIFIED
            </StatusBadge>
            <StatusBadge>
              {receipt.schemaVersion}
            </StatusBadge>
          </div>

          <h2>
            Verified Action Receipt V2
          </h2>

          <p>
            This is durable server-side evidence, not browser-supplied
            status. Exact receipt readback is required before Meridian
            permits VERIFIED.
          </p>
        </div>

        <KeyValueInspector
          rows={[
            {
              label:
                "Receipt",
              value:
                <CodeValue truncate>
                  {receipt.receiptId}
                </CodeValue>,
            },
            {
              label:
                "Action",
              value:
                <CodeValue truncate>
                  {receipt.actionId}
                </CodeValue>,
            },
            {
              label:
                "Contract",
              value:
                `${receipt.contractId} v${receipt.contractVersion}`,
              mono:
                true,
            },
            {
              label:
                "Target",
              value:
                receipt.target.displayName,
            },
          ]}
        />
      </section>

      <section
        className={styles.lifecycle}
        aria-label="Verified Action lifecycle"
      >
        <EvidenceRail
          steps={
            verifiedLifecycle
          }
        />
      </section>

      <section
        className={styles.metrics}
        aria-label="Verified proof summary"
      >
        <MetricCell
          label="Required proofs passed"
          value={passedProofs}
          detail={`${receipt.proofResults.length} recorded proof results`}
        />

        <MetricCell
          label="Authority requirements"
          value={receipt.authority.length}
          detail="Server-owned execution boundary"
        />

        <MetricCell
          label="Risk"
          value={receipt.risk}
          detail={receipt.domain}
          mono
        />

        <MetricCell
          label="Recovery"
          value={
            receipt.recovery.available
              ? "AVAILABLE"
              : "NONE"
          }
          detail={
            receipt.recovery.recoveryActionType ??
            "No recovery action"
          }
          mono
        />
      </section>

      <section className={styles.section}>
        <SectionHeader
          eyebrow="Proof planes"
          title="Expected state. Observed state. Provenance."
          detail="A proof result is not closure by itself. Every REQUIRED plane must pass before receipt persistence can begin."
        />

        <div className="meridian-table-wrap">
          <table className={`meridian-data-table ${styles.proofTable}`}>
            <thead>
              <tr>
                <th>Plane</th>
                <th>Requirement</th>
                <th>Status</th>
                <th>Expected</th>
                <th>Observed</th>
                <th>Provenance</th>
                <th>Source</th>
              </tr>
            </thead>

            <tbody>
              {receipt.proofResults.map(
                (
                  result,
                ) => (
                  <tr key={result.requirementId}>
                    <td>
                      <CodeValue>
                        {result.plane}
                      </CodeValue>
                    </td>

                    <td>
                      <strong>
                        {result.requirementId}
                      </strong>
                      <small>
                        {result.applicability}
                      </small>
                    </td>

                    <td>
                      <StatusBadge
                        tone={proofTone(result)}
                      >
                        {result.status}
                      </StatusBadge>
                    </td>

                    <td>
                      {result.expectedSummary}
                    </td>

                    <td>
                      {result.observedSummary}
                    </td>

                    <td>
                      <CodeValue>
                        {result.provenance}
                      </CodeValue>
                    </td>

                    <td>
                      <span>
                        {result.sourceType}
                      </span>
                      <small>
                        {result.sourceReference ??
                          "No external reference"}
                      </small>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeader
          eyebrow="Durable closure"
          title="Receipt identity is bound twice"
          detail="The inner Action Receipt V2 has its own digest. The append-only IRIS history envelope has a separate digest and native-audit binding."
        />

        <div className={styles.closureGrid}>
          <div>
            <span>
              Action Receipt V2 SHA-256
            </span>
            <CodeValue>
              {receipt.receiptSha256}
            </CodeValue>
          </div>

          <div>
            <span>
              Durable history envelope SHA-256
            </span>
            <CodeValue>
              {historyRecord.receiptSha256}
            </CodeValue>
          </div>

          <div>
            <span>
              Native IRIS audit
            </span>
            <CodeValue>
              {historyRecord.nativeAuditEvent} #{historyRecord.nativeAuditIndex}
            </CodeValue>
          </div>

          <div>
            <span>
              Apply process
            </span>
            <CodeValue>
              PID {historyRecord.applyPid}
            </CodeValue>
          </div>
        </div>

        <AuthorityCallout
          eyebrow="Closure invariant"
          title="Exact durable readback required"
          detail="ACTION_VERIFIED is permitted only after required proof evidence passes, the receipt is persisted, and canonical readback matches the frozen receipt exactly."
          tone="success"
        />
      </section>

      <section className={styles.section}>
        <SectionHeader
          eyebrow="Cryptographic bindings"
          title="What this receipt commits to"
          detail="These hashes bind intent, reviewed preflight, fresh revalidation, execution, evidence and the evidence-complete event-chain prefix."
        />

        <KeyValueInspector
          rows={[
            {
              label:
                "Intent",
              value:
                receipt.intentDigest,
              mono:
                true,
            },
            {
              label:
                "Reviewed preflight",
              value:
                receipt.reviewedPreflightDigest,
              mono:
                true,
            },
            {
              label:
                "Fresh revalidation",
              value:
                receipt.freshRevalidationDigest,
              mono:
                true,
            },
            {
              label:
                "Execution",
              value:
                receipt.executionDigest,
              mono:
                true,
            },
            {
              label:
                "Evidence",
              value:
                receipt.evidenceDigest,
              mono:
                true,
            },
            {
              label:
                "Evidence-complete event hash",
              value:
                receipt.terminalEventHash,
              mono:
                true,
            },
          ]}
        />
      </section>

      <section className={styles.section}>
        <SectionHeader
          eyebrow="Authority boundary"
          title="Execution authority is explicit"
          detail="The browser selects only supported intent. Meridian derives transport and authority server-side."
        />

        <div className="meridian-table-wrap">
          <table className={`meridian-data-table ${styles.authorityTable}`}>
            <thead>
              <tr>
                <th>Resource</th>
                <th>Permission</th>
                <th>Standing</th>
                <th>Escalation only</th>
              </tr>
            </thead>

            <tbody>
              {receipt.authority.map(
                (
                  authority,
                ) => (
                  <tr
                    key={`${authority.resource}:${authority.permission}`}
                  >
                    <td>
                      <CodeValue>
                        {authority.resource}
                      </CodeValue>
                    </td>
                    <td>
                      {authority.permission}
                    </td>
                    <td>
                      {authority.standing
                        ? "YES"
                        : "NO"}
                    </td>
                    <td>
                      {authority.escalationOnly
                        ? "YES"
                        : "NO"}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>

        <AuthorityCallout
          eyebrow="Recovery boundary"
          title="Recovery is a separate Verified Action"
          detail="Historical closure stays immutable. A recovery operation receives its own preflight, proof evidence and receipt rather than rewriting this verified action."
        />
      </section>
    </div>
  );
}
