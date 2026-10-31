// Los personajes locos de Mueblópolis (NPC): modelos procedurales + comportamiento.
import * as THREE from 'three';
import { GB, lighten, darken } from './geo.js?v=10';
import { PAL, part, makeRebel, makeAlcalde } from './models.js?v=10';
const PI = Math.PI, INK = 0x2a1840;
const pick = (a, v) => a[v % a.length];

function eyes(g, y, z, sp, r, o = {}) {
  for (const s of [-1, 1]) {
    g.sph(r, PAL.white, s * sp, y, z, 1, 1.12, 0.55, 10); g.sph(r * 0.5, INK, s * sp + (o.dx || 0), y + (o.dy || 0), z + r * 0.45, 1, 1.1, 0.6, 8); g.sph(r * 0.18, PAL.white, s * sp + r * 0.2, y + r * 0.3, z + r * 0.7, 1, 1, 1, 4);
    if (o.brow) g.box(r * 2, r * 0.45, r * 0.3, INK, s * sp, y + r * 1.3, z + 0.02, 0, 0, s * o.brow);
  }
}
function smile(g, y, z, w = 0.3, col = 0x8a1f45) { g.sph(w * 0.5, col, 0, y, z, 1.4, 0.7, 0.4, 10); g.sph(w * 0.28, 0xff6f8f, 0, y - w * 0.15, z + 0.01, 1.3, 0.5, 0.4, 8); }
const limbs = (g, x, col) => { g.cyl(0.07, 0.07, 0.35, col, x, 0, 0, 6); g.rbox(0.26, 0.12, 0.38, 0.05, 0xffffff, x, 0, 0.07, 0, 0, 0, 2); g.box(0.26, 0.04, 0.2, PAL.coral, x, 0.1, 0.1); };

// ---------------- modelos ----------------
function mkTostadora() {
  const root = new THREE.Group(), g = new GB(); const c1 = 0xd8e0ee, c2 = PAL.coral;
  for (const s of [-1, 1]) limbs(g, s * 0.4, 0xcfd8e8);
  g.rbox(1.7, 1.0, 1.1, 0.3, c1, 0, 0.4, 0, 0, 0, 0, 4); g.rbox(1.74, 0.2, 1.14, 0.1, c2, 0, 0.72, 0, 0, 0, 0, 2); g.rbox(1.4, 0.06, 0.34, 0.03, INK, 0, 1.4, 0.22, 0, 0, 0, 1); g.rbox(1.4, 0.06, 0.34, 0.03, INK, 0, 1.4, -0.22, 0, 0, 0, 1);
  g.cyl(0.07, 0.07, 0.6, 0x8da0bd, 0.92, 0.7, 0, 8); g.sph(0.15, c2, 0.92, 1.3, 0, 1, 1, 1, 8); g.sph(0.1, PAL.sun, -0.6, 0.62, 0.57, 1, 1, 0.5, 8); g.sph(0.1, 0x3fe0b0, -0.4, 0.62, 0.57, 1, 1, 0.5, 8);
  eyes(g, 1.0, 0.55, 0.3, 0.2, { brow: 0.2 }); smile(g, 0.68, 0.57, 0.5, 0x8a1f45); g.box(0.4, 0.07, 0.05, PAL.white, 0, 0.74, 0.6);
  const body = part(g); root.add(body);
  const toasts = []; for (const z of [0.22, -0.22]) { const t = new THREE.Group(); const tg = new GB(); tg.rbox(1.15, 0.9, 0.2, 0.12, 0xf0c27a, 0, 0, 0, 0, 0, 0, 3); tg.rbox(0.95, 0.7, 0.22, 0.1, 0xffe0a6, 0, 0.1, 0, 0, 0, 0, 2); tg.sph(0.07, 0xb06b2a, 0.2, 0.6, 0.12, 1, 1, 0.5, 6); t.add(part(tg)); t.position.set(0, 1.0, z); root.add(t); toasts.push(t); }
  const arms = []; for (const s of [-1, 1]) { const a = new THREE.Group(); a.position.set(s * 0.92, 0.9, 0); const ag = new GB(); ag.cyl(0.07, 0.07, 0.6, c1, 0, -0.6, 0, 6); ag.sph(0.13, 0xffffff, 0, 0.0, 0, 1, 1, 1, 8); a.add(part(ag)); a.rotation.z = s * 0.3; root.add(a); arms.push(a); }
  root.userData = { h: 2.0, body, toasts, arms }; return root;
}
function mkLavadora() {
  const root = new THREE.Group(), g = new GB(); const c1 = 0xcff7f0, c2 = 0x2fd0d8;
  for (const s of [-1, 1]) { g.cyl(0.18, 0.2, 0.4, 0x8da0bd, s * 1.1, 0, 0.9, 8); g.cyl(0.18, 0.2, 0.4, 0x8da0bd, s * 1.1, 0, -0.9, 8); }
  g.rbox(3.2, 3.2, 2.8, 0.4, c1, 0, 0.4, 0, 0, 0, 0, 4); g.rbox(3.2, 0.75, 2.84, 0.15, c2, 0, 2.85, 0, 0, 0, 0, 3);
  for (let i = 0; i < 3; i++) { g.cyl(0.16, 0.16, 0.12, PAL.white, -1.0 + i * 0.5, 3.0, 1.4, 12, PI / 2, 0, 0); g.box(0.04, 0.2, 0.05, INK, -1.0 + i * 0.5, 2.98, 1.48, 0, 0, i * 0.7); }
  g.rbox(0.8, 0.28, 0.1, 0.05, INK, 0.95, 2.95, 1.4, 0, 0, 0, 2); for (let i = 0; i < 4; i++) g.box(0.1, 0.1, 0.05, i % 2 ? PAL.lime : PAL.sun, 0.7 + i * 0.17, 2.97, 1.46);
  g.torus(1.15, 0.2, 0xffffff, 0, 1.75, 1.42, 0, 0, 0, PI * 2, 26); g.cyl(1.05, 1.05, 0.2, 0x9fd8ff, 0, 1.75, 1.3, 26, PI / 2, 0, 0);
  const body = part(g); root.add(body);
  const drum = new THREE.Group(); drum.position.set(0, 1.75, 1.5); const dg = new GB(); const cl = [PAL.coral, PAL.sun, PAL.pink, PAL.mint, PAL.violet, PAL.sky];
  for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; dg.sph(0.28, cl[i], Math.cos(a) * 0.65, Math.sin(a) * 0.65, 0, 1.2, 0.8, 0.5, 8, 0, 0, a); } drum.add(part(dg, false)); root.add(drum);
  const fg = new GB(); eyes(fg, 0.15, 0, 0.36, 0.26, { dx: 0 }); smile(fg, -0.35, 0.02, 0.6); fg.sph(0.08, 0xff8fa6, -0.7, -0.2, 0, 1.2, 0.7, 0.4, 6); fg.sph(0.08, 0xff8fa6, 0.7, -0.2, 0, 1.2, 0.7, 0.4, 6);
  const face = part(fg, false); face.position.set(0, 1.75, 1.62); root.add(face);
  const arms = []; for (const s of [-1, 1]) { const a = new THREE.Group(); a.position.set(s * 1.72, 2.0, 0); const ag = new GB(); ag.cyl(0.12, 0.12, 1.1, 0xffffff, 0, 0, 0, 8); ag.sph(0.25, PAL.sun, 0, 1.15, 0, 1, 1, 1, 8); ag.add(new THREE.SphereGeometry(0.2, 8, 6), PAL.sun, 0.18, 1.3, 0, 0, 0, 0, 1, 1, 1); a.add(part(ag)); a.rotation.z = -s * 2.2; root.add(a); arms.push(a); }
  const lg = new GB(); lg.cone(0.2, 0.5, 0xff6b5e, 0, 0, 0, 4); const bubbles = [];
  root.userData = { h: 3.7, body, drum, face, arms }; return root;
}
function mkAlfombra(v = 0) {
  const root = new THREE.Group(), g = new GB(); const cols = [[0x7b3fe4, 0xffd23f, 0xff74c4], [0xe8453c, 0xfff0d2, 0x2ad4ff], [0x1fb8a8, 0xffe27a, 0xff6b5e]][v % 3];
  const W = 3.6, D = 2.6;
  const geo = new THREE.BoxGeometry(W, 0.16, D, 14, 1, 8);
  g.add(geo, (x, y, z) => { const ax = Math.abs(x) / (W / 2), az = Math.abs(z) / (D / 2); if (ax > 0.9 || az > 0.86) return cols[1]; if (ax > 0.78 || az > 0.7) return cols[2]; return (Math.floor((x + 5) * 2) + Math.floor((z + 5) * 2)) % 2 ? cols[0] : lighten(cols[0], 0.15); });
  for (let i = -8; i <= 8; i++) { g.box(0.1, 0.06, 0.45, cols[1], i * 0.21, 0.04, D / 2 + 0.18); g.box(0.1, 0.06, 0.45, cols[1], i * 0.21, 0.04, -D / 2 - 0.18); }
  g.rbox(0.9, 0.12, 0.9, 0.05, cols[2], 0, 0.14, 0.0, 0, 0, 0, 1);
  eyes(g, 0.35, 0.85, 0.35, 0.22, { brow: -0.2 }); smile(g, 0.2, 0.9, 0.5);
  const body = part(g); body.children[0].visible = true; root.add(body);
  root.userData = { h: 0.8, body }; return root;
}
function mkNevera(cols) {
  const root = new THREE.Group(), g = new GB(); const [c1, c2] = Array.isArray(cols) ? cols : [0x5a3fa0, 0x7a60c8];
  for (const s of [-1, 1]) { g.cyl(0.3, 0.34, 0.6, 0x2a1840, s * 1.3, 0, 0.3, 8); g.rbox(0.9, 0.3, 1.2, 0.12, 0x2a1840, s * 1.3, 0, 0.5, 0, 0, 0, 2); }
  g.rbox(4.4, 5.6, 3.5, 0.5, c1, 0, 0.5, 0, 0, 0, 0, 4); g.rbox(4.0, 2.0, 0.2, 0.1, c2, 0, 3.7, 1.7, 0, 0, 0, 2); g.rbox(4.0, 2.7, 0.2, 0.1, c2, 0, 0.75, 1.7, 0, 0, 0, 2); g.box(4.1, 0.1, 0.25, INK, 0, 3.55, 1.72);
  g.cyl(0.1, 0.1, 1.5, 0xe6eef8, 1.6, 4.2, 1.95, 8); g.cyl(0.1, 0.1, 1.5, 0xe6eef8, 1.6, 1.0, 1.95, 8);
  eyes(g, 4.7, 1.82, 0.7, 0.42, { brow: 0.45 }); g.box(1.8, 0.2, 0.2, 0x1d1530, 0, 5.4, 1.8, 0, 0, 0.0);
  g.sph(0.5, 0xe6eef8, 0, 3.9, 1.85, 0.9, 0.9, 0.6, 10); // nariz-hielo
  g.rbox(1.9, 0.5, 0.14, 0.2, 0x240d3c, 0, 3.7, 1.85, 0, 0, 0, 2); for (let i = 0; i < 5; i++) g.cone(0.14, 0.3, 0xe6f6ff, -0.7 + i * 0.35, 3.95, 1.93, 4, PI, 0, 0);
  // corbata y imanes
  g.cone(0.3, 0.5, 0xff3d6e, 0, 3.0, 1.9, 4, 0, 0, 0); g.cyl(0.36, 0.2, 1.3, 0xff3d6e, 0, 1.5, 1.88, 4); g.sph(0.2, 0xff3d6e, 0, 3.0, 1.9, 1.2, 1, 0.8, 6);
  for (let i = 0; i < 6; i++) g.rbox(0.38, 0.38, 0.06, 0.05, [PAL.sun, PAL.lime, PAL.pink, PAL.sky, PAL.coral, PAL.mint][i], -1.6 + (i % 3) * 0.5, 1.2 + Math.floor(i / 3) * 0.55, 1.82);
  for (const s of [-1, 1]) g.cone(0.3, 0.9, 0xfff0e0, s * 1.5, 6.0, 0, 8, 0, 0, s * -0.4);
  const body = part(g); root.add(body);
  const arms = []; for (const s of [-1, 1]) { const a = new THREE.Group(); a.position.set(s * 2.3, 3.4, 0.3); const ag = new GB(); ag.cyl(0.2, 0.18, 1.5, c1, 0, -1.5, 0, 8); ag.sph(0.42, 0xffffff, 0, 0.0, 0, 1, 1, 1, 10); ag.sph(0.18, 0xffffff, s * 0.3, 0.2, 0.2, 1, 1, 1, 6); a.add(part(ag)); a.rotation.z = s * 0.4; root.add(a); arms.push(a); }
  const brow = new THREE.Group(); root.userData = { h: 6.2, body, arms }; return root;
}
function mkCuco() {
  const root = new THREE.Group(), g = new GB(); const wood = PAL.woodL;
  for (const s of [-1, 1]) { g.cyl(0.1, 0.12, 0.4, PAL.woodD, s * 0.45, 0, 0, 6); g.rbox(0.36, 0.12, 0.5, 0.05, PAL.woodD, s * 0.45, 0, 0.08, 0, 0, 0, 2); }
  g.rbox(2.0, 1.9, 1.5, 0.2, wood, 0, 0.4, 0, 0, 0, 0, 3); g.cone(1.65, 1.2, 0xe0453a, 0, 2.3, 0, 4, 0, PI / 4, 0); g.rbox(0.8, 0.5, 0.14, 0.06, PAL.woodD, 0, 2.55, 0.78, 0, 0, 0, 2);
  g.cyl(0.78, 0.78, 0.12, 0xfff7e0, 0, 1.0, 0.76, 22, PI / 2, 0, 0); g.torus(0.78, 0.07, PAL.gold, 0, 1.4, 0.8, 0, 0, 0, PI * 2, 22);
  eyes(g, 1.6, 0.83, 0.28, 0.16); g.box(0.05, 0.4, 0.04, INK, 0, 1.2, 0.84, 0, 0, 0.5); g.box(0.04, 0.28, 0.04, INK, 0, 1.28, 0.84, 0, 0, -0.9); smile(g, 1.0, 0.82, 0.3);
  g.cyl(0.02, 0.02, 0.8, PAL.gold, -0.5, -0.4, 0.55, 4); g.cone(0.18, 0.4, 0x8a5a2b, -0.5, -1.0, 0.55, 8, PI, 0, 0); g.cyl(0.02, 0.02, 0.9, PAL.gold, 0.5, -0.5, 0.55, 4); g.cone(0.18, 0.4, 0x8a5a2b, 0.5, -1.1, 0.55, 8, PI, 0, 0);
  const body = part(g); root.add(body);
  const bird = new THREE.Group(); const bg = new GB(); bg.sph(0.22, 0x3fb9ff, 0, 0, 0, 1, 1, 1.2, 8); bg.sph(0.15, 0x3fb9ff, 0, 0.15, 0.2, 1, 1, 1, 8); bg.cone(0.07, 0.2, 0xffd23f, 0, 0.15, 0.4, 4, PI / 2, 0, 0); bg.sph(0.04, INK, 0.08, 0.2, 0.3, 1, 1, 1, 4); bg.sph(0.04, INK, -0.08, 0.2, 0.3, 1, 1, 1, 4); bg.sph(0.15, 0xffffff, 0, -0.05, -0.2, 1, 0.6, 1.4, 6);
  bird.add(part(bg, false)); bird.position.set(0, 2.55, 0.5); bird.scale.setScalar(0.01); root.add(bird);
  root.userData = { h: 3.6, body, bird }; return root;
}
function mkOsito() {
  const root = new THREE.Group(), g = new GB(); const fur = 0xc98a55, pj = 0x9fd8ff;
  for (const s of [-1, 1]) { g.sph(0.28, fur, s * 0.35, 0.25, 0.1, 1, 0.9, 1.3, 10); g.sph(0.18, 0xf1c8a0, s * 0.35, 0.18, 0.32, 1, 0.6, 0.8, 8); }
  g.sph(0.82, (x, y) => (Math.floor((y + 5) * 4.2) % 2 ? pj : 0xffffff), 0, 1.0, 0, 1, 1.05, 0.95, 18); g.sph(0.28, 0xf1c8a0, 0, 0.9, 0.62, 1, 1.2, 0.6, 8);
  g.sph(0.62, fur, 0, 2.05, 0, 1.05, 0.95, 0.95, 18); for (const s of [-1, 1]) { g.sph(0.24, fur, s * 0.48, 2.6, 0, 1, 1, 0.7, 8); g.sph(0.14, 0xf1c8a0, s * 0.48, 2.6, 0.08, 1, 1, 0.7, 8); }
  g.sph(0.28, 0xf1c8a0, 0, 1.88, 0.48, 1.2, 0.85, 0.9, 10); g.sph(0.09, INK, 0, 1.97, 0.7, 1.3, 0.9, 0.9, 6);
  for (const s of [-1, 1]) { g.torus(0.1, 0.03, INK, s * 0.26, 2.1, 0.52, 0, 0, PI, PI, 8); g.sph(0.08, 0xff8fa6, s * 0.4, 1.9, 0.45, 1.2, 0.7, 0.5, 6); }
  g.cone(0.55, 0.95, 0xff5a8a, 0.1, 2.5, 0, 12, 0, 0, -0.5); g.sph(0.16, 0xffffff, 0.55, 3.1, 0, 1, 1, 1, 8); g.torus(0.58, 0.1, 0xffffff, 0, 2.5, 0, PI / 2, 0, 0, PI * 2, 14);
  const body = part(g); root.add(body);
  const arms = []; for (const s of [-1, 1]) { const a = new THREE.Group(); a.position.set(s * 0.78, 1.5, 0.1); const ag = new GB(); ag.cyl(0.2, 0.17, 0.7, (x, y) => pj, 0, 0, 0, 8); ag.sph(0.23, fur, 0, 0.78, 0, 1, 1, 1, 8); a.add(part(ag)); a.rotation.x = -1.5; a.rotation.z = s * 0.2; root.add(a); arms.push(a); }
  root.userData = { h: 3.2, body, arms }; return root;
}
function mkPato(v = 0) {
  const root = new THREE.Group(), g = new GB(); const y = 0xffd23f;
  g.sph(0.34, y, 0, 0.38, 0, 1, 0.85, 1.2, 12); g.sph(0.24, y, 0, 0.7, 0.2, 1, 1, 1, 10); g.sph(0.16, y, 0, 0.35, -0.38, 1, 0.8, 1, 8); g.add(new THREE.SphereGeometry(0.2, 8, 6), lighten(y, 0.3), 0.3, 0.45, 0, 0, 0, 0.5, 0.5, 1, 1.4); g.add(new THREE.SphereGeometry(0.2, 8, 6), lighten(y, 0.3), -0.3, 0.45, 0, 0, 0, -0.5, 0.5, 1, 1.4);
  g.sph(0.1, 0xff8a1f, 0, 0.66, 0.43, 1.4, 0.6, 1, 8); for (const s of [-1, 1]) { g.sph(0.055, PAL.white, s * 0.1, 0.78, 0.36, 1, 1.1, 0.6, 6); g.sph(0.028, INK, s * 0.1, 0.78, 0.4, 1, 1, 1, 5); g.box(0.08, 0.1, 0.1, 0xff8a1f, s * 0.12, 0.0, 0.05); }
  if (v === 0) { g.cone(0.17, 0.2, 0x2c4b9b, 0, 0.9, 0.2, 8, 0, 0, 0.1); g.box(0.4, 0.04, 0.2, 0x2c4b9b, 0, 0.92, 0.3); }
  const body = part(g); root.add(body); root.userData = { h: 1.0, body }; return root;
}
function mkGnomo() {
  const root = new THREE.Group(), g = new GB();
  for (const s of [-1, 1]) g.rbox(0.28, 0.2, 0.44, 0.08, 0x5a3a1a, s * 0.2, 0, 0.06, 0, 0, 0, 2);
  g.cyl(0.4, 0.5, 0.75, 0x2a8cf0, 0, 0.18, 0, 14); g.cyl(0.3, 0.3, 0.2, 0xffffff, 0, 0.8, 0, 10); g.rbox(0.28, 0.25, 0.05, 0.03, PAL.sun, 0, 0.35, 0.46, 0, 0, 0, 1);
  g.sph(0.4, 0xffd2ae, 0, 1.15, 0, 1, 0.95, 0.95, 14); eyes(g, 1.2, 0.33, 0.14, 0.09, { brow: -0.25 }); g.sph(0.12, 0xff7a6a, 0, 1.08, 0.4, 1, 1, 1, 8);
  g.sph(0.4, 0xffffff, 0, 0.82, 0.18, 1.1, 1.2, 0.8, 10); g.cone(0.3, 0.5, 0xffffff, 0, 0.45, 0.2, 8, PI, 0, 0.0); g.sph(0.15, 0xff8fa6, 0, 0.92, 0.35, 1.3, 0.5, 0.5, 6);
  g.cone(0.46, 1.1, 0xe8453c, 0, 1.45, 0, 14, 0.1, 0, -0.08); g.torus(0.43, 0.06, 0xffd23f, 0, 1.5, 0, PI / 2, 0, 0, PI * 2, 14);
  const body = part(g); root.add(body); root.userData = { h: 2.5, body }; return root;
}
function mkCortacesped() {
  const root = new THREE.Group(), g = new GB(); const gr = 0x37c46a;
  for (const [x, z] of [[-0.8, 0.9], [0.8, 0.9], [-0.8, -0.8], [0.8, -0.8]]) { g.cyl(0.4, 0.4, 0.26, INK, x, 0.0, z, 14, 0, 0, PI / 2); g.cyl(0.18, 0.18, 0.3, 0xcfd8e8, x, 0.0, z, 8, 0, 0, PI / 2); }
  g.rbox(1.9, 0.9, 2.5, 0.3, gr, 0, 0.35, 0, 0, 0, 0, 3); g.rbox(1.3, 0.5, 1.2, 0.2, 0xe8453c, 0, 1.2, -0.4, 0, 0, 0, 2); g.cyl(0.4, 0.4, 0.2, 0x8da0bd, 0, 1.6, -0.4, 10);
  g.rbox(1.0, 0.9, 0.7, 0.2, 0xe6e6c8, 0, 0.4, -1.5, 0, 0, 0, 2); g.cyl(0.07, 0.07, 1.8, 0x8da0bd, 0.7, 0.9, -1.3, 6, -0.5, 0, 0); g.cyl(0.07, 0.07, 1.8, 0x8da0bd, -0.7, 0.9, -1.3, 6, -0.5, 0, 0); g.cyl(0.07, 0.07, 1.4, 0x2a1840, 0, 2.2, -1.9, 6, 0, 0, PI / 2);
  eyes(g, 1.1, 1.18, 0.4, 0.3, { brow: 0.55 }); g.rbox(1.0, 0.3, 0.1, 0.1, 0x240d3c, 0, 0.55, 1.22, 0, 0, 0, 2); for (let i = 0; i < 4; i++) g.cone(0.1, 0.22, 0xffffff, -0.35 + i * 0.23, 0.7, 1.24, 4, PI, 0, 0);
  const body = part(g); root.add(body);
  const blade = new THREE.Group(); const bg = new GB(); bg.box(1.5, 0.05, 0.16, 0xff3d6e, 0, 0, 0); bg.box(0.16, 0.05, 1.5, 0xff3d6e, 0, 0.0, 0); blade.add(part(bg, false)); blade.position.set(0, 0.2, 1.4); root.add(blade);
  root.userData = { h: 2.2, body, blade }; return root;
}
function mkGlobo() {
  const root = new THREE.Group(); const ball = new THREE.Group();
  const g = new GB(); const noise = (x, y, z) => Math.sin(x * 1.3) * Math.cos(z * 1.1) + Math.sin(y * 1.7 + x * 0.6) * 0.6 + Math.cos(x * 0.9 + z * 1.4) * 0.5;
  g.sph(2.3, (x, y, z) => (noise(x, y, z) > 0.35 ? 0x5fcf62 : 0x3fa5ff), 0, 0, 0, 1, 1, 1, 22);
  g.torus(2.36, 0.07, PAL.gold, 0, 0, 0, PI / 2, 0, 0, PI * 2, 30); g.torus(2.36, 0.07, PAL.gold, 0, 0, 0, 0, 0, 0, PI * 2, 30); g.cyl(0.08, 0.08, 5.1, PAL.gold, 0, -2.55, 0, 6, 0, 0, 0.0);
  ball.add(part(g)); ball.position.y = 2.3; root.add(ball);
  const eg = new GB(); eyes(eg, 0, 0, 0.55, 0.45, { dx: 0 }); smile(eg, -0.8, 0.05, 0.9); const face = part(eg, false); face.position.set(0, 2.9, 2.2); face.rotation.x = -0.1; root.add(face);
  root.userData = { h: 4.7, ball }; return root;
}
function mkCalcetin() {
  const root = new THREE.Group(), g = new GB(); const stripe = (x, y) => (Math.floor((y + 5) * 9) % 2 ? 0xffc933 : 0xfff3b0);
  for (const s of [-1, 1]) { g.cyl(0.04, 0.04, 0.2, PAL.ink, s * 0.1, 0, 0, 5); g.sph(0.07, 0xffffff, s * 0.1, 0.0, 0.05, 1, 0.7, 1.3, 6); }
  g.cyl(0.17, 0.2, 0.55, stripe, 0, 0.18, 0, 10); g.torus(0.18, 0.06, 0xffffff, 0, 0.74, 0, PI / 2, 0, 0, PI * 2, 10); g.sph(0.2, 0xffc933, 0, 0.1, 0.1, 1, 0.8, 1.3, 8);
  eyes(g, 0.55, 0.15, 0.08, 0.07); g.sph(0.04, 0xff6f8f, 0, 0.42, 0.17, 1.4, 0.5, 0.5, 6);
  const body = part(g, true, 0.03); root.add(body); root.userData = { h: 0.9, body }; return root;
}
function mkVater() {
  const root = new THREE.Group(), g = new GB(); const w = 0xffffff;
  g.rbox(1.7, 1.0, 1.4, 0.35, w, 0, 0.3, 0.1, 0, 0, 0, 3); g.rbox(1.7, 2.1, 0.7, 0.2, w, 0, 0.3, -1.0, 0, 0, 0, 3); g.torus(0.78, 0.17, 0xeaf6ff, 0, 1.34, 0.28, PI / 2, 0, 0, PI * 2, 22); g.cyl(0.62, 0.62, 0.08, 0x57c0ff, 0, 1.26, 0.28, 18);
  g.cyl(0.1, 0.1, 0.3, PAL.gold, 0.5, 2.3, -1.0, 8, 0, 0, PI / 2); g.sph(0.12, PAL.gold, 0.7, 2.4, -1.0, 1, 1, 1, 8); g.rbox(1.8, 0.2, 0.8, 0.08, 0xeaf6ff, 0, 2.4, -1.0, 0, 0, 0, 2);
  eyes(g, 1.9, -0.6, 0.38, 0.25, { brow: 0.3 });
  g.sph(0.1, 0xff8fa6, -0.65, 1.55, -0.58, 1.2, 0.7, 0.5, 6); g.sph(0.1, 0xff8fa6, 0.65, 1.55, -0.58, 1.2, 0.7, 0.5, 6);
  const body = part(g); root.add(body);
  const vortex = new THREE.Group(); vortex.position.set(0, 1.34, 0.28); const vg = new GB(); for (let i = 0; i < 16; i++) { const a = i / 16 * PI * 4, r = 0.08 + i * 0.035; vg.sph(0.07, i % 2 ? 0xffffff : 0x9fe0ff, Math.cos(a) * r, 0.0, Math.sin(a) * r, 1, 0.5, 1, 6); } vortex.add(part(vg, false)); root.add(vortex);
  root.userData = { h: 2.6, body, vortex }; return root;
}

// ---------------- comportamiento ----------------
const rnd = Math.random;
function faceTo(c, ang, dt, k = 8) { const da = Math.atan2(Math.sin(ang - c.rot), Math.cos(ang - c.rot)); c.rot += da * Math.min(1, dt * k); }
function wanderDir(c, dt, X, sp, stillP = 0.4, T = 1.5) { c.wt = (c.wt || 0) - dt; if (c.wt <= 0) { c.wt = T + rnd() * 3; const a = rnd() * 6.28, still = rnd() < stillP; c.wdx = still ? 0 : Math.cos(a); c.wdz = still ? 0 : Math.sin(a); } return X.step(c, c.wdx, c.wdz, sp, dt); }
function speak(c, X, lines, p = 0.5, every = 5) { c.talk = (c.talk || (1 + rnd() * 4)) - X.dt; if (c.talk <= 0) { c.talk = every * (0.7 + rnd() * 0.8); if (rnd() < p) X.say(c, lines[(rnd() * lines.length) | 0]); } }
function vec(c, X) { const dx = X.G.px - c.x, dz = X.G.pz - c.z, d = Math.hypot(dx, dz) || 1; return { dx, dz, d, ux: dx / d, uz: dz / d }; }

export const NPC = {
  rebel: { name: 'Sofá Rebelde', r: 1.8, tier: 2, coins: 28, make: (v) => makeRebel(v), h: 2.8, lines: ['¡Soy un sofá libre!', '¡No me siento con cualquiera!', '¡Antes cojín que tapizado!', '¡Cuidado, que doy patadas de cojín!'], flee: ['¡Socorro! ¡Que me vacía los cojines!', '¡Ay, ay, ay, mi tapicería!'],
    init(c) { c.wander = rnd() * 5; c.scream = 0; },
    update(c, dt, X) {
      const v = vec(c, X), panic = 12 + X.G.R * 1.4; let sp = 0, tx = 0, tz = 0;
      if (X.live && v.d < panic) { tx = -v.ux; tz = -v.uz; sp = 5.2 + 0.18 * X.G.lvl + (1 - v.d / panic) * 1.8; if (c.scream <= 0) { c.scream = 1.3; X.AU.sofaScream(); } if (rnd() < dt * 4) X.parts.emit({ x: c.x + (rnd() - 0.5) * 2, y: 3.2, z: c.z, vx: (rnd() - 0.5) * 2, vy: 2 + rnd() * 2, vz: (rnd() - 0.5), life: 0.5, size: 0.3, size1: 0.12, color: 0x7fd6ff, g: 8, shape: 0 }); if (rnd() < dt * 0.4) X.say(c, pick(this.flee, (rnd() * 9) | 0)); }
      else { c.wander -= dt; if (c.wander <= 0) { c.wander = 1.5 + rnd() * 3; const a = rnd() * 6.28, still = rnd() < 0.5; c.wdx = still ? 0 : Math.cos(a); c.wdz = still ? 0 : Math.sin(a); } tx = c.wdx || 0; tz = c.wdz || 0; sp = 1.6; speak(c, X, this.lines, 0.3, 8); }
      c.scream -= dt; const m = X.step(c, tx, tz, sp, dt); if (m > 0.3) c.face = Math.atan2(tx, tz); faceTo(c, c.face || 0, dt);
      c.ph += dt * (6 + m / 6 * 9); const L = c.inner.userData.legs; for (let i = 0; i < 4; i++) L[i].rotation.x = Math.sin(c.ph + (i % 2 ? PI : 0) + (i > 1 ? 1.5 : 0)) * 0.9 * Math.min(1, m / 6 + 0.2);
      c.yo = Math.abs(Math.sin(c.ph)) * 0.35 * Math.min(1, m / 4);
      c.inner.userData.eyes.position.x = Math.max(-1, Math.min(1, (X.G.px - c.x) / (v.d + 1))) * 0.25;
    } },
  tostadora: { name: 'Tostadora Saltarina', r: 1.1, tier: 1, coins: 18, make: mkTostadora, h: 2.0,
    lines: ['¡Tostada al canto!', '¡Toma pan, pan!', '¡Me estoy quemando… de rabia!', '¡Hoy toca desayuno de campeones!', '¡Que viene la torbellina!'], flee: ['¡Mi pan! ¡Mis tostadas!', '¡Nooo, tostada no!'],
    init(c) { c.hop = rnd() * 3; c.shootT = 1.5 + rnd() * 2; c.jump = 0; },
    update(c, dt, X) {
      const v = vec(c, X), edible = X.edible(c), ud = c.inner.userData; let sp = 0;
      if (X.live && v.d < 38) {
        if (edible) { sp = 5; X.step(c, -v.ux, -v.uz, sp, dt); if (rnd() < dt * 0.5) X.say(c, pick(this.flee, (rnd() * 9) | 0)); }
        else {
          sp = v.d > 14 ? 2.8 : 0.8; X.step(c, v.ux, v.uz, sp, dt);
          if (v.d < 28) { c.shootT -= dt; const k = Math.max(0, 0.9 - Math.abs(c.shootT - 0.3) * 3); ud.toasts.forEach((t) => { t.position.y = 1.0 + k * 0.4; }); if (c.shootT <= 0) { c.shootT = 3.4 + rnd() * 1.8; X.shoot(c, v.ux, v.uz); X.say(c, pick(this.lines, (rnd() * 9) | 0), 1500); } }
        }
      } else sp = wanderDir(c, dt, X, 1.4, 0.5);
      c.ph += dt * (sp > 0.5 ? 7 : 3); c.yo = Math.abs(Math.sin(c.ph)) * (sp > 0.5 ? 1.0 : 0.15); c.sy = 1 + Math.sin(c.ph * 2 + 1.6) * 0.06 * (sp > 0.5 ? 1 : 0.3);
      faceTo(c, Math.atan2(v.ux, v.uz), dt, 6);
      ud.arms[0].rotation.z = 0.3 + Math.sin(c.ph) * 0.6; ud.arms[1].rotation.z = -0.3 - Math.sin(c.ph) * 0.6;
    },
    onSwallow(c, X) { X.say('dona', '¡Tostada gratis!', 1200); } },
  lavadora: { name: 'Lavadora Bailonga', r: 2.7, tier: 3, coins: 80, make: mkLavadora, h: 3.7,
    lines: ['¡Centrifugado a mil!', '¡Me sale espuma por las orejas!', '¡Aquí se baila o se lava!', '♪ ¡Lavar, lavar, lavar! ♪', '¡Programa: fiesta delicada!'], flee: ['¡Nooo, que no he acabado el aclarado!'],
    init(c) { c.cd = 2 + rnd() * 2; c.spinT = 0; c.dir = rnd() * 6.28; },
    update(c, dt, X) {
      const v = vec(c, X), edible = X.edible(c), ud = c.inner.userData; c.ph += dt * 6;
      ud.drum.rotation.z -= dt * (c.spinT > 0 ? 18 : 4);
      let m = 0;
      if (X.live && edible && v.d < 30) { m = X.step(c, -v.ux, -v.uz, 4.2, dt); if (rnd() < dt * 0.4) X.say(c, this.flee[0]); }
      else if (X.live && !edible && v.d < 22) {
        c.cd -= dt;
        if (c.spinT > 0) { c.spinT -= dt; c.rot += dt * 12; X.parts.emit({ x: c.x + (rnd() - 0.5) * 3, y: 3.8, z: c.z + (rnd() - 0.5) * 3, vx: Math.cos(c.rot) * 6, vy: 3, vz: Math.sin(c.rot) * 6, life: 0.6, size: 0.7, size1: 1.4, color: 0xffffff, shape: 4, g: 1, alpha: 0.7 }); if (c.spinT <= 0) { X.rings.spawn(c.x, c.z, 1, 15, 0x9fe8ff, 0.5, 0.8); if (v.d < 15 + X.G.R * 0.4) X.hit(c, v.ux, v.uz, { knock: 20, slow: 0.7, loss: 0.05, msg: '¡Centrifugado!' }); X.AU.swish(); } }
        else { m = X.step(c, v.ux, v.uz, v.d > 9 ? 3.0 : 0.6, dt); if (c.cd <= 0 && v.d < 13) { c.cd = 5.8; c.spinT = 0.9; X.say(c, '¡CENTRIFUGADO!', 1300); X.rings.spawn(c.x, c.z, 2, 8, 0xffffff, 0.9, 0.5); } else if (c.cd < 0.01) c.cd = 0.5; }
        faceTo(c, Math.atan2(v.ux, v.uz) , dt, 3);
        if (c.spinT <= 0) speak(c, X, this.lines, 0.4, 5);
      } else { m = wanderDir(c, dt, X, 1.4, 0.35); speak(c, X, this.lines, 0.5, 6); c.rot = Math.sin(c.ph * 0.5) * 0.6; }
      c.yo = Math.abs(Math.sin(c.ph)) * 0.35; c.rz = Math.sin(c.ph * 0.5) * 0.05; c.sy = 1 + Math.sin(c.ph * 2) * 0.03;
      ud.arms[0].rotation.z = 2.2 + Math.sin(c.ph) * 0.6; ud.arms[1].rotation.z = -2.2 - Math.sin(c.ph + 1) * 0.6;
    },
    onSwallow(c, X) { X.say('dona', '¡Lavado y centrifugado!', 1300); } },
  alfombra: { name: 'Alfombra Voladora', r: 2.1, tier: 2, coins: 40, make: mkAlfombra, h: 0.8, fly: 5.2,
    lines: ['¡Wiiii, qué vistas!', '¡Cuidado con los flecos!', '¡Soy la alfombra de Aladino… de Ikea!', '¡Vuelo directo a ninguna parte!'], flee: ['¡Wiii! ¡No me pilláis!'],
    init(c) { c.ang = rnd() * 6.28; c.ph = rnd() * 6; },
    update(c, dt, X) {
      const v = vec(c, X), edible = X.edible(c); c.ph += dt * 3;
      let sp;
      if (X.live && v.d < 24) { c.ang += 0; X.step(c, -v.ux, -v.uz, 9 + (edible ? 2 : 0), dt); sp = 9; if (rnd() < dt * 0.6) X.say(c, this.flee[0], 1200); faceTo(c, Math.atan2(-v.ux, -v.uz), dt, 5); }
      else { c.ang += dt * 0.35; X.step(c, Math.cos(c.ang), Math.sin(c.ang), 3.5, dt); faceTo(c, Math.atan2(Math.cos(c.ang), Math.sin(c.ang)), dt, 4); speak(c, X, this.lines, 0.5, 6); }
      c.yo = this.fly + Math.sin(c.ph) * 0.5; c.rx = Math.sin(c.ph * 1.3) * 0.12; c.rz = Math.cos(c.ph) * 0.14;
      if (rnd() < dt * 10) X.parts.emit({ x: c.x + (rnd() - 0.5) * 3, y: c.hy + c.yo - 0.2, z: c.z + (rnd() - 0.5) * 2, vx: 0, vy: -1, vz: 0, life: 0.7, size: 0.35, size1: 0.05, color: pick([0xffd23f, 0xff74c4, 0xffffff], (rnd() * 3) | 0), shape: 3, g: 0, drag: 1 });
    } },
  nevera: { name: 'Nevera Gruñona (Jefa)', r: 4.6, tier: 4, coins: 260, boss: true, make: mkNevera, h: 6.2,
    lines: ['¡Cierra la puerta, que se va el frío!', '¡Quién ha tocado mi mantequilla!', '¡Aquí mando yo, que soy de dos puertas!', '¡Te voy a dejar helada, torbellino!'], flee: ['¡Noo! ¡Que se me descongela la lasaña!'],
    init(c) { c.cd = 3; c.st = 0; c.stT = 0; c.hp = 0; },
    update(c, dt, X) {
      const v = vec(c, X), edible = X.edible(c), ud = c.inner.userData; c.ph += dt * 3; c.cd -= dt;
      if (X.live && edible && v.d < 40) { X.step(c, -v.ux, -v.uz, 3.6, dt); faceTo(c, Math.atan2(-v.ux, -v.uz), dt, 3); if (rnd() < dt * 0.3) X.say(c, this.flee[0]); c.yo = Math.abs(Math.sin(c.ph * 2)) * 0.4; c.st = 0; }
      else if (X.live && !edible && v.d < 45) {
        faceTo(c, Math.atan2(v.ux, v.uz), dt, 4);
        if (c.st === 0) { X.step(c, v.ux, v.uz, v.d > 12 ? 3.0 : 0.3, dt); c.yo = Math.abs(Math.sin(c.ph * 2)) * 0.3; if (c.cd <= 0 && v.d < 16) { c.st = 1; c.stT = 0; X.say(c, '¡AHORA VERÁS!', 1100); X.rings.spawn(c.x, c.z, 2, 15, 0xff3d6e, 1.0, 0.45, 0.4); } else speak(c, X, this.lines, 0.45, 5); }
        else if (c.st === 1) { c.stT += dt; c.yo = Math.min(1.8, c.stT * 3.2) * (c.stT < 0.55 ? 1 : 0); ud.arms[0].rotation.z = 3.0; ud.arms[1].rotation.z = -3.0; if (c.stT > 0.55) { c.st = 2; c.stT = 0; X.shake(0.9); X.AU.hit(); X.rings.spawn(c.x, c.z, 2, 17, 0xffffff, 0.6, 0.9); X.parts.burst(c.x, 0.4, c.z, 24, { color: [0xe6f6ff, 0xffffff, 0x9fe8ff], speed: 9, size: 0.9, size1: 2.2, life: 0.9, shape: 4, g: -0.5, alpha: 0.7, flat: true, up: 0.6 }); if (v.d < 15 + X.G.R * 0.3) X.hit(c, v.ux, v.uz, { knock: 24, slow: 1.0, loss: 0.08, msg: '¡PISOTÓN HELADO!' }); } }
        else { c.stT += dt; c.yo = 0; if (c.stT > 0.5) { c.st = 0; c.cd = 5.8 + rnd() * 2; } }
      } else { wanderDir(c, dt, X, 1.2, 0.5); c.yo = 0; }
      if (c.st !== 1) { ud.arms[0].rotation.z = 0.4 + Math.sin(c.ph) * 0.15; ud.arms[1].rotation.z = -0.4 - Math.sin(c.ph) * 0.15; }
      c.rz = Math.sin(c.ph) * 0.02;
      if (rnd() < dt * 2.5) X.parts.emit({ x: c.x + (rnd() - 0.5) * 3, y: c.hy * 2 + 0.2, z: c.z + (rnd() - 0.5) * 2, vx: 0, vy: 2, vz: 0, life: 1.1, size: 0.6, size1: 1.6, color: 0xe6f6ff, shape: 4, g: -0.2, alpha: 0.5, drag: 1 });
    },
    onSwallow(c, X) { X.addTime(8); X.toast('¡Nevera derretida! +8 s'); X.say('dona', '¡A descongelar!', 1500); } },
  cuco: { name: 'Reloj Cuco Chiflado', r: 1.7, tier: 2, coins: 30, make: mkCuco, h: 3.6,
    lines: ['¡CU-CÚ! ¡Son las tantas!', '¡Cucú! ¡Llegas tarde!', '¡Cucú, cucú… ¿y tú quién eres?!'], flee: ['¡Cucúuu! ¡Auxilio!'],
    init(c) { c.t = rnd() * 5; },
    update(c, dt, X) {
      const v = vec(c, X), ud = c.inner.userData; c.t += dt; const u = (c.t % 4.5);
      const k = u < 0.5 ? u / 0.5 : u < 1.4 ? 1 : u < 1.9 ? 1 - (u - 1.4) / 0.5 : 0; ud.bird.scale.setScalar(0.01 + k * 1.2); ud.bird.position.z = 0.5 + k * 0.45; ud.bird.rotation.z = Math.sin(c.t * 14) * 0.15 * k;
      if (k > 0.98 && !c.said) { c.said = true; if (v.d < 40) { X.say(c, pick(this.lines, (rnd() * 9) | 0), 1300); X.AU.cuckoo && X.AU.cuckoo(); } } if (k < 0.1) c.said = false;
      if (X.live && X.edible(c) && v.d < 18) { X.step(c, -v.ux, -v.uz, 3.5, dt); faceTo(c, Math.atan2(-v.ux, -v.uz), dt, 5); c.ph += dt * 10; c.yo = Math.abs(Math.sin(c.ph)) * 0.4; }
      else { c.yo = 0; faceTo(c, Math.atan2(v.ux, v.uz), dt, 2); }
      c.rz = Math.sin(c.t * 5) * 0.03;
    },
    onSwallow(c, X) { X.addTime(3); X.toast('¡Cucú! +3 s'); } },
  osito: { name: 'Osito Sonámbulo', r: 1.5, tier: 2, coins: 24, make: mkOsito, h: 3.2,
    lines: ['Zzz… cinco minutitos más…', 'Mamá… un cuento…', 'Zzz… ¿quién ha apagado la luz?', 'Zzz… galletas… zzz'], flee: ['¿Eh? ¿Qué pasa?'],
    init(c) { c.zt = 0; c.wake = 0; },
    update(c, dt, X) {
      const v = vec(c, X), ud = c.inner.userData; c.ph += dt * 3; c.zt -= dt;
      if (c.wake > 0) { c.wake -= dt; c.rot += dt * 9; c.yo = Math.abs(Math.sin(c.ph * 3)) * 0.5; if (c.wake <= 0) c.wdx = c.wdz = 0; }
      else { const m = wanderDir(c, dt, X, 1.5, 0.15, 3); if (m > 0.3) faceTo(c, Math.atan2(c.wdx, c.wdz), dt, 2); c.yo = Math.abs(Math.sin(c.ph)) * 0.12; if (X.live && v.d < X.G.R + 5 && !c.woke) { c.woke = 3; c.wake = 1.0; X.say(c, '¿Eh? ¿Qué pasa?', 1000); } }
      if (c.woke > 0) c.woke -= dt;
      if (c.zt <= 0 && v.d < 55) { c.zt = 0.9; X.parts.emit({ x: c.x, y: c.hy * 2 + 0.6, z: c.z, vx: 0.8, vy: 1.4, vz: 0, life: 1.6, size: 0.9, size1: 1.4, color: 0xffffff, shape: 3, g: -0.1, spin: 0.5, drag: 0.5 }); }
      ud.arms[0].rotation.z = 0.25 + Math.sin(c.ph) * 0.05; ud.arms[1].rotation.z = -0.25 - Math.sin(c.ph) * 0.05; c.rz = Math.sin(c.ph * 0.7) * 0.08;
      if (c.wake <= 0) speak(c, X, this.lines, 0.4, 7);
    } },
  patitos: { name: 'Patito en Fila', r: 0.4, tier: 0, coins: 6, make: (v) => mkPato(v), h: 1.0, group: true,
    lines: ['¡Cuac, cuac, en fila!', '¡Cuac! ¡Nadie se separa!', '¡Cuac! ¡Mamá pato dijo que no!', '¡Cuac-cuac-cuac!'],
    init(c) { },
    update(c, dt, X) {
      const v = vec(c, X); c.ph += dt * 10;
      let m;
      if (c.leader) {
        if (X.live && v.d < 16 + X.G.R) m = X.step(c, -v.ux, -v.uz, 6.6, dt), (rnd() < dt * 0.8 && X.say(c, this.lines[(rnd() * 4) | 0], 1200));
        else m = wanderDir(c, dt, X, 2.2, 0.3);
        if (m > 0.3) faceTo(c, Math.atan2(c.wdx !== undefined && !(X.live && v.d < 16 + X.G.R) ? c.wdx : -v.ux, c.wdx !== undefined && !(X.live && v.d < 16 + X.G.R) ? c.wdz : -v.uz), dt, 10);
      } else {
        const p = c.prev; const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz) || 1; const want = Math.max(0, d - 1.05);
        m = X.step(c, dx / d, dz / d, Math.min(9, want * 5), dt); if (d > 0.5) faceTo(c, Math.atan2(dx, dz), dt, 12);
      }
      c.yo = Math.abs(Math.sin(c.ph)) * 0.18 * Math.min(1, m / 2); c.rz = Math.sin(c.ph) * 0.15 * Math.min(1, m / 2);
    },
    onSwallow(c, X) { X.AU.quack && X.AU.quack(); const g = c.group; g.left--; if (g.left === 0) { X.bonus('¡Patitos en fila! +40', 40); } else if (c.leader) { const nl = g.members.find((m) => m.state === 0); if (nl) nl.leader = true; } for (const m of g.members) if (m.prev === c) { let p = c.prev; while (p && p.state !== 0) p = p.prev; m.prev = p; if (!p) m.leader = true; } } },
  gnomo: { name: 'Gnomo Teletransportista', r: 0.8, tier: 1, coins: 22, make: mkGnomo, h: 2.5,
    lines: ['¡Jiji, a que no me pillas!', '¡Soy un gnomo de mundo!', '¡Plas! ¡Me voy a otro jardín!', '¡Que me das miedo!'], flee: ['¡Plas!'],
    init(c) { c.tp = 0; c.cool = 0; },
    update(c, dt, X) {
      const v = vec(c, X); c.ph += dt * 8; c.cool -= dt;
      if (X.live && v.d < 8 + X.G.R * 0.8 && c.cool <= 0 && c.tp < 5) {
        c.cool = 0.8; c.tp++; X.puff(c.x, c.hy, c.z); X.say(c, pick(this.lines, (rnd() * 9) | 0), 1000); X.AU.swish();
        for (let t = 0; t < 12; t++) { const a = rnd() * 6.28, dd = 24 + rnd() * 24, nx = c.x + Math.cos(a) * dd, nz = c.z + Math.sin(a) * dd; if (Math.abs(nx) < X.BOUND - 3 && Math.abs(nz) < X.BOUND - 3) { c.x = nx; c.z = nz; break; } }
        X.puff(c.x, c.hy, c.z);
      } else if (X.live && v.d < 20) { X.step(c, -v.ux, -v.uz, 3.5, dt); faceTo(c, Math.atan2(-v.ux, -v.uz), dt, 8); c.yo = Math.abs(Math.sin(c.ph)) * 0.25; }
      else { const m = wanderDir(c, dt, X, 1.2, 0.5); if (m > 0.3) faceTo(c, Math.atan2(c.wdx, c.wdz), dt, 6); c.yo = Math.abs(Math.sin(c.ph)) * 0.1 * Math.min(1, m); }
    } },
  cortacesped: { name: 'Cortacésped Furioso', r: 1.8, tier: 2, coins: 45, make: mkCortacesped, h: 2.2,
    lines: ['¡BRRRUUUM! ¡Te voy a rapar!', '¡Corte de pelo gratis!', '¡Cuidado que embisto!', '¡Césped, césped, césped!'], flee: ['¡Brrr! ¡Retirada!'],
    init(c) { c.st = 0; c.stT = 0; c.cd = 2 + rnd() * 2; c.dx = 0; c.dz = 1; },
    update(c, dt, X) {
      const v = vec(c, X), edible = X.edible(c), ud = c.inner.userData; ud.blade.rotation.y += dt * (c.st === 2 ? 40 : 14); c.cd -= dt;
      if (X.live && edible && v.d < 30) { X.step(c, -v.ux, -v.uz, 6.2, dt); faceTo(c, Math.atan2(-v.ux, -v.uz), dt, 8); c.st = 0; if (rnd() < dt * 0.4) X.say(c, this.flee[0]); }
      else if (X.live && !edible && v.d < 34) {
        if (c.st === 0) { faceTo(c, Math.atan2(v.ux, v.uz), dt, 4); X.step(c, v.ux, v.uz, v.d > 18 ? 3.2 : 0.8, dt); if (c.cd <= 0 && v.d > 8 && v.d < 28) { c.st = 1; c.stT = 0; c.dx = v.ux; c.dz = v.uz; X.say(c, pick(this.lines, (rnd() * 9) | 0), 1100); } else speak(c, X, this.lines, 0.3, 6); }
        else if (c.st === 1) { c.stT += dt; c.rot = Math.atan2(c.dx, c.dz) + Math.sin(c.stT * 50) * 0.05; X.parts.emit({ x: c.x - c.dx * 1.5, y: 0.5, z: c.z - c.dz * 1.5, vx: (rnd() - 0.5), vy: 1.5, vz: (rnd() - 0.5), life: 0.5, size: 0.5, size1: 1.2, color: 0x7a7a8c, shape: 4, g: -0.5, alpha: 0.6 }); X.rings.spawn(c.x + c.dx * 5, c.z + c.dz * 5, 0.3, 1.2, 0xff3d6e, 0.2, 0.7, 0.3); if (c.stT > 0.8) { c.st = 2; c.stT = 0; } }
        else { c.stT += dt; X.step(c, c.dx, c.dz, 22, dt); c.rot = Math.atan2(c.dx, c.dz); X.parts.emit({ x: c.x + (rnd() - 0.5), y: 0.4, z: c.z + (rnd() - 0.5), vx: -c.dx * 4, vy: 2.5, vz: -c.dz * 4, life: 0.6, size: 0.35, size1: 0.1, color: pick([0x7bd65a, 0xa8f07a, 0x4ebf3d], (rnd() * 3) | 0), shape: 0, g: 8 }); const dd = Math.hypot(X.G.px - c.x, X.G.pz - c.z); if (dd < X.G.R * 0.9 + 2.2) { X.hit(c, c.dx, c.dz, { knock: 22, slow: 0.9, loss: 0.05, msg: '¡Corte de pelo!' }); c.st = 0; c.cd = 4.4; } if (c.stT > 1.1) { c.st = 0; c.cd = 3.8; } }
      } else { const m = wanderDir(c, dt, X, 1.5, 0.4); if (m > 0.3) faceTo(c, Math.atan2(c.wdx, c.wdz), dt, 5); }
      c.ph += dt * 12; c.yo = c.st === 2 ? 0.1 : Math.abs(Math.sin(c.ph)) * 0.05; c.rz = c.st === 2 ? 0 : Math.sin(c.ph * 0.7) * 0.02;
    } },
  globo: { name: 'Globo Terráqueo Rodante', r: 2.3, tier: 3, coins: 70, make: mkGlobo, h: 4.7, noRot: true,
    lines: ['¡Doy la vuelta al mundo!', '¡Rodando, rodando!', '¡El mundo es un pañuelo… mojado!', '¡Cuidado, polo norte!'], flee: ['¡Me voy rodando!'],
    init(c) { c.ang = rnd() * 6.28; c.sp = 5; c.bounceT = 0; },
    update(c, dt, X) {
      const v = vec(c, X), edible = X.edible(c), ud = c.inner.userData; c.bounceT -= dt;
      let sp = 4;
      if (X.live && v.d < 30) { if (edible) { c.ang = Math.atan2(-v.uz, -v.ux); sp = 6.5; } else if (v.d > 6 && c.bounceT <= 0) { c.ang = Math.atan2(v.uz, v.ux) + Math.sin(c.ph) * 0.4; sp = 7.5; } }
      c.ph += dt * 2; const mx = Math.cos(c.ang), mz = Math.sin(c.ang);
      const m = X.step(c, mx, mz, sp, dt); if (m < sp * 0.5) c.ang += 1.8 + rnd();
      const ax = Math.atan2(mx, mz); faceTo(c, ax, dt, 5); ud.ball.rotation.x += m * dt / 2.3;
      if (X.live && !edible && c.bounceT <= 0) { const dd = Math.hypot(X.G.px - c.x, X.G.pz - c.z); if (dd < X.G.R * 0.9 + 2.3) { X.hit(c, v.ux, v.uz, { knock: 14, slow: 0.5, loss: 0.04, msg: '¡Bolazo!' }); c.ang = Math.atan2(-v.uz, -v.ux); c.bounceT = 2.0; X.say(c, pick(this.lines, (rnd() * 9) | 0), 1200); } }
      if (v.d < 40) speak(c, X, this.lines, 0.25, 8);
    } },
  calcetin: { name: 'Calcetín Fugitivo', r: 0.35, tier: 0, coins: 40, make: mkCalcetin, h: 0.9, rare: true,
    lines: ['¡Soy el calcetín huérfano!', '¡No me cojas, que me pierdo otra vez!', '¡Corre, que llega la lavadora!', '¡Mi pareja se fue a la secadora!'], flee: [],
    init(c) { c.zz = 0; c.zt = 0; },
    update(c, dt, X) {
      const v = vec(c, X); c.ph += dt * 16; c.zt -= dt;
      if (X.live && v.d < 20 + X.G.R) { if (c.zt <= 0) { c.zt = 0.35 + rnd() * 0.4; c.zz = (rnd() < 0.5 ? -1 : 1) * (0.8 + rnd()); } const px = -v.uz * c.zz, pz = v.ux * c.zz; const l = Math.hypot(-v.ux + px, -v.uz + pz) || 1; const tx = (-v.ux + px) / l, tz = (-v.uz + pz) / l; X.step(c, tx, tz, 10.5, dt); faceTo(c, Math.atan2(tx, tz), dt, 14); if (rnd() < dt * 0.5) X.say(c, pick(this.lines, (rnd() * 9) | 0), 1200); c.yo = Math.abs(Math.sin(c.ph)) * 0.35; }
      else { const m = wanderDir(c, dt, X, 2.2, 0.4); if (m > 0.3) faceTo(c, Math.atan2(c.wdx, c.wdz), dt, 10); c.yo = Math.abs(Math.sin(c.ph)) * 0.12; }
      if (rnd() < dt * 12) X.parts.emit({ x: c.x, y: c.hy + 0.2 + c.yo, z: c.z, vx: (rnd() - 0.5), vy: 0.6, vz: (rnd() - 0.5), life: 0.5, size: 0.35, size1: 0, color: 0xffe27a, shape: 3, g: 0, drag: 1 });
    },
    onSwallow(c, X) { X.addTime(3); X.toast('¡Calcetín dorado! +3 s'); } },
  vater: { name: 'Váter Remolino', r: 1.9, tier: 2, coins: 38, make: mkVater, h: 2.6,
    lines: ['¡Glu glu glu! ¡Tiro de cadena!', '¡Ven, ven, que te hago un remolino!', '¡Soy el torbellino del cuarto de baño!', '¡Glub! ¡Qué hambre tengo!'], flee: ['¡Glub! ¡Me escapo por la tubería!'],
    init(c) { c.ph = rnd() * 6; },
    update(c, dt, X) {
      const v = vec(c, X), edible = X.edible(c), ud = c.inner.userData; ud.vortex.rotation.y -= dt * (X.live && !edible && v.d < 14 ? 10 : 3); c.ph += dt * 4;
      if (X.live && !edible && v.d < 14 + X.G.R * 0.5) {
        X.G.kx += v.ux * dt * 9; X.G.kz += v.uz * dt * 9;
        if (rnd() < dt * 14) { const a = rnd() * 6.28; X.parts.emit({ x: X.G.px + Math.cos(a) * 6, y: 1, z: X.G.pz + Math.sin(a) * 6, vx: v.ux * 8 - Math.sin(a) * 4, vy: 0.5, vz: v.uz * 8 + Math.cos(a) * 4, life: 0.8, size: 0.5, size1: 0.1, color: 0x9fe8ff, shape: 2, g: 0, drag: 0 }); }
        if (v.d < 3.2 + X.G.R * 0.5 && X.G.inv <= 0) X.hit(c, -v.ux, -v.uz, { knock: 0, slow: 1.2, loss: 0.025, msg: '¡Tiro de cadena!' });
        if (c.talk <= 0 || rnd() < dt * 0.3) speak(c, X, this.lines, 0.6, 3); faceTo(c, Math.atan2(v.ux, v.uz), dt, 4);
      } else if (X.live && edible && v.d < 20) { X.step(c, -v.ux, -v.uz, 3.4, dt); c.yo = Math.abs(Math.sin(c.ph)) * 0.2; faceTo(c, Math.atan2(-v.ux, -v.uz), dt, 6); if (rnd() < dt * 0.3) X.say(c, this.flee[0], 1200); }
      else { c.yo = 0; speak(c, X, this.lines, 0.4, 7); faceTo(c, Math.atan2(v.ux, v.uz), dt, 1.5); }
    } },
};

// ============ v4: personajes de los lugares nuevos (modelos + dos comportamientos genéricos) ============
const legs2 = (g, col, y = 0, x = 0.3, z = 0) => { for (const s of [-1, 1]) { g.cyl(0.07, 0.07, 0.3, col, s * x, y, z, 6); g.rbox(0.24, 0.1, 0.34, 0.04, 0xffffff, s * x, y, z + 0.06, 0, 0, 0, 2); } };
const wrap = (g, h, extra = {}) => { const root = new THREE.Group(), body = part(g); root.add(body); root.userData = { h, body, ...extra }; return root; };
function mkDonut() { const g = new GB(); legs2(g, 0xe8b072, 0, 0.5); g.torus(1.2, 0.58, 0xe8b072, 0, 1.7, 0, 0, 0, 0, PI * 2, 28); g.torus(1.2, 0.5, 0xff7ac0, 0, 1.78, 0.08, 0, 0, 0, PI * 2, 28); for (let i = 0; i < 16; i++) { const a = i * 0.8; g.rbox(0.07, 0.07, 0.22, 0.03, [0xffffff, 0xffd23f, 0x4aa8ff, 0x3fe0b0][i % 4], Math.cos(a) * 1.2, 1.78 + Math.sin(a) * 1.2, 0.62, 0, 0, a, 1); } eyes(g, 2.55, 0.6, 0.38, 0.22, { brow: 0.3 }); smile(g, 2.15, 0.62, 0.4); return wrap(g, 3.0); }
function mkHelado() { const g = new GB(); legs2(g, 0xe8b072, 0, 0.18, 0.05); g.cone(0.45, 1.0, 0xe8b072, 0, 0.3, 0, 12, PI, 0, 0); g.sph(0.52, 0xffb3d1, 0, 1.4, 0, 1, 0.95, 1, 14); g.sph(0.42, 0xfff0d2, 0, 1.95, 0, 1, 0.9, 1, 14); g.sph(0.1, 0xff2d4d, 0, 2.4, 0, 1, 1, 1, 8); eyes(g, 1.45, 0.42, 0.2, 0.12); smile(g, 1.2, 0.46, 0.2); return wrap(g, 2.5); }
function mkMonito() { const g = new GB(), f = 0x9a6a3a, fl = 0xd9b080; legs2(g, f, 0, 0.35); g.sph(0.8, f, 0, 1.2, 0, 1, 1.1, 0.85, 16); g.sph(0.5, fl, 0, 1.15, 0.45, 1, 1, 0.5, 12); g.sph(0.55, f, 0, 2.25, 0, 1, 0.95, 0.95, 16); g.sph(0.36, fl, 0, 2.15, 0.34, 1.1, 0.8, 0.6, 12); for (const s of [-1, 1]) { g.sph(0.22, fl, s * 0.6, 2.35, 0, 1, 1, 0.5, 8); g.cyl(0.1, 0.1, 0.8, f, s * 0.95, 1.1, 0, 6, 0, 0, s * -0.3); } eyes(g, 2.4, 0.45, 0.2, 0.13); smile(g, 2.08, 0.66, 0.26); g.cyl(0.4, 0.4, 0.06, 0xffd23f, -1.15, 0.9, 0.0, 14, 0, 0, PI / 2); g.cyl(0.4, 0.4, 0.06, 0xffd23f, 1.15, 0.9, 0.0, 14, 0, 0, PI / 2); const key = new GB(); key.cyl(0.07, 0.07, 0.6, 0xc8c8d8, 0, 0, 0, 6); key.torus(0.28, 0.07, 0xffd23f, 0.0, 0.7, 0, 0, 0, 0, PI * 2, 12); const root = wrap(g, 3.0), kp = part(key, false); kp.position.set(0, 1.4, -0.75); kp.rotation.x = PI / 2; root.add(kp); root.userData.key = kp; return root; }
function mkSaltarin() { const g = new GB(); g.rbox(1.0, 0.9, 1.0, 0.12, 0xe8453c, 0, 0, 0, 0, 0, 0, 2); g.rbox(1.04, 0.2, 1.04, 0.08, 0xffd23f, 0, 0.7, 0, 0, 0, 0, 1); for (let i = 0; i < 4; i++) g.torus(0.24, 0.045, 0xc8c8d8, 0, 1.0 + i * 0.22, 0, PI / 2, 0, 0, PI * 2, 10); g.sph(0.5, 0xffe0c8, 0, 2.2, 0, 1, 1, 1, 14); g.cone(0.4, 0.8, 0x8a4be0, 0, 2.5, 0, 10); g.sph(0.1, 0xff4a6e, 0, 3.3, 0, 1, 1, 1, 8); g.sph(0.12, 0xff2d4d, 0, 2.2, 0.5, 1, 1, 1, 8); eyes(g, 2.35, 0.42, 0.2, 0.12); smile(g, 2.0, 0.46, 0.3); return wrap(g, 3.4); }
function mkCaballero() { const g = new GB(), m = 0xcfd8e8; legs2(g, m, 0, 0.38); g.sph(0.85, m, 0, 1.2, 0, 1, 1.1, 0.85, 16); g.sph(0.6, 0xe8f4ff, 0, 2.3, 0, 1, 1, 1, 16); g.sph(0.62, 0xbff3ff, 0, 2.3, 0, 1.05, 1.05, 1.05, 14); eyes(g, 2.35, 0.5, 0.22, 0.14); smile(g, 2.05, 0.54, 0.26); g.cone(0.14, 0.7, 0xff4a8c, 0, 2.9, -0.1, 8, -0.3, 0, 0); for (const s of [-1, 1]) { g.cyl(0.14, 0.14, 0.9, m, s * 1.05, 1.0, 0, 8, 0, 0, s * -0.3); g.sph(0.2, 0xe8e8f6, s * 1.2, 0.95, 0, 1, 1, 1, 8); } g.cyl(0.04, 0.04, 2.2, 0x8a8aa0, 1.35, 0.7, 0.2, 6); g.rbox(0.8, 1.1, 0.1, 0.12, 0x7b8cf0, -1.25, 0.8, 0.5, 0, 0, 0, 1); for (let i = 0; i < 4; i++) g.sph(0.14, 0xffffff, -1.0 + i * 0.4, 2.8 + (i % 2) * 0.2, 0.6, 1, 1, 1, 8); return wrap(g, 3.4); }
function mkBurbujita() { const g = new GB(); g.sph(0.8, 0xcff0ff, 0, 0.9, 0, 1, 1, 1, 18); g.sph(0.2, 0xffffff, -0.35, 1.3, 0.55, 1, 0.7, 0.4, 8); eyes(g, 0.95, 0.66, 0.26, 0.16); smile(g, 0.6, 0.72, 0.3); g.sph(0.1, 0xff9ab0, -0.5, 0.7, 0.66, 1.3, 0.8, 0.5, 6); g.sph(0.1, 0xff9ab0, 0.5, 0.7, 0.66, 1.3, 0.8, 0.5, 6); return wrap(g, 1.8); }
function mkNubarron() { const g = new GB(), c = 0x7a809c; for (const [x, y, z, r] of [[0, 1.4, 0, 1.0], [0.9, 1.1, 0, 0.75], [-0.9, 1.1, 0, 0.75], [0.4, 1.9, 0, 0.7], [-0.4, 1.9, 0, 0.7]]) g.sph(r, c, x, y, z, 1.1, 0.85, 1, 14); g.sph(0.95, 0x9aa0bc, 0, 1.25, 0.2, 1.1, 0.8, 0.9, 14); eyes(g, 1.6, 0.8, 0.36, 0.26, { brow: 0.5 }); g.rbox(0.8, 0.22, 0.1, 0.1, 0x240d3c, 0, 1.15, 0.9, 0, 0, 0, 2); const bolt = new GB(); bolt.rbox(0.25, 0.7, 0.1, 0.04, 0xffe66a, 0.2, 0, 0, 0, 0, 0.4, 1); bolt.rbox(0.25, 0.7, 0.1, 0.04, 0xffe66a, -0.05, -0.55, 0, 0, 0, 0.4, 1); bolt.cone(0.22, 0.6, 0xffe66a, -0.3, -1.2, 0, 4, PI, 0, 0.3); const root = wrap(g, 2.8), bp = part(bolt, false); bp.position.set(0, 0.9, 0.5); root.add(bp); root.userData.bolt = bp; return root; }
function mkOvejita() { const g = new GB(); legs2(g, 0x3a2a3a, 0, 0.3); for (const [x, y, z, r] of [[0, 0.95, 0, 0.6], [0.5, 0.9, 0.05, 0.45], [-0.5, 0.9, 0.05, 0.45], [0.2, 1.4, -0.1, 0.4], [-0.25, 1.4, -0.1, 0.4], [0, 0.9, -0.5, 0.45]]) g.sph(r, 0xffffff, x, y, z, 1, 1, 1, 12); g.sph(0.36, 0x3a2a3a, 0, 1.1, 0.7, 1, 1.05, 0.9, 12); for (const s of [-1, 1]) g.sph(0.14, 0x3a2a3a, s * 0.42, 1.28, 0.62, 1.3, 0.7, 0.6, 8); eyes(g, 1.18, 0.9, 0.14, 0.09); g.sph(0.28, 0xffffff, 0, 1.55, 0.55, 1, 0.7, 0.9, 10); return wrap(g, 2.1); }
function mkCalabaza() { const g = new GB(); legs2(g, 0x4a7a2a, 0, 0.5); g.sph(1.0, 0xff8a1f, 0, 1.4, 0, 1.15, 0.95, 1.05, 18); for (const s of [-0.55, 0, 0.55]) g.sph(0.7, 0xff9a3a, s * 0.8, 1.4, 0, 0.5, 0.95, 1.0, 12); g.cyl(0.14, 0.18, 0.4, 0x4a7a2a, 0.05, 2.25, 0, 6); for (const s of [-1, 1]) g.cone(0.26, 0.4, 0xffe66a, s * 0.4, 1.7, 0.9, 3, 0, 0, 0); g.rbox(1.2, 0.34, 0.2, 0.1, 0xffe66a, 0, 1.0, 0.95, 0, 0, 0, 1); for (let i = 0; i < 4; i++) g.cone(0.1, 0.2, 0xff8a1f, -0.45 + i * 0.3, 1.1, 1.0, 3, 0, 0, 0); for (const s of [-1, 1]) g.cyl(0.1, 0.1, 0.7, 0x4a7a2a, s * 1.25, 1.2, 0, 6, 0, 0, s * -0.4); return wrap(g, 2.6); }
function mkFantasmita() { const g = new GB(); g.sph(0.7, 0xffffff, 0, 1.4, 0, 1, 1.1, 0.95, 16); g.cyl(0.7, 0.8, 1.0, 0xffffff, 0, 0.5, 0, 16); for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; g.sph(0.28, 0xffffff, Math.cos(a) * 0.62, 0.45, Math.sin(a) * 0.62, 1, 1.3, 1, 8); } for (const s of [-1, 1]) g.sph(0.22, 0xffffff, s * 0.78, 1.1, 0.1, 1, 1.4, 0.7, 8, 0, 0, s * 0.4); eyes(g, 1.5, 0.6, 0.25, 0.17); g.sph(0.1, 0x6a3fa0, 0, 1.15, 0.64, 1, 1.4, 0.5, 8); return wrap(g, 2.2); }
const lineOf = (arr) => arr[(rnd() * arr.length) | 0];
function ram(def) {
  return { ...def, init(c) { c.cd = 2 + rnd() * 2; c.st = 0; c.stT = 0; c.dx = 0; c.dz = 1; },
    update(c, dt, X) {
      const v = vec(c, X), edible = X.edible(c), ud = c.inner.userData; c.ph += dt * 8; c.cd -= dt;
      if (ud.key) ud.key.rotation.z += dt * (c.st === 2 ? 14 : 4);
      if (ud.bolt) ud.bolt.visible = c.st !== 0 || ((c.ph * 0.5) % 2) < 1;
      if (X.live && edible && v.d < 30) { X.step(c, -v.ux, -v.uz, def.flee || 5, dt); faceTo(c, Math.atan2(-v.ux, -v.uz), dt, 8); c.st = 0; c.yo = Math.abs(Math.sin(c.ph)) * (def.bob || 0.25); if (rnd() < dt * 0.35) X.say(c, def.fl[(rnd() * def.fl.length) | 0]); }
      else if (X.live && !edible && v.d < 36) {
        if (c.st === 0) { faceTo(c, Math.atan2(v.ux, v.uz), dt, 4); X.step(c, v.ux, v.uz, v.d > 16 ? def.sp : def.sp * 0.4, dt); c.yo = Math.abs(Math.sin(c.ph * 0.7)) * (def.bob || 0.25); if (c.cd <= 0 && v.d > 7 && v.d < 26) { c.st = 1; c.stT = 0; c.dx = v.ux; c.dz = v.uz; X.say(c, lineOf(def.lines), 1000); } else speak(c, X, def.lines, 0.3, 6); }
        else if (c.st === 1) { c.stT += dt; c.yo = 0; c.rot = Math.atan2(c.dx, c.dz) + Math.sin(c.stT * 45) * 0.06; c.rz = Math.sin(c.stT * 40) * 0.1; if (c.stT > 0.6) { c.st = 2; c.stT = 0; } }
        else { c.stT += dt; c.rz = 0; X.step(c, c.dx, c.dz, def.charge || 18, dt); c.rot = Math.atan2(c.dx, c.dz); c.yo = 0.1; X.parts.emit({ x: c.x - c.dx * c.r, y: 0.4, z: c.z - c.dz * c.r, vx: (rnd() - 0.5), vy: 1.6, vz: (rnd() - 0.5), life: 0.5, size: 0.5, size1: 1.2, color: def.dust || 0xffffff, shape: 4, g: -0.5, alpha: 0.6 });
          const hv = vec(c, X); if (hv.d < X.G.R * 0.9 + c.r * 0.8) { X.hit(c, hv.ux, hv.uz, { knock: def.knock || 14, slow: 0.6, loss: 0.05, msg: def.msg }); c.st = 0; c.cd = 4.4 + rnd() * 2; c.stT = 0; }
          else if (c.stT > 0.95) { c.st = 0; c.cd = 3.8 + rnd() * 2; } }
      } else { const m = wanderDir(c, dt, X, 1.6, 0.4); if (m > 0.3) faceTo(c, Math.atan2(c.wdx, c.wdz), dt, 5); c.yo = Math.abs(Math.sin(c.ph * 0.6)) * 0.08; c.rz = 0; if (v.d < 50) speak(c, X, def.lines, 0.3, 8); }
    } };
}
function fleer(def) {
  return { ...def, init(c) { c.zz = 0; c.zt = 0; },
    update(c, dt, X) {
      const v = vec(c, X); c.ph += dt * 14; c.zt -= dt; const ud = c.inner.userData;
      if (X.live && v.d < 16 + X.G.R * 1.2) { if (c.zt <= 0) { c.zt = 0.4 + rnd() * 0.5; c.zz = (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd()); } const px = -v.uz * c.zz, pz = v.ux * c.zz; const l = Math.hypot(-v.ux + px, -v.uz + pz) || 1; const tx = (-v.ux + px) / l, tz = (-v.uz + pz) / l; X.step(c, tx, tz, def.sp, dt); faceTo(c, Math.atan2(tx, tz), dt, 10); c.yo = Math.abs(Math.sin(c.ph)) * (def.bob || 0.35); if (rnd() < dt * 0.5) X.say(c, def.fl[(rnd() * def.fl.length) | 0], 1000); }
      else { const m = wanderDir(c, dt, X, 2, 0.5); if (m > 0.3) faceTo(c, Math.atan2(c.wdx, c.wdz), dt, 8); c.yo = Math.abs(Math.sin(c.ph * 0.5)) * 0.15; speak(c, X, def.lines, 0.3, 8); }
      if (def.ghost) c.yo += 0.7 + Math.sin(c.ph * 0.3) * 0.15;
      if (rnd() < dt * 8) X.parts.emit({ x: c.x, y: c.hy + 0.3 + c.yo, z: c.z, vx: (rnd() - 0.5), vy: 0.7, vz: (rnd() - 0.5), life: 0.5, size: 0.35, size1: 0, color: def.spark || 0xffe27a, shape: 3, g: 0, drag: 1 });
    },
    onSwallow(c, X) { X.addTime(def.time || 3); X.toast(def.win || '¡Bonus! +3 s'); } };
}
NPC.donut = ram({ name: 'Dona Donut', r: 1.5, tier: 2, coins: 36, make: mkDonut, h: 3.0, sp: 3.2, charge: 19, knock: 14, msg: '¡Donutazo!', dust: 0xffd9ec, lines: ['¡Soy un donut con agujero y con genio!', '¡Rodando que es gerundio!', '¡Tengo el azúcar subido!', '¡Con virutas me sale mejor!'], fl: ['¡Mi glaseado!', '¡No me mordisquees!'] });
NPC.helado = fleer({ name: 'Helado Fugitivo', r: 0.85, tier: 1, coins: 22, make: mkHelado, h: 2.5, sp: 9.5, time: 3, win: '¡Helado fresquito! +3 s', spark: 0xff9ec8, lines: ['¡Me derrito de miedo!', '¡Soy de nata y fresa!', '¡Atrápame si puedes!'], fl: ['¡Que me derrito!', '¡Corre, corre!'] });
NPC.monito = ram({ name: 'Mono de Cuerda', r: 1.6, tier: 2, coins: 34, make: mkMonito, h: 3.0, sp: 3.4, charge: 20, knock: 15, msg: '¡Platillazo!', dust: 0xd9b080, lines: ['¡Chin, chin, chin!', '¡Dame cuerda, dame cuerda!', '¡Soy un mono con muchas pilas!'], fl: ['¡Uh uh ah ah!', '¡Mi llave!'] });
NPC.saltarin = fleer({ name: 'Payaso de Resorte', r: 1.0, tier: 1, coins: 24, make: mkSaltarin, h: 3.4, sp: 8.5, bob: 0.9, time: 3, win: '¡Sorpresa! +3 s', spark: 0xff4a6e, lines: ['¡Sorpresaaa!', '¡Boing, boing!', '¡Hoy me toca saltar!'], fl: ['¡Boing! ¡Me escapo!', '¡Que viene el remolino!'] });
NPC.caballero = ram({ name: 'Caballero Burbuja', r: 1.8, tier: 2, coins: 40, make: mkCaballero, h: 3.4, sp: 3.0, charge: 17, knock: 15, msg: '¡Escudazo!', dust: 0xbff3ff, lines: ['¡En guardia, torbellino!', '¡Por el honor de la lavandería!', '¡Soy el caballero de la espuma!'], fl: ['¡Retirada táctica!', '¡Mi armadura!'] });
NPC.burbujita = fleer({ name: 'Burbujita Saltarina', r: 0.8, tier: 1, coins: 22, make: mkBurbujita, h: 1.8, sp: 9, bob: 0.5, time: 3, win: '¡Plop! +3 s', spark: 0xbff3ff, lines: ['¡Plop, plop!', '¡Soy muy frágil!', '¡Cuidado que exploto!'], fl: ['¡Plop! ¡No me pinches!', '¡Flotando me voy!'] });
NPC.nubarron = ram({ name: 'Nubarrón Gruñón', r: 1.9, tier: 2, coins: 42, make: mkNubarron, h: 2.8, sp: 3.0, charge: 18, knock: 14, msg: '¡Rayo!', dust: 0xffe66a, bob: 0.5, lines: ['¡Voy a llover sobre tu fiesta!', '¡Truenos y relámpagos!', '¡Hoy tengo mal día!'], fl: ['¡Me quedo sin lluvia!', '¡Ay, mis rayos!'] });
NPC.ovejita = fleer({ name: 'Oveja de Algodón', r: 0.95, tier: 1, coins: 24, make: mkOvejita, h: 2.1, sp: 8.5, time: 3, win: '¡Oveja dormilona! +3 s', spark: 0xffffff, lines: ['¡Beee! ¡Soy de algodón!', '¡Cuéntame hasta cien!', '¡Beee-lleza de oveja!'], fl: ['¡Beee! ¡Socorro!', '¡Corre, borreguito!'] });
NPC.calabaza = ram({ name: 'Calabaza Carcajada', r: 1.8, tier: 2, coins: 40, make: mkCalabaza, h: 2.6, sp: 3.2, charge: 19, knock: 15, msg: '¡Truco!', dust: 0xffa63a, lines: ['¡Ji ji ji! ¿Truco o trato?', '¡Soy la calabaza más risueña!', '¡Te voy a dar un susto de calabaza!'], fl: ['¡Mi vela!', '¡Nooo, que me vacían!'] });
NPC.fantasmita = fleer({ name: 'Fantasmita Tímido', r: 0.95, tier: 1, coins: 26, make: mkFantasmita, h: 2.2, sp: 9.5, ghost: true, time: 4, win: '¡Fantasmita atrapado! +4 s', spark: 0xd8b0ff, lines: ['¡Buuu! (bajito)', '¡Me da vergüenza asustar!', '¡Uuuuh!'], fl: ['¡Buuu-ena huida!', '¡Me desvanezco!'] });
const neveraV = (name, cols, win) => ({ ...NPC.nevera, name, make: () => mkNevera(cols), onSwallow(c, X) { X.addTime(8); X.toast(win); X.say('dona', '¡A descongelar!', 1500); } });
NPC.neveraP = neveraV('Congelador Golosón (Jefe)', [0xff7ac0, 0xffb3d9], '¡Congelador derretido! +8 s');
NPC.neveraJ = neveraV('Nevera de Juguete (Jefa)', [0x2a7bd9, 0x6aa8ff], '¡Nevera de juguete! +8 s');
NPC.neveraC = neveraV('Nevera Caballera (Jefa)', [0x7b8cf0, 0xb8c8ff], '¡Nevera real derretida! +8 s');
NPC.neveraN = neveraV('Nevera Nimbo (Jefa)', [0xaac8ff, 0xe8f2ff], '¡Nimbo derretida! +8 s');
NPC.neveraH = neveraV('Nevera Maldita (Jefa)', [0x3a1f5a, 0x6a3fa0], '¡Nevera maldita! +8 s');
