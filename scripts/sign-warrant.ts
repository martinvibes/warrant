/**
 * Signs a warrant as the human owner.
 *
 * This is deliberately a separate command from anything the agent runs. The
 * owner's key signs the licence; the agent's key signs the payments. Keeping
 * them in different processes is what makes the distinction real rather than
 * a comment.
 *
 *   npm run sign -- --agent 0.0.12345 --cap 1.00 --resources inference \
 *                   --purpose "support triage" --hours 24
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import { config, RESOURCES, type ResourceType } from "../src/config.js";
import {
  WARRANT_TYPES,
  domainFor,
  toWire,
  warrantId,
  warrantMessage,
  type Warrant,
} from "../src/warrant/warrant.js";

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

/** Parses a human amount like "1.25" into atomic units of the settlement asset. */
function toAtomic(human: string, decimals: number): bigint {
  const [whole, frac = ""] = human.trim().split(".");
  if (!/^\d+$/.test(whole) || (frac && !/^\d+$/.test(frac))) {
    throw new Error(`"${human}" is not an amount. Try --cap 1.50`);
  }
  if (frac.length > decimals) {
    throw new Error(`${human} has more than ${decimals} decimal places, which this asset cannot represent.`);
  }
  return BigInt(whole + frac.padEnd(decimals, "0"));
}

async function main(): Promise<void> {
  const ownerKey = process.env.OWNER_PRIVATE_KEY as Hex | undefined;
  if (!ownerKey) {
    throw new Error("OWNER_PRIVATE_KEY is not set. That key is the human in this system; nothing can be authorised without it.");
  }
  const owner = privateKeyToAccount(ownerKey);

  const agent = flag("agent") ?? process.env.AGENT_HEDERA_ACCOUNT_ID;
  if (!agent) throw new Error("Say which agent this warrant is for: --agent 0.0.12345");

  const resources = (flag("resources") ?? "inference")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as ResourceType[];
  const unknown = resources.filter((r) => !RESOURCES.includes(r));
  if (unknown.length) {
    throw new Error(`This service does not sell ${unknown.join(", ")}. It sells ${RESOURCES.join(", ")}.`);
  }

  const cap = toAtomic(flag("cap") ?? "1.00", config.assetDecimals);
  const hours = Number(flag("hours") ?? 24);
  const purpose = flag("purpose") ?? "unspecified";

  const warrant: Warrant = {
    owner: owner.address,
    agent,
    asset: config.asset,
    cap,
    resources,
    purpose,
    expiry: BigInt(Math.floor(Date.now() / 1000) + Math.round(hours * 3600)),
    nonce: BigInt(flag("nonce") ?? Date.now()),
  };

  const signature = await owner.signTypedData({
    domain: domainFor(config.network),
    types: WARRANT_TYPES,
    primaryType: "Warrant",
    message: warrantMessage(warrant),
  });

  const signed = { warrant: toWire(warrant), signature };
  const header = Buffer.from(JSON.stringify(signed)).toString("base64");
  const id = warrantId(warrant, config.network);

  fs.mkdirSync(config.dataDir, { recursive: true });
  const file = path.join(config.dataDir, "warrant.json");
  fs.writeFileSync(file, JSON.stringify({ ...signed, id, header }, null, 2));

  console.log(`warrant  ${id}`);
  console.log(`owner    ${owner.address}`);
  console.log(`agent    ${agent}`);
  console.log(`covers   ${resources.join(", ")}`);
  console.log(`cap      ${flag("cap") ?? "1.00"} (${cap} atomic)`);
  console.log(`purpose  ${purpose}`);
  console.log(`expires  ${new Date(Number(warrant.expiry) * 1000).toISOString()}`);
  console.log(`saved to ${file}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
