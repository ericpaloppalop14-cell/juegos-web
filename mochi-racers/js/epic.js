// ======================================================================
//  MOCHI RACERS v32 · 3 objetos épicos nuevos
//  Taladrín (5 s bajo tierra, lo manejas tú), Dragón Colosal (montas con silla y riendas, turbo fuerte)
//  y Tobogán Arcoíris (aparece un arcoíris gigante sobre la pista y te deslizas por encima de todos).
//  Se enganchan a PowerFX como locos.js; el kart nunca se inclina y la física de pista sigue mandando.
// ======================================================================
import * as THREE from 'three';
import { PowerFX, POWER, POWER_W, SELF_POWERS } from './powerups.js';
import { toon, mesh, outline, glowTex } from './gfx.js';
import { Audio } from './audio.js';
import { Race } from './race.js';
import { deco } from './itemdeco.js';
import { buildDragon } from './dragon48.js';
export const makeDriller = (...a) => deco(makeDriller__(...a), 'driller');
export const makeClump = (...a) => deco(makeClump__(...a), 'clump');
export const makeRing = (...a) => deco(makeRing__(...a), 'ring');
export const makeDragon = (...a) => deco(makeDragon__(...a), 'dragon');
export const makeRainbowCloud = (...a) => deco(makeRainbowCloud__(...a), 'rainbow');
const V3 = THREE.Vector3, R = Math.random, clamp = (x, a, b) => Math.max(a, Math.min(b, x)), sm = x => x * x * (3 - 2 * x);

export const EPIC = {
  taladro: { name: 'Taladrín',          icon: '🌀', hint: '¡Te conviertes en Taladrín y vas 5 s bajo tierra! Lo manejas tú y nadie te toca' },
  dragon:  { name: 'Dragón Colosal',    icon: '🐉', hint: 'Montas un dragón gigante con silla y riendas: ¡turbo fuerte 5 s y vuelas por encima de todo!' },
  arcoiris:{ name: 'Tobogán Arcoíris',  icon: '🌈', hint: 'Sale un arcoíris gigante sobre la pista y te deslizas por encima de todos con turbo' },
};
Object.assign(POWER, EPIC);
Object.assign(POWER_W, { taladro: [0.4, 1.3, 1.5], dragon: [0.1, 0.9, 1.6], arcoiris: [0.2, 1.1, 1.5] });
SELF_POWERS.push('taladro', 'dragon', 'arcoiris');

// ---------- sonidos (mismo estilo brillante que la música: campanas, glock, sin graves) ----------
const SFX = {
  drillStart: A => { const t = A.ctx.currentTime; A.tone(500, t, 0.35, 'triangle', 0.08, null, 1400); [0, 4, 7, 12].forEach((n, i) => A.bell(A.midi(84 + n), t + 0.12 + i * 0.05, 0.25, 0.05)); A.hit(t, 0.4, 0.06, 1800); },
  drillTick: A => { const t = A.ctx.currentTime; A.hit(t, 0.09, 0.025, 1500); A.tone(700 + R() * 200, t, 0.05, 'triangle', 0.015, null, 900); },
  drillOut: A => { const t = A.ctx.currentTime; A.tone(400, t, 0.25, 'sine', 0.1, null, 1200); A.hit(t, 0.3, 0.07, 2000); [0, 7, 12, 16].forEach((n, i) => A.bell(A.midi(86 + n), t + 0.08 + i * 0.05, 0.3, 0.05)); },
  dragonRoar: A => { const t = A.ctx.currentTime; A.tone(330, t, 0.45, 'triangle', 0.1, null, 660); A.tone(495, t + 0.05, 0.4, 'triangle', 0.06, null, 990); [0, 4, 7, 11, 14].forEach((n, i) => A.bell(A.midi(79 + n), t + 0.3 + i * 0.06, 0.4, 0.05)); A.hit(t + 0.3, 0.5, 0.05, 3000); },
  flap: A => { const t = A.ctx.currentTime; A.hit(t, 0.18, 0.03, 900); A.tone(380, t, 0.12, 'sine', 0.025, null, 300); },
  breath: A => { const t = A.ctx.currentTime; A.hit(t, 0.35, 0.03, 4000); for (let i = 0; i < 5; i++) A.tone(1800 + R() * 1600, t + i * 0.04, 0.08, 'sine', 0.02); },
  rainbow: A => { const t = A.ctx.currentTime; [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19].forEach((n, i) => A.bell(A.midi(72 + n), t + i * 0.045, 0.35, 0.045)); A.hit(t, 0.6, 0.03, 6000); },
  slide: A => { const t = A.ctx.currentTime; A.tone(900, t, 0.4, 'sine', 0.025, null, 1500); },
  landSpark: A => { const t = A.ctx.currentTime; [12, 7, 4, 0].forEach((n, i) => A.bell(A.midi(84 + n), t + i * 0.04, 0.25, 0.05)); A.hit(t, 0.2, 0.05, 2500); },
};
const sfxPrev = Audio.sfxPlay;
Audio.sfxPlay = function (name, k) { if (SFX[name]) { if (this.ctx && this.on) try { SFX[name](this); } catch (e) {} return; } return sfxPrev.call(this, name, k); };

// ---------- geometrías compartidas ----------
const G = {}; const geo = (k, f) => G[k] || (G[k] = Object.assign(f(), { _shared: true }));
const sph = () => geo('s', () => new THREE.SphereGeometry(1, 18, 14)), cone = () => geo('k', () => new THREE.ConeGeometry(1, 1, 14)), cyl = () => geo('c', () => new THREE.CylinderGeometry(1, 1, 1, 14));
const cap = () => geo('cap', () => new THREE.CapsuleGeometry(0.5, 1, 4, 10)), tor = () => geo('tor', () => new THREE.TorusGeometry(1, 0.18, 8, 24));
const basic = c => new THREE.MeshBasicMaterial({ color: c });
const glow = (c, s, op = 0.8) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: op })); sp.scale.setScalar(s); return sp; };
function face(p, y, z, s, o = {}) { // ojos grandes con brillos, mejillas y sonrisa (estilo Mochi)
  const eyes = [];
  for (const sd of [-1, 1]) { const e = new THREE.Group(); e.position.set(sd * 0.36 * s, y, z); p.add(e); eyes.push(e);
    mesh(sph(), toon('#2a1840', { rim: 0 }), e, [0, 0, 0], null, [0.2 * s, 0.25 * s, 0.1 * s]);
    mesh(sph(), basic('#ffffff'), e, [-0.06 * s * sd, 0.09 * s, 0.07 * s], null, 0.075 * s); mesh(sph(), basic('#ffffff'), e, [0.06 * s * sd, -0.07 * s, 0.07 * s], null, 0.04 * s);
    mesh(sph(), new THREE.MeshBasicMaterial({ color: '#ff9cc4', transparent: true, opacity: 0.85 }), p, [sd * 0.62 * s, y - 0.24 * s, z - 0.05 * s], null, [0.18 * s, 0.1 * s, 0.06 * s]); }
  mesh(geo('smile', () => new THREE.TorusGeometry(0.2, 0.05, 6, 14, Math.PI)), toon(o.mouth || '#c2427e', { rim: 0 }), p, [0, y - 0.22 * s, z + 0.02], [0, 0, Math.PI], s * 0.9);
  return eyes;
}

// ---------- 1) TALADRÍN: ser kawaii con casco-taladro, asomando entre la tierra ----------
function makeDriller__() {
  const g = new THREE.Group(), u = g.userData;
  const body = new THREE.Group(); body.position.y = -0.55; g.add(body); u.body = body; // la mitad de abajo queda bajo la pista
  const fur = toon('#c9a7ff', { rim: 0.6 }), OL = '#9a74d8';
  const b = mesh(sph(), fur, body, [0, 0.9, 0], null, [1.25, 1.15, 1.2]); outline(b, OL, 1.05);
  mesh(sph(), toon('#fff0f8', { rim: 0.4 }), body, [0, 0.75, 0.75], null, [0.8, 0.7, 0.5]); // barriguita
  const fc = new THREE.Group(); fc.position.set(0, 1.2, 0.98); body.add(fc); u.eyes = face(fc, 0.05, 0.12, 1.05);
  // gafas de excavador
  for (const sd of [-1, 1]) { const ring = mesh(tor(), toon('#ffb84a', { rim: 0.5 }), fc, [sd * 0.38, 0.06, 0.08], null, [0.3, 0.3, 0.6]); mesh(sph(), new THREE.MeshBasicMaterial({ color: '#bff3ff', transparent: true, opacity: 0.35 }), fc, [sd * 0.38, 0.06, 0.05], null, [0.27, 0.27, 0.08]); }
  mesh(cyl(), toon('#ff7fb0', { rim: 0.3 }), fc, [0, 0.06, -0.15], [0, 0, Math.PI / 2], [0.07, 2.2, 0.07]);
  // casco con taladro arcoíris en espiral
  const helm = mesh(sph(), toon('#ffd84a', { rim: 0.6 }), body, [0, 1.75, 0.1], null, [1.05, 0.65, 1.05]); outline(helm, '#d8a020', 1.05);
  mesh(cyl(), basic('#fff6c0'), body, [0, 2.0, 0.95], [Math.PI / 2, 0, 0], [0.2, 0.15, 0.2]); const lamp = glow('#fff2b0', 2.4, 0.6); lamp.position.set(0, 2.0, 1.15); body.add(lamp);
  const drill = new THREE.Group(); drill.position.set(0, 0.4, 1.1); drill.rotation.x = Math.PI / 2; body.add(drill); u.drill = drill;
  const spin = new THREE.Group(); drill.add(spin); u.spin = spin;
  const dc = mesh(cone(), toon('#e8f0ff', { rim: 0.8 }), spin, [0, 1.4, 0], null, [0.75, 2.6, 0.75]); outline(dc, '#8aa0d8', 1.05);
  const cols = ['#ff9cc4', '#ffd84a', '#9df0c8', '#9fd0ff', '#c9a7ff'];
  for (let i = 0; i < 9; i++) { const r = 0.72 * (1 - i / 9.5); mesh(tor(), toon(cols[i % 5], { rim: 0.5 }), spin, [0, 0.25 + i * 0.27, 0], [Math.PI / 2 + 0.25, 0, i * 0.7], [r, r, 0.9]); }
  mesh(cyl(), toon('#b8a8e0', { rim: 0.5 }), drill, [0, 0, 0], null, [0.6, 0.4, 0.6]);
  mesh(sph(), toon('#ffffff', { rim: 0.6, emissive: '#ffffff', ei: 0.3 }), spin, [0, 2.75, 0], null, 0.08);
  // manitas que sujetan el taladro
  for (const sd of [-1, 1]) { const h = mesh(sph(), fur, body, [sd * 0.75, 0.4, 1.1], null, [0.3, 0.26, 0.3]); outline(h, OL, 1.08); }
  // montículo de tierra (o domo de energía en pistas espaciales)
  const mound = new THREE.Group(); g.add(mound); u.mound = mound;
  const dirt = toon('#c69a72', { rim: 0.3 }), dirt2 = toon('#e0b88f', { rim: 0.3 }), grass = toon('#8fe08a', { rim: 0.3 });
  const hump = mesh(geo('hump', () => new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), dirt, mound, [0, -0.05, -0.6], null, [2.1, 0.75, 2.6]);
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283, r = 1.9 + (i % 3) * 0.3; mesh(sph(), i % 2 ? dirt2 : dirt, mound, [Math.cos(a) * r, 0.1 + (i % 4) * 0.12, -0.6 + Math.sin(a) * r * 1.2], null, 0.25 + (i % 3) * 0.1); }
  for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.3; mesh(cone(), grass, mound, [Math.cos(a) * 1.5, 0.55, -0.6 + Math.sin(a) * 1.9], [0.3 * Math.cos(a), 0, 0.3 * Math.sin(a)], [0.09, 0.45, 0.09]); }
  for (let i = 0; i < 3; i++) mesh(sph(), toon(['#ffb3d1', '#fff3a0', '#b3dcff'][i], { rim: 0.4 }), mound, [(i - 1) * 1.1, 0.6, -1.6 + i * 0.3], null, 0.13); // florecitas
  u.dirtMeshes = [hump];
  const dome = new THREE.Group(); g.add(dome); u.dome = dome; dome.visible = false;
  mesh(geo('domeG', () => new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)), new THREE.MeshBasicMaterial({ color: '#8ff0ff', transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending }), dome, [0, -0.1, -0.4], null, [2.2, 1.6, 2.8]);
  u.rings = [0, 1, 2].map(i => { const r = mesh(tor(), new THREE.MeshBasicMaterial({ color: ['#7ff5ff', '#ff9cf0', '#fff39a'][i], transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }), dome, [0, 0.3, 0], [0, 0, 0], 2.0); return r; });
  return g;
}
function makeClump__() { const g = new THREE.Group(); const c = toon('#c69a72', { rim: 0.3 }); mesh(sph(), c, g, [0, 0, 0], null, [0.9, 0.4, 0.9]); mesh(sph(), toon('#e0b88f', { rim: 0.3 }), g, [0.5, 0.15, 0.2], null, 0.32); mesh(sph(), c, g, [-0.5, 0.1, -0.2], null, 0.28); return g; }
function makeRing__() { const m = new THREE.Mesh(tor(), new THREE.MeshBasicMaterial({ color: '#7ff5ff', transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })); const g = new THREE.Group(); g.add(m); g.userData.m = m; return g; }

// ---------- 2) DRAGÓN COLOSAL: escamas, cuernos, alas, cola ondulante, silla y riendas ----------
function makeDragon__() { return buildDragon(); } // v48: dragón épico en dragon48.js

// ---------- 3) TOBOGÁN ARCOÍRIS: se construye sobre la pista que tienes delante ----------
const RB = ['#ff8fb0', '#ffb36b', '#ffe66b', '#8fe8a0', '#8fcfff', '#c6a2ff'];
function makeRainbowCloud__() { const g = new THREE.Group(), w = toon('#ffffff', { rim: 0.7 }); [[0, 0, 0, 2.2], [1.9, -0.3, 0.2, 1.6], [-1.9, -0.3, 0.1, 1.7], [0.9, 1.1, 0, 1.4], [-0.9, 1.0, 0.2, 1.3]].forEach(([x, y, z, r]) => { const m = mesh(sph(), w, g, [x, y, z], null, r); outline(m, '#d9c8f0', 1.04); });
  g.userData.eyes = face(g, 0.2, 2.15, 1.6); return g; }
function buildRainbow(T, i0, cnt, lat0, H) {
  const g = new THREE.Group(), pts = RB.map(() => []), N = T.N;
  for (let j = 0; j <= cnt; j += 2) { const s = T.S[T.open ? Math.min(N - 1, i0 + j) : (i0 + j) % N], u = j / cnt, lat = lat0 * (1 - sm(clamp(u / 0.2, 0, 1))), h = Math.sin(u * Math.PI) * H;
    RB.forEach((c, b) => pts[b].push(new V3(s.p.x + s.right.x * lat, s.p.y + 1.0 + h + (RB.length - 1 - b) * 0.55, s.p.z + s.right.z * lat))); }
  RB.forEach((c, b) => { const curve = new THREE.CatmullRomCurve3(pts[b]); const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(20, pts[b].length * 2), 0.32, 6, false), toon(c, { rim: 0.6, emissive: c, ei: 0.25 }));
    tube.scale.set(1, 1, 1); g.add(tube);
    // ancho: duplicamos la banda hacia los lados para que parezca una cinta ancha
    for (const off of [-1, 1]) { const t2 = new THREE.Mesh(tube.geometry, tube.material); t2.userData.shared = true; g.add(t2); t2.userData.off = off; } });
  // ensanchar desplazando lateralmente las copias (por segmento sería caro: usamos una pequeña separación global perpendicular media)
  const s0 = T.S[i0 % N]; g.children.forEach(c => { if (c.userData.off) c.position.set(s0.right.x * c.userData.off * 0.55, 0, s0.right.z * c.userData.off * 0.55); });
  const sparkles = []; for (let i = 0; i < 14; i++) { const sp = glow(['#ffffff', '#fff39a', '#ffc6ec', '#c6f7ff'][i % 4], 1.4, 0.9); const p = pts[0][Math.floor((i + 0.5) / 14 * (pts[0].length - 1))]; sp.position.copy(p).add(new V3(0, 1.2, 0)); g.add(sp); sparkles.push(sp); }
  const c1 = makeRainbowCloud(), c2 = makeRainbowCloud(); c1.position.copy(pts[RB.length - 1][0]).add(new V3(0, -0.5, 0)); c2.position.copy(pts[RB.length - 1][pts[0].length - 1]).add(new V3(0, -0.5, 0));
  const a = pts[0][1].clone().sub(pts[0][0]); c1.rotation.y = Math.atan2(-a.x, -a.z); const b2 = pts[0][pts[0].length - 2].clone().sub(pts[0][pts[0].length - 1]); c2.rotation.y = Math.atan2(-b2.x, -b2.z) + Math.PI;
  g.add(c1, c2); g.userData = { sparkles, clouds: [c1, c2] };
  return g;
}

// ---------- lógica ----------
const P0 = PowerFX.prototype, o = { use: P0.use, input: P0.input, immune: P0.immune, collide: P0.collide, update: P0.update, place: P0.place, prewarm: P0.prewarm, aiWants: P0.aiWants };
const busy = k => k.drillT > 0 || k.dragonT > 0 || k.rainT > 0;
P0.immune = function (k) { return o.immune.call(this, k) || busy(k); };
P0.collide = function (a, b) { if (busy(a) || busy(b)) return true; return o.collide.call(this, a, b); };
const isSpace = RC => { const c = RC.cup || {}; return c.theme === 'space' || c.ground === null; };
P0.use = function (k, it) {
  if (!EPIC[it]) return o.use.call(this, k, it);
  const RC = this.race, P = k.isPlayer, near = P || k.pos.distanceTo(RC.player.pos) < 70, T = this.T;
  const burst = (cols, n = 20, up = 8, y = 1.2) => { for (let i = 0; i < n; i++) RC.emit(k.pos.clone().add(new V3(0, y, 0)), cols[i % cols.length], 0.9, 0.7, new V3((R() - 0.5) * 10, 3 + R() * up, (R() - 0.5) * 10)); };
  // limpiar estados incompatibles
  k.puppetT = k.duckT = k.cannonT = k.octoT = 0; k.spinT = 0; k.squashT = 0; k.flyT = 0; k.morphT = 0; k.sharkT = 0; k.drillT = k.dragonT = k.rainT = 0;
  switch (it) {
    case 'taladro': k.drillT = 5; k.drillAge = 0; k.drillSpace = isSpace(RC); k.dropT = 0; if (P) RC.msg(k.drillSpace ? '🌀 ¡TALADRÍN! Túnel de energía 5 s' : '🌀 ¡TALADRÍN! 5 s bajo tierra', k, '#c9a7ff'); burst(k.drillSpace ? ['#7ff5ff', '#ff9cf0', '#ffffff'] : ['#c69a72', '#e0b88f', '#8fe08a'], 26, 7, 0.5); if (near) Audio.sfxPlay('drillStart'); break;
    case 'dragon': k.dragonT = 5.2; k.dragonAge = 0; if (P) { RC.msg('🐉 ¡DRAGÓN COLOSAL! ¡Arre!', k, '#ff8fc4'); } burst(['#ff9cc8', '#c6a8ff', '#ffe27a', '#8fe8ff'], 30, 10); if (near) Audio.sfxPlay('dragonRoar'); break;
    case 'arcoiris': { const N = T.N, H = 15, cnt = Math.round(320 / T.STEP); const s = T.S[k.idx], lat = (k.pos.x - s.p.x) * s.right.x + (k.pos.z - s.p.z) * s.right.z;
      if (k.rbMesh) this.dropRainbow(k); try { k.rbMesh = buildRainbow(T, k.idx, cnt, lat, H); RC.scene.add(k.rbMesh); } catch (err) { console.warn('rainbow', err); k.rbMesh = null; } k.rainT = 6; k.rainAge = 0; k.rainI0 = k.idx; k.rainCnt = cnt; k.rainH = H; k.rainFade = 0;
      if (P) { RC.msg('🌈 ¡TOBOGÁN ARCOÍRIS!', k, '#ffe66b'); RC.kick = 1; } k.boostT = Math.max(k.boostT, 0.6); burst(RB, 30, 10); if (near) Audio.sfxPlay('rainbow'); break; }
  }
  return true;
};
P0.dropRainbow = function (k) { const m = k.rbMesh; if (!m) return; k.rbMesh = null; m.parent && m.parent.remove(m); m.traverse(x => { if (x.isMesh && x.geometry && !x.geometry._shared && !x.userData.shared) x.geometry.dispose(); }); };
P0.input = function (k, inp, dt) {
  inp = o.input.call(this, k, inp, dt); if (k.remote) return inp;
  const RC = this.race, T = this.T; let v = k.fxV || 1;
  if (k.drillT > 0) { k.drillT -= dt; k.drillAge += dt; v = Math.max(v, 1.3); k.boostT = Math.max(k.boostT, 0.1); k.driftDir = 0; inp = { ...inp, drift: false, driftEdge: false };
    if (!k.isPlayer || RC.app.autopilot) inp = this.auto(k, inp, dt);
    this.keepIn(k, 1.6);
    if (k.drillT <= 0) this.emerge(k); }
  if (k.dragonT > 0) { k.dragonT -= dt; k.dragonAge += dt; v = Math.max(v, k.dragonAge < 0.5 ? 1.4 : 1.9); k.boostT = Math.max(k.boostT, 0.25); inp = this.auto(k, inp, dt); this.keepIn(k, 1.2);
    if (k.isPlayer && Math.floor(k.dragonAge / 0.55) !== k.flapQ) { k.flapQ = Math.floor(k.dragonAge / 0.55); Audio.sfxPlay('flap'); }
    if (k.dragonT <= 0) { k.invT = Math.max(k.invT || 0, 0.8); if (k.isPlayer) { RC.msg('¡Gracias, dragoncito!', k, '#8fe3c4'); Audio.sfxPlay('landSpark'); } } }
  if (k.rainT > 0) { k.rainT -= dt; k.rainAge += dt; v = Math.max(v, 2.0); k.boostT = Math.max(k.boostT, 0.25); inp = this.auto(k, inp, dt); this.keepIn(k, 1.2);
    let prog = k.idx - k.rainI0; if (!T.open) { prog %= T.N; if (prog > T.N / 2) prog -= T.N; if (prog < -T.N / 2) prog += T.N; } prog = Math.max(0, prog); // v51: si el kart retrocede un tramo al salir, no se acaba al instante k.rainU = clamp(prog / k.rainCnt, 0, 1); if (prog > k.rainCnt * 1.5) k.rainU = 1;
    if (k.isPlayer && Math.floor(k.rainAge / 0.4) !== k.slideQ) { k.slideQ = Math.floor(k.rainAge / 0.4); Audio.sfxPlay('slide'); }
    if (k.rainU >= 1 || k.rainT <= 0) { k.rainT = 0; k.boostT = Math.max(k.boostT, 1.2); k.invT = Math.max(k.invT || 0, 0.8); k.rainFade = 1; if (k.isPlayer) { RC.msg('¡Aterrizaje arcoíris! +turbo', k, '#ffe66b'); Audio.sfxPlay('landSpark'); } for (let i = 0; i < 22; i++) RC.emit(k.pos.clone().add(new V3(0, 1, 0)), RB[i % 6], 0.9, 0.7, new V3((R() - 0.5) * 12, 3 + R() * 8, (R() - 0.5) * 12)); } }
  k.fxV = v; return inp;
};
// mantener dentro de la calzada: nunca atraviesa muros ni sale a zonas sin suelo (pistas flotantes/espaciales)
P0.keepIn = function (k, m) { const T = this.T, s = T.S[k.idx]; if (!s) return; const lat = (k.pos.x - s.p.x) * s.right.x + (k.pos.z - s.p.z) * s.right.z, lim = Math.max(1, s.w - m); if (Math.abs(lat) > lim) { const d = Math.abs(lat) - lim, sg = Math.sign(lat); k.pos.x -= s.right.x * sg * d; k.pos.z -= s.right.z * sg * d; const vl = k.vx * s.right.x + k.vz * s.right.z; if (vl * sg > 0) { k.vx -= s.right.x * vl; k.vz -= s.right.z * vl; } } };
P0.emerge = function (k) { const RC = this.race, T = this.T; k.drillT = 0; k.invT = Math.max(k.invT || 0, 1.0);
  const s = T.S[k.idx], lat = s ? Math.abs((k.pos.x - s.p.x) * s.right.x + (k.pos.z - s.p.z) * s.right.z) : 1e9;
  if (!s || lat > s.w + 0.5 || !isFinite(k.pos.x + k.pos.z + k.y) || k.y < s.p.y - 4) RC.respawn(k); // mal sitio: a la pista más cercana y bien orientado
  else { const fw = Math.atan2(s.fl.x, s.fl.z); let d = fw - k.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); if (Math.abs(d) > 1.2) k.yaw = fw; k.vy = 7; k.air = true; k.hop = true; }
  for (let i = 0; i < 26; i++) RC.emit(k.pos.clone().add(new V3(0, 0.6, 0)), k.drillSpace ? ['#7ff5ff', '#ff9cf0', '#ffffff'][i % 3] : ['#c69a72', '#e0b88f', '#8fe08a', '#ffffff'][i % 4], 1.0, 0.7, new V3((R() - 0.5) * 10, 4 + R() * 7, (R() - 0.5) * 10));
  if (k.isPlayer || k.pos.distanceTo(RC.player.pos) < 60) Audio.sfxPlay('drillOut'); if (k.isPlayer) RC.msg('¡PUM! ¡Taladrín sale a la luz!', k, '#c9a7ff'); };
P0.aiWants = function (k, it, dA, dB) {
  switch (it) { case 'taladro': return dB < 25 || k.place > 2 || R() < 0.02; case 'dragon': case 'arcoiris': return k.place > 1 || R() < 0.02; }
  return o.aiWants.call(this, k, it, dA, dB);
};
P0.prewarm = function (renderer, camera) {
  o.prewarm.call(this, renderer, camera);
  try { const RC = this.race, g = new THREE.Group(); for (const f of [makeDriller, makeDragon, makeClump, makeRing, makeRainbowCloud]) g.add(f());
    camera.updateMatrixWorld(); g.position.copy(camera.position).add(new V3(0, 0, -14).applyQuaternion(camera.quaternion)); g.scale.setScalar(0.15); g.traverse(x => x.frustumCulled = false); RC.scene.add(g); renderer.compile(RC.scene, camera); RC.scene.remove(g); } catch (e) {}
};
P0.update = function (dt) {
  o.update.call(this, dt);
  const RC = this.race, t = RC.time, UP = new V3(0, 1, 0);
  const E = this.E || (this.E = { trail: [] });
  for (const k of RC.karts) {
    const u = k.mesh.userData, m = k.mesh;
    // --- Taladrín ---
    if (k.drillT > 0 || u.fx_driller) { const d = this.attach(k, 'driller', makeDriller), on = k.drillT > 0; d.visible = on;
      if (on) { k._hidL ||= new Set(); for (const c of m.children) if (c !== d && c.visible) { c.visible = false; k._hidL.add(c); } } else if (k._hidL) { k._hidL.forEach(c => c.visible = true); k._hidL = null; }
      if (on) { const q = d.userData, e = Math.min(1, k.drillAge / 0.35, k.drillT / 0.3), sp = !!k.drillSpace; q.mound.visible = !sp; q.dome.visible = sp;
        q.body.position.y = -0.55 - (1 - e) * 2.2 + Math.abs(Math.sin(t * 9)) * 0.1; q.spin.rotation.y += dt * 22; q.body.rotation.z = Math.sin(t * 7) * 0.05; q.drill.rotation.z = Math.sin(t * 3) * 0.1;
        q.mound.scale.set(1 + Math.sin(t * 11) * 0.05, e * (1 + Math.sin(t * 13) * 0.12), 1 + Math.cos(t * 9) * 0.05); q.dome.scale.setScalar(Math.max(0.01, e)); q.rings.forEach((r, i) => { r.rotation.set(Math.PI / 2, 0, t * (2 + i)); r.position.z = -2.5 + ((t * 6 + i * 1.3) % 4); r.scale.setScalar(1.6 + Math.sin(t * 5 + i) * 0.2); });
        const bl = (t % 2.6) < 0.12 ? 0.15 : 1; q.eyes.forEach(x => x.scale.y = bl);
        // surco: terrones (o anillos de energía) que se quedan atrás y se hunden
        k.dropT = (k.dropT || 0) - dt; if (k.dropT <= 0 && !k.air && (k.isPlayer || k.pos.distanceTo(RC.player.pos) < 90)) { k.dropT = 0.12; const pool = (E[sp ? 'rings' : 'clumps'] ||= []); const c = pool.pop() || (sp ? makeRing() : makeClump()); if (!c.parent) RC.scene.add(c); c.visible = true;
          const fx = Math.sin(k.yaw), fz = Math.cos(k.yaw); c.position.set(k.pos.x - fx * 3.2 + (R() - 0.5) * 1.2, k.y + 0.05, k.pos.z - fz * 3.2 + (R() - 0.5) * 1.2); c.rotation.set(sp ? Math.PI / 2 : 0, k.yaw + (sp ? 0 : R() * 6), 0); c.scale.setScalar(sp ? 1.3 : 0.45 + R() * 0.25); E.trail.push({ c, t: 0, sp, pool, y0: c.position.y, s0: c.scale.x }); }
        if (k.isPlayer || R() < 0.35) for (let i = 0; i < 2; i++) RC.emit(k.pos.clone().add(new V3(Math.sin(k.yaw) * 1.8 + (R() - 0.5) * 2, 0.4, Math.cos(k.yaw) * 1.8 + (R() - 0.5) * 2)), sp ? ['#7ff5ff', '#ff9cf0', '#fff39a'][Math.floor(R() * 3)] : ['#c69a72', '#e0b88f', '#b8b0c8', '#fff4e0'][Math.floor(R() * 4)], 0.45, 0.5, new V3((R() - 0.5) * 5, 2 + R() * 4, (R() - 0.5) * 5));
        if (k.isPlayer && Math.floor(k.drillAge / 0.22) !== k.drQ) { k.drQ = Math.floor(k.drillAge / 0.22); Audio.sfxPlay('drillTick'); } } }
    // --- Dragón ---
    if (k.dragonT > 0 || u.fx_dragon) { const d = this.attach(k, 'dragon', makeDragon), on = k.dragonT > 0; d.visible = on;
      if (on) { const q = d.userData, e = Math.min(1, k.dragonAge / 0.5, k.dragonT / 0.4), ee = sm(e); d.scale.setScalar(Math.max(0.01, ee) * 0.72);
        const fl = Math.sin(t * 6.5); q.wings.forEach((w, i) => { const sd = i ? 1 : -1; w.rotation.z = sd * (0.38 + fl * 0.3); w.rotation.y = sd * 0.1; });
        q.root.position.y = -3.7 + fl * 0.25; q.head.rotation.y = Math.sin(t * 1.3) * 0.12; q.head.rotation.x = Math.sin(t * 2.2) * 0.06;
        q.tail.forEach((s, i) => { s.rotation.y = Math.sin(t * 3 - i * 0.6) * 0.22; s.rotation.x = Math.sin(t * 2 - i * 0.5) * 0.05 + 0.05; });
        const bl = (t % 3.1) < 0.13 ? 0.15 : 1; q.eyes.forEach(x => x.scale.y = bl); q.anim && q.anim(t, Math.max(0, Math.sin(t * 2.4) * 1.4 - 0.2) > 0.4 ? 1 : 0.15);
        d.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(d.matrixWorld).invert();
        q.reins.forEach((r, i) => { const sd = i ? 1 : -1, a = new V3().setFromMatrixPosition(q.bit[i].matrixWorld).applyMatrix4(inv), b = new V3(sd * 0.55, 1.35, 0.7); const dd = a.clone().sub(b); r.position.copy(b).addScaledVector(dd, 0.5); r.scale.set(0.06, dd.length(), 0.06); r.quaternion.setFromUnitVectors(UP, dd.normalize()); });
        if ((k.isPlayer || R() < 0.3) && Math.sin(t * 2.4) > 0.6) { const mp = new V3().setFromMatrixPosition(q.mouth.matrixWorld), fx = Math.sin(k.yaw), fz = Math.cos(k.yaw); for (let i = 0; i < 2; i++) RC.emit(mp, ['#ff8fd8', '#7ff5ff', '#ffe066', '#9dff7a', '#ffffff'][Math.floor(R() * 5)], 0.55, 0.55, new V3(fx * 14 + (R() - 0.5) * 4, 1 + R() * 3, fz * 14 + (R() - 0.5) * 4)); if (k.isPlayer && Math.floor(t / 2.6) !== k.brQ) { k.brQ = Math.floor(t / 2.6); Audio.sfxPlay('breath'); } } } }
    // --- Arcoíris ---
    if (k.rbMesh) { const q = k.rbMesh.userData; q.sparkles.forEach((s, i) => s.material.opacity = 0.5 + Math.abs(Math.sin(t * 4 + i)) * 0.5); q.clouds.forEach(c => { c.position.y += Math.sin(t * 2) * 0.01; const bl = (t % 2.8) < 0.12 ? 0.15 : 1; c.userData.eyes.forEach(x => x.scale.y = bl); });
      if (k.rainT > 0 && (k.isPlayer || R() < 0.3)) RC.emit(k.pos.clone().add(new V3(0, (k.epH || 0) + 0.5, 0)), RB[Math.floor(R() * 6)], 0.5, 0.5, new V3((R() - 0.5) * 4, 1 + R() * 2, (R() - 0.5) * 4));
      if (k.rainFade > 0) { k.rainFade -= dt * 0.6; k.rbMesh.position.y -= dt * 25 * (1.2 - k.rainFade); if (k.rainFade <= 0) this.dropRainbow(k); } }
    // altura visual (dragón y arcoíris) para el kart y la cámara
    const want = k.dragonT > 0 ? 2.7 * sm(Math.min(1, k.dragonAge / 0.5, k.dragonT / 0.4)) : k.rainT > 0 ? Math.sin((k.rainU || 0) * Math.PI) * k.rainH * Math.min(1, k.rainAge / 0.3) + 1.6 * Math.min(1, k.rainAge / 0.3) : 0;
    k.epH = (k.epH || 0) + (want - (k.epH || 0)) * (1 - Math.exp(-dt * 12));
  }
  E.trail = E.trail.filter(p => { p.t += dt; const a = p.t / 1.6; if (p.sp) { p.c.scale.setScalar(p.s0 * (1 + a * 1.5)); p.c.userData.m.material.opacity = 0.6 * (1 - a); } else { p.c.position.y = p.y0 - a * a * 0.6; p.c.scale.setScalar(p.s0 * (1 - a * 0.5)); } if (a >= 1) { p.c.visible = false; p.pool.push(p.c); return false; } return true; });
};
P0.place = function (k) {
  o.place.call(this, k); const m = k.mesh, h = k.epH || 0;
  if (h > 0.01) { m.position.y += h; const u = m.userData; if (u.shadow) u.shadow.position.y -= h / (k.megaS || 1); }
  m.rotation.x = 0; m.rotation.z = 0; // nunca inclinado
};
// cámara: sube con el dragón/arcoíris para ver la carretera por encima; temblor suave (sin marear) con el taladro
const pc = Race.prototype.placeCamera;
Race.prototype.placeCamera = function (snap, dt) {
  const pl = this.player, h = pl ? (pl.epH || 0) : 0, extra = pl && pl.dragonT > 0 ? 4.5 * Math.min(1, h / 2.7) : pl && pl.rainT > 0 ? 1.5 : 0;
  if (h) pl.y += h + extra; pc.call(this, snap, dt); if (h) pl.y -= h + extra;
  if (pl && pl.drillT > 0 && this.state === 'race') { const t = this.time; this.camera.position.x += Math.sin(t * 31) * 0.05; this.camera.position.y += Math.sin(t * 27 + 1) * 0.06; }
};

