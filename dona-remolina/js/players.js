// Las 6 limpiadoras jugables de Mueblópolis. Todo el arte es original y procedural.
import * as THREE from 'three';
import { GB, lighten, darken, mix, hiQ } from './geo.js?v=5';
import { addLids, EXTRA_PLAYERS } from './players2.js?v=5';
import { PAL, part, makeDona } from './models.js?v=5';
const PI = Math.PI;
const INK = 0x2a1840;

// ---- cara/ojos compartidos ----
function eyePair(g, ey, o = {}) {
  const sp = o.sp || 0.14, r = o.r || 0.095;
  for (const s of [-1, 1]) {
    if (o.patch && s === -1) continue;
    g.sph(r, o.white || PAL.white, s * sp, ey, 0.31, 1, 1.1, 0.7, 10);
    if (o.slit) { g.sph(r * 0.62, o.iris || PAL.lime, s * sp, ey, 0.355, 1, 1.1, 0.5, 8); g.box(0.034, r * 1.6, 0.03, INK, s * sp, ey - r * 0.8, 0.385); }
    else g.sph(r * 0.64, o.pupil || INK, s * sp, ey - 0.005, 0.37, 1, 1.1, 0.7, 10);
    g.sph(0.024, PAL.white, s * sp + 0.026, ey + 0.034, 0.41, 1, 1, 1, 6); g.sph(0.012, PAL.white, s * sp - 0.024, ey - 0.03, 0.405, 1, 1, 1, 5);
  }
}

// ---------------------------------------------------------------- Doña Remolina
function makeDonaP() { const r = makeDona(); r.userData.headY = 1.36; r.userData.arms0 = 2.35; return r; }

// ---------------------------------------------------------------- Gato Aspiradora
function makeGato() {
  const root = new THREE.Group(); const body = new GB();
  const fur = 0xff9a3c, furD = 0xd9701e, belly = 0xfff0d8, red = 0xe8453c, grey = 0xb9c4d6;
  // canister-aspiradora con ruedas
  body.sph(0.52, red, 0, 0.5, 0, 1.05, 0.78, 1.0, 20); body.torus(0.46, 0.045, PAL.white, 0, 0.55, 0, PI / 2, 0, 0, PI * 2, 22);
  body.cyl(0.14, 0.14, 0.12, INK, 0.4, 0.0, 0.1, 10, 0, 0, PI / 2); body.cyl(0.14, 0.14, 0.12, INK, -0.4, 0.0, 0.1, 10, 0, 0, PI / 2);
  body.cyl(0.14, 0.14, 0.12, INK, 0.0, 0.0, -0.4, 10, 0, 0, PI / 2);
  body.sph(0.1, PAL.sun, 0.0, 0.62, 0.5, 1, 1, 0.6, 8); body.rbox(0.28, 0.1, 0.05, 0.03, INK, 0, 0.35, 0.5, 0, 0, 0, 2);
  // torso del gato (asoma por encima)
  body.cyl(0.26, 0.36, 0.55, fur, 0, 0.7, 0, 16); body.sph(0.25, belly, 0, 0.98, 0.14, 0.95, 1.2, 0.55, 12);
  for (let i = 0; i < 3; i++) body.box(0.24, 0.04, 0.03, furD, 0, 0.8 + i * 0.12, 0.3 - i * 0.02, 0, 0, 0);
  body.torus(0.25, 0.05, PAL.coral, 0, 1.22, 0.02, PI / 2.2, 0, 0, PI * 2, 16); body.sph(0.075, PAL.sun, 0, 1.12, 0.3, 1, 1, 0.8, 8);
  const bodyM = part(body); root.add(bodyM);
  // cola
  const tail = new THREE.Group(); tail.position.set(0, 0.7, -0.38);
  const tg = new GB(); for (let i = 0; i < 9; i++) { const a = i / 8 * 2.1; tg.sph(0.1 - i * 0.004, i % 2 ? furD : fur, 0, 0.1 + Math.sin(a) * 0.38, -0.12 - (1 - Math.cos(a)) * 0.18, 1, 1, 1, 8); } tg.sph(0.105, belly, 0, 0.5, -0.4, 1, 1, 1, 8);
  tail.add(part(tg)); root.add(tail);
  // cabeza
  const head = new THREE.Group(); head.position.set(0, 1.3, 0.02); const hg = new GB();
  hg.sph(0.4, fur, 0, 0.3, 0, 1.12, 0.92, 0.98, 18);
  for (let i = -1; i <= 1; i++) hg.box(0.045, 0.16, 0.03, furD, i * 0.1, 0.6, 0.27, -0.25, 0, i * 0.15);
  for (const s of [-1, 1]) {
    hg.cone(0.17, 0.34, fur, s * 0.3, 0.52, -0.02, 4, 0, PI / 4 * s, s * -0.35); hg.cone(0.1, 0.22, 0xff9fb8, s * 0.3, 0.54, 0.04, 4, 0, PI / 4 * s, s * -0.35);
    for (let k = 0; k < 3; k++) { hg.box(0.26, 0.012, 0.012, 0xffffff, s * 0.42, 0.2 + (k - 1) * 0.05, 0.33, 0, s * -0.35, s * (0.15 - k * 0.13)); }
    hg.sph(0.1, belly, s * 0.1, 0.12, 0.34, 1.1, 0.8, 0.8, 8);
  }
  eyePair(hg, 0.36, { slit: true, iris: 0x7dff6a, r: 0.11, sp: 0.16, white: 0xfffbe8 });
  hg.sph(0.045, 0xff7aa0, 0, 0.23, 0.4, 1.2, 0.8, 0.8, 6);
  hg.box(0.02, 0.07, 0.02, INK, 0, 0.17, 0.4);
  const headM = part(hg); head.add(headM);
  const mg = new GB(); mg.sph(0.11, 0x8a1f45, 0, 0, 0, 1.2, 0.8, 0.6, 10); mg.sph(0.06, 0xff6f8f, 0, -0.035, 0.02, 1.2, 0.55, 0.6, 8);
  const mouth = part(mg, false); mouth.position.set(0, 0.08, 0.37); head.add(mouth); root.add(head);
  // brazos: izquierdo = zarpa; derecho = manguera con boquilla
  const arms = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(s * 0.3, 1.0, 0.0); const ag = new GB();
    if (s === -1) { ag.cyl(0.075, 0.07, 0.5, fur, 0, 0, 0, 8); ag.sph(0.13, belly, 0, 0.56, 0, 1.1, 1, 1, 8); for (let k = -1; k <= 1; k++) ag.sph(0.035, 0xff9fb8, k * 0.06, 0.64, 0.08, 1, 1, 1, 5); }
    else {
      for (let i = 0; i < 9; i++) ag.torus(0.075, 0.025, i % 2 ? grey : 0x8da0bd, 0, 0.05 + i * 0.075, 0, PI / 2, 0, 0, PI * 2, 8);
      ag.sph(0.12, belly, 0, 0.7, 0, 1.1, 1, 1, 8); ag.box(0.5, 0.1, 0.22, red, 0, 0.78, 0); ag.box(0.5, 0.03, 0.2, INK, 0, 0.87, 0); ag.box(0.52, 0.12, 0.05, PAL.white, 0, 0.78, 0.12);
    }
    a.add(part(ag)); a.rotation.z = -s * 2.4; root.add(a); arms.push(a);
  }
  root.userData = { head, mouth, arms, bodyM, h: 1.7, headY: 1.3, arms0: 2.4, tail, extra(t) { tail.rotation.z = Math.sin(t * 5) * 0.45; tail.rotation.y = Math.sin(t * 2.2) * 0.25; } };
  return root;
}

// ---------------------------------------------------------------- Capitán Fregona
function makeFregona() {
  const root = new THREE.Group(); const body = new GB();
  const navy = 0x2c4b9b, boot = 0xffd23f;
  for (const s of [-1, 1]) { body.cyl(0.1, 0.12, 0.36, boot, s * 0.15, 0, 0, 10); body.rbox(0.26, 0.1, 0.4, 0.05, boot, s * 0.15, 0, 0.07); body.cyl(0.1, 0.1, 0.14, 0xffffff, s * 0.15, 0.36, 0, 10); }
  body.cyl(0.3, 0.38, 0.8, (x, y) => (Math.floor((y + 5) * 6.5) % 2 ? navy : 0xffffff), 0, 0.4, 0, 20);
  body.cyl(0.28, 0.3, 0.2, (x, y) => (Math.floor((y + 5) * 6.5) % 2 ? navy : 0xffffff), 0, 1.14, 0, 16);
  body.cyl(0.4, 0.4, 0.07, 0x2a1840, 0, 0.62, 0, 20); body.rbox(0.2, 0.15, 0.06, 0.03, PAL.gold, 0, 0.58, 0.39, 0, 0, 0, 2);
  body.torus(0.26, 0.07, 0xff4a3d, 0, 1.28, 0.02, PI / 2.2, 0, 0, PI * 2, 16); body.cone(0.1, 0.24, 0xff4a3d, 0.08, 1.0, 0.27, 6, PI, 0, 0.1);
  for (let i = 0; i < 3; i++) body.sph(0.04, PAL.gold, 0, 0.9 - i * 0.18, 0.36, 1, 1, 0.5, 6);
  const bodyM = part(body); root.add(bodyM);
  const head = new THREE.Group(); head.position.set(0, 1.3, 0.02); const hg = new GB();
  hg.sph(0.37, 0xffd2ae, 0, 0.3, 0, 1, 0.95, 0.95, 18);
  // cubo-sombrero
  hg.cyl(0.4, 0.31, 0.36, 0x2a8cf0, 0, 0.55, 0, 18); hg.torus(0.4, 0.035, 0xffffff, 0, 0.9, 0, PI / 2, 0, 0, PI * 2, 18); hg.torus(0.33, 0.02, 0xcfd8e8, 0, 0.86, 0.0, 0, 0, 0, PI, 12);
  hg.sph(0.07, 0xcfd8e8, 0.36, 0.74, 0, 1, 1, 1, 6); hg.sph(0.07, 0xcfd8e8, -0.36, 0.74, 0, 1, 1, 1, 6);
  // fregona-pelo (tiras cayendo)
  for (let i = 0; i < 22; i++) { const a = i / 22 * PI * 2, rx = Math.cos(a) * 0.4, rz = Math.sin(a) * 0.4 - 0.02; const col = i % 3 ? 0xf2f2fa : 0xc9d3e6; if (rz > 0.2 && Math.abs(rx) < 0.28) continue; hg.cyl(0.035, 0.022, 0.55 + (i % 4) * 0.08, col, rx * 1.02, 0.55 - 0.45 - (i % 4) * 0.04, rz * 1.02, 6, -rz * 0.45, 0, rx * 0.45); }
  eyePair(hg, 0.34, { patch: true, r: 0.1, sp: 0.15 });
  hg.sph(0.13, INK, -0.15, 0.34, 0.33, 1, 1, 0.45, 10); hg.box(0.9, 0.03, 0.03, INK, 0, 0.5, 0.18, 0, 0, -0.35);
  hg.box(0.12, 0.032, 0.03, 0xdcdcf0, 0.15, 0.5, 0.35, 0, 0, -0.2);
  hg.sph(0.07, 0xffa07f, 0, 0.24, 0.37, 1, 0.9, 0.9, 8);
  for (const s of [-1, 1]) { hg.sph(0.13, 0xf4f4ff, s * 0.14, 0.1, 0.33, 1.5, 0.75, 0.8, 8, 0, 0, s * -0.4); hg.sph(0.08, 0xf4f4ff, s * 0.3, 0.07, 0.3, 1.2, 0.8, 0.8, 8, 0, 0, s * 0.9); hg.sph(0.045, 0xf4f4ff, s * 0.38, 0.14, 0.28, 1, 1, 1, 6); hg.sph(0.07, 0xff9aa8, s * 0.27, 0.2, 0.27, 1.2, 0.7, 0.5, 8); }
  const headM = part(hg); head.add(headM);
  const mg = new GB(); mg.sph(0.1, 0x8a1f45, 0, 0, 0, 1.1, 0.7, 0.6, 10); mg.sph(0.05, 0xff6f8f, 0, -0.03, 0.02, 1.1, 0.5, 0.6, 8);
  const mouth = part(mg, false); mouth.position.set(0, 0.05, 0.31); head.add(mouth); root.add(head);
  const arms = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(s * 0.27, 1.12, 0); const ag = new GB();
    ag.cyl(0.075, 0.07, 0.5, (x, y) => (Math.floor((y + 5) * 9) % 2 ? navy : 0xffffff), 0, 0, 0, 8); ag.cyl(0.09, 0.09, 0.07, 0xffffff, 0, 0.42, 0, 8); ag.sph(0.1, s === 1 ? 0xffd23f : 0xffd2ae, 0, 0.55, 0, 1, 1, 1, 8);
    if (s === 1) { // la fregona
      ag.cyl(0.028, 0.028, 0.85, PAL.woodL, 0, 0.5, 0, 6);
      for (let i = 0; i < 14; i++) { const aa = i / 14 * PI * 2; ag.cyl(0.03, 0.022, 0.5, i % 2 ? 0xffffff : 0xdce6f4, Math.cos(aa) * 0.1, 1.2, Math.sin(aa) * 0.1, 5, Math.sin(aa) * 0.55, 0, -Math.cos(aa) * 0.55); }
      ag.sph(0.1, 0x2a8cf0, 0, 1.36, 0, 1, 0.8, 1, 8);
      for (let i = 0; i < 5; i++) ag.sph(0.05 + i * 0.01, 0xbff3ff, 0.12 + i * 0.05, 1.5 + i * 0.12, 0.03 * (i % 2 ? 1 : -1), 1, 1, 1, 6);
    }
    a.add(part(ag)); a.rotation.z = -s * 2.4; root.add(a); arms.push(a);
  }
  root.userData = { head, mouth, arms, bodyM, h: 1.7, headY: 1.3, arms0: 2.4 };
  return root;
}

// ---------------------------------------------------------------- Brujita Escobilla
function makeBruja() {
  const root = new THREE.Group(); const body = new GB();
  const robe = 0x7b3fe4, robeL = 0x9a64ff;
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) body.cyl(0.055, 0.055, 0.085, i % 2 ? 0xffffff : 0xff74c4, s * 0.13, 0.12 + i * 0.085, 0, 8);
    body.rbox(0.24, 0.13, 0.42, 0.06, 0x2a1840, s * 0.13, 0, 0.06); body.sph(0.06, PAL.sun, s * 0.13, 0.14, 0.26, 1, 1, 0.6, 6);
  }
  body.cyl(0.27, 0.56, 0.85, (x, y, z) => ((Math.floor((x + 5) * 7) + Math.floor((y + 5) * 7)) % 5 === 0 ? 0xffd23f : robe), 0, 0.34, 0, 22);
  body.torus(0.55, 0.05, 0xff74c4, 0, 0.38, 0, PI / 2, 0, 0, PI * 2, 24);
  body.cyl(0.27, 0.27, 0.25, robe, 0, 1.12, 0, 14); body.cyl(0.29, 0.29, 0.08, 0xff74c4, 0, 0.9, 0, 16);
  body.sph(0.09, 0xffd23f, 0, 1.2, 0.3, 1, 1, 0.5, 8); body.torus(0.22, 0.07, robeL, 0, 1.25, 0.03, PI / 2.3, 0, 0, PI * 2, 14);
  // murciélago-mascota en el hombro
  body.sph(0.075, INK, -0.28, 1.4, 0.05, 1, 1, 1, 8); body.sph(0.1, INK, -0.37, 1.43, 0.05, 1.5, 0.35, 0.8, 8, 0, 0, 0.5); body.sph(0.1, INK, -0.2, 1.43, 0.05, 1.5, 0.35, 0.8, 8, 0, 0, -0.5);
  body.sph(0.014, 0xff6b5e, -0.3, 1.43, 0.12, 1, 1, 1, 4); body.sph(0.014, 0xff6b5e, -0.26, 1.43, 0.12, 1, 1, 1, 4);
  const bodyM = part(body); root.add(bodyM);
  const head = new THREE.Group(); head.position.set(0, 1.36, 0.02); const hg = new GB();
  hg.sph(0.37, 0xffe0c8, 0, 0.3, 0, 1, 0.95, 0.95, 18);
  const hair = 0xff74c4;
  hg.sph(0.4, hair, 0, 0.4, -0.08, 1.0, 0.92, 1.0, 16);
  for (let i = -2; i <= 2; i++) hg.sph(0.09, hair, i * 0.13, 0.55, 0.3 - Math.abs(i) * 0.03, 1, 1.2, 0.7, 8);
  for (const s of [-1, 1]) for (let k = 0; k < 5; k++) hg.sph(0.095 - k * 0.008, k % 2 ? lighten(hair, 0.2) : hair, s * (0.38 + k * 0.03), 0.22 - k * 0.14, -0.05 + Math.sin(k) * 0.04, 1, 1, 1, 8);
  for (const s of [-1, 1]) hg.sph(0.07, 0xffd23f, s * 0.43, -0.45, -0.05, 1, 1, 1, 8);
  // sombrero de bruja torcido
  hg.cyl(0.62, 0.62, 0.05, 0x3a1f7a, 0, 0.7, 0, 24); hg.cone(0.36, 0.7, 0x5a2fc9, 0, 0.72, 0, 20); hg.cone(0.2, 0.42, 0x5a2fc9, 0.1, 1.28, 0, 12, 0, 0, -0.55);
  hg.torus(0.34, 0.05, 0xffd23f, 0, 0.78, 0, PI / 2, 0, 0, PI * 2, 20); hg.sph(0.09, 0xffd23f, 0.0, 0.8, 0.36, 1.1, 1.1, 0.5, 8);
  hg.sph(0.04, 0xffffff, -0.06, 1.0, 0.27, 1, 1, 1, 4); hg.sph(0.035, 0xff74c4, 0.08, 1.12, 0.22, 1, 1, 1, 4);
  for (const s of [-1, 1]) {
    hg.sph(0.105, PAL.white, s * 0.14, 0.33, 0.31, 1, 1.15, 0.7, 10); hg.sph(0.065, 0x3fbf5a, s * 0.14, 0.325, 0.36, 1, 1.15, 0.7, 8); hg.sph(0.034, INK, s * 0.14, 0.325, 0.395, 1, 1.15, 0.7, 6); hg.sph(0.02, PAL.white, s * 0.14 + 0.025, 0.36, 0.41, 1, 1, 1, 5);
    for (let k = 0; k < 3; k++) hg.box(0.07, 0.015, 0.02, INK, s * (0.22 + k * 0.035), 0.4 + k * 0.03, 0.34, 0, 0, s * (0.5 + k * 0.4));
    hg.sph(0.07, 0xff8fa6, s * 0.24, 0.17, 0.28, 1.2, 0.75, 0.5, 8);
  }
  hg.sph(0.045, 0xffb28f, 0, 0.22, 0.37, 1, 0.9, 0.9, 8);
  const headM = part(hg); head.add(headM);
  const mg = new GB(); mg.sph(0.1, 0x8a1f45, 0, 0, 0, 1.15, 0.75, 0.6, 10); mg.sph(0.06, 0xff6f8f, 0, -0.035, 0.02, 1.1, 0.5, 0.6, 8); mg.cone(0.025, 0.06, PAL.white, 0.06, 0.02, 0.05, 4, PI, 0, 0);
  const mouth = part(mg, false); mouth.position.set(0, 0.1, 0.32); head.add(mouth); root.add(head);
  const arms = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(s * 0.26, 1.12, 0); const ag = new GB();
    ag.cyl(0.07, 0.065, 0.5, robe, 0, 0, 0, 8); ag.cyl(0.085, 0.085, 0.06, 0xffd23f, 0, 0.36, 0, 8); ag.sph(0.09, 0xffe0c8, 0, 0.55, 0, 1, 1, 1, 8);
    if (s === 1) { // escoba voladora
      ag.cyl(0.03, 0.03, 1.5, PAL.woodD, 0, 0.1, 0, 6, 0, 0, 0);
      for (let i = 0; i < 12; i++) { const aa = i / 12 * PI * 2; ag.cone(0.05, 0.55, i % 2 ? 0xffc93a : 0xe6a82a, Math.cos(aa) * 0.1, 1.55, Math.sin(aa) * 0.1, 5, Math.sin(aa) * 0.25, 0, -Math.cos(aa) * 0.25); }
      ag.cyl(0.14, 0.12, 0.14, 0xff74c4, 0, 1.45, 0, 10); ag.sph(0.06, 0xffd23f, 0.15, 1.5, 0, 1, 1, 1, 6);
    }
    a.add(part(ag)); a.rotation.z = -s * 2.4; root.add(a); arms.push(a);
  }
  root.userData = { head, mouth, arms, bodyM, h: 1.7, headY: 1.36, arms0: 2.4, hover: 0.1 };
  return root;
}

// ---------------------------------------------------------------- Robo-Chus 3000
function makeRobo() {
  const root = new THREE.Group(); const body = new GB();
  const white = 0xf2f8ff, cyan = 0x2ad4ff, dark = 0x3a4766, lime = 0xb6ff3a;
  // base de orugas y disco aspirador trasero
  body.rbox(0.9, 0.2, 0.9, 0.09, dark, 0, 0, 0);
  for (const s of [-1, 1]) { body.cyl(0.15, 0.15, 0.2, 0x242c44, s * 0.4, 0.15, 0.0, 14, 0, 0, PI / 2); body.cyl(0.15, 0.15, 0.2, 0x242c44, s * 0.4, 0.15, 0.3, 14, 0, 0, PI / 2); body.rbox(0.2, 0.2, 0.68, 0.09, 0x242c44, s * 0.42, 0.04, 0.15, 0, 0, 0, 2); }
  body.cyl(0.55, 0.55, 0.16, 0xdde6f5, 0, 0.55, -0.4, 22, PI / 2, 0, 0); body.cyl(0.45, 0.45, 0.04, cyan, 0, 0.55, -0.49, 22, PI / 2, 0, 0); body.sph(0.1, lime, 0, 0.55, -0.53, 1, 1, 0.4, 8);
  // torso
  body.rbox(0.7, 0.8, 0.55, 0.16, white, 0, 0.3, 0, 0, 0, 0, 4); body.rbox(0.52, 0.34, 0.06, 0.05, 0x1d2a44, 0, 0.74, 0.27, 0, 0, 0, 2);
  for (let i = 0; i < 4; i++) body.rbox(0.07, 0.1 + i * 0.045, 0.04, 0.02, i < 3 ? lime : 0xff5a4d, -0.16 + i * 0.11, 0.62, 0.31, 0, 0, 0, 1);
  body.sph(0.07, 0xff4a6e, 0.2, 0.44, 0.3, 1, 1, 0.6, 8); body.rbox(0.5, 0.06, 0.06, 0.02, cyan, 0, 0.5, 0.29, 0, 0, 0, 1);
  body.cyl(0.2, 0.2, 0.12, dark, 0, 1.08, 0, 12);
  const bodyM = part(body); root.add(bodyM);
  const head = new THREE.Group(); head.position.set(0, 1.12, 0.0); const hg = new GB();
  hg.rbox(0.82, 0.6, 0.62, 0.2, white, 0, 0.0, 0, 0, 0, 0, 4); hg.rbox(0.66, 0.4, 0.06, 0.1, 0x14213d, 0, 0.1, 0.3, 0, 0, 0, 3);
  for (const s of [-1, 1]) { hg.rbox(0.15, 0.16, 0.05, 0.05, lime, s * 0.15, 0.3, 0.335, 0, 0, 0, 2); hg.sph(0.025, PAL.white, s * 0.15 + 0.03, 0.35, 0.37, 1, 1, 1, 4); hg.cyl(0.07, 0.07, 0.14, cyan, s * 0.46, 0.15, 0, 10, 0, 0, PI / 2); hg.rbox(0.18, 0.06, 0.05, 0.02, 0xff74c4, s * 0.15, 0.17, 0.335, 0, 0, s * -0.3, 1); }
  hg.cyl(0.025, 0.025, 0.35, 0xcfd8e8, 0.0, 0.6, 0, 6); hg.sph(0.09, 0xff4a6e, 0.0, 1.0, 0, 1, 1, 1, 10);
  hg.rbox(0.35, 0.05, 0.05, 0.02, cyan, 0, 0.55, 0.23, 0, 0, 0, 1);
  const headM = part(hg); head.add(headM); head.userData.lampPos = new THREE.Vector3(0, 1.0, 0);
  const mg = new GB(); mg.rbox(0.28, 0.07, 0.04, 0.03, lime, 0, 0, 0, 0, 0, 0, 2);
  const mouth = part(mg, false); mouth.position.set(0, 0.0, 0.335); head.add(mouth); root.add(head);
  const arms = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(s * 0.42, 0.95, 0); const ag = new GB();
    ag.sph(0.1, dark, 0, 0, 0, 1, 1, 1, 8); ag.cyl(0.065, 0.065, 0.4, white, 0, 0.0, 0, 8); ag.sph(0.085, dark, 0, 0.42, 0, 1, 1, 1, 8); ag.cyl(0.05, 0.05, 0.2, 0xcfd8e8, 0, 0.45, 0, 8); ag.sph(0.12, cyan, 0, 0.7, 0, 1.1, 0.8, 1, 8);
    for (const k of [-1, 1]) ag.box(0.04, 0.14, 0.04, dark, k * 0.1, 0.74, 0, 0, 0, k * -0.3);
    if (s === 1) { ag.rbox(0.4, 0.16, 0.22, 0.06, 0xffd23f, 0, 0.9, 0, 0, 0, 0, 2); ag.rbox(0.4, 0.06, 0.24, 0.03, 0x3fbf5a, 0, 1.05, 0, 0, 0, 0, 1); for (let i = 0; i < 3; i++) ag.sph(0.04, 0xbff3ff, -0.1 + i * 0.1, 1.15 + i * 0.05, 0, 1, 1, 1, 6); }
    else { ag.rbox(0.18, 0.3, 0.14, 0.05, 0xff74c4, 0, 0.9, 0, 0, 0, 0, 2); ag.cyl(0.05, 0.05, 0.12, white, 0, 1.2, 0, 8); ag.box(0.1, 0.04, 0.05, white, 0.06, 1.3, 0, 0, 0, 0); }
    a.add(part(ag)); a.rotation.z = -s * 2.4; root.add(a); arms.push(a);
  }
  root.userData = { head, mouth, arms, bodyM, h: 1.7, headY: 1.12, arms0: 2.4, robot: true, extra(t) { head.scale.setScalar(1); const e = head.children[0]; } };
  return root;
}

// ---------------------------------------------------------------- Sir Calcetín
function makeCalcetin() {
  const root = new THREE.Group(); const body = new GB();
  const red = 0xff5a4d, cream = 0xfff3e0, blue = 0x2a8cf0;
  const stripe = (x, y) => (Math.floor((y + 5) * 6) % 2 ? red : cream);
  // pie del calcetín: talón y puntera de colores
  body.rbox(0.62, 0.26, 0.92, 0.12, red, 0, 0, 0.12, 0, 0, 0, 4); body.sph(0.34, 0xffd23f, 0, 0.13, 0.54, 1, 0.8, 0.9, 12); body.sph(0.3, 0xffd23f, 0, 0.4, -0.26, 1, 0.9, 1, 10);
  body.cyl(0.3, 0.34, 0.75, stripe, 0, 0.2, 0, 18);
  body.cyl(0.3, 0.3, 0.2, stripe, 0, 0.9, 0, 16);
  body.sph(0.1, 0xffd23f, 0, 0.78, 0.3, 1, 1, 0.4, 8); // insignia
  for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2 - PI / 2; body.sph(0.028, 0xfff3e0, Math.cos(a) * 0.065, 0.78 + Math.sin(a) * 0.065, 0.34, 1, 1, 1, 4); }
  const bodyM = part(body); root.add(bodyM);
  // capa
  const cape = new THREE.Group(); cape.position.set(0, 1.12, -0.28); const cg = new GB();
  cg.box(0.9, 1.0, 0.04, blue, 0, -0.95, 0); for (let i = -2; i <= 2; i++) cg.cone(0.1, 0.18, blue, i * 0.2, -1.12, 0.0, 4, PI, 0, 0); cg.torus(0.3, 0.06, 0xffd23f, 0, 0.0, 0.1, 0, 0, 0, PI, 10);
  cape.add(part(cg)); cape.rotation.x = 0.18; root.add(cape);
  // cabeza = parte alta del calcetín con la cara
  const head = new THREE.Group(); head.position.set(0, 1.22, 0.02); const hg = new GB();
  hg.cyl(0.36, 0.32, 0.75, stripe, 0, -0.1, 0, 20); hg.sph(0.36, red, 0, 0.62, 0, 1, 0.55, 1, 16);
  hg.torus(0.34, 0.1, cream, 0, 0.58, 0, PI / 2, 0, 0, PI * 2, 18); hg.torus(0.26, 0.08, blue, 0, 0.65, 0, PI / 2, 0, 0, PI * 2, 16);
  hg.cyl(0.03, 0.03, 0.14, 0xffd23f, 0, 0.78, 0, 6); hg.sph(0.14, 0xffd23f, 0, 0.98, 0, 1, 1, 1, 10); for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2; hg.sph(0.07, i % 2 ? red : cream, Math.cos(a) * 0.14, 0.98, Math.sin(a) * 0.14, 1, 1, 1, 6); }
  hg.box(0.74, 0.2, 0.06, 0x2a1840, 0, 0.27, 0.3, -0.1, 0, 0);
  for (const s of [-1, 1]) { hg.sph(0.115, PAL.white, s * 0.15, 0.3, 0.31, 1, 1.05, 0.7, 10); hg.sph(0.058, INK, s * 0.15 + s * -0.01, 0.295, 0.38, 1, 1.1, 0.7, 8); hg.sph(0.02, PAL.white, s * 0.15 + 0.03, 0.33, 0.41, 1, 1, 1, 5); hg.box(0.22, 0.05, 0.04, 0x2a1840, s * 0.16, 0.5, 0.31, -0.1, 0, s * -0.38); }
  hg.sph(0.06, 0xffa07f, 0, 0.17, 0.36, 1, 0.9, 0.9, 8);
  for (const s of [-1, 1]) { hg.sph(0.15, 0x6b3b2a, s * 0.12, 0.04, 0.33, 1.6, 0.7, 0.8, 8, 0, 0, s * -0.3); hg.sph(0.09, 0x6b3b2a, s * 0.28, 0.01, 0.31, 1.3, 0.8, 0.8, 8, 0, 0, s * 0.9); hg.sph(0.05, 0x6b3b2a, s * 0.37, 0.09, 0.29, 1, 1, 1, 6); hg.sph(0.07, 0xff8fa6, s * 0.27, 0.16, 0.27, 1.2, 0.7, 0.5, 8); }
  const headM = part(hg); head.add(headM);
  const mg = new GB(); mg.sph(0.1, 0x8a1f45, 0, 0, 0, 1.1, 0.75, 0.6, 10); mg.sph(0.055, 0xff6f8f, 0, -0.035, 0.02, 1.1, 0.5, 0.6, 8);
  const mouth = part(mg, false); mouth.position.set(0, 0.0, 0.33); head.add(mouth); root.add(head);
  const arms = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(s * 0.3, 1.0, 0); const ag = new GB();
    ag.cyl(0.075, 0.07, 0.5, stripe, 0, 0, 0, 8); ag.sph(0.12, PAL.white, 0, 0.56, 0, 1, 1, 1, 8); ag.torus(0.085, 0.03, blue, 0, 0.45, 0, PI / 2, 0, 0, PI * 2, 8);
    if (s === 1) { // pinza gigante como espada
      ag.rbox(0.14, 0.9, 0.1, 0.04, PAL.woodL, 0, 0.62, 0, 0, 0, 0, 2); ag.rbox(0.05, 0.6, 0.12, 0.02, PAL.woodD, 0, 0.9, 0, 0, 0, 0, 1); ag.sph(0.045, 0xcfd8e8, 0, 0.98, 0.06, 1, 1, 1, 6); ag.rbox(0.2, 0.05, 0.12, 0.02, 0xcfd8e8, 0, 0.7, 0, 0, 0, 0, 1);
    }
    a.add(part(ag)); a.rotation.z = -s * 2.4; root.add(a); arms.push(a);
  }
  root.userData = { head, mouth, arms, bodyM, h: 1.7, headY: 1.22, arms0: 2.4, cape, extra(t, st) { cape.rotation.x = 0.28 + Math.sin(t * 7) * 0.12 + Math.min(0.5, (st && st.speed || 0) * 0.03); } };
  return root;
}

// ---------------------------------------------------------------- catálogo de personajes jugables
const T = (a, b, c) => [[a[0], a[1]], [b[0], b[1]], [c[0], c[1]]];
const BASE_PLAYERS = [
  { id: 'dona', name: 'Doña Remolina', sub: 'La abuela más huracanada', price: 0, make: () => hiQ(() => addLids(makeDonaP(), [[-0.14, 0.33, 0.31, 0.095, PAL.skin], [0.14, 0.33, 0.31, 0.095, PAL.skin]])),
    perk: 'Rulos de la suerte: el combo dura 0,7 s más', perkK: { combo: 0.7 },
    theme: { f: T([0xffd1f0, 0xb8f0ff], [0xfff0a0, 0xffcbf2], [0xffffff, 0xcdf2ff]), ring: 0xff74c4, glow: 0xff74c4, bits: [0xff6b5e, 0xffd23f, 0x3fe0b0, 0x4aa8ff, 0xff74c4, 0xffffff] },
    fx: { colors: [0xff6b5e, 0xffd23f, 0x3fe0b0, 0x4aa8ff, 0xff74c4, 0xffffff], shape: 1, rate: 20, g: 0, up: 1 }, say: ['¡A limpiar!', '¡Qué desorden!', '¡Todo para dentro!', '¡Hasta el último calcetín!', '¡En mis tiempos esto estaba ordenado!', '¡Ay, cuánto polvo!', '¡Me lo llevo todo!', '¡Con esta escoba no hay quien pueda!'],
    voice: { pitch: 1.0, rate: 1.0 }, start: '¡A limpiar!' },
  { id: 'gato', name: 'Gato Aspiradora', sub: 'Míster Succión, siete vidas sin bolsa', price: 1200, make: () => hiQ(() => addLids(makeGato(), [[-0.16, 0.36, 0.31, 0.11, 0xff9a3c], [0.16, 0.36, 0.31, 0.11, 0xff9a3c]])),
    perk: 'Hocico potente: traga cosas un 6 % más grandes', perkK: { gate: 0.045 },
    theme: { f: T([0xffc58a, 0xc9d3e6], [0xffe3c2, 0xff9a4a], [0xfff4e4, 0xb9c4d6]), ring: 0xff9a3c, glow: 0xffa24a, bits: [0xff9a3c, 0xc9d3e6, 0xfff0d8, 0x6b7a99], freq: 1.2 },
    fx: { colors: [0xffb066, 0xe8eef8, 0xff9a3c, 0xfff0d8], shape: 4, rate: 16, g: -0.4, up: 1.2, alpha: 0.7, sz: 1.9 }, say: ['¡Miau-spirando!', '¡Prrr… succión máxima!', '¡Esto es mío, mío y de la nevera!', '¿Un ratón? ¡Para dentro!', 'Siete vidas, cero bolsas.', '¡Miauuu, qué hambre de polvo!', 'No me hables antes del café… ni del enchufe.', '¡Ojo, que ronroneo a 3000 vatios!'],
    voice: { pitch: 1.55, rate: 1.1 }, start: '¡Miau-spirando!' },
  { id: 'fregona', name: 'Capitán Fregona', sub: 'Pirata de los siete charcos', price: 2500, make: () => hiQ(() => addLids(makeFregona(), [[0.15, 0.34, 0.31, 0.1, 0xffd2ae]])),
    perk: 'Pies de espuma: se mueve un 12 % más rápido', perkK: { speed: 0.12 },
    theme: { f: T([0xc8f0ff, 0x6fc6ff], [0xffffff, 0xa8e4ff], [0xe9fbff, 0x9ad8ff]), ring: 0x4aa8ff, glow: 0x6fd0ff, bits: [0xffffff, 0x9fe8ff, 0x4aa8ff, 0xd8f6ff], spd: 1.15 },
    fx: { colors: [0xffffff, 0xbff3ff, 0x8fdcff], shape: 2, rate: 22, g: -1.2, up: 1.6, alpha: 0.9, sz: 1.0 }, say: ['¡Al abordaje de la mugre!', '¡Mil rayos y mil escobas!', '¡Fregad, grumetes, fregad!', '¡Tierra a la vista… y está sucia!', '¡Por Neptuno y su detergente!', '¡Que no quede ni una miga en alta mar!', '¡Suelo mojado, grumete avisado!', '¡Yo-ho-ho y una botella de lejía!'],
    voice: { pitch: 0.62, rate: 0.92 }, start: '¡Al abordaje de la mugre!' },
  { id: 'bruja', name: 'Brujita Escobilla', sub: 'Aprendiz de hechicera doméstica', price: 4000, make: () => hiQ(() => addLids(makeBruja(), [[-0.14, 0.33, 0.31, 0.105, 0xffe0c8], [0.14, 0.33, 0.31, 0.105, 0xffe0c8]])),
    perk: 'Polvo de oro: +40 % de monedas por objeto', perkK: { coins: 0.4 },
    theme: { f: T([0xe0b0ff, 0x7b3fe4], [0xff9ae6, 0x5a2fc9], [0xffe0ff, 0xb08aff]), ring: 0xb06bff, glow: 0xc084ff, bits: [0xffd23f, 0xff74c4, 0xb06bff, 0xffffff], spd: 1.3, freq: 1.3 },
    fx: { colors: [0xffd23f, 0xff74c4, 0xc084ff, 0xffffff], shape: 3, rate: 26, g: -2.2, up: 1.4, alpha: 1, sz: 1.2 }, say: ['¡Abracadabra, a barrer!', '¡Escoba, escoba, no te me pongas boba!', '¡Ni una pelusa sin hechizar!', '¡Polvo de estrellas, polvo de salón!', '¡Chas! ¡Y a la basura!', '¡Que se enteren en el aquelarre!', 'Mi murciélago dice que está limpio… ¡mentiroso!', '¡Hechizo de limpieza nivel cuñado!'],
    voice: { pitch: 1.75, rate: 1.12 }, start: '¡Abracadabra, a barrer!' },
  { id: 'robo', name: 'Robo-Chus 3000', sub: 'Robot limpiador con complejo de superhéroe', price: 6000, make: () => hiQ(makeRobo),
    perk: 'Batería extra: +10 s de ronda', perkK: { time: 10 },
    theme: { f: T([0x9ffff0, 0x2ad4ff], [0xd8ff7a, 0x37e08a], [0xffffff, 0x9ffff0]), ring: 0x2ad4ff, glow: 0x37ffc8, bits: [0x37ffc8, 0xc8ff4a, 0x2ad4ff, 0xffffff], spd: 1.6, freq: 1.7 },
    fx: { colors: [0x37ffc8, 0xc8ff4a, 0x2ad4ff, 0xffffff], shape: 3, rate: 30, g: 0, up: 0.6, alpha: 1, sz: 0.8, fast: true }, say: ['¡BIP BOP! ¡Limpieza al 100 %!', 'Detectando mugre… ¡encontrada!', 'Batería al 99 %… y tu cariño al 100 %.', 'Ejecutando TRAGAR_TODO.exe…', 'Error 404: suciedad no encontrada.', 'Actualizando… ya no queda polvo.', 'Mi algoritmo favorito es el de succión.', '¡BZZT! Eso no estaba en mi manual.'],
    voice: { pitch: 0.4, rate: 1.25 }, start: '¡BIP BOP! ¡Limpieza al cien por cien!' },
  { id: 'calcetin', name: 'Sir Calcetín', sub: 'Caballero del Par Perdido', price: 8500, make: () => hiQ(() => addLids(makeCalcetin(), [[-0.15, 0.3, 0.31, 0.115, 0xfff3e0], [0.15, 0.3, 0.31, 0.115, 0xfff3e0]])),
    perk: 'Armadura de felpa: los golpes te quitan la mitad', perkK: { hit: 0.5 },
    theme: { f: T([0xff8a7a, 0xffe27a], [0x7ad0ff, 0xff9ae6], [0xffffff, 0xffe27a]), ring: 0xff5a4d, glow: 0xffb347, bits: [0xff5a4d, 0xfff3e0, 0x4aa8ff, 0xffd23f], spd: 0.9 },
    fx: { colors: [0xff5a4d, 0xfff3e0, 0x4aa8ff, 0xffd23f], shape: 1, rate: 22, g: 2, up: 1.5, alpha: 1, sz: 1.1 }, say: ['¡Por el honor del par perdido!', '¡Ningún pie quedará sin pareja!', '¡El calcetín nunca olvida!', '¡Con gran agujero viene gran responsabilidad!', '¡Mi capa huele a suavizante!', '¡Ni lavadora ni secadora me detendrán!', '¡Soy el héroe que tu cajón merece!', '¡Calcetines del mundo, uníos!'],
    voice: { pitch: 0.85, rate: 0.95 }, start: '¡Por el honor del par perdido!' },
];
export const PLAYERS = [...BASE_PLAYERS, ...EXTRA_PLAYERS];
export const PLAYER_BY_ID = Object.fromEntries(PLAYERS.map((p) => [p.id, p]));
