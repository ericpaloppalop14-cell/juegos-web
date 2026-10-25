// ======================================================================
//  MOCHI RACERS v26 · decorado «nivel personaje» para TODOS los circuitos
//  Árboles, casas, edificios, farolas, gradas con público y monumentos con geometría redondeada,
//  texturas por código, caritas con personalidad y animación en GPU. Cada tipo de objeto es UNA
//  malla instanciada (geometría fusionada con color por vértice) → menos draw calls que antes.
// ======================================================================
import * as THREE from 'three';
import { toon, mesh, outline } from './gfx.js';
import { mergeVC, animMat, TIME, bodyGeo, faceGeo, armsGeo, pomGeo, hatGeo } from './deco.js';
const V3 = THREE.Vector3, C = c => new THREE.Color(c);
const M = (x, y, z, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new V3(sx, sy, sz));
const GC = {}; const geo = (k, f) => GC[k] || (GC[k] = f());
const SPH = new THREE.SphereGeometry(1, 12, 9), SPHl = new THREE.SphereGeometry(1, 6, 5), ICO = new THREE.IcosahedronGeometry(1, 1), CYL = new THREE.CylinderGeometry(1, 1, 1, 10), CONE = new THREE.ConeGeometry(1, 1, 12), TOR = new THREE.TorusGeometry(1, 0.25, 6, 16), SMILE = new THREE.TorusGeometry(1, 0.22, 4, 8, Math.PI);
// caja redondeada (como los karts): se proyecta cada vértice sobre la caja interior + radio
export function rbox(w, h, d, r, s = 4) { const g = new THREE.BoxGeometry(w, h, d, s, s, s), p = g.attributes.position, hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r, v = new V3(), q = new V3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); q.set(Math.max(-hw, Math.min(hw, v.x)), Math.max(-hh, Math.min(hh, v.y)), Math.max(-hd, Math.min(hd, v.z))); v.sub(q); if (v.lengthSq() > 0) v.setLength(r); p.setXYZ(i, q.x + v.x, q.y + v.y, q.z + v.z); }
  g.computeVertexNormals(); return g; }
const RB = (w, h, d, r) => geo(`rb${w}_${h}_${d}_${r}`, () => rbox(w, h, d, r));
// carita kawaii (ojos con brillo, colorete y sonrisa) en el plano z, mirando a +z
function faceP(x, y, z, s, o = {}) { const P = [];
  for (const sd of [-1, 1]) { P.push({ g: SPHl, m: M(x + sd * 0.34 * s, y, z, 0.12 * s, (o.sleepy ? 0.05 : 0.16) * s, 0.07 * s), c: '#2e1a36' }); if (!o.sleepy) P.push({ g: SPHl, m: M(x + sd * 0.34 * s - 0.04 * s, y + 0.06 * s, z + 0.06 * s, 0.045 * s), c: '#ffffff' });
    P.push({ g: SPHl, m: M(x + sd * 0.58 * s, y - 0.17 * s, z - 0.02 * s, 0.15 * s, 0.075 * s, 0.05 * s), c: '#ff8fb5' }); }
  P.push({ g: SMILE, m: M(x, y - 0.12 * s, z + 0.01, 0.14 * s, 0.14 * s, 0.14 * s, 0, 0, Math.PI), c: '#5a2a40' }); return P; }
// lathe con color por vértice según la altura (f(y01) → color)
function latheVC(pts, seg, colFn) { const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg); const p = g.attributes.position, c = []; let y0 = 1e9, y1 = -1e9; for (let i = 0; i < p.count; i++) { y0 = Math.min(y0, p.getY(i)); y1 = Math.max(y1, p.getY(i)); }
  for (let i = 0; i < p.count; i++) { const cc = C(colFn((p.getY(i) - y0) / (y1 - y0 || 1), Math.atan2(p.getZ(i), p.getX(i)))); c.push(cc.r, cc.g, cc.b); } g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); return g; }
function withVC(g, colFn) { const p = g.attributes.position, c = []; for (let i = 0; i < p.count; i++) { const cc = C(colFn(p.getX(i), p.getY(i), p.getZ(i))); c.push(cc.r, cc.g, cc.b); } g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); return g; }
// fusiona piezas; las que ya traen color por vértice lo conservan
function mergeAny(parts) { const plain = [], vc = []; for (const pt of parts) (pt.g.attributes.color ? vc : plain).push(pt);
  const gs = [mergeVC(plain)]; for (const pt of vc) { const g = (pt.g.index ? pt.g.toNonIndexed() : pt.g.clone()); g.applyMatrix4(pt.m); gs.push(g); }
  let n = 0; gs.forEach(g => n += g.attributes.position.count); const P = new Float32Array(n * 3), N = new Float32Array(n * 3), Cc = new Float32Array(n * 3); let o = 0;
  for (const g of gs) { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); Cc.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3)); out.setAttribute('color', new THREE.BufferAttribute(Cc, 3)); out.computeBoundingSphere(); return out; }

// ---------- catálogo de objetos (todo en espacio local, base en y=0, cara hacia +z) ----------
const W = '#ffffff', L = '#d9d3e6';
const PROPS = {
  lolliTree: () => mergeAny([{ g: CYL, m: M(0, 3, 0, 0.22, 6, 0.22), c: W }, ...[0, 1, 2, 3, 4].map(k => ({ g: TOR, m: M(0, 0.8 + k * 1.15, 0, 0.24, 0.24, 0.24, Math.PI / 2), c: '#ff7fb6' })),
    { g: withVC(new THREE.CylinderGeometry(2, 2, 0.55, 40, 1), (x, y, z) => { const a = Math.atan2(z, x), r = Math.hypot(x, z); return Math.sin(a * 2 + r * 3.2) > 0 ? W : L; }), m: M(0, 7.4, 0, 1, 1, 1, Math.PI / 2) },
    { g: TOR, m: M(0, 7.4, 0, 2.05, 2.05, 1.6), c: W }, ...faceP(0, 7.45, 0.3, 1.5), { g: SPH, m: M(-0.55, 5.55, 0.15, 0.45, 0.3, 0.25, 0, 0, 0.5), c: '#ff5f8f' }, { g: SPH, m: M(0.55, 5.55, 0.15, 0.45, 0.3, 0.25, 0, 0, -0.5), c: '#ff5f8f' }, { g: SPHl, m: M(0, 5.55, 0.2, 0.2), c: '#ff3f7f' }]),
  gumHouse: () => mergeAny([{ g: latheVC([[0.01, 0], [3.2, 0], [3.4, 0.4], [3.3, 2.6], [2.6, 4.4], [1.4, 5.4], [0.01, 5.7]], 28, (y) => y > 0.92 ? '#ffffff' : W), m: M(0, 0, 0) },
    ...Array.from({ length: 18 }, (_, k) => ({ g: SPHl, m: M(Math.cos(k * 2.4) * (2.6 - (k % 4) * 0.3), 1 + (k % 6) * 0.7, Math.sin(k * 2.4) * (2.6 - (k % 4) * 0.3), 0.14, 0.14, 0.14), c: ['#fff6a0', '#ffffff', '#a0f0ff', '#ffb0d8'][k % 4] })),
    { g: RB(1.5, 2.2, 0.5, 0.25), m: M(0, 1.1, 3.15), c: '#9a5a3a' }, { g: SPHl, m: M(0.45, 1.1, 3.45, 0.1), c: '#ffd24a' },
    ...[-1, 1].flatMap(sd => [{ g: CYL, m: M(sd * 1.55, 2.9, 2.75, 0.55, 0.2, 0.55, Math.PI / 2 - 0.3), c: '#fff3b0' }, { g: TOR, m: M(sd * 1.55, 2.9, 2.78, 0.6, 0.6, 0.6, -0.3), c: '#ffffff' }, { g: SPHl, m: M(sd * 1.55, 2.85, 2.95, 0.18, 0.24, 0.1), c: '#2e1a36' }]),
    { g: SMILE, m: M(0, 2.35, 3.05, 0.4, 0.4, 0.4, -0.3, 0, Math.PI), c: '#5a2a40' }, { g: RB(0.8, 1.6, 0.8, 0.2), m: M(1.6, 5.2, -0.6), c: '#ff9ec7' }, { g: SPHl, m: M(1.6, 6.3, -0.6, 0.35), c: '#ffffff' }]),
  cottonTree: () => mergeAny([{ g: withVC(new THREE.CylinderGeometry(0.35, 0.55, 5, 10, 5), (x, y, z) => Math.sin(Math.atan2(z, x) * 3 + y * 2) > 0 ? '#fff2e0' : '#ffc4d8'), m: M(0, 2.5, 0) },
    ...[[0, 6.2, 0, 2.6], [1.8, 5.4, 0.5, 1.8], [-1.8, 5.5, 0.3, 1.9], [0.6, 7.6, -0.4, 1.8], [-0.8, 5.0, 1.4, 1.5], [0.9, 5.0, -1.5, 1.6]].map(([x, y, z, r]) => ({ g: ICO, m: M(x, y, z, r, r * 0.9, r), c: W })), ...faceP(0, 6.0, 2.55, 1.3)]),
  cupcake: () => mergeAny([{ g: latheVC([[0.01, 0], [1.6, 0], [2.1, 2.0], [0.01, 2.0]], 24, () => '#ffe3c0'), m: M(0, 0, 0) }, ...Array.from({ length: 8 }, (_, k) => ({ g: CYL, m: M(Math.cos(k / 8 * 6.283) * 1.88, 1, Math.sin(k / 8 * 6.283) * 1.88, 0.09, 2, 0.09, 0, -k / 8 * 6.283, -0.24), c: '#f2c08a' })),
    ...[0, 1, 2].map(k => ({ g: TOR, m: M(0, 2.2 + k * 0.62, 0, 1.75 - k * 0.5, 1.75 - k * 0.5, 2.4 - k * 0.5, Math.PI / 2), c: W })), { g: SPH, m: M(0, 4.05, 0, 0.5), c: '#ff3f6f' }, { g: CYL, m: M(0.15, 4.6, 0, 0.04, 0.6, 0.04, 0, 0, -0.4), c: '#5fb04a' },
    ...faceP(0, 1.15, 1.95, 1.1)]),
  sunflower: () => mergeAny([{ g: CYL, m: M(0, 3.5, 0, 0.22, 7, 0.22), c: '#5fb04a' }, ...[-1, 1].map(sd => ({ g: SPH, m: M(sd * 0.9, 3 + sd * 0.4, 0, 0.9, 0.18, 0.45, 0, 0, sd * 0.35), c: '#6fc04e' })),
    ...Array.from({ length: 16 }, (_, k) => { const a = k / 16 * 6.283; return { g: SPH, m: M(Math.cos(a) * 2.05, 7.4 + Math.sin(a) * 2.05, -0.05 - (k % 2) * 0.12, 0.38, 0.95, 0.16, 0, 0, a - Math.PI / 2), c: k % 2 ? '#ffcf2a' : '#ffb81a' }; }),
    { g: withVC(new THREE.CylinderGeometry(1.45, 1.45, 0.45, 32, 1), (x, y, z) => (Math.floor(x * 3.3) + Math.floor(z * 3.3)) % 2 ? '#8a5a2a' : '#6a3f1a'), m: M(0, 7.4, 0.1, 1, 1, 1, Math.PI / 2) }, ...faceP(0, 7.5, 0.38, 1.6)]),
  roundTree: () => mergeAny([{ g: withVC(new THREE.CylinderGeometry(0.45, 0.75, 4.5, 12, 6), (x, y) => Math.sin(y * 5) > 0.6 ? '#8a5a3a' : '#a0704a'), m: M(0, 2.25, 0) }, ...[0, 1, 2].map(k => ({ g: SPH, m: M(Math.cos(k * 2.1) * 0.7, 0.15, Math.sin(k * 2.1) * 0.7, 0.4, 0.25, 0.6, 0, k * 2.1, 0), c: '#8a5a3a' })),
    ...[[0, 6.4, 0, 3.0], [2.0, 5.6, 0.4, 2.0], [-2.0, 5.7, 0.2, 2.1], [0.4, 8.0, -0.3, 2.0]].map(([x, y, z, r]) => ({ g: ICO, m: M(x, y, z, r, r * 0.92, r), c: W })),
    ...Array.from({ length: 7 }, (_, k) => ({ g: SPHl, m: M(Math.cos(k * 1.7) * 2.4, 5.3 + (k % 3) * 1.1, Math.sin(k * 1.7) * 2.4 + 0.6, 0.3), c: '#ff5f6f' })), ...faceP(0, 6.0, 2.95, 1.7)]),
  beehive: () => mergeAny([{ g: latheVC([[0.01, 0], [2.0, 0], [2.4, 0.8], [2.5, 1.6], [2.3, 2.4], [1.9, 3.2], [1.3, 3.9], [0.6, 4.4], [0.01, 4.6]], 28, y => (Math.floor(y * 6) % 2) ? '#ffcf4a' : '#f5b62a'), m: M(0, 0, 0) },
    { g: SPH, m: M(0, 1.0, 2.15, 0.6, 0.7, 0.35), c: '#4a2a1a' }, ...faceP(0, 2.6, 2.3, 1.1), { g: CYL, m: M(0, 4.8, 0, 0.1, 0.6, 0.1), c: '#8a5a3a' }]),
  snowPine: () => mergeAny([{ g: CYL, m: M(0, 0.8, 0, 0.45, 1.6, 0.45), c: '#9a6a4a' }, ...[0, 1, 2].flatMap(k => [{ g: CONE, m: M(0, 2.6 + k * 1.9, 0, 3 - k * 0.75, 3.2, 3 - k * 0.75), c: '#5fb08a' },
      ...Array.from({ length: 8 }, (_, j) => ({ g: SPHl, m: M(Math.cos(j * 0.785) * (2.6 - k * 0.72), 1.2 + k * 1.9, Math.sin(j * 0.785) * (2.6 - k * 0.72), 0.55, 0.32, 0.55), c: '#ffffff' })), { g: CONE, m: M(0, 3.4 + k * 1.9, 0, (3 - k * 0.75) * 0.55, 1.6, (3 - k * 0.75) * 0.55), c: '#ffffff' }]),
    { g: new THREE.OctahedronGeometry(0.5, 0), m: M(0, 8.6, 0, 1, 1.3, 0.5), c: '#ffe066' }, ...faceP(0, 2.4, 2.25, 1.0)]),
  igloo: () => mergeAny([{ g: withVC(new THREE.SphereGeometry(3.2, 28, 14, 0, 6.283, 0, Math.PI / 2), (x, y, z) => { const row = Math.floor(y / 0.7), a = Math.atan2(z, x) * 3.2 + row * 0.5; return (Math.abs(y % 0.7) < 0.07 || Math.abs((a % 1 + 1) % 1) < 0.04) ? '#cfe4ff' : '#ffffff'; }), m: M(0, 0, 0) },
    { g: new THREE.CylinderGeometry(1.1, 1.1, 2, 16, 1, false, 0, Math.PI), m: M(0, 0.0, 3.0, 1, 1, 1, Math.PI / 2, 0, 0), c: '#f4f9ff' }, { g: SPH, m: M(0, 0.6, 4.0, 0.75, 0.9, 0.1), c: '#3a4a7a' }, ...faceP(0, 1.9, 2.75, 1.2)]),
  snowman: () => mergeAny([{ g: SPH, m: M(0, 1.3, 0, 1.4), c: W }, { g: SPH, m: M(0, 3.1, 0, 1.0), c: W }, { g: SPH, m: M(0, 4.45, 0, 0.75), c: W }, { g: TOR, m: M(0, 3.85, 0, 0.75, 0.75, 0.9, Math.PI / 2), c: '#ff5f8f' }, { g: RB(0.35, 1.0, 0.18, 0.08), m: M(0.45, 3.4, 0.75, 1, 1, 1, 0.2, 0, -0.3), c: '#ff5f8f' },
    { g: CONE, m: M(0, 4.4, 0.9, 0.12, 0.6, 0.12, Math.PI / 2), c: '#ff9a3a' }, ...faceP(0, 4.6, 0.7, 0.75), ...[0, 1, 2].map(k => ({ g: SPHl, m: M(0, 2.7 + k * 0.4, 0.98 - k * 0.04, 0.09), c: '#2e1a36' })),
    { g: CYL, m: M(0, 5.25, 0, 0.6, 0.12, 0.6), c: '#4a3a7a' }, { g: CYL, m: M(0, 5.65, 0, 0.42, 0.75, 0.42), c: '#4a3a7a' }, ...[-1, 1].map(sd => ({ g: CYL, m: M(sd * 1.5, 3.4, 0, 0.06, 1.6, 0.06, 0, 0, sd * 0.9), c: '#8a5a3a' }))]),
  iceTree: () => mergeAny([{ g: withVC(new THREE.ConeGeometry(1.3, 5, 18, 8), (x, y, z) => ((Math.floor((y + Math.atan2(z, x)) * 2.4) + Math.floor((y - Math.atan2(z, x)) * 2.4)) % 2) ? '#e8b47a' : '#d49a5a'), m: M(0, 2.5, 0, 1, 1, 1, Math.PI) },
    { g: ICO, m: M(0, 5.6, 0, 1.75, 1.55, 1.75), c: W }, { g: ICO, m: M(0, 7.4, 0, 1.4, 1.25, 1.4), c: W }, ...Array.from({ length: 6 }, (_, k) => ({ g: SPHl, m: M(Math.cos(k) * 1.55, 4.75, Math.sin(k) * 1.55, 0.35, 0.55, 0.35), c: W })),
    { g: SPH, m: M(0, 8.9, 0, 0.45), c: '#ff3f6f' }, ...faceP(0, 5.6, 1.72, 1.1)]),
  neonLamp: () => mergeAny([{ g: RB(1.4, 0.5, 1.4, 0.2), m: M(0, 0.25, 0), c: '#3a2f70' }, { g: CYL, m: M(0, 4, 0, 0.18, 7.5, 0.18), c: '#5a4aa8' }, { g: TOR, m: M(0.9, 7.7, 0, 0.9, 0.9, 0.9, 0, 0, 0), c: '#5a4aa8' }, { g: RB(1.3, 0.5, 1.0, 0.22), m: M(1.8, 7.6, 0), c: '#2a2050' }]),
  neonBulb: () => mergeAny([{ g: SPH, m: M(1.8, 7.2, 0, 0.55, 0.4, 0.45), c: W }]),
  tower: () => mergeAny([{ g: RB(6, 14, 5, 1.0), m: M(0, 7, 0), c: '#2c2458' }, { g: RB(6.6, 0.8, 5.6, 0.35), m: M(0, 14.2, 0), c: '#3e3478' }, { g: CYL, m: M(1.5, 16.5, 0, 0.12, 4, 0.12), c: '#9a8ad8' }, { g: RB(3.2, 2.4, 0.4, 0.3), m: M(0, 11.6, 2.55), c: '#191338' }]),
  towerLit: () => mergeAny([...Array.from({ length: 4 * 3 }, (_, k) => ({ g: RB(0.9, 1.1, 0.2, 0.12), m: M(-1.8 + (k % 4) * 1.2, 2.2 + Math.floor(k / 4) * 2.4, 2.55), c: ['#ffe066', '#5ff5ff', '#ff8fe0', '#ffffff'][(k * 7) % 4] })), { g: SPHl, m: M(1.5, 18.6, 0, 0.35), c: '#ff5f8f' },
    ...faceP(0, 11.7, 2.8, 1.6)]),
  planet: () => mergeAny([{ g: withVC(new THREE.SphereGeometry(5, 32, 20), (x, y) => Math.sin(y * 1.4) > 0.3 ? W : L), m: M(0, 0, 0) }, { g: new THREE.TorusGeometry(8, 0.8, 8, 48), m: M(0, 0, 0, 1, 1, 0.25, Math.PI / 2 - 0.35), c: '#fff3c4' }, ...faceP(0, 0.5, 4.95, 3.2)]),
  donut: () => mergeAny([{ g: TOR, m: M(0, 0, 0, 2.2, 2.2, 2.2, Math.PI / 2), c: '#f2c08a' }, { g: withVC(new THREE.TorusGeometry(2.2, 0.6, 10, 28), () => W), m: M(0, 0.18, 0, 1, 1, 0.75, Math.PI / 2) }, ...Array.from({ length: 16 }, (_, k) => ({ g: CYL, m: M(Math.cos(k * 0.4) * 2.2, 0.7, Math.sin(k * 0.4) * 2.2, 0.06, 0.35, 0.06, 1.5, k, 0), c: ['#ff5f8f', '#5ff5ff', '#ffe066', '#9dff7a'][k % 4] }))]),
  crystal: () => mergeAny([...[[0, 0, 0, 1, 3.2], [1.1, 0, 0.4, 0.6, 2], [-0.9, 0, 0.5, 0.7, 2.3], [0.2, 0, -1, 0.5, 1.6]].map(([x, y, z, r, h], k) => ({ g: new THREE.OctahedronGeometry(1, 0), m: M(x, h * 0.5, z, r, h * 0.7, r, (k - 1.5) * 0.2, k, (k - 1.5) * 0.25), c: W }))]),
};
const geoP = k => geo('p_' + k, PROPS[k]);
// conjunto por tema: [tipo, cantidad, minD, maxD, paleta, escala, anim]
const SETS = {
  candy: [['lolliTree', 55, 3, 40, ['#ff8fc0', '#7ee3c4', '#b9a2f7', '#ffd36b'], [0.8, 1.3], { jump: 0, sq: 0, sway: 0.035, spd: 1.4 }], ['gumHouse', 22, 12, 70, ['#ff9ec7', '#7ee3c4', '#b9a2f7', '#ffd98a'], [1, 1.5], { jump: 0, sq: 0.5, spd: 1.3 }],
    ['cottonTree', 40, 8, 120, ['#ffc4e1', '#d8fbef', '#ece4ff', '#ffe3c4'], [0.9, 1.6], { jump: 0, sq: 0, sway: 0.03, spd: 1.1 }], ['cupcake', 26, 6, 80, ['#ffd1ea', '#ffffff', '#d8fbef', '#fff1c0'], [0.9, 1.4], { jump: 0.25, sq: 0.7, spd: 2.2 }]],
  sunflower: [['sunflower', 120, 2, 70, ['#ffffff'], [0.6, 1.2], { jump: 0, sq: 0, sway: 0.04, spin: 0.25, spd: 1.2 }], ['roundTree', 55, 15, 140, ['#8fd46a', '#a6e07c', '#7cc85a'], [1, 1.8], { jump: 0, sq: 0, sway: 0.025, spd: 1.0 }], ['beehive', 16, 10, 60, ['#ffffff'], [1, 1.4], { jump: 0.1, sq: 0.6, spd: 2.5 }]],
  ice: [['iceTree', 50, 3, 60, ['#ffc4e1', '#fff3c4', '#c4f0ff', '#d8fbef', '#e4d4ff'], [0.8, 1.6], { jump: 0, sq: 0, sway: 0.03, spd: 1.3 }], ['snowPine', 70, 6, 130, ['#ffffff'], [0.8, 1.8], { jump: 0, sq: 0, sway: 0.02, spd: 0.9 }], ['igloo', 14, 10, 80, ['#ffffff'], [0.9, 1.3], { jump: 0, sq: 0.35, spd: 1.2 }], ['snowman', 26, 5, 60, ['#ffffff'], [0.9, 1.3], { jump: 0.35, sq: 0.8, spd: 2.6 }]],
  storm: [['neonLamp', 70, 3, 60, ['#ffffff'], [0.7, 1.2], { jump: 0, sq: 0 }], ['tower', 34, 10, 90, ['#ffffff'], [0.9, 1.5], { jump: 0, sq: 0.15, spd: 3.2 }], ['tower', 30, 45, 220, ['#ffffff'], [2, 3.2], { jump: 0, sq: 0.05, spd: 1.5 }]],
  space: [['planet', 22, 30, 200, ['#ff9ec7', '#7ee3c4', '#b9a2f7', '#ffd36b', '#8fe3f0', '#ffb36b'], [0.8, 2.6], { jump: 0, sq: 0, bob: 1.5, spin: 0.6, spd: 0.4 }], ['donut', 46, 6, 90, ['#ff8fd0', '#7ff5ff', '#ffe066', '#b9a2f7'], [0.8, 2.2], { jump: 0, sq: 0, bob: 1.0, spin: 2.2, spd: 0.6 }], ['crystal', 50, 5, 120, ['#c9b8ff', '#9ff0ff', '#ffb8ea'], [0.8, 2.2], { jump: 0, sq: 0, bob: 0.6, spd: 0.8 }]],
};
const GLOW = { neonLamp: 'neonBulb', tower: 'towerLit' }; // piezas que brillan (material emisivo aparte)

export function addProps26(T, Q, rnd, placeOut) {
  const set = SETS[T.theme]; if (!set) return false; const lod = Q.lod ?? (Q.hi ? 1 : 0.6), k = T.open ? 3 : 1;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (const [type, n0, minD, maxD, pal, [s0, s1], anim] of set) {
    const n = Math.max(4, Math.round(n0 * lod * k)), items = [];
    for (let i = 0; i < n; i++) { const p = placeOut(T, minD + (type === 'planet' ? 0 : 2), maxD); if (!p) continue; const Mn = T.monu; if (Mn && !Mn.none && Math.hypot(p.x - Mn.x, p.z - Mn.z) < Mn.s * 0.9 + 8 * s1) continue; if (T.theme === 'space') p.y += type === 'planet' ? 20 + rnd() * 40 : rnd() * 12; const s = s0 + rnd() * (s1 - s0);
      // que mire hacia la pista (la carita se ve al pasar)
      let best = 1e18, bs = null; for (let j = 0; j < T.N; j += 6) { const sj = T.S[j], d = (sj.p.x - p.x) ** 2 + (sj.p.z - p.z) ** 2; if (d < best) { best = d; bs = sj; } }
      const yaw = bs ? Math.atan2(bs.p.x - p.x, bs.p.z - p.z) + (rnd() - 0.5) * 0.5 : rnd() * 6.28; items.push({ p, s, yaw, c: pal[Math.floor(rnd() * pal.length)], ph: rnd() * 6.28, amp: 0.7 + rnd() * 0.6 }); }
    if (!items.length) continue;
    const mk = (g, mat) => { const gg = g.clone(); const ph = new Float32Array(items.length), am = new Float32Array(items.length); items.forEach((it, i) => { ph[i] = it.ph; am[i] = it.amp; });
      gg.setAttribute('aPh', new THREE.InstancedBufferAttribute(ph, 1)); gg.setAttribute('aAmp', new THREE.InstancedBufferAttribute(am, 1)); const im = new THREE.InstancedMesh(gg, mat, items.length);
      items.forEach((it, i) => { q.setFromAxisAngle(new V3(0, 1, 0), it.yaw); m4.compose(it.p, q, new V3(it.s, it.s, it.s)); im.setMatrixAt(i, m4); im.setColorAt(i, C(it.c)); }); im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); im.castShadow = false; im.userData.p26 = type; T.group.add(im); return im; };
    mk(geoP(type), animMat('#ffffff', { vc: true, rim: 0.45 }, anim));
    if (GLOW[type]) mk(geoP(GLOW[type]), animMat('#ffffff', { vc: true, rim: 0, emissive: '#ffffff', ei: 0.75 }, anim)).instanceColor.array.fill(1);
  }
  T.anims.push(t => { TIME.value = t; });
  return true;
}

// ---------- gradas de salida con público instanciado (bracitos que saludan, pompones, sombreros) ----------
export function stands26(T, Q, off) {
  const { S, N, cup } = T; const per = Q.hi ? 27 : 18, cols = ['#ff9cc8', '#7ee3c4', '#b9a2f7', '#ffb36b', '#8fe3f0', '#ffd98a'];
  const standG = mergeAny([...[0, 1, 2].map(r => ({ g: RB(27, 1.2 + r * 1.2, 2.8, 0.35), m: M(0, (1.2 + r * 1.2) / 2, r * 2.8), c: r % 2 ? cup.curbA : '#fff4fa' })),
    ...[0, 1, 2].map(r => ({ g: RB(27.2, 0.18, 0.3, 0.08), m: M(0, 1.2 + r * 1.2 + 0.05, r * 2.8 - 1.3), c: '#ffffff' })),
    ...[-13.6, 13.6].flatMap(x => [{ g: RB(0.6, 9.5, 0.6, 0.25), m: M(x, 4.75, 7.2), c: '#ffffff' }, { g: RB(0.6, 4.6, 8.4, 0.25), m: M(x, 2.3, 2.8), c: '#ffffff' }, { g: SPH, m: M(x, 9.8, 7.2, 0.45), c: cup.curbB === '#ffffff' ? cup.curbA : cup.curbB }]),
    { g: RB(28.4, 0.45, 10.6, 0.2), m: M(0, 9.3, 3.2, 1, 1, 1, -0.12), c: cup.curbA }, ...Array.from({ length: 15 }, (_, k) => ({ g: new THREE.CylinderGeometry(0.95, 0.95, 0.4, 14, 1, false, 0, Math.PI), m: M(-13.3 + k * 1.9, 8.75, -1.95, 1, 1, 1, Math.PI / 2, 0, Math.PI / 2), c: k % 2 ? cup.curbA : '#ffffff' })),
    { g: RB(27, 1.3, 0.3, 0.15), m: M(0, 0.65, -1.5), c: cup.curbB === '#ffffff' ? '#fff4fa' : cup.curbB }]);
  const stands = [], fans = [];
  for (const [i0, sd] of [[N - 22, 1], [N - 22, -1], [Math.round(N * 0.5), 1]]) { const s = S[i0], c0 = off(s, sd * (s.wall + 6)); if (T.inShortcut(c0.x, c0.z) != null) continue;
    const yaw = Math.atan2(s.fl.x, s.fl.z) + (sd > 0 ? -Math.PI / 2 : Math.PI / 2); const base = new THREE.Matrix4().compose(off(s, sd * (s.wall + 7), 0), new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), yaw), new V3(1, 1, 1)); stands.push(base);
    for (let k = 0; k < per; k++) { const r = k % 3, col = Math.floor(k / 3), nc = Math.ceil(per / 3); const lp = new V3(-12 + col * (24 / (nc - 1)) + (r % 2) * 0.6, 1.2 + r * 1.2, r * 2.8 + 0.2).applyMatrix4(base);
      fans.push({ p: lp, yaw: yaw + Math.PI, s: 0.8, c: cols[(k * 5) % 6], ph: k * 1.37, amp: 0.7 + ((k * 13) % 7) / 10 }); } }
  if (!stands.length) return;
  const sm = new THREE.InstancedMesh(standG, toon('#ffffff', { vc: true, rim: 0.2 }), stands.length); stands.forEach((m, i) => sm.setMatrixAt(i, m)); sm.receiveShadow = true; T.group.add(sm);
  const parts = [{ g: bodyGeo(), mat: animMat('#ffffff', { rim: 0.45, vc: true }, { jump: 0.6, spd: 5 }) }, { g: faceGeo(), mat: animMat('#ffffff', { vc: true, rim: 0 }, { jump: 0.6, spd: 5 }), tint: false }, { g: armsGeo(), mat: animMat('#ffffff', { rim: 0.3 }, { jump: 0.6, spd: 5, wave: 1 }) },
    { g: hatGeo(T.theme), mat: animMat('#ffffff', { vc: true, rim: 0.2 }, { jump: 0.6, spd: 5 }), tint: false }];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (const pt of parts) { const g = pt.g.clone(), ph = new Float32Array(fans.length), am = new Float32Array(fans.length); fans.forEach((f, i) => { ph[i] = f.ph; am[i] = f.amp; }); g.setAttribute('aPh', new THREE.InstancedBufferAttribute(ph, 1)); g.setAttribute('aAmp', new THREE.InstancedBufferAttribute(am, 1));
    const im = new THREE.InstancedMesh(g, pt.mat, fans.length); fans.forEach((f, i) => { q.setFromAxisAngle(new V3(0, 1, 0), f.yaw); m4.compose(f.p, q, new V3(f.s, f.s, f.s)); im.setMatrixAt(i, m4); if (pt.tint !== false) im.setColorAt(i, C(f.c)); }); if (im.instanceColor) im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); T.group.add(im); }
  T.anims.push(t => { TIME.value = t; });
}

// ---------- farolas con carita (poste de caramelo, farol redondeado que «respira») ----------
export function lanterns26(T) {
  const { S, N, cup } = T; const every = Math.max(8, Math.round(46 / T.STEP)), spots = [];
  for (let i = 3; i < N - 3; i += every) { if (T.inShortcut(S[i].p.x, S[i].p.z) != null) continue; for (const sd of [-1, 1]) spots.push([i, sd]); } if (!spots.length) return;
  const body = mergeAny([{ g: RB(1.1, 0.5, 1.1, 0.2), m: M(0, 0.25, 0), c: '#ffffff' }, { g: withVC(new THREE.CylinderGeometry(0.17, 0.22, 5, 8, 5), (x, y, z) => Math.sin(Math.atan2(z, x) * 2 + y * 3) > 0 ? cup.curbA : '#ffffff'), m: M(0, 2.9, 0) },
    { g: latheVC([[0.01, 0], [1.0, 0], [0.75, 0.55], [0.3, 0.8], [0.01, 0.9]], 12, () => cup.curbA), m: M(0, 6.15, 0) }, { g: SPHl, m: M(0, 7.15, 0, 0.18), c: '#ffffff' }, { g: TOR, m: M(0, 1.2, 0, 0.26, 0.26, 0.26, Math.PI / 2), c: cup.curbB }, { g: TOR, m: M(0, 5.35, 0, 0.62, 0.62, 0.62, Math.PI / 2), c: cup.curbA }]);
  const bulb = mergeAny([{ g: SPH, m: M(0, 5.75, 0, 0.6, 0.55, 0.6), c: '#fff3c4' }]), faceG = mergeAny(faceP(0, 5.78, 0.56, 0.62, { sleepy: false }));
  const n = spots.length, m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  const ims = [new THREE.InstancedMesh(body, toon('#ffffff', { vc: true, rim: 0.4 }), n), new THREE.InstancedMesh(bulb, toon('#ffffff', { vc: true, rim: 0, emissive: '#fff0b0', ei: 0.8, nocache: true }), n), new THREE.InstancedMesh(faceG, toon('#ffffff', { vc: true, rim: 0 }), n)];
  spots.forEach(([i, sd], j) => { const s = S[i], d = sd * (s.wall + 1.4); q.setFromAxisAngle(new V3(0, 1, 0), Math.atan2(-s.right.x * sd, -s.right.z * sd)); m4.compose(new V3(s.p.x + s.right.x * d, s.p.y, s.p.z + s.right.z * d), q, new V3(1, 1, 1)); ims.forEach(im => im.setMatrixAt(j, m4)); });
  ims.forEach(im => T.group.add(im)); const bm = ims[1].material; T.anims.push(t => { bm.emissiveIntensity = 0.65 + Math.sin(t * 2.2) * 0.2; });
}

// ---------- monumentos de los circuitos originales (centro del circuito, escalados al hueco libre) ----------
const tm = (c, o = {}) => toon(c, { rim: 0.5, ...o });
function bigFace(p, y, z, s, A, blink = true) { const eyes = []; for (const sd of [-1, 1]) { const e = mesh(SPH, tm('#2e1a36', { rim: 0 }), p, [sd * 0.34 * s, y, z], null, [0.12 * s, 0.17 * s, 0.07 * s]); mesh(SPHl, new THREE.MeshBasicMaterial({ color: '#ffffff' }), e, [-0.3, 0.35, 0.8], null, 0.35); eyes.push(e);
    mesh(SPHl, tm('#ff8fb5', { rim: 0, opacity: 0.85 }), p, [sd * 0.6 * s, y - 0.2 * s, z - 0.02 * s], null, [0.16 * s, 0.08 * s, 0.05 * s]); }
  const mo = mesh(SMILE, tm('#5a2a40', { rim: 0 }), p, [0, y - 0.15 * s, z + 0.02 * s], [0, 0, Math.PI], 0.16 * s);
  if (blink) A.push(t => { const b = (t % 4.3) > 4.15 ? 0.15 : 1; eyes.forEach(e => e.scale.y = 0.17 * s * b); mo.scale.y = 0.16 * s * (1 + Math.max(0, Math.sin(t * 2)) * 0.4); }); return eyes; }
export const MONU = {
  gominola: (g, A) => { // osito de gominola gigante y translúcido que saluda con una piruleta
    const jel = tm('#ff6f9f', { opacity: 0.88, rim: 0.9, depthWrite: true }), bel = tm('#ffb0cc', { opacity: 0.9, rim: 0.6, depthWrite: true });
    const b = new THREE.Group(); g.add(b); const body = mesh(SPH, jel, b, [0, 9, 0], null, [6, 7.5, 5]); outline(body, '#a03a6a', 1.03); mesh(SPH, bel, b, [0, 8.6, 2.6], null, [3.8, 4.8, 2.6]);
    const head = new THREE.Group(); head.position.y = 19; b.add(head); outline(mesh(SPH, jel, head, [0, 0, 0], null, [5, 4.4, 4.4]), '#a03a6a', 1.03); for (const sd of [-1, 1]) { mesh(SPH, jel, head, [sd * 3.6, 3.4, 0], null, 1.6); mesh(SPH, bel, head, [sd * 3.6, 3.4, 0.9], null, 0.9); }
    mesh(SPH, bel, head, [0, -1.1, 3.6], null, [2, 1.4, 1.2]); mesh(SPH, tm('#5a2a40'), head, [0, -0.6, 4.7], null, [0.6, 0.4, 0.3]); bigFace(head, 0.9, 4.1, 5.5, A);
    for (const sd of [-1, 1]) mesh(SPH, jel, b, [sd * 3, 1.8, 0.5], null, [2.2, 1.8, 2.8]);
    const armL = new THREE.Group(); armL.position.set(-5.2, 12, 0); b.add(armL); mesh(SPH, jel, armL, [-1.6, 2, 0], [0, 0, 0.6], [1.5, 3.2, 1.5]);
    const armR = new THREE.Group(); armR.position.set(5.2, 12, 0); b.add(armR); mesh(SPH, jel, armR, [1.6, -1.2, 0.6], [0, 0, 0.5], [1.5, 3, 1.5]); const lp = new THREE.Group(); lp.position.set(2.6, -3.6, 1.2); armR.add(lp);
    mesh(CYL, tm('#ffffff'), lp, [0, 4, 0], null, [0.3, 8, 0.3]); const sw = mesh(new THREE.CylinderGeometry(3, 3, 0.8, 40), tm('#ffe066', { emissive: '#ffb020', ei: 0.15 }), lp, [0, 9, 0], [Math.PI / 2, 0, 0]); mesh(TOR, tm('#ff5fa0'), lp, [0, 9, 0], null, [2.2, 2.2, 3]); mesh(TOR, tm('#7ee3c4'), lp, [0, 9, 0], null, [1.2, 1.2, 3.5]);
    A.push(t => { b.position.y = Math.abs(Math.sin(t * 1.6)) * 1.2; b.scale.set(1 + Math.sin(t * 3.2) * 0.015, 1 - Math.sin(t * 3.2) * 0.02, 1); armL.rotation.z = -0.6 - Math.sin(t * 4) * 0.5; sw.rotation.y = t * 2; head.rotation.z = Math.sin(t * 1.3) * 0.08; }); return 26; },
  girasol: (g, A) => { // molino-girasol con casita, puerta y aspas de pétalos que giran
    const tw = mesh(new THREE.CylinderGeometry(3.4, 5, 18, 24), tm('#fff4d6'), g, [0, 9, 0]); outline(tw, '#a07a4a', 1.02); mesh(CONE, tm('#ff8f5a'), g, [0, 20.5, 0], null, [5.6, 5, 5.6]);
    mesh(RB(2.6, 4, 0.6, 0.6), tm('#9a5a3a'), g, [0, 2, 4.6]); for (const y of [8, 13]) for (const sd of [-1, 1]) { mesh(RB(1.6, 1.8, 0.4, 0.4), tm('#8fd3ff', { emissive: '#8fd3ff', ei: 0.2 }), g, [sd * 1.5, y, 4.0 - (y - 8) * 0.12]); }
    const hub = new THREE.Group(); hub.position.set(0, 18, 4.8); g.add(hub); const disc = mesh(new THREE.CylinderGeometry(3, 3, 1, 36), tm('#7a4a1a'), hub, [0, 0, 0.5], [Math.PI / 2, 0, 0]); outline(disc, '#4a2a10', 1.03); bigFace(hub, 0.3, 1.1, 4.6, A);
    const blades = new THREE.Group(); hub.add(blades); for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; const p = mesh(SPH, tm(k % 2 ? '#ffcf2a' : '#ffb81a'), blades, [Math.cos(a) * 6.2, Math.sin(a) * 6.2, 0], [0, 0, a - Math.PI / 2], [1.4, 3.6, 0.4]); outline(p, '#c08a10', 1.04); }
    A.push(t => { blades.rotation.z = t * 0.6; hub.rotation.z = Math.sin(t * 0.8) * 0.05; }); return 22; },
  helada: (g, A) => { // cucurucho gigante con bolas que gotean y pingüinos que patinan alrededor
    const cone2 = mesh(new THREE.ConeGeometry(5, 16, 32, 8), tm('#e8b47a'), g, [0, 8, 0], [Math.PI, 0, 0]); outline(cone2, '#9a6a3a', 1.02); for (let k = 0; k < 6; k++) mesh(TOR, tm('#c88a4a', { rim: 0 }), g, [0, 3 + k * 2.4, 0], [Math.PI / 2, 0, 0], [0.9 + k * 0.48, 0.9 + k * 0.48, 0.6]);
    const sc = [['#ffc4e1', 18.5, 5.6], ['#c4f0ff', 25, 4.8], ['#fff3c4', 30.5, 3.8]]; const scoops = sc.map(([c, y, r]) => { const m = mesh(SPH, tm(c), g, [0, y, 0], null, [r, r * 0.9, r]); outline(m, '#7a6aa0', 1.02); for (let k = 0; k < 7; k++) mesh(SPH, tm(c), g, [Math.cos(k) * r * 0.92, y - r * 0.55 - (k % 3) * 0.5, Math.sin(k) * r * 0.92], null, [0.7, 1.4 + (k % 3) * 0.4, 0.7]); return m; });
    mesh(SPH, tm('#ff3f6f'), g, [0, 35, 0], null, 1.3); bigFace(g, 18.6, 5.4, 5.5, A);
    const peng = []; for (let k = 0; k < 4; k++) { const p = new THREE.Group(); g.add(p); mesh(SPH, tm('#3a3a5a'), p, [0, 1.8, 0], null, [1.2, 1.7, 1.1]); mesh(SPH, tm('#ffffff'), p, [0, 1.6, 0.55], null, [0.85, 1.3, 0.7]); mesh(CONE, tm('#ffa64d'), p, [0, 2.4, 1.2], [Math.PI / 2, 0, 0], [0.25, 0.5, 0.25]); bigFace(p, 2.7, 1.0, 0.9, A, false); mesh(TOR, tm(['#ff5f8f', '#5fb4ff', '#9dff7a', '#ffe066'][k]), p, [0, 3.0, 0], [Math.PI / 2, 0, 0], [0.9, 0.9, 1]); peng.push(p); }
    A.push(t => { peng.forEach((p, k) => { const a = t * 0.5 + k / 4 * 6.283; p.position.set(Math.cos(a) * 9, Math.abs(Math.sin(t * 3 + k)) * 0.4, Math.sin(a) * 9); p.rotation.y = -a; p.rotation.z = Math.sin(t * 3 + k) * 0.15; }); scoops[2].rotation.y = t * 0.3; }); return 14; },
  galaxia: (g, A) => { // Saturno sonriente con lunas que orbitan (cada una con su carita)
    g.position.y += 18; const pl = mesh(new THREE.SphereGeometry(10, 40, 28), tm('#b9a2f7'), g, [0, 0, 0]); outline(pl, '#5a4aa0', 1.02); for (let k = 0; k < 4; k++) mesh(TOR, tm(['#d8c8ff', '#9f8ae8'][k % 2], { rim: 0 }), g, [0, -6 + k * 4, 0], [Math.PI / 2, 0, 0], [Math.sqrt(100 - (-6 + k * 4) ** 2) * 1.0, Math.sqrt(100 - (-6 + k * 4) ** 2), 1.2]);
    const ring = mesh(new THREE.TorusGeometry(16, 1.6, 10, 64), tm('#fff3c4', { emissive: '#ffe080', ei: 0.25 }), g, [0, 0, 0], [Math.PI / 2 - 0.35, 0, 0], [1, 1, 0.22]); bigFace(g, 1, 9.8, 10, A);
    const moons = [0, 1, 2].map(k => { const m = new THREE.Group(); g.add(m); outline(mesh(SPH, tm(['#ffd36b', '#7ee3c4', '#ff9ec7'][k]), m, [0, 0, 0], null, 2.2), '#6a5a8a', 1.04); bigFace(m, 0.2, 2.1, 2.2, A); return m; });
    A.push(t => { g.rotation.y = Math.sin(t * 0.2) * 0.3; moons.forEach((m, k) => { const a = t * (0.4 + k * 0.15) + k * 2; m.position.set(Math.cos(a) * (22 + k * 4), Math.sin(a * 1.3) * 4, Math.sin(a) * (22 + k * 4)); m.lookAt(g.position.x, m.position.y, g.position.z); m.rotation.y += Math.PI; }); ring.rotation.z = t * 0.1; }); return 30; },
  tormenta: (g, A) => { // nube de tormenta discotequera con bola de espejos y rayos que parpadean
    const cl = new THREE.Group(); cl.position.y = 22; g.add(cl); for (const [x, y, z, r] of [[0, 0, 0, 7], [6, -1, 0, 5], [-6, -1, 0.5, 5.4], [3, 3.5, -1, 4.6], [-3, 3.4, 0, 4.4]]) outline(mesh(ICO, tm('#6a5aa8', { emissive: '#3a2a70', ei: 0.3 }), cl, [x, y, z], null, [r, r * 0.85, r]), '#2a1f50', 1.03);
    bigFace(cl, 0.5, 6.6, 7, A); const ball = mesh(new THREE.IcosahedronGeometry(3, 1), toon('#e8e8ff', { flat: true, emissive: '#8a8aff', ei: 0.3, rim: 0.9 }), cl, [0, -9.5, 0]); mesh(CYL, tm('#c0c0e0'), cl, [0, -5.5, 0], null, [0.12, 3.5, 0.12]);
    const bolts = [-1, 1].map(sd => { const b = mesh(new THREE.ConeGeometry(1.1, 10, 4), toon('#ffe066', { emissive: '#ffe066', ei: 1 }), cl, [sd * 6, -9, 0], [0, 0, sd * 0.25 + Math.PI]); return b; });
    A.push(t => { ball.rotation.y = t * 1.5; cl.position.y = 22 + Math.sin(t * 0.8) * 0.8; bolts.forEach((b, k) => b.visible = Math.sin(t * 7 + k * 2.1) > 0.55); cl.rotation.y = Math.sin(t * 0.3) * 0.2; }); return 18; },
  cielo: (g, A) => { // globo aerostático con carita y cesta llena de mochis saludando
    g.position.y += 12; const bal = new THREE.Group(); g.add(bal); const env = mesh(latheVC([[0.01, 0], [2.4, 0.3], [6, 3], [8.2, 7], [8.4, 10], [7, 13.4], [4, 15.4], [0.01, 16]], 24, (y, a) => Math.sin(a * 6) > 0 ? '#ff9ec7' : '#fff4fa'), toon('#ffffff', { vc: true, rim: 0.5 }), bal, [0, 4, 0]); outline(env, '#b04a80', 1.02);
    bigFace(bal, 12, 8.3, 7, A); const bk = mesh(RB(4.4, 2.6, 4.4, 0.6), tm('#c08a5a'), bal, [0, -1.2, 0]); for (const sx of [-1.8, 1.8]) for (const sz of [-1.8, 1.8]) mesh(CYL, tm('#8a5a3a'), bal, [sx, 2, sz], null, [0.08, 5.4, 0.08]);
    const fans = [0, 1, 2].map(k => { const f = new THREE.Group(); f.position.set(-1.3 + k * 1.3, 0.6, 1.2); bal.add(f); mesh(SPH, tm(['#7ee3c4', '#ffd36b', '#b9a2f7'][k]), f, [0, 0.6, 0], null, [0.75, 0.68, 0.75]); bigFace(f, 0.7, 0.7, 0.6, A, false); return f; });
    A.push(t => { bal.position.y = Math.sin(t * 0.7) * 2; bal.rotation.y = t * 0.15; fans.forEach((f, k) => f.position.y = 0.6 + Math.abs(Math.sin(t * 4 + k)) * 0.4); }); return 18; },
  sueno: (g, A) => { // reloj derretido gigante con carita dormilona y agujas que giran
    g.position.y += 8; const ck = new THREE.Group(); g.add(ck); const disc = mesh(new THREE.CylinderGeometry(9, 9, 2, 48, 1), tm('#ffe9a8'), ck, [0, 10, 0], [Math.PI / 2, 0, 0]); outline(disc, '#a07a3a', 1.02); mesh(TOR, tm('#ffb36b'), ck, [0, 10, 0], null, [9, 9, 3]);
    for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; mesh(SPHl, tm('#6a4a8a'), ck, [Math.cos(a) * 7.4, 10 + Math.sin(a) * 7.4, 1.1], null, 0.45); }
    for (let k = 0; k < 5; k++) mesh(SPH, tm('#ffe9a8'), ck, [-6 + k * 3, 1.5 + (k % 2) * 1.5, 0], null, [1.3, 3 + (k % 3) * 1.6, 1.2]); // gotas derretidas
    const hH = new THREE.Group(), hM = new THREE.Group(); hH.position.set(0, 10, 1.4); hM.position.set(0, 10, 1.6); ck.add(hH, hM); mesh(RB(0.6, 4.5, 0.3, 0.15), tm('#3a2050'), hH, [0, 2.2, 0]); mesh(RB(0.45, 6.5, 0.3, 0.12), tm('#3a2050'), hM, [0, 3.2, 0]);
    const ey = []; for (const sd of [-1, 1]) { ey.push(mesh(SMILE, tm('#3a2050', { rim: 0 }), ck, [sd * 3, 12.5, 1.3], [0, 0, 0], 0.9)); mesh(SPHl, tm('#ff8fb5', { rim: 0 }), ck, [sd * 4.6, 10.6, 1.2], null, [1, 0.5, 0.2]); }
    const z = [0, 1, 2].map(k => mesh(RB(1.2, 1.2, 0.3, 0.2), toon('#c8b8ff', { emissive: '#c8b8ff', ei: 0.5 }), g, [7, 20, 0], null, 1));
    A.push(t => { hM.rotation.z = -t * 0.8; hH.rotation.z = -t * 0.07; ck.rotation.y = Math.sin(t * 0.25) * 0.4; ck.scale.y = 1 + Math.sin(t * 0.8) * 0.03; z.forEach((m, k) => { const u = (t * 0.3 + k / 3) % 1; m.position.set(7 + u * 6, 20 + u * 10, 0); m.scale.setScalar(0.5 + u); m.rotation.z = u * 2; }); }); return 18; },
  ballena: (g, A) => { // faro-caracola con carita y haz de luz que gira
    g.position.y += 2; const sh = mesh(latheVC([[0.01, 0], [6, 0], [5.6, 4], [4.6, 10], [3.4, 16], [2.2, 21], [0.01, 23]], 28, y => (Math.floor(y * 8) % 2) ? '#ffd6e8' : '#fff4fa'), toon('#ffffff', { vc: true, rim: 0.5 }), g, [0, 0, 0]); outline(sh, '#b06a8a', 1.02);
    for (let k = 0; k < 5; k++) mesh(TOR, tm('#ff9ec7'), g, [0, 3 + k * 4, 0], [Math.PI / 2, 0, 0], [5.6 - k * 0.8, 5.6 - k * 0.8, 1.5]);
    const top = new THREE.Group(); top.position.y = 23; g.add(top); mesh(SPH, toon('#fff6c0', { emissive: '#fff0a0', ei: 0.9 }), top, [0, 1.5, 0], null, 2.2); mesh(CONE, tm('#ff5f8f'), top, [0, 4.6, 0], null, [3, 2.6, 3]);
    const beam = mesh(new THREE.ConeGeometry(3, 30, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#fff6c0', transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }), top, [15, 1.5, 0], [0, 0, Math.PI / 2]); const bg = new THREE.Group(); top.add(bg); bg.add(beam);
    bigFace(g, 9, 4.7, 5, A); mesh(RB(2.4, 3.6, 0.6, 0.6), tm('#7a4a8a'), g, [0, 1.8, 5.7]);
    A.push(t => { bg.rotation.y = t * 0.8; }); return 14; },
  biblioteca: (g, A) => { // torre de libros con carita y un libro gordo que se abre y cierra encima
    g.position.y += 4; const cols2 = ['#c0392b', '#2e86de', '#27ae60', '#f39c12', '#8e44ad', '#16a085']; let y = 0; for (let k = 0; k < 6; k++) { const h = 2.4 + (k % 3) * 0.6, w = 11 - k * 0.9; const b = mesh(RB(w, h, w * 0.72, 0.4), tm(cols2[k]), g, [0, y + h / 2, 0], [0, k * 0.25, 0]); mesh(RB(w - 0.6, h - 0.5, w * 0.72 + 0.1, 0.2), tm('#fff6dc', { rim: 0 }), g, [-0.4, y + h / 2, 0], [0, k * 0.25, 0]); y += h; }
    bigFace(g, 5, 4.5, 4, A); const bk = new THREE.Group(); bk.position.y = y + 0.5; g.add(bk); const L2 = new THREE.Group(), R2 = new THREE.Group(); bk.add(L2, R2);
    mesh(RB(5, 0.5, 6.5, 0.2), tm('#c0392b'), L2, [-2.5, 0, 0]); mesh(RB(4.7, 0.3, 6.2, 0.1), tm('#fff6dc'), L2, [-2.4, 0.35, 0]); mesh(RB(5, 0.5, 6.5, 0.2), tm('#c0392b'), R2, [2.5, 0, 0]); mesh(RB(4.7, 0.3, 6.2, 0.1), tm('#fff6dc'), R2, [2.4, 0.35, 0]);
    A.push(t => { const a = 0.2 + Math.abs(Math.sin(t * 0.9)) * 0.7; L2.rotation.z = a; R2.rotation.z = -a; bk.position.y = y + 0.5 + Math.sin(t * 0.9) * 0.8; }); return 14; },
};
// recuento de triángulos por objeto (para medir)
export function propTris() { const o = {}; for (const k in PROPS) { const g = geoP(k); o[k] = g.attributes.position.count / 3; } return o; }
