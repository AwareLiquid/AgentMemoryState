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
  assert.equal(m.schema, "erc8350/upstream-candidate/v1");
  assert.equal(m.status, "proposed-not-upstream-approved");
  assert.equal(m.repository, "XiaoHai67890/ERCs");
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
  assert.equal(process.argv.length, 2, "Usage: node scripts/review-candidate.mjs");
  const output = resolve(root, "artifacts/review-candidate");
  mkdirSync(output, { recursive: true });
  const report = { schema: "erc8350/upstream-candidate-result/v1", result: "fail", commands: [] };
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
    const manifest = JSON.parse(readFileSync(resolve(root, "docs/review/upstream-candidate.json")));
    validateManifest(manifest);
    report.candidate = manifest;
    const raw = (repo, commit, path) => `https://raw.githubusercontent.com/${repo}/${commit}/${path}`;
    const spec = await fetchPinned(raw(manifest.repository, manifest.commit, "ERCS/erc-8350.md"), manifest.specSha256);
    assert.match(spec.toString(), /^status: Draft$/mu);
    writeFileSync(resolve(output, "erc-8350.md"), spec);
    for (const label of ["candidate", "negative-control"]) {
      const negative = label === "negative-control";
      const source = negative ? manifest.negativeControl : manifest;
      const assetDir = resolve(output, label, "erc-8350");
      mkdirSync(assetDir, { recursive: true });
      for (const name of names) {
        const hash = negative && name === names[0] ? source.registrySha256 : manifest.assets[name];
        const bytes = await fetchPinned(raw(source.repository, source.commit, `assets/erc-8350/${name}`), hash);
        if (!negative) assert.deepEqual(bytes, readFileSync(resolve(root, "erc/assets/erc-8350", name)),
          `Candidate differs from tested project asset: ${name}`);
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
