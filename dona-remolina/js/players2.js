// v3: 6 limpiadoras más (12 en total) + utilidades de cara (ojos brillantes y parpadeo)
import * as THREE from 'three';
import { GB, lighten, darken, mix, hiQ } from './geo.js?v=4';
import { PAL, part, propMaterial } from './models.js?v=4';
const PI = Math.PI;
const INK = 0x2a1840;

// ---- parpadeo: párpados que se cierran sobre los ojos ----
export function addLids(root, specs) {
  const head = root.userData.head; const lids = [];
  for (const [x, y, z, r, col] of specs) {
    const g = new GB(); g.sph(r * 1.14, col, 0, 0, 0, 1.1, 1.14, 0.96, 14);
    const m = new THREE.Mesh(g.build(false, 0.1), propMaterial); m.position.set(x, y, z); m.visible = false; head.add(m); lids.push(m);
  }
  root.userData.lids = lids; return root;
}
// ojos grandes y brillantes (blanco, iris, pupila y dos destellos)
function bigEyes(hg, ey, sp, r, iris, z = 0.33) {
  for (const s of [-1, 1]) {
    hg.sph(r, PAL.white, s * sp, ey, z, 1, 1.12, 0.72, 14);
    hg.sph(r * 0.74, iris, s * sp, ey - 0.004, z + 0.05, 1, 1.12, 0.6, 12);
    hg.sph(r * 0.4, INK, s * sp, ey - 0.006, z + 0.085, 1, 1.1, 0.6, 10);
    hg.sph(r * 0.2, PAL.white, s * sp + r * 0.22, ey + r * 0.3, z + 0.12, 1, 1, 0.8, 8);
    hg.sph(r * 0.1, PAL.white, s * sp - r * 0.2, ey - r * 0.28, z + 0.115, 1, 1, 0.8, 6);
  }
}
const blush = (hg, ey, sp, z, col = 0xff8fa6, r = 0.075) => { for (const s of [-1, 1]) hg.sph(r, col, s * sp, ey, z, 1.25, 0.75, 0.5, 10); };
const mouthMesh = (head, y, z, w = 0.1) => { const mg = new GB(); mg.sph(w, 0x8a1f45, 0, 0, 0, 1.15, 0.75, 0.6, 14); mg.sph(w * 0.58, 0xff6f8f, 0, -w * 0.3, 0.02, 1.1, 0.5, 0.6, 10); const m = part(mg, false); m.position.set(0, y, z); head.add(m); return m; };
const armGroup = (root, s, y, x = 0.3) => { const a = new THREE.Group(); a.position.set(s * x, y, 0); return a; };
const rainbow = [0xff4a6e, 0xff9a2a, 0xffd23f, 0x3fe0b0, 0x4aa8ff, 0xb06bff];

// ================================================================ Pulpo Plumero
function makePulpo() {
  const root = new THREE.Group(); const body = new GB(); const pink = 0xff7aa8, pinkL = 0xffc2d8, cream = 0xfff2e6;
  body.sph(0.5, (x, y, z) => mix(0xff6a9c, pink, Math.min(1, y * 1.4)), 0, 0.46, 0, 1.08, 0.82, 1.02, 30);
  body.cyl(0.3, 0.42, 0.5, pink, 0, 0.6, 0, 26); body.sph(0.36, pinkL, 0, 0.7, 0.1, 0.95, 1.1, 0.7, 20);
  // delantal de sirvienta con volantes
  body.sph(0.3, 0xffffff, 0, 0.74, 0.3, 0.95, 1.05, 0.28, 20); body.torus(0.3, 0.035, 0xffe0ee, 0, 0.5, 0.22, 0, 0, 0, PI, 20); body.sph(0.06, 0xff4a8a, 0, 0.9, 0.38, 1, 1, 0.6, 10);
  body.sph(0.1, 0xff4a8a, -0.1, 1.08, 0.3, 1.5, 0.9, 0.7, 12, 0, 0, 0.3); body.sph(0.1, 0xff4a8a, 0.1, 1.08, 0.3, 1.5, 0.9, 0.7, 12, 0, 0, -0.3); body.sph(0.06, 0xff2d78, 0, 1.08, 0.33, 1, 1, 1, 10);
  const bodyM = part(body); root.add(bodyM);
  // 6 tentáculos que se mecen (cada uno acaba en un plumerito de colores)
  const tent = new THREE.Group(); const tg = new GB();
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * PI * 2 + 0.52, ca = Math.cos(a), sa = Math.sin(a);
    for (let i = 0; i < 9; i++) { const u = i / 8, r = 0.34 + u * 0.55, y = 0.1 + Math.pow(u, 2.2) * 0.34 + Math.sin(u * 5 + k) * 0.03, w = 0.105 - u * 0.062; tg.sph(w, (x, yy) => mix(pink, 0xff93b8, Math.min(1, yy * 1.6)), ca * r + sa * Math.sin(u * 4 + k) * 0.1, y, sa * r - ca * Math.sin(u * 4 + k) * 0.1, 1, 0.9, 1, 12); if (i > 1 && i < 8) tg.sph(w * 0.38, cream, ca * r, y + w * 0.7, sa * r, 1, 0.7, 1, 6); }
    const ex = ca * 0.9, ez = sa * 0.9; for (let f = 0; f < 6; f++) { const b = f / 6 * PI * 2; tg.cone(0.035, 0.26, rainbow[(f + k) % 6], ex + Math.cos(b) * 0.04, 0.48, ez + Math.sin(b) * 0.04, 6, Math.sin(b) * 0.5, 0, -Math.cos(b) * 0.5); }
  }
  tent.add(part(tg)); root.add(tent);
  const head = new THREE.Group(); head.position.set(0, 1.0, 0.02); const hg = new GB();
  hg.sph(0.43, (x, y, z) => mix(0xff6a9c, 0xff94b8, Math.min(1, Math.max(0, y / 0.9))), 0, 0.46, -0.02, 1.0, 1.22, 1.02, 34);
  for (const [x, y, z, r] of [[0.14, 0.98, -0.1, 0.07], [-0.2, 0.86, -0.12, 0.09], [0.26, 0.78, -0.08, 0.06], [-0.05, 0.9, 0.1, 0.05], [0.0, 0.7, -0.3, 0.1], [-0.28, 0.6, -0.22, 0.07]]) hg.sph(r, 0xffb3cc, x, y, z, 1, 1, 0.6, 10);
  // cofia de sirvienta
  hg.sph(0.33, 0xffffff, 0, 0.9, 0.12, 1, 0.3, 0.95, 24); hg.torus(0.33, 0.04, 0xffe0ee, 0, 0.9, 0.12, PI / 2, 0, 0, PI * 2, 26); hg.sph(0.07, 0xff4a8a, 0.2, 0.94, 0.28, 1, 1, 0.7, 10);
  bigEyes(hg, 0.34, 0.17, 0.125, 0x2aa8e0, 0.33); blush(hg, 0.2, 0.28, 0.3, 0xff4a8a, 0.08);
  for (const s of [-1, 1]) hg.box(0.12, 0.03, 0.03, 0xc84a78, s * 0.17, 0.52, 0.36, 0, 0, s * -0.2);
  const headM = part(hg); head.add(headM); const mouth = mouthMesh(head, 0.13, 0.38, 0.085); root.add(head);
  const arms = [];
  for (const s of [-1, 1]) {
    const a = armGroup(root, s, 0.98, 0.34); const ag = new GB();
    for (let i = 0; i < 8; i++) { const u = i / 7; ag.sph(0.092 - u * 0.04, pink, Math.sin(u * 5) * 0.03, 0.06 + i * 0.075, 0, 1, 1, 1, 12); if (i > 0) ag.sph(0.026, cream, 0, 0.06 + i * 0.075, 0.07 - u * 0.03, 1, 0.8, 0.8, 6); }
    ag.cyl(0.03, 0.03, 0.5, PAL.woodL, 0, 0.55, 0, 8); ag.torus(0.05, 0.02, PAL.gold, 0, 0.62, 0, PI / 2, 0, 0, PI * 2, 10);
    for (let f = 0; f < 16; f++) { const b = f / 16 * PI * 2; ag.cone(0.05, 0.48, rainbow[(f + (s > 0 ? 2 : 0)) % 6], Math.cos(b) * 0.1, 1.1, Math.sin(b) * 0.1, 7, Math.sin(b) * 0.45, 0, -Math.cos(b) * 0.45); }
    ag.sph(0.07, PAL.gold, 0, 1.0, 0, 1, 1, 1, 8);
    a.add(part(ag)); a.rotation.z = -s * 2.4; root.add(a); arms.push(a);
  }
  root.userData = { head, mouth, arms, bodyM, h: 1.9, headY: 1.0, arms0: 2.4, extra(t) { tent.rotation.y = Math.sin(t * 2.4) * 0.16; tent.scale.y = 1 + Math.sin(t * 5) * 0.04; head.rotation.x = Math.sin(t * 2.2) * 0.05; } };
  return addLids(root, [[-0.17, 0.34, 0.33, 0.125, 0xff8fb4], [0.17, 0.34, 0.33, 0.125, 0xff8fb4]]);
}

// ================================================================ Don Jamón Jamonero
function makeJamon() {
  const root = new THREE.Group(); const body = new GB(); const ham = 0xc23c56, fat = 0xfff0e2, rind = 0x8a2438;
  // pies: zapatos de charol
  for (const s of [-1, 1]) { body.cyl(0.07, 0.08, 0.3, 0xf2e6d6, s * 0.18, 0.1, 0, 12); body.sph(0.16, 0x2a1840, s * 0.18, 0.1, 0.07, 1.1, 0.6, 1.5, 14); }
  // cuerpo = pierna de jamón curada
  body.sph(0.52, (x, y, z) => mix(ham, 0xde5a72, Math.max(0, Math.min(1, z * 1.2 + 0.2))), 0, 0.72, 0, 0.98, 1.0, 0.86, 34);
  body.sph(0.5, rind, 0, 0.7, -0.14, 0.98, 1.0, 0.7, 28);
  body.sph(0.43, (x, y, z) => (Math.hypot(x, y - 0.74) > 0.37 ? fat : 0xe8607a), 0, 0.76, 0.2, 1, 1.02, 0.4, 32);
  for (let i = 0; i < 4; i++) body.torus(0.28 - i * 0.05, 0.012, 0xffd0d8, 0, 0.76, 0.4, 0, 0, 0, PI * 2, 24);
  body.sph(0.06, 0xffffff, 0.12, 0.9, 0.42, 1, 1, 1, 6);
  // faja y pañuelo
  body.torus(0.46, 0.06, 0xffd23f, 0, 0.38, 0, PI / 2, 0, 0, PI * 2, 28); body.sph(0.08, 0xe8453c, 0.36, 0.36, 0.28, 1, 1, 0.7, 10);
  const bodyM = part(body); root.add(bodyM);
  const head = new THREE.Group(); head.position.set(0, 1.18, 0.02); const hg = new GB();
  hg.sph(0.37, 0xe8607a, 0, 0.3, 0, 1.0, 0.95, 0.96, 26);
  // hueso y pezuña como coletilla
  hg.cyl(0.07, 0.09, 0.3, 0xfff6e8, 0, 0.62, -0.1, 12); hg.sph(0.1, 0xfff6e8, 0.06, 0.94, -0.1, 1, 1, 1, 12); hg.sph(0.1, 0xfff6e8, -0.06, 0.94, -0.1, 1, 1, 1, 12);
  // boina negra
  hg.sph(0.4, 0x2a2a3a, 0.03, 0.58, 0, 1.15, 0.38, 1.1, 26, 0, 0, -0.18); hg.sph(0.05, 0x2a2a3a, 0.06, 0.8, 0, 1, 1.4, 1, 8);
  bigEyes(hg, 0.3, 0.14, 0.1, 0x6b3b2a, 0.31); blush(hg, 0.17, 0.25, 0.28, 0xff9ab0, 0.075);
  for (const s of [-1, 1]) { hg.box(0.17, 0.05, 0.04, 0x3a2418, s * 0.15, 0.46, 0.34, 0, 0, s * -0.3); }
  hg.sph(0.07, 0xffa07f, 0, 0.22, 0.36, 1, 0.9, 0.9, 12);
  // bigotazo de manillar
  for (const s of [-1, 1]) { for (let i = 0; i < 7; i++) { const u = i / 6; hg.sph(0.058 - u * 0.025, 0x3a2418, s * (0.06 + u * 0.26), 0.14 + Math.sin(u * 2.4) * 0.05 + u * u * 0.14, 0.36 - u * 0.08, 1, 1, 1, 8); } }
  const headM = part(hg); head.add(headM); const mouth = mouthMesh(head, 0.04, 0.34, 0.085); root.add(head);
  const arms = [];
  for (const s of [-1, 1]) {
    const a = armGroup(root, s, 0.98, 0.5); const ag = new GB();
    ag.cyl(0.075, 0.07, 0.45, 0xe8607a, 0, 0, 0, 12); ag.sph(0.11, 0xfff2e6, 0, 0.5, 0, 1, 1, 1, 14); ag.torus(0.085, 0.03, 0xffd23f, 0, 0.4, 0, PI / 2, 0, 0, PI * 2, 12);
    if (s === 1) { // escobón
      ag.cyl(0.03, 0.03, 1.4, PAL.woodL, 0, 0.3, 0, 8);
      for (let i = 0; i < 14; i++) { const aa = i / 14 * PI * 2; ag.cone(0.06, 0.55, i % 2 ? 0xffc93a : 0xe6a82a, Math.cos(aa) * 0.1, 1.5, Math.sin(aa) * 0.1, 6, Math.sin(aa) * 0.3, 0, -Math.cos(aa) * 0.3); }
      ag.torus(0.11, 0.035, 0xe8453c, 0, 1.58, 0, PI / 2, 0, 0, PI * 2, 12);
    } else { // plato con lonchas
      ag.cyl(0.3, 0.2, 0.06, 0xffffff, 0, 0.62, 0, 24); ag.torus(0.3, 0.025, 0x4aa8ff, 0, 0.67, 0, PI / 2, 0, 0, PI * 2, 24);
      for (let i = 0; i < 4; i++) ag.sph(0.17, [0xe8607a, 0xf2788e][i % 2], (i - 1.5) * 0.1, 0.72 + i * 0.012, (i % 2) * 0.05, 1, 0.14, 0.75, 14);
    }
    a.add(part(ag)); a.rotation.z = -s * 2.4; root.add(a); arms.push(a);
  }
  root.userData = { head, mouth, arms, bodyM, h: 1.75, headY: 1.18, arms0: 2.4, extra(t) { head.rotation.y = Math.sin(t * 1.7) * 0.12; } };
  return addLids(root, [[-0.14, 0.3, 0.31, 0.1, 0xe8607a], [0.14, 0.3, 0.31, 0.1, 0xe8607a]]);
}

// ================================================================ Croqueta Ciclón
function makeCroqueta() {
  const root = new THREE.Group(); const body = new GB(); const gold = 0xe9a94c;
  const crumbs = (base, light) => (x, y, z) => { const n = Math.sin(x * 38) * Math.sin(y * 41 + 1) * Math.sin(z * 35 + 2); return mix(base, light, Math.max(0, Math.min(1, 0.35 + n * 0.5))); };
  for (const s of [-1, 1]) { body.cyl(0.08, 0.09, 0.28, 0xfff0d8, s * 0.2, 0.12, 0, 14); body.sph(0.17, 0x4aa8e0, s * 0.2, 0.1, 0.07, 1.05, 0.6, 1.5, 16); body.sph(0.05, PAL.white, s * 0.2, 0.15, 0.23, 1, 1, 0.5, 8); }
  body.sph(0.56, crumbs(gold, 0xf6cf7c), 0, 0.82, 0, 0.98, 1.0, 0.98, 36);
  // bechamel que asoma por una grieta
  body.sph(0.17, 0xfff6dc, 0.3, 1.1, 0.3, 1, 0.8, 0.6, 14); body.sph(0.09, 0xfff6dc, 0.38, 0.92, 0.34, 1, 1.6, 0.7, 10);
  body.sph(0.1, PAL.white, -0.1, 0.45, 0.5, 1, 1, 0.5, 8);
  const bodyM = part(body); root.add(bodyM);
  const head = new THREE.Group(); head.position.set(0, 1.28, 0.02); const hg = new GB();
  hg.sph(0.4, crumbs(gold, 0xf6cf7c), 0, 0.28, 0, 1.05, 0.92, 1.0, 34);
  // perejil de pelo y palillo con banderita
  for (let i = 0; i < 7; i++) { const a = i / 7 * PI * 2; hg.sph(0.1, [0x3fbf5a, 0x57d86b, 0x2a9a48][i % 3], Math.cos(a) * 0.1, 0.68, Math.sin(a) * 0.1, 1, 0.6, 1, 10, 0, 0, 0); hg.cone(0.08, 0.26, [0x3fbf5a, 0x57d86b][i % 2], Math.cos(a) * 0.14, 0.7, Math.sin(a) * 0.14, 6, Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7); }
  hg.cyl(0.012, 0.012, 0.7, 0xe8c68a, 0.28, 0.4, 0.05, 6, 0, 0, -0.45); hg.rbox(0.2, 0.12, 0.012, 0.01, 0xe8453c, 0.55, 1.0, 0.05, 0, 0, 0, 1); hg.rbox(0.2, 0.05, 0.016, 0.01, 0xffd23f, 0.55, 1.03, 0.05, 0, 0, 0, 1);
  bigEyes(hg, 0.3, 0.16, 0.115, 0x6b3b2a, 0.34); blush(hg, 0.14, 0.27, 0.31, 0xff7a6a, 0.085);
  hg.sph(0.045, 0xd0803a, 0, 0.2, 0.4, 1, 0.9, 0.9, 10);
  for (const s of [-1, 1]) hg.box(0.11, 0.03, 0.03, 0x8a5a2a, s * 0.16, 0.46, 0.37, 0, 0, s * -0.25);
  const headM = part(hg); head.add(headM); const mouth = mouthMesh(head, 0.06, 0.38, 0.1); root.add(head);
  const arms = [];
  for (const s of [-1, 1]) {
    const a = armGroup(root, s, 1.02, 0.5); const ag = new GB();
    ag.cyl(0.07, 0.065, 0.4, 0xf0b85a, 0, 0, 0, 12); ag.sph(0.1, 0xfff0d8, 0, 0.45, 0, 1, 1, 1, 14);
    if (s === 1) { // espumadera gigante
      ag.cyl(0.03, 0.03, 0.9, 0x8a8aa0, 0, 0.5, 0, 8); ag.torus(0.26, 0.03, 0xcfd8e8, 0, 1.62, 0, 0, 0, 0, PI * 2, 24); ag.cyl(0.26, 0.26, 0.02, 0xdfe8f6, 0, 1.62, 0, 24, PI / 2, 0, 0);
      for (let i = 0; i < 7; i++) { const a2 = i / 7 * PI * 2; ag.cyl(0.03, 0.03, 0.03, 0x2a1840, Math.cos(a2) * 0.14, 1.62, Math.sin(a2) * 0.14 + 0.0, 8, PI / 2, 0, 0); }
    } else { ag.cyl(0.02, 0.02, 0.7, 0xe8c68a, 0, 0.5, 0, 6); ag.rbox(0.3, 0.2, 0.02, 0.02, 0xffd23f, 0.15, 1.0, 0, 0, 0, 0, 1); ag.rbox(0.3, 0.07, 0.024, 0.02, 0xe8453c, 0.15, 1.07, 0, 0, 0, 0, 1); }
    a.add(part(ag)); a.rotation.z = -s * 2.4; root.add(a); arms.push(a);
  }
  root.userData = { head, mouth, arms, bodyM, h: 1.85, headY: 1.28, arms0: 2.4, extra(t) { head.rotation.z = Math.sin(t * 3.1) * 0.07; } };
  return addLids(root, [[-0.16, 0.3, 0.34, 0.115, 0xeeb454], [0.16, 0.3, 0.34, 0.115, 0xeeb454]]);
}

// ================================================================ Genio del Fregadero
function makeGenio() {
  const root = new THREE.Group(); const body = new GB(); const blue = 0x3bb4ff, blueD = 0x1f84e0;
  // botella de lavavajillas (su lámpara)
  body.cyl(0.26, 0.3, 0.46, (x, y) => (y > 0.18 && y < 0.32 ? 0xffffff : 0xb6ff3a), 0, 0, 0, 22); body.sph(0.26, 0xb6ff3a, 0, 0.46, 0, 1.0, 0.5, 1.0, 20); body.cyl(0.07, 0.09, 0.14, 0xff9a2a, 0, 0.6, 0, 12); body.sph(0.06, 0xff9a2a, 0.0, 0.72, 0.0, 1.2, 0.8, 1, 10);
  // cola de humo en espiral
  for (let i = 0; i < 12; i++) { const u = i / 11, a = u * 5.2, r = 0.2 * (1 - u) * 0.9; body.sph(0.17 + Math.sin(u * PI) * 0.17 - u * 0.04, (x, y) => mix(blueD, blue, Math.min(1, y * 0.9)), Math.cos(a) * r, 0.72 + u * 0.5, Math.sin(a) * r, 1, 0.95, 1, 18); }
  // torso
  body.sph(0.4, (x, y) => mix(blue, 0x7ad4ff, Math.max(0, Math.min(1, (y - 1) * 2))), 0, 1.18, 0, 1.0, 0.85, 0.82, 28); body.torus(0.34, 0.07, 0xffd23f, 0, 1.0, 0, PI / 2, 0, 0, PI * 2, 24); body.sph(0.1, 0xff4a8a, 0, 1.0, 0.34, 1, 1, 0.6, 12);
  body.sph(0.3, 0xff6bd0, 0, 1.28, 0.14, 1, 0.8, 0.6, 22); body.torus(0.24, 0.025, 0xffd23f, 0, 1.28, 0.2, 0.4, 0, 0, PI * 2, 20);
  const bodyM = part(body); root.add(bodyM);
  const head = new THREE.Group(); head.position.set(0, 1.4, 0.02); const hg = new GB();
  hg.sph(0.36, blue, 0, 0.28, 0, 1.0, 0.96, 0.96, 28);
  // turbante-esponja con joya
  hg.sph(0.4, 0xffd23f, 0, 0.58, 0, 1.08, 0.7, 1.08, 28); for (let i = 0; i < 9; i++) { const a = i * 2.4; hg.sph(0.045, 0xe0ac1e, Math.cos(a) * 0.3, 0.62 + Math.sin(i * 1.7) * 0.1, Math.sin(a) * 0.3 + 0.1, 1, 1, 0.5, 6); }
  hg.sph(0.3, 0x3fbf5a, 0, 0.86, 0, 1.0, 0.45, 1.0, 22); hg.sph(0.08, 0xff4a8a, 0, 0.82, 0.4, 1, 1.2, 0.6, 12); hg.cone(0.05, 0.28, 0xffffff, 0, 1.16, 0, 6);
  hg.sph(0.04, 0xff4a8a, 0.0, 1.32, 0.0, 1, 1, 1, 8);
  bigEyes(hg, 0.32, 0.15, 0.11, 0xffc83a, 0.31); blush(hg, 0.18, 0.26, 0.27, 0xff6bd0, 0.07);
  for (const s of [-1, 1]) hg.box(0.13, 0.035, 0.03, 0x0f4c9a, s * 0.15, 0.48, 0.34, 0, 0, s * 0.3);
  // perilla de espuma
  for (const [x, y, z, r] of [[0, 0.1, 0.34, 0.1], [-0.09, 0.07, 0.32, 0.08], [0.09, 0.07, 0.32, 0.08], [0, 0.02, 0.33, 0.09], [-0.05, -0.05, 0.28, 0.07], [0.05, -0.04, 0.28, 0.07], [0, -0.1, 0.24, 0.07]]) hg.sph(r, 0xffffff, x, y, z, 1, 1, 1, 12);
  hg.sph(0.05, 0x1f84e0, 0, 0.22, 0.37, 1, 0.9, 0.9, 10);
  const headM = part(hg); head.add(headM); const mouth = mouthMesh(head, 0.11, 0.35, 0.075); root.add(head);
  const arms = [];
  for (const s of [-1, 1]) {
    const a = armGroup(root, s, 1.22, 0.42); const ag = new GB();
    ag.cyl(0.1, 0.09, 0.46, blue, 0, 0, 0, 16); ag.torus(0.1, 0.035, 0xffd23f, 0, 0.36, 0, PI / 2, 0, 0, PI * 2, 14);
    // guante de goma amarillo
    ag.cyl(0.13, 0.11, 0.18, 0xffe23a, 0, 0.44, 0, 16); ag.sph(0.14, 0xffe23a, 0, 0.64, 0, 1, 1.05, 0.85, 16); for (let f = -1; f <= 1; f++) ag.sph(0.045, 0xffe23a, f * 0.08, 0.76, 0.05, 1, 1.5, 1, 8); ag.sph(0.05, 0xffe23a, s * 0.14, 0.64, 0.05, 1, 1.3, 1, 8);
    if (s === 1) { ag.cyl(0.04, 0.04, 0.5, PAL.woodD, 0, 0.8, 0, 8); ag.rbox(0.2, 0.1, 0.46, 0.04, 0xffd23f, 0, 1.28, 0, 0, 0, 0, 3); for (let i = 0; i < 12; i++) ag.cyl(0.015, 0.015, 0.1, 0x3fbf5a, (i % 4 - 1.5) * 0.045, 1.38, (((i / 4) | 0) - 1) * 0.14, 5); }
    else { ag.torus(0.14, 0.02, 0xff74c4, 0, 0.98, 0, 0, 0, 0, PI * 2, 18); ag.cyl(0.015, 0.015, 0.3, 0xff74c4, 0, 0.8, 0, 6); for (let i = 0; i < 3; i++) ag.sph(0.07 + i * 0.03, 0xbff3ff, 0.1 + i * 0.12, 1.3 + i * 0.18, 0, 1, 1, 1, 12); }
    a.add(part(ag)); a.rotation.z = -s * 2.4; root.add(a); arms.push(a);
  }
  root.userData = { head, mouth, arms, bodyM, h: 1.95, headY: 1.4, arms0: 2.4, hover: 0.18, extra(t) { bodyM.rotation.y = Math.sin(t * 2.0) * 0.25; } };
  return addLids(root, [[-0.15, 0.32, 0.31, 0.11, blue], [0.15, 0.32, 0.31, 0.11, blue]]);
}

// ================================================================ Fantasmo Sabanilla
function makeFantasma() {
  const root = new THREE.Group(); const body = new GB(); const sheet = 0xf6f2ff, shade = 0xc9c0f0;
  // zapatillas de conejito
  for (const s of [-1, 1]) { body.sph(0.17, 0xffb3d0, s * 0.2, 0.1, 0.18, 1.1, 0.7, 1.5, 16); for (const e of [-1, 1]) body.sph(0.055, 0xffd6e6, s * 0.2 + e * 0.07, 0.24, 0.3, 0.9, 2.2, 0.8, 8); body.sph(0.04, PAL.white, s * 0.2, 0.1, 0.44, 1, 1, 1, 8); }
  // sábana con dobladillo ondulado
  body.cyl(0.4, 0.62, 0.9, (x, y) => mix(shade, sheet, Math.min(1, y * 1.5)), 0, 0.2, 0, 32);
  for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; body.sph(0.17, (x, y) => mix(shade, sheet, 0.4), Math.cos(a) * 0.6, 0.24 + (i % 2) * 0.05, Math.sin(a) * 0.6, 1, 0.85, 1, 12); }
  body.sph(0.42, sheet, 0, 1.1, 0, 1.0, 0.55, 0.9, 26);
  body.sph(0.08, 0xff74c4, 0, 0.84, 0.4, 1, 1, 0.6, 12); body.sph(0.05, 0xffd23f, 0, 0.84, 0.44, 1, 1, 0.6, 8);
  // corazoncitos bordados
  for (const [x, y] of [[-0.2, 0.52], [0.24, 0.62], [0.0, 0.4]]) { body.sph(0.035, 0xff74c4, x - 0.025, y, 0.54, 1, 1, 0.5, 6); body.sph(0.035, 0xff74c4, x + 0.025, y, 0.54, 1, 1, 0.5, 6); }
  const bodyM = part(body); root.add(bodyM);
  const head = new THREE.Group(); head.position.set(0, 1.12, 0.02); const hg = new GB();
  hg.sph(0.4, sheet, 0, 0.3, 0, 1.0, 1.05, 1.0, 32);
  // gorro de dormir con pompón
  hg.sph(0.4, 0x6fa0ff, 0, 0.5, -0.04, 1.02, 0.62, 1.04, 28); hg.torus(0.38, 0.07, 0xffffff, 0, 0.5, 0.0, PI / 2 - 0.2, 0, 0, PI * 2, 28);
  hg.cone(0.24, 0.5, 0x6fa0ff, -0.12, 0.88, -0.1, 18, 0, 0, 0.9); hg.sph(0.12, 0xffffff, -0.5, 0.82, -0.1, 1, 1, 1, 14);
  for (let i = 0; i < 4; i++) hg.sph(0.03, 0xffd23f, -0.12 + i * 0.07 - 0.05, 0.62 + i * 0.03, 0.33, 1, 1, 0.5, 6);
  bigEyes(hg, 0.28, 0.15, 0.115, 0x2a3a7a, 0.34); blush(hg, 0.12, 0.27, 0.32, 0xffa0c0, 0.09);
  hg.sph(0.035, shade, 0, 0.17, 0.4, 1, 0.8, 0.8, 8);
  for (const s of [-1, 1]) hg.box(0.1, 0.028, 0.03, 0x9a90d0, s * 0.16, 0.44, 0.37, 0, 0, s * -0.2);
  const headM = part(hg); head.add(headM); const mouth = mouthMesh(head, 0.05, 0.4, 0.075); root.add(head);
  const arms = [];
  for (const s of [-1, 1]) {
    const a = armGroup(root, s, 0.98, 0.34); const ag = new GB();
    ag.sph(0.12, sheet, 0, 0.12, 0, 1, 2.2, 1, 18); ag.sph(0.11, sheet, 0, 0.42, 0, 1, 1, 1, 16);
    if (s === 1) { // ambientador de lavanda
      ag.cyl(0.11, 0.11, 0.42, 0xb06bff, 0, 0.48, 0, 18); ag.cyl(0.08, 0.1, 0.14, 0xffffff, 0, 0.9, 0, 14); ag.sph(0.1, 0xff74c4, 0, 1.06, 0.0, 1, 0.8, 1, 12); ag.cyl(0.02, 0.02, 0.2, 0x2a1840, 0.1, 1.08, 0, 6, 0, 0, PI / 2);
      for (let i = 0; i < 4; i++) ag.sph(0.05 + i * 0.015, 0xe8d8ff, 0.3 + i * 0.1, 1.1 + (i % 2) * 0.1, 0, 1, 1, 1, 10);
    } else { ag.cyl(0.025, 0.025, 0.6, 0x8a8aa0, 0, 0.5, 0, 6); ag.sph(0.22, 0xfff0a0, 0, 1.2, 0, 1, 1.15, 1, 20); ag.sph(0.12, 0xffffff, 0, 1.2, 0, 1, 1.1, 1, 14); ag.cone(0.06, 0.2, 0xffa63a, 0, 1.46, 0, 8); }
    a.add(part(ag)); a.rotation.z = -s * 2.4; root.add(a); arms.push(a);
  }
  root.userData = { head, mouth, arms, bodyM, h: 1.8, headY: 1.12, arms0: 2.4, hover: 0.12, extra(t) { bodyM.scale.set(1 + Math.sin(t * 3) * 0.03, 1 - Math.sin(t * 3) * 0.02, 1 + Math.sin(t * 3) * 0.03); head.rotation.z = Math.sin(t * 2.1) * 0.09; } };
  return addLids(root, [[-0.15, 0.28, 0.34, 0.115, sheet], [0.15, 0.28, 0.34, 0.115, sheet]]);
}

// ================================================================ Disco Dolores
function makeDisco() {
  const root = new THREE.Group(); const body = new GB();
  const tile = (x, y, z) => { const a = Math.floor((Math.atan2(z, x) + PI) * 5.5), b = Math.floor(y * 9); const k = (a + b) % 6; return k === 0 ? 0xffb3e8 : k === 3 ? 0xa8f0ff : (a + b) % 2 ? 0xf2f6ff : 0xc4cfe8; };
  // botas de plataforma doradas y piernas de rayas
  for (const s of [-1, 1]) { body.cyl(0.07, 0.08, 0.36, (x, y) => (Math.floor(y * 22) % 2 ? 0xff4aa8 : 0xffffff), s * 0.2, 0.12, 0, 12); body.rbox(0.28, 0.17, 0.44, 0.08, 0xffd23f, s * 0.2, 0.0, 0.07, 0, 0, 0, 3); body.sph(0.12, 0xfff0a0, s * 0.2, 0.16, 0.28, 1.1, 0.7, 0.6, 12); }
  body.sph(0.56, tile, 0, 0.82, 0, 1.0, 1.0, 1.0, 34);
  body.torus(0.5, 0.05, 0xffd23f, 0, 0.7, 0, PI / 2, 0, 0, PI * 2, 30); body.sph(0.1, 0xff4aa8, 0.0, 0.7, 0.52, 1, 1, 0.6, 12);
  const bodyM = part(body); root.add(bodyM);
  const head = new THREE.Group(); head.position.set(0, 1.28, 0.02); const hg = new GB();
  hg.sph(0.36, 0xf4be92, 0, 0.3, 0.02, 1.0, 0.98, 0.96, 28);
  // peinado afro-diva de nubes de color
  const hairC = [0xff4aa8, 0xb06bff, 0xff74c4, 0xff4aa8];
  for (let i = 0; i < 11; i++) { const a = i / 11 * PI * 2, up = i % 2; if (Math.sin(a) > 0.25) continue; hg.sph(0.22, hairC[i % 4], Math.cos(a) * 0.34, 0.4 + up * 0.15, Math.sin(a) * 0.3 - 0.1, 1, 1, 1, 16); }
  for (const s of [-1, 1]) { hg.sph(0.2, 0xff4aa8, s * 0.36, 0.5, 0.12, 1, 1.3, 1, 14); hg.sph(0.15, 0xb06bff, s * 0.3, 0.74, 0.1, 1, 1, 1, 12); }
  hg.sph(0.36, 0xff4aa8, 0, 0.82, -0.04, 1, 0.8, 1, 20); hg.sph(0.18, 0xb06bff, 0.1, 1.0, 0.05, 1, 1, 1, 14); hg.sph(0.08, 0xffd23f, -0.16, 0.98, 0.18, 1, 1, 1, 10);
  // gafas de corazón
  for (const s of [-1, 1]) { hg.sph(0.15, 0xffffff, s * 0.16, 0.34, 0.31, 1.0, 1.0, 0.45, 20); hg.sph(0.125, 0xff3d86, s * 0.16, 0.34, 0.345, 1.0, 1.0, 0.4, 20); hg.sph(0.045, 0xffffff, s * 0.16 - 0.04, 0.4, 0.4, 1, 0.6, 0.6, 8); }
  hg.box(0.12, 0.04, 0.04, 0xffffff, 0, 0.36, 0.34);
  for (const s of [-1, 1]) { hg.torus(0.07, 0.015, 0xffd23f, s * 0.37, 0.12, 0.0, 0, PI / 2, 0, PI * 2, 14); hg.sph(0.07, 0xff8fa6, s * 0.23, 0.15, 0.3, 1.2, 0.75, 0.5, 10); }
  hg.sph(0.055, 0xe89a7a, 0, 0.23, 0.36, 1, 0.9, 0.9, 10);
  // labios glamurosos
  hg.sph(0.09, 0xff2d6a, 0, 0.1, 0.34, 1.4, 0.5, 0.5, 14);
  const headM = part(hg); head.add(headM); const mouth = mouthMesh(head, 0.075, 0.345, 0.07); root.add(head);
  const arms = [];
  for (const s of [-1, 1]) {
    const a = armGroup(root, s, 1.05, 0.5); const ag = new GB();
    ag.cyl(0.07, 0.065, 0.42, 0xff4aa8, 0, 0, 0, 12); ag.torus(0.075, 0.02, 0xffd23f, 0, 0.36, 0, PI / 2, 0, 0, PI * 2, 12); ag.sph(0.1, 0xf4be92, 0, 0.5, 0, 1, 1, 1, 14);
    if (s === 1) { // boa de plumas = plumero
      ag.cyl(0.025, 0.025, 0.5, 0xffd23f, 0, 0.55, 0, 8);
      for (let f = 0; f < 22; f++) { const b = f * 1.1, u = f / 22; ag.sph(0.1, [0xff74c4, 0xff4aa8, 0xffa6e0, 0xb06bff][f % 4], Math.sin(b) * 0.1, 1.0 + u * 0.55, Math.cos(b) * 0.1, 1.2, 0.8, 1.2, 10); }
    } else { ag.cyl(0.02, 0.02, 0.6, 0xcfd8e8, 0, 0.5, 0, 6); ag.sph(0.2, tile, 0, 1.2, 0, 1, 1, 1, 20); for (let i = 0; i < 4; i++) ag.cone(0.03, 0.1, 0xffffff, Math.cos(i * 1.57) * 0.22, 1.2 + Math.sin(i * 1.57) * 0.22, 0, 4, 0, 0, i * 1.57 - 1.57); }
    a.add(part(ag)); a.rotation.z = -s * 2.4; root.add(a); arms.push(a);
  }
  const glint = []; 
  root.userData = { head, mouth, arms, bodyM, h: 1.8, headY: 1.28, arms0: 2.4, extra(t) { bodyM.rotation.y = t * 0.8; head.rotation.z = Math.sin(t * 4) * 0.07; } };
  return root;
}

const T = (a, b, c) => [[a[0], a[1]], [b[0], b[1]], [c[0], c[1]]];
export const EXTRA_PLAYERS = [
  { id: 'pulpo', name: 'Pulpo Plumero', sub: 'Ocho brazos, ocho plumeros, cero vergüenza', price: 11500, make: () => hiQ(makePulpo),
    perk: 'Ocho plumeros: +12 % de puntos por objeto', perkK: { score: 0.12 },
    theme: { f: T([0xffb3cc, 0xff5a8c], [0xffd9e6, 0xff8ab0], [0xffffff, 0xffc2d8]), ring: 0xff5a8c, glow: 0xff7aa8, bits: [0xff4a6e, 0xff9a2a, 0xffd23f, 0x3fe0b0, 0x4aa8ff, 0xb06bff], spd: 1.1, freq: 1.2 },
    fx: { colors: [0xff4a6e, 0xffd23f, 0x3fe0b0, 0x4aa8ff, 0xb06bff], shape: 2, rate: 20, g: -0.8, up: 1.3, alpha: 0.95, sz: 1.1 },
    say: ['¡Ocho brazos, ocho plumeros!', '¡Esto es una limpieza de tinta china!', 'Tengo más manos que excusas.', '¿Pulpo a feira? ¡Pulpo a limpiar!', '¡Le quito el polvo hasta a las dudas!', '¡Cuidado, que me enredo con mis propios plumeros!', '¡Tinta no, que mancha!', '¡Sacudo, sacudo, sacudo… y me sacudo!'],
    voice: { pitch: 1.3, rate: 1.1 }, start: '¡Ocho brazos, ocho plumeros!' },
  { id: 'jamon', name: 'Don Jamón Jamonero', sub: 'Curado en salero y en limpieza', price: 15000, make: () => hiQ(makeJamon),
    perk: 'Pata negra: empiezas un 14 % más grande', perkK: { grow: 0.14 },
    theme: { f: T([0xffb0b8, 0xc23c56], [0xffe2d6, 0xe8607a], [0xfff4ea, 0xffb0b8]), ring: 0xc23c56, glow: 0xe8607a, bits: [0xc23c56, 0xfff0e2, 0xffd23f, 0x2a2a3a], spd: 0.9, freq: 1.0 },
    fx: { colors: [0xe8607a, 0xfff0e2, 0xffd23f, 0xc23c56], shape: 4, rate: 16, g: -0.2, up: 1.1, alpha: 0.75, sz: 1.5 },
    say: ['¡Esto está de pata negra!', '¡A limpiar con salero y sal gorda!', '¡Más fino que una loncha cortada a cuchillo!', '¡Ni un hueso sin repasar!', 'Yo no me corto… bueno, un poquito.', '¡Que me pongan un bocata de esta mugre!', '¡Olé, qué curado estoy de todo!', '¡Hasta el jamón limpia mejor que tu cuñado!'],
    voice: { pitch: 0.7, rate: 0.95 }, start: '¡Olé! ¡Jamón y limpieza!' },
  { id: 'croqueta', name: 'Croqueta Ciclón', sub: 'Crujiente por fuera, bechamel por dentro', price: 19000, make: () => hiQ(makeCroqueta),
    perk: 'Rebozado de combo: el combo dura 1,3 s más', perkK: { combo: 1.3 },
    theme: { f: T([0xffe0a0, 0xe9a94c], [0xfff3cf, 0xf0b85a], [0xffffff, 0xffe9b8]), ring: 0xe9a94c, glow: 0xf6cf7c, bits: [0xe9a94c, 0xf6cf7c, 0xfff6dc, 0x3fbf5a], spd: 1.25, freq: 1.4 },
    fx: { colors: [0xe9a94c, 0xf6cf7c, 0xfff6dc, 0x3fbf5a], shape: 1, rate: 22, g: 3.2, up: 1.6, alpha: 1, sz: 0.9 },
    say: ['¡Crujiente por fuera, limpia por dentro!', '¡Rebozada en polvo y a freír!', '¡Que no me falte la bechamel!', '¡Ni me frías ni me aspires… bueno, aspira!', '¡Soy la croqueta de la abuela, pero con turbo!', '¡Cuidado, que quemo!', '¡Tres croquetas por una escoba!', '¡Dame perejil y moveré el mundo!'],
    voice: { pitch: 1.1, rate: 1.2 }, start: '¡Croqueta ciclón, a por todas!' },
  { id: 'genio', name: 'Genio del Fregadero', sub: 'Concede tres deseos, todos de limpieza', price: 24000, make: () => hiQ(makeGenio),
    perk: 'Tres deseos: tras un golpe eres invulnerable 1,4 s más', perkK: { inv: 1.4 },
    theme: { f: T([0xbfefff, 0x3bb4ff], [0xe0f8ff, 0x7ad4ff], [0xffffff, 0xbfefff]), ring: 0x3bb4ff, glow: 0x5ac8ff, bits: [0xffffff, 0xb6ff3a, 0x3bb4ff, 0xffd23f, 0xff74c4], spd: 1.35, freq: 1.6 },
    fx: { colors: [0xffffff, 0xbff3ff, 0xb6ff3a, 0xffd23f], shape: 3, rate: 28, g: -1.6, up: 1.5, alpha: 0.95, sz: 1.2 },
    say: ['¡Deseo concedido: suelo limpio!', '¡Frotad la lámpara… y la sartén también!', '¡Tres deseos: polvo fuera, polvo fuera y polvo fuera!', '¡Abracadabra, espumita!', '¡Más espuma que un jacuzzi de abuelas!', '¡Estoy hasta el gorro… de esponja!', '¡Qué bien huelo a limón!', '¡Soy el genio que fregó el cielo!'],
    voice: { pitch: 0.55, rate: 1.0 }, start: '¡Deseo concedido: suelo limpio!' },
  { id: 'fantasma', name: 'Fantasmo Sabanilla', sub: 'Asusta a la mugre desde ultratumba', price: 30000, make: () => hiQ(makeFantasma),
    perk: 'Intangible: +6 % de velocidad y golpes un 25 % más suaves', perkK: { speed: 0.06, hit: 0.75 },
    theme: { f: T([0xf0eaff, 0xb9a8ff], [0xffffff, 0xd8ccff], [0xfdfaff, 0xe8e0ff]), ring: 0xb9a8ff, glow: 0xd8ccff, bits: [0xffffff, 0xe8d8ff, 0xb9a8ff, 0xffd6e6], spd: 0.85, freq: 0.9 },
    fx: { colors: [0xffffff, 0xe8d8ff, 0xffd6e6, 0xb9a8ff], shape: 4, rate: 20, g: -1.0, up: 1.5, alpha: 0.6, sz: 1.7 },
    say: ['¡Buuu… perdón, buenas!', '¡Soy un fantasma muy limpio!', '¡Me han lavado a 40 grados y sigo aquí!', '¡Buuu! ¡Barriendo desde ultratumba!', 'Atravieso paredes… y manchas.', '¡Tiemblo de emoción, no de miedo!', '¡Mi sábana está de oferta, mi alma no!', '¡Ay, qué susto me he dado yo solo!'],
    voice: { pitch: 1.5, rate: 0.85 }, start: '¡Buuu! ¡A limpiar de ultratumba!' },
  { id: 'disco', name: 'Disco Dolores', sub: 'Brilla, barre y baila el sábado noche', price: 38000, make: () => hiQ(makeDisco),
    perk: 'Imán de purpurina: atrae monedas y relojes de más lejos', perkK: { magnet: 0.7, coins: 0.1 },
    theme: { f: T([0xffb3e8, 0xa8f0ff], [0xffe0f6, 0xd8b8ff], [0xffffff, 0xfff0a0]), ring: 0xff4aa8, glow: 0xff74c4, bits: [0xff4aa8, 0xa8f0ff, 0xffd23f, 0xb06bff, 0xffffff, 0x3fe0b0], spd: 1.7, freq: 1.8 },
    fx: { colors: [0xff4aa8, 0xa8f0ff, 0xffd23f, 0xb06bff, 0xffffff], shape: 3, rate: 36, g: 0, up: 0.9, alpha: 1, sz: 1.0, fast: true },
    say: ['¡A bailar la mugre, nena!', '¡Sábado noche, polvo noche!', '¡Brillo, brillo, brillo… y barrido!', '¡Que suene la fregona, DJ!', '¡Estoy que me rompo… de lo bien que limpio!', '¡Purpurina por el suelo, pero ordenada!', '¡Esto es una fiesta de limpieza!', '¡Mueve el polvito, mueve el polvito!'],
    voice: { pitch: 0.95, rate: 1.15 }, start: '¡A bailar la mugre, nena!' },
];
