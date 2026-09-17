export const DEMO_FIXTURE_ID =
  "meridian-live-demo-v1" as const;

export const DEMO_FIXTURE_USERNAME =
  "meridian.demo.witness" as const;

export const DEMO_FIXTURE_DISPLAY_NAME =
  "Meridian Live Demo Witness" as const;

export const DEMO_FIXTURE_NAMESPACE =
  "USER" as const;

export const DEMO_FIXTURE_TRANSPORT_ROLE =
  "MeridianDemoNativeTransport" as const;

export const DEMO_FIXTURE_TARGET_ROLE =
  "MeridianSupervisor" as const;

export const DEMO_FIXTURE_BUSINESS_ROLES =
  Object.freeze([
    "MeridianEmployee",
    "MeridianSupervisor",
  ] as const);

export const DEMO_FIXTURE_DIRECT_ROLES_BEFORE =
  Object.freeze([
    "MeridianEmployee",
    "MeridianSupervisor",
    "MeridianDemoNativeTransport",
  ] as const);

export const DEMO_FIXTURE_DIRECT_ROLES_AFTER =
  Object.freeze([
    "MeridianEmployee",
    "MeridianDemoNativeTransport",
  ] as const);

export const DEMO_FIXTURE_REQUIRED_BUSINESS_RESOURCES =
  Object.freeze([
    "Meridian_Portal",
    "Meridian_Orders",
    "Meridian_Admin",
    "Meridian_Jobs",
    "%Admin_Task",
  ] as const);

export const DEMO_FIXTURE_TRANSPORT_RESOURCES =
  Object.freeze([
    Object.freeze({
      resource:
        "%Native_GlobalAccess",
      permission:
        "USE" as const,
    }),
    Object.freeze({
      resource:
        "%Native_ClassExecution",
      permission:
        "USE" as const,
    }),
    Object.freeze({
      resource:
        "%Native_Transaction",
      permission:
        "USE" as const,
    }),
    Object.freeze({
      resource:
        "%Native_Concurrency",
      permission:
        "USE" as const,
    }),
  ]);

export interface DemoFixtureRoleSnapshot {
  readonly name:
    string;

  readonly grantedRoles:
    readonly string[];

  readonly resources:
    readonly {
      readonly resource:
        string;

      readonly permission:
        string;
    }[];
}

export interface DemoFixtureUserSnapshot {
  readonly username:
    string;

  readonly displayName:
    string;

  readonly namespace:
    string;

  readonly enabled:
    boolean;

  readonly directRoles:
    readonly string[];
}

export interface DemoFixturePrerequisiteSnapshot {
  readonly missingRoles:
    readonly string[];

  readonly missingResources:
    readonly string[];
}

export interface DemoFixtureProcessSnapshot {
  readonly pid:
    number;

  readonly username:
    string;
}

export interface DemoFixtureRoleCreate {
  readonly name:
    typeof DEMO_FIXTURE_TRANSPORT_ROLE;

  readonly description:
    string;

  readonly grantedRoles:
    readonly string[];

  readonly resources:
    typeof DEMO_FIXTURE_TRANSPORT_RESOURCES;
}

export interface DemoFixtureUserCreate {
  readonly username:
    typeof DEMO_FIXTURE_USERNAME;

  readonly displayName:
    typeof DEMO_FIXTURE_DISPLAY_NAME;

  readonly namespace:
    typeof DEMO_FIXTURE_NAMESPACE;

  readonly directRoles:
    typeof DEMO_FIXTURE_DIRECT_ROLES_BEFORE;

  readonly comment:
    string;
}

export interface DemoFixtureAdapter {
  readPrerequisites():
    Promise<DemoFixturePrerequisiteSnapshot>;

  listLiveProcesses(
    username:
      typeof DEMO_FIXTURE_USERNAME,
  ):
    Promise<readonly DemoFixtureProcessSnapshot[]>;

  readUser(
    username:
      typeof DEMO_FIXTURE_USERNAME,
  ):
    Promise<DemoFixtureUserSnapshot | null>;

  readRole(
    name:
      typeof DEMO_FIXTURE_TRANSPORT_ROLE,
  ):
    Promise<DemoFixtureRoleSnapshot | null>;

  createRole(
    role:
      DemoFixtureRoleCreate,
  ):
    Promise<void>;

  deleteRole(
    name:
      typeof DEMO_FIXTURE_TRANSPORT_ROLE,
  ):
    Promise<void>;

  createUser(
    user:
      DemoFixtureUserCreate,
    password:
      string,
  ):
    Promise<void>;

  deleteUser(
    username:
      typeof DEMO_FIXTURE_USERNAME,
  ):
    Promise<void>;
}

export interface DemoFixtureCredentialVault {
  store(input: {
    readonly fixtureId:
      typeof DEMO_FIXTURE_ID;

    readonly generation:
      string;

    readonly password:
      string;
  }):
    void;

  clear(
    fixtureId:
      typeof DEMO_FIXTURE_ID,
  ):
    void;
}

export interface DemoFixtureSecretFactory {
  generation():
    string;

  password():
    string;
}

export interface DemoFixturePublicState {
  readonly fixtureId:
    typeof DEMO_FIXTURE_ID;

  readonly generation:
    string;

  readonly username:
    typeof DEMO_FIXTURE_USERNAME;

  readonly targetRole:
    typeof DEMO_FIXTURE_TARGET_ROLE;

  readonly transportRole:
    typeof DEMO_FIXTURE_TRANSPORT_ROLE;

  readonly namespace:
    typeof DEMO_FIXTURE_NAMESPACE;

  readonly directRolesBefore:
    typeof DEMO_FIXTURE_DIRECT_ROLES_BEFORE;

  readonly credentialExposed:
    false;
}

export type DemoFixtureErrorCode =
  | "DEMO_FIXTURE_PREREQUISITE_MISSING"
  | "DEMO_FIXTURE_LIVE_PROCESS_PRESENT"
  | "DEMO_FIXTURE_PASSWORD_INVALID"
  | "DEMO_FIXTURE_ROLE_READBACK_INVALID"
  | "DEMO_FIXTURE_USER_READBACK_INVALID"
  | "DEMO_FIXTURE_COMPENSATING_CLEANUP_FAILED"
  | "DEMO_FIXTURE_RESET_VERIFY_FAILED";

export class DemoFixtureError
  extends Error {
  constructor(
    readonly code:
      DemoFixtureErrorCode,
    message:
      string,
  ) {
    super(
      message,
    );

    this.name =
      "DemoFixtureError";
  }
}

const sorted =
  (
    values:
      readonly string[],
  ): string[] =>
    [...values].sort(
      (
        left,
        right,
      ) =>
        left.localeCompare(
          right,
        ),
    );

const sameStrings =
  (
    left:
      readonly string[],
    right:
      readonly string[],
  ): boolean =>
    JSON.stringify(
      sorted(
        left,
      ),
    ) ===
    JSON.stringify(
      sorted(
        right,
      ),
    );

const permissionKey =
  (
    value: {
      readonly resource:
        string;

      readonly permission:
        string;
    },
  ): string =>
    `${value.resource}:${value.permission.toUpperCase()}`;

export function isSafeSyntheticPassword(
  value:
    string,
): boolean {
  return (
    value.length >=
      16 &&
    value.length <=
      32 &&
    /^[A-Za-z0-9!]+$/.test(
      value,
    ) &&
    /[A-Z]/.test(
      value,
    ) &&
    /[a-z]/.test(
      value,
    ) &&
    /[0-9]/.test(
      value,
    ) &&
    value.includes(
      "!",
    )
  );
}

export function demoFixturePublicState(
  generation:
    string,
): DemoFixturePublicState {
  if (
    generation.trim().length ===
    0
  ) {
    throw new Error(
      "Demo fixture generation is required.",
    );
  }

  return Object.freeze({
    fixtureId:
      DEMO_FIXTURE_ID,

    generation:
      generation.trim(),

    username:
      DEMO_FIXTURE_USERNAME,

    targetRole:
      DEMO_FIXTURE_TARGET_ROLE,

    transportRole:
      DEMO_FIXTURE_TRANSPORT_ROLE,

    namespace:
      DEMO_FIXTURE_NAMESPACE,

    directRolesBefore:
      DEMO_FIXTURE_DIRECT_ROLES_BEFORE,

    credentialExposed:
      false,
  });
}

export function demoFixtureTransportRoleSpec():
  DemoFixtureRoleCreate {
  return Object.freeze({
    name:
      DEMO_FIXTURE_TRANSPORT_ROLE,

    description:
      "Meridian isolated demo Native SDK transport only",

    grantedRoles:
      Object.freeze(
        [],
      ),

    resources:
      DEMO_FIXTURE_TRANSPORT_RESOURCES,
  });
}

export function demoFixtureUserSpec():
  DemoFixtureUserCreate {
  return Object.freeze({
    username:
      DEMO_FIXTURE_USERNAME,

    displayName:
      DEMO_FIXTURE_DISPLAY_NAME,

    namespace:
      DEMO_FIXTURE_NAMESPACE,

    directRoles:
      DEMO_FIXTURE_DIRECT_ROLES_BEFORE,

    comment:
      "Meridian isolated live-demo authorization-convergence witness",
  });
}

export function assertExactDemoTransportRole(
  role:
    DemoFixtureRoleSnapshot,
): void {
  const expectedResources =
    DEMO_FIXTURE_TRANSPORT_RESOURCES.map(
      permissionKey,
    );

  const actualResources =
    role.resources.map(
      permissionKey,
    );

  if (
    role.name !==
      DEMO_FIXTURE_TRANSPORT_ROLE ||
    role.grantedRoles.length !==
      0 ||
    !sameStrings(
      actualResources,
      expectedResources,
    )
  ) {
    throw new DemoFixtureError(
      "DEMO_FIXTURE_ROLE_READBACK_INVALID",
      "Synthetic transport role readback is not exact.",
    );
  }
}

export function assertExactDemoUser(
  user:
    DemoFixtureUserSnapshot,
): void {
  if (
    user.username !==
      DEMO_FIXTURE_USERNAME ||
    user.displayName !==
      DEMO_FIXTURE_DISPLAY_NAME ||
    user.namespace !==
      DEMO_FIXTURE_NAMESPACE ||
    user.enabled !==
      true ||
    !sameStrings(
      user.directRoles,
      DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
    )
  ) {
    throw new DemoFixtureError(
      "DEMO_FIXTURE_USER_READBACK_INVALID",
      "Synthetic demo user readback is not exact.",
    );
  }
}

async function assertNoLiveProcess(
  adapter:
    DemoFixtureAdapter,
): Promise<void> {
  const processes =
    await adapter
      .listLiveProcesses(
        DEMO_FIXTURE_USERNAME,
      );

  if (
    processes.length >
    0
  ) {
    throw new DemoFixtureError(
      "DEMO_FIXTURE_LIVE_PROCESS_PRESENT",
      "Synthetic fixture has a live IRIS process; normal connection closure is required before seed/reset.",
    );
  }
}

async function ensureAbsentBeforeSeed(
  adapter:
    DemoFixtureAdapter,
): Promise<void> {
  const existingUser =
    await adapter
      .readUser(
        DEMO_FIXTURE_USERNAME,
      );

  if (existingUser) {
    await adapter
      .deleteUser(
        DEMO_FIXTURE_USERNAME,
      );
  }

  const userAfterDelete =
    await adapter
      .readUser(
        DEMO_FIXTURE_USERNAME,
      );

  if (userAfterDelete) {
    throw new DemoFixtureError(
      "DEMO_FIXTURE_RESET_VERIFY_FAILED",
      "Synthetic demo user remained after pre-seed cleanup.",
    );
  }

  const existingRole =
    await adapter
      .readRole(
        DEMO_FIXTURE_TRANSPORT_ROLE,
      );

  if (existingRole) {
    await adapter
      .deleteRole(
        DEMO_FIXTURE_TRANSPORT_ROLE,
      );
  }

  const roleAfterDelete =
    await adapter
      .readRole(
        DEMO_FIXTURE_TRANSPORT_ROLE,
      );

  if (roleAfterDelete) {
    throw new DemoFixtureError(
      "DEMO_FIXTURE_RESET_VERIFY_FAILED",
      "Synthetic transport role remained after pre-seed cleanup.",
    );
  }
}

async function compensatingCleanup(
  adapter:
    DemoFixtureAdapter,
  vault:
    DemoFixtureCredentialVault,
): Promise<void> {
  const failures:
    string[] =
    [];

  try {
    const processes =
      await adapter
        .listLiveProcesses(
          DEMO_FIXTURE_USERNAME,
        );

    if (
      processes.length >
      0
    ) {
      failures.push(
        "live-process-present",
      );
    }
  } catch {
    failures.push(
      "process-read-failed",
    );
  }

  if (
    failures.length ===
    0
  ) {
    try {
      if (
        await adapter
          .readUser(
            DEMO_FIXTURE_USERNAME,
          )
      ) {
        await adapter
          .deleteUser(
            DEMO_FIXTURE_USERNAME,
          );
      }
    } catch {
      failures.push(
        "user-cleanup-failed",
      );
    }

    try {
      if (
        await adapter
          .readRole(
            DEMO_FIXTURE_TRANSPORT_ROLE,
          )
      ) {
        await adapter
          .deleteRole(
            DEMO_FIXTURE_TRANSPORT_ROLE,
          );
      }
    } catch {
      failures.push(
        "role-cleanup-failed",
      );
    }
  }

  vault.clear(
    DEMO_FIXTURE_ID,
  );

  if (
    failures.length >
    0
  ) {
    throw new DemoFixtureError(
      "DEMO_FIXTURE_COMPENSATING_CLEANUP_FAILED",
      `Synthetic fixture compensating cleanup failed: ${failures.join(",")}.`,
    );
  }
}

export async function seedDemoFixture(
  input: {
    readonly adapter:
      DemoFixtureAdapter;

    readonly vault:
      DemoFixtureCredentialVault;

    readonly secrets:
      DemoFixtureSecretFactory;
  },
): Promise<DemoFixturePublicState> {
  const prerequisites =
    await input.adapter
      .readPrerequisites();

  if (
    prerequisites
      .missingRoles
      .length >
      0 ||
    prerequisites
      .missingResources
      .length >
      0
  ) {
    throw new DemoFixtureError(
      "DEMO_FIXTURE_PREREQUISITE_MISSING",
      "Shared Meridian business prerequisites are incomplete.",
    );
  }

  await assertNoLiveProcess(
    input.adapter,
  );

  await ensureAbsentBeforeSeed(
    input.adapter,
  );

  const generation =
    input.secrets
      .generation()
      .trim();

  if (
    generation.length ===
    0
  ) {
    throw new Error(
      "Synthetic fixture generation factory returned blank identity.",
    );
  }

  const password =
    input.secrets
      .password();

  if (
    !isSafeSyntheticPassword(
      password,
    )
  ) {
    throw new DemoFixtureError(
      "DEMO_FIXTURE_PASSWORD_INVALID",
      "Synthetic fixture password failed the in-memory credential contract.",
    );
  }

  let mutationStarted =
    false;

  try {
    mutationStarted =
      true;

    await input.adapter
      .createRole(
        demoFixtureTransportRoleSpec(),
      );

    await input.adapter
      .createUser(
        demoFixtureUserSpec(),
        password,
      );

    const role =
      await input.adapter
        .readRole(
          DEMO_FIXTURE_TRANSPORT_ROLE,
        );

    if (!role) {
      throw new DemoFixtureError(
        "DEMO_FIXTURE_ROLE_READBACK_INVALID",
        "Synthetic transport role was absent after creation.",
      );
    }

    assertExactDemoTransportRole(
      role,
    );

    const user =
      await input.adapter
        .readUser(
          DEMO_FIXTURE_USERNAME,
        );

    if (!user) {
      throw new DemoFixtureError(
        "DEMO_FIXTURE_USER_READBACK_INVALID",
        "Synthetic demo user was absent after creation.",
      );
    }

    assertExactDemoUser(
      user,
    );

    input.vault.store({
      fixtureId:
        DEMO_FIXTURE_ID,

      generation,

      password,
    });

    return demoFixturePublicState(
      generation,
    );
  } catch (
    error
  ) {
    if (
      mutationStarted
    ) {
      try {
        await compensatingCleanup(
          input.adapter,
          input.vault,
        );
      } catch (
        cleanupError
      ) {
        throw cleanupError;
      }
    }

    throw error;
  }
}

export async function resetDemoFixture(
  input: {
    readonly adapter:
      DemoFixtureAdapter;

    readonly vault:
      DemoFixtureCredentialVault;
  },
): Promise<void> {
  await assertNoLiveProcess(
    input.adapter,
  );

  const user =
    await input.adapter
      .readUser(
        DEMO_FIXTURE_USERNAME,
      );

  if (user) {
    await input.adapter
      .deleteUser(
        DEMO_FIXTURE_USERNAME,
      );
  }

  const userAfter =
    await input.adapter
      .readUser(
        DEMO_FIXTURE_USERNAME,
      );

  if (userAfter) {
    throw new DemoFixtureError(
      "DEMO_FIXTURE_RESET_VERIFY_FAILED",
      "Synthetic demo user remains after reset.",
    );
  }

  const role =
    await input.adapter
      .readRole(
        DEMO_FIXTURE_TRANSPORT_ROLE,
      );

  if (role) {
    await input.adapter
      .deleteRole(
        DEMO_FIXTURE_TRANSPORT_ROLE,
      );
  }

  const roleAfter =
    await input.adapter
      .readRole(
        DEMO_FIXTURE_TRANSPORT_ROLE,
      );

  if (roleAfter) {
    throw new DemoFixtureError(
      "DEMO_FIXTURE_RESET_VERIFY_FAILED",
      "Synthetic transport role remains after reset.",
    );
  }

  input.vault.clear(
    DEMO_FIXTURE_ID,
  );
}