/**
 * Funding an agent and setting its limit, in one command.
 *
 *   npm run fund -- --agent 0x9aE1… --amount 5 --cap 5 --per day \
 *                   --kinds inference,email.send
 *
 * This is the only moment a human is involved. After it runs the agent buys
 * what it likes until a ceiling stops it, and nobody approves anything in
 * between. Keeping setup to one command is the point: a limit that takes a
 * dashboard to set is a limit people will skip.
 */
import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  erc20Abi,
  http,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "../src/config.js";

const TREASURY_ABI = [
  {
    type: "function",
    name: "fund",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "setPolicy",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agent", type: "address" },
      { name: "totalCap", type: "uint128" },
      { name: "windowCap", type: "uint128" },
      { name: "windowSeconds", type: "uint64" },
      { name: "expiry", type: "uint64" },
      { name: "kindNames", type: "string[]" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "balance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "asset",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const;

const WINDOWS: Record<string, number> = {
  hour: 3600,
  day: 86400,
  week: 604800,
};

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

function usage(message: string): never {
  console.error(`\n  ${message}\n`);
  console.error("  npm run fund -- --agent 0xAGENT --amount 5 --cap 5 --per day \\");
  console.error("                  --kinds inference,email.send\n");
  console.error("  --agent    the agent's EVM address, which is what draws");
  console.error("  --amount   USDC to move into the treasury now");
  console.error("  --cap      lifetime ceiling in USDC");
  console.error("  --per      window for the rolling ceiling: hour, day or week");
  console.error("  --window   ceiling inside that window, in USDC (defaults to --cap)");
  console.error("  --kinds    comma-separated kinds the agent may buy");
  console.error("  --expires  hours until the policy dies, 0 for never (default 0)\n");
  process.exit(1);
}

async function main(): Promise<void> {
  const ownerKey = process.env.OWNER_PRIVATE_KEY as Hex | undefined;
  if (!ownerKey) usage("OWNER_PRIVATE_KEY is not set, so there is nobody to fund from.");
  if (!config.treasuryContract) usage("TREASURY_CONTRACT is not set. Deploy the contracts first.");

  const agent = flag("agent") as Address | undefined;
  if (!agent || !/^0x[0-9a-fA-F]{40}$/.test(agent)) usage("Give the agent's EVM address with --agent.");

  const capUsdc = flag("cap") ?? flag("amount");
  if (!capUsdc) usage("Give a lifetime ceiling with --cap.");

  const per = flag("per");
  if (per && !WINDOWS[per]) usage(`--per takes ${Object.keys(WINDOWS).join(", ")}, not "${per}".`);

  const kinds = (flag("kinds") ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  if (kinds.length === 0) usage("Name at least one kind with --kinds. An agent allowed nothing can buy nothing.");

  const decimals = config.assetDecimals;
  const totalCap = parseUnits(capUsdc, decimals);
  const windowCap = per ? parseUnits(flag("window") ?? capUsdc, decimals) : 0n;
  const windowSeconds = per ? BigInt(WINDOWS[per]) : 0n;
  const expiryHours = Number(flag("expires") ?? 0);
  const expiry = expiryHours > 0 ? BigInt(Math.floor(Date.now() / 1000) + expiryHours * 3600) : 0n;
  const amount = flag("amount") ? parseUnits(flag("amount")!, decimals) : 0n;

  const chain = defineChain({
    id: config.chainId,
    name: config.hederaNetwork === "mainnet" ? "Hedera" : "Hedera Testnet",
    nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
    rpcUrls: { default: { http: [config.jsonRpcUrl] } },
  });

  const account = privateKeyToAccount(ownerKey);
  const pub = createPublicClient({ chain, transport: http(config.jsonRpcUrl) });
  const wallet = createWalletClient({ account, chain, transport: http(config.jsonRpcUrl) });
  const treasury = config.treasuryContract as Address;

  console.log(`\n  owner     ${account.address}`);
  console.log(`  treasury  ${treasury}`);
  console.log(`  agent     ${agent}`);

  if (amount > 0n) {
    const asset = await pub.readContract({ address: treasury, abi: TREASURY_ABI, functionName: "asset" });

    // Approve exactly what is about to move. An unlimited approval would let
    // the treasury pull the owner's whole balance later, which is a strange
    // thing to hand a contract whose job is to limit spending.
    const approve = await wallet.writeContract({
      address: asset,
      abi: erc20Abi,
      functionName: "approve",
      args: [treasury, amount],
    });
    await pub.waitForTransactionReceipt({ hash: approve });

    const funded = await wallet.writeContract({
      address: treasury,
      abi: TREASURY_ABI,
      functionName: "fund",
      args: [amount],
    });
    await pub.waitForTransactionReceipt({ hash: funded });
    console.log(`  funded    ${flag("amount")} USDC  ${funded}`);
  }

  const policy = await wallet.writeContract({
    address: treasury,
    abi: TREASURY_ABI,
    functionName: "setPolicy",
    args: [agent, totalCap, windowCap, windowSeconds, expiry, kinds],
  });
  await pub.waitForTransactionReceipt({ hash: policy });

  console.log(`  cap       ${capUsdc} USDC lifetime`);
  console.log(per ? `  window    ${flag("window") ?? capUsdc} USDC per ${per}` : "  window    none");
  console.log(`  kinds     ${kinds.join(", ")}`);
  console.log(expiry > 0n ? `  expires   in ${expiryHours}h` : "  expires   never");
  console.log(`  policy    ${policy}`);
  console.log(`\n  https://hashscan.io/${config.hederaNetwork}/transaction/${policy}\n`);
}

main().catch((err) => {
  console.error(`\n  ${(err as Error).message}\n`);
  process.exit(1);
});
