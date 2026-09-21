import {
  randomUUID,
} from "node:crypto";

import {
  digestCanonicalJson,
} from "../src/lib/proof/digest";

import {
  T01_TASK_CREATE_DELTA_SUMMARY,
  T01_TASK_TARGET_CANONICAL_ID,
  buildT01TaskCreateProofResults,
  certifyT01TaskCreateAction,
  t01PoststateMatches,
  t01PrestateMatches,
  t01TaskCreateIntent,
  t01TaskHistoryMatchesCreateOnly,
  t01TaskSnapshotMatchesDefinition,
  type T01TaskCreatePreflight,
} from "../src/lib/actions/tasks/task-create";

import {
  T01_TASK_NAME,
  T01_TASK_PATH,
  deleteT01FixtureTask,
  listT01Tasks,
  loginT01TaskSession,
  postT01TaskCreate,
  readT01Task,
  readT01TaskHistory,
  readT01TaskManagerStatus,
  readT01UpcomingTasks,
  t01TaskDefinition,
  type T01EscalatedSession,
} from "../src/lib/iris/task-create-action-transport";

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

const PASSWORD =
  process.env.MERIDIAN_RUNTIME_PASSWORD;

const ACTION_ID =
  "t01-task-create-r5-a-001";

const RECEIPT_ID =
  "meridian-t01-task-create-r5-a-001";

const PREDECESSORS =
  Object.freeze([
    Object.freeze({
      receiptId: "meridian-w01-web-app-create-r3b-a-r9-001",
      sha256: "693B47009BD1B74C3949FA896302AACBFB5DF3397AD9C2A7A46B425CEFC3246F",
    }),
    Object.freeze({
      receiptId: "meridian-w02-web-app-update-r3b-b-001",
      sha256: "DDCDFB0BE1057831040429FBA1EB069C2A352F787C5630ACF2D79C28E2BAE442",
    }),
    Object.freeze({
      receiptId: "meridian-w03-web-app-enable-recovery-r3b-c-r2a-001",
      sha256: "1C3334BBE2AA69ED2197CEF56949D60FA4C7C9402163E91FAFE1849F36C4F603",
    }),
    Object.freeze({
      receiptId: "meridian-w03-web-app-enable-authz-recovery-r3b-c-r2e-001",
      sha256: "6B263F425E2AC4F0A07CBAF0D0D6C5FEC2C5B92F6214E7A09C32768F7B350897",
    }),
    Object.freeze({
      receiptId: "meridian-w03-web-app-enable-r3b-c-r2f-001",
      sha256: "2CD0F67C55F868A4CAFE5312DEFB62BBDBC5A11967453AD994826C824110178D",
    }),
    Object.freeze({
      receiptId: "meridian-w04-web-app-delete-r3b-d-001",
      sha256: "52BE6B4105EE8D2CC660DBDCD749D87D829F416BBD8473CB0EF8A975557E58D8",
    }),
    Object.freeze({
      receiptId: "meridian-p01-role-create-r4-a-001",
      sha256: "0F3F8B06560A9F91B2C20A9EEB59D5D262FD9BEDE905CB04FDD79F441C94407B",
    }),
    Object.freeze({
      receiptId: "meridian-p02-role-delete-r4-b-001",
      sha256: "489001EDF5E18320520C208F4F90468ACD0290184FDFF7D1499C8876FB5DE229",
    }),
    Object.freeze({
      receiptId: "meridian-p03-user-add-role-r4-c-001",
      sha256: "40A6076D54F92EAB8A1D65323D5B06DA3EC11EA4939D540153D7FFD7BD4EF18E",
    }),
    Object.freeze({
      receiptId: "meridian-p05-user-enable-r4-d-001",
      sha256: "C38D0096AE9E642F644FC4B366C61EC332EC2DED0EC6EA0954AB052F91998EE9",
    }),
    Object.freeze({
      receiptId: "meridian-p06-user-disable-r4-e-001",
      sha256: "AFEF0F9D0A9E754DCFC8347899E6913406D694C9D26018ADF77D32F6E6BE0C0A",
    }),
  ]);

function sameReceiptSet(
  actual: readonly {readonly receiptId: string}[],
  expected: readonly string[],
): boolean {
  return (
    actual.length === expected.length &&
    JSON.stringify(
      actual.map((item) => item.receiptId).sort(),
    ) ===
    JSON.stringify([...expected].sort())
  );
}

function exactNameMatches(
  tasks: Awaited<ReturnType<typeof listT01Tasks>>,
) {
  return tasks.filter(
    (task) => task.name === T01_TASK_NAME,
  );
}

const runtimePassword =
  PASSWORD?.trim();

if (
  runtimePassword === undefined ||
  runtimePassword.length === 0
) {
  throw new Error(
    "T01 runtime password is missing.",
  );
}

let runtimeSession:
  Awaited<ReturnType<typeof loginIris>> |
  null =
    null;

let taskSession:
  T01EscalatedSession |
  null =
    null;

let generation =
  "";

let reviewedPreflight:
  T01TaskCreatePreflight |
  null =
    null;

let createdTaskId:
  number |
  null =
    null;

let createLocation =
  "";

let physicalBusinessPostCount =
  0;

let fixtureCleanupDeleteCount =
  0;

let businessDispatchStarted =
  false;

let certificationFullyClosed =
  false;

let fixtureCleanupComplete =
  false;

try {
  runtimeSession = await loginIris({
    baseUrl: API_BASE,
    username: USERNAME,
    password: runtimePassword,
  });

  console.log(
    "T01_RUNTIME_LOGIN_HTTP=200",
  );

  const runtime =
    await readRuntimeInfo({
      baseUrl: API_BASE,
      accessToken: runtimeSession.accessToken,
    });

  if (
    runtime.username !== USERNAME ||
    runtime.apiVersion !== 2 ||
    !runtime.serverVersion.includes("2026.2") ||
    !runtime.serverVersion.includes("Build 221U")
  ) {
    throw new Error(
      "T01 pinned runtime identity/version guard failed.",
    );
  }

  console.log(
    "T01_RUNTIME_IDENTITY_VERSION=PASS",
  );

  taskSession = await loginT01TaskSession({
    apiBaseUrl: API_BASE,
    username: "meridian.runtime",
    password: runtimePassword,
  });

  console.log(
    "T01_EXPLICIT_TASK_ESCALATION_LOGIN_HTTP=200",
  );
  console.log(
    "T01_AUTHORITY_ROLE=MeridianTaskMetadataReader",
  );
  console.log(
    "T01_STANDING_RUNTIME_AUTHORITY_BROADENED=NO",
  );

  for (const predecessor of PREDECESSORS) {
    const receipt =
      actionReceiptV2FromGenericHistory(
        await readActionReceiptHistory({
          baseUrl: HISTORY_BASE,
          accessToken: runtimeSession.accessToken,
          receiptId: predecessor.receiptId,
        }),
      );

    if (receipt.receiptSha256 !== predecessor.sha256) {
      throw new Error(
        `Historical predecessor changed before T01: ${predecessor.receiptId}.`,
      );
    }

    console.log(
      `T01_PREDECESSOR_RECEIPT_SHA256=${receipt.receiptId}|${receipt.receiptSha256}`,
    );
  }

  const targetHistoryBefore =
    await readTargetActionHistory({
      baseUrl: HISTORY_BASE,
      accessToken: runtimeSession.accessToken,
      targetCanonicalId: T01_TASK_TARGET_CANONICAL_ID,
    });

  if (targetHistoryBefore.length !== 0) {
    throw new Error(
      "T01 requires zero historical receipts on the isolated task target before creation.",
    );
  }

  console.log(
    "T01_TARGET_HISTORY_PRESTATE_COUNT=0",
  );
  console.log(
    "T01_ALL_PREDECESSOR_RECEIPTS_PRECHECK=PASS",
  );

  generation = randomUUID();

  const readPreflight =
    async (): Promise<T01TaskCreatePreflight> => {
      const session = taskSession;

      if (session === null) {
        throw new Error(
          "T01 task escalation session is unavailable.",
        );
      }

      const [
        tasks,
        upcoming,
        managerStatus,
      ] = await Promise.all([
        listT01Tasks({
          apiBaseUrl: API_BASE,
          accessToken: session.accessToken,
        }),
        readT01UpcomingTasks({
          apiBaseUrl: API_BASE,
          accessToken: session.accessToken,
        }),
        readT01TaskManagerStatus({
          apiBaseUrl: API_BASE,
          accessToken: session.accessToken,
        }),
      ]);

      const matches = exactNameMatches(tasks);
      const matchingTaskIds = Object.freeze(
        matches.map((task) => task.id).sort((left, right) => left - right),
      );

      let matchingTask = null;
      let matchingHistory:
        T01TaskCreatePreflight["matchingHistory"] =
        Object.freeze([]);

      if (matches.length === 1) {
        const taskId = matches[0]?.id;

        if (taskId === undefined || taskId < 1) {
          throw new Error(
            "T01 exact-name task inventory row has no positive id.",
          );
        }

        matchingTask = await readT01Task({
          apiBaseUrl: API_BASE,
          accessToken: session.accessToken,
          taskId,
        });

        matchingHistory =
          await readT01TaskHistory({
            apiBaseUrl: API_BASE,
            accessToken: session.accessToken,
            taskId,
          });
      }

      const matchingUpcomingCount =
        upcoming.filter(
          (row) =>
            row.name === T01_TASK_NAME ||
            matchingTaskIds.includes(row.id),
        ).length;

      const definition =
        t01TaskDefinition(generation);

      return Object.freeze({
        schemaVersion: "meridian.task-create-preflight.v1" as const,
        expectedFixtureGeneration: generation,
        taskName: T01_TASK_NAME,
        expectedDefinitionDigest:
          digestCanonicalJson(definition),
        matchingTaskIds,
        matchingTaskCount: matches.length,
        matchingTask,
        taskInventoryCount: tasks.length,
        matchingUpcomingCount,
        matchingHistoryCount:
          matchingHistory.length,
        matchingHistory,
        taskManagerStatus: managerStatus,
        officialMutationOperation: "POST /v2/task" as const,
        requiredAuthority: "%Admin_Task:U" as const,
        authorityRole: "MeridianTaskMetadataReader" as const,
        authorityMode: "EXPLICIT_ESCALATION_ROLE" as const,
      });
    };

  const initialPreflight =
    await readPreflight();

  if (!t01PrestateMatches(initialPreflight)) {
    throw new Error(
      "T01 live preflight did not prove exact task-name absence, zero upcoming/history state, and explicit task escalation.",
    );
  }

  reviewedPreflight = initialPreflight;

  console.log(
    `T01_FIXTURE_GENERATION=${generation}`,
  );
  console.log(
    `T01_TASK_INVENTORY_COUNT_BEFORE=${initialPreflight.taskInventoryCount}`,
  );
  console.log(
    `T01_TASK_MANAGER_STATUS_BEFORE=${initialPreflight.taskManagerStatus}`,
  );
  console.log(
    "T01_EXACT_TASK_ABSENCE_PRESTATE=PASS",
  );
  console.log(
    "T01_MATCHING_UPCOMING_PRESTATE_COUNT=0",
  );
  console.log(
    "T01_MATCHING_HISTORY_PRESTATE_COUNT=0",
  );
  console.log(
    "T01_TASK_CLASS=%SYS.Task.SwitchJournal",
  );
  console.log(
    "T01_TIME_PERIOD=On Demand",
  );
  console.log(
    "T01_SCHEDULER_EXECUTION_AUTHORIZED=NO",
  );

  const originalFetch =
    globalThis.fetch.bind(globalThis);

  const mutationFetch:
    typeof fetch =
    async (input, init) => {
      const method =
        String(init?.method ?? "GET").toUpperCase();
      const url = input.toString();
      const expectedUrl =
        API_BASE.replace(/\/+$/, "") + T01_TASK_PATH;

      if (
        method === "POST" &&
        url === expectedUrl
      ) {
        physicalBusinessPostCount += 1;
        businessDispatchStarted = true;
      }

      return originalFetch(input, init);
    };

  const intent =
    t01TaskCreateIntent(generation);

  const result =
    await certifyT01TaskCreateAction(
      {
        intent,
        actionId: ACTION_ID,
        receiptId: RECEIPT_ID,
        logicalActor:
          "R5-A frozen isolated task-create invocation",
        irisRuntimeUser: USERNAME,
      },
      {
        contract: {
          readFreshPreflight:
            async () => readPreflight(),

          executeCreate:
            async () => {
              const session = taskSession;

              if (session === null) {
                throw new Error(
                  "T01 task session disappeared before create dispatch.",
                );
              }

              const mutation =
                await postT01TaskCreate({
                  apiBaseUrl: API_BASE,
                  accessToken: session.accessToken,
                  definition: t01TaskDefinition(generation),
                  fetchImpl: mutationFetch,
                });

              createdTaskId = mutation.taskId;
              createLocation = mutation.location;

              console.log(
                `T01_POST_RESPONSE_STATUS=${mutation.status}`,
              );
              console.log(
                `T01_CREATED_TASK_ID=${mutation.taskId}`,
              );
              console.log(
                `T01_CREATE_LOCATION_PRESENT=${mutation.location.length > 0 ? "YES" : "NO"}`,
              );
              console.log(
                `T01_MUTATION_REQUEST_COUNT=${mutation.mutationRequestCount}`,
              );

              return Object.freeze({
                taskId: mutation.taskId,
                status: mutation.status,
                mutationRequestCount: mutation.mutationRequestCount,
              });
            },

          collectProofResults:
            async (execution) => {
              const reviewed = reviewedPreflight;

              if (
                reviewed === null ||
                physicalBusinessPostCount !== 1
              ) {
                throw new Error(
                  "T01 proof collection requires one physical business POST and the reviewed absence baseline.",
                );
              }

              const current = await readPreflight();
              const task = current.matchingTask;
              const definition = t01TaskDefinition(generation);

              if (
                task === null ||
                task.id !== execution.taskId
              ) {
                throw new Error(
                  "T01 authoritative task identity disappeared before proof collection.",
                );
              }

              createdTaskId = execution.taskId;

              const configurationVerified =
                t01TaskSnapshotMatchesDefinition(
                  task,
                  definition,
                );

              const taskStateVerified =
                current.matchingTaskCount === 1 &&
                current.matchingTaskIds.length === 1 &&
                current.matchingTaskIds[0] === execution.taskId &&
                current.taskInventoryCount === reviewed.taskInventoryCount + 1 &&
                current.matchingUpcomingCount === 0 &&
                current.taskManagerStatus === reviewed.taskManagerStatus;

              const taskHistoryVerified =
                t01TaskHistoryMatchesCreateOnly(
                  current.matchingHistory,
                  execution.taskId,
                );

              const httpIdentityVerified =
                execution.httpCreateResponseVerified &&
                execution.createStatus === 201 &&
                createdTaskId === execution.taskId &&
                createLocation.length > 0;

              if (
                !configurationVerified ||
                !taskStateVerified ||
                !taskHistoryVerified
              ) {
                throw new Error(
                  "T01 authoritative configuration/state/history proof did not close exactly.",
                );
              }

              if (httpIdentityVerified) {
                console.log(
                  "T01_HTTP_CREATE_IDENTITY=PASS",
                );
              }

              console.log(
                "T01_CONFIGURATION_READBACK=PASS",
              );
              console.log(
                "T01_TASK_STATE=PASS",
              );
              console.log(
                "T01_TASK_HISTORY_CREATE_ONLY=PASS",
              );
              console.log(
                "T01_TASK_EXECUTION_HISTORY_ZERO=PASS",
              );
              console.log(
                "T01_UPCOMING_EXECUTION_ABSENT=PASS",
              );
              console.log(
                `T01_TASK_INVENTORY_COUNT_AFTER_CREATE=${current.taskInventoryCount}`,
              );
              console.log(
                `T01_TASK_MANAGER_STATUS_AFTER=${current.taskManagerStatus}`,
              );

              return buildT01TaskCreateProofResults({
                observedAtUtc: new Date().toISOString(),
                httpIdentityVerified,
                configurationVerified,
                taskStateVerified,
                taskHistoryVerified,
                httpSourceReference:
                  httpIdentityVerified
                    ? `IRIS POST /v2/task:201:id=${execution.taskId}`
                    : "IRIS POST /v2/task:authoritative-state-reconciled-without-observed-201",
                configurationSourceReference:
                  `IRIS GET /v2/task?id=${execution.taskId}:generation-bound-definition`,
                taskStateSourceReference:
                  `IRIS GET /v2/tasks + /v2/task/manager + /v2/task/upcoming:id=${execution.taskId}`,
                taskHistorySourceReference:
                  `IRIS GET /v2/task/history?taskId=${execution.taskId}:rows=1:create-management-only`,
              });
            },
        },

        certification: {
          nowUtc:
            () => new Date().toISOString(),

          reviewPreflight:
            async (review) => {
              if (
                !t01PrestateMatches(review.preflight) ||
                review.impact.certainty !== "KNOWN" ||
                review.expectedDelta.summary !== T01_TASK_CREATE_DELTA_SUMMARY
              ) {
                throw new Error(
                  "Frozen T01 review packet does not satisfy the approved task-create contract.",
                );
              }

              console.log(
                `T01_REVIEWED_PREFLIGHT_DIGEST=${review.preflightDigest}`,
              );
              console.log(
                "T01_REVIEWED_DELTA=ABSENT_TO_ONE_ON_DEMAND_TASK_ONLY",
              );
              console.log(
                "T01_REVIEWED_MUTATION=POST_/v2/task_ONLY",
              );
              console.log(
                "T01_IMPACT_CERTAINTY=KNOWN",
              );

              return review.preflightDigest;
            },

          receiptStore: {
            async persist(receipt) {
              if (runtimeSession === null) {
                throw new Error(
                  "T01 runtime session disappeared before receipt persistence.",
                );
              }

              const record =
                buildActionReceiptHistoryRecord(receipt);

              const persisted =
                await persistActionReceiptHistory({
                  baseUrl: HISTORY_BASE,
                  accessToken: runtimeSession.accessToken,
                  record,
                });

              if (
                persisted.status !== "CREATED" ||
                persisted.record.receiptId !== receipt.receiptId ||
                persisted.record.receiptSha256 !== receipt.receiptSha256
              ) {
                throw new Error(
                  "T01 generic receipt write acknowledgement does not match the certified receipt.",
                );
              }
            },

            async read(receiptId) {
              if (runtimeSession === null) {
                throw new Error(
                  "T01 runtime session disappeared before receipt readback.",
                );
              }

              return actionReceiptV2FromGenericHistory(
                await readActionReceiptHistory({
                  baseUrl: HISTORY_BASE,
                  accessToken: runtimeSession.accessToken,
                  receiptId,
                }),
              );
            },
          },
        },
      },
    );

  console.log(
    `T01_CERTIFICATION_OUTCOME=${result.outcome}`,
  );
  console.log(
    `T01_FINAL_ACTION_STATE=${result.record.state}`,
  );
  console.log(
    `T01_EVENT_COUNT=${result.events.length}`,
  );
  console.log(
    `T01_PROOF_RESULT_COUNT=${result.proofResults.length}`,
  );
  console.log(
    `T01_CERTIFICATION_REASON=${result.reason ?? "NONE"}`,
  );

  for (const event of result.events) {
    console.log(
      "T01_EVENT_LEDGER=" +
      JSON.stringify({
        sequence: event.sequence,
        eventType: event.eventType,
        fromState: event.fromState,
        toState: event.toState,
        detail: event.detail,
        eventHash: event.eventHash,
      }),
    );
  }

  if (
    result.outcome !== "VERIFIED" ||
    result.record.state !== "VERIFIED" ||
    result.receipt === null ||
    physicalBusinessPostCount !== 1 ||
    createdTaskId === null ||
    reviewedPreflight === null ||
    !result.proofResults.every((item) => item.status === "PASS")
  ) {
    throw new Error(
      `T01 certification did not close VERIFIED. Reason=${result.reason ?? "none"}`,
    );
  }

  const secondReadback =
    actionReceiptV2FromGenericHistory(
      await readActionReceiptHistory({
        baseUrl: HISTORY_BASE,
        accessToken: runtimeSession.accessToken,
        receiptId: RECEIPT_ID,
      }),
    );

  assertExactReceiptReadback(
    result.receipt,
    secondReadback,
  );

  const targetHistoryAfter =
    await readTargetActionHistory({
      baseUrl: HISTORY_BASE,
      accessToken: runtimeSession.accessToken,
      targetCanonicalId: T01_TASK_TARGET_CANONICAL_ID,
    });

  if (
    !sameReceiptSet(
      targetHistoryAfter,
      [RECEIPT_ID],
    )
  ) {
    throw new Error(
      "T01 target history does not contain exactly the T01 receipt after certification.",
    );
  }

  for (const predecessor of PREDECESSORS) {
    const receipt =
      actionReceiptV2FromGenericHistory(
        await readActionReceiptHistory({
          baseUrl: HISTORY_BASE,
          accessToken: runtimeSession.accessToken,
          receiptId: predecessor.receiptId,
        }),
      );

    if (receipt.receiptSha256 !== predecessor.sha256) {
      throw new Error(
        `Historical predecessor changed after T01: ${predecessor.receiptId}.`,
      );
    }
  }

  certificationFullyClosed = true;

  console.log(
    `T01_RECEIPT_ID=${result.receipt.receiptId}`,
  );
  console.log(
    `T01_RECEIPT_SHA256=${result.receipt.receiptSha256}`,
  );
  console.log(
    "T01_GENERIC_RECEIPT_EXACT_READBACK=PASS",
  );
  console.log(
    "T01_GENERIC_RECEIPT_SECOND_FRESH_READBACK=PASS",
  );
  console.log(
    "T01_TARGET_HISTORY_POSTSTATE_COUNT=1",
  );
  console.log(
    "T01_ALL_PREDECESSOR_RECEIPTS_UNCHANGED=PASS",
  );
  console.log(
    "T01_ACTION_VERIFIED_AFTER_READBACK_ONLY=PASS",
  );
}
finally {
  let cleanupFailure:
    Error |
    null =
      null;

  const cleanupAllowed =
    !businessDispatchStarted ||
    certificationFullyClosed;

  console.log(
    `T01_FIXTURE_CLEANUP_ALLOWED=${cleanupAllowed ? "YES" : "NO"}`,
  );

  if (
    taskSession !== null &&
    createdTaskId !== null &&
    !fixtureCleanupComplete &&
    cleanupAllowed
  ) {
    try {
      const taskBeforeCleanup =
        await readT01Task({
          apiBaseUrl: API_BASE,
          accessToken: taskSession.accessToken,
          taskId: createdTaskId,
        });

      if (taskBeforeCleanup === null) {
        throw new Error(
          "T01 fixture task disappeared before explicit cleanup.",
        );
      }

      await deleteT01FixtureTask({
        apiBaseUrl: API_BASE,
        accessToken: taskSession.accessToken,
        taskId: createdTaskId,
      });

      fixtureCleanupDeleteCount += 1;

      if (
        await readT01Task({
          apiBaseUrl: API_BASE,
          accessToken: taskSession.accessToken,
          taskId: createdTaskId,
        }) !== null
      ) {
        throw new Error(
          "T01 fixture task remained after cleanup DELETE.",
        );
      }

      const residualMatches =
        exactNameMatches(
          await listT01Tasks({
            apiBaseUrl: API_BASE,
            accessToken: taskSession.accessToken,
          }),
        );

      if (residualMatches.length !== 0) {
        throw new Error(
          "T01 exact-name fixture task remained in inventory after cleanup.",
        );
      }

      fixtureCleanupComplete = true;

      console.log(
        "T01_FIXTURE_DELETE_AFTER_RECEIPT=PASS",
      );
      console.log(
        "T01_FIXTURE_TASK_ABSENT_AFTER_RESET=PASS",
      );
      console.log(
        "T01_FIXTURE_CLEANUP_IS_NOT_T06_CERTIFICATION=PASS",
      );
    } catch (error) {
      cleanupFailure =
        error instanceof Error
          ? error
          : new Error(
              "Unknown T01 task fixture cleanup failure.",
            );
    }
  }

  if (
    businessDispatchStarted &&
    !certificationFullyClosed
  ) {
    console.log(
      "T01_POST_DISPATCH_FORENSIC_STATE_PRESERVED=YES",
    );
    console.log(
      "T01_AUTOMATIC_FIXTURE_DELETE_AFTER_FAILED_DISPATCH=NO",
    );
  }

  if (taskSession !== null) {
    try {
      await logoutIris({
        baseUrl: API_BASE,
        accessToken: taskSession.accessToken,
      });

      console.log(
        "T01_TASK_ESCALATION_LOGOUT_HTTP=200",
      );
    } catch (error) {
      if (cleanupFailure === null) {
        cleanupFailure =
          error instanceof Error
            ? error
            : new Error(
                "Unknown T01 task escalation logout failure.",
              );
      }
    }
  }

  if (runtimeSession !== null) {
    try {
      await logoutIris({
        baseUrl: API_BASE,
        accessToken: runtimeSession.accessToken,
      });

      console.log(
        "T01_RUNTIME_LOGOUT_HTTP=200",
      );
    } catch (error) {
      if (cleanupFailure === null) {
        cleanupFailure =
          error instanceof Error
            ? error
            : new Error(
                "Unknown T01 runtime logout failure.",
              );
      }
    }
  }

  generation = "";
  createLocation = "";
  taskSession = null;
  runtimeSession = null;

  console.log(
    "T01_RUNTIME_PASSWORD_STORED=NO",
  );
  console.log(
    "T01_TASK_ESCALATION_JWT_STORED=NO",
  );
  console.log(
    "T01_RUNTIME_JWT_STORED=NO",
  );

  if (cleanupFailure !== null) {
    throw cleanupFailure;
  }
}

if (
  !certificationFullyClosed ||
  !fixtureCleanupComplete ||
  physicalBusinessPostCount !== 1 ||
  fixtureCleanupDeleteCount !== 1
) {
  throw new Error(
    "T01 live certification did not reach verified receipt closure plus fixture cleanup.",
  );
}

console.log(
  "T01_LIVE_CERTIFICATION=PASS",
);
console.log(
  "T01_FIXTURE_LIFECYCLE_TRANSPARENT=PASS",
);
console.log(
  "T01_BUSINESS_POST_COUNT=1",
);
console.log(
  "T01_FIXTURE_CLEANUP_DELETE_COUNT=1",
);
console.log(
  "T01_COMMAND_COMPLETE=YES",
);
