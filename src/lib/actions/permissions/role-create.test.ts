import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  ActionReceiptV2,
} from "../../proof/receipt";

import {
  P01_ROLE_CREATE_INTENT,
  certifyP01RoleCreateAction,
  createP01RoleCreateProofContract,
  reconcileUnknownP01RoleCreate,
} from "./role-create";

import {
  R4_PERMISSION_ROLE_EXPECTED,
  type R4PermissionRoleSnapshot,
} from "./role-fixture";

describe(
  "P01 ROLE_CREATE proof path",
  () => {
    it(
      "reviews absent role to exact unassigned role definition",
      async () => {
        const contract =
          createP01RoleCreateProofContract({
            async readRole() {
              return null;
            },

            async readPrerequisiteResource() {
              return true;
            },

            async executeCreate() {
            },
          });

        const preflight =
          await contract.preflight(
            {
              actionId:
                "test-p01",

              logicalActor:
                "test",

              irisRuntimeUser:
                "meridian.runtime",

              nowUtc:
                "2026-09-21T00:00:00.000Z",
            },
            P01_ROLE_CREATE_INTENT,
          );

        const delta =
          contract.expectedDelta(
            P01_ROLE_CREATE_INTENT,
            preflight,
          );

        expect(
          delta.before,
        ).toEqual({
          present:
            false,
        });

        expect(
          delta.after,
        ).toMatchObject({
          present:
            true,

          name:
            "MeridianR4ProofRole",

          resource:
            "Meridian_Orders:R",

          assignedToUser:
            false,
        });

        expect(
          contract.proofRequirements.map(
            (
              requirement,
            ) =>
              [
                requirement.plane,
                requirement.applicability,
              ],
          ),
        ).toEqual([
          [
            "SECURITY_METADATA",
            "REQUIRED",
          ],
          [
            "PERMISSION_EFFECT",
            "NOT_APPLICABLE",
          ],
        ]);
      },
    );

    it(
      "marks an appeared role stale with zero mutation dispatch",
      async () => {
        let executeCount =
          0;

        let role:
          R4PermissionRoleSnapshot |
          null =
          null;

        const contract =
          createP01RoleCreateProofContract({
            async readRole() {
              return role;
            },

            async readPrerequisiteResource() {
              return true;
            },

            async executeCreate() {
              executeCount +=
                1;
            },
          });

        const preflight =
          await contract.preflight(
            {
              actionId:
                "test-p01",

              logicalActor:
                "test",

              irisRuntimeUser:
                "meridian.runtime",

              nowUtc:
                "2026-09-21T00:00:00.000Z",
            },
            P01_ROLE_CREATE_INTENT,
          );

        role =
          R4_PERMISSION_ROLE_EXPECTED;

        const decision =
          await contract.revalidate(
            {
              actionId:
                "test-p01",

              logicalActor:
                "test",

              irisRuntimeUser:
                "meridian.runtime",

              nowUtc:
                "2026-09-21T00:00:01.000Z",
            },
            {
              intent:
                P01_ROLE_CREATE_INTENT,

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
          executeCount,
        ).toBe(
          0,
        );
      },
    );

    it(
      "reconciles exact role as applied, absence as not applied, and alien role as still unknown",
      () => {
        expect(
          reconcileUnknownP01RoleCreate(
            R4_PERMISSION_ROLE_EXPECTED,
          ).outcome,
        ).toBe(
          "APPLIED",
        );

        expect(
          reconcileUnknownP01RoleCreate(
            null,
          ).outcome,
        ).toBe(
          "NOT_APPLIED",
        );

        expect(
          reconcileUnknownP01RoleCreate({
            ...R4_PERMISSION_ROLE_EXPECTED,

            description:
              "alien",
          }).outcome,
        ).toBe(
          "STILL_UNKNOWN",
        );
      },
    );

    it(
      "closes VERIFIED only after exact role metadata persistence and readback",
      async () => {
        let now =
          Date.parse(
            "2026-09-21T00:00:00.000Z",
          );

        let role:
          R4PermissionRoleSnapshot |
          null =
          null;

        let persisted:
          ActionReceiptV2 |
          null =
          null;

        const result =
          await certifyP01RoleCreateAction(
            {
              intent:
                P01_ROLE_CREATE_INTENT,

              actionId:
                "p01-role-create-test",

              receiptId:
                "meridian-p01-role-create-test",

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

                async readPrerequisiteResource() {
                  return true;
                },

                async executeCreate() {
                  role =
                    R4_PERMISSION_ROLE_EXPECTED;
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
                        "Missing P01 test receipt.",
                      );
                    }

                    return persisted;
                  },
                },
              },
            },
          );

        expect(
          result.outcome,
        ).toBe(
          "VERIFIED",
        );

        expect(
          result.receipt?.actionType,
        ).toBe(
          "ROLE_CREATE",
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
      "refuses receipt persistence when authoritative role metadata is not exact",
      async () => {
        let now =
          Date.parse(
            "2026-09-21T00:00:00.000Z",
          );

        let role:
          R4PermissionRoleSnapshot |
          null =
          null;

        let persistCount =
          0;

        const result =
          await certifyP01RoleCreateAction(
            {
              intent:
                P01_ROLE_CREATE_INTENT,

              actionId:
                "p01-role-create-bad-metadata",

              receiptId:
                "meridian-p01-role-create-bad-metadata",

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

                async readPrerequisiteResource() {
                  return true;
                },

                async executeCreate() {
                  role = {
                    ...R4_PERMISSION_ROLE_EXPECTED,

                    description:
                      "drifted",
                  };
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
                      "P01 receipt read must not occur after failed metadata proof.",
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
