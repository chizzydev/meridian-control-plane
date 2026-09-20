import {
  ProofEngineError,
} from "./errors";

export const SAFETY_PREDICATE_KINDS =
  Object.freeze([
    "FIXTURE_IDENTITY_MATCH",
    "GENERATION_MATCH",
    "NOT_SYSTEM_OBJECT",
    "NOT_MERIDIAN_RUNTIME_IDENTITY",
    "NOT_SERVING_APP",
    "NOT_CURRENT_SESSION_PROCESS",
    "NOT_LAST_KNOWN_ADMIN",
    "EXPECTED_PRESTATE_MATCH",
    "CAPABILITY_PRESENT",
    "TARGET_UNCHANGED",
    "RECOVERY_PREREQUISITE_PRESENT",
  ] as const);

export type SafetyPredicateKind =
  (typeof SAFETY_PREDICATE_KINDS)[number];

export const SAFETY_PREDICATE_STATUSES =
  Object.freeze([
    "PASS",
    "FAIL",
    "UNKNOWN",
  ] as const);

export type SafetyPredicateStatus =
  (typeof SAFETY_PREDICATE_STATUSES)[number];

export interface SafetyPredicateRequirement {
  readonly predicateId:
    string;

  readonly kind:
    SafetyPredicateKind;

  readonly description:
    string;
}

export interface SafetyPredicateResult {
  readonly predicateId:
    string;

  readonly kind:
    SafetyPredicateKind;

  readonly status:
    SafetyPredicateStatus;

  readonly observedAtUtc:
    string;

  readonly source:
    string;

  readonly summary:
    string;
}

export interface SafetyGateEvaluation {
  readonly allowed:
    boolean;

  readonly blockingPredicateIds:
    readonly string[];

  readonly unknownPredicateIds:
    readonly string[];
}

function isIsoUtc(
  value:
    string,
): boolean {
  return (
    value.endsWith(
      "Z",
    ) &&
    Number.isFinite(
      Date.parse(
        value,
      ),
    )
  );
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

export function evaluateSafetyGate(
  requirements:
    readonly SafetyPredicateRequirement[],
  results:
    readonly SafetyPredicateResult[],
): SafetyGateEvaluation {
  const requirementMap =
    new Map<
      string,
      SafetyPredicateRequirement
    >();

  for (
    const requirement
    of requirements
  ) {
    assertNonEmpty(
      requirement.predicateId,
      "Safety predicate id",
    );

    assertNonEmpty(
      requirement.description,
      "Safety predicate description",
    );

    if (
      !(
        SAFETY_PREDICATE_KINDS as readonly string[]
      ).includes(
        requirement.kind,
      )
    ) {
      throw new ProofEngineError(
        "INVALID_CONTRACT",
        "Unsupported safety predicate kind.",
        {
          predicateId:
            requirement.predicateId,
        },
      );
    }

    if (
      requirementMap.has(
        requirement.predicateId,
      )
    ) {
      throw new ProofEngineError(
        "INVALID_CONTRACT",
        (
          "Duplicate safety predicate requirement: " +
          `${requirement.predicateId}.`
        ),
        {
          predicateId:
            requirement.predicateId,
        },
      );
    }

    requirementMap.set(
      requirement.predicateId,
      requirement,
    );
  }

  const resultMap =
    new Map<
      string,
      SafetyPredicateResult
    >();

  for (
    const result
    of results
  ) {
    assertNonEmpty(
      result.predicateId,
      "Safety result predicate id",
    );

    assertNonEmpty(
      result.source,
      "Safety result source",
    );

    assertNonEmpty(
      result.summary,
      "Safety result summary",
    );

    if (
      !isIsoUtc(
        result.observedAtUtc,
      )
    ) {
      throw new ProofEngineError(
        "INVALID_CANONICAL_VALUE",
        "Safety observation timestamp must be UTC ISO-8601.",
        {
          predicateId:
            result.predicateId,
        },
      );
    }

    if (
      !(
        SAFETY_PREDICATE_STATUSES as readonly string[]
      ).includes(
        result.status,
      )
    ) {
      throw new ProofEngineError(
        "INVALID_CONTRACT",
        "Unsupported safety result status.",
        {
          predicateId:
            result.predicateId,
        },
      );
    }

    if (
      resultMap.has(
        result.predicateId,
      )
    ) {
      throw new ProofEngineError(
        "INVALID_CONTRACT",
        (
          "Duplicate safety predicate result: " +
          `${result.predicateId}.`
        ),
        {
          predicateId:
            result.predicateId,
        },
      );
    }

    const requirement =
      requirementMap.get(
        result.predicateId,
      );

    if (
      requirement ===
        undefined
    ) {
      throw new ProofEngineError(
        "INVALID_CONTRACT",
        (
          "Unexpected safety predicate result: " +
          `${result.predicateId}.`
        ),
        {
          predicateId:
            result.predicateId,
        },
      );
    }

    if (
      result.kind !==
        requirement.kind
    ) {
      throw new ProofEngineError(
        "INVALID_CONTRACT",
        (
          "Safety predicate result kind does not match " +
          `requirement: ${result.predicateId}.`
        ),
        {
          predicateId:
            result.predicateId,
        },
      );
    }

    resultMap.set(
      result.predicateId,
      result,
    );
  }

  const blockingPredicateIds:
    string[] = [];

  const unknownPredicateIds:
    string[] = [];

  for (
    const requirement
    of requirements
  ) {
    const result =
      resultMap.get(
        requirement.predicateId,
      );

    if (
      result ===
        undefined
    ) {
      blockingPredicateIds.push(
        requirement.predicateId,
      );

      unknownPredicateIds.push(
        requirement.predicateId,
      );

      continue;
    }

    if (
      result.status !==
        "PASS"
    ) {
      blockingPredicateIds.push(
        requirement.predicateId,
      );
    }

    if (
      result.status ===
        "UNKNOWN"
    ) {
      unknownPredicateIds.push(
        requirement.predicateId,
      );
    }
  }

  return Object.freeze({
    allowed:
      blockingPredicateIds.length ===
      0,

    blockingPredicateIds:
      Object.freeze([
        ...blockingPredicateIds,
      ]),

    unknownPredicateIds:
      Object.freeze([
        ...unknownPredicateIds,
      ]),
  });
}

export function assertSafetyGateAllowed(
  evaluation:
    SafetyGateEvaluation,
): void {
  if (
    !evaluation.allowed
  ) {
    throw new ProofEngineError(
      "SAFETY_BLOCKED",
      "Safety predicates did not authorize this action.",
      {
        blockingCount:
          evaluation.blockingPredicateIds.length,
        unknownCount:
          evaluation.unknownPredicateIds.length,
      },
    );
  }
}
