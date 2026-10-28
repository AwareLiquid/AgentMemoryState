# External review integration boundaries

These notes address ERG4-I-01 through I-04 in the October 2026 external review.
They clarify existing implementation behavior, not new ERC requirements. See
the [intake](../../audits/g4/external/REVIEW_INTAKE_2026-10-28.md) for acceptance
status. No reviewed runtime source or canonical vector is changed here.

## AuditGrant identifiers (I-01)

Treat a grant reference as `(chainId, AuditGrant contract address, grantId)`.
Do not use `grantId` alone as a cross-deployment database key. Resolve the
extension's immutable Registry address before reading its Space history. Use
canonical integer chain IDs and normalized addresses/bytes32 values in storage;
a structured composite database key avoids ambiguous string concatenation.

Two extensions can legitimately derive the same `grantId` for the same Space,
auditor and range. That does not make their events, revocation status or witness
sets interchangeable. No domain field is added to the existing ID algorithm.

## Contract-wallet policy (I-02)

ERC-1271 signature bytes are opaque. A wallet can approve a digest in its own
state and later return the magic value for that digest with empty signature
bytes; it may also use a custom short or long encoding. Neither behavior alone
is a defect. Do not apply EOA length or v normalization rules to contract-wallet
signatures. See [ERC-1271](https://eips.ethereum.org/EIPS/eip-1271).

Before selecting a controller/authorizer wallet, test approved and unapproved
digests, changed Delta fields, replay/domain binding, empty and non-empty bytes,
reverts and malformed return data. A wallet that approves every digest delegates
effective permission to every caller; the Registry cannot repair that policy.
Review its upgrade authority too. This is the G4-R-008 trust boundary.

Direct-call authorization still requires `msg.sender == signer` and empty
bytes; a relayer submitting empty bytes does not acquire that shortcut. It needs
wallet approval. The EIP-7702 underlying ECDSA key path remains as described in
G4-R-003; these notes do not remove it.

## Descriptor lookup (I-03)

`descriptorOf` returns `("", 0, 0)` both for an unknown Space and for an existing
Space without a descriptor. A cleared descriptor also has this representation.
An empty result is not evidence that a Space exists or never had a descriptor.

For an API/indexer, query the extension's Registry `spaceAuthorization(spaceId)`
at the same block as `descriptorOf`. Classify the specific `UnknownSpace` revert
as not found, a successful Registry lookup plus empty descriptor as unpublished,
and other RPC/revert/decoding errors as lookup failures (not not-found results).
Published descriptors still need content-hash and data-availability checks.
Historical publish/clear events distinguish previous publication when needed.

## EOA encoding (I-04)

The ECDSA fallback accepts exactly 65 bytes `r || s || v`, low-s, with raw
`v` equal to 27 or 28. Normalize an EOA library's 0/1 recovery parity to 27/28
in its explicit EOA adapter, not by rewriting arbitrary wallet signatures.
EIP-2098 64-byte input is not accepted by this fallback. Unsupported length
fails authorization; invalid v and high-s signatures fail closed. Existing
signed digest/domain/space/sequence checks still apply.

## Executable evidence

```bash
cd contracts
forge test --match-path test/unit/ExternalReviewBoundary.t.sol -vv
```

This maintainer suite covers scoped grant references, valid digest-specific empty
preapproval, custom short signatures, wrong digests/signatures, an intentionally
permissive wallet, descriptor ambiguity, both canonical EOA parity values,
raw 0/1 parity, compact signatures and high-s rejection. It complements existing
ERC-1271 revert/malformed-return/7702 and cross-Space tests. It is not an external
audit or a new independent implementation.
