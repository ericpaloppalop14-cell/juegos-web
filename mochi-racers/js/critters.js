// ======================================================================
//  MOCHI RACERS v10 · personajes-obstáculo surrealistas
//  Bonitos y detallados pero lentos y fáciles de esquivar.
//  Geometría y materiales compartidos entre todos los ejemplares.
// ======================================================================
import * as THREE from 'three';
import { toon, mesh, outline } from './gfx.js';

const G = {}; const geo = (n, f) => { if (!G[n]) { G[n] = f(); G[n]._shared = true; } return G[n]; };
const sph = s => geo('cs' + s, () => new THREE.SphereGeometry(1, s, Math.max(6, s * 0.7 | 0)));
const cyl = s => geo('cc' + s, () => new THREE.CylinderGeometry(1, 1, 1, s));
const cone = s => geo('cn' + s, () => new THREE.ConeGeometry(1, 1, s));
const tor = () => geo('ct', () => new THREE.TorusGeometry(1, 0.18, 8, 24));
const box = () => geo('cb', () => new THREE.BoxGeometry(1, 1, 1));
const INK = '#3a2050';
function eye(parent, x, y, z, s = 0.32, look = 1) {
  const e = mesh(sph(14), toon('#ffffff', { rim: 0.2 }), parent, [x, y, z], null, s); outline(e, INK, 1.08);
  const p = mesh(sph(10), toon('#2a1838', { rim: 0 }), e, [0, -0.05, 0.62 * look], null, 0.55);
  mesh(sph(6), toon('#ffffff', { rim: 0 }), p, [0.35, 0.4, 0.6], null, 0.35);
  return e;
}
export const CRITTER_NAMES = ['Seta Zancuda', 'Ojo Medusa', 'Pez Paraguas', 'Nube Bigotuda', 'Caracol Castillo', 'Cactus Bailarín'];

export function makeCritter(n, g) {
  const u = { legs: [], arms: [], sway: [] }; let r = 1.5, hover = 0;
  if (n === 0) { // Seta Zancuda: sombrero de seta con lunares sobre patas larguísimas
    const body = new THREE.Group(); body.position.y = 3.0; g.add(body); u.body = body;
    const cap = mesh(geo('capH', () => new THREE.SphereGeometry(1, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2)), toon('#ff6f9a', { rim: 0.6 }), body, [0, 0.35, 0], null, [1.7, 1.2, 1.7]); outline(cap, '#8a2050', 1.04);
    for (let i = 0; i < 7; i++) { const a = i * 0.9, h = 0.3 + (i % 3) * 0.28; mesh(sph(8), toon('#fff6e8'), cap, [Math.cos(a) * Math.cos(h) * 0.99, Math.sin(h) * 0.99, Math.sin(a) * Math.cos(h) * 0.99], null, [0.2, 0.2, 0.2]); }
    const stem = mesh(cyl(16), toon('#fff1dc'), body, [0, -0.15, 0], null, [0.95, 1.0, 0.95]); outline(stem, INK, 1.04);
    eye(body, -0.38, -0.05, 0.85, 0.28); eye(body, 0.38, -0.05, 0.85, 0.28);
    mesh(sph(8), toon('#ff9ec7', { rim: 0 }), body, [-0.7, -0.35, 0.68], null, [0.18, 0.1, 0.05]); mesh(sph(8), toon('#ff9ec7', { rim: 0 }), body, [0.7, -0.35, 0.68], null, [0.18, 0.1, 0.05]);
    for (const s of [-1, 1]) { const L = new THREE.Group(); L.position.set(s * 0.45, 2.4, 0); g.add(L); mesh(cyl(8), toon('#ffb3d6'), L, [0, -1.2, 0], null, [0.12, 2.4, 0.12]); const f = mesh(sph(10), toon('#8a5cc2'), L, [0, -2.4, 0.2], null, [0.32, 0.18, 0.5]); outline(f, INK, 1.1); u.legs.push([L, s]); }
    r = 1.7;
  } else if (n === 1) { // Ojo Medusa: un ojo gigante que flota con tentáculos de gelatina
    hover = 1.6; const body = new THREE.Group(); g.add(body); u.body = body;
    const ball = mesh(sph(22), toon('#ffffff', { rim: 0.5 }), body, [0, 1.4, 0], null, 1.3); outline(ball, INK, 1.04);
    for (let i = 0; i < 5; i++) { const a = i * 1.25; const v = mesh(cyl(4), toon('#ff8fb0', { rim: 0 }), ball, [Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0.7], [Math.PI / 2 + Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6], [0.025, 0.7, 0.025]); }
    const iris = mesh(sph(16), toon('#7fd8ff', { emissive: '#3fa8ff', ei: 0.25 }), ball, [0, 0, 0.82], null, [0.5, 0.5, 0.25]);
    mesh(sph(12), toon('#1a1030', { rim: 0 }), iris, [0, 0, 0.8], null, [0.5, 0.5, 0.4]); mesh(sph(6), toon('#ffffff', { rim: 0 }), iris, [0.3, 0.35, 1], null, 0.22);
    u.iris = iris;
    const lid = mesh(geo('lid', () => new THREE.SphereGeometry(1.06, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), toon('#c8a8ff', { rim: 0.4 }), ball, [0, 0, 0], [-0.9, 0, 0]); u.lid = lid;
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; const t = new THREE.Group(); t.position.set(Math.cos(a) * 0.8, 0.4, Math.sin(a) * 0.8); body.add(t); mesh(cone(8), toon('#c8a8ff', { opacity: 0.8, rim: 0.8 }), t, [0, -0.6, 0], [Math.PI, 0, 0], [0.22, 1.3, 0.22]); u.sway.push([t, i]); }
    r = 1.5;
  } else if (n === 2) { // Pez Paraguas: un pez de pie con bombín y paraguas
    const body = new THREE.Group(); body.position.y = 1.5; g.add(body); u.body = body;
    const b = mesh(sph(20), toon('#ffb36b', { rim: 0.6 }), body, [0, 0.4, 0], null, [0.9, 1.3, 0.75]); outline(b, '#8a4a2a', 1.04);
    mesh(sph(16), toon('#fff1dc'), body, [0, 0.2, 0.28], null, [0.6, 0.9, 0.55]);
    for (let i = 0; i < 3; i++) mesh(geo('scale', () => new THREE.SphereGeometry(1, 10, 6, 0, Math.PI)), toon('#ff8f5f'), b, [0, 0.3 - i * 0.3, -0.85], [0, Math.PI, 0], [0.3, 0.2, 0.15]);
    eye(body, -0.32, 0.95, 0.55, 0.24); eye(body, 0.32, 0.95, 0.55, 0.24);
    mesh(tor(), toon('#ff6f9a'), body, [0, 0.55, 0.68], [0, 0, 0], [0.16, 0.1, 0.1]);
    const tail = mesh(cone(8), toon('#ff8f5f'), body, [0, -0.2, -1.0], [-Math.PI / 2, 0, 0], [0.5, 0.7, 0.18]); u.tail = tail;
    const hat = new THREE.Group(); hat.position.set(0, 1.75, 0); body.add(hat); mesh(cyl(18), toon('#3a2050'), hat, [0, 0, 0], null, [0.85, 0.08, 0.85]); mesh(sph(16), toon('#3a2050'), hat, [0, 0.12, 0], null, [0.5, 0.42, 0.5]); mesh(cyl(18), toon('#ff6f9a'), hat, [0, 0.08, 0], null, [0.52, 0.12, 0.52]);
    const umb = new THREE.Group(); umb.position.set(0.95, 0.4, 0); body.add(umb); u.umb = umb;
    mesh(cyl(6), toon('#5a3a6e'), umb, [0, 0.9, 0], null, [0.04, 1.9, 0.04]);
    const can = mesh(geo('canopy', () => new THREE.ConeGeometry(1, 0.5, 8, 1, true)), toon('#7ee3c4', { side: THREE.DoubleSide, rim: 0.4 }), umb, [0, 1.95, 0], null, [1.1, 1, 1.1]); outline(can, INK, 1.04);
    for (const s of [-1, 1]) { const L = new THREE.Group(); L.position.set(s * 0.35, 1.0, 0); g.add(L); mesh(cyl(8), toon('#ffb36b'), L, [0, -0.5, 0], null, [0.1, 1.0, 0.1]); mesh(sph(10), toon('#3a2050'), L, [0, -1.0, 0.15], null, [0.22, 0.12, 0.35]); u.legs.push([L, s]); }
    r = 1.4;
  } else if (n === 3) { // Nube Bigotuda: una nube con bigote que llueve caramelos
    hover = 1.3; const body = new THREE.Group(); g.add(body); u.body = body;
    const cm = toon('#ffffff', { rim: 0.8, emissive: '#d8e6ff', ei: 0.1 });
    for (const [x, y, z, s] of [[0, 1.5, 0, 1.1], [-1.0, 1.2, 0, 0.8], [1.0, 1.25, 0, 0.85], [-0.4, 2.1, -0.1, 0.75], [0.5, 2.0, -0.1, 0.7], [0, 1.1, 0.4, 0.8]]) { const c = mesh(sph(16), cm, body, [x, y, z], null, s); outline(c, '#9aa8d8', 1.04); }
    eye(body, -0.38, 1.7, 1.0, 0.22); eye(body, 0.38, 1.7, 1.0, 0.22);
    for (const s of [-1, 1]) { const m = mesh(geo('stache', () => new THREE.TorusGeometry(0.4, 0.13, 8, 16, Math.PI)), toon('#5a3a2a'), body, [s * 0.38, 1.3, 1.12], [0, 0, s > 0 ? Math.PI * 0.9 : Math.PI * 0.1]); u.arms.push([m, s]); }
    u.drops = []; for (let i = 0; i < 6; i++) { const d = mesh(sph(8), toon(['#ff8fd8', '#7ff5ff', '#ffe066'][i % 3], { emissive: '#ffffff', ei: 0.2 }), body, [(i % 3 - 1) * 0.6, 0.5, (i >> 1) * 0.2 - 0.2], null, [0.12, 0.2, 0.12]); u.drops.push([d, i]); }
    r = 1.6;
  } else if (n === 4) { // Caracol Castillo: caracol de gelatina con un castillo de concha
    const body = new THREE.Group(); g.add(body); u.body = body;
    const foot = mesh(sph(18), toon('#9dff7a', { opacity: 0.85, rim: 0.9 }), body, [0, 0.35, 0.2], null, [0.8, 0.4, 1.9]); outline(foot, '#3a8a4a', 1.04);
    const neck = mesh(cyl(12), toon('#9dff7a', { opacity: 0.85, rim: 0.9 }), body, [0, 1.0, 1.5], [0.3, 0, 0], [0.45, 1.3, 0.45]);
    for (const s of [-1, 1]) { const st = mesh(cyl(6), toon('#7ee36a'), body, [s * 0.2, 2.0, 1.75], [0.2, 0, s * 0.3], [0.05, 0.7, 0.05]); eye(body, s * 0.3, 2.4, 1.85, 0.2); }
    const sh = new THREE.Group(); sh.position.set(0, 1.4, -0.4); body.add(sh); u.shell = sh;
    const tw = mesh(cyl(16), toon('#ffe2b8', { rim: 0.5 }), sh, [0, 0, 0], null, [0.95, 1.6, 0.95]); outline(tw, '#8a5a3a', 1.04);
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; mesh(box(), toon('#ffe2b8'), sh, [Math.cos(a) * 0.8, 0.9, Math.sin(a) * 0.8], [0, -a, 0], [0.28, 0.3, 0.2]); }
    mesh(cone(16), toon('#8b5cc2', { rim: 0.5 }), sh, [0, 1.55, 0], null, [1.05, 1.2, 1.05]);
    const fl = mesh(box(), toon('#ff6f9a', { side: THREE.DoubleSide }), sh, [0.25, 2.55, 0], null, [0.5, 0.3, 0.02]); u.flag = fl; mesh(cyl(6), toon('#5a3a6e'), sh, [0, 2.4, 0], null, [0.03, 0.6, 0.03]);
    for (const [y, a] of [[0.1, 0.5], [0.4, 2.2], [-0.3, 4]]) mesh(box(), toon('#5a3a6e'), sh, [Math.cos(a) * 0.95, y, Math.sin(a) * 0.95], [0, -a + Math.PI / 2, 0], [0.22, 0.32, 0.05]);
    r = 1.6;
  } else { // Cactus Bailarín: cactus de algodón de azúcar con tutú y flor
    const body = new THREE.Group(); g.add(body); u.body = body;
    const cm = toon('#7ee3c4', { rim: 0.6 });
    const t = mesh(geo('cactus', () => new THREE.CapsuleGeometry(0.75, 1.9, 6, 14)), cm, body, [0, 1.75, 0]); outline(t, '#2a7a5a', 1.04);
    for (let i = 0; i < 10; i++) { const a = i * 2.4, y = 1.0 + (i % 5) * 0.4; mesh(cone(4), toon('#fff6e8'), t, [Math.cos(a) * 0.76, y - 1.75, Math.sin(a) * 0.76], [0, 0, Math.PI / 2], [0.05, 0.22, 0.05]).lookAt(Math.cos(a) * 3, y - 1.75, Math.sin(a) * 3); }
    for (const s of [-1, 1]) { const A = new THREE.Group(); A.position.set(s * 0.7, 2.0, 0); body.add(A); mesh(geo('carm', () => new THREE.CapsuleGeometry(0.28, 0.7, 4, 10)), cm, A, [s * 0.45, 0.35, 0], [0, 0, -s * 0.4]); u.arms.push([A, s]); }
    const tutu = mesh(geo('tutu', () => new THREE.ConeGeometry(1.25, 0.6, 18, 1, true)), toon('#ff9ec7', { side: THREE.DoubleSide, rim: 0.7, opacity: 0.92 }), body, [0, 1.05, 0], [Math.PI, 0, 0]); outline(tutu, '#a03060', 1.03);
    for (let i = 0; i < 6; i++) mesh(sph(8), toon(i % 2 ? '#ff6f9a' : '#ffe066'), body, [Math.cos(i * 1.047) * 0.28, 3.55, Math.sin(i * 1.047) * 0.28], null, 0.22);
    mesh(sph(8), toon('#ffffff'), body, [0, 3.6, 0], null, 0.18);
    eye(body, -0.3, 2.3, 0.65, 0.22); eye(body, 0.3, 2.3, 0.65, 0.22);
    mesh(tor(), toon('#a03060'), body, [0, 1.9, 0.72], null, [0.14, 0.09, 0.09]);
    r = 1.4;
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { u, r, hover };
}
// animación por fotograma (t = tiempo, ph = fase propia)
export function animCritter(n, u, t, ph) {
  const w = t * 4 + ph;
  for (const [L, s] of u.legs) L.rotation.x = Math.sin(w * (n === 0 ? 1 : 2) + (s > 0 ? Math.PI : 0)) * 0.5;
  if (n === 0) { u.body.position.y = 3.0 + Math.abs(Math.sin(w)) * 0.25; u.body.rotation.z = Math.sin(w) * 0.08; }
  if (n === 1) { u.body.position.y = Math.sin(t * 2 + ph) * 0.35; u.iris.position.x = Math.sin(t * 0.9 + ph) * 0.18; const bl = ((t + ph) % 3.2) > 3.05; u.lid.rotation.x = bl ? -0.05 : -0.9; for (const [tt, i] of u.sway) tt.rotation.set(Math.sin(t * 3 + i) * 0.35, 0, Math.cos(t * 3 + i) * 0.35); }
  if (n === 2) { u.body.position.y = 1.5 + Math.abs(Math.sin(w * 2)) * 0.12; u.tail.rotation.y = Math.sin(t * 8) * 0.5; u.umb.rotation.z = Math.sin(t * 1.5 + ph) * 0.2; }
  if (n === 3) { u.body.rotation.z = Math.sin(t * 1.6 + ph) * 0.1; for (const [m, s] of u.arms) m.rotation.x = Math.sin(t * 6) * 0.2; for (const [d, i] of u.drops) { const f = ((t * 0.9 + i * 0.17) % 1); d.position.y = 0.9 - f * 2.2; d.visible = f < 0.8; } }
  if (n === 4) { u.body.scale.z = 1 + Math.sin(t * 3 + ph) * 0.06; u.flag.rotation.y = Math.sin(t * 6) * 0.4; u.shell.rotation.z = Math.sin(t * 3 + ph) * 0.04; }
  if (n === 5) { u.body.rotation.y = Math.sin(t * 1.4 + ph) * 0.9; u.body.position.y = Math.abs(Math.sin(w)) * 0.3; for (const [A, s] of u.arms) A.rotation.z = Math.sin(w * 1.5 + s) * 0.6; }
}
