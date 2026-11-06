# Official authorization revision evidence

Date: 2026-11-06. Technical proposal, not upstream acceptance or a release.

## Exact inputs

- Official PR: [ethereum/ERCs#2147](https://github.com/ethereum/ERCs/pull/2147).
- Candidate: `397426c046049e1a0c3436e543f9731408708fd3` in `XiaoHai67890/ERCs`.
- Wording commit: `6420c36e`; runtime commit: `397426c0`.
- Accepted official text remains `b9651bc84714e87e6361f4f6c0c8ff39cc265d0a`.
- [Candidate manifest](upstream-candidate.json) pins the proposal text, all three
  CC0 source files, and the old-source negative control by commit and SHA-256.
- Harness originates from merged project main `5770a9090700cc6df925b7a399e53014eac16667`;
  each generated record identifies the actual runner commit and dirty status.

The candidate's three assets match the current local CC0 assets byte-for-byte.
Neither `erc/erc-8350.md` nor either historical baseline manifest is replaced.
The normative wording is a proposal resolving conflicting readings, not an
editorial-only change or already accepted rule.

## Reproduce

Requirements: Node 22, Foundry 1.7.1, solc 0.8.24, GitHub/solc download access.
From a clean checkout of this PR's head:

```bash
cd contracts
forge install foundry-rs/forge-std@v1.16.2 --no-git
cd ..
node --test scripts/review-candidate.test.mjs
node scripts/review-candidate.mjs
```

The runner downloads pinned source bytes, verifies their digests, checks the
candidate against local CC0 assets, and explicitly remaps the test import to
the fetched directory. Candidate/control compiler outputs are isolated. It does
not execute scripts from the external repository. Its JSON/logs are saved under
`artifacts/review-candidate/` and uploaded by `Official revision evidence` CI.
The initial local run passed; the PR's clean-checkout CI is the durable run record.

Expected results:

| Layer | Required result | Scope |
| --- | --- | --- |
| Runner adversarial tests | 9 pass, zero skips | Hash/HTTP failure, missing suites, false approval, missing assets, reduced fuzz counts |
| Candidate authorization | 36 pass | 18 tests per Registry copy, three operations, atomic rejection; 256 padding fuzz runs per copy |
| Candidate signature vectors | 2 pass | Each test executes all 46 externally exported ECDSA cases |
| Old official negative control | Exactly 2 specified tests fail | Dirty-padding valid-key fallback, deterministic and fuzz case, using old official source |

An empty suite, skip, fetch failure, malformed JSON or compiler failure cannot
satisfy the expected negative control. The expected failures are not unresolved
failures of the candidate. This gate proves the documented test outcomes, not
the completeness of the specification or an independent security assessment.

## Evidence already merged

[PR #36](https://github.com/AwareLiquid/AgentMemoryState/pull/36) and
[PR #37](https://github.com/AwareLiquid/AgentMemoryState/pull/37) are merged.
The [main acceptance record](https://github.com/AwareLiquid/AgentMemoryState/pull/37#issuecomment-6679669756)
binds clean commit `5770a909` to full workspace/Golden Vector checks, 155 TypeScript
and 120 Solidity tests, 58 real-account tests with local type-4 receipts, scoped
Python reproduction and both live replay suites. The new runner supplements,
not replaces, those gates. Static vectors cannot demonstrate wallet execution.

## Concrete handoff and acceptance

| Task | Responsibility | Output | Acceptance |
| --- | --- | --- | --- |
| Official technical review | Technical | PR #2147; answers to AQ-01/AQ-02/AQ-03 feedback | Review comments addressed; upstream merge observed, not inferred from CI |
| Community discussion | Operations | Targeted questions in the existing Magicians thread | Published URL and substantive responses/dissent recorded; draft prose is not a posted comment |
| Post-merge baseline | Technical | New numbered manifest and byte-identical official mirror | Actual merged SHA/digests verified; baselines 1/2 retained; notify implementers |
| Independent wallet coverage | Operations | Optional scope agreement in issue #21 | Contributor explicitly accepts a bounded task; no assumed maintenance commitment |
| Account conformance handoff | Technical | Existing 58-case harness, 46 vectors and rule table | External account results bind wallet/version/state, commands, outcomes and rejection snapshots; unsupported rows declared |
| Audit addendum | Operations | Reviewer-owned supplement via issues #11/#22 | Exact new candidate and runtime delta, methodology, findings, risk mapping and attestation; genuine acceptance before canonical record |
| Draft-to-Review submission | Technical | Separate status-only official PR after technical revision acceptance | Author requests peer review; no false claim that audit/independent tests guarantee editor merge |

Full independent implementation and G4 are project quality/release gates, not
universal EIP-1 requirements to request Review. ZK profiles, markets, new SDK
features and deployments are not prerequisites for this focused revision.

## Audit and deployment boundary

The October reviewer-controlled report is archived as a provisional submission;
it is not absent, but canonical acceptance is still pending. The frozen target
`af5a75fb2db532fd5603554083d8895a825c2de2` is unchanged and does not cover AQ-03.
The [runtime delta](../security/aq03-runtime-delta.md) is the supplement input.
`pnpm security:rc` remains a failing release gate until actual current-scope
evidence and acceptance exist. CI scope checks do not mean security-ready.

No deployment is changed by this work. An immutable existing address cannot be
patched by merging source. A future deployment needs separate bytecode/build,
Sourcify Exact Match and reachable-upgrade-path evidence for the actual network.
