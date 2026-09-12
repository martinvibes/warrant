# Warrant

**Scoped spending authority for autonomous agents.** An agent can buy real resources — inference, an email inbox, a phone number — by paying per request over HTTP. Warrant is the layer that decides whether it was *allowed to*, refuses the payment before money moves if it wasn't, and writes a receipt that proves what happened.

Built for **ETHOnline 2026** on the **Continuity** track. See [Continuity disclosure](#continuity-disclosure) below.

---

## The problem

Agent payment rails are finished work. x402 settles a stablecoin payment over HTTP in under two seconds, and facilitators now sponsor the network fee so the buyer doesn't even need gas. What is *not* finished is everything either side of the payment:

- There is no per-agent spend ledger you can query between invoices.
- Budget caps exist after the fact, as a line in a statement, not as a refusal at the moment of payment.
- An authorisation cannot restrict an agent to approved sellers and approved purposes.
- A prompt-injected agent with a funded wallet will happily spend it.

Google's AP2 defines signed mandates for intent and cart, but a mandate that nothing enforces is a document, not a control. Warrant is the enforcement.

## How it works

```
  human                    Warrant service                      Hedera
   │                            │                                  │
   │  1. sign a warrant  ──────▶│                                  │
   │     (EIP-712)              │                                  │
   │                            │                                  │
 agent  2. GET /v1/inference ──▶│                                  │
   │                            │ 3. warrant gate                  │
   │                            │    ├─ no warrant?   403          │
   │                            │    ├─ over cap?     403          │
   │                            │    ├─ wrong seller? 403          │
   │                            │    ├─ wrong purpose? 403         │
   │                            │    └─ revoked/expired? 403       │
   │                            │                                  │
   │   4. 402 payment required ◀┤   (only if the gate passed)      │
   │   5. signed transfer ─────▶│ ── verify + settle ─────────────▶│
   │                            │                                  │
   │   6. 200 + deliverable    ◀┤ 7. receipt written               │
   │                            │    (agent, warrant, resource,    │
   │                            │     amount, tx id)               │
```

The gate runs on the x402 SDK's `onProtectedRequest` hook, which fires **before** the payment challenge is issued. A refused request never becomes a payment, so there is nothing to refund and nothing to reconcile.

## What is enforced

A warrant is an EIP-712 typed message signed by the wallet that owns the agent:

| Field | Meaning |
| --- | --- |
| `agent` | Hedera account id allowed to spend under this warrant |
| `cap` | Total spend ceiling, in the smallest unit of the settlement asset |
| `resources` | Allowlist of resource types (`inference`, `email.send`, …) |
| `purpose` | Free-text scope recorded on every receipt |
| `expiry` | Unix seconds after which the warrant is dead |
| `nonce` | Replay protection; one warrant per nonce per owner |

Revocation is immediate and does not require a transaction: the owner posts a revocation and the next request under that warrant is refused.

## Running it

```bash
cp .env.example .env      # fill in Hedera + OpenAI keys
npm install
npm run dev               # service on :8090
npm run sign              # sign a warrant as the owner
npm run agent             # agent buys something under it
```

Settlement is **USDC on Hedera testnet** (token `0.0.429274`, 6 decimals) through the
[Blocky402](https://blocky402.com) facilitator at `https://api.testnet.blocky402.com`.
The facilitator sponsors the Hedera network fee, so the paying agent needs USDC but no HBAR.

## Continuity disclosure

This repository is **new work, written on 12–13 September 2026**, during ETHOnline 2026.

It is registered on the **Continuity** track because it stands on one pre-existing component:

| | |
| --- | --- |
| **Pre-existing** | [`@xgents/core`](https://www.npmjs.com/package/@xgents/core) and the 0GENT service it talks to ([0GENT-Labs/0gent](https://github.com/0GENT-Labs/0gent), [0gent.xyz](https://0gent.xyz)). Published before this event. That project provides the *supply side*: paid endpoints that provision inference, email and phone for agents, previously settling on X Layer. None of its source is copied into this repository. |
| **New in this repo** | Everything else, and specifically: the warrant model and its EIP-712 signing and verification; the pre-payment enforcement gate; the receipt ledger; the revocation path; the Hedera testnet settlement path through Blocky402; the Privy agent-wallet and policy integration; the buyer agent and the prompt-injection demonstration; the operator console. |

The separation is auditable by construction: this is a fresh repository with no imported history, so `git log` **is** the diff. The prior art is a dependency and a running service, not a starting point.

## AI usage disclosure

This project was built with Claude Code (Anthropic) as a pair programmer. Disclosure by area:

| Area | Human | AI |
| --- | --- | --- |
| Problem selection, product design, threat model, warrant field set | Author | Research input on documented gaps |
| `src/warrant/*` — typed-data schema, signing, verification | Reviewed and corrected | Drafted |
| `src/x402/*` — resource server wiring, gate hook, settlement hook | Reviewed and corrected | Drafted |
| `src/store/*` — schema and queries | Reviewed | Drafted |
| `src/resources/*` — inference and email handlers | Reviewed | Drafted |
| `src/agent/*` — buyer agent and injection demo | Reviewed | Drafted |
| `public/*` — console | Reviewed | Drafted |
| Hedera / Blocky402 integration decisions, key handling, deployment | Author | API surface research |
| This README and `docs/*` | Author edited | Drafted |

Prompts and planning notes are committed under `docs/` rather than gitignored, per event rules.

## Licence

MIT
