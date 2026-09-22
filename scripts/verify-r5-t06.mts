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
  T06_EXPECTED_FIXTURE_PROJECTION_DIGEST,
  T06_TASK_DELETE_ACTION_ID,
  T06_TASK_DELETE_CONTRACT_ID,
  T06_TASK_DELETE_DELTA_SUMMARY,
  T06_TASK_DELETE_LEGACY_CLEANUP_ALIAS,
  T06_TASK_TARGET_CANONICAL_ID,
  buildT06TaskDeleteProofResults,
  certifyT06TaskDeleteAction,
  t06AuthorizedDeleteRequestDigest,
  t06PoststateMatches,
  t06PrestateMatches,
  t06TaskDeleteIntent,
  type T06TaskDeletePreflight,
} from "../src/lib/actions/tasks/task-delete";

import {
  T06_TASK_CLASS,
  T06_TASK_NAME,
  T06_TASK_PATH,
  T06_TASK_ROLE,
  deleteT06Task,
  listT06Tasks,
  readT06Task,
  readT06TaskHistory,
  readT06TaskManagerStatus,
  readT06UpcomingTasks,
} from "../src/lib/iris/task-delete-action-transport";

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
  process.env.MERIDIAN_R5_F_T06_LIVE_DELETE_ALLOWED ===
  "YES";

const MODE =
  process.env.MERIDIAN_R5_F_T06_MODE ??
  "PRECHECK";

const FIXTURE_GENERATION =
  "5d1764a2-1cdf-4fc6-9bb9-eaf40ec62144";

const EXPECTED_TASK_ID =
  1006 as const;

const EXPECTED_STATE_A_DIGEST =
  "CF2301CD71109BA5AF328A80F17CBD460BD602BE34A3D61B6101425684D6408A";

const EXPECTED_REQUEST_TEMPLATE_DIGEST =
  "D766FEFC8BA1DFD83C822B76585E14CE9ABAC427703916D4CCEA5519A2230A7D";

const EXPECTED_AUTHORIZED_REQUEST_DIGEST =
  "DB78713EC5FCB42B8BD7BB1B71957A39A8DC1C0BB4088C387784434F5CE5B814";

const EXPECTED_DESIGN_DIGEST =
  "D5BE04876E289DABE97650F1B83D46AC74970D7126800C7A7493DF484AB9042D";

const ACTION_ID =
  "t06-task-delete-r5-f-001";

const RECEIPT_ID =
  "meridian-t06-task-delete-r5-f-001";

const T04_RECEIPT_ID =
  "meridian-t04-task-suspend-r5-d-001";

const T05_RECEIPT_ID =
  "meridian-t05-task-resume-r5-e-001";

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
    Object.freeze({
      receiptId:
        T05_RECEIPT_ID,
      sha256:
        "A01BB92257FF3AB95FFA8BC2736525398143EB3838483FFA67BF18EDF3604B61",
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
        (item) =>
          item.receiptId,
      ).sort(),
    ) ===
      JSON.stringify(
        [...expected].sort(),
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
    !Array.isArray(value)
  );
}

function resultObject(
  value:
    unknown,
): Record<string, unknown> {
  if (
    !isRecord(value)
  ) {
    throw new Error(
      "T06 F4 login response is not an object.",
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
    !isRecord(result)
  ) {
    throw new Error(
      "T06 F4 login result is not an object.",
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
              T06_TASK_ROLE,
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
      `T06 F4 explicit action-role login failed HTTP ${response.status}.`,
    );
  }

  const parsed =
    text.trim().length ===
      0
      ? {}
      : JSON.parse(text);

  const result =
    resultObject(parsed);

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
      "T06 F4 action-role login did not return both tokens.",
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
      `T06 F4 native probe omitted ${name}.`,
    );
  }

  const value =
    Number.parseInt(
      match[1],
      10,
    );

  if (
    !Number.isSafeInteger(value)
  ) {
    throw new Error(
      `T06 F4 native probe returned invalid ${name}.`,
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
    boolean | null;
}> {
  const source =
    [
      'zn "%SYS"',
      'set stmt=##class(%SQL.Statement).%New()',
      'set sc=stmt.%Prepare("SELECT ID,Suspended FROM %SYS.Task WHERE Name = ?")',
      'if $SYSTEM.Status.IsError(sc) write "T06N_PREPARE_OK=0",! halt 31',
      'write "T06N_PREPARE_OK=1",!',
      `set rs=stmt.%Execute("${T06_TASK_NAME}")`,
      'set count=0,id=0,suspended=-1',
      'for  quit:\'rs.%Next()  set count=count+1,id=rs.%Get("ID"),suspended=rs.%Get("Suspended")',
      'write "T06N_COUNT="_count,!',
      'write "T06N_ID="_id,!',
      'write "T06N_SUSPENDED="_suspended,!',
      'halt',
      '',
    ].join("\n");

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
      "T06N_PREPARE_OK=1",
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
      `T06 F4 native %SYS.Task read failed. ${output}`,
    );
  }

  const count =
    markerInteger(
      output,
      "T06N_COUNT",
    );

  const taskId =
    markerInteger(
      output,
      "T06N_ID",
    );

  const suspendedRaw =
    markerInteger(
      output,
      "T06N_SUSPENDED",
    );

  if (
    count ===
      0
  ) {
    if (
      taskId !==
        0 ||
      suspendedRaw !==
        -1
    ) {
      throw new Error(
        `T06 F4 absent native state is malformed count=${count} id=${taskId} suspended=${suspendedRaw}.`,
      );
    }

    return Object.freeze({
      count:
        0,

      taskId:
        0,

      suspended:
        null,
    });
  }

  if (
    count !==
      1 ||
    taskId !==
      EXPECTED_TASK_ID ||
    (
      suspendedRaw !==
        0 &&
      suspendedRaw !==
        1
    )
  ) {
    throw new Error(
      `T06 F4 native identity/state mismatch count=${count} id=${taskId} suspended=${suspendedRaw}.`,
    );
  }

  return Object.freeze({
    count,
    taskId,
    suspended:
      suspendedRaw ===
        1,
  });
}

function frozenRequestTemplate(): Readonly<Record<string, unknown>> {
  return Object.freeze({
    method:
      "DELETE",

    path:
      "/v2/task",

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
      T06_TASK_DELETE_ACTION_ID,

    actionIdAliases:
      Object.freeze([
        T06_TASK_DELETE_LEGACY_CLEANUP_ALIAS,
      ]),

    authorityMode:
      "EXPLICIT_ESCALATION_ROLE",

    authorityRole:
      T06_TASK_ROLE,

    automaticRetryAfterDispatch:
      false,

    fixtureGeneration:
      FIXTURE_GENERATION,

    historyPolicy:
      "PREDELETE_OBSERVE_POSTDELETE_NOT_REQUIRED",

    legacyCleanupAliasPolicy:
      "ACCEPT_ALIAS_DO_NOT_REWRITE_T05_HISTORY",

    officialMutation:
      frozenRequestTemplate(),

    prestate:
      Object.freeze({
        authoritativeExists:
          true,

        authoritativeSuspended:
          false,

        sameTaskId:
          true,

        t05VerifiedRequired:
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
      null,

    requiredAuthority:
      "%Admin_Task:U",

    reversibility:
      "IRREVERSIBLE",

    risk:
      "HIGH",

    standingRuntimeBroadened:
      false,

    stateB:
      Object.freeze({
        authoritativeExists:
          false,

        classPreserved:
          true,

        rolePreserved:
          true,

        targetAbsentFromTaskInventory:
          true,

        zeroExecutionSideEffect:
          true,
      }),

    successfulHttpStatus:
      200,

    targetCanonicalId:
      T06_TASK_TARGET_CANONICAL_ID,
  });
}

function stateAMaterial(
  preflight:
    T06TaskDeletePreflight,
): Readonly<Record<string, unknown>> {
  const task =
    preflight.matchingTask;

  const summary =
    preflight.matchingSummary;

  if (
    task ===
      null ||
    summary ===
      null
  ) {
    throw new Error(
      "T06 F4 cannot project State A from a missing task.",
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
      summary.suspended,

    TaskClass:
      task.taskClass,

    TimePeriod:
      normalizedTimePeriod,
  });
}

function assertF1FrozenAuthority(
  preflight:
    T06TaskDeletePreflight,
): void {
  if (
    !t06PrestateMatches(
      preflight,
    )
  ) {
    throw new Error(
      "T06 F4 live product preflight no longer matches the exact resumed State A contract.",
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
    t06AuthorizedDeleteRequestDigest(
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
    preflight.authoritativeExists !==
      true ||
    preflight.authoritativeSuspended !==
      false ||
    preflight.predecessorT05ReceiptVerified !==
      true ||
    preflight.matchingTaskCount !==
      1 ||
    preflight.matchingTask?.id !==
      EXPECTED_TASK_ID ||
    preflight.matchingSummary?.id !==
      EXPECTED_TASK_ID ||
    preflight.taskInventoryCount !==
      17 ||
    preflight.matchingUpcomingCount !==
      0 ||
    preflight.matchingHistoryCount !==
      preflight.matchingHistory.length ||
    preflight.taskManagerStatus !==
      "Running"
  ) {
    throw new Error(
      "T06 F4 failed to reproduce the frozen F1 authority packet and live resumed prestate.",
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
        `T06 F4 historical predecessor changed: ${predecessor.receiptId}.`,
      );
    }

    console.log(
      `T06_F4_PREDECESSOR_RECEIPT_SHA256=${receipt.receiptId}|${receipt.receiptSha256}`,
    );
  }
}

if (
  USERNAME !==
    "meridian.runtime"
) {
  throw new Error(
    "T06 F4 is pinned to meridian.runtime.",
  );
}

if (
  MODE !==
    "PRECHECK" &&
  MODE !==
    "EXECUTE"
) {
  throw new Error(
    "T06 F4 mode must be PRECHECK or EXECUTE.",
  );
}

if (
  !LIVE_GATE
) {
  console.log(
    "===== MERIDIAN R5-F4 CLOSED LIVE GATE =====",
  );

  console.log(
    "T06_F4_LIVE_GATE=DENIED",
  );

  console.log(
    "T06_F4_IRIS_CONNECTION_PERFORMED=NO",
  );

  console.log(
    "T06_F4_NATIVE_TASK_READ_PERFORMED=NO",
  );

  console.log(
    "T06_F4_TASK_DELETE_PERFORMED=NO",
  );

  console.log(
    "T06_F4_RECEIPT_WRITE_PERFORMED=NO",
  );

  console.log(
    "T06_F4_AUTOMATIC_RETRY_AUTHORIZED=NO",
  );

  console.log(
    "T06_F4_AUTOMATIC_RECOVERY_AUTHORIZED=NO",
  );

  console.log(
    "T06_F4_LIVE_VERIFIER_ARMED=YES",
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
      "T06 F4 runtime password is missing from ephemeral stdin.",
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

  let predecessorT05Verified =
    false;

  let reviewedPreflight:
    T06TaskDeletePreflight |
    null =
      null;

  let physicalDeleteRequestCount =
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
    t06TaskDeleteIntent(
      FIXTURE_GENERATION,
      EXPECTED_TASK_ID,
    );

  try {
    console.log(
      "===== MERIDIAN R5-F4 LIVE VERIFIER =====",
    );

    console.log(
      `T06_F4_MODE=${MODE}`,
    );

    console.log(
      `T06_F4_TASK_DELETE_AUTHORIZED=${MODE === "EXECUTE" ? "YES" : "NO"}`,
    );

    console.log(
      "T06_F4_TASK_DELETE_MAXIMUM=1",
    );

    console.log(
      "T06_F4_TASK_RESUME_AUTHORIZED=NO",
    );

    console.log(
      "T06_F4_TASK_SUSPEND_AUTHORIZED=NO",
    );

    console.log(
      `T06_F4_RECEIPT_WRITE_AUTHORIZED=${MODE === "EXECUTE" ? "YES" : "NO"}`,
    );

    console.log(
      "T06_F4_AUTOMATIC_RETRY_AUTHORIZED=NO",
    );

    console.log(
      "T06_F4_AUTOMATIC_RECOVERY_AUTHORIZED=NO",
    );

    console.log(
      `T06_F4_CONTRACT_ID=${T06_TASK_DELETE_CONTRACT_ID}`,
    );

    console.log(
      `T06_F4_EXPECTED_TASK_ID=${EXPECTED_TASK_ID}`,
    );

    console.log(
      `T06_F4_EXPECTED_GENERATION=${FIXTURE_GENERATION}`,
    );

    console.log(
      `T06_F4_EXPECTED_STATE_A_DIGEST=${EXPECTED_STATE_A_DIGEST}`,
    );

    console.log(
      `T06_F4_EXPECTED_REQUEST_TEMPLATE_DIGEST=${EXPECTED_REQUEST_TEMPLATE_DIGEST}`,
    );

    console.log(
      `T06_F4_EXPECTED_DESIGN_DIGEST=${EXPECTED_DESIGN_DIGEST}`,
    );

    console.log(
      `T06_F4_EXPECTED_AUTHORIZED_REQUEST_DIGEST=${EXPECTED_AUTHORIZED_REQUEST_DIGEST}`,
    );

    console.log(
      `T06_F4_RECEIPT_ID=${RECEIPT_ID}`,
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
      "T06_F4_RUNTIME_LOGIN_HTTP=200",
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
        "T06 F4 pinned runtime identity/version guard failed.",
      );
    }

    console.log(
      "T06_F4_RUNTIME_IDENTITY_VERSION=PASS",
    );

    actionSession =
      await loginActionRole(
        password,
      );

    console.log(
      "T06_F4_EXPLICIT_ACTION_ESCALATION_LOGIN_HTTP=200",
    );

    console.log(
      `T06_F4_AUTHORITY_ROLE=${T06_TASK_ROLE}`,
    );

    console.log(
      "T06_F4_STANDING_RUNTIME_AUTHORITY_BROADENED=NO",
    );

    await readAndVerifyPredecessors(
      runtimeSession.accessToken,
    );

    predecessorT05Verified =
      true;

    console.log(
      `T06_F4_PREDECESSOR_RECEIPT_COUNT=${PREDECESSORS.length}`,
    );

    console.log(
      "T06_F4_ALL_PREDECESSOR_RECEIPTS_PRECHECK=PASS",
    );

    const targetHistoryBefore =
      await readTargetActionHistory({
        baseUrl:
          HISTORY_BASE,

        accessToken:
          runtimeSession.accessToken,

        targetCanonicalId:
          T06_TASK_TARGET_CANONICAL_ID,
      });

    if (
      !sameReceiptSet(
        targetHistoryBefore,
        [
          T04_RECEIPT_ID,
          T05_RECEIPT_ID,
        ],
      )
    ) {
      throw new Error(
        "T06 F4 target history must contain exactly T04 + T05 before T06.",
      );
    }

    console.log(
      "T06_F4_TARGET_HISTORY_PRESTATE_COUNT=2",
    );

    console.log(
      `T06_F4_TARGET_HISTORY_PRESTATE_RECEIPTS=${T04_RECEIPT_ID}|${T05_RECEIPT_ID}`,
    );

    const readFreshPreflight =
      async (): Promise<T06TaskDeletePreflight> => {
        const session =
          actionSession;

        if (
          session ===
            null
        ) {
          throw new Error(
            "T06 F4 action escalation session is unavailable.",
          );
        }

        const [
          tasks,
          upcoming,
          manager,
        ] =
          await Promise.all([
            listT06Tasks({
              apiBaseUrl:
                API_BASE,

              accessToken:
                session.accessToken,
            }),

            readT06UpcomingTasks({
              apiBaseUrl:
                API_BASE,

              accessToken:
                session.accessToken,
            }),

            readT06TaskManagerStatus({
              apiBaseUrl:
                API_BASE,

              accessToken:
                session.accessToken,
            }),
          ]);

        const matches =
          tasks.filter(
            (candidate) =>
              candidate.name ===
                T06_TASK_NAME,
          );

        let task:
          T06TaskDeletePreflight[
            "matchingTask"
          ] =
          null;

        let summary:
          T06TaskDeletePreflight[
            "matchingSummary"
          ] =
          null;

        let history:
          T06TaskDeletePreflight[
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
              "T06 F4 exact-name inventory row has no positive id.",
            );
          }

          summary =
            only;

          [
            task,
            history,
          ] =
            await Promise.all([
              readT06Task({
                apiBaseUrl:
                  API_BASE,

                accessToken:
                  session.accessToken,

                taskId:
                  only.id,
              }),

              readT06TaskHistory({
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
            (row) =>
              row.name ===
                T06_TASK_NAME ||
              row.id ===
                EXPECTED_TASK_ID,
          );

        const native =
          readNativeTaskState();

        return Object.freeze({
          schemaVersion:
            "meridian.task-delete-preflight.v1" as const,

          expectedFixtureGeneration:
            FIXTURE_GENERATION,

          taskName:
            T06_TASK_NAME,

          expectedTaskId:
            EXPECTED_TASK_ID,

          expectedFixtureProjectionDigest:
            T06_EXPECTED_FIXTURE_PROJECTION_DIGEST,

          authorizedDeleteRequestDigest:
            t06AuthorizedDeleteRequestDigest(
              EXPECTED_TASK_ID,
            ),

          predecessorT05ReceiptVerified:
            predecessorT05Verified,

          authoritativeExists:
            native.count ===
              1,

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
            "DELETE /v2/task" as const,

          requiredAuthority:
            "%Admin_Task:U" as const,

          authorityRole:
            T06_TASK_ROLE,

          authorityMode:
            "EXPLICIT_ESCALATION_ROLE" as const,
        });
      };

    const independentPreflight =
      await readFreshPreflight();

    assertF1FrozenAuthority(
      independentPreflight,
    );

    console.log(
      `T06_F4_GENERIC_PREFLIGHT_DIGEST=${digestCanonicalJson(
        independentPreflight,
      )}`,
    );

    console.log(
      "T06_F4_F1_STATE_A_REVALIDATION=PASS",
    );

    console.log(
      "T06_F4_F1_REQUEST_TEMPLATE_REVALIDATION=PASS",
    );

    console.log(
      "T06_F4_F1_DESIGN_REVALIDATION=PASS",
    );

    console.log(
      "T06_F4_NATIVE_EXISTS_PRESTATE=1",
    );

    console.log(
      "T06_F4_NATIVE_SUSPENDED_PRESTATE=0",
    );

    if (
      MODE ===
        "PRECHECK"
    ) {
      console.log(
        "T06_F4_TASK_DELETE_PERFORMED=NO",
      );

      console.log(
        "T06_F4_RECEIPT_WRITE_PERFORMED=NO",
      );

      console.log(
        "T06_F4_PRECHECK=PASS",
      );

      commandComplete =
        true;
    } else {
      const originalFetch =
        globalThis.fetch.bind(
          globalThis,
        );

      const expectedDeleteUrl =
        API_BASE.replace(
          /\/+$/,
          "",
        ) +
        T06_TASK_PATH +
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
              "DELETE"
          ) {
            if (
              url !==
                expectedDeleteUrl
            ) {
              throw new Error(
                `T06 F4 refused an unexpected physical DELETE target: ${url}`,
              );
            }

            if (
              init?.body !==
                undefined &&
              init.body !==
                null
            ) {
              throw new Error(
                "T06 F4 refused a physical DELETE with a request body.",
              );
            }

            if (
              physicalDeleteRequestCount !==
                0
            ) {
              throw new Error(
                "T06 F4 refused a second physical DELETE request before dispatch.",
              );
            }

            physicalDeleteRequestCount +=
              1;

            businessDispatchStarted =
              true;

            console.log(
              "T06_F4_TASK_DELETE_DISPATCHED=YES",
            );
          }

          return originalFetch(
            request,
            init,
          );
        };

      const result =
        await certifyT06TaskDeleteAction(
          {
            intent,

            actionId:
              ACTION_ID,

            receiptId:
              RECEIPT_ID,

            logicalActor:
              "R5-F frozen T06 Task Delete invocation",

            irisRuntimeUser:
              USERNAME,
          },
          {
            contract: {
              readFreshPreflight:
                async () =>
                  readFreshPreflight(),

              executeDelete:
                async () => {
                  const session =
                    actionSession;

                  if (
                    session ===
                      null
                  ) {
                    throw new Error(
                      "T06 F4 action session disappeared before delete dispatch.",
                    );
                  }

                  console.log(
                    "T06_F4_TASK_DELETE_NOW_AUTHORIZED=YES",
                  );

                  console.log(
                    "T06_F4_TASK_DELETE_TARGET=/v2/task?id=1006",
                  );

                  console.log(
                    "T06_F4_TASK_DELETE_BODY=NONE",
                  );

                  const mutation =
                    await deleteT06Task({
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
                    `T06_F4_TASK_DELETE_STATUS=${mutation.status}`,
                  );

                  console.log(
                    `T06_F4_TRANSPORT_MUTATION_REQUEST_COUNT=${mutation.mutationRequestCount}`,
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
                    physicalDeleteRequestCount !==
                      1
                  ) {
                    throw new Error(
                      "T06 F4 proof collection requires frozen reviewed State A and exactly one physical DELETE.",
                    );
                  }

                  const current =
                    await readFreshPreflight();

                  const fullPoststateVerified =
                    t06PoststateMatches(
                      current,
                      reviewed,
                    );

                  const httpDeleteVerified =
                    execution.httpDeleteResponseVerified &&
                    execution.deleteStatus ===
                      200 &&
                    execution.mutationRequestCount ===
                      1 &&
                    physicalDeleteRequestCount ===
                      1;

                  const taskAbsenceVerified =
                    fullPoststateVerified &&
                    reviewed.authoritativeExists ===
                      true &&
                    reviewed.authoritativeSuspended ===
                      false &&
                    current.authoritativeExists ===
                      false &&
                    current.authoritativeSuspended ===
                      null &&
                    current.matchingTaskCount ===
                      0 &&
                    current.matchingTask ===
                      null &&
                    current.matchingSummary ===
                      null &&
                    current.taskInventoryCount ===
                      reviewed.taskInventoryCount -
                        1 &&
                    current.matchingUpcomingCount ===
                      0 &&
                    current.taskManagerStatus ===
                      reviewed.taskManagerStatus;

                  stateBDigest =
                    digestCanonicalJson(
                      current,
                    );

                  console.log(
                    `T06_F4_STATE_B_DIGEST=${stateBDigest}`,
                  );

                  if (
                    taskAbsenceVerified
                  ) {
                    console.log(
                      "T06_F4_AUTHORITATIVE_TASK_ABSENCE=PASS",
                    );
                  }

                  if (
                    httpDeleteVerified
                  ) {
                    console.log(
                      "T06_F4_HTTP_DELETE=PASS",
                    );
                  }

                  return buildT06TaskDeleteProofResults({
                    observedAtUtc:
                      new Date().toISOString(),

                    httpDeleteVerified,

                    taskAbsenceVerified,

                    httpSourceReference:
                      httpDeleteVerified
                        ? "IRIS DELETE /v2/task?id=1006:200:requests=1:body=none"
                        : null,

                    taskStateSourceReference:
                      taskAbsenceVerified
                        ? `Native %SYS.Task absence + SysAdmin inventory absence:state-b-digest=${stateBDigest}`
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
                      "T06 F4 runtime session disappeared during review.",
                    );
                  }

                  if (
                    !t06PrestateMatches(
                      review.preflight,
                    ) ||
                    review.impact.certainty !==
                      "KNOWN" ||
                    review.expectedDelta.summary !==
                      T06_TASK_DELETE_DELTA_SUMMARY
                  ) {
                    throw new Error(
                      "T06 F4 generic runner review does not match the frozen delete contract.",
                    );
                  }

                  assertF1FrozenAuthority(
                    review.preflight,
                  );

                  const reviewTargetHistory =
                    await readTargetActionHistory({
                      baseUrl:
                        HISTORY_BASE,

                      accessToken:
                        session.accessToken,

                      targetCanonicalId:
                        T06_TASK_TARGET_CANONICAL_ID,
                    });

                  if (
                    !sameReceiptSet(
                      reviewTargetHistory,
                      [
                        T04_RECEIPT_ID,
                        T05_RECEIPT_ID,
                      ],
                    )
                  ) {
                    throw new Error(
                      "T06 F4 review observed unexpected target-history receipts before T06.",
                    );
                  }

                  reviewedPreflight =
                    review.preflight;

                  console.log(
                    `T06_F4_REVIEWED_GENERIC_PREFLIGHT_DIGEST=${review.preflightDigest}`,
                  );

                  console.log(
                    `T06_F4_RECOMPUTED_F1_STATE_A_DIGEST=${digestCanonicalJson(
                      stateAMaterial(
                        review.preflight,
                      ),
                    )}`,
                  );

                  console.log(
                    `T06_F4_RECOMPUTED_F1_REQUEST_TEMPLATE_DIGEST=${digestCanonicalJson(
                      frozenRequestTemplate(),
                    )}`,
                  );

                  console.log(
                    `T06_F4_RECOMPUTED_F1_DESIGN_DIGEST=${digestCanonicalJson(
                      frozenDesignMaterial(),
                    )}`,
                  );

                  console.log(
                    "T06_F4_F1_REVIEW_BINDING=PASS",
                  );

                  console.log(
                    "T06_F4_REVIEWED_DELTA=ONE_IRREVERSIBLE_FIXTURE_DELETE_ONLY",
                  );

                  console.log(
                    "T06_F4_REVIEWED_MUTATION=DELETE_/v2/task?id=1006_BODY_NONE_ONLY",
                  );

                  console.log(
                    "T06_F4_IMPACT_CERTAINTY=KNOWN",
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
                      "T06 F4 runtime session disappeared before receipt persistence.",
                    );
                  }

                  if (
                    receiptPersistRequestCount !==
                      0
                  ) {
                    throw new Error(
                      "T06 F4 refused a second receipt persistence request.",
                    );
                  }

                  receiptPersistRequestCount +=
                    1;

                  receiptPersistAttempted =
                    true;

                  console.log(
                    "T06_F4_RECEIPT_PERSIST_ATTEMPTED=YES",
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
                      "T06 F4 receipt write acknowledgement does not match the certified receipt.",
                    );
                  }

                  console.log(
                    "T06_F4_RECEIPT_PERSIST_STATUS=CREATED",
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
                      "T06 F4 runtime session disappeared before receipt readback.",
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
        `T06_F4_CERTIFICATION_OUTCOME=${result.outcome}`,
      );

      console.log(
        `T06_F4_FINAL_ACTION_STATE=${result.record.state}`,
      );

      console.log(
        `T06_F4_EVENT_COUNT=${result.events.length}`,
      );

      console.log(
        `T06_F4_PROOF_RESULT_COUNT=${result.proofResults.length}`,
      );

      console.log(
        `T06_F4_CERTIFICATION_REASON=${result.reason ?? "NONE"}`,
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
            (event) =>
              event.eventType,
          ),
        ) !==
          JSON.stringify(
            expectedEventTypes,
          ) ||
        result.proofResults.length !==
          2 ||
        !result.proofResults.every(
          (item) =>
            item.status ===
              "PASS",
        ) ||
        physicalDeleteRequestCount !==
          1 ||
        receiptPersistRequestCount !==
          1 ||
        reviewedPreflight ===
          null ||
        stateBDigest.length !==
          64
      ) {
        throw new Error(
          `T06 F4 generic certification did not close VERIFIED. Reason=${result.reason ?? "none"}`,
        );
      }

      if (
        result.receipt.receiptId !==
          RECEIPT_ID ||
        result.receipt.actionId !==
          ACTION_ID ||
        result.receipt.contractId !==
          T06_TASK_DELETE_CONTRACT_ID ||
        result.receipt.contractVersion !==
          1 ||
        result.receipt.target.canonicalId !==
          T06_TASK_TARGET_CANONICAL_ID ||
        result.receipt.proofResults.length !==
          2 ||
        result.receipt.recovery.class !==
          "IRREVERSIBLE" ||
        result.receipt.recovery.available !==
          false ||
        result.receipt.recovery.recoveryActionType !==
          null
      ) {
        throw new Error(
          "T06 F4 receipt identity/contract/proof/recovery binding differs from the frozen T06 action.",
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
            T06_TASK_TARGET_CANONICAL_ID,
        });

      if (
        !sameReceiptSet(
          targetHistoryAfter,
          [
            T04_RECEIPT_ID,
            T05_RECEIPT_ID,
            RECEIPT_ID,
          ],
        )
      ) {
        throw new Error(
          "T06 F4 target history does not contain exactly T04 + T05 + T06 after certification.",
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
        !t06PoststateMatches(
          finalStateB,
          reviewedPreflight,
        ) ||
        digestCanonicalJson(
          finalStateB,
        ) !==
          stateBDigest
      ) {
        throw new Error(
          "T06 F4 State B changed during receipt persistence/readback.",
        );
      }

      certificationFullyClosed =
        true;

      console.log(
        `T06_F4_RECEIPT_SHA256=${result.receipt.receiptSha256}`,
      );

      console.log(
        `T06_F4_RECEIPT_TERMINAL_EVENT_HASH=${result.receipt.terminalEventHash}`,
      );

      console.log(
        `T06_F4_RECEIPT_EXECUTION_DIGEST=${result.receipt.executionDigest}`,
      );

      console.log(
        `T06_F4_RECEIPT_EVIDENCE_DIGEST=${result.receipt.evidenceDigest}`,
      );

      console.log(
        "T06_F4_GENERIC_RECEIPT_EXACT_READBACK=PASS",
      );

      console.log(
        "T06_F4_GENERIC_RECEIPT_SECOND_FRESH_READBACK=PASS",
      );

      console.log(
        "T06_F4_TARGET_HISTORY_POSTSTATE_COUNT=3",
      );

      console.log(
        "T06_F4_ALL_PREDECESSOR_RECEIPTS_UNCHANGED=PASS",
      );

      console.log(
        "T06_F4_ACTION_VERIFIED_AFTER_READBACK_ONLY=PASS",
      );

      console.log(
        "T06_F4_FIXTURE_ABSENT_AFTER_VERIFIED_DELETE=YES",
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
        "T06_F4_POST_DISPATCH_FORENSIC_STATE_PRESERVED=YES",
      );

      console.log(
        "T06_F4_AUTOMATIC_RETRY_AFTER_FAILED_DISPATCH=NO",
      );

      console.log(
        "T06_F4_AUTOMATIC_RECOVERY_AFTER_FAILED_DISPATCH=NO",
      );

      console.log(
        `T06_F4_RECEIPT_PERSIST_MAY_REQUIRE_RECONCILIATION=${receiptPersistAttempted ? "YES" : "NO"}`,
      );
    }

    console.log(
      `T06_F4_TASK_DELETE_REQUEST_COUNT_FINAL=${physicalDeleteRequestCount}`,
    );

    console.log(
      `T06_F4_RECEIPT_PERSIST_REQUEST_COUNT_FINAL=${receiptPersistRequestCount}`,
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
        "T06_F4_ACTION_ESCALATION_LOGOUT=PASS",
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
        "T06_F4_RUNTIME_LOGOUT=PASS",
      );
    }

    console.log(
      "T06_F4_RUNTIME_PASSWORD_STORED=NO",
    );

    console.log(
      "T06_F4_ACTION_ESCALATION_JWT_STORED=NO",
    );

    console.log(
      "T06_F4_RUNTIME_JWT_STORED=NO",
    );

    console.log(
      `T06_F4_COMMAND_COMPLETE=${commandComplete ? "YES" : "NO"}`,
    );
  }

  if (
    MODE ===
      "EXECUTE"
  ) {
    if (
      !certificationFullyClosed ||
      !commandComplete ||
      physicalDeleteRequestCount !==
        1 ||
      receiptPersistRequestCount !==
        1
    ) {
      throw new Error(
        "T06 F4 did not reach genuine generic-runner verified receipt closure.",
      );
    }

    console.log(
      "T06_F4_GENERIC_RUNNER_CERTIFICATION=PASS",
    );

    console.log(
      "T06_F4_RECEIPT_17_DURABLE_CLOSURE=PASS",
    );
  } else {
    if (
      !commandComplete ||
      physicalDeleteRequestCount !==
        0 ||
      receiptPersistRequestCount !==
        0
    ) {
      throw new Error(
        "T06 F4 PRECHECK performed an unauthorized mutation.",
      );
    }
  }
}
