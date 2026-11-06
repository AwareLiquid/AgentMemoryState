# AQ-03 runtime change and audit delta

Date: 2026-11-01. Status: implementation fix; external acceptance pending.

## Identity and scope

- Historical baseline: `spec-baseline-1`, P1a commit `71b50f98919bb4e8858a96493293b6188e8df2ab`.
- Current implementation: [spec-baseline-2](../spec-baseline/spec-baseline-2.json),
  whose implementation commit pins the runtime patch and regression tests.
- Changed runtime files: `contracts/src/reference/AgentMemoryStateRegistry.sol`
  and the proposed CC0 upstream copy `erc/assets/erc-8350/AgentMemoryStateRegistry.sol`.
- Frozen external review target remains `af5a75fb2db532fd5603554083d8895a825c2de2`.
  No old scope, report, tag, risk register or deployment record is rewritten.

## Behavior

Previously, `abi.decode(result, (bytes4))` could revert for a successful staticcall
returning a 32-byte word with nonzero padding. That prevented the specified ECDSA
fallback even with a valid key signature. The change compares an unconditionally
decodable `bytes32` word to the zero-padded magic constant after checking success
and length. Noncanonical words fail wallet validation and continue to the existing
fallback. The same digest and signature bytes are used. A bare magic prefix does
not authorize. Canonical words with trailing data retain their previous behavior.

No change to storage layout, events, wire format, hashes, signing domains, roles,
direct-call capability, signature length/low-s rules or STATICCALL semantics.
No new reentrancy guard, gas policy or returndata cap is introduced. Resource
exhaustion/relayer withholding remain separate limitations, not solved by this fix.

## Verification

`forge test --match-contract 'SpecBaseline.*AuthorizationTest' -vv` in `contracts`
passes 36 tests across product and CC0 copies, including 256 fuzz cases per copy.
Cases cover 0/4/31/32/33/64-byte returns, dirty padding, wrong magic, revert, valid
and invalid ECDSA fallback, all three operations, and unchanged head/authorization/
candidate-transition data after rejection. These dispatch tests use `vm.etch`;
they are not the separate real EIP-7702 transaction suite.

## Release and review requirements

The existing deployed Registry is immutable and is not patched by this source
change. The historical audit does not cover these new runtime bytes. An external
reviewer must assess this exact diff, the new build identity and residual risks
before release acceptance. Canonical G4 acceptance remains absent. A new deployment
needs a new reviewed candidate, address and verification evidence, not an in-place
upgrade or reuse of the old audit claim.

The official Draft text remains pinned; empty/custom-signature clarifications are
still proposals. The local CC0 asset fix must receive a separate upstream review
before claiming ethereum/ERCs contains it. No production readiness is asserted.

Update 2026-11-06: [official PR #2147](https://github.com/ethereum/ERCs/pull/2147)
proposes the exact local CC0 bytes at `397426c046049e1a0c3436e543f9731408708fd3`.
The [candidate gate](../review/upstream-authorization.md) verifies fetched source
digests, runs all 38 authorization/signature tests and requires two expected
dirty-padding failures against the old official source. Upstream acceptance and
the reviewer-owned current-source supplement remain pending.
