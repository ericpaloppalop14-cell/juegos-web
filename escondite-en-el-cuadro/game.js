import * as THREE from 'three';
import { ONLINE_DISPONIBLE } from './net.js';
const VERSION = 2;
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
// ---------- CASTILLO (v2) ----------
let world = new THREE.Group(); scene.add(world);
let props = [], refs = [], walls = [], wallMeshes = [], decor = [], hitMeshes = [], lookers = [], rooms = [];
const RS = 16, WH = 6, COLS = 3, ROWS = 2, XMIN = -24, XMAX = 24, ZMIN = -16, ZMAX = 16, DOOR = 3.4;
function shadowAll(o) { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); }
const lathe = (pts, seg = 40) => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg);
function face(g, y, z, s = 1, col = '#3a2050') {
  const e = M(col, { roughness: .3 }); for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.SphereGeometry(.09 * s, 16, 12), e); m.position.set(sx * .22 * s, y, z); m.scale.z = .5; g.add(m); const h = new THREE.Mesh(new THREE.SphereGeometry(.03 * s, 8, 6), M('#fff', { emissive: '#fff' })); h.position.set(sx * .22 * s + .03 * s, y + .04 * s, z + .04 * s); g.add(h); const ck = new THREE.Mesh(new THREE.CircleGeometry(.07 * s, 16), M('#ff8fb8', { transparent: true, opacity: .7 })); ck.position.set(sx * .36 * s, y - .1 * s, z + .01); g.add(ck); }
  const sm = new THREE.Mesh(new THREE.TorusGeometry(.08 * s, .02 * s, 8, 16, Math.PI), e); sm.rotation.z = Math.PI; sm.position.set(0, y - .07 * s, z); g.add(sm); }
const roomC = (i, j) => [XMIN + RS / 2 + i * RS, ZMIN + RS / 2 + j * RS];
function roomOf(x, z) { return clamp(Math.floor((x - XMIN) / RS), 0, COLS - 1) + COLS * clamp(Math.floor((z - ZMIN) / RS), 0, ROWS - 1); }
const ROOMS = [
  { name: 'Galería del Trono', wall: ['rayas', '#ff8fa8', '#ffd1dc'], floor: ['cuadros', '#fff3dc', '#ffd38a'], rug: ['rayas', '#e8455f', '#ffcf4a'], light: '#ffd9a8', build: roomTrono },
  { name: 'Biblioteca Flotante', wall: ['lunares', '#7fd3a0', '#c8f5d8'], floor: ['rayas', '#d99a66', '#c4824f'], rug: ['lunares', '#7a5cff', '#ffd23f'], light: '#fff0c0', build: roomBiblio },
  { name: 'Torre de las Escaleras Imposibles', wall: ['cuadros', '#b49cff', '#ddd0ff'], floor: ['lunares', '#fff6c8', '#ffe08a'], rug: ['cuadros', '#3fd1b5', '#ffffff'], light: '#e8dcff', build: roomTorre },
  { name: 'Comedor de las Tartas', wall: ['cuadros', '#7fcfff', '#ffffff'], floor: ['cuadros', '#ffe3f0', '#ffc2dc'], rug: ['rayas', '#ff9f3d', '#fff3a0'], light: '#fff2d8', build: roomComedor },
  { name: 'Sala de los Cuadros que Respiran', wall: ['rayas', '#ffd23f', '#fff0a8'], floor: ['cuadros', '#ffffff', '#bfeaff'], rug: ['lunares', '#ff5f8f', '#ffffff'], light: '#fff4d0', build: roomRespiran },
  { name: 'Dormitorio Real', wall: ['lunares', '#ffb3dc', '#ffffff'], floor: ['rayas', '#e8b48a', '#d89c70'], rug: ['cuadros', '#a77bff', '#e6d9ff'], light: '#ffe0f0', build: roomDormi },
];
const NAMES = { rayas: 'rayas', lunares: 'lunares', cuadros: 'cuadros', liso: 'liso' };
function paintingTex(kind, c1, c2, pat) { const k = 'pt' + kind + c1 + c2 + pat; if (texCache.has(k)) return texCache.get(k); const W = 256, H = 320, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
  x.drawImage(patTex(pat, c1, c2, 1).image, 0, 0, W, H);
  const dot = (cx, cy, r, c) => { x.fillStyle = c; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); };
  if (kind === 'retrato') { x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.ellipse(128, 200, 80, 110, 0, 0, 7); x.fill(); dot(128, 140, 62, '#ffd9c2'); x.fillStyle = c2; x.fillRect(70, 60, 116, 30); x.fillRect(95, 20, 66, 50); dot(100, 162, 9, '#ff9fb0'); dot(156, 162, 9, '#ff9fb0'); x.strokeStyle = '#8a4a2a'; x.lineWidth = 7; x.beginPath(); x.arc(128, 172, 18, .2, Math.PI - .2); x.stroke(); }
  else if (kind === 'paisaje') { x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(0, 0, W, H * .45); dot(200, 70, 30, '#fff3a0'); x.fillStyle = c2; x.beginPath(); x.ellipse(70, 300, 140, 120, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(220, 320, 120, 130, 0, 0, 7); x.fill(); dot(200, 70, 26, '#ffe066'); }
  else if (kind === 'tapiz') { x.fillStyle = 'rgba(255,255,255,.4)'; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(128, 40 + i * 70); x.lineTo(168, 75 + i * 70); x.lineTo(128, 110 + i * 70); x.lineTo(88, 75 + i * 70); x.fill(); } }
  else if (kind === 'criatura') { dot(128, 170, 80, 'rgba(255,255,255,.5)'); dot(128, 175, 66, c2); dot(104, 160, 18, '#fff'); dot(152, 160, 18, '#fff'); dot(106, 163, 9, '#1a1030'); dot(154, 163, 9, '#1a1030'); x.strokeStyle = '#1a1030'; x.lineWidth = 5; x.beginPath(); x.arc(128, 195, 14, .2, Math.PI - .2); x.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; texCache.set(k, t); return t; }
function vaultTex() { const k = 'vault'; if (texCache.has(k)) return texCache.get(k); const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const x = cv.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#9fdcff'); g.addColorStop(.5, '#d8f1ff'); g.addColorStop(1, '#9fdcff'); x.fillStyle = g; x.fillRect(0, 0, 512, 256); x.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 14; i++) { const cx = Math.random() * 512, cy = 40 + Math.random() * 176; for (let k2 = 0; k2 < 4; k2++) { x.beginPath(); x.arc(cx + k2 * 16, cy + Math.sin(k2) * 6, 14 + Math.random() * 8, 0, 7); x.fill(); } } x.fillStyle = '#ffe066'; for (let i = 0; i < 20; i++) { const sx = Math.random() * 512, sy = Math.random() * 256; x.font = '20px serif'; x.fillText('✦', sx, sy); } const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; texCache.set(k, t); return t; }
const GOLD = () => M('#ffcf4a', { metalness: .7, roughness: .25 });
function addWall(x0, z0, x1, z1, h, mat, room, normal, pal) { // panel alineado a ejes
  const w = Math.abs(x1 - x0) || .3, d = Math.abs(z1 - z0) || .3; const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2); m.receiveShadow = true; m.castShadow = false; world.add(m); wallMeshes.push(m); hitMeshes.push(m); m.userData.wall = true;
  if (h > 3) walls.push({ minx: Math.min(x0, x1) - (x0 === x1 ? .15 : 0), maxx: Math.max(x0, x1) + (x0 === x1 ? .15 : 0), minz: Math.min(z0, z1) - (z0 === z1 ? .15 : 0), maxz: Math.max(z0, z1) + (z0 === z1 ? .15 : 0) });
  if (pal && h > 3) { const L = Math.max(w, d); const n = Math.floor(L / 1.0); for (let i = 0; i <= n; i++) { const t = (i + .5) / (n + 1); const px = x0 === x1 ? x0 + normal[0] * .3 : lerp(x0, x1, t), pz = z0 === z1 ? z0 + normal[1] * .3 : lerp(z0, z1, t); refs.push(Object.assign({ x: px, z: pz, r: 0, wall: true, room, nx: normal[0], nz: normal[1] }, pal)); } }
  return m; }
function hangPainting(room, side, t, kind, w, h, y, pal, opts = {}) { // side: 0 norte(-z) 1 sur(+z) 2 oeste(-x) 3 este(+x); t: 0..1 a lo largo
  const r = rooms[room]; const [cx, cz] = r.c; const half = RS / 2 - .3; let x, z, ry, nx, nz;
  if (side === 0) { x = cx - half + t * 2 * half; z = cz - half; ry = 0; nx = 0; nz = 1; } else if (side === 1) { x = cx - half + t * 2 * half; z = cz + half; ry = Math.PI; nx = 0; nz = -1; } else if (side === 2) { x = cx - half; z = cz - half + t * 2 * half; ry = Math.PI / 2; nx = 1; nz = 0; } else { x = cx + half; z = cz - half + t * 2 * half; ry = -Math.PI / 2; nx = -1; nz = 0; }
  const g = new THREE.Group(); g.position.set(x + nx * .02, y, z + nz * .02); g.rotation.y = ry; world.add(g);
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: paintingTex(kind, pal.c1, pal.c2, pal.pat), roughness: .7 })); pic.position.z = .09; g.add(pic); hitMeshes.push(pic);
  if (kind !== 'tapiz') { const fm = GOLD(); const fw = .22; [[0, h / 2 + fw / 2, w + fw * 2, fw], [0, -h / 2 - fw / 2, w + fw * 2, fw], [-w / 2 - fw / 2, 0, fw, h], [w / 2 + fw / 2, 0, fw, h]].forEach(([px, py, bw, bh]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, .18), fm); b.position.set(px, py, .09); b.castShadow = true; g.add(b); }); }
  else { const rod = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, w + .5, 8), GOLD()); rod.rotation.z = Math.PI / 2; rod.position.set(0, h / 2 + .05, .12); g.add(rod); for (let i = 0; i < 9; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(.08, .25, 6), M(pal.c2)); f.position.set(-w / 2 + i * w / 8, -h / 2 - .1, .1); f.rotation.z = Math.PI; g.add(f); } }
  if (opts.eyes) { const eyes = []; for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(w * .08, 18, 12), M('#ffffff', { roughness: .15 })); e.position.set(sx * w * .13, h * .1, .12); e.scale.z = .45; g.add(e); const p = new THREE.Mesh(new THREE.SphereGeometry(w * .04, 14, 10), M('#1a1030')); p.position.set(sx * w * .13, h * .1, .16); g.add(p); eyes.push({ p, bx: sx * w * .13, by: h * .1 }); } lookers.push({ g, eyes, w }); }
  if (opts.breathe) decor.push({ o: pic, f: (o, tt) => { const k = Math.sin(tt * 1.6 + x) * .5 + .5; o.scale.set(1 + k * .03, 1 + k * .03, 1); o.position.z = .09 + k * .12; } });
  // referencia de camuflaje si llega al suelo (la Mancha puede ponerse delante)
  if (y - h / 2 < 1.4) { const n = Math.max(1, Math.round(w)); for (let i = 0; i < n; i++) { const off = (i + .5) / n - .5; const along = side < 2 ? [1, 0] : [0, 1]; refs.push(Object.assign({ x: x + nx * .3 + along[0] * off * w, z: z + nz * .3 + along[1] * off * w, r: 0, wall: true, room, nx, nz, painting: true, prio: 1 }, pal, { name: opts.name || 'el cuadro', pose: kind === 'paisaje' ? 'tumbada' : 'alta' })); } }
  return g; }
function addProp(g, x, z, r, pal, name, room) { g.position.set(x, 0, z); shadowAll(g); world.add(g); const p = Object.assign({ x, z, r, g, name, room, fade: 1, mats: [] }, pal); g.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.userData.op = m.material.opacity; m.material.userData.tr = m.material.transparent; p.mats.push(m.material); } }); g.traverse(m => { if (m.isMesh) { m.userData.prop = p; hitMeshes.push(m); } }); props.push(p); refs.push(p); return p; }
function addRug(room, w, d, pal, ox = 0, oz = 0) { const [cx, cz] = rooms[room].c; const t = patTex(pal.pat, pal.c1, pal.c2, 1).clone(); t.repeat.set(w / 2.5, d / 2.5); t.needsUpdate = true; const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: t, roughness: .95 })); m.rotation.x = -Math.PI / 2; m.position.set(cx + ox, .02, cz + oz); m.receiveShadow = true; world.add(m); hitMeshes.push(m);
  const bm = GOLD(); [[0, d / 2, w + .3, .15], [0, -d / 2, w + .3, .15], [w / 2, 0, .15, d], [-w / 2, 0, .15, d]].forEach(([a, b, bw, bd]) => { const e = new THREE.Mesh(new THREE.BoxGeometry(bw, .04, bd), bm); e.position.set(cx + ox + a, .03, cz + oz + b); world.add(e); });
  rooms[room].rugs.push(Object.assign({ x0: cx + ox - w / 2, x1: cx + ox + w / 2, z0: cz + oz - d / 2, z1: cz + oz + d / 2, pose: 'plana', name: 'la alfombra' }, pal)); }
function windowAt(room, side, t) { const r = rooms[room]; const [cx, cz] = r.c; const half = RS / 2 - .3; let x, z, ry; if (side === 0) { x = cx - half + t * 2 * half; z = cz - half; ry = 0; } else if (side === 1) { x = cx - half + t * 2 * half; z = cz + half; ry = Math.PI; } else if (side === 2) { x = cx - half; z = cz - half + t * 2 * half; ry = Math.PI / 2; } else { x = cx + half; z = cz - half + t * 2 * half; ry = -Math.PI / 2; }
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; world.add(g);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.6), new THREE.MeshBasicMaterial({ map: gradTex(['#7fd3ff', '#e0f6ff', '#fff6c8']) })); glass.position.set(0, 4.0, .1); g.add(glass); const arch = new THREE.Mesh(new THREE.CircleGeometry(.8, 24, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#bfeaff' })); arch.position.set(0, 5.3, .1); g.add(arch);
  const fm = M('#ffffff', { roughness: .4 }); [[0, 4, .1, 2.6], [0, 4, 1.6, .1]].forEach(([a, b, w, h]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, .08), fm); m.position.set(a, b, .14); g.add(m); }); const sill = new THREE.Mesh(new THREE.BoxGeometry(2, .15, .4), fm); sill.position.set(0, 2.65, .2); g.add(sill);
  const shaft = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 6), new THREE.MeshBasicMaterial({ map: gradTex(['rgba(255,250,210,0.0)', 'rgba(255,250,210,0.35)', 'rgba(255,250,210,0.0)']), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); shaft.position.set(0, 2.2, 2.3); shaft.rotation.x = -.85; g.add(shaft); decor.push({ o: shaft, f: (o, tt) => o.material.opacity = .75 + Math.sin(tt * .8 + x) * .25 }); }
function chandelier(room) { const [cx, cz] = rooms[room].c; const g = new THREE.Group(); g.position.set(cx, WH + 1.2, cz); const gm = GOLD(); const ring = new THREE.Mesh(new THREE.TorusGeometry(1.2, .07, 8, 32), gm); ring.rotation.x = Math.PI / 2; g.add(ring); const chain = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 4, 6), gm); chain.position.y = 2; g.add(chain);
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; const c = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .3, 8), M('#fff')); c.position.set(Math.cos(a) * 1.2, .2, Math.sin(a) * 1.2); g.add(c); const fl = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffd27a' })); fl.scale.y = 1.6; fl.position.set(Math.cos(a) * 1.2, .43, Math.sin(a) * 1.2); g.add(fl); }
  world.add(g); const L = new THREE.PointLight(rooms[room].def.light, 30, 26, 1.2); L.position.set(cx, WH - .5, cz); world.add(L); decor.push({ o: g, f: (o, tt) => { o.rotation.y = tt * .15; L.intensity = 28 + Math.sin(tt * 7 + cx) * 1.5; } }); }
function buildCastle() {
  scene.remove(world); world.traverse(o => { if (o.geometry) o.geometry.dispose(); }); world = new THREE.Group(); scene.add(world);
  props = []; refs = []; walls = []; wallMeshes = []; decor = []; hitMeshes = []; lookers = []; rooms = [];
  scene.fog = null; scene.background = new THREE.Color('#ffe6c8');
  for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) { const id = i + j * COLS; rooms.push({ id, i, j, c: roomC(i, j), def: ROOMS[id], rugs: [] }); }
  const doorsList = [];
  for (const r of rooms) { const d = r.def, [cx, cz] = r.c, h = RS / 2, i = r.i, j = r.j;
    const fl = patTex(d.floor[0], d.floor[1], d.floor[2], 1).clone(); fl.repeat.set(5, 5); fl.needsUpdate = true; const floor = new THREE.Mesh(new THREE.PlaneGeometry(RS, RS), new THREE.MeshStandardMaterial({ map: fl, roughness: .45, metalness: .05 })); floor.rotation.x = -Math.PI / 2; floor.position.set(cx, 0, cz); floor.receiveShadow = true; world.add(floor); hitMeshes.push(floor); r.floorPal = { pat: d.floor[0], c1: d.floor[1], c2: d.floor[2], pose: 'plana', name: 'el suelo' };
    const wt = patTex(d.wall[0], d.wall[1], d.wall[2], 1).clone(); wt.repeat.set(RS / 2.2, WH / 2.2); wt.needsUpdate = true; const wm = new THREE.MeshStandardMaterial({ map: wt, roughness: .8 }); const wpal = { pat: d.wall[0], c1: d.wall[1], c2: d.wall[2], pose: 'alta', name: 'el papel pintado' };
    const sides = [[0, -1, j > 0], [0, 1, j < ROWS - 1], [-1, 0, i > 0], [1, 0, i < COLS - 1]];
    sides.forEach(([sx, sz, hasN], si) => { const inset = .15; if (sz) { const z = cz + sz * (h - inset); const nrm = [0, -sz]; if (hasN) { addWall(cx - h, z, cx - DOOR / 2, z, WH, wm, r.id, nrm, wpal); addWall(cx + DOOR / 2, z, cx + h, z, WH, wm, r.id, nrm, wpal); addWall(cx - DOOR / 2, z, cx + DOOR / 2, z, WH - 3.8, wm, r.id, nrm).position.y = 3.8 + (WH - 3.8) / 2; } else addWall(cx - h, z, cx + h, z, WH, wm, r.id, nrm, wpal); }
      else { const x = cx + sx * (h - inset); const nrm = [-sx, 0]; if (hasN) { addWall(x, cz - h, x, cz - DOOR / 2, WH, wm, r.id, nrm, wpal); addWall(x, cz + DOOR / 2, x, cz + h, WH, wm, r.id, nrm, wpal); addWall(x, cz - DOOR / 2, x, cz + DOOR / 2, WH - 3.8, wm, r.id, nrm).position.y = 3.8 + (WH - 3.8) / 2; } else addWall(x, cz - h, x, cz + h, WH, wm, r.id, nrm, wpal); } });
    walls.splice(walls.length - 0); // (los dinteles de puerta no bloquean: se eliminan abajo)
    // zócalo dorado y moldura
    const gm = GOLD(); for (const [w, d2, px, pz] of [[RS, .1, cx, cz - h + .32], [RS, .1, cx, cz + h - .32], [.1, RS, cx - h + .32, cz], [.1, RS, cx + h - .32, cz]]) { for (const y of [.12, WH - .1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, .22, d2 + .02), gm); b.position.set(px, y, pz); world.add(b); } }
    // bóveda pintada de cielo
    const v = new THREE.Mesh(new THREE.CylinderGeometry(h, h, RS, 32, 1, true, 0, Math.PI), new THREE.MeshStandardMaterial({ map: vaultTex(), side: THREE.BackSide, roughness: 1, emissive: '#ffffff', emissiveMap: vaultTex(), emissiveIntensity: .35 })); v.rotation.z = Math.PI / 2; v.position.set(cx, WH, cz); world.add(v);
    const capM = new THREE.MeshStandardMaterial({ map: wt, roughness: .8, side: THREE.DoubleSide }); for (const s of [-1, 1]) { const cap = new THREE.Mesh(new THREE.CircleGeometry(h, 32, 0, Math.PI), capM); cap.position.set(cx + s * h * .999, WH, cz); cap.rotation.y = Math.PI / 2; world.add(cap); }
    chandelier(r.id);
  }
  // los dinteles (altura < 3) no colisionan con el suelo de juego
  walls = walls.filter((w, i) => true);
  // arcos dorados de las puertas
  for (const r of rooms) { const [cx, cz] = r.c; if (r.i < COLS - 1) doorArch(cx + RS / 2, cz, Math.PI / 2); if (r.j < ROWS - 1) doorArch(cx, cz + RS / 2, 0); }
  rooms.forEach(r => r.def.build(r.id));
  wallMeshes.forEach(m => { m.updateMatrixWorld(); });
  const n = 220, pg = new THREE.BufferGeometry(), pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = rnd(XMIN, XMAX); pos[i * 3 + 1] = rnd(.5, 5.5); pos[i * 3 + 2] = rnd(ZMIN, ZMAX); } pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: .22, color: '#fff3b0', transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, map: dotTex() })); world.add(pts); decor.push({ o: pts, f: (o, t) => { o.position.y = Math.sin(t * .5) * .3; } });
}
// los dinteles se añaden a walls con altura reducida; la colisión ignora los que empiezan por encima de 3 m
function doorArch(x, z, ry) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; const gm = GOLD(); const a = new THREE.Mesh(new THREE.TorusGeometry(DOOR / 2, .16, 10, 24, Math.PI), gm); a.position.y = 3.8 - DOOR / 2 + .1; a.scale.y = 1; g.add(a); for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.2, .24, 3.8 - DOOR / 2 + .1, 12), gm); c.position.set(s * DOOR / 2, (3.8 - DOOR / 2 + .1) / 2, 0); c.castShadow = true; g.add(c); } world.add(g); }
let _dot; function dotTex() { if (_dot) return _dot; const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, '#fff'); g.addColorStop(.4, 'rgba(255,255,220,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); _dot = new THREE.CanvasTexture(cv); return _dot; }
const RC = id => rooms[id].c;
// ---- muebles y rarezas ----
function boxProp(room, x, z, w, d, g, pal, name) { const p = addProp(g, x, z, 0, pal, name, room); p.box = { minx: x - w / 2, maxx: x + w / 2, minz: z - d / 2, maxz: z + d / 2 }; return p; }
function propDist(p, x, z) { if (p.box) { const b = p.box; const dx = Math.max(b.minx - x, 0, x - b.maxx), dz = Math.max(b.minz - z, 0, z - b.maxz); return Math.hypot(dx, dz); } return Math.hypot(p.x - x, p.z - z) - p.r; }
function W(room, ox, oz) { const [cx, cz] = rooms[room].c; return [cx + ox, cz + oz]; }
function outerSides(room) { const r = rooms[room]; const s = []; if (r.j === 0) s.push(0); if (r.j === ROWS - 1) s.push(1); if (r.i === 0) s.push(2); if (r.i === COLS - 1) s.push(3); return s; }
function throne() { const g = new THREE.Group(); const gm = GOLD(), red = M('#e8455f', { roughness: .6 }); const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, .9, 1.4), gm); seat.position.y = .45; g.add(seat); const cu = new THREE.Mesh(new THREE.BoxGeometry(1.5, .3, 1.2), red); cu.position.y = 1.0; g.add(cu); const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.2, .35), gm); back.position.set(0, 2.1, -.55); g.add(back); const bc = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.4, .1), PM('cuadros', '#ffcf4a', '#e8455f', 2)); bc.position.set(0, 2.1, -.33); g.add(bc); for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.SphereGeometry(.25, 14, 10), gm); b.position.set(s * .9, 3.8, -.55); g.add(b); } const crown = new THREE.Mesh(new THREE.ConeGeometry(.5, .7, 5), gm); crown.position.set(0, 4.0, -.55); g.add(crown); face(g, 2.6, -.27, 2.2, '#8a1f3e'); return g; }
function jellyArmor(c) { const g = new THREE.Group(); const jm = new THREE.MeshPhysicalMaterial({ color: c, transparent: true, opacity: .72, roughness: .1, transmission: 0, clearcoat: 1, emissive: c, emissiveIntensity: .15 }); const body = new THREE.Mesh(new THREE.CapsuleGeometry(.45, .9, 8, 16), jm); body.position.y = 1.2; g.add(body); const head = new THREE.Mesh(new THREE.SphereGeometry(.42, 20, 14), jm); head.position.y = 2.25; g.add(head); const visor = new THREE.Mesh(new THREE.BoxGeometry(.5, .08, .1), M('#1a1030')); visor.position.set(0, 2.25, .38); g.add(visor); const plume = new THREE.Mesh(new THREE.SphereGeometry(.18, 10, 8), M('#ff6fb5')); plume.scale.y = 2; plume.position.y = 2.8; g.add(plume); for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.CapsuleGeometry(.14, .5, 6, 10), jm); l.position.set(s * .2, .35, 0); g.add(l); } const sp = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 3, 6), GOLD()); sp.position.set(.6, 1.5, 0); g.add(sp); g.userData.jelly = [body, head]; return g; }
function bookshelf(w, c1, c2) { const g = new THREE.Group(); const wood = M('#8a4a2a', { roughness: .7 }); const frame = new THREE.Mesh(new THREE.BoxGeometry(w, 4.2, .7), wood); frame.position.y = 2.1; g.add(frame); for (let row = 0; row < 4; row++) { let x = -w / 2 + .15; let k = 0; while (x < w / 2 - .25) { const bw = rnd(.14, .26), bh = rnd(.6, .85); const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, .5), M(k++ % 2 ? c1 : c2, { roughness: .5 })); b.position.set(x + bw / 2, .35 + row * 1.0 + bh / 2, .15); b.rotation.z = rnd(-.04, .04); g.add(b); x += bw + .03; } } return g; }
function globe() { const g = new THREE.Group(); const st = new THREE.Mesh(new THREE.CylinderGeometry(.1, .4, 1, 10), GOLD()); st.position.y = .5; g.add(st); const s = new THREE.Mesh(new THREE.SphereGeometry(.8, 28, 18), PM('lunares', '#5fc8ff', '#7ed957', 2)); s.position.y = 1.6; g.add(s); const ring = new THREE.Mesh(new THREE.TorusGeometry(.92, .04, 6, 32), GOLD()); ring.position.y = 1.6; ring.rotation.x = 1.2; g.add(ring); g.userData.spin = s; face(s, .1, .78, 1.2); return g; }
function armchair(c) { const g = new THREE.Group(); const m = M(c, { roughness: .8 }); const b = new THREE.Mesh(new THREE.SphereGeometry(.9, 20, 14), m); b.scale.set(1, .6, 1); b.position.y = .6; g.add(b); const back = new THREE.Mesh(new THREE.SphereGeometry(.8, 20, 14), m); back.scale.set(1.1, 1, .45); back.position.set(0, 1.3, -.55); g.add(back); for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.CapsuleGeometry(.22, .8, 6, 10), m); a.rotation.x = Math.PI / 2; a.position.set(s * .85, .95, 0); g.add(a); } return g; }
function stairsImpossible(c1, c2) { const g = new THREE.Group(); const col = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, WH * 2, 16), M(c2)); col.position.y = WH; g.add(col); for (let i = 0; i < 30; i++) { const a = i * .42, y = .15 + i * .26; const st = new THREE.Mesh(new THREE.BoxGeometry(1.4, .2, .6), M(i % 2 ? c1 : c2, { roughness: .4 })); st.position.set(Math.cos(a) * 1.0, y, Math.sin(a) * 1.0); st.rotation.y = -a; g.add(st); } for (let i = 0; i < 12; i++) { const a = i * .5; const st = new THREE.Mesh(new THREE.BoxGeometry(1.4, .2, .6), M(i % 2 ? c2 : c1)); st.position.set(Math.cos(a) * 2.2 - 3, 5.6 - i * .05, Math.sin(a) * 2.2); st.rotation.set(Math.PI, -a, 0); g.add(st); } return g; }
function cake() { const g = new THREE.Group(); [[1.2, .9, '#ffb3dc'], [.9, .8, '#ffffff'], [.6, .7, '#ffb3dc']].reduce((y, [r, h, c], i) => { const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 28), PM('rayas', c, i % 2 ? '#ffd1ea' : '#ffffff', 1, { roughness: .4 })); t.position.y = y + h / 2; g.add(t); return y + h; }, 0); const cdl = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .5, 8), M('#5fc8ff')); cdl.position.y = 2.65; g.add(cdl); const fl = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffd27a' })); fl.scale.y = 1.6; fl.position.y = 3.0; g.add(fl); face(g, .45, 1.21, 2); return g; }
function teapot(c) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(.7, 22, 16), PM('lunares', c, '#ffffff', 2, { roughness: .25 })); b.scale.y = .85; b.position.y = .62; g.add(b); const sp = new THREE.Mesh(new THREE.CylinderGeometry(.08, .16, .8, 10), M(c)); sp.position.set(.75, .9, 0); sp.rotation.z = -.8; g.add(sp); const lid = new THREE.Mesh(new THREE.SphereGeometry(.2, 10, 8), M(c)); lid.position.y = 1.25; g.add(lid);
  // té que cae hacia ARRIBA
  for (let i = 0; i < 8; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), M('#c97a3a', { transparent: true, opacity: .85 })); g.add(d); decor.push({ o: d, f: (o, t) => { const k = (t * .6 + i / 8) % 1; o.position.set(1.05 + k * .2, 1.2 + k * 3, 0); o.scale.setScalar(1 - k * .6); } }); } face(g, .65, .62, 1.2); return g; }
function longTable(w) { const g = new THREE.Group(); const top = new THREE.Mesh(new THREE.BoxGeometry(w, .18, 2.2), M('#c4824f')); top.position.y = 1.05; g.add(top); const cl = new THREE.Mesh(new THREE.BoxGeometry(w + .3, .9, 2.5), PM('lunares', '#ffffff', '#ff6fb5', 3)); cl.position.y = .72; g.add(cl); for (let i = 0; i < 5; i++) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .04, 16), M('#fff')); pl.position.set(-w / 2 + .8 + i * (w - 1.6) / 4, 1.17, 0); g.add(pl); const fr = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 8), M(pick(['#ff5f8f', '#ffd23f', '#7ed957']))); fr.position.set(pl.position.x, 1.3, 0); g.add(fr); } return g; }
function bust() { const g = new THREE.Group(); const ped = new THREE.Mesh(new THREE.CylinderGeometry(.45, .55, 1.3, 16), M('#ffffff', { roughness: .3 })); ped.position.y = .65; g.add(ped); const h = new THREE.Mesh(new THREE.SphereGeometry(.5, 20, 14), M('#ffffff', { roughness: .3 })); h.position.y = 1.8; g.add(h); const n = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 6), M('#fff')); n.position.set(0, 1.78, .5); g.add(n); face(g, 1.92, .48, 1.2, '#8a8aa8'); const mus = new THREE.Mesh(new THREE.TorusGeometry(.18, .05, 6, 12, Math.PI), M('#ffffff')); mus.position.set(0, 1.65, .48); g.add(mus); return g; }
function vase(c1, c2) { const g = new THREE.Group(); const v = new THREE.Mesh(lathe([[0, 0], [.35, 0], [.6, .5], [.55, 1.1], [.28, 1.5], [.38, 1.75], [0, 1.75]]), PM('rayas', c1, c2, 2, { roughness: .3 })); g.add(v); for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(.18, 10, 8), M(pick(['#ff5f8f', '#ffd23f', '#5fc8ff']))); f.position.set(rnd(-.2, .2), 2.1 + i * .1, rnd(-.2, .2)); g.add(f); } return g; }
function bed() { const g = new THREE.Group(); const fr = new THREE.Mesh(new THREE.BoxGeometry(3, .7, 4), M('#ffcf4a', { metalness: .4, roughness: .4 })); fr.position.y = .35; g.add(fr); const bl = new THREE.Mesh(new THREE.BoxGeometry(3.1, .4, 3.2), PM('cuadros', '#a77bff', '#e6d9ff', 2)); bl.position.set(0, .9, .35); g.add(bl); for (const s of [-1, 1]) { const pl = new THREE.Mesh(new THREE.SphereGeometry(.55, 14, 10), M('#ffffff')); pl.scale.set(1, .4, .7); pl.position.set(s * .7, 1.05, -1.5); g.add(pl); } const hb = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, .25), M('#ff9fd6')); hb.position.set(0, 1.1, -2); g.add(hb); face(hb, .35, .14, 2.5, '#8a1f5e'); return g; }
function wardrobe() { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4, 1), PM('rayas', '#ff9f3d', '#ffd23f', 1)); b.position.y = 2; g.add(b); for (const s of [-1, 1]) { const k = new THREE.Mesh(new THREE.SphereGeometry(.1, 8, 6), GOLD()); k.position.set(s * .2, 2, .52); g.add(k); } face(g, 3, .51, 2.2); return g; }
function jellyBear(c) { const g = new THREE.Group(); const jm = new THREE.MeshPhysicalMaterial({ color: c, transparent: true, opacity: .78, roughness: .1, clearcoat: 1, emissive: c, emissiveIntensity: .2 }); const b = new THREE.Mesh(new THREE.SphereGeometry(.75, 20, 14), jm); b.position.y = .75; g.add(b); const h = new THREE.Mesh(new THREE.SphereGeometry(.5, 20, 14), jm); h.position.y = 1.75; g.add(h); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.18, 10, 8), jm); e.position.set(s * .38, 2.15, 0); g.add(e); } face(g, 1.8, .48, 1.1); g.userData.jelly = [b, h]; return g; }
function floatBooks(room, n) { const [cx, cz] = rooms[room].c; for (let i = 0; i < n; i++) { const b = new THREE.Group(); const c = pick(['#ff6fb5', '#5fc8ff', '#ffd23f', '#7a5cff', '#3fd1b5']); for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.5, .04, .7), M(c)); p.position.x = s * .26; p.rotation.z = s * .35; b.add(p); } const x0 = cx + rnd(-6, 6), z0 = cz + rnd(-6, 6), y0 = rnd(3.2, 5.2), ph = rnd(0, 6); b.position.set(x0, y0, z0); world.add(b); decor.push({ o: b, f: (o, t) => { o.position.set(x0 + Math.sin(t * .4 + ph) * 1.5, y0 + Math.sin(t * 1.3 + ph) * .3, z0 + Math.cos(t * .4 + ph) * 1.5); o.children.forEach((p, k) => p.rotation.z = (k ? 1 : -1) * (.2 + Math.abs(Math.sin(t * 6 + ph)) * .5)); o.rotation.y = t * .4 + ph; } }); } }
function moons(room) { const [cx, cz] = rooms[room].c; for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(rnd(.3, .6), 16, 12), M('#fff6a8', { emissive: '#ffe066', emissiveIntensity: .6 })); const a = i / 5 * 6.28; world.add(m); decor.push({ o: m, f: (o, t) => o.position.set(cx + Math.cos(t * .2 + a) * 5, 4.5 + Math.sin(t + a) * .4, cz + Math.sin(t * .2 + a) * 5) }); } }
const sideT = s => pick([.15, .25, .75, .85]);
function decoWalls(room, list) { const outs = outerSides(room); for (let s = 0; s < 4; s++) { if (outs.includes(s)) { windowAt(room, s, .5); } } list.forEach(([side, t, kind, w, h, y, pal, opts]) => hangPainting(room, side, t, kind, w, h, y, pal, opts || {})); }
// ---- salas ----
function roomTrono(id) { const [cx, cz] = rooms[id].c; addRug(id, 3.2, 12, { pat: 'rayas', c1: '#e8455f', c2: '#ffcf4a' }, 0, 1);
  addProp(throne(), cx, cz - 6.3, 1.2, { c1: '#ffcf4a', c2: '#e8455f', pat: 'cuadros', pose: 'alta' }, 'el trono', id);
  [[-3.5, -4], [3.5, -4], [-3.5, 2], [3.5, 2]].forEach(([ox, oz], k) => { const c = ['#7fe0a0', '#ff9fd6', '#9fdcff', '#ffd23f'][k]; const p = addProp(jellyArmor(c), cx + ox, cz + oz, .6, { c1: c, c2: c, pat: 'liso', pose: 'alta' }, 'una armadura de gelatina', id); p.jelly = true; p.g.rotation.y = ox < 0 ? Math.PI / 2 : -Math.PI / 2; });
  addProp(vase('#5fc8ff', '#ffffff'), cx - 6.5, cz + 6.5, .6, { c1: '#5fc8ff', c2: '#ffffff', pat: 'rayas', pose: 'alta' }, 'un jarrón', id);
  decoWalls(id, [[0, .2, 'retrato', 2, 2.6, 3.1, { c1: '#7a5cff', c2: '#ffcf4a', pat: 'lunares' }, { eyes: true, name: 'el retrato de la Reina' }], [0, .8, 'retrato', 2, 2.6, 3.1, { c1: '#3fd1b5', c2: '#ff6fb5', pat: 'cuadros' }, { eyes: true, name: 'el retrato del Rey' }],
    [2, .3, 'tapiz', 2.4, 3.6, 2.0, { c1: '#e8455f', c2: '#ffcf4a', pat: 'rayas' }, { name: 'el tapiz real' }], [1, .2, 'paisaje', 2.6, 2, 1.25, { c1: '#ffb03d', c2: '#7ed957', pat: 'lunares' }, { breathe: true, name: 'el paisaje' }], [3, .2, 'tapiz', 2.4, 3.6, 2.0, { c1: '#7a5cff', c2: '#ffffff', pat: 'cuadros' }, { name: 'el tapiz morado' }]]); }
function roomBiblio(id) { const [cx, cz] = rooms[id].c; addRug(id, 7, 6, { pat: 'lunares', c1: '#7a5cff', c2: '#ffd23f' }, 0, 1);
  [[-4.5, '#ff6fb5', '#ffd23f'], [0, '#5fc8ff', '#ffffff'], [4.5, '#7a5cff', '#3fd1b5']].forEach(([ox, c1, c2]) => { const g = bookshelf(3.2, c1, c2); boxProp(id, cx + ox, cz - 7.3, 3.2, .8, g, { c1, c2, pat: 'rayas', pose: 'alta' }, 'una estantería'); });
  addProp(globe(), cx + 4.5, cz + 3, .8, { c1: '#5fc8ff', c2: '#7ed957', pat: 'lunares', pose: 'bolita' }, 'el globo terráqueo', id);
  addProp(armchair('#ff9f3d'), cx - 3, cz + 1.5, 1.0, { c1: '#ff9f3d', c2: '#ff9f3d', pat: 'liso', pose: 'bolita' }, 'un sillón', id); addProp(armchair('#3fd1b5'), cx + 1, cz + 4.5, 1.0, { c1: '#3fd1b5', c2: '#3fd1b5', pat: 'liso', pose: 'bolita' }, 'un sillón', id);
  floatBooks(id, 9);
  decoWalls(id, [[1, .2, 'criatura', 2.2, 2.6, 1.45, { c1: '#ffd23f', c2: '#ff6fb5', pat: 'liso' }, { name: 'el cuadro del Dragoncito' }], [1, .8, 'retrato', 2, 2.6, 3.1, { c1: '#ff9fd6', c2: '#7a5cff', pat: 'rayas' }, { eyes: true, name: 'el retrato del Bibliotecario' }]]); }
function roomTorre(id) { const [cx, cz] = rooms[id].c; addRug(id, 6, 6, { pat: 'cuadros', c1: '#3fd1b5', c2: '#ffffff' }, -3, 3);
  addProp(stairsImpossible('#ffd23f', '#ff9f3d'), cx + 2, cz - 2, 1.6, { c1: '#ffd23f', c2: '#ff9f3d', pat: 'rayas', pose: 'alta' }, 'la escalera imposible', id);
  const tel = new THREE.Group(); const tb = new THREE.Mesh(new THREE.CylinderGeometry(.25, .35, 2.2, 14), PM('rayas', '#7a5cff', '#ffffff', 1)); tb.rotation.x = -.8; tb.position.y = 1.8; tel.add(tb); for (const a of [0, 2.1, 4.2]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1.6, 6), GOLD()); l.position.set(Math.cos(a) * .4, .7, Math.sin(a) * .4); l.rotation.set(Math.sin(a) * .3, 0, Math.cos(a) * .3); tel.add(l); }
  addProp(tel, cx - 5, cz - 5, .7, { c1: '#7a5cff', c2: '#ffffff', pat: 'rayas', pose: 'tumbada' }, 'el telescopio', id);
  for (const [ox, oz] of [[5.5, 5], [-6, -1]]) { const c = pick(['#9fdcff', '#ffd23f']); addProp(jellyBear(c), cx + ox, cz + oz, .8, { c1: c, c2: c, pat: 'liso', pose: 'bolita' }, 'un osito de gelatina', id).jelly = true; }
  moons(id);
  decoWalls(id, [[2, .2, 'paisaje', 2.6, 2, 1.25, { c1: '#b49cff', c2: '#ffd23f', pat: 'lunares' }, { breathe: true, name: 'el cuadro de la Luna' }], [1, .3, 'tapiz', 2.4, 3.6, 2.0, { c1: '#3fd1b5', c2: '#ffffff', pat: 'cuadros' }, { name: 'el tapiz turquesa' }]]); }
function roomComedor(id) { const [cx, cz] = rooms[id].c; addRug(id, 10, 5, { pat: 'rayas', c1: '#ff9f3d', c2: '#fff3a0' }, 0, -1);
  boxProp(id, cx, cz - 1, 8.3, 2.5, longTable(8), { c1: '#ffffff', c2: '#ff6fb5', pat: 'lunares', pose: 'plana' }, 'el mantel', id);
  addProp(cake(), cx - 4, cz + 4.5, 1.2, { c1: '#ffb3dc', c2: '#ffffff', pat: 'rayas', pose: 'bolita' }, 'la tarta gigante', id);
  addProp(teapot('#5fc8ff'), cx + 4, cz + 4.5, .8, { c1: '#5fc8ff', c2: '#ffffff', pat: 'lunares', pose: 'bolita' }, 'la tetera', id);
  [-3, 0, 3].forEach(ox => { for (const s of [-1, 1]) { const c = new THREE.Group(); const seat = new THREE.Mesh(new THREE.BoxGeometry(.8, .12, .8), M('#ff6fb5')); seat.position.y = .6; c.add(seat); const bk = new THREE.Mesh(new THREE.BoxGeometry(.8, 1, .1), M('#ff6fb5')); bk.position.set(0, 1.1, s * .4); c.add(bk); for (const [a, b] of [[-.35, -.35], [.35, -.35], [-.35, .35], [.35, .35]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .6, 6), GOLD()); l.position.set(a, .3, b); c.add(l); } addProp(c, cx + ox, cz - 1 + s * 1.9, .45, { c1: '#ff6fb5', c2: '#ff6fb5', pat: 'liso', pose: 'bolita' }, 'una silla', id); } });
  decoWalls(id, [[0, .3, 'criatura', 2.2, 2.6, 1.45, { c1: '#7ed957', c2: '#ff9f3d', pat: 'lunares' }, { breathe: true, name: 'el bodegón vivo' }], [3, .2, 'retrato', 2, 2.6, 3.1, { c1: '#ffd23f', c2: '#5fc8ff', pat: 'rayas' }, { eyes: true, name: 'el retrato del Cocinero' }], [0, .75, 'tapiz', 2.4, 3.6, 2.0, { c1: '#5fc8ff', c2: '#ffffff', pat: 'cuadros' }, { name: 'el tapiz de cuadros' }]]); }
function roomRespiran(id) { const [cx, cz] = rooms[id].c; addRug(id, 5, 5, { pat: 'lunares', c1: '#ff5f8f', c2: '#ffffff' });
  addProp(bust(), cx - 3.5, cz - 3.5, .55, { c1: '#ffffff', c2: '#ffffff', pat: 'liso', pose: 'alta' }, 'el busto', id); addProp(bust(), cx + 3.5, cz + 3.5, .55, { c1: '#ffffff', c2: '#ffffff', pat: 'liso', pose: 'alta' }, 'el busto', id);
  addProp(vase('#ff6fb5', '#ffd23f'), cx + 3.5, cz - 3.5, .6, { c1: '#ff6fb5', c2: '#ffd23f', pat: 'rayas', pose: 'alta' }, 'un jarrón', id); addProp(vase('#7ed957', '#ffffff'), cx - 3.5, cz + 3.5, .6, { c1: '#7ed957', c2: '#ffffff', pat: 'rayas', pose: 'alta' }, 'un jarrón', id);
  const big = { breathe: true }; decoWalls(id, [[0, .2, 'criatura', 2.4, 2.6, 1.45, { c1: '#5fc8ff', c2: '#ffd23f', pat: 'cuadros' }, { breathe: true, name: 'el cuadro que respira' }], [0, .8, 'paisaje', 2.6, 2, 1.25, { c1: '#ff9fd6', c2: '#7ed957', pat: 'rayas' }, { breathe: true, name: 'el paisaje que respira' }], [1, .2, 'retrato', 2, 2.6, 3.1, { c1: '#7a5cff', c2: '#ff9f3d', pat: 'lunares' }, { eyes: true, breathe: true, name: 'el retrato que respira' }], [1, .8, 'criatura', 2.4, 2.6, 1.45, { c1: '#3fd1b5', c2: '#ff5f8f', pat: 'lunares' }, { breathe: true, name: 'el cuadro del Pulpo' }]]); }
function roomDormi(id) { const [cx, cz] = rooms[id].c; addRug(id, 6, 4, { pat: 'cuadros', c1: '#a77bff', c2: '#e6d9ff' }, -1, 3);
  boxProp(id, cx + 3, cz + 5.5, 3.1, 4.1, (() => { const g = bed(); g.rotation.y = Math.PI; return g; })(), { c1: '#a77bff', c2: '#e6d9ff', pat: 'cuadros', pose: 'plana' }, 'la cama real', id);
  boxProp(id, cx - 4, cz - 7.2, 2.4, 1, wardrobe(), { c1: '#ff9f3d', c2: '#ffd23f', pat: 'rayas', pose: 'alta' }, 'el armario', id);
  addProp(jellyBear('#ff6fb5'), cx - 5, cz + 1, .8, { c1: '#ff6fb5', c2: '#ff6fb5', pat: 'liso', pose: 'bolita' }, 'un osito de gelatina', id).jelly = true;
  addProp(armchair('#ffd23f'), cx + 4, cz - 3, 1.0, { c1: '#ffd23f', c2: '#ffd23f', pat: 'liso', pose: 'bolita' }, 'un sillón', id);
  decoWalls(id, [[2, .3, 'retrato', 2, 2.6, 3.1, { c1: '#ff6fb5', c2: '#ffffff', pat: 'lunares' }, { eyes: true, name: 'el retrato de la Princesa' }], [0, .8, 'paisaje', 2.6, 2, 1.25, { c1: '#7fd3ff', c2: '#ffffff', pat: 'cuadros' }, { breathe: true, name: 'el cuadro de las nubes' }]]); }

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
function camoOf_v1(m) {
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
function hud(on) { $('hud').classList.toggle('on', on); $('joy').classList.toggle('on', on); $('touch').classList.toggle('on', on); $('acts').classList.toggle('on', on); if (!on) { $('cross').classList.remove('on'); $('meter').classList.remove('on'); $('bub').style.display = 'none'; } }
const tap = (id, f) => $(id).addEventListener('click', e => { audioInit(); S.tap(); f(e); });
document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => { S.tap(); show('menu'); }));
$('bMute').textContent = save.muted ? '🔇' : '🔊';
tap('bMute', () => { save.muted = !save.muted; persist(); $('bMute').textContent = save.muted ? '🔇' : '🔊'; if (master) master.gain.value = save.muted ? 0 : .6; });
tap('bHow', () => show('howS'));
// ---------- camuflaje v2 ----------
function camoOf(m) { let best = 0, ref = null; const rid = roomOf(m.x, m.z), room = rooms[rid];
  for (const p of refs) { if (p.room !== undefined && p.room !== rid) continue; const d = p.wall ? Math.hypot(p.x - m.x, p.z - m.z) - .2 : propDist(p, m.x, m.z); if (d > 1.5) continue; const prox = clamp(1 - Math.max(0, d) / 1.5, 0, 1); const s = score(m, p) * (.72 + .28 * prox) * (p.painting ? 1 : .99); if (s > best) { best = s; ref = p; } }
  let fp = room.floorPal; for (const r of room.rugs) if (m.x > r.x0 && m.x < r.x1 && m.z > r.z0 && m.z < r.z1) fp = r; const gs = score(m, fp) * .95; if (gs > best) { best = gs; ref = fp; }
  return { v: clamp(best, 0, 1), ref }; }
function nearestThing(m) { let best = null, bd = 1.6; const rid = roomOf(m.x, m.z); for (const p of refs) { if (p.room !== rid) continue; const d = p.wall ? Math.hypot(p.x - m.x, p.z - m.z) - .2 : propDist(p, m.x, m.z); if (d < bd - (p.painting ? .3 : 0)) { bd = d; best = p; } } if (!best) { const room = rooms[rid]; best = room.floorPal; for (const r of room.rugs) if (m.x > r.x0 && m.x < r.x1 && m.z > r.z0 && m.z < r.z1) best = r; } return best; }
// ---------- colisiones ----------
function pushOut(o, b, r) { const l = o.x - b.minx, rr = b.maxx - o.x, t = o.z - b.minz, bt = b.maxz - o.z, m = Math.min(l, rr, t, bt); if (m === l) o.x = b.minx - r; else if (m === rr) o.x = b.maxx + r; else if (m === t) o.z = b.minz - r; else o.z = b.maxz + r; }
function collide(o, r) {
  for (const p of props) { if (p.box) { const b = p.box; const cx = clamp(o.x, b.minx, b.maxx), cz = clamp(o.z, b.minz, b.maxz); const dx = o.x - cx, dz = o.z - cz, d = Math.hypot(dx, dz); if (d < r) { if (d > 1e-4) { o.x = cx + dx / d * r; o.z = cz + dz / d * r; } else pushOut(o, b, r); } continue; } const dx = o.x - p.x, dz = o.z - p.z, d = Math.hypot(dx, dz), mn = p.r + r; if (d < mn && d > 1e-4) { o.x = p.x + dx / d * mn; o.z = p.z + dz / d * mn; } }
  for (const w of walls) { const cx = clamp(o.x, w.minx, w.maxx), cz = clamp(o.z, w.minz, w.maxz); const dx = o.x - cx, dz = o.z - cz, d = Math.hypot(dx, dz); if (d < r) { if (d > 1e-5) { o.x = cx + dx / d * r; o.z = cz + dz / d * r; } else pushOut(o, w, r); } }
  o.x = clamp(o.x, XMIN + .5, XMAX - .5); o.z = clamp(o.z, ZMIN + .5, ZMAX - .5); }
// ---------- navegación entre salas ----------
function doorBetween(a, b) { const A = rooms[a], B = rooms[b]; const [ax, az] = A.c, [bx, bz] = B.c; return [(ax + bx) / 2, (az + bz) / 2, Math.sign(bx - ax), Math.sign(bz - az)]; }
function nextRoom(a, b) { if (a === b) return b; const prev = { [a]: -1 }, q = [a]; while (q.length) { const c = q.shift(); if (c === b) break; const r = rooms[c]; const nb = []; if (r.i > 0) nb.push(c - 1); if (r.i < COLS - 1) nb.push(c + 1); if (r.j > 0) nb.push(c - COLS); if (r.j < ROWS - 1) nb.push(c + COLS); for (const n of nb) if (prev[n] === undefined) { prev[n] = c; q.push(n); } } let c = b; while (prev[c] !== a && prev[c] !== -1 && prev[c] !== undefined) c = prev[c]; return c; }
function navTarget(o, tx, tz) { const a = roomOf(o.x, o.z), b = roomOf(tx, tz); if (a === b) return [tx, tz]; const n = nextRoom(a, b); const [dx, dz, sx, sz] = doorBetween(a, n); const along = Math.abs((o.x - dx) * (1 - Math.abs(sx)) + (o.z - dz) * (1 - Math.abs(sz))); const dist = Math.hypot(o.x - dx, o.z - dz); if (dist < 1.6 && along < .9) return [dx + sx * 2.2, dz + sz * 2.2]; const off = 1.4; return [dx - sx * off * (dist > 2.5 ? 1 : 0), dz - sz * off * (dist > 2.5 ? 1 : 0)]; }
const losRay = new THREE.Raycaster(); const _a = new THREE.Vector3(), _b = new THREE.Vector3();
function lineOfSight(x0, z0, x1, z1, y = 1) { _a.set(x0, y, z0); _b.set(x1 - x0, 0, z1 - z0); const L = _b.length(); if (L < .1) return true; _b.normalize(); losRay.set(_a, _b); losRay.far = L; return losRay.intersectObjects(wallMeshes, false).length === 0; }
function camClear(fx, fy, fz, tx, ty, tz) { _a.set(fx, fy, fz); _b.set(tx - fx, ty - fy, tz - fz); const L = _b.length(); _b.normalize(); losRay.set(_a, _b); losRay.far = L + .4; const h = losRay.intersectObjects(wallMeshes, false); return h.length ? Math.max(.8, h[0].distance - .45) : L; }
// ---------- UI extra ----------
let pendingMode = 'full';
['bPlay', 'bHide', 'bSeek', 'b2p'].forEach((id, i) => tap(id, () => { startMatch(['full', 'hide', 'seek', '2p'][i]); }));
// ---------- controles v2 (joystick flotante analógico + cámara por arrastre, multitáctil) ----------
let joyX = 0, joyY = 0, camYaw = 0, camPitch = .38; const keys = {}; const ptrs = new Map(); let joyId = null, camId = null;
const joy = $('joy'), knob = $('joyK'); const JR = 56;
function joyHome() { joy.style.left = ''; joy.style.top = ''; joy.style.bottom = ''; joy.classList.remove('act', 'float'); knob.style.transform = 'translate(-50%,-50%)'; }
const layer = $('touch');
layer.addEventListener('pointerdown', e => { e.preventDefault(); audioInit(); if (!playing) return; const left = e.clientX < innerWidth * .45 && !(role === 'seek' && phase === 'hide');
  if (left && joyId === null) { joyId = e.pointerId; ptrs.set(e.pointerId, { x0: e.clientX, y0: e.clientY, kind: 'joy' }); joy.classList.add('act', 'float'); joy.style.left = (e.clientX - 65) + 'px'; joy.style.top = (e.clientY - 65) + 'px'; joy.style.bottom = 'auto'; }
  else if (camId === null) { camId = e.pointerId; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, kind: 'cam' }); } else return;
  try { layer.setPointerCapture(e.pointerId); } catch (x) { } });
layer.addEventListener('pointermove', e => { const p = ptrs.get(e.pointerId); if (!p) return; e.preventDefault();
  if (p.kind === 'joy') { let dx = e.clientX - p.x0, dy = e.clientY - p.y0; const d = Math.hypot(dx, dy); if (d > JR) { // el joystick sigue al dedo si se pasa
      const k = (d - JR) / d; p.x0 += dx * k; p.y0 += dy * k; joy.style.left = (p.x0 - 65) + 'px'; joy.style.top = (p.y0 - 65) + 'px'; dx = e.clientX - p.x0; dy = e.clientY - p.y0; }
    knob.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`; const nd = Math.min(1, Math.hypot(dx, dy) / JR); const dz = .1; const m = nd < dz ? 0 : Math.pow((nd - dz) / (1 - dz), 1.15); const a = Math.atan2(dx, -dy); joyX = Math.sin(a) * m; joyY = Math.cos(a) * m; }
  else { const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; const sens = (role === 'seek' ? .0048 : .0062) * (560 / Math.max(560, Math.min(innerWidth, innerHeight) * 1.2)); camYaw -= dx * sens * 1.2; camPitch = clamp(camPitch + dy * .0042, role === 'seek' ? -.3 : .05, 1.0); } });
function ptrEnd(e) { const p = ptrs.get(e.pointerId); if (!p) return; ptrs.delete(e.pointerId); if (p.kind === 'joy') { joyId = null; joyX = joyY = 0; joyHome(); } else camId = null; }
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => layer.addEventListener(ev, ptrEnd));
addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'Space') playerFire(); }); addEventListener('keyup', e => keys[e.code] = false);
addEventListener('blur', () => { ptrs.clear(); joyId = camId = null; joyX = joyY = 0; joyHome(); });
function mkActs(list) { const a = $('acts'); a.innerHTML = ''; list.forEach(([id, ico, txt, cls, f]) => { const b = document.createElement('button'); b.className = 'ab ' + (cls || ''); b.id = id; b.innerHTML = `<span>${ico}</span>${txt}`; b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); audioInit(); b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); f(); }); a.appendChild(b); }); }
// ---------- partida ----------
let mode = 'full', role = 'hide', phase = 'idle', phaseT = 0, me = null, playing = false, round = 0, rounds = [], results = [], shotsLeft = 0, bestShot = null, bestPct = 0, slowmo = 1, focus = null, focusT = 0, p2score = [0, 0], lastPct = -1, hider2p = 0, curRoom = -1;
const HIDE_T = 30; const P2 = ['Jugador 1', 'Jugador 2'];
const is2p = () => rounds[round] && rounds[round].startsWith('2p');
function startMatch(md) { mode = md; results = []; round = 0; bestShot = null; bestPct = 0; p2score = [0, 0]; rounds = md === 'full' ? ['hide', 'seek'] : md === 'hide' ? ['hide'] : md === 'seek' ? ['seek'] : ['2p-a', '2p-b']; nextRound(); }
function nextRound() { if (round >= rounds.length) return toMenu(); const r = rounds[round];
  if (r.startsWith('2p')) { const h = r === '2p-a' ? 0 : 1; hider2p = h; $('pT').textContent = `🙈 Se esconde ${P2[h]}`; $('pS').textContent = `${P2[1 - h]}: ¡date la vuelta y no mires! 30 segundos para pintarse.`; show('pass'); $('pGo').onclick = () => { S.pop(); setupRound(r); }; return; }
  setupRound(r); }
function setupRound(r) {
  transition(() => {
    show(null); manchas = []; buildCastle(); critic = makeCritic(); slowmo = 1; focus = null; focusT = 0; role = r === 'seek' ? 'seek' : 'hide';
    const cols = MANCHA_COLS.slice().sort(() => Math.random() - .5); const start = RC(1);
    me = null; if (r !== 'seek') { me = makeMancha(cols[0], r === 'hide' ? 'Tú' : P2[hider2p], true); me.x = start[0]; me.z = start[1] + 2; me.yaw = Math.PI; }
    const nb = r === 'seek' ? 4 : 3; const used = [];
    for (let i = 0; i < nb; i++) { const b = makeMancha(cols[i + 1], ['Pinti', 'Gotita', 'Borrón', 'Acuarela'][i], false); const a = i / nb * 6.28 + 1; b.x = start[0] + Math.cos(a) * 2.2; b.z = start[1] + Math.sin(a) * 2.2 + 1; botPlan(b, used); }
    manchas.forEach(m => m.g.position.set(m.x, 0, m.z));
    phase = 'hide'; phaseT = HIDE_T; playing = true; critic.state = 'count'; const c0 = RC(0); critic.x = c0[0] - 5; critic.z = c0[1] - 6.6; critic.yaw = Math.PI;
    camYaw = Math.PI; camPitch = .38; shotsLeft = 0; lastPct = -1; curRoom = -1; snapCam = true;
    hud(true); $('hPhase').textContent = '🙈 ¡A esconderse!';
    if (role === 'hide') { $('meter').classList.add('on'); $('cross').classList.remove('on'); mkActs([['aCol', '💧', 'Color', 'c1', () => copyFrom('col')], ['aPat', '🖌', 'Dibujo', 'c2', () => copyFrom('pat')], ['aPose', '🧘', 'Pose', 'c3', cyclePose]]); $('hInfo').textContent = '🏰 Castillo de los Cuadros'; toast('¡Píntate como el castillo!', 'Cuadros, tapices, muebles… ¡copia lo que tengas al lado!', 2800); }
    else { $('meter').classList.remove('on'); mkActs([]); $('hInfo').textContent = '🧐 Contando…'; toast('Eres El Crítico 🧐', 'Las Manchas se están pintando… ¡no mires!', 2600); }
    musicMode = 'calm'; });
}
function transition(fn) { const f = $('fade'); f.classList.add('on'); S.boing(); setTimeout(() => { fn(); setTimeout(() => f.classList.remove('on'), 80); }, 380); }
function copyFrom(what) { if (!me || !me.alive || role !== 'hide') return; const p = nearestThing(me);
  if (what === 'col') { me.c1 = p.c1; if (me.pat === 'liso') me.c2 = p.c1; S.drop(); bub(`💧 ¡Color de ${p.name}!`); }
  else { me.pat = p.pat; me.c2 = p.c2; S.paint(); bub(p.pat === 'liso' ? `🖌 Lisa como ${p.name}` : `🖌 ¡${p.pat[0].toUpperCase() + p.pat.slice(1)} de ${p.name}!`); }
  applyPaint(me); me.hop = 1; burst(new THREE.Vector3(me.x, 1, me.z), what === 'col' ? p.c1 : p.c2); if (phase === 'seek') me.still = 0; }
function cyclePose() { if (!me || !me.alive || role !== 'hide') return; me.pose = POSES[(POSES.indexOf(me.pose) + 1) % 4]; S.pose(); me.hop = .7; bub('🧘 Pose: ' + POSE_N[me.pose]); if (phase === 'seek') { me.still = 0; me.wiggle = .8; } }
function botPlan(b, used) {
  const cand = refs.filter(p => !used.includes(p) && p.room !== 0 && (p.wall ? p.painting || Math.random() < .15 : true)); const p = pick(cand); used.push(p); const skill = rnd(0, 1);
  let tx, tz; if (p.wall) { tx = p.x + p.nx * .4; tz = p.z + p.nz * .4; } else if (p.box) { const b2 = p.box; const s = pick([0, 1, 2, 3]); tx = s < 2 ? rnd(b2.minx, b2.maxx) : (s === 2 ? b2.minx - .6 : b2.maxx + .6); tz = s >= 2 ? rnd(b2.minz, b2.maxz) : (s === 0 ? b2.minz - .6 : b2.maxz + .6); } else { const a = rnd(0, 6.28); tx = p.x + Math.cos(a) * (p.r + .55); tz = p.z + Math.sin(a) * (p.r + .55); }
  b.bot = { p, tx, tz, c1: skill > .12 ? p.c1 : pick(MANCHA_COLS), c2: p.c2, pat: skill > .28 ? p.pat : 'liso', pose: skill > .2 ? p.pose : pick(POSES), painted: false, delay: rnd(10, 22) }; }
function endHidePhase() {
  manchas.forEach(m => { if (m.bot) { const o = { x: m.bot.tx, z: m.bot.tz }; collide(o, .45); m.x = o.x; m.z = o.z; m.vx = m.vz = 0; if (!m.bot.painted) paintBot(m); if (m.bot.p.wall) m.yaw = Math.atan2(m.bot.p.nx, m.bot.p.nz); } });
  if (me) { me.camo = camoOf(me).v; captureHide(); }
  if (is2p() && role === 'hide') { phase = 'pass'; playing = false; hud(false); $('pT').textContent = `🧐 ¡Turno de ${P2[1 - hider2p]}!`; $('pS').textContent = `Eres El Crítico. Busca a ${P2[hider2p]} por el castillo. 6 disparos, 75 segundos.`; show('pass'); $('pGo').onclick = () => { S.pop(); show(null); playing = true; role = 'seek'; startSeek(); }; return; }
  startSeek(); }
function startSeek() {
  phase = 'seek'; phaseT = role === 'seek' ? 80 : 60; musicMode = 'seek'; critic.state = 'wander'; critic.think = 1.5; S.boing(); hud(true); snapCam = true;
  if (role === 'hide') { $('hPhase').textContent = '🧐 ¡Viene El Crítico!'; toast('¡Llega El Crítico! 🧐', 'Quieta… muy quieta…', 2200); mkActs([['aPose', '🧘', 'Pose', 'c3', cyclePose]]); }
  else { shotsLeft = is2p() ? 6 : 10; $('meter').classList.remove('on'); $('cross').classList.add('on'); $('hPhase').textContent = '🎯 ¡A cazar!'; mkActs([['aFire', '🎯', '', 'fire', playerFire]]); toast('¡A cazar Manchas! 🎯', is2p() ? `Encuentra a ${P2[hider2p]}` : `4 escondidas por el castillo · ${shotsLeft} disparos · ojo a los estornudos 🤧`, 2800); const c0 = RC(0); critic.x = c0[0]; critic.z = c0[1]; camYaw = Math.PI / 2; camPitch = .15; } }
function paintBot(m) { const b = m.bot; m.c1 = b.c1; m.c2 = b.c2; m.pat = b.pat; m.pose = b.pose; b.painted = true; applyPaint(m); }
function captureHide() { if (!me) return; const pct = Math.round(me.camo * 100); let a = me.yaw, bd = 0; for (let k = 0; k < 12; k++) { const aa = me.yaw + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * .5236; const cd = Math.min(camClear(me.x, 1.2, me.z, me.x + Math.sin(aa) * 3.6, 2, me.z + Math.cos(aa) * 3.6), clearPropDist(me.x, me.z, Math.sin(aa), Math.cos(aa), 3.6)); if (cd > bd + .01) { bd = cd; a = aa; } if (cd >= 3.5) break; } const R = Math.max(1.6, Math.min(3.6, bd));
  manchas.forEach(m => animMancha(m, 1)); camera.position.set(me.x + Math.sin(a) * R, 1.3 + R * .25, me.z + Math.cos(a) * R); camera.lookAt(me.x, .75, me.z); critic.g.visible = false; renderer.render(scene, camera); critic.g.visible = true;
  try { const img = renderer.domElement.toDataURL('image/jpeg', .9); if (pct >= bestPct || !bestShot) { bestPct = pct; bestShot = { img, pct, cuadro: rooms[roomOf(me.x, me.z)].def.name }; } } catch (e) { } }
function clearPropDist(x, z, dx, dz, maxD) { for (let d = .8; d <= maxD; d += .25) { const px = x + dx * d, pz = z + dz * d; for (const p of props) if (propDist(p, px, pz) < .3) return Math.max(1.6, d - .4); } return maxD; }
const LINES = ['¡Te delataron las pestañas! 👀', '¡Ese cuadro tenía ojos!', '¡Pillada con las manos en la pintura!', '¡Atchís! Digo… ¡PILLADA!', '¡Eso no estaba en el castillo!', '¡Demasiado guapa para ser decorado!', '¡Los retratos se chivaron!'];
function catchMancha(m) { if (!m.alive) return; m.alive = false; m.caught = true; m.spin = 1; m.hop = 1.6; const col = pick(PAINTS); m.c1 = col; m.c2 = '#ffffff'; m.pat = 'lunares'; applyPaint(m); S.ay(); confetti(m.x, 1.2, m.z, 45, 5); shake = .5;
  if (m === me && role === 'hide') { toast('¡TE PILLÓ! 🎨💥', pick(LINES), 2400); focus = m; focusT = 2.2; slowmo = .35; S.fail(); setTimeout(() => endRound(), 2300); }
  else if (m === me) { toast(`¡ENCONTRASTE A ${P2[hider2p].toUpperCase()}! 🎉`, pick(LINES), 2200); focus = m; focusT = 1.8; slowmo = .4; S.fanfare(); setTimeout(() => endRound(), 2100); }
  else if (role === 'seek') { toast('¡PILLADA! 🎉', m.name + ' · ' + pick(LINES), 1800); focus = m; focusT = 1.2; slowmo = .4; if (!is2p() && manchas.every(o => !o.alive)) setTimeout(() => endRound(), 1500); }
  else bub(`😱 ¡Han pillado a ${m.name}!`, 1800); }
const ray = new THREE.Raycaster(), V0 = new THREE.Vector2(0, 0);
function playerFire() { if (phase !== 'seek' || role !== 'seek' || shotsLeft <= 0 || critic.cool > 0 || focusT > 0) return; shotsLeft--; critic.cool = .45; critic.fx = 1; shake = .18;
  ray.setFromCamera(V0, camera); const hits = ray.intersectObjects(hitMeshes, false); let target = null, point = null;
  for (const m of manchas) { if (!m.alive) continue; const c = new THREE.Vector3(m.x, .55 * m.poseCur[1] + m.tumb * .2, m.z); const d = ray.ray.distanceToPoint(c); const dist = c.distanceTo(camera.position); if (d < .7 + dist * .035 && dist < 40) { const h = hits[0]; if (!h || h.distance > dist - 1.3 || h.object.userData.mancha === m) { target = m; point = c; break; } } }
  if (!target && hits.length) { point = hits[0].point; const hm = hits[0].object.userData.mancha; if (hm && hm.alive) target = hm; } if (!point) point = ray.ray.at(30, new THREE.Vector3());
  const from = critic.tip.getWorldPosition(new THREE.Vector3()); const col = pick(PAINTS);
  fireShot(from, point, col, () => { if (target) catchMancha(target); else { const o = hits[0] && hits[0].object.userData; const pr = o && o.prop; bub(pr ? `🙃 ¡Era ${pr.name} de verdad!` : o && o.wall ? '🧱 ¡Le has pintado la pared al Rey!' : '💨 ¡Fallaste!', 1500); if (pr) { pr.g.userData.shake = 1; S.boing(); } } });
  if (shotsLeft === 0) setTimeout(() => { if (phase === 'seek' && focusT <= 0) endRound(); }, 1700); }
function criticThink(c, alive, dt) {
    c.think -= dt; if (c.think <= 0) { c.think = .4;
      for (const m of alive) { const dx = m.x - c.x, dz = m.z - c.z, d = Math.hypot(dx, dz); if (d > 14) continue; const ang = Math.abs(wrap(Math.atan2(dx, dz) - c.yaw)); if (ang > 1.35 && !m.moving) continue; if (!lineOfSight(c.x, c.z, m.x, m.z)) continue;
        const p = (Math.pow(1 - m.camo, 2.4) * 1.3 + (m.moving ? .55 : 0) + (m.wiggle > 0 ? .3 : 0)) * (1 - d / 15); if (Math.random() < p) { c.state = 'go'; c.target = m; S.hmm(); if (m === me) bub('😳 ¡El Crítico te ha echado el ojo!', 1500); return; } }
      if (Math.random() < .015) { const pr = props.filter(p => p.room === roomOf(c.x, c.z)); if (pr.length) { c.state = 'go'; c.target = pick(pr); } } }
}
function criticAI(dt) { const c = critic; c.cool -= dt;
  if (c.state === 'count') { c.speed = lerp(c.speed, 0, Math.min(1, dt * 8)); return; }
  const alive = manchas.filter(m => m.alive); if (!alive.length) { c.speed = 0; return; }
  const goTo = (x, z, spd) => { const [nx, nz] = navTarget(c, x, z); const dx = nx - c.x, dz = nz - c.z, d = Math.hypot(dx, dz); const fd = Math.hypot(x - c.x, z - c.z); if (fd > .3) { c.yaw += wrap(Math.atan2(dx, dz) - c.yaw) * (1 - Math.exp(-dt * 6)); c.speed = lerp(c.speed, spd, 1 - Math.exp(-dt * 5)); c.x += Math.sin(c.yaw) * c.speed * dt; c.z += Math.cos(c.yaw) * c.speed * dt; } else c.speed = lerp(c.speed, 0, 1 - Math.exp(-dt * 8)); collide(c, .5); return fd; };
  if (c.state === 'wander') criticThink(c, alive, dt);
  if (c.state === 'wander' && c.lookT > 0) { c.lookT -= dt; c.yaw += dt * 2.4 * (c.lookDir || 1); c.speed = lerp(c.speed, 0, ex(8, dt)); }
  else if (c.state === 'wander') { if (c.wp && Math.hypot(c.wp.x - c.x, c.wp.z - c.z) < 1.5 && !c.looked) { c.lookT = 1.4; c.lookDir = Math.random() < .5 ? -1 : 1; c.looked = true; } if (!c.wp || Math.hypot(c.wp.x - c.x, c.wp.z - c.z) < 1.5 || (c.wpT -= dt) < 0) { c.looked = false; const near = (me && me.alive && role === 'hide' && Math.random() < .4) ? me : Math.random() < .5 ? pick(alive) : pick(props); c.wp = { x: clamp(near.x + rnd(-3, 3), XMIN + 1.5, XMAX - 1.5), z: clamp(near.z + rnd(-3, 3), ZMIN + 1.5, ZMAX - 1.5) }; c.wpT = 12; }
    if (!(c.lookT > 0)) goTo(c.wp.x, c.wp.z, 3.2);
  }
  else if (c.state === 'go') { const t = c.target; if (t.alive === false) { c.state = 'wander'; return; } const d = goTo(t.x, t.z, t.moving ? 4.4 : 3.6); if (d < 5.2 && lineOfSight(c.x, c.z, t.x, t.z)) { c.state = 'aim'; c.aimT = 1.1; S.tension(); if (t === me) bub('😱 ¡Te está apuntando! ¿Quieta o corres?', 1200); } }
  else if (c.state === 'aim') { const t = c.target; c.yaw += wrap(Math.atan2(t.x - c.x, t.z - c.z) - c.yaw) * (1 - Math.exp(-dt * 8)); c.speed = lerp(c.speed, 0, 1 - Math.exp(-dt * 10)); c.aimT -= dt;
    if (c.aimT <= 0) { let hit = false; const isM = t.alive !== undefined; if (isM) { const d = Math.hypot(t.x - c.x, t.z - c.z); const pc = t.moving ? .55 : (.3 + (1 - camoOf(t).v) * 1.35); hit = d < 7.5 && Math.random() < pc && lineOfSight(c.x, c.z, t.x, t.z); }
      const tx = t.box ? (t.box.minx + t.box.maxx) / 2 : t.x, tz = t.box ? (t.box.minz + t.box.maxz) / 2 : t.z; const pt = new THREE.Vector3(tx + (hit ? 0 : rnd(-1.4, 1.4)), hit ? .6 : .05, tz + (hit ? 0 : rnd(-1.4, 1.4))); c.fx = 1; const tt = t;
      fireShot(c.tip.getWorldPosition(new THREE.Vector3()), pt, pick(PAINTS), () => { if (hit) catchMancha(tt); else if (isM && tt === me) { bub(pick(['😅 ¡Uf! Por los pelos…', '😎 ¡Ha fallado! Sigue quieta…', '🫣 ¡Casi te pinta!']), 1600); S.boing(); } else if (!isM && role === 'hide') { tt.g.userData.shake = 1; bub(pick([`🧐 «¡Ajá!»… era ${tt.name}.`, '🧐 «Juraría que eso me ha guiñado un ojo…»', `🧐 «Perdón, ${tt.name.replace(/^(un[a]?|el|la) /, '')}.»`]), 1800); } });
      c.state = 'wander'; c.wp = null; c.think = 1.2; } } }

// ---------- actualización v2 ----------
let last = performance.now(), T = 0, fpsAcc = 0, fpsN = 0, fpsT = 0, shake = 0, snapCam = true, camDist = 7;
const camPos = new THREE.Vector3(0, 6, 12), camLook = new THREE.Vector3(), _v = new THREE.Vector3(), _w = new THREE.Vector3();
const ex = (k, dt) => 1 - Math.exp(-k * dt);
function update(dt) {
  T += dt; decor.forEach(d => d.f(d.o, T));
  for (const p of props) { if (p.g.userData.head) p.g.userData.head.rotation.y = Math.sin(T * .7) * .25; if (p.g.userData.spin) p.g.userData.spin.rotation.y = T * .5; if (p.jelly) { const k = Math.sin(T * 3 + p.x); p.g.scale.set(1 + k * .03, 1 - k * .03, 1 + k * .03); } if (p.g.userData.shake) { p.g.userData.shake = Math.max(0, p.g.userData.shake - dt * 2); p.g.rotation.z = Math.sin(T * 40) * .08 * p.g.userData.shake; } }
  // los retratos te siguen con la mirada
  const watch = me && role === 'hide' ? me : critic; if (watch) for (const L of lookers) { L.g.worldToLocal(_w.set(watch.x, 1, watch.z)); const a = Math.atan2(_w.x, Math.max(.5, _w.z)), b = Math.atan2(_w.y - L.eyes[0].by, Math.max(.5, _w.z)); L.eyes.forEach(e => { e.p.position.x = lerp(e.p.position.x, e.bx + clamp(a, -1, 1) * L.w * .04, ex(8, dt)); e.p.position.y = lerp(e.p.position.y, e.by + clamp(b, -1, 1) * L.w * .03, ex(8, dt)); }); }
  if (!playing) { if (phase === 'idle') { const c = RC(0); camPos.set(c[0] + Math.sin(T * .12) * 3, 3.6 + Math.sin(T * .3) * .3, c[1] + 6.8); camera.position.copy(camPos); camera.lookAt(c[0], 2.2, c[1] - 4); sun.position.set(c[0] + 6, 30, c[1] + 6); sun.target.position.set(c[0], 0, c[1]); } updConf(dt); updBursts(dt); return; }
  musicTick(dt);
  if (focusT > 0) { focusT -= dt; if (focusT <= 0) { slowmo = 1; focus = null; } }
  const sdt = dt * slowmo;
  if (phase === 'hide' || phase === 'seek') { const prev = Math.ceil(phaseT); phaseT -= sdt; const sec = Math.ceil(phaseT); $('hTime').textContent = '⏱ ' + Math.max(0, sec); $('hTime').classList.toggle('warn', sec <= 5);
    if (sec !== prev && sec <= 5 && sec >= 1) { S.tick(); if (phase === 'hide' && sec <= 3) toast(String(sec), role === 'hide' ? '¡A tu sitio!' : '', 600); }
    if (phase === 'hide' && phaseT <= 0) endHidePhase(); else if (phase === 'seek' && phaseT <= 0 && focusT <= 0) endRound(); }
  if (role === 'seek' && phase === 'seek') $('hInfo').textContent = `🎯 ${shotsLeft} · 🙈 ${manchas.filter(m => m.alive).length}`;
  if (role === 'hide' && phase === 'seek') $('hInfo').textContent = `🙈 ${manchas.filter(m => m.alive).length} escondidas`;
  // entrada (joystick analógico o teclado) relativa a la cámara
  let ix = joyX, iy = joyY; const kx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), ky = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0); if (kx || ky) { const l = Math.hypot(kx, ky); ix = kx / l; iy = ky / l; }
  const fwX = Math.sin(camYaw), fwZ = Math.cos(camYaw); const rX = -fwZ, rZ = fwX; const wantX = fwX * iy - rX * ix, wantZ = fwZ * iy - rZ * ix; const mag = Math.min(1, Math.hypot(wantX, wantZ));
  const sub = Math.max(1, Math.ceil(sdt / (1 / 120))), h = sdt / sub; // subpasos: colisiones estables a cualquier fps
  if (me && me.alive && role === 'hide') { const sp = 5.6; for (let s = 0; s < sub; s++) { const k = mag > .01 ? ex(11, h) : ex(14, h); me.vx += (wantX * sp - me.vx) * k; me.vz += (wantZ * sp - me.vz) * k; me.x += me.vx * h; me.z += me.vz * h; collide(me, .45); }
    const spd = Math.hypot(me.vx, me.vz); me.moving = spd > .6; if (spd > .25) me.yaw += wrap(Math.atan2(me.vx, me.vz) - me.yaw) * ex(12, sdt); me.still = me.moving ? 0 : me.still + sdt; me.wiggle = Math.max(0, (me.wiggle || 0) - sdt);
    me.camo = camoOf(me).v; const pct = Math.round(me.camo * 100); if (pct !== lastPct) { lastPct = pct; $('mPct').textContent = pct + '%'; $('mFill').style.width = pct + '%'; $('mFace').textContent = pct < 40 ? '🙈 ¡Se te ve a la legua!' : pct < 65 ? '🤔 Mmm… casi' : pct < 85 ? '😏 ¡Bien camuflada!' : pct < 95 ? '🫥 ¡Casi invisible!' : '👻 ¡ERES EL CUADRO!'; if (pct >= 94 && !me.inv) { me.inv = true; S.fanfare(); confetti(me.x, 1.5, me.z, 30, 4); } if (pct < 88) me.inv = false; }
    const rid = roomOf(me.x, me.z); if (rid !== curRoom) { if (curRoom >= 0) { bub('📍 ' + rooms[rid].def.name, 1600); S.pop(); } curRoom = rid; } }
  if (role === 'seek') { if (phase === 'seek') { const sp = 5.0; for (let s = 0; s < sub; s++) { const k = ex(9, h); critic.vx = lerp(critic.vx || 0, wantX * sp, k); critic.vz = lerp(critic.vz || 0, wantZ * sp, k); critic.x += critic.vx * h; critic.z += critic.vz * h; collide(critic, .5); } critic.speed = Math.hypot(critic.vx, critic.vz); critic.yaw += wrap(camYaw - critic.yaw) * ex(14, sdt); critic.cool -= dt; const rid = roomOf(critic.x, critic.z); if (rid !== curRoom) { if (curRoom >= 0) bub('📍 ' + rooms[rid].def.name, 1600); curRoom = rid; } } else critic.speed = 0; }
  else criticAI(sdt);
  for (const m of manchas) { if (!m.alive) continue; if (m.bot) { const b = m.bot; if (phase === 'hide') { const d = Math.hypot(b.tx - m.x, b.tz - m.z); if (d > .25) { const [nx, nz] = navTarget(m, b.tx, b.tz); const dx = nx - m.x, dz = nz - m.z, dl = Math.hypot(dx, dz) || 1; const sp = Math.min(3.8, d * 2); m.vx = lerp(m.vx, dx / dl * sp, ex(8, sdt)); m.vz = lerp(m.vz, dz / dl * sp, ex(8, sdt)); m.x += m.vx * sdt; m.z += m.vz * sdt; collide(m, .45); m.yaw += wrap(Math.atan2(m.vx, m.vz) - m.yaw) * ex(10, sdt); m.moving = true; } else { m.moving = false; m.vx = m.vz = 0; m.still += sdt; if (b.p.wall) m.yaw += wrap(Math.atan2(b.p.nx, b.p.nz) - m.yaw) * ex(6, sdt); if (!b.painted && HIDE_T - phaseT > b.delay) { paintBot(m); m.hop = 1; burst(new THREE.Vector3(m.x, 1, m.z), m.c1); } } } else { m.moving = false; m.vx = m.vz = 0; m.still += sdt; } }
    if (phase === 'seek' && (m !== me || role === 'seek')) { m.sneeze -= sdt; if (m.sneeze <= 0) { m.sneeze = rnd(9, 18); const d = Math.hypot(m.x - critic.x, m.z - critic.z); if (d < 16) { m.hop = .8; m.shiver = .6; if (role === 'seek') { S.sneeze(); bub('🤧 ¡Achís! Algo ha estornudado por ahí…', 1500); } } } }
    if (m.bot || role === 'seek') m.camo = camoOf(m).v; }
  if (role === 'seek' && phase === 'seek') { ray.setFromCamera(V0, camera); let hot = false; for (const m of manchas) { if (!m.alive) continue; _v.set(m.x, .6, m.z); if (ray.ray.distanceToPoint(_v) < .65 && _v.distanceTo(camera.position) < 30) { hot = true; m.aimed += dt; if (m.aimed > .7 && m.camo < .9 && m.shiver <= 0) m.shiver = .35; } else m.aimed = 0; } $('cross').classList.toggle('hot', hot); }
  for (const m of manchas) animMancha(m, sdt);
  if (window.__trace && me) window.__trace.push([T * 1000, me.x, me.z, me.yaw, camera.position.x, camera.position.z]);
  animCritic(sdt); updShots(sdt); updBursts(sdt); updConf(sdt);
  // ---- cámara: más atrás y más alta, suave, sin atravesar paredes ----
  const port = innerHeight > innerWidth; const cp = Math.cos(camPitch), spP = Math.sin(camPitch); let tx, ty, tz, want, sh = 0;
  if (focus) { tx = focus.x; ty = .9; tz = focus.z; want = 4.5; }
  else if (role === 'hide' && me) { tx = me.x; ty = 1.3; tz = me.z; want = port ? 8.6 : 7.4; }
  else { tx = critic.x; ty = 4.7; tz = critic.z; want = port ? 7.4 : 6.4; sh = port ? 1.7 : 1.9; }
  if (role === 'seek' && phase === 'hide') { const c0 = RC(0); camera.position.set(c0[0] - 5, 2.4, c0[1] - 5.2); camera.lookAt(c0[0] - 5 + Math.sin(T * .3) * 2, 4.5, c0[1] - 8); sun.position.set(c0[0] + 6, 30, c0[1] + 6); sun.target.position.set(c0[0], 0, c0[1]); return; }
  const fa = focus ? T * .6 : camYaw; const fx = Math.sin(fa), fz = Math.cos(fa);
  const dX = -fx * cp, dY = spP, dZ = -fz * cp; const lx = tx - rX * sh, lz = tz - rZ * sh;
  const free = camClear(lx, ty, lz, lx + dX * want, ty + dY * want, lz + dZ * want); const target = Math.min(want, free);
  camDist = target < camDist ? Math.max(target, lerp(camDist, target, ex(18, dt)) - (camDist - target > 2 ? 0 : 0)) : lerp(camDist, target, ex(3, dt)); if (camDist > free + .05) camDist = lerp(camDist, free, ex(25, dt)); if (snapCam) camDist = target;
  _v.set(lx + dX * camDist, Math.min(WH - .5, ty + dY * camDist + .4), lz + dZ * camDist);
  const lookAhead = role === 'seek' && !focus ? 10 : 1.2; _w.set(lx + fx * lookAhead * cp, ty + (role === 'seek' && !focus ? -Math.sin(camPitch) * 7 + .3 : .1), lz + fz * lookAhead * cp);
  if (snapCam) { camPos.copy(_v); camLook.copy(_w); snapCam = false; } else { camPos.lerp(_v, ex(focus ? 4 : 12, dt)); camLook.lerp(_w, ex(focus ? 5 : 16, dt)); }
  { const ax = camPos.x, az = camPos.z, bx = tx, bz = tz, L = Math.hypot(bx - ax, bz - az) || 1; for (const p of props) { const t = clamp(((p.x - ax) * (bx - ax) + (p.z - az) * (bz - az)) / (L * L), 0, 1); const px = ax + (bx - ax) * t, pz = az + (bz - az) * t; const block = t < .92 && propDist(p, px, pz) < .5 && !(role === 'seek' && focus); const f = block ? .28 : 1; if (Math.abs(p.fade - f) > .01) { p.fade = lerp(p.fade, f, ex(10, dt)); for (const m of p.mats) { m.transparent = p.fade < .98 || m.userData.tr; m.opacity = (m.userData.tr ? m.userData.op : 1) * p.fade; m.depthWrite = p.fade > .9; } } } }
  camera.position.copy(camPos); shake = Math.max(0, shake - dt * 1.5); if (shake > 0) camera.position.add(_v.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(shake * .25)); camera.lookAt(camLook);
  sun.position.set(camLook.x + 6, 30, camLook.z + 6); sun.target.position.set(camLook.x, 0, camLook.z);
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
tap('rNext', () => { if (round < rounds.length) nextRound(); else startMatch(mode); });
tap('rMenu', () => toMenu());
tap('hBack', () => toMenu());
tap('rShare', async () => { if (!bestShot) return; const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1350; const x = cv.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 1350); g.addColorStop(0, '#7a5cff'); g.addColorStop(1, '#ff6fb5'); x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
  const im = new Image(); im.src = bestShot.img; try { await im.decode(); } catch (e) { } x.fillStyle = '#ffcf4a'; x.fillRect(70, 190, 940, 760); x.fillStyle = '#c98a1a'; x.fillRect(95, 215, 890, 710); const iw = 850, ih = 670; const ar = im.width / im.height; let sw = im.width, sh = im.height, sx = 0, sy = 0; if (ar > iw / ih) { sw = im.height * iw / ih; sx = (im.width - sw) / 2; } else { sh = im.width * ih / iw; sy = (im.height - sh) / 2; } try { x.drawImage(im, sx, sy, sw, sh, 115, 235, iw, ih); } catch (e) { }
  x.textAlign = 'center'; x.fillStyle = '#fff'; x.font = '700 76px Fredoka, sans-serif'; x.fillText('Escondite en el Cuadro', 540, 130); x.font = '700 150px Fredoka, sans-serif'; x.fillStyle = '#fff38a'; x.fillText(bestShot.pct + '%', 540, 1110); x.fillStyle = '#fff'; x.font = '600 48px Fredoka, sans-serif'; x.fillText('de camuflaje en ' + bestShot.cuadro, 540, 1190); x.font = '500 40px Fredoka, sans-serif'; x.fillText('¿A que no me encuentras? 🎨', 540, 1265);
  cv.toBlob(async b => { const f = new File([b], 'mi-escondite.png', { type: 'image/png' }); try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: 'Escondite en el Cuadro', text: `¡Me camuflé al ${bestShot.pct}%! ¿Me encuentras?` }); return; } } catch (e) { } const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'mi-escondite.png'; a.click(); toast('📸 ¡Tarjeta guardada!', '', 1400); window.__lastCard = cv.toDataURL('image/png'); }, 'image/png'); });

// ---------- menú ----------
function toMenu() { transition(() => { playing = false; phase = 'idle'; hud(false); show('menu'); menuWorld(); musicMode = 'calm'; }); }
function menuWorld() { manchas = []; buildCastle(); critic = makeCritic(); critic.state = 'wander'; const c = RC(0); [['#ff8fd0', 'bolita'], ['#5fc8ff', 'alta'], ['#ffd23f', 'bolita']].forEach(([col, pose], i) => { const m = makeMancha(col, 'm', false); m.x = c[0] - 2 + i * 2; m.z = c[1] - 2.5 + (i % 2) * .6; m.pose = pose; m.g.position.set(m.x, 0, m.z); }); $('mBest').textContent = save.best ? `🏅 Mejor camuflaje: ${save.best}% · 🏆 ${save.wins} victorias` : '🏰 ¡Nuevo! Ahora en el Castillo de los Cuadros'; }
function menuAnim(dt) { const c = RC(0); manchas.forEach((m, i) => { if (Math.sin(T * 1.7 + i * 2.1) > .985 && m.hop <= 0) { m.hop = 1; } m.yaw = Math.sin(T * .7 + i) * .5; animMancha(m, dt); }); if (critic) { critic.speed = 1.6; const a = T * .25; critic.x = c[0] + Math.sin(a) * 4.5; critic.z = c[1] + 1 + Math.cos(a) * 3; critic.yaw = a + Math.PI / 2; animCritic(dt); } }
// ---------- bucle ----------
function loop(now) { requestAnimationFrame(loop); const dt = Math.min(.1, (now - last) / 1000); last = now;
  update(dt); if (!playing && phase === 'idle') menuAnim(dt);
  renderer.render(scene, camera);
  fpsAcc += dt; fpsN++; fpsT += dt; if (fpsT > 2.5) { const avg = fpsAcc / fpsN; fpsAcc = fpsN = fpsT = 0; const maxQ = Math.min(DPR, 2.25); if (avg > .024 && quality > .75) { quality = Math.max(.75, quality - .25); renderer.setPixelRatio(quality); resize(); } else if (avg < .0145 && quality < maxQ) { quality = Math.min(maxQ, quality + .25); renderer.setPixelRatio(quality); resize(); } } }
window.__ec = { proj: m => { const v = new THREE.Vector3(m.x, .6, m.z).project(camera); return [v.x, v.y]; }, get camYaw() { return camYaw; }, get camPitch() { return camPitch; }, get phase() { return phase; }, get role() { return role; }, get me() { return me; }, get manchas() { return manchas; }, get critic() { return critic; }, get props() { return props; }, get refs() { return refs; }, setPhaseT: v => phaseT = v, camoOf, get shotsLeft() { return shotsLeft; }, setCam: (y, p) => { camYaw = y; camPitch = p; }, fire: () => playerFire(), get quality() { return quality; }, get playing() { return playing; }, roomOf, lineOfSight, get camPos() { return camera.position.clone(); }, nearestThing: () => nearestThing(me) };
menuWorld(); requestAnimationFrame(loop);
