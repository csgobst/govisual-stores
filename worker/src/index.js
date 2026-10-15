// GoVisual stores team sync API. The whole team state lives in one R2 object (state.json):
// { "<storeId>": { owner, stage, note, ..., updatedAt, updatedBy, history:[...] } }
// POST merges per store (newest updatedAt wins, histories are unioned), using an R2 etag
// conditional write so two teammates saving at once never overwrite each other.
const KEY = 'state.json';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,X-Team-Key',
  'Access-Control-Max-Age': '86400',
};
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

function mergeRec(cur, v) {
  if (!cur) return v;
  const newer = (v.updatedAt || 0) > (cur.updatedAt || 0) ? v : cur;
  const seen = new Set();
  const history = [...(v.history || []), ...(cur.history || [])]
    .filter(h => { const k = h.t + '|' + h.u + '|' + h.a; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => b.t - a.t).slice(0, 40);
  return { ...newer, history };
}

async function load(env) {
  const obj = await env.BUCKET.get(KEY);
  if (!obj) return { data: {}, etag: null };
  return { data: await obj.json(), etag: obj.etag };
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(req.url);
    if (url.pathname === '/health') return json({ ok: true });
    if (url.pathname !== '/state') return json({ error: 'not found' }, 404);
    if (!env.TEAM_KEY || req.headers.get('X-Team-Key') !== env.TEAM_KEY) return json({ error: 'bad team key' }, 401);

    if (req.method === 'GET') {
      const { data, etag } = await load(env);
      return json({ data, version: etag, at: Date.now() });
    }
    if (req.method !== 'POST') return json({ error: 'method' }, 405);

    let body;
    try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
    const incoming = body && typeof body.data === 'object' ? body.data : null;
    if (!incoming) return json({ error: 'missing data' }, 400);
    const ids = Object.keys(incoming).filter(id => /^[\w-]{1,40}$/.test(id) && incoming[id] && typeof incoming[id] === 'object');
    if (ids.length > 2000 || JSON.stringify(incoming).length > 5e6) return json({ error: 'too large' }, 413);

    for (let attempt = 0; attempt < 6; attempt++) {
      const { data, etag } = await load(env);
      for (const id of ids) data[id] = mergeRec(data[id], incoming[id]);
      const text = JSON.stringify(data);
      const put = await env.BUCKET.put(KEY, text, {
        httpMetadata: { contentType: 'application/json' },
        ...(etag ? { onlyIf: { etagMatches: etag } } : {}),
      });
      if (put) {
        // one snapshot per day, so a bad import can always be rolled back
        const day = 'backups/' + new Date().toISOString().slice(0, 10) + '.json';
        if (!(await env.BUCKET.head(day))) await env.BUCKET.put(day, text);
        return json({ data, version: put.etag, saved: ids.length, at: Date.now() });
      }
      await new Promise(r => setTimeout(r, 50 + Math.random() * 150 * (attempt + 1)));
    }
    return json({ error: 'busy, retry' }, 409);
  },
};
