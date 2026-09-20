import {
  certifyVerifiedAction,
  type VerifiedActionCertificationDependencies,
  type VerifiedActionCertificationResult,
} from "../../proof/certification-runner";

import {
  createW01WebAppCreateProofContract,
  type W01WebAppCreateContractDependencies,
  type W01WebAppCreateIntent,
  type W01WebAppCreatePreflight,
} from "./contract";

import type {
  W01WebAppCreateExecution,
} from "./reconcile";

export interface W01WebAppCreateCertificationDependencies {
  readonly contract:
    W01WebAppCreateContractDependencies;

  readonly certification:
    VerifiedActionCertificationDependencies<
      W01WebAppCreatePreflight
    >;
}

export async function certifyW01WebAppCreateAction(
  input: {
    readonly intent:
      W01WebAppCreateIntent;

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
    W01WebAppCreateCertificationDependencies,
): Promise<
  VerifiedActionCertificationResult<
    W01WebAppCreateExecution
  >
> {
  return certifyVerifiedAction(
    {
      contract:
        createW01WebAppCreateProofContract(
          dependencies.contract,
        ),

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
