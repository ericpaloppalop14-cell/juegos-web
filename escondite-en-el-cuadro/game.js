import * as THREE from 'three';
import { ONLINE_DISPONIBLE } from './net.js';
const VERSION = 1;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
// autoactualización
fetch('./version.json?t=' + Date.now(), { cache: 'no-store' }).then(r => r.json()).then(j => { if (j.v > VERSION && sessionStorage.getItem('ec_rl') !== String(j.v)) { sessionStorage.setItem('ec_rl', String(j.v)); toast('✨ ¡Versión nueva!', 'actualizando…', 1500); setTimeout(() => location.replace(location.pathname + '?v=' + j.v), 1200); } }).catch(() => { });
const SAVE_KEY = 'escondite-cuadro';
const save = { muted: false, best: 0, wins: 0 };
try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) { }
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { } };
// audio alegre sintetizado
let AC, master, musicG, noiseBuf, musicT = 0, musicStep = 0, musicMode = 'calm';
function audioInit() { if (AC) { if (AC.state === 'suspended') AC.resume(); return; } try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = save.muted ? 0 : .6; master.connect(AC.destination); musicG = AC.createGain(); musicG.gain.value = .13; musicG.connect(master); } catch (e) { } }
function env(g, t, a, d, v) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); }
function osc(type, f, a, d, v, f2, dest, t0) { if (!AC) return; const t = t0 || AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d); env(g, t, a, d, v); o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + a + d + .05); }
function noise(d, v, fq, q) { if (!AC) return; if (!noiseBuf) { noiseBuf = AC.createBuffer(1, AC.sampleRate * .5, AC.sampleRate); const c = noiseBuf.getChannelData(0); for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1; } const t = AC.currentTime, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = fq; f.Q.value = q || 1; env(g, t, .002, d, v); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + d + .05); }
const S = {
  pop: () => osc('sine', 500, .005, .12, .4, 1100),
  tap: () => osc('triangle', 880, .003, .07, .25, 1300),
  drop: () => { osc('sine', 1200, .005, .18, .35, 400); osc('sine', 1800, .01, .1, .15, 900); },
  paint: () => { noise(.25, .25, 2400, 2); osc('sine', 600, .01, .2, .2, 1200); },
  pose: () => { osc('square', 300, .005, .08, .12, 600); osc('sine', 700, .02, .1, .2, 300); },
  shoot: () => { osc('sawtooth', 1600, .002, .18, .18, 300); noise(.12, .2, 3000, 3); },
  splat: () => { noise(.3, .5, 600, .8); osc('sine', 200, .005, .25, .4, 60); },
  ay: () => { osc('triangle', 700, .01, .1, .4, 1400); if (AC) osc('triangle', 1400, .01, .35, .35, 500, null, AC.currentTime + .1); },
  sneeze: () => { osc('sine', 500, .05, .15, .2, 900); setTimeout(() => noise(.25, .35, 1800, .7), 260); },
  boing: () => osc('sine', 180, .005, .35, .45, 520),
  tick: () => osc('square', 1500, .001, .03, .08),
  fanfare: () => { if (!AC) return; const t = AC.currentTime;[523, 659, 784, 1047, 784, 1047].forEach((f, i) => { osc('triangle', f, .01, .22, .3, 0, null, t + i * .11); osc('sine', f * 2, .01, .18, .08, 0, null, t + i * .11); }); },
  fail: () => { if (!AC) return; const t = AC.currentTime;[523, 494, 466, 392].forEach((f, i) => osc('triangle', f, .01, .28, .25, f * .97, null, t + i * .2)); },
  hmm: () => osc('sine', 220, .05, .4, .25, 180),
  tension: () => osc('sine', 98, .02, .6, .25, 92),
};
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
function musicTick(dt) { if (!AC || save.muted) return; musicT -= dt; if (musicT > 0) return; const fast = musicMode === 'seek'; musicT = fast ? .19 : .26; const st = musicStep++; const base = fast ? 293.66 : 261.63; const t = AC.currentTime;
  if (st % 2 === 0 || Math.random() < .3) { const n = SCALE[(st * 3 + (st >> 3)) % SCALE.length]; osc('triangle', base * Math.pow(2, n / 12), .01, .22, .22, 0, musicG, t); }
  if (st % 4 === 0) osc('sine', base / 2 * Math.pow(2, [0, 5, 7, 3][(st >> 4) % 4] / 12), .01, .4, .35, 0, musicG, t);
  if (fast && st % 2 === 1) osc('square', 2400, .001, .02, .04, 0, musicG, t); }
// renderer
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const DPR = Math.min(window.devicePixelRatio || 1, 2.5);
let quality = Math.min(DPR, 2); renderer.setPixelRatio(quality);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, .1, 400);
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 68 : 55; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const hemi = new THREE.HemisphereLight(0xffffff, 0xffd0f0, 1.1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff4e0, 2.3); sun.position.set(14, 26, 10); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 80 }); sun.shadow.bias = -.0004; sun.shadow.normalBias = .03; sun.shadow.radius = 4; scene.add(sun); scene.add(sun.target);
const rim = new THREE.DirectionalLight(0xc9b0ff, .7); rim.position.set(-12, 8, -14); scene.add(rim);
// texturas
const texCache = new Map();
function patTex(pat, c1, c2, rep = 1) {
  const k = pat + c1 + c2 + rep; if (texCache.has(k)) return texCache.get(k);
  const s = 256, cv = document.createElement('canvas'); cv.width = cv.height = s; const x = cv.getContext('2d');
  x.fillStyle = c1; x.fillRect(0, 0, s, s); x.fillStyle = c2;
  if (pat === 'rayas') { for (let i = -s; i < s * 2; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 32, 0); x.lineTo(i + 32 - s * .5, s); x.lineTo(i - s * .5, s); x.fill(); } }
  else if (pat === 'lunares') { for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(i * 64 + (j % 2) * 32, j * 64 + 32, 15, 0, 7); x.fill(); } }
  else if (pat === 'cuadros') { for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if ((i + j) % 2) x.fillRect(i * 64, j * 64, 64, 64); }
  x.globalAlpha = .07; for (let i = 0; i < 60; i++) { x.fillStyle = Math.random() < .5 ? '#fff' : '#000'; x.fillRect(Math.random() * s, Math.random() * s, rnd(10, 40), 3); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 8; texCache.set(k, t); return t;
}
function gradTex(stops) { const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256; const x = cv.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 256); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); x.fillStyle = g; x.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; }
function splatTex(col) { const k = 'sp' + col; if (texCache.has(k)) return texCache.get(k); const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'); x.fillStyle = col; x.beginPath(); x.arc(64, 64, 34, 0, 7); x.fill(); for (let i = 0; i < 10; i++) { const a = Math.random() * 7, r = rnd(34, 58); x.beginPath(); x.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, rnd(4, 11), 0, 7); x.fill(); } const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; texCache.set(k, t); return t; }
const M = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .55, metalness: 0 }, o));
const PM = (pat, c1, c2, rep, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ map: patTex(pat, c1, c2, rep), roughness: .6 }, o));
const tmpA = new THREE.Color(), tmpB = new THREE.Color();
function colSim(a, b) { tmpA.set(a); tmpB.set(b); const d = Math.hypot(tmpA.r - tmpB.r, tmpA.g - tmpB.g, tmpA.b - tmpB.b); return clamp(1 - d / .75, 0, 1); }
// ---------- mundo ----------
let world = new THREE.Group(); scene.add(world);
let props = [], ground = null, groundPal = null, decor = [], hitMeshes = [], HALF = 20, curCuadro = 0;
function shadowAll(o) { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); }
function addProp(g, x, z, r, pal, name) { g.position.set(x, 0, z); shadowAll(g); world.add(g); const p = Object.assign({ x, z, r, g, name }, pal); g.traverse(m => { if (m.isMesh) { m.userData.prop = p; hitMeshes.push(m); } }); props.push(p); return p; }
const lathe = (pts, seg = 40) => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg);
function face(g, y, z, s = 1, col = '#3a2050') {
  const e = M(col, { roughness: .3 }); for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.SphereGeometry(.09 * s, 16, 12), e); m.position.set(sx * .22 * s, y, z); m.scale.z = .5; g.add(m); const h = new THREE.Mesh(new THREE.SphereGeometry(.03 * s, 8, 6), M('#fff', { emissive: '#fff' })); h.position.set(sx * .22 * s + .03 * s, y + .04 * s, z + .04 * s); g.add(h); const ck = new THREE.Mesh(new THREE.CircleGeometry(.07 * s, 16), M('#ff8fb8', { transparent: true, opacity: .7 })); ck.position.set(sx * .36 * s, y - .1 * s, z + .01); g.add(ck); }
  const sm = new THREE.Mesh(new THREE.TorusGeometry(.08 * s, .02 * s, 8, 16, Math.PI), e); sm.rotation.z = Math.PI; sm.position.set(0, y - .07 * s, z); g.add(sm); }
const CUADROS = [
  { id: 'girasoles', name: 'Jardín de Girasoles Cantores', sky: ['#7fd3ff', '#bfeaff', '#fff3c4'], fog: '#cfefff', gpal: { c1: '#7ed957', c2: '#5fbf3f', pat: 'rayas', pose: 'plana', name: 'la hierba' }, light: '#fff4e0', hemiG: '#c9f7a0', build: buildGirasoles },
  { id: 'caramelo', name: 'Mar de Caramelo', sky: ['#ff9fd6', '#ffd1ea', '#fff0c8'], fog: '#ffd6ee', gpal: { c1: '#ffe0a3', c2: '#ffc56b', pat: 'lunares', pose: 'plana', name: 'la arena de azúcar' }, light: '#fff0f6', hemiG: '#ffd3a8', build: buildCaramelo },
  { id: 'cubos', name: 'Ciudad de Cubos Saltarines', sky: ['#9fa8ff', '#c9c4ff', '#ffe3f5'], fog: '#d9d4ff', gpal: { c1: '#ffffff', c2: '#a0e7ff', pat: 'cuadros', pose: 'plana', name: 'el suelo' }, light: '#ffffff', hemiG: '#d0f0ff', build: buildCubos },
  { id: 'retrato', name: 'Retrato del Señor Bigotón', sky: ['#ffcf8f', '#ffe7c2', '#fff8ea'], fog: '#ffe8cc', gpal: { c1: '#ffcfb0', c2: '#ffb894', pat: 'liso', pose: 'plana', name: 'la mejilla' }, light: '#fff6ea', hemiG: '#ffd9c0', build: buildRetrato },
];
function buildBase(cd) {
  scene.remove(world); world.traverse(o => { if (o.geometry) o.geometry.dispose(); }); world = new THREE.Group(); scene.add(world); props = []; hitMeshes = []; decor = [];
  const sky = new THREE.Mesh(new THREE.SphereGeometry(180, 32, 16), new THREE.MeshBasicMaterial({ map: gradTex(cd.sky), side: THREE.BackSide, fog: false })); world.add(sky);
  scene.fog = new THREE.Fog(cd.fog, 45, 150); hemi.groundColor.set(cd.hemiG); sun.color.set(cd.light);
  groundPal = cd.gpal; ground = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2 + 2, HALF * 2 + 2), PM(groundPal.pat, groundPal.c1, groundPal.c2, 10)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.userData.ground = true; world.add(ground); hitMeshes.push(ground);
  const fm = M('#ffcf4a', { metalness: .65, roughness: .28 }), fm2 = M('#e09a20', { metalness: .6, roughness: .35 });
  for (let i = 0; i < 4; i++) { const b = new THREE.Group(); const m1 = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2 + 5, 1.6, 1.6), fm); m1.position.y = .8; b.add(m1); const m2 = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2 + 5, .5, .5), fm2); m2.position.set(0, 1.75, -.3); b.add(m2); for (let k = -4; k <= 4; k++) { const o = new THREE.Mesh(new THREE.SphereGeometry(.38, 14, 10), fm2); o.position.set(k * 4.8, 1.6, .55); b.add(o); } const a = i * Math.PI / 2; b.position.set(Math.sin(a) * (HALF + 1.8), 0, Math.cos(a) * (HALF + 1.8)); b.rotation.y = a; shadowAll(b); world.add(b); }
  const out = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 9, HALF * 9), PM('cuadros', '#b49cff', '#9a7cff', 30)); out.rotation.x = -Math.PI / 2; out.position.y = -.06; out.receiveShadow = true; world.add(out);
  const n = 160, pg = new THREE.BufferGeometry(), pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = rnd(-35, 35); pos[i * 3 + 1] = rnd(1, 16); pos[i * 3 + 2] = rnd(-35, 35); } pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: .35, color: '#fffbd0', transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false, map: dotTex() })); world.add(pts); decor.push({ o: pts, f: (o, t) => { o.rotation.y = t * .02; o.position.y = Math.sin(t * .5) * .4; } });
}
let _dot; function dotTex() { if (_dot) return _dot; const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, '#fff'); g.addColorStop(.4, 'rgba(255,255,220,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); _dot = new THREE.CanvasTexture(cv); return _dot; }
function scatter(n, minD, f) { const pts = []; let tries = 0; while (pts.length < n && tries++ < 3000) { const x = rnd(-HALF + 2, HALF - 2), z = rnd(-HALF + 2, HALF - 2); if (Math.hypot(x, z) < 3.5) continue; if (Math.abs(x) < 3 && z < -HALF + 6) continue; if (pts.every(p => Math.hypot(p[0] - x, p[1] - z) > minD)) pts.push([x, z]); } pts.forEach((p, i) => f(p[0], p[1], i)); }
const freeAt = (x, z, d) => !props.some(p => Math.hypot(p.x - x, p.z - z) < d + p.r);
function clouds(c) { const m = M(c, { roughness: 1, emissive: c, emissiveIntensity: .25 }); for (let i = 0; i < 9; i++) { const g = new THREE.Group(); for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(rnd(2.5, 4), 16, 10), m); b.position.set(k * 3 - 4.5, rnd(-.5, .8), rnd(-1, 1)); g.add(b); } const a = rnd(0, 6.28), r = rnd(60, 100); g.position.set(Math.cos(a) * r, rnd(18, 36), Math.sin(a) * r); world.add(g); decor.push({ o: g, f: (o, t) => { o.position.y += Math.sin(t * .3 + a) * .005; } }); } }
// 1. Girasoles
function sunflower(s) { const g = new THREE.Group(); const h = 2.4 * s; const st = new THREE.Mesh(new THREE.CylinderGeometry(.13 * s, .18 * s, h, 10), PM('rayas', '#4fbf3f', '#3a9f30', 1)); st.position.y = h / 2; g.add(st);
  for (const sx of [-1, 1]) { const lf = new THREE.Mesh(new THREE.SphereGeometry(.4 * s, 12, 8), M('#5fcf4a')); lf.scale.set(1, .2, .5); lf.position.set(sx * .4 * s, h * .45, 0); lf.rotation.z = sx * .4; g.add(lf); }
  const head = new THREE.Group(); head.position.set(0, h + .2 * s, .1 * s); const ctr = new THREE.Mesh(new THREE.CylinderGeometry(.55 * s, .55 * s, .25 * s, 28), PM('lunares', '#ffd23f', '#a0521f', 1)); ctr.rotation.x = Math.PI / 2; head.add(ctr);
  const pm = M('#ffd23f', { roughness: .45 }); for (let i = 0; i < 14; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(.32 * s, 10, 8), pm); const a = i / 14 * Math.PI * 2; p.scale.set(.45, 1, .2); p.position.set(Math.cos(a) * .78 * s, Math.sin(a) * .78 * s, -.02); p.rotation.z = a - Math.PI / 2; head.add(p); }
  face(head, .05 * s, .14 * s, 1.6 * s, '#5a2a10'); g.add(head); g.userData.head = head; return g; }
function ladybug(s) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(.9 * s, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2), PM('lunares', '#ff4f5a', '#2a1a30', 2)); g.add(b); const hd = new THREE.Mesh(new THREE.SphereGeometry(.4 * s, 18, 12), M('#2a1a30')); hd.position.set(0, .25 * s, .85 * s); g.add(hd); face(hd, .05 * s, .35 * s, s * .9, '#fff'); return g; }
function mushroom(s, c1, c2) { const g = new THREE.Group(); const st = new THREE.Mesh(new THREE.CylinderGeometry(.3 * s, .4 * s, 1 * s, 14), M('#fff5e6')); st.position.y = .5 * s; g.add(st); const cap = new THREE.Mesh(new THREE.SphereGeometry(.85 * s, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), PM('lunares', c1, c2, 2)); cap.position.y = .9 * s; cap.scale.y = .8; g.add(cap); face(g, .55 * s, .36 * s, s * .9); return g; }
function bush(s, c) { const g = new THREE.Group(); const m = M(c, { roughness: .8 }); [[0, .7, 0, 1], [.6, .5, .2, .7], [-.6, .5, -.1, .75], [.1, 1.2, -.1, .65]].forEach(([x, y, z, r]) => { const b = new THREE.Mesh(new THREE.SphereGeometry(r * s, 18, 12), m); b.position.set(x * s, y * s, z * s); g.add(b); }); return g; }
function buildGirasoles() {
  scatter(16, 3.4, (x, z) => { const s = rnd(.85, 1.25); const g = sunflower(s); g.rotation.y = rnd(-.6, .6); const p = addProp(g, x, z, .5 * s, { c1: '#ffd23f', c2: '#a0521f', pat: 'lunares', pose: 'alta' }, 'un girasol'); p.sway = rnd(0, 6); });
  scatter(7, 5, (x, z) => { if (!freeAt(x, z, 1.4)) return; addProp(ladybug(rnd(.9, 1.2)), x, z, 1.0, { c1: '#ff4f5a', c2: '#2a1a30', pat: 'lunares', pose: 'bolita' }, 'una mariquita'); });
  scatter(8, 4.5, (x, z) => { if (!freeAt(x, z, 1.4)) return; const c = pick([['#4fa8ff', '#ffffff'], ['#b77bff', '#fff6a8']]); addProp(mushroom(rnd(.9, 1.3), c[0], c[1]), x, z, .55, { c1: c[0], c2: c[1], pat: 'lunares', pose: 'bolita' }, 'una seta'); });
  scatter(8, 4.5, (x, z) => { if (!freeAt(x, z, 1.4)) return; addProp(bush(rnd(.9, 1.2), '#46c46a'), x, z, 1.1, { c1: '#46c46a', c2: '#46c46a', pat: 'liso', pose: 'bolita' }, 'un arbusto'); });
  const sunG = new THREE.Group(); const sb = new THREE.Mesh(new THREE.SphereGeometry(7, 32, 20), new THREE.MeshBasicMaterial({ color: '#ffe066', fog: false })); sunG.add(sb); face(sunG, 0, 6.6, 18, '#d07a00'); sunG.position.set(-40, 42, -90); sunG.lookAt(0, 0, 0); world.add(sunG); decor.push({ o: sunG, f: (o, t) => { o.position.y = 42 + Math.sin(t * .4) * 1.5; } });
  clouds('#ffffff');
}
// 2. Caramelo
function lollipop(s, c1, c2) { const g = new THREE.Group(); const st = new THREE.Mesh(new THREE.CylinderGeometry(.09 * s, .09 * s, 2.4 * s, 8), M('#fff')); st.position.y = 1.2 * s; g.add(st); const d = new THREE.Group(); d.position.y = 2.7 * s; const disc = new THREE.Mesh(new THREE.CylinderGeometry(.85 * s, .85 * s, .3 * s, 32), PM('rayas', c1, c2, 1, { roughness: .25 })); disc.rotation.x = Math.PI / 2; d.add(disc); face(d, 0, .17 * s, 1.4 * s); g.add(d); return g; }
function gumdrop(s, c) { const g = new THREE.Group(); const b = new THREE.Mesh(lathe([[0, 0], [.8, 0], [.85, .2], [.75, .7], [.45, 1.05], [0, 1.15]].map(p => [p[0] * s, p[1] * s])), M(c, { roughness: .2, emissive: c, emissiveIntensity: .12 })); g.add(b); face(g, .55 * s, .72 * s, s); return g; }
function donut(s, c1, c2) { const g = new THREE.Group(); const d = new THREE.Mesh(new THREE.TorusGeometry(.8 * s, .38 * s, 18, 32), PM('lunares', c1, c2, 3, { roughness: .35 })); d.rotation.x = Math.PI / 2; d.position.y = .38 * s; g.add(d); return g; }
function buildCaramelo() {
  scatter(14, 3.2, (x, z) => { const c = pick([['#ff6fb5', '#ffffff'], ['#3fd1b5', '#ffffff'], ['#ffb03d', '#fff3a0']]); const g = lollipop(rnd(.9, 1.2), c[0], c[1]); g.rotation.y = rnd(-1, 1); const p = addProp(g, x, z, .4, { c1: c[0], c2: c[1], pat: 'rayas', pose: 'alta' }, 'una piruleta'); p.sway = rnd(0, 6); });
  scatter(14, 3.2, (x, z) => { if (!freeAt(x, z, 1.2)) return; const c = pick(['#ff5f8f', '#7a5cff', '#3fd1b5', '#ffd23f', '#ff9f3d']); addProp(gumdrop(rnd(.9, 1.3), c), x, z, .9, { c1: c, c2: c, pat: 'liso', pose: 'bolita' }, 'una gominola'); });
  scatter(8, 4.5, (x, z) => { if (!freeAt(x, z, 1.4)) return; const c = pick([['#ffb3dc', '#7a5cff'], ['#a0e7ff', '#ff5f8f']]); addProp(donut(rnd(1, 1.3), c[0], c[1]), x, z, 1.3, { c1: c[0], c2: c[1], pat: 'lunares', pose: 'plana' }, 'un donut'); });
  const sea = new THREE.Mesh(new THREE.TorusGeometry(52, 12, 12, 64), M('#ffa94d', { roughness: .15, metalness: .1 })); sea.rotation.x = Math.PI / 2; sea.position.y = -9; world.add(sea);
  for (let i = 0; i < 7; i++) { const j = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(2, 24, 14, 0, 6.3, 0, Math.PI / 2), M(pick(['#c9a0ff', '#ff9fd6', '#9ff5e4']), { transparent: true, opacity: .85, roughness: .1, emissive: '#ffffff', emissiveIntensity: .15 })); j.add(b); face(j, .9, 1.75, 3); const a = i / 7 * 6.28; j.position.set(Math.cos(a) * 40, rnd(8, 16), Math.sin(a) * 40); j.lookAt(0, j.position.y, 0); world.add(j); const y0 = j.position.y; decor.push({ o: j, f: (o, t) => { o.position.y = y0 + Math.sin(t * 1.2 + a) * 1.2; o.scale.y = 1 + Math.sin(t * 2 + a) * .12; } }); }
  clouds('#ffd1ea');
}
// 3. Cubos
function building(w, h, c1, c2) { const g = new THREE.Group(); const tex = patTex('cuadros', c1, c2, 1).clone(); tex.repeat.set(1, h / w); tex.needsUpdate = true; const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), new THREE.MeshStandardMaterial({ map: tex, roughness: .5 })); b.position.y = h / 2; g.add(b); const top = new THREE.Mesh(new THREE.BoxGeometry(w * 1.08, .25, w * 1.08), M(c2)); top.position.y = h + .1; g.add(top); face(g, h * .72, w / 2 + .01, w * .9, '#2a1a50'); return g; }
function dice(s) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(1.3 * s, 1.3 * s, 1.3 * s), PM('lunares', '#ffffff', '#ff5f8f', 1, { roughness: .3 })); b.position.y = .65 * s; g.add(b); return g; }
function buildCubos() {
  scatter(14, 3.6, (x, z) => { const c = pick([['#ff6fb5', '#ffd1ea'], ['#3fd1b5', '#d4fff6'], ['#ffd23f', '#fff6c8'], ['#7a5cff', '#d9c4ff']]); const w = rnd(1.4, 2), h = rnd(2.4, 4.4); const g = building(w, h, c[0], c[1]); g.rotation.y = pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]); const p = addProp(g, x, z, w * .72, { c1: c[0], c2: c[1], pat: 'cuadros', pose: 'alta' }, 'un edificio'); p.hop = rnd(0, 6); });
  scatter(12, 3, (x, z) => { if (!freeAt(x, z, 1.2)) return; const g = dice(rnd(.9, 1.2)); g.rotation.y = rnd(0, 3); addProp(g, x, z, .9, { c1: '#ffffff', c2: '#ff5f8f', pat: 'lunares', pose: 'bolita' }, 'un dado'); });
  scatter(8, 4.5, (x, z) => { if (!freeAt(x, z, 1.4)) return; const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(2.2, .25, 2.2), PM('rayas', '#ff9f3d', '#ffffff', 1)); m.position.y = .12; g.add(m); addProp(g, x, z, 1.2, { c1: '#ff9f3d', c2: '#ffffff', pat: 'rayas', pose: 'plana' }, 'una alfombra'); });
  for (let i = 0; i < 26; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), M(pick(['#ff6fb5', '#3fd1b5', '#ffd23f', '#7a5cff', '#a0e7ff']), { emissive: '#ffffff', emissiveIntensity: .12 })); const s = rnd(2, 6); c.scale.setScalar(s); const a = rnd(0, 6.28), r = rnd(45, 90); c.position.set(Math.cos(a) * r, rnd(6, 40), Math.sin(a) * r); world.add(c); decor.push({ o: c, f: (o, t) => { o.rotation.x = t * .2 + a; o.rotation.y = t * .15; } }); }
}
// 4. Retrato
function pearl(s) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(.8 * s, 28, 18), M('#fff8f0', { roughness: .12, metalness: .25 })); b.position.y = .8 * s; g.add(b); return g; }
function button(s, c1, c2) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(1 * s, 1 * s, .3 * s, 32), PM('lunares', c1, c2, 1)); b.position.y = .15 * s; g.add(b); return g; }
function curl(s) { const g = new THREE.Group(); const m = PM('rayas', '#8a4a2a', '#b06a3a', 1); for (let k = 0; k < 3; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(.6 * s, .28 * s, 12, 24), m); t.position.y = .4 * s + k * .75 * s; t.rotation.x = Math.PI / 2; t.rotation.z = k; g.add(t); } return g; }
function lipstick(s) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(.45 * s, .45 * s, 1.6 * s, 20), M('#ffcf4a', { metalness: .6, roughness: .3 })); b.position.y = .8 * s; g.add(b); const t = new THREE.Mesh(new THREE.CylinderGeometry(.3 * s, .38 * s, 1.1 * s, 20), M('#ff3f6f', { roughness: .3 })); t.position.y = 2.1 * s; g.add(t); face(g, 1.0 * s, .46 * s, s * .9); return g; }
function buildRetrato() {
  scatter(11, 3.5, (x, z) => addProp(pearl(rnd(.9, 1.2)), x, z, .85, { c1: '#fff8f0', c2: '#fff8f0', pat: 'liso', pose: 'bolita' }, 'una perla'));
  scatter(10, 3.5, (x, z) => { if (!freeAt(x, z, 1.4)) return; const c = pick([['#4f8aff', '#ffffff'], ['#ff6fb5', '#ffffff']]); addProp(button(rnd(.9, 1.2), c[0], c[1]), x, z, 1.05, { c1: c[0], c2: c[1], pat: 'lunares', pose: 'plana' }, 'un botón'); });
  scatter(9, 3.5, (x, z) => { if (!freeAt(x, z, 1.4)) return; const p = addProp(curl(rnd(.9, 1.1)), x, z, .9, { c1: '#8a4a2a', c2: '#b06a3a', pat: 'rayas', pose: 'alta' }, 'un rizo de bigote'); p.sway = rnd(0, 6); });
  scatter(8, 3.5, (x, z) => { if (!freeAt(x, z, 1.2)) return; addProp(lipstick(rnd(.9, 1.2)), x, z, .5, { c1: '#ff3f6f', c2: '#ffcf4a', pat: 'liso', pose: 'alta' }, 'un pintalabios'); });
  const F = new THREE.Group(); const hd = new THREE.Mesh(new THREE.SphereGeometry(22, 40, 28), M('#ffcfb0', { roughness: .7 })); F.add(hd);
  const lids = []; for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(4.5, 24, 16), M('#ffffff', { roughness: .2 })); e.position.set(sx * 8, 5, 19); F.add(e); const ir = new THREE.Mesh(new THREE.SphereGeometry(2.4, 20, 14), M('#3f7aff')); ir.position.set(sx * 8, 5, 22.4); F.add(ir); const pu = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 10), M('#1a1030')); pu.position.set(sx * 8, 5, 24.2); F.add(pu); lids.push(e, ir, pu); }
  for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(2, 7, 8, 16), M('#8a4a2a')); m.position.set(sx * 5.5, -5, 20.5); m.rotation.z = sx * 1.25; F.add(m); const tip = new THREE.Mesh(new THREE.TorusGeometry(1.6, .9, 10, 20), M('#8a4a2a')); tip.position.set(sx * 10.5, -2.5, 19.5); F.add(tip); }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(3.5, 20, 14), M('#ff9f8a')); nose.position.set(0, 0, 22); F.add(nose);
  for (const sx of [-1, 1]) { const ck = new THREE.Mesh(new THREE.SphereGeometry(3.2, 16, 12), M('#ff9fb0', { transparent: true, opacity: .6 })); ck.position.set(sx * 13, -2, 16); F.add(ck); }
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(14, 16, 14, 32), M('#7a5cff')); hat.position.y = 24; F.add(hat); const band = new THREE.Mesh(new THREE.CylinderGeometry(16.2, 16.2, 3, 32), M('#ff6fb5')); band.position.y = 18.5; F.add(band);
  F.position.set(0, 28, -95); world.add(F); decor.push({ o: F, f: (o, t) => { const bl = (t % 4.5) < .15 ? .1 : 1; lids.forEach(e => e.scale.y = bl); o.rotation.z = Math.sin(t * .3) * .05; } });
  clouds('#fff3e6');
}
// ---------- personajes ----------
const dropGeo = (() => { const pts = []; for (let i = 0; i <= 28; i++) { const a = i / 28 * Math.PI; const x = .62 * Math.sin(a) * Math.pow(Math.sin(a / 2), .8), y = .66 * (1 + Math.cos(a)); pts.push(new THREE.Vector2(Math.max(x, .0001), y)); } pts.reverse(); return new THREE.LatheGeometry(pts, 48); })();
const POSES = ['bolita', 'alta', 'plana', 'tumbada'];
const POSE_N = { bolita: 'Bolita', alta: 'Alta', plana: 'Plana', tumbada: 'Tumbada' };
const POSE_S = { bolita: [1.25, .85, 1.25], alta: [.8, 1.75, .8], plana: [1.7, .42, 1.7], tumbada: [1, 1, 1] };
const MANCHA_COLS = ['#5fc8ff', '#ff8fd0', '#b48cff', '#7fe0a0', '#ffb36b', '#ff6f7f'];
let manchas = [];
function makeMancha(col, name, isPlayer) {
  const g = new THREE.Group(); const inner = new THREE.Group(); g.add(inner);
  const mat = new THREE.MeshStandardMaterial({ map: patTex('liso', col, col), roughness: .32 });
  const body = new THREE.Mesh(dropGeo, mat); body.castShadow = true; inner.add(body);
  const em = M('#ffffff', { roughness: .15 }), pm = M('#1a1030', { roughness: .2 });
  const eyes = new THREE.Group(); eyes.position.set(0, .5, .44); inner.add(eyes); const lids = [];
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.15, 20, 14), em); e.position.set(sx * .17, 0, 0); e.scale.z = .6; eyes.add(e); const p = new THREE.Mesh(new THREE.SphereGeometry(.085, 16, 10), pm); p.position.set(sx * .17, -.01, .07); eyes.add(p); const h = new THREE.Mesh(new THREE.SphereGeometry(.03, 8, 6), M('#fff', { emissive: '#fff' })); h.position.set(sx * .17 + .035, .04, .13); eyes.add(h);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(.165, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat); lid.position.set(sx * .17, 0, 0); lid.scale.set(1, 1, .72); lid.rotation.x = -1.6; eyes.add(lid); lids.push(lid);
    const ck = new THREE.Mesh(new THREE.CircleGeometry(.07, 16), M('#ff7fb0', { transparent: true, opacity: .75 })); ck.position.set(sx * .31, -.13, .05); eyes.add(ck); }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(.05, .016, 8, 16, Math.PI), pm); mouth.rotation.z = Math.PI; mouth.position.set(0, -.13, .08); eyes.add(mouth);
  const drip = new THREE.Mesh(new THREE.SphereGeometry(.07, 10, 8), mat); drip.position.set(.35, .15, .2); inner.add(drip);
  world.add(g);
  const m = { g, inner, body, mat, eyes, lids, mouth, drip, name, isPlayer, c1: col, c2: col, pat: 'liso', pose: 'bolita', poseCur: [1, 1, 1], tumb: 0, x: 0, z: 0, yaw: 0, vx: 0, vz: 0, moving: false, alive: true, caught: false, camo: 0, hop: 0, blink: rnd(1, 4), sneeze: rnd(6, 14), shiver: 0, bot: null, spin: 0, still: 0, aimed: 0 };
  g.traverse(o => { if (o.isMesh) { o.userData.mancha = m; o.castShadow = true; hitMeshes.push(o); } });
  manchas.push(m); applyPaint(m); return m;
}
function applyPaint(m) { m.mat.map = patTex(m.pat, m.c1, m.c2, m.pat === 'liso' ? 1 : 2); m.mat.needsUpdate = true; }
function score(m, p) { const c = colSim(m.c1, p.c1); let pt; if (m.pat === p.pat) pt = p.pat === 'liso' ? 1 : .35 + .65 * colSim(m.c2, p.c2); else pt = (p.pat === 'liso' || m.pat === 'liso') ? .1 : .2; const ps = m.pose === p.pose ? 1 : .25; return .46 * c + .26 * pt + .2 * ps + .08 * (m.still > 1 ? 1 : 0); }
function camoOf(m) {
  let best = 0, ref = null;
  for (const p of props) { const d = Math.hypot(p.x - m.x, p.z - m.z) - p.r; if (d > 1.6) continue; const prox = clamp(1 - Math.max(0, d) / 1.6, 0, 1); const s = score(m, p) * (.72 + .28 * prox); if (s > best) { best = s; ref = p; } }
  const gs = score(m, groundPal) * .93; if (gs > best) { best = gs; ref = groundPal; }
  return { v: clamp(best, 0, 1), ref };
}
function makeCritic() {
  const g = new THREE.Group(); const legM = M('#ff9a6b', { roughness: .4 }), gold = M('#ffcf4a', { metalness: .7, roughness: .22 });
  const legs = []; for (const sx of [-1, 1]) { const hip = new THREE.Group(); hip.position.set(sx * .32, 2.3, 0); const up = new THREE.Mesh(new THREE.CylinderGeometry(.07, .06, 1.15, 8), legM); up.position.y = -.57; hip.add(up); const knee = new THREE.Group(); knee.position.y = -1.15; hip.add(knee); knee.add(new THREE.Mesh(new THREE.SphereGeometry(.11, 10, 8), legM)); const lo = new THREE.Mesh(new THREE.CylinderGeometry(.06, .05, 1.1, 8), legM); lo.position.y = -.55; knee.add(lo); const ft = new THREE.Group(); ft.position.y = -1.12; knee.add(ft); for (const a of [-.5, 0, .5]) { const toe = new THREE.Mesh(new THREE.CylinderGeometry(.04, .03, .4, 6), legM); toe.rotation.x = Math.PI / 2; toe.rotation.y = a; toe.position.set(Math.sin(a) * .18, 0, Math.cos(a) * .18); ft.add(toe); } g.add(hip); legs.push({ hip, knee }); }
  const top = new THREE.Group(); top.position.y = 3.35; g.add(top);
  top.add(new THREE.Mesh(new THREE.TorusGeometry(.95, .14, 16, 48), gold));
  const glass = new THREE.Mesh(new THREE.CircleGeometry(.95, 40), new THREE.MeshPhysicalMaterial({ color: '#cfefff', transparent: true, opacity: .25, roughness: 0, clearcoat: 1 })); glass.position.z = .38; top.add(glass);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(.74, 28, 20), M('#ffffff', { roughness: .15 })); eye.scale.z = .5; top.add(eye);
  const iris = new THREE.Group(); iris.position.z = .375; top.add(iris); iris.add(new THREE.Mesh(new THREE.CircleGeometry(.34, 32), M('#7a5cff'))); const pu = new THREE.Mesh(new THREE.CircleGeometry(.17, 24), M('#1a1030')); pu.position.z = .005; iris.add(pu); const hl = new THREE.Mesh(new THREE.CircleGeometry(.07, 12), M('#fff', { emissive: '#fff' })); hl.position.set(.1, .1, .01); iris.add(hl);
  const lid = new THREE.Mesh(new THREE.SphereGeometry(.77, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), M('#ffb3dc', { roughness: .4 })); lid.scale.z = .55; lid.rotation.x = -.2; top.add(lid);
  const brow = new THREE.Mesh(new THREE.TorusGeometry(.5, .08, 8, 20, Math.PI * .8), M('#5a2a7e')); brow.position.set(0, .95, .3); brow.rotation.z = Math.PI * .1; top.add(brow);
  const bow = new THREE.Group(); bow.position.set(0, -1.15, .1); for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.ConeGeometry(.2, .35, 4), M('#ff5f8f')); b.rotation.z = sx * Math.PI / 2; b.position.x = sx * .18; bow.add(b); } top.add(bow);
  const hatG = new THREE.Group(); hatG.position.set(.2, 1.1, 0); hatG.rotation.z = -.3; const beret = new THREE.Mesh(new THREE.SphereGeometry(.55, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M('#7a5cff')); beret.scale.y = .45; hatG.add(beret); const nub = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 6), M('#7a5cff')); nub.position.y = .26; hatG.add(nub); top.add(hatG);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.08, .12, 1.0, 8), gold); neck.position.y = 2.75; g.add(neck);
  const hipB = new THREE.Mesh(new THREE.SphereGeometry(.3, 14, 10), gold); hipB.position.y = 2.3; hipB.scale.set(1.3, .7, 1); g.add(hipB);
  const arm = new THREE.Group(); arm.position.set(.95, 2.9, .1); g.add(arm); const handle = new THREE.Mesh(new THREE.CylinderGeometry(.06, .08, 1.2, 10), M('#b06a3a')); handle.rotation.x = Math.PI / 2; handle.position.z = .5; arm.add(handle); const fer = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .2, 10), gold); fer.rotation.x = Math.PI / 2; fer.position.z = 1.15; arm.add(fer); const tipM = M('#ff3f8f', { emissive: '#ff3f8f', emissiveIntensity: .6 }); const tip = new THREE.Mesh(new THREE.ConeGeometry(.1, .3, 10), tipM); tip.rotation.x = Math.PI / 2; tip.position.z = 1.4; arm.add(tip);
  shadowAll(g); world.add(g);
  return { g, legs, top, iris, lid, brow, arm, tip, tipM, x: 0, z: 0, yaw: 0, walk: 0, speed: 0, state: 'count', t: 0, target: null, wp: null, aimT: 0, cool: 0, think: 0, fx: 0 };
}
let critic = null;
// ---------- efectos ----------
const confN = 260; const confMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(.2, .11), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), confN); confMesh.frustumCulled = false; scene.add(confMesh);
const conf = []; const _o = new THREE.Object3D(), _c = new THREE.Color(); for (let i = 0; i < confN; i++) { conf.push({ p: new THREE.Vector3(0, -99, 0), v: new THREE.Vector3(), r: new THREE.Vector3(), life: 0 }); confMesh.setColorAt(i, _c.set(pick(['#ff5f8f', '#ffd23f', '#3fd1b5', '#7a5cff', '#5fc8ff', '#ff9f3d']))); }
let confI = 0; function confetti(x, y, z, n = 80, pow = 6) { for (let i = 0; i < n; i++) { const c = conf[confI++ % confN]; c.p.set(x, y, z); c.v.set(rnd(-1, 1) * pow, rnd(.6, 1.4) * pow, rnd(-1, 1) * pow); c.r.set(rnd(0, 6), rnd(0, 6), rnd(0, 6)); c.life = rnd(2, 3.5); } }
function updConf(dt) { for (let i = 0; i < confN; i++) { const c = conf[i]; if (c.life > 0) { c.life -= dt; c.v.y -= 9 * dt; c.v.multiplyScalar(1 - 1.6 * dt); c.p.addScaledVector(c.v, dt); c.r.x += dt * 8; c.r.y += dt * 6; if (c.p.y < .05) { c.p.y = .05; c.v.set(0, 0, 0); } } else c.p.y = -99; _o.position.copy(c.p); _o.rotation.set(c.r.x, c.r.y, c.r.z); _o.updateMatrix(); confMesh.setMatrixAt(i, _o.matrix); } confMesh.instanceMatrix.needsUpdate = true; }
const shots = [];
const PAINTS = ['#ff3f8f', '#3fd1b5', '#ffd23f', '#7a5cff', '#ff9f3d'];
function fireShot(from, to, col, onHit) { const m = new THREE.Mesh(new THREE.SphereGeometry(.22, 12, 10), M(col, { emissive: col, emissiveIntensity: .8 })); m.position.copy(from); scene.add(m); const trail = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 1, 6), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .55 })); scene.add(trail); shots.push({ m, trail, from: from.clone(), to: to.clone(), t: 0, dur: Math.max(.12, from.distanceTo(to) / 45), col, onHit }); S.shoot(); }
const _up = new THREE.Vector3(0, 1, 0), _dir = new THREE.Vector3();
function updShots(dt) { for (let i = shots.length - 1; i >= 0; i--) { const s = shots[i]; s.t += dt; const k = Math.min(1, s.t / s.dur); s.m.position.lerpVectors(s.from, s.to, k); s.m.position.y += Math.sin(k * Math.PI) * .4; s.trail.position.lerpVectors(s.from, s.m.position, .5); const L = s.from.distanceTo(s.m.position); s.trail.scale.set(1, Math.max(.01, L), 1); _dir.subVectors(s.m.position, s.from).normalize(); s.trail.quaternion.setFromUnitVectors(_up, _dir); if (k >= 1) { scene.remove(s.m); scene.remove(s.trail); shots.splice(i, 1); splatAt(s.to, s.col); s.onHit && s.onHit(); } } }
let splatN = 0; function splatAt(p, col) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: splatTex(col), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); m.rotation.x = -Math.PI / 2; m.rotation.z = rnd(0, 6); m.position.set(p.x, .03 + (splatN++ % 50) * .0006, p.z); world.add(m); S.splat(); burst(p, col); }
const bursts = []; function burst(p, col) { for (let i = 0; i < 10; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(rnd(.06, .14), 8, 6), M(col, { emissive: col, emissiveIntensity: .4 })); b.position.copy(p); world.add(b); bursts.push({ b, v: new THREE.Vector3(rnd(-3, 3), rnd(2, 5), rnd(-3, 3)), l: .8 }); } }
function updBursts(dt) { for (let i = bursts.length - 1; i >= 0; i--) { const b = bursts[i]; b.l -= dt; b.v.y -= 12 * dt; b.b.position.addScaledVector(b.v, dt); if (b.b.position.y < .05) { b.b.position.y = .05; b.v.multiplyScalar(.3); } if (b.l <= 0) { world.remove(b.b); bursts.splice(i, 1); } } }
// ---------- UI ----------
let toastT = 0; function toast(a, b = '', ms = 1400) { const t = $('toast'); t.innerHTML = a + (b ? `<small>${b}</small>` : ''); t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms); }
let bubT = 0; function bub(s, ms = 1800) { const b = $('bub'); b.textContent = s; b.style.display = 'block'; clearTimeout(bubT); bubT = setTimeout(() => b.style.display = 'none', ms); }
function show(id) { document.querySelectorAll('.scr').forEach(s => s.classList.toggle('on', s.id === id)); }
function hud(on) { $('hud').classList.toggle('on', on); $('joy').classList.toggle('on', on); $('acts').classList.toggle('on', on); if (!on) { $('cross').classList.remove('on'); $('meter').classList.remove('on'); $('bub').style.display = 'none'; } }
const tap = (id, f) => $(id).addEventListener('click', e => { audioInit(); S.tap(); f(e); });
document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => { S.tap(); show('menu'); }));
$('bMute').textContent = save.muted ? '🔇' : '🔊';
tap('bMute', () => { save.muted = !save.muted; persist(); $('bMute').textContent = save.muted ? '🔇' : '🔊'; if (master) master.gain.value = save.muted ? 0 : .6; });
tap('bHow', () => show('howS'));
tap('bOn', () => { if (!ONLINE_DISPONIBLE) toast('🌐 ¡Muy pronto!', 'Salas online con código de 4 letras', 2000); });
let pendingMode = 'full';
['bPlay', 'bHide', 'bSeek', 'b2p'].forEach((id, i) => tap(id, () => { pendingMode = ['full', 'hide', 'seek', '2p'][i]; show('pick'); }));
function thumb(cd) { const cv = document.createElement('canvas'); cv.width = 240; cv.height = 180; const x = cv.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 180); cd.sky.forEach((c, i) => g.addColorStop(i / 2, c)); x.fillStyle = g; x.fillRect(0, 0, 240, 180); x.fillStyle = cd.gpal.c1; x.fillRect(0, 130, 240, 50);
  const dot = (cx, cy, r, c) => { x.fillStyle = c; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); };
  if (cd.id === 'girasoles') { dot(205, 32, 20, '#ffe066'); for (let i = 0; i < 5; i++) { const cx = 25 + i * 48, cy = 70 + (i % 2) * 15; x.fillStyle = '#4fbf3f'; x.fillRect(cx - 3, cy, 6, 75); for (let k = 0; k < 10; k++) dot(cx + Math.cos(k * .63) * 17, cy + Math.sin(k * .63) * 17, 8, '#ffd23f'); dot(cx, cy, 11, '#a0521f'); } }
  if (cd.id === 'caramelo') { for (let i = 0; i < 5; i++) { const cx = 25 + i * 48; x.fillStyle = '#fff'; x.fillRect(cx - 2, 80, 4, 60); dot(cx, 70, 20, ['#ff6fb5', '#3fd1b5', '#ffb03d'][i % 3]); dot(cx, 70, 8, '#fff'); } x.fillStyle = '#ffa94d'; x.fillRect(0, 162, 240, 18); }
  if (cd.id === 'cubos') { ['#ff6fb5', '#3fd1b5', '#ffd23f', '#7a5cff', '#ff6fb5'].forEach((c, i) => { const h = 50 + (i * 37) % 60; x.fillStyle = c; x.fillRect(10 + i * 46, 140 - h, 36, h); x.fillStyle = 'rgba(255,255,255,.6)'; for (let k = 0; k < 4; k++) x.fillRect(16 + i * 46 + (k % 2) * 14, 146 - h + Math.floor(k / 2) * 18, 9, 9); }); }
  if (cd.id === 'retrato') { dot(120, 84, 60, '#ffcfb0'); dot(96, 70, 12, '#fff'); dot(144, 70, 12, '#fff'); dot(96, 72, 6, '#3f7aff'); dot(144, 72, 6, '#3f7aff'); dot(120, 95, 10, '#ff9f8a'); x.fillStyle = '#8a4a2a'; x.beginPath(); x.ellipse(100, 112, 22, 8, -.3, 0, 7); x.fill(); x.beginPath(); x.ellipse(140, 112, 22, 8, .3, 0, 7); x.fill(); x.fillStyle = '#7a5cff'; x.fillRect(78, 0, 84, 34); }
  return cv.toDataURL(); }
CUADROS.forEach((cd, i) => { const d = document.createElement('div'); d.className = 'cd'; d.innerHTML = `<img src="${thumb(cd)}" alt=""><b>${cd.name}</b>`; d.onclick = () => { audioInit(); S.pop(); startMatch(pendingMode, i); }; $('cards').appendChild(d); });
{ const d = document.createElement('div'); d.className = 'cd'; d.innerHTML = '<b style="padding:34px 6px;font-size:20px">🎲 Cuadro sorpresa</b>'; d.onclick = () => { audioInit(); S.pop(); startMatch(pendingMode, Math.floor(Math.random() * 4)); }; $('cards').appendChild(d); }
// ---------- controles ----------
let joyX = 0, joyY = 0, jdrag = null, camYaw = 0, camPitch = .32, camDrag = null; const keys = {};
const joy = $('joy'), knob = $('joyK');
joy.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); audioInit(); if (jdrag) return; const r = joy.getBoundingClientRect(); jdrag = { id: e.pointerId, x0: r.left + r.width / 2, y0: r.top + r.height / 2 }; try { joy.setPointerCapture(e.pointerId); } catch (x) { } joy.classList.add('act'); joyMove(e); });
function joyMove(e) { if (!jdrag || e.pointerId !== jdrag.id) return; let dx = e.clientX - jdrag.x0, dy = e.clientY - jdrag.y0; const R = 52, d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; } knob.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`; const k = d > 7 ? 1 : 0; joyX = k * clamp(dx / 44, -1, 1); joyY = k * clamp(-dy / 44, -1, 1); }
joy.addEventListener('pointermove', joyMove);
const jEnd = e => { if (!jdrag || e.pointerId !== jdrag.id) return; jdrag = null; joyX = joyY = 0; joy.classList.remove('act'); knob.style.transform = 'translate(-50%,-50%)'; };
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => joy.addEventListener(ev, jEnd));
canvas.addEventListener('pointerdown', e => { if (camDrag) return; camDrag = { id: e.pointerId, x: e.clientX, y: e.clientY }; try { canvas.setPointerCapture(e.pointerId); } catch (x) { } });
canvas.addEventListener('pointermove', e => { if (!camDrag || camDrag.id !== e.pointerId) return; const dx = e.clientX - camDrag.x, dy = e.clientY - camDrag.y; camDrag.x = e.clientX; camDrag.y = e.clientY; const sens = role === 'seek' ? .0055 : .0075; camYaw -= dx * sens; camPitch = clamp(camPitch + dy * .005, role === 'seek' ? -.35 : -.15, 1.05); });
const cEnd = e => { if (camDrag && camDrag.id === e.pointerId) camDrag = null; }; ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => canvas.addEventListener(ev, cEnd));
addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'Space') playerFire(); }); addEventListener('keyup', e => keys[e.code] = false);
function mkActs(list) { const a = $('acts'); a.innerHTML = ''; list.forEach(([id, ico, txt, cls, f]) => { const b = document.createElement('button'); b.className = 'ab ' + (cls || ''); b.id = id; b.innerHTML = `<span>${ico}</span>${txt}`; b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); audioInit(); f(); }); a.appendChild(b); }); }
// ---------- partida ----------
let mode = 'full', role = 'hide', phase = 'idle', phaseT = 0, me = null, playing = false, round = 0, rounds = [], results = [], shotsLeft = 0, bestShot = null, bestPct = 0, slowmo = 1, focus = null, focusT = 0, p2score = [0, 0], cuadroIdx = 0, lastPct = -1, hider2p = 0, paused = false;
const HIDE_T = 30; const P2 = ['Jugador 1', 'Jugador 2'];
const is2p = () => rounds[round] && rounds[round].startsWith('2p');
function startMatch(md, ci) { mode = md; cuadroIdx = ci; results = []; round = 0; bestShot = null; bestPct = 0; p2score = [0, 0];
  rounds = md === 'full' ? ['hide', 'seek'] : md === 'hide' ? ['hide'] : md === 'seek' ? ['seek'] : ['2p-a', '2p-b']; nextRound(); }
function nextRound() { if (round >= rounds.length) return toMenu(); const r = rounds[round];
  if (r.startsWith('2p')) { const h = r === '2p-a' ? 0 : 1; hider2p = h; $('pT').textContent = `🙈 Se esconde ${P2[h]}`; $('pS').textContent = `${P2[1 - h]}: ¡date la vuelta y no mires! Tienes 30 segundos para pintarte.`; show('pass'); $('pGo').onclick = () => { S.pop(); setupRound(r); }; return; }
  setupRound(r); }
function setupRound(r) {
  show(null); manchas = []; buildBase(CUADROS[cuadroIdx]); CUADROS[cuadroIdx].build(); critic = makeCritic(); slowmo = 1; focus = null; focusT = 0;
  role = r === 'seek' ? 'seek' : 'hide';
  const cols = MANCHA_COLS.slice().sort(() => Math.random() - .5);
  me = null; if (r !== 'seek') { me = makeMancha(cols[0], r === 'hide' ? 'Tú' : P2[hider2p], true); me.x = rnd(-1.5, 1.5); me.z = 2.5; me.yaw = 0; }
  const nb = r === 'seek' ? 4 : 3;
  for (let i = 0; i < nb; i++) { const b = makeMancha(cols[i + 1], ['Pinti', 'Gotita', 'Borrón', 'Acuarela'][i], false); const a = i / nb * 6.28 + 1; b.x = Math.cos(a) * 2.6; b.z = Math.sin(a) * 2.6 + 1; botPlan(b); }
  manchas.forEach(m => m.g.position.set(m.x, 0, m.z));
  phase = 'hide'; phaseT = HIDE_T; playing = true; paused = false; critic.state = 'count'; critic.x = 0; critic.z = -HALF + 3; critic.yaw = Math.PI;
  camYaw = 0; camPitch = .32; shotsLeft = 0; lastPct = -1;
  hud(true); $('hPhase').textContent = '🙈 ¡A esconderse!';
  if (role === 'hide') { $('meter').classList.add('on'); $('cross').classList.remove('on'); setHideActs(); $('hInfo').textContent = '🎨 ' + CUADROS[cuadroIdx].name; toast('¡Píntate como el cuadro!', '💧 Color · 🖌 Dibujo · 🧘 Pose', 2600); }
  else { $('meter').classList.remove('on'); mkActs([]); $('hInfo').textContent = '🧐 Contando…'; toast('Eres El Crítico 🧐', 'Las Manchas se están pintando… ¡no mires!', 2600); $('joy').classList.remove('on'); }
  musicMode = 'calm'; frameFx();
}
function frameFx() { const f = $('frameFx'); f.style.transition = 'none'; f.style.opacity = 1; f.style.borderWidth = '50vmin'; requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transition = 'border-width .9s cubic-bezier(.5,0,.3,1),opacity .9s'; f.style.borderWidth = '0'; f.style.opacity = 0; })); S.boing(); }
function setHideActs() { mkActs([['aCol', '💧', 'Color', 'c1', () => copyFrom('col')], ['aPat', '🖌', 'Dibujo', 'c2', () => copyFrom('pat')], ['aPose', '🧘', 'Pose', 'c3', cyclePose]]); }
function nearestThing(m) { let best = null, bd = 1.8; for (const p of props) { const d = Math.hypot(p.x - m.x, p.z - m.z) - p.r; if (d < bd) { bd = d; best = p; } } return best; }
function copyFrom(what) { if (!me || !me.alive || role !== 'hide') return; const p = nearestThing(me) || groundPal;
  if (what === 'col') { me.c1 = p.c1; if (me.pat === 'liso') me.c2 = p.c1; S.drop(); bub(`💧 ¡Color de ${p.name}!`); }
  else { me.pat = p.pat; me.c2 = p.c2; S.paint(); bub(p.pat === 'liso' ? `🖌 Lisa como ${p.name}` : `🖌 ¡${p.pat[0].toUpperCase() + p.pat.slice(1)} de ${p.name}!`); }
  applyPaint(me); me.hop = 1; burst(new THREE.Vector3(me.x, 1, me.z), what === 'col' ? p.c1 : p.c2); if (phase === 'seek') me.still = 0; }
function cyclePose() { if (!me || !me.alive || role !== 'hide') return; me.pose = POSES[(POSES.indexOf(me.pose) + 1) % 4]; S.pose(); me.hop = .7; bub('🧘 Pose: ' + POSE_N[me.pose]); if (phase === 'seek') { me.still = 0; me.wiggle = .8; } }
function botPlan(b) {
  const used = manchas.filter(o => o.bot).map(o => o.bot.p); const free = props.filter(p => !used.includes(p) && Math.hypot(p.x, p.z + HALF - 3) > 6); const p = pick(free.length ? free : props); const a = rnd(0, 6.28);
  const skill = rnd(0, 1); const c1 = skill > .12 ? p.c1 : pick(MANCHA_COLS);
  b.bot = { p, tx: clamp(p.x + Math.cos(a) * (p.r + .5), -HALF + 1, HALF - 1), tz: clamp(p.z + Math.sin(a) * (p.r + .5), -HALF + 1, HALF - 1), c1, c2: p.c2, pat: skill > .28 ? p.pat : 'liso', pose: skill > .2 ? p.pose : pick(POSES), painted: false, delay: rnd(5, 16) }; }
function collide(o, r) { for (const p of props) { const dx = o.x - p.x, dz = o.z - p.z, d = Math.hypot(dx, dz), mn = p.r + r; if (d < mn && d > 1e-4) { o.x = p.x + dx / d * mn; o.z = p.z + dz / d * mn; } } o.x = clamp(o.x, -HALF + .6, HALF - .6); o.z = clamp(o.z, -HALF + .6, HALF - .6); }
function endHidePhase() {
  manchas.forEach(m => { if (m.bot) { m.x = m.bot.tx; m.z = m.bot.tz; m.vx = m.vz = 0; if (!m.bot.painted) paintBot(m); } });
  if (me) { me.camo = camoOf(me).v; captureHide(); }
  if (is2p() && role === 'hide') { // el otro jugador será El Crítico
    phase = 'pass'; playing = false; hud(false); $('pT').textContent = `🧐 ¡Turno de ${P2[1 - hider2p]}!`; $('pS').textContent = `Eres El Crítico. Busca a ${P2[hider2p]} entre las Manchas. 6 disparos, 60 segundos.`; show('pass');
    $('pGo').onclick = () => { S.pop(); show(null); playing = true; role = 'seek'; startSeek(); }; return; }
  startSeek();
}
function startSeek() {
  phase = 'seek'; phaseT = role === 'seek' ? (is2p() ? 60 : 75) : 60; musicMode = 'seek'; critic.state = 'wander'; critic.t = 0; critic.think = 1.5; S.boing(); hud(true);
  if (role === 'hide') { $('hPhase').textContent = '🧐 ¡Viene El Crítico!'; toast('¡Llega El Crítico! 🧐', 'Quieta… muy quieta…', 2200); mkActs([['aPose', '🧘', 'Pose', 'c3', cyclePose]]); }
  else { shotsLeft = is2p() ? 6 : 10; $('meter').classList.remove('on'); $('cross').classList.add('on'); $('hPhase').textContent = '🎯 ¡A cazar!'; mkActs([['aFire', '🎯', '', 'fire', playerFire]]); toast('¡A cazar Manchas! 🎯', is2p() ? `Encuentra a ${P2[hider2p]}` : `4 escondidas · ${shotsLeft} disparos · ojo a los estornudos 🤧`, 2600); critic.x = 0; critic.z = -HALF + 3; camYaw = 0; camPitch = .1; $('joy').classList.add('on'); }
}
function paintBot(m) { const b = m.bot; m.c1 = b.c1; m.c2 = b.c2; m.pat = b.pat; m.pose = b.pose; b.painted = true; applyPaint(m); }
function captureHide() {
  if (!me) return; const pct = Math.round(me.camo * 100); let a = me.yaw, bd = 0; for (let k = 0; k < 12; k++) { const aa = me.yaw + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * .5236; const cd = clearDist(me.x, me.z, Math.sin(aa), Math.cos(aa), 3.4); if (cd > bd + .01) { bd = cd; a = aa; } if (cd >= 3.4) break; } const R = Math.min(3.4, bd); manchas.forEach(m => { animMancha(m, 1); }); camera.position.set(me.x + Math.sin(a) * R, 1.3 + R * .25, me.z + Math.cos(a) * R); camera.lookAt(me.x, .7, me.z); critic.g.visible = false; renderer.render(scene, camera); critic.g.visible = true;
  try { const img = renderer.domElement.toDataURL('image/jpeg', .9); if (pct >= bestPct || !bestShot) { bestPct = pct; bestShot = { img, pct, cuadro: CUADROS[cuadroIdx].name }; } } catch (e) { } }
const LINES = ['¡Te delataron las pestañas! 👀', '¡Ese cuadro tenía ojos!', '¡Pillada con las manos en la pintura!', '¡Atchís! Digo… ¡PILLADA!', '¡Eso no estaba en el cuadro original!', '¡Demasiado guapa para ser decorado!'];
function catchMancha(m) {
  if (!m.alive) return; m.alive = false; m.caught = true; m.spin = 1; m.hop = 1.6; const col = pick(PAINTS); m.c1 = col; m.c2 = '#ffffff'; m.pat = 'lunares'; applyPaint(m); S.ay(); confetti(m.x, 1.2, m.z, 45, 5);
  if (m === me && role === 'hide') { toast('¡TE PILLÓ! 🎨💥', pick(LINES), 2400); focus = m; focusT = 2.2; slowmo = .35; S.fail(); setTimeout(() => endRound(), 2300); }
  else if (m === me) { toast(`¡ENCONTRASTE A ${P2[hider2p].toUpperCase()}! 🎉`, pick(LINES), 2200); focus = m; focusT = 1.8; slowmo = .4; S.fanfare(); setTimeout(() => endRound(), 2100); }
  else if (role === 'seek') { toast('¡PILLADA! 🎉', m.name + ' · ' + pick(LINES), 1800); focus = m; focusT = 1.2; slowmo = .4; if (!is2p() && manchas.every(o => !o.alive)) setTimeout(() => endRound(), 1500); }
  else bub(`😱 ¡Han pillado a ${m.name}!`, 1800);
}
const ray = new THREE.Raycaster(), V0 = new THREE.Vector2(0, 0);
function playerFire() {
  if (phase !== 'seek' || role !== 'seek' || shotsLeft <= 0 || critic.cool > 0 || focusT > 0) return; shotsLeft--; critic.cool = .45; critic.fx = 1;
  ray.setFromCamera(V0, camera); const hits = ray.intersectObjects(hitMeshes, false);
  let target = null, point = null;
  for (const m of manchas) { if (!m.alive) continue; const c = new THREE.Vector3(m.x, .55 * m.poseCur[1] + m.tumb * .2, m.z); const d = ray.ray.distanceToPoint(c); const dist = c.distanceTo(camera.position); if (d < .7 + dist * .035 && dist < 40) { const h = hits[0]; if (!h || h.distance > dist - 1.3 || h.object.userData.mancha === m) { target = m; point = c; break; } } }
  if (!target && hits.length) { point = hits[0].point; const hm = hits[0].object.userData.mancha; if (hm && hm.alive) target = hm; }
  if (!point) point = ray.ray.at(30, new THREE.Vector3());
  const from = critic.tip.getWorldPosition(new THREE.Vector3()); const col = pick(PAINTS);
  fireShot(from, point, col, () => { if (target) catchMancha(target); else { const pr = hits[0] && hits[0].object.userData.prop; bub(pr ? `🙃 ¡Era ${pr.name} de verdad!` : '💨 ¡Fallaste!', 1500); if (pr) { pr.g.userData.shake = 1; S.boing(); } } });
  if (shotsLeft === 0) setTimeout(() => { if (phase === 'seek' && focusT <= 0) endRound(); }, 1700);
}
function criticAI(dt) {
  const c = critic; c.cool -= dt; c.t += dt;
  if (c.state === 'count') { c.speed = 0; return; }
  const alive = manchas.filter(m => m.alive); if (!alive.length) { c.speed = 0; return; }
  const goTo = (x, z, spd) => { const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz); if (d > .2) { c.yaw += wrap(Math.atan2(dx, dz) - c.yaw) * Math.min(1, dt * 5); c.x += Math.sin(c.yaw) * spd * dt; c.z += Math.cos(c.yaw) * spd * dt; c.speed = spd; } else c.speed = 0; collide(c, .5); return d; };
  if (c.state === 'wander') {
    if (!c.wp || Math.hypot(c.wp.x - c.x, c.wp.z - c.z) < 1.5) { const near = Math.random() < .5 ? pick(alive) : pick(props); c.wp = { x: clamp(near.x + rnd(-4, 4), -HALF + 2, HALF - 2), z: clamp(near.z + rnd(-4, 4), -HALF + 2, HALF - 2) }; }
    goTo(c.wp.x, c.wp.z, 3.1);
    c.think -= dt; if (c.think <= 0) { c.think = .4;
      for (const m of alive) { const dx = m.x - c.x, dz = m.z - c.z, d = Math.hypot(dx, dz); if (d > 15) continue; const ang = Math.abs(wrap(Math.atan2(dx, dz) - c.yaw)); if (ang > 1.15 && !m.moving) continue;
        const p = (Math.pow(1 - m.camo, 2.4) * 1.3 + (m.moving ? .55 : 0) + (m.wiggle > 0 ? .3 : 0)) * (1 - d / 16); if (Math.random() < p) { c.state = 'go'; c.target = m; S.hmm(); if (m === me) bub('😳 ¡El Crítico te ha echado el ojo!', 1500); return; } }
      if (Math.random() < .015) { c.state = 'go'; c.target = pick(props); } } }
  else if (c.state === 'go') { const t = c.target; if (t.alive === false) { c.state = 'wander'; return; } const d = goTo(t.x, t.z, t.moving ? 4.3 : 3.6); if (d < 5.5) { c.state = 'aim'; c.aimT = 1.1; c.speed = 0; S.tension(); if (t === me) bub('😱 ¡Te está apuntando! ¿Quieta o corres?', 1200); } }
  else if (c.state === 'aim') { const t = c.target; c.yaw += wrap(Math.atan2(t.x - c.x, t.z - c.z) - c.yaw) * Math.min(1, dt * 6); c.speed = 0; c.aimT -= dt;
    if (c.aimT <= 0) { let hit = false; const isM = t.alive !== undefined; if (isM) { const d = Math.hypot(t.x - c.x, t.z - c.z); const pc = t.moving ? .55 : (.3 + (1 - camoOf(t).v) * 1.35); hit = d < 7.5 && Math.random() < pc; }
      const pt = new THREE.Vector3(t.x + (hit ? 0 : rnd(-1.6, 1.6)), hit ? .6 : .05, t.z + (hit ? 0 : rnd(-1.6, 1.6))); c.fx = 1; const tt = t;
      fireShot(c.tip.getWorldPosition(new THREE.Vector3()), pt, pick(PAINTS), () => { if (hit) catchMancha(tt); else if (isM && tt === me) { bub(pick(['😅 ¡Uf! Por los pelos…', '😎 ¡Ha fallado! Sigue quieta…', '🫣 ¡Casi te pinta!']), 1600); S.boing(); } else if (!isM) { tt.g.userData.shake = 1; bub(pick([`🧐 «¡Ajá!»… era ${tt.name}.`, '🧐 «Juraría que eso me ha guiñado un ojo…»', `🧐 «Perdón, ${tt.name.replace(/^un[a]? /, '')}.»`]), 1800); } });
      c.state = 'wander'; c.wp = null; c.think = 1.2; } } }
function clearDist(x, z, dx, dz, maxD) { // distancia libre de objetos en una dirección (para que la cámara no quede tapada)
  for (let d = .8; d <= maxD; d += .25) { const px = x + dx * d, pz = z + dz * d; for (const p of props) if (Math.hypot(px - p.x, pz - p.z) < p.r + .35) return Math.max(1.6, d - .4); } return maxD; }
// ---------- actualización ----------
let last = performance.now(), T = 0, fpsAcc = 0, fpsN = 0, fpsT = 0;
const camPos = new THREE.Vector3(0, 6, 12), camLook = new THREE.Vector3(), _v = new THREE.Vector3();
function update(dt) {
  T += dt; decor.forEach(d => d.f(d.o, T));
  for (const p of props) { if (p.sway !== undefined) p.g.rotation.z = Math.sin(T * 1.3 + p.sway) * .04; if (p.g.userData.head) p.g.userData.head.rotation.y = Math.sin(T * .7 + (p.sway || 0)) * .25; if (p.hop !== undefined) { const k = Math.max(0, Math.sin(T * 2 + p.hop)); p.g.scale.y = 1 + k * k * .04; } if (p.g.userData.shake) { p.g.userData.shake = Math.max(0, p.g.userData.shake - dt * 2); p.g.rotation.x = Math.sin(T * 40) * .08 * p.g.userData.shake; } }
  if (!playing) { if (phase === 'idle') { camPos.set(Math.sin(T * .08) * 24, 9 + Math.sin(T * .2) * 2, Math.cos(T * .08) * 24); camera.position.copy(camPos); camera.lookAt(0, 1.5, 0); } updConf(dt); updBursts(dt); return; }
  musicTick(dt);
  if (focusT > 0) { focusT -= dt; if (focusT <= 0) { slowmo = 1; focus = null; } }
  const sdt = dt * slowmo;
  if (phase === 'hide' || phase === 'seek') { const prev = Math.ceil(phaseT); phaseT -= sdt; const sec = Math.ceil(phaseT); $('hTime').textContent = '⏱ ' + Math.max(0, sec);
    if (sec !== prev && sec <= 5 && sec >= 1) { S.tick(); if (phase === 'hide' && sec <= 3) toast(String(sec), role === 'hide' ? '¡A tu sitio!' : '', 600); }
    if (phase === 'hide' && phaseT <= 0) endHidePhase(); else if (phase === 'seek' && phaseT <= 0 && focusT <= 0) endRound(); }
  if (role === 'seek' && phase === 'seek') $('hInfo').textContent = `🎯 ${shotsLeft} · 🙈 ${manchas.filter(m => m.alive).length}`;
  if (role === 'hide' && phase === 'seek') $('hInfo').textContent = `🙈 ${manchas.filter(m => m.alive).length} escondidas`;
  let ix = joyX, iy = joyY; const kx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), ky = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0); if (kx || ky) { ix = kx; iy = ky; }
  const fwX = Math.sin(camYaw), fwZ = Math.cos(camYaw); const rX = -fwZ, rZ = fwX; let wantX = fwX * iy - rX * ix, wantZ = fwZ * iy - rZ * ix; const wl = Math.hypot(wantX, wantZ); if (wl > 1) { wantX /= wl; wantZ /= wl; }
  if (me && me.alive && role === 'hide') { const sp = 5.4; me.vx = lerp(me.vx, wantX * sp, Math.min(1, sdt * 10)); me.vz = lerp(me.vz, wantZ * sp, Math.min(1, sdt * 10)); me.x += me.vx * sdt; me.z += me.vz * sdt; collide(me, .45); const spd = Math.hypot(me.vx, me.vz); me.moving = spd > .6; if (spd > .3) me.yaw += wrap(Math.atan2(me.vx, me.vz) - me.yaw) * Math.min(1, sdt * 10); me.still = me.moving ? 0 : me.still + sdt; me.wiggle = Math.max(0, (me.wiggle || 0) - sdt);
    me.camo = camoOf(me).v; const pct = Math.round(me.camo * 100); if (pct !== lastPct) { lastPct = pct; $('mPct').textContent = pct + '%'; $('mFill').style.width = pct + '%'; $('mFace').textContent = pct < 40 ? '🙈 ¡Se te ve a la legua!' : pct < 65 ? '🤔 Mmm… casi' : pct < 85 ? '😏 ¡Bien camuflada!' : pct < 95 ? '🫥 ¡Casi invisible!' : '👻 ¡ERES EL CUADRO!'; if (pct >= 94 && !me.inv) { me.inv = true; S.fanfare(); confetti(me.x, 1.5, me.z, 30, 4); } if (pct < 88) me.inv = false; } }
  if (role === 'seek') { if (phase === 'seek') { const sp = 4.8; critic.x += wantX * sp * sdt; critic.z += wantZ * sp * sdt; collide(critic, .5); critic.speed = Math.hypot(wantX, wantZ) * sp; critic.yaw = camYaw; critic.cool -= dt; } else critic.speed = 0; }
  else criticAI(sdt);
  for (const m of manchas) { if (!m.alive) continue; if (m.bot) { const b = m.bot; if (phase === 'hide') { const dx = b.tx - m.x, dz = b.tz - m.z, d = Math.hypot(dx, dz); if (d > .2) { const sp = 3.6; m.vx = dx / d * sp; m.vz = dz / d * sp; m.x += m.vx * sdt; m.z += m.vz * sdt; m.yaw += wrap(Math.atan2(dx, dz) - m.yaw) * Math.min(1, sdt * 8); m.moving = true; } else { m.moving = false; m.vx = m.vz = 0; m.still += sdt; if (!b.painted && HIDE_T - phaseT > b.delay) { paintBot(m); m.hop = 1; S.paint && role === 'hide' && Math.random() < .3 && 0; burst(new THREE.Vector3(m.x, 1, m.z), m.c1); } } }
      else { m.moving = false; m.vx = m.vz = 0; m.still += sdt; } }
    if (phase === 'seek' && m !== me || (phase === 'seek' && role === 'seek')) { m.sneeze -= sdt; if (m.sneeze <= 0) { m.sneeze = rnd(9, 18); const d = Math.hypot(m.x - critic.x, m.z - critic.z); if (d < 18) { m.hop = .8; m.shiver = .6; if (role === 'seek') { S.sneeze(); bub('🤧 ¡Achís! Algo ha estornudado por ahí…', 1500); } } } }
    if (m.bot || role === 'seek') m.camo = camoOf(m).v; }
  if (role === 'seek' && phase === 'seek') { ray.setFromCamera(V0, camera); let hot = false; for (const m of manchas) { if (!m.alive) continue; _v.set(m.x, .6, m.z); if (ray.ray.distanceToPoint(_v) < .65 && _v.distanceTo(camera.position) < 30) { hot = true; m.aimed += dt; if (m.aimed > .7 && m.camo < .9 && m.shiver <= 0) m.shiver = .35; } else m.aimed = 0; } $('cross').classList.toggle('hot', hot); }
  for (const m of manchas) animMancha(m, sdt);
  animCritic(sdt); updShots(sdt); updBursts(sdt); updConf(sdt);
  const port = innerHeight > innerWidth; const cp = Math.cos(camPitch), spP = Math.sin(camPitch);
  if (focus) { const a = T * .7; camPos.lerp(_v.set(focus.x + Math.sin(a) * 4, 2.3, focus.z + Math.cos(a) * 4), Math.min(1, dt * 3)); camLook.lerp(_v.set(focus.x, .8, focus.z), Math.min(1, dt * 5)); }
  else if (role === 'hide' && me) { const back = clearDist(me.x, me.z, -fwX, -fwZ, port ? 6.4 : 5.4) , ty = 1.0; camPos.lerp(_v.set(me.x - fwX * back * cp, ty + .9 + back * spP, me.z - fwZ * back * cp), Math.min(1, dt * 9)); camLook.lerp(_v.set(me.x + fwX * 1.5, ty + .3, me.z + fwZ * 1.5), Math.min(1, dt * 12)); }
  else { const back = port ? 6.6 : 5.6, sh = port ? 1.25 : 1.6, ty = 4.3; camPos.lerp(_v.set(critic.x - fwX * back * cp - rX * sh, ty + .7 + back * spP, critic.z - fwZ * back * cp - rZ * sh), Math.min(1, dt * 14)); camLook.lerp(_v.set(critic.x + fwX * 10 * cp - rX * sh, ty + .2 - Math.sin(camPitch) * 7, critic.z + fwZ * 10 * cp - rZ * sh), Math.min(1, dt * 16)); }
  camPos.y = Math.max(.6, camPos.y); camera.position.copy(camPos); camera.lookAt(camLook);
  if (role === 'seek' && phase === 'hide') { camera.position.set(0, 2.5, -HALF + 1.5); camera.lookAt(Math.sin(T * .3) * 6, 11, -HALF - 25); }
  sun.position.set(camLook.x + 14, 26, camLook.z + 10); sun.target.position.set(camLook.x, 0, camLook.z);
}
function animMancha(m, dt) {
  const tgt = POSE_S[m.pose]; for (let i = 0; i < 3; i++) m.poseCur[i] = lerp(m.poseCur[i], tgt[i], Math.min(1, dt * 9)); m.tumb = lerp(m.tumb, m.pose === 'tumbada' ? 1 : 0, Math.min(1, dt * 8));
  m.hop = Math.max(0, m.hop - dt * 2.2); const spd = Math.hypot(m.vx, m.vz); const walk = spd > .3 ? Math.abs(Math.sin(T * 14 + m.z)) : 0; const breathe = Math.sin(T * 2.4 + m.x) * .025;
  const sq = 1 + breathe - walk * .08 + Math.sin(m.hop * 12) * m.hop * .25;
  m.g.position.set(m.x, walk * .18 + Math.max(0, Math.sin(m.hop * 6)) * m.hop * .6, m.z); m.g.rotation.y = m.yaw;
  m.inner.scale.set(m.poseCur[0] / Math.sqrt(sq), m.poseCur[1] * sq, m.poseCur[2] / Math.sqrt(sq)); m.inner.rotation.z = m.tumb * 1.45 + (spd > .3 ? Math.sin(T * 14) * .08 : 0); m.inner.position.y = m.tumb * .55;
  m.shiver = Math.max(0, m.shiver - dt); m.inner.rotation.x = Math.sin(T * 50) * m.shiver * .15 + (spd > .3 ? .12 : 0);
  m.blink -= dt; if (m.blink < 0) m.blink = rnd(2, 5); const bl = m.blink < .12; const hiding = phase === 'seek' && !m.moving && m.alive;
  const lidRot = m.caught ? -1.6 : (bl ? -.05 : hiding ? -.8 : -1.6); m.lids.forEach(l => l.rotation.x = lerp(l.rotation.x, lidRot, Math.min(1, dt * 20)));
  m.eyes.scale.setScalar(lerp(m.eyes.scale.x, m.caught ? 1.6 : 1, Math.min(1, dt * 8))); m.mouth.scale.set(1, m.caught ? -2.5 : 1, 1);
  if (m.caught) { m.spin = Math.max(0, m.spin - dt * .4); m.inner.rotation.y += dt * 12 * m.spin; }
  m.drip.position.y = .15 - ((T * .5 + m.z * 3) % 1) * .12; m.drip.visible = m.pose !== 'plana';
}
function animCritic(dt) { const c = critic; c.walk += dt * c.speed * 2.4; const mv = c.speed > .1 ? 1 : 0; c.g.position.set(c.x, Math.abs(Math.sin(c.walk)) * .12 * mv, c.z); c.g.rotation.y = c.yaw;
  c.legs.forEach((l, i) => { const ph = c.walk + i * Math.PI; l.hip.rotation.x = lerp(l.hip.rotation.x, Math.sin(ph) * .55 * mv, Math.min(1, dt * 12)); l.knee.rotation.x = lerp(l.knee.rotation.x, Math.max(0, -Math.cos(ph)) * 1.1 * mv, Math.min(1, dt * 12)); });
  c.top.rotation.z = Math.sin(c.walk * .5) * .08;
  if (c.state === 'count') { c.lid.rotation.x = lerp(c.lid.rotation.x, 1.35, Math.min(1, dt * 6)); c.top.rotation.z = Math.sin(T * 3) * .06; }
  else { const sq = c.state === 'aim' ? .55 : ((T % 3.7) < .12 ? 1.45 : -.2); c.lid.rotation.x = lerp(c.lid.rotation.x, sq, Math.min(1, dt * 14)); c.brow.rotation.z = lerp(c.brow.rotation.z, c.state === 'aim' ? -.25 : Math.PI * .1, Math.min(1, dt * 6)); }
  c.iris.position.x = Math.sin(T * .9) * .14 * (c.state === 'wander' ? 1 : 0); c.iris.position.y = Math.cos(T * 1.3) * .07;
  c.fx = Math.max(0, c.fx - dt * 4); c.arm.rotation.x = -c.fx * .6 + (role === 'seek' && playing ? -camPitch * .5 : 0); c.tipM.emissiveIntensity = .6 + c.fx * 3 + (c.state === 'aim' ? Math.sin(T * 30) * .5 + .5 : 0); }
// ---------- fin de ronda ----------
function endRound() { if (phase !== 'seek' && phase !== 'hide') return; phase = 'reveal'; hud(false); slowmo = 1; focus = null; focusT = 0;
  const r = rounds[round]; const aliveL = manchas.filter(m => m.alive); const total = manchas.length; let title, txt, win;
  if (r !== 'seek') { win = !!(me && me.alive); const pct = Math.round((me ? me.camo : 0) * 100);
    if (r === 'hide') { title = win ? '🏆 ¡NO TE ENCONTRÓ!' : '🎨 ¡Te pilló El Crítico!'; txt = `Camuflaje: <b>${pct}%</b>${win ? ' · ¡Eres arte puro!' : ''}<br>Manchas que aguantaron: ${aliveL.length}/${total}`; }
    else { title = win ? `🏆 ¡${P2[hider2p]} no fue encontrado!` : `🧐 ¡${P2[1 - hider2p]} lo encontró!`; txt = `Camuflaje de ${P2[hider2p]}: <b>${pct}%</b>`; if (win) p2score[hider2p]++; else p2score[1 - hider2p]++; txt += `<br>👯 Marcador: ${P2[0]} ${p2score[0]} – ${p2score[1]} ${P2[1]}`; }
    if (win) { save.wins++; S.fanfare(); confetti(me.x, 2, me.z, 160, 7); } }
  else { const caught = total - aliveL.length; win = aliveL.length === 0; title = win ? '🏆 ¡Las pillaste a TODAS!' : caught ? `🧐 Pillaste ${caught} de ${total}` : '🙈 ¡No pillaste ninguna!'; txt = `Disparos sobrantes: ${shotsLeft}<br>${aliveL.length ? 'Se escondían: ' + aliveL.map(m => `${m.name} (${Math.round(m.camo * 100)}%)`).join(', ') : '¡Ojo de crítico de arte!'}`; if (caught) S.fanfare(); else S.fail(); }
  results.push({ r, win }); if (bestShot && bestShot.pct > save.best) save.best = bestShot.pct; persist();
  // revelar dónde estaban: dan un salto y sacan confeti, y la cámara las enseña
  aliveL.forEach(m => { m.hop = 1.6; confetti(m.x, 1.2, m.z, 25, 4); m.lids.forEach(l => l.rotation.x = -1.6); });
  const rv = aliveL.find(m => m !== me) || aliveL[0]; if (rv) { focus = rv; focusT = 1.2; }
  setTimeout(() => { playing = false; focus = null; showResult(title, txt, r); }, 1300);
}
function showResult(title, txt, r) { $('rT').textContent = title; $('rP').innerHTML = txt + (save.best ? `<br><small>Tu mejor camuflaje: ${save.best}%</small>` : ''); const img = $('shareImg'); if (bestShot && r !== 'seek') { img.src = bestShot.img; img.style.display = 'block'; } else img.style.display = 'none'; $('rShare').style.display = bestShot ? '' : 'none';
  round++; $('rNext').textContent = round < rounds.length ? (rounds[round] === 'seek' ? '🧐 ¡Ahora buscas tú!' : rounds[round].startsWith('2p') ? '🔄 ¡Cambio de papeles!' : 'Siguiente ▶') : '🔁 Otra partida'; show('res'); }
tap('rNext', () => { if (round < rounds.length) nextRound(); else startMatch(mode, Math.floor(Math.random() * 4)); });
tap('rMenu', () => toMenu());
tap('hBack', () => toMenu());
function toMenu() { playing = false; phase = 'idle'; hud(false); show('menu'); menuWorld(); musicMode = 'calm'; }
tap('rShare', async () => { if (!bestShot) return; const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1350; const x = cv.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 1350); g.addColorStop(0, '#7a5cff'); g.addColorStop(1, '#ff6fb5'); x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
  const im = new Image(); im.src = bestShot.img; try { await im.decode(); } catch (e) { } x.fillStyle = '#ffcf4a'; x.fillRect(70, 190, 940, 760); x.fillStyle = '#c98a1a'; x.fillRect(95, 215, 890, 710); const iw = 850, ih = 670; const ar = im.width / im.height; let sw = im.width, sh = im.height, sx = 0, sy = 0; if (ar > iw / ih) { sw = im.height * iw / ih; sx = (im.width - sw) / 2; } else { sh = im.width * ih / iw; sy = (im.height - sh) / 2; } try { x.drawImage(im, sx, sy, sw, sh, 115, 235, iw, ih); } catch (e) { }
  x.textAlign = 'center'; x.fillStyle = '#fff'; x.font = '700 76px Fredoka, sans-serif'; x.fillText('Escondite en el Cuadro', 540, 130); x.font = '700 150px Fredoka, sans-serif'; x.fillStyle = '#fff38a'; x.fillText(bestShot.pct + '%', 540, 1110); x.fillStyle = '#fff'; x.font = '600 48px Fredoka, sans-serif'; x.fillText('de camuflaje en ' + bestShot.cuadro, 540, 1190); x.font = '500 40px Fredoka, sans-serif'; x.fillText('¿A que no me encuentras? 🎨', 540, 1265);
  cv.toBlob(async b => { const f = new File([b], 'mi-escondite.png', { type: 'image/png' }); try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: 'Escondite en el Cuadro', text: `¡Me camuflé al ${bestShot.pct}%! ¿Me encuentras?` }); return; } } catch (e) { } const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'mi-escondite.png'; a.click(); toast('📸 ¡Tarjeta guardada!', '', 1400); window.__lastCard = cv.toDataURL('image/png'); }, 'image/png'); });
// ---------- menú ----------
let menuMs = [];
function menuWorld() { manchas = []; buildBase(CUADROS[curCuadro % 4]); CUADROS[curCuadro % 4].build(); critic = makeCritic(); critic.state = 'wander'; ['#ff8fd0', '#5fc8ff', '#ffb36b'].forEach((c, i) => { const m = makeMancha(c, 'm', false); m.x = -2.5 + i * 2.5; m.z = 4 + (i % 2); m.pose = POSES[i]; m.g.position.set(m.x, 0, m.z); }); curCuadro++; }
function menuAnim(dt) { manchas.forEach((m, i) => { m.hop = m.hop || (Math.sin(T * 2 + i * 2) > .98 ? 1 : 0); m.yaw = Math.sin(T * .7 + i) * .6; animMancha(m, dt); }); if (critic) { critic.speed = 1.6; critic.x = Math.sin(T * .25) * 7; critic.z = Math.cos(T * .25) * 7; critic.yaw = T * .25 + Math.PI / 2; animCritic(dt); } }
// ---------- bucle ----------
function loop(now) { requestAnimationFrame(loop); const dt = Math.min(.05, (now - last) / 1000); last = now;
  update(dt); if (!playing && phase === 'idle') menuAnim(dt);
  renderer.render(scene, camera);
  fpsAcc += dt; fpsN++; fpsT += dt; if (fpsT > 2.5) { const avg = fpsAcc / fpsN; fpsAcc = fpsN = fpsT = 0; const maxQ = Math.min(DPR, 2.25); if (avg > .024 && quality > .75) { quality = Math.max(.75, quality - .25); renderer.setPixelRatio(quality); resize(); if (quality < 1.1) { sun.shadow.mapSize.set(1024, 1024); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } } } else if (avg < .0145 && quality < maxQ) { quality = Math.min(maxQ, quality + .25); renderer.setPixelRatio(quality); resize(); } } }
window.__ec = { proj: m => { const v = new THREE.Vector3(m.x, .6, m.z).project(camera); return [v.x, v.y]; }, get camYaw() { return camYaw; }, get camPitch() { return camPitch; }, get phase() { return phase; }, get role() { return role; }, get me() { return me; }, get manchas() { return manchas; }, get critic() { return critic; }, get props() { return props; }, setPhaseT: v => phaseT = v, camoOf, get shotsLeft() { return shotsLeft; }, setCam: (y, p) => { camYaw = y; camPitch = p; }, fire: () => playerFire(), get quality() { return quality; }, get playing() { return playing; } };
menuWorld(); requestAnimationFrame(loop);
