import {
  describe,
  expect,
  it,
} from "vitest";

import {
  ProofEngineError,
  isProofEngineError,
} from "./errors";

describe(
  "ProofEngineError",
  () => {
    it(
      "preserves a machine-readable code and safe details",
      () => {
        const error =
          new ProofEngineError(
            "SAFETY_BLOCKED",
            "Target safety gate failed.",
            {
              predicateId:
                "fixture-generation",
              attempt:
                3,
              retryable:
                false,
            },
          );

        expect(
          error.name,
        ).toBe(
          "ProofEngineError",
        );

        expect(
          error.code,
        ).toBe(
          "SAFETY_BLOCKED",
        );

        expect(
          error.details,
        ).toEqual({
          predicateId:
            "fixture-generation",
          attempt:
            3,
          retryable:
            false,
        });

        expect(
          isProofEngineError(
            error,
          ),
        ).toBe(
          true,
        );
      },
    );

    it(
      "does not classify ordinary errors as proof-engine errors",
      () => {
        expect(
          isProofEngineError(
            new Error(
              "plain",
            ),
          ),
        ).toBe(
          false,
        );
      },
    );
  },
);
