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

# --- single-file version: every logo, cover and item image embedded as base64 ---
import base64, io
from PIL import Image

SIZES = {"logo": 160, "cover": 720, "item": 420}

def data_uri(rel, kind):
    if not rel or not (ROOT / rel).exists():
        return rel or ""
    im = Image.open(ROOT / rel).convert("RGB")
    im.thumbnail((SIZES[kind], SIZES[kind]))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=72, optimize=True, progressive=True)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()

for r in rows:
    c = r.get("chk")
    if not c:
        continue
    c["logo"] = data_uri(c.get("logo"), "logo")
    c["cover"] = data_uri(c.get("cover"), "cover")
    for it in c.get("items") or []:
        it["image"] = data_uri(it.get("image"), "item")

full = json.dumps(rows, ensure_ascii=False, separators=(",", ":")).replace("</", r"<\/")
html_full = (ROOT / "src" / "template.html").read_text(encoding="utf-8").replace("/*__DATA__*/[]", full, 1)
(ROOT / "govisual-stores-full.html").write_text(html_full, encoding="utf-8")
print(f"govisual-stores-full.html built ({len(html_full) / 1e6:.1f} MB, all images embedded)")
