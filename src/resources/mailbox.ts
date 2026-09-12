/**
 * Inboxes an agent owns.
 *
 * Sending mail is the easy half and every service does it. The half that makes
 * an agent an actual correspondent is receiving, because an agent that cannot
 * read the reply cannot hold a conversation, chase an invoice, or confirm
 * anything. So provisioning an address and keeping what arrives for it are
 * treated here as the product, and sending is a thing you do with an address
 * you already own.
 */
import { Resend } from "resend";
import { config } from "../config.js";
import { createInbox, deliver, getInbox, inboxesOf, localPartTaken, readInbox } from "../store/db.js";
import { seal, type SealedEnvelope } from "./seal.js";
import { encryptionKeyFor } from "./identity.js";
import type { Address } from "viem";

let client: Resend | undefined;

function resend(): Resend {
  if (!client) {
    if (!config.resendKey) throw new Error("RESEND_API_KEY is not set, so email cannot be sold.");
    client = new Resend(config.resendKey);
  }
  return client;
}

/** Lowercase, alphanumeric and hyphens: what a mail local part may safely be. */
const LOCAL_PART = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;

export interface ProvisionRequest {
  /** The agent taking ownership, as a Hedera account id or EVM address. */
  agent: string;
  /** The part before the @. Taken as given, never rewritten to something free. */
  localPart: string;
}

export interface Inbox {
  address: string;
  agent: string;
  createdAt: string;
}

export function provisionInbox(req: ProvisionRequest): Inbox {
  if (!config.emailDomain) {
    throw new Error("EMAIL_DOMAIN is not set, so there is no domain to hand out addresses on.");
  }
  const local = req.localPart.trim().toLowerCase();
  if (!LOCAL_PART.test(local)) {
    throw new Error(
      `"${req.localPart}" cannot be an address. Use 3 to 32 characters: lowercase letters, digits and hyphens, not starting or ending with a hyphen.`,
    );
  }
  if (localPartTaken(local)) {
    // Silently allocating a different name would hand the agent an address it
    // did not ask for and will not remember.
    throw new Error(`${local}@${config.emailDomain} is taken. Choose another name.`);
  }

  const row = createInbox({ address: `${local}@${config.emailDomain}`, agent: req.agent, local_part: local });
  return { address: row.address, agent: row.agent, createdAt: new Date(row.created_at).toISOString() };
}

export function inboxesFor(agent: string): Inbox[] {
  return inboxesOf(agent).map((r) => ({
    address: r.address,
    agent: r.agent,
    createdAt: new Date(r.created_at).toISOString(),
  }));
}

export interface SendRequest {
  /** An address this agent provisioned. Sending from one it does not own is refused. */
  from: string;
  to: string;
  subject: string;
  body: string;
}

export interface SendResult {
  providerId: string;
  from: string;
  to: string;
}

function requireOwned(address: string, agent: string): void {
  const inbox = getInbox(address);
  if (!inbox) throw new Error(`${address} is not an inbox on this service.`);
  if (inbox.agent !== agent) {
    throw new Error(`${address} belongs to another agent. Send from an address you provisioned.`);
  }
}

export async function sendFromInbox(agent: string, req: SendRequest): Promise<SendResult> {
  requireOwned(req.from.toLowerCase(), agent);

  const { data, error } = await resend().emails.send({
    from: req.from,
    to: req.to,
    subject: req.subject,
    text: req.body,
  });
  if (error) throw new Error(`the email provider refused the message: ${error.message}`);

  return { providerId: data?.id ?? "", from: req.from, to: req.to };
}

export interface SealedSendRequest {
  from: string;
  /** Recipient's inbox on this service. */
  to: string;
  /** Recipient's EVM address, whose published key the body is sealed to. */
  toAgent: Address;
  subject: string;
  /** Plaintext. It is encrypted before it touches the provider. */
  body: string;
}

export interface SealedSendResult {
  providerId: string;
  from: string;
  to: string;
  sealedTo: Address;
  algorithm: SealedEnvelope["algorithm"];
}

/**
 * Sends mail only the recipient agent can read.
 *
 * The recipient's key comes from the identity contract rather than from the
 * request, so the sender cannot be talked into sealing to a key an attacker
 * supplied. That check is the entire security of this feature.
 */
export async function sendSealed(agent: string, req: SealedSendRequest): Promise<SealedSendResult> {
  requireOwned(req.from.toLowerCase(), agent);

  const key = await encryptionKeyFor(req.toAgent);
  if (!key || key === "0x") {
    throw new Error(
      `${req.toAgent} has not published an encryption key, so nothing can be sealed to it. It needs to mint an identity with a key first.`,
    );
  }

  const envelope = seal(key, req.body);
  const payload = JSON.stringify(envelope, null, 2);

  const { data, error } = await resend().emails.send({
    from: req.from,
    to: req.to,
    subject: req.subject,
    text: payload,
  });
  if (error) throw new Error(`the email provider refused the message: ${error.message}`);

  // Stored as it was sent. This service holds no private key, so the copy in
  // the database is as unreadable to us as the one in transit.
  deliver({ address: req.to.toLowerCase(), sender: req.from, subject: req.subject, body: payload, sealed: 1 });

  return {
    providerId: data?.id ?? "",
    from: req.from,
    to: req.to,
    sealedTo: req.toAgent,
    algorithm: envelope.algorithm,
  };
}

export interface InboundMessage {
  to: string;
  from: string;
  subject: string;
  body: string;
}

/** Records mail that arrived, so the agent can read its own replies. */
export function receiveInbound(msg: InboundMessage): { delivered: boolean; address: string } {
  const address = msg.to.toLowerCase();
  if (!getInbox(address)) return { delivered: false, address };

  // A body that parses as an envelope is marked sealed so a reader knows to
  // decrypt rather than to squint at base64.
  let sealed = 0;
  try {
    const parsed = JSON.parse(msg.body) as Partial<SealedEnvelope>;
    if (parsed.algorithm && parsed.ciphertext && parsed.ephemeralPublicKey) sealed = 1;
  } catch {
    /* ordinary mail */
  }

  deliver({ address, sender: msg.from, subject: msg.subject, body: msg.body, sealed });
  return { delivered: true, address };
}

export function messagesFor(address: string, limit = 50) {
  return readInbox(address.toLowerCase(), limit).map((m) => ({
    id: m.id,
    from: m.sender,
    subject: m.subject,
    body: m.body,
    sealed: m.sealed === 1,
    receivedAt: new Date(m.created_at).toISOString(),
  }));
}
