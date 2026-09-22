import {
  readFileSync,
} from "node:fs";

import {
  digestCanonicalJson,
} from "../src/lib/proof/digest";

import {
  T04_SUSPEND_BODY,
  T04_TASK_CLASS,
  T04_TASK_NAME,
  T04_TASK_ROLE,
  T04_TASK_SUSPEND_PATH,
  listT04Tasks,
  postT04TaskSuspend,
  readT04Task,
  readT04TaskHistory,
  readT04TaskManagerStatus,
  readT04UpcomingTasks,
} from "../src/lib/iris/task-suspend-action-transport";

import {
  T04_EXPECTED_CREATE_BODY_DIGEST,
  T04_EXPECTED_FIXTURE_PROJECTION_DIGEST,
  T04_TASK_SUSPEND_CONTRACT_ID,
  T04_TASK_SUSPEND_DELTA_SUMMARY,
  T04_TASK_TARGET_CANONICAL_ID,
  buildT04TaskSuspendProofResults,
  certifyT04TaskSuspendAction,
  t04AuthorizedSuspendRequestDigest,
  t04PoststateMatches,
  t04PrestateMatches,
  t04TaskHistoryMatchesSingleSuspendTransition,
  t04TaskSuspendIntent,
  type T04TaskSuspendPreflight,
} from "../src/lib/actions/tasks/task-suspend";

import {
  actionReceiptV2FromGenericHistory,
  buildActionReceiptHistoryRecord,
} from "../src/lib/proof/action-history";

import {
  assertExactReceiptReadback,
} from "../src/lib/proof/receipt";

import {
  persistActionReceiptHistory,
  readActionReceiptHistory,
  readTargetActionHistory,
} from "../src/lib/iris/action-history-server";

import {
  loginIris,
  logoutIris,
  readRuntimeInfo,
  type IrisSession,
} from "../src/lib/iris/transport";

const API_BASE =
  process.env.MERIDIAN_IRIS_API_BASE_URL ??
  "http://localhost:52773/api/admin";

const HISTORY_BASE =
  process.env.MERIDIAN_IRIS_HISTORY_BASE_URL ??
  "http://localhost:52773/meridian-control-plane-history";

const USERNAME =
  process.env.MERIDIAN_RUNTIME_USERNAME ??
  "meridian.runtime";

const LIVE_GATE =
  process.env.MERIDIAN_R5_D_T04_LIVE_SUSPEND_ALLOWED ===
  "YES";

const MODE =
  process.env.MERIDIAN_R5_D_T04_MODE ??
  "PRECHECK";

const FIXTURE_GENERATION =
  "5d1764a2-1cdf-4fc6-9bb9-eaf40ec62144";

const EXPECTED_TASK_ID =
  1006 as const;

const EXPECTED_STATE_A_DIGEST =
  "0CC601CB9FC66B338E4363CF9837B7DA19016EE86C9587403C340DD8ED487872";

const EXPECTED_HISTORY_DIGEST =
  "2BFF5A522ED4C8D74D5A3E83837EE6DF3DC01DCA70D0A532DFEEAD53B3B94663";

const EXPECTED_SUSPEND_REQUEST_DIGEST =
  "B22836796144DDA3FE919952DE28686383485E4613918985FFE62E40E80B1FD1";

const EXPECTED_REVIEW_DIGEST =
  "09C18EEDE56C76AB782DF9659117D12C78414C5D69B776F7E26FC431383448B0";

const EXPECTED_INDEPENDENT_REVIEW_DIGEST =
  "BD26DF74C07F9119247DBFEA26C3E7FA74978BC6A1181C3C538F88FB54C213A2";

const ACTION_ID =
  "t04-task-suspend-r5-d-001";

const RECEIPT_ID =
  "meridian-t04-task-suspend-r5-d-001";

const PREDECESSORS =
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
    Object.freeze({
      receiptId:
        "meridian-p01-role-create-r4-a-001",
      sha256:
        "0F3F8B06560A9F91B2C20A9EEB59D5D262FD9BEDE905CB04FDD79F441C94407B",
    }),
    Object.freeze({
      receiptId:
        "meridian-p02-role-delete-r4-b-001",
      sha256:
        "489001EDF5E18320520C208F4F90468ACD0290184FDFF7D1499C8876FB5DE229",
    }),
    Object.freeze({
      receiptId:
        "meridian-p03-user-add-role-r4-c-001",
      sha256:
        "40A6076D54F92EAB8A1D65323D5B06DA3EC11EA4939D540153D7FFD7BD4EF18E",
    }),
    Object.freeze({
      receiptId:
        "meridian-p05-user-enable-r4-d-001",
      sha256:
        "C38D0096AE9E642F644FC4B366C61EC332EC2DED0EC6EA0954AB052F91998EE9",
    }),
    Object.freeze({
      receiptId:
        "meridian-p06-user-disable-r4-e-001",
      sha256:
        "AFEF0F9D0A9E754DCFC8347899E6913406D694C9D26018ADF77D32F6E6BE0C0A",
    }),
    Object.freeze({
      receiptId:
        "meridian-t01-task-create-r5-a-001",
      sha256:
        "AA9EFC36F77DA2B86C6A85469BCD40E753388A6101B0B7133E3CC5C295823B41",
    }),
    Object.freeze({
      receiptId:
        "meridian-t02-task-update-r5-b-001",
      sha256:
        "210E16BB4BCF8F21C8EA02439FBDF0C1FD9BB1535AC4D1F6805E5E50285131CF",
    }),
    Object.freeze({
      receiptId:
        "meridian-t03-task-run-now-r5-c-001",
      sha256:
        "9110BA190DB0AA2E5A61C4CD6D9A5C7B0CED357FF98BD5C1009ED46776210704",
    }),
  ]);

function sameReceiptSet(
  actual:
    readonly {readonly receiptId: string}[],
  expected:
    readonly string[],
): boolean {
  return (
    actual.length ===
      expected.length &&
    JSON.stringify(
      actual.map(
        (
          item,
        ) =>
          item.receiptId,
      ).sort(),
    ) ===
      JSON.stringify(
        [
          ...expected,
        ].sort(),
      )
  );
}

function isRecord(
  value:
    unknown,
): value is Record<string, unknown> {
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

function resultObject(
  value:
    unknown,
): Record<string, unknown> {
  if (
    !isRecord(
      value,
    )
  ) {
    throw new Error(
      "T04 D6 login response is not an object.",
    );
  }

  const result =
    Object.prototype.hasOwnProperty.call(
      value,
      "result",
    )
      ? value.result
      : value;

  if (
    !isRecord(
      result,
    )
  ) {
    throw new Error(
      "T04 D6 login result is not an object.",
    );
  }

  return result;
}

function stringValue(
  value:
    unknown,
): string {
  return (
    typeof value ===
      "string"
      ? value.trim()
      : ""
  );
}

async function loginActionRole(
  password:
    string,
): Promise<IrisSession> {
  const response =
    await fetch(
      API_BASE.replace(
        /\/+$/,
        "",
      ) +
        "/login",
      {
        method:
          "POST",

        cache:
          "no-store",

        redirect:
          "error",

        headers:
          {
            Accept:
              "application/json",

            "Content-Type":
              "application/json",
          },

        body:
          JSON.stringify({
            user:
              USERNAME,

            password,

            role:
              T04_TASK_ROLE,
          }),
      },
    );

  const text =
    await response.text();

  if (
    response.status !==
      200
  ) {
    throw new Error(
      `T04 D6 explicit action-role login failed HTTP ${response.status}.`,
    );
  }

  const parsed =
    text.trim().length ===
      0
      ? {}
      : JSON.parse(
          text,
        );

  const result =
    resultObject(
      parsed,
    );

  const accessToken =
    stringValue(
      result.access_token ??
      result.accessToken,
    );

  const refreshToken =
    stringValue(
      result.refresh_token ??
      result.refreshToken,
    );

  if (
    accessToken.length ===
      0 ||
    refreshToken.length ===
      0
  ) {
    throw new Error(
      "T04 D6 action-role login did not return both tokens.",
    );
  }

  return {
    accessToken,
    refreshToken,
  };
}

function frozenSuspendRequest():
  Readonly<{
    method:
      "POST";

    path:
      "/v2/task/suspend";

    query:
      Readonly<{
        id:
          1006;
      }>;

    body:
      typeof T04_SUSPEND_BODY;

    automaticRetryAllowed:
      false;
  }> {
  return Object.freeze({
    method:
      "POST" as const,

    path:
      "/v2/task/suspend" as const,

    query:
      Object.freeze({
        id:
          EXPECTED_TASK_ID,
      }),

    body:
      T04_SUSPEND_BODY,

    automaticRetryAllowed:
      false as const,
  });
}

function d3StateAMaterial(
  preflight:
    T04TaskSuspendPreflight,
): Readonly<Record<string, unknown>> {
  if (
    preflight.matchingTask ===
      null ||
    preflight.matchingSummary ===
      null
  ) {
    throw new Error(
      "T04 D6 cannot project D3 State A from a missing task or summary.",
    );
  }

  if (
    preflight.matchingUpcomingCount !==
      0
  ) {
    throw new Error(
      "T04 D6 cannot project D3 State A with an upcoming execution.",
    );
  }

  return Object.freeze({
    schemaVersion:
      "meridian.t04-task-suspend-state-a.v1" as const,

    actionId:
      "T04_TASK_SUSPEND" as const,

    fixtureGeneration:
      FIXTURE_GENERATION,

    fixtureDefinitionDigest:
      T04_EXPECTED_FIXTURE_PROJECTION_DIGEST,

    createBodyDigest:
      T04_EXPECTED_CREATE_BODY_DIGEST,

    taskId:
      EXPECTED_TASK_ID,

    taskSnapshot:
      preflight.matchingTask,

    taskSummary:
      preflight.matchingSummary,

    taskHistory:
      preflight.matchingHistory,

    matchingUpcoming:
      Object.freeze([]),

    taskInventoryCount:
      preflight.taskInventoryCount,

    taskManagerStatus:
      preflight.taskManagerStatus,
  });
}

function d3ReviewMaterial(
  stateADigest:
    string,
): Readonly<Record<string, unknown>> {
  const request =
    frozenSuspendRequest();

  return Object.freeze({
    schemaVersion:
      "meridian.t04-task-suspend-review.v1" as const,

    actionId:
      "T04_TASK_SUSPEND" as const,

    taskId:
      EXPECTED_TASK_ID,

    fixtureGeneration:
      FIXTURE_GENERATION,

    fixtureDefinitionDigest:
      T04_EXPECTED_FIXTURE_PROJECTION_DIGEST,

    createBodyDigest:
      T04_EXPECTED_CREATE_BODY_DIGEST,

    stateADigest,

    operation:
      "POST /v2/task/suspend" as const,

    requiredAuthority:
      "%Admin_Task:U" as const,

    authorityRole:
      T04_TASK_ROLE,

    request,

    requestDigest:
      t04AuthorizedSuspendRequestDigest(
        EXPECTED_TASK_ID,
      ),

    expectedStateBSuspended:
      true as const,

    recoveryActionId:
      "T05_TASK_RESUME" as const,
  });
}

function d3IndependentReviewMaterial(
  preflight:
    T04TaskSuspendPreflight,
  stateADigest:
    string,
  reviewDigest:
    string,
): Readonly<Record<string, unknown>> {
  return Object.freeze({
    schemaVersion:
      "meridian.t04-independent-preflight-review.v1" as const,

    actionId:
      "T04_TASK_SUSPEND" as const,

    taskId:
      EXPECTED_TASK_ID,

    fixtureGeneration:
      FIXTURE_GENERATION,

    fixtureDefinitionDigest:
      T04_EXPECTED_FIXTURE_PROJECTION_DIGEST,

    createBodyDigest:
      T04_EXPECTED_CREATE_BODY_DIGEST,

    stateADigest,

    historyDigest:
      digestCanonicalJson(
        preflight.matchingHistory,
      ),

    operation:
      "POST /v2/task/suspend" as const,

    requiredAuthority:
      "%Admin_Task:U" as const,

    authorityRole:
      T04_TASK_ROLE,

    requestDigest:
      t04AuthorizedSuspendRequestDigest(
        EXPECTED_TASK_ID,
      ),

    frozenReviewDigest:
      reviewDigest,

    observedTaskInventoryCount:
      preflight.taskInventoryCount,

    observedHistoryCount:
      preflight.matchingHistoryCount,

    observedUpcomingCount:
      preflight.matchingUpcomingCount,

    observedTaskManagerStatus:
      preflight.taskManagerStatus,

    observedSuspended:
      false as const,

    expectedStateBSuspended:
      true as const,

    recoveryActionId:
      "T05_TASK_RESUME" as const,

    automaticRetryAllowed:
      false as const,
  });
}

function assertD3FrozenAuthority(
  preflight:
    T04TaskSuspendPreflight,
): void {
  if (
    !t04PrestateMatches(
      preflight,
    )
  ) {
    throw new Error(
      "T04 D6 product preflight no longer matches the exact unsuspended State A contract.",
    );
  }

  const stateADigest =
    digestCanonicalJson(
      d3StateAMaterial(
        preflight,
      ),
    );

  const historyDigest =
    digestCanonicalJson(
      preflight.matchingHistory,
    );

  const suspendRequestDigest =
    t04AuthorizedSuspendRequestDigest(
      EXPECTED_TASK_ID,
    );

  const reviewDigest =
    digestCanonicalJson(
      d3ReviewMaterial(
        stateADigest,
      ),
    );

  const independentReviewDigest =
    digestCanonicalJson(
      d3IndependentReviewMaterial(
        preflight,
        stateADigest,
        reviewDigest,
      ),
    );

  if (
    stateADigest !==
      EXPECTED_STATE_A_DIGEST ||
    historyDigest !==
      EXPECTED_HISTORY_DIGEST ||
    suspendRequestDigest !==
      EXPECTED_SUSPEND_REQUEST_DIGEST ||
    reviewDigest !==
      EXPECTED_REVIEW_DIGEST ||
    independentReviewDigest !==
      EXPECTED_INDEPENDENT_REVIEW_DIGEST ||
    preflight.taskInventoryCount !==
      17 ||
    preflight.matchingHistoryCount !==
      1 ||
    preflight.matchingUpcomingCount !==
      0 ||
    preflight.taskManagerStatus !==
      "Running"
  ) {
    throw new Error(
      "T04 D6 failed to reproduce the frozen D3 authority packet.",
    );
  }
}

async function readAndVerifyPredecessors(
  accessToken:
    string,
): Promise<void> {
  for (
    const predecessor
    of PREDECESSORS
  ) {
    const receipt =
      actionReceiptV2FromGenericHistory(
        await readActionReceiptHistory({
          baseUrl:
            HISTORY_BASE,

          accessToken,

          receiptId:
            predecessor.receiptId,
        }),
      );

    if (
      receipt.receiptSha256 !==
        predecessor.sha256
    ) {
      throw new Error(
        `T04 D6 historical predecessor changed: ${predecessor.receiptId}.`,
      );
    }

    console.log(
      `T04_D6_PREDECESSOR_RECEIPT_SHA256=${receipt.receiptId}|${receipt.receiptSha256}`,
    );
  }
}

if (
  USERNAME !==
    "meridian.runtime"
) {
  throw new Error(
    "T04 D6 is pinned to meridian.runtime.",
  );
}

if (
  MODE !==
    "PRECHECK" &&
  MODE !==
    "EXECUTE"
) {
  throw new Error(
    "T04 D6 mode must be PRECHECK or EXECUTE.",
  );
}

if (
  !LIVE_GATE
) {
  console.log(
    "===== MERIDIAN R5-D6 CLOSED LIVE GATE =====",
  );

  console.log(
    "T04_D6_LIVE_GATE=DENIED",
  );

  console.log(
    "T04_D6_IRIS_CONNECTION_PERFORMED=NO",
  );

  console.log(
    "T04_D6_TASK_SUSPEND_PERFORMED=NO",
  );

  console.log(
    "T04_D6_RECEIPT_WRITE_PERFORMED=NO",
  );

  console.log(
    "T04_D6_LIVE_VERIFIER_ARMED=YES",
  );
} else {
  const input =
    JSON.parse(
      readFileSync(
        0,
        "utf8",
      ),
    ) as {
      readonly password?:
        unknown;
    };

  if (
    typeof input.password !==
      "string" ||
    input.password.length ===
      0
  ) {
    throw new Error(
      "T04 D6 runtime password is missing from ephemeral stdin.",
    );
  }

  let runtimeSession:
    IrisSession |
    null =
      null;

  let actionSession:
    IrisSession |
    null =
      null;

  let reviewedPreflight:
    T04TaskSuspendPreflight |
    null =
      null;

  let physicalSuspendRequestCount =
    0;

  let businessDispatchStarted =
    false;

  let receiptPersistRequestCount =
    0;

  let receiptPersistAttempted =
    false;

  let certificationFullyClosed =
    false;

  let stateBDigest =
    "";

  let commandComplete =
    false;

  const password =
    input.password;

  const intent =
    t04TaskSuspendIntent(
      FIXTURE_GENERATION,
      EXPECTED_TASK_ID,
    );

  try {
    console.log(
      "===== MERIDIAN R5-D6 LIVE VERIFIER =====",
    );

    console.log(
      `T04_D6_MODE=${MODE}`,
    );

    console.log(
      "T04_D6_FIXTURE_CREATE_AUTHORIZED=NO",
    );

    console.log(
      `T04_D6_TASK_SUSPEND_AUTHORIZED=${MODE === "EXECUTE" ? "YES" : "NO"}`,
    );

    console.log(
      "T04_D6_TASK_SUSPEND_MAXIMUM=1",
    );

    console.log(
      "T04_D6_TASK_RESUME_AUTHORIZED=NO",
    );

    console.log(
      "T04_D6_FIXTURE_DELETE_AUTHORIZED=NO",
    );

    console.log(
      `T04_D6_RECEIPT_WRITE_AUTHORIZED=${MODE === "EXECUTE" ? "YES" : "NO"}`,
    );

    console.log(
      "T04_D6_AUTOMATIC_RETRY_AUTHORIZED=NO",
    );

    console.log(
      "T04_D6_AUTOMATIC_RECOVERY_AUTHORIZED=NO",
    );

    console.log(
      `T04_D6_CONTRACT_ID=${T04_TASK_SUSPEND_CONTRACT_ID}`,
    );

    console.log(
      "T04_D6_CONTRACT_VERSION=2",
    );

    console.log(
      `T04_D6_EXPECTED_TASK_ID=${EXPECTED_TASK_ID}`,
    );

    console.log(
      `T04_D6_EXPECTED_GENERATION=${FIXTURE_GENERATION}`,
    );

    console.log(
      `T04_D6_EXPECTED_STATE_A_DIGEST=${EXPECTED_STATE_A_DIGEST}`,
    );

    console.log(
      `T04_D6_EXPECTED_HISTORY_DIGEST=${EXPECTED_HISTORY_DIGEST}`,
    );

    console.log(
      `T04_D6_EXPECTED_SUSPEND_REQUEST_DIGEST=${EXPECTED_SUSPEND_REQUEST_DIGEST}`,
    );

    console.log(
      `T04_D6_EXPECTED_REVIEW_DIGEST=${EXPECTED_REVIEW_DIGEST}`,
    );

    console.log(
      `T04_D6_EXPECTED_INDEPENDENT_REVIEW_DIGEST=${EXPECTED_INDEPENDENT_REVIEW_DIGEST}`,
    );

    console.log(
      `T04_D6_RECEIPT_ID=${RECEIPT_ID}`,
    );

    runtimeSession =
      await loginIris({
        baseUrl:
          API_BASE,

        username:
          USERNAME,

        password,
      });

    console.log(
      "T04_D6_RUNTIME_LOGIN_HTTP=200",
    );

    const runtime =
      await readRuntimeInfo({
        baseUrl:
          API_BASE,

        accessToken:
          runtimeSession.accessToken,
      });

    if (
      runtime.username !==
        USERNAME ||
      runtime.apiVersion !==
        2 ||
      !runtime.serverVersion.includes(
        "2026.2",
      ) ||
      !runtime.serverVersion.includes(
        "Build 221U",
      )
    ) {
      throw new Error(
        "T04 D6 pinned runtime identity/version guard failed.",
      );
    }

    console.log(
      "T04_D6_RUNTIME_IDENTITY_VERSION=PASS",
    );

    actionSession =
      await loginActionRole(
        password,
      );

    console.log(
      "T04_D6_EXPLICIT_ACTION_ESCALATION_LOGIN_HTTP=200",
    );

    console.log(
      `T04_D6_AUTHORITY_ROLE=${T04_TASK_ROLE}`,
    );

    console.log(
      "T04_D6_STANDING_RUNTIME_AUTHORITY_BROADENED=NO",
    );

    await readAndVerifyPredecessors(
      runtimeSession.accessToken,
    );

    console.log(
      `T04_D6_PREDECESSOR_RECEIPT_COUNT=${PREDECESSORS.length}`,
    );

    console.log(
      "T04_D6_ALL_PREDECESSOR_RECEIPTS_PRECHECK=PASS",
    );

    const targetHistoryBefore =
      await readTargetActionHistory({
        baseUrl:
          HISTORY_BASE,

        accessToken:
          runtimeSession.accessToken,

        targetCanonicalId:
          T04_TASK_TARGET_CANONICAL_ID,
      });

    if (
      targetHistoryBefore.length !==
        0
    ) {
      throw new Error(
        "T04 D6 requires zero pre-existing T04 receipts.",
      );
    }

    console.log(
      "T04_D6_TARGET_HISTORY_PRESTATE_COUNT=0",
    );

    const readFreshPreflight =
      async (): Promise<T04TaskSuspendPreflight> => {
        const session =
          actionSession;

        if (
          session ===
            null
        ) {
          throw new Error(
            "T04 D6 action escalation session is unavailable.",
          );
        }

        const [
          tasks,
          upcoming,
          manager,
        ] =
          await Promise.all([
            listT04Tasks({
              apiBaseUrl:
                API_BASE,

              accessToken:
                session.accessToken,
            }),

            readT04UpcomingTasks({
              apiBaseUrl:
                API_BASE,

              accessToken:
                session.accessToken,
            }),

            readT04TaskManagerStatus({
              apiBaseUrl:
                API_BASE,

              accessToken:
                session.accessToken,
            }),
          ]);

        const matches =
          tasks.filter(
            (
              candidate,
            ) =>
              candidate.name ===
                T04_TASK_NAME,
          );

        let task:
          T04TaskSuspendPreflight[
            "matchingTask"
          ] =
          null;

        let summary:
          T04TaskSuspendPreflight[
            "matchingSummary"
          ] =
          null;

        let history:
          T04TaskSuspendPreflight[
            "matchingHistory"
          ] =
          Object.freeze([]);

        if (
          matches.length ===
            1
        ) {
          const only =
            matches[0];

          if (
            only ===
              undefined ||
            only.id <
              1
          ) {
            throw new Error(
              "T04 D6 exact-name inventory row has no positive id.",
            );
          }

          summary =
            only;

          [
            task,
            history,
          ] =
            await Promise.all([
              readT04Task({
                apiBaseUrl:
                  API_BASE,

                accessToken:
                  session.accessToken,

                taskId:
                  only.id,
              }),

              readT04TaskHistory({
                apiBaseUrl:
                  API_BASE,

                accessToken:
                  session.accessToken,

                taskId:
                  only.id,
              }),
            ]);
        }

        const matchingUpcoming =
          upcoming.filter(
            (
              row,
            ) =>
              row.name ===
                T04_TASK_NAME ||
              row.id ===
                EXPECTED_TASK_ID,
          );

        return Object.freeze({
          schemaVersion:
            "meridian.task-suspend-preflight.v1" as const,

          expectedFixtureGeneration:
            FIXTURE_GENERATION,

          taskName:
            T04_TASK_NAME,

          expectedTaskId:
            EXPECTED_TASK_ID,

          expectedFixtureProjectionDigest:
            T04_EXPECTED_FIXTURE_PROJECTION_DIGEST,

          expectedCreateBodyDigest:
            T04_EXPECTED_CREATE_BODY_DIGEST,

          authorizedSuspendRequestDigest:
            t04AuthorizedSuspendRequestDigest(
              EXPECTED_TASK_ID,
            ),

          matchingTaskCount:
            matches.length,

          matchingTask:
            task,

          matchingSummary:
            summary,

          taskInventoryCount:
            tasks.length,

          matchingUpcomingCount:
            matchingUpcoming.length,

          matchingHistoryCount:
            history.length,

          matchingHistory:
            history,

          taskManagerStatus:
            manager,

          officialMutationOperation:
            "POST /v2/task/suspend" as const,

          requiredAuthority:
            "%Admin_Task:U" as const,

          authorityRole:
            T04_TASK_ROLE,

          authorityMode:
            "EXPLICIT_ESCALATION_ROLE" as const,
        });
      };

    const independentPreflight =
      await readFreshPreflight();

    assertD3FrozenAuthority(
      independentPreflight,
    );

    console.log(
      `T04_D6_GENERIC_PREFLIGHT_DIGEST=${digestCanonicalJson(
        independentPreflight,
      )}`,
    );

    console.log(
      "T04_D6_D3_STATE_A_PRECHECK=PASS",
    );

    console.log(
      "T04_D6_D3_SUSPEND_REQUEST_REVALIDATION=PASS",
    );

    console.log(
      "T04_D6_D3_REVIEW_REVALIDATION=PASS",
    );

    console.log(
      "T04_D6_D3_INDEPENDENT_REVIEW_REVALIDATION=PASS",
    );

    if (
      MODE ===
        "PRECHECK"
    ) {
      console.log(
        "T04_D6_TASK_SUSPEND_PERFORMED=NO",
      );

      console.log(
        "T04_D6_RECEIPT_WRITE_PERFORMED=NO",
      );

      console.log(
        "T04_D6_PRECHECK=PASS",
      );

      commandComplete =
        true;
    } else {
      const originalFetch =
        globalThis.fetch.bind(
          globalThis,
        );

      const expectedSuspendUrl =
        API_BASE.replace(
          /\/+$/,
          "",
        ) +
        T04_TASK_SUSPEND_PATH +
        `?id=${encodeURIComponent(
          String(
            EXPECTED_TASK_ID,
          ),
        )}`;

      const mutationFetch:
        typeof fetch =
        async (
          request,
          init,
        ) => {
          const method =
            String(
              init?.method ??
                "GET",
            ).toUpperCase();

          const url =
            request.toString();

          if (
            method ===
              "POST"
          ) {
            if (
              url !==
                expectedSuspendUrl
            ) {
              throw new Error(
                `T04 D6 refused an unexpected physical POST target: ${url}`,
              );
            }

            if (
              String(
                init?.body ??
                  "",
              ) !==
                JSON.stringify(
                  T04_SUSPEND_BODY,
                )
            ) {
              throw new Error(
                "T04 D6 intercepted POST body differs from frozen LeaveInQueue=true body.",
              );
            }

            if (
              physicalSuspendRequestCount !==
                0
            ) {
              throw new Error(
                "T04 D6 refused a second physical suspend request before dispatch.",
              );
            }

            physicalSuspendRequestCount +=
              1;

            businessDispatchStarted =
              true;

            console.log(
              "T04_D6_TASK_SUSPEND_DISPATCHED=YES",
            );
          }

          return originalFetch(
            request,
            init,
          );
        };

      const result =
        await certifyT04TaskSuspendAction(
          {
            intent,

            actionId:
              ACTION_ID,

            receiptId:
              RECEIPT_ID,

            logicalActor:
              "R5-D frozen T04 Task Suspend invocation",

            irisRuntimeUser:
              USERNAME,
          },
          {
            contract: {
              readFreshPreflight:
                async () =>
                  readFreshPreflight(),

              executeSuspend:
                async () => {
                  const session =
                    actionSession;

                  if (
                    session ===
                      null
                  ) {
                    throw new Error(
                      "T04 D6 action session disappeared before suspend dispatch.",
                    );
                  }

                  console.log(
                    "T04_D6_TASK_SUSPEND_NOW_AUTHORIZED=YES",
                  );

                  console.log(
                    "T04_D6_TASK_SUSPEND_TARGET=/v2/task/suspend?id=1006",
                  );

                  console.log(
                    'T04_D6_TASK_SUSPEND_BODY={"LeaveInQueue":true}',
                  );

                  const mutation =
                    await postT04TaskSuspend({
                      apiBaseUrl:
                        API_BASE,

                      accessToken:
                        session.accessToken,

                      taskId:
                        EXPECTED_TASK_ID,

                      body:
                        T04_SUSPEND_BODY,

                      fetchImpl:
                        mutationFetch,
                    });

                  console.log(
                    `T04_D6_TASK_SUSPEND_STATUS=${mutation.status}`,
                  );

                  console.log(
                    `T04_D6_TRANSPORT_MUTATION_REQUEST_COUNT=${mutation.mutationRequestCount}`,
                  );

                  return mutation;
                },

              collectProofResults:
                async (
                  execution,
                ) => {
                  const reviewed =
                    reviewedPreflight;

                  if (
                    reviewed ===
                      null ||
                    physicalSuspendRequestCount !==
                      1
                  ) {
                    throw new Error(
                      "T04 D6 proof collection requires frozen reviewed State A and exactly one physical suspend POST.",
                    );
                  }

                  const current =
                    await readFreshPreflight();

                  const beforeTask =
                    reviewed.matchingTask;

                  const afterTask =
                    current.matchingTask;

                  const beforeSummary =
                    reviewed.matchingSummary;

                  const afterSummary =
                    current.matchingSummary;

                  if (
                    beforeTask ===
                      null ||
                    afterTask ===
                      null ||
                    beforeSummary ===
                      null ||
                    afterSummary ===
                      null
                  ) {
                    throw new Error(
                      "T04 D6 authoritative poststate is missing task evidence.",
                    );
                  }

                  const fullPoststateVerified =
                    t04PoststateMatches(
                      current,
                      reviewed,
                    );

                  const httpSuspendVerified =
                    execution.httpSuspendResponseVerified &&
                    execution.suspendStatus ===
                      200 &&
                    execution.mutationRequestCount ===
                      1 &&
                    physicalSuspendRequestCount ===
                      1;

                  const configurationPreserved =
                    fullPoststateVerified &&
                    digestCanonicalJson(
                      afterTask,
                    ) ===
                      digestCanonicalJson(
                        beforeTask,
                      );

                  const suspendManagementTransitionVerified =
                    t04TaskHistoryMatchesSingleSuspendTransition(
                      current.matchingHistory,
                      reviewed.matchingHistory,
                      EXPECTED_TASK_ID,
                    );

                  const taskStateVerified =
                    fullPoststateVerified &&
                    beforeSummary.suspended ===
                      false &&
                    suspendManagementTransitionVerified &&
                    current.matchingTaskCount ===
                      1 &&
                    current.expectedTaskId ===
                      reviewed.expectedTaskId &&
                    current.taskInventoryCount ===
                      reviewed.taskInventoryCount &&
                    current.taskManagerStatus ===
                      reviewed.taskManagerStatus &&
                    current.matchingUpcomingCount ===
                      0;

                  const taskHistoryVerified =
                    fullPoststateVerified &&
                    suspendManagementTransitionVerified;

                  stateBDigest =
                    digestCanonicalJson(
                      current,
                    );

                  console.log(
                    `T04_D6_STATE_B_DIGEST=${stateBDigest}`,
                  );

                  console.log(
                    `T04_D6_V2_TASKS_SUSPENDED_SURFACE_ADVISORY=${String(afterSummary.suspended)}`,
                  );

                  if (
                    configurationPreserved
                  ) {
                    console.log(
                      "T04_D6_CONFIGURATION_READBACK=PASS",
                    );
                  }

                  if (
                    taskStateVerified
                  ) {
                    console.log(
                      "T04_D6_SUSPENDED_STATE_TRANSITION=PASS",
                    );
                  }

                  if (
                    taskHistoryVerified
                  ) {
                    console.log(
                      "T04_D6_SUSPEND_MANAGEMENT_HISTORY_TRANSITION=PASS",
                    );
                  }

                  if (
                    httpSuspendVerified
                  ) {
                    console.log(
                      "T04_D6_HTTP_SUSPEND=PASS",
                    );
                  }

                  return buildT04TaskSuspendProofResults({
                    observedAtUtc:
                      new Date().toISOString(),

                    httpSuspendVerified,

                    configurationPreserved,

                    taskStateVerified,

                    taskHistoryVerified,

                    httpSourceReference:
                      httpSuspendVerified
                        ? "IRIS POST /v2/task/suspend?id=1006:200:requests=1:body=LeaveInQueue-true"
                        : null,

                    configurationSourceReference:
                      configurationPreserved
                        ? `IRIS GET /v2/task?id=1006:state-b-digest=${stateBDigest}`
                        : null,

                    taskStateSourceReference:
                      taskStateVerified
                        ? `IRIS GET /v2/task/history?taskId=1006:rows=2:suspended-task-management-transition:state-b-digest=${stateBDigest}`
                        : null,

                    taskHistorySourceReference:
                      taskHistoryVerified
                        ? "IRIS GET /v2/task/history?taskId=1006:rows=2:create-plus-suspended-task-management:no-execution-row"
                        : null,
                  });
                },
            },

            certification: {
              nowUtc:
                () =>
                  new Date().toISOString(),

              reviewPreflight:
                async (
                  review,
                ) => {
                  const session =
                    runtimeSession;

                  if (
                    session ===
                      null
                  ) {
                    throw new Error(
                      "T04 D6 runtime session disappeared during review.",
                    );
                  }

                  if (
                    !t04PrestateMatches(
                      review.preflight,
                    ) ||
                    review.impact.certainty !==
                      "KNOWN" ||
                    review.expectedDelta.summary !==
                      T04_TASK_SUSPEND_DELTA_SUMMARY
                  ) {
                    throw new Error(
                      "T04 D6 generic runner review does not match the frozen suspend contract.",
                    );
                  }

                  assertD3FrozenAuthority(
                    review.preflight,
                  );

                  const reviewTargetHistory =
                    await readTargetActionHistory({
                      baseUrl:
                        HISTORY_BASE,

                      accessToken:
                        session.accessToken,

                      targetCanonicalId:
                        T04_TASK_TARGET_CANONICAL_ID,
                    });

                  if (
                    reviewTargetHistory.length !==
                      0
                  ) {
                    throw new Error(
                      "T04 D6 review observed an unexpected pre-existing T04 receipt.",
                    );
                  }

                  const d3StateADigest =
                    digestCanonicalJson(
                      d3StateAMaterial(
                        review.preflight,
                      ),
                    );

                  const d3ReviewDigest =
                    digestCanonicalJson(
                      d3ReviewMaterial(
                        d3StateADigest,
                      ),
                    );

                  const d3IndependentReviewDigest =
                    digestCanonicalJson(
                      d3IndependentReviewMaterial(
                        review.preflight,
                        d3StateADigest,
                        d3ReviewDigest,
                      ),
                    );

                  if (
                    d3StateADigest !==
                      EXPECTED_STATE_A_DIGEST ||
                    d3ReviewDigest !==
                      EXPECTED_REVIEW_DIGEST ||
                    d3IndependentReviewDigest !==
                      EXPECTED_INDEPENDENT_REVIEW_DIGEST
                  ) {
                    throw new Error(
                      "T04 D6 generic review does not reproduce the independent D3 authority packet.",
                    );
                  }

                  reviewedPreflight =
                    review.preflight;

                  console.log(
                    `T04_D6_REVIEWED_GENERIC_PREFLIGHT_DIGEST=${review.preflightDigest}`,
                  );

                  console.log(
                    `T04_D6_RECOMPUTED_D3_STATE_A_DIGEST=${d3StateADigest}`,
                  );

                  console.log(
                    `T04_D6_RECOMPUTED_D3_REVIEW_DIGEST=${d3ReviewDigest}`,
                  );

                  console.log(
                    `T04_D6_RECOMPUTED_D3_INDEPENDENT_REVIEW_DIGEST=${d3IndependentReviewDigest}`,
                  );

                  console.log(
                    "T04_D6_D3_REVIEW_BINDING=PASS",
                  );

                  console.log(
                    "T04_D6_REVIEWED_DELTA=ONE_SUSPEND_TRANSITION_ONLY",
                  );

                  console.log(
                    "T04_D6_REVIEWED_MUTATION=POST_/v2/task/suspend?id=1006_ONLY",
                  );

                  console.log(
                    "T04_D6_IMPACT_CERTAINTY=KNOWN",
                  );

                  return review.preflightDigest;
                },

              receiptStore: {
                async persist(
                  receipt,
                ) {
                  const session =
                    runtimeSession;

                  if (
                    session ===
                      null
                  ) {
                    throw new Error(
                      "T04 D6 runtime session disappeared before receipt persistence.",
                    );
                  }

                  if (
                    receiptPersistRequestCount !==
                      0
                  ) {
                    throw new Error(
                      "T04 D6 refused a second receipt persistence request.",
                    );
                  }

                  receiptPersistRequestCount +=
                    1;

                  receiptPersistAttempted =
                    true;

                  console.log(
                    "T04_D6_RECEIPT_PERSIST_ATTEMPTED=YES",
                  );

                  const record =
                    buildActionReceiptHistoryRecord(
                      receipt,
                    );

                  const persisted =
                    await persistActionReceiptHistory({
                      baseUrl:
                        HISTORY_BASE,

                      accessToken:
                        session.accessToken,

                      record,
                    });

                  if (
                    persisted.status !==
                      "CREATED" ||
                    persisted.record.receiptId !==
                      receipt.receiptId ||
                    persisted.record.receiptSha256 !==
                      receipt.receiptSha256
                  ) {
                    throw new Error(
                      "T04 D6 receipt write acknowledgement does not match the certified receipt.",
                    );
                  }

                  console.log(
                    "T04_D6_RECEIPT_PERSIST_STATUS=CREATED",
                  );
                },

                async read(
                  receiptId,
                ) {
                  const session =
                    runtimeSession;

                  if (
                    session ===
                      null
                  ) {
                    throw new Error(
                      "T04 D6 runtime session disappeared before receipt readback.",
                    );
                  }

                  return actionReceiptV2FromGenericHistory(
                    await readActionReceiptHistory({
                      baseUrl:
                        HISTORY_BASE,

                      accessToken:
                        session.accessToken,

                      receiptId,
                    }),
                  );
                },
              },
            },
          },
        );

      console.log(
        `T04_D6_CERTIFICATION_OUTCOME=${result.outcome}`,
      );

      console.log(
        `T04_D6_FINAL_ACTION_STATE=${result.record.state}`,
      );

      console.log(
        `T04_D6_EVENT_COUNT=${result.events.length}`,
      );

      console.log(
        `T04_D6_PROOF_RESULT_COUNT=${result.proofResults.length}`,
      );

      console.log(
        `T04_D6_CERTIFICATION_REASON=${result.reason ?? "NONE"}`,
      );

      const expectedEventTypes =
        [
          "ACTION_CREATED",
          "PREFLIGHT_STARTED",
          "PREFLIGHT_COMPLETED",
          "REVIEW_ACCEPTED",
          "REVALIDATION_STARTED",
          "REVALIDATION_MATCHED",
          "APPLY_DISPATCH_STARTED",
          "APPLY_RESPONSE_ACCEPTED",
          "VERIFY_STARTED",
          "EVIDENCE_RECORDED",
          "EVIDENCE_RECORDED",
          "EVIDENCE_RECORDED",
          "EVIDENCE_RECORDED",
          "EVIDENCE_COMPLETE",
          "RECEIPT_WRITE_STARTED",
          "RECEIPT_PERSISTED",
          "RECEIPT_READBACK_VERIFIED",
          "ACTION_VERIFIED",
        ];

      if (
        result.outcome !==
          "VERIFIED" ||
        result.record.state !==
          "VERIFIED" ||
        result.receipt ===
          null ||
        result.events.length !==
          expectedEventTypes.length ||
        JSON.stringify(
          result.events.map(
            (
              event,
            ) =>
              event.eventType,
          ),
        ) !==
          JSON.stringify(
            expectedEventTypes,
          ) ||
        result.proofResults.length !==
          4 ||
        !result.proofResults.every(
          (
            item,
          ) =>
            item.status ===
              "PASS",
        ) ||
        physicalSuspendRequestCount !==
          1 ||
        receiptPersistRequestCount !==
          1 ||
        reviewedPreflight ===
          null ||
        stateBDigest.length !==
          64
      ) {
        throw new Error(
          `T04 D6 generic certification did not close VERIFIED. Reason=${result.reason ?? "none"}`,
        );
      }

      if (
        result.receipt.receiptId !==
          RECEIPT_ID ||
        result.receipt.actionId !==
          ACTION_ID ||
        result.receipt.contractId !==
          T04_TASK_SUSPEND_CONTRACT_ID ||
        result.receipt.contractVersion !==
          2 ||
        result.receipt.target.canonicalId !==
          T04_TASK_TARGET_CANONICAL_ID ||
        result.receipt.proofResults.length !==
          4 ||
        result.receipt.recovery.class !==
          "REVERSIBLE" ||
        result.receipt.recovery.available !==
          true ||
        result.receipt.recovery.recoveryActionType !==
          "TASK_RESUME"
      ) {
        throw new Error(
          "T04 D6 receipt identity/contract/proof/recovery binding differs from the frozen T04 action.",
        );
      }

      const secondReadback =
        actionReceiptV2FromGenericHistory(
          await readActionReceiptHistory({
            baseUrl:
              HISTORY_BASE,

            accessToken:
              runtimeSession.accessToken,

            receiptId:
              RECEIPT_ID,
          }),
        );

      assertExactReceiptReadback(
        result.receipt,
        secondReadback,
      );

      const targetHistoryAfter =
        await readTargetActionHistory({
          baseUrl:
            HISTORY_BASE,

          accessToken:
            runtimeSession.accessToken,

          targetCanonicalId:
            T04_TASK_TARGET_CANONICAL_ID,
        });

      if (
        !sameReceiptSet(
          targetHistoryAfter,
          [
            RECEIPT_ID,
          ],
        )
      ) {
        throw new Error(
          "T04 D6 target history does not contain exactly the new T04 receipt after certification.",
        );
      }

      await readAndVerifyPredecessors(
        runtimeSession.accessToken,
      );

      const finalStateB =
        await readFreshPreflight();

      if (
        reviewedPreflight ===
          null ||
        !t04PoststateMatches(
          finalStateB,
          reviewedPreflight,
        ) ||
        digestCanonicalJson(
          finalStateB,
        ) !==
          stateBDigest
      ) {
        throw new Error(
          "T04 D6 State B changed during receipt persistence/readback.",
        );
      }

      certificationFullyClosed =
        true;

      console.log(
        `T04_D6_RECEIPT_SHA256=${result.receipt.receiptSha256}`,
      );

      console.log(
        `T04_D6_RECEIPT_TERMINAL_EVENT_HASH=${result.receipt.terminalEventHash}`,
      );

      console.log(
        `T04_D6_RECEIPT_EXECUTION_DIGEST=${result.receipt.executionDigest}`,
      );

      console.log(
        `T04_D6_RECEIPT_EVIDENCE_DIGEST=${result.receipt.evidenceDigest}`,
      );

      console.log(
        "T04_D6_GENERIC_RECEIPT_EXACT_READBACK=PASS",
      );

      console.log(
        "T04_D6_GENERIC_RECEIPT_SECOND_FRESH_READBACK=PASS",
      );

      console.log(
        "T04_D6_TARGET_HISTORY_POSTSTATE_COUNT=1",
      );

      console.log(
        "T04_D6_ALL_PREDECESSOR_RECEIPTS_UNCHANGED=PASS",
      );

      console.log(
        "T04_D6_ACTION_VERIFIED_AFTER_READBACK_ONLY=PASS",
      );

      console.log(
        "T04_D6_FIXTURE_PRESERVED_IN_VERIFIED_SUSPENDED_STATE=YES",
      );

      console.log(
        "T04_D6_TASK_RESUME_PERFORMED=NO",
      );

      console.log(
        "T04_D6_FIXTURE_DELETE_PERFORMED=NO",
      );

      commandComplete =
        true;
    }
  }
  finally {
    if (
      businessDispatchStarted &&
      !certificationFullyClosed
    ) {
      console.log(
        "T04_D6_POST_DISPATCH_FORENSIC_STATE_PRESERVED=YES",
      );

      console.log(
        "T04_D6_AUTOMATIC_RETRY_AFTER_FAILED_DISPATCH=NO",
      );

      console.log(
        "T04_D6_AUTOMATIC_RECOVERY_AFTER_FAILED_DISPATCH=NO",
      );

      console.log(
        "T04_D6_AUTOMATIC_TASK_RESUME_AFTER_FAILED_DISPATCH=NO",
      );

      console.log(
        "T04_D6_AUTOMATIC_FIXTURE_DELETE_AFTER_FAILED_DISPATCH=NO",
      );

      console.log(
        `T04_D6_RECEIPT_PERSIST_MAY_REQUIRE_RECONCILIATION=${receiptPersistAttempted ? "YES" : "NO"}`,
      );
    }

    console.log(
      `T04_D6_TASK_SUSPEND_REQUEST_COUNT_FINAL=${physicalSuspendRequestCount}`,
    );

    console.log(
      `T04_D6_RECEIPT_PERSIST_REQUEST_COUNT_FINAL=${receiptPersistRequestCount}`,
    );

    if (
      actionSession !==
        null
    ) {
      await logoutIris({
        baseUrl:
          API_BASE,

        accessToken:
          actionSession.accessToken,
      });

      console.log(
        "T04_D6_ACTION_ESCALATION_LOGOUT=PASS",
      );
    }

    if (
      runtimeSession !==
        null
    ) {
      await logoutIris({
        baseUrl:
          API_BASE,

        accessToken:
          runtimeSession.accessToken,
      });

      console.log(
        "T04_D6_RUNTIME_LOGOUT=PASS",
      );
    }

    console.log(
      "T04_D6_RUNTIME_PASSWORD_STORED=NO",
    );

    console.log(
      "T04_D6_ACTION_ESCALATION_JWT_STORED=NO",
    );

    console.log(
      "T04_D6_RUNTIME_JWT_STORED=NO",
    );

    console.log(
      `T04_D6_COMMAND_COMPLETE=${commandComplete ? "YES" : "NO"}`,
    );
  }

  if (
    MODE ===
      "EXECUTE"
  ) {
    if (
      !certificationFullyClosed ||
      !commandComplete ||
      physicalSuspendRequestCount !==
        1 ||
      receiptPersistRequestCount !==
        1
    ) {
      throw new Error(
        "T04 D6 did not reach genuine generic-runner verified receipt closure.",
      );
    }

    console.log(
      "T04_D6_GENERIC_RUNNER_CERTIFICATION=PASS",
    );

    console.log(
      "T04_D6_RECEIPT_15_DURABLE_CLOSURE=PASS",
    );
  } else {
    if (
      !commandComplete ||
      physicalSuspendRequestCount !==
        0 ||
      receiptPersistRequestCount !==
        0
    ) {
      throw new Error(
        "T04 D6 PRECHECK performed an unauthorized mutation.",
      );
    }
  }
}
