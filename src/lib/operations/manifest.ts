import rawManifest
  from "./sysadmin-manifest.generated.json";

export const OPERATION_SUPPORT_STATUSES =
  Object.freeze([
    "CERTIFIED_ACTION",
    "VERIFIED_READ",
    "EXPLORABLE_READ",
    "DECLINED_DESTRUCTIVE",
    "UNAVAILABLE_RUNTIME",
    "OUT_OF_PRODUCT_SCOPE",
  ] as const);

export type OperationSupportStatus =
  (typeof OPERATION_SUPPORT_STATUSES)[number];

export const MANAGEMENT_FAMILIES =
  Object.freeze([
    "WEB_REST",
    "PERMISSIONS",
    "SECURITY_SECRETS",
    "TASKS",
    "SYSTEM_OS",
    "LOGS",
  ] as const);

export type ManagementFamily =
  (typeof MANAGEMENT_FAMILIES)[number];

export interface ManifestQueryParameter {
  readonly name:
    string;

  readonly required:
    boolean;

  readonly schemaType:
    string;

  readonly description:
    string;
}

export interface SysAdminOperation {
  readonly id:
    string;

  readonly method:
    "GET" |
    "POST" |
    "PUT" |
    "DELETE" |
    "HEAD";

  readonly path:
    string;

  readonly summary:
    string;

  readonly tags:
    readonly string[];

  readonly family:
    ManagementFamily;

  readonly supportStatus:
    OperationSupportStatus;

  readonly scopeNote:
    string;

  readonly releaseTrack:
    string | null;

  readonly plannedActionIds:
    readonly string[];

  readonly certifiedActionIds:
    readonly string[];

  readonly requiredAuthorityExpression:
    string | null;

  readonly authorityOptions:
    readonly (
      readonly string[]
    )[];

  readonly queryParameters:
    readonly ManifestQueryParameter[];

  readonly hasRequestBody:
    boolean;
}

export interface SysAdminOperationManifest {
  readonly schemaVersion:
    "meridian.sysadmin-operation-manifest.v1";

  readonly generatedFrom: {
    readonly repository:
      string;

    readonly commit:
      string;

    readonly blobSha:
      string;

    readonly sourceSha256:
      string;

    readonly path:
      string;

    readonly openapiVersion:
      string;

    readonly apiVersion:
      string;

    readonly sourceOperationCount:
      number;

    readonly primaryOperationCount:
      number;

    readonly protocolCompanionCount:
      number;

    readonly primaryMethods:
      readonly string[];

    readonly companionMethods:
      readonly string[];

    readonly countRule:
      string;
  };

  readonly counts: {
    readonly byMethod:
      Readonly<
        Record<
          string,
          number
        >
      >;

    readonly byFamily:
      Readonly<
        Record<
          string,
          number
        >
      >;

    readonly byStatus:
      Readonly<
        Record<
          string,
          number
        >
      >;
  };

  readonly mutationRegistry: {
    readonly requiredActionCount:
      number;

    readonly actionIds:
      readonly string[];
  };

  readonly operations:
    readonly SysAdminOperation[];

  readonly protocolCompanions:
    readonly SysAdminOperation[];
}

function assertManifest(
  value:
    unknown,
): asserts value is SysAdminOperationManifest {
  if (
    typeof value !==
      "object" ||
    value ===
      null ||
    Array.isArray(
      value,
    )
  ) {
    throw new Error(
      "SysAdmin operation manifest must be an object.",
    );
  }

  const candidate =
    value as
      Partial<
        SysAdminOperationManifest
      >;

  if (
    candidate.schemaVersion !==
      "meridian.sysadmin-operation-manifest.v1" ||
    candidate.generatedFrom
      ?.primaryOperationCount !==
      273 ||
    candidate.generatedFrom
      ?.sourceOperationCount !==
      276 ||
    candidate.generatedFrom
      ?.protocolCompanionCount !==
      3 ||
    candidate.mutationRegistry
      ?.requiredActionCount !==
      32 ||
    !Array.isArray(
      candidate.operations,
    ) ||
    candidate.operations.length !==
      273 ||
    !Array.isArray(
      candidate.protocolCompanions,
    ) ||
    candidate.protocolCompanions.length !==
      3
  ) {
    throw new Error(
      "SysAdmin operation manifest does not satisfy the frozen R2 contract.",
    );
  }
}

assertManifest(
  rawManifest,
);

export const sysAdminOperationManifest:
  SysAdminOperationManifest =
  Object.freeze(
    rawManifest,
  );

const operationById =
  new Map(
    sysAdminOperationManifest
      .operations
      .map(
        (
          operation,
        ) => [
          operation.id,
          operation,
        ] as const,
      ),
  );

const companionById =
  new Map(
    sysAdminOperationManifest
      .protocolCompanions
      .map(
        (
          operation,
        ) => [
          operation.id,
          operation,
        ] as const,
      ),
  );

const knownPaths =
  new Set(
    [
      ...sysAdminOperationManifest
        .operations
        .map(
          (
            operation,
          ) =>
            operation.path,
        ),
      ...sysAdminOperationManifest
        .protocolCompanions
        .map(
          (
            operation,
          ) =>
            operation.path,
        ),
    ],
  );

export function findSysAdminOperation(
  id:
    string,
): SysAdminOperation | null {
  return (
    operationById.get(
      id,
    ) ??
    companionById.get(
      id,
    ) ??
    null
  );
}

export function isKnownSysAdminPath(
  path:
    string,
): boolean {
  return knownPaths.has(
    path,
  );
}
