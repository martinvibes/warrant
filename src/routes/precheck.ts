/**
 * Refusing before the money moves.
 *
 * x402 settles a payment before the resource runs, which is the right order
 * for almost everything: the service cannot know whether an inference will be
 * useful or a mail will bounce, so it charges for the attempt and says plainly
 * when the attempt failed.
 *
 * A few purchases are different. Whether an agent already holds an identity is
 * a fact sitting on chain before anyone pays, so selling a second one is
 * taking money for something that cannot be delivered. This runs ahead of the
 * payment middleware and answers in words.
 *
 * The same check exists again inside the payment flow, in x402/server.ts,
 * because a caller that omits the address header reaches that one instead.
 * There it can only abort with a code; here it can explain.
 */
import { Router } from "express";
import type { Address } from "viem";
import { config } from "../config.js";
import { identityOf } from "../resources/identity.js";
import { AGENT_ADDRESS_HEADER } from "../x402/server.js";

export const precheck = Router();

precheck.post("/v1/identity/mint", async (req, res, next) => {
  if (!config.identityContract) return next();
  const address = req.header(AGENT_ADDRESS_HEADER);
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) return next();

  try {
    const existing = await identityOf(address as Address);
    if (existing === 0n) return next();
    res.status(409).json({
      kind: "identity.mint",
      error: `${address} already holds identity #${existing}. An agent gets one, permanently.`,
      charged: false,
      tokenId: existing.toString(),
      explorer: `https://hashscan.io/${config.hederaNetwork}/contract/${config.identityContract}`,
    });
  } catch {
    // A chain we cannot reach is not grounds to refuse a sale. The payment
    // flow's own check, and then the resource itself, will catch it.
    next();
  }
});
