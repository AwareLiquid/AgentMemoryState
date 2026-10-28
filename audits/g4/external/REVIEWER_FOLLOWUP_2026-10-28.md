# Follow-up for Besmubsa

Thank you for publishing the report and evidence at
`ac38d3d02ba07a992b92f0029d44802bae8f5154`. We verified the report SHA-256
`822d2a3642fe9006945ba8bf074455da6b47b91352c1992606c026ca4be74f6b`
and archived the original report and JSON without modification. XiaoHai
(`@XiaoHai67890`) is the current project contact.

The report is received; G4 acceptance is still pending. Could you publish a
supplement in your own repository addressing these points?

1. Complete the template's top-level `findings` and `attestation` fields,
   including per-finding dispositions, verification/rationale, appropriate
   residual-risk mappings, timestamp and a full-commit attestation URL.
   Keep unresolved counts consistent with accepted findings.
2. The v1 gate's `reviewedResidualRiskIds` means the exact accepted set R-001
   through R-011. Preserve your R-012 mitigation assessment separately as V-01;
   it is not an unresolved accepted High risk. Pin the public report to a full
   commit URL and provide fresh digests if report bytes change.
3. Replace hardcoded local REPO/SOLC paths in both Python runners with explicit
   arguments, pin the source checkout and all dependencies (especially py-evm,
   eth-tester and pycryptodome), and publish exact clean-environment commands.
   Both runners currently print mismatches without returning nonzero. Please
   make mismatches fail, compare the EVM typehash as well as domain, and add a
   negative-control run. Your Foundry-not-executed limitation should remain
   unless you actually execute and publish those results.
4. Please review our proposed I-01/I-03/I-04 documentation resolutions and I-02
   clarification: ERC-1271 intentionally accepts arbitrary byte lengths and
   can legitimately validate empty bytes for a digest preapproved in wallet
   state. A blanket 65-byte minimum or mandatory empty-signature rejection
   would break valid wallets. We will document the policy boundary and test
   unapproved digests, short signatures and permissive wallets instead.
5. Confirm that the current release is not implicitly covered: versus `af5a75f`,
   baseline `37b2e416f57305b6d38953bb6af351ee487c581a` differs in interface
   NatSpec, Foundry import configuration and expanded v1 vector inputs. The
   scoped runtime sources are unchanged. Please state the addendum/new-candidate
   review required before a release; the original frozen tag will not move.
6. Clarify the report's absolute replay/zero-hash wording: replay claims remain
   scoped to finality/domain assumptions (R-007), and zero Space IDs are rejected
   explicitly rather than being impossible keccak outputs. Please also provide
   a brief account of your review experience and human responsibility/process so
   the maintainer can assess review quality; no private identity documents are
   requested.

These are requests for your confirmation, not statements that you have already
approved the maintainer changes. We are not requesting changes to the original
immutable evidence and are not proposing compensation or a commercial engagement.
