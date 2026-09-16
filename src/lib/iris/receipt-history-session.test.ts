import {
  readFileSync,
} from "node:fs";

import {
  join,
} from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";

const source =
  readFileSync(
    join(
      process.cwd(),
      "src",
      "lib",
      "iris",
      "receipt-history-session.ts",
    ),
    "utf8",
  );

describe(
  "server-only persistent IRIS history session adapter",
  () => {
    it(
      "keeps the entire adapter behind the server-only boundary",
      () => {
        expect(
          source,
        ).toContain(
          'import "server-only";',
        );

        expect(
          source,
        ).not.toContain(
          '"use client"',
        );

        expect(
          source,
        ).not.toContain(
          "'use client'",
        );

        expect(
          source,
        ).not.toContain(
          "NEXT_PUBLIC_",
        );
      },
    );

    it(
      "sources the runtime password only from a private server environment variable",
      () => {
        expect(
          source,
        ).toContain(
          "MERIDIAN_IRIS_RUNTIME_PASSWORD",
        );

        expect(
          source,
        ).toContain(
          "process.env[name]",
        );

        expect(
          source,
        ).toContain(
          "requiredRuntimeSecret",
        );

        expect(
          source,
        ).not.toMatch(
          /password\s*:\s*["'][^"']+["']/,
        );
      },
    );

    it(
      "opens one authenticated server session and always logs it out",
      () => {
        expect(
          source.match(
            /\bloginIris\s*\(/g,
          )?.length,
        ).toBe(
          1,
        );

        expect(
          source,
        ).toContain(
          "finally",
        );

        expect(
          source.match(
            /\blogoutIris\s*\(/g,
          )?.length,
        ).toBe(
          1,
        );
      },
    );

    it(
      "exposes read-only persistent receipt and user-history reads",
      () => {
        expect(
          source,
        ).toContain(
          "readVerifiedReceiptHistory",
        );

        expect(
          source,
        ).toContain(
          "readUserReceiptHistory",
        );

        expect(
          source,
        ).toContain(
          '"PERSISTENT_IRIS"',
        );

        expect(
          source,
        ).not.toContain(
          "persistVerifiedReceiptHistory",
        );

        expect(
          source,
        ).not.toMatch(
          /\bfetch\s*\(/,
        );
      },
    );

    it(
      "reconciles the exact receipt with the user-history summary before returning judge data",
      () => {
        expect(
          source,
        ).toContain(
          "receipt.username !==",
        );

        expect(
          source,
        ).toContain(
          "matching.length !==",
        );

        expect(
          source,
        ).toContain(
          "matching[0].receiptSha256 !==",
        );

        expect(
          source,
        ).toContain(
          "Object.freeze",
        );
      },
    );

    it(
      "contains no mutation or process-control primitive",
      () => {
        expect(
          source,
        ).not.toMatch(
          /\bPOST\b/,
        );

        expect(
          source,
        ).not.toMatch(
          /\bAddRoles\b|\bRemoveRoles\b/,
        );

        expect(
          source,
        ).not.toMatch(
          /\bkill\s+process\b/i,
        );

        expect(
          source,
        ).not.toContain(
          "Security.",
        );
      },
    );
  },
);