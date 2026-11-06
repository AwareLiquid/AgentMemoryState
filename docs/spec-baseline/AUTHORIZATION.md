# Authorization decisions for spec-baseline-3

Current baseline: **spec-baseline-3**, official merge `8b11215c` (still Draft).
Historical spec-baseline-1 and spec-baseline-2 remain byte-identical.
See [AQ-03 change and audit delta](../security/aq03-runtime-delta.md).

This table distinguishes the official Draft, optional capabilities, observed
reference choices and remaining implementation/release questions. Source pins
are in the [baseline manifest](spec-baseline-3.json). AQ-01/AQ-02 wording and the
AQ-03 asset fix are merged into the official Draft. Decisions assume the
operation's non-authorization preconditions hold
and sufficient execution gas is available, unless a row says otherwise.

## Required account and digest

| Operation | Required account | Signed struct / replay binding | Direct-empty reference capability |
| --- | --- | --- | --- |
| `registerSpace` | Supplied controller, also bound into the derived Space ID | `SpaceRegistration`; Space not already registered | Enabled |
| `updateSpaceAuthorization` | Current controller before the update | `SpaceAuthorization`, including next `configNonce`; not the new controller | Enabled |
| `commitTransition` | Current authorizer | All seven `ExperienceDelta` fields; next sequence and current root | Enabled |

All three digests use the specified EIP-712 chain and Registry domain. The
signer is not inferred from the relayer. Rotation's nonce is constructed from
current state; replaying a signature for a prior nonce fails authorization.
Hereafter **required account** means the account in the second column.

## Ordered authorization paths

These paths are evaluated in order and stop at first success. Their input sets
are not disjoint. The signature bytes and digest remain unchanged between the
ERC-1271 attempt and the ECDSA fallback.

| ID | Condition | Result in the reference | Normative classification |
| --- | --- | --- | --- |
| A-01 | Caller equals required account; signature empty; direct-call capability enabled | Authorize without ERC-1271/ECDSA; still enforce every state/field precondition | Official MAY, enabled for all three reference operations |
| A-02 | Caller equals required account; signature non-empty | No shortcut; continue to ERC-1271/ECDSA, reject if neither succeeds | Explicit official validation rule, AQ-02 resolved |
| A-03 | Different caller; empty signature | No direct-call shortcut; continue to ERC-1271 if code exists | Explicit direct identity restriction; wallet policy may still authorize, AQ-01 resolved |
| A-04 | No account code | Skip ERC-1271 and try ECDSA | Official ordered validation |
| A-05 | Code exists; successful ERC-1271 call, canonical ABI result of at least 32 bytes with magic value | Authorize, including custom short/long/empty signatures approved by the wallet | Official ERC-1271 rule: first word has magic plus 28 zero padding bytes; trailing bytes ignored |
| A-06 | ERC-1271 reverts, returns fewer than 32 bytes, or canonically returns wrong magic | Continue to ECDSA; the wallet's failure is not a final veto | Official fallback rule |
| A-07 | Reached ECDSA with length other than 65 | Reject before recovery, including empty and EIP-2098 compact signatures | Recovery length rule; not a global rule for contract signatures |
| A-08 | Reached ECDSA with 65 bytes, canonical low-s, v 27/28, recovered account equals required account | Authorize | Official canonical ECDSA rule; exact helper errors are implementation details |
| A-09 | Reached ECDSA with high-s, invalid v/r/s or wrong recovered account | Reject | Official non-malleable/matching-account requirement |
| A-10 | Code-present keyed account; delegate returns wrong magic but the same signature meets A-08 | Authorize through ECDSA | Intentional retained-key behavior; delegate policy is not exclusive |
| A-11 | Call succeeds but returns a 32-byte word with magic prefix and nonzero padding | Invalid wallet approval, then same-byte ECDSA fallback | Explicit official rule and merged asset fix; current-runtime external audit addendum pending |
| A-12 | ERC-1271 runs out of forwarded gas | Fallback only if the caller retains enough gas; the whole call may fail | AQ-04; no guaranteed liveness for EOA or contract-policy signatures |

**Design intent:** a 7702 delegation does not revoke the underlying key. A
configured account can have both a wallet-policy authorization path and a
retained-key ECDSA path. An integrator needing delegate-exclusive policy cannot
assume the Registry provides it. An ordinary deployed contract's owner/deployer
key is not a key for that contract address; successful ECDSA recovery to that
address is not realistically available under the normal cryptographic assumptions.

Direct-empty capability is optional. A portable runner records whether an
implementation enables it; reference-exact tests expect it enabled. A self-call
with invalid non-empty bytes does not fall back to the direct-empty shortcut.

## Merged normative text

The authoritative wording is the [pinned official Signature validation section](https://github.com/ethereum/ERCs/blob/8b11215cf267f710b49ea003384e678bcf953eae/ERCS/erc-8350.md#signature-validation),
merged through [ethereum/ERCs#2147](https://github.com/ethereum/ERCs/pull/2147).
The table is an informative implementation aid, not a second normative text.
The merged revision specifies STATICCALL, canonical first-word handling and
fallback without changing hash inputs or the signing domain. Baselines 1/2
retain the historical context of the formerly conflicting readings.

## State safety and test mapping

Authorization precedes Registry writes in all three entry points. A successful
authorization does not excuse invalid Space derivation, required fields, nonce,
sequence or root. Tests exercise rejection without relying solely on the revert
selector:

- Existing Space: compare all `head` and `spaceAuthorization` fields before/after.
- Failed transition: also compare the candidate's stored transition record and
  ensure the previously accepted head/record remain intact.
- Failed registration: both Space queries still reject as unknown. Do not call
  them expecting a zero-valued existing Space.
- No successful Registry event may survive a reverted transaction. Test receipt
  semantics when using a transaction runner, rather than interpreting a debug
  trace's reverted LOG instructions as persisted events.

`SpecBaselineAuthorization.t.sol` characterizes all three operation roles, self
versus relayed empty/non-empty input, digest-specific wallet approval, fallback
and rejection atomicity. Existing `ExternalReviewBoundary.t.sol`,
`AuthorizationBoundary.t.sol` and `AgentMemoryStateRegistry.t.sol` supply further
encoding, callback, replay and state-linkage evidence. The separate
[account conformance suite](../interop/account-conformance.md) adds pinned Safe
1.4.1 and real Prague delegation, including local mined type-4 receipts. Portable
signature data is now published as `test-vectors/signature-vectors-v1.json`, with TS and
Solidity adapters merged in PR #37. External wallet execution remains a follow-up;
a mock's name does not establish those capabilities.

## Gas and policy boundary

The reference does not specify a gas cap on its ERC-1271 STATICCALL. EIP-150's
63/64 rule constrains forwarded gas; it does not reserve enough to complete the
fallback and storage writes. Low gas can deny a valid contract-policy signature
on an ordinary contract account **or a 7702 account**. An ECDSA fallback can
succeed only with a matching valid signature and sufficient remaining gas.

Do not introduce a universal gas number here. Client guidance can recommend
estimation, budget margin, re-simulation and retry with another relayer. The
correctness invariant is that resource failure creates no new authorization and
leaves no partial Registry state. The policy can also depend on wallet state,
time and the caller context; offline historical claims need the corresponding
execution state, not just current `eth_call` output or event hashes.

Sources: [ERC-1271 security considerations](https://eips.ethereum.org/EIPS/eip-1271#security-considerations),
[EIP-150](https://eips.ethereum.org/EIPS/eip-150),
[ERC-8350 signature validation](https://eips.ethereum.org/EIPS/eip-8350#signature-validation).
