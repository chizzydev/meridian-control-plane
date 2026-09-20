import {
  DEMO_FIXTURE_DIRECT_ROLES_AFTER,
  DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
  DEMO_FIXTURE_DISPLAY_NAME,
  DEMO_FIXTURE_ID,
  DEMO_FIXTURE_NAMESPACE,
  DEMO_FIXTURE_TARGET_ROLE,
  DEMO_FIXTURE_USERNAME,
  assertExactDemoUser,
  type DemoFixtureUserSnapshot,
} from "../../change-case/demo-fixture";

import {
  assertDemoFixtureConfiguredAfter,
  type AppliedDemoFixtureMutation,
} from "../../change-case/demo-fixture-apply";

import type {
  ReconciliationDecision,
} from "../../proof/contract";

export const USER_REMOVE_ROLE_EXECUTION_SCHEMA_VERSION =
  "meridian.user-remove-role-execution.v1" as const;

export interface UserRemoveRoleExecution {
  readonly schemaVersion:
    typeof USER_REMOVE_ROLE_EXECUTION_SCHEMA_VERSION;

  readonly state:
    "APPLIED";

  readonly fixtureId:
    typeof DEMO_FIXTURE_ID;

  readonly username:
    typeof DEMO_FIXTURE_USERNAME;

  readonly operation:
    "REMOVE";

  readonly role:
    typeof DEMO_FIXTURE_TARGET_ROLE;

  readonly beforeDirectRoles:
    readonly string[];

  readonly afterDirectRoles:
    readonly string[];

  readonly configurationVerified:
    true;

  readonly resolutionSource:
    "DIRECT_EXECUTION" |
    "AUTHORITATIVE_RECONCILIATION_READBACK";
}

function expectedBeforeUser():
  DemoFixtureUserSnapshot {
  return {
    username:
      DEMO_FIXTURE_USERNAME,

    displayName:
      DEMO_FIXTURE_DISPLAY_NAME,

    namespace:
      DEMO_FIXTURE_NAMESPACE,

    enabled:
      true,

    directRoles:
      DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
  };
}

function roleArraysEqual(
  left:
    readonly string[],
  right:
    readonly string[],
): boolean {
  return (
    JSON.stringify(
      [...left].sort(),
    ) ===
    JSON.stringify(
      [...right].sort(),
    )
  );
}

function matchesPrestate(
  user:
    DemoFixtureUserSnapshot,
): boolean {
  try {
    assertExactDemoUser(
      user,
    );

    return true;
  } catch {
    return false;
  }
}

function matchesPoststate(
  user:
    DemoFixtureUserSnapshot,
): boolean {
  try {
    assertDemoFixtureConfiguredAfter(
      user,
    );

    return true;
  } catch {
    return false;
  }
}

function execution(
  source:
    UserRemoveRoleExecution["resolutionSource"],
): UserRemoveRoleExecution {
  return Object.freeze({
    schemaVersion:
      USER_REMOVE_ROLE_EXECUTION_SCHEMA_VERSION,

    state:
      "APPLIED" as const,

    fixtureId:
      DEMO_FIXTURE_ID,

    username:
      DEMO_FIXTURE_USERNAME,

    operation:
      "REMOVE" as const,

    role:
      DEMO_FIXTURE_TARGET_ROLE,

    beforeDirectRoles:
      Object.freeze([
        ...DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
      ]),

    afterDirectRoles:
      Object.freeze([
        ...DEMO_FIXTURE_DIRECT_ROLES_AFTER,
      ]),

    configurationVerified:
      true as const,

    resolutionSource:
      source,
  });
}

export function executionFromAppliedMutation(
  result:
    AppliedDemoFixtureMutation,
): UserRemoveRoleExecution {
  if (
    result.fixtureId !==
      DEMO_FIXTURE_ID ||
    result.username !==
      DEMO_FIXTURE_USERNAME ||
    result.operation !==
      "REMOVE" ||
    result.role !==
      DEMO_FIXTURE_TARGET_ROLE ||
    !result.configurationVerified ||
    !roleArraysEqual(
      result.beforeDirectRoles,
      DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
    ) ||
    !roleArraysEqual(
      result.afterDirectRoles,
      DEMO_FIXTURE_DIRECT_ROLES_AFTER,
    )
  ) {
    throw new Error(
      "Applied role-removal result does not match the fixed Meridian fixture contract.",
    );
  }

  return execution(
    "DIRECT_EXECUTION",
  );
}

export function reconcileUnknownRoleRemoval(
  input: {
    readonly expectedFixtureGeneration:
      string;

    readonly generationStillCurrent:
      boolean;

    readonly observedUser:
      DemoFixtureUserSnapshot | null;
  },
): ReconciliationDecision<
  UserRemoveRoleExecution
> {
  if (
    input.expectedFixtureGeneration
      .trim()
      .length ===
      0 ||
    !input.generationStillCurrent
  ) {
    return Object.freeze({
      outcome:
        "STILL_UNKNOWN" as const,

      reason:
        "FIXTURE_GENERATION_NO_LONGER_CURRENT",
    });
  }

  if (
    input.observedUser ===
      null
  ) {
    return Object.freeze({
      outcome:
        "STILL_UNKNOWN" as const,

      reason:
        "AUTHORITATIVE_TARGET_READBACK_ABSENT",
    });
  }

  if (
    matchesPoststate(
      input.observedUser,
    )
  ) {
    return Object.freeze({
      outcome:
        "APPLIED" as const,

      execution:
        execution(
          "AUTHORITATIVE_RECONCILIATION_READBACK",
        ),
    });
  }

  if (
    matchesPrestate(
      input.observedUser,
    )
  ) {
    return Object.freeze({
      outcome:
        "NOT_APPLIED" as const,

      reason:
        "AUTHORITATIVE_READBACK_MATCHED_EXACT_PRESTATE",
    });
  }

  return Object.freeze({
    outcome:
      "STILL_UNKNOWN" as const,

    reason:
      "AUTHORITATIVE_READBACK_MATCHED_NEITHER_PRESTATE_NOR_POSTSTATE",
  });
}

export function expectedRoleRemovalPrestate():
  DemoFixtureUserSnapshot {
  return expectedBeforeUser();
}
