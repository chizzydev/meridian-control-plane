import Link from "next/link";

import {
  RECORDED_RECEIPT_SHA256,
  getRecordedVerifiedReceipt,
  summarizeRecordedReceipt,
} from "@/lib/change-case/recorded-receipt";
import {
  readPersistentJudgeHistory,
} from "@/lib/iris/receipt-history-session";

export const dynamic =
  "force-dynamic";

export default async function VerifiedReceiptPage() {
  const receipt =
    getRecordedVerifiedReceipt();

  const summary =
    summarizeRecordedReceipt(
      receipt,
    );
  let persistent:
    Awaited<
      ReturnType<
        typeof readPersistentJudgeHistory
      >
    > |
    null =
      null;

  try {
    const observed =
      await readPersistentJudgeHistory({
        receiptId:
          receipt.receiptId,

        username:
          receipt.change.username,
      });

    if (
      observed.receipt.receiptSha256 !==
      RECORDED_RECEIPT_SHA256
    ) {
      throw new Error(
        "Persistent IRIS receipt SHA does not match the certified canonical receipt.",
      );
    }

    persistent =
      observed;
  }
  catch {
    persistent =
      null;
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8 sm:px-10 sm:py-12">
      <Link
        href="/change-cases"
        className="text-sm text-white/45 transition hover:text-white"
      >
        â† Change Queue
      </Link>

      <header className="mt-8 border-b border-white/10 pb-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">
            VERIFIED
          </span>

          <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-xs text-white/50">
            Recorded certified receipt
          </span>

          <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-xs text-white/50">
            Read-only demo evidence
          </span>
        </div>

        <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
          Remove MeridianSupervisor from Maya Patel
        </h1>

        <p className="mt-4 max-w-3xl text-base leading-7 text-white/55">
          This receipt records the certified centerpiece execution. Meridian
          treats a security change as complete only after configuration,
          live-access convergence, and native IRIS audit evidence agree.
        </p>

        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <KeyValue
            label="User"
            value={receipt.change.username}
          />

          <KeyValue
            label="Operation"
            value={receipt.change.operation}
          />

          <KeyValue
            label="Role"
            value={receipt.change.role}
          />

          <KeyValue
            label="Receipt"
            value={receipt.receiptId}
          />
        </div>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Effective roles removed"
          value={summary.lostEffectiveRoleCount}
        />

        <Metric
          label="Permissions removed"
          value={summary.lostPermissionCount}
        />

        <Metric
          label="Protected apps lost"
          value={summary.lostApplicationCount}
        />

        <Metric
          label="Declared REST ops lost"
          value={summary.lostRestOperationCount}
        />
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.045] p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
            CONFIGURATION
          </p>

          <h2 className="mt-3 text-2xl font-semibold">
            Applied and verified
          </h2>

          <p className="mt-3 text-sm leading-6 text-white/50">
            MeridianSupervisor is absent from Maya&apos;s configured direct
            roles and the changed permission pairs match the expected
            post-state.
          </p>

          <RoleSet
            label="Before"
            values={receipt.roles.directBefore}
          />

          <RoleSet
            label="After"
            values={receipt.roles.directAfter}
          />
        </article>

        <article className="rounded-3xl border border-sky-300/20 bg-sky-300/[0.04] p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
            LIVE ACCESS
          </p>

          <h2 className="mt-3 text-2xl font-semibold">
            Converged
          </h2>

          <p className="mt-3 text-sm leading-6 text-white/50">
            Final target-process cardinality was ZERO. No active Maya process
            remained that could still hold one of the permissions removed by
            this Change Case.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <StateBox
              label="Target process"
              value={
                receipt.convergence.targetProcessPresent
                  ? "Present"
                  : "Absent"
              }
            />

            <StateBox
              label="Residual access"
              value={
                receipt.convergence.liveResidueObserved
                  ? "Observed"
                  : "None"
              }
            />
          </div>

          <p className="mt-5 rounded-xl border border-sky-200/15 bg-black/15 p-4 text-xs leading-5 text-white/45">
            Claim boundary: POST #3 converged with no active target process. It
            does not claim that POST #3 demonstrated the stale-process
            transition. The closed B6C experiment supplies that separate proof.
          </p>
        </article>
      </section>

      <section className="mt-8 grid gap-4 xl:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-7">
          <SectionEyebrow>
            Permission delta
          </SectionEyebrow>

          <h2 className="mt-3 text-2xl font-semibold">
            What authority disappeared
          </h2>

          <div className="mt-6 space-y-3">
            {receipt.permissionDelta.lost.map(
              (permission) => (
                <DeltaRow
                  key={`${permission.resource}:${permission.permission}`}
                  primary={permission.resource}
                  secondary={permission.permission}
                  outcome="LOST"
                />
              ),
            )}
          </div>

          <h3 className="mt-7 text-sm font-semibold text-white/65">
            Retained
          </h3>

          <div className="mt-3 space-y-3">
            {receipt.permissionDelta.retained.map(
              (permission) => (
                <DeltaRow
                  key={`${permission.resource}:${permission.permission}`}
                  primary={permission.resource}
                  secondary={permission.permission}
                  outcome="RETAINED"
                />
              ),
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-7">
          <SectionEyebrow>
            Declared impact
          </SectionEyebrow>

          <h2 className="mt-3 text-2xl font-semibold">
            Protected assets and operations
          </h2>

          <div className="mt-6 space-y-3">
            {receipt.declaredImpact.applications.map(
              (application) => (
                <DeltaRow
                  key={application.asset}
                  primary={application.asset}
                  secondary={`${application.requiredResource}:${application.requiredPermission}`}
                  outcome={application.outcome}
                />
              ),
            )}
          </div>

          <div className="mt-6 border-t border-white/10 pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
              Declared REST operations
            </p>

            <div className="mt-4 space-y-3">
              {receipt.declaredImpact.operations.map(
                (operation) => (
                  <DeltaRow
                    key={operation.operationId}
                    primary={`${operation.method} ${operation.path}`}
                    secondary={`${operation.requiredResource}:${operation.requiredPermission}`}
                    outcome={operation.outcome}
                  />
                ),
              )}
            </div>
          </div>
        </article>
      </section>

      <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-7">
        <SectionEyebrow>
          Change Receipt
        </SectionEyebrow>

        <h2 className="mt-3 text-2xl font-semibold">
          Previewed, applied, observed, converged, audited.
        </h2>

        <div className="mt-7 grid gap-3 lg:grid-cols-3">
          {receipt.timeline.map(
            (
              item,
              index,
            ) => (
              <article
                key={`${index}-${item.stage}`}
                className="rounded-2xl border border-white/10 bg-black/15 p-4"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
                  {String(index + 1).padStart(2, "0")}
                </p>

                <h3 className="mt-2 font-semibold">
                  {item.stage}
                </h3>

                <p className="mt-1 text-xs text-emerald-200/70">
                  {item.status}
                </p>
              </article>
            ),
          )}
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-amber-200/20 bg-amber-200/[0.035] p-6 sm:p-7">
        <SectionEyebrow>
          Native Audit
        </SectionEyebrow>

        <h2 className="mt-3 text-2xl font-semibold">
          One exact IRIS UserChange event closes the receipt.
        </h2>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StateBox
            label="Audit index"
            value={String(receipt.nativeAudit.auditIndex)}
          />

          <StateBox
            label="Event"
            value={`${receipt.nativeAudit.source} / ${receipt.nativeAudit.type} / ${receipt.nativeAudit.event}`}
          />

          <StateBox
            label="Actor"
            value={receipt.nativeAudit.username}
          />

          <StateBox
            label="Apply â†’ audit"
            value={`${receipt.nativeAudit.applyToAuditDeltaSeconds}s`}
          />
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-5">
          <p className="font-mono text-xs leading-6 text-white/55">
            {receipt.nativeAudit.description}
            <br />
            Old roles: {receipt.nativeAudit.oldDirectRoles.join(", ")}
            <br />
            New roles: {receipt.nativeAudit.newDirectRoles.join(", ")}
            <br />
            UTC: {receipt.nativeAudit.utcTimestamp}
          </p>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.02] p-6">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200/70">
              Persistent IRIS history
            </p>

            {persistent ? (
              <>
                <div className="mt-4 inline-flex rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                  Persistent IRIS history live
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <KeyValue
                    label="Source"
                    value={persistent.source}
                  />

                  <KeyValue
                    label="History entries"
                    value={String(
                      persistent.history.length,
                    )}
                  />
                </div>

                <p className="mt-5 break-all font-mono text-xs leading-6 text-white/55">
                  Receipt SHA-256 {persistent.receipt.receiptSha256}
                </p>

                <p className="mt-3 text-xs leading-5 text-emerald-100/70">
                  Exact canonical receipt match: PASS. This request read the
                  persisted receipt and Maya Patel&apos;s receipt-history index
                  from IRIS through the server-only authenticated session
                  boundary.
                </p>
              </>
            ) : (
              <>
                <div className="mt-4 inline-flex rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">
                  Persistent IRIS history unavailable
                </div>

                <p className="mt-4 max-w-2xl text-xs leading-5 text-white/45">
                  This request did not verify the live persistent history
                  source. The recorded certified receipt remains visible as
                  frozen evidence, but it is not presented as a substitute for
                  a successful live IRIS history read.
                </p>
              </>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
              Recorded evidence source
            </p>

            <p className="mt-2 break-all font-mono text-xs text-white/50">
              SHA-256 {RECORDED_RECEIPT_SHA256}
            </p>

            <p className="mt-4 text-xs leading-5 text-white/40">
              This public surface remains read-only and does not claim that the
              public browser owns privileged IRIS mutation authority.
              Privileged IRIS credentials and bearer tokens stay behind the
              server-only boundary; the browser receives rendered evidence
              only.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function SectionEyebrow({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
      {children}
    </p>
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
    <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <p className="text-3xl font-semibold">
        {value}
      </p>

      <p className="mt-2 text-sm text-white/45">
        {label}
      </p>
    </article>
  );
}

function KeyValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <span className="text-white/35">
        {label}
      </span>

      <span className="ml-2 font-medium text-white/75">
        {value}
      </span>
    </div>
  );
}

function RoleSet({
  label,
  values,
}: {
  label: string;
  values: string[];
}) {
  return (
    <div className="mt-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
        {label}
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        {values.map(
          (role) => (
            <span
              key={role}
              className="rounded-lg border border-white/10 bg-black/15 px-3 py-1.5 font-mono text-xs text-white/60"
            >
              {role}
            </span>
          ),
        )}
      </div>
    </div>
  );
}

function StateBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/15 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold text-white/75">
        {value}
      </p>
    </div>
  );
}

function DeltaRow({
  primary,
  secondary,
  outcome,
}: {
  primary: string;
  secondary: string;
  outcome: string;
}) {
  const outcomeClass =
    outcome === "LOST"
      ? "text-rose-200 border-rose-300/20 bg-rose-300/[0.04]"
      : "text-emerald-200 border-emerald-300/20 bg-emerald-300/[0.04]";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-white/75">
          {primary}
        </p>

        <p className="mt-1 font-mono text-xs text-white/35">
          {secondary}
        </p>
      </div>

      <span className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-semibold ${outcomeClass}`}>
        {outcome}
      </span>
    </div>
  );
}