// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ECDSA} from "../../src/ECDSA.sol";
import {IAgentMemoryState} from "../../src/interfaces/IAgentMemoryState.sol";
import {IERC1271} from "../../src/interfaces/IERC1271.sol";
import {AgentMemoryStateRegistry} from "../../src/reference/AgentMemoryStateRegistry.sol";
import {AuditGrant} from "../../src/extensions/AuditGrant.sol";
import {SpaceDescriptor} from "../../src/extensions/SpaceDescriptor.sol";

// Test-only wallet: preapproval is digest-specific; signature bytes are opaque.
contract DigestPolicyWallet {
    bytes32 private _digest;
    bytes32 private _signatureHash;

    function approve(bytes32 digest, bytes calldata signature) external {
        _digest = digest;
        _signatureHash = keccak256(signature);
    }

    function isValidSignature(bytes32 digest, bytes calldata signature)
        external
        view
        returns (bytes4)
    {
        return digest == _digest && keccak256(signature) == _signatureHash
            ? IERC1271.isValidSignature.selector
            : bytes4(0xffffffff);
    }
}

// Deliberately unsafe policy illustrates G4-R-008, not a recommended wallet.
contract PermissivePolicyWallet {
    function isValidSignature(bytes32, bytes calldata) external pure returns (bytes4) {
        return IERC1271.isValidSignature.selector;
    }
}

contract ExternalReviewBoundaryTest is Test {
    uint256 private constant CONTROLLER_PK = 0xA11CE;
    AgentMemoryStateRegistry private registry;
    address private controller;
    bytes32 private space;

    function setUp() public {
        registry = new AgentMemoryStateRegistry();
        controller = vm.addr(CONTROLLER_PK);
        space = _register(controller, keccak256("review-boundary"));
    }

    function _register(address authorizer, bytes32 salt) private returns (bytes32 id) {
        id = registry.deriveSpaceId(controller, salt);
        vm.prank(controller);
        registry.registerSpace(id, controller, authorizer, salt, "");
    }

    function _delta(bytes32 id) private view returns (IAgentMemoryState.ExperienceDelta memory) {
        (, bytes32 root, uint64 sequence) = registry.head(id);
        return IAgentMemoryState.ExperienceDelta({
            spaceId: id,
            sequence: sequence + 1,
            prevStateRoot: root,
            deltaCommitment: keccak256("private-payload-commitment"),
            provenanceCommitment: bytes32(0),
            profileId: keccak256("review/test/v1"),
            locatorCommitment: bytes32(0)
        });
    }

    function _digest(IAgentMemoryState.ExperienceDelta memory delta)
        private
        view
        returns (bytes32)
    {
        return registry.signingDigest(registry.hashExperienceDelta(delta));
    }

    function test_GrantReferencesIncludeChainAndDeployment() public {
        AuditGrant first = new AuditGrant(IAgentMemoryState(address(registry)));
        AuditGrant second = new AuditGrant(IAgentMemoryState(address(registry)));
        address auditor = address(0xAD170);
        bytes32 grantId = first.deriveGrantId(space, auditor, 1, 1);
        assertEq(grantId, second.deriveGrantId(space, auditor, 1, 1));
        // Application indexing key, not a replacement for the extension's grantId.
        bytes32 scopedReference = keccak256(abi.encode(uint256(1), address(first), grantId));
        assertNotEq(scopedReference, keccak256(abi.encode(uint256(1), address(second), grantId)));
        assertNotEq(scopedReference, keccak256(abi.encode(uint256(2), address(first), grantId)));
    }

    function test_ERC1271AllowsDigestSpecificEmptyPreapproval() public {
        DigestPolicyWallet wallet = new DigestPolicyWallet();
        bytes32 id = _register(address(wallet), keccak256("empty-preapproval"));
        IAgentMemoryState.ExperienceDelta memory delta = _delta(id);
        wallet.approve(_digest(delta), "");
        registry.commitTransition(delta, "");
        (,, uint64 sequence) = registry.head(id);
        assertEq(sequence, 1);
    }

    function test_ERC1271RejectsEmptySignatureForUnapprovedDigest() public {
        DigestPolicyWallet wallet = new DigestPolicyWallet();
        bytes32 id = _register(address(wallet), keccak256("unapproved-digest"));
        IAgentMemoryState.ExperienceDelta memory delta = _delta(id);
        wallet.approve(_digest(delta), "");
        delta.locatorCommitment = keccak256("changed-locator");
        vm.expectRevert(AgentMemoryStateRegistry.InvalidAuthorization.selector);
        registry.commitTransition(delta, "");
        (,, uint64 sequence) = registry.head(id);
        assertEq(sequence, 0);
    }

    function test_ERC1271AllowsShortCustomSignature() public {
        DigestPolicyWallet wallet = new DigestPolicyWallet();
        bytes32 id = _register(address(wallet), keccak256("short-signature"));
        IAgentMemoryState.ExperienceDelta memory delta = _delta(id);
        wallet.approve(_digest(delta), hex"1234");
        registry.commitTransition(delta, hex"1234");
        (,, uint64 sequence) = registry.head(id);
        assertEq(sequence, 1);
    }

    function test_ERC1271RejectsWrongShortSignature() public {
        DigestPolicyWallet wallet = new DigestPolicyWallet();
        bytes32 id = _register(address(wallet), keccak256("wrong-signature"));
        IAgentMemoryState.ExperienceDelta memory delta = _delta(id);
        wallet.approve(_digest(delta), hex"1234");
        vm.expectRevert(AgentMemoryStateRegistry.InvalidAuthorization.selector);
        registry.commitTransition(delta, hex"5678");
    }

    function test_PermissiveWalletExposesConfiguredPolicyRisk() public {
        PermissivePolicyWallet wallet = new PermissivePolicyWallet();
        bytes32 id = _register(address(wallet), keccak256("permissive-policy"));
        registry.commitTransition(_delta(id), "");
        (,, uint64 sequence) = registry.head(id);
        assertEq(sequence, 1);
    }

    function test_EmptyDescriptorDoesNotEstablishSpaceExistence() public {
        SpaceDescriptor descriptor = new SpaceDescriptor(IAgentMemoryState(address(registry)));
        bytes32 unknown = keccak256("unknown-space");
        (string memory knownUri, bytes32 knownHash, uint64 knownTime) =
            descriptor.descriptorOf(space);
        (string memory unknownUri, bytes32 unknownHash, uint64 unknownTime) =
            descriptor.descriptorOf(unknown);
        assertEq(bytes(knownUri).length, 0);
        assertEq(knownHash, bytes32(0));
        assertEq(knownTime, 0);
        assertEq(unknownUri, knownUri);
        assertEq(unknownHash, knownHash);
        assertEq(unknownTime, knownTime);
        (address actualController,,) = registry.spaceAuthorization(space);
        assertEq(actualController, controller);
        vm.expectRevert(AgentMemoryStateRegistry.UnknownSpace.selector);
        registry.spaceAuthorization(unknown);
    }

    function test_CanonicalEOAV27AndV28Accepted() public {
        for (uint8 expectedV = 27; expectedV <= 28; expectedV++) {
            IAgentMemoryState.ExperienceDelta memory delta = _delta(space);
            bool exercised;
            for (uint256 salt; salt < 64; salt++) {
                delta.deltaCommitment = keccak256(abi.encode(expectedV, salt));
                (uint8 v, bytes32 r, bytes32 s) = vm.sign(CONTROLLER_PK, _digest(delta));
                if (v != expectedV) continue;
                registry.commitTransition(delta, abi.encodePacked(r, s, v));
                exercised = true;
                break;
            }
            assertTrue(exercised, "expected recovery parity not exercised");
        }
        (,, uint64 sequence) = registry.head(space);
        assertEq(sequence, 2);
    }

    function test_EOARawVZeroAndOneRejected() public {
        IAgentMemoryState.ExperienceDelta memory delta = _delta(space);
        (, bytes32 r, bytes32 s) = vm.sign(CONTROLLER_PK, _digest(delta));
        for (uint8 v; v < 2; v++) {
            vm.expectRevert(ECDSA.InvalidSignature.selector);
            registry.commitTransition(delta, abi.encodePacked(r, s, v));
        }
    }

    function test_EOACompactSignatureRejected() public {
        IAgentMemoryState.ExperienceDelta memory delta = _delta(space);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(CONTROLLER_PK, _digest(delta));
        bytes32 vs = bytes32(uint256(s) | (uint256(v - 27) << 255));
        vm.expectRevert(AgentMemoryStateRegistry.InvalidAuthorization.selector);
        registry.commitTransition(delta, abi.encodePacked(r, vs));
    }

    function test_EOAHighSRejected() public {
        IAgentMemoryState.ExperienceDelta memory delta = _delta(space);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(CONTROLLER_PK, _digest(delta));
        uint256 order = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;
        bytes32 highS = bytes32(order - uint256(s));
        vm.expectRevert(ECDSA.InvalidSignatureS.selector);
        registry.commitTransition(delta, abi.encodePacked(r, highS, uint8(v == 27 ? 28 : 27)));
    }
}
