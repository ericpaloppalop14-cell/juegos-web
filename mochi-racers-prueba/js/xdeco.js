// ======================================================================
//  MOCHI RACERS v23 · decorado de los 18 circuitos nuevos + más detalle alrededor de TODAS las pistas
//  Todo se coloca comprobando la distancia a la calzada (muro + talud), así que nada atraviesa la pista
//  ni tapa la vista. Geometrías y materiales compartidos; lo que se mueve se anima en T.anims.
// ======================================================================
import * as THREE from 'three';
import { monumentHalo } from './hd.js';
import { MONU } from './props26.js';
import { toon, mesh, outline, glowTex } from './gfx.js';
const V3 = THREE.Vector3;
const G = {}; const geo = (k, f) => G[k] || (G[k] = Object.assign(f(), { _shared: true }));
const sph = () => geo('s', () => new THREE.SphereGeometry(1, 16, 12));
const sphL = () => geo('sl', () => new THREE.SphereGeometry(1, 10, 7));
const cyl = () => geo('c', () => new THREE.CylinderGeometry(1, 1, 1, 16));
const cone = () => geo('k', () => new THREE.ConeGeometry(1, 1, 16));
const box = () => geo('b', () => new THREE.BoxGeometry(1, 1, 1));
const tor = () => geo('t', () => new THREE.TorusGeometry(1, 0.22, 10, 28));
const hemi = () => geo('h', () => new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2));
const glow = (c, s, op = 0.7) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: op })); sp.scale.setScalar(s); return sp; };
const ink = '#3a2050';
function face(parent, y, z, s = 1, happy = true) { // carita kawaii
  for (const sd of [-1, 1]) { mesh(sphL(), toon('#2a1838', { rim: 0 }), parent, [sd * 0.32 * s, y, z], null, [0.11 * s, 0.14 * s, 0.06 * s]); mesh(sphL(), toon('#ff9ec7', { rim: 0 }), parent, [sd * 0.55 * s, y - 0.18 * s, z - 0.02], null, [0.13 * s, 0.07 * s, 0.04 * s]); }
  const m = mesh(geo('smile', () => new THREE.TorusGeometry(0.16, 0.04, 6, 12, Math.PI)), toon('#2a1838', { rim: 0 }), parent, [0, y - 0.12 * s, z], [0, 0, Math.PI], s); return m;
}
let canvasCache = {};
function textTex(txt, col = '#ffffff', bg = null, w = 256, h = 256, font = 170) {
  const k = txt + col + bg + w + h; if (canvasCache[k]) return canvasCache[k];
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  if (bg) { x.fillStyle = bg; x.beginPath(); x.roundRect(4, 4, w - 8, h - 8, 30); x.fill(); }
  x.font = `700 ${font}px Fredoka, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 12; x.strokeStyle = ink; x.strokeText(txt, w / 2, h / 2 + 6); x.fillStyle = col; x.fillText(txt, w / 2, h / 2 + 6);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return canvasCache[k] = t;
}
const label = (txt, col, s, bg) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTex(txt, col, bg), transparent: true, depthWrite: false })); sp.scale.setScalar(s); return sp; };

// ---------- colocación segura ----------
function makeSpace(T, rnd) {
  const { S, N } = T, space = T.theme === 'space';
  let ay = 0; for (const s of S) ay += s.p.y; ay /= N;
  const clear = (x, z, rad) => { let m = 1e9; for (let j = 0; j < N; j += 3) { const s = S[j]; const need = s.wall + (space ? 5 : 8 + Math.max(0, s.p.y) * 2.5) + rad; const d = Math.hypot(s.p.x - x, s.p.z - z) - need; if (d < m) m = d; } return m; };
  let cx = 0, cz = 0; for (const s of S) { cx += s.p.x; cz += s.p.z; } cx /= N; cz /= N;
  const baseY = space ? ay - 4 : -0.6;
  // un hueco libre al azar en un anillo [r0,r1] alrededor del centro del circuito
  const spot = (rad, r0, r1, tries = 30) => { for (let i = 0; i < tries; i++) { const a = rnd() * 6.283, r = r0 + rnd() * (r1 - r0), x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; if (clear(x, z, rad) > 0) return new V3(x, baseY, z); } return null; };
  const centerR = Math.max(0, clear(cx, cz, 0));
  return { clear, spot, cx, cz, baseY, ay, centerR, space };
}
function scatter(T, Z, n, rad, r0, r1, build) { const out = []; for (let i = 0; i < n; i++) { const p = Z.spot(rad, r0, r1); if (!p) continue; const g = new THREE.Group(); g.position.copy(p); T.group.add(g); build(g, i); out.push(g); } return out; }
function center(T, Z, want, build) { const s = Math.min(1, Z.centerR / want); if (s < 0.35) return null; const g = new THREE.Group(); g.position.set(Z.cx, Z.baseY, Z.cz); g.scale.setScalar(s); T.group.add(g); build(g); try { monumentHalo(T, g, Math.min(Z.centerR * 0.8, want * s)); } catch (e) {} return g; }

// ---------- 18 escenarios ----------
const B = {};
B.chicle = (T, Z, A) => { // máquina de chicles gigante, pompas que crecen y explotan
  center(T, Z, 60, g => { mesh(cyl(), toon('#ff4f7a'), g, [0, 9, 0], null, [14, 18, 14]); mesh(cyl(), toon('#ffd36b'), g, [0, 18.5, 0], null, [15, 1.5, 15]);
    const gl = mesh(sph(), toon('#e8f8ff', { opacity: 0.35, rim: 1 }), g, [0, 38, 0], null, 22);
    for (let i = 0; i < 70; i++) { const a = i * 2.4, r = Math.sqrt(i / 70) * 17, y = 22 + (i % 9) * 2.2; mesh(sphL(), toon(['#ff8fc0', '#7ee3c4', '#ffd36b', '#b9a2f7', '#8fe3f0'][i % 5]), g, [Math.cos(a) * r, y, Math.sin(a) * r], null, 2.6); }
    mesh(box(), toon('#c0c8d8'), g, [0, 10, 14.2], null, [5, 5, 1]); const knob = mesh(cyl(), toon('#ffffff'), g, [0, 10, 15], [Math.PI / 2, 0, 0], [2, 1, 2]); face(g, 5.5, 14.3, 6);
    mesh(sph(), toon('#ff4f7a'), g, [0, 61, 0], null, 3); A.push(t => { knob.rotation.y = t * 0.8; gl.rotation.y = t * 0.1; }); });
  scatter(T, Z, 14, 6, 60, 330, (g, i) => { mesh(cyl(), toon('#ffffff'), g, [0, 4, 0], null, [0.3, 8, 0.3]); const b = mesh(sph(), toon(['#ff8fc0', '#ffb3e0', '#7ee3c4'][i % 3], { opacity: 0.85, rim: 0.9 }), g, [0, 10, 0], null, 3); const ph = i * 1.3;
    A.push(t => { const u = ((t * 0.35 + ph) % 1); b.scale.setScalar(1 + u * 4.5); b.visible = u < 0.96; }); });
  scatter(T, Z, 10, 7, 80, 320, (g, i) => { for (let k = 0; k < 9; k++) mesh(sphL(), toon(['#ff8fc0', '#7ee3c4', '#ffd36b', '#b9a2f7'][(k + i) % 4]), g, [(k % 3 - 1) * 2.2, 1.6 + Math.floor(k / 3) * 1.9, ((k * 7) % 3 - 1) * 1.4], null, 1.8); });
};
B.chocolate = (T, Z, A) => { // volcán de chocolate que escupe nubes de malvavisco
  center(T, Z, 80, g => { const v = mesh(cone(), toon('#7a4a2a'), g, [0, 30, 0], null, [60, 60, 60]); outline(v, '#3a2010', 1.01); mesh(cone(), toon('#ffb3d9'), g, [0, 52, 0], null, [24, 18, 24]); mesh(cyl(), toon('#ff9a3a', { emissive: '#ff7a1a', ei: 0.7 }), g, [0, 58, 0], null, [8, 2, 8]);
    for (let i = 0; i < 10; i++) { const a = i * 0.628; mesh(sphL(), toon('#ffb3d9'), g, [Math.cos(a) * 15, 44 - (i % 3) * 4, Math.sin(a) * 15], null, [3, 7, 3]); }
    face(g, 30, 29.5, 14);
    const mm = []; for (let i = 0; i < 8; i++) { const m = mesh(cyl(), toon('#fffaf4'), g, [0, 60, 0], null, [2.4, 3, 2.4]); mm.push(m); }
    A.push(t => mm.forEach((m, i) => { const u = (t * 0.4 + i / 8) % 1, a = i * 0.785; m.position.set(Math.cos(a) * u * 40, 60 + Math.sin(u * Math.PI) * 45, Math.sin(a) * u * 40); m.rotation.set(t * 2 + i, t, 0); })); });
  scatter(T, Z, 8, 9, 60, 330, (g, i) => { mesh(cyl(), toon('#d8c0ff'), g, [0, 1, 0], null, [6, 2, 6]); for (let k = 0; k < 3; k++) mesh(cyl(), toon('#7a4a2a'), g, [0, 3 + k * 2.6, 0], null, [5 - k * 1.4, 2.2, 5 - k * 1.4]); const top = mesh(sph(), toon('#ff4f6a'), g, [0, 12.5, 0], null, [1.6, 2, 1.6]); A.push(t => top.position.y = 12.5 + Math.sin(t * 2 + i) * 0.5); });
  scatter(T, Z, 12, 4, 60, 320, (g, i) => { const s = mesh(sph(), toon('#ff3f5f'), g, [0, 3.5, 0], null, [2.8, 3.6, 2.8]); mesh(sph(), toon('#7a4a2a'), g, [0, 2.4, 0], null, [3, 2.6, 3]); mesh(cone(), toon('#5fbf4a'), g, [0, 7.3, 0], [Math.PI, 0, 0], [1.6, 1, 1.6]); face(g, 4.4, 2.75, 3); });
  scatter(T, Z, 10, 4, 70, 330, (g) => { for (let k = 0; k < 5; k++) mesh(box(), toon(k % 2 ? '#f3d29a' : '#7a4a2a'), g, [0, 1 + k * 2, 0], [0, k * 0.2, 0], [4, 2, 4]); });
};
B.colmena = (T, Z, A) => { // colmena gigante con abejas en órbita
  center(T, Z, 50, g => { for (let i = 0; i < 9; i++) { const r = 18 * Math.sin((i + 1) / 10 * Math.PI) + 4; mesh(geo('ht', () => new THREE.TorusGeometry(1, 0.45, 12, 30)), toon(i % 2 ? '#ffc23d' : '#ffd86a'), g, [0, 4 + i * 5, 0], [Math.PI / 2, 0, 0], [r, r, 5]); }
    mesh(cyl(), toon('#3a2010'), g, [0, 10, 17], [Math.PI / 2, 0, 0], [4, 2, 4]); face(g, 26, 19.5, 9);
    const bees = []; for (let i = 0; i < 12; i++) { const b = new THREE.Group(); g.add(b); const bd = mesh(sph(), toon('#ffd24a'), b, [0, 0, 0], null, [1.6, 1.4, 2]); for (const z of [-0.5, 0.5]) mesh(cyl(), toon('#3a2010'), b, [0, 0, z], [Math.PI / 2, 0, 0], [1.45, 0.35, 1.25]); const w = [-1, 1].map(sd => mesh(sph(), toon('#ffffff', { opacity: 0.7 }), b, [sd * 1.3, 1.1, 0], null, [1.3, 0.2, 0.8])); bees.push([b, w]); }
    A.push(t => bees.forEach(([b, w], i) => { const a = t * (0.5 + (i % 3) * 0.15) + i * 0.52, r = 28 + (i % 4) * 6; b.position.set(Math.cos(a) * r, 20 + Math.sin(t * 2 + i) * 8 + (i % 3) * 8, Math.sin(a) * r); b.rotation.y = -a; w.forEach((x, k) => x.rotation.z = (k ? 1 : -1) * Math.sin(t * 40) * 0.5); })); });
  scatter(T, Z, 14, 5, 60, 340, (g, i) => { for (let k = 0; k < 7; k++) { const a = k * 1.047, r = k ? 2.6 : 0; mesh(geo('hex', () => new THREE.CylinderGeometry(1.5, 1.5, 1, 6)), toon(k % 2 ? '#ffb020' : '#ffd86a'), g, [Math.cos(a) * r, 2 + (k * 1.7 % 3) * 1.5, Math.sin(a) * r], null, [1, 4 + (k * 1.7 % 3) * 3, 1]); } });
  scatter(T, Z, 10, 4, 60, 320, (g, i) => { mesh(sph(), toon('#e09a20'), g, [0, 2.6, 0], null, [3, 2.8, 3]); mesh(cyl(), toon('#ffd86a'), g, [0, 5.4, 0], null, [2, 0.8, 2]); mesh(cyl(), toon('#ff8fc0'), g, [0, 5.9, 0], null, [2.3, 0.3, 2.3]); const d = mesh(sph(), toon('#ffc23d', { rim: 0.8 }), g, [2.2, 3, 0], null, [0.5, 1, 0.5]); A.push(t => { d.position.y = 3 - ((t * 0.6 + i * 0.3) % 1) * 3; }); });
};
B.jardin = (T, Z, A) => { // flores gigantes con cara que cantan + notas musicales
  center(T, Z, 40, g => { mesh(cyl(), toon('#5fb04a'), g, [0, 25, 0], null, [2, 50, 2]); const hd = new THREE.Group(); hd.position.set(0, 52, 0); g.add(hd);
    for (let i = 0; i < 16; i++) mesh(sph(), toon('#ffcf2a'), hd, [Math.cos(i * 0.393) * 13, Math.sin(i * 0.393) * 13, 0], [0, 0, i * 0.393], [5, 2.5, 1]);
    mesh(cyl(), toon('#8a5a2a'), hd, [0, 0, 0.5], [Math.PI / 2, 0, 0], [9, 2, 9]); face(hd, 1, 1.6, 10); const mo = mesh(sph(), toon('#c03050'), hd, [0, -3, 1.6], null, [2, 1, 0.5]);
    for (const sd of [-1, 1]) mesh(sph(), toon('#5fb04a'), g, [sd * 6, 20, 0], [0, 0, sd * 0.6], [7, 2, 3]);
    A.push(t => { hd.rotation.y = Math.sin(t * 0.4) * 0.6; hd.rotation.z = Math.sin(t * 1.2) * 0.08; mo.scale.y = 0.5 + Math.abs(Math.sin(t * 4)) * 1.5; }); });
  const notes = [];
  scatter(T, Z, 16, 5, 50, 330, (g, i) => { const c = ['#ff7fb6', '#ffffff', '#ff9f4a', '#b98aff', '#7fd8ff'][i % 5], h = 9 + (i % 4) * 3; mesh(cyl(), toon('#5fb04a'), g, [0, h / 2, 0], null, [0.5, h, 0.5]); const hd = new THREE.Group(); hd.position.y = h; g.add(hd);
    for (let k = 0; k < 6; k++) mesh(sph(), toon(c), hd, [Math.cos(k * 1.047) * 2.6, Math.sin(k * 1.047) * 2.6, 0], null, [1.8, 1.8, 0.6]); mesh(sph(), toon('#ffe066'), hd, [0, 0, 0.3], null, [1.8, 1.8, 0.8]); face(hd, 0.3, 1.2, 1.6); const mo = mesh(sph(), toon('#c03050'), hd, [0, -0.5, 1.1], null, [0.4, 0.3, 0.2]);
    const n = label(['♪', '♫', '♬'][i % 3], c, 3); g.add(n); notes.push([n, h, i]); A.push(t => { mo.scale.y = 0.2 + Math.abs(Math.sin(t * 5 + i)) * 0.4; hd.rotation.z = Math.sin(t * 2 + i) * 0.15; }); });
  A.push(t => notes.forEach(([n, h, i]) => { const u = (t * 0.5 + i * 0.17) % 1; n.position.set(Math.sin(u * 6 + i) * 2, h + 2 + u * 10, 0); n.material.opacity = 1 - u; }));
  scatter(T, Z, 12, 4, 60, 340, (g, i) => { mesh(cyl(), toon('#fff4e0'), g, [0, 1.6, 0], null, [1, 3.2, 1]); const c = mesh(sph(), toon(i % 2 ? '#ff4f6f' : '#b98aff'), g, [0, 3.5, 0], null, [3, 1.8, 3]); for (let k = 0; k < 5; k++) mesh(sphL(), toon('#ffffff'), g, [Math.cos(k * 1.3) * 1.8, 4.6, Math.sin(k * 1.3) * 1.8], null, 0.45); });
};
B.pinguinos = (T, Z, A) => { // montaña de hielo, pistas de patinaje con pingüinos que giran
  center(T, Z, 60, g => { const m = mesh(cone(), toon('#dff3ff', { rim: 0.7 }), g, [0, 30, 0], null, [50, 60, 50]); mesh(cone(), toon('#ffffff'), g, [0, 52, 0], null, [20, 16, 20]); penguin(g, [0, 60, 0], 4, A, 0); });
  scatter(T, Z, 7, 16, 60, 340, (g, i) => { mesh(cyl(), toon('#bfe6ff', { rim: 0.9 }), g, [0, 0.8, 0], null, [14, 0.6, 14]); const ring = new THREE.Group(); g.add(ring); for (let k = 0; k < 4; k++) penguin(ring, [Math.cos(k * 1.571) * 9, 1.1, Math.sin(k * 1.571) * 9], 1.5, A, k + i);
    A.push(t => { ring.rotation.y = t * (0.6 + i * 0.05); ring.children.forEach((p, k) => p.rotation.y = -t * 3 + k); }); });
  scatter(T, Z, 10, 6, 60, 330, (g) => { const d = mesh(hemi(), toon('#ffffff', { rim: 0.6 }), g, [0, 0, 0], null, 5); outline(d, '#9ab8d8', 1.03); mesh(cyl(), toon('#ffffff'), g, [0, 1.5, 4.5], [Math.PI / 2, 0, 0], [1.8, 3, 1.8]); mesh(cyl(), toon('#3a5a8a'), g, [0, 1.5, 6], [Math.PI / 2, 0, 0], [1.3, 0.2, 1.3]); });
  scatter(T, Z, 14, 3, 50, 340, (g, i) => { for (let k = 0; k < 3; k++) mesh(geo('oct', () => new THREE.OctahedronGeometry(1, 0)), toon(['#bfe6ff', '#ffc4e1', '#e4d4ff'][(i + k) % 3], { opacity: 0.85, rim: 0.9, emissive: '#7fc8ff', ei: 0.2 }), g, [(k - 1) * 1.6, 3 + k * 1.2, 0], [0, k, 0.3 * (k - 1)], [1.4, 4 - k, 1.4]); });
};
function penguin(parent, p, s, A, ph) { const g = new THREE.Group(); g.position.set(...p); g.scale.setScalar(s); parent.add(g); const b = mesh(sph(), toon('#2a2a4a'), g, [0, 1.1, 0], null, [0.9, 1.2, 0.85]); outline(b, ink, 1.04); mesh(sph(), toon('#ffffff'), g, [0, 1, 0.35], null, [0.7, 1, 0.6]); face(g, 1.55, 0.83, 0.8); mesh(cone(), toon('#ffb020'), g, [0, 1.35, 0.95], [Math.PI / 2, 0, 0], [0.18, 0.4, 0.18]); mesh(cone(), toon('#ff4f6f'), g, [0, 2.4, 0], null, [0.6, 0.8, 0.6]); mesh(sphL(), toon('#ffffff'), g, [0, 2.85, 0], null, 0.2); const ws = [-1, 1].map(sd => mesh(sph(), toon('#2a2a4a'), g, [sd * 0.85, 1.1, 0], [0, 0, sd * 0.4], [0.2, 0.7, 0.4])); A.push(t => ws.forEach((w, k) => w.rotation.z = (k ? 1 : -1) * (0.4 + Math.abs(Math.sin(t * 6 + ph)) * 0.8))); return g; }
B.castillo = (T, Z, A) => { // castillo de hielo de la Reina Polo + auroras
  center(T, Z, 60, g => { const ice = toon('#bfe6ff', { opacity: 0.88, rim: 1, emissive: '#7fc8ff', ei: 0.2 });
    mesh(cyl(), ice, g, [0, 14, 0], null, [22, 28, 22]); mesh(cone(), toon('#ff8fc0'), g, [0, 40, 0], null, [24, 24, 24]);
    for (let i = 0; i < 6; i++) { const a = i * 1.047; mesh(cyl(), ice, g, [Math.cos(a) * 28, 18, Math.sin(a) * 28], null, [6, 36, 6]); mesh(cone(), toon(i % 2 ? '#b98aff' : '#ff8fc0'), g, [Math.cos(a) * 28, 42, Math.sin(a) * 28], null, [8, 12, 8]); mesh(sph(), toon('#fff6a0', { emissive: '#fff6a0', ei: 0.8 }), g, [Math.cos(a) * 28, 49, Math.sin(a) * 28], null, 1.3); }
    face(g, 18, 22.2, 10); mesh(geo('crown', () => new THREE.CylinderGeometry(1, 0.8, 1, 8, 1, true)), toon('#ffd24a', { side: THREE.DoubleSide }), g, [0, 54, 0], null, [5, 4, 5]); });
  const aur = []; for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(geo('aur', () => new THREE.PlaneGeometry(1, 1, 30, 1)), new THREE.MeshBasicMaterial({ color: ['#7fffd4', '#b98aff', '#7fd8ff', '#ff8fd8'][i], transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); m.position.set(Z.cx + (i - 1.5) * 120, 120 + i * 12, Z.cz - 380 + i * 60); m.scale.set(600, 60, 1); T.group.add(m); aur.push(m); }
  A.push(t => aur.forEach((m, i) => { m.material.opacity = 0.2 + Math.sin(t * 0.7 + i) * 0.1; m.rotation.y = Math.sin(t * 0.1 + i) * 0.3; }));
  scatter(T, Z, 12, 4, 60, 330, (g, i) => { mesh(sph(), toon('#ffffff'), g, [0, 2, 0], null, 2.6); mesh(sph(), toon('#ffffff'), g, [0, 5.4, 0], null, 1.9); mesh(sph(), toon('#ffffff'), g, [0, 8, 0], null, 1.3); face(g, 8.1, 1.25, 1.2); mesh(cone(), toon('#ff9a3a'), g, [0, 7.9, 1.5], [Math.PI / 2, 0, 0], [0.25, 1, 0.25]); mesh(cyl(), toon(['#ff4f6f', '#3a5a8a', '#5fbf4a'][i % 3]), g, [0, 6.5, 0], null, [1.9, 0.5, 1.9]); mesh(cyl(), toon('#2a1838'), g, [0, 9.6, 0], null, [1, 1.6, 1]); });
};
B.nebulosa = (T, Z, A) => { // nubes de algodón de azúcar flotantes + cono gigante
  center(T, Z, 50, g => { mesh(cone(), toon('#fff4e0'), g, [0, -10, 0], [Math.PI, 0, 0], [3, 40, 3]); for (let i = 0; i < 14; i++) mesh(sph(), toon(i % 2 ? '#ffb3e0' : '#b3e0ff', { rim: 0.9 }), g, [Math.cos(i * 2.3) * 12 * Math.sqrt(i / 14), 14 + (i % 5) * 4, Math.sin(i * 2.3) * 12 * Math.sqrt(i / 14)], null, 10 + (i % 3) * 3); face(g, 22, 22, 8); });
  scatter(T, Z, 18, 10, 40, 340, (g, i) => { g.position.y += (i % 5) * 9 - 10; const c = ['#ffb3e0', '#b3e0ff', '#e4d4ff'][i % 3]; for (let k = 0; k < 5; k++) mesh(sph(), toon(c, { rim: 0.9 }), g, [(k - 2) * 3.5, Math.sin(k) * 1.5, (k % 2) * 2], null, 3 + (k % 3)); const y0 = g.position.y; A.push(t => g.position.y = y0 + Math.sin(t * 0.6 + i) * 2); });
  scatter(T, Z, 24, 2, 30, 300, (g, i) => { g.position.y += (i % 7) * 7; const s = glow(['#ffe066', '#ffffff', '#ff8fd8'][i % 3], 6); g.add(s); A.push(t => s.material.opacity = 0.4 + Math.abs(Math.sin(t * 2 + i)) * 0.5); });
};
B.gusano = (T, Z, A) => { // espiral de anillos arcoíris + planetas con cara
  center(T, Z, 60, g => { const rings = []; for (let i = 0; i < 16; i++) { const r = mesh(tor(), toon('#ffffff', { emissive: '#ffffff', ei: 0.5 }), g, [0, 10 + i * 4, 0], [Math.PI / 2, 0, 0], 26 - i * 1.2); r.material = toon(`hsl(${i * 22},90%,70%)`, { emissive: `hsl(${i * 22},90%,60%)`, ei: 0.6 }); rings.push(r); }
    const c = glow('#ffffff', 40, 0.8); c.position.y = 40; g.add(c); A.push(t => rings.forEach((r, i) => { r.rotation.z = t * 0.6 + i * 0.3; r.position.x = Math.sin(t + i * 0.4) * 3; r.position.z = Math.cos(t + i * 0.4) * 3; })); });
  scatter(T, Z, 10, 14, 60, 340, (g, i) => { g.position.y += 10 + (i % 4) * 10; const p = mesh(sph(), toon(['#ff9ec7', '#7ee3c4', '#ffd36b', '#b9a2f7', '#8fe3f0'][i % 5], { rim: 0.7 }), g, [0, 0, 0], null, 8); face(p, 0.1, 0.98, 0.7); if (i % 2) mesh(tor(), toon('#ffffff', { emissive: '#ffffff', ei: 0.4 }), g, [0, 0, 0], [1.2, 0, 0.3], [13, 13, 1]); A.push(t => { g.rotation.y = Math.sin(t * 0.3 + i) * 0.5; }); });
  scatter(T, Z, 6, 4, 80, 340, (g, i) => { g.position.y += 40; const h = glow('#fff6a0', 8, 0.9); g.add(h); const tail = mesh(cone(), new THREE.MeshBasicMaterial({ color: '#ffd6f0', transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }), g, [0, 0, -9], [-Math.PI / 2, 0, 0], [2.4, 18, 2.4]); const p0 = g.position.clone(); A.push(t => { const a = t * 0.25 + i; g.position.set(p0.x + Math.cos(a) * 30, p0.y + Math.sin(a * 2) * 6, p0.z + Math.sin(a) * 30); g.rotation.y = -a; }); });
};
B.neon = (T, Z, A) => { // rascacielos con bordes de neón y torre giratoria
  center(T, Z, 50, g => { mesh(cyl(), toon('#2a2050'), g, [0, 35, 0], null, [8, 70, 8]); const rs = []; for (let i = 0; i < 5; i++) rs.push(mesh(tor(), toon(['#ff5fd2', '#5ff5ff', '#ffe066', '#b98aff', '#7fff9a'][i], { emissive: ['#ff5fd2', '#5ff5ff', '#ffe066', '#b98aff', '#7fff9a'][i], ei: 1 }), g, [0, 20 + i * 11, 0], [Math.PI / 2, 0, 0], 14 - i)); const st = label('★', '#ffe066', 22); st.position.y = 80; g.add(st);
    A.push(t => rs.forEach((r, i) => { r.rotation.x = Math.PI / 2 + Math.sin(t + i) * 0.4; r.rotation.y = t * (i % 2 ? 1 : -1); })); });
  const words = ['¡GUAU!', 'MOCHI', '★★★', '¡YUJU!', 'RACERS', '♥'];
  scatter(T, Z, 16, 9, 70, 360, (g, i) => { const h = 20 + (i % 5) * 9; mesh(box(), toon('#241c48'), g, [0, h / 2, 0], null, [12, h, 12]); const c = ['#ff5fd2', '#5ff5ff', '#ffe066', '#b98aff'][i % 4]; for (const [x, z] of [[6, 6], [-6, 6], [6, -6], [-6, -6]]) mesh(box(), toon(c, { emissive: c, ei: 1 }), g, [x, h / 2, z], null, [0.5, h, 0.5]); mesh(box(), toon(c, { emissive: c, ei: 1 }), g, [0, h, 0], null, [12.4, 0.5, 12.4]);
    const lb = label(words[i % words.length], c, 12); lb.position.y = h + 7; g.add(lb); A.push(t => lb.material.opacity = 0.6 + Math.abs(Math.sin(t * 3 + i)) * 0.4); });
};
B.huracan = (T, Z, A) => { // tornado discotequero con vacas felices bailando en órbita
  center(T, Z, 50, g => { const cones = []; for (let i = 0; i < 6; i++) cones.push(mesh(cone(), toon('#b9a2ff', { opacity: 0.35, rim: 1, emissive: '#7f5fff', ei: 0.3 }), g, [0, 20 + i * 9, 0], [Math.PI, 0, 0], [8 + i * 4, 14, 8 + i * 4]));
    const balls = []; for (let i = 0; i < 6; i++) { const b = mesh(geo('disco', () => new THREE.IcosahedronGeometry(1, 1)), toon('#e8e8ff', { flat: true, rim: 1, emissive: '#ffffff', ei: 0.3 }), g, [0, 0, 0], null, 3.5); balls.push(b); }
    const cows = []; for (let i = 0; i < 4; i++) { const c = new THREE.Group(); g.add(c); mesh(box(), toon('#ffffff'), c, [0, 0, 0], null, [3, 2, 4.2]); for (const [x, z] of [[0.8, 1], [-0.7, -0.6]]) mesh(sphL(), toon('#2a1838'), c, [x, 0.6, z], null, [0.9, 0.6, 0.9]); const hd = mesh(box(), toon('#ffffff'), c, [0, 0.6, 2.6], null, [2, 1.8, 1.6]); face(c, 0.9, 3.45, 1.3); mesh(sphL(), toon('#ffb3c8'), c, [0, 0.1, 3.4], null, [0.9, 0.5, 0.3]); cows.push(c); }
    A.push(t => { cones.forEach((c, i) => c.rotation.y = t * (2 + i * 0.3)); balls.forEach((b, i) => { const a = t * 1.5 + i * 1.047; b.position.set(Math.cos(a) * (14 + i * 2), 22 + i * 7, Math.sin(a) * (14 + i * 2)); b.rotation.y = t * 3; }); cows.forEach((c, i) => { const a = -t * 0.9 + i * 1.571; c.position.set(Math.cos(a) * 26, 30 + Math.sin(t * 2 + i) * 8, Math.sin(a) * 26); c.rotation.set(Math.sin(t * 3 + i) * 0.4, t * 2 + i, Math.sin(t * 2.5) * 0.3); }); }); });
  scatter(T, Z, 10, 4, 60, 340, (g, i) => { mesh(cyl(), toon('#3b3266'), g, [0, 1, 0], null, [2, 2, 2]); const c = ['#ff5fd2', '#5ff5ff', '#ffe066'][i % 3]; const beam = mesh(cone(), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }), g, [0, 30, 0], null, [6, 60, 6]); A.push(t => { beam.rotation.z = Math.sin(t * 1.2 + i) * 0.5; beam.rotation.x = Math.cos(t + i) * 0.4; }); });
};
B.globos = (T, Z, A) => { // casitas que flotan colgadas de globos
  center(T, Z, 50, g => { g.position.y = Z.ay - 10; const hs = new THREE.Group(); g.add(hs); house(hs, 3); for (let i = 0; i < 40; i++) { const a = i * 2.4, r = Math.sqrt(i / 40) * 14; mesh(sph(), toon(['#ff8fc0', '#7fd8ff', '#ffd36b', '#9dff7a', '#b98aff'][i % 5], { rim: 0.6 }), hs, [Math.cos(a) * r, 34 + (i % 6) * 3, Math.sin(a) * r], null, [3, 3.6, 3]); }
    A.push(t => { hs.position.y = Math.sin(t * 0.5) * 3; hs.rotation.y = t * 0.1; }); });
  scatter(T, Z, 12, 9, 50, 340, (g, i) => { g.position.y += (i % 4) * 8; const s = 1 + (i % 3) * 0.3; house(g, s); for (let k = 0; k < 7; k++) mesh(sph(), toon(['#ff8fc0', '#7fd8ff', '#ffd36b', '#9dff7a'][(k + i) % 4], { rim: 0.6 }), g, [(k % 3 - 1) * 2.4 * s, (14 + (k % 2) * 2.5) * s, (Math.floor(k / 3) - 1) * 2 * s], null, [1.6 * s, 2 * s, 1.6 * s]); const y0 = g.position.y; A.push(t => g.position.y = y0 + Math.sin(t * 0.7 + i) * 1.5); });
};
function house(g, s) { mesh(box(), toon('#fff4fa'), g, [0, 3 * s, 0], null, [6 * s, 6 * s, 6 * s]); const r = mesh(cone(), toon('#ff7fb6'), g, [0, 7.8 * s, 0], [0, Math.PI / 4, 0], [5.4 * s, 3.6 * s, 5.4 * s]); r.geometry = geo('k4', () => new THREE.ConeGeometry(1, 1, 4)); mesh(box(), toon('#7fd8ff', { emissive: '#7fd8ff', ei: 0.3 }), g, [0, 3.5 * s, 3.05 * s], null, [2 * s, 2 * s, 0.1]); for (let k = 0; k < 4; k++) mesh(cyl(), toon('#ffffff'), g, [(k % 2 - 0.5) * 4 * s, 9 * s, (Math.floor(k / 2) - 0.5) * 4 * s], null, [0.06, 6 * s, 0.06]); }
B.cascada = (T, Z, A) => { // cascada que sube + islas con árboles boca abajo
  center(T, Z, 40, g => { g.position.y = Z.ay - 40; mesh(cyl(), toon('#7fd8ff', { opacity: 0.55, rim: 1, emissive: '#5fc8ff', ei: 0.3 }), g, [0, 60, 0], null, [9, 120, 9]); mesh(cone(), toon('#8fd46a'), g, [0, 0, 0], [Math.PI, 0, 0], [18, 14, 18]); mesh(cyl(), toon('#7fcf5f'), g, [0, 7, 0], null, [18, 1, 18]);
    const drops = []; for (let i = 0; i < 30; i++) drops.push(mesh(sphL(), toon('#e8fbff', { emissive: '#bfefff', ei: 0.6 }), g, [0, 0, 0], null, 1 + (i % 3) * 0.5));
    A.push(t => drops.forEach((d, i) => { const u = (t * 0.25 + i / 30) % 1, a = i * 2.1; d.position.set(Math.cos(a) * (9 + u * 4), 8 + u * 120, Math.sin(a) * (9 + u * 4)); })); });
  scatter(T, Z, 12, 12, 50, 340, (g, i) => { g.position.y += (i % 5) * 10 - 10; mesh(cone(), toon('#a07a5a'), g, [0, -4, 0], [Math.PI, 0, 0], [7, 8, 7]); mesh(cyl(), toon('#8fd46a'), g, [0, 0, 0], null, [7, 1, 7]);
    for (let k = 0; k < 3; k++) { const a = k * 2.1; mesh(cyl(), toon('#a07a5a'), g, [Math.cos(a) * 3, -9, Math.sin(a) * 3], null, [0.4, 6, 0.4]); mesh(sph(), toon(['#ff9ec7', '#9dff7a', '#ffd36b'][(k + i) % 3]), g, [Math.cos(a) * 3, -13, Math.sin(a) * 3], null, 2.6); } // árboles colgando boca abajo
    mesh(cyl(), toon('#7fd8ff', { opacity: 0.6, emissive: '#5fc8ff', ei: 0.3 }), g, [5, 10, 0], null, [1, 20, 1]); const y0 = g.position.y; A.push(t => { g.position.y = y0 + Math.sin(t * 0.5 + i) * 2; g.rotation.y = t * 0.05 * (i % 2 ? 1 : -1); }); });
};
B.escaleras = (T, Z, A) => { // escaleras imposibles + triángulo imposible + puertas flotantes
  center(T, Z, 50, g => { g.position.y = Z.ay; const tri = new THREE.Group(); g.add(tri); for (let i = 0; i < 3; i++) { const a = i * 2.094; const b = mesh(box(), toon(['#ffb36b', '#8b5cc2', '#ffe2b8'][i]), tri, [Math.cos(a) * 14, Math.sin(a) * 14, 0], [0, 0, a + Math.PI / 2], [4, 28, 4]); outline(b, ink, 1.03); }
    A.push(t => { tri.rotation.y = t * 0.3; tri.rotation.x = Math.sin(t * 0.2) * 0.3; }); });
  scatter(T, Z, 10, 12, 50, 340, (g, i) => { g.position.y += (i % 4) * 12 - 6; const st = new THREE.Group(); g.add(st); for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; mesh(box(), toon(k % 2 ? '#ffe2b8' : '#ffb36b'), st, [Math.cos(a) * 8, Math.sin(a * 2) * 3 + k * 0.4, Math.sin(a) * 8], [0, -a, 0], [3, 1, 4]); }
    A.push(t => st.rotation.y = t * 0.2 * (i % 2 ? 1 : -1)); });
  scatter(T, Z, 12, 4, 50, 340, (g, i) => { g.position.y += 6 + (i % 3) * 8; const d = new THREE.Group(); g.add(d); mesh(box(), toon('#8b5cc2'), d, [0, 0, 0], null, [4, 7, 0.4]); mesh(box(), toon('#ffe2b8', { emissive: '#ffe2b8', ei: 0.6 }), d, [0, 0, 0.1], null, [3, 6, 0.4]); mesh(sphL(), toon('#ffd24a'), d, [1, 0, 0.4], null, 0.3); A.push(t => { d.rotation.y = t * 0.4 + i; d.position.y = Math.sin(t + i) * 1.5; }); });
};
B.ojo = (T, Z, A, R) => { // ojo gigante que te sigue y parpadea + lunas con gorro de dormir
  center(T, Z, 50, g => { g.position.y = Z.ay + 10; const eye = new THREE.Group(); g.add(eye); mesh(sph(), toon('#ffffff', { rim: 0.6 }), eye, [0, 0, 0], null, 20); const iris = new THREE.Group(); eye.add(iris); mesh(sph(), toon('#7f5fff'), iris, [0, 0, 17.5], null, [9, 9, 3.6]); mesh(sph(), toon('#1a1030'), iris, [0, 0, 19.6], null, [4.5, 4.5, 1.6]); mesh(sph(), toon('#ffffff', { emissive: '#ffffff', ei: 1 }), iris, [2, 2, 20.6], null, 1.4);
    const lidT = mesh(hemi(), toon('#ffb3d9'), eye, [0, 0, 0], null, 20.6), lidB = mesh(hemi(), toon('#ffb3d9'), eye, [0, 0, 0], [Math.PI, 0, 0], 20.6);
    for (let k = 0; k < 9; k++) mesh(cyl(), toon('#2a1838'), eye, [(k - 4) * 4, 19 + Math.cos((k - 4) * 0.35) * 2, 6], [0.5, 0, (k - 4) * -0.2], [0.5, 8, 0.5]);
    A.push((t, dt, race) => { const P = race && race.player; if (P) { const d = new V3(P.pos.x - g.position.x, P.y - g.position.y, P.pos.z - g.position.z); eye.rotation.y = Math.atan2(d.x, d.z); eye.rotation.x = -Math.atan2(d.y, Math.hypot(d.x, d.z)) * 0.6; }
      const b = (t % 4.5) < 0.25 ? Math.sin((t % 4.5) / 0.25 * Math.PI) : 0; lidT.rotation.x = -Math.PI / 2 * (1 - b) - 0.1; lidB.rotation.x = Math.PI / 2 * (1 - b) + 0.1 + Math.PI / 2; }); });
  scatter(T, Z, 9, 8, 60, 340, (g, i) => { g.position.y += 20 + (i % 4) * 8; const m = mesh(sph(), toon('#fff3b0', { emissive: '#ffe680', ei: 0.3 }), g, [0, 0, 0], null, 6); face(m, 0.05, 0.98, 0.8); mesh(cone(), toon(['#7f5fff', '#ff8fc0', '#5fc8ff'][i % 3]), g, [1, 7, 0], [0, 0, -0.5], [4, 8, 4]); mesh(sphL(), toon('#ffffff'), g, [4.5, 10.5, 0], null, 1.2); const z = label('Z', '#ffffff', 4); z.position.set(7, 6, 0); g.add(z);
    A.push(t => { g.rotation.z = Math.sin(t * 0.6 + i) * 0.15; const u = (t * 0.4 + i * 0.2) % 1; z.position.set(7 + u * 4, 6 + u * 8, 0); z.material.opacity = 1 - u; }); });
};
B.medusas = (T, Z, A) => { // medusas luminosas + almeja gigante con perla
  center(T, Z, 40, g => { g.position.y = Z.ay - 6; const bot = mesh(hemi(), toon('#ffc4e1'), g, [0, 0, 0], [Math.PI, 0, 0], [20, 8, 20]); const top = new THREE.Group(); top.position.set(0, 0, -18); g.add(top); mesh(hemi(), toon('#ffb3d9'), top, [0, 0, 18], null, [20, 9, 20]); const pearl = mesh(sph(), toon('#ffffff', { rim: 1, emissive: '#fff0fa', ei: 0.4 }), g, [0, 7, 0], null, 7); const gl = glow('#ffffff', 34, 0.5); gl.position.y = 7; g.add(gl);
    A.push(t => { top.rotation.x = -0.35 - Math.abs(Math.sin(t * 0.5)) * 0.5; gl.material.opacity = 0.35 + Math.sin(t * 2) * 0.15; }); });
  scatter(T, Z, 16, 6, 40, 340, (g, i) => { g.position.y += (i % 6) * 6; const c = ['#ff8fd8', '#7fd8ff', '#b98aff', '#9dffd8'][i % 4]; const bell = mesh(hemi(), toon(c, { opacity: 0.75, rim: 1, emissive: c, ei: 0.5 }), g, [0, 0, 0], null, [3.5, 3, 3.5]); face(g, 1.5, 3.3, 1.3); const tn = []; for (let k = 0; k < 6; k++) tn.push(mesh(cyl(), toon(c, { opacity: 0.6, emissive: c, ei: 0.5 }), g, [Math.cos(k) * 2, -3, Math.sin(k) * 2], null, [0.2, 6, 0.2]));
    const y0 = g.position.y; A.push(t => { const p = Math.sin(t * 2 + i); g.position.y = y0 + p * 2; bell.scale.set(3.5 - p * 0.4, 3 + p * 0.4, 3.5 - p * 0.4); tn.forEach((m, k) => m.rotation.z = Math.sin(t * 3 + k) * 0.3); }); });
  scatter(T, Z, 12, 5, 50, 340, (g, i) => { g.position.y -= 6; const c = ['#ff7fa0', '#ffb36b', '#c86fff'][i % 3]; for (let k = 0; k < 6; k++) mesh(cyl(), toon(c), g, [Math.cos(k * 1.1) * 1.5, 3 + k % 3, Math.sin(k * 1.1) * 1.5], [Math.cos(k) * 0.4, 0, Math.sin(k) * 0.4], [0.5, 6 + (k % 3) * 2, 0.5]); });
};
B.cantora = (T, Z, A) => { // ballena cantora gigante + instrumentos flotantes + notas
  center(T, Z, 60, g => { g.position.y = Z.ay; const w = new THREE.Group(); g.add(w); const body = mesh(sph(), toon('#3f8fe0', { rim: 0.6 }), w, [0, 0, 0], null, [16, 12, 28]); outline(body, '#1a3a6a', 1.02); mesh(sph(), toon('#dff4ff'), w, [0, -4, 4], null, [13, 8, 22]); face(w, 3, 26.5, 8);
    const tail = mesh(sph(), toon('#3f8fe0'), w, [0, 3, -30], null, [14, 2, 6]); const jaw = mesh(sph(), toon('#ff7fa0'), w, [0, -3, 22], null, [7, 2, 4]); const sp = mesh(cyl(), toon('#bfefff', { opacity: 0.6 }), w, [0, 16, 8], null, [1.4, 8, 1.4]);
    const notes = []; for (let i = 0; i < 8; i++) { const n = label(['♪', '♫', '♬', '𝄞'][i % 4], ['#ffffff', '#ffe066', '#ff8fd8', '#9dffd8'][i % 4], 6); g.add(n); notes.push(n); }
    A.push(t => { w.position.y = Math.sin(t * 0.6) * 3; w.rotation.z = Math.sin(t * 0.4) * 0.06; tail.rotation.x = Math.sin(t * 1.5) * 0.3; jaw.scale.y = 1 + Math.abs(Math.sin(t * 3)) * 2.5; sp.scale.y = 4 + Math.abs(Math.sin(t * 1.3)) * 10; notes.forEach((n, i) => { const u = (t * 0.25 + i / 8) % 1; n.position.set(Math.sin(u * 8 + i) * 12, 10 + u * 50, 30 + u * 20); n.material.opacity = 1 - u; }); }); });
  scatter(T, Z, 10, 8, 60, 340, (g, i) => { g.position.y += 10 + (i % 3) * 10; const k = i % 3; const gold = toon('#ffd24a', { rim: 0.8, emissive: '#ffb020', ei: 0.2 });
    if (k === 0) { mesh(cone(), gold, g, [0, 0, 0], [0, 0, Math.PI / 2], [3, 6, 3]); mesh(cyl(), gold, g, [-7, 0, 0], [0, 0, Math.PI / 2], [0.6, 8, 0.6]); }
    else if (k === 1) { mesh(cyl(), toon('#ff8fc0'), g, [0, 0, 0], [Math.PI / 2, 0, 0], [4, 3, 4]); mesh(cyl(), toon('#ffffff'), g, [0, 0, 1.6], [Math.PI / 2, 0, 0], [3.8, 0.2, 3.8]); }
    else { mesh(box(), toon('#2a1838'), g, [0, 0, 0], null, [8, 1.5, 4]); for (let j = 0; j < 7; j++) mesh(box(), toon('#ffffff'), g, [(j - 3) * 1.05, 0.9, 1.2], null, [0.9, 0.3, 1.5]); }
    A.push(t => { g.rotation.y = t * 0.4 + i; g.rotation.z = Math.sin(t + i) * 0.2; }); });
};
B.cuento = (T, Z, A) => { // libro desplegable gigante con castillo de papel + dragones de papel
  center(T, Z, 50, g => { g.position.y = Z.ay - 8; for (const sd of [-1, 1]) mesh(box(), toon('#fffaf0'), g, [sd * 16, 0, 0], [0, 0, sd * -0.12], [32, 1.5, 40]); mesh(box(), toon('#c0392b'), g, [0, -1.2, 0], null, [66, 1, 42]);
    const cast = new THREE.Group(); g.add(cast); for (let i = -2; i <= 2; i++) { mesh(box(), toon(i % 2 ? '#ffe2b8' : '#ffd0e8'), cast, [i * 6, 8 + Math.abs(i) * -1.5, 0], null, [5, 16 - Math.abs(i) * 3, 0.4]); mesh(geo('k4', () => new THREE.ConeGeometry(1, 1, 4)), toon('#7f5fff'), cast, [i * 6, 18.5 - Math.abs(i) * 3, 0], [0, Math.PI / 4, 0], [3.6, 5, 0.4]); }
    A.push(t => cast.scale.y = 0.9 + Math.abs(Math.sin(t * 0.5)) * 0.1); });
  scatter(T, Z, 7, 6, 70, 340, (g, i) => { g.position.y += 25 + (i % 3) * 6; const d = new THREE.Group(); g.add(d); const c = ['#ff7fa0', '#7fd8ff', '#9dff7a'][i % 3];
    for (let k = 0; k < 6; k++) mesh(geo('pap', () => new THREE.OctahedronGeometry(1, 0)), toon(c, { flat: true }), d, [0, 0, -k * 2.2], null, [1.4 - k * 0.15, 1.4 - k * 0.15, 1.4]); const wn = [-1, 1].map(sd => mesh(geo('wing', () => new THREE.ConeGeometry(1, 1, 3)), toon('#ffffff', { flat: true, side: THREE.DoubleSide }), d, [sd * 3, 0.5, -2], [0, 0, sd * Math.PI / 2], [1.5, 5, 0.2]));
    const p0 = g.position.clone(); A.push(t => { const a = t * 0.35 + i; g.position.set(p0.x + Math.cos(a) * 20, p0.y + Math.sin(t * 1.3 + i) * 4, p0.z + Math.sin(a) * 20); d.rotation.y = -a; wn.forEach((w, k) => w.rotation.x = Math.sin(t * 5) * 0.5 * (k ? 1 : -1)); }); });
  scatter(T, Z, 12, 6, 50, 340, (g, i) => { mesh(box(), toon('#fffaf0'), g, [0, 5, 0], null, [8, 10, 0.3]); const t2 = mesh(geo('k4', () => new THREE.ConeGeometry(1, 1, 4)), toon(['#5fbf4a', '#ff8fc0', '#ffd24a'][i % 3]), g, [0, 7, 0.3], [0, Math.PI / 4, 0], [3, 6, 0.3]); mesh(box(), toon('#a07a5a'), g, [0, 3, 0.3], null, [1, 3, 0.3]); });
};
B.maquina = (T, Z, A) => { // máquina de escribir del universo: teclas que bajan y letras que vuelan
  center(T, Z, 60, g => { g.position.y = Z.ay - 6; mesh(box(), toon('#3a2a5a'), g, [0, 4, 0], null, [50, 8, 30]); mesh(cyl(), toon('#2a1838'), g, [0, 14, -8], [0, 0, Math.PI / 2], [4, 54, 4]); const paper = mesh(box(), toon('#fffaf0'), g, [0, 26, -9], null, [36, 26, 0.3]);
    const keys = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) { const k = mesh(cyl(), toon('#fffaf0'), g, [(c - 4) * 5 + r * 1.5, 9, 5 + r * 4.5], null, [1.8, 1.4, 1.8]); keys.push(k); }
    const lt = 'MOCHIRACERS¡VIVA!'.split(''), lets = lt.map((ch, i) => { const l = label(ch, ['#ff7fb6', '#7fd8ff', '#ffe066', '#9dff7a'][i % 4], 6); g.add(l); return l; });
    A.push(t => { keys.forEach((k, i) => k.position.y = 9 - (Math.sin(t * 6 + i * 1.7) > 0.8 ? 1.2 : 0)); lets.forEach((l, i) => { const u = (t * 0.15 + i / lets.length) % 1; l.position.set(-30 + u * 60 + Math.sin(i) * 4, 30 + Math.sin(u * 6 + i) * 10 + u * 20, -6 + Math.cos(i) * 8); }); paper.position.y = 26 + Math.sin(t * 0.5) * 0.5; }); });
  scatter(T, Z, 10, 6, 60, 340, (g, i) => { g.position.y += 4; mesh(cyl(), toon('#2a3a8a', { opacity: 0.9, rim: 0.8 }), g, [0, 3, 0], null, [3, 6, 3]); mesh(cyl(), toon('#2a1838'), g, [0, 6.6, 0], null, [1.4, 1.4, 1.4]); const qu = mesh(cone(), toon('#ffffff'), g, [0.8, 11, 0], [0, 0, -0.3], [1, 8, 0.3]); A.push(t => qu.rotation.z = -0.3 + Math.sin(t * 2 + i) * 0.2); });
  scatter(T, Z, 14, 3, 50, 340, (g, i) => { g.position.y += 10 + (i % 4) * 8; const l = label('ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'[i * 3 % 27], ['#ff7fb6', '#7fd8ff', '#ffe066', '#9dff7a', '#ffffff'][i % 5], 9); g.add(l); const y0 = g.position.y; A.push(t => g.position.y = y0 + Math.sin(t * 0.8 + i) * 3); });
};

// ---------- más detalle alrededor de TODAS las pistas (instanciado: pocas draw calls) ----------
function surround(T, Q, Z, rnd) {
  const n = Q.hi ? 1 : 0.6, th = T.theme, look = T.cup.look;
  const kit = th === 'candy' ? [['#ff8fc0', '#7ee3c4', '#ffd36b', '#b9a2f7'], 'cupcake'] : th === 'sunflower' ? [['#ff7f50', '#ffd24a', '#ff8fc0', '#b98aff'], 'tulip'] : th === 'ice' ? [['#bfe6ff', '#ffc4e1', '#e4d4ff'], 'crystal'] : th === 'storm' ? [['#ff5fd2', '#5ff5ff', '#ffe066'], 'neon'] : [['#ff9ec7', '#7ee3c4', '#ffd36b', '#8fe3f0'], look === 'ocean' ? 'bubble' : look === 'book' ? 'bookstack' : 'starrock'];
  const [pal, kind] = kit, count = Math.round(70 * n);
  const parts = {
    cupcake: [[cyl(), '#f7d6a8', [0, 1, 0, 2.2, 2, 2.2], 0], [sph(), null, [0, 2.6, 0, 2.4, 1.4, 2.4], 1], [sphL(), '#ff3f5f', [0, 4.1, 0, 0.6, 0.6, 0.6], 0]],
    tulip: [[cyl(), '#5fb04a', [0, 2, 0, 0.18, 4, 0.18], 0], [sph(), null, [0, 4.4, 0, 0.9, 1.3, 0.9], 1], [sph(), '#5fb04a', [0.5, 1.4, 0, 0.6, 0.12, 0.3], 0]],
    crystal: [[geo('oct', () => new THREE.OctahedronGeometry(1, 0)), null, [0, 2.5, 0, 1.2, 3, 1.2], 1], [geo('oct', () => new THREE.OctahedronGeometry(1, 0)), null, [1.2, 1.4, 0.4, 0.8, 1.8, 0.8], 1]],
    neon: [[cyl(), '#2a2050', [0, 3, 0, 0.3, 6, 0.3], 0], [sph(), null, [0, 6.6, 0, 2.2, 0.4, 2.2], 2], [sph(), null, [0, 6.1, 0, 0.5, 0.5, 0.5], 2]],
    bubble: [[sph(), null, [0, 6, 0, 1.6, 1.6, 1.6], 3], [sph(), null, [1.4, 9, 0.5, 0.9, 0.9, 0.9], 3]],
    bookstack: [[box(), null, [0, 0.6, 0, 4, 1.2, 3], 1], [box(), null, [0.3, 1.8, 0, 3.6, 1.2, 2.8], 1], [box(), '#fffaf0', [0.1, 2.9, 0.2, 3.2, 1, 2.6], 0]],
    starrock: [[geo('ico', () => new THREE.IcosahedronGeometry(1, 0)), null, [0, 0, 0, 2, 1.6, 2], 1], [geo('oct', () => new THREE.OctahedronGeometry(1, 0)), '#fff6a0', [0, 2.4, 0, 0.6, 1.2, 0.6], 2]],
  }[kind];
  const ims = parts.map(([g, c, , mode]) => { const m = toon(c || '#ffffff', mode === 2 ? { emissive: '#ffffff', ei: 0.6, rim: 0 } : mode === 3 ? { opacity: 0.45, rim: 1 } : { rim: 0.5 }); const im = new THREE.InstancedMesh(g, m, count); T.group.add(im); return im; });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); let k = 0;
  for (let i = 0; i < count; i++) {
    const s = T.S[Math.floor(rnd() * T.N)], sd = rnd() < 0.5 ? -1 : 1, d = s.wall + (Z.space ? 6 : 10 + Math.max(0, s.p.y) * 2.5) + rnd() * 30;
    const x = s.p.x + s.right.x * sd * d, z = s.p.z + s.right.z * sd * d; const sc = 0.8 + rnd() * 0.8;
    if (Z.clear(x, z, 3 * sc) < 0 || T.inShortcut(x, z) != null) continue;
    const y = Z.space ? s.p.y - 3 - rnd() * 10 : -0.6; e.set(0, rnd() * 6.28, 0); q.setFromEuler(e); const base = new THREE.Matrix4().compose(new V3(x, y, z), q, new V3(sc, sc, sc)); const col = new THREE.Color(pal[Math.floor(rnd() * pal.length)]);
    parts.forEach(([, c, m], j) => { m4.multiplyMatrices(base, new THREE.Matrix4().compose(new V3(m[0], m[1], m[2]), new THREE.Quaternion(), new V3(m[3], m[4], m[5]))); ims[j].setMatrixAt(k, m4); if (!c) ims[j].setColorAt(k, col); });
    k++;
  }
  ims.forEach(im => { im.count = k; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; });
}

export function addXDeco(T, Q, rnd) {
  const Z = makeSpace(T, rnd), A = [];
  try { surround(T, Q, Z, rnd); } catch (e) { console.warn('surround', e); }
  const f = B[T.cup.xdeco]; if (f) f(T, Z, A);
  else if (MONU[T.cup.id]) { const want = { gominola: 26, girasol: 22, helada: 14, galaxia: 30, tormenta: 18, cielo: 18, sueno: 18, ballena: 14, biblioteca: 14 }[T.cup.id]; try { let g = center(T, Z, want, g => MONU[T.cup.id](g, A));
      if (!g) for (const sc of [1, 0.8, 0.62, 0.48]) { const p = Z.spot(want * sc * 0.55, 0, 380, 80); if (!p) continue; g = new THREE.Group(); g.position.copy(p); g.scale.setScalar(sc); let bd = 1e18, bs = null; for (let j = 0; j < T.N; j += 4) { const q = T.S[j], d = (q.p.x - p.x) ** 2 + (q.p.z - p.z) ** 2; if (d < bd) { bd = d; bs = q; } } g.rotation.y = Math.atan2(bs.p.x - p.x, bs.p.z - p.z); T.group.add(g); MONU[T.cup.id](g, A); try { monumentHalo(T, g, want * sc); } catch (e) {} break; }
      T.monu = g ? { x: g.position.x, y: g.position.y, z: g.position.z, s: g.scale.x * want } : { none: Z.centerR }; } catch (e) { console.warn('monu', e); } } // v26: monumento de los circuitos originales
  if (A.length) T.anims.push((t, dt, race) => { for (const a of A) a(t, dt, race); });
}
