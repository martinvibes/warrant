/**
 * The specification, written from the catalogue rather than beside it.
 *
 * A hand-kept OpenAPI document is a fourth place prices live, and the fourth
 * place is always the one that goes stale. This builds the paid half of the
 * document from the same list the middleware charges from, so a price can only
 * be wrong here if it is wrong everywhere.
 *
 * The 402 responses are described rather than hidden. A machine reading this
 * should be able to see that payment is part of the protocol and not an error
 * it has hit by mistake.
 */
import { CATALOGUE, config, moneyFor, type Offer } from "./config.js";

const AGENT_HEADER = "x-agent";
const AGENT_ADDRESS_HEADER = "x-agent-address";

type Schema = Record<string, unknown>;

function object(properties: Record<string, Schema>, required: string[] = []): Schema {
  return { type: "object", properties, ...(required.length ? { required } : {}) };
}

const str = (description: string, example?: string): Schema => ({
  type: "string",
  description,
  ...(example === undefined ? {} : { example }),
});

/** What each paid endpoint takes, keyed by the kind that sells it. */
const REQUESTS: Record<string, Schema> = {
  "identity.mint": object(
    {
      metadataURI: str("Optional URI describing the agent.", "ipfs://bafy…"),
      encryptionKey: str(
        "The agent's secp256k1 messaging key, 0x-prefixed and without the 0x04 prefix byte. Other agents seal mail to it. Deliberately not the key the agent signs payments with.",
      ),
    },
    [],
  ),
  inference: object(
    {
      prompt: str("What to ask the model.", "Summarise this ticket in two sentences."),
      model: str("Model name. Defaults to gpt-4o-mini.", "gpt-4o-mini"),
      maxTokens: { type: "integer", description: "Capped at 2048.", example: 512 },
    },
    ["prompt"],
  ),
  "email.inbox": object(
    { name: str("Local part of the address to provision.", "atlas") },
    ["name"],
  ),
  "email.send": object(
    {
      from: str("An address this agent provisioned.", "atlas@example.com"),
      to: str("Recipient.", "someone@example.com"),
      subject: str("Subject line."),
      body: str("Plain text body."),
    },
    ["from", "to", "subject", "body"],
  ),
  "email.sealed": object(
    {
      from: str("An address this agent provisioned."),
      to: str("Recipient inbox."),
      toAgent: str("The recipient's EVM address, whose on-chain key the body is sealed to.", "0x…"),
      subject: str("Subject line. Not encrypted."),
      body: str("Plain text. Encrypted before it leaves; this service cannot read it."),
    },
    ["from", "to", "toAgent", "subject", "body"],
  ),
  "memory.write": object(
    { content: str("What to remember. Written to the Hedera File Service, permanently.") },
    ["content"],
  ),
  "phone.provision": object({
    country: str("ISO country code. Defaults to US.", "US"),
    phoneNumber: str("A specific number from /v1/phone/search, if you want one."),
  }),
  "sms.send": object(
    {
      from: str("A number this agent provisioned.", "+15551230000"),
      to: str("Recipient in E.164.", "+15559870000"),
      text: str("Message body."),
    },
    ["from", "to", "text"],
  ),
};

function paidOperation(offer: Offer): Schema {
  const price = moneyFor(offer.price);
  return {
    operationId: offer.kind.replace(/\./g, "_"),
    summary: `${offer.title} — ${price} per call`,
    description: `${offer.blurb}\n\nPaid per call over x402. An unpaid request answers 402 with the terms; repeat it with a \`payment-signature\` header and the resource is delivered. Powered by ${offer.poweredBy}.`,
    tags: ["Paid resources"],
    parameters: [
      {
        name: AGENT_HEADER,
        in: "header",
        required: true,
        description: "The Hedera account the agent pays from.",
        schema: { type: "string", example: "0.0.10514332" },
      },
      {
        name: AGENT_ADDRESS_HEADER,
        in: "header",
        required: offer.kind === "identity.mint",
        description: "The agent's EVM address, for resources that write to a contract.",
        schema: { type: "string", example: "0x7d141bf9320F8797184ebd65E1Fb746a440d33cC" },
      },
    ],
    requestBody: {
      required: true,
      content: { "application/json": { schema: REQUESTS[offer.kind] ?? object({}) } },
    },
    responses: {
      "200": {
        description: "Paid and delivered.",
        content: {
          "application/json": {
            schema: object({ kind: str("The resource sold.", offer.kind), result: { type: "object" } }),
          },
        },
      },
      "400": {
        description: "The request was malformed. Nothing was charged.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
      "402": {
        description: `Payment required: ${price} in ${config.asset} on ${config.network}. Terms are in the payment-required header.`,
        headers: {
          "payment-required": {
            description: "Base64 x402 payment requirements, including the sponsoring fee payer.",
            schema: { type: "string" },
          },
        },
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
      "409": {
        description:
          "Refused before settlement, because the purchase is already known to be impossible. Nothing was charged.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
      "502": {
        description:
          "Payment settled but the provider failed. The body says so explicitly, so a caller does not retry something it already paid for.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
    },
  };
}

function freeOperation(
  operationId: string,
  summary: string,
  description: string,
  extras: { parameters?: Schema[] } = {},
): Schema {
  return {
    operationId,
    summary,
    description,
    tags: ["Free reads"],
    ...(extras.parameters ? { parameters: extras.parameters } : {}),
    responses: {
      "200": { description: summary, content: { "application/json": { schema: { type: "object" } } } },
    },
  };
}

const pathParam = (name: string, description: string, example: string): Schema => ({
  name,
  in: "path",
  required: true,
  description,
  schema: { type: "string", example },
});

const queryParam = (name: string, description: string): Schema => ({
  name,
  in: "query",
  required: false,
  description,
  schema: { type: "string" },
});

/** The whole document, built fresh so a price change needs no second edit. */
export function openapi(): Schema {
  const paths: Record<string, Schema> = {
    "/health": {
      get: freeOperation("health", "Liveness and settlement configuration", "What this service is selling and where it settles."),
    },
    "/v1/catalogue": {
      get: freeOperation(
        "catalogue",
        "Everything for sale, and the price",
        "The same list the payment middleware charges from. Read it before paying anything.",
      ),
    },
    "/v1/contracts": {
      get: freeOperation(
        "contracts",
        "Deployed contracts and the receipt issuer",
        "Addresses on Hedera, plus the key a receipt's signature must recover to. Public by design: checking a receipt should not require asking us anything.",
      ),
    },
    "/v1/purchases": {
      get: freeOperation("purchases", "Everything bought here, newest first", "An audit surface that requires a login is not an audit surface.", {
        parameters: [queryParam("agent", "Filter to one agent's account."), queryParam("limit", "Up to 500.")],
      }),
    },
    "/v1/receipts": {
      get: freeOperation("receipts", "Signed receipts", "Each one is checkable without trusting this service.", {
        parameters: [
          queryParam("settlement", "Look up the receipt issued against one x402 settlement."),
          queryParam("agent", "Filter to one agent."),
          queryParam("limit", "Up to 200."),
        ],
      }),
    },
    "/v1/receipts/{id}": {
      get: freeOperation("receipt", "One receipt, in the form it was signed in", "Public, because a receipt whose holder must authenticate to show it proves nothing to a third party.", {
        parameters: [pathParam("id", "Receipt id.", "rcpt_…")],
      }),
    },
    "/v1/stats": { get: freeOperation("stats", "Totals across every purchase", "How much has been sold, and to how many agents.") },
    "/v1/agents/{agent}": {
      get: freeOperation("agent", "One agent's record", "What it bought and what it now owns.", {
        parameters: [pathParam("agent", "Hedera account id.", "0.0.10514332")],
      }),
    },
    "/v1/email/inbox/{address}": {
      get: freeOperation("inbox", "An inbox's mail", "Sealed bodies come back sealed; nothing here can open them.", {
        parameters: [pathParam("address", "A provisioned address.", "atlas@example.com")],
      }),
    },
    "/v1/memory/{fileId}": {
      get: freeOperation("memory", "Read a memory", "Reading a Hedera file is a query, not a transaction, so it is free.", {
        parameters: [pathParam("fileId", "Hedera file id.", "0.0.12345")],
      }),
    },
    "/v1/phone/search": {
      get: freeOperation("phoneSearch", "Numbers available to buy", "Free, because a price list nobody can read is not a price list. Ordering one is the paid step.", {
        parameters: [
          queryParam("country", "ISO country code."),
          queryParam("area", "Area code."),
          queryParam("contains", "Digits the number should contain."),
          queryParam("limit", "How many to return."),
        ],
      }),
    },
  };

  for (const offer of CATALOGUE) {
    if (!offer.live) continue;
    paths[offer.path] = { post: paidOperation(offer) };
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "Warrant",
      version: "1.0.0",
      summary: "Resources an agent can buy for itself, priced per call and paid in stablecoin.",
      description: [
        "Warrant sells the things an agent needs to act in the world — an identity, inference, memory, an email address, a phone number — one call at a time, settled in USDC on Hedera over x402.",
        "",
        "There is no API key and no account to open. A request without payment answers 402 with the terms; sign them and repeat the request and the resource is delivered. The network fee is sponsored by the facilitator, so a buyer needs stablecoin and no HBAR at all.",
        "",
        "What stops an agent spending is a contract, not a database. Its ceiling is set once by a human and enforced on chain; when it is reached the chain refuses and the agent waits.",
      ].join("\n"),
      license: { name: "MIT" },
    },
    servers: [{ url: config.publicUrl, description: "Warrant" }],
    tags: [
      { name: "Paid resources", description: "Priced per call, settled over x402 before the handler runs." },
      { name: "Free reads", description: "Prices, receipts and the audit trail. No payment, no credentials." },
    ],
    paths,
    components: {
      schemas: {
        Error: object({
          kind: str("The resource this concerns."),
          error: str("What went wrong, in words."),
          charged: { type: "boolean", description: "Present when the refusal happened before any money moved." },
          settled: { type: "boolean", description: "Present when payment went through but the provider did not." },
        }),
      },
    },
    "x-x402": {
      version: 2,
      network: config.network,
      asset: config.asset,
      assetDecimals: config.assetDecimals,
      payTo: config.payTo,
      facilitator: config.facilitatorUrl,
      challengeHeader: "payment-required",
      paymentHeader: "payment-signature",
      settlementHeader: "payment-response",
    },
  };
}
