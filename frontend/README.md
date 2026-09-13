# Warrant — web

The landing page, the public ledger and the developer reference, in one Vite app.

```
npm install
npm run dev        # :5173, expects the service on :8090
npm run build
```

Point it at a service with `VITE_API_URL` in `.env.local`:

```
VITE_API_URL=http://localhost:8090
```

Nothing here holds a key or signs anything. Every page is a reader: it asks the
service what it sells, what it sold and what it refused, and draws the answer.
The build output is served by the service itself from `frontend/dist`, so the
console and the API are one origin and one deploy.

## Routes

| Route | What it is |
| --- | --- |
| `/` | The landing page: the catalogue, a live number search, a replayed run, the ceiling, and settlement |
| `/ledger` | The public ledger, every receipt and every refusal, readable with no credentials |
| `/agent/:id` | One agent's record: what it bought, what it was refused, what is left of its ceiling |
| `/docs` | Developer reference for the paid endpoints |

The catalogue reads `/v1/catalogue`, which is the same table the service charges
against, so a card cannot advertise a price the service will not honour. A live
resource carries the mark of the company actually answering the call; the ones
still in development carry a drawn glyph, no endpoint and no price.

## Checks

```
npm run check:renders     # every page renders without throwing
```

A typecheck will not catch the mistake that shows up as a blank page: a bad hook
call, a missing provider, a destructure of undefined. This renders each
top-level component to a string and fails on one that throws or comes back with
almost no text.
