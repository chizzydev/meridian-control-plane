import Link from "next/link";

import {
  AuthorityCallout,
  CodeValue,
  KeyValueInspector,
  MetricCell,
  PageHeader,
  SectionHeader,
  StatusBadge,
} from "@/components/meridian/primitives";
import {
  readSystemSurfaceFromEnvironment,
} from "@/lib/iris/system-product-server";

export const dynamic =
  "force-dynamic";

function textValue(
  value: unknown,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "-";
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  return "[structured]";
}

function pick(
  row: Record<string, unknown>,
  keys: readonly string[],
): string {
  for (const key of keys) {
    if (
      row[key] !== undefined &&
      row[key] !== null
    ) {
      return textValue(row[key]);
    }
  }

  return "-";
}

const processActions = [
  {
    id: "O01",
    action: "SUSPEND",
    risk: "Bounded process state transition",
    closure: "Exact process identity + action-specific evidence + durable receipt",
  },
  {
    id: "O02",
    action: "RESUME",
    risk: "Bounded restoration",
    closure: "Same reviewed process identity + action-specific evidence + durable receipt",
  },
  {
    id: "O03",
    action: "TERMINATE",
    risk: "HIGH / IRREVERSIBLE",
    closure: "No blind retry after ambiguous dispatch; dual authoritative absence + exact durable receipt readback",
  },
] as const;

export default async function SystemPage() {
  const surface =
    await readSystemSurfaceFromEnvironment();

  const usageEntries =
    surface.systemUsage
      ? Object.entries(
          surface.systemUsage,
        ).slice(0, 12)
      : [];

  return (
    <main className="meridian-runtime-page">
      <PageHeader
        eyebrow="Runtime / OS / SYSTEM"
        title="Runtime evidence with bounded process actions."
        description="This browser route remains a read-only evidence surface for live IRIS resource, memory, lock, and process state. O01-O03 execute only through separate fixed-purpose server contracts."
        actions={
          <>
            <Link href="/" className="meridian-action">
              Control room
            </Link>
            <StatusBadge tone="success">READ ONLY</StatusBadge>
            <StatusBadge>BOUNDED SERVER AUTHORITY</StatusBadge>
          </>
        }
      />

      <section className="meridian-runtime-section">
        <SectionHeader
          eyebrow="Certified process actions"
          title="O01 suspend. O02 resume. O03 terminate."
          detail="Three semantic actions share the same proof discipline without exposing an unrestricted browser process-control console."
          action={
            <Link
              href="/proof?receiptId=meridian-o03-process-terminate-r8-a-001"
              className="meridian-text-link"
            >
              Inspect O03 receipt
            </Link>
          }
        />

        <div className="meridian-table-wrap">
          <table className="meridian-data-table meridian-authority-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Semantic operation</th>
                <th>Contract posture</th>
                <th>Closure boundary</th>
              </tr>
            </thead>
            <tbody>
              {processActions.map((item) => (
                <tr key={item.id}>
                  <td><CodeValue>{item.id}</CodeValue></td>
                  <td><strong>{item.action}</strong></td>
                  <td>{item.risk}</td>
                  <td>{item.closure}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <AuthorityCallout
          eyebrow="O03 non-deviation boundary"
          title="Termination never becomes a PID-only or blind-retry operation"
          detail="The certified O03 target binds exact process identity beyond PID, records HIGH risk and IRREVERSIBLE recovery semantics, reconciles UNKNOWN_AFTER_DISPATCH instead of automatically retrying, requires dual authoritative absence, and reaches VERIFIED only after Action Receipt V2 persists and reads back exactly."
          tone="info"
        />
      </section>

      <section className="meridian-runtime-section">
        <SectionHeader
          eyebrow="Authority boundary"
          title="Read evidence and process execution remain separate"
          detail="MeridianSystemMetadataReader supplies bounded runtime evidence. Certified O01-O03 execution uses separate fixed-purpose server contracts; neither becomes a generic browser mutation proxy."
        />

        <div className="meridian-table-wrap">
          <table className="meridian-data-table meridian-authority-table">
            <thead>
              <tr>
                <th>Boundary</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Evidence-read role</td>
                <td><CodeValue>MeridianSystemMetadataReader</CodeValue></td>
              </tr>
              <tr>
                <td>Evidence-read resources</td>
                <td><CodeValue>%Admin_Operate:U + %DB_IRISSYS:R</CodeValue></td>
              </tr>
              <tr>
                <td>%Admin_Manage</td>
                <td><StatusBadge tone="success">NOT GRANTED</StatusBadge></td>
              </tr>
              <tr>
                <td>Browser process controls</td>
                <td><StatusBadge tone="success">NONE</StatusBadge></td>
              </tr>
              <tr>
                <td>Generic mutation proxy</td>
                <td><StatusBadge tone="success">NONE</StatusBadge></td>
              </tr>
              <tr>
                <td>Browser privileged credential</td>
                <td>NOT EXPOSED</td>
              </tr>
              <tr>
                <td>Certified execution</td>
                <td><CodeValue>O01 / O02 / O03 fixed-purpose server contracts</CodeValue></td>
              </tr>
              <tr>
                <td>Target binding</td>
                <td>Exact process identity; PID alone is insufficient</td>
              </tr>
              <tr>
                <td>Ambiguous dispatch</td>
                <td>RECONCILE; NO BLIND RETRY</td>
              </tr>
              <tr>
                <td>Surface mode</td>
                <td>READ ONLY EVIDENCE</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {!surface.ok ? (
        <section className="meridian-runtime-section">
          <AuthorityCallout
            eyebrow="Safe failure boundary"
            title="Live OS / System metadata unavailable"
            detail="Meridian fails closed when live system evidence cannot be read. No mutation fallback or generic operational proxy is introduced."
            tone="warning"
          >
            <CodeValue>{surface.reason}</CodeValue>
          </AuthorityCallout>

          <KeyValueInspector
            rows={[
              {
                label: "Fallback mutation",
                value: "NONE",
              },
              {
                label: "Generic operational proxy",
                value: "NONE",
              },
              {
                label: "Browser credential",
                value: "NOT EXPOSED",
              },
              {
                label: "%Admin_Manage",
                value: "NOT GRANTED",
              },
            ]}
          />
        </section>
      ) : (
        <>
          <section className="meridian-runtime-metrics" aria-label="System runtime summary">
            <MetricCell
              label="Runtime processes"
              value={surface.processes.length}
              detail="certified ProcessQuery read fallback"
            />
            <MetricCell
              label="Current locks"
              value={surface.locks.length}
              detail="current lock rows"
            />
            <MetricCell
              label="System resources"
              value={surface.systemResources.length}
              detail="official SysAdmin rows"
            />
            <MetricCell
              label="Shared memory"
              value={surface.sharedMemory.length}
              detail="live memory signals"
            />
          </section>

          <section className="meridian-runtime-section">
            <SectionHeader
              eyebrow="Process visibility"
              title="Runtime processes"
              detail="The official /v2/processes inventory-read endpoint produced a certified server-side INVALID OREF failure on pinned Build 221U, so this evidence surface uses the read-only %SYS.ProcessQuery fallback. That read-path fallback is separate from the certified O01-O03 mutation contracts."
            />

            <div className="meridian-table-wrap">
              <table className="meridian-data-table meridian-process-table">
                <thead>
                  <tr>
                    <th>PID</th>
                    <th>User</th>
                    <th>Namespace</th>
                    <th>Started UTC</th>
                    <th>Client IP</th>
                  </tr>
                </thead>
                <tbody>
                  {surface.processes.slice(0, 25).map((process, index) => (
                    <tr key={`${process.pid ?? "unknown"}-${index}`}>
                      <td>
                        <CodeValue>{process.pid ?? "-"}</CodeValue>
                      </td>
                      <td>{process.username ?? "-"}</td>
                      <td>{process.namespace ?? "-"}</td>
                      <td>
                        <CodeValue>{process.startTimeUtc ?? "-"}</CodeValue>
                      </td>
                      <td>
                        <CodeValue>{process.clientIp ?? process.startupClientIp ?? "-"}</CodeValue>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="meridian-runtime-section">
            <SectionHeader
              eyebrow="Current locks"
              title="Lock visibility"
              detail="Current lock evidence remains read-only. O01 suspend, O02 resume, and O03 terminate are certified server contracts, not controls on this page."
            />

            <div className="meridian-table-wrap">
              <table className="meridian-data-table meridian-lock-table">
                <thead>
                  <tr>
                    <th>PID</th>
                    <th>Reference</th>
                    <th>Mode</th>
                    <th>Routine</th>
                  </tr>
                </thead>
                <tbody>
                  {surface.locks.slice(0, 12).map((row, index) => (
                    <tr key={`${pick(row, ["Pid", "pid"])}-${index}`}>
                      <td>
                        <CodeValue>{pick(row, ["Pid", "pid"])}</CodeValue>
                      </td>
                      <td>
                        <CodeValue>{pick(row, ["Reference", "reference"])}</CodeValue>
                      </td>
                      <td>{pick(row, ["ModeCount", "modeCount"])}</td>
                      <td>{pick(row, ["RoutineInfo", "routineInfo"])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="meridian-runtime-section">
            <SectionHeader
              eyebrow="System resource signals"
              title="Resource pressure"
              detail="Official SysAdmin REST evidence, shown as repeatable runtime records."
            />

            <div className="meridian-table-wrap">
              <table className="meridian-data-table meridian-runtime-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Busy</th>
                    <th>Seize</th>
                    <th>Nseize</th>
                    <th>Aseize</th>
                    <th>Bseize</th>
                  </tr>
                </thead>
                <tbody>
                  {surface.systemResources.slice(0, 20).map((row, index) => (
                    <tr key={`${pick(row, ["Name", "name"])}-${index}`}>
                      <td>
                        <strong>{pick(row, ["Name", "name"])}</strong>
                      </td>
                      <td>{pick(row, ["BusySet", "busySet"])}</td>
                      <td>{pick(row, ["Seize", "seize"])}</td>
                      <td>{pick(row, ["Nseize", "nseize"])}</td>
                      <td>{pick(row, ["Aseize", "aseize"])}</td>
                      <td>{pick(row, ["Bseize", "bseize"])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="meridian-runtime-split">
            <div className="meridian-runtime-section">
              <SectionHeader
                eyebrow="System usage"
                title="Live counters"
                detail="Current server-reported system usage values."
              />

              <div className="meridian-table-wrap">
                <table className="meridian-data-table meridian-runtime-table" style={{ minWidth: 0, tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                      <th>Counter</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageEntries.map(([key, value]) => (
                      <tr key={key}>
                        <td>
                          <CodeValue>{key}</CodeValue>
                        </td>
                        <td>
                          <CodeValue>{textValue(value)}</CodeValue>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="meridian-runtime-section">
              <SectionHeader
                eyebrow="Shared memory"
                title="Allocation signals"
                detail="Allocated, used, and available shared-memory evidence."
              />

              <div className="meridian-table-wrap">
                <table className="meridian-data-table meridian-runtime-table" style={{ minWidth: 0, tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Allocated</th>
                      <th>Used</th>
                      <th>Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {surface.sharedMemory.slice(0, 10).map((row, index) => (
                      <tr key={`${pick(row, ["Description", "description"])}-${index}`}>
                        <td>
                          <strong>{pick(row, ["Description", "description"])}</strong>
                        </td>
                        <td>{pick(row, ["SMHAllocated", "smhAllocated"])}</td>
                        <td>{pick(row, ["SMHUsed", "smhUsed"])}</td>
                        <td>{pick(row, ["SMHAvailable", "smhAvailable"])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
