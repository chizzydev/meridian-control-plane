import {
  RECORDED_RECEIPT_SHA256,
  getRecordedVerifiedReceipt,
  summarizeRecordedReceipt,
  validateRecordedVerifiedReceipt,
} from "../../change-case/recorded-receipt";

export const MAYA_RECORDED_TARGET_CANONICAL_ID =
  "user:maya.patel" as const;

export const MAYA_V1_COMPATIBILITY_SCHEMA_VERSION =
  "meridian.maya-v1-proof-compatibility.v1" as const;

export interface MayaV1ProofCompatibility {
  readonly schemaVersion:
    typeof MAYA_V1_COMPATIBILITY_SCHEMA_VERSION;

  readonly actionType:
    "USER_REMOVE_ROLE";

  readonly targetCanonicalId:
    typeof MAYA_RECORDED_TARGET_CANONICAL_ID;

  readonly role:
    "MeridianSupervisor";

  readonly configurationReadback:
    "PASS";

  readonly permissionEffect:
    "PASS";

  readonly liveRuntime:
    "PASS";

  readonly nativeAudit:
    "PASS";

  readonly freshApplyTimeRevalidation:
    "PASS";

  readonly legacyReceiptSchema:
    "meridian-verified-change-receipt-v1";

  readonly legacyReceiptSha256:
    typeof RECORDED_RECEIPT_SHA256;

  readonly convertedToV2:
    false;

  readonly historicalReceiptMutated:
    false;
}

export function deriveMayaV1ProofCompatibility():
  MayaV1ProofCompatibility {
  const receipt =
    getRecordedVerifiedReceipt();

  validateRecordedVerifiedReceipt(
    receipt,
  );

  const summary =
    summarizeRecordedReceipt(
      receipt,
    );

  if (
    receipt.change.username !==
      "maya.patel" ||
    receipt.change.operation !==
      "REMOVE" ||
    receipt.change.role !==
      "MeridianSupervisor" ||
    !receipt.authorization
      .freshApplyTimeRevalidationPassed ||
    !receipt.convergence
      .configuredStateCorrect ||
    !receipt.convergence
      .liveAccessConverged ||
    !receipt.nativeAudit
      .bound ||
    summary.lostPermissionCount <
      1 ||
    summary.lostEffectiveRoleCount <
      1
  ) {
    throw new Error(
      "Recorded Maya V1 receipt does not satisfy USER_REMOVE_ROLE compatibility.",
    );
  }

  return Object.freeze({
    schemaVersion:
      MAYA_V1_COMPATIBILITY_SCHEMA_VERSION,

    actionType:
      "USER_REMOVE_ROLE" as const,

    targetCanonicalId:
      MAYA_RECORDED_TARGET_CANONICAL_ID,

    role:
      "MeridianSupervisor" as const,

    configurationReadback:
      "PASS" as const,

    permissionEffect:
      "PASS" as const,

    liveRuntime:
      "PASS" as const,

    nativeAudit:
      "PASS" as const,

    freshApplyTimeRevalidation:
      "PASS" as const,

    legacyReceiptSchema:
      "meridian-verified-change-receipt-v1" as const,

    legacyReceiptSha256:
      RECORDED_RECEIPT_SHA256,

    convertedToV2:
      false as const,

    historicalReceiptMutated:
      false as const,
  });
}
