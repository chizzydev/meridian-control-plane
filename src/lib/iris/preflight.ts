import {
  CENTERPIECE_CHANGE,
} from "@/lib/change-case/domain";

import {
  buildAuthorizationPreflight,
  projectDirectRoles,
  type AuthorizationPreflight,
} from "@/lib/change-case/preflight";

import {
  classifyPreflightReadFoundation,
  type AuthoritativeCurrentAccess,
  type PermissionCheck,
} from "@/lib/change-case/preflight-read";

import {
  readAuthoritativeCurrentAccess,
} from "./current-access";

import {
  readNativePermission,
  readNativeRecursion,
} from "./transport";

export async function readCenterpieceAuthorizationPreflight(
  input: {
    apiBaseUrl: string;
    helperBaseUrl: string;
    accessToken: string;
  },
): Promise<AuthorizationPreflight> {
  const current =
    await readAuthoritativeCurrentAccess({
      apiBaseUrl:
        input.apiBaseUrl,

      helperBaseUrl:
        input.helperBaseUrl,

      accessToken:
        input.accessToken,

      username:
        CENTERPIECE_CHANGE.username,
    });

  const foundation =
    classifyPreflightReadFoundation({
      change:
        CENTERPIECE_CHANGE,
      current,
    });

  if (
    foundation.status !==
    "READY_TO_PREFLIGHT"
  ) {
    throw new Error(
      "Centerpiece baseline is not ready for preflight.",
    );
  }

  const proposedDirectRoles =
    projectDirectRoles(
      CENTERPIECE_CHANGE,
      current.directRoles,
    );

  const recursion =
    await readNativeRecursion({
      helperBaseUrl:
        input.helperBaseUrl,

      accessToken:
        input.accessToken,

      roles:
        proposedDirectRoles,
    });

  const proposedPermissions:
    PermissionCheck[] = [];

  for (
    const currentPermission
    of current.permissions
  ) {
    const observed =
      await readNativePermission({
        helperBaseUrl:
          input.helperBaseUrl,

        accessToken:
          input.accessToken,

        roles:
          proposedDirectRoles,

        resource:
          currentPermission.resource,

        permission:
          currentPermission.permission,
      });

    proposedPermissions.push({
      resource:
        observed.resource,

      permission:
        observed.permission,

      allowed:
        observed.allowed,
    });
  }

  const proposed:
    AuthoritativeCurrentAccess = {
      username:
        current.username,

      displayName:
        current.displayName,

      enabled:
        current.enabled,

      namespace:
        current.namespace,

      directRoles:
        proposedDirectRoles,

      effectiveRoles:
        recursion.effectiveRoles,

      permissions:
        proposedPermissions,
    };

  return buildAuthorizationPreflight({
    change:
      CENTERPIECE_CHANGE,

    current,
    proposed,
  });
}