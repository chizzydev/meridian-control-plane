import "server-only";

import type {
  VerifiedReceiptHistoryRecord,
} from "../change-case/receipt-history";

import type {
  ActionReceiptV2,
} from "../proof/receipt";

import {
  actionReceiptV2FromHistoryRecord,
} from "../proof/receipt-history-envelope";

import {
  readVerifiedReceiptHistory,
} from "./receipt-history-server";

import {
  loginIris,
  logoutIris,
} from "./transport";

const DEFAULT_API_BASE_URL =
  "http://localhost:52773/api/admin";

const DEFAULT_HISTORY_BASE_URL =
  "http://localhost:52773/meridian-control-plane-history";

const DEFAULT_RUNTIME_USERNAME =
  "meridian.runtime";

const RUNTIME_PASSWORD_ENV =
  "MERIDIAN_RUNTIME_PASSWORD";

const API_BASE_URL_ENV =
  "MERIDIAN_IRIS_API_BASE_URL";

const HISTORY_BASE_URL_ENV =
  "MERIDIAN_IRIS_HISTORY_BASE_URL";

const RUNTIME_USERNAME_ENV =
  "MERIDIAN_RUNTIME_USERNAME";

const SAFE_RECEIPT_ID =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

export interface PersistentActionReceiptSnapshot {
  readonly source:
    "PERSISTENT_IRIS";

  readonly historyRecord:
    VerifiedReceiptHistoryRecord;

  readonly receipt:
    ActionReceiptV2;
}

function optionalRuntimeValue(
  name:
    string,
  fallback:
    string,
): string {
  const value =
    process.env[
      name
    ]?.trim();

  return (
    value &&
    value.length >
      0
  )
    ? value
    : fallback;
}

function requiredRuntimeSecret(
  name:
    string,
): string {
  const value =
    process.env[
      name
    ]?.trim();

  if (
    !value
  ) {
    throw new Error(
      `Required server runtime secret is missing: ${name}`,
    );
  }

  return value;
}

export function isSafeActionReceiptId(
  value:
    string,
): boolean {
  return SAFE_RECEIPT_ID.test(
    value,
  );
}

export async function readPersistentActionReceiptV2(
  input: {
    readonly receiptId:
      string;
  },
): Promise<
  PersistentActionReceiptSnapshot
> {
  const receiptId =
    input.receiptId.trim();

  if (
    !isSafeActionReceiptId(
      receiptId,
    )
  ) {
    throw new Error(
      "Action Receipt V2 id is not a safe opaque identifier.",
    );
  }

  const apiBaseUrl =
    optionalRuntimeValue(
      API_BASE_URL_ENV,
      DEFAULT_API_BASE_URL,
    );

  const historyBaseUrl =
    optionalRuntimeValue(
      HISTORY_BASE_URL_ENV,
      DEFAULT_HISTORY_BASE_URL,
    );

  const runtimeUsername =
    optionalRuntimeValue(
      RUNTIME_USERNAME_ENV,
      DEFAULT_RUNTIME_USERNAME,
    );

  const runtimePassword =
    requiredRuntimeSecret(
      RUNTIME_PASSWORD_ENV,
    );

  const session =
    await loginIris({
      baseUrl:
        apiBaseUrl,
      username:
        runtimeUsername,
      password:
        runtimePassword,
    });

  try {
    const historyRecord =
      await readVerifiedReceiptHistory({
        baseUrl:
          historyBaseUrl,
        accessToken:
          session.accessToken,
        receiptId,
      });

    const receipt =
      actionReceiptV2FromHistoryRecord(
        historyRecord,
      );

    if (
      receipt.receiptId !==
        receiptId
    ) {
      throw new Error(
        "Persistent Action Receipt V2 identity differs from the requested receipt.",
      );
    }

    return Object.freeze({
      source:
        "PERSISTENT_IRIS" as const,
      historyRecord,
      receipt,
    });
  }
  finally {
    await logoutIris({
      baseUrl:
        apiBaseUrl,
      accessToken:
        session.accessToken,
    });
  }
}
