# GoVisual Stores — Team CRM

Static page (no server) for the GoVisual team to work through 184 Syrian businesses on Facebook and Instagram.

- **index.html** — the team CRM. Open it, pick your name (Yazan, Mosab, Ahmad, Kosay or Yasin), then claim stores and move them through the pipeline.
- **Pipeline:** Not started → Chosen → Contacting → Waiting for reply → Interested → Demo shown → Negotiation → Done ✓ (customer) / Rejected / Not suitable.
- **Win %:** estimated automatically from the stage plus how well the store fits GoVisual (category, no digital catalog yet, account reachable, phone known). You can override it by hand.
- **Dashboards:** "My dashboard" (follow-ups due, hottest leads, untouched claims, activity), "My pipeline" board, and "Team" leaderboard.
- **Sharing:** your data is saved in your own browser. Use **Sync & Backup** to export your progress as JSON and import teammates' files. Files merge by keeping the newest update.

Rebuild after editing the CSV or template: `python src/build.py`.
