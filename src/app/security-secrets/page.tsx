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
  readSecuritySecretsSurfaceFromEnvironment,
} from "@/lib/iris/security-secrets-product-server";

export const dynamic =
  "force-dynamic";

function listOr(
  values: readonly string[],
  fallback: string,
): string {
  return values.join(", ") || fallback;
}

export default async function SecuritySecretsPage() {
  const surface =
    await readSecuritySecretsSurfaceFromEnvironment();

  return (
    <main className="meridian-runtime-page">
      <PageHeader
        eyebrow="Surfaces / SECURITY / SECRETS"
        title="Security metadata, never secret material."
        description="Meridian uses an EXPLICIT ESCALATION ROLE for server-owned metadata reads. The browser receives approved metadata only; secret material never crosses the display boundary."
        actions={
          <>
            <Link href="/" className="meridian-action">
              Control room
            </Link>
            <StatusBadge tone="success">METADATA ONLY</StatusBadge>
            <StatusBadge>READ ONLY</StatusBadge>
          </>
        }
      />

      <section className="meridian-runtime-section">
        <SectionHeader
          eyebrow="Authority boundary"
          title="MeridianSecurityMetadataReader"
          detail="Permissions remains the centerpiece: narrow metadata authority is escalated explicitly instead of broadening the default runtime role."
        />

        <div className="meridian-table-wrap">
          <table className="meridian-data-table meridian-authority-table">
            <thead>
              <tr>
                <th>Boundary</th>
                <th>State</th>
                <th>Operator interpretation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Authority</td>
                <td><CodeValue>MeridianSecurityMetadataReader</CodeValue></td>
                <td>Explicit server-owned metadata escalation.</td>
              </tr>
              <tr>
                <td>Default runtime broadened</td>
                <td><StatusBadge tone="success">NO</StatusBadge></td>
                <td>The standing runtime role remains unchanged.</td>
              </tr>
              <tr>
                <td>Source</td>
                <td>Official SysAdmin REST</td>
                <td>Six approved metadata families plus safe nested metadata.</td>
              </tr>
              <tr>
                <td>Public management proxy</td>
                <td><StatusBadge tone="success">NONE</StatusBadge></td>
                <td>No browser management route is created.</td>
              </tr>
              <tr>
                <td>Mutation controls</td>
                <td><StatusBadge tone="success">NONE</StatusBadge></td>
                <td>Inventory inspection only.</td>
              </tr>
              <tr>
                <td>Browser credential</td>
                <td><StatusBadge tone="success">NOT EXPOSED</StatusBadge></td>
                <td>Credential use remains server-owned.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {surface.status === "unavailable" ? (
        <section className="meridian-runtime-section">
          <AuthorityCallout
            eyebrow="Safe failure boundary"
            title="Live security metadata unavailable"
            detail="The metadata read failed closed. Meridian exposes no fallback secret access, public management proxy, or mutation control."
            tone="warning"
          >
            <CodeValue>{surface.reason}</CodeValue>
            <p>{surface.message}</p>
          </AuthorityCallout>
        </section>
      ) : (
        <>
          <section className="meridian-runtime-metrics" aria-label="Security metadata summary">
            <MetricCell
              label="Wallet"
              value={surface.walletCollections.length}
              detail="wallet collections"
            />
            <MetricCell
              label="X.509"
              value={surface.x509Credentials.length}
              detail="credential metadata rows"
            />
            <MetricCell
              label="TLS / SSL"
              value={surface.sslConfigurations.length}
              detail="SSL configurations"
            />
            <MetricCell
              label="OAuth families"
              value={
                surface.oauthClientServers.length +
                surface.oauthResourceServers.length +
                surface.oauthServerClients.length
              }
              detail="approved OAuth metadata rows"
            />
          </section>

          <section className="meridian-runtime-section">
            <SectionHeader
              eyebrow="Wallet"
              title={`${surface.walletCollections.length} wallet collections`}
              detail="Secret name/type metadata only. Values are never rendered."
            />

            <div className="meridian-table-wrap">
              <table className="meridian-data-table meridian-security-table">
                <thead>
                  <tr>
                    <th>Collection</th>
                    <th>Edit resource</th>
                    <th>Use resource</th>
                    <th>Secret name/type metadata only</th>
                  </tr>
                </thead>
                <tbody>
                  {surface.walletCollections.length === 0 ? (
                    <tr>
                      <td colSpan={4}>No wallet collections are configured.</td>
                    </tr>
                  ) : (
                    surface.walletCollections.map((collection) => (
                      <tr key={collection.name}>
                        <td><CodeValue>{collection.name || "UNNAMED COLLECTION"}</CodeValue></td>
                        <td><CodeValue>{collection.editResource || "NONE"}</CodeValue></td>
                        <td><CodeValue>{collection.useResource || "NONE"}</CodeValue></td>
                        <td>
                          {collection.secrets.length === 0
                            ? "No secret metadata rows"
                            : collection.secrets
                                .map((secret) => `${secret.name} [${secret.type}]`)
                                .join(", ")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="meridian-runtime-section">
            <SectionHeader
              eyebrow="X.509"
              title={`${surface.x509Credentials.length} credential metadata rows`}
              detail="Presence and identity metadata only; private-key and certificate material remains outside the page."
            />

            <div className="meridian-table-wrap">
              <table className="meridian-data-table meridian-security-table">
                <thead>
                  <tr>
                    <th>Alias</th>
                    <th>Private key present</th>
                    <th>Owners</th>
                    <th>Peer names</th>
                    <th>CA file metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {surface.x509Credentials.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No X.509 credential metadata rows are configured.</td>
                    </tr>
                  ) : (
                    surface.x509Credentials.map((credential) => (
                      <tr key={credential.alias}>
                        <td><CodeValue>{credential.alias || "UNNAMED ALIAS"}</CodeValue></td>
                        <td>
                          <StatusBadge tone={credential.hasPrivateKey ? "warning" : "neutral"}>
                            {credential.hasPrivateKey ? "YES" : "NO"}
                          </StatusBadge>
                        </td>
                        <td>{listOr(credential.owners, "ALL USERS")}</td>
                        <td>{listOr(credential.peerNames, "NONE")}</td>
                        <td><CodeValue>{credential.caFile || "NONE"}</CodeValue></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="meridian-runtime-section">
            <SectionHeader
              eyebrow="TLS / SSL"
              title={`${surface.sslConfigurations.length} SSL configurations`}
              detail="Configuration identity and state only."
            />

            <div className="meridian-table-wrap">
              <table className="meridian-data-table meridian-security-table">
                <thead>
                  <tr>
                    <th>Configuration</th>
                    <th>State</th>
                    <th>Type</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {surface.sslConfigurations.length === 0 ? (
                    <tr>
                      <td colSpan={4}>No SSL configuration metadata rows are configured.</td>
                    </tr>
                  ) : (
                    surface.sslConfigurations.map((configuration) => (
                      <tr key={configuration.name}>
                        <td><CodeValue>{configuration.name || "UNNAMED CONFIGURATION"}</CodeValue></td>
                        <td>
                          <StatusBadge tone={configuration.enabled ? "success" : "neutral"}>
                            {configuration.enabled ? "ENABLED" : "DISABLED"}
                          </StatusBadge>
                        </td>
                        <td>{configuration.type || "UNSPECIFIED"}</td>
                        <td>{configuration.description || "NONE"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="meridian-runtime-section">
            <SectionHeader
              eyebrow="OAuth client"
              title={`${surface.oauthClientServers.length} authorization-server definitions`}
              detail="Authorization-server identity plus Client configuration metadata."
            />

            <div className="meridian-table-wrap">
              <table className="meridian-data-table meridian-security-oauth-table">
                <thead>
                  <tr>
                    <th>Server</th>
                    <th>Issuer endpoint</th>
                    <th>Clients</th>
                    <th>Resources</th>
                    <th>Client configuration metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {surface.oauthClientServers.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No OAuth client-server definitions are configured.</td>
                    </tr>
                  ) : (
                    surface.oauthClientServers.map((server) => (
                      <tr key={server.id}>
                        <td><CodeValue>{server.id || "UNNAMED SERVER"}</CodeValue></td>
                        <td><CodeValue>{server.issuerEndpoint || "NONE"}</CodeValue></td>
                        <td>{server.clientCount}</td>
                        <td>{server.resourceCount}</td>
                        <td>
                          {server.clients.length === 0
                            ? "No client configuration metadata rows"
                            : server.clients
                                .map(
                                  (client) =>
                                    `${client.applicationName || "NONE"} / ${client.clientType || "NONE"} / ${client.defaultScope || "NONE"}`,
                                )
                                .join("; ")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="meridian-runtime-split">
            <div className="meridian-runtime-section">
              <SectionHeader
                eyebrow="OAuth resource server"
                title={`${surface.oauthResourceServers.length} resource-server metadata rows`}
                detail="Registered resource-server identity and server-definition metadata."
              />

              <div className="meridian-table-wrap">
                <table className="meridian-data-table meridian-security-table">
                  <thead>
                    <tr>
                      <th>Resource server</th>
                      <th>Server definition</th>
                    </tr>
                  </thead>
                  <tbody>
                    {surface.oauthResourceServers.length === 0 ? (
                      <tr>
                        <td colSpan={2}>No OAuth resource-server metadata rows are configured.</td>
                      </tr>
                    ) : (
                      surface.oauthResourceServers.map((server) => (
                        <tr key={server.name}>
                          <td><CodeValue>{server.name || "UNNAMED RESOURCE SERVER"}</CodeValue></td>
                          <td>{server.serverDefinition || "NONE"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="meridian-runtime-section">
              <SectionHeader
                eyebrow="OAuth server client"
                title={`${surface.oauthServerClients.length} registered-client metadata rows`}
                detail="Approved registration metadata without client-secret material."
              />

              <div className="meridian-table-wrap">
                <table className="meridian-data-table meridian-security-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Client ID</th>
                      <th>Type</th>
                      <th>Redirect URLs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {surface.oauthServerClients.length === 0 ? (
                      <tr>
                        <td colSpan={4}>No OAuth server-client metadata rows are configured.</td>
                      </tr>
                    ) : (
                      surface.oauthServerClients.map((client) => (
                        <tr key={`${client.name}:${client.clientId}`}>
                          <td>
                            <strong>{client.name || "UNNAMED CLIENT"}</strong>
                            <small>{client.description || "No description"}</small>
                          </td>
                          <td><CodeValue>{client.clientId || "NONE"}</CodeValue></td>
                          <td>{client.clientType || "NONE"}</td>
                          <td>{listOr(client.redirectUrls, "NONE")}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}

      <section className="meridian-runtime-section">
        <SectionHeader
          eyebrow="Non-negotiable material boundary"
          title="Metadata visibility stops before secret material."
          detail="These display prohibitions are part of the product contract, not empty-state copy."
        />

        <div className="meridian-table-wrap">
          <table className="meridian-data-table meridian-material-boundary-table">
            <thead>
              <tr>
                <th>Material class</th>
                <th>Display policy</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Secret values</td><td><StatusBadge tone="success">NEVER</StatusBadge></td></tr>
              <tr><td>Private-key material</td><td><StatusBadge tone="success">NEVER</StatusBadge></td></tr>
              <tr><td>Certificate bodies</td><td><StatusBadge tone="success">NEVER</StatusBadge></td></tr>
              <tr><td>Client secrets / passwords</td><td><StatusBadge tone="success">NEVER</StatusBadge></td></tr>
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
