# Decisions

The non-obvious choices, each with what it cost.

## The agent is not asked for permission

The first version of this project put a human signature in front of every
purchase. It worked, and it was the wrong product. An agent that has to wait for
a person is not an autonomous buyer, it is a form with extra steps. What people
actually want is the thing they already have with a card: a limit, set once,
that they do not think about again.

**Cost.** Nothing prevents a compromised agent buying the wrong permitted thing.
The limit bounds how much damage, not what kind.

## The money lives one step away from the agent

The obvious design funds the agent's wallet and calls the balance a cap. That
cap is a suggestion, because the agent holds the keys and can spend it all in an
hour. Putting the balance in a contract the agent draws from makes the limit
real while leaving the agent free to draw without asking anyone.

**Cost.** A draw is a transaction, so it costs gas and takes seconds. The agent
keeps a float to avoid paying that on every purchase, which means the limit
binds draws rather than the wallet. Smaller tranches narrow the window; they do
not close it.

## Two ceilings, not one

A lifetime cap bounds total damage. A rolling window cap bounds how fast the
damage can happen. Every wallet-cap product has the first and none of them have
the second, which is why none of them can express "five dollars a day", the
limit most people actually want.

**Cost.** A fixed window, not a sliding one. An agent can spend the end of one
window and the start of the next back to back. Sliding would need per-purchase
history on chain, and the storage is not worth it.

## A draw is priced from the chain, not from the request

`draw(listingId, calls)` rather than `draw(amount)`. The agent names what it
wants to buy and how much of it; the contract reads the price from the market.
There is no argument an agent can use to inflate the sum.

**Cost.** A seller can raise a price between the agent's plan and its draw. The
agent sees the new price in the revert, so it is visible rather than silent.

## Registration and listing are permissionless

The registries this borrows from gate both behind an admin key. That makes the
result a customer list with a blockchain attached: an agent browsing the
catalogue is browsing one company's inventory and trusting that company's API to
report the price honestly.

**Cost.** Anyone can list anything, including a listing that points at an
endpoint that never delivers. Reputation has to come from history, which is why
identity is soulbound.

## Identity cannot be transferred

An agent's history is the only thing that makes its identity worth anything, and
history does not survive a sale. Transfer is refused rather than discouraged.

**Cost.** An operator who loses the key loses the identity, permanently. The
operator can be changed; the token cannot move.

## The encryption key is published on chain

An EVM address is a hash of a public key and cannot be turned back into one, so
sealing a message to an agent needs the key itself somewhere both sides already
trust. Putting it beside the identity means sealed mail needs no key exchange
and no directory to trust.

**Cost.** One more field to keep current. Rotating it makes older ciphertext
undecryptable by the new key, which is correct but is a footgun if unnoticed.

## Memory is written to keyless Hedera files

A file created with no keys cannot be updated or deleted by anyone, this service
included. An agent writing a memory is not trusting us to stay honest about it
afterwards.

**Cost.** Nothing can be corrected and nothing can be taken back. Content is
capped at one transaction's worth and oversized writes are refused rather than
truncated, because a memory silently cut short is permanent too.

## The claimed account must be the paying account

Everything an agent owns here is keyed to its account: its inboxes, its numbers,
its memory. Without this check an agent could pay from its own account while
claiming another's and buy things into someone else's name. The check runs after
signing and before settlement, so a refusal costs nothing.

**Cost.** One header the caller has to get right, and a refusal that reads as
pedantic until you see why it exists.

## Purchases are recorded twice

The local row is fast to read and carries the response body. The on-chain
settlement record is slow, costs gas, and cannot be edited by us. Anything a
buyer needs to trust should be read from the second one.

**Cost.** Two records that can disagree if a settlement write fails. The
on-chain one is authoritative and the local one is a cache, which is stated
rather than implied.

## Every read is public

No wallet, no login, no key on the ledger, the agent pages or the catalogue. An
audit trail you have to authenticate into is not an audit trail.

**Cost.** An agent's spending is visible to anyone who knows its account id.
That is the trade: spending history is only useful as reputation if the people
who would rely on it can see it.
