/**
 * The things an agent buys.
 *
 * Every handler here runs after the money has settled, so none of them contain
 * payment logic. Adding a resource to the catalogue should not mean touching
 * the payment path, and it does not.
 *
 * The one shape they share: when a purchase settles and the upstream provider
 * then fails, the response says plainly that the payment went through. A
 * caller that cannot tell those apart will retry a thing it already paid for.
 */
import { Router, type Request, type Response } from "express";
import type { Address, Hex } from "viem";
import { AGENT_HEADER, AGENT_ADDRESS_HEADER } from "../x402/server.js";
import { runInference } from "../resources/inference.js";
import { mintIdentity } from "../resources/identity.js";
import { writeMemory } from "../resources/memory.js";
import { provisionInbox, sendFromInbox, sendSealed } from "../resources/mailbox.js";
import { provisionNumber, sendSms } from "../resources/phone.js";

export const paid = Router();

/** The paying account, already proven to be the caller's during verification. */
function agentOf(req: Request): string {
  const agent = req.header(AGENT_HEADER);
  if (!agent) throw new BadRequest(`Send ${AGENT_HEADER} with the account you are paying from.`);
  return agent;
}

function agentAddressOf(req: Request): Address {
  const address = req.header(AGENT_ADDRESS_HEADER);
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new BadRequest(`Send ${AGENT_ADDRESS_HEADER} with the agent's EVM address, which this resource writes to.`);
  }
  return address as Address;
}

class BadRequest extends Error {}

/**
 * Wraps a handler so the settled/unsettled distinction is made in one place.
 * A bad request is the caller's fault and costs them nothing; anything else
 * happened after settlement and has to say so.
 */
function sold(kind: string, handler: (req: Request) => Promise<unknown>) {
  return async (req: Request, res: Response) => {
    try {
      res.json({ kind, result: await handler(req) });
    } catch (err) {
      if (err instanceof BadRequest) {
        res.status(400).json({ kind, error: err.message });
        return;
      }
      res.status(502).json({
        kind,
        error: `Payment settled, but ${kind} failed: ${(err as Error).message}`,
        settled: true,
      });
    }
  };
}

function required<T>(value: T | undefined, name: string): T {
  if (value === undefined || value === null || value === "") throw new BadRequest(`Send ${name}.`);
  return value;
}

paid.post(
  "/v1/identity/mint",
  sold("identity.mint", async (req) => {
    const { metadataURI, encryptionKey } = (req.body ?? {}) as {
      metadataURI?: string;
      encryptionKey?: Hex;
    };
    return mintIdentity({
      agent: agentAddressOf(req),
      metadataURI: metadataURI ?? "",
      encryptionKey: encryptionKey ?? "",
    });
  }),
);

paid.post(
  "/v1/inference",
  sold("inference", async (req) => {
    const { prompt, model, maxTokens } = (req.body ?? {}) as {
      prompt?: string;
      model?: string;
      maxTokens?: number;
    };
    return runInference({ prompt: required(prompt, "a prompt"), model, maxTokens });
  }),
);

paid.post(
  "/v1/email/inbox",
  sold("email.inbox", async (req) => {
    const { name } = (req.body ?? {}) as { name?: string };
    return provisionInbox({ agent: agentOf(req), localPart: required(name, "a name for the inbox") });
  }),
);

paid.post(
  "/v1/email/send",
  sold("email.send", async (req) => {
    const { from, to, subject, body } = (req.body ?? {}) as Record<string, string>;
    return sendFromInbox(agentOf(req), {
      from: required(from, "the address to send from"),
      to: required(to, "a recipient"),
      subject: required(subject, "a subject"),
      body: required(body, "a body"),
    });
  }),
);

paid.post(
  "/v1/email/sealed",
  sold("email.sealed", async (req) => {
    const { from, to, toAgent, subject, body } = (req.body ?? {}) as Record<string, string>;
    return sendSealed(agentOf(req), {
      from: required(from, "the address to send from"),
      to: required(to, "a recipient inbox"),
      toAgent: required(toAgent, "the recipient's EVM address, whose key the body is sealed to") as Address,
      subject: required(subject, "a subject"),
      body: required(body, "a body"),
    });
  }),
);

paid.post(
  "/v1/memory",
  sold("memory.write", async (req) => {
    const { content } = (req.body ?? {}) as { content?: string };
    return writeMemory({ agent: agentOf(req), content: required(content, "content to remember") });
  }),
);

paid.post(
  "/v1/phone/provision",
  sold("phone.provision", async (req) => {
    const { country } = (req.body ?? {}) as { country?: string };
    return provisionNumber(agentOf(req), country ?? "US");
  }),
);

paid.post(
  "/v1/sms",
  sold("sms.send", async (req) => {
    const { from, to, text } = (req.body ?? {}) as Record<string, string>;
    return sendSms(agentOf(req), {
      from: required(from, "a number you provisioned"),
      to: required(to, "a recipient"),
      text: required(text, "the message text"),
    });
  }),
);
