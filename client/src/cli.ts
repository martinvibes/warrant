#!/usr/bin/env node
/**
 * The command line, for the times a person or a script wants one call.
 *
 *   export WARRANT_ACCOUNT_ID=0.0.10514332
 *   export WARRANT_PRIVATE_KEY=302e…
 *   warrant catalogue
 *   warrant buy inference --prompt "one line on Hedera"
 *   warrant read /v1/receipts?limit=3
 *
 * Flags become the JSON body: --prompt hello turns into {"prompt":"hello"}. It
 * keeps the surface the same as the API rather than inventing a second
 * vocabulary for the same eight things.
 */
import { Warrant, WarrantError, DEFAULT_BASE_URL, type Offer } from "./index.js";

const USAGE = `warrant — buy resources for an agent over x402 on Hedera

  warrant catalogue                       what is for sale, and the price
  warrant buy <kind> [--field value …]    buy one call
  warrant read <path>                     any free endpoint, e.g. /v1/receipts

Environment
  WARRANT_ACCOUNT_ID    the Hedera account paying, e.g. 0.0.10514332
  WARRANT_PRIVATE_KEY   its private key, DER or hex
  WARRANT_BASE_URL      a different service (default ${DEFAULT_BASE_URL})
  WARRANT_AGENT_ADDRESS the agent's EVM address, needed by identity.mint

Examples
  warrant buy inference --prompt "summarise x402 in one line"
  warrant buy memory.write --content "the peer at 0x7510 answers on scout@…"
  warrant buy sms.send --from +18164961100 --to +14155550123 --text hello
`;

/** Turns --key value pairs into the request body, untyped as the API is. */
function parseFlags(args: string[]): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (!arg.startsWith("--")) continue;
    const [name, inline] = arg.slice(2).split("=", 2);
    if (!name) continue;
    const next = args[i + 1];
    const raw = inline ?? (next && !next.startsWith("--") ? (i++, next) : "true");
    body[name] = raw === "true" ? true : raw === "false" ? false : /^-?\d+$/.test(raw) ? Number(raw) : raw;
  }
  return body;
}

function client(): Warrant {
  const accountId = process.env.WARRANT_ACCOUNT_ID;
  const privateKey = process.env.WARRANT_PRIVATE_KEY;
  if (!accountId || !privateKey) {
    fail("Set WARRANT_ACCOUNT_ID and WARRANT_PRIVATE_KEY to the Hedera account that pays.");
  }
  return new Warrant({ accountId: accountId!, privateKey: privateKey!, baseUrl: process.env.WARRANT_BASE_URL });
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function print(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function row(offer: Offer): string {
  return `  ${offer.kind.padEnd(17)} ${offer.price.padStart(6)}   ${offer.title} · ${offer.poweredBy}`;
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);

  if (!command || command === "help" || command === "--help" || command === "-h") {
    process.stdout.write(USAGE);
    return;
  }

  // Reading the catalogue costs nothing and needs no key, so it must work
  // before an account exists. Anything else builds a paying client first.
  if (command === "catalogue") {
    const base = (process.env.WARRANT_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    const catalogue = (await (await fetch(`${base}/v1/catalogue`)).json()) as { offers: Offer[]; asset: string };
    process.stdout.write(`${base}\n  settles in ${catalogue.asset}\n\n`);
    catalogue.offers.filter((o) => o.live).forEach((o) => process.stdout.write(`${row(o)}\n`));
    return;
  }

  if (command === "read") {
    const path = rest[0];
    if (!path) fail("Give a path, e.g. warrant read /v1/receipts?limit=3");
    const base = (process.env.WARRANT_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    print(await (await fetch(`${base}${path!.startsWith("/") ? path : `/${path}`}`)).json());
    return;
  }

  if (command === "buy") {
    const kind = rest[0];
    if (!kind || kind.startsWith("--")) fail("Say what to buy, e.g. warrant buy inference --prompt hello");
    const purchase = await client().buy(kind!, parseFlags(rest.slice(1)), process.env.WARRANT_AGENT_ADDRESS);
    print(purchase);
    return;
  }

  fail(`No command "${command}".\n\n${USAGE}`);
}

main().catch((err: unknown) => {
  if (err instanceof WarrantError) {
    // The settled flag is the one thing a script must not miss, so it is said
    // in words rather than left in a JSON field nobody reads.
    const paid = err.settled
      ? "\nYou were charged. The resource failed after the payment settled. Do not retry blind."
      : "\nYou were not charged.";
    fail(`${err.message}${paid}`);
  }
  fail(err instanceof Error ? err.message : String(err));
});
