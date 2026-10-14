"""Finalize one store: python tools/save_store.py <STORE_ID>

Reads data/stores/<ID>.json written by the reviewing agent. Every image path in it
(logo, cover, items[].image) that points at tools/tmp/... is resized (max 640px, JPEG q80)
into assets/<ID>/ and the JSON is rewritten to the new paths. Validates the schema.
"""
import json, sys, pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
VERDICTS = {"qualified", "maybe", "not_qualified", "unreachable"}

def fail(msg):
    print("ERROR:", msg); sys.exit(1)

sid = sys.argv[1]
src = ROOT / "data" / "stores" / f"{sid}.json"
if not src.exists(): fail(f"{src} missing")
d = json.loads(src.read_text(encoding="utf-8"))
if d.get("id") != sid: fail("id mismatch")
if d.get("verdict") not in VERDICTS: fail(f"verdict must be one of {VERDICTS}")
if not d.get("reason"): fail("reason required")
items = d.setdefault("items", [])
if not isinstance(items, list): fail("items must be a list")
out = ROOT / "assets" / sid
out.mkdir(parents=True, exist_ok=True)

def convert(p, name, size=640):
    if not p: return ""
    if p.startswith("assets/"): return p
    f = (ROOT / p).resolve()
    if not f.exists(): fail(f"image not found: {p}")
    im = Image.open(f).convert("RGB")
    im.thumbnail((size, size))
    dest = out / f"{name}.jpg"
    im.save(dest, "JPEG", quality=80, optimize=True, progressive=True)
    return dest.relative_to(ROOT).as_posix()

d["logo"] = convert(d.get("logo"), "logo", 256)
d["cover"] = convert(d.get("cover"), "cover", 960)
for i, it in enumerate(items, 1):
    if not it.get("name"): fail(f"item {i} has no name")
    it["image"] = convert(it.get("image"), f"item{i:02d}")
    if it.get("price") not in (None, "") and not isinstance(it["price"], (int, float)):
        fail(f"item {i} price must be a number or null (put original text in price_text)")
src.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"saved {sid}: verdict={d['verdict']} items={len(items)} priced={sum(1 for x in items if x.get('price'))} assets={len(list(out.glob('*.jpg')))}")
