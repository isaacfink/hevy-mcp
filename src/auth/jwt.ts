// All OAuth state is carried in HS256-signed JWTs so the server stays stateless
// (no database). There are three token kinds, distinguished by the `kind` claim:
//   - "code"    : short-lived authorization code (embeds PKCE challenge + redirect_uri)
//   - "access"  : bearer token presented to /mcp
//   - "refresh" : long-lived token exchanged for new access tokens

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { config } from "../config.ts";

const secret = new TextEncoder().encode(config.jwtSecret);
const ALG = "HS256";

export type TokenKind = "code" | "access" | "refresh";

interface CodeClaims {
  kind: "code";
  code_challenge: string;
  code_challenge_method: string;
  redirect_uri: string;
  client_id: string;
}

async function sign(claims: Record<string, unknown>, expiresIn: string): Promise<string> {
  return new SignJWT(claims as JWTPayload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setIssuer(config.issuer)
    .setAudience(config.resource)
    .setExpirationTime(expiresIn)
    .sign(secret);
}

async function verify(token: string, kind: TokenKind): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, secret, {
    issuer: config.issuer,
    audience: config.resource,
  });
  if (payload.kind !== kind) {
    throw new Error(`Expected token kind '${kind}' but got '${String(payload.kind)}'`);
  }
  return payload;
}

export const issueAuthorizationCode = (claims: Omit<CodeClaims, "kind">) =>
  sign({ ...claims, kind: "code" }, "5m");

export const verifyAuthorizationCode = (token: string) =>
  verify(token, "code") as Promise<JWTPayload & CodeClaims>;

export const issueAccessToken = () => sign({ kind: "access", sub: "owner" }, "90d");

export const issueRefreshToken = () => sign({ kind: "refresh", sub: "owner" }, "365d");

export const verifyAccessToken = (token: string) => verify(token, "access");

export const verifyRefreshToken = (token: string) => verify(token, "refresh");
