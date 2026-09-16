import {
  authorizeCenterpieceRoleMutationDesign,
  type CenterpieceRoleMutationCommand,
} from "../change-case/role-mutation-design";

import {
  type CenterpieceApplyTimeRevalidation,
} from "./apply-revalidation";

export const CENTERPIECE_ROLE_MUTATION_PATH =
  "/apply/remove-centerpiece-role" as const;

export interface CenterpieceRoleMutationTransportPlan {
  readonly method:
    "POST";

  readonly path:
    typeof CENTERPIECE_ROLE_MUTATION_PATH;

  readonly requestBody:
    null;

  readonly command:
    CenterpieceRoleMutationCommand;

  readonly networkRequestPerformed:
    false;
}

/**
 * Converts a successful frozen 10C result into the one mutation transport
 * that a later execution checkpoint may call.
 *
 * This function performs no HTTP request and no IRIS mutation.
 */
export function buildCenterpieceRoleMutationTransportPlan(
  input:
    CenterpieceApplyTimeRevalidation,
): CenterpieceRoleMutationTransportPlan {
  const command =
    authorizeCenterpieceRoleMutationDesign({
      decision:
        input.decision,

      freshPreflight:
        input.freshPreflight,
    });

  return Object.freeze({
    method:
      "POST" as const,

    path:
      CENTERPIECE_ROLE_MUTATION_PATH,

    requestBody:
      null,

    command,

    networkRequestPerformed:
      false as const,
  });
}