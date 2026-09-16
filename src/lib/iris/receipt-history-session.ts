import "server-only";

import type {
  ReceiptHistorySummary,
  VerifiedReceiptHistoryRecord,
} from "../change-case/receipt-history";

import {
  readUserReceiptHistory,
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
  "MERIDIAN_IRIS_RUNTIME_PASSWORD";

const API_BASE_URL_ENV =
  "MERIDIAN_IRIS_API_BASE_URL";

const HISTORY_BASE_URL_ENV =
  "MERIDIAN_IRIS_HISTORY_BASE_URL";

const RUNTIME_USERNAME_ENV =
  "MERIDIAN_IRIS_RUNTIME_USERNAME";

export interface PersistentJudgeHistorySnapshot {
  readonly source:
    "PERSISTENT_IRIS";

  readonly receipt:
    VerifiedReceiptHistoryRecord;

  readonly history:
    readonly ReceiptHistorySummary[];
}

function optionalRuntimeValue(
  name:
    string,

  fallback:
    string,
): string {
  const value =
    process.env[name]?.trim();

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
    process.env[name]?.trim();

  if (
    !value
  ) {
    throw new Error(
      `Required server runtime secret is missing: ${name}`,
    );
  }

  return value;
}

export async function readPersistentJudgeHistory(
  input: {
    readonly receiptId:
      string;

    readonly username:
      string;
  },
): Promise<
  PersistentJudgeHistorySnapshot
> {
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
    const receipt =
      await readVerifiedReceiptHistory({
        baseUrl:
          historyBaseUrl,

        accessToken:
          session.accessToken,

        receiptId:
          input.receiptId,
      });

    const history =
      await readUserReceiptHistory({
        baseUrl:
          historyBaseUrl,

        accessToken:
          session.accessToken,

        username:
          input.username,
      });

    if (
      receipt.username !==
      input.username
    ) {
      throw new Error(
        "Persistent IRIS receipt username does not match the requested judge history.",
      );
    }

    const matching =
      history.filter(
        (summary) =>
          summary.receiptId ===
          input.receiptId,
      );

    if (
      matching.length !==
      1
    ) {
      throw new Error(
        "Persistent IRIS user history does not contain exactly one matching certified receipt.",
      );
    }

    if (
      matching[0].receiptSha256 !==
      receipt.receiptSha256
    ) {
      throw new Error(
        "Persistent IRIS receipt readback and user-history summary disagree.",
      );
    }

    return {
      source:
        "PERSISTENT_IRIS",

      receipt,

      history:
        Object.freeze(
          [...history],
        ),
    };
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