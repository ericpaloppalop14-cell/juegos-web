// =====================================================================
//  Escondite en el Cuadro · v8 · Disfraz de objeto
//  Inspirado en los juegos de "pintarse para esconderse" (Hide and Paint /
//  Prop Hunt). Tocas un objeto y te conviertes en una APROXIMACIÓN suya;
//  luego ajustas tono, claridad, saturación, patrón, ancho, alto y giro.
//  El medidor de PARECIDO (0-100 %) da puntos, reduce el tambaleo y hace
//  que El Crítico te detecte menos. Premia la habilidad.
// =====================================================================
import * as THREE from 'three';
import { SalaOnline, comprobarOnline } from './net.js';
export const VERSION = 'v9 · Toque fino';
const $ = id => document.getElementById(id);
const Q = new URLSearchParams(location.search);
$('ver').textContent = VERSION;

// ------------------------------------------------------------ utilidades
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let R = rng(8);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };

// ------------------------------------------------------------ sonido
let AC = null;
function tone(f, d = .12, type = 'sine', v = .08, f2) { try { AC = AC || new AudioContext(); const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = f; if (f2) o.frequency.exponentialRampToValueAtTime(f2, AC.currentTime + d); g.gain.value = v; g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + d); o.connect(g).connect(AC.destination); o.start(); o.stop(AC.currentTime + d); } catch (e) { } }
const SND = { pop: () => tone(520, .12, 'sine', .1, 900), ok: () => { tone(660, .1); setTimeout(() => tone(880, .15), 90); }, no: () => tone(300, .25, 'triangle', .08, 180), win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, .18), i * 110)), whistle: () => { tone(1200, .15, 'sine', .07, 1600); setTimeout(() => tone(1500, .2, 'sine', .07, 1100), 160); }, tick: () => tone(900, .04, 'square', .03) };

// ------------------------------------------------------------ render
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#f6d9e8'); scene.fog = new THREE.Fog('#f6d9e8', 26, 48);
const camera = new THREE.PerspectiveCamera(60, 1, .1, 80);
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 68 : 58; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

scene.add(new THREE.HemisphereLight('#fff6ee', '#ffd0f0', 1.1));
const rim = new THREE.DirectionalLight('#c9b0ff', .7); rim.position.set(-10, 8, -8); scene.add(rim);
const back = new THREE.DirectionalLight('#ffd9b0', .4); back.position.set(-4, 6, 12); scene.add(back);
const sun = new THREE.DirectionalLight('#fff0d8', 2.3); sun.position.set(9, 15, 6); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 13, bottom: -13, near: 1, far: 40 }); sun.shadow.bias = -.0015; sun.shadow.radius = 4;
scene.add(sun);
const fill = new THREE.PointLight('#ffc890', 34, 30, 1.2); fill.position.set(0, 4.5, 3); scene.add(fill);

function ctex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } t.anisotropy = 4; return t; }
// fusiona mallas (mismo material) en una sola: muchas menos llamadas de dibujo
function mergeGeos(list) { const gs = list.map(([g, m]) => { const q = (g.index ? g.toNonIndexed() : g.clone()); q.applyMatrix4(m); return q; }); let n = 0; for (const g of gs) n += g.attributes.position.count; const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2); let o = 0; for (const g of gs) { const c = g.attributes.position.count; P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) U.set(g.attributes.uv.array, o * 2); o += c; g.dispose(); } const r = new THREE.BufferGeometry(); r.setAttribute('position', new THREE.BufferAttribute(P, 3)); r.setAttribute('normal', new THREE.BufferAttribute(N, 3)); r.setAttribute('uv', new THREE.BufferAttribute(U, 2)); r.computeBoundingSphere(); return r; }
function mergeByMaterial(root, parent, rel) { root.updateMatrixWorld(true); const inv = rel ? rel.matrixWorld.clone().invert() : new THREE.Matrix4(); const by = new Map(); root.traverse(o => { if (o.isMesh && !o.isInstancedMesh && !o.userData.keep) { const m = o.matrixWorld.clone().premultiply(inv); (by.get(o.material) || by.set(o.material, []).get(o.material)).push([o.geometry, m]); } }); const out = []; for (const [mat, l] of by) { const mesh = new THREE.Mesh(mergeGeos(l), mat); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); out.push(mesh); } return out; }
const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .75, metalness: 0 }, o));

// patrones (para cojines, jarrones, baúles...) en blanco: el color lo pone el material
const PATS = ['liso', 'rayas', 'lunares'];
const PATTEX = [null,
  ctex(64, 64, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#b8b8b8'; for (let i = 0; i < 4; i++) g.fillRect(0, i * 16, w, 7); }, [2, 2]),
  ctex(64, 64, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#b0b0b0'; for (const [x, y] of [[16, 16], [48, 48], [48, 16], [16, 48]]) { g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); } }, [2, 2])];

// ------------------------------------------------------------ mundo: GRAN BIBLIOTECA
const W = 13, D = 10, H = 7;
const colliders = []; // {x0,x1,z0,z1,top}
const occluders = []; // {obj, mats:[...], fade}
const world = new THREE.Group(); scene.add(world);
function addBox(x, z, w, d, top) { colliders.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, top }); }

const floorTex = ctex(512, 512, (g, w, h) => { const C = ['#e2a46c', '#d4945c', '#eab27a', '#cf8d55']; const s = 64; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = C[(x + y * 3) % 4]; g.fillRect(x * s, y * s, s, s); g.strokeStyle = 'rgba(120,60,20,.18)'; g.lineWidth = 1.2; const hz = (x + y) % 2; for (let k = 0; k < 7; k++) { g.beginPath(); if (hz) { g.moveTo(x * s, y * s + 5 + k * 9 + Math.sin(k + x) * 2); g.bezierCurveTo(x * s + 20, y * s + 8 + k * 9, x * s + 44, y * s + 2 + k * 9, x * s + s, y * s + 5 + k * 9); } else { g.moveTo(x * s + 5 + k * 9, y * s); g.bezierCurveTo(x * s + 8 + k * 9, y * s + 20, x * s + 2 + k * 9, y * s + 44, x * s + 5 + k * 9, y * s + s); } g.stroke(); } g.fillStyle = 'rgba(90,45,15,.35)'; g.fillRect(x * s, y * s, s, 2); g.fillRect(x * s, y * s, 2, s); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x * s + 2, y * s + 2, s - 4, 6); } }, [7, 5]);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, D * 2), std('#fff', { map: floorTex, roughness: .6 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; world.add(floor);
const wallTex = ctex(256, 256, (g, w, h) => { g.fillStyle = '#f6cfdc'; g.fillRect(0, 0, w, h); g.fillStyle = '#fadfe8'; for (let i = 0; i < 4; i++) g.fillRect(i * 64 + 8, 0, 30, h); g.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const x = i * 64 + 23, y = j * 64 + 32; g.beginPath(); g.moveTo(x, y - 12); g.quadraticCurveTo(x + 10, y - 4, x, y + 12); g.quadraticCurveTo(x - 10, y - 4, x, y - 12); g.fill(); g.beginPath(); g.arc(x + 32, y + 32, 3, 0, 7); g.fill(); } g.fillStyle = 'rgba(200,120,150,.15)'; for (let i = 0; i < 4; i++) g.fillRect(i * 64 + 7, 0, 2, h); }, [8, 2.5]);
const wallMat = std('#fff', { map: wallTex, roughness: .9 });
const woodTex = ctex(128, 128, (g, w, h) => { g.fillStyle = '#a8653f'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(70,30,10,.25)'; for (let i = 0; i < 18; i++) { g.beginPath(); g.moveTo(0, i * 7 + Math.sin(i) * 3); g.bezierCurveTo(40, i * 7 + 4, 80, i * 7 - 3, 128, i * 7 + 2); g.stroke(); } }, [1, 1]);
for (const [x, z, ry, len] of [[0, -D, 0, W * 2], [0, D, Math.PI, W * 2], [-W, 0, Math.PI / 2, D * 2], [W, 0, -Math.PI / 2, D * 2]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(len, H), wallMat); m.position.set(x, H / 2, z); m.rotation.y = ry; m.receiveShadow = true; world.add(m); }
{ const wain = std('#fff', { map: woodTex, roughness: .55 }), gold = std('#f0c560', { metalness: .5, roughness: .35 }); const tmp = new THREE.Group(); for (const [x, z, w, d] of [[0, -D + .1, W * 2, .2], [0, D - .1, W * 2, .2], [-W + .1, 0, .2, D * 2], [W - .1, 0, .2, D * 2]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1.1, d), wain); m.position.set(x, .55, z); tmp.add(m); const c = new THREE.Mesh(new THREE.BoxGeometry(w + .1, .25, d + .15), wain); c.position.set(x, H - .12, z); tmp.add(c); const r = new THREE.Mesh(new THREE.BoxGeometry(w, .06, d + .08), gold); r.position.set(x, 1.12, z); tmp.add(r); const r2 = r.clone(); r2.position.y = H - .3; tmp.add(r2); }
  // cuadros enmarcados en las paredes (decoración kawaii)
  const artC = ['#ffc0d8', '#b0e0ff', '#c8f0b0', '#ffe6a0', '#d9c4ff']; const artTex = ctex(256, 256, (g) => { for (let i = 0; i < 4; i++) { const ox = (i % 2) * 128, oy = (i >> 1) * 128; g.fillStyle = artC[i]; g.fillRect(ox, oy, 128, 128); g.fillStyle = '#fff8'; g.beginPath(); g.arc(ox + 64, oy + 70, 34, 0, 7); g.fill(); g.fillStyle = '#5a3a6a'; g.beginPath(); g.arc(ox + 52, oy + 64, 5, 0, 7); g.arc(ox + 76, oy + 64, 5, 0, 7); g.fill(); g.fillStyle = '#ff8fb8'; g.beginPath(); g.arc(ox + 64, oy + 80, 6, 0, Math.PI); g.fill(); } });
  const artMat = std('#fff', { map: artTex, roughness: .5 });
  for (const [x, z, ry, i] of [[-6, D - .05, Math.PI, 0], [0, D - .05, Math.PI, 1], [6, D - .05, Math.PI, 2], [-W + .05, -6.5, Math.PI / 2, 3], [W - .05, -6.5, -Math.PI / 2, 0], [-W + .05, 7.5, Math.PI / 2, 1], [W - .05, 7.5, -Math.PI / 2, 2]]) { const f = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.5, .1), gold); f.position.set(x, 3.6, z); f.rotation.y = ry; tmp.add(f); const geo = new THREE.PlaneGeometry(1.6, 1.2); const uv = geo.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * .5 + (i % 2) * .5, uv.getY(k) * .5 + (1 - (i >> 1)) * .5); const p = new THREE.Mesh(geo, artMat); p.position.set(x, 3.6, z); p.rotation.y = ry; p.translateZ(.06); tmp.add(p); }
  mergeByMaterial(tmp, world); }
addBox(0, -D - .5, W * 2 + 2, 1, 99); addBox(0, D + .5, W * 2 + 2, 1, 99); addBox(-W - .5, 0, 1, D * 2 + 2, 99); addBox(W + .5, 0, 1, D * 2 + 2, 99);
// alfombra de lectura
const rugTex = ctex(256, 256, (g, w, h) => { const cols = ['#ff8fb8', '#ffd36e', '#8fd8ff', '#b99bff']; for (let i = 0; i < 4; i++) { g.fillStyle = cols[i]; g.beginPath(); g.arc(128, 128, 128 - i * 30, 0, 7); g.fill(); } });
const rug = new THREE.Mesh(new THREE.CircleGeometry(3.2, 40), std('#fff', { map: rugTex })); rug.rotation.x = -Math.PI / 2; rug.position.set(0, .01, 4); rug.receiveShadow = true; world.add(rug);
// ventanas con rayos de luz y polvo dorado
for (const z of [-5, 5]) for (const x of [-W + .05, W - .05]) {
  const win = new THREE.Mesh(new THREE.PlaneGeometry(2, 2.8), new THREE.MeshBasicMaterial({ color: '#fff2c0' })); win.position.set(x, 4.2, z); win.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; world.add(win);
  const ray = new THREE.Mesh(new THREE.CylinderGeometry(1, 2.2, 7, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe7a0', transparent: true, opacity: .09, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  ray.position.set(x * .78, 2.4, z); ray.rotation.z = (x < 0 ? -1 : 1) * 1.0; world.add(ray);
}
const dustG = new THREE.BufferGeometry(); const dp = new Float32Array(240 * 3); for (let i = 0; i < 240; i++) { dp[i * 3] = (R() * 2 - 1) * W; dp[i * 3 + 1] = R() * 5; dp[i * 3 + 2] = (R() * 2 - 1) * D; } dustG.setAttribute('position', new THREE.BufferAttribute(dp, 3));
const dust = new THREE.Points(dustG, new THREE.PointsMaterial({ color: '#ffe08a', size: .06, transparent: true, opacity: .8, depthWrite: false })); world.add(dust);

// estanterías: 1 InstancedMesh de libros por estantería (material propio para poder hacerla transparente)
const bookGeo = new THREE.BoxGeometry(1, 1, 1);
const spineTex = ctex(64, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#d0d0d0'); gr.addColorStop(.35, '#fff'); gr.addColorStop(1, '#bdbdbd'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#f3d27a'; g.fillRect(0, 14, w, 6); g.fillRect(0, h - 22, w, 6); g.fillStyle = '#ffffffcc'; g.fillRect(18, 40, 28, 40); g.fillStyle = '#9a7ab0'; for (let i = 0; i < 4; i++) g.fillRect(22, 46 + i * 8, 20, 3); });
const BOOKC = ['#ff8fa8', '#7fc8ff', '#ffd36e', '#9be59b', '#c7a0ff', '#ff9f6b', '#6fd6c6'];
function shelf(x, z, ry, w = 3.2) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; world.add(g);
  const wood = std('#fff', { map: woodTex, transparent: true, roughness: .6 }); const bm = std('#fff', { map: spineTex, transparent: true, roughness: .55 }); const tmp = new THREE.Group(); g.add(tmp);
  const d = .7, h = 4.2, rows = 5;
  const parts = [[0, h / 2, -d / 2 + .04, w, h, .08], [-w / 2, h / 2, 0, .1, h, d], [w / 2, h / 2, 0, .1, h, d]];
  for (let r = 0; r <= rows; r++) parts.push([0, .05 + r * (h - .1) / rows, 0, w, .08, d]);
  parts.push([0, h + .08, 0, w + .2, .16, d + .1], [0, .12, d / 2 - .02, w, .24, .04]); for (const p of parts) { const m = new THREE.Mesh(new THREE.BoxGeometry(p[3], p[4], p[5]), wood); m.position.set(p[0], p[1], p[2]); tmp.add(m); } mergeByMaterial(tmp, g, g); g.remove(tmp);
  const N = 60, inst = new THREE.InstancedMesh(bookGeo, bm, N); const M = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(); let k = 0;
  for (let r = 0; r < rows && k < N; r++) { let bx = -w / 2 + .1; const y0 = .09 + r * (h - .1) / rows; while (bx < w / 2 - .25 && k < N) { const bw = .1 + R() * .08, bh = .5 + R() * .25; const tilt = R() < .1 ? .25 : 0; q.setFromEuler(new THREE.Euler(0, 0, tilt)); M.compose(new THREE.Vector3(bx + bw / 2, y0 + bh / 2, .02), q, new THREE.Vector3(bw, bh, .5)); inst.setMatrixAt(k, M); inst.setColorAt(k, c.set(BOOKC[(R() * 7) | 0])); k++; bx += bw + .01 + (R() < .08 ? .25 : 0); } }
  inst.count = k; inst.castShadow = true; g.add(inst);
  const cs = Math.abs(Math.cos(ry)) > .5; addBox(x, z, cs ? w : d, cs ? d : w, h);
  occluders.push({ obj: g, mats: [wood, bm], fade: 1 });
  return g;
}
for (const x of [-10, -6, -2, 2, 6, 10]) shelf(x, -D + .4, 0);
for (const z of [-2, 2]) { shelf(-W + .4, z, Math.PI / 2); shelf(W - .4, z, -Math.PI / 2); }
const isl = shelf(0, -3.2, 0, 4);
// búho bibliotecario dormido encima de la estantería central
const owl = new THREE.Group(); { const b = new THREE.Mesh(new THREE.SphereGeometry(.35, 16, 12), std('#b98a5e')); b.scale.y = 1.15; owl.add(b); const bel = new THREE.Mesh(new THREE.SphereGeometry(.25, 12, 10), std('#f4dcb8')); bel.position.set(0, -.08, .17); owl.add(bel); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), std('#3a2a3a')); e.position.set(s * .13, .14, .29); e.scale.y = .25; owl.add(e); owl.userData['e' + s] = e; } owl.position.set(1.2, 4.6, -3.2); world.add(owl); }
// mesas (no copiables, son muebles)
const tableMat = std('#fff', { map: woodTex, roughness: .5 }); for (const [x, z] of [[-6, -.5], [6, -.5]]) { const t = new THREE.Group(); const top = new THREE.Mesh(new THREE.BoxGeometry(2.6, .12, 1.3), tableMat); top.position.y = .8; t.add(top); for (const [a, b] of [[-1.15, -.5], [1.15, -.5], [-1.15, .5], [1.15, .5]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(.12, .8, .12), tableMat); l.position.set(a, .4, b); t.add(l); } t.position.set(x, 0, z); world.add(t); mergeByMaterial(t, world); world.remove(t); addBox(x, z, 2.6, 1.3, .86); }
// velas flotantes (decoración, sin colisión)
const floatCandles = []; const fcRoot = new THREE.Group(); fcRoot.userData.ph = 0; const fcG = new THREE.Group(); { const cm = std('#fff6e0'), fm = new THREE.MeshBasicMaterial({ color: '#ffcf6b' }); const cg = new THREE.CylinderGeometry(.06, .06, .3, 8), fg = new THREE.SphereGeometry(.05, 6, 5); for (let i = 0; i < 10; i++) { const c = new THREE.Group(); c.add(new THREE.Mesh(cg, cm)); const f = new THREE.Mesh(fg, fm); f.position.y = .2; f.scale.y = 1.6; c.add(f); c.position.set((R() * 2 - 1) * 9, 4.6 + R(), (R() * 2 - 1) * 6); fcG.add(c); } world.add(fcG); const ms = mergeByMaterial(fcG, fcRoot); world.remove(fcG); for (const m of ms) m.castShadow = false; } world.add(fcRoot); floatCandles.push(fcRoot);

// ------------------------------------------------------------ objetos copiables
// cada tipo: partes [geom, color, pos, rot?] ; main = índice de la parte con patrón
const G = {
  box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(.5, .5, 1, 18), sph: new THREE.SphereGeometry(.5, 18, 14), cone: new THREE.ConeGeometry(.5, 1, 18),
  vase: new THREE.LatheGeometry([[0, 0], [.22, 0], [.3, .2], [.34, .45], [.2, .7], [.16, .85], [.22, .95], [0, .95]].map(p => new THREE.Vector2(p[0], p[1])), 18),
  torus: new THREE.TorusGeometry(.5, .08, 8, 24),
};
const TYPES = {
  libro: { n: 'libro', r: .35, parts: [['box', '#d94f6e', [0, .06, 0], [.5, .12, .7]], ['box', '#fff4dd', [.03, .06, 0], [.46, .1, .66]]], pal: ['#d94f6e', '#4f8ad9', '#3fae7a', '#9a5ad9'] },
  pila: { n: 'pila de libros', r: .45, parts: [['box', '#4f8ad9', [0, .1, 0], [.7, .2, .9]], ['box', '#ffb03f', [.05, .3, -.03], [.62, .2, .82], [0, .2, 0]], ['box', '#d94f6e', [-.03, .5, .02], [.56, .2, .76], [0, -.15, 0]], ['box', '#3fae7a', [0, .7, 0], [.5, .2, .7], [0, .1, 0]]], pal: ['#4f8ad9'] },
  vela: { n: 'vela', r: .25, parts: [['cyl', '#c99a3a', [0, .05, 0], [.5, .1, .5]], ['cyl', '#fff4dc', [0, .4, 0], [.22, .6, .22]], ['sph', '#ffc65a', [0, .78, 0], [.12, .22, .12], null, 1]], pal: ['#fff4dc', '#ffd0e0'] },
  cojin: { n: 'cojín', r: .5, main: 0, parts: [['sph', '#ff8fb8', [0, .2, 0], [1, .4, 1]]], pal: ['#ff8fb8', '#8fd8ff', '#ffd36e', '#b99bff'], pats: [1, 2, 0] },
  jarron: { n: 'jarrón', r: .4, main: 0, parts: [['vase', '#6fb8e8', [0, 0, 0], [1.2, 1.2, 1.2]]], pal: ['#6fb8e8', '#e87f9c', '#f0c75a'], pats: [2, 1, 0] },
  lampara: { n: 'lámpara', r: .4, parts: [['cyl', '#8a6a4a', [0, .04, 0], [.6, .08, .6]], ['cyl', '#c9a36a', [0, .9, 0], [.07, 1.8, .07]], ['cone', '#ffe2a8', [0, 1.9, 0], [.8, .5, .8], null, 1]], pal: ['#ffe2a8'] },
  baul: { n: 'baúl', r: .75, main: 0, parts: [['box', '#a8643c', [0, .35, 0], [1.3, .7, .8]], ['cyl', '#b8744a', [0, .7, 0], [.8, 1.3, .8], [0, 0, Math.PI / 2]], ['box', '#e8c25a', [0, .5, .41], [.2, .25, .04]]], pal: ['#a8643c', '#6a8ad0'], pats: [0, 1] },
  silla: { n: 'silla', r: .45, parts: [['box', '#c47a4a', [0, .5, 0], [.7, .1, .7]], ['box', '#c47a4a', [0, 1, -.32], [.7, .9, .08]], ['box', '#8a5236', [-.3, .25, -.3], [.07, .5, .07]], ['box', '#8a5236', [.3, .25, -.3], [.07, .5, .07]], ['box', '#8a5236', [-.3, .25, .3], [.07, .5, .07]], ['box', '#8a5236', [.3, .25, .3], [.07, .5, .07]]], pal: ['#c47a4a', '#7ab8c4'] },
  globo: { n: 'globo terráqueo', r: .4, parts: [['cyl', '#8a5236', [0, .05, 0], [.5, .1, .5]], ['cyl', '#c9a36a', [0, .35, 0], [.06, .6, .06]], ['sph', '#5ab8e8', [0, .9, 0], [.7, .7, .7]], ['torus', '#e8c25a', [0, .9, 0], [.82, .82, .82], [0, Math.PI / 2, .4]]], pal: ['#5ab8e8'] },
  cuadro: { n: 'cuadro', r: .45, main: 1, parts: [['box', '#e8b84a', [0, .75, 0], [.9, 1.1, .1], [-.15, 0, 0]], ['box', '#ffc0d8', [0, .75, .06], [.7, .9, .02], [-.15, 0, 0]], ['box', '#8a5236', [0, .4, -.3], [.06, .9, .06], [.5, 0, 0]]], pal: ['#ffc0d8', '#b0e0ff', '#c8f0b0'], pats: [0, 2, 1] },
  maceta: { n: 'maceta', r: .4, parts: [['cyl', '#d87a4a', [0, .25, 0], [.6, .5, .6]], ['sph', '#5ab86a', [0, .75, 0], [.8, .7, .8]], ['sph', '#6ac87a', [.15, 1.05, .05], [.5, .5, .5]]], pal: ['#d87a4a'] },
  taburete: { n: 'taburete', r: .35, main: 0, parts: [['cyl', '#ff9fc0', [0, .6, 0], [.6, .12, .6]], ['cyl', '#8a5236', [0, .3, 0], [.12, .6, .12]], ['cyl', '#8a5236', [0, .03, 0], [.45, .06, .45]]], pal: ['#ff9fc0', '#9fd0ff'], pats: [0, 2] },
  tetera: { n: 'tetera', r: .3, main: 0, parts: [['sph', '#f0f0ff', [0, .3, 0], [.55, .5, .55]], ['cyl', '#f0f0ff', [.32, .35, 0], [.07, .3, .07], [0, 0, -.8]], ['sph', '#e8c25a', [0, .58, 0], [.12, .1, .12]]], pal: ['#f0f0ff', '#ffd0e8'], pats: [2, 0] },
};
const TYPE_KEYS = Object.keys(TYPES);
const UNA = { vela: 1, 'lampara': 1, silla: 1, pila: 1, maceta: 1, tetera: 1 };
const art = t => (UNA[t] ? 'una ' : 'un ') + TYPES[t].n;
const matCache = {};
function partMat(col, pat, emis) { const k = col + pat + (emis || ''); return matCache[k] || (matCache[k] = std(col, { map: PATTEX[pat] || null, emissive: emis ? col : '#000', emissiveIntensity: emis ? .9 : 0, roughness: .45, metalness: col === '#e8c25a' || col === '#c99a3a' ? .45 : 0 })); }
// crea el objeto real. err = null => exacto; si no, error de aproximación {h,l,s,w,a,r,pat}
function buildProp(type, vi, pat, err) {
  const T = TYPES[type]; const g = new THREE.Group(); const main = T.main ?? -1;
  T.parts.forEach((p, i) => {
    let col = i === (T.main ?? 0) ? T.pal[vi % T.pal.length] : p[1]; const ppat = i === main ? pat : 0; const emis = p[5];
    let mat;
    if (err) { const c = new THREE.Color(col); const hsl = {}; c.getHSL(hsl); c.setHSL((hsl.h + err.h / 360 + 1) % 1, clamp(hsl.s + err.s, 0, 1), clamp(hsl.l + err.l, .03, .97)); mat = std(c, { map: PATTEX[i === main ? err.pat : 0] || null, emissive: emis ? c : '#000', emissiveIntensity: emis ? .8 : 0, roughness: .6 }); }
    else mat = partMat(col, ppat, emis);
    const m = new THREE.Mesh(G[p[0]], mat); m.position.fromArray(p[2]); m.scale.fromArray(p[3]); if (p[4]) m.rotation.set(...p[4]); m.castShadow = true; m.receiveShadow = true; g.add(m);
  });
  return g;
}
// pasa de la corrección (ajustes del jugador) al error final y al parecido
const ERR_MAX = { h: 50, l: .22, s: .4, w: .35, a: .35, r: 50 };
function randErr(scale = 1) { const sg = () => (Math.random() < .5 ? -1 : 1); const e = {}; for (const k in ERR_MAX) e[k] = sg() * ERR_MAX[k] * rand(.55, 1) * scale; return e; }
function parecido(e, patOk) {
  const n = k => Math.min(1.5, Math.abs(e[k]) / ERR_MAX[k]);
  const loss = .2 * n('h') + .14 * n('l') + .1 * n('s') + .17 * n('w') + .17 * n('a') + .12 * n('r') + (patOk ? 0 : .1);
  return Math.round(clamp(1 - loss, 0, 1) * 100);
}

const props = []; // {id,type,vi,pat,obj,x,z,ry,r}
const propRoot = new THREE.Group(); scene.add(propRoot);
function freeAt(x, z, r) { if (Math.abs(x) > W - .8 || Math.abs(z) > D - .8) return false; for (const c of colliders) if (x + r > c.x0 && x - r < c.x1 && z + r > c.z0 && z - r < c.z1) return false; for (const p of props) if (Math.hypot(p.x - x, p.z - z) < p.r + r + .15) return false; return true; }
function placeProp(type, x, z, ry) { const T = TYPES[type]; if (!freeAt(x, z, T.r)) return null; const vi = (R() * T.pal.length) | 0; const pat = T.pats ? T.pats[(R() * T.pats.length) | 0] : 0; const obj = buildProp(type, vi, pat); obj.position.set(x, 0, z); obj.rotation.y = ry; propRoot.add(obj); const p = { id: props.length, type, vi, pat, obj, x, z, ry, r: T.r }; obj.userData.prop = p; props.push(p); return p; }
function scatter(type, n, cx, cz, rad) { let k = 0, tries = 0; while (k < n && tries++ < 80) { const a = R() * 6.28, d = R() * rad; if (placeProp(type, cx + Math.cos(a) * d, cz + Math.sin(a) * d, R() * 6.28)) k++; } }
// agrupados con sentido: cojines en la alfombra, sillas junto a las mesas, pilas junto a estanterías...
scatter('cojin', 6, 0, 4, 2.6); scatter('silla', 3, -6, .9, .6); scatter('silla', 3, 6, .9, .6); scatter('silla', 1, -6, -1.9, .5); scatter('silla', 1, 6, -1.9, .5);
for (const x of [-8, -4, 0, 4, 8]) { scatter('pila', 1, x, -8.4, .6); scatter('libro', 2, x, -8, 1.2); }
scatter('vela', 4, -3, 6.5, 3); scatter('vela', 3, 8, 6, 2); scatter('jarron', 3, -10, 7, 2); scatter('jarron', 2, 10, -6.5, 1.5);
scatter('lampara', 2, -11, -6, 1.2); scatter('lampara', 2, 11, 6.5, 1.2); scatter('lampara', 1, 3, 2, .3);
scatter('baul', 2, -10, 5, 2); scatter('baul', 1, 10, 4.5, 1); scatter('globo', 2, 4, 6.5, 2); scatter('globo', 1, -4, -5.5, 1);
scatter('cuadro', 3, 9, 8.3, 2); scatter('cuadro', 2, -8, 8.4, 1.5); scatter('maceta', 3, 11, -8.2, 1.5); scatter('maceta', 3, -11.3, -8.3, 1.3); scatter('maceta', 2, 0, 8.6, 3);
scatter('taburete', 3, -2, 1, 2.5); scatter('tetera', 2, -2.5, 4.5, 1.5); scatter('libro', 6, 0, 0, 8); scatter('pila', 2, -8, -3, 2); scatter('pila', 2, 8, -3, 2);
// los objetos reales se dibujan fusionados por material (pocas llamadas); su grupo queda invisible para tocar/raycast
const propStatic = new THREE.Group(); scene.add(propStatic); mergeByMaterial(propRoot, propStatic); propRoot.traverse(o => { if (o.isMesh) { o.material = o.material; o.visible = true; } }); propRoot.visible = false;
// (en v7 Estudio vio una vela tapando la estantería del este: aquí nada se coloca pegado a las estanterías laterales)

// brillos suaves bajo los objetos copiables cercanos
const ringMat = new THREE.MeshBasicMaterial({ color: '#fff3a0', transparent: true, opacity: .6, depthWrite: false, blending: THREE.AdditiveBlending });
const ringGeo = new THREE.RingGeometry(.8, 1, 32); ringGeo.rotateX(-Math.PI / 2);
const rings = []; for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(ringGeo, ringMat); m.visible = false; m.position.y = .02; scene.add(m); rings.push(m); }

// ------------------------------------------------------------ personajes
function mochi(col, hat) {
  const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(.45, 20, 16), std(col, { roughness: .45 })); b.scale.set(1, .85, 1); b.position.y = .4; b.castShadow = true; g.add(b);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.07, 10, 8), std('#2a1a3a')); e.position.set(s * .15, .48, .39); g.add(e); const ch = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 6), std('#ff9fbf')); ch.position.set(s * .25, .38, .37); ch.scale.z = .4; g.add(ch); }
  if (hat) { const h = new THREE.Mesh(new THREE.CylinderGeometry(.22, .3, .25, 16), std('#5a3a8a')); h.position.y = .85; g.add(h); const br = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .04, 20), std('#5a3a8a')); br.position.y = .74; g.add(br); const lu = new THREE.Mesh(G.torus, std('#e8c25a', { metalness: .4 })); lu.scale.setScalar(.3); lu.position.set(.5, .45, .2); g.add(lu); g.userData.lupa = lu; }
  return g;
}
// Un "escondido" (jugador, bot o remoto)
class Hider {
  constructor(col) { this.g = new THREE.Group(); this.body = mochi(col); this.g.add(this.body); this.disg = new THREE.Group(); this.g.add(this.disg); scene.add(this.g); this.x = 0; this.z = 0; this.y = 0; this.vy = 0; this.copy = null; this.err = null; this.patOk = true; this.sim = 0; this.vivo = true; this.wob = 0; this.nextWob = rand(3, 6); this.moving = 0; this.face = 0; this.r = .45; }
  disfrazar(p, err) {
    this.copy = p; this.err = err || randErr(); if (err == null) { this.err.pat = TYPES[p.type].pats && Math.random() < .65 ? (p.pat + 1 + ((Math.random() * 2) | 0)) % 3 : p.pat; this.err.ry = p.ry; }
    this.rebuild(); this.body.visible = false; this.r = Math.max(.3, p.r * .9);
  }
  rebuild() { const p = this.copy; this.disg.traverse(o => o.material && o.material.dispose()); this.disg.clear(); if (!p) return; const o = buildProp(p.type, p.vi, p.pat, this.err); o.scale.set(1 + this.err.w, 1 + this.err.a, 1 + this.err.w); o.rotation.y = this.err.ry + this.err.r * Math.PI / 180; this.disg.add(o); this.patOk = this.err.pat === p.pat; this.sim = parecido(this.err, this.patOk); }
  quitar() { this.copy = null; this.disg.clear(); this.body.visible = true; this.sim = 0; this.r = .45; }
  update(dt) {
    this.g.position.set(this.x, this.y, this.z); if (!this.copy) this.body.rotation.y = this.face;
    // tambaleo: la pista. Menos parecido => más frecuente y más fuerte
    const s = this.copy ? this.sim / 100 : 0; this.nextWob -= dt; if (this.nextWob <= 0) { this.wob = .55; this.nextWob = rand(3, 5) * (.7 + s * 1.3); }
    if (this.wob > 0) this.wob -= dt; const amp = .04 + .22 * (1 - s);
    const w = this.wob > 0 ? Math.sin(this.wob * 30) * amp * (this.wob / .55) : 0;
    const hop = this.moving > .1 ? Math.abs(Math.sin(performance.now() / 90)) * .08 : 0;
    this.disg.rotation.z = w; this.disg.position.y = hop + (this.wob > 0 ? Math.abs(w) * .3 : 0); this.body.position.y = hop * 2;
  }
  get wobbling() { return this.wob > 0; }
  dispose() { scene.remove(this.g); }
}

// colisión círculo vs cajas y objetos; suelo = parte de arriba de lo que pises
function moveCircle(e, dx, dz, ignore) {
  let x = e.x + dx, z = e.z + dz; const r = e.r; let ground = 0;
  for (const c of colliders) { if (c.top <= e.y + .35) { if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) ground = Math.max(ground, c.top); continue; } const cx = clamp(x, c.x0, c.x1), cz = clamp(z, c.z0, c.z1); const ddx = x - cx, ddz = z - cz, d = Math.hypot(ddx, ddz); if (d < r) { if (d > 1e-4) { x = cx + ddx / d * r; z = cz + ddz / d * r; } else { x = e.x; z = e.z; } } }
  for (const p of props) { if (p === ignore || e.y > 1.1) continue; const ddx = x - p.x, ddz = z - p.z, d = Math.hypot(ddx, ddz), m = r + p.r * .8; if (d < m && d > 1e-4) { x = p.x + ddx / d * m; z = p.z + ddz / d * m; } }
  e.x = clamp(x, -W + .5, W - .5); e.z = clamp(z, -D + .5, D - .5); return ground;
}

// ------------------------------------------------------------ cámara (tercera persona estable)
const cam = { yaw: Math.PI, pitch: .55, dist: 6, tx: 0, ty: 1, tz: 0 };
const ray = new THREE.Raycaster(); const v3 = new THREE.Vector3();
function updCamera(dt, x, y, z, snap) {
  cam.tx = lerp(cam.tx, x, snap ? 1 : 1 - Math.exp(-dt * 8)); cam.tz = lerp(cam.tz, z, snap ? 1 : 1 - Math.exp(-dt * 8)); cam.ty = lerp(cam.ty, y + 1, snap ? 1 : 1 - Math.exp(-dt * 6));
  let cx = cam.tx + Math.sin(cam.yaw) * Math.cos(cam.pitch) * cam.dist, cy = cam.ty + Math.sin(cam.pitch) * cam.dist, cz = cam.tz + Math.cos(cam.yaw) * Math.cos(cam.pitch) * cam.dist;
  // nunca fuera de la sala (las paredes no tapan) ni bajo el techo
  const k = Math.min(1, (W - .4 - Math.abs(cam.tx)) / Math.max(.01, Math.abs(cx - cam.tx)), (D - .4 - Math.abs(cam.tz)) / Math.max(.01, Math.abs(cz - cam.tz)));
  if (k < 1) { cx = cam.tx + (cx - cam.tx) * k; cz = cam.tz + (cz - cam.tz) * k; cy = cam.ty + (cy - cam.ty) * Math.max(k, .6) + (1 - k) * 1.2; }
  camera.position.set(cx, Math.min(cy, H - .4), cz); camera.lookAt(cam.tx, cam.ty, cam.tz);
  // muebles entre la cámara y el personaje => semitransparentes
  v3.set(cam.tx, cam.ty, cam.tz); const dir = camera.position.clone().sub(v3); const len = dir.length(); ray.set(v3, dir.normalize()); ray.far = len;
  const hits = new Set(); for (const o of occluders) if (ray.intersectObject(o.obj, true).length) hits.add(o);
  for (const o of occluders) { const t = hits.has(o) ? .22 : 1; o.fade = lerp(o.fade, t, 1 - Math.exp(-dt * 10)); for (const m of o.mats) { m.opacity = o.fade; m.depthWrite = o.fade > .95; } }
}

// ------------------------------------------------------------ entrada: joystick fijo donde pones el dedo + 2º dedo gira cámara + toque corto = tocar objeto
const joy = { id: null, sx: 0, sy: 0, x: 0, y: 0, t: 0, moved: false, cam: null, cx: 0, cy: 0 };
const joyEl = $('joy'), joyK = joyEl.firstElementChild; const keys = {};
function tapTargets() { if (myRole === 'hider') return props.filter(p => p !== player.copy && Math.hypot(p.x - player.x, p.z - player.z) < 4).map(p => p.obj); return props.map(p => p.obj).concat(bots.filter(b => b.vivo).map(b => b.g), [...remotes.values()].filter(r => r.h.vivo && r.h.copy).map(r => r.h.g)); }
function showJoy() { joyEl.style.left = joy.sx + 'px'; joyEl.style.top = joy.sy + 'px'; joyEl.style.display = 'block'; joyK.style.transform = ''; joy.shown = true; }
canvas.addEventListener('pointerdown', e => {
  if (!G_ON || !player) return;
  if (joy.id === null) {
    // raycast al tocar: si hay un objeto debajo del dedo, esperamos a ver si es toque o arrastre
    const hit = phase !== 'fin' && (myRole === 'hider' || phase === 'seek') ? pick(e.clientX, e.clientY, tapTargets()) : null;
    Object.assign(joy, { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: 0, y: 0, t: performance.now(), moved: false, shown: false, hit: !!hit });
    if (!hit) showJoy();
  } else if (joy.cam === null) { joy.cam = e.pointerId; joy.cx = e.clientX; joy.cy = e.clientY; }
});
addEventListener('pointermove', e => {
  if (e.pointerId === joy.id) { const dx = e.clientX - joy.sx, dy = e.clientY - joy.sy, d = Math.hypot(dx, dy); if (d > 10) { joy.moved = true; if (!joy.shown) showJoy(); } if (!joy.shown) return; const m = Math.min(d, 50) / (d || 1); joy.x = dx * m / 50; joy.y = dy * m / 50; joyK.style.transform = `translate(${dx * m}px,${dy * m}px)`; }
  else if (e.pointerId === joy.cam) { cam.yaw -= (e.clientX - joy.cx) * .008; cam.pitch = clamp(cam.pitch + (e.clientY - joy.cy) * .004, .25, 1.05); joy.cx = e.clientX; joy.cy = e.clientY; }
});
function upP(e) { if (e.pointerId === joy.id) { const dt = performance.now() - joy.t; if (!joy.moved && (joy.hit ? dt < 600 : dt < 250)) onTap(joy.sx, joy.sy); joy.id = null; joy.x = joy.y = 0; joyEl.style.display = 'none'; } else if (e.pointerId === joy.cam) joy.cam = null; }
addEventListener('pointerup', upP); addEventListener('pointercancel', upP);
addEventListener('keydown', e => { keys[e.code] = 1; if (e.code === 'Space') doJump(); }); addEventListener('keyup', e => keys[e.code] = 0);
function inputVec() { let x = joy.x, y = joy.y; if (keys.KeyA || keys.ArrowLeft) x -= 1; if (keys.KeyD || keys.ArrowRight) x += 1; if (keys.KeyW || keys.ArrowUp) y -= 1; if (keys.KeyS || keys.ArrowDown) y += 1; if (keys.KeyQ) cam.yaw += .04; if (keys.KeyE) cam.yaw -= .04; const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } return { x, y, l: Math.min(1, l) }; }
function pick(cx, cy, list) { const nd = new THREE.Vector2(cx / innerWidth * 2 - 1, -cy / innerHeight * 2 + 1); ray.setFromCamera(nd, camera); ray.far = 60; const h = ray.intersectObjects(list, true)[0]; if (!h) return null; let o = h.object; while (o && !o.userData.prop && !o.userData.hider) o = o.parent; return o ? { o, d: h.distance } : null; }

// ------------------------------------------------------------ HUD
const ui = { pal: $('pal'), sim: $('simtx'), bar: $('simbar'), tim: $('tim'), pts: $('pts'), msg: $('msg') };
let msgT = 0; function msg(t, s = 1.8) { ui.msg.textContent = t; ui.msg.style.opacity = 1; msgT = s; }
function show(id) { for (const s of document.querySelectorAll('.scr')) s.classList.toggle('on', s.id === id); $('hud').classList.toggle('on', !id); $('ver').style.display = id === 'menu' ? '' : 'none'; }
const SL = { h: $('sH'), l: $('sL'), s: $('sS'), w: $('sW'), a: $('sA'), r: $('sR') };
let LEVEL = 1; for (const b of document.querySelectorAll('#lv button')) b.onclick = () => { LEVEL = +b.dataset.l; for (const c of document.querySelectorAll('#lv button')) c.classList.toggle('on', c === b); SND.tick(); };
const LV = [{ n: 'Fácil', sp: 2.3, view: 7, k: .45, tap: 6, blind: .03, bots: 3, bsim: [55, 72], bwob: 1 },
            { n: 'Normal', sp: 2.9, view: 9, k: .8, tap: 4.5, blind: .06, bots: 4, bsim: [72, 86], bwob: 1.4 },
            { n: 'Difícil', sp: 3.4, view: 11, k: 1.25, tap: 3.2, blind: .1, bots: 5, bsim: [84, 94], bwob: 1.9 }];

// ------------------------------------------------------------ partida
let G_ON = false, mode = null, phase = '', tLeft = 0, score = 0, player = null, critic = null, bots = [], whistles = 0, gotaUsada = false, wrongs = 0, found = 0, ai = null, net = null, remotes = new Map(), myRole = '';
let base0 = null; // ajustes del jugador: corrección = slider * ERR_MAX
function setPal(on) { ui.pal.classList.toggle('on', !!on && mode !== 'seek' && myRole !== 'critic' && !!player?.copy && phase !== 'fin'); $('bPal').style.display = mode === 'seek' || myRole === 'critic' || !player?.copy ? 'none' : ''; }
function sliderErr() { const e = Object.assign({}, base0); for (const k in SL) e[k] = base0[k] + (+SL[k].value / 100) * ERR_MAX[k] * 1.6; e.pat = player.err.pat; e.ry = base0.ry; return e; }
for (const k in SL) SL[k].addEventListener('input', () => { if (!player?.copy) return; player.err = sliderErr(); player.rebuild(); });
$('pPat').onclick = () => { if (!player?.copy) return; player.err.pat = (player.err.pat + 1) % 3; player.rebuild(); $('pPat').textContent = 'Patrón: ' + PATS[player.err.pat]; SND.tick(); };
$('pGota').onclick = () => { if (!player?.copy || gotaUsada) return; gotaUsada = true; for (const k of ['h', 'l', 's']) { const cur = player.err[k]; const target = cur * .3; SL[k].value = clamp(Math.round(((target - base0[k]) / (ERR_MAX[k] * 1.6)) * 100), -100, 100); } player.err = sliderErr(); player.rebuild(); $('pGota').disabled = true; $('pGota').textContent = '💧 Gastado'; SND.pop(); msg('💧 ¡Color casi copiado! Afina tú el resto'); };
$('pOut').onclick = () => { if (!player?.copy) return; player.quitar(); setPal(false); msg('Vuelves a ser Mancha'); };
$('bPal').onclick = () => setPal(!ui.pal.classList.contains('on'));
$('bWh').onclick = () => { if (!G_ON || phase !== 'seek' || myRole === 'critic' || mode === 'seek') return; whistles++; score += 60; SND.whistle(); msg('🎵 +60 · ¡pero te ha oído!'); if (ai) ai.noise = { x: player.x, z: player.z, t: 4 }; noteFx(player.x, player.z); if (net) net.enviar({ t: 'silbo', x: player.x, z: player.z }); };
$('bJump').onclick = () => doJump();
function doJump() { if (G_ON && player && player.y <= player.gnd + .01 && !(myRole === 'critic' && phase === 'hide')) { player.vy = 5.2; SND.pop(); } }
$('bx').onclick = () => { endGame(null, true); };
let notes = []; function noteFx(x, z) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctex(64, 64, g => { g.font = '48px serif'; g.fillText('🎵', 6, 50); }), transparent: true })); s.position.set(x, 1.8, z); s.scale.setScalar(.8); scene.add(s); notes.push({ s, t: 1.5 }); }

function resetWorld() { for (const b of bots) b.dispose(); bots = []; if (player) player.dispose(); if (critic) scene.remove(critic.g); critic = null; for (const r of remotes.values()) r.h.dispose(); remotes.clear(); }
function startGame(m, opts = {}) {
  resetWorld(); mode = m; score = 0; whistles = 0; wrongs = 0; found = 0; gotaUsada = false; $('pGota').disabled = false; $('pGota').textContent = '💧 Cuentagotas'; myRole = opts.role || (m === 'seek' ? 'critic' : 'hider');
  const L = LV[LEVEL]; G_ON = true; show(null); ai = null;
  if (myRole === 'hider') {
    player = new Hider('#ff8fc8'); Object.assign(player, { x: opts.x ?? 0, z: opts.z ?? 7, gnd: 0 }); cam.yaw = 0; phase = 'hide'; tLeft = opts.hide ?? 20;
    if (!net) { critic = { g: mochi('#a77bff', true), x: 0, z: -6.2, y: 0, face: 0, r: .45, susp: 0, state: 'wait', tapT: L.tap, stun: 0, target: null, stuckT: 0, lx: 0, lz: 0 }; scene.add(critic.g); ai = { noise: null }; }
    msg('👆 Toca un objeto que brille para disfrazarte', 3);
  } else {
    player = new Hider('#a77bff'); player.body.clear(); player.body.add(mochi('#a77bff', true)); Object.assign(player, { x: opts.x ?? 0, z: opts.z ?? 7, gnd: 0 }); cam.yaw = 0;
    phase = 'hide'; tLeft = opts.hide ?? 3;
    if (!net) { for (let i = 0; i < L.bots; i++) { const b = new Hider('#9fd0ff'); let tries = 0; while (tries++ < 60) { const p = props[(Math.random() * props.length) | 0]; const a = Math.random() * 6.28, d = rand(1, 2.2); const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d; if (Math.hypot(x - player.x, z - player.z) > 4 && freeAt(x, z, p.r) && !bots.some(o => Math.hypot(o.x - x, o.z - z) < 1.5)) { b.x = x; b.z = z; const target = rand(...L.bsim); const e = randErr(1); const sc = (1 - target / 100) / .55; for (const k in ERR_MAX) e[k] *= clamp(sc, .05, 1); e.pat = p.pat; e.ry = Math.random() * 6.28; b.disfrazar(p, e); b.wobMul = L.bwob; break; } } b.g.userData.hider = b; bots.push(b); } }
    msg('🔍 ¡Los bots se esconden! Busca objetos que no encajen', 3);
  }
  base0 = null; for (const k in SL) SL[k].value = 0; $('pPat').textContent = 'Patrón: liso';
  setPal(false); updCamera(0, player.x, 0, player.z, true);
}
function onTap(cx, cy) {
  if (!G_ON || phase === 'fin') return;
  if (myRole === 'hider') {
    const h = pick(cx, cy, tapTargets()); if (!h) return; disfrazarDe(h.o.userData.prop);
  } else { 
    if (phase !== 'seek') return;
    const cand = props.map(p => p.obj).concat(bots.filter(b => b.vivo).map(b => b.g), [...remotes.values()].filter(r => r.h.vivo && r.h.copy).map(r => r.h.g));
    const h = pick(cx, cy, cand); if (!h) return; const pos = h.o.userData.hider ? h.o.userData.hider : h.o.userData.prop;
    if (Math.hypot(pos.x - player.x, pos.z - player.z) > 7) { msg('Acércate más 👣', 1); return; }
    if (h.o.userData.hider) { const b = h.o.userData.hider; caught(b); if (net && b.remoteId) net.enviar({ t: 'pillada', id: b.remoteId }); }
    else { wrongs++; tLeft = Math.max(0, tLeft - 5); SND.no(); msg('❌ ¡Era ' + art(pos.type) + ' de verdad! −5 s'); wake(); pos.obj.rotation.z = .3; setTimeout(() => pos.obj.rotation.z = 0, 200); if (net) net.enviar({ t: 'toque', ok: 0 }); }
  }
}
function disfrazarDe(p) { if (!p || !player.vivo || phase === 'fin') return; player.disfrazar(p); base0 = Object.assign({}, player.err); for (const k in SL) SL[k].value = 0; $('pPat').textContent = 'Patrón: ' + PATS[player.err.pat]; SND.pop(); msg('✨ ¡Eres ' + art(p.type) + '! Ajusta 🎨 para parecerte más'); setPal(true); }
let nearProp = null;
$('bDisf').onclick = () => disfrazarDe(nearProp);
function caught(b) { b.vivo = false; b.quitar(); b.body.scale.setScalar(1.2); found++; score += 150; SND.ok(); msg('🎉 ¡Pillado! +150'); confetti(b.x, b.z); }
function wake() { owlAwake = 2.5; }
let owlAwake = 0;
let confs = []; function confetti(x, z) { const g = new THREE.BufferGeometry(), n = 60, p = new Float32Array(n * 3), v = []; for (let i = 0; i < n; i++) { p.set([x, 1, z], i * 3); v.push([rand(-3, 3), rand(3, 6), rand(-3, 3)]); } g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const pt = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ff8fc8', size: .15 })); scene.add(pt); confs.push({ pt, v, t: 1.6 }); }

function endGame(win, quit) {
  if (!G_ON) return; G_ON = false; phase = 'fin'; setPal(false); joy.id = null; joyEl.style.display = 'none';
  if (quit) { if (net) { net.salir(); net = null; } resetWorld(); show('menu'); return; }
  let em, ti, tx;
  if (myRole === 'hider') { const sim = player.copy ? player.sim : 0; if (win) { score += 300; em = '🏆'; ti = '¡Sobreviviste!'; } else { em = '😵'; ti = '¡Te pillaron!'; } tx = `Parecido final: ${sim} %<br>Silbidos: ${whistles}<br><b style="font-size:26px">${Math.round(score)} puntos</b>` + (sim < 50 ? '<br>Consejo: usa 🎨 para subir el parecido' : sim >= 85 ? '<br>¡Disfraz de artista!' : ''); }
  else { const tot = net ? remotes.size : bots.length; score += Math.round(tLeft * 3) - wrongs * 20; score = Math.max(0, score); em = win ? '🏆' : '🔍'; ti = win ? '¡Los encontraste a todos!' : `Encontraste ${found} de ${tot}`; tx = `Fallos: ${wrongs}<br><b style="font-size:26px">${score} puntos</b>`; }
  if (win) SND.win(); else SND.no();
  $('rEm').textContent = em; $('rTi').textContent = ti; $('rTx').innerHTML = tx; setTimeout(() => show('res'), 700);
}
$('rOtra').onclick = () => { if (net) { show('onl'); return; } startGame(mode); };
$('rMenu').onclick = () => { if (net) { net.salir(); net = null; } resetWorld(); show('menu'); };
$('bHide').onclick = () => { if (!localStorage.esc8tuto) return tuto(() => startGame('hide')); startGame('hide'); };
$('bSeek').onclick = () => { if (!localStorage.esc8tuto) return tuto(() => startGame('seek')); startGame('seek'); };

// ------------------------------------------------------------ tutorial 3 tarjetas
const TUTO = [['👆✨', 'Toca un objeto', 'Los que brillan se pueden copiar. Te conviertes en algo PARECIDO a ese objeto.'], ['🎨🌈', 'Ajústate', 'Mueve Tono, Claridad, Ancho, Alto y Girar hasta que el PARECIDO llegue arriba. ¡Más parecido = más puntos y menos tiembles!'], ['🔍❌', 'El Crítico toca', 'Toca objetos sospechosos. Si acierta, te pilla. Si falla, pierde 5 s. Quieto es más difícil verte.']];
let tutoI = 0, tutoDone = null;
function tuto(done) { tutoI = 0; tutoDone = done; drawTuto(); show('tuto'); }
function drawTuto() { const t = TUTO[tutoI]; $('tEm').textContent = t[0]; $('tTi').textContent = t[1]; $('tTx').textContent = t[2]; document.querySelectorAll('.dots i').forEach((d, i) => d.classList.toggle('on', i === tutoI)); $('tNext').textContent = tutoI < 2 ? 'Siguiente ▶' : '¡A jugar!'; }
$('tNext').onclick = () => { if (++tutoI < 3) return drawTuto(); localStorage.esc8tuto = 1; if (tutoDone) tutoDone(); else show('menu'); };
$('bTuto').onclick = () => tuto(null);

// ------------------------------------------------------------ IA del Crítico (justa por niveles)
function seen(c, h) { const dx = h.x - c.x, dz = h.z - c.z, d = Math.hypot(dx, dz); if (d > LV[LEVEL].view) return 0; const a = Math.abs(angDiff(Math.atan2(dx, dz), c.face)); if (a > 1.2 && d > 2) return 0; // línea de visión (estanterías tapan)
  for (const k of colliders) { if (k.top < 1.5) continue; for (let t = .15; t < 1; t += .15) { const x = c.x + dx * t, z = c.z + dz * t; if (x > k.x0 && x < k.x1 && z > k.z0 && z < k.z1) return 0; } } return d; }
function aiUpdate(dt) {
  const c = critic, L = LV[LEVEL], p = player; if (!c) return;
  if (c.state === 'wait') { c.face = Math.PI; c.g.position.set(c.x, 0, c.z); c.g.rotation.y = c.face; c.g.userData.lupa.position.set(0, .5, .45); return; }
  c.g.userData.lupa.position.set(.5, .45, .2);
  if (c.stun > 0) { c.stun -= dt; c.g.rotation.z = Math.sin(c.stun * 20) * .1; return; } c.g.rotation.z = 0;
  // sospecha del jugador
  const d = p.vivo ? seen(c, p) : 0;
  if (d) { const s = p.copy ? p.sim / 100 : 0; let rate = p.copy ? L.k * Math.pow(1 - s, 1.6) * (p.moving > .1 ? 3.5 : 1) * (p.wobbling ? 1.8 : 1) / (1 + d / 3) : 4; c.susp += rate * dt; } else c.susp = Math.max(0, c.susp - .08 * dt);
  if (ai.noise) { ai.noise.t -= dt; if (!c.target || c.target.kind !== 'p') c.target = { kind: 'n', x: ai.noise.x + rand(-1.5, 1.5), z: ai.noise.z + rand(-1.5, 1.5) }; if (ai.noise.t <= 0) ai.noise = null; }
  if (c.susp > 1) c.target = { kind: 'p' };
  c.tapT -= dt;
  if (!c.target) { // elige objeto sospechoso cercano o pasea
    if (c.tapT <= 0) { const near = props.filter(q => Math.hypot(q.x - c.x, q.z - c.z) < 8); if (p.copy && Math.hypot(p.x - c.x, p.z - c.z) < 8 && Math.random() < L.blind * (1.6 - p.sim / 100) * 5) c.target = { kind: 'p' }; else if (near.length) c.target = { kind: 'o', p: near[(Math.random() * near.length) | 0] }; c.tapT = L.tap; }
    else if (!c.wp || Math.hypot(c.wp.x - c.x, c.wp.z - c.z) < .8) { let t = 0; do c.wp = { x: rand(-W + 2, W - 2), z: rand(-D + 2, D - 2) }; while (!freeAt(c.wp.x, c.wp.z, .5) && t++ < 20); }
  }
  const tg = c.target ? (c.target.kind === 'p' ? p : c.target.kind === 'o' ? c.target.p : c.target) : c.wp;
  const dx = tg.x - c.x, dz = tg.z - c.z, dd = Math.hypot(dx, dz);
  const reach = c.target && c.target.kind !== 'n' ? 1.1 + (tg.r || .4) : .7;
  if (dd > reach) { const sp = L.sp * (c.target ? 1.15 : .8) * dt; c.face = Math.atan2(dx, dz); const ox = c.x, oz = c.z; moveCircle(c, dx / dd * sp, dz / dd * sp); c.stuckT += dt; if (c.stuckT > 1.2) { if (Math.hypot(c.x - c.lx, c.z - c.lz) < .4) { c.target = null; c.wp = null; c.x += rand(-.3, .3); } c.stuckT = 0; c.lx = c.x; c.lz = c.z; } }
  else if (c.target) { // ¡toca!
    if (c.target.kind === 'p') { if (p.vivo && (Math.hypot(p.x - c.x, p.z - c.z) < 2.2)) { p.vivo = false; c.target = null; msg('😱 ¡TE PILLÉ!', 3); SND.no(); confetti(p.x, p.z); setPal(false); setTimeout(() => endGame(false), 1200); phase = 'fin'; } else { c.target = null; c.susp = .5; } }
    else if (c.target.kind === 'o') { c.stun = 2.5; c.target.p.obj.rotation.z = .3; const o = c.target.p.obj; setTimeout(() => o.rotation.z = 0, 220); msg('El Crítico: «¡Uy! Era ' + art(c.target.p.type) + '» ⏳'); SND.no(); wake(); c.target = null; }
    else c.target = null;
  }
  c.g.position.set(c.x, Math.abs(Math.sin(performance.now() / 110)) * .06, c.z); c.g.rotation.y = c.face;
}

// ------------------------------------------------------------ bucle
let last = performance.now(), lastNet = 0;
function loop(now) {
  requestAnimationFrame(loop); const dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000;
  for (const c of floatCandles) c.position.y += Math.sin(t * 1.3 + c.userData.ph) * .002;
  dust.rotation.y = t * .01;
  owlAwake -= dt; for (const s of [-1, 1]) owl.userData['e' + s].scale.y = owlAwake > 0 ? 1 : .25; owl.rotation.z = Math.sin(t * .8) * .05;
  for (let i = confs.length - 1; i >= 0; i--) { const c = confs[i]; c.t -= dt; const a = c.pt.geometry.attributes.position; for (let k = 0; k < c.v.length; k++) { c.v[k][1] -= 9 * dt; a.array[k * 3] += c.v[k][0] * dt; a.array[k * 3 + 1] += c.v[k][1] * dt; a.array[k * 3 + 2] += c.v[k][2] * dt; } a.needsUpdate = true; if (c.t <= 0) { scene.remove(c.pt); confs.splice(i, 1); } }
  for (let i = notes.length - 1; i >= 0; i--) { const n = notes[i]; n.t -= dt; n.s.position.y += dt; if (n.t <= 0) { scene.remove(n.s); notes.splice(i, 1); } }
  if (msgT > 0) { msgT -= dt; if (msgT <= 0) ui.msg.style.opacity = 0; }
  if (G_ON && player) {
    // fases y reloj
    if (phase !== 'fin' && (!net || net.host)) { tLeft -= dt; if (tLeft <= 0) { if (phase === 'hide') { phase = 'seek'; tLeft = mode === 'seek' ? 110 : 100; if (critic) critic.state = 'hunt'; msg(myRole === 'critic' ? '🔍 ¡A buscar!' : '👀 ¡El Crítico empieza a buscar!'); SND.ok(); if (net) net.enviar({ t: 'fase', fase: 'seek', tiempo: tLeft }); } else { tLeft = 0; if (net) net.enviar({ t: 'fase', fase: 'fin' }); endGame(myRole === 'hider' ? player.vivo : found >= bots.length); } } }
    else if (net && phase !== 'fin') tLeft = Math.max(0, tLeft - dt);
    // jugador
    const canMove = player.vivo && !(myRole === 'critic' && phase === 'hide');
    const iv = canMove ? inputVec() : { x: 0, y: 0, l: 0 };
    const sp = (player.copy ? 3.4 : 4.2) * dt; const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw);
    const ox = player.x, oz = player.z;
    player.gnd = moveCircle(player, (-fx * -iv.y + fz * iv.x) * sp, (-fz * -iv.y - fx * iv.x) * sp, player.copy);
    player.moving = Math.hypot(player.x - ox, player.z - oz) / Math.max(dt, 1e-3) / 4;
    if (iv.l > .1) player.face = Math.atan2(player.x - ox, player.z - oz);
    player.vy -= 14 * dt; player.y += player.vy * dt; if (player.y <= player.gnd) { player.y = player.gnd; player.vy = 0; }
    player.update(dt);
    if (myRole === 'hider' && phase === 'seek' && player.vivo) score += (player.copy ? player.sim / 10 : 0) * dt;
    for (const b of bots) { if (b.vivo) { b.nextWob -= dt * ((b.wobMul || 1) - 1); } b.update(dt); }
    for (const r of remotes.values()) { r.h.x = lerp(r.h.x, r.tx, .25); r.h.z = lerp(r.h.z, r.tz, .25); r.h.y = lerp(r.h.y, r.ty, .25); r.h.update(dt); }
    if (ai) aiUpdate(dt);
    // brillos de objetos copiables cercanos
    let k = 0; if (myRole === 'hider' && player.vivo) for (const p of props) { if (k >= rings.length) break; if (p !== player.copy && Math.hypot(p.x - player.x, p.z - player.z) < 4) { const r = rings[k++]; r.visible = true; r.position.x = p.x; r.position.z = p.z; r.scale.setScalar(p.r * 1.3); } }
    nearProp = null; if (myRole === 'hider' && player.vivo && phase !== 'fin') { let bd = 2.6; for (const p of props) { if (p === player.copy) continue; const d = Math.hypot(p.x - player.x, p.z - player.z) - p.r; if (d < bd) { bd = d; nearProp = p; } } }
    const bd = $('bDisf'); bd.style.display = nearProp && !ui.pal.classList.contains('on') ? '' : 'none'; if (nearProp) bd.textContent = '✨ Disfrazarse de ' + TYPES[nearProp.type].n;
    for (; k < rings.length; k++) rings[k].visible = false; ringMat.opacity = .35 + Math.sin(t * 4) * .2;
    // cámara: mientras el Crítico cuenta (tú eres el Crítico) la cámara mira la sala desde arriba, no se mete en la lupa
    if (myRole === 'critic' && phase === 'hide') { cam.pitch = .9; }
    updCamera(dt, player.x, player.y, player.z);
    { const near = camera.position.distanceTo(player.g.position) < 2.6; player.g.traverse(o => { if (o.material && o.material.opacity !== undefined) { o.material.transparent = near || o.material.transparent; o.material.opacity = near ? .35 : 1; } }); }
    // HUD
    const s = Math.ceil(tLeft); ui.tim.textContent = (phase === 'hide' ? (myRole === 'critic' ? '🙈 ' : '⏳ ') : '⏱ ') + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    if (myRole === 'hider') { const v = player.copy ? player.sim : 0; ui.sim.textContent = player.copy ? `Parecido ${v} %` : 'Toca un objeto ✨'; ui.bar.style.width = v + '%'; ui.bar.style.background = v >= 85 ? '#9ff5c0' : v >= 60 ? '#ffe38a' : '#ffb3b3'; }
    else { const tot = net ? remotes.size : bots.length; ui.sim.textContent = `Pillados ${found}/${tot}`; ui.bar.style.width = (tot ? found / tot * 100 : 0) + '%'; if (!net && found >= tot && phase === 'seek') endGame(true); }
    ui.pts.textContent = Math.round(score) + ' pts';
    $('bWh').style.display = myRole === 'hider' ? '' : 'none';
    if (net && now - lastNet > 100) { lastNet = now; netSend(); }
  } else { // menú: cámara paseando por la biblioteca
    cam.yaw = t * .08; cam.pitch = .45; cam.dist = 7; updCamera(dt, 0, 0, 2); cam.dist = 6; for (const r of rings) r.visible = false;
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(loop);

// ------------------------------------------------------------ ONLINE (servidor Cloudflare; gris si no hay URL)
comprobarOnline().then(ok => { const b = $('bOnline'); b.disabled = !ok; b.textContent = ok ? '🌐 Sala online' : '🌐 Online · pronto'; });
$('bOnline').onclick = () => { show('onl'); $('oList').style.display = 'none'; $('oEmp').style.display = 'none'; };
$('oSalir').onclick = () => { if (net) { net.salir(); net = null; } show('menu'); };
function lobby() { $('oList').style.display = ''; $('oList').innerHTML = `Sala <b>${net.code}</b> · ${net.jugadores().map(j => j.nombre).join(', ')}`; $('oEmp').style.display = net.host && net.jugadores().length >= 2 ? '' : 'none'; }
async function entrar(code, crear) {
  net = new SalaOnline(); const nombre = 'Mancha' + ((Math.random() * 90 + 10) | 0); let ronda = 0;
  net.on.peers = lobby; net.on.host = lobby;
  net.on.ronda = d => empezarRonda(d);
  net.on.fase = d => { if (d.fase === 'seek') { phase = 'seek'; tLeft = d.tiempo; msg('👀 ¡A buscar!'); } else endGame(myRole === 'hider' ? player.vivo : found >= remotes.size); };
  net.on.st = (d, from) => { if (myRole === 'hider' && from !== net.criticoId) { /* también vemos a los otros escondidos */ } let r = remotes.get(from); if (!r) { if (from === net.criticoId) return critMsg(d); const h = new Hider('#9fd0ff'); h.remoteId = from; h.g.userData.hider = h; r = { h, o: -1, key: '' }; remotes.set(from, r); } r.tx = d.x; r.ty = d.y; r.tz = d.z; r.h.vivo = d.v; const key = d.o + '|' + (d.e || []).join(','); if (key !== r.key) { r.key = key; if (d.o >= 0) { const e = { h: d.e[0], l: d.e[1], s: d.e[2], w: d.e[3], a: d.e[4], r: d.e[5], pat: d.e[6], ry: d.e[7] }; r.h.disfrazar(props[d.o], e); } else r.h.quitar(); } if (d.w) r.h.wob = .55; };
  net.on.cr = (d, from) => critMsg(d);
  net.on.pillada = d => { if (d.id === net.id && player.vivo) { player.vivo = false; msg('😱 ¡TE PILLARON!', 3); SND.no(); setPal(false); } const r = remotes.get(d.id); if (r) { r.h.vivo = false; r.h.quitar(); } };
  net.on.toque = () => { if (myRole === 'hider') msg('El Crítico ha fallado ⏳', 1.2); };
  net.on.silbo = d => { noteFx(d.x, d.z); };
  net.on.cerrada = () => { msg('Se cortó la sala'); };
  try { await net.conectar(code, nombre, crear); lobby(); } catch (e) { $('oTx').textContent = 'No se pudo entrar (' + e.message + ')'; net = null; }
}
function critMsg(d) { if (!critic) { critic = { g: mochi('#a77bff', true), x: d.x, z: d.z }; scene.add(critic.g); } critic.g.position.set(d.x, d.y, d.z); critic.g.rotation.y = d.yaw; }
function empezarRonda(d) { net.criticoId = d.critico; const yo = d.critico === net.id ? 'critic' : 'hider'; const i = d.ids.indexOf(net.id); startGame(yo === 'critic' ? 'seek' : 'hide', { role: yo, x: d.salida[i][0], z: d.salida[i][1], hide: 20 }); }
$('oCrear').onclick = () => entrar(SalaOnline.codigo(), true);
$('oUnir').onclick = () => { const c = $('oCode').value.trim().toUpperCase(); if (c.length === 4) entrar(c, false); };
let rondaN = 0;
$('oEmp').onclick = () => { const js = net.jugadores(); const ids = js.map(j => j.id); const critico = ids[rondaN++ % ids.length]; const salida = ids.map((_, i) => [-6 + i * 2.4, 7]); const d = { t: 'ronda', n: rondaN, critico, ids, salida }; net.enviar(d); empezarRonda(d); };
function netSend() { if (!player) return; if (myRole === 'critic') net.enviar({ t: 'cr', x: player.x, y: player.y, z: player.z, yaw: player.face }); else { const e = player.err; net.enviar({ t: 'st', x: player.x, y: player.y, z: player.z, o: player.copy ? player.copy.id : -1, e: player.copy ? [e.h, e.l, e.s, e.w, e.a, e.r, e.pat, e.ry].map(v => +(+v).toFixed(3)) : null, w: player.wobbling ? 1 : 0, v: player.vivo }); } }
// hooks de prueba
window.__esc = { camera, remotesList: () => [...remotes.values()].map(r => r.h), get player() { return player; }, get critic() { return critic; }, get bots() { return bots; }, props, startGame, onTap, cam, get phase() { return phase; }, set tLeft(v) { tLeft = v; }, get tLeft() { return tLeft; }, get score() { return score; }, info: () => renderer.info.render, setLevel: l => LEVEL = l, endGame, get net() { return net; } };
