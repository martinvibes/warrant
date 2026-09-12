/**
 * The warrant: an EIP-712 typed message in which a human grants one agent a
 * bounded, purpose-scoped licence to spend.
 *
 * Everything the gate needs to make a decision lives in the signed payload, so
 * a warrant can be handed to the agent, cached, and presented on each request
 * without the service holding any prior state about it. The only server-side
 * state is spend-to-date and revocation.
 */
import {
  hashTypedData,
  recoverTypedDataAddress,
  type Address,
  type Hex,
  type TypedDataDomain,
} from "viem";

/** Hedera's EVM chain ids, used only to bind a signature to a network. */
export const HEDERA_EVM_CHAIN_IDS: Record<string, number> = {
  "hedera:mainnet": 295,
  "hedera:testnet": 296,
};

export const WARRANT_TYPES = {
  Warrant: [
    { name: "owner", type: "address" },
    { name: "agent", type: "string" },
    { name: "asset", type: "string" },
    { name: "cap", type: "uint256" },
    { name: "resources", type: "string[]" },
    { name: "purpose", type: "string" },
    { name: "expiry", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

export interface Warrant {
  /** EVM address of the human who signed. Spending authority derives from here. */
  owner: Address;
  /** Hedera account id of the single agent this warrant authorises, e.g. "0.0.12345". */
  agent: string;
  /** HTS token id of the settlement asset, e.g. "0.0.429274" for testnet USDC. */
  asset: string;
  /** Total ceiling across the warrant's life, in the asset's smallest unit. */
  cap: bigint;
  /** Resource types the agent may buy. An empty list authorises nothing. */
  resources: string[];
  /** Human-readable scope. Recorded on every receipt so spend is explicable later. */
  purpose: string;
  /** Unix seconds. A warrant is dead at and after this instant. */
  expiry: bigint;
  /** Per-owner replay guard. Reusing a nonce produces the same warrant id. */
  nonce: bigint;
}

/** A warrant as it travels over the wire, with bigints as decimal strings. */
export interface WarrantWire {
  owner: Address;
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
  signature: Hex;
}

export function domainFor(network: string): TypedDataDomain {
  const chainId = HEDERA_EVM_CHAIN_IDS[network];
  if (!chainId) throw new Error(`no EVM chain id known for network ${network}`);
  return { name: "Warrant", version: "1", chainId };
}

export function toWire(w: Warrant): WarrantWire {
  return {
    owner: w.owner,
    agent: w.agent,
    asset: w.asset,
    cap: w.cap.toString(),
    resources: w.resources,
    purpose: w.purpose,
    expiry: w.expiry.toString(),
    nonce: w.nonce.toString(),
  };
}

export function fromWire(w: WarrantWire): Warrant {
  return {
    owner: w.owner,
    agent: w.agent,
    asset: w.asset,
    cap: BigInt(w.cap),
    resources: w.resources,
    purpose: w.purpose,
    expiry: BigInt(w.expiry),
    nonce: BigInt(w.nonce),
  };
}

/**
 * Canonical identifier for a warrant: the EIP-712 hash of its contents.
 *
 * Deriving the id from the signed payload rather than assigning one means two
 * parties can name the same warrant without coordinating, and an altered
 * warrant is a different warrant rather than a tampered one.
 */
export function warrantId(w: Warrant, network: string): Hex {
  return hashTypedData({
    domain: domainFor(network),
    types: WARRANT_TYPES,
    primaryType: "Warrant",
    message: warrantMessage(w),
  });
}

/** viem wants the message with bigints intact and arrays as arrays. */
export function warrantMessage(w: Warrant) {
  return {
    owner: w.owner,
    agent: w.agent,
    asset: w.asset,
    cap: w.cap,
    resources: w.resources,
    purpose: w.purpose,
    expiry: w.expiry,
    nonce: w.nonce,
  };
}

/**
 * Recovers the signer and checks it against the warrant's stated owner.
 *
 * A warrant that names one owner but was signed by another is not merely
 * invalid, it is an attempt, so the caller is told which address actually
 * signed rather than just being told no.
 */
export async function verifyWarrantSignature(
  signed: SignedWarrant,
  network: string,
): Promise<{ ok: true } | { ok: false; recovered: Address }> {
  const w = fromWire(signed.warrant);
  const recovered = await recoverTypedDataAddress({
    domain: domainFor(network),
    types: WARRANT_TYPES,
    primaryType: "Warrant",
    message: warrantMessage(w),
    signature: signed.signature,
  });
  if (recovered.toLowerCase() === w.owner.toLowerCase()) return { ok: true };
  return { ok: false, recovered };
}
