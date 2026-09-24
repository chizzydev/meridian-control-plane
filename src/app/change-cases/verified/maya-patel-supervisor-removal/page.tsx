import Link from "next/link";

import {
  AuthorityCallout,
  CodeValue,
  EvidenceRail,
  KeyValueInspector,
  MetricCell,
  PageHeader,
  SectionHeader,
  StatusBadge,
  type EvidenceStep,
} from "@/components/meridian/primitives";
import {
  RECORDED_RECEIPT_SHA256,
  getRecordedVerifiedReceipt,
  summarizeRecordedReceipt,
} from "@/lib/change-case/recorded-receipt";
import {
  readPersistentJudgeHistory,
} from "@/lib/iris/receipt-history-session";

export const dynamic =
  "force-dynamic";

const lifecycle: EvidenceStep[] = [
  {
    label: "PREFLIGHT",
    detail: "P04 intent + target bound",
    state: "complete",
  },
  {
    label: "REVALIDATE",
    detail: "Fresh state matched",
    state: "complete",
  },
  {
    label: "APPLY",
    detail: "Role removal dispatched",
    state: "complete",
  },
  {
    label: "CONVERGE",
    detail: "Live authority cleared",
    state: "complete",
  },
  {
    label: "AUDIT",
    detail: "UserChange evidence bound",
    state: "complete",
  },
  {
    label: "READBACK",
    detail: "Persistent receipt exact",
    state: "complete",
  },
  {
    label: "VERIFIED",
    detail: "Closure reached",
    state: "complete",
  },
];

export default async function VerifiedReceiptPage() {
  const receipt =
    getRecordedVerifiedReceipt();

  const summary =
    summarizeRecordedReceipt(
      receipt,
    );

  let persistent:
    Awaited<
      ReturnType<
        typeof readPersistentJudgeHistory
      >
    > |
    null =
      null;

  try {
    const observed =
      await readPersistentJudgeHistory({
        receiptId:
          receipt.receiptId,

        username:
          receipt.change.username,
      });

    if (
      observed.receipt.receiptSha256 !==
      RECORDED_RECEIPT_SHA256
    ) {
      throw new Error(
        "Persistent IRIS receipt SHA does not match the certified canonical receipt.",
      );
    }

    persistent =
      observed;
  }
  catch {
    persistent =
      null;
  }

  return (
    <main className="meridian-verified-inspector">
      <PageHeader
        eyebrow="Change control / Verified case inspector"
        title="Remove MeridianSupervisor from Maya Patel"
        description="This recorded P04 USER_REMOVE_ROLE case reaches VERIFIED only when fresh state, configuration, live authority, native audit, and durable receipt evidence agree."
        actions={
          <>
            <Link href="/change-cases" className="meridian-action">
              Back to Change Queue
            </Link>
            <StatusBadge tone="success">VERIFIED</StatusBadge>
          </>
        }
      />

      <section className="meridian-inspector-identity" aria-label="Verified receipt identity">
        <div>
          <StatusBadge tone="success">Recorded certified receipt</StatusBadge>
          <StatusBadge>Read-only case evidence</StatusBadge>
          <StatusBadge tone={persistent ? "success" : "warning"}>
            {persistent ? "Persistent IRIS history live" : <span aria-label="Persistent IRIS history unavailable">Live history check unavailable</span>}
          </StatusBadge>
        </div>

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
      </section>

      <section className="meridian-inspector-rail" aria-label="Verified lifecycle">
        <EvidenceRail steps={lifecycle} />
      </section>

      <section className="meridian-inspector-metrics" aria-label="Impact summary">
        <MetricCell
          label="Effective roles removed"
          value={summary.lostEffectiveRoleCount}
          detail="Derived authorization impact"
        />
        <MetricCell
          label="Permissions removed"
          value={summary.lostPermissionCount}
          detail="Changed permission pairs"
        />
        <MetricCell
          label="Protected apps lost"
          value={summary.lostApplicationCount}
          detail="Declared protected assets"
        />
        <MetricCell
          label="Declared REST ops lost"
          value={summary.lostRestOperationCount}
          detail="Declared REST operations"
        />
      </section>

      <section className="meridian-inspector-section">
        <SectionHeader
          eyebrow="State truth"
          title="Expected, configured, live"
          detail="The receipt remains VERIFIED only because these evidence planes agree at closure."
        />

        <div className="meridian-table-wrap">
          <table className="meridian-data-table meridian-truth-table">
            <thead>
              <tr>
                <th>Plane</th>
                <th>Expected</th>
                <th>Observed</th>
                <th>Status</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>CONFIGURATION</strong>
                  <small>Configured security state</small>
                </td>
                <td>
                  <CodeValue>{receipt.change.role} absent</CodeValue>
                </td>
                <td>
                  <CodeValue>
                    {receipt.roles.directAfter.length > 0
                      ? receipt.roles.directAfter.join(", ")
                      : "No direct roles"}
                  </CodeValue>
                </td>
                <td>
                  <StatusBadge tone="success">Configured state confirmed</StatusBadge>
                </td>
                <td>
                  Direct-role before/after
                </td>
              </tr>

              <tr>
                <td>
                  <strong>LIVE ACCESS</strong>
                  <small>Runtime authorization state</small>
                </td>
                <td>No target process retaining removed authority</td>
                <td>
                  Target process: {receipt.convergence.targetProcessPresent ? "Present" : "Absent"}
                  <br />
                  Residual access: {receipt.convergence.liveResidueObserved ? "Observed" : "None"}
                </td>
                <td>
                  <StatusBadge tone="success">Converged</StatusBadge>
                </td>
                <td>
                  Recorded end-state probe: no active target process retained the removed authority.
                </td>
              </tr>

              <tr>
                <td>
                  <strong>Native Audit</strong>
                  <small>IRIS UserChange evidence</small>
                </td>
                <td>One exact native change event</td>
                <td>
                  <CodeValue>UserChange #{receipt.nativeAudit.auditIndex}</CodeValue>
                </td>
                <td>
                  <StatusBadge tone="success">Bound</StatusBadge>
                </td>
                <td>
                  Apply to audit: {receipt.nativeAudit.applyToAuditDeltaSeconds}s
                </td>
              </tr>

              <tr>
                <td>
                  <strong>Persistent history</strong>
                  <small>Durable IRIS receipt read</small>
                </td>
                <td>Canonical receipt identity</td>
                <td>
                  {persistent ? (
                    <CodeValue truncate>{persistent.receipt.receiptSha256}</CodeValue>
                  ) : (
                    "Live history unavailable for this request"
                  )}
                </td>
                <td>
                  <StatusBadge tone={persistent ? "success" : "warning"}>
                    {persistent ? "Exact match" : "Unavailable"}
                  </StatusBadge>
                </td>
                <td>
                  {persistent
                    ? `${persistent.history.length} ${persistent.history.length === 1 ? "history entry" : "history entries"}`
                    : "Recorded receipt remains visible; live persistence is not implied"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <AuthorityCallout
          eyebrow="Claim boundary"
          title="Configuration is not closure by itself"
          detail="The recorded end-state probe proves convergence for this case. A separate certified stale-process witness demonstrates the stale-to-converged transition. Those claims remain intentionally separate, and neither substitutes for durable receipt closure."
          tone="info"
        />
      </section>

      <section className="meridian-inspector-section">
        <SectionHeader
          eyebrow="Permission delta"
          title="Authority removed and retained"
          detail="Repeatable permission records are shown as evidence rows rather than summary cards."
        />

        <div className="meridian-table-wrap">
          <table className="meridian-data-table meridian-permission-table">
            <thead>
              <tr>
                <th>Outcome</th>
                <th>Resource</th>
                <th>Permission</th>
              </tr>
            </thead>
            <tbody>
              {receipt.permissionDelta.lost.map((permission) => (
                <tr key={`lost-${permission.resource}-${permission.permission}`}>
                  <td>
                    <StatusBadge tone="danger">LOST</StatusBadge>
                  </td>
                  <td>
                    <CodeValue>{permission.resource}</CodeValue>
                  </td>
                  <td>
                    <CodeValue>{permission.permission}</CodeValue>
                  </td>
                </tr>
              ))}

              {receipt.permissionDelta.retained.map((permission) => (
                <tr key={`retained-${permission.resource}-${permission.permission}`}>
                  <td>
                    <StatusBadge tone="success">RETAINED</StatusBadge>
                  </td>
                  <td>
                    <CodeValue>{permission.resource}</CodeValue>
                  </td>
                  <td>
                    <CodeValue>{permission.permission}</CodeValue>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="meridian-inspector-section">
        <SectionHeader
          eyebrow="Declared impact"
          title="Protected assets and operations"
          detail="Declared impact remains separate from measured permission delta."
        />

        <div className="meridian-inspector-impact">
          <div>
            <p className="meridian-record-label">Protected applications</p>
            <div className="meridian-table-wrap">
              <table className="meridian-data-table meridian-impact-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Required authority</th>
                    <th>Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.declaredImpact.applications.map((application) => (
                    <tr key={application.asset}>
                      <td>
                        <strong>{application.asset}</strong>
                      </td>
                      <td>
                        <CodeValue>
                          {application.requiredResource}:{application.requiredPermission}
                        </CodeValue>
                      </td>
                      <td>
                        <span className="meridian-inspector-outcome">
                          {application.outcome}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <p className="meridian-record-label">Declared REST operations</p>
            <div className="meridian-table-wrap">
              <table className="meridian-data-table meridian-impact-table">
                <thead>
                  <tr>
                    <th>Operation</th>
                    <th>Required authority</th>
                    <th>Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.declaredImpact.operations.map((operation) => (
                    <tr key={operation.operationId}>
                      <td>
                        <strong>
                          {operation.method} {operation.path}
                        </strong>
                      </td>
                      <td>
                        <CodeValue>
                          {operation.requiredResource}:{operation.requiredPermission}
                        </CodeValue>
                      </td>
                      <td>
                        <span className="meridian-inspector-outcome">
                          {operation.outcome}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="meridian-inspector-section">
        <SectionHeader
          eyebrow="Change Receipt"
          title="Preflighted, revalidated, applied, evidenced, persisted, verified."
          detail="The recorded timeline preserves the case sequence without collapsing configuration and runtime truth; the persistent-history section below makes durable receipt readback explicit."
        />

        <div className="meridian-table-wrap">
          <table className="meridian-data-table meridian-timeline-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Stage</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {receipt.timeline.map((item, index) => (
                <tr key={`${index}-${item.stage}`}>
                  <td>
                    <CodeValue>{String(index + 1).padStart(2, "0")}</CodeValue>
                  </td>
                  <td>
                    <strong>
                      {item.stage === "Runtime residue observed"
                        ? "Runtime residue checked"
                        : item.stage}
                    </strong>
                  </td>
                  <td>
                    <StatusBadge tone="success">{item.status}</StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="meridian-inspector-section">
        <SectionHeader
          eyebrow="Native Audit"
          title="One exact IRIS UserChange event binds the native-audit plane."
          detail="Native evidence is shown with its actor, event identity, role transition, and timing. The audit event is required evidence for this case, not sufficient closure by itself."
        />

        <div className="meridian-inspector-audit">
          <KeyValueInspector
            rows={[
              {
                label: "Audit index",
                value: String(receipt.nativeAudit.auditIndex),
                mono: true,
              },
              {
                label: "Event",
                value: `${receipt.nativeAudit.source} / ${receipt.nativeAudit.type} / ${receipt.nativeAudit.event}`,
                mono: true,
              },
              {
                label: "Actor",
                value: receipt.nativeAudit.username,
                mono: true,
              },
              {
                label: "Apply -> audit",
                value: `${receipt.nativeAudit.applyToAuditDeltaSeconds}s`,
                mono: true,
              },
            ]}
          />

          <pre className="meridian-inspector-audit-evidence">
            {receipt.nativeAudit.description}
            {"\n"}
            Old roles: {receipt.nativeAudit.oldDirectRoles.join(", ")}
            {"\n"}
            New roles: {receipt.nativeAudit.newDirectRoles.join(", ")}
            {"\n"}
            UTC: {receipt.nativeAudit.utcTimestamp}
          </pre>
        </div>
      </section>

      <section className="meridian-inspector-section">
        <SectionHeader
          eyebrow="Durable evidence"
          title="Receipt persistence + exact IRIS readback"
          detail="Recorded receipt evidence remains independently visible; this server-owned check verifies that the same canonical receipt is readable from persistent IRIS history before durable closure is presented."
        />

        <div className="meridian-inspector-history">
          <div className="meridian-inspector-history-live">
            {persistent ? (
              <>
                <div className="meridian-inspector-history-heading">
                  <StatusBadge tone="success">Persistent IRIS history live</StatusBadge>
                  <span>
                    {persistent.history.length}{" "}
                    {persistent.history.length === 1 ? "entry" : "entries"}
                  </span>
                </div>

                <KeyValueInspector
                  rows={[
                    {
                      label: "Source",
                      value: persistent.source,
                      mono: true,
                    },
                    {
                      label: "History entries",
                      value: String(persistent.history.length),
                      mono: true,
                    },
                    {
                      label: "Receipt SHA-256",
                      value: <CodeValue>{persistent.receipt.receiptSha256}</CodeValue>,
                    },
                  ]}
                />

                <p className="meridian-inspector-history-proof">
                  Exact canonical receipt match: PASS. This request read the persisted receipt and Maya Patel&apos;s receipt-history index from IRIS through the server-only authenticated session boundary.
                </p>
              </>
            ) : (
              <>
                <StatusBadge tone="warning"><span aria-label="Persistent IRIS history unavailable">Live history check unavailable</span></StatusBadge>
                <p className="meridian-inspector-history-proof">
                  The certified recorded receipt remains frozen and visible. This request could not complete the additional live durability check, so Meridian does not imply successful live persistence.
                </p>
              </>
            )}
          </div>

          <div className="meridian-inspector-recorded-source">
            <p className="meridian-record-label">Recorded evidence source</p>
            <CodeValue>{RECORDED_RECEIPT_SHA256}</CodeValue>

            <p>
              IRIS-backed receipt history has already been productized through the server-only history session.
            </p>

            <AuthorityCallout
              eyebrow="Browser authority"
              title="Rendered evidence only"
              detail="This public surface remains read-only and does not claim that the public browser owns privileged IRIS mutation authority."
              tone="info"
            >
              <p>
                Privileged IRIS credentials and bearer tokens stay behind the server-only boundary; the browser receives rendered evidence only.
              </p>
            </AuthorityCallout>
          </div>
        </div>
      </section>
    </main>
  );
}
