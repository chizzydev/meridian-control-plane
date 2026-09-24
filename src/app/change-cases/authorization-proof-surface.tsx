import {
  deriveAuthorizationProof,
  verificationPresentation,
  type PermissionProofRow,
} from "../../lib/change-case/authorization-proof";

const STALE_PID = 171402;
const FRESH_PID = 173081;

const lostPermissions = [
  {
    resource: "Meridian_Admin",
    permission: "USE",
  },
  {
    resource: "%Admin_Task",
    permission: "USE",
  },
  {
    resource: "Meridian_Orders",
    permission: "WRITE",
  },
  {
    resource: "Meridian_Jobs",
    permission: "USE",
  },
] as const;

const retainedPermissions = [
  {
    resource: "Meridian_Portal",
    permission: "USE",
  },
  {
    resource: "Meridian_Orders",
    permission: "READ",
  },
] as const;

function buildRows(
  stale:
    boolean,
): PermissionProofRow[] {
  return [
    ...lostPermissions.map(
      (
        item,
      ) => ({
        id:
          `${item.resource}:${item.permission}`,
        resource:
          item.resource,
        permission:
          item.permission,
        expectedDecision:
          "DENY" as const,
        configuredDecision:
          "DENY" as const,
        liveDecision:
          stale
            ? "ALLOW" as const
            : "DENY" as const,
      }),
    ),
    ...retainedPermissions.map(
      (
        item,
      ) => ({
        id:
          `${item.resource}:${item.permission}`,
        resource:
          item.resource,
        permission:
          item.permission,
        expectedDecision:
          "ALLOW" as const,
        configuredDecision:
          "ALLOW" as const,
        liveDecision:
          "ALLOW" as const,
      }),
    ),
  ];
}

const staleRows =
  buildRows(
    true,
  );

const freshRows =
  buildRows(
    false,
  );

const staleResult =
  deriveAuthorizationProof({
    configuredApplied:
      true,
    configuredSourceAvailable:
      true,
    liveSourceAvailable:
      true,
    rows:
      staleRows,
    convergence: {
      required:
        true,
      stalePid:
        STALE_PID,
      oldPidGone:
        false,
      freshPid:
        null,
      freshPidDiffers:
        false,
    },
    nativeEvidenceComplete:
      false,
    canonicalReceiptPersisted:
      false,
  });

const freshResult =
  deriveAuthorizationProof({
    configuredApplied:
      true,
    configuredSourceAvailable:
      true,
    liveSourceAvailable:
      true,
    rows:
      freshRows,
    convergence: {
      required:
        true,
      stalePid:
        STALE_PID,
      oldPidGone:
        true,
      freshPid:
        FRESH_PID,
      freshPidDiffers:
        true,
    },
    nativeEvidenceComplete:
      true,
    canonicalReceiptPersisted:
      true,
  });

const stalePresentation =
  verificationPresentation(
    staleResult.state,
  );

const freshPresentation =
  verificationPresentation(
    freshResult.state,
  );

export function AuthorizationProofSurface() {
  return (
    <section
      aria-labelledby="authorization-proof-title"
      className="meridian-convergence-proof mb-10 rounded-3xl border border-rose-300/20 bg-rose-300/[0.035] p-5 shadow-2xl shadow-black/10 sm:p-7"
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-4xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-rose-300/25 bg-rose-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-100">
              Recorded certified permissions convergence proof
            </span>

            <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
              Isolated synthetic witness
            </span>

            <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
              Read-only proof evidence
            </span>
          </div>

          <h2
            id="authorization-proof-title"
            className="mt-5 max-w-4xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
          >
            A permissions change can outlive configuration.
          </h2>

          <p className="mt-4 max-w-3xl text-base leading-7 text-white/55">
            This isolated witness shows why Meridian keeps reviewed intent,
            configured IRIS truth, and live-process authorization visibly
            separate before durable closure can be claimed.
          </p>
        </div>

        <div className="rounded-2xl border border-rose-300/25 bg-rose-300/[0.06] p-4 xl:min-w-64">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-200/70">
            Stale-state verdict
          </p>

          <p className="mt-2 text-lg font-semibold text-rose-100">
            {stalePresentation.statusLabel}
          </p>

          <p className="mt-1 text-xs leading-5 text-rose-100/65">
            {stalePresentation.detail}
          </p>
        </div>
      </div>

      <div className="mt-7 rounded-2xl border border-rose-300/20 bg-black/15 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-200/70">
          Configuration changed. Live authority did not.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <WitnessFact
            label="Target"
            value="meridian.s1.witness"
          />

          <WitnessFact
            label="Configured change"
            value="REMOVE MeridianSupervisor"
          />

          <WitnessFact
            label="Stale server PID"
            value={String(STALE_PID)}
          />

          <WitnessFact
            label="Live mismatches"
            value={`${staleResult.liveMismatchCount} revoked permissions`}
          />
        </div>

        <p className="mt-4 text-xs leading-5 text-white/40">
          Same authenticated process. Same server PID. Configuration already
          denied the four removed permissions, while the live process directly
          still reported them as allowed.
        </p>
      </div>

            <PermissionProofMatrix
        rows={staleRows}
      />

      <div className="mt-7 grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
        <article className="rounded-2xl border border-rose-300/20 bg-black/15 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-200/70">
            Before convergence
          </p>

          <p className="mt-3 text-lg font-semibold text-rose-100">
            {stalePresentation.statusLabel}
          </p>

          <p className="mt-1 text-xs leading-5 text-white/45">
            {stalePresentation.detail}
          </p>

          <p className="mt-4 font-mono text-xs text-white/55">
            PID {STALE_PID}
          </p>

          <p className="mt-2 text-xs leading-5 text-white/40">
            Live roles still included MeridianSupervisor, MeridianOperator,
            and MeridianJobRunner.
          </p>
        </article>

        <div
          aria-hidden="true"
          className="flex items-center justify-center text-2xl text-white/20"
        >
          -&gt;
        </div>

        <article className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.04] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200/70">
            After fresh runtime convergence
          </p>

          <p className="mt-3 text-lg font-semibold text-emerald-100">
            LIVE AUTHORITY CONVERGED
          </p>

          <p className="mt-1 text-xs leading-5 text-white/45">
            Fresh runtime authorization matches the configured state.
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <WitnessFact
              label="Old stale PID gone"
              value="YES"
            />

            <WitnessFact
              label="Fresh PID"
              value={String(FRESH_PID)}
            />
          </div>

          <p className="mt-3 text-xs leading-5 text-white/40">
            Fresh PID differs from stale PID. The four revoked permissions
            directly report DENY; retained access remains ALLOW.
          </p>

          <p className="mt-3 text-[10px] leading-5 text-white/35">
            Full recorded proof object closure: {freshPresentation.statusLabel}.
            That closure also depends on native evidence and durable receipt
            persistence; convergence alone is not the VERIFIED verdict.
          </p>
        </article>
      </div>

      <p className="mt-5 rounded-xl border border-white/10 bg-black/10 p-4 text-xs leading-5 text-white/40">
        Claim boundary: this is recorded certified evidence from the isolated
        S1 synthetic witness, not a live privileged browser mutation session.
        It demonstrates a permissions-specific stale-to-converged pattern.
        Convergence is necessary evidence for this case, but Proof Contract V2
        still requires every REQUIRED proof result plus durable receipt
        persistence and exact readback before VERIFIED.
      </p>
    </section>
  );
}

function PermissionProofMatrix({
  rows,
}: {
  rows:
    PermissionProofRow[];
}) {
  return (
    <div className="meridian-table-wrap meridian-convergence-matrix-wrap">
      <table className="meridian-data-table meridian-convergence-matrix">
        <thead>
          <tr>
            <th>Permission</th>
            <th>EXPECTED</th>
            <th>CONFIGURED</th>
            <th>LIVE</th>
            <th>Verdict</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => {
            const mismatch =
              row.configuredDecision !==
              row.liveDecision;

            return (
              <tr key={row.id}>
                <td>
                  <strong>
                    {row.resource}:{row.permission}
                  </strong>
                  <small>
                    {mismatch
                      ? "Configured and live authorization disagree."
                      : "Configured and live authorization agree."}
                  </small>
                </td>
                <td>{row.expectedDecision}</td>
                <td>{row.configuredDecision}</td>
                <td>{row.liveDecision}</td>
                <td>
                  <span
                    className="meridian-proof-verdict"
                    data-tone={mismatch ? "danger" : "success"}
                  >
                    {mismatch ? "MISMATCH" : "MATCH"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
function WitnessFact({
  label,
  value,
}: {
  label:
    string;
  value:
    string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/15 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-semibold text-white/70">
        {value}
      </p>
    </div>
  );
}
