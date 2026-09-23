import {
  DEMO_FIXTURE_ID,
  DEMO_FIXTURE_NAMESPACE,
  DEMO_FIXTURE_TRANSPORT_ROLE,
  DEMO_FIXTURE_USERNAME,
} from "./demo-fixture";

import {
  buildDurableChangeCaseEventMutation,
  type DurableChangeCaseEventMutation,
  type DurableChangeCaseRecord,
  type DurableChangeCaseSnapshot,
  type DurableEvidenceObject,
} from "./durable-change-case";

export const LIVE_CONVERGENCE_SCHEMA_VERSION =
  "meridian.live-convergence.v1" as const;

export const LIVE_WITNESS_OBSERVATION_SCHEMA_VERSION =
  "meridian.live-witness-observation.v1" as const;

export const LIVE_WITNESS_PROCESS_PURPOSE_PREFIX =
  "meridian:process-witness:" as const;

export const LIVE_WITNESS_PROCESS_PURPOSE_MAX_BYTES =
  64 as const;

export function liveWitnessProcessPurposeMarker(
  generation:
    string,
): string {
  const canonical =
    generation.trim();

  if (
    canonical.length ===
      0 ||
    canonical !==
      generation
  ) {
    throw new Error(
      "Live witness generation must be nonblank canonical text.",
    );
  }

  const marker =
    `${LIVE_WITNESS_PROCESS_PURPOSE_PREFIX}${canonical}`;

  if (
    marker.length >
      LIVE_WITNESS_PROCESS_PURPOSE_MAX_BYTES
  ) {
    throw new Error(
      "Live witness process purpose marker exceeds the frozen 64-byte ASCII envelope.",
    );
  }

  return marker;
}

export const LIVE_WITNESS_LOST_PERMISSION_KEYS =
  Object.freeze([
    "Meridian_Admin:USE",
    "%Admin_Task:USE",
    "Meridian_Orders:WRITE",
    "Meridian_Jobs:USE",
  ] as const);

export const LIVE_WITNESS_RETAINED_PERMISSION_KEYS =
  Object.freeze([
    "Meridian_Portal:USE",
    "Meridian_Orders:READ",
  ] as const);

export const LIVE_WITNESS_TRANSPORT_PERMISSION_KEYS =
  Object.freeze([
    "%Native_GlobalAccess:USE",
    "%Native_ClassExecution:USE",
    "%Native_Transaction:USE",
    "%Native_Concurrency:USE",
  ] as const);

export const LIVE_WITNESS_REQUIRED_PERMISSION_KEYS =
  Object.freeze([
    ...LIVE_WITNESS_LOST_PERMISSION_KEYS,
    ...LIVE_WITNESS_RETAINED_PERMISSION_KEYS,
    ...LIVE_WITNESS_TRANSPORT_PERMISSION_KEYS,
  ] as const);

export type LiveWitnessPermissionKey =
  (typeof LIVE_WITNESS_REQUIRED_PERMISSION_KEYS)[number];

export type LiveWitnessDecision =
  "ALLOW" |
  "DENY";

export type LiveWitnessClassification =
  "PRE_APPLY" |
  "STALE" |
  "CONVERGED";

export interface LiveWitnessSelfSnapshot {
  readonly capturedAtUtc:
    string;

  readonly generation:
    string;

  readonly purposeMarker:
    string;

  readonly username:
    string;

  readonly namespace:
    string;

  readonly serverPid:
    number;

  readonly usingSharedMemory:
    boolean;

  readonly checks:
    Readonly<
      Record<
        LiveWitnessPermissionKey,
        0 | 1
      >
    >;
}

export interface LiveWitnessProcessRow {
  readonly pid:
    number;

  readonly username:
    string;

  readonly loginRoles:
    readonly string[];

  readonly roles:
    readonly string[];

  readonly namespace:
    string;

  readonly startTimeUtc:
    string;

  readonly clientIPAddress:
    string;

  readonly startupClientIPAddress:
    string;

  readonly purposeMarker:
    string;

  readonly canBeSuspended:
    boolean;

  readonly canBeTerminated:
    boolean;

  readonly state:
    string;
}

export interface LiveWitnessPermissionObservation {
  readonly key:
    LiveWitnessPermissionKey;

  readonly expected:
    LiveWitnessDecision;

  readonly configured:
    LiveWitnessDecision;

  readonly live:
    LiveWitnessDecision;
}

export interface LiveWitnessObservation {
  readonly schemaVersion:
    typeof LIVE_WITNESS_OBSERVATION_SCHEMA_VERSION;

  readonly observationId:
    string;

  readonly observedAtUtc:
    string;

  readonly phase:
    LiveWitnessClassification;

  readonly fixtureId:
    typeof DEMO_FIXTURE_ID;

  readonly expectedFixtureGeneration:
    string;

  readonly username:
    typeof DEMO_FIXTURE_USERNAME;

  readonly namespace:
    typeof DEMO_FIXTURE_NAMESPACE;

  readonly serverPid:
    number;

  readonly startTimeUtc:
    string;

  readonly loginRoles:
    readonly string[];

  readonly roles:
    readonly string[];

  readonly clientIPAddress:
    string;

  readonly startupClientIPAddress:
    string;

  readonly permissions:
    readonly LiveWitnessPermissionObservation[];

  readonly lostPermissionMismatchCount:
    number;

  readonly everyRequiredDecisionMatchesExpected:
    boolean;

  readonly verified:
    false;
}

export interface LiveConvergenceDependencies {
  readonly readCase:
    (
      caseId:
        string,
    ) => Promise<DurableChangeCaseSnapshot>;

  readonly appendEvent:
    (
      mutation:
        DurableChangeCaseEventMutation,
    ) => Promise<DurableChangeCaseSnapshot>;

  readonly nowUtc:
    () => string;

  readonly newObservationId:
    () => string;
}

export interface LiveConvergenceAdvanceDependencies
  extends LiveConvergenceDependencies {
  readonly closeOldWitness:
    (
      staleObservation:
        LiveWitnessObservation,
    ) => Promise<{
      readonly closedAtUtc:
        string;
    }>;

  readonly proveOldPidGone:
    (
      staleObservation:
        LiveWitnessObservation,
    ) => Promise<{
      readonly observedAtUtc:
        string;

      readonly oldPid:
        number;

      readonly userProcessCount:
        0;
    }>;

  readonly openFreshWitness:
    (
      record:
        DurableChangeCaseRecord,
      staleObservation:
        LiveWitnessObservation,
    ) => Promise<LiveWitnessObservation>;
}

export class LiveConvergenceRefusalError
  extends Error {
  constructor(
    readonly code:
      | "CASE_VERSION_CONFLICT"
      | "CASE_STATE_INVALID"
      | "CASE_AUTHORITY_INVALID"
      | "LIVE_WITNESS_INVALID"
      | "LIVE_WITNESS_NOT_STALE"
      | "LIVE_WITNESS_NOT_CONVERGED",
    message:
      string,
  ) {
    super(
      message,
    );

    this.name =
      "LiveConvergenceRefusalError";
  }
}

function isObject(
  value:
    unknown,
): value is Readonly<Record<string, unknown>> {
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

function sortedUnique(
  values:
    readonly string[],
): readonly string[] {
  return Object.freeze(
    [
      ...new Set(
        values.map(
          (value) =>
            value.trim(),
        ).filter(Boolean),
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

function normalizeConfiguredPermissionKey(
  value:
    string,
): string {
  const trimmed =
    value.trim();

  const splitAt =
    trimmed.lastIndexOf(
      ":",
    );

  if (
    splitAt <=
      0
  ) {
    return trimmed;
  }

  const resource =
    trimmed.slice(
      0,
      splitAt,
    );

  const rawPermission =
    trimmed.slice(
      splitAt +
      1,
    ).toUpperCase();

  const permission =
    rawPermission ===
      "U"
      ? "USE"
      : rawPermission ===
          "R"
        ? "READ"
        : rawPermission ===
            "W"
          ? "WRITE"
          : rawPermission;

  return `${resource}:${permission}`;
}

function preflightExpectedModel(
  record:
    DurableChangeCaseRecord,
): ReadonlyMap<
  LiveWitnessPermissionKey,
  LiveWitnessDecision
> {
  if (
    !isObject(
      record.preflight,
    )
  ) {
    throw new LiveConvergenceRefusalError(
      "LIVE_WITNESS_INVALID",
      "Live convergence requires durable preflight evidence.",
    );
  }

  const canonical =
    record.preflight.canonical;

  if (
    !isObject(
      canonical,
    )
  ) {
    throw new LiveConvergenceRefusalError(
      "LIVE_WITNESS_INVALID",
      "Live convergence requires canonical durable preflight evidence.",
    );
  }

  const delta =
    canonical.expectedAuthorizationDelta;

  if (
    !isObject(
      delta,
    )
  ) {
    throw new LiveConvergenceRefusalError(
      "LIVE_WITNESS_INVALID",
      "Live convergence requires the preflight authorization delta.",
    );
  }

  const lost =
    delta.lostConfiguredPermissions;

  const retained =
    delta.retainedConfiguredPermissions;

  if (
    !Array.isArray(
      lost,
    ) ||
    !Array.isArray(
      retained,
    ) ||
    lost.some(
      (value) =>
        typeof value !==
          "string",
    ) ||
    retained.some(
      (value) =>
        typeof value !==
          "string",
    )
  ) {
    throw new LiveConvergenceRefusalError(
      "LIVE_WITNESS_INVALID",
      "Live convergence preflight permission lists are invalid.",
    );
  }

  const lostSet =
    new Set(
      (
        lost as string[]
      ).map(
        normalizeConfiguredPermissionKey,
      ),
    );

  const retainedSet =
    new Set(
      (
        retained as string[]
      ).map(
        normalizeConfiguredPermissionKey,
      ),
    );

  const expected =
    new Map<
      LiveWitnessPermissionKey,
      LiveWitnessDecision
    >();

  for (
    const key
    of LIVE_WITNESS_LOST_PERMISSION_KEYS
  ) {
    if (
      !lostSet.has(
        key,
      )
    ) {
      throw new LiveConvergenceRefusalError(
        "LIVE_WITNESS_INVALID",
        `Durable preflight no longer identifies lost permission ${key}.`,
      );
    }

    expected.set(
      key,
      "DENY",
    );
  }

  for (
    const key
    of LIVE_WITNESS_RETAINED_PERMISSION_KEYS
  ) {
    if (
      !retainedSet.has(
        key,
      )
    ) {
      throw new LiveConvergenceRefusalError(
        "LIVE_WITNESS_INVALID",
        `Durable preflight no longer identifies retained permission ${key}.`,
      );
    }

    expected.set(
      key,
      "ALLOW",
    );
  }

  for (
    const key
    of LIVE_WITNESS_TRANSPORT_PERMISSION_KEYS
  ) {
    if (
      !retainedSet.has(
        key,
      )
    ) {
      throw new LiveConvergenceRefusalError(
        "LIVE_WITNESS_INVALID",
        `Durable preflight no longer identifies retained transport permission ${key}.`,
      );
    }

    expected.set(
      key,
      "ALLOW",
    );
  }

  return expected;
}

function assertCaseAuthority(
  record:
    DurableChangeCaseRecord,
): void {
  if (
    record.mode !==
      "LIVE_ISOLATED_DEMO" ||
    record.fixture.fixtureId !==
      DEMO_FIXTURE_ID ||
    record.fixture.username !==
      DEMO_FIXTURE_USERNAME ||
    record.fixture.expectedGeneration.trim().length ===
      0
  ) {
    throw new LiveConvergenceRefusalError(
      "CASE_AUTHORITY_INVALID",
      "Live convergence refused a Change Case outside the fixed A3 fixture authority.",
    );
  }
}

function assertVersion(
  record:
    DurableChangeCaseRecord,
  expectedVersion:
    number,
): void {
  if (
    record.version !==
      expectedVersion
  ) {
    throw new LiveConvergenceRefusalError(
      "CASE_VERSION_CONFLICT",
      `Live convergence version conflict: expected ${expectedVersion}, current ${record.version}.`,
    );
  }
}

function decisionFromCheck(
  value:
    0 | 1,
): LiveWitnessDecision {
  return value ===
    1
    ? "ALLOW"
    : "DENY";
}

function assertRawWitnessBinding(
  record:
    DurableChangeCaseRecord,
  self:
    LiveWitnessSelfSnapshot,
  processRows:
    readonly LiveWitnessProcessRow[],
): LiveWitnessProcessRow {
  const expectedGeneration =
    record.fixture.expectedGeneration;

  const expectedPurposeMarker =
    liveWitnessProcessPurposeMarker(
      expectedGeneration,
    );

  if (
    self.generation !==
      expectedGeneration ||
    self.purposeMarker !==
      expectedPurposeMarker
  ) {
    throw new LiveConvergenceRefusalError(
      "LIVE_WITNESS_INVALID",
      "Direct live witness generation or process purpose marker drifted.",
    );
  }

  if (
    self.username.toLowerCase() !==
      DEMO_FIXTURE_USERNAME.toLowerCase() ||
    self.namespace.toUpperCase() !==
      DEMO_FIXTURE_NAMESPACE ||
    self.usingSharedMemory ||
    !Number.isSafeInteger(
      self.serverPid,
    ) ||
    self.serverPid <=
      0
  ) {
    throw new LiveConvergenceRefusalError(
      "LIVE_WITNESS_INVALID",
      "Direct live witness identity does not match the fixed A3 fixture.",
    );
  }

  const matchingRows =
    processRows.filter(
      (row) =>
        row.pid ===
          self.serverPid &&
        row.username.toLowerCase() ===
          DEMO_FIXTURE_USERNAME.toLowerCase(),
    );

  if (
    matchingRows.length !==
      1 ||
    processRows.length !==
      1
  ) {
    throw new LiveConvergenceRefusalError(
      "LIVE_WITNESS_INVALID",
      "Independent ProcessQuery did not bind exactly one synthetic witness process.",
    );
  }

  const row =
    matchingRows[0];

  if (
    row.namespace.toUpperCase() !==
      DEMO_FIXTURE_NAMESPACE
  ) {
    throw new LiveConvergenceRefusalError(
      "LIVE_WITNESS_INVALID",
      "Independent ProcessQuery witness namespace drifted.",
    );
  }

  if (
    row.startTimeUtc.trim().length ===
      0 ||
    row.purposeMarker !==
      expectedPurposeMarker
  ) {
    throw new LiveConvergenceRefusalError(
      "LIVE_WITNESS_INVALID",
      "Independent ProcessQuery witness start identity or purpose marker drifted.",
    );
  }

  if (
    !row.roles.some(
      (role) =>
        role ===
          DEMO_FIXTURE_TRANSPORT_ROLE,
    ) &&
    !row.loginRoles.some(
      (role) =>
        role ===
          DEMO_FIXTURE_TRANSPORT_ROLE,
    )
  ) {
    throw new LiveConvergenceRefusalError(
      "LIVE_WITNESS_INVALID",
      "Independent ProcessQuery witness lost the fixed transport role.",
    );
  }

  if (
    record.fixture.expectedGeneration.trim().length ===
      0
  ) {
    throw new LiveConvergenceRefusalError(
      "LIVE_WITNESS_INVALID",
      "Witness generation binding is blank.",
    );
  }

  return row;
}

export function buildPreApplyWitnessBaseline(
  input: {
    readonly record:
      DurableChangeCaseRecord;

    readonly observationId:
      string;

    readonly self:
      LiveWitnessSelfSnapshot;

    readonly processRows:
      readonly LiveWitnessProcessRow[];
  },
): LiveWitnessObservation {
  assertCaseAuthority(
    input.record,
  );

  if (
    input.record.state !==
      "READY"
  ) {
    throw new LiveConvergenceRefusalError(
      "CASE_STATE_INVALID",
      "Pre-Apply live witness baseline requires READY.",
    );
  }

  const row =
    assertRawWitnessBinding(
      input.record,
      input.self,
      input.processRows,
    );

  const permissions =
    LIVE_WITNESS_REQUIRED_PERMISSION_KEYS.map(
      (
        key,
      ): LiveWitnessPermissionObservation => {
        const live =
          decisionFromCheck(
            input.self.checks[
              key
            ],
          );

        if (
          live !==
            "ALLOW"
        ) {
          throw new LiveConvergenceRefusalError(
            "LIVE_WITNESS_INVALID",
            `Pre-Apply live witness baseline denied required permission ${key}.`,
          );
        }

        return Object.freeze({
          key,
          expected:
            "ALLOW" as const,
          configured:
            "ALLOW" as const,
          live,
        });
      },
    );

  return Object.freeze({
    schemaVersion:
      LIVE_WITNESS_OBSERVATION_SCHEMA_VERSION,

    observationId:
      input.observationId,

    observedAtUtc:
      input.self.capturedAtUtc,

    phase:
      "PRE_APPLY" as const,

    fixtureId:
      DEMO_FIXTURE_ID,

    expectedFixtureGeneration:
      input.record.fixture.expectedGeneration,

    username:
      DEMO_FIXTURE_USERNAME,

    namespace:
      DEMO_FIXTURE_NAMESPACE,

    serverPid:
      input.self.serverPid,

    startTimeUtc:
      row.startTimeUtc,

    loginRoles:
      sortedUnique(
        row.loginRoles,
      ),

    roles:
      sortedUnique(
        row.roles,
      ),

    clientIPAddress:
      row.clientIPAddress,

    startupClientIPAddress:
      row.startupClientIPAddress,

    permissions:
      Object.freeze(
        permissions,
      ),

    lostPermissionMismatchCount:
      0,

    everyRequiredDecisionMatchesExpected:
      true,

    verified:
      false as const,
  });
}

export function buildPostApplyWitnessObservation(
  input: {
    readonly record:
      DurableChangeCaseRecord;

    readonly observationId:
      string;

    readonly phase:
      "STALE" | "CONVERGED";

    readonly self:
      LiveWitnessSelfSnapshot;

    readonly processRows:
      readonly LiveWitnessProcessRow[];
  },
): LiveWitnessObservation {
  assertCaseAuthority(
    input.record,
  );

  if (
    input.record.state !==
      "APPLIED" &&
    input.record.state !==
      "CONVERGING"
  ) {
    throw new LiveConvergenceRefusalError(
      "CASE_STATE_INVALID",
      "Post-Apply live witness observation requires APPLIED or CONVERGING.",
    );
  }

  const row =
    assertRawWitnessBinding(
      input.record,
      input.self,
      input.processRows,
    );

  const expected =
    preflightExpectedModel(
      input.record,
    );

  const permissions =
    LIVE_WITNESS_REQUIRED_PERMISSION_KEYS.map(
      (
        key,
      ): LiveWitnessPermissionObservation => {
        const expectedDecision =
          expected.get(
            key,
          );

        if (!expectedDecision) {
          throw new LiveConvergenceRefusalError(
            "LIVE_WITNESS_INVALID",
            `No expected live decision exists for ${key}.`,
          );
        }

        return Object.freeze({
          key,
          expected:
            expectedDecision,
          configured:
            expectedDecision,
          live:
            decisionFromCheck(
              input.self.checks[
                key
              ],
            ),
        });
      },
    );

  const lostMismatchCount =
    permissions.filter(
      (row) =>
        (
          LIVE_WITNESS_LOST_PERMISSION_KEYS as readonly string[]
        ).includes(
          row.key,
        ) &&
        row.live !==
          row.expected,
    ).length;

  const everyMatch =
    permissions.every(
      (row) =>
        row.live ===
          row.expected,
    );

  if (
    input.phase ===
      "STALE"
  ) {
    const exactStale =
      lostMismatchCount ===
        LIVE_WITNESS_LOST_PERMISSION_KEYS.length &&
      permissions.every(
        (row) =>
          (
            LIVE_WITNESS_LOST_PERMISSION_KEYS as readonly string[]
          ).includes(
            row.key,
          )
            ? row.live ===
                "ALLOW"
            : row.live ===
                "ALLOW",
      );

    if (!exactStale) {
      throw new LiveConvergenceRefusalError(
        "LIVE_WITNESS_NOT_STALE",
        "Existing synthetic witness did not reproduce the exact scoped stale-authorization pattern.",
      );
    }
  } else if (!everyMatch) {
    throw new LiveConvergenceRefusalError(
      "LIVE_WITNESS_NOT_CONVERGED",
      "Fresh synthetic witness still disagrees with expected configured authorization.",
    );
  }

  return Object.freeze({
    schemaVersion:
      LIVE_WITNESS_OBSERVATION_SCHEMA_VERSION,

    observationId:
      input.observationId,

    observedAtUtc:
      input.self.capturedAtUtc,

    phase:
      input.phase,

    fixtureId:
      DEMO_FIXTURE_ID,

    expectedFixtureGeneration:
      input.record.fixture.expectedGeneration,

    username:
      DEMO_FIXTURE_USERNAME,

    namespace:
      DEMO_FIXTURE_NAMESPACE,

    serverPid:
      input.self.serverPid,

    startTimeUtc:
      row.startTimeUtc,

    loginRoles:
      sortedUnique(
        row.loginRoles,
      ),

    roles:
      sortedUnique(
        row.roles,
      ),

    clientIPAddress:
      row.clientIPAddress,

    startupClientIPAddress:
      row.startupClientIPAddress,

    permissions:
      Object.freeze(
        permissions,
      ),

    lostPermissionMismatchCount:
      lostMismatchCount,

    everyRequiredDecisionMatchesExpected:
      everyMatch,

    verified:
      false as const,
  });
}

function evidence(
  observation:
    LiveWitnessObservation,
): DurableEvidenceObject {
  return observation as unknown as
    DurableEvidenceObject;
}

async function append(
  snapshot:
    DurableChangeCaseSnapshot,
  dependencies:
    LiveConvergenceDependencies,
  input: {
    readonly eventType:
      Parameters<
        typeof buildDurableChangeCaseEventMutation
      >[2]["eventType"];

    readonly nextState:
      Parameters<
        typeof buildDurableChangeCaseEventMutation
      >[2]["nextState"];

    readonly detail:
      Readonly<Record<string, unknown>>;

    readonly liveObservations?:
      readonly LiveWitnessObservation[];
  },
): Promise<DurableChangeCaseSnapshot> {
  const mutation =
    buildDurableChangeCaseEventMutation(
      snapshot.record,
      snapshot.events.length,
      {
        expectedVersion:
          snapshot.record.version,

        eventType:
          input.eventType,

        nextState:
          input.nextState,

        occurredAtUtc:
          dependencies.nowUtc(),

        detailJson:
          JSON.stringify(
            input.detail,
          ),

        evidencePatch:
          input.liveObservations
            ? {
                liveObservations:
                  input.liveObservations.map(
                    evidence,
                  ),
              }
            : undefined,
      },
    );

  return dependencies.appendEvent(
    mutation,
  );
}

function liveObservationsFromRecord(
  record:
    DurableChangeCaseRecord,
): readonly LiveWitnessObservation[] {
  return record.liveObservations as unknown as
    readonly LiveWitnessObservation[];
}

function latestStaleObservation(
  record:
    DurableChangeCaseRecord,
): LiveWitnessObservation {
  const observations =
    liveObservationsFromRecord(
      record,
    );

  const stale =
    [
      ...observations,
    ].reverse().find(
      (observation) =>
        observation.phase ===
          "STALE",
    );

  if (!stale) {
    throw new LiveConvergenceRefusalError(
      "LIVE_WITNESS_INVALID",
      "CONVERGING case is missing the stale live witness observation.",
    );
  }

  return stale;
}

export async function recordStaleLiveWitnessCore(
  input: {
    readonly caseId:
      string;

    readonly expectedCaseVersion:
      number;

    readonly preApplyBaseline:
      LiveWitnessObservation;

    readonly staleObservation:
      LiveWitnessObservation;
  },
  dependencies:
    LiveConvergenceDependencies,
): Promise<{
  readonly state:
    "CONVERGING";

  readonly verified:
    false;

  readonly staleServerPid:
    number;

  readonly snapshot:
    DurableChangeCaseSnapshot;
}> {
  let snapshot =
    await dependencies.readCase(
      input.caseId,
    );

  assertCaseAuthority(
    snapshot.record,
  );

  assertVersion(
    snapshot.record,
    input.expectedCaseVersion,
  );

  if (
    snapshot.record.state !==
      "APPLIED"
  ) {
    throw new LiveConvergenceRefusalError(
      "CASE_STATE_INVALID",
      "Stale live witness recording requires APPLIED.",
    );
  }

  if (
    input.preApplyBaseline.phase !==
      "PRE_APPLY" ||
    input.staleObservation.phase !==
      "STALE" ||
    input.preApplyBaseline.expectedFixtureGeneration !==
      snapshot.record.fixture.expectedGeneration ||
    input.staleObservation.expectedFixtureGeneration !==
      snapshot.record.fixture.expectedGeneration ||
    input.preApplyBaseline.serverPid !==
      input.staleObservation.serverPid
  ) {
    throw new LiveConvergenceRefusalError(
      "LIVE_WITNESS_INVALID",
      "Stale live witness did not preserve the exact pre-Apply process identity.",
    );
  }

  if (
    input.staleObservation.lostPermissionMismatchCount !==
      LIVE_WITNESS_LOST_PERMISSION_KEYS.length ||
    input.staleObservation.everyRequiredDecisionMatchesExpected
  ) {
    throw new LiveConvergenceRefusalError(
      "LIVE_WITNESS_NOT_STALE",
      "Stale live witness evidence does not prove configured-vs-live disagreement.",
    );
  }

  snapshot =
    await append(
      snapshot,
      dependencies,
      {
        eventType:
          "LIVE_STALE_OBSERVED",

        nextState:
          "CONVERGING",

        detail: {
          schemaVersion:
            LIVE_CONVERGENCE_SCHEMA_VERSION,

          oldServerPid:
            input.staleObservation.serverPid,

          configuredMatchesExpected:
            true,

          liveLostPermissionMismatchCount:
            input.staleObservation.lostPermissionMismatchCount,

          status:
            "NOT_VERIFIED",

          processKillAvailable:
            false,

          receiptClosureAllowed:
            false,
        },

        liveObservations: [
          ...liveObservationsFromRecord(
            snapshot.record,
          ),
          input.preApplyBaseline,
          input.staleObservation,
        ],
      },
    );

  return Object.freeze({
    state:
      "CONVERGING" as const,

    verified:
      false as const,

    staleServerPid:
      input.staleObservation.serverPid,

    snapshot,
  });
}

export async function advanceLiveConvergenceCore(
  input: {
    readonly caseId:
      string;

    readonly expectedCaseVersion:
      number;
  },
  dependencies:
    LiveConvergenceAdvanceDependencies,
): Promise<{
  readonly state:
    "AUDIT_PENDING";

  readonly verified:
    false;

  readonly oldServerPid:
    number;

  readonly freshServerPid:
    number;

  readonly snapshot:
    DurableChangeCaseSnapshot;
}> {
  let snapshot =
    await dependencies.readCase(
      input.caseId,
    );

  assertCaseAuthority(
    snapshot.record,
  );

  assertVersion(
    snapshot.record,
    input.expectedCaseVersion,
  );

  if (
    snapshot.record.state !==
      "CONVERGING"
  ) {
    throw new LiveConvergenceRefusalError(
      "CASE_STATE_INVALID",
      "Controlled witness advance requires CONVERGING.",
    );
  }

  const stale =
    latestStaleObservation(
      snapshot.record,
    );

  const closed =
    await dependencies.closeOldWitness(
      stale,
    );

  snapshot =
    await append(
      snapshot,
      dependencies,
      {
        eventType:
          "OLD_WITNESS_CLOSED",

        nextState:
          "CONVERGING",

        detail: {
          oldServerPid:
            stale.serverPid,

          closedAtUtc:
            closed.closedAtUtc,

          closeMethod:
            "NORMAL_CONNECTION_CLOSE",

          processKillUsed:
            false,
        },
      },
    );

  const gone =
    await dependencies.proveOldPidGone(
      stale,
    );

  if (
    gone.oldPid !==
      stale.serverPid ||
    gone.userProcessCount !==
      0
  ) {
    throw new LiveConvergenceRefusalError(
      "LIVE_WITNESS_INVALID",
      "Old synthetic witness PID disappearance was not independently proven.",
    );
  }

  snapshot =
    await append(
      snapshot,
      dependencies,
      {
        eventType:
          "OLD_PID_GONE",

        nextState:
          "CONVERGING",

        detail: {
          oldServerPid:
            stale.serverPid,

          observedAtUtc:
            gone.observedAtUtc,

          userProcessCount:
            gone.userProcessCount,

          independentlyObserved:
            true,
        },
      },
    );

  const fresh =
    await dependencies.openFreshWitness(
      snapshot.record,
      stale,
    );

  if (
    fresh.phase !==
      "CONVERGED" ||
    fresh.serverPid ===
      stale.serverPid ||
    !fresh.everyRequiredDecisionMatchesExpected ||
    fresh.lostPermissionMismatchCount !==
      0
  ) {
    throw new LiveConvergenceRefusalError(
      "LIVE_WITNESS_NOT_CONVERGED",
      "Fresh synthetic witness did not prove exact authorization convergence.",
    );
  }

  snapshot =
    await append(
      snapshot,
      dependencies,
      {
        eventType:
          "FRESH_WITNESS_BOUND",

        nextState:
          "CONVERGING",

        detail: {
          oldServerPid:
            stale.serverPid,

          freshServerPid:
            fresh.serverPid,

          freshPidDiffers:
            true,

          authenticatedUsername:
            fresh.username,

          expectedFixtureGeneration:
            fresh.expectedFixtureGeneration,
        },

        liveObservations: [
          ...liveObservationsFromRecord(
            snapshot.record,
          ),
          fresh,
        ],
      },
    );

  snapshot =
    await append(
      snapshot,
      dependencies,
      {
        eventType:
          "LIVE_CONVERGED",

        nextState:
          "CONVERGING",

        detail: {
          freshServerPid:
            fresh.serverPid,

          everyRequiredDecisionMatchesExpected:
            true,

          lostPermissionMismatchCount:
            0,

          configuredAndLiveAgree:
            true,

          auditStillRequired:
            true,

          verified:
            false,
        },
      },
    );

  snapshot =
    await append(
      snapshot,
      dependencies,
      {
        eventType:
          "AUDIT_PENDING",

        nextState:
          "AUDIT_PENDING",

        detail: {
          convergenceComplete:
            true,

          nativeAuditBound:
            false,

          receiptClosureAllowed:
            false,

          verified:
            false,
        },
      },
    );

  return Object.freeze({
    state:
      "AUDIT_PENDING" as const,

    verified:
      false as const,

    oldServerPid:
      stale.serverPid,

    freshServerPid:
      fresh.serverPid,

    snapshot,
  });
}
