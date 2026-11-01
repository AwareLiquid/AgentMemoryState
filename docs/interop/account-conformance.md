# Real-account authorization evidence

This is a maintainer-run executable test package, not an independent implementation
or an external security audit. Its interpretation is the proposed
[spec-baseline-2](../spec-baseline/spec-baseline-2.json), with the official Draft
still authoritative and AQ-01/AQ-02 wording not yet approved upstream.

## Reproduce

Requirements: Node 22+, Git, Foundry **v1.7.1**, access to GitHub and solc downloads.

```bash
node scripts/account-conformance.mjs
```

The runner installs forge-std v1.16.2 and pins Safe 1.4.1 to
`bf943f80fec5ac647159d26161446ac5d716a294`. It rejects a different or dirty Safe
checkout. Dependencies remain outside shipped Registry runtime code.
Safe's source and LGPL license remain in its own repository; this project does
not relicense or vendor those files into the CC0 reference implementation.

The original `contracts/foundry.toml` is unchanged: Registry artifacts are built
with solc 0.8.24, optimizer 200, Cancun. The runner verifies artifact metadata;
both Registry copies are deployed from those exact artifacts in a separate
solc 0.8.30/Prague account harness. Safe and test delegates use the harness build.
This is not proof of identity with a deployed mainnet Safe singleton.

JSON/log outputs are under `artifacts/account-conformance/`; the dedicated
GitHub Actions job publishes them for its exact commit. Reports record Safe pin,
Registry artifact digests, compiler/EVM versions, Foundry version, source commit,
dirty-checkout status and log/transaction-evidence digests. A dirty local run is
development evidence; CI supplies the clean-checkout run.

## Executable coverage

| Scenario | Evidence |
| --- | --- |
| EIP-7702 delegation designator and policy | `vm.signDelegation` + `vm.attachDelegation`, actual `0xef0100 || delegate` code and delegated execution, not `vm.etch` in the real-account cases |
| No ERC-1271 policy / policy denial | Underlying ECDSA key still authorizes all three Registry operations |
| Preapproved digest / empty signature | Authorized delegated policy accepts only its approved digest; other digests reject |
| Stale delegation | Foundry staged authorization refuses a changed nonce; separate local mined type-4 transaction proves stale authorization is skipped |
| Registry state constraints | Replayed transition, skipped sequence, wrong root and config-nonce replay reject with unchanged head/authorization/record snapshot |
| ECDSA encodings | High-s, invalid v, empty/64/65/66-byte invalid signatures; valid low-s control; all three operations |
| Real Safe threshold | Deployed SafeProxy + Safe 1.4.1 + CompatibilityFallbackHandler; 2-of-2 owner signatures accept; single/wrong-message signatures reject |
| Real Safe empty preapproval | A real Safe transaction delegatecalls SignMessageLib to mark the wrapped SafeMessage; relayed empty signatures then accept |
| Safe negative controls | `approveHash` alone does not set `signedMessages`; approving an unrelated digest does not authorize the target transition |
| AQ-03 and atomicity | Inherited malformed-return/fallback tests run against both exact Cancun Registry artifacts |

Safe empty approval is not an arbitrary raw Registry hash write. The handler uses
`SafeMessage(bytes message)` over `abi.encode(registryDigest)` and Safe's own
domain. The successful approval transaction requires both owners. No mock wallet
or direct storage cheat is substituted for that path.

## Actual type-4 transaction boundary

Foundry 1.7.1 stages a delegation at `attachDelegation`; it does not immediately
increment the authority nonce until a broadcast is processed. Therefore the
runner also launches a private ephemeral Anvil Prague node on an available
loopback port, sends actual signed type-4 transactions and records receipts.
It verifies the authority nonce increment, designator bytes, and that a stale
authorization cannot install a replacement delegate even if the outer transaction
succeeds. It then registers a Space and commits a transition using the delegated
EOA's ECDSA key against the real Registry artifact.

The node is terminated by the runner. Keys are public **test-only** values; no
external RPC, real funds, public deployment, or Sepolia wallet is used. This does
not claim a full client-consensus test or compatibility with every Safe version,
handler, delegation implementation, ERC-4337 bundler or gas policy.

## External adapters

EVM implementations can adapt the `_deploy` helper in the common cases. Non-EVM
clients should reproduce the same inputs, decisions and before/after state, not
copy reference-specific error selectors. Signature validation needs the specified
chain/block wallet state; offline hash replay alone cannot verify historical 1271
policy. Portable static signature-vector publication is a separate follow-up;
this package does not change or rename v1/v2 or the v1 wire format.
