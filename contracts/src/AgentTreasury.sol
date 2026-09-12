// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ResourceMarket} from "./ResourceMarket.sol";

/**
 * @title AgentTreasury
 * @notice Where an agent's money lives, and the arithmetic that decides how
 *         much of it the agent may hold at once.
 *
 * The problem with funding an agent directly is that the limit becomes a
 * suggestion: the agent holds the keys, so nothing stops it spending the lot in
 * an hour. Keeping the balance one step away makes the limit real without
 * putting a human in the loop. The agent draws what it needs, when it needs it,
 * in a single transaction that asks nobody's permission.
 *
 * Two ceilings, because one is not enough. A lifetime cap bounds the damage
 * overall; a rolling window cap bounds how fast the damage can happen. A
 * balance cap alone, which is the usual design, cannot express "five dollars a
 * day" and so cannot stop a runaway agent from emptying its allowance before
 * anyone is awake to notice.
 *
 * A draw is priced from the market's on-chain listing rather than from an
 * amount the agent names, so the agent cannot inflate what it asks for.
 */
contract AgentTreasury is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Policy {
        /// @dev Lifetime ceiling in the asset's smallest unit. Zero disables the agent.
        uint128 totalCap;
        /// @dev Ceiling within one window. Zero means the lifetime cap is the only limit.
        uint128 windowCap;
        /// @dev Window length in seconds. Ignored when windowCap is zero.
        uint64 windowSeconds;
        /// @dev Unix seconds after which no draw succeeds. Zero means no expiry.
        uint64 expiry;
        bool active;
    }

    struct Usage {
        uint128 drawnTotal;
        uint128 drawnWindow;
        uint64 windowStart;
    }

    /// @notice Settlement asset every policy is denominated in.
    IERC20 public immutable asset;
    /// @notice Catalogue draws are priced against.
    ResourceMarket public immutable market;
    /// @notice Who funds the treasury and sets policy.
    address public owner;

    mapping(address => Policy) public policyOf;
    mapping(address => Usage) public usageOf;

    /// @dev agent => kind => allowed. An agent with no allowed kinds can draw nothing.
    mapping(address => mapping(bytes32 => bool)) public allows;
    /// @dev Kept so a new policy can clear the previous allowlist.
    mapping(address => bytes32[]) private _allowed;

    uint256 public nextDrawId = 1;
    /// @dev Draw id => the agent that drew, for settlement records.
    mapping(uint256 => address) public drawnBy;
    /// @dev Settlement references already recorded, so a receipt posts once.
    mapping(bytes32 => bool) public settled;

    event OwnerChanged(address indexed from, address indexed to);
    event Funded(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event PolicySet(
        address indexed agent,
        uint128 totalCap,
        uint128 windowCap,
        uint64 windowSeconds,
        uint64 expiry,
        bytes32[] kinds
    );
    event PolicyRevoked(address indexed agent);
    event Drawn(
        uint256 indexed drawId,
        address indexed agent,
        uint256 indexed listingId,
        bytes32 kind,
        uint32 calls,
        uint256 amount
    );
    event Settled(uint256 indexed drawId, address indexed agent, string settlementRef, uint256 amount);

    error NotOwner(address caller);
    error ZeroAddress();
    error NoPolicy(address agent);
    error PolicyExpired(uint64 expiry);
    error KindNotAllowed(bytes32 kind);
    error ListingInactive(uint256 listingId);
    error WrongAsset(address expected, address got);
    error TotalCapExceeded(uint256 wanted, uint256 remaining);
    error WindowCapExceeded(uint256 wanted, uint256 remaining, uint64 resetsAt);
    error InsufficientBalance(uint256 wanted, uint256 held);
    error NoCalls();
    error NotDrawer(uint256 drawId, address caller);
    error AlreadySettled(string settlementRef);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner(msg.sender);
        _;
    }

    constructor(IERC20 asset_, ResourceMarket market_) {
        if (address(asset_) == address(0) || address(market_) == address(0)) revert ZeroAddress();
        asset = asset_;
        market = market_;
        owner = msg.sender;
    }

    function transferOwnership(address to) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        emit OwnerChanged(owner, to);
        owner = to;
    }

    // --- funding -----------------------------------------------------------

    /// @notice Move `amount` of the asset in. Requires an allowance first.
    function fund(uint256 amount) external {
        asset.safeTransferFrom(msg.sender, address(this), amount);
        emit Funded(msg.sender, amount);
    }

    function withdraw(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        asset.safeTransfer(to, amount);
        emit Withdrawn(to, amount);
    }

    function balance() external view returns (uint256) {
        return asset.balanceOf(address(this));
    }

    // --- policy ------------------------------------------------------------

    /**
     * @notice Set what `agent` may draw and on what.
     * @dev Replaces any previous policy and allowlist outright. Usage is not
     *      reset: raising a cap should not hand back what has already been
     *      spent, or a cap could be topped up in a loop.
     */
    function setPolicy(
        address agent,
        uint128 totalCap,
        uint128 windowCap,
        uint64 windowSeconds,
        uint64 expiry,
        string[] calldata kindNames
    ) external onlyOwner {
        if (agent == address(0)) revert ZeroAddress();

        bytes32[] storage previous = _allowed[agent];
        for (uint256 i = 0; i < previous.length; i++) {
            allows[agent][previous[i]] = false;
        }
        delete _allowed[agent];

        bytes32[] memory kinds = new bytes32[](kindNames.length);
        for (uint256 i = 0; i < kindNames.length; i++) {
            bytes32 kind = keccak256(bytes(kindNames[i]));
            kinds[i] = kind;
            if (!allows[agent][kind]) {
                allows[agent][kind] = true;
                _allowed[agent].push(kind);
            }
        }

        policyOf[agent] = Policy({
            totalCap: totalCap,
            windowCap: windowCap,
            windowSeconds: windowSeconds,
            expiry: expiry,
            active: true
        });

        emit PolicySet(agent, totalCap, windowCap, windowSeconds, expiry, kinds);
    }

    /// @notice Stop an agent drawing. Takes effect on its next draw.
    function revoke(address agent) external onlyOwner {
        policyOf[agent].active = false;
        emit PolicyRevoked(agent);
    }

    function allowedKinds(address agent) external view returns (bytes32[] memory) {
        return _allowed[agent];
    }

    // --- drawing -----------------------------------------------------------

    /**
     * @notice Draw enough to pay for `calls` calls of `listingId`.
     * @dev The amount comes from the listing's published price, so the agent
     *      names what it wants to buy and how much of it, never the sum.
     */
    function draw(uint256 listingId, uint32 calls)
        external
        nonReentrant
        returns (uint256 drawId, uint256 amount)
    {
        if (calls == 0) revert NoCalls();

        ResourceMarket.Listing memory l = market.get(listingId);
        if (!l.active) revert ListingInactive(listingId);
        if (l.asset != address(asset)) revert WrongAsset(address(asset), l.asset);

        Policy memory p = policyOf[msg.sender];
        if (!p.active || p.totalCap == 0) revert NoPolicy(msg.sender);
        if (p.expiry != 0 && block.timestamp >= p.expiry) revert PolicyExpired(p.expiry);
        if (!allows[msg.sender][l.kind]) revert KindNotAllowed(l.kind);

        amount = l.price * calls;

        Usage memory u = usageOf[msg.sender];

        uint256 remainingTotal = uint256(p.totalCap) - u.drawnTotal;
        if (amount > remainingTotal) revert TotalCapExceeded(amount, remainingTotal);

        if (p.windowCap != 0 && p.windowSeconds != 0) {
            // A fixed window, not a sliding one: cheap to store, and the reset
            // instant is a number the agent can be told and can plan around.
            if (u.windowStart == 0 || block.timestamp >= uint256(u.windowStart) + p.windowSeconds) {
                u.windowStart = uint64(block.timestamp);
                u.drawnWindow = 0;
            }
            uint256 remainingWindow = uint256(p.windowCap) - u.drawnWindow;
            if (amount > remainingWindow) {
                revert WindowCapExceeded(amount, remainingWindow, u.windowStart + p.windowSeconds);
            }
            u.drawnWindow += uint128(amount);
        }

        uint256 held = asset.balanceOf(address(this));
        if (amount > held) revert InsufficientBalance(amount, held);

        u.drawnTotal += uint128(amount);
        usageOf[msg.sender] = u;

        drawId = nextDrawId++;
        drawnBy[drawId] = msg.sender;

        asset.safeTransfer(msg.sender, amount);
        emit Drawn(drawId, msg.sender, listingId, l.kind, calls, amount);
    }

    /**
     * @notice Record the settlement a draw paid for, so the chain holds the
     *         whole story and not just the half where money left.
     * @param settlementRef The x402 settlement identifier, recorded once.
     */
    function recordSettlement(uint256 drawId, string calldata settlementRef, uint256 amount) external {
        if (drawnBy[drawId] != msg.sender) revert NotDrawer(drawId, msg.sender);
        bytes32 ref = keccak256(bytes(settlementRef));
        if (settled[ref]) revert AlreadySettled(settlementRef);
        settled[ref] = true;
        emit Settled(drawId, msg.sender, settlementRef, amount);
    }

    // --- reading -----------------------------------------------------------

    /**
     * @notice What `agent` may still draw right now, which is the question the
     *         agent asks before deciding whether it can afford a plan.
     */
    function remaining(address agent)
        external
        view
        returns (uint256 total_, uint256 window_, uint64 windowResetsAt)
    {
        Policy memory p = policyOf[agent];
        if (!p.active) return (0, 0, 0);

        Usage memory u = usageOf[agent];
        total_ = uint256(p.totalCap) - u.drawnTotal;

        if (p.windowCap == 0 || p.windowSeconds == 0) return (total_, total_, 0);

        if (u.windowStart == 0 || block.timestamp >= uint256(u.windowStart) + p.windowSeconds) {
            window_ = p.windowCap;
            windowResetsAt = uint64(block.timestamp) + p.windowSeconds;
        } else {
            window_ = uint256(p.windowCap) - u.drawnWindow;
            windowResetsAt = u.windowStart + p.windowSeconds;
        }
        if (window_ > total_) window_ = total_;
    }
}
