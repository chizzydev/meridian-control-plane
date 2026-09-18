import Link
  from "next/link";

import {
  readSystemSurfaceFromEnvironment,
} from "@/lib/iris/system-product-server";

export const dynamic =
  "force-dynamic";

function textValue(
  value:
    unknown,
): string {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return "-";
  }

  if (
    typeof value ===
      "string" ||
    typeof value ===
      "number" ||
    typeof value ===
      "boolean"
  ) {
    return String(
      value,
    );
  }

  return "[structured]";
}

function pick(
  row:
    Record<
      string,
      unknown
    >,

  keys:
    readonly string[],
): string {
  for (
    const key
    of keys
  ) {
    if (
      row[key] !==
        undefined &&
      row[key] !==
        null
    ) {
      return textValue(
        row[key],
      );
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
        ).slice(
          0,
          12,
        )
      : [];

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10 text-white sm:px-8">
      <Link
        href="/"
        className="text-sm font-medium text-cyan-100/70 transition hover:text-cyan-100"
      >
        &larr; Meridian Control Plane
      </Link>

      <div className="mt-8 flex flex-col gap-5 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/60">
            OS / SYSTEM
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Runtime health without an operations console.
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">
            Live system resources, usage, shared memory, locks, and process visibility.
            The surface is intentionally read only.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 font-semibold text-emerald-100">
            READ ONLY
          </span>

          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 font-semibold text-cyan-100">
            SERVER-OWNED ESCALATION
          </span>
        </div>
      </div>

      {!surface.ok ? (
        <section className="mt-8 rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100/60">
            Safe failure boundary
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            Live OS / System metadata unavailable
          </h2>

          <p className="mt-2 font-mono text-sm text-amber-100/80">
            {surface.reason}
          </p>

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <dt className="text-white/45">
                Fallback mutation
              </dt>
              <dd className="mt-1 font-semibold">
                NONE
              </dd>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <dt className="text-white/45">
                Public operational proxy
              </dt>
              <dd className="mt-1 font-semibold">
                NONE
              </dd>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <dt className="text-white/45">
                Browser credential
              </dt>
              <dd className="mt-1 font-semibold">
                NOT EXPOSED
              </dd>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <dt className="text-white/45">
                %Admin_Manage
              </dt>
              <dd className="mt-1 font-semibold">
                NOT GRANTED
              </dd>
            </div>
          </dl>
        </section>
      ) : (
        <>
          <section className="mt-8 grid gap-4 lg:grid-cols-4">
            <article className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.04] p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-white/40">
                System resources
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {surface.systemResources.length}
              </p>
              <p className="mt-2 text-xs text-white/45">
                official SysAdmin rows
              </p>
            </article>

            <article className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.04] p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-white/40">
                Shared memory
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {surface.sharedMemory.length}
              </p>
              <p className="mt-2 text-xs text-white/45">
                live memory signals
              </p>
            </article>

            <article className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.04] p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-white/40">
                Locks
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {surface.locks.length}
              </p>
              <p className="mt-2 text-xs text-white/45">
                current lock rows
              </p>
            </article>

            <article className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.04] p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-white/40">
                Processes
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {surface.processes.length}
              </p>
              <p className="mt-2 text-xs text-white/45">
                certified ProcessQuery fallback
              </p>
            </article>
          </section>

          <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/55">
                  System resource signals
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  Resource pressure
                </h2>
              </div>

              <span className="text-xs text-white/35">
                Official SysAdmin REST
              </span>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-white/35">
                  <tr>
                    <th className="pb-3 pr-4">
                      Name
                    </th>
                    <th className="pb-3 pr-4">
                      Busy
                    </th>
                    <th className="pb-3 pr-4">
                      Seize
                    </th>
                    <th className="pb-3 pr-4">
                      Nseize
                    </th>
                    <th className="pb-3 pr-4">
                      Aseize
                    </th>
                    <th className="pb-3">
                      Bseize
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5">
                  {surface.systemResources.slice(0, 20).map(
                    (
                      row,
                      index,
                    ) => (
                      <tr key={`${pick(row, ["Name", "name"])}-${index}`}>
                        <td className="py-3 pr-4 font-medium">
                          {pick(row, ["Name", "name"])}
                        </td>
                        <td className="py-3 pr-4 text-white/60">
                          {pick(row, ["BusySet", "busySet"])}
                        </td>
                        <td className="py-3 pr-4 text-white/60">
                          {pick(row, ["Seize", "seize"])}
                        </td>
                        <td className="py-3 pr-4 text-white/60">
                          {pick(row, ["Nseize", "nseize"])}
                        </td>
                        <td className="py-3 pr-4 text-white/60">
                          {pick(row, ["Aseize", "aseize"])}
                        </td>
                        <td className="py-3 text-white/60">
                          {pick(row, ["Bseize", "bseize"])}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/55">
                System usage
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Live counters
              </h2>

              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                {usageEntries.map(
                  ([
                    key,
                    value,
                  ]) => (
                    <div
                      key={key}
                      className="rounded-xl border border-white/8 bg-black/15 p-4"
                    >
                      <dt className="break-all text-xs text-white/40">
                        {key}
                      </dt>
                      <dd className="mt-1 break-all font-mono text-sm text-white/75">
                        {textValue(value)}
                      </dd>
                    </div>
                  ),
                )}
              </dl>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/55">
                Shared memory
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Allocation signals
              </h2>

              <div className="mt-5 space-y-3">
                {surface.sharedMemory.slice(0, 10).map(
                  (
                    row,
                    index,
                  ) => (
                    <div
                      key={`${pick(row, ["Description", "description"])}-${index}`}
                      className="rounded-xl border border-white/8 bg-black/15 p-4"
                    >
                      <p className="font-medium">
                        {pick(row, ["Description", "description"])}
                      </p>
                      <p className="mt-1 text-xs text-white/45">
                        allocated {pick(row, ["SMHAllocated", "smhAllocated"])}
                        {" / "}
                        used {pick(row, ["SMHUsed", "smhUsed"])}
                        {" / "}
                        available {pick(row, ["SMHAvailable", "smhAvailable"])}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </article>
          </section>

          <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/55">
                  Process visibility
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  Runtime processes
                </h2>
              </div>

              <span className="text-xs text-white/35">
                %SYS.ProcessQuery over external SQL
              </span>
            </div>

            <p className="mt-3 max-w-4xl text-sm leading-6 text-white/45">
              The official /v2/processes surface is deliberately not used on the pinned
              Build 221U runtime after its certified server-side INVALID OREF failure.
            </p>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-white/35">
                  <tr>
                    <th className="pb-3 pr-4">
                      PID
                    </th>
                    <th className="pb-3 pr-4">
                      User
                    </th>
                    <th className="pb-3 pr-4">
                      Namespace
                    </th>
                    <th className="pb-3 pr-4">
                      Started UTC
                    </th>
                    <th className="pb-3">
                      Client IP
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5">
                  {surface.processes.slice(0, 25).map(
                    (
                      process,
                      index,
                    ) => (
                      <tr key={`${process.pid ?? "unknown"}-${index}`}>
                        <td className="py-3 pr-4 font-mono">
                          {process.pid ?? "-"}
                        </td>
                        <td className="py-3 pr-4">
                          {process.username ?? "-"}
                        </td>
                        <td className="py-3 pr-4 text-white/60">
                          {process.namespace ?? "-"}
                        </td>
                        <td className="py-3 pr-4 text-white/60">
                          {process.startTimeUtc ?? "-"}
                        </td>
                        <td className="py-3 text-white/60">
                          {process.clientIp ?? process.startupClientIp ?? "-"}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/55">
              Current locks
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Lock visibility
            </h2>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {surface.locks.slice(0, 12).map(
                (
                  row,
                  index,
                ) => (
                  <article
                    key={`${pick(row, ["Pid", "pid"])}-${index}`}
                    className="rounded-xl border border-white/8 bg-black/15 p-4"
                  >
                    <p className="font-medium">
                      PID {pick(row, ["Pid", "pid"])}
                    </p>
                    <p className="mt-1 break-all text-xs text-white/45">
                      {pick(row, ["Reference", "reference"])}
                    </p>
                    <p className="mt-2 text-xs text-white/35">
                      mode {pick(row, ["ModeCount", "modeCount"])}
                      {" / "}
                      routine {pick(row, ["RoutineInfo", "routineInfo"])}
                    </p>
                  </article>
                ),
              )}
            </div>
          </section>
        </>
      )}

      <section className="mt-8 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.04] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/55">
          Authority boundary
        </p>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <dt className="text-white/40">
              Escalation role
            </dt>
            <dd className="mt-1 font-mono text-xs">
              MeridianSystemMetadataReader
            </dd>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <dt className="text-white/40">
              Role resources
            </dt>
            <dd className="mt-1 font-mono text-xs">
              %Admin_Operate:U + %DB_IRISSYS:R
            </dd>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <dt className="text-white/40">
              %Admin_Manage
            </dt>
            <dd className="mt-1 font-semibold">
              NOT GRANTED
            </dd>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <dt className="text-white/40">
              Mutation controls
            </dt>
            <dd className="mt-1 font-semibold">
              NONE
            </dd>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <dt className="text-white/40">
              Official process endpoint
            </dt>
            <dd className="mt-1 font-semibold">
              REJECTED ON BUILD 221U
            </dd>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <dt className="text-white/40">
              Process fallback
            </dt>
            <dd className="mt-1 font-semibold">
              CERTIFIED READ ONLY
            </dd>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <dt className="text-white/40">
              Browser escalated token
            </dt>
            <dd className="mt-1 font-semibold">
              NOT EXPOSED
            </dd>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <dt className="text-white/40">
              Product mode
            </dt>
            <dd className="mt-1 font-semibold">
              READ ONLY
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
