# Independent client handoff

Owner categories: technical and operations. Current contact: `@XiaoHai67890`.
Tracking: [#21](https://github.com/AwareLiquid/AgentMemoryState/issues/21).
Status as of 2026-11-11: a scoped external Python client and a separate external
wallet execution client have been delivered and reproduced. See
[Python acceptance](independent-client-results.md) and
[wallet coverage and limitations](independent-wallet-results.md).
These are separate artifacts, not one full account-capable implementation.
Issue #21 remains open; current-runtime audit acceptance remains in #11/#22.

## Inputs to agree before implementation

1. Use the recorded `spec-baseline-3` handoff: official Draft commit
   `8b11215cf267f710b49ea003384e678bcf953eae`, pinned in its
   [manifest](../spec-baseline/spec-baseline-3.json). The official
   [`ERCS/erc-8350.md`](https://github.com/ethereum/ERCs/blob/8b11215cf267f710b49ea003384e678bcf953eae/ERCS/erc-8350.md)
   is normative; local overviews and this handoff do not override it.
2. Record the examined implementation commit and v1/v2 input digests from that
   manifest. For the handoff/evidence documents, use project main
   `7e9932e0057b7ce51c675773d8162cf1cc37be39` or the exact later documentation
   commit being used. Do not substitute a moving branch for a tested source pin.
3. AQ-01/AQ-02 wording and the AQ-03 official asset fix merged in
   [ethereum/ERCs#2147](https://github.com/ethereum/ERCs/pull/2147).
   Consult the [authorization table](../spec-baseline/AUTHORIZATION.md) and
   [remaining questions](../spec-baseline/OPEN_QUESTIONS.md); report any newly
   disputed semantics before implementation. Current-runtime external audit
   acceptance is still pending, not implied by that merge.
4. Freeze the implementer's repository commit, language/tool versions, dependency
   lock/digests, command and declared support profile. Do not import the project SDK.

Official [#2151](https://github.com/ethereum/ERCs/pull/2151), merge
`47c7f884eb12e110d915b20f7cf0e8077542158b`, subsequently corrected interface
NatSpec. It is not the tested source pin of the existing wallet record. A new
delivery using that revision should name it and record any source differences;
do not relabel earlier runs or silently rewrite the baseline manifests.
The Python results retain their historical official Draft `b9651bc` and vector
pins. Baselines 1/2 remain historical records, not the default new-work handoff.

## Delivered evidence and remaining work

| Artifact / layer | Delivered evidence | Next bounded acceptance |
| --- | --- | --- |
| Python hash, fixture, held-state and EOA client | Independent source `95ca613bac0d7ef9192f32264f1f315d869d5ce2`; six passing layers and 41 zero-skip unit tests at its historical inputs | Optional contributor-owned baseline-3 assessment and new pinned run; preserve the old report and disclose changed or unsupported rules |
| Separate wallet execution client | Independent source `b4ba24169e63ede14eb2f11f8115ff058845aa55`; 34 scenarios and one negative control against the official reference at `8b11215` | Reconcile selected authorization rows against the declared capability profile; this is not an independently implemented Registry |
| Independent account-capable Registry | Not established by either artifact or by combining their results | Agree a separately authored, bounded implementation and executable account scenarios before requesting a delivery |
| Direct-empty capability | Optional in the Draft; existing artifacts have different declared scopes | Declare enabled/disabled for each operation and verify the declaration; do not require an optional feature universally |
| Gas, historical state and wallet variants | Not exhaustively covered by the delivered wallet evidence | Record limitations and agree any additional scenario separately; do not introduce a gas minimum or a claim about every wallet version |

The wallet result includes 188 mined receipts (131 success, 57 expected reverts)
on local Anvil blocks 4-196. These are not Sepolia receipts or a new public
deployment. Its [main reproduction](https://github.com/AwareLiquid/AgentMemoryState/actions/runs/42458870748)
is bound to main `7e9932e`; earlier records keep their own consumer commits.
The maintainer runner, portable adapters and reference tests are not additional
independent implementations. Independence remains contributor-declared provenance.

## Proposed next contribution

Before anyone starts, agree the smallest useful deliverable in #21:

1. A baseline refresh of an existing scoped implementation, or a new separately
   authored Registry with an explicitly bounded account support profile. These
   are different milestones; neither silently commits the contributor to the other.
2. Exact official source, vector inputs, operation coverage, direct-empty
   capability and supported wallet policies. Describe the remaining rows as
   unsupported, not failed or implicitly passed.
3. For the agreed scope: v1/v2 byte equality, the offline five-transition fixture,
   held-state rejection outcomes and executable authorization scenarios.
   Compare head, authorization and candidate transition records before/after
   rejected calls, and check that reverted transactions retain no Registry logs.
   Reference error selectors are a separate compatibility label.
4. A public implementer-controlled source commit, reproducible command, pinned
   dependencies/toolchain, native report/logs, evidence digests and limitations.
   A maintainer rerun is recorded separately from the contributor's result.
5. Availability and a contributor-proposed delivery estimate, if they wish to
   take it on. Declining, narrowing scope or reporting a blocker is welcome;
   there is no presumed compensation, deadline or maintenance obligation.

This is an implementation-quality objective, not a new normative requirement or
a universal prerequisite for entering EIP-1 Review. It does not close the
current-runtime external audit gate or establish production readiness.

## Independently reported acceptance

| Layer | Required output | Boundary |
| --- | --- | --- |
| Hash/encoding | v1/v2 typehashes, spaceId, transitionId, signing digest, state roots byte-for-byte | A matching hash alone is not a full client |
| State machine | Register, rotate, append; nonce/sequence/root and required-field rejection; state snapshots unchanged on rejection | Report normative outcomes separately from reference error selectors |
| Authorization | Direct-empty optional capability explicitly declared; nonempty self-call, canonical ECDSA, contract policy and fallback | Chain state is required for ERC-1271; do not infer a rejection veto |
| Fixture | Offline verification of the five-transition fixture, declared chain/Registry/domain, counts and root | Distinguish recomputation from enforcing wallet authorization |
| Executable interoperability | Valid and invalid cases with process exit status, logs and negative controls | Use an adapter for the implementation language; Foundry tests are not universally plug-in clients |
| Independence | Public implementer-controlled repository and provenance/affiliation statement | Maintainer/assistant-written ports do not count as external independence |

Suggested first response: choose a narrow layer, identify disputed wording,
propose a language and runnable artifact. Different language is useful but not a
substitute for genuinely separate authorship and maintenance. No compensation,
deadline commitment or endorsement is implied by the invitation.

Record results with `sourceCommit`, `specBaseline`, `toolchain`, `commands`,
`supportedCapabilities`, per-layer PASS/FAIL, evidence digests, limitations and
maintainer attestation. Keep #21 open until the agreed full scope is delivered.
The recovered live replay (#29/#31) remains narrower evidence.
