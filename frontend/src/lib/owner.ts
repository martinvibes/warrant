/**
 * Owner-side signing.
 *
 * The human authorises spending by signing an EIP-712 warrant. Nothing here
 * touches a chain: signing costs no gas, needs no funded account, and produces
 * no transaction. That matters for the thing this product claims — if
 * authorising an agent were expensive or slow, nobody would scope it tightly,
 * and revoking it in the moment that matters would be worse still.
 *
 * Two signers are supported. An injected wallet is the real one, because the
 * owner's authority should live in the wallet they already trust. A locally
 * generated key exists so the console is usable on a machine with no wallet
 * installed; it is encrypted at rest with a passphrase and never leaves the
 * browser.
 */
import {
  BrowserProvider,
  Wallet,
  getAddress,
  isAddress,
  type Eip1193Provider,
} from 'ethers';

const STORAGE_KEY = 'warrant.owner.v1';

/** Hedera's EVM chain ids. Used only to bind a signature to one network. */
export const CHAIN_IDS: Record<string, number> = {
  'hedera:mainnet': 295,
  'hedera:testnet': 296,
};

export const WARRANT_TYPES = {
  Warrant: [
    { name: 'owner', type: 'address' },
    { name: 'agent', type: 'string' },
    { name: 'asset', type: 'string' },
    { name: 'cap', type: 'uint256' },
    { name: 'resources', type: 'string[]' },
    { name: 'purpose', type: 'string' },
    { name: 'expiry', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const;

export const REVOCATION_TYPES = {
  Revocation: [
    { name: 'warrantId', type: 'bytes32' },
    { name: 'owner', type: 'address' },
    { name: 'issuedAt', type: 'uint256' },
  ],
} as const;

export function domainFor(network: string) {
  const chainId = CHAIN_IDS[network];
  if (!chainId) throw new Error(`No EVM chain id is known for ${network}.`);
  return { name: 'Warrant', version: '1', chainId };
}

export interface WarrantFields {
  agent: string;
  asset: string;
  /** Atomic units of the settlement asset. */
  cap: string;
  resources: string[];
  purpose: string;
  /** Unix seconds. */
  expiry: number;
}

export interface SignedWarrant {
  warrant: {
    owner: string;
    agent: string;
    asset: string;
    cap: string;
    resources: string[];
    purpose: string;
    expiry: string;
    nonce: string;
  };
  signature: string;
}

/** What the console needs of a signer, whichever kind it is. */
export interface OwnerSigner {
  address: string;
  kind: 'injected' | 'local';
  signWarrant(fields: WarrantFields, network: string): Promise<SignedWarrant>;
  signRevocation(
    warrantId: string,
    network: string
  ): Promise<{
    revocation: { warrantId: string; owner: string; issuedAt: string };
    signature: string;
  }>;
}

// ── typed-data signing, shared by both signer kinds ──────────────────────

type TypedDataSigner = {
  getAddress(): Promise<string>;
  signTypedData(
    domain: Record<string, unknown>,
    types: Record<string, unknown>,
    value: Record<string, unknown>
  ): Promise<string>;
};

function makeSigner(inner: TypedDataSigner, kind: 'injected' | 'local', address: string): OwnerSigner {
  return {
    address,
    kind,

    async signWarrant(fields, network) {
      const owner = getAddress(await inner.getAddress());
      // The nonce is a per-owner replay guard, and because the warrant id is
      // the hash of its contents, it is also what makes two otherwise
      // identical warrants distinct documents.
      const nonce = BigInt(Date.now()).toString();
      const message = {
        owner,
        agent: fields.agent,
        asset: fields.asset,
        cap: fields.cap,
        resources: fields.resources,
        purpose: fields.purpose,
        expiry: String(fields.expiry),
        nonce,
      };
      const signature = await inner.signTypedData(
        domainFor(network),
        WARRANT_TYPES as unknown as Record<string, unknown>,
        message
      );
      return { warrant: message, signature };
    },

    async signRevocation(warrantId, network) {
      const owner = getAddress(await inner.getAddress());
      const issuedAt = String(Math.floor(Date.now() / 1000));
      const revocation = { warrantId, owner, issuedAt };
      const signature = await inner.signTypedData(
        domainFor(network),
        REVOCATION_TYPES as unknown as Record<string, unknown>,
        revocation
      );
      return { revocation, signature };
    },
  };
}

// ── injected wallet ─────────────────────────────────────────────────────

export function hasInjectedWallet(): boolean {
  return typeof window !== 'undefined' && !!(window as any).ethereum;
}

export async function connectInjected(): Promise<OwnerSigner> {
  const injected = (window as any).ethereum as Eip1193Provider | undefined;
  if (!injected) {
    throw new Error('No browser wallet found. Install one, or create a local signing key instead.');
  }
  const provider = new BrowserProvider(injected);
  let signer;
  try {
    signer = await provider.getSigner();
  } catch (err) {
    throw new Error(humanizeSignerError(err));
  }
  const address = getAddress(await signer.getAddress());
  return makeSigner(signer as unknown as TypedDataSigner, 'injected', address);
}

// ── local key ───────────────────────────────────────────────────────────

export interface StoredKey {
  address: string;
  createdAt: string;
  /** base64 AES-GCM ciphertext of the private key. */
  ciphertext: string;
  iv: string;
  salt: string;
}

export function localSigner(privateKey: string): OwnerSigner {
  const wallet = new Wallet(privateKey);
  return makeSigner(wallet as unknown as TypedDataSigner, 'local', getAddress(wallet.address));
}

export function createLocalKey(): { address: string; privateKey: string } {
  const w = Wallet.createRandom();
  return { address: w.address, privateKey: w.privateKey };
}

// ── encryption at rest: AES-256-GCM with a PBKDF2-derived key ───────────

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  bytes.forEach(b => (s += String.fromCharCode(b)));
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 200_000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptKey(
  address: string,
  privateKey: string,
  passphrase: string
): Promise<StoredKey> {
  if (passphrase.length < 8) throw new Error('Use a passphrase of at least 8 characters.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    enc.encode(privateKey)
  );
  return {
    address: getAddress(address),
    createdAt: new Date().toISOString(),
    ciphertext: toB64(ct),
    iv: toB64(iv),
    salt: toB64(salt),
  };
}

export async function decryptKey(stored: StoredKey, passphrase: string): Promise<string> {
  const key = await deriveKey(passphrase, fromB64(stored.salt));
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromB64(stored.iv) as BufferSource },
      key,
      fromB64(stored.ciphertext) as BufferSource
    );
  } catch {
    throw new Error('That passphrase does not unlock this key.');
  }
  return dec.decode(plain);
}

export function loadStoredKey(): StoredKey | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredKey) : null;
  } catch {
    return null;
  }
}

export function saveStoredKey(stored: StoredKey): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    /* a private window with storage blocked still gets a working session key */
  }
}

export function clearStoredKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
}

// ── helpers ─────────────────────────────────────────────────────────────

export function shortAddress(a: string): string {
  return isAddress(a) ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

/**
 * Parses a human amount into atomic units without going through a float, so a
 * cap never drifts by a rounding step on its way to being signed.
 */
export function toAtomic(human: string, decimals: number): string {
  const trimmed = human.trim();
  const [whole, frac = ''] = trimmed.split('.');
  if (!/^\d+$/.test(whole || '') || (frac && !/^\d+$/.test(frac))) {
    throw new Error(`"${human}" is not an amount. Try 1.50`);
  }
  if (frac.length > decimals) {
    throw new Error(`This asset has ${decimals} decimal places, so ${human} cannot be represented exactly.`);
  }
  return String(BigInt((whole || '0') + frac.padEnd(decimals, '0')));
}

export function humanizeSignerError(e: unknown): string {
  const raw = String((e as any)?.shortMessage || (e as any)?.message || e);
  if (/user rejected|denied|4001/i.test(raw)) return 'You declined the signature, so nothing was authorised.';
  if (/unsupported|chain/i.test(raw) && /switch/i.test(raw))
    return 'Your wallet could not sign for this network.';
  if (/eth_signTypedData/i.test(raw)) return 'This wallet cannot sign typed data, which a warrant requires.';
  return raw.replace(/\(.*?version=.*?\)/g, '').trim().slice(0, 240);
}
