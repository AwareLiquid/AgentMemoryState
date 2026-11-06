import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { checkResults, fetchPinned, sha256, validateManifest, validateOfficialBaseline } from "./review-candidate.mjs";

const manifest = JSON.parse(readFileSync(new URL("../docs/review/upstream-candidate.json", import.meta.url)));
const historicalBytes = readFileSync(new URL("../docs/review/upstream-candidate.json", import.meta.url));
const official = JSON.parse(readFileSync(new URL("../docs/review/upstream-official.json", import.meta.url)));
const baseline = JSON.parse(readFileSync(new URL("../docs/spec-baseline/spec-baseline-3.json", import.meta.url)));
test("candidate is pinned, separate from official acceptance", () => validateManifest(manifest));
test("merged official evidence is bound to baseline 3 and the immutable candidate", () => {
  validateOfficialBaseline(official, baseline, historicalBytes);
});
for (const [name, mutate] of [
  ["unknown schema", (m) => { m.schema = "unknown"; }],
  ["premature status", (m) => { m.status = "Review"; }],
  ["fork as authority", (m) => { m.repository = "XiaoHai67890/ERCs"; }],
  ["wrong merge", (m) => { m.commit = "0".repeat(40); }],
  ["changed historical identity", (m) => { m.historicalCandidate.sha256 = "0".repeat(64); }],
  ["changed spec", (m) => { m.specSha256 = "0".repeat(64); }],
  ["changed asset", (m) => { m.assets["ECDSA.sol"] = "0".repeat(64); }],
]) {
  test(`official evidence rejects ${name}`, () => {
    const changed = structuredClone(official);
    mutate(changed);
    assert.throws(() => validateOfficialBaseline(changed, baseline, historicalBytes));
  });
}
test("official evidence rejects rewritten history and mismatched baseline pins", () => {
  assert.throws(() => validateOfficialBaseline(official, baseline, Buffer.from("{}")), /Historical candidate/);
  for (const mutate of [
    (m) => { m.id = "spec-baseline-2"; },
    (m) => { m.upstream.commit = manifest.commit; },
    (m) => { m.upstream.sha256 = "0".repeat(64); },
    (m) => { m.upstream.status = "Review"; },
    (m) => { m.clarifications = "approved"; },
    (m) => { m.protectedArtifacts = []; },
  ]) {
    const changed = structuredClone(baseline);
    mutate(changed);
    assert.throws(() => validateOfficialBaseline(official, changed, historicalBytes));
  }
});
for (const [name, mutate] of [
  ["moving commit", (m) => { m.commit = "main"; }],
  ["false approval", (m) => { m.status = "approved"; }],
  ["missing asset", (m) => { delete m.assets["ECDSA.sol"]; }],
  ["path traversal", (m) => { m.assets["../outside.sol"] = "a".repeat(64); }],
  ["wrong control", (m) => { m.negativeControl.commit = m.commit; }],
]) {
  test(`rejects ${name}`, () => {
    const changed = structuredClone(manifest);
    mutate(changed);
    assert.throws(() => validateManifest(changed));
  });
}
test("source verification fails closed on HTTP, network and digest errors", async () => {
  const bytes = Buffer.from("exact bytes");
  const fetcher = async () => new Response(bytes);
  assert.deepEqual(await fetchPinned("https://example.invalid/source", sha256(bytes), fetcher), bytes);
  await assert.rejects(fetchPinned("u", "0".repeat(64), fetcher), /digest mismatch/);
  await assert.rejects(fetchPinned("u", sha256(bytes), async () => new Response("", { status: 404 })), /HTTP 404/);
  await assert.rejects(fetchPinned("u", sha256(bytes), async () => { throw new Error("offline"); }), /offline/);
});
const control = () => ({ "test/unit/SpecBaselineAuthorization.t.sol:SpecBaselineOfficialAuthorizationTest": {
  test_results: Object.fromEntries([
    "test_DirtyPaddingDoesNotVetoValidECDSAFallback()", "testFuzz_DirtyPaddingFallsBack(uint224)",
  ].map((name) => [name, { status: "Failure" }])),
} });
test("requires exactly the two old-source regression failures", () => {
  assert.equal(checkResults(control(), true), 2);
  assert.throws(() => checkResults({}, true), /suite/);
  assert.throws(() => checkResults(control()), /suite/);
  for (const status of ["Success", "Skipped"]) {
    const value = control();
    Object.values(Object.values(value)[0].test_results)[0].status = status;
    assert.throws(() => checkResults(value, true), /Unexpected result/);
  }
});
test("candidate needs all four suites and rejects skipped tests or reduced fuzzing", () => {
  const result = {};
  for (const [name, count] of [
    ["test/unit/SpecBaselineAuthorization.t.sol:SpecBaselineOfficialAuthorizationTest", 18],
    ["test/unit/SpecBaselineAuthorization.t.sol:SpecBaselineProductAuthorizationTest", 18],
    ["test/unit/SignatureVectors.t.sol:OfficialSignatureVectorTest", 1],
    ["test/unit/SignatureVectors.t.sol:ProductSignatureVectorTest", 1],
  ]) result[name] = { test_results: Object.fromEntries(Array.from({ length: count }, (_, i) =>
    [i === 0 ? "testFuzz_example()" : `test_${i}()`, { status: "Success", kind: { Fuzz: { runs: 256 } } }])) };
  assert.equal(checkResults(result), 38);
  const first = Object.values(Object.values(result)[0].test_results)[0];
  first.kind.Fuzz.runs = 1;
  assert.throws(() => checkResults(result), /256 fuzz/);
  first.kind.Fuzz.runs = 256;
  first.status = "Skipped";
  assert.throws(() => checkResults(result), /Unexpected result/);
});
