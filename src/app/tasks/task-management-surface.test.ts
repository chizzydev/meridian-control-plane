import {
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
  "A8D Task Management product surface",
  () => {
    it(
      "uses only the task-specific escalation role and official read surfaces",
      () => {
        const server =
          read(
            "src/lib/iris/task-management-product-server.ts",
          );

        for (
          const marker of [
            'import "server-only"',
            "MeridianTaskMetadataReader",
            'role:',
            "/v2/tasks?maxRows=100",
            "/v2/task/manager",
            "/v2/task/upcoming?maxRows=100",
            "/v2/task/history?maxRows=100",
            "LastFinished",
            "NextScheduled",
            "Suspended",
            "MERIDIAN_RUNTIME_PASSWORD",
            "RUNTIME_CREDENTIAL_NOT_CONFIGURED",
            "explicitEscalation",
            "defaultRuntimeBroadened",
            "adminOperateGranted",
            "taskMutationControls",
            "broadOperateAuthority",
          ]
        ) {
          expect(
            server,
          ).toContain(
            marker,
          );
        }

        for (
          const forbidden of [
            "/v2/processes",
            "/v2/locks",
            "/v2/web-sessions",
            "/v2/task/run",
            "/v2/task/suspend",
            "/v2/task/resume",
            "readCenterpieceAuthorizationPreflight",
            "readCenterpieceImpactPreflight",
            "maya.patel",
            "RemoveRoles",
            "AddRoles",
            "Kill process",
          ]
        ) {
          expect(
            server,
          ).not.toContain(
            forbidden,
          );
        }

        expect(
          server.match(
            /method:\s*"POST"/g,
          )?.length,
        ).toBe(
          1,
        );

        expect(
          server,
        ).not.toMatch(
          /method:\s*"PUT"/,
        );

        expect(
          server,
        ).not.toMatch(
          /method:\s*"PATCH"/,
        );

        expect(
          server,
        ).not.toMatch(
          /method:\s*"DELETE"/,
        );
      },
    );

    it(
      "renders inventory, state, schedule, history, and explicit authority boundaries",
      () => {
        const page =
          read(
            "src/app/tasks/page.tsx",
          );

        for (
          const marker of [
            "TASK MANAGEMENT",
            "READ ONLY",
            "BOUNDED SERVER AUTHORITY",
            "T01-T06 are certified fixed-purpose server actions",
            "T01-T06 cover the task-management lifecycle",
            "T01",
            "CREATE",
            "T02",
            "UPDATE",
            "T03",
            "RUN NOW",
            "T04",
            "SUSPEND",
            "T05",
            "RESUME",
            "T06",
            "DELETE",
            "Certification witness history",
            "retained Meridian witness rows",
            "MeridianTaskMetadataReader",
            "%Admin_Task:U only for the metadata surface",
            "Task Manager",
            "Current Task Manager inventory;",
            "Task inventory",
            "configured tasks",
            "Next scheduled",
            "Last finished",
            "Upcoming schedule",
            "upcoming executions",
            "Raw execution history",
            "recent history rows",
            "Browser task mutation controls",
            "%Admin_Operate",
            "NOT GRANTED",
            "Generic task mutation proxy",
            "Browser credential",
            "NOT EXPOSED",
            "Default runtime role",
            "UNCHANGED",
            "Safe failure boundary",
            "Live task metadata unavailable",
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
          page,
        ).not.toContain(
          "<form",
        );

        expect(
          page,
        ).not.toContain(
          "<button",
        );

        expect(
          page.match(
            /style=\{\{ minWidth: 0, tableLayout: "fixed" \}\}/g,
          )?.length,
        ).toBe(
          4,
        );
      },
    );

    it(
      "adds Task Management to the judge fast path without replacing prior closures",
      () => {
        const home =
          read(
            "src/app/page.tsx",
          );

        for (
          const marker of [
            "Every privileged operation, under proof.",
            "Open Change Queue",
            "Exact durable readback",
            'href="/web-rest"',
            "Explore Web Apps / REST",
            'href="/security-secrets"',
            "Explore Security / Secrets",
            'href="/tasks"',
            "Explore Task Management",
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
      "does not create a public task management route handler",
      () => {
        expect(
          () =>
            read(
              "src/app/tasks/route.ts",
            ),
        ).toThrow();
      },
    );
  },
);
