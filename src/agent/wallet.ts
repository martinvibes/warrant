/**
 * The agent's wallet.
 *
 * Two halves that work at different speeds, which is the whole reason the
 * design is shaped this way. Paying is HTTP and happens in under a second.
 * Drawing from the treasury is a transaction and takes several. So the agent
 * keeps a float and touches the chain only when the float runs low, which
 * means the limit is enforced on chain without the chain being in the path of
 * every purchase.
 */
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { ExactHederaScheme } from "@x402/hedera/exact/client";
// PrivateKey comes from @x402/hedera rather than a direct SDK import: two
// copies of that SDK produce two incompatible PrivateKey types, and the signer
// accepts only its own.
import { createClientHederaSigner, PrivateKey } from "@x402/hedera";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "../config.js";

export const TREASURY_ABI = [
  // The custom errors matter as much as the functions here. Without them viem
  // reports a bare four-byte selector, and the agent is told "something
  // reverted" when the chain took the trouble to say which ceiling it hit and
  // when that ceiling reopens.
  {
    type: "error",
    name: "WindowCapExceeded",
    inputs: [
      { name: "wanted", type: "uint256" },
      { name: "remaining", type: "uint256" },
      { name: "resetsAt", type: "uint64" },
    ],
  },
  {
    type: "error",
    name: "TotalCapExceeded",
    inputs: [
      { name: "wanted", type: "uint256" },
      { name: "remaining", type: "uint256" },
    ],
  },
  { type: "error", name: "KindNotAllowed", inputs: [{ name: "kind", type: "bytes32" }] },
  { type: "error", name: "PolicyExpired", inputs: [{ name: "expiry", type: "uint64" }] },
  { type: "error", name: "NoPolicy", inputs: [{ name: "agent", type: "address" }] },
  { type: "error", name: "ListingInactive", inputs: [{ name: "listingId", type: "uint256" }] },
  {
    type: "error",
    name: "InsufficientBalance",
    inputs: [
      { name: "wanted", type: "uint256" },
      { name: "held", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "draw",
    stateMutability: "nonpayable",
    inputs: [
      { name: "listingId", type: "uint256" },
      { name: "calls", type: "uint32" },
    ],
    outputs: [
      { name: "drawId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "remaining",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [
      { name: "total_", type: "uint256" },
      { name: "window_", type: "uint256" },
      { name: "windowResetsAt", type: "uint64" },
    ],
  },
  {
    type: "function",
    name: "recordSettlement",
    stateMutability: "nonpayable",
    inputs: [
      { name: "drawId", type: "uint256" },
      { name: "settlementRef", type: "string" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export const MARKET_ABI = [
  {
    type: "function",
    name: "cheapest",
    stateMutability: "view",
    inputs: [{ name: "kind", type: "bytes32" }],
    outputs: [
      { name: "id", type: "uint256" },
      { name: "price", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "kindId",
    stateMutability: "pure",
    inputs: [{ name: "kindName", type: "string" }],
    outputs: [{ type: "bytes32" }],
  },
] as const;

/** Hedera keys arrive in several encodings; accept whichever the portal gave. */
export function parseKey(raw: string): PrivateKey {
  for (const attempt of [
    () => PrivateKey.fromStringECDSA(raw),
    () => PrivateKey.fromStringED25519(raw),
    () => PrivateKey.fromStringDer(raw),
  ]) {
    try {
      return attempt();
    } catch {
      /* try the next encoding */
    }
  }
  throw new Error("AGENT_HEDERA_PRIVATE_KEY is not a Hedera private key in any encoding I recognise.");
}

export interface AgentKeys {
  /** Hedera account the agent pays from, e.g. "0.0.12345". */
  accountId: string;
  hederaKey: string;
  /** EVM key, for the treasury and for resources that write to a contract. */
  evmKey?: Hex;
}

export function keysFromEnv(): AgentKeys {
  const accountId = process.env.AGENT_HEDERA_ACCOUNT_ID;
  const hederaKey = process.env.AGENT_HEDERA_PRIVATE_KEY;
  if (!accountId || !hederaKey) {
    throw new Error(
      "Set AGENT_HEDERA_ACCOUNT_ID and AGENT_HEDERA_PRIVATE_KEY so the agent has a wallet to pay from.",
    );
  }
  return {
    accountId,
    hederaKey,
    evmKey: (process.env.AGENT_EVM_PRIVATE_KEY as Hex | undefined) ?? undefined,
  };
}

/** A fetch that answers a 402 by paying and retrying, transparently. */
export function payingFetch(keys: AgentKeys): typeof fetch {
  const signer = createClientHederaSigner(keys.accountId, parseKey(keys.hederaKey), {
    network: config.network,
  });
  const client = new x402Client().register(config.network, new ExactHederaScheme(signer));
  return wrapFetchWithPayment(fetch, client);
}

const hedera = defineChain({
  id: config.chainId,
  name: config.hederaNetwork === "mainnet" ? "Hedera" : "Hedera Testnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: { default: { http: [config.jsonRpcUrl] } },
});

export interface Budget {
  /** Atomic units still drawable over the policy's whole life. */
  total: bigint;
  /** Atomic units still drawable in the current window. */
  window: bigint;
  /** Unix seconds at which the window reopens, or 0 when there is no window. */
  resetsAt: number;
}

export class Treasury {
  private readonly account;

  constructor(evmKey: Hex) {
    this.account = privateKeyToAccount(evmKey);
  }

  get address(): Address {
    return this.account.address;
  }

  private get pub() {
    return createPublicClient({ chain: hedera, transport: http(config.jsonRpcUrl) });
  }

  private get wallet() {
    return createWalletClient({ account: this.account, chain: hedera, transport: http(config.jsonRpcUrl) });
  }

  private get contract(): Address {
    if (!config.treasuryContract) {
      throw new Error("TREASURY_CONTRACT is not set, so there is no on-chain limit to draw against.");
    }
    return config.treasuryContract as Address;
  }

  /** What the agent may still spend. The question it asks before planning. */
  async budget(): Promise<Budget> {
    const [total, window, resetsAt] = await this.pub.readContract({
      address: this.contract,
      abi: TREASURY_ABI,
      functionName: "remaining",
      args: [this.address],
    });
    return { total, window, resetsAt: Number(resetsAt) };
  }

  /** The cheapest on-chain listing of a kind, and its published price. */
  async cheapest(kind: string): Promise<{ listingId: bigint; price: bigint }> {
    if (!config.marketContract) throw new Error("MARKET_CONTRACT is not set, so nothing can be priced on chain.");
    const market = config.marketContract as Address;
    const kindId = await this.pub.readContract({
      address: market,
      abi: MARKET_ABI,
      functionName: "kindId",
      args: [kind],
    });
    const [listingId, price] = await this.pub.readContract({
      address: market,
      abi: MARKET_ABI,
      functionName: "cheapest",
      args: [kindId],
    });
    return { listingId, price };
  }

  /**
   * Draws enough for `calls` calls of a listing.
   *
   * The revert reasons the contract raises are the interesting output here, so
   * they are passed through rather than flattened into a generic failure: an
   * agent that knows it hit a daily cap can wait, where one told only that
   * something failed will retry forever.
   */
  async draw(listingId: bigint, calls: number): Promise<{ drawId: bigint; amount: bigint; hash: Hex }> {
    const { request, result } = await this.pub.simulateContract({
      account: this.account,
      address: this.contract,
      abi: TREASURY_ABI,
      functionName: "draw",
      args: [listingId, calls],
    });
    const hash = await this.wallet.writeContract(request);
    await this.pub.waitForTransactionReceipt({ hash });
    const [drawId, amount] = result;
    return { drawId, amount, hash };
  }

  /** Closes the loop: what the drawn money actually bought. */
  async recordSettlement(drawId: bigint, settlementRef: string, amount: bigint): Promise<Hex> {
    const hash = await this.wallet.writeContract({
      address: this.contract,
      abi: TREASURY_ABI,
      functionName: "recordSettlement",
      args: [drawId, settlementRef, amount],
    });
    await this.pub.waitForTransactionReceipt({ hash });
    return hash;
  }
}
