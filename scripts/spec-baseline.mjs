#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const manifestPath = "docs/spec-baseline/spec-baseline-1.json";
const documents = ["README.md", "DIFFERENCES.md", "AUTHORIZATION.md", "OPEN_QUESTIONS.md"]
  .map((name) => `docs/spec-baseline/${name}`);
const protectedPaths = [
  "erc/erc-8350.md",
  "contracts/src/reference/AgentMemoryStateRegistry.sol",
  "contracts/src/ECDSA.sol",
  "contracts/src/interfaces/IAgentMemoryState.sol",
  "erc/assets/erc-8350/AgentMemoryStateRegistry.sol",
  "erc/assets/erc-8350/ECDSA.sol",
  "erc/assets/erc-8350/IAgentMemoryState.sol",
  "contracts/foundry.toml",
  "test-vectors/v1.json",
  "test-vectors/v2.json",
];
const commitPattern = /^[a-f0-9]{40}$/u;
const digestPattern = /^[a-f0-9]{64}$/u;

export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
export function gitBlob(bytes) {
  return createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
}

function validateMetadata(manifest) {
  assert.equal(manifest.schema, "erc-8350/spec-baseline/v1", "Unsupported baseline schema");
  assert.equal(manifest.id, "spec-baseline-1", "Unexpected baseline ID");
  assert.equal(manifest.status, "recorded", "This baseline is a record, not an approval");
  assert.equal(manifest.clarifications, "proposed-not-upstream-approved",
    "Do not promote proposed clarification to upstream approval");
  assert.match(manifest.recordedAt ?? "", /^\d{4}-\d{2}-\d{2}$/u);
  assert.equal(manifest.maintainer, "XiaoHai67890");
  const upstream = manifest.upstream;
  assert.equal(upstream?.repository, "ethereum/ERCs", "Wrong normative repository");
  assert.match(upstream.commit ?? "", commitPattern, "Pin a full upstream commit");
  assert.equal(upstream.path, "ERCS/erc-8350.md");
  assert.equal(upstream.mirror, "erc/erc-8350.md");
  assert.equal(upstream.status, "Draft");
  assert.match(upstream.sha256 ?? "", digestPattern);
  assert.match(upstream.gitBlob ?? "", commitPattern);
  assert.equal(upstream.url,
    `https://github.com/ethereum/ERCs/blob/${upstream.commit}/ERCS/erc-8350.md`,
    "The normative link must identify the pinned file, not a moving branch");
  assert.equal(manifest.implementation?.repository, "AwareLiquid/AgentMemoryState");
  assert.match(manifest.implementation.commit ?? "", commitPattern, "Pin the examined implementation");
  assert.equal(manifest.implementation.wireFormat, "ExperienceDelta v1");
  assert.equal(manifest.implementation.eip712DomainVersion, "1");
  assert.deepEqual(manifest.implementation.testVectorVersions, ["v1", "v2"]);
  assert.equal(manifest.historicalOverview?.path, "SPEC.md");
  assert.equal(manifest.historicalOverview.commit, manifest.implementation.commit);
  assert.match(manifest.historicalOverview.sha256 ?? "", digestPattern);
  assert.deepEqual(manifest.documents, documents, "Keep all four baseline entry points");
  assert.ok(Array.isArray(manifest.protectedArtifacts), "Missing protected artifacts");
  const paths = manifest.protectedArtifacts.map((entry) => entry.path);
  assert.deepEqual([...paths].sort(), [...protectedPaths].sort(),
    "Protected artifacts must be the complete, unique, repository-relative inventory");
  for (const entry of manifest.protectedArtifacts) assert.match(entry.sha256 ?? "", digestPattern);
}

export function validateBaseline(manifest, readArtifact = (path) => readFileSync(join(root, path))) {
  validateMetadata(manifest);
  for (const entry of manifest.protectedArtifacts) {
    assert.equal(sha256(readArtifact(entry.path)), entry.sha256,
      `Pinned artifact changed: ${entry.path}; assess the change and record a new baseline`);
  }
  const mirror = readArtifact(manifest.upstream.mirror);
  assert.equal(sha256(mirror), manifest.upstream.sha256, "Official mirror SHA-256 mismatch");
  assert.equal(gitBlob(mirror), manifest.upstream.gitBlob, "Official mirror Git blob mismatch");
  for (const path of manifest.documents) {
    assert.ok(readArtifact(path).toString("utf8").includes(manifest.id),
      `Missing baseline identity in ${path}`);
  }
  return {
    baseline: manifest.id,
    officialCommit: manifest.upstream.commit,
    examinedImplementationCommit: manifest.implementation.commit,
    protectedArtifacts: manifest.protectedArtifacts.length,
    status: "PASS",
    upstreamVerification: "not-requested",
    clarifications: manifest.clarifications,
  };
}

export async function verifyUpstream(manifest, fetcher = fetch) {
  validateMetadata(manifest);
  const url = `https://raw.githubusercontent.com/ethereum/ERCs/${manifest.upstream.commit}/${manifest.upstream.path}`;
  const response = await fetcher(url, { signal: AbortSignal.timeout(30_000) });
  assert.ok(response.ok, `Upstream fetch failed: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(sha256(bytes), manifest.upstream.sha256, "Pinned upstream SHA-256 mismatch");
  assert.equal(gitBlob(bytes), manifest.upstream.gitBlob, "Pinned upstream Git blob mismatch");
  return "matched-pinned-upstream";
}

async function main() {
  const args = process.argv.slice(2);
  assert.ok(args.every((arg) => ["--verify-upstream", "--json"].includes(arg)),
    "Usage: node scripts/spec-baseline.mjs [--verify-upstream] [--json]");
  const manifest = JSON.parse(readFileSync(join(root, manifestPath), "utf8"));
  const result = validateBaseline(manifest);
  if (args.includes("--verify-upstream")) result.upstreamVerification = await verifyUpstream(manifest);
  if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`Specification baseline ${result.baseline}: PASS (${result.protectedArtifacts} pinned artifacts)`);
    console.log(`Upstream: ${result.upstreamVerification}`);
    console.log("Clarifications remain proposed; this is not G4 or release acceptance.");
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Specification baseline: FAIL\n${error.message}`);
    process.exitCode = 1;
  });
}
