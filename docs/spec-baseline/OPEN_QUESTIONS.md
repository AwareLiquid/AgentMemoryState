# Baseline open questions and handoff

Current implementation baseline: **spec-baseline-2** (AQ-03 runtime fix).
The official text is unchanged. Historical spec-baseline-1 remains byte-identical.
See [AQ-03 change and audit delta](../security/aq03-runtime-delta.md).

Baseline: `spec-baseline-1`. Status: P1a inputs recorded; semantic clarifications
are proposed, not approved upstream. Technical and operations are responsibility
categories, both currently coordinated by `@XiaoHai67890`.

## Decisions and remaining acceptance

| ID | Question / current direction | Blocking scope | Responsibility | Exit criterion |
| --- | --- | --- | --- | --- |
| AQ-01 | Empty/custom ERC-1271 signatures versus broad empty/length prohibitions. Preserve direct exemption, ERC-1271, then ECDSA; narrow the prohibitions | Unqualified authorization-conformance claims; not hash/encoding work | Technical | Proposed text reviewed, submitted and merged upstream; mirror and baseline updated; success/failure cases pass |
| AQ-02 | Required-account terminology, self-call with non-empty bytes, direct-empty MAY | Authorization capability reporting; direction fixed to current implementation | Technical | Table covers all three operations; portable runner reports optional capability; upstream wording clarified without changing signer roles |
| AQ-03 | Baseline 2 fixes dirty-padding abort using a strict full-word comparison; regression tests cover both copies and all three operations | External audit and official upstream asset coverage remain pending | Technical | Review the runtime delta, obtain audit addendum and upstream review; do not inherit the old frozen report |
| AQ-04 | Gas exhaustion, large returndata/resource limits and relayer underfunding | Non-blocking for implementation start; no liveness or production-readiness claim | Technical | Adequate/insufficient gas tests, rejection atomicity, RPC/client guidance; do not mandate an arbitrary universal gas allowance |
| AQ-05 | Portable rejection semantics versus v2 reference error selectors/order | Reference-exact certification, not valid hash interoperability | Technical | Label each case by normative rule or reference choice; do not require unstandardized error selectors of other languages |
| AQ-06 | Real Prague delegation harness and actual local type-4 transactions now implemented; portable static signature data remains separate | Completion of portable P1b authorization evidence | Technical | Run `pnpm test:accounts`; publish CI artifacts, then add language-neutral signature vectors/adapters without changing v1/v2 |
| AQ-07 | Safe 1.4.1 source/handler/message encoding pinned and executable 2-of-2 / signed-message cases added | No claim about every Safe version or production deployment | Technical | Run `pnpm test:accounts`; inspect approved/unapproved/wrong-message and approveHash negative controls |
| AQ-08 | Immutable enforcing logic and deployed-code identity | New release/deployment evidence, not a prerequisite to start an offline implementation | Technical | Reproduce bytecode; record Sourcify Exact Match, actual libraries/immutables and deployment transaction; inspect reachable upgrade paths and chain-specific SELFDESTRUCT semantics |

AQ-01/AQ-02 have a project proposal in the [decision table](AUTHORIZATION.md).
External teams can implement against that explicitly named proposal, but their
reports should not imply that the conflicting official sentences have already
changed. AQ-03 is deliberately not hidden under a green hash/vector gate.

## P1b work packages

| Task | Deliverable | Acceptance | Responsibility |
| --- | --- | --- | --- |
| Authorization suite | Static test signatures plus executable scenario descriptions/adapters | ECDSA valid/invalid v, low/high-s, 0/64/65/66-byte data; contract-policy successes/failures; all three operations; rejection state unchanged | Technical |
| Independent implementation | Public independently maintained repository and pinned run | v1/v2 computations, real state-machine rejection behavior, authorization coverage and offline fixture scope reported separately; no project SDK import | Operations + technical |
| Audit supplement | Reviewer-controlled updated report and reproducible runners | Exact candidate/source scope, findings, attestation and accepted residual risks; genuine maintainer acceptance before canonical record | Operations + technical |
| Review materials | Change summary, disputed rules and discussion links | Honest peer-review request under EIP-1; no claim that audit/second implementation automatically grants Review or Final | Operations |

A future vector `v3` is a versioned test artifact. Keep v1/v2 unchanged. Publish
public test-only keys and exact message/domain inputs; do not use those keys for
real funds or authority. A Foundry harness serves EVM implementations; Rust,
Python or Go implementations need scenario adapters, not an assertion that they
can be inserted directly into a Solidity test contract.

## P0 regression closure is separate

The current baseline includes the replay fork fix. Historical failures and prior
successful runs describe their pinned versions and block ranges; neither should
be erased. [Issue #29](https://github.com/AwareLiquid/AgentMemoryState/issues/29)
still contains stale status wording, while
[#31](https://github.com/AwareLiquid/AgentMemoryState/issues/31) tracks repinning
after [upstream PR #2](https://github.com/ERC8312/bounded-agent-actions/pull/2).

- Technical: preserve header, MPT, second-RPC and nonzero-failure checks; document
  the root cause against execution specifications and publish fresh run identities.
- Operations: seek independent review. Choose a follow-up date, not a deadline
  after which a maintainer fork becomes independent evidence automatically.
- Technical: keep the full fork commit/digest pinned until an acceptable upstream
  revision exists. This need not block unrelated baseline/implementation work.
- Operations: close #29 only after its criteria are met, or explicitly transfer
  every outstanding independent-verification criterion to a named open issue.
  #31's repin-only description does not automatically cover those criteria.
- Technical: scheduled CI already exists. Add deduplicated failure/recovery issue
  notifications in trusted scheduled/manual runs, with write permissions isolated
  from untrusted PR code. Default GitHub email routing is not a team alert policy.

These are queued actions, not notifications sent or issues closed by this package.

## Deployment evidence boundaries

Sourcify Exact Match establishes source/build correspondence, not non-upgradeability.
Record creation/runtime verification results, linked library addresses and actual
immutable values. Empty ERC-1967 slots and absence of named admin functions alone
do not exclude a custom upgrade mechanism. Disassemble and analyze reachable
DELEGATECALL/dispatch targets; do not search raw byte strings containing PUSH data
or metadata. A mutable configured ERC-1271 wallet policy is a separate account
trust boundary, not automatically an upgrade of Registry enforcing logic.

On chains implementing EIP-6780, SELFDESTRUCT outside the creation transaction
does not erase code/storage; the same-transaction exception remains. CREATE2 alone
is not an upgrade mechanism. Record the actual network rules and factory path.

## Exit from this preparation step

P1a is ready for maintainer review when the four documents, source pins, baseline
guard and characterization tests are available and pass. This means the inputs
and uncertainties are explicit, not that all questions are resolved. P1b can
proceed on the fixed directions with scoped claims. No G4 acceptance file,
release, deployment, upstream approval or external independence is fabricated.
