#!/usr/bin/env node
// Guards the ERC assets copy against drift.
//
// EIP-1 requires test cases to live under `assets/erc-<N>/` and be referenced with a
// relative link, so the vector is necessarily duplicated out of `test-vectors/`. That
// duplication is the whole risk: a stale copy would ship a spec whose published vector
// disagrees with the one every implementation is tested against.

import {readFileSync} from 'node:fs';

const PAIRS = [['test-vectors/v1.json', 'erc/assets/erc-8350/test-vectors-v1.json']];

let failed = false;

for (const [source, copy] of PAIRS) {
  let a, b;
  try {
    a = readFileSync(source, 'utf8');
  } catch (error) {
    console.error(`missing source: ${source} (${error.code})`);
    failed = true;
    continue;
  }
  try {
    b = readFileSync(copy, 'utf8');
  } catch (error) {
    console.error(`missing assets copy: ${copy} (${error.code})`);
    console.error(`  fix: cp ${source} ${copy}`);
    failed = true;
    continue;
  }
  if (a !== b) {
    console.error(`assets copy has drifted: ${copy}`);
    console.error(`  fix: cp ${source} ${copy}`);
    failed = true;
    continue;
  }
  console.log(`in sync: ${copy}`);
}

for (const file of ['AgentMemoryStateRegistry.sol', 'ECDSA.sol', 'IAgentMemoryState.sol']) {
  const asset = `erc/assets/erc-8350/${file}`;
  try {
    const source = readFileSync(asset, 'utf8');
    if (source.split(/\r?\n/u, 1)[0] !== '// SPDX-License-Identifier: CC0-1.0') {
      console.error(`official reference asset must declare CC0-1.0: ${asset}`);
      failed = true;
    } else {
      console.log(`CC0 asset: ${asset}`);
    }
  } catch (error) {
    console.error(`missing official reference asset: ${asset} (${error.code})`);
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
