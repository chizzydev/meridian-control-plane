import Link
  from "next/link";

import {
  readSecuritySecretsSurfaceFromEnvironment,
} from "@/lib/iris/security-secrets-product-server";

export const dynamic =
  "force-dynamic";

export default async function SecuritySecretsPage() {
  const surface =
    await readSecuritySecretsSurfaceFromEnvironment();

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8 sm:px-10 sm:py-12">
      <Link
        href="/"
        className="text-sm text-white/45 transition hover:text-white"
      >
        â† Meridian Control Plane
      </Link>

      <header className="mt-8 border-b border-white/10 pb-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-3 py-1 text-xs font-semibold text-violet-100">
            SECURITY / SECRETS
          </span>

          <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">
            METADATA ONLY
          </span>

          <span className="rounded-full border border-sky-300/25 bg-sky-300/10 px-3 py-1 text-xs font-semibold text-sky-100">
            EXPLICIT ESCALATION ROLE
          </span>

          <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-xs text-white/50">
            Permissions remains the centerpiece
          </span>
        </div>

        <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
          Security posture metadata without exposing the material it protects.
        </h1>

        <p className="mt-5 max-w-3xl text-base leading-7 text-white/55">
          Meridian explicitly escalates a server-side read session into a narrow
          metadata role, reads official IRIS security inventories, and returns only
          fields approved for operator visibility.
        </p>
      </header>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <BoundaryCard
          title="Authority"
          value="MeridianSecurityMetadataReader"
          detail="Escalation-only. The default runtime role is not broadened."
        />

        <BoundaryCard
          title="Source"
          value="Official SysAdmin REST"
          detail="Six security metadata inventories; nested metadata only where parents exist."
        />

        <BoundaryCard
          title="Secret material"
          value="NEVER"
          detail="No secret values, private-key material, certificate bodies, client secrets, or passwords."
        />
      </section>

      {surface.status === "unavailable" ? (
        <section className="mt-8 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100/70">
            Safe failure boundary
          </p>

          <h2 className="mt-3 text-2xl font-semibold text-white">
            Live security metadata unavailable
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">
            {surface.message}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Fact
              label="Reason"
              value={surface.reason}
            />

            <Fact
              label="Fallback secret access"
              value="NONE"
            />
          </div>
        </section>
      ) : (
        <>
          <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                  Live security authority
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Explicit escalation, metadata-only read
                </h2>
              </div>

              <div className="text-right text-xs leading-5 text-white/40">
                <p>Runtime: {surface.runtime.username} / API v{surface.runtime.apiVersion}</p>
                <p>Role: {surface.authority.role}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Fact
                label="Explicit escalation"
                value={surface.authority.explicitEscalation ? "YES" : "NO"}
              />

              <Fact
                label="Default runtime broadened"
                value={surface.authority.defaultRuntimeBroadened ? "YES" : "NO"}
              />

              <Fact
                label="Mutation controls"
                value="NONE"
              />
            </div>
          </section>

          <InventorySection
            eyebrow="Wallet"
            title={`${surface.walletCollections.length} wallet collections`}
          >
            {surface.walletCollections.length === 0 ? (
              <EmptyInventory text="No wallet collections are configured." />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {surface.walletCollections.map(
                  (
                    collection,
                  ) => (
                    <article
                      key={collection.name}
                      className="rounded-xl border border-white/10 bg-black/20 p-5"
                    >
                      <code className="text-sm font-semibold text-violet-100">
                        {collection.name || "UNNAMED COLLECTION"}
                      </code>

                      <dl className="mt-4 grid gap-3 text-sm">
                        <Detail
                          label="Edit resource"
                          value={collection.editResource || "NONE"}
                        />

                        <Detail
                          label="Use resource"
                          value={collection.useResource || "NONE"}
                        />
                      </dl>

                      <div className="mt-5 border-t border-white/10 pt-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
                          Secret name/type metadata only
                        </p>

                        {collection.secrets.length === 0 ? (
                          <p className="mt-3 text-sm text-white/40">
                            No secret metadata rows.
                          </p>
                        ) : (
                          <div className="mt-3 grid gap-2">
                            {collection.secrets.map(
                              (
                                secret,
                              ) => (
                                <div
                                  key={`${secret.name}:${secret.type}`}
                                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2"
                                >
                                  <code className="text-xs text-white/70">
                                    {secret.name}
                                  </code>

                                  <span className="text-xs text-white/40">
                                    {secret.type}
                                  </span>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  ),
                )}
              </div>
            )}
          </InventorySection>

          <InventorySection
            eyebrow="X.509"
            title={`${surface.x509Credentials.length} credential metadata rows`}
          >
            {surface.x509Credentials.length === 0 ? (
              <EmptyInventory text="No X.509 credential metadata rows are configured." />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {surface.x509Credentials.map(
                  (
                    credential,
                  ) => (
                    <article
                      key={credential.alias}
                      className="rounded-xl border border-white/10 bg-black/20 p-5"
                    >
                      <code className="text-sm font-semibold text-violet-100">
                        {credential.alias || "UNNAMED ALIAS"}
                      </code>

                      <dl className="mt-4 grid gap-3 text-sm">
                        <Detail
                          label="Private key present"
                          value={credential.hasPrivateKey ? "YES" : "NO"}
                        />

                        <Detail
                          label="Owners"
                          value={credential.owners.join(", ") || "ALL USERS"}
                        />

                        <Detail
                          label="Peer names"
                          value={credential.peerNames.join(", ") || "NONE"}
                        />

                        <Detail
                          label="CA file metadata"
                          value={credential.caFile || "NONE"}
                        />
                      </dl>
                    </article>
                  ),
                )}
              </div>
            )}
          </InventorySection>

          <InventorySection
            eyebrow="TLS / SSL"
            title={`${surface.sslConfigurations.length} SSL configurations`}
          >
            {surface.sslConfigurations.length === 0 ? (
              <EmptyInventory text="No SSL configuration metadata rows are configured." />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {surface.sslConfigurations.map(
                  (
                    configuration,
                  ) => (
                    <article
                      key={configuration.name}
                      className="rounded-xl border border-white/10 bg-black/20 p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <code className="text-sm font-semibold text-violet-100">
                          {configuration.name || "UNNAMED CONFIGURATION"}
                        </code>

                        <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[11px] font-semibold text-white/60">
                          {configuration.enabled ? "ENABLED" : "DISABLED"}
                        </span>
                      </div>

                      <dl className="mt-4 grid gap-3 text-sm">
                        <Detail
                          label="Type"
                          value={configuration.type || "UNSPECIFIED"}
                        />

                        <Detail
                          label="Description"
                          value={configuration.description || "NONE"}
                        />
                      </dl>
                    </article>
                  ),
                )}
              </div>
            )}
          </InventorySection>

          <InventorySection
            eyebrow="OAuth client"
            title={`${surface.oauthClientServers.length} authorization-server definitions`}
          >
            {surface.oauthClientServers.length === 0 ? (
              <EmptyInventory text="No OAuth client-server definitions are configured." />
            ) : (
              <div className="grid gap-4">
                {surface.oauthClientServers.map(
                  (
                    server,
                  ) => (
                    <article
                      key={server.id}
                      className="rounded-xl border border-white/10 bg-black/20 p-5"
                    >
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                        <div>
                          <code className="text-sm font-semibold text-violet-100">
                            {server.id || "UNNAMED SERVER"}
                          </code>

                          <p className="mt-3 break-all text-sm text-white/50">
                            {server.issuerEndpoint || "No issuer endpoint metadata"}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <Fact
                            label="Client count"
                            value={String(server.clientCount)}
                          />

                          <Fact
                            label="Resource count"
                            value={String(server.resourceCount)}
                          />
                        </div>
                      </div>

                      <div className="mt-5 border-t border-white/10 pt-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
                          Client configuration metadata
                        </p>

                        {server.clients.length === 0 ? (
                          <p className="mt-3 text-sm text-white/40">
                            No client configuration metadata rows.
                          </p>
                        ) : (
                          <div className="mt-3 grid gap-2">
                            {server.clients.map(
                              (
                                client,
                              ) => (
                                <div
                                  key={`${client.applicationName}:${client.clientType}:${client.defaultScope}`}
                                  className="grid gap-2 rounded-lg border border-white/10 bg-white/[0.025] p-3 sm:grid-cols-3"
                                >
                                  <Fact
                                    label="Application"
                                    value={client.applicationName || "NONE"}
                                  />

                                  <Fact
                                    label="Client type"
                                    value={client.clientType || "NONE"}
                                  />

                                  <Fact
                                    label="Default scope"
                                    value={client.defaultScope || "NONE"}
                                  />
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  ),
                )}
              </div>
            )}
          </InventorySection>

          <InventorySection
            eyebrow="OAuth resource server"
            title={`${surface.oauthResourceServers.length} resource-server metadata rows`}
          >
            {surface.oauthResourceServers.length === 0 ? (
              <EmptyInventory text="No OAuth resource-server metadata rows are configured." />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {surface.oauthResourceServers.map(
                  (
                    server,
                  ) => (
                    <article
                      key={server.name}
                      className="rounded-xl border border-white/10 bg-black/20 p-5"
                    >
                      <code className="text-sm font-semibold text-violet-100">
                        {server.name || "UNNAMED RESOURCE SERVER"}
                      </code>

                      <p className="mt-3 text-sm text-white/45">
                        Server definition: {server.serverDefinition || "NONE"}
                      </p>
                    </article>
                  ),
                )}
              </div>
            )}
          </InventorySection>

          <InventorySection
            eyebrow="OAuth server client"
            title={`${surface.oauthServerClients.length} registered-client metadata rows`}
          >
            {surface.oauthServerClients.length === 0 ? (
              <EmptyInventory text="No OAuth server-client metadata rows are configured." />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {surface.oauthServerClients.map(
                  (
                    client,
                  ) => (
                    <article
                      key={`${client.name}:${client.clientId}`}
                      className="rounded-xl border border-white/10 bg-black/20 p-5"
                    >
                      <code className="text-sm font-semibold text-violet-100">
                        {client.name || "UNNAMED CLIENT"}
                      </code>

                      <dl className="mt-4 grid gap-3 text-sm">
                        <Detail
                          label="Client ID"
                          value={client.clientId || "NONE"}
                        />

                        <Detail
                          label="Client type"
                          value={client.clientType || "NONE"}
                        />

                        <Detail
                          label="Description"
                          value={client.description || "NONE"}
                        />

                        <Detail
                          label="Redirect URLs"
                          value={client.redirectUrls.join(", ") || "NONE"}
                        />
                      </dl>
                    </article>
                  ),
                )}
              </div>
            )}
          </InventorySection>
        </>
      )}

      <section className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
          Non-negotiable material boundary
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Fact
            label="Secret values"
            value="NEVER"
          />

          <Fact
            label="Private-key material"
            value="NEVER"
          />

          <Fact
            label="Certificate bodies"
            value="NEVER"
          />

          <Fact
            label="Client secrets / passwords"
            value="NEVER"
          />

          <Fact
            label="Browser credential"
            value="NOT EXPOSED"
          />

          <Fact
            label="Public management proxy"
            value="NONE"
          />

          <Fact
            label="Mutation controls"
            value="NONE"
          />

          <Fact
            label="Mode"
            value="READ ONLY"
          />
        </div>
      </section>
    </main>
  );
}

function InventorySection({
  eyebrow,
  title,
  children,
}: {
  readonly eyebrow:
    string;

  readonly title:
    string;

  readonly children:
    React.ReactNode;
}) {
  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-2xl font-semibold text-white">
        {title}
      </h2>

      <div className="mt-6">
        {children}
      </div>
    </section>
  );
}

function EmptyInventory({
  text,
}: {
  readonly text:
    string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-black/15 p-5 text-sm text-white/40">
      {text}
    </div>
  );
}

function BoundaryCard({
  title,
  value,
  detail,
}: {
  readonly title:
    string;

  readonly value:
    string;

  readonly detail:
    string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-white/35">
        {title}
      </p>

      <p className="mt-3 break-words text-lg font-semibold text-white">
        {value}
      </p>

      <p className="mt-2 text-sm leading-6 text-white/45">
        {detail}
      </p>
    </article>
  );
}

function Detail({
  label,
  value,
}: {
  readonly label:
    string;

  readonly value:
    string;
}) {
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3">
      <dt className="text-white/35">
        {label}
      </dt>

      <dd className="break-words text-white/70">
        {value}
      </dd>
    </div>
  );
}

function Fact({
  label,
  value,
}: {
  readonly label:
    string;

  readonly value:
    string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-semibold text-white/75">
        {value}
      </p>
    </div>
  );
}
