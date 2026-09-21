export const R4_PERMISSION_FIXTURE_ID =
  "meridian-r4-permissions-v1" as const;

export const R4_PERMISSION_FIXTURE_GENERATION =
  "r4-permissions-v1" as const;

export const R4_PERMISSION_ROLE_NAME =
  "MeridianR4ProofRole" as const;

export const R4_PERMISSION_ROLE_CANONICAL_ID =
  "role:MeridianR4ProofRole" as const;

export const R4_PERMISSION_ROLE_DESCRIPTION =
  "Meridian R4 proof role | generation=r4-permissions-v1" as const;

export const R4_PERMISSION_ROLE_RESOURCE =
  "Meridian_Orders" as const;

export const R4_PERMISSION_ROLE_PERMISSION =
  "R" as const;

export const SECURITY_ROLE_READ_OPERATION =
  "GET /v2/security/role" as const;

export const SECURITY_ROLE_WRITE_OPERATION =
  "PUT /v2/security/role" as const;

export const SECURITY_ROLE_DELETE_OPERATION =
  "DELETE /v2/security/role" as const;

export const SECURITY_RESOURCE_READ_OPERATION =
  "GET /v2/security/resource" as const;

export interface R4PermissionRoleSnapshot {
  readonly name:
    typeof R4_PERMISSION_ROLE_NAME;

  readonly description:
    string;

  readonly grantedRoles:
    readonly string[];

  readonly resources:
    readonly Readonly<{
      name:
        string;

      permission:
        string;
    }>[];
}

export const R4_PERMISSION_ROLE_EXPECTED:
  R4PermissionRoleSnapshot =
  Object.freeze({
    name:
      R4_PERMISSION_ROLE_NAME,

    description:
      R4_PERMISSION_ROLE_DESCRIPTION,

    grantedRoles:
      Object.freeze([]),

    resources:
      Object.freeze([
        Object.freeze({
          name:
            R4_PERMISSION_ROLE_RESOURCE,

          permission:
            R4_PERMISSION_ROLE_PERMISSION,
        }),
      ]),
  });

export const R4_PERMISSION_ROLE_CREATE_BODY =
  Object.freeze({
    Description:
      R4_PERMISSION_ROLE_DESCRIPTION,

    GrantedRoles:
      Object.freeze([]),

    EscalationOnly:
      false,

    Resources:
      Object.freeze([
        Object.freeze({
          Name:
            R4_PERMISSION_ROLE_RESOURCE,

          Permissions:
            R4_PERMISSION_ROLE_PERMISSION,
        }),
      ]),
  });

function normalized(
  values:
    readonly string[],
): readonly string[] {
  return Object.freeze(
    [
      ...new Set(
        values,
      ),
    ].sort(
      (
        left,
        right,
      ) =>
        left.localeCompare(
          right,
        ),
    ),
  );
}

export function r4PermissionRoleMatches(
  observed:
    R4PermissionRoleSnapshot,
  expected:
    R4PermissionRoleSnapshot =
      R4_PERMISSION_ROLE_EXPECTED,
): boolean {
  const observedGranted =
    normalized(
      observed.grantedRoles,
    );

  const expectedGranted =
    normalized(
      expected.grantedRoles,
    );

  const observedResources =
    normalized(
      observed.resources.map(
        (
          resource,
        ) =>
          `${resource.name}:${resource.permission.toUpperCase()}`,
      ),
    );

  const expectedResources =
    normalized(
      expected.resources.map(
        (
          resource,
        ) =>
          `${resource.name}:${resource.permission.toUpperCase()}`,
      ),
    );

  return (
    observed.name ===
      expected.name &&
    observed.description ===
      expected.description &&
    JSON.stringify(
      observedGranted,
    ) ===
      JSON.stringify(
        expectedGranted,
      ) &&
    JSON.stringify(
      observedResources,
    ) ===
      JSON.stringify(
        expectedResources,
      )
  );
}
