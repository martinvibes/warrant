/**
 * Checking a receipt without trusting the service that issued it.
 *
 *   npm run verify -- rcp_mtyuhr4pcba628326d
 *   npm run verify -- rcp_... --api https://warrant.example
 *
 * Nothing here is privileged. It fetches the receipt, rebuilds the digest from
 * the fields, recovers the address that signed it, and compares that with the
 * issuer the service publishes. A service that altered a receipt after issuing
 * it would fail at the third step, and one that issued a receipt it never
 * settled would fail at the fourth, where the settlement is read back from
 * Hedera's mirror node rather than from the service.
 */
import "dotenv/config";
import { recoverMessageAddress, type Hex } from "viem";
import { config } from "../src/config.js";
import { digestOf, type Receipt } from "../src/receipts.js";

const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  green: (s: string) => `\x1b[38;5;114m${s}\x1b[0m`,
  red: (s: string) => `\x1b[38;5;167m${s}\x1b[0m`,
};

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const MIRROR =
  config.hederaNetwork === "mainnet"
    ? "https://mainnet-public.mirrornode.hedera.com"
    : "https://testnet.mirrornode.hedera.com";

async function main(): Promise<void> {
  const id = process.argv.slice(2).find((a) => a.startsWith("rcp_"));
  if (!id) {
    console.error("\n  Give a receipt id:  npm run verify -- rcp_...\n");
    process.exit(1);
  }
  const api = flag("api") ?? process.env.WARRANT_API ?? config.publicUrl;

  const res = await fetch(`${api}/v1/receipts/${id}`);
  if (!res.ok) throw new Error(`${api} has no receipt ${id}.`);
  const { receipt } = (await res.json()) as { receipt: Receipt };

  const contracts = await fetch(`${api}/v1/contracts`).then((r) => r.json() as Promise<{ receiptIssuer?: string }>);

  console.log(`\n  receipt    ${receipt.id}`);
  console.log(`  bought     ${receipt.kind} for ${Number(receipt.amount) / 1e6} USDC`);
  console.log(`  agent      ${receipt.agent}`);
  console.log(`  settled    ${receipt.settlement ?? "not settled"}`);
  console.log(`  issued     ${receipt.issuedAt}\n`);

  let failures = 0;
  const check = (label: string, ok: boolean, detail: string) => {
    if (!ok) failures++;
    console.log(`  ${ok ? c.green("ok  ") : c.red("bad ")} ${label.padEnd(28)} ${c.dim(detail)}`);
  };

  // 1. The digest has to be a function of the fields, not a number we are told.
  const rebuilt = digestOf(receipt);
  check("digest matches the fields", rebuilt === receipt.digest, rebuilt);

  // 2. The signature has to recover to somebody.
  let signer = "";
  try {
    signer = await recoverMessageAddress({ message: receipt.digest, signature: receipt.signature as Hex });
  } catch {
    /* left empty, reported below */
  }
  check("signature recovers", Boolean(signer), signer || "could not recover a signer");

  // 3. That somebody has to be the issuer the service publishes.
  check(
    "signer is the issuer",
    Boolean(signer) && signer.toLowerCase() === (contracts.receiptIssuer ?? "").toLowerCase(),
    contracts.receiptIssuer ?? "the service publishes no issuer",
  );

  // 4. The settlement has to exist on Hedera, read from the mirror node and
  //    not from the service that wants to be believed.
  if (receipt.settlement) {
    const encoded = receipt.settlement.replace("@", "-").replace(/\.(\d+)$/, "-$1");
    const found = await fetch(`${MIRROR}/api/v1/transactions/${encoded}`);
    const body = (await found.json()) as { transactions?: { result?: string; charged_tx_fee?: number }[] };
    const tx = body.transactions?.[0];
    check("settlement is on Hedera", tx?.result === "SUCCESS", tx?.result ?? "not found on the mirror node");
  }

  console.log(
    failures === 0
      ? `\n  ${c.green("This receipt is genuine.")}\n`
      : `\n  ${c.red(`${failures} check(s) failed.`)}\n`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(`\n  ${(err as Error).message}\n`);
  process.exit(1);
});
