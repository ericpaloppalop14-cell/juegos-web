// =====================================================================
//  SERVIDOR ONLINE ÚNICO para todos los juegos de Eric
//  Cloudflare Worker + Durable Objects (SQLite, válido en plan gratis)
//
//  GET  /health                       -> "ok"
//  GET  /ws?game=G&room=R&id=I&name=N[&host=1][&need=host][&max=8]  (WebSocket)
//  GET  /quick?game=G&max=4           -> {room}  emparejamiento rápido
//  POST /score {game,name,score,order?} -> guarda en el ranking
//  GET  /top?game=G[&order=asc]       -> top 20
//
//  Mensajes del cliente:  "ping" | {t:'all',d} | {t:'to',to,d}
//  Mensajes del servidor: "pong" | {t:'welcome',id,room,host,peers}
//      {t:'join',id,name,host} {t:'leave',id} {t:'host',id} {t:'msg',from,d}
//      {t:'error',code}  (taken | nohost | full | bad | rate | big)
// =====================================================================
const RE_GAME = /^[a-z0-9-]{1,32}$/;
const RE_ROOM = /^[A-Za-z0-9_.-]{1,64}$/;
const RE_ID = /^[A-Za-z0-9_.-]{1,64}$/;
const MAX_MSG = 16 * 1024;          // 16 KB por mensaje
const RATE = 60, BURST = 120;       // mensajes/segundo por jugador
const GRACE_MS = 12000;             // tiempo para reconectar sin perder el sitio
const ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const code = (n = 5) => Array.from({ length: n }, () => ABC[Math.floor(Math.random() * ABC.length)]).join('');

function cors(req, env) {
  const o = req.headers.get('Origin') || '';
  const list = String(env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());
  const ok = list.includes('*') || !o || list.some(a => o === a || o.startsWith(a + ':'));
  return { ok, h: { 'Access-Control-Allow-Origin': ok ? (o || '*') : 'null', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' } };
}
const json = (o, h = {}, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', ...h } });

export default {
  async fetch(req, env) {
    const url = new URL(req.url); const { ok, h } = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { headers: h });
    if (url.pathname === '/health' || url.pathname === '/') return new Response('ok', { headers: h });
    if (!ok) return json({ error: 'origin' }, h, 403);
    const game = url.searchParams.get('game') || '';
    if (url.pathname === '/ws') {
      const room = url.searchParams.get('room') || '';
      if (!RE_GAME.test(game) || !RE_ROOM.test(room)) return json({ error: 'bad' }, h, 400);
      if (req.headers.get('Upgrade') !== 'websocket') return json({ error: 'upgrade' }, h, 426);
      return env.ROOMS.get(env.ROOMS.idFromName(game + ':' + room)).fetch(req);
    }
    if (url.pathname === '/quick') {
      if (!RE_GAME.test(game)) return json({ error: 'bad' }, h, 400);
      const r = await env.LOBBY.get(env.LOBBY.idFromName(game)).fetch(req);
      return json(await r.json(), h);
    }
    if (url.pathname === '/score' && req.method === 'POST') {
      let b; try { b = await req.json(); } catch (e) { return json({ error: 'bad' }, h, 400); }
      if (!RE_GAME.test(b.game || '')) return json({ error: 'bad' }, h, 400);
      const ip = req.headers.get('CF-Connecting-IP') || 'x';
      const r = await env.BOARD.get(env.BOARD.idFromName(b.game)).fetch('https://b/score', { method: 'POST', body: JSON.stringify({ ...b, ip }) });
      return json(await r.json(), h, r.status);
    }
    if (url.pathname === '/top') {
      if (!RE_GAME.test(game)) return json({ error: 'bad' }, h, 400);
      const r = await env.BOARD.get(env.BOARD.idFromName(game)).fetch('https://b/top' + url.search);
      return json(await r.json(), h);
    }
    return json({ error: 'notfound' }, h, 404);
  },
};

// ---------------------------------------------------------------- SALA
export class Room {
  constructor(state, env) {
    this.state = state; this.env = env; this.bucket = new Map();
    state.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }
  live() { return this.state.getWebSockets().map(ws => ({ ws, a: ws.deserializeAttachment() || {} })).filter(x => x.a.id); }
  async away() { return (await this.state.storage.get('away')) || {}; }
  send(ws, o) { try { ws.send(typeof o === 'string' ? o : JSON.stringify(o)); } catch (e) { } }
  bcast(o, exceptId) { const s = JSON.stringify(o); for (const { ws, a } of this.live()) if (a.id !== exceptId) this.send(ws, s); }
  async fetch(req) {
    const url = new URL(req.url); const q = url.searchParams;
    const id = q.get('id') || ''; const name = String(q.get('name') || '').slice(0, 16); const pmeta = String(q.get('meta') || '').slice(0, 600);
    const wantHost = q.get('host') === '1'; const needHost = q.get('need') === 'host';
    const max = Math.max(2, Math.min(16, parseInt(q.get('max') || '8', 10) || 8));
    const pair = new WebSocketPair(); const [client, server] = Object.values(pair);
    const fail = c => { server.accept(); this.send(server, { t: 'error', code: c }); server.close(4000, c); return new Response(null, { status: 101, webSocket: client }); };
    if (!RE_ID.test(id)) return fail('bad');
    const live = this.live(); const away = await this.away();
    const meta = (await this.state.storage.get('meta')) || { host: null, max };
    const hostAlive = meta.host && (live.some(x => x.a.id === meta.host) || away[meta.host]);
    if (wantHost && hostAlive && meta.host !== id) return fail('taken');
    if (needHost && !hostAlive) return fail('nohost');
    const old = live.filter(x => x.a.id === id);                // reconexión con el mismo id
    const isBack = old.length > 0 || !!away[id];
    if (!isBack && live.length >= meta.max) return fail('full');
    for (const o of old) { try { o.ws.serializeAttachment({}); o.ws.close(4001, 'replaced'); } catch (e) { } }
    if (away[id]) { delete away[id]; await this.state.storage.put('away', away); }
    if (wantHost) meta.host = id;
    if (!live.length && !Object.keys(away).length) meta.max = max;
    await this.state.storage.put('meta', meta);
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ id, name, meta: pmeta, host: meta.host === id });
    const peers = this.live().filter(x => x.a.id !== id).map(x => ({ id: x.a.id, name: x.a.name, meta: x.a.meta, host: x.a.id === meta.host }));
    this.send(server, { t: 'welcome', id, room: q.get('room'), host: meta.host, peers, back: isBack });
    if (!isBack) this.bcast({ t: 'join', id, name, meta: pmeta, host: meta.host === id }, id);
    return new Response(null, { status: 101, webSocket: client });
  }
  rate(id) {
    const now = Date.now(); let b = this.bucket.get(id) || { n: BURST, t: now };
    b.n = Math.min(BURST, b.n + (now - b.t) / 1000 * RATE); b.t = now;
    if (b.n < 1) { this.bucket.set(id, b); return false; } b.n -= 1; this.bucket.set(id, b); return true;
  }
  async webSocketMessage(ws, msg) {
    const a = ws.deserializeAttachment() || {}; if (!a.id) return;
    const size = typeof msg === 'string' ? msg.length : msg.byteLength;
    if (size > MAX_MSG) return this.send(ws, { t: 'error', code: 'big' });
    if (!this.rate(a.id)) { a.strikes = (a.strikes || 0) + 1; ws.serializeAttachment(a); if (a.strikes > 200) ws.close(4008, 'rate'); return; }
    if (msg === 'ping') return this.send(ws, 'pong');
    let m; try { m = JSON.parse(msg); } catch (e) { return; }
    if (m.t === 'all') this.bcast({ t: 'msg', from: a.id, d: m.d }, a.id);
    else if (m.t === 'to') { const s = JSON.stringify({ t: 'msg', from: a.id, d: m.d }); for (const x of this.live()) if (x.a.id === m.to) this.send(x.ws, s); }
  }
  async gone(ws) {
    const a = ws.deserializeAttachment() || {}; if (!a.id) return;
    try { ws.serializeAttachment({}); } catch (e) { }
    if (this.live().some(x => x.a.id === a.id)) return;          // ya reconectó
    const away = await this.away(); away[a.id] = Date.now() + GRACE_MS; await this.state.storage.put('away', away);
    const cur = await this.state.storage.getAlarm(); if (!cur) await this.state.storage.setAlarm(Date.now() + GRACE_MS);
  }
  async webSocketClose(ws) { await this.gone(ws); }
  async webSocketError(ws) { await this.gone(ws); }
  async alarm() {
    const away = await this.away(); const now = Date.now(); let next = 0;
    const meta = (await this.state.storage.get('meta')) || {};
    for (const [id, t] of Object.entries(away)) {
      if (t <= now) { delete away[id]; this.bcast({ t: 'leave', id }); if (meta.host === id) { meta.host = null; this.bcast({ t: 'host', id: null }); } }
      else next = next ? Math.min(next, t) : t;
    }
    await this.state.storage.put('away', away); await this.state.storage.put('meta', meta);
    if (next) await this.state.storage.setAlarm(next);
    else if (!this.live().length) await this.state.storage.deleteAll();   // sala vacía: se borra
  }
}

// ------------------------------------------------ EMPAREJAMIENTO RÁPIDO
export class Lobby {
  constructor(state) { this.state = state; this.cur = null; }
  async fetch(req) {
    const q = new URL(req.url).searchParams; const max = Math.max(2, Math.min(8, parseInt(q.get('max') || '4', 10) || 4));
    const now = Date.now(); const k = 'm' + max;
    this.cur = this.cur || {}; let c = this.cur[k];
    if (!c || c.n >= max || now - c.t > 25000) c = this.cur[k] = { room: 'Q' + code(6), n: 0, t: now };
    c.n++;
    return Response.json({ room: c.room, slot: c.n, max, first: c.n === 1 });
  }
}

// ------------------------------------------------------------- RANKING
export class Board {
  constructor(state) {
    this.state = state; this.sql = state.storage.sql; this.hits = new Map();
    this.sql.exec('CREATE TABLE IF NOT EXISTS s (name TEXT, score REAL, ord TEXT, t INTEGER)');
  }
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/top') {
      const ord = url.searchParams.get('order') === 'asc' ? 'asc' : 'desc';
      const rows = this.sql.exec(`SELECT name, score, t FROM s WHERE ord = ? ORDER BY score ${ord.toUpperCase()} LIMIT 20`, ord).toArray();
      return Response.json({ top: rows });
    }
    const b = await req.json(); const now = Date.now();
    const h = (this.hits.get(b.ip) || []).filter(t => now - t < 60000); if (h.length >= 10) return Response.json({ error: 'rate' }, { status: 429 });
    h.push(now); this.hits.set(b.ip, h);
    const score = Number(b.score); const ord = b.order === 'asc' ? 'asc' : 'desc';
    if (!isFinite(score) || score < 0 || score > 1e9) return Response.json({ error: 'bad' }, { status: 400 });
    const name = String(b.name || 'Anónimo').replace(/[<>]/g, '').slice(0, 16) || 'Anónimo';
    this.sql.exec('INSERT INTO s VALUES (?, ?, ?, ?)', name, score, ord, now);
    // solo guardamos los 100 mejores de cada orden
    this.sql.exec(`DELETE FROM s WHERE ord = ? AND rowid NOT IN (SELECT rowid FROM s WHERE ord = ? ORDER BY score ${ord.toUpperCase()} LIMIT 100)`, ord, ord);
    const pos = this.sql.exec(`SELECT COUNT(*) AS n FROM s WHERE ord = ? AND score ${ord === 'asc' ? '<' : '>'} ?`, ord, score).one().n + 1;
    return Response.json({ ok: true, pos });
  }
}
