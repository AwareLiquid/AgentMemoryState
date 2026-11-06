# Official authorization revision evidence

Updated 2026-11-06: [ethereum/ERCs#2147](https://github.com/ethereum/ERCs/pull/2147)
merged at `8b11215cf267f710b49ea003384e678bcf953eae`.
The official status remains Draft. Source acceptance is not G4, a release,
deployment verification or independent security approval.

## Exact inputs

- [Baseline 3](../spec-baseline/spec-baseline-3.json) pins the actual official merge
  and the byte-identical local mirror.
- [Official manifest](upstream-official.json) pins the merged text and all three
  CC0 assets, and binds them to baseline 3 and the historical candidate digest.
- [Historical candidate](upstream-candidate.json) remains unchanged:
  `397426c046049e1a0c3436e543f9731408708fd3` in `XiaoHai67890/ERCs`.
  Its proposed status describes that historical record, not today's official state.
- Candidate and merged text SHA-256:
  `295ab952357cefe141f3f1df5ceaaed2fe40826939fd22c683519c747a0fc072`.
- Candidate and merged Registry SHA-256:
  `94c7f39920205ae581e6537828a80a3dcfeb0a283c833ed2b50bc10927a292c3`.
- Negative control remains official
  `b9651bc84714e87e6361f4f6c0c8ff39cc265d0a`, Registry SHA-256
  `6d99fc690abd776c53f607be9da1e25c2a48a80037088a3f3fb029f54943685b`.
- Examined project main after PR #38:
  `086e493d70bb07fc2e8b4bfac12282312c2cdc9e`. Each new run records its actual
  harness commit and dirty-checkout status rather than inheriting a previous PASS.

## Reproduce

Requirements: Node 22, Foundry 1.7.1, solc 0.8.24, GitHub/solc download access.
From a clean checkout of the baseline PR commit:

```bash
cd contracts
forge install foundry-rs/forge-std@v1.16.2 --no-git
cd ..
node --test scripts/spec-baseline.test.mjs scripts/review-candidate.test.mjs
node scripts/spec-baseline.mjs --verify-upstream
node scripts/review-candidate.mjs
node scripts/review-candidate.mjs --official
```

The default mode preserves historical-candidate evidence. The explicit
`--official` mode fetches from ethereum/ERCs at the actual merge commit and
checks baseline identity, immutable candidate history, spec/assets and the local
mirror. Neither mode executes scripts from the downloaded repository.

Both modes explicitly remap test imports to fetched source and isolate compiler
outputs/failure persistence. Outputs go respectively to
`artifacts/review-candidate/` and `artifacts/review-official/`.
The read-only `Official revision evidence` CI uploads raw source, outputs and
reports; each report includes the manifest, commands, source/harness commits,
Foundry version, dirty status and output digests.

Required outcomes:

| Layer | Required result | Scope |
| --- | --- | --- |
| Baseline/gate unit tests | 47 pass, zero skips | Historical integrity, source/status bindings, failure handling and result validation |
| Each source mode: authorization | 36 pass | 18 per Registry copy; three operations; atomic rejection; 256 padding fuzz runs per copy |
| Each source mode: signature vectors | 2 pass | Each executes all 46 independently exported ECDSA cases |
| Each source mode: historical control | Exactly 2 named tests fail | Old official dirty-padding valid-key fallback, deterministic and fuzz regression |
| Full workspace | Separate clean-checkout gate | All three Golden Vector implementations, TS, Solidity, invariants and preparation guards |
| Real accounts | Separate account gate | Pinned Safe 1.4.1 and Prague/real local type-4 execution |

Expected old-source failures are not failures of the current implementation.
Empty suites, skips, fetch errors, malformed JSON and compiler failures cannot
satisfy the negative control. These results do not establish complete protocol
correctness or independent security acceptance.

## Evidence already merged

Project PRs [#36](https://github.com/AwareLiquid/AgentMemoryState/pull/36),
[#37](https://github.com/AwareLiquid/AgentMemoryState/pull/37) and
[#38](https://github.com/AwareLiquid/AgentMemoryState/pull/38) are merged.
The [PR #37 main acceptance](https://github.com/AwareLiquid/AgentMemoryState/pull/37#issuecomment-6679669756)
records clean main `5770a909`: 155 TS, 120 Solidity, 58 real-account tests,
local type-4 receipts, scoped Python reproduction and both live replay suites.
Those are versioned historical results, not automatically a run of baseline 3.
Fresh local/CI results are linked from the baseline PR.

## Handoff and remaining boundaries

| Task | Responsibility | Output / acceptance |
| --- | --- | --- |
| Official synchronization | Technical | Observed merge, baseline 3, byte-identical mirror; old baselines retained |
| Community discussion | Operations | Existing Magicians thread; actual post URL and substantive responses/dissent |
| Independent-client follow-up | Operations | Issue #21; contributor reports new pins, layer outcomes and unsupported wallet paths |
| Wallet conformance | Technical | Existing 58-case harness and 46 vectors; external results identify wallet/state/commands and rejection snapshots |
| Audit addendum | Operations | Issues #11/#22; reviewer-owned exact-runtime supplement, findings, risk mapping and attestation |
| Draft-to-Review request | Technical | Separate official status request after baseline evidence is public; no new semantics or claim of production readiness |

No contributor has accepted new scope merely because this document names it.
A full independent implementation and G4 are project quality/release objectives,
not universal EIP-1 prerequisites for requesting Review.

## Audit and deployment boundary

The October reviewer-controlled report remains a provisional submission. The
frozen target `af5a75fb2db532fd5603554083d8895a825c2de2` is unchanged and does not
cover AQ-03. The [runtime delta](../security/aq03-runtime-delta.md) is the supplement
input. `pnpm security:rc` remains a failing release gate until genuine scope and
acceptance evidence exist; scope-only CI does not mean security-ready.

No deployment is changed. An immutable existing address cannot be patched by a
source merge. A future deployment needs its own build/bytecode identity, Sourcify
Exact Match and reachable-upgrade-path evidence for the actual chain.
