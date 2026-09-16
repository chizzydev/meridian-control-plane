export type CanonicalPermissionName =
  | "READ"
  | "WRITE"
  | "USE";

export interface CanonicalPermissionState {
  readonly resource:
    string;

  readonly permission:
    string;

  readonly allowed:
    boolean;
}

export interface CanonicalRequirement {
  readonly resource:
    string;

  readonly permission:
    string;
}

export interface CanonicalAuthorizationState {
  readonly username:
    string;

  readonly enabled:
    boolean;

  readonly namespace:
    string;

  readonly directRoles:
    readonly string[];

  readonly effectiveRoles:
    readonly string[];

  readonly permissions:
    readonly CanonicalPermissionState[];
}

export interface CanonicalApplicationImpactInput {
  readonly name:
    string;

  readonly namespace:
    string;

  readonly resource:
    string;

  readonly dispatchClass:
    string;

  readonly requirement:
    CanonicalRequirement;

  readonly beforeAllowed:
    boolean;

  readonly afterAllowed:
    boolean;

  readonly classification:
    string;

  readonly evidence:
    string;
}

export interface CanonicalRestImpactInput {
  readonly method:
    string;

  readonly path:
    string;

  readonly operationId:
    string;

  readonly serviceRequirement:
    CanonicalRequirement;

  readonly declaredRequirements:
    readonly CanonicalRequirement[];

  readonly effectiveRequirements:
    readonly CanonicalRequirement[];

  readonly beforeAllowed:
    boolean;

  readonly afterAllowed:
    boolean;

  readonly classification:
    string;

  readonly claim:
    string;

  readonly deploymentTruth:
    string;

  readonly declarationTruth:
    string;
}

export interface CanonicalPreflightInput {
  readonly change: {
    readonly username:
      string;

    readonly operation:
      string;

    readonly role:
      string;
  };

  readonly current:
    CanonicalAuthorizationState;

  readonly proposed:
    CanonicalAuthorizationState;

  readonly lostEffectiveRoles:
    readonly string[];

  readonly gainedEffectiveRoles:
    readonly string[];

  readonly lostPermissions:
    readonly CanonicalRequirement[];

  readonly gainedPermissions:
    readonly CanonicalRequirement[];

  readonly retainedPermissions:
    readonly CanonicalRequirement[];

  readonly applications:
    readonly CanonicalApplicationImpactInput[];

  readonly restOperations:
    readonly CanonicalRestImpactInput[];

  readonly summary: {
    readonly lostApplicationCount:
      number;

    readonly retainedApplicationCount:
      number;

    readonly gainedApplicationCount:
      number;

    readonly lostRestOperationCount:
      number;

    readonly retainedRestOperationCount:
      number;

    readonly gainedRestOperationCount:
      number;
  };

  readonly coverage: {
    readonly deployedOperationCount:
      number;

    readonly declaredOperationCount:
      number;

    readonly joinedOperationCount:
      number;

    readonly fullDeploymentDeclarationJoin:
      boolean;
  };
}

export interface CanonicalPreflightMaterial {
  readonly schemaVersion:
    "meridian.preflight.v1";

  readonly change: {
    readonly username:
      string;

    readonly operation:
      string;

    readonly role:
      string;
  };

  readonly current:
    CanonicalAuthorizationState;

  readonly proposed:
    CanonicalAuthorizationState;

  readonly authorizationDelta: {
    readonly lostEffectiveRoles:
      readonly string[];

    readonly gainedEffectiveRoles:
      readonly string[];

    readonly retainedEffectiveRoles:
      readonly string[];

    readonly lostPermissions:
      readonly CanonicalRequirement[];

    readonly gainedPermissions:
      readonly CanonicalRequirement[];

    readonly retainedPermissions:
      readonly CanonicalRequirement[];
  };

  readonly applications:
    readonly CanonicalApplicationImpactInput[];

  readonly restOperations:
    readonly CanonicalRestImpactInput[];

  readonly summary:
    CanonicalPreflightInput["summary"];

  readonly coverage:
    CanonicalPreflightInput["coverage"];
}

function compareText(
  left:
    string,

  right:
    string,
): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function sortedStrings(
  values:
    readonly string[],
): string[] {
  return [
    ...values,
  ].sort(
    compareText,
  );
}

function requirementKey(
  value:
    CanonicalRequirement,
): string {
  return (
    `${value.resource}\u0000${value.permission}`
  );
}

function permissionStateKey(
  value:
    CanonicalPermissionState,
): string {
  return requirementKey(
    value,
  );
}

function canonicalRequirement(
  value:
    CanonicalRequirement,
): CanonicalRequirement {
  return {
    resource:
      value.resource,

    permission:
      value.permission.toUpperCase(),
  };
}

function canonicalRequirements(
  values:
    readonly CanonicalRequirement[],
): CanonicalRequirement[] {
  return values
    .map(
      canonicalRequirement,
    )
    .sort(
      (
        left,
        right,
      ) =>
        compareText(
          requirementKey(
            left,
          ),
          requirementKey(
            right,
          ),
        ),
    );
}

function canonicalPermissions(
  values:
    readonly CanonicalPermissionState[],
): CanonicalPermissionState[] {
  return values
    .map(
      (value) => ({
        resource:
          value.resource,

        permission:
          value.permission.toUpperCase(),

        allowed:
          value.allowed,
      }),
    )
    .sort(
      (
        left,
        right,
      ) =>
        compareText(
          permissionStateKey(
            left,
          ),
          permissionStateKey(
            right,
          ),
        ),
    );
}

function canonicalAuthorizationState(
  value:
    CanonicalAuthorizationState,
): CanonicalAuthorizationState {
  return {
    username:
      value.username,

    enabled:
      value.enabled,

    namespace:
      value.namespace,

    directRoles:
      sortedStrings(
        value.directRoles,
      ),

    effectiveRoles:
      sortedStrings(
        value.effectiveRoles,
      ),

    permissions:
      canonicalPermissions(
        value.permissions,
      ),
  };
}

function retainedRoles(
  current:
    readonly string[],

  proposed:
    readonly string[],
): string[] {
  const proposedSet =
    new Set(
      proposed,
    );

  return sortedStrings(
    current.filter(
      (role) =>
        proposedSet.has(
          role,
        ),
    ),
  );
}

function canonicalApplications(
  values:
    readonly CanonicalApplicationImpactInput[],
): CanonicalApplicationImpactInput[] {
  return values
    .map(
      (value) => ({
        name:
          value.name,

        namespace:
          value.namespace,

        resource:
          value.resource,

        dispatchClass:
          value.dispatchClass,

        requirement:
          canonicalRequirement(
            value.requirement,
          ),

        beforeAllowed:
          value.beforeAllowed,

        afterAllowed:
          value.afterAllowed,

        classification:
          value.classification,

        evidence:
          value.evidence,
      }),
    )
    .sort(
      (
        left,
        right,
      ) =>
        compareText(
          left.name,
          right.name,
        ),
    );
}

function operationKey(
  value: {
    readonly method:
      string;

    readonly path:
      string;

    readonly operationId:
      string;
  },
): string {
  return (
    `${value.method.toUpperCase()}\u0000${value.path}\u0000${value.operationId}`
  );
}

function canonicalRestOperations(
  values:
    readonly CanonicalRestImpactInput[],
): CanonicalRestImpactInput[] {
  return values
    .map(
      (value) => ({
        method:
          value.method.toUpperCase(),

        path:
          value.path,

        operationId:
          value.operationId,

        serviceRequirement:
          canonicalRequirement(
            value.serviceRequirement,
          ),

        declaredRequirements:
          canonicalRequirements(
            value.declaredRequirements,
          ),

        effectiveRequirements:
          canonicalRequirements(
            value.effectiveRequirements,
          ),

        beforeAllowed:
          value.beforeAllowed,

        afterAllowed:
          value.afterAllowed,

        classification:
          value.classification,

        claim:
          value.claim,

        deploymentTruth:
          value.deploymentTruth,

        declarationTruth:
          value.declarationTruth,
      }),
    )
    .sort(
      (
        left,
        right,
      ) =>
        compareText(
          operationKey(
            left,
          ),
          operationKey(
            right,
          ),
        ),
    );
}

export function buildCanonicalPreflightMaterial(
  input:
    CanonicalPreflightInput,
): CanonicalPreflightMaterial {
  const current =
    canonicalAuthorizationState(
      input.current,
    );

  const proposed =
    canonicalAuthorizationState(
      input.proposed,
    );

  return {
    schemaVersion:
      "meridian.preflight.v1",

    change: {
      username:
        input.change.username,

      operation:
        input.change.operation.toUpperCase(),

      role:
        input.change.role,
    },

    current,

    proposed,

    authorizationDelta: {
      lostEffectiveRoles:
        sortedStrings(
          input.lostEffectiveRoles,
        ),

      gainedEffectiveRoles:
        sortedStrings(
          input.gainedEffectiveRoles,
        ),

      retainedEffectiveRoles:
        retainedRoles(
          current.effectiveRoles,
          proposed.effectiveRoles,
        ),

      lostPermissions:
        canonicalRequirements(
          input.lostPermissions,
        ),

      gainedPermissions:
        canonicalRequirements(
          input.gainedPermissions,
        ),

      retainedPermissions:
        canonicalRequirements(
          input.retainedPermissions,
        ),
    },

    applications:
      canonicalApplications(
        input.applications,
      ),

    restOperations:
      canonicalRestOperations(
        input.restOperations,
      ),

    summary: {
      lostApplicationCount:
        input.summary.lostApplicationCount,

      retainedApplicationCount:
        input.summary.retainedApplicationCount,

      gainedApplicationCount:
        input.summary.gainedApplicationCount,

      lostRestOperationCount:
        input.summary.lostRestOperationCount,

      retainedRestOperationCount:
        input.summary.retainedRestOperationCount,

      gainedRestOperationCount:
        input.summary.gainedRestOperationCount,
    },

    coverage: {
      deployedOperationCount:
        input.coverage.deployedOperationCount,

      declaredOperationCount:
        input.coverage.declaredOperationCount,

      joinedOperationCount:
        input.coverage.joinedOperationCount,

      fullDeploymentDeclarationJoin:
        input.coverage.fullDeploymentDeclarationJoin,
    },
  };
}

export function canonicalPreflightJson(
  input:
    CanonicalPreflightInput,
): string {
  return JSON.stringify(
    buildCanonicalPreflightMaterial(
      input,
    ),
  );
}