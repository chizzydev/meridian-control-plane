import {
  assertProofRequirement,
  type ProofRequirement,
  type ProofResult,
} from "./evidence";

import {
  ProofEngineError,
} from "./errors";

export const PROOF_CONTRACT_SCHEMA_VERSION =
  "meridian.proof-contract.v2" as const;

export const MANAGEMENT_DOMAINS =
  Object.freeze([
    "PERMISSIONS",
    "WEB_REST",
    "SECURITY_SECRETS",
    "TASKS",
    "SYSTEM_PROCESSES",
  ] as const);

export type ManagementDomain =
  (typeof MANAGEMENT_DOMAINS)[number];

export const RISK_CLASSES =
  Object.freeze([
    "LOW",
    "MEDIUM",
    "HIGH",
  ] as const);

export type RiskClass =
  (typeof RISK_CLASSES)[number];

export const REVERSIBILITY_CLASSES =
  Object.freeze([
    "REVERSIBLE",
    "COMPENSATABLE",
    "IRREVERSIBLE",
    "MANUAL_RECOVERY",
  ] as const);

export type ReversibilityClass =
  (typeof REVERSIBILITY_CLASSES)[number];

export const IMPACT_CERTAINTIES =
  Object.freeze([
    "KNOWN",
    "PARTIAL",
    "UNKNOWN",
  ] as const);

export type ImpactCertainty =
  (typeof IMPACT_CERTAINTIES)[number];

export interface RequiredAuthority {
  readonly resource:
    string;

  readonly permission:
    string;

  readonly standing:
    boolean;

  readonly escalationOnly:
    boolean;
}

export interface TargetIdentity {
  readonly kind:
    string;

  readonly canonicalId:
    string;

  readonly displayName:
    string;

  readonly fixtureId:
    string | null;

  readonly generation:
    string | null;
}

export interface ImpactEntity {
  readonly kind:
    string;

  readonly canonicalId:
    string;

  readonly displayName:
    string;

  readonly effect:
    string;
}

export interface ImpactAssessment {
  readonly certainty:
    ImpactCertainty;

  readonly summary:
    string;

  readonly affectedEntities:
    readonly ImpactEntity[];

  readonly limitations:
    readonly string[];
}

export interface ExpectedDelta {
  readonly summary:
    string;

  readonly before:
    Readonly<Record<string, unknown>>;

  readonly after:
    Readonly<Record<string, unknown>>;
}

export interface ActionContext {
  readonly actionId:
    string;

  readonly logicalActor:
    string;

  readonly irisRuntimeUser:
    string;

  readonly nowUtc:
    string;
}

export interface ReviewedAction<
  Intent,
  Preflight,
> {
  readonly intent:
    Intent;

  readonly preflight:
    Preflight;

  readonly reviewedPreflightDigest:
    string;
}

export interface ReadyAction<
  Intent,
  Preflight,
> extends ReviewedAction<
    Intent,
    Preflight
  > {
  readonly freshRevalidationDigest:
    string;
}

export type RevalidationDecision<
  Preflight,
> =
  | Readonly<{
      outcome:
        "MATCH";

      freshPreflight:
        Preflight;

      freshDigest:
        string;
    }>
  | Readonly<{
      outcome:
        "STALE";

      freshPreflight:
        Preflight;

      freshDigest:
        string;

      reason:
        string;
    }>
  | Readonly<{
      outcome:
        "DENIED";

      freshPreflight:
        Preflight | null;

      freshDigest:
        string | null;

      reason:
        string;
    }>;

export type ReconciliationDecision<
  Execution,
> =
  | Readonly<{
      outcome:
        "APPLIED";

      execution:
        Execution;
    }>
  | Readonly<{
      outcome:
        "NOT_APPLIED";

      reason:
        string;
    }>
  | Readonly<{
      outcome:
        "STILL_UNKNOWN";

      reason:
        string;
    }>;

export interface RecoveryPlan {
  readonly recoveryActionType:
    string | null;

  readonly automatic:
    false;

  readonly summary:
    string;
}

export interface ProofContract<
  Intent,
  Preflight,
  Execution,
> {
  readonly schemaVersion:
    typeof PROOF_CONTRACT_SCHEMA_VERSION;

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

  readonly requiredAuthority:
    readonly RequiredAuthority[];

  readonly proofRequirements:
    readonly ProofRequirement[];

  target(
    intent:
      Intent,
  ):
    TargetIdentity;

  preflight(
    context:
      ActionContext,
    intent:
      Intent,
  ):
    Promise<Preflight>;

  expectedDelta(
    intent:
      Intent,
    preflight:
      Preflight,
  ):
    ExpectedDelta;

  analyzeImpact(
    context:
      ActionContext,
    intent:
      Intent,
    preflight:
      Preflight,
  ):
    Promise<ImpactAssessment>;

  digestPreflight(
    preflight:
      Preflight,
  ):
    string;

  revalidate(
    context:
      ActionContext,
    reviewed:
      ReviewedAction<
        Intent,
        Preflight
      >,
  ):
    Promise<
      RevalidationDecision<
        Preflight
      >
    >;

  execute(
    context:
      ActionContext,
    ready:
      ReadyAction<
        Intent,
        Preflight
      >,
  ):
    Promise<Execution>;

  reconcileUnknown(
    context:
      ActionContext,
    reviewed:
      ReviewedAction<
        Intent,
        Preflight
      >,
  ):
    Promise<
      ReconciliationDecision<
        Execution
      >
    >;

  verify(
    context:
      ActionContext,
    execution:
      Execution,
  ):
    Promise<
      readonly ProofResult[]
    >;

  buildRecoveryPlan(
    execution:
      Execution,
    results:
      readonly ProofResult[],
  ):
    RecoveryPlan;
}

function assertNonEmpty(
  value:
    string,
  label:
    string,
): void {
  if (
    value.trim().length ===
      0
  ) {
    throw new ProofEngineError(
      "INVALID_CONTRACT",
      `${label} is required.`,
      {
        label,
      },
    );
  }
}

function authorityIdentity(
  authority:
    RequiredAuthority,
): string {
  return (
    `${authority.resource}:${authority.permission}`
  );
}

export function assertRequiredAuthority(
  authority:
    RequiredAuthority,
): void {
  assertNonEmpty(
    authority.resource,
    "Authority resource",
  );

  assertNonEmpty(
    authority.permission,
    "Authority permission",
  );

  if (
    authority.standing &&
    authority.escalationOnly
  ) {
    throw new ProofEngineError(
      "INVALID_CONTRACT",
      (
        "Authority cannot be both standing and " +
        "escalation-only."
      ),
      {
        authority:
          authorityIdentity(
            authority,
          ),
      },
    );
  }
}

export function assertTargetIdentity(
  target:
    TargetIdentity,
): void {
  assertNonEmpty(
    target.kind,
    "Target kind",
  );

  assertNonEmpty(
    target.canonicalId,
    "Target canonicalId",
  );

  assertNonEmpty(
    target.displayName,
    "Target displayName",
  );

  if (
    target.fixtureId !==
      null &&
    target.fixtureId.trim().length ===
      0
  ) {
    throw new ProofEngineError(
      "INVALID_TARGET",
      "Target fixtureId must be null or non-empty.",
      {
        canonicalId:
          target.canonicalId,
      },
    );
  }

  if (
    target.generation !==
      null &&
    target.generation.trim().length ===
      0
  ) {
    throw new ProofEngineError(
      "INVALID_TARGET",
      "Target generation must be null or non-empty.",
      {
        canonicalId:
          target.canonicalId,
      },
    );
  }
}

export function assertProofContractMetadata(
  contract:
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
    >,
): void {
  if (
    contract.schemaVersion !==
      PROOF_CONTRACT_SCHEMA_VERSION
  ) {
    throw new ProofEngineError(
      "INVALID_CONTRACT",
      "Unsupported Proof Contract schema.",
      {
        schemaVersion:
          contract.schemaVersion,
      },
    );
  }

  assertNonEmpty(
    contract.contractId,
    "Contract id",
  );

  if (
    !/^[a-z0-9][a-z0-9._:-]{7,127}$/.test(
      contract.contractId,
    )
  ) {
    throw new ProofEngineError(
      "INVALID_CONTRACT",
      "Contract id is not a canonical safe identifier.",
      {
        contractId:
          contract.contractId,
      },
    );
  }

  assertNonEmpty(
    contract.actionType,
    "Action type",
  );

  if (
    !/^[A-Z][A-Z0-9_]{2,63}$/.test(
      contract.actionType,
    )
  ) {
    throw new ProofEngineError(
      "INVALID_CONTRACT",
      "Action type must be canonical uppercase snake case.",
      {
        actionType:
          contract.actionType,
      },
    );
  }

  if (
    !Number.isInteger(
      contract.contractVersion,
    ) ||
    contract.contractVersion <
      1
  ) {
    throw new ProofEngineError(
      "INVALID_CONTRACT",
      "Contract version must be a positive integer.",
      {
        contractVersion:
          contract.contractVersion,
      },
    );
  }

  if (
    !(
      MANAGEMENT_DOMAINS as readonly string[]
    ).includes(
      contract.domain,
    )
  ) {
    throw new ProofEngineError(
      "INVALID_CONTRACT",
      "Unsupported management domain.",
      {
        domain:
          contract.domain,
      },
    );
  }

  if (
    !(
      RISK_CLASSES as readonly string[]
    ).includes(
      contract.risk,
    )
  ) {
    throw new ProofEngineError(
      "INVALID_CONTRACT",
      "Unsupported risk class.",
      {
        risk:
          contract.risk,
      },
    );
  }

  if (
    !(
      REVERSIBILITY_CLASSES as readonly string[]
    ).includes(
      contract.reversibility,
    )
  ) {
    throw new ProofEngineError(
      "INVALID_CONTRACT",
      "Unsupported reversibility class.",
      {
        reversibility:
          contract.reversibility,
      },
    );
  }

  const authorityIds =
    new Set<
      string
    >();

  for (
    const authority
    of contract.requiredAuthority
  ) {
    assertRequiredAuthority(
      authority,
    );

    const identity =
      authorityIdentity(
        authority,
      );

    if (
      authorityIds.has(
        identity,
      )
    ) {
      throw new ProofEngineError(
        "INVALID_CONTRACT",
        `Duplicate authority requirement: ${identity}.`,
        {
          authority:
            identity,
        },
      );
    }

    authorityIds.add(
      identity,
    );
  }

  const proofIds =
    new Set<
      string
    >();

  for (
    const requirement
    of contract.proofRequirements
  ) {
    assertProofRequirement(
      requirement,
    );

    if (
      proofIds.has(
        requirement.requirementId,
      )
    ) {
      throw new ProofEngineError(
        "INVALID_CONTRACT",
        (
          "Duplicate proof requirement in contract: " +
          `${requirement.requirementId}.`
        ),
        {
          requirementId:
            requirement.requirementId,
        },
      );
    }

    proofIds.add(
      requirement.requirementId,
    );
  }
}
