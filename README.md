# Balter, What's Up — Daily 9am Meeting

Password-gated via a Cloudflare Worker. See the walkthrough in chat for full
setup steps. Quick reference:

- `src/worker.js` — checks a signed session cookie on every request, serves
  `/login`, `/logout`, and falls through to the static site in `public/`
  once authenticated.
- `public/index.html` — the dashboard itself (syncs from the 9am Google Sheet).
- Secrets required in the Worker (Settings → Variables and Secrets, type
  **Secret**): `SITE_PASSWORD`, `SESSION_SECRET`.

## Local dev

```
npm install
npm run dev
```

Note: the session cookie is marked `Secure`, so login won't persist under
plain `http://localhost` — test the real login flow after deploying, or
temporarily view the rendered `/login` page locally without submitting it.

## Deploy

Connected via Cloudflare Workers Builds (Git integration) — push to the
connected branch and Cloudflare builds and deploys automatically. No
drag-and-drop; Workers Builds is required since this runs a Worker script,
not just static assets.
