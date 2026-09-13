# warrant-client

Buy resources for an AI agent over x402 on Hedera: a permanent name, an email
inbox it owns, a phone number, SMS, inference, and memory written to a file
nobody can edit. One call at a time, in USDC, with no API key and no signup.

```bash
npm i warrant-client
```

```ts
import { Warrant } from "warrant-client";

const warrant = new Warrant({
  accountId: process.env.WARRANT_ACCOUNT_ID!,
  privateKey: process.env.WARRANT_PRIVATE_KEY!,
});

const { result, settlement } = await warrant.buy("inference", { prompt: "hello" });
```

The endpoint and the price come from the service's own catalogue, so a service
that adds a resource does not need this package republished to stay usable.

## Command line

```bash
export WARRANT_ACCOUNT_ID=0.0.10514332
export WARRANT_PRIVATE_KEY=302e…

npx warrant catalogue
npx warrant buy inference --prompt "one line on Hedera"
npx warrant read /v1/receipts?limit=3
```

## The one error that matters

A payment settles before the resource runs, so an upstream failure can happen
after the money moved. That comes back as a `WarrantError` with `settled: true`,
and retrying it buys the failure twice.

```ts
try {
  await warrant.buy("email.send", { from, to, subject, body });
} catch (err) {
  if (err instanceof WarrantError && err.settled) { /* paid, not delivered */ }
  if (err instanceof WarrantError && err.free)    { /* safe to fix and repeat */ }
}
```

## What it needs

A Hedera account holding testnet USDC, token `0.0.429274`. It does **not** need
HBAR: the facilitator sponsors the network fee.

Full documentation, including every request shape and the on-chain spending
limit, is at
[`/skill.md`](https://warrant-api-production-e111.up.railway.app/skill.md).
Source: https://github.com/martinvibes/warrant

MIT.
