# GoVisual Stores — Team CRM

Static page (no server) for the GoVisual team to work through 288 Syrian businesses (184 original + 104 found on 2026-10-15) on Facebook and Instagram.

- **govisual-stores-full.html**: the same page as one self-contained file (~51 MB). Every logo, cover and product image is embedded, so it works anywhere with no other files: send it, open it offline.
- **index.html** — the team CRM (loads images from `assets/`, faster for GitHub Pages). Open it, pick your name (Yazan, Mosab, Ahmad, Kosay or Yasin), then claim stores and move them through the pipeline.
- **Pipeline:** Not started → Chosen → Contacting → Waiting for reply → Interested → Demo shown → Negotiation → Done ✓ (customer) / Rejected / Not suitable.
- **Win %:** estimated automatically from the stage plus how well the store fits GoVisual (category, no digital catalog yet, account reachable, phone known). You can override it by hand.
- **Dashboards:** "My dashboard" (follow-ups due, hottest leads, untouched claims, activity), "My pipeline" board, and "Team" leaderboard.
- **Sharing (cloud sync):** every claim, stage change, note, follow-up date and win % is saved automatically to Cloudflare R2 and shows up for the whole team within seconds (it checks every 20 s and when you come back to the tab). Each person enters the **team key** once per device on the "who are you?" screen. If you're offline, edits are kept in the browser and uploaded when the connection returns. When two people edit the same store, the newest edit wins and both histories are kept. JSON export/import still works as a manual backup.

Rebuild after editing the CSV or template: `python src/build.py`.

## Page checks (browser-verified store data)
Every store page was opened in headless Chrome (no login) and checked against what GoVisual needs: it sells real products, has no digital menu yet, is active, and has items we can build a catalog from.
- `data/stores/<ID>.json`: verdict (`qualified` / `maybe` / `not_qualified` / `unreachable`), reason, contact info, logo, cover, and up to 8 latest items (name, category, price or null, image).
- `assets/<ID>/`: resized logo, cover and item images.
- Re-check a store: `cd tools && npm i`, then from this folder `node tools/scrape.mjs <ID>`, review it, write the JSON, `python tools/save_store.py <ID>` and `python src/build.py`. Full procedure: `tools/AGENT_BRIEF.md`.

## Sync backend (`worker/`)
Cloudflare Worker `govisual-stores-api` (https://govisual-stores-api.codex-image-api.workers.dev) with R2 bucket `govisual-stores`.
- `GET /state` returns the whole team state; `POST /state` with `{data:{<id>:record}}` merges per store (newest `updatedAt` wins, histories joined). It uses an etag conditional write, so saves made at the same moment are never lost.
- Each request needs the `X-Team-Key` header (Worker secret `TEAM_KEY`; the key is kept out of git).
- A daily snapshot is written to `backups/YYYY-MM-DD.json` in the bucket.
- Deploy: `cd worker && npx wrangler deploy`. Change the key: `npx wrangler secret put TEAM_KEY`.
- End-to-end test (two browsers as two teammates): `node tools/sync_test.mjs <page-url> <team-key>`. It writes test data, so reset afterwards with `npx wrangler r2 object put govisual-stores/state.json --file <file containing {}> --remote`.
