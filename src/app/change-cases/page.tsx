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

const lifecycle: EvidenceStep[] = [
  {
    label: "Needs review",
    detail: "0 cases",
    state: "pending",
  },
  {
    label: "Ready",
    detail: "0 cases",
    state: "pending",
  },
  {
    label: "Converging",
    detail: "0 cases",
    state: "pending",
  },
  {
    label: "Verified",
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
    label: "Converging",
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
        title="Change Queue"
        description="Security changes are lifecycle objects. Configuration may finish before live authority has converged, so Meridian keeps a case open until its evidence is complete."
        actions={
          <Link
            href="/change-cases/new"
            className="meridian-action meridian-action-primary"
          >
            Stage access change
          </Link>
        }
      />

      <section className="meridian-queue-lifecycle" aria-label="Change Queue lifecycle">
        <EvidenceRail steps={lifecycle} />
      </section>

      <section className="meridian-queue-section">
        <SectionHeader
          eyebrow="Operational work queue"
          title="Cases by lifecycle state"
          detail="The seeded surface has one certified case. Empty lifecycle states remain visible without being inflated into empty cards."
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
                <th>Subject</th>
                <th>Authority change</th>
                <th>Impact</th>
                <th>Configuration</th>
                <th>Live access</th>
                <th>Native audit</th>
                <th>Receipt</th>
                <th aria-label="Open case" />
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <StatusBadge tone="success">Verified</StatusBadge>
                </td>
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
                  <CodeValue truncate>{receipt.receiptId}</CodeValue>
                </td>
                <td>
                  <Link
                    href="/change-cases/verified/maya-patel-supervisor-removal"
                    className="meridian-row-link"
                  >
                    Open verified receipt + IRIS history
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="meridian-queue-receipt-note">
          <div>
            <StatusBadge tone="success">Recorded certified receipt</StatusBadge>
            <StatusBadge>Read-only demo evidence</StatusBadge>
            <StatusBadge>Persistent IRIS history check</StatusBadge>
          </div>

          <p>
            Previewed, revalidated, applied, checked for live runtime residue,
            converged, and bound to native IRIS UserChange audit evidence.
            The verified receipt route performs the live server-side IRIS
            history read; this queue remains static and credential-free.
          </p>

          <CodeValue>{receipt.receiptId}</CodeValue>
        </div>
      </section>

      <section className="meridian-queue-proof-section">
        <SectionHeader
          eyebrow="Authorization convergence"
          title="Certified stale-to-converged witness"
          detail="This read-only witness is derived from the certified authorization-closure model and preserves its original evidence and authority boundary."
        />

        <div className="meridian-queue-proof">
          <AuthorizationProofSurface />
        </div>
      </section>
    </main>
  );
}
