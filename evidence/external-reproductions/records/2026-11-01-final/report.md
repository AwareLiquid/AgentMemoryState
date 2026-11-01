# ERC-8350 R-002 External Reproduction Report

- Result: **PASS**
- Generated: `2026-11-01T10:27:48.574Z`
- Manifest SHA-256: `9bc4a53fd6cc50bd4b362892301ef89072ef465fdbefd76836732b2fdf63af83`
- Runner SHA-256: `fe697781184593b38442195804b596c7366dff891df18ad18b424ca36e6334f9`
- External executable suites: 2
- Child-process environment: **ALLOWLISTED**
- Python isolated mode: **ENABLED**
- Dependency artifact hashes: **REQUIRED**

| Suite | Result | Pinned commit | Assertions | Observation |
|---|---|---|---:|---|
| erc8312-sepolia-state-replay | PASS | `a7e68b7b7c75` | 3/3 | 8 transitions / 3 Spaces / block 12040386 |
| invinoveritas-composition-recompute | PASS | `81a2e0f7898e` | 6/6 | 5 independent hash checks |

## Sources

- [erc8312-sepolia-state-replay](https://github.com/ERC8312/bounded-agent-actions/tree/a7e68b7b7c75a2274c089a97cd493be200fb151a/recompute) by 0x2kNJ; discussion: [Ethereum Magicians](https://ethereum-magicians.org/t/erc-8350-agent-memory-state-registry/29098/6)
- [invinoveritas-composition-recompute](https://github.com/babyblueviper1/invinoveritas/tree/81a2e0f7898e429d2d15ec421379f3446ae6869c/examples/erc8274-erc8350-composition) by babyblueviper1; discussion: [Ethereum Magicians](https://ethereum-magicians.org/t/erc-8350-agent-memory-state-registry/29098/13)

## Scope

Both pinned reproduction suites passed for this recorded observation. This is not a full independent client or security acceptance.
