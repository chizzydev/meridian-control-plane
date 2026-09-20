import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  ProofContract,
} from "./contract";

import {
  PROOF_CONTRACT_SCHEMA_VERSION,
} from "./contract";

import {
  createProofContractRegistry,
  describeProofContract,
  type ProofContractDescriptor,
} from "./registry";

function mockContract(
  overrides: {
    readonly actionType?:
      string;

    readonly contractId?:
      string;

    readonly contractVersion?:
      number;
  } = {},
): ProofContract<
  {
    readonly username:
      string;
  },
  {
    readonly digest:
      string;
  },
  {
    readonly applied:
      boolean;
  }
> {
  return {
    schemaVersion:
      PROOF_CONTRACT_SCHEMA_VERSION,

    contractId:
      overrides.contractId ??
      "meridian.permission.user-remove-role",

    contractVersion:
      overrides.contractVersion ??
      1,

    actionType:
      overrides.actionType ??
      "USER_REMOVE_ROLE",

    domain:
      "PERMISSIONS",

    risk:
      "MEDIUM",

    reversibility:
      "REVERSIBLE",

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
      {
        requirementId:
          "config",

        plane:
          "CONFIGURATION_READBACK",

        applicability:
          "REQUIRED",

        description:
          "Read configuration.",

        source:
          "IRIS",
      },
    ],

    target:
      (
        intent,
      ) => ({
        kind:
          "USER",

        canonicalId:
          `user:${intent.username}`,

        displayName:
          intent.username,

        fixtureId:
          null,

        generation:
          null,
      }),

    preflight:
      async () => ({
        digest:
          "A",
      }),

    expectedDelta:
      () => ({
        summary:
          "remove role",

        before:
          {},

        after:
          {},
      }),

    analyzeImpact:
      async () => ({
        certainty:
          "KNOWN",

        summary:
          "known",

        affectedEntities:
          [],

        limitations:
          [],
      }),

    digestPreflight:
      () =>
        "A".repeat(
          64,
        ),

    revalidate:
      async (
        _context,
        reviewed,
      ) => ({
        outcome:
          "MATCH",

        freshPreflight:
          reviewed.preflight,

        freshDigest:
          reviewed.reviewedPreflightDigest,
      }),

    execute:
      async () => ({
        applied:
          true,
      }),

    reconcileUnknown:
      async () => ({
        outcome:
          "NOT_APPLIED",

        reason:
          "none",
      }),

    verify:
      async () =>
        [],

    buildRecoveryPlan:
      () => ({
        recoveryActionType:
          "USER_ADD_ROLE",

        automatic:
          false,

        summary:
          "reviewed recovery",
      }),
  };
}

describe(
  "Proof Contract registry",
  () => {
    it(
      "derives a frozen descriptor from a validated executable contract",
      () => {
        const descriptor =
          describeProofContract(
            mockContract(),
          );

        expect(
          descriptor,
        ).toEqual({
          schemaVersion:
            "meridian.proof-contract.v2",

          contractId:
            "meridian.permission.user-remove-role",

          contractVersion:
            1,

          actionType:
            "USER_REMOVE_ROLE",

          domain:
            "PERMISSIONS",

          risk:
            "MEDIUM",

          reversibility:
            "REVERSIBLE",

          requiredProofCount:
            1,

          requiredAuthorityCount:
            1,
        });
      },
    );

    it(
      "looks up a frozen defensive copy by action type",
      () => {
        const descriptor =
          describeProofContract(
            mockContract(),
          );

        const registry =
          createProofContractRegistry([
            descriptor,
          ]);

        expect(
          registry.hasActionType(
            "USER_REMOVE_ROLE",
          ),
        ).toBe(
          true,
        );

        const registered =
          registry.getByActionType(
            "USER_REMOVE_ROLE",
          );

        expect(
          registered,
        ).toStrictEqual(
          descriptor,
        );

        expect(
          registered,
        ).not.toBe(
          descriptor,
        );

        expect(
          Object.isFrozen(
            registered,
          ),
        ).toBe(
          true,
        );
      },
    );

    it(
      "rejects duplicate action types",
      () => {
        const first =
          describeProofContract(
            mockContract(),
          );

        const second =
          describeProofContract(
            mockContract({
              contractId:
                "meridian.permission.user-remove-role-v2",
              contractVersion:
                2,
            }),
          );

        expect(
          () =>
            createProofContractRegistry([
              first,
              second,
            ]),
        ).toThrow(
          "Duplicate registered action type",
        );
      },
    );

    it(
      "rejects duplicate contract id/version identities",
      () => {
        const first =
          describeProofContract(
            mockContract(),
          );

        const second =
          describeProofContract(
            mockContract({
              actionType:
                "USER_ADD_ROLE",
            }),
          );

        expect(
          () =>
            createProofContractRegistry([
              first,
              second,
            ]),
        ).toThrow(
          "Duplicate contract id/version",
        );
      },
    );

    it(
      "rejects unknown action lookup",
      () => {
        const registry =
          createProofContractRegistry(
            [],
          );

        expect(
          () =>
            registry.getByActionType(
              "UNKNOWN_ACTION",
            ),
        ).toThrow(
          "Unknown Verified Action type",
        );
      },
    );

    it(
      "rejects malformed hand-authored descriptors",
      () => {
        const invalid = {
          schemaVersion:
            "meridian.proof-contract.v2",

          contractId:
            "bad",

          contractVersion:
            1,

          actionType:
            "BAD_ACTION",

          domain:
            "PERMISSIONS",

          risk:
            "LOW",

          reversibility:
            "REVERSIBLE",

          requiredProofCount:
            0,

          requiredAuthorityCount:
            0,
        } as ProofContractDescriptor;

        expect(
          () =>
            createProofContractRegistry([
              invalid,
            ]),
        ).toThrow(
          "descriptor is invalid",
        );
      },
    );
  },
);
