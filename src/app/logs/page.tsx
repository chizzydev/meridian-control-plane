import Link
  from "next/link";

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
  if (
    typeof value ===
      "string"
  ) {
    return value;
  }

  if (
    Array.isArray(
      value,
    )
  ) {
    return value[0] ??
      null;
  }

  return null;
}

function parseHours(
  value:
    string | null,
): number | null {
  if (!value) {
    return null;
  }

  const parsed =
    Number(
      value,
    );

  return (
    parsed ===
      1 ||
    parsed ===
      6 ||
    parsed ===
      24 ||
    parsed ===
      72
  )
    ? parsed
    : null;
}

export default async function LogsPage(
  props: {
    readonly searchParams:
      SearchParams;
  },
) {
  const searchParams =
    await props.searchParams;

  const severity =
    first(
      searchParams.severity,
    );

  const source =
    first(
      searchParams.source,
    );

  const hours =
    parseHours(
      first(
        searchParams.hours,
      ),
    );

  const surface =
    await readLogsSurfaceFromEnvironment({
      severity,
      source,
      hours,
    });

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10 text-white sm:px-8">
      <Link
        href="/"
        className="text-sm font-medium text-amber-100/70 transition hover:text-amber-100"
      >
        &larr; Meridian Control Plane
      </Link>

      <div className="mt-8 flex flex-col gap-5 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200/60">
            LOGS
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Operational evidence without an audit-console shortcut.
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">
            Explore non-audit subsystem log records with source identity, severity,
            and time filtering through a narrow read-only SQL authority.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 font-semibold text-emerald-100">
            READ ONLY
          </span>

          <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 font-semibold text-amber-100">
            NON-AUDIT OPERATIONAL LOGS
          </span>
        </div>
      </div>

      {!surface.ok ? (
        <section className="mt-8 rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100/60">
            Safe failure boundary
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            Live operational log read unavailable
          </h2>

          <p className="mt-2 font-mono text-sm text-amber-100/80">
            {surface.reason}
          </p>
        </section>
      ) : (
        <>
          <section className="mt-8 grid gap-4 lg:grid-cols-4">
            <article className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-white/40">
                Current rows
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {surface.totalRows}
              </p>
              <p className="mt-2 text-xs text-white/45">
                top 200 operational records
              </p>
            </article>

            <article className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-white/40">
                Visible rows
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {surface.visibleRows}
              </p>
              <p className="mt-2 text-xs text-white/45">
                after active filters
              </p>
            </article>

            <article className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-white/40">
                Sources
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {surface.availableSources.length}
              </p>
              <p className="mt-2 text-xs text-white/45">
                subsystem identities
              </p>
            </article>

            <article className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-white/40">
                Severity values
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {surface.availableSeverities.length}
              </p>
              <p className="mt-2 text-xs text-white/45">
                values currently observed
              </p>
            </article>
          </section>

          <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100/55">
                  Operational log filters
                </p>

                <h2 className="mt-2 text-2xl font-semibold">
                  Source, severity, and time
                </h2>
              </div>

              <span className="text-xs text-white/35">
                Server-side read filtering only
              </span>
            </div>

            <form
              method="get"
              className="mt-5 grid gap-4 rounded-xl border border-white/8 bg-black/15 p-4 md:grid-cols-4"
            >
              <label className="text-xs text-white/45">
                Source contains
                <input
                  name="source"
                  defaultValue={surface.activeFilter.source ?? ""}
                  maxLength={80}
                  placeholder="namespace, routine, category"
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
                />
              </label>

              <label className="text-xs text-white/45">
                Severity
                <select
                  name="severity"
                  defaultValue={surface.activeFilter.severity ?? ""}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
                >
                  <option value="">
                    All severities
                  </option>

                  {surface.availableSeverities.map(
                    (
                      value,
                    ) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {value}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="text-xs text-white/45">
                Time window
                <select
                  name="hours"
                  defaultValue={surface.activeFilter.hours?.toString() ?? ""}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
                >
                  <option value="">
                    All returned time
                  </option>
                  <option value="1">
                    Last 1 hour
                  </option>
                  <option value="6">
                    Last 6 hours
                  </option>
                  <option value="24">
                    Last 24 hours
                  </option>
                  <option value="72">
                    Last 72 hours
                  </option>
                </select>
              </label>

              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="min-h-10 rounded-lg border border-amber-300/25 bg-amber-300/10 px-4 text-sm font-semibold text-amber-100"
                >
                  Apply read filters
                </button>

                <Link
                  href="/logs"
                  className="inline-flex min-h-10 items-center rounded-lg border border-white/10 px-4 text-sm text-white/55"
                >
                  Clear
                </Link>
              </div>
            </form>
          </section>

          {surface.currentDataState === "EMPTY" ? (
            <section className="mt-8 rounded-2xl border border-sky-300/15 bg-sky-300/[0.04] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-100/55">
                Empty live runtime
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                No operational log rows are currently present.
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">
                The read authority and schema are live-certified. Meridian does not
                manufacture synthetic log entries just to populate this surface.
              </p>

              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-black/15 p-4">
                  <dt className="text-white/40">
                    Source identity
                  </dt>
                  <dd className="mt-1 font-semibold">
                    Category / Namespace / Routine
                  </dd>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/15 p-4">
                  <dt className="text-white/40">
                    Severity field
                  </dt>
                  <dd className="mt-1 font-semibold">
                    LogLevel
                  </dd>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/15 p-4">
                  <dt className="text-white/40">
                    Time field
                  </dt>
                  <dd className="mt-1 font-semibold">
                    TimeAdded
                  </dd>
                </div>
              </dl>
            </section>
          ) : (
            <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100/55">
                    Non-audit subsystem records
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold">
                    Operational log exploration
                  </h2>
                </div>

                <span className="text-xs text-white/35">
                  Message previews are redacted and capped
                </span>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-white/35">
                    <tr>
                      <th className="pb-3 pr-4">
                        Time
                      </th>
                      <th className="pb-3 pr-4">
                        Source
                      </th>
                      <th className="pb-3 pr-4">
                        Severity
                      </th>
                      <th className="pb-3 pr-4">
                        Namespace
                      </th>
                      <th className="pb-3 pr-4">
                        PID
                      </th>
                      <th className="pb-3">
                        Redacted message preview
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/5">
                    {surface.logs.map(
                      (
                        row,
                        index,
                      ) => (
                        <tr key={`${row.timeAdded ?? "unknown"}-${row.pid ?? "no-pid"}-${index}`}>
                          <td className="py-3 pr-4 font-mono text-xs text-white/55">
                            {row.timeAdded ?? "-"}
                          </td>

                          <td className="py-3 pr-4 font-medium">
                            {row.source}
                          </td>

                          <td className="py-3 pr-4 text-white/60">
                            {row.severity ?? "-"}
                          </td>

                          <td className="py-3 pr-4 text-white/60">
                            {row.namespace ?? "-"}
                          </td>

                          <td className="py-3 pr-4 font-mono text-white/60">
                            {row.pid ?? "-"}
                          </td>

                          <td className="max-w-[34rem] py-3 text-white/65">
                            {row.messagePreview ?? "-"}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      <section className="mt-8 rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100/55">
          Authority boundary
        </p>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <dt className="text-white/40">
              SQL object
            </dt>
            <dd className="mt-1 font-mono text-xs">
              %Library.SysLogTable
            </dd>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <dt className="text-white/40">
              Retained privilege
            </dt>
            <dd className="mt-1 font-semibold">
              SELECT ONLY
            </dd>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <dt className="text-white/40">
              Security audit
            </dt>
            <dd className="mt-1 font-semibold">
              DISTINCT AUTHORITY
            </dd>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <dt className="text-white/40">
              Log mutation controls
            </dt>
            <dd className="mt-1 font-semibold">
              NONE
            </dd>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <dt className="text-white/40">
              Browser credential
            </dt>
            <dd className="mt-1 font-semibold">
              NOT EXPOSED
            </dd>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <dt className="text-white/40">
              Raw message output
            </dt>
            <dd className="mt-1 font-semibold">
              NEVER
            </dd>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <dt className="text-white/40">
              Transport
            </dt>
            <dd className="mt-1 font-semibold">
              SERVER-ONLY DBAPI
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
