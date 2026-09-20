import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";

const sourcePath =
  "iris/Meridian.ControlPlane.History.REST.cls";

function source():
  string {
  return readFileSync(
    sourcePath,
    "utf8",
  );
}

describe(
  "generic Action Receipt V2 native history foundation",
  () => {
    it(
      "adds dedicated append-only generic action receipt routes without rewriting legacy receipt routes",
      () => {
        const text =
          source();

        for (
          const route
          of [
            '<Route Url="/action-receipts" Method="POST" Call="PersistActionReceipt"/>',
            '<Route Url="/action-receipts/:receiptId" Method="GET" Call="GetActionReceipt"/>',
            '<Route Url="/action-history/:targetCanonicalId" Method="GET" Call="ListActionHistory"/>',
            '<Route Url="/receipts" Method="POST" Call="PersistReceipt"/>',
            '<Route Url="/receipts/:receiptId" Method="GET" Call="GetReceipt"/>',
          ]
        ) {
          expect(
            text,
          ).toContain(
            route,
          );
        }

        expect(
          text,
        ).not.toContain(
          '<Route Url="/action-receipts/:receiptId" Method="DELETE"',
        );

        expect(
          text,
        ).not.toContain(
          '<Route Url="/action-receipts/:receiptId" Method="PUT"',
        );
      },
    );

    it(
      "stores generic receipts under a separate immutable keyspace and target index",
      () => {
        const text =
          source();

        for (
          const marker
          of [
            '^Meridian.ControlPlane.History("action-receipt",receiptId,"json")',
            '^Meridian.ControlPlane.History("action-receipt",receiptId,"sha256")',
            '^Meridian.ControlPlane.History("action-receipt",receiptId,"summary")',
            '^Meridian.ControlPlane.History("action-by-target",targetCanonicalId,receiptId)=1',
            '"ACTION_RECEIPT_HISTORY_ID_CONFLICT"',
            '"meridian.action-receipt-history.v1"',
            '"meridian.action-receipt.v2"',
            'set targetCanonicalId=##class(%CSP.Page).UnescapeURL(targetCanonicalId,"UTF8")',
          ]
        ) {
          expect(
            text,
          ).toContain(
            marker,
          );
        }

        expect(
          text,
        ).not.toContain(
          'kill ^Meridian.ControlPlane.History("action-receipt"',
        );
      },
    );
  },
);
