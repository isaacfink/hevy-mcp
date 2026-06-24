// Minimal HTML login page shown at GET /authorize. It re-posts to the same
// endpoint with the OAuth parameters preserved as hidden fields plus the password.

interface LoginPageParams {
  client_id: string;
  redirect_uri: string;
  state: string;
  code_challenge: string;
  code_challenge_method: string;
  scope: string;
  resource: string;
  error?: string;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function loginPage(p: LoginPageParams): string {
  const hidden = (
    ["client_id", "redirect_uri", "state", "code_challenge", "code_challenge_method", "scope", "resource"] as const
  )
    .map((k) => `<input type="hidden" name="${k}" value="${esc(p[k] ?? "")}" />`)
    .join("\n      ");

  const errorHtml = p.error
    ? `<p style="color:#c0392b;margin:0 0 16px">${esc(p.error)}</p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Connect to Hevy MCP</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; background: #0f1115; color: #e6e6e6;
           display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; }
    .card { background: #1a1d24; padding: 32px; border-radius: 14px; width: 320px; box-shadow: 0 10px 40px rgba(0,0,0,.4); }
    h1 { font-size: 18px; margin: 0 0 4px; }
    p.sub { color: #9aa0aa; font-size: 13px; margin: 0 0 24px; }
    label { display: block; font-size: 13px; margin: 0 0 8px; color: #c4c9d2; }
    input[type=password] { width: 100%; box-sizing: border-box; padding: 12px; border-radius: 8px;
           border: 1px solid #2c3038; background: #0f1115; color: #fff; font-size: 15px; }
    button { width: 100%; margin-top: 16px; padding: 12px; border: 0; border-radius: 8px;
           background: #4f7cff; color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; }
    button:hover { background: #3f6cef; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Hevy MCP</h1>
    <p class="sub">Enter your password to authorize this connection.</p>
    ${errorHtml}
    <form method="POST" action="/authorize">
      ${hidden}
      <label for="password">Password</label>
      <input id="password" type="password" name="password" autocomplete="current-password" autofocus required />
      <button type="submit">Authorize</button>
    </form>
  </div>
</body>
</html>`;
}
