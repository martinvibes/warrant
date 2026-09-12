// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentIdentity} from "../src/AgentIdentity.sol";

contract AgentIdentityTest is Test {
    AgentIdentity id;

    address operator = address(0xA11CE);
    address agent = address(0xBEEF);
    bytes key = new bytes(64);

    function setUp() public {
        id = new AgentIdentity();
        for (uint256 i = 0; i < 64; i++) key[i] = bytes1(uint8(i + 1));
    }

    function test_anyone_can_register_without_an_admin() public {
        vm.prank(operator);
        uint256 tokenId = id.register(agent, "ipfs://agent.json", key);

        assertEq(tokenId, 1);
        assertEq(id.ownerOf(tokenId), agent);
        assertEq(id.operatorOf(tokenId), operator);
        assertTrue(id.isRegistered(agent));
        assertEq(id.tokenURI(tokenId), "ipfs://agent.json");
    }

    function test_one_identity_per_agent_forever() public {
        vm.prank(operator);
        id.register(agent, "a", key);

        vm.prank(address(0xD00D));
        vm.expectRevert(abi.encodeWithSelector(AgentIdentity.AlreadyRegistered.selector, agent));
        id.register(agent, "b", key);
    }

    function test_identity_cannot_be_sold() public {
        vm.prank(operator);
        uint256 tokenId = id.register(agent, "a", key);

        vm.prank(agent);
        vm.expectRevert(AgentIdentity.Soulbound.selector);
        id.transferFrom(agent, address(0xD00D), tokenId);
    }

    function test_encryption_key_is_readable_by_address() public {
        vm.prank(operator);
        id.register(agent, "a", key);
        assertEq(id.encryptionKeyFor(agent), key);
    }

    function test_registering_without_a_key_means_no_sealed_mail() public {
        vm.prank(operator);
        id.register(agent, "a", "");
        assertEq(id.encryptionKeyFor(agent).length, 0);
    }

    function test_malformed_encryption_key_is_refused() public {
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(AgentIdentity.BadEncryptionKey.selector, uint256(5)));
        id.register(agent, "a", hex"0102030405");
    }

    function test_only_the_operator_rotates_the_key() public {
        vm.prank(operator);
        uint256 tokenId = id.register(agent, "a", key);

        vm.prank(address(0xD00D));
        vm.expectRevert(abi.encodeWithSelector(AgentIdentity.NotOperator.selector, tokenId, address(0xD00D)));
        id.setEncryptionKey(tokenId, key);
    }
}
