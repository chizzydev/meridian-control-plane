import {
  DEMO_FIXTURE_DIRECT_ROLES_AFTER,
  DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
  DEMO_FIXTURE_DISPLAY_NAME,
  DEMO_FIXTURE_ID,
  DEMO_FIXTURE_NAMESPACE,
  DEMO_FIXTURE_TARGET_ROLE,
  DEMO_FIXTURE_USERNAME,
  type DemoFixtureUserSnapshot,
} from "../../change-case/demo-fixture";

import {
  LIVE_WITNESS_LOST_PERMISSION_KEYS,
  LIVE_WITNESS_RETAINED_PERMISSION_KEYS,
  LIVE_WITNESS_TRANSPORT_PERMISSION_KEYS,
  type LiveWitnessProcessRow,
  type LiveWitnessSelfSnapshot,
} from "../../change-case/live-convergence";

import {
  PROOF_CONTRACT_SCHEMA_VERSION,
  type ActionContext,
  type ProofContract,
  type ReconciliationDecision,
  type RevalidationDecision,
  type ReviewedAction,
} from "../../proof/contract";

import {
  certifyVerifiedAction,
  type VerifiedActionCertificationDependencies,
  type VerifiedActionCertificationResult,
} from "../../proof/certification-runner";

import {
  digestCanonicalJson,
} from "../../proof/digest";

import type {
  ProofRequirement,
  ProofResult,
} from "../../proof/evidence";

import {
  ProofEngineError,
} from "../../proof/errors";

import {
  P03_PREFLIGHT_ROLE_NAMES,
  P03UserAuthorityDeniedError,
  P03UserMutationUnknownAfterDispatchError,
  type P03PreflightRoleName,
  type P03RoleSnapshot,
} from "../../iris/user-add-role-action-transport";

export const P03_USER_ADD_ROLE_CONTRACT_ID =
  "meridian.permissions.user-add-role.v1" as const;

export const P03_USER_ADD_ROLE_EXECUTION_SCHEMA_VERSION =
  "meridian.user-add-role-execution.v1" as const;

export const P03_USER_ADD_ROLE_DELTA_SUMMARY =
  "Add MeridianSupervisor to the isolated Meridian witness user through one official PUT /v2/security/user, preserving MeridianEmployee and MeridianDemoNativeTransport. Prove configuration, configured permission gain, stale same-session authority, fresh-session convergence, and one native UserChange audit row." as const;

export interface P03UserAddRoleIntent {
  readonly actionId:
    "P03_USER_ADD_ROLE";

  readonly fixtureId:
    typeof DEMO_FIXTURE_ID;

  readonly username:
    typeof DEMO_FIXTURE_USERNAME;

  readonly role:
    typeof DEMO_FIXTURE_TARGET_ROLE;

  readonly expectedFixtureGeneration:
    string;
}

export interface P03RoleObservation {
  readonly name:
    P03PreflightRoleName;

  readonly snapshot:
    P03RoleSnapshot |
    null;
}

export interface P03UserAddRolePreflight {
  readonly schemaVersion:
    "meridian.user-add-role-preflight.v1";

  readonly fixtureId:
    typeof DEMO_FIXTURE_ID;

  readonly expectedFixtureGeneration:
    string;

  readonly user:
    DemoFixtureUserSnapshot |
    null;

  readonly roles:
    readonly P03RoleObservation[];

  readonly credentialPresent:
    boolean;

  readonly officialMutationOperation:
    "PUT /v2/security/user";

  readonly requiredAuthority:
    "%Admin_Secure:U";

  readonly authorityMode:
    "CURRENT_STANDING_RUNTIME_AUTHORITY";
}

export interface P03UserAddRoleExecution {
  readonly schemaVersion:
    typeof P03_USER_ADD_ROLE_EXECUTION_SCHEMA_VERSION;

  readonly state:
    "APPLIED";

  readonly actionId:
    "P03_USER_ADD_ROLE";

  readonly fixtureId:
    typeof DEMO_FIXTURE_ID;

  readonly generation:
    string;

  readonly username:
    typeof DEMO_FIXTURE_USERNAME;

  readonly role:
    typeof DEMO_FIXTURE_TARGET_ROLE;

  readonly beforeDirectRoles:
    readonly string[];

  readonly afterDirectRoles:
    readonly string[];

  readonly mutationRequestCount:
    1;

  readonly configurationVerified:
    true;

  readonly resolutionSource:
    "DIRECT_EXECUTION" |
    "AUTHORITATIVE_RECONCILIATION_READBACK";
}

export interface P03UserAddRoleLiveEvidence {
  readonly staleSameConnectionProven:
    true;

  readonly oldServerPid:
    number;

  readonly freshServerPid:
    number;

  readonly oldPidGone:
    true;

  readonly gainedPermissionAllowedCount:
    number;

  readonly retainedPermissionAllowedCount:
    number;

  readonly transportPermissionAllowedCount:
    number;

  readonly freshProcessBound:
    true;

  readonly converged:
    true;
}

export interface P03UserAddRoleEvidenceInput {
  readonly observedAtUtc:
    string;

  readonly configurationVerified:
    boolean;

  readonly permissionEffectVerified:
    boolean;

  readonly liveRuntimeConverged:
    boolean;

  readonly nativeAuditBound:
    boolean;

  readonly configurationSourceReference:
    string | null;

  readonly permissionSourceReference:
    string | null;

  readonly liveRuntimeSourceReference:
    string | null;

  readonly nativeAuditSourceReference:
    string | null;
}

export interface P03UserAddRoleContractDependencies {
  readonly readFreshPreflight:
    (
      intent:
        P03UserAddRoleIntent,
    ) => Promise<
      P03UserAddRolePreflight
    >;

  readonly executeAdd:
    (
      intent:
        P03UserAddRoleIntent,
    ) => Promise<void>;

  readonly collectProofResults:
    (
      execution:
        P03UserAddRoleExecution,
    ) => Promise<
      readonly ProofResult[]
    >;
}

export interface P03UserAddRoleCertificationDependencies {
  readonly contract:
    P03UserAddRoleContractDependencies;

  readonly certification:
    VerifiedActionCertificationDependencies<
      P03UserAddRolePreflight
    >;
}

export const P03_USER_ADD_ROLE_PROOF_REQUIREMENTS:
  readonly ProofRequirement[] =
  Object.freeze([
    Object.freeze({
      requirementId:
        "p03-configured-user-readback",

      plane:
        "CONFIGURATION_READBACK",

      applicability:
        "REQUIRED",

      description:
        "Authoritative SysAdmin user readback contains the exact post-P03 direct-role set.",

      source:
        "IRIS SysAdmin API GET /v2/security/user",
    }),

    Object.freeze({
      requirementId:
        "p03-permission-effect",

      plane:
        "PERMISSION_EFFECT",

      applicability:
        "REQUIRED",

      description:
        "The exact configured role/resource graph proves the declared permission gains and retained permissions.",

      source:
        "IRIS SysAdmin role/resource configuration",
    }),

    Object.freeze({
      requirementId:
        "p03-live-runtime-convergence",

      plane:
        "LIVE_RUNTIME",

      applicability:
        "REQUIRED",

      description:
        "The same live connection remains stale after P03, then a fresh IRIS process converges to the newly granted authority.",

      source:
        "Meridian Native SDK witness + IRIS ProcessQuery",
    }),

    Object.freeze({
      requirementId:
        "p03-native-userchange-audit",

      plane:
        "NATIVE_AUDIT",

      applicability:
        "REQUIRED",

      description:
        "Exactly one native IRIS UserChange audit row is bound to adding MeridianSupervisor to the isolated witness user.",

      source:
        "IRIS native UserChange audit",
    }),
  ]);

const EXPECTED_ROLE_GRAPH:
  Readonly<
    Record<
      P03PreflightRoleName,
      Readonly<{
        grantedRoles:
          readonly string[];

        resources:
          readonly string[];
      }>
    >
  > =
  Object.freeze({
    MeridianViewer:
      Object.freeze({
        grantedRoles:
          Object.freeze([]),

        resources:
          Object.freeze([
            "%DB_USER:R",
            "Meridian_Orders:R",
            "Meridian_Portal:U",
          ]),
      }),

    MeridianJobRunner:
      Object.freeze({
        grantedRoles:
          Object.freeze([]),

        resources:
          Object.freeze([
            "Meridian_Jobs:U",
          ]),
      }),

    MeridianEmployee:
      Object.freeze({
        grantedRoles:
          Object.freeze([
            "MeridianViewer",
          ]),

        resources:
          Object.freeze([]),
      }),

    MeridianOperator:
      Object.freeze({
        grantedRoles:
          Object.freeze([
            "MeridianJobRunner",
          ]),

        resources:
          Object.freeze([
            "Meridian_Orders:W",
          ]),
      }),

    MeridianSupervisor:
      Object.freeze({
        grantedRoles:
          Object.freeze([
            "MeridianOperator",
          ]),

        resources:
          Object.freeze([
            "%Admin_Task:U",
            "Meridian_Admin:U",
          ]),
      }),

    MeridianDemoNativeTransport:
      Object.freeze({
        grantedRoles:
          Object.freeze([]),

        resources:
          Object.freeze([
            "%Native_ClassExecution:U",
            "%Native_Concurrency:U",
            "%Native_GlobalAccess:U",
            "%Native_Transaction:U",
          ]),
      }),
  });

function sorted(
  values:
    readonly string[],
): readonly string[] {
  return Object.freeze(
    [
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
    ),
  );
}

function sameStrings(
  left:
    readonly string[],
  right:
    readonly string[],
): boolean {
  return (
    JSON.stringify(
      sorted(
        left,
      ),
    ) ===
    JSON.stringify(
      sorted(
        right,
      ),
    )
  );
}

function roleResourceKeys(
  snapshot:
    P03RoleSnapshot,
): readonly string[] {
  return sorted(
    snapshot.resources.map(
      (
        resource,
      ) =>
        `${resource.resource}:${resource.permission.toUpperCase()}`,
    ),
  );
}

function expectedUser(
  directRoles:
    readonly string[],
): DemoFixtureUserSnapshot {
  return Object.freeze({
    username:
      DEMO_FIXTURE_USERNAME,

    displayName:
      DEMO_FIXTURE_DISPLAY_NAME,

    namespace:
      DEMO_FIXTURE_NAMESPACE,

    enabled:
      true,

    directRoles:
      Object.freeze([
        ...directRoles,
      ]),
  });
}

export function p03ExpectedPreUserSnapshot():
  DemoFixtureUserSnapshot {
  return expectedUser(
    DEMO_FIXTURE_DIRECT_ROLES_AFTER,
  );
}

export function p03ExpectedPostUserSnapshot():
  DemoFixtureUserSnapshot {
  return expectedUser(
    DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
  );
}

export function p03ExpectedRoleObservations():
  readonly P03RoleObservation[] {
  return Object.freeze(
    P03_PREFLIGHT_ROLE_NAMES.map(
      (
        name,
      ) => {
        const expected =
          EXPECTED_ROLE_GRAPH[
            name
          ];

        const resources =
          expected.resources.map(
            (
              value,
            ) => {
              const splitAt =
                value.lastIndexOf(
                  ":",
                );

              return Object.freeze({
                resource:
                  value.slice(
                    0,
                    splitAt,
                  ),

                permission:
                  value.slice(
                    splitAt +
                      1,
                  ),
              });
            },
          );

        return Object.freeze({
          name,

          snapshot:
            Object.freeze({
              name,

              grantedRoles:
                Object.freeze([
                  ...expected.grantedRoles,
                ]),

              resources:
                Object.freeze(
                  resources,
                ),
            }),
        });
      },
    ),
  );
}

function roleGraphMatches(
  roles:
    readonly P03RoleObservation[],
): boolean {
  if (
    roles.length !==
      P03_PREFLIGHT_ROLE_NAMES.length
  ) {
    return false;
  }

  const byName =
    new Map(
      roles.map(
        (
          role,
        ) => [
          role.name,
          role.snapshot,
        ] as const,
      ),
    );

  if (
    byName.size !==
      P03_PREFLIGHT_ROLE_NAMES.length
  ) {
    return false;
  }

  return P03_PREFLIGHT_ROLE_NAMES.every(
    (
      name,
    ) => {
      const observed =
        byName.get(
          name,
        );

      const expected =
        EXPECTED_ROLE_GRAPH[
          name
        ];

      return (
        observed !==
          null &&
        observed !==
          undefined &&
        sameStrings(
          observed.grantedRoles,
          expected.grantedRoles,
        ) &&
        sameStrings(
          roleResourceKeys(
            observed,
          ),
          expected.resources,
        )
      );
    },
  );
}

function userMatches(
  observed:
    DemoFixtureUserSnapshot |
    null,
  expectedRoles:
    readonly string[],
): boolean {
  return (
    observed !==
      null &&
    observed.username ===
      DEMO_FIXTURE_USERNAME &&
    observed.displayName ===
      DEMO_FIXTURE_DISPLAY_NAME &&
    observed.namespace ===
      DEMO_FIXTURE_NAMESPACE &&
    observed.enabled ===
      true &&
    sameStrings(
      observed.directRoles,
      expectedRoles,
    )
  );
}

export function p03PrestateMatches(
  preflight:
    P03UserAddRolePreflight,
): boolean {
  return (
    preflight.fixtureId ===
      DEMO_FIXTURE_ID &&
    preflight.expectedFixtureGeneration
      .trim()
      .length >
      0 &&
    preflight.credentialPresent &&
    userMatches(
      preflight.user,
      DEMO_FIXTURE_DIRECT_ROLES_AFTER,
    ) &&
    roleGraphMatches(
      preflight.roles,
    )
  );
}

export function p03PoststateMatches(
  preflight:
    P03UserAddRolePreflight,
): boolean {
  return (
    preflight.fixtureId ===
      DEMO_FIXTURE_ID &&
    preflight.expectedFixtureGeneration
      .trim()
      .length >
      0 &&
    preflight.credentialPresent &&
    userMatches(
      preflight.user,
      DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
    ) &&
    roleGraphMatches(
      preflight.roles,
    )
  );
}

function assertIntent(
  intent:
    P03UserAddRoleIntent,
): void {
  if (
    intent.actionId !==
      "P03_USER_ADD_ROLE" ||
    intent.fixtureId !==
      DEMO_FIXTURE_ID ||
    intent.username !==
      DEMO_FIXTURE_USERNAME ||
    intent.role !==
      DEMO_FIXTURE_TARGET_ROLE ||
    intent.expectedFixtureGeneration
      .trim()
      .length ===
      0
  ) {
    throw new ProofEngineError(
      "INVALID_TARGET",
      "P03 intent is outside the frozen isolated witness boundary.",
    );
  }
}

function execution(
  generation:
    string,
  source:
    P03UserAddRoleExecution["resolutionSource"],
): P03UserAddRoleExecution {
  return Object.freeze({
    schemaVersion:
      P03_USER_ADD_ROLE_EXECUTION_SCHEMA_VERSION,

    state:
      "APPLIED" as const,

    actionId:
      "P03_USER_ADD_ROLE" as const,

    fixtureId:
      DEMO_FIXTURE_ID,

    generation,

    username:
      DEMO_FIXTURE_USERNAME,

    role:
      DEMO_FIXTURE_TARGET_ROLE,

    beforeDirectRoles:
      Object.freeze([
        ...DEMO_FIXTURE_DIRECT_ROLES_AFTER,
      ]),

    afterDirectRoles:
      Object.freeze([
        ...DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
      ]),

    mutationRequestCount:
      1 as const,

    configurationVerified:
      true as const,

    resolutionSource:
      source,
  });
}

function mapAuthorityDenied(
  error:
    unknown,
): RevalidationDecision<
  P03UserAddRolePreflight
> | null {
  if (
    error instanceof
      P03UserAuthorityDeniedError
  ) {
    return Object.freeze({
      outcome:
        "DENIED" as const,

      freshPreflight:
        null,

      freshDigest:
        null,

      reason:
        error.message,
    });
  }

  return null;
}

export function p03UserAddRoleIntent(
  generation:
    string,
): P03UserAddRoleIntent {
  const trimmed =
    generation.trim();

  if (
    trimmed.length ===
      0
  ) {
    throw new Error(
      "P03 fixture generation is required.",
    );
  }

  return Object.freeze({
    actionId:
      "P03_USER_ADD_ROLE" as const,

    fixtureId:
      DEMO_FIXTURE_ID,

    username:
      DEMO_FIXTURE_USERNAME,

    role:
      DEMO_FIXTURE_TARGET_ROLE,

    expectedFixtureGeneration:
      trimmed,
  });
}

export function reconcileUnknownP03UserAddRole(
  preflight:
    P03UserAddRolePreflight,
): ReconciliationDecision<
  P03UserAddRoleExecution
> {
  if (
    p03PoststateMatches(
      preflight,
    )
  ) {
    return Object.freeze({
      outcome:
        "APPLIED" as const,

      execution:
        execution(
          preflight
            .expectedFixtureGeneration,
          "AUTHORITATIVE_RECONCILIATION_READBACK",
        ),
    });
  }

  if (
    p03PrestateMatches(
      preflight,
    )
  ) {
    return Object.freeze({
      outcome:
        "NOT_APPLIED" as const,

      reason:
        "AUTHORITATIVE_READBACK_MATCHED_EXACT_P03_PRESTATE",
    });
  }

  return Object.freeze({
    outcome:
      "STILL_UNKNOWN" as const,

    reason:
      "AUTHORITATIVE_READBACK_MATCHED_NEITHER_EXACT_P03_PRESTATE_NOR_POSTSTATE",
  });
}

function allChecksEqual(
  snapshot:
    LiveWitnessSelfSnapshot,
  keys:
    readonly (
      keyof LiveWitnessSelfSnapshot["checks"]
    )[],
  expected:
    0 | 1,
): boolean {
  return keys.every(
    (
      key,
    ) =>
      snapshot.checks[
        key
      ] ===
        expected,
  );
}

function assertPid(
  value:
    number,
  label:
    string,
): void {
  if (
    !Number.isSafeInteger(
      value,
    ) ||
    value <
      1
  ) {
    throw new Error(
      `${label} is invalid.`,
    );
  }
}

export function assertP03PreApplyWitness(
  input: {
    readonly snapshot:
      LiveWitnessSelfSnapshot;

    readonly processRows:
      readonly LiveWitnessProcessRow[];
  },
): void {
  assertPid(
    input.snapshot.serverPid,
    "P03 pre-Apply witness PID",
  );

  if (
    !allChecksEqual(
      input.snapshot,
      LIVE_WITNESS_LOST_PERMISSION_KEYS,
      0,
    ) ||
    !allChecksEqual(
      input.snapshot,
      LIVE_WITNESS_RETAINED_PERMISSION_KEYS,
      1,
    ) ||
    !allChecksEqual(
      input.snapshot,
      LIVE_WITNESS_TRANSPORT_PERMISSION_KEYS,
      1,
    )
  ) {
    throw new Error(
      "P03 pre-Apply witness does not have the exact expected pre-grant authority.",
    );
  }

  if (
    input.processRows.length !==
      1 ||
    input.processRows[0]
      ?.pid !==
      input.snapshot.serverPid
  ) {
    throw new Error(
      "P03 pre-Apply ProcessQuery did not bind exactly one witness PID.",
    );
  }
}

export function proveP03UserAddRoleLiveConvergence(
  input: {
    readonly preApply:
      LiveWitnessSelfSnapshot;

    readonly stale:
      LiveWitnessSelfSnapshot;

    readonly fresh:
      LiveWitnessSelfSnapshot;

    readonly oldPidGone:
      boolean;

    readonly freshProcessRows:
      readonly LiveWitnessProcessRow[];
  },
): P03UserAddRoleLiveEvidence {
  assertPid(
    input.preApply.serverPid,
    "P03 pre-Apply witness PID",
  );

  assertPid(
    input.stale.serverPid,
    "P03 stale witness PID",
  );

  assertPid(
    input.fresh.serverPid,
    "P03 fresh witness PID",
  );

  if (
    input.stale.serverPid !==
      input.preApply.serverPid
  ) {
    throw new Error(
      "P03 stale witness did not preserve the same live IRIS process.",
    );
  }

  if (
    !allChecksEqual(
      input.stale,
      LIVE_WITNESS_LOST_PERMISSION_KEYS,
      0,
    ) ||
    !allChecksEqual(
      input.stale,
      LIVE_WITNESS_RETAINED_PERMISSION_KEYS,
      1,
    ) ||
    !allChecksEqual(
      input.stale,
      LIVE_WITNESS_TRANSPORT_PERMISSION_KEYS,
      1,
    )
  ) {
    throw new Error(
      "P03 same-process stale witness did not preserve the exact pre-grant authority.",
    );
  }

  if (!input.oldPidGone) {
    throw new Error(
      "P03 old witness PID disappearance was not proven.",
    );
  }

  if (
    input.fresh.serverPid ===
      input.preApply.serverPid
  ) {
    throw new Error(
      "P03 fresh witness reused the stale IRIS process PID.",
    );
  }

  if (
    !allChecksEqual(
      input.fresh,
      LIVE_WITNESS_LOST_PERMISSION_KEYS,
      1,
    ) ||
    !allChecksEqual(
      input.fresh,
      LIVE_WITNESS_RETAINED_PERMISSION_KEYS,
      1,
    ) ||
    !allChecksEqual(
      input.fresh,
      LIVE_WITNESS_TRANSPORT_PERMISSION_KEYS,
      1,
    )
  ) {
    throw new Error(
      "P03 fresh witness did not converge to the exact post-grant authority.",
    );
  }

  if (
    input.freshProcessRows.length !==
      1 ||
    input.freshProcessRows[0]
      ?.pid !==
      input.fresh.serverPid
  ) {
    throw new Error(
      "P03 fresh ProcessQuery did not bind exactly one converged witness PID.",
    );
  }

  return Object.freeze({
    staleSameConnectionProven:
      true as const,

    oldServerPid:
      input.preApply.serverPid,

    freshServerPid:
      input.fresh.serverPid,

    oldPidGone:
      true as const,

    gainedPermissionAllowedCount:
      LIVE_WITNESS_LOST_PERMISSION_KEYS.length,

    retainedPermissionAllowedCount:
      LIVE_WITNESS_RETAINED_PERMISSION_KEYS.length,

    transportPermissionAllowedCount:
      LIVE_WITNESS_TRANSPORT_PERMISSION_KEYS.length,

    freshProcessBound:
      true as const,

    converged:
      true as const,
  });
}

function proofResult(
  input: {
    readonly requirement:
      ProofRequirement;

    readonly passed:
      boolean;

    readonly observedAtUtc:
      string;

    readonly sourceReference:
      string | null;

    readonly observedSummary:
      string;
  },
): ProofResult {
  return Object.freeze({
    requirementId:
      input.requirement.requirementId,

    plane:
      input.requirement.plane,

    applicability:
      input.requirement.applicability,

    status:
      input.passed
        ? "PASS"
        : "FAIL",

    sourceType:
      input.requirement.source,

    sourceReference:
      input.sourceReference,

    observedAtUtc:
      input.observedAtUtc,

    expectedSummary:
      input.requirement.description,

    observedSummary:
      input.observedSummary,

    provenance:
      "AUTHORITATIVE_IRIS" as const,

    safeEvidenceDigest:
      null,
  });
}

export function buildP03UserAddRoleProofResults(
  input:
    P03UserAddRoleEvidenceInput,
): readonly ProofResult[] {
  const [
    configuration,
    permission,
    runtime,
    audit,
  ] =
    P03_USER_ADD_ROLE_PROOF_REQUIREMENTS;

  if (
    configuration ===
      undefined ||
    permission ===
      undefined ||
    runtime ===
      undefined ||
    audit ===
      undefined
  ) {
    throw new Error(
      "P03 proof requirement registry is incomplete.",
    );
  }

  return Object.freeze([
    proofResult({
      requirement:
        configuration,

      passed:
        input.configurationVerified,

      observedAtUtc:
        input.observedAtUtc,

      sourceReference:
        input.configurationSourceReference,

      observedSummary:
        input.configurationVerified
          ? "Configured user readback contains MeridianSupervisor with all required retained direct roles."
          : "Configured user post-state did not prove the role addition.",
    }),

    proofResult({
      requirement:
        permission,

      passed:
        input.permissionEffectVerified,

      observedAtUtc:
        input.observedAtUtc,

      sourceReference:
        input.permissionSourceReference,

      observedSummary:
        input.permissionEffectVerified
          ? "Configured role/resource graph proves all declared gained and retained permissions."
          : "Configured permission gain is not fully proven.",
    }),

    proofResult({
      requirement:
        runtime,

      passed:
        input.liveRuntimeConverged,

      observedAtUtc:
        input.observedAtUtc,

      sourceReference:
        input.liveRuntimeSourceReference,

      observedSummary:
        input.liveRuntimeConverged
          ? "Same connection stayed stale after grant; fresh process converged to all gained and retained permissions."
          : "Fresh runtime authority did not converge to the expected post-grant decisions.",
    }),

    proofResult({
      requirement:
        audit,

      passed:
        input.nativeAuditBound,

      observedAtUtc:
        input.observedAtUtc,

      sourceReference:
        input.nativeAuditSourceReference,

      observedSummary:
        input.nativeAuditBound
          ? "Exactly one native UserChange row is bound to adding MeridianSupervisor."
          : "Native UserChange audit evidence is not bound.",
    }),
  ]);
}

export function createP03UserAddRoleProofContract(
  dependencies:
    P03UserAddRoleContractDependencies,
): ProofContract<
  P03UserAddRoleIntent,
  P03UserAddRolePreflight,
  P03UserAddRoleExecution
> {
  const contract:
    ProofContract<
      P03UserAddRoleIntent,
      P03UserAddRolePreflight,
      P03UserAddRoleExecution
    > = {
    schemaVersion:
      PROOF_CONTRACT_SCHEMA_VERSION,

    contractId:
      P03_USER_ADD_ROLE_CONTRACT_ID,

    contractVersion:
      1,

    actionType:
      "USER_ADD_ROLE",

    domain:
      "PERMISSIONS",

    risk:
      "MEDIUM",

    reversibility:
      "REVERSIBLE",

    requiredAuthority:
      Object.freeze([
        Object.freeze({
          resource:
            "%Admin_Secure",

          permission:
            "U",

          standing:
            true,

          escalationOnly:
            false,
        }),
      ]),

    proofRequirements:
      P03_USER_ADD_ROLE_PROOF_REQUIREMENTS,

    target(
      intent,
    ) {
      assertIntent(
        intent,
      );

      return Object.freeze({
        kind:
          "USER",

        canonicalId:
          `user:${DEMO_FIXTURE_USERNAME}`,

        displayName:
          DEMO_FIXTURE_DISPLAY_NAME,

        fixtureId:
          DEMO_FIXTURE_ID,

        generation:
          intent.expectedFixtureGeneration,
      });
    },

    async preflight(
      context,
      intent,
    ) {
      void context;

      assertIntent(
        intent,
      );

      const preflight =
        await dependencies
          .readFreshPreflight(
            intent,
          );

      if (
        preflight.expectedFixtureGeneration !==
          intent.expectedFixtureGeneration ||
        !p03PrestateMatches(
          preflight,
        )
      ) {
        throw new ProofEngineError(
          "SAFETY_BLOCKED",
          "P03 requires exact isolated-user prestate, complete role graph, and live fixture credential.",
        );
      }

      return preflight;
    },

    expectedDelta(
      intent,
      preflight,
    ) {
      assertIntent(
        intent,
      );

      if (
        !p03PrestateMatches(
          preflight,
        )
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "P03 expected delta requires the exact pre-grant state.",
        );
      }

      return Object.freeze({
        summary:
          P03_USER_ADD_ROLE_DELTA_SUMMARY,

        before:
          Object.freeze({
            directRoles:
              Object.freeze([
                ...DEMO_FIXTURE_DIRECT_ROLES_AFTER,
              ]),

            gainedRolePresent:
              false,
          }),

        after:
          Object.freeze({
            directRoles:
              Object.freeze([
                ...DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
              ]),

            gainedRolePresent:
              true,
          }),
      });
    },

    async analyzeImpact(
      context,
      intent,
      preflight,
    ) {
      void context;

      assertIntent(
        intent,
      );

      if (
        !p03PrestateMatches(
          preflight,
        )
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "P03 impact analysis requires the exact pre-grant role graph.",
        );
      }

      return Object.freeze({
        certainty:
          "KNOWN" as const,

        summary:
          "P03 adds MeridianSupervisor to the isolated witness. The frozen role graph predicts four gained permissions while preserving existing portal, order-read, and Native SDK transport authority.",

        affectedEntities:
          Object.freeze([
            Object.freeze({
              kind:
                "USER",

              canonicalId:
                `user:${DEMO_FIXTURE_USERNAME}`,

              displayName:
                DEMO_FIXTURE_DISPLAY_NAME,

              effect:
                "Direct role MeridianSupervisor is added.",
            }),

            Object.freeze({
              kind:
                "ROLE",

              canonicalId:
                `role:${DEMO_FIXTURE_TARGET_ROLE}`,

              displayName:
                DEMO_FIXTURE_TARGET_ROLE,

              effect:
                "Inherited MeridianOperator and MeridianJobRunner authority becomes available on fresh runtime convergence.",
            }),
          ]),

        limitations:
          Object.freeze([
            "P03 is bound to the isolated synthetic witness user only.",
            "Configured role/resource impact is proven only for the frozen Meridian role graph.",
            "The same live IRIS process may remain stale after grant and therefore cannot count as convergence.",
            "Automatic retry is forbidden after an ambiguous PUT dispatch.",
          ]),
      });
    },

    digestPreflight(
      preflight,
    ) {
      return digestCanonicalJson(
        preflight,
      );
    },

    async revalidate(
      context:
        ActionContext,
      reviewed:
        ReviewedAction<
          P03UserAddRoleIntent,
          P03UserAddRolePreflight
        >,
    ) {
      void context;

      assertIntent(
        reviewed.intent,
      );

      try {
        const fresh =
          await dependencies
            .readFreshPreflight(
              reviewed.intent,
            );

        const freshDigest =
          digestCanonicalJson(
            fresh,
          );

        if (
          fresh.expectedFixtureGeneration !==
            reviewed.intent
              .expectedFixtureGeneration ||
          !p03PrestateMatches(
            fresh,
          )
        ) {
          return Object.freeze({
            outcome:
              "STALE" as const,

            freshPreflight:
              fresh,

            freshDigest,

            reason:
              "P03 user, role graph, or fixture-generation state changed after review; zero business PUT dispatched.",
          });
        }

        if (
          freshDigest !==
            reviewed.reviewedPreflightDigest
        ) {
          return Object.freeze({
            outcome:
              "STALE" as const,

            freshPreflight:
              fresh,

            freshDigest,

            reason:
              "P03 fresh preflight digest differs from the reviewed digest.",
          });
        }

        return Object.freeze({
          outcome:
            "MATCH" as const,

          freshPreflight:
            fresh,

          freshDigest,
        });
      }
      catch (
        error
      ) {
        const denied =
          mapAuthorityDenied(
            error,
          );

        if (
          denied !==
            null
        ) {
          return denied;
        }

        throw error;
      }
    },

    async execute(
      context,
      ready,
    ) {
      void context;

      assertIntent(
        ready.intent,
      );

      if (
        ready.reviewedPreflightDigest !==
          ready.freshRevalidationDigest
      ) {
        throw new ProofEngineError(
          "STALE_PRECONDITION",
          "P03 execute refused because reviewed and fresh preflight digests differ.",
        );
      }

      try {
        await dependencies
          .executeAdd(
            ready.intent,
          );
      }
      catch (
        error
      ) {
        if (
          error instanceof
            P03UserMutationUnknownAfterDispatchError
        ) {
          throw new ProofEngineError(
            "UNKNOWN_AFTER_DISPATCH",
            error.message,
            {
              automaticRetry:
                false,
            },
          );
        }

        throw error;
      }

      const after =
        await dependencies
          .readFreshPreflight(
            ready.intent,
          );

      if (
        !p03PoststateMatches(
          after,
        )
      ) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          "P03 PUT returned success but authoritative configured poststate is not exact. Automatic retry is forbidden.",
          {
            automaticRetry:
              false,
          },
        );
      }

      return execution(
        ready.intent
          .expectedFixtureGeneration,
        "DIRECT_EXECUTION",
      );
    },

    async reconcileUnknown(
      context,
      reviewed,
    ) {
      void context;

      assertIntent(
        reviewed.intent,
      );

      return reconcileUnknownP03UserAddRole(
        await dependencies
          .readFreshPreflight(
            reviewed.intent,
          ),
      );
    },

    async verify(
      context,
      executionResult,
    ) {
      void context;

      if (
        !executionResult
          .configurationVerified ||
        executionResult
          .mutationRequestCount !==
          1
      ) {
        throw new ProofEngineError(
          "PROOF_INCOMPLETE",
          "P03 execution evidence is incomplete.",
        );
      }

      return dependencies
        .collectProofResults(
          executionResult,
        );
    },

    buildRecoveryPlan(
      executionResult,
      results,
    ) {
      void executionResult;
      void results;

      return Object.freeze({
        recoveryActionType:
          "USER_REMOVE_ROLE",

        automatic:
          false as const,

        summary:
          "Use the separately certified P04 USER_REMOVE_ROLE proof contract after fresh review and revalidation.",
      });
    },
  };

  return Object.freeze(
    contract,
  );
}

export async function certifyP03UserAddRoleAction(
  input: {
    readonly intent:
      P03UserAddRoleIntent;

    readonly actionId:
      string;

    readonly receiptId:
      string;

    readonly logicalActor:
      string;

    readonly irisRuntimeUser:
      string;
  },
  dependencies:
    P03UserAddRoleCertificationDependencies,
): Promise<
  VerifiedActionCertificationResult<
    P03UserAddRoleExecution
  >
> {
  return certifyVerifiedAction(
    {
      contract:
        createP03UserAddRoleProofContract(
          dependencies.contract,
        ),

      intent:
        input.intent,

      actionId:
        input.actionId,

      receiptId:
        input.receiptId,

      parentChangeSetId:
        null,

      logicalActor:
        input.logicalActor,

      irisRuntimeUser:
        input.irisRuntimeUser,
    },
    dependencies.certification,
  );
}
