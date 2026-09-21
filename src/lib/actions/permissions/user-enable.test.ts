import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildP05UserEnableProofResults,
  createP05UserEnableProofContract,
  p05ExpectedDisabledUserSnapshot,
  p05ExpectedEnabledUserSnapshot,
  p05ObservedFieldsPreserved,
  p05PoststateMatches,
  p05PrestateMatches,
  p05UserEnableIntent,
  reconcileUnknownP05UserEnable,
  type P05UserEnablePreflight,
} from "./user-enable";

function preflight(
  generation: string,
  state: "PRE" | "POST" = "PRE",
): P05UserEnablePreflight {
  return Object.freeze({
    schemaVersion: "meridian.user-enable-preflight.v1" as const,
    fixtureId: "meridian-live-demo-v1" as const,
    expectedFixtureGeneration: generation,
    user:
      state === "PRE"
        ? p05ExpectedDisabledUserSnapshot()
        : p05ExpectedEnabledUserSnapshot(),
    credentialPresent: true,
    credentialLoginStatus:
      state === "PRE"
        ? 401 as const
        : 200 as const,
    liveProcessCount: 0,
    officialMutationOperation: "PUT /v2/security/user" as const,
    requiredAuthority: "%Admin_Secure:U" as const,
    authorityMode: "CURRENT_STANDING_RUNTIME_AUTHORITY" as const,
  });
}

describe(
  "P05 USER_ENABLE proof path",
  () => {
    it(
      "freezes exact disabled prestate and enable-only expected delta",
      async () => {
        const generation = "p05-test-generation";
        const contract = createP05UserEnableProofContract({
          async readFreshPreflight() {
            return preflight(generation);
          },
          async executeEnable() {
          },
          async collectProofResults() {
            return buildP05UserEnableProofResults({
              observedAtUtc: "2026-09-21T12:00:10.000Z",
              configurationVerified: true,
              httpBehaviorVerified: true,
              freshNativeRuntimeVerified: true,
              nativeAuditBound: true,
              configurationSourceReference: "config",
              httpSourceReference: "login",
              liveRuntimeSourceReference: "runtime",
              nativeAuditSourceReference: "audit",
            });
          },
        });

        const intent = p05UserEnableIntent(generation);
        const observed = await contract.preflight(
          {
            actionId: "test-p05",
            logicalActor: "test",
            irisRuntimeUser: "meridian.runtime",
            nowUtc: "2026-09-21T12:00:00.000Z",
          },
          intent,
        );

        expect(p05PrestateMatches(observed)).toBe(true);

        const delta = contract.expectedDelta(intent, observed);
        expect(delta.before).toMatchObject({
          enabled: false,
          sameCredentialLoginStatus: 401,
        });
        expect(delta.after).toMatchObject({
          enabled: true,
          sameCredentialLoginStatus: 200,
        });
      },
    );

    it(
      "requires every non-Enabled Security.Users field to survive unchanged",
      () => {
        const before = p05ExpectedDisabledUserSnapshot();
        const exactAfter = p05ExpectedEnabledUserSnapshot();
        const driftedAfter = Object.freeze({
          ...exactAfter,
          comment: "drift",
        });

        expect(
          p05ObservedFieldsPreserved(before, exactAfter),
        ).toBe(true);
        expect(
          p05ObservedFieldsPreserved(before, driftedAfter),
        ).toBe(false);

        expect(
          p05PoststateMatches(
            preflight("g", "POST"),
            before,
          ),
        ).toBe(true);
      },
    );

    it(
      "returns typed stale revalidation with zero mutation dispatch",
      async () => {
        const generation = "p05-stale-generation";
        let current = preflight(generation);
        let mutationCount = 0;

        const contract = createP05UserEnableProofContract({
          async readFreshPreflight() {
            return current;
          },
          async executeEnable() {
            mutationCount += 1;
          },
          async collectProofResults() {
            return Object.freeze([]);
          },
        });

        const intent = p05UserEnableIntent(generation);
        const reviewed = await contract.preflight(
          {
            actionId: "test-p05-stale",
            logicalActor: "test",
            irisRuntimeUser: "meridian.runtime",
            nowUtc: "2026-09-21T12:00:00.000Z",
          },
          intent,
        );

        current = Object.freeze({
          ...current,
          credentialPresent: false,
        });

        const decision = await contract.revalidate(
          {
            actionId: "test-p05-stale",
            logicalActor: "test",
            irisRuntimeUser: "meridian.runtime",
            nowUtc: "2026-09-21T12:00:01.000Z",
          },
          {
            intent,
            preflight: reviewed,
            reviewedPreflightDigest:
              contract.digestPreflight(reviewed),
          },
        );

        expect(decision.outcome).toBe("STALE");
        expect(mutationCount).toBe(0);
      },
    );

    it(
      "reconciles only exact reviewed prestate or field-preserving enabled poststate",
      () => {
        const generation = "p05-reconcile";
        const reviewed = preflight(generation);
        const applied = reconcileUnknownP05UserEnable(
          preflight(generation, "POST"),
          reviewed,
        );
        const notApplied = reconcileUnknownP05UserEnable(
          reviewed,
          reviewed,
        );
        const ambiguous = reconcileUnknownP05UserEnable(
          Object.freeze({
            ...preflight(generation, "POST"),
            user: Object.freeze({
              ...p05ExpectedEnabledUserSnapshot(),
              comment: "unexpected-drift",
            }),
          }),
          reviewed,
        );

        expect(applied.outcome).toBe("APPLIED");
        expect(notApplied.outcome).toBe("NOT_APPLIED");
        expect(ambiguous.outcome).toBe("STILL_UNKNOWN");
      },
    );

    it(
      "requires all four differentiated P05 proof planes",
      () => {
        const results = buildP05UserEnableProofResults({
          observedAtUtc: "2026-09-21T12:00:10.000Z",
          configurationVerified: true,
          httpBehaviorVerified: true,
          freshNativeRuntimeVerified: true,
          nativeAuditBound: true,
          configurationSourceReference: "config",
          httpSourceReference: "login",
          liveRuntimeSourceReference: "runtime",
          nativeAuditSourceReference: "audit",
        });

        expect(results.map((result) => result.plane)).toEqual([
          "CONFIGURATION_READBACK",
          "HTTP_BEHAVIOR",
          "LIVE_RUNTIME",
          "NATIVE_AUDIT",
        ]);
        expect(results.every((result) => result.status === "PASS")).toBe(true);
      },
    );
  },
);
