# Warrant on Bazantic

The catalogue is listed on Bazantic twice over: once as a gateway, so any MCP
client can call the paid endpoints as tools, and once as two Recipes, which are
the two things people actually want to do with it.

## Gateway

| | |
|---|---|
| Name | Warrant |
| Slug | `qmt6sdhe5ffmva3zl2iagc6hkm` |
| MCP | `https://qmt6sdhe5ffmva3zl2iagc6hkm.bazgateway.com/mcp` |
| Spec | `https://warrant-api-production-e111.up.railway.app/openapi.json` |
| Auth | `x402-mpp` — there is no API key; the paying account is the identity |
| Status | active |

Registered with:

```sh
baz gateway add \
  --spec-url https://warrant-api-production-e111.up.railway.app/openapi.json \
  --endpoint https://warrant-api-production-e111.up.railway.app \
  --auth-type x402-mpp --name Warrant --status active
```

Twenty tools come out of the spec: eight that cost money and return `402` until
they are paid, and eleven free reads plus the gateway's own `info`. The paid
ones take the buyer's Hedera account id in `x-agent`, because on Warrant the
account that pays is the account that owns what it bought.

## Recipes

Both are published and public.

### `agent-starter-kit` — https://bazantic.com/recipes/agent-starter-kit

Stands up a new agent: mints its identity on Hedera, writes its standing brief
to a Hedera file, and provisions its mailbox. Three paid calls, settled by the
agent itself in USDC, inside the cap its treasury contract holds. Reads the
catalogue first so the prices it quotes are the ones the server charges, and
treats a `402` as a price and a `409` as "it already owns that" rather than as
failures.

Bindings: `catalogue`, `identity_mint`, `memory_write`, `email_inbox`, `agent`.

### `spend-audit` — https://bazantic.com/recipes/spend-audit

Reads back what an agent spent and what it was stopped from spending, grouped by
resource, with every refusal and the reason for it, against the limit the
contract holds. Every call it makes is a free read, so auditing an agent costs
nothing — which is the point: the ledger is public, and a refusal is the most
interesting line in it.

Bindings: `agent`, `purchases`, `receipts`, `contracts`, `stats`.

## Source of truth

The JSON in `recipes/` is what was sent to `baz recipe create`. To change a
Recipe, edit the file, then:

```sh
baz recipe update <handle> recipes/<file>.json
baz recipe publish <handle>
```

Never hand-build a gateway URL — read `endpointUrl` from `baz gateway list --json`.
