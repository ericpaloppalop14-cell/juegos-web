// =====================================================================
//  CLIENTE ONLINE COMÚN (servidor Cloudflare de los juegos de Eric)
//  - Si no hay URL o el servidor no responde: NO HACE NADA (todo igual).
//  - Si responde: salas por código, partida rápida, ranking, y un
//    sustituto compatible con PeerJS para los juegos que ya usaban PeerJS.
// =====================================================================
(function () {
  if (window.OnlineCF) return;
  const qs = new URLSearchParams(location.search);
  const fromQS = qs.get('online'); // ?online=https://...  (solo para probar)
  const base = () => String(fromQS || window.ONLINE_URL || '').trim().replace(/\/+$/, '');
  const wsBase = () => base().replace(/^http/, 'ws');
  const rnd = (n = 8) => Math.random().toString(36).slice(2, 2 + n);
  const safe = s => String(s || '').replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 64);
  const ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  class Em { constructor() { this._h = {}; } on(e, f) { (this._h[e] = this._h[e] || []).push(f); return this; } once(e, f) { const g = (...a) => { this.off(e, g); f(...a); }; return this.on(e, g); } off(e, f) { this._h[e] = (this._h[e] || []).filter(x => x !== f); return this; } emit(e, ...a) { for (const f of (this._h[e] || []).slice()) try { f(...a); } catch (x) { console.error(x); } } }

  let healthy = null, checking = null;
  function check(ms = 3000) {
    if (!base()) return Promise.resolve(false);
    if (healthy !== null) return Promise.resolve(healthy);
    if (checking) return checking;
    checking = new Promise(res => {
      let done = false; const fin = v => { if (!done) { done = true; healthy = v; res(v); } };
      const t = setTimeout(() => fin(false), ms);
      try { fetch(base() + '/health', { cache: 'no-store' }).then(r => r.text()).then(x => { clearTimeout(t); fin(x.trim() === 'ok'); }).catch(() => { clearTimeout(t); fin(false); }); } catch (e) { fin(false); }
    });
    return checking;
  }

  // ------------------------------------------------------------ Sala
  class Room extends Em {
    constructor(o) {
      super(); this.o = Object.assign({ max: 8 }, o); this.id = safe(o.id || rnd(10)); this.room = safe(o.room); this.peers = new Map();
      this.closed = false; this.ready = false; this.tries = 0; this.queue = []; this._connect();
    }
    _url() { const p = new URLSearchParams({ game: this.o.game, room: this.room, id: this.id, name: String(this.o.name || '').slice(0, 16), max: String(this.o.max) }); if (this.o.host) p.set('host', '1'); if (this.o.need) p.set('need', this.o.need); if (this.o.meta != null) p.set('meta', JSON.stringify(this.o.meta).slice(0, 600)); return wsBase() + '/ws?' + p; }
    _connect() {
      let ws; try { ws = new WebSocket(this._url()); } catch (e) { return this._fail('network'); }
      this.ws = ws; let last = Date.now();
      ws.onmessage = ev => {
        last = Date.now(); if (ev.data === 'pong') return; let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (m.t === 'welcome') { this.tries = 0; const first = !this.ready; this.ready = true; this.host = m.host; for (const p of m.peers) this.peers.set(p.id, p); const q = this.queue; this.queue = []; for (const s of q) ws.send(s); this.emit(first ? 'open' : 'reconnected', m); }
        else if (m.t === 'join') { this.peers.set(m.id, m); this.emit('join', m); }
        else if (m.t === 'leave') { this.peers.delete(m.id); this.emit('leave', m); }
        else if (m.t === 'host') { this.host = m.id; this.emit('host', m.id); }
        else if (m.t === 'msg') this.emit('msg', m.d, m.from);
        else if (m.t === 'error') { this.fatal = m.code; this.emit('error', { type: m.code }); }
      };
      clearInterval(this._ping);
      this._ping = setInterval(() => { if (ws.readyState === 1) { try { ws.send('ping'); } catch (e) { } if (Date.now() - last > 15000) try { ws.close(); } catch (e) { } } }, 5000);
      ws.onclose = () => {
        clearInterval(this._ping); if (this.closed) return;
        if (this.fatal || !this.ready && this.tries >= 2 || this.tries >= 6) return this._fail(this.fatal || 'network');
        this.tries++; this.emit('reconnecting', this.tries); setTimeout(() => !this.closed && this._connect(), Math.min(4000, 400 * 2 ** this.tries));
      };
      ws.onerror = () => { };
    }
    _fail(type) { if (this.closed) return; this.closed = true; clearInterval(this._ping); this.emit('close', { type }); }
    _raw(o) { const s = JSON.stringify(o); if (this.ws && this.ws.readyState === 1 && this.ready) this.ws.send(s); else if (this.queue.length < 200) this.queue.push(s); }
    send(d) { this._raw({ t: 'all', d }); }
    sendTo(to, d) { this._raw({ t: 'to', to, d }); }
    close() { if (this.closed) return; this.closed = true; clearInterval(this._ping); try { this.ws.close(1000); } catch (e) { } this.emit('close', { type: 'closed' }); }
  }

  // ---------------------------------------------- PeerJS compatible
  class Conn extends Em {
    constructor(peer, other, meta, out) { super(); this.peer = other; this._p = peer; this.metadata = meta; this.open = false; this.reliable = true; this.serialization = 'json'; this._out = out; this._buf = []; this.label = 'cf'; }
    _opened() { if (this.open) return; this.open = true; this.emit('open'); const b = this._buf; this._buf = []; for (const d of b) this.emit('data', d); }
    _data(d) { if (this.open) this.emit('data', d); else this._buf.push(d); }
    send(d) { if (this._closed) return; if (this._out) this._room.sendTo(this.peer, d); else this._p._inbox.sendTo(this.peer, d); }
    close() { if (this._closed) return; this._closed = true; this.open = false; if (this._out && this._room) this._room.close(); else this._p._inbox && this._p._inbox.sendTo(this.peer, { __cfbye: 1 }); this._p._conns.delete(this._key); this.emit('close'); }
  }
  function makePeerClass(game) {
    return class CFPeer extends Em {
      constructor(id, opts) {
        super(); if (id && typeof id === 'object') { opts = id; id = null; }
        this.id = safe(id || ('cf' + rnd(12))); this.open = false; this.destroyed = false; this.disconnected = false; this._conns = new Map(); this.options = opts || {};
        const r = this._inbox = new Room({ game, room: this.id, id: this.id, host: true, max: 16 });
        r.on('open', () => { this.open = true; this.emit('open', this.id); });
        r.on('join', m => { const c = new Conn(this, m.id, safeParse(m.meta), false); c._key = 'in:' + m.id; this._conns.set(c._key, c); this.emit('connection', c); setTimeout(() => c._opened(), 0); });
        r.on('msg', (d, from) => { const c = this._conns.get('in:' + from); if (!c) return; if (d && d.__cfbye) { c._closed = true; c.open = false; this._conns.delete(c._key); c.emit('close'); } else c._data(d); });
        r.on('leave', m => { const c = this._conns.get('in:' + m.id); if (c) { c._closed = true; c.open = false; this._conns.delete(c._key); c.emit('close'); } });
        r.on('error', e => this.emit('error', Object.assign(new Error(e.type), { type: e.type === 'taken' ? 'unavailable-id' : e.type === 'full' ? 'server-error' : 'network' })));
        r.on('reconnecting', () => { this.disconnected = true; this.emit('disconnected', this.id); });
        r.on('reconnected', () => { this.disconnected = false; });
        r.on('close', e => { if (this.destroyed) return; if (!this.open && e.type !== 'taken') this.emit('error', Object.assign(new Error('network'), { type: 'network' })); else if (e.type !== 'taken') { this.disconnected = true; this.emit('disconnected', this.id); } });
      }
      connect(other, opts = {}) {
        other = safe(other); const c = new Conn(this, other, opts.metadata, true); c._key = 'out:' + other + ':' + rnd(4); this._conns.set(c._key, c);
        const r = c._room = new Room({ game, room: other, id: this.id, need: 'host', max: 16, meta: opts.metadata });
        r.on('open', () => c._opened());
        r.on('msg', (d, from) => { if (from !== other) return; if (d && d.__cfbye) { r.close(); return; } c._data(d); });
        r.on('leave', m => { if (m.id === other) r.close(); });
        r.on('error', e => { if (e.type === 'nohost') this.emit('error', Object.assign(new Error('peer-unavailable'), { type: 'peer-unavailable' })); else c.emit('error', e); });
        r.on('close', () => { if (c._closed) return; c._closed = true; c.open = false; this._conns.delete(c._key); c.emit('close'); });
        return c;
      }
      reconnect() { }
      disconnect() { }
      destroy() { if (this.destroyed) return; this.destroyed = true; for (const c of [...this._conns.values()]) try { c.close(); } catch (e) { } this._inbox.close(); this.emit('close'); }
    };
  }
  function safeParse(s) { try { return s ? JSON.parse(s) : undefined; } catch (e) { return undefined; } }

  const OnlineCF = {
    version: 1, Room, check, base,
    get ready() { return healthy === true; },
    code(n = 4) { return Array.from({ length: n }, () => ABC[Math.floor(Math.random() * ABC.length)]).join(''); },
    async quick(game, max = 4) { const r = await fetch(base() + '/quick?game=' + encodeURIComponent(game) + '&max=' + max, { cache: 'no-store' }); return r.json(); },
    async submitScore(game, name, score, order) { if (!(await check())) return null; try { const r = await fetch(base() + '/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game, name, score, order }) }); return await r.json(); } catch (e) { return null; } },
    async top(game, order) { if (!(await check())) return null; try { const r = await fetch(base() + '/top?game=' + encodeURIComponent(game) + (order === 'asc' ? '&order=asc' : '')); return (await r.json()).top; } catch (e) { return null; } },
    Peer: makePeerClass,
    // Sustituye window.Peer (PeerJS) por el servidor Cloudflare SOLO si responde.
    async installPeer(game) {
      if (!(await check())) return false;
      if (window.Peer && !window.Peer.__cf) window.PeerJSOriginal = window.Peer;
      const P = makePeerClass(game); P.__cf = true; window.Peer = P;
      document.documentElement.dataset.online = 'cf'; return true;
    },
  };
  window.OnlineCF = OnlineCF;
  const g = document.currentScript && document.currentScript.dataset.peerGame;
  if (g && base()) OnlineCF.installPeer(g);
})();
