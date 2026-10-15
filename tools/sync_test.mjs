// End-to-end check of cloud sync: two isolated browsers (two teammates) editing the CRM.
// Usage: node tools/sync_test.mjs <page-url> <team-key>
import { chromium } from 'playwright';

const [url, key] = process.argv.slice(2);
if (!url || !key) { console.error('usage: node tools/sync_test.mjs <page-url> <team-key>'); process.exit(1); }
const browser = await chromium.launch({ channel: 'chrome' });
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };

async function login(user, k = key) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('page error:', e.message));
  await page.goto(url);
  await page.fill('#pickKey', k);
  await page.click(`[data-user="${user}"]`);
  await page.waitForFunction(() => ['ok', 'err'].includes(document.getElementById('cloudDot').dataset.s), null, { timeout: 15000 });
  return page;
}
const sync = p => p.evaluate(async () => { await syncNow(true); return document.getElementById('cloudDot').dataset.s; });
const rec = (p, id) => p.evaluate(id => state[id] || null, id);

const a = await login('yazan');
ok(await a.evaluate(() => cloud.status) === 'ok', 'Yazan connected to the cloud');

// Yazan claims the first free store from the "all stores" page and writes a note on it
await a.evaluate(() => go('leads'));
const id = await a.getAttribute('[data-claim]', 'data-claim');
await a.click(`[data-claim="${id}"]`);
await a.click(`[data-open="${id}"]`);
await a.fill('#dnote', 'sync test note');
await a.click('#dsave');
await a.waitForFunction(() => dirty.size === 0 && cloud.status === 'ok', null, { timeout: 15000 });
ok(true, `Yazan claimed ${id} and the save reached the cloud`);

// Mosab, on a different browser, sees it
const b = await login('mosab');
await sync(b);
const rb = await rec(b, id);
ok(rb?.owner === 'yazan' && rb?.note === 'sync test note' && rb?.stage === 'chosen', 'Mosab sees Yazan\'s claim, stage and note');

// Mosab changes the stage of the same store and claims another; Yazan sees both
const id2 = await b.evaluate(() => ALL.find(x => !state[x.id]).id);
await b.evaluate(([id, id2]) => { update(id, { stage: 'contacting' }, 'test stage'); claim(id2); }, [id, id2]);
await b.waitForFunction(() => dirty.size === 0 && cloud.status === 'ok', null, { timeout: 15000 });
await sync(a);
const ra = await rec(a, id), ra2 = await rec(a, id2);
ok(ra?.stage === 'contacting' && ra?.note === 'sync test note' && ra.history.length >= 3, 'Yazan sees Mosab\'s stage change, note kept, history merged');
ok(ra2?.owner === 'mosab', 'Yazan sees Mosab\'s new claim');

// simultaneous edits on different stores from both browsers: nothing is lost
const [x1, x2] = await a.evaluate(() => ALL.filter(x => !state[x.id]).slice(0, 2).map(x => x.id));
await Promise.all([a.evaluate(i => claim(i), x1), b.evaluate(i => claim(i), x2)]);
await Promise.all([a, b].map(p => p.waitForFunction(() => dirty.size === 0 && cloud.status === 'ok', null, { timeout: 15000 })));
await sync(a); await sync(b);
ok((await rec(a, x2))?.owner === 'mosab' && (await rec(b, x1))?.owner === 'yazan', 'Simultaneous saves from both are both kept');

// a brand-new browser (empty local storage) gets everything back from the cloud
const c = await login('ahmad');
await sync(c);
ok((await rec(c, id))?.stage === 'contacting' && (await rec(c, x1))?.owner === 'yazan', 'Fresh browser restores all team data from the cloud');

// the user's pages: dashboard, board, team all render with the cloud data
for (const v of ['dash', 'board', 'leads', 'team', 'sync']) {
  await c.evaluate(v => go(v), v);
  ok(await c.isVisible('#v-' + v), `page "${v}" renders`);
}
ok((await c.textContent('#teamBody, #v-team')).includes('Yazan') || (await c.textContent('#v-team')).length > 0, 'team page has content');

// wrong key is rejected
const bad = await login('kosay', 'wrong-key');
ok(await bad.evaluate(() => cloud.status) === 'err', 'Wrong team key is rejected');

await browser.close();
console.log(process.exitCode ? 'SOME CHECKS FAILED' : 'ALL CHECKS PASSED');
console.log('test ids:', [id, id2, x1, x2].join(','));
