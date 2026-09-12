// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AgentIdentity} from "../src/AgentIdentity.sol";
import {ResourceMarket} from "../src/ResourceMarket.sol";
import {AgentTreasury} from "../src/AgentTreasury.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @notice Deploys the three contracts and seeds the catalogue with what this
 *         service sells, so an agent can discover the whole shop on chain.
 *
 *   forge script script/Deploy.s.sol --rpc-url hedera_testnet --broadcast
 *
 * Reads USDC_ADDRESS (the settlement token's EVM address) and PUBLIC_URL (the
 * base URL agents should send payment to) from the environment.
 */
contract Deploy is Script {
    /// @dev Six decimals, so a cent is 10_000.
    uint256 constant CENT = 10_000;

    function run() external {
        address usdc = vm.envAddress("USDC_ADDRESS");
        string memory base = vm.envString("PUBLIC_URL");

        vm.startBroadcast();

        AgentIdentity identity = new AgentIdentity();
        ResourceMarket market = new ResourceMarket();
        AgentTreasury treasury = new AgentTreasury(IERC20(usdc), market);

        market.list("identity.mint", string.concat(base, "/v1/identity/mint"), usdc, 10 * CENT);
        market.list("inference", string.concat(base, "/v1/inference"), usdc, 2 * CENT);
        market.list("email.send", string.concat(base, "/v1/email/send"), usdc, 20 * CENT);
        market.list("email.sealed", string.concat(base, "/v1/email/sealed"), usdc, 25 * CENT);
        market.list("email.inbox", string.concat(base, "/v1/email/inbox"), usdc, 100 * CENT);
        market.list("memory.write", string.concat(base, "/v1/memory"), usdc, 5 * CENT);
        market.list("phone.provision", string.concat(base, "/v1/phone/provision"), usdc, 50 * CENT);
        market.list("sms.send", string.concat(base, "/v1/sms"), usdc, 1 * CENT);

        vm.stopBroadcast();

        console.log("IDENTITY_CONTRACT=%s", address(identity));
        console.log("MARKET_CONTRACT=%s", address(market));
        console.log("TREASURY_CONTRACT=%s", address(treasury));
        console.log("listings seeded: %s", market.total());
    }
}
