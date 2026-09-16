export type ImpactPermission =
  | "READ"
  | "WRITE"
  | "USE";

export interface ImpactPermissionRequirement {
  readonly resource:
    string;

  readonly permission:
    ImpactPermission;
}

export interface ImpactPermissionState
  extends ImpactPermissionRequirement {
  readonly allowed:
    boolean;
}

export interface ImpactAuthorizationSnapshot {
  readonly permissions:
    readonly ImpactPermissionState[];
}

export type ImpactClassification =
  | "LOST"
  | "RETAINED"
  | "GAINED"
  | "DENIED";

export interface WebApplicationDefinition {
  readonly name:
    string;

  readonly namespace:
    string;

  readonly enabled:
    boolean;

  readonly resource:
    string;

  readonly dispatchClass:
    string;
}

export interface ApplicationImpact {
  readonly name:
    string;

  readonly namespace:
    string;

  readonly resource:
    string;

  readonly dispatchClass:
    string;

  readonly requirement:
    ImpactPermissionRequirement;

  readonly beforeAllowed:
    boolean;

  readonly afterAllowed:
    boolean;

  readonly classification:
    ImpactClassification;

  readonly evidence:
    "OFFICIAL_SYSADMIN_APPLICATION_RESOURCE";
}

export interface DeployedRestOperation {
  readonly method:
    string;

  readonly path:
    string;

  readonly operationId:
    string;
}

export interface DeployedRestInventory {
  readonly swagger:
    "2.0";

  readonly basePath:
    string;

  readonly operations:
    readonly DeployedRestOperation[];
}

export interface DeclaredRestOperation {
  readonly method:
    string;

  readonly path:
    string;

  readonly operationId:
    string;

  readonly requiredResources:
    readonly ImpactPermissionRequirement[];
}

export interface RestOperationImpact
  extends DeployedRestOperation {
  readonly serviceRequirement:
    ImpactPermissionRequirement;

  readonly declaredRequirements:
    readonly ImpactPermissionRequirement[];

  readonly effectiveRequirements:
    readonly ImpactPermissionRequirement[];

  readonly beforeAllowed:
    boolean;

  readonly afterAllowed:
    boolean;

  readonly classification:
    ImpactClassification;

  readonly claim:
    "DECLARED_IMPACT";

  readonly deploymentTruth:
    "NATIVE_EMITTED_SWAGGER";

  readonly declarationTruth:
    "AUTHORITATIVE_SOURCE_OPENAPI";
}

export interface ImpactSummary {
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
}

export interface ImpactCoverage {
  readonly deployedOperationCount:
    number;

  readonly declaredOperationCount:
    number;

  readonly joinedOperationCount:
    number;

  readonly fullDeploymentDeclarationJoin:
    boolean;
}

export interface DeclaredImpactPreflight {
  readonly applications:
    readonly ApplicationImpact[];

  readonly restOperations:
    readonly RestOperationImpact[];

  readonly summary:
    ImpactSummary;

  readonly coverage:
    ImpactCoverage;
}

const HTTP_METHODS =
  new Set([
    "get",
    "post",
    "put",
    "patch",
    "delete",
    "head",
    "options",
  ]);

function isRecord(
  value:
    unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}

function requiredRecord(
  value:
    unknown,

  label:
    string,
): Record<
  string,
  unknown
> {
  if (!isRecord(value)) {
    throw new Error(
      `${label} must be an object.`,
    );
  }

  return value;
}

function requiredString(
  value:
    unknown,

  label:
    string,
): string {
  if (
    typeof value !==
      "string" ||
    value.trim().length ===
      0
  ) {
    throw new Error(
      `${label} must be a non-empty string.`,
    );
  }

  return value.trim();
}

function normalizePermission(
  value:
    string,
): ImpactPermission {
  switch (
    value.trim().toUpperCase()
  ) {
    case "R":
    case "READ":
      return "READ";

    case "W":
    case "WRITE":
      return "WRITE";

    case "U":
    case "USE":
      return "USE";

    default:
      throw new Error(
        `Unsupported permission: ${value}`,
      );
  }
}

export function parsePermissionRequirement(
  value:
    string,
): ImpactPermissionRequirement {
  const text =
    value.trim();

  const separator =
    text.lastIndexOf(
      ":",
    );

  if (
    separator <=
      0 ||
    separator >=
      text.length - 1
  ) {
    throw new Error(
      `Invalid required-resource declaration: ${value}`,
    );
  }

  return {
    resource:
      text
        .slice(
          0,
          separator,
        )
        .trim(),

    permission:
      normalizePermission(
        text.slice(
          separator + 1,
        ),
      ),
  };
}

function requiredResourceValues(
  value:
    unknown,

  label:
    string,
): readonly string[] {
  if (
    typeof value ===
      "string"
  ) {
    return [
      requiredString(
        value,
        label,
      ),
    ];
  }

  if (
    Array.isArray(
      value,
    )
  ) {
    if (
      value.length ===
        0 ||
      !value.every(
        (entry) =>
          typeof entry ===
            "string" &&
          entry.trim().length >
            0,
      )
    ) {
      throw new Error(
        `${label} must contain non-empty strings.`,
      );
    }

    return value.map(
      (entry) =>
        (
          entry as string
        ).trim(),
    );
  }

  throw new Error(
    `${label} must be a string or string array.`,
  );
}

function operationIdentity(
  operation: {
    readonly method:
      string;

    readonly path:
      string;

    readonly operationId:
      string;
  },
): string {
  return [
    operation.method
      .toUpperCase(),

    operation.path,

    operation.operationId,
  ].join(
    "|",
  );
}

function requirementIdentity(
  requirement:
    ImpactPermissionRequirement,
): string {
  return (
    `${requirement.resource}:${requirement.permission}`
  );
}

function permissionState(
  snapshot:
    ImpactAuthorizationSnapshot,

  requirement:
    ImpactPermissionRequirement,
): boolean {
  const matches =
    snapshot.permissions.filter(
      (entry) =>
        entry.resource ===
          requirement.resource &&
        entry.permission ===
          requirement.permission,
    );

  if (
    matches.length !==
      1
  ) {
    throw new Error(
      (
        "Authorization snapshot must contain exactly one " +
        `permission state for ${requirementIdentity(
          requirement,
        )}. Found ${matches.length}.`
      ),
    );
  }

  return matches[0].allowed;
}

function hasPermissionState(
  snapshot:
    ImpactAuthorizationSnapshot,

  requirement:
    ImpactPermissionRequirement,
): boolean {
  return snapshot.permissions.some(
    (entry) =>
      entry.resource ===
        requirement.resource &&
      entry.permission ===
        requirement.permission,
  );
}

function classify(
  before:
    boolean,

  after:
    boolean,
): ImpactClassification {
  if (
    before &&
    !after
  ) {
    return "LOST";
  }

  if (
    before &&
    after
  ) {
    return "RETAINED";
  }

  if (
    !before &&
    after
  ) {
    return "GAINED";
  }

  return "DENIED";
}

function deduplicateRequirements(
  requirements:
    readonly ImpactPermissionRequirement[],
): readonly ImpactPermissionRequirement[] {
  const seen =
    new Set<
      string
    >();

  const result:
    ImpactPermissionRequirement[] =
      [];

  for (
    const requirement
    of requirements
  ) {
    const key =
      requirementIdentity(
        requirement,
      );

    if (
      seen.has(
        key,
      )
    ) {
      continue;
    }

    seen.add(
      key,
    );

    result.push(
      requirement,
    );
  }

  return result;
}

export function parseDeclaredRestOperations(
  document:
    unknown,
): readonly DeclaredRestOperation[] {
  const root =
    requiredRecord(
      document,
      "OpenAPI declaration",
    );

  const paths =
    requiredRecord(
      root.paths,
      "OpenAPI paths",
    );

  const operations:
    DeclaredRestOperation[] =
      [];

  for (
    const [
      path,
      pathValue,
    ]
    of Object.entries(
      paths,
    )
  ) {
    const pathItem =
      requiredRecord(
        pathValue,
        `Path item ${path}`,
      );

    for (
      const [
        rawMethod,
        operationValue,
      ]
      of Object.entries(
        pathItem,
      )
    ) {
      const method =
        rawMethod.toLowerCase();

      if (
        !HTTP_METHODS.has(
          method,
        )
      ) {
        continue;
      }

      const operation =
        requiredRecord(
          operationValue,
          `${rawMethod.toUpperCase()} ${path}`,
        );

      const operationId =
        requiredString(
          operation.operationId,
          (
            `${rawMethod.toUpperCase()} ${path} operationId`
          ),
        );

      const rawRequired =
        operation[
          "x-ISC_RequiredResource"
        ];

      if (
        rawRequired ===
          undefined
      ) {
        throw new Error(
          (
            "Authoritative declaration is missing " +
            `x-ISC_RequiredResource for ${rawMethod.toUpperCase()} ${path}.`
          ),
        );
      }

      const requirements =
        requiredResourceValues(
          rawRequired,
          (
            `${rawMethod.toUpperCase()} ${path} x-ISC_RequiredResource`
          ),
        ).map(
          parsePermissionRequirement,
        );

      operations.push({
        method:
          method.toUpperCase(),

        path,

        operationId,

        requiredResources:
          requirements,
      });
    }
  }

  return operations.sort(
    (
      left,
      right,
    ) =>
      operationIdentity(
        left,
      ).localeCompare(
        operationIdentity(
          right,
        ),
      ),
  );
}

export function parseDeployedRestInventory(
  document:
    unknown,
): DeployedRestInventory {
  const root =
    requiredRecord(
      document,
      "Deployed Swagger",
    );

  const swagger =
    requiredString(
      root.swagger,
      "Deployed Swagger version",
    );

  if (
    swagger !==
      "2.0"
  ) {
    throw new Error(
      `Unsupported deployed Swagger version: ${swagger}`,
    );
  }

  const basePath =
    requiredString(
      root.basePath,
      "Deployed Swagger basePath",
    );

  const paths =
    requiredRecord(
      root.paths,
      "Deployed Swagger paths",
    );

  const operations:
    DeployedRestOperation[] =
      [];

  for (
    const [
      path,
      pathValue,
    ]
    of Object.entries(
      paths,
    )
  ) {
    const pathItem =
      requiredRecord(
        pathValue,
        `Deployed path ${path}`,
      );

    for (
      const [
        rawMethod,
        operationValue,
      ]
      of Object.entries(
        pathItem,
      )
    ) {
      const method =
        rawMethod.toLowerCase();

      if (
        !HTTP_METHODS.has(
          method,
        )
      ) {
        continue;
      }

      const operation =
        requiredRecord(
          operationValue,
          (
            `Deployed ${rawMethod.toUpperCase()} ${path}`
          ),
        );

      operations.push({
        method:
          method.toUpperCase(),

        path,

        operationId:
          requiredString(
            operation.operationId,
            (
              `Deployed ${rawMethod.toUpperCase()} ${path} operationId`
            ),
          ),
      });
    }
  }

  return {
    swagger:
      "2.0",

    basePath,

    operations:
      operations.sort(
        (
          left,
          right,
        ) =>
          operationIdentity(
            left,
          ).localeCompare(
            operationIdentity(
              right,
            ),
          ),
      ),
  };
}

function buildApplicationImpacts(
  input: {
    readonly current:
      ImpactAuthorizationSnapshot;

    readonly proposed:
      ImpactAuthorizationSnapshot;

    readonly applications:
      readonly WebApplicationDefinition[];
  },
): readonly ApplicationImpact[] {
  const impacts:
    ApplicationImpact[] =
      [];

  for (
    const application
    of input.applications
  ) {
    if (
      !application.enabled ||
      application.resource.trim().length ===
        0
    ) {
      continue;
    }

    const requirement:
      ImpactPermissionRequirement = {
        resource:
          application.resource,

        permission:
          "USE",
      };

    if (
      !hasPermissionState(
        input.current,
        requirement,
      ) ||
      !hasPermissionState(
        input.proposed,
        requirement,
      )
    ) {
      continue;
    }

    const beforeAllowed =
      permissionState(
        input.current,
        requirement,
      );

    const afterAllowed =
      permissionState(
        input.proposed,
        requirement,
      );

    impacts.push({
      name:
        application.name,

      namespace:
        application.namespace,

      resource:
        application.resource,

      dispatchClass:
        application.dispatchClass,

      requirement,

      beforeAllowed,

      afterAllowed,

      classification:
        classify(
          beforeAllowed,
          afterAllowed,
        ),

      evidence:
        "OFFICIAL_SYSADMIN_APPLICATION_RESOURCE",
    });
  }

  return impacts.sort(
    (
      left,
      right,
    ) =>
      left.name.localeCompare(
        right.name,
      ),
  );
}

function buildRestOperationImpacts(
  input: {
    readonly current:
      ImpactAuthorizationSnapshot;

    readonly proposed:
      ImpactAuthorizationSnapshot;

    readonly deployed:
      DeployedRestInventory;

    readonly declared:
      readonly DeclaredRestOperation[];

    readonly serviceRequirement:
      ImpactPermissionRequirement;
  },
): {
  readonly impacts:
    readonly RestOperationImpact[];

  readonly coverage:
    ImpactCoverage;
} {
  const declarationByIdentity =
    new Map<
      string,
      DeclaredRestOperation
    >();

  for (
    const declaration
    of input.declared
  ) {
    const identity =
      operationIdentity(
        declaration,
      );

    if (
      declarationByIdentity.has(
        identity,
      )
    ) {
      throw new Error(
        `Duplicate declared REST operation: ${identity}`,
      );
    }

    declarationByIdentity.set(
      identity,
      declaration,
    );
  }

  const deployedIdentities =
    new Set<
      string
    >();

  const impacts:
    RestOperationImpact[] =
      [];

  for (
    const deployed
    of input.deployed.operations
  ) {
    const identity =
      operationIdentity(
        deployed,
      );

    if (
      deployedIdentities.has(
        identity,
      )
    ) {
      throw new Error(
        `Duplicate deployed REST operation: ${identity}`,
      );
    }

    deployedIdentities.add(
      identity,
    );

    const declaration =
      declarationByIdentity.get(
        identity,
      );

    if (!declaration) {
      throw new Error(
        (
          "Deployed REST operation has no matching " +
          `authoritative declaration: ${identity}`
        ),
      );
    }

    const effectiveRequirements =
      deduplicateRequirements([
        input.serviceRequirement,
        ...declaration.requiredResources,
      ]);

    const beforeAllowed =
      effectiveRequirements.every(
        (requirement) =>
          permissionState(
            input.current,
            requirement,
          ),
      );

    const afterAllowed =
      effectiveRequirements.every(
        (requirement) =>
          permissionState(
            input.proposed,
            requirement,
          ),
      );

    impacts.push({
      ...deployed,

      serviceRequirement:
        input.serviceRequirement,

      declaredRequirements:
        declaration.requiredResources,

      effectiveRequirements,

      beforeAllowed,

      afterAllowed,

      classification:
        classify(
          beforeAllowed,
          afterAllowed,
        ),

      claim:
        "DECLARED_IMPACT",

      deploymentTruth:
        "NATIVE_EMITTED_SWAGGER",

      declarationTruth:
        "AUTHORITATIVE_SOURCE_OPENAPI",
    });
  }

  for (
    const declaration
    of input.declared
  ) {
    const identity =
      operationIdentity(
        declaration,
      );

    if (
      !deployedIdentities.has(
        identity,
      )
    ) {
      throw new Error(
        (
          "Authoritative declaration operation is not " +
          `present in deployed inventory: ${identity}`
        ),
      );
    }
  }

  const joinedOperationCount =
    impacts.length;

  const fullDeploymentDeclarationJoin =
    (
      joinedOperationCount ===
        input.deployed.operations.length &&
      joinedOperationCount ===
        input.declared.length
    );

  if (
    !fullDeploymentDeclarationJoin
  ) {
    throw new Error(
      "REST deployment/declaration join is incomplete.",
    );
  }

  return {
    impacts:
      impacts.sort(
        (
          left,
          right,
        ) =>
          operationIdentity(
            left,
          ).localeCompare(
            operationIdentity(
              right,
            ),
          ),
      ),

    coverage: {
      deployedOperationCount:
        input.deployed.operations.length,

      declaredOperationCount:
        input.declared.length,

      joinedOperationCount,

      fullDeploymentDeclarationJoin,
    },
  };
}

function classificationCount(
  classifications:
    readonly ImpactClassification[],

  target:
    ImpactClassification,
): number {
  return classifications.filter(
    (value) =>
      value ===
        target,
  ).length;
}

export function buildDeclaredImpactPreflight(
  input: {
    readonly current:
      ImpactAuthorizationSnapshot;

    readonly proposed:
      ImpactAuthorizationSnapshot;

    readonly applications:
      readonly WebApplicationDefinition[];

    readonly deployed:
      DeployedRestInventory;

    readonly declared:
      readonly DeclaredRestOperation[];
  },
): DeclaredImpactPreflight {
  const applications =
    buildApplicationImpacts({
      current:
        input.current,

      proposed:
        input.proposed,

      applications:
        input.applications,
    });

  const serviceApplications =
    input.applications.filter(
      (application) =>
        application.enabled &&
        application.name ===
          input.deployed.basePath,
    );

  if (
    serviceApplications.length !==
      1
  ) {
    throw new Error(
      (
        "Deployed REST basePath must map to exactly one " +
        `enabled web application. Found ${serviceApplications.length}.`
      ),
    );
  }

  const serviceApplication =
    serviceApplications[0];

  if (
    serviceApplication.resource.trim().length ===
      0
  ) {
    throw new Error(
      "Deployed REST web application has no configured Resource.",
    );
  }

  const serviceRequirement:
    ImpactPermissionRequirement = {
      resource:
        serviceApplication.resource,

      permission:
        "USE",
    };

  const rest =
    buildRestOperationImpacts({
      current:
        input.current,

      proposed:
        input.proposed,

      deployed:
        input.deployed,

      declared:
        input.declared,

      serviceRequirement,
    });

  const applicationClassifications =
    applications.map(
      (application) =>
        application.classification,
    );

  const restClassifications =
    rest.impacts.map(
      (operation) =>
        operation.classification,
    );

  return {
    applications,

    restOperations:
      rest.impacts,

    summary: {
      lostApplicationCount:
        classificationCount(
          applicationClassifications,
          "LOST",
        ),

      retainedApplicationCount:
        classificationCount(
          applicationClassifications,
          "RETAINED",
        ),

      gainedApplicationCount:
        classificationCount(
          applicationClassifications,
          "GAINED",
        ),

      lostRestOperationCount:
        classificationCount(
          restClassifications,
          "LOST",
        ),

      retainedRestOperationCount:
        classificationCount(
          restClassifications,
          "RETAINED",
        ),

      gainedRestOperationCount:
        classificationCount(
          restClassifications,
          "GAINED",
        ),
    },

    coverage:
      rest.coverage,
  };
}