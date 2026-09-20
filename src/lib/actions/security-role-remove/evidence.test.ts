import {
  describe,
  expect,
  it,
} from "vitest";

import {
  evaluateProofClosure,
} from "../../proof/evidence";

import {
  USER_REMOVE_ROLE_PROOF_REQUIREMENTS,
  buildUserRemoveRoleProofResults,
} from "./evidence";

function evidence(
  overrides: {
    readonly configurationVerified?: boolean;
    readonly permissionEffectVerified?: boolean;
    readonly liveRuntimeConverged?: boolean;
    readonly nativeAuditBound?: boolean;
  } = {},
) {
  return buildUserRemoveRoleProofResults({
    observedAtUtc:
      "2026-09-20T14:00:00.000Z",

    configurationVerified:
      overrides.configurationVerified ??
      true,

    permissionEffectVerified:
      overrides.permissionEffectVerified ??
      true,

    liveRuntimeConverged:
      overrides.liveRuntimeConverged ??
      true,

    nativeAuditBound:
      overrides.nativeAuditBound ??
      true,

    configurationSourceReference:
      "sysadmin:user-readback",

    permissionSourceReference:
      "role-graph",

    liveRuntimeSourceReference:
      "live-witness",

    nativeAuditSourceReference:
      "audit:481",
  });
}

describe(
  "USER_REMOVE_ROLE proof mapping",
  () => {
    it(
      "requires configuration, permission effect, live runtime and native audit",
      () => {
        expect(
          USER_REMOVE_ROLE_PROOF_REQUIREMENTS.map(
            (
              requirement,
            ) =>
              requirement.plane,
          ),
        ).toEqual([
          "CONFIGURATION_READBACK",
          "PERMISSION_EFFECT",
          "LIVE_RUNTIME",
          "NATIVE_AUDIT",
        ]);

        expect(
          USER_REMOVE_ROLE_PROOF_REQUIREMENTS.every(
            (
              requirement,
            ) =>
              requirement.applicability ===
              "REQUIRED",
          ),
        ).toBe(
          true,
        );
      },
    );

    it(
      "does not make durable receipt persistence an action-specific proof requirement",
      () => {
        expect(
          USER_REMOVE_ROLE_PROOF_REQUIREMENTS.some(
            (
              requirement,
            ) =>
              requirement.plane ===
              "PERSISTENT_RECEIPT",
          ),
        ).toBe(
          false,
        );
      },
    );

    it(
      "closes action-specific evidence only when all four proofs pass",
      () => {
        expect(
          evaluateProofClosure(
            USER_REMOVE_ROLE_PROOF_REQUIREMENTS,
            evidence(),
          ).satisfied,
        ).toBe(
          true,
        );
      },
    );

    it.each([
      "configurationVerified",
      "permissionEffectVerified",
      "liveRuntimeConverged",
      "nativeAuditBound",
    ] as const)(
      "blocks evidence closure when %s is false",
      (
        field:
          | "configurationVerified"
          | "permissionEffectVerified"
          | "liveRuntimeConverged"
          | "nativeAuditBound",
      ) => {
        expect(
          evaluateProofClosure(
            USER_REMOVE_ROLE_PROOF_REQUIREMENTS,
            evidence({
              [field]:
                false,
            }),
          ).satisfied,
        ).toBe(
          false,
        );
      },
    );
  },
);
