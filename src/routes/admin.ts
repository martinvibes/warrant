/**
 * Unpaid, read-mostly endpoints: what this service sells, what warrants exist,
 * what was bought, and what was refused. The console is built entirely on
 * these, so anything the console can show, an auditor can curl.
 */
import { Router } from "express";
import { config, moneyFor, PRICES, RESOURCES } from "../config.js";
import {
  getWarrant,
  listReceipts,
  listRefusals,
  listWarrants,
  rememberWarrant,
  revokeWarrant,
  spentUnder,
  type WarrantRow,
} from "../store/db.js";
import { verifyRevocation, type SignedRevocation } from "../warrant/revocation.js";
import {
  fromWire,
  verifyWarrantSignature,
  warrantId,
  type SignedWarrant,
} from "../warrant/warrant.js";

export const admin = Router();

/** A warrant as the console wants it: signed facts plus derived spend. */
function present(row: WarrantRow) {
  const spent = spentUnder(row.id);
  const cap = BigInt(row.cap);
  const now = Math.floor(Date.now() / 1000);
  return {
    id: row.id,
    owner: row.owner,
    agent: row.agent,
    asset: row.asset,
    purpose: row.purpose,
    resources: row.resources ? row.resources.split(",") : [],
    cap: cap.toString(),
    spent: spent.toString(),
    remaining: (cap - spent).toString(),
    expiry: row.expiry,
    revokedAt: row.revoked_at,
    status: row.revoked_at ? "revoked" : row.expiry <= now ? "expired" : "live",
    createdAt: row.created_at,
  };
}

admin.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "warrant",
    network: config.network,
    asset: config.asset,
    assetDecimals: config.assetDecimals,
    facilitator: config.facilitatorUrl,
    payTo: config.payTo || null,
  });
});

admin.get("/v1/pricing", (_req, res) => {
  res.json({
    network: config.network,
    asset: config.asset,
    decimals: config.assetDecimals,
    resources: RESOURCES.map((r) => ({
      resource: r,
      price: moneyFor(r),
      atomic: PRICES[r].toString(),
    })),
  });
});

admin.get("/v1/warrants", (_req, res) => {
  res.json({ warrants: listWarrants().map(present) });
});

admin.get("/v1/warrants/:id", (req, res) => {
  const row = getWarrant(req.params.id);
  if (!row) {
    res.status(404).json({ error: "No warrant with that id has been presented to this service yet." });
    return;
  }
  res.json({ warrant: present(row), receipts: listReceipts(row.id) });
});

/**
 * Registers a warrant the owner has just signed.
 *
 * The gate already records any warrant an agent presents, so this endpoint
 * grants nothing: it only lets the owner see a warrant in the console before
 * the agent has spent against it. The gate re-checks the signature on every
 * request regardless of what is stored here, so a warrant being present in
 * this table is never itself an authorisation.
 */
admin.post("/v1/warrants", async (req, res) => {
  const signed = req.body as SignedWarrant | undefined;
  if (!signed?.signature || !signed.warrant) {
    res.status(400).json({ error: "Post { warrant, signature } — a warrant is only a warrant once it is signed." });
    return;
  }

  let w;
  try {
    w = fromWire(signed.warrant);
  } catch (err) {
    res.status(400).json({ error: `That warrant will not parse: ${(err as Error).message}` });
    return;
  }

  const check = await verifyWarrantSignature(signed, config.network);
  if (!check.ok) {
    res.status(403).json({
      error: `That signature does not belong to ${w.owner}. It recovers to ${check.recovered}.`,
      code: "bad_signature",
    });
    return;
  }

  if (config.allowedOwners.length && !config.allowedOwners.some((o) => o.toLowerCase() === w.owner.toLowerCase())) {
    res.status(403).json({
      error: `This service does not accept warrants from ${w.owner}.`,
      code: "unknown_owner",
    });
    return;
  }

  const id = warrantId(w, config.network);
  rememberWarrant({
    id,
    owner: w.owner,
    agent: w.agent,
    asset: w.asset,
    cap: w.cap.toString(),
    resources: w.resources.join(","),
    purpose: w.purpose,
    expiry: Number(w.expiry),
    nonce: w.nonce.toString(),
    signature: signed.signature,
    payload: JSON.stringify(signed.warrant),
  });

  res.status(201).json({
    warrant: present(getWarrant(id)!),
    header: Buffer.from(JSON.stringify(signed)).toString("base64"),
  });
});

/**
 * Revokes a warrant on the owner's signature.
 *
 * Returns 200 for an already-revoked warrant rather than an error: the caller
 * asked for it to be dead, and it is dead. Making this idempotent means a
 * panicking operator can hit the button twice without reading an error message.
 */
admin.post("/v1/warrants/:id/revoke", async (req, res) => {
  const row = getWarrant(req.params.id);
  if (!row) {
    res.status(404).json({ error: "No warrant with that id has been presented to this service yet." });
    return;
  }

  const signed = req.body as SignedRevocation | undefined;
  if (!signed?.signature || !signed.revocation) {
    res.status(400).json({
      error: "Revoking needs a signed revocation. Post { revocation: { warrantId, owner, issuedAt }, signature }.",
    });
    return;
  }
  if (signed.revocation.warrantId !== row.id) {
    res.status(400).json({ error: "This revocation is for a different warrant." });
    return;
  }

  const check = await verifyRevocation(signed, config.network, row.owner);
  if (!check.ok) {
    res.status(403).json({ error: check.reason, code: check.code });
    return;
  }

  const changed = revokeWarrant(row.id);
  res.json({
    revoked: true,
    alreadyRevoked: !changed,
    warrant: present(getWarrant(row.id)!),
  });
});

admin.get("/v1/receipts", (req, res) => {
  const warrantId = typeof req.query.warrant === "string" ? req.query.warrant : undefined;
  res.json({ receipts: listReceipts(warrantId) });
});

admin.get("/v1/refusals", (_req, res) => {
  res.json({ refusals: listRefusals() });
});
