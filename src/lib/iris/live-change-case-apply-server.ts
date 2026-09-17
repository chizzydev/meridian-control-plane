import "server-only";

import {
  randomUUID,
} from "node:crypto";

import {
  applyLiveDemoChangeCaseCore,
  preflightLiveDemoChangeCaseCore,
  reviewLiveDemoChangeCaseCore,
  type LiveApplyOutcome,
  type LiveChangeCaseApplyDependencies,
} from "../change-case/live-change-case-apply";

import type {
  DurableChangeCaseRecord,
  DurableChangeCaseSnapshot,
} from "../change-case/durable-change-case";

import {
  appendDurableChangeCaseEvent,
  readDurableChangeCase,
} from "./change-case-history-server";

import {
  executeFixtureScopedRoleRemoval,
} from "./demo-fixture-apply-server";

import {
  readDemoFixtureReviewablePreflight,
} from "./demo-fixture-reviewable-preflight";

export interface LiveChangeCaseApplyServerContext {
  readonly apiBaseUrl:
    string;

  readonly historyBaseUrl:
    string;

  readonly accessToken:
    string;
}

function dependencies(
  context:
    LiveChangeCaseApplyServerContext,
): LiveChangeCaseApplyDependencies {
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

    readFreshPreflight:
      async (
        record:
          DurableChangeCaseRecord,
      ) =>
        readDemoFixtureReviewablePreflight({
          apiBaseUrl:
            context.apiBaseUrl,
          accessToken:
            context.accessToken,
          expectedFixtureGeneration:
            record.fixture.expectedGeneration,
        }),

    executeMutation:
      async (
        record:
          DurableChangeCaseRecord,
      ) =>
        executeFixtureScopedRoleRemoval({
          apiBaseUrl:
            context.apiBaseUrl,
          accessToken:
            context.accessToken,
          expectedFixtureGeneration:
            record.fixture.expectedGeneration,
        }),

    nowUtc:
      () =>
        new Date().toISOString(),

    newApplyAttemptId:
      randomUUID,
  };
}

export async function preflightLiveDemoChangeCase(
  context:
    LiveChangeCaseApplyServerContext,
  input: {
    readonly caseId:
      string;

    readonly expectedCaseVersion:
      number;
  },
): Promise<DurableChangeCaseSnapshot> {
  return preflightLiveDemoChangeCaseCore(
    input,
    dependencies(
      context,
    ),
  );
}

export async function reviewLiveDemoChangeCase(
  context:
    LiveChangeCaseApplyServerContext,
  input: {
    readonly caseId:
      string;

    readonly expectedCaseVersion:
      number;

    readonly reviewedDigest:
      string;
  },
): Promise<DurableChangeCaseSnapshot> {
  return reviewLiveDemoChangeCaseCore(
    input,
    dependencies(
      context,
    ),
  );
}

export async function applyLiveDemoChangeCase(
  context:
    LiveChangeCaseApplyServerContext,
  input: {
    readonly caseId:
      string;

    readonly expectedCaseVersion:
      number;
  },
): Promise<LiveApplyOutcome> {
  return applyLiveDemoChangeCaseCore(
    input,
    dependencies(
      context,
    ),
  );
}
