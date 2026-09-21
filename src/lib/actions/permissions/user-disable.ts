import {
  DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
  DEMO_FIXTURE_DISPLAY_NAME,
  DEMO_FIXTURE_ID,
  DEMO_FIXTURE_NAMESPACE,
  DEMO_FIXTURE_USERNAME,
} from "../../change-case/demo-fixture";

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
  P06UserAuthorityDeniedError,
  P06UserMutationUnknownAfterDispatchError,
  type P06UserSnapshot,
} from "../../iris/user-disable-action-transport";

export const P06_USER_DISABLE_CONTRACT_ID =
  "meridian.permissions.user-disable.v1" as const;

export const P06_USER_DISABLE_EXECUTION_SCHEMA_VERSION =
  "meridian.user-disable-execution.v1" as const;

export const P06_USER_DISABLE_COMMENT =
  "Meridian R4 P06 isolated user-disable witness" as const;

export const P06_USER_DISABLE_DELTA_SUMMARY =
  "Disable the exact isolated Meridian witness user through one official PUT /v2/security/user, preserving every other observed Security.Users field. Prove the same credential authenticates with HTTP 200 and owns one real Native SDK IRIS process before disablement; close that witness normally and prove its PID disappears before dispatch; then prove HTTP 401, zero fresh Native processes, and one native UserChange true-to-false audit row after disablement." as const;

export const P06_PRESERVED_SECURITY_FIELD_COUNT = 15 as const;

export interface P06UserDisableIntent {
  readonly actionId: "P06_USER_DISABLE";
  readonly fixtureId: typeof DEMO_FIXTURE_ID;
  readonly username: typeof DEMO_FIXTURE_USERNAME;
  readonly expectedFixtureGeneration: string;
}

export interface P06UserDisablePreflight {
  readonly schemaVersion: "meridian.user-disable-preflight.v1";
  readonly fixtureId: typeof DEMO_FIXTURE_ID;
  readonly expectedFixtureGeneration: string;
  readonly user: P06UserSnapshot | null;
  readonly credentialPresent: boolean;
  readonly credentialLoginStatus: 200 | 401;
  readonly liveProcessCount: number;
  readonly officialMutationOperation: "PUT /v2/security/user";
  readonly requiredAuthority: "%Admin_Secure:U";
  readonly authorityMode: "CURRENT_STANDING_RUNTIME_AUTHORITY";
}

export interface P06UserDisableExecution {
  readonly schemaVersion: typeof P06_USER_DISABLE_EXECUTION_SCHEMA_VERSION;
  readonly state: "APPLIED";
  readonly actionId: "P06_USER_DISABLE";
  readonly fixtureId: typeof DEMO_FIXTURE_ID;
  readonly generation: string;
  readonly username: typeof DEMO_FIXTURE_USERNAME;
  readonly beforeEnabled: true;
  readonly afterEnabled: false;
  readonly preservedSecurityFieldCount: typeof P06_PRESERVED_SECURITY_FIELD_COUNT;
  readonly beforeLoginStatus: 200;
  readonly afterLoginStatus: 401;
  readonly mutationRequestCount: 1;
  readonly configurationVerified: true;
  readonly resolutionSource:
    "DIRECT_EXECUTION" |
    "AUTHORITATIVE_RECONCILIATION_READBACK";
}

export interface P06UserDisableEvidenceInput {
  readonly observedAtUtc: string;
  readonly configurationVerified: boolean;
  readonly httpBehaviorVerified: boolean;
  readonly nativeDisableRuntimeVerified: boolean;
  readonly nativeAuditBound: boolean;
  readonly configurationSourceReference: string | null;
  readonly httpSourceReference: string | null;
  readonly liveRuntimeSourceReference: string | null;
  readonly nativeAuditSourceReference: string | null;
}

export interface P06UserDisableContractDependencies {
  readonly readFreshPreflight:
    (intent: P06UserDisableIntent) => Promise<P06UserDisablePreflight>;

  readonly executeDisable:
    (intent: P06UserDisableIntent) => Promise<void>;

  readonly collectProofResults:
    (execution: P06UserDisableExecution) => Promise<readonly ProofResult[]>;
}

export interface P06UserDisableCertificationDependencies {
  readonly contract: P06UserDisableContractDependencies;
  readonly certification:
    VerifiedActionCertificationDependencies<P06UserDisablePreflight>;
}

export const P06_USER_DISABLE_PROOF_REQUIREMENTS:
  readonly ProofRequirement[] =
  Object.freeze([
    Object.freeze({
      requirementId: "p06-configured-user-readback",
      plane: "CONFIGURATION_READBACK",
      applicability: "REQUIRED",
      description:
        "Authoritative SysAdmin user readback has Enabled=false and every other observed Security.Users field exactly matches the reviewed enabled prestate.",
      source: "IRIS SysAdmin API GET /v2/security/user",
    }),
    Object.freeze({
      requirementId: "p06-same-credential-http-authentication",
      plane: "HTTP_BEHAVIOR",
      applicability: "REQUIRED",
      description:
        "The exact same in-memory synthetic credential receives HTTP 200 before disablement and HTTP 401 only after the reviewed disable mutation.",
      source: "IRIS SysAdmin API POST /login",
    }),
    Object.freeze({
      requirementId: "p06-native-disable-runtime",
      plane: "LIVE_RUNTIME",
      applicability: "REQUIRED",
      description:
        "Before disablement, the same synthetic credential owns one real Native SDK IRIS process; that witness exits normally and its PID disappears before dispatch, and a fresh post-disable Native SDK authentication attempt is rejected with zero surviving fixture processes.",
      source: "Meridian Native SDK witness + IRIS ProcessQuery",
    }),
    Object.freeze({
      requirementId: "p06-native-userchange-audit",
      plane: "NATIVE_AUDIT",
      applicability: "REQUIRED",
      description:
        "Exactly one native IRIS UserChange audit row is bound to the isolated witness user changing from enabled to disabled, using the localization-independent single-field boolean transition parser.",
      source: "IRIS native UserChange audit",
    }),
  ]);

function sorted(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values)].sort((left, right) => left.localeCompare(right)),
  );
}

function sameStrings(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));
}

function allowedNeverExpiresDate(value: string): boolean {
  return value === "" || value === "1840-12-31";
}

function safeEnabledUserMatches(user: P06UserSnapshot | null): boolean {
  return (
    user !== null &&
    user.username === DEMO_FIXTURE_USERNAME &&
    user.fullName === DEMO_FIXTURE_DISPLAY_NAME &&
    user.namespace === DEMO_FIXTURE_NAMESPACE &&
    user.enabled === true &&
    user.accountNeverExpires === true &&
    user.passwordNeverExpires === true &&
    user.changePassword === false &&
    user.autheEnabled === 0 &&
    user.hotpKeyDisplay === false &&
    user.emailAddress === "" &&
    user.phoneNumber === "" &&
    user.phoneProvider === "" &&
    allowedNeverExpiresDate(user.expirationDate) &&
    user.routine === "" &&
    sameStrings(user.roles, DEMO_FIXTURE_DIRECT_ROLES_BEFORE) &&
    user.escalationRoles.length === 0 &&
    user.comment === P06_USER_DISABLE_COMMENT
  );
}

function withoutEnabled(
  user: P06UserSnapshot,
): Readonly<Omit<P06UserSnapshot, "enabled">> {
  const {
    enabled: _enabled,
    ...rest
  } = user;

  void _enabled;

  return Object.freeze(rest);
}

export function p06ObservedFieldsPreserved(
  before: P06UserSnapshot,
  after: P06UserSnapshot,
): boolean {
  return (
    digestCanonicalJson(withoutEnabled(before)) ===
    digestCanonicalJson(withoutEnabled(after))
  );
}

export function p06PrestateMatches(
  preflight: P06UserDisablePreflight,
): boolean {
  return (
    preflight.fixtureId === DEMO_FIXTURE_ID &&
    preflight.expectedFixtureGeneration.trim().length > 0 &&
    preflight.credentialPresent &&
    preflight.credentialLoginStatus === 200 &&
    preflight.liveProcessCount === 1 &&
    preflight.officialMutationOperation === "PUT /v2/security/user" &&
    preflight.requiredAuthority === "%Admin_Secure:U" &&
    preflight.authorityMode === "CURRENT_STANDING_RUNTIME_AUTHORITY" &&
    safeEnabledUserMatches(preflight.user)
  );
}

export function p06PoststateMatches(
  preflight: P06UserDisablePreflight,
  reviewedUser: P06UserSnapshot,
): boolean {
  return (
    preflight.fixtureId === DEMO_FIXTURE_ID &&
    preflight.expectedFixtureGeneration.trim().length > 0 &&
    preflight.credentialPresent &&
    preflight.credentialLoginStatus === 401 &&
    preflight.liveProcessCount === 0 &&
    preflight.user !== null &&
    reviewedUser.enabled === true &&
    preflight.user.enabled === false &&
    p06ObservedFieldsPreserved(reviewedUser, preflight.user)
  );
}

export function p06ExpectedDisabledUserSnapshot(
  expirationDate = "",
): P06UserSnapshot {
  if (!allowedNeverExpiresDate(expirationDate)) {
    throw new Error("P06 expected fixture expiration date is outside the frozen never-expires representations.");
  }

  return Object.freeze({
    username: DEMO_FIXTURE_USERNAME,
    accountNeverExpires: true,
    autheEnabled: 0,
    changePassword: false,
    comment: P06_USER_DISABLE_COMMENT,
    emailAddress: "",
    enabled: false,
    expirationDate,
    fullName: DEMO_FIXTURE_DISPLAY_NAME,
    hotpKeyDisplay: false,
    namespace: DEMO_FIXTURE_NAMESPACE,
    passwordNeverExpires: true,
    phoneNumber: "",
    phoneProvider: "",
    roles: Object.freeze([...DEMO_FIXTURE_DIRECT_ROLES_BEFORE]),
    escalationRoles: Object.freeze([]),
    routine: "",
  });
}

export function p06ExpectedEnabledUserSnapshot(
  expirationDate = "",
): P06UserSnapshot {
  return Object.freeze({
    ...p06ExpectedDisabledUserSnapshot(expirationDate),
    enabled: true,
  });
}

function assertIntent(intent: P06UserDisableIntent): void {
  if (
    intent.actionId !== "P06_USER_DISABLE" ||
    intent.fixtureId !== DEMO_FIXTURE_ID ||
    intent.username !== DEMO_FIXTURE_USERNAME ||
    intent.expectedFixtureGeneration.trim().length === 0
  ) {
    throw new ProofEngineError(
      "INVALID_TARGET",
      "P06 intent is outside the frozen isolated witness boundary.",
    );
  }
}

export function p06UserDisableIntent(
  generation: string,
): P06UserDisableIntent {
  const trimmed = generation.trim();

  if (trimmed.length === 0) {
    throw new Error("P06 fixture generation is required.");
  }

  return Object.freeze({
    actionId: "P06_USER_DISABLE" as const,
    fixtureId: DEMO_FIXTURE_ID,
    username: DEMO_FIXTURE_USERNAME,
    expectedFixtureGeneration: trimmed,
  });
}

function execution(
  generation: string,
  source: P06UserDisableExecution["resolutionSource"],
): P06UserDisableExecution {
  return Object.freeze({
    schemaVersion: P06_USER_DISABLE_EXECUTION_SCHEMA_VERSION,
    state: "APPLIED" as const,
    actionId: "P06_USER_DISABLE" as const,
    fixtureId: DEMO_FIXTURE_ID,
    generation,
    username: DEMO_FIXTURE_USERNAME,
    beforeEnabled: true as const,
    afterEnabled: false as const,
    preservedSecurityFieldCount: P06_PRESERVED_SECURITY_FIELD_COUNT,
    beforeLoginStatus: 200 as const,
    afterLoginStatus: 401 as const,
    mutationRequestCount: 1 as const,
    configurationVerified: true as const,
    resolutionSource: source,
  });
}

function mapAuthorityDenied(
  error: unknown,
): RevalidationDecision<P06UserDisablePreflight> | null {
  if (error instanceof P06UserAuthorityDeniedError) {
    return Object.freeze({
      outcome: "DENIED" as const,
      freshPreflight: null,
      freshDigest: null,
      reason: error.message,
    });
  }

  return null;
}

export function reconcileUnknownP06UserDisable(
  current: P06UserDisablePreflight,
  reviewed: P06UserDisablePreflight,
): ReconciliationDecision<P06UserDisableExecution> {
  const reviewedUser = reviewed.user;

  if (
    reviewedUser !== null &&
    p06PoststateMatches(current, reviewedUser)
  ) {
    return Object.freeze({
      outcome: "APPLIED" as const,
      execution: execution(
        current.expectedFixtureGeneration,
        "AUTHORITATIVE_RECONCILIATION_READBACK",
      ),
    });
  }

  if (
    p06PrestateMatches(current) &&
    digestCanonicalJson(current) === digestCanonicalJson(reviewed)
  ) {
    return Object.freeze({
      outcome: "NOT_APPLIED" as const,
      reason: "AUTHORITATIVE_READBACK_MATCHED_EXACT_P06_REVIEWED_PRESTATE",
    });
  }

  return Object.freeze({
    outcome: "STILL_UNKNOWN" as const,
    reason: "AUTHORITATIVE_READBACK_MATCHED_NEITHER_EXACT_P06_PRESTATE_NOR_FIELD_PRESERVING_POSTSTATE",
  });
}

function proofResult(input: {
  readonly requirement: ProofRequirement;
  readonly passed: boolean;
  readonly observedAtUtc: string;
  readonly sourceReference: string | null;
  readonly observedSummary: string;
}): ProofResult {
  return Object.freeze({
    requirementId: input.requirement.requirementId,
    plane: input.requirement.plane,
    applicability: input.requirement.applicability,
    status: input.passed ? "PASS" : "FAIL",
    sourceType: input.requirement.source,
    sourceReference: input.sourceReference,
    observedAtUtc: input.observedAtUtc,
    expectedSummary: input.requirement.description,
    observedSummary: input.observedSummary,
    provenance: "AUTHORITATIVE_IRIS" as const,
    safeEvidenceDigest: null,
  });
}

export function buildP06UserDisableProofResults(
  input: P06UserDisableEvidenceInput,
): readonly ProofResult[] {
  const [
    configuration,
    httpBehavior,
    runtime,
    audit,
  ] = P06_USER_DISABLE_PROOF_REQUIREMENTS;

  if (
    configuration === undefined ||
    httpBehavior === undefined ||
    runtime === undefined ||
    audit === undefined
  ) {
    throw new Error("P06 proof requirement registry is incomplete.");
  }

  return Object.freeze([
    proofResult({
      requirement: configuration,
      passed: input.configurationVerified,
      observedAtUtc: input.observedAtUtc,
      sourceReference: input.configurationSourceReference,
      observedSummary: input.configurationVerified
        ? "Enabled=false and all 15 other observed Security.Users fields exactly match the reviewed enabled prestate."
        : "Configured user poststate did not prove field-preserving disablement.",
    }),
    proofResult({
      requirement: httpBehavior,
      passed: input.httpBehaviorVerified,
      observedAtUtc: input.observedAtUtc,
      sourceReference: input.httpSourceReference,
      observedSummary: input.httpBehaviorVerified
        ? "The same synthetic credential changed from HTTP 200 before disablement to HTTP 401 after disablement."
        : "Same-credential authentication behavior did not prove the enabled-to-disabled transition.",
    }),
    proofResult({
      requirement: runtime,
      passed: input.nativeDisableRuntimeVerified,
      observedAtUtc: input.observedAtUtc,
      sourceReference: input.liveRuntimeSourceReference,
      observedSummary: input.nativeDisableRuntimeVerified
        ? "One pre-disable Native SDK process was bound, closed normally, and observed gone before dispatch; a fresh post-disable Native SDK authentication attempt was rejected with zero surviving fixture processes."
        : "Native runtime disable proof is incomplete.",
    }),
    proofResult({
      requirement: audit,
      passed: input.nativeAuditBound,
      observedAtUtc: input.observedAtUtc,
      sourceReference: input.nativeAuditSourceReference,
      observedSummary: input.nativeAuditBound
        ? "Exactly one native UserChange row is bound to the isolated true -> false disable transition."
        : "Native UserChange disable audit evidence is not bound.",
    }),
  ]);
}

export function createP06UserDisableProofContract(
  dependencies: P06UserDisableContractDependencies,
): ProofContract<
  P06UserDisableIntent,
  P06UserDisablePreflight,
  P06UserDisableExecution
> {
  const contract: ProofContract<
    P06UserDisableIntent,
    P06UserDisablePreflight,
    P06UserDisableExecution
  > = {
    schemaVersion: PROOF_CONTRACT_SCHEMA_VERSION,
    contractId: P06_USER_DISABLE_CONTRACT_ID,
    contractVersion: 1,
    actionType: "USER_DISABLE",
    domain: "PERMISSIONS",
    risk: "MEDIUM",
    reversibility: "REVERSIBLE",
    requiredAuthority: Object.freeze([
      Object.freeze({
        resource: "%Admin_Secure",
        permission: "U",
        standing: true,
        escalationOnly: false,
      }),
    ]),
    proofRequirements: P06_USER_DISABLE_PROOF_REQUIREMENTS,

    target(intent) {
      assertIntent(intent);
      return Object.freeze({
        kind: "USER",
        canonicalId: `user:${DEMO_FIXTURE_USERNAME}`,
        displayName: DEMO_FIXTURE_DISPLAY_NAME,
        fixtureId: DEMO_FIXTURE_ID,
        generation: intent.expectedFixtureGeneration,
      });
    },

    async preflight(context, intent) {
      void context;
      assertIntent(intent);

      const preflight = await dependencies.readFreshPreflight(intent);

      if (
        preflight.expectedFixtureGeneration !== intent.expectedFixtureGeneration ||
        !p06PrestateMatches(preflight)
      ) {
        throw new ProofEngineError(
          "SAFETY_BLOCKED",
          "P06 requires the exact enabled isolated-user prestate, HTTP 200 for the in-memory credential, exactly one bound live fixture process, and a current fixture generation.",
        );
      }

      return preflight;
    },

    expectedDelta(intent, preflight) {
      assertIntent(intent);

      if (!p06PrestateMatches(preflight)) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "P06 expected delta requires the exact reviewed enabled-user prestate.",
        );
      }

      return Object.freeze({
        summary: P06_USER_DISABLE_DELTA_SUMMARY,
        before: Object.freeze({
          enabled: true,
          sameCredentialLoginStatus: 200,
          liveProcessCount: 1,
          preservedSecurityFieldCount: P06_PRESERVED_SECURITY_FIELD_COUNT,
        }),
        after: Object.freeze({
          enabled: false,
          sameCredentialLoginStatus: 401,
          freshNativeProcessDeniedRequired: true,
          preservedSecurityFieldCount: P06_PRESERVED_SECURITY_FIELD_COUNT,
        }),
      });
    },

    async analyzeImpact(context, intent, preflight) {
      void context;
      assertIntent(intent);

      if (!p06PrestateMatches(preflight)) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "P06 impact analysis requires the exact enabled-user prestate.",
        );
      }

      return Object.freeze({
        certainty: "KNOWN" as const,
        summary:
          "P06 changes only Enabled from true to false on the isolated witness user. No role, namespace, authentication-option, expiration, profile, or routine field is intentionally changed; new HTTP and Native SDK authentication become unavailable.",
        affectedEntities: Object.freeze([
          Object.freeze({
            kind: "USER",
            canonicalId: `user:${DEMO_FIXTURE_USERNAME}`,
            displayName: DEMO_FIXTURE_DISPLAY_NAME,
            effect: "Login changes from enabled to disabled while every other observed Security.Users field is preserved.",
          }),
        ]),
        limitations: Object.freeze([
          "P06 is bound to the isolated synthetic witness user only.",
          "HTTP 200 -> 401 is proven with the same in-memory credential; the credential is never persisted by Meridian.",
          "P06 proves a real pre-disable Native SDK process, normal witness shutdown plus PID disappearance before dispatch, and rejection of a fresh post-disable Native SDK authentication attempt. It does not claim that disabling a user kills an already-running process.",
          "Automatic retry is forbidden after an ambiguous PUT dispatch.",
        ]),
      });
    },

    digestPreflight(preflight) {
      return digestCanonicalJson(preflight);
    },

    async revalidate(
      context: ActionContext,
      reviewed: ReviewedAction<P06UserDisableIntent, P06UserDisablePreflight>,
    ) {
      void context;
      assertIntent(reviewed.intent);

      try {
        const fresh = await dependencies.readFreshPreflight(reviewed.intent);
        const freshDigest = digestCanonicalJson(fresh);

        if (
          fresh.expectedFixtureGeneration !==
            reviewed.intent.expectedFixtureGeneration ||
          !p06PrestateMatches(fresh)
        ) {
          return Object.freeze({
            outcome: "STALE" as const,
            freshPreflight: fresh,
            freshDigest,
            reason:
              "P06 user, authentication behavior, bound-process count, or fixture-generation state changed after review; zero business PUT dispatched.",
          });
        }

        if (freshDigest !== reviewed.reviewedPreflightDigest) {
          return Object.freeze({
            outcome: "STALE" as const,
            freshPreflight: fresh,
            freshDigest,
            reason: "P06 fresh preflight digest differs from the reviewed digest.",
          });
        }

        return Object.freeze({
          outcome: "MATCH" as const,
          freshPreflight: fresh,
          freshDigest,
        });
      } catch (error) {
        const denied = mapAuthorityDenied(error);
        if (denied !== null) {
          return denied;
        }

        throw error;
      }
    },

    async execute(context, ready) {
      void context;
      assertIntent(ready.intent);

      if (ready.reviewedPreflightDigest !== ready.freshRevalidationDigest) {
        throw new ProofEngineError(
          "STALE_PRECONDITION",
          "P06 execute refused because reviewed and fresh preflight digests differ.",
        );
      }

      const reviewedUser = ready.preflight.user;
      if (reviewedUser === null) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "P06 reviewed enabled user unexpectedly disappeared before execute.",
        );
      }

      try {
        await dependencies.executeDisable(ready.intent);
      } catch (error) {
        if (error instanceof P06UserMutationUnknownAfterDispatchError) {
          throw new ProofEngineError(
            "UNKNOWN_AFTER_DISPATCH",
            error.message,
            {
              automaticRetry: false,
            },
          );
        }

        throw error;
      }

      const after = await dependencies.readFreshPreflight(ready.intent);

      if (!p06PoststateMatches(after, reviewedUser)) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          "P06 PUT returned success but authoritative disabled/read-login poststate is not exact or another Security.Users field changed. Automatic retry is forbidden.",
          {
            automaticRetry: false,
          },
        );
      }

      return execution(
        ready.intent.expectedFixtureGeneration,
        "DIRECT_EXECUTION",
      );
    },

    async reconcileUnknown(context, reviewed) {
      void context;
      assertIntent(reviewed.intent);

      return reconcileUnknownP06UserDisable(
        await dependencies.readFreshPreflight(reviewed.intent),
        reviewed.preflight,
      );
    },

    async verify(context, executionResult) {
      void context;

      if (
        !executionResult.configurationVerified ||
        executionResult.mutationRequestCount !== 1
      ) {
        throw new ProofEngineError(
          "PROOF_INCOMPLETE",
          "P06 execution evidence is incomplete.",
        );
      }

      return dependencies.collectProofResults(executionResult);
    },

    buildRecoveryPlan(executionResult, results) {
      void executionResult;
      void results;

      return Object.freeze({
        recoveryActionType: "USER_ENABLE",
        automatic: false as const,
        summary:
          "Use the separately certified P05 USER_ENABLE proof contract after fresh review and revalidation.",
      });
    },
  };

  return Object.freeze(contract);
}

export async function certifyP06UserDisableAction(
  input: {
    readonly intent: P06UserDisableIntent;
    readonly actionId: string;
    readonly receiptId: string;
    readonly logicalActor: string;
    readonly irisRuntimeUser: string;
  },
  dependencies: P06UserDisableCertificationDependencies,
): Promise<VerifiedActionCertificationResult<P06UserDisableExecution>> {
  return certifyVerifiedAction(
    {
      contract: createP06UserDisableProofContract(dependencies.contract),
      intent: input.intent,
      actionId: input.actionId,
      receiptId: input.receiptId,
      parentChangeSetId: null,
      logicalActor: input.logicalActor,
      irisRuntimeUser: input.irisRuntimeUser,
    },
    dependencies.certification,
  );
}
