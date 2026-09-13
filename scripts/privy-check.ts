/**
 * Asking the key to do things it should refuse.
 *
 *   npm run privy:check
 *
 * A policy nobody has tested is a claim, not a control. This asks the wallet
 * for four signatures — two it should give and two it should withhold — and
 * prints what actually came back. Nothing here touches the chain: a signature
 * is produced and thrown away, so the check is free and can be run against a
 * live agent without spending anything or moving anything.
 */
import "dotenv/config";
import { config } from "../src/config.js";
import { privyConfigured, walletRpc } from "../src/privy/client.js";

interface Case {
  label: string;
  expected: "allowed" | "denied";
  run: () => Promise<unknown>;
}

const c = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

function tokenEvmAddress(tokenId: string): string {
  return `0x${BigInt(tokenId.split(".").pop() ?? "0").toString(16).padStart(40, "0")}`;
}

async function main(): Promise<void> {
  if (!privyConfigured() || !config.privyWalletId) {
    throw new Error("Privy is not configured. Run npm run privy:setup and npm run privy:policy first.");
  }

  const wallet = config.privyWalletId;
  const base = {
    value: 0,
    nonce: 0,
    chain_id: config.chainId,
    gas_limit: 300_000,
    max_fee_per_gas: 400_000_000_000,
    max_priority_fee_per_gas: 400_000_000_000,
    type: 2,
    data: "0x",
  };
  const sign = (overrides: Record<string, unknown>) =>
    walletRpc(wallet, "eth_signTransaction", { transaction: { ...base, ...overrides } });

  const cases: Case[] = [
    {
      label: "draw from the treasury",
      expected: "allowed",
      run: () => sign({ to: config.treasuryContract }),
    },
    {
      label: "pay on Hedera over x402",
      expected: "allowed",
      run: () => walletRpc(wallet, "secp256k1_sign", { hash: `0x${"11".repeat(32)}` }),
    },
    {
      label: "move HBAR out of the account",
      expected: "denied",
      run: () => sign({ to: "0x000000000000000000000000000000000000dEaD", value: 1_000_000 }),
    },
    {
      label: "call the stablecoin contract directly",
      expected: "denied",
      run: () => sign({ to: tokenEvmAddress(config.asset) }),
    },
  ];

  console.log(`\n  wallet  ${wallet}`);
  console.log(`  policy  ${config.privyPolicyId || "(none attached)"}\n`);

  let wrong = 0;
  for (const test of cases) {
    let actual: "allowed" | "denied" = "allowed";
    let detail = "";
    try {
      await test.run();
    } catch (err) {
      const message = (err as Error).message;
      if (!message.includes("policy_violation")) {
        // A network failure is not a refusal, and reporting it as one would
        // turn an outage into a false clean bill of health.
        throw err;
      }
      actual = "denied";
      detail = "refused by policy";
    }

    const ok = actual === test.expected;
    if (!ok) wrong++;
    const mark = ok ? c.green("✓") : c.red("✗");
    const verdict = actual === "denied" ? c.red("DENIED ") : c.green("ALLOWED");
    console.log(`  ${mark} ${verdict}  ${test.label.padEnd(38)} ${c.dim(detail)}`);
  }

  if (wrong) {
    console.log(`\n  ${c.red(`${wrong} of ${cases.length} did not match the policy this repo describes.`)}\n`);
    process.exit(1);
  }
  console.log(`\n  ${c.green("The key allows what the agent needs and refuses the rest.")}\n`);
}

main().catch((err) => {
  console.error(`\n  ${err instanceof Error ? err.message : err}\n`);
  process.exit(1);
});
