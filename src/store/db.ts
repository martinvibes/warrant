/**
 * Local state. Deliberately small: everything the gate needs is in the signed
 * warrant, so the only things worth persisting are facts the warrant cannot
 * carry — what has actually been spent, what has been revoked, and what
 * happened.
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";

fs.mkdirSync(config.dataDir, { recursive: true });
const db = new Database(path.join(config.dataDir, "warrant.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS warrants (
  id          TEXT PRIMARY KEY,
  owner       TEXT NOT NULL,
  agent       TEXT NOT NULL,
  asset       TEXT NOT NULL,
  cap         TEXT NOT NULL,
  resources   TEXT NOT NULL,
  purpose     TEXT NOT NULL,
  expiry      INTEGER NOT NULL,
  nonce       TEXT NOT NULL,
  signature   TEXT NOT NULL,
  payload     TEXT NOT NULL,
  revoked_at  INTEGER,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS receipts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  warrant_id  TEXT NOT NULL,
  agent       TEXT NOT NULL,
  payer       TEXT NOT NULL,
  resource    TEXT NOT NULL,
  purpose     TEXT NOT NULL,
  amount      TEXT NOT NULL,
  asset       TEXT NOT NULL,
  network     TEXT NOT NULL,
  tx_id       TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS receipts_by_warrant ON receipts(warrant_id);

CREATE TABLE IF NOT EXISTS refusals (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  warrant_id  TEXT,
  agent       TEXT,
  resource    TEXT NOT NULL,
  price       TEXT NOT NULL,
  code        TEXT NOT NULL,
  reason      TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
`);

export interface WarrantRow {
  id: string;
  owner: string;
  agent: string;
  asset: string;
  cap: string;
  resources: string;
  purpose: string;
  expiry: number;
  nonce: string;
  signature: string;
  payload: string;
  revoked_at: number | null;
  created_at: number;
}

export interface ReceiptRow {
  id: number;
  warrant_id: string;
  agent: string;
  payer: string;
  resource: string;
  purpose: string;
  amount: string;
  asset: string;
  network: string;
  tx_id: string;
  created_at: number;
}

export interface RefusalRow {
  id: number;
  warrant_id: string | null;
  agent: string | null;
  resource: string;
  price: string;
  code: string;
  reason: string;
  created_at: number;
}

const now = () => Math.floor(Date.now() / 1000);

/** Records a warrant the first time we see it, so the console can list it. */
export function rememberWarrant(row: Omit<WarrantRow, "revoked_at" | "created_at">): void {
  db.prepare(
    `INSERT INTO warrants (id, owner, agent, asset, cap, resources, purpose, expiry, nonce, signature, payload, created_at)
     VALUES (@id, @owner, @agent, @asset, @cap, @resources, @purpose, @expiry, @nonce, @signature, @payload, @created_at)
     ON CONFLICT(id) DO NOTHING`,
  ).run({ ...row, created_at: now() });
}

export function getWarrant(id: string): WarrantRow | undefined {
  return db.prepare(`SELECT * FROM warrants WHERE id = ?`).get(id) as WarrantRow | undefined;
}

export function listWarrants(): WarrantRow[] {
  return db.prepare(`SELECT * FROM warrants ORDER BY created_at DESC`).all() as WarrantRow[];
}

export function revokeWarrant(id: string): boolean {
  const r = db.prepare(`UPDATE warrants SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL`).run(now(), id);
  return r.changes > 0;
}

export function isRevoked(id: string): boolean {
  const row = db.prepare(`SELECT revoked_at FROM warrants WHERE id = ?`).get(id) as
    | { revoked_at: number | null }
    | undefined;
  return Boolean(row?.revoked_at);
}

/**
 * Spend to date under one warrant, summed from settled receipts.
 *
 * Derived rather than kept as a counter: a counter can drift out of step with
 * what actually settled, and the cap is only as trustworthy as the number it
 * is compared against.
 */
export function spentUnder(warrantId: string): bigint {
  const rows = db.prepare(`SELECT amount FROM receipts WHERE warrant_id = ?`).all(warrantId) as {
    amount: string;
  }[];
  return rows.reduce((sum, r) => sum + BigInt(r.amount), 0n);
}

export function writeReceipt(r: Omit<ReceiptRow, "id" | "created_at">): ReceiptRow {
  const info = db
    .prepare(
      `INSERT INTO receipts (warrant_id, agent, payer, resource, purpose, amount, asset, network, tx_id, created_at)
       VALUES (@warrant_id, @agent, @payer, @resource, @purpose, @amount, @asset, @network, @tx_id, @created_at)`,
    )
    .run({ ...r, created_at: now() });
  return db.prepare(`SELECT * FROM receipts WHERE id = ?`).get(info.lastInsertRowid) as ReceiptRow;
}

export function listReceipts(warrantId?: string, limit = 100): ReceiptRow[] {
  return warrantId
    ? (db
        .prepare(`SELECT * FROM receipts WHERE warrant_id = ? ORDER BY id DESC LIMIT ?`)
        .all(warrantId, limit) as ReceiptRow[])
    : (db.prepare(`SELECT * FROM receipts ORDER BY id DESC LIMIT ?`).all(limit) as ReceiptRow[]);
}

/** A refused attempt is evidence, so it is kept with the same care as a receipt. */
export function writeRefusal(r: Omit<RefusalRow, "id" | "created_at">): void {
  db.prepare(
    `INSERT INTO refusals (warrant_id, agent, resource, price, code, reason, created_at)
     VALUES (@warrant_id, @agent, @resource, @price, @code, @reason, @created_at)`,
  ).run({ ...r, created_at: now() });
}

export function listRefusals(limit = 100): RefusalRow[] {
  return db.prepare(`SELECT * FROM refusals ORDER BY id DESC LIMIT ?`).all(limit) as RefusalRow[];
}

export default db;
