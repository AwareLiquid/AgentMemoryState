# Scoped independent Python client acceptance

The [contributor's report](https://github.com/AwareLiquid/AgentMemoryState/issues/21#issuecomment-6562858801)
identifies an independent Python client in ERC8312/bounded-agent-actions at
`95ca613bac0d7ef9192f32264f1f315d869d5ce2`. Its source is CC0-1.0 and imports no
AgentMemoryState package. Independence is the contributor's provenance declaration,
not a maintainer identity audit. Our runner and adapters remain maintainer work.

## Reproduction

Requirements: Node 22+, Python 3.12+, Git, Foundry 1.7.1, GitHub/PyPI access.

```bash
pnpm evidence:client
```

The runner creates a fresh detached checkout and isolated venv, checks all four
Python source digests, installs PyCryptodome 3.23.0 with the existing wheel hash
allowlist, and strips inherited secrets, Python import paths and offline bypasses.
The client fetches and verifies the pinned official Draft and v1/v2/fixture inputs.
The gate requires all six layer counts, 41 unit tests with **zero skips**, cast
availability, and the exact 46-case export SHA-256. It preserves logs and a fail
record when an execution fails; use a new output directory for every run.

The gate requires a clean consumer checkout as well as clean external source.
The acceptance record binds the runner, manifest, consumer commit/clean status,
external commit, tool versions, commands, per-layer results and artifact digests.
Recorded runs live in `evidence/independent-client/records/`. CI publishes fresh
artifacts, with a scheduled default-branch check and a separate trusted failure
notification job. PR code never receives issue-write permission.

### Recorded maintainer reproduction: 2026-11-06

The [acceptance record](../../evidence/independent-client/records/2026-11-06/acceptance.json)
reports PASS from clean consumer commit `947af24020355c1e7bc6fac1c1b27809a4798cff`.
All six layers below passed, and all 41 upstream unit tests ran with zero skips,
including the cast cross-check. Node 22.23.2, Python 3.12.14, PyCryptodome 3.23.0
and Foundry 1.7.1 were used. The source, native JSON reports, exact signature export,
commands and log digests are bound by the record. The record's manifest is archived
alongside it; automated tests verify every archived artifact digest.
This offline fixture run has no new live RPC observation or block range claim.

| Layer | Expected checks | Accepted scope |
| --- | ---: | --- |
| spec | 21 | Selected Draft declarations; not a full formal specification check |
| hash | 59 | v1/v2 hashes, encoding, commitments and signing digests |
| fixture | 58 | Offline fixture and five-transition chain |
| state | 34 | Held-state rejection/atomicity model |
| ecdsa | 55 | EOA/direct-empty operations and canonical signatures |
| compat | 28 | Reference error labels, separate from normative outcomes |

The upstream [CI repair PR](https://github.com/ERC8312/bounded-agent-actions/pull/3)
requires cast inside the Python job. Our gate independently requires it now;
the evidence stays pinned to the original client commit, not the CI-only patch.
This adds a scoped implementation, not another independent repository owner.
The old two-suite live replay gate and its historical records remain unchanged.

## Remaining acceptance work

Issue #21 remains open. Unsupported does not mean failed, and maintainer-written
extensions to this client cannot be counted as newly independent evidence.

| Task | Owner | Output and acceptance |
| --- | --- | --- |
| External wallet client | Operations | Separate scoped contribution delivered by @haot3x; no maintenance commitment presumed |
| ERC-1271, Safe and EIP-7702 | Technical | Selected paths now have [external wallet execution evidence](independent-wallet-results.md); this does not add those paths to the Python client |
| Independent account evidence | Operations | Pinned external source, native reports and maintainer reproduction; reconcile remaining rows without claiming a second Registry |
| Full-scope acceptance | Technical | Compare normative outcomes separately from error selectors; rejects leave head, authorization and transition records unchanged |

The existing [58 real-account cases](account-conformance.md) are a maintainer
handoff, not proof that this Python client implements them. AQ-01/AQ-02 wording
merged in official #2147; the Python results above keep their historical inputs.
Neither this result nor upstream CI green is
G4 security acceptance, a fresh deployment audit, or production readiness.
