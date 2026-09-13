/**
 * Privy server wallets.
 *
 * The agent's signing key is not a hex string sitting in this repo's .env. It
 * lives in Privy, and this service is allowed to ask for a signature only
 * because it holds the private half of a key registered in a quorum that owns
 * the wallet. Privy never saw that private half: the keypair was generated
 * locally and only the public key was uploaded.
 *
 * That matters for the shape of the product rather than for convenience. The
 * chain caps how much the agent may spend; the quorum caps what it may sign at
 * all. Two independent refusals, neither of which needs a person awake.
 */
import crypto from "node:crypto";
import { config } from "../config.js";

const API = "https://api.privy.io";

/**
 * RFC 8785 canonical JSON, in the subset Privy's payloads use.
 *
 * The signature is over the serialised request, so the bytes we sign have to
 * be the bytes Privy reconstructs. Key order is the whole game here: a plain
 * JSON.stringify agrees with Privy by luck, and stops agreeing the moment a
 * field is added in a different position.
 */
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`)
    .join(",")}}`;
}

let cachedKey: crypto.KeyObject | undefined;

/** The authorization key, as a P-256 private key object. */
function authorizationKey(): crypto.KeyObject {
  if (cachedKey) return cachedKey;
  const raw = config.privyAuthPrivateKey.replace(/^wallet-auth:/, "");
  if (!raw) throw new Error("PRIVY_AUTH_PRIVATE_KEY is not set, so no wallet request can be authorised.");
  cachedKey = crypto.createPrivateKey({ key: Buffer.from(raw, "base64"), format: "der", type: "pkcs8" });
  return cachedKey;
}

/** The public half, in the form the quorum registration wants. */
export function authorizationPublicKey(): string {
  return crypto
    .createPublicKey(authorizationKey())
    .export({ type: "spki", format: "pem" })
    .toString()
    .trim();
}

function authorizationSignature(method: string, url: string, body: unknown): string {
  const payload = {
    version: 1,
    method,
    url,
    body,
    headers: { "privy-app-id": config.privyAppId },
  };
  return crypto
    .sign("sha256", Buffer.from(canonical(payload)), { key: authorizationKey(), dsaEncoding: "der" })
    .toString("base64");
}

export function privyConfigured(): boolean {
  return Boolean(config.privyAppId && config.privyAppSecret && config.privyAuthPrivateKey);
}

/**
 * One call to Privy.
 *
 * `authorised` is not "send credentials" — the app secret goes on every
 * request. It means "this call acts on a wallet the quorum owns", and so
 * carries a signature made with the key only this process holds.
 */
async function call<T>(method: string, path: string, body?: unknown, authorised = false): Promise<T> {
  if (!privyConfigured()) {
    throw new Error("Privy is not configured: set PRIVY_APP_ID, PRIVY_APP_SECRET and PRIVY_AUTH_PRIVATE_KEY.");
  }
  const url = `${API}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Basic ${Buffer.from(`${config.privyAppId}:${config.privyAppSecret}`).toString("base64")}`,
    "privy-app-id": config.privyAppId,
    "Content-Type": "application/json",
  };
  if (authorised) headers["privy-authorization-signature"] = authorizationSignature(method, url, body);

  const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Privy ${method} ${path} failed (${res.status}): ${text}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

export interface KeyQuorum {
  id: string;
  display_name: string | null;
  authorization_threshold: number;
}

export interface ServerWallet {
  id: string;
  address: string;
  chain_type: string;
  owner_id: string | null;
  policy_ids: string[];
}

export interface Policy {
  id: string;
  name: string;
}

/** Registers our public key as a quorum. The private half never leaves here. */
export function registerQuorum(displayName: string): Promise<KeyQuorum> {
  return call<KeyQuorum>("POST", "/v1/key_quorums", {
    display_name: displayName,
    public_keys: [authorizationPublicKey()],
    authorization_threshold: 1,
  });
}

export function getQuorum(id: string): Promise<KeyQuorum> {
  return call<KeyQuorum>("GET", `/v1/key_quorums/${id}`);
}

export function createWallet(ownerId: string, policyIds: string[] = []): Promise<ServerWallet> {
  return call<ServerWallet>(
    "POST",
    "/v1/wallets",
    { chain_type: "ethereum", owner_id: ownerId, ...(policyIds.length ? { policy_ids: policyIds } : {}) },
    true,
  );
}

export function getWallet(id: string): Promise<ServerWallet> {
  return call<ServerWallet>("GET", `/v1/wallets/${id}`);
}

export function setWalletPolicies(id: string, policyIds: string[]): Promise<ServerWallet> {
  return call<ServerWallet>("PATCH", `/v1/wallets/${id}`, { policy_ids: policyIds }, true);
}

export function createPolicy(policy: Record<string, unknown>): Promise<Policy> {
  return call<Policy>("POST", "/v1/policies", policy, true);
}

export function getPolicy(id: string): Promise<Policy> {
  return call<Policy>("GET", `/v1/policies/${id}`);
}

/** A signing request against a wallet the quorum owns. */
export function walletRpc<T>(walletId: string, method: string, params: unknown): Promise<T> {
  return call<T>("POST", `/v1/wallets/${walletId}/rpc`, { method, params }, true);
}
