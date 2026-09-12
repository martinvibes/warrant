# Decisions

The choices that shaped this repository, and what each one cost.

## The product is a purchase order, not a spending cap

Wallet-level spending limits already exist and several teams ship them. A cap
answers one question — how much — and it answers it after the fact, as a
balance that went down.

The failures worth preventing are not "the agent spent too much". They are
"the agent spent the right amount on the wrong thing", "the agent was talked
into a purchase nobody asked for", and "nobody can say what this line of spend
was for". None of those are quantity problems, so none of them are solved by a
smaller number.

So a warrant names the agent, the resources, the purpose and the deadline as
well as the ceiling — and refuses on any of them.

**Cost:** more to sign, and an owner has to think about scope up front. That is
mitigated by making signing free and instant; if it cost gas, nobody would
scope tightly.

## Checks run at the earliest moment they are possible

The x402 SDK offers three hooks, and the temptation is to do all the work in
one of them. Instead each check sits at the first point it can be answered.

| Hook | Money | Why here |
| --- | --- | --- |
| `onProtectedRequest` | none asked for | Authorisation needs no payment to evaluate, so evaluating it after a payment would be charging for the privilege of being refused. |
| `onAfterVerify` | signed, unsettled | Before a signature there is no payer to compare against the warrant. This is the first moment the question exists. |
| `onAfterSettle` | moved | A receipt is a claim that something was bought. Writing one before settlement would make it a prediction. |

**Consequence:** a refused request never becomes a payment, so there is nothing
to refund and nothing to reconcile.

## The warrant id is the hash of the warrant

Rather than assigning an id, the id is the EIP-712 hash of the contents.

Two parties can name the same warrant without coordinating. More usefully,
tampering stops being a category: an edited warrant is a *different* warrant
with a different id, and its signature recovers to a different address. The
service reports which address it recovered, because a mismatch is an attempt
rather than a typo.

**Cost:** a warrant cannot be amended, only replaced. That is the right trade
for a document whose whole job is to be fixed at signing time.

## Spend is summed, never counted

Every request recomputes spend by summing settled receipts for that warrant
instead of reading a running total.

A cap is only as trustworthy as the number it is compared against. A counter
drifts: a crash between settlement and increment, a double-increment on retry,
a migration that resets it. The sum cannot drift, because it is derived from
the same rows a human would audit.

**Cost:** an aggregate query per request. At these volumes it is a SQLite index
scan; if it ever stops being cheap, the fix is a materialised total checked
against the sum, not a counter that replaces it.

## Money is atomic everywhere

Prices, caps and spend are integers in the asset's smallest unit, from the CLI
through the signature to the console. The only conversion is at display.

A cap that drifts by a rounding step is a cap that can be walked past, and
floats drift. `0.1 + 0.2` is the whole argument.

## Revocation is a message, not a transaction

Withdrawing a warrant is a second signed message. No gas, no block time,
effective on the agent's next request.

If revoking cost money or took a block, it would happen slowly and reluctantly
and sometimes not at all, which is exactly wrong for the one control you reach
for when something has already gone wrong.

It is signed rather than merely asserted because "stop this agent spending" is
precisely the instruction an attacker would like to forge in the other
direction. Revocations older than five minutes are rejected so a leaked one
cannot be held and replayed against a warrant issued later.

**Cost:** revocation is only as available as the service. A service that is
down cannot be told to stop — but it also cannot settle a payment, so the
failure is safe.

## The audit surface needs no credentials

Every read the console makes is public: warrants, receipts, refusals, pricing.

A ledger that publishes only its successes says nothing about what it
prevented. The refusals are the claim this product makes, so they have to be as
visible as the purchases, and verifiable by somebody who does not trust the
operator.

**Cost:** purposes and agent ids are public. For this service that is the
point. A deployment with sensitive purposes would need a per-owner read scope,
which is a change to who may read rather than to what is recorded.

## Hedera and a sponsored fee

Pay-per-request only makes sense where the fee is not the purchase. Five cents
of inference cannot carry a cent of gas.

Hedera gives fixed fractional-cent fees, seconds to finality, and USDC as a
native token. The Blocky402 facilitator sponsors the network fee, so a paying
agent needs USDC and no HBAR. An agent that must hold two assets to buy one
thing is an agent that gets stuck holding the wrong one.

## The browser signs, it does not pay

The console has no payment path. Paying is the agent's job, from a Hedera
account, in a process the human does not run.

Keeping the owner's key and the agent's key in different processes is what
makes the separation real rather than a comment in a file. It also means the
console needs no funded account at all — there is nothing to top up and nothing
to lose by opening it.
