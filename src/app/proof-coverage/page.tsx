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
  READ_EXPLORER_METHODS,
  type ReadExplorerMethod,
} from "@/lib/operations/explorer";

import {
  MANAGEMENT_FAMILIES,
  OPERATION_SUPPORT_STATUSES,
  findSysAdminOperation,
  sysAdminOperationManifest,
  type OperationSupportStatus,
} from "@/lib/operations/manifest";

import {
  runReadExplorerFromEnvironment,
} from "@/lib/iris/read-explorer";

import styles from "./coverage.module.css";

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

function first(
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

function statusTone(
  status:
    OperationSupportStatus,
):
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger" {
  if (
    status ===
      "CERTIFIED_ACTION" ||
    status ===
      "VERIFIED_READ"
  ) {
    return "success";
  }

  if (
    status ===
      "EXPLORABLE_READ"
  ) {
    return "info";
  }

  if (
    status ===
      "DECLINED_DESTRUCTIVE"
  ) {
    return "danger";
  }

  if (
    status ===
      "UNAVAILABLE_RUNTIME"
  ) {
    return "warning";
  }

  return "neutral";
}

function requestedMethod(
  value:
    string,
  fallback:
    ReadExplorerMethod,
): ReadExplorerMethod {
  const upper =
    value.toUpperCase();

  return (
    READ_EXPLORER_METHODS as readonly string[]
  ).includes(
    upper,
  )
    ? upper as ReadExplorerMethod
    : fallback;
}

export default async function ProofCoveragePage({
  searchParams,
}: {
  searchParams:
    SearchParams;
}) {
  const params =
    await searchParams;

  const query =
    first(
      params.q,
    ).toLowerCase();

  const family =
    first(
      params.family,
    );

  const status =
    first(
      params.status,
    );

  const method =
    first(
      params.method,
    ).toUpperCase();

  const selectedId =
    first(
      params.op,
    );

  const selected =
    selectedId.length >
      0
      ? findSysAdminOperation(
          selectedId,
        )
      : null;

  const defaultProbe:
    ReadExplorerMethod =
    selected?.method ===
      "HEAD"
      ? "HEAD"
      : (
          selected?.method ===
            "GET"
            ? "GET"
            : "OPTIONS"
        );

  const probe =
    requestedMethod(
      first(
        params.probe,
      ),
      defaultProbe,
    );

  const run =
    first(
      params.run,
    ) ===
      "1";

  const rawQuery:
    Record<
      string,
      string |
      undefined
    > = {};

  if (
    selected !==
      null
  ) {
    for (
      const parameter
      of selected.queryParameters
    ) {
      const value =
        first(
          params[
            `arg_${parameter.name}`
          ],
        );

      rawQuery[
        parameter.name
      ] =
        value.length >
          0
          ? value
          : undefined;
    }
  }

  let liveResult:
    Awaited<
      ReturnType<
        typeof runReadExplorerFromEnvironment
      >
    > |
    null =
      null;

  let liveError:
    string |
    null =
      null;

  if (
    run &&
    selected !==
      null
  ) {
    try {
      liveResult =
        await runReadExplorerFromEnvironment({
          operationId:
            selected.id,
          requestMethod:
            probe,
          rawQuery,
        });
    }
    catch (
      error
    ) {
      liveError =
        error instanceof
          Error
          ? error.message
          : "Read explorer request was rejected.";
    }
  }

  const filtered =
    sysAdminOperationManifest
      .operations
      .filter(
        (
          operation,
        ) => {
          if (
            family.length >
              0 &&
            operation.family !==
              family
          ) {
            return false;
          }

          if (
            status.length >
              0 &&
            operation.supportStatus !==
              status
          ) {
            return false;
          }

          if (
            method.length >
              0 &&
            operation.method !==
              method
          ) {
            return false;
          }

          if (
            query.length ===
              0
          ) {
            return true;
          }

          return [
            operation.id,
            operation.path,
            operation.summary,
            operation.family,
            operation.supportStatus,
            ...operation.tags,
            ...operation.plannedActionIds,
          ]
            .join(
              " ",
            )
            .toLowerCase()
            .includes(
              query,
            );
        },
      );

  const counts =
    sysAdminOperationManifest
      .counts;

  const certifiedActionOperations =
    sysAdminOperationManifest
      .operations
      .filter(
        (
          operation,
        ) =>
          operation.supportStatus ===
            "CERTIFIED_ACTION",
      );

  const certifiedSemanticActionCount =
    new Set(
      certifiedActionOperations
        .flatMap(
          (
            operation,
          ) =>
            operation.plannedActionIds,
        ),
    ).size;

  const certifiedMutationEndpointCount =
    certifiedActionOperations
      .length;

  return (
    <main className={styles.page}>
      <PageHeader
        eyebrow="Meridian Control Plane / Proof coverage"
        title="273 operations. No silent gaps."
        description="The pinned public InterSystems Community SysAdmin API specification is compiled into an explicit coverage contract. Runtime availability is kept separate from Meridian support, and generic mutation dispatch remains impossible."
        actions={
          <>
            <StatusBadge tone="success">
              PINNED SPEC
            </StatusBadge>
            <StatusBadge>
              {sysAdminOperationManifest.generatedFrom.commit.slice(0, 12)}
            </StatusBadge>
          </>
        }
      />

      <section
        className={styles.metrics}
        aria-label="Operation coverage summary"
      >
        <MetricCell
          label="Primary operations"
          value={
            sysAdminOperationManifest
              .generatedFrom
              .primaryOperationCount
          }
          detail="GET + POST + PUT + DELETE"
        />

        <MetricCell
          label="Source operations"
          value={
            sysAdminOperationManifest
              .generatedFrom
              .sourceOperationCount
          }
          detail="includes three HEAD companions"
        />

        <MetricCell
          label="Certified semantic actions"
          value={
            certifiedSemanticActionCount
          }
          detail={`${certifiedMutationEndpointCount} certified mutation endpoints`}
        />

        <MetricCell
          label="Mutation registry scope"
          value={
            sysAdminOperationManifest
              .mutationRegistry
              .requiredActionCount
          }
          detail={`${sysAdminOperationManifest.mutationRegistry.requiredActionCount - certifiedSemanticActionCount} Security/Secrets IDs remain out of scope`}
        />
      </section>

      <section className={styles.section}>
        <SectionHeader
          eyebrow="Source provenance"
          title="Coverage is generated, not hand-counted"
          detail={sysAdminOperationManifest.generatedFrom.countRule}
        />

        <div className={styles.provenance}>
          <div>
            <span>Repository</span>
            <CodeValue>
              {sysAdminOperationManifest.generatedFrom.repository}
            </CodeValue>
          </div>

          <div>
            <span>Commit</span>
            <CodeValue>
              {sysAdminOperationManifest.generatedFrom.commit}
            </CodeValue>
          </div>

          <div>
            <span>Blob SHA</span>
            <CodeValue>
              {sysAdminOperationManifest.generatedFrom.blobSha}
            </CodeValue>
          </div>

          <div>
            <span>OpenAPI / API</span>
            <CodeValue>
              {sysAdminOperationManifest.generatedFrom.openapiVersion}
              {" / "}
              {sysAdminOperationManifest.generatedFrom.apiVersion}
            </CodeValue>
          </div>
        </div>

        <AuthorityCallout
          eyebrow="Certified breadth vs registry scope"
          title={`${certifiedSemanticActionCount} certified semantic actions on ${certifiedMutationEndpointCount} mutation endpoints`}
          detail={`${sysAdminOperationManifest.mutationRegistry.requiredActionCount} mutation registry action IDs exist in the generated registry. The remaining ${sysAdminOperationManifest.mutationRegistry.requiredActionCount - certifiedSemanticActionCount} Security/Secrets IDs are OUT_OF_PRODUCT_SCOPE and are not certified product breadth.`}
          tone="info"
        />
      </section>

      <section className={styles.section}>
        <SectionHeader
          eyebrow="Coverage contract"
          title="Six SysAdmin families, explicit current status"
          detail="EXPLORABLE_READ means the operation is present in the safe read contract; it does not imply the current runtime possesses the authority required to execute it."
        />

        <div className={styles.familyGrid}>
          {MANAGEMENT_FAMILIES.map(
            (
              item,
            ) => (
              <div key={item}>
                <CodeValue>
                  {item}
                </CodeValue>
                <strong>
                  {counts.byFamily[item] ?? 0}
                </strong>
              </div>
            ),
          )}
        </div>

        <div className={styles.statusGrid}>
          {OPERATION_SUPPORT_STATUSES.map(
            (
              item,
            ) => (
              <div key={item}>
                <StatusBadge
                  tone={statusTone(item)}
                >
                  {item}
                </StatusBadge>
                <strong>
                  {counts.byStatus[item] ?? 0}
                </strong>
              </div>
            ),
          )}
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeader
          eyebrow="Operation atlas"
          title={`${filtered.length} visible operations`}
          detail="Filter the pinned manifest without changing its support classification."
        />

        <form
          method="get"
          action="/proof-coverage"
          className={styles.filters}
        >
          <label>
            <span>Search</span>
            <input
              name="q"
              defaultValue={first(params.q)}
              placeholder="path, summary, action id"
            />
          </label>

          <label>
            <span>Family</span>
            <select
              name="family"
              defaultValue={family}
            >
              <option value="">
                All families
              </option>
              {MANAGEMENT_FAMILIES.map(
                (
                  item,
                ) => (
                  <option
                    value={item}
                    key={item}
                  >
                    {item}
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            <span>Method</span>
            <select
              name="method"
              defaultValue={method}
            >
              <option value="">
                All methods
              </option>
              {[
                "GET",
                "POST",
                "PUT",
                "DELETE",
              ].map(
                (
                  item,
                ) => (
                  <option
                    value={item}
                    key={item}
                  >
                    {item}
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            <span>Status</span>
            <select
              name="status"
              defaultValue={status}
            >
              <option value="">
                All statuses
              </option>
              {OPERATION_SUPPORT_STATUSES.map(
                (
                  item,
                ) => (
                  <option
                    value={item}
                    key={item}
                  >
                    {item}
                  </option>
                ),
              )}
            </select>
          </label>

          <div className={styles.filterActions}>
            <button
              type="submit"
              className="meridian-action meridian-action-primary"
            >
              Apply filters
            </button>

            <Link
              href="/proof-coverage"
              className="meridian-action"
            >
              Clear
            </Link>
          </div>
        </form>

        <div className="meridian-table-wrap">
          <table className={`meridian-data-table ${styles.operationTable}`}>
            <thead>
              <tr>
                <th>Family</th>
                <th>Method</th>
                <th>Path</th>
                <th>Current support</th>
                <th>Authority</th>
                <th>Certified action binding</th>
                <th>Summary</th>
                <th aria-label="Inspect operation" />
              </tr>
            </thead>

            <tbody>
              {filtered.map(
                (
                  operation,
                ) => (
                  <tr key={operation.id}>
                    <td>
                      <CodeValue>
                        {operation.family}
                      </CodeValue>
                    </td>

                    <td>
                      <StatusBadge>
                        {operation.method}
                      </StatusBadge>
                    </td>

                    <td>
                      <CodeValue>
                        {operation.path}
                      </CodeValue>
                    </td>

                    <td>
                      <StatusBadge
                        tone={statusTone(
                          operation.supportStatus,
                        )}
                      >
                        {operation.supportStatus}
                      </StatusBadge>
                      <small>
                        {operation.scopeNote}
                      </small>
                    </td>

                    <td>
                      {operation.requiredAuthorityExpression ? (
                        <CodeValue>
                          {operation.requiredAuthorityExpression}
                        </CodeValue>
                      ) : (
                        "General authenticated surface"
                      )}
                    </td>

                    <td>
                      {operation.certifiedActionIds.length > 0 ? (
                        <>
                          {operation.certifiedActionIds.map((actionId) => (
                            <CodeValue key={actionId}>
                              {actionId}
                            </CodeValue>
                          ))}
                          <small>Fixed-purpose certified semantic action</small>
                        </>
                      ) : (
                        <small>No certified mutation action</small>
                      )}
                    </td>

                    <td>
                      {operation.summary}
                    </td>

                    <td>
                      <Link
                        href={`/proof-coverage?op=${encodeURIComponent(operation.id)}`}
                        className="meridian-row-link"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeader
          eyebrow="Protocol companions"
          title="Three HEAD checks stay visible outside the 273 count"
          detail="The source specification contains 276 HTTP operations. Meridian preserves the three HEAD privilege checks separately instead of silently dropping or inflating the primary contract."
        />

        <div className="meridian-table-wrap">
          <table className={`meridian-data-table ${styles.companionTable}`}>
            <thead>
              <tr>
                <th>Method</th>
                <th>Path</th>
                <th>Summary</th>
                <th aria-label="Inspect protocol companion" />
              </tr>
            </thead>
            <tbody>
              {sysAdminOperationManifest.protocolCompanions.map(
                (
                  operation,
                ) => (
                  <tr key={operation.id}>
                    <td>
                      <StatusBadge>
                        HEAD
                      </StatusBadge>
                    </td>
                    <td>
                      <CodeValue>
                        {operation.path}
                      </CodeValue>
                    </td>
                    <td>
                      {operation.summary}
                    </td>
                    <td>
                      <Link
                        href={`/proof-coverage?op=${encodeURIComponent(operation.id)}`}
                        className="meridian-row-link"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected ? (
        <section className={styles.section}>
          <SectionHeader
            eyebrow="Bounded same-instance read explorer"
            title={selected.id}
            detail="The browser chooses only a manifest operation, a safe read method, and declared query parameters. The server derives the IRIS base URL, authority role, Authorization header, and exact request path."
          />

          <div className={styles.selectedIdentity}>
            <div>
              <span>Family</span>
              <CodeValue>
                {selected.family}
              </CodeValue>
            </div>
            <div>
              <span>Current support</span>
              <StatusBadge
                tone={statusTone(
                  selected.supportStatus,
                )}
              >
                {selected.supportStatus}
              </StatusBadge>
            </div>
            <div>
              <span>Required authority</span>
              <CodeValue>
                {selected.requiredAuthorityExpression ?? "GENERAL"}
              </CodeValue>
            </div>
            <div>
              <span>Mutation dispatch</span>
              <StatusBadge tone="success">
                DISABLED
              </StatusBadge>
            </div>
          </div>

          <form
            method="get"
            action="/proof-coverage"
            className={styles.explorerForm}
          >
            <input
              type="hidden"
              name="op"
              value={selected.id}
            />
            <input
              type="hidden"
              name="run"
              value="1"
            />

            <label>
              <span>Probe method</span>
              <select
                name="probe"
                defaultValue={probe}
              >
                {selected.method === "GET" ? (
                  <option value="GET">
                    GET
                  </option>
                ) : null}
                {selected.method === "HEAD" ? (
                  <option value="HEAD">
                    HEAD
                  </option>
                ) : null}
                <option value="OPTIONS">
                  OPTIONS
                </option>
              </select>
            </label>

            {selected.queryParameters.map(
              (
                parameter,
              ) => (
                <label key={parameter.name}>
                  <span>
                    {parameter.name}
                    {parameter.required
                      ? " *"
                      : ""}
                  </span>
                  <input
                    name={`arg_${parameter.name}`}
                    defaultValue={
                      rawQuery[parameter.name] ??
                      ""
                    }
                    maxLength={512}
                    placeholder={
                      parameter.schemaType
                    }
                  />
                  {parameter.description ? (
                    <small>
                      {parameter.description}
                    </small>
                  ) : null}
                </label>
              ),
            )}

            <div className={styles.explorerAction}>
              <button
                type="submit"
                className="meridian-action meridian-action-primary"
              >
                Run bounded read probe
              </button>
            </div>
          </form>

          <AuthorityCallout
            eyebrow="Non-deviation boundary"
            title="No arbitrary URL. No arbitrary method. No generic mutation body."
            detail="GET requires a declared GET operation. HEAD requires one of the three HEAD companions present in the pinned public SysAdmin specification. OPTIONS is restricted to paths present in the pinned spec."
            tone="info"
          />

          {liveError ? (
            <AuthorityCallout
              eyebrow="Explorer request rejected"
              title="The request did not satisfy the bounded read contract"
              detail={liveError}
              tone="danger"
            />
          ) : null}

          {liveResult ? (
            <div className={styles.liveResult}>
              <div className={styles.liveResultHeader}>
                <div>
                  <StatusBadge
                    tone={
                      liveResult.ok
                        ? "success"
                        : "warning"
                    }
                  >
                    {liveResult.ok
                      ? "LIVE READ RESULT"
                      : liveResult.capability}
                  </StatusBadge>
                </div>

                <div className={styles.machineMarkers}>
                  <CodeValue>
                    {`EXPLORER_RESULT=${liveResult.ok ? "PASS" : "NOT_PASS"}`}
                  </CodeValue>
                  <CodeValue>
                    {`EXPLORER_HTTP_STATUS=${liveResult.httpStatus ?? "NONE"}`}
                  </CodeValue>
                  <CodeValue>
                    {`AUTHORITY_MODE=${liveResult.authorityMode ?? "NONE"}`}
                  </CodeValue>
                  <CodeValue>
                    GENERIC_MUTATION_DISPATCH=NO
                  </CodeValue>
                  <CodeValue>
                    BROWSER_CREDENTIAL_EXPOSURE=NO
                  </CodeValue>
                </div>
              </div>

              <div className={styles.liveMeta}>
                <div>
                  <span>Operation</span>
                  <CodeValue>
                    {liveResult.operationId}
                  </CodeValue>
                </div>
                <div>
                  <span>Request</span>
                  <CodeValue>
                    {liveResult.requestMethod} {liveResult.requestPath}
                  </CodeValue>
                </div>
                <div>
                  <span>Capability</span>
                  <CodeValue>
                    {liveResult.capability}
                  </CodeValue>
                </div>
                <div>
                  <span>Content type</span>
                  <CodeValue>
                    {liveResult.contentType ?? "NONE"}
                  </CodeValue>
                </div>
              </div>

              {liveResult.reason ? (
                <p className={styles.liveReason}>
                  {liveResult.reason}
                </p>
              ) : null}

              <pre className={styles.preview}>
                {liveResult.responsePreview ||
                  "[NO_RESPONSE_PREVIEW]"}
              </pre>
            </div>
          ) : null}
        </section>
      ) : (
        <section className={styles.section}>
          <AuthorityCallout
            eyebrow="Read explorer"
            title="Choose an operation from the atlas"
            detail="Inspection is opt-in. The manifest itself is always visible, but no live IRIS request occurs until an operation is selected and the bounded read probe is submitted."
          />
        </section>
      )}

      <section className={styles.section}>
        <SectionHeader
          eyebrow="Boundary summary"
          title="Coverage is not authority, and authority is not support"
          detail="The manifest answers what exists. The support status answers what Meridian exposes. The live probe answers what this runtime can execute right now."
        />

        <div className={styles.boundaryGrid}>
          <div>
            <strong>273</strong>
            <span>primary source operations classified</span>
          </div>
          <div>
            <strong>3</strong>
            <span>HEAD companions preserved</span>
          </div>
          <div>
            <strong>0</strong>
            <span>arbitrary mutation proxies</span>
          </div>
          <div>
            <strong>{certifiedSemanticActionCount}</strong>
            <span>{`certified semantic actions across ${certifiedMutationEndpointCount} mutation endpoints`}</span>
          </div>
        </div>
      </section>
    </main>
  );
}
