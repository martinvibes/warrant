/**
 * Giving the agent a key it does not hold.
 *
 *   npm run privy:setup
 *
 * Idempotent, and safe to re-run: each step is skipped when .env already
 * records its result. What it builds, in order:
 *
 *   1. a key quorum, from a keypair generated on this machine — Privy is sent
 *      the public half and never sees the other one;
 *   2. a server wallet owned by that quorum, so the only thing that can move
 *      it is a signature from this repo's authorization key;
 *   3. a Hedera account whose EVM alias is that wallet's address, so the same
 *      key pays over x402 and draws from the treasury.
 *
 * Step 3 is the one that needs both signatures: the operator pays for the
 * account, and Hedera will only attach an EVM alias if the aliased key signs
 * for itself. That second signature comes from Privy.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import {
  AccountCreateTransaction,
  AccountId,
  Client,
  Hbar,
  PublicKey,
} from "@hiero-ledger/sdk";
import { config } from "../src/config.js";
import { parseHederaKey } from "../src/resources/memory.js";
import { createWallet, getQuorum, getWallet, privyConfigured, registerQuorum } from "../src/privy/client.js";
import { agentPublicKey, signHash } from "../src/privy/hedera.js";
import { keccak256, toHex } from "viem";

const ENV = path.join(process.cwd(), ".env");

/** Writes one variable back, so a re-run of this script is a no-op. */
function remember(name: string, value: string): void {
  const line = `${name}=${value}`;
  let text = fs.existsSync(ENV) ? fs.readFileSync(ENV, "utf8") : "";
  const pattern = new RegExp(`^${name}=.*$`, "m");
  text = pattern.test(text) ? text.replace(pattern, line) : `${text.replace(/\n*$/, "\n")}${line}\n`;
  fs.writeFileSync(ENV, text);
  process.env[name] = value;
}

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main(): Promise<void> {
  if (!privyConfigured()) {
    console.error("\n  Set PRIVY_APP_ID, PRIVY_APP_SECRET and PRIVY_AUTH_PRIVATE_KEY in .env first.\n");
    process.exit(1);
  }

  // 1. The quorum that owns the wallet.
  let quorumId = config.privyAuthKeyId;
  if (quorumId) {
    await getQuorum(quorumId).catch(() => {
      throw new Error(
        `PRIVY_AUTH_KEY_ID ${quorumId} does not exist on app ${config.privyAppId}. ` +
          `Clear it from .env and re-run to register a new one.`,
      );
    });
    console.log(`  quorum      ${quorumId} (existing)`);
  } else {
    const quorum = await registerQuorum("warrant");
    quorumId = quorum.id;
    remember("PRIVY_AUTH_KEY_ID", quorumId);
    console.log(`  quorum      ${quorumId} (registered)`);
  }

  // 2. The wallet it owns.
  let walletId = config.privyWalletId;
  let address = config.privyWalletAddress;
  if (walletId) {
    const wallet = await getWallet(walletId);
    address = wallet.address as typeof address;
    console.log(`  wallet      ${walletId} (existing)`);
  } else {
    const wallet = await createWallet(quorumId);
    walletId = wallet.id;
    address = wallet.address as typeof address;
    remember("PRIVY_WALLET_ID", walletId);
    console.log(`  wallet      ${walletId} (created)`);
  }
  remember("PRIVY_WALLET_ADDRESS", address);
  console.log(`  address     ${address}`);

  // 3. The public key, read back out of a signature.
  const key = await agentPublicKey(walletId);
  if (key.address.toLowerCase() !== address.toLowerCase()) {
    throw new Error(`Recovered ${key.address} but the wallet says ${address}. Refusing to continue.`);
  }
  remember("PRIVY_WALLET_PUBLIC_KEY", key.compressed);
  console.log(`  public key  ${key.compressed}`);

  // 4. The Hedera account that key controls.
  if (process.env.AGENT_PRIVY_ACCOUNT_ID) {
    console.log(`  account     ${process.env.AGENT_PRIVY_ACCOUNT_ID} (existing)`);
    return;
  }

  const hbar = Number(flag("hbar") ?? 20);
  const client = (config.hederaNetwork === "mainnet" ? Client.forMainnet() : Client.forTestnet()).setOperator(
    AccountId.fromString(config.payTo),
    parseHederaKey(config.operatorKey),
  );

  console.log(`\n  creating a Hedera account for ${address} with ${hbar} HBAR…`);
  try {
    const tx = new AccountCreateTransaction()
      .setECDSAKeyWithAlias(PublicKey.fromStringECDSA(key.compressed))
      .setInitialBalance(new Hbar(hbar))
      // So drawn USDC lands without a separate association the agent would
      // have to pay for before it could be paid.
      .setMaxAutomaticTokenAssociations(-1)
      .freezeWith(client);

    // Hedera attaches an EVM alias only when the aliased key signs for it.
    // That signature is the whole point: Privy makes it, we never could.
    const signed = await tx.signWith(PublicKey.fromStringECDSA(key.compressed), (bytes) =>
      signHash(walletId, keccak256(toHex(bytes))),
    );

    const response = await signed.execute(client);
    const receipt = await response.getReceipt(client);
    const accountId = receipt.accountId?.toString();
    if (!accountId) throw new Error("Hedera accepted the transaction but returned no account id.");

    remember("AGENT_PRIVY_ACCOUNT_ID", accountId);
    console.log(`  account     ${accountId} (created)`);
    console.log(`  explorer    https://hashscan.io/${config.hederaNetwork}/account/${accountId}\n`);
  } finally {
    client.close();
  }
}

main().catch((err) => {
  console.error(`\n  ${err instanceof Error ? err.message : err}\n`);
  process.exit(1);
});
