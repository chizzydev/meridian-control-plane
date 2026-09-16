import rawReceipt from "./recorded-receipts/maya-patel-remove-meridian-supervisor.json";

export const RECORDED_RECEIPT_SHA256 =
  "39E43BB29CD8C7AD502F86846D5044918C508642209CC82E75627DB37AD6C4E6";

export type ChangeOperation =
  | "ADD"
  | "REMOVE";

export type ImpactOutcome =
  | "GAINED"
  | "LOST"
  | "RETAINED";

export interface PermissionPair {
  resource: string;
  permission: string;
}

export interface DeclaredApplicationImpact {
  asset: string;
  requiredResource: string;
  requiredPermission: string;
  outcome: ImpactOutcome;
}

export interface DeclaredOperationImpact {
  method: string;
  path: string;
  operationId: string;
  requiredResource: string;
  requiredPermission: string;
  outcome: ImpactOutcome;
}

export interface ReceiptTimelineStage {
  stage: string;
  status: string;
  digest?: string;
  utcTimestamp?: string;
  auditIndex?: number;
  mode?: string;
  residueObserved?: boolean;
}

export interface RecordedVerifiedReceipt {
  schemaVersion: string;
  receiptId: string;
  organization: string;
  lifecycleState: "VERIFIED";

  change: {
    username: string;
    displayName: string;
    operation: ChangeOperation;
    role: string;
  };

  authorization: {
    reviewedPreflightDigest: string;
    freshApplyTimePreflightDigest: string;
    applyTimeDigestMatched: boolean;
    freshApplyTimeRevalidationPassed: boolean;
    humanAuthorizationReceived: boolean;
    authorizedMutationPostNumber: number;
    mutationPostAttempts: number;
    automaticRetryPerformed: boolean;
    authorizationConsumed: boolean;
    rerunAuthorized: boolean;
    fourthMutationPostAuthorized: boolean;
  };

  apply: {
    result: string;
    httpStatus: number;
    responseOk: boolean;
    actor: string;
    pid: number;
    zTimestamp: string;
    utcTimestamp: string;
  };

  roles: {
    directBefore: string[];
    directAfter: string[];
    effectiveBefore: string[];
    effectiveAfter: string[];
    lostEffectiveRoles: string[];
    retainedEffectiveRoles: string[];
  };

  permissionDelta: {
    gained: PermissionPair[];
    lost: PermissionPair[];
    retained: PermissionPair[];
  };

  declaredImpact: {
    applications: DeclaredApplicationImpact[];
    operations: DeclaredOperationImpact[];

    summary: {
      lostEffectiveRoleCount: number;
      lostPermissionCount: number;
      declaredApplicationCount: number;
      lostApplicationCount: number;
      retainedApplicationCount: number;
      declaredRestOperationCount: number;
      lostRestOperationCount: number;
      retainedRestOperationCount: number;
    };
  };

  convergence: {
    configuredStateCorrect: boolean;
    targetProcessPresent: boolean;
    targetProcessCardinality: string;
    liveResidueObserved: boolean;
    liveAccessConverged: boolean;
    mode: string;
    staleProcessTransitionDemonstratedByThisApply: boolean;
    samePidAcrossPost3: string;
    processTerminationPerformed: boolean;
    processReauthenticationPerformed: boolean;
    newTargetProcessCreated: boolean;
  };

  nativeAudit: {
    bound: boolean;
    exactMetadataMatchCount: number;
    systemId: string;
    auditIndex: number;
    utcTimestamp: string;
    source: string;
    type: string;
    event: string;
    pid: number;
    username: string;
    namespace: string;
    authentication: number;
    roles: string;
    description: string;
    oldDirectRoles: string[];
    newDirectRoles: string[];
    applyToAuditDeltaSeconds: number;
    metadataUnique: boolean;
    timeBound: boolean;
    actorBound: boolean;
    targetBound: boolean;
    roleTransitionBound: boolean;
  };

  timeline: ReceiptTimelineStage[];

  evidence: {
    authoritativeProductHead: string;
    applyEvidenceSha256: string;
    convergenceEvidenceSha256: string;
    auditVerificationEvidenceSha256: string;
    post3AttemptJournalSha256: string;
    d7RevalidationEvidenceSha256: string;
    d7KeyRecoveryEvidenceSha256: string;
    safeMarkerRecoveryEvidenceSha256: string;
    auditKeyRecoveryEvidenceSha256: string;
    b6cManifestSha256: string;
  };

  claimBoundary: {
    thisPost3DemonstratedStaleProcessTransition: boolean;
    thisPost3ConvergenceMode: string;
    separateB6CExperimentProvidesStaleProcessEvidence: boolean;
    b6cExperimentReopened: boolean;
    configurationOnlyClaimedAsVerified: boolean;
    apiReturnOnlyClaimedAsVerified: boolean;
  };
}

export interface RecordedReceiptSummary {
  lostEffectiveRoleCount: number;
  lostPermissionCount: number;
  retainedPermissionCount: number;
  declaredApplicationCount: number;
  lostApplicationCount: number;
  retainedApplicationCount: number;
  declaredRestOperationCount: number;
  lostRestOperationCount: number;
  retainedRestOperationCount: number;
}

function invariant(
  condition: boolean,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(
      `Recorded receipt invariant failed: ${message}`,
    );
  }
}

const receipt =
  rawReceipt as unknown as RecordedVerifiedReceipt;

export function summarizeRecordedReceipt(
  value: RecordedVerifiedReceipt,
): RecordedReceiptSummary {
  const lostApplications =
    value.declaredImpact.applications.filter(
      (application) =>
        application.outcome ===
        "LOST",
    ).length;

  const retainedApplications =
    value.declaredImpact.applications.filter(
      (application) =>
        application.outcome ===
        "RETAINED",
    ).length;

  const lostOperations =
    value.declaredImpact.operations.filter(
      (operation) =>
        operation.outcome ===
        "LOST",
    ).length;

  const retainedOperations =
    value.declaredImpact.operations.filter(
      (operation) =>
        operation.outcome ===
        "RETAINED",
    ).length;

  return {
    lostEffectiveRoleCount:
      value.roles.lostEffectiveRoles.length,

    lostPermissionCount:
      value.permissionDelta.lost.length,

    retainedPermissionCount:
      value.permissionDelta.retained.length,

    declaredApplicationCount:
      value.declaredImpact.applications.length,

    lostApplicationCount:
      lostApplications,

    retainedApplicationCount:
      retainedApplications,

    declaredRestOperationCount:
      value.declaredImpact.operations.length,

    lostRestOperationCount:
      lostOperations,

    retainedRestOperationCount:
      retainedOperations,
  };
}

export function validateRecordedVerifiedReceipt(
  value: RecordedVerifiedReceipt,
): void {
  invariant(
    value.schemaVersion ===
      "meridian-verified-change-receipt-v1",
    "schema version",
  );

  invariant(
    value.receiptId ===
      "meridian-maya-patel-remove-MeridianSupervisor-audit-481",
    "receipt identity",
  );

  invariant(
    value.lifecycleState ===
      "VERIFIED",
    "lifecycle state",
  );

  invariant(
    value.change.username ===
      "maya.patel",
    "target username",
  );

  invariant(
    value.change.operation ===
      "REMOVE",
    "change operation",
  );

  invariant(
    value.change.role ===
      "MeridianSupervisor",
    "target role",
  );

  invariant(
    value.authorization.applyTimeDigestMatched,
    "apply-time digest match",
  );

  invariant(
    value.authorization.freshApplyTimeRevalidationPassed,
    "fresh apply-time revalidation",
  );

  invariant(
    value.authorization.mutationPostAttempts ===
      1,
    "single mutation POST",
  );

  invariant(
    !value.authorization.automaticRetryPerformed,
    "automatic retry remained disabled",
  );

  invariant(
    !value.authorization.rerunAuthorized,
    "POST #3 replay remained unauthorized",
  );

  invariant(
    !value.authorization.fourthMutationPostAuthorized,
    "fourth POST remained unauthorized",
  );

  invariant(
    value.convergence.configuredStateCorrect,
    "configured state",
  );

  invariant(
    !value.convergence.targetProcessPresent,
    "target process absence",
  );

  invariant(
    value.convergence.targetProcessCardinality ===
      "ZERO",
    "target process cardinality",
  );

  invariant(
    value.convergence.liveAccessConverged,
    "live access convergence",
  );

  invariant(
    value.convergence.mode ===
      "NO_ACTIVE_TARGET_PROCESS",
    "convergence mode",
  );

  invariant(
    !value.convergence
      .staleProcessTransitionDemonstratedByThisApply,
    "POST #3 must not claim stale-process transition",
  );

  invariant(
    value.nativeAudit.bound,
    "native audit binding",
  );

  invariant(
    value.nativeAudit.auditIndex ===
      481,
    "native audit index",
  );

  invariant(
    value.nativeAudit.source ===
      "%System",
    "native audit source",
  );

  invariant(
    value.nativeAudit.type ===
      "%Security",
    "native audit type",
  );

  invariant(
    value.nativeAudit.event ===
      "UserChange",
    "native audit event",
  );

  invariant(
    value.nativeAudit.username ===
      "meridian.runtime",
    "native audit actor",
  );

  invariant(
    value.nativeAudit.description ===
      "Modify User maya.patel",
    "native audit target",
  );

  invariant(
    value.nativeAudit.exactMetadataMatchCount ===
      1,
    "unique native audit match",
  );

  invariant(
    value.timeline.length ===
      9,
    "receipt timeline stage count",
  );

  invariant(
    !value.claimBoundary
      .thisPost3DemonstratedStaleProcessTransition,
    "claim boundary for POST #3",
  );

  invariant(
    value.claimBoundary
      .separateB6CExperimentProvidesStaleProcessEvidence,
    "separate B6C experiment",
  );

  invariant(
    !value.claimBoundary
      .b6cExperimentReopened,
    "B6C remains closed",
  );

  invariant(
    !value.claimBoundary
      .configurationOnlyClaimedAsVerified,
    "configuration alone is not verification",
  );

  invariant(
    !value.claimBoundary
      .apiReturnOnlyClaimedAsVerified,
    "API return alone is not verification",
  );

  const summary =
    summarizeRecordedReceipt(
      value,
    );

  invariant(
    summary.lostEffectiveRoleCount ===
      value.declaredImpact.summary
        .lostEffectiveRoleCount,
    "derived lost effective-role count",
  );

  invariant(
    summary.lostPermissionCount ===
      value.declaredImpact.summary
        .lostPermissionCount,
    "derived lost permission count",
  );

  invariant(
    summary.declaredApplicationCount ===
      value.declaredImpact.summary
        .declaredApplicationCount,
    "derived application count",
  );

  invariant(
    summary.lostApplicationCount ===
      value.declaredImpact.summary
        .lostApplicationCount,
    "derived lost application count",
  );

  invariant(
    summary.retainedApplicationCount ===
      value.declaredImpact.summary
        .retainedApplicationCount,
    "derived retained application count",
  );

  invariant(
    summary.declaredRestOperationCount ===
      value.declaredImpact.summary
        .declaredRestOperationCount,
    "derived REST operation count",
  );

  invariant(
    summary.lostRestOperationCount ===
      value.declaredImpact.summary
        .lostRestOperationCount,
    "derived lost REST operation count",
  );

  invariant(
    summary.retainedRestOperationCount ===
      value.declaredImpact.summary
        .retainedRestOperationCount,
    "derived retained REST operation count",
  );
}

validateRecordedVerifiedReceipt(
  receipt,
);

export const RECORDED_VERIFIED_RECEIPT =
  receipt;

export function getRecordedVerifiedReceipt():
  RecordedVerifiedReceipt {
  return RECORDED_VERIFIED_RECEIPT;
}