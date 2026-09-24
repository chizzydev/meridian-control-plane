import Link from "next/link";

import { AuthorizationProofSurface } from "./authorization-proof-surface";
import {
  CodeValue,
  EvidenceRail,
  type EvidenceStep,
  PageHeader,
  SectionHeader,
  StatusBadge,
} from "@/components/meridian/primitives";
import {
  getRecordedVerifiedReceipt,
  summarizeRecordedReceipt,
} from "@/lib/change-case/recorded-receipt";

const closureLifecycle: EvidenceStep[] = [
  {
    label: "PREFLIGHT",
    detail: "Intent + target bound",
    state: "complete",
  },
  {
    label: "REVALIDATE",
    detail: "Fresh state matched",
    state: "complete",
  },
  {
    label: "APPLY",
    detail: "Fixed-purpose dispatch",
    state: "complete",
  },
  {
    label: "EVIDENCE",
    detail: "Required planes passed",
    state: "complete",
  },
  {
    label: "RECEIPT",
    detail: "Persist + exact readback",
    state: "complete",
  },
  {
    label: "VERIFIED",
    detail: "1 recorded case",
    state: "complete",
  },
];

const queueFilters = [
  {
    label: "All",
    count: 1,
    active: true,
  },
  {
    label: "Needs review",
    count: 0,
    active: false,
  },
  {
    label: "Ready",
    count: 0,
    active: false,
  },
  {
    label: "Evidence",
    count: 0,
    active: false,
  },
  {
    label: "Verified",
    count: 1,
    active: false,
  },
] as const;

export default function ChangeQueuePage() {
  const receipt = getRecordedVerifiedReceipt();
  const summary = summarizeRecordedReceipt(receipt);

  return (
    <main className="meridian-change-queue">
      <PageHeader
        eyebrow="Meridian Control Plane / Change control"
        title="Recorded proof-contract cases"
        description="Change cases preserve reviewed intent, fresh revalidation, execution evidence, and durable closure. Configuration or convergence alone never promotes a case to VERIFIED."
        actions={
          <Link
            href="/change-cases/new"
            className="meridian-action meridian-action-primary"
          >
            Inspect action preflight
          </Link>
        }
      />

      <section className="meridian-queue-lifecycle" aria-label="Proof Contract V2 closure lifecycle">
        <EvidenceRail steps={closureLifecycle} />
      </section>

      <section className="meridian-queue-section">
        <SectionHeader
          eyebrow="Recorded evidence queue"
          title="Cases by lifecycle state"
          detail="The current judge surface contains one recorded certified permissions case. Empty queue states remain visible without fabricating additional cases."
        />

        <div className="meridian-filter-bar" aria-label="Queue state filters">
          {queueFilters.map((filter) => (
            <span
              className="meridian-filter-item"
              data-active={filter.active ? "true" : "false"}
              key={filter.label}
            >
              <span>{filter.label}</span>
              <strong>{filter.count}</strong>
            </span>
          ))}
        </div>

        <div className="meridian-table-wrap">
          <table className="meridian-data-table meridian-queue-table">
            <thead>
              <tr>
                <th>State</th>
                <th>Semantic action</th>
                <th>Subject</th>
                <th>Authority change</th>
                <th>Impact</th>
                <th>Configuration</th>
                <th>Live access</th>
                <th>Native audit</th>
                <th>Receipt + inspection</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <StatusBadge tone="success">Verified</StatusBadge>
                </td>
                <td><CodeValue>P04 USER_REMOVE_ROLE</CodeValue></td>
                <td>
                  <strong>Maya Patel</strong>
                  <small>{receipt.change.username}</small>
                </td>
                <td>
                  <CodeValue>
                    {receipt.change.operation} {receipt.change.role}
                  </CodeValue>
                </td>
                <td>
                  <span className="meridian-queue-impact">
                    <strong>{summary.lostEffectiveRoleCount}</strong>
                    roles / <strong>{summary.lostPermissionCount}</strong> permissions
                  </span>
                </td>
                <td>
                  <span className="meridian-inline-state" data-tone="success">
                    <span />
                    Applied
                  </span>
                </td>
                <td>
                  <span className="meridian-inline-state" data-tone="success">
                    <span />
                    Converged
                  </span>
                </td>
                <td>
                  <CodeValue>UserChange #{receipt.nativeAudit.auditIndex}</CodeValue>
                </td>
                <td>
                  <div
                    style={{
                      display: "grid",
                      gap: "6px",
                      minWidth: "100px",
                    }}
                  >
                    <CodeValue truncate>{receipt.receiptId}</CodeValue>
                    <span className="meridian-inline-state" data-tone="success">
                      <span />
                      Exact readback
                    </span>
                    <Link
                      href="/change-cases/verified/maya-patel-supervisor-removal"
                      className="meridian-row-link"
                    >
                      Inspect case
                    </Link>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="meridian-queue-receipt-note">
          <div>
            <StatusBadge tone="success">Recorded certified receipt</StatusBadge>
            <StatusBadge>Read-only case evidence</StatusBadge>
            <StatusBadge>Persistent IRIS history check</StatusBadge>
          </div>

          <p>
            This P04 case was previewed, revalidated, applied, checked for
            live runtime residue, converged, bound to native IRIS UserChange
            evidence, persisted, and made inspectable through exact server-side
            receipt-history readback.
          </p>

          <CodeValue>{receipt.receiptId}</CodeValue>
        </div>
      </section>

      <section className="meridian-queue-proof-section">
        <SectionHeader
          eyebrow="Recorded permissions convergence case study"
          title="Configuration can change before live authority converges"
          detail="This isolated witness demonstrates one permissions-specific convergence hazard. It is evidence inside Proof Contract V2, not a replacement for the full durable closure lifecycle."
        />

        <div className="meridian-queue-proof">
          <AuthorizationProofSurface />
        </div>
      </section>
    </main>
  );
}
