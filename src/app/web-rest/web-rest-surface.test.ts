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
  "A8B Web Apps / REST product surface",
  () => {
    it(
      "uses a server-only read composition without reopening the centerpiece baseline",
      () => {
        const server =
          read(
            "src/lib/iris/web-rest-product-server.ts",
          );

        for (
          const marker of [
            'import "server-only"',
            "readMeridianWebApplications",
            "readMeridianDeployedRestInventory",
            "readTargetActionHistory",
            "readActionReceiptHistory",
            "actionReceiptV2FromGenericHistory",
            "readOrdersWebAppState",
            "probeOrdersWebAppHealth",
            "buildSafeWebRestLifecycleView",
            "ORDERS_WEB_APP_TARGET_CANONICAL_ID",
            "meridian-api-declaration.json",
            "NATIVE_EMITTED_SWAGGER",
            "AUTHORITATIVE_SOURCE_OPENAPI",
            "MERIDIAN_RUNTIME_PASSWORD",
            "browserCredentialExposure",
            "publicManagementProxy",
            "mutationControls",
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
            "readCenterpieceImpactPreflight",
            "readCenterpieceAuthorizationPreflight",
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
      },
    );

    it(
      "renders safe application and REST detail with explicit provenance and failure boundaries",
      () => {
        const page =
          read(
            "src/app/web-rest/page.tsx",
          );

        for (
          const marker of [
            "WEB APPS / REST",
            "READ ONLY",
            "W01-W04 are certified fixed-purpose server actions",
            "W01-W04 are four fixed-purpose semantic contracts",
            "4 certified semantic actions",
            "retained verified receipts",
            "Breadth vs evidence volume",
            "joined proof surface",
            "Meridian BFF: /api/admin/v2/web-apps",
            "historical W04 test target",
            "InterSystems SysAdmin REST, server-side",
            "Native emitted Swagger",
            "Authoritative OpenAPI",
            "Safe failure boundary",
            "Live management read unavailable",
            "Application resource",
            "Dispatch class",
            "REST / OpenAPI exploration",
            "PROVEN DEPLOYMENT",
            "PROVEN DECLARED METADATA",
            "Verified lifecycle",
            "Historical proof is not current state",
            "Current-state recheck",
            "Historical verified receipts",
            "Receipt integrity",
            "Proof planes",
            "CANONICAL HASH VALIDATED",
            "FRESH READBACK",
            "Required resources",
            "Browser credential",
            "NOT EXPOSED",
            "Generic mutation proxy",
            "Browser mutation controls",
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
      },
    );

    it(
      "wires the certified family into the judge fast path while preserving prior evidence closures",
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
            "Certified control-plane breadth",
            "Explore Web Apps / REST",
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
      "does not add a public route handler or browser mutation surface for the family",
      () => {
        const page =
          read(
            "src/app/web-rest/page.tsx",
          );

        const server =
          read(
            "src/lib/iris/web-rest-product-server.ts",
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

        expect(
          server,
        ).not.toContain(
          "persistActionReceiptHistory",
        );

        expect(
          server,
        ).not.toContain(
          "buildActionReceiptHistoryWritePlan",
        );
      },
    );
  },
);
