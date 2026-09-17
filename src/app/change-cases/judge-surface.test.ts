import { renderToStaticMarkup } from "react-dom/server";
import { AuthorizationProofSurface } from "./authorization-proof-surface";

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
            "Persistent IRIS history check",
            "live server-side IRIS",
            "static and credential-free",
            "Open verified receipt + IRIS history",
          ]
        ) {
          expect(
            queue,
          ).toContain(
            marker,
          );
        }

        for (
          const forbidden of [
            "readPersistentJudgeHistory",
            "process.env",
            '"force-dynamic"',
            "fetch(",
            "Authorization:",
            "Bearer ",
          ]
        ) {
          expect(
            queue,
          ).not.toContain(
            forbidden,
          );
        }},
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
      "keeps the verified receipt read-only while wiring persistent IRIS history server-side",
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
        ).toContain(
          "Persistent IRIS history live",
        );

        expect(
          receipt,
        ).toContain(
          "readPersistentJudgeHistory",
        );

        expect(
          receipt,
        ).toContain(
          'export const dynamic =',
        );

        expect(
          receipt,
        ).toContain(
          '"force-dynamic"',
        );

        expect(
          receipt,
        ).toContain(
          "Persistent IRIS history unavailable",
        );

        expect(
          receipt,
        ).toContain(
          "Exact canonical receipt match: PASS",
        );

        expect(
          receipt,
        ).not.toContain(
          "NEXT_PUBLIC_",
        );

        expect(
          receipt,
        ).not.toContain(
          "fetch(",
        );
      },
    );
  },
);
describe(
  "Meridian certified authorization-convergence proof surface",
  () => {
    it(
      "makes the certified stale-to-converged proof understandable in five seconds",
      () => {
        const queue =
          read(
            "src/app/change-cases/page.tsx",
          );

        const proof =
          renderToStaticMarkup(
            AuthorizationProofSurface(),
          );

        expect(
          queue,
        ).toContain(
          "<AuthorizationProofSurface />",
        );

        for (
          const marker of [
            "Recorded certified convergence proof",
            "Isolated synthetic witness",
            "Read-only proof evidence",
            "Security changes are not finished when configuration changes.",
            "Configuration changed. Live authority did not.",
            "EXPECTED",
            "CONFIGURED",
            "LIVE",
            "NOT VERIFIED",
            "LIVE AUTHORITY HAS NOT CONVERGED",
            "171402",
            "173081",
            "Old stale PID gone",
            "Fresh PID",
            "VERIFIED",
            "CONFIGURED AND LIVE AUTHORIZATION CONVERGED",
            "not a live privileged browser mutation session",
          ]
        ) {
          expect(
            proof,
          ).toContain(
            marker,
          );
        }
      },
    );

    it(
      "uses the pure closure derivation instead of hand-labeling verification state",
      () => {
        const proof =
          read(
            "src/app/change-cases/authorization-proof-surface.tsx",
          );

        expect(
          proof,
        ).toContain(
          "deriveAuthorizationProof",
        );

        expect(
          proof,
        ).toContain(
          "verificationPresentation",
        );

        expect(
          proof,
        ).toContain(
          "staleResult.state",
        );

        expect(
          proof,
        ).toContain(
          "freshResult.state",
        );
      },
    );

    it(
      "keeps the judge proof surface read-only",
      () => {
        const proof =
          read(
            "src/app/change-cases/authorization-proof-surface.tsx",
          );

        expect(
          proof,
        ).not.toContain(
          "fetch(",
        );

        expect(
          proof,
        ).not.toContain(
          "RemoveRoles",
        );

        expect(
          proof,
        ).not.toContain(
          "AddRoles",
        );

        expect(
          proof,
        ).not.toContain(
          "Kill process",
        );
      },
    );
  },
);