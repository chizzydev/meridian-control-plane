import {
  DEMO_FIXTURE_USERNAME,
} from "../change-case/demo-fixture";

import {
  demoFixtureApplyUserBody,
} from "../change-case/demo-fixture-apply";

export const DEMO_FIXTURE_USER_SECURITY_PATH =
  `/v2/security/user?name=${encodeURIComponent(DEMO_FIXTURE_USERNAME)}` as const;

export interface DemoFixtureApplyPutPlan {
  readonly method:
    "PUT";

  readonly path:
    typeof DEMO_FIXTURE_USER_SECURITY_PATH;

  readonly body:
    ReturnType<
      typeof demoFixtureApplyUserBody
    >;

  readonly networkRequestPerformed:
    false;
}

export interface DemoFixtureConfiguredReadPlan {
  readonly method:
    "GET";

  readonly path:
    typeof DEMO_FIXTURE_USER_SECURITY_PATH;

  readonly body:
    null;

  readonly networkRequestPerformed:
    false;
}

export function buildDemoFixtureApplyPutPlan():
  DemoFixtureApplyPutPlan {
  return Object.freeze({
    method:
      "PUT" as const,

    path:
      DEMO_FIXTURE_USER_SECURITY_PATH,

    body:
      demoFixtureApplyUserBody(),

    networkRequestPerformed:
      false as const,
  });
}

export function buildDemoFixtureConfiguredReadPlan():
  DemoFixtureConfiguredReadPlan {
  return Object.freeze({
    method:
      "GET" as const,

    path:
      DEMO_FIXTURE_USER_SECURITY_PATH,

    body:
      null,

    networkRequestPerformed:
      false as const,
  });
}
