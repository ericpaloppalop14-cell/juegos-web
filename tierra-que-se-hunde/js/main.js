// ======================================================================
//  TIERRA QUE SE HUNDE · Mochi (v2, cámara en tercera persona)
//  Mueve a tu mochi con el joystick por una gran sala de casillas numeradas.
//  Arrastra para girar. Toca una casilla para hundirla (con quien esté
//  encima). La sala se va quedando sin suelo: ¡sé el último en pie!
//  El anfitrión (o tú en solitario) simula; los demás reciben fotos.
// ======================================================================
import * as THREE from 'three';
import { createRenderer, buildWorld, Particles } from './world.js?v=v13';
import { makeCharacter, animCharacter } from './gfx.js?v=v13';
import { chOf } from './chars.js?v=v13';
import { createShell } from './shell.js?v=v13';
import { Sfx } from './sfx.js?v=v13';
import { buildCarousel, buildTeapot, buildCup, buildClockCenter, buildClockHand, gearGeo, buildJellyCake, buildFlan } from './props.js?v=v13';
const PhysLite = class extends THREE.MeshStandardMaterial { constructor(o = {}) { const { clearcoat, clearcoatRoughness, transmission, thickness, ior, sheen, sheenColor, sheenRoughness, iridescence, specularIntensity, ...r } = o; super(r); } }; // más barato que MeshPhysical en móvil

const $ = id => document.getElementById(id);
const N = 23, C = (N - 1) / 2, TS = 3.6, HALF = N * TS / 2, FY = 3;   // rejilla 15×15, casillas de 3,4 m
const STEP = 1 / 60, HOP_T = 0.62, HOP_CD = 2.6; // física a 60 Hz fija
const SPEED = 6.4, TURN = 2.5, CRACK = 1.75, SHRINK_CRACK = 2.6, COOLDOWN = 3.6, SHRINK_EVERY = 8.5, RESPAWN = 3.2, MAX_BUSY = 2;
const NUMCOL = ['', '#ff8fb8', '#ffa673', '#f2c64e', '#7fd08a', '#4fcabb', '#6eaef2', '#9789f2', '#c487e6', '#f4878f', '#b39478'];
// ---------------------------------------------------------------- MAPAS (compartidos por simulación y vista)
const H4 = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
export const MAPS = {
  tiovivo: { name: '🎠 Tiovivo gigante', hole: (x, z) => Math.hypot(x, z) < 7.1,
    obs: T => [{ x: 0, z: 0, r: 9.2 }, ...H4.map(([a, b]) => ({ x: a * HALF * 0.55, z: b * HALF * 0.55, r: 2.1 }))] },
  tazas: { name: '☕ Merienda gigante', hole: () => false,
    obs: T => [0, 1, 2].map(k => { const a = T * 0.22 + k * 2.094; return { x: Math.cos(a) * HALF * 0.45, z: Math.sin(a) * HALF * 0.45, r: 3.6 }; }).concat([{ x: 0, z: 0, r: 2.6 }]) },
  reloj: { name: '🕰️ Reloj loco', hole: () => false,
    obs: T => { const a = T * 0.13, o = [{ x: 0, z: 0, r: 2.4 }]; for (let d = 4; d < HALF * 0.86; d += 2.2) o.push({ x: Math.sin(a) * d, z: Math.cos(a) * d, r: 1.15, hand: 1 }); return o; } },
  gelatina: { name: '🍮 Islas de gelatina', hole: (x, z) => { for (const [a, b] of H4) if (Math.hypot(x - a * HALF * 0.5, z - b * HALF * 0.5) < 3.6) return true; return false; },
    obs: T => [...H4.map(([a, b]) => ({ x: a * HALF * 0.5, z: b * HALF * 0.5, r: 5.6 })), { x: 0, z: 0, r: 2.2 + Math.sin(T * 2.4) * 0.5 }] },
};
// zona segura que se cierra por fases (radio final 0)
const ZPH = [[10, 7, 0.62], [8, 6, 0.4], [7, 5, 0.23], [7, 4, 0.1], [6, 3, 0.035], [7, 3, 0]];
const ringOf = i => Math.max(Math.abs(i % N - C), Math.abs((i / N | 0) - C));
const tx = i => (i % N - C) * TS, tz = i => ((i / N | 0) - C) * TS;
const tileAt = (x, z) => { const cx = Math.round(x / TS + C), cz = Math.round(z / TS + C); return cx < 0 || cz < 0 || cx >= N || cz >= N ? -1 : cz * N + cx; };
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

// ---------------------------------------------------------------- SIMULACIÓN
class Sim {
  constructor(cfg) {
    this.T = 0; this.ev = []; this.over = false; this.dead = [];
    const nums = [...Array(N * N).keys()].map(v => v % 10 + 1).sort(() => Math.random() - 0.5);
    this.tiles = nums.map(n => ({ n, s: 0, t: 0, by: null, perm: false }));
    this.map = MAPS[cfg.map] ? cfg.map : 'tiovivo'; const M = MAPS[this.map];
    this.tiles.forEach((t, i) => { if (M.hole(tx(i), tz(i))) { t.s = 2; t.perm = true; t.hole = true; } });
    this.Z = { cx: 0, cz: 0, r: HALF * 1.5, ncx: 0, ncz: 0, nr: HALF * 1.5, ph: -1, st: 'wait', t: 6 };
    const k = cfg.roster.length;
    this.P = cfg.roster.map((r, i) => { const a = i / k * Math.PI * 2 + 0.4, R = HALF * 0.55; const x = Math.cos(a) * R, z = Math.sin(a) * R;
      const h = Math.atan2(-x, -z); return { ...r, x, z, h, px: x, pz: z, ph: h, w: 0, v: SPEED, vx: Math.sin(h) * SPEED, vz: Math.cos(h) * SPEED, air: 0, jcd: 1, mag: 0, wx: Math.sin(h), wz: Math.cos(h), bt: 0, turn: 0, alive: true, cd: 1.5, tile: tileAt(x, z), ai: r.bot ? { goal: null, gt: 0, atk: 2.5 + Math.random() * 3, react: 0 } : null }; });
  }
  input(id, d) { const p = this.P.find(p => p.id === id); if (!p || !p.alive || this.over) return;
    if (d.k === 'mv') { if (d.v == null) p.mag = 0; else { p.wx = Math.sin(+d.v); p.wz = Math.cos(+d.v); p.mag = Math.max(0, Math.min(1, d.m == null ? 1 : +d.m)); } }
    if (d.k === 'jump') this.jump(p);
    if (d.k === 'num') this.sinkNum(p, +d.n); }
  jump(p) { if (p.jcd > 0 || p.air > 0) return; p.air = HOP_T; p.jcd = HOP_CD; this.ev.push(['hop', p.id]); }
  busy(n) { return this.tiles.some(t => t.n === n && !t.perm && t.s > 0); }
  sinkNum(p, n) { // todas las casillas con ese número se agrietan y caen
    if (p.cd > 0) { this.ev.push(['deny', p.id, 'El martillo se está recargando']); return false; }
    if (!(n >= 1 && n <= 10)) return false;
    if (this.busy(n)) { this.ev.push(['deny', p.id, `El ${n} ya se está hundiendo`]); return false; }
    let nb = 0; for (let k = 1; k <= 10; k++) if (this.busy(k)) nb++; if (nb >= MAX_BUSY) { this.ev.push(['deny', p.id, 'Espera: ya hay dos números hundiéndose']); return false; }
    let c = 0; for (const t of this.tiles) if (t.n === n && t.s === 0) { Object.assign(t, { s: 1, t: CRACK, by: p.id }); c++; }
    if (!c) { this.ev.push(['deny', p.id, `No queda ninguna casilla con el ${n}`]); return false; }
    p.cd = COOLDOWN; this.ev.push(['num', p.id, n]); return true;
  }
  step(dt) {
    if (this.over) return; this.T += dt;
    const Z = this.Z; Z.t -= dt; // zona tipo Fortnite
    if (Z.st === 'wait' && Z.t <= 0) { if (Z.ph >= 0) { Z.st = 'shrink'; Z.t = ZPH[Z.ph][1]; Z.T0 = Z.t; Z.ocx = Z.cx; Z.ocz = Z.cz; Z.or = Z.r; this.ev.push(['zshrink']); } else this.nextZone(); }
    else if (Z.st === 'shrink') { const k = 1 - Math.max(0, Z.t) / Z.T0; Z.cx = Z.ocx + (Z.ncx - Z.ocx) * k; Z.cz = Z.ocz + (Z.ncz - Z.ocz) * k; Z.r = Z.or + (Z.nr - Z.or) * k; if (Z.t <= 0) this.nextZone(); }
    // fuera de la zona el suelo se desmorona (con aviso)
    for (let i = 0; i < N * N; i++) { const t = this.tiles[i]; if (t.perm && t.s) continue; if (Math.hypot(tx(i) - Z.cx, tz(i) - Z.cz) > Z.r + TS * 0.5) { t.perm = true; if (t.s !== 2) Object.assign(t, { s: 1, t: Math.max(t.s === 1 ? t.t : 0, SHRINK_CRACK), by: null }); } }
    for (let i = 0; i < N * N; i++) { const t = this.tiles[i]; if (t.s !== 1) continue; t.t -= dt; if (t.t <= 0) { t.s = 2; t.t = RESPAWN; this.ev.push(['gone', i]); } }
    for (const t of this.tiles) if (t.s === 2 && !t.perm) { t.t -= dt; if (t.t <= 0) { t.s = 0; t.by = null; } } // las casillas normales vuelven a subir
    this.obs = MAPS[this.map].obs(this.T);
    for (const p of this.P) {
      if (!p.alive) continue; p.cd = Math.max(0, p.cd - dt);
      if (p.ai) this.bot(p, dt);
      p.px = p.x; p.pz = p.z; p.ph = p.h; p.jcd = Math.max(0, p.jcd - dt); p.bt -= dt;
      // estilo Fall Guys / Stumble Guys: el joystick marca la dirección; la velocidad la sigue con suavidad (~0,1 s) y el mochi gira a mirarla
      let dx0, dz0, m;
      if (p.ai) { p.w += (-p.turn * TURN * 1.15 - p.w) * Math.min(1, dt * 14); p.h = wrap(p.h + p.w * dt); dx0 = Math.sin(p.h); dz0 = Math.cos(p.h); m = 1; }
      else { dx0 = p.wx; dz0 = p.wz; m = p.mag; }
      // 2º orden: la entrada se suaviza un pelín (50 ms) y la velocidad la sigue (~90 ms): rápido pero sin tirones
      const sp = (m > 0 ? SPEED * Math.min(1, 0.45 + m * 0.85) : 0) * (p.air > 0 ? 1.2 : 1), ki = 1 - Math.exp(-dt / 0.07), kv = 1 - Math.exp(-dt / 0.09);
      p.tvx = (p.tvx ?? p.vx) + (dx0 * sp - (p.tvx ?? p.vx)) * ki; p.tvz = (p.tvz ?? p.vz) + (dz0 * sp - (p.tvz ?? p.vz)) * ki;
      p.vx += (p.tvx - p.vx) * kv; p.vz += (p.tvz - p.vz) * kv;
      if (!p.ai) { if (Math.hypot(p.tvx, p.tvz) > 0.4) { const th = Math.atan2(p.tvx, p.tvz); p.h = wrap(p.h + wrap(th - p.h) * (1 - Math.exp(-dt * 13))); } p.w = wrap(p.h - p.ph) / dt; }
      p.x += p.vx * dt; p.z += p.vz * dt; if (p.air > 0) p.air = Math.max(0, p.air - dt);
      // paredes y postes: solo se quita la parte de la velocidad que empuja contra ellos (se desliza, sin rebotes ni tirones de giro)
      const slide = (nx, nz) => { const dot = p.vx * nx + p.vz * nz; if (dot >= 0) return; p.vx -= dot * nx; p.vz -= dot * nz; if (p.bt <= 0 && dot < -3) { p.bt = 0.5; this.ev.push(['boing', p.id]); } };
      const L = HALF - 0.6;
      if (Math.abs(p.x) > L) { const sg = Math.sign(p.x); p.x = sg * L; slide(-sg, 0); } if (Math.abs(p.z) > L) { const sg = Math.sign(p.z); p.z = sg * L; slide(0, -sg); }
      for (const o of this.obs) { const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz) || 0.01, R = o.r + 0.5; if (d < R) { p.x = o.x + dx / d * R; p.z = o.z + dz / d * R; slide(dx / d, dz / d); } }
      p.tile = tileAt(p.x, p.z);
      if (p.air <= 0 && (p.tile < 0 || this.tiles[p.tile].s === 2)) { const by = p.tile >= 0 ? this.tiles[p.tile].by : null; this.kill(p, by); }
    }
    const alive = this.P.filter(p => p.alive);
    if (alive.length <= 1) { this.over = true; this.ranking = [...alive.map(p => p.id), ...[...this.dead].reverse()]; this.ev.push(['over', alive[0] ? alive[0].id : null]); }
  }
  kill(p, by) { if (!p.alive) return; if (window.__dbg) window.__dbg.push([this.T.toFixed(1), p.name, by, p.turn, p.tile, (p.hist || []).join(' ')]); p.alive = false; this.dead.push(p.id); this.ev.push(['fall', p.id, by, +p.x.toFixed(2), +p.z.toFixed(2)]); }
  nextZone() { const Z = this.Z; Z.ph++; if (Z.ph >= ZPH.length) { Z.st = 'end'; Z.t = 999; return; }
    const nr = HALF * ZPH[Z.ph][2] * 1.42 + (Z.ph === ZPH.length - 1 ? 0 : 0); const M = MAPS[this.map]; let cx = 0, cz = 0;
    for (let k = 0; k < 40; k++) { const a = Math.random() * 6.28, d = Math.random() * Math.max(0, Math.min(Z.r, HALF * 1.2) - nr) * (Z.ph ? 1 : 0.5); cx = (Z.ph ? Z.cx : 0) + Math.cos(a) * d; cz = (Z.ph ? Z.cz : 0) + Math.sin(a) * d;
      if (Math.abs(cx) < HALF - 3 && Math.abs(cz) < HALF - 3 && !M.hole(cx, cz)) break; }
    if (Z.ph === 0) { Z.cx = 0; Z.cz = 0; Z.r = HALF * 1.5; }
    Object.assign(Z, { ncx: cx, ncz: cz, nr, st: 'wait', t: ZPH[Z.ph][0] }); this.ev.push(['znext', Z.ph]); }
  danger(x, z, tt = 0) { const i = tileAt(x, z); if (i < 0) return 9; const t = this.tiles[i]; return t.s === 2 ? 9 : t.s === 1 ? (t.t < tt + 0.35 ? 9 : 3) : (Math.hypot(x - this.Z.ncx, z - this.Z.ncz) > this.Z.nr - 1 && this.Z.t < 5) ? 2 : 0; }
  bot(p, dt) {
    const A = p.ai, sk = p.skill; A.gt -= dt; A.atk -= dt; A.react -= dt;
    if (!A.goal || A.gt <= 0 || this.tiles[A.goal].s) { const Z = this.Z, ok = this.tiles.map((t, i) => i).filter(i => this.tiles[i].s === 0 && Math.hypot(tx(i) - Z.ncx, tz(i) - Z.ncz) < Math.max(TS, Z.nr * 0.8)); A.goal = ok.length ? ok[Math.random() * ok.length | 0] : null; A.gt = 2 + Math.random() * 3; }
    if (A.react > 0) return; A.react = 0.06 + (1 - sk) * 0.18;
    // elige el rumbo más seguro de varios candidatos, prefiriendo ir hacia su objetivo
    const want = A.goal != null ? Math.atan2(tx(A.goal) - p.x, tz(A.goal) - p.z) : p.h;
    // simula arcos con distintos giros y elige el que evita agujeros y va hacia su objetivo
    let bestU = 0, bs = 1e9; const care = sk > Math.random() * 0.45 ? 1 : 0.6;
    for (const u of [0, -0.35, 0.35, -0.7, 0.7, -1, 1]) {
      let x = p.x, z = p.z, h = p.h, s = 0;
      for (let k = 1; k <= 16; k++) { h -= u * TURN * 0.1; x += Math.sin(h) * SPEED * 0.1; z += Math.cos(h) * SPEED * 0.1;
        const L = HALF - 0.6; if (Math.abs(x) > L || Math.abs(z) > L) { s += 2; break; }
        let ob = 0; for (const o of this.obs) if (Math.hypot(x - o.x, z - o.z) < o.r + 0.7) ob = 1; if (ob) { s += 8 / k; break; }
        const dg = this.danger(x, z, k * 0.1); if (dg >= 9) { s += 400 / k * care; break; } s += dg * 3 / k * care; }
      s += Math.abs(wrap(h - want)) * 0.9 + Math.abs(u) * 0.2;
      if (s < bs) { bs = s; bestU = u; } }
    if (bs > 80 && p.jcd <= 0 && p.air <= 0 && Math.random() < 0.25 + sk * 0.6) this.jump(p);
    const best = -bestU / 2.2;
    p.turn = Math.max(-1, Math.min(1, -best * 2.2));
    if (A.atk <= 0 && p.cd <= 0) {
      A.atk = (10 + (1 - sk) * 6 + Math.random() * 6) * (this.T < 30 ? 1.4 : 1); if (this.T < 7) { A.atk = 7 - this.T + Math.random() * 3; return; } let nb = 0; for (let k = 1; k <= 10; k++) if (this.busy(k)) nb++; if (nb >= 1) { A.atk = 0.5 + Math.random(); return; }
      const sc = new Array(11).fill(0); const mine = this.tiles[p.tile] ? this.tiles[p.tile].n : 0;
      for (const q of this.P) if (q.alive && q !== p) { const ahead = tileAt(q.x + Math.sin(q.h) * SPEED * 0.5, q.z + Math.cos(q.h) * SPEED * 0.5);
        if (q.tile >= 0) sc[this.tiles[q.tile].n] += 1; if (ahead >= 0) sc[this.tiles[ahead].n] += 0.6 * sk; }
      let best = 0, bv = 0; for (let n = 1; n <= 10; n++) { if (this.busy(n)) continue; const v = sc[n] - (n === mine ? 1.5 * sk : 0) + Math.random() * (1.4 - sk); if (v > bv) { bv = v; best = n; } }
      if (best) this.sinkNum(p, best);
    }
  }
  snap() { return { T: +this.T.toFixed(2), tl: this.tiles.map(t => [t.n, t.s, +t.t.toFixed(2), t.perm ? 1 : 0]), p: this.P.map(p => [p.id, +p.x.toFixed(2), +p.z.toFixed(2), +p.h.toFixed(3), p.alive ? 1 : 0, +p.cd.toFixed(2), p.tile, +p.air.toFixed(2), +p.w.toFixed(2), +p.jcd.toFixed(2), +p.vx.toFixed(2), +p.vz.toFixed(2)]),
    z: [this.Z.cx, this.Z.cz, this.Z.r, this.Z.ncx, this.Z.ncz, this.Z.nr, this.Z.t, this.Z.st === 'shrink' ? 1 : this.Z.st === 'end' ? 2 : 0, this.Z.ph].map(v => +(+v).toFixed(2)), map: this.map }; }
}

// ---------------------------------------------------------------- VISTA 3D
const { renderer, scene, camera, composer } = createRenderer($('c3d'));
window.__renderer = renderer; window.__scene = scene; window.__camera = camera;
const Q = window.__Q = { lv: 1, dprs: [2.5, 2, 1.75, 1.5, 1.25, 1, 0.85, 0.7], acc: 0, n: 0, last: 0, good: 0, bad: 0, fail: {} }; // v10: hasta 2,5× en pantallas muy densas; objetivo 60 fps estables // v9: hasta 2× en móvil; baja si va lento y vuelve a subir si sobra
camera.fov = 60; camera.updateProjectionMatrix();
const world = buildWorld(scene, 'atardecer', 22);
world.lights.sun.shadow.camera.left = world.lights.sun.shadow.camera.bottom = -HALF - 4; world.lights.sun.shadow.camera.right = world.lights.sun.shadow.camera.top = HALF + 4; world.lights.sun.shadow.camera.updateProjectionMatrix();
const parts = new Particles(scene, 220);
const TILE_COLS = ['#ff9cc8', '#b9a2f7', '#7ee3c4', '#ffcf7a', '#9fd0ff'];

// --- la sala: suelo de casillas, paredes decoradas, columnas, guirnaldas, farolillos
function roundedTile() { const s = TS - 0.18, r = 0.38, h = s / 2, sh = new THREE.Shape();
  sh.moveTo(-h + r, -h); sh.lineTo(h - r, -h); sh.quadraticCurveTo(h, -h, h, -h + r); sh.lineTo(h, h - r); sh.quadraticCurveTo(h, h, h - r, h); sh.lineTo(-h + r, h); sh.quadraticCurveTo(-h, h, -h, h - r); sh.lineTo(-h, -h + r); sh.quadraticCurveTo(-h, -h, -h + r, -h);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.8, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 2, curveSegments: 4 }); g.rotateX(-Math.PI / 2); g.translate(0, -0.92, 0); return g; }
const TG = roundedTile();
const crackTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 512; const x = cv.getContext('2d'); x.scale(2, 2); x.strokeStyle = 'rgba(120,30,70,.9)'; x.lineCap = 'round';
  for (let k = 0; k < 8; k++) { let px = 128, py = 128, a = k / 8 * 6.28 + Math.random() * 0.4; x.beginPath(); x.moveTo(px, py);
    for (let s = 0; s < 6; s++) { a += (Math.random() - 0.5) * 0.9; px += Math.cos(a) * 22; py += Math.sin(a) * 22; x.lineTo(px, py); } x.lineWidth = 5; x.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
// suelo con InstancedMesh: 529 casillas = 3 draw calls (cuerpo, números en un atlas, grietas)
const ATL = (() => { const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 1024; const x = cv.getContext('2d'); x.scale(2, 2); x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  for (let hot = 0; hot < 2; hot++) for (let n = 1; n <= 10; n++) { const c = (n - 1 + hot * 10), ox = (c % 5) * 128, oy = (c / 5 | 0) * 128;
    x.font = `700 ${n === 10 ? 74 : 92}px Fredoka, sans-serif`; x.lineWidth = 14; x.strokeStyle = hot ? '#b0124f' : new THREE.Color(NUMCOL[n]).offsetHSL(0, 0, -0.25).getStyle(); x.strokeText(String(n), ox + 64, oy + 70); x.fillStyle = '#fff'; x.fillText(String(n), ox + 64, oy + 70); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; return t; })();
const TCOL = [], THOT = new THREE.Color('#ff6aa6');
for (let n = 1; n <= 10; n++) TCOL[n] = new THREE.Color(NUMCOL[n]).lerp(new THREE.Color('#ffffff'), 0.38);
const tileIM = new THREE.InstancedMesh(TG, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.42, metalness: 0, envMapIntensity: 0.8 }), N * N);
const LABG = new THREE.PlaneGeometry(3, 3), CRG = new THREE.PlaneGeometry(2.9, 2.9);
const aCell = new THREE.InstancedBufferAttribute(new Float32Array(N * N), 1); LABG.setAttribute('aCell', aCell);
const labMat = new THREE.MeshBasicMaterial({ map: ATL, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 });
labMat.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aCell;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvMapUv = (uv + vec2(mod(aCell, 5.0), 3.0 - floor(aCell / 5.0))) / vec2(5.0, 4.0);'); };
const labIM = new THREE.InstancedMesh(LABG, labMat, N * N);
const crIM = new THREE.InstancedMesh(CRG, new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, opacity: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }), N * N);
for (const im of [tileIM, labIM, crIM]) { im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false; scene.add(im); }
tileIM.receiveShadow = true;
tileIM.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * N * 3), 3); tileIM.instanceColor.setUsage(THREE.DynamicDrawUsage);
const tiles = [];
for (let i = 0; i < N * N; i++) { const g = new THREE.Object3D(); g.position.set(tx(i), FY, tz(i)); // g = posición/giro lógico; se vuelca a las instancias cada frame
  tiles.push({ g, crRot: Math.random() * 6, n: -1, s: 0, sinkT: 0, hot: false, ping: 0, rise: 0, hole: false }); }
function drawNum(T, n, hot) { const i = tiles.indexOf(T); T.n = n; T.hotV = !!hot; aCell.setX(i, n - 1 + (hot ? 10 : 0)); aCell.needsUpdate = true; tileIM.setColorAt(i, TCOL[n]); tileIM.instanceColor.needsUpdate = true; }
const _o = new THREE.Object3D(), _m = new THREE.Matrix4(), _z = new THREE.Matrix4().makeScale(0, 0, 0), _lab = new THREE.Matrix4(), _cr = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _hc = new THREE.Color();
function syncTiles(pulse) { // vuelca la posición/giro de cada casilla a las 3 InstancedMesh
  _lab.makeRotationFromEuler(_e.set(-Math.PI / 2, 0, camYaw + Math.PI)); _lab.setPosition(0, 0.01, 0);
  for (let i = 0; i < N * N; i++) { const T = tiles[i], g = T.g;
    if (!g.visible || T.hole) { tileIM.setMatrixAt(i, _z); labIM.setMatrixAt(i, _z); crIM.setMatrixAt(i, _z); continue; }
    g.updateMatrix(); tileIM.setMatrixAt(i, g.matrix); _m.multiplyMatrices(g.matrix, _lab); labIM.setMatrixAt(i, _m);
    if (T.hotV) { _cr.makeRotationFromEuler(_e.set(-Math.PI / 2, 0, T.crRot)); _cr.setPosition(0, 0.02, 0); _m.multiplyMatrices(g.matrix, _cr); crIM.setMatrixAt(i, _m); tileIM.setColorAt(i, _hc.copy(TCOL[T.n]).lerp(THOT, pulse)); T.wasHot = true; }
    else { crIM.setMatrixAt(i, _z); if (T.wasHot) { T.wasHot = false; tileIM.setColorAt(i, TCOL[T.n]); } } }
  tileIM.instanceMatrix.needsUpdate = labIM.instanceMatrix.needsUpdate = crIM.instanceMatrix.needsUpdate = true; tileIM.instanceColor.needsUpdate = true;
}
// foso brillante bajo el suelo (se ve al caer las casillas)
{ const pit = new THREE.Mesh(new THREE.PlaneGeometry(N * TS + 2, N * TS + 2), new THREE.MeshStandardMaterial({ color: '#1d1430', emissive: '#2b1a52', emissiveIntensity: 0.35, roughness: 0.9 }));
  pit.rotation.x = -Math.PI / 2; pit.position.y = FY - 1.45; scene.add(pit); // v8: foso oscuro justo bajo el suelo (por encima del mar) para que los agujeros se vean claros
  const glow = new THREE.PointLight('#a98bff', 4, 14, 1.8); glow.position.set(0, FY - 1.2, 0); scene.add(glow); }
// paredes y decoración
const room = new THREE.Group(); scene.add(room);
{
  const W = N * TS, WH = 4.2;
  const wallTex = (() => { const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 256; const x = cv.getContext('2d'); x.scale(2, 2);
    for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#ffd6ea' : '#fff3f9'; x.fillRect(i * 32, 0, 32, 128); }
    x.fillStyle = '#c9a8ff'; x.fillRect(0, 0, 512, 16); x.fillStyle = '#ff9cc8'; for (let i = 0; i < 16; i++) { x.beginPath(); x.arc(i * 32 + 16, 112, 9, 0, 7); x.fill(); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(4, 1); return t; })();
  const wallM = new PhysLite({ map: wallTex, roughness: 0.5, clearcoat: 0.4 });
  const capM = new PhysLite({ color: '#ffffff', roughness: 0.25, clearcoat: 1 });
  const colM = new PhysLite({ color: '#c9b4ff', roughness: 0.3, clearcoat: 0.8 });
  for (let s = 0; s < 4; s++) {
    const side = new THREE.Group(); side.rotation.y = s * Math.PI / 2; room.add(side);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(W + 2.4, WH, 1), wallM); wall.position.set(0, FY + WH / 2 - 1.4, HALF + 0.7); wall.castShadow = wall.receiveShadow = true; side.add(wall);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, W + 2.4, 12), capM); cap.rotation.z = Math.PI / 2; cap.position.set(0, FY + WH - 1.3, HALF + 0.7); side.add(cap);
    for (let k = 0; k <= 4; k++) { const x = -W / 2 - 0.6 + k * (W + 1.2) / 4;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, WH + 3.5, 12), colM); col.position.set(x, FY + (WH + 3.5) / 2 - 1.4, HALF + 0.9); col.castShadow = true; side.add(col);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 9), new THREE.MeshStandardMaterial({ color: TILE_COLS[(k + s) % 5], emissive: TILE_COLS[(k + s) % 5], emissiveIntensity: 0.5, roughness: 0.3 }));
      ball.position.set(x, FY + WH + 2.6, HALF + 0.9); ball.userData.lamp = k + s; side.add(ball); }
    // guirnalda de banderines entre columnas
    for (let k = 0; k < 4; k++) { const x0 = -W / 2 - 0.6 + k * (W + 1.2) / 4, x1 = x0 + (W + 1.2) / 4;
      for (let f = 1; f < 5; f++) { const u = f / 9, x = x0 + (x1 - x0) * u, y = FY + WH + 1.8 - Math.sin(u * Math.PI) * 1.3;
        const flag = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.75, 3), new THREE.MeshStandardMaterial({ color: TILE_COLS[(f + k) % 5], roughness: 0.5, side: THREE.DoubleSide }));
        flag.position.set(x, y, HALF + 0.9); flag.rotation.z = Math.PI; flag.userData.flag = f + k * 3; side.add(flag); } }
    // macetas con árboles de caramelo
    for (const x of [-W / 4, W / 4]) { const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.7, 1.2, 18), new THREE.MeshStandardMaterial({ color: '#ffe0a8', roughness: 0.5 })); pot.position.set(x, FY + WH - 0.7, HALF + 0.7); side.add(pot);
      const tr = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), new THREE.MeshStandardMaterial({ color: TILE_COLS[(s + 1) % 5], roughness: 0.35 })); tr.position.set(x, FY + WH + 0.9, HALF + 0.7); tr.castShadow = true; side.add(tr); }
  }
  // gran arco de entrada y cartel
  const arch = new THREE.Mesh(new THREE.TorusGeometry(9, 0.7, 9, 30, Math.PI), capM); arch.position.set(0, FY + 1, -HALF - 1.2); room.add(arch);
  const sc = document.createElement('canvas'); sc.width = 1024; sc.height = 200; const x = sc.getContext('2d'); x.fillStyle = '#ff8fc0'; x.beginPath(); x.roundRect(10, 10, 1004, 180, 90); x.fill();
  x.font = '700 110px Fredoka, sans-serif'; x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Tierra que se hunde', 512, 108);
  const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.35), new THREE.MeshBasicMaterial({ map: st, transparent: true, toneMapped: false })); sign.position.set(0, FY + 10.6, -HALF - 1.2); room.add(sign);
  // base de la sala flotando sobre el mar
  const base = new THREE.Mesh(new THREE.CylinderGeometry(HALF * 1.55, HALF * 0.9, 7, 8), new THREE.MeshStandardMaterial({ color: '#e9d3ff', roughness: 0.8, flatShading: true })); base.position.y = FY - 11; base.rotation.y = Math.PI / 8; room.add(base);
}

// ---------------------------------------------------------------- DECORADOS DE CADA MAPA
const mapG = new THREE.Group(); scene.add(mapG); let curMap = null, obsMeshes = [], mapAnim = [];
const P = (c, o = {}) => new PhysLite({ color: c, roughness: 0.3, clearcoat: 0.7, ...o });
const glowM = c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6, roughness: 0.4 });
function lolliPost(c) { const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 1.6, 16), P('#ffffff')); post.position.y = 0.8; post.castShadow = true; g.add(post);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.28, 8, 20), glowM('#ff6fae')); ring.rotation.x = Math.PI / 2; ring.position.y = 1.3; g.add(ring);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4, 10), P('#fff6e8')); stick.position.y = 3.4; g.add(stick);
  const lol = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.45, 16), P(c)); lol.rotation.x = Math.PI / 2; lol.position.y = 5.8; lol.castShadow = true; g.add(lol);
  mapAnim.push(t => { lol.rotation.y = t * 0.6; }); return g; }
function buildMap(id) {
  if (curMap === id) return; queueMicrotask(castMap); curMap = id; mapG.clear(); obsMeshes = []; mapAnim = []; const M = MAPS[id];
  tiles.forEach((T, i) => { T.hole = M.hole(tx(i), tz(i)); T.g.visible = !T.hole; });
  mergeInto(mapG);
  const ob0 = M.obs(0);
  if (id === 'tiovivo') { // tiovivo gigante girando en el centro
    const C = buildCarousel({ P, glowM, NUMCOL, mergeInto }); C.group.position.y = FY - 1; mapG.add(C.group); C.anims.forEach(f => mapAnim.push(f)); // v9: tiovivo detallado
    ob0.slice(1).forEach((o, k) => { const g = lolliPost(NUMCOL[2 + k * 2]); g.position.set(o.x, FY, o.z); mapG.add(g); });
  }
  if (id === 'tazas') { // tazas gigantes girando por la sala + tetera
    const cups = [];
    for (let k = 0; k < 3; k++) { const g = buildCup(['#ff9cc8', '#7ee3c4', '#b9a2f7'][k], { P }); mergeInto(g); mapG.add(g); cups.push(g); }
    mapAnim.push((t, T) => { MAPS.tazas.obs(T).slice(0, 3).forEach((o, k) => { cups[k].position.set(o.x, FY, o.z); cups[k].rotation.y = T * 1.6 * (k % 2 ? 1 : -1); }); });
    const TP = buildTeapot({ P }); const pot = TP.group; pot.position.set(0, FY + 0.05, 0); pot.scale.setScalar(0.95); mergeInto(pot); mapG.add(pot); TP.anims.forEach(f => mapAnim.push(f));
    mapAnim.push(t => { pot.rotation.y = t * 0.3; });
    // terrones de azúcar y cucharas gigantes alrededor
    for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283; const cube = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), P('#ffffff', { roughness: 0.8 })); cube.position.set(Math.cos(a) * (HALF + 9), FY + 6 + (k % 3) * 3, Math.sin(a) * (HALF + 9)); cube.rotation.set(k, k * 2, 0); mapG.add(cube); mapAnim.push(t => { cube.rotation.y = t * 0.4 + k; cube.position.y = FY + 6 + (k % 3) * 3 + Math.sin(t + k) * 0.8; }); }
  }
  if (id === 'reloj') { // reloj con aguja gigante que barre la sala
    const face = buildClockCenter({ P }); face.position.set(0, FY, 0); mergeInto(face); mapG.add(face);
    const hand = new THREE.Group(); hand.position.set(0, FY + 1.6, 0); mapG.add(hand); { const h = buildClockHand(HALF * 0.86, 1.4, '#7a4fb0', { P }); mergeInto(h); hand.add(h); }
    const sh = new THREE.Group(); sh.position.copy(hand.position); mapG.add(sh); { const h = buildClockHand(HALF * 0.45 - 2, 1.0, '#ff7fb2', { P }); h.position.y = 0.9; mergeInto(h); sh.add(h); }
    mapAnim.push((t, T) => { hand.rotation.y = T * 0.13; sh.rotation.y = -T * 0.08 + 1; });
    // números de reloj gigantes flotando alrededor
    for (let k = 1; k <= 12; k++) { const a = k / 12 * 6.283; const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'); x.font = '700 90px Fredoka'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 12; x.strokeStyle = '#6b3fa0'; x.strokeText(k, 64, 68); x.fillStyle = '#fff'; x.fillText(k, 64, 68);
      const tt = new THREE.CanvasTexture(cv); tt.colorSpace = THREE.SRGBColorSpace; const sp2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: tt })); sp2.scale.set(7, 7, 1); sp2.position.set(Math.sin(a) * (HALF + 10), FY + 13, Math.cos(a) * (HALF + 10)); mapG.add(sp2); }
    for (let k = 0; k < 3; k++) { const gear = new THREE.Mesh(gearGeo(6 + k * 2, 14 + k * 4), P(['#ffcf7a', '#b9a2f7', '#7ee3c4'][k], { metalness: 0.45, roughness: 0.3 })); gear.position.set((k - 1) * 22, FY + 22 + k * 3, -HALF - 14); mapG.add(gear); mapAnim.push(t => { gear.rotation.z = t * (k % 2 ? -0.4 : 0.3); }); }
  }
  if (id === 'gelatina') { // islas de tarta de gelatina que botan y un flan en el centro
    for (const [a, b] of H4) { const g = new THREE.Group(); g.position.set(a * HALF * 0.5, FY - 2, b * HALF * 0.5); mapG.add(g); const c = NUMCOL[[1, 4, 6, 8][(a + 1) + (b + 1) / 2]];
      { const ck = buildJellyCake(c, { P }); mergeInto(ck); g.add(ck); }
      mapAnim.push(t => { const q = Math.sin(t * 3 + a + b * 2); g.scale.set(1 + q * 0.04, 1 - q * 0.06, 1 + q * 0.04); }); }
    const flan = buildFlan({ P }); flan.position.set(0, FY, 0); mergeInto(flan); mapG.add(flan);
    mapAnim.push((t, T) => { const r = MAPS.gelatina.obs(T)[4].r; flan.scale.set(r / 2.2, 2.2 / r, r / 2.2); });
    for (let k = 0; k < 7; k++) { const isl = new THREE.Group(); const a = k / 7 * 6.283; isl.position.set(Math.cos(a) * (HALF + 16), FY + 4 + (k % 3) * 4, Math.sin(a) * (HALF + 16)); mapG.add(isl);
      const c1 = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.4, 3, 16), P(NUMCOL[1 + k % 10])); isl.add(c1); const c2 = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 2.4, 16), P('#ffffff')); c2.position.y = 2.6; isl.add(c2);
      mapAnim.push(t => { isl.position.y = FY + 4 + (k % 3) * 4 + Math.sin(t * 0.8 + k) * 1.2; isl.rotation.y = t * 0.2; }); }
  }
}
function castMap() { mapG.traverse(o => { if (o.isMesh && !(o.material && o.material.emissiveIntensity > 0.5)) o.castShadow = true; }); }
// globos, donuts gigantes y piruletas en las esquinas
const balloons = [], decoG = new THREE.Group(); scene.add(decoG);
// une todas las mallas estáticas de un grupo en una sola malla por material (muchísimos menos draw calls)
function mergeInto(root) {
  root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), buckets = new Map(), kill = [];
  root.traverse(o => { if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || o.material.type === 'ShaderMaterial' || o.userData.keep) return; const m = o.material;
    const key = [m.type, m.color && m.color.getHex(), m.emissive && m.emissive.getHex(), m.emissiveIntensity, m.roughness, m.metalness, m.map && m.map.uuid, m.gradientMap && m.gradientMap.uuid, m.transparent, m.opacity, m.side, m.toneMapped, m.depthWrite].join('|');
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    if (!g.attributes.normal) g.computeVertexNormals(); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!buckets.has(key)) buckets.set(key, { m, gs: [] }); buckets.get(key).gs.push(g); kill.push(o); });
  for (const o of kill) if (o.parent) o.parent.remove(o);
  for (const { m, gs } of buckets.values()) { const n = gs.reduce((a, g) => a + g.attributes.position.count, 0), out = new THREE.BufferGeometry();
    for (const [k, sz] of [['position', 3], ['normal', 3], ['uv', 2]]) { const arr = new Float32Array(n * sz); let off = 0; for (const g of gs) { arr.set(g.attributes[k].array, off); off += g.attributes[k].array.length; } out.setAttribute(k, new THREE.BufferAttribute(arr, sz)); }
    out.computeBoundingSphere(); root.add(new THREE.Mesh(out, m)); gs.forEach(g => g.dispose()); }
}
{ const W = N * TS;
  for (let i = 0; i < 12; i++) { const a = i / 26 * Math.PI * 2, r = HALF + 6 + (i % 3) * 3; const col = NUMCOL[1 + i % 10];
    const b = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), new PhysLite({ color: col, roughness: 0.15, clearcoat: 1 })); b.scale.y = 1.2; b.position.set(Math.cos(a) * r, FY + 9 + (i % 4) * 2.2, Math.sin(a) * r); decoG.add(b); b.userData.ph = i; balloons.push(b); }
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const g = new THREE.Group(); g.position.set(sx * (HALF + 3.2), FY - 1.4, sz * (HALF + 3.2)); scene.add(g);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 12, 12), new THREE.MeshStandardMaterial({ color: '#fff6e8' })); st.position.y = 6; g.add(st);
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d'); for (let k = 0; k < 12; k++) { x.fillStyle = k % 2 ? '#ffffff' : NUMCOL[1 + (k + (sx + 1) * 2) % 10]; x.beginPath(); x.moveTo(128, 128); x.arc(128, 128, 128, k / 12 * 6.283, (k + 1) / 12 * 6.283); x.fill(); }
    const tx2 = new THREE.CanvasTexture(cv); tx2.colorSpace = THREE.SRGBColorSpace;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.8, 20), [new THREE.MeshStandardMaterial({ color: '#ffd0e6' }), new THREE.MeshStandardMaterial({ map: tx2, roughness: 0.3 }), new THREE.MeshStandardMaterial({ map: tx2, roughness: 0.3 })]);
    disc.rotation.x = Math.PI / 2; disc.position.y = 13.5; disc.castShadow = true; g.add(disc); g.userData.lolli = disc; balloons.push(g); }
  for (let s2 = 0; s2 < 4; s2++) for (const u of [-0.32, 0.32]) { const d = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.8, 9, 18), new PhysLite({ color: '#f2b880', roughness: 0.5 }));
    const icing = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.6, 9, 18), new PhysLite({ color: NUMCOL[1 + (s2 * 2 + (u > 0 ? 1 : 0)) % 10], roughness: 0.25, clearcoat: 1 })); icing.position.z = -0.3; d.add(icing);
    const a = s2 * Math.PI / 2, ox = u * W, oz = HALF + 1.3; d.position.set(Math.cos(a) * ox - Math.sin(a) * oz, FY + 1.4, -Math.sin(a) * ox - Math.cos(a) * oz); d.lookAt(0, FY + 1.4, 0); decoG.add(d); } }
const _cnt = r => { let n = 0; r.traverse(o => { if (o.isMesh) n++; }); return n; };
window.__mrg = { before: { room: _cnt(room), deco: _cnt(decoG), cl: world.cl.children.map(_cnt), isl: world.isl.map(_cnt) } };
try { mergeInto(decoG); mergeInto(room); world.cl.children.forEach(mergeInto); world.isl.forEach(mergeInto);
  window.__mrg.after = { room: _cnt(room), deco: _cnt(decoG), cl: world.cl.children.map(_cnt), isl: world.isl.map(_cnt) }; } catch (e) { window.__mrg.err = String(e.stack || e); }

// ---------------------------------------------------------------- ZONA SEGURA (pared brillante + círculo siguiente + minimapa)
const zoneMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uR: { value: 50 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform float uT, uR; varying vec2 vUv;
    void main(){ float a = (1.0 - vUv.y); float st = 0.55 + 0.45 * sin((vUv.x * uR * 1.2 + vUv.y * 6.0 - uT * 3.0));
      vec3 c = mix(vec3(1.0, 0.35, 0.75), vec3(0.6, 0.4, 1.0), vUv.y); gl_FragColor = vec4(c * (0.5 + 0.5 * st), a * a * 0.55 + 0.05); }` });
const zoneWall = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 64, 1, true), zoneMat); zoneWall.visible = false; zoneWall.renderOrder = 5; scene.add(zoneWall);
const nextRing = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 128), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, toneMapped: false, depthWrite: false, side: THREE.DoubleSide }));
nextRing.rotation.x = -Math.PI / 2; nextRing.visible = false; nextRing.renderOrder = 6; scene.add(nextRing);
const mm = $('mm'), mx = mm.getContext('2d');
function drawMini() {
  const W = mm.width, k = W / (N * TS + 4), X = v => W / 2 + v * k; mx.clearRect(0, 0, W, W);
  mx.fillStyle = 'rgba(255,255,255,.85)'; mx.beginPath(); mx.roundRect(0, 0, W, W, 16); mx.fill();
  mx.fillStyle = '#e8dcff'; mx.fillRect(X(-HALF), X(-HALF), HALF * 2 * k, HALF * 2 * k);
  mx.fillStyle = '#5a3d9a'; for (let i = 0; i < N * N; i++) if (tiles[i].s === 2 || tiles[i].hole) mx.fillRect(X(tx(i) - TS / 2), X(tz(i) - TS / 2), TS * k + 0.5, TS * k + 0.5);
  if (S && S.z) { const [cx, cz, r, ncx, ncz, nr] = S.z; mx.save(); mx.beginPath(); mx.rect(0, 0, W, W); mx.moveTo(X(cx) + r * k, X(cz)); mx.arc(X(cx), X(cz), r * k, 0, Math.PI * 2, true); mx.fillStyle = 'rgba(255,90,170,.35)'; mx.fill('evenodd'); mx.restore();
    mx.strokeStyle = '#ff4fa0'; mx.lineWidth = 2; mx.beginPath(); mx.arc(X(cx), X(cz), r * k, 0, 7); mx.stroke(); mx.strokeStyle = '#fff'; mx.setLineDash([4, 3]); mx.beginPath(); mx.arc(X(ncx), X(ncz), Math.max(1.5, nr * k), 0, 7); mx.stroke(); mx.setLineDash([]); }
  for (const [id, c] of chars) { if (!c.alive) continue; mx.fillStyle = id === me ? '#ff2f8a' : '#6b3fa0'; mx.beginPath(); mx.arc(X(c.x), X(c.z), id === me ? 4.5 : 3, 0, 7); mx.fill();
    if (id === me) { mx.strokeStyle = '#ff2f8a'; mx.lineWidth = 2; mx.beginPath(); mx.moveTo(X(c.x), X(c.z)); mx.lineTo(X(c.x + Math.sin(c.h) * 5), X(c.z + Math.cos(c.h) * 5)); mx.stroke(); } }
}

// personajes
const chars = new Map(); let me = 'h', roster = [];
// sombra de mancha (sin mapa de sombras: mucho más barato en móvil)
const BLOBG = new THREE.CircleGeometry(1, 20), blobMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, map: (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(70,30,90,.5)'); g.addColorStop(.45, 'rgba(70,30,90,.28)'); g.addColorStop(1, 'rgba(70,30,90,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })() });
function nameTag(name, mine) { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 72; const x = cv.getContext('2d');
  x.font = '700 34px Fredoka, sans-serif'; const w = Math.min(240, x.measureText(name).width + 34); x.fillStyle = mine ? '#ff7fb6' : 'rgba(255,255,255,.9)'; x.beginPath(); x.roundRect(128 - w / 2, 10, w, 50, 25); x.fill();
  x.fillStyle = mine ? '#fff' : '#8a5aa8'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(name, 128, 37);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(2.8, 0.8, 1); s.renderOrder = 20; return s; }
function buildChars() {
  for (const c of chars.values()) { scene.remove(c.root); scene.remove(c.blob); } chars.clear();
  for (const r of roster) { const root = new THREE.Group(); const m = makeCharacter(chOf(r.ch)); m.scale.setScalar(0.95); m.traverse(o => { if (o.isMesh) o.castShadow = true; }); m.userData.seed = Math.random() * 10;
    root.add(m); const blob = new THREE.Mesh(BLOBG, blobMat); blob.rotation.x = -Math.PI / 2; blob.renderOrder = 2; scene.add(blob);
    if (r.id !== me) { const tag = nameTag(r.name, false); tag.position.y = 2.5; root.add(tag); }
    scene.add(root); chars.set(r.id, { root, m, blob, x: 0, z: 0, h: 0, tx: 0, tz: 0, th: 0, alive: true, fallV: 0, expr: '' }); }
}

// ---------------------------------------------------------------- ESTADO
let sim = null, shell = null, S = null, playing = false, online = false, sendAcc = 0, endSent = false, showcase = null, myCd = 0, specId = null;
let camYaw = 0, camYawV = 0, camInit = false, mmAcc = 0, myJcd = 0, simAcc = 0; const snapBuf = []; /* búfer de interpolación para invitados */ const camT = new THREE.Vector3(0, FY, 0), camP = new THREE.Vector3(0, FY + 12, 30), camLook = new THREE.Vector3(0, FY, 0);
function applySnap(s, first) {
  S = s;
  s.tl.forEach(([n, st, t, perm], i) => { const T = tiles[i]; if (T.n !== n) { T.n = n; drawNum(T, n, false); } if (st !== T.s) { if (st === 2) T.sinkT = 0.0001; if (st === 0 && T.s === 2) { T.rise = 1; T.sinkT = 0; } T.s = st; } T.t = t; T.perm = perm; });
  for (let n = 1; n <= 10; n++) numBusy[n] = false; for (const T of tiles) if (!T.perm && T.s > 0) numBusy[T.n] = true;
  for (const [id, x, z, h, alive, cd, tile, air, w, jcd, vx, vz] of s.p) { const c = chars.get(id); if (!c) continue;
    if (first) { c.x = x; c.z = z; c.h = h; } c.tx = x; c.tz = z; c.th = h; c.tile = tile; if (!sim) { c.air = air; c.w = w; c.vx = vx; c.vz = vz; }
    if (c.alive && !alive) { c.alive = false; c.fallV = 0.5; } if (id === me) { myCd = cd; myJcd = jcd; } }
}
function onEvents(evs) {
  const who = id => { const r = roster.find(r => r.id === id); return r ? (r.id === me ? 'Tú' : r.name) : '?'; };
  for (const e of evs) {
    if (e[0] === 'num') { Sfx.crack(); if (e[1] === me) Sfx.ok(); else { const c = chars.get(me); shell.toast(c && c.alive && c.tile >= 0 && tiles[c.tile].n === e[2] ? `⚠️ ¡${who(e[1])} hunde los ${e[2]}! ¡Sal de ahí!` : `🔨 ${who(e[1])} hunde los ${e[2]}`, 1300); } }
    if (e[0] === 'hop') { if (e[1] === me) Sfx.hop(); const c = chars.get(e[1]); if (c) parts.burst(new THREE.Vector3(c.x, FY + 0.2, c.z), '#ffffff', 10, 2.2, 2); }
    if (e[0] === 'boing') { const c = chars.get(e[1]); if (e[1] === me) Sfx.hop(); }
    if (e[0] === 'gone') { Sfx.sink(); parts.burst(new THREE.Vector3(tx(e[1]), FY - 0.5, tz(e[1])), '#c9a8ff', 18, 4, 4); }
    if (e[0] === 'fall') { Sfx.splash(); const r = roster.find(r => r.id === e[1]); if (r) parts.burst(new THREE.Vector3(e[3], FY, e[4]), chOf(r.ch).color, 40, 6, 7);
      if (e[1] === me) { Sfx.out(); shell.big('¡Te has caído!', 1300); $('spect').classList.add('on'); $('steerHint').classList.remove('on'); $('nums').classList.remove('on'); specId = e[2] && e[2] !== me ? e[2] : null; }
      else shell.toast(e[2] === me ? `💥 ¡Has hundido a ${who(e[1])}!` : `🌊 ${who(e[1])} se ha caído`, 1500); }
    if (e[0] === 'deny' && e[1] === me) { Sfx.bad(); shell.toast(e[2]); }
    if (e[0] === 'znext' && e[1] > 0) { Sfx.tick(); shell.toast('⚠️ ¡La zona va a cerrarse! Ve al círculo blanco', 1800); }
    if (e[0] === 'zshrink') { Sfx.crack(); shell.big('¡La zona se cierra!', 1000); }
    if (e[0] === 'shrink') { shell.big(e[1] ? '¡La sala se encoge!' : '¡Muerte súbita!', 1100); Sfx.crack(); }
    if (e[0] === 'over') { playing = false; const w = e[1]; shell.big(w === me ? '¡Victoria!' : w ? `¡Gana ${who(w)}!` : '¡Empate!', 1500); const c = chars.get(w); if (c) c.expr = 'happy'; specId = w; }
  }
}

// ---------------------------------------------------------------- CONTROLES
let keyL = false, keyR = false, keyU = false, keyD = false, joyM = 1, sentM = 1; const numBusy = new Array(11).fill(false);
function send(d) { if (!playing) return; if (online && !shell.isHost) shell.send({ t: 'gin', ...d }); else sim && sim.input(me, d); }
// v10: joystick fijo abajo a la derecha (mano derecha); números a la izquierda. Multitouch: cada dedo va por su pointerId.
const cv3 = $('c3d'); let drag = null, joyA = null, sentHd = undefined; const joy = $('joy'), knob = $('joyK');
joy.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (!playing || drag) return; Sfx.init(); const r = joy.getBoundingClientRect(); drag = { id: e.pointerId, x0: r.left + r.width / 2, y0: r.top + r.height / 2, ref: camYaw };
  try { joy.setPointerCapture(e.pointerId); } catch (x) { } knob.style.transform = 'translate(-50%,-50%)'; joy.classList.add('on'); joyMove(e); });
function joyMove(e) { if (!drag || e.pointerId !== drag.id) return; let dx = e.clientX - drag.x0, dy = e.clientY - drag.y0; const R = 52, d = Math.hypot(dx, dy);
  if (d > R) { dx *= R / d; dy *= R / d; } const v = Math.min(1, 40 / R); knob.style.transform = `translate(calc(-50% + ${dx * v}px),calc(-50% + ${dy * v}px))`;
  joyA = d > 7 ? Math.atan2(dx, -dy) : null; joyM = Math.max(0, Math.min(1, (Math.min(d, R) - 7) / (R - 22))); }
joy.addEventListener('pointermove', joyMove);
const endDrag = e => { if (!drag || e.pointerId !== drag.id) return; drag = null; joyA = null; joy.classList.remove('on'); knob.style.transform = 'translate(-50%,-50%)'; };
function hop() { if (!playing) return; const c = chars.get(me); if (!c || !c.alive) return; send({ k: 'jump' }); }
{ const hb = $('hopB'); hb.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); Sfx.init(); hop(); hb.classList.add('press'); hb.classList.remove('boing'); void hb.offsetWidth; hb.classList.add('boing'); });
  const up = () => hb.classList.remove('press'); ['pointerup', 'pointercancel', 'pointerleave'].forEach(k => hb.addEventListener(k, up)); }
joy.addEventListener('pointerup', endDrag); joy.addEventListener('pointercancel', endDrag); joy.addEventListener('lostpointercapture', endDrag);
const KMAP = { ArrowLeft: 'L', a: 'L', A: 'L', ArrowRight: 'R', d: 'R', D: 'R', ArrowUp: 'U', w: 'U', W: 'U', ArrowDown: 'D', s: 'D', S: 'D' };
const setKey = (k, v) => { if (k === 'L') keyL = v; if (k === 'R') keyR = v; if (k === 'U') keyU = v; if (k === 'D') keyD = v; };
addEventListener('keydown', e => { if (!playing) return; if (KMAP[e.key]) { e.preventDefault(); setKey(KMAP[e.key], true); }
  else if (e.key === ' ') { e.preventDefault(); hop(); }
  else if (/^[0-9]$/.test(e.key)) pressNum(e.key === '0' ? 10 : +e.key); });
addEventListener('keyup', e => { if (KMAP[e.key]) setKey(KMAP[e.key], false); });
$('nums').innerHTML = Array.from({ length: 10 }, (_, i) => `<button data-n="${i + 1}" style="--c:${NUMCOL[i + 1]}">${i + 1}</button>`).join('') + '<i id="numCd"></i>';
function pressNum(n) { if (!playing) return; const c = chars.get(me); if (!c || !c.alive) return; Sfx.key(); send({ k: 'num', n }); }
$('nums').addEventListener('pointerdown', e => { const b = e.target.closest('button'); if (b) { e.preventDefault(); e.stopPropagation(); pressNum(+b.dataset.n); } });

// ---------------------------------------------------------------- BUCLE
const numEls = []; document.querySelectorAll('#nums button').forEach(b => numEls[+b.dataset.n] = b);
const clock = new THREE.Clock(); let t = 0; const NORENDER = /norender/.test(location.search); const SPD = +new URLSearchParams(location.search).get('spd') || 1;
function frame() {
  const rdt = Math.min(0.25, clock.getDelta()), dt = Math.min(0.05, rdt); t += dt;
  { // dirección relativa a la cámara, recalculada cada frame (como Stumble Guys); teclado: WASD/flechas
    let ja = joyA, m = joyM; const kx = (keyR ? 1 : 0) - (keyL ? 1 : 0), ky = (keyU ? 1 : 0) - (keyD ? 1 : 0); if (kx || ky) { ja = Math.atan2(kx, ky); m = 1; }
    const hd = ja == null ? null : wrap(camYaw - ja);
    if (playing && (hd === null ? sentHd !== null : (sentHd == null || Math.abs(wrap(hd - sentHd)) > 0.025 || Math.abs(m - sentM) > 0.06))) { sentHd = hd; sentM = m; send({ k: 'mv', v: hd == null ? null : +hd.toFixed(3), m: +m.toFixed(2) }); } }
  if (sim && (playing || (sim.over && !endSent))) {
    { simAcc = Math.min(0.25, simAcc + rdt * SPD); while (simAcc >= STEP) { sim.step(STEP); simAcc -= STEP; } }
    const ev = sim.ev.splice(0); applySnap(sim.snap()); if (ev.length) { onEvents(ev); if (online) shell.send({ t: 'gev', e: ev }); }
    sendAcc += dt; if (online && sendAcc > 0.066) { sendAcc = 0; shell.send({ t: 'gs', s: sim.snap() }); }
    if (sim.over && !endSent) { endSent = true; const res = { ranking: sim.ranking, roster }; if (online) shell.send({ t: 'gend', res }); setTimeout(() => finish(res), 900); }
  }
  for (let i = 0; i < N * N; i++) { const T = tiles[i]; if (T.hole) continue;
    if (T.s === 1) { const k = 1 - Math.max(0, T.t) / CRACK, w = Math.sin(t * 38 + i) * 0.045 * (0.4 + Math.min(1, k));
      T.g.rotation.set(w, 0, -w * 0.8); T.g.position.y = FY - Math.min(1, k) * 0.12;
      if (!T.hot) { T.hot = true; drawNum(T, T.n, true); } }
    else if (T.s === 2) { T.rise = 0; if (T.g.visible) { T.sinkT += dt; const k = T.sinkT; T.g.position.y = FY - k * k * 9; T.g.rotation.x += dt; T.g.rotation.z += dt * 0.7; if (k > 1.5) T.g.visible = false; } }
    else { T.g.visible = true; T.g.rotation.set(0, 0, 0); if (T.rise > 0) { T.rise = Math.max(0, T.rise - dt * 1.6); T.g.position.y = FY - T.rise * T.rise * 6; } else T.g.position.y = FY; if (T.hot) { T.hot = false; drawNum(T, T.n, false); } }
    if (T.ping > 0) T.ping = Math.max(0, T.ping - dt * 2.5);
  }
  syncTiles(0.35 + 0.3 * (0.5 + 0.5 * Math.sin(t * 20)));
  const alpha = simAcc / STEP, rnow = performance.now() - 115; // interpolación entre pasos de física (host) o entre instantáneas (invitado)
  let s0 = null, s1 = null; if (!sim && snapBuf.length) { for (let i = snapBuf.length - 1; i >= 0; i--) if (snapBuf[i].at <= rnow) { s0 = snapBuf[i]; s1 = snapBuf[i + 1] || null; break; } if (!s0) s0 = snapBuf[0]; }
  const simP = sim ? new Map(sim.P.map(p => [p.id, p])) : null, idx = s0 ? new Map(s0.s.p.map((q, i) => [q[0], i])) : null;
  for (const [id, c] of chars) {
    const ox = c.x, oz = c.z;
    if (simP && simP.has(id)) { const p = simP.get(id); c.x = p.px + (p.x - p.px) * alpha; c.z = p.pz + (p.z - p.pz) * alpha; c.h = p.ph + wrap(p.h - p.ph) * alpha; c.air = p.air; c.w = p.w; }
    else if (s0 && idx.has(id)) { const a0 = s0.s.p[idx.get(id)]; let x = a0[1], z = a0[2], h = a0[3];
      if (s1) { const a1 = s1.s.p[idx.get(id)], f = Math.max(0, Math.min(1, (rnow - s0.at) / Math.max(1, s1.at - s0.at))); if (a1) { x += (a1[1] - x) * f; z += (a1[2] - z) * f; h += wrap(a1[3] - h) * f; } }
      else { const ex = Math.min(0.12, (rnow - s0.at) / 1000); x += (a0[10] || 0) * ex; z += (a0[11] || 0) * ex; }
      c.x = x; c.z = z; c.h = h; }
    else { const k = 1 - Math.exp(-dt * 14); c.x += (c.tx - c.x) * k; c.z += (c.tz - c.z) * k; c.h += wrap(c.th - c.h) * k; }
    if (c.alive) { const run = playing ? 1 : 0, sp = dt > 0 ? Math.hypot(c.x - ox, c.z - oz) / dt : 0; c.spd = (c.spd || 0) + (Math.min(12, sp) - (c.spd || 0)) * Math.min(1, dt * 10);
      const sn = Math.min(1.3, c.spd / SPEED) * run; c.ph2 = (c.ph2 || 0) + dt * (4 + c.spd * 1.55) * run;
      const air = c.air || 0, hy = air > 0 ? Math.sin((1 - air / HOP_T) * Math.PI) * 1.7 : 0;
      if (c.wasAir && air <= 0) { c.land = 1; parts.burst(new THREE.Vector3(c.x, FY + 0.1, c.z), '#fff4fb', 12, 2.5, 1.5); } c.wasAir = air > 0; c.land = Math.max(0, (c.land || 0) - dt * 5);
      c.lean = (c.lean || 0) + (Math.max(-0.42, Math.min(0.42, -(c.w || 0) * 0.075)) - (c.lean || 0)) * Math.min(1, dt * 10);
      c.root.position.set(c.x, FY + Math.abs(Math.sin(c.ph2)) * 0.26 * sn + hy, c.z); c.blob.visible = true; c.blob.position.set(c.x, FY + 0.05, c.z); c.blob.scale.setScalar(1.25 - hy * 0.18); c.root.rotation.set(0, c.h, c.lean);
      const sq = 1 + (air > 0 ? 0.12 : Math.sin(c.ph2 * 2) * 0.07 * sn) - c.land * 0.28; c.m.scale.set(0.95 / Math.sqrt(sq), 0.95 * sq, 0.95 / Math.sqrt(sq)); c.m.rotation.x = (0.08 + 0.1 * sn) * run + (air > 0 ? -0.25 : 0);
      if (run && air <= 0 && (c.dust = (c.dust || 0) + dt * c.spd) > 2.2) { c.dust = 0; parts.burst(new THREE.Vector3(c.x - Math.sin(c.h) * 0.6, FY + 0.15, c.z - Math.cos(c.h) * 0.6), '#fdf2ff', 2, 0.7, 1.1); }
      const ti = c.tile != null && c.tile >= 0 ? tiles[c.tile] : null; c.expr = playing && ti && ti.s === 1 ? 'squash' : (c.expr === 'happy' ? 'happy' : ''); }
    else { c.blob.visible = false; c.fallV += dt * 16; c.root.position.y -= c.fallV * dt; c.root.rotation.z += dt * 3; c.expr = 'squash'; if (c.root.position.y < FY - 12) c.root.visible = false; }
    animCharacter(c.m, t + c.m.userData.seed, 2, c.expr);
  }
  if (showcase) { showcase.rotation.y = Math.sin(t * 0.8) * 0.5; showcase.position.y = FY + Math.abs(Math.sin(t * 2.2)) * 0.25; animCharacter(showcase, t, 1, (t % 4) < 0.6 ? 'happy' : ''); }
  { const T = S ? S.T + (sim ? 0 : 0) : t; for (const f of mapAnim) f(t, S && (sim || online) ? T : t); }
  for (const b of balloons) { if (b.userData.lolli) b.userData.lolli.rotation.y = t * 0.4; else b.position.y += Math.sin(t * 1.3 + b.userData.ph) * 0.006; }
  for (let n = 1; n <= 10; n++) { const el = numEls[n]; if (el) el.classList.toggle('busy', numBusy[n]); }
  { const c = chars.get(me); const cur = c && c.alive && c.tile >= 0 && tiles[c.tile] ? tiles[c.tile].n : 0; for (let n = 1; n <= 10; n++) numEls[n] && numEls[n].classList.toggle('mine', n === cur); }
  
  // HUD
  if (S) { const al = S.p.filter(p => p[4]).length; $('hAlive').textContent = `🍡 ${al} de ${S.p.length} en pie`;
    { const z = S.z, st = z[7]; $('hNext').textContent = st === 2 ? '🌀 ¡Último círculo!' : st === 1 ? '🌀 ¡La zona se está cerrando!' : z[8] < 0 ? 'La zona aparece pronto' : `⚠️ La zona se cierra en ${Math.ceil(z[6])} s`; $('hNext').classList.toggle('warn', st === 1 || z[6] < 5);
      const c = chars.get(me); $('hOut').classList.toggle('on', !!(c && c.alive && Math.hypot(c.x - z[0], c.z - z[1]) > z[2] - 2)); }
    { const hb = $('hopB'); hb.style.setProperty('--cd', (myJcd / HOP_CD * 360) + 'deg'); hb.classList.toggle('cd', myJcd > 0); }
    $('numCd').style.height = (myCd / COOLDOWN * 100) + '%'; $('nums').classList.toggle('cd', myCd > 0); }
  // cámara en tercera persona (detrás y un poco por encima), como en Mochi
  const port = camera.aspect < 1;
  const tgtId = (chars.get(me) && chars.get(me).alive) ? me : (specId && chars.get(specId) && chars.get(specId).alive ? specId : ([...chars.entries()].find(([, c]) => c.alive) || [])[0]);
  const fc = tgtId ? chars.get(tgtId) : null;
  if (fc && (sim || online)) { const back = port ? 12.6 : 9.8, up = port ? 11.2 : 7.2; // v8: más alta y alejada para ver los agujeros de alrededor
    if (!camInit) { camYaw = fc.h; camInit = true; }
    // la cámara sigue la dirección real de avance (suave, sin pelearse con el personaje) y mira un poco hacia delante
    const vx = fc.vx != null && sim == null ? fc.vx : (simP && simP.get(tgtId) ? simP.get(tgtId).vx : Math.sin(fc.h)), vz = fc.vz != null && sim == null ? fc.vz : (simP && simP.get(tgtId) ? simP.get(tgtId).vz : Math.cos(fc.h));
    // cámara de ángulo fijo que se realinea despacio detrás del movimiento (nunca gira de golpe; si corres hacia la cámara no se da la vuelta)
    { const spv = Math.hypot(vx, vz), df = wrap(Math.atan2(vx, vz) - camYaw), al = Math.max(0, Math.cos(df) + 0.35) / 1.35;
      const rate = 0.95 * Math.min(1, spv / SPEED) * al; camYawV += (wrap(df) * rate - camYawV) * (1 - Math.exp(-dt * 4)); camYaw = wrap(camYaw + camYawV * dt); }
    const la = port ? 4.2 : 3.4; camP.set(fc.x - Math.sin(camYaw) * back, FY + up, fc.z - Math.cos(camYaw) * back); camT.set(fc.x + Math.sin(camYaw) * la + vx * 0.25, FY + 0.4, fc.z + Math.cos(camYaw) * la + vz * 0.25);
    camera.position.lerp(camP, 1 - Math.exp(-dt * 12)); camLook.lerp(camT, 1 - Math.exp(-dt * 12)); }
  if (mapG) mapG.visible = !$('sChars').classList.contains('on'); // que el decorado no tape al personaje al elegir
  if (fc && (sim || online)) {} else if ($('sChars').classList.contains('on')) { camP.set(0, FY + 2.6, 15.5); camT.set(0, FY - 1.3, 0); camera.position.lerp(camP, 1 - Math.exp(-dt * 3)); camLook.lerp(camT, 1 - Math.exp(-dt * 3)); }
  else { camP.set(Math.sin(t * 0.1) * 3, FY + 6, 14.5); camT.set(0, FY + 1.6, 0); camera.position.lerp(camP, 1 - Math.exp(-dt * 3)); camLook.lerp(camT, 1 - Math.exp(-dt * 3)); }
  camera.lookAt(camLook); if (window.__onFrame) window.__onFrame(rdt);
  fadeOccluders(fc && (sim || online) ? fc : null, dt);
  if (S && S.z && (sim || online)) { const [cx, cz, r, ncx, ncz, nr, zt, st] = S.z; const R = Math.min(r, HALF * 1.6);
    zoneWall.visible = true; zoneWall.position.set(cx, FY + 7, cz); zoneWall.scale.set(R, 22, R); zoneMat.uniforms.uT.value = t; zoneMat.uniforms.uR.value = R;
    nextRing.visible = st !== 2 && nr < r - 0.5; nextRing.position.set(ncx, FY + 0.08, ncz); nextRing.scale.setScalar(Math.max(0.6, nr)); nextRing.material.opacity = 0.6 + 0.4 * Math.sin(t * 5);
    if ((mmAcc += dt) > 0.12) { mmAcc = 0; drawMini(); } } else { zoneWall.visible = nextRing.visible = false; }
  world.update(t); parts.update(dt); if (!NORENDER) composer.render();
  // calidad adaptativa según FPS reales: solo baja, nunca sube
  if (playing && !NORENDER) { Q.acc += rdt; Q.n++; if (Q.acc > 1) { const avg = Q.acc / Q.n * 1000; Q.acc = 0; Q.n = 0; Q.last = avg;
    const setQ = lv => { Q.lv = lv; renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.dprs[lv])); renderer.setSize(innerWidth, innerHeight, false); parts.pts.visible = lv < 7; const sh = lv <= 3 && !/noshadows/.test(location.search); if (renderer.shadowMap.enabled !== sh) { renderer.shadowMap.enabled = sh; scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); }); } };
    // v10: baja enseguida si no llega a ~55 fps; sube solo tras 4 s estables a 60 y sin reintentar un nivel que falló hace poco
    const now = performance.now();
    if (avg > 18.2 && Q.lv < Q.dprs.length - 1) { if (++Q.bad >= (avg > 24 ? 1 : 2)) { Q.bad = 0; Q.good = 0; Q.fail[Q.lv] = now; setQ(Math.min(Q.dprs.length - 1, Q.lv + (avg > 30 ? 2 : 1))); } }
    else if (avg < 17.3 && Q.lv > 0) { Q.bad = 0; if (++Q.good >= 4 && !(now - (Q.fail[Q.lv - 1] || -1e9) < 30000)) { Q.good = 0; setQ(Q.lv - 1); } } else { Q.good = 0; Q.bad = 0; } } }
  requestAnimationFrame(frame);
}

// v8: con la cámara más alta, el decorado que queda entre la cámara y tu mochi se vuelve translúcido para que nunca te tape
const _bx = new THREE.Box3(), _bs = new THREE.Sphere();
function fadeOccluders(fc, dt) {
  for (const g of mapG.children) {
    let u = g.userData.occ; if (!u) { _bx.setFromObject(g); if (_bx.isEmpty()) { g.userData.occ = { skip: true }; continue; } _bx.getBoundingSphere(_bs);
      u = g.userData.occ = { skip: _bx.max.y < FY + 2 || _bs.radius > HALF * 0.8, cx: _bs.center.x, cz: _bs.center.z, r: Math.min(_bs.radius, Math.max(_bx.max.x - _bx.min.x, _bx.max.z - _bx.min.z) / 2) + 1, a: 1, mats: null }; }
    if (u.skip) continue;
    let tgt = 1;
    if (fc) { const ax = camera.position.x, az = camera.position.z, bx = fc.root.position.x, bz = fc.root.position.z, dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
      const k = Math.max(0, Math.min(1, ((u.cx - ax) * dx + (u.cz - az) * dz) / L2)), px = ax + dx * k - u.cx, pz = az + dz * k - u.cz;
      if (k < 0.98 && px * px + pz * pz < u.r * u.r) tgt = 0.28; }
    if (Math.abs(u.a - tgt) < 0.01 && !u.mats) continue;
    u.a += (tgt - u.a) * (1 - Math.exp(-dt * 8));
    if (!u.mats) { u.mats = []; g.traverse(o => { if (o.isMesh && o.material && !Array.isArray(o.material)) { const m = o.material.clone(); m.userData.o0 = o.material.opacity; m.userData.t0 = o.material.transparent; m.userData.d0 = o.material.depthWrite; o.material = m; u.mats.push(m); } }); }
    const fading = u.a < 0.985;
    for (const m of u.mats) { if (m.transparent !== (fading || m.userData.t0)) { m.transparent = fading || m.userData.t0; m.needsUpdate = true; } m.opacity = m.userData.o0 * (fading ? u.a : 1); m.depthWrite = fading ? false : m.userData.d0; }
  }
}
// ---------------------------------------------------------------- MENÚ / ARRANQUE
function resetBoard() { for (let i = 0; i < N * N; i++) { const T = tiles[i]; T.s = 0; T.sinkT = 0; T.rise = 0; T.perm = 0; T.g.visible = !T.hole; T.n = (i * 7 + (i / N | 0) * 3) % 10 + 1; drawNum(T, T.n, false); } }
function setShowcase(chId) { if (showcase) scene.remove(showcase); showcase = makeCharacter(chOf(chId)); showcase.scale.setScalar(1.3); showcase.position.set(0, FY, 4); showcase.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(showcase); }
function finish(res) { $('hud').classList.remove('on'); $('nums').classList.remove('on'); $('spect').classList.remove('on'); $('steerHint').classList.remove('on'); $('mm').classList.remove('on'); $('hopB').classList.remove('on'); $('hOut').classList.remove('on'); shell.end(res); }
function start(cfg, api) {
  buildMap(cfg.map || 'tiovivo');
  shell = api; roster = cfg.roster; online = cfg.online; me = api.myId; endSent = false; joyA = null; sentHd = undefined; camInit = false; specId = null; myCd = 0; myJcd = 0; simAcc = 0; snapBuf.length = 0;
  if (showcase) { scene.remove(showcase); showcase = null; }
  resetBoard(); buildChars(); $('spect').classList.remove('on');
  sim = (!online || api.isHost) ? new Sim(cfg) : null; if (sim) applySnap(sim.snap(), true);
  $('hud').classList.add('on'); $('nums').classList.add('on'); $('mm').classList.add('on'); $('hopB').classList.add('on'); $('steerHint').classList.add('on'); setTimeout(() => $('steerHint').classList.remove('on'), 6000);
  playing = false; let n = 3; api.big('3', 0); Sfx.tick();
  const cd = setInterval(() => { n--; if (n > 0) { api.big(String(n), 0); Sfx.tick(); } else { clearInterval(cd); api.big('¡Ya!', 700); Sfx.go(); playing = true; } }, 750);
}
function stop() { playing = false; sim = null; S = null; online = false; finishUI(); for (const c of chars.values()) { scene.remove(c.root); scene.remove(c.blob); } chars.clear(); resetBoard(); setShowcase(localStorage.getItem('ms_ch') || 'mochi'); }
function finishUI() { ['hud', 'nums', 'spect', 'steerHint', 'mm', 'hOut', 'hopB'].forEach(id => $(id).classList.remove('on')); }

createShell({
  id: 'hunde', titleA: 'Tierra que', titleB: 'se hunde', prefix: 'mochihunde-v3-',
  sub: '¡Corre, hunde casillas y sé el último mochi en pie!',
  how: `<ul><li><b>Pon el dedo</b> en cualquier sitio y arrastra hacia donde quieras ir, como un joystick: tu mochi corre en esa dirección y se para al soltar (en PC: WASD o flechas).</li>
    <li>Pulsa <b>🦘 Salto</b> (o espacio) para saltar por encima de una casilla que se hunde. Tiene recarga.</li>
    <li>Pulsa un <b>número del 1 al 10</b> (columna de la derecha, o el teclado en PC) y <b>todas las casillas con ese número</b> se hunden… ¡con quien esté encima! Ojo: también la tuya si es ese número.</li>
    <li>Las casillas hundidas vuelven a subir al rato.</li>
    <li>Como en Fortnite, una <b>zona</b> se va cerrando por fases (mira el círculo blanco y el minimapa): fuera de ella el suelo se desmorona.</li>
    <li>Los postes de piruleta te hacen rebotar.</li>
    <li>Antes de caer, la casilla <b>se agrieta y tiembla</b> un segundo: si es la tuya, ¡sal de ahí!</li>
    <li>Si pisas un agujero, te caes. El martillo tarda un poco en recargarse.</li>
    <li>La sala <b>se encoge</b> cada poco y cada vez queda menos suelo. Gana el <b>último mochi en pie</b>.</li></ul>`,
  onPreview: chId => setShowcase(chId), start, stop,
  maps: Object.entries(MAPS).map(([k, m]) => [k, m.name]),
  onMap: v => { if (v !== 'random' && MAPS[v]) { buildMap(v); resetBoard(); } },
  onNetMsg(d, api) {
    if (d.t === 'gin' && sim && api.isHost) { sim.input(d.from, d); return; }
    if (sim) return;
    if (d.t === 'gs') { snapBuf.push({ at: performance.now(), s: d.s }); while (snapBuf.length > 12) snapBuf.shift(); applySnap(d.s, !S); }
    if (d.t === 'gev') onEvents(d.e);
    if (d.t === 'gend' && !endSent) { endSent = true; playing = false; setTimeout(() => finish(d.res), 900); }
  },
  onLeft(id) { if (sim) { const p = sim.P.find(p => p.id === id); if (p && p.alive) { p.ai = { goal: null, gt: 0, atk: 3, react: 0 }; p.skill = 0.6; p.bot = true; } } },
});
// v13: acceso al nuevo modo Carrera en las alturas desde el menú
{ const r = document.querySelector('#sHome #bSolo'); if (r) { const row = document.createElement('div'); row.className = 'row'; row.innerHTML = '<button class="btn mint" id="bCarrera">🏔️ ¡NUEVO! Carrera en las alturas</button>'; r.parentElement.after(row); $('bCarrera').onclick = () => { Sfx.init(); Sfx.tap(); location.href = './carrera.html'; }; } }
setShowcase(localStorage.getItem('ms_ch') || 'mochi'); { const m0 = localStorage.getItem('hunde_map'); buildMap(MAPS[m0] ? m0 : 'tiovivo'); } resetBoard();
frame();
window.__rend = () => { const c = chars.get(me); return c ? [c.root.position.x, c.root.position.z, c.root.rotation.y, c.alive ? 1 : 0] : null; };
window.__hunde = { get sim() { return sim; }, get playing() { return playing; }, godMe(on) { if (sim) { sim.P[0].ai = on ? { goal: null, gt: 0, atk: 1, react: 0 } : null; sim.P[0].skill = 1; } } };
