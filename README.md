# Balter, What's Up — Daily 9am Meeting

Password-gated via a Cloudflare Worker. See the walkthrough in chat for full
setup steps. Quick reference:

- `src/worker.js` — checks a signed session cookie on every request, serves
  `/login`, `/logout`, and falls through to the static site in `public/`
  once authenticated.
- `public/index.html` — the dashboard itself (syncs from the 9am Google Sheet).
- `public/weekly.html` — **Weekly Ops** page (linked from the "Weekly Executive Summary"
  button on the daily page). Reads the chosen day plus the 6 days before it from the
  sheet, groups the ticked Executive Summary points by section, shows an AI summary per
  section above the original points, and builds the weekly email (same format as the
  daily one). Each tile can redo its own AI summary, summaries can be edited by hand,
  and individual points can be removed (and restored); edits and removals are saved in
  that browser per week and are reflected in the email. Days without a tab (e.g. weekends) are skipped and shown as "no tab".
- `POST /api/summarize` — password-gated Worker route that writes the AI summaries.
  By default it uses Workers AI via the `AI` binding in `wrangler.jsonc` (no key needed).
  To use Claude instead, add a Worker Secret `ANTHROPIC_API_KEY` (optionally a Text
  variable `ANTHROPIC_MODEL`); it is used automatically when present. Keys never reach
  the browser. If AI fails, the page still shows the original points.
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
