// Configuration is built lazily from an environment source so the same code runs
// on both Bun (env on `process.env`, available at startup) and Cloudflare Workers
// (secrets/vars on the per-request `env` binding, NOT available at module load).
//
// `ensureConfig(source)` is called once early in the request lifecycle (and eagerly
// at boot on Bun/Node for fail-fast). Everything else reads `getConfig()`.

export interface Config {
  hevyApiKey: string;
  mcpPassword: string;
  jwtSecret: string;
  publicUrl: string;
  port: number;
  issuer: string;
  resource: string;
  hevyBaseUrl: string;
}

export type EnvSource = Record<string, string | undefined>;

function buildConfig(env: EnvSource): Config {
  const required = (name: string): string => {
    const value = env[name];
    if (!value || value.trim() === "") {
      throw new Error(`Missing required environment variable: ${name}. See .env.example.`);
    }
    return value.trim();
  };

  const publicUrl = required("PUBLIC_URL").replace(/\/+$/, ""); // strip trailing slash

  const jwtSecret = required("JWT_SECRET");
  if (jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters. Generate with: openssl rand -hex 32");
  }

  return {
    hevyApiKey: required("HEVY_API_KEY"),
    mcpPassword: required("MCP_PASSWORD"),
    jwtSecret,
    publicUrl,
    port: Number(env.PORT ?? 3000),
    issuer: publicUrl,
    // The MCP endpoint is the protected resource (RFC 8707 resource indicator / audience).
    resource: `${publicUrl}/mcp`,
    hevyBaseUrl: "https://api.hevyapp.com",
  };
}

let cached: Config | null = null;

/** Initialize config once from the given source. Idempotent. */
export function ensureConfig(env: EnvSource): Config {
  if (!cached) cached = buildConfig(env);
  return cached;
}

/** Access the initialized config. Throws if ensureConfig() has not run yet. */
export function getConfig(): Config {
  if (!cached) throw new Error("Config not initialized — ensureConfig() must run first.");
  return cached;
}
