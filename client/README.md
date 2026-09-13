<div align="center">

# warrant-client

**Buy what an agent needs, one call at a time, in USDC on Hedera.**

A permanent name. An email inbox it owns and receives replies at. Sealed
agent-to-agent mail. A real phone number and SMS. Language model inference.
Memory written to a file nobody can edit. No API key, no signup, no human in
the loop: the account that pays is the identity.

[![npm](https://img.shields.io/npm/v/warrant-client?color=C98A2E)](https://www.npmjs.com/package/warrant-client)
[![Hedera](https://img.shields.io/badge/Hedera-testnet%20296-6FE3A5)](https://hashscan.io/testnet/contract/0xF33E2E0ecc982416f788759083129de6A147a1FE)
[![x402](https://img.shields.io/badge/x402-v2-E8B55C)](https://github.com/coinbase/x402)
[![node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![license](https://img.shields.io/badge/license-MIT-blue)](https://github.com/martinvibes/warrant/blob/master/LICENSE)

[Console](https://warrant-aufgabe.vercel.app) ·
[Docs](https://warrant-aufgabe.vercel.app/docs) ·
[Ledger](https://warrant-aufgabe.vercel.app/ledger) ·
[Catalogue](https://warrant-api-production-e111.up.railway.app/v1/catalogue) ·
[Spec](https://warrant-api-production-e111.up.railway.app/openapi.json) ·
[Skill file](https://warrant-api-production-e111.up.railway.app/skill.md) ·
[MCP](https://qmt6sdhe5ffmva3zl2iagc6hkm.bazgateway.com/mcp) ·
[Source](https://github.com/martinvibes/warrant)

</div>

---

> An agent that has to ask a human before it can send an email is not autonomous.
> This is the other half: it pays for what it uses, and a contract on Hedera
> decides whether it may.

```bash
npm i warrant-client
```

## Quick start

The fastest path from zero to an agent with an on-chain name, a real inbox, and
a memory that outlives the process. Every paid step is a real settlement on
Hedera, and every resource is owned by the account that paid for it.

```bash
# 0. The account that pays. It needs testnet USDC and nothing else —
#    the facilitator sponsors the network fee, so no HBAR is required.
export WARRANT_ACCOUNT_ID=0.0.10514332
export WARRANT_PRIVATE_KEY=302e…            # DER or hex
export WARRANT_AGENT_ADDRESS=0x7d14…33cC    # only identity.mint needs this

# 1. See what is for sale, and what it costs. Free, and needs no key.
npx warrant catalogue

# 2. Mint the agent's identity — soulbound ERC-721 on Hedera ($0.10)
npx warrant buy identity.mint

# 3. Claim an inbox it owns and receives replies at ($1.00)
npx warrant buy email.inbox --name scout

# 4. Send a real email from it ($0.20)
npx warrant buy email.send --from scout@0gent.xyz --to you@example.com \
  --subject "Hello" --body "from the agent, paid for by the agent"

# 5. Ask a model, paid per call ($0.02)
npx warrant buy inference --prompt "What is Hedera in one sentence?"

# 6. Write something it will still know tomorrow ($0.05)
npx warrant buy memory.write --content "the peer at 0x7510 answers on scout@0gent.xyz"

# 7. Search real phone inventory (free — an agent that cannot see the price
#    before it commits is not choosing)
npx warrant read '/v1/phone/search?country=US&area=415'
```

Install it globally for a shorter line: `npm i -g warrant-client && warrant catalogue`.

## In code

```ts
import { Warrant } from "warrant-client";

const warrant = new Warrant({
  accountId: process.env.WARRANT_ACCOUNT_ID!,
  privateKey: process.env.WARRANT_PRIVATE_KEY!,
});

const { result, settlement } = await warrant.buy("inference", {
  prompt: "summarise x402 in one line",
});

console.log(result);      // the resource
console.log(settlement);  // the Hedera transaction it was paid for in
```

One call replaces three: the request that comes back `402`, the signed payment,
and the retry. Endpoints and prices are read from the service's own catalogue,
so a service that adds a resource does not need this package republished.

## Command reference

Prices are quoted in USDC and settled at request time over
[x402](https://github.com/coinbase/x402) — one payment per call, no
subscriptions, no minimum. Flags become the JSON body: `--prompt hello` is
`{"prompt":"hello"}`.

### Free — no key, no account, no payment

| Command | Cost | Notes |
|---|---|---|
| `warrant catalogue` | free | What is for sale and the live price. The same table the server charges against. |
| `warrant read /v1/receipts` | free | Every settled purchase, signed. Add `?limit=3`. |
| `warrant read /v1/purchases` | free | The public ledger, including what was refused. |
| `warrant read /v1/contracts` | free | Addresses of the three contracts, and the receipt issuer. |
| `warrant read /v1/stats` | free | Totals: purchases, agents, spend. |
| `warrant read /v1/agents/0.0.10514332` | free | What one agent owns and what it has left. |
| `warrant read '/v1/phone/search?country=US&area=415'` | free | Real inventory, before you commit to buying one. |
| `warrant read /v1/memory/<fileId>` | free | Read back a memory file from Hedera. |
| `warrant read /v1/email/inbox/<address>` | free | Read what arrived in an inbox the account owns. |

### Paid — settled in USDC, one payment per call

| Command | Cost | Status | Notes |
|---|---|---|---|
| `warrant buy identity.mint` | $0.10 | ✅ Live | Soulbound ERC-721 on Hedera's EVM, one per address, plus the public key other agents seal mail to. Optional `--metadataURI`, `--encryptionKey`. Needs `WARRANT_AGENT_ADDRESS`. |
| `warrant buy inference --prompt "…"` | $0.02 | ✅ Live | One language model call, returned in OpenAI shape. Optional `--model`, `--maxTokens`. |
| `warrant buy email.inbox --name scout` | $1.00 | ✅ Live | Provisions `scout@0gent.xyz`, owned by the paying account, and **receives replies** — not just outbound. |
| `warrant buy email.send --from … --to … --subject … --body …` | $0.20 | ✅ Live | A real email from an address the agent owns, via Resend. |
| `warrant buy email.sealed --from … --to … --toAgent 0x… --subject … --body …` | $0.25 | ✅ Live | Encrypted to the recipient's on-chain key. This service relays it and cannot read it. |
| `warrant buy memory.write --content "…"` | $0.05 | ✅ Live | A permanent Hedera file, up to 4096 bytes, that nobody — this service included — can edit. |
| `warrant buy phone.provision --country US` | $0.50 | ✅ Live | A real number in 170+ countries, SMS capable, via Telnyx. Or `--phoneNumber +1…` from a search. |
| `warrant buy sms.send --from +1… --to +1… --text "…"` | $0.01 | ✅ Live | One text from a number the agent owns. |

Nothing is listed as coming soon. An offer whose provider is not configured is
not shown and not sold, so the catalogue never advertises a price that will not
be honoured.

## How payment works

1. Call a paid endpoint with no payment. It answers **`402 Payment Required`**
   with the amount, the asset and where to pay.
2. Sign an x402 payment for exactly that amount and retry the same request with
   a `payment-signature` header.
3. The resource runs, and its owner is the account that paid. The settlement id
   comes back in the `payment-response` header.

This package does all three. Settlement is USDC `0.0.429274` on
`hedera:testnet`, through the [Blocky402](https://api.testnet.blocky402.com)
facilitator, which sponsors the network fee — so a paying agent carries
stablecoin and no HBAR.

## The limit that makes this safe

The interesting part of Warrant is not that an agent can pay. It is that it can
be stopped.

An owner funds an `AgentTreasury` contract on Hedera with a lifetime cap, a
rolling window (`$5 a day`), and an allowlist of resource kinds. The agent draws
from it without asking anyone, and the contract refuses an out-of-scope or
over-budget draw before any money moves. The refusal comes from the chain, not
from a vendor's database, and it holds even if this service disappears.

```ts
const { result } = await warrant.buy("inference", { prompt: "…" });
// → WarrantError: WindowCapExceeded — wanted 20000 atomic, remaining 0,
//   reopens at 2026-09-13T13:51:27Z
```

| Contract | Address |
|---|---|
| `AgentIdentity` | [`0xb791348d9896Bce2FA5cA724d8F548413AcbaDf6`](https://hashscan.io/testnet/contract/0xb791348d9896Bce2FA5cA724d8F548413AcbaDf6) |
| `ResourceMarket` | [`0x7442BdF9240e42Df0B25CedefeAF13799Fd377C0`](https://hashscan.io/testnet/contract/0x7442BdF9240e42Df0B25CedefeAF13799Fd377C0) |
| `AgentTreasury` | [`0xF33E2E0ecc982416f788759083129de6A147a1FE`](https://hashscan.io/testnet/contract/0xF33E2E0ecc982416f788759083129de6A147a1FE) |

Registration and listing are permissionless. Anyone may register an identity and
anyone may list a resource, because a registry behind an admin key is a customer
list, not a registry.

## Receipts

Every settled purchase is signed over a canonical digest, so it can be checked
without trusting this service:

```bash
warrant read '/v1/receipts?limit=1'
```

```
digest = sha256(version|id|agent|kind|resource|amount|asset|network|settlement|issuedAt)
```

Rebuild the digest from the fields, recover the signer, compare it with the
issuer published at `/v1/contracts`, and read the settlement back from Hedera's
mirror node rather than from us.

## The one error that matters

A payment settles **before** the resource runs, so an upstream failure can happen
after the money has moved. That comes back as a `WarrantError` with
`settled: true`, and retrying it buys the failure twice.

```ts
import { WarrantError } from "warrant-client";

try {
  await warrant.buy("email.send", { from, to, subject, body });
} catch (err) {
  if (err instanceof WarrantError && err.settled) {
    // charged, and the resource failed. Collect the receipt, do not retry.
  }
}
```

`err.free` is the inverse, and is true whenever nothing was charged — a bad
request, a refusal by the limit, an unknown kind. Those are safe to correct and
repeat.

## API

| | |
|---|---|
| `new Warrant({ accountId, privateKey, baseUrl?, network? })` | A paying client. `baseUrl` defaults to the hosted service. |
| `warrant.offers(refresh?)` | The whole catalogue, cached after the first read. |
| `warrant.offer(kind)` | One offer, or `undefined`. |
| `warrant.buy<T>(kind, body?, agentAddress?)` | Pay for one call. Returns `{ kind, result, settlement }`. |
| `warrant.read<T>(path)` | Any free endpoint. |

### Environment

| Variable | What it is |
|---|---|
| `WARRANT_ACCOUNT_ID` | The Hedera account paying, e.g. `0.0.10514332`. |
| `WARRANT_PRIVATE_KEY` | Its private key, DER or hex. Read it from the environment; never commit it. |
| `WARRANT_AGENT_ADDRESS` | The agent's EVM address. Only `identity.mint` needs it. |
| `WARRANT_BASE_URL` | Point at a different service. Defaults to the hosted one. |

## Other ways in

- **Plain HTTP** — everything above is one `curl` and a signature away. The spec
  is at [`/openapi.json`](https://warrant-api-production-e111.up.railway.app/openapi.json).
- **MCP** — the same catalogue as tools, through the gateway listed on Bazantic:
  `https://qmt6sdhe5ffmva3zl2iagc6hkm.bazgateway.com/mcp`
- **Recipes** — [agent-starter-kit](https://bazantic.com/recipes/agent-starter-kit)
  stands up a new agent end to end; [spend-audit](https://bazantic.com/recipes/spend-audit)
  reads back what one spent and what it was refused.
- **Coding agents** — drop in
  [`/skill.md`](https://warrant-api-production-e111.up.railway.app/skill.md).

## Licence

MIT. Source at [github.com/martinvibes/warrant](https://github.com/martinvibes/warrant).
