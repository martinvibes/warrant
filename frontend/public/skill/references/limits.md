# The on-chain limit

The part that is not like other pay-per-call services. An owner's spending
decision lives in a contract on Hedera, not in this service's database, so the
refusal of an out-of-scope purchase is a fact anyone can check and it holds even
if this service disappears.

Three contracts, all at `GET /v1/contracts`:

| Contract | Job |
|---|---|
| `AgentIdentity` | The soulbound token and the published encryption key |
| `ResourceMarket` | Listings: a kind, an endpoint, an asset, a price. Permissionless |
| `AgentTreasury` | Holds the float, holds one policy per agent, and decides every draw |

## Setting a policy

Only the treasury's owner can. One policy per agent address:

```solidity
setPolicy(
  address agent,
  uint128 totalCap,      // atomic USDC over the policy's whole life
  uint128 windowCap,     // atomic USDC per window; 0 disables the window
  uint64  windowSeconds, // e.g. 86400 for a day; 0 disables the window
  uint64  expiry,        // unix seconds; 0 never expires
  string[] kindNames     // "inference", "email.send", … hashed to keccak256
)
```

Setting a policy replaces the previous allowlist entirely rather than adding to
it. `revoke(agent)` stops the next draw without touching what was already drawn.

## Drawing

The agent names what it wants to buy and how many calls, never the sum:

```solidity
draw(uint256 listingId, uint32 calls) returns (uint256 drawId, uint256 amount)
```

The amount comes from the listing's published price, so an agent cannot draw
more by asking for more. Find the listing with
`ResourceMarket.cheapest(keccak256("inference"))`.

The contract checks, in this order: the listing is active, its asset is the
treasury's asset, the policy exists and is active, it has not expired, the kind
is allowed, the lifetime cap has room, the window has room, and the treasury
actually holds the money. Then it transfers and emits `Drawn`.

## Closing the loop

```solidity
recordSettlement(uint256 drawId, string settlementRef, uint256 amount)
```

Only the account that drew can call it, and a settlement reference is accepted
once. This is what makes the chain hold the whole story rather than only the
half where money left.

## Reading the budget

```solidity
remaining(address agent) returns (uint256 total_, uint256 window_, uint64 windowResetsAt)
```

The question an agent asks before deciding whether it can afford a plan. Both
numbers are floored at zero, so an owner lowering a cap below what was already
drawn is a valid way to say stop and still leaves the agent able to read its own
budget.

## The refusals, in the contract's own words

```
NoPolicy(agent)                                    nothing was ever granted
PolicyExpired(expiry)
KindNotAllowed(kind)                               keccak256 of the kind name
TotalCapExceeded(wanted, remaining)
WindowCapExceeded(wanted, remaining, resetsAt)     resetsAt is a unix second
InsufficientBalance(wanted, held)                  the treasury is empty
ListingInactive(listingId)
WrongAsset(expected, got)
```

These are reverts, not HTTP errors. `WindowCapExceeded` carries the instant the
window reopens, so an agent that is told no is also told when to ask again.

## What the limit does not do

It binds draws, not the wallet. Once drawn, the float is the agent's to spend
anywhere, including somewhere nobody authorised. A smaller window narrows the
exposure; it does not close it. Say so plainly rather than claiming the agent
cannot misspend.

The window is fixed, not sliding: it resets at a known instant, which is cheap
to store and is a number the agent can plan around.
