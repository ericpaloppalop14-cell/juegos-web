// ======================================================================
//  TIERRA QUE SE HUNDE · MODO CARRERA EN LAS ALTURAS (v13)
//  Todos corren hacia delante por una pasarela altísima llena de números
//  (metros). A los lados, vacío y un valle precioso muy abajo. Empuja a los
//  demás al vacío, salta los huecos, coge regalos… y el suelo se hunde
//  detrás de vosotros cada vez más rápido. ¡Gana quien llegue más lejos!
// ======================================================================
import * as THREE from 'three';
import { createRenderer, addLights, Particles } from './world.js?v=v19';
import { makeCharacter, animCharacter } from './gfx.js?v=v19';
import { chOf } from './chars.js?v=v19';
import { createShell } from './shell.js?v=v19';
import { Sfx } from './sfx.js?v=v19';

const $ = id => document.getElementById(id);
const RL = 2, COLS = 4, CW = 2.5, TW = COLS * CW, HW = TW / 2; // filas de 2 m, 4 carriles de 2,5 m
const STEP = 1 / 60, SPEED = 7, LAT = 6.5, HOP_T = 0.8, HOP_CD = 1.6, PAD_T = 1.15, PUSH_CD = 1.7;
const KNOCK = 8.5, KNOCK_BIG = 17, PUSH_R = 1.9, PUSH_R_BIG = 3.2, SINK_DELAY = 1.0;
const NUMCOL = ['#ff8fb8', '#ffa673', '#f2c64e', '#7fd08a', '#4fcabb', '#6eaef2', '#9789f2', '#c487e6', '#f4878f'];
const FIN = 400; // meta del relevo con tortuga
let curMode = new URLSearchParams(location.search).get('modo') || localStorage.getItem('hunde_carrera_modo') || 'carrera'; if (!['carrera', 'tortuga'].includes(curMode)) curMode = 'carrera'; localStorage.setItem('hunde_carrera_modo', curMode);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------------------------------------------------------------- PISTA (determinista a partir de la semilla: todos la ven igual)
// Bloques de 8 filas: llano, slalom de agujeros, hueco para saltar, suelo que se hunde, muelles, tramo estrecho (¡a empujar!)
const rowCache = new Map(); let rowSeed = 0;
function blockType(b) { if (b < 3) return 'plain'; const R = rng(rowSeed ^ (b * 7919 + 13)); const d = Math.min(1, b / 40), x = R();
  const W = [['plain', 1.2 - d * 0.6], ['holes', 1 + d], ['gap', 0.7 + d * 0.6], ['sink', 0.6 + d * 0.5], ['pad', 0.5], ['narrow', 0.6 + d * 0.5]];
  const tot = W.reduce((a, w) => a + w[1], 0); let acc = 0; for (const [k, w] of W) { acc += w / tot; if (x < acc) return k; } return 'plain'; }
function row(r) {
  let o = rowCache.get(r); if (o) return o;
  o = { t: 'n', hole: [0, 0, 0, 0], pad: [0, 0, 0, 0], box: -1 };
  if (r >= 0) { const b = Math.floor(r / 8), k = r % 8, ty = blockType(b), R = rng(rowSeed ^ (b * 104729 + 7)), d = Math.min(1, b / 40);
    const a = R() * 4 | 0, a2 = (a + 1 + (R() * 3 | 0)) % 4, bb = R() * 4 | 0, boxc = R() * 4 | 0, boxp = R();
    if (ty === 'holes') { if (k === 2 || k === 3) { o.hole[a] = 1; if (d > 0.3) o.hole[a2] = 1; } if (k === 5 || k === 6) { o.hole[bb] = 1; o.hole[3 - bb] = d > 0.5 ? 1 : 0; } }
    if (ty === 'gap' && (k === 4 || (k === 5 && d > 0.6))) { o.t = 'gap'; o.hole = [1, 1, 1, 1]; }
    if (ty === 'sink' && k >= 2 && k <= (d > 0.5 ? 5 : 4)) o.t = 'sink';
    if (ty === 'pad' && k === 3) { o.pad[a] = 1; o.pad[(a + 2) % 4] = 1; }
    if (ty === 'pad' && (k === 5 || k === 6)) { o.hole[(a + 1) % 4] = 1; o.hole[(a + 3) % 4] = 1; }
    if (ty === 'narrow' && k >= 1 && k <= 6) { o.hole[0] = 1; o.hole[3] = 1; if (d > 0.6 && k >= 3 && k <= 4) o.hole[1 + (b % 2)] = 0; }
    if ((ty === 'plain' || ty === 'narrow') && k === 4 && boxp < 0.75) { let c = boxc; if (o.hole[c]) c = 1 + (boxc % 2); o.box = c; }
    if (ty === 'plain' && k === 1 && boxp > 0.5 && b > 1) o.box = (boxc + 2) % 4; }
  rowCache.set(r, o); if (rowCache.size > 3000) rowCache.delete(rowCache.keys().next().value); return o;
}
const colOf = x => Math.floor((x + HW) / CW), rowOf = z => Math.floor(z / RL), colX = c => -HW + CW * (c + 0.5);

// ---------------------------------------------------------------- SIMULACIÓN (anfitrión / solitario)
class Sim {
  constructor(cfg) {
    this.T = 0; this.ev = []; this.over = false; this.dead = []; this.zc = -14; this.sinks = new Map(); this.picked = new Set(); this.bananas = []; this.bid = 0;
    this.wind = { st: 'idle', t: 22, dir: 1 }; this.mode = cfg.mode === 'tortuga' ? 'tortuga' : 'carrera'; if (this.mode === 'tortuga') this.tt = { x: 0, z: 14, by: null, cool: 0 };
    const k = cfg.roster.length;
    this.P = cfg.roster.map((r, i) => { const x = clamp((i - (k - 1) / 2) * (TW - 1.5) / Math.max(1, k - 1), -HW + 0.9, HW - 0.9), z = -2 - (i % 2) * 1.6;
      return { ...r, x, z, px: x, pz: z, h: 0, ph: 0, vx: 0, vz: 0, kx: 0, kz: 0, air: 0, air0: HOP_T, jcd: 0.5, pcd: 1, stun: 0, turbo: 0, pw: '', alive: true, dist: 0, ix: 0, iy: 0, carry: 0,
        ai: r.bot ? { tx: x, react: 0, push: 1 + Math.random() * 2, err: 0 } : null }; });
  }
  input(id, d) { const p = this.P.find(p => p.id === id); if (!p || !p.alive || this.over) return;
    if (d.k === 'mv') { p.ix = clamp(+d.x || 0, -1, 1); p.iy = clamp(+d.y || 0, -1, 1); }
    if (d.k === 'jump') this.jump(p);
    if (d.k === 'push') this.push(p); }
  jump(p) { if (p.jcd > 0 || p.air > 0) return; p.air = p.air0 = HOP_T; p.jcd = HOP_CD; this.ev.push(['hop', p.id]); }
  push(p) {
    if (p.pcd > 0) { this.ev.push(['deny', p.id, 'El empujón se está recargando']); return; }
    const big = p.pw === 'guante'; if (big) p.pw = ''; p.pcd = PUSH_CD; p.dash = 0.2; let hit = 0;
    for (const q of this.P) { if (q === p || !q.alive || q.air > 0.15) continue; const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz); if (d > (big ? PUSH_R_BIG : PUSH_R)) continue;
      const sx = Math.abs(dx) > 0.15 ? Math.sign(dx) : (q.x >= 0 ? 1 : -1), K = big ? KNOCK_BIG : KNOCK;
      q.kx += sx * K * 0.85 + dx / (d || 1) * K * 0.25; q.kz += dz / (d || 1) * K * 0.35; q.stun = big ? 0.8 : 0.45; if (this.tt && this.tt.by === q.id) this.dropT(q); q.lastHit = p.id; q.hitT = 2.5; hit++; this.ev.push(['hit', p.id, q.id, big ? 1 : 0]); }
    this.ev.push(['push', p.id, hit, big ? 1 : 0]);
  }
  solid(x, z) { // ¿hay suelo aquí?
    if (Math.abs(x) > HW + 0.15) return false; if (z < -9) return false; if (z < this.zc) return false;
    const r = rowOf(z); if (r < 0) return true; const R = row(r), c = clamp(colOf(x), 0, 3); if (R.hole[c]) return false;
    if (R.t === 'sink') { const s = this.sinks.get(r * 4 + c); if (s != null && this.T - s > SINK_DELAY) return false; }
    return true; }
  step(dt) {
    if (this.over) return; this.T += dt;
    const cs = Math.min(10, 3.2 + this.T * 0.055); this.zc += cs * dt; // el suelo se hunde detrás, cada vez más rápido
    const W = this.wind; W.t -= dt; // ventolera
    if (W.st === 'idle' && W.t <= 0) { W.st = 'warn'; W.t = 2; W.dir = Math.random() < 0.5 ? -1 : 1; this.ev.push(['wwarn', W.dir]); }
    else if (W.st === 'warn' && W.t <= 0) { W.st = 'blow'; W.t = 2.6; this.ev.push(['wblow', W.dir]); }
    else if (W.st === 'blow' && W.t <= 0) { W.st = 'idle'; W.t = 13 + Math.random() * 8; }
    const wind = W.st === 'blow' ? W.dir * 3.1 : 0;
    for (const p of this.P) {
      if (!p.alive) continue; p.px = p.x; p.pz = p.z; p.ph = p.h;
      p.jcd = Math.max(0, p.jcd - dt); p.pcd = Math.max(0, p.pcd - dt); p.stun = Math.max(0, p.stun - dt); p.turbo = Math.max(0, p.turbo - dt); p.hitT = Math.max(0, (p.hitT || 0) - dt); p.dash = Math.max(0, (p.dash || 0) - dt);
      if (p.ai) this.bot(p, dt);
      const ctl = p.stun > 0 ? 0.15 : 1;
      let f = p.ai ? p.ai.fwd : 0.9 + (p.iy > 0 ? p.iy * 0.2 : p.iy * 0.45); if (this.tt && this.tt.by === p.id) f *= 0.9; if (p.turbo > 0) f *= 1.5; if (p.air > 0) f *= 1.15; if (p.dash > 0) f *= 1.25;
      const tvz = SPEED * f, tvx = -p.ix * LAT; // la cámara mira a +z: derecha de la pantalla = -x
      p.vz += (tvz - p.vz) * (1 - Math.exp(-dt * 6 * ctl)); p.vx += (tvx - p.vx) * (1 - Math.exp(-dt * 10 * ctl));
      p.kx *= Math.exp(-dt * 3.2); p.kz *= Math.exp(-dt * 3.2); // empujones con inercia
      if (p.air > 0) { p.air = Math.max(0, p.air - dt); }
      p.x += (p.vx + p.kx + wind) * dt; p.z += (p.vz + p.kz) * dt; if (p.z < p.pz - 0.5 * dt) p.z = p.pz - 0.5 * dt;
      const sp = Math.hypot(p.vx + p.kx, p.vz + p.kz); if (sp > 0.5) p.h = wrap(p.h + wrap(Math.atan2(p.vx + p.kx, p.vz + p.kz) - p.h) * (1 - Math.exp(-dt * 12)));
      p.dist = Math.max(p.dist, p.z);
      if (p.air <= 0) {
        const r = rowOf(p.z), R = r >= 0 ? row(r) : null, c = colOf(p.x);
        if (R && R.t === 'sink' && c >= 0 && c < 4 && !this.sinks.has(r * 4 + c)) { this.sinks.set(r * 4 + c, this.T); this.ev.push(['sink', r]); }
        if (R && c >= 0 && c < 4 && R.pad[c] && !R.hole[c]) { p.air = p.air0 = PAD_T; p.vz = Math.max(p.vz, SPEED * 1.15); this.ev.push(['pad', p.id]); }
        else if (!this.solid(p.x, p.z)) { this.kill(p); continue; }
        if (R && R.box >= 0 && !this.picked.has(r) && Math.abs(p.x - colX(R.box)) < 1.3 && Math.abs(p.z - (r + 0.5) * RL) < 1.3) this.pick(p, r);
        for (let i = this.bananas.length - 1; i >= 0; i--) { const b = this.bananas[i]; if (b.by === p.id && b.age < 0.6) continue; if (Math.hypot(p.x - b.x, p.z - b.z) < 0.85) { this.bananas.splice(i, 1);
          p.kx += (Math.random() < 0.5 ? -1 : 1) * 9; p.stun = 0.9; if (this.tt && this.tt.by === p.id) this.dropT(p); p.lastHit = b.by; p.hitT = 2.5; this.ev.push(['slip', p.id, b.by]); } }
      }
    }
    for (const b of this.bananas) b.age += dt; this.bananas = this.bananas.filter(b => b.z > this.zc - 2);
    // choques entre mochis (se apartan y se pasan parte del impulso)
    const A = this.P.filter(p => p.alive);
    for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) { const p = A[i], q = A[j]; if ((p.air > 0) !== (q.air > 0)) continue; const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
      if (d < 1.0 && d > 0.001) { const o = (1.0 - d) / 2, nx = dx / d, nz = dz / d; p.x -= nx * o; p.z -= nz * o; q.x += nx * o; q.z += nz * o;
        const rel = (p.vx + p.kx - q.vx - q.kx) * nx; if (rel > 0) { p.kx -= nx * rel * 0.6; q.kx += nx * rel * 0.6; } } }
    if (this.tt) { const tt = this.tt; tt.cool -= dt; const c = tt.by != null ? this.P.find(p => p.id === tt.by) : null;
      if (c && c.alive) { if (c.z > tt.z) c.carry += c.z - tt.z; tt.x = c.x; tt.z = c.z; if (c.z >= FIN) { this.over = true; c.carry += 1000; this.ranking = [...this.P].sort((a, b) => b.carry - a.carry).map(p => p.id); this.ev.push(['tfin', c.id]); this.ev.push(['over', c.id]); return; } }
      else { if (c) { tt.by = null; this.placeT(Math.max(this.zc + 12, c.z)); }
        if (tt.z < this.zc + 4) this.placeT(this.zc + 22);
        if (tt.cool <= 0) for (const p of A) if (p.air <= 0.2 && Math.hypot(p.x - tt.x, p.z - tt.z) < 1.2) { tt.by = p.id; this.ev.push(['tgrab', p.id]); break; } } }
    if (A.length === 0) { this.over = true; this.ranking = [...this.P].sort((a, b) => this.tt ? b.carry - a.carry || b.dist - a.dist : b.dist - a.dist).map(p => p.id); this.ev.push(['over', this.ranking[0]]); }
  }
  dropT(q) { const tt = this.tt; tt.by = null; tt.cool = 0.5; tt.x = clamp(q.x + (Math.random() - 0.5) * 2, -HW + 0.6, HW - 0.6); tt.z = q.z + 1.5; if (!this.solid(tt.x, tt.z)) this.placeT(tt.z); this.ev.push(['tdrop', q.id]); }
  placeT(z) { const tt = this.tt; for (let k = 0; k < 40; k++, z += 2) for (const x of [0, -1.25, 1.25, -3.75, 3.75]) if (this.solid(x, z) && row(Math.max(0, rowOf(z))).t !== 'sink') { tt.x = x; tt.z = z; tt.cool = 0.3; return; } }
  pick(p, r) { this.picked.add(r); const k = ['guante', 'turbo', 'platano'][Math.random() * 3 | 0];
    if (k === 'guante') p.pw = 'guante';
    if (k === 'turbo') p.turbo = 2.6;
    if (k === 'platano') for (const dx of [-1.2, 1.2]) this.bananas.push({ id: ++this.bid, x: clamp(p.x + dx, -HW + 0.4, HW - 0.4), z: p.z - 1.6, by: p.id, age: 0 });
    this.ev.push(['pick', p.id, k, r]); }
  kill(p) { if (!p.alive) return; window.__falls && window.__falls.push([p.name, +this.T.toFixed(1), +p.x.toFixed(1), +p.z.toFixed(1), +this.zc.toFixed(1), p.hitT > 0 ? p.lastHit : '-', p.air]); p.alive = false; this.dead.push(p.id); const by = p.hitT > 0 ? p.lastHit : null; this.ev.push(['fall', p.id, by, +p.x.toFixed(2), +p.z.toFixed(2), Math.round(p.dist)]); }
  bot(p, dt) {
    const A = p.ai, sk = p.skill || 0.5; A.react -= dt; A.push -= dt; A.fwd = 0.8 + sk * 0.11;
    if (A.react <= 0) { A.react = 0.08 + (1 - sk) * 0.22; // elige carril mirando hacia delante
      const look = 3 + sk * 7; let best = p.x, bs = 1e9;
      for (const x of [-3.75, -1.25, 1.25, 3.75, p.x]) { let s = Math.abs(x - p.x) * 0.25 + Math.abs(x) * 0.08;
        for (let dz = 0.4; dz < look; dz += 0.5) { const z = p.z + dz; if (!this.solid(x, z) || (rowOf(z) >= 0 && row(rowOf(z)).t === 'sink' && this.sinks.has(rowOf(z) * 4 + clamp(colOf(x), 0, 3)))) { const R = row(rowOf(z)); s += R.t === 'gap' ? 1 : 30 + 60 / dz; break; } }
        for (const b of this.bananas) if (Math.abs(b.x - x) < 1 && b.z > p.z && b.z < p.z + look) s += 6;
        const r4 = rowOf(p.z + 4); if (r4 >= 0) { const R = row(r4); if (R.box >= 0 && !this.picked.has(r4) && Math.abs(colX(R.box) - x) < 0.5) s -= 2; }
        if (this.tt && this.tt.by == null && this.tt.z > p.z && this.tt.z < p.z + 14 && Math.abs(this.tt.x - x) < 0.7) s -= 3 * sk + 1;
        if (this.tt && this.tt.by != null && this.tt.by !== p.id && this.tt.z > p.z - 1 && this.tt.z < p.z + 6 && Math.abs(this.tt.x - x) < 0.8) s -= 1.5;
        if (s < bs) { bs = s; best = x; } }
      if (Math.random() > 0.7 + sk * 0.3) best += (Math.random() - 0.5) * 1.6 * (1 - sk); // despistes
      A.tx = clamp(best, -HW + 0.7, HW - 0.7);
      // saltar huecos (los fáciles a veces no saltan a tiempo)
      const ahead = p.z + 0.7 + p.vz * 0.06; const ra = rowOf(ahead), sa = ra >= 0 && row(ra).t === 'sink' && this.sinks.has(ra * 4 + clamp(colOf(p.x), 0, 3));
      if ((!this.solid(p.x, ahead) || sa) && p.air <= 0 && Math.random() < 0.55 + sk * 0.4) this.jump(p);
      // empujar a quien tenga al lado
      if (A.push <= 0 && p.pcd <= 0 && this.T > 6) { const near = this.P.find(q => q !== p && q.alive && Math.hypot(q.x - p.x, q.z - p.z) < 1.7); if (near && Math.random() < 0.18 + sk * 0.25 + (this.tt && this.tt.by === near.id ? 0.25 : 0)) { this.push(p); A.push = 3 + Math.random() * 4 * (1.3 - sk); } else A.push = 0.6; } }
    p.ix = clamp(-(A.tx - p.x) / 1.4, -1, 1);
  }
  snap() { return { T: +this.T.toFixed(2), zc: +this.zc.toFixed(2), w: [this.wind.st === 'blow' ? 2 : this.wind.st === 'warn' ? 1 : 0, this.wind.dir], sk: [...this.sinks].map(([r, t]) => [r, +t.toFixed(2)]).filter(([r]) => (r >> 2) * RL > this.zc - 10),
    bx: [...this.picked].filter(r => r * RL > this.zc - 10), bn: this.bananas.map(b => [b.id, +b.x.toFixed(2), +b.z.toFixed(2)]), tt: this.tt ? [+this.tt.x.toFixed(2), +this.tt.z.toFixed(2), this.tt.by] : null, cr: this.P.map(p => Math.round(p.carry)),
    p: this.P.map(p => [p.id, +p.x.toFixed(2), +p.z.toFixed(2), +p.h.toFixed(3), p.alive ? 1 : 0, +p.air.toFixed(2), +p.air0.toFixed(2), +p.jcd.toFixed(2), +p.pcd.toFixed(2), +p.dist.toFixed(1), p.pw, +p.turbo.toFixed(1), +(p.vx + p.kx).toFixed(2), +(p.vz + p.kz).toFixed(2), +p.stun.toFixed(2)]) }; }
}

// ---------------------------------------------------------------- VISTA 3D
const { renderer, scene, camera, composer } = createRenderer($('c3d'));
window.__renderer = renderer; window.__scene = scene; window.__camera = camera;
camera.fov = 62; camera.far = 1600; camera.updateProjectionMatrix();
const TH = { top: '#7fa8ff', mid: '#ffc4dc', bot: '#ffe8d0', fog: '#f4d4ea', sun: '#fff1d6', hemiS: '#fff0f8', hemiG: '#a8d8b8' };
scene.fog = new THREE.Fog(TH.fog, 120, 700); scene.background = new THREE.Color(TH.mid);
const lights = addLights(scene, TH, 26); lights.sun.shadow.mapSize.set(1024, 1024); lights.sun.shadow.camera.far = 140; lights.sun.shadow.camera.updateProjectionMatrix();
const sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { a: { value: new THREE.Color(TH.top) }, b: { value: new THREE.Color(TH.mid) }, c: { value: new THREE.Color(TH.bot) } },
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 a,b,c; varying vec3 vP; void main(){ float h = vP.y; vec3 col = h > 0.0 ? mix(b, a, pow(h, 0.7)) : mix(b, c, pow(-h, 0.5)); vec3 sd = normalize(vec3(-0.4,0.25,1.0)); float s = max(0.0, dot(vP, sd)); col += vec3(1.0,0.9,0.7) * (pow(s, 64.0) * 0.9 + pow(s, 6.0) * 0.18); gl_FragColor = vec4(col,1.0); }' }));
sky.renderOrder = -10; scene.add(sky);
const parts = new Particles(scene, 260);
const VAL = -150; // el valle está 150 m por debajo
// --- valle con campos, río y caminos (textura que se repite y avanza)
const valTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 512; const x = cv.getContext('2d'); x.fillStyle = '#9fdc9a'; x.fillRect(0, 0, 512, 512);
  const cols = ['#b6e89a', '#8fd39b', '#c9ec9e', '#f7d9a0', '#ffc8dc', '#a8e0b8', '#d8f0a0']; const R = rng(77);
  for (let i = 0; i < 70; i++) { x.fillStyle = cols[R() * cols.length | 0]; x.save(); x.translate(R() * 512, R() * 512); x.rotate(R() * 3); x.fillRect(-30, -20, 40 + R() * 60, 30 + R() * 40); x.restore(); }
  x.strokeStyle = '#7fd0f0'; x.lineWidth = 22; x.lineCap = 'round'; x.beginPath(); x.moveTo(256, 0); for (let y = 0; y <= 512; y += 32) x.lineTo(256 + Math.sin(y / 512 * Math.PI * 2) * 70, y); x.stroke();
  x.strokeStyle = '#c8f2ff'; x.lineWidth = 6; x.stroke();
  for (let i = 0; i < 260; i++) { const px = R() * 512, py = R() * 512; if (Math.abs(px - 256 - Math.sin(py / 512 * Math.PI * 2) * 70) < 22) continue; x.fillStyle = R() < 0.5 ? '#5fb879' : '#78c487'; x.beginPath(); x.arc(px, py, 3 + R() * 4, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5); t.anisotropy = 8; return t; })();
const valley = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshStandardMaterial({ map: valTex, roughness: 1 })); valley.rotation.x = -Math.PI / 2; valley.position.y = VAL; scene.add(valley);
// --- montañas pastel con nieve, nubes por debajo y por los lados, islas flotantes
const MN = 44, mtnIM = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7), new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true }), MN);
const capIM = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, flatShading: true }), MN);
const mtns = []; { const R = rng(5); const mc = ['#c9a6f2', '#f5a8cc', '#9fd0f5', '#b8e0c0', '#ffc8a8'];
  for (let i = 0; i < MN; i++) { const side = i % 2 ? 1 : -1; mtns.push({ x: side * (90 + R() * 260), z: -200 + i / MN * 1400 + R() * 30, h: 90 + R() * 170, r: 50 + R() * 70 }); mtnIM.setColorAt(i, new THREE.Color(mc[i % 5])); } }
function placeMtn(i) { const m = mtns[i], o = new THREE.Object3D(); o.position.set(m.x, VAL + m.h / 2, m.z); o.scale.set(m.r, m.h, m.r); o.rotation.y = i; o.updateMatrix(); mtnIM.setMatrixAt(i, o.matrix);
  o.position.y = VAL + m.h * 0.87; o.scale.set(m.r * 0.27, m.h * 0.27, m.r * 0.27); o.updateMatrix(); capIM.setMatrixAt(i, o.matrix); mtnIM.instanceMatrix.needsUpdate = capIM.instanceMatrix.needsUpdate = true; }
for (let i = 0; i < MN; i++) placeMtn(i); scene.add(mtnIM, capIM);
const CN = 46, PUFF = 5, cloudIM = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffe8f4', emissiveIntensity: 0.35, roughness: 1 }), CN * PUFF);
const clouds = []; { const R = rng(9); for (let i = 0; i < CN; i++) { const below = i % 3 !== 0; clouds.push({ x: (R() < 0.5 ? -1 : 1) * (below ? 8 + R() * 90 : 30 + R() * 120), y: below ? -25 - R() * 70 : 10 + R() * 40, z: -100 + i / CN * 800, s: 4 + R() * 7, sp: 0.5 + R(), pf: Array.from({ length: PUFF }, () => [R() * 2 - 1, R() * 0.5, R() * 2 - 1, 0.5 + R() * 0.6]) }); } }
function placeCloud(i) { const c = clouds[i], o = new THREE.Object3D(); c.pf.forEach(([a, b, d, s], k) => { o.position.set(c.x + a * c.s * 1.3, c.y + b * c.s, c.z + d * c.s * 0.7); o.scale.set(c.s * s * 1.2, c.s * s * 0.6, c.s * s); o.updateMatrix(); cloudIM.setMatrixAt(i * PUFF + k, o.matrix); }); cloudIM.instanceMatrix.needsUpdate = true; }
for (let i = 0; i < CN; i++) placeCloud(i); scene.add(cloudIM); cloudIM.frustumCulled = mtnIM.frustumCulled = capIM.frustumCulled = false;
const isles = []; { const R = rng(21); for (let i = 0; i < 8; i++) { const g = new THREE.Group(); const c = NUMCOL[i % 9];
  const rock = new THREE.Mesh(new THREE.ConeGeometry(4, 7, 7), new THREE.MeshStandardMaterial({ color: '#d8c0f0', roughness: 0.9, flatShading: true })); rock.rotation.x = Math.PI; rock.position.y = -3.5; g.add(rock);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4, 1, 14), new THREE.MeshStandardMaterial({ color: '#a8e6a0', roughness: 0.8 })); g.add(top);
  const tr = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 8), new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 })); tr.position.y = 2.6; g.add(tr);
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 1.6, 8), new THREE.MeshStandardMaterial({ color: '#f2c8a0' })); st.position.y = 1.1; g.add(st);
  g.userData = { x: (i % 2 ? 1 : -1) * (18 + R() * 30), y: -18 + R() * 22, z: i * 45, ph: R() * 6 }; g.position.set(g.userData.x, g.userData.y, g.userData.z); scene.add(g); isles.push(g); } }

// --- pasarela: casillas instanciadas (cuerpo + número de metros), pilares, arcos cada 50 m
const NR = 150, NT = NR * COLS;
function roundedTile(w, d) { const sh = new THREE.Shape(), r = 0.32, a = w / 2, b = d / 2; sh.moveTo(-a + r, -b); sh.lineTo(a - r, -b); sh.quadraticCurveTo(a, -b, a, -b + r); sh.lineTo(a, b - r); sh.quadraticCurveTo(a, b, a - r, b); sh.lineTo(-a + r, b); sh.quadraticCurveTo(-a, b, -a, b - r); sh.lineTo(-a, -b + r); sh.quadraticCurveTo(-a, -b, -a + r, -b);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 1.1, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 2, curveSegments: 3 }); g.rotateX(-Math.PI / 2); g.translate(0, -1.2, 0); return g; }
const tileIM = new THREE.InstancedMesh(roundedTile(CW - 0.16, RL - 0.16), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.45, envMapIntensity: 0.8 }), NT);
tileIM.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NT * 3), 3); tileIM.receiveShadow = true;
// atlas con todos los números de metros (0…1019) + símbolos
const ATL = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 2048; const x = cv.getContext('2d'); x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  for (let n = 0; n < 1024; n++) { const ox = (n % 32) * 64 + 32, oy = (n / 32 | 0) * 64 + 34; let s = String(n); if (n === 1020) s = '⇧'; if (n === 1021) s = '★'; if (n > 1021) continue;
    x.font = `700 ${s.length >= 4 ? 21 : s.length === 3 ? 27 : 36}px Fredoka, sans-serif`; x.lineWidth = 7; x.strokeStyle = n === 1020 ? '#e0408a' : 'rgba(110,60,140,.55)'; x.strokeText(s, ox, oy); x.fillStyle = '#fff'; x.fillText(s, ox, oy); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; return t; })();
const LABG = new THREE.PlaneGeometry(1.9, 1.9); LABG.rotateX(-Math.PI / 2); LABG.rotateY(Math.PI);
const aCell = new THREE.InstancedBufferAttribute(new Float32Array(NT), 1); LABG.setAttribute('aCell', aCell);
const labMat = new THREE.MeshBasicMaterial({ map: ATL, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 });
labMat.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aCell;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvMapUv = (uv + vec2(mod(aCell, 32.0), 31.0 - floor(aCell / 32.0))) / 32.0;'); };
const labIM = new THREE.InstancedMesh(LABG, labMat, NT);
for (const im of [tileIM, labIM]) { im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false; scene.add(im); }
// bordes brillantes de la pasarela (dos tiras que siguen a la cámara) y pilares que bajan hasta el valle
const PIL = 40, pilIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.9, 1.6, 1, 10), new THREE.MeshStandardMaterial({ color: '#e9d3ff', roughness: 0.6 }), PIL); pilIM.frustumCulled = false; scene.add(pilIM);
const _o = new THREE.Object3D(), _z = new THREE.Matrix4().makeScale(0, 0, 0), _c = new THREE.Color();
const ROWC = ['#ffd0e4', '#e2d6ff', '#cff3e6', '#ffe6bf', '#d3e8ff'].map(c => new THREE.Color(c)), C_SINK = new THREE.Color('#e8b48c'), C_SINKHOT = new THREE.Color('#ff6aa6'), C_PAD = new THREE.Color('#ff7fbf'), C_TEN = new THREE.Color('#ffffff'), C_START = new THREE.Color('#fff4a8');
// arcos con cartel de metros cada 50 m
const ARCH = []; for (let i = 0; i < 6; i++) { const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 });
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 6, 10), m); p.position.set(s * (HW + 0.7), 1.8, 0); g.add(p);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 9), new THREE.MeshStandardMaterial({ color: NUMCOL[i], emissive: NUMCOL[i], emissiveIntensity: 0.6 })); ball.position.set(s * (HW + 0.7), 5, 0); g.add(ball); }
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.75), new THREE.MeshBasicMaterial({ map: tx, transparent: true, toneMapped: false, side: THREE.DoubleSide })); sign.position.y = 4.4; sign.rotation.y = Math.PI; g.add(sign);
  g.userData = { cv, tx, m: -1 }; scene.add(g); ARCH.push(g); }
function archLabel(g, m, fin) { const key = m + (fin ? 'f' : ''); if (g.userData.m === key) return; g.userData.m = key; const x = g.userData.cv.getContext('2d'); x.clearRect(0, 0, 512, 128); x.fillStyle = m === 0 ? '#ffb347' : '#ff8fc0'; x.beginPath(); x.roundRect(8, 8, 496, 112, 56); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 8; x.stroke();
  x.font = '700 76px Fredoka, sans-serif'; x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(fin ? '🏁 ¡META!' : m === 0 ? '¡SALIDA!' : `${m} m`, 256, 68); g.userData.tx.needsUpdate = true; }
// regalos (power-ups), plátanos y muro del hundimiento
const giftTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'); x.fillStyle = '#ff9cc8'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#fff6a8'; x.fillRect(52, 0, 24, 128); x.fillRect(0, 52, 128, 24); x.font = '700 64px Fredoka'; x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.strokeStyle = '#b0407a'; x.lineWidth = 8; x.strokeText('?', 64, 68); x.fillText('?', 64, 68); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const GIFTS = []; for (let i = 0; i < 14; i++) { const g = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), new THREE.MeshStandardMaterial({ map: giftTex, roughness: 0.35, emissive: '#ff9cc8', emissiveIntensity: 0.25 })); g.castShadow = true; g.visible = false; scene.add(g); GIFTS.push(g); }
const banM = new THREE.MeshStandardMaterial({ color: '#ffe066', roughness: 0.4, emissive: '#806000', emissiveIntensity: 0.2 }); const BANS = [];
for (let i = 0; i < 16; i++) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.16, 8, 14, Math.PI * 0.9), banM); b.rotation.x = -Math.PI / 2; b.visible = false; scene.add(b); BANS.push(b); }
const PADS = []; for (let i = 0; i < 12; i++) { const g = new THREE.Group(); const sp = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.18, 8, 18), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ff6fae', emissiveIntensity: 0.7 })); sp.rotation.x = Math.PI / 2; sp.position.y = 0.2; g.add(sp);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.18, 18), new THREE.MeshStandardMaterial({ color: '#ff7fbf', roughness: 0.3 })); top.position.y = 0.42; g.add(top); g.visible = false; scene.add(g); PADS.push(g); }
// partículas de viento
const windM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false }); const STREAK = [];
for (let i = 0; i < 24; i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.06), windM); s.visible = false; scene.add(s); STREAK.push({ m: s, x: 0, y: 0, z: 0 }); }

// tortuga kawaii del relevo
const turtle = (() => { const g = new THREE.Group(); const shell = new THREE.Mesh(new THREE.SphereGeometry(0.62, 18, 12, 0, 6.283, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#5fc78a', roughness: 0.4 })); shell.scale.y = 0.8; g.add(shell);
  for (let k = 0; k < 6; k++) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.16, 6), new THREE.MeshStandardMaterial({ color: '#a8eec0', side: THREE.DoubleSide })); const a = k / 6 * 6.283; d.position.set(Math.cos(a) * 0.38, 0.32, Math.sin(a) * 0.38); d.lookAt(Math.cos(a) * 2, 1.4, Math.sin(a) * 2); g.add(d); }
  const skin = new THREE.MeshStandardMaterial({ color: '#c8f0a0', roughness: 0.5 }); const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), skin); head.position.set(0, 0.12, 0.66); g.add(head);
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: '#2a1a3a' })); e.position.set(sx * 0.1, 0.2, 0.88); g.add(e); const ck = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff9cc8' })); ck.position.set(sx * 0.17, 0.1, 0.85); g.add(ck);
    for (const sz of [-1, 1]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), skin); l.position.set(sx * 0.45, -0.02, sz * 0.38); g.add(l); } }
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.1, 28), new THREE.MeshBasicMaterial({ color: '#7fffb0', transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = -0.1; g.add(ring); g.userData.ring = ring;
  g.visible = false; scene.add(g); return g; })();
// ---------------------------------------------------------------- PERSONAJES
const chars = new Map(); let me = 'h', roster = [];
const BLOBG = new THREE.CircleGeometry(1, 20), blobMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, map: (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(70,30,90,.5)'); g.addColorStop(1, 'rgba(70,30,90,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })() });
function nameTag(name) { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 72; const x = cv.getContext('2d');
  x.font = '700 34px Fredoka, sans-serif'; const w = Math.min(240, x.measureText(name).width + 34); x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.roundRect(128 - w / 2, 10, w, 50, 25); x.fill();
  x.fillStyle = '#8a5aa8'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(name, 128, 37);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(2.6, 0.75, 1); s.renderOrder = 20; return s; }
const glove = () => { const g = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 10), new THREE.MeshStandardMaterial({ color: '#ff4f6e', roughness: 0.35, emissive: '#ff2050', emissiveIntensity: 0.25 })); g.scale.set(1, 0.9, 1.2); g.position.set(0.75, 1.0, 0.35); g.visible = false; return g; };
function buildChars() {
  for (const c of chars.values()) { scene.remove(c.root); scene.remove(c.blob); } chars.clear();
  for (const r of roster) { const root = new THREE.Group(); const m = makeCharacter(chOf(r.ch)); m.scale.setScalar(0.85); m.traverse(o => { if (o.isMesh) o.castShadow = true; }); m.userData.seed = Math.random() * 10; root.add(m);
    const gl = glove(); root.add(gl);
    const blob = new THREE.Mesh(BLOBG, blobMat); blob.rotation.x = -Math.PI / 2; blob.renderOrder = 2; scene.add(blob);
    if (r.id !== me) { const tag = nameTag(r.name); tag.position.y = 2.3; root.add(tag); }
    scene.add(root); chars.set(r.id, { root, m, gl, blob, x: 0, z: 0, h: 0, tx: 0, tz: 0, th: 0, alive: true, fallV: 0, fy: 0, air: 0, air0: HOP_T, expr: '', vx: 0, vz: 0, dist: 0, pw: '', punch: 0 }); }
}

// ---------------------------------------------------------------- ESTADO + EVENTOS
let sim = null, shell = null, S = null, playing = false, online = false, sendAcc = 0, endSent = false, simAcc = 0, specId = null, ff = 1, showcase = null;
let TT = null, CR = null; const sinkMap = new Map(), pickedSet = new Set(); let bananas = [], zc = -14, windS = [0, 1], T0 = 0;
const snapBuf = [];
function applySnap(s, first) { S = s; TT = s.tt || null; CR = s.cr || null; zc = s.zc; windS = s.w; sinkMap.clear(); for (const [r, t] of s.sk) sinkMap.set(r, t); pickedSet.clear(); for (const r of s.bx) pickedSet.add(r); bananas = s.bn;
  for (const a of s.p) { const [id, x, z, h, alive, air, air0, jcd, pcd, dist, pw, turbo, vx, vz] = a; const c = chars.get(id); if (!c) continue;
    if (first) { c.x = x; c.z = z; c.h = h; } c.tx = x; c.tz = z; c.th = h; c.air = air; c.air0 = air0 || HOP_T; c.jcd = jcd; c.pcd = pcd; c.dist = dist; c.pw = pw; c.turbo = turbo; c.vx = vx; c.vz = vz;
    if (c.alive && !alive) { c.alive = false; c.fallV = 2; c.fy = 0; } } }
const who = id => { const r = roster.find(r => r.id === id); return r ? (r.id === me ? 'Tú' : r.name) : '?'; };
const PWN = { guante: '🥊 ¡Guante gigante! Tu próximo empujón es BRUTAL', turbo: '⚡ ¡Turbo!', platano: '🍌 ¡Plátanos soltados detrás de ti!' };
const BURLAS = ['¡Adiós! 👋', '¡Al vacío! 🌀', '¡Chao, pescao! 🐟', '¡Vuela, vuela! 🕊️', '¡Ups! 😇', '¡A la piscina! 💦'];
function onEvents(evs) {
  for (const e of evs) {
    if (e[0] === 'hop') { const c = chars.get(e[1]); if (e[1] === me) Sfx.hop(); if (c) parts.burst(new THREE.Vector3(c.x, 0.2, c.z), '#ffffff', 8, 2, 2); }
    if (e[0] === 'pad') { const c = chars.get(e[1]); if (e[1] === me) { Sfx.shield(); shell.big('¡Boing!', 600); } if (c) parts.burst(new THREE.Vector3(c.x, 0.4, c.z), '#ff8fc0', 18, 4, 5); }
    if (e[0] === 'push') { const c = chars.get(e[1]); if (c) c.punch = 1; if (e[1] === me) { if (e[3]) Sfx.zap(); else Sfx.tap(); } }
    if (e[0] === 'hit') { const c = chars.get(e[2]); if (c) { c.hitFx = 0.6; parts.burst(new THREE.Vector3(c.x, 1, c.z), e[3] ? '#ff4f6e' : '#ffe066', e[3] ? 30 : 14, e[3] ? 8 : 4, 3); }
      if (e[2] === me) { Sfx.bad(); shell.toast(e[3] ? `🥊 ¡${who(e[1])} te ha dado un guantazo!` : `💢 ¡${who(e[1])} te ha empujado!`, 1100); if (navigator.vibrate) navigator.vibrate(60); }
      else if (e[1] === me) { Sfx.ok(); } }
    if (e[0] === 'sink') { Sfx.crack(); }
    if (e[0] === 'pick') { if (e[1] === me) { Sfx.shield(); shell.toast(PWN[e[2]], 1500); } const c = chars.get(e[1]); if (c) parts.burst(new THREE.Vector3(c.x, 1.2, c.z), '#ff9cc8', 20, 4, 4); }
    if (e[0] === 'slip') { const c = chars.get(e[1]); if (e[1] === me) { Sfx.bad(); shell.toast(`🍌 ¡Has pisado un plátano${e[2] && e[2] !== me ? ' de ' + who(e[2]) : ''}!`, 1300); } else if (e[2] === me) shell.toast(`🍌 ¡${who(e[1])} ha resbalado con tu plátano!`, 1300); if (c) c.hitFx = 0.8; }
    if (e[0] === 'wwarn') { Sfx.tick(); shell.big(e[1] < 0 ? '💨 ¡Viento hacia la derecha! ➡️' : '⬅️ ¡Viento hacia la izquierda! 💨', 1700); }
    if (e[0] === 'wblow') Sfx.splash();
    if (e[0] === 'fall') { Sfx.out(); const r = roster.find(r => r.id === e[1]);
      if (e[1] === me) { shell.big(`¡Aaaah! ${e[5]} m`, 1600); $('spect').classList.add('on'); ['pushB', 'hopB', 'joy'].forEach(id => $(id).classList.remove('on')); specId = e[2] && e[2] !== me ? e[2] : null;
        if (!online && !sim.P.some(p => p.alive && !p.bot)) { ff = 3; setTimeout(() => shell.toast('⏩ Acelerando el final…', 1500), 1700); } }
      else shell.toast(e[2] === me ? `💥 ${BURLAS[Math.random() * BURLAS.length | 0]} Has tirado a ${who(e[1])}` : e[2] ? `🌀 ${who(e[2])} tira a ${who(e[1])} al vacío` : `🌀 ${who(e[1])} se ha caído (${e[5]} m)`, 1500); }
    if (e[0] === 'deny' && e[1] === me) { Sfx.bad(); }
    if (e[0] === 'tgrab') { Sfx.shield(); shell.toast(e[1] === me ? '🐢 ¡Tienes la tortuga! ¡Llévala a la meta!' : `🐢 ${who(e[1])} coge la tortuga`, 1300); }
    if (e[0] === 'tdrop') { Sfx.bad(); shell.toast(e[1] === me ? '🐢 ¡Se te ha caído la tortuga!' : `🐢 ¡A ${who(e[1])} se le cae la tortuga!`, 1200); }
    if (e[0] === 'tfin') { Sfx.win(); shell.big(e[1] === me ? '🏁 ¡Tortuga en la meta!' : `🏁 ¡${who(e[1])} llega a la meta!`, 1600); }
    if (e[0] === 'over') { playing = false; const w = e[1]; shell.big(w === me ? '¡Has llegado el más lejos!' : `¡Gana ${who(w)}!`, 1600); const c = chars.get(w); if (c) c.expr = 'happy'; }
  }
}

// ---------------------------------------------------------------- CONTROLES (joystick abajo a la derecha, Salto al lado, Empujón a la izquierda; espejo en modo zurdo)
let keyL = false, keyR = false, keyU = false, keyD = false, joyX = 0, joyY = 0, sentX = 9, sentY = 9;
function send(d) { if (!playing) return; if (online && !shell.isHost) shell.send({ t: 'gin', ...d }); else sim && sim.input(me, d); }
const joy = $('joy'), knob = $('joyK'); let drag = null;
joy.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (!playing || drag) return; Sfx.init(); const r = joy.getBoundingClientRect(); drag = { id: e.pointerId, x0: r.left + r.width / 2, y0: r.top + r.height / 2 };
  try { joy.setPointerCapture(e.pointerId); } catch (x) { } joy.classList.add('act'); joyMove(e); });
function joyMove(e) { if (!drag || e.pointerId !== drag.id) return; let dx = e.clientX - drag.x0, dy = e.clientY - drag.y0; const R = 52, d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
  knob.style.transform = `translate(calc(-50% + ${dx * 0.77}px),calc(-50% + ${dy * 0.77}px))`; const dz = d > 6 ? 1 : 0; joyX = dz * clamp(dx / 40, -1, 1); joyY = dz * clamp(-dy / 40, -1, 1); }
joy.addEventListener('pointermove', joyMove);
const endDrag = e => { if (!drag || e.pointerId !== drag.id) return; drag = null; joyX = joyY = 0; joy.classList.remove('act'); knob.style.transform = 'translate(-50%,-50%)'; };
joy.addEventListener('pointerup', endDrag); joy.addEventListener('pointercancel', endDrag); joy.addEventListener('lostpointercapture', endDrag);
function hop() { const c = chars.get(me); if (playing && c && c.alive) send({ k: 'jump' }); }
function shove() { const c = chars.get(me); if (playing && c && c.alive) send({ k: 'push' }); }
for (const [id, fn] of [['hopB', hop], ['pushB', shove]]) { const b = $(id); b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); Sfx.init(); fn(); b.classList.add('press'); b.classList.remove('boing'); void b.offsetWidth; b.classList.add('boing'); });
  const up = () => b.classList.remove('press'); ['pointerup', 'pointercancel', 'pointerleave'].forEach(k => b.addEventListener(k, up)); }
const KMAP = { ArrowLeft: 'L', a: 'L', A: 'L', ArrowRight: 'R', d: 'R', D: 'R', ArrowUp: 'U', w: 'U', W: 'U', ArrowDown: 'D', s: 'D', S: 'D' };
const setKey = (k, v) => { if (k === 'L') keyL = v; if (k === 'R') keyR = v; if (k === 'U') keyU = v; if (k === 'D') keyD = v; };
addEventListener('keydown', e => { if (!playing) return; if (KMAP[e.key]) { e.preventDefault(); setKey(KMAP[e.key], true); } else if (e.key === ' ') { e.preventDefault(); hop(); } else if (e.key === 'e' || e.key === 'E' || e.key === 'Shift' || e.key === 'Enter') { e.preventDefault(); shove(); } });
addEventListener('keyup', e => { if (KMAP[e.key]) setKey(KMAP[e.key], false); });

// ---------------------------------------------------------------- BUCLE
const Q = window.__Q = { lv: 1, dprs: [2.5, 2, 1.75, 1.5, 1.25, 1, 0.85, 0.7], acc: 0, n: 0, last: 0, good: 0, bad: 0, fail: {} };
const clock = new THREE.Clock(); let t = 0; const camP = new THREE.Vector3(0, 6, -10), camL = new THREE.Vector3(0, 0, 10); let camX = 0;
const SPD = +new URLSearchParams(location.search).get('spd') || 1;
function tileState(r, c, now) { // 0 normal, 1 temblando, 2 caído
  const z1 = (r + 1) * RL; if (z1 < zc) return 2; const R = r >= 0 ? row(r) : null; if (R && R.hole[c]) return 3;
  if (R && R.t === 'sink' && sinkMap.has(r * 4 + c)) { const k = now - sinkMap.get(r * 4 + c); if (k > SINK_DELAY) return 2; return 1; }
  if (z1 < zc + 4) return 1; return 0; }
const fallT = new Map();
function drawTrack(camZ, now) {
  const r0 = Math.floor(camZ / RL) - 12; let gi = 0, bi = 0, pi = 0;
  for (let k = 0; k < NR; k++) { const r = r0 + k, R = r >= 0 ? row(r) : null, z = (r + 0.5) * RL;
    if (r < -5) { for (let c = 0; c < COLS; c++) { tileIM.setMatrixAt(k * COLS + c, _z); labIM.setMatrixAt(k * COLS + c, _z); } continue; }
    const m = Math.round(r * RL), ten = r >= 0 && m % 10 === 0;
    for (let c = 0; c < COLS; c++) { const i = k * COLS + c, st = tileState(r, c, now); const key = r * 4 + c;
      if (st === 3) { tileIM.setMatrixAt(i, _z); labIM.setMatrixAt(i, _z); continue; }
      let y = 0, rx = 0, rz = 0;
      if (st === 1) { const w = Math.sin(t * 40 + r + c) * 0.05; rx = w; rz = -w * 0.7; y = -0.06; fallT.delete(key); }
      if (st === 2) { let f = fallT.get(key); if (f == null) { f = t; fallT.set(key, f); if (fallT.size > 4000) fallT.delete(fallT.keys().next().value); } const q = t - f; if (q > 2.5) { tileIM.setMatrixAt(i, _z); labIM.setMatrixAt(i, _z); continue; } y = -q * q * 9; rx = q * 1.3; rz = q * (c - 1.5) * 0.5; }
      _o.position.set(colX(c), y, z); _o.rotation.set(rx, 0, rz); _o.scale.set(1, 1, 1); _o.updateMatrix(); tileIM.setMatrixAt(i, _o.matrix);
      _c.copy(r < 0 ? C_START : R && R.t === 'sink' ? (st === 1 ? _c.copy(C_SINK).lerp(C_SINKHOT, 0.5 + 0.5 * Math.sin(t * 20)) : C_SINK) : R && R.pad[c] ? C_PAD : ten ? C_TEN : ROWC[((r % 5) + 5) % 5]);
      if (st === 1 && !(R && R.t === 'sink')) _c.lerp(C_SINKHOT, 0.3 + 0.2 * Math.sin(t * 20)); tileIM.setColorAt(i, _c);
      _o.position.y = y + 0.012; _o.updateMatrix(); labIM.setMatrixAt(i, _o.matrix); aCell.setX(i, r < 0 ? 1021 : R.pad[c] ? 1020 : Math.min(1019, m % 1020));
      if (R && R.pad[c] && st === 0 && pi < PADS.length) { const p = PADS[pi++]; p.visible = true; p.position.set(colX(c), Math.abs(Math.sin(t * 6 + c)) * 0.12, z); } }
    if (R && R.box >= 0 && !pickedSet.has(r) && tileState(r, R.box, now) === 0 && gi < GIFTS.length) { const g = GIFTS[gi++]; g.visible = true; g.position.set(colX(R.box), 1.0 + Math.sin(t * 3 + r) * 0.2, z); g.rotation.set(0.3, t * 1.8 + r, 0.2); }
  }
  for (; gi < GIFTS.length; gi++) GIFTS[gi].visible = false; for (; pi < PADS.length; pi++) PADS[pi].visible = false;
  for (const b of BANS) b.visible = false; bananas.forEach(([id, x, z], k) => { if (k < BANS.length) { const b = BANS[k]; b.visible = true; b.position.set(x, 0.18, z); b.rotation.z = id; } });
  tileIM.instanceMatrix.needsUpdate = labIM.instanceMatrix.needsUpdate = true; tileIM.instanceColor.needsUpdate = true; aCell.needsUpdate = true;
  // arcos cada 50 m y pilares cada 12 m
  const a0 = Math.max(0, Math.floor((camZ - 10) / 50)); ARCH.forEach((g, k) => { const m = (a0 + k) * 50; g.position.set(0, 0, m); archLabel(g, m, curMode === 'tortuga' && m === FIN); g.visible = m > zc - 6 && m > camera.position.z + 5; });
  const p0 = Math.floor((camZ - 30) / 12); for (let k = 0; k < PIL; k++) { const z = (p0 + k) * 12; const gone = z < zc - 4; _o.position.set(0, -1.2 - 75 + (gone ? -999 : 0), z); _o.rotation.set(0, 0, 0); _o.scale.set(1, 150, 1); _o.updateMatrix(); pilIM.setMatrixAt(k, _o.matrix); } pilIM.instanceMatrix.needsUpdate = true;
}
function frame() {
  const rdt = Math.min(0.25, clock.getDelta()), dt = Math.min(0.05, rdt); t += dt;
  { let x = joyX, y = joyY; const kx = (keyR ? 1 : 0) - (keyL ? 1 : 0), ky = (keyU ? 1 : 0) - (keyD ? 1 : 0); if (kx || ky) { x = kx; y = ky; }
    if (playing && (Math.abs(x - sentX) > 0.05 || Math.abs(y - sentY) > 0.05)) { sentX = x; sentY = y; send({ k: 'mv', x: +x.toFixed(2), y: +y.toFixed(2) }); } }
  if (sim && (playing || (sim.over && !endSent))) {
    simAcc = Math.min(0.3, simAcc + rdt * SPD * ff); while (simAcc >= STEP) { sim.step(STEP); simAcc -= STEP; }
    const ev = sim.ev.splice(0); applySnap(sim.snap()); if (ev.length) { onEvents(ev); if (online) shell.send({ t: 'gev', e: ev }); }
    sendAcc += dt; if (online && sendAcc > 0.066) { sendAcc = 0; shell.send({ t: 'gs', s: sim.snap() }); }
    if (sim.over && !endSent) { endSent = true; const res = { ranking: sim.ranking, roster, dist: Object.fromEntries(sim.P.map(p => [p.id, Math.round(p.dist)])), carry: sim.tt ? Object.fromEntries(sim.P.map(p => [p.id, Math.round(p.carry % 1000)])) : null }; if (online) shell.send({ t: 'gend', res }); setTimeout(() => finish(res), 1000); }
  }
  const alpha = simAcc / STEP, simP = sim ? new Map(sim.P.map(p => [p.id, p])) : null, rnow = performance.now() - 110;
  let s0 = null, s1 = null; if (!sim && snapBuf.length) { for (let i = snapBuf.length - 1; i >= 0; i--) if (snapBuf[i].at <= rnow) { s0 = snapBuf[i]; s1 = snapBuf[i + 1] || null; break; } if (!s0) s0 = snapBuf[0]; }
  const idx = s0 ? new Map(s0.s.p.map((q, i) => [q[0], i])) : null;
  for (const [id, c] of chars) {
    const ox = c.x, oz = c.z;
    if (simP && simP.has(id)) { const p = simP.get(id); c.x = p.px + (p.x - p.px) * alpha; c.z = p.pz + (p.z - p.pz) * alpha; c.h = p.ph + wrap(p.h - p.ph) * alpha; }
    else if (s0 && idx.has(id)) { const a0 = s0.s.p[idx.get(id)]; let x = a0[1], z = a0[2], h = a0[3]; if (s1) { const a1 = s1.s.p[idx.get(id)], f = clamp((rnow - s0.at) / Math.max(1, s1.at - s0.at), 0, 1); if (a1) { x += (a1[1] - x) * f; z += (a1[2] - z) * f; h += wrap(a1[3] - h) * f; } } c.x = x; c.z = z; c.h = h; }
    else { const k = 1 - Math.exp(-dt * 14); c.x += (c.tx - c.x) * k; c.z += (c.tz - c.z) * k; c.h += wrap(c.th - c.h) * k; }
    if (c.alive) { const sp = dt > 0 ? Math.hypot(c.x - ox, c.z - oz) / dt : 0; c.spd = (c.spd || 0) + (Math.min(14, sp) - (c.spd || 0)) * Math.min(1, dt * 10); const sn = Math.min(1.3, c.spd / SPEED);
      c.ph2 = (c.ph2 || 0) + dt * (4 + c.spd * 1.6); const air = c.air || 0, a0 = c.air0 || HOP_T, hy = air > 0 ? Math.sin((1 - air / a0) * Math.PI) * (a0 > 1 ? 4.2 : 1.6) : 0;
      if (c.wasAir && air <= 0) { c.land = 1; parts.burst(new THREE.Vector3(c.x, 0.1, c.z), '#fff4fb', 10, 2.5, 1.5); } c.wasAir = air > 0; c.land = Math.max(0, (c.land || 0) - dt * 5);
      c.hitFx = Math.max(0, (c.hitFx || 0) - dt); c.punch = Math.max(0, (c.punch || 0) - dt * 4);
      c.root.position.set(c.x, Math.abs(Math.sin(c.ph2)) * 0.24 * sn + hy, c.z); c.root.rotation.set(0, c.h, c.hitFx > 0 ? Math.sin(t * 30) * 0.4 : 0);
      c.blob.visible = true; c.blob.position.set(c.x, 0.04, c.z); c.blob.scale.setScalar(1.1 - Math.min(0.6, hy * 0.12));
      const sq = 1 + (air > 0 ? 0.12 : Math.sin(c.ph2 * 2) * 0.07 * sn) - c.land * 0.28; c.m.scale.set(0.85 / Math.sqrt(sq), 0.85 * sq, 0.85 / Math.sqrt(sq)); c.m.rotation.x = 0.1 + 0.12 * sn + (air > 0 ? -0.25 : 0);
      c.gl.visible = c.pw === 'guante' || c.punch > 0; c.gl.scale.setScalar(c.pw === 'guante' ? 1.6 : 1); c.gl.position.z = 0.35 + c.punch * 0.9;
      if ((c.turbo || 0) > 0 && Math.random() < 0.5) parts.burst(new THREE.Vector3(c.x, 0.5, c.z - 0.6), '#ffe066', 1, 1, 1);
      if (air <= 0 && (c.dust = (c.dust || 0) + dt * c.spd) > 2.4) { c.dust = 0; parts.burst(new THREE.Vector3(c.x, 0.15, c.z - 0.5), '#fdf2ff', 2, 0.7, 1.1); }
      c.expr = c.hitFx > 0 ? 'squash' : (c.expr === 'happy' ? 'happy' : ''); }
    else { c.blob.visible = false; c.gl.visible = false; c.fallV += dt * 20; c.fy -= c.fallV * dt; c.root.position.set(c.x, c.fy, c.z); c.root.rotation.z += dt * 4; c.root.rotation.x += dt * 2; c.expr = 'squash'; if (c.fy < VAL + 5) c.root.visible = false; }
    animCharacter(c.m, t + c.m.userData.seed, 2, c.expr);
  }
  // cámara: detrás y por encima, mirando siempre hacia delante; se ve el vacío a los dos lados
  const port = camera.aspect < 1; const alive = [...chars.entries()].filter(([, c]) => c.alive);
  const tgt = chars.get(me) && chars.get(me).alive ? me : specId && chars.get(specId) && chars.get(specId).alive ? specId : (alive.sort((a, b) => b[1].z - a[1].z)[0] || [])[0];
  const fc = tgt ? chars.get(tgt) : null; let camZ;
  if (fc && (sim || online)) { camX += (fc.x * 0.55 - camX) * (1 - Math.exp(-dt * 4)); const back = port ? 10.5 : 9.5, up = port ? 7.5 : 6.4;
    camP.set(camX, up + (fc.air > 0 ? 0.5 : 0), fc.z - back); camL.set(camX * 0.7, 0.2, fc.z + (port ? 9 : 8));
    camera.position.lerp(camP, 1 - Math.exp(-dt * 10)); camZ = fc.z; }
  else { camZ = t * 4 % 400; camP.set(Math.sin(t * 0.3) * 2.5, 4.2, camZ - 7); camL.set(0, 0.8, camZ + 6); camera.position.copy(camP); if (showcase) { showcase.position.set(0, Math.abs(Math.sin(t * 6)) * 0.25, camZ + 2); showcase.rotation.y = Math.sin(t * 0.8) * 0.3; showcase.userData.ph = (showcase.userData.ph || 0) + dt * 14; animCharacter(showcase, t, 2, ''); } }
  camera.lookAt(camL); sky.position.copy(camera.position);
  drawTrack(camZ, S ? S.T : t);
  // decorado infinito: montañas, nubes e islas se reciclan hacia delante
  for (let i = 0; i < MN; i++) if (mtns[i].z < camZ - 250) { mtns[i].z += 1400; placeMtn(i); }
  for (let i = 0; i < CN; i++) { const cl = clouds[i]; if (cl.z < camZ - 100) { cl.z += 800; placeCloud(i); } }
  for (const g of isles) { if (g.userData.z < camZ - 40) g.userData.z += 360; g.position.set(g.userData.x, g.userData.y + Math.sin(t * 0.6 + g.userData.ph) * 0.8, g.userData.z); g.rotation.y = t * 0.1 + g.userData.ph; }
  valley.position.z = camZ; valTex.offset.y = camZ / 2400 * 5; valley.position.x = 0; valTex.offset.x = 0;
  lights.sun.position.set(camX - 15, 30, camZ - 10); lights.sun.target.position.set(camX, 0, camZ + 6);
  // viento
  const wst = windS ? windS[0] : 0; STREAK.forEach((s, k) => { if (wst === 2) { if (!s.m.visible || Math.abs(s.x) > 18) { s.x = -windS[1] * (14 + Math.random() * 4); s.y = 0.5 + Math.random() * 4; s.z = camZ - 4 + Math.random() * 22; s.m.visible = true; } s.x += windS[1] * dt * 28; s.m.position.set(s.x, s.y, s.z); s.m.lookAt(camera.position); } else s.m.visible = false; });
  // HUD
  if (S) { const mc = chars.get(me), list = [...chars.entries()].map(([id, c]) => [id, c.alive ? Math.max(c.dist || 0, c.z) : c.dist || 0]).sort((a, b) => b[1] - a[1]);
    const myD = Math.max(0, Math.round(mc ? (mc.alive ? Math.max(mc.dist || 0, mc.z) : mc.dist || 0) : 0)), pos = list.findIndex(l => l[0] === me) + 1, rec = +(localStorage.getItem('hunde_carrera_rec') || 0);
    $('hAlive').textContent = `📏 ${myD} m · ${pos}º de ${list.length}`;
    const lead = list[0]; $('hNext').textContent = mc && mc.alive && mc.z - zc < 9 ? '⚠️ ¡El suelo se hunde detrás de ti! ¡Corre!' : lead && lead[0] !== me ? `🥇 ${who(lead[0])} · ${Math.round(Math.max(0, lead[1]))} m · 🏆 Récord ${rec} m` : `🥇 ¡Vas primero! · 🏆 Récord ${rec} m`;
    $('hNext').classList.toggle('warn', !!(mc && mc.alive && mc.z - zc < 9));
    if (mc) { const hb = $('hopB'); hb.style.setProperty('--cd', ((mc.jcd || 0) / HOP_CD * 360) + 'deg'); hb.classList.toggle('cd', (mc.jcd || 0) > 0);
      const pb = $('pushB'); pb.style.setProperty('--cd', ((mc.pcd || 0) / PUSH_CD * 360) + 'deg'); pb.classList.toggle('cd', (mc.pcd || 0) > 0); pb.classList.toggle('big', mc.pw === 'guante'); $('pushIco').textContent = mc.pw === 'guante' ? '🥊' : '👐'; } }
  if (TT) { turtle.visible = true; const c = TT[2] != null ? chars.get(TT[2]) : null; if (c && c.alive) { turtle.position.set(c.x, c.root.position.y + 2.15, c.z); turtle.rotation.set(0, c.h, 0); turtle.userData.ring.visible = false; }
      else { turtle.position.set(TT[0], 0.55 + Math.abs(Math.sin(t * 4)) * 0.25, TT[1]); turtle.rotation.y = t; turtle.userData.ring.visible = true; }
    if (S && CR) { const k = roster.findIndex(r => r.id === me), mine = CR[k] || 0, best = roster.map((r, i) => [r, CR[i] || 0]).sort((a, b) => b[1] - a[1])[0];
      $('hAlive').textContent = `🐢 Llevas ${mine} m · meta ${FIN} m`; const hold = TT[2] != null ? roster.find(r => r.id === TT[2]) : null;
      $('hNext').textContent = hold ? `🐢 ${hold.id === me ? '¡La llevas TÚ!' : hold.name + ' la lleva'} · ${Math.max(0, FIN - Math.round(TT[1]))} m a la meta` : `🐢 ¡Coge la tortuga! · Líder ${best[0].id === me ? 'Tú' : best[0].name} ${best[1]} m`; } }
  else turtle.visible = false;
  parts.update(dt); composer.render();
  if (playing) { Q.acc += rdt; Q.n++; if (Q.acc > 1) { const avg = Q.acc / Q.n * 1000; Q.acc = 0; Q.n = 0; Q.last = avg;
    const setQ = lv => { Q.lv = lv; renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.dprs[lv])); renderer.setSize(innerWidth, innerHeight, false); const sh = lv <= 3 && !/noshadows/.test(location.search); if (renderer.shadowMap.enabled !== sh) { renderer.shadowMap.enabled = sh; scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); }); } };
    const now = performance.now(); if (avg > 18.2 && Q.lv < Q.dprs.length - 1) { if (++Q.bad >= (avg > 24 ? 1 : 2)) { Q.bad = 0; Q.good = 0; Q.fail[Q.lv] = now; setQ(Math.min(Q.dprs.length - 1, Q.lv + (avg > 30 ? 2 : 1))); } }
    else if (avg < 17.3 && Q.lv > 0) { Q.bad = 0; if (++Q.good >= 4 && !(now - (Q.fail[Q.lv - 1] || -1e9) < 30000)) { Q.good = 0; setQ(Q.lv - 1); } } else { Q.good = 0; Q.bad = 0; } } }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- MENÚ / ARRANQUE
const HUDIDS = ['hud', 'pushB', 'hopB', 'joy', 'spect', 'steerHint'];
function finish(res) { HUDIDS.forEach(id => $(id).classList.remove('on')); const d = res.carry || res.dist || {}; const mine = d[me] || 0, rec = +(localStorage.getItem('hunde_carrera_rec') || 0);
  if (!res.carry && mine > rec) { localStorage.setItem('hunde_carrera_rec', mine); setTimeout(() => shell.toast(`🏆 ¡Nuevo récord: ${mine} m!`, 2500), 1500); }
  shell.end(res); setTimeout(() => { const box = $('oRank'); if (!box) return; [...box.children].forEach((el, i) => { const id = res.ranking[i]; if (id != null && d[id] != null) el.insertAdjacentHTML('beforeend', `<small style="margin-left:auto;font-weight:700;color:#f27bb2">${d[id]} m</small>`); });
    $('oSub').textContent += res.carry ? ` · 🐢 ${mine} m con la tortuga` : ` · ${mine} m${mine > rec ? ' 🏆 ¡RÉCORD!' : ` · Récord ${Math.max(rec, mine)} m`}`; }, 1500); }
function start(cfg, api) {
  TT = null; CR = null;
  shell = api; roster = cfg.roster; online = cfg.online; me = api.myId; endSent = false; sentX = sentY = 9; joyX = joyY = 0; specId = null; simAcc = 0; ff = 1; snapBuf.length = 0; fallT.clear();
  rowSeed = cfg.seed | 0; rowCache.clear(); if (showcase) { scene.remove(showcase); showcase = null; }
  buildChars(); $('spect').classList.remove('on');
  sim = (!online || api.isHost) ? new Sim(cfg) : null; if (sim) applySnap(sim.snap(), true);
  ['hud', 'pushB', 'hopB', 'joy', 'steerHint'].forEach(id => $(id).classList.add('on')); setTimeout(() => $('steerHint').classList.remove('on'), 6000);
  playing = false; let n = 3; api.big('3', 0); Sfx.tick();
  const cd = setInterval(() => { n--; if (n > 0) { api.big(String(n), 0); Sfx.tick(); } else { clearInterval(cd); api.big('¡A correr!', 700); Sfx.go(); playing = true; } }, 750);
}
function stop() { playing = false; sim = null; S = null; TT = null; online = false; HUDIDS.forEach(id => $(id).classList.remove('on')); for (const c of chars.values()) { scene.remove(c.root); scene.remove(c.blob); } chars.clear(); zc = -14; sinkMap.clear(); pickedSet.clear(); bananas = []; windS = [0, 1]; setShowcase(localStorage.getItem('ms_ch') || 'mochi'); }
function setShowcase(chId) { if (showcase) scene.remove(showcase); showcase = makeCharacter(chOf(chId)); showcase.scale.setScalar(1.1); showcase.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(showcase); }

createShell({
  id: 'hunde_carrera', titleA: 'Carrera en', titleB: 'las alturas', prefix: 'mochihunde-carrera-v1-',
  sub: '🏔️ Corre, empuja al vacío… ¡y llega más lejos que nadie!',
  how: `<ul><li>Todos corren solos <b>hacia delante</b> por una pasarela altísima. Los números del suelo son los <b>metros</b>.</li>
    <li><b>Joystick</b>: izquierda/derecha para cambiar de carril; arriba para correr más, abajo para frenar (PC: WASD o flechas).</li>
    <li><b>👐 Empujón</b> (PC: E): aparta a quien tengas al lado… ¡y tíralo al vacío!</li>
    <li><b>Salto</b> (PC: espacio) para cruzar los <b>huecos</b>. Las casillas rosas con flecha son <b>muelles</b>: ¡superbote!</li>
    <li>Las casillas <b>marrones</b> se hunden en cuanto alguien las pisa. ¡No te pares!</li>
    <li>🎁 Regalos: <b>🥊 guante gigante</b> (empujón brutal), <b>⚡ turbo</b> o <b>🍌 plátanos</b> que dejas detrás para que resbalen.</li>
    <li>💨 De vez en cuando sopla una <b>ventolera</b> que te arrastra hacia un lado: ¡aguanta!</li>
    <li>El suelo <b>se hunde detrás de vosotros</b> cada vez más rápido. Gana quien <b>llegue más lejos</b>.</li></ul><p>🐢 <b>Relevo con tortuga</b>: coge la tortuga y llévala a la meta (400 m). Si te empujan o resbalas, se te cae y la puede coger otro. Gana quien la cruce o quien más metros la haya llevado.</p>`,
  onPreview: chId => setShowcase(chId), start, stop, getMode: () => curMode,
  onNetMsg(d, api) {
    if (d.t === 'gin' && sim && api.isHost) { sim.input(d.from, d); return; }
    if (sim) return;
    if (d.t === 'gs') { snapBuf.push({ at: performance.now(), s: d.s }); while (snapBuf.length > 12) snapBuf.shift(); applySnap(d.s, !S); }
    if (d.t === 'gev') onEvents(d.e);
    if (d.t === 'gend' && !endSent) { endSent = true; playing = false; setTimeout(() => finish(d.res), 900); }
  },
  onLeft(id) { if (sim) { const p = sim.P.find(p => p.id === id); if (p && p.alive) { p.ai = { tx: p.x, react: 0, push: 3 }; p.skill = 0.6; p.bot = true; } } },
});
// selector Carrera / Tortuga
{ const a = document.querySelector('#sHome #cBots'); if (a) { const l = document.createElement('div'); l.className = 'lbl'; l.textContent = 'Modo'; const c = document.createElement('div'); c.className = 'chips'; c.id = 'cMode'; a.previousElementSibling.before(l, c);
  const draw = () => { c.innerHTML = [['carrera', '🏔️ Carrera'], ['tortuga', '🐢 Relevo con tortuga']].map(([k, n]) => `<button data-v="${k}" class="${k === curMode ? 'on' : ''}">${n}</button>`).join(''); }; draw();
  c.onclick = e => { const b = e.target.closest('button'); if (!b) return; Sfx.tap(); curMode = b.dataset.v; localStorage.setItem('hunde_carrera_modo', curMode); draw(); }; } }
// botón para volver al modo clásico
{ const h = document.querySelector('#sHome .row:last-child'); if (h) { const b = document.createElement('button'); b.className = 'btn mint'; b.id = 'bClassic'; b.textContent = '🏝️ Modo clásico'; b.onclick = () => { Sfx.tap(); location.href = './index.html'; }; h.appendChild(b); } }
setShowcase(localStorage.getItem('ms_ch') || 'mochi');
frame();
// v16: desde la pantalla de modos del menú principal se entra directo a jugar
if (/[?&]auto=1/.test(location.search)) { history.replaceState(null, '', location.pathname + '?modo=' + curMode); setTimeout(() => window.__shell && window.__shell.solo(), 400); }
fetch('./version.json?t=' + Date.now(), { cache: 'no-store' }).then(r => r.json()).then(j => { if (j.v > 19 && sessionStorage.getItem('hunde_rl') !== String(j.v)) { sessionStorage.setItem('hunde_rl', String(j.v)); location.replace(location.pathname + '?modo=' + curMode + '&v=' + j.v); } }).catch(() => {});
window.__carrera = { get sim() { return sim; }, get playing() { return playing; }, row, get chars() { return chars; } };
