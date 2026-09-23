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
  O03_PROCESS_ACTION_ROLE,
  O03ProcessAuthorityDeniedError,
  O03ProcessMutationUnknownAfterDispatchError,
  type O03SysAdminProcessSnapshot,
} from "../../iris/process-terminate-action-transport";

export const O03_PROCESS_TERMINATE_CONTRACT_ID =
  "meridian.processes.process-terminate.v1" as const;

export const O03_PROCESS_TERMINATE_EXECUTION_SCHEMA_VERSION =
  "meridian.process-terminate-execution.v1" as const;

export const O03_PROCESS_TERMINATE_RECEIPT_ID =
  "meridian-o03-process-terminate-r8-a-001" as const;

export const O03_PROCESS_TERMINATE_CLOSURE_PLANES =
  Object.freeze([
    "PROCESS_STATE",
    "PERSISTENT_RECEIPT",
  ] as const);

export const O03_PROCESS_TERMINATE_DELTA_SUMMARY =
  "Terminate exactly one reviewed Meridian synthetic witness process through one bodyless POST /v2/process/terminate?id=<reviewed-pid>. Dispatch is permitted only while PID, controller-held generation, username, namespace, StartTimeUTC, and self-written UserInfo purpose marker still bind the same unique RUN witness across direct, SysAdmin, and independent native ProcessQuery evidence. State B requires both authoritative process planes to prove the frozen reviewed identity absent. PID reuse, proof-plane disagreement, receipt failure, transport ambiguity, or any other uncertain outcome never authorizes an automatic second terminate request." as const;

export interface O03DirectWitnessIdentity {
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

export interface O03NativeProcessSnapshot {
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

export interface O03ProcessTerminateIntent {
  readonly actionId:
    "O03_PROCESS_TERMINATE";

  readonly expectedFixtureGeneration:
    string;

  readonly expectedPid:
    number;
}

export interface O03ProcessTerminatePreflight {
  readonly schemaVersion:
    "meridian.process-terminate-preflight.v1";

  readonly expectedFixtureGeneration:
    string;

  readonly expectedPid:
    number;

  readonly expectedPurposeMarker:
    string;

  readonly authorizedTerminateRequestDigest:
    string;

  readonly directIdentity:
    O03DirectWitnessIdentity;

  readonly sysAdminProcess:
    O03SysAdminProcessSnapshot | null;

  readonly nativeProcess:
    O03NativeProcessSnapshot | null;

  readonly matchingNativeCount:
    number;

  readonly officialReadOperation:
    "GET /v2/process";

  readonly officialMutationOperation:
    "POST /v2/process/terminate";

  readonly requiredAuthority:
    "%Admin_Operate:U";

  readonly authorityRole:
    typeof O03_PROCESS_ACTION_ROLE;

  readonly authorityMode:
    "EXPLICIT_ESCALATION_ROLE";
}

export interface O03ProcessStateReadback {
  readonly schemaVersion:
    "meridian.process-terminate-state-readback.v1";

  readonly expectedFixtureGeneration:
    string;

  readonly expectedPid:
    number;

  readonly expectedPurposeMarker:
    string;

  readonly sysAdminProcess:
    O03SysAdminProcessSnapshot | null;

  readonly nativeProcess:
    O03NativeProcessSnapshot | null;

  readonly matchingNativeCount:
    number;
}

export interface O03ProcessTerminateExecution {
  readonly schemaVersion:
    typeof O03_PROCESS_TERMINATE_EXECUTION_SCHEMA_VERSION;

  readonly state:
    "APPLIED";

  readonly actionId:
    "O03_PROCESS_TERMINATE";

  readonly generation:
    string;

  readonly pid:
    number;

  readonly purposeMarker:
    string;

  readonly startTimeUtc:
    string;

  readonly terminateStatus:
    200 | null;

  readonly httpTerminateResponseVerified:
    boolean;

  readonly mutationRequestCount:
    1;

  readonly exactReviewedIdentityAbsent:
    true;

  readonly sysAdminAbsenceObserved:
    true;

  readonly nativeAbsenceObserved:
    true;

  readonly resolutionSource:
    "DIRECT_EXECUTION" |
    "AUTHORITATIVE_RECONCILIATION_READBACK";
}

export interface O03ProcessTerminateContractDependencies {
  readonly readFreshPreflight:
    (
      intent:
        O03ProcessTerminateIntent,
    ) =>
      Promise<
        O03ProcessTerminatePreflight
      >;

  readonly executeTerminate:
    (
      intent:
        O03ProcessTerminateIntent,
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
        O03ProcessTerminateIntent,
    ) =>
      Promise<
        O03ProcessStateReadback
      >;
}

export interface O03ProcessTerminateCertificationDependencies {
  readonly contract:
    O03ProcessTerminateContractDependencies;

  readonly certification:
    VerifiedActionCertificationDependencies<
      O03ProcessTerminatePreflight
    >;
}

export const O03_PROCESS_TERMINATE_PROOF_REQUIREMENTS:
  readonly ProofRequirement[] =
  Object.freeze([
    Object.freeze({
      requirementId:
        "o03-sysadmin-process-absence",

      plane:
        "PROCESS_STATE",

      applicability:
        "REQUIRED",

      description:
        "Official GET /v2/process readback proves no process remains at the reviewed PID after the one-shot termination; any replacement PID occupant prevents APPLIED classification.",

      source:
        "IRIS SysAdmin API GET /v2/process",
    }),

    Object.freeze({
      requirementId:
        "o03-native-process-absence",

      plane:
        "PROCESS_STATE",

      applicability:
        "REQUIRED",

      description:
        "Independent native %SYS.ProcessQuery readback proves the reviewed PID has no remaining process row and therefore no exact frozen Meridian witness identity remains.",

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

function snapshotsMatchReviewedIdentity(
  sysAdmin:
    O03SysAdminProcessSnapshot,
  native:
    O03NativeProcessSnapshot,
  reviewed:
    O03ProcessTerminatePreflight,
): boolean {
  return (
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

export function o03AuthorizedTerminateRequestDigest(
  pid:
    number,
): string {
  if (
    !isPositivePid(
      pid,
    )
  ) {
    throw new Error(
      "O03 terminate request digest requires a positive safe pid.",
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
      "/v2/process/terminate",

    query:
      {
        id:
          pid,
      },
  });
}

export function o03ProcessTerminateIntent(
  generation:
    string,
  pid:
    number,
): O03ProcessTerminateIntent {
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
      "O03 fixture generation must be a canonical lowercase UUID.",
    );
  }

  if (
    !isPositivePid(
      pid,
    )
  ) {
    throw new Error(
      "O03 process id must be a positive safe integer.",
    );
  }

  return Object.freeze({
    actionId:
      "O03_PROCESS_TERMINATE" as const,

    expectedFixtureGeneration:
      canonical,

    expectedPid:
      pid,
  });
}

function assertIntent(
  intent:
    O03ProcessTerminateIntent,
): void {
  if (
    intent.actionId !==
      "O03_PROCESS_TERMINATE" ||
    !isCanonicalGeneration(
      intent.expectedFixtureGeneration,
    ) ||
    !isPositivePid(
      intent.expectedPid,
    )
  ) {
    throw new ProofEngineError(
      "INVALID_TARGET",
      "O03 intent is outside the frozen exact Meridian witness boundary.",
    );
  }
}

export function o03PrestateMatches(
  preflight:
    O03ProcessTerminatePreflight,
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
      "meridian.process-terminate-preflight.v1" &&
    isCanonicalGeneration(
      preflight.expectedFixtureGeneration,
    ) &&
    isPositivePid(
      preflight.expectedPid,
    ) &&
    preflight.expectedPurposeMarker ===
      expectedPurpose &&
    preflight.authorizedTerminateRequestDigest ===
      o03AuthorizedTerminateRequestDigest(
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
    snapshotsMatchReviewedIdentity(
      sysAdmin,
      native,
      preflight,
    ) &&
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
      native.state.trim().toUpperCase() &&
    preflight.officialReadOperation ===
      "GET /v2/process" &&
    preflight.officialMutationOperation ===
      "POST /v2/process/terminate" &&
    preflight.requiredAuthority ===
      "%Admin_Operate:U" &&
    preflight.authorityRole ===
      O03_PROCESS_ACTION_ROLE &&
    preflight.authorityMode ===
      "EXPLICIT_ESCALATION_ROLE"
  );
}

function exactReviewedRunningStateMatches(
  readback:
    O03ProcessStateReadback,
  reviewed:
    O03ProcessTerminatePreflight,
): boolean {
  const sysAdmin =
    readback.sysAdminProcess;

  const native =
    readback.nativeProcess;

  return (
    readback.schemaVersion ===
      "meridian.process-terminate-state-readback.v1" &&
    readback.expectedFixtureGeneration ===
      reviewed.expectedFixtureGeneration &&
    readback.expectedPid ===
      reviewed.expectedPid &&
    readback.expectedPurposeMarker ===
      reviewed.expectedPurposeMarker &&
    readback.matchingNativeCount ===
      1 &&
    sysAdmin !==
      null &&
    native !==
      null &&
    snapshotsMatchReviewedIdentity(
      sysAdmin,
      native,
      reviewed,
    ) &&
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

export function o03PoststateMatches(
  readback:
    O03ProcessStateReadback,
  reviewed:
    O03ProcessTerminatePreflight,
): boolean {
  return (
    o03PrestateMatches(
      reviewed,
    ) &&
    readback.schemaVersion ===
      "meridian.process-terminate-state-readback.v1" &&
    readback.expectedFixtureGeneration ===
      reviewed.expectedFixtureGeneration &&
    readback.expectedPid ===
      reviewed.expectedPid &&
    readback.expectedPurposeMarker ===
      reviewed.expectedPurposeMarker &&
    readback.sysAdminProcess ===
      null &&
    readback.nativeProcess ===
      null &&
    readback.matchingNativeCount ===
      0
  );
}

function execution(
  input: {
    readonly reviewed:
      O03ProcessTerminatePreflight;

    readonly source:
      O03ProcessTerminateExecution[
        "resolutionSource"
      ];
  },
): O03ProcessTerminateExecution {
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
      "O03 reviewed process StartTimeUTC is missing.",
    );
  }

  return Object.freeze({
    schemaVersion:
      O03_PROCESS_TERMINATE_EXECUTION_SCHEMA_VERSION,

    state:
      "APPLIED" as const,

    actionId:
      "O03_PROCESS_TERMINATE" as const,

    generation:
      input.reviewed.expectedFixtureGeneration,

    pid:
      input.reviewed.expectedPid,

    purposeMarker:
      input.reviewed.expectedPurposeMarker,

    startTimeUtc,

    terminateStatus:
      input.source ===
        "DIRECT_EXECUTION"
        ? 200 as const
        : null,

    httpTerminateResponseVerified:
      input.source ===
        "DIRECT_EXECUTION",

    mutationRequestCount:
      1 as const,

    exactReviewedIdentityAbsent:
      true as const,

    sysAdminAbsenceObserved:
      true as const,

    nativeAbsenceObserved:
      true as const,

    resolutionSource:
      input.source,
  });
}

function mapAuthorityDenied(
  error:
    unknown,
): RevalidationDecision<
  O03ProcessTerminatePreflight
> | null {
  if (
    error instanceof
      O03ProcessAuthorityDeniedError
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

export function reconcileUnknownO03ProcessTerminate(
  readback:
    O03ProcessStateReadback,
  reviewed:
    O03ProcessTerminatePreflight,
): ReconciliationDecision<
  O03ProcessTerminateExecution
> {
  if (
    o03PoststateMatches(
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
    exactReviewedRunningStateMatches(
      readback,
      reviewed,
    )
  ) {
    return Object.freeze({
      outcome:
        "NOT_APPLIED" as const,

      reason:
        "AUTHORITATIVE_DUAL_READBACK_STILL_MATCHED_EXACT_REVIEWED_RUNNING_PROCESS_IDENTITY",
    });
  }

  return Object.freeze({
    outcome:
      "STILL_UNKNOWN" as const,

    reason:
      (
        "AUTHORITATIVE_DUAL_READBACK_DID_NOT_PROVE_BOTH_ABSENT_OR_THE_EXACT_" +
        "REVIEWED_RUNNING_IDENTITY. PID reuse or proof-plane disagreement must " +
        "not trigger a retry."
      ),
  });
}

function processProofResult(
  input: {
    readonly requirement:
      ProofRequirement;

    readonly execution:
      O03ProcessTerminateExecution;

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
      "The exact frozen Meridian witness generation is absent after one reviewed irreversible process termination.",

    observedSummary:
      (
        `PID ${input.execution.pid} frozen generation ${input.execution.generation} ` +
        "is absent on the authoritative process proof plane."
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
        exactReviewedIdentityAbsent:
          true,
        sourceType:
          input.sourceType,
      }),
  });
}

export function buildO03ProcessTerminateProofResults(
  executionResult:
    O03ProcessTerminateExecution,
  observedAtUtc:
    string,
): readonly ProofResult[] {
  const sysAdmin =
    O03_PROCESS_TERMINATE_PROOF_REQUIREMENTS[
      0
    ];

  const native =
    O03_PROCESS_TERMINATE_PROOF_REQUIREMENTS[
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
      "O03 process-absence requirements are incomplete.",
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

export function createO03ProcessTerminateProofContract(
  dependencies:
    O03ProcessTerminateContractDependencies,
): ProofContract<
  O03ProcessTerminateIntent,
  O03ProcessTerminatePreflight,
  O03ProcessTerminateExecution
> {
  const contract:
    ProofContract<
      O03ProcessTerminateIntent,
      O03ProcessTerminatePreflight,
      O03ProcessTerminateExecution
    > =
  {
    schemaVersion:
      PROOF_CONTRACT_SCHEMA_VERSION,

    contractId:
      O03_PROCESS_TERMINATE_CONTRACT_ID,

    contractVersion:
      1,

    actionType:
      "PROCESS_TERMINATE",

    domain:
      "SYSTEM_PROCESSES",

    risk:
      "HIGH",

    reversibility:
      "IRREVERSIBLE",

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
      O03_PROCESS_TERMINATE_PROOF_REQUIREMENTS,

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
        !o03PrestateMatches(
          preflight,
        )
      ) {
        throw new ProofEngineError(
          "STALE_PRECONDITION",
          "O03 preflight requires exactly one running synthetic witness with all six identity fields bound across direct, SysAdmin, and native evidence.",
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
        !o03PrestateMatches(
          preflight,
        )
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "O03 expected delta requires the exact reviewed running process prestate.",
        );
      }

      return Object.freeze({
        summary:
          O03_PROCESS_TERMINATE_DELTA_SUMMARY,

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
            running:
              true,
            exactReviewedIdentityPresent:
              true,
          }),

        after:
          Object.freeze({
            pid:
              preflight.expectedPid,
            generation:
              preflight.expectedFixtureGeneration,
            exactReviewedIdentityPresent:
              false,
            sameIdentityRollbackSupported:
              false,
            automaticRetryAllowed:
              false,
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
        !o03PrestateMatches(
          preflight,
        )
      ) {
        throw new ProofEngineError(
          "INVALID_CONTRACT",
          "O03 impact analysis requires the exact reviewed running witness prestate.",
        );
      }

      return Object.freeze({
        certainty:
          "KNOWN" as const,

        summary:
          "O03 irreversibly terminates only the exact isolated Meridian witness generation. PID alone is never sufficient: generation, username, namespace, StartTimeUTC, and self-written purpose marker must still bind the reviewed PID across three evidence sources immediately before dispatch.",

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
                "Exactly one reviewed synthetic witness generation is terminated.",
            }),
          ]),

        limitations:
          Object.freeze([
            "O03 is fixture-only and refuses any principal other than meridian.demo.witness in USER.",
            "PID alone is never sufficient to authorize O03.",
            "Termination is IRREVERSIBLE for the same process generation.",
            "A recreated witness is a separate explicit fixture lifecycle, not rollback.",
            "Automatic retry and automatic recovery are forbidden after dispatch ambiguity.",
            "PID reuse or proof-plane disagreement cannot authorize a second termination.",
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
          O03ProcessTerminateIntent,
          O03ProcessTerminatePreflight
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
          !o03PrestateMatches(
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
              "O03 exact process identity or RUN state changed after review; zero terminate POST dispatched.",
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
              "O03 fresh six-field preflight digest differs from the reviewed digest.",
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
          "O03 execute refused because reviewed and fresh preflight digests differ.",
        );
      }

      let terminated:
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
        terminated =
          await dependencies.executeTerminate(
            ready.intent,
          );
      } catch (
        error
      ) {
        if (
          error instanceof
            O03ProcessMutationUnknownAfterDispatchError
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
        terminated.status !==
          200 ||
        terminated.pid !==
          ready.intent.expectedPid ||
        terminated.mutationRequestCount !==
          1 ||
        terminated.requestBodyPresent !==
          false
      ) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          "O03 terminate response did not prove one bodyless HTTP 200 dispatch to the reviewed PID. Automatic retry is forbidden.",
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
        !o03PoststateMatches(
          after,
          ready.preflight,
        )
      ) {
        throw new ProofEngineError(
          "UNKNOWN_AFTER_DISPATCH",
          "O03 returned success but dual authoritative readback did not prove the reviewed PID absent on both proof planes. PID reuse, disagreement, or surviving identity must not trigger an automatic retry.",
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

      return reconcileUnknownO03ProcessTerminate(
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
        !executionResult.exactReviewedIdentityAbsent ||
        !executionResult.sysAdminAbsenceObserved ||
        !executionResult.nativeAbsenceObserved ||
        executionResult.mutationRequestCount !==
          1 ||
        !isPositivePid(
          executionResult.pid,
        )
      ) {
        throw new ProofEngineError(
          "PROOF_INCOMPLETE",
          "O03 execution evidence is incomplete.",
        );
      }

      return buildO03ProcessTerminateProofResults(
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
          null,

        automatic:
          false as const,

        summary:
          "O03 is IRREVERSIBLE for the terminated process generation. A new witness may be created only through a separate explicit fixture lifecycle and is not rollback.",
      });
    },
  };

  return Object.freeze(
    contract,
  );
}

export async function certifyO03ProcessTerminateAction(
  input: {
    readonly intent:
      O03ProcessTerminateIntent;

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
    O03ProcessTerminateCertificationDependencies,
): Promise<
  VerifiedActionCertificationResult<
    O03ProcessTerminateExecution
  >
> {
  return certifyVerifiedAction(
    {
      contract:
        createO03ProcessTerminateProofContract(
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
