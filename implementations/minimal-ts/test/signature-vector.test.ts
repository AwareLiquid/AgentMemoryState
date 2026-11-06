import { describe, expect, it } from "vitest";
import * as sdk from "../src/index.js";
import { checkSignaturePrefix, loadSignatureVectors } from "../../../scripts/signature-vector-harness.mjs";

const api = {
  deriveSpaceId: sdk.deriveSpaceId,
  registration: sdk.spaceRegistrationId,
  authorization: sdk.spaceAuthorizationId,
  transition: sdk.transitionId,
  digest: (id: string, chainId: bigint, address: string) => sdk.signingDigest(id, sdk.domainSeparator(chainId, address)),
  nextRoot: sdk.nextStateRoot,
};
const vectors = loadSignatureVectors();

describe("minimal SDK: external EOA signature vectors (test-only state model)", () => {
  for (const [index, vector] of vectors.cases.entries()) {
    it(`${index}: ${vector.case}`, () => checkSignaturePrefix(api, index, vectors));
  }
  it("fails if a validator accepts every signature", () => {
    expect(() => checkSignaturePrefix(api, 45, vectors, () => null)).toThrow();
  });
  it("fails if a validator rejects every signature", () => {
    expect(() => checkSignaturePrefix(api, 45, vectors, () => "length")).toThrow();
  });
  it("fails on digest byte drift", () => {
    expect(() => checkSignaturePrefix({ ...api, digest: () => `0x${"00".repeat(32)}` }, 0, vectors)).toThrow();
  });
});
