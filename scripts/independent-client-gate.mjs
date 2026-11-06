import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { devNull, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(root, "evidence/independent-client/v1.json");
export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const json = (file) => JSON.parse(readFileSync(file, "utf8"));

export function validateResults(manifest, report, signatures, units) {
  assert.equal(report.schema, "erc8350-client/result/v1");
  assert.deepEqual(report.source, {
    file: "erc8350_client.py", sha256: manifest.files["recompute/erc8350_client.py"],
    commit: manifest.commit, fileState: "clean",
  });
  assert.deepEqual(report.specBaseline.draft, manifest.draft);
  assert.deepEqual(report.specBaseline.vectors, manifest.vectors);
  assert.equal(report.toolchain.pycryptodome, manifest.pycryptodome);
  assert.deepEqual(Object.keys(report.layers).sort(), Object.keys(manifest.layers).sort());
  for (const [name, count] of Object.entries(manifest.layers)) {
    const layer = report.layers[name];
    assert.equal(layer.result, "PASS", `${name} result`);
    assert.equal(layer.checks.length, count, `${name} check count`);
    assert.ok(layer.checks.every((check) => check.pass === true), `${name} checks`);
  }
  assert.equal(report.supportedCapabilities.erc1271, "not supported (accounts modelled without code)");
  assert.equal(signatures.schema, "erc8350-client/signature-vectors/v1");
  assert.deepEqual(signatures.source, report.source);
  assert.equal(signatures.cases.length, manifest.signatureCases);
  assert.deepEqual(units, { tests: manifest.unitTests, skipped: 0, failures: 0, errors: 0, successful: true });
}

export function childEnvironment(home) {
  const env = {
    HOME: home, TMPDIR: home, TMP: home, TEMP: home,
    XDG_CACHE_HOME: join(home, ".cache"), XDG_CONFIG_HOME: join(home, ".config"),
    GIT_CONFIG_NOSYSTEM: "1", GIT_TERMINAL_PROMPT: "0", PIP_CONFIG_FILE: devNull,
    PIP_DISABLE_PIP_VERSION_CHECK: "1", PIP_NO_INPUT: "1",
    PYTHONDONTWRITEBYTECODE: "1", PYTHONHASHSEED: "0", PYTHONNOUSERSITE: "1",
  };
  for (const key of ["PATH", "LANG", "LC_ALL", "SSL_CERT_FILE", "SSL_CERT_DIR", "REQUESTS_CA_BUNDLE", "CURL_CA_BUNDLE"]) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return env;
}

export async function main(argv = process.argv.slice(2)) {
  assert.ok(argv.length === 0 || (argv.length === 2 && argv[0] === "--output"), "Usage: --output DIR");
  const output = resolve(argv[1] ?? join(root, "artifacts/independent-client", new Date().toISOString().replaceAll(":", "-")));
  mkdirSync(output, { recursive: true });
  assert.equal(readdirSync(output).length, 0, "Use a new output directory; never overwrite historical evidence");
  const manifest = json(manifestPath);
  const temp = mkdtempSync(join(tmpdir(), "erc8350-client-"));
  const env = childEnvironment(temp);
  const checkout = join(temp, "checkout");
  const record = {
    schema: "erc8350.independent-client-acceptance.v1", status: "fail",
    recordedAt: new Date().toISOString(), manifestSha256: sha256(readFileSync(manifestPath)),
    runnerSha256: sha256(readFileSync(fileURLToPath(import.meta.url))),
    externalCommit: manifest.commit, commands: [], artifacts: {}, limitations: manifest.limitations,
  };
  const run = (name, command, args, cwd = temp) => {
    const result = spawnSync(command, args, { cwd, env, encoding: "utf8", timeout: 180_000, maxBuffer: 16 * 1024 * 1024 });
    const log = `${result.stdout ?? ""}${result.stderr ?? ""}${result.error ? String(result.error) : ""}`.replaceAll(temp, "<temporary-root>");
    writeFileSync(join(output, `${name}.log`), log);
    record.commands.push({ name, command: [command, ...args].join(" ").replaceAll(temp, "<temporary-root>"), exitCode: result.status });
    assert.equal(result.status, 0, `${name} failed; see ${name}.log`);
    return result.stdout.trim();
  };
  try {
    record.consumer = {
      commit: run("consumer-commit", "git", ["rev-parse", "HEAD"], root),
      clean: run("consumer-status", "git", ["status", "--porcelain"], root) === "",
    };
    assert.ok(record.consumer.clean, "Commit tracked changes and use a clean consumer checkout");
    const python = process.env.PYTHON || "python3";
    record.toolchain = { node: process.version, python: run("python-version", python, ["--version"]), cast: run("cast-version", "cast", ["--version"]) };
    assert.match(record.toolchain.python, /^Python 3\.(1[2-9]|[2-9][0-9])\./);
    assert.ok(record.toolchain.cast.includes(`Version: ${manifest.foundry}`), "Require pinned Foundry");
    run("git-init", "git", ["init", "-q", checkout]);
    run("git-fetch", "git", ["fetch", "-q", "--depth=1", manifest.repository, manifest.commit], checkout);
    run("git-checkout", "git", ["checkout", "-q", "--detach", "FETCH_HEAD"], checkout);
    assert.equal(run("git-head", "git", ["rev-parse", "HEAD"], checkout), manifest.commit);
    for (const [file, digest] of Object.entries(manifest.files)) {
      assert.equal(sha256(readFileSync(join(checkout, file))), digest, file);
    }
    // Reuse the already reviewed wheel hash allowlist, not ambient pip configuration.
    const packages = json(join(root, "evidence/external-reproductions/v1.json"));
    const requirement = `pycryptodome==${manifest.pycryptodome}`;
    const hashes = packages.suites[0].pythonPackageHashes[requirement];
    assert.ok(hashes.length > 0 && hashes.every((hash) => /^[0-9a-f]{64}$/.test(hash)));
    const requirements = join(temp, "requirements.txt");
    writeFileSync(requirements, `${requirement} ${hashes.map((h) => `--hash=sha256:${h}`).join(" ")}\n`);
    record.requirementsSha256 = sha256(readFileSync(requirements));
    run("venv", python, ["-m", "venv", join(temp, "venv")]);
    const py = join(temp, "venv/bin/python");
    run("install", py, ["-I", "-m", "pip", "install", "--require-hashes", "--only-binary=:all:", "-r", requirements]);
    run("client", py, ["-I", "recompute/erc8350_client.py", "--json", join(output, "result.json"), "--emit-signature-vectors", join(output, "signature-vectors.json")], checkout);
    const unitsPath = join(output, "unit-results.json");
    run("unit-tests", py, ["-I", "-B", "-c", `
import json, sys, unittest
suite = unittest.defaultTestLoader.discover("recompute", pattern="test_*.py")
result = unittest.TextTestRunner(verbosity=2).run(suite)
summary = dict(tests=result.testsRun, skipped=len(result.skipped), failures=len(result.failures), errors=len(result.errors), successful=result.wasSuccessful())
with open(sys.argv[1], "w") as f: json.dump(summary, f, indent=2)
sys.exit(0 if result.wasSuccessful() and result.testsRun > 0 and not result.skipped else 1)
`, unitsPath], checkout);
    const report = json(join(output, "result.json"));
    const signatures = json(join(output, "signature-vectors.json"));
    validateResults(manifest, report, signatures, json(unitsPath));
    assert.equal(sha256(readFileSync(join(output, "signature-vectors.json"))), manifest.signatureVectorsSha256, "signature export bytes");
    assert.equal(run("source-status", "git", ["status", "--porcelain"], checkout), "");
    record.layers = Object.fromEntries(Object.entries(report.layers).map(([name, value]) => [name, { result: value.result, checks: value.checks.length }]));
    record.unitTests = json(unitsPath);
    record.status = "pass";
  } catch (error) {
    record.error = error.message;
    process.exitCode = 1;
  } finally {
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
