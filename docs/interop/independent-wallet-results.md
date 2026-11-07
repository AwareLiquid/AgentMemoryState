# Scoped independent wallet execution evidence

Ted (@haot3x) published a separate wallet client in
[agent-economy-contributions](https://github.com/haot3x/agent-economy-contributions/tree/b4ba24169e63ede14eb2f11f8115ff058845aa55/erc-8350)
and reported it in [issue #21](https://github.com/AwareLiquid/AgentMemoryState/issues/21#issuecomment-6706777373).
The contributor describes independently written signing and transaction tests,
after reading the official specification and maintainer handoff. No project SDK
or test harness is imported. This is contributor-declared provenance, not an
identity audit. Our wrapper, verification and archive are maintainer work, not
another independently authored implementation.

The Registry being tested is the **official reference**, not a new Registry
implementation. This evidence adds selected external account execution coverage;
it does not close the entire second-implementation request or satisfy G4.

## Exact inputs and reproduction

- External client: `b4ba24169e63ede14eb2f11f8115ff058845aa55`.
- Official source: `8b11215cf267f710b49ea003384e678bcf953eae`, baseline 3.
- Safe 1.4.1: `bf943f80fec5ac647159d26161446ac5d716a294`.
- Node 24 (our wrapper CI pins 24.11.0), Foundry 1.7.1, ethers 6.17.0.
- Solidity 0.8.24, Cancun compilation, optimizer 200; local Prague execution.

From a clean consumer checkout with Node 24, npm, Git, forge and anvil on PATH:

```bash
node --test scripts/independent-wallet-gate.test.mjs
node scripts/independent-wallet-gate.mjs --output artifacts/independent-wallet/new-run
```

Use a new output directory on each run. The wrapper creates a fresh external
checkout and isolated HOME, strips inherited credentials/configuration, verifies
source and lockfile SHA-256 values, and independently fetches the official files
to confirm vendored bytes. It runs the contributor's unchanged commands:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm test
```

The upstream runner fetches and validates clean pinned Safe sources, starts its
own loopback Anvil node, uses public test keys, and stops the node on exit. No
public RPC endpoint, private key, account balance or live deployment is required.
The workflow has read-only permissions and no issue-writing or publishing step.

The [manifest](../../evidence/independent-wallet/v1.json) binds exact source files,
all 35 named outcomes, expected toolchain and Registry creation-bytecode string
digest. The wrapper also requires 188 unique mined receipts: 131 successful and
57 intentionally reverted, with no persisted logs on reverted receipts. The
unchanged pinned runner explicitly asserts `receipt.type === 4` before
serialization, in the required named 7702 installation case. ethers receipt JSON
omits that field, so the archive alone cannot re-check the transaction envelope
type; that claim relies on the pinned executable assertion and its successful
execution. These are **not 57 failed tests**.

Original native reports and logs are retained without normalizing timestamps,
block hashes or transaction hashes. Reproducibility concerns named outcomes,
source/build digests and receipt invariants, not identical local transaction IDs.
Acceptance records include consumer commit, clean status, commands, local block
range and SHA-256 of every archived artifact. Failures are retained separately.

## Coverage mapped to authorization decisions

The mapping below refers to [the baseline-3 decision table](../spec-baseline/AUTHORIZATION.md).
It is selected execution evidence, not proof that every input in a row is covered.

| Rows / boundary | External execution evidence | Limit |
| --- | --- | --- |
| A-02 | Nonempty invalid self-call rejected in all three operations | Not every self-call policy |
| A-03, A-05 | Original empty/short bytes, digest-specific wallet approval, canonical first word with trailing bytes | Test policies and pinned Safe only; not every signature length |
| A-06, A-10, A-11 | Wrong magic, revert, short return and dirty padding reject other keys but permit the same valid retained key | Real locally installed 7702 delegation; no production account claim |
| A-07, A-08, A-09 (selected) | Ordinary contracts cannot authorize with malformed policy responses; correct/wrong EOA recovery and domain/replay rejection | Not a replacement for the 46-case ECDSA vector suite |
| Required-account roles | Register, append and rotate tested; transition authorizer cannot rotate controller | No full second Registry implementation |
| Safe policy | 2-of-2 threshold and correct signed-message approval; wrong message, one signer and unapproved empty bytes rejected | Safe 1.4.1 only |
| Atomicity | Rejected mined calls check unchanged head, authorization and candidate record where applicable; no persisted logs | Assertions are in the pinned runner, not inferable from receipts alone |
| Wallet-state dependence | Approval revoked between successful simulation and mined execution causes rejection | Not historical/archive-state verification |
| AQ-03 negative control | Historical bytes4 decoder expression breaks retained-key fallback on dirty padding | Single-line mutation plus renaming, not a historical deployment reproduction |

Not independently added here: exhaustive A-01 direct-empty capabilities, A-12
gas exhaustion/liveness, all wallet versions, ERC-4337 bundlers, historical
execution state, production deployments or a separately implemented Registry.
The earlier Python hash/state/EOA results retain their own historical pins.

## Comment correction and release boundary

The Safe relayed-empty cases exposed a stale interface NatSpec comment. The
contributor submitted [official #2151](https://github.com/ethereum/ERCs/pull/2151).
An ERC author approved its comment-only diff at `1a7b9cc0`; it merged on
2026-11-07 as `47c7f884eb12e110d915b20f7cf0e8077542158b`. No tests here claim to
execute that revision: the historical run remains pinned to `8b11215`. The diff
changes NatSpec only, not runtime authorization logic. Future source-digest
synchronization must preserve these historical pins.

Full-scope #21 acceptance remains open for explicit coverage reconciliation.
External current-runtime audit acceptance (#11/#22), G4 and production readiness
remain separate. Neither the contributor's CI nor our successful reproduction
automatically advances the official ERC status.
