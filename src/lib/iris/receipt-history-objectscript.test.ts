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
  "native IRIS receipt-history ObjectScript source",
  () => {
    it(
      "defines exactly the append-only write and read surfaces",
      () => {
        const text =
          source();

        expect(
          text,
        ).toContain(
          "Class Meridian.ControlPlane.History.REST Extends %CSP.REST",
        );

        expect(
          text,
        ).toContain(
          '<Route Url="/receipts" Method="POST" Call="PersistReceipt"/>',
        );

        expect(
          text,
        ).toContain(
          '<Route Url="/receipts/:receiptId" Method="GET" Call="GetReceipt"/>',
        );

        expect(
          text,
        ).toContain(
          '<Route Url="/history/:username" Method="GET" Call="ListHistory"/>',
        );

        expect(
          text.match(
            /<Route /g,
          ),
        ).toHaveLength(
          3,
        );
      },
    );

    it(
      "persists into the dedicated Meridian history global with idempotent identity and conflict refusal",
      () => {
        const text =
          source();

        expect(
          text,
        ).toContain(
          '^Meridian.ControlPlane.History',
        );

        expect(
          text,
        ).toContain(
          'out.status="IDEMPOTENT"',
        );

        expect(
          text,
        ).toContain(
          '"409 Conflict"',
        );

        expect(
          text,
        ).toContain(
          '"RECEIPT_HISTORY_ID_CONFLICT"',
        );

        expect(
          text,
        ).toContain(
          "tstart",
        );

        expect(
          text,
        ).toContain(
          "tcommit",
        );

        expect(
          text,
        ).toContain(
          "trollback",
        );
      },
    );

    it(
      "contains no security-role mutation or process-control primitive",
      () => {
        const text =
          source();

        for (
          const forbidden of [
            "Security.Users",
            "Security.Roles",
            "RemoveRoles",
            "AddRoles",
            "ProcessQuery",
            "Terminate",
            "KillProcess",
          ]
        ) {
          expect(
            text,
          ).not.toContain(
            forbidden,
          );
        }

        expect(
          text,
        ).not.toMatch(
          /Method="(?:PUT|PATCH|DELETE)"/,
        );
      },
    );
  },
);