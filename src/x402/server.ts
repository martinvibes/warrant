/**
 * Payment plumbing.
 *
 * Paying is the authorisation. There is no approval step in front of these
 * routes and no human in the loop, because an agent that has to wait for a
 * person is not an autonomous buyer, it is a form. What bounds the spending is
 * the treasury contract, one layer down, where the money actually lives.
 *
 * Two things still happen here that are worth the code:
 *
 *   onAfterVerify   the payment is signed but not settled, so this is the last
 *                   moment a mismatch can be refused for free.
 *   onAfterSettle   the money moved, so the purchase is now a fact to record.
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
import { config, LIVE_CATALOGUE, moneyFor, offerForRoute } from "../config.js";
import { writePurchase } from "../store/db.js";
import { newReceiptId, sign } from "../receipts.js";
import { identityOf } from "../resources/identity.js";

/**
 * The agent tells us which account it is; the settlement proves it. Claiming
 * someone else's account is refused below, so a handler can read this header
 * and treat it as established.
 */
export const AGENT_HEADER = "x-agent";
/** The agent's EVM address, needed only by resources that touch a contract. */
export const AGENT_ADDRESS_HEADER = "x-agent-address";

/**
 * Purchases that can be known to be impossible before the money moves.
 *
 * The rest of the failures a resource can have happen upstream, after
 * settlement, and are reported honestly as such. These are different: the
 * answer is already on chain when the payment is merely signed, so charging
 * for the attempt would be taking money for a thing we know cannot be sold.
 *
 * Keep this list short. A check here delays every purchase of that kind, so it
 * earns its place only when the failure is certain rather than likely.
 */
const IMPOSSIBLE: Record<string, (adapter: HTTPAdapter) => Promise<string | undefined>> = {
  "identity.mint": async (adapter) => {
    const address = adapter.getHeader(AGENT_ADDRESS_HEADER);
    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) return undefined;
    const existing = await identityOf(address as `0x${string}`);
    if (existing === 0n) return undefined;
    return `${address} already holds identity #${existing}, and an agent gets one permanently. You have not been charged.`;
  },
};

export const routes: RoutesConfig = Object.fromEntries(
  LIVE_CATALOGUE.map((offer) => [
    `${offer.method} ${offer.path}`,
    {
      accepts: {
        scheme: "exact",
        network: config.network,
        payTo: config.payTo,
        price: moneyFor(offer.price),
        maxTimeoutSeconds: 120,
      },
      description: offer.blurb,
      serviceName: "Warrant",
      mimeType: "application/json",
      unpaidResponseBody: () => ({
        contentType: "application/json",
        body: {
          kind: offer.kind,
          title: offer.title,
          price: moneyFor(offer.price),
          priceAtomic: offer.price.toString(),
          asset: config.asset,
          poweredBy: offer.poweredBy,
          hint: `Pay the challenge and send ${AGENT_HEADER} with the account you are paying from.`,
        },
      }),
    },
  ]),
) as RoutesConfig;

function adapterOf(transportContext: unknown): HTTPAdapter | undefined {
  return (transportContext as HTTPTransportContext | undefined)?.request?.adapter;
}

export function buildResourceServer(): x402HTTPResourceServer {
  const facilitator = new HTTPFacilitatorClient({ url: config.facilitatorUrl });

  const resourceServer = new x402ResourceServer(facilitator)
    .register(config.network, new ExactHederaScheme())

    /**
     * The claimed account has to be the paying one.
     *
     * Everything an agent owns here is keyed to its account: its inboxes, its
     * numbers, its memory. Without this check an agent could pay from its own
     * account while claiming another's, and buy things into someone else's
     * name. Refusing at verify means the payment never settles.
     */
    .onAfterVerify(async (ctx) => {
      const adapter = adapterOf(ctx.transportContext);
      const claimed = adapter?.getHeader(AGENT_HEADER);
      const payer = ctx.result.payer;
      if (!claimed || !payer) return;

      if (claimed !== payer) {
        return {
          abort: true as const,
          reason: "agent_mismatch",
          message: `The payment was signed by ${payer}, but ${AGENT_HEADER} claims ${claimed}. Send the account you are paying from.`,
        };
      }
    })

    /**
     * The last chance to refuse for free.
     *
     * A resource that fails after settlement has still taken the money, which
     * is right when the failure was upstream and wrong when it was knowable
     * beforehand. Minting a second identity is knowable: the chain already
     * holds the answer.
     */
    .onAfterVerify(async (ctx) => {
      const adapter = adapterOf(ctx.transportContext);
      if (!adapter) return;
      const offer = offerForRoute(adapter.getMethod(), adapter.getPath());
      const check = offer ? IMPOSSIBLE[offer.kind] : undefined;
      if (!check) return;
      try {
        const refusal = await check(adapter);
        if (refusal) return { abort: true as const, reason: "already_owned", message: refusal };
      } catch {
        // A chain we cannot reach is not grounds to refuse a payment; the
        // resource will report the failure honestly a moment later.
      }
    })

    /** Settlement happened, so the purchase is a fact worth recording. */
    .onAfterSettle(async (ctx) => {
      if (!ctx.result.success) return;
      const adapter = adapterOf(ctx.transportContext);
      if (!adapter) return;

      const offer = offerForRoute(adapter.getMethod(), adapter.getPath());
      const issuedAt = Date.now();
      const receipt = await sign({
        id: newReceiptId(),
        agent: ctx.result.payer ?? adapter.getHeader(AGENT_HEADER) ?? "unknown",
        kind: offer?.kind ?? adapter.getPath(),
        resource: `${adapter.getMethod()} ${adapter.getPath()}`,
        // Prefer what actually settled over what was agreed.
        amount: String(ctx.result.amount ?? ctx.requirements.amount),
        asset: ctx.requirements.asset,
        network: ctx.result.network,
        settlement: ctx.result.transaction ?? null,
        issuedAt,
      });

      writePurchase({
        agent: receipt.agent,
        kind: receipt.kind,
        amount: receipt.amount,
        asset: receipt.asset,
        network: receipt.network,
        tx_id: receipt.settlement,
        resource: receipt.resource,
        receipt_id: receipt.id,
        digest: receipt.digest,
        signature: receipt.signature,
        created_at: issuedAt,
      });

    });

  return new x402HTTPResourceServer(resourceServer, routes);
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
