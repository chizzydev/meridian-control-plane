import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildDurableChangeCaseEventMutation,
  createLiveDemoDurableChangeCase,
} from "../change-case/durable-change-case";

import {
  buildDurableChangeCaseAppendPlan,
  buildDurableChangeCaseCreatePlan,
  buildDurableChangeCaseEventsReadPlan,
  buildDurableChangeCaseReadPlan,
} from "./change-case-history-transport";

describe(
  "durable Change Case history transport plan",
  () => {
    const record =
      createLiveDemoDurableChangeCase({
        caseId:
          "a4a-transport-case-001",

        expectedFixtureGeneration:
          "a4a-transport-generation",

        nowUtc:
          "2026-09-17T20:00:00.000Z",
      });

    it(
      "uses only the dedicated history application case paths",
      () => {
        expect(
          buildDurableChangeCaseCreatePlan(
            record,
          ),
        ).toMatchObject({
          method:
            "POST",

          path:
            "/cases",
        });

        expect(
          buildDurableChangeCaseReadPlan(
            record.caseId,
          ),
        ).toEqual({
          method:
            "GET",

          path:
            "/cases/a4a-transport-case-001",
        });

        expect(
          buildDurableChangeCaseEventsReadPlan(
            record.caseId,
          ),
        ).toEqual({
          method:
            "GET",

          path:
            "/cases/a4a-transport-case-001/events",
        });
      },
    );

    it(
      "URL-encodes opaque case ids before crossing the server-only history boundary",
      () => {
        expect(
          buildDurableChangeCaseReadPlan(
            "case / refresh",
          ).path,
        ).toBe(
          "/cases/case%20%2F%20refresh",
        );

        expect(
          buildDurableChangeCaseEventsReadPlan(
            "case / refresh",
          ).path,
        ).toBe(
          "/cases/case%20%2F%20refresh/events",
        );
      },
    );

    it(
      "appends with optimistic concurrency and a full server-owned next record",
      () => {
        const mutation =
          buildDurableChangeCaseEventMutation(
            record,
            1,
            {
              expectedVersion:
                1,

              eventType:
                "PREFLIGHT_COMPLETED",

              nextState:
                "PREFLIGHTED",

              occurredAtUtc:
                "2026-09-17T20:00:01.000Z",

              detailJson:
                '{"proof":"server-owned"}',
            },
          );

        const plan =
          buildDurableChangeCaseAppendPlan(
            mutation,
          );

        expect(
          plan,
        ).toMatchObject({
          method:
            "POST",

          path:
            "/cases/a4a-transport-case-001/events",

          body: {
            expectedVersion:
              1,

            eventType:
              "PREFLIGHT_COMPLETED",

            record: {
              version:
                2,

              state:
                "PREFLIGHTED",
            },
          },
        });
      },
    );

    it(
      "does not expose credential, bearer-token, PID, helper-path, or mutation-primitive fields",
      () => {
        const createJson =
          JSON.stringify(
            buildDurableChangeCaseCreatePlan(
              record,
            ).body,
          );

        for (
          const forbidden
          of [
            "password",
            "accessToken",
            "bearer",
            "pid",
            "helperPath",
            "mutationPrimitive",
            "maya.patel",
          ]
        ) {
          expect(
            createJson,
          ).not.toContain(
            forbidden,
          );
        }
      },
    );
  },
);
