# ERC-8350 specification baseline

Current baseline: **spec-baseline-3**, recorded after
[ethereum/ERCs#2147](https://github.com/ethereum/ERCs/pull/2147) merged on 2026-11-06.
The official status is still **Draft**. This is not Review, G4 or release acceptance.

## Source of authority

| Artifact | Role | Pinned reference |
| --- | --- | --- |
| Official `ERCS/erc-8350.md` | Normative Draft | [ethereum/ERCs at 8b11215cf267f710b49ea003384e678bcf953eae](https://github.com/ethereum/ERCs/blob/8b11215cf267f710b49ea003384e678bcf953eae/ERCS/erc-8350.md) |
| Local `erc/erc-8350.md` | Byte-identical official mirror | [Local mirror](../../erc/erc-8350.md); SHA-256 and Git blob are pinned |
| `SPEC.md` | Informative implementation overview | [Overview](../../SPEC.md); does not override the official text |
| Project implementation and vectors | Examined source and test inputs | Main `086e493d70bb07fc2e8b4bfac12282312c2cdc9e`, after PR #38 |
| Authorization table | Interpretation and capability inventory | [Decision table](AUTHORIZATION.md), aligned with the merged Draft |

The [baseline-3 manifest](spec-baseline-3.json) pins the official text, runtime,
build settings and v1/v2 vectors. Its implementation commit identifies examined
source, not a claim that the new baseline documentation already existed there.
The historical overview digest likewise identifies `SPEC.md` at that commit.

Baseline IDs are evidence revisions. `ExperienceDelta v1`, EIP-712 domain
version `1`, storage, public interfaces and the v1/v2 vectors are unchanged.
Do not use a moving branch as the version an implementer signs off on.

## History and differences

- [Baseline 1](spec-baseline-1.json) records the earlier official Draft and
  original runtime, including the AQ-03 failure.
- [Baseline 2](spec-baseline-2.json) records the local runtime fix while official
  wording was still pending.
- Baseline 3 synchronizes the accepted Draft wording and official asset identity.
  The two historical manifest files and the
  [candidate manifest](../review/upstream-candidate.json) remain byte-identical.
- [Differences](DIFFERENCES.md) separates the historical observations from the
  merged resolution. [Open questions](OPEN_QUESTIONS.md) retains external-wallet,
  current-runtime audit, resource and deployment boundaries.

No vector or reference implementation overrides the official text. New semantic
questions should be recorded and discussed upstream, not silently turned into
new expected values.

## Verification

```bash
pnpm spec:check
pnpm spec:test
pnpm spec:check --verify-upstream
node --test scripts/review-candidate.test.mjs
node scripts/review-candidate.mjs
node scripts/review-candidate.mjs --official
pnpm conformance:clean
pnpm test:accounts
```

The offline baseline check verifies ten protected artifacts, the official mirror's
SHA-256/Git blob, both historical manifest digests and the four document entry
points. The network check verifies the pinned official text, not today's branch.

The evidence runner separately checks the historical candidate and merged
official source, including all three asset digests. Each mode runs 38
authorization/signature tests and requires exactly two expected AQ-03 failures
against the old official source. The official mode also checks its baseline
binding and the byte-identical local mirror. Reports preserve source commits,
toolchain, commands, harness commit, dirty status and raw outputs.

Full checkout and real-account evidence remain separate gates. None of these
tests constitutes an independently maintained client or an external audit.
See [official revision evidence](../review/upstream-authorization.md) for commands
and [Review preparation](../review/draft-to-review.md) for the remaining scope.

## Confirmation and notification

XiaoHai (`@XiaoHai67890`) coordinates the project. Responsibility categories are
technical and operations; the current maintainer handles both.

1. Technical: review/merge the baseline PR and preserve exact commits/results.
2. Operations: publish the baseline in the existing Magicians thread and issues
   [#21](https://github.com/AwareLiquid/AgentMemoryState/issues/21) and
   [#11](https://github.com/AwareLiquid/AgentMemoryState/issues/11).
3. Technical: request Draft-to-Review separately after checking the published
   packet. Any later official change requires a new assessed baseline.
4. Operations: record notification links and actual acknowledgements separately;
   sending a request is not receipt of independent verification.

The [handoff record](../review/draft-to-review.md) identifies the communication
scope. Historical independent Python results still apply to their old pinned
inputs until the contributor reports otherwise.

## Standards and release tracks

Under [EIP-1](https://eips.ethereum.org/EIPS/eip-1#eip-process), Review requests
peer review. A complete second implementation and an external audit are project
quality objectives, not universal EIP-1 prerequisites for entering Review.
Current-source G4 acceptance, production readiness, a release tag and a deployment
remain separate decisions. No approval or external attestation is inferred from CI.
