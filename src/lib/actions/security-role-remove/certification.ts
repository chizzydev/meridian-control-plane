import {
  certifyVerifiedAction,
  type VerifiedActionCertificationDependencies,
  type VerifiedActionCertificationResult,
} from "../../proof/certification-runner";

import type {
  ReviewablePreflightForReady,
} from "../../change-case/ready-preflight";

import {
  createUserRemoveRoleProofContract,
  type UserRemoveRoleContractDependencies,
  type UserRemoveRoleIntent,
} from "./contract";

import type {
  UserRemoveRoleExecution,
} from "./reconcile";

export interface UserRemoveRoleCertificationDependencies {
  readonly contract:
    UserRemoveRoleContractDependencies;

  readonly certification:
    VerifiedActionCertificationDependencies<
      ReviewablePreflightForReady
    >;
}

export async function certifyUserRemoveRoleAction(
  input: {
    readonly intent:
      UserRemoveRoleIntent;

    readonly actionId:
      string;

    readonly receiptId:
      string;

    readonly logicalActor:
      string;

    readonly irisRuntimeUser:
      string;
  },
  dependencies:
    UserRemoveRoleCertificationDependencies,
): Promise<
  VerifiedActionCertificationResult<
    UserRemoveRoleExecution
  >
> {
  const contract =
    createUserRemoveRoleProofContract(
      dependencies.contract,
    );

  return certifyVerifiedAction(
    {
      contract,
      intent:
        input.intent,
      actionId:
        input.actionId,
      receiptId:
        input.receiptId,
      parentChangeSetId:
        null,
      logicalActor:
        input.logicalActor,
      irisRuntimeUser:
        input.irisRuntimeUser,
    },
    dependencies.certification,
  );
}
