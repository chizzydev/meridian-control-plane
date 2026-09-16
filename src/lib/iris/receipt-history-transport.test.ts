import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildReceiptHistoryReadPlan,
  buildReceiptHistoryUserPlan,
  buildReceiptHistoryWritePlan,
  receiptHistoryReadPath,
  receiptHistoryUserPath,
} from "./receipt-history-transport";

import {
  buildVerifiedReceiptHistoryRecord,
} from "../change-case/receipt-history";

import {
  getRecordedVerifiedReceipt,
} from "../change-case/recorded-receipt";

import {
  createHash,
} from "node:crypto";

function record() {
  const receiptJson =
    readFileSync(
      "src/lib/change-case/recorded-receipts/maya-patel-remove-meridian-supervisor.json",
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

  return buildVerifiedReceiptHistoryRecord({
    receipt:
      getRecordedVerifiedReceipt(),

    receiptJson,

    receiptSha256,
  });
}

describe(
  "IRIS receipt-history transport plan",
  () => {
    it(
      "builds one append-only POST plan for an exact verified receipt",
      () => {
        expect(
          buildReceiptHistoryWritePlan(
            record(),
          ),
        ).toMatchObject({
          method:
            "POST",

          path:
            "/receipts",
        });
      },
    );

    it(
      "URL-encodes receipt and username read paths",
      () => {
        expect(
          receiptHistoryReadPath(
            "receipt / 1",
          ),
        ).toBe(
          "/receipts/receipt%20%2F%201",
        );

        expect(
          receiptHistoryUserPath(
            "maya patel",
          ),
        ).toBe(
          "/history/maya%20patel",
        );

        expect(
          buildReceiptHistoryReadPlan(
            "r1",
          ),
        ).toEqual({
          method:
            "GET",

          path:
            "/receipts/r1",
        });

        expect(
          buildReceiptHistoryUserPlan(
            "maya.patel",
          ),
        ).toEqual({
          method:
            "GET",

          path:
            "/history/maya.patel",
        });
      },
    );

    it(
      "rejects empty path identities before any network boundary",
      () => {
        expect(
          () =>
            receiptHistoryReadPath(
              " ",
            ),
        ).toThrow(
          "Receipt id is required.",
        );

        expect(
          () =>
            receiptHistoryUserPath(
              "",
            ),
        ).toThrow(
          "Username is required.",
        );
      },
    );
  },
);