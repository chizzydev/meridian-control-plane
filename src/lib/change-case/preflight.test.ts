import {
  describe,
  expect,
  it,
} from "vitest";

import {
  CENTERPIECE_CHANGE,
} from "./domain";

import type {
  AuthoritativeCurrentAccess,
} from "./preflight-read";

import {
  buildAuthorizationPreflight,
  projectDirectRoles,
} from "./preflight";

const current:
  AuthoritativeCurrentAccess = {
    username:
      "maya.patel",

    displayName:
      "Maya Patel",

    enabled:
      true,

    namespace:
      "USER",

    directRoles: [
      "MeridianEmployee",
      "MeridianSupervisor",
    ],

    effectiveRoles: [
      "MeridianEmployee",
      "MeridianJobRunner",
      "MeridianOperator",
      "MeridianSupervisor",
      "MeridianViewer",
    ],

    permissions: [
      {
        resource:
          "Meridian_Portal",
        permission:
          "USE",
        allowed:
          true,
      },
      {
        resource:
          "Meridian_Orders",
        permission:
          "READ",
        allowed:
          true,
      },
      {
        resource:
          "Meridian_Orders",
        permission:
          "WRITE",
        allowed:
          true,
      },
      {
        resource:
          "Meridian_Admin",
        permission:
          "USE",
        allowed:
          true,
      },
      {
        resource:
          "Meridian_Jobs",
        permission:
          "USE",
        allowed:
          true,
      },
      {
        resource:
          "%Admin_Task",
        permission:
          "USE",
        allowed:
          true,
      },
    ],
  };

const proposed:
  AuthoritativeCurrentAccess = {
    ...current,

    directRoles: [
      "MeridianEmployee",
    ],

    effectiveRoles: [
      "MeridianEmployee",
      "MeridianViewer",
    ],

    permissions:
      current.permissions.map(
        (permission) => ({
          ...permission,

          allowed:
            permission.resource ===
              "Meridian_Portal" ||
            (
              permission.resource ===
                "Meridian_Orders" &&
              permission.permission ===
                "READ"
            ),
        }),
      ),
  };

describe(
  "authorization preflight",
  () => {
    it(
      "projects only the requested direct-role mutation",
      () => {
        expect(
          projectDirectRoles(
            CENTERPIECE_CHANGE,
            current.directRoles,
          ),
        ).toEqual([
          "MeridianEmployee",
        ]);
      },
    );

    it(
      "derives the centerpiece delta from observed before and proposed snapshots",
      () => {
        const result =
          buildAuthorizationPreflight({
            change:
              CENTERPIECE_CHANGE,
            current,
            proposed,
          });

        expect(
          result.lostEffectiveRoles,
        ).toEqual([
          "MeridianJobRunner",
          "MeridianOperator",
          "MeridianSupervisor",
        ]);

        expect(
          result.gainedEffectiveRoles,
        ).toEqual([]);

        expect(
          result.lostPermissions.map(
            (permission) =>
              `${permission.resource}:${permission.permission}`,
          ),
        ).toEqual([
          "%Admin_Task:USE",
          "Meridian_Admin:USE",
          "Meridian_Jobs:USE",
          "Meridian_Orders:WRITE",
        ]);

        expect(
          result.gainedPermissions,
        ).toEqual([]);

        expect(
          result.retainedPermissions.map(
            (permission) =>
              `${permission.resource}:${permission.permission}`,
          ),
        ).toEqual([
          "Meridian_Orders:READ",
          "Meridian_Portal:USE",
        ]);
      },
    );

    it(
      "rejects a proposed snapshot that does not represent the staged role change",
      () => {
        expect(
          () =>
            buildAuthorizationPreflight({
              change:
                CENTERPIECE_CHANGE,

              current,

              proposed: {
                ...proposed,
                directRoles: [
                  "MeridianEmployee",
                  "MeridianSupervisor",
                ],
              },
            }),
        ).toThrow(
          "Proposed direct roles do not match staged role change.",
        );
      },
    );
  },
);