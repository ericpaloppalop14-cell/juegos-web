// ======================================================================
//  MOCHI PARTY · OLIMPIADAS — mundos (cielo, suelo, decorado) y objetos surrealistas
// ======================================================================
import { THREE, toon, outline, mesh, glowSprite, skyDome, lights, rnd, pick, camera } from '../core3d.js?v=m16';
import { ambiente } from './ambiente.js?v=o20';
import { richDecor } from './decor.js?v=o20';

const G = {};
const geo = (k, f) => G[k] || (G[k] = f());
export const SPH = () => geo('s', () => new THREE.SphereGeometry(1, 20, 14));
export const SPHL = () => geo('sl', () => new THREE.SphereGeometry(1, 10, 8));
export const CYL = () => geo('c', () => new THREE.CylinderGeometry(1, 1, 1, 20));
export const CONE = () => geo('k', () => new THREE.ConeGeometry(1, 1, 18));
export const BOX = () => geo('b', () => new THREE.BoxGeometry(1, 1, 1));
export const TOR = () => geo('t', () => new THREE.TorusGeometry(1, .28, 10, 28));
export const ICO = () => geo('i', () => new THREE.IcosahedronGeometry(1, 0));
export const DOD = () => geo('d', () => new THREE.DodecahedronGeometry(1, 0));
const T = (c, o) => toon(c, o || { rim: .45 });
const GL = (c, k = .5) => toon(c, { emissive: c, ei: k, rim: .4 });
const OL = (m, c = '#4a2a5a', k = 1.05) => { outline(m, c, k); return m; };

// ojitos kawaii para casi todo (lo surrealista es que todo te mira)
export function face(g, y, z, s = 1, mood = 'ok', x = 0) {
  const e = T('#2a1838', { rim: 0 }), w = new THREE.MeshBasicMaterial({ color: '#fff' });
  for (const k of [-1, 1]) { const m = mesh(SPHL(), e, g, [x + k * .22 * s, y, z], null, [.09 * s, .12 * s, .06 * s]); mesh(SPHL(), w, m, [.35, .4, .6], null, .35); }
  mesh(SPHL(), T('#ff8fb8', { rim: 0 }), g, [x - .38 * s, y - .12 * s, z - .02], null, [.09 * s, .05 * s, .03 * s]);
  mesh(SPHL(), T('#ff8fb8', { rim: 0 }), g, [x + .38 * s, y - .12 * s, z - .02], null, [.09 * s, .05 * s, .03 * s]);
  if (mood !== 'none') mesh(geo('mouth', () => new THREE.TorusGeometry(1, .3, 6, 12, Math.PI)), e, g, [x, y - .16 * s, z + .01], [0, 0, Math.PI], .07 * s);
}

// ---------------- fábrica de objetos (se construyen una vez y se clonan) ----------------
const B = {
  meteoro(g) { const r = mesh(DOD(), T('#8a6aa8'), g, [0, 0, 0], null, .9); OL(r, '#3a2050'); for (let i = 0; i < 5; i++) mesh(SPHL(), T('#6a4a88'), r, [rnd(-.7, .7), rnd(-.7, .7), .75], null, .18); g.add(glowSprite('#ff9a4a', 3.2, .55)); face(g, .1, .85, 1.1); },
  ovni(g) { mesh(SPH(), T('#bfe8ff', { opacity: .7, rim: .8 }), g, [0, .35, 0], null, [.6, .5, .6]); const d = mesh(SPH(), T('#b9a2f7'), g, [0, 0, 0], null, [1.4, .3, 1.4]); OL(d); for (let i = 0; i < 8; i++) mesh(SPHL(), GL(pick(['#ffe27a', '#7ee3c4', '#ff9cc8'])), g, [Math.cos(i * .785) * 1.2, -.05, Math.sin(i * .785) * 1.2], null, .12); face(g, .4, .52, .8); },
  estrella(g) { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? .45 : 1, a = i / 10 * Math.PI * 2 + Math.PI / 2; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } const m = mesh(geo('star', () => new THREE.ExtrudeGeometry(s, { depth: .35, bevelEnabled: true, bevelSize: .08, bevelThickness: .08 })), GL('#ffd84a', .45), g, [0, 0, -.17], null, .7); OL(m, '#c08a10', 1.06); g.add(glowSprite('#ffe27a', 2.2, .7)); face(g, .05, .3, .7); },
  planeta(g) { const p = mesh(SPH(), T('#ff9cc8'), g, null, null, 1); OL(p); mesh(TOR(), T('#ffe27a'), g, null, [1.3, .2, 0], [1.6, 1.6, .3]); face(g, .1, .98, 1.2); },
  cohete(g) { mesh(CYL(), T('#ffffff'), g, [0, 1, 0], null, [.5, 2, .5]); mesh(CONE(), T('#ff6fae'), g, [0, 2.4, 0], null, [.5, .8, .5]); for (let i = 0; i < 3; i++) mesh(BOX(), T('#7ee3c4'), g, [Math.cos(i * 2.1) * .55, .2, Math.sin(i * 2.1) * .55], [0, -i * 2.1, 0], [.5, .6, .08]); mesh(SPHL(), T('#8fd0ff'), g, [0, 1.4, .45], null, .22); },
  cactus(g) { const m = T('#5fcf7a'); OL(mesh(CYL(), m, g, [0, .9, 0], null, [.42, 1.8, .42])); mesh(SPH(), m, g, [0, 1.8, 0], null, .42); for (const s of [-1, 1]) { mesh(CYL(), m, g, [s * .55, 1.1, 0], [0, 0, s * 1.57], [.2, .4, .2]); mesh(CYL(), m, g, [s * .75, 1.4, 0], null, [.2, .7, .2]); mesh(SPH(), m, g, [s * .75, 1.75, 0], null, .2); } mesh(SPHL(), GL('#ff7fbf', .3), g, [0, 2.25, 0], null, .2); face(g, 1.3, .42, .9); },
  piramide(g) { const m = mesh(geo('pyr', () => new THREE.ConeGeometry(1, 1, 4)), T('#ffcf7a'), g, [0, 1.2, 0], [0, .785, 0], [2, 2.4, 2]); OL(m, '#a8743a'); face(g, 1, 1.05, 1.3); },
  rodadora(g) { const m = mesh(ICO(), T('#d9a65a', { rim: .3, flat: true }), g, [0, .9, 0], null, .9); m.material = new THREE.MeshToonMaterial({ color: '#c8904a', wireframe: true }); mesh(ICO(), T('#e8b86a'), g, [0, .9, 0], null, .55); face(g, 1, .72, .8); },
  camello(g) { const m = T('#e8b46a'); OL(mesh(SPH(), m, g, [0, 1.1, 0], null, [.7, .55, 1.1])); mesh(SPH(), m, g, [0, 1.6, -.2], null, .45); mesh(SPH(), m, g, [0, 1.6, .35], null, .4); for (const [x, z] of [[-.4, -.6], [.4, -.6], [-.4, .6], [.4, .6]]) mesh(CYL(), m, g, [x, .45, z], null, [.12, .9, .12]); mesh(CYL(), m, g, [0, 1.5, 1.05], [.6, 0, 0], [.16, .9, .16]); const h = mesh(SPH(), m, g, [0, 1.9, 1.35], null, [.3, .25, .4]); face(g, 2, 1.62, .55); },
  pinguino(g) { OL(mesh(SPH(), T('#3a3a5a'), g, [0, .8, 0], null, [.6, .8, .55])); mesh(SPH(), T('#ffffff'), g, [0, .75, .2], null, [.45, .65, .4]); mesh(CONE(), T('#ffb030'), g, [0, 1.15, .6], [1.57, 0, 0], [.12, .25, .12]); face(g, 1.3, .52, .7); },
  muneco(g) { const w = T('#ffffff', { rim: .6 }); OL(mesh(SPH(), w, g, [0, .9, 0], null, .9)); OL(mesh(SPH(), w, g, [0, 2.1, 0], null, .62)); mesh(CONE(), T('#ff8a3a'), g, [0, 2.1, .7], [1.57, 0, 0], [.1, .45, .1]); mesh(CYL(), T('#ff6fae'), g, [0, 2.75, 0], null, [.45, .35, .45]); mesh(TOR(), T('#7ee3c4'), g, [0, 1.55, 0], [1.57, 0, 0], [.6, .6, .5]); face(g, 2.25, .58, .7); },
  iglu(g) { const m = mesh(geo('half', () => new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), T('#e8f4ff', { rim: .7 }), g, null, null, [1.3, 1.1, 1.1]); OL(m, '#6a8ab0'); mesh(geo('halfc', () => new THREE.CylinderGeometry(1, 1, 1, 16, 1, false, 0, Math.PI)), T('#6a8ab0'), g, [0, .3, 1.05], [0, -1.57, 1.57], [.35, .3, .35]); face(g, .75, 1.08, .9); },
  hielo(g) { const m = mesh(BOX(), T('#bfe8ff', { opacity: .8, rim: .9 }), g, [0, .6, 0], [0, .3, 0], [1.2, 1.2, 1.2]); OL(m, '#5aa0d0'); face(g, .7, .62, .8); },
  copo(g) { const m = GL('#ffffff', .4); for (let i = 0; i < 3; i++) mesh(BOX(), m, g, null, [0, 0, i * 1.047], [1.6, .16, .1]); mesh(SPHL(), m, g, null, null, .3); g.add(glowSprite('#bfe8ff', 2, .6)); },
  bola(g) { OL(mesh(SPH(), T('#ffffff', { rim: .7 }), g, null, null, .35), '#6a8ab0', 1.08); },
  medusa(g) { mesh(geo('half', () => new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), T('#ff9cf0', { opacity: .75, rim: .9 }), g, [0, .8, 0], null, .8); for (let i = 0; i < 6; i++) mesh(CYL(), T('#c9b2ff', { opacity: .7 }), g, [Math.cos(i) * .45, .3, Math.sin(i) * .45], null, [.05, 1, .05]); face(g, 1.1, .75, .7); },
  cangrejo(g) { const m = T('#ff7a6a'); OL(mesh(SPH(), m, g, [0, .55, 0], null, [.8, .45, .6])); for (const s of [-1, 1]) { mesh(SPH(), m, g, [s * 1, .8, .3], null, [.3, .22, .2]); for (let i = 0; i < 3; i++) mesh(CYL(), m, g, [s * .75, .25, -.3 + i * .3], [0, 0, s * .8], [.06, .5, .06]); mesh(CYL(), m, g, [s * .25, 1.05, .2], null, [.05, .4, .05]); } face(g, .7, .58, .8); },
  burbuja(g) { mesh(SPH(), T('#bff4ff', { opacity: .35, rim: 1 }), g, null, null, 1); mesh(SPHL(), new THREE.MeshBasicMaterial({ color: '#fff' }), g, [-.4, .4, .7], null, .15); },
  erizo(g) { OL(mesh(SPH(), T('#6a3a8a'), g, null, null, .6)); for (let i = 0; i < 14; i++) { const a = rnd(0, 6.28), b = rnd(-1.4, 1.4); const s = mesh(CONE(), T('#8a5aaa'), g, [Math.cos(a) * Math.cos(b) * .7, Math.sin(b) * .7, Math.sin(a) * Math.cos(b) * .7], null, [.1, .6, .1]); s.lookAt(s.position.clone().multiplyScalar(3)); s.rotateX(1.57); } face(g, .1, .58, .7); },
  coral(g) { const m = T(pick(['#ff7fbf', '#ffb36b', '#c9b2ff'])); for (let i = 0; i < 5; i++) mesh(CYL(), m, g, [rnd(-.4, .4), .8 + rnd(0, .5), rnd(-.3, .3)], [rnd(-.5, .5), 0, rnd(-.5, .5)], [.15, 1.6 + rnd(0, 1), .15]); },
  pez(g) { const m = T(pick(['#ffd84a', '#7ee3c4', '#ff9cc8'])); OL(mesh(SPH(), m, g, null, null, [.4, .5, .8])); mesh(CONE(), m, g, [0, 0, -.9], [-1.57, 0, 0], [.4, .5, .15]); face(g, .1, .62, .6); },
  rana(g) { const m = T('#7fd86a'); OL(mesh(SPH(), m, g, [0, .7, 0], null, [.9, .6, .8])); for (const s of [-1, 1]) { mesh(SPH(), m, g, [s * .45, 1.25, .3], null, .3); mesh(SPH(), T('#5ab84a'), g, [s * .8, .25, .3], null, [.3, .15, .45]); } face(g, 1.25, .58, .7); mesh(TOR(), T('#ff8fb8'), g, [0, .65, .75], [0, 0, Math.PI], [.3, .15, .2]); },
  pina(g) { OL(mesh(SPH(), T('#ffc93a'), g, [0, .8, 0], null, [.6, .8, .6]), '#a8742a'); for (let i = 0; i < 6; i++) mesh(CONE(), T('#5fcf7a'), g, [0, 1.7, 0], [Math.cos(i) * .5, 0, Math.sin(i) * .5], [.15, .8, .15]); face(g, .95, .58, .7); },
  coco(g) { OL(mesh(SPH(), T('#8a5a3a'), g, null, null, .5)); face(g, .05, .48, .5); },
  platano(g) { const m = mesh(geo('ban', () => new THREE.TorusGeometry(1, .3, 10, 20, 2.2)), T('#ffe24a'), g, null, [0, 0, .5], .7); OL(m, '#b89a10'); },
  mono(g) { const m = T('#a8784a'); OL(mesh(SPH(), m, g, [0, 1, 0], null, .7)); mesh(SPH(), T('#ffd8a8'), g, [0, .95, .45], null, [.45, .4, .3]); for (const s of [-1, 1]) mesh(SPH(), m, g, [s * .7, 1.3, 0], null, .25); face(g, 1.1, .74, .7); },
  totem(g) { for (let i = 0; i < 3; i++) { const m = mesh(CYL(), T(['#ff9a5a', '#7ee3c4', '#ff7fbf'][i]), g, [0, .6 + i * 1.1, 0], null, [.7, 1.1, .7]); face(g, .7 + i * 1.1, .72, .8); } },
  seta(g) { mesh(CYL(), T('#fff4e0'), g, [0, .6, 0], null, [.3, 1.2, .3]); const c = mesh(geo('half', () => new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), T('#ff6f8a'), g, [0, 1.1, 0], null, [1, .7, 1]); OL(c); for (let i = 0; i < 5; i++) mesh(SPHL(), T('#ffffff'), g, [Math.cos(i * 1.3) * .6, 1.55, Math.sin(i * 1.3) * .6], null, .15); face(g, .75, .32, .6); },
  donut(g) { OL(mesh(TOR(), T('#ffcf8a'), g, [0, 1, 0], null, [1, 1, 1.4])); mesh(TOR(), T('#ff9cc8'), g, [0, 1, .12], null, [1, 1, 1.2]); face(g, 1.1, .5, .7); },
  cupcake(g) { mesh(CYL(), T('#ff9cc8'), g, [0, .45, 0], null, [.7, .9, .7]); OL(mesh(SPH(), T('#fff4fa'), g, [0, 1.1, 0], null, [.8, .55, .8])); mesh(SPH(), GL('#ff4f6a', .3), g, [0, 1.65, 0], null, .2); face(g, .5, .72, .7); },
  piruleta(g) { mesh(CYL(), T('#ffffff'), g, [0, 1.2, 0], null, [.08, 2.4, .08]); const p = mesh(CYL(), T(pick(['#ff7fbf', '#7ee3c4', '#ffd36b'])), g, [0, 2.6, 0], [1.57, 0, 0], [.9, .2, .9]); OL(p); mesh(TOR(), T('#ffffff'), g, [0, 2.6, .12], null, .5); face(g, 2.6, .25, .7); },
  caramelo(g) { OL(mesh(SPH(), GL(pick(['#ff7fbf', '#7ee3c4', '#ffd36b', '#b9a2f7']), .3), g, null, null, [.55, .4, .4])); for (const s of [-1, 1]) mesh(CONE(), T('#ffffff'), g, [s * .7, 0, 0], [0, 0, s * 1.57], [.3, .4, .3]); },
  osito(g) { const m = T(pick(['#ff6f8a', '#7ee3c4', '#ffd36b']), { opacity: .85, rim: .8 }); OL(mesh(SPH(), m, g, [0, .7, 0], null, [.6, .7, .5])); mesh(SPH(), m, g, [0, 1.5, 0], null, .45); for (const s of [-1, 1]) mesh(SPH(), m, g, [s * .35, 1.9, 0], null, .15); face(g, 1.5, .45, .6); },
  brocoli(g) { mesh(CYL(), T('#9fe08a'), g, [0, .5, 0], null, [.25, 1, .25]); for (let i = 0; i < 5; i++) mesh(SPH(), T('#3fa84a'), g, [Math.cos(i * 1.3) * .35, 1.2, Math.sin(i * 1.3) * .35], null, .4); face(g, 1.15, .55, .6); },
  bastón(g) { const m = mesh(geo('cane', () => new THREE.TorusGeometry(.5, .14, 8, 16, Math.PI)), T('#ff4f6a'), g, [-.5, 2.5, 0], null, 1); mesh(CYL(), T('#ffffff'), g, [0, 1.25, 0], null, [.14, 2.5, .14]); },
  nubeLejos(g) { const m = T('#ffffff', { rim: .8 }); for (let k = 0; k < 6; k++) mesh(SPHL(), m, g, [k * .6 - 1.5, Math.sin(k * 2) * .25, rnd(-.3, .3)], null, rnd(.55, .9)); },
  nube(g) { const m = T('#ffffff', { rim: .8 }); for (let k = 0; k < 5; k++) mesh(SPH(), m, g, [k * .55 - 1.1, Math.sin(k) * .2, rnd(-.2, .2)], null, rnd(.5, .75)); face(g, .1, .7, .8); },
  almohada(g) { OL(mesh(SPH(), T(pick(['#ff8fc4', '#ffffff', '#6ab8ff']), { rim: .7 }), g, [0, .5, 0], null, [1.2, .45, .9])); face(g, .55, .42, .8); },
  oveja(g) { const w = T('#ffffff', { rim: .7 }); for (let i = 0; i < 7; i++) mesh(SPH(), w, g, [rnd(-.5, .5), .9 + rnd(-.2, .2), rnd(-.5, .5)], null, .5); OL(mesh(SPH(), T('#4a3a5a'), g, [0, 1, .75], null, [.35, .4, .35])); for (const [x, z] of [[-.3, -.3], [.3, -.3], [-.3, .3], [.3, .3]]) mesh(CYL(), T('#4a3a5a'), g, [x, .25, z], null, [.08, .5, .08]); face(g, 1.05, 1.08, .55); },
  reloj(g) { const c = mesh(CYL(), T('#ffe27a'), g, [0, 1, 0], [1.57, 0, 0], [1, .2, 1]); OL(c); mesh(CYL(), T('#ffffff'), g, [0, 1, .1], [1.57, 0, 0], [.85, .05, .85]); face(g, 1.1, .16, .8); },
  luna(g) { const m = mesh(geo('moon', () => new THREE.TorusGeometry(1, .45, 12, 24, 3.6)), GL('#ffe9a8', .35), g, null, [0, 0, -.3], .8); OL(m, '#c0a050'); g.add(glowSprite('#ffe9a8', 3, .5)); },
  mariposa(g) { for (const s of [-1, 1]) mesh(SPH(), T(pick(['#ff9cf0', '#8fd0ff', '#ffe27a']), { opacity: .85 }), g, [s * .7, 0, 0], [0, 0, s * .4], [.7, .5, .08]); mesh(CYL(), T('#6a3a8a'), g, null, null, [.08, .7, .08]); },
  roca(g) { OL(mesh(DOD(), T('#6a4a5a', { flat: true }), g, [0, .8, 0], null, .85), '#2a1820'); for (let i = 0; i < 4; i++) mesh(SPHL(), GL('#ff6a2a', .9), g, [rnd(-.5, .5), .8 + rnd(-.5, .5), .7], null, .15); face(g, .95, .78, .8); },
  bolafuego(g) { mesh(SPH(), GL('#ffb030', .9), g, null, null, .7); g.add(glowSprite('#ff6a2a', 3.4, .9)); face(g, .1, .68, .7); },
  chile(g) { const m = mesh(CONE(), GL('#ff3a3a', .2), g, null, [Math.PI, 0, .3], [.35, 1.3, .35]); OL(m); mesh(CYL(), T('#3fa84a'), g, [-.18, .7, 0], null, [.08, .3, .08]); face(g, .2, .3, .5); },
  dragon(g) { const m = T('#7fd86a'); OL(mesh(SPH(), m, g, [0, 1.6, 0], null, [1.4, 1.2, 1.2])); mesh(SPH(), T('#ffe27a'), g, [0, 1.3, .9], null, [.9, .6, .4]); for (const s of [-1, 1]) mesh(CONE(), T('#ffe27a'), g, [s * .7, 2.8, 0], null, [.2, .6, .2]); face(g, 2, 1.12, 1.1); },
  huevo(g) { OL(mesh(SPH(), T('#ff9a5a'), g, [0, .9, 0], null, [.7, .95, .7])); for (let i = 0; i < 5; i++) mesh(SPHL(), T('#ffe27a'), g, [Math.cos(i * 1.3) * .6, .9 + rnd(-.4, .4), Math.sin(i * 1.3) * .6], null, .14); face(g, 1, .66, .6); },
  caracol(g) { const m = T('#ffd8a8'); mesh(SPH(), m, g, [0, .35, .3], null, [.45, .35, 1.1]); OL(mesh(TOR(), T('#ff9cc8'), g, [0, .9, -.2], [0, 1.57, 0], [.55, .55, .9])); mesh(SPH(), T('#ff9cc8'), g, [0, .9, -.2], null, .45); for (const s of [-1, 1]) mesh(CYL(), m, g, [s * .15, .9, 1.2], null, [.04, .5, .04]); },
  caballito(g) { const m = T('#ffb36b'); OL(mesh(SPH(), m, g, [0, 1, 0], null, [.45, .8, .5])); mesh(SPH(), m, g, [0, 1.8, .25], null, [.35, .35, .5]); mesh(CYL(), m, g, [0, 1.75, .75], [1.57, 0, 0], [.12, .4, .12]); const tl = mesh(geo('tail', () => new THREE.TorusGeometry(.3, .1, 6, 12, 4)), m, g, [0, .2, -.2], [0, 1.57, 0], 1); face(g, 1.9, .6, .5); },
  ballena(g) { const m = T('#8fb8ff'); OL(mesh(SPH(), m, g, [0, 1.3, 0], null, [1.4, 1.1, 2])); mesh(SPH(), T('#e8f4ff'), g, [0, 1, .6], null, [1.1, .7, 1.4]); mesh(CONE(), m, g, [0, 1.6, -2.2], [-1.2, 0, 0], [.8, .9, .2]); face(g, 1.6, 1.85, 1.2); },
  altavoz(g) { OL(mesh(BOX(), T('#6a3f9a'), g, [0, 1, 0], null, [1.2, 2, 1])); for (const y of [.6, 1.5]) { mesh(CYL(), T('#2a1838'), g, [0, y, .5], [1.57, 0, 0], [.4, .05, .4]); mesh(CYL(), GL('#ff9cf0', .6), g, [0, y, .53], [1.57, 0, 0], [.18, .05, .18]); } },
  diana(g) { for (let i = 0; i < 4; i++) mesh(CYL(), T(i % 2 ? '#ffffff' : '#ff4f6a', { rim: 0 }), g, [0, 0, i * .02], [1.57, 0, 0], [1.2 - i * .3, .05, 1.2 - i * .3]); },
  tarta(g) { OL(mesh(CYL(), T('#ffd6ec'), g, [0, .5, 0], null, [1, 1, 1])); mesh(CYL(), T('#ff9cc8'), g, [0, 1.02, 0], null, [1.02, .1, 1.02]); },
  vela(g) { mesh(CYL(), T(pick(['#8fd0ff', '#ffe27a', '#7ee3c4'])), g, [0, .7, 0], null, [.2, 1.4, .2]); const f = mesh(SPHL(), GL('#ffb030', 1), g, [0, 1.55, 0], null, [.13, .22, .13]); { const gs = glowSprite('#ffb030', 1, .8); gs.position.set(0, 1.55, 0); g.add(gs); } },
  arbol(g) { mesh(CYL(), T('#a8784a'), g, [0, 1.5, 0], null, [.3, 3, .3]); for (let i = 0; i < 4; i++) OL(mesh(SPH(), T(pick(['#5fcf7a', '#7fd86a', '#4ab86a'])), g, [rnd(-.8, .8), 3.3 + rnd(0, .8), rnd(-.6, .6)], null, rnd(.9, 1.3)), '#2a6a3a', 1.04); },
  palmera(g) { for (let i = 0; i < 6; i++) mesh(CYL(), T('#c8904a'), g, [i * .12, .5 + i * .9, 0], [0, 0, -.1], [.25, .95, .25]); for (let i = 0; i < 6; i++) mesh(SPH(), T('#5fcf7a'), g, [.7 + Math.cos(i) * 1.1, 5.5, Math.sin(i) * 1.1], [0, -i, .5], [1.4, .12, .4]); for (let i = 0; i < 3; i++) mesh(SPH(), T('#8a5a3a'), g, [.7 + Math.cos(i * 2) * .3, 5.2, Math.sin(i * 2) * .3], null, .25); },
  hongo(g) { B.seta(g); g.scale.setScalar(2.4); },
  cristal(g) { for (let i = 0; i < 4; i++) mesh(geo('oct', () => new THREE.OctahedronGeometry(1, 0)), T(pick(['#bfe8ff', '#c9b2ff', '#ff9cf0']), { opacity: .85, rim: 1, flat: true }), g, [rnd(-.6, .6), 1 + rnd(0, 1), rnd(-.6, .6)], [rnd(-.4, .4), rnd(0, 3), rnd(-.4, .4)], [.4, rnd(1, 1.8), .4]); },
  pino(g) { mesh(CYL(), T('#a8784a'), g, [0, .5, 0], null, [.25, 1, .25]); for (let i = 0; i < 3; i++) OL(mesh(CONE(), T('#3fa86a'), g, [0, 1.4 + i * .9, 0], null, [1.4 - i * .35, 1.5, 1.4 - i * .35]), '#1a5a3a', 1.04); mesh(CONE(), T('#ffffff'), g, [0, 3.7, 0], null, [.35, .5, .35]); },
  volcancito(g) { OL(mesh(geo('vol', () => new THREE.CylinderGeometry(.6, 2, 2.5, 18)), T('#7a4a5a'), g, [0, 1.25, 0]), '#2a1820'); mesh(CYL(), GL('#ff6a2a', .9), g, [0, 2.52, 0], null, [.55, .05, .55]); { const gs = glowSprite('#ff6a2a', 3, .7); gs.position.set(0, 2.8, 0); g.add(gs); } },
};
const cache = {};
export function prop(kind) {
  if (!cache[kind]) { const g = new THREE.Group(); (B[kind] || B.estrella)(g); cache[kind] = g; }
  return cache[kind].clone();
}

// ---------------- mundos ----------------
export const MUNDOS = {
  espacio: { sky: ['#140a36', '#3b2a7a', '#8a5ad0'], fog: '#2a1a5a', ground: '#4a3a8a', alt: '#6a5ab0', line: '#c9b2ff', deco: ['planeta', 'cohete', 'cristal', 'ovni'], stars: true, music: { bpm: 128, root: 57, scale: 'minor' }, sun: 1.6, hemi: ['#c9b2ff', '#4a3a8a'] },
  desierto: { sky: ['#ff9a5a', '#ffd08a', '#fff0c8'], fog: '#ffe0b0', ground: '#f2c27a', alt: '#e8b064', line: '#fff4e0', deco: ['cactus', 'piramide', 'palmera', 'cactus'], music: { bpm: 120, root: 62, scale: 'minor' }, sun: 2.2, hemi: ['#ffffff', '#ffd08a'] },
  nieve: { sky: ['#8fc8ff', '#cfe8ff', '#ffffff'], fog: '#e8f4ff', ground: '#f4faff', alt: '#dceeff', line: '#8fc8ff', deco: ['pino', 'muneco', 'iglu', 'pino'], snow: true, music: { bpm: 132, root: 64, scale: 'major' }, sun: 1.8, hemi: ['#ffffff', '#bfe0ff'] },
  mar: { sky: ['#0a3a6a', '#2a7ab0', '#6ad0e0'], fog: '#2a8ab8', ground: '#f0dca0', alt: '#e0c890', line: '#ffffff', deco: ['coral', 'coral', 'ballena', 'medusa'], bubbles: true, music: { bpm: 116, root: 60, scale: 'major' }, sun: 1.5, hemi: ['#bff4ff', '#2a7ab0'] },
  selva: { sky: ['#5ad08a', '#b0f0a0', '#fff8c0'], fog: '#c8f0b0', ground: '#7fd86a', alt: '#6ac85a', line: '#fff8c0', deco: ['arbol', 'palmera', 'totem', 'hongo'], music: { bpm: 126, root: 60, scale: 'major' }, sun: 2, hemi: ['#ffffff', '#7fd86a'] },
  dulces: { sky: ['#ff9ec7', '#ffd0e6', '#fff0dd'], fog: '#ffe3f1', ground: '#ff9ec7', alt: '#ffb6d6', line: '#ffffff', deco: ['piruleta', 'donut', 'cupcake', 'bastón'], music: { bpm: 140, root: 60, scale: 'major' }, sun: 2, hemi: ['#ffffff', '#ffd6ea'] },
  suenos: { sky: ['#3a2a8a', '#9a7ae0', '#ffc8e8'], fog: '#c8a8f0', ground: '#e8dcff', alt: '#d8c8ff', line: '#ffffff', deco: ['nube', 'luna', 'reloj', 'almohada'], stars: true, music: { bpm: 110, root: 65, scale: 'major' }, sun: 1.6, hemi: ['#ffe8ff', '#9a7ae0'] },
  volcan: { sky: ['#2a0a1a', '#8a2a2a', '#ff8a3a'], fog: '#6a2a2a', ground: '#4a3040', alt: '#5a3848', line: '#ff8a3a', deco: ['volcancito', 'roca', 'cristal', 'volcancito'], embers: true, music: { bpm: 136, root: 55, scale: 'minor' }, sun: 1.4, hemi: ['#ffb08a', '#5a2030'] },
};

// monta cielo, luces, suelo y decorado. area: {track:{z0,z1,half}} o {arena:{r}}
export function buildWorld(E, mk, area) {
  const M = MUNDOS[mk], sc = E.scene;
  sc.fog = new THREE.Fog(M.fog, 55, 190);
  const sky = skyDome(sc, ...M.sky); sky.renderOrder = -1;
  lights(sc, M.hemi[0], M.hemi[1], 1, M.sun);
  // cámara: plano cercano más lejos = sin parpadeos (z-fighting) entre capas del suelo a distancia
  camera.near = .35; camera.updateProjectionMatrix();
  // suelo único con manchas pintadas en colores por vértice (sin capas superpuestas que parpadeen)
  const gg0 = new THREE.PlaneGeometry(800, 800, 80, 80); gg0.rotateX(-Math.PI / 2);
  { const P = gg0.attributes.position, c = [], A = new THREE.Color(M.ground), Bc = new THREE.Color(M.alt), t = new THREE.Color();
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i); const n = Math.sin(x * .07) * Math.cos(z * .05) + Math.sin((x + z) * .023) * .8 + Math.sin(x * .19 - z * .13) * .3; t.copy(A).lerp(Bc, n > .45 ? 1 : n > .2 ? (n - .2) / .25 : 0); c.push(t.r, t.g, t.b); }
    gg0.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); }
  const ground = mesh(gg0, toon('#ffffff', { rim: 0, vc: true }), sc, [0, -.05, 0]); ground.receiveShadow = true;
  const spots = new THREE.Group(); sc.add(spots);
  const deco = [];
  const rich = richDecor(sc, mk, area, M);
  const amb2 = area.noAmb ? null : ambiente(E, mk, area);
  // partículas ambientales (estrellas, nieve, burbujas, chispas)
  let amb = null;
  if (M.stars || M.snow || M.bubbles || M.embers) {
    const n = 260, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = rnd(-60, 60); pos[i * 3 + 1] = rnd(M.stars ? 20 : 0, M.stars ? 120 : 30); pos[i * 3 + 2] = rnd(-200, 30); }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    amb = new THREE.Points(gg, new THREE.PointsMaterial({ color: M.embers ? '#ffb030' : M.bubbles ? '#e0ffff' : '#ffffff', size: M.stars ? .9 : .45, transparent: true, opacity: .85, fog: !M.stars, depthWrite: false }));
    amb.userData.kind = M.snow ? 'snow' : M.bubbles ? 'bub' : M.embers ? 'emb' : 'star'; amb.frustumCulled = false; sc.add(amb);
  }
  return { sky, ground, spots, deco, amb, M, rich, T: 0,
    tick(dt, cam) { this.T += dt; rich.tick(this.T, cam.position.z); if (amb2) amb2.tick(this.T, dt); rich.astro.position.set(cam.position.x + 60, 70, cam.position.z - 230); sky.position.copy(cam.position); if (amb && amb.userData.kind !== 'star') { const p = amb.geometry.attributes.position, k = amb.userData.kind; for (let i = 0; i < p.count; i++) { let y = p.getY(i) + (k === 'snow' ? -2.5 : 2) * dt; if (y < 0) y = 30; if (y > 30) y = 0; p.setY(i, y); } p.needsUpdate = true; amb.position.z = cam.position.z * .0; } } };
}

// arco de salida/meta con letrero
export function textTex(txt, bg, fg, w = 1024, h = 160, fs = 100) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d');
  x.fillStyle = bg; x.beginPath(); x.roundRect(4, 4, w - 8, h - 8, 30); x.fill(); x.font = `700 ${fs}px Fredoka`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 10; x.strokeStyle = 'rgba(80,30,90,.55)'; x.strokeText(txt, w / 2, h / 2 + 4); x.fillStyle = fg; x.fillText(txt, w / 2, h / 2 + 4);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function arch(sc, z, half, txt, color) {
  const g = new THREE.Group(); g.position.z = z; sc.add(g);
  for (const s of [-1, 1]) { OL(mesh(CYL(), T('#ffffff'), g, [s * (half + .6), 3.4, 0], null, [.35, 6.8, .35])); mesh(SPH(), GL(color, .3), g, [s * (half + .6), 7, 0], null, .7); }
  mesh(new THREE.PlaneGeometry(half * 2 + 1.4, 1.6), new THREE.MeshBasicMaterial({ map: textTex(txt, color, '#fff'), side: THREE.DoubleSide }), g, [0, 6, 0]);
  return g;
}
