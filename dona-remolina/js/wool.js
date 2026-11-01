// v18: jerséis puestos en capas sobre el personaje (Villa Jersey). Máx. 5 capas visibles + 1 "núcleo" donde se fusionan las viejas.
import * as THREE from 'three';
import { GB, addOutline } from './geo.js?v=19';
import { JERSEY_COLORS } from './models5.js?v=19';

const MAXV = 5;
let knitTex = null, geo = null; const mats = new Map();
function knit() {
  if (knitTex) return knitTex;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, 256, 256); g.lineCap = 'round';
  for (let r = 0; r < 16; r++) for (let q = 0; q < 16; q++) {
    const x = q * 16, y = r * 16, cab = (q % 8) >= 2 && (q % 8) <= 5; // 4 columnas de ochos cada 8 puntos
    if (cab) { const sd = (Math.floor(r / 2) % 2) ? 1 : -1, ox = (q % 8 - 3.5) * 0; g.strokeStyle = '#9a9a9a'; g.lineWidth = 7.5; g.beginPath(); g.moveTo(x + 8 - sd * 7 + ox, y); g.lineTo(x + 8 + sd * 7 + ox, y + 16); g.stroke(); g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 8 - sd * 7 - 1, y); g.lineTo(x + 8 + sd * 7 - 1, y + 16); g.stroke(); }
    else { g.strokeStyle = '#a8a8a8'; g.lineWidth = 6; g.beginPath(); g.moveTo(x + 3, y + 1); g.lineTo(x + 8, y + 14); g.lineTo(x + 13, y + 1); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x + 2.4, y + 1); g.lineTo(x + 7.4, y + 12); g.moveTo(x + 12.4, y + 1); g.lineTo(x + 8.4, y + 11); g.stroke(); }
  }
  knitTex = new THREE.CanvasTexture(c); knitTex.wrapS = knitTex.wrapT = THREE.RepeatWrapping; knitTex.colorSpace = THREE.SRGBColorSpace; knitTex.anisotropy = 4; return knitTex;
}
const matFor = (i) => { let m = mats.get(i); if (!m) { const t = knit(); m = new THREE.MeshStandardMaterial({ color: JERSEY_COLORS[i % JERSEY_COLORS.length], map: t, bumpMap: t, bumpScale: 1.6, roughness: 0.96, metalness: 0 }); mats.set(i, m); } return m; };
function shape() {
  if (geo) return geo;
  const g = new GB(), W = 0xffffff;
  g.sph(1, W, 0, 0, 0, 1, 1, 1, 30); // cuerpo
  for (const s of [-1, 1]) g.sph(0.42, W, s * 0.93, 0.28, 0, 1, 1.15, 1, 14); // hombros/mangas
  g.torus(0.8, 0.1, W, 0, -0.62, 0, Math.PI / 2, 0, 0, Math.PI * 2, 30); // ribete inferior
  g.torus(0.42, 0.15, W, 0, 0.9, 0, Math.PI / 2, 0, 0, Math.PI * 2, 20); // cuello vuelto
  const b = g.build(false, 0.05), p = b.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = Math.atan2(p.getZ(i), p.getX(i)) / (Math.PI * 2) * 3 + 0.5; uv[i * 2 + 1] = p.getY(i) * 1.3; }
  b.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const col = b.attributes.color; for (let i = 0; i < col.count * 3; i++) col.array[i] = 1; // sin sombreado de vértice: el color lo pone el material
  geo = b; return geo;
}

export function makeWool(scene) {
  const W = { n: 0, fat: 0, last: -9, cols: [], core: 0, root: null, ud: null, fit: null, t: 0, popT: 9, meshes: [], sq: 0, F: 1, a0: null };
  const pool = () => { if (W.meshes.length) return; for (let i = 0; i <= MAXV; i++) { const m = new THREE.Mesh(shape(), matFor(0)); m.castShadow = false; m.visible = false; addOutline(m, 0.014); W.meshes.push(m); } };
  function measure(root) {
    const ud = root.userData, bm = ud.bodyM; let f;
    if (bm && bm.geometry && bm.geometry.boundingBox) { const bb = bm.geometry.boundingBox, p = bm.position; f = { cx: (bb.min.x + bb.max.x) / 2 + p.x, cy: (bb.min.y + bb.max.y) / 2 + p.y, cz: (bb.min.z + bb.max.z) / 2 + p.z, rx: (bb.max.x - bb.min.x) / 2, ry: (bb.max.y - bb.min.y) / 2, rz: (bb.max.z - bb.min.z) / 2 }; }
    else f = { cx: 0, cy: 0.7, cz: 0, rx: 0.45, ry: 0.55, rz: 0.4 };
    f.rx = Math.max(0.25, Math.min(f.rx, 0.8)); f.rz = Math.max(0.22, Math.min(f.rz, 0.7)); f.ry = Math.max(0.3, Math.min(f.ry, 0.8)); return f;
  }
  W.attach = (root) => {
    if (W.root === root) return; W.detach(); pool(); W.root = root; W.ud = root.userData; W.fit = measure(root);
    for (const m of W.meshes) root.add(m);
    if (W.ud.arms) W.a0 = W.ud.arms.map((a) => a.position.x);
    W.layout();
  };
  W.detach = () => { if (!W.root) return; for (const m of W.meshes) W.root.remove(m); if (W.ud.arms && W.a0) W.ud.arms.forEach((a, i) => { a.position.x = W.a0[i]; }); W.root = null; W.ud = null; W.a0 = null; };
  W.clear = () => { W.n = 0; W.fat = 0; W.last = -9; W.cols = []; W.core = 0; W.popT = 9; W.sq = 0; W.layout(); };
  W.add = (colIdx, wt = 1, now = 0) => {
    W.fat += wt; W.n++; if (now - W.last < 0.22 && wt < 0.5) { W.apply(W.t); return; } W.last = now;
    colIdx = ((colIdx | 0) % JERSEY_COLORS.length + JERSEY_COLORS.length) % JERSEY_COLORS.length; W.cols.push(colIdx);
    if (W.cols.length > MAXV) W.core = W.cols.shift(); // las capas viejas se fusionan en el núcleo
    W.popT = 0; W.layout();
  };
  W.layout = () => {
    const ms = W.meshes; if (!ms.length) return; const used = W.n ? W.cols.length + 1 : 0;
    for (let i = 0; i < ms.length; i++) ms[i].visible = i < used;
    if (W.ud && W.ud.arms && W.a0) W.ud.arms.forEach((a, i) => { a.position.x = W.a0[i]; });
    W.used = used; if (W.n) { ms[0].material = matFor(W.core || W.cols[0]); W.cols.forEach((c, i) => { ms[i + 1].material = matFor(c); }); }
    W.apply(0);
  };
  // pop: factor extra de escala de la capa más nueva (rebote amortiguado)
  W.apply = (t) => {
    if (!W.root || !W.n) { W.F = 1; return; } const f = W.fit, ms = W.meshes, m = W.used, b = Math.min(W.fat, 30) / 30;
    const F = 1 + 0.62 * Math.pow(b, 0.8), Fy = 1 + 0.2 * b; W.F = F * (1 + 0.045 * (m - 1));
    for (let k = 0; k < m; k++) {
      const xz = F * (1 + 0.045 * k), y = Fy * (1 + 0.1 * (m - 1 - k)), newest = k === m - 1 && W.cols.length > 0;
      const pop = newest ? 1 + 0.42 * Math.exp(-W.popT * 5.5) * Math.cos(W.popT * 17) : 1, jig = 1 + Math.sin(t * 7.3 + k * 1.7) * 0.018 * Math.min(1, W.sp || 0);
      const ryk = f.ry * 0.86 * y * (1 + (pop - 1) * 0.5), top = f.cy + f.ry * 0.8 + 0.05 * f.ry * (m - 1 - k); // crecen hacia abajo y a lo ancho: la cabeza siempre asoma
      ms[k].scale.set(f.rx * 1.12 * xz * pop * jig, ryk, f.rz * 1.18 * xz * pop * jig);
      ms[k].position.set(f.cx, Math.max(top - ryk * 0.97, ryk * 0.55), f.cz); ms[k].rotation.y = 0;
    }
    if (W.ud.arms && W.a0) W.ud.arms.forEach((a, i) => { a.position.x = W.a0[i] * (1 + 0.55 * (W.F - 1) / 0.9 + 0.1); });
  };
  W.update = (dt, t, speed) => { // devuelve un "estirón" para el squash del personaje
    if (!W.root) return 0; W.sp = Math.min(1, (speed || 0) / 8); W.popT += dt; W.t = t; W.apply(t);
    return W.popT < 1.2 ? 0.2 * Math.exp(-W.popT * 5) * Math.cos(W.popT * 15) : 0;
  };
  return W;
}
