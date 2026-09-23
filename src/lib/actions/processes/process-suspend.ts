import {
  DEMO_FIXTURE_ID,
  DEMO_FIXTURE_NAMESPACE,
  DEMO_FIXTURE_USERNAME,
} from "../../change-case/demo-fixture";

import {
  liveWitnessProcessPurposeMarker,
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
  O01_PROCESS_ACTION_ROLE,
  O01ProcessAuthorityDeniedError,
  O01ProcessMutationUnknownAfterDispatchError,
  type O01SysAdminProcessSnapshot,
} from "../../iris/process-suspend-action-transport";

export const O01_PROCESS_SUSPEND_CONTRACT_ID =
  "meridian.processes.process-suspend.v1" as const;

export const O01_PROCESS_SUSPEND_EXECUTION_SCHEMA_VERSION =
  "meridian.process-suspend-execution.v1" as const;

export const O01_PROCESS_SUSPEND_RECEIPT_ID =
  "meridian-o01-process-suspend-r6-a-001" as const;

export const O01_PROCESS_SUSPEND_CLOSURE_PLANES =
  Object.freeze([
    "PROCESS_STATE",
    "PERSISTENT_RECEIPT",
  ] as const);

export const O01_PROCESS_SUSPEND_DELTA_SUMMARY =
  "Suspend exactly one reviewed Meridian synthetic witness process through one bodyless POST /v2/process/suspend?id=<reviewed-pid>. Targeting is permitted only after PID, controller-held generation, username, namespace, StartTimeUTC, and self-written UserInfo purpose marker agree across the direct witness, SysAdmin process detail, and independent native ProcessQuery evidence. State B must preserve the same exact six-field identity and independently report SUSP on both external read planes. Automatic retry and automatic recovery are forbidden; O02_PROCESS_RESUME is the explicit reviewed recovery action." as const;

export interface O01DirectWitnessIdentity {
  readonly generation:
    string;

  readonly pid:
    number;

  readonly username:
    string;

  readonly namespace:
    string;

  readonly purposeMarker:
    string;
}

export interface O01NativeProcessSnapshot {
  readonly pid:
    number;

  readonly username:
    string;

  readonly namespace:
    string;

  readonly startTimeUtc:
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

export interface O01ProcessSuspendIntent {
  readonly actionId:
    "O01_PROCESS_SUSPEND";

  readonly expectedFixtureGeneration:
    string;

  readonly expectedPid:
    number;
}

export interface O01ProcessSuspendPreflight {
  readonly schemaVersion:
    "meridian.process-suspend-preflight.v1";

  readonly expectedFixtureGeneration:
    string;

  readonly expectedPid:
    number;

  readonly expectedPurposeMarker:
    string;

  readonly authorizedSuspendRequestDigest:
    string;

  readonly directIdentity:
    O01DirectWitnessIdentity;

  readonly sysAdminProcess:
    O01SysAdminProcessSnapshot | null;

  readonly nativeProcess:
    O01NativeProcessSnapshot | null;

  readonly matchingNativeCount:
    number;

  readonly officialReadOperation:
    "GET /v2/process";

  readonly officialMutationOperation:
    "POST /v2/process/suspend";

  readonly requiredAuthority:
    "%Admin_Operate:U";

  readonly authorityRole:
    typeof O01_PROCESS_ACTION_ROLE;

  readonly authorityMode:
    "EXPLICIT_ESCALATION_ROLE";
}

export interface O01ProcessStateReadback {
  readonly schemaVersion:
    "meridian.process-suspend-state-readback.v1";

  readonly expectedFixtureGeneration:
    string;

  readonly expectedPid:
    number;

  readonly expectedPurposeMarker:
    string;

  readonly sysAdminProcess:
    O01SysAdminProcessSnapshot | null;

  readonly nativeProcess:
    O01NativeProcessSnapshot | null;

  readonly matchingNativeCount:
    number;
}

export interface O01ProcessSuspendExecution {
  readonly schemaVersion:
    typeof O01_PROCESS_SUSPEND_EXECUTION_SCHEMA_VERSION;

  readonly state:
    "APPLIED";

  readonly actionId:
    "O01_PROCESS_SUSPEND";

  readonly generation:
    string;

  readonly pid:
    number;

  readonly purposeMarker:
    string;

  readonly startTimeUtc:
    string;

  readonly suspendStatus:
    200 | null;

  readonly httpSuspendResponseVerified:
    boolean;

  readonly mutationRequestCount:
    1;

  readonly exactIdentityPreserved:
    true;

  readonly sysAdminSuspendedObserved:
    true;

  readonly nativeSuspendedObserved:
    true;

  readonly resolutionSource:
    "DIRECT_EXECUTION" |
    "AUTHORITATIVE_RECONCILIATION_READBACK";
}

export interface O01ProcessSuspendContractDependencies {
  readonly readFreshPreflight:
    (
      intent:
        O01ProcessSuspendIntent,
    ) =>
      Promise<
        O01ProcessSuspendPreflight
      >;

  readonly executeSuspend:
    (
      intent:
        O01ProcessSuspendIntent,
    ) =>
      Promise<
        Readonly<{
          status:
            200;

          pid:
            number;

          mutationRequestCount:
            1;

          requestBodyPresent:
            false;
        }>
      >;

  readonly readFreshProcessState:
    (
      intent:
        O01ProcessSuspendIntent,
    ) =>
      Promise<
        O01ProcessStateReadback
      >;
}

export interface O01ProcessSuspendCertificationDependencies {
  readonly contract:
    O01ProcessSuspendContractDependencies;

  readonly certification:
    VerifiedActionCertificationDependencies<
      O01ProcessSuspendPreflight
    >;
}

export const O01_PROCESS_SUSPEND_PROOF_REQUIREMENTS:
  readonly ProofRequirement[] =
  Object.freeze([
    Object.freeze({
      requirementId:
        "o01-sysadmin-process-state",

      plane:
        "PROCESS_STATE",

      applicability:
        "REQUIRED",

      description:
        "Official GET /v2/process readback proves the reviewed PID still belongs to the exact Meridian witness generation, username, namespace, StartTimeUTC, and UserInfo purpose marker and is in suspended state.",

      source:
        "IRIS SysAdmin API GET /v2/process",
    }),

    Object.freeze({
      requirementId:
        "o01-native-process-state",

      plane:
        "PROCESS_STATE",

      applicability:
        "REQUIRED",

      description:
        "Independent native %SYS.ProcessQuery readback proves the same reviewed PID, username, namespace, StartTimeUTC, and UserInfo purpose marker and reports the process suspended.",

      source:
        "IRIS native %SYS.ProcessQuery",
    }),
  ]);

function isCanonicalGeneration(
  value:
    string,
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
    value,
  );
}

function isPositivePid(
  value:
    number,
): boolean {
  return (
    Number.isSafeInteger(
      value,
    ) &&
    value >
      0
  );
}

function suspendedState(
  value:
    string,
): boolean {
  return value
    .trim()
    .toUpperCase()
    .startsWith(
      "SUSP",
    );
}

function externalIdentityMatches(
  readback:
    O01ProcessStateReadback,
  reviewed:
    O01ProcessSuspendPreflight,
): boolean {
  const sysAdmin =
    readback.sysAdminProcess;

  const native =
    readback.nativeProcess;

  if (
    sysAdmin ===
      null ||
    native ===
      null
  ) {
    return false;
  }

  return (
    readback.schemaVersion ===
      "meridian.process-suspend-state-readback.v1" &&
    readback.expectedFixtureGeneration ===
      reviewed.expectedFixtureGeneration &&
    readback.expectedPid ===
      reviewed.expectedPid &&
    readback.expectedPurposeMarker ===
      reviewed.expectedPurposeMarker &&
    readback.matchingNativeCount ===
      1 &&
    sysAdmin.pid ===
      reviewed.expectedPid &&
    native.pid ===
      reviewed.expectedPid &&
    sysAdmin.username ===
      DEMO_FIXTURE_USERNAME &&
    native.username ===
      DEMO_FIXTURE_USERNAME &&
    sysAdmin.namespace ===
      DEMO_FIXTURE_NAMESPACE &&
    native.namespace ===
      DEMO_FIXTURE_NAMESPACE &&
    sysAdmin.startTimeUtc.trim().length >
      0 &&
    sysAdmin.startTimeUtc ===
      native.startTimeUtc &&
    sysAdmin.startTimeUtc ===
      reviewed.sysAdminProcess?.startTimeUtc &&
    sysAdmin.purposeMarker ===
      reviewed.expectedPurposeMarker &&
    native.purposeMarker ===
      reviewed.expectedPurposeMarker
  );
}

export function o01AuthorizedSuspendRequestDigest(
  pid:
    number,
): string {
  if (
    !isPositivePid(
      pid,
    )
  ) {
    throw new Error(
      "O01 suspend request digest requires a positive safe pid.",
    );
  }

  return digestCanonicalJson({
    automaticRetryAllowed:
      false,

    body:
      null,

    method:
      "POST",

    path:
      "/v2/process/suspend",

    query:
      {
        id:
          pid,
      },
  });
}

export function o01ProcessSuspendIntent(
  generation:
    string,
  pid:
    number,
): O01ProcessSuspendIntent {
  const canonical =
    generation.trim();

  if (
    canonical !==
      generation ||
    !isCanonicalGeneration(
      canonical,
    )
  ) {
    throw new Error(
      "O01 fixture generation must be a canonical lowercase UUID.",
    );
  }

  if (
    !isPositivePid(
      pid,
    )
  ) {
    throw new Error(
      "O01 process id must be a positive safe integer.",
    );
  }

  return Object.freeze({
    actionId:
      "O01_PROCESS_SUSPEND" as const,

    expectedFixtureGeneration:
      canonical,

    expectedPid:
      pid,
  });
}

function assertIntent(
  intent:
    O01ProcessSuspendIntent,
): void {
  if (
    intent.actionId !==
      "O01_PROCESS_SUSPEND" ||
    !isCanonicalGeneration(
      intent.expectedFixtureGeneration,
    ) ||
    !isPositivePid(
      intent.expectedPid,
    )
  ) {
    throw new ProofEngineError(
      "INVALID_TARGET",
      "O01 intent is outside the frozen exact Meridian witness boundary.",
    );
  }
}

export function o01PrestateMatches(
  preflight:
    O01ProcessSuspendPreflight,
): boolean {
  const direct =
    preflight.directIdentity;

  const sysAdmin =
    preflight.sysAdminProcess;

  const native =
    preflight.nativeProcess;

  if (
    sysAdmin ===
      null ||
    native ===
      null
  ) {
    return false;
  }

  const expectedPurpose =
    liveWitnessProcessPurposeMarker(
      preflight.expectedFixtureGeneration,
    );

  return (
    preflight.schemaVersion ===
      "meridian.process-suspend-preflight.v1" &&
    isCanonicalGeneration(
      preflight.expectedFixtureGeneration,
    ) &&
    isPositivePid(
      preflight.expectedPid,
    ) &&
    preflight.expectedPurposeMarker ===
      expectedPurpose &&
    preflight.authorizedSuspendRequestDigest ===
      o01AuthorizedSuspendRequestDigest(
        preflight.expectedPid,
      ) &&
    direct.generation ===
      preflight.expectedFixtureGeneration &&
    direct.pid ===
      preflight.expectedPid &&
    direct.username ===
      DEMO_FIXTURE_USERNAME &&
    direct.namespace ===
      DEMO_FIXTURE_NAMESPACE &&
    direct.purposeMarker ===
      expectedPurpose &&
    preflight.matchingNativeCount ===
      1 &&
    sysAdmin.pid ===
      preflight.expectedPid &&
    native.pid ===
      preflight.expectedPid &&
    sysAdmin.username ===
      DEMO_FIXTURE_USERNAME &&
    native.username ===
      DEMO_FIXTURE_USERNAME &&
    sysAdmin.namespace ===
      DEMO_FIXTURE_NAMESPACE &&
    native.namespace ===
      DEMO_FIXTURE_NAMESPACE &&
    sysAdmin.startTimeUtc.trim().length >
      0 &&
    sysAdmin.startTimeUtc ===
      native.startTimeUtc &&
    sysAdmin.purposeMarker ===
      expectedPurpose &&
    native.purposeMarker ===
      expectedPurpose &&
    sysAdmin.canBeSuspended &&
    native.canBeSuspended &&
    !suspendedState(
      sysAdmin.state,
    ) &&
    !suspendedState(
      native.state,
    ) &&
    sysAdmin.state.trim().toUpperCase() ===
      native.state.trim().toUpperCase() &&
    preflight.officialReadOperation ===
      "GET /v2/process" &&
    preflight.officialMutationOperation ===
      "POST /v2/process/suspend" &&
    preflight.requiredAuthority ===
      "%Admin_Operate:U" &&
    preflight.authorityRole ===
      O01_PROCESS_ACTION_ROLE &&
    preflight.authorityMode ===
      "EXPLICIT_ESCALATION_ROLE"
  );
}

export function o01PoststateMatches(
  readback:
    O01ProcessStateReadback,
  reviewed:
    O01ProcessSuspendPreflight,
): boolean {
  const sysAdmin =
    readback.sysAdminProcess;

  const native =
    readback.nativeProcess;

  return (
    o01PrestateMatches(
      reviewed,
    ) &&
    externalIdentityMatches(
      readback,
      reviewed,
    ) &&
    sysAdmin !==
      null &&
    native !==
      null &&
    suspendedState(
      sysAdmin.state,
    ) &&
    suspendedState(
      native.state,
    )
  );
}

function unsuspendedExternalStateMatches(
  readback:
    O01ProcessStateReadback,
  reviewed:
    O01ProcessSuspendPreflight,
): boolean {
  const sysAdmin =
    readback.sysAdminProcess;

  const native =
    readback.nativeProcess;

  return (
    externalIdentityMatches(
      readback,
      reviewed,
    ) &&
    sysAdmin !==
      null &&
    native !==
      null &&
    sysAdmin.canBeSuspended &&
    native.canBeSuspended &&
    !suspendedState(
      sysAdmin.state,
    ) &&
    !suspendedState(
      native.state,
    ) &&
    sysAdmin.state.trim().toUpperCase() ===
      native.state.trim().toUpperCase()
  );
}

function execution(
  input: {
    readonly reviewed:
      O01ProcessSuspendPreflight;

    readonly source:
      O01ProcessSuspendExecution[
        "resolutionSource"
      ];
  },
): O01ProcessSuspendExecution {
  const startTimeUtc =
    input.reviewed
      .sysAdminProcess
      ?.startTimeUtc ??
    "";

  if (
    startTimeUtc.trim().length ===
      0
  ) {
    throw new ProofEngineError(
      "PROOF_INCOMPLETE",
      "O01 reviewed process StartTimeUTC is missing.",
    );
  }

  return Object.freeze({
    schemaVersion:
      O01_PROCESS_SUSPEND_EXECUTION_SCHEMA_VERSION,

    state:
      "APPLIED" as const,

    actionId:
      "O01_PROCESS_SUSPEND" as const,

    generation:
      input.reviewed.expectedFixtureGeneration,

    pid:
      input.reviewed.expectedPid,

    purposeMarker:
      input.reviewed.expectedPurposeMarker,

    startTimeUtc,

    suspendStatus:
      input.source ===
        "DIRECT_EXECUTION"
        ? 200 as const
        : null,

    httpSuspendResponseVerified:
      input.source ===
        "DIRECT_EXECUTION",

    mutationRequestCount:
      1 as const,

    exactIdentityPreserved:
      true as const,

    sysAdminSuspendedObserved:
      true as const,

    nativeSuspendedObserved:
      true as const,

    resolutionSource:
      input.source,
  });
}

function mapAuthorityDenied(
  error:
    unknown,
): RevalidationDecision<
  O01ProcessSuspendPreflight
> | null {
  if (
    error instanceof
      O01ProcessAuthorityDeniedError
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

export function reconcileUnknownO01ProcessSuspend(
  readback:
    O01ProcessStateReadback,
  reviewed:
    O01ProcessSuspendPreflight,
): ReconciliationDecision<
  O01ProcessSuspendExecution
> {
  if (
    o01PoststateMatches(
      readback,
      reviewed,
    )
  ) {
    return Object.freeze({
      outcome:
        "APPLIED" as const,

      execution:
        execution({
          reviewed,
          source:
            "AUTHORITATIVE_RECONCILIATION_READBACK",
        }),
    });
  }

  if (
    unsuspendedExternalStateMatches(
      readback,
      reviewed,
    )
  ) {
    return Object.freeze({
      outcome:
        "NOT_APPLIED" as const,

      reason:
        "AUTHORITATIVE_DUAL_READBACK_MATCHED_EXACT_REVIEWED_UNSUSPENDED_PROCESS_IDENTITY",
    });
  }

  return Object.freeze({
    outcome:
      "STILL_UNKNOWN" as const,

    reason:
      "AUTHORITATIVE_DUAL_READBACK_MATCHED_NEITHER_EXACT_REVIEWED_UNSUSPENDED_IDENTITY_NOR_EXACT_SUSPENDED_POSTSTATE",
  });
}

function processProofResult(
  input: {
    readonly requirement:
      ProofRequirement;

    readonly execution:
      O01ProcessSuspendExecution;

    readonly observedAtUtc:
      string;

    readonly sourceType:
      string;

    readonly sourceReference:
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
      "PASS" as const,

    sourceType:
      input.sourceType,

    sourceReference:
      input.sourceReference,

    observedAtUtc:
      input.observedAtUtc,

    expectedSummary:
      "The exact six-field Meridian witness identity remains stable and the reviewed process is suspended.",

    observedSummary:
      (
        `PID ${input.execution.pid} preserved generation, username, namespace, ` +
        `StartTimeUTC, and purpose marker; suspended state independently observed.`
      ),

    provenance:
      "AUTHORITATIVE_IRIS" as const,

    safeEvidenceDigest:
      digestCanonicalJson({
        generation:
          input.execution.generation,
        pid:
          input.execution.pid,
        purposeMarker:
          input.execution.purposeMarker,
        startTimeUtc:
          input.execution.startTimeUtc,
        state:
          "SUSP",
      }),
  });
}

export function buildO01ProcessSuspendProofResults(
  executionResult:
    O01ProcessSuspendExecution,
  observedAtUtc:
    string,
): readonly ProofResult[] {
  const sysAdmin =
    O01_PROCESS_SUSPEND_PROOF_REQUIREMENTS[
      0
    ];

  const native =
    O01_PROCESS_SUSPEND_PROOF_REQUIREMENTS[
      1
    ];

  if (
    sysAdmin ===
      undefined ||
    native ===
      undefined
  ) {
    throw new ProofEngineError(
      "INVALID_CONTRACT",
      "O01 process-state requirements are incomplete.",
    );
  }

  return Object.freeze([
    processProofResult({
      requirement:
        sysAdmin,
      execution:
        executionResult,
      observedAtUtc,
      sourceType:
        "IRIS_SYSADMIN_API",
      sourceReference:
        `GET /v2/process?id=${executionResult.pid}`,
    }),

    processProofResult({
      requirement:
        native,
      execution:
        executionResult,
      observedAtUtc,
      sourceType:
        "IRIS_NATIVE_PROCESSQUERY",
      sourceReference:
        `%SYS.ProcessQuery Pid=${executionResult.pid}`,
    }),
  ]);
}

export function createO01ProcessSuspendProofContract(
  dependencies:
    O01ProcessSuspendContractDependencies,
): ProofContract<
  O01ProcessSuspendIntent,
  O01ProcessSuspendPreflight,
  O01ProcessSuspendExecution
> {
  const contract:
    ProofContract<
      O01ProcessSuspendIntent,
      O01ProcessSuspendPreflight,
      O01ProcessSuspendExecution
    > =
  {
    schemaVersion:
      PROOF_CONTRACT_SCHEMA_VERSION,

    contractId:
      O01_PROCESS_SUSPEND_CONTRACT_ID,

    contractVersion:
      1,

    actionType:
      "PROCESS_SUSPEND",

    domain:
      "SYSTEM_PROCESSES",

    risk:
      "HIGH",

    reversibility:
      "REVERSIBLE",

    requiredAuthority:
      Object.freeze([
        Object.freeze({
          resource:
            "%Admin_Operate",

          permission:
            "U",

          standing:
            false,

          escalationOnly:
            true,
        }),
      ]),

    proofRequirements:
      O01_PROCESS_SUSPEND_PROOF_REQUIREMENTS,

    target(
      intent,
    ) {
      assertIntent(
        intent,
      );

      return Object.freeze({
        kind:
          "PROCESS",

        canonicalId:
          `process:${DEMO_FIXTURE_ID}:${intent.expectedFixtureGeneration}`,

        displayName:
          `${DEMO_FIXTURE_USERNAME} pid=${intent.expectedPid}`,

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
        await dependencies.readFreshPreflight(
          intent,
        );

      if (
        preflight.expectedFixtureGeneration !==
          intent.expectedFixtureGeneration ||
        preflight.expectedPid !==
          intent.expectedPid ||
        !o01PrestateMatches(
          preflight,
        )
      ) {
        throw new ProofEngineError(
          "STALE_PRECONDITION",
          "O01 preflight requires exactly one unsuspended synthetic witness with all six identity fields bound across direct, SysAdmin, and native evidence.",
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
        !o01PrestateMatches(
          preflight,
        )
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "O01 expected delta requires the exact reviewed unsuspended process prestate.",
        );
      }

      return Object.freeze({
        summary:
          O01_PROCESS_SUSPEND_DELTA_SUMMARY,

        before:
          Object.freeze({
            pid:
              preflight.expectedPid,
            generation:
              preflight.expectedFixtureGeneration,
            username:
              DEMO_FIXTURE_USERNAME,
            namespace:
              DEMO_FIXTURE_NAMESPACE,
            startTimeUtc:
              preflight.sysAdminProcess
                ?.startTimeUtc ??
              "",
            purposeMarker:
              preflight.expectedPurposeMarker,
            suspended:
              false,
          }),

        after:
          Object.freeze({
            pid:
              preflight.expectedPid,
            generation:
              preflight.expectedFixtureGeneration,
            username:
              DEMO_FIXTURE_USERNAME,
            namespace:
              DEMO_FIXTURE_NAMESPACE,
            startTimeUtc:
              preflight.sysAdminProcess
                ?.startTimeUtc ??
              "",
            purposeMarker:
              preflight.expectedPurposeMarker,
            suspended:
              true,
            recoveryActionId:
              "O02_PROCESS_RESUME",
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
        !o01PrestateMatches(
          preflight,
        )
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "O01 impact analysis requires the exact reviewed witness prestate.",
        );
      }

      return Object.freeze({
        certainty:
          "KNOWN" as const,

        summary:
          "O01 suspends only the exact isolated Meridian witness process. No arbitrary PID is accepted: generation, username, namespace, StartTimeUTC, and self-written purpose marker must remain bound to the reviewed PID across three evidence sources.",

        affectedEntities:
          Object.freeze([
            Object.freeze({
              kind:
                "PROCESS",
              canonicalId:
                `process:${DEMO_FIXTURE_ID}:${intent.expectedFixtureGeneration}`,
              displayName:
                `${DEMO_FIXTURE_USERNAME} pid=${intent.expectedPid}`,
              effect:
                "Exactly one reviewed synthetic witness transitions from running to suspended.",
            }),
          ]),

        limitations:
          Object.freeze([
            "PID alone is never sufficient to authorize O01.",
            "O01 is fixture-only and refuses any principal other than meridian.demo.witness in USER.",
            "O01 does not terminate the process.",
            "O02_PROCESS_RESUME is the only reviewed recovery action; automatic recovery is forbidden.",
            "Automatic retry is forbidden after dispatch ambiguity.",
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
          O01ProcessSuspendIntent,
          O01ProcessSuspendPreflight
        >,
    ) {
      void context;

      assertIntent(
        reviewed.intent,
      );

      try {
        const fresh =
          await dependencies.readFreshPreflight(
            reviewed.intent,
          );

        const freshDigest =
          digestCanonicalJson(
            fresh,
          );

        if (
          !o01PrestateMatches(
            fresh,
          ) ||
          fresh.expectedFixtureGeneration !==
            reviewed.intent.expectedFixtureGeneration ||
          fresh.expectedPid !==
            reviewed.intent.expectedPid
        ) {
          return Object.freeze({
            outcome:
              "STALE" as const,

            freshPreflight:
              fresh,

            freshDigest,

            reason:
              "O01 exact process identity or unsuspended state changed after review; zero suspend POST dispatched.",
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
              "O01 fresh six-field preflight digest differs from the reviewed digest.",
          });
        }

        return Object.freeze({
          outcome:
            "MATCH" as const,

          freshPreflight:
            fresh,

          freshDigest,
        });
      } catch (
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
          "O01 execute refused because reviewed and fresh preflight digests differ.",
        );
      }

      let suspended:
        Readonly<{
          status:
            200;
          pid:
            number;
          mutationRequestCount:
            1;
          requestBodyPresent:
            false;
        }>;

      try {
        suspended =
          await dependencies.executeSuspend(
            ready.intent,
          );
      } catch (
        error
      ) {
        if (
          error instanceof
            O01ProcessMutationUnknownAfterDispatchError
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

      if (
        suspended.status !==
          200 ||
        suspended.pid !==
          ready.intent.expectedPid ||
        suspended.mutationRequestCount !==
          1 ||
        suspended.requestBodyPresent !==
          false
      ) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          "O01 suspend response did not prove one bodyless HTTP 200 dispatch to the reviewed PID. Automatic retry is forbidden.",
          {
            automaticRetry:
              false,
          },
        );
      }

      const after =
        await dependencies.readFreshProcessState(
          ready.intent,
        );

      if (
        !o01PoststateMatches(
          after,
          ready.preflight,
        )
      ) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          "O01 returned success but dual authoritative readback did not prove SUSP on the same exact six-field process identity. Automatic retry is forbidden.",
          {
            automaticRetry:
              false,
          },
        );
      }

      return execution({
        reviewed:
          ready.preflight,
        source:
          "DIRECT_EXECUTION",
      });
    },

    async reconcileUnknown(
      context,
      reviewed,
    ) {
      void context;

      assertIntent(
        reviewed.intent,
      );

      return reconcileUnknownO01ProcessSuspend(
        await dependencies.readFreshProcessState(
          reviewed.intent,
        ),
        reviewed.preflight,
      );
    },

    async verify(
      context,
      executionResult,
    ) {
      if (
        !executionResult.exactIdentityPreserved ||
        !executionResult.sysAdminSuspendedObserved ||
        !executionResult.nativeSuspendedObserved ||
        executionResult.mutationRequestCount !==
          1 ||
        !isPositivePid(
          executionResult.pid,
        )
      ) {
        throw new ProofEngineError(
          "PROOF_INCOMPLETE",
          "O01 execution evidence is incomplete.",
        );
      }

      return buildO01ProcessSuspendProofResults(
        executionResult,
        context.nowUtc,
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
          "PROCESS_RESUME",

        automatic:
          false as const,

        summary:
          "O02_PROCESS_RESUME is the explicit reviewed recovery action for the exact same six-field witness identity. Automatic resume is forbidden.",
      });
    },
  };

  return Object.freeze(
    contract,
  );
}

export async function certifyO01ProcessSuspendAction(
  input: {
    readonly intent:
      O01ProcessSuspendIntent;

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
    O01ProcessSuspendCertificationDependencies,
): Promise<
  VerifiedActionCertificationResult<
    O01ProcessSuspendExecution
  >
> {
  return certifyVerifiedAction(
    {
      contract:
        createO01ProcessSuspendProofContract(
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
