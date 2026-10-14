# Discovery brief: find NEW Syrian stores that qualify for GoVisual

Working dir: `C:\Users\yazan alrifae\Desktop\govisual\stores` (Bash: `cd "/c/Users/yazan alrifae/Desktop/govisual/stores"`).
Read `tools/AGENT_BRIEF.md` first. It defines what a **qualified** store is and the exact `data/stores/<ID>.json` format. Everything there applies here too.

**Your goal: save at least 10 NEW `qualified` stores** in your slice (region and category given in your prompt). Each one must be a Facebook or Instagram business page **inside Syria** that sells products or food, has **no digital menu or online shop**, is **active** (posts in 2026 if you can see dates), and has **at least 3 identifiable items**. Stores that are active in 2026 and show prices or have a phone number are the best.

## Finding candidates
- Use web search (load it with ToolSearch `select:WebSearch` if needed). Search in Arabic and English, e.g. `site:facebook.com متجر هدايا حلب`, `"اللاذقية" "للطلب" facebook ألبسة`, `instagram.com مطعم حمص`, `"دمشق" "توصيل" حلويات فيسبوك`. Also try business directories (syria.worldplaces.me, cybo, yellow pages, Google Maps listings that name a Facebook page) and lists such as "best restaurants in Hama". WebFetch can read those pages.
- Only use the store's own page URL (facebook.com/<page>, facebook.com/profile.php?id=…, facebook.com/people/…/<id>, or instagram.com/<user>). Never use groups, posts, search results or events.
- **Before checking a candidate:** `python tools/is_known.py <url>`. Skip anything that prints KNOWN (it is already in our list or another agent's).

## For each candidate
1. Write `data/candidates/<ID>.json` (UTF-8) using your own ID range from the prompt, in increasing order. Never reuse an ID.
```json
{"id":"SYX-0101","name":"store name as on the page","gov":"دمشق","city":"المزة","cat":"هدايا وهاند ميد","platform":"Facebook","url":"https://www.facebook.com/...","instagram_url":"","menu_url":"","menu_state":"not_observed_public","country_check":"syrian_address_on_page","access_audit":"opened_headless_no_login","syria_evidence":"Arabic: the address or phone on the page proving it is in Syria","proof_type":"صفحة المتجر نفسها","verified_platform":"فُتحت الصفحة دون تسجيل دخول","year":"2026","research_batch":"2026-10-15_expansion","origin":"agent_web_search","source":"the search result or directory URL where you found it","source_extra":""}
```
   - `gov` is one of: دمشق, ريف دمشق, حلب, حمص, حماة, اللاذقية, طرطوس, إدلب, الحسكة, الرقة, دير الزور, درعا, السويداء, القنيطرة.
   - `cat` is one of: مطاعم ومقاهي, حلويات ومخبوزات, هدايا وهاند ميد, ملابس وأحذية, عطور وتجميل, منزليات وديكور, قرطاسية وألعاب, إلكترونيات, مواد غذائية, متاجر متنوعة.
2. `node tools/scrape.mjs <ID>`. It reads the candidate file, opens the page, and downloads the logo and images to `tools/tmp/<ID>/`.
3. Review it exactly as in AGENT_BRIEF (read raw.json and look at the images).
4. **If it qualifies:** write `data/stores/<ID>.json` per AGENT_BRIEF, then run `python tools/save_store.py <ID>`.
   **If it does not qualify** (inside Syria but no menu, inactive, has a menu already, outside Syria, unreachable…): **delete** `data/candidates/<ID>.json` and do not write a stores file. Move to the next ID. Discarded IDs are simply skipped.
5. Keep going until you have **10 or more qualified stores saved**. Stop at 12.

## Rules
- Touch only your own IDs' files in `data/candidates/`, `data/stores/`, `assets/` and `tools/tmp/`. Never edit the CSV, `index.html`, `src/` or the tools.
- Read only: no login, messages, likes or follows.
- Do not invent anything. Names, prices, phones and addresses must come from the page.
- Final reply: one line per saved ID, `ID | name | gov | cat | items | priced`, then one line saying how many candidates you rejected.
