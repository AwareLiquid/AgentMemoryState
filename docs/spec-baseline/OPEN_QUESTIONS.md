# Baseline open questions and handoff

Current baseline: **spec-baseline-3**, official merge `8b11215c` (still Draft).
Historical spec-baseline-1 and spec-baseline-2 remain byte-identical.
See [AQ-03 change and audit delta](../security/aq03-runtime-delta.md).

Update 2026-11-06: AQ-01/AQ-02 wording and the AQ-03 CC0 asset correction
merged in [ethereum/ERCs#2147](https://github.com/ethereum/ERCs/pull/2147),
commit `8b11215cf267f710b49ea003384e678bcf953eae`. The local mirror is synchronized.
This is Draft text acceptance, not G4 acceptance or independent wallet coverage.
See the [review evidence](../review/upstream-authorization.md).

Baseline: `spec-baseline-3`. Status: P1a rule direction is now in the official
Draft; remaining external/release boundaries stay open. Technical and operations are responsibility
categories, both currently coordinated by `@XiaoHai67890`.

## Decisions and remaining acceptance

| ID | Question / current direction | Blocking scope | Responsibility | Exit criterion |
| --- | --- | --- | --- | --- |
| AQ-01 | Resolved in Draft: arbitrary ERC-1271 bytes precede the recovery-only length guard; direct-empty exemption is caller-bound | No remaining textual blocker; report each implementation's tested scope | Technical | Official merge #2147, byte-identical baseline-3 mirror, executable success/failure cases |
| AQ-02 | Resolved in Draft: required account for each operation, nonempty self-call validation and direct-empty MAY | Optional capability still needs declaration by each implementation | Technical | Merged wording and table cover all three roles without changing them |
| AQ-03 | Runtime fix and official asset synchronization complete; strict full-word comparison preserves fallback | Current-runtime external audit supplement remains pending | Technical | Obtain reviewer-owned addendum and genuine acceptance; do not inherit the old frozen report |
| AQ-04 | Gas exhaustion, large returndata/resource limits and relayer underfunding | Non-blocking for implementation start; no liveness or production-readiness claim | Technical | Adequate/insufficient gas tests, rejection atomicity, RPC/client guidance; do not mandate an arbitrary universal gas allowance |
| AQ-05 | Portable rejection semantics versus v2 reference error selectors/order | Reference-exact certification, not valid hash interoperability | Technical | Label each case by normative rule or reference choice; do not require unstandardized error selectors of other languages |
| AQ-06 | Real Prague/type-4 harness and 46 portable ECDSA vectors/adapters merged in PRs #35/#37 | Independent external wallet execution remains separate in #21 | Technical | Maintainer account/signature gates passed on main 5770a909; retain zero-skip runs and explicit external coverage boundaries |
| AQ-07 | Safe 1.4.1 source/handler/message encoding pinned and executable 2-of-2 / signed-message cases added | No claim about every Safe version or production deployment | Technical | Run `pnpm test:accounts`; inspect approved/unapproved/wrong-message and approveHash negative controls |
| AQ-08 | Immutable enforcing logic and deployed-code identity | New release/deployment evidence, not a prerequisite to start an offline implementation | Technical | Reproduce bytecode; record Sourcify Exact Match, actual libraries/immutables and deployment transaction; inspect reachable upgrade paths and chain-specific SELFDESTRUCT semantics |

AQ-01/AQ-02 now refer to the official merged Draft in the
[decision table](AUTHORIZATION.md). External teams should cite baseline 3 and
report any differences from their previous inputs. Historical Python results
remain scoped to the original pins until independently rerun.
AQ-03's external audit boundary is not hidden under a green hash/vector gate.

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

Historical failures and prior successful runs describe their pinned versions and
block ranges; neither should be erased. Upstream PR #2 merged on 2026-10-29.
[Project PR #33](https://github.com/AwareLiquid/AgentMemoryState/pull/33) repins that
reviewed revision, records a fresh two-suite PASS and adds trusted regression
notifications. The merged upstream commit/digest replaces the temporary fork pin.
Header, MPT, second-RPC and nonzero-failure checks are retained. Notification write
permissions are isolated from untrusted PR code; default GitHub email routing is
not used as the team alert policy.

These P0 actions were merged in PR #33. Issues #29/#31 were closed on
2026-11-01 with upstream confirmation and preserved records. Fresh main acceptance
at `5770a909` also passed both live replay suites. These are no longer pending
merge/closure tasks; issue #21 separately tracks independent full-client coverage.
The notification job has not been tested by deliberately failing production CI;
deduplication/recovery logic is locally checked with a mocked GitHub client.

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
