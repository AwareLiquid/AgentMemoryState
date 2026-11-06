import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { historicalBaselines, manifestPath, validateBaseline, verifyUpstream } from "./spec-baseline.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baseline = JSON.parse(readFileSync(join(root, manifestPath), "utf8"));
const read = (path) => readFileSync(join(root, path));

test("current baseline validates without network or git history", () => {
  const result = validateBaseline(structuredClone(baseline), read);
  assert.equal(result.status, "PASS");
  assert.equal(result.protectedArtifacts, 10);
  assert.equal(result.upstreamVerification, "not-requested");
  assert.equal(result.clarifications, "merged-upstream-draft");
});

for (const path of baseline.protectedArtifacts.map((entry) => entry.path)) {
  test(`rejects drift in ${path}`, () => {
    assert.throws(() => validateBaseline(baseline, (requested) => requested === path
      ? Buffer.concat([read(requested), Buffer.from("\n")]) : read(requested)), /Pinned artifact changed/u);
  });
}

test("rejects a missing artifact rather than silently skipping it", () => {
  assert.throws(() => validateBaseline(baseline, () => { throw new Error("ENOENT"); }), /ENOENT/u);
});

test("preserves the historical baseline bytes", () => {
  for (const historical of historicalBaselines) {
    assert.throws(() => validateBaseline(baseline, (path) => path === historical.path
      ? Buffer.from("rewritten") : read(path)), /Historical baseline bytes changed/);
  }
  const changed = structuredClone(baseline);
  changed.predecessor.sha256 = "0".repeat(64);
  assert.throws(() => validateBaseline(changed, read), /Historical baseline identity/);
});

for (const [name, mutate, message] of [
  ["moving upstream ref", (m) => { m.upstream.commit = "master"; }, /full upstream commit/u],
  ["substituted official commit", (m) => { m.upstream.commit = "0".repeat(40); }, /observed official merge/u],
  ["premature Review status", (m) => { m.upstream.status = "Review"; }, /Expected values/u],
  ["moving normative URL", (m) => { m.upstream.url = m.upstream.url.replace(m.upstream.commit, "master"); }, /pinned file/u],
  ["missing runtime pin", (m) => { m.protectedArtifacts.pop(); }, /inventory/u],
  ["duplicate pin", (m) => { m.protectedArtifacts.push(m.protectedArtifacts[0]); }, /inventory/u],
  ["path traversal", (m) => { m.protectedArtifacts[0].path = "../../outside"; }, /inventory/u],
  ["wrong official blob", (m) => { m.upstream.gitBlob = "0".repeat(40); }, /Git blob mismatch/u],
  ["wrong official digest", (m) => { m.upstream.sha256 = "0".repeat(64); }, /SHA-256 mismatch/u],
  ["false approval", (m) => { m.clarifications = "approved"; }, /promote/u],
  ["wire-version substitution", (m) => { m.implementation.eip712DomainVersion = "3"; }, /Expected values/u],
  ["missing document", (m) => { m.documents.pop(); }, /entry points/u],
]) {
  test(`rejects ${name}`, () => {
    const manifest = structuredClone(baseline);
    mutate(manifest);
    assert.throws(() => validateBaseline(manifest, read), message);
  });
}

test("requires the baseline identifier in each entry document", () => {
  assert.throws(() => validateBaseline(baseline, (path) => path.endsWith("AUTHORIZATION.md")
    ? Buffer.from("unrelated document") : read(path)), /Missing baseline identity/u);
});

test("optional upstream verification uses only the pinned official URL", async () => {
  const result = await verifyUpstream(baseline, async (url) => {
    assert.equal(url, `https://raw.githubusercontent.com/ethereum/ERCs/${baseline.upstream.commit}/ERCS/erc-8350.md`);
    return new Response(read(baseline.upstream.mirror));
  });
  assert.equal(result, "matched-pinned-upstream");
});

test("upstream byte drift and HTTP failures fail closed", async () => {
  await assert.rejects(verifyUpstream(baseline, async () => new Response("changed")), /SHA-256 mismatch/u);
  await assert.rejects(verifyUpstream(baseline, async () => new Response("not found", { status: 404 })), /HTTP 404/u);
  await assert.rejects(verifyUpstream(baseline, async () => { throw new Error("offline"); }), /offline/u);
});

test("unknown CLI options exit nonzero", () => {
  const result = spawnSync(process.execPath, [join(root, "scripts/spec-baseline.mjs"), "--skip-hash"],
    { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage:/u);
  assert.doesNotMatch(result.stdout, /PASS/u);
});
