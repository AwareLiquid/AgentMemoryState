# R-002: Independent Reproduction Evidence

Status: upstream replay correction pinned on **2026-11-01**. See the dated
two-suite record below for the observed result; this is not a permanent guarantee
that future RPC/fork changes cannot break replay.

This status is intentionally narrower than "independent implementation" or
"security audit." Two externally maintained repositories now contain executable,
commit-pinned ERC-8350 recomputations, and both pass from clean checkouts. No
complete third-party client currently implements the entire registry interface and
passes every field in `test-vectors/v1.json`.

## Acceptance criteria

R-002 is resolved only when the evidence:

1. is authored and hosted outside the `AwareLiquid` GitHub namespace;
2. pins a full external commit SHA and every executed source-file digest;
3. pins every Python dependency by exact version and allowed artifact SHA-256;
4. uses at least two external repository owners;
5. does not import code from this repository;
6. exits nonzero on a mismatch;
7. can be executed from a clean external checkout; and
8. records machine-readable results, logs, environment versions, and live-chain
   observation data where applicable.

The canonical source list is
[`evidence/external-reproductions/v1.json`](../../evidence/external-reproductions/v1.json).

## Evidence

| Evidence | External maintainer | What is independently recomputed | Pinned source |
|---|---|---|---|
| Sepolia state replay | `blockbird` / `0x2kNJ`, hosted by `ERC8312` | Every emitted `transitionId`, every `nextStateRoot`, gapless sequence/root linkage, storage-proven heads, block header, and a second-RPC cross-check | [`a7e68b7b7c75`](https://github.com/ERC8312/bounded-agent-actions/tree/a7e68b7b7c75a2274c089a97cd493be200fb151a/recompute) |
| ERC-8274 composition | `babyblueviper1`, hosted by `babyblueviper1` | `provenanceCommitment`, `transitionId`, `nextStateRoot`, provenance bytes digest, and cross-standard event agreement | [`81a2e0f7898e`](https://github.com/babyblueviper1/invinoveritas/tree/81a2e0f7898e429d2d15ec421379f3446ae6869c/examples/erc8274-erc8350-composition) |
| Specification recompute | `babyblueviper1` on Ethereum Magicians | Three typehashes and the EIP-712 domain separator from specification text | [Public review](https://ethereum-magicians.org/t/erc-8350-agent-memory-state-registry/29098/2) |

The first two rows are executable suites. The third is a public reviewer
attestation and is recorded separately because it has no published executable
artifact.

## Reproduce

Requirements are Git, Node.js 22 or later, Python 3.12 or later, and network
access to GitHub, PyPI, and two Sepolia RPC endpoints.

```bash
pnpm evidence:validate
node scripts/external-reproduction-gate.mjs
```

The runner:

1. creates fresh temporary Git repositories;
2. fetches only the pinned external commits;
3. verifies every declared source SHA-256;
4. creates isolated Python virtual environments;
5. installs exact Python dependency versions from SHA-256 allowlisted artifacts;
6. executes both external verifiers with Python isolated mode and an allowlisted
   child-process environment; and
7. writes `report.json`, `report.md`, and per-suite logs under
   `artifacts/external-reproductions/`.

Private RPC endpoints may be supplied without committing them:

```bash
ERC8350_PRIMARY_RPC=... \
ERC8350_CROSSCHECK_RPC=... \
node scripts/external-reproduction-gate.mjs
```

Reports retain only endpoint hostnames and redact complete RPC URLs from logs.
The external verifier receives the selected RPC URLs as command-line arguments.
Use public or narrowly scoped read-only endpoints; credentials embedded in an RPC
URL are necessarily visible to the external verifier.

The pull-request, scheduled, and manual
[`external-reproduction.yml`](../../.github/workflows/external-reproduction.yml)
workflow publishes the same files as a GitHub Actions artifact.
Scheduled/manual runs on the default branch also open or update one regression
issue on failure and close it on recovery. Only the notification job has
`issues: write`; it checks out and executes no project/PR code. PR runs do not
receive this permission or publish notifications. Cancelled/skipped runs do not
claim recovery.

## Recorded result

The current upstream-pin run is
[`2026-11-01-final/report.md`](../../evidence/external-reproductions/records/2026-11-01-final/report.md).
Its JSON records the scan start, observation block/hash/root, source and dependency
digests, RPC hostnames and per-suite log hashes. The log scan starts at deployment
block `11353452` and ends at the live observation block selected by the verifier;
no historical pre-fork observation block is forced to bypass the regression.

### October regression and resolution

The old replay omitted `blockAccessListHash` and `slotNumber` after `requestsHash`.
These fields are described by [EIP-7928](https://eips.ethereum.org/EIPS/eip-7928)
and [EIP-7843](https://eips.ethereum.org/EIPS/eip-7843); their order matches the
[Geth header definition](https://github.com/ethereum/go-ethereum/blob/master/core/types/block.go).
The upstream maintainer independently reconstructed Sepolia block `12018659`
and confirmed the order in the
[PR #2 review timeline](https://github.com/ERC8312/bounded-agent-actions/pull/2).
The merged upstream also paginates logs, rejects invalid scan bounds, and fixes
the observation ceiling before collecting events. This is a source change, not
merely a repository-owner change from the temporary maintainer fork.

Header hashing, MPT verification, second-RPC agreement and nonzero failure exits
remain enabled. Upstream source digest:
`ea5a484309c21649a632df61b6910e87897df07f991dceada86673dffb25a521`.
The historical October failure reports are deliberately retained unchanged.
Their old unconditional `conclusion` text is superseded by their actual FAIL
status and exit codes; the current runner derives the conclusion from the result.

The committed 2026-07-31 run is
[`evidence/external-reproductions/records/2026-07-31/report.md`](../../evidence/external-reproductions/records/2026-07-31/report.md).
It observed seven transitions across three Memory Spaces. Every transition and
stored head recomputed successfully, the observation block matched a second RPC,
and all five saved-artifact composition checks passed.

## Residual work

The narrow replay regression (#29) and upstream-repin task (#31) can close when
this change merges with successful evidence. The following remain separate gates:

- a complete implementation maintained by another organization that consumes
  `test-vectors/v1.json` directly;
- an external Solidity security audit;
- a second log source capable of detecting whole-Space omission; and
- long-term maintenance of the external implementations.

These residual items must not be presented as complete merely because R-002 is
resolved.
