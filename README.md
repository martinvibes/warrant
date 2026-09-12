# Warrant

**A signed purchase order in front of every payment an agent makes.**

An agent can buy real resources — inference, email — by paying per request in
stablecoin over HTTP. Warrant is the layer that decides whether it was *allowed
to*, refuses the purchase before money moves when it wasn't, and writes a
receipt binding what was bought to the human who authorised it.

A spending cap is a fuel gauge. This is a purchase order.

Built for **ETHOnline 2026**.

---

## Why a cap is not enough

Agent payment rails are finished work. x402 settles a stablecoin payment over
HTTP in about two seconds, and facilitators now sponsor the network fee so the
buyer does not even need gas. What is missing is on either side of the payment.

A wallet-level spending limit can say *spend no more than $50*. It cannot say
spend only on inference, only for this campaign, only until Friday — and it
cannot tell you afterwards what each dollar bought. So the failure it cannot
prevent is the ordinary one: an agent with a funded wallet, a well-formed
request, and an instruction it should never have followed.

Google's AP2 defines signed mandates for intent and cart. A mandate that
nothing enforces is a document, not a control. Warrant is the enforcement.

## The path of one purchase

```
  human                    Warrant service                      Hedera
   │                            │                                  │
   │  1. sign a warrant  ──────▶│                                  │
   │     (EIP-712, no gas)      │                                  │
   │                            │                                  │
 agent  2. POST /v1/inference ─▶│                                  │
   │     + X-Warrant            │ 3. the gate, before any price:   │
   │                            │    ├─ no warrant?        403     │
   │                            │    ├─ bad signature?     403     │
   │                            │    ├─ revoked/expired?   403     │
   │                            │    ├─ resource unlisted? 403     │
   │                            │    ├─ wrong asset?       403     │
   │                            │    └─ over the cap?      403     │
   │                            │                                  │
   │   4. 402 payment required ◀┤   (only if the gate passed)      │
   │   5. signed transfer ─────▶│ 6. is the payer the named agent? │
   │                            │ ── verify + settle ─────────────▶│
   │   7. 200 + the deliverable ◀┤ 8. receipt written              │
   │                            │    agent · warrant · purpose ·   │
   │                            │    amount · tx id                │
```

Three stages, each placed at the earliest moment its check is possible:

| Stage | State of the money | What it can ask |
| --- | --- | --- |
| `onProtectedRequest` | nothing asked for, nothing paid | Is this purchase authorised at all? A refusal here means the agent was never even quoted a price. |
| `onAfterVerify` | payment signed, not settled | Is the payer the agent this warrant names? Unanswerable earlier, because before a signature there is no payer. |
| `onAfterSettle` | money has moved | Write the receipt. Nothing is recorded as bought before it is paid for. |

A refused request never becomes a payment, so there is nothing to refund and
nothing to reconcile.

## What a warrant binds

An EIP-712 typed message signed by the human who owns the agent. Its id is the
hash of its own contents, so an edited warrant is a different warrant rather
than a tampered one, and tampering reads as forgery: the signature recovers to
a different address.

| Field | Meaning |
| --- | --- |
| `owner` | EVM address of the human who signed. All authority derives from here. |
| `agent` | The one Hedera account id authorised to spend under this warrant. |
| `asset` | HTS token id of the settlement asset. Signed, so a cap cannot be walked past by changing the unit. |
| `cap` | Total ceiling, in the asset's smallest unit. Atomic rather than decimal, because a cap that drifts by a rounding step is a cap that can be walked past. |
| `resources` | Allowlist of resource types. An empty list authorises nothing. |
| `purpose` | Free text, copied onto every receipt, so a line of spend stays explicable a month later. |
| `expiry` | Unix seconds. Dead at and after this instant. |
| `nonce` | Per-owner replay guard, and what makes two otherwise identical warrants distinct documents. |

Spend is recomputed on every request by summing settled receipts, not read from
a counter. A cap is only as trustworthy as the number it is compared against.

Revoking is a second signed message, not a transaction: no gas, no block time,
effective on the agent's next request. Killing a warrant has to be cheaper than
issuing one or nobody does it in the moment that matters.

## Running it

```bash
cp .env.example .env      # Hedera account, owner key, OpenAI key
npm install
npm run build:web         # build the console
npm run dev               # service and console together on :8090
```

The console is served from the same origin as the API, which matters for more
than convenience: it means the console is demonstrably reading the service it
claims to read.

Then, as the human:

```bash
npm run sign -- --agent 0.0.4242 --cap 1.00 \
                --resources inference \
                --purpose "support triage" --hours 24
```

Then, as the agent — once inside the warrant, once outside it:

```bash
npm run agent -- inference "summarise ticket #8812"
  BOUGHT   inference  $0.05

npm run agent -- injected
  REFUSED  403  resource_not_authorised
  This warrant covers inference. It does not cover email.send.
  No payment was attempted.
```

The second request was well formed and the wallet was funded. A wallet cap
would have allowed it. It was refused on scope, not on price.

The web app — landing page, operator console and public ledger — lives in
[`frontend/`](frontend). `npm run dev:web` runs it against a service on another
host during development.

## Settlement

USDC on **Hedera testnet** (token `0.0.429274`, 6 decimals) over **x402 v2**,
through the [Blocky402](https://blocky402.com) facilitator at
`https://api.testnet.blocky402.com`. The facilitator sponsors the Hedera
network fee, so a paying agent needs USDC and no HBAR — which is the difference
between an agent that can pay and one stuck holding the wrong asset.

Pay-per-request only makes sense where the fee is not the purchase. Five cents
of inference cannot carry a cent of gas.

## What this does not do

Worth stating plainly, because the gaps are where the next version goes.

| Limit | Consequence |
| --- | --- |
| Enforcement is per service | A warrant binds spending at the service that reads it. Two services each honouring a $1 cap can cost the owner $2. Caps across services need a shared ledger this does not have. |
| Spend is recorded locally | Receipts live in the service's own database. They reference real Hedera transactions and can be checked against the ledger, but the tally itself is not on-chain. |
| The cap is a total, not a rate | A warrant can be spent to its ceiling in a second. It has no notion of per-hour or per-day. |
| One agent per warrant | Authorising a fleet means one warrant each. That is deliberate — it is what makes payer binding meaningful — but it does mean issuing many documents. |

## Provenance

This repository is new work, written during ETHOnline 2026. `git log` is the
whole record: there is no imported history, so every line arrived here inside
the event window.

Two things came from the author's prior work and are marked as such in the
commits that introduced them:

- The web app's visual shell — layout, animation, the orb, component chrome —
  was carried over from the author's own earlier project 0GENT and then
  rebranded and rewired. The commits that add it say so.
- The idea of selling real resources to agents per request over x402 is that
  project's, continued here. Everything that makes this Warrant rather than
  0GENT is new: the warrant model and its signing and verification, the
  pre-payment gate, payer binding, the receipt ledger, revocation, the Hedera
  settlement path, the operator console and the public ledger.

## AI usage disclosure

Built with Claude Code (Anthropic) as a pair programmer. By area:

| Area | Human | AI |
| --- | --- | --- |
| Problem selection, product design, threat model, warrant field set | Author | Research on documented gaps |
| `src/warrant/*` — typed data, signing, verification, the gate | Reviewed and corrected | Drafted |
| `src/x402/*` — resource server, three-stage enforcement | Reviewed and corrected | Drafted |
| `src/store/*` — schema and queries | Reviewed | Drafted |
| `src/resources/*` — inference and email | Reviewed | Drafted |
| `src/agent/*`, `scripts/*` — buyer agent, injection demo, owner CLI | Reviewed | Drafted |
| `frontend/*` — console, ledger, landing copy | Reviewed | Drafted |
| Hedera and Blocky402 integration decisions, key handling | Author | API surface research |
| This README and `docs/*` | Author edited | Drafted |

Prompts and planning notes are committed under [`docs/`](docs) rather than
gitignored, per event rules.

## Licence

MIT
