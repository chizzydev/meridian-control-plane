import Link
  from "next/link";

import {
  readTaskManagementSurfaceFromEnvironment,
} from "@/lib/iris/task-management-product-server";

export const dynamic =
  "force-dynamic";

export default async function TasksPage() {
  const surface =
    await readTaskManagementSurfaceFromEnvironment();

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8 sm:px-10 sm:py-12">
      <Link
        href="/"
        className="text-sm text-white/45 transition hover:text-white"
      >
        ← Meridian Control Plane
      </Link>

      <header className="mt-8 border-b border-white/10 pb-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
            TASK MANAGEMENT
          </span>

          <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">
            READ ONLY
          </span>

          <span className="rounded-full border border-sky-300/25 bg-sky-300/10 px-3 py-1 text-xs font-semibold text-sky-100">
            EXPLICIT TASK ESCALATION
          </span>

          <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-xs text-white/50">
            Permissions remains the centerpiece
          </span>
        </div>

        <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
          Scheduled work, current state, and execution history in one operator view.
        </h1>

        <p className="mt-5 max-w-3xl text-base leading-7 text-white/55">
          Meridian opens a narrow server-side task-metadata session, reads the
          official IRIS Task Manager surfaces, and never exposes task mutation
          controls or general operational authority.
        </p>
      </header>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <BoundaryCard
          title="Authority"
          value="MeridianTaskMetadataReader"
          detail="%Admin_Task:U only. No %Admin_Operate grant."
        />

        <BoundaryCard
          title="Source"
          value="Official SysAdmin REST"
          detail="Task inventory, manager state, upcoming schedule, and execution history."
        />

        <BoundaryCard
          title="Task mutations"
          value="NONE"
          detail="No run, suspend, resume, create, edit, or delete controls."
        />
      </section>

      {surface.status === "unavailable" ? (
        <section className="mt-8 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100/70">
            Safe failure boundary
          </p>

          <h2 className="mt-3 text-2xl font-semibold text-white">
            Live task metadata unavailable
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">
            {surface.message}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Fact
              label="Reason"
              value={surface.reason}
            />

            <Fact
              label="Fallback task mutation"
              value="NONE"
            />

            <Fact
              label="Public task proxy"
              value="NONE"
            />

            <Fact
              label="Broad operate authority"
              value="NOT GRANTED"
            />
          </div>
        </section>
      ) : (
        <>
          <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                  Live task authority
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Task Manager {surface.managerStatus}
                </h2>
              </div>

              <div className="text-right text-xs leading-5 text-white/40">
                <p>Role: {surface.authority.role}</p>
                <p>Official IRIS Task Manager reads</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Fact
                label="Tasks"
                value={String(surface.tasks.length)}
              />

              <Fact
                label="Upcoming"
                value={String(surface.upcoming.length)}
              />

              <Fact
                label="History rows"
                value={String(surface.history.length)}
              />

              <Fact
                label="%Admin_Operate granted"
                value={surface.authority.adminOperateGranted ? "YES" : "NO"}
              />

              <Fact
                label="Default runtime broadened"
                value={surface.authority.defaultRuntimeBroadened ? "YES" : "NO"}
              />
            </div>
          </section>

          <InventorySection
            eyebrow="Task inventory"
            title={`${surface.tasks.length} configured tasks`}
            detail="Each row carries suspension state plus last-finished and next-scheduled timestamps directly from IRIS."
          >
            {surface.tasks.length === 0 ? (
              <EmptyInventory text="No configured task rows are visible." />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {surface.tasks.map(
                  (
                    task,
                  ) => (
                    <article
                      key={task.id}
                      className="rounded-xl border border-white/10 bg-black/20 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <code className="text-xs text-white/35">
                            TASK #{task.id}
                          </code>

                          <h3 className="mt-2 text-lg font-semibold text-white">
                            {task.name || "Unnamed task"}
                          </h3>

                          <p className="mt-1 text-xs text-white/40">
                            {task.type || "Unknown type"} · {task.namespace || "Unknown namespace"}
                          </p>
                        </div>

                        <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[11px] font-semibold text-white/60">
                          {task.suspended ? "SUSPENDED" : "ACTIVE"}
                        </span>
                      </div>

                      <dl className="mt-5 grid gap-3 text-sm">
                        <Detail
                          label="Next scheduled"
                          value={task.nextScheduled || "NOT SCHEDULED"}
                        />

                        <Detail
                          label="Last finished"
                          value={task.lastFinished || "NEVER"}
                        />

                        <Detail
                          label="Description"
                          value={task.description || "NONE"}
                        />
                      </dl>
                    </article>
                  ),
                )}
              </div>
            )}
          </InventorySection>

          <InventorySection
            eyebrow="Upcoming schedule"
            title={`${surface.upcoming.length} upcoming executions`}
            detail="Scheduled task executions exposed by the live Task Manager surface."
          >
            {surface.upcoming.length === 0 ? (
              <EmptyInventory text="No upcoming task executions are visible." />
            ) : (
              <div className="overflow-hidden rounded-xl border border-white/10">
                <div className="divide-y divide-white/10">
                  {surface.upcoming.map(
                    (
                      task,
                    ) => (
                      <div
                        key={`${task.id}:${task.datetime}`}
                        className="grid gap-3 bg-black/20 px-4 py-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_8rem]"
                      >
                        <div>
                          <p className="font-medium text-white/80">
                            {task.name || `Task #${task.id}`}
                          </p>

                          <p className="mt-1 text-xs text-white/35">
                            {task.namespace || "Unknown namespace"}
                          </p>
                        </div>

                        <p className="text-sm text-white/55">
                          {task.datetime || "No scheduled datetime"}
                        </p>

                        <p className="text-xs font-semibold text-white/45">
                          {task.suspended ? "SUSPENDED" : "SCHEDULED"}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </InventorySection>

          <InventorySection
            eyebrow="Execution history"
            title={`${surface.history.length} recent history rows`}
            detail="Recent task execution outcomes from the official Task Manager history surface."
          >
            {surface.history.length === 0 ? (
              <EmptyInventory text="No task execution history rows are visible." />
            ) : (
              <div className="overflow-hidden rounded-xl border border-white/10">
                <div className="divide-y divide-white/10">
                  {surface.history.map(
                    (
                      row,
                      index,
                    ) => (
                      <div
                        key={`${row.taskId}:${row.lastStart}:${index}`}
                        className="grid gap-3 bg-black/20 px-4 py-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_8rem]"
                      >
                        <div>
                          <p className="font-medium text-white/80">
                            {row.name || `Task #${row.taskId}`}
                          </p>

                          <p className="mt-1 text-xs text-white/35">
                            {row.namespace || "Unknown namespace"}
                          </p>
                        </div>

                        <div className="text-xs leading-5 text-white/45">
                          <p>Started: {row.lastStart || "UNKNOWN"}</p>
                          <p>Completed: {row.completed || "UNKNOWN"}</p>
                        </div>

                        <p className="text-sm text-white/55">
                          {row.result || "No result text"}
                        </p>

                        <p className="text-xs font-semibold text-white/55">
                          {row.status || "UNKNOWN"}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </InventorySection>
        </>
      )}

      <section className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
          Non-deviation boundary
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Fact
            label="Task mutation controls"
            value="NONE"
          />

          <Fact
            label="%Admin_Operate"
            value="NOT GRANTED"
          />

          <Fact
            label="Public task proxy"
            value="NONE"
          />

          <Fact
            label="Browser credential"
            value="NOT EXPOSED"
          />

          <Fact
            label="Default runtime role"
            value="UNCHANGED"
          />

          <Fact
            label="Authority mode"
            value="EXPLICIT ESCALATION"
          />

          <Fact
            label="Product mode"
            value="READ ONLY"
          />

          <Fact
            label="Permissions centerpiece"
            value="PRESERVED"
          />
        </div>
      </section>
    </main>
  );
}

function InventorySection({
  eyebrow,
  title,
  detail,
  children,
}: {
  readonly eyebrow:
    string;

  readonly title:
    string;

  readonly detail:
    string;

  readonly children:
    React.ReactNode;
}) {
  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-2xl font-semibold text-white">
        {title}
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">
        {detail}
      </p>

      <div className="mt-6">
        {children}
      </div>
    </section>
  );
}

function EmptyInventory({
  text,
}: {
  readonly text:
    string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-black/15 p-5 text-sm text-white/40">
      {text}
    </div>
  );
}

function BoundaryCard({
  title,
  value,
  detail,
}: {
  readonly title:
    string;

  readonly value:
    string;

  readonly detail:
    string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-white/35">
        {title}
      </p>

      <p className="mt-3 break-words text-lg font-semibold text-white">
        {value}
      </p>

      <p className="mt-2 text-sm leading-6 text-white/45">
        {detail}
      </p>
    </article>
  );
}

function Detail({
  label,
  value,
}: {
  readonly label:
    string;

  readonly value:
    string;
}) {
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3">
      <dt className="text-white/35">
        {label}
      </dt>

      <dd className="break-words text-white/70">
        {value}
      </dd>
    </div>
  );
}

function Fact({
  label,
  value,
}: {
  readonly label:
    string;

  readonly value:
    string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-semibold text-white/75">
        {value}
      </p>
    </div>
  );
}
