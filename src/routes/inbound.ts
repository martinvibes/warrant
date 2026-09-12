/**
 * Mail arriving for an agent.
 *
 * This is the half that makes an agent a correspondent rather than a
 * broadcaster. The provider posts here when something lands, and the message
 * is filed against the inbox the agent bought.
 *
 * The endpoint is unpriced because the agent already paid for the inbox, and
 * charging on delivery would let anyone on the internet run up its bill by
 * mailing it.
 */
import { Router } from "express";
import crypto from "node:crypto";
import { receiveInbound } from "../resources/mailbox.js";

export const inbound = Router();

/** Shapes a provider might post. Only the four fields below are used. */
interface InboundPayload {
  type?: string;
  data?: Record<string, unknown>;
  to?: unknown;
  from?: unknown;
  subject?: unknown;
  text?: unknown;
  html?: unknown;
}

function firstAddress(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length) return firstAddress(value[0]);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.address === "string") return record.address;
    if (typeof record.email === "string") return record.email;
  }
  return "";
}

/**
 * Verifies the provider's signature when a secret is configured.
 *
 * Without it anyone could post mail into any agent's inbox, which would make
 * everything an agent reads untrustworthy. Constant-time comparison, because a
 * signature check that leaks timing is not a signature check.
 */
function signatureOk(raw: string, header: string | undefined, secret: string): boolean {
  if (!header) return false;
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const given = Buffer.from(header.replace(/^sha256=/, ""), "utf8");
  const mine = Buffer.from(expected, "utf8");
  return given.length === mine.length && crypto.timingSafeEqual(given, mine);
}

inbound.post("/v1/email/inbound", (req, res) => {
  const secret = process.env.EMAIL_WEBHOOK_SECRET ?? "";
  if (secret) {
    const raw = JSON.stringify(req.body ?? {});
    const header = req.header("svix-signature") ?? req.header("x-webhook-signature") ?? undefined;
    if (!signatureOk(raw, header, secret)) {
      res.status(401).json({ error: "The webhook signature did not verify." });
      return;
    }
  }

  const payload = (req.body ?? {}) as InboundPayload;
  const source = (payload.data ?? payload) as InboundPayload;

  const to = firstAddress(source.to);
  if (!to) {
    res.status(400).json({ error: "The payload named no recipient." });
    return;
  }

  const result = receiveInbound({
    to,
    from: firstAddress(source.from) || "unknown",
    subject: typeof source.subject === "string" ? source.subject : "(no subject)",
    body:
      typeof source.text === "string"
        ? source.text
        : typeof source.html === "string"
          ? source.html
          : "",
  });

  // An address nobody bought is not an error worth retrying, so it answers 200
  // with delivered:false rather than making the provider back off and repeat.
  res.json(result);
});
