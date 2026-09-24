// hello-memory-state.mjs — ERC-8350 最小可运行样板
//
// 目的：给比赛参赛者一个「近乎零依赖」的起点，看懂 ERC-8350 的核心原语：
//   spaceId → ExperienceDelta → transitionId → stateRoot 的完整闭环。
//
// 依赖：仅 @noble/hashes（Ethereum keccak256）
//   npm i @noble/hashes
//
// 本文件只演示「链下」的哈希/状态机部分，不含链上合约调用。
// 链上交互见参考实现仓库 AwareLiquid/AgentMemoryState 的 contracts/。
//
// 运行：node examples/hello-memory-state.mjs

import { keccak_256 } from '@noble/hashes/sha3';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

// keccak256 of a UTF-8 string（用于 type string 的 typehash）
const keccakStr = (s) => bytesToHex(keccak_256(new TextEncoder().encode(s)));

// keccak256 of hex bytes（用于 abi.encode 的数据），输入不带 0x 的偶数长度 hex
const keccakHex = (hexNoPrefix) => bytesToHex(keccak_256(hexToBytes(hexNoPrefix)));

// ---------------------------------------------------------------------------
// 1. Memory Space 标识符
//    spaceId = keccak( keccak("MemorySpace(address initialController,bytes32 salt)"),
//                       abi.encode(initialController, salt) )
// ---------------------------------------------------------------------------
const MEMORY_SPACE_TYPE = 'MemorySpace(address initialController,bytes32 salt)';

function deriveSpaceId(initialController, salt) {
  const typehash = keccakStr(MEMORY_SPACE_TYPE);
  // abi.encode(address, bytes32)：address 32 字节左填充 + salt 32 字节
  const encoded = initialController.slice(2).toLowerCase().padStart(64, '0') + salt.slice(2);
  return keccakHex(typehash + encoded);
}

// ---------------------------------------------------------------------------
// 2. ExperienceDelta（7 字段）→ transitionId（EIP-712 hashStruct）
// ---------------------------------------------------------------------------
const EXPERIENCE_DELTA_TYPE =
  'ExperienceDelta(bytes32 spaceId,uint64 sequence,bytes32 prevStateRoot,bytes32 deltaCommitment,bytes32 provenanceCommitment,bytes32 profileId,bytes32 locatorCommitment)';

const ZERO32 = '0x' + '0'.repeat(64);

function uint64(n) {
  return n.toString(16).padStart(16, '0'); // 8 字节大端
}

function computeTransitionId(delta) {
  const typehash = keccakStr(EXPERIENCE_DELTA_TYPE);
  const encoded =
    delta.spaceId.slice(2) +
    uint64(delta.sequence) +
    delta.prevStateRoot.slice(2) +
    delta.deltaCommitment.slice(2) +
    delta.provenanceCommitment.slice(2) +
    delta.profileId.slice(2) +
    delta.locatorCommitment.slice(2);
  return keccakHex(typehash + encoded);
}

// ---------------------------------------------------------------------------
// 3. State root（线性状态机）
//    nextStateRoot = keccak( keccak("MemoryState(bytes32 prevStateRoot,bytes32 transitionId)"),
//                            abi.encode(prevStateRoot, transitionId) )
// ---------------------------------------------------------------------------
const MEMORY_STATE_TYPE = 'MemoryState(bytes32 prevStateRoot,bytes32 transitionId)';

function computeNextStateRoot(prevStateRoot, transitionId) {
  const typehash = keccakStr(MEMORY_STATE_TYPE);
  const encoded = prevStateRoot.slice(2) + transitionId.slice(2);
  return keccakHex(typehash + encoded);
}

// ---------------------------------------------------------------------------
// 4. 私密承诺（可选，演示 deltaCommitment）
//    deltaCommitment = keccak( keccak("AgentMemoryState.deltaCommitment.v1"),
//                              abi.encode(profileId, deltaSalt, keccak(payload)) )
// ---------------------------------------------------------------------------
const DELTA_DOMAIN = 'AgentMemoryState.deltaCommitment.v1';

function computeDeltaCommitment(profileId, deltaSalt, payloadBytes) {
  const domain = keccakStr(DELTA_DOMAIN);
  const payloadHash = bytesToHex(keccak_256(payloadBytes));
  const encoded = profileId.slice(2) + deltaSalt.slice(2) + payloadHash;
  return keccakHex(domain + encoded);
}

// ---------------------------------------------------------------------------
// 演示：一个代理的两次记忆状态转移
// ---------------------------------------------------------------------------
function demo() {
  const controller = '0x1111111111111111111111111111111111111111';
  const salt = '0x' + 'ab'.repeat(32);
  const profileId = '0x' + 'cd'.repeat(32);

  const spaceId = deriveSpaceId(controller, salt);

  const payload1 = new TextEncoder().encode('prefers dark mode');
  const delta1 = {
    spaceId,
    sequence: 1,
    prevStateRoot: ZERO32,
    deltaCommitment: computeDeltaCommitment(profileId, '0x' + '01'.repeat(32), payload1),
    provenanceCommitment: ZERO32,
    profileId,
    locatorCommitment: ZERO32,
  };
  const transitionId1 = computeTransitionId(delta1);
  const stateRoot1 = computeNextStateRoot(ZERO32, transitionId1);

  const payload2 = new TextEncoder().encode('switched to light mode');
  const delta2 = {
    spaceId,
    sequence: 2,
    prevStateRoot: stateRoot1,
    deltaCommitment: computeDeltaCommitment(profileId, '0x' + '02'.repeat(32), payload2),
    provenanceCommitment: ZERO32,
    profileId,
    locatorCommitment: ZERO32,
  };
  const transitionId2 = computeTransitionId(delta2);
  const stateRoot2 = computeNextStateRoot(stateRoot1, transitionId2);

  console.log('=== ERC-8350 最小闭环 ===');
  console.log('controller       :', controller);
  console.log('spaceId          :', spaceId);
  console.log('');
  console.log('--- transition 1 ---');
  console.log('  sequence       : 1');
  console.log('  transitionId   :', '0x' + transitionId1);
  console.log('  stateRoot      :', '0x' + stateRoot1);
  console.log('');
  console.log('--- transition 2 ---');
  console.log('  sequence       : 2');
  console.log('  transitionId   :', '0x' + transitionId2);
  console.log('  stateRoot      :', '0x' + stateRoot2);
  console.log('');
  console.log('审计结论：stateRoot 由 prevStateRoot + transitionId 累积而成，');
  console.log('同一 delta 任何实现都算出同一 transitionId（跨实现互操作）。');
  console.log('原始记忆（payload）从未上链 —— 链上只有 deltaCommitment（私密承诺）。');
}

demo();
