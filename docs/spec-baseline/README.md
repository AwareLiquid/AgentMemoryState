# ERC-8350 specification baseline

`spec-baseline-1` records the published Draft and the implementation examined on
2026-10-28. The official text is authoritative; proposed clarifications in this
directory are not merged ERC requirements. This package supplies the inputs for
authorization testing, independent implementation, audit follow-up and a future
Draft-to-Review request. It does not approve a release or complete G4.

## Source of authority

| Artifact | Role | Pinned reference |
| --- | --- | --- |
| Official `ERCS/erc-8350.md` | Normative Draft | [ethereum/ERCs at b9651bc84714e87e6361f4f6c0c8ff39cc265d0a](https://github.com/ethereum/ERCs/blob/b9651bc84714e87e6361f4f6c0c8ff39cc265d0a/ERCS/erc-8350.md) |
| Local `erc/erc-8350.md` | Byte-identical official mirror | [Local mirror](../../erc/erc-8350.md); the manifest pins its SHA-256 and official Git blob |
| `SPEC.md` | Informative implementation overview | [Current overview](../../SPEC.md); not a competing normative source |
| Reference implementation and vectors | Observed behavior and test inputs | Baseline commit `891b47c70c8b45df1daaa78065b16ff73e67f8a4` |
| Clarifications in this directory | Project proposals for discussion | Not approved upstream; tracked in [open questions](OPEN_QUESTIONS.md) |

The official revision above is the last commit changing this ERC when checked.
Do not use a moving `master`/`main` URL as the version an implementer signs off on.
The [manifest](spec-baseline-1.json) pins independent identities for the official
text, implementation, build settings and both vector files. Its implementation
commit identifies the examined source, not a claim that new documentation or
tests already existed at that commit.

`spec-baseline-1` is a documentation baseline ID. It does not change
`ExperienceDelta v1`, EIP-712 domain version `1`, any type string, or any hash.
A future vector-set `v3` would likewise be a test-data revision, not a protocol
version change. Baseline 1's pinned artifacts remain immutable evidence; later
baselines need new IDs and a recorded difference assessment.

## Read the four deliverables

1. This baseline inventory and source precedence.
2. [Text and implementation differences](DIFFERENCES.md), including resolved
   documentation errors and unresolved normative ambiguity.
3. [Authorization decision table](AUTHORIZATION.md), covering all three
   operations, direct-call capability, ERC-1271 and ECDSA fallback.
4. [Open questions and handoff](OPEN_QUESTIONS.md), with blocking scope, proposed
   direction, responsibility and exit criteria.

No test vector or reference implementation overrides the official text. Where
these disagree or the text is ambiguous, record the mismatch rather than silently
changing the expected output to make a test pass. The official mirror stays
unchanged while the proposed wording is discussed separately.

## Verification

```bash
pnpm spec:check
pnpm spec:test
# Optional network check of the pinned upstream bytes, not the latest branch:
pnpm spec:check --verify-upstream
cd contracts
forge test --match-path test/unit/SpecBaselineAuthorization.t.sol -vv
```

The offline check verifies ten pinned local artifacts, the mirror's Git blob
identity and SHA-256, required metadata, and the four document entry points.
The optional upstream check compares the downloaded official bytes against both
digests. Neither check certifies the correctness of the protocol or external
review acceptance. `pnpm check` includes the offline check and its negative tests.
Full checkout validation remains `pnpm conformance:clean`.

The characterization tests exercise the existing implementation. They are not a
new externally maintained implementation, a complete portable authorization
suite, a real Safe integration, or a real 7702 authorization-transaction test.
Those P1b deliverables remain explicitly tracked.

## Confirmation and notification

XiaoHai (`@XiaoHai67890`) is the project contact. Responsibility labels are
technical or operations; the current maintainer handles both. Recording this
baseline does not forge an editor approval, reviewer attestation, or partner
acceptance.

1. Technical: prepare the baseline, diffs, decision table and executable evidence.
2. Maintainer: review and merge the project baseline PR, recording the exact
   commit being accepted for project-side coordination.
3. Operations: notify implementers through their collaboration issues and
   [the second-implementation request](https://github.com/AwareLiquid/AgentMemoryState/issues/21).
   Include baseline ID, full commit links, proposed-rule status and affected rows.
4. Technical: submit any normative clarification separately to `ethereum/ERCs`.
   After upstream merge, create the next baseline and notify the same channels.

Notification text to adapt after publication:

> Baseline spec-baseline-1 pins the official Draft, implementation and vectors.
> Please cite the baseline commit in your results and distinguish observed
> reference behavior from proposed clarifications AQ-01/AQ-02. Hash/encoding
> work can proceed; authorization claims should name the rule set used. The
> table and open questions identify remaining tests and review boundaries.

No notification is claimed sent by this document. A collaboration record should
link the actual baseline PR/commit, notification and implementer's acknowledgement.

## Standards and release tracks

Under [EIP-1](https://eips.ethereum.org/EIPS/eip-1#eip-process), Review requests
peer review. A second implementation and external audit are project quality
objectives, not universal EIP-1 prerequisites for entering Review. G4 acceptance,
production readiness, a release tag and a deployment are separate decisions.

P1a fixes the input baseline and records directions for semantic questions. P1b
can then run testing, independent implementation, audit supplementation and
Review materials in parallel, while preserving the unresolved boundaries below.
Neither source-hash checking nor green CI automatically closes those questions.
