import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { childEnvironment, sha256 } from "./independent-client-gate.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

export function validateWalletReport(manifest, report) {
  for (const [key, value] of Object.entries(manifest.expected)) assert.equal(report[key], value, key);
  assert.deepEqual(report.cases, manifest.cases, "Exact named scenarios, including negative control");
  assert.equal(report.error, undefined);
  for (const tool of ["forge", "anvil"]) assert.match(report[tool], /Version: 1\.7\.1\b/);
  assert.equal(report.receipts.length, 188);
  assert.equal(new Set(report.receipts.map((r) => r.hash)).size, 188);
  assert.equal(report.receipts.filter((r) => r.status === 1).length, 131);
  const rejected = report.receipts.filter((r) => r.status === 0);
  assert.equal(rejected.length, 57);
  assert.ok(rejected.every((r) => r.logs.length === 0), "No persisted logs on rejection");
  assert.ok(report.receipts.some((r) => r.type === 4 && r.status === 1), "Mined type-4 receipt");
  assert.ok(report.receipts.every((r) => Number.isInteger(r.blockNumber) && r.blockNumber > 0));
}

export async function main(argv = process.argv.slice(2)) {
  assert.ok(argv.length === 0 || (argv.length === 2 && argv[0] === "--output"), "Usage: --output DIR");
  const output = resolve(argv[1] ?? join(root, "artifacts/independent-wallet", new Date().toISOString().replaceAll(":", "-")));
  mkdirSync(output, { recursive: true });
  assert.equal(readdirSync(output).length, 0, "Use a new evidence directory");
  const manifestPath = join(root, "evidence/independent-wallet/v1.json");
  const manifest = readJson(manifestPath);
  const temp = mkdtempSync(join(tmpdir(), "erc8350-wallet-"));
  const env = childEnvironment(temp);
  const checkout = join(temp, "checkout");
  const suite = join(checkout, "erc-8350");
  const record = {
    schema: "erc8350.independent-wallet-acceptance.v1", status: "fail",
    recordedAt: new Date().toISOString(), externalCommit: manifest.commit,
    manifestSha256: sha256(readFileSync(manifestPath)),
    runnerSha256: sha256(readFileSync(fileURLToPath(import.meta.url))),
    commands: [], artifacts: {}, limitations: manifest.limitations,
  };
  const run = (name, command, args, cwd = temp) => {
    const result = spawnSync(command, args, { cwd, env, encoding: "utf8", timeout: 600_000, maxBuffer: 32 * 1024 * 1024 });
    writeFileSync(join(output, `${name}.log`), `${result.stdout ?? ""}${result.stderr ?? ""}${result.error ?? ""}`);
    record.commands.push({ name, command: [command, ...args].join(" ").replaceAll(temp, "<temporary-root>"), exitCode: result.status });
    assert.equal(result.status, 0, `${name} failed; see ${name}.log`);
    return result.stdout.trim();
  };
  try {
    assert.match(process.version, /^v24\./, "Use Node 24 as required by the external suite");
    record.consumer = { commit: run("consumer-commit", "git", ["rev-parse", "HEAD"], root),
      clean: run("consumer-status", "git", ["status", "--porcelain"], root) === "" };
    assert.ok(record.consumer.clean, "Commit changes before recording acceptance");
    record.toolchain = { node: process.version, platform: process.platform, arch: process.arch,
      npm: run("npm-version", "npm", ["--version"]), forge: run("forge-version", "forge", ["--version"]),
      anvil: run("anvil-version", "anvil", ["--version"]) };
    run("git-init", "git", ["init", "-q", checkout]);
    run("git-fetch", "git", ["fetch", "-q", "--depth=1", manifest.repository, manifest.commit], checkout);
    run("git-checkout", "git", ["checkout", "-q", "--detach", "FETCH_HEAD"], checkout);
    assert.equal(run("git-head", "git", ["rev-parse", "HEAD"], checkout), manifest.commit);
    for (const [file, digest] of Object.entries(manifest.files)) {
      assert.equal(sha256(readFileSync(join(checkout, file))), digest, file);
    }
    assert.equal(run("initial-status", "git", ["status", "--porcelain", "--untracked-files=all"], checkout), "");
    const sources = readJson(join(suite, "sources.json"));
    assert.equal(sources.revision, manifest.expected.registryRevision);
    record.officialSources = {};
    for (const [file, pin] of Object.entries(sources.files)) {
      const response = await fetch(pin.url, { signal: AbortSignal.timeout(60_000) });
      assert.ok(response.ok, `Fetch official ${file}: ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      assert.equal(sha256(bytes), pin.sha256, `Official source ${file}`);
      assert.equal(sha256(readFileSync(join(suite, "upstream", file))), pin.sha256);
      record.officialSources[file] = pin;
    }
    run("install", "npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], suite);
    run("wallets", "npm", ["test"], suite);
    const report = readJson(join(suite, "results/report.json"));
    validateWalletReport(manifest, report);
    assert.equal(run("final-status", "git", ["status", "--porcelain", "--untracked-files=all"], checkout), "");
    record.results = { scenarios: 34, negativeControls: 1, passed: report.passed, failed: report.failed,
      receipts: { total: 188, successful: 131, reverted: 57 },
      localBlockRange: [Math.min(...report.receipts.map((r) => r.blockNumber)), Math.max(...report.receipts.map((r) => r.blockNumber))] };
    record.status = "pass";
  } catch (error) {
    record.error = error.message;
    process.exitCode = 1;
  } finally {
    // Preserve the original report even on failure; timestamps and transaction hashes are not normalized.
    for (const file of ["report.json", "tools.log"]) {
      try { writeFileSync(join(output, file), readFileSync(join(suite, "results", file))); }
      catch (error) { if (error.code !== "ENOENT") throw error; }
    }
    writeFileSync(join(output, "manifest.json"), readFileSync(manifestPath));
    for (const file of readdirSync(output)) record.artifacts[file] = sha256(readFileSync(join(output, file)));
    writeFileSync(join(output, "acceptance.json"), `${JSON.stringify(record, null, 2)}\n`);
    rmSync(temp, { recursive: true, force: true });
  }
  console.log(`${record.status.toUpperCase()}: ${join(output, "acceptance.json")}`);
  if (record.error) console.error(record.error);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}
