// Doña Remolina — juego 3D móvil (Three.js). Todo el código y el arte son originales.
import * as THREE from 'three';
import * as AU from './audio.js?v=6';
import { KINDS, getGeo, propMaterial, makeAlcalde, part, PAL, setPlaceTint, clearGeoCache } from './models.js?v=6';
import './models2.js?v=6';
import './models3.js?v=6';
import { PLACES } from './places.js?v=6';
import { STATS, CHAR_UPS, UPMAX, upCost, upList, statTotals, pulsePeriod, pulseRadius } from './upgrades.js?v=6';
import { PLAYERS, PLAYER_BY_ID } from './players.js?v=6';
import { NPC } from './npcs.js?v=6';
import { makeTitle } from './title.js?v=6';
import { GB, setOutlines } from './geo.js?v=6';
import { Particles, Rings, makeTornado } from './fx.js?v=6';
import { buildScenery, disposeScenery, setDistrictStyle, generate, HALF, SPAWN, mulberry, skyTex, DISTRICTS, districtAt } from './world.js?v=6';
import { EffectComposer } from '../lib/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../lib/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../lib/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../lib/addons/postprocessing/OutputPass.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const fmt = (n) => Math.round(n).toLocaleString('es-ES');
const GATE = 0.72;            // un objeto se traga si su radio <= radio del torbellino * GATE
const GROW_K = 0.22;          // crecimiento del área por área del objeto
const R_MAX = 22, BOUND = HALF - 2;
const COMBO_WIN = 2.0;

// ---------- partida guardada (v4: mejoras por personaje + progreso por lugar) ----------
const SAVE_KEY = 'dr_save_v4', OLD_KEY = 'dr_save_v1';
const COIN_K = 0.13;          // v4: las monedas por objeto valen mucho menos
let save = { v: 4, coins: 0, best: 0, rounds: 0, tut: false, char: 'dona', owned: { dona: true }, cu: {}, pl: {}, place: 0, unlocked: 1, mig: 0 };
try {
  const s4 = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
  if (s4) { save = Object.assign(save, s4); save.owned = Object.assign({ dona: true }, s4.owned || {}); }
  else {
    const s1 = JSON.parse(localStorage.getItem(OLD_KEY) || 'null');
    if (s1) { // migración: las mejoras globales pasan a Doña (máx. nivel 4), las monedas se reducen a un tercio
      const u = Object.assign({ size: 0, time: 0, speed: 0, loot: 0 }, s1.ups || {});
      save.coins = Math.floor((s1.coins || 0) / 3); save.best = s1.best || 0; save.rounds = s1.rounds || 0; save.tut = !!s1.tut; save.owned = Object.assign({ dona: true }, s1.owned || {}); save.char = s1.char || 'dona';
      save.cu = { dona: [Math.min(4, u.size), Math.min(4, u.time), Math.min(4, u.speed), Math.min(4, u.loot)] }; save.mig = 1;
    }
  }
} catch (e) {}
if (!PLAYER_BY_ID[save.char]) save.char = 'dona';
if (!(save.place >= 0 && save.place < PLACES.length)) save.place = 0;
save.unlocked = Math.max(1, Math.min(PLACES.length, save.unlocked | 0));
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };
let PLi = save.place, PL = PLACES[PLi];
const progOf = (id) => save.pl[id] || (save.pl[id] = { rm: [], rn: [], done: false, att: 0, tot: 0 });
const prog = () => progOf(PL.id);
let ch = PLAYER_BY_ID[save.char] || PLAYERS[0];
let UT = null; const ut = () => UT || (UT = statTotals(ch.id, save.cu[ch.id]));
function pk(k) { return (ch.perkK[k] || 0) + (k === 'time' || k === 'gate' || k === 'combo' || k === 'inv' || k === 'magnet' || k === 'score' || k === 'speed' ? (ut()[k] || 0) : 0); }
const dur = () => PL.dur + pk('time');
const startR = () => 0.9 * (1 + (ut().size || 0)) * (1 + (ch.perkK.grow || 0));
const gate = () => GATE + pk('gate');
const speedMul = () => 1 + pk('speed');
const lootMul = () => (1 + (ut().loot || 0)) * (1 + pk('coins'));
const hitMul = () => (ch.perkK.hit != null ? ch.perkK.hit : 1) * Math.max(0.25, 1 - (ut().hit || 0));
const comboWin = () => COMBO_WIN + pk('combo');
const clockBonus = () => 6 + (ut().clock || 0);

// ---------- renderer / escena ----------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene(); scene.background = skyTex(); scene.fog = new THREE.Fog(0xdff0ff, 60, 260);
const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 900);
const hemi = new THREE.HemisphereLight(0xeaf6ff, 0xffd9b8, 1.75); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8, 2.3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.06; sun.shadow.radius = 4;
sun.shadow.camera.near = 5; sun.shadow.camera.far = 320; scene.add(sun, sun.target);
const rim = new THREE.DirectionalLight(0xbfe4ff, 0.7); rim.position.set(-40, 30, -60); scene.add(rim);
// post-proceso: bloom suave (se apaga solo si el móvil va justo)
let composer = null, bloom = null, bloomOn = true;
function initComposer() {
  try {
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt); composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.7, 1.25); composer.addPass(bloom); composer.addPass(new OutputPass());
  } catch (e) { composer = null; }
}
initComposer();
const SUN_OFF = new THREE.Vector3(55, 100, 42);
const parts = new Particles(scene, 1200);
const rings = new Rings(scene, 10);
const tornado = makeTornado(scene);
let blinkT = 2, blinkP = 0, qLevel = 0; let scenery = null, dona = null, viewCh = ch; const modelCache = {};
function setChar(id, remember = true) {
  const c = PLAYER_BY_ID[id] || PLAYERS[0]; if (dona) scene.remove(dona);
  dona = modelCache[c.id] || (modelCache[c.id] = c.make()); scene.add(dona); tornado.theme(c.theme);
  viewCh = c; if (remember) { ch = c; save.char = c.id; UT = null; }
  return c;
}
setChar(save.char);
const worldGroup = new THREE.Group(); scene.add(worldGroup);
let title = null, titleStar = '';
let pixelCap = Math.min(window.devicePixelRatio || 1, 2.25), pixelRatio = pixelCap;
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(pixelRatio); renderer.setSize(w, h, false); if (composer) { composer.setPixelRatio(pixelRatio); composer.setSize(w, h); bloom.resolution.set(w * pixelRatio * 0.5, h * pixelRatio * 0.5); }
  camera.aspect = w / h; camera.fov = w / h < 1 ? 56 : 46; camera.updateProjectionMatrix();
  parts.mat.uniforms.uScale.value = (h * pixelRatio * 0.5) / Math.tan(camera.fov * Math.PI / 360);
  if (title) { title.resize(w, h, pixelRatio); title.insOk = 0; }
  $('rotate').style.display = 'none';
}
window.addEventListener('resize', resize); resize();

// ---------- estado ----------
const G = {
  mode: 'menu', t: 0, time: 70, dur: 70, px: SPAWN.x, pz: SPAWN.z, vx: 0, vz: 0, kx: 0, kz: 0,
  A0: 0.81, A: 0.81, R: 0.9, Rv: 0.9, lvl: 1, score: 0, coins: 0, swallowed: 0, combo: 0, comboT: 0, bestCombo: 0, rebels: 0, alcaldes: 0, hits: 0, maxTier: 0, crazies: 0, monuments: 0, dist: null, crazies: 0, monuments: 0, dist: null,
  slow: 0, inv: 0, shake: 0, kick: 0, twirl: 0, shout: 0, ended: 0, countT: 0, intro: 1, seed: 1, demoT: 0, hintStage: 0, moved: 0, bubbleT: 3, bot: false, speed: 0, paused: false, cf: 0, left: 0, total: 0, cleaned: 0, pulseT: 0, placeDone: false,
};
let props = [], grid = new Map(), movers = [], sucked = [], wobbling = [], pickups = [], frameNo = 0, alc = null, alcTimer = 0, alcLevel = 0, taken = [], toasts = [], landmarks = [];
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
const bubPool = []; for (let i = 0; i < 2; i++) { const e = document.createElement('div'); e.className = 'bubble npc'; $('bubbles').appendChild(e); bubPool.push({ e, who: null, t: 0 }); }
function say(who, txt, ms = 1900) {
  if (typeof who === 'object') { // personaje loco: globo propio (solo si está cerca)
    if (G.mode !== 'play' && G.mode !== 'menu') return; if (Math.hypot(who.x - G.px, who.z - G.pz) > 26 + G.R * 1.3) return;
    let b = bubPool.find((p) => p.who === who) || bubPool.find((p) => !p.who); if (!b) return; b.who = who; b.t = G.t; b.e.textContent = txt; ms = Math.min(ms, 1700); b.e.classList.add('on'); clearTimeout(b.to); b.to = setTimeout(() => { b.e.classList.remove('on'); b.who = null; }, ms); return;
  }
  const b = who === 'dona' ? $('bDona') : $('bAlc'); b.textContent = txt; b.classList.add('on'); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('on'), ms);
}
function flash(cls = '') { const f = $('flash'); f.className = 'on ' + cls; void f.offsetWidth; requestAnimationFrame(() => requestAnimationFrame(() => { f.className = ''; })); }
const ALC_LINES = ['¡Alto en nombre del Ayuntamiento!', '¡Exijo un permiso de torbellino!', '¡Esto es una vergüenza municipal!', '¡Voy a ponerle una multa!', '¡Aquí mando yo!'];
const rnd = Math.random; const pick = (a, i) => a[i % a.length];

// ---------- mundo ----------
const rugs = [];
function clearWorld() {
  for (const o of props) { worldGroup.remove(o.mesh); }
  const disp = (o) => o.mesh.traverse((c) => { if (c.isMesh && c.geometry) c.geometry.dispose(); });
  for (const m of movers) { worldGroup.remove(m.mesh); disp(m); }
  for (const t of toasts) worldGroup.remove(t.mesh); toasts = []; for (const p of bubPool) { p.who = null; p.e.classList.remove('on'); }
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
  const o = { id: props.length, gid: d.gid, kind: d.kind, K, tier: K.tier, r: geo.r * d.sc, sc: d.sc, x: d.x, z: d.z, hy: geo.halfH * d.sc, rot: d.rot, mesh: m, state: 0, area: 0, coins: K.coins, ov: d.ov, wf: -1, name: K.n };
  o.area = o.r * o.r; o.hw = Math.max(geo.geo.userData.w, geo.geo.userData.d) * d.sc * 0.5; m.position.set(d.x, o.hy, d.z); m.rotation.set(0, d.rot, 0); m.scale.setScalar(d.sc); m.updateMatrix(); m.matrixAutoUpdate = false;
  worldGroup.add(m); props.push(o);
  const k = gkey(cellOf(d.x), cellOf(d.z)); (grid.get(k) || grid.set(k, []).get(k)).push(o); o.cell = k;
  return o;
}
function addNpc(d) {
  const def = NPC[d.type]; const inner = def.make(d.v), holder = new THREE.Group(); const h = def.h || inner.userData.h; inner.position.y = -h / 2; holder.add(inner); holder.rotation.order = 'XZY';
  holder.position.set(d.x, h / 2, d.z); worldGroup.add(holder);
  const o = { npc: true, def, kind: d.type, rebel: d.type === 'rebel', name: def.name, tier: def.tier, r: def.r, sc: 1, x: d.x, z: d.z, hy: h / 2, rot: rnd() * 6.28, mesh: holder, inner, state: 0, area: def.r * def.r, coins: def.coins, ph: rnd() * 6, yo: def.fly || 0, sy: 1, rx: 0, rz: 0, vx: 0, vz: 0, face: 0, wander: rnd() * 5, wdx: 0, wdz: 0, scream: 0, group: null };
  if (def.init) def.init(o); movers.push(o); return o;
}
function addPatitos(d, rn) {
  const grp = { members: [], left: 0 }; let prev = null, skipped = 0;
  for (let i = 0; i < 5; i++) {
    const key = d.gid * 8 + i; if (rn && rn.has(key)) { skipped++; continue; }
    const o = addNpc({ type: 'patitos', x: d.x - i * 1.05, z: d.z, v: i === 0 ? 0 : 1 + (i % 2) }); o.key = key; o.group = grp; o.leader = !prev; o.prev = prev; prev = o; grp.members.push(o); grp.left++;
  }
  return skipped;
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
  alc = { rebel: false, alc: true, kind: 'alcalde', name: 'Alcalde Paraguas', tier: 3, r, sc: 1 + level * 0.12, x, z, hy: h / 2, mesh: holder, inner, state: 0, area: r * r * 1.2, coins: 70 + level * 30, spd: (4.4 + level * 0.5) * (1 + (PL.hazard - 1) * 0.4), cool: 1.0, mode: 'chase', rec: 0, ph: 0, vx: 0, vz: 0, talk: 3, level };
  holder.scale.setScalar(alc.sc); alc.hy = h / 2 * alc.sc; holder.position.y = alc.hy;
  toast('¡Llega el Alcalde Paraguas!', 'alc'); say('alc', ALC_LINES[0], 2300); AU.swish();
}
function buildWorld(seed, play) {
  clearWorld(); G.seed = seed;
  const w = generate(seed, PL);
  const P = play ? prog() : null, rm = P ? new Set(P.rm) : null, rn = P ? new Set(P.rn) : null;
  let total = w.objs.length; for (const d of w.npcs) total += d.type === 'patitos' ? 5 : 1;
  let left = total;
  for (const d of w.objs) { if (rm && rm.has(d.gid)) { left--; continue; } addProp(d); }
  landmarks = props.filter((o) => o.K.lm);
  for (const d of w.npcs) { if (d.type === 'patitos') left -= addPatitos(d, rn); else { if (rn && rn.has(d.gid * 8)) { left--; continue; } addNpc(d).key = d.gid * 8; } }
  for (const d of w.pickups) addPickup(d);
  G.total = play ? total : 0; G.left = play ? left : 0; if (P) P.tot = total;
}
const addCoins = (x) => { G.cf += x; const n = Math.floor(G.cf); if (n > 0) { G.cf -= n; G.coins += n; save.coins += n; } return n; };

// ---------- tragar ----------
function removeFromGrid(o) { if (o.cell == null) return; const l = grid.get(o.cell); if (l) { const i = l.indexOf(o); if (i >= 0) { l[i] = l[l.length - 1]; l.pop(); } } o.cell = null; }
const SPARK = [0xffd23f, 0xff74c4, 0x3fe0b0, 0x4aa8ff, 0xff6b5e, 0xffffff];
function swallow(o) {
  o.state = 2; removeFromGrid(o); if (o.mesh) o.mesh.matrixAutoUpdate = true; if (o.fm) { o.fm.m.opacity = 1; }
  const dx = o.x - G.px, dz = o.z - G.pz, rho = Math.hypot(dx, dz);
  o.sw = { t: 0, T: 1.05 + 0.32 * Math.sqrt(o.r) + (o.tier >= 4 ? 0.4 : 0), ang: Math.atan2(dz, dx), rho, rho0: rho, wx: (rnd() < 0.5 ? -1 : 1) * (3 + rnd() * 5), wy: (rnd() - 0.5) * 8, wz: (rnd() < 0.5 ? -1 : 1) * (3 + rnd() * 5), sp: 0 };
  sucked.push(o);
  // puntos, monedas, combo
  if (G.mode === 'play') { G.combo++; G.comboT = comboWin(); G.bestCombo = Math.max(G.bestCombo, G.combo); }
  const cm = 1 + Math.min(G.combo, 40) * 0.025;
  const pts = Math.round((10 + o.area * 14) * (1 + Math.min(10, Math.floor(G.combo / 5)) * 0.2) * (1 + pk('score')));
  const coinsF = o.coins * lootMul() * cm * COIN_K;
  const real = G.mode === 'play';
  if (real) { G.score += pts; addCoins(coinsF); G.swallowed++; if (o.kind === 'wardrobe') G.maxTier = Math.max(G.maxTier, 4); else if (o.kind === 'skyscraper' || (o.K && o.K.cb)) G.maxTier = 5; else G.maxTier = Math.max(G.maxTier, o.tier); }
  const before = G.A; G.A = Math.min(R_MAX * R_MAX, G.A + GROW_K * (1 + (ut().gain || 0)) * o.area / (1 + G.A / 70)); G.R = Math.sqrt(G.A);
  hud.dirty = true;
  // feedback
  const big = o.tier >= 2 || o.npc || o.alc;
  AU.pop(G.combo, o.tier); if (o.coins >= 8) AU.coin();
  const n = Math.min(26, 5 + Math.floor(o.r * 4)); parts.burst(o.x, o.hy * 0.8 + 0.3, o.z, n, { color: SPARK, speed: 3 + o.r * 1.4, size: 0.28 + o.r * 0.1, life: 0.8, shape: 1, g: 6, up: 2 });
  if (big) { G.shake = Math.max(G.shake, Math.min(0.9, 0.12 + o.r * 0.1)); parts.burst(o.x, 0.3, o.z, 8 + Math.min(18, o.r * 4), { color: [0xfff0d2, 0xffd9ec, 0xffffff], speed: 2 + o.r, size: 0.9 + o.r * 0.3, size1: 2 + o.r * 0.8, life: 0.8, shape: 4, g: -0.5, alpha: 0.55, flat: true, up: 0.6 }); rings.spawn(o.x, o.z, o.r * 0.5, o.r * 1.8 + 1, 0xffffff, 0.5, 0.7, 0.4); }
  if (real && (o.tier >= 3 || o.rebel || (o.npc && o.coins >= 24))) popText('+' + fmt(pts), o.x, o.hy * 2 + 1, o.z, o.tier >= 4 ? 'big' : '');
  if (real && G.combo >= 3) { const c = $('combo'); c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); }
  if (o.rebel && real) { G.rebels++; popText('¡Sofá atrapado!', o.x, o.hy * 2 + 3, o.z, 'big'); toast('¡Sofá atrapado!', ''); G.shake = 0.6; say('dona', '¡Quieto ahí, sofá!', 1500); AU.sofaScream(); }
  if (o.alc && real) { G.alcaldes++; toast('¡Alcalde fuera!', 'alc'); say('alc', '¡Aaay, mi paraguas!', 1700); G.shake = 1; flash('good'); AU.roundEnd(true); alc = null; alcTimer = 13; alcLevel++; AU.levelUp(3); }
  if (o.kind === 'skyscraper' && real) { toast('¡Rascacielos!', ''); G.shake = 1.1; flash('good'); }
  if (o.tier >= 6 && real) { G.monuments++; toast('¡' + o.name + ' tragado!', 'alc'); popText('+' + fmt(pts), o.x, o.hy * 2 + 2, o.z, 'big'); G.shake = 1.4; flash('good'); AU.roundEnd(true); AU.levelUp(6); }
  if (o.npc && real) { G.crazies++; if (o.def.onSwallow) o.def.onSwallow(o, X); }
  checkLevel();
  if (real && !o.alc && G.total) { G.left--; G.cleaned++; const P = prog(); if (o.npc) P.rn.push(o.key); else P.rm.push(o.gid); hud.dirty = true; if (G.left <= 0) completePlace(); }
}
function checkLevel() {
  const L = 1 + Math.floor(Math.log(G.R / G.A0 ** 0.5) / Math.log(1.32) + 1e-6);
  if (L > G.lvl && G.mode === 'play') {
    G.lvl = L; G.kick = 1; G.twirl = 6.28 * 2; G.shake = Math.max(G.shake, 0.55);
    toast(L >= 7 ? '¡GIGANTE!' : '¡MÁS GRANDE!'); AU.levelUp(L); rings.spawn(G.px, G.pz, G.Rv, G.Rv * 3.2, 0xff74c4, 0.8, 0.9); rings.spawn(G.px, G.pz, G.Rv * 0.6, G.Rv * 2.4, 0xffd23f, 0.6, 0.9);
    parts.burst(G.px, 1.2 * G.Rv, G.pz, 36, { color: SPARK, speed: 6 + G.Rv, size: 0.5 + 0.1 * G.Rv, life: 1.1, shape: 1, g: 4, up: 3 });
    if (rnd() < 0.8) { const l = pick(ch.say, (rnd() * 99) | 0); say('dona', l, 1700); if (L % 2 === 0) AU.speak(l, ch.voice.pitch, ch.voice.rate); }
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
document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); if (document.hidden && G.mode === 'play') pauseGame(); });
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
    const consider = (o, bonus = 1) => { if (o.state !== 0 || o.r > R * gate() * 0.97) return; const d = Math.hypot(o.x - G.px, o.z - G.pz); const sc = (o.area + 0.6) * bonus / Math.pow(d + 4, 1.5); if (sc > best) { best = sc; bt = o; } };
    const rc = cellOf(G.px), rz = cellOf(G.pz), span = Math.ceil((22 + R * 2) / 8);
    for (let a = rc - span; a <= rc + span; a++) for (let b = rz - span; b <= rz + span; b++) { const l = grid.get(gkey(a, b)); if (l) for (const o of l) consider(o); }
    for (const m of movers) consider(m, 2);
    for (const p of pickups) if (p.on) { const d = Math.hypot(p.x - G.px, p.z - G.pz); const sc = (p.type === 'clock' ? 3 : 0.8) / Math.pow(d + 4, 1.5); if (sc > best) { best = sc; bt = p; } }
    if (!bt) for (const o of props) consider(o);
    botTarget = bt;
  }
  let tx, tz; if (botTarget) { tx = botTarget.x - G.px; tz = botTarget.z - G.pz; } else { tx = -G.px * 0.02 + Math.sin(G.t * 0.5); tz = -G.pz * 0.02 + Math.cos(G.t * 0.4); }
  let l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
  if (alc && !alc.alcSafe && alc.r > R * gate()) { const ax = G.px - alc.x, az = G.pz - alc.z, ad = Math.hypot(ax, az); if (ad < 7 + R * 0.6) { const w = (7 + R * 0.6 - ad) / (7 + R * 0.6) * 1.2; tx += ax / ad * w; tz += az / ad * w; l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l; } }
  for (const m of movers) { if (m.state !== 0 || !HAZ[m.kind] || m.r <= R * gate()) continue; const ax = G.px - m.x, az = G.pz - m.z, ad = Math.hypot(ax, az), rr = 7 + R * 0.6 + m.r; if (ad < rr) { const w = (rr - ad) / rr * 1.4; tx += ax / ad * w; tz += az / ad * w; l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l; } }
  return { x: tx, z: tz, m: 0.85 };
}
const HAZ = { cortacesped: 1, globo: 1, nevera: 1, lavadora: 1, vater: 1, tostadora: 0, donut: 1, monito: 1, caballero: 1, nubarron: 1, calabaza: 1, neveraP: 1, neveraJ: 1, neveraC: 1, neveraN: 1, neveraH: 1 };

// ---------- actualización ----------
const hud = { left: -1, dirty: true, coins: -1, time: -1, lvl: -1, score: -1, prog: -1, combo: -1 };
function step(dt) {
  G.t += dt; frameNo++;
  const play = G.mode === 'play', demo = G.mode === 'menu';
  const active = play || demo || G.mode === 'count' || G.mode === 'results' || G.mode === 'shop' || G.mode === 'ending' || G.mode === 'chars';
  // radio visual suave
  G.Rv += (G.R - G.Rv) * Math.min(1, dt * 7); G.kick = Math.max(0, G.kick - dt * 2.2); G.shake = Math.max(0, G.shake - dt * 1.8); G.shout = Math.max(0, G.shout - dt);
  G.twirl = Math.max(0, G.twirl - dt * 14);
  const R = G.Rv;
  if (play) {
    G.time -= dt; G.inv = Math.max(0, G.inv - dt); G.slow = Math.max(0, G.slow - dt);
    if (G.time <= 0) endRound();
    else if (G.time < 10.5 && Math.ceil(G.time) !== G.lastTick) { G.lastTick = Math.ceil(G.time); AU.tick(G.time < 5); }
    { const pl = ut().pulse_l || 0; if (pl > 0) { G.pulseT += dt; if (G.pulseT >= pulsePeriod(pl)) { G.pulseT = 0; doPulse(pl); } } }
    if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) { G.combo = 0; hud.dirty = true; } }
    if (!alc && alcTimer <= 0 && G.alcSpawned !== true && G.t - G.startT > 10) { G.alcSpawned = true; spawnAlcalde(0); }
    if (G.alcSpawned && !alc) { alcTimer -= dt; if (alcTimer <= 0 && G.time > 12) spawnAlcalde(alcLevel); }
    G.bubbleT -= dt; if (G.bubbleT <= 0) { G.bubbleT = 9 + rnd() * 7; if (G.mode === 'play') { const l = pick(ch.say, (rnd() * 99) | 0); say('dona', l, 1600); G.shout = 0.6; } }
  }
  if (G.mode === 'count') { G.intro = Math.max(0, G.intro - dt * 0.9); }
  // movimiento
  if (active) {
    let iv = { x: 0, z: 0, m: 0 }; if (play || demo || G.bot) iv = inputVec();
    if (G.mode === 'count') iv = { x: 0, z: 0, m: 0 };
    const live = play || demo; if (!(frameNo % 5)) cull(); if (play && !(frameNo % 8)) { const dn = districtAt(G.px, G.pz); if (dn !== G.dist) { G.dist = dn; banner(dn); } drawMini(); }
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
        const o = l[i]; if (o.r > G.R * gate()) continue;
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
      if (!p.on) continue; p.mesh.visible = G.mode !== 'chars'; p.mesh.rotation.y += dt * 3; p.mesh.position.y = (p.type === 'coin' ? 1.1 : 1.5) + Math.sin(G.t * 3 + p.ph) * 0.18;
      const d = Math.hypot(p.x - G.px, p.z - G.pz);
      if (d < G.R + 1.0 + pk('magnet') * (1 + G.R * 0.5) && live) { p.on = false; p.state = 1; worldGroup.remove(p.mesh); collectPickup(p); }
    }
    updateMovers(dt, live); updateToasts(dt, live);
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
function doPulse(pl) {
  const rad = G.R * pulseRadius(pl), rc = cellOf(G.px), rz = cellOf(G.pz), span = Math.ceil(rad / 8) + 1; let n = 0, lim = 12 + pl * 6;
  const got = []; for (let a = rc - span; a <= rc + span; a++) for (let b = rz - span; b <= rz + span; b++) { const l = grid.get(gkey(a, b)); if (l) for (const o of l) if (o.state === 0 && o.r <= G.R * gate() && Math.hypot(o.x - G.px, o.z - G.pz) < rad) got.push(o); }
  for (const m of movers) if (m.state === 0 && m.r <= G.R * gate() && Math.hypot(m.x - G.px, m.z - G.pz) < rad) got.push(m);
  got.sort((a, b) => Math.hypot(a.x - G.px, a.z - G.pz) - Math.hypot(b.x - G.px, b.z - G.pz));
  for (const o of got) { if (n++ >= lim) break; if (o.state === 0) swallow(o); }
  rings.spawn(G.px, G.pz, G.Rv, rad, 0xff5a8a, 0.9, 0.7); rings.spawn(G.px, G.pz, G.Rv * 0.6, rad * 0.7, 0xffffff, 0.7, 0.6); AU.levelUp(4); G.shake = Math.max(G.shake, 0.4); toast('¡SUPERASPIRACIÓN!', ''); G.kick = 1;
}
function collectPickup(p) {
  const y = 1.5; if (G.mode !== 'play') { parts.burst(p.x, y, p.z, 8, { color: [0xffd23f, 0xfff0a0], speed: 3, size: 0.4, life: 0.6, shape: 2, g: 8, up: 3 }); return; }
  if (p.type === 'coin') { const c = Math.max(1, Math.round(2 * lootMul())); G.coins += c; save.coins += c; AU.coin(); parts.burst(p.x, y, p.z, 10, { color: [0xffd23f, 0xfff0a0], speed: 4, size: 0.5, life: 0.7, shape: 2, g: 8, up: 4 }); popText('+' + c, p.x, y + 1, p.z, 'coinp'); }
  else { const cb = clockBonus(); G.time = Math.min(G.time + cb, G.dur + 30); AU.clockBonus(); parts.burst(p.x, y, p.z, 18, { color: [0x9fe8ff, 0xffffff, 0x4aa8ff], speed: 5, size: 0.5, life: 0.9, shape: 3, g: 3, up: 4 }); popText('+' + cb.toFixed(cb % 1 ? 1 : 0).replace('.', ',') + ' s', p.x, y + 1, p.z, 'timep'); toast('¡Más tiempo!', ''); rings.spawn(p.x, p.z, 0.5, 4, 0x9fe8ff, 0.6, 0.9); }
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
const X = {
  G, parts, rings, AU, dt: 0, live: false, BOUND,
  edible: (c) => c.r <= G.R * gate(),
  step(c, tx, tz, sp, dt) { if (!sp) return 0; const l = Math.hypot(tx, tz) || 1, mg = Math.min(4, c.r * 0.4 + 1); const nx = clamp(c.x + tx / l * sp * dt, -BOUND + mg, BOUND - mg), nz = clamp(c.z + tz / l * sp * dt, -BOUND + mg, BOUND - mg); const mv = Math.hypot(nx - c.x, nz - c.z) / dt; c.x = nx; c.z = nz; return mv; },
  say, toast, shake(v) { G.shake = Math.max(G.shake, v); },
  addTime(s) { if (G.mode === 'play') { G.time = Math.min(G.time + s, G.dur + 25); hud.dirty = true; } },
  bonus(msg, coins) { if (G.mode !== 'play') return; coins = Math.max(1, Math.round(coins * 0.25)); G.coins += coins; save.coins += coins; AU.coin(); toast(msg, ''); hud.dirty = true; },
  puff(x, y, z) { parts.burst(x, y, z, 14, { color: [0xffffff, 0xe8d8ff, 0xffd9ec], speed: 3, size: 1.0, size1: 2.2, life: 0.7, shape: 4, g: -0.3, alpha: 0.7 }); parts.burst(x, y, z, 6, { color: [0xffd23f, 0xff74c4], speed: 4, size: 0.4, life: 0.7, shape: 3, g: 2 }); },
  shoot(c, ux, uz) {
    AU.toastShot(); const m = toastMesh.clone(); m.castShadow = true; worldGroup.add(m);
    toasts.push({ mesh: m, x: c.x + ux * 1.6, z: c.z + uz * 1.6, vx: ux * 14, vz: uz * 14, t: 0, y: c.hy * 1.7 });
  },
  hit(c, nx, nz, o) {
    if (G.mode !== 'play' || G.inv > 0) return false; const hm = hitMul(), f = 0.5 + 0.5 * hm;
    G.inv = 1.8 + pk('inv'); G.slow = Math.max(G.slow, (o.slow || 0.8) * f); G.hits++; G.kx = nx * (o.knock || 0) * f; G.kz = nz * (o.knock || 0) * f; G.shake = Math.max(G.shake, 0.8); G.combo = 0; G.comboT = 0;
    G.A = Math.max(G.A0, G.A - (o.loss || 0.04) * (G.A - G.A0) * hm); G.R = Math.sqrt(G.A); AU.hit(); flash(); toast(o.msg || '¡Ay!', 'warn');
    parts.burst(G.px, 1.5, G.pz, 16, { color: [0xff3d6e, 0xffd23f, 0xffffff], speed: 6, size: 0.45, life: 0.8, shape: 1, g: 6, up: 3 }); rings.spawn(G.px, G.pz, G.Rv, G.Rv * 2.6, 0xff3d6e, 0.5, 0.9); hud.dirty = true; return true;
  },
};
const toastMesh = (() => { const g = new GB(); g.rbox(0.9, 0.9, 0.22, 0.12, 0xf0c27a, 0, 0, 0, 0, 0, 0, 3); g.rbox(0.72, 0.72, 0.24, 0.1, 0xffe0a6, 0, 0.08, 0, 0, 0, 0, 2); g.sph(0.06, 0xb06b2a, 0.15, 0.3, 0.13, 1, 1, 0.5, 6); return new THREE.Mesh(g.build(true, 0.1), propMaterial); })();
function updateToasts(dt, live) {
  for (let i = toasts.length - 1; i >= 0; i--) {
    const t = toasts[i]; t.t += dt; t.x += t.vx * dt; t.z += t.vz * dt; const m = t.mesh; m.position.set(t.x, t.y + Math.sin(t.t * 3) * 0.5, t.z); m.rotation.x += dt * 9; m.rotation.z += dt * 5;
    const d = Math.hypot(t.x - G.px, t.z - G.pz); let kill = t.t > 2.6 || Math.abs(t.x) > BOUND || Math.abs(t.z) > BOUND;
    if (live && d < G.R * 0.95 + 0.5) {
      kill = true;
      if (G.R >= 3.2) { parts.burst(t.x, t.y, t.z, 6, { color: [0xf0c27a, 0xffe0a6], speed: 3, size: 0.3, life: 0.5, shape: 1, g: 6 }); if (G.mode === 'play') { G.score += 5; popText('¡Tostada!', t.x, t.y + 1, t.z, 'coinp'); } AU.pop(0, 0); }
      else { parts.burst(t.x, t.y, t.z, 10, { color: [0xf0c27a, 0xffe0a6, 0xb06b2a], speed: 4, size: 0.4, life: 0.6, shape: 4, g: 6 }); X.hit(t, t.vx / 14, t.vz / 14, { knock: 8, slow: 0.45, loss: 0.03, msg: '¡Tostada en la cara!' }); }
    }
    if (kill) { worldGroup.remove(m); toasts[i] = toasts[toasts.length - 1]; toasts.pop(); }
  }
}
function updateMovers(dt, live) {
  X.dt = dt; X.live = live; const lim = 85 + G.R * 3, lim2 = lim * lim;
  for (const m of movers) {
    if (m.state !== 0) continue;
    let dx = m.x - G.px, dz = m.z - G.pz, d2 = dx * dx + dz * dz;
    if (d2 > lim2) { m.mesh.visible = false; continue; } m.mesh.visible = true;
    m.def.update(m, dt, X);
    const k = m.mesh; k.position.set(m.x, m.hy + (m.yo || 0), m.z); k.rotation.set(m.rx || 0, m.rot, m.rz || 0); k.scale.y = m.sy || 1;
    dx = m.x - G.px; dz = m.z - G.pz; d2 = dx * dx + dz * dz; const cr = G.R * 0.98;
    if (live && m.r <= G.R * gate() && d2 < cr * cr) swallow(m);
  }
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
  a.cool = 2.8; a.rec = 1.4; G.inv = 2.0 + pk('inv'); G.slow = 1.3 * (0.5 + 0.5 * hitMul()); G.hits++;
  G.kx = nx * 20 * (0.5 + 0.5 * hitMul()); G.kz = nz * 20 * (0.5 + 0.5 * hitMul()); G.shake = 1; G.combo = 0; G.comboT = 0;
  const loss = 0.09 * (G.A - G.A0) * hitMul(); G.A = Math.max(G.A0, G.A - loss); G.R = Math.sqrt(G.A);
  AU.hit(); flash(); say('alc', '¡MULTA! ¡Por soplona!', 1600); toast('¡Multa!', 'warn'); say('dona', pick(['¡Qué agravio!', '¡Ay, mi espalda!', '¡Eso es abuso municipal!'], (rnd() * 3) | 0), 1200);
  parts.burst(G.px, 1.5, G.pz, 20, { color: [0x7b3fe4, 0xffd23f, 0xffffff], speed: 6, size: 0.45, life: 0.8, shape: 1, g: 6, up: 3 }); rings.spawn(G.px, G.pz, G.Rv, G.Rv * 2.8, 0xff3d6e, 0.5, 0.9);
  hud.dirty = true;
}
function resetDemo() { G.demoT = 0; buildWorld((rnd() * 1e9) | 0); G.px = SPAWN.x; G.pz = SPAWN.z; G.A0 = G.A = 0.81; G.R = 0.9; G.Rv = 0.9; G.vx = G.vz = G.kx = G.kz = 0; botTarget = null; alc = null; flash('good'); }


// ---------- los edificios que tapan al torbellino se vuelven transparentes ----------
const OCC_A = 0.22;   // opacidad de lo que tapa la vista
const fadePool = []; for (let i = 0; i < 72; i++) { const m = propMaterial.clone(); m.transparent = true; m.opacity = 1; fadePool.push({ m, used: false }); }
let fading = [];
// ¿tapa este objeto la línea cámara → torbellino? (segmento en planta + altura del rayo + margen que crece hacia la cámara)
function occludes(ox, oz, top, hw, cx, cy, cz, px, pz, R, vx, vz, L2, den) {
  const t = ((ox - cx) * vx + (oz - cz) * vz) / L2; if (t > 1.02) return false;           // detrás del torbellino: no tapa
  const s = t < 0 ? 0 : t > 1 ? 1 : t, lx = cx + vx * s - ox, lz = cz + vz * s - oz;
  const hwm = R * 1.7 * s + hw + 0.8 + (1 - s) * den * 0.33; if (lx * lx + lz * lz > hwm * hwm) return false;
  const yRay = cy + (R * 1.1 - cy) * s; return top >= yRay - R * 0.9;
}
function startFade(o) {
  const slot = fadePool.find((q) => !q.used); if (!slot) return false; slot.used = true; o.fm = slot; o.fade = 1;
  if (o.npc) { o.fl = []; o.mesh.traverse((c) => { if (!c.isMesh || !c.material) return; if (c.material.isShaderMaterial) { if (c.visible) { c.visible = false; o.fl.push([c, 0]); } } else if (c.material === propMaterial) { c.material = slot.m; o.fl.push([c, 1]); } }); }
  else { o.mesh.material = slot.m; if (!o.ol) { o.ol = []; o.mesh.traverse((c) => { if (c.isMesh && c.material && c.material.isShaderMaterial) o.ol.push(c); }); o.olv = true; } for (const c of o.ol) c.visible = false; }
  fading.push(o); return true;
}
function endFade(o) {
  if (o.npc) { for (const [c, k] of o.fl) { if (k) c.material = propMaterial; else c.visible = true; } o.fl = null; }
  else { o.mesh.material = propMaterial; if (o.ol) for (const c of o.ol) c.visible = o.olv !== false; }
  o.fm.used = false; o.fm.m.opacity = 1; o.fm = null;
}
function updateOcclusion(dt) {
  const R = G.Rv, cx = camera.position.x, cy = camera.position.y, cz = camera.position.z, px = G.px, pz = G.pz;
  if (G.mode === 'menu') return;
  const vx = px - cx, vz = pz - cz, L2 = vx * vx + vz * vz, den = Math.sqrt(L2); if (den < 1) return;
  const pad = 16 + R, x0 = cellOf(Math.min(cx, px) - pad), x1 = cellOf(Math.max(cx, px) + pad), z0 = cellOf(Math.min(cz, pz) - pad), z1 = cellOf(Math.max(cz, pz) + pad);
  for (let a = x0; a <= x1; a++) for (let b = z0; b <= z1; b++) {
    const l = grid.get(gkey(a, b)); if (!l) continue;
    for (const o of l) {
      const top = o.hy * 2; if (top < 2.4 || o.state !== 0 || !o.mesh.visible) continue;
      if (!occludes(o.x, o.z, top, o.hw, cx, cy, cz, px, pz, R, vx, vz, L2, den)) continue;
      if (!o.fm && !startFade(o)) continue; o.of = frameNo;
    }
  }
  for (const m of movers) { // los personajes locos grandes también (neveras jefas, lavadoras…)
    const top = m.hy * 2 * (m.sy || 1); if (top < 2.6 || m.state !== 0 || !m.mesh.visible) continue;
    if (!occludes(m.x, m.z, top, m.r, cx, cy, cz, px, pz, R, vx, vz, L2, den)) continue;
    if (!m.fm && !startFade(m)) continue; m.of = frameNo;
  }
  for (let i = fading.length - 1; i >= 0; i--) {
    const o = fading[i], tgt = o.of === frameNo ? OCC_A : 1; o.fade += (tgt - o.fade) * Math.min(1, dt * 9); o.fm.m.opacity = o.fade;
    if (tgt === 1 && o.fade > 0.97 || o.state !== 0) { endFade(o); fading[i] = fading[fading.length - 1]; fading.pop(); }
  }
  // decorado del escenario (postes y carteles de distrito)
  const oc = scenery && scenery.userData.occl; if (oc) for (const e of oc) {
    const hit = occludes(e.x, e.z, e.top, e.hw, cx, cy, cz, px, pz, R, vx, vz, L2, den); e.fade += ((hit ? OCC_A : 1) - e.fade) * Math.min(1, dt * 9);
    for (const m of e.ms) { m.material.opacity = e.fade; m.visible = true; }
  }
}

// ---------- v6: encuadre del personaje de cuerpo entero en el hueco libre de la pantalla ----------
let chBox = { h: 2, cy: 1, w: 1.6 }, chFree = null;
function measureChar() {
  const sp = dona.position.clone(), ss = dona.scale.clone(), sr = dona.rotation.clone();
  dona.position.set(0, 0, 0); dona.scale.set(1, 1, 1); dona.rotation.set(0, 0, 0); dona.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(dona); dona.position.copy(sp); dona.scale.copy(ss); dona.rotation.copy(sr); dona.updateMatrixWorld(true);
  if (isFinite(bb.max.y) && bb.max.y > bb.min.y) chBox = { h: bb.max.y - bb.min.y, cy: (bb.max.y + bb.min.y) / 2, w: Math.max(0.8, Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z)) };
  chFree = null;
}
function freeRectChars() {
  const W = window.innerWidth, H = window.innerHeight, sh = document.querySelector('#sChars .chsheet').getBoundingClientRect(), tb = document.querySelector('#sChars .chtop').getBoundingClientRect();
  const t = tb.bottom + 2;
  if (W > H * 1.1) return { l: 0, r: Math.max(W * 0.3, sh.left - 4), t, b: H - 6 };
  return { l: 0, r: W, t, b: Math.max(H * 0.35, sh.top - 2) };
}
let chCorr = { m: 1, dx: 0, dy: 0 };
function titleInsets() {
  const W = window.innerWidth, H = window.innerHeight, q = (s) => document.querySelector(s).getBoundingClientRect(), lg = q('#sTitle .logo'), st = q('#sTitle .statline'), mn = q('#sTitle .menu');
  if (W > H * 1.1) return { l: 0, r: Math.round(Math.max(0, W - mn.left + 6)), t: 0, b: 0 };
  return { l: 0, r: 0, t: Math.round(Math.max(lg.bottom, st.bottom) + 2), b: Math.round(Math.max(0, H - mn.top + 2)) };
}
function applyChCamera() {
  const fr = chFree, W = window.innerWidth, H = window.innerHeight, Wf = fr.r - fr.l, Hf = fr.b - fr.t, ds0 = G.Rv * 1.18;
  if (camera.fov !== 30) { camera.fov = 30; camera.updateProjectionMatrix(); camera.userData.cf = 1; }
  const ppu = Math.min(0.8 * Hf / (chBox.h * ds0), 0.88 * Wf / (chBox.w * ds0)), tanF = Math.tan(camera.fov * Math.PI / 360), dc = (H / 2) / (tanF * ppu) * chCorr.m;
  const ty = chBox.cy * ds0 + 0.12 * ds0, pit = 0.12;
  camera.position.set(G.px, ty + Math.sin(pit) * dc, G.pz + Math.cos(pit) * dc); camera.lookAt(G.px, ty, G.pz);
  camera.setViewOffset(W, H, W / 2 - (fr.l + fr.r) / 2 + chCorr.dx, H / 2 - (fr.t + fr.b) / 2 + chCorr.dy, W, H);
  camera.updateMatrixWorld(true);
}
function calibrateChar() { // mide la caja en pantalla en reposo y ajusta distancia y desplazamiento para que quede centrado y completo
  chFree = freeRectChars(); chCorr = { m: 1, dx: 0, dy: 0 }; const ds0 = G.Rv * 1.18;
  const sp = dona.position.clone(), ss = dona.scale.clone(), sr = dona.rotation.clone();
  dona.position.set(G.px, 0.12 * ds0, G.pz); dona.scale.setScalar(ds0); dona.rotation.set(0, 0, 0); dona.updateMatrixWorld(true);
  const fr = chFree, Wf = fr.r - fr.l, Hf = fr.b - fr.t;
  for (let k = 0; k < 3; k++) {
    applyChCamera(); const s = charScreenBox().box, bh = s.b - s.t, bw = s.r - s.l, m = Math.min(0.8 * Hf / bh, 0.88 * Wf / bw);
    chCorr.m /= m; if (k === 2) break;
    applyChCamera(); const s2 = charScreenBox().box; chCorr.dy += (s2.t + s2.b) / 2 - (fr.t + fr.b) / 2; chCorr.dx += (s2.l + s2.r) / 2 - (fr.l + fr.r) / 2;
  }
  applyChCamera(); const s3 = charScreenBox().box; chCorr.dy += (s3.t + s3.b) / 2 - (fr.t + fr.b) / 2; chCorr.dx += (s3.l + s3.r) / 2 - (fr.l + fr.r) / 2;
  dona.position.copy(sp); dona.scale.copy(ss); dona.rotation.copy(sr); dona.updateMatrixWorld(true);
}
function frameChar() { if (!chFree) calibrateChar(); applyChCamera(); }
function charScreenBox() { // para pruebas: caja en pantalla del personaje y hueco libre
  dona.updateMatrixWorld(true); camera.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(dona); let l = 1e9, t = 1e9, r = -1e9, b = -1e9;
  const zc = (bb.min.z + bb.max.z) / 2; for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [zc]) { const p = toScreen(x, y, z); l = Math.min(l, p.x); r = Math.max(r, p.x); t = Math.min(t, p.y); b = Math.max(b, p.y); }
  return { box: { l, t, r, b }, free: chFree || freeRectChars() };
}
// ---------- efectos / cámara ----------
const camT = new THREE.Vector3(SPAWN.x, 0, SPAWN.z); let camDist = 20;
function updateFx(dt) {
  const R = G.Rv, t = G.t;
  // torbellino y Doña
  if (scenery) scenery.userData.update(t);
  const pulse = 1 + G.kick * 0.18 + Math.sin(t * 9) * 0.012;
  tornado.setAlpha(G.mode === 'chars' ? 0.05 : 1); tornado.bits.visible = tornado.group.visible = G.mode !== 'chars';
  tornado.update(t, R, G.px, 0, G.pz, { x: G.vz * 0.02, z: -G.vx * 0.02 }, pulse);
  const ds = R * 1.18 * (1 + G.kick * 0.1), ud = dona.userData, sw = Math.sin(t * 9), a0 = ud.arms0 || 2.35;
  // squash & stretch: rebota al andar, respira al quieto y se estira al tragar
  const mv = clamp((G.speed || 0) / 9, 0, 1), sqz = (Math.abs(Math.sin(t * 6.5)) - 0.5) * 0.12 * mv + Math.sin(t * 2.3) * 0.022 * (1 - mv) + G.kick * 0.09 + (G.shout > 0 ? 0.04 : 0);
  dona.scale.set(ds * (1 - sqz * 0.55), ds * (1 + sqz), ds * (1 - sqz * 0.55));
  if (ud.lids) { blinkT -= dt; if (blinkT < 0) { blinkP = 0.17; blinkT = 1.8 + rnd() * 3.2; } blinkP = Math.max(0, blinkP - dt); const bl = blinkP > 0 ? Math.sin((1 - blinkP / 0.17) * Math.PI) : 0; for (const l of ud.lids) { l.visible = bl > 0.05; l.scale.set(1, Math.max(0.01, bl), 1); } }
  dona.position.set(G.px, 0.12 * ds + Math.abs(Math.sin(t * 6)) * 0.06 * ds + (ud.hover ? (ud.hover + Math.sin(t * 3) * 0.05) * ds : 0), G.pz);
  dona.rotation.set(G.vz * 0.012, clamp(G.vx * 0.045, -0.5, 0.5) + G.twirl + (G.mode === 'chars' ? Math.sin(t * 1.3) * 0.55 : 0), -G.vx * 0.014);
  ud.arms[1].rotation.z = -(a0 + sw * 0.55 + (G.shout > 0 ? 0.35 : 0)); ud.arms[0].rotation.z = a0 - sw * 0.5 + 0.2; ud.arms[1].rotation.x = Math.cos(t * 9) * 0.3; ud.arms[0].rotation.x = -Math.cos(t * 9) * 0.25;
  ud.head.rotation.z = Math.sin(t * 4.5) * 0.06; ud.head.position.y = (ud.headY || 1.36) + Math.abs(sw) * 0.03;
  ud.mouth.scale.set(1, G.shout > 0 || G.combo > 3 ? 1.4 + Math.sin(t * 25) * 0.25 : 0.85 + Math.sin(t * 3) * 0.1, 1);
  if (ud.extra) ud.extra(t, G);
  // polvo del suelo
  if (G.speed > 2 && (G.mode === 'play' || G.mode === 'menu')) {
    const n = Math.min(3, 1 + (G.speed / 9) | 0);
    for (let i = 0; i < n; i++) { const a = rnd() * 6.28; parts.emit({ x: G.px + Math.cos(a) * R * 0.9, y: 0.25, z: G.pz + Math.sin(a) * R * 0.9, vx: -G.vx * 0.15 + Math.cos(a + 1.57) * R * 1.2, vy: 0.4 + rnd() * 0.8, vz: -G.vz * 0.15 + Math.sin(a + 1.57) * R * 1.2, life: 0.6 + rnd() * 0.3, size: 0.5 * R + 0.2, size1: 1.7 * R + 0.5, color: 0xfff0e0, alpha: 0.35, shape: 4, g: -0.3, drag: 1.5 }); }
  }
  const fx = viewCh.fx;
  if (rnd() < dt * fx.rate * (G.mode === 'chars' ? 0.1 : 1)) { const a = rnd() * 6.28, rr = R * (0.6 + rnd() * 0.5), sz = (0.18 * R + 0.1) * fx.sz, bub = fx.shape === 2; parts.emit({ x: G.px + Math.cos(a) * rr, y: 0.3 + (bub ? rnd() * R * 1.6 : 0), z: G.pz + Math.sin(a) * rr, vx: Math.cos(a + 1.57) * R * (fx.fast ? 3.2 : 2.2), vy: (1.2 * R + rnd() * R) * fx.up * (bub ? 0.5 : 1), vz: Math.sin(a + 1.57) * R * (fx.fast ? 3.2 : 2.2), life: bub ? 1.5 : fx.shape === 4 ? 1.1 : 0.9, size: sz * (fx.shape === 4 ? 2.2 : 1), size1: bub ? sz * 1.5 : fx.shape === 4 ? sz * 4 : 0.02, color: fx.colors[(rnd() * fx.colors.length) | 0], shape: fx.shape, g: fx.g, drag: 0.8, alpha: fx.alpha }); }
  parts.update(dt); rings.update(dt);
  AU.setWhoosh(G.mode === 'play' ? clamp(G.speed / 16, 0.1, 1) : 0.0, Math.max(1, R));
  // cámara
  const pf = camera.aspect < 1 ? 1 + (1 - camera.aspect) * 0.55 : 1;
  const menuZ = G.mode === 'chars' ? (window.CAMZ || 0.43) : (G.mode === 'menu' || G.mode === 'results' || G.mode === 'shop') ? 0.66 : 1; G.mz = G.mz == null ? menuZ : G.mz + (menuZ - G.mz) * Math.min(1, dt * 2.5);
  const intro = G.intro, zoom = (G.mz + intro * 0.9 + G.kick * 0.1) * pf;
  camT.x += (G.px + G.vx * 0.22 - camT.x) * Math.min(1, dt * 6); camT.z += (G.pz + G.vz * 0.22 - camT.z) * Math.min(1, dt * 6);
  const d = (8.2 + R * 3.1) * zoom, h = (8.2 + R * 4.1) * zoom * (G.mode === 'chars' ? (window.CAMH || 0.42) : 1);
  camDist += (d - camDist) * Math.min(1, dt * 4);
  const sk = G.shake * G.shake * (0.35 + 0.18 * R); const sx = (rnd() - 0.5) * sk, sy = (rnd() - 0.5) * sk, sz = (rnd() - 0.5) * sk;
  const k = camDist / d;
  camera.position.set(camT.x + sx, h * k + sy, camT.z + d * k + sz);
  camera.lookAt(camT.x + sx * 0.5, G.mode === 'chars' ? (window.CAMY == null ? 0.55 : window.CAMY) : R * 0.9, G.mode === 'menu' ? camT.z + R * 1.6 : G.mode === 'chars' ? camT.z + (window.CAMZZ == null ? -1 : window.CAMZZ) : camT.z - R * 1.0 - 1.2);
  if (G.mode === 'chars') frameChar(); else if (camera.userData.cf || (camera.view && camera.view.enabled)) { camera.clearViewOffset(); if (camera.userData.cf) { camera.userData.cf = 0; resize(); } }
  if (window.CAMOVR) { camera.position.set(...window.CAMOVR.p); camera.lookAt(...window.CAMOVR.t); }
  updateOcclusion(dt);
  // luz y sombras
  const E = 16 + R * 7.2; sun.target.position.set(camT.x, 0, camT.z); sun.position.copy(sun.target.position).add(SUN_OFF);
  const sc = sun.shadow.camera; if (Math.abs(sc.right - E) > 0.5) { sc.left = -E; sc.right = E; sc.top = E; sc.bottom = -E; sc.updateProjectionMatrix(); }
  const fk = PL.fogK || 1; scene.fog.near = camDist * 2.2 * fk; scene.fog.far = (camDist * 7 + 80) * fk;
  // globos de texto
  placeBubble($('bDona'), G.px, 2.5 * R * 1.18 + 0.2 * R, G.pz);
  for (const p of bubPool) { if (!p.who) continue; const w = p.who; if (w.state !== 0) { p.who = null; p.e.classList.remove('on'); continue; } placeBubble(p.e, w.x, w.hy * 2 * (w.sy || 1) + (w.yo || 0) + 0.5, w.z); }
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
  // flecha hacia lo que queda por limpiar
  const li = $('leftInd');
  if (G.mode === 'play' && G.total && G.left > 0 && G.left <= 40 && !(frameNo % 6 && li._t)) {
    let best = null, bd = 1e9; for (const o of props) if (o.state === 0) { const d = Math.hypot(o.x - G.px, o.z - G.pz); if (d < bd) { bd = d; best = o; } } for (const m of movers) if (m.state === 0) { const d = Math.hypot(m.x - G.px, m.z - G.pz); if (d < bd) { bd = d; best = m; } }
    li._t = best ? { o: best, d: bd } : null;
  }
  if (G.mode === 'play' && li._t && li._t.o.state === 0 && G.left <= 40 && G.left > 0) {
    const o = li._t.o, p = toScreen(o.x, (o.hy || 0), o.z), W = window.innerWidth, Hh = window.innerHeight; const off = p.behind || p.x < 24 || p.x > W - 24 || p.y < 110 || p.y > Hh - 24;
    if (off) { let cx = W / 2, cy = Hh / 2, vx = p.x - cx, vy = p.y - cy; if (p.behind) { vx = -vx; vy = -vy; } const sx2 = (W / 2 - 46) / Math.abs(vx || 1e-3), sy2 = (Hh / 2 - 100) / Math.abs(vy || 1e-3), s2 = Math.min(sx2, sy2); li.style.display = 'flex'; li.style.left = (cx + vx * s2) + 'px'; li.style.top = (cy + vy * s2 + 20) + 'px'; li.style.setProperty('--rot', (Math.atan2(vy, vx) * 180 / Math.PI + 90) + 'deg'); } else li.style.display = 'none';
  } else { li.style.display = 'none'; if (G.mode !== 'play') li._t = null; }
}
function placeBubble(b, x, y, z) { if (!b.classList.contains('on')) return; const p = toScreen(x, y, z); b.style.left = clamp(p.x, 100, window.innerWidth - 100) + 'px'; b.style.top = clamp(p.y, 130, window.innerHeight - 60) + 'px'; }

// ---------- culling por distancia (mapa grande) ----------
function cull() {
  const vr = clamp(scene.fog.far * 0.9, 120, 250), olR = scene.fog.near + 30, olR2 = olR * olR, E = sun.shadow.camera.right + 10, cx = camT.x, cz = camT.z;
  for (const o of props) {
    if (o.state !== 0) continue; const dx = o.x - cx, dz = o.z - cz, d2 = dx * dx + dz * dz, ext = o.hy > 8 ? vr + 70 : o.tier === 0 ? vr * 0.72 : o.tier === 1 ? vr * 0.88 : vr;
    const vis = d2 < ext * ext; if (o.vis !== vis) { o.vis = vis; o.mesh.visible = vis; }
    if (vis) { if (!o.ol) { o.ol = []; o.mesh.traverse((c) => { if (c.isMesh && c.material && c.material.isShaderMaterial) o.ol.push(c); }); o.olv = true; } const ov = d2 < olR2 || o.hy > 8; if (ov !== o.olv) { o.olv = ov; if (!o.fm) for (const c of o.ol) c.visible = ov; } }
    const cs = vis && d2 < (E * 1.25) * (E * 1.25) && !(o.tier === 0 && d2 > 2500); if (o.cs !== cs) { o.cs = cs; o.mesh.castShadow = cs; }
  }
}
function banner(dn) {
  const b = $('dBanner'), D = DISTRICTS[dn]; b.textContent = D.name; b.style.setProperty('--c', '#' + D.c.toString(16).padStart(6, '0')); b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
}
const miniC = $('mini'), mctx = miniC.getContext('2d');
let heat = null;
function drawMini() {
  const W = miniC.width, k = W / (HALF * 2), g = mctx; g.clearRect(0, 0, W, W);
  for (const id in DISTRICTS) { const D = DISTRICTS[id]; g.fillStyle = '#' + D.c.toString(16).padStart(6, '0'); g.globalAlpha = id === G.dist ? 0.9 : 0.65; g.fillRect((D.cx - 43 + HALF) * k + 1, (D.cz - 43 + HALF) * k + 1, 86 * k - 2, 86 * k - 2); }
  g.globalAlpha = 1;
  if (G.total) { // lo que aún está sucio se oscurece; lo limpio brilla
    const CN = 22, cs = (HALF * 2) / CN; if (!heat) heat = new Float32Array(CN * CN); heat.fill(0);
    const add = (o) => { const ix = clamp(((o.x + HALF) / cs) | 0, 0, CN - 1), iz = clamp(((o.z + HALF) / cs) | 0, 0, CN - 1); heat[iz * CN + ix] += o.tier >= 3 ? 3 : 1; };
    for (const o of props) if (o.state === 0) add(o); for (const m of movers) if (m.state === 0) add(m);
    for (let iz = 0; iz < CN; iz++) for (let ix = 0; ix < CN; ix++) { const h = heat[iz * CN + ix]; if (h > 0) { g.fillStyle = `rgba(42,24,64,${Math.min(0.62, 0.16 + h * 0.025).toFixed(2)})`; g.fillRect(ix * cs * k, iz * cs * k, cs * k + 0.6, cs * k + 0.6); } }
    const few = G.left <= 60; g.lineWidth = 1.2; g.strokeStyle = '#fff'; g.fillStyle = '#ff2d6e';
    const dot = (o, r) => { g.beginPath(); g.arc((o.x + HALF) * k, (o.z + HALF) * k, r, 0, 7); g.fill(); g.stroke(); };
    for (const o of props) if (o.state === 0 && (few || o.tier >= 4)) dot(o, few ? 2.4 : 2.0); for (const m of movers) if (m.state === 0 && (few || m.def.boss)) dot(m, 2.6);
  }
  g.fillStyle = '#fff';
  for (const o of landmarks) { if (o.state !== 0 && o.state !== undefined) continue; const x = (o.x + HALF) * k, y = (o.z + HALF) * k; g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x + 3, y); g.lineTo(x, y + 4); g.lineTo(x - 3, y); g.fill(); }
  for (const m of movers) if (m.state === 0 && m.def.boss) { g.fillStyle = '#7a1fd0'; g.beginPath(); g.arc((m.x + HALF) * k, (m.z + HALF) * k, 3.2, 0, 7); g.fill(); }
  if (alc) { g.fillStyle = '#ff2d4d'; g.beginPath(); g.arc((alc.x + HALF) * k, (alc.z + HALF) * k, 3.4, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.2; g.stroke(); }
  g.fillStyle = '#ffd23f'; g.strokeStyle = '#2a1840'; g.lineWidth = 2; g.beginPath(); g.arc((G.px + HALF) * k, (G.pz + HALF) * k, 4, 0, 7); g.fill(); g.stroke();
}

// ---------- HUD ----------
function updateHud() {
  if (G.mode !== 'play' && G.mode !== 'count') return;
  const coins = save.coins; if (coins !== hud.coins) { hud.coins = coins; const e = $('hCoins'); e.textContent = fmt(coins); }
  const tm = Math.max(0, Math.ceil(G.time)); if (tm !== hud.time) { hud.time = tm; $('hTime').textContent = Math.floor(tm / 60) + ':' + String(tm % 60).padStart(2, '0'); $('timer').classList.toggle('warn', tm <= 10); }
  if (G.lvl !== hud.lvl) { hud.lvl = G.lvl; $('hLvl').textContent = 'Nivel ' + G.lvl; }
  const sc = Math.round(G.score); if (sc !== hud.score) { hud.score = sc; $('hScore').textContent = fmt(sc); }
  const prog = clamp(Math.log(G.R / Math.sqrt(G.A0)) / Math.log(1.32) % 1, 0, 1); const pq = Math.round(prog * 100); if (pq !== hud.prog) { hud.prog = pq; $('hLvlBar').style.width = pq + '%'; }
  if (G.total) { const lf = G.left; if (lf !== hud.left) { hud.left = lf; const pc = Math.floor((1 - lf / G.total) * 100); $('hCleanPct').textContent = (lf === 0 ? 100 : Math.min(99, pc)) + '%'; $('hCleanLeft').textContent = lf === 0 ? '¡Todo!' : 'quedan ' + lf; $('hCleanBar').style.width = (100 - lf / G.total * 100) + '%'; } }
  const plv = ut().pulse_l || 0; $('pulseRow').style.display = plv ? 'block' : 'none'; if (plv) $('hPulse').style.width = clamp(G.pulseT / pulsePeriod(plv) * 100, 0, 100) + '%';
  const c = $('combo'); if (G.combo >= 3) { c.classList.add('on'); if (G.combo !== hud.combo) { hud.combo = G.combo; $('hComboN').textContent = 'x' + G.combo; } $('hComboBar').style.width = (G.comboT / comboWin() * 100) + '%'; } else { c.classList.remove('on'); hud.combo = -1; }
  // pistas
  const hint = $('hint');
  if (!save.tut && G.mode === 'play') {
    if (G.moved < 1.2) { hint.textContent = 'Arrastra el dedo para mover el torbellino'; hint.classList.add('on'); }
    else if (G.t - G.startT < 12) { hint.textContent = 'Traga lo pequeño para crecer'; hint.classList.add('on'); }
    else { hint.classList.remove('on'); save.tut = true; persist(); }
  } else hint.classList.remove('on');
}

// ---------- flujo de pantallas ----------
const scr = ['sTitle', 'sHelp', 'sCount', 'sPause', 'sResults', 'sShop', 'sChars', 'sTravel', 'sPlaceDone'];
function show(id) { for (const s of scr) $(s).classList.toggle('hidden', s !== id); }
function hideAll() { show(null); }
function refreshTitle() {
  $('tChar').textContent = ch.name; $('tCoins').textContent = fmt(save.coins); $('tBest').textContent = fmt(save.best); $('bSfx').classList.toggle('off', !AU.S.sfxOn); $('bMus').classList.toggle('off', !AU.S.musicOn);
  const P = prog(), lock = PLi >= save.unlocked, doneAll = save.unlocked >= PLACES.length && PLACES.every((q) => progOf(q.id).done);
  $('pName').textContent = (lock ? '🔒 ' : '') + PL.name; $('pSub').textContent = lock ? 'Limpia ' + PLACES[PLi - 1].name + ' para abrirlo' : PL.sub; $('pNum').textContent = 'Lugar ' + (PLi + 1) + ' de ' + PLACES.length;
  const left = P.tot ? Math.max(0, P.tot - P.rm.length - P.rn.length) : 0, pct = P.tot ? Math.floor((P.rm.length + P.rn.length) / P.tot * 100) : 0, fresh = P.done && !P.part;
  $('pFill').style.width = (fresh ? 100 : pct) + '%'; $('pPct').textContent = lock ? '' : fresh ? '✔ Limpio · vuelve a limpiarlo' : pct > 0 ? pct + '% limpio · quedan ' + left : 'Sin empezar';
  $('bPlay').classList.toggle('locked', lock); $('bPlay').textContent = lock ? 'BLOQUEADO' : pct > 0 && !fresh ? '¡SEGUIR LIMPIANDO!' : '¡A LIMPIAR!';
  $('bPPrev').style.visibility = PLi > 0 ? 'visible' : 'hidden'; $('bPNext').style.visibility = PLi < PLACES.length - 1 ? 'visible' : 'hidden';
  $('tNote').style.display = save.mig === 1 ? 'block' : 'none'; if (doneAll) $('pPct').textContent = '🏆 ¡Mundo entero limpio!';
}
function toMenu() {
  persist(); setChar(save.char); G.mode = 'menu'; $('hud').classList.remove('on'); joyShow(false); joy.on = false; G.intro = 0; G.combo = 0; G.comboT = 0; G.slow = 0; G.total = 0; G.left = 0;
  $('combo').classList.remove('on'); $('alcInd').style.display = 'none'; $('leftInd').style.display = 'none'; $('dBanner').classList.remove('on'); resetDemo(); G.A0 = G.A = 0.81; G.R = G.Rv = 0.9; show('sTitle'); refreshTitle(); AU.setMusicMode('menu');
}
function startRound() {
  if (PLi >= save.unlocked) { AU.nope(); return; }
  AU.init(); AU.startMusic('game'); AU.setMusicMode('game'); AU.click();
  const P = prog(); if (P.done && !P.part) { P.rm = []; P.rn = []; } P.part = true; P.att = (P.att || 0) + 1; G.placeDone = false;
  buildWorld(PL.seed, true); alc = null; alcTimer = 0; alcLevel = 0; botTarget = null;
  let r0 = startR(); const base = r0, done = P.rm.length + P.rn.length;
  if (done > 0) { // si ya limpiaste mucho, empiezas lo bastante grande para poder tragar buena parte de lo que queda
    const rs = []; for (const o of props) rs.push(o.r); for (const m of movers) rs.push(m.r); rs.sort((a, b) => a - b); const n = rs.length, fr = 1 - n / Math.max(1, P.tot);
    if (n) { const f = n <= 14 ? 1 : fr > 0.8 ? 0.8 : fr > 0.55 ? 0.6 : 0.4, q = rs[Math.min(n - 1, Math.floor(f * (n - 1)))], need = q / (gate() * 0.95); const curve = base * (1 + 9 * Math.pow(Math.max(0, fr), 1.1)); r0 = Math.max(r0, Math.min(n <= 14 ? 16 : 10, Math.max(need, curve))); }
  }
  G.boosted = r0 > base + 0.02;
  Object.assign(G, { mode: 'count', t: 0, startT: 0, dur: dur(), time: dur(), px: SPAWN.x, pz: SPAWN.z + 3, vx: 0, vz: 0, kx: 0, kz: 0, A0: r0 * r0, A: r0 * r0, R: r0, Rv: r0, lvl: 1, score: 0, coins: 0, cf: 0, cleaned: 0, pulseT: pulsePeriod(ut().pulse_l || 1) * 0.4, swallowed: 0, combo: 0, comboT: 0, bestCombo: 0, rebels: 0, alcaldes: 0, hits: 0, maxTier: 0, crazies: 0, monuments: 0, dist: null, slow: 0, inv: 0, shake: 0, kick: 0, intro: 1, moved: 0, bubbleT: 7, alcSpawned: false, lastTick: 0, ended: 0, countT: 0 });
  G.startLeft = G.left;
  camT.set(G.px, 0, G.pz); camDist = 40; hud.left = -1;
  hud.coins = hud.time = hud.lvl = hud.score = hud.prog = hud.combo = -1; $('hud').classList.add('on'); $('bAlc').classList.remove('on'); $('bDona').classList.remove('on'); G.dist = null; $('leftInd').style.display = 'none';
  show('sCount'); countdown(3);
}
function countdown(n) {
  if (G.mode !== 'count') return; const e = $('countN'); e.style.animation = 'none'; void e.offsetWidth; e.style.animation = '';
  if (n > 0) { e.textContent = n; AU.beep(false); setTimeout(() => countdown(n - 1), 750); }
  else { e.textContent = '¡YA!'; AU.beep(true); G.mode = 'play'; G.startT = G.t; hideAll(); toast(G.boosted ? '¡Sigue limpiando!' : '¡A LIMPIAR!'); say('dona', ch.start, 1900); G.shout = 1; AU.speak(ch.start, ch.voice.pitch, ch.voice.rate); G.intro = 0; }
}
function endRound() {
  if (G.mode !== 'play') return; G.mode = 'ending'; joyShow(false); joy.on = false; toast('¡TIEMPO!', 'warn'); AU.roundEnd(true); $('alcInd').style.display = 'none'; $('leftInd').style.display = 'none'; $('combo').classList.remove('on'); persist();
  setTimeout(showResults, 1500);
}
function showResults() {
  save.rounds++; const goals = [
    { t: 'Tragar 120 cosas', ok: G.swallowed >= 120 }, { t: 'Atrapar a un loco o echar al Alcalde', ok: G.crazies + G.alcaldes > 0 }, { t: 'Tragar un armario-edificio o algo gigante', ok: G.maxTier >= 4 },
  ];
  const stars = goals.filter((g) => g.ok).length, bonus = stars * 8 + (G.monuments > 0 ? 30 : 0); G.coins += bonus; save.coins += bonus;
  const rec = Math.round(G.score) > save.best; if (rec) save.best = Math.round(G.score); persist();
  const rank = G.score < 1500 ? 'Aprendiz de escoba' : G.score < 5000 ? 'Torbellino de salón' : G.score < 12000 ? 'Huracán doméstico' : G.score < 26000 ? 'Señora del Remolino' : 'Reina de ' + PL.name;
  const pct = Math.floor((1 - G.left / Math.max(1, G.total)) * 100), gain = Math.max(0, Math.floor(G.cleaned / Math.max(1, G.total) * 100));
  $('rTitle').textContent = '¡Tiempo!'; $('rRank').textContent = rank; $('rScore').textContent = fmt(G.score); $('rRecord').classList.toggle('on', rec);
  $('rPlace').textContent = PL.name; $('rCleanTxt').innerHTML = `<b>${pct}%</b> limpio${gain ? ` <em>(+${gain}% en este intento)</em>` : ''} · quedan <b>${fmt(G.left)}</b>`; $('rCleanBar').style.width = pct + '%';
  $('rStars').innerHTML = [0, 1, 2].map((i) => `<svg class="star ${i < stars ? 'got' : ''}" viewBox="0 0 24 24"><path d="M12 2.2l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17l-5.9 3.2 1.2-6.5L2.5 9.1l6.6-.9z"/></svg>`).join('');
  [...$('rStars').children].forEach((s, i) => setTimeout(() => { s.classList.add('on'); if (i < stars) AU.coin(); }, 350 + i * 300));
  $('rGrid').innerHTML = `<div><b>${G.cleaned}</b>cosas limpiadas</div><div><b>Nivel ${G.lvl}</b>tamaño final</div><div><b>x${G.bestCombo}</b>mejor combo</div><div><b>${G.crazies}</b>locos atrapados</div>` +
    goals.map((g) => `<div style="grid-column:span 2;display:flex;justify-content:space-between;align-items:center;${g.ok ? 'background:#e3ffe8;color:#1d8a3a' : ''}"><span>${g.t}</span><b style="font-size:18px">${g.ok ? '✔' : '–'}</b></div>`).join('');
  $('rCoins').textContent = '+' + fmt(G.coins - bonus); $('rBonus').textContent = bonus ? `+${bonus} extra (${G.monuments > 0 ? 'monumento + ' : ''}estrellas)` : 'Consigue estrellas para ganar más';
  $('bRAgain').textContent = 'Seguir limpiando';
  G.mode = 'results'; G.demoT = 0; show('sResults'); $('hud').classList.remove('on'); AU.setMusicMode('menu');
}
// ---------- ¡lugar limpio! ----------
function completePlace() {
  if (G.mode !== 'play' || G.placeDone) return; G.placeDone = true; G.mode = 'ending'; joyShow(false); joy.on = false;
  const P = prog(), first = !P.done, bonus = (first ? 220 : 70) * (PLi + 1); P.done = true; P.part = false; P.fin = (P.fin || 0) + 1; G.coins += bonus; save.coins += bonus; G.bonusPlace = bonus; save.rounds++;
  const nextNew = PLi + 2 > save.unlocked && PLi + 1 < PLACES.length; save.unlocked = Math.max(save.unlocked, Math.min(PLACES.length, PLi + 2)); const rec = Math.round(G.score) > save.best; if (rec) save.best = Math.round(G.score); persist();
  toast('¡' + PL.name + ' LIMPIO!', 'alc'); flash('good'); AU.roundEnd(true); AU.levelUp(8); G.shake = 1.2; $('alcInd').style.display = 'none'; $('leftInd').style.display = 'none'; $('combo').classList.remove('on'); if (alc) { alc.state = 3; worldGroup.remove(alc.mesh); alc = null; }
  say('dona', '¡Todo limpio! ¡Ni una mota de polvo!', 2600); AU.speak('¡Todo limpio!', ch.voice.pitch, ch.voice.rate);
  let n = 0; const iv = setInterval(() => { n++; if (n > 13 || (G.mode !== 'ending')) { clearInterval(iv); return; } const a = rnd() * 6.28, d = 3 + rnd() * 10 * G.Rv * 0.5, c = [[0xff74c4, 0xffd23f], [0x3fe0b0, 0x4aa8ff], [0xff6b5e, 0xffffff], [0xb06bff, 0xffd23f]][n % 4]; parts.burst(G.px + Math.cos(a) * d, 5 + rnd() * 9, G.pz + Math.sin(a) * d, 34, { color: c, speed: 9, size: 0.8, life: 1.3, shape: 1, g: 5, up: 1 }); rings.spawn(G.px, G.pz, G.Rv * 0.6, G.Rv * (2 + n * 0.3), c[0], 0.9, 0.9); AU.coin(); if (n % 3 === 0) AU.levelUp(3 + (n % 6)); }, 260);
  setTimeout(() => showPlaceDone(bonus, nextNew), 3800);
}
function showPlaceDone(bonus, nextNew) {
  if (G.mode !== 'ending') return; const P = prog(), nx = PLi + 1 < PLACES.length ? PLACES[PLi + 1] : null;
  $('pdName').textContent = PL.name; $('pdTitle').textContent = nx ? '¡Lugar limpio!' : '¡MUNDO LIMPIO!';
  $('pdGrid').innerHTML = `<div><b>${P.att || 1}</b>${(P.att || 1) === 1 ? 'intento' : 'intentos'}</div><div><b>${fmt(G.score)}</b>puntos</div><div><b>x${G.bestCombo}</b>mejor combo</div><div><b>${G.crazies}</b>locos atrapados</div>`;
  $('pdCoins').innerHTML = `<i class="coin"></i> <b>+${fmt(G.coins)}</b> monedas <span>incluye +${fmt(bonus)} por limpiar el lugar</span>`;
  $('pdNext').innerHTML = nx ? `<small>Siguiente destino${nextNew ? ' (¡nuevo!)' : ''}</small><b>${nx.name}</b><span>${nx.sub}</span>` : `<small>¡Has limpiado todos los lugares!</small><b>Eres la Reina de la Limpieza</b><span>Puedes volver a limpiar cualquier sitio cuando quieras</span>`;
  $('bPdGo').textContent = nx ? '¡Viajar a ' + nx.name + '!' : 'Elegir un lugar'; $('bPdGo').dataset.next = nx ? PLi + 1 : -1;
  G.mode = 'placedone'; G.demoT = 0; show('sPlaceDone'); $('hud').classList.remove('on'); AU.setMusicMode('menu');
}
// ---------- viajar entre lugares ----------
async function enterPlace(idx, cb = () => {}) {
  PLi = idx; PL = PLACES[idx]; save.place = idx; G.total = 0; G.left = 0;
  clearWorld(); setDistrictStyle(PL); setPlaceTint(PL.home ? '' : PL.id, PL.home ? null : PL.tint); clearGeoCache();
  await cb(12, 'Pintando ' + PL.name + '…');
  if (scene.background && scene.background.dispose) scene.background.dispose(); scene.background = skyTex(PL); disposeScenery(scene, scenery); scenery = buildScenery(scene, PL);
  scene.fog.color.set(PL.fog); hemi.color.set(PL.hemi[0]); hemi.groundColor.set(PL.hemi[1]); hemi.intensity = PL.hemi[2]; sun.color.set(PL.sun[0]); sun.intensity = PL.sun[1]; rim.color.set(PL.rim);
  await cb(30, 'Fabricando cosas…');
  const kinds = Object.keys(KINDS).filter((k) => !KINDS[k].places || KINDS[k].places.includes(PL.id)); let i = 0;
  for (const k of kinds) { for (let v = 0; v < Math.min(KINDS[k].nv, 8); v++) getGeo(k, v); i++; if (i % 6 === 0) await cb(30 + (i / kinds.length) * 55); }
  await cb(90, 'Colocando ' + PL.name + '…'); persist();
}
async function travelTo(idx, thenPlay) {
  G.mode = 'travel'; show('sTravel'); $('hud').classList.remove('on'); $('trName').textContent = PLACES[idx].name; $('trSub').textContent = PLACES[idx].sub; $('trNum').textContent = 'Lugar ' + (idx + 1) + ' de ' + PLACES.length; $('trFill').style.width = '0%'; AU.whoosh && AU.whoosh();
  $('sTravel').style.setProperty('--c', '#' + (PLACES[idx].districts ? PLACES[idx].districts.cocina.c : 0xffc933).toString(16).padStart(6, '0'));
  const t0 = performance.now(); await new Promise((r) => setTimeout(r, 650));
  await enterPlace(idx, (p) => { $('trFill').style.width = p + '%'; return new Promise((r) => setTimeout(r, 16)); });
  const wait = 1600 - (performance.now() - t0); if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  $('trFill').style.width = '100%'; G.mode = 'menu'; resetDemo(); if (thenPlay) startRound(); else { show('sTitle'); refreshTitle(); G.mode = 'menu'; }
}
function pauseGame() { if (G.mode !== 'play') return; G.mode = 'pause'; persist(); show('sPause'); joyShow(false); joy.on = false; AU.setWhoosh(0, 1); $('bPSfx').classList.toggle('off', !AU.S.sfxOn); $('bPMus').classList.toggle('off', !AU.S.musicOn); }
function resumeGame() { if (G.mode !== 'pause') return; G.mode = 'play'; hideAll(); AU.click(); }
// ---------- mejoras de cada personaje ----------
let shopCh = save.char;
const ownedList = () => PLAYERS.filter((p) => save.owned[p.id]);
function renderShop() {
  if (!save.owned[shopCh]) shopCh = save.char; const p = PLAYER_BY_ID[shopCh], lv = save.cu[p.id] || [0, 0, 0, 0], list = ownedList();
  $('sCoins').textContent = fmt(save.coins); $('shName').textContent = p.name; $('shPerk').textContent = p.perk; $('shNum').textContent = 'Personaje ' + (list.indexOf(p) + 1) + ' / ' + list.length + (shopCh === save.char ? ' · elegida' : '');
  $('bShPrev').style.visibility = $('bShNext').style.visibility = list.length > 1 ? 'visible' : 'hidden';
  $('shDot').style.background = '#' + p.theme.ring.toString(16).padStart(6, '0');
  $('upsList').innerHTML = upList(p.id).map((u) => {
    const l = lv[u.i] || 0, max = l >= UPMAX, cost = upCost(l), can = save.coins >= cost;
    return `<div class="up"><div class="ic" style="background:${u.col}">${u.icon}</div><div class="tx"><b>${u.n}</b><small>${max ? u.d(u.per * l, l) + ' · ¡al máximo!' : l ? 'Ahora: ' + u.d(u.per * l, l) : u.d(u.per, 1)}</small>${!max && l ? `<small class="nx">Siguiente: ${u.d(u.per * (l + 1), l + 1)}</small>` : ''}<div class="pips">${Array.from({ length: UPMAX }, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('')}</div></div>
    <button class="btn buy ${max ? 'quit' : can ? 'go' : 'shop'}" data-up="${u.i}" ${max ? 'disabled' : ''}>${max ? 'MAX' : `<i class="coin"></i> ${fmt(cost)}`}</button></div>`;
  }).join('');
}
let shopFrom = 'sTitle';
function openShop(from) { shopFrom = from; shopCh = save.char; show('sShop'); renderShop(); AU.click(); }
$('upsList').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-up]'); if (!b) return; const p = PLAYER_BY_ID[shopCh], i = +b.dataset.up, arr = save.cu[p.id] || (save.cu[p.id] = [0, 0, 0, 0]), l = arr[i] || 0, cost = upCost(l);
  if (l >= UPMAX) return; if (save.coins < cost) { AU.nope(); b.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 200 }); return; }
  save.coins -= cost; arr[i] = l + 1; if (p.id === ch.id) UT = null; persist(); AU.buy(); renderShop();
});
const shopMove = (d) => { const l = ownedList(); let i = l.findIndex((p) => p.id === shopCh); i = (i + d + l.length) % l.length; shopCh = l[i].id; AU.select(); setChar(shopCh, false); renderShop(); };
// ---------- selección de personaje ----------
let cIdx = 0;
const hexs = (n) => '#' + n.toString(16).padStart(6, '0');
function renderChars() {
  const p = PLAYERS[cIdx]; setChar(p.id, false); const owned = !!save.owned[p.id], sel = save.char === p.id;
  $('cName').textContent = p.name; $('cSub').textContent = p.sub; $('cPerk').textContent = p.perk; $('cCoins').textContent = fmt(save.coins); $('cNum').textContent = (cIdx + 1) + ' / ' + PLAYERS.length;
  const b = $('bCPick'), lockP = PLi >= save.unlocked; b.className = 'btn big ' + (owned ? 'go' : save.coins >= p.price ? 'unlock' : 'locked');
  b.innerHTML = owned ? `¡A LIMPIAR!${lockP ? '<small>en ' + PLACES[save.unlocked - 1].name + '</small>' : ''}` : `<i class="coin"></i> ${fmt(p.price)} · DESBLOQUEAR`;
  $('cDots').innerHTML = PLAYERS.map((q, i) => `<button class="dot ${i === cIdx ? 'on' : ''} ${save.owned[q.id] ? '' : 'lock'}" data-i="${i}" style="--c:${hexs(q.theme.ring)};--d:${hexs(q.theme.f[0][1])}" aria-label="${q.name}"></button>`).join('');
  $('cStats').innerHTML = '';
  G.kick = 1; G.twirl = 6.28; measureChar(); calibrateChar();
}
function openChars() { cIdx = Math.max(0, PLAYERS.findIndex((p) => p.id === save.char)); G.mode = 'chars'; G.vx = G.vz = 0; $('dBanner').classList.remove('on'); show('sChars'); renderChars(); AU.click(); }
function charsMove(d) { cIdx = (cIdx + d + PLAYERS.length) % PLAYERS.length; AU.select(); renderChars(); }
canvas.addEventListener('pointerdown', (e) => { if (G.mode === 'menu' && title && title.active) title.tap(e.clientX, e.clientY); });
let swipe = null;
canvas.addEventListener('pointerdown', (e) => { if (G.mode === 'chars') swipe = { x: e.clientX, id: e.pointerId }; });
canvas.addEventListener('pointerup', (e) => { if (G.mode === 'chars' && swipe && swipe.id === e.pointerId) { const dx = e.clientX - swipe.x; if (Math.abs(dx) > 40) charsMove(dx < 0 ? 1 : -1); swipe = null; } });
const on = (id, fn) => $(id).addEventListener('click', (e) => { AU.init(); fn(e); });
on('bChars', openChars); on('bCPrev', () => charsMove(-1)); on('bCNext', () => charsMove(1));
$('cDots').addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (!b) return; AU.init(); cIdx = +b.dataset.i; AU.select(); renderChars(); });
on('bCBack', () => { AU.click(); setChar(save.owned[PLAYERS[cIdx].id] ? PLAYERS[cIdx].id : save.char); G.mode = 'menu'; show('sTitle'); refreshTitle(); });
on('bCPick', async () => {
  const p = PLAYERS[cIdx];
  if (!save.owned[p.id]) {
    if (save.coins < p.price) { AU.nope(); $('bCPick').animate([{ transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 220 }); $('cStats').innerHTML = `<span class="lk">Te faltan ${fmt(p.price - save.coins)} monedas</span>`; return; }
    save.coins -= p.price; save.owned[p.id] = true; AU.unlock(); flash('good'); parts.burst(G.px, 2 * G.Rv, G.pz, 40, { color: [0xffd23f, 0xff74c4, 0x3fe0b0, 0x4aa8ff, 0xffffff], speed: 8, size: 0.6, life: 1.2, shape: 1, g: 4, up: 4 }); toast('¡' + p.name + ' desbloqueada!', '');
    save.char = p.id; ch = p; UT = null; persist(); renderChars(); return; // ahora el botón pasa a ser ¡A LIMPIAR!
  }
  setChar(p.id, true); persist(); AU.select(); AU.speak(p.start, p.voice.pitch, p.voice.rate);
  if (PLi >= save.unlocked) await enterPlace(save.unlocked - 1); // si el lugar elegido está bloqueado, vamos al último abierto
  startRound();
});
on('bPlay', startRound); on('bShop', () => openShop('sTitle')); on('bHelp', () => { show('sHelp'); AU.click(); });
on('bHelpOk', () => { show('sTitle'); AU.click(); save.tut = save.tut; });
on('bPause', pauseGame); on('bResume', resumeGame); on('bQuit', () => { AU.click(); toMenu(); });
on('bRAgain', startRound); on('bRShop', () => openShop('sResults')); on('bRMenu', () => { AU.click(); toMenu(); });
on('bSBack', () => { AU.click(); setChar(save.char); if (shopFrom === 'sResults') show('sResults'); else if (shopFrom === 'sPlaceDone') show('sPlaceDone'); else show('sTitle'); refreshTitle(); }); on('bSGo', () => { setChar(save.char); startRound(); });
on('bShPrev', () => shopMove(-1)); on('bShNext', () => shopMove(1));
// lugares
const placeMove = (d) => { const i = PLi + d; if (i < 0 || i >= PLACES.length || G.mode === 'travel') return; AU.select(); travelTo(i, false); };
on('bPPrev', () => placeMove(-1)); on('bPNext', () => placeMove(1));
on('bPdGo', (e) => { const n = +e.target.dataset.next; if (n >= 0) travelTo(n, true); else { AU.click(); toMenu(); } });
on('bPdMenu', () => { AU.click(); toMenu(); }); on('bPdShop', () => openShop('sPlaceDone'));
window.addEventListener('pagehide', persist);
const togSfx = () => { AU.setSfx(!AU.S.sfxOn); AU.setVoice(AU.S.sfxOn); refreshTitle(); $('bPSfx').classList.toggle('off', !AU.S.sfxOn); AU.click(); };
const togMus = () => { AU.setMusic(!AU.S.musicOn); refreshTitle(); $('bPMus').classList.toggle('off', !AU.S.musicOn); AU.click(); };
on('bSfx', togSfx); on('bMus', togMus); on('bPSfx', togSfx); on('bPMus', togMus);
// música desde el primer toque
window.addEventListener('pointerdown', () => { AU.init(); AU.startMusic(G.mode === 'play' || G.mode === 'count' ? 'game' : 'menu'); }, { once: true });

// ---------- bucle ----------
let last = 0, acc = 0, fAvg = 16, slowN = 0, fastN = 0;
function draw(dt) { if (composer && bloomOn) composer.render(dt); else renderer.render(scene, camera); }
function frame(now) {
  requestAnimationFrame(frame);
  if (!last) last = now; let dt = Math.min(0.05, (now - last) / 1000); last = now;
  const tOn = !!title && G.mode === 'menu';
  if (title && title.active !== tOn) title.setActive(tOn, ch.id);
  if (tOn) { if (frameNo++ % 20 === 0 || !title.insOk) { title.insOk = 1; title.setInsets(titleInsets()); } if (titleStar !== ch.id) { titleStar = ch.id; title.setStar(ch.id); title.theme(ch.theme); } G.t += dt; title.update(dt); title.render(renderer); }
  else { if (G.mode !== 'pause') step(dt); else { G.t += 0; updateFx(0); } draw(dt); }
  // resolución adaptativa
  fAvg = fAvg * 0.95 + dt * 1000 * 0.05;
  if (fAvg > 27 && qLevel < 3 && !window.NOADAPT) { if (++slowN > 60) { qLevel++; if (qLevel === 1) bloomOn = false; else if (qLevel === 2) setOutlines(false); else sun.castShadow = false; slowN = 0; fAvg = 16; } }
  else if (fAvg > 24) { if (++slowN > 90 && pixelRatio > 1.0) { pixelRatio = Math.max(1.0, pixelRatio * 0.88); resize(); slowN = 0; fAvg = 16; } } else slowN = 0;
  if (fAvg < 13 && pixelRatio < pixelCap) { if (++fastN > 400) { pixelRatio = Math.min(pixelCap, pixelRatio * 1.1); resize(); fastN = 0; } } else fastN = 0;
}
// API para pruebas
function advance(sec, bot) { const n = Math.round(sec * 60); const b = G.bot; if (bot !== undefined) G.bot = bot; for (let i = 0; i < n; i++) { botT -= 0; step(1 / 60); } G.bot = b; draw(0.016); }
window.DR = { charScreenBox, get scenery() { return scenery; }, G, save, PLAYERS, NPC, X, setChar, openChars, renderChars, get ch() { return ch; }, get landmarks() { return landmarks; }, get composer() { return composer; }, set bloomOn(v) { bloomOn = v; }, get bloomOn() { return bloomOn; }, get qLevel() { return qLevel; }, cull, drawMini, charsMove, step, advance, startRound, endRound, buildWorld, swallow, get props() { return props; }, get movers() { return movers; }, get alc() { return alc; }, get sucked() { return sucked; }, get pickups() { return pickups; }, parts, renderer, scene, camera, joy, toMenu, upCost, STATS, upList, UPMAX, PLACES, get PL() { return PL; }, get PLi() { return PLi; }, enterPlace, travelTo, completePlace, showPlaceDone, prog, progOf, persist, doPulse, get UT() { return ut(); }, resetUT() { UT = null; }, refreshTitle, get pixelRatio() { return pixelRatio; }, spawnAlcalde, resetDemo, showResults };

function initLogo() {
  const L = document.querySelector('#sTitle .logo'); if (!L) return; L.setAttribute('aria-label', 'Doña Remolina'); let n = 0;
  for (const c of ['l1', 'l2']) { const e = L.querySelector('.' + c), tx = e.textContent; e.setAttribute('aria-hidden', 'true'); e.innerHTML = [...tx].map((ch2) => `<span style="--i:${n++};--r:${n % 2 ? 1 : -1}">${ch2}</span>`).join(''); }
  L.addEventListener('pointerdown', (e) => { e.stopPropagation(); AU.init(); AU.select(); L.classList.remove('squish'); void L.offsetWidth; L.classList.add('squish'); if (title && title.active) title.air(e.clientX, e.clientY); });
}
async function boot() {
  initLogo();
  const lf = $('lbarFill'), lt = $('loadTxt'); const tick = (p, t) => { lf.style.width = p + '%'; if (t) lt.textContent = t; return new Promise((r) => setTimeout(r, 16)); };
  await tick(5, 'Poniendo el parqué…'); await enterPlace(PLi, (p, t) => tick(p * 0.75, t));
  await tick(78, 'Barriendo ' + PL.name + '…'); buildWorld((Math.random() * 1e9) | 0);
  await tick(88, 'Peinando a las limpiadoras…'); for (const p of PLAYERS) modelCache[p.id] || (modelCache[p.id] = p.make()); resetDemo(); G.Rv = G.R = 0.9;
  title = makeTitle({ getModel: (id) => modelCache[id] || (modelCache[id] = PLAYER_BY_ID[id].make()), popHost: $('tpops'), bubHost: $('tbubs') }); window.DR_title = title; title.setActive(true, ch.id); title.setActive(false); title.resize(window.innerWidth, window.innerHeight, pixelRatio);
  renderer.compile(scene, camera); renderer.compile(title.scene, title.camera); step(0.016); draw(0.016);
  await tick(100, '¡Lista!'); toMenu(); G.demoT = 0;
  setTimeout(() => $('loading').classList.add('out'), 200); setTimeout(() => $('loading').remove(), 900);
  requestAnimationFrame(frame);
}
boot();
