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

const taskActions = [
  ["T01", "CREATE", "Create a bounded task fixture"],
  ["T02", "UPDATE", "Update the reviewed task configuration"],
  ["T03", "RUN NOW", "Dispatch one reviewed task execution"],
  ["T04", "SUSPEND", "Suspend the reviewed task"],
  ["T05", "RESUME", "Resume the reviewed task"],
  ["T06", "DELETE", "Delete the reviewed task"],
] as const;

export default async function TasksPage() {
  const surface =
    await readTaskManagementSurfaceFromEnvironment();

  const certificationWitnessRows =
    surface.status === "unavailable"
      ? []
      : surface.history
          .filter((row) => {
            const name = row.name ?? "";
            const result = row.result ?? "";

            return (
              name.includes("Meridian R5") ||
              name.includes("MeridianLab.") ||
              result.includes("Meridian R5") ||
              result.includes("MeridianLab.")
            );
          })
          .slice(0, 16);

  return (
    <main className="meridian-runtime-page">
      <PageHeader
        eyebrow="Runtime / TASK MANAGEMENT"
        title="Scheduled work, state, and execution history."
        description="This route presents official IRIS Task Manager evidence through narrow server-owned reads. T01-T06 are certified fixed-purpose server actions; the browser exposes no generic task scheduler or mutation proxy."
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
          eyebrow="Certified task actions"
          title="T01-T06 cover the task-management lifecycle"
          detail="Six semantic actions are certified as fixed-purpose contracts. This evidence page does not become a generic browser scheduler."
        />

        <div className="meridian-table-wrap">
          <table className="meridian-data-table meridian-authority-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Semantic operation</th>
                <th>Contract intent</th>
              </tr>
            </thead>
            <tbody>
              {taskActions.map(([id, action, detail]) => (
                <tr key={id}>
                  <td><CodeValue>{id}</CodeValue></td>
                  <td><strong>{action}</strong></td>
                  <td>{detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <AuthorityCallout
          eyebrow="Task proof boundary"
          title="Task state and Task Manager history remain evidence, not browser authority"
          detail="T01-T06 execute through separate fixed-purpose server contracts with fresh revalidation, action-specific proof, and durable receipt closure. No generic scheduler payload is exposed."
          tone="info"
        />
      </section>

      <section className="meridian-runtime-section">
        <SectionHeader
          eyebrow="Authority boundary"
          title="Task evidence reads and certified execution remain separate"
          detail="MeridianTaskMetadataReader reads inventory and history. Certified task actions use their own fixed-purpose server contracts."
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
                <td>Evidence-read role</td>
                <td><CodeValue>MeridianTaskMetadataReader</CodeValue></td>
                <td>%Admin_Task:U only for the metadata surface; no broad %Admin_Operate grant.</td>
              </tr>
              <tr>
                <td>Evidence source</td>
                <td>Official SysAdmin REST</td>
                <td>Task inventory, manager state, upcoming schedule, and execution history.</td>
              </tr>
              <tr>
                <td>Browser task mutation controls</td>
                <td><StatusBadge tone="success">NONE</StatusBadge></td>
                <td>No run, suspend, resume, create, edit, or delete controls on this page.</td>
              </tr>
              <tr>
                <td>Generic task mutation proxy</td>
                <td><StatusBadge tone="success">NONE</StatusBadge></td>
                <td>Only fixed-purpose T01-T06 contracts are certified.</td>
              </tr>
              <tr>
                <td>Browser credential</td>
                <td><StatusBadge tone="success">NOT EXPOSED</StatusBadge></td>
                <td>Authority remains server-held.</td>
              </tr>
              <tr>
                <td>Certified execution</td>
                <td><CodeValue>T01-T06</CodeValue></td>
                <td>Fresh revalidation + action-specific evidence + durable receipt closure.</td>
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
                  <td>Generic task proxy</td>
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
              label="Configured tasks"
              value={surface.tasks.length}
              detail={`Current Task Manager inventory; ${surface.managerStatus}`}
            />
            <MetricCell
              label="Upcoming executions"
              value={surface.upcoming.length}
              detail="live schedule rows"
            />
            <MetricCell
              label="Execution history"
              value={surface.history.length}
              detail="recent Task Manager history rows"
            />
            <MetricCell
              label="%Admin_Operate"
              value={surface.authority.adminOperateGranted ? "GRANTED" : "NOT GRANTED"}
              detail="broad evidence-reader authority remains absent"
            />
          </section>

          <section className="meridian-runtime-section">
            <SectionHeader
              eyebrow="Certification witness history"
              title={`${certificationWitnessRows.length} retained Meridian witness rows in the current history window`}
              detail="These are raw Task Manager history records created during bounded task certification work. The names remain historical evidence; the action catalog above is the judge-facing semantic map."
            />

            {certificationWitnessRows.length === 0 ? (
              <AuthorityCallout
                eyebrow="Current history window"
                title="No Meridian certification witness row is visible in the current slice"
                detail="The certified T01-T06 contracts remain product claims backed by their frozen certification evidence. This live page does not invent a witness row when Task Manager history has rolled forward."
                tone="warning"
              />
            ) : (
              <div className="meridian-table-wrap">
                <table className="meridian-data-table meridian-task-table" style={{ minWidth: 0, tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                      <th>Historical witness</th>
                      <th>Namespace</th>
                      <th>Started</th>
                      <th>Result</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificationWitnessRows.map((row, index) => (
                      <tr key={`${row.taskId}:${row.lastStart}:${index}`}>
                        <td><strong>{row.name || `Task #${row.taskId}`}</strong></td>
                        <td>{row.namespace || "Unknown namespace"}</td>
                        <td><CodeValue>{row.lastStart || "UNKNOWN"}</CodeValue></td>
                        <td>{row.result || "No result text"}</td>
                        <td>{row.status || "UNKNOWN"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="meridian-runtime-section">
            <SectionHeader
              eyebrow="Task inventory"
              title={`${surface.tasks.length} configured tasks`}
              detail="Current suspension state, last finished, and next scheduled remain visible as repeatable operational records."
            />

            <div className="meridian-table-wrap">
              <table className="meridian-data-table meridian-task-table" style={{ minWidth: 0, tableLayout: "fixed" }}>
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
              <table className="meridian-data-table meridian-task-table" style={{ minWidth: 0, tableLayout: "fixed" }}>
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
              eyebrow="Raw execution history"
              title={`${surface.history.length} recent history rows`}
              detail="The complete current history slice remains visible as forensic evidence below the certification-witness summary."
            />

            <div className="meridian-table-wrap">
              <table className="meridian-data-table meridian-task-table" style={{ minWidth: 0, tableLayout: "fixed" }}>
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
          title="Read-only evidence surface, certified task actions"
          detail="The browser exposes task evidence; T01-T06 remain fixed-purpose server contracts, not a generic scheduler."
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
              <tr><td>Browser task mutation controls</td><td>NONE</td></tr>
              <tr><td>%Admin_Operate</td><td>NOT GRANTED TO EVIDENCE READER</td></tr>
              <tr><td>Generic task mutation proxy</td><td>NONE</td></tr>
              <tr><td>Browser credential</td><td>NOT EXPOSED</td></tr>
              <tr><td>Default runtime role</td><td>UNCHANGED</td></tr>
              <tr><td>Authority mode</td><td>BOUNDED SERVER AUTHORITY</td></tr>
              <tr><td>Surface mode</td><td>READ ONLY EVIDENCE</td></tr>
              <tr><td>Certified task actions</td><td>T01-T06</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
