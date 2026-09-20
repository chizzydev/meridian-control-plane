export const ORDERS_WEB_APP_NAME =
  "/meridian-lab/orders" as const;

export const ORDERS_WEB_APP_TARGET_CANONICAL_ID =
  "web-app:/meridian-lab/orders" as const;

export const ORDERS_WEB_APP_FIXTURE_ID =
  "meridian-lab-orders" as const;

export const ORDERS_WEB_APP_GENERATION =
  "r3b-web-app-v1" as const;

export const ORDERS_WEB_APP_NAMESPACE =
  "USER" as const;

export const ORDERS_WEB_APP_DISPATCH_CLASS =
  "Meridian.Lab.Orders.REST" as const;

export const ORDERS_WEB_APP_DESCRIPTION_CREATE =
  "Meridian lab orders fixture | generation=r3b-web-app-v1 | stage=created" as const;

export const ORDERS_WEB_APP_DESCRIPTION_UPDATE =
  "Meridian lab orders fixture | generation=r3b-web-app-v1 | stage=updated" as const;

export const WEB_APP_READ_OPERATION =
  "GET /v2/web-app" as const;

export const WEB_APP_WRITE_OPERATION =
  "PUT /v2/web-app" as const;

export const WEB_APP_DELETE_OPERATION =
  "DELETE /v2/web-app" as const;

export interface OrdersWebAppSnapshot {
  readonly name:
    typeof ORDERS_WEB_APP_NAME;

  readonly namespace:
    string;

  readonly enabled:
    boolean;

  readonly resource:
    string;

  readonly dispatchClass:
    string;

  readonly description:
    string;
}

export const W01_ORDERS_WEB_APP_EXPECTED:
  OrdersWebAppSnapshot =
  Object.freeze({
    name:
      ORDERS_WEB_APP_NAME,

    namespace:
      ORDERS_WEB_APP_NAMESPACE,

    enabled:
      false,

    resource:
      "",

    dispatchClass:
      ORDERS_WEB_APP_DISPATCH_CLASS,

    description:
      ORDERS_WEB_APP_DESCRIPTION_CREATE,
  });

export const W01_ORDERS_WEB_APP_CREATE_BODY =
  Object.freeze({
    NameSpace:
      ORDERS_WEB_APP_NAMESPACE,

    Enabled:
      false,

    DispatchClass:
      ORDERS_WEB_APP_DISPATCH_CLASS,

    Description:
      ORDERS_WEB_APP_DESCRIPTION_CREATE,

    AutheEnabled:
      64,

    Recurse:
      true,

    CSRFToken:
      false,

    UseCookies:
      0,

    CSPZENEnabled:
      false,

    JWTAuthEnabled:
      false,

    InbndWebServicesEnabled:
      false,

    ServeFiles:
      0,

    RedirectEmptyPath:
      false,

    AutoCompile:
      false,

    TraceEnabled:
      false,
  });

export const W02_ORDERS_WEB_APP_EXPECTED:
  OrdersWebAppSnapshot =
  Object.freeze({
    ...W01_ORDERS_WEB_APP_EXPECTED,

    description:
      ORDERS_WEB_APP_DESCRIPTION_UPDATE,
  });

export const W02_ORDERS_WEB_APP_UPDATE_BODY =
  Object.freeze({
    ...W01_ORDERS_WEB_APP_CREATE_BODY,

    Description:
      ORDERS_WEB_APP_DESCRIPTION_UPDATE,
  });

export function ordersWebAppSnapshotMatches(
  observed:
    OrdersWebAppSnapshot,
  expected:
    OrdersWebAppSnapshot =
      W01_ORDERS_WEB_APP_EXPECTED,
): boolean {
  return (
    observed.name ===
      expected.name &&
    observed.namespace ===
      expected.namespace &&
    observed.enabled ===
      expected.enabled &&
    observed.resource ===
      expected.resource &&
    observed.dispatchClass ===
      expected.dispatchClass &&
    observed.description ===
      expected.description
  );
}

export function assertW01OrdersWebAppSnapshot(
  observed:
    OrdersWebAppSnapshot,
): void {
  if (
    !ordersWebAppSnapshotMatches(
      observed,
      W01_ORDERS_WEB_APP_EXPECTED,
    )
  ) {
    throw new Error(
      "W01 web-app snapshot does not match the frozen Meridian orders fixture.",
    );
  }
}

export function assertW02OrdersWebAppSnapshot(
  observed:
    OrdersWebAppSnapshot,
): void {
  if (
    !ordersWebAppSnapshotMatches(
      observed,
      W02_ORDERS_WEB_APP_EXPECTED,
    )
  ) {
    throw new Error(
      "W02 web-app snapshot does not match the frozen updated Meridian orders fixture.",
    );
  }
}
