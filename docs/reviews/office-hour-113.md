# Office Hour 113 revision

## Scope

This revision addresses Jochem Brouwer's September 15, 2026 reviews on
[ethereum/ERCs#1910](https://github.com/ethereum/ERCs/pull/1910), based on upstream
commit `708e8130a32a525ed001225925aeed04905cb98f`. The product baseline is
`8bef6e77db895ec47220715fc73acf0e6a18954e`.

The editor confirmed that Sam's earlier six comments were addressed. The
licensing issue is an explicit merge blocker. The supplementary review is
LLM-assisted feedback, not an independent security audit or reproduction report.

## Changes

| Review item | Resolution |
| --- | --- |
| [Asset licensing](https://github.com/ethereum/ERCs/pull/1910#discussion_r4018175652) | The three submitted Solidity assets declare CC0-1.0. Product sources retain Apache-2.0. |
| [Reference implementation](https://github.com/ethereum/ERCs/pull/1910#discussion_r4018243131) | Describe only the Solidity registry and interface included in the official assets; omit product names and implementations not included there. |
| [RFC links](https://github.com/ethereum/ERCs/pull/1910#discussion_r4018243138) | Link RFC 2119 and RFC 8174 to rfc-editor.org. |
| [Complete vector inputs](https://github.com/ethereum/ERCs/pull/1910#discussion_r4018243147) | Add both authorization type strings and explicit replacement accounts. All three suites read these inputs. |
| [Optional helpers](https://github.com/ethereum/ERCs/pull/1910#discussion_r4018243155) | Mark each of the four extra helpers as optional and non-normative; keep deriveSpaceId normative and preserve the ABI. |

The earlier Sam revision is also synchronized into the product's ERC mirror,
including removal of the duplicated IERC1271 asset. No published deployment is
replaced or relabeled by this source revision.

## Licensing boundary

The CC0 change is limited to the three submitted Solidity assets and their copies
in `erc/assets/erc-8350/`, following the project representative's instruction for
this revision. The product LICENSE and package licenses are unchanged. Existing
source-attribution comments are retained. Git history identifies the original
ECDSA source submission as Everest's commit `a57bed8`; that history alone is not
an independent legal provenance assessment.

## Verification boundary

- ExperienceDelta field order, signing-domain values and hash algorithms are unchanged.
- No existing v1 input or expected output is changed; four explicit inputs are added.
- Core TS, minimal TS and Foundry validate the five type strings and replacement accounts.
- Foundry runs the same golden assertions against the actual submitted Solidity registry.
- The official vector and product canonical vector remain byte-for-byte copies.
- Source hashes and compiler metadata can change with comments or license headers.
  Do not claim that deployment bytecode is unchanged on the basis of these tests.
- Frozen G4 source/evidence tags, manifests and existing reproduction records are
  historical evidence and are not rewritten. They do not certify this revision.

## Reproduce

From a committed clean checkout with the documented toolchain:

```bash
pnpm conformance:clean
```

The command produces the source commit/tree, vector SHA-256, tool versions,
per-suite logs and pass/fail results under `artifacts/conformance/<commit>/`.
Run the official repository's document checks before upstream submission as well.
Editor approval, GitHub CI on the updated PR and merge are separate steps.
