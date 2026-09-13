/**
 * A client for a Warrant service.
 *
 * The whole job is the three-step x402 exchange: call, be told the price, pay
 * and call again. `@x402/fetch` already does that if you hand it a signer, so
 * this is mostly the small honest parts around it — reading the catalogue so a
 * caller can see a price before committing, and telling the two failure modes
 * apart, because a purchase that settled and then failed upstream must never be
 * retried blind.
 *
 *   const warrant = new Warrant({ accountId: "0.0.1234", privateKey: "302e…" });
 *   const { result } = await warrant.buy("inference", { prompt: "hello" });
 */
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { ExactHederaScheme } from "@x402/hedera/exact/client";
import { createClientHederaSigner, PrivateKey } from "@x402/hedera";

/** Where the reference service lives. Point elsewhere with `baseUrl`. */
export const DEFAULT_BASE_URL = "https://warrant-api-production-e111.up.railway.app";

export type Network = "hedera:testnet" | "hedera:mainnet";

export interface WarrantOptions {
  /** The Hedera account the payments are signed from, e.g. "0.0.10514332". */
  accountId: string;
  /** That account's private key, DER or hex. Read it from the environment. */
  privateKey: string;
  baseUrl?: string;
  network?: Network;
}

/** One row of `GET /v1/catalogue`. */
export interface Offer {
  kind: string;
  title: string;
  blurb: string;
  poweredBy: string;
  method: string;
  path: string;
  /** Display price, e.g. "$0.02". */
  price: string;
  /** Atomic units of a 6-decimal token, as a string. */
  priceAtomic: string;
  live: boolean;
}

export interface Catalogue {
  asset: string;
  assetDecimals: number;
  network: string;
  payTo: string;
  facilitator: string;
  offers: Offer[];
  live: number;
}

export interface Purchase<T = unknown> {
  kind: string;
  result: T;
  /** The Hedera transaction the payment settled in, when the service reports one. */
  settlement?: string;
}

/**
 * A call that failed.
 *
 * `settled` is the field that matters. When it is true the money has already
 * moved and the resource did not arrive, so a retry buys the failure twice.
 */
export class WarrantError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly kind: string | undefined,
    /** True only when payment settled and the resource then failed. */
    readonly settled: boolean,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "WarrantError";
  }

  /** True when nothing was charged, so the call is safe to correct and repeat. */
  get free(): boolean {
    return !this.settled;
  }
}

export class Warrant {
  readonly baseUrl: string;
  readonly network: Network;
  private readonly fetch: typeof fetch;
  private readonly accountId: string;
  private catalogue?: Catalogue;

  constructor(options: WarrantOptions) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.network = options.network ?? "hedera:testnet";
    this.accountId = options.accountId;

    const signer = createClientHederaSigner(options.accountId, parseKey(options.privateKey), {
      network: this.network,
    });
    const client = new x402Client().register(this.network, new ExactHederaScheme(signer));
    this.fetch = wrapFetchWithPayment(fetch, client);
  }

  /** What is for sale, and at what price. Free, and cached for this instance. */
  async offers(refresh = false): Promise<Catalogue> {
    if (!this.catalogue || refresh) {
      this.catalogue = await this.read<Catalogue>("/v1/catalogue");
    }
    return this.catalogue;
  }

  /** One offer by kind, or undefined when this service does not sell it. */
  async offer(kind: string): Promise<Offer | undefined> {
    return (await this.offers()).offers.find((o) => o.kind === kind);
  }

  /**
   * Buys one call of `kind`.
   *
   * The endpoint and the method come from the catalogue rather than from a
   * table in here, so a service that moves a path or adds a resource does not
   * need this package republished to stay usable.
   */
  async buy<T = unknown>(kind: string, body: Record<string, unknown> = {}, agentAddress?: string): Promise<Purchase<T>> {
    const offer = await this.offer(kind);
    if (!offer) {
      const selling = (await this.offers()).offers.map((o) => o.kind).join(", ");
      throw new WarrantError(`${this.baseUrl} does not sell "${kind}". It sells: ${selling}.`, 404, kind, false, undefined);
    }

    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-agent": this.accountId,
    };
    // Only resources that write to a contract need it, and only the caller
    // knows the address, so it is passed rather than guessed.
    if (agentAddress) headers["x-agent-address"] = agentAddress;

    const response = await this.fetch(`${this.baseUrl}${offer.path}`, {
      method: offer.method,
      headers,
      body: JSON.stringify(body),
    });

    const payload = await json(response);
    if (!response.ok) throw errorFrom(response, payload, kind);

    const settlement = settlementFrom(response);
    return { ...(payload as Purchase<T>), ...(settlement ? { settlement } : {}) };
  }

  /** Any free endpoint, e.g. "/v1/receipts?limit=5" or "/v1/agents/0.0.1234". */
  async read<T = unknown>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`);
    const payload = await json(response);
    if (!response.ok) throw errorFrom(response, payload, undefined);
    return payload as T;
  }
}

/** Accepts a DER key or a raw hex one, because both are in circulation. */
function parseKey(key: string): PrivateKey {
  const trimmed = key.trim();
  return trimmed.startsWith("302")
    ? PrivateKey.fromStringDer(trimmed)
    : PrivateKey.fromStringECDSA(trimmed.replace(/^0x/, ""));
}

async function json(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorFrom(response: Response, payload: unknown, fallbackKind: string | undefined): WarrantError {
  const body = (payload ?? {}) as { error?: string; kind?: string; settled?: boolean; hint?: string };
  const settled = body.settled === true;
  const message =
    body.error ??
    body.hint ??
    (response.status === 402
      ? "Payment was required and none was accepted. Check the account holds USDC."
      : `${response.status} from ${response.url}`);
  return new WarrantError(message, response.status, body.kind ?? fallbackKind, settled, payload);
}

/** The settlement reference the service returns beside a successful purchase. */
function settlementFrom(response: Response): string | undefined {
  const header = response.headers.get("payment-response");
  if (!header) return undefined;
  try {
    const decoded = JSON.parse(Buffer.from(header, "base64").toString("utf8")) as Record<string, unknown>;
    const ref = decoded.transaction ?? decoded.settlement ?? decoded.txHash;
    return typeof ref === "string" ? ref : undefined;
  } catch {
    return undefined;
  }
}
