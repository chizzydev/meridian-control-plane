import Link from "next/link";

import {
  AuthorityCallout,
  CodeValue,
  MetricCell,
  PageHeader,
  SectionHeader,
  StatusBadge,
} from "@/components/meridian/primitives";
import {
  readLogsSurfaceFromEnvironment,
} from "@/lib/iris/logs-product-server";

export const dynamic =
  "force-dynamic";

type SearchParams =
  Promise<
    Record<
      string,
      string |
        string[] |
        undefined
    >
  >;

function first(
  value:
    string |
    string[] |
    undefined,
): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return null;
}

function parseHours(
  value: string | null,
): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return (
    parsed === 1 ||
    parsed === 6 ||
    parsed === 24 ||
    parsed === 72
  )
    ? parsed
    : null;
}

export default async function LogsPage(
  props: {
    readonly searchParams: SearchParams;
  },
) {
  const searchParams =
    await props.searchParams;

  const severity =
    first(searchParams.severity);

  const source =
    first(searchParams.source);

  const hours =
    parseHours(
      first(searchParams.hours),
    );

  const surface =
    await readLogsSurfaceFromEnvironment({
      severity,
      source,
      hours,
    });

  return (
    <main className="meridian-runtime-page">
      <PageHeader
        eyebrow="Runtime / LOGS"
        title="Operational logs under narrow read authority."
        description="NON-AUDIT OPERATIONAL LOGS are read server-side through narrow SQL authority, with source identity, severity, and time filtering."
        actions={
          <>
            <Link href="/" className="meridian-action">
              Control room
            </Link>
            <StatusBadge tone="success">READ ONLY</StatusBadge>
          </>
        }
      />

      {!surface.ok ? (
        <section className="meridian-runtime-section">
          <AuthorityCallout
            eyebrow="Safe failure boundary"
            title="Live operational log read unavailable"
            detail="The live log read failed closed. No audit authority, mutation route, raw-message fallback, or browser credential is introduced."
            tone="warning"
          >
            <CodeValue>{surface.reason}</CodeValue>
          </AuthorityCallout>
        </section>
      ) : (
        <>
          <section className="meridian-runtime-metrics" aria-label="Log runtime summary">
            <MetricCell
              label="Current rows"
              value={surface.totalRows}
              detail="top 200 operational records"
            />
            <MetricCell
              label="Visible rows"
              value={surface.visibleRows}
              detail="after active filters"
            />
            <MetricCell
              label="Sources"
              value={surface.availableSources.length}
              detail="subsystem identities"
            />
            <MetricCell
              label="Severity values"
              value={surface.availableSeverities.length}
              detail="values currently observed"
            />
          </section>

          <section className="meridian-runtime-section">
            <SectionHeader
              eyebrow="Operational log filters"
              title="Source, severity, and time"
              detail="Server-side read filtering only. Filters do not create an operational mutation surface."
            />

            <form method="get" className="meridian-runtime-filter">
              <label>
                <span>Source contains</span>
                <input
                  name="source"
                  defaultValue={surface.activeFilter.source ?? ""}
                  maxLength={80}
                  placeholder="namespace, routine, category"
                />
              </label>

              <label>
                <span>Severity</span>
                <select
                  name="severity"
                  defaultValue={surface.activeFilter.severity ?? ""}
                >
                  <option value="">All severities</option>
                  {surface.availableSeverities.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Time window</span>
                <select
                  name="hours"
                  defaultValue={surface.activeFilter.hours?.toString() ?? ""}
                >
                  <option value="">All returned time</option>
                  <option value="1">Last 1 hour</option>
                  <option value="6">Last 6 hours</option>
                  <option value="24">Last 24 hours</option>
                  <option value="72">Last 72 hours</option>
                </select>
              </label>

              <div className="meridian-runtime-filter-actions">
                <button type="submit" className="meridian-action meridian-action-primary">
                  Apply read filters
                </button>
                <Link href="/logs" className="meridian-action">
                  Clear
                </Link>
              </div>
            </form>
          </section>

          {surface.currentDataState === "EMPTY" ? (
            <section className="meridian-runtime-section">
              <AuthorityCallout
                eyebrow="Empty live runtime"
                title="No operational log rows are currently present."
                detail="The read authority and schema are live-certified. Meridian does not manufacture synthetic log entries just to populate this surface."
                tone="info"
              />

              <div className="meridian-table-wrap">
                <table className="meridian-data-table meridian-authority-table">
                  <thead>
                    <tr>
                      <th>Schema signal</th>
                      <th>Field</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>Source identity</td><td>Category / Namespace / Routine</td></tr>
                    <tr><td>Severity field</td><td><CodeValue>LogLevel</CodeValue></td></tr>
                    <tr><td>Time field</td><td><CodeValue>TimeAdded</CodeValue></td></tr>
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <section className="meridian-runtime-section">
              <SectionHeader
                eyebrow="Non-audit subsystem records"
                title="Operational log exploration"
                detail="Message previews are redacted and capped before display."
              />

              <div className="meridian-table-wrap">
                <table className="meridian-data-table meridian-log-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Source</th>
                      <th>Severity</th>
                      <th>Namespace</th>
                      <th>PID</th>
                      <th>Redacted message preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {surface.logs.map((row, index) => (
                      <tr key={`${row.timeAdded ?? "unknown"}-${row.pid ?? "no-pid"}-${index}`}>
                        <td><CodeValue>{row.timeAdded ?? "-"}</CodeValue></td>
                        <td><strong>{row.source}</strong></td>
                        <td>{row.severity ?? "-"}</td>
                        <td>{row.namespace ?? "-"}</td>
                        <td><CodeValue>{row.pid ?? "-"}</CodeValue></td>
                        <td>{row.messagePreview ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      <section className="meridian-runtime-section">
        <SectionHeader
          eyebrow="Authority boundary"
          title="Narrow non-audit read authority"
          detail="Operational logs stay distinct from Security audit authority and from any mutation control."
        />

        <div className="meridian-table-wrap">
          <table className="meridian-data-table meridian-authority-table">
            <thead>
              <tr>
                <th>Boundary</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>SQL object</td><td><CodeValue>%Library.SysLogTable</CodeValue></td></tr>
              <tr><td>Retained privilege</td><td>SELECT ONLY</td></tr>
              <tr><td>Security audit</td><td>DISTINCT AUTHORITY</td></tr>
              <tr><td>Log mutation controls</td><td>NONE</td></tr>
              <tr><td>Browser credential</td><td>NOT EXPOSED</td></tr>
              <tr><td>Raw message output</td><td>NEVER</td></tr>
              <tr><td>Transport</td><td>SERVER-ONLY DBAPI</td></tr>
              <tr><td>Product mode</td><td>READ ONLY</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
