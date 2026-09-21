import {
  randomBytes,
  randomUUID,
} from "node:crypto";

import {
  join,
} from "node:path";

import {
  setTimeout as delay,
} from "node:timers/promises";

import {
  DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
  DEMO_FIXTURE_DISPLAY_NAME,
  DEMO_FIXTURE_ID,
  DEMO_FIXTURE_NAMESPACE,
  DEMO_FIXTURE_TRANSPORT_ROLE,
  DEMO_FIXTURE_USERNAME,
  demoFixtureTransportRoleSpec,
  resetDemoFixture,
  type DemoFixtureAdapter,
  type DemoFixtureCredentialVault,
} from "../src/lib/change-case/demo-fixture";

import {
  LIVE_WITNESS_REQUIRED_PERMISSION_KEYS,
} from "../src/lib/change-case/live-convergence";

import {
  P05_USER_ENABLE_DELTA_SUMMARY,
  buildP05UserEnableProofResults,
  certifyP05UserEnableAction,
  p05PoststateMatches,
  p05PrestateMatches,
  p05UserEnableIntent,
  type P05UserEnablePreflight,
} from "../src/lib/actions/permissions/user-enable";

import {
  P05_USER_SECURITY_PATH,
  probeP05Login,
  putP05UserEnable,
  readP05User,
} from "../src/lib/iris/user-enable-action-transport";

import {
  actionReceiptV2FromGenericHistory,
  buildActionReceiptHistoryRecord,
} from "../src/lib/proof/action-history";

import {
  assertExactReceiptReadback,
} from "../src/lib/proof/receipt";

import {
  createOfficialSysAdminDemoFixtureAdapter,
} from "../src/lib/iris/demo-fixture-sysadmin";

import {
  readLiveWitnessProcessRows,
  startLiveWitnessNativeSession,
  type LiveWitnessNativeSession,
} from "../src/lib/iris/live-witness-native";

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

const HELPER_BASE =
  process.env.MERIDIAN_IRIS_HELPER_BASE_URL ??
  "http://localhost:52773/meridian-control-plane-internal";

const USERNAME =
  process.env.MERIDIAN_RUNTIME_USERNAME ??
  "meridian.runtime";

const PASSWORD =
  process.env.MERIDIAN_RUNTIME_PASSWORD;

const ACTION_ID =
  "p05-user-enable-r4-d-001";

const RECEIPT_ID =
  "meridian-p05-user-enable-r4-d-001";

const P03_RECEIPT_ID =
  "meridian-p03-user-add-role-r4-c-001";

const TARGET_CANONICAL_ID =
  `user:${DEMO_FIXTURE_USERNAME}`;

const repoRoot =
  process.cwd();

const pythonExecutable =
  process.env.MERIDIAN_IRISPYTHON_EXECUTABLE?.trim() ||
  join(
    repoRoot,
    ".venv-iris",
    process.platform === "win32"
      ? "Scripts/python.exe"
      : "bin/python",
  );

const workerScript =
  join(
    repoRoot,
    "scripts",
    "iris-live-witness-worker.py",
  );

const processReaderScript =
  join(
    repoRoot,
    "scripts",
    "iris-processquery-witness-reader.py",
  );

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
      receiptId: P03_RECEIPT_ID,
      sha256: "40A6076D54F92EAB8A1D65323D5B06DA3EC11EA4939D540153D7FFD7BD4EF18E",
    }),
  ]);

interface JsonObject {
  readonly [key: string]: unknown;
}

interface AuditRow {
  readonly systemId: string;
  readonly auditIndex: number;
  readonly utcTimeStamp: string;
  readonly eventSource: string;
  readonly eventType: string;
  readonly event: string;
  readonly pid: number;
  readonly username: string;
  readonly description: string;
  readonly eventData: string;
}

interface P05AuditBinding {
  readonly systemId: string;
  readonly auditIndex: number;
  readonly utcTimeStamp: string;
  readonly pid: number;
  readonly enableBound: true;
  readonly pidRebound: true;
}



function observedP05Witness(
  value: LiveWitnessNativeSession | null,
): LiveWitnessNativeSession | null {
  return value;
}

function requireP05AuditBinding(
  value: P05AuditBinding | null,
): P05AuditBinding {
  if (value === null) {
    throw new Error(
      "P05 certified audit binding is unexpectedly null.",
    );
  }

  return value;
}

function requireP05NativePid(
  value: number | null,
): number {
  if (
    value === null ||
    !Number.isSafeInteger(value) ||
    value < 1
  ) {
    throw new Error(
      "P05 certified fresh Native PID is unavailable.",
    );
  }

  return value;
}

function objectValue(
  value: unknown,
  label: string,
): JsonObject {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(`${label} is not an object.`);
  }

  return value as JsonObject;
}

function stringValue(value: unknown): string {
  return typeof value === "string"
    ? value
    : "";
}

function integerValue(
  value: unknown,
  label: string,
): number {
  const parsed =
    typeof value === "number"
      ? value
      : (
          typeof value === "string" &&
          /^\d+$/.test(value)
        )
          ? Number(value)
          : Number.NaN;

  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${label} is not an integer.`);
  }

  return parsed;
}

function joinUrl(
  base: string,
  path: string,
): string {
  return base.replace(/\/+$/, "") + path;
}

function irisUtcMillis(value: string): number {
  const normalized =
    value.includes("T")
      ? value
      : value.replace(" ", "T") + "Z";

  const parsed = Date.parse(normalized);

  if (!Number.isFinite(parsed)) {
    throw new Error(`P05 audit UTC is invalid: ${value}`);
  }

  return parsed;
}

function parseAuditRows(
  value: unknown,
  requestedPid?: number,
): readonly AuditRow[] {
  const root = objectValue(
    value,
    "P05 native audit response",
  );

  if (
    root.ok !== 1 &&
    root.ok !== true
  ) {
    throw new Error(
      "P05 native audit helper response is not ok.",
    );
  }

  if (
    root.executeOK !== 1 &&
    root.executeOK !== true
  ) {
    throw new Error(
      "P05 native audit query did not execute successfully.",
    );
  }

  if (
    root.auditTransportVersion !== "health-v1" ||
    root.eventSource !== "%System" ||
    root.eventType !== "%Security" ||
    root.event !== "UserChange" ||
    root.usernameFilter !== USERNAME
  ) {
    throw new Error(
      "P05 native audit helper contract drifted.",
    );
  }

  if (
    requestedPid !== undefined &&
    String(root.requestedAuditPid ?? "") !==
      String(requestedPid)
  ) {
    throw new Error(
      "P05 native audit PID-bound response did not echo the requested PID.",
    );
  }

  if (!Array.isArray(root.rows)) {
    throw new Error(
      "P05 native audit response rows are missing.",
    );
  }

  return Object.freeze(
    root.rows.map((raw) => {
      const row = objectValue(
        raw,
        "P05 native audit row",
      );

      return Object.freeze({
        systemId: stringValue(row.systemID),
        auditIndex: integerValue(
          row.auditIndex,
          "P05 audit index",
        ),
        utcTimeStamp: stringValue(row.utcTimeStamp),
        eventSource: stringValue(row.eventSource),
        eventType: stringValue(row.eventType),
        event: stringValue(row.event),
        pid: integerValue(
          row.pid,
          "P05 audit PID",
        ),
        username: stringValue(row.username),
        description: stringValue(row.description),
        eventData: stringValue(row.eventData),
      });
    }),
  );
}

function normalizedBooleanText(
  value: string,
): "FALSE" | "TRUE" | null {
  const normalized =
    value.trim().replace(/^["']|["']$/g, "").toLowerCase();

  if (
    normalized === "0" ||
    normalized === "false" ||
    normalized === "no" ||
    normalized === "disabled"
  ) {
    return "FALSE";
  }

  if (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "enabled"
  ) {
    return "TRUE";
  }

  return null;
}

type AuditModifiedFieldBlock = Readonly<{
  label: string;
  newValue: string;
  oldValue: string;
}>;

function parseAuditModifiedFieldBlocks(
  eventData: string,
): readonly AuditModifiedFieldBlock[] {
  const normalized =
    eventData
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");

  const lines =
    normalized.split("\n");

  const blocks:
    AuditModifiedFieldBlock[] =
      [];

  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    const line =
      lines[index] ?? "";

    const marker =
      /^(.+?) modified:\s*$/i.exec(
        line.trimEnd(),
      );

    if (marker === null) {
      continue;
    }

    const label =
      (marker[1] ?? "").trim();

    let newValue:
      string | null =
        null;

    let oldValue:
      string | null =
        null;

    for (
      let cursor = index + 1;
      cursor < lines.length &&
        cursor <= index + 8;
      cursor += 1
    ) {
      const candidate =
        lines[cursor] ?? "";

      if (
        /^(.+?) modified:\s*$/i.test(
          candidate.trimEnd(),
        ) ||
        /^Current values:\s*$/i.test(
          candidate.trim(),
        )
      ) {
        break;
      }

      const newMatch =
        /^\s*New value:\s*(.*)$/i.exec(
          candidate,
        );

      if (newMatch !== null) {
        newValue =
          newMatch[1] ?? "";
        continue;
      }

      const oldMatch =
        /^\s*Old value:\s*(.*)$/i.exec(
          candidate,
        );

      if (oldMatch !== null) {
        oldValue =
          oldMatch[1] ?? "";
      }
    }

    if (
      label.length > 0 &&
      newValue !== null &&
      oldValue !== null
    ) {
      blocks.push({
        label,
        newValue,
        oldValue,
      });
    }
  }

  return blocks;
}

function eventDataProvesEnable(
  eventData: string,
): boolean {
  const blocks =
    parseAuditModifiedFieldBlocks(
      eventData,
    );

  if (blocks.length !== 1) {
    return false;
  }

  const block =
    blocks[0];

  if (block === undefined) {
    return false;
  }

  return (
    normalizedBooleanText(
      block.newValue,
    ) === "TRUE" &&
    normalizedBooleanText(
      block.oldValue,
    ) === "FALSE"
  );
}

function assertP05AuditParserContract(): void {
  const localizedObserved =
    [
      "Modify User: meridian.demo.witness",
      "",
      "Ù…Ù…ÙƒÙ‘Ù† modified:",
      "  New value: Yes",
      "  Old value: No",
      "",
      "--------------------------------------------------",
      "Current values:",
      "Enabled:              Yes",
    ].join("\n");

  const wrongDirection =
    [
      "Modify User: meridian.demo.witness",
      "",
      "Ù…Ù…ÙƒÙ‘Ù† modified:",
      "  New value: No",
      "  Old value: Yes",
    ].join("\n");

  const multiFieldDecoy =
    [
      "Modify User: meridian.demo.witness",
      "",
      "AccountNeverExpires modified:",
      "  New value: 1",
      "  Old value: 0",
      "",
      "Ù…Ù…ÙƒÙ‘Ù† modified:",
      "  New value: Yes",
      "  Old value: No",
    ].join("\n");

  if (
    !eventDataProvesEnable(
      localizedObserved,
    ) ||
    eventDataProvesEnable(
      wrongDirection,
    ) ||
    eventDataProvesEnable(
      multiFieldDecoy,
    )
  ) {
    throw new Error(
      "P05 native UserChange enable parser is not localization-independent and single-delta bounded.",
    );
  }
}

assertP05AuditParserContract();
console.log(
  "P05_AUDIT_PARSER_LOCALIZATION_INDEPENDENT_SELFTEST=PASS",
);

function auditMatchesEnable(
  row: AuditRow,
  applyStartedAtUtc: string,
): boolean {
  if (
    row.eventSource !== "%System" ||
    row.eventType !== "%Security" ||
    row.event !== "UserChange" ||
    row.username !== USERNAME ||
    row.pid < 1 ||
    row.auditIndex < 1 ||
    row.systemId.trim().length === 0
  ) {
    return false;
  }

  const applyStarted =
    Date.parse(applyStartedAtUtc);

  if (!Number.isFinite(applyStarted)) {
    throw new Error(
      "P05 apply-start UTC is invalid.",
    );
  }

  if (
    irisUtcMillis(row.utcTimeStamp) <
      applyStarted - 2_000
  ) {
    return false;
  }

  const escapedUsername =
    DEMO_FIXTURE_USERNAME.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

  const descriptionMatches =
    new RegExp(
      `^Modify User\\s+${escapedUsername}$`,
      "i",
    ).test(row.description.trim());

  const targetMatches =
    new RegExp(
      `Modify User:\\s*${escapedUsername}(?:\\r?\\n|$)`,
      "i",
    ).test(row.eventData);

  return (
    descriptionMatches &&
    targetMatches &&
    eventDataProvesEnable(row.eventData)
  );
}

async function fetchAuditRows(
  accessToken: string,
  pid?: number,
): Promise<readonly AuditRow[]> {
  const params = new URLSearchParams();
  params.set("audit", "userchange");

  if (pid !== undefined) {
    params.set("auditPid", String(pid));
  }

  const response =
    await fetch(
      joinUrl(
        HELPER_BASE,
        "/health?" + params.toString(),
      ),
      {
        method: "GET",
        cache: "no-store",
        redirect: "error",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `P05 native audit helper failed HTTP ${response.status}.`,
    );
  }

  return parseAuditRows(
    JSON.parse(text) as unknown,
    pid,
  );
}

async function findP05EnableAudit(
  accessToken: string,
  applyStartedAtUtc: string,
): Promise<P05AuditBinding> {
  for (
    let attempt = 1;
    attempt <= 20;
    attempt += 1
  ) {
    const rows =
      await fetchAuditRows(accessToken);

    const matches =
      rows.filter(
        (row) =>
          auditMatchesEnable(
            row,
            applyStartedAtUtc,
          ),
      );

    if (matches.length > 1) {
      throw new Error(
        `P05 native audit binding is ambiguous: ${matches.length} matching UserChange rows.`,
      );
    }

    if (matches.length === 1) {
      const match = matches[0];

      if (match === undefined) {
        throw new Error(
          "P05 native audit match disappeared.",
        );
      }

      const pidRows =
        await fetchAuditRows(
          accessToken,
          match.pid,
        );

      const rebound =
        pidRows.filter(
          (row) =>
            row.auditIndex === match.auditIndex &&
            auditMatchesEnable(
              row,
              applyStartedAtUtc,
            ),
        );

      if (rebound.length !== 1) {
        throw new Error(
          "P05 native audit PID rebind did not return exactly the selected UserChange row.",
        );
      }

      console.log(
        `P05_NATIVE_AUDIT_POLL_ATTEMPT=${attempt}`,
      );

      return Object.freeze({
        systemId: match.systemId,
        auditIndex: match.auditIndex,
        utcTimeStamp: match.utcTimeStamp,
        pid: match.pid,
        enableBound: true as const,
        pidRebound: true as const,
      });
    }

    if (attempt < 20) {
      await delay(250);
    }
  }

  throw new Error(
    "P05 native UserChange enable audit binding did not appear.",
  );
}

async function createP05DisabledSetupUser(
  accessToken: string,
  password: string,
): Promise<void> {
  const response =
    await fetch(
      joinUrl(
        API_BASE,
        `/v2/security/user?name=${encodeURIComponent(DEMO_FIXTURE_USERNAME)}`,
      ),
      {
        method: "POST",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          User: {
            FullName: DEMO_FIXTURE_DISPLAY_NAME,
            Enabled: false,
            AccountNeverExpires: true,
            PasswordNeverExpires: true,
            ChangePassword: false,
            NameSpace: DEMO_FIXTURE_NAMESPACE,
            Routine: "",
            Roles: [
              ...DEMO_FIXTURE_DIRECT_ROLES_BEFORE,
            ],
            EscalationRoles: [],
            Comment:
              "Meridian R4 P05 isolated user-enable witness",
          },
          Password: password,
        }),
      },
    );

  await response.text();

  if (response.status !== 201) {
    throw new Error(
      `P05 disabled fixture user setup failed HTTP ${response.status}.`,
    );
  }
}

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

const runtimePassword =
  PASSWORD?.trim();

if (
  runtimePassword === undefined ||
  runtimePassword.length === 0
) {
  throw new Error(
    "P05 runtime password is missing.",
  );
}

let session:
  Awaited<ReturnType<typeof loginIris>> |
  null =
    null;

let adapter:
  DemoFixtureAdapter |
  null =
    null;

let witness:
  LiveWitnessNativeSession |
  null =
    null;

let witnessExited =
  false;

let setupRoleCreated =
  false;

let setupUserCreated =
  false;

let resetComplete =
  false;

let businessDispatchStarted =
  false;

let certificationFullyClosed =
  false;

let physicalBusinessPutCount =
  0;

let applyDispatchStartedAtUtc:
  string |
  null =
    null;

let generation =
  "";

let fixturePassword =
  "";

let audit:
  P05AuditBinding |
  null =
    null;

let freshNativePid:
  number |
  null =
    null;

let reviewedDisabledUser:
  NonNullable<P05UserEnablePreflight["user"]> |
  null =
    null;

const vault:
  DemoFixtureCredentialVault = {
    store(input) {
      generation = input.generation;
      fixturePassword = input.password;
    },

    clear(fixtureId) {
      if (fixtureId === DEMO_FIXTURE_ID) {
        generation = "";
        fixturePassword = "";
      }
    },
  };

function credentialPresent(
  expectedGeneration: string,
): boolean {
  return (
    generation === expectedGeneration &&
    generation.length > 0 &&
    fixturePassword.length > 0
  );
}

try {
  session = await loginIris({
    baseUrl: API_BASE,
    username: USERNAME,
    password: runtimePassword,
  });

  console.log(
    "P05_RUNTIME_LOGIN_HTTP=200",
  );

  const runtime =
    await readRuntimeInfo({
      baseUrl: API_BASE,
      accessToken: session.accessToken,
    });

  if (
    runtime.username !== USERNAME ||
    runtime.apiVersion !== 2 ||
    !runtime.serverVersion.includes("2026.2") ||
    !runtime.serverVersion.includes("Build 221U")
  ) {
    throw new Error(
      "P05 pinned runtime identity/version guard failed.",
    );
  }

  console.log(
    "P05_RUNTIME_IDENTITY_VERSION=PASS",
  );

  const processRows =
    async () =>
      readLiveWitnessProcessRows({
        pythonExecutable,
        readerScriptPath:
          processReaderScript,
        runtimePassword,
      });

  adapter =
    createOfficialSysAdminDemoFixtureAdapter({
      baseUrl: API_BASE,
      accessToken: session.accessToken,
      listLiveProcesses:
        async (username) =>
          (await processRows())
            .map((row) => ({
              pid: row.pid,
              username: row.username,
            }))
            .filter(
              (row) =>
                row.username.toLowerCase() ===
                username.toLowerCase(),
            ),
    });

  const prerequisites =
    await adapter.readPrerequisites();

  if (
    prerequisites.missingRoles.length !== 0 ||
    prerequisites.missingResources.length !== 0
  ) {
    throw new Error(
      "P05 business prerequisite role/resource graph is not exact.",
    );
  }

  if (
    await adapter.readUser(
      DEMO_FIXTURE_USERNAME,
    )
  ) {
    throw new Error(
      "P05 requires the synthetic witness user absent before fixture setup.",
    );
  }

  if (
    await adapter.readRole(
      DEMO_FIXTURE_TRANSPORT_ROLE,
    )
  ) {
    throw new Error(
      "P05 requires the synthetic transport role absent before fixture setup.",
    );
  }

  if ((await processRows()).length !== 0) {
    throw new Error(
      "P05 requires zero synthetic witness processes before fixture setup.",
    );
  }

  const targetHistoryBefore =
    await readTargetActionHistory({
      baseUrl: HISTORY_BASE,
      accessToken: session.accessToken,
      targetCanonicalId:
        TARGET_CANONICAL_ID,
    });

  if (
    !sameReceiptSet(
      targetHistoryBefore,
      [P03_RECEIPT_ID],
    )
  ) {
    throw new Error(
      "P05 requires exactly the historical P03 receipt on the isolated witness target before fixture setup.",
    );
  }

  for (const predecessor of PREDECESSORS) {
    const receipt =
      actionReceiptV2FromGenericHistory(
        await readActionReceiptHistory({
          baseUrl: HISTORY_BASE,
          accessToken: session.accessToken,
          receiptId:
            predecessor.receiptId,
        }),
      );

    if (
      receipt.receiptSha256 !==
      predecessor.sha256
    ) {
      throw new Error(
        `Historical predecessor changed before P05: ${predecessor.receiptId}.`,
      );
    }

    console.log(
      `P05_PREDECESSOR_RECEIPT_SHA256=${receipt.receiptId}|${receipt.receiptSha256}`,
    );
  }

  console.log(
    "P05_PRE_FIXTURE_CLEAN=PASS",
  );
  console.log(
    "P05_GENERIC_TARGET_HISTORY_PRESTATE_COUNT=1",
  );
  console.log(
    "P05_P03_HISTORICAL_RECEIPT_PRESERVED_BEFORE=PASS",
  );
  console.log(
    "P05_ALL_PREDECESSOR_RECEIPTS_PRECHECK=PASS",
  );

  generation = randomUUID();
  fixturePassword =
    `Aa1!${randomBytes(10).toString("hex")}`;

  vault.store({
    fixtureId: DEMO_FIXTURE_ID,
    generation,
    password: fixturePassword,
  });

  await adapter.createRole(
    demoFixtureTransportRoleSpec(),
  );
  setupRoleCreated = true;

  console.log(
    "P05_FIXTURE_SETUP_ROLE_CREATE=PASS",
  );

  await createP05DisabledSetupUser(
    session.accessToken,
    fixturePassword,
  );
  setupUserCreated = true;

  console.log(
    "P05_FIXTURE_SETUP_DISABLED_USER_CREATE=PASS",
  );
  console.log(
    "P05_FIXTURE_SETUP_BUSINESS_PUT_COUNT=0",
  );

  const readPreflight =
    async (): Promise<P05UserEnablePreflight> => {
      const user =
        await readP05User({
          apiBaseUrl: API_BASE,
          accessToken:
            session!.accessToken,
        });

      const login =
        await probeP05Login({
          apiBaseUrl: API_BASE,
          username:
            DEMO_FIXTURE_USERNAME,
          password:
            fixturePassword,
        });

      const rows =
        await processRows();

      return Object.freeze({
        schemaVersion:
          "meridian.user-enable-preflight.v1" as const,
        fixtureId:
          DEMO_FIXTURE_ID,
        expectedFixtureGeneration:
          generation,
        user,
        credentialPresent:
          credentialPresent(generation),
        credentialLoginStatus:
          login.status,
        liveProcessCount:
          rows.length,
        officialMutationOperation:
          "PUT /v2/security/user" as const,
        requiredAuthority:
          "%Admin_Secure:U" as const,
        authorityMode:
          "CURRENT_STANDING_RUNTIME_AUTHORITY" as const,
      });
    };

  const initialPreflight =
    await readPreflight();

  if (!p05PrestateMatches(initialPreflight)) {
    throw new Error(
      "P05 fixture setup did not produce the exact disabled prestate with HTTP 401 and zero fixture processes.",
    );
  }

  if (initialPreflight.user === null) {
    throw new Error(
      "P05 exact disabled prestate unexpectedly lacks the user snapshot.",
    );
  }

  reviewedDisabledUser =
    initialPreflight.user;

  console.log(
    `P05_FIXTURE_GENERATION=${generation}`,
  );
  console.log(
    "P05_EXACT_DISABLED_CONFIG=PASS",
  );
  console.log(
    "P05_DISABLED_LOGIN_HTTP=401",
  );
  console.log(
    "P05_DISABLED_PROCESS_COUNT=0",
  );
  console.log(
    "P05_SYNTHETIC_CREDENTIAL_EXPOSED=NO",
  );

  const originalFetch =
    globalThis.fetch.bind(
      globalThis,
    );

  const mutationFetch:
    typeof fetch =
    async (input, init) => {
      const method =
        String(
          init?.method ?? "GET",
        ).toUpperCase();

      const url =
        input.toString();

      const expectedUrl =
        API_BASE.replace(/\/+$/, "") +
        P05_USER_SECURITY_PATH;

      if (
        method === "PUT" &&
        url === expectedUrl
      ) {
        physicalBusinessPutCount += 1;
        businessDispatchStarted = true;

        if (
          physicalBusinessPutCount === 1
        ) {
          applyDispatchStartedAtUtc =
            new Date().toISOString();
        }
      }

      return originalFetch(
        input,
        init,
      );
    };

  const intent =
    p05UserEnableIntent(
      generation,
    );

  const result =
    await certifyP05UserEnableAction(
      {
        intent,
        actionId: ACTION_ID,
        receiptId: RECEIPT_ID,
        logicalActor:
          "R4-D frozen isolated user-enable invocation",
        irisRuntimeUser:
          USERNAME,
      },
      {
        contract: {
          readFreshPreflight:
            async () =>
              readPreflight(),

          executeEnable:
            async () => {
              const mutation =
                await putP05UserEnable({
                  apiBaseUrl:
                    API_BASE,
                  accessToken:
                    session!.accessToken,
                  fetchImpl:
                    mutationFetch,
                });

              console.log(
                `P05_PUT_RESPONSE_STATUS=${mutation.status}`,
              );
              console.log(
                `P05_MUTATION_REQUEST_COUNT=${mutation.mutationRequestCount}`,
              );
            },

          collectProofResults:
            async (execution) => {
              if (
                physicalBusinessPutCount !== 1 ||
                applyDispatchStartedAtUtc === null ||
                execution.configurationVerified !== true ||
                reviewedDisabledUser === null
              ) {
                throw new Error(
                  "P05 execution did not prove exactly one physical business PUT plus the reviewed disabled baseline.",
                );
              }

              const configured =
                await readPreflight();

              if (
                !p05PoststateMatches(
                  configured,
                  reviewedDisabledUser,
                )
              ) {
                throw new Error(
                  "P05 configured/authentication poststate is not an exact field-preserving enablement.",
                );
              }

              console.log(
                "P05_ENABLED_LOGIN_HTTP=200",
              );
              console.log(
                "P05_ALL_OTHER_SECURITY_FIELDS_PRESERVED=PASS",
              );
              console.log(
                "P05_HTTP_LOGIN_TOKEN_STORED=NO",
              );

              witness =
                await startLiveWitnessNativeSession({
                  pythonExecutable,
                  workerScriptPath:
                    workerScript,
                  fixturePassword,
                  expectedFixtureGeneration:
                    generation,
                });

              const startup =
                witness.startup;

              if (
                startup.username !==
                  DEMO_FIXTURE_USERNAME ||
                startup.namespace !==
                  DEMO_FIXTURE_NAMESPACE ||
                !Number.isSafeInteger(
                  startup.serverPid,
                ) ||
                startup.serverPid < 1
              ) {
                throw new Error(
                  "P05 fresh Native SDK witness identity/PID is invalid.",
                );
              }

              if (
                !LIVE_WITNESS_REQUIRED_PERMISSION_KEYS.every(
                  (key) =>
                    startup.checks[key] === 1,
                )
              ) {
                throw new Error(
                  "P05 fresh Native SDK witness did not have the exact full fixture authority.",
                );
              }

              const rows =
                await processRows();

              if (
                rows.length !== 1 ||
                rows[0]?.pid !==
                  startup.serverPid ||
                rows[0]?.username !==
                  DEMO_FIXTURE_USERNAME
              ) {
                throw new Error(
                  "P05 ProcessQuery did not bind exactly one fresh fixture process to the Native SDK witness PID.",
                );
              }

              const nativePid =
                startup.serverPid;

              freshNativePid =
                nativePid;

              const auditBinding =
                await findP05EnableAudit(
                  session!.accessToken,
                  applyDispatchStartedAtUtc,
                );

              audit =
                auditBinding;

              return buildP05UserEnableProofResults({
                observedAtUtc:
                  new Date().toISOString(),
                configurationVerified:
                  true,
                httpBehaviorVerified:
                  configured.credentialLoginStatus ===
                  200,
                freshNativeRuntimeVerified:
                  nativePid > 0,
                nativeAuditBound:
                  auditBinding.enableBound &&
                  auditBinding.pidRebound,
                configurationSourceReference:
                  `IRIS SysAdmin user readback:${DEMO_FIXTURE_USERNAME}:15-fields-preserved`,
                httpSourceReference:
                  "IRIS POST /login:401->200:same-in-memory-credential",
                liveRuntimeSourceReference:
                  `IRIS Native SDK witness:${nativePid}:ProcessQuery-bound`,
                nativeAuditSourceReference:
                  `IRIS UserChange:${auditBinding.systemId}:${auditBinding.auditIndex}:${auditBinding.pid}`,
              });
            },
        },

        certification: {
          nowUtc:
            () =>
              new Date().toISOString(),

          reviewPreflight:
            async (review) => {
              if (
                !p05PrestateMatches(
                  review.preflight,
                ) ||
                review.impact.certainty !==
                  "KNOWN" ||
                review.expectedDelta.summary !==
                  P05_USER_ENABLE_DELTA_SUMMARY
              ) {
                throw new Error(
                  "Frozen P05 review packet does not satisfy the approved user-enable contract.",
                );
              }

              console.log(
                `P05_REVIEWED_PREFLIGHT_DIGEST=${review.preflightDigest}`,
              );
              console.log(
                "P05_REVIEWED_DELTA=ENABLED_FALSE_TO_TRUE_ONLY",
              );
              console.log(
                "P05_REVIEWED_DISABLED_LOGIN_HTTP=401",
              );
              console.log(
                "P05_IMPACT_CERTAINTY=KNOWN",
              );

              return review.preflightDigest;
            },

          receiptStore: {
            async persist(receipt) {
              const record =
                buildActionReceiptHistoryRecord(
                  receipt,
                );

              const persisted =
                await persistActionReceiptHistory({
                  baseUrl:
                    HISTORY_BASE,
                  accessToken:
                    session!.accessToken,
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
                  "P05 generic receipt write acknowledgement does not match the certified receipt.",
                );
              }
            },

            async read(receiptId) {
              return actionReceiptV2FromGenericHistory(
                await readActionReceiptHistory({
                  baseUrl:
                    HISTORY_BASE,
                  accessToken:
                    session!.accessToken,
                  receiptId,
                }),
              );
            },
          },
        },
      },
    );

  console.log(
    `P05_CERTIFICATION_OUTCOME=${result.outcome}`,
  );
  console.log(
    `P05_FINAL_ACTION_STATE=${result.record.state}`,
  );
  console.log(
    `P05_EVENT_COUNT=${result.events.length}`,
  );
  console.log(
    `P05_PROOF_RESULT_COUNT=${result.proofResults.length}`,
  );
  console.log(
    `P05_CERTIFICATION_REASON=${result.reason ?? "NONE"}`,
  );

  for (const event of result.events) {
    console.log(
      "P05_EVENT_LEDGER=" +
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
    physicalBusinessPutCount !== 1 ||
    audit === null ||
    freshNativePid === null ||
    reviewedDisabledUser === null
  ) {
    throw new Error(
      `P05 certification did not close VERIFIED. Reason=${result.reason ?? "none"}`,
    );
  }

  const certifiedAudit =
    requireP05AuditBinding(
      audit,
    );
  const certifiedNativePid =
    requireP05NativePid(
      freshNativePid,
    );

  const secondReadback =
    actionReceiptV2FromGenericHistory(
      await readActionReceiptHistory({
        baseUrl:
          HISTORY_BASE,
        accessToken:
          session.accessToken,
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
        session.accessToken,
      targetCanonicalId:
        TARGET_CANONICAL_ID,
    });

  if (
    !sameReceiptSet(
      targetHistoryAfter,
      [
        P03_RECEIPT_ID,
        RECEIPT_ID,
      ],
    )
  ) {
    throw new Error(
      "P05 generic target history does not contain exactly P03 historical proof plus the P05 receipt.",
    );
  }

  for (const predecessor of PREDECESSORS) {
    const receipt =
      actionReceiptV2FromGenericHistory(
        await readActionReceiptHistory({
          baseUrl:
            HISTORY_BASE,
          accessToken:
            session.accessToken,
          receiptId:
            predecessor.receiptId,
        }),
      );

    if (
      receipt.receiptSha256 !==
      predecessor.sha256
    ) {
      throw new Error(
        `Historical predecessor changed after P05: ${predecessor.receiptId}.`,
      );
    }
  }

  certificationFullyClosed = true;

  console.log(
    "P05_CONFIGURATION_READBACK=PASS",
  );
  console.log(
    "P05_HTTP_401_TO_200_SAME_CREDENTIAL=PASS",
  );
  console.log(
    "P05_FRESH_NATIVE_RUNTIME=PASS",
  );
  console.log(
    `P05_FRESH_SERVER_PID=${certifiedNativePid}`,
  );
  console.log(
    `P05_NATIVE_AUDIT_INDEX=${certifiedAudit.auditIndex}`,
  );
  console.log(
    `P05_NATIVE_AUDIT_PID=${certifiedAudit.pid}`,
  );
  console.log(
    "P05_NATIVE_AUDIT_BOUND=PASS",
  );
  console.log(
    `P05_RECEIPT_ID=${result.receipt.receiptId}`,
  );
  console.log(
    `P05_RECEIPT_SHA256=${result.receipt.receiptSha256}`,
  );
  console.log(
    "P05_GENERIC_RECEIPT_EXACT_READBACK=PASS",
  );
  console.log(
    "P05_GENERIC_RECEIPT_SECOND_FRESH_READBACK=PASS",
  );
  console.log(
    "P05_GENERIC_TARGET_HISTORY_POSTSTATE_COUNT=2",
  );
  console.log(
    "P05_P03_HISTORICAL_PROOF_PRESERVED_AFTER=PASS",
  );
  console.log(
    "P05_ALL_PREDECESSOR_RECEIPTS_UNCHANGED=PASS",
  );
  console.log(
    "P05_ACTION_VERIFIED_AFTER_READBACK_ONLY=PASS",
  );
}
finally {
  let cleanupFailure:
    Error |
    null =
      null;

  const witnessForCleanup =
    observedP05Witness(
      witness,
    );

  if (
    witnessForCleanup !== null &&
    !witnessExited
  ) {
    try {
      await witnessForCleanup.exit();
      witnessExited = true;

      console.log(
        "P05_WITNESS_NORMAL_EXIT=PASS",
      );
    }
    catch (error) {
      cleanupFailure =
        error instanceof Error
          ? error
          : new Error(
              "Unknown P05 witness cleanup failure.",
            );
    }
  }

  const cleanupAllowed =
    !businessDispatchStarted ||
    certificationFullyClosed;

  console.log(
    `P05_FIXTURE_CLEANUP_ALLOWED=${cleanupAllowed ? "YES" : "NO"}`,
  );

  if (
    adapter !== null &&
    (
      setupRoleCreated ||
      setupUserCreated
    ) &&
    !resetComplete &&
    cleanupAllowed
  ) {
    try {
      const rows =
        await readLiveWitnessProcessRows({
          pythonExecutable,
          readerScriptPath:
            processReaderScript,
          runtimePassword,
        });

      if (rows.length !== 0) {
        throw new Error(
          "P05 cleanup refused while a synthetic witness process remains.",
        );
      }

      await resetDemoFixture({
        adapter,
        vault,
      });

      resetComplete = true;

      if (
        await adapter.readUser(
          DEMO_FIXTURE_USERNAME,
        )
      ) {
        throw new Error(
          "P05 fixture user remained after reset.",
        );
      }

      if (
        await adapter.readRole(
          DEMO_FIXTURE_TRANSPORT_ROLE,
        )
      ) {
        throw new Error(
          "P05 fixture transport role remained after reset.",
        );
      }

      console.log(
        "P05_FIXTURE_RESET=PASS",
      );
      console.log(
        "P05_FIXTURE_USER_ABSENT_AFTER_RESET=PASS",
      );
      console.log(
        "P05_FIXTURE_TRANSPORT_ROLE_ABSENT_AFTER_RESET=PASS",
      );
    }
    catch (error) {
      if (cleanupFailure === null) {
        cleanupFailure =
          error instanceof Error
            ? error
            : new Error(
                "Unknown P05 fixture cleanup failure.",
              );
      }
    }
  }

  if (
    businessDispatchStarted &&
    !certificationFullyClosed
  ) {
    console.log(
      "P05_POST_DISPATCH_FORENSIC_STATE_PRESERVED=YES",
    );
    console.log(
      "P05_AUTOMATIC_FIXTURE_RESET_AFTER_FAILED_DISPATCH=NO",
    );
  }

  generation = "";
  fixturePassword = "";

  if (session !== null) {
    try {
      await logoutIris({
        baseUrl: API_BASE,
        accessToken:
          session.accessToken,
      });

      console.log(
        "P05_RUNTIME_LOGOUT_HTTP=200",
      );
    }
    catch (error) {
      if (cleanupFailure === null) {
        cleanupFailure =
          error instanceof Error
            ? error
            : new Error(
                "Unknown P05 runtime logout failure.",
              );
      }
    }
  }

  console.log(
    "P05_RUNTIME_PASSWORD_STORED=NO",
  );
  console.log(
    "P05_FIXTURE_PASSWORD_STORED=NO",
  );
  console.log(
    "P05_JWT_STORED=NO",
  );

  if (cleanupFailure !== null) {
    throw cleanupFailure;
  }
}

if (
  !certificationFullyClosed ||
  !resetComplete
) {
  throw new Error(
    "P05 live certification did not reach verified receipt closure plus fixture reset.",
  );
}

console.log(
  "P05_LIVE_CERTIFICATION=PASS",
);
console.log(
  "P05_FIXTURE_LIFECYCLE_TRANSPARENT=PASS",
);
console.log(
  "P05_BUSINESS_PUT_COUNT=1",
);
console.log(
  "P05_COMMAND_COMPLETE=YES",
);
