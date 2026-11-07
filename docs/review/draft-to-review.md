# Draft-to-Review preparation

Updated 2026-11-07. [Technical revision #2147](https://github.com/ethereum/ERCs/pull/2147)
is merged at `8b11215cf267f710b49ea003384e678bcf953eae`.
The pinned official status is **Draft**. This packet supports a separate request
for Review; it does not itself change the upstream status. The status-only
request is [official #2148](https://github.com/ethereum/ERCs/pull/2148).
[NatSpec correction #2151](https://github.com/ethereum/ERCs/pull/2151) subsequently
merged as `47c7f884`; historical test/source pins below are not relabelled.

## Review packet

- [Pinned official Draft](https://github.com/ethereum/ERCs/blob/8b11215cf267f710b49ea003384e678bcf953eae/ERCS/erc-8350.md)
  and [spec-baseline-3](../spec-baseline/spec-baseline-3.json).
- [Differences and resolutions](../spec-baseline/DIFFERENCES.md).
- [Authorization decision table](../spec-baseline/AUTHORIZATION.md).
- [AQ-03 runtime/audit delta](../security/aq03-runtime-delta.md).
- [Real-account command and boundaries](../interop/account-conformance.md).
- [Official and historical-source reproduction](upstream-authorization.md).
- [External replay evidence](../interop/external-reproduction.md): PR #33 merged;
  issues #29/#31 closed with historical failed runs preserved.
- [Independent-client handoff](../interop/independent-client-handoff.md) and
  [scoped Python results](../interop/independent-client-results.md).
- [Scoped independent wallet execution](../interop/independent-wallet-results.md),
  with exact external/source pins, native logs, coverage mapping and limitations.
- Public provisional external report in `audits/g4/external/submissions/`;
  current-runtime acceptance remains pending in issues #11/#22.

## Resolved rule questions

The official merge resolves AQ-01/AQ-02 and synchronizes the AQ-03 source fix:

1. ERC-1271 receives original empty/custom bytes before the ECDSA-only length guard.
2. Required signer roles are explicit for all three operations. Direct-empty
   authorization is optional; nonempty self-call signatures still need validation.
3. Ordered fallback preserves a valid 7702 retained-key path after wallet refusal.
4. Noncanonical return padding is failed wallet validation, not an ABI decoder
   abort and not authorization based only on a four-byte prefix.

No hash, type string, signing domain, field, storage layout or interface changes
were made in the baseline synchronization. The merged wording resolves semantic
ambiguity and is not retroactively labelled an editorial-only revision.

## Questions still useful for peer review

- Are required-account roles, optional direct-call capability and retained-key
  fallback unambiguous for independently written clients?
- Are immutable enforcing logic, fully scoped transition references and the
  distinction between a commitment and memory truth sufficiently clear?
- Do consumers understand wallet-state/gas dependence and the limits of offline
  audit claims? No universal gas minimum or production liveness is guaranteed.
- Does the new externally authored wallet client cover the selected authorization
  decisions adequately, and which rows still need independent execution?

## Separate standards and release tracks

Under [EIP-1](https://eips.ethereum.org/EIPS/eip-1#eip-process), the author requests
Review when the draft is ready for peer review. A complete second implementation
and external audit are project quality/release objectives, not universal Review
prerequisites. Green CI or audit results do not themselves grant Review or Final.

The independently maintained Python client covers hash/encoding, five-transition
fixtures, held-state rejections and EOA ECDSA under its reported pins. It does not
implement ERC-1271, Safe or 7702. Maintainer account tests are not independent
coverage. Historical Python results are not relabelled as runs of the new baseline.

The separate @haot3x wallet client executes selected ERC-1271, real Safe 1.4.1 and
mined EIP-7702 paths against exact official source at `8b11215`. It is independent
client execution against the reference, not an independently written Registry.
The linked record maps coverage and preserves the initial maintainer-wrapper
failure separately from the contributor's passing test run. Full-scope issue #21
acceptance is still open; unsupported rows are not silently treated as covered.

The existing external report targets the old freeze. Current-runtime addendum,
canonical G4 acceptance and new deployment evidence remain open. Do not describe
this packet or a Review transition as production-ready.

## Publication and request checklist

1. Baseline 3 and clean-checkout/source/account results were published through
   project #39; its merge is `f654fe023909ef93e1478e79dbcee7cbd7b05835`.
2. The [Magicians update](https://ethereum-magicians.org/t/erc-8350-agent-memory-state-registry/29098/36)
   and pinned handoff were published; the independent Python evidence keeps its
   earlier scope and inputs.
3. Official #2148 requests only `status: Draft` to `status: Review`; it does not
   change the number, authors or technical text.
4. Publish verified wallet evidence and CI, reconcile issue #21, and attach the
   bounded additional evidence to #2148 without implying editor acceptance.
5. Keep current-runtime external audit acceptance separate in #11/#22. Record
   actual reviewer decisions rather than inferring consensus from passing tests.

## Suggested community update

> The focused authorization revision has merged in ethereum/ERCs#2147. ERC-8350
> remains Draft. Baseline 3 pins the actual merged text/assets and preserves old
> baselines and failed regression evidence. The runner tests exact official bytes
> and the historical candidate separately. We are preparing a request for peer
> review, particularly on wallet-policy versus retained-key fallback and the
> boundary between memory commitments and memory truth. Independent Python
> evidence remains scoped to hash/state/EOA behavior; a separate externally
> authored client adds selected Safe/ERC-1271/7702 reference-execution evidence.
> Full second-implementation acceptance and the current-runtime audit remain
> open. Please identify
> any remaining ambiguous acceptance rule or interoperability concern.

This is reusable draft text. Actual publication and status-request URLs belong
in the public handoff record; preparing this file alone does not publish them.
