# Hevy MCP Server

A single-user remote [MCP](https://modelcontextprotocol.io) server that exposes the
[Hevy](https://www.hevyapp.com/) workout API to Claude. It speaks the full MCP protocol
over Streamable HTTP at `/mcp` and is protected by a minimal, stateless OAuth 2.1 flow so
it can be added as a **custom connector in the Claude app** — including on mobile, on the go.

- **Runtime:** Bun + [Hono](https://hono.dev/), bridged to the MCP SDK via [`@hono/mcp`](https://www.npmjs.com/package/@hono/mcp).
- **Auth:** single-user OAuth 2.1 (PKCE S256), all state held in signed JWTs — **no database**.
- **Hevy:** a single `api-key` from an environment variable.

## Why OAuth (and not just a token)?

As of 2026 the Claude app's custom-connector UI only accepts **OAuth** — it does not let
you paste a static bearer token or custom header. So this server implements a tiny
single-user OAuth provider: when you connect, Claude sends you to a login page where you
enter `MCP_PASSWORD`; on success it receives an access token (a signed JWT) that it then
presents to `/mcp`. Nothing is persisted — the password gates the flow and PKCE + JWT
signatures secure it.

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

Copy `.env.example` to `.env` and fill in:

| Variable        | Description                                                                 |
| --------------- | --------------------------------------------------------------------------- |
| `HEVY_API_KEY`  | Your Hevy API key (Hevy app → Settings → Developer).                         |
| `MCP_PASSWORD`  | The password you type on the OAuth login page when connecting Claude.        |
| `JWT_SECRET`    | Random ≥32-char secret for signing JWTs. `openssl rand -hex 32`.            |
| `PUBLIC_URL`    | Public HTTPS base URL (no trailing slash). Must match the deployed domain.   |
| `PORT`          | Port to listen on (default `3000`).                                          |

## Run locally

```bash
bun install
bun run dev        # or: bun run start
```

Then point an MCP client at `http://localhost:3000/mcp`, e.g.:

```bash
npx @modelcontextprotocol/inspector
```

It will discover the OAuth metadata, open the login page (enter `MCP_PASSWORD`), and then
let you list/call tools.

## Deploy (Docker / Coolify)

The included `Dockerfile` runs on `oven/bun`. In Coolify:

1. Create a new resource from this repo (Dockerfile build).
2. Set the environment variables above. Set `PUBLIC_URL` to the domain Coolify assigns
   (Traefik provisions TLS automatically).
3. Health check path: `/health`.
4. Deploy.

## Connect from Claude

In the Claude app, add a custom connector pointing at `https://<your-domain>/mcp`.
Complete the OAuth prompt by entering `MCP_PASSWORD`, and the Hevy tools become available.

## Notes

- The server runs **statelessly** — a fresh MCP server + transport per request — which is
  simplest and robust for a single user. The server does not advertise a server→client SSE
  stream (GET `/mcp`); tool calls are request/response.
- Authorization codes are short-lived (5 min) signed JWTs. They are not single-use within
  that window — an acceptable trade-off for a private, single-user server with no datastore.
