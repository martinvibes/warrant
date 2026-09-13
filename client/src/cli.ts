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
import { bad, bold, brass, dim, field, green, heading, light, link, note, ok, out, qr, red, step, table, text } from "./ui.js";

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
  field("explorer", link(wallet.explorer(agent.address)));
  out();
  out(`  ${dim("The account does not exist on Hedera yet: an address becomes an account")}`);
  out(`  ${dim("the moment the first transfer reaches it. That is the next step, and the")}`);
  out(`  ${dim("only one.")}`);
  out();
  out(`  ${light("warrant fund")}`);
  out();
}

async function fund(): Promise<void> {
  const agent = wallet.load();
  const address = process.env.WARRANT_AGENT_ADDRESS ?? agent?.address;
  if (!address) fail(`No agent yet. Run ${light("warrant create")} first.`);

  const known = await wallet.lookup(address!);

  // Two different problems, so two different screens. Before the account
  // exists there is no account id to give Circle, and HBAR is what brings it
  // into being. After it exists, the id is the thing every faucet asks for.
  if (!known.accountId) {
    heading("Funding", "an address becomes an account on its first transfer");
    field("address", text(address!));
    field("explorer", link(wallet.explorer(address!)));
    note("               (empty until the first transfer lands)");
    out();
    out(await qr(address!));
    step("01", `Send testnet HBAR to that address: ${link(wallet.HBAR_FAUCET)}`);
    note("     It accepts an EVM address, and the transfer is what creates the");
    note("     account. Hedera then gives you the 0.0.x id every faucet asks for.");
    out();
    note("Scan the code above to paste the address on a phone.");
  } else {
    heading("Funding", `account ${known.accountId}`);
    field("account", bold(text(known.accountId)));
    field("address", dim(address!));
    field("USDC", light(`$${known.usdc}`));
    if (known.hbar) field("HBAR", dim(known.hbar));
    field("explorer", link(wallet.explorer(known.accountId)));
    out();
    out(await qr(known.accountId));
    step("01", `Get testnet USDC: ${link(wallet.USDC_FAUCET)}`);
    note(`     Choose ${bold("Hedera Testnet")} and paste ${bold(known.accountId)} — Circle asks for`);
    note("     the account id, not the 0x address.");
    step("02", `More HBAR, if you want to deploy or transact yourself: ${link(wallet.HBAR_FAUCET)}`);
    note("     Buying through Warrant needs none: the facilitator sponsors the fee.");
    out();
    if (known.usdc !== "0.00") {
      ok(`Funded. Try ${light('warrant buy inference --prompt "hello"')}.`);
      out();
      return;
    }
  }

  out();
  const watch = !process.argv.includes("--once");
  if (!watch) {
    note("Run warrant fund again once the transfer has landed.");
    out();
    return;
  }

  process.stdout.write(`  ${dim(known.accountId ? "Watching for USDC" : "Watching for the first transfer")}`);
  const deadline = Date.now() + 10 * 60_000;

  for (;;) {
    await new Promise((r) => setTimeout(r, 5000));
    const now = await wallet.lookup(address!);

    if (now.accountId && !known.accountId) {
      out("\n");
      ok(`Account ${bold(text(now.accountId))} now exists.`);
      if (agent) wallet.save({ ...agent, accountId: now.accountId });
      field("explorer", link(wallet.explorer(now.accountId)));
      out();
      note(`Now get USDC for it: ${link(wallet.USDC_FAUCET)} — paste ${bold(now.accountId)}.`);
      out();
      out(await qr(now.accountId));
      return;
    }

    if (now.accountId && now.usdc !== "0.00") {
      out("\n");
      ok(`${bold(light(`$${now.usdc} USDC`))} arrived in ${text(now.accountId)}.`);
      if (agent && agent.accountId !== now.accountId) wallet.save({ ...agent, accountId: now.accountId });
      out();
      note(`Ready. Try ${light('warrant buy inference --prompt "hello"')}.`);
      out();
      return;
    }

    if (Date.now() >= deadline) {
      out("\n");
      note("Nothing yet. Run warrant fund again to keep watching.");
      out();
      return;
    }
    process.stdout.write(dim("."));
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
  field("explorer", link(wallet.explorer(accountId!)));
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
