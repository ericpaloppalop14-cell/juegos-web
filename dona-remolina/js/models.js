// Catálogo de objetos de Mueblópolis (todo procedural, original)
import * as THREE from 'three';
import { GB, C, mix, lighten, darken, sectorColors, addOutline, Q } from './geo.js?v=4';

export const PAL = {
  coral: 0xff6b5e, tang: 0xff9a1f, sun: 0xffd23f, lime: 0x8fdc4a, mint: 0x3fe0b0, turq: 0x1fc4d6, sky: 0x4aa8ff,
  violet: 0x9a7bff, pink: 0xff74c4, rasp: 0xe8348a, cream: 0xfff0d2, woodL: 0xe8b46f, woodD: 0xb3693a, cherry: 0xc4503a,
  white: 0xffffff, ink: 0x3a2a55, gold: 0xffc933, skin: 0xffcfa6, green: 0x39b54a, terra: 0xe0764a,
};
const BRIGHT = [PAL.coral, PAL.tang, PAL.sun, PAL.lime, PAL.mint, PAL.turq, PAL.sky, PAL.violet, PAL.pink, PAL.rasp];
const pick = (arr, v) => arr[v % arr.length];
const PI = Math.PI;

// ---------- pequeños (tier 0) ----------
function sock(v) {
  const a = pick(BRIGHT, v * 3 + 1), b = pick([PAL.white, PAL.sun, PAL.cream, PAL.mint], v);
  const g = new GB();
  g.rbox(0.56, 0.2, 0.24, 0.09, a, 0.09, 0, 0);
  g.rbox(0.22, 0.46, 0.24, 0.09, a, -0.12, 0, 0);
  g.rbox(0.2, 0.2, 0.25, 0.09, b, 0.3, 0, 0);
  g.cyl(0.13, 0.13, 0.08, b, -0.12, 0.36, 0, 10);
  g.cyl(0.125, 0.125, 0.05, b, -0.12, 0.24, 0, 10);
  return [g, 0.32];
}
function button(v) {
  const c = pick(BRIGHT, v * 2), g = new GB();
  g.cyl(0.26, 0.26, 0.08, c, 0, 0, 0, 16); g.cyl(0.2, 0.2, 0.02, lighten(c, 0.35), 0, 0.08, 0, 14);
  for (const [x, z] of [[-0.06, -0.06], [0.06, -0.06], [-0.06, 0.06], [0.06, 0.06]]) g.cyl(0.026, 0.026, 0.02, PAL.ink, x, 0.095, z, 6);
  return [g, 0.26];
}
function cup(v) {
  const c = pick(BRIGHT, v * 5 + 2), g = new GB();
  g.cyl(0.32, 0.3, 0.04, PAL.white, 0, 0, 0, 14);
  g.cyl(0.22, 0.15, 0.26, PAL.white, 0, 0.04, 0, 14); g.cyl(0.222, 0.19, 0.07, c, 0, 0.16, 0, 14);
  g.cyl(0.19, 0.19, 0.02, 0x7a4a2a, 0, 0.29, 0, 12);
  g.torus(0.1, 0.03, PAL.white, 0.25, 0.19, 0, 0, 0, 0, PI * 2, 8);
  return [g, 0.32];
}
function duck() {
  const g = new GB();
  g.sph(0.27, PAL.sun, 0, 0.27, 0, 1.2, 0.95, 1, 14);
  g.sph(0.17, PAL.sun, 0.2, 0.55, 0, 1, 1, 1, 12);
  g.cone(0.07, 0.16, PAL.tang, 0.38, 0.5, 0, 8, 0, 0, -PI / 2);
  g.sph(0.03, PAL.ink, 0.3, 0.6, 0.1, 1, 1, 1, 6); g.sph(0.03, PAL.ink, 0.3, 0.6, -0.1, 1, 1, 1, 6);
  g.sph(0.1, darken(PAL.sun, 0.12), -0.05, 0.3, 0.2, 1.3, 0.7, 0.4, 8); g.sph(0.1, darken(PAL.sun, 0.12), -0.05, 0.3, -0.2, 1.3, 0.7, 0.4, 8);
  g.cone(0.07, 0.14, PAL.sun, -0.32, 0.38, 0, 6, 0, 0, PI / 2 + 0.3);
  return [g, 0.36];
}
function yarn(v) {
  const c = pick(BRIGHT, v * 4 + 3), l = lighten(c, 0.4), g = new GB();
  g.sph(0.34, c, 0, 0.34, 0, 1, 1, 1, 14);
  for (let i = 0; i < 3; i++) g.torus(0.345, 0.025, l, 0, 0.34, 0, i * 1.05, i * 0.9, 0.3, PI * 2, 14);
  g.torus(0.12, 0.025, c, 0.4, 0.04, 0.1, PI / 2, 0, 0, PI * 1.6, 8);
  return [g, 0.38];
}
function cookie() {
  const g = new GB();
  g.cyl(0.32, 0.31, 0.1, 0xe6a65a, 0, 0, 0, 16); g.cyl(0.28, 0.28, 0.02, 0xf0b96e, 0, 0.1, 0, 14);
  for (const [x, z] of [[0.1, 0.05], [-0.12, 0.1], [0, -0.14], [-0.08, -0.05], [0.16, -0.12]]) g.sph(0.045, 0x5a3320, x, 0.115, z, 1, 0.6, 1, 6);
  return [g, 0.32];
}
function book(v) {
  const g = new GB();
  for (let i = 0; i < 3; i++) {
    const c = pick(BRIGHT, v * 3 + i * 4), y = i * 0.13;
    g.rbox(0.62 - i * 0.04, 0.12, 0.44, 0.03, c, 0, y, 0, 0, i * 0.35, 0);
    g.box(0.56 - i * 0.04, 0.07, 0.4, PAL.cream, 0.03, y + 0.025, 0.0, 0, i * 0.35, 0);
  }
  return [g, 0.38];
}
function slipper(v) {
  const c = pick([PAL.pink, PAL.sky, PAL.mint, PAL.violet], v), g = new GB();
  g.rbox(0.8, 0.1, 0.34, 0.05, lighten(c, 0.5), 0, 0, 0);
  g.sph(0.22, c, 0.16, 0.14, 0, 1.3, 0.8, 1.2, 12); g.sph(0.1, lighten(c, 0.55), -0.2, 0.12, 0, 1.6, 0.8, 1.7, 8);
  g.sph(0.04, PAL.white, 0.3, 0.26, 0.0, 1, 1, 1, 6);
  return [g, 0.44];
}
// ---------- medianos (tier 1) ----------
function cushion(v) {
  const c = pick(BRIGHT, v * 3 + 5), g = new GB();
  g.rbox(1.2, 0.42, 1.2, 0.2, c, 0, 0, 0, 0, v * 0.5, 0, 4);
  g.rbox(0.56, 0.1, 0.56, 0.05, lighten(c, 0.35), 0, 0.39, 0, 0, v * 0.5, 0);
  g.sph(0.07, darken(c, 0.2), 0, 0.5, 0, 1, 0.6, 1, 8);
  return [g, 0.72];
}
function plant(v) {
  const g = new GB(), lc = pick([PAL.green, PAL.lime, 0x2fa86a], v);
  g.cyl(0.34, 0.24, 0.5, PAL.terra, 0, 0, 0, 12); g.cyl(0.37, 0.37, 0.1, darken(PAL.terra, 0.08), 0, 0.45, 0, 12); g.cyl(0.3, 0.3, 0.02, 0x5a3a28, 0, 0.55, 0, 10);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * PI * 2 + v;
    g.sph(0.2, i % 2 ? lc : lighten(lc, 0.18), Math.cos(a) * 0.22, 0.95 + (i % 3) * 0.14, Math.sin(a) * 0.22, 0.55, 1.5, 0.55, 8, Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
  }
  g.sph(0.22, lc, 0, 1.2, 0, 0.6, 1.5, 0.6, 8);
  if (v % 2) g.sph(0.1, PAL.pink, 0.1, 1.55, 0.05, 1, 1, 1, 8);
  return [g, 0.58];
}
function stool(v) {
  const c = pick([PAL.woodL, PAL.turq, PAL.coral, PAL.sun], v), g = new GB();
  g.cyl(0.46, 0.44, 0.14, c, 0, 0.62, 0, 14); g.cyl(0.4, 0.4, 0.04, lighten(c, 0.3), 0, 0.76, 0, 14);
  for (let i = 0; i < 3; i++) { const a = i / 3 * PI * 2 + 0.5; g.cyl(0.05, 0.06, 0.66, darken(c, 0.1), Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3, 6, Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2); }
  return [g, 0.5];
}
function toaster(v) {
  const c = pick([PAL.mint, PAL.pink, PAL.sky, PAL.sun], v), g = new GB();
  g.rbox(1.05, 0.7, 0.62, 0.2, c, 0, 0.04, 0, 0, 0, 0, 4); g.rbox(1.05, 0.1, 0.62, 0.05, darken(c, 0.15), 0, 0, 0);
  g.box(0.7, 0.05, 0.1, PAL.ink, 0, 0.72, 0.12); g.box(0.7, 0.05, 0.1, PAL.ink, 0, 0.72, -0.12);
  g.sph(0.08, PAL.cream, 0.52, 0.5, 0.2, 1, 1, 1, 8); g.rbox(0.12, 0.08, 0.1, 0.03, PAL.white, 0.55, 0.3, 0.0);
  g.rbox(0.5, 0.26, 0.2, 0.06, 0xe0a458, 0, 0.7, -0.12);
  return [g, 0.62];
}
function lamp(v) {
  const c = pick([PAL.sun, PAL.pink, PAL.mint, PAL.tang, PAL.sky], v), g = new GB();
  g.cyl(0.4, 0.46, 0.08, PAL.ink, 0, 0, 0, 14); g.cyl(0.05, 0.05, 2.4, PAL.gold, 0, 0.06, 0, 8); g.sph(0.1, PAL.gold, 0, 1.2, 0, 1, 1, 1, 8);
  g.cyl(0.36, 0.62, 0.7, c, 0, 2.4, 0, 14); g.cyl(0.3, 0.55, 0.05, lighten(c, 0.75), 0, 2.4, 0, 14); g.sph(0.18, lighten(c, 0.8), 0, 2.45, 0, 1, 0.8, 1, 8);
  return [g, 0.5];
}
function tv(v) {
  const c = pick([PAL.ink, PAL.coral, PAL.turq, PAL.violet], v), g = new GB();
  g.rbox(1.7, 1.2, 0.5, 0.14, c, 0, 0.25, 0); g.rbox(1.4, 0.9, 0.06, 0.06, lighten(PAL.turq, 0.45), 0, 0.4, 0.24);
  g.box(0.9, 0.06, 0.04, PAL.white, -0.1, 1.05, 0.28, 0, 0, -0.3);
  g.cyl(0.04, 0.04, 0.8, PAL.gold, -0.3, 1.45, 0, 5, 0, 0, 0.45); g.cyl(0.04, 0.04, 0.8, PAL.gold, 0.1, 1.45, 0, 5, 0, 0, -0.45);
  g.box(0.5, 0.22, 0.4, darken(c, 0.15), 0, 0, 0); g.sph(0.05, PAL.lime, 0.65, 0.32, 0.26, 1, 1, 1, 6);
  return [g, 0.9];
}
function bin(v) {
  const c = pick([PAL.sky, PAL.mint, PAL.violet], v), g = new GB();
  g.cyl(0.46, 0.38, 0.9, c, 0, 0, 0, 12); g.cyl(0.5, 0.5, 0.1, darken(c, 0.12), 0, 0.9, 0, 12); g.sph(0.1, PAL.white, 0, 1.02, 0, 1, 1, 1, 8);
  g.sph(0.14, PAL.sun, 0.15, 0.95, 0.1, 1, 0.5, 1, 6, 0, 0, 0.5);
  return [g, 0.52];
}
function toycar(v) {
  const c = pick([PAL.coral, PAL.sun, PAL.sky, PAL.lime, PAL.pink], v), g = new GB();
  g.rbox(2.0, 0.5, 1.0, 0.2, c, 0, 0.26, 0, 0, 0, 0, 4); g.rbox(1.0, 0.5, 0.88, 0.2, lighten(c, 0.2), -0.1, 0.62, 0);
  g.rbox(0.75, 0.3, 0.9, 0.1, lighten(PAL.turq, 0.5), -0.1, 0.7, 0);
  for (const [x, z] of [[-0.62, 0.52], [0.62, 0.52], [-0.62, -0.52], [0.62, -0.52]]) { g.cyl(0.26, 0.26, 0.16, PAL.ink, x, 0.0, z, 12, PI / 2, 0, 0); g.cyl(0.12, 0.12, 0.18, PAL.sun, x, 0.14, z, 8, PI / 2, 0, 0); }
  g.sph(0.1, PAL.sun, 1.0, 0.5, 0.3, 1, 1, 0.8, 6); g.sph(0.1, PAL.sun, 1.0, 0.5, -0.3, 1, 1, 0.8, 6);
  return [g, 1.0];
}
// ---------- muebles (tier 2) ----------
function chair(v) {
  const c = pick([PAL.sun, PAL.turq, PAL.coral, PAL.violet, PAL.lime], v), w = pick([PAL.woodL, PAL.woodD], v), g = new GB();
  g.rbox(1.2, 0.18, 1.2, 0.07, c, 0, 1.0, 0); g.rbox(1.2, 1.3, 0.16, 0.07, c, 0, 1.12, -0.52);
  g.rbox(0.9, 0.2, 0.05, 0.02, lighten(c, 0.35), 0, 1.95, -0.43);
  for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) g.cyl(0.07, 0.06, 1.05, w, x, 0, z, 6);
  return [g, 0.95];
}
function armchair(v) {
  const c = pick([PAL.rasp, PAL.turq, PAL.tang, PAL.violet, PAL.mint], v + 1), g = new GB();
  g.rbox(2.2, 0.8, 2.0, 0.25, c, 0, 0.35, 0.1, 0, 0, 0, 4); g.rbox(2.2, 1.7, 0.6, 0.25, c, 0, 0.35, -0.8, 0, 0, 0, 4);
  g.rbox(0.48, 1.2, 1.9, 0.2, darken(c, 0.1), -0.98, 0.35, 0.1); g.rbox(0.48, 1.2, 1.9, 0.2, darken(c, 0.1), 0.98, 0.35, 0.1);
  g.rbox(1.5, 0.3, 1.5, 0.12, lighten(c, 0.3), 0, 1.1, 0.3);
  for (const [x, z] of [[-0.9, -0.8], [0.9, -0.8], [-0.9, 0.9], [0.9, 0.9]]) g.cyl(0.1, 0.07, 0.4, PAL.woodD, x, 0, z, 6);
  g.sph(0.09, PAL.gold, 0, 1.75, -0.5, 1, 1, 1, 6);
  return [g, 1.4];
}
function table(v) {
  const c = pick([PAL.woodL, PAL.cherry, PAL.turq, PAL.sun], v), g = new GB();
  g.rbox(3.4, 0.24, 2.4, 0.1, c, 0, 1.4, 0); g.rbox(3.0, 0.05, 2.0, 0.02, lighten(c, 0.3), 0, 1.64, 0);
  for (const [x, z] of [[-1.4, -0.9], [1.4, -0.9], [-1.4, 0.9], [1.4, 0.9]]) g.cyl(0.14, 0.11, 1.42, darken(c, 0.15), x, 0, z, 8);
  g.cyl(0.36, 0.28, 0.5, PAL.sky, 0.3, 1.68, 0.1, 10); g.sph(0.25, PAL.pink, 0.3, 2.35, 0.1, 1, 1, 1, 8); g.sph(0.2, PAL.sun, 0.45, 2.3, 0.2, 1, 1, 1, 8);
  g.cyl(0.4, 0.4, 0.05, PAL.white, -0.9, 1.68, -0.3, 12);
  return [g, 1.7];
}
function fridge(v) {
  const c = pick([PAL.mint, PAL.pink, PAL.sky, PAL.sun, PAL.cream], v), g = new GB();
  g.rbox(2.0, 3.8, 1.8, 0.28, c, 0, 0.12, 0, 0, 0, 0, 4); g.box(1.9, 0.07, 0.04, darken(c, 0.25), 0, 2.45, 0.92);
  g.rbox(0.1, 0.9, 0.12, 0.04, PAL.white, 0.7, 2.7, 1.0); g.rbox(0.1, 1.2, 0.12, 0.04, PAL.white, 0.7, 1.0, 1.0);
  g.box(2.0, 0.12, 1.8, darken(c, 0.2), 0, 0, 0);
  for (let i = 0; i < 3; i++) g.rbox(0.28, 0.28, 0.04, 0.02, [PAL.coral, PAL.sun, PAL.violet][i], -0.5 + i * 0.1, 2.9 - i * 0.3, 0.93, 0, 0, i * 0.3);
  return [g, 1.3];
}
function dresser(v) {
  const c = pick([PAL.woodL, PAL.turq, PAL.coral, PAL.lime, PAL.violet], v), g = new GB();
  g.rbox(3.6, 2.0, 1.7, 0.1, c, 0, 0.5, 0); g.rbox(3.8, 0.16, 1.9, 0.06, lighten(c, 0.25), 0, 2.5, 0);
  for (let i = 0; i < 3; i++) { g.rbox(3.2, 0.52, 0.06, 0.03, lighten(c, 0.18), 0, 0.68 + i * 0.64, 0.86); g.sph(0.1, PAL.gold, -0.5, 0.94 + i * 0.64, 0.92, 1, 1, 1, 6); g.sph(0.1, PAL.gold, 0.5, 0.94 + i * 0.64, 0.92, 1, 1, 1, 6); }
  for (const [x, z] of [[-1.6, -0.6], [1.6, -0.6], [-1.6, 0.6], [1.6, 0.6]]) g.cyl(0.14, 0.09, 0.5, darken(c, 0.25), x, 0, z, 6);
  g.cyl(0.2, 0.15, 0.4, PAL.white, 1.1, 2.66, 0, 8); g.sph(0.22, PAL.pink, 1.1, 3.15, 0, 1, 1, 1, 8);
  return [g, 1.85];
}
function tallclock(v) {
  const c = pick([PAL.woodD, PAL.cherry, PAL.violet], v), g = new GB();
  g.rbox(1.4, 4.0, 1.0, 0.12, c, 0, 0, 0); g.rbox(1.6, 0.3, 1.2, 0.08, darken(c, 0.15), 0, 3.9, 0); g.rbox(1.6, 0.3, 1.2, 0.08, darken(c, 0.15), 0, 0, 0);
  g.cyl(0.52, 0.52, 0.08, PAL.cream, 0, 2.9, 0.5, 18, PI / 2, 0, 0); g.torus(0.52, 0.06, PAL.gold, 0, 3.05 - 0.15, 0.55, 0, 0, 0, PI * 2, 18);
  g.box(0.06, 0.4, 0.04, PAL.ink, 0, 3.05 - 0.15, 0.58); g.box(0.3, 0.06, 0.04, PAL.ink, 0.12, 3.05 - 0.15, 0.58);
  g.rbox(0.9, 1.5, 0.06, 0.05, lighten(c, 0.3), 0, 0.5, 0.5); g.cyl(0.22, 0.22, 0.06, PAL.gold, 0, 1.0, 0.55, 12, PI / 2, 0, 0);
  g.cone(0.3, 0.4, PAL.gold, 0, 4.18, 0, 8);
  return [g, 1.1];
}
function sofa(v, body) {
  const c = pick([PAL.pink, PAL.mint, PAL.tang, PAL.sky, PAL.violet, PAL.sun, PAL.coral], v), g = body || new GB();
  g.rbox(4.4, 0.9, 2.0, 0.3, c, 0, 0.5, 0.1, 0, 0, 0, 4); g.rbox(4.4, 1.9, 0.7, 0.3, c, 0, 0.5, -0.78, 0, 0, 0, 4);
  g.rbox(0.62, 1.4, 2.0, 0.25, darken(c, 0.1), -2.0, 0.5, 0.1); g.rbox(0.62, 1.4, 2.0, 0.25, darken(c, 0.1), 2.0, 0.5, 0.1);
  g.rbox(1.65, 0.36, 1.5, 0.15, lighten(c, 0.3), -0.85, 1.35, 0.35); g.rbox(1.65, 0.36, 1.5, 0.15, lighten(c, 0.3), 0.85, 1.35, 0.35);
  g.rbox(0.9, 0.9, 0.3, 0.14, pick(BRIGHT, v + 3), -1.5, 1.4, -0.35, -0.3, 0, 0.2);
  return [g, 2.05];
}
// ---------- grandes (tier 3) ----------
function bed(v) {
  const c = pick([PAL.sky, PAL.pink, PAL.mint, PAL.violet], v), g = new GB(), w = PAL.woodL;
  g.rbox(3.8, 0.7, 6.0, 0.12, w, 0, 0.4, 0); g.rbox(3.5, 0.6, 5.6, 0.2, PAL.white, 0, 1.0, 0.0, 0, 0, 0, 4);
  g.rbox(3.62, 0.5, 3.6, 0.2, c, 0, 1.2, 0.8, 0, 0, 0, 4); g.rbox(3.7, 0.2, 0.3, 0.08, lighten(c, 0.4), 0, 1.5, -1.0);
  g.rbox(1.4, 0.4, 1.0, 0.18, PAL.cream, -0.85, 1.55, -2.2); g.rbox(1.4, 0.4, 1.0, 0.18, PAL.cream, 0.85, 1.55, -2.2);
  g.rbox(4.0, 2.7, 0.3, 0.1, darken(w, 0.1), 0, 0.4, -3.0); g.rbox(4.0, 1.4, 0.3, 0.1, darken(w, 0.1), 0, 0.4, 3.0);
  for (const x of [-1.9, 1.9]) g.sph(0.2, PAL.gold, x, 3.2, -3.0, 1, 1, 1, 8);
  for (const [x, z] of [[-1.8, -2.8], [1.8, -2.8], [-1.8, 2.8], [1.8, 2.8]]) g.cyl(0.18, 0.14, 0.45, darken(w, 0.25), x, 0, z, 6);
  return [g, 3.2];
}
function bookshelf(v) {
  const c = pick([PAL.woodD, PAL.turq, PAL.cherry], v), g = new GB(), W = 4.6, H = 5.6, D = 1.5;
  g.rbox(0.2, H, D, 0.06, c, -W / 2 + 0.1, 0.2, 0); g.rbox(0.2, H, D, 0.06, c, W / 2 - 0.1, 0.2, 0); g.box(W, H, 0.12, darken(c, 0.2), 0, 0.2, -D / 2 + 0.06);
  for (let i = 0; i < 5; i++) g.box(W, 0.18, D, lighten(c, 0.1), 0, 0.2 + i * 1.3, 0);
  g.rbox(W + 0.3, 0.25, D + 0.2, 0.08, darken(c, 0.15), 0, H + 0.1, 0);
  for (let r = 0; r < 4; r++) { let x = -W / 2 + 0.35; let k = 0; while (x < W / 2 - 0.5) { const bw = 0.2 + ((r * 7 + k * 3) % 4) * 0.07, bh = 0.8 + ((r * 5 + k * 11) % 5) * 0.08; g.box(bw, bh, 1.0, pick(BRIGHT, r * 3 + k * 7 + v), x + bw / 2, 0.38 + r * 1.3, 0.1, 0, 0, (k % 6 === 5) ? 0.2 : 0); x += bw + 0.03; k++; } }
  return [g, 2.6];
}
function piano(v) {
  const c = pick([PAL.ink, PAL.rasp, 0x2a6fdb], v), g = new GB();
  g.rbox(4.8, 2.6, 2.0, 0.12, c, 0, 0.8, -0.2); g.rbox(5.0, 0.2, 2.5, 0.08, lighten(c, 0.15), 0, 3.35, -0.1);
  g.rbox(4.4, 0.2, 0.9, 0.04, PAL.white, 0, 1.6, 1.1);
  for (let i = 0; i < 14; i++) g.box(0.06, 0.06, 0.6, PAL.ink, -2.0 + i * 0.31, 1.78, 1.2);
  g.rbox(3.6, 0.9, 0.12, 0.03, lighten(c, 0.3), 0, 2.2, 0.82); g.box(3.4, 0.06, 0.04, PAL.gold, 0, 2.7, 0.9);
  g.rbox(0.2, 1.0, 0.2, 0.05, darken(c, 0.1), -2.2, 0, 0.7); g.rbox(0.2, 1.0, 0.2, 0.05, darken(c, 0.1), 2.2, 0, 0.7);
  g.box(0.2, 0.9, 0.2, darken(c, 0.1), -2.2, 0, -0.9); g.box(0.2, 0.9, 0.2, darken(c, 0.1), 2.2, 0, -0.9);
  g.cyl(0.8, 0.8, 0.3, PAL.sun, 0, 0.9, 2.6, 12); g.cyl(0.1, 0.1, 0.9, PAL.gold, 0, 0, 2.6, 6);
  g.cyl(0.14, 0.14, 0.4, PAL.gold, 1.6, 3.55, -0.1, 8); g.cone(0.3, 0.3, PAL.coral, 1.6, 3.95, -0.1, 8);
  return [g, 2.7];
}
// ---------- armarios: casas, edificios y rascacielos ----------
export function wardrobe(w, h, d, body, opts = {}) {
  const g = new GB(), rows = opts.rows || Math.max(1, Math.round(h / 3.4)), cols = opts.cols || Math.max(2, Math.round(w / 2.6));
  const trim = opts.trim || PAL.cream, wood = darken(body, 0.28), door = lighten(body, 0.14);
  const pl = Math.min(0.8, h * 0.06 + 0.2);
  g.box(w + 0.5, pl, d + 0.5, wood, 0, 0, 0);
  g.box(w, h - pl - 0.5, d, (x, y) => { const k = (y / h); return mix(body, darken(body, 0.18), Math.max(0, 0.35 - k) * 1.2); }, 0, pl, 0);
  const cw = (w - 0.6) / cols, rh = (h - pl - 1.9) / rows;
  const y0 = pl + 0.55, depth = 0.14;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = -w / 2 + 0.3 + cw * (c + 0.5), y = y0 + rh * r;
    g.rbox(cw - 0.22, rh - 0.22, depth * 2, 0.06, door, x, y, d / 2, 0, 0, 0, 1);
    const lit = ((r * 5 + c * 3 + (opts.seed || 0)) % 4);
    if (opts.windows && rows > 1) {
      const gl = lit === 0 ? 0xffe27a : lit === 1 ? 0xc9f2ff : lit === 2 ? 0xffc9a8 : 0xa6dcff;
      g.rbox(cw * 0.58, rh * 0.52, depth * 2.2, 0.04, gl, x, y + rh * 0.3, d / 2 + 0.05, 0, 0, 0, 1);
      g.box(cw * 0.62, 0.08, depth * 2.6, trim, x, y + rh * 0.3 + rh * 0.26, d / 2 + 0.05);
      g.sph(0.1, PAL.gold, x + (c % 2 ? -1 : 1) * cw * 0.34, y + rh * 0.22, d / 2 + 0.2, 1, 1, 1, 6);
    } else {
      g.rbox(cw * 0.6, rh * 0.55, depth * 2.2, 0.05, lighten(body, 0.3), x, y + rh * 0.28, d / 2 + 0.04, 0, 0, 0, 1);
      g.sph(0.14, PAL.gold, x + (c % 2 ? -1 : 1) * cw * 0.36, y + rh * 0.45, d / 2 + 0.25, 1, 1, 1, 8);
    }
  }
  // cornisa y remates
  g.box(w + 0.7, 0.5, d + 0.7, trim, 0, h - 0.5, 0); g.box(w + 0.4, 0.22, d + 0.4, darken(trim, 0.12), 0, h - 0.7, 0);
  // costados: rayas
  for (let r = 1; r < rows; r++) { g.box(0.05, 0.1, d * 0.96, darken(body, 0.25), w / 2 + 0.01, y0 + rh * r - 0.12, 0); g.box(0.05, 0.1, d * 0.96, darken(body, 0.25), -w / 2 - 0.01, y0 + rh * r - 0.12, 0); }
  for (const x of [-1, 1]) for (const z of [-1, 1]) g.cyl(0.2, 0.14, 0.2, wood, x * (w / 2 - 0.1), -0.0, z * (d / 2 - 0.1), 6);
  if (opts.top === 'lamp') { g.cyl(0.07, 0.07, 1.8, PAL.gold, 0, h, 0, 6); g.cyl(0.4, 0.7, 0.6, 0xffe27a, 0, h + 1.8, 0, 12); }
  else if (opts.top === 'flag') { g.cyl(0.06, 0.06, 2.4, PAL.cream, 0, h, 0, 6); g.box(1.4, 0.7, 0.05, opts.flag || PAL.coral, 0.7, h + 1.6, 0); }
  else if (opts.top === 'tank') { g.cyl(0.9, 0.9, 1.2, wood, w * 0.2, h, 0, 12); g.cone(1.0, 0.7, darken(wood, 0.1), w * 0.2, h + 1.2, 0, 12); }
  else if (opts.top === 'crown') { g.cyl(0.08, 0.08, 3.4, PAL.gold, 0, h, 0, 6); g.sph(0.35, PAL.coral, 0, h + 3.5, 0, 1, 1, 1, 8); g.torus(0.9, 0.08, 0xffe27a, 0, h + 1.2, 0, PI / 2, 0, 0); }
  if (opts.balcony) g.box(w * 0.7, 0.2, 1.1, trim, 0, y0 + rh * Math.floor(rows / 2), d / 2 + 0.55);
  return g;
}
const WARD_COLORS = [PAL.turq, PAL.coral, PAL.sun, PAL.violet, PAL.sky, PAL.pink, PAL.lime, 0xd9a066, PAL.mint, PAL.tang];
function minicloset(v) {
  const c = pick(WARD_COLORS, v * 3 + 2);
  const g = wardrobe(3.8 + (v % 2) * 0.8, 5.2 + (v % 3) * 0.6, 2.4, c, { rows: 2, cols: 2, top: v % 2 ? 'lamp' : null, seed: v });
  return [g, 2.9];
}
function wardrobeMid(v) {
  const c = pick(WARD_COLORS, v * 7 + 1), w = 6 + (v % 3) * 0.8, h = 8.5 + (v % 4) * 1.1;
  const g = wardrobe(w, h, 4.2, c, { windows: true, seed: v, top: ['flag', 'lamp', 'tank'][v % 3], flag: pick(BRIGHT, v) });
  return [g, 4.3];
}
function skyscraper(v) {
  const c = pick(WARD_COLORS, v * 5 + 3), w = 11 + (v % 3) * 1.2, h = 22 + (v % 4) * 3.2, d = 7.6;
  const g = wardrobe(w, h, d, c, { windows: true, rows: Math.round(h / 3.3), cols: 4, seed: v, top: ['crown', 'flag', 'lamp'][v % 3], flag: pick(BRIGHT, v + 3), balcony: v % 2 === 0 });
  return [g, 6.3 + (v % 3) * 0.35];
}

export const KINDS = {
  sock:       { n: 'Calcetín',          tier: 0, f: sock, nv: 6, coins: 1 },
  button:     { n: 'Botón',             tier: 0, f: button, nv: 5, coins: 1 },
  cup:        { n: 'Taza',              tier: 0, f: cup, nv: 5, coins: 1 },
  duck:       { n: 'Patito de goma',    tier: 0, f: duck, nv: 1, coins: 2 },
  yarn:       { n: 'Ovillo',            tier: 0, f: yarn, nv: 5, coins: 1 },
  cookie:     { n: 'Galleta',           tier: 0, f: cookie, nv: 1, coins: 1 },
  book:       { n: 'Libros',            tier: 0, f: book, nv: 5, coins: 1 },
  slipper:    { n: 'Zapatilla',         tier: 0, f: slipper, nv: 4, coins: 1 },
  cushion:    { n: 'Cojín',             tier: 1, f: cushion, nv: 6, coins: 2 },
  plant:      { n: 'Maceta',            tier: 1, f: plant, nv: 4, coins: 2 },
  stool:      { n: 'Taburete',          tier: 1, f: stool, nv: 4, coins: 2 },
  toaster:    { n: 'Tostadora',         tier: 1, f: toaster, nv: 4, coins: 3 },
  lamp:       { n: 'Lámpara de pie',    tier: 1, f: lamp, nv: 5, coins: 3 },
  tv:         { n: 'Tele',              tier: 1, f: tv, nv: 4, coins: 3 },
  bin:        { n: 'Papelera',          tier: 1, f: bin, nv: 3, coins: 2 },
  toycar:     { n: 'Cochecito',         tier: 1, f: toycar, nv: 5, coins: 3 },
  chair:      { n: 'Silla',             tier: 2, f: chair, nv: 5, coins: 5 },
  armchair:   { n: 'Sillón',            tier: 2, f: armchair, nv: 5, coins: 7 },
  table:      { n: 'Mesa',              tier: 2, f: table, nv: 4, coins: 8 },
  fridge:     { n: 'Nevera',            tier: 2, f: fridge, nv: 5, coins: 8 },
  dresser:    { n: 'Cómoda',            tier: 2, f: dresser, nv: 5, coins: 10 },
  tallclock:  { n: 'Reloj de pie',      tier: 2, f: tallclock, nv: 3, coins: 9 },
  sofa:       { n: 'Sofá',              tier: 2, f: sofa, nv: 7, coins: 12 },
  bed:        { n: 'Cama',              tier: 3, f: bed, nv: 4, coins: 20 },
  bookshelf:  { n: 'Librería',          tier: 3, f: bookshelf, nv: 3, coins: 22 },
  piano:      { n: 'Piano',             tier: 3, f: piano, nv: 3, coins: 24 },
  minicloset: { n: 'Armarito',          tier: 3, f: minicloset, nv: 6, coins: 26 },
  wardrobe:   { n: 'Armario-edificio',  tier: 4, f: wardrobeMid, nv: 8, coins: 55 },
  skyscraper: { n: 'Armario-rascacielos', tier: 5, f: skyscraper, nv: 8, coins: 150 },
};

const cache = new Map();
let TINT = null, TKEY = '';
const _tc = new THREE.Color(), _hsl = { h: 0, s: 0, l: 0 };
function tintGB(gb, t) {
  const c = gb.c, memo = new Map();
  for (let i = 0; i < c.length; i += 3) {
    const key = ((c[i] * 255) | 0) * 65536 + ((c[i + 1] * 255) | 0) * 256 + ((c[i + 2] * 255) | 0); let r = memo.get(key);
    if (!r) { _tc.setRGB(c[i], c[i + 1], c[i + 2]).getHSL(_hsl); const sat = _hsl.s; _tc.setHSL((_hsl.h + t.h * Math.min(1, sat * 3) + 1) % 1, Math.min(1, _hsl.s * t.s), Math.max(0, Math.min(1, _hsl.l + t.l * (1 - _hsl.l)))); r = [_tc.r, _tc.g, _tc.b]; memo.set(key, r); }
    c[i] = r[0]; c[i + 1] = r[1]; c[i + 2] = r[2];
  }
}
export function setPlaceTint(key, tint) { TKEY = key || ''; TINT = tint || null; }
export function clearGeoCache() { for (const r of cache.values()) r.geo.dispose(); cache.clear(); }
export function getGeo(kind, v) {
  const K = KINDS[kind], key = (K.notint ? '' : TKEY) + kind + ':' + v; let r = cache.get(key);
  if (!r) {
    const [gb, rad] = K.f(v); if (TINT && !K.notint) tintGB(gb, TINT);
    const geo = gb.build(true);
    r = { geo, r: rad, h: geo.userData.h, halfH: geo.userData.halfH };
    cache.set(key, r);
  }
  return r;
}
export const propMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.0 });
// brillo suave de borde (fresnel pastel) y un toque de luz rebotada: aspecto de juguete blandito
propMaterial.onBeforeCompile = (sh) => {
  sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
    float fr = pow(1.0 - saturate(dot(normalize(vNormal), normalize(vViewPosition))), 2.6);
    outgoingLight += fr * vec3(0.20, 0.17, 0.24) * (0.5 + 0.5 * normalize(vNormal).y) + vec3(0.025, 0.02, 0.03);
    #include <opaque_fragment>`);
};

// ---------- personajes ----------
export const part = (gb, shadow = true, rel = 0.009) => { const m = new THREE.Mesh(gb.build(false, Q.maxSeg > 2 ? 0.55 : 0.1), propMaterial); m.castShadow = shadow; const g = m.geometry, bb = g.boundingBox; const size = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z); addOutline(m, Math.max(0.008, size * rel)); return m; };

export function makeDona() {
  const root = new THREE.Group();
  const body = new GB();
  const robe = PAL.turq, robeD = darken(PAL.turq, 0.18);
  // zapatillas y piernas
  for (const s of [-1, 1]) {
    body.rbox(0.26, 0.12, 0.4, 0.06, PAL.pink, s * 0.14, 0, 0.06); body.sph(0.1, lighten(PAL.pink, 0.5), s * 0.14, 0.12, 0.2, 1.2, 0.7, 1, 8);
    body.cyl(0.055, 0.06, 0.34, PAL.cream, s * 0.14, 0.1, 0, 8); body.cyl(0.062, 0.062, 0.05, PAL.coral, s * 0.14, 0.26, 0, 8);
  }
  // bata (con vuelo)
  body.cyl(0.3, 0.52, 0.8, (x, y, z) => ((Math.floor((x + 5) * 6) + Math.floor((y + 5) * 6)) % 2 ? robe : lighten(robe, 0.1)), 0, 0.34, 0, 20);
  body.cyl(0.3, 0.3, 0.25, robe, 0, 1.1, 0, 14);
  body.torus(0.52, 0.045, PAL.white, 0, 0.36, 0, PI / 2, 0, 0, PI * 2, 24);
  body.torus(0.34, 0.06, PAL.sun, 0, 0.82, 0, PI / 2, 0, 0, PI * 2, 18);
  body.sph(0.075, PAL.sun, 0.14, 0.82, 0.32, 1, 1, 1, 8); body.cone(0.05, 0.3, PAL.sun, 0.12, 0.5, 0.33, 6, PI, 0, 0.1);
  body.rbox(0.2, 0.2, 0.05, 0.04, PAL.pink, -0.2, 0.55, 0.37, 0, 0, 0, 2);
  body.torus(0.24, 0.075, PAL.white, 0, 1.2, 0.04, PI / 2.4, 0, 0, PI * 2, 16); // solapa/cuello
  body.sph(0.22, PAL.cream, 0, 1.3, 0.0, 1.0, 0.5, 1.0, 10);
  const bodyM = part(body); root.add(bodyM);
  // cabeza
  const head = new THREE.Group(); head.position.set(0, 1.36, 0.02);
  const hg = new GB();
  hg.sph(0.37, PAL.skin, 0, 0.3, 0, 1.0, 0.95, 0.95, 18);
  const hair = 0xdcd2ff;
  hg.sph(0.4, hair, 0, 0.42, -0.07, 1.0, 0.9, 1.0, 16); hg.sph(0.17, hair, 0, 0.82, -0.04, 1, 0.9, 1, 12); hg.sph(0.09, lighten(hair, 0.4), 0, 0.95, -0.04, 1, 1, 1, 8);
  hg.sph(0.17, hair, -0.34, 0.28, -0.1, 0.9, 1.1, 1, 8); hg.sph(0.17, hair, 0.34, 0.28, -0.1, 0.9, 1.1, 1, 8);
  // rulos
  const cc = [PAL.coral, PAL.sun, PAL.mint, PAL.sky, PAL.pink, PAL.tang, PAL.violet];
  for (let i = 0; i < 7; i++) {
    const a = (i / 6 - 0.5) * 2.5; const x = Math.sin(a) * 0.3, y = 0.62 + Math.cos(a) * 0.11, zf = 0.28 * Math.cos(a * 0.7) * 0.6 + 0.12;
    hg.cyl(0.085, 0.085, 0.3, cc[i], x, y - 0.15, zf, 10, PI / 2 - 0.5, 0, a * 0.45 * -1);
    hg.cyl(0.086, 0.086, 0.03, darken(cc[i], 0.2), x, y - 0.15, zf, 10, PI / 2 - 0.5, 0, a * -0.45);
  }
  // cara
  const ey = 0.33;
  for (const s of [-1, 1]) {
    hg.sph(0.095, PAL.white, s * 0.14, ey, 0.31, 1, 1.1, 0.7, 10); hg.sph(0.05, PAL.ink, s * 0.14, ey - 0.005, 0.37, 1, 1.1, 0.7, 8); hg.sph(0.017, PAL.white, s * 0.14 + 0.02, ey + 0.03, 0.4, 1, 1, 1, 5);
    hg.torus(0.135, 0.016, PAL.rasp, s * 0.14, ey, 0.34, 0, 0, 0, PI * 2, 14);
    hg.sph(0.07, 0xff8fa6, s * 0.24, ey - 0.16, 0.28, 1.2, 0.75, 0.5, 8);
    hg.box(0.13, 0.032, 0.03, 0xb9b0e8, s * 0.14, ey + 0.17, 0.35, 0, 0, s * -0.22);
  }
  hg.box(0.06, 0.02, 0.02, PAL.rasp, 0, ey + 0.02, 0.37);
  hg.sph(0.06, 0xffb28f, 0, ey - 0.09, 0.37, 1, 0.9, 0.9, 8);
  const headM = part(hg); head.add(headM);
  const mg = new GB(); mg.sph(0.12, 0x8a1f45, 0, 0, 0, 1.15, 0.75, 0.6, 10); mg.sph(0.07, 0xff6f8f, 0, -0.04, 0.02, 1.2, 0.55, 0.6, 8);
  const mouth = part(mg, false); mouth.position.set(0, ey - 0.22, 0.33); head.add(mouth);
  root.add(head);
  // brazos
  const arms = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(s * 0.27, 1.13, 0.0);
    const ag = new GB();
    ag.cyl(0.075, 0.07, 0.5, robe, 0, 0, 0, 8); ag.cyl(0.085, 0.085, 0.08, PAL.white, 0, 0.02, 0, 8); ag.sph(0.095, PAL.skin, 0, 0.55, 0, 1, 1, 1, 8);
    if (s === 1) { // plumero
      ag.cyl(0.025, 0.025, 0.7, PAL.woodL, 0, 0.5, 0, 6);
      for (let i = 0; i < 9; i++) { const aa = i / 9 * PI * 2; ag.sph(0.07, cc[i % 7], Math.cos(aa) * 0.08, 1.35, Math.sin(aa) * 0.08, 0.7, 3.2, 0.7, 6, Math.sin(aa) * 0.4, 0, -Math.cos(aa) * 0.4); }
      ag.sph(0.07, PAL.sun, 0, 1.55, 0, 0.8, 2.5, 0.8, 6);
    }
    const am = part(ag); a.add(am);
    a.rotation.z = -s * 2.4; root.add(a); arms.push(a);
  }
  root.userData = { head, mouth, arms, bodyM, h: 1.7 };
  return root;
}

export function makeAlcalde() {
  const root = new THREE.Group(); const g = new GB();
  const coat = 0x2b3a8f;
  // piernas y zapatos
  for (const s of [-1, 1]) { g.cyl(0.07, 0.07, 0.5, PAL.ink, s * 0.2, 0.18, 0, 6); g.rbox(0.28, 0.16, 0.5, 0.07, 0x1d1530, s * 0.2, 0, 0.1); }
  // cuerpo (abrigo)
  g.cyl(0.42, 0.62, 1.25, coat, 0, 0.62, 0, 16); g.torus(0.45, 0.05, PAL.white, 0, 1.78, 0, PI / 2, 0, 0, PI * 2, 14);
  for (let i = 0; i < 3; i++) g.sph(0.06, PAL.gold, 0, 1.45 - i * 0.28, 0.45 - i * 0.04, 1, 1, 0.6, 6);
  g.cyl(0.07, 0.07, 1.5, 0xffd23f, 0, 1.0, 0.42, 6, 0, 0, 0.55); // banda
  g.sph(0.09, PAL.coral, 0.32, 1.35, 0.42, 1, 1, 0.5, 8);
  // cabeza
  g.sph(0.52, 0xffe0c0, 0, 2.15, 0.0, 1, 0.92, 1, 16);
  for (const s of [-1, 1]) {
    g.sph(0.13, PAL.white, s * 0.2, 2.25, 0.42, 1, 1.15, 0.6, 10); g.sph(0.07, PAL.ink, s * 0.2, 2.24, 0.5, 1, 1.15, 0.6, 8);
    g.box(0.3, 0.07, 0.05, 0x1d1530, s * 0.2, 2.5, 0.46, 0, 0, s * 0.4);
  }
  g.sph(0.14, 0xff7a6a, 0, 2.1, 0.5, 1, 1, 0.9, 10);
  // bigote enorme
  for (const s of [-1, 1]) {
    g.sph(0.17, 0x1d1530, s * 0.17, 1.96, 0.5, 1.6, 0.8, 0.7, 10, 0, 0, s * -0.3); g.sph(0.1, 0x1d1530, s * 0.38, 1.94, 0.46, 1.3, 0.9, 0.7, 8, 0, 0, s * 0.9);
    g.sph(0.05, 0x1d1530, s * 0.5, 2.04, 0.44, 1, 1, 1, 6);
  }
  g.sph(0.07, 0xc43a4a, 0, 1.82, 0.5, 1.4, 0.5, 0.5, 8);
  // sombrero-paraguas (cúpula)
  const body = part(g); root.add(body);
  const cano = new THREE.Group(); cano.position.set(0, 2.55, 0);
  const dome = sectorColors(new THREE.SphereGeometry(1.6, 24, 9, 0, PI * 2, 0, PI / 2), 8, 0x7b3fe4, 0xffd23f);
  const gc = new GB(); gc.add(dome, null, 0, 0, 0, 0, 0, 0, 1, 0.62, 1);
  gc.torus(1.6, 0.05, PAL.white, 0, 0, 0, PI / 2, 0, 0, PI * 2, 24); gc.cone(0.08, 0.35, PAL.gold, 0, 0.95, 0, 6); gc.sph(0.1, PAL.gold, 0, 1.3, 0, 1, 1, 1, 8);
  for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2; gc.sph(0.08, PAL.white, Math.cos(a) * 1.55, -0.06, Math.sin(a) * 1.55, 1, 1, 1, 6); }
  const canoM = part(gc); cano.add(canoM); root.add(cano);
  // brazos
  const arms = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(s * 0.5, 1.5, 0);
    const ag = new GB(); ag.cyl(0.07, 0.07, 0.55, coat, 0, 0, 0, 6, 0, 0, 0); ag.sph(0.12, PAL.white, 0, 0.58, 0, 1, 1, 1, 8);
    a.add(part(ag)); a.rotation.z = -s * 2.2; root.add(a); arms.push(a);
  }
  root.userData = { cano, arms, bodyM: body, h: 3.7 };
  return root;
}

export function makeRebel(v) {
  const root = new THREE.Group(); const g = new GB();
  const c = pick([PAL.pink, PAL.mint, PAL.tang, PAL.sky, PAL.violet, PAL.sun, PAL.coral], v);
  // sofá sin patas y con ojos
  g.rbox(3.6, 0.9, 1.9, 0.3, c, 0, 0.6, 0.1, 0, 0, 0, 4); g.rbox(3.6, 1.9, 0.7, 0.3, c, 0, 0.6, -0.7, 0, 0, 0, 4);
  g.rbox(0.55, 1.3, 1.9, 0.22, darken(c, 0.1), -1.65, 0.6, 0.1); g.rbox(0.55, 1.3, 1.9, 0.22, darken(c, 0.1), 1.65, 0.6, 0.1);
  g.rbox(1.35, 0.36, 1.4, 0.15, lighten(c, 0.3), -0.7, 1.45, 0.35); g.rbox(1.35, 0.36, 1.4, 0.15, lighten(c, 0.3), 0.7, 1.45, 0.35);
  g.rbox(0.8, 0.8, 0.3, 0.14, PAL.sun, 1.2, 1.55, -0.2, -0.3, 0, -0.2);
  const body = part(g); root.add(body);
  const eg = new GB();
  for (const s of [-1, 1]) {
    eg.sph(0.34, PAL.white, s * 0.55, 0, 0, 1, 1.12, 0.55, 12); eg.sph(0.15, PAL.ink, s * 0.55, -0.02, 0.17, 1, 1.1, 0.6, 8); eg.sph(0.055, PAL.white, s * 0.6, 0.06, 0.24, 1, 1, 1, 6);
    eg.box(0.55, 0.12, 0.1, PAL.ink, s * 0.55, 0.5, 0.05, 0, 0, s * 0.3);
  }
  const eyes = part(eg, false); eyes.position.set(0, 2.1, -0.28); root.add(eyes);
  const legs = [];
  const lg = () => { const q = new GB(); q.cyl(0.11, 0.09, 0.55, PAL.woodD, 0, -0.55, 0, 6); q.rbox(0.36, 0.14, 0.5, 0.06, PAL.ink, 0, -0.62, 0.08); return q; };
  for (const [x, z] of [[-1.3, 0.75], [1.3, 0.75], [-1.3, -0.5], [1.3, -0.5]]) { const l = new THREE.Group(); l.position.set(x, 0.62, z); l.add(part(lg())); root.add(l); legs.push(l); }
  // gotitas de sudor / exclamación
  root.userData = { eyes, legs, h: 2.8, color: c };
  return root;
}
