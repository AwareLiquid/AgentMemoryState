# Portable EOA signature conformance

The 46-case [signature export](../../test-vectors/signature-vectors-v1.json) is
unmodified output of `recompute/erc8350_client.py --emit-signature-vectors` from
[ERC8312/bounded-agent-actions](https://github.com/ERC8312/bounded-agent-actions/tree/95ca613bac0d7ef9192f32264f1f315d869d5ce2)
at `95ca613bac0d7ef9192f32264f1f315d869d5ce2`. The generator is CC0-1.0, source
SHA-256 `33dd89de0158e0a3fdc57d9974c4a2b4e8b49a6d5d91255eda04f530ed02c7ca`.
The exported bytes have SHA-256
`d37f00d51acc66d64599dac9fae44283d93f673b20c1f7b3d7532a505e153798`.
Both the TypeScript harness and Solidity suite enforce this digest.

All private keys in this fixture are public test keys. Never fund these accounts.
The fixture format version does not change the protocol version, typehashes,
official Draft baseline, existing `v1.json` or `v2.json`.

## Run

Use Node 22+, pnpm 11.7.0, Foundry 1.7.1 and forge-std 1.16.2, as in CI:

```bash
pnpm install --frozen-lockfile
cd contracts
forge install foundry-rs/forge-std@v1.16.2 --no-git
cd ..
pnpm test:signatures
```

All suites are also discovered by `pnpm check` and the existing clean-checkout CI.
Each Solidity registry copy executes all 46 operations (10 accepts, 36 rejects).
Each SDK executes 46 named cases plus 3 harness negative controls. Each named
TypeScript case reconstructs its prior accepted state from the start, so it does
not depend on test scheduling. The controls catch always-accept, always-reject and
digest-drift adapters. A passing suite does not mean every vector is an acceptance.

## What is verified

| Implementation | Checks | Boundary |
| --- | --- | --- |
| Solidity reference and ERC asset copy | Actual registration, rotation, transition authorization, struct hashes, digests, state updates, revert atomicity and reference error selectors | Fixture runtime is placed at signed addresses with Foundry; not deployment evidence |
| Core TypeScript SDK | Its own spaceId, registration/rotation/transition hashes, digests and next-root calculations, plus EOA cases using a test-only held-state adapter | SDK is not a full account or registry client |
| Minimal TypeScript SDK | Same byte-level inputs/outputs through its independent hash implementation | Shares the test-only EOA state/recovery adapter with core; not independent authorization code |

The adapter uses the existing Noble secp256k1 dependency for recovery, with
explicit 65-byte, v, r and low-s checks. No production contract or SDK API is
changed. No code from the external Python implementation is imported. Results
from these maintainer-written adapters are not additional independent authorship.

Cases cover wrong roles, direct-empty versus self/non-empty calls, cross-chain
and registry replay, rotation nonce replay, length 0/64/65/66, high-s malleability,
zero/out-of-range r/s, invalid v, the inclusive low-s boundary, and r >= n.
Rejection checks compare head, authorization and candidate/previous transition
records. Solidity additionally requires no emitted logs and the specific
reference selector, separately from the normative accept/reject outcome.

## Required boundary setup

The upstream exporter sets up two synthetic recovered accounts outside the
46-entry array. Before cases 43 and 45, both harnesses reproduce those setups:

| Before zero-based case | Salt preimage | Controller | Authorizer |
| --- | --- | --- | --- |
| 43 | `erc8350-client boundary: low-s` | `0xce613a5a39c9d37033d2acc14f686784cae429bf` | `0x555018c5200e561d3262c1b54c1b6d18654e9cbf` |
| 45 | `erc8350-client boundary: r >= n` | `0xce613a5a39c9d37033d2acc14f686784cae429bf` | `0xf3c2b0d530a89cf90cbe2e51ca88086e09bb2069` |

Salt is Keccak-256 of the UTF-8 preimage. The derived spaceId is checked against
the fixture; Solidity registers it by the controller's direct empty call. Every
transition verifies its Space exists and sequence/root preconditions before the
signature call. Consequently `UnknownSpace` cannot masquerade as a successful
negative authorization test. Case 44 must accept s = floor(n/2).

The fixed-address Solidity fixture deploys a constructor on chain 31337 and
copies runtime to the published signing addresses. Cases use chain 11155111 or 1,
forcing runtime domain recomputation. Each digest must match the exported bytes;
this does not attest a real deployment or test the constructor cache path.

## Remaining scope

ERC-1271, Safe and EIP-7702 are not expressible as these static EOA fixtures.
The separate [real-account suite](account-conformance.md) remains the maintainer
executable handoff. An external implementation must execute and report those
paths independently before full-scope issue #21 acceptance. This suite is not
an external security audit, a G4 gate pass or production-readiness approval.
