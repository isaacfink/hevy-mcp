// Entry point: a Hono app that mounts the OAuth routes, protects /mcp with the
// bearer middleware, and serves the MCP protocol over Streamable HTTP via @hono/mcp.
// Runs statelessly (a fresh MCP server + transport per request), which is simplest
// and robust for a single user.

import { Hono } from "hono";
import { cors } from "hono/cors";
import { StreamableHTTPTransport } from "@hono/mcp";
import { config } from "./config.ts";
import { authApp } from "./auth/routes.ts";
import { requireBearer } from "./auth/middleware.ts";
import { buildMcpServer } from "./mcp/server.ts";

const app = new Hono();

// Allow browser-based MCP clients (e.g. MCP Inspector) and expose the auth header.
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Mcp-Session-Id", "mcp-protocol-version"],
    exposeHeaders: ["WWW-Authenticate", "Mcp-Session-Id"],
    maxAge: 86400,
  }),
);

// Unauthenticated health check for Coolify/Traefik.
app.get("/health", (c) => c.json({ status: "ok", service: "hevy-mcp" }));

// OAuth: /authorize, /token, /register, /.well-known/*
app.route("/", authApp);

// The MCP endpoint, gated by bearer auth.
app.use("/mcp", requireBearer);
app.all("/mcp", async (c) => {
  const server = buildMcpServer();
  const transport = new StreamableHTTPTransport();
  await server.connect(transport);
  const res = await transport.handleRequest(c);
  return res ?? c.body(null, 204);
});

console.log(`[hevy-mcp] listening on :${config.port}  (public: ${config.publicUrl})`);

export default {
  port: config.port,
  fetch: app.fetch,
};
