// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentMemoryStateRegistry} from "../../src/reference/AgentMemoryStateRegistry.sol";
import {IAgentMemoryState} from "../../src/interfaces/IAgentMemoryState.sol";
import {ECDSA} from "../../src/ECDSA.sol";
import {
    AgentMemoryStateRegistry as OfficialRegistry
} from "erc8350-assets/AgentMemoryStateRegistry.sol";

abstract contract SignatureVectorCases is Test {
    uint256 internal constant HALF_N =
        0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0;
    address internal constant PRIMARY = 0x8350835083508350835083508350835083508350;
    address internal constant SECONDARY = 0x4444444444444444444444444444444444444444;
    address internal constant CONTROLLER = 0xCE613a5a39C9D37033d2Acc14f686784cAe429bf;
    string internal vectors;

    struct CaseContext {
        AgentMemoryStateRegistry registry;
        bytes32 space;
        bytes32 id;
        bytes32 headId;
        bytes32 root;
        uint64 sequence;
        address controller;
        address authorizer;
        uint64 nonce;
        uint8 operation;
        bytes signature;
        bytes payload;
    }

    function _deploy() internal virtual returns (AgentMemoryStateRegistry);

    function setUp() public {
        vectors = vm.readFile("../test-vectors/signature-vectors-v1.json");
        assertEq(vm.parseJsonString(vectors, ".schema"), "erc8350-client/signature-vectors/v1");
        assertEq(
            sha256(bytes(vectors)),
            0xd37f00d51acc66d64599dac9fae44283d93f673b20c1f7b3d7532a505e153798,
            "exact external export bytes"
        );
        // Fixture addresses are needed by published signatures. Use the runtime
        // domain path, never the cached separator for the temporary deployment.
        // This is not a deployment or bytecode-identity attestation.
        vm.chainId(31337);
        bytes memory runtime = address(_deploy()).code;
        vm.etch(PRIMARY, runtime);
        vm.etch(SECONDARY, runtime);
    }

    function _b32(string memory path) internal view returns (bytes32) {
        return vm.parseJsonBytes32(vectors, path);
    }

    function _addr(string memory path) internal view returns (address) {
        return vm.parseJsonAddress(vectors, path);
    }

    function _delta(string memory p)
        internal
        view
        returns (IAgentMemoryState.ExperienceDelta memory d)
    {
        d.spaceId = _b32(string.concat(p, ".call.spaceId"));
        d.sequence =
            uint64(vm.parseUint(vm.parseJsonString(vectors, string.concat(p, ".call.sequence"))));
        d.prevStateRoot = _b32(string.concat(p, ".call.prevStateRoot"));
        d.deltaCommitment = _b32(string.concat(p, ".call.deltaCommitment"));
        d.provenanceCommitment = _b32(string.concat(p, ".call.provenanceCommitment"));
        d.profileId = _b32(string.concat(p, ".call.profileId"));
        d.locatorCommitment = _b32(string.concat(p, ".call.locatorCommitment"));
    }

    function _boundarySetup(uint256 index, AgentMemoryStateRegistry registry, bytes32 space)
        internal
    {
        string memory label = index == 43 ? "low-s" : "r >= n";
        bytes32 salt = keccak256(bytes(string.concat("erc8350-client boundary: ", label)));
        address authorizer = index == 43
            ? address(0x555018c5200E561D3262C1B54C1b6d18654e9cbf)
            : address(0xf3C2B0d530A89Cf90CBE2e51CA88086e09bb2069);
        assertEq(registry.deriveSpaceId(CONTROLLER, salt), space);
        vm.prank(CONTROLLER);
        registry.registerSpace(space, CONTROLLER, authorizer, salt, "");
    }

    function _prepare(uint256 index, string memory p) internal returns (CaseContext memory c) {
        vm.chainId(vm.parseUint(vm.parseJsonString(vectors, string.concat(p, ".chainId"))));
        c.registry = AgentMemoryStateRegistry(_addr(string.concat(p, ".verifyingContract")));
        c.space = _b32(string.concat(p, ".call.spaceId"));
        c.signature = vm.parseJsonBytes(vectors, string.concat(p, ".signature"));
        if (index == 43 || index == 45) _boundarySetup(index, c.registry, c.space);
        string memory op = vm.parseJsonString(vectors, string.concat(p, ".operation"));
        address required;
        if (keccak256(bytes(op)) == keccak256("registerSpace")) {
            address controller = _addr(string.concat(p, ".call.controller"));
            address authorizer = _addr(string.concat(p, ".call.authorizer"));
            bytes32 salt = _b32(string.concat(p, ".call.salt"));
            assertEq(c.registry.deriveSpaceId(controller, salt), c.space);
            c.id = c.registry.hashSpaceRegistration(c.space, controller, authorizer);
            required = controller;
            c.payload = abi.encodeCall(
                c.registry.registerSpace, (c.space, controller, authorizer, salt, c.signature)
            );
        } else {
            (c.controller, c.authorizer, c.nonce) = c.registry.spaceAuthorization(c.space);
            (c.headId, c.root, c.sequence) = c.registry.head(c.space);
            if (keccak256(bytes(op)) == keccak256("updateSpaceAuthorization")) {
                c.operation = 1;
                address controller = _addr(string.concat(p, ".call.newController"));
                address authorizer = _addr(string.concat(p, ".call.newAuthorizer"));
                c.id =
                    c.registry.hashSpaceAuthorization(c.space, controller, authorizer, c.nonce + 1);
                required = c.controller;
                c.payload = abi.encodeCall(
                    c.registry.updateSpaceAuthorization,
                    (c.space, controller, authorizer, c.signature)
                );
            } else {
                assertEq(op, "commitTransition");
                c.operation = 2;
                IAgentMemoryState.ExperienceDelta memory d = _delta(p);
                assertEq(d.sequence, c.sequence + 1, "signature case must reach authorization");
                assertEq(d.prevStateRoot, c.root, "signature case must use current root");
                c.id = c.registry.hashExperienceDelta(d);
                required = c.authorizer;
                c.payload = abi.encodeCall(c.registry.commitTransition, (d, c.signature));
            }
        }
        assertEq(required, _addr(string.concat(p, ".requiredAccount")), "held authorization");
        assertEq(c.id, _b32(string.concat(p, ".structHash")), "struct hash bytes");
        assertEq(
            c.registry.signingDigest(c.id), _b32(string.concat(p, ".signingDigest")), "digest bytes"
        );
    }

    function _snapshot(CaseContext memory c) internal view returns (bytes32) {
        (bool headOk, bytes memory headData) =
            address(c.registry).staticcall(abi.encodeCall(c.registry.head, (c.space)));
        (bool authOk, bytes memory authData) =
            address(c.registry).staticcall(abi.encodeCall(c.registry.spaceAuthorization, (c.space)));
        (, bytes memory candidate) =
            address(c.registry).staticcall(abi.encodeCall(c.registry.transition, (c.id)));
        (, bytes memory previous) =
            address(c.registry).staticcall(abi.encodeCall(c.registry.transition, (c.headId)));
        return keccak256(abi.encode(headOk, headData, authOk, authData, candidate, previous));
    }

    function _rejectSelector(string memory p, bytes memory signature)
        internal
        view
        returns (bytes4)
    {
        string memory reason = vm.parseJsonString(vectors, string.concat(p, ".refusedBy"));
        if (keccak256(bytes(reason)) == keccak256("SpaceAlreadyRegistered")) {
            return AgentMemoryStateRegistry.SpaceAlreadyRegistered.selector;
        }
        if (keccak256(bytes(reason)) == keccak256("ZeroAddress")) {
            return AgentMemoryStateRegistry.ZeroAddress.selector;
        }
        if (keccak256(bytes(reason)) == keccak256("noncanonical")) {
            uint256 s;
            assembly { s := mload(add(signature, 64)) }
            return s > HALF_N ? ECDSA.InvalidSignatureS.selector : ECDSA.InvalidSignature.selector;
        }
        assertTrue(
            keccak256(bytes(reason)) == keccak256("length")
                || keccak256(bytes(reason)) == keccak256("signer")
        );
        return AgentMemoryStateRegistry.InvalidAuthorization.selector;
    }

    function _accepted(CaseContext memory c, string memory p) internal view {
        (address controller, address authorizer, uint64 nonce) =
            c.registry.spaceAuthorization(c.space);
        (bytes32 id, bytes32 root, uint64 sequence) = c.registry.head(c.space);
        if (c.operation == 0) {
            assertEq(controller, _addr(string.concat(p, ".call.controller")));
            assertEq(authorizer, _addr(string.concat(p, ".call.authorizer")));
            assertEq(nonce, 0);
            assertEq(id, bytes32(0));
            assertEq(root, bytes32(0));
            assertEq(sequence, 0);
        } else if (c.operation == 1) {
            assertEq(controller, _addr(string.concat(p, ".call.newController")));
            assertEq(authorizer, _addr(string.concat(p, ".call.newAuthorizer")));
            assertEq(nonce, c.nonce + 1);
            assertEq(id, c.headId);
            assertEq(root, c.root);
            assertEq(sequence, c.sequence);
        } else {
            assertEq(controller, c.controller);
            assertEq(authorizer, c.authorizer);
            assertEq(nonce, c.nonce);
            assertEq(id, c.id);
            assertEq(root, c.registry.computeNextStateRoot(c.root, c.id));
            assertEq(sequence, c.sequence + 1);
            (bytes32 storedSpace, bytes32 storedRoot, uint64 storedSequence, uint64 timestamp) =
                c.registry.transition(c.id);
            assertEq(storedSpace, c.space);
            assertEq(storedRoot, root);
            assertEq(storedSequence, sequence);
            assertEq(timestamp, block.timestamp);
        }
    }

    function test_All46ExternalSignatureVectors() public {
        uint256 accepted;
        for (uint256 i; i < 46; i++) {
            string memory p = string.concat(".cases[", vm.toString(i), "]");
            CaseContext memory c = _prepare(i, p);
            bytes32 beforeState = _snapshot(c);
            vm.recordLogs();
            vm.prank(_addr(string.concat(p, ".sender")));
            (bool ok, bytes memory data) = address(c.registry).call(c.payload);
            bool expected = keccak256(
                bytes(vm.parseJsonString(vectors, string.concat(p, ".expected")))
            ) == keccak256("accept");
            assertEq(ok, expected, vm.parseJsonString(vectors, string.concat(p, ".case")));
            if (ok) {
                _accepted(c, p);
                accepted++;
            } else {
                assertEq(_snapshot(c), beforeState, "rejection mutated registry");
                assertEq(vm.getRecordedLogs().length, 0, "rejection emitted logs");
                assertEq(
                    bytes4(data),
                    _rejectSelector(p, c.signature),
                    "separate reference error compatibility"
                );
            }
        }
        assertEq(accepted, 10);
    }
}

contract ProductSignatureVectorTest is SignatureVectorCases {
    function _deploy() internal override returns (AgentMemoryStateRegistry) {
        return new AgentMemoryStateRegistry();
    }
}

contract OfficialSignatureVectorTest is SignatureVectorCases {
    function _deploy() internal override returns (AgentMemoryStateRegistry) {
        return AgentMemoryStateRegistry(address(new OfficialRegistry()));
    }
}
