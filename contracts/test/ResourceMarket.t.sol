// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ResourceMarket} from "../src/ResourceMarket.sol";

contract ResourceMarketTest is Test {
    ResourceMarket market;

    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    address usdc = address(0x05DC);

    function setUp() public {
        market = new ResourceMarket();
    }

    function test_anyone_may_list_without_asking() public {
        vm.prank(alice);
        uint256 id = market.list("inference", "https://a.example/infer", usdc, 20_000);

        ResourceMarket.Listing memory l = market.get(id);
        assertEq(l.seller, alice);
        assertEq(l.kindName, "inference");
        assertEq(l.price, 20_000);
        assertTrue(l.active);
        assertEq(market.total(), 1);
    }

    function test_a_buyer_finds_the_cheapest_seller_of_a_kind() public {
        vm.prank(alice);
        market.list("inference", "https://a.example/infer", usdc, 20_000);
        vm.prank(bob);
        uint256 cheap = market.list("inference", "https://b.example/infer", usdc, 9_000);

        (uint256 id, uint256 price) = market.cheapest(market.kindId("inference"));
        assertEq(id, cheap);
        assertEq(price, 9_000);
    }

    function test_a_deactivated_listing_drops_out_of_the_search() public {
        vm.prank(alice);
        uint256 dear = market.list("inference", "https://a.example/infer", usdc, 20_000);
        vm.prank(bob);
        uint256 cheap = market.list("inference", "https://b.example/infer", usdc, 9_000);

        vm.prank(bob);
        market.setActive(cheap, false);

        (uint256 id,) = market.cheapest(market.kindId("inference"));
        assertEq(id, dear);
    }

    function test_nothing_for_sale_returns_nothing() public view {
        (uint256 id, uint256 price) = market.cheapest(market.kindId("nobody.sells.this"));
        assertEq(id, 0);
        assertEq(price, 0);
    }

    function test_only_the_seller_repricing_their_own_listing() public {
        vm.prank(alice);
        uint256 id = market.list("inference", "https://a.example/infer", usdc, 20_000);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(ResourceMarket.NotSeller.selector, id, bob));
        market.setPrice(id, 1);
    }

    function test_listings_are_indexed_by_kind_and_by_seller() public {
        vm.startPrank(alice);
        uint256 one = market.list("inference", "https://a.example/infer", usdc, 20_000);
        uint256 two = market.list("email.send", "https://a.example/email", usdc, 200_000);
        vm.stopPrank();

        assertEq(market.idsBySeller(alice).length, 2);
        assertEq(market.idsByKind(market.kindId("inference"))[0], one);
        assertEq(market.idsByKind(market.kindId("email.send"))[0], two);
    }

    function test_an_unlisted_id_is_not_found() public {
        vm.expectRevert(abi.encodeWithSelector(ResourceMarket.NotFound.selector, uint256(99)));
        market.get(99);
    }
}
