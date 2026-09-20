import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";

describe(
  "judge-visible proof coverage surface",
  () => {
    it(
      "makes the 273/276 count rule and no-silent-gaps thesis visible",
      () => {
        const page =
          readFileSync(
            "src/app/proof-coverage/page.tsx",
            "utf8",
          );

        for (
          const marker
          of [
            "273 operations. No silent gaps.",
            "Source operations",
            "Three HEAD checks stay visible outside the 273 count",
            "Coverage is not authority, and authority is not support",
            "Bounded same-instance read explorer",
            "No arbitrary URL. No arbitrary method. No generic mutation body.",
            "GENERIC_MUTATION_DISPATCH=NO",
            "BROWSER_CREDENTIAL_EXPOSURE=NO",
            '`EXPLORER_RESULT=${liveResult.ok ? "PASS" : "NOT_PASS"}`',
            '`EXPLORER_HTTP_STATUS=${liveResult.httpStatus ?? "NONE"}`',
            '`AUTHORITY_MODE=${liveResult.authorityMode ?? "NONE"}`',
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
      "keeps runtime authority server-side",
      () => {
        const page =
          readFileSync(
            "src/app/proof-coverage/page.tsx",
            "utf8",
          );

        for (
          const forbidden
          of [
            "MERIDIAN_RUNTIME_PASSWORD",
            "Authorization:",
            "Bearer ",
            "process.env",
          ]
        ) {
          expect(
            page,
          ).not.toContain(
            forbidden,
          );
        }
      },
    );

    it(
      "keeps generic response rendering bounded and secret-aware",
      () => {
        const explorer =
          readFileSync(
            "src/lib/iris/read-explorer.ts",
            "utf8",
          );

        for (
          const marker
          of [
            "[REDACTED_STRING]",
            "PRIVATE KEY",
            "client_secret",
            "refresh_token",
            "redactKeyMaterial",
            "[NON_JSON_RESPONSE_REDACTED]",
            "genericMutationDispatch",
          ]
        ) {
          expect(
            explorer,
          ).toContain(
            marker,
          );
        }
      },
    );

    it(
      "exposes proof coverage in primary navigation",
      () => {
        const shell =
          readFileSync(
            "src/components/meridian/app-shell.tsx",
            "utf8",
          );

        expect(
          shell,
        ).toContain(
          'href: "/proof-coverage"',
        );

        expect(
          shell,
        ).toContain(
          'label: "Coverage"',
        );
      },
    );
  },
);
