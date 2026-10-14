"""Build index.html from the stores CSV + template. Run: python src/build.py"""
import csv, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
FIELDS = ["id", "name", "gov", "city", "cat", "platform", "url", "instagram_url", "menu_url",
          "syria_evidence", "proof_type", "year", "source", "research_batch"]

with open(ROOT / "syria_social_profiles_facebook_instagram_expanded.csv", encoding="utf-8-sig", newline="") as f:
    rows = [{k: (r.get(k) or "").strip() for k in FIELDS} for r in csv.DictReader(f)]

# merge per-store check results written by the review agents (data/stores/<id>.json)
CHECK_KEYS = ["verdict", "reason", "sells", "has_digital_menu", "menu_link", "page", "logo", "cover", "items", "checkedAt"]
checked = 0
for r in rows:
    f = ROOT / "data" / "stores" / f"{r['id']}.json"
    if f.exists():
        c = json.loads(f.read_text(encoding="utf-8"))
        r["chk"] = {k: c.get(k) for k in CHECK_KEYS}
        checked += 1

data = json.dumps(rows, ensure_ascii=False, separators=(",", ":")).replace("</", r"<\/")
html = (ROOT / "src" / "template.html").read_text(encoding="utf-8").replace("/*__DATA__*/[]", data, 1)
(ROOT / "index.html").write_text(html, encoding="utf-8")
print(f"index.html built with {len(rows)} stores ({checked} checked)")
