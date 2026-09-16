import {
  failedMutationExecution,
  classifyCenterpieceMutationResponse,
  staleMutationExecution,
  type RoleMutationExecutionResult,
} from "../change-case/role-mutation-execution";

import {
  type ReadyReviewedPreflight,
} from "../change-case/ready-preflight";

import type {
  revalidateCenterpieceReadyForApply,
  CenterpieceApplyTimeRevalidation,
} from "./apply-revalidation";

import {
  buildCenterpieceRoleMutationTransportPlan,
} from "./role-mutation-transport";

export interface RoleMutationExecutorDependencies {
  readonly revalidate?:
    typeof revalidateCenterpieceReadyForApply;

  readonly fetchImpl?:
    typeof fetch;
}

function joinUrl(
  base:
    string,

  path:
    string,
): string {
  return (
    base.replace(
      /\/+$/,
      "",
    ) +
    path
  );
}

/**
 * The real centerpiece Apply executor.
 *
 * Ordering is intentional:
 * 1. perform a fresh authoritative 10C revalidation,
 * 2. refuse STALE with zero POST,
 * 3. derive the exact frozen centerpiece transport,
 * 4. issue exactly one POST,
 * 5. require helper-side post-write configuration verification.
 *
 * APPLIED is configuration completion only. It is not convergence and is
 * never VERIFIED.
 */
export async function executeCenterpieceRoleMutation(
  input: {
    readonly apiBaseUrl:
      string;

    readonly helperBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly ready:
      ReadyReviewedPreflight;
  },

  dependencies:
    RoleMutationExecutorDependencies = {},
): Promise<
  RoleMutationExecutionResult
> {
  const revalidate =
    dependencies.revalidate ??
    (
      await import(
        "./apply-revalidation"
      )
    ).revalidateCenterpieceReadyForApply;

  const revalidation:
    CenterpieceApplyTimeRevalidation =
      await revalidate({
        apiBaseUrl:
          input.apiBaseUrl,

        helperBaseUrl:
          input.helperBaseUrl,

        accessToken:
          input.accessToken,

        ready:
          input.ready,
      });

  if (
    revalidation.decision.state ===
      "STALE"
  ) {
    return staleMutationExecution({
      reviewedDigest:
        revalidation.decision.reviewedDigest,

      freshDigest:
        revalidation.decision.freshDigest,
    });
  }

  const plan =
    buildCenterpieceRoleMutationTransportPlan(
      revalidation,
    );

  const fetchImpl =
    dependencies.fetchImpl ??
    globalThis.fetch.bind(
      globalThis,
    );

  const url =
    joinUrl(
      input.helperBaseUrl,
      plan.path,
    );

  let response:
    Response;

  try {

    response =
      await fetchImpl(
        url,
        {
          method:
            plan.method,

          cache:
            "no-store",

          redirect:
            "error",

          headers: {
            Accept:
              "application/json",

            Authorization:
              `Bearer ${input.accessToken}`,
          },
        },
      );
  }
  catch (
    error
  ) {

    const message =
      error instanceof Error
        ? error.message
        : "unknown transport error";

    return failedMutationExecution(
      `MUTATION_TRANSPORT_FAILURE:${message}`,
    );
  }

  let payload:
    unknown = null;

  try {

    const text =
      await response.text();

    payload =
      text.length > 0
        ? JSON.parse(
            text,
          )
        : null;
  }
  catch {

    payload =
      null;
  }

  return classifyCenterpieceMutationResponse({
    status:
      response.status,

    payload,

    command:
      plan.command,
  });
}