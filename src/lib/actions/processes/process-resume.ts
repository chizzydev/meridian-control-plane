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
  O02_PROCESS_ACTION_ROLE,
  O02ProcessAuthorityDeniedError,
  O02ProcessMutationUnknownAfterDispatchError,
  type O02SysAdminProcessSnapshot,
} from "../../iris/process-resume-action-transport";

export const O02_PROCESS_RESUME_CONTRACT_ID =
  "meridian.processes.process-resume.v1" as const;

export const O02_PROCESS_RESUME_EXECUTION_SCHEMA_VERSION =
  "meridian.process-resume-execution.v1" as const;

export const O02_PROCESS_RESUME_RECEIPT_ID =
  "meridian-o02-process-resume-r7-a-001" as const;

export const O02_PROCESS_RESUME_CLOSURE_PLANES =
  Object.freeze([
    "PROCESS_STATE",
    "PERSISTENT_RECEIPT",
  ] as const);

export const O02_PROCESS_RESUME_DELTA_SUMMARY =
  "Resume exactly one reviewed Meridian synthetic witness process through one bodyless POST /v2/process/resume?id=<reviewed-pid>. Targeting is permitted only after PID, controller-held generation, username, namespace, StartTimeUTC, and self-written UserInfo purpose marker agree across the direct witness, SysAdmin process detail, and independent native ProcessQuery evidence in exact SUSP prestate. State B must preserve the same exact six-field identity and independently report RUN with CanBeSuspended and CanBeTerminated true on both external read planes. Automatic retry and automatic recovery are forbidden; any later PROCESS_SUSPEND recovery requires a separate reviewed action and O01 is never automatically rerun." as const;

export interface O02DirectWitnessIdentity {
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

export interface O02NativeProcessSnapshot {
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

export interface O02ProcessResumeIntent {
  readonly actionId:
    "O02_PROCESS_RESUME";

  readonly expectedFixtureGeneration:
    string;

  readonly expectedPid:
    number;
}

export interface O02ProcessResumePreflight {
  readonly schemaVersion:
    "meridian.process-resume-preflight.v1";

  readonly expectedFixtureGeneration:
    string;

  readonly expectedPid:
    number;

  readonly expectedPurposeMarker:
    string;

  readonly authorizedResumeRequestDigest:
    string;

  readonly directIdentity:
    O02DirectWitnessIdentity;

  readonly sysAdminProcess:
    O02SysAdminProcessSnapshot | null;

  readonly nativeProcess:
    O02NativeProcessSnapshot | null;

  readonly matchingNativeCount:
    number;

  readonly officialReadOperation:
    "GET /v2/process";

  readonly officialMutationOperation:
    "POST /v2/process/resume";

  readonly requiredAuthority:
    "%Admin_Operate:U";

  readonly authorityRole:
    typeof O02_PROCESS_ACTION_ROLE;

  readonly authorityMode:
    "EXPLICIT_ESCALATION_ROLE";
}

export interface O02ProcessStateReadback {
  readonly schemaVersion:
    "meridian.process-resume-state-readback.v1";

  readonly expectedFixtureGeneration:
    string;

  readonly expectedPid:
    number;

  readonly expectedPurposeMarker:
    string;

  readonly sysAdminProcess:
    O02SysAdminProcessSnapshot | null;

  readonly nativeProcess:
    O02NativeProcessSnapshot | null;

  readonly matchingNativeCount:
    number;
}

export interface O02ProcessResumeExecution {
  readonly schemaVersion:
    typeof O02_PROCESS_RESUME_EXECUTION_SCHEMA_VERSION;

  readonly state:
    "APPLIED";

  readonly actionId:
    "O02_PROCESS_RESUME";

  readonly generation:
    string;

  readonly pid:
    number;

  readonly purposeMarker:
    string;

  readonly startTimeUtc:
    string;

  readonly resumeStatus:
    200 | null;

  readonly httpResumeResponseVerified:
    boolean;

  readonly mutationRequestCount:
    1;

  readonly exactIdentityPreserved:
    true;

  readonly sysAdminRunningObserved:
    true;

  readonly nativeRunningObserved:
    true;

  readonly resolutionSource:
    "DIRECT_EXECUTION" |
    "AUTHORITATIVE_RECONCILIATION_READBACK";
}

export interface O02ProcessResumeContractDependencies {
  readonly readFreshPreflight:
    (
      intent:
        O02ProcessResumeIntent,
    ) =>
      Promise<
        O02ProcessResumePreflight
      >;

  readonly executeResume:
    (
      intent:
        O02ProcessResumeIntent,
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
        O02ProcessResumeIntent,
    ) =>
      Promise<
        O02ProcessStateReadback
      >;
}

export interface O02ProcessResumeCertificationDependencies {
  readonly contract:
    O02ProcessResumeContractDependencies;

  readonly certification:
    VerifiedActionCertificationDependencies<
      O02ProcessResumePreflight
    >;
}

export const O02_PROCESS_RESUME_PROOF_REQUIREMENTS:
  readonly ProofRequirement[] =
  Object.freeze([
    Object.freeze({
      requirementId:
        "o02-sysadmin-process-state",

      plane:
        "PROCESS_STATE",

      applicability:
        "REQUIRED",

      description:
        "Official GET /v2/process readback proves the reviewed PID still belongs to the exact Meridian witness generation, username, namespace, StartTimeUTC, and UserInfo purpose marker and is in running state with suspend and terminate capabilities restored.",

      source:
        "IRIS SysAdmin API GET /v2/process",
    }),

    Object.freeze({
      requirementId:
        "o02-native-process-state",

      plane:
        "PROCESS_STATE",

      applicability:
        "REQUIRED",

      description:
        "Independent native %SYS.ProcessQuery readback proves the same reviewed PID, username, namespace, StartTimeUTC, and UserInfo purpose marker and reports RUN with CanBeSuspended and CanBeTerminated true.",

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

function runningState(
  value:
    string,
): boolean {
  return value
    .trim()
    .toUpperCase()
    .startsWith(
      "RUN",
    );
}

function externalIdentityMatches(
  readback:
    O02ProcessStateReadback,
  reviewed:
    O02ProcessResumePreflight,
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
      "meridian.process-resume-state-readback.v1" &&
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

export function o02AuthorizedResumeRequestDigest(
  pid:
    number,
): string {
  if (
    !isPositivePid(
      pid,
    )
  ) {
    throw new Error(
      "O02 resume request digest requires a positive safe pid.",
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
      "/v2/process/resume",

    query:
      {
        id:
          pid,
      },
  });
}

export function o02ProcessResumeIntent(
  generation:
    string,
  pid:
    number,
): O02ProcessResumeIntent {
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
      "O02 fixture generation must be a canonical lowercase UUID.",
    );
  }

  if (
    !isPositivePid(
      pid,
    )
  ) {
    throw new Error(
      "O02 process id must be a positive safe integer.",
    );
  }

  return Object.freeze({
    actionId:
      "O02_PROCESS_RESUME" as const,

    expectedFixtureGeneration:
      canonical,

    expectedPid:
      pid,
  });
}

function assertIntent(
  intent:
    O02ProcessResumeIntent,
): void {
  if (
    intent.actionId !==
      "O02_PROCESS_RESUME" ||
    !isCanonicalGeneration(
      intent.expectedFixtureGeneration,
    ) ||
    !isPositivePid(
      intent.expectedPid,
    )
  ) {
    throw new ProofEngineError(
      "INVALID_TARGET",
      "O02 intent is outside the frozen exact Meridian witness boundary.",
    );
  }
}

export function o02PrestateMatches(
  preflight:
    O02ProcessResumePreflight,
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
      "meridian.process-resume-preflight.v1" &&
    isCanonicalGeneration(
      preflight.expectedFixtureGeneration,
    ) &&
    isPositivePid(
      preflight.expectedPid,
    ) &&
    preflight.expectedPurposeMarker ===
      expectedPurpose &&
    preflight.authorizedResumeRequestDigest ===
      o02AuthorizedResumeRequestDigest(
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
    !sysAdmin.canBeSuspended &&
    !native.canBeSuspended &&
    sysAdmin.canBeTerminated &&
    native.canBeTerminated &&
    suspendedState(
      sysAdmin.state,
    ) &&
    suspendedState(
      native.state,
    ) &&
    sysAdmin.state.trim().toUpperCase() ===
      native.state.trim().toUpperCase() &&
    preflight.officialReadOperation ===
      "GET /v2/process" &&
    preflight.officialMutationOperation ===
      "POST /v2/process/resume" &&
    preflight.requiredAuthority ===
      "%Admin_Operate:U" &&
    preflight.authorityRole ===
      O02_PROCESS_ACTION_ROLE &&
    preflight.authorityMode ===
      "EXPLICIT_ESCALATION_ROLE"
  );
}

export function o02PoststateMatches(
  readback:
    O02ProcessStateReadback,
  reviewed:
    O02ProcessResumePreflight,
): boolean {
  const sysAdmin =
    readback.sysAdminProcess;

  const native =
    readback.nativeProcess;

  return (
    o02PrestateMatches(
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
    sysAdmin.canBeSuspended &&
    native.canBeSuspended &&
    sysAdmin.canBeTerminated &&
    native.canBeTerminated &&
    runningState(
      sysAdmin.state,
    ) &&
    runningState(
      native.state,
    ) &&
    sysAdmin.state.trim().toUpperCase() ===
      native.state.trim().toUpperCase()
  );
}

function suspendedExternalStateMatches(
  readback:
    O02ProcessStateReadback,
  reviewed:
    O02ProcessResumePreflight,
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
    !sysAdmin.canBeSuspended &&
    !native.canBeSuspended &&
    sysAdmin.canBeTerminated &&
    native.canBeTerminated &&
    suspendedState(
      sysAdmin.state,
    ) &&
    suspendedState(
      native.state,
    ) &&
    sysAdmin.state.trim().toUpperCase() ===
      native.state.trim().toUpperCase()
  );
}

function execution(
  input: {
    readonly reviewed:
      O02ProcessResumePreflight;

    readonly source:
      O02ProcessResumeExecution[
        "resolutionSource"
      ];
  },
): O02ProcessResumeExecution {
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
      "O02 reviewed process StartTimeUTC is missing.",
    );
  }

  return Object.freeze({
    schemaVersion:
      O02_PROCESS_RESUME_EXECUTION_SCHEMA_VERSION,

    state:
      "APPLIED" as const,

    actionId:
      "O02_PROCESS_RESUME" as const,

    generation:
      input.reviewed.expectedFixtureGeneration,

    pid:
      input.reviewed.expectedPid,

    purposeMarker:
      input.reviewed.expectedPurposeMarker,

    startTimeUtc,

    resumeStatus:
      input.source ===
        "DIRECT_EXECUTION"
        ? 200 as const
        : null,

    httpResumeResponseVerified:
      input.source ===
        "DIRECT_EXECUTION",

    mutationRequestCount:
      1 as const,

    exactIdentityPreserved:
      true as const,

    sysAdminRunningObserved:
      true as const,

    nativeRunningObserved:
      true as const,

    resolutionSource:
      input.source,
  });
}

function mapAuthorityDenied(
  error:
    unknown,
): RevalidationDecision<
  O02ProcessResumePreflight
> | null {
  if (
    error instanceof
      O02ProcessAuthorityDeniedError
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

export function reconcileUnknownO02ProcessResume(
  readback:
    O02ProcessStateReadback,
  reviewed:
    O02ProcessResumePreflight,
): ReconciliationDecision<
  O02ProcessResumeExecution
> {
  if (
    o02PoststateMatches(
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
    suspendedExternalStateMatches(
      readback,
      reviewed,
    )
  ) {
    return Object.freeze({
      outcome:
        "NOT_APPLIED" as const,

      reason:
        "AUTHORITATIVE_DUAL_READBACK_MATCHED_EXACT_REVIEWED_SUSPENDED_PROCESS_IDENTITY",
    });
  }

  return Object.freeze({
    outcome:
      "STILL_UNKNOWN" as const,

    reason:
      "AUTHORITATIVE_DUAL_READBACK_MATCHED_NEITHER_EXACT_REVIEWED_SUSPENDED_IDENTITY_NOR_EXACT_RUNNING_POSTSTATE",
  });
}

function processProofResult(
  input: {
    readonly requirement:
      ProofRequirement;

    readonly execution:
      O02ProcessResumeExecution;

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
      "The exact six-field Meridian witness identity remains stable and the reviewed process is running with suspend and terminate capabilities restored.",

    observedSummary:
      (
        `PID ${input.execution.pid} preserved generation, username, namespace, ` +
        `StartTimeUTC, and purpose marker; RUN state independently observed.`
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
          "RUN",
      }),
  });
}

export function buildO02ProcessResumeProofResults(
  executionResult:
    O02ProcessResumeExecution,
  observedAtUtc:
    string,
): readonly ProofResult[] {
  const sysAdmin =
    O02_PROCESS_RESUME_PROOF_REQUIREMENTS[
      0
    ];

  const native =
    O02_PROCESS_RESUME_PROOF_REQUIREMENTS[
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
      "O02 process-state requirements are incomplete.",
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

export function createO02ProcessResumeProofContract(
  dependencies:
    O02ProcessResumeContractDependencies,
): ProofContract<
  O02ProcessResumeIntent,
  O02ProcessResumePreflight,
  O02ProcessResumeExecution
> {
  const contract:
    ProofContract<
      O02ProcessResumeIntent,
      O02ProcessResumePreflight,
      O02ProcessResumeExecution
    > =
  {
    schemaVersion:
      PROOF_CONTRACT_SCHEMA_VERSION,

    contractId:
      O02_PROCESS_RESUME_CONTRACT_ID,

    contractVersion:
      1,

    actionType:
      "PROCESS_RESUME",

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
      O02_PROCESS_RESUME_PROOF_REQUIREMENTS,

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
        !o02PrestateMatches(
          preflight,
        )
      ) {
        throw new ProofEngineError(
          "STALE_PRECONDITION",
          "O02 preflight requires exactly one suspended synthetic witness with all six identity fields bound across direct, SysAdmin, and native evidence.",
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
        !o02PrestateMatches(
          preflight,
        )
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "O02 expected delta requires the exact reviewed suspended process prestate.",
        );
      }

      return Object.freeze({
        summary:
          O02_PROCESS_RESUME_DELTA_SUMMARY,

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
              true,
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
              false,
            recoveryActionType:
              "PROCESS_SUSPEND",
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
        !o02PrestateMatches(
          preflight,
        )
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "O02 impact analysis requires the exact reviewed suspended witness prestate.",
        );
      }

      return Object.freeze({
        certainty:
          "KNOWN" as const,

        summary:
          "O02 resumes only the exact isolated Meridian witness process. No arbitrary PID is accepted: generation, username, namespace, StartTimeUTC, and self-written purpose marker must remain bound to the reviewed PID across three evidence sources.",

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
                "Exactly one reviewed synthetic witness transitions from suspended to running.",
            }),
          ]),

        limitations:
          Object.freeze([
            "PID alone is never sufficient to authorize O02.",
            "O02 is fixture-only and refuses any principal other than meridian.demo.witness in USER.",
            "O02 does not terminate the process.",
            "PROCESS_SUSPEND is only a conceptual recovery type here; O01 is never automatically rerun.",
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
          O02ProcessResumeIntent,
          O02ProcessResumePreflight
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
          !o02PrestateMatches(
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
              "O02 exact process identity or suspended state changed after review; zero resume POST dispatched.",
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
              "O02 fresh six-field preflight digest differs from the reviewed digest.",
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
          "O02 execute refused because reviewed and fresh preflight digests differ.",
        );
      }

      let resumed:
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
        resumed =
          await dependencies.executeResume(
            ready.intent,
          );
      } catch (
        error
      ) {
        if (
          error instanceof
            O02ProcessMutationUnknownAfterDispatchError
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
        resumed.status !==
          200 ||
        resumed.pid !==
          ready.intent.expectedPid ||
        resumed.mutationRequestCount !==
          1 ||
        resumed.requestBodyPresent !==
          false
      ) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          "O02 resume response did not prove one bodyless HTTP 200 dispatch to the reviewed PID. Automatic retry is forbidden.",
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
        !o02PoststateMatches(
          after,
          ready.preflight,
        )
      ) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          "O02 returned success but dual authoritative readback did not prove RUN with restored suspend/terminate capabilities on the same exact six-field process identity. Automatic retry is forbidden.",
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

      return reconcileUnknownO02ProcessResume(
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
        !executionResult.sysAdminRunningObserved ||
        !executionResult.nativeRunningObserved ||
        executionResult.mutationRequestCount !==
          1 ||
        !isPositivePid(
          executionResult.pid,
        )
      ) {
        throw new ProofEngineError(
          "PROOF_INCOMPLETE",
          "O02 execution evidence is incomplete.",
        );
      }

      return buildO02ProcessResumeProofResults(
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
          "PROCESS_SUSPEND",

        automatic:
          false as const,

        summary:
          "PROCESS_SUSPEND is the conceptual recovery type for O02, but O01 is sealed history and no physical suspension is automatically authorized.",
      });
    },
  };

  return Object.freeze(
    contract,
  );
}

export async function certifyO02ProcessResumeAction(
  input: {
    readonly intent:
      O02ProcessResumeIntent;

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
    O02ProcessResumeCertificationDependencies,
): Promise<
  VerifiedActionCertificationResult<
    O02ProcessResumeExecution
  >
> {
  return certifyVerifiedAction(
    {
      contract:
        createO02ProcessResumeProofContract(
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
