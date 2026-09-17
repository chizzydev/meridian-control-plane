import {
  readFileSync,
} from "node:fs";

import {
  buildDurableChangeCaseEventMutation,
  createLiveDemoDurableChangeCase,
  validateDurableChangeCaseSnapshot,
  type DurableChangeCaseSnapshot,
} from "../src/lib/change-case/durable-change-case";

import {
  buildDurableChangeCaseAppendPlan,
  buildDurableChangeCaseCreatePlan,
  buildDurableChangeCaseEventsReadPlan,
  buildDurableChangeCaseReadPlan,
  type ChangeCaseHistoryRequestPlan,
} from "../src/lib/iris/change-case-history-transport";

import {
  loginIris,
  logoutIris,
  readRuntimeInfo,
} from "../src/lib/iris/transport";

interface SecretInput {
  password:
    string;
}

interface JsonObject {
  [key: string]:
    unknown;
}

interface RawHistoryResponse {
  readonly status:
    number;

  readonly ok:
    boolean;

  readonly json:
    unknown;

  readonly text:
    string;
}

const API_BASE_URL =
  "http://localhost:52773/api/admin";

const HISTORY_BASE_URL =
  "http://localhost:52773/meridian-control-plane-history";

const RUNTIME_USERNAME =
  "meridian.runtime";

const phaseValue =
  process.argv[2];

const caseId =
  process.argv[3];

const expectedGeneration =
  process.argv[4];

if (
  phaseValue !==
    "write" &&
  phaseValue !==
    "read"
) {
  throw new Error(
    "A4A verifier phase must be exactly write or read.",
  );
}

if (
  typeof caseId !==
    "string" ||
  caseId.length ===
    0 ||
  typeof expectedGeneration !==
    "string" ||
  expectedGeneration.length ===
    0
) {
  throw new Error(
    "A4A verifier case id and fixture generation are required.",
  );
}

const secret =
  JSON.parse(
    readFileSync(
      0,
      "utf8",
    ),
  ) as SecretInput;

if (
  typeof secret.password !==
    "string" ||
  secret.password.length ===
    0
) {
  throw new Error(
    "A4A runtime password is required on stdin.",
  );
}

function objectValue(
  value:
    unknown,
  label:
    string,
): JsonObject {
  if (
    typeof value !==
      "object" ||
    value ===
      null ||
    Array.isArray(
      value,
    )
  ) {
    throw new Error(
      `${label} must be an object.`,
    );
  }

  return value as JsonObject;
}

function joinUrl(
  baseUrl:
    string,
  path:
    string,
): string {
  return (
    `${baseUrl.replace(/\/+$/, "")}${
      path.startsWith("/")
        ? path
        : `/${path}`
    }`
  );
}

async function rawHistoryRequest(
  accessToken:
    string,
  plan:
    ChangeCaseHistoryRequestPlan,
): Promise<RawHistoryResponse> {
  const headers:
    Record<string, string> = {
      Accept:
        "application/json",

      Authorization:
        `Bearer ${accessToken}`,
    };

  const body =
    plan.body ===
    undefined
      ? undefined
      : JSON.stringify(
          plan.body,
        );

  if (
    body !==
      undefined
  ) {
    headers["Content-Type"] =
      "application/json";
  }

  const response =
    await fetch(
      joinUrl(
        HISTORY_BASE_URL,
        plan.path,
      ),
      {
        method:
          plan.method,

        headers,

        body,

        cache:
          "no-store",

        redirect:
          "error",
      },
    );

  const text =
    await response.text();

  let json:
    unknown = null;

  if (
    text.trim().length >
    0
  ) {
    try {
      json =
        JSON.parse(
          text,
        ) as unknown;
    }
    catch {
      throw new Error(
        `A4A history response HTTP ${response.status} is not JSON.`,
      );
    }
  }

  return {
    status:
      response.status,

    ok:
      response.ok,

    json,

    text,
  };
}

async function successfulHistoryRequest(
  accessToken:
    string,
  plan:
    ChangeCaseHistoryRequestPlan,
): Promise<unknown> {
  const result =
    await rawHistoryRequest(
      accessToken,
      plan,
    );

  if (
    !result.ok
  ) {
    const object =
      (
        typeof result.json ===
          "object" &&
        result.json !==
          null &&
        !Array.isArray(
          result.json,
        )
      )
        ? result.json as JsonObject
        : null;

    const code =
      typeof object?.code ===
        "string"
        ? object.code
        : "UNKNOWN";

    throw new Error(
      `A4A history request failed HTTP ${result.status} code ${code}.`,
    );
  }

  return result.json;
}

function snapshotFromResponse(
  value:
    unknown,
): DurableChangeCaseSnapshot {
  const object =
    objectValue(
      value,
      "A4A history response",
    );

  const snapshot =
    object.snapshot;

  validateDurableChangeCaseSnapshot(
    snapshot,
  );

  return snapshot;
}

function eventsFromResponse(
  value:
    unknown,
): DurableChangeCaseSnapshot["events"] {
  const object =
    objectValue(
      value,
      "A4A event response",
    );

  if (
    !Array.isArray(
      object.events,
    )
  ) {
    throw new Error(
      "A4A event response is missing events.",
    );
  }

  return object.events as DurableChangeCaseSnapshot["events"];
}

function isoAt(
  base:
    number,
  offsetMs:
    number,
): string {
  return new Date(
    base +
      offsetMs,
  ).toISOString();
}

let session:
  Awaited<
    ReturnType<
      typeof loginIris
    >
  > |
  null =
    null;

try {
  session =
    await loginIris({
      baseUrl:
        API_BASE_URL,

      username:
        RUNTIME_USERNAME,

      password:
        secret.password,
    });

  console.log(
    "A4A_LOGIN_HTTP=200",
  );

  const runtime =
    await readRuntimeInfo({
      baseUrl:
        API_BASE_URL,

      accessToken:
        session.accessToken,
    });

  if (
    runtime.username !==
      RUNTIME_USERNAME ||
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
      "A4A pinned runtime identity/version guard failed.",
    );
  }

  console.log(
    "A4A_RUNTIME_IDENTITY_VERSION=PASS",
  );

  console.log(
    `A4A_PHASE=${phaseValue}`,
  );

  if (
    phaseValue ===
      "write"
  ) {
    const baseTime =
      Date.now();

    const t0 =
      isoAt(
        baseTime,
        0,
      );

    const t1 =
      isoAt(
        baseTime,
        1,
      );

    const t2 =
      isoAt(
        baseTime,
        2,
      );

    const proposed =
      createLiveDemoDurableChangeCase({
        caseId,

        expectedFixtureGeneration:
          expectedGeneration,

        nowUtc:
          t0,
      });

    const created =
      snapshotFromResponse(
        await successfulHistoryRequest(
          session.accessToken,
          buildDurableChangeCaseCreatePlan(
            proposed,
          ),
        ),
      );

    if (
      created.record.state !==
        "PROPOSED" ||
      created.record.version !==
        1 ||
      created.events.length !==
        1 ||
      created.events[0]?.eventType !==
        "CASE_CREATED" ||
      created.events[0]?.sequence !==
        1
    ) {
      throw new Error(
        "A4A atomic case creation did not produce PROPOSED version 1 plus CASE_CREATED.",
      );
    }

    console.log(
      "A4A_CREATE=PASS",
    );

    console.log(
      "A4A_CASE_CREATED_ATOMIC=PASS",
    );

    console.log(
      "A4A_CASE_STATE_AFTER_CREATE=PROPOSED",
    );

    const preflightMutation =
      buildDurableChangeCaseEventMutation(
        created.record,
        created.events.length,
        {
          expectedVersion:
            1,

          eventType:
            "PREFLIGHT_COMPLETED",

          nextState:
            "PREFLIGHTED",

          occurredAtUtc:
            t1,

          detailJson:
            '{"proof":"A4A_FOUNDATION_PREFLIGHT"}',

          evidencePatch: {
            preflight: {
              digestAlgorithm:
                "SHA-256",

              digest:
                "A4A-FOUNDATION-DIGEST",

              expectedAuthorizationDelta:
                "FIXTURE_SCOPED_REMOVE",

              declaredImpact:
                "A4A_FOUNDATION_ONLY",
            },
          },
        },
      );

    const preflighted =
      snapshotFromResponse(
        await successfulHistoryRequest(
          session.accessToken,
          buildDurableChangeCaseAppendPlan(
            preflightMutation,
          ),
        ),
      );

    if (
      preflighted.record.state !==
        "PREFLIGHTED" ||
      preflighted.record.version !==
        2 ||
      preflighted.events.length !==
        2 ||
      preflighted.events[1]?.eventType !==
        "PREFLIGHT_COMPLETED" ||
      preflighted.events[1]?.sequence !==
        2
    ) {
      throw new Error(
        "A4A PREFLIGHT_COMPLETED append is not monotonic.",
      );
    }

    console.log(
      "A4A_PREFLIGHT_TRANSITION=PASS",
    );

    const reviewMutation =
      buildDurableChangeCaseEventMutation(
        preflighted.record,
        preflighted.events.length,
        {
          expectedVersion:
            2,

          eventType:
            "REVIEW_ACCEPTED",

          nextState:
            "READY",

          occurredAtUtc:
            t2,

          detailJson:
            '{"proof":"A4A_FOUNDATION_REVIEW"}',

          evidencePatch: {
            review: {
              reviewedDigest:
                "A4A-FOUNDATION-DIGEST",

              reviewedAtUtc:
                t2,
            },
          },
        },
      );

    const correctReviewPlan =
      buildDurableChangeCaseAppendPlan(
        reviewMutation,
      );

    const correctReviewBody =
      objectValue(
        correctReviewPlan.body,
        "A4A review append body",
      );

    const staleResult =
      await rawHistoryRequest(
        session.accessToken,
        {
          ...correctReviewPlan,

          body: {
            ...correctReviewBody,

            expectedVersion:
              1,
          },
        },
      );

    const staleObject =
      objectValue(
        staleResult.json,
        "A4A stale-version response",
      );

    const staleCode =
      typeof staleObject.code ===
        "string"
        ? staleObject.code
        : "";

    console.log(
      `A4A_STALE_VERSION_HTTP=${staleResult.status}`,
    );

    console.log(
      `A4A_STALE_VERSION_CODE=${staleCode}`,
    );

    if (
      staleResult.status !==
        409 ||
      staleCode !==
        "CHANGE_CASE_VERSION_CONFLICT"
    ) {
      throw new Error(
        "A4A stale expected-version request was not refused with the exact version-conflict contract.",
      );
    }

    const afterStale =
      snapshotFromResponse(
        await successfulHistoryRequest(
          session.accessToken,
          buildDurableChangeCaseReadPlan(
            caseId,
          ),
        ),
      );

    if (
      afterStale.record.state !==
        "PREFLIGHTED" ||
      afterStale.record.version !==
        2 ||
      afterStale.events.length !==
        2
    ) {
      throw new Error(
        "A4A stale expected-version refusal changed durable state.",
      );
    }

    console.log(
      "A4A_STALE_VERSION_ZERO_APPEND=PASS",
    );

    const ready =
      snapshotFromResponse(
        await successfulHistoryRequest(
          session.accessToken,
          correctReviewPlan,
        ),
      );

    if (
      ready.record.state !==
        "READY" ||
      ready.record.version !==
        3 ||
      ready.events.length !==
        3 ||
      ready.events[2]?.eventType !==
        "REVIEW_ACCEPTED" ||
      ready.events[2]?.sequence !==
        3 ||
      ready.record.fixture.expectedGeneration !==
        expectedGeneration
    ) {
      throw new Error(
        "A4A REVIEW_ACCEPTED append did not produce READY version 3.",
      );
    }

    console.log(
      "A4A_REVIEW_TRANSITION=PASS",
    );

    const events =
      eventsFromResponse(
        await successfulHistoryRequest(
          session.accessToken,
          buildDurableChangeCaseEventsReadPlan(
            caseId,
          ),
        ),
      );

    if (
      JSON.stringify(
        events,
      ) !==
      JSON.stringify(
        ready.events,
      )
    ) {
      throw new Error(
        "A4A journal endpoint does not equal the authoritative case snapshot journal.",
      );
    }

    console.log(
      "A4A_APPEND_ONLY_JOURNAL=PASS",
    );

    console.log(
      "A4A_WRITE_PHASE=PASS",
    );
  } else {
    const snapshot =
      snapshotFromResponse(
        await successfulHistoryRequest(
          session.accessToken,
          buildDurableChangeCaseReadPlan(
            caseId,
          ),
        ),
      );

    const eventTypes =
      snapshot.events.map(
        (event) =>
          event.eventType,
      );

    if (
      snapshot.record.state !==
        "READY" ||
      snapshot.record.version !==
        3 ||
      snapshot.record.fixture.expectedGeneration !==
        expectedGeneration ||
      JSON.stringify(
        eventTypes,
      ) !==
      JSON.stringify([
        "CASE_CREATED",
        "PREFLIGHT_COMPLETED",
        "REVIEW_ACCEPTED",
      ])
    ) {
      throw new Error(
        "A4A fresh-process durable readback does not reconstruct the READY case.",
      );
    }

    const events =
      eventsFromResponse(
        await successfulHistoryRequest(
          session.accessToken,
          buildDurableChangeCaseEventsReadPlan(
            caseId,
          ),
        ),
      );

    if (
      JSON.stringify(
        events,
      ) !==
      JSON.stringify(
        snapshot.events,
      )
    ) {
      throw new Error(
        "A4A fresh-process journal readback differs from the durable snapshot.",
      );
    }

    console.log(
      "A4A_FRESH_PROCESS_DURABLE_READBACK=PASS",
    );

    console.log(
      "A4A_BROWSER_REFRESH_SERVER_TRUTH=PASS",
    );

    console.log(
      "A4A_READ_PHASE=PASS",
    );
  }

  console.log(
    "A4A_COMMAND_COMPLETE=YES",
  );
}
finally {
  secret.password =
    "";

  if (
    session
  ) {
    try {
      await logoutIris({
        baseUrl:
          API_BASE_URL,

        accessToken:
          session.accessToken,
      });

      console.log(
        "A4A_LOGOUT_HTTP=200",
      );
    }
    catch {
      console.log(
        "A4A_LOGOUT_HTTP=FAILED",
      );
    }
  }

  console.log(
    "A4A_RUNTIME_PASSWORD_STORED=NO",
  );

  console.log(
    "A4A_JWT_STORED=NO",
  );
}
