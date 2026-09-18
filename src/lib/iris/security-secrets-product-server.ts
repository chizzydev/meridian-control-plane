import "server-only";

import {
  logoutIris,
  readRuntimeInfo,
} from "./transport";

const METADATA_ROLE =
  "MeridianSecurityMetadataReader";

const DEFAULT_API_BASE =
  "http://localhost:52773/api/admin";

const DEFAULT_RUNTIME_USER =
  "meridian.runtime";

interface JsonRecord {
  readonly [key: string]:
    unknown;
}

interface EscalatedSession {
  readonly accessToken:
    string;

  readonly refreshToken:
    string;
}

export interface SafeWalletSecretMetadata {
  readonly name:
    string;

  readonly type:
    string;
}

export interface SafeWalletCollectionMetadata {
  readonly name:
    string;

  readonly editResource:
    string;

  readonly useResource:
    string;

  readonly secrets:
    readonly SafeWalletSecretMetadata[];
}

export interface SafeX509CredentialMetadata {
  readonly alias:
    string;

  readonly hasPrivateKey:
    boolean;

  readonly owners:
    readonly string[];

  readonly peerNames:
    readonly string[];

  readonly caFile:
    string;
}

export interface SafeSslConfigurationMetadata {
  readonly name:
    string;

  readonly description:
    string;

  readonly enabled:
    boolean;

  readonly type:
    string;
}

export interface SafeOAuthClientConfigurationMetadata {
  readonly applicationName:
    string;

  readonly clientType:
    string;

  readonly defaultScope:
    string;
}

export interface SafeOAuthClientServerMetadata {
  readonly id:
    string;

  readonly issuerEndpoint:
    string;

  readonly clientCount:
    number;

  readonly resourceCount:
    number;

  readonly clients:
    readonly SafeOAuthClientConfigurationMetadata[];
}

export interface SafeOAuthResourceServerMetadata {
  readonly name:
    string;

  readonly serverDefinition:
    string;
}

export interface SafeOAuthServerClientMetadata {
  readonly name:
    string;

  readonly clientId:
    string;

  readonly clientType:
    string;

  readonly description:
    string;

  readonly redirectUrls:
    readonly string[];
}

export interface AvailableSecuritySecretsSurface {
  readonly status:
    "available";

  readonly runtime: {
    readonly username:
      string;

    readonly serverVersion:
      string;

    readonly apiVersion:
      number;
  };

  readonly authority: {
    readonly role:
      typeof METADATA_ROLE;

    readonly explicitEscalation:
      true;

    readonly defaultRuntimeBroadened:
      false;
  };

  readonly walletCollections:
    readonly SafeWalletCollectionMetadata[];

  readonly x509Credentials:
    readonly SafeX509CredentialMetadata[];

  readonly sslConfigurations:
    readonly SafeSslConfigurationMetadata[];

  readonly oauthClientServers:
    readonly SafeOAuthClientServerMetadata[];

  readonly oauthResourceServers:
    readonly SafeOAuthResourceServerMetadata[];

  readonly oauthServerClients:
    readonly SafeOAuthServerClientMetadata[];

  readonly boundaries: {
    readonly metadataOnly:
      true;

    readonly secretValues:
      false;

    readonly privateKeyMaterial:
      false;

    readonly certificateBodies:
      false;

    readonly clientSecrets:
      false;

    readonly passwordValues:
      false;

    readonly mutationControls:
      false;

    readonly publicManagementProxy:
      false;

    readonly browserCredentialExposure:
      false;
  };
}

export interface UnavailableSecuritySecretsSurface {
  readonly status:
    "unavailable";

  readonly reason:
    "RUNTIME_CREDENTIAL_NOT_CONFIGURED" |
    "LIVE_METADATA_READ_UNAVAILABLE";

  readonly message:
    string;

  readonly boundaries:
    AvailableSecuritySecretsSurface["boundaries"];
}

export type SecuritySecretsSurface =
  AvailableSecuritySecretsSurface |
  UnavailableSecuritySecretsSurface;

const boundaries =
  Object.freeze({
    metadataOnly:
      true as const,

    secretValues:
      false as const,

    privateKeyMaterial:
      false as const,

    certificateBodies:
      false as const,

    clientSecrets:
      false as const,

    passwordValues:
      false as const,

    mutationControls:
      false as const,

    publicManagementProxy:
      false as const,

    browserCredentialExposure:
      false as const,
  });

function isRecord(
  value:
    unknown,
): value is JsonRecord {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}

function asString(
  value:
    unknown,
): string {
  return (
    typeof value ===
      "string"
      ? value
      : ""
  );
}

function asBoolean(
  value:
    unknown,
): boolean {
  return (
    value ===
      true ||
    value ===
      1 ||
    value ===
      "1"
  );
}

function asNumber(
  value:
    unknown,
): number {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value,
    )
      ? value
      : 0
  );
}

function asStringArray(
  value:
    unknown,
): readonly string[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return Object.freeze(
      [],
    );
  }

  return Object.freeze(
    value.filter(
      (
        item,
      ): item is string =>
        typeof item ===
          "string",
    ),
  );
}

function firstString(
  source:
    JsonRecord,

  keys:
    readonly string[],
): string | null {
  for (
    const key
    of keys
  ) {
    const value =
      source[key];

    if (
      typeof value ===
        "string" &&
      value.length >
        0
    ) {
      return value;
    }
  }

  return null;
}

async function loginWithMetadataEscalation(
  input: {
    readonly apiBaseUrl:
      string;

    readonly username:
      string;

    readonly password:
      string;
  },
): Promise<EscalatedSession> {
  const response =
    await fetch(
      `${input.apiBaseUrl}/login`,
      {
        method:
          "POST",

        headers: {
          Accept:
            "application/json",

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            user:
              input.username,

            password:
              input.password,

            role:
              METADATA_ROLE,
          }),

        cache:
          "no-store",
      },
    );

  const text =
    await response.text();

  if (
    response.status !==
      200
  ) {
    throw new Error(
      "Explicit security-metadata escalation login failed.",
    );
  }

  const payload:
    unknown =
    text.trim().length >
      0
      ? JSON.parse(
          text,
        )
      : {};

  if (!isRecord(payload)) {
    throw new Error(
      "Escalated login returned an invalid payload.",
    );
  }

  const result =
    isRecord(
      payload.result,
    )
      ? payload.result
      : payload;

  const accessToken =
    firstString(
      result,
      [
        "access_token",
        "accessToken",
      ],
    );

  const refreshToken =
    firstString(
      result,
      [
        "refresh_token",
        "refreshToken",
      ],
    );

  if (
    !accessToken ||
    !refreshToken
  ) {
    throw new Error(
      "Escalated login did not return the required tokens.",
    );
  }

  return Object.freeze({
    accessToken,
    refreshToken,
  });
}

async function readResultArray(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;

    readonly path:
      string;

    readonly label:
      string;
  },
): Promise<
  readonly JsonRecord[]
> {
  const response =
    await fetch(
      `${input.apiBaseUrl}${input.path}`,
      {
        method:
          "GET",

        headers: {
          Accept:
            "application/json",

          Authorization:
            `Bearer ${input.accessToken}`,
        },

        cache:
          "no-store",
      },
    );

  const text =
    await response.text();

  if (
    response.status !==
      200
  ) {
    throw new Error(
      `${input.label} metadata read failed.`,
    );
  }

  const payload:
    unknown =
    text.trim().length >
      0
      ? JSON.parse(
          text,
        )
      : {};

  if (
    !isRecord(
      payload,
    ) ||
    !Array.isArray(
      payload.result,
    )
  ) {
    throw new Error(
      `${input.label} metadata response is invalid.`,
    );
  }

  return Object.freeze(
    payload.result.filter(
      (
        item,
      ): item is JsonRecord =>
        isRecord(
          item,
        ),
    ),
  );
}

async function readWalletCollections(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;
  },
): Promise<
  readonly SafeWalletCollectionMetadata[]
> {
  const rows =
    await readResultArray({
      ...input,

      path:
        "/v2/wallet/collections?maxRows=100",

      label:
        "Wallet collection",
    });

  const mapped =
    await Promise.all(
      rows.map(
        async (
          row,
        ): Promise<SafeWalletCollectionMetadata> => {
          const name =
            asString(
              row.Name,
            );

          const query =
            new URLSearchParams({
              collection:
                name,

              maxRows:
                "100",
            });

          const secrets =
            name.length >
              0
              ? await readResultArray({
                  ...input,

                  path:
                    `/v2/wallet/secrets?${query.toString()}`,

                  label:
                    "Wallet secret-name/type",
                })
              : [];

          return Object.freeze({
            name,

            editResource:
              asString(
                row.EditResource,
              ),

            useResource:
              asString(
                row.UseResource,
              ),

            secrets:
              Object.freeze(
                secrets.map(
                  (
                    secret,
                  ) =>
                    Object.freeze({
                      name:
                        asString(
                          secret.Name,
                        ),

                      type:
                        asString(
                          secret.Type,
                        ),
                    }),
                ),
              ),
          });
        },
      ),
    );

  return Object.freeze(
    mapped.sort(
      (
        left,
        right,
      ) =>
        left.name.localeCompare(
          right.name,
        ),
    ),
  );
}

async function readOAuthClientServers(
  input: {
    readonly apiBaseUrl:
      string;

    readonly accessToken:
      string;
  },
): Promise<
  readonly SafeOAuthClientServerMetadata[]
> {
  const rows =
    await readResultArray({
      ...input,

      path:
        "/v2/security/oauth2/client/server-definitions?maxRows=100",

      label:
        "OAuth client-server",
    });

  const mapped =
    await Promise.all(
      rows.map(
        async (
          row,
        ): Promise<SafeOAuthClientServerMetadata> => {
          const id =
            asString(
              row.ID,
            );

          const query =
            new URLSearchParams({
              serverId:
                id,

              maxRows:
                "100",
            });

          const clients =
            id.length >
              0
              ? await readResultArray({
                  ...input,

                  path:
                    `/v2/security/oauth2/client/client-configurations?${query.toString()}`,

                  label:
                    "OAuth client configuration",
                })
              : [];

          return Object.freeze({
            id,

            issuerEndpoint:
              asString(
                row.IssuerEndpoint,
              ),

            clientCount:
              asNumber(
                row.ClientCount,
              ),

            resourceCount:
              asNumber(
                row.ResourceCount,
              ),

            clients:
              Object.freeze(
                clients.map(
                  (
                    client,
                  ) =>
                    Object.freeze({
                      applicationName:
                        asString(
                          client.ApplicationName,
                        ),

                      clientType:
                        asString(
                          client.ClientType,
                        ),

                      defaultScope:
                        asString(
                          client.DefaultScope,
                        ),
                    }),
                ),
              ),
          });
        },
      ),
    );

  return Object.freeze(
    mapped.sort(
      (
        left,
        right,
      ) =>
        left.id.localeCompare(
          right.id,
        ),
    ),
  );
}

export async function readSecuritySecretsSurface(
  config: {
    readonly apiBaseUrl:
      string;

    readonly username:
      string;

    readonly password:
      string;
  },
): Promise<
  AvailableSecuritySecretsSurface
> {
  const session =
    await loginWithMetadataEscalation(
      config,
    );

  try {
    const [
      runtime,
      walletCollections,
      x509Rows,
      sslRows,
      oauthClientServers,
      resourceRows,
      serverClientRows,
    ] =
      await Promise.all([
        readRuntimeInfo({
          baseUrl:
            config.apiBaseUrl,

          accessToken:
            session.accessToken,
        }),

        readWalletCollections({
          apiBaseUrl:
            config.apiBaseUrl,

          accessToken:
            session.accessToken,
        }),

        readResultArray({
          apiBaseUrl:
            config.apiBaseUrl,

          accessToken:
            session.accessToken,

          path:
            "/v2/security/x509-credentials?maxRows=100",

          label:
            "X.509 credential",
        }),

        readResultArray({
          apiBaseUrl:
            config.apiBaseUrl,

          accessToken:
            session.accessToken,

          path:
            "/v2/security/ssl-configurations?maxRows=100",

          label:
            "SSL configuration",
        }),

        readOAuthClientServers({
          apiBaseUrl:
            config.apiBaseUrl,

          accessToken:
            session.accessToken,
        }),

        readResultArray({
          apiBaseUrl:
            config.apiBaseUrl,

          accessToken:
            session.accessToken,

          path:
            "/v2/security/oauth2/resource-servers?maxRows=100",

          label:
            "OAuth resource server",
        }),

        readResultArray({
          apiBaseUrl:
            config.apiBaseUrl,

          accessToken:
            session.accessToken,

          path:
            "/v2/security/oauth2/server/clients?maxRows=100",

          label:
            "OAuth server client",
        }),
      ]);

    return Object.freeze({
      status:
        "available" as const,

      runtime:
        Object.freeze({
          username:
            runtime.username,

          serverVersion:
            runtime.serverVersion,

          apiVersion:
            runtime.apiVersion,
        }),

      authority:
        Object.freeze({
          role:
            METADATA_ROLE,

          explicitEscalation:
            true as const,

          defaultRuntimeBroadened:
            false as const,
        }),

      walletCollections,

      x509Credentials:
        Object.freeze(
          x509Rows
            .map(
              (
                row,
              ) =>
                Object.freeze({
                  alias:
                    asString(
                      row.Alias,
                    ),

                  hasPrivateKey:
                    asBoolean(
                      row.HasPrivateKey,
                    ),

                  owners:
                    asStringArray(
                      row.OwnerList,
                    ),

                  peerNames:
                    asStringArray(
                      row.PeerNames,
                    ),

                  caFile:
                    asString(
                      row.CAFile,
                    ),
                }),
            )
            .sort(
              (
                left,
                right,
              ) =>
                left.alias.localeCompare(
                  right.alias,
                ),
            ),
        ),

      sslConfigurations:
        Object.freeze(
          sslRows
            .map(
              (
                row,
              ) =>
                Object.freeze({
                  name:
                    asString(
                      row.Name,
                    ),

                  description:
                    asString(
                      row.Description,
                    ),

                  enabled:
                    asBoolean(
                      row.Enabled,
                    ),

                  type:
                    asString(
                      row.Type,
                    ),
                }),
            )
            .sort(
              (
                left,
                right,
              ) =>
                left.name.localeCompare(
                  right.name,
                ),
            ),
        ),

      oauthClientServers,

      oauthResourceServers:
        Object.freeze(
          resourceRows
            .map(
              (
                row,
              ) =>
                Object.freeze({
                  name:
                    asString(
                      row.Name,
                    ),

                  serverDefinition:
                    asString(
                      row.ServerDefinition,
                    ),
                }),
            )
            .sort(
              (
                left,
                right,
              ) =>
                left.name.localeCompare(
                  right.name,
                ),
            ),
        ),

      oauthServerClients:
        Object.freeze(
          serverClientRows
            .map(
              (
                row,
              ) =>
                Object.freeze({
                  name:
                    asString(
                      row.Name,
                    ),

                  clientId:
                    asString(
                      row.ClientId,
                    ),

                  clientType:
                    asString(
                      row.ClientType,
                    ),

                  description:
                    asString(
                      row.Description,
                    ),

                  redirectUrls:
                    asStringArray(
                      row.RedirectURL,
                    ),
                }),
            )
            .sort(
              (
                left,
                right,
              ) =>
                left.name.localeCompare(
                  right.name,
                ),
            ),
        ),

      boundaries,
    });
  } finally {
    await logoutIris({
      baseUrl:
        config.apiBaseUrl,

      accessToken:
        session.accessToken,
    });
  }
}

export async function readSecuritySecretsSurfaceFromEnvironment():
  Promise<SecuritySecretsSurface> {
  const password =
    process.env
      .MERIDIAN_RUNTIME_PASSWORD;

  if (
    typeof password !==
      "string" ||
    password.length ===
      0
  ) {
    return Object.freeze({
      status:
        "unavailable" as const,

      reason:
        "RUNTIME_CREDENTIAL_NOT_CONFIGURED" as const,

      message:
        (
          "Security metadata is unavailable because the " +
          "server-owned meridian.runtime credential is not configured."
        ),

      boundaries,
    });
  }

  try {
    return await readSecuritySecretsSurface({
      apiBaseUrl:
        process.env
          .MERIDIAN_IRIS_API_BASE_URL ??
        DEFAULT_API_BASE,

      username:
        process.env
          .MERIDIAN_RUNTIME_USERNAME ??
        DEFAULT_RUNTIME_USER,

      password,
    });
  } catch {
    return Object.freeze({
      status:
        "unavailable" as const,

      reason:
        "LIVE_METADATA_READ_UNAVAILABLE" as const,

      message:
        (
          "Live security metadata could not be read. " +
          "Meridian exposes no secret-value fallback and no mutation path."
        ),

      boundaries,
    });
  }
}
