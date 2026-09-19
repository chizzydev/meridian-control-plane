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
        title="Runtime health without an operations console."
        description="Live IRIS resource, memory, lock, and process evidence stays server-read and operator-visible without exposing runtime mutation controls."
        actions={
          <>
            <Link href="/" className="meridian-action">
              Control room
            </Link>
            <StatusBadge tone="success">READ ONLY</StatusBadge>
            <StatusBadge>SERVER-OWNED ESCALATION</StatusBadge>
          </>
        }
      />

      {!surface.ok ? (
        <section className="meridian-runtime-section">
          <AuthorityCallout
            eyebrow="Safe failure boundary"
            title="Live OS / System metadata unavailable"
            detail="Meridian fails closed when live system evidence cannot be read. No mutation fallback or public operational proxy is introduced."
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
                label: "Public operational proxy",
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
              label="System resources"
              value={surface.systemResources.length}
              detail="official SysAdmin rows"
            />
            <MetricCell
              label="Shared memory"
              value={surface.sharedMemory.length}
              detail="live memory signals"
            />
            <MetricCell
              label="Current locks"
              value={surface.locks.length}
              detail="current lock rows"
            />
            <MetricCell
              label="Runtime processes"
              value={surface.processes.length}
              detail="certified ProcessQuery fallback"
            />
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
                <table className="meridian-data-table meridian-runtime-table">
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
                <table className="meridian-data-table meridian-runtime-table">
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

          <section className="meridian-runtime-section">
            <SectionHeader
              eyebrow="Process visibility"
              title="Runtime processes"
              detail="%SYS.ProcessQuery over external SQL is the certified read-only fallback. The official /v2/processes surface is deliberately not used on pinned Build 221U after the certified server-side INVALID OREF failure."
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
              detail="Current lock evidence is displayed without terminate, suspend, resume, or broadcast controls."
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
        </>
      )}

      <section className="meridian-runtime-section">
        <SectionHeader
          eyebrow="Authority boundary"
          title="Server-owned read authority"
          detail="The browser receives rendered runtime evidence only."
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
                <td>Escalation role</td>
                <td><CodeValue>MeridianSystemMetadataReader</CodeValue></td>
              </tr>
              <tr>
                <td>Role resources</td>
                <td><CodeValue>%Admin_Operate:U + %DB_IRISSYS:R</CodeValue></td>
              </tr>
              <tr>
                <td>%Admin_Manage</td>
                <td><StatusBadge tone="success">NOT GRANTED</StatusBadge></td>
              </tr>
              <tr>
                <td>Mutation controls</td>
                <td><StatusBadge tone="success">NONE</StatusBadge></td>
              </tr>
              <tr>
                <td>Official process endpoint</td>
                <td>REJECTED ON BUILD 221U</td>
              </tr>
              <tr>
                <td>Process fallback</td>
                <td>CERTIFIED READ ONLY</td>
              </tr>
              <tr>
                <td>Browser escalated token</td>
                <td>NOT EXPOSED</td>
              </tr>
              <tr>
                <td>Product mode</td>
                <td>READ ONLY</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
