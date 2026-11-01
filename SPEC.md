# Agent Memory State v1 implementation overview

Status: informative overview accompanying the published ERC-8350 Draft.

The [official Draft](https://github.com/ethereum/ERCs/blob/b9651bc84714e87e6361f4f6c0c8ff39cc265d0a/ERCS/erc-8350.md)
is the normative authority. [`erc/erc-8350.md`](erc/erc-8350.md) is its byte-identical
local mirror. This overview is not a second specification and does not override
either the official rules or their unresolved ambiguities.

Start with [spec-baseline-1](docs/spec-baseline/README.md) for source pins,
[differences](docs/spec-baseline/DIFFERENCES.md), the
[authorization decision table](docs/spec-baseline/AUTHORIZATION.md) and
[open questions](docs/spec-baseline/OPEN_QUESTIONS.md). Proposed clarifications
are not upstream-approved changes. Historical pre-ERC wording remains in Git.

## Scope

Agent Memory State v1 defines an authorized, append-only state accumulator for
private agent memory transitions. It standardizes commitments and state changes,
not raw memory storage or a product taxonomy.

```text
private memory operation
  -> privacy-preserving delta commitment
  -> authorized ExperienceDelta v1
  -> transitionId
  -> nextStateRoot
```

## Delta summary

```solidity
struct ExperienceDelta {
    bytes32 spaceId;
    uint64 sequence;
    bytes32 prevStateRoot;
    bytes32 deltaCommitment;
    bytes32 provenanceCommitment;
    bytes32 profileId;
    bytes32 locatorCommitment;
}
```

No additional field participates in `transitionId`. In particular, v1 has no
author field, timestamp, raw URI, memory enum, `previousDelta`, or separate input
and inference fields.

## Canonical hashes

```text
EXPERIENCE_DELTA_TYPE =
"ExperienceDelta(bytes32 spaceId,uint64 sequence,bytes32 prevStateRoot,bytes32 deltaCommitment,bytes32 provenanceCommitment,bytes32 profileId,bytes32 locatorCommitment)"

transitionId = keccak256(abi.encode(
  keccak256(bytes(EXPERIENCE_DELTA_TYPE)),
  spaceId,
  sequence,
  prevStateRoot,
  deltaCommitment,
  provenanceCommitment,
  profileId,
  locatorCommitment
))

MEMORY_STATE_TYPE =
"MemoryState(bytes32 prevStateRoot,bytes32 transitionId)"

nextStateRoot = keccak256(abi.encode(
  keccak256(bytes(MEMORY_STATE_TYPE)),
  prevStateRoot,
  transitionId
))
```

JCS is not used to calculate a transition identifier. JSON sequence values are
decimal strings so the full `uint64` range can be represented losslessly.

## Space lifecycle

### Derivation

```text
MEMORY_SPACE_TYPE = "MemorySpace(address initialController,bytes32 salt)"
spaceId = keccak256(abi.encode(
  keccak256(bytes(MEMORY_SPACE_TYPE)),
  initialController,
  salt
))
```

This makes a namespace claim cryptographically specific to its initial controller.

### Registration

A Space is registered once with a non-zero controller and authorizer. The
controller authorizes:

```text
SpaceRegistration(bytes32 spaceId,address controller,address authorizer)
```

### Rotation

The controller can atomically rotate controller and authorizer by authorizing:

```text
SpaceAuthorization(bytes32 spaceId,address newController,address newAuthorizer,uint64 nonce)
```

The nonce begins at zero and each update signs the next nonce.

### Transition

The Registry accepts a Delta only when:

1. its Space exists;
2. `deltaCommitment` and `profileId` are non-zero;
3. `sequence == head.sequence + 1`;
4. `prevStateRoot == head.stateRoot`; and
5. the configured authorizer approves the EIP-712 digest.

The Registry calculates the Transition ID and next state root atomically.

## Authorization

The EIP-712 domain is fixed to:

```text
name = "AgentMemoryState"
version = "1"
chainId = current chain
verifyingContract = Registry
```

The reference checks, in order: an enabled direct-call exemption for the exact
required account with empty bytes; ERC-1271 when the account has code; then
canonical 65-byte non-malleable ECDSA using the same bytes. All three operations
enable the optional direct-empty capability. Non-empty bytes are validated even
when the caller is the required account. Registration/rotation require the
controller; a transition requires the authorizer. Relayers gain no authority.

ERC-1271 can approve custom-length or empty bytes; the 65-byte restriction is
recovery-only. The official empty/length wording still needs the clarification
tracked as AQ-01. A 7702 delegate rejecting a signature does not veto the
retained ECDSA key path. Gas starvation can deny either path; it does not create
authorization. See the decision table for malformed returns and other boundaries.

## Enforcing logic and references

The official Draft requires that the deployed logic enforcing sequence, root
and signature rules cannot be replaced by an upgrade authority. Source
verification and empty proxy slots alone do not establish that property.
Extensions and a configured wallet's own policy have separate trust boundaries.

A transition reference identifies chain and Registry as well as Space and
Transition ID. The content identifiers omit chain and Registry, while signatures
bind both through the EIP-712 domain. Cross-chain identity does not establish a
single cross-chain history.

## Privacy commitments

The SDK implements domain-separated commitments for delta payloads, provenance,
and locators. A low-entropy plaintext payload must be encrypted or committed with
a secret salt. A public salt alone does not stop targeted guessing.

`profileId` identifies application semantics. The core does not impose text,
embedding, policy, latent, or other memory categories.

## Layering

| Layer | Contents |
|---|---|
| Core | Delta, hashes, state roots, Space authorization, EOA/EIP-1271 signatures |
| Extensions | Deletion attestations and other optional records |
| Experimental | Market, REC, cognition-asset mechanisms |
| Adapters | Awareness and other memory-engine mappings |

## Conformance evidence

Report evidence in layers rather than equating a passing file with full
conformance to the Draft:

1. v1: byte-level identifiers, commitments, type hashes and signing digests across
   Solidity, core TypeScript and dependency-isolated TypeScript.
2. v2: five linked transitions and twelve reference rejection cases. The TS
   runner recomputes values and error selectors; Solidity executes the rejections.
3. Authorization: executable registration/rotation/transition tests, ECDSA,
   ERC-1271, direct-call capability and real 7702 behavior with stated coverage.
4. Deployment: code identity and immutable enforcing logic, separately evidenced.

Exact custom errors and multi-invalid-input precedence in the reference are not
automatically normative ERC requirements. Tests do not supersede the official
text; discrepancies belong in the baseline register. The project maintains all
three in-repository implementations, so they are not external independence.

## Non-goals

v1 does not standardize identity registries, inference proofs, input provenance
formats, storage availability, retrieval, merge algorithms, cross-chain
migration, deletion guarantees, licensing, payments, tokenization, or
consciousness claims.

## Migration

Prototype records are not wire-compatible. A migration creates a new v1 Space
and commits a genesis payload that binds the old export/root and migration tool.
No old ID is silently reinterpreted as a v1 Transition ID.

## Release criteria

- clean checkout installs with a frozen lockfile;
- TypeScript build, typecheck, and tests pass;
- Solidity formatting, unit tests, fuzz tests, and invariants pass;
- all implementations pass the Golden Vector;
- an external security review is complete before production deployment; and
- a separately maintained implementation exists before claiming broad adoption.
