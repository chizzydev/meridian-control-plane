import "server-only";

import {
  CENTERPIECE_CHANGE,
} from "@/lib/change-case/domain";

import {
  classifyPreflightReadFoundation,
  type PreflightReadFoundation,
} from "@/lib/change-case/preflight-read";

import {
  readAuthoritativeCurrentAccess,
} from "./current-access";

import {
  loginIris,
  logoutIris,
  readRuntimeInfo,
} from "./transport";

export interface MeridianIrisReadConfig {
  apiBaseUrl: string;
  helperBaseUrl: string;
  username: string;
  password: string;
}

export async function readCenterpieceFoundation(
  config: MeridianIrisReadConfig,
): Promise<{
  runtime: {
    username: string;
    serverVersion: string;
    apiVersion: number;
  };
  foundation: PreflightReadFoundation;
}> {
  const session =
    await loginIris({
      baseUrl:
        config.apiBaseUrl,
      username:
        config.username,
      password:
        config.password,
    });

  try {
    const runtime =
      await readRuntimeInfo({
        baseUrl:
          config.apiBaseUrl,
        accessToken:
          session.accessToken,
      });

    const current =
      await readAuthoritativeCurrentAccess({
        apiBaseUrl:
          config.apiBaseUrl,
        helperBaseUrl:
          config.helperBaseUrl,
        accessToken:
          session.accessToken,
        username:
          CENTERPIECE_CHANGE.username,
      });

    return {
      runtime,
      foundation:
        classifyPreflightReadFoundation({
          change:
            CENTERPIECE_CHANGE,
          current,
        }),
    };
  } finally {
    await logoutIris({
      baseUrl:
        config.apiBaseUrl,
      accessToken:
        session.accessToken,
    });
  }
}