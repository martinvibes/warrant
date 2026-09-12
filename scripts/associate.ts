/**
 * Associating an account with the USDC token.
 *
 * Hedera will not let a token land in an account that has not agreed to hold
 * it. This catches almost everyone once: the faucet reports success, the
 * balance stays zero, and nothing explains why. Run this before asking the
 * faucet for anything.
 *
 *   npm run associate              # the service account, from HEDERA_*
 *   npm run associate -- --agent   # the agent account, from AGENT_HEDERA_*
 *
 * Safe to run twice. An account that is already associated is reported as
 * already associated rather than treated as an error.
 */
import "dotenv/config";
import {
  AccountBalanceQuery,
  AccountId,
  Client,
  TokenAssociateTransaction,
  TokenId,
} from "@hiero-ledger/sdk";
import { config } from "../src/config.js";
import { parseHederaKey } from "../src/resources/memory.js";

async function main(): Promise<void> {
  const wantsAgent = process.argv.includes("--agent");

  const accountId = wantsAgent ? process.env.AGENT_HEDERA_ACCOUNT_ID : config.payTo;
  const rawKey = wantsAgent ? process.env.AGENT_HEDERA_PRIVATE_KEY : config.operatorKey;
  const which = wantsAgent ? "AGENT_HEDERA_*" : "HEDERA_*";

  if (!accountId || !rawKey) {
    console.error(`\n  Set ${which}_ACCOUNT_ID and ${which}_PRIVATE_KEY in .env first.\n`);
    process.exit(1);
  }

  const key = parseHederaKey(rawKey);
  const client = (config.hederaNetwork === "mainnet" ? Client.forMainnet() : Client.forTestnet())
    .setOperator(AccountId.fromString(accountId), key);

  const token = TokenId.fromString(config.asset);

  console.log(`\n  account  ${accountId}`);
  console.log(`  token    ${config.asset} (USDC)`);
  console.log(`  network  ${config.hederaNetwork}`);

  const before = await new AccountBalanceQuery().setAccountId(accountId).execute(client);
  const held = before.tokens?.get(token);

  if (held !== null && held !== undefined) {
    console.log(`\n  Already associated. Balance is ${Number(held) / 10 ** config.assetDecimals} USDC.`);
    console.log(`  Top it up at https://faucet.circle.com (pick Hedera testnet).\n`);
    client.close();
    return;
  }

  console.log(`\n  associating…`);
  const receipt = await (
    await new TokenAssociateTransaction()
      .setAccountId(AccountId.fromString(accountId))
      .setTokenIds([token])
      .freezeWith(client)
      .sign(key)
  )
    .execute(client)
    .then((response) => response.getReceipt(client));

  console.log(`  ${receipt.status.toString()}`);
  console.log(`\n  Now get USDC at https://faucet.circle.com — pick Hedera testnet,`);
  console.log(`  paste ${accountId}, and ask for 20 USDC.\n`);
  console.log(`  https://hashscan.io/${config.hederaNetwork}/account/${accountId}\n`);

  client.close();
}

main().catch((err) => {
  console.error(`\n  ${(err as Error).message}\n`);
  process.exit(1);
});
