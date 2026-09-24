import Link from "next/link";

import {
  AuthorityCallout,
  CodeValue,
  MetricCell,
  PageHeader,
  SectionHeader,
  StatusBadge,
} from "@/components/meridian/primitives";
import {
  readWebRestProductSurfaceFromEnvironment,
} from "@/lib/iris/web-rest-product-server";

export const dynamic =
  "force-dynamic";

const webActions = [
  ["W01", "CREATE", "Create one reviewed web application"],
  ["W02", "UPDATE", "Update the reviewed application configuration"],
  ["W03", "ENABLE", "Enable the reviewed application"],
  ["W04", "DELETE", "Delete the reviewed application"],
] as const;

function webActionLabel(
  actionType: string,
): string {
  if (actionType === "WEB_APP_CREATE") {
    return "W01 CREATE";
  }

  if (actionType === "WEB_APP_UPDATE") {
    return "W02 UPDATE";
  }

  if (
    actionType === "WEB_APP_ENABLE" ||
    actionType === "WEB_APP_ENABLE_RECOVERY"
  ) {
    return "W03 ENABLE";
  }

  if (actionType === "WEB_APP_DELETE") {
    return "W04 DELETE";
  }

  return actionType;
}

export default async function WebRestPage() {
  const surface =
    await readWebRestProductSurfaceFromEnvironment();

  return (
    <main className="meridian-runtime-page">
      <PageHeader
        eyebrow="Surfaces / WEB APPS / REST"
        title="Deployment identity and endpoint proof."
        description="Meridian joins live application inventory, deployed REST truth, durable verified receipts, and fresh current-state readback. W01-W04 are certified fixed-purpose server actions without widening browser authority."
        actions={
          <>
            <Link href="/" className="meridian-action">
              Control room
            </Link>
            <StatusBadge tone="success">READ ONLY</StatusBadge>
          </>
        }
      />

      <section className="meridian-runtime-section">
        <SectionHeader
          eyebrow="Certified web-application actions"
          title="W01-W04 are four fixed-purpose semantic contracts"
          detail="Create, update, enable, and delete remain separate certified actions even when multiple actions share the same official transport."
        />

        <div className="meridian-table-wrap">
          <table className="meridian-data-table meridian-authority-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Semantic operation</th>
                <th>Contract intent</th>
              </tr>
            </thead>
            <tbody>
              {webActions.map(([id, action, detail]) => (
                <tr key={id}>
                  <td><CodeValue>{id}</CodeValue></td>
                  <td><strong>{action}</strong></td>
                  <td>{detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="meridian-runtime-section">
        <SectionHeader
          eyebrow="Provenance"
          title="Five evidence sources, one joined proof surface"
          detail="Deployment truth and declared protection stay distinct so Meridian never implies code authorization it did not prove."
        />

        <div className="meridian-table-wrap">
          <table className="meridian-data-table meridian-webrest-provenance-table">
            <thead>
              <tr>
                <th>Evidence plane</th>
                <th>Authoritative source</th>
                <th>Meridian proof claim</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Web application inventory</td>
                <td>InterSystems SysAdmin REST, server-side</td>
                <td><CodeValue>Meridian BFF: /api/admin/v2/web-apps</CodeValue></td>
              </tr>
              <tr>
                <td>Deployed REST truth</td>
                <td>Native emitted Swagger</td>
                <td><StatusBadge tone="success">PROVEN DEPLOYMENT</StatusBadge></td>
              </tr>
              <tr>
                <td>Protection metadata</td>
                <td>Authoritative OpenAPI</td>
                <td><StatusBadge tone="success">PROVEN DECLARED METADATA</StatusBadge></td>
              </tr>
              <tr>
                <td>Verified action history</td>
                <td>Durable hash-bound receipts</td>
                <td><StatusBadge tone="success">CANONICAL HASH VALIDATED</StatusBadge></td>
              </tr>
              <tr>
                <td>Current-state recheck</td>
                <td>Official SysAdmin + live HTTP</td>
                <td><StatusBadge tone="success">FRESH READBACK</StatusBadge></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {surface.status === "unavailable" ? (
        <section className="meridian-runtime-section">
          <AuthorityCallout
            eyebrow="Safe failure boundary"
            title="Live management read unavailable"
            detail="The live management read failed closed. Meridian exposes no fallback mutation path, browser credential, or generic mutation proxy."
            tone="warning"
          >
            <CodeValue>{surface.reason}</CodeValue>
            <p>{surface.message}</p>
          </AuthorityCallout>
        </section>
      ) : (
        <>
          <section className="meridian-runtime-metrics" aria-label="Web and REST summary">
            <MetricCell
              label="Applications"
              value={surface.applications.length}
              detail="live Meridian web apps"
            />
            <MetricCell
              label="Application REST operations"
              value={surface.operations.length}
              detail="deployed + declared join"
            />
            <MetricCell
              label="Certified semantic actions"
              value={4}
              detail="W01-W04"
            />
            <MetricCell
              label="Historical verified receipts"
              value={surface.verifiedLifecycle.historyCount}
              detail="durable lifecycle evidence"
            />
          </section>

          <section className="meridian-runtime-section">
            <SectionHeader
              eyebrow="Verified lifecycle"
              title="Historical proof is not current state"
              detail="Meridian keeps immutable VERIFIED receipts separate from a fresh SysAdmin and HTTP recheck, so history is never rewritten to match the present."
            />

            <AuthorityCallout
              eyebrow="Current-state recheck"
              title={`${surface.verifiedLifecycle.targetDisplayName}: ${surface.verifiedLifecycle.currentApplicationState}`}
              detail="This historical W04 test target is freshly re-read on the server. Its current state is not inferred from the last receipt."
              tone={surface.verifiedLifecycle.currentApplicationState === "ABSENT" && surface.verifiedLifecycle.currentHttpStatus === 404 ? "success" : "warning"}
            >
              <CodeValue>{surface.verifiedLifecycle.targetCanonicalId}</CodeValue>
              <StatusBadge tone={surface.verifiedLifecycle.currentHttpStatus === 404 ? "success" : "warning"}>
                HTTP {surface.verifiedLifecycle.currentHttpStatus}
              </StatusBadge>
              <p>
                History integrity: {surface.verifiedLifecycle.historyIntegrity}. Current-state source: {surface.verifiedLifecycle.currentStateSource}.
              </p>
            </AuthorityCallout>

            <AuthorityCallout
              eyebrow="Breadth vs evidence volume"
              title={`4 certified semantic actions, ${surface.verifiedLifecycle.historyCount} retained verified receipts`}
              detail="Receipt count is historical evidence volume, not action breadth. Additional W03 receipts preserve bounded recovery-certification history without creating extra semantic actions."
              tone="info"
            />

            <div className="meridian-table-wrap">
              <table className="meridian-data-table meridian-runtime-table">
                <thead>
                  <tr>
                    <th>Step</th>
                    <th>Semantic action</th>
                    <th>State</th>
                    <th>Proof planes</th>
                    <th>Receipt integrity</th>
                    <th>Applied UTC</th>
                  </tr>
                </thead>
                <tbody>
                  {surface.verifiedLifecycle.receipts.map((receipt, index) => (
                    <tr key={receipt.receiptId}>
                      <td>{String(index + 1).padStart(2, "0")}</td>
                      <td>
                        <strong>{webActionLabel(receipt.actionType)}</strong>
                        <small><CodeValue>{receipt.actionId}</CodeValue></small>
                        <small>{receipt.receiptId}</small>
                      </td>
                      <td><StatusBadge tone="success">{receipt.lifecycleState}</StatusBadge></td>
                      <td>
                        {receipt.proofResults.map((proof) => (
                          <small key={`${receipt.receiptId}:${proof.plane}`}>
                            {proof.plane}: {proof.status}
                          </small>
                        ))}
                      </td>
                      <td>
                        <CodeValue>{receipt.receiptSha256.slice(0, 16)}...</CodeValue>
                        <small>Canonical SHA-256 retained in receipt</small>
                      </td>
                      <td>{receipt.applyUtc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="meridian-runtime-section">
            <SectionHeader
              eyebrow="Live application protection"
              title={`${surface.applications.length} Meridian web applications`}
              detail="Live application identity, namespace, Application resource, and Dispatch class."
            />

            <div className="meridian-table-wrap">
              <table className="meridian-data-table meridian-webapp-table">
                <thead>
                  <tr>
                    <th>Application</th>
                    <th>State</th>
                    <th>Namespace</th>
                    <th>Application resource</th>
                    <th>Dispatch class</th>
                  </tr>
                </thead>
                <tbody>
                  {surface.applications.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No Meridian web applications are visible.</td>
                    </tr>
                  ) : (
                    surface.applications.map((application) => (
                      <tr key={application.name}>
                        <td><CodeValue>{application.name}</CodeValue></td>
                        <td>
                          <StatusBadge tone={application.enabled ? "success" : "neutral"}>
                            {application.enabled ? "ENABLED" : "DISABLED"}
                          </StatusBadge>
                        </td>
                        <td>{application.namespace}</td>
                        <td><CodeValue>{application.resource || "NONE DECLARED"}</CodeValue></td>
                        <td><CodeValue>{application.dispatchClass || "NONE"}</CodeValue></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="meridian-runtime-section">
            <SectionHeader
              eyebrow="REST / OpenAPI exploration"
              title={`${surface.operations.length} deployed application operations joined to declared protection`}
              detail="These are application REST operations, not Meridian's certified mutation-endpoint count. Each row separates deployed route truth from declared Required resources."
            />

            <div className="meridian-table-wrap">
              <table className="meridian-data-table meridian-endpoint-table">
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Path</th>
                    <th>Operation ID</th>
                    <th>Required resources</th>
                    <th>Deployment proof</th>
                    <th>Protection proof</th>
                  </tr>
                </thead>
                <tbody>
                  {surface.operations.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No deployed REST operations are visible.</td>
                    </tr>
                  ) : (
                    surface.operations.map((operation) => (
                      <tr key={`${operation.method}:${operation.path}:${operation.operationId}`}>
                        <td><StatusBadge>{operation.method}</StatusBadge></td>
                        <td><CodeValue>{operation.path}</CodeValue></td>
                        <td><CodeValue>{operation.operationId}</CodeValue></td>
                        <td>
                          {operation.requiredResources.length === 0
                            ? "NONE"
                            : operation.requiredResources.map((requirement) => (
                                <CodeValue key={requirement}>{requirement}</CodeValue>
                              ))}
                        </td>
                        <td>
                          <StatusBadge tone="success">PROVEN DEPLOYMENT</StatusBadge>
                          <small>Native emitted Swagger</small>
                        </td>
                        <td>
                          <StatusBadge tone="success">PROVEN DECLARED METADATA</StatusBadge>
                          <small>Authoritative OpenAPI</small>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <section className="meridian-runtime-section">
        <SectionHeader
          eyebrow="Authority boundary"
          title="Rendered evidence, not a management proxy"
          detail="This browser surface exposes inventory and protection proof; W01-W04 execute through separate fixed-purpose server contracts."
        />

        <div className="meridian-table-wrap">
          <table className="meridian-data-table meridian-authority-table">
            <thead>
              <tr>
                <th>Boundary</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Browser credential</td><td><StatusBadge tone="success">NOT EXPOSED</StatusBadge></td></tr>
              <tr><td>Generic mutation proxy</td><td><StatusBadge tone="success">NONE</StatusBadge></td></tr>
              <tr><td>Browser mutation controls</td><td><StatusBadge tone="success">NONE</StatusBadge></td></tr>
              <tr><td>Surface mode</td><td><StatusBadge tone="success">READ ONLY EVIDENCE</StatusBadge></td></tr>
              <tr><td>Certified web-app actions</td><td><CodeValue>W01-W04</CodeValue></td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
