import {
  readFileSync,
} from "node:fs";

import {
  digestCanonicalJson,
} from "../src/lib/proof/digest";

import {
  T02_TASK_NAME,
  T02_TASK_ROLE,
  listT02Tasks,
  loginT02TaskSession,
  readT02Task,
  readT02TaskHistory,
  readT02TaskManagerStatus,
  readT02UpcomingTasks,
  t02PriorityUpdatePatch,
  t02TaskDefinition,
  type T02EscalatedSession,
} from "../src/lib/iris/task-update-action-transport";

import {
  T02_TASK_TARGET_CANONICAL_ID,
  T02_TASK_UPDATE_CONTRACT_ID,
  T02_TASK_UPDATE_PROOF_REQUIREMENTS,
  t02PoststateMatches,
  t02PrestateMatches,
  type T02TaskUpdatePreflight,
} from "../src/lib/actions/tasks/task-update";

import {
  actionReceiptV2FromGenericHistory,
} from "../src/lib/proof/action-history";

import {
  assertExactReceiptReadback,
} from "../src/lib/proof/receipt";

import {
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

const FIXTURE_GENERATION =
  "5c3c47bf-1f83-4f44-9ac3-8df53f8452ae";

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
  ]);

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
        `T02 B12-R1 historical predecessor changed: ${predecessor.receiptId}.`,
      );
    }

    console.log(
      `T02_B12_R1_PREDECESSOR_RECEIPT_SHA256=${receipt.receiptId}|${receipt.receiptSha256}`,
    );
  }
}

const EXPECTED_TASK_ID =
  1004 as const;

const EXPECTED_RECEIPT_ID =
  "meridian-t02-task-update-r5-b-001";

const EXPECTED_RECEIPT_SHA256 =
  "210E16BB4BCF8F21C8EA02439FBDF0C1FD9BB1535AC4D1F6805E5E50285131CF";

const EXPECTED_RECEIPT_TERMINAL_EVENT_HASH =
  "DE9110CE188A323B8806205B6FBAA91426823FA9DBB348DCE0DFD49D148AD6CB";

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
  USERNAME !==
    "meridian.runtime"
) {
  throw new Error(
    "T02 B12-R1 is pinned to meridian.runtime.",
  );
}

if (
  typeof input.password !==
    "string" ||
  input.password.length ===
    0
) {
  throw new Error(
    "T02 B12-R1 runtime password is missing from ephemeral stdin.",
  );
}

let runtimeSession:
  IrisSession |
  null =
    null;

let taskSession:
  T02EscalatedSession |
  null =
    null;

let completed =
  false;

try {
  console.log(
    "===== MERIDIAN R5-B12-R1 =====",
  );

  console.log(
    "===== READ-ONLY POST-DELETE RECONCILIATION + FINAL T02 VERIFIER =====",
  );

  console.log(
    "T02_B12_R1_FIXTURE_POST_AUTHORIZED=NO",
  );

  console.log(
    "T02_B12_R1_BUSINESS_PUT_AUTHORIZED=NO",
  );

  console.log(
    "T02_B12_R1_FIXTURE_DELETE_AUTHORIZED=NO",
  );

  console.log(
    "T02_B12_R1_RECEIPT_WRITE_AUTHORIZED=NO",
  );

  console.log(
    "T02_B12_R1_BUSINESS_MUTATION_REQUEST_COUNT=0",
  );

  console.log(
    `T02_B12_R1_CONTRACT_ID=${T02_TASK_UPDATE_CONTRACT_ID}`,
  );

  console.log(
    `T02_B12_R1_EXPECTED_TASK_ID=${EXPECTED_TASK_ID}`,
  );

  console.log(
    `T02_B12_R1_EXPECTED_GENERATION=${FIXTURE_GENERATION}`,
  );

  console.log(
    `T02_B12_R1_EXPECTED_RECEIPT_ID=${EXPECTED_RECEIPT_ID}`,
  );

  console.log(
    `T02_B12_R1_EXPECTED_RECEIPT_SHA256=${EXPECTED_RECEIPT_SHA256}`,
  );

  const historyRequirement =
    T02_TASK_UPDATE_PROOF_REQUIREMENTS.find(
      (
        requirement,
      ) =>
        requirement.plane ===
          "TASK_HISTORY",
    );

  if (
    T02_TASK_UPDATE_CONTRACT_ID !==
      "meridian.tasks.task-update.v2" ||
    historyRequirement?.requirementId !==
      "t02-task-history-stability"
  ) {
    throw new Error(
      "T02 B12-R1 corrected v2 contract/history requirement changed.",
    );
  }

  console.log(
    "T02_B12_R1_V2_HISTORY_REQUIREMENT=PASS",
  );

  runtimeSession =
    await loginIris({
      baseUrl:
        API_BASE,

      username:
        USERNAME,

      password:
        input.password,
    });

  console.log(
    "T02_B12_R1_RUNTIME_LOGIN_HTTP=200",
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
      "T02 B12-R1 pinned runtime identity/version guard failed.",
    );
  }

  console.log(
    "T02_B12_R1_RUNTIME_IDENTITY_VERSION=PASS",
  );

  taskSession =
    await loginT02TaskSession({
      apiBaseUrl:
        API_BASE,

      username:
        USERNAME,

      password:
        input.password,
    });

  console.log(
    "T02_B12_R1_EXPLICIT_TASK_ESCALATION_LOGIN_HTTP=200",
  );

  console.log(
    `T02_B12_R1_AUTHORITY_ROLE=${T02_TASK_ROLE}`,
  );

  console.log(
    "T02_B12_R1_STANDING_RUNTIME_AUTHORITY_BROADENED=NO",
  );

  await readAndVerifyPredecessors(
    runtimeSession.accessToken,
  );

  console.log(
    `T02_B12_R1_PREDECESSOR_RECEIPT_COUNT=${PREDECESSORS.length}`,
  );

  console.log(
    "T02_B12_R1_ALL_PREDECESSOR_RECEIPTS=PASS",
  );

  const firstReceipt =
    actionReceiptV2FromGenericHistory(
      await readActionReceiptHistory({
        baseUrl:
          HISTORY_BASE,

        accessToken:
          runtimeSession.accessToken,

        receiptId:
          EXPECTED_RECEIPT_ID,
      }),
    );

  const targetHistory =
    await readTargetActionHistory({
      baseUrl:
        HISTORY_BASE,

      accessToken:
        runtimeSession.accessToken,

      targetCanonicalId:
        T02_TASK_TARGET_CANONICAL_ID,
    });

  const secondReceipt =
    actionReceiptV2FromGenericHistory(
      await readActionReceiptHistory({
        baseUrl:
          HISTORY_BASE,

        accessToken:
          runtimeSession.accessToken,

        receiptId:
          EXPECTED_RECEIPT_ID,
      }),
    );

  assertExactReceiptReadback(
    firstReceipt,
    secondReceipt,
  );

  const expectedProofIds =
    [
      "t02-http-priority-update",
      "t02-one-field-configuration-delta",
      "t02-task-state-invariance",
      "t02-task-history-stability",
    ].sort();

  const actualProofIds =
    firstReceipt.proofResults.map(
      (
        proof,
      ) =>
        proof.requirementId,
    ).sort();

  if (
    firstReceipt.receiptId !==
      EXPECTED_RECEIPT_ID ||
    firstReceipt.actionId !==
      "t02-task-update-r5-b-001" ||
    firstReceipt.contractId !==
      "meridian.tasks.task-update.v2" ||
    firstReceipt.contractVersion !==
      2 ||
    firstReceipt.target.canonicalId !==
      T02_TASK_TARGET_CANONICAL_ID ||
    firstReceipt.receiptSha256 !==
      EXPECTED_RECEIPT_SHA256 ||
    firstReceipt.terminalEventHash !==
      EXPECTED_RECEIPT_TERMINAL_EVENT_HASH ||
    firstReceipt.proofResults.length !==
      4 ||
    !firstReceipt.proofResults.every(
      (
        proof,
      ) =>
        proof.status ===
          "PASS",
    ) ||
    JSON.stringify(
      actualProofIds,
    ) !==
      JSON.stringify(
        expectedProofIds,
      ) ||
    targetHistory.length !==
      1 ||
    targetHistory[0]?.receiptId !==
      EXPECTED_RECEIPT_ID ||
    targetHistory[0]?.receiptSha256 !==
      EXPECTED_RECEIPT_SHA256
  ) {
    throw new Error(
      "T02 B12-R1 durable receipt #13 authority is not exact.",
    );
  }

  console.log(
    "T02_B12_R1_TARGET_RECEIPT_HISTORY_COUNT=1",
  );

  console.log(
    `T02_B12_R1_RECEIPT_SHA256=${firstReceipt.receiptSha256}`,
  );

  console.log(
    `T02_B12_R1_RECEIPT_TERMINAL_EVENT_HASH=${firstReceipt.terminalEventHash}`,
  );

  console.log(
    "T02_B12_R1_RECEIPT_PROOF_RESULT_COUNT=4",
  );

  console.log(
    "T02_B12_R1_RECEIPT_PROOF_RESULTS_ALL_PASS=YES",
  );

  console.log(
    "T02_B12_R1_RECEIPT_DOUBLE_READBACK=PASS",
  );

  const [
    tasks,
    deletedTask,
    upcoming,
    manager,
  ] =
    await Promise.all([
      listT02Tasks({
        apiBaseUrl:
          API_BASE,

        accessToken:
          taskSession.accessToken,
      }),

      readT02Task({
        apiBaseUrl:
          API_BASE,

        accessToken:
          taskSession.accessToken,

        taskId:
          EXPECTED_TASK_ID,
      }),

      readT02UpcomingTasks({
        apiBaseUrl:
          API_BASE,

        accessToken:
          taskSession.accessToken,
      }),

      readT02TaskManagerStatus({
        apiBaseUrl:
          API_BASE,

        accessToken:
          taskSession.accessToken,
      }),
    ]);

  const matchingTasks =
    tasks.filter(
      (
        task,
      ) =>
        task.name ===
          T02_TASK_NAME ||
        task.id ===
          EXPECTED_TASK_ID,
    );

  const matchingUpcoming =
    upcoming.filter(
      (
        row,
      ) =>
        row.name ===
          T02_TASK_NAME ||
        row.id ===
          EXPECTED_TASK_ID,
    );

  if (
    tasks.length !==
      16 ||
    manager !==
      "Running" ||
    deletedTask !==
      null ||
    matchingTasks.length !==
      0 ||
    matchingUpcoming.length !==
      0
  ) {
    throw new Error(
      "T02 B12-R1 post-delete reconciliation does not prove exact synthetic fixture absence.",
    );
  }

  console.log(
    `T02_B12_R1_TASK_INVENTORY_COUNT=${tasks.length}`,
  );

  console.log(
    `T02_B12_R1_TASK_MANAGER_STATUS=${manager}`,
  );

  console.log(
    `T02_B12_R1_TASK_1004_READBACK=${deletedTask === null ? "ABSENT" : "PRESENT"}`,
  );

  console.log(
    `T02_B12_R1_WITNESS_TASK_COUNT=${matchingTasks.length}`,
  );

  console.log(
    `T02_B12_R1_WITNESS_UPCOMING_COUNT=${matchingUpcoming.length}`,
  );

  console.log(
    "T02_B12_R1_POST_DELETE_RECONCILIATION=PASS",
  );

  console.log(
    "T02_B12_R1_T02_CERTIFICATION_REMAINS_VERIFIED=PASS",
  );

  console.log(
    "T02_B12_R1_READY_FOR_EXACT_EIGHT_FILE_GIT_CLOSURE=YES",
  );

  completed =
    true;
}
finally {
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
      "T02_B12_R1_TASK_ESCALATION_LOGOUT=PASS",
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
      "T02_B12_R1_RUNTIME_LOGOUT=PASS",
    );
  }

  console.log(
    "T02_B12_R1_RUNTIME_PASSWORD_STORED=NO",
  );

  console.log(
    "T02_B12_R1_JWT_STORED=NO",
  );

  console.log(
    `T02_B12_R1_COMPLETED=${completed ? "YES" : "NO"}`,
  );
}
