import Link from "next/link";

import {
  AuthorityCallout,
  CodeValue,
  PageHeader,
  SectionHeader,
  StatusBadge,
} from "@/components/meridian/primitives";

import {
  EVIDENCE_PLANES,
} from "@/lib/proof/evidence";

import {
  VERIFIED_ACTION_STATES,
} from "@/lib/proof/action-state";

import {
  isSafeActionReceiptId,
  readPersistentActionReceiptV2,
} from "@/lib/iris/action-receipt-session";

import {
  ProofReceiptPanel,
} from "./proof-receipt-panel";

import styles from "./proof.module.css";

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

const evidenceProvenance = [
  "AUTHORITATIVE_IRIS",
  "AUTHORITATIVE_EXTERNAL_PROBE",
  "MERIDIAN_DERIVED",
  "CORRELATED",
  "NOT_APPLICABLE",
] as const;

const closurePath = [
  {
    label: "PREFLIGHT",
    states: [
      "CREATED",
      "PREFLIGHTING",
      "PREFLIGHTED",
      "APPROVED",
    ],
  },
  {
    label: "REVALIDATE",
    states: [
      "REVALIDATING",
      "READY",
    ],
  },
  {
    label: "APPLY",
    states: [
      "APPLYING",
      "APPLIED",
    ],
  },
  {
    label: "EVIDENCE",
    states: [
      "VERIFYING",
      "EVIDENCE_COMPLETE",
    ],
  },
  {
    label: "RECEIPT + READBACK",
    states: [
      "RECEIPT_PERSISTING",
      "VERIFIED",
    ],
  },
] as const;

const ambiguityPath = [
  "UNKNOWN_AFTER_DISPATCH",
  "RECONCILING",
  "VERIFYING",
] as const;

const terminalFailures = [
  "STALE",
  "DENIED",
  "APPLY_FAILED",
  "VERIFY_FAILED",
  "RECEIPT_WRITE_FAILED",
] as const;

function firstValue(
  value:
    string |
    string[] |
    undefined,
): string {
  if (
    Array.isArray(
      value,
    )
  ) {
    return (
      value[0] ??
      ""
    ).trim();
  }

  return (
    value ??
    ""
  ).trim();
}

export default async function ProofConsolePage({
  searchParams,
}: {
  searchParams:
    SearchParams;
}) {
  const params =
    await searchParams;

  const receiptId =
    firstValue(
      params.receiptId,
    );

  const safeReceiptId =
    receiptId.length ===
      0 ||
    isSafeActionReceiptId(
      receiptId,
    );

  let snapshot:
    Awaited<
      ReturnType<
        typeof readPersistentActionReceiptV2
      >
    > |
    null =
      null;

  if (
    receiptId.length >
      0 &&
    safeReceiptId
  ) {
    try {
      snapshot =
        await readPersistentActionReceiptV2({
          receiptId,
        });
    }
    catch {
      snapshot =
        null;
    }
  }

  return (
    <main className={styles.page}>
      <PageHeader
        eyebrow="Meridian Control Plane / Proof console"
        title="Every privileged operation, under proof."
        description="Inspect the shared Proof Contract V2 lifecycle, its action-specific evidence planes, and any durable Action Receipt V2 that exists in the local IRIS history store."
        actions={
          <>
            <StatusBadge tone="success">
              Proof Contract V2
            </StatusBadge>
            <Link
              href="/proof?receiptId=meridian-o03-process-terminate-r8-a-001"
              className="meridian-action"
            >
              Inspect O03 receipt
            </Link>
          </>
        }
      />

      <section className={styles.lookup}>
        <SectionHeader
          eyebrow="Live durable receipt"
          title="Open an Action Receipt V2"
          detail="Only an opaque receipt id crosses the browser boundary. Meridian performs the authenticated IRIS history read server-side."
        />

        <form
          action="/proof"
          method="get"
          className={styles.lookupForm}
        >
          <label>
            <span>
              Receipt id
            </span>

            <input
              name="receiptId"
              defaultValue={receiptId}
              placeholder="meridian-o03-process-terminate-r8-a-001"
              pattern="[A-Za-z0-9][A-Za-z0-9._:-]{7,127}"
              autoComplete="off"
              spellCheck={false}
            />
          </label>

          <button
            type="submit"
            className="meridian-action meridian-action-primary"
          >
            Read from IRIS history
          </button>
        </form>

        {!safeReceiptId ? (
          <AuthorityCallout
            eyebrow="Receipt id rejected"
            title="Use an opaque Meridian receipt identifier"
            detail="The proof console rejects unsafe identifier shapes before any server-side IRIS request is attempted."
            tone="danger"
          />
        ) : null}

        {receiptId.length > 0 &&
        safeReceiptId &&
        snapshot === null ? (
          <AuthorityCallout
            eyebrow="Live receipt unavailable"
            title="No verified Action Receipt V2 could be loaded"
            detail="The receipt may not exist in this IRIS instance, or the server-owned runtime session may be unavailable. No proof state is inferred from failure to read."
            tone="warning"
          >
            <CodeValue>
              {receiptId}
            </CodeValue>
          </AuthorityCallout>
        ) : null}
      </section>

      {snapshot ? (
        <ProofReceiptPanel
          receipt={snapshot.receipt}
          historyRecord={snapshot.historyRecord}
        />
      ) : null}

      <section className={styles.architecture}>
        <SectionHeader
          eyebrow="Shared Verified Action lifecycle"
          title="APPLIED is not VERIFIED"
          detail="Execution, evidence completion, durable receipt persistence, exact IRIS readback, and VERIFIED remain separate states."
        />

        <div
          className={styles.lifecycleMap}
          aria-label="Proof Contract V2 lifecycle map"
        >
          <div className={styles.closurePath}>
            {closurePath.map((stage, index) => (
              <div
                className={styles.lifecycleStage}
                key={stage.label}
              >
                <span>
                  {String(index + 1).padStart(2, "0")} / {stage.label}
                </span>
                <div>
                  {stage.states.map((state) => (
                    <CodeValue key={state}>
                      {state}
                    </CodeValue>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.lifecycleBranches}>
            <div>
              <span>AMBIGUITY / RECONCILE</span>
              <div>
                {ambiguityPath.map((state) => (
                  <CodeValue key={state}>
                    {state}
                  </CodeValue>
                ))}
              </div>
              <small>
                Ambiguous dispatch reconciles before verification; it is never
                blindly retried.
              </small>
            </div>

            <div>
              <span>TERMINAL FAILURES</span>
              <div>
                {terminalFailures.map((state) => (
                  <CodeValue key={state}>
                    {state}
                  </CodeValue>
                ))}
              </div>
              <small>
                Failure states remain terminal unless a separately reviewed
                recovery contract is authorized.
              </small>
            </div>
          </div>

          <div className={styles.stateVocabulary}>
            <span>COMPLETE STATE VOCABULARY</span>
            <div className={styles.stateGrid}>
              {VERIFIED_ACTION_STATES.map(
                (
                  state,
                ) => (
                  <CodeValue key={state}>
                    {state}
                  </CodeValue>
                ),
              )}
            </div>
          </div>
        </div>

        <AuthorityCallout
          eyebrow="Durable closure"
          title="Receipt persistence is still not enough without exact readback"
          detail="A certified action reaches VERIFIED only after every REQUIRED proof result passes, Action Receipt V2 persists, and canonical server-side IRIS readback matches the frozen receipt."
          tone="success"
        />
      </section>

      <section className={styles.architecture}>
        <SectionHeader
          eyebrow="Evidence registry"
          title="Proof planes are action-specific and explicit"
          detail="Contracts select the planes required for closure. Correlated evidence never becomes authoritative merely because it agrees."
        />

        <div
          className={styles.planeGrid}
          aria-label="Evidence planes"
        >
          {EVIDENCE_PLANES.map(
            (
              plane,
            ) => (
              <div key={plane}>
                <CodeValue>
                  {plane}
                </CodeValue>
              </div>
            ),
          )}
        </div>
      </section>

      <section className={styles.architecture}>
        <SectionHeader
          eyebrow="Evidence provenance"
          title="Agreement does not upgrade authority"
          detail="Every proof result carries an explicit provenance class. REQUIRED evidence must PASS; CORRELATED evidence may support a narrative but is never silently promoted."
        />

        <div
          className={styles.stateGrid}
          aria-label="Evidence provenance classes"
        >
          {evidenceProvenance.map((provenance) => (
            <CodeValue key={provenance}>
              {provenance}
            </CodeValue>
          ))}
        </div>

        <AuthorityCallout
          eyebrow="Judge invariant"
          title="Configuration is not closure."
          detail="Meridian reaches VERIFIED only after fresh revalidation, bounded execution, action-specific proof evidence, durable receipt persistence and exact IRIS readback."
          tone="info"
        />
      </section>

      <section className={styles.architecture}>
        <SectionHeader
          eyebrow="Recorded examples"
          title="One engine, different proof stories"
          detail="The process-termination receipt demonstrates high-risk irreversible closure; the Maya case demonstrates permissions convergence and native audit evidence."
        />

        <div className={styles.closureGrid}>
          <div>
            <span>O03 process termination</span>
            <Link
              href="/proof?receiptId=meridian-o03-process-terminate-r8-a-001"
              className="meridian-text-link"
            >
              HIGH risk / IRREVERSIBLE receipt
            </Link>
          </div>
          <div>
            <span>P04 permissions case</span>
            <Link
              href="/change-cases/verified/maya-patel-supervisor-removal"
              className="meridian-text-link"
            >
              Maya Patel / supervisor removal
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
