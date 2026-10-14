# GoVisual Stores — Team CRM

Static page (no server) for the GoVisual team to work through 184 Syrian businesses on Facebook and Instagram.

- **govisual-stores-full.html**: the same page as one self-contained file (~27 MB). Every logo, cover and product image is embedded, so it works anywhere with no other files: send it, open it offline.
- **index.html** — the team CRM (loads images from `assets/`, faster for GitHub Pages). Open it, pick your name (Yazan, Mosab, Ahmad, Kosay or Yasin), then claim stores and move them through the pipeline.
- **Pipeline:** Not started → Chosen → Contacting → Waiting for reply → Interested → Demo shown → Negotiation → Done ✓ (customer) / Rejected / Not suitable.
- **Win %:** estimated automatically from the stage plus how well the store fits GoVisual (category, no digital catalog yet, account reachable, phone known). You can override it by hand.
- **Dashboards:** "My dashboard" (follow-ups due, hottest leads, untouched claims, activity), "My pipeline" board, and "Team" leaderboard.
- **Sharing:** your data is saved in your own browser. Use **Sync & Backup** to export your progress as JSON and import teammates' files. Files merge by keeping the newest update.

Rebuild after editing the CSV or template: `python src/build.py`.

## Page checks (browser-verified store data)
Every store page was opened in headless Chrome (no login) and checked against what GoVisual needs: it sells real products, has no digital menu yet, is active, and has items we can build a catalog from.
- `data/stores/<ID>.json`: verdict (`qualified` / `maybe` / `not_qualified` / `unreachable`), reason, contact info, logo, cover, and up to 8 latest items (name, category, price or null, image).
- `assets/<ID>/`: resized logo, cover and item images.
- Re-check a store: `cd tools && npm i`, then from this folder `node tools/scrape.mjs <ID>`, review it, write the JSON, `python tools/save_store.py <ID>` and `python src/build.py`. Full procedure: `tools/AGENT_BRIEF.md`.
