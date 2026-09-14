<div align="center">

```
██╗    ██╗ █████╗ ██████╗ ██████╗  █████╗ ███╗   ██╗████████╗
██║    ██║██╔══██╗██╔══██╗██╔══██╗██╔══██╗████╗  ██║╚══██╔══╝
██║ █╗ ██║███████║██████╔╝██████╔╝███████║██╔██╗ ██║   ██║   
██║███╗██║██╔══██║██╔══██╗██╔══██╗██╔══██║██║╚██╗██║   ██║   
╚███╔███╔╝██║  ██║██║  ██║██║  ██║██║  ██║██║ ╚████║   ██║   
 ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝   
```

**An agent with its own wallet, buying what it needs.**

A name. An inbox it can receive replies at. A phone number. Inference. Memory that
outlives the process. Each bought per call in stablecoin over plain HTTP, in under a
second, with nobody to ask.

[![npm](https://img.shields.io/npm/v/warrant-client?color=C98A2E&label=warrant-client)](https://www.npmjs.com/package/warrant-client)
[![Hedera](https://img.shields.io/badge/Hedera-testnet%20296-6FE3A5)](https://hashscan.io/testnet/contract/0xF33E2E0ecc982416f788759083129de6A147a1FE)
[![x402](https://img.shields.io/badge/x402-v2-E8B55C)](https://github.com/coinbase/x402)
[![contracts](https://img.shields.io/badge/contracts-28%20tests-6FE3A5)](contracts)
[![node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

[**Live console**](https://warrant-aufgabe.vercel.app) ·
[API](https://warrant-api-production-e111.up.railway.app) ·
[Public ledger](https://warrant-aufgabe.vercel.app/ledger) ·
[Skill file](https://warrant-api-production-e111.up.railway.app/skill.md) ·
[npm](https://www.npmjs.com/package/warrant-client) ·
[MCP](https://qmt6sdhe5ffmva3zl2iagc6hkm.bazgateway.com/mcp) ·
[Contracts](https://hashscan.io/testnet/contract/0xF33E2E0ecc982416f788759083129de6A147a1FE)

</div>

---

> The spending limit lives in a contract on Hedera, not in this service's database.
> It holds even if this service disappears.

## See it in 90 seconds

| | |
|---|---|
| [The catalogue](https://warrant-aufgabe.vercel.app) | Eight resources, live, with the mark of the company actually answering each call |
| [The ledger](https://warrant-aufgabe.vercel.app/ledger) | Every purchase and every refusal, signed, no credentials |
| [One agent's record](https://warrant-aufgabe.vercel.app/agent/0.0.10514332) | What it bought, what it was refused, what is left of its ceiling |

```bash
npx warrant catalogue                        # free, no key
npx warrant buy inference --prompt "hello"   # $0.02, settles on Hedera
```

The shot list and the narration are in [`docs/demo.md`](docs/demo.md).

## Quick start

Three ways in. Same catalogue, same prices, same contract saying no.

**1. From your own agent, in one line.**

```bash
npm i warrant-client
```

```ts
import { Warrant } from "warrant-client";

const warrant = new Warrant({ accountId, privateKey });
const { result, settlement } = await warrant.buy("inference", { prompt: "hello" });
```

The package wraps the 402 challenge, the payment and the retry into one call. Prices
and endpoints come from the service's own catalogue, so adding a resource does not
need the package republished.

**2. Plain HTTP, because that is the whole point.**

```bash
curl -X POST https://warrant-api-production-e111.up.railway.app/v1/inference \
  -H 'content-type: application/json' -d '{"prompt":"one line on Hedera"}'
# → 402 Payment Required, with the price and where to pay

# sign an x402 payment, retry the same request with payment-signature
# → 200, and a settlement id in the payment-response header
```

No API key and no signup: the account that pays is the identity.

**3. As MCP tools, through the gateway listed on Bazantic.**

```
https://qmt6sdhe5ffmva3zl2iagc6hkm.bazgateway.com/mcp
```

**Or drop the skill file into a coding agent:**
[`/skill.md`](https://warrant-api-production-e111.up.railway.app/skill.md)

## What it does

An agent is given a goal in plain English. It reads the catalogue, works out what it
needs, pays for each call as it makes it, and reports what that cost. No approval
step, no queue, no human in the loop.

```
  goal    introduce yourself to agent 0x7510 and keep a note of it
  budget  $1.00 this window, $5.00 remaining overall

  BUY     identity.mint    $0.1    PAID 2841ms   token #7, soulbound · key published
  BUY     email.inbox      $1      PAID 1104ms   scout@0gent.xyz
  BUY     email.sealed     $0.25   PAID  967ms   sealed to 0x7510 · we never saw the body
  BUY     memory.write     $0.05   PAID 3218ms   file 0.0.6841923, immutable
  BUY     inference        $0.02   REFUSED       daily limit spent, reopens 00:00Z

  total   $1.40 over 4 purchases
```

That last line is the interesting one. The chain refused it, not us.

```bash
npm run fund  -- --agent 0x9aE1… --amount 5 --cap 5 --per day --kinds inference,email.send
npm run agent -- "introduce yourself to agent 0x7510 and keep a note of it"
```

## What is for sale

Read `GET /v1/catalogue` for the live list. It is the same list the server charges
against, so the page cannot advertise a price that will not be honoured.

| Kind | What you get | Price |
|---|---|---|
| `identity.mint` | A soulbound token on Hedera, plus the public key others seal mail to | $0.10 |
| `inference` | One language model call, returned in OpenAI shape | $0.02 |
| `email.inbox` | An address the agent owns **and receives replies at** | $1.00 |
| `email.send` | Ordinary mail from an address the agent owns | $0.20 |
| `email.sealed` | Mail encrypted to another agent, unreadable by this service | $0.25 |
| `memory.write` | A permanent Hedera file nobody, us included, can edit | $0.05 |
| `phone.provision` | A real number, SMS capable, 170+ countries | $0.50 |
| `sms.send` | One text from a number the agent owns | $0.01 |

Nothing is listed as coming soon. An offer whose provider is not configured is not
shown and not sold.

## Live now

Everything below is running, and none of it needs a credential to look at.

| | |
|---|---|
| Console | https://warrant-aufgabe.vercel.app |
| API | https://warrant-api-production-e111.up.railway.app |
| Catalogue | [`/v1/catalogue`](https://warrant-api-production-e111.up.railway.app/v1/catalogue) |
| Ledger | [`/v1/receipts`](https://warrant-api-production-e111.up.railway.app/v1/receipts) — everything sold and everything refused |
| Spec | [`/openapi.json`](https://warrant-api-production-e111.up.railway.app/openapi.json) — 19 paths, 8 of them paid |
| Skill file | [`/skill.md`](https://warrant-api-production-e111.up.railway.app/skill.md) |
| MCP gateway | `https://qmt6sdhe5ffmva3zl2iagc6hkm.bazgateway.com/mcp` |
| Package | [`warrant-client`](https://www.npmjs.com/package/warrant-client) |

**On chain, Hedera testnet (chain 296):**

| Contract | Address | What it holds |
|---|---|---|
| `AgentIdentity` | [`0xb791…aDf6`](https://hashscan.io/testnet/contract/0xb791348d9896Bce2FA5cA724d8F548413AcbaDf6) | One soulbound token per agent, plus its encryption key. Anyone may register, nobody may transfer. |
| `ResourceMarket` | [`0x7442…77C0`](https://hashscan.io/testnet/contract/0x7442BdF9240e42Df0B25CedefeAF13799Fd377C0) | Who sells what, at what price, which URL to pay. Listing is permissionless. |
| `AgentTreasury` | [`0xF33E…a1FE`](https://hashscan.io/testnet/contract/0xF33E2E0ecc982416f788759083129de6A147a1FE) | The money and the ceilings. Draws are priced from the market, so an agent cannot inflate them. |

Registration and listing are open on purpose. The registries this learned from gate
both behind an admin key, which makes the result a customer list rather than a
registry.

The agent doing the buying is Hedera account
[`0.0.10514332`](https://hashscan.io/testnet/account/0.0.10514332), EVM
`0x7d141bf9320F8797184ebd65E1Fb746a440d33cC`. Settlement is USDC `0.0.429274`,
network fee sponsored by the [Blocky402](https://api.testnet.blocky402.com)
facilitator, so the agent carries stablecoin and no HBAR.

## Why the limit is on chain

Fund an agent directly and its limit is a suggestion, because the agent holds the
keys. Keeping the balance one step away makes the limit real without putting a
person in the loop.

| | The usual answer | Here |
|---|---|---|
| Where the limit lives | The provider's database | A contract on Hedera |
| If the service goes down | The cap goes with it | The limit still holds |
| Can it say *five dollars a day*? | No, a balance cap bounds the total, never the rate | Yes, a rolling window sits beside the lifetime cap |
| Who approves a purchase | Increasingly, a human in a queue | Nobody |
| Can the agent inflate a draw? | It names the amount | It names a listing; the price comes from the chain |

To watch it work without spending anything, one command deploys the contracts to a
local chain, funds an agent, lets it draw, and shows the chain refusing the next
draw:

```bash
npm run demo:chain
```

```
the agent draws for 50 inference calls, asking nobody
  agent now holds 1000000 atomic USDC
  remaining (lifetime, window): 4000000  0

it tries once more, and the chain says no
  WindowCapExceeded
    wanted 20000 atomic, remaining 0, reopens at 2026-09-13T13:51:27+00:00
```

## Who holds the key

The agent signs with a key it does not have a copy of. Its spending key is a
[Privy](https://privy.io) server wallet, owned by a key quorum whose private half
was generated locally and never sent to Privy, so neither side can move money alone.

The awkward part is that Warrant spans two worlds: `AgentTreasury.draw` pays
`msg.sender` on the EVM, while the x402 payment is a native Hedera transfer. Drawer
and payer must therefore be the same account. They can be, because Hedera's ECDSA
signature is secp256k1 over `keccak256(bodyBytes)` returned as a compact `r‖s` —
which is exactly Privy's `secp256k1_sign` primitive. One Privy wallet covers both.
Privy even co-signed the `AccountCreateTransaction` that attached its own EVM alias.

```bash
npm run privy:setup   # quorum, wallet, and the Hedera account keyed to it
npm run privy:policy  # write the signing policy
npm run privy:check   # prove the policy allows and refuses the right things
```

```
✓ ALLOWED  draw from the treasury
✓ ALLOWED  pay on Hedera over x402
✓ DENIED   move HBAR out of the account
✓ DENIED   call the stablecoin contract directly
```

The policy is written as what the engine can actually enforce, not as what would read
best. A matching DENY beats any ALLOW, there is no `neq`, and `starts_with` is
unsupported on `to` — so "only ever call the treasury" is inexpressible, and the
enforceable complement is used instead. [`scripts/privy-policy.ts`](scripts/privy-policy.ts)
says so in its own comments rather than claiming a guarantee it does not have.

One key is deliberately not custodial: sealed mail is decrypted with a separate
messaging key the agent holds itself. An agent that signs with a key it does not
hold still needs a key nobody else can read its post with.

## Receipts

Every settled purchase is signed. A settlement id on its own is a pointer into a
mirror node, and a row in this service's database is only our word for it. A receipt
is the middle thing: what was bought, by whom, for how much, against which
settlement, signed by the service's key over a canonical digest.

```
digest = sha256(version|id|agent|kind|resource|amount|asset|network|settlement|issuedAt)
```

Checking one needs nothing from this service:

```bash
npm run verify -- rcp_mtyuk9d0146b7ae6e5
```

That rebuilds the digest from the fields, recovers the signer, compares it with the
issuer published at `/v1/contracts`, and reads the settlement back from Hedera's
mirror node rather than from us.

A receipt is collected rather than returned with the goods, and that is the protocol
rather than a shortcut. The payment middleware buffers the handler's response and
settles afterwards, so at the moment a resource answers, the settlement it would be
evidence of does not exist yet. The response carries that id in its
`payment-response` header, which is enough to collect the receipt from
`/v1/receipts?settlement=…` a moment later.

## Sealed mail

Two agents can already pay each other. Sealed mail lets them say something the
carrier cannot read, and it needs no key exchange because the recipient's key is
already on chain beside its identity.

ECIES over secp256k1, the same curve the identity is keyed to, so an agent needs one
keypair rather than two. The recipient's key is read from the contract and never from
the request, so a sender cannot be talked into sealing to an attacker's key. This
service holds no private key, so being unable to read the traffic is a property of
the construction rather than a promise about conduct.

## Listed on Bazantic

The catalogue is listed twice over: once as a gateway, so any MCP client can call the
paid endpoints as tools, and once as two published Recipes.

| | |
|---|---|
| Gateway | `qmt6sdhe5ffmva3zl2iagc6hkm`, auth `x402-mpp`, 20 tools |
| [`agent-starter-kit`](https://bazantic.com/recipes/agent-starter-kit) | Stands up a new agent: identity, standing brief, mailbox. The agent pays for all three itself, inside the cap. |
| [`spend-audit`](https://bazantic.com/recipes/spend-audit) | Reads back what an agent spent and what it was refused. Free reads only, so auditing costs nothing. |

The JSON sent to the API is checked in under [`bazantic/`](bazantic/), so a Recipe
changes by editing a file rather than by remembering what was typed.

## Checking it works

```bash
npm run smoke                       # buys one of everything, reports what worked
npm run smoke -- --to you@mail.com  # also proves a mail is delivered
npm run smoke -- --with-phone       # also orders a real number, which costs
```

Searching for a phone number is free, here and for the agent, because an agent that
cannot see the price before it commits is not choosing:

```bash
curl 'https://warrant-api-production-e111.up.railway.app/v1/phone/search?country=US&area=415'
```

## Running it

```bash
git clone https://github.com/martinvibes/warrant && cd warrant
npm install && cp .env.example .env      # fill in the Hedera keys
npm run build:web                        # build the console
npm run dev                              # service and console on :8090

cd contracts && ./setup.sh && forge test # 28 tests
```

The agent needs a Hedera account holding testnet USDC. It does not need HBAR: the
facilitator sponsors the network fee, so stablecoin is the only balance it carries.

**Stack.** Node 22, TypeScript, Express, better-sqlite3, viem, Hedera SDK. Solidity
0.8.24 with Foundry. Vite, React and Tailwind for the page. x402 v2 on
`hedera:testnet`, settled in USDC `0.0.429274` through the
[Blocky402](https://api.testnet.blocky402.com) facilitator. Agent keys held by Privy
server wallets. Listed on Bazantic.

## What this does not do

| Bound | Why |
|---|---|
| The limit binds draws, not the wallet | Once drawn, the float is the agent's. Smaller tranches narrow the window; they do not close it. |
| One service, one catalogue | The market is permissionless, but only this service is listed on it today. |
| Memory is 4096 bytes | A permanent file is written in one transaction. Longer content has to be split and linked. |
| Purchases are recorded here as well as on chain | The local row is fast to read. Anything you need to trust, read from the chain. |
| The signing policy is a complement, not a whitelist | Privy's engine cannot express "only the treasury". It can express, and does enforce, "never HBAR, never the token directly". |

## Provenance

New work, written during ETHOnline 2026. `git log` is the whole record; there is no
squashed import and no backdated history.

Two things are carried over and are identified as carried over in the commit that
introduced them: the visual shell began as the author's earlier 0GENT front end and
was rebuilt around a new palette and type system, and the idea of an agent buying
real resources per request comes from that same earlier project and from
[Palmyr](https://palmyr.ai). Neither is entered in this hackathon. What is new here
is the on-chain limit with a rolling window, permissionless identity and listing,
sealed agent-to-agent mail, custodial signing under a policy, and the move to Hedera.

## AI disclosure

Written with Claude Code (Opus 5) under direction, as recorded in
[`docs/prompts.md`](docs/prompts.md). Architecture, contract design and the product
decisions were directed by the author; the model wrote most of the implementation and
all of the tests. Every claim in this README was checked against a running service or
a passing test before it was written down.

## Licence

MIT.
