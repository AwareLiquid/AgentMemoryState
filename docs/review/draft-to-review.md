# Draft-to-Review preparation

Date: 2026-11-01. Status: preparation and open technical questions, not a submitted
status transition. The official ERC remains Draft.

## Review packet

- [Official Draft](https://eips.ethereum.org/EIPS/eip-8350), pinned in
  [spec-baseline-2](../spec-baseline/spec-baseline-2.json).
- [Differences and disputed rules](../spec-baseline/DIFFERENCES.md).
- [Authorization decision table and proposed wording](../spec-baseline/AUTHORIZATION.md).
- [AQ-03 runtime/audit delta](../security/aq03-runtime-delta.md).
- [Real-account test command and boundaries](../interop/account-conformance.md).
- [External replay evidence](../interop/external-reproduction.md), with the latest
  upstream correction submitted separately in project PR #33.
- [Independent-client acceptance package](../interop/independent-client-handoff.md).
- Public external report intake in `audits/g4/external/submissions/`; acceptance
  remains pending under issues #11/#22, not granted by this packet.

## Questions for technical reviewers

1. Should the broad empty/length prohibitions explicitly apply to direct-call
   exemption and ECDSA recovery, while ERC-1271 receives arbitrary bytes?
2. Confirm the required signer for registration/rotation/transition, and that a
   nonempty self-call is still validated. Keep the empty direct-call shortcut MAY.
3. Confirm ordered short-circuit validation: 1271 refusal is not a veto on a
   valid retained 7702 key. Is the security boundary sufficiently prominent?
4. Confirm that noncanonical ABI padding is a failed wallet validation rather
   than a decoder abort, without accepting a magic prefix with dirty padding.
5. Are immutable enforcing logic, scoped transition references and the separation
   between hash compatibility, state enforcement and actual memory truth clear?

## Proposed upstream work, in order

Technical: obtain review of the above semantic clarifications, then submit a
focused official specification/CC0-asset PR. Preserve the assigned number,
authors, status, signing domain and wire format; link the discussion and tests.
After upstream merge, refresh the mirror and record a new official baseline.
Do not replace the pinned official mirror with unapproved project prose.

Operations: publish concise discussion updates with exact commits/results, track
dissent and external implementation responses, and link reviewer-owned audit
supplements when actually received. Do not repeatedly ping editors with claims
that passing project CI establishes consensus.

After the draft is judged ready for peer review, request the Review transition
under [EIP-1](https://eips.ethereum.org/EIPS/eip-1#eip-process). The project treats
full independent implementation and security acceptance as important quality/
release gates; they are not universal EIP-1 prerequisites for entering Review.
An audit does not automatically produce Review or Final.

## Suggested discussion text

> We have pinned the official Draft and published an explicit authorization
> decision table, together with a proposed malformed-return fix. We are seeking
> feedback on empty/custom ERC-1271 signatures, nonempty self-calls, and ordered
> ECDSA fallback for delegated accounts. Our tests and replay evidence state
> their exact scope; full independent-client work and audit acceptance remain
> open. Please identify any ambiguous acceptance rule before building against
> the proposal. We will incorporate feedback in a focused upstream revision
> before requesting a status transition.

This text is a draft for community discussion, not a claim that it was posted.
