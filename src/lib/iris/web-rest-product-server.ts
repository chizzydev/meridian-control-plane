import "server-only";

import declaration
  from "./meridian-api-declaration.json";

import {
  ORDERS_WEB_APP_TARGET_CANONICAL_ID,
} from "../actions/web-app/fixture";

import {
  actionReceiptV2FromGenericHistory,
} from "../proof/action-history";

import {
  readActionReceiptHistory,
  readTargetActionHistory,
} from "./action-history-server";

import {
  readMeridianDeployedRestInventory,
  readMeridianWebApplications,
} from "./impact";

import {
  probeOrdersWebAppHealth,
  readOrdersWebAppState,
} from "./web-app-action-transport";

import {
  buildSafeWebRestLifecycleView,
  type SafeWebRestLifecycleView,
} from "./web-rest-history-view";

import {
  loginIris,
  logoutIris,
  readRuntimeInfo,
} from "./transport";

export interface SafeWebApplicationDetail {
  readonly name:
    string;

  readonly namespace:
    string;

  readonly enabled:
    boolean;

  readonly resource:
    string;

  readonly dispatchClass:
    string;
}

export interface SafeRestOperationDetail {
  readonly method:
    string;

  readonly path:
    string;

  readonly operationId:
    string;

  readonly requiredResources:
    readonly string[];

  readonly deploymentTruth:
    "NATIVE_EMITTED_SWAGGER";

  readonly declarationTruth:
    "AUTHORITATIVE_SOURCE_OPENAPI";
}

export interface AvailableWebRestProductSurface {
  readonly status:
    "available";

  readonly runtime: {
    readonly username:
      string;

    readonly serverVersion:
      string;

    readonly apiVersion:
      number;
  };

  readonly applications:
    readonly SafeWebApplicationDetail[];

  readonly operations:
    readonly SafeRestOperationDetail[];

  readonly verifiedLifecycle:
    SafeWebRestLifecycleView;

  readonly boundaries: {
    readonly readOnly:
      true;

    readonly browserCredentialExposure:
      false;

    readonly publicManagementProxy:
      false;

    readonly mutationControls:
      false;
  };
}

export interface UnavailableWebRestProductSurface {
  readonly status:
    "unavailable";

  readonly reason:
    "RUNTIME_CREDENTIAL_NOT_CONFIGURED" |
    "LIVE_MANAGEMENT_READ_UNAVAILABLE";

  readonly message:
    string;

  readonly boundaries: {
    readonly readOnly:
      true;

    readonly browserCredentialExposure:
      false;

    readonly publicManagementProxy:
      false;

    readonly mutationControls:
      false;
  };
}

export type WebRestProductSurface =
  AvailableWebRestProductSurface |
  UnavailableWebRestProductSurface;

interface DeclaredOperation {
  readonly method:
    string;

  readonly path:
    string;

  readonly operationId:
    string;

  readonly requiredResources:
    readonly string[];
}

interface DeployedOperation {
  readonly method:
    string;

  readonly path:
    string;

  readonly operationId:
    string;
}

const DEFAULT_API_BASE =
  "http://localhost:52773/api/admin";

const DEFAULT_HELPER_BASE =
  "http://localhost:52773/meridian-control-plane-internal";

const DEFAULT_HISTORY_BASE =
  "http://localhost:52773/meridian-control-plane-history";

const DEFAULT_WEB_BASE =
  "http://localhost:52773";

const DEFAULT_RUNTIME_USER =
  "meridian.runtime";

const boundaries =
  Object.freeze({
    readOnly:
      true as const,

    browserCredentialExposure:
      false as const,

    publicManagementProxy:
      false as const,

    mutationControls:
      false as const,
  });

function isRecord(
  value:
    unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}

function requiredString(
  value:
    unknown,

  label:
    string,
): string {
  if (
    typeof value !==
      "string" ||
    value.length ===
      0
  ) {
    throw new Error(
      `${label} must be a non-empty string.`,
    );
  }

  return value;
}

function declaredOperations():
  readonly DeclaredOperation[] {
  if (
    !isRecord(
      declaration,
    ) ||
    !isRecord(
      declaration.paths,
    )
  ) {
    throw new Error(
      "Authoritative OpenAPI declaration is invalid.",
    );
  }

  const httpMethods =
    new Set([
      "get",
      "post",
      "put",
      "patch",
      "delete",
      "head",
      "options",
      "trace",
    ]);

  const operations:
    DeclaredOperation[] = [];

  for (
    const [
      path,
      rawPathItem,
    ]
    of Object.entries(
      declaration.paths,
    )
  ) {
    if (!isRecord(rawPathItem)) {
      continue;
    }

    for (
      const [
        rawMethod,
        rawOperation,
      ]
      of Object.entries(
        rawPathItem,
      )
    ) {
      const method =
        rawMethod.toLowerCase();

      if (
        !httpMethods.has(
          method,
        ) ||
        !isRecord(
          rawOperation,
        )
      ) {
        continue;
      }

      const operationId =
        requiredString(
          rawOperation.operationId,
          `${rawMethod.toUpperCase()} ${path} operationId`,
        );

      const rawRequired =
        rawOperation[
          "x-ISC_RequiredResource"
        ];

      if (
        !Array.isArray(
          rawRequired,
        ) ||
        rawRequired.length ===
          0 ||
        rawRequired.some(
          (
            value,
          ) =>
            typeof value !==
              "string" ||
            value.length ===
              0,
        )
      ) {
        throw new Error(
          (
            `${rawMethod.toUpperCase()} ${path} ` +
            "does not have valid declared protection metadata."
          ),
        );
      }

      operations.push({
        method:
          rawMethod.toUpperCase(),

        path,

        operationId,

        requiredResources:
          Object.freeze(
            [...rawRequired] as string[],
          ),
      });
    }
  }

  return Object.freeze(
    operations.sort(
      (
        left,
        right,
      ) =>
        (
          `${left.method} ${left.path}`
        ).localeCompare(
          `${right.method} ${right.path}`,
        ),
    ),
  );
}

function operationKey(
  operation: {
    readonly method:
      string;

    readonly path:
      string;

    readonly operationId:
      string;
  },
): string {
  return [
    operation.method.toUpperCase(),
    operation.path,
    operation.operationId,
  ].join(
    "|",
  );
}

function joinOperationMetadata(
  deployed:
    readonly DeployedOperation[],
): readonly SafeRestOperationDetail[] {
  const declared =
    declaredOperations();

  const declaredByKey =
    new Map(
      declared.map(
        (
          operation,
        ) => [
          operationKey(
            operation,
          ),
          operation,
        ],
      ),
    );

  if (
    deployed.length !==
      declared.length
  ) {
    throw new Error(
      "Deployed and declared REST operation counts diverge.",
    );
  }

  const joined =
    deployed.map(
      (
        operation,
      ): SafeRestOperationDetail => {
        const key =
          operationKey(
            operation,
          );

        const declarationEntry =
          declaredByKey.get(
            key,
          );

        if (!declarationEntry) {
          throw new Error(
            `No authoritative declaration matches deployed operation ${key}.`,
          );
        }

        return Object.freeze({
          method:
            operation.method.toUpperCase(),

          path:
            operation.path,

          operationId:
            operation.operationId,

          requiredResources:
            declarationEntry.requiredResources,

          deploymentTruth:
            "NATIVE_EMITTED_SWAGGER" as const,

          declarationTruth:
            "AUTHORITATIVE_SOURCE_OPENAPI" as const,
        });
      },
    );

  const deployedKeys =
    new Set(
      joined.map(
        (
          operation,
        ) =>
          operationKey(
            operation,
          ),
      ),
    );

  for (
    const operation
    of declared
  ) {
    if (
      !deployedKeys.has(
        operationKey(
          operation,
        ),
      )
    ) {
      throw new Error(
        (
          "Authoritative declaration contains an operation " +
          "that is not present in native emitted Swagger."
        ),
      );
    }
  }

  return Object.freeze(
    joined.sort(
      (
        left,
        right,
      ) =>
        (
          `${left.method} ${left.path}`
        ).localeCompare(
          `${right.method} ${right.path}`,
        ),
    ),
  );
}

export async function readWebRestProductSurface(
  config: {
    readonly apiBaseUrl:
      string;

    readonly helperBaseUrl:
      string;

    readonly historyBaseUrl:
      string;

    readonly webBaseUrl:
      string;

    readonly username:
      string;

    readonly password:
      string;
  },
): Promise<
  AvailableWebRestProductSurface
> {
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
    const [
      runtime,
      applications,
      deployed,
      targetHistory,
      currentOrdersState,
      currentOrdersHealth,
    ] =
      await Promise.all([
        readRuntimeInfo({
          baseUrl:
            config.apiBaseUrl,

          accessToken:
            session.accessToken,
        }),

        readMeridianWebApplications({
          apiBaseUrl:
            config.apiBaseUrl,

          accessToken:
            session.accessToken,
        }),

        readMeridianDeployedRestInventory({
          helperBaseUrl:
            config.helperBaseUrl,

          accessToken:
            session.accessToken,
        }),

        readTargetActionHistory({
          baseUrl:
            config.historyBaseUrl,

          accessToken:
            session.accessToken,

          targetCanonicalId:
            ORDERS_WEB_APP_TARGET_CANONICAL_ID,
        }),

        readOrdersWebAppState({
          apiBaseUrl:
            config.apiBaseUrl,

          accessToken:
            session.accessToken,
        }),

        probeOrdersWebAppHealth({
          webBaseUrl:
            config.webBaseUrl,
        }),
      ]);

    const historyRecords =
      await Promise.all(
        targetHistory.map(
          (
            summary,
          ) =>
            readActionReceiptHistory({
              baseUrl:
                config.historyBaseUrl,

              accessToken:
                session.accessToken,

              receiptId:
                summary.receiptId,
            }),
        ),
      );

    const verifiedLifecycle =
      buildSafeWebRestLifecycleView({
        summaries:
          targetHistory,

        receipts:
          historyRecords.map(
            actionReceiptV2FromGenericHistory,
          ),

        currentState:
          currentOrdersState,

        currentHealth:
          currentOrdersHealth,
      });

    const deployedView =
      deployed as {
        readonly operations:
          readonly DeployedOperation[];
      };

    return Object.freeze({
      status:
        "available" as const,

      runtime:
        Object.freeze({
          username:
            runtime.username,

          serverVersion:
            runtime.serverVersion,

          apiVersion:
            runtime.apiVersion,
        }),

      applications:
        Object.freeze(
          applications.map(
            (
              application,
            ) =>
              Object.freeze({
                name:
                  application.name,

                namespace:
                  application.namespace,

                enabled:
                  application.enabled,

                resource:
                  application.resource,

                dispatchClass:
                  application.dispatchClass,
              }),
          ),
        ),

      operations:
        joinOperationMetadata(
          deployedView.operations,
        ),

      verifiedLifecycle,

      boundaries,
    });
  } finally {
    await logoutIris({
      baseUrl:
        config.apiBaseUrl,

      accessToken:
        session.accessToken,
    });
  }
}

export async function readWebRestProductSurfaceFromEnvironment():
  Promise<WebRestProductSurface> {
  const password =
    process.env
      .MERIDIAN_RUNTIME_PASSWORD;

  if (
    typeof password !==
      "string" ||
    password.length ===
      0
  ) {
    return Object.freeze({
      status:
        "unavailable" as const,

      reason:
        "RUNTIME_CREDENTIAL_NOT_CONFIGURED" as const,

      message:
        (
          "Live management metadata is unavailable because the " +
          "server-owned meridian.runtime credential is not configured."
        ),

      boundaries,
    });
  }

  try {
    return await readWebRestProductSurface({
      apiBaseUrl:
        process.env
          .MERIDIAN_IRIS_API_BASE_URL ??
        DEFAULT_API_BASE,

      helperBaseUrl:
        process.env
          .MERIDIAN_IRIS_HELPER_BASE_URL ??
        DEFAULT_HELPER_BASE,

      historyBaseUrl:
        process.env
          .MERIDIAN_IRIS_HISTORY_BASE_URL ??
        DEFAULT_HISTORY_BASE,

      webBaseUrl:
        process.env
          .MERIDIAN_IRIS_WEB_BASE_URL ??
        DEFAULT_WEB_BASE,

      username:
        process.env
          .MERIDIAN_RUNTIME_USERNAME ??
        DEFAULT_RUNTIME_USER,

      password,
    });
  } catch {
    return Object.freeze({
      status:
        "unavailable" as const,

      reason:
        "LIVE_MANAGEMENT_READ_UNAVAILABLE" as const,

      message:
        (
          "Live management metadata could not be read. " +
          "Meridian keeps this surface read-only and exposes no fallback mutation path."
        ),

      boundaries,
    });
  }
}
