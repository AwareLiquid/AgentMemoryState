# Draft-to-Review preparation

Updated: 2026-11-06. Status: technical revision submitted in
[ethereum/ERCs#2147](https://github.com/ethereum/ERCs/pull/2147), not a submitted
status transition. The official ERC remains Draft. The proposed revision is
`397426c046049e1a0c3436e543f9731408708fd3`; it is not a new accepted baseline.

## Review packet

- [Official Draft](https://eips.ethereum.org/EIPS/eip-8350), pinned in
  [spec-baseline-2](../spec-baseline/spec-baseline-2.json).
- [Differences and disputed rules](../spec-baseline/DIFFERENCES.md).
- [Authorization decision table and proposed wording](../spec-baseline/AUTHORIZATION.md).
- [AQ-03 runtime/audit delta](../security/aq03-runtime-delta.md).
- [Real-account test command and boundaries](../interop/account-conformance.md).
- [Official-candidate reproduction and acceptance checklist](upstream-authorization.md).
- [External replay evidence](../interop/external-reproduction.md): project PR #33
  merged; issues #29/#31 closed on 2026-11-01 with preserved failure records.
- [Independent-client acceptance package](../interop/independent-client-handoff.md).
- [Scoped Python results](../interop/independent-client-results.md) and the
  [merged PR #37 main acceptance](https://github.com/AwareLiquid/AgentMemoryState/pull/37#issuecomment-6679669756).
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

## Remaining work, in order

Technical: address technical/editor feedback on official PR #2147. The wording
and reference-code correction are separate commits. Number, authors, Draft
status, signing domain and wire format are preserved. After upstream merge,
refresh the official mirror and record a new baseline with the actual merged
commit. Until then, spec-baseline-2 and the original official mirror stay pinned.

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

> The focused authorization revision is now proposed in
> https://github.com/ethereum/ERCs/pull/2147 (candidate 397426c0; status remains
> Draft). We seek feedback on three specific points: ERC-1271 receives original
> empty/custom-length bytes before the ECDSA-only length guard; nonempty self-call
> signatures are validated; malformed return words fail wallet validation and
> continue to the same-byte ECDSA fallback. That fallback intentionally preserves
> an EIP-7702 account's key path even when its delegate rejects. Our pinned runner
> tests the exact candidate and reproduces the old dirty-padding failure.
> Independently maintained Python hash/state/EOA coverage is accepted only in its
> reported scope; independent ERC-1271/Safe/7702 coverage and current-source audit
> acceptance remain open. Which acceptance rule, if any, is still ambiguous for
> your implementation? This is technical feedback, not a status-change request.

This text is a draft for community discussion, not a claim that it was posted.
