import {
  DEMO_FIXTURE_ID,
  DEMO_FIXTURE_TRANSPORT_ROLE,
  DEMO_FIXTURE_USERNAME,
  assertExactDemoTransportRole,
  assertExactDemoUser,
  resetDemoFixture,
  seedDemoFixture,
  type DemoFixtureAdapter,
  type DemoFixtureCredentialVault,
  type DemoFixturePublicState,
  type DemoFixtureRoleSnapshot,
  type DemoFixtureSecretFactory,
  type DemoFixtureUserSnapshot,
} from "./demo-fixture";

export type DemoFixtureReadinessState =
  | "READY_CLEAN"
  | "READY_EXISTING_EXACT"
  | "BLOCKED_PREREQUISITES"
  | "BLOCKED_LIVE_PROCESS"
  | "BLOCKED_FIXTURE_DRIFT";

export type DemoFixtureObjectState =
  | "ABSENT"
  | "EXACT"
  | "DRIFT";

export interface DemoFixtureReadinessDiagnostic {
  readonly state:
    DemoFixtureReadinessState;

  readonly fixtureId:
    typeof DEMO_FIXTURE_ID;

  readonly username:
    typeof DEMO_FIXTURE_USERNAME;

  readonly transportRole:
    typeof DEMO_FIXTURE_TRANSPORT_ROLE;

  readonly userState:
    DemoFixtureObjectState;

  readonly roleState:
    DemoFixtureObjectState;

  readonly missingRoles:
    readonly string[];

  readonly missingResources:
    readonly string[];

  readonly liveProcessPids:
    readonly number[];

  readonly seedAllowed:
    boolean;

  readonly resetAllowed:
    boolean;

  readonly credentialEvaluated:
    false;

  readonly actions:
    readonly string[];
}

export type DemoFixtureCommand =
  | "readiness"
  | "seed"
  | "reset";

export interface DemoFixtureCommandResult {
  readonly command:
    DemoFixtureCommand;

  readonly readiness:
    DemoFixtureReadinessDiagnostic;

  readonly publicState?:
    DemoFixturePublicState;
}

export type DemoFixtureControlErrorCode =
  | "DEMO_FIXTURE_SEED_NOT_READY"
  | "DEMO_FIXTURE_RESET_BLOCKED"
  | "DEMO_FIXTURE_POST_SEED_INVALID"
  | "DEMO_FIXTURE_POST_RESET_INVALID";

export class DemoFixtureControlError
  extends Error {
  constructor(
    readonly code:
      DemoFixtureControlErrorCode,
    message:
      string,
  ) {
    super(
      message,
    );

    this.name =
      "DemoFixtureControlError";
  }
}

function userObjectState(
  value:
    DemoFixtureUserSnapshot | null,
): DemoFixtureObjectState {
  if (
    value ===
      null
  ) {
    return "ABSENT";
  }

  try {
    assertExactDemoUser(
      value,
    );

    return "EXACT";
  } catch {
    return "DRIFT";
  }
}

function roleObjectState(
  value:
    DemoFixtureRoleSnapshot | null,
): DemoFixtureObjectState {
  if (
    value ===
      null
  ) {
    return "ABSENT";
  }

  try {
    assertExactDemoTransportRole(
      value,
    );

    return "EXACT";
  } catch {
    return "DRIFT";
  }
}

function frozenSorted(
  values:
    readonly string[],
): readonly string[] {
  return Object.freeze(
    [...values].sort(
      (
        left,
        right,
      ) =>
        left.localeCompare(
          right,
        ),
    ),
  );
}

function frozenPids(
  values:
    readonly number[],
): readonly number[] {
  return Object.freeze(
    [...values].sort(
      (
        left,
        right,
      ) =>
        left -
        right,
    ),
  );
}

export async function inspectDemoFixtureReadiness(
  adapter:
    DemoFixtureAdapter,
): Promise<DemoFixtureReadinessDiagnostic> {
  const prerequisites =
    await adapter
      .readPrerequisites();

  const processes =
    await adapter
      .listLiveProcesses(
        DEMO_FIXTURE_USERNAME,
      );

  const user =
    await adapter
      .readUser(
        DEMO_FIXTURE_USERNAME,
      );

  const role =
    await adapter
      .readRole(
        DEMO_FIXTURE_TRANSPORT_ROLE,
      );

  const missingRoles =
    frozenSorted(
      prerequisites.missingRoles,
    );

  const missingResources =
    frozenSorted(
      prerequisites.missingResources,
    );

  const liveProcessPids =
    frozenPids(
      processes.map(
        (
          process,
        ) =>
          process.pid,
      ),
    );

  const userState =
    userObjectState(
      user,
    );

  const roleState =
    roleObjectState(
      role,
    );

  const prerequisiteBlocked =
    missingRoles.length >
      0 ||
    missingResources.length >
      0;

  const liveProcessBlocked =
    liveProcessPids.length >
      0;

  const fixtureDrifted =
    (
      userState ===
        "DRIFT" ||
      roleState ===
        "DRIFT" ||
      (
        userState ===
          "ABSENT" &&
        roleState ===
          "EXACT"
      ) ||
      (
        userState ===
          "EXACT" &&
        roleState ===
          "ABSENT"
      )
    );

  const state:
    DemoFixtureReadinessState =
      prerequisiteBlocked
        ? "BLOCKED_PREREQUISITES"
        : liveProcessBlocked
          ? "BLOCKED_LIVE_PROCESS"
          : fixtureDrifted
            ? "BLOCKED_FIXTURE_DRIFT"
            : userState ===
                  "EXACT" &&
                roleState ===
                  "EXACT"
              ? "READY_EXISTING_EXACT"
              : "READY_CLEAN";

  const seedAllowed =
    state ===
      "READY_CLEAN" ||
    state ===
      "READY_EXISTING_EXACT";

  const resetAllowed =
    !liveProcessBlocked;

  const actions:
    string[] =
      [];

  for (
    const roleIssue
    of missingRoles
  ) {
    actions.push(
      `Repair shared role prerequisite: ${roleIssue}`,
    );
  }

  for (
    const resourceIssue
    of missingResources
  ) {
    actions.push(
      `Repair shared resource prerequisite: ${resourceIssue}`,
    );
  }

  if (
    liveProcessBlocked
  ) {
    actions.push(
      `Close the synthetic fixture connection normally before seed/reset; live PID(s): ${liveProcessPids.join(",")}.`,
    );
  }

  if (
    fixtureDrifted
  ) {
    actions.push(
      "Reset the fixed synthetic fixture before reseeding; exact user/role readback did not match the frozen A3 contract.",
    );
  }

  if (
    state ===
      "READY_EXISTING_EXACT"
  ) {
    actions.push(
      "Existing synthetic objects are exact, but credential binding is intentionally not inferred by readiness; reseed in the server process before live witness use unless that process already owns the matching generation.",
    );
  }

  return Object.freeze({
    state,

    fixtureId:
      DEMO_FIXTURE_ID,

    username:
      DEMO_FIXTURE_USERNAME,

    transportRole:
      DEMO_FIXTURE_TRANSPORT_ROLE,

    userState,

    roleState,

    missingRoles,

    missingResources,

    liveProcessPids,

    seedAllowed,

    resetAllowed,

    credentialEvaluated:
      false,

    actions:
      Object.freeze(
        actions,
      ),
  });
}

export async function executeDemoFixtureCommand(
  input: {
    readonly command:
      DemoFixtureCommand;

    readonly adapter:
      DemoFixtureAdapter;

    readonly vault:
      DemoFixtureCredentialVault;

    readonly secrets:
      DemoFixtureSecretFactory;
  },
): Promise<DemoFixtureCommandResult> {
  if (
    input.command ===
      "readiness"
  ) {
    return Object.freeze({
      command:
        "readiness",

      readiness:
        await inspectDemoFixtureReadiness(
          input.adapter,
        ),
    });
  }

  if (
    input.command ===
      "seed"
  ) {
    const before =
      await inspectDemoFixtureReadiness(
        input.adapter,
      );

    if (
      !before.seedAllowed
    ) {
      throw new DemoFixtureControlError(
        "DEMO_FIXTURE_SEED_NOT_READY",
        `Synthetic fixture seed is blocked by readiness state ${before.state}.`,
      );
    }

    const publicState =
      await seedDemoFixture({
        adapter:
          input.adapter,

        vault:
          input.vault,

        secrets:
          input.secrets,
      });

    const after =
      await inspectDemoFixtureReadiness(
        input.adapter,
      );

    if (
      after.state !==
        "READY_EXISTING_EXACT"
    ) {
      throw new DemoFixtureControlError(
        "DEMO_FIXTURE_POST_SEED_INVALID",
        `Synthetic fixture post-seed readiness is ${after.state}.`,
      );
    }

    return Object.freeze({
      command:
        "seed",

      readiness:
        after,

      publicState,
    });
  }

  const before =
    await inspectDemoFixtureReadiness(
      input.adapter,
    );

  if (
    !before.resetAllowed
  ) {
    throw new DemoFixtureControlError(
      "DEMO_FIXTURE_RESET_BLOCKED",
      `Synthetic fixture reset is blocked by readiness state ${before.state}.`,
    );
  }

  await resetDemoFixture({
    adapter:
      input.adapter,

    vault:
      input.vault,
  });

  const after =
    await inspectDemoFixtureReadiness(
      input.adapter,
    );

  if (
    after.state !==
      "READY_CLEAN"
  ) {
    throw new DemoFixtureControlError(
      "DEMO_FIXTURE_POST_RESET_INVALID",
      `Synthetic fixture post-reset readiness is ${after.state}.`,
    );
  }

  return Object.freeze({
    command:
      "reset",

    readiness:
      after,
  });
}
