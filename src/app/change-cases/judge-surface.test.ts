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
            "Every privileged operation, under proof.",
            "PREFLIGHT",
            "APPLY",
            "REVALIDATE",
            "VERIFIED",
            "Open Change Queue",
            "Inspect Proof Coverage",
            "Exact durable readback",
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
            "Recorded proof-contract cases",
            "Needs review",
            "Ready",
            "Evidence",
            "Verified",
            "Inspect action preflight",
            "Recorded certified receipt",
            "Read-only case evidence",
            "Persistent IRIS history check",
            "exact server-side",
            "receipt-history readback",
            "Receipt + inspection",
            "Exact readback",
            "Inspect case",
          ]
        ) {
          expect(
            queue,
          ).toContain(
            marker,
          );
        }

        const preflight =
          read(
            "src/app/change-cases/new/page.tsx",
          );

        for (
          const marker of [
            "Action preflight",
            "19 semantic actions. Four bounded families.",
            "P01-P06",
            "O01-O03",
            "T01-T06",
            "W01-W04",
            "UNKNOWN_AFTER_DISPATCH",
            "Generic mutation authority: NONE.",
            "Inspect recorded O03 receipt",
            "Different actions, one closure discipline",
            "Contract posture",
          ]
        ) {
          expect(
            preflight,
          ).toContain(
            marker,
          );
        }

        for (
          const forbidden of [
            "CENTERPIECE_CHANGE",
            "Controlled centerpiece mutation",
            "Run authoritative preflight",
            "<button",
          ]
        ) {
          expect(
            preflight,
          ).not.toContain(
            forbidden,
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
            "P04 USER_REMOVE_ROLE",
            "Receipt persistence + exact IRIS readback",
            "binds the native-audit plane",
            "Configured state confirmed",
            "Runtime residue checked",
            'persistent.history.length === 1 ? "history entry" : "history entries"',
            'persistent.history.length === 1 ? "entry" : "entries"',
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

        expect(
          receipt,
        ).not.toContain(
          "Applied and verified",
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
          "Read-only case evidence",
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
            "Recorded certified permissions convergence proof",
            "Isolated synthetic witness",
            "Read-only proof evidence",
            "A permissions change can outlive configuration.",
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
            "LIVE AUTHORITY CONVERGED",
            "Full recorded proof object closure:",
            "convergence alone is not the VERIFIED verdict",
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
