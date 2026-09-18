import {
  readFileSync,
} from "node:fs";

import {
  resolve,
} from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";

const root =
  process.cwd();

function read(
  relative:
    string,
): string {
  return readFileSync(
    resolve(
      root,
      relative,
    ),
    "utf8",
  ).replace(
    /\r\n/g,
    "\n",
  );
}

describe(
  "A9B portable reproducibility surface",
  () => {
    it(
      "freezes the exact five server runtime environment names without a committed password",
      () => {
        const lines =
          read(
            ".env.example",
          )
            .split(
              "\n",
            )
            .map(
              (line) =>
                line.trim(),
            )
            .filter(
              (line) =>
                line.length >
                  0 &&
                !line.startsWith(
                  "#",
                ),
            );

        const names =
          lines
            .map(
              (line) =>
                line.split(
                  "=",
                  1,
                )[0],
            )
            .sort();

        expect(
          names,
        ).toEqual(
          [
            "MERIDIAN_IRIS_API_BASE_URL",
            "MERIDIAN_IRIS_HELPER_BASE_URL",
            "MERIDIAN_IRISPYTHON_EXECUTABLE",
            "MERIDIAN_RUNTIME_PASSWORD",
            "MERIDIAN_RUNTIME_USERNAME",
          ].sort(),
        );

        expect(
          lines.find(
            (line) =>
              line.startsWith(
                "MERIDIAN_RUNTIME_PASSWORD=",
              ),
          ),
        ).toBe(
          "MERIDIAN_RUNTIME_PASSWORD=",
        );
      },
    );

    it(
      "pins the certified IRIS DBAPI package",
      () => {
        expect(
          read(
            "requirements-iris.txt",
          ).trim(),
        ).toBe(
          "intersystems-irispython==5.4.0",
        );
      },
    );

    it(
      "removes the developer inspection path from the product fixture CLI",
      () => {
        const source =
          read(
            "scripts/iris-demo-fixture-control.mts",
          );

        expect(
          source,
        ).toContain(
          "MERIDIAN_IRISPYTHON_EXECUTABLE",
        );

        expect(
          source,
        ).toContain(
          '".venv-iris"',
        );

        expect(
          source,
        ).not.toContain(
          "intersystems-inspections",
        );

        expect(
          source,
        ).not.toContain(
          "s1a-native-sdk-venv",
        );
      },
    );

    it(
      "exposes setup, readiness, bounded cycle, and safe start commands",
      () => {
        const pkg =
          JSON.parse(
            read(
              "package.json",
            ),
          ) as {
            scripts:
              Record<
                string,
                string
              >;
          };

        expect(
          Object.keys(
            pkg.scripts,
          ),
        ).toEqual(
          expect.arrayContaining(
            [
              "demo:setup:check",
              "demo:setup",
              "demo:readiness",
              "demo:cycle",
              "demo:start",
            ],
          ),
        );

        const wrapper =
          read(
            "scripts/meridian-repro.ps1",
          );

        expect(
          wrapper,
        ).toContain(
          "Read-Host",
        );

        expect(
          wrapper,
        ).toContain(
          "-AsSecureString",
        );

        expect(
          wrapper,
        ).toContain(
          "MERIDIAN_REPRO_PASSWORD_FILE_CREATED=NO",
        );

        expect(
          wrapper,
        ).toContain(
          "MERIDIAN_REPRO_PASSWORD_COMMANDLINE_USED=NO",
        );

        expect(
          wrapper,
        ).toContain(
          "MERIDIAN_REPRO_START_PASSWORD_CHILD_ENV_ONLY=YES",
        );

        expect(
          wrapper,
        ).toContain(
          "MERIDIAN_REPRO_IRIS_DECLARATIVE_BOOTSTRAP=PENDING_B1B2",
        );
      },
    );
  },
);