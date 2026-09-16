import {
  createHash,
} from "node:crypto";

import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  RECORDED_RECEIPT_SHA256,
  getRecordedVerifiedReceipt,
  summarizeRecordedReceipt,
} from "./recorded-receipt";

const receiptPath =
  "src/lib/change-case/recorded-receipts/maya-patel-remove-meridian-supervisor.json";

describe(
  "recorded certified Meridian receipt",
  () => {
    it(
      "preserves the exact canonical 10J receipt bytes",
      () => {
        const bytes =
          readFileSync(
            receiptPath,
          );

        const digest =
          createHash(
            "sha256",
          )
            .update(
              bytes,
            )
            .digest(
              "hex",
            )
            .toUpperCase();

        expect(
          digest,
        ).toBe(
          RECORDED_RECEIPT_SHA256,
        );
      },
    );

    it(
      "projects the certified VERIFIED Maya case",
      () => {
        const receipt =
          getRecordedVerifiedReceipt();

        expect(
          receipt.lifecycleState,
        ).toBe(
          "VERIFIED",
        );

        expect(
          receipt.change,
        ).toEqual({
          username:
            "maya.patel",

          displayName:
            "Maya Patel",

          operation:
            "REMOVE",

          role:
            "MeridianSupervisor",
        });

        expect(
          receipt.roles.directBefore,
        ).toEqual([
          "MeridianEmployee",
          "MeridianSupervisor",
        ]);

        expect(
          receipt.roles.directAfter,
        ).toEqual([
          "MeridianEmployee",
        ]);

        expect(
          receipt.roles.lostEffectiveRoles,
        ).toEqual([
          "MeridianJobRunner",
          "MeridianOperator",
          "MeridianSupervisor",
        ]);
      },
    );

    it(
      "derives judge-facing counts from receipt arrays instead of marketing constants",
      () => {
        const receipt =
          getRecordedVerifiedReceipt();

        expect(
          summarizeRecordedReceipt(
            receipt,
          ),
        ).toEqual({
          lostEffectiveRoleCount:
            3,

          lostPermissionCount:
            4,

          retainedPermissionCount:
            2,

          declaredApplicationCount:
            2,

          lostApplicationCount:
            1,

          retainedApplicationCount:
            1,

          declaredRestOperationCount:
            5,

          lostRestOperationCount:
            4,

          retainedRestOperationCount:
            1,
        });
      },
    );

    it(
      "preserves the certified convergence and audit claim boundary",
      () => {
        const receipt =
          getRecordedVerifiedReceipt();

        expect(
          receipt.convergence
            .liveAccessConverged,
        ).toBe(
          true,
        );

        expect(
          receipt.convergence
            .targetProcessCardinality,
        ).toBe(
          "ZERO",
        );

        expect(
          receipt.convergence
            .staleProcessTransitionDemonstratedByThisApply,
        ).toBe(
          false,
        );

        expect(
          receipt.nativeAudit,
        ).toMatchObject({
          bound:
            true,

          auditIndex:
            481,

          source:
            "%System",

          type:
            "%Security",

          event:
            "UserChange",

          username:
            "meridian.runtime",

          description:
            "Modify User maya.patel",

          exactMetadataMatchCount:
            1,
        });

        expect(
          receipt.claimBoundary
            .separateB6CExperimentProvidesStaleProcessEvidence,
        ).toBe(
          true,
        );

        expect(
          receipt.claimBoundary
            .b6cExperimentReopened,
        ).toBe(
          false,
        );
      },
    );
  },
);