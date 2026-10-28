// ======================================================================
//  v50 · COPAS ONLINE
//  · Sala PRIVADA de amigos: código de 5 letras + enlace (?copa=CÓDIGO). Manda el anfitrión:
//    elige la copa (entre las que ÉL tiene abiertas en online) y cuántas carreras.
//  · Partida PÚBLICA: todos entran a la misma sala, cada uno VOTA una copa de las que tiene abiertas;
//    gana la más votada (también la puede correr quien aún no la tenga: «pase de invitado»).
//  · Rango online (puntos 🍬): suben al correr; abren copas poco a poco (no están todas abiertas).
//  Red: la misma de siempre (Net: servidor Cloudflare si hay URL, si no P2P gratis sin cuentas).
// ======================================================================
import { Net } from './net.js';
import { makeBots } from './endless.js';
import { CHARS, CONFIG } from './data.js';

export const OC_MAX = 6;
export const PUB_WAIT = 12000;     // ventana de votación de la partida pública
export const PUB_RACES = 2;        // carreras de una copa pública (exprés)
// puntos de rango online que hacen falta para abrir cada copa (las dos primeras vienen abiertas)
export const LADDER = { gominola: 0, girasol: 0, ballena: 60, biblioteca: 140, galaxia: 240, helada: 360, cielo: 520, sueno: 720, tormenta: 950 };
export const RANKS = [[0, '🍬', 'Caramelo'], [100, '🧁', 'Cupcake'], [300, '🍩', 'Donut'], [600, '🍰', 'Tarta'], [1000, '👑', 'Reina de la Nata']];
export const rankInfo = rp => { let i = 0; RANKS.forEach((r, j) => { if (rp >= r[0]) i = j; }); const n = RANKS[i + 1]; return { i, icon: RANKS[i][1], name: RANKS[i][2], from: RANKS[i][0], to: n ? n[0] : null }; };
export const cupOpen = (rp, id) => rp >= (LADDER[id] ?? 0);
export const openIds = rp => Object.keys(LADDER).filter(id => cupOpen(rp, id));
export const nextCup = rp => Object.entries(LADDER).filter(([, v]) => v > rp).sort((a, b) => a[1] - b[1])[0] || null;
const PLACE_RP = [30, 22, 16, 11, 7, 4];
const mult = (humans, priv) => (humans >= 2 ? 1 : 0.3) * (priv ? 0.6 : 1); // contra bots solos casi no suma; con amigos suma menos (para no regalarlo)
export const raceRP = (place, humans, priv) => Math.max(1, Math.round(((PLACE_RP[place - 1] ?? 3) + 5) * mult(humans, priv)));
export const cupRP = (place, humans, priv) => Math.round(([40, 25, 15][place - 1] || 0) * mult(humans, priv));
const AB = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const newCode = () => Array.from({ length: 5 }, () => AB[Math.floor(Math.random() * AB.length)]).join('');
export const cleanCode = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
export const roomName = (kind, code) => kind === 'pub' ? 'copa-publica' : 'copa-' + String(code).toLowerCase();
export const inviteLink = code => location.origin + location.pathname + '?copa=' + code;
export const pointsFor = i => CONFIG.points[i] ?? 0;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export class OCSession {
  constructor() { this.net = null; this.others = new Map(); this.m = null; this.timer = null; this.heard = {}; this.ready = {}; this.cb = {}; }
  async open(room) {
    if (this.net) return;
    this.net = new Net();
    this.net.on('ch', m => { const o = this.others.get(m.f); m.arr = o ? o.arr : Date.now(); m.seen = Date.now(); this.others.set(m.f, m); });
    this.net.on('cs', m => this.onStartMsg(m));
    this.net.on('st', m => this.onState(m));
    this.net.on('bt', m => this.onBots(m));
    this.net.on('rd', m => { if (this.m && m.g === this.m.gid && m.n === this.m.n) this.ready[m.k] = Date.now(); });
    this.net.on('cn', m => { if (this.m && m.g === this.m.gid && m.n === this.m.n + 1 && this.cb.next) this.cb.next(m); });
    this.net.on('cr', m => { if (this.m && m.g === this.m.gid && this.cb.res) this.cb.res(m); });
    this.net.on('bye', m => { this.others.delete(m.f); if (this.m && m.g === this.m.gid) { const i = this.m.roster.findIndex(r => r.pid === m.f); if (i >= 0 && !this.m.gone.includes(i)) this.m.gone.push(i); } const R = this.race; if (R && this.m && m.g === this.m.gid) { const k = R.karts.find(k => k.pid === m.f); if (k) { k.finished = true; k.gone = true; if (!k.finishTime) k.finishTime = R.raceT + 99; } } });
    await this.net.join(room);
  }
  // ---------- sala de espera (privada o pública) ----------
  async lobby({ kind, code, host, me, uc, onUpdate, onStart }) {
    await this.open(roomName(kind, code));
    this.kind = kind; this.code = code; this.isHost = kind === 'priv' && !!host; this.me = me; this.uc = uc; this.cbU = onUpdate; this.cbS = onStart;
    this.sel = { pick: uc[uc.length - 1] || 'gominola', races: 4, bots: true, vote: null };
    this.jt = Date.now(); this.deadline = 0; this.ext = false; this.m = null; this.race = null; this.waiting = true; this._hiT = 0;
    clearInterval(this.timer); this.timer = setInterval(() => this.tick(), 250); this.tick();
  }
  set(k, v) { this.sel[k] = v; this._hiT = 0; this.tick(); }
  list() {
    const now = Date.now(), L = [{ f: this.net.id, name: this.me.name, ch: this.me.ch, jt: this.jt, me: true, uc: this.uc, vote: this.sel.vote, host: this.isHost, pick: this.sel.pick, races: this.sel.races, bots: this.sel.bots, arr: this.jt }];
    for (const o of this.others.values()) if (o.st === 'lobby' && now - o.seen < 2500) L.push(o);
    return L.sort((a, b) => (b.host ? 1 : 0) - (a.host ? 1 : 0) || a.jt - b.jt || (a.f < b.f ? -1 : 1));
  }
  tally(L) { const t = {}; for (const p of L) if (p.vote) t[p.vote] = (t[p.vote] || 0) + 1; return t; }
  tick() {
    if (!this.waiting) return;
    const now = Date.now(), L = this.list(), pub = this.kind === 'pub';
    let left = 0, host;
    if (pub) {
      host = L[0].me;
      if (host) {
        if (!this.deadline) this.deadline = Math.max(this.jt + PUB_WAIT, now + 4000);
        for (const o of L) if (!o.me && o.arr > now - 1500 && this.deadline - now < 4000) this.deadline = Math.min(now + 4000, this.jt + PUB_WAIT * 2);
        if (L.length >= OC_MAX && this.deadline - now > 3500) this.deadline = now + 3500;
        if (L.length === 1 && !this.ext && now > this.deadline - 400) { this.ext = true; this.deadline += 8000; } // nadie a la vista: más margen (el P2P tarda en conectar)
        left = Math.max(0, (this.deadline - now) / 1000);
      } else { left = Math.max(0, (L[0].left || 0) - (now - L[0].seen) / 1000); this.deadline = 0; }
    } else host = this.isHost;
    if (!this._hiT || now - this._hiT > 500) { this._hiT = now; this.net.send('ch', { name: this.me.name, ch: this.me.ch, jt: this.jt, st: 'lobby', uc: this.uc, vote: this.sel.vote, host: this.isHost, pick: this.sel.pick, races: this.sel.races, bots: this.sel.bots, left: host && pub ? left : 0 }); }
    const hostE = pub ? L[0] : L.find(p => p.host) || null;
    this.cbU && this.cbU({ kind: this.kind, code: this.code, list: L, host, hostE, left, tally: this.tally(L), peers: this.net.peers.size, full: L.length > OC_MAX, myIdx: L.findIndex(p => p.me) });
    if (pub && host && now >= this.deadline) this.hostStart();
  }
  hostStart() {
    if (!this.waiting) return;
    const L = this.list(), priv = this.kind === 'priv', humans = L.filter(p => !priv || !p.host || p.me).slice(0, OC_MAX);
    let cup;
    if (priv) cup = this.sel.pick;
    else { const t = this.tally(L), mx = Math.max(0, ...Object.values(t)), top = Object.keys(t).filter(id => t[id] === mx);
      cup = top.length ? top[Math.floor(Math.random() * top.length)] : (() => { const u = [...new Set(L.flatMap(p => p.uc || []))]; return u[Math.floor(Math.random() * u.length)] || 'gominola'; })(); }
    const roster = humans.map(h => ({ pid: h.f, name: h.name, ch: h.ch }));
    const fill = priv && !this.sel.bots ? 0 : OC_MAX - roster.length;
    const bots = makeBots(fill, Math.random, roster.map(r => r.name)), used = new Set(roster.map(r => r.ch));
    for (const b of bots) { if (used.has(b.ch)) { const f = CHARS.slice(0, 8).filter(c => !used.has(c.id)); if (f.length) b.ch = f[Math.floor(Math.random() * f.length)].id; } used.add(b.ch); }
    roster.push(...bots);
    const gid = this.net.id + '-' + Date.now().toString(36), grid = shuffle(roster.map((_, i) => i)), races = priv ? this.sel.races : PUB_RACES;
    const msg = { gid, cup, races, roster, grid, kind: this.kind, vt: this.tally(L) };
    this.net.send('cs', msg); this.begin(msg, true);
  }
  onStartMsg(m) {
    if (!this.waiting) return;
    if (this.kind === 'priv' && m.kind !== 'priv') return;
    if (!m.roster.some(r => r.pid === this.net.id)) { for (const r of m.roster) this.others.delete(r.pid); return; }
    this.begin(m, false);
  }
  begin(m, host) {
    this.waiting = false; clearInterval(this.timer);
    const me = m.roster.findIndex(r => r.pid === this.net.id);
    this.m = { gid: m.gid, cup: m.cup, races: m.races, roster: m.roster, grid: m.grid, kind: m.kind, vt: m.vt || {}, me, n: 0, host, simBots: host, humans: m.roster.filter(r => !r.bot).length, tot: m.roster.map(() => 0), last: null, gone: [] };
    this.heard = {}; this.ready = {}; this.lastBots = Date.now(); this.cbS(this.m);
  }
  // ---------- durante la carrera ----------
  attach(race, n) {
    this.race = race; this.m.n = n; this.ready = {}; this.heard = {}; this.lastBots = Date.now(); this.sentFin = false;
    race.gateOk = () => race.karts.every(k => k.bot || k === race.player || k.gone || this.ready[k.slot]);
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      const R = this.race, M = this.m; if (!R || !M) return; const now = Date.now(), g = M.gid;
      if (R.state === 'intro') this.net.send('rd', { g, n: M.n, k: R.meI });
      this.net.send('st', { g, k: R.meI, ...R.netState(R.player) });
      if (R.simBots) this.net.send('bt', { g, k: R.meI, a: R.karts.filter(k => k.bot && !k.remote).map(k => [k.slot, R.netState(k)]) });
      else if (now - this.lastBots > 4000 && R.state === 'race') { // el anfitrión se ha ido: ¿me toca llevar los bots?
        const alive = R.karts.filter(k => !k.bot && (k === R.player || now - (this.heard[k.slot] || 0) < 2500)).map(k => k.slot);
        if (Math.min(...alive) === R.meI) { R.takeOverBots(); this.m.simBots = true; }
      }
      for (const k of R.karts) if (!k.bot && k !== R.player && !k.finished && R.state === 'race' && now - (this.heard[k.slot] || this.lastBots) > 5000) { k.finished = true; k.gone = true; k.finishTime = R.raceT + 99; }
    }, 1000 / 12);
  }
  onState(m) { const R = this.race; if (!R || !this.m || m.g !== this.m.gid) return; const k = R.bySlot[m.k]; if (!k || k === R.player) return; this.heard[m.k] = Date.now(); R.netApply(k, m); }
  onBots(m) { const R = this.race; if (!R || !this.m || m.g !== this.m.gid) return; if (R.simBots) { if (m.k != null && m.k < R.meI) { R.releaseBots(); this.m.simBots = false; } else return; }
    this.lastBots = Date.now(); for (const [slot, s] of m.a) { const k = R.bySlot[slot]; if (k && k.remote) R.netApply(k, s); } }
  // el anfitrión manda los resultados y la parrilla de la siguiente carrera
  sendRes(d) { this.net.send('cr', { g: this.m.gid, n: this.m.n, ...d }); }
  sendNext(grid) { this.net.send('cn', { g: this.m.gid, n: this.m.n + 1, grid }); }
  stopRace() { clearInterval(this.timer); const R = this.race; if (R && this.m) for (const k of R.karts) if (k.gone && !k.bot && !this.m.gone.includes(k.slot)) this.m.gone.push(k.slot); this.race = null; }
  async close() { this.waiting = false; clearInterval(this.timer); const n = this.net; this.net = null; if (n) { if (this.m) n.send('bye', { g: this.m.gid }); await n.leave(); } this.others.clear(); this.m = null; this.race = null; }
}
