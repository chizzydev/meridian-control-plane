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
  "native IRIS history ObjectScript source",
  () => {
    it(
      "preserves receipt history and adds exactly four durable Change Case routes",
      () => {
        const text =
          source();

        expect(
          text,
        ).toContain(
          "Class Meridian.ControlPlane.History.REST Extends %CSP.REST",
        );

        for (
          const route
          of [
            '<Route Url="/receipts" Method="POST" Call="PersistReceipt"/>',
            '<Route Url="/receipts/:receiptId" Method="GET" Call="GetReceipt"/>',
            '<Route Url="/history/:username" Method="GET" Call="ListHistory"/>',
            '<Route Url="/cases" Method="POST" Call="CreateCase"/>',
            '<Route Url="/cases/:caseId/events" Method="GET" Call="ListCaseEvents"/>',
            '<Route Url="/cases/:caseId/events" Method="POST" Call="AppendCaseEvent"/>',
            '<Route Url="/cases/:caseId" Method="GET" Call="GetCase"/>',
          ]
        ) {
          expect(
            text,
          ).toContain(
            route,
          );
        }

        expect(
          text.match(
            /<Route /g,
          ),
        ).toHaveLength(
          7,
        );
      },
    );

    it(
      "preserves append-only receipt persistence with idempotent identity and conflict refusal",
      () => {
        const text =
          source();

        expect(
          text,
        ).toContain(
          '^Meridian.ControlPlane.History("receipt",receiptId,"json")',
        );

        expect(
          text,
        ).toContain(
          'out.status="IDEMPOTENT"',
        );

        expect(
          text,
        ).toContain(
          '"RECEIPT_HISTORY_ID_CONFLICT"',
        );

        expect(
          text,
        ).toContain(
          '^Meridian.ControlPlane.History("by-user",username,receiptId)=1',
        );
      },
    );

    it(
      "persists one authoritative case record plus an append-only monotonic event journal",
      () => {
        const text =
          source();

        for (
          const marker
          of [
            '^Meridian.ControlPlane.History("case",caseId,"record")',
            '^Meridian.ControlPlane.History("case",caseId,"event-count")',
            '^Meridian.ControlPlane.History("case",caseId,"event",sequence)',
            '"CHANGE_CASE_VERSION_CONFLICT"',
            'lock +^Meridian.ControlPlane.History("case",caseId):5',
            'set sequence=eventCount+1',
            'set ^Meridian.ControlPlane.History("case",caseId,"event-count")=sequence',
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
          'kill ^Meridian.ControlPlane.History("case"',
        );
      },
    );

    it(
      "hard-binds durable live cases to the fixed A3 isolated fixture authority",
      () => {
        const text =
          source();

        for (
          const marker
          of [
            'record.mode\'="LIVE_ISOLATED_DEMO"',
            'fixture.fixtureId\'="meridian-live-demo-v1"',
            'fixture.username\'="meridian.demo.witness"',
            'fixture.targetRole\'="MeridianSupervisor"',
            'intent.operation\'="REMOVE"',
            'intent.targetRole\'="MeridianSupervisor"',
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
          "maya.patel",
        );
      },
    );

    it(
      "covers the frozen A2 lifecycle journal vocabulary without exposing rewrite or delete routes",
      () => {
        const text =
          source();

        for (
          const event
          of [
            "CASE_CREATED",
            "PREFLIGHT_COMPLETED",
            "REVIEW_ACCEPTED",
            "APPLY_REVALIDATION_MATCHED",
            "APPLY_REVALIDATION_STALE",
            "APPLY_ATTEMPT_STARTED",
            "APPLY_SUCCEEDED",
            "APPLY_FAILED",
            "CONFIGURED_STATE_VERIFIED",
            "LIVE_STALE_OBSERVED",
            "OLD_WITNESS_CLOSED",
            "OLD_PID_GONE",
            "FRESH_WITNESS_BOUND",
            "LIVE_CONVERGED",
            "AUDIT_PENDING",
            "AUDIT_BOUND",
            "RECEIPT_WRITE_STARTED",
            "RECEIPT_PERSISTED",
            "RECEIPT_READBACK_VERIFIED",
            "CASE_VERIFIED",
          ]
        ) {
          expect(
            text,
          ).toContain(
            event,
          );
        }

        expect(
          text,
        ).not.toMatch(
          /Method="(?:PUT|PATCH|DELETE)"/,
        );
      },
    );

    it(
      "contains no security-role mutation or process-control primitive",
      () => {
        const text =
          source();

        for (
          const forbidden
          of [
            "Security.Users",
            "Security.Roles",
            "RemoveRoles",
            "AddRoles",
            "ProcessQuery",
            "Terminate",
            "KillProcess",
            "%Admin_Manage",
          ]
        ) {
          expect(
            text,
          ).not.toContain(
            forbidden,
          );
        }
      },
    );

    it(
      "uses transactions and RETURN for value-bearing REST exits",
      () => {
        const text =
          source();

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

        expect(
          text,
        ).not.toContain(
          "quit ..WriteError(",
        );

        expect(
          text,
        ).not.toContain(
          "quit $$$OK",
        );

        expect(
          text.match(
            /return \.\.WriteError\(/g,
          )?.length,
        ).toBeGreaterThanOrEqual(
          11,
        );

        expect(
          text.match(
            /return \$\$\$OK/g,
          )?.length,
        ).toBeGreaterThanOrEqual(
          5,
        );
      },
    );
  },
);
