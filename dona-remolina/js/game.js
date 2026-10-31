// Doña Remolina — juego 3D móvil (Three.js). Todo el código y el arte son originales.
import * as THREE from 'three';
import * as AU from './audio.js?v=1';
import { KINDS, getGeo, propMaterial, makeDona, makeAlcalde, makeRebel, PAL } from './models.js?v=1';
import { Particles, Rings, makeTornado } from './fx.js?v=1';
import { buildScenery, generate, HALF, SPAWN, mulberry, skyTex } from './world.js?v=1';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const fmt = (n) => Math.round(n).toLocaleString('es-ES');
const GATE = 0.72;            // un objeto se traga si su radio <= radio del torbellino * GATE
const GROW_K = 0.22;          // crecimiento del área por área del objeto
const R_MAX = 15, BOUND = HALF - 2;
const COMBO_WIN = 2.0;

// ---------- partida guardada ----------
const SAVE_KEY = 'dr_save_v1';
let save = { coins: 0, best: 0, rounds: 0, tut: false, ups: { size: 0, time: 0, speed: 0, loot: 0 } };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s) { save = Object.assign(save, s); save.ups = Object.assign({ size: 0, time: 0, speed: 0, loot: 0 }, s.ups); } } catch (e) {}
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };
const UPMAX = 8;
const upCost = (l) => Math.round(60 * Math.pow(1.7, l) / 5) * 5;
const dur = (l) => 70 + 7 * l;
const UPS = [
  { id: 'size', n: 'Tamaño', d: (l) => `Empiezas con un torbellino de ${100 + 12 * l}% → ${100 + 12 * (l + 1)}%`, col: '#ff4fa3', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg>' },
  { id: 'time', n: 'Duración', d: (l) => `La ronda dura ${dur(l)} s → ${dur(l + 1)} s`, col: '#2a8cf0', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/></svg>' },
  { id: 'speed', n: 'Velocidad', d: (l) => `Te mueves un +${6 * l}% → +${6 * (l + 1)}%`, col: '#ff9a1f', icon: '<svg viewBox="0 0 24 24" fill="#fff" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>' },
  { id: 'loot', n: 'Botín', d: (l) => `Monedas por objeto x${(1 + 0.15 * l).toFixed(2)} → x${(1 + 0.15 * (l + 1)).toFixed(2)}`, col: '#3fbf5a', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 9.5c0-1.2 1.3-1.8 3-1.8s3 .8 3 2-1.3 1.6-3 2-3 .8-3 2 1.3 2 3 2 3-.7 3-1.8"/></svg>' },
];
const startR = () => 0.9 * (1 + 0.12 * save.ups.size);
const speedMul = () => 1 + 0.06 * save.ups.speed;
const lootMul = () => 1 + 0.15 * save.ups.loot;

// ---------- renderer / escena ----------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = skyTex(); scene.fog = new THREE.Fog(0xcdeeff, 60, 260);
const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 700);
const hemi = new THREE.HemisphereLight(0xe3f4ff, 0xffd9a8, 1.55); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d0, 2.7); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.06; sun.shadow.radius = 3;
sun.shadow.camera.near = 5; sun.shadow.camera.far = 320; scene.add(sun, sun.target);
const SUN_OFF = new THREE.Vector3(55, 100, 42);
const parts = new Particles(scene, 1200);
const rings = new Rings(scene, 10);
const tornado = makeTornado(scene);
const dona = makeDona(); scene.add(dona);
const worldGroup = new THREE.Group(); scene.add(worldGroup);
let pixelCap = Math.min(window.devicePixelRatio || 1, 2.25), pixelRatio = pixelCap;
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(pixelRatio); renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.fov = w / h < 1 ? 56 : 46; camera.updateProjectionMatrix();
  parts.mat.uniforms.uScale.value = (h * pixelRatio * 0.5) / Math.tan(camera.fov * Math.PI / 360);
  $('rotate').style.display = 'none';
}
window.addEventListener('resize', resize); resize();

// ---------- estado ----------
const G = {
  mode: 'menu', t: 0, time: 70, dur: 70, px: SPAWN.x, pz: SPAWN.z, vx: 0, vz: 0, kx: 0, kz: 0,
  A0: 0.81, A: 0.81, R: 0.9, Rv: 0.9, lvl: 1, score: 0, coins: 0, swallowed: 0, combo: 0, comboT: 0, bestCombo: 0, rebels: 0, alcaldes: 0, hits: 0, maxTier: 0,
  slow: 0, inv: 0, shake: 0, kick: 0, twirl: 0, shout: 0, ended: 0, countT: 0, intro: 1, seed: 1, demoT: 0, hintStage: 0, moved: 0, bubbleT: 3, bot: false, speed: 0, paused: false,
};
let props = [], grid = new Map(), movers = [], sucked = [], wobbling = [], pickups = [], frameNo = 0, alc = null, alcTimer = 0, alcLevel = 0, taken = [];
const cellOf = (v) => Math.floor(v / 8);
const gkey = (cx, cz) => (cx + 20) * 64 + (cz + 20);

// ---------- helpers de pantalla ----------
const tmpV = new THREE.Vector3();
function toScreen(x, y, z) { tmpV.set(x, y, z).project(camera); return { x: (tmpV.x * 0.5 + 0.5) * window.innerWidth, y: (-tmpV.y * 0.5 + 0.5) * window.innerHeight, z: tmpV.z, behind: tmpV.z > 1 }; }
function popText(txt, x, y, z, cls = '') {
  const p = toScreen(x, y, z); if (p.behind) return; const d = document.createElement('div'); d.className = 'pop ' + cls; d.textContent = txt;
  d.style.left = clamp(p.x, 40, window.innerWidth - 40) + 'px'; d.style.top = clamp(p.y, 90, window.innerHeight - 60) + 'px'; $('pops').appendChild(d); setTimeout(() => d.remove(), 950);
}
let toastTimer = 0;
function toast(txt, cls = '') { const t = $('toast'); t.className = cls; t.textContent = txt; void t.offsetWidth; t.classList.add('show'); }
function say(who, txt, ms = 1900) {
  const b = who === 'dona' ? $('bDona') : $('bAlc'); b.textContent = txt; b.classList.add('on'); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('on'), ms);
}
function flash(cls = '') { const f = $('flash'); f.className = 'on ' + cls; void f.offsetWidth; requestAnimationFrame(() => requestAnimationFrame(() => { f.className = ''; })); }
const DONA_LINES = ['¡A limpiar!', '¡Qué desorden!', '¡Todo para dentro!', '¡Hasta el último calcetín!', '¡En mis tiempos esto estaba ordenado!', '¡Ay, cuánto polvo!', '¡Me lo llevo todo!', '¡Con esta escoba no hay quien pueda!'];
const ALC_LINES = ['¡Alto en nombre del Ayuntamiento!', '¡Exijo un permiso de torbellino!', '¡Esto es una vergüenza municipal!', '¡Voy a ponerle una multa!', '¡Aquí mando yo!'];
const rnd = Math.random;

// ---------- mundo ----------
const rugs = [];
function clearWorld() {
  for (const o of props) { worldGroup.remove(o.mesh); }
  const disp = (o) => o.mesh.traverse((c) => { if (c.isMesh && c.geometry) c.geometry.dispose(); });
  for (const m of movers) { worldGroup.remove(m.mesh); disp(m); }
  for (const p of pickups) worldGroup.remove(p.mesh);
  if (alc) { worldGroup.remove(alc.mesh); disp(alc); alc = null; }
  props = []; grid = new Map(); movers = []; sucked = []; wobbling = []; pickups = []; fading = []; for (const f of fadePool) { f.used = false; f.m.opacity = 1; }
}
const coinGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.14, 20).rotateX(Math.PI / 2);
const coinMat = new THREE.MeshStandardMaterial({ color: 0xffc933, roughness: 0.3, metalness: 0.6, emissive: 0x7a4a00, emissiveIntensity: 0.6 });
const coinRim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 6, 20), new THREE.MeshStandardMaterial({ color: 0xfff0a0, roughness: 0.3, metalness: 0.4 }));
function makeCoinMesh() { const g = new THREE.Group(); g.add(new THREE.Mesh(coinGeo, coinMat)); const r = coinRim.clone(); g.add(r); return g; }
function makeClockMesh() {
  const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.35, 24).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3fb9ff, roughness: 0.4, emissive: 0x0a4a7a, emissiveIntensity: 0.5 }));
  const f = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.4, 24).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }));
  const h1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.1), new THREE.MeshBasicMaterial({ color: 0x3a2a55 })); h1.position.set(0, 0.2, 0.22);
  const h2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: 0x3a2a55 })); h2.position.set(0.15, 0, 0.22);
  const bell1 = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshStandardMaterial({ color: 0xff6b5e })); bell1.position.set(-0.6, 0.8, 0); const bell2 = bell1.clone(); bell2.position.x = 0.6;
  g.add(b, f, h1, h2, bell1, bell2); return g;
}
function addProp(d, shadow = true) {
  const geo = getGeo(d.kind, d.v), K = KINDS[d.kind];
  const m = new THREE.Mesh(geo.geo, propMaterial); m.castShadow = shadow; m.rotation.order = 'XZY';
  const o = { id: props.length, kind: d.kind, K, tier: K.tier, r: geo.r * d.sc, sc: d.sc, x: d.x, z: d.z, hy: geo.halfH * d.sc, rot: d.rot, mesh: m, state: 0, area: 0, coins: K.coins, ov: d.ov, wf: -1, name: K.n };
  o.area = o.r * o.r; o.hw = Math.max(geo.geo.userData.w, geo.geo.userData.d) * d.sc * 0.5; m.position.set(d.x, o.hy, d.z); m.rotation.set(0, d.rot, 0); m.scale.setScalar(d.sc); m.updateMatrix(); m.matrixAutoUpdate = false;
  worldGroup.add(m); props.push(o);
  const k = gkey(cellOf(d.x), cellOf(d.z)); (grid.get(k) || grid.set(k, []).get(k)).push(o); o.cell = k;
  return o;
}
function addRebel(d) {
  const inner = makeRebel(d.v), holder = new THREE.Group(); const h = inner.userData.h; inner.position.y = -h / 2; holder.add(inner); holder.rotation.order = 'XZY';
  holder.position.set(d.x, h / 2, d.z); worldGroup.add(holder);
  const o = { rebel: true, kind: 'rebel', name: 'Sofá Rebelde', tier: 2, r: 1.8, sc: 1, x: d.x, z: d.z, hy: h / 2, rot: 0, mesh: holder, inner, state: 0, area: 3.2, coins: 28, ph: rnd() * 6, vx: 0, vz: 0, face: 0, wander: rnd() * 5, wdx: 0, wdz: 0, scream: 0 };
  movers.push(o); return o;
}
function addPickup(d) {
  const mesh = d.type === 'coin' ? makeCoinMesh() : makeClockMesh(); mesh.position.set(d.x, d.type === 'coin' ? 1.1 : 1.5, d.z); worldGroup.add(mesh);
  pickups.push({ type: d.type, x: d.x, z: d.z, mesh, ph: rnd() * 6, on: true, state: 0, r: 0 });
}
function spawnAlcalde(level) {
  const inner = makeAlcalde(), holder = new THREE.Group(); const h = inner.userData.h; inner.position.y = -h / 2; holder.add(inner); holder.rotation.order = 'XZY';
  let x = 0, z = 0, best = -1; for (let i = 0; i < 12; i++) { const a = rnd() * 6.283, d = 30 + rnd() * 10, cx = clamp(G.px + Math.cos(a) * d, -BOUND + 2, BOUND - 2), cz = clamp(G.pz + Math.sin(a) * d, -BOUND + 2, BOUND - 2), dd = Math.hypot(cx - G.px, cz - G.pz); if (dd > best) { best = dd; x = cx; z = cz; } }
  holder.position.set(x, h / 2, z); worldGroup.add(holder);
  const r = Math.min(3.6, 2.1 + level * 0.4);
  alc = { rebel: false, alc: true, kind: 'alcalde', name: 'Alcalde Paraguas', tier: 3, r, sc: 1 + level * 0.12, x, z, hy: h / 2, mesh: holder, inner, state: 0, area: r * r * 1.2, coins: 70 + level * 30, spd: 4.4 + level * 0.5, cool: 1.0, mode: 'chase', rec: 0, ph: 0, vx: 0, vz: 0, talk: 3, level };
  holder.scale.setScalar(alc.sc); alc.hy = h / 2 * alc.sc; holder.position.y = alc.hy;
  toast('¡Llega el Alcalde Paraguas!', 'alc'); say('alc', ALC_LINES[0], 2300); AU.swish();
}
function buildWorld(seed) {
  clearWorld(); G.seed = seed;
  const w = generate(seed);
  for (const d of w.objs) addProp(d);
  for (const d of w.rebels) addRebel(d);
  for (const d of w.pickups) addPickup(d);
}

// ---------- tragar ----------
function removeFromGrid(o) { if (o.cell == null) return; const l = grid.get(o.cell); if (l) { const i = l.indexOf(o); if (i >= 0) { l[i] = l[l.length - 1]; l.pop(); } } o.cell = null; }
const SPARK = [0xffd23f, 0xff74c4, 0x3fe0b0, 0x4aa8ff, 0xff6b5e, 0xffffff];
function swallow(o) {
  o.state = 2; removeFromGrid(o); if (o.mesh) o.mesh.matrixAutoUpdate = true; if (o.fm) { o.fm.m.opacity = 1; }
  const dx = o.x - G.px, dz = o.z - G.pz, rho = Math.hypot(dx, dz);
  o.sw = { t: 0, T: 1.05 + 0.32 * Math.sqrt(o.r) + (o.tier >= 4 ? 0.4 : 0), ang: Math.atan2(dz, dx), rho, rho0: rho, wx: (rnd() < 0.5 ? -1 : 1) * (3 + rnd() * 5), wy: (rnd() - 0.5) * 8, wz: (rnd() < 0.5 ? -1 : 1) * (3 + rnd() * 5), sp: 0 };
  sucked.push(o);
  // puntos, monedas, combo
  if (G.mode === 'play') { G.combo++; G.comboT = COMBO_WIN; G.bestCombo = Math.max(G.bestCombo, G.combo); }
  const cm = 1 + Math.min(G.combo, 40) * 0.025;
  const pts = Math.round((10 + o.area * 14) * (1 + Math.min(10, Math.floor(G.combo / 5)) * 0.2));
  const coins = Math.max(1, Math.round(o.coins * lootMul() * cm));
  const real = G.mode === 'play';
  if (real) { G.score += pts; G.coins += coins; save.coins += coins; G.swallowed++; if (o.kind === 'wardrobe') G.maxTier = Math.max(G.maxTier, 4); else if (o.kind === 'skyscraper') G.maxTier = 5; else G.maxTier = Math.max(G.maxTier, o.tier); }
  const before = G.A; G.A = Math.min(R_MAX * R_MAX, G.A + GROW_K * o.area / (1 + G.A / 70)); G.R = Math.sqrt(G.A);
  hud.dirty = true;
  // feedback
  const big = o.tier >= 2 || o.rebel || o.alc;
  AU.pop(G.combo, o.tier); if (o.coins >= 8) AU.coin();
  const n = Math.min(26, 5 + Math.floor(o.r * 4)); parts.burst(o.x, o.hy * 0.8 + 0.3, o.z, n, { color: SPARK, speed: 3 + o.r * 1.4, size: 0.28 + o.r * 0.1, life: 0.8, shape: 1, g: 6, up: 2 });
  if (big) { G.shake = Math.max(G.shake, Math.min(0.9, 0.12 + o.r * 0.1)); parts.burst(o.x, 0.3, o.z, 8 + Math.min(18, o.r * 4), { color: [0xfff0d2, 0xffd9ec, 0xffffff], speed: 2 + o.r, size: 0.9 + o.r * 0.3, size1: 2 + o.r * 0.8, life: 0.8, shape: 4, g: -0.5, alpha: 0.55, flat: true, up: 0.6 }); rings.spawn(o.x, o.z, o.r * 0.5, o.r * 1.8 + 1, 0xffffff, 0.5, 0.7, 0.4); }
  if (real && (o.tier >= 3 || o.rebel)) popText('+' + fmt(pts), o.x, o.hy * 2 + 1, o.z, o.tier >= 4 ? 'big' : '');
  if (real && G.combo >= 3) { const c = $('combo'); c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); }
  if (o.rebel && real) { G.rebels++; popText('¡Sofá atrapado!', o.x, o.hy * 2 + 3, o.z, 'big'); toast('¡Sofá atrapado!', ''); G.shake = 0.6; say('dona', '¡Quieto ahí, sofá!', 1500); AU.sofaScream(); }
  if (o.alc && real) { G.alcaldes++; toast('¡Alcalde fuera!', 'alc'); say('alc', '¡Aaay, mi paraguas!', 1700); G.shake = 1; flash('good'); AU.roundEnd(true); alc = null; alcTimer = 13; alcLevel++; AU.levelUp(3); }
  if (o.kind === 'skyscraper' && real) { toast('¡Rascacielos!', ''); G.shake = 1.1; flash('good'); }
  checkLevel();
}
function checkLevel() {
  const L = 1 + Math.floor(Math.log(G.R / G.A0 ** 0.5) / Math.log(1.32) + 1e-6);
  if (L > G.lvl && G.mode === 'play') {
    G.lvl = L; G.kick = 1; G.twirl = 6.28 * 2; G.shake = Math.max(G.shake, 0.55);
    toast(L >= 7 ? '¡GIGANTE!' : '¡MÁS GRANDE!'); AU.levelUp(L); rings.spawn(G.px, G.pz, G.Rv, G.Rv * 3.2, 0xff74c4, 0.8, 0.9); rings.spawn(G.px, G.pz, G.Rv * 0.6, G.Rv * 2.4, 0xffd23f, 0.6, 0.9);
    parts.burst(G.px, 1.2 * G.Rv, G.pz, 36, { color: SPARK, speed: 6 + G.Rv, size: 0.5 + 0.1 * G.Rv, life: 1.1, shape: 1, g: 4, up: 3 });
    if (rnd() < 0.8) { const l = DONA_LINES[(rnd() * DONA_LINES.length) | 0]; say('dona', l, 1700); if (L % 2 === 0) AU.speak(l); }
    hud.dirty = true;
  } else if (L > G.lvl) G.lvl = L;
}

// ---------- entrada ----------
const joy = { on: false, id: -1, bx: 0, by: 0, dx: 0, dy: 0, mag: 0 };
const keys = {};
const MAXR = 58;
function joyShow(on) { $('joy').classList.toggle('on', on); }
canvas.addEventListener('pointerdown', (e) => {
  AU.init(); if (G.mode !== 'play' && G.mode !== 'count') return; if (joy.on) return;
  joy.on = true; joy.id = e.pointerId; joy.bx = e.clientX; joy.by = e.clientY; joy.dx = joy.dy = joy.mag = 0; canvas.setPointerCapture(e.pointerId);
  const b = $('joyBase'), k = $('joyKnob'); b.style.left = k.style.left = e.clientX + 'px'; b.style.top = k.style.top = e.clientY + 'px'; joyShow(true);
});
canvas.addEventListener('pointermove', (e) => {
  if (!joy.on || e.pointerId !== joy.id) return;
  let dx = e.clientX - joy.bx, dy = e.clientY - joy.by, l = Math.hypot(dx, dy);
  if (l > MAXR) { const ex = l - MAXR; joy.bx += dx / l * ex; joy.by += dy / l * ex; dx = e.clientX - joy.bx; dy = e.clientY - joy.by; l = MAXR; $('joyBase').style.left = joy.bx + 'px'; $('joyBase').style.top = joy.by + 'px'; }
  joy.dx = dx / MAXR; joy.dy = dy / MAXR; joy.mag = Math.min(1, l / MAXR);
  const k = $('joyKnob'); k.style.left = (joy.bx + dx) + 'px'; k.style.top = (joy.by + dy) + 'px';
});
const joyEnd = (e) => { if (e.pointerId !== joy.id) return; joy.on = false; joy.dx = joy.dy = joy.mag = 0; joyShow(false); };
canvas.addEventListener('pointerup', joyEnd); canvas.addEventListener('pointercancel', joyEnd); canvas.addEventListener('lostpointercapture', joyEnd);
window.addEventListener('keydown', (e) => { keys[e.code] = true; if (e.code === 'Escape' || e.code === 'KeyP') { if (G.mode === 'play') pauseGame(); else if (G.mode === 'pause') resumeGame(); } AU.init(); });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
document.addEventListener('visibilitychange', () => { if (document.hidden && G.mode === 'play') pauseGame(); });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
function inputVec() {
  if (G.bot || G.mode === 'menu') { const b = botDir(); return b; }
  let x = 0, z = 0, m = 0;
  if (joy.on && joy.mag > 0.1) { const mm = (joy.mag - 0.1) / 0.9; const l = Math.hypot(joy.dx, joy.dy) || 1; x = joy.dx / l; z = joy.dy / l; m = Math.pow(mm, 0.8); }
  const kx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0), kz = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
  if (kx || kz) { const l = Math.hypot(kx, kz); x = kx / l; z = kz / l; m = 1; }
  return { x, z, m };
}
// IA de demostración (también sirve para probar el juego solo)
let botT = 0, botTarget = null;
function botDir() {
  botT -= 0.016; const R = G.R;
  if (botT <= 0 || !botTarget || botTarget.state !== 0) {
    botT = 0.25; let best = -1, bt = null;
    const consider = (o, bonus = 1) => { if (o.state !== 0 || o.r > R * GATE * 0.97) return; const d = Math.hypot(o.x - G.px, o.z - G.pz); const sc = (o.area + 0.6) * bonus / Math.pow(d + 4, 1.5); if (sc > best) { best = sc; bt = o; } };
    const rc = cellOf(G.px), rz = cellOf(G.pz), span = Math.ceil((22 + R * 2) / 8);
    for (let a = rc - span; a <= rc + span; a++) for (let b = rz - span; b <= rz + span; b++) { const l = grid.get(gkey(a, b)); if (l) for (const o of l) consider(o); }
    for (const m of movers) consider(m, 2);
    for (const p of pickups) if (p.on) { const d = Math.hypot(p.x - G.px, p.z - G.pz); const sc = (p.type === 'clock' ? 3 : 0.8) / Math.pow(d + 4, 1.5); if (sc > best) { best = sc; bt = p; } }
    if (!bt) for (const o of props) consider(o);
    botTarget = bt;
  }
  let tx, tz; if (botTarget) { tx = botTarget.x - G.px; tz = botTarget.z - G.pz; } else { tx = -G.px * 0.02 + Math.sin(G.t * 0.5); tz = -G.pz * 0.02 + Math.cos(G.t * 0.4); }
  let l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
  if (alc && !alc.alcSafe && alc.r > R * GATE) { const ax = G.px - alc.x, az = G.pz - alc.z, ad = Math.hypot(ax, az); if (ad < 7 + R * 0.6) { const w = (7 + R * 0.6 - ad) / (7 + R * 0.6) * 1.2; tx += ax / ad * w; tz += az / ad * w; l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l; } }
  return { x: tx, z: tz, m: 0.85 };
}

// ---------- actualización ----------
const hud = { dirty: true, coins: -1, time: -1, lvl: -1, score: -1, prog: -1, combo: -1 };
function step(dt) {
  G.t += dt; frameNo++;
  const play = G.mode === 'play', demo = G.mode === 'menu';
  const active = play || demo || G.mode === 'count' || G.mode === 'results' || G.mode === 'shop' || G.mode === 'ending';
  // radio visual suave
  G.Rv += (G.R - G.Rv) * Math.min(1, dt * 7); G.kick = Math.max(0, G.kick - dt * 2.2); G.shake = Math.max(0, G.shake - dt * 1.8); G.shout = Math.max(0, G.shout - dt);
  G.twirl = Math.max(0, G.twirl - dt * 14);
  const R = G.Rv;
  if (play) {
    G.time -= dt; G.inv = Math.max(0, G.inv - dt); G.slow = Math.max(0, G.slow - dt);
    if (G.time <= 0) endRound();
    else if (G.time < 10.5 && Math.ceil(G.time) !== G.lastTick) { G.lastTick = Math.ceil(G.time); AU.tick(G.time < 5); }
    if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) { G.combo = 0; hud.dirty = true; } }
    if (!alc && alcTimer <= 0 && G.alcSpawned !== true && G.t - G.startT > 10) { G.alcSpawned = true; spawnAlcalde(0); }
    if (G.alcSpawned && !alc) { alcTimer -= dt; if (alcTimer <= 0 && G.time > 12) spawnAlcalde(alcLevel); }
    G.bubbleT -= dt; if (G.bubbleT <= 0) { G.bubbleT = 9 + rnd() * 7; if (G.mode === 'play') { const l = DONA_LINES[(rnd() * DONA_LINES.length) | 0]; say('dona', l, 1600); G.shout = 0.6; } }
  }
  if (G.mode === 'count') { G.intro = Math.max(0, G.intro - dt * 0.9); }
  // movimiento
  if (active) {
    let iv = { x: 0, z: 0, m: 0 }; if (play || demo || G.bot) iv = inputVec();
    if (G.mode === 'count') iv = { x: 0, z: 0, m: 0 };
    const live = play || demo;
    const spd = (6.4 + 0.9 * G.R) * speedMul() * (G.slow > 0 ? 0.55 : 1) * (demo && G.mode !== 'play' ? 0.9 : 1);
    const tvx = iv.x * iv.m * spd, tvz = iv.z * iv.m * spd, a = Math.min(1, dt * (iv.m > 0 ? 9 : 6));
    G.vx += (tvx - G.vx) * a; G.vz += (tvz - G.vz) * a;
    G.kx *= Math.exp(-dt * 4); G.kz *= Math.exp(-dt * 4);
    G.px = clamp(G.px + (G.vx + G.kx) * dt, -BOUND, BOUND); G.pz = clamp(G.pz + (G.vz + G.kz) * dt, -BOUND, BOUND);
    G.speed = Math.hypot(G.vx, G.vz);
    if (play && G.speed > 1 && G.moved < 99) G.moved += dt;
    // recoger / tragar
    const rc = cellOf(G.px), rz = cellOf(G.pz), span = Math.ceil(R * 1.6 / 8) + 1, capR = G.R * 0.98;
    for (let a = rc - span; a <= rc + span; a++) for (let b = rz - span; b <= rz + span; b++) {
      const l = grid.get(gkey(a, b)); if (!l) continue;
      for (let i = l.length - 1; i >= 0; i--) {
        const o = l[i]; if (o.r > G.R * GATE) continue;
        const dx = o.x - G.px, dz = o.z - G.pz, d = Math.hypot(dx, dz);
        if (d < capR && live) { swallow(o); continue; }
        if (d < G.R * 1.5) {
          const k = clamp(1 - (d - G.R * 0.7) / (G.R * 0.8), 0, 1), m = o.mesh; if (!m.matrixAutoUpdate) m.matrixAutoUpdate = true;
          const lean = 0.42 * k, ux = dx / (d || 1), uz = dz / (d || 1), sh = Math.sin(G.t * 38 + o.id * 7) * 0.05 * k;
          m.rotation.set(-uz * lean * -1 + sh, o.rot, -ux * lean + sh); m.position.y = o.hy + k * 0.25 * Math.min(1, o.r);
          if (o.wf < 0) wobbling.push(o); o.wf = frameNo;
        }
      }
    }
    for (let i = wobbling.length - 1; i >= 0; i--) { const o = wobbling[i]; if (o.wf !== frameNo) { if (o.state === 0) { o.mesh.rotation.set(0, o.rot, 0); o.mesh.position.y = o.hy; o.mesh.updateMatrix(); } o.wf = -1; wobbling[i] = wobbling[wobbling.length - 1]; wobbling.pop(); } }
    for (const p of pickups) {
      if (!p.on) continue; p.mesh.rotation.y += dt * 3; p.mesh.position.y = (p.type === 'coin' ? 1.1 : 1.5) + Math.sin(G.t * 3 + p.ph) * 0.18;
      const d = Math.hypot(p.x - G.px, p.z - G.pz);
      if (d < G.R + 1.0 && live) { p.on = false; p.state = 1; worldGroup.remove(p.mesh); collectPickup(p); }
    }
    // rebeldes
    for (const m of movers) updateRebel(m, dt, live);
    if (alc) updateAlcalde(alc, dt, play);
  }
  // objetos tragados
  for (let i = sucked.length - 1; i >= 0; i--) { const o = sucked[i]; if (updateSucked(o, dt, R)) { sucked[i] = sucked[sucked.length - 1]; sucked.pop(); } }
  // demo: reiniciar mundo si ya es enorme
  if (demo) { G.demoT += dt; if (G.R > 3.6 || G.demoT > 55) resetDemo(); }
  // efectos
  updateFx(dt);
  updateHud();
}
function collectPickup(p) {
  const y = 1.5; if (G.mode !== 'play') { parts.burst(p.x, y, p.z, 8, { color: [0xffd23f, 0xfff0a0], speed: 3, size: 0.4, life: 0.6, shape: 2, g: 8, up: 3 }); return; }
  if (p.type === 'coin') { const c = Math.round(2 * lootMul()); G.coins += c; save.coins += c; AU.coin(); parts.burst(p.x, y, p.z, 10, { color: [0xffd23f, 0xfff0a0], speed: 4, size: 0.5, life: 0.7, shape: 2, g: 8, up: 4 }); popText('+' + c, p.x, y + 1, p.z, 'coinp'); }
  else { G.time = Math.min(G.time + 6, G.dur + 20); AU.clockBonus(); parts.burst(p.x, y, p.z, 18, { color: [0x9fe8ff, 0xffffff, 0x4aa8ff], speed: 5, size: 0.5, life: 0.9, shape: 3, g: 3, up: 4 }); popText('+6 s', p.x, y + 1, p.z, 'timep'); toast('¡+6 segundos!', ''); rings.spawn(p.x, p.z, 0.5, 4, 0x9fe8ff, 0.6, 0.9); }
  hud.dirty = true;
}
function updateSucked(o, dt, R) {
  const s = o.sw; s.t += dt; const u = Math.min(1, s.t / s.T), H = 3.6 * R;
  const e = u * u * (3 - 2 * u) * 0.55 + u * 0.45;
  const y0 = o.hy, y = y0 * (1 - u * 0.6) + (H * 0.88) * e * (o.tier >= 4 ? 0.75 : 1);
  const fr = R * (0.5 + 1.0 * Math.min(1, y / H)), target = Math.max(0.25, fr * 0.8 - o.r * 0.3);
  s.rho += (target - s.rho) * Math.min(1, dt * (2.5 + u * 6));
  s.ang += (5 + 11 / (1 + s.rho * 0.35 / Math.max(0.8, R * 0.6))) / (1 + o.r * 0.08) * dt;
  const sc = o.sc * (u < 0.4 ? 1 : 1 - Math.pow((u - 0.4) / 0.6, 1.6) * 0.93);
  o.x = G.px + Math.cos(s.ang) * s.rho; o.z = G.pz + Math.sin(s.ang) * s.rho;
  const m = o.mesh; m.position.set(o.x, y, o.z); m.rotation.x += s.wx * dt; m.rotation.y += s.wy * dt; m.rotation.z += s.wz * dt; m.scale.setScalar(sc);
  if (o.inner) { animLegs(o, dt * 4, 1); }
  s.sp -= dt; if (s.sp <= 0 && o.tier >= 1) { s.sp = 0.07; parts.emit({ x: o.x, y, z: o.z, vx: (rnd() - 0.5) * 2, vy: rnd() * 2, vz: (rnd() - 0.5) * 2, life: 0.5, size: 0.3 * Math.min(2.5, 0.5 + o.r * 0.3), size1: 0, color: SPARK[(rnd() * 6) | 0], shape: 3, g: 0, drag: 2 }); }
  if (u >= 1) { worldGroup.remove(o.mesh); o.state = 3; if (o.tier >= 1) parts.burst(G.px, H * 0.85, G.pz, 6, { color: SPARK, speed: 2, size: 0.35, life: 0.6, shape: 1, g: 2 }); return true; }
  return false;
}
function animLegs(o, dt, speed) {
  o.ph += dt * (6 + speed * 9); const L = o.inner.userData.legs; if (!L) return;
  for (let i = 0; i < 4; i++) L[i].rotation.x = Math.sin(o.ph + (i % 2 ? Math.PI : 0) + (i > 1 ? 1.5 : 0)) * 0.9 * Math.min(1, speed + 0.2);
}
function updateRebel(o, dt, live) {
  if (o.state !== 0) return;
  const dx = o.x - G.px, dz = o.z - G.pz, d = Math.hypot(dx, dz) || 1, panic = 12 + G.R * 1.4;
  let tx = 0, tz = 0, sp = 0;
  if (live && d < panic) { tx = dx / d; tz = dz / d; sp = 5.2 + 0.18 * G.lvl + (1 - d / panic) * 1.8; if (o.scream <= 0) { o.scream = 1.3; AU.sofaScream(); } if (rnd() < dt * 4) parts.emit({ x: o.x + (rnd() - 0.5) * 2, y: 3.2, z: o.z, vx: (rnd() - 0.5) * 2, vy: 2 + rnd() * 2, vz: (rnd() - 0.5), life: 0.5, size: 0.3, size1: 0.12, color: 0x7fd6ff, g: 8, shape: 0 }); }
  else { o.wander -= dt; if (o.wander <= 0) { o.wander = 1.5 + rnd() * 3; const a = rnd() * 6.28, still = rnd() < 0.5; o.wdx = still ? 0 : Math.cos(a); o.wdz = still ? 0 : Math.sin(a); } tx = o.wdx; tz = o.wdz; sp = 1.6; }
  o.scream -= dt;
  // si está en una pared y el torbellino empuja hacia ella, resbala por la pared
  const nx = clamp(o.x + tx * sp * dt, -BOUND + 1.5, BOUND - 1.5), nz = clamp(o.z + tz * sp * dt, -BOUND + 1.5, BOUND - 1.5);
  const moved = Math.hypot(nx - o.x, nz - o.z) / dt; o.x = nx; o.z = nz;
  if (moved > 0.3) o.face = Math.atan2(tx, tz);
  const target = o.face, da = Math.atan2(Math.sin(target - o.rot), Math.cos(target - o.rot)); o.rot = (o.rot || 0) + da * Math.min(1, dt * 8);
  animLegs(o, dt, moved / 6);
  const m = o.mesh; m.position.set(o.x, o.hy + Math.abs(Math.sin(o.ph)) * 0.35 * Math.min(1, moved / 4), o.z); m.rotation.set(0, 0, 0); m.rotation.y = o.rot * 0.0; m.rotation.y = o.rot;
  // los ojos miran al torbellino: gira el cuerpo hacia "cara al peligro" al huir
  const dd = Math.hypot(o.x - G.px, o.z - G.pz);
  o.inner.userData.eyes.position.x = clamp((G.px - o.x) / (dd + 1), -1, 1) * 0.25;
  if (live && o.r <= G.R * GATE && dd < G.R * 0.98) swallow(o);
}
function updateAlcalde(a, dt, live) {
  if (a.state !== 0) return;
  const dx = G.px - a.x, dz = G.pz - a.z, d = Math.hypot(dx, dz) || 1, edible = a.r <= G.R * GATE;
  a.cool -= dt; a.rec -= dt; a.talk -= dt; a.ph += dt * 10;
  let tx, tz, sp;
  if (edible) { tx = -dx / d; tz = -dz / d; sp = a.spd * 1.15; if (a.talk <= 0) { a.talk = 3; say('alc', '¡Socorro! ¡Me voy de vacaciones!', 1400); } }
  else if (a.rec > 0) { tx = -dx / d; tz = -dz / d; sp = a.spd * 0.7; }
  else { tx = dx / d; tz = dz / d; sp = a.spd; if (a.talk <= 0 && d < 28) { a.talk = 6 + rnd() * 4; say('alc', ALC_LINES[(1 + rnd() * (ALC_LINES.length - 1)) | 0], 1600); } }
  const nx = clamp(a.x + tx * sp * dt, -BOUND + 1.5, BOUND - 1.5), nz = clamp(a.z + tz * sp * dt, -BOUND + 1.5, BOUND - 1.5); const mv = Math.hypot(nx - a.x, nz - a.z) / dt; a.x = nx; a.z = nz;
  const m = a.mesh; const hop = Math.abs(Math.sin(a.ph)) * 0.45 * Math.min(1, mv / 3);
  const face = Math.atan2(tx, tz); const da = Math.atan2(Math.sin(face - (a.rot || 0)), Math.cos(face - (a.rot || 0))); a.rot = (a.rot || 0) + da * Math.min(1, dt * 6);
  m.position.set(a.x, a.hy + hop, a.z); m.rotation.set(Math.sin(a.ph) * 0.05, a.rot, Math.sin(a.ph * 0.5) * 0.08);
  const ar = a.inner.userData.arms; ar[0].rotation.z = 2.2 + Math.sin(a.ph) * 0.5; ar[1].rotation.z = -2.2 - Math.sin(a.ph + 1) * 0.5;
  a.inner.userData.cano.scale.setScalar(1 + (a.cool > 0 && a.cool < 0.7 ? Math.sin(a.cool * 30) * 0.05 : 0));
  if (!live) return;
  if (edible && d < G.R * 0.98) { swallow(a); return; }
  if (!edible && d < G.R * 0.9 + 1.7 && a.cool <= 0 && G.inv <= 0) alcalde_hit(a, dx / d, dz / d);
}
function alcalde_hit(a, nx, nz) {
  a.cool = 2.8; a.rec = 1.4; G.inv = 2.0; G.slow = 1.3; G.hits++;
  G.kx = nx * 20; G.kz = nz * 20; G.shake = 1; G.combo = 0; G.comboT = 0;
  const loss = 0.09 * (G.A - G.A0); G.A = Math.max(G.A0, G.A - loss); G.R = Math.sqrt(G.A);
  AU.hit(); flash(); say('alc', '¡MULTA! ¡Por soplona!', 1600); toast('¡Multa!', 'warn'); say('dona', '¡Ay, mi paraguas!'.replace('mi paraguas', 'qué agravio'), 1200);
  parts.burst(G.px, 1.5, G.pz, 20, { color: [0x7b3fe4, 0xffd23f, 0xffffff], speed: 6, size: 0.45, life: 0.8, shape: 1, g: 6, up: 3 }); rings.spawn(G.px, G.pz, G.Rv, G.Rv * 2.8, 0xff3d6e, 0.5, 0.9);
  hud.dirty = true;
}
function resetDemo() { G.demoT = 0; buildWorld((rnd() * 1e9) | 0); G.px = SPAWN.x; G.pz = SPAWN.z; G.A0 = G.A = 0.81; G.R = 0.9; G.Rv = 0.9; G.vx = G.vz = G.kx = G.kz = 0; botTarget = null; alc = null; flash('good'); }


// ---------- los edificios que tapan al torbellino se vuelven transparentes ----------
const fadePool = []; for (let i = 0; i < 28; i++) { const m = propMaterial.clone(); m.transparent = true; m.opacity = 1; fadePool.push({ m, used: false }); }
let fading = [];
function updateOcclusion(dt) {
  const R = G.Rv, cx = camera.position.x, cy = camera.position.y, cz = camera.position.z, px = G.px, pz = G.pz;
  const den = cz - pz; if (den < 1) return;
  const x0 = cellOf(px - (R * 1.8 + 22)), x1 = cellOf(px + (R * 1.8 + 22)), z0 = cellOf(pz - R * 1.2), z1 = cellOf(cz + 4);
  for (let a = x0; a <= x1; a++) for (let b = z0; b <= z1; b++) {
    const l = grid.get(gkey(a, b)); if (!l) continue;
    for (const o of l) {
      const top = o.hy * 2; if (top < 2.6 || o.z < pz - R * 1.2 || o.z > cz - 1) continue;
      const f = (cz - o.z) / den, lat = cx + (px - cx) * f, hw = R * 1.7 * f + o.hw + 0.5 + (1 - f) * den * 0.33;
      if (Math.abs(o.x - lat) > hw) continue;
      const yRay = cy + (R * 1.6 - cy) * f; if (top < yRay - R * 1.4) continue;
      if (!o.fm) { const slot = fadePool.find((s) => !s.used); if (!slot) continue; slot.used = true; o.fm = slot; o.fade = 1; o.mesh.material = slot.m; fading.push(o); }
      o.of = frameNo;
    }
  }
  for (let i = fading.length - 1; i >= 0; i--) {
    const o = fading[i], tgt = o.of === frameNo ? 0.16 : 1; o.fade += (tgt - o.fade) * Math.min(1, dt * 9); o.fm.m.opacity = o.fade;
    if (tgt === 1 && o.fade > 0.97 || o.state !== 0) { o.mesh.material = propMaterial; o.fm.used = false; o.fm.m.opacity = 1; o.fm = null; fading[i] = fading[fading.length - 1]; fading.pop(); }
  }
}

// ---------- efectos / cámara ----------
const camT = new THREE.Vector3(SPAWN.x, 0, SPAWN.z); let camDist = 20;
function updateFx(dt) {
  const R = G.Rv, t = G.t;
  // torbellino y Doña
  const pulse = 1 + G.kick * 0.18 + Math.sin(t * 9) * 0.012;
  tornado.update(t, R, G.px, 0, G.pz, { x: G.vz * 0.02, z: -G.vx * 0.02 }, pulse);
  const ds = R * 1.18 * (1 + G.kick * 0.1);
  dona.scale.setScalar(ds); dona.position.set(G.px, 0.12 * ds + Math.abs(Math.sin(t * 6)) * 0.06 * ds, G.pz);
  dona.rotation.set(G.vz * 0.012, clamp(G.vx * 0.045, -0.5, 0.5) + G.twirl, -G.vx * 0.014);
  const ud = dona.userData, sw = Math.sin(t * 9);
  ud.arms[1].rotation.z = -(2.35 + sw * 0.55 + (G.shout > 0 ? 0.35 : 0)); ud.arms[0].rotation.z = 2.35 - sw * 0.5 + 0.2; ud.arms[1].rotation.x = Math.cos(t * 9) * 0.3; ud.arms[0].rotation.x = -Math.cos(t * 9) * 0.25;
  ud.head.rotation.z = Math.sin(t * 4.5) * 0.06; ud.head.position.y = 1.36 + Math.abs(sw) * 0.03;
  ud.mouth.scale.set(1, G.shout > 0 || G.combo > 3 ? 1.4 + Math.sin(t * 25) * 0.25 : 0.85 + Math.sin(t * 3) * 0.1, 1);
  // polvo del suelo
  if (G.speed > 2 && (G.mode === 'play' || G.mode === 'menu')) {
    const n = Math.min(3, 1 + (G.speed / 9) | 0);
    for (let i = 0; i < n; i++) { const a = rnd() * 6.28; parts.emit({ x: G.px + Math.cos(a) * R * 0.9, y: 0.25, z: G.pz + Math.sin(a) * R * 0.9, vx: -G.vx * 0.15 + Math.cos(a + 1.57) * R * 1.2, vy: 0.4 + rnd() * 0.8, vz: -G.vz * 0.15 + Math.sin(a + 1.57) * R * 1.2, life: 0.6 + rnd() * 0.3, size: 0.5 * R + 0.2, size1: 1.7 * R + 0.5, color: 0xfff0e0, alpha: 0.35, shape: 4, g: -0.3, drag: 1.5 }); }
  }
  if (rnd() < dt * 20) { const a = rnd() * 6.28, rr = R * (0.6 + rnd() * 0.5); parts.emit({ x: G.px + Math.cos(a) * rr, y: 0.3, z: G.pz + Math.sin(a) * rr, vx: Math.cos(a + 1.57) * R * 2.2, vy: 1.2 * R + rnd() * R, vz: Math.sin(a + 1.57) * R * 2.2, life: 0.9, size: 0.18 * R + 0.1, size1: 0.02, color: SPARK[(rnd() * 6) | 0], shape: 3, g: 0, drag: 0.8 }); }
  parts.update(dt); rings.update(dt);
  AU.setWhoosh(G.mode === 'play' ? clamp(G.speed / 16, 0.1, 1) : 0.0, Math.max(1, R));
  // cámara
  const pf = camera.aspect < 1 ? 1 + (1 - camera.aspect) * 0.55 : 1;
  const menuZ = (G.mode === 'menu' || G.mode === 'results' || G.mode === 'shop') ? 0.66 : 1; G.mz = G.mz == null ? menuZ : G.mz + (menuZ - G.mz) * Math.min(1, dt * 2.5);
  const intro = G.intro, zoom = (G.mz + intro * 0.9 + G.kick * 0.1) * pf;
  camT.x += (G.px + G.vx * 0.22 - camT.x) * Math.min(1, dt * 6); camT.z += (G.pz + G.vz * 0.22 - camT.z) * Math.min(1, dt * 6);
  const d = (8.2 + R * 3.1) * zoom, h = (8.2 + R * 4.1) * zoom;
  camDist += (d - camDist) * Math.min(1, dt * 4);
  const sk = G.shake * G.shake * (0.35 + 0.18 * R); const sx = (rnd() - 0.5) * sk, sy = (rnd() - 0.5) * sk, sz = (rnd() - 0.5) * sk;
  const k = camDist / d;
  camera.position.set(camT.x + sx, h * k + sy, camT.z + d * k + sz);
  camera.lookAt(camT.x + sx * 0.5, R * 0.9, camT.z - R * 1.0 - 1.2);
  updateOcclusion(dt);
  // luz y sombras
  const E = 16 + R * 7.2; sun.target.position.set(camT.x, 0, camT.z); sun.position.copy(sun.target.position).add(SUN_OFF);
  const sc = sun.shadow.camera; if (Math.abs(sc.right - E) > 0.5) { sc.left = -E; sc.right = E; sc.top = E; sc.bottom = -E; sc.updateProjectionMatrix(); }
  scene.fog.near = camDist * 2.2; scene.fog.far = camDist * 7 + 80;
  // globos de texto
  placeBubble($('bDona'), G.px, 2.5 * R * 1.18 + 0.2 * R, G.pz);
  if (alc) placeBubble($('bAlc'), alc.x, alc.hy * 2 + 0.4, alc.z);
  // indicador del alcalde
  const ind = $('alcInd');
  if (alc && G.mode === 'play') {
    const p = toScreen(alc.x, alc.hy, alc.z), W = window.innerWidth, Hh = window.innerHeight; const off = p.behind || p.x < 20 || p.x > W - 20 || p.y < 100 || p.y > Hh - 20;
    if (off && alc.r > G.R * GATE) {
      let cx = W / 2, cy = Hh / 2, vx = p.x - cx, vy = p.y - cy; if (p.behind) { vx = -vx; vy = -vy; }
      const sx2 = (W / 2 - 46) / Math.abs(vx || 1e-3), sy2 = (Hh / 2 - 90) / Math.abs(vy || 1e-3), s2 = Math.min(sx2, sy2);
      ind.style.display = 'flex'; ind.style.left = (cx + vx * s2) + 'px'; ind.style.top = (cy + vy * s2 + 20) + 'px'; ind.style.setProperty('--rot', (Math.atan2(vy, vx) * 180 / Math.PI + 90) + 'deg');
    } else ind.style.display = 'none';
  } else ind.style.display = 'none';
}
function placeBubble(b, x, y, z) { if (!b.classList.contains('on')) return; const p = toScreen(x, y, z); b.style.left = clamp(p.x, 100, window.innerWidth - 100) + 'px'; b.style.top = clamp(p.y, 130, window.innerHeight - 60) + 'px'; }

// ---------- HUD ----------
function updateHud() {
  if (G.mode !== 'play' && G.mode !== 'count') return;
  const coins = save.coins; if (coins !== hud.coins) { hud.coins = coins; const e = $('hCoins'); e.textContent = fmt(coins); }
  const tm = Math.max(0, Math.ceil(G.time)); if (tm !== hud.time) { hud.time = tm; $('hTime').textContent = Math.floor(tm / 60) + ':' + String(tm % 60).padStart(2, '0'); $('timer').classList.toggle('warn', tm <= 10); }
  if (G.lvl !== hud.lvl) { hud.lvl = G.lvl; $('hLvl').textContent = 'Nivel ' + G.lvl; }
  const sc = Math.round(G.score); if (sc !== hud.score) { hud.score = sc; $('hScore').textContent = fmt(sc); }
  const prog = clamp(Math.log(G.R / Math.sqrt(G.A0)) / Math.log(1.32) % 1, 0, 1); const pq = Math.round(prog * 100); if (pq !== hud.prog) { hud.prog = pq; $('hLvlBar').style.width = pq + '%'; }
  const c = $('combo'); if (G.combo >= 3) { c.classList.add('on'); if (G.combo !== hud.combo) { hud.combo = G.combo; $('hComboN').textContent = 'x' + G.combo; } $('hComboBar').style.width = (G.comboT / COMBO_WIN * 100) + '%'; } else { c.classList.remove('on'); hud.combo = -1; }
  // pistas
  const hint = $('hint');
  if (!save.tut && G.mode === 'play') {
    if (G.moved < 1.2) { hint.textContent = 'Arrastra el dedo para mover el torbellino'; hint.classList.add('on'); }
    else if (G.t - G.startT < 12) { hint.textContent = 'Traga lo pequeño para crecer'; hint.classList.add('on'); }
    else { hint.classList.remove('on'); save.tut = true; persist(); }
  } else hint.classList.remove('on');
}

// ---------- flujo de pantallas ----------
const scr = ['sTitle', 'sHelp', 'sCount', 'sPause', 'sResults', 'sShop'];
function show(id) { for (const s of scr) $(s).classList.toggle('hidden', s !== id); }
function hideAll() { show(null); }
function refreshTitle() { $('tCoins').textContent = fmt(save.coins); $('tBest').textContent = fmt(save.best); $('bSfx').classList.toggle('off', !AU.S.sfxOn); $('bMus').classList.toggle('off', !AU.S.musicOn); }
function toMenu() {
  G.mode = 'menu'; $('hud').classList.remove('on'); joyShow(false); joy.on = false; G.intro = 0; G.combo = 0; G.comboT = 0; G.slow = 0;
  $('combo').classList.remove('on'); $('alcInd').style.display = 'none'; resetDemo(); G.A0 = G.A = 0.81; G.R = G.Rv = 0.9; show('sTitle'); refreshTitle(); AU.setMusicMode('menu');
}
function startRound() {
  AU.init(); AU.startMusic('game'); AU.setMusicMode('game'); AU.click();
  buildWorld((Math.random() * 1e9) | 0); alc = null; alcTimer = 0; alcLevel = 0; botTarget = null;
  const r0 = startR(); Object.assign(G, { mode: 'count', t: 0, startT: 0, dur: dur(save.ups.time), time: dur(save.ups.time), px: SPAWN.x, pz: SPAWN.z + 3, vx: 0, vz: 0, kx: 0, kz: 0, A0: r0 * r0, A: r0 * r0, R: r0, Rv: r0, lvl: 1, score: 0, coins: 0, swallowed: 0, combo: 0, comboT: 0, bestCombo: 0, rebels: 0, alcaldes: 0, hits: 0, maxTier: 0, slow: 0, inv: 0, shake: 0, kick: 0, intro: 1, moved: 0, bubbleT: 7, alcSpawned: false, lastTick: 0, ended: 0, countT: 0 });
  camT.set(G.px, 0, G.pz); camDist = 40;
  hud.coins = hud.time = hud.lvl = hud.score = hud.prog = hud.combo = -1; $('hud').classList.add('on'); $('bAlc').classList.remove('on'); $('bDona').classList.remove('on');
  show('sCount'); countdown(3);
}
function countdown(n) {
  if (G.mode !== 'count') return; const e = $('countN'); e.style.animation = 'none'; void e.offsetWidth; e.style.animation = '';
  if (n > 0) { e.textContent = n; AU.beep(false); setTimeout(() => countdown(n - 1), 750); }
  else { e.textContent = '¡YA!'; AU.beep(true); G.mode = 'play'; G.startT = G.t; hideAll(); toast('¡A LIMPIAR!'); say('dona', '¡A limpiar!', 1500); G.shout = 1; AU.speak('¡A limpiar!'); G.intro = 0; }
}
function endRound() {
  if (G.mode !== 'play') return; G.mode = 'ending'; joyShow(false); joy.on = false; toast('¡TIEMPO!', 'warn'); AU.roundEnd(true); $('alcInd').style.display = 'none'; $('combo').classList.remove('on');
  setTimeout(showResults, 1500);
}
function showResults() {
  save.rounds++; const goals = [
    { t: 'Tragar 50 cosas', ok: G.swallowed >= 50 }, { t: 'Atrapar un sofá o echar al Alcalde', ok: G.rebels + G.alcaldes > 0 }, { t: 'Tragar un armario-edificio', ok: G.maxTier >= 4 },
  ];
  const stars = goals.filter((g) => g.ok).length, bonus = stars * 25; G.coins += bonus; save.coins += bonus;
  const rec = Math.round(G.score) > save.best; if (rec) save.best = Math.round(G.score); persist();
  const rank = G.score < 500 ? 'Aprendiz de escoba' : G.score < 1400 ? 'Torbellino de salón' : G.score < 3000 ? 'Huracán doméstico' : G.score < 6500 ? 'Señora del Remolino' : 'Reina de Mueblópolis';
  $('rTitle').textContent = '¡Ronda terminada!'; $('rRank').textContent = rank; $('rScore').textContent = fmt(G.score); $('rRecord').classList.toggle('on', rec);
  $('rStars').innerHTML = [0, 1, 2].map((i) => `<svg class="star ${i < stars ? 'got' : ''}" viewBox="0 0 24 24"><path d="M12 2.2l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17l-5.9 3.2 1.2-6.5L2.5 9.1l6.6-.9z"/></svg>`).join('');
  [...$('rStars').children].forEach((s, i) => setTimeout(() => { s.classList.add('on'); if (i < stars) AU.coin(); }, 350 + i * 300));
  $('rGrid').innerHTML = `<div><b>${G.swallowed}</b>cosas tragadas</div><div><b>Nivel ${G.lvl}</b>tamaño final</div><div><b>x${G.bestCombo}</b>mejor combo</div><div><b>${G.rebels}</b>sofás atrapados</div>` +
    goals.map((g) => `<div style="grid-column:span 2;display:flex;justify-content:space-between;align-items:center;${g.ok ? 'background:#e3ffe8;color:#1d8a3a' : ''}"><span>${g.t}</span><b style="font-size:18px">${g.ok ? '✔' : '–'}</b></div>`).join('');
  $('rCoins').textContent = '+' + fmt(G.coins - bonus); $('rBonus').textContent = bonus ? `+${bonus} extra por las estrellas` : 'Consigue estrellas para ganar más';
  G.mode = 'results'; G.demoT = 0; show('sResults'); $('hud').classList.remove('on'); AU.setMusicMode('menu');
}
function pauseGame() { if (G.mode !== 'play') return; G.mode = 'pause'; show('sPause'); joyShow(false); joy.on = false; AU.setWhoosh(0, 1); $('bPSfx').classList.toggle('off', !AU.S.sfxOn); $('bPMus').classList.toggle('off', !AU.S.musicOn); }
function resumeGame() { if (G.mode !== 'pause') return; G.mode = 'play'; hideAll(); AU.click(); }
function renderShop() {
  $('sCoins').textContent = fmt(save.coins);
  $('upsList').innerHTML = UPS.map((u) => {
    const l = save.ups[u.id], max = l >= UPMAX, cost = upCost(l), can = save.coins >= cost;
    return `<div class="up"><div class="ic" style="background:${u.col}">${u.icon}</div><div class="tx"><b>${u.n}</b><small>${max ? 'Al máximo' : u.d(l)}</small><div class="pips">${Array.from({ length: UPMAX }, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('')}</div></div>
    <button class="btn buy ${max ? 'quit' : can ? 'go' : 'shop'}" data-up="${u.id}" ${max ? 'disabled' : ''}>${max ? 'MAX' : `<i class="coin"></i> ${cost}`}</button></div>`;
  }).join('');
}
let shopFrom = 'sTitle';
function openShop(from) { shopFrom = from; show('sShop'); renderShop(); AU.click(); }
$('upsList').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-up]'); if (!b) return; const id = b.dataset.up, l = save.ups[id], cost = upCost(l);
  if (l >= UPMAX) return; if (save.coins < cost) { AU.nope(); b.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 200 }); return; }
  save.coins -= cost; save.ups[id] = l + 1; persist(); AU.buy(); renderShop();
});
const on = (id, fn) => $(id).addEventListener('click', (e) => { AU.init(); fn(e); });
on('bPlay', startRound); on('bShop', () => openShop('sTitle')); on('bHelp', () => { show('sHelp'); AU.click(); });
on('bHelpOk', () => { show('sTitle'); AU.click(); save.tut = save.tut; });
on('bPause', pauseGame); on('bResume', resumeGame); on('bQuit', () => { AU.click(); toMenu(); });
on('bRAgain', startRound); on('bRShop', () => openShop('sResults')); on('bRMenu', () => { AU.click(); toMenu(); });
on('bSBack', () => { AU.click(); if (shopFrom === 'sResults') show('sResults'); else show('sTitle'); refreshTitle(); }); on('bSGo', startRound);
const togSfx = () => { AU.setSfx(!AU.S.sfxOn); AU.setVoice(AU.S.sfxOn); refreshTitle(); $('bPSfx').classList.toggle('off', !AU.S.sfxOn); AU.click(); };
const togMus = () => { AU.setMusic(!AU.S.musicOn); refreshTitle(); $('bPMus').classList.toggle('off', !AU.S.musicOn); AU.click(); };
on('bSfx', togSfx); on('bMus', togMus); on('bPSfx', togSfx); on('bPMus', togMus);
// música desde el primer toque
window.addEventListener('pointerdown', () => { AU.init(); AU.startMusic(G.mode === 'play' || G.mode === 'count' ? 'game' : 'menu'); }, { once: true });

// ---------- bucle ----------
let last = 0, acc = 0, fAvg = 16, slowN = 0, fastN = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (!last) last = now; let dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (G.mode !== 'pause') step(dt); else { G.t += 0; updateFx(0); }
  renderer.render(scene, camera);
  // resolución adaptativa
  fAvg = fAvg * 0.95 + dt * 1000 * 0.05;
  if (fAvg > 24) { if (++slowN > 90 && pixelRatio > 1.0) { pixelRatio = Math.max(1.0, pixelRatio * 0.88); resize(); slowN = 0; fAvg = 16; } } else slowN = 0;
  if (fAvg < 13 && pixelRatio < pixelCap) { if (++fastN > 400) { pixelRatio = Math.min(pixelCap, pixelRatio * 1.1); resize(); fastN = 0; } } else fastN = 0;
}
// API para pruebas
function advance(sec, bot) { const n = Math.round(sec * 60); const b = G.bot; if (bot !== undefined) G.bot = bot; for (let i = 0; i < n; i++) { botT -= 0; step(1 / 60); } G.bot = b; renderer.render(scene, camera); }
window.DR = { G, save, step, advance, startRound, endRound, buildWorld, swallow, get props() { return props; }, get movers() { return movers; }, get alc() { return alc; }, get sucked() { return sucked; }, get pickups() { return pickups; }, parts, renderer, scene, camera, joy, toMenu, upCost, UPS, UPMAX, get pixelRatio() { return pixelRatio; }, spawnAlcalde, resetDemo, showResults };

async function boot() {
  const lf = $('lbarFill'), lt = $('loadTxt'); const tick = (p, t) => { lf.style.width = p + '%'; if (t) lt.textContent = t; return new Promise((r) => setTimeout(r, 16)); };
  await tick(10, 'Poniendo el parqué…'); buildScenery(scene);
  await tick(30, 'Fabricando armarios…');
  const kinds = Object.keys(KINDS); let i = 0;
  for (const k of kinds) { for (let v = 0; v < Math.min(KINDS[k].nv, 8); v++) getGeo(k, v); i++; if (i % 6 === 0) await tick(30 + (i / kinds.length) * 40); }
  await tick(75, 'Barriendo Mueblópolis…'); buildWorld((Math.random() * 1e9) | 0);
  await tick(88, 'Peinando a Doña Remolina…'); resetDemo(); G.Rv = G.R = 0.9;
  renderer.compile(scene, camera); step(0.016); renderer.render(scene, camera);
  await tick(100, '¡Lista!'); toMenu(); G.demoT = 0;
  setTimeout(() => $('loading').classList.add('out'), 200); setTimeout(() => $('loading').remove(), 900);
  requestAnimationFrame(frame);
}
boot();
