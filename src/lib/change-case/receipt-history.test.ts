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
  buildVerifiedReceiptHistoryRecord,
  validateVerifiedReceiptHistoryRecord,
} from "./receipt-history";

import {
  getRecordedVerifiedReceipt,
} from "./recorded-receipt";

const receiptPath =
  "src/lib/change-case/recorded-receipts/maya-patel-remove-meridian-supervisor.json";

function canonicalReceipt() {
  const receiptJson =
    readFileSync(
      receiptPath,
      "utf8",
    );

  const receiptSha256 =
    createHash(
      "sha256",
    )
      .update(
        Buffer.from(
          receiptJson,
          "utf8",
        ),
      )
      .digest(
        "hex",
      )
      .toUpperCase();

  return {
    receipt:
      getRecordedVerifiedReceipt(),

    receiptJson,

    receiptSha256,
  };
}

describe(
  "verified receipt persistence contract",
  () => {
    it(
      "projects the certified receipt into the append-only IRIS history record",
      () => {
        const source =
          canonicalReceipt();

        const record =
          buildVerifiedReceiptHistoryRecord(
            source,
          );

        expect(
          record,
        ).toMatchObject({
          schemaVersion:
            "meridian.receipt-history.v1",

          receiptId:
            "meridian-maya-patel-remove-MeridianSupervisor-audit-481",

          username:
            "maya.patel",

          displayName:
            "Maya Patel",

          operation:
            "REMOVE",

          role:
            "MeridianSupervisor",

          lifecycleState:
            "VERIFIED",

          reviewedPreflightDigest:
            "1ACCE293BE593A8A829B116F04E692A5ED18D68C74834E97E1ADB8ADCA2462BE",

          freshApplyTimePreflightDigest:
            "1ACCE293BE593A8A829B116F04E692A5ED18D68C74834E97E1ADB8ADCA2462BE",

          receiptSha256:
            "39E43BB29CD8C7AD502F86846D5044918C508642209CC82E75627DB37AD6C4E6",

          applyUtc:
            "2026-09-16 12:04:04.161",

          applyActor:
            "meridian.runtime",

          applyPid:
            883,

          nativeAuditSystemId:
            "a88ee4007559:IRIS",

          nativeAuditIndex:
            481,

          nativeAuditUtc:
            "2026-09-16 12:04:04.169",

          nativeAuditEvent:
            "UserChange",

          nativeAuditActor:
            "meridian.runtime",
        });

        expect(
          record.receiptJson,
        ).toBe(
          source.receiptJson,
        );

        expect(
          () =>
            validateVerifiedReceiptHistoryRecord(
              record,
            ),
        ).not.toThrow();
      },
    );

    it(
      "rejects a receipt JSON payload that does not describe the same immutable receipt identity",
      () => {
        const source =
          canonicalReceipt();

        const record =
          buildVerifiedReceiptHistoryRecord(
            source,
          );

        expect(
          () =>
            validateVerifiedReceiptHistoryRecord({
              ...record,

              receiptJson:
                JSON.stringify({
                  receiptId:
                    "different",
                }),
            }),
        ).toThrow(
          "receipt JSON identity",
        );
      },
    );

    it(
      "rejects malformed receipt hashes before transport",
      () => {
        const source =
          canonicalReceipt();

        const record =
          buildVerifiedReceiptHistoryRecord(
            source,
          );

        expect(
          () =>
            validateVerifiedReceiptHistoryRecord({
              ...record,

              receiptSha256:
                "not-a-sha",
            }),
        ).toThrow(
          "receipt SHA-256",
        );
      },
    );
  },
);