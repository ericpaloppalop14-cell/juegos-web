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
export const CRITTER_NAMES = ['Seta Zancuda', 'Ojo Medusa', 'Pez Paraguas', 'Nube Bigotuda', 'Caracol Castillo', 'Cactus Bailarín', 'Pulpo Sombrerero', 'Huevo Patinador', 'Calcetín Serpiente', 'Luna Mecedora', 'Elefante Globo'];
export const CRITTER_COUNT = CRITTER_NAMES.length;
function smile(parent, x, y, z, s = 0.3, col = '#3a2050') { return mesh(geo('smile', () => new THREE.TorusGeometry(1, 0.22, 6, 14, Math.PI)), toon(col, { rim: 0 }), parent, [x, y, z], [0, 0, Math.PI], s); }

export function makeCritter(n, g) {
  const u = { legs: [], arms: [], sway: [] }; let r = 1.5, hover = 0;
  if (n === 0) { // Seta Zancuda v13: sombrero con láminas y lunares, cejas, boca, pajarita, brazos con guantes y piernas con rodilla, calcetines y zapatones
    const body = new THREE.Group(); body.position.y = 3.0; g.add(body); u.body = body;
    const capG = new THREE.Group(); capG.position.y = 0.35; body.add(capG); u.cap = capG;
    const cap = mesh(geo('capH', () => new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)), toon('#ff5f8f', { rim: 0.7 }), capG, [0, 0, 0], null, [1.75, 1.25, 1.75]); outline(cap, '#8a2050', 1.04);
    mesh(geo('capRim', () => new THREE.TorusGeometry(1, 0.12, 8, 28)), toon('#ff8fb0'), capG, [0, 0.02, 0], [Math.PI / 2, 0, 0], [1.72, 1.72, 1.2]);
    mesh(geo('gills', () => new THREE.ConeGeometry(1, 0.35, 28, 1, true)), toon('#ffe2c8', { side: THREE.DoubleSide, rim: 0 }), capG, [0, -0.15, 0], null, [1.7, 1, 1.7]);
    for (let i = 0; i < 12; i++) { const a = i * 2.4, h = 0.22 + (i % 4) * 0.33, sz = 0.2 + (i % 3) * 0.07; const P = new THREE.Vector3(Math.cos(a) * Math.cos(h) * 1.75, Math.sin(h) * 1.25, Math.sin(a) * Math.cos(h) * 1.75); const d = mesh(sph(12), toon('#fff6e8', { rim: 0.3 }), capG, [P.x, P.y, P.z], null, [sz, sz, 0.05]); d.lookAt(P.x * 2 / 1.75, P.y * 2 / 1.25 + 0.35, P.z * 2 / 1.75); }
    const sprout = new THREE.Group(); sprout.position.set(0.2, 1.25, 0); capG.add(sprout); mesh(cyl(8), toon('#fff1dc'), sprout, [0, 0.12, 0], null, [0.07, 0.25, 0.07]); mesh(geo('capS', () => new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2)), toon('#ffe066'), sprout, [0, 0.24, 0], null, [0.22, 0.16, 0.22]); u.sprout = sprout;
    const stem = mesh(geo('stemL', () => new THREE.LatheGeometry([[0.01, -0.75], [0.8, -0.72], [0.98, -0.4], [0.95, 0.1], [0.8, 0.4], [0.01, 0.42]].map(([r2, y]) => new THREE.Vector2(r2, y)), 20)), toon('#fff1dc', { rim: 0.4 }), body, [0, -0.15, 0]); outline(stem, INK, 1.04);
    eye(body, -0.36, 0.0, 0.86, 0.3); eye(body, 0.36, 0.0, 0.86, 0.3);
    for (const sd of [-1, 1]) { const br = mesh(box(), toon('#5a3a2a', { rim: 0 }), body, [sd * 0.38, 0.38, 0.9], [0, 0, sd * -0.25], [0.32, 0.07, 0.06]); (u.brows ||= []).push([br, sd]); }
    smile(body, 0, -0.38, 0.92, 0.17); mesh(sph(8), toon('#ff6f8f', { rim: 0 }), body, [0, -0.45, 0.9], null, [0.1, 0.07, 0.05]);
    for (const sd of [-1, 1]) mesh(sph(8), toon('#ff9ec7', { rim: 0 }), body, [sd * 0.68, -0.28, 0.66], null, [0.18, 0.1, 0.05]);
    const bow = new THREE.Group(); bow.position.set(0, -0.7, 0.82); body.add(bow); for (const sd of [-1, 1]) mesh(cone(10), toon('#7a5cff', { rim: 0.4 }), bow, [sd * 0.17, 0, 0], [0, 0, sd * Math.PI / 2], [0.16, 0.3, 0.1]); mesh(sph(8), toon('#ffe066'), bow, [0, 0, 0.03], null, 0.08);
    for (const sd of [-1, 1]) { const A = new THREE.Group(); A.position.set(sd * 0.9, -0.3, 0.1); body.add(A); mesh(cyl(6), toon('#fff1dc'), A, [sd * 0.16, -0.22, 0.05], [0, 0, sd * 0.6], [0.07, 0.45, 0.07]); const gl = mesh(sph(10), toon('#ffffff', { rim: 0.4 }), A, [sd * 0.3, -0.42, 0.08], null, 0.15); outline(gl, INK, 1.12); u.arms.push([A, sd]); }
    for (const sd of [-1, 1]) { const L = new THREE.Group(); L.position.set(sd * 0.42, 2.3, 0); g.add(L);
      mesh(cyl(8), toon('#ffb3d6'), L, [0, -0.55, 0], null, [0.11, 1.1, 0.11]);
      const kn = new THREE.Group(); kn.position.y = -1.1; L.add(kn); mesh(sph(8), toon('#ffb3d6'), kn, [0, 0, 0], null, 0.16);
      mesh(cyl(8), toon('#ffffff'), kn, [0, -0.55, 0], null, [0.12, 1.1, 0.12]); for (let j = 0; j < 3; j++) mesh(cyl(8), toon('#7a5cff'), kn, [0, -0.35 - j * 0.28, 0], null, [0.13, 0.1, 0.13]);
      const shoe = mesh(sph(12), toon('#ff6f3a', { rim: 0.4 }), kn, [0, -1.15, 0.2], null, [0.3, 0.2, 0.5]); outline(shoe, INK, 1.1); mesh(sph(6), toon('#ffffff', { rim: 0 }), kn, [0, -1.02, 0.42], null, [0.18, 0.05, 0.12]);
      u.legs.push([L, sd]); (u.knees ||= []).push([kn, sd]); }
    r = 1.6;
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
  } else if (n === 6) { // Pulpo Sombrerero: pulpo de gelatina con una torre de chisteras que se tambalea
    const body = new THREE.Group(); g.add(body); u.body = body;
    const head = mesh(sph(20), toon('#c08cff', { opacity: 0.92, rim: 0.8 }), body, [0, 1.35, 0], null, [1.0, 1.05, 0.95]); outline(head, '#5a2a8a', 1.04);
    for (let i = 0; i < 9; i++) mesh(sph(6), toon('#e8d0ff', { rim: 0 }), head, [Math.cos(i * 0.7) * 0.8, 0.2 + (i % 3) * 0.2, Math.sin(i * 0.7) * 0.6 + 0.05], null, 0.1);
    eye(body, -0.33, 1.45, 0.8, 0.26); eye(body, 0.33, 1.45, 0.8, 0.26); smile(body, 0, 1.0, 0.92, 0.15);
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; const t = new THREE.Group(); t.position.set(Math.cos(a) * 0.6, 0.55, Math.sin(a) * 0.6); t.rotation.y = -a; body.add(t); mesh(geo('tent', () => new THREE.CapsuleGeometry(0.13, 0.7, 4, 8)), toon('#b07cf0', { rim: 0.5 }), t, [0.25, -0.25, 0], [0, 0, 1.1]); u.sway.push([t, i]); }
    const hats = new THREE.Group(); hats.position.y = 2.3; body.add(hats); u.hats = hats;
    for (let j = 0; j < 3; j++) { const H = new THREE.Group(); H.position.set(0, j * 0.62, 0); H.rotation.z = (j - 1) * 0.12; hats.add(H); mesh(cyl(16), toon('#2a1838'), H, [0, 0, 0], null, [0.7 - j * 0.1, 0.07, 0.7 - j * 0.1]); mesh(cyl(16), toon('#2a1838'), H, [0, 0.27, 0], null, [0.45 - j * 0.07, 0.5, 0.45 - j * 0.07]); mesh(cyl(16), toon(['#ff6f9a', '#ffe066', '#7ee3c4'][j]), H, [0, 0.08, 0], null, [0.47 - j * 0.07, 0.1, 0.47 - j * 0.07]); }
    r = 1.4;
  } else if (n === 7) { // Huevo Patinador: un huevo frito sobre patines que se desliza muy bajito
    const body = new THREE.Group(); g.add(body); u.body = body;
    const white = mesh(geo('eggW', () => new THREE.CylinderGeometry(1, 1.05, 0.22, 18)), toon('#ffffff', { rim: 0.5 }), body, [0, 0.55, 0], null, [1.25, 1, 1.0]); outline(white, '#c8b8d8', 1.04);
    for (let i = 0; i < 5; i++) mesh(sph(10), toon('#ffffff', { rim: 0.4 }), body, [Math.cos(i * 1.3) * 1.2, 0.55, Math.sin(i * 1.3) * 0.95], null, [0.45, 0.12, 0.4]);
    const yolk = mesh(geo('yolk', () => new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2)), toon('#ffb21a', { rim: 0.7, emissive: '#ff9a00', ei: 0.12 }), body, [0, 0.66, 0.1], null, [0.6, 0.5, 0.6]); u.yolk = yolk;
    mesh(sph(6), toon('#ffffff', { rim: 0 }), yolk, [0.35, 0.65, 0.3], null, 0.15);
    eye(body, -0.2, 1.0, 0.55, 0.15); eye(body, 0.2, 1.0, 0.55, 0.15); smile(body, 0, 0.82, 0.68, 0.08);
    for (const sd of [-1, 1]) { const sk = new THREE.Group(); sk.position.set(sd * 0.55, 0.22, 0); body.add(sk); mesh(box(), toon('#ff6f9a', { rim: 0.4 }), sk, [0, 0.1, 0], null, [0.3, 0.18, 0.75]); for (const z of [-0.25, 0.25]) mesh(cyl(10), toon('#7ff5ff', { emissive: '#7ff5ff', ei: 0.4 }), sk, [0, -0.07, z], [0, 0, Math.PI / 2], [0.1, 0.32, 0.1]); u.legs.push([sk, sd]); }
    r = 1.4;
  } else if (n === 8) { // Calcetín Serpiente: calcetín de rayas que repta en S con un solo ojo y lengua
    const body = new THREE.Group(); g.add(body); u.body = body; u.segs = [];
    const cols = ['#ff6f9a', '#ffffff', '#7ee3c4', '#ffffff', '#ffe066', '#ffffff', '#b9a2f7'];
    for (let i = 0; i < 7; i++) { const sg = mesh(sph(14), toon(cols[i], { rim: 0.4 }), body, [0, 0.42, -i * 0.5 + 1.2], null, [0.42 - i * 0.025, 0.4 - i * 0.02, 0.42]); if (i === 0) outline(sg, INK, 1.06); u.segs.push(sg); }
    const heel = mesh(sph(14), toon('#ff6f9a', { rim: 0.4 }), body, [0, 0.42, 1.65], null, [0.42, 0.38, 0.5]);
    eye(heel, 0, 0.9, 0.4, 0.5); u.tongue = mesh(cone(6), toon('#ff3a6a', { rim: 0 }), heel, [0, -0.2, 1.05], [Math.PI / 2, 0, 0], [0.12, 0.6, 0.06]);
    r = 1.3;
  } else if (n === 9) { // Luna Mecedora: luna creciente con gorro de dormir que se mece flotando y suelta "Zzz"
    hover = 1.4; const body = new THREE.Group(); g.add(body); u.body = body;
    const moon = mesh(geo('moon', () => new THREE.TorusGeometry(0.95, 0.42, 12, 24, Math.PI * 1.2)), toon('#fff1a8', { rim: 0.7, emissive: '#ffe066', ei: 0.18 }), body, [0, 1.4, 0], [0, 0, -Math.PI * 0.1]); outline(moon, '#a08a3a', 1.04); u.moon = moon;
    const cap = mesh(cone(14), toon('#5f8bff', { rim: 0.4 }), moon, [0.25, 1.05, 0], [0, 0, -0.6], [0.4, 0.95, 0.4]); mesh(sph(8), toon('#ffffff'), cap, [0, 0.55, 0], null, [0.45, 0.2, 0.45]);
    for (const sd of [-1, 1]) mesh(geo('lash', () => new THREE.TorusGeometry(0.12, 0.03, 4, 8, Math.PI)), toon('#3a2050', { rim: 0 }), moon, [0.95 + sd * 0.0, 0.15 + sd * 0.18, 0.35], [0, 0, Math.PI]);
    u.zz = []; for (let i = 0; i < 3; i++) { const z = mesh(geo('zz', () => new THREE.TorusGeometry(0.18, 0.05, 4, 4)), toon('#ffffff', { emissive: '#ffffff', ei: 0.3 }), body, [0.8, 2.2, 0], [0, 0, Math.PI / 4]); u.zz.push([z, i]); }
    r = 1.4;
  } else if (n === 10) { // Elefante Globo: elefante de globo retorcido que flota bajito agitando la trompa
    hover = 0.6; const body = new THREE.Group(); g.add(body); u.body = body;
    const bm = toon('#7fd8ff', { rim: 0.9, emissive: '#bff0ff', ei: 0.1 });
    const torso = mesh(geo('balT', () => new THREE.CapsuleGeometry(0.55, 0.9, 6, 14)), bm, body, [0, 1.3, -0.2], [Math.PI / 2, 0, 0]); outline(torso, '#3a7aa8', 1.04);
    const hd = mesh(sph(16), bm, body, [0, 1.6, 0.75], null, 0.6); outline(hd, '#3a7aa8', 1.05);
    for (const sd of [-1, 1]) { mesh(sph(14), bm, hd, [sd * 1.0, 0.1, -0.2], null, [0.5, 0.75, 0.2]); eye(hd, sd * 0.38, 0.25, 0.85, 0.28); }
    const trunk = new THREE.Group(); trunk.position.set(0, 1.45, 1.2); body.add(trunk); u.trunk = trunk; for (let j = 0; j < 3; j++) mesh(sph(10), bm, trunk, [0, -j * 0.25, j * 0.18], null, [0.2, 0.22, 0.2]);
    for (const [x, z] of [[-0.35, 0.2], [0.35, 0.2], [-0.35, -0.6], [0.35, -0.6]]) { const L = new THREE.Group(); L.position.set(x, 0.95, z); body.add(L); mesh(geo('balL', () => new THREE.CapsuleGeometry(0.17, 0.45, 4, 8)), bm, L, [0, -0.3, 0]); u.legs.push([L, x > 0 ? 1 : -1]); }
    mesh(sph(6), toon('#3a7aa8'), body, [0, 1.35, -1.05], null, [0.12, 0.12, 0.2]);
    r = 1.5;
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
  for (const [L, s] of u.legs) L.rotation.x = Math.sin(w * (n === 0 ? 1 : 2) + (s > 0 ? Math.PI : 0)) * (n === 7 ? 0.25 : 0.5);
  if (n === 0) { const st = Math.sin(w); u.body.position.y = 2.95 + Math.abs(st) * 0.28; u.body.rotation.z = st * 0.08; u.cap.rotation.z = -st * 0.1; u.cap.scale.y = 1 + Math.abs(Math.cos(w)) * 0.06;
    for (const [kn, s] of u.knees) kn.rotation.x = Math.max(0, -Math.sin(w + (s > 0 ? Math.PI : 0))) * 0.9;
    for (const [A, s] of u.arms) A.rotation.z = s * (0.3 + Math.sin(w + (s > 0 ? 0 : Math.PI)) * 0.5); u.sprout.rotation.z = Math.sin(t * 7 + ph) * 0.3;
    const surpr = ((t + ph) % 5) < 0.6; for (const [b, s] of u.brows) b.position.y = surpr ? 0.5 : 0.38; }
  if (n === 6) { for (const [tt, i] of u.sway) tt.rotation.z = Math.sin(t * 5 + i * 0.8) * 0.4; u.hats.children.forEach((H, j) => { H.rotation.z = Math.sin(t * 2.4 + j * 0.9 + ph) * 0.12 * (j + 1); H.position.x = Math.sin(t * 2.4 + j) * 0.06 * j; }); u.body.position.y = Math.abs(Math.sin(t * 2.5 + ph)) * 0.18; }
  if (n === 7) { u.body.rotation.z = Math.sin(t * 2 + ph) * 0.12; u.yolk.scale.y = 0.5 + Math.sin(t * 6) * 0.05; }
  if (n === 8) { u.segs.forEach((sg, i) => { sg.position.x = Math.sin(t * 5 - i * 0.7 + ph) * 0.35; sg.position.y = 0.42 + Math.max(0, Math.sin(t * 5 - i * 0.7)) * 0.08; }); u.tongue.scale.y = ((t * 3 + ph) % 1) < 0.3 ? 0.6 : 0.01; }
  if (n === 9) { u.body.rotation.z = Math.sin(t * 1.6 + ph) * 0.35; u.body.position.y = Math.sin(t * 1.1 + ph) * 0.25; for (const [z, i] of u.zz) { const f = (t * 0.5 + i / 3) % 1; z.position.set(0.8 + f * 0.6, 2.0 + f * 1.4, 0); z.scale.setScalar(0.5 + f); z.visible = f < 0.9; } }
  if (n === 10) { u.body.position.y = Math.sin(t * 1.7 + ph) * 0.3; u.body.rotation.z = Math.sin(t * 1.3 + ph) * 0.08; u.trunk.rotation.x = Math.sin(t * 3 + ph) * 0.5 - 0.2; }
  if (n === 1) { u.body.position.y = Math.sin(t * 2 + ph) * 0.35; u.iris.position.x = Math.sin(t * 0.9 + ph) * 0.18; const bl = ((t + ph) % 3.2) > 3.05; u.lid.rotation.x = bl ? -0.05 : -0.9; for (const [tt, i] of u.sway) tt.rotation.set(Math.sin(t * 3 + i) * 0.35, 0, Math.cos(t * 3 + i) * 0.35); }
  if (n === 2) { u.body.position.y = 1.5 + Math.abs(Math.sin(w * 2)) * 0.12; u.tail.rotation.y = Math.sin(t * 8) * 0.5; u.umb.rotation.z = Math.sin(t * 1.5 + ph) * 0.2; }
  if (n === 3) { u.body.rotation.z = Math.sin(t * 1.6 + ph) * 0.1; for (const [m, s] of u.arms) m.rotation.x = Math.sin(t * 6) * 0.2; for (const [d, i] of u.drops) { const f = ((t * 0.9 + i * 0.17) % 1); d.position.y = 0.9 - f * 2.2; d.visible = f < 0.8; } }
  if (n === 4) { u.body.scale.z = 1 + Math.sin(t * 3 + ph) * 0.06; u.flag.rotation.y = Math.sin(t * 6) * 0.4; u.shell.rotation.z = Math.sin(t * 3 + ph) * 0.04; }
  if (n === 5) { u.body.rotation.y = Math.sin(t * 1.4 + ph) * 0.9; u.body.position.y = Math.abs(Math.sin(w)) * 0.3; for (const [A, s] of u.arms) A.rotation.z = Math.sin(w * 1.5 + s) * 0.6; }
}
