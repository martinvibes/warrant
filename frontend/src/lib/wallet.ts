/**
 * Browser-native wallet utility. Mirrors the SDK's `ZeroGent.createWallet` /
 * `balanceOf` shape but uses ethers + Web Crypto directly so we don't have
 * to bundle the full CLI/SDK (which depends on node:fs / node:crypto).
 *
 * Keys are generated and encrypted entirely in the browser. Server never
 * sees mnemonics or private keys.
 */
import { JsonRpcProvider, Wallet, formatEther, isAddress } from 'ethers';

const STORAGE_KEY = '0gent.wallet.v1';
const RPC_URL = 'https://evmrpc.0g.ai';
const CHAIN_ID = 16661;

export interface GeneratedWallet {
  name: string;
  address: string;
  mnemonic: string;
  privateKey: string;
  createdAt: string;
}

export interface StoredWallet {
  name: string;
  address: string;
  createdAt: string;
  ciphertext: string; // base64 of encrypted JSON {mnemonic, privateKey}
  iv: string; // base64
  salt: string; // base64
}

let _provider: JsonRpcProvider | null = null;
function provider(): JsonRpcProvider {
  if (!_provider) _provider = new JsonRpcProvider(RPC_URL, { chainId: CHAIN_ID, name: '0g-chain' });
  return _provider;
}

// ── core wallet generation ──────────────────────────────────────────────

export function createWallet(name?: string): GeneratedWallet {
  const w = Wallet.createRandom();
  return {
    name: (name?.trim() || `agent-${Math.random().toString(36).slice(2, 8)}`).slice(0, 64),
    address: w.address,
    mnemonic: w.mnemonic?.phrase ?? '',
    privateKey: w.privateKey,
    createdAt: new Date().toISOString(),
  };
}

// ── chain reads ─────────────────────────────────────────────────────────

export async function getBalance(address: string): Promise<{ wei: string; zg: string }> {
  if (!isAddress(address)) throw new Error('Invalid address');
  const bal = await provider().getBalance(address);
  return { wei: bal.toString(), zg: formatEther(bal) };
}

// ── encryption: AES-256-GCM with PBKDF2-derived key ────────────────────

const enc = new TextEncoder();
const dec = new TextDecoder();

function bufToB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  bytes.forEach(b => (s += String.fromCharCode(b)));
  return btoa(s);
}

function b64ToBuf(b64: string): Uint8Array {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200_000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptWallet(
  w: GeneratedWallet,
  passphrase: string
): Promise<StoredWallet> {
  if (!passphrase) throw new Error('Passphrase required');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const plaintext = enc.encode(JSON.stringify({ mnemonic: w.mnemonic, privateKey: w.privateKey }));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return {
    name: w.name,
    address: w.address,
    createdAt: w.createdAt,
    ciphertext: bufToB64(ct),
    iv: bufToB64(iv),
    salt: bufToB64(salt),
  };
}

export async function decryptWallet(
  stored: StoredWallet,
  passphrase: string
): Promise<GeneratedWallet> {
  const salt = b64ToBuf(stored.salt);
  const iv = b64ToBuf(stored.iv);
  const ct = b64ToBuf(stored.ciphertext);
  const key = await deriveKey(passphrase, salt);
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  } catch {
    throw new Error('Wrong passphrase');
  }
  const { mnemonic, privateKey } = JSON.parse(dec.decode(plain));
  return { name: stored.name, address: stored.address, createdAt: stored.createdAt, mnemonic, privateKey };
}

// ── localStorage persistence ───────────────────────────────────────────

export function loadStoredWallet(): StoredWallet | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredWallet) : null;
  } catch {
    return null;
  }
}

export function saveStoredWallet(stored: StoredWallet): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

export function clearStoredWallet(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ── helpers ────────────────────────────────────────────────────────────

export function shortAddress(a: string): string {
  return a.slice(0, 6) + '…' + a.slice(-4);
}

export const FAUCET_URL = 'https://faucet.0g.ai';
export const EXPLORER_BASE = 'https://chainscan.0g.ai/address/';
