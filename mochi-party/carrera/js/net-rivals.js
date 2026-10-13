// ======================================================================
//  RED: partidas online P2P con WebRTC (PeerJS, broker público gratuito)
//  El anfitrión (host) manda: salida, objetos y clasificación final.
//  Topología en estrella: cada invitado habla solo con el anfitrión,
//  que reenvía a los demás.
// ======================================================================
import { CONFIG as C0 } from './data.js';
const CONFIG = { ...C0, peerPrefix: 'mochirivals-v1-', maxOnline: 6 };
const ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const genCode = () => Array.from({ length: 4 }, () => ABC[Math.floor(Math.random() * ABC.length)]).join('');
export const netAvailable = () => typeof window.Peer === 'function';

export class Net {
  constructor() { this.peer = null; this.conns = new Map(); this.players = []; this.isHost = false; this.myId = null; this.code = null; this.handlers = {}; this.started = false; this.route = 0; this.alive = true; this.nextId = 1; }
  on(ev, f) { this.handlers[ev] = f; return this; }
  emit(ev, ...a) { const f = this.handlers[ev]; if (f) try { f(...a); } catch (e) { console.error(e); } }
  _peer(id) {
    return new Promise((res, rej) => {
      if (!netAvailable()) return rej(new Error('broker'));
      let done = false; const opts = { debug: 0, config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] } };
      if (CONFIG.peerServer) Object.assign(opts, CONFIG.peerServer);
      const p = id ? new window.Peer(id, opts) : new window.Peer(opts);
      const to = setTimeout(() => { if (!done) { done = true; try { p.destroy(); } catch (e) { } rej(new Error('broker')); } }, 10000);
      p.on('open', () => { if (done) return; done = true; clearTimeout(to); res(p); });
      p.on('error', e => { if (!done) { done = true; clearTimeout(to); try { p.destroy(); } catch (x) { } rej(new Error(e.type === 'unavailable-id' ? 'taken' : 'broker')); } else this._err(e); });
    });
  }
  _err(e) {
    if (e.type === 'peer-unavailable') { if (this._joinRej) { this._joinRej(new Error('nosala')); this._joinRej = null; } return; }
    if (['network', 'server-error', 'socket-error', 'socket-closed'].includes(e.type)) { /* el broker solo se necesita para conectar; la partida sigue por P2P */ }
  }
  // ---------------- anfitrión ----------------
  async create(name, ch) {
    for (let tries = 0; tries < 4; tries++) {
      const code = genCode();
      try { this.peer = await this._peer(CONFIG.peerPrefix + code); this.code = code; break; }
      catch (e) { if (e.message !== 'taken') throw e; }
    }
    if (!this.peer) throw new Error('broker');
    this.isHost = true; this.myId = 'h'; this.players = [{ id: 'h', name, ch, host: true }];
    this.peer.on('connection', c => this._hostConn(c));
    this.peer.on('disconnected', () => { try { if (!this.started) this.peer.reconnect(); } catch (e) { } });
    return this.code;
  }
  _hostConn(c) {
    c.on('data', d => {
      if (d.t === 'hello') {
        if (this.started || this.players.length >= CONFIG.maxOnline) { c.send({ t: 'full', started: this.started }); setTimeout(() => c.close(), 300); return; }
        const id = 'p' + (this.nextId++); c.pid = id; this.conns.set(id, c);
        this.players.push({ id, name: String(d.name || 'Invitado').slice(0, 14), ch: d.ch });
        c.send({ t: 'welcome', id, code: this.code }); this.broadcastLobby(); this.emit('lobby', this.players);
        return;
      }
      if (!c.pid) return;
      if (d.t === 'pick') { const p = this.players.find(p => p.id === c.pid); if (p) { p.ch = d.ch; this.broadcastLobby(); this.emit('lobby', this.players); } return; }
      d.from = c.pid;
      if (d.t === 'st') this.relay(d, c.pid);
      this.emit('msg', d);
    });
    c.on('close', () => this._lost(c.pid));
    c.on('error', () => this._lost(c.pid));
  }
  _lost(id) {
    if (!id || !this.conns.has(id)) return; this.conns.delete(id);
    const p = this.players.find(p => p.id === id); this.players = this.players.filter(p => p.id !== id);
    this.broadcastLobby(); this.emit('lobby', this.players); this.emit('left', id, p && p.name);
    this.send({ t: 'left', id });
  }
  broadcastLobby() { this.send({ t: 'lobby', players: this.players, route: this.route }); }
  relay(d, except) { for (const [id, c] of this.conns) if (id !== except && c.open) try { c.send(d); } catch (e) { } }
  // ---------------- invitado ----------------
  async join(code, name, ch) {
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    if (code.length !== 4) throw new Error('codigo');
    this.peer = await this._peer(null); this.code = code;
    this.peer.on('error', e => this._err(e));
    return new Promise((res, rej) => {
      this._joinRej = rej;
      const c = this.peer.connect(CONFIG.peerPrefix + code, { reliable: true, serialization: 'json' }); this.host = c;
      const to = setTimeout(() => { if (this._joinRej) { this._joinRej = null; rej(new Error('nosala')); } }, 12000);
      c.on('open', () => c.send({ t: 'hello', name, ch }));
      c.on('data', d => {
        if (d.t === 'welcome') { clearTimeout(to); this._joinRej = null; this.myId = d.id; res(d.id); return; }
        if (d.t === 'full') { clearTimeout(to); this._joinRej = null; rej(new Error(d.started ? 'empezada' : 'llena')); return; }
        if (d.t === 'lobby') { this.players = d.players; this.route = d.route; this.emit('lobby', d.players, d.route); return; }
        this.emit('msg', d);
      });
      c.on('close', () => { if (this.alive) this.emit('hostgone'); });
      c.on('error', () => { });
    });
  }
  pick(ch) { if (this.isHost) { this.players[0].ch = ch; this.broadcastLobby(); this.emit('lobby', this.players); } else this.send({ t: 'pick', ch }); }
  setRoute(i) { this.route = i; if (this.isHost) this.broadcastLobby(); }
  send(d) {
    if (this.isHost) { for (const c of this.conns.values()) if (c.open) try { c.send(d); } catch (e) { } }
    else if (this.host && this.host.open) try { this.host.send(d); } catch (e) { }
  }
  get count() { return this.players.length; }
  close() { this.alive = false; try { this.send({ t: 'bye' }); } catch (e) { } setTimeout(() => { try { this.peer && this.peer.destroy(); } catch (e) { } }, 150); }
}
