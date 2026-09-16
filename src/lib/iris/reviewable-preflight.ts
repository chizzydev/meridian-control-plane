import {
  createHash,
} from "node:crypto";

import {
  CENTERPIECE_CHANGE,
} from "@/lib/change-case/domain";

import {
  buildCanonicalPreflightMaterial,
  canonicalPreflightJson,
} from "@/lib/change-case/preflight-material";

import {
  readCenterpieceImpactPreflight,
} from "./impact";

export const PREFLIGHT_DIGEST_ALGORITHM =
  "SHA-256" as const;

export const REVIEWABLE_PREFLIGHT_STATE =
  "PREFLIGHTED" as const;

function sha256(
  value:
    string,
): string {
  return createHash(
    "sha256",
  )
    .update(
      value,
      "utf8",
    )
    .digest(
      "hex",
    )
    .toUpperCase();
}

export async function readCenterpieceReviewablePreflight(
  input: {
    readonly apiBaseUrl:
      string;

    readonly helperBaseUrl:
      string;

    readonly accessToken:
      string;
  },
) {
  const impact =
    await readCenterpieceImpactPreflight({
      apiBaseUrl:
        input.apiBaseUrl,

      helperBaseUrl:
        input.helperBaseUrl,

      accessToken:
        input.accessToken,
    });

  const canonicalInput = {
    change: {
      username:
        CENTERPIECE_CHANGE.username,

      operation:
        CENTERPIECE_CHANGE.operation,

      role:
        CENTERPIECE_CHANGE.role,
    },

    current:
      impact.authorization.current,

    proposed:
      impact.authorization.proposed,

    lostEffectiveRoles:
      impact.authorization.lostEffectiveRoles,

    gainedEffectiveRoles:
      impact.authorization.gainedEffectiveRoles,

    lostPermissions:
      impact.authorization.lostPermissions,

    gainedPermissions:
      impact.authorization.gainedPermissions,

    retainedPermissions:
      impact.authorization.retainedPermissions,

    applications:
      impact.applications,

    restOperations:
      impact.restOperations,

    summary:
      impact.summary,

    coverage:
      impact.coverage,
  };

  const canonical =
    buildCanonicalPreflightMaterial(
      canonicalInput,
    );

  const canonicalJson =
    canonicalPreflightJson(
      canonicalInput,
    );

  const digest =
    sha256(
      canonicalJson,
    );

  return {
    state:
      REVIEWABLE_PREFLIGHT_STATE,

    digestAlgorithm:
      PREFLIGHT_DIGEST_ALGORITHM,

    digest,

    canonical,

    canonicalJson,

    authorization:
      impact.authorization,

    applications:
      impact.applications,

    restOperations:
      impact.restOperations,

    summary:
      impact.summary,

    coverage:
      impact.coverage,
  };
}