// Loads and validates all environment configuration at startup. Fails fast with a
// clear message if anything required is missing, so misconfiguration never reaches
// the OAuth or Hevy layers at request time.

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    console.error(`[config] Missing required environment variable: ${name}`);
    console.error("See .env.example for the full list.");
    process.exit(1);
  }
  return value.trim();
}

const PUBLIC_URL = required("PUBLIC_URL").replace(/\/+$/, ""); // strip trailing slash

const jwtSecret = required("JWT_SECRET");
if (jwtSecret.length < 32) {
  console.error("[config] JWT_SECRET must be at least 32 characters. Generate with: openssl rand -hex 32");
  process.exit(1);
}

export const config = {
  hevyApiKey: required("HEVY_API_KEY"),
  mcpPassword: required("MCP_PASSWORD"),
  jwtSecret,
  publicUrl: PUBLIC_URL,
  port: Number(process.env.PORT ?? 3000),

  // OAuth identifiers derived from the public URL.
  issuer: PUBLIC_URL,
  // The MCP endpoint is the protected resource (RFC 8707 resource indicator / audience).
  resource: `${PUBLIC_URL}/mcp`,

  hevyBaseUrl: "https://api.hevyapp.com",
} as const;

export type Config = typeof config;
