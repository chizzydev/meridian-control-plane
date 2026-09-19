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

export default async function WebRestPage() {
  const surface =
    await readWebRestProductSurfaceFromEnvironment();

  return (
    <main className="meridian-runtime-page">
      <PageHeader
        eyebrow="Surfaces / WEB APPS / REST"
        title="Deployment identity and endpoint proof."
        description="Permissions remains the centerpiece. Meridian joins live application inventory and Native emitted Swagger to Authoritative OpenAPI protection metadata without widening browser authority."
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
          eyebrow="Provenance"
          title="Three evidence sources, one joined operator surface"
          detail="Deployment truth and declared protection are kept distinct so Meridian never implies code authorization it did not prove."
        />

        <div className="meridian-table-wrap">
          <table className="meridian-data-table meridian-webrest-provenance-table">
            <thead>
              <tr>
                <th>Evidence plane</th>
                <th>Source</th>
                <th>Proof claim</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Web application inventory</td>
                <td>Official SysAdmin REST</td>
                <td><CodeValue>/api/admin/v2/web-apps</CodeValue></td>
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
            </tbody>
          </table>
        </div>
      </section>

      {surface.status === "unavailable" ? (
        <section className="meridian-runtime-section">
          <AuthorityCallout
            eyebrow="Safe failure boundary"
            title="Live management read unavailable"
            detail="The live management read failed closed. Meridian exposes no fallback mutation path, browser credential, or public management proxy."
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
              label="REST operations"
              value={surface.operations.length}
              detail="deployed + declared join"
            />
            <MetricCell
              label="Runtime API"
              value={`v${surface.runtime.apiVersion}`}
              detail={surface.runtime.username}
            />
            <MetricCell
              label="Mutation controls"
              value="NONE"
              detail="read-only surface"
            />
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
              title={`${surface.operations.length} deployed operations joined to declared protection`}
              detail="Each row separates deployed route truth from declared Required resources."
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
          detail="The public surface exposes inventory and protection proof only."
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
              <tr><td>Public management proxy</td><td><StatusBadge tone="success">NONE</StatusBadge></td></tr>
              <tr><td>Mutation controls</td><td><StatusBadge tone="success">NONE</StatusBadge></td></tr>
              <tr><td>Mode</td><td><StatusBadge tone="success">READ ONLY</StatusBadge></td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
