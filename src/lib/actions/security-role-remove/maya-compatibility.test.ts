import {
  describe,
  expect,
  it,
} from "vitest";

import {
  RECORDED_RECEIPT_SHA256,
  getRecordedVerifiedReceipt,
} from "../../change-case/recorded-receipt";

import {
  deriveMayaV1ProofCompatibility,
} from "./maya-compatibility";

describe(
  "recorded Maya V1 compatibility with USER_REMOVE_ROLE semantics",
  () => {
    it(
      "maps the frozen Maya case to the generic proof semantics without rewriting history",
      () => {
        expect(
          deriveMayaV1ProofCompatibility(),
        ).toEqual({
          schemaVersion:
            "meridian.maya-v1-proof-compatibility.v1",
          actionType:
            "USER_REMOVE_ROLE",
          targetCanonicalId:
            "user:maya.patel",
          role:
            "MeridianSupervisor",
          configurationReadback:
            "PASS",
          permissionEffect:
            "PASS",
          liveRuntime:
            "PASS",
          nativeAudit:
            "PASS",
          freshApplyTimeRevalidation:
            "PASS",
          legacyReceiptSchema:
            "meridian-verified-change-receipt-v1",
          legacyReceiptSha256:
            "39E43BB29CD8C7AD502F86846D5044918C508642209CC82E75627DB37AD6C4E6",
          convertedToV2:
            false,
          historicalReceiptMutated:
            false,
        });
      },
    );

    it(
      "preserves the exact certified V1 receipt identity",
      () => {
        const receipt =
          getRecordedVerifiedReceipt();

        expect(
          receipt.receiptId,
        ).toBe(
          "meridian-maya-patel-remove-MeridianSupervisor-audit-481",
        );

        expect(
          receipt.schemaVersion,
        ).toBe(
          "meridian-verified-change-receipt-v1",
        );

        expect(
          RECORDED_RECEIPT_SHA256,
        ).toBe(
          "39E43BB29CD8C7AD502F86846D5044918C508642209CC82E75627DB37AD6C4E6",
        );
      },
    );

    it(
      "does not silently relabel the historical receipt as ActionReceiptV2",
      () => {
        expect(
          deriveMayaV1ProofCompatibility()
            .convertedToV2,
        ).toBe(
          false,
        );
      },
    );
  },
);
