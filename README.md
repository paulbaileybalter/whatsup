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
- The daily page's Executive Summary card is an AI summary (redo / edit) written from the Key Points and the Wins, saved per day in the browser and included in the handover email. The ticked sheet rows are listed in the Key Points card below it.
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

AI summaries are written only from the text typed into each point (plus its section name and day); the sheet's field/prompt names are never sent to the AI.

Weekly Ops also has an annual production gauge (fermenter graphic, default target 14,000,000 L, editable on the page; shown in the weekly email as a PNG image of the fermenter). The packaged-to-date litres are typed into the field and saved in that browser.

## Newsletter page (`public/newsletter.html`)

Linked from the "Newsletter" button on the 9AM page. It reads every day's tab for a calendar month (default: the previous month), combines the Key Points and Wins (repeats merged), and uses the AI route `POST /api/newsletter` for: Balter Legend of the Month shortlist, a summary for the chosen person, a month-in-review summary, topic ideas for "Around the Brewery", and an item per chosen topic. All AI output can be redone or edited, and is saved per month in the browser.

"Export to Slides" builds a `.pptx` in the browser (self-hosted `public/vendor/pptxgen.bundle.js`, Lexend font, assets in `public/assets/`) laid out like the "Around the brewery" slides in the September deck: black slide, three coloured cards per slide, photo placeholder, label, headline, ~70 words. Upload it to Google Drive and open it with Google Slides.

## Weekly Ops: annual target and end-of-year projections

- The Weekly Ops page shows the annual production target (read-only; the packaged total is entered on the Daily 9AM page).
- Drop the Live Brewery Board `.xlsx` onto the box on that page. It is read in the browser (nothing is uploaded) using the vendored SheetJS reader in `public/vendor/xlsx.mini.min.js`. Per day it sums the Cartons (rows 36-39) and Kegs (rows 40-43) quantities, and keeps only the board's latest year in this browser's localStorage (`balter_lbb_v1`).
- Two projections: packaged total + the board's plan to its last day (+ remaining days at the year's average), and packaged total + the year's average weekly volume x weeks left. Litres per carton (6 = 16 x 375 mL) and per keg (49.5) are editable under "Conversion assumptions".
- Both projections are included in the weekly email once a board has been loaded.

## Look & feel (16 Nov 2026)
All three pages share `public/theme.css` (loaded after each page's own styles), matching the Daily Packaging Handover site: Lexend (`public/fonts/`), white canvas, rising mint bubbles (`public/bubbles.js`), sticky four-colour top bar, top-accent-bar cards, `.btn` styling, favicons + `manifest.json`. The login page uses the same style; only the font and favicon are served before login. To tweak the look site-wide, edit `theme.css`.
