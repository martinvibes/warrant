/**
 * Typed client for the Warrant API.
 *
 * Every read here is public and needs no credentials, which is deliberate:
 * a ledger you have to log in to see is not a ledger anyone can check.
 */
const API_URL = (import.meta.env?.VITE_API_URL as string | undefined) ?? '';

/**
 * The base to print in documentation, as opposed to the one to fetch from.
 * A reader copying a curl line out of the docs needs an absolute host, and in
 * development that host is the deployed one rather than their own machine.
 */
export const PUBLIC_API = API_URL || 'https://warrant-api-production-e111.up.railway.app';

export interface Offer {
  kind: string;
  title: string;
  blurb: string;
  poweredBy: string;
  method: string;
  path: string;
  price: string;
  priceAtomic: string;
  live: boolean;
}

export interface Catalogue {
  asset: string;
  assetDecimals: number;
  network: string;
  payTo: string;
  facilitator: string;
  offers: Offer[];
  live: number;
}

export interface Purchase {
  id: number;
  agent: string;
  kind: string;
  amount: string;
  asset: string;
  network: string;
  transaction: string | null;
  explorer: string | null;
  /** The signed receipt issued for this purchase, if one was. */
  receipt: string | null;
  at: string;
}

export interface Receipt {
  version: string;
  id: string;
  agent: string;
  kind: string;
  resource: string;
  amount: string;
  asset: string;
  network: string;
  settlement: string | null;
  issuedAt: string;
  issuer: string;
  digest: string;
  signature: string;
  explorer?: string;
}

export interface NumberOption {
  phoneNumber: string;
  country: string;
  region: string;
  monthly: string | null;
  upfront: string | null;
  currency: string | null;
  features: string[];
}

export interface Stats {
  total: number;
  agents: number;
  byKind: Record<string, number>;
}

export interface ContractRef {
  address: string | null;
  explorer: string | null;
}

export interface Contracts {
  network: string;
  chainId: number;
  identity: ContractRef;
  market: ContractRef;
  treasury: ContractRef;
  /** The address a receipt's signature must recover to. */
  receiptIssuer: string | null;
  receiptVersion: string;
}

export interface AgentRecord {
  agent: string;
  spent: string;
  purchases: number;
  inboxes: { address: string; at: string }[];
  numbers: { phoneNumber: string; country: string; provisionedAt: string }[];
}

export interface Health {
  ok: boolean;
  network: string;
  asset: string;
  facilitator: string;
  selling: number;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} on ${path}`);
  return (await res.json()) as T;
}

export const getHealth = () => get<Health>('/health');
export const getCatalogue = () => get<Catalogue>('/v1/catalogue');
export const getContracts = () => get<Contracts>('/v1/contracts');
export const getStats = () => get<Stats>('/v1/stats');
export const getAgent = (agent: string) => get<AgentRecord>(`/v1/agents/${encodeURIComponent(agent)}`);

export const getPurchases = (agent?: string, limit = 100) =>
  get<{ purchases: Purchase[] }>(
    `/v1/purchases?limit=${limit}${agent ? `&agent=${encodeURIComponent(agent)}` : ''}`,
  ).then(r => r.purchases);

export const getReceipt = (id: string) =>
  get<{ receipt: Receipt; verify: Record<string, string> }>(`/v1/receipts/${encodeURIComponent(id)}`);

/** Numbers available to buy. Free to call, which is why the page can call it. */
export const searchNumbers = (params: { country?: string; area?: string; limit?: number }) => {
  const query = new URLSearchParams({ limit: String(params.limit ?? 6) });
  if (params.country) query.set('country', params.country);
  if (params.area) query.set('area', params.area);
  return get<{ numbers: NumberOption[]; error?: string }>(`/v1/phone/search?${query}`);
};

/* --- formatting ----------------------------------------------------------- */

/** Atomic units to a human amount. Never used for arithmetic, only display. */
export function formatUsdc(atomic: string | bigint, decimals = 6): string {
  const value = typeof atomic === 'bigint' ? atomic : BigInt(atomic || '0');
  const scale = 10n ** BigInt(decimals);
  const whole = value / scale;
  const frac = (value % scale).toString().padStart(decimals, '0').replace(/0+$/, '');
  return `$${whole}${frac ? '.' + frac : ''}`;
}

export function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function shortHash(value: string, lead = 6, tail = 4): string {
  return value.length <= lead + tail + 1 ? value : `${value.slice(0, lead)}…${value.slice(-tail)}`;
}
