# 90-second demo

Five beats. The fourth is the one that wins it, so protect the time for it.

**Before you record**

```bash
export WARRANT_ACCOUNT_ID=0.0.10514332
export WARRANT_PRIVATE_KEY=…            # from .env, AGENT_HEDERA_PRIVATE_KEY
npx warrant catalogue                   # warm the terminal, prove it runs
```

Two windows: a browser on the console, and a terminal in a large font. Have the
ledger tab already open so the last cut is instant.

---

### 0:00 — 0:12 · The problem

**Screen:** the landing page, `https://warrant-aufgabe.vercel.app`.

> Give an AI agent a credit card and you have given it yours. Give it its own
> wallet and the spending limit is a suggestion, because the agent holds the
> keys. Warrant fixes that. The limit lives in a contract, and the agent buys
> real things under it.

### 0:12 — 0:28 · What it can buy

**Screen:** scroll to the catalogue. Let the cards land. Hover one so the call
replays.

> Eight things, live right now. A permanent name on Hedera. An email inbox it
> owns and reads replies at. A real phone number. Inference. Memory that
> outlives the process. Those are the actual providers answering: OpenAI,
> Resend, Telnyx, Hedera. Prices come from the same table the server charges
> against, so the page cannot lie about one.

### 0:28 — 0:52 · It buys something, now

**Screen:** cut to the terminal. Type it live.

```bash
npx warrant buy inference --prompt "one sentence: what is a soulbound token"
```

> No API key. No signup. The account that pays is the identity.

Let the JSON land, then put the cursor on `settlement`.

> Four hundred and two, pay, retry, answered. That id is the Hedera transaction
> the money settled in. Two cents, about a second, and nobody approved it.

### 0:52 — 1:14 · The chain says no

**Screen:** cut to the ceiling section on the page, or run `npm run demo:chain`.

> Here is the part that is not a database. Its owner wrote a policy into a
> contract: five dollars in total, one a day, and only these resources. It
> spends the day's dollar, tries once more, and gets this.

```
WindowCapExceeded  wanted 20000, remaining 0, reopens at 2026-09-14T13:51:27Z
```

> That refusal is not our service being polite. It is a contract revert on
> Hedera. It holds if we go down, if we turn evil, if we are replaced. And it
> tells the agent exactly when to come back, so being told no does not need a
> human either.

### 1:14 — 1:30 · Anyone can check

**Screen:** the ledger tab, `/ledger`. Scroll once. Click a receipt.

> Every purchase and every refusal, public, no credentials. Each one signed and
> checkable against the settlement on Hedera without asking us anything.
>
> An agent that can buy what it needs, under a limit its owner can prove, and a
> receipt for all of it. That is Warrant.

---

## Fallbacks, in case something is slow on the night

| If | Do |
|---|---|
| The live buy hangs | Cut to a pre-recorded take of the same command. Never wait on camera. |
| The terminal is a risk at all | `npm run agent -- "introduce yourself to agent 0x7510 and keep a note of it"` records well and shows PAID and REFUSED in one screen. |
| You are over time | Cut beat 2 to one sentence. Never cut beat 4. |

## Pages to show, in order

| Page | Why it is in the cut |
|---|---|
| `/` catalogue | Eight real resources with the real providers' marks. Proves it is wired to something. |
| `/` the ceiling section | The on-chain limit, which is the differentiator. |
| `/ledger` | Every receipt and every refusal, readable by anyone. |
| `/agent/0.0.10514332` | One agent's record. Use it only if you have spare seconds. |
| `/docs` | Skip on camera. It is for the judge who opens the repo afterwards. |
