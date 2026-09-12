// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentTreasury} from "../src/AgentTreasury.sol";
import {ResourceMarket} from "../src/ResourceMarket.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract AgentTreasuryTest is Test {
    MockUSDC usdc;
    ResourceMarket market;
    AgentTreasury treasury;

    address human = address(0xA11CE);
    address agent = address(0xBEEF);
    address seller = address(0x5E11E);

    uint256 inferenceId;
    uint256 emailId;

    uint256 constant CENT = 10_000; // USDC has six decimals
    uint256 constant DOLLAR = 1_000_000;

    function setUp() public {
        usdc = new MockUSDC();
        market = new ResourceMarket();

        vm.startPrank(seller);
        inferenceId = market.list("inference", "https://warrant.example/v1/infer", address(usdc), 2 * CENT);
        emailId = market.list("email.send", "https://warrant.example/v1/email", address(usdc), 20 * CENT);
        vm.stopPrank();

        vm.prank(human);
        treasury = new AgentTreasury(usdc, market);

        usdc.mint(human, 100 * DOLLAR);
        vm.startPrank(human);
        usdc.approve(address(treasury), type(uint256).max);
        treasury.fund(50 * DOLLAR);
        vm.stopPrank();
    }

    function _allowInferenceOnly(uint128 totalCap, uint128 windowCap, uint64 windowSeconds) internal {
        string[] memory kinds = new string[](1);
        kinds[0] = "inference";
        vm.prank(human);
        treasury.setPolicy(agent, totalCap, windowCap, windowSeconds, 0, kinds);
    }

    function test_agent_draws_without_asking_anyone() public {
        _allowInferenceOnly(uint128(5 * DOLLAR), 0, 0);

        vm.prank(agent);
        (uint256 drawId, uint256 amount) = treasury.draw(inferenceId, 10);

        assertEq(drawId, 1);
        assertEq(amount, 20 * CENT, "ten calls at two cents");
        assertEq(usdc.balanceOf(agent), 20 * CENT);
    }

    function test_amount_comes_from_the_listing_not_from_the_agent() public {
        _allowInferenceOnly(uint128(5 * DOLLAR), 0, 0);

        // The agent names a listing and a call count. There is no argument it
        // can use to inflate the sum, so raising the price is the seller's
        // decision alone.
        vm.prank(agent);
        (, uint256 amount) = treasury.draw(inferenceId, 1);
        assertEq(amount, 2 * CENT);

        vm.prank(seller);
        market.setPrice(inferenceId, 3 * CENT);

        vm.prank(agent);
        (, uint256 after_) = treasury.draw(inferenceId, 1);
        assertEq(after_, 3 * CENT);
    }

    function test_lifetime_cap_stops_the_agent() public {
        _allowInferenceOnly(uint128(10 * CENT), 0, 0);

        vm.prank(agent);
        treasury.draw(inferenceId, 5); // 10 cents, exactly the cap

        vm.prank(agent);
        vm.expectRevert(abi.encodeWithSelector(AgentTreasury.TotalCapExceeded.selector, 2 * CENT, 0));
        treasury.draw(inferenceId, 1);
    }

    function test_daily_cap_stops_a_runaway_then_resets() public {
        // Five dollars lifetime, one dollar a day. A balance cap alone could
        // not express the second half of that sentence.
        _allowInferenceOnly(uint128(5 * DOLLAR), uint128(1 * DOLLAR), 1 days);

        vm.prank(agent);
        treasury.draw(inferenceId, 50); // one dollar

        vm.prank(agent);
        vm.expectRevert(
            abi.encodeWithSelector(
                AgentTreasury.WindowCapExceeded.selector, 2 * CENT, 0, uint64(block.timestamp + 1 days)
            )
        );
        treasury.draw(inferenceId, 1);

        skip(1 days);

        vm.prank(agent);
        (, uint256 amount) = treasury.draw(inferenceId, 1);
        assertEq(amount, 2 * CENT, "the window reopened");
    }

    function test_daily_cap_never_exceeds_what_is_left_overall() public {
        _allowInferenceOnly(uint128(50 * CENT), uint128(1 * DOLLAR), 1 days);

        vm.prank(agent);
        treasury.draw(inferenceId, 20); // 40 cents of a 50 cent life

        (uint256 total_, uint256 window_,) = treasury.remaining(agent);
        assertEq(total_, 10 * CENT);
        assertEq(window_, 10 * CENT, "the window cannot promise more than remains");
    }

    function test_agent_cannot_buy_a_kind_it_was_not_given() public {
        _allowInferenceOnly(uint128(5 * DOLLAR), 0, 0);

        vm.prank(agent);
        vm.expectRevert(
            abi.encodeWithSelector(AgentTreasury.KindNotAllowed.selector, keccak256(bytes("email.send")))
        );
        treasury.draw(emailId, 1);
    }

    function test_revoking_takes_effect_on_the_next_draw() public {
        _allowInferenceOnly(uint128(5 * DOLLAR), 0, 0);

        vm.prank(agent);
        treasury.draw(inferenceId, 1);

        vm.prank(human);
        treasury.revoke(agent);

        vm.prank(agent);
        vm.expectRevert(abi.encodeWithSelector(AgentTreasury.NoPolicy.selector, agent));
        treasury.draw(inferenceId, 1);
    }

    function test_an_agent_with_no_policy_can_draw_nothing() public {
        vm.prank(address(0xDEAD));
        vm.expectRevert(abi.encodeWithSelector(AgentTreasury.NoPolicy.selector, address(0xDEAD)));
        treasury.draw(inferenceId, 1);
    }

    function test_raising_a_cap_does_not_refund_what_was_spent() public {
        _allowInferenceOnly(uint128(10 * CENT), 0, 0);

        vm.prank(agent);
        treasury.draw(inferenceId, 5); // spends the lot

        _allowInferenceOnly(uint128(20 * CENT), 0, 0); // owner doubles the cap

        (uint256 total_,,) = treasury.remaining(agent);
        assertEq(total_, 10 * CENT, "the new headroom is the difference, not the whole cap");
    }

    function test_only_the_owner_sets_policy() public {
        string[] memory kinds = new string[](1);
        kinds[0] = "inference";

        vm.prank(agent);
        vm.expectRevert(abi.encodeWithSelector(AgentTreasury.NotOwner.selector, agent));
        treasury.setPolicy(agent, type(uint128).max, 0, 0, 0, kinds);
    }

    function test_a_settlement_is_recorded_once() public {
        _allowInferenceOnly(uint128(5 * DOLLAR), 0, 0);

        vm.prank(agent);
        (uint256 drawId,) = treasury.draw(inferenceId, 1);

        vm.prank(agent);
        treasury.recordSettlement(drawId, "0.0.4242@1757700000.000000001", 2 * CENT);

        vm.prank(agent);
        vm.expectRevert(
            abi.encodeWithSelector(AgentTreasury.AlreadySettled.selector, "0.0.4242@1757700000.000000001")
        );
        treasury.recordSettlement(drawId, "0.0.4242@1757700000.000000001", 2 * CENT);
    }

    function test_policy_expiry_ends_the_run() public {
        string[] memory kinds = new string[](1);
        kinds[0] = "inference";
        uint64 expiry = uint64(block.timestamp + 1 hours);
        vm.prank(human);
        treasury.setPolicy(agent, uint128(5 * DOLLAR), 0, 0, expiry, kinds);

        vm.prank(agent);
        treasury.draw(inferenceId, 1);

        skip(2 hours);

        vm.prank(agent);
        vm.expectRevert(abi.encodeWithSelector(AgentTreasury.PolicyExpired.selector, expiry));
        treasury.draw(inferenceId, 1);
    }

    function test_a_new_policy_clears_the_old_allowlist() public {
        string[] memory both = new string[](2);
        both[0] = "inference";
        both[1] = "email.send";
        vm.prank(human);
        treasury.setPolicy(agent, uint128(5 * DOLLAR), 0, 0, 0, both);

        vm.prank(agent);
        treasury.draw(emailId, 1);

        _allowInferenceOnly(uint128(5 * DOLLAR), 0, 0); // email dropped

        vm.prank(agent);
        vm.expectRevert(
            abi.encodeWithSelector(AgentTreasury.KindNotAllowed.selector, keccak256(bytes("email.send")))
        );
        treasury.draw(emailId, 1);
    }
}
