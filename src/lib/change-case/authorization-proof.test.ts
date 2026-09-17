import { describe, expect, it } from "vitest";
import {
  deriveAuthorizationProof,
  verificationPresentation,
  type AuthorizationDecision,
  type AuthorizationProofInput,
  type PermissionProofRow,
} from "./authorization-proof";

function row(
  id: string,
  expectedDecision: AuthorizationDecision,
  configuredDecision: AuthorizationDecision,
  liveDecision: AuthorizationDecision,
): PermissionProofRow {
  const [resource, permission = "USE"] = id.split(":");
  return {
    id,
    resource,
    permission,
    expectedDecision,
    configuredDecision,
    liveDecision,
  };
}

const lost = [
  "Meridian_Admin:USE",
  "%Admin_Task:USE",
  "Meridian_Orders:WRITE",
  "Meridian_Jobs:USE",
] as const;

const retained = [
  "Meridian_Portal:USE",
  "Meridian_Orders:READ",
] as const;

function convergedRows(): PermissionProofRow[] {
  return [
    ...lost.map((id) => row(id, "DENY", "DENY", "DENY")),
    ...retained.map((id) => row(id, "ALLOW", "ALLOW", "ALLOW")),
  ];
}

function fullInput(
  overrides: Partial<AuthorizationProofInput> = {},
): AuthorizationProofInput {
  return {
    configuredApplied: true,
    configuredSourceAvailable: true,
    liveSourceAvailable: true,
    rows: convergedRows(),
    convergence: {
      required: true,
      stalePid: 171402,
      oldPidGone: true,
      freshPid: 173081,
      freshPidDiffers: true,
    },
    nativeEvidenceComplete: true,
    canonicalReceiptPersisted: true,
    ...overrides,
  };
}

describe("authorization proof closure", () => {
  it("TEST 1 - stale four-of-four forbids VERIFIED", () => {
    const rows = [
      ...lost.map((id) => row(id, "DENY", "DENY", "ALLOW")),
      ...retained.map((id) => row(id, "ALLOW", "ALLOW", "ALLOW")),
    ];
    const result = deriveAuthorizationProof(fullInput({ rows }));
    expect(result.state).toBe("LIVE_STALE");
    expect(result.liveMismatchCount).toBe(4);
    expect(result.verified).toBe(false);
    expect(verificationPresentation(result.state).statusLabel).toBe(
      "NOT VERIFIED",
    );
  });

  it("TEST 2 - one-row stale forbids VERIFIED", () => {
    const rows = convergedRows();
    rows[0] = row(lost[0], "DENY", "DENY", "ALLOW");
    const result = deriveAuthorizationProof(fullInput({ rows }));
    expect(result.state).toBe("LIVE_STALE");
    expect(result.liveMismatchCount).toBe(1);
    expect(result.verified).toBe(false);
  });

  it("TEST 3 - live pending forbids VERIFIED", () => {
    const rows = convergedRows();
    rows[0] = row(lost[0], "DENY", "DENY", "UNKNOWN");
    const result = deriveAuthorizationProof(fullInput({ rows }));
    expect(result.state).toBe("LIVE_PENDING");
    expect(result.unknownLiveCount).toBe(1);
    expect(result.verified).toBe(false);
  });

  it("TEST 4 - configuration mismatch forbids VERIFIED", () => {
    const rows = convergedRows();
    rows[0] = row(lost[0], "DENY", "ALLOW", "ALLOW");
    const result = deriveAuthorizationProof(fullInput({ rows }));
    expect(result.state).toBe("CONFIGURATION_MISMATCH");
    expect(result.configuredMismatchCount).toBe(1);
    expect(result.verified).toBe(false);
  });

  it("TEST 5 - converged but evidence incomplete forbids VERIFIED", () => {
    const result = deriveAuthorizationProof(
      fullInput({ nativeEvidenceComplete: false }),
    );
    expect(result.state).toBe("EVIDENCE_INCOMPLETE");
    expect(result.verified).toBe(false);
  });

  it("TEST 6 - stale convergence identity failure forbids VERIFIED", () => {
    const result = deriveAuthorizationProof(
      fullInput({
        convergence: {
          required: true,
          stalePid: 171402,
          oldPidGone: true,
          freshPid: 171402,
          freshPidDiffers: false,
        },
      }),
    );
    expect(result.state).toBe("EVIDENCE_INCOMPLETE");
    expect(result.verified).toBe(false);
  });

  it("TEST 7 - exact full closure permits VERIFIED", () => {
    const result = deriveAuthorizationProof(fullInput());
    expect(result.state).toBe("VERIFIED");
    expect(result.verified).toBe(true);
    expect(verificationPresentation(result.state)).toEqual({
      statusLabel: "VERIFIED",
      detail: "CONFIGURED AND LIVE AUTHORIZATION CONVERGED",
      success: true,
    });
  });

  it("TEST 8 - retained permission regression forbids VERIFIED", () => {
    const rows = convergedRows();
    rows[4] = row(retained[0], "ALLOW", "ALLOW", "DENY");
    const result = deriveAuthorizationProof(fullInput({ rows }));
    expect(result.state).toBe("LIVE_STALE");
    expect(result.verified).toBe(false);
  });

  it("TEST 9 - unavailable source forbids VERIFIED", () => {
    const result = deriveAuthorizationProof(
      fullInput({ liveSourceAvailable: false }),
    );
    expect(result.state).toBe("UNAVAILABLE");
    expect(result.verified).toBe(false);
  });

  it("TEST 10 - non-VERIFIED states never render a VERIFIED success indicator", () => {
    const states = [
      "PRE_FLIGHT",
      "CONFIGURATION_APPLIED",
      "CONFIGURATION_MISMATCH",
      "LIVE_PENDING",
      "LIVE_STALE",
      "CONVERGED",
      "EVIDENCE_INCOMPLETE",
      "UNAVAILABLE",
    ] as const;

    for (const state of states) {
      const presentation = verificationPresentation(state);
      expect(presentation.success).toBe(false);
      expect(presentation.statusLabel).toBe("NOT VERIFIED");
    }
  });

  it("receipt persistence is part of the closure predicate", () => {
    const result = deriveAuthorizationProof(
      fullInput({ canonicalReceiptPersisted: false }),
    );
    expect(result.state).toBe("EVIDENCE_INCOMPLETE");
    expect(result.verified).toBe(false);
  });

  it("configured UNKNOWN never becomes DENY implicitly", () => {
    const rows = convergedRows();
    rows[0] = row(lost[0], "DENY", "UNKNOWN", "DENY");
    const result = deriveAuthorizationProof(fullInput({ rows }));
    expect(result.state).toBe("CONFIGURATION_APPLIED");
    expect(result.unknownConfiguredCount).toBe(1);
    expect(result.verified).toBe(false);
  });

  it("expected UNKNOWN never becomes a closure decision", () => {
    const rows = convergedRows();
    rows[0] = row(lost[0], "UNKNOWN", "DENY", "DENY");
    const result = deriveAuthorizationProof(fullInput({ rows }));
    expect(result.state).toBe("CONFIGURATION_APPLIED");
    expect(result.unknownExpectedCount).toBe(1);
    expect(result.verified).toBe(false);
  });
});