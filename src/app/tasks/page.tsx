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
  readTaskManagementSurfaceFromEnvironment,
} from "@/lib/iris/task-management-product-server";

export const dynamic =
  "force-dynamic";

export default async function TasksPage() {
  const surface =
    await readTaskManagementSurfaceFromEnvironment();

  return (
    <main className="meridian-runtime-page">
      <PageHeader
        eyebrow="Runtime / TASK MANAGEMENT"
        title="Scheduled work, current state, and execution history in one operator view."
        description="Meridian reads official IRIS Task Manager metadata through narrow server-owned escalation. Permissions remains the centerpiece; task mutation and broad operational authority stay absent."
        actions={
          <>
            <Link href="/" className="meridian-action">
              Control room
            </Link>
            <StatusBadge tone="success">READ ONLY</StatusBadge>
            <StatusBadge>EXPLICIT TASK ESCALATION</StatusBadge>
          </>
        }
      />

      <section className="meridian-runtime-section">
        <SectionHeader
          eyebrow="Authority"
          title="Task metadata boundary"
          detail="Official SysAdmin REST reads are separated from task mutation authority."
        />

        <div className="meridian-table-wrap">
          <table className="meridian-data-table meridian-authority-table">
            <thead>
              <tr>
                <th>Boundary</th>
                <th>Value</th>
                <th>Interpretation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Escalation role</td>
                <td><CodeValue>MeridianTaskMetadataReader</CodeValue></td>
                <td>%Admin_Task:U only. No %Admin_Operate grant.</td>
              </tr>
              <tr>
                <td>Source</td>
                <td>Official SysAdmin REST</td>
                <td>Task inventory, manager state, upcoming schedule, and execution history.</td>
              </tr>
              <tr>
                <td>Task mutation controls</td>
                <td><StatusBadge tone="success">NONE</StatusBadge></td>
                <td>No run, suspend, resume, create, edit, or delete controls.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {surface.status === "unavailable" ? (
        <section className="meridian-runtime-section">
          <AuthorityCallout
            eyebrow="Safe failure boundary"
            title="Live task metadata unavailable"
            detail="The server-owned task read failed closed. Meridian exposes no task-mutation fallback and no broad operational proxy."
            tone="warning"
          >
            <CodeValue>{surface.reason}</CodeValue>
            <p>{surface.message}</p>
          </AuthorityCallout>

          <div className="meridian-table-wrap">
            <table className="meridian-data-table meridian-authority-table">
              <thead>
                <tr>
                  <th>Boundary</th>
                  <th>Failure posture</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Fallback task mutation</td>
                  <td>NONE</td>
                </tr>
                <tr>
                  <td>Public task proxy</td>
                  <td>NONE</td>
                </tr>
                <tr>
                  <td>Broad operate authority</td>
                  <td>NOT GRANTED</td>
                </tr>
                <tr>
                  <td>Browser credential</td>
                  <td>NOT EXPOSED</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <>
          <section className="meridian-runtime-metrics" aria-label="Task runtime summary">
            <MetricCell
              label={`Task Manager ${surface.managerStatus}`}
              value={surface.tasks.length}
              detail="configured tasks"
            />
            <MetricCell
              label="Upcoming schedule"
              value={surface.upcoming.length}
              detail="upcoming executions"
            />
            <MetricCell
              label="Execution history"
              value={surface.history.length}
              detail="recent history rows"
            />
            <MetricCell
              label="%Admin_Operate"
              value={surface.authority.adminOperateGranted ? "GRANTED" : "NOT GRANTED"}
              detail="broad authority remains absent"
            />
          </section>

          <section className="meridian-runtime-section">
            <SectionHeader
              eyebrow="Task inventory"
              title={`${surface.tasks.length} configured tasks`}
              detail="Current suspension state, Last finished, and Next scheduled remain visible as repeatable operational records."
            />

            <div className="meridian-table-wrap">
              <table className="meridian-data-table meridian-task-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Task</th>
                    <th>Type</th>
                    <th>Namespace</th>
                    <th>State</th>
                    <th>Next scheduled</th>
                    <th>Last finished</th>
                  </tr>
                </thead>
                <tbody>
                  {surface.tasks.length === 0 ? (
                    <tr>
                      <td colSpan={7}>No configured task rows are visible.</td>
                    </tr>
                  ) : (
                    surface.tasks.map((task) => (
                      <tr key={task.id}>
                        <td><CodeValue>{task.id}</CodeValue></td>
                        <td>
                          <strong>{task.name || "Unnamed task"}</strong>
                          <small>{task.description || "No description"}</small>
                        </td>
                        <td>{task.type || "Unknown type"}</td>
                        <td>{task.namespace || "Unknown namespace"}</td>
                        <td>
                          <StatusBadge tone={task.suspended ? "warning" : "success"}>
                            {task.suspended ? "SUSPENDED" : "ACTIVE"}
                          </StatusBadge>
                        </td>
                        <td><CodeValue>{task.nextScheduled || "NOT SCHEDULED"}</CodeValue></td>
                        <td><CodeValue>{task.lastFinished || "NEVER"}</CodeValue></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="meridian-runtime-section">
            <SectionHeader
              eyebrow="Upcoming schedule"
              title={`${surface.upcoming.length} upcoming executions`}
              detail="Scheduled task executions from the live Task Manager surface."
            />

            <div className="meridian-table-wrap">
              <table className="meridian-data-table meridian-task-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Task</th>
                    <th>Namespace</th>
                    <th>Scheduled</th>
                    <th>State</th>
                  </tr>
                </thead>
                <tbody>
                  {surface.upcoming.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No upcoming task executions are visible.</td>
                    </tr>
                  ) : (
                    surface.upcoming.map((task) => (
                      <tr key={`${task.id}:${task.datetime}`}>
                        <td><CodeValue>{task.id}</CodeValue></td>
                        <td><strong>{task.name || `Task #${task.id}`}</strong></td>
                        <td>{task.namespace || "Unknown namespace"}</td>
                        <td><CodeValue>{task.datetime || "No scheduled datetime"}</CodeValue></td>
                        <td>
                          <StatusBadge tone={task.suspended ? "warning" : "neutral"}>
                            {task.suspended ? "SUSPENDED" : "SCHEDULED"}
                          </StatusBadge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="meridian-runtime-section">
            <SectionHeader
              eyebrow="Execution history"
              title={`${surface.history.length} recent history rows`}
              detail="Recent outcomes from the official Task Manager history surface."
            />

            <div className="meridian-table-wrap">
              <table className="meridian-data-table meridian-task-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Namespace</th>
                    <th>Started</th>
                    <th>Completed</th>
                    <th>Result</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {surface.history.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No task execution history rows are visible.</td>
                    </tr>
                  ) : (
                    surface.history.map((row, index) => (
                      <tr key={`${row.taskId}:${row.lastStart}:${index}`}>
                        <td><strong>{row.name || `Task #${row.taskId}`}</strong></td>
                        <td>{row.namespace || "Unknown namespace"}</td>
                        <td><CodeValue>{row.lastStart || "UNKNOWN"}</CodeValue></td>
                        <td><CodeValue>{row.completed || "UNKNOWN"}</CodeValue></td>
                        <td>{row.result || "No result text"}</td>
                        <td>{row.status || "UNKNOWN"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <section className="meridian-runtime-section">
        <SectionHeader
          eyebrow="Non-deviation boundary"
          title="Read-only task authority"
          detail="The task surface exposes metadata, not a public scheduler or operator console."
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
              <tr><td>Task mutation controls</td><td>NONE</td></tr>
              <tr><td>%Admin_Operate</td><td>NOT GRANTED</td></tr>
              <tr><td>Public task proxy</td><td>NONE</td></tr>
              <tr><td>Browser credential</td><td>NOT EXPOSED</td></tr>
              <tr><td>Default runtime role</td><td>UNCHANGED</td></tr>
              <tr><td>Authority mode</td><td>EXPLICIT ESCALATION</td></tr>
              <tr><td>Product mode</td><td>READ ONLY</td></tr>
              <tr><td>Permissions centerpiece</td><td>PRESERVED</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
