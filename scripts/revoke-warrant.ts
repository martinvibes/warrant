/**
 * Revokes a warrant as the human owner.
 *
 *   npm run revoke                 # revokes the warrant in data/warrant.json
 *   npm run revoke -- --id 0x…     # revokes a specific one
 *
 * Signed by the owner key and posted to the service. No transaction, so this
 * takes effect on the agent's next request rather than on the next block.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import { config } from "../src/config.js";
import { domainFor } from "../src/warrant/warrant.js";
import { REVOCATION_TYPES } from "../src/warrant/revocation.js";

const API = process.env.WARRANT_API ?? `http://localhost:${config.port}`;

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function warrantIdFromDisk(): string {
  const file = path.join(config.dataDir, "warrant.json");
  if (!fs.existsSync(file)) {
    throw new Error(`No warrant at ${file}. Pass --id to revoke one by id.`);
  }
  return (JSON.parse(fs.readFileSync(file, "utf8")) as { id: string }).id;
}

async function main(): Promise<void> {
  const ownerKey = process.env.OWNER_PRIVATE_KEY as Hex | undefined;
  if (!ownerKey) throw new Error("OWNER_PRIVATE_KEY is not set, and only the owner can revoke.");
  const owner = privateKeyToAccount(ownerKey);

  const warrantId = (flag("id") ?? warrantIdFromDisk()) as Hex;
  const issuedAt = BigInt(Math.floor(Date.now() / 1000));

  const signature = await owner.signTypedData({
    domain: domainFor(config.network),
    types: REVOCATION_TYPES,
    primaryType: "Revocation",
    message: { warrantId, owner: owner.address, issuedAt },
  });

  const res = await fetch(`${API}/v1/warrants/${warrantId}/revoke`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      revocation: { warrantId, owner: owner.address, issuedAt: issuedAt.toString() },
      signature,
    }),
  });

  const body = (await res.json()) as { alreadyRevoked?: boolean; error?: string };
  if (!res.ok) {
    console.error(`revoke failed (${res.status}): ${JSON.stringify(body)}`);
    process.exit(1);
  }
  console.log(body.alreadyRevoked ? `already revoked  ${warrantId}` : `revoked  ${warrantId}`);
  console.log(`the agent's next request under it will be refused`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
