# Independent External Security Review — ERC-8350 G4 Release Candidate

- **Candidate:** G4-rc1 (`audit/g4-rc1-source`)
- **Target commit:** `af5a75fb2db532fd5603554083d8895a825c2de2` (tree `f8d66277123391ea54de3f53842256e17e2a497e`)
- **Reviewer:** Besmubsa — independent, pseudonymous security researcher
- **Reviewer GitHub:** https://github.com/Besmubsa
- **Evidence repository (this repository):** https://github.com/Besmubsa/erc8350-g4-security-review
- **Review date:** 2026-10-24
- **Report file:** `reports/erc8350-g4-external-review.md` (this file)

## 1. Attestation and conflict disclosure

I am an independent external reviewer. I am **not** a maintainer or contributor of
AwareLiquid/ERC-8350 or AwareLiquid/AgentMemoryState, I have performed **no prior
paid or unpaid work** for AwareLiquid, and I have **no financial interest** in the
project. **No compensation** was requested, offered, or received for this review.
The reviewer identity is pseudonymous: all review work, tooling, and evidence
generation was performed through the public GitHub account `Besmubsa`, whose
commit history in this repository constitutes the work record.

This report was produced by a human-supervised review process in which static and
dynamic analysis tooling was executed and every scoped file was read in full;
the reviewer takes full responsibility for the conclusions below.

## 2. Executive summary

This review covers the ERC-8350 G4 release candidate: the reference
AgentMemoryStateRegistry (ExperienceDelta v1 linear state machine), the ECDSA and
PrivateCommitment libraries, the two normative interfaces, the three runtime
extensions (AuditGrant, DeletionAttestation, SpaceDescriptor), the deployment
script, and the build configuration — ten pinned files, 920 physical lines.

**Result: no Critical, High, or Medium findings.** Four Informational findings and
two verification notes are documented. All four Informational findings describe
interface-behavior or documentation concerns, not exploitable conditions. The
prior email review's LOW-1, LOW-2, INFO-1, and INFO-2 dispositions (recorded in
`audits/g4/external/REVIEW_INTAKE_2026-07-31.md`) were independently re-derived
and are **conurred with in full** (Section 7). The G4-R-012 mitigation (binding
audit grants to their origin Space) was verified complete at the frozen commit
(Section 8, V-01).

The authorization core is sound: EIP-712 digests are canonical and match an
independent re-implementation; sequence ordering (`sequence == head + 1`) makes
replay and reordering impossible; the existence sentinel
(`_transitions[transitionId].spaceId != 0`) cannot be forged because
`deriveSpaceId` cannot produce `bytes32(0)` for a registered Space; per-Space
`configNonce` strictly increments and is embedded in the signed struct; and the
ERC-1271-before-ECDSA fallback chain is correctly ordered with a documented and
deliberate residual key path for EIP-7702-delegated EOAs (G4-R-003).

## 3. Scope attestation

All ten in-scope files were extracted from the frozen commit and their SHA-256
digests were recomputed. **Every digest matches `audits/g4/scope.json` exactly.**

| # | Path | Kind | SHA-256 match |
|---|------|------|---------------|
| 1 | `contracts/src/ECDSA.sol` | library | MATCH |
| 2 | `contracts/src/interfaces/IAgentMemoryState.sol` | interface | MATCH |
| 3 | `contracts/src/interfaces/IERC1271.sol` | interface | MATCH |
| 4 | `contracts/src/reference/AgentMemoryStateRegistry.sol` | runtime | MATCH |
| 5 | `contracts/src/reference/PrivateCommitment.sol` | library | MATCH |
| 6 | `contracts/src/extensions/AuditGrant.sol` | runtime-extension | MATCH |
| 7 | `contracts/src/extensions/DeletionAttestation.sol` | runtime-extension | MATCH |
| 8 | `contracts/src/extensions/SpaceDescriptor.sol` | runtime-extension | MATCH |
| 9 | `contracts/script/Deploy.s.sol` | deployment | MATCH |
| 10 | `contracts/foundry.toml` | build-configuration | MATCH |

Manifest and residual-risk-register bytes were taken from branch
`security/g4-security-ready-rc` and hashed:

- `audits/g4/scope.json` → `c9db7d27957c86386d8842687a2d009c0ca03bc864307e88cfed0ee25f3ae9bf` — **matches pinned digest**
- `audits/g4/residual-risks.json` → `307a52eb0bf512aea25565bf604d92fc6b1b2d64eb910595568a5f0c04aa6019` — **matches pinned digest**

All ten files were read line-by-line in full (920 physical lines).

## 4. Methodology

### 4.1 Tools and versions

| Tool | Version | Use |
|------|---------|-----|
| solc | 0.8.24+commit.e11b9ed9 (official Linux static build) | compilation, optimizer 200 runs, EVM target cancun |
| slither 0.11.6 | 102 detectors | static analysis, per-target |
| py-evm / eth-tester | current release | bytecode execution of deployed Registry (domain functions, typehash getters) |
| Python 3.12 + pycryptodome | keccak-256 | independent golden-vector recomputation (no project code imported) |
| forge-std | v1.9.7 (pinned tarball) | build harness for `Deploy.s.sol` only |

### 4.2 Commands executed

```
# 1. Compilation of all runtime contracts (rc=0)
solc --bin --optimize --optimize-runs 200 --evm-version cancun \
     contracts/src/reference/AgentMemoryStateRegistry.sol \
     contracts/src/extensions/AuditGrant.sol \
     contracts/src/extensions/DeletionAttestation.sol \
     contracts/src/extensions/SpaceDescriptor.sol

# 2. Deployment-script build (import prefixes rewritten to a local pinned
#    forge-std v1.9.7 copy; contract code byte-identical) — rc=0
#    harness: evidence/DeployHarness.s.sol

# 3. Static analysis, per-target (JSON in evidence/slither/)
slither src/reference/AgentMemoryStateRegistry.sol --compile-force-framework solc --solc <solc> --json ...

# 4. Independent golden-vector recomputation, pure Python
python3 evidence/vector_recompute.py          # output: evidence/vector_recompute_output.txt

# 5. Real-EVM execution of the deployed Registry
python3 evidence/evm_domain_check.py          # output: evidence/evm_domain_output.txt
```

### 4.3 Verification results

- **Compilation:** all four runtime contracts and the deployment script compile
  cleanly under the pinned toolchain.
- **Golden vectors:** all ten vector assertions PASS in a from-scratch Python
  re-implementation (`deltaCommitment`, `transitionId`, `nextStateRoot`,
  `domainSeparator`, `signingDigest`, three typehashes, `registrationId`
  (which fixes `spaceId`), `authorizationId`).
- **Bytecode execution:** the compiled `AgentMemoryStateRegistry` was deployed on
  py-evm and `computeDomainSeparator(1, 0x4444…4444)` returned exactly the golden
  vector's `domainSeparator`; `EXPERIENCE_DELTA_TYPEHASH()` matched the vector's
  expected typehash.
- **Reviewer process note:** the reviewer's first re-implementation omitted the
  left-padding of the `address` ABI word and mismatched the vector; the
  discrepancy was resolved against real bytecode before any conclusion was
  drawn. This is documented as an example of the verification loop used
  throughout (claim → independent recompute → execution cross-check).

### 4.4 Limitations

- The project's own Foundry test suite was **not executed** (no Foundry toolchain
  in the review environment); the test sources under `contracts/test/` were read
  and their assertions assessed, but no runtime pass/fail evidence from them is
  claimed here.
- No symbolic execution or coverage-guided fuzzing was performed by the reviewer.
- `packages/` and `implementations/` (TypeScript) are out of scope per the
  manifest; `packages/core/src/eip712.ts` was nonetheless cross-checked against
  the Solidity domain logic and found equivalent.
- `contracts/src/experimental/MemoryMarket.sol` is excluded by the manifest and
  was not reviewed.
## 5. Architecture overview (as reviewed)

The core Registry maintains one `SpaceRecord` per `spaceId`. A Space is bound to
its first controller at registration: `spaceId = keccak(MemorySpace(initialController, salt))`,
and registration requires controller authorization over a struct hash that
includes the derived `spaceId`. Transitions form a strictly linear chain:
`commitTransition` requires `sequence == head + 1` and
`prevStateRoot == head stateRoot`; the new head is
`keccak(MemoryState(prevStateRoot, transitionId))` where
`transitionId = keccak(ExperienceDelta(...))` covers every Delta field. Three
optional extensions read the Registry immutably and gate writes on
`msg.sender == controllerOf(spaceId)` (AuditGrant additionally gates on
`msg.sender == auditor` for acknowledgement).

Authorization is resolved per-signer: direct call with empty signature (only when
`msg.sender == signer`), ERC-1271 staticcall for code-bearing signers, then
canonical 65-byte ECDSA with an EIP-2 low-s guard. The domain separator binds
name `"AgentMemoryState"`, version `"1"`, chain ID, and the Registry address.

## 6. Findings

Severity scheme: Critical / High / Medium / Low / Informational. Findings are
stable IDs; statuses are `open (informational, non-blocking)` unless noted.

### ERG4-I-01 — `AuditGrant.deriveGrantId` is not scoped to the deployment (Informational)

`deriveGrantId(spaceId, auditor, from, to) = keccak256(abi.encode(spaceId, auditor, fromSequence, toSequence))`
uses no chain ID, contract address, or salt. Grant IDs computed over identical
inputs are therefore identical across every deployment of `AuditGrant`. Within a
single deployment uniqueness holds (the `(spaceId, auditor, range)` triple is
guarded by `GrantExists` via the non-zero `witnessSetRoot` sentinel, and
`witnessSetRoot == 0` is rejected at input, so the sentinel cannot alias a
legitimate grant), and grant IDs never leave their deployment's mappings, so no
cross-deployment confusion is reachable in this system today. The concern is
forward-looking: third-party indexers or future contracts that persist grant IDs
without a deployment scope could mix records from two registries.

**Recommendation:** in the next standard revision, domain-separate the grant ID
derivation (fold in `address(this)`/chain ID, or document that grant IDs are
deployment-scoped identifiers). No source change is required for G4.

### ERG4-I-02 — ERC-1271 wallets can be probed with an empty signature by any caller (Informational)

In `_requireAuthorization`, when `msg.sender != signer` and the signer has code,
the ERC-1271 branch is attempted **before** the 65-byte length guard, so a
relayer can invoke the registry with `signature = 0x` and the Registry will call
`signer.isValidSignature(digest, "")`. Standard wallet implementations reject
empty signature data, but the Registry cannot assume that: a wallet whose
`isValidSignature` returns the magic value for empty data would let an
unauthenticated third party satisfy authorization for that signer. This is the
documented trade-off of delegating signature policy to the wallet (threat model:
"Contract-wallet spoofing"; residual G4-R-008 "External smart-account validation
defects"), and the direct-call branch is unaffected (it requires
`msg.sender == signer`). The register already carries the risk; this note pins
the concrete reachable path (empty signature bytes + code-bearing signer +
non-signer caller) for deployment-policy wording.

**Recommendation:** document in the deployment/selection guidance that
code-bearing controllers and authorizers must use wallets that reject
zero-length signature data, or additionally require
`signature.length >= 65` when `msg.sender != signer` in a future revision.

### ERG4-I-03 — `SpaceDescriptor.descriptorOf` does not revert for unknown or unpublished Spaces (Informational)

Write paths revert with `UnknownSpace` / `NoDescriptor`, but the read path
returns a zeroed struct (`uri: ""`, `contentHash: 0`, `updatedAt: 0`) for both
unregistered Spaces and registered-but-unpublished ones. This read/write
asymmetry is harmless on-chain but is an indexer/API trap: an empty return cannot
distinguish "Space does not exist" from "Space exists, no descriptor published".
`AuditGrant.grantOf`/`spaceOf` revert on unknown IDs, so conventions differ
across extensions.

**Recommendation:** document the empty-struct convention on the interface, or
align the read path with the write path in the next revision.

### ERG4-I-04 — `ECDSA.recover` uses the raw `v` byte without normalization (Informational)

The recovery passes `v` unmodified to `ecrecover` and requires exactly 65
signature bytes. Signatures with `v ∈ {0, 1}` (common output of some signing
libraries) or EIP-2098 compact form (64 bytes) revert with `InvalidSignature`
rather than being normalized/accepted. This is a deliberate minimal-dependency
choice, is fail-closed (no accepting path), and matches the documented
canonical-form interface expectation; it is recorded so integrators validate
their signing tooling against the golden-vector fixtures before deployment. An
invalid `v` yields a zero recovery address, which then reverts — concurring with
maintainer disposition INFO-1.

### ERG4-N-01 — Reentrancy posture of `commitTransition` (Verification note)

Authorization precedes all state writes; the ERC-1271 probe is a `staticcall`
whose static context propagates to any callback, so a malicious (or compromised)
wallet can neither write Registry state re-entrantly nor observe mid-transition
state — it can only revert (DoS against its own Space) or return the magic
value. The Registry performs no other external calls during state mutation.
This independently re-derives maintainer disposition LOW-2 (rejecting
"missing `nonReentrant`" as a Low finding); no exploit trace exists.

### ERG4-N-02 — Relayer front-running of signed intents (Verification note)

`registerSpace`, `updateSpaceAuthorization`, and `commitTransition` are callable
by anyone holding a valid signature. Front-running analysis: registration
front-run submits the controller's own intent (no advantage to the attacker);
rotation signatures embed the deterministic `configNonce + 1` and are consumed
exactly once; transition signatures are bound to the full `transitionId`, and a
sequence advance or the transition-existence check invalidates replays. No
griefing vector beyond executing the signed intent itself or wasting the
attacker's gas.

## 7. Concurrence with maintainer dispositions (intake 2026-07-31)

| Item | Maintainer disposition | Reviewer conclusion |
|------|------------------------|---------------------|
| LOW-1 (ERC-1271 → ECDSA fallback for 7702-delegated EOAs) | Accepted as deployment-policy clarification under G4-R-003 | **Concur.** The fallback ordering is explicit in NatSpec; the residual key path is a documented registry rule (ERG4-N/A; see G4-R-003 mapping) |
| LOW-2 (missing `nonReentrant`) | Not accepted; STATICCALL argument | **Concur.** Independently re-derived as ERG4-N-01 |
| INFO-1 (no explicit `v` branch) | Accepted as Informational | **Concur** (ERG4-I-04 records the fail-closed behavior) |
| INFO-2 (sequence continuity) | Not accepted; `sequence == head + 1` induction | **Concur.** Every sequence 1..head exists by induction; `AuditGrant.grant` additionally requires `1 <= from <= to <= head` |

The intake letter also requires confirming the reviewed API surface: this report
was written against the frozen commit's actual API — `registerSpace`,
`updateSpaceAuthorization`, `commitTransition`, `head`, `spaceAuthorization`,
`transition`, `hashExperienceDelta`, `computeNextStateRoot`, `deriveSpaceId`,
`computeDomainSeparator`, `computeSigningDigest`, `signingDigest`, and extension
functions `grant`/`acknowledge`/`revoke`/`attest`/`publish`/`clear` — not the
non-existent names (`grantAudit`, `acknowledgeAudit`, `revokeAudit`,
`getSpaceInfo`) cited in the superseded email review.

## 8. Residual-risk register mapping

| ID | Title | Severity | Reviewer assessment |
|----|-------|----------|---------------------|
| G4-R-001 | Controller compromise / irreversible rotation | medium | **Reviewed, agree.** One-step rotation confirmed in `updateSpaceAuthorization`; multisig recommendation is appropriate |
| G4-R-002 | Compromised/permissive transition authorizer | medium | **Reviewed, agree.** Authorizer can append arbitrary valid-looking states; registry proves authorization and ordering only |
| G4-R-003 | EIP-7702 fallback preserves key path | medium | **Reviewed, agree.** Fallback chain verified (NatSpec lines 290–306 of the Registry); delegate policy is not exclusive |
| G4-R-004 | Relayer censorship/delay | low | **Reviewed, agree.** ERG4-N-02 covers the remaining relayer surface |
| G4-R-005 | Metadata leakage / weak commitment secrets | medium | **Reviewed, agree.** On-chain surface exposes commitments, timings, profile IDs only; `PrivateCommitment` salts are caller-supplied |
| G4-R-006 | Witness/locator unavailability | medium | **Reviewed, agree.** No data-availability claims anywhere in scope |
| G4-R-007 | Fork replay before finality | low | **Reviewed, agree.** Domain binds chain ID + address; fork-window caveat stands |
| G4-R-008 | External smart-account validation defects | medium | **Reviewed, agree.** ERG4-I-02 pins the concrete empty-signature path |
| G4-R-009 | Wrappers/proxies change semantics | medium | **Reviewed, agree.** Reference Registry is non-upgradeable; `Deploy.s.sol` deploys plain contracts |
| G4-R-010 | Public extension metadata | low | **Reviewed, agree.** Descriptor/attestation/acknowledgement timing is public by construction |
| G4-R-011 | Limited claims of attestations | low | **Reviewed, agree.** NatSpec "what a grant does NOT prove" is accurate |
| G4-R-012 | Legacy Sepolia AuditGrant cross-Space flaw | high (mitigated) | **Mitigation verified complete at `af5a75f`** — see V-01 |

### V-01 — G4-R-012 mitigation verification

Commit `af5a75f` ("fix(security): bind audit grants to origin space") is the
fix commit. Verified properties at the frozen commit:

1. `deriveGrantId` includes `spaceId`, so a grant ID cannot denote grants in two
   different Spaces.
2. `acknowledge` and `revoke` both resolve the grant through
   `_grantForSpace(spaceId, grantId)`, which reverts with `WrongSpace` unless
   `spaceId == _grantSpaces[grantId]`.
3. `revoke` authorizes via `_controllerOf(spaceId)` — the controller of the
   grant's **origin** Space; a controller of any other Space receives
   `WrongSpace` before any authorization logic.
4. `acknowledge` authorizes via `g.auditor` after the Space binding, so an
   auditor cannot misattribute an acknowledgement to a different Space.

The legacy Sepolia deployment remains a live instance of the flaw (register's
"mitigated" status is correct: source fixed, old deployment unaffected by source
changes).

## 9. Slither triage (0.11.6, 102 detectors)

| Detector | Impact | Count | Triage |
|----------|--------|-------|--------|
| `assembly` | Informational | 1 | ECDSA calldata word slicing — reviewed by hand, correct |
| `low-level-calls` | Informational | 1 | ERC-1271 `staticcall` — required; return-data checked (`success` + length + magic) |
| `timestamp` | Low | 1 | `block.timestamp` in `AuditGrant.grantedAt/acknowledgedAt` — ordering metadata only, no state branch on time |
| `incorrect-equality` | Medium | 1 | `witnessSetRoot == bytes32(0)` existence sentinel — by design; `0` rejected at input (false positive) |
| `unused-return` | Medium | 5 | Tuple destructuring of `registry.head/spaceAuthorization/transition` where only some fields are used — deliberate (false positive) |

No detector output corresponds to a reachable defect.

## 10. Conclusion

- Unresolved Critical: **0**; High: **0**; Medium: **0**; Low: **0**;
  Informational: **4** (ERG4-I-01…I-04, all non-blocking, documentation or
  forward-compatibility oriented).
- Scope attestation: 10/10 file digests match; manifest and register digests
  match their pinned values.
- The G4 acceptance criterion "no unresolved Critical or High" is satisfied for
  the reviewed commit from the reviewer's side.

This report is the reviewer's complete work product for candidate G4-rc1 at
commit `af5a75fb2db532fd5603554083d8895a825c2de2`. Any source change voids it
per the register's `reviewRequiredAfterSourceChange` policy.
