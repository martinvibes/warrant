import "dotenv/config";
import path from "node:path";
import { HEDERA_TESTNET_USDC, HEDERA_MAINNET_USDC, HEDERA_USDC_DECIMALS } from "@x402/hedera";
import { privateKeyToAccount } from "viem/accounts";
import type { Address, Hex } from "viem";

/** Resource types this service sells. The warrant allowlist is drawn from these. */
export const RESOURCES = ["inference", "email.send"] as const;
export type ResourceType = (typeof RESOURCES)[number];

/**
 * Prices, in the smallest unit of the settlement asset.
 *
 * Held in atomic units rather than dollars because the gate compares them
 * against a warrant cap, and a cap that drifts by a rounding step is a cap
 * that can be walked past.
 */
export const PRICES: Record<ResourceType, bigint> = {
  inference: BigInt(process.env.PRICE_INFERENCE ?? "50000"), // 0.05 USDC
  "email.send": BigInt(process.env.PRICE_EMAIL_SEND ?? "20000"), // 0.02 USDC
};

/** The same prices as x402 Money strings, for the payment requirements. */
export function moneyFor(resource: ResourceType): `$${string}` {
  const atomic = PRICES[resource];
  const whole = atomic / 10n ** BigInt(HEDERA_USDC_DECIMALS);
  const frac = (atomic % 10n ** BigInt(HEDERA_USDC_DECIMALS))
    .toString()
    .padStart(HEDERA_USDC_DECIMALS, "0")
    .replace(/0+$/, "");
  return `$${whole}${frac ? "." + frac : ""}` as `$${string}`;
}

const network = process.env.HEDERA_NETWORK ?? "hedera:testnet";
if (network !== "hedera:testnet" && network !== "hedera:mainnet") {
  throw new Error(`HEDERA_NETWORK must be hedera:testnet or hedera:mainnet, got ${network}`);
}

function ownerAddress(): Address | undefined {
  if (process.env.OWNER_ADDRESS) return process.env.OWNER_ADDRESS as Address;
  const key = process.env.OWNER_PRIVATE_KEY as Hex | undefined;
  if (!key) return undefined;
  return privateKeyToAccount(key).address;
}

export const config = {
  network,
  /** HTS token id we settle in. USDC, because the warrant cap is denominated in it. */
  asset: network === "hedera:mainnet" ? HEDERA_MAINNET_USDC : HEDERA_TESTNET_USDC,
  assetDecimals: HEDERA_USDC_DECIMALS,
  facilitatorUrl: process.env.X402_FACILITATOR_URL ?? "https://api.testnet.blocky402.com",

  /** Hedera account that receives payment. */
  payTo: process.env.HEDERA_ACCOUNT_ID ?? "",
  operatorKey: process.env.HEDERA_PRIVATE_KEY ?? "",

  /** Owners permitted to issue warrants here. Empty means any valid signature. */
  allowedOwners: (process.env.OWNER_ADDRESS ?? ownerAddress() ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  port: Number(process.env.PORT ?? 8090),
  dataDir: process.env.DATA_DIR ?? path.join(process.cwd(), "data"),

  openaiKey: process.env.OPENAI_API_KEY ?? "",
  resendKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "",

  privyAppId: process.env.PRIVY_APP_ID ?? "",
  privyAppSecret: process.env.PRIVY_APP_SECRET ?? "",
} as const;

export function assertServerConfig(): void {
  const missing: string[] = [];
  if (!config.payTo) missing.push("HEDERA_ACCOUNT_ID");
  if (!config.operatorKey) missing.push("HEDERA_PRIVATE_KEY");
  if (missing.length) {
    throw new Error(
      `Cannot start: ${missing.join(", ")} not set. Copy .env.example to .env and fill them in.`,
    );
  }
}
