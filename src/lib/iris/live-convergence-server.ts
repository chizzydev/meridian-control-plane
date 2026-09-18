import "server-only";

import {
  randomUUID,
} from "node:crypto";

import {
  join,
} from "node:path";

import {
  DEMO_FIXTURE_ID,
  DEMO_FIXTURE_USERNAME,
} from "../change-case/demo-fixture";

import {
  advanceLiveConvergenceCore,
  buildPostApplyWitnessObservation,
  buildPreApplyWitnessBaseline,
  recordStaleLiveWitnessCore,
  type LiveConvergenceAdvanceDependencies,
  type LiveConvergenceDependencies,
  type LiveWitnessObservation,
} from "../change-case/live-convergence";

import type {
  DurableChangeCaseRecord,
  DurableChangeCaseSnapshot,
} from "../change-case/durable-change-case";

import {
  appendDurableChangeCaseEvent,
  readDurableChangeCase,
} from "./change-case-history-server";

import {
  readDemoFixtureCredentialForServer,
} from "./demo-fixture-server";

import {
  applyLiveDemoChangeCase,
  type LiveChangeCaseApplyServerContext,
} from "./live-change-case-apply-server";

import {
  readLiveWitnessProcessRows,
  startLiveWitnessNativeSession,
  waitForOldWitnessPidGone,
  type LiveWitnessNativeSession,
} from "./live-witness-native";

export interface LiveConvergenceServerContext
  extends LiveChangeCaseApplyServerContext {
  readonly nativePythonExecutable:
    string;

  readonly runtimePassword:
    string;
}

interface PreparedWitnessSession {
  readonly caseId:
    string;

  readonly generation:
    string;

  readonly native:
    LiveWitnessNativeSession;

  readonly preApplyBaseline:
    LiveWitnessObservation;
}

const preparedWitnesses =
  new Map<
    string,
    PreparedWitnessSession
  >();

function workerScriptPath():
  string {
  return join(
    process.cwd(),
    "scripts",
    "iris-live-witness-worker.py",
  );
}

function readerScriptPath():
  string {
  return join(
    process.cwd(),
    "scripts",
    "iris-processquery-witness-reader.py",
  );
}

function assertFixedRecord(
  record:
    DurableChangeCaseRecord,
): void {
  if (
    record.mode !==
      "LIVE_ISOLATED_DEMO" ||
    record.fixture.fixtureId !==
      DEMO_FIXTURE_ID ||
    record.fixture.username !==
      DEMO_FIXTURE_USERNAME ||
    record.fixture.expectedGeneration.trim().length ===
      0
  ) {
    throw new Error(
      "Live witness refused a Change Case outside the fixed A3 fixture authority.",
    );
  }
}

function dependencies(
  context:
    LiveConvergenceServerContext,
): LiveConvergenceDependencies {
  return {
    readCase:
      async (
        caseId,
      ) =>
        readDurableChangeCase({
          baseUrl:
            context.historyBaseUrl,
          accessToken:
            context.accessToken,
          caseId,
        }),

    appendEvent:
      async (
        mutation,
      ) =>
        appendDurableChangeCaseEvent({
          baseUrl:
            context.historyBaseUrl,
          accessToken:
            context.accessToken,
          mutation,
        }),

    nowUtc:
      () =>
        new Date().toISOString(),

    newObservationId:
      randomUUID,
  };
}

async function processRows(
  context:
    LiveConvergenceServerContext,
) {
  return readLiveWitnessProcessRows({
    pythonExecutable:
      context.nativePythonExecutable,
    readerScriptPath:
      readerScriptPath(),
    runtimePassword:
      context.runtimePassword,
  });
}

async function disposePreparedWitness(
  caseId:
    string,
): Promise<void> {
  const prepared =
    preparedWitnesses.get(
      caseId,
    );

  if (!prepared) {
    return;
  }

  await prepared.native.exit();

  preparedWitnesses.delete(
    caseId,
  );
}

export async function prepareLiveDemoWitnessForApply(
  context:
    LiveConvergenceServerContext,
  input: {
    readonly caseId:
      string;

    readonly expectedCaseVersion:
      number;
  },
): Promise<LiveWitnessObservation> {
  const snapshot =
    await readDurableChangeCase({
      baseUrl:
        context.historyBaseUrl,
      accessToken:
        context.accessToken,
      caseId:
        input.caseId,
    });

  assertFixedRecord(
    snapshot.record,
  );

  if (
    snapshot.record.version !==
      input.expectedCaseVersion ||
    snapshot.record.state !==
      "READY"
  ) {
    throw new Error(
      "Live witness preparation requires the exact authoritative READY case version.",
    );
  }

  if (
    preparedWitnesses.has(
      input.caseId,
    )
  ) {
    throw new Error(
      "Live witness is already prepared for this Change Case.",
    );
  }

  const beforeRows =
    await processRows(
      context,
    );

  if (
    beforeRows.length !==
      0
  ) {
    throw new Error(
      "Live witness preparation requires zero pre-existing fixture processes.",
    );
  }

  const fixturePassword =
    readDemoFixtureCredentialForServer({
      fixtureId:
        DEMO_FIXTURE_ID,
      generation:
        snapshot.record.fixture.expectedGeneration,
    });

  const native =
    await startLiveWitnessNativeSession({
      pythonExecutable:
        context.nativePythonExecutable,
      workerScriptPath:
        workerScriptPath(),
      fixturePassword,
      expectedFixtureGeneration:
        snapshot.record.fixture.expectedGeneration,
    });

  try {
    const observedRows =
      await processRows(
        context,
      );

    const baseline =
      buildPreApplyWitnessBaseline({
        record:
          snapshot.record,
        observationId:
          randomUUID(),
        self:
          native.startup,
        processRows:
          observedRows,
      });

    preparedWitnesses.set(
      input.caseId,
      Object.freeze({
        caseId:
          input.caseId,
        generation:
          snapshot.record.fixture.expectedGeneration,
        native,
        preApplyBaseline:
          baseline,
      }),
    );

    return baseline;
  } catch (
    error
  ) {
    await native.exit();

    throw error;
  }
}

export async function applyLiveDemoChangeCaseWithWitness(
  context:
    LiveConvergenceServerContext,
  input: {
    readonly caseId:
      string;

    readonly expectedCaseVersion:
      number;
  },
) {
  const prepared =
    preparedWitnesses.get(
      input.caseId,
    );

  if (!prepared) {
    throw new Error(
      "Live Apply requires a prepared server-owned synthetic witness.",
    );
  }

  const beforeApply =
    await readDurableChangeCase({
      baseUrl:
        context.historyBaseUrl,
      accessToken:
        context.accessToken,
      caseId:
        input.caseId,
    });

  assertFixedRecord(
    beforeApply.record,
  );

  if (
    beforeApply.record.fixture.expectedGeneration !==
      prepared.generation ||
    beforeApply.record.version !==
      input.expectedCaseVersion ||
    beforeApply.record.state !==
      "READY"
  ) {
    await disposePreparedWitness(
      input.caseId,
    );

    throw new Error(
      "Prepared live witness no longer matches the authoritative READY case.",
    );
  }

  const applied =
    await applyLiveDemoChangeCase(
      context,
      input,
    );

  if (
    applied.state !==
      "APPLIED"
  ) {
    await disposePreparedWitness(
      input.caseId,
    );

    return Object.freeze({
      apply:
        applied,
      convergence:
        null,
    });
  }

  try {
    const sameConnection =
      await prepared.native.observe();

    const observedRows =
      await processRows(
        context,
      );

    const staleObservation =
      buildPostApplyWitnessObservation({
        record:
          applied.snapshot.record,
        observationId:
          randomUUID(),
        phase:
          "STALE",
        self:
          sameConnection,
        processRows:
          observedRows,
      });

    const convergence =
      await recordStaleLiveWitnessCore(
        {
          caseId:
            input.caseId,
          expectedCaseVersion:
            applied.snapshot.record.version,
          preApplyBaseline:
            prepared.preApplyBaseline,
          staleObservation,
        },
        dependencies(
          context,
        ),
      );

    return Object.freeze({
      apply:
        applied,
      convergence,
    });
  } catch (
    error
  ) {
    await disposePreparedWitness(
      input.caseId,
    );

    throw error;
  }
}

export async function advanceLiveDemoConvergence(
  context:
    LiveConvergenceServerContext,
  input: {
    readonly caseId:
      string;

    readonly expectedCaseVersion:
      number;
  },
) {
  const prepared =
    preparedWitnesses.get(
      input.caseId,
    );

  if (!prepared) {
    throw new Error(
      "Controlled convergence requires the server-owned prepared witness.",
    );
  }

  const core =
    dependencies(
      context,
    );

  const advanceDependencies:
    LiveConvergenceAdvanceDependencies = {
      ...core,

      closeOldWitness:
        async () =>
          prepared.native
            .closeConnection(),

      proveOldPidGone:
        async (
          staleObservation,
        ) =>
          waitForOldWitnessPidGone({
            pythonExecutable:
              context.nativePythonExecutable,
            readerScriptPath:
              readerScriptPath(),
            runtimePassword:
              context.runtimePassword,
            oldPid:
              staleObservation.serverPid,
          }),

      openFreshWitness:
        async (
          record,
          staleObservation,
        ) => {
          const self =
            await prepared.native
              .reconnect();

          const observedRows =
            await processRows(
              context,
            );

          const fresh =
            buildPostApplyWitnessObservation({
              record,
              observationId:
                randomUUID(),
              phase:
                "CONVERGED",
              self,
              processRows:
                observedRows,
            });

          if (
            fresh.serverPid ===
              staleObservation.serverPid
          ) {
            throw new Error(
              "Fresh synthetic witness reused the stale server PID.",
            );
          }

          return fresh;
        },
    };

  return advanceLiveConvergenceCore(
    input,
    advanceDependencies,
  );
}

export async function closeLiveDemoWitnessAfterEvidence(
  input: {
    readonly caseId:
      string;
  },
): Promise<void> {
  await disposePreparedWitness(
    input.caseId,
  );
}

export async function readLiveDemoConvergenceCase(
  context:
    LiveConvergenceServerContext,
  input: {
    readonly caseId:
      string;
  },
): Promise<DurableChangeCaseSnapshot> {
  return readDurableChangeCase({
    baseUrl:
      context.historyBaseUrl,
    accessToken:
      context.accessToken,
    caseId:
      input.caseId,
  });
}
