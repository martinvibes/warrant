/**
 * The things an agent actually buys.
 *
 * Every handler in here runs only after the gate allowed the purchase, the
 * payer was bound to the warrant, and the payment settled. So these read as
 * ordinary handlers with no payment logic in them at all, which is the point:
 * adding a new resource to the catalogue should not mean touching the
 * enforcement path.
 */
import { Router } from "express";
import { runInference } from "../resources/inference.js";
import { sendEmail } from "../resources/email.js";

export const paid = Router();

paid.post("/v1/inference", async (req, res) => {
  const { prompt, model, maxTokens } = (req.body ?? {}) as {
    prompt?: string;
    model?: string;
    maxTokens?: number;
  };
  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "Send a prompt: { \"prompt\": \"…\" }." });
    return;
  }
  try {
    res.json({ resource: "inference", result: await runInference({ prompt, model, maxTokens }) });
  } catch (err) {
    // The purchase settled, so say plainly that the upstream failed rather than
    // implying the payment did.
    res.status(502).json({
      error: `Payment settled, but the inference provider failed: ${(err as Error).message}`,
      resource: "inference",
      settled: true,
    });
  }
});

paid.post("/v1/email/send", async (req, res) => {
  const { to, subject, body } = (req.body ?? {}) as {
    to?: string;
    subject?: string;
    body?: string;
  };
  if (!to || !subject || !body) {
    res.status(400).json({ error: "Send to, subject and body." });
    return;
  }
  try {
    res.json({ resource: "email.send", result: await sendEmail({ to, subject, body }) });
  } catch (err) {
    res.status(502).json({
      error: `Payment settled, but the email provider failed: ${(err as Error).message}`,
      resource: "email.send",
      settled: true,
    });
  }
});
