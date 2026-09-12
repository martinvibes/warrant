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

/**
 * The agent tells us which account it is; the settlement proves it. Claiming
 * someone else's account is refused below, so a handler can read this header
 * and treat it as established.
 */
export const AGENT_HEADER = "x-agent";
/** The agent's EVM address, needed only by resources that touch a contract. */
export const AGENT_ADDRESS_HEADER = "x-agent-address";

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

    /** Settlement happened, so the purchase is a fact worth recording. */
    .onAfterSettle(async (ctx) => {
      if (!ctx.result.success) return;
      const adapter = adapterOf(ctx.transportContext);
      if (!adapter) return;

      const offer = offerForRoute(adapter.getMethod(), adapter.getPath());
      writePurchase({
        agent: ctx.result.payer ?? adapter.getHeader(AGENT_HEADER) ?? "unknown",
        kind: offer?.kind ?? adapter.getPath(),
        // Prefer what actually settled over what was agreed.
        amount: String(ctx.result.amount ?? ctx.requirements.amount),
        asset: ctx.requirements.asset,
        network: ctx.result.network,
        tx_id: ctx.result.transaction ?? null,
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
