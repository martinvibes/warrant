import express from "express";
import path from "node:path";
import { paymentMiddlewareFromHTTPServer } from "@x402/express";
import { assertServerConfig, config } from "./config.js";
import { admin } from "./routes/admin.js";
import { paid } from "./routes/paid.js";
import { buildResourceServer, initializeWithRetry } from "./x402/server.js";

async function main(): Promise<void> {
  assertServerConfig();

  const app = express();
  app.use(express.json({ limit: "256kb" }));

  // The console is a browser client of this same API, so it needs the header
  // the agent uses too.
  app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "content-type, x-warrant, x-payment");
    res.setHeader("Access-Control-Expose-Headers", "payment-required, payment-response");
    next();
  });
  app.options("*", (_req, res) => void res.sendStatus(204));

  // Unpaid surface first: health, pricing and the audit reads must stay
  // reachable even when the facilitator is having a bad day.
  app.use(admin);

  const httpServer = buildResourceServer();
  await initializeWithRetry(httpServer);

  // syncFacilitatorOnStart is false because initialization is owned above,
  // with backoff, so a transient blip cannot become a crash loop.
  app.use(paymentMiddlewareFromHTTPServer(httpServer, undefined, undefined, false));
  app.use(paid);

  app.use(express.static(path.join(process.cwd(), "public")));

  app.listen(config.port, () => {
    console.log(`warrant listening on :${config.port}`);
    console.log(`  network     ${config.network}`);
    console.log(`  settles in  ${config.asset} (${config.assetDecimals} dp)`);
    console.log(`  facilitator ${config.facilitatorUrl}`);
    console.log(`  pays to     ${config.payTo}`);
    console.log(
      config.allowedOwners.length
        ? `  warrants from ${config.allowedOwners.join(", ")}`
        : `  warrants from any valid signer (set OWNER_ADDRESS to restrict)`,
    );
  });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
