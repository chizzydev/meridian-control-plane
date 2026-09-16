import type {
  ApplyTimeRevalidationDecision,
} from "./apply-revalidation";

import {
  CENTERPIECE_CHANGE,
} from "./domain";

export const CENTERPIECE_MUTATION_PRIMITIVE =
  "Security.Users.RemoveRoles" as const;

export const CENTERPIECE_MUTATION_CONTRACT_VERSION =
  "centerpiece-remove-v1" as const;

export interface FreshRoleMutationPreflight {
  readonly state:
    string;

  readonly digestAlgorithm:
    string;

  readonly digest:
    string;

  readonly canonical: {
    readonly schemaVersion:
      string;

    readonly change: {
      readonly username:
        string;

      readonly operation:
        string;

      readonly role:
        string;
    };

    readonly current: {
      readonly directRoles:
        readonly string[];
    };

    readonly proposed: {
      readonly directRoles:
        readonly string[];
    };
  };
}

export interface CenterpieceRoleMutationCommand {
  readonly contractVersion:
    typeof CENTERPIECE_MUTATION_CONTRACT_VERSION;

  readonly primitive:
    typeof CENTERPIECE_MUTATION_PRIMITIVE;

  readonly username:
    string;

  readonly operation:
    "REMOVE";

  readonly role:
    string;

  readonly reviewedDigest:
    string;

  readonly freshDigest:
    string;

  readonly expectedBeforeDirectRoles:
    readonly string[];

  readonly expectedAfterDirectRoles:
    readonly string[];
}

function sortedUnique(
  values:
    readonly string[],
): string[] {
  const unique =
    new Set(
      values,
    );

  if (
    unique.size !==
      values.length
  ) {
    throw new Error(
      "Direct-role sets must not contain duplicates.",
    );
  }

  return [
    ...unique,
  ].sort(
    (
      left,
      right,
    ) =>
      left.localeCompare(
        right,
      ),
  );
}

function sameStrings(
  left:
    readonly string[],

  right:
    readonly string[],
): boolean {
  const first =
    sortedUnique(
      left,
    );

  const second =
    sortedUnique(
      right,
    );

  return (
    first.length ===
      second.length &&
    first.every(
      (
        value,
        index,
      ) =>
        value ===
          second[index],
    )
  );
}

export function authorizeCenterpieceRoleMutationDesign(
  input: {
    readonly decision:
      ApplyTimeRevalidationDecision;

    readonly freshPreflight:
      FreshRoleMutationPreflight;
  },
): CenterpieceRoleMutationCommand {
  const decision =
    input.decision;

  const fresh =
    input.freshPreflight;

  if (
    decision.state !==
      "READY" ||
    decision.outcome !==
      "MATCH" ||
    decision.reason !==
      "FRESH_PREFLIGHT_DIGEST_MATCH" ||
    decision.digestMatch !==
      true ||
    decision.mayProceedToMutationBoundary !==
      true ||
    decision.mutationAttempted !==
      false ||
    decision.mutationCount !==
      0
  ) {
    throw new Error(
      "Role mutation design requires an untouched successful 10C MATCH decision.",
    );
  }

  if (
    fresh.state !==
      "PREFLIGHTED" ||
    fresh.digestAlgorithm !==
      "SHA-256"
  ) {
    throw new Error(
      "Role mutation design requires a fresh PREFLIGHTED SHA-256 preflight.",
    );
  }

  if (
    fresh.digest !==
      decision.freshDigest ||
    fresh.digest !==
      decision.reviewedDigest
  ) {
    throw new Error(
      "Fresh preflight digest is not the exact reviewed READY digest.",
    );
  }

  if (
    fresh.canonical.schemaVersion !==
      "meridian.preflight.v1"
  ) {
    throw new Error(
      "Unsupported canonical preflight schema.",
    );
  }

  const change =
    fresh.canonical.change;

  if (
    change.username !==
      CENTERPIECE_CHANGE.username ||
    change.operation !==
      CENTERPIECE_CHANGE.operation ||
    change.role !==
      CENTERPIECE_CHANGE.role
  ) {
    throw new Error(
      "10D permits only the frozen centerpiece change.",
    );
  }

  const before =
    sortedUnique(
      fresh.canonical.current.directRoles,
    );

  const proposed =
    sortedUnique(
      fresh.canonical.proposed.directRoles,
    );

  const targetOccurrences =
    before.filter(
      (role) =>
        role ===
          CENTERPIECE_CHANGE.role,
    ).length;

  if (
    targetOccurrences !==
      1
  ) {
    throw new Error(
      "Target role must occur exactly once in authoritative current direct roles.",
    );
  }

  if (
    proposed.includes(
      CENTERPIECE_CHANGE.role,
    )
  ) {
    throw new Error(
      "Target role still exists in proposed direct roles.",
    );
  }

  const expectedAfter =
    before.filter(
      (role) =>
        role !==
          CENTERPIECE_CHANGE.role,
    );

  if (
    !sameStrings(
      proposed,
      expectedAfter,
    )
  ) {
    throw new Error(
      "Proposed direct roles are not exactly current direct roles minus the target role.",
    );
  }

  return Object.freeze({
    contractVersion:
      CENTERPIECE_MUTATION_CONTRACT_VERSION,

    primitive:
      CENTERPIECE_MUTATION_PRIMITIVE,

    username:
      CENTERPIECE_CHANGE.username,

    operation:
      "REMOVE" as const,

    role:
      CENTERPIECE_CHANGE.role,

    reviewedDigest:
      decision.reviewedDigest,

    freshDigest:
      decision.freshDigest,

    expectedBeforeDirectRoles:
      Object.freeze(
        before,
      ),

    expectedAfterDirectRoles:
      Object.freeze(
        expectedAfter,
      ),
  });
}