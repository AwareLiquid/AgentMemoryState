import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const safeCommit = "bf943f80fec5ac647159d26161446ac5d716a294";
const safePath = resolve(root, "account-conformance/lib/safe");
const output = resolve(root, "artifacts/account-conformance");
mkdirSync(output, { recursive: true });
let log = "";
const report = { schema: "erc8350/account-conformance/v1", result: "fail",
  safe: { version: "1.4.1", commit: safeCommit }, registryCompiler: "0.8.24",
  registryEvm: "cancun", harnessCompiler: "0.8.30", harnessEvm: "prague" };

function run(command, args, cwd = root) {
  const r = spawnSync(command, args, { cwd, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  const text = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  log += `$ ${command} ${args.join(" ")}\n${text}\n`;
  process.stdout.write(text);
  if (r.error || r.status !== 0) throw new Error(`${command} failed (${r.status}): ${r.error?.message ?? text}`);
  return (r.stdout ?? "").trim();
}

try {
  report.sourceCommit = run("git", ["rev-parse", "HEAD"]);
  report.dirtyCheckout = run("git", ["status", "--porcelain"]) !== "";
  report.foundry = run("forge", ["--version"]);
  if (!existsSync(resolve(root, "contracts/lib/forge-std/src/Test.sol"))) {
    run("forge", ["install", "foundry-rs/forge-std@v1.16.2", "--no-git"], resolve(root, "contracts"));
  }
  if (!existsSync(safePath)) {
    mkdirSync(safePath, { recursive: true });
    run("git", ["init", "-q"], safePath);
    run("git", ["remote", "add", "origin", "https://github.com/safe-fndn/safe-smart-account.git"], safePath);
    run("git", ["fetch", "--depth=1", "origin", safeCommit], safePath);
    run("git", ["checkout", "--detach", "FETCH_HEAD"], safePath);
  }
  assert.equal(run("git", ["rev-parse", "HEAD"], safePath), safeCommit, "Wrong Safe source pin");
  assert.equal(run("git", ["status", "--porcelain", "--untracked-files=all"], safePath), "", "Dirty Safe dependency");
  run("forge", ["build"], resolve(root, "contracts"));
  report.registryArtifacts = [];
  for (const name of ["AgentMemoryStateRegistry.sol", "erc-8350/AgentMemoryStateRegistry.sol"]) {
    const path = `contracts/out/${name}/AgentMemoryStateRegistry.json`;
    const bytes = readFileSync(resolve(root, path));
    const artifact = JSON.parse(bytes);
    const metadata = typeof artifact.metadata === "string" ? JSON.parse(artifact.metadata) : artifact.metadata;
    assert.match(metadata.compiler.version, /^0\.8\.24\+/);
    assert.equal(metadata.settings.evmVersion, "cancun");
    report.registryArtifacts.push({ path, sha256: createHash("sha256").update(bytes).digest("hex") });
  }
  run("forge", ["test", "--match-contract", "RealAccounts.*Test", "-vv"], resolve(root, "account-conformance"));
  run(process.execPath, ["scripts/7702-transaction.mjs"]);
  const transactionBytes = readFileSync(resolve(output, "7702-transactions.json"));
  assert.equal(JSON.parse(transactionBytes).result, "pass");
  report.transactionEvidenceSha256 = createHash("sha256").update(transactionBytes).digest("hex");
  report.result = "pass";
} catch (error) {
  report.error = error.message;
  console.error(error.message);
  process.exitCode = 1;
} finally {
  report.generatedAt = new Date().toISOString();
  report.logSha256 = createHash("sha256").update(log).digest("hex");
  writeFileSync(resolve(output, "accounts.txt"), log);
  writeFileSync(resolve(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
}
