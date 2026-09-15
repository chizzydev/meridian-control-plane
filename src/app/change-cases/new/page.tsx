import Link from "next/link";

import { CENTERPIECE_CHANGE } from "@/lib/change-case/domain";

export default function NewChangeCasePage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-8 sm:px-10 sm:py-12">
      <Link
        href="/"
        className="text-sm text-white/45 transition hover:text-white"
      >
        ← Change queue
      </Link>

      <div className="mt-10 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/70">
          Stage access change
        </p>

        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.035em]">
          Define the exact mutation before asking IRIS what it means.
        </h1>

        <p className="mt-4 text-base leading-7 text-white/50">
          This first slice is intentionally constrained to one controlled user
          and one direct-role operation. Impact is not hard-coded here; the
          authoritative preflight will be produced by the IRIS adapter.
        </p>
      </div>

      <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
        <div className="grid gap-6 sm:grid-cols-3">
          <Field
            label="User"
            value={CENTERPIECE_CHANGE.displayName}
            detail={CENTERPIECE_CHANGE.username}
          />

          <Field
            label="Operation"
            value={CENTERPIECE_CHANGE.operation}
            detail="Direct role mutation"
          />

          <Field
            label="Role"
            value={CENTERPIECE_CHANGE.role}
            detail="Controlled centerpiece role"
          />
        </div>

        <div className="mt-8 border-t border-white/10 pt-6">
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200/10 bg-amber-200/[0.04] p-4">
            <span className="mt-0.5 text-amber-200">◇</span>
            <div>
              <p className="text-sm font-medium text-amber-100">
                Authoritative preflight not connected yet
              </p>
              <p className="mt-1 text-sm leading-6 text-white/45">
                The next implementation checkpoint connects this staged change
                to live IRIS security reads and native counterfactual
                evaluation. No impact numbers are invented in the scaffold.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled
            className="mt-6 w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/30"
          >
            Run authoritative preflight
          </button>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/35">
        {label}
      </p>
      <p className="mt-2 text-lg font-medium">{value}</p>
      <p className="mt-1 text-sm text-white/40">{detail}</p>
    </div>
  );
}