import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { childEnvironment, sha256, validateResults } from "./independent-client-gate.mjs";

const manifest = JSON.parse(readFileSync(new URL("../evidence/independent-client/v1.json", import.meta.url)));
function fixture() {
  const source = { file: "erc8350_client.py", sha256: manifest.files["recompute/erc8350_client.py"], commit: manifest.commit, fileState: "clean" };
  return [manifest, {
    schema: "erc8350-client/result/v1", source, specBaseline: {draft: manifest.draft, vectors: manifest.vectors},
    toolchain: {pycryptodome: manifest.pycryptodome}, supportedCapabilities: {erc1271: "not supported (accounts modelled without code)"},
    layers: Object.fromEntries(Object.entries(manifest.layers).map(([key, n]) => [key, {result: "PASS", checks: Array.from({length: n}, () => ({pass: true}))}])),
  }, {schema: "erc8350-client/signature-vectors/v1", source, cases: Array(46).fill({})},
  {tests: 41, skipped: 0, failures: 0, errors: 0, successful: true}];
}
test("accepts the exact scoped results", () => validateResults(...fixture()));
for (const [name, mutate] of [
  ["skipped cast", (a) => a[3].skipped = 1],
  ["empty suite", (a) => a[3].tests = 0],
  ["failed unit", (a) => a[3].failures = 1],
  ["failed layer", (a) => a[1].layers.ecdsa.result = "FAIL"],
  ["false check under PASS", (a) => a[1].layers.hash.checks[0].pass = false],
  ["missing layer", (a) => delete a[1].layers.state],
  ["missing case", (a) => a[2].cases.pop()],
  ["wrong source", (a) => a[1].source.commit = "0".repeat(40)],
  ["dirty source", (a) => a[1].source.fileState = "modified"],
  ["changed baseline", (a) => a[1].specBaseline.draft = {}],
  ["wrong dependency", (a) => a[1].toolchain.pycryptodome = "0.0.0"],
  ["unsupported coverage claim", (a) => a[1].supportedCapabilities.erc1271 = "supported"],
]) {
  test(`refuses ${name}`, () => { const args = fixture(); mutate(args); assert.throws(() => validateResults(...args)); });
}
test("external processes do not inherit credentials or offline bypasses", () => {
  const env = childEnvironment("/tmp/example");
  for (const key of ["GITHUB_TOKEN", "GH_TOKEN", "ERC8350_OFFLINE", "ERC8350_INPUTS", "PYTHONPATH", "NODE_OPTIONS"]) assert.equal(env[key], undefined);
});

test("archived clean-checkout results retain every recorded artifact digest", () => {
  const records = fileURLToPath(new URL("../evidence/independent-client/records/", import.meta.url));
  const dates = readdirSync(records);
  assert.ok(dates.length > 0);
  for (const date of dates) {
    const read = (name) => readFileSync(join(records, date, name));
    const parse = (name) => JSON.parse(read(name));
    const record = parse("acceptance.json");
    assert.equal(record.status, "pass");
    assert.equal(record.consumer.clean, true);
    assert.match(record.consumer.commit, /^[0-9a-f]{40}$/);
    assert.ok(record.commands.every((command) => command.exitCode === 0));
    assert.equal(record.manifestSha256, sha256(read("manifest.json")));
    for (const [name, digest] of Object.entries(record.artifacts)) {
      assert.equal(sha256(read(name)), digest, `${date}/${name}`);
    }
    validateResults(parse("manifest.json"), parse("result.json"), parse("signature-vectors.json"), parse("unit-results.json"));
  }
});
