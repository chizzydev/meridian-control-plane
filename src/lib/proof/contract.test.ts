import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  ProofRequirement,
} from "./evidence";

import {
  PROOF_CONTRACT_SCHEMA_VERSION,
  assertProofContractMetadata,
  assertRequiredAuthority,
  assertTargetIdentity,
  type ProofContract,
} from "./contract";

const CONFIG_PROOF:
  ProofRequirement = {
    requirementId:
      "config-readback",

    plane:
      "CONFIGURATION_READBACK",

    applicability:
      "REQUIRED",

    description:
      "Configured state is re-read.",

    source:
      "IRIS SysAdmin API",
  };

function contractMetadata(
  overrides:
    Partial<
      Pick<
        ProofContract<
          unknown,
          unknown,
          unknown
        >,
        | "schemaVersion"
        | "contractId"
        | "contractVersion"
        | "actionType"
        | "domain"
        | "risk"
        | "reversibility"
        | "requiredAuthority"
        | "proofRequirements"
      >
    > = {},
) {
  return {
    schemaVersion:
      PROOF_CONTRACT_SCHEMA_VERSION,

    contractId:
      "meridian.permission.user-remove-role",

    contractVersion:
      1,

    actionType:
      "USER_REMOVE_ROLE",

    domain:
      "PERMISSIONS" as const,

    risk:
      "MEDIUM" as const,

    reversibility:
      "REVERSIBLE" as const,

    requiredAuthority: [
      {
        resource:
          "%Admin_Secure",
        permission:
          "U",
        standing:
          false,
        escalationOnly:
          true,
      },
    ],

    proofRequirements: [
      CONFIG_PROOF,
    ],

    ...overrides,
  };
}

describe(
  "Proof Contract metadata",
  () => {
    it(
      "accepts explicit bounded action metadata",
      () => {
        expect(
          () =>
            assertProofContractMetadata(
              contractMetadata(),
            ),
        ).not.toThrow();
      },
    );

    it(
      "requires canonical uppercase action types",
      () => {
        expect(
          () =>
            assertProofContractMetadata(
              contractMetadata({
                actionType:
                  "user-remove-role",
              }),
            ),
        ).toThrow(
          "uppercase snake case",
        );
      },
    );

    it(
      "requires a positive contract version",
      () => {
        expect(
          () =>
            assertProofContractMetadata(
              contractMetadata({
                contractVersion:
                  0,
              }),
            ),
        ).toThrow(
          "positive integer",
        );
      },
    );

    it(
      "rejects duplicate authority requirements",
      () => {
        const authority = {
          resource:
            "%Admin_Secure",
          permission:
            "U",
          standing:
            false,
          escalationOnly:
            true,
        };

        expect(
          () =>
            assertProofContractMetadata(
              contractMetadata({
                requiredAuthority: [
                  authority,
                  authority,
                ],
              }),
            ),
        ).toThrow(
          "Duplicate authority requirement",
        );
      },
    );

    it(
      "rejects authority declared as both standing and escalation-only",
      () => {
        expect(
          () =>
            assertRequiredAuthority({
              resource:
                "%Admin_Secure",
              permission:
                "U",
              standing:
                true,
              escalationOnly:
                true,
            }),
        ).toThrow(
          "both standing and escalation-only",
        );
      },
    );

    it(
      "rejects duplicate proof requirement ids",
      () => {
        expect(
          () =>
            assertProofContractMetadata(
              contractMetadata({
                proofRequirements: [
                  CONFIG_PROOF,
                  CONFIG_PROOF,
                ],
              }),
            ),
        ).toThrow(
          "Duplicate proof requirement",
        );
      },
    );

    it(
      "validates each embedded proof requirement",
      () => {
        expect(
          () =>
            assertProofContractMetadata(
              contractMetadata({
                proofRequirements: [
                  {
                    ...CONFIG_PROOF,
                    description:
                      " ",
                  },
                ],
              }),
            ),
        ).toThrow(
          "description is required",
        );
      },
    );

    it(
      "accepts stable target identity with fixture generation",
      () => {
        expect(
          () =>
            assertTargetIdentity({
              kind:
                "USER",
              canonicalId:
                "user:maya.patel",
              displayName:
                "Maya Patel",
              fixtureId:
                "meridian-maya-fixture",
              generation:
                "generation-001",
            }),
        ).not.toThrow();
      },
    );

    it(
      "rejects empty canonical target identity",
      () => {
        expect(
          () =>
            assertTargetIdentity({
              kind:
                "USER",
              canonicalId:
                " ",
              displayName:
                "Maya Patel",
              fixtureId:
                null,
              generation:
                null,
            }),
        ).toThrow(
          "Target canonicalId is required",
        );
      },
    );

    it(
      "allows honest broad underlying authority to be marked escalation-only",
      () => {
        expect(
          () =>
            assertRequiredAuthority({
              resource:
                "%Admin_Operate",
              permission:
                "U",
              standing:
                false,
              escalationOnly:
                true,
            }),
        ).not.toThrow();
      },
    );
  },
);
