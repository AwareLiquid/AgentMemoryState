# ERC-8350 v1 Conformance Result

- Result: **PASS**
- Recorded: `2026-10-28T12:08:07.941Z`
- Source commit: `b93c37da77dcb8dc2b42a9a518ba287998bd791b`
- Source tree: `36b4d00387e461cf9d20f4ad8239e28ea7faad81`
- Clean checkout observed: **yes**
- Vector SHA-256: `5e04cb9c1181222f483d3ad547e0a9aa301dfab74c7028f3cfa2e5dcd574fc20`
- Vector bytes: `3565`
- Tools: Node `v22.23.2`, pnpm `11.7.0`, Forge `forge Version: 1.7.1`

| Suite | Implementation | Result | Command |
|---|---|---:|---|
| `workspace` | clean pnpm/Foundry workspace | **PASS** | `pnpm check` |
| `core-ts` | @erc-awar/core | **PASS** | `pnpm --filter @erc-awar/core test:golden` |
| `minimal-ts` | @erc-awar/minimal-independent | **PASS** | `pnpm --filter @erc-awar/minimal-independent test:golden` |
| `solidity` | AgentMemoryStateRegistry.sol | **PASS** | `forge test --match-path test/unit/GoldenVector.t.sol -vv` |

## Canonical Outputs

| Field | Value |
|---|---|
| `experienceDeltaTypehash` | `0x4f020f86bc06d852f1fde17853b4d92a70214eeab8e09718028124af097d070d` |
| `memoryStateTypehash` | `0xf3148762556cbf851baf4b9a205e18ff4e6b366a58a3a1ef58e8626ba41beadb` |
| `memorySpaceTypehash` | `0x9ae5478f084ad3b841da58a9cb2354d153cddec59ee64d0cb741fa9d08884531` |
| `transitionId` | `0xdd00dd6eb3aec704b5455502647a0caacf23be6c724eda4a60d9645291e7f4e5` |
| `nextStateRoot` | `0x9684a8d3571c5cd9c1e3abb1b0c0797b9fef6965e9002aeefba91e8cb1163754` |
| `deltaCommitment` | `0x2cf1dc108cc32cfe1617db756a7c793f383b67165ea1bb542f456dc6100f967d` |
| `provenanceCommitment` | `0x4791ee5d37e8fc775d00f82c3d451e6d313aa5fe16dd94de5efdbbb39dc0f05c` |
| `locatorCommitment` | `0xc5ff571b8429eecd969f718fc45e45017c0d3a217dff401ad1cc752686bac812` |
| `spaceId` | `0xef5037465ae0323637cb58434eb554ae4a1fe1131bcc10888900f2d4cbe349d8` |
| `registrationId` | `0x7bea30aa6018c9c8a3e66bd9573377af482dc791994af8c50698e3fc9d4e5d64` |
| `authorizationId` | `0xa1fef7a8e52a533f7839f51962fa6e3ef9f8a8081efbac1eb13651801f4d1a92` |
| `domainSeparator` | `0xc8e1b4a128b4de377427c24ccea92cac6d7c77f8fe55f4b2984432bbc3b3d5b9` |
| `signingDigest` | `0xaa76377b6dc395d65e2c346a4ff3176bcbe3d27223e01b68be450f81f0f5f494` |

## Reproduce

```bash
pnpm conformance:clean
```
