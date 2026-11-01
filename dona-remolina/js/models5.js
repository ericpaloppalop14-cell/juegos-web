// v18: VILLA JERSEY (jersey): jerséis de lana de todos los tamaños con ochos de punto, ovillos, agujas locas
import * as THREE from 'three';
import { GB, lighten, darken } from './geo.js?v=18';
import { KINDS } from './models.js?v=18';
const PI = Math.PI, pk = (a, v) => a[v % a.length], INK = 0x2a1840;
const N = (id, n, f, tier, nv, coins, th, pl, extra) => { KINDS[id] = { n, tier, f, nv, coins, th, places: [pl], notint: true, ...(extra || {}) }; };
const CB = (id, n, f, coins, th, pl) => { KINDS[id] = { n, tier: 5, f: () => f(), nv: 1, coins, th, places: [pl], notint: true, cb: true }; };
const LM = (id, n, f, coins, th, pl) => { KINDS[id] = { n, tier: 6, f: () => f(), nv: 1, coins, th: [th], places: [pl], notint: true, lm: true }; };
const win = (g, x, y, z, r = 0.6, c = 0xfff0a0) => { g.cyl(r, r, 0.34, c, x, y, z, 14, PI / 2, 0, 0); };
const ring = (n, f) => { for (let i = 0; i < n; i++) f(i / n * PI * 2, i); };
const P = 'jersey';

// paletas de jersey: [principal, canesú/puños, adorno 1, adorno 2]
export const JP = [
  [0xff3d5e, 0xfff0d8, 0xffffff, 0x3fbf5a],
  [0x2ad0c8, 0xffe66a, 0xffffff, 0xff4a8c],
  [0xff8ac8, 0xb8ffe0, 0xffffff, 0xb06bff],
  [0xff9a2a, 0x7a2aa8, 0xffe66a, 0xffffff],
  [0x9be64a, 0xff4aa8, 0xffffff, 0xffe66a],
  [0x4aa8ff, 0xffa03a, 0xffffff, 0xff3d5e],
  [0xffd23f, 0xe8453c, 0xffffff, 0x2a7bd9],
  [0xb06bff, 0xffc0e0, 0xffe66a, 0x3fe0b0],
];
export const JERSEY_COLORS = JP.map((p) => p[0]);
const YC = [0xff3d5e, 0xffd23f, 0x2ad0c8, 0xb06bff, 0xff9a2a, 0x9be64a, 0x4aa8ff, 0xff8ac8];

// ochos de punto: una trenza de elipsoides alternados
const cable = (g, x, y0, z, n, s, c, dz = 1, step = 0.12) => { for (let k = 0; k < n; k++) { const sd = k % 2 ? 1 : -1; g.sph(0.078 * s, k % 3 === 2 ? lighten(c, 0.55) : lighten(c, 0.25), x + sd * 0.032 * s, y0 + k * step * s, z, 0.72, 1.4, 0.7, 7, 0, 0, sd * 0.55); } };
function jersey(v, s, level) {
  const [m, rib, a1, a2] = JP[v % 8], g = new GB(), light = lighten(m, 0.28), W = 1.0 * s, D = 0.62 * s;
  // cuerpo, ribete inferior
  g.rbox(W, 0.98 * s, D, 0.22 * s, m, 0, 0.16 * s, 0, 0, 0, 0, 2);
  g.rbox(W * 1.05, 0.2 * s, D * 1.05, 0.09 * s, rib, 0, 0, 0, 0, 0, 0, 2);
  // mangas con puños
  for (const sd of [-1, 1]) {
    g.rbox(0.34 * s, 0.86 * s, 0.36 * s, 0.15 * s, m, sd * 0.68 * s, 0.18 * s, 0, 0, 0, sd * 0.5, 2);
    g.rbox(0.4 * s, 0.15 * s, 0.4 * s, 0.07 * s, rib, sd * 0.93 * s, 0.1 * s, 0, 0, 0, sd * 0.5, 2);
  }
  // cuello vuelto
  g.torus(0.21 * s, 0.1 * s, rib, 0, 1.13 * s, 0, PI / 2, 0, 0, PI * 2, 14); g.cyl(0.2 * s, 0.2 * s, 0.05 * s, 0x5a2a4a, 0, 1.08 * s, 0, 12);
  if (level >= 1) { // ochos delante y detrás
    for (const x of [-0.26, 0, 0.26]) cable(g, x * s, 0.34 * s, D / 2 - 0.005 * s, level >= 3 ? 6 : 4, s, light);
    if (level >= 3) for (const x of [-0.26, 0, 0.26]) cable(g, x * s, 0.34 * s, -D / 2 + 0.005 * s, 6, s, light);
  }
  if (level >= 2) { // canesú de colores
    for (let i = 0; i < 7; i++) g.rbox(0.085 * s, 0.085 * s, 0.03 * s, 0.02 * s, i % 2 ? a2 : a1, (-0.3 + i * 0.1) * s, 0.9 * s, D / 2 + 0.002 * s, 0, 0, PI / 4, 1);
    if (level >= 3) for (let i = 0; i < 7; i++) g.rbox(0.085 * s, 0.085 * s, 0.03 * s, 0.02 * s, i % 2 ? a1 : a2, (-0.3 + i * 0.1) * s, 0.9 * s, -D / 2 - 0.002 * s, 0, 0, PI / 4, 1);
    for (const sd of [-1, 1]) g.torus(0.17 * s, 0.025 * s, a1, sd * 0.78 * s, 0.5 * s, 0, 0, PI / 2, 0, PI * 2, 10);
  }
  if (level >= 9) { // percha de madera y pompón
    g.cyl(0.03 * s, 0.03 * s, 0.25 * s, 0x8a5a2a, 0, 1.2 * s, 0, 6); g.torus(0.07 * s, 0.025 * s, 0x8a5a2a, 0, 1.5 * s, 0, 0, 0, 0, PI * 1.5, 8);
    g.sph(0.1 * s, a1, 0, 1.3 * s, 0, 1, 1, 1, 8);
  }
  return g;
}
const jer = (lvl, s, rad) => (v) => [jersey(v, s, lvl), rad];

// ---------- ovillos ----------
function ball(v, r, wraps = 4) {
  const c = pk(YC, v), g = new GB(), l = lighten(c, 0.32);
  g.sph(r, c, 0, r, 0, 1, 1, 1, 14);
  const rots = [[0, 0], [PI / 3, 0.3], [-PI / 3, 0.9], [1.2, 1.5], [0.5, -0.8]];
  for (let i = 0; i < wraps; i++) { const [rx, rz] = rots[i]; g.torus(r * 1.0, r * 0.075, i % 2 ? l : darken(c, 0.12), 0, r, 0, PI / 2 + rx, 0, rz, PI * 2, 18); }
  g.torus(r * 0.55, r * 0.05, c, r * 1.05, r * 0.25, 0, 0, 0, 0, PI * 1.4, 10);
  return g;
}
N('ovillito', 'Ovillo', (v) => [ball(v, 0.3, 3), 0.32], 0, 8, 1, ['salon', 'dormitorio', 'plaza', 'cocina', 'jardin', 'bano'], P);
N('jmini', 'Jersey de muñeca', jer(0, 0.5, 0.3), 0, 8, 2, ['armaropolis', 'dormitorio', 'salon', 'plaza', 'lavanderia', 'bano'], P, { sweater: 1 });
N('jmini2', 'Jerseycito', jer(1, 0.56, 0.33), 0, 8, 2, ['armaropolis', 'dormitorio', 'salon', 'plaza', 'cocina', 'jardin'], P, { sweater: 1 });
N('jpeque', 'Jersey pequeño', jer(1, 0.85, 0.52), 1, 8, 4, ['armaropolis', 'dormitorio', 'lavanderia', 'plaza', 'salon', 'cocina'], P, { sweater: 1 });
N('jpeque2', 'Jersey de punto', jer(2, 0.95, 0.58), 1, 8, 4, ['armaropolis', 'biblioteca', 'dormitorio', 'plaza', 'jardin', 'bano'], P, { sweater: 1 });
N('ovilloM', 'Ovillo mediano', (v) => [ball(v + 3, 0.62, 4), 0.64], 1, 8, 3, ['salon', 'dormitorio', 'plaza', 'jardin', 'lavanderia'], P);
N('bufanda', 'Bufanda larguísima', (v) => { const g = new GB(), c = pk(YC, v), c2 = pk(YC, v + 3); for (let i = 0; i < 9; i++) g.rbox(0.28, 0.2, 0.34, 0.07, i % 2 ? c2 : c, -1.1 + i * 0.28, 0.02 + (i % 2) * 0.03, 0, 0, 0, 0, 2); for (let i = 0; i < 5; i++) g.cone(0.025, 0.2, c, 1.3, 0.04, -0.12 + i * 0.06, 4, 0, 0, -PI / 2); g.torus(0.14, 0.05, c, -1.15, 0.2, 0, 0, PI / 2, 0, PI * 1.6, 8); return [g, 1.0]; }, 1, 8, 3, ['armaropolis', 'plaza', 'jardin', 'salon', 'lavanderia'], P);
N('gorro', 'Gorro con pompón', (v) => { const [m, rib, a1] = JP[v % 8], g = new GB(); g.add(new THREE.SphereGeometry(0.5, 14, 9, 0, PI * 2, 0, PI / 2), m, 0, 0.12, 0, 0, 0, 0, 1, 1.1, 1); g.torus(0.5, 0.11, rib, 0, 0.13, 0, PI / 2, 0, 0, PI * 2, 16); cable(g, 0, 0.3, 0.46, 4, 1.4, lighten(m, 0.3)); g.sph(0.17, a1, 0, 0.78, 0, 1, 1, 1, 10); return [g, 0.6]; }, 1, 8, 4, ['armaropolis', 'dormitorio', 'plaza', 'salon', 'jardin'], P);
N('jmed', 'Jersey de la abuela', jer(2, 1.55, 0.95), 2, 8, 9, ['armaropolis', 'dormitorio', 'salon', 'lavanderia', 'plaza', 'biblioteca'], P, { sweater: 1 });
N('jmed2', 'Jersey con ochos', jer(3, 1.7, 1.05), 2, 8, 10, ['armaropolis', 'biblioteca', 'dormitorio', 'plaza', 'cocina', 'jardin'], P, { sweater: 1 });
N('agujas', 'Agujas con labor', (v) => { const c = pk(YC, v), g = new GB(), n1 = pk([0xffc02a, 0xff4a8c, 0x2ad0c8, 0xffffff], v); for (const sd of [-1, 1]) { g.cyl(0.05, 0.05, 2.2, sd > 0 ? n1 : lighten(n1, 0.3), sd * 0.18, 0.1, 0, 8, 0, 0, sd * 0.5); g.sph(0.1, sd > 0 ? 0xff4a8c : 0x2ad0c8, sd * 0.7, 1.2, 0, 1, 1, 1, 8); } g.rbox(0.8, 0.7, 0.22, 0.08, c, 0, 0.1, 0, 0, 0, 0, 2); cable(g, 0, 0.15, 0.115, 5, 1.0, lighten(c, 0.3)); g.add(new THREE.SphereGeometry(0.4, 12, 8), c, 0.9, 0.4, 0.4); g.torus(0.4, 0.03, lighten(c, 0.35), 0.9, 0.4, 0.4, 0, 0, 0.5, PI * 2, 12); return [g, 1.0]; }, 2, 8, 9, ['biblioteca', 'dormitorio', 'salon', 'plaza'], P);
N('maniqui', 'Maniquí con jersey', (v) => { const g = jersey(v + 2, 1.5, 3); g.cyl(0.09, 0.12, 0.4, 0x8a5a2a, 0, -0.4, 0, 8); g.cyl(0.35, 0.4, 0.06, 0x8a5a2a, 0, -0.42, 0, 12); return [g, 0.95]; }, 2, 8, 11, ['armaropolis', 'plaza', 'salon'], P, { sweater: 1 });
N('jgrande', 'Jersey XL', jer(3, 2.6, 1.7), 3, 8, 22, ['armaropolis', 'dormitorio', 'plaza', 'salon', 'lavanderia', 'biblioteca', 'cocina', 'jardin'], P, { sweater: 1 });
N('jgrande2', 'Jersey de Navidad', jer(4, 2.9, 1.9), 3, 8, 24, ['armaropolis', 'plaza', 'salon', 'jardin', 'dormitorio', 'bano', 'cocina'], P, { sweater: 1 });
N('ovilloG', 'Ovillo gigante', (v) => [ball(v + 5, 1.7, 5), 1.75], 3, 8, 20, ['plaza', 'jardin', 'salon', 'dormitorio', 'lavanderia'], P);
N('jenorme', 'Jersey Enorme', jer(4, 4.6, 2.9), 4, 8, 55, ['armaropolis', 'plaza', 'salon', 'jardin', 'dormitorio', 'lavanderia', 'biblioteca'], P, { sweater: 1 });
N('jenorme2', 'Jersey Mamut', jer(4, 5.4, 3.4), 4, 8, 65, ['plaza', 'armaropolis', 'salon', 'jardin', 'cocina', 'bano'], P, { sweater: 1 });
N('ovilloT', 'Ovillo titánico', (v) => [ball(v + 1, 3.1, 5), 3.2], 4, 8, 60, ['plaza', 'jardin', 'dormitorio', 'salon'], P);

// ---------- edificios locos ----------
CB('cb_agujas', 'Agujas Locas', () => {
  const g = new GB(); const cs = [0xff3d5e, 0xffd23f, 0x2ad0c8, 0xb06bff, 0xff9a2a];
  g.sph(6.4, 0xff8ac8, 0, 5.6, 0, 1.1, 0.95, 1.05, 22); for (let i = 0; i < 4; i++) g.torus(6.2 - i * 0.7, 0.4, cs[i % 5], 0, 4.6 + i * 1.7, 0, PI / 2 + (i % 2) * 0.12, 0, 0, PI * 2, 20);
  g.rbox(3, 4.6, 1, 0.5, 0x7a2a8a, 0, 0, 5.6, 0, 0, 0, 2); win(g, 3.6, 8.4, 5.2, 0.9, 0xfff0a0); win(g, -3.6, 8.8, 5.2, 0.8, 0xfff0a0);
  for (const [rz, rx, c, k, x] of [[0.34, 0.2, 0xffc02a, 0xff4a8c, 1.2], [-0.28, -0.18, 0x2ad0c8, 0xffd23f, -1.2]]) { g.cyl(0.6, 0.6, 38, c, x, -2, 0, 10, rx, 0, rz); const t = Math.sin(rz) * 19, u = Math.cos(rz) * 19; g.sph(1.2, k, x - t, 17 + u * 0.98, -Math.sin(rx) * -19 * 0.4, 1, 1, 1, 10); g.sph(1.2, k, x + t, 17 - u * 0.98, 0, 1, 1, 1, 10); }
  g.rbox(8, 7, 1.0, 0.5, 0xffd23f, 0, 14, -3.2, 0, 0, 0.12, 2); for (let i = 0; i < 6; i++) g.cone(0.18, 1.6, cs[i % 5], -3.2 + i * 1.3, 11.8, -3.2, 5, PI, 0, 0.12);
  return [g, 7.2]; }, 190, ['salon', 'plaza', 'biblioteca', 'jardin'], P);
CB('cb_ovillotorre', 'Torre de Ovillos', () => {
  const g = new GB(); const cs = [0xff3d5e, 0xffd23f, 0x2ad0c8, 0xb06bff, 0xff9a2a, 0x9be64a];
  [[5.6, 5.6], [4.6, 13], [3.7, 19.4], [2.8, 24.6]].forEach(([r, y], i) => { g.sph(r, cs[i], (i % 2 ? 0.6 : -0.6), y, 0, 1, 0.92, 1, 20); for (let k = 0; k < 3; k++) g.torus(r * 1.0, r * 0.07, lighten(cs[i], 0.3), (i % 2 ? 0.6 : -0.6), y, 0, PI / 2 + k * 0.7, k * 0.5, 0.2 * k, PI * 2, 16); if (i < 3) win(g, (i % 2 ? 0.6 : -0.6) + 1, y, r * 0.92, 0.7, 0xfff0a0); });
  g.rbox(2.6, 3.6, 0.8, 0.4, 0x5a2a8a, 0, 0, 5.2, 0, 0, 0, 2); g.cyl(0.18, 0.18, 8, 0xffc02a, 0.6, 27, 0, 8); g.sph(1.0, 0xff4a8c, 0.6, 35.4, 0, 1, 1, 1, 10);
  return [g, 6.2]; }, 180, ['plaza', 'jardin', 'salon', 'lavanderia'], P);
CB('cb_casajersey', 'Casa Jersey', () => {
  const g = jersey(2, 12, 3); win(g, -2.4, 3.6, 3.9, 0.9, 0xfff0a0); win(g, 2.4, 3.6, 3.9, 0.9, 0xfff0a0); win(g, 0, 6.6, 3.9, 1.0, 0xbff3ff); g.rbox(2.4, 3.6, 0.6, 0.3, 0x6a2a8a, 0, 0, 3.8, 0, 0, 0, 2);
  g.cyl(0.8, 0.8, 4.6, 0xff4a8c, 3.2, 13, 0, 8); g.sph(1.0, 0xffffff, 3.2, 18, 0, 1, 0.8, 1, 8);
  return [g, 8.4]; }, 185, ['armaropolis', 'dormitorio', 'plaza', 'lavanderia'], P);

// ---------- monumentos ----------
LM('lm_ovillo', 'Ovillo Colosal', () => {
  const g = new GB(), c = 0xff4a8c, l = lighten(c, 0.3); g.sph(10, c, 0, 10, 0, 1, 1, 1, 30);
  for (let i = 0; i < 8; i++) g.torus(10.1, 0.65, i % 2 ? l : darken(c, 0.1), 0, 10, 0, PI / 2 + i * 0.4, i * 0.55, (i % 3) * 0.4, PI * 2, 28);
  g.torus(7, 0.5, c, 12, 1.2, 4, PI / 2, 0, 0, PI * 1.7, 22); g.torus(5, 0.45, l, 16, 1.2, 10, PI / 2, 0, 0, PI * 1.5, 18);
  g.cyl(0.55, 0.55, 28, 0xffd23f, -4, -2, 0, 10, 0, 0, -0.5); g.sph(1.3, 0x2ad0c8, -4 - Math.sin(0.5) * 14, 26 * 0.96, 0, 1, 1, 1, 10);
  g.cyl(0.55, 0.55, 28, 0x2ad0c8, 4, -2, 0, 10, 0, 0, 0.5); g.sph(1.3, 0xffd23f, 4 + Math.sin(0.5) * 14, 26 * 0.96, 0, 1, 1, 1, 10);
  g.sph(1.3, 0xffffff, 3.5, 15.5, 8.8, 1, 1, 0.6, 10); g.sph(0.65, INK, 3.5, 15.4, 9.3, 1, 1, 1, 8); g.sph(1.3, 0xffffff, -3.5, 15.5, 8.8, 1, 1, 0.6, 10); g.sph(0.65, INK, -3.5, 15.4, 9.3, 1, 1, 1, 8);
  g.torus(2.4, 0.3, INK, 0, 11.4, 9.2, 0, 0, PI, PI, 14);
  return [g, 12]; }, 380, 'plaza', P);
LM('lm_agujas', 'Agujas Gigantes', () => {
  const g = new GB(), cs = [0xff3d5e, 0xffd23f, 0x2ad0c8, 0xb06bff, 0xff9a2a, 0x9be64a];
  g.sph(5, 0x9be64a, -14, 5, 6, 1, 1, 1, 14); g.sph(4, 0xff9a2a, 14, 4, 8, 1, 1, 1, 14);
  for (const [sd, c, k] of [[-1, 0xffc02a, 0xff4a8c], [1, 0x2ad0c8, 0xffd23f]]) { g.cyl(0.9, 0.9, 62, c, sd * 3, -1, 0, 12, 0, 0, sd * 0.32); g.sph(2.1, k, sd * (3 - Math.sin(0.32) * 30.5) * -1 + sd * 6.2, 58, 0, 1, 1, 1, 12); }
  for (let i = 0; i < 12; i++) { const y = 22 + i * 2.4; g.rbox(9 - i * 0.2, 2.4, 1.3, 0.5, cs[i % 6], 0, y, 0, 0, 0, 0, 2); }
  for (let i = 0; i < 6; i++) g.cone(0.3, 3, cs[i], -3.4 + i * 1.4, 18.6, 0, 5, PI, 0, 0);
  return [g, 11]; }, 360, 'jardin', P);
LM('lm_jerseytorre', 'Jersey Rascacielos', () => {
  const g = jersey(6, 20, 3); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) win(g, -4.6 + c * 3.1, 9 + r * 3.2, 6.3, 0.8, (r + c) % 2 ? 0xfff0a0 : 0xbff3ff);
  g.sph(2.2, 0xe8453c, 0, 26, 0, 1, 1, 1, 10);
  return [g, 14]; }, 400, 'armaropolis', P);
