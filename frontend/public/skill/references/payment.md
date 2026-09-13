# Payment — x402 on Hedera

Every paid call is the same three steps. Nothing about the resource changes
them.

## 1. Ask, and be told the price

```
POST /v1/inference
content-type: application/json
x-agent-address: 0x…

{"prompt":"hello"}
```

```
402 Payment Required
payment-required: <base64 of the x402 v2 challenge>

{"kind":"inference","title":"AI Inference","price":"$0.02","priceAtomic":"20000",
 "asset":"0.0.429274","poweredBy":"OpenAI",
 "hint":"Pay the challenge and send x-agent with the account you are paying from."}
```

Decode the `payment-required` header for the machine-readable version:

```json
{
  "x402Version": 2,
  "resource": { "url": "…/v1/inference", "serviceName": "Warrant" },
  "accepts": [{
    "scheme": "exact",
    "network": "hedera:testnet",
    "amount": "20000",
    "asset": "0.0.429274",
    "payTo": "0.0.10499247",
    "maxTimeoutSeconds": 120,
    "extra": { "feePayer": "0.0.7162784" }
  }]
}
```

`amount` is atomic units of a 6-decimal token, so `20000` is $0.02. `feePayer`
is the facilitator, which is why the agent needs no HBAR.

## 2. Pay and retry the same request

Sign an `exact` x402 payment for that challenge and send the identical request
again with two more headers:

```
X-PAYMENT: <base64 payment payload>
x-agent: 0.0.10514332
```

`x-agent` must be the account that signed the payment. The service recovers the
payer from the signature and rejects a mismatch, because a call that pays from
one account and claims another cannot be attributed to either.

`x-agent-address` is the agent's EVM address. Only `identity.mint` requires it,
because only that resource writes to a contract on the agent's behalf.

## 3. Read the answer

```
200 OK
payment-response: <base64, carries the settlement reference>

{"kind":"inference","result":{"model":"gpt-4o-mini","text":"…",
 "usage":{"prompt":8,"completion":41}}}
```

## The four answers that are not 200

| Status | Meaning | Did you pay? |
|---|---|---|
| `400` | Your request was missing or malformed. `{"kind","error"}` | No |
| `402` | No payment, or a payment that did not verify | No |
| `409` | Refused before the money moved, with `charged: false` | No |
| `502` | **Settled, then the provider failed.** `{"kind","error","settled":true}` | **Yes** |

`502` with `settled: true` is the one that matters. The money is gone and the
thing was not delivered. Retrying spends again. Read the flag.

## The two pre-payment refusals

Most purchases cannot be judged before they run, so the service charges for the
attempt. Two can:

- **`POST /v1/identity/mint`** when `x-agent-address` already holds a token. Answers `409` with `tokenId` and `charged: false`. An address gets one identity, permanently.
- **`POST /v1/phone/provision`** when the upstream number provider has no spendable credit. Answers `409` with `charged: false`, because the provider would refuse the order after taking your money.

Both are checked ahead of the payment middleware, so they cost nothing.

## Free endpoints

These never return `402`: `/v1/catalogue`, `/v1/contracts`, `/v1/purchases`,
`/v1/receipts`, `/v1/receipts/:id`, `/v1/phone/search`, `/v1/stats`,
`/v1/agents/:agent`, `/v1/email/inbox/:address`, `/v1/memory/:fileId`,
`/openapi.json`, `/health`.

Reading is free throughout. Anything that is a query rather than a transaction
costs nothing, including reading a memory file back off Hedera.

## Settlement

Payments settle in USDC, Hedera token `0.0.429274`, 6 decimals, through the
Blocky402 facilitator at `https://api.testnet.blocky402.com`. It is open, needs
no API key, and sponsors the Hedera network fee, so a paying agent holds
stablecoin and no HBAR.

The settlement reference looks like `0.0.7162784@1789265214.632663466` and is
the Hedera transaction id. It appears in the receipt and links to HashScan.
