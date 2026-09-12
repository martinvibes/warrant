/**
 * Reads that cost nothing and need no credentials.
 *
 * A buyer has to be able to check the price before paying it, and anyone at
 * all has to be able to check what this service actually sold. An audit
 * surface that requires a login is not an audit surface.
 */
import { Router } from "express";
import { CATALOGUE, LIVE_CATALOGUE, config, moneyFor } from "../config.js";
import { allInboxes, listPurchases, purchaseStats, spentBy } from "../store/db.js";
import { messagesFor } from "../resources/mailbox.js";
import { readMemory } from "../resources/memory.js";
import { numbersFor } from "../resources/phone.js";

export const publicApi = Router();

function present(offer: (typeof CATALOGUE)[number]) {
  return {
    kind: offer.kind,
    title: offer.title,
    blurb: offer.blurb,
    poweredBy: offer.poweredBy,
    method: offer.method,
    path: offer.path,
    price: moneyFor(offer.price),
    priceAtomic: offer.price.toString(),
    live: offer.live,
  };
}

/** What is for sale and at what price. The same list the middleware charges. */
publicApi.get("/v1/catalogue", (_req, res) => {
  res.json({
    asset: config.asset,
    assetDecimals: config.assetDecimals,
    network: config.network,
    payTo: config.payTo,
    facilitator: config.facilitatorUrl,
    offers: CATALOGUE.map(present),
    live: LIVE_CATALOGUE.length,
  });
});

publicApi.get("/v1/contracts", (_req, res) => {
  const explorer = (address: string) =>
    address ? `https://hashscan.io/${config.hederaNetwork}/contract/${address}` : null;
  res.json({
    network: config.network,
    chainId: config.chainId,
    identity: { address: config.identityContract || null, explorer: explorer(config.identityContract) },
    market: { address: config.marketContract || null, explorer: explorer(config.marketContract) },
    treasury: { address: config.treasuryContract || null, explorer: explorer(config.treasuryContract) },
  });
});

/** Everything bought here, newest first. */
publicApi.get("/v1/purchases", (req, res) => {
  const agent = typeof req.query.agent === "string" ? req.query.agent : undefined;
  const limit = Math.min(Number(req.query.limit ?? 100) || 100, 500);
  res.json({
    purchases: listPurchases(agent, limit).map((p) => ({
      id: p.id,
      agent: p.agent,
      kind: p.kind,
      amount: p.amount,
      asset: p.asset,
      network: p.network,
      transaction: p.tx_id,
      explorer: p.tx_id ? `https://hashscan.io/${config.hederaNetwork}/transaction/${p.tx_id}` : null,
      at: new Date(p.created_at).toISOString(),
    })),
  });
});

publicApi.get("/v1/stats", (_req, res) => {
  res.json(purchaseStats());
});

/** One agent's record: what it bought and what it now owns. */
publicApi.get("/v1/agents/:agent", (req, res) => {
  const agent = req.params.agent;
  res.json({
    agent,
    spent: spentBy(agent).toString(),
    purchases: listPurchases(agent, 100).length,
    inboxes: allInboxes(500)
      .filter((i) => i.agent === agent)
      .map((i) => ({ address: i.address, at: new Date(i.created_at).toISOString() })),
    numbers: numbersFor(agent),
  });
});

/** An inbox's mail. Sealed bodies come back sealed; nothing here can open them. */
publicApi.get("/v1/email/inbox/:address", (req, res) => {
  res.json({ address: req.params.address, messages: messagesFor(req.params.address) });
});

/** Reading a Hedera file is a query, not a transaction, so it is free. */
publicApi.get("/v1/memory/:fileId", async (req, res) => {
  try {
    res.json(await readMemory(req.params.fileId));
  } catch (err) {
    res.status(404).json({ error: `Could not read file ${req.params.fileId}: ${(err as Error).message}` });
  }
});
