import {
  canonicalJson,
  digestCanonicalJson,
} from "./digest";

import {
  assertProofResult,
  type ProofResult,
} from "./evidence";

import {
  ProofEngineError,
} from "./errors";

import {
  MANAGEMENT_DOMAINS,
  REVERSIBILITY_CLASSES,
  RISK_CLASSES,
  assertRequiredAuthority,
  assertTargetIdentity,
  type ManagementDomain,
  type ReversibilityClass,
  type RiskClass,
  type RequiredAuthority,
  type TargetIdentity,
} from "./contract";

export const ACTION_RECEIPT_SCHEMA_VERSION =
  "meridian.action-receipt.v2" as const;

export interface ActionReceiptLifecycle {
  readonly createdAtUtc:
    string;

  readonly applyStartedAtUtc:
    string;

  readonly applyCompletedAtUtc:
    string;

  readonly evidenceCompletedAtUtc:
    string;
}

export interface ActionReceiptRecovery {
  readonly class:
    ReversibilityClass;

  readonly available:
    boolean;

  readonly recoveryActionType:
    string | null;
}

export interface ActionReceiptV2 {
  readonly schemaVersion:
    typeof ACTION_RECEIPT_SCHEMA_VERSION;

  readonly receiptId:
    string;

  readonly actionId:
    string;

  readonly parentChangeSetId:
    string | null;

  readonly actionType:
    string;

  readonly contractId:
    string;

  readonly contractVersion:
    number;

  readonly domain:
    ManagementDomain;

  readonly risk:
    RiskClass;

  readonly reversibility:
    ReversibilityClass;

  readonly target:
    TargetIdentity;

  readonly actor: {
    readonly logicalActor:
      string;

    readonly irisRuntimeUser:
      string;
  };

  readonly authority:
    readonly RequiredAuthority[];

  readonly intentDigest:
    string;

  readonly reviewedPreflightDigest:
    string;

  readonly freshRevalidationDigest:
    string;

  readonly executionDigest:
    string;

  readonly evidenceDigest:
    string;

  readonly proofResults:
    readonly ProofResult[];

  readonly lifecycle:
    ActionReceiptLifecycle;

  readonly recovery:
    ActionReceiptRecovery;

  /**
   * Hash of the final evidence-complete action event that existed
   * when this receipt was frozen. Receipt persistence/readback and
   * ACTION_VERIFIED occur after this hash and are intentionally not
   * circularly embedded into the receipt.
   */
  readonly terminalEventHash:
    string;

  readonly receiptSha256:
    string;
}

export type ActionReceiptUnsigned =
  Omit<
    ActionReceiptV2,
    "schemaVersion" |
    "receiptSha256"
  >;

function assertNonEmpty(
  value:
    string,
  label:
    string,
): void {
  if (
    value.trim().length ===
      0
  ) {
    throw new ProofEngineError(
      "INVALID_CONTRACT",
      `${label} is required.`,
      {
        label,
      },
    );
  }
}

function assertSha256(
  value:
    string,
  label:
    string,
): void {
  if (
    !/^[A-F0-9]{64}$/.test(
      value,
    )
  ) {
    throw new ProofEngineError(
      "RECEIPT_MISMATCH",
      `${label} must be uppercase SHA-256.`,
      {
        label,
      },
    );
  }
}

function isIsoUtc(
  value:
    string,
): boolean {
  return (
    value.endsWith(
      "Z",
    ) &&
    Number.isFinite(
      Date.parse(
        value,
      ),
    )
  );
}

function assertReceiptLifecycle(
  lifecycle:
    ActionReceiptLifecycle,
): void {
  const values = [
    lifecycle.createdAtUtc,
    lifecycle.applyStartedAtUtc,
    lifecycle.applyCompletedAtUtc,
    lifecycle.evidenceCompletedAtUtc,
  ];

  if (
    values.some(
      (
        value,
      ) =>
        !isIsoUtc(
          value,
        ),
    )
  ) {
    throw new ProofEngineError(
      "RECEIPT_MISMATCH",
      "Receipt lifecycle timestamps must be UTC ISO-8601.",
    );
  }

  const timeline =
    values.map(
      (
        value,
      ) =>
        Date.parse(
          value,
        ),
    );

  for (
    let index =
      1;
    index <
      timeline.length;
    index +=
      1
  ) {
    const previous =
      timeline[
        index -
          1
      ];

    const current =
      timeline[
        index
      ];

    if (
      previous ===
        undefined ||
      current ===
        undefined ||
      current <
        previous
    ) {
      throw new ProofEngineError(
        "RECEIPT_MISMATCH",
        "Receipt lifecycle timestamps are not monotonic.",
      );
    }
  }
}

function assertReceiptRuntimeShape(
  receipt:
    ActionReceiptUnsigned,
): void {
  assertNonEmpty(
    receipt.receiptId,
    "Receipt id",
  );

  assertNonEmpty(
    receipt.actionId,
    "Action id",
  );

  assertNonEmpty(
    receipt.actionType,
    "Action type",
  );

  assertNonEmpty(
    receipt.contractId,
    "Contract id",
  );

  if (
    receipt.parentChangeSetId !==
      null
  ) {
    assertNonEmpty(
      receipt.parentChangeSetId,
      "Parent Change Set id",
    );
  }

  if (
    !Number.isInteger(
      receipt.contractVersion,
    ) ||
    receipt.contractVersion <
      1
  ) {
    throw new ProofEngineError(
      "RECEIPT_MISMATCH",
      "Receipt contract version must be a positive integer.",
    );
  }

  if (
    !(
      MANAGEMENT_DOMAINS as readonly string[]
    ).includes(
      receipt.domain,
    ) ||
    !(
      RISK_CLASSES as readonly string[]
    ).includes(
      receipt.risk,
    ) ||
    !(
      REVERSIBILITY_CLASSES as readonly string[]
    ).includes(
      receipt.reversibility,
    )
  ) {
    throw new ProofEngineError(
      "RECEIPT_MISMATCH",
      "Receipt contract metadata is invalid.",
    );
  }

  assertTargetIdentity(
    receipt.target,
  );

  assertNonEmpty(
    receipt.actor.logicalActor,
    "Receipt logical actor",
  );

  assertNonEmpty(
    receipt.actor.irisRuntimeUser,
    "Receipt IRIS runtime user",
  );

  const authorityIds =
    new Set<
      string
    >();

  for (
    const authority
    of receipt.authority
  ) {
    assertRequiredAuthority(
      authority,
    );

    const identity =
      `${authority.resource}:${authority.permission}`;

    if (
      authorityIds.has(
        identity,
      )
    ) {
      throw new ProofEngineError(
        "RECEIPT_MISMATCH",
        `Duplicate receipt authority: ${identity}.`,
      );
    }

    authorityIds.add(
      identity,
    );
  }

  const proofIds =
    new Set<
      string
    >();

  for (
    const result
    of receipt.proofResults
  ) {
    assertProofResult(
      result,
    );

    if (
      proofIds.has(
        result.requirementId,
      )
    ) {
      throw new ProofEngineError(
        "RECEIPT_MISMATCH",
        `Duplicate receipt proof result: ${result.requirementId}.`,
      );
    }

    proofIds.add(
      result.requirementId,
    );
  }

  assertSha256(
    receipt.intentDigest,
    "Intent digest",
  );

  assertSha256(
    receipt.reviewedPreflightDigest,
    "Reviewed preflight digest",
  );

  assertSha256(
    receipt.freshRevalidationDigest,
    "Fresh revalidation digest",
  );

  assertSha256(
    receipt.executionDigest,
    "Execution digest",
  );

  assertSha256(
    receipt.evidenceDigest,
    "Evidence digest",
  );

  assertSha256(
    receipt.terminalEventHash,
    "Terminal event hash",
  );

  const computedEvidenceDigest =
    digestCanonicalJson(
      receipt.proofResults,
    );

  if (
    computedEvidenceDigest !==
      receipt.evidenceDigest
  ) {
    throw new ProofEngineError(
      "RECEIPT_MISMATCH",
      "Receipt evidence digest does not match its proof results.",
      {
        expected:
          computedEvidenceDigest,
        actual:
          receipt.evidenceDigest,
      },
    );
  }

  assertReceiptLifecycle(
    receipt.lifecycle,
  );

  if (
    receipt.recovery.class !==
      receipt.reversibility ||
    receipt.recovery.available !==
      (
        receipt.recovery.recoveryActionType !==
          null
      )
  ) {
    throw new ProofEngineError(
      "RECEIPT_MISMATCH",
      "Receipt recovery metadata is inconsistent.",
    );
  }
}

function unsignedReceiptMaterial(
  receipt:
    ActionReceiptV2,
): Omit<
  ActionReceiptV2,
  "receiptSha256"
> {
  const {
    receiptSha256:
      ignoredReceiptHash,
    ...unsigned
  } = receipt;

  void ignoredReceiptHash;

  return unsigned;
}

export function buildActionReceiptV2(
  input:
    ActionReceiptUnsigned,
): ActionReceiptV2 {
  assertReceiptRuntimeShape(
    input,
  );

  const withoutHash =
    Object.freeze({
      schemaVersion:
        ACTION_RECEIPT_SCHEMA_VERSION,

      ...input,
    });

  const receiptSha256 =
    digestCanonicalJson(
      withoutHash,
    );

  const receipt:
    ActionReceiptV2 =
    Object.freeze({
      ...withoutHash,

      receiptSha256,
    });

  assertActionReceiptV2(
    receipt,
  );

  return receipt;
}

export function assertActionReceiptV2(
  receipt:
    ActionReceiptV2,
): void {
  if (
    receipt.schemaVersion !==
      ACTION_RECEIPT_SCHEMA_VERSION
  ) {
    throw new ProofEngineError(
      "RECEIPT_MISMATCH",
      "Unsupported action receipt schema.",
    );
  }

  assertReceiptRuntimeShape(
    unsignedReceiptMaterial(
      receipt,
    ),
  );

  assertSha256(
    receipt.receiptSha256,
    "Receipt SHA-256",
  );

  const expected =
    digestCanonicalJson(
      unsignedReceiptMaterial(
        receipt,
      ),
    );

  if (
    receipt.receiptSha256 !==
      expected
  ) {
    throw new ProofEngineError(
      "RECEIPT_MISMATCH",
      "Action receipt hash does not match canonical receipt material.",
      {
        expected,
        actual:
          receipt.receiptSha256,
      },
    );
  }
}

export function assertExactReceiptReadback(
  persisted:
    ActionReceiptV2,
  readback:
    ActionReceiptV2,
): void {
  assertActionReceiptV2(
    persisted,
  );

  assertActionReceiptV2(
    readback,
  );

  const persistedCanonical =
    canonicalJson(
      persisted,
    );

  const readbackCanonical =
    canonicalJson(
      readback,
    );

  if (
    persistedCanonical !==
      readbackCanonical
  ) {
    throw new ProofEngineError(
      "RECEIPT_MISMATCH",
      "Durable receipt readback differs from the persisted receipt.",
      {
        persistedSha256:
          persisted.receiptSha256,
        readbackSha256:
          readback.receiptSha256,
      },
    );
  }
}
