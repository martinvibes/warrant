/**
 * The catalogue, expressed as things the agent can decide to do.
 *
 * The schemas are hand-written rather than generated from the catalogue
 * because the model needs to know what each field means, not just its type. A
 * generated schema produces an agent that technically calls the right endpoint
 * with the wrong content.
 */
import type { Offer } from "../config.js";

export interface ToolSpec {
  kind: string;
  description: string;
  parameters: Record<string, unknown>;
}

const SPECS: Record<string, Omit<ToolSpec, "kind">> = {
  "identity.mint": {
    description:
      "Mint this agent's permanent on-chain identity. Do this once, before anything that needs other agents to recognise it. Publishing an encryption key also lets other agents send it sealed mail.",
    parameters: {
      type: "object",
      properties: {
        metadataURI: { type: "string", description: "A URL describing the agent. May be empty." },
      },
      required: [],
    },
  },
  inference: {
    description:
      "Ask a language model a question. Use this for reasoning, summarising, drafting or extracting, not for anything you already know.",
    parameters: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "The full question, with any context the model needs." },
      },
      required: ["prompt"],
    },
  },
  "email.inbox": {
    description:
      "Buy an email address this agent owns and can receive replies at. Needed before sending anything, because mail is sent from an address you own.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The part before the @. Lowercase letters, digits and hyphens, 3 to 32 characters.",
        },
      },
      required: ["name"],
    },
  },
  "email.send": {
    description: "Send ordinary email from an address this agent already owns.",
    parameters: {
      type: "object",
      properties: {
        from: { type: "string", description: "An address this agent provisioned." },
        to: { type: "string", description: "The recipient." },
        subject: { type: "string" },
        body: { type: "string" },
      },
      required: ["from", "to", "subject", "body"],
    },
  },
  "email.sealed": {
    description:
      "Send email encrypted to another agent's on-chain key, so no service in the middle can read it. Only works when the recipient has published a key by minting an identity.",
    parameters: {
      type: "object",
      properties: {
        from: { type: "string", description: "An address this agent provisioned." },
        to: { type: "string", description: "The recipient agent's inbox address." },
        toAgent: { type: "string", description: "The recipient agent's EVM address, 0x-prefixed." },
        subject: { type: "string" },
        body: { type: "string", description: "Plaintext. It is encrypted before it leaves this machine's request." },
      },
      required: ["from", "to", "toAgent", "subject", "body"],
    },
  },
  "memory.write": {
    description:
      "Write something to permanent storage on Hedera. Use it for conclusions worth keeping, not for working notes. It cannot be edited or deleted afterwards, by anyone.",
    parameters: {
      type: "object",
      properties: {
        content: { type: "string", description: "What to remember. Under 4096 bytes." },
      },
      required: ["content"],
    },
  },
  "phone.provision": {
    description: "Buy a real phone number this agent owns, capable of sending SMS.",
    parameters: {
      type: "object",
      properties: {
        country: { type: "string", description: "Two-letter country code, for example US or GB." },
      },
      required: [],
    },
  },
  "sms.send": {
    description: "Send a text message from a number this agent already owns.",
    parameters: {
      type: "object",
      properties: {
        from: { type: "string", description: "A number this agent provisioned, in E.164 form." },
        to: { type: "string", description: "The recipient, in E.164 form." },
        text: { type: "string" },
      },
      required: ["from", "to", "text"],
    },
  },
};

/** A tool name the model can call. Dots are not allowed in the API's names. */
export function toolNameFor(kind: string): string {
  return kind.replace(/\./g, "_");
}

export function kindForToolName(name: string): string {
  return name.replace(/_/g, ".");
}

export function toolsFor(offers: readonly Offer[], priceLabel: (o: Offer) => string) {
  return offers
    .filter((offer) => SPECS[offer.kind])
    .map((offer) => {
      const spec = SPECS[offer.kind];
      return {
        type: "function" as const,
        function: {
          name: toolNameFor(offer.kind),
          // The price is in the description because the agent is spending real
          // money and should be able to weigh one purchase against another.
          description: `${spec.description} Costs ${priceLabel(offer)} per call.`,
          parameters: spec.parameters,
        },
      };
    });
}
