import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const names = ["AgentMemoryStateRegistry.sol", "ECDSA.sol", "IAgentMemoryState.sol"];
const suites = {
  "test/unit/SpecBaselineAuthorization.t.sol:SpecBaselineOfficialAuthorizationTest": 18,
  "test/unit/SpecBaselineAuthorization.t.sol:SpecBaselineProductAuthorizationTest": 18,
  "test/unit/SignatureVectors.t.sol:OfficialSignatureVectorTest": 1,
  "test/unit/SignatureVectors.t.sol:ProductSignatureVectorTest": 1,
};
const regressions = [
  "test_DirtyPaddingDoesNotVetoValidECDSAFallback()",
  "testFuzz_DirtyPaddingFallsBack(uint224)",
];
export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function validateManifest(m) {
  assert.ok(["erc8350/upstream-candidate/v1", "erc8350/upstream-official/v1"].includes(m.schema),
    "Unknown source evidence schema");
  const official = m.schema === "erc8350/upstream-official/v1";
  assert.equal(m.status, official ? "merged-upstream-draft" : "proposed-not-upstream-approved");
  assert.equal(m.repository, official ? "ethereum/ERCs" : "XiaoHai67890/ERCs");
  if (official) {
    assert.equal(m.commit, "8b11215cf267f710b49ea003384e678bcf953eae");
    assert.equal(m.baseline, "spec-baseline-3");
    assert.equal(m.pullRequest, "https://github.com/ethereum/ERCs/pull/2147");
    assert.deepEqual(m.historicalCandidate, {
      path: "docs/review/upstream-candidate.json",
      sha256: "b5145480906b4e6ca9e4addfbe1754e60908d03604fae4c19662ce1e7be762e4",
    });
  }
  assert.match(m.commit, /^[a-f0-9]{40}$/u);
  assert.match(m.specSha256, /^[a-f0-9]{64}$/u);
  assert.deepEqual(Object.keys(m.assets).sort(), [...names].sort());
  for (const hash of Object.values(m.assets)) assert.match(hash, /^[a-f0-9]{64}$/u);
  assert.deepEqual(m.negativeControl, {
    repository: "ethereum/ERCs",
    commit: "b9651bc84714e87e6361f4f6c0c8ff39cc265d0a",
    registrySha256: "6d99fc690abd776c53f607be9da1e25c2a48a80037088a3f3fb029f54943685b",
  });
}

export function validateOfficialBaseline(m, baseline, historicalBytes) {
  validateManifest(m);
  assert.equal(m.schema, "erc8350/upstream-official/v1");
  assert.equal(sha256(historicalBytes), m.historicalCandidate.sha256,
    "Historical candidate bytes changed");
  const historical = JSON.parse(historicalBytes);
  validateManifest(historical);
  assert.equal(historical.schema, "erc8350/upstream-candidate/v1");
  assert.equal(m.specSha256, historical.specSha256, "Merged text differs from tested candidate");
  assert.deepEqual(m.assets, historical.assets, "Merged assets differ from tested candidate");
  assert.equal(m.baseline, baseline.id, "Official/baseline ID mismatch");
  assert.equal(m.status, baseline.clarifications, "Official/baseline status mismatch");
  assert.equal(m.repository, baseline.upstream.repository);
  assert.equal(m.commit, baseline.upstream.commit, "Official/baseline commit mismatch");
  assert.equal(m.specSha256, baseline.upstream.sha256, "Official/baseline digest mismatch");
  assert.equal(m.pullRequest, baseline.upstream.pullRequest);
  assert.equal(baseline.upstream.status, "Draft");
  for (const name of names) {
    const entry = baseline.protectedArtifacts.find((item) => item.path === `erc/assets/erc-8350/${name}`);
    assert.equal(entry?.sha256, m.assets[name], `Official/baseline asset mismatch: ${name}`);
  }
}

export async function fetchPinned(url, hash, fetcher = fetch) {
  const response = await fetcher(url, { signal: AbortSignal.timeout(30000) });
  assert.equal(response.ok, true, `HTTP ${response.status}: ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(sha256(bytes), hash, `Source digest mismatch: ${url}`);
  return bytes;
}

export function checkResults(value, negative = false) {
  const expected = negative ? { [Object.keys(suites)[0]]: 2 } : suites;
  assert.deepEqual(Object.keys(value).sort(), Object.keys(expected).sort(), "Missing/unexpected suite");
  let count = 0;
  for (const [name, size] of Object.entries(expected)) {
    const results = value[name].test_results;
    assert.equal(Object.keys(results).length, size, `Wrong test count: ${name}`);
    if (negative) assert.deepEqual(Object.keys(results).sort(), [...regressions].sort());
    for (const [test, result] of Object.entries(results)) {
      assert.equal(result.status, negative ? "Failure" : "Success", `Unexpected result: ${test}`);
      if (!negative && test.startsWith("testFuzz_")) {
        assert.equal(result.kind.Fuzz.runs, 256, "Expected 256 fuzz runs");
      }
      count++;
    }
  }
  return count;
}

async function main() {
  const args = process.argv.slice(2);
  assert.ok(args.length === 0 || (args.length === 1 && args[0] === "--official"),
    "Usage: node scripts/review-candidate.mjs [--official]");
  const official = args[0] === "--official";
  const mode = official ? "official" : "candidate";
  const output = resolve(root, `artifacts/review-${mode}`);
  mkdirSync(output, { recursive: true });
  const report = { schema: `erc8350/upstream-${mode}-result/v1`, result: "fail", commands: [] };
  function run(command, args, allowFailure = false, env = {}) {
    const result = spawnSync(command, args, {
      cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, timeout: 300000,
      env: { ...process.env, ...env },
    });
    report.commands.push({ command, args, env, exitCode: result.status });
    assert.ifError(result.error);
    if (!allowFailure) assert.equal(result.status, 0, result.stderr || result.stdout);
    return result;
  }
  try {
    report.harnessCommit = run("git", ["rev-parse", "HEAD"]).stdout.trim();
    report.dirtyCheckout = run("git", ["status", "--porcelain"]).stdout.trim() !== "";
    report.foundry = run("forge", ["--version"]).stdout.trim();
    const manifest = JSON.parse(readFileSync(resolve(root, `docs/review/upstream-${mode}.json`)));
    validateManifest(manifest);
    assert.equal(manifest.schema, `erc8350/upstream-${mode}/v1`, "Manifest does not match requested mode");
    if (official) {
      validateOfficialBaseline(manifest,
        JSON.parse(readFileSync(resolve(root, "docs/spec-baseline/spec-baseline-3.json"))),
        readFileSync(resolve(root, manifest.historicalCandidate.path)));
    }
    report.inputs = manifest;
    const raw = (repo, commit, path) => `https://raw.githubusercontent.com/${repo}/${commit}/${path}`;
    const spec = await fetchPinned(raw(manifest.repository, manifest.commit, "ERCS/erc-8350.md"), manifest.specSha256);
    assert.match(spec.toString(), /^status: Draft$/mu);
    if (official) assert.deepEqual(spec, readFileSync(resolve(root, "erc/erc-8350.md")),
      "Official text differs from the local mirror");
    writeFileSync(resolve(output, "erc-8350.md"), spec);
    for (const label of [mode, "negative-control"]) {
      const negative = label === "negative-control";
      const source = negative ? manifest.negativeControl : manifest;
      const assetDir = resolve(output, label, "erc-8350");
      mkdirSync(assetDir, { recursive: true });
      for (const name of names) {
        const hash = negative && name === names[0] ? source.registrySha256 : manifest.assets[name];
        const bytes = await fetchPinned(raw(source.repository, source.commit, `assets/erc-8350/${name}`), hash);
        if (!negative) assert.deepEqual(bytes, readFileSync(resolve(root, "erc/assets/erc-8350", name)),
          `Pinned source differs from tested project asset: ${name}`);
        writeFileSync(resolve(assetDir, name), bytes);
      }
      // Isolated outputs and an explicit import remapping bind tests to fetched bytes.
      const args = ["test", "--root", "contracts", "--json", "--no-cache",
        "--out", resolve(output, label, "out"),
        "--remappings", `erc8350-assets/=${assetDir}/`,
        "--fuzz-runs", "256", "--fuzz-seed", "0x8350",
        "--match-contract", negative ? "^SpecBaselineOfficialAuthorizationTest$"
          : "^(SpecBaseline.*AuthorizationTest|OfficialSignatureVectorTest|ProductSignatureVectorTest)$"];
      if (negative) args.push("--match-test", "^(test_DirtyPaddingDoesNotVetoValidECDSAFallback|testFuzz_DirtyPaddingFallsBack)\\(");
      const result = run("forge", args, true, {
        FOUNDRY_FUZZ_FAILURE_PERSIST_DIR: resolve(output, label, "fuzz-failures"),
        FOUNDRY_TEST_FAILURES_FILE: resolve(output, label, "test-failures"),
      });
      writeFileSync(resolve(output, `${label}.json`), result.stdout);
      writeFileSync(resolve(output, `${label}.stderr.txt`), result.stderr);
      assert.equal(result.status, negative ? 1 : 0, `Unexpected forge exit: ${label}`);
      const count = checkResults(JSON.parse(result.stdout), negative);
      report[label] = { result: "pass", tests: count, expectedStatus: negative ? "Failure" : "Success",
        outputSha256: sha256(result.stdout) };
      console.log(`${label}: ${count} expected outcomes, zero skips`);
    }
    report.result = "pass";
  } catch (error) {
    report.error = error.message;
    process.exitCode = 1;
    console.error(error.message);
  } finally {
    report.generatedAt = new Date().toISOString();
    writeFileSync(resolve(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
