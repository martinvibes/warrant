#!/usr/bin/env node
/**
 * The command line, for the times a person or a script wants one call.
 *
 *   warrant create                        a key, made locally
 *   warrant fund                          where to get testnet USDC, and a watch
 *   warrant catalogue                     what is for sale
 *   warrant buy inference --prompt "…"    one call, paid for
 *   warrant status                        what this agent owns and has spent
 *
 * Flags become the JSON body: --prompt hello turns into {"prompt":"hello"}. It
 * keeps the surface the same as the API rather than inventing a second
 * vocabulary for the same eight things.
 */
import { Warrant, WarrantError, DEFAULT_BASE_URL, type Offer } from "./index.js";
import * as wallet from "./wallet.js";
import { bad, bold, brass, dim, field, green, heading, light, link, note, ok, out, red, step, table, text } from "./ui.js";

function usage(): void {
  heading("warrant", "resources an agent buys, under a limit it cannot exceed");
  out();
  table([
    [brass("create"), dim("free"), "make a key for a new agent, locally"],
    [brass("fund"), dim("free"), "where to get testnet USDC, and watch for it"],
    [brass("catalogue"), dim("free"), "what is for sale, and the price"],
    [brass("status"), dim("free"), "what this agent owns, and what it has spent"],
    [brass("buy <kind>"), dim("paid"), "buy one call, e.g. buy inference --prompt hi"],
    [brass("read <path>"), dim("free"), "any free endpoint, e.g. read /v1/receipts"],
  ]);
  out();
  note("The account that pays is the identity. There is no API key and no signup.");
  out();
  heading("Environment", "or run warrant create and it keeps these for you");
  field("ACCOUNT_ID", dim("WARRANT_ACCOUNT_ID — the Hedera account paying"), 12);
  field("PRIVATE_KEY", dim("WARRANT_PRIVATE_KEY — its key, DER or hex"), 12);
  field("ADDRESS", dim("WARRANT_AGENT_ADDRESS — EVM address, for identity.mint"), 12);
  field("BASE_URL", dim(`WARRANT_BASE_URL — default ${DEFAULT_BASE_URL}`), 12);
  out();
}

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

/** The saved agent, unless the environment overrides it. */
function identity(): { accountId?: string; privateKey?: string; address?: string } {
  const saved = wallet.load();
  return {
    accountId: process.env.WARRANT_ACCOUNT_ID ?? saved?.accountId,
    privateKey: process.env.WARRANT_PRIVATE_KEY ?? saved?.privateKey,
    address: process.env.WARRANT_AGENT_ADDRESS ?? saved?.address,
  };
}

function client(): Warrant {
  const { accountId, privateKey } = identity();
  if (!accountId || !privateKey) {
    out();
    bad("No paying account yet.");
    note(`Run ${light("warrant create")}, then ${light("warrant fund")}. Or set WARRANT_ACCOUNT_ID and WARRANT_PRIVATE_KEY.`);
    out();
    process.exit(1);
  }
  return new Warrant({ accountId: accountId!, privateKey: privateKey!, baseUrl: process.env.WARRANT_BASE_URL });
}

function base(): string {
  return (process.env.WARRANT_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function fail(message: string): never {
  out();
  bad(message);
  out();
  process.exit(1);
}

/** Atomic units of a six-decimal token, as money. */
function money(atomic: string | number): string {
  return `$${(Number(atomic) / 1e6).toFixed(2)}`;
}

/** JSON, but only where JSON is the answer. */
function print(value: unknown): void {
  out(dim(JSON.stringify(value, null, 2).split("\n").map((l) => `  ${l}`).join("\n")));
}

// ─── commands ────────────────────────────────────────────────────────

async function catalogue(): Promise<void> {
  const cat = (await (await fetch(`${base()}/v1/catalogue`)).json()) as { offers: Offer[]; asset: string; network: string };
  heading("For sale", `${cat.offers.filter((o) => o.live).length} resources · settles in USDC ${cat.asset} on ${cat.network}`);
  out();
  table(
    cat.offers
      .filter((o) => o.live)
      .map((o) => [text(o.kind), light(money(o.priceAtomic)), dim(o.poweredBy), dim(`${o.method} ${o.path}`)]),
    ["left", "right", "left", "left"],
  );
  out();
  note("Prices come from the same table the server charges against.");
  out();
}

function createAgent(): void {
  const existing = wallet.load();
  if (existing && !process.argv.includes("--force")) {
    heading("This machine already has an agent");
    field("address", text(existing.address));
    if (existing.accountId) field("account", text(existing.accountId));
    field("key at", dim(wallet.walletPath()));
    out();
    note(`Keep it. To make another anyway, ${light("warrant create --force")}.`);
    out();
    return;
  }

  const agent = wallet.create();
  const path = wallet.save(agent);

  heading("A new agent", "the key was made on this machine and sent nowhere");
  field("address", text(agent.address));
  field("public key", dim(agent.publicKey));
  field("private key", dim(`kept in ${path}, readable only by you`));
  out();
  out(`  ${dim("The account does not exist on Hedera yet. Funding the address is what")}`);
  out(`  ${dim("creates it, so the next step is the only step:")}`);
  out();
  out(`  ${light("warrant fund")}`);
  out();
}

async function fund(): Promise<void> {
  const agent = wallet.load();
  const address = process.env.WARRANT_AGENT_ADDRESS ?? agent?.address;
  if (!address) fail(`No agent yet. Run ${light("warrant create")} first.`);

  heading("Funding", "testnet USDC is the only balance an agent needs");
  field("address", text(address!));
  out();
  step("01", `Get testnet USDC on Hedera: ${link(wallet.USDC_FAUCET)}`);
  note(`     Choose Hedera Testnet, and paste the address above.`);
  step("02", `HBAR, only if you want to deploy or transact yourself: ${link(wallet.HBAR_FAUCET)}`);
  note(`     Buying through Warrant needs none — the facilitator sponsors the fee.`);
  out();

  const watch = !process.argv.includes("--once");
  process.stdout.write(`  ${dim(watch ? "Watching for the first transfer" : "Checking")}`);
  const deadline = Date.now() + (watch ? 10 * 60_000 : 0);

  for (;;) {
    const { accountId, usdc, hbar } = await wallet.lookup(address!);
    if (accountId) {
      out("\n");
      ok(`Account ${bold(text(accountId))} exists on Hedera.`);
      field("USDC", `${light(`$${usdc}`)}`);
      if (hbar) field("HBAR", dim(hbar));
      if (agent && agent.accountId !== accountId) wallet.save({ ...agent, accountId });
      out();
      if (usdc === "0.00") {
        note(`The account is live but holds no USDC yet. Top it up at ${link(wallet.USDC_FAUCET)}.`);
      } else {
        note(`Ready. Try ${light("warrant buy inference --prompt \"hello\"")}.`);
      }
      out();
      return;
    }
    if (Date.now() >= deadline) {
      out("\n");
      note("Nothing has arrived yet. The account appears the moment the first transfer lands.");
      note(`Run ${light("warrant fund")} again to keep watching.`);
      out();
      return;
    }
    process.stdout.write(dim("."));
    await new Promise((r) => setTimeout(r, 5000));
  }
}

async function status(): Promise<void> {
  const { accountId, address } = identity();
  if (!accountId) fail(`No account yet. Run ${light("warrant create")}, then ${light("warrant fund")}.`);

  const agent = (await (await fetch(`${base()}/v1/agents/${accountId}`)).json()) as {
    agent: string;
    spent: string;
    purchases: number;
    inboxes?: { address: string }[];
    numbers?: { phoneNumber: string }[];
  };
  const chain = await wallet.lookup(address ?? accountId!);

  heading("This agent", accountId);
  if (address) field("address", dim(address));
  field("balance", light(`$${chain.usdc ?? "?"} USDC`));
  field("spent", `${light(money(agent.spent ?? 0))} ${dim(`over ${agent.purchases} purchases`)}`);
  if (agent.inboxes?.length) field("inbox", text(agent.inboxes.map((i) => i.address).join(", ")));
  if (agent.numbers?.length) field("number", text(agent.numbers.map((n) => n.phoneNumber).join(", ")));
  out();
  note(`The whole ledger is public: ${link(`${base()}/v1/receipts`)}`);
  out();
}

async function buy(rest: string[]): Promise<void> {
  const kind = rest[0];
  if (!kind || kind.startsWith("--")) fail(`Say what to buy, e.g. ${light("warrant buy inference --prompt hello")}`);

  const started = Date.now();
  process.stdout.write(`\n  ${brass("BUY")}  ${text(kind!)} ${dim("paying…")}`);
  const purchase = await client().buy(kind!, parseFlags(rest.slice(1)), identity().address);
  process.stdout.write("\r\x1b[2K");

  out(`  ${green("PAID")} ${text(kind!)} ${dim(`${Date.now() - started}ms`)}`);
  if (purchase.settlement) field("settlement", dim(purchase.settlement), 12);
  out();
  print(purchase.result);
  out();
}

async function read(rest: string[]): Promise<void> {
  const path = rest[0];
  if (!path) fail(`Give a path, e.g. ${light("warrant read /v1/receipts?limit=3")}`);
  const res = await fetch(`${base()}${path!.startsWith("/") ? path : `/${path}`}`);
  out();
  print(await res.json());
  out();
}

// ─── entry ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);

  switch (command) {
    case undefined:
    case "help":
    case "--help":
    case "-h":
      return usage();
    case "create":
      return createAgent();
    case "fund":
      return fund();
    case "catalogue":
      return catalogue();
    case "status":
      return status();
    case "buy":
      return buy(rest);
    case "read":
      return read(rest);
    default:
      out();
      bad(`No command ${bold(command)}.`);
      return usage();
  }
}

main().catch((err: unknown) => {
  if (err instanceof WarrantError) {
    process.stdout.write("\r\x1b[2K");
    out();
    bad(err.message);
    // The settled flag is the one thing a script must not miss, so it is said
    // in words rather than left in a JSON field nobody reads.
    if (err.settled) {
      out(`  ${red("You were charged.")} ${dim("The resource failed after the payment settled. Do not retry blind.")}`);
    } else {
      note("You were not charged. Correct it and try again.");
    }
    out();
    process.exit(1);
  }
  fail(err instanceof Error ? err.message : String(err));
});
