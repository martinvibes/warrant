/**
 * Repointing the on-chain listings at wherever this service now answers.
 *
 *   npm run endpoints            # show what the chain currently advertises
 *   npm run endpoints -- --set   # move them all to PUBLIC_URL
 *
 * A listing carries the URL a buyer should pay at, and the chain has no idea
 * when that URL changes. After a deploy the addresses, prices and history are
 * all still right and only the host is wrong, so the fix is eight calls to
 * setEndpoint rather than a redeploy that would throw away the ledger.
 *
 * Only the seller can move its own listing, which is the whole reason this is
 * safe to leave in the repo.
 */
import "dotenv/config";
import { createPublicClient, createWalletClient, defineChain, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config, CATALOGUE } from "../src/config.js";

const MARKET_ABI = [
  { type: "function", name: "total", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function",
    name: "get",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "seller", type: "address" },
          { name: "kind", type: "bytes32" },
          { name: "kindName", type: "string" },
          { name: "endpoint", type: "string" },
          { name: "asset", type: "address" },
          { name: "price", type: "uint256" },
          { name: "active", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "setEndpoint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "endpoint", type: "string" },
    ],
    outputs: [],
  },
] as const;

const hedera = defineChain({
  id: config.chainId,
  name: config.hederaNetwork === "mainnet" ? "Hedera" : "Hedera Testnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: { default: { http: [config.jsonRpcUrl] } },
});

/** The URL a buyer should pay at for one kind. */
function endpointFor(kindName: string): string | undefined {
  const offer = CATALOGUE.find((o) => o.kind === kindName);
  return offer ? `${config.publicUrl.replace(/\/$/, "")}${offer.path}` : undefined;
}

async function main(): Promise<void> {
  if (!config.marketContract) throw new Error("MARKET_CONTRACT is not set.");
  const write = process.argv.includes("--set");

  const pub = createPublicClient({ chain: hedera, transport: http(config.jsonRpcUrl) });
  const market = config.marketContract as Address;
  const total = await pub.readContract({ address: market, abi: MARKET_ABI, functionName: "total" });

  const key = (process.env.SERVICE_PRIVATE_KEY ?? process.env.OWNER_PRIVATE_KEY) as Hex | undefined;
  if (write && !key) throw new Error("SERVICE_PRIVATE_KEY is not set, so no listing can be moved.");
  const account = key ? privateKeyToAccount(key) : undefined;
  const wallet = account
    ? createWalletClient({ account, chain: hedera, transport: http(config.jsonRpcUrl) })
    : undefined;

  console.log(`\n  market    ${market}`);
  console.log(`  listings  ${total}`);
  console.log(`  target    ${config.publicUrl}\n`);

  let moved = 0;
  for (let id = 1n; id <= total; id++) {
    const listing = await pub.readContract({ address: market, abi: MARKET_ABI, functionName: "get", args: [id] });
    const wanted = endpointFor(listing.kindName);

    if (!wanted) {
      console.log(`  ${String(id).padStart(2)}  ${listing.kindName.padEnd(16)} not in the catalogue, left alone`);
      continue;
    }
    if (listing.endpoint === wanted) {
      console.log(`  ${String(id).padStart(2)}  ${listing.kindName.padEnd(16)} already correct`);
      continue;
    }
    if (!write) {
      console.log(`  ${String(id).padStart(2)}  ${listing.kindName.padEnd(16)} ${listing.endpoint}`);
      console.log(`      ${" ".repeat(16)} → ${wanted}`);
      continue;
    }
    if (account && listing.seller.toLowerCase() !== account.address.toLowerCase()) {
      console.log(`  ${String(id).padStart(2)}  ${listing.kindName.padEnd(16)} sold by ${listing.seller}, not ours`);
      continue;
    }

    const hash = await wallet!.writeContract({
      address: market,
      abi: MARKET_ABI,
      functionName: "setEndpoint",
      args: [id, wanted],
      chain: hedera,
      account: account!,
    });
    await pub.waitForTransactionReceipt({ hash });
    moved++;
    console.log(`  ${String(id).padStart(2)}  ${listing.kindName.padEnd(16)} moved  ${hash}`);
  }

  console.log(write ? `\n  ${moved} listing(s) moved.\n` : `\n  Nothing written. Re-run with --set to move them.\n`);
}

main().catch((err) => {
  console.error(`\n  ${err instanceof Error ? err.message : err}\n`);
  process.exit(1);
});
