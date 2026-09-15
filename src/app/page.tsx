import Link from "next/link";

import { CENTERPIECE_CHANGE } from "@/lib/change-case/domain";

const lifecycle = [
  "PROPOSED",
  "PREFLIGHTED",
  "READY",
  "APPLIED",
  "CONVERGING",
  "VERIFIED",
] as const;

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8 sm:px-10 sm:py-12">
      <header className="flex items-center justify-between border-b border-white/10 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/70">
            InterSystems IRIS security change control
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Meridian Control Plane
          </h1>
        </div>

        <div className="rounded-full border border-emerald-200/20 bg-emerald-200/5 px-3 py-1 text-xs text-emerald-100">
          PRE-FLIGHT → APPLY → CONVERGE
        </div>
      </header>

      <section className="grid gap-10 py-14 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div>
          <p className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-6xl">
            A role change is not finished when the configuration changes.
          </p>

          <p className="mt-6 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">
            Meridian keeps an IRIS security change open until intended
            configuration and observed live access have actually converged.
          </p>

          <div className="mt-10 flex flex-wrap gap-2">
            {lifecycle.map((state, index) => (
              <div
                key={state}
                className="flex items-center gap-2"
              >
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/70">
                  {state}
                </span>

                {index < lifecycle.length - 1 ? (
                  <span className="text-white/20">→</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/20 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
            First controlled Change Case
          </p>

          <div className="mt-6 space-y-5">
            <div>
              <p className="text-sm text-white/40">Target user</p>
              <p className="mt-1 text-xl font-medium">
                {CENTERPIECE_CHANGE.displayName}
              </p>
              <p className="mt-1 font-mono text-sm text-white/45">
                {CENTERPIECE_CHANGE.username}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-y border-white/10 py-5">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/35">
                  Operation
                </p>
                <p className="mt-2 font-semibold text-amber-200">
                  {CENTERPIECE_CHANGE.operation}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-white/35">
                  Role
                </p>
                <p className="mt-2 font-medium">
                  {CENTERPIECE_CHANGE.role}
                </p>
              </div>
            </div>

            <Link
              href="/change-cases/new"
              className="flex w-full items-center justify-center rounded-xl bg-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-200"
            >
              Stage this change
            </Link>
          </div>
        </aside>
      </section>

      <section className="grid gap-4 border-t border-white/10 pt-8 md:grid-cols-3">
        <ProofCard
          label="1"
          title="Preflight impact"
          body="Derive effective-role, permission, application, and declared REST impact from IRIS facts."
        />
        <ProofCard
          label="2"
          title="Live convergence"
          body="Keep configuration and live access visibly separate while stale runtime authority remains."
        />
        <ProofCard
          label="3"
          title="Native receipt"
          body="Close VERIFIED only after convergence and native IRIS audit evidence are bound."
        />
      </section>
    </main>
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
        0{label}
      </span>
      <h2 className="mt-4 font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-white/45">{body}</p>
    </article>
  );
}