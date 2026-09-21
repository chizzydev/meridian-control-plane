import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  ActionReceiptV2,
} from "../../proof/receipt";

import {
  P02_RECOVERY_OF_RECEIPT_ID,
  P02_RECOVERY_OF_RECEIPT_SHA256,
  P02_ROLE_DELETE_INTENT,
  certifyP02RoleDeleteAction,
  createP02RoleDeleteProofContract,
  reconcileUnknownP02RoleDelete,
} from "./role-delete";

import {
  R4_PERMISSION_ROLE_EXPECTED,
  type R4PermissionRoleSnapshot,
} from "./role-fixture";

describe(
  "P02 ROLE_DELETE verified recovery path",
  () => {
    it(
      "binds recovery to the exact P01 receipt and reviews exact role to absence",
      async () => {
        const contract =
          createP02RoleDeleteProofContract({
            async readRole() {
              return R4_PERMISSION_ROLE_EXPECTED;
            },

            async readOwners() {
              return Object.freeze([]);
            },

            async readPrerequisiteResource() {
              return true;
            },

            async executeDelete() {
            },
          });

        const preflight =
          await contract.preflight(
            {
              actionId:
                "test-p02",

              logicalActor:
                "test",

              irisRuntimeUser:
                "meridian.runtime",

              nowUtc:
                "2026-09-21T00:00:00.000Z",
            },
            P02_ROLE_DELETE_INTENT,
          );

        const delta =
          contract.expectedDelta(
            P02_ROLE_DELETE_INTENT,
            preflight,
          );

        expect(
          P02_ROLE_DELETE_INTENT,
        ).toMatchObject({
          recoveryOfReceiptId:
            P02_RECOVERY_OF_RECEIPT_ID,

          recoveryOfReceiptSha256:
            P02_RECOVERY_OF_RECEIPT_SHA256,
        });

        expect(
          delta.before,
        ).toMatchObject({
          ownersCount:
            0,

          prerequisiteResourcePresent:
            true,
        });

        expect(
          delta.after,
        ).toEqual({
          rolePresent:
            false,

          prerequisiteResourcePresent:
            true,

          restoredP01RelevantPrestate:
            true,
        });
      },
    );

    it(
      "refuses deletion when any role owner exists",
      async () => {
        const contract =
          createP02RoleDeleteProofContract({
            async readRole() {
              return R4_PERMISSION_ROLE_EXPECTED;
            },

            async readOwners() {
              return Object.freeze([
                Object.freeze({
                  name:
                    "someone",

                  type:
                    "User" as const,

                  adminOption:
                    false,
                }),
              ]);
            },

            async readPrerequisiteResource() {
              return true;
            },

            async executeDelete() {
              throw new Error(
                "must not execute",
              );
            },
          });

        await expect(
          contract.preflight(
            {
              actionId:
                "test-p02-owner",

              logicalActor:
                "test",

              irisRuntimeUser:
                "meridian.runtime",

              nowUtc:
                "2026-09-21T00:00:00.000Z",
            },
            P02_ROLE_DELETE_INTENT,
          ),
        ).rejects.toThrow(
          "zero role owners",
        );
      },
    );

    it(
      "marks owner drift stale with zero delete dispatch",
      async () => {
        let deleteCount =
          0;

        let owners:
          readonly {
            readonly name:
              string;

            readonly type:
              "User";

            readonly adminOption:
              boolean;
          }[] =
          Object.freeze([]);

        const contract =
          createP02RoleDeleteProofContract({
            async readRole() {
              return R4_PERMISSION_ROLE_EXPECTED;
            },

            async readOwners() {
              return owners;
            },

            async readPrerequisiteResource() {
              return true;
            },

            async executeDelete() {
              deleteCount +=
                1;
            },
          });

        const preflight =
          await contract.preflight(
            {
              actionId:
                "test-p02-stale",

              logicalActor:
                "test",

              irisRuntimeUser:
                "meridian.runtime",

              nowUtc:
                "2026-09-21T00:00:00.000Z",
            },
            P02_ROLE_DELETE_INTENT,
          );

        owners =
          Object.freeze([
            Object.freeze({
              name:
                "late-owner",

              type:
                "User" as const,

              adminOption:
                false,
            }),
          ]);

        const decision =
          await contract.revalidate(
            {
              actionId:
                "test-p02-stale",

              logicalActor:
                "test",

              irisRuntimeUser:
                "meridian.runtime",

              nowUtc:
                "2026-09-21T00:00:01.000Z",
            },
            {
              intent:
                P02_ROLE_DELETE_INTENT,

              preflight,

              reviewedPreflightDigest:
                contract.digestPreflight(
                  preflight,
                ),
            },
          );

        expect(
          decision.outcome,
        ).toBe(
          "STALE",
        );

        expect(
          deleteCount,
        ).toBe(
          0,
        );

        if (
          decision.outcome !==
            "STALE"
        ) {
          throw new Error(
            "Expected P02 owner drift to classify as STALE.",
          );
        }

        expect(
          decision
            .freshPreflight
            .observedOwners,
        ).toHaveLength(
          1,
        );

        expect(
          decision.freshDigest,
        ).toMatch(
          /^[A-F0-9]{64}$/,
        );
      },
    );

    it(
      "reconciles exact absence as applied, exact P01 state as not applied, and alien state as still unknown",
      () => {
        expect(
          reconcileUnknownP02RoleDelete({
            observedRole:
              null,

            observedOwners:
              null,

            prerequisiteResourcePresent:
              true,
          }).outcome,
        ).toBe(
          "APPLIED",
        );

        expect(
          reconcileUnknownP02RoleDelete({
            observedRole:
              R4_PERMISSION_ROLE_EXPECTED,

            observedOwners:
              Object.freeze([]),

            prerequisiteResourcePresent:
              true,
          }).outcome,
        ).toBe(
          "NOT_APPLIED",
        );

        expect(
          reconcileUnknownP02RoleDelete({
            observedRole: {
              ...R4_PERMISSION_ROLE_EXPECTED,

              description:
                "alien",
            },

            observedOwners:
              Object.freeze([]),

            prerequisiteResourcePresent:
              true,
          }).outcome,
        ).toBe(
          "STILL_UNKNOWN",
        );

        expect(
          reconcileUnknownP02RoleDelete({
            observedRole:
              null,

            observedOwners:
              null,

            prerequisiteResourcePresent:
              false,
          }).outcome,
        ).toBe(
          "STILL_UNKNOWN",
        );
      },
    );

    it(
      "closes VERIFIED only after role absence, resource preservation, and exact receipt readback",
      async () => {
        let now =
          Date.parse(
            "2026-09-21T00:00:00.000Z",
          );

        let role:
          R4PermissionRoleSnapshot |
          null =
          R4_PERMISSION_ROLE_EXPECTED;

        let persisted:
          ActionReceiptV2 |
          null =
          null;

        const result =
          await certifyP02RoleDeleteAction(
            {
              intent:
                P02_ROLE_DELETE_INTENT,

              actionId:
                "p02-role-delete-test",

              receiptId:
                "meridian-p02-role-delete-test",

              logicalActor:
                "test-operator",

              irisRuntimeUser:
                "meridian.runtime",
            },
            {
              contract: {
                async readRole() {
                  return role;
                },

                async readOwners() {
                  return role ===
                    null
                    ? null
                    : Object.freeze([]);
                },

                async readPrerequisiteResource() {
                  return true;
                },

                async executeDelete() {
                  role =
                    null;
                },
              },

              certification: {
                nowUtc() {
                  now +=
                    1000;

                  return new Date(
                    now,
                  ).toISOString();
                },

                async reviewPreflight(
                  review,
                ) {
                  return review
                    .preflightDigest;
                },

                receiptStore: {
                  async persist(
                    receipt,
                  ) {
                    persisted =
                      receipt;
                  },

                  async read(
                    receiptId,
                  ) {
                    if (
                      persisted ===
                        null ||
                      persisted.receiptId !==
                        receiptId
                    ) {
                      throw new Error(
                        "Missing P02 test receipt.",
                      );
                    }

                    return persisted;
                  },
                },
              },
            },
          );

        const permissionEffect =
          result.proofResults.find(
            (
              proof,
            ) =>
              proof.plane ===
                "PERMISSION_EFFECT",
          );

        expect(
          permissionEffect,
        ).toMatchObject({
          applicability:
            "NOT_APPLICABLE",

          status:
            "NOT_APPLICABLE",

          sourceReference:
            null,

          observedAtUtc:
            null,

          provenance:
            "NOT_APPLICABLE",

          safeEvidenceDigest:
            null,
        });

        expect(
          result.outcome,
        ).toBe(
          "VERIFIED",
        );

        expect(
          result.receipt?.actionType,
        ).toBe(
          "ROLE_DELETE",
        );

        expect(
          result.proofResults.map(
            (
              proof,
            ) =>
              [
                proof.plane,
                proof.status,
              ],
          ),
        ).toEqual([
          [
            "SECURITY_METADATA",
            "PASS",
          ],
          [
            "PERMISSION_EFFECT",
            "NOT_APPLICABLE",
          ],
        ]);
      },
    );

    it(
      "refuses receipt persistence when resource preservation is not proven after delete",
      async () => {
        let now =
          Date.parse(
            "2026-09-21T00:00:00.000Z",
          );

        let role:
          R4PermissionRoleSnapshot |
          null =
          R4_PERMISSION_ROLE_EXPECTED;

        let resourcePresent =
          true;

        let persistCount =
          0;

        const result =
          await certifyP02RoleDeleteAction(
            {
              intent:
                P02_ROLE_DELETE_INTENT,

              actionId:
                "p02-role-delete-resource-drift",

              receiptId:
                "meridian-p02-role-delete-resource-drift",

              logicalActor:
                "test-operator",

              irisRuntimeUser:
                "meridian.runtime",
            },
            {
              contract: {
                async readRole() {
                  return role;
                },

                async readOwners() {
                  return role ===
                    null
                    ? null
                    : Object.freeze([]);
                },

                async readPrerequisiteResource() {
                  return resourcePresent;
                },

                async executeDelete() {
                  role =
                    null;

                  resourcePresent =
                    false;
                },
              },

              certification: {
                nowUtc() {
                  now +=
                    1000;

                  return new Date(
                    now,
                  ).toISOString();
                },

                async reviewPreflight(
                  review,
                ) {
                  return review
                    .preflightDigest;
                },

                receiptStore: {
                  async persist() {
                    persistCount +=
                      1;
                  },

                  async read() {
                    throw new Error(
                      "P02 receipt read must not occur after failed recovery proof.",
                    );
                  },
                },
              },
            },
          );

        expect(
          result.outcome,
        ).toBe(
          "UNKNOWN_AFTER_DISPATCH",
        );

        expect(
          persistCount,
        ).toBe(
          0,
        );
      },
    );
  },
);
