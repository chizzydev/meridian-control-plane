import type {
  ReconciliationDecision,
} from "../../proof/contract";

import {
  ORDERS_WEB_APP_FIXTURE_ID,
  ORDERS_WEB_APP_GENERATION,
  ORDERS_WEB_APP_NAME,
  WEB_APP_WRITE_OPERATION,
  W01_ORDERS_WEB_APP_EXPECTED,
  assertW01OrdersWebAppSnapshot,
  ordersWebAppSnapshotMatches,
  type OrdersWebAppSnapshot,
} from "./fixture";

export const W01_WEB_APP_CREATE_EXECUTION_SCHEMA_VERSION =
  "meridian.web-app-create-execution.v1" as const;

export interface W01WebAppCreateExecution {
  readonly schemaVersion:
    typeof W01_WEB_APP_CREATE_EXECUTION_SCHEMA_VERSION;

  readonly state:
    "APPLIED";

  readonly actionId:
    "W01_WEB_APP_CREATE";

  readonly officialOperation:
    typeof WEB_APP_WRITE_OPERATION;

  readonly fixtureId:
    typeof ORDERS_WEB_APP_FIXTURE_ID;

  readonly generation:
    typeof ORDERS_WEB_APP_GENERATION;

  readonly webAppName:
    typeof ORDERS_WEB_APP_NAME;

  readonly beforePresent:
    false;

  readonly after:
    OrdersWebAppSnapshot;

  readonly configurationVerified:
    true;

  readonly mutationRequestCount:
    1;

  readonly resolutionSource:
    "DIRECT_EXECUTION" |
    "AUTHORITATIVE_RECONCILIATION_READBACK";
}

function execution(
  source:
    W01WebAppCreateExecution["resolutionSource"],
): W01WebAppCreateExecution {
  return Object.freeze({
    schemaVersion:
      W01_WEB_APP_CREATE_EXECUTION_SCHEMA_VERSION,

    state:
      "APPLIED" as const,

    actionId:
      "W01_WEB_APP_CREATE" as const,

    officialOperation:
      WEB_APP_WRITE_OPERATION,

    fixtureId:
      ORDERS_WEB_APP_FIXTURE_ID,

    generation:
      ORDERS_WEB_APP_GENERATION,

    webAppName:
      ORDERS_WEB_APP_NAME,

    beforePresent:
      false as const,

    after:
      W01_ORDERS_WEB_APP_EXPECTED,

    configurationVerified:
      true as const,

    mutationRequestCount:
      1 as const,

    resolutionSource:
      source,
  });
}

export function executionFromW01Readback(
  observed:
    OrdersWebAppSnapshot,
): W01WebAppCreateExecution {
  assertW01OrdersWebAppSnapshot(
    observed,
  );

  return execution(
    "DIRECT_EXECUTION",
  );
}

export function reconcileUnknownW01WebAppCreate(
  observed:
    OrdersWebAppSnapshot |
    null,
): ReconciliationDecision<
  W01WebAppCreateExecution
> {
  if (
    observed ===
      null
  ) {
    return Object.freeze({
      outcome:
        "NOT_APPLIED" as const,

      reason:
        "AUTHORITATIVE_READBACK_CONFIRMED_TARGET_ABSENT",
    });
  }

  if (
    ordersWebAppSnapshotMatches(
      observed,
      W01_ORDERS_WEB_APP_EXPECTED,
    )
  ) {
    return Object.freeze({
      outcome:
        "APPLIED" as const,

      execution:
        execution(
          "AUTHORITATIVE_RECONCILIATION_READBACK",
        ),
    });
  }

  return Object.freeze({
    outcome:
      "STILL_UNKNOWN" as const,

    reason:
      "AUTHORITATIVE_READBACK_MATCHED_NEITHER_W01_PRESTATE_NOR_EXACT_W01_POSTSTATE",
  });
}
