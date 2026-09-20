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
        description="Inspect the generic Verified Action lifecycle, its evidence planes, and any durable Action Receipt V2 that exists in the local IRIS history store."
        actions={
          <StatusBadge tone="success">
            Proof Contract V2
          </StatusBadge>
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
              placeholder="meridian-v2-user-remove-role-..."
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
          eyebrow="Verified Action lifecycle"
          title="APPLIED is not closure"
          detail="The generic state machine keeps execution, evidence completion, durable receipt persistence and VERIFIED distinct."
        />

        <div
          className={styles.stateGrid}
          aria-label="Verified Action states"
        >
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

        <AuthorityCallout
          eyebrow="Judge invariant"
          title="Configuration is not closure."
          detail="Meridian reaches VERIFIED only after fresh revalidation, bounded execution, action-specific proof evidence, durable receipt persistence and exact readback."
          tone="info"
        />
      </section>
    </main>
  );
}
