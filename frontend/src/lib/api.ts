/**
 * Client for the Warrant service, plus the request log the terminal and the
 * audit page read from.
 *
 * Every endpoint here is unpaid and unauthenticated on purpose. The console is
 * built entirely out of these calls, which means anything an operator can see
 * in the browser, an auditor can reproduce with curl. The paid endpoints are
 * deliberately absent: the browser is where a human authorises spending, not
 * where an agent spends.
 */

export const API_URL =
  (import.meta as any).env?.VITE_API_URL || 'http://localhost:8090';

/** Atomic units of the settlement asset, as a decimal string. */
export type Atomic = string;

export interface Health {
  ok: boolean;
  service: string;
  network: string;
  asset: string;
  assetDecimals: number;
  facilitator: string;
  payTo: string | null;
}

export interface PricedResource {
  resource: string;
  price: string;
  atomic: Atomic;
}

export interface Pricing {
  network: string;
  asset: string;
  decimals: number;
  resources: PricedResource[];
}

export type WarrantStatus = 'live' | 'revoked' | 'expired';

export interface WarrantView {
  id: string;
  owner: string;
  agent: string;
  asset: string;
  purpose: string;
  resources: string[];
  cap: Atomic;
  spent: Atomic;
  remaining: Atomic;
  expiry: number;
  revokedAt: number | null;
  status: WarrantStatus;
  createdAt: number;
}

export interface Receipt {
  id: number;
  warrant_id: string;
  agent: string;
  payer: string;
  resource: string;
  purpose: string;
  amount: Atomic;
  asset: string;
  network: string;
  tx_id: string;
  created_at: number;
}

export interface Refusal {
  id: number;
  warrant_id: string | null;
  agent: string | null;
  resource: string;
  price: Atomic;
  code: string;
  reason: string;
  created_at: number;
}

/** The wire form of a warrant: every number a decimal string. */
export interface WarrantWire {
  owner: string;
  agent: string;
  asset: string;
  cap: string;
  resources: string[];
  purpose: string;
  expiry: string;
  nonce: string;
}

export interface SignedWarrant {
  warrant: WarrantWire;
  signature: string;
}

// ── request log ─────────────────────────────────────────────────────────
// Kept in module scope rather than React state so the log survives route
// changes and so non-component code can append to it.

export interface RequestLog {
  id: number;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  timestamp: number;
  ok: boolean;
}

const listeners = new Set<() => void>();
const logs: RequestLog[] = [];
let nextId = 1;

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach(fn => fn());
}

export function getLogs(): readonly RequestLog[] {
  return logs;
}

export function clearLogs(): void {
  logs.length = 0;
  notify();
}

export async function apiCall<T = any>(
  method: string,
  path: string,
  init?: RequestInit
): Promise<{ status: number; data: T | null }> {
  const start = performance.now();
  let status = 0;
  let data: T | null = null;
  try {
    const res = await fetch(API_URL + path, {
      method,
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
      ...init,
    });
    status = res.status;
    const text = await res.text();
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = text as unknown as T;
    }
  } catch {
    status = 0;
  } finally {
    logs.unshift({
      id: nextId++,
      method,
      path,
      status,
      durationMs: Math.round(performance.now() - start),
      timestamp: Date.now(),
      ok: status >= 200 && status < 400,
    });
    if (logs.length > 200) logs.length = 200;
    notify();
  }
  return { status, data };
}

/** Throws on any non-2xx so callers can use try/catch rather than checking codes. */
async function expectOk<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const { status, data } = await apiCall<T & { error?: string }>(method, path, {
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (status === 0) {
    throw new Error(
      `Cannot reach the Warrant service at ${API_URL}. Is it running?`
    );
  }
  if (status >= 400 || data === null) {
    throw new Error(data?.error || `HTTP ${status}`);
  }
  return data;
}

// ── endpoints ───────────────────────────────────────────────────────────

export const getHealth = () => expectOk<Health>('GET', '/health');

export const getPricing = () => expectOk<Pricing>('GET', '/v1/pricing');

export const listWarrants = () =>
  expectOk<{ warrants: WarrantView[] }>('GET', '/v1/warrants').then(r => r.warrants);

export const getWarrant = (id: string) =>
  expectOk<{ warrant: WarrantView; receipts: Receipt[] }>(
    'GET',
    `/v1/warrants/${id}`
  );

export const listReceipts = (warrantId?: string) =>
  expectOk<{ receipts: Receipt[] }>(
    'GET',
    warrantId ? `/v1/receipts?warrant=${warrantId}` : '/v1/receipts'
  ).then(r => r.receipts);

export const listRefusals = () =>
  expectOk<{ refusals: Refusal[] }>('GET', '/v1/refusals').then(r => r.refusals);

/**
 * Registers a signed warrant so it shows up in the console. The service
 * re-verifies the signature on every purchase regardless, so this is a
 * visibility call, not an authorisation.
 */
export const registerWarrant = (signed: SignedWarrant) =>
  expectOk<{ warrant: WarrantView; header: string }>(
    'POST',
    '/v1/warrants',
    signed
  );

export const revokeWarrant = (
  id: string,
  revocation: { warrantId: string; owner: string; issuedAt: string },
  signature: string
) =>
  expectOk<{ revoked: boolean; alreadyRevoked: boolean; warrant: WarrantView }>(
    'POST',
    `/v1/warrants/${id}/revoke`,
    { revocation, signature }
  );

// ── formatting ──────────────────────────────────────────────────────────

/**
 * Atomic units to a human amount. Prices here are fractions of a cent, so the
 * console never rounds a cap: it renders every decimal place the asset has and
 * trims only trailing zeros.
 */
export function formatAtomic(atomic: Atomic, decimals = 6): string {
  const negative = atomic.startsWith('-');
  const digits = (negative ? atomic.slice(1) : atomic).padStart(decimals + 1, '0');
  const whole = digits.slice(0, digits.length - decimals);
  const frac = digits.slice(digits.length - decimals).replace(/0+$/, '');
  const shown = frac.length === 0 ? '0.00' : frac.length === 1 ? `${frac}0` : frac;
  return `${negative ? '-' : ''}${whole}.${shown}`;
}

export const formatUsdc = (atomic: Atomic, decimals = 6) =>
  `$${formatAtomic(atomic, decimals)}`;

export function percentSpent(w: WarrantView): number {
  const cap = Number(w.cap);
  if (cap <= 0) return 0;
  return Math.min(100, (Number(w.spent) / cap) * 100);
}

export function shortId(id: string, head = 10, tail = 6): string {
  return id.length <= head + tail + 1 ? id : `${id.slice(0, head)}…${id.slice(-tail)}`;
}

export function timeAgo(unixSeconds: number): string {
  const secs = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86_400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86_400)}d ago`;
}

/** "in 4h" / "3h ago" — expiry reads better as a distance than a timestamp. */
export function untilExpiry(unixSeconds: number): string {
  const secs = unixSeconds - Math.floor(Date.now() / 1000);
  if (secs <= 0) return `expired ${timeAgo(unixSeconds)}`;
  if (secs < 3600) return `in ${Math.ceil(secs / 60)}m`;
  if (secs < 86_400) return `in ${Math.floor(secs / 3600)}h`;
  return `in ${Math.floor(secs / 86_400)}d`;
}

/** Hedera explorer link for a settled transaction. */
export function explorerTx(txId: string, network: string): string {
  const net = network.includes('mainnet') ? 'mainnet' : 'testnet';
  return `https://hashscan.io/${net}/transaction/${encodeURIComponent(txId)}`;
}

export function explorerAccount(accountId: string, network: string): string {
  const net = network.includes('mainnet') ? 'mainnet' : 'testnet';
  return `https://hashscan.io/${net}/account/${encodeURIComponent(accountId)}`;
}

export function summary() {
  const now = Date.now();
  const last60 = logs.filter(l => now - l.timestamp <= 60_000);
  const okCount = last60.filter(l => l.ok).length;
  const totalCount = last60.length;
  const avgLatency =
    totalCount > 0
      ? Math.round(last60.reduce((s, l) => s + l.durationMs, 0) / totalCount)
      : 0;
  // 2s buckets across the last minute, for the sparkline.
  const buckets = new Array(30).fill(0);
  for (const l of last60) {
    const idx = 29 - Math.floor((now - l.timestamp) / 2000);
    if (idx >= 0 && idx < 30) buckets[idx]++;
  }
  return {
    requestsPerMin: totalCount,
    avgLatency,
    uptime: totalCount > 0 ? (okCount / totalCount) * 100 : 100,
    buckets,
  };
}
