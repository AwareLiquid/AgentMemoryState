// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Vm} from "forge-std/Vm.sol";
import {SpecBaselineAuthorizationCases} from "project/test/unit/SpecBaselineAuthorization.t.sol";
import {AgentMemoryStateRegistry} from "project/src/reference/AgentMemoryStateRegistry.sol";
import {IAgentMemoryState} from "project/src/interfaces/IAgentMemoryState.sol";
import {Safe} from "safe/Safe.sol";
import {SafeProxy} from "safe/proxies/SafeProxy.sol";
import {CompatibilityFallbackHandler} from "safe/handler/CompatibilityFallbackHandler.sol";
import {SignMessageLib} from "safe/libraries/SignMessageLib.sol";
import {Enum} from "safe/common/Enum.sol";

// Test policy only: approval is restricted to an immutable test owner, not arbitrary callers.
contract DelegationPolicy {
    address private immutable _owner;
    bytes32 private _approved;

    constructor(address owner) {
        _owner = owner;
    }

    function approve(bytes32 digest) external {
        require(msg.sender == _owner, "owner only");
        _approved = digest;
    }

    function isValidSignature(bytes32 digest, bytes calldata signature)
        external
        view
        returns (bytes4)
    {
        return
            digest == _approved && signature.length == 0 ? bytes4(0x1626ba7e) : bytes4(0xffffffff);
    }
}

contract DelegationWithoutPolicy {
    event Ping();

    function ping() external returns (uint256) {
        emit Ping();
        return 42;
    }
}

abstract contract RealAccountCases is SpecBaselineAuthorizationCases {
    CompatibilityFallbackHandler internal handler;
    SignMessageLib internal messageLibrary;

    function _attach(address implementation) internal returns (address signer) {
        signer = vm.addr(SIGNER_PK);
        uint64 beforeNonce = vm.getNonce(signer);
        Vm.SignedDelegation memory authorization = vm.signDelegation(implementation, SIGNER_PK);
        assertEq(authorization.nonce, beforeNonce);
        vm.attachDelegation(authorization);
        assertEq(signer.code, abi.encodePacked(hex"ef0100", implementation));
        // v1.7.1's cheatcode stages delegation without incrementing the authority
        // nonce. The separate Anvil type-4 transaction test checks that boundary.
        assertEq(vm.getNonce(signer), beforeNonce);
    }

    function test_Real7702_NoPolicyFallsBackForAllOperations() public {
        address signer = _attach(address(new DelegationWithoutPolicy()));
        assertEq(DelegationWithoutPolicy(signer).ping(), 42);
        for (uint8 op; op < 3; op++) {
            Scenario memory c = _prepare(Operation(op), signer);
            _reject(c, RELAYER, "", 2_000_000);
            _reject(c, RELAYER, _sign(c, OTHER_PK), 2_000_000);
            _accept(c, RELAYER, _sign(c, SIGNER_PK));
        }
    }

    function test_Real7702_PreapprovedEmptyPolicyForAllOperations() public {
        address signer = _attach(address(new DelegationPolicy(address(this))));
        for (uint8 op; op < 3; op++) {
            Scenario memory c = _prepare(Operation(op), signer);
            _reject(c, RELAYER, "", 2_000_000);
            DelegationPolicy(signer).approve(c.digest);
            _accept(c, RELAYER, "");
        }
    }

    function test_Real7702_PolicyDenialDoesNotRevokeUnderlyingKey() public {
        address signer = _attach(address(new DelegationPolicy(address(this))));
        for (uint8 op; op < 3; op++) {
            Scenario memory c = _prepare(Operation(op), signer);
            _reject(c, RELAYER, "", 2_000_000);
            _accept(c, RELAYER, _sign(c, SIGNER_PK));
        }
    }

    function test_Real7702_StaleAuthorizationCannotReplaceDelegate() public {
        address signer = vm.addr(SIGNER_PK);
        address staleTarget = address(new DelegationPolicy(address(this)));
        Vm.SignedDelegation memory stale = vm.signDelegation(staleTarget, SIGNER_PK);
        address currentTarget = address(new DelegationWithoutPolicy());
        _attach(currentTarget);
        vm.broadcast(SIGNER_PK);
        DelegationWithoutPolicy(currentTarget).ping();
        uint64 nonce = vm.getNonce(signer);
        // The broadcast consumes the sender nonce and the staged authorization.
        assertEq(nonce, stale.nonce + 2);
        (bool accepted,) = address(vm)
            .call(
                abi.encodeWithSignature(
                    "attachDelegation((uint8,bytes32,bytes32,uint64,address))", stale
                )
            );
        assertFalse(accepted);
        assertEq(signer.code, abi.encodePacked(hex"ef0100", currentTarget));
        assertEq(vm.getNonce(signer), nonce);
    }

    function test_Real7702_RegistryReplayAndWrongRootRemainAtomic() public {
        address signer = _attach(address(new DelegationWithoutPolicy()));
        Scenario memory c = _prepare(Operation.Commit, signer);
        bytes memory signature = _sign(c, SIGNER_PK);
        _accept(c, RELAYER, signature);
        _reject(c, RELAYER, signature, 2_000_000);
        bytes32 beforeState = _snapshot(c);
        IAgentMemoryState.ExperienceDelta memory delta = _delta(c.spaceId);
        delta.sequence = 2;
        delta.prevStateRoot = bytes32(uint256(1));
        _rejectDelta(c, delta, beforeState);
        (, bytes32 root,) = registry.head(c.spaceId);
        delta.sequence = 3;
        delta.prevStateRoot = root;
        _rejectDelta(c, delta, beforeState);
    }

    function _rejectDelta(
        Scenario memory c,
        IAgentMemoryState.ExperienceDelta memory delta,
        bytes32 beforeState
    ) internal {
        bytes memory sig = _keySignature(
            registry.signingDigest(registry.hashExperienceDelta(delta)), SIGNER_PK
        );
        vm.prank(RELAYER);
        (bool ok,) = address(registry).call(abi.encodeCall(registry.commitTransition, (delta, sig)));
        assertFalse(ok);
        assertEq(_snapshot(c), beforeState);
    }

    function test_Real7702_ConfigNonceRejectsReplayWithSameController() public {
        address signer = _attach(address(new DelegationWithoutPolicy()));
        Scenario memory c = _prepare(Operation.Rotate, signer);
        bytes32 digest = registry.signingDigest(
            registry.hashSpaceAuthorization(c.spaceId, signer, OTHER_AUTHORIZER, 1)
        );
        bytes memory sig = _keySignature(digest, SIGNER_PK);
        bytes memory data = abi.encodeCall(
            registry.updateSpaceAuthorization, (c.spaceId, signer, OTHER_AUTHORIZER, sig)
        );
        vm.prank(RELAYER);
        (bool first,) = address(registry).call(data);
        assertTrue(first);
        (address controller,, uint64 nonce) = registry.spaceAuthorization(c.spaceId);
        assertEq(controller, signer);
        assertEq(nonce, 1);
        bytes32 beforeState = _snapshot(c);
        vm.prank(RELAYER);
        (bool replay,) = address(registry).call(data);
        assertFalse(replay);
        assertEq(_snapshot(c), beforeState);
    }

    function test_ECDSAHighSAndInvalidVRejectAllOperations() public {
        uint256 order = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141;
        for (uint8 op; op < 3; op++) {
            Scenario memory c = _prepare(Operation(op), vm.addr(SIGNER_PK));
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_PK, c.digest);
            _reject(
                c,
                RELAYER,
                abi.encodePacked(r, bytes32(order - uint256(s)), uint8(v == 27 ? 28 : 27)),
                2_000_000
            );
            _reject(c, RELAYER, abi.encodePacked(r, s, uint8(0)), 2_000_000);
            _reject(c, RELAYER, abi.encodePacked(r, s, uint8(255)), 2_000_000);
            _accept(c, RELAYER, abi.encodePacked(r, s, v));
        }
    }

    function _safe() internal returns (Safe wallet) {
        handler = new CompatibilityFallbackHandler();
        messageLibrary = new SignMessageLib();
        wallet = Safe(payable(address(new SafeProxy(address(new Safe())))));
        address[] memory owners = new address[](2);
        owners[0] = vm.addr(SIGNER_PK);
        owners[1] = vm.addr(OTHER_PK);
        wallet.setup(
            owners, 2, address(0), "", address(handler), address(0), 0, payable(address(0))
        );
        assertEq(wallet.getThreshold(), 2);
        assertEq(wallet.VERSION(), "1.4.1");
    }

    function _keySignature(bytes32 digest, uint256 key) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r, s, v);
    }

    function _twoOwners(bytes32 digest) internal pure returns (bytes memory) {
        bytes memory a = _keySignature(digest, SIGNER_PK);
        bytes memory b = _keySignature(digest, OTHER_PK);
        return vm.addr(SIGNER_PK) < vm.addr(OTHER_PK) ? bytes.concat(a, b) : bytes.concat(b, a);
    }

    function _approveMessage(Safe wallet, bytes32 digest) internal {
        bytes memory data = abi.encodeCall(messageLibrary.signMessage, (abi.encode(digest)));
        bytes32 txHash = wallet.getTransactionHash(
            address(messageLibrary),
            0,
            data,
            Enum.Operation.DelegateCall,
            0,
            0,
            0,
            address(0),
            address(0),
            wallet.nonce()
        );
        bool ok = wallet.execTransaction(
            address(messageLibrary),
            0,
            data,
            Enum.Operation.DelegateCall,
            0,
            0,
            0,
            address(0),
            payable(address(0)),
            _twoOwners(txHash)
        );
        assertTrue(ok);
        bytes32 messageHash = handler.getMessageHashForSafe(wallet, abi.encode(digest));
        assertEq(wallet.signedMessages(messageHash), 1);
    }

    function test_RealSafe_ThresholdSignaturesForAllOperations() public {
        Safe wallet = _safe();
        for (uint8 op; op < 3; op++) {
            Scenario memory c = _prepare(Operation(op), address(wallet));
            bytes32 messageHash = handler.getMessageHashForSafe(wallet, abi.encode(c.digest));
            _reject(c, RELAYER, _keySignature(messageHash, SIGNER_PK), 2_000_000);
            _reject(c, RELAYER, _twoOwners(keccak256("wrong message")), 2_000_000);
            _accept(c, RELAYER, _twoOwners(messageHash));
        }
    }

    function test_RealSafe_ApprovedMessageAllowsRelayedEmptyAllOperations() public {
        Safe wallet = _safe();
        for (uint8 op; op < 3; op++) {
            Scenario memory c = _prepare(Operation(op), address(wallet));
            _reject(c, RELAYER, "", 2_000_000);
            _approveMessage(wallet, c.digest);
            _accept(c, RELAYER, "");
        }
    }

    function test_RealSafe_ApproveHashIsNotSignedMessageApproval() public {
        Safe wallet = _safe();
        Scenario memory c = _prepare(Operation.Commit, address(wallet));
        bytes32 messageHash = handler.getMessageHashForSafe(wallet, abi.encode(c.digest));
        vm.prank(vm.addr(SIGNER_PK));
        wallet.approveHash(messageHash);
        vm.prank(vm.addr(OTHER_PK));
        wallet.approveHash(messageHash);
        assertEq(wallet.signedMessages(messageHash), 0);
        _reject(c, RELAYER, "", 2_000_000);
        _approveMessage(wallet, c.digest);
        _accept(c, RELAYER, "");
    }

    function test_RealSafe_ApprovalDoesNotAuthorizeOtherSpace() public {
        Safe wallet = _safe();
        Scenario memory c = _prepare(Operation.Commit, address(wallet));
        _approveMessage(wallet, keccak256("different space digest"));
        _reject(c, RELAYER, "", 2_000_000);
    }
}

// Deploy the exact 0.8.24/Cancun artifacts, not this harness's 0.8.30 build.
contract RealAccountsProductTest is RealAccountCases {
    function _deploy() internal override returns (AgentMemoryStateRegistry) {
        return AgentMemoryStateRegistry(
            deployCode(
                "../contracts/out/AgentMemoryStateRegistry.sol/AgentMemoryStateRegistry.json"
            )
        );
    }
}

contract RealAccountsOfficialTest is RealAccountCases {
    function _deploy() internal override returns (AgentMemoryStateRegistry) {
        return AgentMemoryStateRegistry(
            deployCode(
                "../contracts/out/erc-8350/AgentMemoryStateRegistry.sol/AgentMemoryStateRegistry.json"
            )
        );
    }
}
