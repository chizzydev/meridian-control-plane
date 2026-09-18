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
            "Permissions remains the centerpiece",
            "Official SysAdmin REST",
            "Native emitted Swagger",
            "Authoritative OpenAPI",
            "Safe failure boundary",
            "Live management read unavailable",
            "Application resource",
            "Dispatch class",
            "REST / OpenAPI exploration",
            "PROVEN DEPLOYMENT",
            "PROVEN DECLARED METADATA",
            "Required resources",
            "Browser credential",
            "NOT EXPOSED",
            "Public management proxy",
            "Mutation controls",
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
      "wires the supporting family into the existing judge fast path without replacing the centerpiece",
      () => {
        const home =
          read(
            "src/app/page.tsx",
          );

        for (
          const marker of [
            "Security changes are not finished when configuration changes.",
            "Open Change Queue",
            "Inspect verified receipt",
            'href="/web-rest"',
            "Supporting control-plane breadth",
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
      },
    );
  },
);
