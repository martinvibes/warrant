import "dotenv/config";
import path from "node:path";
import { HEDERA_TESTNET_USDC, HEDERA_MAINNET_USDC, HEDERA_USDC_DECIMALS } from "@x402/hedera";
import type { Address, Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

/**
 * The catalogue.
 *
 * One list, read by three things that must not disagree: the x402 middleware
 * that prices each route, the deploy script that publishes the same prices on
 * chain, and the page that shows a buyer what is for sale. Keeping them in
 * separate files is how a service ends up advertising a price it will not
 * honour.
 */
export interface Offer {
  /** Kind name, hashed on chain to index the listing. */
  kind: string;
  method: "POST" | "GET";
  path: string;
  /** Price of one call, in the smallest unit of the settlement asset. */
  price: bigint;
  title: string;
  blurb: string;
  poweredBy: string;
  /**
   * Whether this is wired to a real provider. Anything false is not listed and
   * not sold; saying "in dev" on a page and charging for it anyway is worse
   * than not offering it.
   */
  live: boolean;
}

/** Six decimals, so a cent is 10_000 atomic units. */
const CENT = 10_000n;

function priced(envVar: string, fallbackCents: bigint): bigint {
  const raw = process.env[envVar];
  return raw ? BigInt(raw) : fallbackCents * CENT;
}

export const CATALOGUE: readonly Offer[] = [
  {
    kind: "identity.mint",
    method: "POST",
    path: "/v1/identity/mint",
    price: priced("PRICE_IDENTITY_MINT", 10n),
    title: "Agent Identity",
    blurb:
      "A soulbound token on Hedera that is the agent's permanent name, plus the public key other agents seal mail to.",
    poweredBy: "Hedera EVM · ERC-721",
    live: true,
  },
  {
    kind: "inference",
    method: "POST",
    path: "/v1/inference",
    price: priced("PRICE_INFERENCE", 2n),
    title: "AI Inference",
    blurb: "Pay-per-call language model inference. Returns an OpenAI-shaped completion.",
    poweredBy: "OpenAI",
    live: true,
  },
  {
    kind: "email.inbox",
    method: "POST",
    path: "/v1/email/inbox",
    price: priced("PRICE_EMAIL_INBOX", 100n),
    title: "Email Inbox",
    blurb:
      "A dedicated address the agent owns. Inbound mail is parsed and held, so the agent can read its own replies.",
    poweredBy: "Resend",
    live: true,
  },
  {
    kind: "email.send",
    method: "POST",
    path: "/v1/email/send",
    price: priced("PRICE_EMAIL_SEND", 20n),
    title: "Send Email",
    blurb: "Ordinary mail to any address, sent from the agent's own inbox.",
    poweredBy: "Resend",
    live: true,
  },
  {
    kind: "email.sealed",
    method: "POST",
    path: "/v1/email/sealed",
    price: priced("PRICE_EMAIL_SEALED", 25n),
    title: "Sealed Email",
    blurb:
      "Agent-to-agent mail encrypted to the recipient's on-chain key. This service relays the ciphertext and cannot read it.",
    poweredBy: "secp256k1 ECIES · Resend",
    live: true,
  },
  {
    kind: "memory.write",
    method: "POST",
    path: "/v1/memory",
    price: priced("PRICE_MEMORY_WRITE", 5n),
    title: "Memory",
    blurb:
      "Durable agent memory written to the Hedera File Service. Write once, read forever, addressed by file id.",
    poweredBy: "Hedera File Service",
    live: true,
  },
  {
    kind: "phone.provision",
    method: "POST",
    path: "/v1/phone/provision",
    price: priced("PRICE_PHONE", 50n),
    title: "Phone Number",
    blurb: "A real number the agent owns, in any of 170+ countries.",
    poweredBy: "Telnyx",
    live: process.env.TELNYX_API_KEY ? true : false,
  },
  {
    kind: "sms.send",
    method: "POST",
    path: "/v1/sms",
    price: priced("PRICE_SMS", 1n),
    title: "Send SMS",
    blurb: "Text anywhere in the world from a number the agent provisioned.",
    poweredBy: "Telnyx",
    live: process.env.TELNYX_API_KEY ? true : false,
  },
] as const;

export const LIVE_CATALOGUE = CATALOGUE.filter((o) => o.live);

export type ResourceKind = (typeof CATALOGUE)[number]["kind"];

const BY_KIND = new Map(CATALOGUE.map((o) => [o.kind, o]));
const BY_ROUTE = new Map(CATALOGUE.map((o) => [`${o.method} ${o.path}`, o]));

export function offerFor(kind: string): Offer | undefined {
  return BY_KIND.get(kind);
}

export function offerForRoute(method: string, path: string): Offer | undefined {
  return BY_ROUTE.get(`${method.toUpperCase()} ${path}`);
}

/** An atomic price as the x402 Money string the payment terms carry. */
export function moneyFor(price: bigint): `$${string}` {
  const scale = 10n ** BigInt(HEDERA_USDC_DECIMALS);
  const whole = price / scale;
  const frac = (price % scale).toString().padStart(HEDERA_USDC_DECIMALS, "0").replace(/0+$/, "");
  return `$${whole}${frac ? "." + frac : ""}` as `$${string}`;
}

const network = process.env.HEDERA_NETWORK ?? "hedera:testnet";
if (network !== "hedera:testnet" && network !== "hedera:mainnet") {
  throw new Error(`HEDERA_NETWORK must be hedera:testnet or hedera:mainnet, got ${network}`);
}

function ownerAddress(): Address | undefined {
  if (process.env.OWNER_ADDRESS) return process.env.OWNER_ADDRESS as Address;
  const key = process.env.OWNER_PRIVATE_KEY as Hex | undefined;
  return key ? privateKeyToAccount(key).address : undefined;
}

export const config = {
  network,
  /** Short form the Hedera SDK and the mirror node want. */
  hederaNetwork: network === "hedera:mainnet" ? "mainnet" : "testnet",
  /**
   * EVM chain id for the contracts. Overridable so the same code can be run
   * against a local chain, which is how the on-chain flow is tested without
   * spending testnet funds.
   */
  chainId: Number(process.env.EVM_CHAIN_ID ?? (network === "hedera:mainnet" ? 295 : 296)),
  jsonRpcUrl:
    process.env.HEDERA_JSON_RPC_URL ??
    (network === "hedera:mainnet" ? "https://mainnet.hashio.io/api" : "https://testnet.hashio.io/api"),

  /** HTS token settlement is denominated in. */
  asset: network === "hedera:mainnet" ? HEDERA_MAINNET_USDC : HEDERA_TESTNET_USDC,
  assetDecimals: HEDERA_USDC_DECIMALS,
  facilitatorUrl: process.env.X402_FACILITATOR_URL ?? "https://api.testnet.blocky402.com",

  /** Hedera account that receives payment and pays for file writes. */
  payTo: process.env.HEDERA_ACCOUNT_ID ?? "",
  operatorKey: process.env.HEDERA_PRIVATE_KEY ?? "",

  /** Deployed contract addresses, filled in after the deploy script runs. */
  identityContract: (process.env.IDENTITY_CONTRACT ?? "") as Address | "",
  marketContract: (process.env.MARKET_CONTRACT ?? "") as Address | "",
  treasuryContract: (process.env.TREASURY_CONTRACT ?? "") as Address | "",
  /** Key that signs contract writes the service makes on a buyer's behalf. */
  servicePrivateKey: (process.env.SERVICE_PRIVATE_KEY ?? "") as Hex | "",

  port: Number(process.env.PORT ?? 8090),
  dataDir: process.env.DATA_DIR ?? path.join(process.cwd(), "data"),
  publicUrl: process.env.PUBLIC_URL ?? `http://localhost:${Number(process.env.PORT ?? 8090)}`,

  openaiKey: process.env.OPENAI_API_KEY ?? "",
  resendKey: process.env.RESEND_API_KEY ?? "",
  emailDomain: process.env.EMAIL_DOMAIN ?? "",
  telnyxKey: process.env.TELNYX_API_KEY ?? "",
  telnyxProfileId: process.env.TELNYX_MESSAGING_PROFILE_ID ?? "",

  ownerAddress: ownerAddress(),
  /**
   * Privy holds the agent's signing key. The authorization key below is the
   * private half of a keypair generated on this machine; Privy only ever saw
   * the public half, registered as a quorum that owns the wallet.
   */
  privyAppId: process.env.PRIVY_APP_ID ?? "",
  privyAppSecret: process.env.PRIVY_APP_SECRET ?? "",
  privyAuthKeyId: process.env.PRIVY_AUTH_KEY_ID ?? "",
  privyAuthPrivateKey: process.env.PRIVY_AUTH_PRIVATE_KEY ?? "",
  privyWalletId: process.env.PRIVY_WALLET_ID ?? "",
  privyWalletAddress: (process.env.PRIVY_WALLET_ADDRESS ?? "") as Address | "",
  privyWalletPublicKey: process.env.PRIVY_WALLET_PUBLIC_KEY ?? "",
  privyPolicyId: process.env.PRIVY_POLICY_ID ?? "",
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
