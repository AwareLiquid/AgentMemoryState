# Frozen review target versus implementation baseline

- Reviewed target: `af5a75fb2db532fd5603554083d8895a825c2de2`
- Implementation baseline: `37b2e416f57305b6d38953bb6af351ee487c581a`
- Assessment: maintainer source comparison, not an independent audit addendum.

Use a two-endpoint diff, not GitHub's merge-base comparison: the histories
diverge, so a three-dot comparison also shows changes already in the audit target.

```bash
git diff af5a75fb2db532fd5603554083d8895a825c2de2 37b2e416f57305b6d38953bb6af351ee487c581a -- contracts/src contracts/script/Deploy.s.sol contracts/foundry.toml test-vectors/v1.json
```

| Frozen path | Difference | Interpretation and action |
|---|---|---|
| `contracts/src/interfaces/IAgentMemoryState.sol` | Four NatSpec comments identify optional convenience methods | No signature change in source; includes source metadata changes, so do not claim byte-identical deployment without build comparison |
| `contracts/foundry.toml` | ERC asset remapping and allow path; read permission formatting/comment | Compiler, optimizer and EVM target unchanged, but build/import configuration is in scope and needs addendum review |
| `test-vectors/v1.json` (supporting evidence) | Two type strings and explicit new controller/authorizer fields | Existing expected values unchanged; rerun all implementations on this exact expanded file |

The other eight in-scope files and the three pinned Solidity test files have
identical Git blobs at these two endpoints. In particular, the Registry,
AuditGrant, ECDSA, PrivateCommitment, DeletionAttestation, SpaceDescriptor and
deployment script source bytes have not changed. This does not cover SDK,
product, storage, official ERC asset copies or all newer tests.

## Release boundary

Keep the original source/evidence tags, manifest and risk register untouched.
The original review remains evidence about the original target. The current
gate reports HEAD drift but allows a frozen-target pass; that is NOT current
release coverage. Before tagging a different candidate, freeze that candidate,
obtain an external review/addendum of the changed scope and update the release
evidence coherently. Do not move the original tag or simply replace hashes.

Additional docs and tests in the intake follow-up do not change frozen source.
Tests prove the current implementation behavior; they do not extend the external
reviewer's scope or silently turn the current release into G4-rc1.
