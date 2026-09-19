import Link from "next/link";

import {
  AuthorityCallout,
  CodeValue,
  EvidenceBlock,
  EvidenceRail,
  KeyValueInspector,
  MetricCell,
  PageHeader,
  SectionHeader,
  StatusBadge,
} from "@/components/meridian/primitives";
import {
  getRecordedVerifiedReceipt,
  summarizeRecordedReceipt,
} from "@/lib/change-case/recorded-receipt";

const lifecycle = [
  {
    label: "PRE-FLIGHT",
    detail: "Impact resolved",
    state: "complete",
  },
  {
    label: "APPLY",
    detail: "Reviewed mutation",
    state: "complete",
  },
  {
    label: "CONVERGE",
    detail: "Live authority cleared",
    state: "complete",
  },
  {
    label: "VERIFIED",
    detail: "Native audit bound",
    state: "complete",
  },
] as const;


export default function Home() {
  const receipt = getRecordedVerifiedReceipt();
  const summary = summarizeRecordedReceipt(receipt);

  const caseTitle = `${receipt.change.operation} ${receipt.change.role}`;

  return (
    <main className="meridian-control-room">
      <PageHeader
        eyebrow="Meridian Control Plane / Control room"
        title="Security change, under proof."
        description="Security changes are not finished when configuration changes. Meridian binds reviewed authority, live convergence, and native IRIS evidence into one inspectable Change Case."
        actions={
          <>
            <Link
              href="/change-cases"
              className="meridian-action meridian-action-primary"
            >
              Open Change Queue
            </Link>
            <Link
              href="/change-cases/new"
              className="meridian-action"
            >
              Stage access change
            </Link>
          </>
        }
      />

      <section className="meridian-control-signal-row" aria-label="Control room summary">
        <MetricCell
          label="Case state"
          value="VERIFIED"
          detail="Recorded certified receipt"
        />
        <MetricCell
          label="Effective roles removed"
          value={summary.lostEffectiveRoleCount}
          detail="Derived from authoritative impact"
        />
        <MetricCell
          label="Permissions removed"
          value={summary.lostPermissionCount}
          detail="Changed permission pairs"
        />
        <MetricCell
          label="Residual live access"
          value={receipt.convergence.liveResidueObserved ? "Observed" : "None"}
          detail="Recorded convergence result"
        />
      </section>

      <section className="meridian-control-focus">
        <div className="meridian-control-case">
          <SectionHeader
            eyebrow="Verified centerpiece"
            title="Maya Patel / supervisor removal"
            detail="One change case carried from pre-flight through native audit closure."
            action={<StatusBadge tone="success">VERIFIED</StatusBadge>}
          />

          <div className="meridian-control-case-title">
            <div>
              <span className="meridian-record-label">Certified change</span>
              <strong>{caseTitle}</strong>
            </div>
            <CodeValue>{receipt.change.username}</CodeValue>
          </div>

          <div className="meridian-control-rail-wrap">
            <EvidenceRail steps={[...lifecycle]} />
          </div>

          <div className="meridian-control-inspector-grid">
            <KeyValueInspector
              rows={[
                {
                  label: "User",
                  value: receipt.change.username,
                  mono: true,
                },
                {
                  label: "Operation",
                  value: receipt.change.operation,
                },
                {
                  label: "Role",
                  value: receipt.change.role,
                  mono: true,
                },
                {
                  label: "Receipt",
                  value: <CodeValue truncate>{receipt.receiptId}</CodeValue>,
                },
              ]}
            />

            <KeyValueInspector
              rows={[
                {
                  label: "Configuration",
                  value: "Applied and verified",
                },
                {
                  label: "Live access",
                  value: receipt.convergence.targetProcessPresent
                    ? "Target process present"
                    : "Target process absent",
                },
                {
                  label: "Native audit",
                  value: `UserChange #${receipt.nativeAudit.auditIndex}`,
                  mono: true,
                },
                {
                  label: "Evidence mode",
                  value: "Read-only demo evidence",
                },
              ]}
            />
          </div>
        </div>

        <aside className="meridian-control-receipt">
          <div className="meridian-control-receipt-head">
            <div>
              <p className="meridian-eyebrow">Recorded certified receipt</p>
              <h2>Closure evidence</h2>
            </div>
            <StatusBadge tone="success">BOUND</StatusBadge>
          </div>

          <EvidenceBlock
            label="Authority removed"
            title={`${summary.lostPermissionCount} permission pairs`}
            tone="success"
          >
            <div className="meridian-control-impact-list">
              <span>
                <strong>{summary.lostEffectiveRoleCount}</strong>
                roles lost
              </span>
              <span>
                <strong>{summary.lostApplicationCount}</strong>
                protected app lost
              </span>
              <span>
                <strong>{summary.lostRestOperationCount}</strong>
                REST ops lost
              </span>
            </div>
          </EvidenceBlock>

          <EvidenceBlock
            label="Convergence"
            title="CONFIGURATION + LIVE ACCESS"
            tone="info"
          >
            <p className="meridian-control-evidence-copy">
              Configuration changed, live authority converged, and the exact
              native audit event was bound before VERIFIED closure.
            </p>
          </EvidenceBlock>

          <Link
            href="/change-cases/verified/maya-patel-supervisor-removal"
            className="meridian-control-receipt-link"
          >
            Inspect verified receipt
            <span aria-hidden="true">-&gt;</span>
          </Link>
        </aside>
      </section>

      <section className="meridian-control-section">
        <SectionHeader
          eyebrow="Change control"
          title="Recent change cases"
          detail="The control room favors state, authority, convergence, and receipt evidence over marketing summaries."
          action={
            <Link href="/change-cases" className="meridian-text-link">
              Full queue
            </Link>
          }
        />

        <div className="meridian-table-wrap">
          <table className="meridian-data-table">
            <thead>
              <tr>
                <th>Case</th>
                <th>Subject</th>
                <th>Authority change</th>
                <th>Convergence</th>
                <th>Receipt</th>
                <th aria-label="Open case" />
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <StatusBadge tone="success">VERIFIED</StatusBadge>
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
                  <span className="meridian-inline-state" data-tone="success">
                    <span />
                    No residual access
                  </span>
                </td>
                <td>
                  <CodeValue truncate>{receipt.receiptId}</CodeValue>
                </td>
                <td>
                  <Link
                    href="/change-cases/verified/maya-patel-supervisor-removal"
                    className="meridian-row-link"
                    aria-label="Open Maya Patel verified change case"
                  >
                    View
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="meridian-control-grid">
        <div className="meridian-control-section">
          <SectionHeader
            eyebrow="Evidence posture"
            title="Configuration is not closure"
            detail="The change only closes when configured state, live process authority, and native audit evidence agree."
          />

          <div className="meridian-control-posture">
            <div>
              <span className="meridian-posture-index">01</span>
              <div>
                <strong>PRE-FLIGHT</strong>
                <p>
                  Resolve effective-role, permission, application, REST-operation,
                  and causal impact before mutation.
                </p>
              </div>
            </div>
            <div>
              <span className="meridian-posture-index">02</span>
              <div>
                <strong>CONVERGE</strong>
                <p>
                  Keep CONFIGURATION and LIVE ACCESS separate until changed
                  authority has actually disappeared.
                </p>
              </div>
            </div>
            <div>
              <span className="meridian-posture-index">03</span>
              <div>
                <strong>RECEIPT</strong>
                <p>
                  Bind an exact native IRIS UserChange event before VERIFIED
                  becomes defensible.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="meridian-control-section">
          <SectionHeader
            eyebrow="Authority boundary"
            title="Evidence, not browser privilege"
            detail="The public-facing surface presents certified evidence without widening privileged mutation authority."
          />

          <AuthorityCallout
            eyebrow="Recorded evidence"
            title="Read-only demo evidence"
            detail="The centerpiece receipt is a recorded certified artifact. Privileged IRIS mutation stays outside the browser authority boundary."
            tone="info"
          />

          <div className="meridian-control-boundary-stats">
            <MetricCell
              label="Browser mutation authority"
              value="None"
              detail="No privileged role mutation from this surface"
            />
            <MetricCell
              label="Receipt validation"
              value="Bound"
              detail="Validated product-side receipt contract"
            />
          </div>
        </div>
      </section>

      <section className="meridian-control-section">
        <SectionHeader
          eyebrow="Supporting control-plane breadth"
          title="Runtime surfaces"
          detail="Five operational surfaces expose the surrounding IRIS control plane without competing with the change-case fast path."
        />

        <div className="meridian-surface-ledger">
          <Link href="/system" aria-label="Explore OS / System">
            <span className="meridian-surface-state" aria-hidden="true" />
            <span>
              <strong>OS / System</strong>
              <small>Runtime identity, pressure, locks, process evidence</small>
            </span>
            <span className="meridian-surface-boundary">
              Read-only server authority
            </span>
            <span className="meridian-surface-open" aria-hidden="true">
              -&gt;
            </span>
          </Link>

          <Link href="/tasks" aria-label="Explore Task Management">
            <span className="meridian-surface-state" aria-hidden="true" />
            <span>
              <strong>Task Management</strong>
              <small>Configured schedules, next execution, recent history</small>
            </span>
            <span className="meridian-surface-boundary">
              Task metadata escalation
            </span>
            <span className="meridian-surface-open" aria-hidden="true">
              -&gt;
            </span>
          </Link>

          <Link href="/logs" aria-label="Explore Logs">
            <span className="meridian-surface-state" aria-hidden="true" />
            <span>
              <strong>Logs</strong>
              <small>Operational events by source, severity, and time</small>
            </span>
            <span className="meridian-surface-boundary">
              Narrow SQL SELECT
            </span>
            <span className="meridian-surface-open" aria-hidden="true">
              -&gt;
            </span>
          </Link>

          <Link href="/web-rest" aria-label="Explore Web Apps / REST">
            <span className="meridian-surface-state" aria-hidden="true" />
            <span>
              <strong>Web Apps &amp; REST</strong>
              <small>Protected applications, handlers, deployed operations</small>
            </span>
            <span className="meridian-surface-boundary">
              Browser remains read-only
            </span>
            <span className="meridian-surface-open" aria-hidden="true">
              -&gt;
            </span>
          </Link>

          <Link href="/security-secrets" aria-label="Explore Security / Secrets">
            <span className="meridian-surface-state" aria-hidden="true" />
            <span>
              <strong>Security &amp; Secrets</strong>
              <small>Security metadata and explicit secret boundaries</small>
            </span>
            <span className="meridian-surface-boundary">
              Secret material never reaches browser
            </span>
            <span className="meridian-surface-open" aria-hidden="true">
              -&gt;
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
