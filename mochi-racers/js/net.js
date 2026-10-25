// ======================================================================
//  Red P2P (WebRTC) sin servidor propio.
//  Señalización gratuita por dos vías a la vez (la que antes conecte):
//   · trackers WebTorrent públicos   · relés Nostr públicos
//  STUN públicos de Google y Cloudflare. TURN opcional en turn-config.js
// ======================================================================
import { joinTorrent, joinNostr } from '../lib/trystero.min.js';

const APP_ID = 'mochi-racers-online-eric-v1';
const STUN = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }, { urls: 'stun:stun.cloudflare.com:3478' }];

async function iceServers() {
  const cfg = window.MR_TURN || {}; let turn = Array.isArray(cfg.iceServers) ? cfg.iceServers : [];
  if (cfg.credentialsUrl) { try { const r = await fetch(cfg.credentialsUrl, { cache: 'no-store' }); const j = await r.json(); turn = [].concat(j.iceServers || j || []); } catch (e) { console.warn('TURN: no se pudieron pedir credenciales', e.message); } }
  return [...STUN, ...turn];
}

export class Net {
  constructor() { this.id = Math.random().toString(36).slice(2, 10); this.rooms = []; this.h = {}; this.seq = 0; this.seen = new Map(); this.peers = new Set(); this.on = (t, f) => (this.h[t] = f); }
  async join(room) {
    const ice = await iceServers(); const cfg = { appId: APP_ID, rtcConfig: { iceServers: ice } };
    // Servidor Cloudflare propio (si está configurado y responde): más fiable que el P2P
    const CF = window.OnlineCF;
    if (CF && CF.base() && await CF.check()) {
      try {
        const r = new CF.Room({ game: 'mochi-racers', room: String(room).replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 64), id: this.id, max: 8 });
        r.on('msg', d => this.recv(d));
        r.on('join', m => { this.peers.add('cf' + m.id); this.h.peer && this.h.peer(this.peers.size); });
        r.on('open', w => { for (const p of w.peers) this.peers.add('cf' + p.id); this.h.peer && this.h.peer(this.peers.size); });
        r.on('leave', m => { this.peers.delete('cf' + m.id); this.h.peer && this.h.peer(this.peers.size); });
        this.rooms.push({ name: 'cf', r: { leave: async () => r.close() }, send: d => r.send(d) });
        return;
      } catch (e) { console.warn('online cf', e.message); }
    }
    const strategies = [['torrent', joinTorrent], ['nostr', joinNostr]];
    if (/[?&]net=(torrent|nostr)/.test(location.search)) { const only = location.search.match(/net=(\w+)/)[1]; strategies.splice(0, 2, ...strategies.filter(s => s[0] === only)); }
    for (const [name, J] of strategies) {
      try {
        const r = J(cfg, room, { onJoinError: e => console.warn('señalización', name, e && e.error) });
        const [send, get] = (() => { const a = r.makeAction('m'); return [d => a.send(d).catch(() => {}), f => (a.onMessage = f)]; })();
        get((d, ctx) => this.recv(d));
        r.onPeerJoin = p => { this.peers.add(name + p); this.h.peer && this.h.peer(this.peers.size); };
        r.onPeerLeave = p => { this.peers.delete(name + p); this.h.peer && this.h.peer(this.peers.size); };
        this.rooms.push({ name, r, send });
      } catch (e) { console.warn('señalización', name, e.message); }
    }
  }
  send(t, data = {}) { const m = { ...data, t, f: this.id, s: ++this.seq }; for (const R of this.rooms) R.send(m); }
  recv(m) {
    if (!m || typeof m !== 'object' || m.f === this.id) return;
    const last = this.seen.get(m.f) || []; // descarta duplicados (llega por las dos vías)
    if (last.includes(m.s)) return; last.push(m.s); if (last.length > 64) last.shift(); this.seen.set(m.f, last);
    const f = this.h[m.t]; if (f) f(m);
  }
  async leave() { for (const R of this.rooms) { try { await R.r.leave(); } catch (e) {} } this.rooms = []; this.peers.clear(); }
}
