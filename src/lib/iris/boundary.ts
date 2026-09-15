import "server-only";

/**
 * All privileged IRIS communication belongs behind this server-only boundary.
 *
 * Browser components must never receive the IRIS service password or bearer
 * token. The implementation is intentionally deferred until the authoritative
 * preflight checkpoint.
 */
export const IRIS_ADAPTER_BOUNDARY = {
  managementBasePath: "/api/admin",
  privateHelperPath: "/meridian-control-plane-internal",
} as const;