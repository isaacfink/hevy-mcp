// Minimal single-user OAuth 2.1 authorization server, implemented as Hono routes.
// Implements just enough of the spec for Claude's custom-connector flow:
//   - Authorization Server Metadata (RFC 8414)
//   - Protected Resource Metadata (RFC 9728)
//   - Dynamic Client Registration (RFC 7591)
//   - Authorization Code grant with PKCE S256
//   - Refresh Token grant
// All state lives in signed JWTs, so there is no database.

import { Hono } from "hono";
import { getConfig } from "../config.ts";
import { loginPage } from "./login.ts";
import {
  issueAuthorizationCode,
  verifyAuthorizationCode,
  issueAccessToken,
  issueRefreshToken,
  verifyRefreshToken,
} from "./jwt.ts";

export const authApp = new Hono();

// ---- PKCE helper ------------------------------------------------------------

function base64url(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function s256(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

// ---- Discovery metadata -----------------------------------------------------

authApp.get("/.well-known/oauth-authorization-server", (c) => {
  const { issuer } = getConfig();
  return c.json({
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/token`,
    registration_endpoint: `${issuer}/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["mcp"],
  });
});

// Served both at the root and at the resource-suffixed path that some clients probe.
function protectedResourceMetadata() {
  const { resource, issuer } = getConfig();
  return {
    resource,
    authorization_servers: [issuer],
    scopes_supported: ["mcp"],
    bearer_methods_supported: ["header"],
  };
}
authApp.get("/.well-known/oauth-protected-resource", (c) => c.json(protectedResourceMetadata()));
authApp.get("/.well-known/oauth-protected-resource/mcp", (c) => c.json(protectedResourceMetadata()));

// ---- Dynamic Client Registration (RFC 7591) ---------------------------------
// Single-user: accept any registration and mint a client_id. We do not persist
// clients; token issuance is gated entirely by PKCE + the password, so an
// unknown client_id at /token is harmless.

authApp.post("/register", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];
  const clientId = crypto.randomUUID();
  return c.json(
    {
      client_id: clientId,
      redirect_uris: redirectUris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      client_name: typeof body.client_name === "string" ? body.client_name : "mcp-client",
      ...(typeof body.scope === "string" ? { scope: body.scope } : { scope: "mcp" }),
    },
    201,
  );
});

// ---- Authorization endpoint -------------------------------------------------

interface AuthParams {
  client_id: string;
  redirect_uri: string;
  state: string;
  code_challenge: string;
  code_challenge_method: string;
  scope: string;
  resource: string;
}

function readAuthParams(src: Record<string, unknown>): AuthParams {
  const get = (k: string) => (typeof src[k] === "string" ? (src[k] as string) : "");
  return {
    client_id: get("client_id"),
    redirect_uri: get("redirect_uri"),
    state: get("state"),
    code_challenge: get("code_challenge"),
    code_challenge_method: get("code_challenge_method") || "S256",
    scope: get("scope") || "mcp",
    resource: get("resource"),
  };
}

// GET /authorize -> render the password page.
authApp.get("/authorize", (c) => {
  const p = readAuthParams(c.req.query());
  if (!p.redirect_uri || !p.code_challenge) {
    return c.text("Invalid authorization request: missing redirect_uri or code_challenge.", 400);
  }
  if (p.code_challenge_method !== "S256") {
    return c.text("Unsupported code_challenge_method; only S256 is supported.", 400);
  }
  return c.html(loginPage(p));
});

// POST /authorize -> verify password, issue code, redirect back to the client.
authApp.post("/authorize", async (c) => {
  const form = await c.req.parseBody();
  const p = readAuthParams(form as Record<string, unknown>);
  const password = typeof form.password === "string" ? form.password : "";

  if (!p.redirect_uri || !p.code_challenge) {
    return c.text("Invalid authorization request.", 400);
  }

  if (password !== getConfig().mcpPassword) {
    return c.html(loginPage({ ...p, error: "Incorrect password. Please try again." }), 401);
  }

  const code = await issueAuthorizationCode({
    code_challenge: p.code_challenge,
    code_challenge_method: p.code_challenge_method,
    redirect_uri: p.redirect_uri,
    client_id: p.client_id,
  });

  const redirect = new URL(p.redirect_uri);
  redirect.searchParams.set("code", code);
  if (p.state) redirect.searchParams.set("state", p.state);
  return c.redirect(redirect.toString(), 302);
});

// ---- Token endpoint ---------------------------------------------------------

function tokenError(c: any, error: string, description: string, status = 400) {
  return c.json({ error, error_description: description }, status);
}

authApp.post("/token", async (c) => {
  const form = await c.req.parseBody();
  const grantType = typeof form.grant_type === "string" ? form.grant_type : "";

  if (grantType === "authorization_code") {
    const code = typeof form.code === "string" ? form.code : "";
    const verifier = typeof form.code_verifier === "string" ? form.code_verifier : "";
    const redirectUri = typeof form.redirect_uri === "string" ? form.redirect_uri : "";

    if (!code || !verifier) {
      return tokenError(c, "invalid_request", "Missing code or code_verifier.");
    }

    let claims;
    try {
      claims = await verifyAuthorizationCode(code);
    } catch {
      return tokenError(c, "invalid_grant", "Authorization code is invalid or expired.");
    }

    if (redirectUri && claims.redirect_uri && redirectUri !== claims.redirect_uri) {
      return tokenError(c, "invalid_grant", "redirect_uri does not match the authorization request.");
    }

    const expected = await s256(verifier);
    if (expected !== claims.code_challenge) {
      return tokenError(c, "invalid_grant", "PKCE verification failed.");
    }

    return c.json({
      access_token: await issueAccessToken(),
      token_type: "Bearer",
      expires_in: 90 * 24 * 60 * 60,
      refresh_token: await issueRefreshToken(),
      scope: "mcp",
    });
  }

  if (grantType === "refresh_token") {
    const refresh = typeof form.refresh_token === "string" ? form.refresh_token : "";
    if (!refresh) return tokenError(c, "invalid_request", "Missing refresh_token.");
    try {
      await verifyRefreshToken(refresh);
    } catch {
      return tokenError(c, "invalid_grant", "Refresh token is invalid or expired.");
    }
    return c.json({
      access_token: await issueAccessToken(),
      token_type: "Bearer",
      expires_in: 90 * 24 * 60 * 60,
      refresh_token: await issueRefreshToken(),
      scope: "mcp",
    });
  }

  return tokenError(c, "unsupported_grant_type", `Unsupported grant_type '${grantType}'.`);
});
