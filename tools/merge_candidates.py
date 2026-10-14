"""Append checked new prospects to the CSV: python tools/merge_candidates.py

Takes every data/candidates/<ID>.json that has a matching data/stores/<ID>.json,
drops duplicates (same normalized page URL as an existing row or an earlier candidate),
and appends the rest to the CSV with the same columns. Duplicates are reported, not deleted.
"""
import csv, json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from is_known import norm  # noqa: E402  (is_known only prints when run as a script)

ROOT = pathlib.Path(__file__).resolve().parent.parent
CSV = ROOT / "syria_social_profiles_facebook_instagram_expanded.csv"
with open(CSV, encoding="utf-8-sig", newline="") as f:
    reader = csv.DictReader(f)
    fields, rows = reader.fieldnames, list(reader)
have_ids = {r["id"] for r in rows}
seen = {norm(r["url"]) for r in rows}
added, dupes, unchecked = [], [], []
for cf in sorted((ROOT / "data" / "candidates").glob("*.json")):
    c = json.loads(cf.read_text(encoding="utf-8"))
    if c["id"] in have_ids:
        continue
    if not (ROOT / "data" / "stores" / f"{c['id']}.json").exists():
        unchecked.append(c["id"]); continue
    key = norm(c["url"])
    if key in seen:
        dupes.append(c["id"]); continue
    seen.add(key)
    rows.append({k: str(c.get(k, "") or "") for k in fields})
    added.append(c["id"])
with open(CSV, "w", encoding="utf-8-sig", newline="") as f:
    w = csv.DictWriter(f, fieldnames=fields); w.writeheader(); w.writerows(rows)
print(f"added {len(added)} | duplicates skipped {dupes} | candidates without a check {unchecked} | total rows {len(rows)}")
