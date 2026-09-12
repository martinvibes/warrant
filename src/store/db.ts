/**
 * Local state.
 *
 * Deliberately small. The chain holds what must survive this service: the
 * identity, the catalogue, the limit and what was drawn against it. What lives
 * here is the part a chain is a poor fit for, which is the body of what was
 * bought and the mail that arrived for it.
 *
 * Purchases are recorded twice on purpose. The row below is fast to read and
 * carries the response; the on-chain settlement record is slow, costs gas, and
 * cannot be edited by us. Anything a buyer needs to trust, they should read
 * from the second one.
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";

fs.mkdirSync(config.dataDir, { recursive: true });
const db = new Database(path.join(config.dataDir, "warrant.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS purchases (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  agent       TEXT NOT NULL,
  kind        TEXT NOT NULL,
  amount      TEXT NOT NULL,
  asset       TEXT NOT NULL,
  network     TEXT NOT NULL,
  tx_id       TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS purchases_by_agent ON purchases(agent, id DESC);
CREATE INDEX IF NOT EXISTS purchases_by_kind ON purchases(kind, id DESC);

CREATE TABLE IF NOT EXISTS inboxes (
  address     TEXT PRIMARY KEY,
  agent       TEXT NOT NULL,
  local_part  TEXT NOT NULL UNIQUE,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  address     TEXT NOT NULL,
  sender      TEXT NOT NULL,
  subject     TEXT NOT NULL,
  body        TEXT NOT NULL,
  sealed      INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_by_address ON messages(address, id DESC);

CREATE TABLE IF NOT EXISTS phone_numbers (
  number      TEXT PRIMARY KEY,
  agent       TEXT NOT NULL,
  country     TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
`);

/**
 * Receipts were added after the first purchases were recorded, so the columns
 * are added in place rather than by recreating the table. Dropping real
 * settlement history to simplify a migration would be a poor trade.
 */
const columns = new Set(
  (db.prepare("PRAGMA table_info(purchases)").all() as { name: string }[]).map((c) => c.name),
);
for (const [name, type] of [
  ["resource", "TEXT"],
  ["receipt_id", "TEXT"],
  ["digest", "TEXT"],
  ["signature", "TEXT"],
] as const) {
  if (!columns.has(name)) db.exec(`ALTER TABLE purchases ADD COLUMN ${name} ${type}`);
}
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS purchases_by_receipt ON purchases(receipt_id)");

/* --- purchases ------------------------------------------------------------ */

export interface PurchaseRow {
  id: number;
  /** Hedera account id that paid, which is the agent's identity on this path. */
  agent: string;
  kind: string;
  /** Smallest unit of the asset, as a decimal string so nothing rounds. */
  amount: string;
  asset: string;
  network: string;
  tx_id: string | null;
  created_at: number;
  /** The route that was bought, so a receipt names the thing and not just its kind. */
  resource?: string | null;
  /** Set once the receipt is signed; see src/receipts.ts. */
  receipt_id?: string | null;
  digest?: string | null;
  signature?: string | null;
}

/**
 * `created_at` is accepted rather than generated because the receipt is signed
 * over its own issue time. Letting this row stamp its own clock puts the two a
 * few milliseconds apart, and the digest then fails to rebuild from the stored
 * fields, which is exactly the check a receipt exists to pass.
 */
export function writePurchase(
  r: Omit<PurchaseRow, "id" | "created_at"> & { created_at?: number },
): PurchaseRow {
  const created_at = r.created_at ?? Date.now();
  const row = {
    resource: null,
    receipt_id: null,
    digest: null,
    signature: null,
    ...r,
    created_at,
  };
  const info = db
    .prepare(
      `INSERT INTO purchases (agent, kind, amount, asset, network, tx_id, resource, receipt_id, digest, signature, created_at)
       VALUES (@agent, @kind, @amount, @asset, @network, @tx_id, @resource, @receipt_id, @digest, @signature, @created_at)`,
    )
    .run(row);
  return { ...row, id: Number(info.lastInsertRowid) };
}

/** One purchase by the settlement it was paid with. */
export function purchaseBySettlement(txId: string): PurchaseRow | undefined {
  return db.prepare("SELECT * FROM purchases WHERE tx_id = ? ORDER BY id DESC LIMIT 1").get(txId) as
    | PurchaseRow
    | undefined;
}

/** One purchase by the receipt printed on it. */
export function purchaseByReceipt(receiptId: string): PurchaseRow | undefined {
  return db.prepare("SELECT * FROM purchases WHERE receipt_id = ?").get(receiptId) as PurchaseRow | undefined;
}

export function listPurchases(agent?: string, limit = 100): PurchaseRow[] {
  return agent
    ? (db
        .prepare(`SELECT * FROM purchases WHERE agent = ? ORDER BY id DESC LIMIT ?`)
        .all(agent, limit) as PurchaseRow[])
    : (db.prepare(`SELECT * FROM purchases ORDER BY id DESC LIMIT ?`).all(limit) as PurchaseRow[]);
}

/** Summed from rows rather than kept as a counter, so it cannot drift. */
export function spentBy(agent: string): bigint {
  const rows = db.prepare(`SELECT amount FROM purchases WHERE agent = ?`).all(agent) as { amount: string }[];
  return rows.reduce((total, r) => total + BigInt(r.amount), 0n);
}

export function purchaseStats(): { total: number; agents: number; byKind: Record<string, number> } {
  const total = (db.prepare(`SELECT COUNT(*) n FROM purchases`).get() as { n: number }).n;
  const agents = (db.prepare(`SELECT COUNT(DISTINCT agent) n FROM purchases`).get() as { n: number }).n;
  const rows = db.prepare(`SELECT kind, COUNT(*) n FROM purchases GROUP BY kind`).all() as {
    kind: string;
    n: number;
  }[];
  return { total, agents, byKind: Object.fromEntries(rows.map((r) => [r.kind, r.n])) };
}

/* --- what an agent owns, and what arrived for it -------------------------- */

export interface InboxRow {
  address: string;
  agent: string;
  local_part: string;
  created_at: number;
}

export interface MessageRow {
  id: number;
  address: string;
  sender: string;
  subject: string;
  body: string;
  /** 1 when the body is a sealed envelope this service cannot read. */
  sealed: number;
  created_at: number;
}

export interface PhoneRow {
  number: string;
  agent: string;
  country: string;
  provider_id: string;
  created_at: number;
}

export function createInbox(row: Omit<InboxRow, "created_at">): InboxRow {
  const created_at = Date.now();
  db.prepare(
    `INSERT INTO inboxes (address, agent, local_part, created_at) VALUES (@address, @agent, @local_part, @created_at)`,
  ).run({ ...row, created_at });
  return { ...row, created_at };
}

export function getInbox(address: string): InboxRow | undefined {
  return db.prepare(`SELECT * FROM inboxes WHERE address = ?`).get(address.toLowerCase()) as InboxRow | undefined;
}

export function localPartTaken(localPart: string): boolean {
  return db.prepare(`SELECT 1 FROM inboxes WHERE local_part = ?`).get(localPart.toLowerCase()) !== undefined;
}

export function inboxesOf(agent: string): InboxRow[] {
  return db.prepare(`SELECT * FROM inboxes WHERE agent = ? ORDER BY created_at DESC`).all(agent) as InboxRow[];
}

export function allInboxes(limit = 100): InboxRow[] {
  return db.prepare(`SELECT * FROM inboxes ORDER BY created_at DESC LIMIT ?`).all(limit) as InboxRow[];
}

export function deliver(row: Omit<MessageRow, "id" | "created_at">): MessageRow {
  const created_at = Date.now();
  const info = db
    .prepare(
      `INSERT INTO messages (address, sender, subject, body, sealed, created_at)
       VALUES (@address, @sender, @subject, @body, @sealed, @created_at)`,
    )
    .run({ ...row, created_at });
  return { ...row, id: Number(info.lastInsertRowid), created_at };
}

export function readInbox(address: string, limit = 50): MessageRow[] {
  return db
    .prepare(`SELECT * FROM messages WHERE address = ? ORDER BY id DESC LIMIT ?`)
    .all(address.toLowerCase(), limit) as MessageRow[];
}

export function rememberNumber(row: Omit<PhoneRow, "created_at">): PhoneRow {
  const created_at = Date.now();
  db.prepare(
    `INSERT INTO phone_numbers (number, agent, country, provider_id, created_at)
     VALUES (@number, @agent, @country, @provider_id, @created_at)`,
  ).run({ ...row, created_at });
  return { ...row, created_at };
}

export function numbersOf(agent: string): PhoneRow[] {
  return db.prepare(`SELECT * FROM phone_numbers WHERE agent = ? ORDER BY created_at DESC`).all(agent) as PhoneRow[];
}

export default db;
