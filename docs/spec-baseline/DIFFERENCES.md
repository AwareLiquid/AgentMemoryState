# Baseline differences and dispositions

Current baseline: **spec-baseline-3**, official merge `8b11215c`.
The mirror now matches the merged Draft byte-for-byte; baseline manifests 1/2
remain unchanged. See [AQ-03 change and audit delta](../security/aq03-runtime-delta.md).

## Baseline 3 resolution

- AQ-01/AQ-02: official wording now distinguishes direct-empty exemption,
  arbitrary ERC-1271 bytes and 65-byte ECDSA recovery, with explicit signer roles
  and nonempty self-call validation.
- AQ-03: the official Registry now uses the same strict return-word comparison as
  the local runtime. The historical candidate and actual merge have identical
  spec/asset digests. Current-runtime external audit acceptance is still pending.
- `SPEC.md` now points to baseline 3; it remains informative. No wire format,
  hash, storage, signature vector, product runtime or audit freeze changes here.
- Maintainer Safe/real-7702 tests and portable signature adapters already exist;
  independent wallet execution remains outside the scoped Python evidence.

The tables below retain **historical baseline-1/2 observations**, not unresolved
claims about today's official text. Current rule classifications are in
[AUTHORIZATION.md](AUTHORIZATION.md).

Baseline: `spec-baseline-1`. Official authority and full source pins are in the
[manifest](spec-baseline-1.json). Comparisons use the official Draft at
`b9651bc84714e87e6361f4f6c0c8ff39cc265d0a` and the project before these documentation
changes at `891b47c70c8b45df1daaa78065b16ff73e67f8a4`.

## Three-text comparison

| ID | Observation at the examined commit | Disposition in this package | Remaining effect |
| --- | --- | --- | --- |
| D-01 | Official text and `erc/erc-8350.md` have identical Git blob `e67dfacb99555369d4fcace52de43bdf0281b43d` | Keep the mirror byte-identical and enforce its digest | Proposed changes belong outside the mirror until accepted upstream |
| D-02 | `SPEC.md` says pre-ERC and links `erc/erc-xxxx-agent-memory-state.md` | Replace obsolete status/path; label it informative | Historical bytes remain identified by commit and SHA-256 in the manifest |
| D-03 | `SPEC.md` separates EOA/contract signatures without explaining the ordered fallback | Summarize the actual ordering and link the decision table | No new runtime behavior or account-code-only dispatch |
| D-04 | `SPEC.md` omits the official immutable-enforcing-logic and fully scoped transition-reference requirements | Add overview links to the official sections | Deployment evidence is still required; prose is not a deployment proof |
| D-05 | `SPEC.md` primarily describes v1-vector validation; the implementing guide calls vectors the authority | Make official-text precedence and evidence levels explicit | Neither v1 nor v2 alone proves all signature/state-machine behavior |
| D-06 | `CONTRIBUTING.md` still calls this pre-ERC and tells authors to keep ERC-XXXX | Update to the existing Draft and baseline workflow | No author, license, assigned number or official status change |

## Official text versus observed behavior

| ID | Official text | Reference behavior / proposed direction | Classification |
| --- | --- | --- | --- |
| D-07 | Signature validation requires valid ERC-1271 signatures to be accepted, but later broadly rejects empty signatures from other callers | A relayer's empty bytes can be accepted by a digest-specific wallet policy; limit the prohibition to the direct-call shortcut | Unresolved textual conflict, AQ-01; proposal, not an upstream correction already made |
| D-08 | The same section rejects other lengths before recovery | Reference accepts short/custom bytes through ERC-1271 before checking the ECDSA length | Clarify that the 65-byte guard is recovery-only, AQ-01 |
| D-09 | Direct empty-signature authorization is MAY; registration/rotation use controller, transitions use authorizer | All three reference entry points enable that optional capability; non-empty bytes always undergo validation | Optional capability plus observed choice; AQ-02 clarifies generic required-signer wording |
| D-10 | ERC-1271 failure is followed by ECDSA and delegated-key risk is documented | The same 65-byte key signature can succeed despite a delegate policy rejection | Intentional normative fallback; not a wallet veto and not a new vulnerability claim |
| D-11 | Failed/short/wrong ERC-1271 returns trigger fallback | Baseline 1 reproduced a dirty-padding decoder abort; baseline 2 compares the full ABI word and falls back on mismatch | AQ-03 runtime fixed locally; external audit and official asset synchronization remain pending |
| D-12 | No universal gas allowance is specified | `staticcall` has no explicit gas cap; EIP-150 and transaction budget constrain execution | AQ-04: availability/resource risk, not a gas-induced authorization bypass |
| D-13 | Core acceptance rules are specified, but most custom error selectors and their order are not | v2 includes reference selectors, multi-invalid-input precedence and a zero-Space-ID check | Separate portable rejection outcomes from reference-exact diagnostics; do not promote vector-only details to ERC requirements |

D-07 and D-08 meant baseline-1/2 implementation behavior had to be reported as
**observed reference behavior under a proposed clarification**, not as an
unqualified resolution of the then-official wording. Baseline 3 resolves that
textual conflict through the observed upstream merge, not through local inference.

AQ-03 current regression tests (the original reproducer remains at commit `71b50f9`):

```bash
cd contracts
forge test --match-path test/unit/SpecBaselineAuthorization.t.sol \
  --match-test 'test.*(DirtyPadding|CanonicalWord|TruncatedMagic|WrongWord).*' -vvvv
```

Both Registry copies now reject dirty magic-prefix data as wallet approval but
accept an otherwise-valid ECDSA fallback. Wrong-key and empty-byte rejections
preserve state. The observed original effect was availability/compatibility,
not an unauthorized state write; this is not a completed external severity review.

## Evidence scope corrections

- `scripts/check-vectors.mjs` recomputes the five-entry chain and rejection
  selectors. It does not execute the twelve rejected operations.
- `contracts/test/unit/VectorsV2.t.sol` executes rejection cases against the
  Solidity registry. Its exact custom errors are reference-compatibility data.
- v2 publishes signing digests, not a complete suite of signed authorizations.
  Registration/rotation replay, contract-wallet policy and 7702 execution require
  additional executable cases.
- Existing 7702-named tests use `vm.etch`. They exercise code-present account
  handling, not the full delegation authorization transaction or nonce processing.
- New baseline tests are maintainer characterization evidence. They do not close
  R-002's externally maintained second-implementation objective.

## Historical baseline-2 boundary

Baseline 2 changes both local Registry source copies. The official ERC text,
v1/v2 vectors, EIP-712 domain, type strings, frozen audit manifest,
residual-risk register and audit tag remain unchanged. The local CC0 asset now
contains a proposed upstream fix, not bytes already merged into ethereum/ERCs.
The new source of truth is not a new protocol: it is an explicit pointer to the
already published official Draft, accompanied by proposed clarifications.

That paragraph records baseline 2's publication state; it is superseded for
official synchronization by baseline 3, not erased from history.

The [open-question register](OPEN_QUESTIONS.md) supplies the next action and exit
criterion for each unresolved behavior. A future runtime fix must reassess
current-source audit coverage instead of inheriting the frozen report implicitly.
