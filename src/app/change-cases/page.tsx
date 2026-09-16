import Link from "next/link";

import {
  getRecordedVerifiedReceipt,
  summarizeRecordedReceipt,
} from "@/lib/change-case/recorded-receipt";

const emptyLanes = [
  {
    name:
      "Needs review",

    description:
      "No seeded Change Case currently requires human review.",
  },
  {
    name:
      "Ready",

    description:
      "No seeded Change Case is waiting at the apply boundary.",
  },
  {
    name:
      "Converging",

    description:
      "No seeded Change Case currently has unresolved live-access residue.",
  },
] as const;

export default function ChangeQueuePage() {
  const receipt =
    getRecordedVerifiedReceipt();

  const summary =
    summarizeRecordedReceipt(
      receipt,
    );

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8 sm:px-10 sm:py-12">
      <header className="flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/70">
            Meridian Control Plane
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Change Queue
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-7 text-white/55">
            Security changes are lifecycle objects. Configuration may finish
            before live authority has converged, so Meridian keeps the case
            open until the evidence is complete.
          </p>
        </div>

        <Link
          href="/change-cases/new"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-300 px-5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-200"
        >
          Stage access change
        </Link>
      </header>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        {emptyLanes.map(
          (lane) => (
            <article
              key={lane.name}
              className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-semibold">
                  {lane.name}
                </h2>

                <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-xs text-white/40">
                  0
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-white/45">
                {lane.description}
              </p>
            </article>
          ),
        )}
      </section>

      <section className="mt-4 rounded-3xl border border-emerald-300/25 bg-emerald-300/[0.055] p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                Verified
              </p>

              <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-100">
                Recorded certified receipt
              </span>

              <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-white/50">
                Read-only demo evidence
              </span>

              <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-100">
                Persistent IRIS history check
              </span>
            </div>

            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">
              Remove MeridianSupervisor from Maya Patel
            </h2>

            <p className="mt-2 font-mono text-sm text-white/45">
              {receipt.change.username}
            </p>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/55">
              Previewed, revalidated, applied, checked for live runtime residue,
              converged, and bound to native IRIS UserChange audit evidence.
            </p>

            <p className="mt-3 max-w-3xl text-xs leading-5 text-emerald-100/70">
              The verified receipt route performs the live server-side IRIS
              history read; this queue remains static and credential-free.
            </p>
          </div>

          <div className="grid min-w-[240px] grid-cols-2 gap-3">
            <Metric
              label="Effective roles lost"
              value={summary.lostEffectiveRoleCount}
            />

            <Metric
              label="Permissions lost"
              value={summary.lostPermissionCount}
            />

            <Metric
              label="Applications lost"
              value={summary.lostApplicationCount}
            />

            <Metric
              label="REST ops lost"
              value={summary.lostRestOperationCount}
            />
          </div>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <StateFact
            label="Configuration"
            value="Applied"
          />

          <StateFact
            label="Live access"
            value="Converged"
          />

          <StateFact
            label="Native audit"
            value={`UserChange #${receipt.nativeAudit.auditIndex}`}
          />
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-emerald-200/15 pt-6">
          <Link
            href="/change-cases/verified/maya-patel-supervisor-removal"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
          >
            Open verified receipt + IRIS history
          </Link>

          <span className="text-xs text-white/40">
            Receipt {receipt.receiptId}
          </span>
        </div>
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/15 p-4">
      <p className="text-2xl font-semibold">
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-white/45">
        {label}
      </p>
    </div>
  );
}

function StateFact({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-emerald-200/15 bg-black/10 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold text-white/80">
        {value}
      </p>
    </div>
  );
}