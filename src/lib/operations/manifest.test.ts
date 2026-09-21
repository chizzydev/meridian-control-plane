import {
  describe,
  expect,
  it,
} from "vitest";

import {
  OPERATION_SUPPORT_STATUSES,
  sysAdminOperationManifest,
} from "./manifest";

describe(
  "pinned SysAdmin operation manifest",
  () => {
    it(
      "freezes the organizer source and 273 primary-operation count",
      () => {
        expect(
          sysAdminOperationManifest
            .generatedFrom,
        ).toMatchObject({
          repository:
            "intersystems-community/sysadmin-api-specification",
          commit:
            "f764aea427e5c0b1dd08a4c18a0457e0ff7b3b34",
          blobSha:
            "373e8627e755c0cb89fee855fb70514f48376d60",
          sourceOperationCount:
            276,
          primaryOperationCount:
            273,
          protocolCompanionCount:
            3,
        });



        expect(
          sysAdminOperationManifest
            .generatedFrom
            .sourceSha256,
        ).toMatch(
          /^[A-F0-9]{64}$/,
        );

        expect(
          sysAdminOperationManifest
            .counts.byMethod,
        ).toEqual({
          DELETE:
            42,
          GET:
            115,
          POST:
            72,
          PUT:
            44,
        });

        expect(
          sysAdminOperationManifest
            .counts.byFamily,
        ).toEqual({
          LOGS:
            20,
          PERMISSIONS:
            31,
          SECURITY_SECRETS:
            87,
          SYSTEM_OS:
            105,
          TASKS:
            20,
          WEB_REST:
            10,
        });


        expect(
          sysAdminOperationManifest
            .counts.byStatus,
        ).toEqual({
          CERTIFIED_ACTION:
            5,
          DECLINED_DESTRUCTIVE:
            36,
          EXPLORABLE_READ:
            95,
          OUT_OF_PRODUCT_SCOPE:
            117,
          VERIFIED_READ:
            20,
        });
      },
    );

    it(
      "has no silent operation gaps or duplicate primary identities",
      () => {
        const operations =
          sysAdminOperationManifest
            .operations;

        expect(
          operations,
        ).toHaveLength(
          273,
        );

        expect(
          new Set(
            operations.map(
              (
                operation,
              ) =>
                operation.id,
            ),
          ).size,
        ).toBe(
          273,
        );

        for (
          const operation
          of operations
        ) {
          expect(
            OPERATION_SUPPORT_STATUSES,
          ).toContain(
            operation.supportStatus,
          );

          expect(
            operation.scopeNote.length,
          ).toBeGreaterThan(
            0,
          );
        }
      },
    );

    it(
      "retains the three HEAD operations without inflating the 273 contract",
      () => {
        expect(
          sysAdminOperationManifest
            .protocolCompanions
            .map(
              (
                operation,
              ) =>
                operation.id,
            ),
        ).toEqual([
          "HEAD /v2/security/sql-admin-privilege",
          "HEAD /v2/security/sql-column-privilege",
          "HEAD /v2/security/sql-privilege",
        ]);
      },
    );

    it(
      "binds all 32 required release actions and promotes live-certified P01, P02, P03, P04, and W01 through W04",
      () => {
        const ids =
          sysAdminOperationManifest
            .mutationRegistry
            .actionIds;

        expect(
          ids,
        ).toHaveLength(
          32,
        );

        expect(
          new Set(
            ids,
          ).size,
        ).toBe(
          32,
        );

        const certified =
          sysAdminOperationManifest
            .operations
            .flatMap(
              (
                operation,
              ) =>
                operation.certifiedActionIds,
            );

        expect(
          certified,
        ).toEqual([
          "P02_ROLE_DELETE",
          "W04_WEB_APP_DELETE",
          "P01_ROLE_CREATE",
          "P03_USER_ADD_ROLE",
          "P04_USER_REMOVE_ROLE",
          "W01_WEB_APP_CREATE",
          "W02_WEB_APP_UPDATE",
          "W03_WEB_APP_ENABLE",
        ]);
      },
    );
  },
);
