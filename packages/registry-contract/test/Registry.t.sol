// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/Registry.sol";

contract RegistryTest is Test {
    Registry registry;
    address owner = address(this);
    address other = address(0xBEEF);

    bytes32 identifier = keccak256("test-user");
    bytes32 spendingKey = keccak256("spending-key");
    bytes32 viewingKey = keccak256("viewing-key");
    uint32 preferredChain = 1000;
    string nickname = "alice";

    function setUp() public {
        registry = new Registry();
    }

    // --- register ---

    function test_register() public {
        registry.register(identifier, spendingKey, viewingKey, preferredChain, nickname);

        (bytes32 s, bytes32 v, uint32 chain, string memory nick, bool exists) = registry.lookup(identifier);
        assertEq(s, spendingKey);
        assertEq(v, viewingKey);
        assertEq(chain, preferredChain);
        assertEq(nick, nickname);
        assertTrue(exists);
    }

    function test_register_setsOwner() public {
        registry.register(identifier, spendingKey, viewingKey, preferredChain, nickname);
        assertEq(registry.getOwner(identifier), owner);
    }

    function test_register_emitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit Registry.Registered(identifier, owner, spendingKey, viewingKey, preferredChain, nickname);
        registry.register(identifier, spendingKey, viewingKey, preferredChain, nickname);
    }

    function test_register_revertsIfDuplicate() public {
        registry.register(identifier, spendingKey, viewingKey, preferredChain, nickname);
        vm.expectRevert(Registry.IdentifierAlreadyRegistered.selector);
        registry.register(identifier, spendingKey, viewingKey, preferredChain, "different");
    }

    // --- lookup ---

    function test_lookup_unknownReturnsFalse() public view {
        (, , , , bool exists) = registry.lookup(keccak256("unknown"));
        assertFalse(exists);
    }

    // --- getOwner ---

    function test_getOwner_unknownReturnsZero() public view {
        assertEq(registry.getOwner(keccak256("unknown")), address(0));
    }

    // --- updatePreferredChain ---

    function test_updatePreferredChain() public {
        registry.register(identifier, spendingKey, viewingKey, preferredChain, nickname);
        registry.updatePreferredChain(identifier, 2000);

        (, , uint32 chain, , ) = registry.lookup(identifier);
        assertEq(chain, 2000);
    }

    function test_updatePreferredChain_emitsEvent() public {
        registry.register(identifier, spendingKey, viewingKey, preferredChain, nickname);

        vm.expectEmit(true, false, false, true);
        emit Registry.ChainUpdated(identifier, preferredChain, 2000);
        registry.updatePreferredChain(identifier, 2000);
    }

    function test_updatePreferredChain_revertsIfNotOwner() public {
        registry.register(identifier, spendingKey, viewingKey, preferredChain, nickname);
        vm.prank(other);
        vm.expectRevert(Registry.NotOwner.selector);
        registry.updatePreferredChain(identifier, 2000);
    }

    function test_updatePreferredChain_revertsIfNotFound() public {
        vm.expectRevert(Registry.NotFound.selector);
        registry.updatePreferredChain(keccak256("unknown"), 2000);
    }

    // --- updateNickname ---

    function test_updateNickname() public {
        registry.register(identifier, spendingKey, viewingKey, preferredChain, nickname);
        registry.updateNickname(identifier, "bob");

        (, , , string memory nick, ) = registry.lookup(identifier);
        assertEq(nick, "bob");
    }

    function test_updateNickname_emitsEvent() public {
        registry.register(identifier, spendingKey, viewingKey, preferredChain, nickname);

        vm.expectEmit(true, false, false, true);
        emit Registry.NicknameUpdated(identifier, nickname, "bob");
        registry.updateNickname(identifier, "bob");
    }

    function test_updateNickname_revertsIfNotOwner() public {
        registry.register(identifier, spendingKey, viewingKey, preferredChain, nickname);
        vm.prank(other);
        vm.expectRevert(Registry.NotOwner.selector);
        registry.updateNickname(identifier, "hacker");
    }

    function test_updateNickname_revertsIfNotFound() public {
        vm.expectRevert(Registry.NotFound.selector);
        registry.updateNickname(keccak256("unknown"), "test");
    }
}
