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
            "Six SysAdmin families, explicit current status",
            "Certified action binding",
            "certified semantic actions across",
            "pinned public InterSystems Community SysAdmin API specification",
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
            "organizer-declared",
            "contest families",
            "Release track",
            "not certified at R2",
            "Reserved for R6",
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
      "fits the eight-column operation atlas on desktop while preserving bounded mobile overflow",
      () => {
        const css =
          readFileSync(
            "src/app/proof-coverage/coverage.module.css",
            "utf8",
          );

        for (
          const marker of [
            "table-layout: fixed",
            "min-width: 100%",
            "overflow-wrap: anywhere",
            "@media (max-width: 900px)",
            "min-width: 1180px",
            ".operationTable th:nth-child(8)",
            "width: 5%",
            "table-layout: auto",
          ]
        ) {
          expect(
            css,
          ).toContain(
            marker,
          );
        }

        expect(
          css,
        ).not.toContain(
          "min-width: 1450px",
        );
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
