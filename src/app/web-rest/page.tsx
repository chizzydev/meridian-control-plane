import Link
  from "next/link";

import {
  readWebRestProductSurfaceFromEnvironment,
} from "@/lib/iris/web-rest-product-server";

export const dynamic =
  "force-dynamic";

export default async function WebRestPage() {
  const surface =
    await readWebRestProductSurfaceFromEnvironment();

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
          <span className="rounded-full border border-sky-300/25 bg-sky-300/10 px-3 py-1 text-xs font-semibold text-sky-100">
            WEB APPS / REST
          </span>

          <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">
            READ ONLY
          </span>

          <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-xs text-white/50">
            Permissions remains the centerpiece
          </span>
        </div>

        <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
          Protected applications and REST operations, without widening browser authority.
        </h1>

        <p className="mt-5 max-w-3xl text-base leading-7 text-white/55">
          Meridian reads the official IRIS management surface for web applications,
          uses native emitted Swagger for deployed REST identity, and joins that
          deployment truth to authoritative OpenAPI protection metadata.
        </p>
      </header>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <BoundaryCard
          title="Web application inventory"
          value="Official SysAdmin REST"
          detail="/api/admin/v2/web-apps"
        />

        <BoundaryCard
          title="Deployed REST truth"
          value="Native emitted Swagger"
          detail="Deployment identity is proven, not inferred."
        />

        <BoundaryCard
          title="Protection metadata"
          value="Authoritative OpenAPI"
          detail="x-ISC_RequiredResource is declared protection metadata."
        />
      </section>

      {surface.status === "unavailable" ? (
        <section className="mt-8 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100/70">
            Safe failure boundary
          </p>

          <h2 className="mt-3 text-2xl font-semibold text-white">
            Live management read unavailable
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
              label="Fallback mutation"
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
                  Live application protection
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {surface.applications.length} Meridian web applications
                </h2>
              </div>

              <p className="text-xs text-white/40">
                Runtime: {surface.runtime.username} / API v{surface.runtime.apiVersion}
              </p>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {surface.applications.map(
                (
                  application,
                ) => (
                  <article
                    key={application.name}
                    className="rounded-xl border border-white/10 bg-black/20 p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <code className="text-sm font-semibold text-sky-100">
                        {application.name}
                      </code>

                      <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-100">
                        {application.enabled ? "ENABLED" : "DISABLED"}
                      </span>
                    </div>

                    <dl className="mt-5 grid gap-3 text-sm">
                      <Detail
                        label="Namespace"
                        value={application.namespace}
                      />

                      <Detail
                        label="Application resource"
                        value={application.resource || "NONE DECLARED"}
                      />

                      <Detail
                        label="Dispatch class"
                        value={application.dispatchClass || "NONE"}
                      />
                    </dl>
                  </article>
                ),
              )}
            </div>
          </section>

          <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                REST / OpenAPI exploration
              </p>

              <h2 className="mt-2 text-2xl font-semibold text-white">
                {surface.operations.length} deployed operations joined to declared protection
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">
                Deployed route inventory is PROVEN. Required-resource metadata is
                PROVEN DECLARED METADATA. Meridian does not infer arbitrary code authorization.
              </p>
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border border-white/10">
              <div className="divide-y divide-white/10">
                {surface.operations.map(
                  (
                    operation,
                  ) => (
                    <article
                      key={`${operation.method}:${operation.path}:${operation.operationId}`}
                      className="grid gap-4 bg-black/15 p-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-md border border-sky-300/20 bg-sky-300/10 px-2 py-1 text-[11px] font-bold text-sky-100">
                            {operation.method}
                          </span>

                          <code className="text-sm text-white">
                            {operation.path}
                          </code>
                        </div>

                        <p className="mt-3 text-xs text-white/40">
                          operationId: {operation.operationId}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <TruthBadge>
                            PROVEN DEPLOYMENT Â· Native emitted Swagger
                          </TruthBadge>

                          <TruthBadge>
                            PROVEN DECLARED METADATA Â· OpenAPI
                          </TruthBadge>
                        </div>
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
                          Required resources
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {operation.requiredResources.map(
                            (
                              requirement,
                            ) => (
                              <code
                                key={requirement}
                                className="rounded-md border border-violet-300/20 bg-violet-300/10 px-2.5 py-1.5 text-xs text-violet-100"
                              >
                                {requirement}
                              </code>
                            ),
                          )}
                        </div>
                      </div>
                    </article>
                  ),
                )}
              </div>
            </div>
          </section>
        </>
      )}

      <section className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
          Authority boundary
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

      <p className="mt-3 text-lg font-semibold text-white">
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
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3">
      <dt className="text-white/35">
        {label}
      </dt>

      <dd className="break-words text-white/70">
        {value}
      </dd>
    </div>
  );
}

function TruthBadge({
  children,
}: {
  readonly children:
    string;
}) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[10px] font-semibold text-white/50">
      {children}
    </span>
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
