// Bearer-auth middleware protecting /mcp. On a missing/invalid token it returns
// 401 with a WWW-Authenticate header pointing at the protected-resource metadata,
// which is what triggers an MCP client (Claude, MCP Inspector) to start the OAuth flow.

import type { Context, Next } from "hono";
import { getConfig } from "../config.ts";
import { verifyAccessToken } from "./jwt.ts";

function challenge(): string {
  const metadataUrl = `${getConfig().issuer}/.well-known/oauth-protected-resource`;
  return `Bearer resource_metadata="${metadataUrl}"`;
}

export async function requireBearer(c: Context, next: Next) {
  const header = c.req.header("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    c.header("WWW-Authenticate", challenge());
    return c.json({ error: "unauthorized", error_description: "Missing bearer token." }, 401);
  }

  try {
    await verifyAccessToken(match[1]!);
  } catch {
    c.header("WWW-Authenticate", `${challenge()}, error="invalid_token"`);
    return c.json({ error: "invalid_token", error_description: "Token is invalid or expired." }, 401);
  }

  return next();
}
