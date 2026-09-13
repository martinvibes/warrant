/**
 * The agent's key, made locally and kept locally.
 *
 * `warrant create` generates a secp256k1 keypair and writes it to
 * ~/.warrant/agent.json with owner-only permissions. Nothing is sent anywhere:
 * on Hedera an account comes into existence when someone transfers to its EVM
 * address, so the key is the account before the account exists, and funding it
 * is what brings it into being.
 */
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3";

export const MIRROR = "https://testnet.mirrornode.hedera.com";
export const USDC = "0.0.429274";
export const HBAR_FAUCET = "https://portal.hedera.com/faucet";
export const USDC_FAUCET = "https://faucet.circle.com";

export interface Agent {
  privateKey: string;
  publicKey: string;
  address: string;
  accountId?: string;
  createdAt: string;
}

export function walletPath(): string {
  return process.env.WARRANT_WALLET ?? join(homedir(), ".warrant", "agent.json");
}

export function load(): Agent | undefined {
  const path = walletPath();
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8")) as Agent;
}

export function save(agent: Agent): string {
  const path = walletPath();
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, `${JSON.stringify(agent, null, 2)}\n`, { mode: 0o600 });
  return path;
}

const hex = (b: Uint8Array): string => Buffer.from(b).toString("hex");

/** A fresh key. The EVM address is keccak256 of the uncompressed public key. */
export function create(): Agent {
  let priv: Uint8Array;
  do {
    priv = new Uint8Array(randomBytes(32));
  } while (!secp256k1.utils.isValidPrivateKey(priv));

  const uncompressed = secp256k1.getPublicKey(priv, false);
  const address = `0x${hex(keccak_256(uncompressed.slice(1))).slice(-40)}`;
  return {
    privateKey: `0x${hex(priv)}`,
    publicKey: `0x${hex(secp256k1.getPublicKey(priv, true))}`,
    address,
    createdAt: new Date().toISOString(),
  };
}

/** The account id Hedera gave this address, once someone has funded it. */
export async function lookup(address: string): Promise<{ accountId?: string; usdc?: string; hbar?: string }> {
  const res = await fetch(`${MIRROR}/api/v1/accounts/${address}`);
  if (!res.ok) return {};
  const body = (await res.json()) as {
    account?: string;
    balance?: { balance?: number; tokens?: { token_id: string; balance: number }[] };
  };
  const token = body.balance?.tokens?.find((t) => t.token_id === USDC);
  return {
    accountId: body.account,
    usdc: token ? (token.balance / 1e6).toFixed(2) : "0.00",
    hbar: body.balance?.balance !== undefined ? (body.balance.balance / 1e8).toFixed(2) : undefined,
  };
}
