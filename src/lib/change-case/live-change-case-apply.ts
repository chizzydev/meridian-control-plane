import {
  revalidateReadyForApply,
} from "./apply-revalidation";

import {
  freezeReviewedPreflight,
  type ReadyReviewedPreflight,
  type ReviewablePreflightForReady,
} from "./ready-preflight";

import {
  DEMO_FIXTURE_ID,
  DEMO_FIXTURE_TARGET_ROLE,
  DEMO_FIXTURE_USERNAME,
} from "./demo-fixture";

import type {
  DemoFixtureApplyResult,
} from "./demo-fixture-apply";

import {
  buildDurableChangeCaseEventMutation,
  type DurableChangeCaseEventMutation,
  type DurableChangeCaseRecord,
  type DurableChangeCaseSnapshot,
  type DurableEvidenceObject,
} from "./durable-change-case";

export const LIVE_APPLY_ORCHESTRATION_VERSION =
  "meridian.live-apply-orchestration.v1" as const;

export type LiveApplyOutcome =
  | {
      readonly state:
        "STALE";

      readonly mutationDispatchCount:
        0;

      readonly verified:
        false;

      readonly reason:
        string;

      readonly snapshot:
        DurableChangeCaseSnapshot;
    }
  | {
      readonly state:
        "APPLY_FAILED";

      readonly mutationDispatchCount:
        1;

      readonly verified:
        false;

      readonly reason:
        string;

      readonly snapshot:
        DurableChangeCaseSnapshot;
    }
  | {
      readonly state:
        "APPLIED";

      readonly mutationDispatchCount:
        1;

      readonly configuredVerified:
        true;

      readonly convergenceRequired:
        true;

      readonly auditBindingRequired:
        true;

      readonly verified:
        false;

      readonly snapshot:
        DurableChangeCaseSnapshot;
    };

export interface LiveChangeCaseApplyDependencies {
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

  readonly readFreshPreflight:
    (
      record:
        DurableChangeCaseRecord,
    ) => Promise<ReviewablePreflightForReady>;

  readonly executeMutation:
    (
      record:
        DurableChangeCaseRecord,
    ) => Promise<DemoFixtureApplyResult>;

  readonly nowUtc:
    () => string;

  readonly newApplyAttemptId:
    () => string;
}

export class LiveChangeCaseApplyRefusalError
  extends Error {
  constructor(
    readonly code:
      | "CASE_VERSION_CONFLICT"
      | "CASE_STATE_INVALID"
      | "CASE_AUTHORITY_INVALID"
      | "CASE_PREFLIGHT_INVALID"
      | "CASE_REVIEW_INVALID",
    message:
      string,
  ) {
    super(
      message,
    );

    this.name =
      "LiveChangeCaseApplyRefusalError";
  }
}

function evidenceObject(
  value:
    unknown,
  code:
    LiveChangeCaseApplyRefusalError["code"],
  message:
    string,
): Readonly<Record<string, unknown>> {
  if (
    typeof value !==
      "object" ||
    value ===
      null ||
    Array.isArray(
      value,
    )
  ) {
    throw new LiveChangeCaseApplyRefusalError(
      code,
      message,
    );
  }

  return value as
    Readonly<Record<string, unknown>>;
}

function stringField(
  object:
    Readonly<Record<string, unknown>>,
  key:
    string,
): string {
  const value =
    object[key];

  return typeof value ===
    "string"
    ? value
    : "";
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
    record.fixture.targetRole !==
      DEMO_FIXTURE_TARGET_ROLE ||
    record.intent.operation !==
      "REMOVE" ||
    record.intent.targetRole !==
      DEMO_FIXTURE_TARGET_ROLE
  ) {
    throw new LiveChangeCaseApplyRefusalError(
      "CASE_AUTHORITY_INVALID",
      "Live Apply refused a Change Case outside the fixed A3 synthetic authority.",
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
    throw new LiveChangeCaseApplyRefusalError(
      "CASE_VERSION_CONFLICT",
      `Live Apply case version conflict: expected ${expectedVersion}, current ${record.version}.`,
    );
  }
}

function preflightEvidence(
  preflight:
    ReviewablePreflightForReady,
): DurableEvidenceObject {
  return Object.freeze({
    evidenceVersion:
      LIVE_APPLY_ORCHESTRATION_VERSION,

    digestAlgorithm:
      preflight.digestAlgorithm,

    digest:
      preflight.digest,

    canonical:
      preflight.canonical,
  });
}

function readStoredPreflight(
  record:
    DurableChangeCaseRecord,
): ReviewablePreflightForReady {
  const evidence =
    evidenceObject(
      record.preflight,
      "CASE_PREFLIGHT_INVALID",
      "Durable Change Case is missing server-owned preflight evidence.",
    );

  const canonical =
    evidenceObject(
      evidence.canonical,
      "CASE_PREFLIGHT_INVALID",
      "Durable Change Case preflight canonical material is missing.",
    );

  const change =
    evidenceObject(
      canonical.change,
      "CASE_PREFLIGHT_INVALID",
      "Durable Change Case preflight change identity is missing.",
    );

  const digestAlgorithm =
    stringField(
      evidence,
      "digestAlgorithm",
    );

  const digest =
    stringField(
      evidence,
      "digest",
    );

  const schemaVersion =
    stringField(
      canonical,
      "schemaVersion",
    );

  const username =
    stringField(
      change,
      "username",
    );

  const operation =
    stringField(
      change,
      "operation",
    );

  const role =
    stringField(
      change,
      "role",
    );

  if (
    digestAlgorithm !==
      "SHA-256" ||
    !/^[A-F0-9]{64}$/.test(
      digest,
    ) ||
    schemaVersion !==
      "meridian.preflight.v1" ||
    username !==
      DEMO_FIXTURE_USERNAME ||
    operation !==
      "REMOVE" ||
    role !==
      DEMO_FIXTURE_TARGET_ROLE
  ) {
    throw new LiveChangeCaseApplyRefusalError(
      "CASE_PREFLIGHT_INVALID",
      "Durable Change Case preflight evidence does not match the fixed Apply contract.",
    );
  }

  return {
    state:
      "PREFLIGHTED",

    digestAlgorithm,

    digest,

    canonical: {
      schemaVersion,

      change: {
        username,
        operation,
        role,
      },
    },
  };
}

function readStoredReady(
  record:
    DurableChangeCaseRecord,
): ReadyReviewedPreflight {
  const preflight =
    readStoredPreflight(
      record,
    );

  const review =
    evidenceObject(
      record.review,
      "CASE_REVIEW_INVALID",
      "Durable Change Case is missing server-owned review evidence.",
    );

  const reviewedDigest =
    stringField(
      review,
      "reviewedDigest",
    );

  const reviewedAtUtc =
    stringField(
      review,
      "reviewedAtUtc",
    );

  try {
    return freezeReviewedPreflight({
      preflight,
      reviewedDigest,
      reviewedAtUtc,
    });
  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "unknown review error";

    throw new LiveChangeCaseApplyRefusalError(
      "CASE_REVIEW_INVALID",
      `Durable Change Case review evidence is invalid: ${message}`,
    );
  }
}

function detailJson(
  value:
    Readonly<Record<string, unknown>>,
): string {
  return JSON.stringify(
    value,
  );
}

async function append(
  snapshot:
    DurableChangeCaseSnapshot,
  dependencies:
    LiveChangeCaseApplyDependencies,
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

    readonly evidencePatch?:
      Parameters<
        typeof buildDurableChangeCaseEventMutation
      >[2]["evidencePatch"];
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
          detailJson(
            input.detail,
          ),

        evidencePatch:
          input.evidencePatch,
      },
    );

  return dependencies.appendEvent(
    mutation,
  );
}

export async function preflightLiveDemoChangeCaseCore(
  input: {
    readonly caseId:
      string;

    readonly expectedCaseVersion:
      number;
  },
  dependencies:
    LiveChangeCaseApplyDependencies,
): Promise<DurableChangeCaseSnapshot> {
  const snapshot =
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
      "PROPOSED" &&
    snapshot.record.state !==
      "STALE" &&
    snapshot.record.state !==
      "APPLY_FAILED"
  ) {
    throw new LiveChangeCaseApplyRefusalError(
      "CASE_STATE_INVALID",
      "Preflight requires PROPOSED, STALE, or APPLY_FAILED.",
    );
  }

  const freshPreflight =
    await dependencies.readFreshPreflight(
      snapshot.record,
    );

  return append(
    snapshot,
    dependencies,
    {
      eventType:
        "PREFLIGHT_COMPLETED",

      nextState:
        "PREFLIGHTED",

      detail: {
        digest:
          freshPreflight.digest,
        digestAlgorithm:
          freshPreflight.digestAlgorithm,
      },

      evidencePatch: {
        preflight:
          preflightEvidence(
            freshPreflight,
          ),
        review:
          null,
        applyAttempt:
          null,
      },
    },
  );
}

export async function reviewLiveDemoChangeCaseCore(
  input: {
    readonly caseId:
      string;

    readonly expectedCaseVersion:
      number;

    readonly reviewedDigest:
      string;
  },
  dependencies:
    LiveChangeCaseApplyDependencies,
): Promise<DurableChangeCaseSnapshot> {
  const snapshot =
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
      "PREFLIGHTED"
  ) {
    throw new LiveChangeCaseApplyRefusalError(
      "CASE_STATE_INVALID",
      "Review requires PREFLIGHTED.",
    );
  }

  const preflight =
    readStoredPreflight(
      snapshot.record,
    );

  const reviewedAtUtc =
    dependencies.nowUtc();

  let ready:
    ReadyReviewedPreflight;

  try {
    ready =
      freezeReviewedPreflight({
        preflight,
        reviewedDigest:
          input.reviewedDigest,
        reviewedAtUtc,
      });
  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "unknown review error";

    throw new LiveChangeCaseApplyRefusalError(
      "CASE_REVIEW_INVALID",
      `Review refused: ${message}`,
    );
  }

  return append(
    snapshot,
    dependencies,
    {
      eventType:
        "REVIEW_ACCEPTED",

      nextState:
        "READY",

      detail: {
        reviewedDigest:
          ready.reviewedDigest,
      },

      evidencePatch: {
        review:
          Object.freeze({
            evidenceVersion:
              LIVE_APPLY_ORCHESTRATION_VERSION,
            reviewedDigest:
              ready.reviewedDigest,
            reviewedAtUtc:
              ready.reviewedAtUtc,
            canonicalSchema:
              ready.canonicalSchema,
            applyRequiresFreshRevalidation:
              true,
          }),
      },
    },
  );
}

export async function applyLiveDemoChangeCaseCore(
  input: {
    readonly caseId:
      string;

    readonly expectedCaseVersion:
      number;
  },
  dependencies:
    LiveChangeCaseApplyDependencies,
): Promise<LiveApplyOutcome> {
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
      "READY"
  ) {
    throw new LiveChangeCaseApplyRefusalError(
      "CASE_STATE_INVALID",
      "Apply requires READY.",
    );
  }

  const ready =
    readStoredReady(
      snapshot.record,
    );

  let freshPreflight:
    ReviewablePreflightForReady;

  try {
    freshPreflight =
      await dependencies.readFreshPreflight(
        snapshot.record,
      );
  } catch (
    error
  ) {
    const reason =
      error instanceof Error
        ? error.message
        : "FRESH_PREFLIGHT_UNAVAILABLE";

    snapshot =
      await append(
        snapshot,
        dependencies,
        {
          eventType:
            "APPLY_REVALIDATION_STALE",
          nextState:
            "STALE",
          detail: {
            reason:
              "FRESH_PREFLIGHT_UNAVAILABLE",
            error:
              reason,
            mutationDispatchCount:
              0,
          },
        },
      );

    return Object.freeze({
      state:
        "STALE" as const,
      mutationDispatchCount:
        0 as const,
      verified:
        false as const,
      reason:
        "FRESH_PREFLIGHT_UNAVAILABLE",
      snapshot,
    });
  }

  const decision =
    revalidateReadyForApply({
      ready,
      freshPreflight,
    });

  if (
    decision.state ===
      "STALE"
  ) {
    snapshot =
      await append(
        snapshot,
        dependencies,
        {
          eventType:
            "APPLY_REVALIDATION_STALE",
          nextState:
            "STALE",
          detail: {
            reason:
              decision.reason,
            reviewedDigest:
              decision.reviewedDigest,
            freshDigest:
              decision.freshDigest,
            mutationDispatchCount:
              0,
          },
          evidencePatch: {
            preflight:
              preflightEvidence(
                freshPreflight,
              ),
          },
        },
      );

    return Object.freeze({
      state:
        "STALE" as const,
      mutationDispatchCount:
        0 as const,
      verified:
        false as const,
      reason:
        decision.reason,
      snapshot,
    });
  }

  snapshot =
    await append(
      snapshot,
      dependencies,
      {
        eventType:
          "APPLY_REVALIDATION_MATCHED",
        nextState:
          "READY",
        detail: {
          reviewedDigest:
            decision.reviewedDigest,
          freshDigest:
            decision.freshDigest,
          digestMatch:
            true,
        },
        evidencePatch: {
          preflight:
            preflightEvidence(
              freshPreflight,
            ),
        },
      },
    );

  const applyAttemptId =
    dependencies.newApplyAttemptId();

  const startedAtUtc =
    dependencies.nowUtc();

  snapshot =
    await append(
      snapshot,
      dependencies,
      {
        eventType:
          "APPLY_ATTEMPT_STARTED",
        nextState:
          "READY",
        detail: {
          applyAttemptId,
          mutationDispatchCount:
            0,
        },
        evidencePatch: {
          applyAttempt:
            Object.freeze({
              applyAttemptId,
              startedAtUtc,
              completionClassification:
                "STARTED",
              mutationDispatchCount:
                0,
              verified:
                false,
            }),
        },
      },
    );

  const mutationResult =
    await dependencies.executeMutation(
      snapshot.record,
    );

  if (
    mutationResult.state ===
      "APPLY_FAILED"
  ) {
    snapshot =
      await append(
        snapshot,
        dependencies,
        {
          eventType:
            "APPLY_FAILED",
          nextState:
            "APPLY_FAILED",
          detail: {
            applyAttemptId,
            outcome:
              mutationResult.outcome,
            reason:
              mutationResult.reason,
            mutationDispatchCount:
              1,
            automaticRetry:
              false,
          },
          evidencePatch: {
            applyAttempt:
              Object.freeze({
                applyAttemptId,
                startedAtUtc,
                completedAtUtc:
                  dependencies.nowUtc(),
                completionClassification:
                  "APPLY_FAILED",
                outcome:
                  mutationResult.outcome,
                reason:
                  mutationResult.reason,
                mutationDispatchCount:
                  1,
                automaticRetry:
                  false,
                verified:
                  false,
              }),
          },
        },
      );

    return Object.freeze({
      state:
        "APPLY_FAILED" as const,
      mutationDispatchCount:
        1 as const,
      verified:
        false as const,
      reason:
        mutationResult.reason,
      snapshot,
    });
  }

  snapshot =
    await append(
      snapshot,
      dependencies,
      {
        eventType:
          "APPLY_SUCCEEDED",
        nextState:
          "READY",
        detail: {
          applyAttemptId,
          mutationDispatchCount:
            1,
          configuredVerified:
            true,
        },
        evidencePatch: {
          applyAttempt:
            Object.freeze({
              applyAttemptId,
              startedAtUtc,
              completedAtUtc:
                dependencies.nowUtc(),
              completionClassification:
                "APPLIED",
              mutationDispatchCount:
                1,
              configuredVerified:
                true,
              beforeDirectRoles:
                mutationResult.beforeDirectRoles,
              afterDirectRoles:
                mutationResult.afterDirectRoles,
              convergenceRequired:
                true,
              auditBindingRequired:
                true,
              verified:
                false,
            }),
        },
      },
    );

  snapshot =
    await append(
      snapshot,
      dependencies,
      {
        eventType:
          "CONFIGURED_STATE_VERIFIED",
        nextState:
          "APPLIED",
        detail: {
          applyAttemptId,
          configuredVerified:
            true,
          convergenceRequired:
            true,
          auditBindingRequired:
            true,
          verified:
            false,
        },
      },
    );

  return Object.freeze({
    state:
      "APPLIED" as const,
    mutationDispatchCount:
      1 as const,
    configuredVerified:
      true as const,
    convergenceRequired:
      true as const,
    auditBindingRequired:
      true as const,
    verified:
      false as const,
    snapshot,
  });
}
