import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  findFixtureRoleRemovalAuditOnce,
} from "./native-userchange-audit";

function row(
  overrides?: {
    readonly auditIndex?:
      number;

    readonly pid?:
      number;

    readonly description?:
      string;

    readonly eventData?:
      string;
  },
) {
  return {
    systemID:
      "a88ee4007559:IRIS",

    auditIndex:
      overrides?.auditIndex ??
      1001,

    utcTimeStamp:
      "2026-09-18 01:00:00.250",

    eventSource:
      "%System",

    eventType:
      "%Security",

    event:
      "UserChange",

    pid:
      overrides?.pid ??
      812,

    username:
      "meridian.runtime",

    description:
      overrides?.description ??
      "Modify User meridian.demo.witness",

    eventData:
      overrides?.eventData ??
      "Modify User: meridian.demo.witness\n\nRoles modified:\n  New value: MeridianEmployee,MeridianDemoNativeTransport\n  Old value: MeridianEmployee,MeridianSupervisor,MeridianDemoNativeTransport\n",

    namespace:
      "%SYS",

    roles:
      "MeridianControlPlaneRuntime,MeridianControlPlaneHelperExecution",

    authentication:
      "Password",

    status:
      "",
  };
}

function response(
  rows:
    unknown[],
  requestedAuditPid =
    "",
): Response {
  return new Response(
    JSON.stringify({
      ok:
        1,

      executeOK:
        1,

      actor:
        "meridian.runtime",

      pid:
        "999",

      auditTransportVersion:
        "health-v1",

      requestedAuditPid,

      eventSource:
        "%System",

      eventType:
        "%Security",

      event:
        "UserChange",

      usernameFilter:
        "meridian.runtime",

      rows,

      rowCount:
        rows.length,

      maxAuditIndex:
        rows.length >
          0
          ? 1001
          : 0,
    }),
    {
      status:
        200,

      headers: {
        "Content-Type":
          "application/json",
      },
    },
  );
}

describe(
  "native UserChange audit binding",
  () => {
    it(
      "binds exactly one fixture role-removal row then independently rebinds it through ListByPid",
      async () => {
        const matching =
          row();

        const fetchImpl =
          vi.fn(
            async (
              input:
                string |
                URL |
                Request,
            ) => {
              const url =
                String(
                  input,
                );

              if (
                url.includes(
                  "auditPid=812",
                )
              ) {
                return response(
                  [
                    matching,
                  ],
                  "812",
                );
              }

              return response(
                [
                  matching,
                ],
              );
            },
          );

        const binding =
          await findFixtureRoleRemovalAuditOnce({
            helperBaseUrl:
              "http://localhost/meridian-control-plane-internal",

            accessToken:
              "token",

            applyStartedAtUtc:
              "2026-09-18T01:00:00.000Z",

            fetchImpl:
              fetchImpl as
                typeof fetch,
          });

        expect(
          binding,
        ).toMatchObject({
          auditTransportVersion:
            "health-v1",

          auditIndex:
            1001,

          pid:
            812,

          username:
            "meridian.runtime",

          targetUsername:
            "meridian.demo.witness",

          targetRole:
            "MeridianSupervisor",

          targetBound:
            true,

          roleRemovalBound:
            true,

          pidRebound:
            true,
        });

        expect(
          fetchImpl,
        ).toHaveBeenCalledTimes(
          2,
        );
      },
    );

    it(
      "accepts the health-v1 digit-string PID shape and normalizes it to an integer",
      async () => {
        const matching = {
          ...row(),
          pid:
            "812",
        };

        const fetchImpl =
          vi.fn(
            async (
              input:
                string |
                URL |
                Request,
            ) => {
              const url =
                String(
                  input,
                );

              if (
                url.includes(
                  "auditPid=812",
                )
              ) {
                return response(
                  [
                    matching,
                  ],
                  "812",
                );
              }

              return response(
                [
                  matching,
                ],
              );
            },
          );

        const binding =
          await findFixtureRoleRemovalAuditOnce({
            helperBaseUrl:
              "http://localhost/meridian-control-plane-internal",

            accessToken:
              "token",

            applyStartedAtUtc:
              "2026-09-18T01:00:00.000Z",

            fetchImpl:
              fetchImpl as
                typeof fetch,
          });

        expect(
          binding,
        ).toMatchObject({
          auditIndex:
            1001,

          pid:
            812,

          pidRebound:
            true,
        });

        expect(
          fetchImpl,
        ).toHaveBeenCalledTimes(
          2,
        );
      },
    );

    it(
      "does not bind Create User or a row without the removed target role",
      async () => {
        const fetchImpl =
          vi.fn(
            async () =>
              response([
                row({
                  description:
                    "Create User meridian.demo.witness",

                  eventData:
                    "Create User: meridian.demo.witness\nRoles: MeridianSupervisor",
                }),
              ]),
          );

        const binding =
          await findFixtureRoleRemovalAuditOnce({
            helperBaseUrl:
              "http://localhost/meridian-control-plane-internal",

            accessToken:
              "token",

            applyStartedAtUtc:
              "2026-09-18T01:00:00.000Z",

            fetchImpl:
              fetchImpl as
                typeof fetch,
          });

        expect(
          binding,
        ).toBeNull();

        expect(
          fetchImpl,
        ).toHaveBeenCalledTimes(
          1,
        );
      },
    );

    it(
      "fails closed when more than one native row satisfies the exact removal predicate",
      async () => {
        const fetchImpl =
          vi.fn(
            async () =>
              response([
                row({
                  auditIndex:
                    1001,
                }),
                row({
                  auditIndex:
                    1002,
                }),
              ]),
          );

        await expect(
          findFixtureRoleRemovalAuditOnce({
            helperBaseUrl:
              "http://localhost/meridian-control-plane-internal",

            accessToken:
              "token",

            applyStartedAtUtc:
              "2026-09-18T01:00:00.000Z",

            fetchImpl:
              fetchImpl as
                typeof fetch,
          }),
        ).rejects.toThrow(
          "Native audit binding is ambiguous",
        );
      },
    );
  },
);
