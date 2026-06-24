// Entry point for both Bun and Cloudflare Workers.
//   - Bun reads the `port` field and serves `fetch`.
//   - Workers ignores `port` and calls `fetch(request, env, ctx)`.
//
// The same `app` handles both; config initializes per-request from the right
// environment source (see app.ts). On non-Workers runtimes we eagerly validate
// config at boot so misconfiguration fails fast instead of on the first request.

import { app } from "./app.ts";
import { ensureConfig } from "./config.ts";

const isWorkers =
  typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

if (!isWorkers) {
  // Bun / Node: env is available at startup — validate now for a clear boot error.
  ensureConfig(process.env);
  console.log(`[hevy-mcp] starting on :${process.env.PORT ?? 3000}`);
}

export default {
  port: Number(process.env.PORT ?? 3000),
  fetch: app.fetch,
};
