import {
  describe,
  expect,
  it,
} from "vitest";

import {
  CENTERPIECE_CHANGE,
} from "./domain";

import {
  classifyPreflightReadFoundation,
  type AuthoritativeCurrentAccess,
} from "./preflight-read";

const convergedAfterState:
  AuthoritativeCurrentAccess = {
    username: "maya.patel",
    displayName: "Maya Patel",
    enabled: true,
    namespace: "USER",
    directRoles: [
      "MeridianEmployee",
    ],
    effectiveRoles: [
      "MeridianEmployee",
      "MeridianViewer",
    ],
    permissions: [
      {
        resource: "Meridian_Portal",
        permission: "USE",
        allowed: true,
      },
      {
        resource: "Meridian_Orders",
        permission: "READ",
        allowed: true,
      },
      {
        resource: "Meridian_Orders",
        permission: "WRITE",
        allowed: false,
      },
      {
        resource: "Meridian_Admin",
        permission: "USE",
        allowed: false,
      },
      {
        resource: "Meridian_Jobs",
        permission: "USE",
        allowed: false,
      },
      {
        resource: "%Admin_Task",
        permission: "USE",
        allowed: false,
      },
    ],
  };

describe(
  "authoritative preflight read foundation",
  () => {
    it(
      "refuses to invent a removable role when current IRIS state no longer has it",
      () => {
        expect(
          classifyPreflightReadFoundation({
            change:
              CENTERPIECE_CHANGE,
            current:
              convergedAfterState,
          }),
        ).toMatchObject({
          targetRolePresent:
            false,
          status:
            "BASELINE_NOT_READY",
          requiresDemoReset:
            true,
        });
      },
    );

    it(
      "allows REMOVE preflight only when the target role is actually direct",
      () => {
        const beforeState = {
          ...convergedAfterState,
          directRoles: [
            "MeridianEmployee",
            "MeridianSupervisor",
          ],
        };

        expect(
          classifyPreflightReadFoundation({
            change:
              CENTERPIECE_CHANGE,
            current:
              beforeState,
          }),
        ).toMatchObject({
          targetRolePresent:
            true,
          status:
            "READY_TO_PREFLIGHT",
          requiresDemoReset:
            false,
        });
      },
    );
  },
);