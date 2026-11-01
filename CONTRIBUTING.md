# Contributing

This repository implements the published ERC-8350 Draft. Protocol changes need
interoperability evidence, not only a passing implementation. Begin with the
[specification baseline](docs/spec-baseline/README.md): the pinned official text
is authoritative, the local ERC is its mirror, and `SPEC.md` is informative.

## Development setup

Install Node.js 22 or later, pnpm 11.7.0, and Foundry 1.7.1. Then run:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm conformance:clean
pnpm audit --audit-level=moderate
```

If `contracts/lib/forge-std` is absent, install the pinned test dependency:

```bash
cd contracts
forge install foundry-rs/forge-std@v1.16.2 --no-git
```

## Change rules

Assess core changes against the pinned official text and record discrepancies
before editing implementations. Proposed normative wording belongs in a separate
proposal or upstream PR, not silently in the official mirror. After upstream
acceptance, update the mirror and create a new baseline with an impact assessment
for Solidity, TypeScript, independent implementations and tests. Notify external
implementers through their collaboration issues with exact commit links.

A normative hash change requires a new protocol version; published v1 encodings
and vectors must not be silently reinterpreted. Add versioned vectors when needed;
a new test-set version alone does not change the wire or signing-domain version.
Implementation PRs include a clean-checkout conformance record for the tested
commit. Run `pnpm spec:check` and `pnpm spec:test` to detect baseline drift.

Extension, Experimental, and Adapter code MUST NOT add fields to the core Delta
or change the canonical Transition ID. Product vocabulary belongs in adapters.
Markets and deletion evidence belong outside Core.

ERC-8350 already has an assigned number and published Draft. Do not change its
official status, author list or license as a side effect of implementation work.
Review readiness and G4 release acceptance are separate decisions.

## Pull requests

Keep changes focused and explain compatibility and security consequences. Add an
ADR when a decision changes protocol boundaries, trust assumptions, signature
semantics, commitments, or state transitions. All CI jobs must pass before merge.
