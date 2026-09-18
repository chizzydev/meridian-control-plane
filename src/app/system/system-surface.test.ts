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
  "A8E OS / System product surface",
  () => {
    it(
      "uses explicit server-owned system escalation plus certified ProcessQuery fallback",
      () => {
        const server =
          read(
            "src/lib/iris/system-product-server.ts",
          );

        for (
          const marker
          of [
            'import "server-only";',
            "MeridianSystemMetadataReader",
            "%Admin_Operate:U + %DB_IRISSYS:R",
            "/v2/monitor/dashboard/system-resources",
            "/v2/monitor/system-usage",
            "/v2/monitor/system-usage/shared-memory",
            "/v2/locks?maxRows=100",
            "%SYS.ProcessQuery",
            "sharedmemory=False",
            "MERIDIAN_IRISPYTHON_EXECUTABLE",
            "RUNTIME_CREDENTIAL_NOT_CONFIGURED",
            "PROCESSQUERY_RUNTIME_NOT_CONFIGURED",
            "LIVE_SYSTEM_READ_UNAVAILABLE",
          ]
        ) {
          expect(
            server,
          ).toContain(
            marker,
          );
        }

        expect(
          server,
        ).not.toContain(
          '"/v2/processes',
        );

        expect(
          server,
        ).not.toContain(
          "%Admin_Manage:U",
        );

        expect(
          server,
        ).not.toContain(
          "/v2/process/terminate",
        );

        expect(
          server,
        ).not.toContain(
          "/v2/process/suspend",
        );

        expect(
          server,
        ).not.toContain(
          "/v2/process/resume",
        );

        expect(
          server,
        ).not.toContain(
          "/v2/process/broadcast",
        );

        expect(
          server,
        ).not.toContain(
          "/v2/database-dir/mount",
        );

        expect(
          server,
        ).not.toContain(
          "/v2/database-dir/dismount",
        );
      },
    );

    it(
      "renders the required system signals and the explicit read-only authority boundary",
      () => {
        const page =
          read(
            "src/app/system/page.tsx",
          );

        for (
          const marker
          of [
            "OS / SYSTEM",
            "READ ONLY",
            "System resource signals",
            "System usage",
            "Shared memory",
            "Process visibility",
            "Runtime processes",
            "Current locks",
            "MeridianSystemMetadataReader",
            "%Admin_Operate:U + %DB_IRISSYS:R",
            "%Admin_Manage",
            "NOT GRANTED",
            "Mutation controls",
            "NONE",
            "Official process endpoint",
            "REJECTED ON BUILD 221U",
            "Process fallback",
            "CERTIFIED READ ONLY",
            "Browser escalated token",
            "NOT EXPOSED",
            "{surface.reason}",
          ]
        ) {
          expect(
            page,
          ).toContain(
            marker,
          );
        }
      },
    );

    it(
      "adds OS / System to the judge fast path without replacing prior family links",
      () => {
        const home =
          read(
            "src/app/page.tsx",
          );

        for (
          const marker
          of [
            'href="/web-rest"',
            "Explore Web Apps / REST",
            'href="/security-secrets"',
            "Explore Security / Secrets",
            'href="/tasks"',
            "Explore Task Management",
            'href="/system"',
            "Explore OS / System",
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
      "does not create a public OS / System operational route handler",
      () => {
        expect(
          existsSync(
            "src/app/api/system/route.ts",
          ),
        ).toBe(
          false,
        );

        expect(
          existsSync(
            "src/app/api/system",
          ),
        ).toBe(
          false,
        );
      },
    );
  },
);
