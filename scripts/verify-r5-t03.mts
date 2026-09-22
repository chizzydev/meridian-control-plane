import {
  readFileSync,
} from "node:fs";

import {
  digestCanonicalJson,
} from "../src/lib/proof/digest";

import {
  T03_RUN_NOW_BODY,
  T03_TASK_CLASS,
  T03_TASK_NAME,
  T03_TASK_ROLE,
  T03_TASK_RUN_PATH,
  listT03Tasks,
  loginT03TaskSession,
  postT03TaskRunNow,
  readT03Task,
  readT03TaskHistory,
  readT03TaskInfo,
  readT03TaskManagerStatus,
  readT03UpcomingTasks,
  t03TaskDefinition,
  type T03EscalatedSession,
} from "../src/lib/iris/task-run-now-action-transport";

import {
  T03_TASK_RUN_NOW_CONTRACT_ID,
  T03_TASK_RUN_NOW_DELTA_SUMMARY,
  T03_TASK_TARGET_CANONICAL_ID,
  buildT03TaskRunNowProofResults,
  certifyT03TaskRunNowAction,
  t03PoststateMatches,
  t03PrestateMatches,
  t03TaskHistoryMatchesSingleSuccessfulRun,
  t03TaskRunNowIntent,
  t03TaskSnapshotsEqual,
  type T03TaskRunNowPreflight,
} from "../src/lib/actions/tasks/task-run-now";

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
  process.env.MERIDIAN_R5_C_T03_LIVE_RUN_ALLOWED ===
  "YES";

const MODE =
  process.env.MERIDIAN_R5_C_T03_MODE ??
  "PRECHECK";

const FIXTURE_GENERATION =
  "8f68f2e9-6a9c-44ac-a109-e7066a068584";

const EXPECTED_TASK_ID =
  1005 as const;

const EXPECTED_DEFINITION_DIGEST =
  "A77ED2DC7315D13659DDE49A13BD43772325BD037A82718DA773A9725C09A30C";

const EXPECTED_C3_STATE_A_DIGEST =
  "0487154534CA8854BA588F279D74DE68F47659685E52177B9148929F647D5110";

const EXPECTED_C3_RUN_REQUEST_DIGEST =
  "B7B4956ED2DFADD442B88B618C1280BBE0A5CF0151189D4D6F2F65521E6DBD4D";

const EXPECTED_C3_REVIEW_DIGEST =
  "80B82473E90C55534C6C223FA3C1CFCD6BA134A5883FE3374AFBFC15FF99670C";

const EXPECTED_CLASS_SOURCE_SHA256 =
  "A7DBF3D3FE07143C2CB07CC117CEE825D63615E42A6B2A67FF50CCAFD1B9EE75";

const ACTION_ID =
  "t03-task-run-now-r5-c-001";

const RECEIPT_ID =
  "meridian-t03-task-run-now-r5-c-001";

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

function frozenRunRequestDigest():
  string {
  return digestCanonicalJson(
    Object.freeze({
      operation:
        "POST /v2/task/run" as const,

      requiredAuthority:
        "%Admin_Task:U" as const,

      authorityRole:
        T03_TASK_ROLE,

      query:
        Object.freeze({
          id:
            EXPECTED_TASK_ID,
        }),

      body:
        T03_RUN_NOW_BODY,

      automaticRetryAllowed:
        false as const,
    }),
  );
}

function c3ProjectedStateA(
  preflight:
    T03TaskRunNowPreflight,
): Readonly<Record<string, unknown>> {
  const task =
    preflight.matchingTask;

  const summary =
    preflight.matchingSummary;

  const info =
    preflight.matchingInfo;

  if (
    task ===
      null ||
    summary ===
      null ||
    info ===
      null
  ) {
    throw new Error(
      "T03 C4C cannot project C3 State A from a missing product preflight component.",
    );
  }

  return Object.freeze({
    id:
      EXPECTED_TASK_ID,

    name:
      task.name,

    runAsUser:
      task.runAsUser,

    priority:
      task.priority,

    taskClass:
      task.taskClass,

    namespace:
      task.namespace,

    timePeriod:
      task.timePeriod,

    description:
      task.description,

    suspended:
      summary.suspended,

    lastFinished:
      summary.lastFinished,

    nextScheduled:
      summary.nextScheduled,

    infoLastSchedule:
      info.lastSchedule,

    infoLastStarted:
      info.lastStarted,

    infoLastFinished:
      info.lastFinished,

    infoStatus:
      info.status,

    infoError:
      info.error,

    historyCount:
      preflight.matchingHistoryCount,

    upcomingCount:
      preflight.matchingUpcomingCount,
  });
}

function c3ReviewDigest(
  stateADigest:
    string,
): string {
  const requestDigest =
    frozenRunRequestDigest();

  return digestCanonicalJson(
    Object.freeze({
      schemaVersion:
        "meridian.t03-run-now-review.v1" as const,

      taskId:
        EXPECTED_TASK_ID,

      generation:
        FIXTURE_GENERATION,

      taskName:
        T03_TASK_NAME,

      taskClass:
        T03_TASK_CLASS,

      classNamespace:
        "%SYS" as const,

      classSourceSha256:
        EXPECTED_CLASS_SOURCE_SHA256,

      runAsUser:
        "meridian.runtime" as const,

      operation:
        "POST /v2/task/run" as const,

      requiredAuthority:
        "%Admin_Task:U" as const,

      authorityRole:
        T03_TASK_ROLE,

      requestQuery:
        Object.freeze({
          id:
            EXPECTED_TASK_ID,
        }),

      requestBody:
        T03_RUN_NOW_BODY,

      requestDigest,

      expectedDefinitionDigest:
        EXPECTED_DEFINITION_DIGEST,

      expectedStateADigest:
        stateADigest,

      expectedTaskInventoryCount:
        17 as const,

      expectedHistoryCount:
        1 as const,

      expectedUpcomingCount:
        0 as const,

      expectedManagerStatus:
        "Running" as const,

      expectedNeverStarted:
        true as const,

      expectedNeverFinished:
        true as const,

      automaticRetryAllowed:
        false as const,
    }),
  );
}

function assertC3FrozenAuthority(
  preflight:
    T03TaskRunNowPreflight,
): void {
  if (
    !t03PrestateMatches(
      preflight,
    )
  ) {
    throw new Error(
      "T03 C4C product preflight no longer matches the exact inert State A contract.",
    );
  }

  const definitionDigest =
    digestCanonicalJson(
      t03TaskDefinition(
        FIXTURE_GENERATION,
      ),
    );

  const stateADigest =
    digestCanonicalJson(
      c3ProjectedStateA(
        preflight,
      ),
    );

  const requestDigest =
    frozenRunRequestDigest();

  const reviewDigest =
    c3ReviewDigest(
      stateADigest,
    );

  if (
    definitionDigest !==
      EXPECTED_DEFINITION_DIGEST ||
    stateADigest !==
      EXPECTED_C3_STATE_A_DIGEST ||
    requestDigest !==
      EXPECTED_C3_RUN_REQUEST_DIGEST ||
    reviewDigest !==
      EXPECTED_C3_REVIEW_DIGEST ||
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
      "T03 C4C failed to reproduce the frozen C3 authority packet.",
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
        `T03 C4C historical predecessor changed: ${predecessor.receiptId}.`,
      );
    }

    console.log(
      `T03_C4C_PREDECESSOR_RECEIPT_SHA256=${receipt.receiptId}|${receipt.receiptSha256}`,
    );
  }
}

if (
  USERNAME !==
    "meridian.runtime"
) {
  throw new Error(
    "T03 C4C is pinned to meridian.runtime.",
  );
}

if (
  MODE !==
    "PRECHECK" &&
  MODE !==
    "EXECUTE"
) {
  throw new Error(
    "T03 C4C mode must be PRECHECK or EXECUTE.",
  );
}

if (
  !LIVE_GATE
) {
  console.log(
    "===== MERIDIAN R5-C4C CLOSED LIVE GATE =====",
  );

  console.log(
    "T03_C4C_LIVE_GATE=DENIED",
  );

  console.log(
    "T03_C4C_IRIS_CONNECTION_PERFORMED=NO",
  );

  console.log(
    "T03_C4C_TASK_RUN_PERFORMED=NO",
  );

  console.log(
    "T03_C4C_RECEIPT_WRITE_PERFORMED=NO",
  );

  console.log(
    "T03_C4C_LIVE_VERIFIER_ARMED=YES",
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
      "T03 C4C runtime password is missing from ephemeral stdin.",
    );
  }

  let runtimeSession:
    IrisSession |
    null =
      null;

  let taskSession:
    T03EscalatedSession |
    null =
      null;

  let reviewedPreflight:
    T03TaskRunNowPreflight |
    null =
      null;

  let physicalRunRequestCount =
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

  try {
    console.log(
      "===== MERIDIAN R5-C4C LIVE VERIFIER =====",
    );

    console.log(
      `T03_C4C_MODE=${MODE}`,
    );

    console.log(
      "T03_C4C_FIXTURE_POST_AUTHORIZED=NO",
    );

    console.log(
      `T03_C4C_TASK_RUN_AUTHORIZED=${MODE === "EXECUTE" ? "YES" : "NO"}`,
    );

    console.log(
      "T03_C4C_TASK_RUN_MAXIMUM=1",
    );

    console.log(
      "T03_C4C_FIXTURE_DELETE_AUTHORIZED=NO",
    );

    console.log(
      `T03_C4C_RECEIPT_WRITE_AUTHORIZED=${MODE === "EXECUTE" ? "YES" : "NO"}`,
    );

    console.log(
      "T03_C4C_AUTOMATIC_RETRY_AUTHORIZED=NO",
    );

    console.log(
      "T03_C4C_AUTOMATIC_ROLLBACK_AUTHORIZED=NO",
    );

    console.log(
      `T03_C4C_CONTRACT_ID=${T03_TASK_RUN_NOW_CONTRACT_ID}`,
    );

    console.log(
      `T03_C4C_EXPECTED_TASK_ID=${EXPECTED_TASK_ID}`,
    );

    console.log(
      `T03_C4C_EXPECTED_GENERATION=${FIXTURE_GENERATION}`,
    );

    console.log(
      `T03_C4C_EXPECTED_C3_STATE_A_DIGEST=${EXPECTED_C3_STATE_A_DIGEST}`,
    );

    console.log(
      `T03_C4C_EXPECTED_C3_RUN_REQUEST_DIGEST=${EXPECTED_C3_RUN_REQUEST_DIGEST}`,
    );

    console.log(
      `T03_C4C_EXPECTED_C3_REVIEW_DIGEST=${EXPECTED_C3_REVIEW_DIGEST}`,
    );

    console.log(
      `T03_C4C_RECEIPT_ID=${RECEIPT_ID}`,
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
      "T03_C4C_RUNTIME_LOGIN_HTTP=200",
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
        "T03 C4C pinned runtime identity/version guard failed.",
      );
    }

    console.log(
      "T03_C4C_RUNTIME_IDENTITY_VERSION=PASS",
    );

    taskSession =
      await loginT03TaskSession({
        apiBaseUrl:
          API_BASE,

        username:
          "meridian.runtime",

        password,
      });

    console.log(
      "T03_C4C_EXPLICIT_TASK_ESCALATION_LOGIN_HTTP=200",
    );

    console.log(
      `T03_C4C_AUTHORITY_ROLE=${T03_TASK_ROLE}`,
    );

    console.log(
      "T03_C4C_STANDING_RUNTIME_AUTHORITY_BROADENED=NO",
    );

    await readAndVerifyPredecessors(
      runtimeSession.accessToken,
    );

    console.log(
      `T03_C4C_PREDECESSOR_RECEIPT_COUNT=${PREDECESSORS.length}`,
    );

    console.log(
      "T03_C4C_ALL_PREDECESSOR_RECEIPTS_PRECHECK=PASS",
    );

    const targetHistoryBefore =
      await readTargetActionHistory({
        baseUrl:
          HISTORY_BASE,

        accessToken:
          runtimeSession.accessToken,

        targetCanonicalId:
          T03_TASK_TARGET_CANONICAL_ID,
      });

    if (
      targetHistoryBefore.length !==
        0
    ) {
      throw new Error(
        "T03 C4C requires zero pre-existing T03 receipts.",
      );
    }

    console.log(
      "T03_C4C_TARGET_HISTORY_PRESTATE_COUNT=0",
    );

    const definition =
      t03TaskDefinition(
        FIXTURE_GENERATION,
      );

    if (
      digestCanonicalJson(
        definition,
      ) !==
        EXPECTED_DEFINITION_DIGEST ||
      frozenRunRequestDigest() !==
        EXPECTED_C3_RUN_REQUEST_DIGEST
    ) {
      throw new Error(
        "T03 C4C frozen definition/run-request boundary changed.",
      );
    }

    const intent =
      t03TaskRunNowIntent(
        FIXTURE_GENERATION,
        EXPECTED_TASK_ID,
      );

    const readFreshPreflight =
      async (): Promise<T03TaskRunNowPreflight> => {
        const session =
          taskSession;

        if (
          session ===
            null
        ) {
          throw new Error(
            "T03 C4C task escalation session is unavailable.",
          );
        }

        const [
          tasks,
          upcoming,
          manager,
        ] =
          await Promise.all([
            listT03Tasks({
              apiBaseUrl:
                API_BASE,

              accessToken:
                session.accessToken,
            }),

            readT03UpcomingTasks({
              apiBaseUrl:
                API_BASE,

              accessToken:
                session.accessToken,
            }),

            readT03TaskManagerStatus({
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
                T03_TASK_NAME,
          );

        let task:
          Awaited<
            ReturnType<
              typeof readT03Task
            >
          > =
          null;

        let summary:
          T03TaskRunNowPreflight[
            "matchingSummary"
          ] =
          null;

        let info:
          T03TaskRunNowPreflight[
            "matchingInfo"
          ] =
          null;

        let history:
          T03TaskRunNowPreflight[
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
              "T03 C4C exact-name inventory row has no positive id.",
            );
          }

          summary =
            only;

          [
            task,
            history,
            info,
          ] =
            await Promise.all([
              readT03Task({
                apiBaseUrl:
                  API_BASE,

                accessToken:
                  session.accessToken,

                taskId:
                  only.id,
              }),

              readT03TaskHistory({
                apiBaseUrl:
                  API_BASE,

                accessToken:
                  session.accessToken,

                taskId:
                  only.id,
              }),

              readT03TaskInfo({
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
                T03_TASK_NAME ||
              row.id ===
                EXPECTED_TASK_ID,
          );

        return Object.freeze({
          schemaVersion:
            "meridian.task-run-now-preflight.v1" as const,

          expectedFixtureGeneration:
            FIXTURE_GENERATION,

          taskName:
            T03_TASK_NAME,

          expectedTaskId:
            EXPECTED_TASK_ID,

          expectedDefinitionDigest:
            EXPECTED_DEFINITION_DIGEST,

          authorizedRunRequestDigest:
            EXPECTED_C3_RUN_REQUEST_DIGEST,

          matchingTaskCount:
            matches.length,

          matchingTask:
            task,

          matchingSummary:
            summary,

          matchingInfo:
            info,

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
            "POST /v2/task/run" as const,

          requiredAuthority:
            "%Admin_Task:U" as const,

          authorityRole:
            T03_TASK_ROLE,

          authorityMode:
            "EXPLICIT_ESCALATION_ROLE" as const,
        });
      };

    const independentPreflight =
      await readFreshPreflight();

    assertC3FrozenAuthority(
      independentPreflight,
    );

    console.log(
      `T03_C4C_GENERIC_PREFLIGHT_DIGEST=${digestCanonicalJson(
        independentPreflight,
      )}`,
    );

    console.log(
      "T03_C4C_C3_STATE_A_PRECHECK=PASS",
    );

    console.log(
      "T03_C4C_C3_RUN_REQUEST_REVALIDATION=PASS",
    );

    console.log(
      "T03_C4C_C3_REVIEW_REVALIDATION=PASS",
    );

    if (
      MODE ===
        "PRECHECK"
    ) {
      console.log(
        "T03_C4C_TASK_RUN_PERFORMED=NO",
      );

      console.log(
        "T03_C4C_RECEIPT_WRITE_PERFORMED=NO",
      );

      console.log(
        "T03_C4C_PRECHECK=PASS",
      );

      commandComplete =
        true;
    } else {
      const originalFetch =
        globalThis.fetch.bind(
          globalThis,
        );

      const expectedRunUrl =
        API_BASE.replace(
          /\/+$/,
          "",
        ) +
        T03_TASK_RUN_PATH +
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
                expectedRunUrl
            ) {
              throw new Error(
                `T03 C4C refused an unexpected physical POST target: ${url}`,
              );
            }

            if (
              String(
                init?.body ??
                  "",
              ) !==
                JSON.stringify(
                  T03_RUN_NOW_BODY,
                )
            ) {
              throw new Error(
                "T03 C4C intercepted POST body differs from frozen RunNow=true body.",
              );
            }

            if (
              physicalRunRequestCount !==
                0
            ) {
              throw new Error(
                "T03 C4C refused a second physical Run Now request before dispatch.",
              );
            }

            physicalRunRequestCount +=
              1;

            businessDispatchStarted =
              true;

            console.log(
              "T03_C4C_TASK_RUN_DISPATCHED=YES",
            );
          }

          return originalFetch(
            request,
            init,
          );
        };

      const result =
        await certifyT03TaskRunNowAction(
          {
            intent,

            actionId:
              ACTION_ID,

            receiptId:
              RECEIPT_ID,

            logicalActor:
              "R5-C frozen T03 Run Now invocation",

            irisRuntimeUser:
              USERNAME,
          },
          {
            contract: {
              readFreshPreflight:
                async () =>
                  readFreshPreflight(),

              executeRunNow:
                async () => {
                  const session =
                    taskSession;

                  if (
                    session ===
                      null
                  ) {
                    throw new Error(
                      "T03 C4C task session disappeared before Run Now dispatch.",
                    );
                  }

                  console.log(
                    "T03_C4C_TASK_RUN_NOW_AUTHORIZED=YES",
                  );

                  console.log(
                    "T03_C4C_TASK_RUN_TARGET=/v2/task/run?id=1005",
                  );

                  console.log(
                    'T03_C4C_TASK_RUN_BODY={"RunNow":true}',
                  );

                  const mutation =
                    await postT03TaskRunNow({
                      apiBaseUrl:
                        API_BASE,

                      accessToken:
                        session.accessToken,

                      taskId:
                        EXPECTED_TASK_ID,

                      body:
                        T03_RUN_NOW_BODY,

                      fetchImpl:
                        mutationFetch,
                    });

                  console.log(
                    `T03_C4C_TASK_RUN_STATUS=${mutation.status}`,
                  );

                  console.log(
                    `T03_C4C_TRANSPORT_MUTATION_REQUEST_COUNT=${mutation.mutationRequestCount}`,
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
                    physicalRunRequestCount !==
                      1
                  ) {
                    throw new Error(
                      "T03 C4C proof collection requires frozen reviewed State A and exactly one physical Run Now POST.",
                    );
                  }

                  const current =
                    await readFreshPreflight();

                  const before =
                    reviewed.matchingTask;

                  const after =
                    current.matchingTask;

                  const afterInfo =
                    current.matchingInfo;

                  if (
                    before ===
                      null ||
                    after ===
                      null ||
                    afterInfo ===
                      null
                  ) {
                    throw new Error(
                      "T03 C4C authoritative poststate is missing task or task-info evidence.",
                    );
                  }

                  const fullPoststateVerified =
                    t03PoststateMatches(
                      current,
                      reviewed,
                    );

                  const httpRunVerified =
                    execution.httpRunResponseVerified &&
                    execution.runStatus ===
                      200 &&
                    execution.mutationRequestCount ===
                      1 &&
                    physicalRunRequestCount ===
                      1;

                  const configurationPreserved =
                    fullPoststateVerified &&
                    t03TaskSnapshotsEqual(
                      before,
                      after,
                    );

                  const taskStateVerified =
                    fullPoststateVerified &&
                    current.matchingTaskCount ===
                      1 &&
                    current.expectedTaskId ===
                      reviewed.expectedTaskId &&
                    current.taskInventoryCount ===
                      reviewed.taskInventoryCount &&
                    current.taskManagerStatus ===
                      reviewed.taskManagerStatus &&
                    current.matchingUpcomingCount ===
                      0 &&
                    afterInfo.lastStarted.trim().length >
                      0 &&
                    afterInfo.lastFinished.trim().length >
                      0 &&
                    afterInfo.status ===
                      "1" &&
                    afterInfo.error.trim().toLowerCase() ===
                      "success";

                  const taskHistoryVerified =
                    fullPoststateVerified &&
                    t03TaskHistoryMatchesSingleSuccessfulRun(
                      current.matchingHistory,
                      reviewed.matchingHistory,
                      EXPECTED_TASK_ID,
                    );

                  stateBDigest =
                    digestCanonicalJson(
                      current,
                    );

                  const latestHistory =
                    current.matchingHistory[
                      current.matchingHistory.length -
                        1
                    ];

                  console.log(
                    `T03_C4C_STATE_B_DIGEST=${stateBDigest}`,
                  );

                  if (
                    configurationPreserved
                  ) {
                    console.log(
                      "T03_C4C_CONFIGURATION_READBACK=PASS",
                    );
                  }

                  if (
                    taskStateVerified
                  ) {
                    console.log(
                      "T03_C4C_TASK_INFO_COMPLETION=PASS",
                    );
                  }

                  if (
                    taskHistoryVerified
                  ) {
                    console.log(
                      "T03_C4C_SINGLE_SUCCESS_HISTORY_TRANSITION=PASS",
                    );
                  }

                  if (
                    httpRunVerified
                  ) {
                    console.log(
                      "T03_C4C_HTTP_RUN_NOW=PASS",
                    );
                  }

                  return buildT03TaskRunNowProofResults({
                    observedAtUtc:
                      new Date().toISOString(),

                    httpRunVerified,

                    configurationPreserved,

                    taskStateVerified,

                    taskHistoryVerified,

                    observedHistoryResult:
                      latestHistory?.result ??
                      "",

                    httpSourceReference:
                      httpRunVerified
                        ? "IRIS POST /v2/task/run?id=1005:200:requests=1:body=RunNow-true"
                        : null,

                    configurationSourceReference:
                      configurationPreserved
                        ? `IRIS GET /v2/task?id=1005:state-b-digest=${stateBDigest}`
                        : null,

                    taskStateSourceReference:
                      taskStateVerified
                        ? `IRIS GET /v2/tasks + /v2/task/info?id=1005 + /v2/task/manager + /v2/task/upcoming:state-b-digest=${stateBDigest}`
                        : null,

                    taskHistorySourceReference:
                      taskHistoryVerified
                        ? "IRIS GET /v2/task/history?taskId=1005:rows=2:create-plus-one-success"
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
                      "T03 C4C runtime session disappeared during review.",
                    );
                  }

                  if (
                    !t03PrestateMatches(
                      review.preflight,
                    ) ||
                    review.impact.certainty !==
                      "KNOWN" ||
                    review.expectedDelta.summary !==
                      T03_TASK_RUN_NOW_DELTA_SUMMARY
                  ) {
                    throw new Error(
                      "T03 C4C generic runner review does not match the frozen Run Now contract.",
                    );
                  }

                  assertC3FrozenAuthority(
                    review.preflight,
                  );

                  const reviewTargetHistory =
                    await readTargetActionHistory({
                      baseUrl:
                        HISTORY_BASE,

                      accessToken:
                        session.accessToken,

                      targetCanonicalId:
                        T03_TASK_TARGET_CANONICAL_ID,
                    });

                  if (
                    reviewTargetHistory.length !==
                      0
                  ) {
                    throw new Error(
                      "T03 C4C review observed an unexpected pre-existing T03 receipt.",
                    );
                  }

                  const c3StateADigest =
                    digestCanonicalJson(
                      c3ProjectedStateA(
                        review.preflight,
                      ),
                    );

                  const computedC3ReviewDigest =
                    c3ReviewDigest(
                      c3StateADigest,
                    );

                  if (
                    c3StateADigest !==
                      EXPECTED_C3_STATE_A_DIGEST ||
                    computedC3ReviewDigest !==
                      EXPECTED_C3_REVIEW_DIGEST
                  ) {
                    throw new Error(
                      "T03 C4C generic review does not reproduce the independent C3 authority packet.",
                    );
                  }

                  reviewedPreflight =
                    review.preflight;

                  console.log(
                    `T03_C4C_REVIEWED_GENERIC_PREFLIGHT_DIGEST=${review.preflightDigest}`,
                  );

                  console.log(
                    `T03_C4C_RECOMPUTED_C3_STATE_A_DIGEST=${c3StateADigest}`,
                  );

                  console.log(
                    `T03_C4C_RECOMPUTED_C3_REVIEW_DIGEST=${computedC3ReviewDigest}`,
                  );

                  console.log(
                    "T03_C4C_C3_REVIEW_BINDING=PASS",
                  );

                  console.log(
                    "T03_C4C_REVIEWED_DELTA=ONE_INERT_RUN_ONLY",
                  );

                  console.log(
                    "T03_C4C_REVIEWED_MUTATION=POST_/v2/task/run?id=1005_ONLY",
                  );

                  console.log(
                    "T03_C4C_IMPACT_CERTAINTY=KNOWN",
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
                      "T03 C4C runtime session disappeared before receipt persistence.",
                    );
                  }

                  if (
                    receiptPersistRequestCount !==
                      0
                  ) {
                    throw new Error(
                      "T03 C4C refused a second receipt persistence request.",
                    );
                  }

                  receiptPersistRequestCount +=
                    1;

                  receiptPersistAttempted =
                    true;

                  console.log(
                    "T03_C4C_RECEIPT_PERSIST_ATTEMPTED=YES",
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
                      "T03 C4C receipt write acknowledgement does not match the certified receipt.",
                    );
                  }

                  console.log(
                    "T03_C4C_RECEIPT_PERSIST_STATUS=CREATED",
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
                      "T03 C4C runtime session disappeared before receipt readback.",
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
        `T03_C4C_CERTIFICATION_OUTCOME=${result.outcome}`,
      );

      console.log(
        `T03_C4C_FINAL_ACTION_STATE=${result.record.state}`,
      );

      console.log(
        `T03_C4C_EVENT_COUNT=${result.events.length}`,
      );

      console.log(
        `T03_C4C_PROOF_RESULT_COUNT=${result.proofResults.length}`,
      );

      console.log(
        `T03_C4C_CERTIFICATION_REASON=${result.reason ?? "NONE"}`,
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
        physicalRunRequestCount !==
          1 ||
        receiptPersistRequestCount !==
          1 ||
        reviewedPreflight ===
          null ||
        stateBDigest.length !==
          64
      ) {
        throw new Error(
          `T03 C4C generic certification did not close VERIFIED. Reason=${result.reason ?? "none"}`,
        );
      }

      if (
        result.receipt.receiptId !==
          RECEIPT_ID ||
        result.receipt.actionId !==
          ACTION_ID ||
        result.receipt.contractId !==
          T03_TASK_RUN_NOW_CONTRACT_ID ||
        result.receipt.contractVersion !==
          1 ||
        result.receipt.target.canonicalId !==
          T03_TASK_TARGET_CANONICAL_ID ||
        result.receipt.proofResults.length !==
          4
      ) {
        throw new Error(
          "T03 C4C receipt identity/contract/proof binding differs from the frozen T03 action.",
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
            T03_TASK_TARGET_CANONICAL_ID,
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
          "T03 C4C target history does not contain exactly the new T03 receipt after certification.",
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
        !t03PoststateMatches(
          finalStateB,
          reviewedPreflight,
        ) ||
        digestCanonicalJson(
          finalStateB,
        ) !==
          stateBDigest
      ) {
        throw new Error(
          "T03 C4C State B changed during receipt persistence/readback.",
        );
      }

      certificationFullyClosed =
        true;

      console.log(
        `T03_C4C_RECEIPT_SHA256=${result.receipt.receiptSha256}`,
      );

      console.log(
        `T03_C4C_RECEIPT_TERMINAL_EVENT_HASH=${result.receipt.terminalEventHash}`,
      );

      console.log(
        `T03_C4C_RECEIPT_EXECUTION_DIGEST=${result.receipt.executionDigest}`,
      );

      console.log(
        `T03_C4C_RECEIPT_EVIDENCE_DIGEST=${result.receipt.evidenceDigest}`,
      );

      console.log(
        "T03_C4C_GENERIC_RECEIPT_EXACT_READBACK=PASS",
      );

      console.log(
        "T03_C4C_GENERIC_RECEIPT_SECOND_FRESH_READBACK=PASS",
      );

      console.log(
        "T03_C4C_TARGET_HISTORY_POSTSTATE_COUNT=1",
      );

      console.log(
        "T03_C4C_ALL_PREDECESSOR_RECEIPTS_UNCHANGED=PASS",
      );

      console.log(
        "T03_C4C_ACTION_VERIFIED_AFTER_READBACK_ONLY=PASS",
      );

      console.log(
        "T03_C4C_FIXTURE_PRESERVED_IN_VERIFIED_STATE_B=YES",
      );

      console.log(
        "T03_C4C_FIXTURE_DELETE_PERFORMED=NO",
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
        "T03_C4C_POST_DISPATCH_FORENSIC_STATE_PRESERVED=YES",
      );

      console.log(
        "T03_C4C_AUTOMATIC_RETRY_AFTER_FAILED_DISPATCH=NO",
      );

      console.log(
        "T03_C4C_AUTOMATIC_ROLLBACK_AFTER_FAILED_DISPATCH=NO",
      );

      console.log(
        "T03_C4C_AUTOMATIC_FIXTURE_DELETE_AFTER_FAILED_DISPATCH=NO",
      );

      console.log(
        `T03_C4C_RECEIPT_PERSIST_MAY_REQUIRE_RECONCILIATION=${receiptPersistAttempted ? "YES" : "NO"}`,
      );
    }

    console.log(
      `T03_C4C_TASK_RUN_REQUEST_COUNT_FINAL=${physicalRunRequestCount}`,
    );

    console.log(
      `T03_C4C_RECEIPT_PERSIST_REQUEST_COUNT_FINAL=${receiptPersistRequestCount}`,
    );

    if (
      taskSession !==
        null
    ) {
      await logoutIris({
        baseUrl:
          API_BASE,

        accessToken:
          taskSession.accessToken,
      });

      console.log(
        "T03_C4C_TASK_ESCALATION_LOGOUT=PASS",
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
        "T03_C4C_RUNTIME_LOGOUT=PASS",
      );
    }

    console.log(
      "T03_C4C_RUNTIME_PASSWORD_STORED=NO",
    );

    console.log(
      "T03_C4C_TASK_ESCALATION_JWT_STORED=NO",
    );

    console.log(
      "T03_C4C_RUNTIME_JWT_STORED=NO",
    );

    console.log(
      `T03_C4C_COMMAND_COMPLETE=${commandComplete ? "YES" : "NO"}`,
    );
  }

  if (
    MODE ===
      "EXECUTE"
  ) {
    if (
      !certificationFullyClosed ||
      !commandComplete ||
      physicalRunRequestCount !==
        1 ||
      receiptPersistRequestCount !==
        1
    ) {
      throw new Error(
        "T03 C4C did not reach genuine generic-runner verified receipt closure.",
      );
    }

    console.log(
      "T03_C4C_GENERIC_RUNNER_CERTIFICATION=PASS",
    );

    console.log(
      "T03_C4C_RECEIPT_14_DURABLE_CLOSURE=PASS",
    );
  } else {
    if (
      !commandComplete ||
      physicalRunRequestCount !==
        0 ||
      receiptPersistRequestCount !==
        0
    ) {
      throw new Error(
        "T03 C4C PRECHECK performed an unauthorized mutation.",
      );
    }
  }
}
