/**
 * Creating the agent's Hedera account from the service's.
 *
 * The portal hands out one account. A believable demo needs two, because a
 * seller paying itself proves nothing. Rather than sending anyone back to a
 * signup form, this creates the second from the first.
 *
 *   npm run new-account                    # 20 HBAR, unlimited token slots
 *   npm run new-account -- --hbar 50
 *
 * The new account is ECDSA with an EVM alias, because it has to do two jobs:
 * pay over x402, which is native Hedera, and draw from the treasury, which is
 * the EVM. One key, both jobs.
 *
 * It is created with automatic token association, so USDC can land in it
 * without the extra step the service account needs.
 */
import "dotenv/config";
import {
  AccountCreateTransaction,
  AccountId,
  Client,
  Hbar,
  PrivateKey,
} from "@hiero-ledger/sdk";
import { config } from "../src/config.js";
import { parseHederaKey } from "../src/resources/memory.js";

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main(): Promise<void> {
  // A placeholder is the common case, not an empty value, and "not a key in
  // any encoding" is an unhelpful thing to say about the word "placeholder".
  const looksUnset = (v: string) => !v || /^(placeholder|changeme|your[-_]?)/i.test(v);
  if (looksUnset(config.payTo) || looksUnset(config.operatorKey)) {
    console.error("\n  HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY are not set in .env yet.");
    console.error("  Get them from https://portal.hedera.com — sign up, pick testnet,");
    console.error("  and copy the ECDSA account id and the DER-encoded private key.\n");
    process.exit(1);
  }

  const hbar = Number(flag("hbar") ?? 20);
  const client = (config.hederaNetwork === "mainnet" ? Client.forMainnet() : Client.forTestnet())
    .setOperator(AccountId.fromString(config.payTo), parseHederaKey(config.operatorKey));

  const key = PrivateKey.generateECDSA();

  console.log(`\n  funding from  ${config.payTo}`);
  console.log(`  creating an ECDSA account with ${hbar} HBAR…`);

  const receipt = await new AccountCreateTransaction()
    // Gives the account an EVM address derived from the same key, so one key
    // covers both the x402 path and the contracts.
    .setECDSAKeyWithAlias(key)
    .setInitialBalance(new Hbar(hbar))
    // -1 is unlimited. Without it the account would need a separate
    // association before USDC could reach it, which is the step everyone
    // forgets.
    .setMaxAutomaticTokenAssociations(-1)
    .setAccountMemo("warrant agent")
    .execute(client)
    .then((response) => response.getReceipt(client));

  const accountId = receipt.accountId;
  if (!accountId) throw new Error("Hedera accepted the create but returned no account id.");

  const evmAddress = `0x${key.publicKey.toEvmAddress()}`;

  console.log(`\n  created  ${accountId.toString()}`);
  console.log(`  evm      ${evmAddress}`);
  console.log(`\n  Put these in .env:\n`);
  console.log(`AGENT_HEDERA_ACCOUNT_ID=${accountId.toString()}`);
  console.log(`AGENT_HEDERA_PRIVATE_KEY=${key.toStringRaw()}`);
  console.log(`AGENT_EVM_PRIVATE_KEY=0x${key.toStringRaw()}`);
  console.log(`\n  Then fund it with USDC at https://faucet.circle.com`);
  console.log(`  Pick Hedera testnet and paste ${accountId.toString()}.`);
  console.log(`\n  https://hashscan.io/${config.hederaNetwork}/account/${accountId.toString()}\n`);
  console.log(`  This key is printed once and not stored. Save it now.\n`);

  client.close();
}

main().catch((err) => {
  console.error(`\n  ${(err as Error).message}\n`);
  process.exit(1);
});
