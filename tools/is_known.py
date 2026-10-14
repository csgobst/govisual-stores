"""Check whether a page is already in our list: python tools/is_known.py <url> [<url> ...]

Compares a normalized form of each URL against the CSV and data/candidates/*.json.
Prints KNOWN or NEW per URL.
"""
import csv, json, pathlib, re, sys
from urllib.parse import urlparse, parse_qs

ROOT = pathlib.Path(__file__).resolve().parent.parent

def norm(u):
    u = (u or "").strip()
    if not u:
        return ""
    p = urlparse(u if "://" in u else "https://" + u)
    host = re.sub(r"^(www|m|web|mbasic|ar-ar|ar)\.", "", p.netloc.lower())
    if p.path.startswith("/profile.php"):
        return host + "/id/" + parse_qs(p.query).get("id", [""])[0]
    parts = [x for x in p.path.lower().split("/") if x]
    if parts[:1] == ["people"] and len(parts) >= 3:
        return host + "/id/" + parts[2]
    if parts[:1] == ["p"] and len(parts) >= 2:  # fb /p/Name-12345/
        m = re.search(r"(\d{6,})$", parts[1])
        return host + "/id/" + (m.group(1) if m else parts[1])
    if parts and parts[0].isdigit():  # facebook.com/<numeric id>/
        return host + "/id/" + parts[0]
    return host + "/" + "/".join(parts[:1])

if __name__ == "__main__":
  known = set()
  for r in csv.DictReader(open(ROOT / "syria_social_profiles_facebook_instagram_expanded.csv", encoding="utf-8-sig")):
      known |= {norm(r["url"]), norm(r.get("instagram_url"))}
  for f in (ROOT / "data" / "candidates").glob("*.json"):
      c = json.loads(f.read_text(encoding="utf-8"))
      known |= {norm(c.get("url")), norm(c.get("instagram_url"))}
  known.discard("")
  for u in sys.argv[1:]:
      print(("KNOWN " if norm(u) in known else "NEW   ") + u)
