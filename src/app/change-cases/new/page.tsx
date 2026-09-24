import Link from "next/link";

import {
  AuthorityCallout,
  CodeValue,
  EvidenceRail,
  type EvidenceStep,
  PageHeader,
  SectionHeader,
  StatusBadge,
} from "@/components/meridian/primitives";

const proofLifecycle: EvidenceStep[] = [
  {
    label: "PREFLIGHT",
    detail: "Intent + target bound",
    state: "complete",
  },
  {
    label: "REVALIDATE",
    detail: "Fresh state must match",
    state: "complete",
  },
  {
    label: "APPLY",
    detail: "Fixed-purpose dispatch",
    state: "complete",
  },
  {
    label: "RECONCILE",
    detail: "Only if dispatch is unknown",
    state: "complete",
  },
  {
    label: "PROVE",
    detail: "Required evidence passes",
    state: "complete",
  },
  {
    label: "PERSIST",
    detail: "Receipt + exact readback",
    state: "complete",
  },
  {
    label: "VERIFIED",
    detail: "Closure reached",
    state: "complete",
  },
];

const actionFamilies = [
  {
    family: "Permissions",
    range: "P01-P06",
    actions: "CREATE ROLE / DELETE ROLE / ADD ROLE / REMOVE ROLE / ENABLE USER / DISABLE USER",
  },
  {
    family: "Processes",
    range: "O01-O03",
    actions: "SUSPEND / RESUME / TERMINATE",
  },
  {
    family: "Tasks",
    range: "T01-T06",
    actions: "CREATE / UPDATE / RUN NOW / SUSPEND / RESUME / DELETE",
  },
  {
    family: "Web applications",
    range: "W01-W04",
    actions: "CREATE / UPDATE / ENABLE / DELETE",
  },
] as const;

const contractDimensions = [
  {
    dimension: "Action identity",
    contract: "One certified semantic action, never a generic mutation body",
  },
  {
    dimension: "Target binding",
    contract: "Exact action-specific identity is fixed before dispatch",
  },
  {
    dimension: "Risk + reversibility",
    contract: "Declared explicitly; irreversible actions stay irreversible",
  },
  {
    dimension: "Transport",
    contract: "Fixed-purpose server contract with server-held authority",
  },
  {
    dimension: "Freshness",
    contract: "Reviewed pre-state is revalidated immediately before execution",
  },
  {
    dimension: "Dispatch ambiguity",
    contract: "UNKNOWN_AFTER_DISPATCH reconciles; no blind automatic retry",
  },
  {
    dimension: "Evidence",
    contract: "Only the action-specific REQUIRED planes can close the contract",
  },
  {
    dimension: "Durable closure",
    contract: "Action Receipt V2 persists and reads back exactly from IRIS before VERIFIED",
  },
] as const;

export default function ActionPreflightPage() {
  return (
    <main className="meridian-new-case">
      <PageHeader
        eyebrow="Change control / Action preflight"
        title="Inspect the contract before authority can execute."
        description="This browser surface explains the fixed-purpose contract Meridian would require for a certified action. It performs no privileged mutation and exposes no generic IRIS management proxy."
        actions={
          <>
            <Link href="/proof" className="meridian-action meridian-action-primary">
              Inspect Proof Contract V2
            </Link>
            <Link href="/change-cases" className="meridian-action">
              Recorded change cases
            </Link>
          </>
        }
      />

      <section className="meridian-new-case-rail" aria-label="Proof Contract V2 closure lifecycle">
        <EvidenceRail steps={proofLifecycle} />
      </section>

      <section className="meridian-runtime-section">
        <SectionHeader
          eyebrow="Certified action catalog"
          title="19 semantic actions. Four bounded families."
          detail="The browser can inspect what each family means without receiving arbitrary privileged execution authority."
        />

        <div className="meridian-table-wrap">
          <table className="meridian-data-table meridian-authority-table">
            <thead>
              <tr>
                <th>Family</th>
                <th>Certified IDs</th>
                <th>Semantic actions</th>
              </tr>
            </thead>
            <tbody>
              {actionFamilies.map((family) => (
                <tr key={family.range}>
                  <td><strong>{family.family}</strong></td>
                  <td><CodeValue>{family.range}</CodeValue></td>
                  <td>{family.actions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="meridian-runtime-section">
        <SectionHeader
          eyebrow="Preflight contract"
          title="What must be bound before a certified action can close"
          detail="The exact values are action-specific, but every certified action preserves the same proof discipline."
        />

        <div className="meridian-table-wrap">
          <table className="meridian-data-table meridian-preflight-table">
            <thead>
              <tr>
                <th>Contract dimension</th>
                <th>Required boundary</th>
              </tr>
            </thead>
            <tbody>
              {contractDimensions.map((item) => (
                <tr key={item.dimension}>
                  <td><strong>{item.dimension}</strong></td>
                  <td>{item.contract}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <AuthorityCallout
          eyebrow="Browser authority boundary"
          title="Inspection only. Generic mutation authority: NONE."
          detail="Certified actions execute only through fixed-purpose server contracts. This route does not run preflight against IRIS, dispatch a mutation, expose a runtime credential, or create a generic privileged action console."
          tone="info"
        >
          <StatusBadge tone="success">READ ONLY</StatusBadge>
        </AuthorityCallout>
      </section>

      <section className="meridian-runtime-section">
        <SectionHeader
          eyebrow="Flagship examples"
          title="Different actions, one closure discipline"
          detail="Permissions and process termination require different evidence, but both inherit the shared Proof Contract V2 boundaries."
        />

        <div className="meridian-table-wrap">
          <table className="meridian-data-table meridian-authority-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Contract posture</th>
                <th>Judge-visible proof boundary</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><CodeValue>P04 USER_REMOVE_ROLE</CodeValue></td>
                <td>Action-specific permissions contract</td>
                <td>Configuration, live authority, native audit, and durable receipt evidence remain distinct.</td>
              </tr>
              <tr>
                <td><CodeValue>O03 PROCESS_TERMINATE</CodeValue></td>
                <td><strong>HIGH / IRREVERSIBLE</strong></td>
                <td>Exact process identity, no blind retry after ambiguous dispatch, authoritative absence, durable receipt readback.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="meridian-staging-action-row">
          <div>
            <span className="meridian-record-label">Execution boundary</span>
            <strong>Browser mutation controls intentionally absent</strong>
          </div>

          <Link
            href="/proof?receiptId=meridian-o03-process-terminate-r8-a-001"
            className="meridian-action"
          >
            Inspect recorded O03 receipt
          </Link>
        </div>
      </section>
    </main>
  );
}
