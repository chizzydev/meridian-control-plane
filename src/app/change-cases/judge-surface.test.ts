import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";

function read(
  path: string,
): string {
  return readFileSync(
    path,
    "utf8",
  );
}

describe(
  "Meridian judge-visible Change Case surface",
  () => {
    it(
      "turns the home page into the fast path",
      () => {
        const home =
          read(
            "src/app/page.tsx",
          );

        for (
          const marker of [
            "Security changes are not finished when configuration changes.",
            "PRE-FLIGHT",
            "APPLY",
            "CONVERGE",
            "VERIFIED",
            "Open Change Queue",
            "Stage access change",
            "Inspect verified receipt",
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
      "implements the frozen Change Queue lifecycle lanes",
      () => {
        const queue =
          read(
            "src/app/change-cases/page.tsx",
          );

        for (
          const marker of [
            "Change Queue",
            "Needs review",
            "Ready",
            "Converging",
            "Verified",
            "Stage access change",
            "Recorded certified receipt",
            "Read-only demo evidence",
            "Open verified receipt",
          ]
        ) {
          expect(
            queue,
          ).toContain(
            marker,
          );
        }
      },
    );

    it(
      "makes configuration, live access and native audit visibly distinct",
      () => {
        const receipt =
          read(
            "src/app/change-cases/verified/maya-patel-supervisor-removal/page.tsx",
          );

        for (
          const marker of [
            "CONFIGURATION",
            "LIVE ACCESS",
            "Change Receipt",
            "Native Audit",
            "Permission delta",
            "Declared impact",
            "Recorded evidence source",
            "Claim boundary",
          ]
        ) {
          expect(
            receipt,
          ).toContain(
            marker,
          );
        }

        expect(
          receipt,
        ).not.toContain(
          "Kill process",
        );
      },
    );

    it(
      "labels the public receipt as recorded read-only evidence instead of live privileged mutation",
      () => {
        const receipt =
          read(
            "src/app/change-cases/verified/maya-patel-supervisor-removal/page.tsx",
          );

        expect(
          receipt,
        ).toContain(
          "Recorded certified receipt",
        );

        expect(
          receipt,
        ).toContain(
          "Read-only demo evidence",
        );

        expect(
          receipt,
        ).toMatch(
          /does\s+not\s+claim\s+that\s+the\s+public\s+browser\s+owns\s+privileged\s+IRIS\s+mutation\s+authority/,
        );

        expect(
          receipt,
        ).toMatch(
          /IRIS-backed\s+receipt\s+history\s+has\s+already\s+been\s+productized/,
        );
      },
    );
  },
);