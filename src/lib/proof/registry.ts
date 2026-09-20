import {
  MANAGEMENT_DOMAINS,
  REVERSIBILITY_CLASSES,
  RISK_CLASSES,
  assertProofContractMetadata,
  type ManagementDomain,
  type ProofContract,
  type ReversibilityClass,
  type RiskClass,
} from "./contract";

import {
  ProofEngineError,
} from "./errors";

export interface ProofContractDescriptor {
  readonly schemaVersion:
    "meridian.proof-contract.v2";

  readonly contractId:
    string;

  readonly contractVersion:
    number;

  readonly actionType:
    string;

  readonly domain:
    ManagementDomain;

  readonly risk:
    RiskClass;

  readonly reversibility:
    ReversibilityClass;

  readonly requiredProofCount:
    number;

  readonly requiredAuthorityCount:
    number;
}

export interface ProofContractRegistry {
  readonly descriptors:
    readonly ProofContractDescriptor[];

  getByActionType(
    actionType:
      string,
  ):
    ProofContractDescriptor;

  hasActionType(
    actionType:
      string,
  ):
    boolean;
}

export function assertProofContractDescriptor(
  descriptor:
    ProofContractDescriptor,
): void {
  if (
    descriptor.schemaVersion !==
      "meridian.proof-contract.v2" ||
    !/^[a-z0-9][a-z0-9._:-]{7,127}$/.test(
      descriptor.contractId,
    ) ||
    !/^[A-Z][A-Z0-9_]{2,63}$/.test(
      descriptor.actionType,
    ) ||
    !Number.isInteger(
      descriptor.contractVersion,
    ) ||
    descriptor.contractVersion <
      1 ||
    !Number.isInteger(
      descriptor.requiredProofCount,
    ) ||
    descriptor.requiredProofCount <
      0 ||
    !Number.isInteger(
      descriptor.requiredAuthorityCount,
    ) ||
    descriptor.requiredAuthorityCount <
      0 ||
    !(
      MANAGEMENT_DOMAINS as readonly string[]
    ).includes(
      descriptor.domain,
    ) ||
    !(
      RISK_CLASSES as readonly string[]
    ).includes(
      descriptor.risk,
    ) ||
    !(
      REVERSIBILITY_CLASSES as readonly string[]
    ).includes(
      descriptor.reversibility,
    )
  ) {
    throw new ProofEngineError(
      "INVALID_CONTRACT",
      "Proof Contract registry descriptor is invalid.",
      {
        actionType:
          descriptor.actionType,
      },
    );
  }
}

export function describeProofContract<
  Intent,
  Preflight,
  Execution,
>(
  contract:
    ProofContract<
      Intent,
      Preflight,
      Execution
    >,
): ProofContractDescriptor {
  assertProofContractMetadata(
    contract,
  );

  return Object.freeze({
    schemaVersion:
      contract.schemaVersion,

    contractId:
      contract.contractId,

    contractVersion:
      contract.contractVersion,

    actionType:
      contract.actionType,

    domain:
      contract.domain,

    risk:
      contract.risk,

    reversibility:
      contract.reversibility,

    requiredProofCount:
      contract.proofRequirements.filter(
        (
          requirement,
        ) =>
          requirement.applicability ===
            "REQUIRED",
      ).length,

    requiredAuthorityCount:
      contract.requiredAuthority.length,
  });
}

export function createProofContractRegistry(
  descriptors:
    readonly ProofContractDescriptor[],
): ProofContractRegistry {
  const byActionType =
    new Map<
      string,
      ProofContractDescriptor
    >();

  const contractVersions =
    new Set<
      string
    >();

  for (
    const descriptor
    of descriptors
  ) {
    assertProofContractDescriptor(
      descriptor,
    );

    const actionType =
      descriptor.actionType;

    if (
      byActionType.has(
        actionType,
      )
    ) {
      throw new ProofEngineError(
        "INVALID_CONTRACT",
        `Duplicate registered action type: ${actionType}.`,
        {
          actionType,
        },
      );
    }

    const versionKey =
      (
        `${descriptor.contractId}@${descriptor.contractVersion}`
      );

    if (
      contractVersions.has(
        versionKey,
      )
    ) {
      throw new ProofEngineError(
        "INVALID_CONTRACT",
        `Duplicate contract id/version: ${versionKey}.`,
        {
          contractVersion:
            versionKey,
        },
      );
    }

    contractVersions.add(
      versionKey,
    );

    byActionType.set(
      actionType,
      Object.freeze({
        ...descriptor,
      }),
    );
  }

  const frozen =
    Object.freeze(
      Array.from(
        byActionType.values(),
      ).sort(
        (
          left,
          right,
        ) =>
          left.actionType.localeCompare(
            right.actionType,
          ),
      ),
    );

  return Object.freeze({
    descriptors:
      frozen,

    getByActionType(
      actionType:
        string,
    ):
      ProofContractDescriptor {
      const descriptor =
        byActionType.get(
          actionType,
        );

      if (
        descriptor ===
          undefined
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          `Unknown Verified Action type: ${actionType}.`,
          {
            actionType,
          },
        );
      }

      return descriptor;
    },

    hasActionType(
      actionType:
        string,
    ):
      boolean {
      return byActionType.has(
        actionType,
      );
    },
  });
}
