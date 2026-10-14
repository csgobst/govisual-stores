# Store-check brief (for each reviewing agent)

Working dir: `C:\Users\yazan alrifae\Desktop\govisual\stores` (Bash: `cd "/c/Users/yazan alrifae/Desktop/govisual/stores"`).
GoVisual is a digital menu / catalog builder for Syrian businesses (logo, cover, categories, items with name, price in SYP or USD, and images; contact phones, WhatsApp, Instagram, Facebook).
**Goal:** for each store ID you were given, decide whether it is a good GoVisual customer, and collect the data we need to build its catalog demo.

## A good customer (verdict `qualified`)
1. It actually **sells something**: food, menu items, or physical products. A personal profile counts if it clearly operates as a shop.
2. It has **no digital menu or catalog yet**: no website shop, no menu link (QR menu, Linktree to a menu, an online store). A PDF, or photos of a printed price list, does NOT count as a digital menu; that is still a qualified lead.
3. It is **reachable and alive**: the page opens, and it has posts or products (ideally posted within the last ~6 months).
4. You can identify **at least 3 items** from its posts or photos.

Other verdicts:
- `maybe`: it sells, but something is uncertain (looks inactive, fewer than 3 identifiable items, or has a website you could not confirm as a catalog).
- `not_qualified`: not a seller, or it already has a digital menu or online store (put the link in `menu_link`).
- `unreachable`: the page is not found or removed, or only a login wall shows.

## Steps for each store (do them one store at a time)
1. `node tools/scrape.mjs <ID>`: opens the page in headless Chrome and writes `tools/tmp/<ID>/raw.json`, `logo.*`, `cover.*`, `imgNN.*` and screenshots `page-top.png`, `page-posts.png`, `page-photos.png`. If it errors or times out, retry once with `--scrolls 3`.
2. Read `raw.json` (`headerText` = bio, about, phones; `posts[]` = text plus `imageFiles`; `externalLinks`).
3. **Look at the images** with the Read tool (the screenshots plus the item images that look like products) to name each product and to read prices written on the photos. Keep it efficient: view the screenshots and up to ~12 candidate images.
4. Pick the **latest items** (up to 8, newest first; posts are already roughly newest first). Use only real products, not memes, greetings or ads with no product. Never invent a price: if no price is visible in the text or on the image, use `price: null`.
5. Write `data/stores/<ID>.json` (UTF-8) with exactly this shape:
```json
{
 "id": "SYMETA-002",
 "verdict": "qualified",
 "reason": "Arabic, one sentence: why",
 "sells": "Arabic, short: what they sell",
 "has_digital_menu": false,
 "menu_link": "",
 "page": {"title": "", "followers": "", "bio": "", "address": "", "phones": [], "whatsapp": "", "instagram": "", "last_activity": "e.g. 2026-09 or unknown"},
 "logo": "tools/tmp/SYMETA-002/logo.jpg",
 "cover": "tools/tmp/SYMETA-002/cover.jpg",
 "items": [
  {"name": "فناجين قهوة", "description": "", "category": "هدايا", "price": 75000, "currency": "SYP", "price_text": "75 ألف", "image": "tools/tmp/SYMETA-002/img03.jpg", "source_url": ""}
 ],
 "checkedAt": "ISO date"
}
```
   - `price` is a plain number in the stated currency (75 ألف → 75000; "15$" → 15 with currency "USD"), or null. `price_text` holds the original wording.
   - `logo` and `cover` are the downloaded files (use "" if missing). Each item's `image` must be one of the downloaded files.
6. `python tools/save_store.py <ID>`: resizes the chosen images into `assets/<ID>/` and validates the file. Fix the JSON if it reports an error.

## Rules
- Only touch `data/stores/<your IDs>.json`, `assets/<your IDs>/` and `tools/tmp/<your IDs>/`. Do not edit `index.html`, the CSV, `src/` or the tools.
- Do not log in, message, like or follow anything. Read only.
- Finish all of your IDs. If one fails twice, write it with verdict `unreachable` and the error as the reason, then move on.
- Final reply: one line per ID, `ID | verdict | items | priced | note`. Nothing else.
