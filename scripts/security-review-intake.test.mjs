import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const submission = path.join(root, "audits/g4/external/submissions/besmubsa-2026-10-24");
const report = await readFile(path.join(submission, "reports/erc8350-g4-external-review.md"));
const recordBytes = await readFile(path.join(submission, "external-review.json"));
const record = JSON.parse(recordBytes);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("October submission preserves reviewer-owned original bytes", () => {
  assert.equal(sha256(report), "822d2a3642fe9006945ba8bf074455da6b47b91352c1992606c026ca4be74f6b");
  assert.equal(sha256(recordBytes), "ff9e2261923187454a0946175d35e5c65eae7108547deef71ed3c5aa77ad7335");
  assert.equal(record.report.sha256, sha256(report));
  assert.equal(record.scope.commit, "af5a75fb2db532fd5603554083d8895a825c2de2");
});

test("October submission is not silently promoted to accepted review evidence", () => {
  const result = spawnSync(process.execPath, [
    path.join(root, "scripts/security-rc-gate.mjs"),
    "--review", path.join(submission, "external-review.json"),
  ], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /External-review findings must be an array/u);
  assert.doesNotMatch(result.stdout, /G4 security-ready RC: PASS/u);
});

test("reviewer limitations and four open informational findings are retained", () => {
  assert.equal(record.conclusion.unresolved.informational, 4);
  assert.equal(record.conclusion.findingIds.length, 4);
  assert.ok(record.methodology.limitations.some((entry) => entry.includes("Foundry test suite was not executed")));
  assert.equal(Object.hasOwn(record, "attestation"), false);
  assert.ok(record.reviewedResidualRiskIds.includes("G4-R-012"));
});
