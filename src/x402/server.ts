/**
 * Payment plumbing, wired so that enforcement happens at three distinct
 * moments and each moment is the earliest one at which its check is possible.
 *
 *   onProtectedRequest  no money involved yet  — is this purchase authorised?
 *   onAfterVerify       payment signed, not settled — is the payer the agent
 *                       the warrant names?
 *   onAfterSettle       money has moved — write the receipt.
 *
 * The ordering is the whole point. A purchase the warrant does not cover never
 * becomes a payment, so there is nothing to refund and nothing to reconcile.
 */
import {
  HTTPFacilitatorClient,
  x402ResourceServer,
  x402HTTPResourceServer,
  type RoutesConfig,
  type HTTPTransportContext,
  type HTTPAdapter,
} from "@x402/core/server";
import { ExactHederaScheme } from "@x402/hedera/exact/server";
import { config, moneyFor, PRICES, type ResourceType } from "../config.js";
import { decide } from "../warrant/gate.js";
import { fromWire, warrantId, type SignedWarrant } from "../warrant/warrant.js";
import {
  isRevoked,
  rememberWarrant,
  spentUnder,
  writeReceipt,
  writeRefusal,
} from "../store/db.js";

export const WARRANT_HEADER = "x-warrant";

/** Maps a protected path onto the resource type the warrant allowlist names. */
const ROUTE_RESOURCE: Record<string, ResourceType> = {
  "POST /v1/inference": "inference",
  "POST /v1/email/send": "email.send",
};

export const routes: RoutesConfig = Object.fromEntries(
  Object.entries(ROUTE_RESOURCE).map(([pattern, resource]) => [
    pattern,
    {
      accepts: {
        scheme: "exact",
        network: config.network,
        payTo: config.payTo,
        price: moneyFor(resource),
        maxTimeoutSeconds: 120,
      },
      description: `Warrant-gated ${resource}`,
      serviceName: "Warrant",
      mimeType: "application/json",
      unpaidResponseBody: () => ({
        contentType: "application/json",
        body: {
          resource,
          price: moneyFor(resource),
          warrantRequired: true,
          hint: "Present a signed warrant in X-Warrant, then pay the challenge.",
        },
      }),
    },
  ]),
) as RoutesConfig;

/** Decodes the base64 JSON warrant an agent presents, or null if absent. */
function readWarrant(adapter: HTTPAdapter): SignedWarrant | null {
  const raw = adapter.getHeader(WARRANT_HEADER);
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as SignedWarrant;
  } catch {
    return null;
  }
}

function resourceFor(method: string, path: string): ResourceType | undefined {
  return ROUTE_RESOURCE[`${method.toUpperCase()} ${path}`];
}

function adapterOf(transportContext: unknown): HTTPAdapter | undefined {
  return (transportContext as HTTPTransportContext | undefined)?.request?.adapter;
}

export function buildResourceServer(): x402HTTPResourceServer {
  const facilitator = new HTTPFacilitatorClient({ url: config.facilitatorUrl });

  const resourceServer = new x402ResourceServer(facilitator)
    .register(config.network, new ExactHederaScheme())

    /**
     * Payer binding. Verification tells us who actually signed the transfer; a
     * warrant is a licence for one named agent, so a valid payment from anyone
     * else is refused here, while the money is still recoverable.
     */
    .onAfterVerify(async (ctx) => {
      const adapter = adapterOf(ctx.transportContext);
      if (!adapter) return;
      const signed = readWarrant(adapter);
      if (!signed) return;
      const payer = ctx.result.payer;
      if (!payer) return;
      const w = fromWire(signed.warrant);
      if (payer !== w.agent) {
        writeRefusal({
          warrant_id: warrantId(w, config.network),
          agent: w.agent,
          resource: resourceFor(adapter.getMethod(), adapter.getPath()) ?? adapter.getPath(),
          price: "0",
          code: "payer_mismatch",
          reason: `The warrant authorises ${w.agent} to spend, but the payment was signed by ${payer}.`,
        });
        return {
          abort: true as const,
          reason: "payer_not_authorised",
          message: `This warrant authorises ${w.agent}. The payment came from ${payer}.`,
        };
      }
    })

    /** Settlement happened, so the purchase is now a fact worth recording. */
    .onAfterSettle(async (ctx) => {
      if (!ctx.result.success) return;
      const adapter = adapterOf(ctx.transportContext);
      if (!adapter) return;
      const signed = readWarrant(adapter);
      if (!signed) return;
      const w = fromWire(signed.warrant);
      const resource = resourceFor(adapter.getMethod(), adapter.getPath());
      writeReceipt({
        warrant_id: warrantId(w, config.network),
        agent: w.agent,
        payer: ctx.result.payer ?? w.agent,
        resource: resource ?? adapter.getPath(),
        purpose: w.purpose,
        // Prefer what actually settled; fall back to what was agreed.
        amount: ctx.result.amount ?? ctx.requirements.amount,
        asset: ctx.requirements.asset,
        network: ctx.result.network,
        tx_id: ctx.result.transaction,
      });
    });

  const httpServer = new x402HTTPResourceServer(resourceServer, routes);

  /**
   * The gate. Runs before a payment challenge is issued, so a refusal costs
   * the agent nothing but a 403 and an explanation it can act on.
   */
  httpServer.onProtectedRequest(async (ctx) => {
    const resource = resourceFor(ctx.method, ctx.path);
    if (!resource) return;

    const signed = readWarrant(ctx.adapter);
    const price = PRICES[resource];

    let id: string | undefined;
    let revoked = false;
    if (signed) {
      try {
        const w = fromWire(signed.warrant);
        id = warrantId(w, config.network);
        revoked = isRevoked(id);
        rememberWarrant({
          id,
          owner: w.owner,
          agent: w.agent,
          asset: w.asset,
          cap: w.cap.toString(),
          resources: w.resources.join(","),
          purpose: w.purpose,
          expiry: Number(w.expiry),
          nonce: w.nonce.toString(),
          signature: signed.signature,
          payload: JSON.stringify(signed.warrant),
        });
      } catch {
        /* decide() reports the malformed warrant with a usable message. */
      }
    }

    const decision = await decide({
      signed,
      resource,
      price,
      asset: config.asset,
      network: config.network,
      spent: id ? spentUnder(id) : 0n,
      revoked,
      allowedOwners: [...config.allowedOwners],
      now: Math.floor(Date.now() / 1000),
    });

    if (decision.allowed) return;

    writeRefusal({
      warrant_id: decision.warrantId ?? null,
      agent: signed ? signed.warrant.agent : null,
      resource,
      price: price.toString(),
      code: decision.code,
      reason: decision.reason,
    });

    return { abort: true as const, reason: `${decision.code}: ${decision.reason}` };
  });

  return httpServer;
}

/**
 * Brings the server up against the facilitator with backoff.
 *
 * Owned here rather than left to the middleware so a transient facilitator blip
 * cannot turn into a crash loop on startup.
 */
export async function initializeWithRetry(
  httpServer: x402HTTPResourceServer,
  attempts = 6,
): Promise<void> {
  let lastError: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      await httpServer.initialize();
      return;
    } catch (err) {
      lastError = err;
      const waitMs = Math.min(8000, 500 * 2 ** (i - 1));
      console.warn(
        `facilitator not ready (attempt ${i}/${attempts}): ${(err as Error).message}. retrying in ${waitMs}ms`,
      );
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw lastError;
}
