import {
  describe,
  expect,
  it,
} from "vitest";

import {
  LIVE_WITNESS_LOST_PERMISSION_KEYS,
  LIVE_WITNESS_REQUIRED_PERMISSION_KEYS,
  LIVE_WITNESS_RETAINED_PERMISSION_KEYS,
  LIVE_WITNESS_TRANSPORT_PERMISSION_KEYS,
  type LiveWitnessProcessRow,
  type LiveWitnessSelfSnapshot,
} from "../../change-case/live-convergence";

import {
  assertUserRemoveRolePreApplyWitness,
  proveUserRemoveRoleLiveConvergence,
} from "./live-evidence";

function snapshot(
  pid:
    number,
  overrides:
    Partial<
      Record<
        (typeof LIVE_WITNESS_REQUIRED_PERMISSION_KEYS)[number],
        0 | 1
      >
    > = {},
): LiveWitnessSelfSnapshot {
  const checks =
    Object.fromEntries(
      LIVE_WITNESS_REQUIRED_PERMISSION_KEYS.map(
        (
          key,
        ) => [
          key,
          overrides[
            key
          ] ??
            1,
        ],
      ),
    ) as
      LiveWitnessSelfSnapshot["checks"];

  return {
    capturedAtUtc:
      "2026-09-20T16:00:00.000Z",
    generation:
      "a5-test-generation",
    purposeMarker:
      "meridian:process-witness:a5-test-generation",
    username:
      "meridian.demo.witness",
    namespace:
      "USER",
    serverPid:
      pid,
    usingSharedMemory:
      false,
    checks,
  };
}

function processRow(
  pid:
    number,
): LiveWitnessProcessRow {
  return {
    pid,
    username:
      "meridian.demo.witness",
    loginRoles:
      [],
    roles:
      [],
    namespace:
      "USER",
    startTimeUtc:
      "2026-09-20T16:00:00.000Z",
    clientIPAddress:
      "127.0.0.1",
    startupClientIPAddress:
      "127.0.0.1",
    purposeMarker:
      "meridian:process-witness:a5-test-generation",
    canBeSuspended:
      true,
    canBeTerminated:
      true,
    state:
      "RUN",
  };
}

describe(
  "USER_REMOVE_ROLE live evidence",
  () => {
    it(
      "requires one pre-Apply process with all scoped decisions ALLOW",
      () => {
        expect(
          () =>
            assertUserRemoveRolePreApplyWitness({
              snapshot:
                snapshot(
                  100,
                ),
              processRows: [
                processRow(
                  100,
                ),
              ],
            }),
        ).not.toThrow();
      },
    );

    it(
      "proves same-process staleness and fresh-process convergence",
      () => {
        const freshOverrides:
          Partial<
            Record<
              (typeof LIVE_WITNESS_REQUIRED_PERMISSION_KEYS)[number],
              0 | 1
            >
          > =
          {};

        for (
          const key
          of LIVE_WITNESS_LOST_PERMISSION_KEYS
        ) {
          freshOverrides[
            key
          ] =
            0;
        }

        for (
          const key
          of [
            ...LIVE_WITNESS_RETAINED_PERMISSION_KEYS,
            ...LIVE_WITNESS_TRANSPORT_PERMISSION_KEYS,
          ]
        ) {
          freshOverrides[
            key
          ] =
            1;
        }

        const proof =
          proveUserRemoveRoleLiveConvergence({
            preApply:
              snapshot(
                100,
              ),
            stale:
              snapshot(
                100,
              ),
            fresh:
              snapshot(
                200,
                freshOverrides,
              ),
            oldPidGone:
              true,
            freshProcessRows: [
              processRow(
                200,
              ),
            ],
          });

        expect(
          proof,
        ).toMatchObject({
          staleSameConnectionProven:
            true,
          oldServerPid:
            100,
          freshServerPid:
            200,
          oldPidGone:
            true,
          lostPermissionDeniedCount:
            4,
          retainedPermissionAllowedCount:
            2,
          transportPermissionAllowedCount:
            4,
          freshProcessBound:
            true,
          converged:
            true,
        });
      },
    );

    it(
      "rejects a fresh witness that still retains removed authority",
      () => {
        expect(
          () =>
            proveUserRemoveRoleLiveConvergence({
              preApply:
                snapshot(
                  100,
                ),
              stale:
                snapshot(
                  100,
                ),
              fresh:
                snapshot(
                  200,
                ),
              oldPidGone:
                true,
              freshProcessRows: [
                processRow(
                  200,
                ),
              ],
            }),
        ).toThrow(
          "deny all four",
        );
      },
    );
  },
);
