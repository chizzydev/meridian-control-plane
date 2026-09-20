export const PROOF_ENGINE_ERROR_CODES =
  Object.freeze([
    "INVALID_CANONICAL_VALUE",
    "SECRET_MATERIAL_FORBIDDEN",
    "INVALID_CONTRACT",
    "INVALID_TARGET",
    "SAFETY_BLOCKED",
    "STALE_PRECONDITION",
    "AUTHORITY_DENIED",
    "UNKNOWN_AFTER_DISPATCH",
    "PROOF_INCOMPLETE",
    "RECEIPT_MISMATCH",
  ] as const);

export type ProofEngineErrorCode =
  (typeof PROOF_ENGINE_ERROR_CODES)[number];

export type ProofEngineErrorDetailValue =
  | string
  | number
  | boolean
  | null;

export type ProofEngineErrorDetails =
  Readonly<
    Record<
      string,
      ProofEngineErrorDetailValue
    >
  >;

export class ProofEngineError
  extends Error {
  readonly code:
    ProofEngineErrorCode;

  readonly details:
    ProofEngineErrorDetails;

  constructor(
    code:
      ProofEngineErrorCode,
    message:
      string,
    details:
      ProofEngineErrorDetails = {},
  ) {
    super(
      message,
    );

    this.name =
      "ProofEngineError";

    this.code =
      code;

    this.details =
      Object.freeze({
        ...details,
      });
  }
}

export function isProofEngineError(
  value:
    unknown,
): value is ProofEngineError {
  return (
    value instanceof
      ProofEngineError
  );
}
