import type {
  StagedRoleChange,
} from "./domain";

import type {
  AuthoritativeCurrentAccess,
  PermissionCheck,
} from "./preflight-read";

export interface PreflightPermissionDelta {
  resource: string;
  permission:
    "READ" |
    "WRITE" |
    "USE";
  beforeAllowed: boolean;
  afterAllowed: boolean;
}

export interface AuthorizationPreflight {
  change: StagedRoleChange;

  current:
    AuthoritativeCurrentAccess;

  proposed:
    AuthoritativeCurrentAccess;

  lostEffectiveRoles:
    string[];

  gainedEffectiveRoles:
    string[];

  lostPermissions:
    PreflightPermissionDelta[];

  gainedPermissions:
    PreflightPermissionDelta[];

  retainedPermissions:
    PreflightPermissionDelta[];
}

function uniqueSorted(
  values: readonly string[],
): string[] {
  return [
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
  );
}

export function projectDirectRoles(
  change: StagedRoleChange,
  currentDirectRoles:
    readonly string[],
): string[] {
  if (
    change.operation ===
    "REMOVE"
  ) {
    return uniqueSorted(
      currentDirectRoles.filter(
        (role) =>
          role !==
          change.role,
      ),
    );
  }

  return uniqueSorted([
    ...currentDirectRoles,
    change.role,
  ]);
}

function permissionKey(
  permission:
    Pick<
      PermissionCheck,
      "resource" |
      "permission"
    >,
): string {
  return (
    `${permission.resource}:` +
    permission.permission
  );
}

function deltaKey(
  delta:
    PreflightPermissionDelta,
): string {
  return (
    `${delta.resource}:` +
    delta.permission
  );
}

export function buildAuthorizationPreflight(
  input: {
    change:
      StagedRoleChange;

    current:
      AuthoritativeCurrentAccess;

    proposed:
      AuthoritativeCurrentAccess;
  },
): AuthorizationPreflight {
  if (
    input.current.username !==
    input.proposed.username
  ) {
    throw new Error(
      "Preflight before/after usernames differ.",
    );
  }

  if (
    input.current.username !==
    input.change.username
  ) {
    throw new Error(
      "Preflight target does not match staged change.",
    );
  }

  const expectedDirectRoles =
    projectDirectRoles(
      input.change,
      input.current.directRoles,
    );

  const proposedDirectRoles =
    uniqueSorted(
      input.proposed.directRoles,
    );

  if (
    JSON.stringify(
      expectedDirectRoles,
    ) !==
    JSON.stringify(
      proposedDirectRoles,
    )
  ) {
    throw new Error(
      "Proposed direct roles do not match staged role change.",
    );
  }

  const currentEffective =
    new Set(
      input.current.effectiveRoles,
    );

  const proposedEffective =
    new Set(
      input.proposed.effectiveRoles,
    );

  const lostEffectiveRoles =
    uniqueSorted(
      input.current.effectiveRoles.filter(
        (role) =>
          !proposedEffective.has(
            role,
          ),
      ),
    );

  const gainedEffectiveRoles =
    uniqueSorted(
      input.proposed.effectiveRoles.filter(
        (role) =>
          !currentEffective.has(
            role,
          ),
      ),
    );

  const proposedPermissionMap =
    new Map(
      input.proposed.permissions.map(
        (permission) => [
          permissionKey(
            permission,
          ),
          permission,
        ],
      ),
    );

  const currentPermissionKeys =
    uniqueSorted(
      input.current.permissions.map(
        permissionKey,
      ),
    );

  const proposedPermissionKeys =
    uniqueSorted(
      input.proposed.permissions.map(
        permissionKey,
      ),
    );

  if (
    JSON.stringify(
      currentPermissionKeys,
    ) !==
    JSON.stringify(
      proposedPermissionKeys,
    )
  ) {
    throw new Error(
      "Preflight permission surfaces differ.",
    );
  }

  const deltas:
    PreflightPermissionDelta[] =
      input.current.permissions.map(
        (before) => {
          const key =
            permissionKey(
              before,
            );

          const after =
            proposedPermissionMap.get(
              key,
            );

          if (!after) {
            throw new Error(
              `Missing proposed permission: ${key}`,
            );
          }

          return {
            resource:
              before.resource,
            permission:
              before.permission,
            beforeAllowed:
              before.allowed,
            afterAllowed:
              after.allowed,
          };
        },
      );

  const sortDeltas = (
    values:
      PreflightPermissionDelta[],
  ) =>
    [...values].sort(
      (
        left,
        right,
      ) =>
        deltaKey(
          left,
        ).localeCompare(
          deltaKey(
            right,
          ),
        ),
    );

  return {
    change:
      input.change,

    current:
      input.current,

    proposed:
      input.proposed,

    lostEffectiveRoles,
    gainedEffectiveRoles,

    lostPermissions:
      sortDeltas(
        deltas.filter(
          (delta) =>
            delta.beforeAllowed &&
            !delta.afterAllowed,
        ),
      ),

    gainedPermissions:
      sortDeltas(
        deltas.filter(
          (delta) =>
            !delta.beforeAllowed &&
            delta.afterAllowed,
        ),
      ),

    retainedPermissions:
      sortDeltas(
        deltas.filter(
          (delta) =>
            delta.beforeAllowed &&
            delta.afterAllowed,
        ),
      ),
  };
}