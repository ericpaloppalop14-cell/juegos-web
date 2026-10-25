// ======================================================================
//  Emparejamiento y sincronización de la partida online.
//  · Sala de espera común: todos los que entran en ~5 s juegan juntos.
//  · Anfitrión = el que lleva más tiempo esperando. Decide pista y bots.
//  · Cada móvil simula SU kart (física original) y manda su estado 12 veces/s.
//  · El anfitrión simula los bots; si se va, otro jugador se los queda.
// ======================================================================
import { Net } from './net.js';
import { makeBots, daySeed } from './endless.js';

export const MAX_PLAYERS = 6;
export const WAIT_MS = 5000;

export class Online {
  constructor() { this.net = null; this.others = new Map(); this.match = null; this.timer = null; }
  room() { const q = new URLSearchParams(location.search).get('sala'); return 'carrera-' + (q ? q.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24) : 'publica'); }
  async open() {
    if (this.net) return;
    this.net = new Net();
    this.net.on('hi', m => { const o = this.others.get(m.f); if (!o) m.arr = Date.now(); else m.arr = o.arr; m.seen = Date.now(); this.others.set(m.f, m); });
    this.net.on('start', m => this.onStartMsg(m));
    this.net.on('st', m => this.onState(m));
    this.net.on('bt', m => this.onBots(m));
    this.net.on('bye', m => { this.others.delete(m.f); const R = this.race; if (R && this.match && m.g === this.match.gid) { const k = R.karts.find(k => k.pid === m.f); if (k) { k.finished = true; k.gone = true; } } });
    await this.net.join(this.room());
  }
  // ---------- sala de espera ----------
  async wait(me, { onUpdate, onStart }) {
    await this.open();
    this.me = { name: me.name, ch: me.ch }; this.jt = Date.now(); this.deadline = 0; this.match = null; this.race = null; this.cbStart = onStart; this.cbUpdate = onUpdate; this.waiting = true;
    clearInterval(this.timer); this.timer = setInterval(() => this.tick(), 250); this.tick();
  }
  lobbyList() {
    const now = Date.now(), L = [{ f: this.net.id, name: this.me.name, ch: this.me.ch, jt: this.jt, me: true, arr: this.jt }];
    for (const o of this.others.values()) if (o.st === 'lobby' && now - o.seen < 2500) L.push(o);
    return L.sort((a, b) => a.jt - b.jt || (a.f < b.f ? -1 : 1));
  }
  tick() {
    if (!this.waiting) return;
    const now = Date.now();
    if (!this._hiT || now - this._hiT > 600) { this._hiT = now; this.net.send('hi', { name: this.me.name, ch: this.me.ch, jt: this.jt, st: 'lobby' }); }
    const L = this.lobbyList(), host = L[0].me;
    if (host) {
      if (!this.deadline) this.deadline = Math.max(this.jt + WAIT_MS, now + 1500);
      for (const o of L) if (!o.me && o.arr > this.deadline - 1500) this.deadline = Math.min(Math.max(this.deadline, o.arr + 1500), this.jt + WAIT_MS * 2);
    } else this.deadline = 0;
    const left = Math.max(0, ((host ? this.deadline : (L[0].jt + WAIT_MS)) - now) / 1000);
    this.cbUpdate && this.cbUpdate({ list: L.slice(0, MAX_PLAYERS), host, left, peers: this.net.peers.size });
    if (host && (now >= this.deadline || L.length >= MAX_PLAYERS)) this.hostStart(L.slice(0, MAX_PLAYERS));
    if (!host && now - L[0].jt > WAIT_MS * 3) { this.jt = now; this.deadline = 0; } // anfitrión colgado: volvemos a esperar
  }
  hostStart(humans) {
    const roster = humans.map(h => ({ pid: h.f, name: h.name, ch: h.ch }));
    roster.push(...makeBots(MAX_PLAYERS - roster.length, Math.random, roster.map(r => r.name)));
    const gid = this.net.id + '-' + Date.now().toString(36), seed = daySeed();
    this.net.send('start', { gid, seed, roster });
    this.begin({ gid, seed, roster, host: true });
  }
  onStartMsg(m) {
    if (!this.waiting) return;
    if (!m.roster.some(r => r.pid === this.net.id)) { for (const r of m.roster) this.others.delete(r.pid); return; } // empezaron sin mí
    this.begin({ gid: m.gid, seed: m.seed, roster: m.roster, host: false });
  }
  begin({ gid, seed, roster, host }) {
    this.waiting = false; clearInterval(this.timer);
    const me = roster.findIndex(r => r.pid === this.net.id);
    this.match = { gid, seed, roster, me, simBots: host, online: true, humans: roster.filter(r => !r.bot).length };
    this.lastBots = Date.now(); this.heard = {};
    this.cbStart(this.match);
  }
  // ---------- durante la carrera ----------
  attach(race) {
    this.race = race; let acc = 0; this._last = performance.now();
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      const R = this.race; if (!R || !this.match) return; const now = Date.now(), g = this.match.gid;
      this.net.send('st', { g, k: R.meI, ...R.netState(R.player) });
      if (R.simBots) this.net.send('bt', { g, k: R.meI, a: R.karts.filter(k => k.bot && !k.remote).map(k => [k.slot, R.netState(k)]) });
      else if (now - this.lastBots > 4000 && R.state === 'race') { // el anfitrión se ha ido: ¿me toca llevar los bots?
        const alive = R.karts.filter(k => !k.bot && (k === R.player || now - (this.heard[k.slot] || 0) < 2500)).map(k => k.slot);
        if (Math.min(...alive) === R.meI) { R.takeOverBots(); }
      }
      for (const k of R.karts) if (!k.bot && k !== R.player && !k.finished && R.state === 'race' && now - (this.heard[k.slot] || this.lastBots) > 5000) { k.finished = true; k.gone = true; }
    }, 1000 / 12);
  }
  onState(m) { const R = this.race; if (!R || !this.match || m.g !== this.match.gid) return; const k = R.karts[m.k]; if (!k || k === R.player) return; this.heard[m.k] = Date.now(); R.netApply(k, m); }
  onBots(m) { const R = this.race; if (!R || !this.match || m.g !== this.match.gid) return; if (R.simBots) { if (m.k != null && m.k < R.meI) R.releaseBots(); else return; } // si vuelve uno con prioridad, le devuelvo los bots
    this.lastBots = Date.now(); for (const [slot, s] of m.a) { const k = R.karts[slot]; if (k && k.remote) R.netApply(k, s); } }
  stopRace() { clearInterval(this.timer); this.race = null; }
  async close() { this.waiting = false; clearInterval(this.timer); if (this.net) { if (this.match) this.net.send('bye', { g: this.match.gid }); await this.net.leave(); } this.net = null; this.others.clear(); this.match = null; this.race = null; }
}
// partida sin red: tú + 5 bots (los simula este móvil)
export function soloMatch(me) {
  const roster = [{ pid: 'yo', name: me.name, ch: me.ch }, ...makeBots(MAX_PLAYERS - 1, Math.random, [me.name])];
  // orden de parrilla aleatorio
  for (let i = roster.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [roster[i], roster[j]] = [roster[j], roster[i]]; }
  return { gid: 'solo', seed: daySeed(), roster, me: roster.findIndex(r => r.pid === 'yo'), simBots: true, online: false, humans: 1 };
}
