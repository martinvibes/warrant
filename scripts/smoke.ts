/**
 * Buying one of everything, for real.
 *
 * This is the check that matters before a demo: not that the routes exist, but
 * that a payment settles and the thing the agent paid for actually arrives.
 * Every line below costs real testnet USDC.
 *
 *   npm run smoke
 *   npm run smoke -- --to you@example.com   # prove a mail is delivered
 *   npm run smoke -- --with-phone           # also order a number, which costs
 *
 * Phone ordering is opt-in because it is the one purchase that cannot be
 * undone and that fails when the provider's account is out of credit.
 *
 * It pays directly rather than drawing from the treasury, because the subject
 * here is the resources. The treasury's ceilings have their own tests.
 */
import "dotenv/config";
import { config, LIVE_CATALOGUE, moneyFor } from "../src/config.js";
import { keysFromEnv, payingFetch } from "../src/agent/wallet.js";
import { publicKeyFor } from "../src/resources/seal.js";
import { privateKeyToAccount } from "viem/accounts";

const API = process.env.WARRANT_API ?? config.publicUrl;

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}
const has = (name: string) => process.argv.includes(`--${name}`);

const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  green: (s: string) => `\x1b[38;5;114m${s}\x1b[0m`,
  red: (s: string) => `\x1b[38;5;167m${s}\x1b[0m`,
  gold: (s: string) => `\x1b[38;5;179m${s}\x1b[0m`,
};

interface Result {
  kind: string;
  ok: boolean;
  note: string;
  settled: boolean;
}

/**
 * Collects the receipt for a purchase that just settled.
 *
 * The settlement id arrives in the response header, and the receipt is signed
 * a moment later, so this is a second call rather than a field in the body.
 */
async function collectReceipt(res: Response): Promise<string | undefined> {
  const header = res.headers.get("payment-response");
  if (!header) return undefined;
  let settlement: string | undefined;
  try {
    settlement = (JSON.parse(Buffer.from(header, "base64").toString()) as { transaction?: string }).transaction;
  } catch {
    return undefined;
  }
  if (!settlement) return undefined;

  const found = await fetch(`${API}/v1/receipts?settlement=${encodeURIComponent(settlement)}`);
  if (!found.ok) return undefined;
  const body = (await found.json()) as { receipt?: { id?: string; signature?: string } };
  if (!body.receipt?.id) return undefined;
  return body.receipt.signature ? `${body.receipt.id} signed` : `${body.receipt.id} unsigned`;
}

async function main(): Promise<void> {
  const keys = keysFromEnv();
  const fetcher = payingFetch(keys);
  if (!keys.evmKey) throw new Error("AGENT_EVM_PRIVATE_KEY is not set, so identity and sealed mail cannot be tested.");
  const evmAddress = privateKeyToAccount(keys.evmKey).address;

  console.log(`\n  buying one of everything from ${API}`);
  console.log(c.dim(`  paying from ${keys.accountId}\n`));

  const results: Result[] = [];
  let spent = 0n;

  const buy = async (kind: string, body: Record<string, unknown>): Promise<unknown> => {
    const offer = LIVE_CATALOGUE.find((o) => o.kind === kind);
    if (!offer) throw new Error(`${kind} is not being sold.`);

    process.stdout.write(`  ${c.gold(kind.padEnd(16))} ${c.dim(moneyFor(offer.price).padEnd(6))} `);
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-agent": keys.accountId,
    };
    headers["x-agent-address"] = evmAddress;

    const res = await fetcher(`${API}${offer.path}`, {
      method: offer.method,
      headers,
      body: JSON.stringify(body),
    });
    const text = await res.text();
    const parsed = ((): Record<string, unknown> => {
      try {
        return JSON.parse(text) as Record<string, unknown>;
      } catch {
        return { error: text.slice(0, 200) };
      }
    })();

    if (res.ok) {
      spent += offer.price;
      const receipt = await collectReceipt(res);
      console.log(`${c.green("ok")} ${c.dim(receipt ?? "no receipt")}`);
      results.push({ kind, ok: true, note: receipt ?? "", settled: true });
      return parsed.result;
    }

    // A purchase the service refused before charging is the service working,
    // not failing. Counting it as a failure would train us to ignore it.
    if (parsed.charged === false) {
      console.log(`${c.green("ok")} ${c.dim(`refused for free: ${String(parsed.error).slice(0, 80)}`)}`);
      results.push({ kind, ok: true, note: "already owned", settled: false });
      return undefined;
    }

    // A 402 never settled. Anything else after settlement did, and the
    // difference decides whether retrying would pay twice.
    const settled = res.status !== 402 && parsed.settled === true;
    if (settled) spent += offer.price;
    const note = String(parsed.error ?? text).slice(0, 150);
    console.log(`${c.red(`failed ${res.status}`)} ${c.dim(note)}`);
    results.push({ kind, ok: false, note, settled });
    return undefined;
  };

  // Identity first: the address others seal mail to comes from it.
  await buy("identity.mint", {
    metadataURI: `${config.publicUrl}/agent/${evmAddress}`,
    encryptionKey: publicKeyFor(keys.evmKey),
  });

  await buy("inference", { prompt: "Reply with the single word: settled.", maxTokens: 8 });

  await buy("memory.write", {
    content: `Smoke test at ${new Date().toISOString()}. The agent paid for this itself.`,
  });

  const localPart = `smoke-${Date.now().toString(36)}`;
  const inbox = (await buy("email.inbox", { name: localPart })) as { address?: string } | undefined;
  const from = inbox?.address ?? `${localPart}@${config.emailDomain}`;
  const to = flag("to") ?? from;

  await buy("email.send", {
    from,
    to,
    subject: "Your agent bought this stamp itself",
    body: "Sent from an inbox an agent paid for, over x402 on Hedera. Nobody approved it.",
  });

  await buy("email.sealed", {
    from,
    to,
    toAgent: evmAddress,
    subject: "Sealed",
    body: "Only the key on chain opens this.",
  });

  if (has("with-phone")) {
    const number = (await buy("phone.provision", { country: "US" })) as { phoneNumber?: string } | undefined;
    if (number?.phoneNumber) {
      await buy("sms.send", { from: number.phoneNumber, to: number.phoneNumber, text: "Bought by an agent." });
    }
  } else {
    console.log(c.dim("  phone.provision  skipped   pass --with-phone to order a real number"));
    console.log(c.dim("  sms.send         skipped   needs a number first"));
  }

  if (!flag("to")) {
    console.log(
      c.dim("\n  Mail was sent to the agent's own address, which needs inbound routing to land."),
    );
    console.log(c.dim("  Pass --to you@example.com to prove delivery to a real mailbox."));
  }

  const failed = results.filter((r) => !r.ok);
  console.log(c.dim("\n  ─────────────────────────────────────────────"));
  console.log(`  ${results.length - failed.length}/${results.length} working, ${moneyFor(spent)} spent`);
  if (failed.length) {
    for (const f of failed) {
      console.log(`  ${c.red(f.kind.padEnd(16))} ${f.settled ? "paid and then failed" : "not charged"}`);
    }
    process.exitCode = 1;
  }
  console.log();
}

main().catch((err) => {
  console.error(`\n  ${(err as Error).message}\n`);
  process.exit(1);
});
