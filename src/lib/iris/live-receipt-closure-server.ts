import "server-only";

import {
  createHash,
} from "node:crypto";

import {
  setTimeout as delay,
} from "node:timers/promises";

import {
  closeLiveReceiptCore,
  type LiveReceiptClosureDependencies,
} from "../change-case/live-receipt-closure";

import {
  appendDurableChangeCaseEvent,
  readDurableChangeCase,
} from "./change-case-history-server";

import {
  findFixtureRoleRemovalAuditOnce,
} from "./native-userchange-audit";

import {
  persistVerifiedReceiptHistory,
  readVerifiedReceiptHistory,
} from "./receipt-history-server";

export interface LiveReceiptClosureServerContext {
  readonly historyBaseUrl:
    string;

  readonly helperBaseUrl:
    string;

  readonly accessToken:
    string;
}

const AUDIT_POLL_ATTEMPTS =
  20;

const AUDIT_POLL_DELAY_MS =
  250;

function sha256Utf8(
  value:
    string,
): string {
  return createHash(
    "sha256",
  )
    .update(
      Buffer.from(
        value,
        "utf8",
      ),
    )
    .digest(
      "hex",
    )
    .toUpperCase();
}

function dependencies(
  context:
    LiveReceiptClosureServerContext,
): LiveReceiptClosureDependencies {
  return {
    readCase:
      async (
        caseId,
      ) =>
        readDurableChangeCase({
          baseUrl:
            context.historyBaseUrl,

          accessToken:
            context.accessToken,

          caseId,
        }),

    appendEvent:
      async (
        mutation,
      ) =>
        appendDurableChangeCaseEvent({
          baseUrl:
            context.historyBaseUrl,

          accessToken:
            context.accessToken,

          mutation,
        }),

    findNativeAudit:
      async (
        input,
      ) => {
        for (
          let attempt =
            1;
          attempt <=
            AUDIT_POLL_ATTEMPTS;
          attempt +=
            1
        ) {
          const binding =
            await findFixtureRoleRemovalAuditOnce({
              helperBaseUrl:
                context.helperBaseUrl,

              accessToken:
                context.accessToken,

              applyStartedAtUtc:
                input.applyStartedAtUtc,
            });

          if (
            binding !==
              null
          ) {
            return binding;
          }

          if (
            attempt <
              AUDIT_POLL_ATTEMPTS
          ) {
            await delay(
              AUDIT_POLL_DELAY_MS,
            );
          }
        }

        return null;
      },

    persistReceipt:
      async (
        record,
      ) =>
        persistVerifiedReceiptHistory({
          baseUrl:
            context.historyBaseUrl,

          accessToken:
            context.accessToken,

          record,
        }),

    readReceipt:
      async (
        receiptId,
      ) =>
        readVerifiedReceiptHistory({
          baseUrl:
            context.historyBaseUrl,

          accessToken:
            context.accessToken,

          receiptId,
        }),

    sha256Utf8,

    nowUtc:
      () =>
        new Date().toISOString(),
  };
}

export async function closeLiveDemoReceipt(
  context:
    LiveReceiptClosureServerContext,
  input: {
    readonly caseId:
      string;

    readonly expectedCaseVersion:
      number;
  },
) {
  return closeLiveReceiptCore(
    input,
    dependencies(
      context,
    ),
  );
}

export const LIVE_RECEIPT_CLOSURE_BROWSER_CONTRACT =
  Object.freeze({
    browserMayProvideCaseId:
      true as const,

    browserMayProvideExpectedCaseVersion:
      true as const,

    browserMayProvideUsername:
      false as const,

    browserMayProvideRole:
      false as const,

    browserMayProvidePid:
      false as const,

    browserMayProvideAuditFields:
      false as const,

    browserMayProvideReceiptId:
      false as const,

    browserMayProvideMutationPrimitive:
      false as const,
  });
