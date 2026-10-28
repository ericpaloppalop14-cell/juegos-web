// ======================================================================
//  v50 · Carrera de COPA online. Es la Race de siempre (pistas, física y vueltas intactas):
//  cada móvil simula SU kart y manda su estado; los karts de otros móviles se interpolan.
//  El anfitrión (o quien lo sustituya) simula los bots. Objetos: solo potenciadores propios (justos en P2P).
// ======================================================================
import * as THREE from 'three';
import { CHARS, CONFIG } from './data.js';
import { Race } from './race.js';
import { SELF_POWERS } from './powerups.js';
import { nameTag } from './endless.js';
import { Audio } from './audio.js';

const V3 = THREE.Vector3;
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

export class OnlineCupRace extends Race {
  // roster: [{pid,name,ch,bot,lvl}] indexado por «slot» · grid: slots en orden de parrilla · me: slot de este móvil
  constructor(app, { cup, reverse, roster, grid, me, quality, simBots, cupIndex }) {
    const chars = roster.map(r => ({ ...(CHARS.find(c => c.id === r.ch) || CHARS[0]) }));
    super(app, { cup, reverse, playerChar: chars[me], rivals: chars.filter((_, i) => i !== me), grid: grid.map(s => chars[s]), cupIndex, quality });
    this.oc = true; this.roster = roster; this.meI = me; this.simBots = simBots; this.bySlot = {}; this.gateT = 0; this.finWait = 0; this.gateOk = null;
    this.karts.forEach((k, gi) => {
      const slot = grid[gi], r = roster[slot];
      k.slot = slot; k.name = r.name; k.bot = !!r.bot; k.pid = r.pid || null; k.remote = slot !== me && (!r.bot || !simBots); k.net = null; this.bySlot[slot] = k;
      if (slot !== me) k.mesh.add(nameTag(r.name, k.ch.color, false));
    });
    this.difficulty = 0.94 + cupIndex * 0.015;
  }
  rollItem(k) {
    if (this.forceItem && k.isPlayer) { const f = this.forceItem; this.forceItem = null; return f; }
    const f = (k.place - 1) / Math.max(1, this.karts.length - 1), R = Math.random();
    if (R < 0.38) return SELF_POWERS[Math.floor(Math.random() * SELF_POWERS.length)];
    if (R < 0.2 + f * 0.25) return 'turbo'; if (R < 0.42 + f * 0.25) return f > 0.4 ? 'seta' : 'escudo'; if (R < 0.75) return 'escudo'; return f > 0.2 ? 'iman' : 'turbo';
  }
  aiInput(k, dt) { if (k.remote) return { steer: 0, throttle: 0, brake: false, drift: false, driftEdge: false, itemEdge: false }; return super.aiInput(k, dt); }
  stepKart(k, inp, dt) { if (k.remote) { this.netKart(k, dt); return; } super.stepKart(k, inp, dt); }
  netKart(k, dt) {
    const n = k.net; if (!n) { this.placeKartMesh(k, dt); return; }
    n.age += dt; const ex = Math.min(n.age, 0.25);
    const tx = n.x + Math.sin(n.yaw) * n.fs * ex, tz = n.z + Math.cos(n.yaw) * n.fs * ex, f = 1 - Math.exp(-dt * 12);
    if ((k.pos.x - tx) ** 2 + (k.pos.z - tz) ** 2 > 900) { k.pos.x = tx; k.pos.z = tz; } else { k.pos.x = lerp(k.pos.x, tx, f); k.pos.z = lerp(k.pos.z, tz, f); }
    k.y = lerp(k.y, n.y, f); k.pos.y = k.y; k.yaw += angDiff(k.yaw, n.yaw) * f; k.fs = n.fs;
    k.driftDir = n.dd; k.boostT = n.b ? 0.2 : 0; k.megaT = n.m ? 0.2 : 0; k.shieldT = n.sh ? 1 : 0; k.spinT = n.sp ? 0.5 : 0; k.air = !!n.air; k.trick = !!n.tr;
    k.megaS = lerp(k.megaS, n.m ? 2.1 : 1, 1 - Math.exp(-dt * 6));
    k.vx = Math.sin(k.yaw) * k.fs; k.vz = Math.cos(k.yaw) * k.fs;
    k.idx = this.track.nearest(k.pos.x, k.pos.z, k.idx);
    k.dist = n.d + Math.max(0, n.fs) * ex; k.lap = n.lap;
    this.placeKartMesh(k, dt);
  }
  netApply(k, s) { k.net = { ...s, age: 0 }; if (s.fin && !k.finished) { k.finished = true; k.finishTime = s.ft || this.raceT; } }
  netState(k) { return { x: +k.pos.x.toFixed(2), z: +k.pos.z.toFixed(2), y: +k.y.toFixed(2), yaw: +k.yaw.toFixed(3), fs: +k.fs.toFixed(1), d: +k.dist.toFixed(1), lap: k.lap, dd: k.driftDir, b: k.boostT > 0 ? 1 : 0, m: k.megaT > 0 ? 1 : 0, sh: k.shieldT > 0 ? 1 : 0, sp: k.spinT > 0 ? 1 : 0, air: k.air ? 1 : 0, tr: k.trick ? 1 : 0, fin: k.finished ? 1 : 0, ft: k.finished ? +k.finishTime.toFixed(2) : 0 }; }
  takeOverBots() { for (const k of this.karts) if (k.bot && k.remote) { k.remote = false; k.vx = Math.sin(k.yaw) * k.fs; k.vz = Math.cos(k.yaw) * k.fs; } this.simBots = true; }
  releaseBots() { for (const k of this.karts) if (k.bot) k.remote = true; this.simBots = false; }
  collideKarts() { // solo empuja karts simulados aquí (los remotos los mueve su dueño)
    const K = this.karts;
    for (let i = 0; i < K.length; i++) for (let j = i + 1; j < K.length; j++) {
      const a = K[i], b = K[j]; if (a.remote && b.remote) continue;
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, dy = Math.abs(b.y - a.y); const r = 1.45 * (a.megaS + b.megaS), d2 = dx * dx + dz * dz;
      if (d2 > r * r || dy > 2.5 * Math.max(a.megaS, b.megaS)) continue;
      if (!a.remote && !b.remote && this.fx.collide(a, b)) continue;
      if (!a.remote && !b.remote) { if (a.megaT > 0 && b.megaT <= 0) { this.squash(b, a); continue; } if (b.megaT > 0 && a.megaT <= 0) { this.squash(a, b); continue; } }
      const d = Math.sqrt(d2) || 0.01, nx = dx / d, nz = dz / d, over = r - d;
      const wa = a.weight * a.megaS, wb = b.weight * b.megaS; let ta = wb / (wa + wb), tb = wa / (wa + wb);
      if (a.remote) { ta = 0; tb = 1; } if (b.remote) { tb = 0; ta = 1; }
      a.pos.x -= nx * over * ta; a.pos.z -= nz * over * ta; b.pos.x += nx * over * tb; b.pos.z += nz * over * tb;
      const rv = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
      if (rv < 0) { const imp = -rv * 1.3; if (!a.remote) { a.vx -= nx * imp * ta; a.vz -= nz * imp * ta; } if (!b.remote) { b.vx += nx * imp * tb; b.vz += nz * imp * tb; } if ((a.isPlayer || b.isPlayer) && imp > 3 && a.bumpCD <= 0) { a.bumpCD = 0.3; Audio.sfxPlay('bump'); } }
    }
  }
  update(dt) {
    // salida sincronizada: la intro espera (máx. 12 s) a que todos los móviles hayan cargado la pista
    if (this.state === 'intro' && this.gateOk) { this.gateT += dt; if (this.introT > 2.8 && this.gateT < 12 && !this.gateOk()) this.introT = 2.8; }
    // al terminar yo, espero (máx. 30 s) a los demás jugadores de verdad
    if (this.state === 'finish' && this.karts.some(k => !k.bot && k.remote && !k.finished && !k.gone) && (this.finWait += dt) < 30) this.finishT = Math.min(this.finishT, 8.5);
    super.update(dt);
  }
  endRace() {
    if (this.ended) return; this.ended = true; this.rank(); Audio.engineStop();
    const order = this.karts.slice().sort((a, b) => a.place - b.place);
    let prevT = 0; for (const k of order) { if (!k.finished) { const rem = CONFIG.laps * this.track.L - k.dist; k.finishTime = Math.max(prevT + 0.35, this.raceT + rem / Math.max(20, k.vmax * 0.85)); } prevT = k.finishTime; }
    this.app.onRaceEnd(order.map(k => ({ ch: k.ch, slot: k.slot, name: k.name, bot: k.bot, gone: !!k.gone, time: k.finishTime, isPlayer: k.isPlayer, place: k.place })), this.stats);
  }
}
