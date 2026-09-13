# Receipts

Every purchase writes a signed receipt. Reading them needs no credentials, which
is the point: "what did this service sell" is not a question you should have to
take its word on.

## One receipt

```
GET /v1/receipts/rcp_mtz6bfs7a7bda36ad5          free
```

Answers `{ receipt, verify }`. The receipt itself:

```json
{
  "version": "warrant-receipt-1",
  "id": "rcp_mtz6bfs7a7bda36ad5",
  "agent": "0.0.10514332",
  "kind": "email.send",
  "resource": "POST /v1/email/send",
  "amount": "200000",
  "asset": "0.0.429274",
  "network": "hedera:testnet",
  "settlement": "0.0.7162784@1789265214.632663466",
  "issuedAt": "2026-09-13T02:07:05.383Z",
  "issuer": "0x86bD1C4FF3Ed6B731135237fd07C1b4A0382e97e",
  "digest": "0x020bea74…",
  "signature": "0x17a83a02…",
  "explorer": "https://hashscan.io/testnet/transaction/0.0.7162784@1789265214.632663466"
}
```

## The whole ledger

```
GET /v1/receipts?limit=50        free, newest first
GET /v1/purchases?agent=0.0.…    free
GET /v1/stats                    free, counts by kind
```

The same ledger is drawn as a page at `/ledger`, and one agent's slice at
`/agent/:id`.

## Verifying one

1. Rebuild the digest: `sha256` over the fields joined with `|`, in this order.

   ```
   version|id|agent|kind|resource|amount|asset|network|settlement|issuedAt
   ```

2. Recover the signer from `signature`, an EIP-191 `personal_sign` over that
   digest **string**.
3. It must equal `receiptIssuer` from `GET /v1/contracts`.

Field order and the string-versus-bytes detail both matter: the signature is over
the hex digest as text, not over its bytes. `GET /v1/receipts` returns that rule
inline under `verify`, so a verifier never has to guess.

## What a receipt proves, and what it does not

It proves this service issued it, for that amount, against that Hedera
settlement transaction. Follow `explorer` to see the money move on chain.

It does not prove the resource worked. A purchase that settled and then failed
upstream still has a receipt, and answered `502` with `settled: true` at the
time. The receipt is a record of payment, not of satisfaction.
