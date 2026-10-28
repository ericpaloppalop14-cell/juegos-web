// ======================================================================
//  MOCHI RACERS v49 · DRAGÓN COLOSAL (versión divertida y rara)
//  Épico (alas de murciélago, cuernos, cola larga, fuego) pero en tono pastel del juego: camisa hawaiana con estampados locos,
//  collar de flores, zapatillas con calcetines de rayas, patito de goma en la cabeza, gafas de corazón, ojos saltones,
//  cuernos de bastón de caramelo, alas con estrellas y corazones, llamas arcoíris y confeti. Mantiene la interfaz
//  (root/head/eyes/mouth/wings/tail/reins/bit/anim) y el modelo de colisión/montura de v32.
// ======================================================================
import * as THREE from 'three';
import { toon, mesh, glowTex } from './gfx.js';
const V3 = THREE.Vector3, TAU = Math.PI * 2;
const G = {}, M = {};
const sg = (k, f) => G[k] || (G[k] = Object.assign(f(), { _shared: true }));
const mm = (k, f) => M[k] || (M[k] = f());
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.05, flatShading: true, ...o });
const C = h => new THREE.Color(h);
const mix = (o, a, b, k) => o.copy(a).lerp(b, k);
const PAST = ['#ff9cc8', '#c6a8ff', '#ffe27a', '#8fe8ff', '#9ef0c0', '#ffb98a'];

// ---------- texturas de lona (una sola vez) ----------
function ctex(w, h, draw, rep = true) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
const star = (x, r, c) => { x.fillStyle = c; x.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); x.fill(); };
const heart = (x, r, c) => { x.fillStyle = c; x.beginPath(); x.moveTo(0, r * 0.9); x.bezierCurveTo(-r * 1.6, -r * 0.1, -r * 0.7, -r * 1.2, 0, -r * 0.45); x.bezierCurveTo(r * 0.7, -r * 1.2, r * 1.6, -r * 0.1, 0, r * 0.9); x.fill(); };
const PR = { // estampados de camisa hawaiana (cada uno dibuja centrado en 0,0 con tamaño s)
  hibisco(x, s, c) { for (let k = 0; k < 5; k++) { x.save(); x.rotate(k * 1.2566); x.fillStyle = c; x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.ellipse(0, -s * 0.5, s * 0.34, s * 0.52, 0, 0, 7); x.fill(); x.stroke(); x.restore(); } x.fillStyle = '#ffe66b'; x.beginPath(); x.arc(0, 0, s * 0.16, 0, 7); x.fill(); x.strokeStyle = '#ff5a8a'; x.lineWidth = 4; x.beginPath(); x.moveTo(0, 0); x.lineTo(s * 0.4, -s * 0.5); x.stroke(); },
  pina(x, s) { x.fillStyle = '#ffd84a'; x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.ellipse(0, s * 0.12, s * 0.44, s * 0.62, 0, 0, 7); x.fill(); x.stroke(); x.strokeStyle = '#f2a52e'; x.lineWidth = 2; for (let i = -3; i <= 3; i++) { x.beginPath(); x.moveTo(i * s * 0.14 - s * 0.3, -s * 0.4); x.lineTo(i * s * 0.14 + s * 0.3, s * 0.6); x.moveTo(i * s * 0.14 + s * 0.3, -s * 0.4); x.lineTo(i * s * 0.14 - s * 0.3, s * 0.6); x.stroke(); }
    x.fillStyle = '#4fd69a'; for (let k = -2; k <= 2; k++) { x.save(); x.rotate(k * 0.4); x.beginPath(); x.moveTo(-s * 0.1, -s * 0.5); x.lineTo(0, -s * 1.1); x.lineTo(s * 0.1, -s * 0.5); x.fill(); x.restore(); } x.fillStyle = '#2a1840'; x.beginPath(); x.arc(-s * 0.14, s * 0.0, 3, 0, 7); x.arc(s * 0.14, s * 0.0, 3, 0, 7); x.fill(); },
  palma(x, s) { x.fillStyle = '#4fd69a'; x.strokeStyle = '#fff'; x.lineWidth = 2.5; for (let k = -3; k <= 3; k++) { x.save(); x.rotate(k * 0.42); x.beginPath(); x.ellipse(0, -s * 0.55, s * 0.17, s * 0.62, 0, 0, 7); x.fill(); x.stroke(); x.restore(); } x.strokeStyle = '#2a9a70'; x.lineWidth = 4; x.beginPath(); x.moveTo(0, s * 0.2); x.lineTo(0, -s * 0.9); x.stroke(); },
  donut(x, s) { x.strokeStyle = '#fff'; x.lineWidth = s * 0.5; x.beginPath(); x.arc(0, 0, s * 0.42, 0, 7); x.stroke(); x.strokeStyle = '#ff7fb5'; x.lineWidth = s * 0.4; x.beginPath(); x.arc(0, 0, s * 0.42, 0, 7); x.stroke(); x.strokeStyle = '#ffd0e4'; x.lineWidth = s * 0.2; x.beginPath(); x.arc(0, 0, s * 0.42, 0, 7); x.stroke(); const cs = ['#fff', '#8fe8ff', '#ffe66b', '#c6a8ff']; for (let k = 0; k < 10; k++) { x.save(); x.rotate(k * 0.63); x.fillStyle = cs[k % 4]; x.fillRect(s * 0.37, -2, 9, 4); x.restore(); } },
  flamenco(x, s) { x.fillStyle = '#ff6fa8'; x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.ellipse(0, s * 0.25, s * 0.42, s * 0.28, -0.3, 0, 7); x.fill(); x.stroke(); x.strokeStyle = '#ff6fa8'; x.lineWidth = s * 0.14; x.lineCap = 'round'; x.beginPath(); x.moveTo(s * 0.25, s * 0.1); x.bezierCurveTo(s * 0.6, -s * 0.2, -s * 0.2, -s * 0.3, s * 0.2, -s * 0.7); x.stroke(); x.fillStyle = '#ff6fa8'; x.beginPath(); x.arc(s * 0.22, -s * 0.72, s * 0.13, 0, 7); x.fill(); x.fillStyle = '#ffb347'; x.beginPath(); x.moveTo(s * 0.3, -s * 0.78); x.lineTo(s * 0.55, -s * 0.66); x.lineTo(s * 0.3, -s * 0.64); x.fill(); x.fillStyle = '#2a1840'; x.beginPath(); x.arc(s * 0.2, -s * 0.74, 2.5, 0, 7); x.fill(); x.strokeStyle = '#ffb347'; x.lineWidth = 3; x.beginPath(); x.moveTo(-s * 0.1, s * 0.45); x.lineTo(-s * 0.15, s * 0.9); x.moveTo(s * 0.1, s * 0.48); x.lineTo(s * 0.12, s * 0.9); x.stroke(); },
  pizza(x, s) { x.fillStyle = '#ffcf6a'; x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, s * 0.7); x.lineTo(-s * 0.5, -s * 0.5); x.lineTo(s * 0.5, -s * 0.5); x.closePath(); x.fill(); x.stroke(); x.strokeStyle = '#e9a24a'; x.lineWidth = s * 0.16; x.beginPath(); x.moveTo(-s * 0.5, -s * 0.5); x.lineTo(s * 0.5, -s * 0.5); x.stroke(); x.fillStyle = '#ff6a7a'; for (const [a, b] of [[0, -0.1], [-0.2, -0.3], [0.2, -0.3], [0, 0.25]]) { x.beginPath(); x.arc(a * s, b * s, s * 0.1, 0, 7); x.fill(); } },
  helado(x, s) { x.fillStyle = '#f4c27a'; x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.moveTo(-s * 0.3, 0); x.lineTo(s * 0.3, 0); x.lineTo(0, s * 0.9); x.closePath(); x.fill(); x.stroke(); x.fillStyle = '#ff9cc8'; x.beginPath(); x.arc(0, -s * 0.05, s * 0.38, 0, 7); x.fill(); x.stroke(); x.fillStyle = '#9ef0c0'; x.beginPath(); x.arc(0, -s * 0.5, s * 0.33, 0, 7); x.fill(); x.stroke(); x.fillStyle = '#ff5a6a'; x.beginPath(); x.arc(0, -s * 0.86, s * 0.1, 0, 7); x.fill(); },
  pato(x, s) { x.fillStyle = '#ffe34a'; x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.ellipse(0, s * 0.2, s * 0.5, s * 0.36, 0, 0, 7); x.fill(); x.stroke(); x.beginPath(); x.arc(s * 0.2, -s * 0.22, s * 0.27, 0, 7); x.fill(); x.stroke(); x.fillStyle = '#ff9a3a'; x.beginPath(); x.moveTo(s * 0.4, -s * 0.25); x.lineTo(s * 0.66, -s * 0.18); x.lineTo(s * 0.4, -s * 0.1); x.fill(); x.fillStyle = '#2a1840'; x.beginPath(); x.arc(s * 0.27, -s * 0.28, 3, 0, 7); x.fill(); },
  sol(x, s) { x.fillStyle = '#ffe66b'; for (let k = 0; k < 10; k++) { x.save(); x.rotate(k * 0.628); x.beginPath(); x.moveTo(-s * 0.1, -s * 0.45); x.lineTo(0, -s * 0.8); x.lineTo(s * 0.1, -s * 0.45); x.fill(); x.restore(); } x.beginPath(); x.arc(0, 0, s * 0.42, 0, 7); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 3; x.stroke(); x.fillStyle = '#2a1840'; x.beginPath(); x.arc(-s * 0.15, -s * 0.05, 3.5, 0, 7); x.arc(s * 0.15, -s * 0.05, 3.5, 0, 7); x.fill(); x.strokeStyle = '#2a1840'; x.lineWidth = 3; x.beginPath(); x.arc(0, s * 0.06, s * 0.16, 0.2, 2.9); x.stroke(); },
  estrella(x, s, c) { star(x, s * 0.6, c || '#fff27a'); },
  corazon(x, s, c) { heart(x, s * 0.5, c || '#ff6fa8'); },
};
const shirtTex = () => mm('shirtTex', () => ctex(1024, 512, (x, w, h) => {
  x.fillStyle = '#7fe0d4'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 9; i++) { x.strokeStyle = i % 2 ? '#a8f0e4' : '#5fd0c4'; x.lineWidth = 16; x.beginPath(); for (let px = 0; px <= w; px += 8) { const y = i * 64 + 14 + Math.sin(px / 38 + i) * 12; px ? x.lineTo(px, y) : x.moveTo(px, y); } x.stroke(); }
  for (let i = 0; i < 160; i++) { x.fillStyle = ['#ffffff55', '#ffe27a77', '#ff9cc877'][i % 3]; x.beginPath(); x.arc((i * 137) % w, (i * 71) % h, 3 + i % 4, 0, 7); x.fill(); }
  const names = ['hibisco', 'pina', 'flamenco', 'donut', 'pizza', 'palma', 'pato', 'helado', 'sol', 'hibisco', 'estrella', 'corazon', 'donut', 'pina', 'flamenco', 'pato'];
  const cols = ['#ff6fa8', '#fff27a', '#c6a8ff', '#ff9a5a', '#ffffff'];
  const cx = 8, cy = 4;
  for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) { const k = j * cx + i, nm = names[(i * 3 + j * 5) % names.length], px = (i + 0.5 + (j % 2) * 0.5) * (w / cx) + ((k * 37) % 17 - 8), py = (j + 0.5) * (h / cy) + ((k * 53) % 15 - 7), rot = (((k * 29) % 9) - 4) * 0.13, s = 46 + (k % 3) * 8;
    for (const ox of [-w, 0, w]) { x.save(); x.translate(px + ox, py); x.rotate(rot); PR[nm](x, s, cols[k % cols.length]); x.restore(); } }
}));
const wingTex = () => mm('wingTex', () => ctex(512, 512, (x, w, h) => {
  const g = x.createLinearGradient(0, h, w, 0); g.addColorStop(0, '#b9a2ff'); g.addColorStop(0.5, '#ffb3dc'); g.addColorStop(1, '#ffe0a8'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) { x.save(); x.translate((i * 97) % w, (i * 151) % h); x.rotate(i * 0.7); (i % 3 === 0 ? star : i % 3 === 1 ? heart : (xx, r, c) => { xx.fillStyle = c; xx.beginPath(); xx.arc(0, 0, r * 0.7, 0, 7); xx.fill(); })(x, 12 + i % 4 * 5, ['#ffffffcc', '#fff27acc', '#8fe8ffcc', '#ff6fa8cc'][i % 4]); x.restore(); }
  x.strokeStyle = '#ffffff88'; x.lineWidth = 3; for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(0, h * (0.1 + i * 0.2)); x.quadraticCurveTo(w * 0.5, h * (0.0 + i * 0.2), w, h * (0.2 + i * 0.2)); x.stroke(); }
}));
const saddleTex = () => mm('saddleTex', () => ctex(256, 256, (x, w, h) => { x.fillStyle = '#ffd1e8'; x.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#b9f0ff' : '#fff4a8'; x.fillRect(0, i * 32, w, 16); } for (let i = 0; i < 20; i++) { x.fillStyle = '#ffffffaa'; x.beginPath(); x.arc((i * 61) % w, (i * 37) % h, 6, 0, 7); x.fill(); } }));
const mats = () => ({
  skin: mm('skin', () => std('#ffffff', { vertexColors: true })),
  scale: mm('scale', () => std('#ffffff', { roughness: 0.4, metalness: 0.1 })),
  bone: mm('bone', () => std('#fff4e0', { roughness: 0.55 })),
  horn: mm('horn', () => std('#ffffff', { vertexColors: true, roughness: 0.3, metalness: 0.0, flatShading: false })),
  gold: mm('gold', () => std('#ffe27a', { roughness: 0.3, metalness: 0.3, emissive: '#7a5a00', emissiveIntensity: 0.25 })),
  dark: mm('dark', () => std('#5a3a7a', { roughness: 0.6 })),
  wingBone: mm('wingBone', () => std('#9a86e8', { roughness: 0.45 })),
  membrane: mm('membrane', () => new THREE.MeshStandardMaterial({ map: wingTex(), emissiveMap: wingTex(), color: '#ffffff', roughness: 0.6, side: THREE.DoubleSide, emissive: '#ffffff', emissiveIntensity: 0.3, transparent: true, opacity: 0.96 })),
  shirt: mm('shirt', () => new THREE.MeshStandardMaterial({ map: shirtTex(), roughness: 0.85, metalness: 0, side: THREE.DoubleSide })),
  fireO: mm('fireO', () => new THREE.MeshBasicMaterial({ color: '#ff8fd8', transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false })),
  fireM: mm('fireM', () => new THREE.MeshBasicMaterial({ color: '#ffe066', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })),
  fireI: mm('fireI', () => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })),
  fireC: mm('fireC', () => new THREE.MeshBasicMaterial({ color: '#7ff5ff', transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })),
  white: mm('white', () => new THREE.MeshBasicMaterial({ color: '#ffffff' })),
  black: mm('black', () => new THREE.MeshBasicMaterial({ color: '#2a1840' })),
  blush: mm('blush', () => new THREE.MeshBasicMaterial({ color: '#ff8fb8', transparent: true, opacity: 0.8 })),
  tongue: mm('tongue', () => std('#ff7aa8', { roughness: 0.4, flatShading: false })),
  mouth: mm('mouth', () => new THREE.MeshBasicMaterial({ color: '#ff8fb8' })),
});
const cone = (n = 5) => sg('cone' + n, () => new THREE.ConeGeometry(1, 1, n));
const boxg = () => sg('box', () => new THREE.BoxGeometry(1, 1, 1));
const octa = () => sg('octa', () => new THREE.OctahedronGeometry(1, 0));
const ico = () => sg('ico', () => new THREE.IcosahedronGeometry(1, 1));
const sph = () => sg('sphx', () => new THREE.SphereGeometry(1, 14, 10));
const cylg = () => sg('cylx', () => new THREE.CylinderGeometry(1, 1, 1, 10));
const pastelMat = c => mm('p' + c, () => std(c, { roughness: 0.45 }));

// ---------- tubo a lo largo de una curva (radios rx/ry por punto de control), UV y color por vértice ----------
function tubeGeo(pts, rx, ry, radial, segs, col, cap = true, t0 = 0, t1 = 1, grow = 0) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new V3(...p)), false, 'catmullrom', 0.5), n = pts.length - 1;
  const pos = [], colr = [], uv = [], idx = [], X = new V3(), Y = new V3(), T = new V3(), P = new V3(), c = new THREE.Color(), RV = radial + 1;
  const lerpR = (arr, t) => { const f = t * n, i = Math.min(n - 1, Math.floor(f)), k = f - i; return arr[i] + (arr[i + 1] - arr[i]) * k; };
  const frames = [];
  for (let s = 0; s <= segs; s++) {
    const t = t0 + (t1 - t0) * s / segs; curve.getPoint(t, P); curve.getTangent(t, T).normalize();
    const ref = Math.abs(T.y) > 0.95 ? new V3(0, 0, 1) : new V3(0, 1, 0);
    X.crossVectors(ref, T).normalize(); Y.crossVectors(T, X).normalize();
    const rib = s % 2 && col && col.ribs ? 0.96 : 1, a = lerpR(rx, t) * rib + grow, b = lerpR(ry, t) * rib + grow;
    frames.push({ P: P.clone(), X: X.clone(), Y: Y.clone(), T: T.clone(), a, b, t });
    for (let r = 0; r <= radial; r++) { const an = r / radial * TAU, ca = Math.cos(an), sa = Math.sin(an);
      pos.push(P.x + X.x * a * ca + Y.x * b * sa, P.y + X.y * a * ca + Y.y * b * sa, P.z + X.z * a * ca + Y.z * b * sa); uv.push(r / radial, s / segs);
      if (col) { col.fn(c, t, ca, sa, s); colr.push(c.r, c.g, c.b); } }
  }
  for (let s = 0; s < segs; s++) for (let r = 0; r < radial; r++) { const a = s * RV + r, b = a + 1, cc = a + RV, d = b + RV; idx.push(a, cc, b, b, cc, d); }
  if (cap) for (const [s, flip] of [[0, true], [segs, false]]) { const f = frames[s], ci = pos.length / 3; pos.push(f.P.x, f.P.y, f.P.z); uv.push(0.5, s ? 1 : 0); if (col) { col.fn(c, f.t, 0, s ? 1 : -1, s); colr.push(c.r, c.g, c.b); }
    for (let r = 0; r < radial; r++) { const a = s * RV + r, b = a + 1; flip ? idx.push(ci, a, b) : idx.push(ci, b, a); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); if (col) g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const nr = g.attributes.normal; for (let s = 0; s <= segs; s++) { const a = s * RV, b = a + radial; const x = nr.getX(a) + nr.getX(b), y = nr.getY(a) + nr.getY(b), z = nr.getZ(a) + nr.getZ(b), l = Math.hypot(x, y, z) || 1; nr.setXYZ(a, x / l, y / l, z / l); nr.setXYZ(b, x / l, y / l, z / l); }
  g.userData.curve = curve; g.userData.frames = frames; return Object.assign(g, { _shared: true });
}
// fusiona partes {g,m,c} en una geometría con color por vértice (zapatillas, flores...)
function merge(parts) {
  const P = [], N = [], Cc = []; for (const { g, m, c } of parts) { const x = g.index ? g.toNonIndexed() : g.clone(); x.applyMatrix4(m); const p = x.attributes.position.array, n = x.attributes.normal.array, col = new THREE.Color(c);
    for (let i = 0; i < p.length; i++) { P.push(p[i]); N.push(n[i]); } for (let i = 0; i < p.length / 3; i++) Cc.push(col.r, col.g, col.b); x.dispose(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3)); return Object.assign(g, { _shared: true });
}
const mx = (p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) => new THREE.Matrix4().compose(new V3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new V3(...s));

// ---------- torso + cuello ----------
const BODY_PTS = [[0, 2.3, -2.7], [0, 2.4, -1.4], [0, 2.5, 0.2], [0, 2.7, 1.8], [0, 3.3, 3.1], [0, 4.2, 4.2], [0, 5.0, 5.2], [0, 5.3, 5.9]];
const BODY_RX = [0.85, 1.55, 1.85, 1.7, 1.3, 1.0, 0.82, 0.78], BODY_RY = [0.8, 1.45, 1.72, 1.6, 1.25, 0.95, 0.78, 0.74];
const SH0 = 0.1, SH1 = 0.585; // tramo cubierto por la camisa
function bodyGeo() {
  const top = C('#6fd6bd'), side = C('#9ceed2'), belly = C('#ffe0a8'), belly2 = C('#ffc8d8');
  return sg('body', () => tubeGeo(BODY_PTS, BODY_RX, BODY_RY, 14, 44, { ribs: true, fn: (o, t, ca, sa, s) => { if (sa < -0.35) mix(o, belly2, belly, (s % 2) * 0.8 + 0.1); else mix(o, side, top, Math.max(0, sa) * 0.9); } }));
}
function shirtGeo() { return sg('shirt', () => tubeGeo(BODY_PTS, BODY_RX, BODY_RY, 20, 20, null, false, SH0, SH1, 0.1)); }
function addScales(root, bg) {
  const fr = bg.userData.frames, list = [], rows = [];
  for (let s = 2; s < fr.length - 6; s++) { const t = s / (fr.length - 1); if (t > SH0 + 0.02 && t < SH1 - 0.01) continue; rows.push(s); }
  const angs = [-0.2, 0.35, 0.8, 1.25, 1.7, 2.15, 2.6, 2.95];
  rows.forEach((s, ri) => { const f = fr[s]; for (const sd of [-1, 1]) angs.forEach((a0, ai) => { const an = a0 + (ri % 2) * 0.22, ca = Math.cos(an), sa = Math.sin(an), xv = sd * ca;
    const p = new V3().copy(f.P).addScaledVector(f.X, f.a * xv * 1.03).addScaledVector(f.Y, f.b * sa * 1.03), nrm = new V3().addScaledVector(f.X, xv / f.a).addScaledVector(f.Y, sa / f.b).normalize();
    list.push({ p, nrm, T: f.T, k: (ri * 2 + ai) % PAST.length, sz: 0.9 + (f.a > 1 ? 0.25 : 0) }); }); });
  const im = new THREE.InstancedMesh(sg('scaleG', () => new THREE.OctahedronGeometry(1, 0)), mats().scale, list.length);
  const M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qt = new THREE.Quaternion().setFromAxisAngle(new V3(1, 0, 0), -0.38), cols = PAST.map(C);
  list.forEach((o, i) => { const z = o.T.clone().multiplyScalar(-1), y = o.nrm.clone(), x = new V3().crossVectors(y, z).normalize(); z.crossVectors(x, y).normalize(); M4.makeBasis(x, y, z); q.setFromRotationMatrix(M4).multiply(qt);
    M4.compose(o.p, q, new V3(0.24 * o.sz, 0.09, 0.36 * o.sz)); im.setMatrixAt(i, M4); im.setColorAt(i, cols[o.k]); });
  im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.frustumCulled = false; root.add(im);
}
function hornGeo(pts, r0, k) {
  return tubeGeo(pts, pts.map((_, i) => r0 * (1 - i / pts.length)), pts.map((_, i) => r0 * (1 - i / pts.length)), 8, 22, { fn: (o, t) => { const st = Math.floor(t * 13 + k) % 2; mix(o, st ? C('#ff9cc8') : C('#fff4f8'), C('#ffe27a'), Math.max(0, (t - 0.85) * 5)); } });
}
// membrana del ala (con UV para el estampado)
function wingGeo() {
  return sg('wing49', () => {
    const W = [4.4, 1.5], tips = [[11.2, 0.6], [10.2, -3.4], [7.6, -6.0], [4.6, -6.8]], S = [0.3, 0.0], B = [0.5, -3.6], pos = [], idx = [];
    const vtx = (x, z) => { pos.push(x, 0, z); return pos.length / 3 - 1; }; const w = vtx(W[0], W[1]);
    const edge = (a, b, nSeg, sag) => { const out = []; for (let i = 0; i <= nSeg; i++) { const k = i / nSeg, x = a[0] + (b[0] - a[0]) * k, z = a[1] + (b[1] - a[1]) * k, dx = W[0] - (a[0] + b[0]) / 2, dz = W[1] - (a[1] + b[1]) / 2, L = Math.hypot(dx, dz) || 1, s = Math.sin(k * Math.PI) * sag; out.push(vtx(x + dx / L * s, z + dz / L * s)); } return out; };
    for (let i = 0; i < tips.length - 1; i++) { const e = edge(tips[i], tips[i + 1], 8, 1.7); for (let j = 0; j < e.length - 1; j++) idx.push(w, e[j], e[j + 1]); }
    const e2 = edge(tips[3], B, 6, 1.3); for (let j = 0; j < e2.length - 1; j++) idx.push(w, e2[j], e2[j + 1]); const s = vtx(S[0], S[1]), b = e2[e2.length - 1]; idx.push(w, b, s);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    const p = g.attributes.position, uv = []; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); uv.push(x / 11.5, (z + 7.2) / 8.6); p.setY(i, Math.sin(x / 11.2 * Math.PI) * 0.35 - Math.max(0, -z) * 0.08); }
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g; });
}
function bone(parent, a, b, r0, r1, m) {
  const A = new V3(...a), B = new V3(...b), d = B.clone().sub(A), L = d.length(), g = sg(`bn${r0}_${r1}`, () => new THREE.CylinderGeometry(r1, r0, 1, 7));
  const o = new THREE.Mesh(g, m); o.position.copy(A).addScaledVector(d, 0.5); o.scale.set(1, L, 1); o.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); parent.add(o); return o;
}
const heartShape = () => { const s = new THREE.Shape(); s.moveTo(0, -0.9); s.bezierCurveTo(-1.5, 0.1, -0.7, 1.0, 0, 0.4); s.bezierCurveTo(0.7, 1.0, 1.5, 0.1, 0, -0.9); return s; };
const shoeGeo = (k) => sg('shoe' + k, () => { const base = k ? '#ffb3dc' : '#9fe6ff', acc = k ? '#fff27a' : '#ff8fb8', sb = new THREE.SphereGeometry(1, 12, 9), bx = new THREE.BoxGeometry(1, 1, 1);
  return merge([{ g: bx, m: mx([0, 0.09, 0.15], [0, 0, 0], [0.62, 0.16, 1.25]), c: '#ffffff' }, { g: sb, m: mx([0, 0.3, 0.05], [0, 0, 0], [0.33, 0.28, 0.62]), c: base }, { g: sb, m: mx([0, 0.25, 0.62], [0, 0, 0], [0.34, 0.24, 0.34]), c: '#ffffff' },
    { g: sb, m: mx([0, 0.46, -0.28], [0, 0, 0], [0.28, 0.18, 0.2]), c: acc }, { g: bx, m: mx([0, 0.52, 0.18], [0.35, 0, 0], [0.4, 0.04, 0.12]), c: '#ffffff' }, { g: bx, m: mx([0, 0.46, 0.34], [0.35, 0, 0], [0.4, 0.04, 0.12]), c: '#ffffff' }, { g: bx, m: mx([0, 0.4, 0.5], [0.35, 0, 0], [0.4, 0.04, 0.12]), c: '#ffffff' },
    { g: sb, m: mx([0.34, 0.3, 0.1], [0, 0, 0], [0.04, 0.12, 0.25]), c: acc }, { g: sb, m: mx([-0.34, 0.3, 0.1], [0, 0, 0], [0.04, 0.12, 0.25]), c: acc }]); });

export function buildDragon() {
  const m = mats(), g = new THREE.Group(), u = g.userData;
  const root = new THREE.Group(); root.position.y = -3.7; g.add(root); u.root = root;
  const bg = bodyGeo(); const body = new THREE.Mesh(bg, m.skin); body.frustumCulled = false; root.add(body); addScales(root, bg);
  // ---- CAMISA HAWAIANA con estampados locos + cuello, botones y mangas ----
  const shirt = new THREE.Mesh(shirtGeo(), m.shirt); shirt.frustumCulled = false; root.add(shirt);
  { const f = bg.userData.frames[Math.round(SH1 * 44)]; // cuello de la camisa (dos solapas) y botones
    for (const sd of [-1, 1]) { const lap = mesh(cone(3), m.shirt, root, [sd * 0.55, f.P.y + f.b * 0.75, f.P.z + 0.12], [-0.35, sd * 0.5, sd * 0.35], [0.5, 0.75, 0.05]); lap.rotation.z = sd * 0.5; }
    for (let i = 0; i < 4; i++) { const s0 = Math.round((SH0 + 0.1 + i * 0.1) * 44), fb = bg.userData.frames[s0]; mesh(sph(), pastelMat(PAST[i + 1]), root, [0, fb.P.y - fb.b * 1.06 - 0.02, fb.P.z], null, [0.16, 0.08, 0.16]); } }
  // ---- collar de flores (lei) en el cuello ----
  { const fr = bg.userData.frames[Math.round(0.67 * 44)], N = 16, fi = new THREE.InstancedMesh(sg('leiP', () => new THREE.SphereGeometry(1, 8, 6)), std('#ffffff', { roughness: 0.5 }), N * 2), M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), fc = ['#ff6fa8', '#fff27a', '#ffffff', '#c6a8ff', '#ff9a5a', '#8fe8ff'];
    for (let i = 0; i < N; i++) { const an = i / N * TAU, ca = Math.cos(an), sa = Math.sin(an), p = fr.P.clone().addScaledVector(fr.X, (fr.a + 0.15) * ca * 1.02).addScaledVector(fr.Y, (fr.b + 0.15) * sa * 1.02).addScaledVector(fr.T, -0.2 * Math.max(0, -sa) - 0.1);
      const nr = new V3().addScaledVector(fr.X, ca).addScaledVector(fr.Y, sa).normalize(); q.setFromUnitVectors(new V3(0, 0, 1), nr);
      M4.compose(p, q, new V3(0.3, 0.3, 0.12)); fi.setMatrixAt(i, M4); fi.setColorAt(i, C(fc[i % fc.length])); M4.compose(p.clone().addScaledVector(nr, 0.06), q, new V3(0.1, 0.1, 0.1)); fi.setMatrixAt(N + i, M4); fi.setColorAt(N + i, C(i % 2 ? '#ffe27a' : '#ff6fa8')); }
    fi.instanceMatrix.needsUpdate = true; fi.instanceColor.needsUpdate = true; fi.frustumCulled = false; root.add(fi); u.lei = fi; }
  // ---- púas dorsales: gominolas de colores ----
  const fr = bg.userData.frames;
  for (let s = 2, k = 0; s < fr.length - 3; s += 3, k++) { const f = fr[s]; if (f.P.z > -1.0 && f.P.z < 1.5) continue; const h = 0.5 + Math.sin(s / fr.length * Math.PI) * 0.7, on = f.t > SH0 && f.t < SH1 ? 0.14 : 0;
    mesh(cone(6), pastelMat(PAST[k % PAST.length]), root, [f.P.x, f.P.y + f.b * 0.98 + on, f.P.z], [-0.55 - (s > 28 ? 0.3 : 0), 0, 0], [0.28 + h * 0.2, h, 0.28 + h * 0.2]); }
  // ---- piernas con calcetines de rayas y zapatillas ----
  const legG = hind => sg('leg' + hind, () => tubeGeo(hind ? [[0, 0, 0], [0.35, -0.9, -0.3], [0.1, -1.7, 0.15], [0.12, -2.1, 0.5]] : [[0, 0, 0], [0.25, -0.8, 0.15], [0.05, -1.6, 0.2], [0.05, -1.95, 0.45]], hind ? [0.75, 0.6, 0.34, 0.3] : [0.55, 0.42, 0.28, 0.26], hind ? [0.8, 0.55, 0.3, 0.3] : [0.55, 0.42, 0.28, 0.26], 8, 14, { fn: (o, t) => { if (t > 0.62) { mix(o, Math.floor((t - 0.62) * 30) % 2 ? C('#ffffff') : C('#ff9cc8'), C('#ffffff'), 0); } else mix(o, C('#9ceed2'), C('#6fd6bd'), t); } }));
  for (const [x, z, h, y0] of [[1.55, 1.9, 0, 2.2], [1.7, -1.5, 1, 2.1]]) for (const sd of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(sd * x, y0, z); root.add(leg); const lm = new THREE.Mesh(legG(h), m.skin); lm.scale.x = sd; leg.add(lm);
    const fy = h ? -2.12 : -1.97, fz = h ? 0.5 : 0.45; const sh = new THREE.Mesh(shoeGeo(h), mm('shoeM', () => std('#ffffff', { vertexColors: true, roughness: 0.55, flatShading: false }))); sh.position.set(sd * (h ? 0.12 : 0.05), fy - 0.12, fz - 0.2); leg.add(sh);
    if (!h) { const sl = new THREE.Mesh(sg('sleeve', () => new THREE.CylinderGeometry(0.66, 0.78, 0.8, 14, 1, true)), m.shirt); sl.position.set(0, -0.15, 0); leg.add(sl); mesh(sg('torus6', () => new THREE.TorusGeometry(0.75, 0.05, 6, 16)), pastelMat('#ffffff'), leg, [0, -0.55, 0], [Math.PI / 2, 0, 0], 1); }
    else mesh(ico(), pastelMat('#8fe3c8'), leg, [sd * 0.1, 0.0, -0.1], null, [0.9, 0.85, 0.95]); }
  // ---- alas ----
  u.wings = [-1, 1].map(sd => { const w = new THREE.Group(); w.position.set(sd * 1.5, 4.1, 1.3); root.add(w);
    const wing = new THREE.Group(); wing.scale.x = sd; w.add(wing);
    const mem = new THREE.Mesh(wingGeo(), m.membrane); mem.frustumCulled = false; wing.add(mem);
    const S = [0.3, 0.0, 0.0], Wp = [4.4, 0.05, 1.5];
    bone(wing, S, [2.3, 0.45, 0.95], 0.34, 0.28, m.wingBone); bone(wing, [2.3, 0.45, 0.95], Wp, 0.28, 0.22, m.wingBone); mesh(sph(), pastelMat('#ffe27a'), wing, Wp, null, 0.34);
    [[11.2, 0.6], [10.2, -3.4], [7.6, -6.0], [4.6, -6.8]].forEach(([x, z], i) => { bone(wing, Wp, [x, 0.0, z], 0.15, 0.04, m.wingBone); const cl = mesh(cone(5), pastelMat(PAST[i]), wing, [x, 0.0, z], null, [0.14, 0.55, 0.14]); cl.quaternion.setFromUnitVectors(new V3(0, 1, 0), new V3(x - Wp[0], 0, z - Wp[2]).normalize()); mesh(sph(), pastelMat(PAST[(i + 2) % 6]), wing, [x, 0.0, z], null, 0.2); });
    mesh(cone(5), m.bone, wing, [4.9, 0.1, 2.4], [Math.PI / 2 - 0.4, 0, -0.4], [0.16, 0.9, 0.16]);
    return w; });
  // ---- cola segmentada con rayas pastel, lazo y hoja de caramelo ----
  u.tail = []; { let par = root, pos = [0, 2.3, -2.9]; const N = 11;
    for (let i = 0; i < N; i++) { const s = new THREE.Group(); s.position.set(...pos); par.add(s); u.tail.push(s);
      const rF = 0.95 * Math.pow(1 - i / (N + 1), 1.15) + 0.12, rB = 0.95 * Math.pow(1 - (i + 1) / (N + 1), 1.15) + 0.12, L = 0.95 - i * 0.025, base = C(i % 2 ? '#8fe8d0' : '#6fd6bd');
      const sgm = sg(`tseg${i}`, () => { const cg = new THREE.CylinderGeometry(rB, rF, L, 9, 1); cg.rotateX(-Math.PI / 2); cg.translate(0, 0, -L / 2); const p = cg.attributes.position, cl = [], c = new THREE.Color();
        for (let k = 0; k < p.count; k++) { const y = p.getY(k) / rF; if (y < -0.35) c.copy(C('#ffe0a8')); else c.copy(base).lerp(C(PAST[i % PAST.length]), 0.55 + 0.15 * Math.max(0, y)); cl.push(c.r, c.g, c.b); } cg.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3)); cg.computeVertexNormals(); return cg; });
      s.add(new THREE.Mesh(sgm, m.skin));
      const h = rF * 1.15 + 0.1; mesh(cone(6), pastelMat(PAST[(i + 1) % PAST.length]), s, [0, rF * 0.95, -L * 0.5], [-0.7, 0, 0], [rF * 0.5, h, rF * 0.5]);
      if (i % 2 === 0 && i < 8) for (const sd of [-1, 1]) mesh(sph(), pastelMat(PAST[(i + 3) % PAST.length]), s, [sd * rF * 0.92, rF * 0.1, -L * 0.45], null, [rF * 0.2, rF * 0.2, rF * 0.2]);
      if (i === 3) for (const sd of [-1, 1]) { mesh(cone(3), pastelMat('#ff6fa8'), s, [sd * 0.34, rF * 0.95, -L * 0.3], [Math.PI / 2, 0, sd * 1.2], [0.4, 0.5, 0.1]); }
      if (i === 3) mesh(sph(), pastelMat('#ff6fa8'), s, [0, rF * 0.95, -L * 0.3], null, [0.18, 0.16, 0.16]);
      pos = [0, 0, -L]; par = s; }
    const bl = new THREE.Group(); bl.position.set(0, 0, -0.9); par.add(bl);
    mesh(octa(), pastelMat('#ff9cc8'), bl, [0, 0, -0.7], null, [0.1, 0.9, 1.4]); mesh(octa(), mm('bladeG', () => new THREE.MeshBasicMaterial({ color: '#ffe27a', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })), bl, [0, 0, -0.7], null, [0.16, 1.05, 1.6]);
    for (const sd of [-1, 1]) mesh(sph(), pastelMat('#c6a8ff'), bl, [sd * 0.15, 0, -0.1], null, 0.2);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#ffb3e6'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.7 })); gl.scale.setScalar(2.4); gl.position.set(0, 0, -0.9); bl.add(gl); }
  // ---- cabeza ----
  const head = new THREE.Group(); head.position.set(0, 5.35, 6.2); head.scale.setScalar(1.25); root.add(head); u.head = head;
  head.add(new THREE.Mesh(sg('skull', () => tubeGeo([[0, 0.1, -1.1], [0, 0.15, -0.1], [0, 0.0, 1.1], [0, -0.12, 2.3], [0, -0.18, 2.95]], [0.85, 0.95, 0.72, 0.52, 0.4], [0.78, 0.82, 0.58, 0.4, 0.3], 9, 12, { fn: (o, t, ca, sa) => { mix(o, C('#9ceed2'), C('#6fd6bd'), Math.max(0, sa)); if (sa < -0.5) o.copy(C('#ffe0a8')); } })), m.skin));
  const jaw = new THREE.Group(); jaw.position.set(0, -0.42, -0.1); jaw.rotation.x = 0.32; head.add(jaw); u.jaw = jaw;
  jaw.add(new THREE.Mesh(sg('jawG', () => tubeGeo([[0, 0, 0], [0, -0.04, 1.2], [0, 0.0, 2.5], [0, 0.04, 2.85]], [0.62, 0.52, 0.3, 0.22], [0.2, 0.18, 0.12, 0.1], 8, 8, { fn: (o, t, ca, sa) => { mix(o, C('#ffd0a0'), C('#9ceed2'), Math.max(0, sa)); } })), m.skin));
  mesh(sph(), m.mouth, jaw, [0, 0.16, 1.4], null, [0.42, 0.06, 1.2]);
  u.tongue = mesh(sph(), m.tongue, jaw, [0.12, 0.2, 2.3], [0.1, 0, 0], [0.22, 0.05, 0.85]); mesh(sph(), pastelMat('#ff5a8a'), jaw, [0.12, 0.2, 3.15], null, [0.25, 0.07, 0.25]);
  for (const sd of [-1, 1]) { for (let i = 0; i < 4; i++) mesh(cone(4), m.bone, jaw, [sd * (0.42 - i * 0.06), 0.22, 0.5 + i * 0.62], null, [0.07, 0.26 + (i % 2) * 0.06, 0.07]);
    for (let i = 0; i < 4; i++) mesh(cone(4), m.bone, head, [sd * (0.56 - i * 0.06), -0.4, 0.4 + i * 0.6], [Math.PI, 0, 0], [0.09, 0.26 + (i % 2) * 0.22, 0.09]); }
  for (const sd of [-1, 1]) mesh(boxg(), m.white, head, [sd * 0.1, -0.5, 2.6], null, [0.16, 0.34, 0.1]); // dientes de conejo
  // cuernos de bastón de caramelo + cuernitos de las mejillas
  const hg = sg('hornG', () => hornGeo([[0.45, 0.7, -0.3], [0.85, 1.3, -0.9], [1.15, 1.75, -1.9], [1.0, 2.35, -2.9]], 0.3, 0)), hg2 = sg('hornG2', () => hornGeo([[0.8, 0.0, -0.75], [1.25, 0.25, -1.3], [1.6, 0.9, -1.9]], 0.2, 1));
  for (const sd of [-1, 1]) { const h1 = new THREE.Mesh(hg, m.horn); h1.scale.x = sd; head.add(h1); const h2 = new THREE.Mesh(hg2, m.horn); h2.scale.x = sd; head.add(h2);
    const fin = new THREE.Group(); fin.position.set(sd * 0.75, -0.05, -0.6); fin.rotation.y = sd * 0.6; head.add(fin);
    for (let i = 0; i < 3; i++) mesh(cone(3), mm('finM' + i, () => new THREE.MeshStandardMaterial({ color: ['#ffb3dc', '#ffe27a', '#8fe8ff'][i], emissive: ['#ff6fa8', '#ffcc33', '#4fd0ff'][i], emissiveIntensity: 0.3, side: THREE.DoubleSide, flatShading: true })), fin, [0, -0.1 + i * 0.1, -0.2 - i * 0.2], [-Math.PI / 2 + (i - 1) * 0.3, 0, 0], [0.04, 1.4 - i * 0.3, 0.35]);
    mesh(cone(4), m.dark, head, [sd * 0.22, 0.02, 3.0], [Math.PI / 2, 0, 0], [0.07, 0.12, 0.07]);
    mesh(sph(), m.blush, head, [sd * 0.78, -0.12, 1.0], [0, sd * 0.9, 0], [0.26, 0.15, 0.05]); // coloretes
    // cejas graciosas: una arriba y una enfadada
    mesh(boxg(), pastelMat('#4fb89c'), head, [sd * 0.5, sd > 0 ? 0.92 : 0.78, 0.9], [0, 0, sd > 0 ? 0.25 : -0.3], [0.55, 0.1, 0.12]); }
  // ojos saltones (para el parpadeo se escala en Y; las pupilas bailan)
  u.eyes = [-1, 1].map((sd, i) => { const e = new THREE.Group(); e.position.set(sd * 0.52, 0.42, 0.85); head.add(e);
    mesh(sph(), m.white, e, [0, 0, 0], null, [0.34, 0.34, 0.3]); const pup = new THREE.Group(); e.add(pup); mesh(sph(), m.black, pup, [0, 0, 0.26], null, [0.16, 0.16, 0.08]); mesh(sph(), m.white, pup, [-0.04, 0.05, 0.33], null, 0.045); e.userData.pup = pup;
    const rim = mesh(sg('eyeRim', () => new THREE.TorusGeometry(0.33, 0.045, 6, 16)), pastelMat('#4fb89c'), e, [0, 0, 0.0], null, [1, 1, 0.8]); return e; });
  // gafas de corazón subidas a la frente
  { const gl = new THREE.Group(); gl.position.set(0, 0.95, 0.25); gl.rotation.x = -0.8; gl.scale.setScalar(1.35); head.add(gl);
    const hg3 = sg('heartLens', () => new THREE.ExtrudeGeometry(heartShape(), { depth: 0.08, bevelEnabled: false })); const lm = [mm('lensA', () => std('#ff8fb8', { roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.9, flatShading: false })), mm('lensB', () => std('#8fe8ff', { roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.9, flatShading: false }))];
    [-1, 1].forEach((sd, i) => { mesh(hg3, lm[i], gl, [sd * 0.4, 0, 0], null, [0.36, 0.36, 1]); mesh(sph(), m.white, gl, [sd * 0.4 - 0.1, 0.12, 0.12], null, [0.08, 0.04, 0.02]); mesh(cylg(), m.white, gl, [sd * 0.78, 0.0, -0.3], [Math.PI / 2, 0, 0], [0.025, 0.7, 0.025]); }); mesh(cylg(), m.white, gl, [0, 0.12, 0.04], [0, 0, Math.PI / 2], [0.025, 0.18, 0.025]); }
  // patito de goma entre los cuernos
  { const du = new THREE.Group(); du.position.set(0, 1.0, -0.55); du.scale.setScalar(0.95); head.add(du); u.duck = du; const y = pastelMat('#ffe34a');
    mesh(sph(), y, du, [0, 0.22, 0], null, [0.38, 0.3, 0.46]); mesh(sph(), y, du, [0, 0.58, 0.3], null, 0.24); mesh(cone(4), pastelMat('#ff9a3a'), du, [0, 0.54, 0.62], [Math.PI / 2, 0, 0], [0.14, 0.22, 0.05]); mesh(sph(), y, du, [0, 0.3, -0.42], [0.4, 0, 0], [0.12, 0.14, 0.2]);
    for (const sd of [-1, 1]) { mesh(sph(), m.black, du, [sd * 0.1, 0.64, 0.46], null, 0.04); mesh(sph(), y, du, [sd * 0.34, 0.24, 0.0], null, [0.1, 0.18, 0.28]); } }
  // hibisco gigante en la oreja
  { const fl = new THREE.Group(); fl.position.set(1.0, 0.3, -0.3); fl.rotation.y = 1.0; head.add(fl); for (let k = 0; k < 5; k++) { const a = k * 1.2566; mesh(sph(), pastelMat(k % 2 ? '#ff6fa8' : '#ff8fb8'), fl, [Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0], [0, 0, a], [0.3, 0.2, 0.07]); } mesh(sph(), pastelMat('#ffe27a'), fl, [0, 0, 0.06], null, [0.12, 0.12, 0.1]); mesh(cylg(), pastelMat('#ff5a8a'), fl, [0.1, 0.1, 0.25], [0.5, 0.4, 0], [0.025, 0.4, 0.025]); }
  // fuego arcoíris
  const fire = new THREE.Group(); fire.position.set(0, -0.3, 2.95); head.add(fire); u.fire = fire; u.fireCones = [];
  [[m.fireO, 0.36, 1.9], [m.fireM, 0.24, 1.4], [m.fireI, 0.13, 0.85]].forEach(([mt, r, L]) => { const c = new THREE.Mesh(cone(7), mt); c.rotation.x = Math.PI / 2; c.scale.set(r, L, r); c.position.z = L / 2; fire.add(c); u.fireCones.push(c); });
  for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(cone(5), i % 2 ? m.fireC : m.fireO); c.rotation.set(Math.PI / 2 + (i % 2 ? 0.35 : -0.35), 0, (i - 2) * 0.5); c.scale.set(0.16, 1.1, 0.16); c.position.set((i - 2) * 0.12, 0, 0.5); fire.add(c); u.fireCones.push(c); }
  const mg = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#ffb3e6'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 })); mg.scale.setScalar(1.5); mg.position.set(0, 0, 0.3); fire.add(mg); u.fireGlow = mg;
  u.mouth = new THREE.Object3D(); u.mouth.position.set(0, -0.3, 3.3); head.add(u.mouth);
  // ---- silla de montar de rayas pastel ----
  const saddle = new THREE.Group(); saddle.position.set(0, 4.25, 0.2); root.add(saddle);
  const lea = pastelMat('#c8a8ff'), blank = mm('blanket', () => std('#ffffff', { map: saddleTex(), roughness: 0.8, flatShading: false }));
  mesh(boxg(), blank, saddle, [0, -0.25, 0], null, [2.6, 0.1, 2.5]); mesh(boxg(), m.gold, saddle, [0, -0.3, 0], null, [2.75, 0.05, 2.65]);
  mesh(sg('seat8', () => new THREE.CylinderGeometry(1, 1.1, 1, 10)), lea, saddle, [0, 0.0, 0.0], null, [1.25, 0.34, 1.5]);
  mesh(boxg(), lea, saddle, [0, 0.5, -1.25], [0.3, 0, 0], [1.9, 0.9, 0.3]); mesh(boxg(), m.gold, saddle, [0, 0.98, -1.35], [0.3, 0, 0], [1.9, 0.08, 0.34]);
  mesh(sph(), pastelMat('#ff6fa8'), saddle, [0, 0.55, 1.25], null, [0.3, 0.32, 0.3]);
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; mesh(sph(), pastelMat(PAST[i % 6]), saddle, [Math.cos(a) * 1.45, -0.33, Math.sin(a) * 1.4], null, 0.13); }
  for (const sd of [-1, 1]) { mesh(boxg(), pastelMat('#ffb3dc'), saddle, [sd * 1.5, -1.0, 0.3], [0, 0, sd * 0.12], [0.1, 1.5, 0.35]); mesh(sg('stir', () => new THREE.TorusGeometry(0.34, 0.08, 6, 12)), m.gold, saddle, [sd * 1.65, -1.85, 0.3], [0, Math.PI / 2, 0], 1); }
  u.reins = [-1, 1].map(() => mesh(sg('rein', () => new THREE.CylinderGeometry(1, 1, 1, 5)), toon('#ff9cc8', { rim: 0.4 }), g, [0, 0, 0], null, [0.06, 1, 0.06]));
  u.bit = [-1, 1].map(sd => { const o = new THREE.Object3D(); o.position.set(sd * 0.72, -0.3, 1.3); head.add(o); mesh(sph(), m.gold, o, [0, 0, 0], null, 0.15); return o; });
  // halo y confeti flotando
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#ffc8f0'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.22 })); halo.scale.setScalar(10); halo.position.set(0, 3.5, 1); root.add(halo);
  const NE = 52, ep = new Float32Array(NE * 3), ec = new Float32Array(NE * 3), eseed = []; for (let i = 0; i < NE; i++) { eseed.push([Math.random() * 6.28, 0.6 + Math.random(), Math.random()]); const cc = C(PAST[i % 6]); ec.set([cc.r, cc.g, cc.b], i * 3); }
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3)); eg.setAttribute('color', new THREE.BufferAttribute(ec, 3));
  const embers = new THREE.Points(eg, new THREE.PointsMaterial({ map: glowTex('#ffffff'), size: 0.6, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, sizeAttenuation: true })); embers.frustumCulled = false; root.add(embers);
  u.anim = (t, breath) => {
    const fl = 0.55 + breath * 0.9; u.fire.scale.set(1 + breath * 0.5, 1 + breath * 0.5, fl * (0.9 + Math.sin(t * 25) * 0.1)); u.fireCones.forEach((c, i) => { c.rotation.z = Math.sin(t * 18 + i * 1.7) * 0.12; });
    u.fireGlow.material.opacity = 0.4 + breath * 0.3 + Math.sin(t * 14) * 0.06; u.jaw.rotation.x = 0.3 + breath * 0.28 + Math.sin(t * 2.6) * 0.03;
    u.eyes.forEach((e, i) => e.userData.pup.position.set(Math.sin(t * 3.1 + i * 2) * 0.09, Math.cos(t * 2.3 + i) * 0.08, 0));
    u.duck.rotation.z = Math.sin(t * 4) * 0.12; u.duck.position.y = 1.0 + Math.abs(Math.sin(t * 4)) * 0.06; u.tongue.rotation.y = Math.sin(t * 7) * 0.12; u.lei.rotation.z = 0;
    for (let i = 0; i < NE; i++) { const s = eseed[i], ph = (t * 0.35 * s[1] + s[2]) % 1; ep[i * 3] = Math.cos(s[0] + t * 0.5) * (2.6 + ph * 1.2); ep[i * 3 + 1] = 2 + ph * 5.5; ep[i * 3 + 2] = Math.sin(s[0] * 3 + t * 0.4) * 3.6 - 0.5 + (i % 3) * 0.4; }
    eg.attributes.position.needsUpdate = true; };
  return g;
}
