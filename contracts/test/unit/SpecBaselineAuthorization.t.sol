// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentMemoryStateRegistry} from "../../src/reference/AgentMemoryStateRegistry.sol";
import {IAgentMemoryState} from "../../src/interfaces/IAgentMemoryState.sol";
import {
    AgentMemoryStateRegistry as OfficialRegistry
} from "erc8350-assets/AgentMemoryStateRegistry.sol";

// Test-only policy; unrestricted setup is not a production wallet design.
contract BaselinePolicyWallet {
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
            ? bytes4(0x1626ba7e)
            : bytes4(0xffffffff);
    }
}

contract BaselineRejectingWallet {
    function isValidSignature(bytes32, bytes calldata) external pure returns (bytes4) {
        return 0xffffffff;
    }
}

contract BaselineRevertingWallet {
    fallback() external {
        revert("policy denied");
    }
}

contract BaselineShortReturnWallet {
    fallback() external {
        assembly {
            mstore(0, shl(224, 0x1626ba7e))
            return(0, 4)
        }
    }
}

contract BaselineDirtyPaddingWallet {
    fallback() external {
        assembly {
            mstore(0, or(shl(224, 0x1626ba7e), 1))
            return(0, 32)
        }
    }
}

contract BaselineGasWallet {
    // Kept separate from the preapproval wallet so the expensive path is explicit.
    function burnAndValidate(bytes32 digest) external pure returns (bytes4) {
        uint256 value = uint256(digest);
        for (uint256 i; i < 1000; i++) {
            value = uint256(keccak256(abi.encode(value, i)));
        }
        return value == 0 ? bytes4(0xffffffff) : bytes4(0x1626ba7e);
    }
}

contract BaselineGasPolicyWallet {
    bytes32 private _digest;
    BaselineGasWallet private immutable _worker = new BaselineGasWallet();

    function approve(bytes32 digest) external {
        _digest = digest;
    }

    function isValidSignature(bytes32 digest, bytes calldata) external view returns (bytes4) {
        bytes4 result = _worker.burnAndValidate(digest);
        return digest == _digest ? result : bytes4(0xffffffff);
    }
}

abstract contract SpecBaselineAuthorizationCases is Test {
    enum Operation {
        Register,
        Rotate,
        Commit
    }

    struct Scenario {
        Operation operation;
        address signer;
        bytes32 salt;
        bytes32 spaceId;
        bytes32 digest;
        bytes32 candidate;
    }

    uint256 internal constant SIGNER_PK = 0xA11CE;
    uint256 internal constant OTHER_PK = 0xB0B;
    address internal constant RELAYER = address(0x123456);
    address internal constant OTHER_CONTROLLER = address(0xC011);
    address internal constant OTHER_AUTHORIZER = address(0xA077);
    address internal constant NEXT_CONTROLLER = address(0xC099);
    address internal constant NEXT_AUTHORIZER = address(0xA099);
    AgentMemoryStateRegistry internal registry;

    function _deploy() internal virtual returns (AgentMemoryStateRegistry);

    function setUp() public {
        registry = _deploy();
    }

    function _delta(bytes32 spaceId)
        internal
        pure
        returns (IAgentMemoryState.ExperienceDelta memory)
    {
        return IAgentMemoryState.ExperienceDelta({
            spaceId: spaceId,
            sequence: 1,
            prevStateRoot: bytes32(0),
            deltaCommitment: keccak256("baseline payload"),
            provenanceCommitment: bytes32(0),
            profileId: keccak256("baseline profile"),
            locatorCommitment: bytes32(0)
        });
    }

    function _prepare(Operation operation, address signer) internal returns (Scenario memory c) {
        c.operation = operation;
        c.signer = signer;
        c.salt = keccak256(abi.encode("spec-baseline-1", operation, signer));
        address controller = operation == Operation.Commit ? OTHER_CONTROLLER : signer;
        address authorizer = operation == Operation.Commit ? signer : OTHER_AUTHORIZER;
        c.spaceId = registry.deriveSpaceId(controller, c.salt);
        if (operation != Operation.Register) {
            vm.prank(controller);
            registry.registerSpace(c.spaceId, controller, authorizer, c.salt, "");
        }
        c.candidate = registry.hashExperienceDelta(_delta(c.spaceId));
        bytes32 structHash;
        if (operation == Operation.Register) {
            structHash = registry.hashSpaceRegistration(c.spaceId, signer, OTHER_AUTHORIZER);
        } else if (operation == Operation.Rotate) {
            structHash =
                registry.hashSpaceAuthorization(c.spaceId, NEXT_CONTROLLER, NEXT_AUTHORIZER, 1);
        } else {
            structHash = c.candidate;
        }
        c.digest = registry.signingDigest(structHash);
    }

    function _payload(Scenario memory c, bytes memory signature)
        internal
        view
        returns (bytes memory)
    {
        if (c.operation == Operation.Register) {
            return abi.encodeCall(
                registry.registerSpace, (c.spaceId, c.signer, OTHER_AUTHORIZER, c.salt, signature)
            );
        }
        if (c.operation == Operation.Rotate) {
            return abi.encodeCall(
                registry.updateSpaceAuthorization,
                (c.spaceId, NEXT_CONTROLLER, NEXT_AUTHORIZER, signature)
            );
        }
        return abi.encodeCall(registry.commitTransition, (_delta(c.spaceId), signature));
    }

    function _sign(Scenario memory c, uint256 key) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, c.digest);
        return abi.encodePacked(r, s, v);
    }

    function _snapshot(Scenario memory c) internal view returns (bytes32) {
        (bool headOk, bytes memory headData) =
            address(registry).staticcall(abi.encodeCall(registry.head, (c.spaceId)));
        (bool authOk, bytes memory authData) =
            address(registry).staticcall(abi.encodeCall(registry.spaceAuthorization, (c.spaceId)));
        (bytes32 storedSpace, bytes32 root, uint64 sequence, uint64 observedAt) =
            registry.transition(c.candidate);
        return keccak256(
            abi.encode(headOk, headData, authOk, authData, storedSpace, root, sequence, observedAt)
        );
    }

    function _reject(Scenario memory c, address caller, bytes memory signature, uint256 gasLimit)
        internal
    {
        bytes32 beforeState = _snapshot(c);
        bytes memory payload = _payload(c, signature);
        vm.prank(caller);
        (bool ok,) = address(registry).call{gas: gasLimit}(payload);
        assertFalse(ok, "unexpected authorization");
        assertEq(_snapshot(c), beforeState, "rejection changed registry state");
    }

    function _accept(Scenario memory c, address caller, bytes memory signature) internal {
        bytes memory payload = _payload(c, signature);
        vm.prank(caller);
        (bool ok,) = address(registry).call{gas: 2_000_000}(payload);
        assertTrue(ok, "expected authorization");
        (address controller, address authorizer, uint64 nonce) =
            registry.spaceAuthorization(c.spaceId);
        (bytes32 id, bytes32 root, uint64 sequence) = registry.head(c.spaceId);
        if (c.operation == Operation.Register) {
            assertEq(controller, c.signer);
            assertEq(authorizer, OTHER_AUTHORIZER);
            assertEq(nonce, 0);
            assertEq(sequence, 0);
        } else if (c.operation == Operation.Rotate) {
            assertEq(controller, NEXT_CONTROLLER);
            assertEq(authorizer, NEXT_AUTHORIZER);
            assertEq(nonce, 1);
            assertEq(sequence, 0);
        } else {
            assertEq(controller, OTHER_CONTROLLER);
            assertEq(authorizer, c.signer);
            assertEq(nonce, 0);
            assertEq(id, c.candidate);
            assertEq(root, registry.computeNextStateRoot(bytes32(0), c.candidate));
            assertEq(sequence, 1);
        }
    }

    function test_AllOperationsEnableDirectEmptyCapability() public {
        for (uint8 op; op < 3; op++) {
            Scenario memory c = _prepare(Operation(op), vm.addr(SIGNER_PK));
            _accept(c, c.signer, "");
        }
    }

    function test_SelfNonEmptySignaturesStillRequireValidation() public {
        for (uint8 op; op < 3; op++) {
            Scenario memory c = _prepare(Operation(op), vm.addr(SIGNER_PK));
            _reject(c, c.signer, _sign(c, OTHER_PK), 2_000_000);
            _accept(c, c.signer, _sign(c, SIGNER_PK));
        }
    }

    function test_RelayerEmptyEOASignatureCannotUseDirectShortcut() public {
        for (uint8 op; op < 3; op++) {
            Scenario memory c = _prepare(Operation(op), vm.addr(SIGNER_PK));
            _reject(c, RELAYER, "", 2_000_000);
        }
    }

    function test_RejectionPreservesPopulatedHeadAndExistingTransition() public {
        Scenario memory c = _prepare(Operation.Commit, vm.addr(SIGNER_PK));
        _accept(c, c.signer, "");
        // Even an authorized direct call cannot replay the accepted sequence.
        _reject(c, c.signer, "", 2_000_000);
        // The controller cannot rotate using invalid non-empty bytes either.
        c.operation = Operation.Rotate;
        _reject(c, OTHER_CONTROLLER, hex"01", 2_000_000);
    }

    function test_WrongRoleCannotUseDirectShortcut() public {
        for (uint8 op; op < 3; op++) {
            Scenario memory c = _prepare(Operation(op), vm.addr(SIGNER_PK));
            address wrongRole = op == 2 ? OTHER_CONTROLLER : OTHER_AUTHORIZER;
            _reject(c, wrongRole, "", 2_000_000);
        }
    }

    function test_ContractPreapprovalAllowsRelayedEmptyForAllOperations() public {
        BaselinePolicyWallet wallet = new BaselinePolicyWallet();
        for (uint8 op; op < 3; op++) {
            Scenario memory c = _prepare(Operation(op), address(wallet));
            _reject(c, RELAYER, "", 2_000_000);
            wallet.approve(c.digest, "");
            _accept(c, RELAYER, "");
        }
    }

    function test_ContractShortSignaturePolicyForAllOperations() public {
        BaselinePolicyWallet wallet = new BaselinePolicyWallet();
        for (uint8 op; op < 3; op++) {
            Scenario memory c = _prepare(Operation(op), address(wallet));
            wallet.approve(c.digest, hex"1234");
            _reject(c, RELAYER, hex"5678", 2_000_000);
            _accept(c, RELAYER, hex"1234");
        }
    }

    function test_EOAUnsupportedLengthsRejectAtomically() public {
        uint256[4] memory lengths = [uint256(0), 64, 65, 66];
        for (uint8 op; op < 3; op++) {
            Scenario memory c = _prepare(Operation(op), vm.addr(SIGNER_PK));
            for (uint256 i; i < lengths.length; i++) {
                _reject(c, RELAYER, new bytes(lengths[i]), 2_000_000);
            }
        }
    }

    // Code-present keyed-account stand-ins isolate dispatch. They do not claim
    // to execute a real EIP-7702 delegation authorization transaction.
    function _fallbackWithCode(bytes memory code) internal {
        address signer = vm.addr(SIGNER_PK);
        vm.etch(signer, code);
        for (uint8 op; op < 3; op++) {
            Scenario memory c = _prepare(Operation(op), signer);
            _reject(c, RELAYER, _sign(c, OTHER_PK), 2_000_000);
            _accept(c, RELAYER, _sign(c, SIGNER_PK));
        }
    }

    function test_WrongMagicDoesNotVetoValidKeySignature() public {
        _fallbackWithCode(address(new BaselineRejectingWallet()).code);
    }

    function test_RevertDoesNotVetoValidKeySignature() public {
        _fallbackWithCode(address(new BaselineRevertingWallet()).code);
    }

    function test_ShortReturnDoesNotVetoValidKeySignature() public {
        _fallbackWithCode(address(new BaselineShortReturnWallet()).code);
    }

    // AQ-03 characterization, NOT a desired portable conformance rule. A runtime
    // fix must change this test and reassess source/audit coverage explicitly.
    function test_CurrentLimitationDirtyPaddingAbortsBeforeValidECDSAFallback() public {
        address signer = vm.addr(SIGNER_PK);
        vm.etch(signer, address(new BaselineDirtyPaddingWallet()).code);
        for (uint8 op; op < 3; op++) {
            Scenario memory c = _prepare(Operation(op), signer);
            bytes memory signature = _sign(c, SIGNER_PK);
            (bool ok, bytes memory data) = signer.staticcall(
                abi.encodeWithSignature("isValidSignature(bytes32,bytes)", c.digest, signature)
            );
            assertTrue(ok);
            assertEq(data.length, 32);
            _reject(c, RELAYER, signature, 2_000_000);
        }
    }

    function test_GasStarvationRejectsWalletApprovalWithoutPartialState() public {
        BaselineGasPolicyWallet wallet = new BaselineGasPolicyWallet();
        for (uint8 op; op < 3; op++) {
            Scenario memory c = _prepare(Operation(op), address(wallet));
            wallet.approve(c.digest);
            _reject(c, RELAYER, "", 30_000);
            _accept(c, RELAYER, "");
        }
    }

    function test_CodePresentKeyedAccountIsNotImmuneToGasStarvation() public {
        address signer = vm.addr(SIGNER_PK);
        vm.etch(signer, address(new BaselineGasPolicyWallet()).code);
        for (uint8 op; op < 3; op++) {
            Scenario memory c = _prepare(Operation(op), signer);
            // Wallet policy denies this digest; sufficient gas still permits key fallback.
            bytes memory signature = _sign(c, SIGNER_PK);
            _reject(c, RELAYER, signature, 30_000);
            _accept(c, RELAYER, signature);
        }
    }
}

contract SpecBaselineProductAuthorizationTest is SpecBaselineAuthorizationCases {
    function _deploy() internal override returns (AgentMemoryStateRegistry) {
        return new AgentMemoryStateRegistry();
    }
}

contract SpecBaselineOfficialAuthorizationTest is SpecBaselineAuthorizationCases {
    function _deploy() internal override returns (AgentMemoryStateRegistry) {
        return AgentMemoryStateRegistry(address(new OfficialRegistry()));
    }
}
