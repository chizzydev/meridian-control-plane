import "server-only";

import type {
  VerifiedReceiptHistoryRecord,
} from "../change-case/receipt-history";

import {
  actionReceiptV2FromGenericHistory,
  type ActionReceiptHistoryRecord,
  type ActionReceiptHistorySummary,
} from "../proof/action-history";

import type {
  ActionReceiptV2,
} from "../proof/receipt";

import {
  actionReceiptV2FromHistoryRecord,
} from "../proof/receipt-history-envelope";

import {
  readActionReceiptHistory,
  readTargetActionHistory,
} from "./action-history-server";

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

export type PersistentActionHistoryRecord =
  | ActionReceiptHistoryRecord
  | VerifiedReceiptHistoryRecord;

export interface PersistentActionReceiptSnapshot {
  readonly source:
    "PERSISTENT_IRIS";

  readonly historyKind:
    "GENERIC_ACTION" |
    "LEGACY_USER_ROLE";

  readonly historyRecord:
    PersistentActionHistoryRecord;

  readonly receipt:
    ActionReceiptV2;
}

export interface PersistentTargetActionHistorySnapshot {
  readonly source:
    "PERSISTENT_IRIS";

  readonly targetCanonicalId:
    string;

  readonly records:
    readonly ActionReceiptHistorySummary[];
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

function runtimeConfiguration() {
  return Object.freeze({
    apiBaseUrl:
      optionalRuntimeValue(
        API_BASE_URL_ENV,
        DEFAULT_API_BASE_URL,
      ),

    historyBaseUrl:
      optionalRuntimeValue(
        HISTORY_BASE_URL_ENV,
        DEFAULT_HISTORY_BASE_URL,
      ),

    runtimeUsername:
      optionalRuntimeValue(
        RUNTIME_USERNAME_ENV,
        DEFAULT_RUNTIME_USERNAME,
      ),

    runtimePassword:
      requiredRuntimeSecret(
        RUNTIME_PASSWORD_ENV,
      ),
  });
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

  const config =
    runtimeConfiguration();

  const session =
    await loginIris({
      baseUrl:
        config.apiBaseUrl,
      username:
        config.runtimeUsername,
      password:
        config.runtimePassword,
    });

  try {
    try {
      const historyRecord =
        await readActionReceiptHistory({
          baseUrl:
            config.historyBaseUrl,
          accessToken:
            session.accessToken,
          receiptId,
        });

      const receipt =
        actionReceiptV2FromGenericHistory(
          historyRecord,
        );

      if (
        receipt.receiptId !==
          receiptId
      ) {
        throw new Error(
          "Persistent generic Action Receipt V2 identity differs from the requested receipt.",
        );
      }

      return Object.freeze({
        source:
          "PERSISTENT_IRIS" as const,
        historyKind:
          "GENERIC_ACTION" as const,
        historyRecord,
        receipt,
      });
    }
    catch {
      const historyRecord =
        await readVerifiedReceiptHistory({
          baseUrl:
            config.historyBaseUrl,
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
          "Persistent legacy Action Receipt V2 identity differs from the requested receipt.",
        );
      }

      return Object.freeze({
        source:
          "PERSISTENT_IRIS" as const,
        historyKind:
          "LEGACY_USER_ROLE" as const,
        historyRecord,
        receipt,
      });
    }
  }
  finally {
    await logoutIris({
      baseUrl:
        config.apiBaseUrl,
      accessToken:
        session.accessToken,
    });
  }
}

export async function readPersistentActionHistoryForTarget(
  input: {
    readonly targetCanonicalId:
      string;
  },
): Promise<
  PersistentTargetActionHistorySnapshot
> {
  const targetCanonicalId =
    input.targetCanonicalId.trim();

  if (
    targetCanonicalId.length ===
      0 ||
    targetCanonicalId.length >
      256 ||
    /[\r\n]/.test(
      targetCanonicalId,
    )
  ) {
    throw new Error(
      "Action history target id is invalid.",
    );
  }

  const config =
    runtimeConfiguration();

  const session =
    await loginIris({
      baseUrl:
        config.apiBaseUrl,
      username:
        config.runtimeUsername,
      password:
        config.runtimePassword,
    });

  try {
    const records =
      await readTargetActionHistory({
        baseUrl:
          config.historyBaseUrl,
        accessToken:
          session.accessToken,
        targetCanonicalId,
      });

    return Object.freeze({
      source:
        "PERSISTENT_IRIS" as const,
      targetCanonicalId,
      records,
    });
  }
  finally {
    await logoutIris({
      baseUrl:
        config.apiBaseUrl,
      accessToken:
        session.accessToken,
    });
  }
}
