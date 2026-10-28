# Maintainer validation record: 2026-10-28

This is project-side reproduction, NOT a new independent audit. XiaoHai67890
is the current implementation maintainer. External reviewer concurrence and
manual G4 acceptance remain pending.

## Tested revision

- Executed source: `b93c37da77dcb8dc2b42a9a518ba287998bd791b`
- Corrected-author equivalent: `f73b02ad0899be402d2e58df7c354e0a89f171e9`
- Identical source tree: `36b4d00387e461cf9d20f4ad8239e28ea7faad81`
- Only this work's commit author metadata was corrected from a legacy local Git
  configuration to XiaoHai67890. Historical project commits were not rewritten.
  The recorded original execution SHA has not been substituted in raw evidence.
- Tools: Node 22.23.2, pnpm 11.7.0, Foundry 1.7.1, solc 0.8.24,
  forge-std v1.16.2. CI uses Node 22 and the same pinned pnpm/Foundry versions.

## Results

| Check | Observed result | Evidence |
|---|---|---|
| Fresh checkout install and `pnpm check` | PASS; 57 TypeScript tests, 82 Solidity tests including 11 new boundary cases | [Workspace log](conformance/logs/workspace.txt) |
| `pnpm conformance:clean` | PASS; core TS, minimal TS and Solidity match the same v1 vector | [JSON](conformance/conformance-v1.json), [summary](conformance/conformance-v1.md) |
| `pnpm security:test` (inside check) | 18/18 PASS, including rejection of the incomplete October submission | Workspace log |
| `pnpm demo:private-witness` | PASS; 2 transitions, disclosure of sequence 2 only, Solidity integration passes | [Log](private-witness.log) |
| `pnpm audit --json` | PASS; 0 known advisories after targeted dev-tool updates | [JSON](dependency-audit.json) |
| `pnpm release:check` | FAIL as intended at `security:rc`: accepted external-review record absent; earlier conformance checks pass | [Log](release-check.log) |
| R-002 pinned external suites, default RPC order | FAIL: replay header hash reconstruction mismatch; composition suite PASS | [CI report](r002-ci/report.json), [replay log](r002-ci/logs/erc8312-sepolia-state-replay.txt) |
| R-002 alternate RPC order | FAIL: PublicNode rejects log range above 50,000 blocks; composition suite PASS | [Report](r002-alternate-rpc/report.json), [replay log](r002-alternate-rpc/logs/erc8312-sepolia-state-replay.txt) |
| October reviewer's original vector runner | Exit 1: hardcoded `/home/z/my-project/bugbounty/repos/erc8350/test-vectors/v1.json` absent | Intake follow-up; no clean reproduction claimed |

The default-RPC failure is from
[GitHub Actions](https://github.com/AwareLiquid/AgentMemoryState/actions/runs/40684893047/job/122804597411).
Its report does not independently pin the project checkout; the Actions run
provides that context. Source and dependency digests pin the external runners.
An endpoint/header mismatch is not proof of a Registry defect or of a dishonest
provider. The upstream script has no newer revision for this entrypoint at the
time of this check. Track investigation in [issue #29](https://github.com/AwareLiquid/AgentMemoryState/issues/29).

Do not substitute a historical block, remove header/MPT checks, relax expected
exit codes or suppress this failure to make the PR green. The July R-002 pass
remains historical evidence, not a passing current rerun.

## Reproduce

Checkout the corrected-author revision above, install the documented toolchain,
then run the following. The clean gate installs its own dependencies and executes
the workspace check as well as all three golden suites. Do not run build/clean
commands concurrently in the same checkout.

```bash
pnpm install --frozen-lockfile
pnpm conformance:clean
pnpm demo:private-witness
pnpm audit --json
pnpm release:check
pnpm evidence:external
```

Install `foundry-rs/forge-std@v1.16.2 --no-git` with `forge install` in `contracts`
for commands running in the caller's checkout. The last two commands currently
fail for the distinct documented external-evidence and live-replay reasons.
Conformance records embed SHA-256 digests for each log. Raw transcripts are
historical command output, not instructions to execute.
