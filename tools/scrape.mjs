// Usage: node tools/scrape.mjs <STORE_ID> [--photos 24] [--scrolls 6]
// Opens the store's social page in headless Chrome (no login), collects profile info,
// latest posts (text + images) and photo-grid images, downloads them to tools/tmp/<id>/,
// and writes tools/tmp/<id>/raw.json plus page screenshots for visual review.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const id = args[0];
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 ? Number(args[i + 1]) : d; };
const MAX_PHOTOS = opt('photos', 24), SCROLLS = opt('scrolls', 6);
if (!id) { console.error('usage: node tools/scrape.mjs <STORE_ID>'); process.exit(2); }

// --- read store row from CSV (minimal CSV parser with quotes) ---
function parseCSV(txt) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === '"' && txt[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur.replace(/\r$/, '')); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
const csv = parseCSV(fs.readFileSync(path.join(ROOT, 'syria_social_profiles_facebook_instagram_expanded.csv'), 'utf8').replace(/^﻿/, ''));
const hd = csv[0];
const store = csv.slice(1).map(r => Object.fromEntries(hd.map((h, i) => [h, r[i] || '']))).find(r => r.id === id);
if (!store) { console.error('store not found: ' + id); process.exit(2); }

const OUT = path.join(ROOT, 'tools', 'tmp', id);
fs.mkdirSync(OUT, { recursive: true });
const raw = { id, name: store.name, url: store.url, instagram_url: store.instagram_url, scrapedAt: new Date().toISOString(), errors: [] };

const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ channel: 'chrome', args: ['--lang=ar'] });
const ctx = await browser.newContext({ locale: 'ar-SY', viewport: { width: 1280, height: 1000 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' });
const page = await ctx.newPage();

async function dismiss() {
  await page.keyboard.press('Escape').catch(() => {});
  for (const sel of ['[aria-label="إغلاق"]', '[aria-label="Close"]']) {
    const el = page.locator(sel).first();
    if (await el.isVisible().catch(() => false)) await el.click({ timeout: 2000 }).catch(() => {});
  }
}

async function download(url, name) {
  try {
    const res = await ctx.request.get(url, { timeout: 30000 });
    if (!res.ok()) return null;
    const ct = res.headers()['content-type'] || '';
    const ext = ct.includes('png') ? '.png' : ct.includes('webp') ? '.webp' : '.jpg';
    const file = path.join(OUT, name + ext);
    fs.writeFileSync(file, await res.body());
    return path.relative(ROOT, file).replaceAll('\\', '/');
  } catch { return null; }
}

try {
  await page.goto(store.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(5000); await dismiss();
  raw.finalUrl = page.url();
  raw.title = await page.title();
  Object.assign(raw, await page.evaluate(() => {
    const meta = p => document.querySelector(`meta[property="${p}"]`)?.content || '';
    const links = [...document.querySelectorAll('a[href]')].map(a => a.href);
    const external = [...new Set(links.map(h => { try { const u = new URL(h); if (u.hostname.includes('l.facebook.com')) return u.searchParams.get('u') || ''; return u.hostname.match(/facebook|fbcdn|meta\.com|messenger/) ? '' : h; } catch { return ''; } }).filter(Boolean))];
    const cover = document.querySelector('img[data-imgperflogname="profileCoverPhoto"]')?.src || '';
    return { ogTitle: meta('og:title'), ogDescription: meta('og:description'), ogImage: meta('og:image'), coverUrl: cover,
      headerText: document.body.innerText.slice(0, 2500), externalLinks: external.slice(0, 30) };
  }));
  raw.loginWall = /log in|تسجيل الدخول/i.test(raw.headerText) && raw.headerText.length < 300;
  raw.unavailable = /This content isn't available|هذا المحتوى غير متاح|الصفحة غير متاحة|Page not found/i.test(raw.headerText);
  raw.phones = [...new Set((raw.headerText.match(/(\+?963[\s-]?\d[\d\s-]{7,12}|09\d[\d\s-]{7,9})/g) || []).map(s => s.replace(/[\s-]/g, '')))];
  raw.whatsapp = raw.externalLinks.filter(l => /wa\.me|whatsapp/.test(l));
  raw.instagramLinks = raw.externalLinks.filter(l => /instagram\.com/.test(l));
  await page.screenshot({ path: path.join(OUT, 'page-top.png') });

  // posts: scroll and collect article text + large images
  const posts = new Map();
  for (let s = 0; s < SCROLLS; s++) {
    await dismiss();
    // expand truncated posts so prices hidden behind "see more" are captured
    const more = page.locator('[role="article"] div[role="button"]:text-matches("^(عرض المزيد|See more)$")');
    for (let k = 0, n = Math.min(await more.count().catch(() => 0), 8); k < n; k++) await more.nth(k).click({ timeout: 1500 }).catch(() => {});
    await sleep(400);
    const batch = await page.evaluate(() => [...document.querySelectorAll('[role="article"], div[data-pagelet^="TimelineFeedUnit"]')].map(a => {
      const text = (a.querySelector('[data-ad-preview="message"], [data-ad-comet-preview="message"]')?.innerText || a.innerText || '').slice(0, 1500);
      const imgs = [...a.querySelectorAll('img')].filter(i => (i.naturalWidth || i.width) >= 200 && /scontent|fbcdn/.test(i.src)).map(i => i.src);
      const link = [...a.querySelectorAll('a[href*="/posts/"], a[href*="/photo"], a[href*="story_fbid"], a[href*="/reel/"]')].map(x => x.href)[0] || '';
      return { text, imgs, link };
    }));
    for (const b of batch) { const k = b.text.slice(0, 120) + '|' + (b.imgs[0] || ''); if (!posts.has(k) && (b.text.trim() || b.imgs.length)) posts.set(k, b); }
    await page.mouse.wheel(0, 2200); await sleep(1800);
  }
  raw.posts = [...posts.values()].slice(0, 20);
  await page.screenshot({ path: path.join(OUT, 'page-posts.png') });

  // photos tab
  try {
    const base = raw.finalUrl.split('#')[0].split('?')[0].replace(/\/$/, '');
    const photosUrl = base.includes('profile.php') ? raw.finalUrl.split('#')[0] + '&sk=photos' : base + '/photos';
    await page.goto(photosUrl, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await sleep(4000); await dismiss();
    await page.mouse.wheel(0, 1500); await sleep(1500);
    raw.photoGrid = await page.evaluate(() => [...new Set([...document.querySelectorAll('img')].filter(i => (i.naturalWidth || i.width) >= 150 && /scontent|fbcdn/.test(i.src)).map(i => i.src))]);
    await page.screenshot({ path: path.join(OUT, 'page-photos.png') });
  } catch (e) { raw.errors.push('photos: ' + e.message); raw.photoGrid = []; }
} catch (e) { raw.errors.push('page: ' + e.message); }

// downloads
raw.files = {};
if (raw.ogImage) raw.files.logo = await download(raw.ogImage, 'logo');
if (raw.coverUrl) raw.files.cover = await download(raw.coverUrl, 'cover');
const imgUrls = [...new Set([...(raw.posts || []).flatMap(p => p.imgs), ...(raw.photoGrid || [])])].filter(u => u !== raw.ogImage).slice(0, MAX_PHOTOS);
raw.images = [];
for (let i = 0; i < imgUrls.length; i++) {
  const f = await download(imgUrls[i], 'img' + String(i + 1).padStart(2, '0'));
  if (f) raw.images.push({ file: f, url: imgUrls[i], postIndex: (raw.posts || []).findIndex(p => p.imgs.includes(imgUrls[i])) });
}
for (const p of raw.posts || []) p.imageFiles = p.imgs.map(u => raw.images.find(x => x.url === u)?.file).filter(Boolean);

fs.writeFileSync(path.join(OUT, 'raw.json'), JSON.stringify(raw, null, 1));
await browser.close();
console.log(JSON.stringify({ id, title: raw.title, unavailable: raw.unavailable, loginWall: raw.loginWall, phones: raw.phones, external: raw.externalLinks?.length, posts: raw.posts?.length || 0, images: raw.images.length, logo: !!raw.files.logo, errors: raw.errors, out: path.relative(ROOT, OUT) }));
