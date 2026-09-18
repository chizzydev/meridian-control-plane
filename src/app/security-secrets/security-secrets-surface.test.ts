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
  "A8C Security / Secrets product surface",
  () => {
    it(
      "uses an explicit server-only escalation role and only approved metadata inventories",
      () => {
        const server =
          read(
            "src/lib/iris/security-secrets-product-server.ts",
          );

        for (
          const marker of [
            'import "server-only"',
            "MeridianSecurityMetadataReader",
            'role:',
            "/v2/wallet/collections?maxRows=100",
            "/v2/wallet/secrets?",
            "/v2/security/x509-credentials?maxRows=100",
            "/v2/security/ssl-configurations?maxRows=100",
            "/v2/security/oauth2/client/server-definitions?maxRows=100",
            "/v2/security/oauth2/client/client-configurations?",
            "/v2/security/oauth2/resource-servers?maxRows=100",
            "/v2/security/oauth2/server/clients?maxRows=100",
            "HasPrivateKey",
            "OwnerList",
            "PeerNames",
            "CAFile",
            "ClientId",
            "RedirectURL",
            "MERIDIAN_RUNTIME_PASSWORD",
            "explicitEscalation",
            "defaultRuntimeBroadened",
            "metadataOnly",
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
            "/v2/security/x509-credential?",
            "/v2/security/ssl-configuration?",
            "ClientSecret",
            "PrivateKeyData",
            "CertificateData",
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
        ).not.toContain(
          'method:\n          "PUT"',
        );

        expect(
          server,
        ).not.toContain(
          'method:\n          "PATCH"',
        );

        expect(
          server,
        ).not.toContain(
          'method:\n          "DELETE"',
        );
      },
    );

    it(
      "renders six metadata families plus explicit material and failure boundaries",
      () => {
        const page =
          read(
            "src/app/security-secrets/page.tsx",
          );

        for (
          const marker of [
            "SECURITY / SECRETS",
            "METADATA ONLY",
            "EXPLICIT ESCALATION ROLE",
            "Permissions remains the centerpiece",
            "MeridianSecurityMetadataReader",
            "Default runtime broadened",
            "Wallet",
            "Secret name/type metadata only",
            "X.509",
            "Private key present",
            "CA file metadata",
            "TLS / SSL",
            "OAuth client",
            "Client configuration metadata",
            "OAuth resource server",
            "OAuth server client",
            "Safe failure boundary",
            "Live security metadata unavailable",
            "Secret values",
            "Private-key material",
            "Certificate bodies",
            "Client secrets / passwords",
            "Browser credential",
            "NOT EXPOSED",
            "Public management proxy",
            "Mutation controls",
            "READ ONLY",
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
      },
    );

    it(
      "wires security breadth into the judge fast path without replacing prior closures",
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
            "Explore Web Apps / REST",
            'href="/security-secrets"',
            "Explore Security / Secrets",
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
      "does not create a public security management route handler",
      () => {
        expect(
          () =>
            read(
              "src/app/security-secrets/route.ts",
            ),
        ).toThrow();
      },
    );
  },
);
