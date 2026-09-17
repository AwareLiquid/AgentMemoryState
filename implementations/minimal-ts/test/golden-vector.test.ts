import { readFileSync } from "node:fs";
import { keccak_256 } from "@noble/hashes/sha3";
import { describe, expect, it } from "vitest";
import {
  EXPERIENCE_DELTA_TYPEHASH,
  MEMORY_SPACE_TYPEHASH,
  MEMORY_STATE_TYPEHASH,
  MinimalStateMachine,
  deriveSpaceId,
  domainSeparator,
  locatorCommitment,
  nextStateRoot,
  privateDeltaCommitment,
  provenanceCommitment,
  signingDigest,
  spaceAuthorizationId,
  spaceRegistrationId,
  transitionId,
} from "../src/index.js";

const vector = JSON.parse(
  readFileSync(new URL("../../../test-vectors/v1.json", import.meta.url), "utf8"),
);

describe("dependency-isolated v1 implementation", () => {
  const delta = { ...vector.delta, sequence: BigInt(vector.delta.sequence) };

  it("checks every published type string independently", () => {
    const typehash = (value: string) =>
      "0x" + Buffer.from(keccak_256(new TextEncoder().encode(value))).toString("hex");
    expect(typehash(vector.types.experienceDelta)).toBe(EXPERIENCE_DELTA_TYPEHASH);
    expect(typehash(vector.types.memoryState)).toBe(MEMORY_STATE_TYPEHASH);
    expect(typehash(vector.types.memorySpace)).toBe(MEMORY_SPACE_TYPEHASH);
    expect(vector.types.spaceRegistration).toBe(
      "SpaceRegistration(bytes32 spaceId,address controller,address authorizer)",
    );
    expect(vector.types.spaceAuthorization).toBe(
      "SpaceAuthorization(bytes32 spaceId,address newController,address newAuthorizer,uint64 nonce)",
    );
  });

  it("matches private commitments without importing the core SDK", () => {
    expect(
      privateDeltaCommitment(
        vector.commitment.payload,
        vector.commitment.deltaSalt,
        vector.commitment.profileId,
      ),
    ).toBe(vector.commitment.deltaCommitment);
    expect(
      provenanceCommitment(
        vector.commitment.provenance,
        vector.commitment.provenanceSalt,
      ),
    ).toBe(vector.commitment.provenanceCommitment);
    expect(
      locatorCommitment(vector.commitment.locator, vector.commitment.locatorSalt),
    ).toBe(vector.commitment.locatorCommitment);
  });

  it("matches all transition and Space hashes", () => {
    expect(EXPERIENCE_DELTA_TYPEHASH).toBe(vector.expected.experienceDeltaTypehash);
    expect(MEMORY_STATE_TYPEHASH).toBe(vector.expected.memoryStateTypehash);
    expect(MEMORY_SPACE_TYPEHASH).toBe(vector.expected.memorySpaceTypehash);

    const id = transitionId(delta);
    expect(id).toBe(vector.expected.transitionId);
    expect(nextStateRoot(delta.prevStateRoot, id)).toBe(vector.expected.nextStateRoot);

    const authorization = vector.spaceAuthorization;
    expect(deriveSpaceId(authorization.controller, authorization.spaceSalt)).toBe(
      delta.spaceId,
    );
    expect(
      spaceRegistrationId(
        delta.spaceId,
        authorization.controller,
        authorization.authorizer,
      ),
    ).toBe(authorization.registrationId);
    expect(
      spaceAuthorizationId(
        delta.spaceId,
        authorization.newController,
        authorization.newAuthorizer,
        BigInt(authorization.updateNonce),
      ),
    ).toBe(authorization.authorizationId);
  });

  it("matches the EIP-712 domain and signing digest", () => {
    const domain = domainSeparator(
      vector.eip712.chainId,
      vector.eip712.verifyingContract,
    );
    expect(domain).toBe(vector.eip712.domainSeparator);
    expect(signingDigest(vector.expected.transitionId, domain)).toBe(
      vector.eip712.signingDigest,
    );
  });

  it("independently advances the normative state machine", () => {
    const machine = new MinimalStateMachine(delta.spaceId);
    const transition = machine.append(delta);
    expect(transition.transitionId).toBe(vector.expected.transitionId);
    expect(transition.nextStateRoot).toBe(vector.expected.nextStateRoot);
    expect(machine.sequence).toBe(1n);
    expect(machine.stateRoot).toBe(vector.expected.nextStateRoot);
  });
});
