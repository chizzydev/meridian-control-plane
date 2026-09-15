import type {
  AuthoritativeCurrentAccess,
  PermissionCheck,
} from "@/lib/change-case/preflight-read";

import {
  readIrisUser,
  readNativePermission,
  readNativeRecursion,
} from "./transport";

const scopedPermissions = [
  {
    resource:
      "Meridian_Portal",
    permission:
      "USE",
  },
  {
    resource:
      "Meridian_Orders",
    permission:
      "READ",
  },
  {
    resource:
      "Meridian_Orders",
    permission:
      "WRITE",
  },
  {
    resource:
      "Meridian_Admin",
    permission:
      "USE",
  },
  {
    resource:
      "Meridian_Jobs",
    permission:
      "USE",
  },
  {
    resource:
      "%Admin_Task",
    permission:
      "USE",
  },
] as const;

export async function readAuthoritativeCurrentAccess(
  input: {
    apiBaseUrl: string;
    helperBaseUrl: string;
    accessToken: string;
    username: string;
  },
): Promise<AuthoritativeCurrentAccess> {
  const user =
    await readIrisUser({
      baseUrl:
        input.apiBaseUrl,
      accessToken:
        input.accessToken,
      username:
        input.username,
    });

  const recursion =
    await readNativeRecursion({
      helperBaseUrl:
        input.helperBaseUrl,
      accessToken:
        input.accessToken,
      roles:
        user.directRoles,
    });

  const permissions:
    PermissionCheck[] =
      [];

  for (
    const check
    of scopedPermissions
  ) {
    const observed =
      await readNativePermission({
        helperBaseUrl:
          input.helperBaseUrl,
        accessToken:
          input.accessToken,
        roles:
          user.directRoles,
        resource:
          check.resource,
        permission:
          check.permission,
      });

    permissions.push({
      resource:
        observed.resource,
      permission:
        observed.permission,
      allowed:
        observed.allowed,
    });
  }

  return {
    username:
      user.username,
    displayName:
      user.displayName,
    enabled:
      user.enabled,
    namespace:
      user.namespace,
    directRoles:
      user.directRoles,
    effectiveRoles:
      recursion.effectiveRoles,
    permissions,
  };
}