import {
  actionReceiptV2FromGenericHistory,
} from "../src/lib/proof/action-history";

import {
  ORDERS_WEB_APP_TARGET_CANONICAL_ID,
} from "../src/lib/actions/web-app/fixture";

import {
  readActionReceiptHistory,
  readTargetActionHistory,
} from "../src/lib/iris/action-history-server";

import {
  loginIris,
  logoutIris,
} from "../src/lib/iris/transport";

import {
  probeOrdersWebAppHealth,
  readOrdersWebAppState,
} from "../src/lib/iris/web-app-action-transport";

import {
  buildSafeWebRestLifecycleView,
} from "../src/lib/iris/web-rest-history-view";

const API_BASE =
  process.env
    .MERIDIAN_IRIS_API_BASE_URL ??
  "http://localhost:52773/api/admin";

const WEB_BASE =
  process.env
    .MERIDIAN_IRIS_WEB_BASE_URL ??
  "http://localhost:52773";

const HISTORY_BASE =
  process.env
    .MERIDIAN_IRIS_HISTORY_BASE_URL ??
  "http://localhost:52773/meridian-control-plane-history";

const USERNAME =
  process.env
    .MERIDIAN_RUNTIME_USERNAME ??
  "meridian.runtime";

const PASSWORD =
  process.env
    .MERIDIAN_RUNTIME_PASSWORD;

const EXPECTED =
  Object.freeze([
    Object.freeze({
      receiptId:
        "meridian-w01-web-app-create-r3b-a-r9-001",

      sha256:
        "693B47009BD1B74C3949FA896302AACBFB5DF3397AD9C2A7A46B425CEFC3246F",
    }),

    Object.freeze({
      receiptId:
        "meridian-w02-web-app-update-r3b-b-001",

      sha256:
        "DDCDFB0BE1057831040429FBA1EB069C2A352F787C5630ACF2D79C28E2BAE442",
    }),

    Object.freeze({
      receiptId:
        "meridian-w03-web-app-enable-recovery-r3b-c-r2a-001",

      sha256:
        "1C3334BBE2AA69ED2197CEF56949D60FA4C7C9402163E91FAFE1849F36C4F603",
    }),

    Object.freeze({
      receiptId:
        "meridian-w03-web-app-enable-authz-recovery-r3b-c-r2e-001",

      sha256:
        "6B263F425E2AC4F0A07CBAF0D0D6C5FEC2C5B92F6214E7A09C32768F7B350897",
    }),

    Object.freeze({
      receiptId:
        "meridian-w03-web-app-enable-r3b-c-r2f-001",

      sha256:
        "2CD0F67C55F868A4CAFE5312DEFB62BBDBC5A11967453AD994826C824110178D",
    }),

    Object.freeze({
      receiptId:
        "meridian-w04-web-app-delete-r3b-d-001",

      sha256:
        "52BE6B4105EE8D2CC660DBDCD749D87D829F416BBD8473CB0EF8A975557E58D8",
    }),
  ]);

if (
  typeof PASSWORD !==
    "string" ||
  PASSWORD.length ===
    0
) {
  throw new Error(
    "MERIDIAN_RUNTIME_PASSWORD is required for R3C read-only certification.",
  );
}

console.log(
  "===== MERIDIAN R3C WEB/REST HISTORY + FINAL R3 CLOSURE =====",
);
console.log(
  "R3C_LIVE_MUTATION_AUTHORIZED=NO",
);
console.log(
  "R3C_HISTORY_TARGET=web-app:/meridian-lab/orders",
);
console.log(
  "R3C_EXPECTED_VERIFIED_RECEIPTS=6",
);

const session =
  await loginIris({
    baseUrl:
      API_BASE,

    username:
      USERNAME,

    password:
      PASSWORD,
  });

try {
  const summaries =
    await readTargetActionHistory({
      baseUrl:
        HISTORY_BASE,

      accessToken:
        session.accessToken,

      targetCanonicalId:
        ORDERS_WEB_APP_TARGET_CANONICAL_ID,
    });

  if (
    summaries.length !==
      EXPECTED.length
  ) {
    throw new Error(
      `R3C expected ${EXPECTED.length} history entries; observed ${summaries.length}.`,
    );
  }

  const summaryIds =
    new Set(
      summaries.map(
        (
          summary,
        ) =>
          summary.receiptId,
      ),
    );

  const receipts = [];

  for (
    const expected
    of EXPECTED
  ) {
    if (
      !summaryIds.has(
        expected.receiptId,
      )
    ) {
      throw new Error(
        `R3C missing history summary ${expected.receiptId}.`,
      );
    }

    const receipt =
      actionReceiptV2FromGenericHistory(
        await readActionReceiptHistory({
          baseUrl:
            HISTORY_BASE,

          accessToken:
            session.accessToken,

          receiptId:
            expected.receiptId,
        }),
      );

    if (
      receipt.receiptSha256 !==
        expected.sha256
    ) {
      throw new Error(
        `R3C receipt hash mismatch for ${expected.receiptId}.`,
      );
    }

    receipts.push(
      receipt,
    );

    console.log(
      `R3C_RECEIPT=${receipt.receiptId}|ACTION=${receipt.actionType}|STATE=VERIFIED|SHA256=${receipt.receiptSha256}|PROOFS=${receipt.proofResults.length}`,
    );
  }

  const [
    currentState,
    currentHealth,
  ] =
    await Promise.all([
      readOrdersWebAppState({
        apiBaseUrl:
          API_BASE,

        accessToken:
          session.accessToken,
      }),

      probeOrdersWebAppHealth({
        webBaseUrl:
          WEB_BASE,
      }),
    ]);

  const lifecycle =
    buildSafeWebRestLifecycleView({
      summaries,

      receipts,

      currentState,

      currentHealth,
    });

  if (
    lifecycle.historyCount !==
      6 ||
    lifecycle.currentApplicationState !==
      "ABSENT" ||
    lifecycle.currentHttpStatus !==
      404 ||
    lifecycle.historyIntegrity !==
      "CANONICAL_HASH_VALIDATED" ||
    lifecycle.currentStateSource !==
      "AUTHORITATIVE_CURRENT_RECHECK"
  ) {
    throw new Error(
      "R3C judge-visible lifecycle view did not preserve verified history/current-state separation.",
    );
  }

  const latest =
    lifecycle.receipts[
      lifecycle.receipts.length -
        1
    ];

  if (
    latest ===
      undefined ||
    latest.receiptId !==
      "meridian-w04-web-app-delete-r3b-d-001" ||
    latest.actionType !==
      "WEB_APP_DELETE"
  ) {
    throw new Error(
      "R3C latest verified lifecycle entry is not W04 delete.",
    );
  }

  console.log(
    "R3C_HISTORY_COUNT=6",
  );
  console.log(
    "R3C_HISTORY_INTEGRITY=CANONICAL_HASH_VALIDATED",
  );
  console.log(
    "R3C_CURRENT_STATE_SOURCE=AUTHORITATIVE_CURRENT_RECHECK",
  );
  console.log(
    "R3C_CURRENT_APPLICATION_STATE=ABSENT",
  );
  console.log(
    "R3C_CURRENT_HTTP_STATUS=404",
  );
  console.log(
    "R3C_LATEST_VERIFIED_ACTION=WEB_APP_DELETE",
  );
  console.log(
    "R3C_HISTORICAL_PROOF_CURRENT_STATE_SEPARATION=PASS",
  );
  console.log(
    "R3C_JUDGE_VISIBLE_HISTORY_MODEL=PASS",
  );
  console.log(
    "R3C_LIVE_READ_CERTIFICATION=PASS",
  );
}
finally {
  await logoutIris({
    baseUrl:
      API_BASE,

    accessToken:
      session.accessToken,
  });
}
