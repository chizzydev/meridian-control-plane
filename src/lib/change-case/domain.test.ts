import { describe, expect, it } from "vitest";

import {
  CENTERPIECE_CHANGE,
  assertTransition,
  canTransition,
  createProposedChangeCase,
} from "./domain";

describe("Change Case lifecycle", () => {
  it("supports the frozen happy path", () => {
    expect(canTransition("PROPOSED", "PREFLIGHTED")).toBe(true);
    expect(canTransition("PREFLIGHTED", "READY")).toBe(true);
    expect(canTransition("READY", "APPLIED")).toBe(true);
    expect(canTransition("APPLIED", "CONVERGING")).toBe(true);
    expect(canTransition("CONVERGING", "VERIFIED")).toBe(true);
  });

  it("does not let APPLIED skip directly to VERIFIED", () => {
    expect(canTransition("APPLIED", "VERIFIED")).toBe(false);
    expect(() => assertTransition("APPLIED", "VERIFIED")).toThrow(
      "Invalid Change Case transition: APPLIED -> VERIFIED",
    );
  });

  it("supports apply-time stale safety", () => {
    expect(canTransition("READY", "STALE")).toBe(true);
    expect(canTransition("STALE", "PREFLIGHTED")).toBe(true);
  });

  it("supports recovery from apply failure only through fresh preflight", () => {
    expect(canTransition("READY", "APPLY_FAILED")).toBe(true);
    expect(canTransition("APPLY_FAILED", "PREFLIGHTED")).toBe(true);
    expect(canTransition("APPLY_FAILED", "APPLIED")).toBe(false);
  });

  it("allows audit to remain pending without declaring VERIFIED", () => {
    expect(canTransition("CONVERGING", "AUDIT_PENDING")).toBe(true);
    expect(canTransition("AUDIT_PENDING", "VERIFIED")).toBe(true);
  });

  it("creates the centerpiece as a proposed case without inventing preflight", () => {
    const changeCase = createProposedChangeCase(
      "case-demo-001",
      CENTERPIECE_CHANGE,
    );

    expect(changeCase).toEqual({
      id: "case-demo-001",
      state: "PROPOSED",
      change: {
        username: "maya.patel",
        displayName: "Maya Patel",
        operation: "REMOVE",
        role: "MeridianSupervisor",
      },
      reviewedPreflightDigest: null,
    });
  });
});