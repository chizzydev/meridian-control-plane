import {
  createHash,
} from "node:crypto";

import {
  ProofEngineError,
} from "./errors";

export const CANONICAL_JSON_SCHEMA =
  "meridian.canonical-json.v1" as const;

export const SECRET_MATERIAL_FIELD_NAMES =
  Object.freeze([
    "authorization",
    "bearertoken",
    "clientpassword",
    "clientsecret",
    "credential",
    "credentials",
    "password",
    "privatekey",
    "privatekeypassword",
    "refreshtoken",
    "secret",
    "secretvalue",
    "token",
    "accesstoken",
  ] as const);

function normalizedFieldName(
  value:
    string,
): string {
  return value
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      "",
    );
}

function pathForKey(
  path:
    string,
  key:
    string,
): string {
  return (
    `${path}.${key}`
  );
}

function jsonString(
  value:
    string,
  path:
    string,
): string {
  const encoded =
    JSON.stringify(
      value,
    );

  if (
    encoded ===
      undefined
  ) {
    throw new ProofEngineError(
      "INVALID_CANONICAL_VALUE",
      `Unable to JSON-encode string at ${path}.`,
      {
        path,
      },
    );
  }

  return encoded;
}

function assertFieldAllowed(
  key:
    string,
  path:
    string,
): void {
  const normalized =
    normalizedFieldName(
      key,
    );

  if (
    (
      SECRET_MATERIAL_FIELD_NAMES as readonly string[]
    ).includes(
      normalized,
    )
  ) {
    throw new ProofEngineError(
      "SECRET_MATERIAL_FORBIDDEN",
      (
        "Canonical proof material contains a forbidden " +
        `secret-bearing field at ${pathForKey(
          path,
          key,
        )}.`
      ),
      {
        field:
          key,
        path:
          pathForKey(
            path,
            key,
          ),
      },
    );
  }
}

function assertPlainObject(
  value:
    object,
  path:
    string,
): asserts value is Record<string, unknown> {
  const prototype =
    Object.getPrototypeOf(
      value,
    );

  if (
    prototype !==
      Object.prototype &&
    prototype !==
      null
  ) {
    throw new ProofEngineError(
      "INVALID_CANONICAL_VALUE",
      (
        "Canonical JSON accepts only plain objects " +
        `at ${path}.`
      ),
      {
        path,
      },
    );
  }
}

function canonicalNumber(
  value:
    number,
  path:
    string,
): string {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    throw new ProofEngineError(
      "INVALID_CANONICAL_VALUE",
      (
        "Canonical JSON rejects non-finite numbers " +
        `at ${path}.`
      ),
      {
        path,
      },
    );
  }

  if (
    Object.is(
      value,
      -0,
    )
  ) {
    return "0";
  }

  const encoded =
    JSON.stringify(
      value,
    );

  if (
    encoded ===
      undefined
  ) {
    throw new ProofEngineError(
      "INVALID_CANONICAL_VALUE",
      `Unable to JSON-encode number at ${path}.`,
      {
        path,
      },
    );
  }

  return encoded;
}

function canonicalValue(
  value:
    unknown,
  path:
    string,
): string {
  if (
    value ===
      null
  ) {
    return "null";
  }

  if (
    typeof value ===
      "string"
  ) {
    return jsonString(
      value,
      path,
    );
  }

  if (
    typeof value ===
      "boolean"
  ) {
    return value
      ? "true"
      : "false";
  }

  if (
    typeof value ===
      "number"
  ) {
    return canonicalNumber(
      value,
      path,
    );
  }

  if (
    Array.isArray(
      value,
    )
  ) {
    const parts =
      value.map(
        (
          entry,
          index,
        ) =>
          canonicalValue(
            entry,
            `${path}[${index}]`,
          ),
      );

    return (
      `[${parts.join(
        ",",
      )}]`
    );
  }

  if (
    typeof value ===
      "object"
  ) {
    assertPlainObject(
      value,
      path,
    );

    const keys =
      Object.keys(
        value,
      ).sort(
        (
          left,
          right,
        ) =>
          left.localeCompare(
            right,
          ),
      );

    const parts:
      string[] = [];

    for (
      const key
      of keys
    ) {
      assertFieldAllowed(
        key,
        path,
      );

      const child =
        value[
          key
        ];

      if (
        child ===
          undefined
      ) {
        throw new ProofEngineError(
          "INVALID_CANONICAL_VALUE",
          (
            "Canonical JSON rejects undefined " +
            `at ${pathForKey(
              path,
              key,
            )}.`
          ),
          {
            path:
              pathForKey(
                path,
                key,
              ),
          },
        );
      }

      parts.push(
        (
          `${jsonString(
            key,
            path,
          )}:${canonicalValue(
            child,
            pathForKey(
              path,
              key,
            ),
          )}`
        ),
      );
    }

    return (
      `{${parts.join(
        ",",
      )}}`
    );
  }

  throw new ProofEngineError(
    "INVALID_CANONICAL_VALUE",
    (
      "Canonical JSON rejects unsupported value type " +
      `${typeof value} at ${path}.`
    ),
    {
      path,
      valueType:
        typeof value,
    },
  );
}

export function canonicalJson(
  value:
    unknown,
): string {
  return canonicalValue(
    value,
    "$",
  );
}

export function sha256Utf8(
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

export function digestCanonicalJson(
  value:
    unknown,
): string {
  return sha256Utf8(
    canonicalJson(
      value,
    ),
  );
}
