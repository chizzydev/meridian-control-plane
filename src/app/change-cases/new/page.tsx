import Link from "next/link";

import {
  AuthorityCallout,
  CodeValue,
  EvidenceRail,
  type EvidenceStep,
  PageHeader,
  SectionHeader,
  StatusBadge,
} from "@/components/meridian/primitives";
import { CENTERPIECE_CHANGE } from "@/lib/change-case/domain";

const stagingLifecycle: EvidenceStep[] = [
  {
    label: "PRE-FLIGHT",
    detail: "Not connected",
    state: "active",
  },
  {
    label: "AUTHORITY",
    detail: "Pending IRIS read",
    state: "pending",
  },
  {
    label: "APPLY",
    detail: "Blocked",
    state: "pending",
  },
  {
    label: "CONVERGENCE",
    detail: "Not started",
    state: "pending",
  },
  {
    label: "RECEIPT",
    detail: "Not available",
    state: "pending",
  },
];

const preflightGates = [
  {
    gate: "Requested identity",
    evidence: "CENTERPIECE_CHANGE",
    status: "BOUND",
    tone: "neutral",
  },
  {
    gate: "Mutation shape",
    evidence: "Direct role mutation",
    status: "BOUND",
    tone: "neutral",
  },
  {
    gate: "Authoritative IRIS impact",
    evidence: "Requires server-owned live security read",
    status: "PENDING",
    tone: "warning",
  },
  {
    gate: "Counterfactual authorization",
    evidence: "Requires authoritative evaluation",
    status: "PENDING",
    tone: "warning",
  },
] as const;

export default function NewChangeCasePage() {
  return (
    <main className="meridian-new-case">
      <PageHeader
        eyebrow="Change control / Stage access change"
        title="Review the mutation. Prove the impact next."
        description="This staging surface is intentionally constrained to one controlled user and one direct-role operation. Impact remains unclaimed until authoritative IRIS evidence is bound."
        actions={
          <>
            <Link href="/change-cases" className="meridian-action">
              Back to Change Queue
            </Link>
            <Link href="/" className="meridian-text-link">
              Control room
            </Link>
          </>
        }
      />

      <section className="meridian-new-case-rail" aria-label="Change lifecycle">
        <EvidenceRail steps={stagingLifecycle} />
      </section>

      <form className="meridian-staging-console" aria-label="Staged access change">
        <section className="meridian-staging-intent">
          <SectionHeader
            eyebrow="01 / Change intent"
            title="Controlled centerpiece mutation"
            detail="The values are bound to the certified demo fixture. They are displayed as request fields but remain read-only in this checkpoint."
          />

          <div className="meridian-staging-fields">
            <label className="meridian-staging-field">
              <span>User</span>
              <input
                type="text"
                value={CENTERPIECE_CHANGE.displayName}
                readOnly
                aria-readonly="true"
              />
              <small>
                <CodeValue>{CENTERPIECE_CHANGE.username}</CodeValue>
              </small>
            </label>

            <label className="meridian-staging-field">
              <span>Operation</span>
              <input
                type="text"
                value={CENTERPIECE_CHANGE.operation}
                readOnly
                aria-readonly="true"
              />
              <small>Direct role mutation</small>
            </label>

            <label className="meridian-staging-field">
              <span>Role</span>
              <input
                type="text"
                value={CENTERPIECE_CHANGE.role}
                readOnly
                aria-readonly="true"
              />
              <small>Controlled centerpiece role</small>
            </label>
          </div>
        </section>

        <section className="meridian-staging-preflight">
          <SectionHeader
            eyebrow="02 / Preflight gate"
            title="Authority must be read before impact can be claimed"
            detail="The staging surface separates what is already bound from what still requires authoritative IRIS evidence."
          />

          <div className="meridian-table-wrap">
            <table className="meridian-data-table meridian-preflight-table">
              <thead>
                <tr>
                  <th>Gate</th>
                  <th>Evidence source</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {preflightGates.map((item) => (
                  <tr key={item.gate}>
                    <td>
                      <strong>{item.gate}</strong>
                    </td>
                    <td>{item.evidence}</td>
                    <td>
                      <StatusBadge
                        tone={item.tone === "warning" ? "warning" : "neutral"}
                      >
                        {item.status}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AuthorityCallout
            eyebrow="Preflight boundary"
            title="Authoritative impact is intentionally unclaimed"
            detail="This public staging view does not initiate privileged IRIS reads. Impact stays pending until server-owned live security evidence and counterfactual evaluation are available."
            tone="warning"
          />

          <div className="meridian-staging-action-row">
            <div>
              <span className="meridian-record-label">Apply boundary</span>
              <strong>Browser apply authority intentionally absent</strong>
            </div>

            <button
              type="button"
              disabled
              className="meridian-disabled-action"
            >
              Run authoritative preflight
            </button>
          </div>
        </section>
      </form>
    </main>
  );
}
