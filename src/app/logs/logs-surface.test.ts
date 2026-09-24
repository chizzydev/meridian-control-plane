import {
  existsSync,
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";

function read(
  path:
    string,
): string {
  return readFileSync(
    path,
    "utf8",
  );
}

describe(
  "A8F Logs product surface",
  () => {
    it(
      "uses only the certified SysLogTable read path and preserves audit separation",
      () => {
        const server =
          read(
            "src/lib/iris/logs-product-server.ts",
          );

        for (
          const marker
          of [
            'import "server-only";',
            "%Library.SysLogTable",
            "SELECT only",
            "InterSystems DBAPI external SQL",
            "Category,LogLevel,Message,Namespace,Pid,Routine,TimeAdded",
            "sharedmemory=False",
            "MERIDIAN_RUNTIME_PASSWORD",
            "MERIDIAN_IRISPYTHON_EXECUTABLE",
            "RUNTIME_CREDENTIAL_NOT_CONFIGURED",
            "SYSLOGTABLE_RUNTIME_NOT_CONFIGURED",
            "LIVE_OPERATIONAL_LOG_READ_UNAVAILABLE",
            "redact_message",
            "[REDACTED_JWT]",
            "sourceIdentitySchema",
            "severitySchema",
            "timeSchema",
          ]
        ) {
          expect(
            server,
          ).toContain(
            marker,
          );
        }

        for (
          const forbidden
          of [
            "INSERT INTO %Library.SysLogTable",
            "UPDATE %Library.SysLogTable",
            "DELETE FROM %Library.SysLogTable",
            "%SYS.Audit",
            "Security.Audit",
            "%Admin_Manage:U",
            "%Admin_Operate:U",
            "%Admin_Journal:U",
            "Stop-Process",
            "taskkill",
          ]
        ) {
          expect(
            server,
          ).not.toContain(
            forbidden,
          );
        }
      },
    );

    it(
      "renders the empty-runtime state, filters, source identity, and explicit authority boundary",
      () => {
        const page =
          read(
            "src/app/logs/page.tsx",
          );

        for (
          const marker
          of [
            "LOGS",
            "READ ONLY",
            "NON-AUDIT OPERATIONAL LOGS",
            "Operational log filters",
            "Source, severity, and time",
            "Source contains",
            "Severity",
            "Time window",
            "Apply read filters",
            "No operational log rows are currently present.",
            "does not",
            "manufacture synthetic log entries",
            "Category / Namespace / Routine",
            "LogLevel",
            "TimeAdded",
            "Non-audit subsystem records",
            "Redacted message preview",
            "%Library.SysLogTable",
            "SELECT ONLY",
            "Security audit",
            "action-specific operational evidence",
            "Generic mutation proxy",
            "DISTINCT AUTHORITY",
            "Log mutation controls",
            "NONE",
            "Browser credential",
            "NOT EXPOSED",
            "Raw message payloads",
            "NOT EXPOSED - secret and sensitive-message boundary",
            "SERVER-ONLY DBAPI",
            "Safe failure boundary",
            "{surface.reason}",
          ]
        ) {
          expect(
            page,
          ).toContain(
            marker,
          );
        }

        expect(
          page,
        ).not.toContain(
          '"use client"',
        );
      },
    );

    it(
      "adds Logs to the existing judge fast path without replacing the prior family links",
      () => {
        const home =
          read(
            "src/app/page.tsx",
          );

        for (
          const marker
          of [
            'href="/web-rest"',
            'href="/security-secrets"',
            'href="/tasks"',
            'href="/system"',
            'href="/logs"',
            "Explore Web Apps / REST",
            "Explore Security / Secrets",
            "Explore Task Management",
            "Explore OS / System",
            "Explore Logs",
          ]
        ) {
          expect(
            home,
          ).toContain(
            marker,
          );
        }
      },
    );

    it(
      "does not create a public logs API or operational mutation surface",
      () => {
        expect(
          existsSync(
            "src/app/api/logs",
          ),
        ).toBe(
          false,
        );

        const page =
          read(
            "src/app/logs/page.tsx",
          );

        const server =
          read(
            "src/lib/iris/logs-product-server.ts",
          );

        expect(
          page,
        ).not.toContain(
          "MERIDIAN_RUNTIME_PASSWORD",
        );

        expect(
          page,
        ).not.toContain(
          "fetch(",
        );

        expect(
          server,
        ).not.toContain(
          'method: "POST"',
        );

        expect(
          server,
        ).not.toContain(
          'method: "PUT"',
        );

        expect(
          server,
        ).not.toContain(
          'method: "PATCH"',
        );

        expect(
          server,
        ).not.toContain(
          'method: "DELETE"',
        );
      },
    );
  },
);
