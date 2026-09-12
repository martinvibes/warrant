/**
 * An agent that spends its own money.
 *
 * Give it a goal in plain English. It reads the catalogue, decides what it
 * needs, pays for each call as it makes it, and reports what it did and what
 * that cost. Nobody approves anything along the way.
 *
 *   npm run agent -- "find out what x402 is and email me a summary"
 *
 * The trace it prints is the honest one: every line marked PAID corresponds to
 * a settlement that happened, and the totals at the end are summed from those
 * lines rather than estimated from the catalogue.
 */
import "dotenv/config";
import OpenAI from "openai";
import { config, moneyFor, type Offer } from "../config.js";
import { keysFromEnv, payingFetch, Treasury, type AgentKeys } from "./wallet.js";
import { kindForToolName, toolsFor, toolNameFor } from "./tools.js";
import { publicKeyFor } from "../resources/seal.js";

const API = process.env.WARRANT_API ?? config.publicUrl;
const MAX_STEPS = Number(process.env.AGENT_MAX_STEPS ?? 12);

const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  gold: (s: string) => `\x1b[38;5;179m${s}\x1b[0m`,
  green: (s: string) => `\x1b[38;5;114m${s}\x1b[0m`,
  red: (s: string) => `\x1b[38;5;167m${s}\x1b[0m`,
};

function usdc(atomic: bigint): string {
  return moneyFor(atomic);
}

interface Spend {
  kind: string;
  atomic: bigint;
  transaction?: string;
}

class Session {
  readonly spends: Spend[] = [];
  constructor(
    private readonly keys: AgentKeys,
    private readonly fetcher: typeof fetch,
    private readonly offers: Map<string, Offer>,
    private readonly treasury?: Treasury,
  ) {}

  get total(): bigint {
    return this.spends.reduce((sum, s) => sum + s.atomic, 0n);
  }

  /**
   * Tops the float up from the treasury when the next purchase would outrun it.
   *
   * Returns a message when the chain refuses, because a refusal is information
   * the agent should act on rather than an error to retry through.
   */
  private async ensureFunds(kind: string): Promise<string | undefined> {
    if (!this.treasury) return undefined;
    try {
      const budget = await this.treasury.budget();
      const offer = this.offers.get(kind);
      const need = offer?.price ?? 0n;
      if (budget.window >= need) return undefined;

      const when = budget.resetsAt ? new Date(budget.resetsAt * 1000).toISOString() : "the next window";
      return `The daily limit is spent. ${usdc(budget.window)} left, ${usdc(need)} needed. It reopens at ${when}.`;
    } catch (err) {
      // No treasury configured is not a failure; it means the agent is running
      // on a float somebody funded directly.
      return (err as Error).message.includes("not set") ? undefined : (err as Error).message;
    }
  }

  async buy(kind: string, args: Record<string, unknown>): Promise<string> {
    const offer = this.offers.get(kind);
    if (!offer) return `There is nothing called ${kind} for sale here.`;

    const blocked = await this.ensureFunds(kind);
    if (blocked) {
      console.log(`  ${c.red("REFUSED")} ${kind}  ${c.dim(blocked)}`);
      return `Refused: ${blocked}`;
    }

    process.stdout.write(`  ${c.gold("BUY")}     ${kind.padEnd(16)} ${c.dim(usdc(offer.price))} `);

    const body: Record<string, unknown> = { ...args };
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-agent": this.keys.accountId,
    };
    if (this.treasury) headers["x-agent-address"] = this.treasury.address;
    if (kind === "identity.mint" && this.treasury && this.keys.evmKey) {
      // The key others seal mail to is derived from the agent's own EVM key,
      // so minting and sealing stay consistent without a second keypair.
      body.encryptionKey = publicKeyFor(this.keys.evmKey);
    }

    const started = Date.now();
    const res = await this.fetcher(`${API}${offer.path}`, {
      method: offer.method,
      headers,
      body: JSON.stringify(body),
    });
    const took = Date.now() - started;
    const text = await res.text();

    if (!res.ok) {
      console.log(c.red(`FAILED ${res.status}`));
      console.log(`          ${c.dim(text.slice(0, 200))}`);
      return `The purchase failed with ${res.status}: ${text.slice(0, 300)}`;
    }

    const settlement = res.headers.get("payment-response") ?? undefined;
    this.spends.push({ kind, atomic: offer.price, transaction: settlement });
    console.log(`${c.green("PAID")} ${c.dim(`${took}ms`)}`);

    return text.slice(0, 4000);
  }
}

async function main(): Promise<void> {
  const goal = process.argv.slice(2).join(" ").trim();
  if (!goal) {
    console.error('Give the agent something to do:  npm run agent -- "summarise this ticket and email it to me"');
    process.exit(1);
  }
  if (!config.openaiKey) throw new Error("OPENAI_API_KEY is not set, so the agent cannot decide anything.");

  const keys = keysFromEnv();
  const treasury = keys.evmKey ? new Treasury(keys.evmKey) : undefined;
  const fetcher = payingFetch(keys);

  const catalogue = (await (await fetch(`${API}/v1/catalogue`)).json()) as {
    offers: { kind: string; live: boolean; path: string; method: string; priceAtomic: string; title: string; blurb: string }[];
  };
  const offers = new Map<string, Offer>(
    catalogue.offers
      .filter((o) => o.live)
      .map((o) => [
        o.kind,
        {
          kind: o.kind,
          method: o.method as "POST",
          path: o.path,
          price: BigInt(o.priceAtomic),
          title: o.title,
          blurb: o.blurb,
          poweredBy: "",
          live: true,
        },
      ]),
  );

  console.log();
  console.log(c.bold("  goal    ") + goal);
  console.log(c.dim(`  paying from ${keys.accountId}${treasury ? `, drawing as ${treasury.address}` : ""}`));
  if (treasury) {
    try {
      const budget = await treasury.budget();
      console.log(c.dim(`  budget  ${usdc(budget.window)} this window, ${usdc(budget.total)} remaining overall`));
    } catch {
      console.log(c.dim("  budget  no treasury configured, spending a float directly"));
    }
  }
  console.log();

  const session = new Session(keys, fetcher, offers, treasury);
  const openai = new OpenAI({ apiKey: config.openaiKey });

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: [
        "You are an autonomous agent with your own money. You buy what you need to finish a job.",
        "Every tool call costs real money from a limited budget, so buy what the job needs and nothing more.",
        "You already know a great deal. Only buy inference for things you genuinely cannot answer yourself.",
        "Mail is sent from an address you own, so buy an inbox before sending anything.",
        "If a purchase is refused because a limit is spent, stop and say so. Do not retry it.",
        "When the job is done, say what you did in two or three plain sentences.",
      ].join(" "),
    },
    { role: "user", content: goal },
  ];

  const tools = toolsFor([...offers.values()], (o) => usdc(o.price));

  for (let step = 0; step < MAX_STEPS; step++) {
    const completion = await openai.chat.completions.create({
      model: process.env.AGENT_MODEL ?? "gpt-4o-mini",
      messages,
      tools,
      tool_choice: "auto",
    });

    const choice = completion.choices[0].message;
    messages.push(choice);

    if (!choice.tool_calls?.length) {
      console.log();
      console.log(c.bold("  result  ") + (choice.content ?? "(the agent said nothing)"));
      break;
    }

    for (const call of choice.tool_calls) {
      if (call.type !== "function") continue;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
      } catch {
        /* a malformed call still gets an answer, so the model can correct it */
      }
      const result = await session.buy(kindForToolName(call.function.name), args);
      messages.push({ role: "tool", tool_call_id: call.id, content: result });
    }
  }

  console.log();
  console.log(c.dim("  ─────────────────────────────────────────────"));
  for (const spend of session.spends) {
    console.log(`  ${spend.kind.padEnd(18)} ${usdc(spend.atomic)}`);
  }
  console.log(
    `  ${c.bold("total".padEnd(18))} ${c.bold(usdc(session.total))} ${c.dim(`over ${session.spends.length} purchases`)}`,
  );
  console.log();
}

main().catch((err) => {
  console.error(`\n  ${(err as Error).message}\n`);
  process.exit(1);
});

export { toolNameFor };
