import "server-only";

import {
  DEMO_FIXTURE_ID,
  DEMO_FIXTURE_USERNAME,
} from "../change-case/demo-fixture";

import type {
  DemoFixtureApplyResult,
} from "../change-case/demo-fixture-apply";

import {
  executeFixtureScopedRoleRemovalCore,
  type FixtureScopedRoleRemovalDependencies,
} from "./demo-fixture-apply-executor";

import {
  demoFixtureCredentialPresentForServer,
} from "./demo-fixture-server";

type FetchLike =
  NonNullable<
    FixtureScopedRoleRemovalDependencies["fetchImpl"]
  >;

export interface FixtureScopedRoleRemovalServerDependencies {
  readonly fetchImpl?:
    FetchLike;
}

/**
 * Production server-only binding.
 *
 * The only mutable caller value is the opaque fixture generation. The fixed
 * A3 fixture identity is verified through the in-memory server credential
 * vault before the executor can dispatch the one official SysAdmin PUT.
 */
export async function executeFixtureScopedRoleRemoval(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly expectedFixtureGeneration:
      string;
  },

  dependencies:
    FixtureScopedRoleRemovalServerDependencies = {},
): Promise<
  DemoFixtureApplyResult
> {
  return executeFixtureScopedRoleRemovalCore(
    input,
    {
      credentialPresent:
        demoFixtureCredentialPresentForServer,

      fetchImpl:
        dependencies.fetchImpl,
    },
  );
}

export const FIXTURE_SCOPED_APPLY_AUTHORITY =
  Object.freeze({
    fixtureId:
      DEMO_FIXTURE_ID,

    username:
      DEMO_FIXTURE_USERNAME,

    browserTargetParameterization:
      false as const,

    automaticRetry:
      false as const,

    mayReturnVerified:
      false as const,
  });
