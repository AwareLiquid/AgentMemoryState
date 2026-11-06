// Test-only EOA state model. This is not a production wallet validator.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { keccak_256 } from "@noble/hashes/sha3";

const ZERO = `0x${"00".repeat(32)}`;
const ZERO_ADDRESS = `0x${"00".repeat(20)}`;
const N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
const hex = (bytes) => `0x${Buffer.from(bytes).toString("hex")}`;
const bytes = (value) => Uint8Array.from(Buffer.from(value.slice(2), "hex"));
const hashText = (value) => hex(keccak_256(new TextEncoder().encode(value)));
const snapshot = (states) => JSON.stringify([...states], (_, value) => typeof value === "bigint" ? value.toString() : value);

export function loadSignatureVectors() {
  const raw = readFileSync(new URL("../test-vectors/signature-vectors-v1.json", import.meta.url));
  assert.equal(createHash("sha256").update(raw).digest("hex"), "d37f00d51acc66d64599dac9fae44283d93f673b20c1f7b3d7532a505e153798");
  const vectors = JSON.parse(raw);
  assert.equal(vectors.schema, "erc8350-client/signature-vectors/v1");
  assert.equal(vectors.cases.length, 46);
  return vectors;
}

export function authorizeEOA(account, sender, digest, signature) {
  if (sender === account && signature === "0x") return null;
  if (signature.length !== 132) return "length";
  const raw = bytes(signature);
  const r = BigInt(hex(raw.slice(0, 32)));
  const s = BigInt(hex(raw.slice(32, 64)));
  const v = raw[64];
  if ((v !== 27 && v !== 28) || r === 0n || r >= N || s === 0n || s > N / 2n) return "noncanonical";
  try {
    const recovered = secp256k1.recoverPublicKey(new Uint8Array([v - 27, ...raw.slice(0, 64)]), bytes(digest), { prehash: false });
    const point = secp256k1.Point.fromBytes(recovered).toBytes(false);
    return hex(keccak_256(point.slice(1)).slice(-20)) === account ? null : "signer";
  } catch {
    return "noncanonical";
  }
}

function freshState(controller, authorizer) {
  return { controller, authorizer, nonce: 0n, id: ZERO, root: ZERO, sequence: 0n, transitions: [] };
}

export function checkSignaturePrefix(api, lastIndex = 45, vectors = loadSignatureVectors(), authorize = authorizeEOA) {
  const states = new Map();
  let accepted = 0;
  let rejected = 0;
  for (let index = 0; index <= lastIndex; index++) {
    const c = vectors.cases[index];
    const input = c.call;
    const key = `${c.chainId}:${c.verifyingContract}:${input.spaceId}`;
    // The exporter sets up these synthetic recovered accounts outside its cases array.
    if (index === 43 || index === 45) {
      const label = index === 43 ? "low-s" : "r >= n";
      const controller = "0xce613a5a39c9d37033d2acc14f686784cae429bf";
      const authorizer = index === 43 ? "0x555018c5200e561d3262c1b54c1b6d18654e9cbf" : "0xf3c2b0d530a89cf90cbe2e51ca88086e09bb2069";
      assert.equal(api.deriveSpaceId(controller, hashText(`erc8350-client boundary: ${label}`)), input.spaceId);
      assert.equal(authorizeEOA(controller, controller, ZERO, "0x"), null);
      states.set(key, freshState(controller, authorizer));
    }
    const state = states.get(key);
    const before = snapshot(states);
    let required;
    let id;
    let refused = null;
    if (c.operation === "registerSpace") {
      required = input.controller;
      assert.equal(api.deriveSpaceId(input.controller, input.salt), input.spaceId);
      id = api.registration(input.spaceId, input.controller, input.authorizer);
      if (state) refused = "SpaceAlreadyRegistered";
      if (input.controller === ZERO_ADDRESS || input.authorizer === ZERO_ADDRESS) refused = "ZeroAddress";
    } else {
      assert.ok(state, `${c.case}: prerequisite Space must exist`);
      if (c.operation === "updateSpaceAuthorization") {
        required = state.controller;
        id = api.authorization(input.spaceId, input.newController, input.newAuthorizer, state.nonce + 1n);
        if (input.newController === ZERO_ADDRESS || input.newAuthorizer === ZERO_ADDRESS) refused = "ZeroAddress";
      } else {
        assert.equal(c.operation, "commitTransition");
        required = state.authorizer;
        id = api.transition({ ...input, sequence: BigInt(input.sequence) });
        assert.equal(BigInt(input.sequence), state.sequence + 1n, `${c.case}: sequence precondition`);
        assert.equal(input.prevStateRoot, state.root, `${c.case}: root precondition`);
        assert.notEqual(input.deltaCommitment, ZERO);
        assert.notEqual(input.profileId, ZERO);
        assert.ok(!state.transitions.some((entry) => entry.id === id));
      }
    }
    const digest = api.digest(id, BigInt(c.chainId), c.verifyingContract);
    assert.equal(required, c.requiredAccount, `${c.case}: held authorization`);
    assert.equal(id, c.structHash, `${c.case}: struct hash bytes`);
    assert.equal(digest, c.signingDigest, `${c.case}: digest bytes`);
    refused ??= authorize(required, c.sender, digest, c.signature);
    if (!refused) {
      if (c.operation === "registerSpace") {
        states.set(key, freshState(input.controller, input.authorizer));
      } else if (c.operation === "updateSpaceAuthorization") {
        state.controller = input.newController;
        state.authorizer = input.newAuthorizer;
        state.nonce++;
      } else {
        state.id = id;
        state.root = api.nextRoot(state.root, id);
        state.sequence++;
        state.transitions.push({ id, root: state.root, sequence: state.sequence });
      }
    }
    assert.equal(!refused, c.expected === "accept", `${index}: ${c.case}`);
    if (refused) {
      assert.equal(refused, c.refusedBy, `${c.case}: separate compatibility label`);
      assert.equal(snapshot(states), before, `${c.case}: rejection changed held state`);
      rejected++;
    } else {
      assert.notEqual(snapshot(states), before, `${c.case}: accepted operation did not update state`);
      accepted++;
    }
  }
  if (lastIndex === 45) assert.deepEqual({ accepted, rejected }, { accepted: 10, rejected: 36 });
  return { accepted, rejected };
}
