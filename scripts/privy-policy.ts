/**
 * The limit that lives at the key.
 *
 *   npm run privy:policy                 # 90 days of signing authority
 *   npm run privy:policy -- --days 30
 *
 * Warrant already has a ceiling on chain: the treasury contract decides how
 * much the agent may draw and refuses when it has had enough. This is a
 * second, independent refusal, and it answers a different question. The
 * contract caps how much the agent may have; the policy caps what its key will
 * put its name to, and until when. Neither needs a person awake, and either
 * one alone stops the agent.
 *
 * What the policy engine can and cannot express is worth being exact about,
 * because a rule that reads well and enforces nothing is worse than no rule.
 *
 * Privy evaluates a DENY ahead of any ALLOW, and offers no "not equal". So
 * "only ever call the treasury" cannot be written: it would need a deny whose
 * condition is every address except one. What can be written is the complement
 * — specific things this key must never sign — and those are enforced:
 *
 *   no HBAR leaves this wallet          any transaction with a non-zero value
 *                                       is refused, so the account's gas can
 *                                       never be swept out of it.
 *
 *   no direct calls to the USDC token   the agent's stablecoin moves through
 *                                       the treasury and over x402, never by
 *                                       this key calling the token contract on
 *                                       its own account.
 *
 *   nothing at all after the expiry     the one limit that covers every
 *                                       method, including the opaque raw
 *                                       signature the Hedera payment path
 *                                       needs and whose contents no condition
 *                                       can inspect. After that instant the
 *                                       wallet signs nothing, and making that
 *                                       true took no transaction and nobody
 *                                       awake.
 *
 * What remains permitted is an arbitrary zero-value contract call before the
 * expiry. That is bounded from the other side rather than here: the agent can
 * only spend USDC it holds, and it only ever holds what the treasury let it
 * draw.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { config } from "../src/config.js";
import { createPolicy, privyConfigured, setWalletPolicies } from "../src/privy/client.js";

const ENV = path.join(process.cwd(), ".env");

/** The HTS token's EVM address is its account number in long-zero form. */
function tokenEvmAddress(tokenId: string): string {
  const num = BigInt(tokenId.split(".").pop() ?? "0");
  return `0x${num.toString(16).padStart(40, "0")}`;
}

function remember(name: string, value: string): void {
  const line = `${name}=${value}`;
  let text = fs.existsSync(ENV) ? fs.readFileSync(ENV, "utf8") : "";
  const pattern = new RegExp(`^${name}=.*$`, "m");
  text = pattern.test(text) ? text.replace(pattern, line) : `${text.replace(/\n*$/, "\n")}${line}\n`;
  fs.writeFileSync(ENV, text);
}

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main(): Promise<void> {
  if (!privyConfigured()) throw new Error("Privy is not configured. Run npm run privy:setup first.");
  if (!config.privyWalletId) throw new Error("PRIVY_WALLET_ID is not set. Run npm run privy:setup first.");
  if (!config.treasuryContract) throw new Error("TREASURY_CONTRACT is not set, so there is nothing to allow.");

  const days = Number(flag("days") ?? 90);
  const expiry = Math.floor(Date.now() / 1000) + days * 86_400;
  const usdc = tokenEvmAddress(config.asset);

  const policy = await createPolicy({
    version: "1.0",
    name: "warrant-agent",
    chain_type: "ethereum",
    rules: [
      {
        name: "Never moves HBAR",
        method: "eth_signTransaction",
        action: "DENY",
        conditions: [{ field_source: "ethereum_transaction", field: "value", operator: "gt", value: "0" }],
      },
      {
        name: "Never calls the stablecoin directly",
        method: "eth_signTransaction",
        action: "DENY",
        conditions: [{ field_source: "ethereum_transaction", field: "to", operator: "eq", value: usdc }],
      },
      {
        name: "Signs for Warrant until the authority expires",
        method: "*",
        action: "ALLOW",
        conditions: [
          { field_source: "system", field: "current_unix_timestamp", operator: "lt", value: String(expiry) },
        ],
      },
    ],
  });

  await setWalletPolicies(config.privyWalletId, [policy.id]);
  remember("PRIVY_POLICY_ID", policy.id);

  console.log(`\n  policy    ${policy.id}`);
  console.log(`  wallet    ${config.privyWalletId}`);
  console.log(`  denies    any transaction carrying HBAR`);
  console.log(`            any call to ${usdc} (${config.asset})`);
  console.log(`            every signature after ${new Date(expiry * 1000).toISOString()}`);
  console.log(`  allows    zero-value calls, and the x402 payment path, until then\n`);
}

main().catch((err) => {
  console.error(`\n  ${err instanceof Error ? err.message : err}\n`);
  process.exit(1);
});
