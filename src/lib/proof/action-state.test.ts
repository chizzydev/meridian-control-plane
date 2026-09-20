import {
  describe,
  expect,
  it,
} from "vitest";

import {
  assertVerifiedActionTransition,
  canTransitionVerifiedAction,
  isVerifiedActionFailure,
  isVerifiedActionTerminal,
} from "./action-state";

describe(
  "Verified Action V2 lifecycle",
  () => {
    it(
      "supports the complete proof-first success path",
      () => {
        const path = [
          [
            "CREATED",
            "PREFLIGHTING",
          ],
          [
            "PREFLIGHTING",
            "PREFLIGHTED",
          ],
          [
            "PREFLIGHTED",
            "APPROVED",
          ],
          [
            "APPROVED",
            "REVALIDATING",
          ],
          [
            "REVALIDATING",
            "READY",
          ],
          [
            "READY",
            "APPLYING",
          ],
          [
            "APPLYING",
            "APPLIED",
          ],
          [
            "APPLIED",
            "VERIFYING",
          ],
          [
            "VERIFYING",
            "EVIDENCE_COMPLETE",
          ],
          [
            "EVIDENCE_COMPLETE",
            "RECEIPT_PERSISTING",
          ],
          [
            "RECEIPT_PERSISTING",
            "VERIFIED",
          ],
        ] as const;

        for (
          const [
            from,
            to,
          ]
          of path
        ) {
          expect(
            canTransitionVerifiedAction(
              from,
              to,
            ),
          ).toBe(
            true,
          );
        }
      },
    );

    it(
      "never lets APPLIED skip proof and receipt closure",
      () => {
        expect(
          canTransitionVerifiedAction(
            "APPLIED",
            "VERIFIED",
          ),
        ).toBe(
          false,
        );

        expect(
          () =>
            assertVerifiedActionTransition(
              "APPLIED",
              "VERIFIED",
            ),
        ).toThrow(
          "Invalid Verified Action transition: APPLIED -> VERIFIED",
        );
      },
    );

    it(
      "never lets EVIDENCE_COMPLETE skip durable receipt persistence",
      () => {
        expect(
          canTransitionVerifiedAction(
            "EVIDENCE_COMPLETE",
            "VERIFIED",
          ),
        ).toBe(
          false,
        );
      },
    );

    it(
      "marks stale revalidation as terminal for that action attempt",
      () => {
        expect(
          canTransitionVerifiedAction(
            "REVALIDATING",
            "STALE",
          ),
        ).toBe(
          true,
        );

        expect(
          isVerifiedActionTerminal(
            "STALE",
          ),
        ).toBe(
          true,
        );

        expect(
          isVerifiedActionFailure(
            "STALE",
          ),
        ).toBe(
          true,
        );
      },
    );

    it(
      "models post-dispatch uncertainty before any retry",
      () => {
        expect(
          canTransitionVerifiedAction(
            "APPLYING",
            "UNKNOWN_AFTER_DISPATCH",
          ),
        ).toBe(
          true,
        );

        expect(
          canTransitionVerifiedAction(
            "UNKNOWN_AFTER_DISPATCH",
            "RECONCILING",
          ),
        ).toBe(
          true,
        );

        expect(
          canTransitionVerifiedAction(
            "RECONCILING",
            "APPLIED",
          ),
        ).toBe(
          true,
        );

        expect(
          canTransitionVerifiedAction(
            "RECONCILING",
            "APPLY_FAILED",
          ),
        ).toBe(
          true,
        );

        expect(
          canTransitionVerifiedAction(
            "RECONCILING",
            "UNKNOWN_AFTER_DISPATCH",
          ),
        ).toBe(
          true,
        );

        expect(
          canTransitionVerifiedAction(
            "UNKNOWN_AFTER_DISPATCH",
            "APPLYING",
          ),
        ).toBe(
          false,
        );
      },
    );

    it(
      "also allows verification uncertainty to enter reconciliation",
      () => {
        expect(
          canTransitionVerifiedAction(
            "VERIFYING",
            "UNKNOWN_AFTER_DISPATCH",
          ),
        ).toBe(
          true,
        );
      },
    );

    it(
      "keeps VERIFIED terminal so later recovery cannot rewrite historical closure",
      () => {
        expect(
          isVerifiedActionTerminal(
            "VERIFIED",
          ),
        ).toBe(
          true,
        );

        expect(
          canTransitionVerifiedAction(
            "VERIFIED",
            "APPLYING",
          ),
        ).toBe(
          false,
        );
      },
    );

    it.each([
      "DENIED",
      "APPLY_FAILED",
      "VERIFY_FAILED",
      "RECEIPT_WRITE_FAILED",
    ] as const)(
      "keeps %s terminal for that action attempt",
      (
        state,
      ) => {
        expect(
          isVerifiedActionTerminal(
            state,
          ),
        ).toBe(
          true,
        );

        expect(
          isVerifiedActionFailure(
            state,
          ),
        ).toBe(
          true,
        );
      },
    );

    it(
      "requires explicit revalidation between approval and READY",
      () => {
        expect(
          canTransitionVerifiedAction(
            "APPROVED",
            "READY",
          ),
        ).toBe(
          false,
        );

        expect(
          canTransitionVerifiedAction(
            "APPROVED",
            "REVALIDATING",
          ),
        ).toBe(
          true,
        );
      },
    );

    it(
      "requires receipt readback semantics to be represented before VERIFIED by later engine layers",
      () => {
        expect(
          canTransitionVerifiedAction(
            "RECEIPT_PERSISTING",
            "VERIFIED",
          ),
        ).toBe(
          true,
        );

        expect(
          canTransitionVerifiedAction(
            "RECEIPT_PERSISTING",
            "RECEIPT_WRITE_FAILED",
          ),
        ).toBe(
          true,
        );
      },
    );
  },
);
