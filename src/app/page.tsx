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
  type EvidenceStep,
} from "@/components/meridian/primitives";
import {
  getRecordedVerifiedReceipt,
  summarizeRecordedReceipt,
} from "@/lib/change-case/recorded-receipt";

const lifecycle: EvidenceStep[] = [
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
    detail: "Bounded action dispatched",
    state: "complete",
  },
  {
    label: "EVIDENCE",
    detail: "Required planes passed",
    state: "complete",
  },
  {
    label: "RECEIPT",
    detail: "Persisted + read back",
    state: "complete",
  },
  {
    label: "VERIFIED",
    detail: "Closure reached",
    state: "complete",
  },
];

export default function Home() {
  const receipt = getRecordedVerifiedReceipt();
  const summary = summarizeRecordedReceipt(receipt);

  const caseTitle = `${receipt.change.operation} ${receipt.change.role}`;

  return (
    <main className="meridian-control-room">
      <PageHeader
        eyebrow="Meridian Control Plane / Control room"
        title="Every privileged operation, under proof."
        description="Meridian turns selected IRIS administrative actions into Proof Contract V2 lifecycles with fresh revalidation, bounded dispatch, action-specific evidence, durable receipts, and no generic browser mutation proxy."
        actions={
          <>
            <Link
              href="/proof-coverage"
              className="meridian-action meridian-action-primary"
            >
              Inspect Proof Coverage
            </Link>
            <Link
              href="/change-cases"
              className="meridian-action"
            >
              Open Change Queue
            </Link>
          </>
        }
      />

      <section className="meridian-control-signal-row" aria-label="Certified product summary">
        <MetricCell
          label="Certified semantic actions"
          value={19}
          detail="Permissions + processes + tasks + web apps"
        />
        <MetricCell
          label="Mutation endpoints"
          value={14}
          detail="Fixed-purpose certified transports"
        />
        <MetricCell
          label="Primary operations"
          value={273}
          detail="Explicit pinned coverage atlas"
        />
        <MetricCell
          label="Generic mutation proxy"
          value="NONE"
          detail="Browser authority stays bounded"
        />
      </section>

      <section className="meridian-control-focus">
        <div className="meridian-control-case">
          <SectionHeader
            eyebrow="Recorded permissions case"
            title="Maya Patel / supervisor removal"
            detail="One P04 USER_REMOVE_ROLE case showing configuration, live authority, native audit, and durable receipt closure."
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
            <EvidenceRail steps={lifecycle} />
          </div>

          <div className="meridian-control-inspector-grid">
            <KeyValueInspector
              rows={[
                {
                  label: "Semantic action",
                  value: "P04 USER_REMOVE_ROLE",
                  mono: true,
                },
                {
                  label: "User",
                  value: receipt.change.username,
                  mono: true,
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
                  label: "Durable history",
                  value: "Receipt persisted and inspectable",
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
            label="Closure"
            title="EVIDENCE + DURABLE READBACK"
            tone="info"
          >
            <p className="meridian-control-evidence-copy">
              Configuration, live authority, native audit, and persistent
              receipt evidence agree for this case. VERIFIED is not granted
              by configuration or HTTP success alone.
            </p>
          </EvidenceBlock>

          <Link
            href="/change-cases/verified/maya-patel-supervisor-removal"
            className="meridian-control-receipt-link"
          >
            Inspect verified case
            <span aria-hidden="true">-&gt;</span>
          </Link>
        </aside>
      </section>

      <section className="meridian-control-section">
        <SectionHeader
          eyebrow="Change control"
          title="Recorded change cases"
          detail="Concrete cases remain inspectable without pretending that one permissions example is the entire product."
          action={
            <Link href="/change-cases" className="meridian-text-link">
              Full queue
            </Link>
          }
        />

        <div className="meridian-table-wrap">
          <table className="meridian-data-table meridian-queue-table">
            <thead>
              <tr>
                <th>Case</th>
                <th>Semantic action</th>
                <th>Subject</th>
                <th>Authority change</th>
                <th>Closure</th>
                <th>Receipt</th>
                <th aria-label="Open case" />
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <StatusBadge tone="success">VERIFIED</StatusBadge>
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
                  <span className="meridian-inline-state" data-tone="success">
                    <span />
                    Exact durable readback
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
            title="APPLIED is not VERIFIED"
            detail="The shared proof standard separates reviewed intent, fresh state, execution, evidence, and durable closure."
          />

          <div className="meridian-control-posture">
            <div>
              <span className="meridian-posture-index">01</span>
              <div>
                <strong>PREFLIGHT</strong>
                <p>
                  Bind action identity, exact target, expected delta, risk,
                  reversibility, authority, and required evidence.
                </p>
              </div>
            </div>
            <div>
              <span className="meridian-posture-index">02</span>
              <div>
                <strong>REVALIDATE + APPLY</strong>
                <p>
                  Fresh authoritative state must still match before one
                  fixed-purpose server contract may dispatch.
                </p>
              </div>
            </div>
            <div>
              <span className="meridian-posture-index">03</span>
              <div>
                <strong>PROVE</strong>
                <p>
                  Every REQUIRED action-specific evidence result must PASS.
                  Ambiguous dispatch is reconciled instead of blindly retried.
                </p>
              </div>
            </div>
            <div>
              <span className="meridian-posture-index">04</span>
              <div>
                <strong>PERSIST + READ BACK</strong>
                <p>
                  Action Receipt V2 must persist and read back exactly from
                  IRIS before VERIFIED is defensible.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="meridian-control-section">
          <SectionHeader
            eyebrow="Authority boundary"
            title="Evidence, not browser privilege"
            detail="The public-facing surface presents evidence and supported intent without widening privileged mutation authority."
          />

          <AuthorityCallout
            eyebrow="Bounded server authority"
            title="No generic browser mutation proxy"
            detail="Certified mutations execute through fixed-purpose server contracts. Credentials, transport selection, authority expressions, and proof standards stay server-side."
            tone="info"
          />

          <div className="meridian-control-boundary-stats">
            <MetricCell
              label="Browser generic mutation authority"
              value="None"
              detail="No arbitrary privileged payload"
            />
            <MetricCell
              label="Durable closure"
              value="Exact"
              detail="Persist + canonical IRIS readback"
            />
          </div>
        </div>
      </section>

      <section className="meridian-control-section">
        <SectionHeader
          eyebrow="Certified control-plane breadth"
          title="Management surfaces"
          detail="Permissions, processes, tasks, and web applications have fixed-purpose certified actions; Logs and Security remain evidence/read surfaces."
        />

        <div className="meridian-surface-ledger">
          <Link href="/change-cases" aria-label="Explore Permissions change cases">
            <span className="meridian-surface-state" aria-hidden="true" />
            <span>
              <strong>Permissions</strong>
              <small>Recorded change cases, live authority, audit, receipts</small>
            </span>
            <span className="meridian-surface-boundary">
              P01-P06 certified actions
            </span>
            <span className="meridian-surface-open" aria-hidden="true">
              -&gt;
            </span>
          </Link>

          <Link href="/system" aria-label="Explore OS / System">
            <span className="meridian-surface-state" aria-hidden="true" />
            <span>
              <strong>OS / System</strong>
              <small>Runtime identity, pressure, locks, process evidence</small>
            </span>
            <span className="meridian-surface-boundary">
              O01-O03 certified actions
            </span>
            <span className="meridian-surface-open" aria-hidden="true">
              -&gt;
            </span>
          </Link>

          <Link href="/tasks" aria-label="Explore Task Management">
            <span className="meridian-surface-state" aria-hidden="true" />
            <span>
              <strong>Task Management</strong>
              <small>Configured schedules, state, next execution, history</small>
            </span>
            <span className="meridian-surface-boundary">
              T01-T06 certified actions
            </span>
            <span className="meridian-surface-open" aria-hidden="true">
              -&gt;
            </span>
          </Link>

          <Link href="/web-rest" aria-label="Explore Web Apps / REST">
            <span className="meridian-surface-state" aria-hidden="true" />
            <span>
              <strong>Web Apps &amp; REST</strong>
              <small>Application identity, deployed routes, protection proof</small>
            </span>
            <span className="meridian-surface-boundary">
              W01-W04 certified actions
            </span>
            <span className="meridian-surface-open" aria-hidden="true">
              -&gt;
            </span>
          </Link>

          <Link href="/logs" aria-label="Explore Logs">
            <span className="meridian-surface-state" aria-hidden="true" />
            <span>
              <strong>Logs</strong>
              <small>Operational evidence by source, severity, and time</small>
            </span>
            <span className="meridian-surface-boundary">
              Narrow read evidence
            </span>
            <span className="meridian-surface-open" aria-hidden="true">
              -&gt;
            </span>
          </Link>

          <Link href="/security-secrets" aria-label="Explore Security / Secrets">
            <span className="meridian-surface-state" aria-hidden="true" />
            <span>
              <strong>Security &amp; Secrets</strong>
              <small>Approved metadata and explicit secret boundaries</small>
            </span>
            <span className="meridian-surface-boundary">
              Read metadata; mutation breadth not claimed
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
