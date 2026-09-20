import {
  describe,
  expect,
  it,
} from "vitest";

import {
  ProofEngineError,
} from "./errors";

import {
  canonicalJson,
  digestCanonicalJson,
  sha256Utf8,
} from "./digest";

describe(
  "canonical proof digests",
  () => {
    it(
      "sorts object keys without changing semantic content",
      () => {
        const left =
          canonicalJson({
            beta:
              2,
            alpha:
              1,
          });

        const right =
          canonicalJson({
            alpha:
              1,
            beta:
              2,
          });

        expect(
          left,
        ).toBe(
          "{\"alpha\":1,\"beta\":2}",
        );

        expect(
          left,
        ).toBe(
          right,
        );

        expect(
          digestCanonicalJson({
            beta:
              2,
            alpha:
              1,
          }),
        ).toBe(
          digestCanonicalJson({
            alpha:
              1,
            beta:
              2,
          }),
        );
      },
    );

    it(
      "orders object keys by deterministic UTF-16 code units rather than host locale",
      () => {
        expect(
          canonicalJson({
            "\u03a9":
              4,
            "\u00e9":
              3,
            a:
              2,
            Z:
              1,
          }),
        ).toBe(
          "{\"Z\":1,\"a\":2,\"\u00e9\":3,\"\u03a9\":4}",
        );
      },
    );
    it(
      "preserves array order",
      () => {
        expect(
          digestCanonicalJson([
            "alpha",
            "beta",
          ]),
        ).not.toBe(
          digestCanonicalJson([
            "beta",
            "alpha",
          ]),
        );
      },
    );

    it(
      "normalizes negative zero to zero",
      () => {
        expect(
          canonicalJson(
            -0,
          ),
        ).toBe(
          "0",
        );
      },
    );

    it.each([
      undefined,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      BigInt(
        1,
      ),
      () =>
        "function",
      Symbol(
        "symbol",
      ),
    ])(
      "rejects unsupported canonical value %#",
      (
        value,
      ) => {
        expect(
          () =>
            canonicalJson(
              value,
            ),
        ).toThrow(
          ProofEngineError,
        );
      },
    );

    it(
      "rejects nested undefined instead of silently omitting it",
      () => {
        expect(
          () =>
            canonicalJson({
              nested: {
                value:
                  undefined,
              },
            }),
        ).toThrow(
          "$.nested.value",
        );
      },
    );

    it(
      "rejects non-plain objects",
      () => {
        expect(
          () =>
            canonicalJson(
              new Date(
                "2026-09-20T00:00:00.000Z",
              ),
            ),
        ).toThrow(
          "plain objects",
        );
      },
    );

    it.each([
      "password",
      "clientSecret",
      "access_token",
      "private-key",
      "Authorization",
    ])(
      "rejects secret-bearing proof material field %s",
      (
        field,
      ) => {
        expect(
          () =>
            canonicalJson({
              safe:
                "metadata",
              [field]:
                "must-not-enter-proof-material",
            }),
        ).toThrow(
          "secret-bearing field",
        );
      },
    );

    it(
      "allows non-secret secret metadata such as secretName",
      () => {
        expect(
          canonicalJson({
            secretName:
              "orders-api-key",
            secretType:
              "string",
          }),
        ).toBe(
          "{\"secretName\":\"orders-api-key\",\"secretType\":\"string\"}",
        );
      },
    );

    it(
      "produces uppercase SHA-256",
      () => {
        const digest =
          sha256Utf8(
            "meridian",
          );

        expect(
          digest,
        ).toMatch(
          /^[A-F0-9]{64}$/,
        );
      },
    );

    it(
      "changes when target identity changes",
      () => {
        const base = {
          actionType:
            "USER_REMOVE_ROLE",
          target: {
            canonicalId:
              "user:maya.patel",
          },
        };

        const changed = {
          ...base,
          target: {
            canonicalId:
              "user:other",
          },
        };

        expect(
          digestCanonicalJson(
            base,
          ),
        ).not.toBe(
          digestCanonicalJson(
            changed,
          ),
        );
      },
    );

    it(
      "changes when preflight state changes",
      () => {
        expect(
          digestCanonicalJson({
            enabled:
              true,
          }),
        ).not.toBe(
          digestCanonicalJson({
            enabled:
              false,
          }),
        );
      },
    );

    it(
      "changes when evidence changes",
      () => {
        expect(
          digestCanonicalJson({
            status:
              "PASS",
            observed:
              "role-absent",
          }),
        ).not.toBe(
          digestCanonicalJson({
            status:
              "PASS",
            observed:
              "role-present",
          }),
        );
      },
    );
  },
);
