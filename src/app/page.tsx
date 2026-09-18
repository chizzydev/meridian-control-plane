import Link from "next/link";

import {
  getRecordedVerifiedReceipt,
  summarizeRecordedReceipt,
} from "@/lib/change-case/recorded-receipt";

const lifecycle = [
  "PRE-FLIGHT",
  "APPLY",
  "CONVERGE",
  "VERIFIED",
] as const;

export default function Home() {
  const receipt =
    getRecordedVerifiedReceipt();

  const summary =
    summarizeRecordedReceipt(
      receipt,
    );

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8 sm:px-10 sm:py-12">
      <section className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/70">
            Meridian Control Plane
          </p>

          <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            Security changes are not finished when configuration changes.
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/55">
            Meridian previews the real authorization impact, applies the exact
            reviewed role change, observes whether live IRIS processes still
            retain removed authority, and closes the Change Case only after
            convergence and native audit evidence agree.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-2">
            {lifecycle.map(
              (
                stage,
                index,
              ) => (
                <div
                  key={stage}
                  className="flex items-center gap-2"
                >
                  <span className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-semibold tracking-wide text-white/70">
                    {stage}
                  </span>

                  {index <
                  lifecycle.length -
                    1 ? (
                    <span className="text-white/20">
                      Ã¢â€ â€™
                    </span>
                  ) : null}
                </div>
              ),
            )}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/change-cases"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-300 px-6 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-200"
            >
              Open Change Queue
            </Link>

            <Link
              href="/change-cases/new"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] px-6 text-sm font-semibold text-white/70 transition hover:bg-white/[0.07]"
            >
              Stage access change
            </Link>
          </div>
        </div>

        <aside className="rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.045] p-6 shadow-2xl shadow-black/20 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-100">
              VERIFIED
            </span>

            <span className="text-[10px] uppercase tracking-[0.16em] text-white/35">
              Recorded centerpiece
            </span>
          </div>

          <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">
            Maya Patel
          </h2>

          <p className="mt-1 font-mono text-sm text-white/40">
            {receipt.change.username}
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/15 p-5">
            <p className="text-xs text-white/35">
              Certified change
            </p>

            <p className="mt-2 text-sm font-semibold text-white/75">
              {receipt.change.operation} {receipt.change.role}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <MiniMetric
              value={summary.lostEffectiveRoleCount}
              label="roles lost"
            />

            <MiniMetric
              value={summary.lostPermissionCount}
              label="permissions lost"
            />

            <MiniMetric
              value={summary.lostApplicationCount}
              label="app lost"
            />

            <MiniMetric
              value={summary.lostRestOperationCount}
              label="REST ops lost"
            />
          </div>

          <Link
            href="/change-cases/verified/maya-patel-supervisor-removal"
            className="mt-5 flex min-h-11 w-full items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
          >
            Inspect verified receipt
          </Link>
        </aside>
      </section>

      <section className="mt-10 grid gap-4 border-t border-white/10 pt-8 md:grid-cols-3">
        <ProofCard
          label="01"
          title="PRE-FLIGHT"
          body="Derive effective-role, permission, application, REST-operation and causal impact from authoritative IRIS facts before mutation."
        />

        <ProofCard
          label="02"
          title="CONVERGE"
          body="Keep CONFIGURATION and LIVE ACCESS separate. A successful role update does not by itself close the Change Case."
        />

        <ProofCard
          label="03"
          title="RECEIPT"
          body="Close VERIFIED only after changed permissions converge and a native IRIS UserChange event is defensibly bound."
        />
      </section>
          <section className="mt-8 rounded-2xl border border-sky-300/15 bg-sky-300/[0.045] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-100/60">
          Supporting control-plane breadth
        </p>

        <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">
              Web Apps &amp; REST
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
              Inspect protected Meridian web applications and deployed REST operations
              without widening browser mutation authority.
            </p>
          </div>

          <Link
            href="/web-rest"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-sky-300/25 bg-sky-300/10 px-4 text-sm font-semibold text-sky-100 transition hover:bg-sky-300/15"
          >
            Explore Web Apps / REST
          </Link>
        </div>
      </section>
      <section className="mt-8 rounded-2xl border border-violet-300/15 bg-violet-300/[0.045] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-100/60">
          Supporting control-plane breadth
        </p>

        <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">
              Security &amp; Secrets
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
              Inspect safe security metadata through an explicit least-privilege
              escalation role. Secret material never reaches the browser.
            </p>
          </div>

          <Link
            href="/security-secrets"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-violet-300/25 bg-violet-300/10 px-4 text-sm font-semibold text-violet-100 transition hover:bg-violet-300/15"
          >
            Explore Security / Secrets
          </Link>
        </div>
      </section>
      <section className="mt-8 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.045] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/60">
          Supporting control-plane breadth
        </p>

        <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">
              Task Management
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
              Inspect live Task Manager state, configured schedules, upcoming
              executions, and recent history through a task-specific escalation role.
            </p>
          </div>

          <Link
            href="/tasks"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15"
          >
            Explore Task Management
          </Link>
        </div>
      </section>

</main>
  );
}

function MiniMetric({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 p-4">
      <p className="text-2xl font-semibold">
        {value}
      </p>

      <p className="mt-1 text-xs text-white/40">
        {label}
      </p>
    </div>
  );
}

function ProofCard({
  label,
  title,
  body,
}: {
  label: string;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-black/10 p-5">
      <span className="text-xs font-semibold text-emerald-200/70">
        {label}
      </span>

      <h2 className="mt-4 font-semibold">
        {title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-white/45">
        {body}
      </p>
    </article>
  );
}