import {
  DEMO_FIXTURE_DIRECT_ROLES_AFTER,
  DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
  DEMO_FIXTURE_DISPLAY_NAME,
  DEMO_FIXTURE_ID,
  DEMO_FIXTURE_NAMESPACE,
  DEMO_FIXTURE_TARGET_ROLE,
  DEMO_FIXTURE_TRANSPORT_ROLE,
  DEMO_FIXTURE_USERNAME,
  assertExactDemoUser,
  type DemoFixtureUserSnapshot,
} from "./demo-fixture";

export const DEMO_FIXTURE_APPLY_CONTRACT_VERSION =
  "meridian.demo-fixture-apply.v1" as const;

export const DEMO_FIXTURE_APPLY_OPERATION =
  "REMOVE" as const;

export interface DemoFixtureApplyCommand {
  readonly contractVersion:
    typeof DEMO_FIXTURE_APPLY_CONTRACT_VERSION;

  readonly fixtureId:
    typeof DEMO_FIXTURE_ID;

  readonly username:
    typeof DEMO_FIXTURE_USERNAME;

  readonly operation:
    typeof DEMO_FIXTURE_APPLY_OPERATION;

  readonly role:
    typeof DEMO_FIXTURE_TARGET_ROLE;

  readonly expectedBeforeDirectRoles:
    typeof DEMO_FIXTURE_DIRECT_ROLES_BEFORE;

  readonly expectedAfterDirectRoles:
    typeof DEMO_FIXTURE_DIRECT_ROLES_AFTER;
}

export interface AppliedDemoFixtureMutation {
  readonly state:
    "APPLIED";

  readonly mutationRequestSent:
    true;

  readonly mutationRequestCount:
    1;

  readonly securityMutationOutcomeKnown:
    true;

  readonly securityMutationConfirmed:
    true;

  readonly confirmedSecurityMutationCount:
    1;

  readonly configurationVerified:
    true;

  readonly convergenceRequired:
    true;

  readonly auditBindingRequired:
    true;

  readonly verified:
    false;

  readonly fixtureId:
    typeof DEMO_FIXTURE_ID;

  readonly username:
    typeof DEMO_FIXTURE_USERNAME;

  readonly operation:
    typeof DEMO_FIXTURE_APPLY_OPERATION;

  readonly role:
    typeof DEMO_FIXTURE_TARGET_ROLE;

  readonly beforeDirectRoles:
    readonly string[];

  readonly afterDirectRoles:
    readonly string[];
}

export interface FailedDemoFixtureMutation {
  readonly state:
    "APPLY_FAILED";

  readonly mutationRequestSent:
    true;

  readonly mutationRequestCount:
    1;

  readonly securityMutationOutcomeKnown:
    false;

  readonly securityMutationConfirmed:
    false;

  readonly confirmedSecurityMutationCount:
    0;

  readonly configurationVerified:
    false;

  readonly requiresFreshAuthoritativeRead:
    true;

  readonly mayRetryWithoutFreshRead:
    false;

  readonly verified:
    false;

  readonly outcome:
    "UNKNOWN_AFTER_DISPATCH";

  readonly reason:
    string;
}

export type DemoFixtureApplyResult =
  | AppliedDemoFixtureMutation
  | FailedDemoFixtureMutation;

export class DemoFixtureApplyRefusalError extends Error {
  readonly code:
    | "DEMO_FIXTURE_APPLY_GENERATION_UNAVAILABLE"
    | "DEMO_FIXTURE_APPLY_PRESTATE_INVALID";

  constructor(
    code:
      DemoFixtureApplyRefusalError["code"],
    message:
      string,
  ) {
    super(
      message,
    );

    this.name =
      "DemoFixtureApplyRefusalError";

    this.code =
      code;
  }
}

function normalized(
  values:
    readonly string[],
): string[] {
  return [
    ...new Set(
      values,
    ),
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

function sameRoles(
  left:
    readonly string[],
  right:
    readonly string[],
): boolean {
  return (
    JSON.stringify(
      normalized(
        left,
      ),
    ) ===
    JSON.stringify(
      normalized(
        right,
      ),
    )
  );
}

export function demoFixtureApplyCommand():
  DemoFixtureApplyCommand {
  return Object.freeze({
    contractVersion:
      DEMO_FIXTURE_APPLY_CONTRACT_VERSION,

    fixtureId:
      DEMO_FIXTURE_ID,

    username:
      DEMO_FIXTURE_USERNAME,

    operation:
      DEMO_FIXTURE_APPLY_OPERATION,

    role:
      DEMO_FIXTURE_TARGET_ROLE,

    expectedBeforeDirectRoles:
      DEMO_FIXTURE_DIRECT_ROLES_BEFORE,

    expectedAfterDirectRoles:
      DEMO_FIXTURE_DIRECT_ROLES_AFTER,
  });
}

export function assertDemoFixtureApplyPrestate(
  snapshot:
    DemoFixtureUserSnapshot,
): void {
  try {
    assertExactDemoUser(
      snapshot,
    );
  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "unknown prestate error";

    throw new DemoFixtureApplyRefusalError(
      "DEMO_FIXTURE_APPLY_PRESTATE_INVALID",
      `Synthetic fixture Apply prestate is not exact: ${message}`,
    );
  }
}

export function assertDemoFixtureConfiguredAfter(
  snapshot:
    DemoFixtureUserSnapshot,
): void {
  if (
    snapshot.username !==
      DEMO_FIXTURE_USERNAME ||
    snapshot.displayName !==
      DEMO_FIXTURE_DISPLAY_NAME ||
    snapshot.namespace !==
      DEMO_FIXTURE_NAMESPACE ||
    snapshot.enabled !==
      true ||
    !sameRoles(
      snapshot.directRoles,
      DEMO_FIXTURE_DIRECT_ROLES_AFTER,
    )
  ) {
    throw new Error(
      "Synthetic fixture configured post-state does not match the fixed Apply contract.",
    );
  }
}

export function failedDemoFixtureMutation(
  reason:
    string,
): FailedDemoFixtureMutation {
  return Object.freeze({
    state:
      "APPLY_FAILED",

    mutationRequestSent:
      true,

    mutationRequestCount:
      1,

    securityMutationOutcomeKnown:
      false,

    securityMutationConfirmed:
      false,

    confirmedSecurityMutationCount:
      0,

    configurationVerified:
      false,

    requiresFreshAuthoritativeRead:
      true,

    mayRetryWithoutFreshRead:
      false,

    verified:
      false,

    outcome:
      "UNKNOWN_AFTER_DISPATCH",

    reason,
  });
}

export function appliedDemoFixtureMutation(
  input: {
    readonly before:
      DemoFixtureUserSnapshot;

    readonly after:
      DemoFixtureUserSnapshot;
  },
): AppliedDemoFixtureMutation {
  assertDemoFixtureApplyPrestate(
    input.before,
  );

  assertDemoFixtureConfiguredAfter(
    input.after,
  );

  return Object.freeze({
    state:
      "APPLIED",

    mutationRequestSent:
      true,

    mutationRequestCount:
      1,

    securityMutationOutcomeKnown:
      true,

    securityMutationConfirmed:
      true,

    confirmedSecurityMutationCount:
      1,

    configurationVerified:
      true,

    convergenceRequired:
      true,

    auditBindingRequired:
      true,

    verified:
      false,

    fixtureId:
      DEMO_FIXTURE_ID,

    username:
      DEMO_FIXTURE_USERNAME,

    operation:
      DEMO_FIXTURE_APPLY_OPERATION,

    role:
      DEMO_FIXTURE_TARGET_ROLE,

    beforeDirectRoles:
      Object.freeze([
        ...input.before.directRoles,
      ]),

    afterDirectRoles:
      Object.freeze([
        ...input.after.directRoles,
      ]),
  });
}

export function demoFixtureApplyUserBody() {
  return Object.freeze({
    Roles:
      Object.freeze([
        ...DEMO_FIXTURE_DIRECT_ROLES_AFTER,
      ]),
  });
}

export const DEMO_FIXTURE_APPLY_TRANSPORT_ROLE =
  DEMO_FIXTURE_TRANSPORT_ROLE;
