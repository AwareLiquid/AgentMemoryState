// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentMemoryStateRegistry} from "../../src/reference/AgentMemoryStateRegistry.sol";
import {PrivateCommitment} from "../../src/reference/PrivateCommitment.sol";
import {IAgentMemoryState} from "../../src/interfaces/IAgentMemoryState.sol";
import {
    AgentMemoryStateRegistry as OfficialAssetRegistry
} from "erc8350-assets/AgentMemoryStateRegistry.sol";

contract GoldenVectorTest is Test {
    AgentMemoryStateRegistry internal registry;
    string internal vector;

    function setUp() public virtual {
        registry = new AgentMemoryStateRegistry();
        vector = vm.readFile(string.concat(vm.projectRoot(), "/../test-vectors/v1.json"));
    }

    function test_V1GoldenVectorMatchesCanonicalJsonByteForByte() public view {
        assertEq(vm.parseJsonString(vector, ".schema"), "agent-memory-state/test-vectors/v1");

        IAgentMemoryState.ExperienceDelta memory delta = _delta();
        bytes32 transitionId = registry.hashExperienceDelta(delta);

        _assertPrivateCommitments(delta);
        _assertTypeStrings();
        _assertTransitionHashes(delta, transitionId);
        _assertSpaceAuthorization(delta);
        _assertEip712(transitionId);
    }

    function _delta() private view returns (IAgentMemoryState.ExperienceDelta memory) {
        return IAgentMemoryState.ExperienceDelta({
            spaceId: _bytes32(".delta.spaceId"),
            sequence: uint64(vm.parseUint(_string(".delta.sequence"))),
            prevStateRoot: _bytes32(".delta.prevStateRoot"),
            deltaCommitment: _bytes32(".delta.deltaCommitment"),
            provenanceCommitment: _bytes32(".delta.provenanceCommitment"),
            profileId: _bytes32(".delta.profileId"),
            locatorCommitment: _bytes32(".delta.locatorCommitment")
        });
    }

    function _assertTypeStrings() private view {
        assertEq(
            keccak256(bytes(_string(".types.experienceDelta"))),
            registry.EXPERIENCE_DELTA_TYPEHASH()
        );
        assertEq(keccak256(bytes(_string(".types.memoryState"))), registry.MEMORY_STATE_TYPEHASH());
        assertEq(keccak256(bytes(_string(".types.memorySpace"))), registry.MEMORY_SPACE_TYPEHASH());
        assertEq(
            keccak256(bytes(_string(".types.spaceRegistration"))),
            registry.SPACE_REGISTRATION_TYPEHASH()
        );
        assertEq(
            keccak256(bytes(_string(".types.spaceAuthorization"))),
            registry.SPACE_AUTHORIZATION_TYPEHASH()
        );
    }

    function _assertPrivateCommitments(IAgentMemoryState.ExperienceDelta memory delta)
        private
        view
    {
        assertEq(
            PrivateCommitment.computeDelta(
                bytes(_string(".commitment.payload")),
                _bytes32(".commitment.deltaSalt"),
                delta.profileId
            ),
            delta.deltaCommitment
        );
        assertEq(
            PrivateCommitment.computeProvenance(
                bytes(_string(".commitment.provenance")), _bytes32(".commitment.provenanceSalt")
            ),
            delta.provenanceCommitment
        );
        assertEq(
            PrivateCommitment.computeLocator(
                bytes(_string(".commitment.locator")), _bytes32(".commitment.locatorSalt")
            ),
            delta.locatorCommitment
        );
    }

    function _assertTransitionHashes(
        IAgentMemoryState.ExperienceDelta memory delta,
        bytes32 transitionId
    ) private view {
        assertEq(
            registry.EXPERIENCE_DELTA_TYPEHASH(), _bytes32(".expected.experienceDeltaTypehash")
        );
        assertEq(registry.MEMORY_STATE_TYPEHASH(), _bytes32(".expected.memoryStateTypehash"));
        assertEq(registry.MEMORY_SPACE_TYPEHASH(), _bytes32(".expected.memorySpaceTypehash"));
        assertEq(transitionId, _bytes32(".expected.transitionId"));
        assertEq(
            registry.computeNextStateRoot(delta.prevStateRoot, transitionId),
            _bytes32(".expected.nextStateRoot")
        );
    }

    function _assertSpaceAuthorization(IAgentMemoryState.ExperienceDelta memory delta)
        private
        view
    {
        address controller = vm.parseJsonAddress(vector, ".spaceAuthorization.controller");
        address authorizer = vm.parseJsonAddress(vector, ".spaceAuthorization.authorizer");
        assertEq(
            registry.deriveSpaceId(controller, _bytes32(".spaceAuthorization.spaceSalt")),
            delta.spaceId
        );
        assertEq(
            registry.hashSpaceRegistration(delta.spaceId, controller, authorizer),
            _bytes32(".spaceAuthorization.registrationId")
        );
        assertEq(
            registry.hashSpaceAuthorization(
                delta.spaceId,
                vm.parseJsonAddress(vector, ".spaceAuthorization.newController"),
                vm.parseJsonAddress(vector, ".spaceAuthorization.newAuthorizer"),
                uint64(vm.parseUint(_string(".spaceAuthorization.updateNonce")))
            ),
            _bytes32(".spaceAuthorization.authorizationId")
        );
    }

    function _assertEip712(bytes32 transitionId) private view {
        uint256 chainId = vm.parseUint(_string(".eip712.chainId"));
        address verifyingContract = vm.parseJsonAddress(vector, ".eip712.verifyingContract");
        assertEq(
            registry.computeDomainSeparator(chainId, verifyingContract),
            _bytes32(".eip712.domainSeparator")
        );
        assertEq(
            registry.computeSigningDigest(transitionId, chainId, verifyingContract),
            _bytes32(".eip712.signingDigest")
        );
    }

    function _bytes32(string memory path) private view returns (bytes32) {
        return vm.parseJsonBytes32(vector, path);
    }

    function _string(string memory path) private view returns (string memory) {
        return vm.parseJsonString(vector, path);
    }
}

contract OfficialAssetGoldenVectorTest is GoldenVectorTest {
    function setUp() public override {
        // Exercise the submitted asset through the shared reference ABI.
        registry = AgentMemoryStateRegistry(address(new OfficialAssetRegistry()));
        vector = vm.readFile(string.concat(vm.projectRoot(), "/../test-vectors/v1.json"));
    }
}
