import "server-only";

import {
  randomBytes,
  randomUUID,
} from "node:crypto";

import {
  DEMO_FIXTURE_ID,
  type DemoFixtureCredentialVault,
  type DemoFixtureSecretFactory,
} from "../change-case/demo-fixture";

interface StoredCredential {
  readonly generation:
    string;

  readonly password:
    string;
}

const credentialStore =
  new Map<
    string,
    StoredCredential
  >();

function syntheticPassword():
  string {
  const entropy =
    randomBytes(
      10,
    ).toString(
      "hex",
    );

  return `Aa1!${entropy}`;
}

export const demoFixtureSecretFactory:
  DemoFixtureSecretFactory =
    Object.freeze({
      generation: () =>
        randomUUID(),

      password:
        syntheticPassword,
    });

export const demoFixtureCredentialVault:
  DemoFixtureCredentialVault =
    Object.freeze({
      store: (
        input: {
          readonly fixtureId:
            typeof DEMO_FIXTURE_ID;

          readonly generation:
            string;

          readonly password:
            string;
        },
      ) => {
        if (
          input.fixtureId !==
          DEMO_FIXTURE_ID
        ) {
          throw new Error(
            "Unsupported demo fixture credential identity.",
          );
        }

        credentialStore.set(
          input.fixtureId,
          Object.freeze({
            generation:
              input.generation,

            password:
              input.password,
          }),
        );
      },

      clear: (
        fixtureId:
          typeof DEMO_FIXTURE_ID,
      ) => {
        credentialStore.delete(
          fixtureId,
        );
      },
    });

export function readDemoFixtureCredentialForServer(
  input: {
    readonly fixtureId:
      typeof DEMO_FIXTURE_ID;

    readonly generation:
      string;
  },
): string {
  if (
    input.fixtureId !==
    DEMO_FIXTURE_ID
  ) {
    throw new Error(
      "Unsupported demo fixture credential identity.",
    );
  }

  const stored =
    credentialStore.get(
      DEMO_FIXTURE_ID,
    );

  if (
    !stored ||
    stored.generation !==
      input.generation
  ) {
    throw new Error(
      "Synthetic demo credential is unavailable for this fixture generation. Reset and reseed the isolated fixture.",
    );
  }

  return stored.password;
}

export function demoFixtureCredentialPresentForServer(
  generation:
    string,
): boolean {
  const stored =
    credentialStore.get(
      DEMO_FIXTURE_ID,
    );

  return (
    stored?.generation ===
    generation
  );
}