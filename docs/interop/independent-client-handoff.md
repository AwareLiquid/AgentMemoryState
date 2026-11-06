# Independent client handoff

Owner categories: technical and operations. Current contact: `@XiaoHai67890`.
Tracking: [#21](https://github.com/AwareLiquid/AgentMemoryState/issues/21).
Status: a scoped external Python client has been delivered at `95ca613`.
See [scoped acceptance and remaining work](independent-client-results.md).
Full account coverage and completion of #21 are not asserted.

## Inputs to agree before implementation

1. Name the official Draft commit `b9651bc84714e87e6361f4f6c0c8ff39cc265d0a`.
2. Name the project proposal `spec-baseline-2` and implementation runtime commit
   from its [manifest](../spec-baseline/spec-baseline-2.json).
3. Explicitly accept or dispute AQ-01/AQ-02/AQ-03. The proposal is not already
   official; report disagreements before committing to a full implementation.
4. Freeze the implementer's repository commit, language/tool versions, dependency
   lock/digests, command and declared support profile. Do not import the project SDK.

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
