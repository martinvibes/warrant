/**
 * Minting an agent's identity on Hedera's EVM.
 *
 * The buyer has already paid for this in USDC over x402, so the service pays
 * the gas and submits the transaction on their behalf. That is the difference
 * between an agent being able to buy an identity and an agent needing to
 * already hold the network's own token before it can buy anything at all.
 *
 * The service submits but does not own the result: the token is minted to the
 * agent's address, and the operator recorded on chain is the agent's own
 * address rather than ours, so nothing here can later be taken back.
 */
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

export const AGENT_IDENTITY_ABI = [
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agent", type: "address" },
      { name: "metadataURI", type: "string" },
      { name: "encryptionKey", type: "bytes" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "tokenIdOf",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "encryptionKeyFor",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ type: "bytes" }],
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "string" }],
  },
] as const;

const hedera = defineChain({
  id: config.chainId,
  name: config.hederaNetwork === "mainnet" ? "Hedera" : "Hedera Testnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: { default: { http: [config.jsonRpcUrl] } },
});

function publicClient() {
  return createPublicClient({ chain: hedera, transport: http(config.jsonRpcUrl) });
}

function walletClient() {
  if (!config.servicePrivateKey) {
    throw new Error("Minting needs SERVICE_PRIVATE_KEY so the service can pay gas for the buyer.");
  }
  return createWalletClient({
    account: privateKeyToAccount(config.servicePrivateKey as Hex),
    chain: hedera,
    transport: http(config.jsonRpcUrl),
  });
}

function contract(): Address {
  if (!config.identityContract) {
    throw new Error("IDENTITY_CONTRACT is not set. Deploy the contracts first, then restart.");
  }
  return config.identityContract as Address;
}

export interface MintRequest {
  /** EVM address the token is minted to. */
  agent: Address;
  /** Anything the agent wants its token to point at. */
  metadataURI: string;
  /** 64-byte secp256k1 public key others seal mail to, or empty for none. */
  encryptionKey?: Hex | "";
}

export interface MintResult {
  tokenId: string;
  agent: Address;
  transactionHash: Hex;
  contract: Address;
  acceptsSealedMail: boolean;
  explorer: string;
}

export async function mintIdentity(req: MintRequest): Promise<MintResult> {
  const address = contract();
  const pub = publicClient();

  const existing = await pub.readContract({
    address,
    abi: AGENT_IDENTITY_ABI,
    functionName: "tokenIdOf",
    args: [req.agent],
  });
  if (existing !== 0n) {
    throw new Error(`${req.agent} already holds identity #${existing}. An agent gets one, permanently.`);
  }

  const key = (req.encryptionKey ?? "0x") as Hex;
  const wallet = walletClient();
  const hash = await wallet.writeContract({
    address,
    abi: AGENT_IDENTITY_ABI,
    functionName: "register",
    args: [req.agent, req.metadataURI, key],
  });

  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`The mint transaction reverted. See ${explorerTx(hash)}.`);
  }

  const tokenId = await pub.readContract({
    address,
    abi: AGENT_IDENTITY_ABI,
    functionName: "tokenIdOf",
    args: [req.agent],
  });

  return {
    tokenId: tokenId.toString(),
    agent: req.agent,
    transactionHash: hash,
    contract: address,
    acceptsSealedMail: key !== "0x" && key.length > 2,
    explorer: explorerTx(hash),
  };
}

/** The key to seal mail to an agent, read straight from the chain. */
/** The token an address already holds, or zero. Read before money moves. */
export async function identityOf(agent: Address): Promise<bigint> {
  return publicClient().readContract({
    address: contract(),
    abi: AGENT_IDENTITY_ABI,
    functionName: "tokenIdOf",
    args: [agent],
  });
}

export async function encryptionKeyFor(agent: Address): Promise<Hex> {
  return publicClient().readContract({
    address: contract(),
    abi: AGENT_IDENTITY_ABI,
    functionName: "encryptionKeyFor",
    args: [agent],
  });
}

export function explorerTx(hash: string): string {
  return `https://hashscan.io/${config.hederaNetwork}/transaction/${hash}`;
}
