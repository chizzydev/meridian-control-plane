import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildReadExplorerPlan,
  selectReadAuthority,
} from "./explorer";

import {
  findSysAdminOperation,
} from "./manifest";

function operation(
  id:
    string,
) {
  const value =
    findSysAdminOperation(
      id,
    );

  if (
    value ===
      null
  ) {
    throw new Error(
      `Missing operation ${id}.`,
    );
  }

  return value;
}

describe(
  "bounded same-instance read explorer plan",
  () => {
    it(
      "routes approved read families through existing narrow server-owned authority",
      () => {
        expect(
          selectReadAuthority(
            operation(
              "GET /v2/tasks",
            ),
          ),
        ).toBe(
          "MeridianTaskMetadataReader",
        );

        expect(
          selectReadAuthority(
            operation(
              "GET /v2/security/users",
            ),
          ),
        ).toBe(
          "MeridianSecurityMetadataReader",
        );

        expect(
          selectReadAuthority(
            operation(
              "GET /v2/monitor/system-usage",
            ),
          ),
        ).toBe(
          "MeridianSystemMetadataReader",
        );

        expect(
          selectReadAuthority(
            operation(
              "GET /info",
            ),
          ),
        ).toBe(
          "STANDING_RUNTIME",
        );
      },
    );

    it(
      "keeps unsupported authority visible without inventing a broader runtime role",
      () => {
        expect(
          selectReadAuthority(
            operation(
              "GET /v2/databases",
            ),
          ),
        ).toBe(
          "MeridianSystemMetadataReader",
        );

        const plan =
          buildReadExplorerPlan({
            operationId:
              "GET /v2/database",
            requestMethod:
              "GET",
            rawQuery: {
              name:
                "IRISSYS",
            },
          });

        expect(
          plan.capability,
        ).toBe(
          "UNAVAILABLE_RUNTIME",
        );

        expect(
          plan.authorityMode,
        ).toBeNull();
      },
    );

    it(
      "rejects generic mutation dispatch",
      () => {
        expect(
          () =>
            buildReadExplorerPlan({
              operationId:
                "PUT /v2/security/user",
              requestMethod:
                "GET",
              rawQuery: {},
            }),
        ).toThrow(
          "declared GET",
        );
      },
    );

    it(
      "rejects unknown query parameters and requires declared required parameters",
      () => {
        expect(
          () =>
            buildReadExplorerPlan({
              operationId:
                "GET /v2/database",
              requestMethod:
                "GET",
              rawQuery: {
                arbitrary:
                  "USER",
              },
            }),
        ).toThrow(
          "unknown query parameter",
        );

        expect(
          () =>
            buildReadExplorerPlan({
              operationId:
                "GET /v2/database",
              requestMethod:
                "GET",
              rawQuery: {},
            }),
        ).toThrow(
          "requires query parameter: name",
        );
      },
    );

    it(
      "permits only declared HEAD companions and bounded OPTIONS on known paths",
      () => {
        expect(
          buildReadExplorerPlan({
            operationId:
              "HEAD /v2/security/sql-admin-privilege",
            requestMethod:
              "HEAD",
            rawQuery: {
              privilege:
                "%CREATE_TABLE",
              grantee:
                "meridian.runtime",
              namespace:
                "USER",
            },
          }).requestMethod,
        ).toBe(
          "HEAD",
        );

        expect(
          buildReadExplorerPlan({
            operationId:
              "GET /info",
            requestMethod:
              "OPTIONS",
            rawQuery: {},
          }).requestMethod,
        ).toBe(
          "OPTIONS",
        );
      },
    );
  },
);
