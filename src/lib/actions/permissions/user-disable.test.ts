import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildP06UserDisableProofResults,
  createP06UserDisableProofContract,
  p06ExpectedDisabledUserSnapshot,
  p06ExpectedEnabledUserSnapshot,
  p06ObservedFieldsPreserved,
  p06PoststateMatches,
  p06PrestateMatches,
  p06UserDisableIntent,
  reconcileUnknownP06UserDisable,
  type P06UserDisablePreflight,
} from "./user-disable";

function preflight(
  generation: string,
  state: "PRE" | "POST" = "PRE",
): P06UserDisablePreflight {
  return Object.freeze({
    schemaVersion: "meridian.user-disable-preflight.v1" as const,
    fixtureId: "meridian-live-demo-v1" as const,
    expectedFixtureGeneration: generation,
    user:
      state === "PRE"
        ? p06ExpectedEnabledUserSnapshot()
        : p06ExpectedDisabledUserSnapshot(),
    credentialPresent: true,
    credentialLoginStatus:
      state === "PRE"
        ? 200 as const
        : 401 as const,
    liveProcessCount:
      state === "PRE"
        ? 1
        : 0,
    officialMutationOperation: "PUT /v2/security/user" as const,
    requiredAuthority: "%Admin_Secure:U" as const,
    authorityMode: "CURRENT_STANDING_RUNTIME_AUTHORITY" as const,
  });
}

describe(
  "P06 USER_DISABLE proof path",
  () => {
    it(
      "freezes exact enabled prestate and disable-only expected delta",
      async () => {
        const generation = "p06-test-generation";
        const contract = createP06UserDisableProofContract({
          async readFreshPreflight() {
            return preflight(generation);
          },
          async executeDisable() {
          },
          async collectProofResults() {
            return buildP06UserDisableProofResults({
              observedAtUtc: "2026-09-21T12:00:10.000Z",
              configurationVerified: true,
              httpBehaviorVerified: true,
              nativeDisableRuntimeVerified: true,
              nativeAuditBound: true,
              configurationSourceReference: "config",
              httpSourceReference: "login",
              liveRuntimeSourceReference: "runtime",
              nativeAuditSourceReference: "audit",
            });
          },
        });

        const intent = p06UserDisableIntent(generation);
        const observed = await contract.preflight(
          {
            actionId: "test-p06",
            logicalActor: "test",
            irisRuntimeUser: "meridian.runtime",
            nowUtc: "2026-09-21T12:00:00.000Z",
          },
          intent,
        );

        expect(p06PrestateMatches(observed)).toBe(true);

        const delta = contract.expectedDelta(intent, observed);
        expect(delta.before).toMatchObject({
          enabled: true,
          sameCredentialLoginStatus: 200,
        });
        expect(delta.after).toMatchObject({
          enabled: false,
          sameCredentialLoginStatus: 401,
        });
      },
    );

    it(
      "requires every non-Enabled Security.Users field to survive unchanged",
      () => {
        const before = p06ExpectedEnabledUserSnapshot();
        const exactAfter = p06ExpectedDisabledUserSnapshot();
        const driftedAfter = Object.freeze({
          ...exactAfter,
          comment: "drift",
        });

        expect(
          p06ObservedFieldsPreserved(before, exactAfter),
        ).toBe(true);
        expect(
          p06ObservedFieldsPreserved(before, driftedAfter),
        ).toBe(false);

        expect(
          p06PoststateMatches(
            preflight("g", "POST"),
            before,
          ),
        ).toBe(true);
      },
    );

    it(
      "returns typed stale revalidation with zero mutation dispatch",
      async () => {
        const generation = "p06-stale-generation";
        let current = preflight(generation);
        let mutationCount = 0;

        const contract = createP06UserDisableProofContract({
          async readFreshPreflight() {
            return current;
          },
          async executeDisable() {
            mutationCount += 1;
          },
          async collectProofResults() {
            return Object.freeze([]);
          },
        });

        const intent = p06UserDisableIntent(generation);
        const reviewed = await contract.preflight(
          {
            actionId: "test-p06-stale",
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
            actionId: "test-p06-stale",
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
      "reconciles only exact reviewed prestate or field-preserving disabled poststate",
      () => {
        const generation = "p06-reconcile";
        const reviewed = preflight(generation);
        const applied = reconcileUnknownP06UserDisable(
          preflight(generation, "POST"),
          reviewed,
        );
        const notApplied = reconcileUnknownP06UserDisable(
          reviewed,
          reviewed,
        );
        const ambiguous = reconcileUnknownP06UserDisable(
          Object.freeze({
            ...preflight(generation, "POST"),
            user: Object.freeze({
              ...p06ExpectedEnabledUserSnapshot(),
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
      "requires all four differentiated P06 proof planes",
      () => {
        const results = buildP06UserDisableProofResults({
          observedAtUtc: "2026-09-21T12:00:10.000Z",
          configurationVerified: true,
          httpBehaviorVerified: true,
          nativeDisableRuntimeVerified: true,
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
