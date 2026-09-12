# Warrant — web

The landing page and the operator console, in one Vite app.

```
npm install
npm run dev        # :5173, expects the service on :8090
npm run build
```

Point it at a service with `VITE_API_URL` in `.env.local`:

```
VITE_API_URL=http://localhost:8090
```

## Routes

| Route | What it is |
| --- | --- |
| `/` | Landing page, including a replay of a recorded run |
| `/console` | Where a human signs warrants and withdraws them |
| `/audit` | The public ledger: every receipt and every refusal |
| `/agent/:id` | One agent's record |
| `/docs` | Developer reference |

The console signs EIP-712 warrants with a browser wallet, or with a key it
generates and encrypts locally for machines that have no wallet installed.
Nothing here touches a chain: signing a warrant costs no gas and creates no
transaction, which is what lets an owner scope one tightly and withdraw it
without thinking about cost.
