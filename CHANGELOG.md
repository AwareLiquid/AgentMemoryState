# Changelog

All notable implementation and protocol changes are recorded here.

## Unreleased

### Added

- Pinned official authorization-candidate gate and CI: verifies proposed upstream
  bytes, runs 38 authorization/signature tests, and requires two dirty-padding
  failures against the historical official source as a negative control. Review
  packet links merged scoped-client, signature and account evidence without
  replacing historical official baselines or granting G4 acceptance.

- Separate Prague real-account conformance harness with pinned Safe 1.4.1,
  2-of-2 signatures and real SignMessageLib approval; actual local Anvil type-4
  transactions verify delegation nonce/stale-authority behavior. Registry bytecode
  remains the independently built 0.8.24/Cancun artifact. CI publishes receipts/logs.
- Independent-client handoff and Draft-to-Review preparation with explicit open
  questions; neither constitutes an external implementation or audit acceptance.

- `spec-baseline-2` pins the AQ-03 runtime revision while preserving the original
  `spec-baseline-1.json` bytes and official Draft text. Audit delta is explicit.

- Specification baseline `spec-baseline-1`: pinned official Draft, implementation,
  build settings and v1/v2 vectors; source-difference register, three-operation
  authorization table, proposed clarifications and scoped open questions.
- Offline baseline drift gate and adversarial tests in `pnpm check`, with optional
  pinned-upstream verification; focused authorization characterization tests.
  These do not establish independent implementation or external audit acceptance.
- Reproducible private-witness evidence for a two-transition `TOOL_TRACE`
  scenario: deterministic public commitments, a sequence-2-only auditor bundle,
  privacy-boundary assertions, and a Foundry integration test covering relayed
  EIP-712 authorization, selective `AuditGrant`, tamper rejection, and auditor
  acknowledgement.
- Provisional external-review intake and reviewer follow-up for G4, plus focused
  regression tests proving ERC-1271 `STATICCALL` blocks state-changing callbacks
  and invalid ECDSA `v` values are rejected.
- G4 security-ready RC preparation: a commit- and SHA-256-pinned Solidity audit
  scope, internal review record, canonical residual-risk register, external-review
  request/template, evidence-integrity workflow, and an adversarially tested gate.
  `security:scope` validates preparation; `security:rc` additionally requires a
  real independent report and blocks release until one is accepted.
- Clean-checkout conformance gate with separate Solidity, core TypeScript, and
  dependency-isolated TypeScript Golden Vector suites. Each run records the
  source commit/tree, vector SHA-256, tool versions, canonical outputs, suite
  results, and logs as JSON and Markdown.
- R-002 independent reproduction evidence: a machine-readable manifest, isolated
  clean-checkout runner, pull-request/manual/scheduled GitHub Actions workflow,
  hash-pinned runtime dependencies, and recorded results for two externally
  maintained, commit-pinned implementations.
- Whitepaper as a narrative companion to the ERC, following the Ethereum
  whitepaper structure (state transition systems → memory as state → protocol →
  applications → concerns → conclusion) and closing with an Open Questions
  section for the Ethereum Magicians discussion:
  `docs/whitepaper.md` (English), `docs/whitepaper.zh.md` (Chinese), plus
  `docs/whitepaper.pdf` and single-file `docs/whitepaper.html` renderings.
- ADR-0005: three metadata layers (Core / Disclosure / private witness) and the
  auditability model. Core is unchanged; disclosure is opt-in per Space.
- `SpaceDescriptor` extension: optional controller-published description of what a
  Space is, including the profile vocabulary needed to interpret its `profileId`.
- `AuditGrant` extension: binds a selective disclosure to the complete ordered witness
  set for a sequence range, so a cherry-picked or incomplete disclosure no longer folds
  to the committed root. Exposes `foldWitnessRoot` for off-chain parity.

### Changed

- `SPEC.md` is an informative implementation overview; the official Draft is the
  authority and `erc/erc-8350.md` remains its byte-identical mirror. Obsolete
  pre-ERC wording and vector-as-authority claims are removed from entry documents.
- Explicitly register the official empty-signature/length ambiguity against the
  existing ERC-1271 behavior. Clarification is proposed, not merged upstream;
  runtime source, wire format, vectors and frozen audit artifacts are unchanged.
- Fix AQ-03 in both local Registry copies: compare the complete ABI return word
  instead of decoding `bytes4`, so malformed padding cannot abort ECDSA fallback.
  Empty/wrong-key signatures still reject atomically. The historical reproducer
  remains at `71b50f9`; new tests include truncated/trailing data and fuzzed padding.
  This runtime change is not covered by the frozen G4 report or deployed address.
- The EIP-7702 residual ECDSA path is now called out prominently in the security
  policy. The preliminary external-review email does not satisfy the G4 gate
  until its scope/API discrepancies and reviewer-owned evidence are corrected.
- Release checks now require the complete G4 external-review gate. The 2026-07-26
  Sepolia `AuditGrant` address is explicitly deprecated and cannot be used as
  evidence for the corrected candidate.
- **Breaking (extension):** `DeletionAttestation.attest` now takes
  `bytes32 evidenceCommitment` instead of `bytes calldata evidence`. Callers must hash
  off chain and retain the preimage as a private witness.
- `profileId` is documented as a public, non-confidential field rather than treated as
  incidentally leaky. Applications needing kind-secrecy should allocate an opaque
  per-Space profile identifier instead of a shared vocabulary entry.

### Fixed

- **High (extension):** `AuditGrant` now persists each grant's origin Space and
  rejects cross-Space acknowledgement or revocation. Previously, the controller
  of another registered Space could revoke a victim grant by supplying its own
  `spaceId`, and an auditor could emit a misattributed acknowledgement event.
- `DeletionAttestation` no longer publishes raw deletion evidence in transaction
  calldata, which contradicted architecture invariant 9 and the rule against exposing
  raw private payloads through a public wrapper.
- **EIP-7702 accounts can now authorize.** Authorization previously branched on
  `signer.code.length`, routing every 7702-delegated EOA into ERC-1271 validation. Since
  a delegated account carries `0xef0100 || delegate` code and many delegates implement no
  signature policy, those users were locked out entirely after Pectra. Validation now
  tries ERC-1271 first (so a delegate policy can authorize, but cannot veto a valid
  underlying-key ECDSA authorization) and
  falls back to canonical ECDSA. The spec now defines this ordering explicitly instead of
  leaving the EOA/contract distinction unspecified.

## 1.0.0-alpha.1 - 2026-07-14

### Added

- Canonical seven-field `ExperienceDelta v1` and EIP-712 Transition ID.
- Linear `prevStateRoot -> Delta -> nextStateRoot` state machine.
- Controller-derived Space IDs and controller/authorizer rotation.
- EOA and EIP-1271 authorization with relayer-safe locator commitments.
- Domain-separated salted private commitments and private witnesses.
- Core, Extension, Experimental, Adapter, and Implementation boundaries.
- Shared Solidity/TypeScript golden vectors and invariant tests.
- Awareness adapter and a dependency-isolated second TypeScript implementation.
- Reproducible pnpm workspace, CI, release artifacts, and rewritten ERC draft.

### Removed

- JCS-based alternate Delta IDs, raw URI calldata, speculative `83xx` naming,
  product taxonomies in Core, and unsigned Space takeover paths.
