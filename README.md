# Hevy MCP Server

A single-user remote [MCP](https://modelcontextprotocol.io) server that exposes the
[Hevy](https://www.hevyapp.com/) workout API to Claude (and any OAuth-capable MCP client).
It speaks the full MCP protocol over Streamable HTTP at `/mcp` and is protected by a minimal,
stateless OAuth 2.1 flow, so it can be added as a **custom connector in the Claude app** —
including on mobile, on the go.

- **Runtime:** Bun **or** Cloudflare Workers — the same code runs on both, via [Hono](https://hono.dev/) + [`@hono/mcp`](https://www.npmjs.com/package/@hono/mcp).
- **Auth:** single-user OAuth 2.1 (PKCE S256), all state held in signed JWTs — **no database**.
- **Hevy:** a single `api-key` from an environment variable / secret.

## Why OAuth (and not just a token)?

As of 2026 the Claude app's custom-connector UI only accepts **OAuth** — it does not let
you paste a static bearer token or custom header. So this server implements a tiny
single-user OAuth provider: when you connect, Claude sends you to a login page where you
enter `MCP_PASSWORD`; on success it receives an access token (a signed JWT) that it then
presents to `/mcp`. Nothing is persisted — the password gates the flow and PKCE + JWT
signatures secure it. Because the server supports Dynamic Client Registration, you do **not**
need to fill in any Client ID / Client Secret in Claude — just the server URL.

## Prerequisites

- A **Hevy account with API access** — the developer API key lives in the Hevy app under
  **Settings → Developer** and requires a **Hevy Pro** subscription.
- For local development / Bun deploys: [**Bun**](https://bun.sh) ≥ 1.1 (`curl -fsSL https://bun.sh/install | bash`).
- For Cloudflare deploys: a Cloudflare account and **Node.js ≥ 22** (Wrangler requires it). Bun is not needed on Workers.
- A public **HTTPS** URL to deploy to (Coolify/Docker host or Cloudflare). The Claude app
  connector requires HTTPS — `localhost` works only for local testing with the MCP Inspector.

## Tools

All ~22 Hevy endpoints, read + write:

- **Workouts:** `list_workouts`, `get_workout`, `get_workout_count`, `get_workout_events`, `create_workout`, `update_workout`
- **Routines:** `list_routines`, `get_routine`, `create_routine`, `update_routine`
- **Routine folders:** `list_routine_folders`, `get_routine_folder`, `create_routine_folder`
- **Exercise templates:** `list_exercise_templates`, `get_exercise_template`, `create_exercise_template`
- **Exercise history:** `get_exercise_history`
- **Body measurements:** `list_body_measurements`, `get_body_measurement`, `create_body_measurement`, `update_body_measurement`
- **User:** `get_user_info`

## Configuration

| Variable        | Description                                                                 |
| --------------- | --------------------------------------------------------------------------- |
| `HEVY_API_KEY`  | Your Hevy API key (Hevy app → Settings → Developer; requires Hevy Pro).      |
| `MCP_PASSWORD`  | The password you type on the OAuth login page when connecting Claude.        |
| `JWT_SECRET`    | Random ≥32-char secret for signing JWTs. Generate with `openssl rand -hex 32`. |
| `PUBLIC_URL`    | Public HTTPS base URL (no trailing slash). Must match the deployed domain.   |
| `PORT`          | Port to listen on (default `3000`). Ignored on Cloudflare Workers.           |

## Run locally (Bun)

```bash
bun install
cp .env.example .env     # then edit values
bun run dev              # or: bun run start
```

Then point an MCP client at `http://localhost:3000/mcp`, e.g. the inspector:

```bash
npx @modelcontextprotocol/inspector
```

It discovers the OAuth metadata, opens the login page (enter `MCP_PASSWORD`), and then lets
you list and call tools.

## Deploy: Docker (Coolify or any host)

The included `Dockerfile` runs on `oven/bun` and has a built-in `/health` healthcheck.

**Generic Docker:**

```bash
docker build -t hevy-mcp .
docker run -p 3000:3000 \
  -e HEVY_API_KEY=... \
  -e MCP_PASSWORD=... \
  -e JWT_SECRET="$(openssl rand -hex 32)" \
  -e PUBLIC_URL=https://hevy-mcp.example.com \
  hevy-mcp
```

Put it behind a reverse proxy (Caddy/nginx/Traefik) that terminates TLS, and set
`PUBLIC_URL` to the public HTTPS address.

**Coolify:**

1. Create a new resource from this repo (Dockerfile build). Exposed port: `3000`.
2. Set the environment variables above. Set `PUBLIC_URL` to the domain Coolify assigns
   **after** it's assigned (Traefik provisions TLS automatically) — it must match exactly.
3. Health check path: `/health`.
4. Deploy.

## Deploy: Cloudflare Workers

The same entry point runs on Workers (env comes from the request binding, not `process.env`;
`nodejs_compat` is enabled in `wrangler.jsonc`).

1. Install deps and log in (needs Node.js ≥ 22):

   ```bash
   bun install            # or: npm install
   npx wrangler login
   ```

2. Set `PUBLIC_URL` in `wrangler.jsonc` to your Worker's URL. Deploy once to discover it
   (e.g. `https://hevy-mcp.<your-subdomain>.workers.dev`), or use a custom domain / route,
   then update `PUBLIC_URL` to match and redeploy.

3. Add the three secrets:

   ```bash
   npx wrangler secret put HEVY_API_KEY
   npx wrangler secret put MCP_PASSWORD
   npx wrangler secret put JWT_SECRET     # e.g. paste `openssl rand -hex 32`
   ```

4. Deploy:

   ```bash
   bun run cf:deploy      # = wrangler deploy
   ```

   Local dev against the real Workers runtime: copy `.dev.vars.example` to `.dev.vars`, set
   `PUBLIC_URL=http://localhost:8787` there, then `bun run cf:dev`.

## Connect from Claude

In the Claude app, add a custom connector pointing at `https://<your-domain>/mcp`. Leave
Client ID / Client Secret blank. Complete the OAuth prompt by entering `MCP_PASSWORD`, and
the Hevy tools become available.

## Security notes

This repo is safe to keep public: no secrets live in it. Access is guarded entirely by two
values you set as env vars / secrets — use a **strong `MCP_PASSWORD`** and keep `JWT_SECRET`
private (rotating `JWT_SECRET` invalidates existing tokens and forces re-authentication).

## Implementation notes

- The server runs **statelessly** — a fresh MCP server + transport per request — which is
  simplest and robust for a single user. It does not advertise a server→client SSE stream
  (GET `/mcp`); tool calls are request/response.
- Authorization codes are short-lived (5 min) signed JWTs and are not single-use within that
  window — an acceptable trade-off for a private, single-user server with no datastore.

## License

[MIT](./LICENSE)
