import {
  describe,
  expect,
  it,
} from "vitest";

import {
  evaluateProofClosure,
  type ProofRequirement,
  type ProofResult,
} from "./evidence";

const CONFIG_REQUIREMENT:
  ProofRequirement =
  Object.freeze({
    requirementId:
      "config-readback",

    plane:
      "CONFIGURATION_READBACK",

    applicability:
      "REQUIRED",

    description:
      "Configured state matches intended state.",

    source:
      "IRIS SysAdmin API",
  });

const AUDIT_REQUIREMENT:
  ProofRequirement =
  Object.freeze({
    requirementId:
      "native-audit",

    plane:
      "NATIVE_AUDIT",

    applicability:
      "OPTIONAL",

    description:
      "Bind native audit evidence when the action emits a relevant event.",

    source:
      "IRIS native audit",
  });

const NOT_APPLICABLE_REQUIREMENT:
  ProofRequirement =
  Object.freeze({
    requirementId:
      "task-history",

    plane:
      "TASK_HISTORY",

    applicability:
      "NOT_APPLICABLE",

    description:
      "Task history does not apply to this action.",

    source:
      "IRIS Task Manager",
  });

function proofResult(
  overrides:
    Partial<ProofResult> = {},
): ProofResult {
  return {
    requirementId:
      "config-readback",

    plane:
      "CONFIGURATION_READBACK",

    applicability:
      "REQUIRED",

    status:
      "PASS",

    sourceType:
      "IRIS SysAdmin API",

    sourceReference:
      "/api/admin/v2/security/user",

    observedAtUtc:
      "2026-09-20T14:00:00.000Z",

    expectedSummary:
      "Role is absent.",

    observedSummary:
      "Role is absent.",

    provenance:
      "AUTHORITATIVE_IRIS",

    safeEvidenceDigest:
      "A".repeat(
        64,
      ),

    ...overrides,
  };
}

describe(
  "Proof evidence closure",
  () => {
    it(
      "closes only when every REQUIRED requirement is PASS",
      () => {
        const evaluation =
          evaluateProofClosure(
            [
              CONFIG_REQUIREMENT,
            ],
            [
              proofResult(),
            ],
          );

        expect(
          evaluation.satisfied,
        ).toBe(
          true,
        );

        expect(
          evaluation.blockingRequirementIds,
        ).toEqual(
          [],
        );
      },
    );

    it.each([
      "PENDING",
      "FAIL",
      "MISSING",
      "UNKNOWN",
    ] as const)(
      "blocks closure when REQUIRED evidence is %s",
      (
        status,
      ) => {
        const observedAtUtc =
          status ===
            "PENDING"
            ? null
            : "2026-09-20T14:00:00.000Z";

        const evaluation =
          evaluateProofClosure(
            [
              CONFIG_REQUIREMENT,
            ],
            [
              proofResult({
                status,
                observedAtUtc,
              }),
            ],
          );

        expect(
          evaluation.satisfied,
        ).toBe(
          false,
        );

        expect(
          evaluation.blockingRequirementIds,
        ).toEqual([
          "config-readback",
        ]);
      },
    );

    it(
      "blocks closure when REQUIRED evidence has no result",
      () => {
        const evaluation =
          evaluateProofClosure(
            [
              CONFIG_REQUIREMENT,
            ],
            [],
          );

        expect(
          evaluation,
        ).toEqual({
          satisfied:
            false,

          blockingRequirementIds: [
            "config-readback",
          ],
        });
      },
    );

    it(
      "allows OPTIONAL evidence to be missing without inventing success",
      () => {
        const evaluation =
          evaluateProofClosure(
            [
              CONFIG_REQUIREMENT,
              AUDIT_REQUIREMENT,
            ],
            [
              proofResult(),

              proofResult({
                requirementId:
                  "native-audit",

                plane:
                  "NATIVE_AUDIT",

                applicability:
                  "OPTIONAL",

                status:
                  "MISSING",

                sourceType:
                  "IRIS native audit",

                sourceReference:
                  null,

                expectedSummary:
                  "Relevant native audit event if available.",

                observedSummary:
                  "No relevant native audit event was available.",

                provenance:
                  "AUTHORITATIVE_IRIS",
              }),
            ],
          );

        expect(
          evaluation.satisfied,
        ).toBe(
          true,
        );
      },
    );

    it(
      "requires explicit NOT_APPLICABLE representation",
      () => {
        const absent =
          evaluateProofClosure(
            [
              CONFIG_REQUIREMENT,
              NOT_APPLICABLE_REQUIREMENT,
            ],
            [
              proofResult(),
            ],
          );

        expect(
          absent.satisfied,
        ).toBe(
          false,
        );

        const explicit =
          evaluateProofClosure(
            [
              CONFIG_REQUIREMENT,
              NOT_APPLICABLE_REQUIREMENT,
            ],
            [
              proofResult(),

              proofResult({
                requirementId:
                  "task-history",

                plane:
                  "TASK_HISTORY",

                applicability:
                  "NOT_APPLICABLE",

                status:
                  "NOT_APPLICABLE",

                sourceType:
                  "IRIS Task Manager",

                sourceReference:
                  null,

                observedAtUtc:
                  null,

                expectedSummary:
                  "Task history does not apply.",

                observedSummary:
                  "Not applicable by contract.",

                provenance:
                  "NOT_APPLICABLE",

                safeEvidenceDigest:
                  null,
              }),
            ],
          );

        expect(
          explicit.satisfied,
        ).toBe(
          true,
        );
      },
    );

    it(
      "rejects NOT_APPLICABLE as a disguise for REQUIRED evidence",
      () => {
        expect(
          () =>
            evaluateProofClosure(
              [
                CONFIG_REQUIREMENT,
              ],
              [
                proofResult({
                  status:
                    "NOT_APPLICABLE",

                  provenance:
                    "NOT_APPLICABLE",

                  observedAtUtc:
                    null,

                  safeEvidenceDigest:
                    null,
                }),
              ],
            ),
        ).toThrow(
          "NOT_APPLICABLE status and applicability must agree",
        );
      },
    );

    it(
      "rejects duplicate requirement ids",
      () => {
        expect(
          () =>
            evaluateProofClosure(
              [
                CONFIG_REQUIREMENT,
                CONFIG_REQUIREMENT,
              ],
              [],
            ),
        ).toThrow(
          "Duplicate proof requirement id",
        );
      },
    );

    it(
      "rejects duplicate result ids",
      () => {
        expect(
          () =>
            evaluateProofClosure(
              [
                CONFIG_REQUIREMENT,
              ],
              [
                proofResult(),
                proofResult(),
              ],
            ),
        ).toThrow(
          "Duplicate proof result id",
        );
      },
    );

    it(
      "rejects results that were not declared by the contract",
      () => {
        expect(
          () =>
            evaluateProofClosure(
              [],
              [
                proofResult(),
              ],
            ),
        ).toThrow(
          "Unexpected proof result",
        );
      },
    );

    it(
      "rejects a result whose plane differs from its requirement",
      () => {
        expect(
          () =>
            evaluateProofClosure(
              [
                CONFIG_REQUIREMENT,
              ],
              [
                proofResult({
                  plane:
                    "LIVE_RUNTIME",
                }),
              ],
            ),
        ).toThrow(
          "does not match requirement contract",
        );
      },
    );

    it(
      "rejects observed evidence without an observation timestamp",
      () => {
        expect(
          () =>
            evaluateProofClosure(
              [
                CONFIG_REQUIREMENT,
              ],
              [
                proofResult({
                  observedAtUtc:
                    null,
                }),
              ],
            ),
        ).toThrow(
          "requires an observation timestamp",
        );
      },
    );
  },
);
