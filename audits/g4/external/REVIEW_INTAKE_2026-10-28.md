# External review intake: 2026-10-28

Status: **received, not accepted**. Implementation maintainer: XiaoHai
(`@XiaoHai67890`), the sole current maintainer per the maintainer's instruction.
Historical authorship, licenses and reviewer independence are unchanged.

## Provenance

- Reviewer: Besmubsa (pseudonymous; independence and no compensation are the
  reviewer's declarations, not independently established identity/competence).
- [Submission on issue #11](https://github.com/AwareLiquid/AgentMemoryState/issues/11#issuecomment-6383347118)
- [Reviewer revision](https://github.com/Besmubsa/erc8350-g4-security-review/commit/ac38d3d02ba07a992b92f0029d44802bae8f5154)
- [Original report](submissions/besmubsa-2026-10-24/reports/erc8350-g4-external-review.md)
- [Original JSON](submissions/besmubsa-2026-10-24/external-review.json)
- Report SHA-256: `822d2a3642fe9006945ba8bf074455da6b47b91352c1992606c026ca4be74f6b`
- JSON SHA-256: `ff9e2261923187454a0946175d35e5c65eae7108547deef71ed3c5aa77ad7335`

Original bytes are retained, including the report's limitations and wording.
Do not normalize or overwrite them with a maintainer interpretation. A corrected
report needs a new immutable revision and digest. The submission directory is
NOT the accepted `audits/g4/external/external-review.json` entry point.

The reviewer reports no unresolved Critical/High/Medium/Low findings and four
Informational findings. This is a reviewer conclusion about the pinned scope,
not a production-readiness or universal-security claim.

## Acceptance gaps

| Item | Current evidence | Required next action |
|---|---|---|
| Findings | Four IDs and prose, no top-level `findings` | Reviewer-confirmed per-finding dispositions, evidence/rationale and appropriate risk mappings |
| Attestation | Prose declaration, no JSON `attestation` | Statement, timestamp and full-commit URL in reviewer-owned repository |
| Risk set | R-001 through R-012 | Current v1 gate expects accepted R-001 through R-011; keep mitigated R-012 separately as verification V-01 |
| Report reference | Mutable `main` URL plus digest | Prefer full-commit URL; retain digest verification |
| Toolchain | py-evm/eth-tester described as current release | Exact versions and dependency lock; fresh-environment instructions |
| Portable runners | Hardcoded `/home/z/my-project/bugbounty/repos/erc8350` and `/tmp/solc` | Explicit repository/compiler arguments, exact frozen input revision |
| Negative result | Both scripts print comparison results without failing on mismatch | Nonzero exit for mismatches; negative-control test; compare typehash as well as domain in EVM runner |
| Foundry | Explicitly not run by reviewer | Preserve limitation; maintainer runs are separate, not external evidence |
| Current release | Report covers `af5a75f`, not current main | [Source delta assessment](SOURCE_DELTA_2026-10-28.md) and candidate-specific review before release |
| Human acceptance | Not yet recorded | XiaoHai evaluates reviewer expertise, independence, report quality and risk decisions explicitly |

Do not fabricate missing reviewer statements. Do not weaken the gate to accept
this snapshot. Passing CI for preparation is different from passing G4.

## Maintainer disposition proposals

These are proposals for reviewer concurrence, not edits to the external report.

| ID | Proposed treatment | Evidence expected |
|---|---|---|
| ERG4-I-01 | Document deployment-local grant identifiers; index by `(chainId, extensionAddress, grantId)` without changing v1 hashes | Distinct deployment/chain composite keys; equal local IDs do not imply equal records |
| ERG4-I-02 | Retain arbitrary ERC-1271 signature bytes; distinguish digest-specific preapproval from indiscriminate acceptance | Empty approved signature succeeds; unapproved digest fails; short custom signature succeeds; broad-acceptance wallet risk demonstrated |
| ERG4-I-03 | Document empty descriptor convention and perform Registry existence check | Unknown and registered/unpublished reads both empty; Registry distinguishes them |
| ERG4-I-04 | Document canonical EOA encoding, no changes to contract-wallet bytes | 65-byte low-s v=27/28 success; v=0/1, compact length and high-s rejected |

I-02 maps naturally to G4-R-008. Do not force I-01, I-03 or I-04 into an
unrelated existing risk merely to pass JSON validation. Documentation resolution
can be `fixed` only with verification accepted by the reviewer; if a genuinely
new residual risk is accepted, revise the register and obtain review of its new
digest. Under the current gate, accepted findings remain in unresolved counts;
do not set those counts to zero just because the findings are non-blocking.

The report's "sequence ordering makes replay impossible" is bounded by the
reviewed registry and finality assumptions; G4-R-007 still applies. The Space ID
zero sentinel is protected by the Registry's explicit zero-ID rejection, not a
mathematical impossibility of a hash output being zero.

## Reproduce the intake checks

```bash
pnpm security:test
node scripts/security-rc-gate.mjs --review audits/g4/external/submissions/besmubsa-2026-10-24/external-review.json
pnpm security:rc
```

The explicit submission command is expected to fail on missing `findings`.
The full gate remains blocked until a qualifying accepted record is present.
Integrity tests verify the original byte digests and this fail-closed boundary.
Use [the reviewer follow-up](REVIEWER_FOLLOWUP_2026-10-28.md) for the remaining
external requests. No RC tag or replacement deployment is authorized by this intake.
