import express from "express";
import fs from "node:fs";
import path from "node:path";
import { paymentMiddlewareFromHTTPServer } from "@x402/express";
import { assertServerConfig, config, CATALOGUE, LIVE_CATALOGUE } from "./config.js";
import { publicApi } from "./routes/public.js";
import { inbound } from "./routes/inbound.js";
import { paid } from "./routes/paid.js";
import {
  AGENT_HEADER,
  AGENT_ADDRESS_HEADER,
  buildResourceServer,
  initializeWithRetry,
} from "./x402/server.js";

async function main(): Promise<void> {
  assertServerConfig();

  const app = express();
  app.use(express.json({ limit: "256kb" }));

  // The console is a browser client of this same API, so it needs the header
  // the agent uses too.
  app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", `content-type, x-payment, ${AGENT_HEADER}, ${AGENT_ADDRESS_HEADER}`);
    res.setHeader("Access-Control-Expose-Headers", "payment-required, payment-response");
    next();
  });
  app.options("*", (_req, res) => void res.sendStatus(204));

  // Unpaid surface first: health, the catalogue and the audit reads must stay
  // reachable even when the facilitator is having a bad day.
  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      network: config.network,
      asset: config.asset,
      facilitator: config.facilitatorUrl,
      selling: LIVE_CATALOGUE.length,
    });
  });
  app.use(publicApi);
  app.use(inbound);

  const httpServer = buildResourceServer();
  await initializeWithRetry(httpServer);

  // syncFacilitatorOnStart is false because initialization is owned above,
  // with backoff, so a transient blip cannot become a crash loop.
  app.use(paymentMiddlewareFromHTTPServer(httpServer, undefined, undefined, false));
  app.use(paid);

  serveConsole(app);

  app.listen(config.port, () => {
    console.log(`warrant listening on :${config.port}`);
    console.log(`  network     ${config.network}`);
    console.log(`  settles in  ${config.asset} (${config.assetDecimals} dp)`);
    console.log(`  facilitator ${config.facilitatorUrl}`);
    console.log(`  pays to     ${config.payTo}`);
    console.log(`  selling     ${LIVE_CATALOGUE.map((o) => o.kind).join(", ")}`);
    const dark = CATALOGUE.filter((o) => !o.live);
    if (dark.length) {
      console.log(`  not listed  ${dark.map((o) => o.kind).join(", ")} (provider not configured)`);
    }
  });
}


/**
 * Serves the built console from the same origin as the API.
 *
 * Same origin matters for more than convenience: it means the console is
 * demonstrably reading the service it claims to read, rather than a different
 * deployment that happens to agree with it.
 *
 * The routes are client-side, so anything that is not a file and not an API
 * path has to return index.html or a reload of /console is a 404.
 */
function serveConsole(app: express.Express): void {
  const dist = path.join(process.cwd(), "frontend", "dist");
  const index = path.join(dist, "index.html");
  if (!fs.existsSync(index)) {
    console.log(`  console     not built (run: cd frontend && npm run build)`);
    return;
  }

  app.use(express.static(dist, { index: false }));
  app.get("*", (req, res, next) => {
    // Never shadow the API: an unmatched /v1 path should 404 as an API call,
    // not quietly return a web page to something expecting JSON.
    if (req.path.startsWith("/v1/") || req.path === "/health") return next();
    res.sendFile(index);
  });

  // An unmatched API path is an API error, so it answers in the content type
  // the caller asked for rather than in a web page.
  app.use("/v1", (req, res) => {
    res.status(404).json({ error: `This service has no ${req.method} /v1${req.path}.` });
  });
  console.log(`  console     /  (built)`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
