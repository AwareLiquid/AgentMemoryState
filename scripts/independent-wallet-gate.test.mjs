import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { sha256 } from "./independent-client-gate.mjs";
import { validateWalletReport } from "./independent-wallet-gate.mjs";

const root = fileURLToPath(new URL("../evidence/independent-wallet/", import.meta.url));
const json = (p) => JSON.parse(readFileSync(p, "utf8"));
const manifest = json(join(root, "v1.json"));
const valid = () => ({ ...manifest.expected, cases: structuredClone(manifest.cases),
  forge: "forge Version: 1.7.1", anvil: "anvil Version: 1.7.1",
  receipts: Array.from({ length: 188 }, (_, i) => ({ hash: `tx-${i}`, blockNumber: i + 1,
    status: i < 131 ? 1 : 0, logs: [] })) });

test("accepts exact scenario results and mined receipt accounting", () => validateWalletReport(manifest, valid()));
for (const [name, mutate] of Object.entries({
  "wrong source pin": (r) => { r.registryRevision = "other"; },
  "wrong Safe pin": (r) => { r.safeRevision = "other"; },
  "wrong compilation artifact": (r) => { r.registryCreationCodeSha256 = "other"; },
  "missing case": (r) => r.cases.pop(),
  "duplicate case": (r) => { r.cases[1] = r.cases[0]; },
  "failed case": (r) => { r.cases[0].result = "fail"; },
  "hidden error": (r) => { r.error = "failure"; },
  "wrong toolchain": (r) => { r.anvil = "Version: 1.7.2"; },
  "missing receipts": (r) => r.receipts.pop(),
  "duplicate receipt": (r) => { r.receipts[1].hash = r.receipts[0].hash; },
  "wrong status": (r) => { r.receipts[0].status = 0; },
  "persisted rejection logs": (r) => r.receipts[187].logs.push({}),
  "missing type-4 assertion": (r) => { r.cases = r.cases.filter((c) => !c.name.startsWith("7702: mined type-4")); },
  "unmined receipt": (r) => { r.receipts[0].blockNumber = null; },
})) {
  test(`rejects ${name}`, () => { const r = valid(); mutate(r); assert.throws(() => validateWalletReport(manifest, r)); });
}

test("archived runs bind native artifacts and declared passing outcomes", () => {
  const records = join(root, "records");
  let dirs;
  try { dirs = readdirSync(records); } catch (e) { if (e.code === "ENOENT") return; throw e; }
  for (const dir of dirs) {
    const path = join(records, dir);
    const acceptance = json(join(path, "acceptance.json"));
    const pinned = json(join(path, "manifest.json"));
    assert.equal(sha256(readFileSync(join(path, "manifest.json"))), acceptance.manifestSha256);
    assert.equal(acceptance.externalCommit, pinned.commit);
    for (const [file, digest] of Object.entries(acceptance.artifacts)) {
      assert.equal(sha256(readFileSync(join(path, file))), digest, `${dir}/${file}`);
    }
    if (acceptance.status === "pass") {
      assert.ok(acceptance.consumer.clean);
      assert.ok(acceptance.commands.every((c) => c.exitCode === 0));
      validateWalletReport(pinned, json(join(path, "report.json")));
    } else {
      assert.equal(acceptance.status, "fail");
      assert.ok(acceptance.error);
    }
  }
});
