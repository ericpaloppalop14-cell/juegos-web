import { THREE, GB, bendMat, clamp, lerp, damp, TAU, rboxGeo, addOutline } from './util.js?v=3';
import { CHARS, SKINS } from './data.js?v=3';

export const M = {
  v: bendMat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05 })),
  shiny: bendMat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.55 })),
  glass: bendMat(new THREE.MeshStandardMaterial({ color: 0xaee6ff, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.28, depthWrite: false })),
  flameO: new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
  flameI: new THREE.MeshBasicMaterial({ color: 0xfff1b0, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
  rv: bendMat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05 })),
  rs: bendMat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.55 })),
  unlit: bendMat(new THREE.MeshBasicMaterial({ vertexColors: true })),
};
bendMat(M.flameO); bendMat(M.flameI);

const mk = (g, m, cast = true) => { const me = new THREE.Mesh(g.build ? g.build() : g, m); me.castShadow = cast; return me; };
const flameGeo = (() => { const g = new THREE.ConeGeometry(1, 1, 10, 1, true); g.translate(0, 0.5, 0); g.rotateX(Math.PI / 2); return g; })();

function wheelGeo(R, tire, rim, spokes = 6, cleats = false) {
  const b = new GB();
  b.tor(R, R * 0.2, 0, 0, 0, tire, { ry: Math.PI / 2, seg: 16 });
  b.cy(R * 0.85, R * 0.85, 0.03, 16, 0, 0, 0, rim, { rz: Math.PI / 2 });
  b.cy(R * 0.2, R * 0.2, 0.12, 8, 0, 0, 0, 0xcfcfcf, { rz: Math.PI / 2 });
  for (let i = 0; i < spokes; i++) { const a = i / spokes * Math.PI; b.bx(0.025, R * 1.65, 0.03, 0, 0, 0, 0x888e98, { rx: a }); }
  if (cleats) for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; b.bx(0.14, 0.09, 0.06, 0, Math.cos(a) * R * 1.08, Math.sin(a) * R * 1.08, tire, { rx: a }); }
  return b.build();
}

/* ---------- chair extras per character ---------- */
function chairExtras(id, F, A, ctx) {
  const c = CHARS.find(x => x.id === id);
  if (id === 'paco') {
    A.cy(0.07, 0.07, 1.0, 8, 0.28, 1.0, 0.7, 0xd9a24a, { rx: 0.35, rz: -0.35 }); A.cy(0.072, 0.072, 0.2, 8, 0.355, 1.45, 0.82, 0xefc87a, { rx: 0.35, rz: -0.35 }); // barra de pan
    A.rb(0.14, 0.1, 0.06, 0.03, 0.5, 0.98, -0.1, 0x222222); A.sp(0.06, 0.5, 1.06, -0.1, 0xbfe6ff); // retrovisor
    A.cy(0.012, 0.012, 0.2, 5, 0.5, 0.92, -0.1, 0x777777);
  }
  if (id === 'rayo') {
    for (const s of [-1, 1]) {
      A.bx(0.04, 0.32, 0.1, s * 0.45, 0.95, 0.5, 0xffe23c, { rz: s * 0.5 }); A.bx(0.04, 0.28, 0.1, s * 0.46, 0.76, 0.5, 0xffe23c, { rz: -s * 0.55 });
      A.rb(0.08, 0.04, 0.9, 0.02, s * 0.5, 0.36, 0.1, 0xffe23c);
    }
    A.rb(1.2, 0.05, 0.3, 0.02, 0, 1.1, 1.0, 0xff4fa0); for (const s of [-1, 1]) A.rb(0.05, 0.28, 0.3, 0.02, s * 0.6, 1.0, 1.0, 0xffe23c); // alerón
    A.cy(0.17, 0.15, 0.55, 10, 0, 0.96, 0.75, 0xcfd6e6, { rx: Math.PI / 2 });
  }
  if (id === 'rockero') {
    for (const s of [-1, 1]) { A.rb(0.4, 0.5, 0.3, 0.04, s * 0.3, 1.35, 0.72, 0x181818); A.cy(0.13, 0.13, 0.04, 12, s * 0.3, 1.38, 0.56, 0x555a64, { rx: Math.PI / 2 }); A.cy(0.04, 0.04, 0.05, 8, s * 0.3, 1.38, 0.55, 0x111111, { rx: Math.PI / 2 }); A.cy(0.06, 0.06, 0.04, 8, s * 0.3, 1.22, 0.56, 0x555a64, { rx: Math.PI / 2 }); }
    A.rb(0.34, 0.55, 0.1, 0.05, 0, 1.5, 0.52, 0xd02a2a, { rz: 0.25 }); A.bx(0.07, 0.8, 0.05, -0.18, 1.9, 0.52, 0x5a3a22, { rz: 0.25 }); A.sp(0.06, -0.27, 2.32, 0.52, 0xcfcfcf);
    A.rb(0.14, 0.14, 0.04, 0.02, 0.4, 0.62, -0.1, 0xffffff); A.sp(0.04, 0.4, 0.64, -0.08, 0x111111);
  }
  if (id === 'pirata') {
    A.cy(0.045, 0.05, 2.1, 8, 0, 1.6, 0.5, 0x5a3a1c);
    A.bx(1.2, 1.0, 0.03, 0, 1.85, 0.43, 0xf5f0e0); A.bx(1.2, 1.0, 0.03, 0, 1.85, 0.56, 0xf5f0e0);
    A.cy(0.02, 0.02, 1.3, 6, 0, 2.38, 0.5, 0x5a3a1c, { rz: Math.PI / 2 });
    A.rb(0.34, 0.26, 0.04, 0.02, 0, 2.7, 0.5, 0x111111); A.sp(0.07, 0, 2.72, 0.53, 0xffffff); A.bx(0.2, 0.03, 0.03, 0, 2.62, 0.53, 0xffffff, { rz: 0.5 }); A.bx(0.2, 0.03, 0.03, 0, 2.62, 0.53, 0xffffff, { rz: -0.5 });
    A.cy(0.09, 0.11, 0.55, 10, 0.44, 0.85, -0.45, 0x1d1d1d, { rx: Math.PI / 2 }); A.sp(0.09, 0.44, 0.85, -0.74, 0x1d1d1d); A.cy(0.12, 0.12, 0.05, 10, 0.44, 0.85, -0.12, 0xc9a24a, { rx: Math.PI / 2 });
    A.cy(0.18, 0.18, 0.2, 10, -0.5, 0.45, 0.35, 0x6a4a2a, { rz: Math.PI / 2 }); // barril
  }
  if (id === 'cosmica') {
    for (const s of [-1, 1]) { A.rb(0.04, 0.55, 0.9, 0.02, s * 0.9, 1.25, 0.3, 0x2a4a9a, { rz: -s * 0.2 }); A.rb(0.4, 0.04, 0.04, 0.01, s * 0.62, 1.1, 0.3, 0x9aa4b4, { rz: -s * 0.2 }); for (let i = 0; i < 3; i++) A.bx(0.03, 0.5, 0.02, s * 0.9 + s * 0.02, 1.25, 0.0 + i * 0.3, 0x6a9aff, { rz: -s * 0.2 }); }
    A.cy(0.015, 0.015, 0.55, 6, 0, 1.75, 0.5, 0xcfcfcf); A.sp(0.06, 0, 2.05, 0.5, 0xff4a4a); A.cy(0.2, 0.2, 0.03, 12, 0, 1.55, 0.5, 0xcfcfcf, { rx: Math.PI / 2 - 0.5 });
  }
  if (id === 'ole') {
    for (const s of [-1, 1]) { A.cone(0.07, 0.5, 8, s * 0.3, 0.38, -0.95, 0xfff2d0, { rz: -s * 1.1, rx: -0.4 }); A.cone(0.06, 0.3, 8, s * 0.62, 0.52, -1.0, 0xfff2d0, { rz: -s * 0.4, rx: -0.4 }); A.sp(0.1, s * 0.15, 0.3, -0.92, 0xfff2d0); }
    A.rb(0.9, 1.0, 0.05, 0.02, 0, 1.0, 0.58, 0xd01c1c, { rx: -0.05 }); A.rb(0.9, 0.06, 0.06, 0.02, 0, 1.52, 0.58, 0xe9b923); A.rb(0.9, 0.06, 0.06, 0.02, 0, 0.5, 0.58, 0xe9b923);
    for (let i = -2; i <= 2; i++) A.sp(0.03, i * 0.18, 1.3, 0.62, 0xe9b923);
  }
  if (id === 'disco') {
    A.cy(0.025, 0.025, 0.9, 6, 0, 1.75, 0.55, 0xcfcfcf); A.sp(0.3, 0, 2.38, 0.55, 0xe6e6ff, { seg: 8 });
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; A.bx(0.12, 0.1, 0.03, Math.cos(a) * 0.3, 2.38 + Math.sin(a * 2) * 0.12, 0.55 + Math.sin(a) * 0.3, [0xff4fd8, 0x4fe8ff, 0xfff24f][i % 3], { ry: a }); }
    for (const s of [-1, 1]) { A.rb(0.22, 0.4, 0.22, 0.04, s * 0.55, 0.6, 0.95, 0x3a1a6a); A.sp(0.07, s * 0.55, 0.78, 1.07, [0xff4fd8, 0x4fe8ff][s > 0 ? 0 : 1]); }
    for (const [x, col] of [[-0.45, 0xff4fd8], [-0.15, 0xffd23c], [0.15, 0x4fe8ff], [0.45, 0x7bff4f]]) A.sp(0.07, x, 1.52, 0.5, col);
  }
  if (id === 'super') {
    A.rb(0.9, 1.35, 0.14, 0.05, 0, 1.15, 0.52, 0xffc928); A.rb(0.76, 1.15, 0.05, 0.05, 0, 1.12, 0.44, 0xc01c3a);
    for (const x of [-0.38, 0, 0.38]) A.cone(0.09, 0.3, 6, x, 1.97, 0.52, 0xffc928);
    A.sp(0.08, 0, 1.88, 0.47, 0xff3b6a); A.sp(0.05, -0.38, 1.82, 0.47, 0x3bd0ff); A.sp(0.05, 0.38, 1.82, 0.47, 0x3bff88);
    for (const s of [-1, 1]) { A.sp(0.1, s * 0.5, 0.97, 0.2, 0xffc928); A.sp(0.07, s * 0.5, 1.0, -0.1, 0xff3b6a); }
  }
}

/* ---------- head variants ---------- */
function headParts(id, H, c) {
  const hairC = c.hair;
  const side = (r = 0.12, x = 0.3, y = 0.2, z = 0.02, col = hairC) => { for (const s of [-1, 1]) H.sp(r, s * x, y, z, col, { sx: 0.8, sy: 1.1 }); };
  if (id === 'paco') {
    side(); // calva con mechones a los lados
    H.rb(0.6, 0.1, 0.5, 0.04, 0, 0.27 + 0.2, -0.02, 0x2a3a5a, { rx: 0.05 }); // gorra plana
    H.sp(0.33, 0, 0.45, 0.0, 0x2a3a5a, { sy: 0.45, sx: 1.02 }); H.rb(0.4, 0.04, 0.2, 0.02, 0, 0.42, -0.34, 0x1c2840, { rx: -0.15 });
    H.cap(0.05, 0.22, 0, -0.1, -0.3, 0xf5f5f5, { rz: Math.PI / 2 }); H.sp(0.05, -0.15, -0.06, -0.3, 0xf5f5f5); H.sp(0.05, 0.15, -0.06, -0.3, 0xf5f5f5); // bigote
    for (const s of [-1, 1]) H.tor(0.075, 0.012, s * 0.12, 0.04, -0.3, 0x222222, { seg: 12 }); H.bx(0.07, 0.012, 0.012, 0, 0.05, -0.3, 0x222222);
  }
  if (id === 'rayo') {
    H.sp(0.33, 0, 0.12, 0.08, hairC, { sy: 0.9 }); H.sp(0.2, 0, 0.48, 0.12, hairC); H.sp(0.12, 0, 0.64, 0.12, hairC); // moño
    H.rb(0.64, 0.07, 0.1, 0.03, 0, 0.3, -0.24, 0xffe23c); H.bx(0.05, 0.2, 0.04, 0.2, 0.35, -0.3, 0xffe23c, { rz: 0.5 }); // cinta + rayo
    for (const s of [-1, 1]) { H.tor(0.095, 0.02, s * 0.12, 0.06, -0.3, 0xff4fa0, { seg: 12 }); }
    H.bx(0.07, 0.015, 0.015, 0, 0.07, -0.3, 0xff4fa0); H.sp(0.035, -0.3, -0.08, 0, 0xffe23c); H.sp(0.035, 0.3, -0.08, 0, 0xffe23c);
  }
  if (id === 'rockero') {
    H.sp(0.34, 0, 0.12, 0.1, hairC, { sy: 0.95 }); H.rb(0.3, 0.2, 0.3, 0.1, 0, 0.5, -0.05, hairC, { rx: -0.3 }); // tupé
    H.cap(0.1, 0.5, 0, -0.25, 0.3, hairC, { rx: 0.25 }); // coleta
    H.rb(0.62, 0.09, 0.1, 0.03, 0, 0.3, -0.25, 0xd02a2a); // bandana
    H.rb(0.26, 0.12, 0.05, 0.03, -0.12, 0.06, -0.3, 0x111111); H.rb(0.26, 0.12, 0.05, 0.03, 0.12, 0.06, -0.3, 0x111111); H.bx(0.05, 0.015, 0.02, 0, 0.09, -0.3, 0x111111); // gafas de sol
    H.sp(0.05, 0, -0.17, -0.27, hairC); H.cap(0.06, 0.1, 0, -0.2, -0.28, hairC, { rx: 0.2 }); // perilla
  }
  if (id === 'pirata') {
    side(); H.sp(0.33, 0, 0.3, 0.02, 0xc9232a, { sy: 0.7 }); // pañuelo
    H.rb(0.6, 0.06, 0.5, 0.03, 0, 0.35, 0, 0xc9232a); H.sp(0.1, 0.0, 0.3, 0.3, 0xc9232a);
    H.rb(0.82, 0.14, 0.7, 0.05, 0, 0.5, 0, 0x181820, { rx: 0.08 }); H.sp(0.3, 0, 0.55, 0.0, 0x181820, { sy: 0.5 }); // tricornio
    H.sp(0.06, 0, 0.58, -0.3, 0xffffff); H.bx(0.14, 0.025, 0.02, 0, 0.51, -0.3, 0xffffff, { rz: 0.5 });
    H.rb(0.18, 0.16, 0.05, 0.05, 0.13, 0.07, -0.3, 0x111111); H.bx(0.45, 0.02, 0.02, 0.0, 0.2, -0.28, 0x111111, { rz: -0.4 }); // parche
    H.sp(0.22, 0, -0.25, -0.18, 0x8a7a68, { sy: 1.1, sx: 1.1 }); H.cap(0.08, 0.2, 0, -0.45, -0.2, 0x8a7a68); // barba
  }
  if (id === 'cosmica') {
    H.sp(0.33, 0, 0.14, 0.06, hairC, { sy: 0.95 }); for (const [x, y] of [[-0.28, 0.1], [0.28, 0.1], [-0.2, 0.34], [0.2, 0.34], [0, 0.4]]) H.sp(0.12, x, y, 0, hairC);
    H.mk = 'helmet';
  }
  if (id === 'ole') {
    H.sp(0.33, 0, 0.12, 0.08, hairC, { sy: 0.8 });
    H.sp(0.3, 0, 0.38, 0, 0x151515, { sy: 0.55 }); H.sp(0.1, -0.2, 0.52, 0, 0x151515); H.sp(0.1, 0.2, 0.52, 0, 0x151515); // montera
    H.cap(0.05, 0.3, 0, -0.1, 0.35, hairC, { rx: 0.4 }); H.sp(0.08, 0, -0.32, 0.38, 0x151515); // coleta
    H.cap(0.025, 0.2, -0.1, -0.1, -0.31, 0x222222, { rz: Math.PI / 2 - 0.2 }); H.cap(0.025, 0.2, 0.1, -0.1, -0.31, 0x222222, { rz: Math.PI / 2 + 0.2 });
  }
  if (id === 'disco') {
    H.sp(0.5, 0, 0.3, 0.12, hairC, { sy: 0.95 }); H.sp(0.12, -0.45, 0.35, 0.1, 0xff4fd8); H.sp(0.1, 0.4, 0.55, 0.1, 0x4fe8ff);
    for (const s of [-1, 1]) { H.add(starGeo(), 0xff4fd8, { x: s * 0.12, y: 0.06, z: -0.3, s: 0.1 }); H.sp(0.04, s * 0.3, -0.1, -0.05, 0xffd23c); H.cy(0.012, 0.012, 0.16, 5, s * 0.3, -0.18, -0.05, 0xffd23c); }
  }
  if (id === 'super') {
    H.sp(0.32, 0, 0.14, 0.06, hairC, { sy: 0.9 }); side(0.13, 0.3, 0.12);
    H.cy(0.3, 0.26, 0.15, 10, 0, 0.5, 0, 0xffc928); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; H.cone(0.06, 0.2, 6, Math.cos(a) * 0.26, 0.66, Math.sin(a) * 0.26, 0xffc928); H.sp(0.035, Math.cos(a) * 0.3, 0.52, Math.sin(a) * 0.3, [0xff3b6a, 0x3bd0ff, 0x3bff88][i % 3]); }
    H.sp(0.28, 0, -0.34, -0.2, 0xffffff, { sy: 1.3, sx: 1.1 }); H.cap(0.07, 0.15, 0, -0.1, -0.31, 0xffffff, { rz: Math.PI / 2 });
    H.rb(0.62, 0.07, 0.08, 0.03, 0, 0.2, -0.28, 0xe42d2d); // antifaz
  }
}
let _star; function starGeo() {
  if (_star) return _star; const s = new THREE.Shape(); const n = 5;
  for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU - Math.PI / 2, r = i % 2 ? 0.45 : 1; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? s.lineTo(x, y) : s.moveTo(x, y); }
  _star = new THREE.ShapeGeometry(s); _star.rotateY(Math.PI); return _star;
}

/* ---------- build a full rig ---------- */
const rigCache = new Map();
export function getRig(charId) { if (!rigCache.has(charId)) rigCache.set(charId, buildRig(charId)); return rigCache.get(charId); }

export function buildRig(id) {
  const c = CHARS.find(x => x.id === id);
  const root = new THREE.Group(); const tilt = new THREE.Group(); root.add(tilt);
  const frameMat = bendMat(new THREE.MeshStandardMaterial({ color: c.chair, roughness: 0.32, metalness: 0.35 }));
  const R = { id, c, root, tilt, frameMat, flames: [], t: Math.random() * 10, blink: 2 };
  /* chair frame (tinted) + accent (vertex colours) */
  const F = new GB(), A = new GB(); const W = 0xffffff;
  const big = id === 'cosmica' ? 0.44 : 0.38;
  F.rb(0.88, 0.1, 0.8, 0.05, 0, 0.55, 0.1, W); F.rb(0.88, 0.78, 0.1, 0.05, 0, 0.98, 0.5, W, { rx: 0.12 });
  for (const s of [-1, 1]) {
    F.rb(0.1, 0.09, 0.62, 0.04, s * 0.5, 0.86, 0.12, W); F.cy(0.04, 0.04, 0.32, 6, s * 0.5, 0.7, -0.12, W);
    F.rb(0.07, 0.07, 1.3, 0.03, s * 0.44, 0.36, -0.05, W); F.cy(0.035, 0.035, 0.5, 6, s * 0.3, 0.4, -0.52, W, { rx: 0.5 });
    F.cy(0.03, 0.03, 0.4, 6, s * 0.4, 1.25, 0.64, W, { rz: Math.PI / 2 * 0.0, rx: 0 }); A.cy(0.05, 0.05, 0.16, 8, s * 0.4, 1.46, 0.66, 0x222222, { rz: Math.PI / 2 });
    F.cy(0.03, 0.03, 0.35, 6, s * 0.43, 1.28, 0.62, W);
  }
  F.rb(0.7, 0.06, 0.34, 0.03, 0, 0.2, -0.74, W); F.rb(0.8, 0.3, 0.14, 0.05, 0, 0.55, 0.64, W);
  A.rb(0.8, 0.13, 0.72, 0.06, 0, 0.64, 0.1, id === 'super' ? 0xc01c3a : 0x3a3f4a); A.rb(0.76, 0.66, 0.1, 0.05, 0, 1.0, 0.43, id === 'super' ? 0xc01c3a : 0x3a3f4a, { rx: 0.12 });
  A.rb(0.66, 0.05, 0.28, 0.02, 0, 0.235, -0.74, 0x25282f);
  // thrusters
  for (const s of [-1, 1]) {
    const x = s * 0.34, big2 = id === 'rayo' ? 0.1 : 0;
    A.cy(0.14 + big2, 0.14 + big2, 0.72, 12, x, 0.66, 0.92, 0xe9edf5, { rx: Math.PI / 2 }); A.cy(0.145 + big2, 0.145 + big2, 0.1, 12, x, 0.66, 0.78, 0xd9322a, { rx: Math.PI / 2 }); A.cy(0.145 + big2, 0.145 + big2, 0.1, 12, x, 0.66, 1.0, 0xd9322a, { rx: Math.PI / 2 });
    A.sp(0.14 + big2, x, 0.66, 0.57, 0xe9edf5, {}); A.cy(0.19 + big2, 0.12, 0.22, 12, x, 0.66, 1.34, 0x30343c, { rx: Math.PI / 2 });
  }
  chairExtras(id, F, A, { c });
  const frame = mk(F, frameMat); tilt.add(frame);
  const acc = mk(A, M.rs); tilt.add(acc);
  /* wheels */
  R.wheels = [];
  const wg = wheelGeo(big, 0x1e2026, 0xdfe3ea, id === 'cosmica' ? 8 : 6, id === 'cosmica');
  for (const s of [-1, 1]) { const g = new THREE.Group(); g.position.set(s * 0.6, big, 0.18); const m = new THREE.Mesh(wg, M.rs); m.castShadow = true; g.add(m); tilt.add(g); R.wheels.push(g); }
  const cg = wheelGeo(0.15, 0x1e2026, 0xdfe3ea, 4);
  for (const s of [-1, 1]) { const g = new THREE.Group(); g.position.set(s * 0.34, 0.15, -0.85); const m = new THREE.Mesh(cg, M.rs); m.castShadow = true; g.add(m); tilt.add(g); R.wheels.push(g); }
  /* flames */
  for (const s of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(s * 0.34, 0.66, 1.46);
    const o = new THREE.Mesh(flameGeo, M.flameO); o.scale.set(0.22, 0.22, 1.2); const i = new THREE.Mesh(flameGeo, M.flameI); i.scale.set(0.12, 0.12, 0.8);
    o.renderOrder = 5; i.renderOrder = 6;
    g.add(o, i); tilt.add(g); R.flames.push({ g, o, i, base: s });
  }
  /* rider */
  const body = new THREE.Group(); body.position.set(0, 0.66, 0.15); tilt.add(body); R.body = body;
  const T = new GB();
  const OUT = { paco: c.vest, rayo: c.vest, rockero: 0x1c1c20, pirata: 0x1f1f2e, cosmica: 0xf4f4f8, ole: 0xc0201c, disco: 0xffd23c, super: 0x2a50c8 }[id] || c.shirt;
  T.rb(0.66, 0.72, 0.48, 0.22, 0, 0.36, 0, c.shirt);
  T.sp(0.3, 0, 0.26, -0.03, OUT, { sx: 1.1, sy: 0.9, sz: 0.88 }); // barriguita redondeada
  T.sp(0.3, 0, 0.6, -0.01, OUT, { sx: 1.13, sy: 0.5, sz: 0.82 }); // hombros caídos hacia el cuello
  T.cy(0.1, 0.115, 0.34, 12, 0, 0.74, -0.04, c.skin); // cuello
  if (id === 'paco') { T.rb(0.68, 0.5, 0.5, 0.18, 0, 0.3, 0.01, c.vest); for (let i = 0; i < 3; i++) T.sp(0.03, 0, 0.12 + i * 0.14, -0.27, 0xe9dcc0); T.rb(0.1, 0.3, 0.04, 0.02, 0, 0.62, -0.24, 0xe9dcc0, {}); }
  if (id === 'rayo') { T.rb(0.68, 0.5, 0.5, 0.18, 0, 0.28, 0.01, c.vest); T.bx(0.05, 0.3, 0.03, 0.05, 0.4, -0.26, 0xff4fa0, { rz: 0.5 }); }
  if (id === 'rockero') { T.rb(0.7, 0.7, 0.5, 0.2, 0, 0.36, 0.01, 0x1c1c20); T.bx(0.06, 0.6, 0.03, 0, 0.35, -0.26, 0x777777); for (const s of [-1, 1]) { T.sp(0.045, s * 0.3, 0.64, -0.2, 0xcfcfcf); T.sp(0.045, s * 0.3, 0.52, -0.22, 0xcfcfcf); } T.rb(0.22, 0.04, 0.04, 0.01, 0, 0.42, -0.27, 0xd02a2a); }
  if (id === 'pirata') { T.rb(0.7, 0.62, 0.5, 0.2, 0, 0.32, 0.01, 0x1f1f2e); for (let i = 0; i < 4; i++) T.sp(0.032, 0.0, 0.12 + i * 0.12, -0.26, 0xe9b923); T.rb(0.7, 0.07, 0.5, 0.03, 0, 0.18, 0.01, 0x6a4a2a); T.bx(0.15, 0.62, 0.03, 0, 0.35, -0.255, 0xe8dfc8, { rz: 0.3 }); }
  if (id === 'cosmica') { T.rb(0.68, 0.7, 0.5, 0.2, 0, 0.36, 0.01, 0xf4f4f8); T.rb(0.22, 0.2, 0.04, 0.03, 0, 0.42, -0.27, 0x3a7aff); T.sp(0.04, -0.08, 0.42, -0.3, 0xff4a4a); T.sp(0.04, 0.08, 0.42, -0.3, 0x4aff7a); T.cy(0.1, 0.1, 0.1, 8, 0, 0.78, 0, 0xcfcfd8); }
  if (id === 'ole') { T.rb(0.7, 0.6, 0.5, 0.2, 0, 0.33, 0.01, 0xc0201c); for (let i = 0; i < 5; i++) { T.bx(0.5, 0.025, 0.02, 0, 0.12 + i * 0.1, -0.255, 0xe9b923); } for (const s of [-1, 1]) T.sp(0.07, s * 0.36, 0.6, 0, 0xe9b923); T.bx(0.08, 0.5, 0.03, 0, 0.35, -0.255, 0xe9b923); }
  if (id === 'disco') { T.rb(0.7, 0.7, 0.5, 0.2, 0, 0.36, 0.01, 0xffd23c); T.add(starGeo(), 0xff4fd8, { x: 0, y: 0.34, z: -0.26, s: 0.17 }); for (const s of [-1, 1]) T.sp(0.1, s * 0.4, 0.62, 0, 0xff4fd8); }
  if (id === 'super') { T.rb(0.7, 0.72, 0.5, 0.2, 0, 0.36, 0.01, 0x2a50c8); T.rb(0.3, 0.22, 0.04, 0.03, 0, 0.4, -0.27, 0xffc928); T.bx(0.03, 0.14, 0.03, 0, 0.4, -0.3, 0xe42d2d); T.bx(0.12, 0.03, 0.03, 0, 0.45, -0.3, 0xe42d2d); T.rb(0.72, 0.07, 0.5, 0.03, 0, 0.15, 0.01, 0xffc928); }
  T.tor(0.15, 0.058, 0, 0.71, -0.04, id === 'cosmica' ? 0xcfcfd8 : (id === 'rockero' ? 0x2a2a30 : c.shirt), { rx: Math.PI / 2, seg: 14 }); // cuello de camisa tapando la unión
  const torso = mk(T, M.rv); body.add(torso);
  // cape
  if (id === 'ole' || id === 'super' || id === 'rayo') {
    const cg2 = new GB(); const col = id === 'super' ? 0xe42d2d : id === 'ole' ? 0xd01c1c : 0xffe23c;
    cg2.rb(0.66, 0.95, 0.04, 0.02, 0, -0.47, 0, col); if (id === 'super') cg2.rb(0.5, 0.06, 0.05, 0.02, 0, -0.9, 0, 0xffc928);
    const cape = mk(cg2, M.rv); cape.position.set(0, 0.7, 0.26); body.add(cape); R.cape = cape;
  }
  // parrot
  if (id === 'pirata') {
    const pg = new GB(); pg.sp(0.1, 0, 0, 0, 0x2fc45a, { sy: 1.2 }); pg.sp(0.08, 0, 0.14, -0.04, 0x2fc45a); pg.cone(0.03, 0.08, 5, 0, 0.14, -0.12, 0xffb02a, { rx: -Math.PI / 2 }); pg.sp(0.02, 0.05, 0.16, -0.08, 0xffffff); pg.rb(0.07, 0.04, 0.22, 0.02, 0, -0.14, 0.12, 0xe03030, { rx: 0.3 }); pg.rb(0.06, 0.03, 0.15, 0.02, 0.1, 0, 0, 0xf0d02a);
    const par = mk(pg, M.rv); par.position.set(-0.4, 0.82, 0.02); body.add(par); R.parrot = par;
  }
  /* arms */
  R.arms = [];
  for (const s of [-1, 1]) {
    const up = new THREE.Group(); up.position.set(s * 0.37, 0.64, 0); body.add(up);
    const AG = new GB(); AG.sp(0.125, 0, 0.0, 0, id === 'rockero' ? 0x1c1c20 : (id === 'cosmica' ? 0xf4f4f8 : c.shirt)); AG.cap(0.1, 0.22, 0, -0.2, 0, id === 'rockero' ? 0x1c1c20 : (id === 'cosmica' ? 0xf4f4f8 : c.shirt));
    const um = mk(AG, M.rv); up.add(um);
    const fo = new THREE.Group(); fo.position.set(0, -0.4, 0); up.add(fo);
    const FG = new GB(); FG.cap(0.085, 0.2, 0, -0.17, 0, id === 'rockero' ? 0x1c1c20 : (id === 'cosmica' ? 0xf4f4f8 : c.shirt)); FG.sp(0.095, 0, -0.34, 0, id === 'cosmica' ? 0xe6e6f2 : c.skin);
    if (id === 'pirata' && s > 0) FG.cone(0.04, 0.2, 6, 0, -0.45, 0, 0xcfd6e6, { rx: Math.PI });
    fo.add(mk(FG, M.rv)); R.arms.push({ up, fo, s });
  }
  /* legs & blanket (don't rotate with torso) */
  const L = new GB();
  for (const s of [-1, 1]) {
    L.rb(0.22, 0.22, 0.58, 0.09, s * 0.17, 0.76, -0.12, c.pants); L.rb(0.2, 0.55, 0.2, 0.09, s * 0.17, 0.5, -0.56, c.pants, { rx: 0.18 }); L.rb(0.22, 0.12, 0.34, 0.05, s * 0.17, 0.27, -0.78, c.shoe);
    if (id === 'cosmica' || id === 'disco') L.rb(0.23, 0.04, 0.35, 0.02, s * 0.17, 0.22, -0.78, 0xffffff);
  }
  const blk = id === 'super' ? 0xffc928 : c.blanket;
  L.rb(0.64, 0.17, 0.64, 0.08, 0, 0.83, -0.16, blk); const dk = new THREE.Color(blk).multiplyScalar(0.55).getHex();
  for (let i = -1; i <= 1; i++) { L.bx(0.02, 0.01, 0.64, i * 0.19, 0.915, -0.16, dk); L.bx(0.64, 0.01, 0.02, 0, 0.915, -0.16 + i * 0.19, dk); }
  L.rb(0.64, 0.4, 0.15, 0.06, 0, 0.7, -0.5, blk, { rx: -0.35 });
  tilt.add(mk(L, M.rv));
  /* head */
  const head = new THREE.Group(); head.position.set(0, 0.86, -0.04); body.add(head); R.head = head;
  const H = new GB();
  H.sp(0.31, 0, 0.3, 0, c.skin, { sy: 1.04, seg: 14 }); for (const s of [-1, 1]) { H.sp(0.07, s * 0.3, 0.28, 0.02, c.skin); H.sp(0.05, s * 0.32, 0.28, 0.02, 0xe39b86); }
  H.sp(0.075, 0, 0.24, -0.3, 0xe39b86, { sy: 1.1, sz: 1.1 }); for (const s of [-1, 1]) H.sp(0.06, s * 0.19, 0.18, -0.24, 0xf08a8a, { sz: 0.5, s: 1 });
  for (const s of [-1, 1]) H.cap(0.028, 0.1, s * 0.12, 0.46, -0.25, id === 'rockero' || id === 'ole' ? 0x333333 : 0xf2f2f2, { rz: Math.PI / 2 - s * 0.18 });
  // headParts positions are relative to head centre y=0.3 -> offset via nested group
  const HP = new GB(); headParts(id, HP, c);
  const faceG = new GB(); // eyes (separate for blink)
  for (const s of [-1, 1]) { faceG.sp(0.068, s * 0.12, 0.35, -0.26, 0xffffff); faceG.sp(0.04, s * 0.12, 0.35, -0.315, 0x15151a); faceG.sp(0.012, s * 0.108, 0.36, -0.348, 0xffffff); }
  const grin = new GB(); grin.rb(0.2, 0.09, 0.06, 0.035, 0, 0.12, -0.285, 0x4a1a1a); grin.rb(0.17, 0.045, 0.05, 0.02, 0, 0.14, -0.3, 0xffffff); for (let i = -1; i <= 1; i++) grin.bx(0.008, 0.04, 0.01, i * 0.04, 0.14, -0.33, 0xbcb5aa);
  const scream = new GB(); scream.sp(0.075, 0, 0.1, -0.29, 0x3a0f10, { sz: 0.5, sy: 1.1 }); scream.sp(0.04, 0, 0.07, -0.31, 0xff7a8a, { sz: 0.4 });
  head.add(mk(H, M.rv)); R.hair = mk(HP, M.rv); R.hair.position.y = 0.3; HP.mk === 'helmet'; head.add(R.hair);
  // HP positions were authored relative to head centre; shift by -0.3 not needed because we offset the mesh +0.3
  R.eyes = mk(faceG, M.rv, false); head.add(R.eyes); R.eyes.position.y = 0; R.grin = mk(grin, M.rv, false); head.add(R.grin); R.scream = mk(scream, M.rv, false); R.scream.visible = false; head.add(R.scream);
  if (id === 'cosmica') { const hm = new THREE.Mesh(new THREE.SphereGeometry(0.46, 18, 12), M.glass); hm.position.set(0, 0.3, 0); head.add(hm); R.helmet = hm; const ring = new GB(); ring.tor(0.4, 0.05, 0, 0, 0, 0xd9d9e6, { rx: Math.PI / 2, seg: 16 }); const rm = mk(ring, M.rv); rm.position.y = -0.02; head.add(rm); }
  /* cartel TURBO en el respaldo + banderín: se lee desde atrás */
  { const cvs = document.createElement('canvas'); cvs.width = 256; cvs.height = 200; const x = cvs.getContext('2d');
    x.fillStyle = '#1a2a6a'; x.beginPath(); x.roundRect(6, 6, 244, 188, 34); x.fill(); x.lineWidth = 10; x.strokeStyle = '#ffe45a'; x.stroke();
    x.fillStyle = '#ffe45a'; x.font = '700 78px Fredoka, Trebuchet MS, sans-serif'; x.textAlign = 'center'; x.fillText('TURBO', 128, 98);
    x.fillStyle = '#ff8a1a'; x.beginPath(); x.moveTo(140, 112); x.lineTo(92, 112); x.lineTo(118, 138); x.lineTo(70, 176); x.lineTo(168, 130); x.lineTo(142, 130); x.closePath(); x.fill(); x.lineWidth = 5; x.strokeStyle = '#fff'; x.stroke();
    const tex = new THREE.CanvasTexture(cvs); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const dm = bendMat(new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false })); const dec = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.48), dm); dec.position.set(0, 1.0, 0.555 + 0.04); dec.rotation.x = 0.12; tilt.add(dec);
    const pole = new GB(); pole.cy(0.018, 0.018, 1.9, 6, 0, 0.95, 0, 0xcfd4dc); pole.sp(0.045, 0, 1.92, 0, 0xffd23c, { seg: 6 });
    const pm = mk(pole, M.rs); const fg = new THREE.Group(); fg.position.set(-0.46, 1.3, 0.74); fg.add(pm); tilt.add(fg);
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute([0, 1.88, 0, 0, 1.5, 0, -0.55, 1.69, 0.04], 3)); tg.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    const pen = new THREE.Mesh(tg, bendMat(new THREE.MeshStandardMaterial({ color: c.vest === 0x1d1d1d ? 0xff4f4f : c.vest, roughness: 0.5, emissive: 0x331100, side: THREE.DoubleSide }))); pen.castShadow = false;
    const pg = new THREE.Group(); pg.add(pen); fg.add(pg); R.flag = pg; }
  /* shield bubble + ring (used by game) */
  R.shield = new THREE.Mesh(new THREE.SphereGeometry(1.35, 20, 14), new THREE.MeshBasicMaterial({ color: 0x4dff9a, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); R.shield.position.set(0, 0.95, 0.1); R.shield.visible = false; tilt.add(R.shield); bendMat(R.shield.material);
  R.belt = null;
  { const ms = []; root.traverse(o => { if (o.isMesh && o !== R.shield && o.material && !o.material.transparent && o.material.type !== 'MeshBasicMaterial') ms.push(o); }); ms.forEach(m => addOutline(m, 0.026)); }
  root.traverse(o => { if (o.isMesh && o !== R.shield) { o.frustumCulled = false; } });
  applySkin(R, 'def');
  return R;
}

export function applySkin(R, skinId) {
  const s = SKINS.find(x => x.id === skinId) || SKINS[0]; R.skinId = s.id; R.rainbow = !!s.rainbow;
  const m = R.frameMat;
  m.color.set(s.color == null ? R.c.chair : s.color); m.emissive.set(s.emi || 0x000000); m.metalness = s.metal != null ? s.metal : (R.id === 'super' ? 0.9 : 0.35); m.roughness = s.metal ? 0.22 : 0.32;
  if (R.id === 'super' && !s.color) { m.emissive.set(0x3a2a00); }
}
export function setRigLocked(R, locked) {
  R.root.traverse(o => { if (o.isMesh && o.material) { /* handled by global tint */ } });
  R.locked = locked;
}

const _tmp = new THREE.Vector3();
/* s: {speed, roll, yawIn, air(0/1), vy, slide(0..1), turbo, scream, crash, idle, stumble, laneVel} */
export function poseRig(R, s, dt, time) {
  R.t += dt; const t = R.t; const sp = s.speed || 0;
  const rum = s.idle ? 0.004 : 0.006 + sp * 0.00018 + (s.turbo ? 0.01 : 0);
  // wheels
  const wr = sp * dt / 0.38; R.wheels.forEach((w, i) => { w.rotation.x -= wr * (i < 2 ? 1 : 2.4); });
  // chair tilt
  const air = s.air ? 1 : 0;
  const targRoll = (s.roll || 0), targPitch = (air ? clamp(-s.vy * 0.018, -0.35, 0.35) : 0) + (s.slide ? 0.05 : 0) + (s.idle ? 0 : -0.04) + (s.turbo ? -0.18 : 0) + (s.wheelie || 0);
  R.tilt.rotation.z = damp(R.tilt.rotation.z, targRoll, 14, dt);
  R.tilt.rotation.x = damp(R.tilt.rotation.x, -targPitch, 12, dt);
  R.tilt.position.y = (s.idle ? Math.sin(t * 3) * 0.008 : (Math.sin(t * 38) * rum * 2));
  R.root.rotation.y = damp(R.root.rotation.y, (s.yaw || 0), 12, dt);
  // body
  const lean = s.slide ? 1.25 : (s.turbo ? -0.25 : -0.1 - sp * 0.004);
  R.body.rotation.x = damp(R.body.rotation.x, lean, 14, dt);
  R.body.position.y = damp(R.body.position.y, s.slide ? 0.52 : 0.66, 16, dt);
  R.body.position.z = damp(R.body.position.z, s.slide ? 0.32 : 0.15, 16, dt);
  R.head.rotation.x = damp(R.head.rotation.x, s.slide ? -1.1 : (air ? -0.15 : 0) + Math.sin(t * 2.2) * (s.idle ? 0.04 : 0.01), 14, dt);
  R.head.rotation.y = damp(R.head.rotation.y, s.glance ? 2.8 : 0, 8, dt); if (R.flag) R.flag.rotation.y = Math.sin(t * 9) * 0.28 + Math.sin(t * 5.3) * 0.12;
  R.head.rotation.z = damp(R.head.rotation.z, -(s.roll || 0) * 0.6 + (s.idle ? Math.sin(t * 1.3) * 0.05 : 0), 10, dt);
  R.head.rotation.y = damp(R.head.rotation.y, s.idle ? Math.sin(t * 0.8) * 0.3 : 0, 6, dt);
  // arms
  const up = air || s.cheer;
  R.arms.forEach((a, i) => {
    const wave = s.idle ? Math.sin(t * 3 + i) * 0.25 : 0;
    const tu = s.crash ? 2.6 + Math.sin(t * 25 + i) * 0.5 : (up ? 2.9 : (s.slide ? 1.5 : 1.0)) + wave + (s.idle && R.idleWave > 0 && i === 1 ? 1.8 : 0);
    const tf = s.crash ? 0.8 : (up ? 0.25 : 0.55);
    a.up.rotation.x = damp(a.up.rotation.x, tu, 16, dt); a.fo.rotation.x = damp(a.fo.rotation.x, tf, 16, dt);
    a.up.rotation.z = damp(a.up.rotation.z, a.s * (up ? 0.35 : 0.05), 12, dt);
  });
  if (R.idleWave > 0) R.idleWave -= dt; else if (s.idle && Math.random() < dt * 0.15) R.idleWave = 1.6;
  // face
  R.blink -= dt; if (R.blink < 0) R.blink = 2 + Math.random() * 3; R.eyes.scale.y = R.blink < 0.12 ? 0.12 : 1;
  const scream = s.scream || s.crash || (air && s.vy > 0 && s.turbo);
  R.grin.visible = !scream; R.scream.visible = !!scream;
  // cape & parrot
  if (R.cape) R.cape.rotation.x = damp(R.cape.rotation.x, 0.25 + Math.min(1, sp / 30) * 0.9 + Math.sin(t * 12) * 0.08 * Math.min(1, sp / 20), 8, dt);
  if (R.parrot) { R.parrot.position.y = 0.82 + Math.abs(Math.sin(t * 6)) * 0.03 * (sp > 1 ? 1 : 0.3); R.parrot.rotation.z = Math.sin(t * 5) * 0.12; }
  // flames
  const fl = s.crash ? 0 : (s.turbo ? 2.4 : (s.idle ? 0.5 : 1)) * (0.8 + Math.min(0.4, sp / 70));
  R.flames.forEach((f, i) => {
    const fk = fl * (0.85 + Math.random() * 0.3); f.g.visible = fl > 0.01;
    f.o.scale.set(0.2 * (0.9 + fl * 0.1), 0.2 * (0.9 + fl * 0.1), 1.0 * fk + 0.15); f.i.scale.set(0.11, 0.11, 0.65 * fk + 0.1);
  });
  // shield
  if (R.shield.visible) { R.shield.rotation.y += dt; const k = 1 + Math.sin(t * 6) * 0.03; R.shield.scale.setScalar(k * (s.shieldWarn ? (Math.sin(t * 30) > 0 ? 1 : 0.9) : 1)); }
  if (R.rainbow) { R.frameMat.color.setHSL((t * 0.4) % 1, 0.9, 0.55); R.frameMat.emissive.setHSL((t * 0.4) % 1, 0.9, 0.2); }
}
