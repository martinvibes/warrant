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
import { numbersFor, searchNumbers } from "../resources/phone.js";
import { bySettlement, fromRow, issuerAddress, lookup, RECEIPT_VERSION } from "../receipts.js";
import { openapi } from "../openapi.js";

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

/**
 * The machine-readable version of this file.
 *
 * Served rather than committed as a static artefact so it cannot describe a
 * price the service is no longer charging. A gateway that indexes this is
 * reading the running system, not a snapshot of it.
 */
publicApi.get("/openapi.json", (_req, res) => {
  res.json(openapi());
});

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
    // The address a receipt's signature must recover to. Public by design:
    // checking a receipt should not require asking us anything.
    receiptIssuer: issuerAddress() ?? null,
    receiptVersion: RECEIPT_VERSION,
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
      receipt: p.receipt_id ?? null,
      at: new Date(p.created_at).toISOString(),
    })),
  });
});

/**
 * One receipt, in the form it was signed in.
 *
 * Public because a receipt whose holder has to authenticate to show it is not
 * proof of anything to a third party.
 */
publicApi.get("/v1/receipts", (req, res) => {
  const settlement = typeof req.query.settlement === "string" ? req.query.settlement : undefined;
  if (settlement) {
    const receipt = bySettlement(settlement);
    if (!receipt) {
      res.status(404).json({ error: `No receipt here was issued against settlement ${settlement}.` });
      return;
    }
    res.json({ receipt, verify: VERIFY_INSTRUCTIONS });
    return;
  }
  const agent = typeof req.query.agent === "string" ? req.query.agent : undefined;
  const limit = Math.min(Number(req.query.limit ?? 50) || 50, 200);
  res.json({ receipts: listPurchases(agent, limit).map(fromRow), verify: VERIFY_INSTRUCTIONS });
});

publicApi.get("/v1/receipts/:id", (req, res) => {
  const receipt = lookup(req.params.id);
  if (!receipt) {
    res.status(404).json({ error: `No receipt ${req.params.id} was issued here.` });
    return;
  }
  res.json({ receipt, verify: VERIFY_INSTRUCTIONS });
});

/** How to check one without trusting this service. */
const VERIFY_INSTRUCTIONS = {
  digest: "sha256(version|id|agent|kind|resource|amount|asset|network|settlement|issuedAt)",
  signature: "an EIP-191 personal_sign over that digest string",
  signer: "must recover to receiptIssuer from /v1/contracts",
};

/**
 * Numbers available to buy. Free, because a price list nobody can read is not
 * a price list. Ordering one is the paid step, at POST /v1/phone/provision.
 */
publicApi.get("/v1/phone/search", async (req, res) => {
  const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
  try {
    const numbers = await searchNumbers({
      country: str(req.query.country),
      areaCode: str(req.query.area),
      contains: str(req.query.contains),
      limit: Number(req.query.limit ?? 10) || 10,
    });
    res.json({ numbers, orderAt: "POST /v1/phone/provision" });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message, numbers: [] });
  }
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
