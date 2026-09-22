import {
  spawnSync,
} from "node:child_process";

import {
  readFileSync,
} from "node:fs";

import {
  digestCanonicalJson,
} from "../src/lib/proof/digest";

import {
  T05_TASK_CLASS,
  T05_TASK_NAME,
  T05_TASK_ROLE,
  T05_TASK_RESUME_PATH,
  listT05Tasks,
  postT05TaskResume,
  readT05Task,
  readT05TaskHistory,
  readT05TaskManagerStatus,
  readT05UpcomingTasks,
} from "../src/lib/iris/task-resume-action-transport";

import {
  T05_EXPECTED_CREATE_BODY_DIGEST,
  T05_EXPECTED_FIXTURE_PROJECTION_DIGEST,
  T05_TASK_RESUME_CONTRACT_ID,
  T05_TASK_RESUME_DELTA_SUMMARY,
  T05_TASK_TARGET_CANONICAL_ID,
  buildT05TaskResumeProofResults,
  certifyT05TaskResumeAction,
  reconcileUnknownT05TaskResume,
  t05AuthorizedResumeRequestDigest,
  t05PoststateMatches,
  t05PrestateMatches,
  t05TaskHistoryMatchesSuspendedStateA,
  t05TaskResumeIntent,
  type T05TaskResumePreflight,
} from "../src/lib/actions/tasks/task-resume";

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
  process.env.MERIDIAN_R5_E_T05_LIVE_RESUME_ALLOWED ===
  "YES";

const MODE =
  process.env.MERIDIAN_R5_E_T05_MODE ??
  "PRECHECK";

const FIXTURE_GENERATION =
  "5d1764a2-1cdf-4fc6-9bb9-eaf40ec62144";

const EXPECTED_TASK_ID =
  1006 as const;

const EXPECTED_STATE_A_DIGEST =
  "6AD3C2A72609CDD6F5DCD22897CD8B2AA1ED60A1342289B8E4738F416A8AD808";

const EXPECTED_REQUEST_TEMPLATE_DIGEST =
  "9A81F58B83922ACCE159618518D9178428903EFD0E797C257141B7D051192AF8";

const EXPECTED_DESIGN_DIGEST =
  "5A7B952C751AF136BA447A918A2CB4E994A2EFE54FDE8A4F308A8BCFD5A24BCC";

const EXPECTED_AUTHORIZED_REQUEST_DIGEST =
  "D30F984B082281249BD7119EB233CFC62C4DE3C3A3D0FD6D28481C1C0B10EB7D";

const ACTION_ID =
  "t05-task-resume-r5-e-001";

const RECEIPT_ID =
  "meridian-t05-task-resume-r5-e-001";

const T04_RECEIPT_ID =
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
    Object.freeze({
      receiptId:
        T04_RECEIPT_ID,
      sha256:
        "F52D15294020952223291866271EF525E7B83790A7867714FF73672CA013F9BD",
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
      "T05 E4 login response is not an object.",
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
      "T05 E4 login result is not an object.",
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
              T05_TASK_ROLE,
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
      `T05 E4 explicit action-role login failed HTTP ${response.status}.`,
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
      "T05 E4 action-role login did not return both tokens.",
    );
  }

  return {
    accessToken,
    refreshToken,
  };
}

function markerInteger(
  text:
    string,
  name:
    string,
): number {
  const match =
    text.match(
      new RegExp(
        `${name}=(-?\\d+)`,
      ),
    );

  if (
    match ===
      null ||
    match[1] ===
      undefined
  ) {
    throw new Error(
      `T05 E4 native probe omitted ${name}.`,
    );
  }

  const value =
    Number.parseInt(
      match[1],
      10,
    );

  if (
    !Number.isSafeInteger(
      value,
    )
  ) {
    throw new Error(
      `T05 E4 native probe returned invalid ${name}.`,
    );
  }

  return value;
}

function readNativeTaskState(): Readonly<{
  count:
    number;
  taskId:
    number;
  suspended:
    boolean;
}> {
  const source =
    [
      'zn "%SYS"',
      'set stmt=##class(%SQL.Statement).%New()',
      'set sc=stmt.%Prepare("SELECT ID,Suspended FROM %SYS.Task WHERE Name = ?")',
      'if $SYSTEM.Status.IsError(sc) write "T05N_PREPARE_OK=0",! halt 31',
      'write "T05N_PREPARE_OK=1",!',
      `set rs=stmt.%Execute("${T05_TASK_NAME}")`,
      'set count=0,id=0,suspended=-1',
      'for  quit:\'rs.%Next()  set count=count+1,id=rs.%Get("ID"),suspended=rs.%Get("Suspended")',
      'write "T05N_COUNT="_count,!',
      'write "T05N_ID="_id,!',
      'write "T05N_SUSPENDED="_suspended,!',
      'halt',
      '',
    ].join(
      "\n",
    );

  const native =
    spawnSync(
      "docker",
      [
        "exec",
        "-i",
        "iris-cert",
        "iris",
        "session",
        "IRIS",
        "-U",
        "%SYS",
      ],
      {
        input:
          source,
        encoding:
          "utf8",
        maxBuffer:
          1024 * 1024,
      },
    );

  if (
    native.error !==
      undefined
  ) {
    throw native.error;
  }

  const output =
    `${String(native.stdout ?? "")}\n${String(native.stderr ?? "")}`;

  if (
    native.status !==
      0 ||
    !output.includes(
      "T05N_PREPARE_OK=1",
    ) ||
    output.includes(
      "<PROTECT>",
    ) ||
    output.includes(
      "<UNDEFINED>",
    ) ||
    output.includes(
      "<METHOD DOES NOT EXIST>",
    ) ||
    output.includes(
      "<CLASS DOES NOT EXIST>",
    )
  ) {
    throw new Error(
      `T05 E4 native %SYS.Task read failed. ${output}`,
    );
  }

  const count =
    markerInteger(
      output,
      "T05N_COUNT",
    );

  const taskId =
    markerInteger(
      output,
      "T05N_ID",
    );

  const suspended =
    markerInteger(
      output,
      "T05N_SUSPENDED",
    );

  if (
    count !==
      1 ||
    taskId !==
      EXPECTED_TASK_ID ||
    (
      suspended !==
        0 &&
      suspended !==
        1
    )
  ) {
    throw new Error(
      `T05 E4 native identity/state mismatch count=${count} id=${taskId} suspended=${suspended}.`,
    );
  }

  return Object.freeze({
    count,
    taskId,
    suspended:
      suspended ===
        1,
  });
}

function frozenRequestTemplate(): Readonly<Record<string, unknown>> {
  return Object.freeze({
    method:
      "POST",
    path:
      "/v2/task/resume",
    query:
      Object.freeze({
        id:
          "<reviewed-positive-integer-task-id>",
      }),
  });
}

function frozenDesignMaterial(): Readonly<Record<string, unknown>> {
  return Object.freeze({
    actionId:
      "T05_TASK_RESUME",
    authorityMode:
      "EXPLICIT_ESCALATION_ROLE",
    authorityRole:
      T05_TASK_ROLE,
    automaticRetryAfterDispatch:
      false,
    cleanupActionId:
      "T06_TASK_DELETE_FIXTURE",
    fixtureGeneration:
      FIXTURE_GENERATION,
    historyPolicy:
      "OBSERVE_NOT_REQUIRED_FOR_T05_VERIFIED",
    officialMutation:
      frozenRequestTemplate(),
    prestate:
      Object.freeze({
        authoritativeSuspended:
          true,
        sameTaskId:
          true,
      }),
    proofRequirements:
      Object.freeze([
        "TASK_STATE",
        "PERSISTENT_RECEIPT",
      ]),
    receiptId:
      RECEIPT_ID,
    recoveryActionId:
      "T04_TASK_SUSPEND",
    requiredAuthority:
      "%Admin_Task:U",
    reversibility:
      "REVERSIBLE",
    standingRuntimeBroadened:
      false,
    stateB:
      Object.freeze({
        authoritativeSuspended:
          false,
        sameConfigurationExceptSuspended:
          true,
        sameTaskIdentity:
          true,
        zeroExecutionSideEffect:
          true,
      }),
    stateSurfacePolicy:
      Object.freeze({
        authoritative:
          "NATIVE_%SYS.Task.Suspended",
        detailSuspendedField:
          "ABSENT_ON_BUILD_221U",
        summarySuspendedField:
          "ADVISORY_ONLY_AFTER_R5_D8_R2",
      }),
    targetCanonicalId:
      T05_TASK_TARGET_CANONICAL_ID,
  });
}

function stateAMaterial(
  preflight:
    T05TaskResumePreflight,
): Readonly<Record<string, unknown>> {
  const task =
    preflight.matchingTask;

  if (
    task ===
      null
  ) {
    throw new Error(
      "T05 E4 cannot project E1 State A from a missing task.",
    );
  }

  const normalizedTimePeriod =
    task.timePeriod.trim().toLowerCase() ===
      "5"
      ? "On Demand"
      : task.timePeriod;

  return Object.freeze({
    Description:
      task.description,
    EndDate:
      task.endDate,
    Name:
      task.name,
    NameSpace:
      task.namespace.toUpperCase(),
    Priority:
      task.priority,
    RunAsUser:
      task.runAsUser,
    Settings:
      Object.freeze({}),
    StartDate:
      task.startDate,
    Suspended:
      preflight.authoritativeSuspended,
    TaskClass:
      task.taskClass,
    TimePeriod:
      normalizedTimePeriod,
  });
}

function assertE1FrozenAuthority(
  preflight:
    T05TaskResumePreflight,
): void {
  if (
    !t05PrestateMatches(
      preflight,
    )
  ) {
    throw new Error(
      "T05 E4 live product preflight no longer matches the exact suspended State A contract.",
    );
  }

  const stateADigest =
    digestCanonicalJson(
      stateAMaterial(
        preflight,
      ),
    );

  const requestTemplateDigest =
    digestCanonicalJson(
      frozenRequestTemplate(),
    );

  const designDigest =
    digestCanonicalJson(
      frozenDesignMaterial(),
    );

  const authorizedRequestDigest =
    t05AuthorizedResumeRequestDigest(
      EXPECTED_TASK_ID,
    );

  if (
    stateADigest !==
      EXPECTED_STATE_A_DIGEST ||
    requestTemplateDigest !==
      EXPECTED_REQUEST_TEMPLATE_DIGEST ||
    designDigest !==
      EXPECTED_DESIGN_DIGEST ||
    authorizedRequestDigest !==
      EXPECTED_AUTHORIZED_REQUEST_DIGEST ||
    preflight.authoritativeSuspended !==
      true ||
    preflight.matchingSummary?.suspended !==
      false ||
    preflight.taskInventoryCount !==
      17 ||
    preflight.matchingHistoryCount !==
      2 ||
    !t05TaskHistoryMatchesSuspendedStateA(
      preflight.matchingHistory,
      EXPECTED_TASK_ID,
    ) ||
    preflight.matchingUpcomingCount !==
      0 ||
    preflight.taskManagerStatus !==
      "Running"
  ) {
    throw new Error(
      "T05 E4 failed to reproduce the frozen E1 authority packet and live suspended prestate.",
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
        `T05 E4 historical predecessor changed: ${predecessor.receiptId}.`,
      );
    }

    console.log(
      `T05_E4_PREDECESSOR_RECEIPT_SHA256=${receipt.receiptId}|${receipt.receiptSha256}`,
    );
  }
}

if (
  USERNAME !==
    "meridian.runtime"
) {
  throw new Error(
    "T05 E4 is pinned to meridian.runtime.",
  );
}

if (
  MODE !==
    "PRECHECK" &&
  MODE !==
    "EXECUTE"
) {
  throw new Error(
    "T05 E4 mode must be PRECHECK or EXECUTE.",
  );
}

if (
  !LIVE_GATE
) {
  console.log(
    "===== MERIDIAN R5-E4 CLOSED LIVE GATE =====",
  );
  console.log(
    "T05_E4_LIVE_GATE=DENIED",
  );
  console.log(
    "T05_E4_IRIS_CONNECTION_PERFORMED=NO",
  );
  console.log(
    "T05_E4_NATIVE_TASK_READ_PERFORMED=NO",
  );
  console.log(
    "T05_E4_TASK_RESUME_PERFORMED=NO",
  );
  console.log(
    "T05_E4_RECEIPT_WRITE_PERFORMED=NO",
  );
  console.log(
    "T05_E4_LIVE_VERIFIER_ARMED=YES",
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
      "T05 E4 runtime password is missing from ephemeral stdin.",
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
    T05TaskResumePreflight |
    null =
      null;

  let physicalResumeRequestCount =
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
    t05TaskResumeIntent(
      FIXTURE_GENERATION,
      EXPECTED_TASK_ID,
    );

  try {
    console.log(
      "===== MERIDIAN R5-E4 LIVE VERIFIER =====",
    );
    console.log(
      `T05_E4_MODE=${MODE}`,
    );
    console.log(
      "T05_E4_FIXTURE_CREATE_AUTHORIZED=NO",
    );
    console.log(
      `T05_E4_TASK_RESUME_AUTHORIZED=${MODE === "EXECUTE" ? "YES" : "NO"}`,
    );
    console.log(
      "T05_E4_TASK_RESUME_MAXIMUM=1",
    );
    console.log(
      "T05_E4_TASK_SUSPEND_AUTHORIZED=NO",
    );
    console.log(
      "T05_E4_FIXTURE_DELETE_AUTHORIZED=NO",
    );
    console.log(
      `T05_E4_RECEIPT_WRITE_AUTHORIZED=${MODE === "EXECUTE" ? "YES" : "NO"}`,
    );
    console.log(
      "T05_E4_AUTOMATIC_RETRY_AUTHORIZED=NO",
    );
    console.log(
      "T05_E4_AUTOMATIC_RECOVERY_AUTHORIZED=NO",
    );
    console.log(
      `T05_E4_CONTRACT_ID=${T05_TASK_RESUME_CONTRACT_ID}`,
    );
    console.log(
      `T05_E4_EXPECTED_TASK_ID=${EXPECTED_TASK_ID}`,
    );
    console.log(
      `T05_E4_EXPECTED_GENERATION=${FIXTURE_GENERATION}`,
    );
    console.log(
      `T05_E4_EXPECTED_STATE_A_DIGEST=${EXPECTED_STATE_A_DIGEST}`,
    );
    console.log(
      `T05_E4_EXPECTED_REQUEST_TEMPLATE_DIGEST=${EXPECTED_REQUEST_TEMPLATE_DIGEST}`,
    );
    console.log(
      `T05_E4_EXPECTED_DESIGN_DIGEST=${EXPECTED_DESIGN_DIGEST}`,
    );
    console.log(
      `T05_E4_EXPECTED_AUTHORIZED_REQUEST_DIGEST=${EXPECTED_AUTHORIZED_REQUEST_DIGEST}`,
    );
    console.log(
      `T05_E4_RECEIPT_ID=${RECEIPT_ID}`,
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
      "T05_E4_RUNTIME_LOGIN_HTTP=200",
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
        "T05 E4 pinned runtime identity/version guard failed.",
      );
    }

    console.log(
      "T05_E4_RUNTIME_IDENTITY_VERSION=PASS",
    );

    actionSession =
      await loginActionRole(
        password,
      );

    console.log(
      "T05_E4_EXPLICIT_ACTION_ESCALATION_LOGIN_HTTP=200",
    );
    console.log(
      `T05_E4_AUTHORITY_ROLE=${T05_TASK_ROLE}`,
    );
    console.log(
      "T05_E4_STANDING_RUNTIME_AUTHORITY_BROADENED=NO",
    );

    await readAndVerifyPredecessors(
      runtimeSession.accessToken,
    );

    console.log(
      `T05_E4_PREDECESSOR_RECEIPT_COUNT=${PREDECESSORS.length}`,
    );
    console.log(
      "T05_E4_ALL_PREDECESSOR_RECEIPTS_PRECHECK=PASS",
    );

    const targetHistoryBefore =
      await readTargetActionHistory({
        baseUrl:
          HISTORY_BASE,
        accessToken:
          runtimeSession.accessToken,
        targetCanonicalId:
          T05_TASK_TARGET_CANONICAL_ID,
      });

    if (
      !sameReceiptSet(
        targetHistoryBefore,
        [
          T04_RECEIPT_ID,
        ],
      )
    ) {
      throw new Error(
        "T05 E4 target history must contain exactly the certified T04 suspend receipt before T05.",
      );
    }

    console.log(
      "T05_E4_TARGET_HISTORY_PRESTATE_COUNT=1",
    );
    console.log(
      `T05_E4_TARGET_HISTORY_PRESTATE_RECEIPT=${T04_RECEIPT_ID}`,
    );

    const readFreshPreflight =
      async (): Promise<T05TaskResumePreflight> => {
        const session =
          actionSession;

        if (
          session ===
            null
        ) {
          throw new Error(
            "T05 E4 action escalation session is unavailable.",
          );
        }

        const [
          tasks,
          upcoming,
          manager,
        ] =
          await Promise.all([
            listT05Tasks({
              apiBaseUrl:
                API_BASE,
              accessToken:
                session.accessToken,
            }),
            readT05UpcomingTasks({
              apiBaseUrl:
                API_BASE,
              accessToken:
                session.accessToken,
            }),
            readT05TaskManagerStatus({
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
                T05_TASK_NAME,
          );

        let task:
          T05TaskResumePreflight[
            "matchingTask"
          ] =
          null;

        let summary:
          T05TaskResumePreflight[
            "matchingSummary"
          ] =
          null;

        let history:
          T05TaskResumePreflight[
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
              "T05 E4 exact-name inventory row has no positive id.",
            );
          }

          summary =
            only;

          [
            task,
            history,
          ] =
            await Promise.all([
              readT05Task({
                apiBaseUrl:
                  API_BASE,
                accessToken:
                  session.accessToken,
                taskId:
                  only.id,
              }),
              readT05TaskHistory({
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
                T05_TASK_NAME ||
              row.id ===
                EXPECTED_TASK_ID,
          );

        const native =
          readNativeTaskState();

        return Object.freeze({
          schemaVersion:
            "meridian.task-resume-preflight.v1" as const,
          expectedFixtureGeneration:
            FIXTURE_GENERATION,
          taskName:
            T05_TASK_NAME,
          expectedTaskId:
            EXPECTED_TASK_ID,
          expectedFixtureProjectionDigest:
            T05_EXPECTED_FIXTURE_PROJECTION_DIGEST,
          expectedCreateBodyDigest:
            T05_EXPECTED_CREATE_BODY_DIGEST,
          authorizedResumeRequestDigest:
            t05AuthorizedResumeRequestDigest(
              EXPECTED_TASK_ID,
            ),
          authoritativeSuspended:
            native.suspended,
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
            "POST /v2/task/resume" as const,
          requiredAuthority:
            "%Admin_Task:U" as const,
          authorityRole:
            T05_TASK_ROLE,
          authorityMode:
            "EXPLICIT_ESCALATION_ROLE" as const,
        });
      };

    const independentPreflight =
      await readFreshPreflight();

    assertE1FrozenAuthority(
      independentPreflight,
    );

    console.log(
      `T05_E4_GENERIC_PREFLIGHT_DIGEST=${digestCanonicalJson(
        independentPreflight,
      )}`,
    );
    console.log(
      "T05_E4_E1_STATE_A_REVALIDATION=PASS",
    );
    console.log(
      "T05_E4_E1_REQUEST_TEMPLATE_REVALIDATION=PASS",
    );
    console.log(
      "T05_E4_E1_DESIGN_REVALIDATION=PASS",
    );
    console.log(
      "T05_E4_NATIVE_SUSPENDED_PRESTATE=1",
    );

    if (
      MODE ===
        "PRECHECK"
    ) {
      console.log(
        "T05_E4_TASK_RESUME_PERFORMED=NO",
      );
      console.log(
        "T05_E4_RECEIPT_WRITE_PERFORMED=NO",
      );
      console.log(
        "T05_E4_PRECHECK=PASS",
      );
      commandComplete =
        true;
    } else {
      const originalFetch =
        globalThis.fetch.bind(
          globalThis,
        );

      const expectedResumeUrl =
        API_BASE.replace(
          /\/+$/,
          "",
        ) +
        T05_TASK_RESUME_PATH +
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
                expectedResumeUrl
            ) {
              throw new Error(
                `T05 E4 refused an unexpected physical POST target: ${url}`,
              );
            }

            if (
              init?.body !==
                undefined &&
              init.body !==
                null
            ) {
              throw new Error(
                "T05 E4 refused a physical resume POST with a request body.",
              );
            }

            if (
              physicalResumeRequestCount !==
                0
            ) {
              throw new Error(
                "T05 E4 refused a second physical resume request before dispatch.",
              );
            }

            physicalResumeRequestCount +=
              1;
            businessDispatchStarted =
              true;

            console.log(
              "T05_E4_TASK_RESUME_DISPATCHED=YES",
            );
          }

          return originalFetch(
            request,
            init,
          );
        };

      const result =
        await certifyT05TaskResumeAction(
          {
            intent,
            actionId:
              ACTION_ID,
            receiptId:
              RECEIPT_ID,
            logicalActor:
              "R5-E frozen T05 Task Resume invocation",
            irisRuntimeUser:
              USERNAME,
          },
          {
            contract: {
              readFreshPreflight:
                async () =>
                  readFreshPreflight(),

              executeResume:
                async () => {
                  const session =
                    actionSession;

                  if (
                    session ===
                      null
                  ) {
                    throw new Error(
                      "T05 E4 action session disappeared before resume dispatch.",
                    );
                  }

                  console.log(
                    "T05_E4_TASK_RESUME_NOW_AUTHORIZED=YES",
                  );
                  console.log(
                    "T05_E4_TASK_RESUME_TARGET=/v2/task/resume?id=1006",
                  );
                  console.log(
                    "T05_E4_TASK_RESUME_BODY=NONE",
                  );

                  const mutation =
                    await postT05TaskResume({
                      apiBaseUrl:
                        API_BASE,
                      accessToken:
                        session.accessToken,
                      taskId:
                        EXPECTED_TASK_ID,
                      fetchImpl:
                        mutationFetch,
                    });

                  console.log(
                    `T05_E4_TASK_RESUME_STATUS=${mutation.status}`,
                  );
                  console.log(
                    `T05_E4_TRANSPORT_MUTATION_REQUEST_COUNT=${mutation.mutationRequestCount}`,
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
                    physicalResumeRequestCount !==
                      1
                  ) {
                    throw new Error(
                      "T05 E4 proof collection requires frozen reviewed State A and exactly one physical resume POST.",
                    );
                  }

                  const current =
                    await readFreshPreflight();

                  const beforeTask =
                    reviewed.matchingTask;
                  const afterTask =
                    current.matchingTask;

                  if (
                    beforeTask ===
                      null ||
                    afterTask ===
                      null
                  ) {
                    throw new Error(
                      "T05 E4 authoritative poststate is missing task evidence.",
                    );
                  }

                  const fullPoststateVerified =
                    t05PoststateMatches(
                      current,
                      reviewed,
                    );

                  const httpResumeVerified =
                    execution.httpResumeResponseVerified &&
                    execution.resumeStatus ===
                      200 &&
                    execution.mutationRequestCount ===
                      1 &&
                    physicalResumeRequestCount ===
                      1;

                  const configurationPreserved =
                    fullPoststateVerified &&
                    digestCanonicalJson(
                      afterTask,
                    ) ===
                      digestCanonicalJson(
                        beforeTask,
                      );

                  const taskStateVerified =
                    fullPoststateVerified &&
                    reviewed.authoritativeSuspended ===
                      true &&
                    current.authoritativeSuspended ===
                      false &&
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

                  const taskHistoryObserved =
                    current.matchingHistoryCount ===
                      current.matchingHistory.length;

                  stateBDigest =
                    digestCanonicalJson(
                      current,
                    );

                  console.log(
                    `T05_E4_STATE_B_DIGEST=${stateBDigest}`,
                  );

                  if (
                    configurationPreserved
                  ) {
                    console.log(
                      "T05_E4_CONFIGURATION_READBACK=PASS",
                    );
                  }

                  if (
                    taskStateVerified
                  ) {
                    console.log(
                      "T05_E4_NATIVE_RESUMED_STATE_TRANSITION=PASS",
                    );
                  }

                  if (
                    taskHistoryObserved
                  ) {
                    console.log(
                      `T05_E4_HISTORY_OBSERVATION=PASS|ROWS=${current.matchingHistoryCount}`,
                    );
                  }

                  if (
                    httpResumeVerified
                  ) {
                    console.log(
                      "T05_E4_HTTP_RESUME=PASS",
                    );
                  }

                  return buildT05TaskResumeProofResults({
                    observedAtUtc:
                      new Date().toISOString(),
                    httpResumeVerified,
                    configurationPreserved,
                    taskStateVerified,
                    taskHistoryObserved,
                    httpSourceReference:
                      httpResumeVerified
                        ? "IRIS POST /v2/task/resume?id=1006:200:requests=1:body=none"
                        : null,
                    configurationSourceReference:
                      configurationPreserved
                        ? `IRIS GET /v2/task?id=1006:state-b-digest=${stateBDigest}`
                        : null,
                    taskStateSourceReference:
                      taskStateVerified
                        ? `Native %SYS.Task.Suspended=0 + SysAdmin identity/manager/upcoming:state-b-digest=${stateBDigest}`
                        : null,
                    taskHistorySourceReference:
                      taskHistoryObserved
                        ? `IRIS GET /v2/task/history?taskId=1006:rows=${current.matchingHistoryCount}:observed-only`
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
                      "T05 E4 runtime session disappeared during review.",
                    );
                  }

                  if (
                    !t05PrestateMatches(
                      review.preflight,
                    ) ||
                    review.impact.certainty !==
                      "KNOWN" ||
                    review.expectedDelta.summary !==
                      T05_TASK_RESUME_DELTA_SUMMARY
                  ) {
                    throw new Error(
                      "T05 E4 generic runner review does not match the frozen resume contract.",
                    );
                  }

                  assertE1FrozenAuthority(
                    review.preflight,
                  );

                  const reviewTargetHistory =
                    await readTargetActionHistory({
                      baseUrl:
                        HISTORY_BASE,
                      accessToken:
                        session.accessToken,
                      targetCanonicalId:
                        T05_TASK_TARGET_CANONICAL_ID,
                    });

                  if (
                    !sameReceiptSet(
                      reviewTargetHistory,
                      [
                        T04_RECEIPT_ID,
                      ],
                    )
                  ) {
                    throw new Error(
                      "T05 E4 review observed unexpected target-history receipts before T05.",
                    );
                  }

                  reviewedPreflight =
                    review.preflight;

                  console.log(
                    `T05_E4_REVIEWED_GENERIC_PREFLIGHT_DIGEST=${review.preflightDigest}`,
                  );
                  console.log(
                    `T05_E4_RECOMPUTED_E1_STATE_A_DIGEST=${digestCanonicalJson(stateAMaterial(review.preflight))}`,
                  );
                  console.log(
                    `T05_E4_RECOMPUTED_E1_REQUEST_TEMPLATE_DIGEST=${digestCanonicalJson(frozenRequestTemplate())}`,
                  );
                  console.log(
                    `T05_E4_RECOMPUTED_E1_DESIGN_DIGEST=${digestCanonicalJson(frozenDesignMaterial())}`,
                  );
                  console.log(
                    "T05_E4_E1_REVIEW_BINDING=PASS",
                  );
                  console.log(
                    "T05_E4_REVIEWED_DELTA=ONE_NATIVE_RESUME_TRANSITION_ONLY",
                  );
                  console.log(
                    "T05_E4_REVIEWED_MUTATION=POST_/v2/task/resume?id=1006_BODY_NONE_ONLY",
                  );
                  console.log(
                    "T05_E4_IMPACT_CERTAINTY=KNOWN",
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
                      "T05 E4 runtime session disappeared before receipt persistence.",
                    );
                  }

                  if (
                    receiptPersistRequestCount !==
                      0
                  ) {
                    throw new Error(
                      "T05 E4 refused a second receipt persistence request.",
                    );
                  }

                  receiptPersistRequestCount +=
                    1;
                  receiptPersistAttempted =
                    true;

                  console.log(
                    "T05_E4_RECEIPT_PERSIST_ATTEMPTED=YES",
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
                      "T05 E4 receipt write acknowledgement does not match the certified receipt.",
                    );
                  }

                  console.log(
                    "T05_E4_RECEIPT_PERSIST_STATUS=CREATED",
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
                      "T05 E4 runtime session disappeared before receipt readback.",
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
        `T05_E4_CERTIFICATION_OUTCOME=${result.outcome}`,
      );
      console.log(
        `T05_E4_FINAL_ACTION_STATE=${result.record.state}`,
      );
      console.log(
        `T05_E4_EVENT_COUNT=${result.events.length}`,
      );
      console.log(
        `T05_E4_PROOF_RESULT_COUNT=${result.proofResults.length}`,
      );
      console.log(
        `T05_E4_CERTIFICATION_REASON=${result.reason ?? "NONE"}`,
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
        physicalResumeRequestCount !==
          1 ||
        receiptPersistRequestCount !==
          1 ||
        reviewedPreflight ===
          null ||
        stateBDigest.length !==
          64
      ) {
        throw new Error(
          `T05 E4 generic certification did not close VERIFIED. Reason=${result.reason ?? "none"}`,
        );
      }

      if (
        result.receipt.receiptId !==
          RECEIPT_ID ||
        result.receipt.actionId !==
          ACTION_ID ||
        result.receipt.contractId !==
          T05_TASK_RESUME_CONTRACT_ID ||
        result.receipt.contractVersion !==
          1 ||
        result.receipt.target.canonicalId !==
          T05_TASK_TARGET_CANONICAL_ID ||
        result.receipt.proofResults.length !==
          4 ||
        result.receipt.recovery.class !==
          "REVERSIBLE" ||
        result.receipt.recovery.available !==
          true ||
        result.receipt.recovery.recoveryActionType !==
          "TASK_SUSPEND"
      ) {
        throw new Error(
          "T05 E4 receipt identity/contract/proof/recovery binding differs from the frozen T05 action.",
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
            T05_TASK_TARGET_CANONICAL_ID,
        });

      if (
        !sameReceiptSet(
          targetHistoryAfter,
          [
            T04_RECEIPT_ID,
            RECEIPT_ID,
          ],
        )
      ) {
        throw new Error(
          "T05 E4 target history does not contain exactly T04 + T05 after certification.",
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
        !t05PoststateMatches(
          finalStateB,
          reviewedPreflight,
        ) ||
        digestCanonicalJson(
          finalStateB,
        ) !==
          stateBDigest
      ) {
        throw new Error(
          "T05 E4 State B changed during receipt persistence/readback.",
        );
      }

      certificationFullyClosed =
        true;

      console.log(
        `T05_E4_RECEIPT_SHA256=${result.receipt.receiptSha256}`,
      );
      console.log(
        `T05_E4_RECEIPT_TERMINAL_EVENT_HASH=${result.receipt.terminalEventHash}`,
      );
      console.log(
        `T05_E4_RECEIPT_EXECUTION_DIGEST=${result.receipt.executionDigest}`,
      );
      console.log(
        `T05_E4_RECEIPT_EVIDENCE_DIGEST=${result.receipt.evidenceDigest}`,
      );
      console.log(
        "T05_E4_GENERIC_RECEIPT_EXACT_READBACK=PASS",
      );
      console.log(
        "T05_E4_GENERIC_RECEIPT_SECOND_FRESH_READBACK=PASS",
      );
      console.log(
        "T05_E4_TARGET_HISTORY_POSTSTATE_COUNT=2",
      );
      console.log(
        "T05_E4_ALL_PREDECESSOR_RECEIPTS_UNCHANGED=PASS",
      );
      console.log(
        "T05_E4_ACTION_VERIFIED_AFTER_READBACK_ONLY=PASS",
      );
      console.log(
        "T05_E4_FIXTURE_PRESERVED_IN_VERIFIED_RESUMED_STATE=YES",
      );
      console.log(
        "T05_E4_TASK_SUSPEND_PERFORMED=NO",
      );
      console.log(
        "T05_E4_FIXTURE_DELETE_PERFORMED=NO",
      );

      commandComplete =
        true;
    }
  } finally {
    if (
      businessDispatchStarted &&
      !certificationFullyClosed
    ) {
      console.log(
        "T05_E4_POST_DISPATCH_FORENSIC_STATE_PRESERVED=YES",
      );
      console.log(
        "T05_E4_AUTOMATIC_RETRY_AFTER_FAILED_DISPATCH=NO",
      );
      console.log(
        "T05_E4_AUTOMATIC_RECOVERY_AFTER_FAILED_DISPATCH=NO",
      );
      console.log(
        "T05_E4_AUTOMATIC_TASK_SUSPEND_AFTER_FAILED_DISPATCH=NO",
      );
      console.log(
        "T05_E4_AUTOMATIC_FIXTURE_DELETE_AFTER_FAILED_DISPATCH=NO",
      );
      console.log(
        `T05_E4_RECEIPT_PERSIST_MAY_REQUIRE_RECONCILIATION=${receiptPersistAttempted ? "YES" : "NO"}`,
      );
    }

    console.log(
      `T05_E4_TASK_RESUME_REQUEST_COUNT_FINAL=${physicalResumeRequestCount}`,
    );
    console.log(
      `T05_E4_RECEIPT_PERSIST_REQUEST_COUNT_FINAL=${receiptPersistRequestCount}`,
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
        "T05_E4_ACTION_ESCALATION_LOGOUT=PASS",
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
        "T05_E4_RUNTIME_LOGOUT=PASS",
      );
    }

    console.log(
      "T05_E4_RUNTIME_PASSWORD_STORED=NO",
    );
    console.log(
      "T05_E4_ACTION_ESCALATION_JWT_STORED=NO",
    );
    console.log(
      "T05_E4_RUNTIME_JWT_STORED=NO",
    );
    console.log(
      `T05_E4_COMMAND_COMPLETE=${commandComplete ? "YES" : "NO"}`,
    );
  }

  if (
    MODE ===
      "EXECUTE"
  ) {
    if (
      !certificationFullyClosed ||
      !commandComplete ||
      physicalResumeRequestCount !==
        1 ||
      receiptPersistRequestCount !==
        1
    ) {
      throw new Error(
        "T05 E4 did not reach genuine generic-runner verified receipt closure.",
      );
    }

    console.log(
      "T05_E4_GENERIC_RUNNER_CERTIFICATION=PASS",
    );
    console.log(
      "T05_E4_RECEIPT_16_DURABLE_CLOSURE=PASS",
    );
  } else {
    if (
      !commandComplete ||
      physicalResumeRequestCount !==
        0 ||
      receiptPersistRequestCount !==
        0
    ) {
      throw new Error(
        "T05 E4 PRECHECK performed an unauthorized mutation.",
      );
    }
  }
}

void reconcileUnknownT05TaskResume;
