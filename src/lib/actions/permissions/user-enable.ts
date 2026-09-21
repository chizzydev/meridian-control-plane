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
  P05UserAuthorityDeniedError,
  P05UserMutationUnknownAfterDispatchError,
  type P05UserSnapshot,
} from "../../iris/user-enable-action-transport";

export const P05_USER_ENABLE_CONTRACT_ID =
  "meridian.permissions.user-enable.v1" as const;

export const P05_USER_ENABLE_EXECUTION_SCHEMA_VERSION =
  "meridian.user-enable-execution.v1" as const;

export const P05_USER_ENABLE_COMMENT =
  "Meridian R4 P05 isolated user-enable witness" as const;

export const P05_USER_ENABLE_DELTA_SUMMARY =
  "Enable the exact isolated Meridian witness user through one official PUT /v2/security/user, preserving every other observed Security.Users field. Prove HTTP 401 for the same credential while disabled, HTTP 200 after enablement, a fresh Native SDK IRIS process bound by ProcessQuery, and one native UserChange audit row." as const;

export const P05_PRESERVED_SECURITY_FIELD_COUNT = 15 as const;

export interface P05UserEnableIntent {
  readonly actionId: "P05_USER_ENABLE";
  readonly fixtureId: typeof DEMO_FIXTURE_ID;
  readonly username: typeof DEMO_FIXTURE_USERNAME;
  readonly expectedFixtureGeneration: string;
}

export interface P05UserEnablePreflight {
  readonly schemaVersion: "meridian.user-enable-preflight.v1";
  readonly fixtureId: typeof DEMO_FIXTURE_ID;
  readonly expectedFixtureGeneration: string;
  readonly user: P05UserSnapshot | null;
  readonly credentialPresent: boolean;
  readonly credentialLoginStatus: 200 | 401;
  readonly liveProcessCount: number;
  readonly officialMutationOperation: "PUT /v2/security/user";
  readonly requiredAuthority: "%Admin_Secure:U";
  readonly authorityMode: "CURRENT_STANDING_RUNTIME_AUTHORITY";
}

export interface P05UserEnableExecution {
  readonly schemaVersion: typeof P05_USER_ENABLE_EXECUTION_SCHEMA_VERSION;
  readonly state: "APPLIED";
  readonly actionId: "P05_USER_ENABLE";
  readonly fixtureId: typeof DEMO_FIXTURE_ID;
  readonly generation: string;
  readonly username: typeof DEMO_FIXTURE_USERNAME;
  readonly beforeEnabled: false;
  readonly afterEnabled: true;
  readonly preservedSecurityFieldCount: typeof P05_PRESERVED_SECURITY_FIELD_COUNT;
  readonly beforeLoginStatus: 401;
  readonly afterLoginStatus: 200;
  readonly mutationRequestCount: 1;
  readonly configurationVerified: true;
  readonly resolutionSource:
    "DIRECT_EXECUTION" |
    "AUTHORITATIVE_RECONCILIATION_READBACK";
}

export interface P05UserEnableEvidenceInput {
  readonly observedAtUtc: string;
  readonly configurationVerified: boolean;
  readonly httpBehaviorVerified: boolean;
  readonly freshNativeRuntimeVerified: boolean;
  readonly nativeAuditBound: boolean;
  readonly configurationSourceReference: string | null;
  readonly httpSourceReference: string | null;
  readonly liveRuntimeSourceReference: string | null;
  readonly nativeAuditSourceReference: string | null;
}

export interface P05UserEnableContractDependencies {
  readonly readFreshPreflight:
    (intent: P05UserEnableIntent) => Promise<P05UserEnablePreflight>;

  readonly executeEnable:
    (intent: P05UserEnableIntent) => Promise<void>;

  readonly collectProofResults:
    (execution: P05UserEnableExecution) => Promise<readonly ProofResult[]>;
}

export interface P05UserEnableCertificationDependencies {
  readonly contract: P05UserEnableContractDependencies;
  readonly certification:
    VerifiedActionCertificationDependencies<P05UserEnablePreflight>;
}

export const P05_USER_ENABLE_PROOF_REQUIREMENTS:
  readonly ProofRequirement[] =
  Object.freeze([
    Object.freeze({
      requirementId: "p05-configured-user-readback",
      plane: "CONFIGURATION_READBACK",
      applicability: "REQUIRED",
      description:
        "Authoritative SysAdmin user readback has Enabled=true and every other observed Security.Users field exactly matches the reviewed disabled prestate.",
      source: "IRIS SysAdmin API GET /v2/security/user",
    }),
    Object.freeze({
      requirementId: "p05-same-credential-http-authentication",
      plane: "HTTP_BEHAVIOR",
      applicability: "REQUIRED",
      description:
        "The exact same in-memory synthetic credential receives HTTP 401 while the user is disabled and HTTP 200 only after the reviewed enable mutation.",
      source: "IRIS SysAdmin API POST /login",
    }),
    Object.freeze({
      requirementId: "p05-fresh-native-runtime",
      plane: "LIVE_RUNTIME",
      applicability: "REQUIRED",
      description:
        "After enablement, the same synthetic credential creates a new Native SDK IRIS process that is bound one-to-one by the certified ProcessQuery reader.",
      source: "Meridian Native SDK witness + IRIS ProcessQuery",
    }),
    Object.freeze({
      requirementId: "p05-native-userchange-audit",
      plane: "NATIVE_AUDIT",
      applicability: "REQUIRED",
      description:
        "Exactly one native IRIS UserChange audit row is bound to Enabled changing from false to true for the isolated witness user.",
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

function safeDisabledUserMatches(user: P05UserSnapshot | null): boolean {
  return (
    user !== null &&
    user.username === DEMO_FIXTURE_USERNAME &&
    user.fullName === DEMO_FIXTURE_DISPLAY_NAME &&
    user.namespace === DEMO_FIXTURE_NAMESPACE &&
    user.enabled === false &&
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
    user.comment === P05_USER_ENABLE_COMMENT
  );
}

function withoutEnabled(
  user: P05UserSnapshot,
): Readonly<Omit<P05UserSnapshot, "enabled">> {
  const {
    enabled: _enabled,
    ...rest
  } = user;

  void _enabled;

  return Object.freeze(rest);
}

export function p05ObservedFieldsPreserved(
  before: P05UserSnapshot,
  after: P05UserSnapshot,
): boolean {
  return (
    digestCanonicalJson(withoutEnabled(before)) ===
    digestCanonicalJson(withoutEnabled(after))
  );
}

export function p05PrestateMatches(
  preflight: P05UserEnablePreflight,
): boolean {
  return (
    preflight.fixtureId === DEMO_FIXTURE_ID &&
    preflight.expectedFixtureGeneration.trim().length > 0 &&
    preflight.credentialPresent &&
    preflight.credentialLoginStatus === 401 &&
    preflight.liveProcessCount === 0 &&
    preflight.officialMutationOperation === "PUT /v2/security/user" &&
    preflight.requiredAuthority === "%Admin_Secure:U" &&
    preflight.authorityMode === "CURRENT_STANDING_RUNTIME_AUTHORITY" &&
    safeDisabledUserMatches(preflight.user)
  );
}

export function p05PoststateMatches(
  preflight: P05UserEnablePreflight,
  reviewedUser: P05UserSnapshot,
): boolean {
  return (
    preflight.fixtureId === DEMO_FIXTURE_ID &&
    preflight.expectedFixtureGeneration.trim().length > 0 &&
    preflight.credentialPresent &&
    preflight.credentialLoginStatus === 200 &&
    preflight.liveProcessCount === 0 &&
    preflight.user !== null &&
    reviewedUser.enabled === false &&
    preflight.user.enabled === true &&
    p05ObservedFieldsPreserved(reviewedUser, preflight.user)
  );
}

export function p05ExpectedDisabledUserSnapshot(
  expirationDate = "",
): P05UserSnapshot {
  if (!allowedNeverExpiresDate(expirationDate)) {
    throw new Error("P05 expected fixture expiration date is outside the frozen never-expires representations.");
  }

  return Object.freeze({
    username: DEMO_FIXTURE_USERNAME,
    accountNeverExpires: true,
    autheEnabled: 0,
    changePassword: false,
    comment: P05_USER_ENABLE_COMMENT,
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

export function p05ExpectedEnabledUserSnapshot(
  expirationDate = "",
): P05UserSnapshot {
  return Object.freeze({
    ...p05ExpectedDisabledUserSnapshot(expirationDate),
    enabled: true,
  });
}

function assertIntent(intent: P05UserEnableIntent): void {
  if (
    intent.actionId !== "P05_USER_ENABLE" ||
    intent.fixtureId !== DEMO_FIXTURE_ID ||
    intent.username !== DEMO_FIXTURE_USERNAME ||
    intent.expectedFixtureGeneration.trim().length === 0
  ) {
    throw new ProofEngineError(
      "INVALID_TARGET",
      "P05 intent is outside the frozen isolated witness boundary.",
    );
  }
}

export function p05UserEnableIntent(
  generation: string,
): P05UserEnableIntent {
  const trimmed = generation.trim();

  if (trimmed.length === 0) {
    throw new Error("P05 fixture generation is required.");
  }

  return Object.freeze({
    actionId: "P05_USER_ENABLE" as const,
    fixtureId: DEMO_FIXTURE_ID,
    username: DEMO_FIXTURE_USERNAME,
    expectedFixtureGeneration: trimmed,
  });
}

function execution(
  generation: string,
  source: P05UserEnableExecution["resolutionSource"],
): P05UserEnableExecution {
  return Object.freeze({
    schemaVersion: P05_USER_ENABLE_EXECUTION_SCHEMA_VERSION,
    state: "APPLIED" as const,
    actionId: "P05_USER_ENABLE" as const,
    fixtureId: DEMO_FIXTURE_ID,
    generation,
    username: DEMO_FIXTURE_USERNAME,
    beforeEnabled: false as const,
    afterEnabled: true as const,
    preservedSecurityFieldCount: P05_PRESERVED_SECURITY_FIELD_COUNT,
    beforeLoginStatus: 401 as const,
    afterLoginStatus: 200 as const,
    mutationRequestCount: 1 as const,
    configurationVerified: true as const,
    resolutionSource: source,
  });
}

function mapAuthorityDenied(
  error: unknown,
): RevalidationDecision<P05UserEnablePreflight> | null {
  if (error instanceof P05UserAuthorityDeniedError) {
    return Object.freeze({
      outcome: "DENIED" as const,
      freshPreflight: null,
      freshDigest: null,
      reason: error.message,
    });
  }

  return null;
}

export function reconcileUnknownP05UserEnable(
  current: P05UserEnablePreflight,
  reviewed: P05UserEnablePreflight,
): ReconciliationDecision<P05UserEnableExecution> {
  const reviewedUser = reviewed.user;

  if (
    reviewedUser !== null &&
    p05PoststateMatches(current, reviewedUser)
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
    p05PrestateMatches(current) &&
    digestCanonicalJson(current) === digestCanonicalJson(reviewed)
  ) {
    return Object.freeze({
      outcome: "NOT_APPLIED" as const,
      reason: "AUTHORITATIVE_READBACK_MATCHED_EXACT_P05_REVIEWED_PRESTATE",
    });
  }

  return Object.freeze({
    outcome: "STILL_UNKNOWN" as const,
    reason: "AUTHORITATIVE_READBACK_MATCHED_NEITHER_EXACT_P05_PRESTATE_NOR_FIELD_PRESERVING_POSTSTATE",
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

export function buildP05UserEnableProofResults(
  input: P05UserEnableEvidenceInput,
): readonly ProofResult[] {
  const [
    configuration,
    httpBehavior,
    runtime,
    audit,
  ] = P05_USER_ENABLE_PROOF_REQUIREMENTS;

  if (
    configuration === undefined ||
    httpBehavior === undefined ||
    runtime === undefined ||
    audit === undefined
  ) {
    throw new Error("P05 proof requirement registry is incomplete.");
  }

  return Object.freeze([
    proofResult({
      requirement: configuration,
      passed: input.configurationVerified,
      observedAtUtc: input.observedAtUtc,
      sourceReference: input.configurationSourceReference,
      observedSummary: input.configurationVerified
        ? "Enabled=true and all 15 other observed Security.Users fields exactly match the reviewed disabled prestate."
        : "Configured user poststate did not prove field-preserving enablement.",
    }),
    proofResult({
      requirement: httpBehavior,
      passed: input.httpBehaviorVerified,
      observedAtUtc: input.observedAtUtc,
      sourceReference: input.httpSourceReference,
      observedSummary: input.httpBehaviorVerified
        ? "The same synthetic credential changed from HTTP 401 while disabled to HTTP 200 after enablement."
        : "Same-credential authentication behavior did not prove the disabled-to-enabled transition.",
    }),
    proofResult({
      requirement: runtime,
      passed: input.freshNativeRuntimeVerified,
      observedAtUtc: input.observedAtUtc,
      sourceReference: input.liveRuntimeSourceReference,
      observedSummary: input.freshNativeRuntimeVerified
        ? "The enabled credential created exactly one fresh Native SDK IRIS process bound by ProcessQuery."
        : "Fresh Native SDK process creation or ProcessQuery binding is incomplete.",
    }),
    proofResult({
      requirement: audit,
      passed: input.nativeAuditBound,
      observedAtUtc: input.observedAtUtc,
      sourceReference: input.nativeAuditSourceReference,
      observedSummary: input.nativeAuditBound
        ? "Exactly one native UserChange row is bound to Enabled false -> true."
        : "Native UserChange enable audit evidence is not bound.",
    }),
  ]);
}

export function createP05UserEnableProofContract(
  dependencies: P05UserEnableContractDependencies,
): ProofContract<
  P05UserEnableIntent,
  P05UserEnablePreflight,
  P05UserEnableExecution
> {
  const contract: ProofContract<
    P05UserEnableIntent,
    P05UserEnablePreflight,
    P05UserEnableExecution
  > = {
    schemaVersion: PROOF_CONTRACT_SCHEMA_VERSION,
    contractId: P05_USER_ENABLE_CONTRACT_ID,
    contractVersion: 1,
    actionType: "USER_ENABLE",
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
    proofRequirements: P05_USER_ENABLE_PROOF_REQUIREMENTS,

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
        !p05PrestateMatches(preflight)
      ) {
        throw new ProofEngineError(
          "SAFETY_BLOCKED",
          "P05 requires the exact disabled isolated-user prestate, HTTP 401 for the in-memory credential, zero live fixture processes, and a current fixture generation.",
        );
      }

      return preflight;
    },

    expectedDelta(intent, preflight) {
      assertIntent(intent);

      if (!p05PrestateMatches(preflight)) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "P05 expected delta requires the exact reviewed disabled-user prestate.",
        );
      }

      return Object.freeze({
        summary: P05_USER_ENABLE_DELTA_SUMMARY,
        before: Object.freeze({
          enabled: false,
          sameCredentialLoginStatus: 401,
          liveProcessCount: 0,
          preservedSecurityFieldCount: P05_PRESERVED_SECURITY_FIELD_COUNT,
        }),
        after: Object.freeze({
          enabled: true,
          sameCredentialLoginStatus: 200,
          freshNativeProcessRequired: true,
          preservedSecurityFieldCount: P05_PRESERVED_SECURITY_FIELD_COUNT,
        }),
      });
    },

    async analyzeImpact(context, intent, preflight) {
      void context;
      assertIntent(intent);

      if (!p05PrestateMatches(preflight)) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "P05 impact analysis requires the exact disabled-user prestate.",
        );
      }

      return Object.freeze({
        certainty: "KNOWN" as const,
        summary:
          "P05 changes only Enabled from false to true on the isolated witness user. No role, namespace, authentication-option, expiration, profile, or routine field is intentionally changed; fresh authentication and Native SDK process creation become possible.",
        affectedEntities: Object.freeze([
          Object.freeze({
            kind: "USER",
            canonicalId: `user:${DEMO_FIXTURE_USERNAME}`,
            displayName: DEMO_FIXTURE_DISPLAY_NAME,
            effect: "Login changes from disabled to enabled while every other observed Security.Users field is preserved.",
          }),
        ]),
        limitations: Object.freeze([
          "P05 is bound to the isolated synthetic witness user only.",
          "HTTP 401 -> 200 is proven with the same in-memory credential; the credential is never persisted by Meridian.",
          "P05 proves a fresh post-enable Native SDK process rather than a stale same-connection transition because a disabled user cannot supply the intended pre-enable Native session.",
          "Automatic retry is forbidden after an ambiguous PUT dispatch.",
        ]),
      });
    },

    digestPreflight(preflight) {
      return digestCanonicalJson(preflight);
    },

    async revalidate(
      context: ActionContext,
      reviewed: ReviewedAction<P05UserEnableIntent, P05UserEnablePreflight>,
    ) {
      void context;
      assertIntent(reviewed.intent);

      try {
        const fresh = await dependencies.readFreshPreflight(reviewed.intent);
        const freshDigest = digestCanonicalJson(fresh);

        if (
          fresh.expectedFixtureGeneration !==
            reviewed.intent.expectedFixtureGeneration ||
          !p05PrestateMatches(fresh)
        ) {
          return Object.freeze({
            outcome: "STALE" as const,
            freshPreflight: fresh,
            freshDigest,
            reason:
              "P05 user, authentication behavior, process count, or fixture-generation state changed after review; zero business PUT dispatched.",
          });
        }

        if (freshDigest !== reviewed.reviewedPreflightDigest) {
          return Object.freeze({
            outcome: "STALE" as const,
            freshPreflight: fresh,
            freshDigest,
            reason: "P05 fresh preflight digest differs from the reviewed digest.",
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
          "P05 execute refused because reviewed and fresh preflight digests differ.",
        );
      }

      const reviewedUser = ready.preflight.user;
      if (reviewedUser === null) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "P05 reviewed user unexpectedly disappeared before execute.",
        );
      }

      try {
        await dependencies.executeEnable(ready.intent);
      } catch (error) {
        if (error instanceof P05UserMutationUnknownAfterDispatchError) {
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

      if (!p05PoststateMatches(after, reviewedUser)) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          "P05 PUT returned success but authoritative enabled/read-login poststate is not exact or another Security.Users field changed. Automatic retry is forbidden.",
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

      return reconcileUnknownP05UserEnable(
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
          "P05 execution evidence is incomplete.",
        );
      }

      return dependencies.collectProofResults(executionResult);
    },

    buildRecoveryPlan(executionResult, results) {
      void executionResult;
      void results;

      return Object.freeze({
        recoveryActionType: "USER_DISABLE",
        automatic: false as const,
        summary:
          "Use the separately certified P06 USER_DISABLE proof contract after fresh review and revalidation.",
      });
    },
  };

  return Object.freeze(contract);
}

export async function certifyP05UserEnableAction(
  input: {
    readonly intent: P05UserEnableIntent;
    readonly actionId: string;
    readonly receiptId: string;
    readonly logicalActor: string;
    readonly irisRuntimeUser: string;
  },
  dependencies: P05UserEnableCertificationDependencies,
): Promise<VerifiedActionCertificationResult<P05UserEnableExecution>> {
  return certifyVerifiedAction(
    {
      contract: createP05UserEnableProofContract(dependencies.contract),
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
