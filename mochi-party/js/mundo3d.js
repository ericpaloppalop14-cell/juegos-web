// MOCHI PARTY · el mundo de detrás del menú (o39): islas flotantes con caminos y kartings, noria, molino, volcán, flan, serpiente,
// globos aerostáticos con mochis, planetas con anillo, aros dorados, arco iris gigante, sol con rayos, nubes en capas y purpurina.
// Todo en 3D con profundidad real (niebla atmosférica + paralaje de cámara). Se coloca por fracción de pantalla y profundidad.
import * as THREE from 'three';
import { HOOK } from './glowbatch.js?v=o48';
const R = (a, b) => a + Math.random() * (b - a);
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.r ?? .75, metalness: o.m ?? 0, flatShading: o.flat ?? false, emissive: o.e || 0x000000, emissiveIntensity: o.ei ?? 1, transparent: o.op != null && o.op < 1, opacity: o.op ?? 1, side: o.side || THREE.FrontSide, depthWrite: o.dw ?? true });
const phys = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: o.r ?? .4, sheen: 1, sheenColor: new THREE.Color(0xffffff), clearcoat: o.cc ?? .4, emissive: o.e || 0, emissiveIntensity: o.ei ?? 1, transparent: o.op != null && o.op < 1, opacity: o.op ?? 1, depthWrite: o.dw ?? true });
const mesh = (g, m, s, p, r) => { const o = new THREE.Mesh(g, m); if (s != null) Array.isArray(s) ? o.scale.set(...s) : o.scale.setScalar(s); if (p) o.position.set(...p); if (r) o.rotation.set(...r); return o; };
const GEO = { s: new THREE.SphereGeometry(1, 20, 14), sl: new THREE.SphereGeometry(1, 10, 8), c: new THREE.CylinderGeometry(1, 1, 1, 14), cl: new THREE.CylinderGeometry(1, 1, 1, 7), k: new THREE.ConeGeometry(1, 1, 12), kl: new THREE.ConeGeometry(1, 1, 7), b: new THREE.BoxGeometry(1, 1, 1), t: new THREE.TorusGeometry(1, .12, 8, 36) };
const cache = {}; const tex = (k, f) => cache[k] || (cache[k] = f());
const glowTex = c => tex('g' + c, () => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, '#fff'); g.addColorStop(.3, c); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; });
const raysTex = () => tex('rays', () => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d'); x.translate(128, 128); for (let i = 0; i < 14; i++) { const g = x.createLinearGradient(0, 0, 0, -128); g.addColorStop(0, 'rgba(255,245,200,.55)'); g.addColorStop(1, 'rgba(255,245,200,0)'); x.fillStyle = g; x.rotate(Math.PI * 2 / 14); x.beginPath(); x.moveTo(-3, 0); x.lineTo(-14, -128); x.lineTo(14, -128); x.lineTo(3, 0); x.fill(); } const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; });
export const cloudTex = () => tex('cloud', () => { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const x = cv.getContext('2d'); for (const [px, py, r] of [[70, 80, 40], [110, 60, 50], [160, 64, 46], [200, 84, 34], [130, 90, 44], [60, 96, 26], [190, 100, 28]]) { const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.6, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); } const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; });
const stripeTex = (a, b, n = 8) => tex('st' + a + b, () => { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 8; const x = cv.getContext('2d'); for (let i = 0; i < n; i++) { x.fillStyle = i % 2 ? b : a; x.fillRect(i * 128 / n, 0, 128 / n + 1, 8); } const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t; });
const glow = (c, s, op = 1) => { if (HOOK.glow) return HOOK.glow.make(c, s, op, false); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: op, fog: false })); sp.scale.setScalar(s); return sp; };
const PAS = ['#ff9cc8', '#7ee3c4', '#ffe27a', '#b9a2f7', '#8fd0ff', '#ffb36b'];

function face(parent, y, z, r, sep = .3) { const eye = std('#2a1838', { r: .2 }), wh = new THREE.MeshBasicMaterial({ color: 0xffffff }), bl = new THREE.MeshBasicMaterial({ color: 0xff7aa8, transparent: true, opacity: .6 });
  for (const s of [-1, 1]) { parent.add(mesh(GEO.sl, eye, [r * .13, r * .17, r * .09], [s * sep * r, y, z])); parent.add(mesh(GEO.sl, wh, r * .05, [s * sep * r + r * .04, y + r * .06, z + r * .07])); parent.add(mesh(GEO.sl, bl, [r * .12, r * .07, r * .03], [s * sep * r * 1.7, y - r * .14, z - r * .03])); }
  const m = mesh(new THREE.TorusGeometry(1, .22, 6, 12, Math.PI), eye, r * .07, [0, y - r * .12, z + r * .01], [0, 0, Math.PI]); parent.add(m); }

// ---------- piezas ----------
function tree(c1 = '#5fd08a') { const g = new THREE.Group(); g.add(mesh(GEO.cl, std('#a87858'), [.1, .5, .1], [0, .25, 0])); const m = std(c1, { flat: true }); g.add(mesh(GEO.sl, m, [.38, .34, .38], [0, .72, 0])); g.add(mesh(GEO.sl, m, [.28, .26, .28], [0, 1.0, 0])); return g; }
function mushroom(c = '#ff6f8f') { const g = new THREE.Group(); g.add(mesh(GEO.cl, std('#fff4e0'), [.14, .22, .14], [0, .11, 0])); const cap = mesh(new THREE.SphereGeometry(1, 14, 8, 0, 6.283, 0, 1.6), std(c), [.32, .26, .32], [0, .22, 0]); g.add(cap); for (let i = 0; i < 5; i++) g.add(mesh(GEO.sl, std('#fff'), .045, [Math.sin(i * 1.3) * .2, .38 - (i % 2) * .08, Math.cos(i * 1.3) * .2])); const d = mesh(GEO.b, std('#8a5a3a'), [.1, .16, .02], [0, .08, .15]); g.add(d); return g; }
function candy(c = '#ff6fae') { const g = new THREE.Group(); g.add(mesh(GEO.cl, new THREE.MeshStandardMaterial({ map: stripeTex(c, '#ffffff', 6), roughness: .5 }), [.06, .7, .06], [0, .35, 0])); g.add(mesh(GEO.s, std(c, { r: .3 }), .13, [0, .78, 0])); return g; }
function lamp() { const g = new THREE.Group(); g.add(mesh(GEO.cl, std('#7a6aa8'), [.03, .5, .03], [0, .25, 0])); const b = mesh(GEO.sl, std('#fff3b0', { e: '#ffe27a', ei: 1.2 }), .1, [0, .55, 0]); g.add(b); const gl = glow('#ffe27a', .9, .7); gl.position.y = .55; g.add(gl); return g; }
function ferris(sc = 1) { const g = new THREE.Group(), w = new THREE.Group(); w.position.y = 1.6 * sc; g.add(w);
  w.add(mesh(new THREE.TorusGeometry(1, .04, 6, 40), std('#ffffff', { r: .4 }), 1.4 * sc)); w.add(mesh(new THREE.TorusGeometry(1, .03, 6, 40), std('#ff9cc8'), .7 * sc));
  const gon = []; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; const sp = mesh(GEO.cl, std('#ffffff'), [.012, 1.4 * sc, .012], [Math.cos(a) * .7 * sc, Math.sin(a) * .7 * sc, 0], [0, 0, a - Math.PI / 2]); sp.position.set(Math.cos(a) * .7 * sc, Math.sin(a) * .7 * sc, 0); w.add(sp);
    const gd = new THREE.Group(); gd.position.set(Math.cos(a) * 1.4 * sc, Math.sin(a) * 1.4 * sc, 0); gd.add(mesh(GEO.b, std(PAS[i % 6]), [.26 * sc, .2 * sc, .2 * sc], [0, -.14 * sc, 0])); gd.add(mesh(GEO.sl, std('#fff3b0', { e: '#ffe27a', ei: .8 }), .05 * sc, [0, .0, 0])); w.add(gd); gon.push(gd); }
  for (const s of [-1, 1]) g.add(mesh(GEO.cl, std('#ff6fae'), [.05 * sc, 1.8 * sc, .05 * sc], [s * .5 * sc, .78 * sc, 0], [0, 0, -s * .3]));
  g.userData.upd = t => { w.rotation.z = -t * .25; gon.forEach(d => d.rotation.z = t * .25); }; return g; }
function windmill(sc = 1) { const g = new THREE.Group(); g.add(mesh(GEO.k, std('#fff1e0'), [.45 * sc, 1.6 * sc, .45 * sc], [0, .8 * sc, 0])); g.add(mesh(GEO.k, std('#ff6f8f'), [.5 * sc, .5 * sc, .5 * sc], [0, 1.75 * sc, 0])); const bl = new THREE.Group(); bl.position.set(0, 1.35 * sc, .35 * sc); g.add(bl);
  for (let i = 0; i < 4; i++) { const a = new THREE.Group(); a.rotation.z = i * Math.PI / 2; a.add(mesh(GEO.b, std('#ffffff'), [.18 * sc, .9 * sc, .03 * sc], [0, .5 * sc, 0])); a.add(mesh(GEO.b, std(PAS[i], { r: .5 }), [.16 * sc, .6 * sc, .02 * sc], [.12 * sc, .55 * sc, .02])); bl.add(a); } g.userData.upd = t => { bl.rotation.z = t * .8; }; return g; }
function volcano() { const g = new THREE.Group(); g.add(mesh(new THREE.ConeGeometry(1, 1, 9, 1, true), std('#8a5a6a', { flat: true }), [1.1, 1.3, 1.1], [0, .65, 0])); g.add(mesh(GEO.c, std('#ff6a2a', { e: '#ff5a1a', ei: 1.3 }), [.34, .03, .34], [0, 1.28, 0])); const gl = glow('#ff8a3a', 1.6, .8); gl.position.y = 1.4; g.add(gl);
  const sm = []; for (let i = 0; i < 5; i++) { const s = mesh(GEO.sl, std('#d8c8e8', { op: .6, dw: false }), .2, [0, 1.4, 0]); g.add(s); sm.push(s); } g.userData.upd = t => { sm.forEach((s, i) => { const k = (t * .25 + i * .2) % 1; s.position.set(Math.sin(i * 2 + t) * .15 * k, 1.4 + k * 1.2, 0); s.scale.setScalar(.15 + k * .35); s.material.opacity = .6 * (1 - k); }); gl.material.opacity = .6 + Math.sin(t * 5) * .2; }; return g; }
function flan() { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(.7, .95, .8, 24), phys('#ffd66b', { op: .95, cc: .8 }), 1, [0, .4, 0])); g.add(mesh(new THREE.CylinderGeometry(.72, .72, .06, 24), std('#a8501c', { r: .2, m: .1 }), 1, [0, .8, 0])); g.add(mesh(GEO.s, std('#ff3a5a', { r: .2, e: '#ff1a3a', ei: .2 }), .16, [0, .98, 0])); g.add(mesh(GEO.cl, std('#4a8a3a'), [.01, .18, .01], [0.04, 1.14, 0], [0, 0, -.4])); return g; }
function snake() { const g = new THREE.Group(), segs = []; for (let i = 0; i < 9; i++) { const s = mesh(GEO.s, std(i % 2 ? '#7ee3a4' : '#5fd08a', { r: .4 }), .24 - i * .008, [0, 0, 0]); g.add(s); segs.push(s); } const hd = segs[0]; hd.scale.setScalar(.3); face(hd, .3, .85, 1.4, .45); hd.children.forEach(c => c.scale.multiplyScalar(1 / 1)); const hurdle = new THREE.Group(); for (const s of [-1, 1]) hurdle.add(mesh(GEO.cl, std('#ffffff'), [.04, .6, .04], [s * .5, .3, 0])); hurdle.add(mesh(GEO.b, std('#ff6fae'), [1.1, .08, .06], [0, .6, 0])); hurdle.position.set(0, 0, -.9); g.add(hurdle);
  g.userData.upd = t => { segs.forEach((s, i) => { const k = t * 2.2 - i * .45; s.position.set(Math.sin(k) * .35 - i * .3 + .5, Math.max(0, Math.sin(k * .8)) * .35 + .22, 0); }); }; return g; }
function planet(c, ring) { const g = new THREE.Group(); g.add(mesh(GEO.s, phys(c, { r: .5, cc: .6 }), 1)); const sf = new THREE.Group(); g.add(sf); face(sf, .05, .96, 1, .3); sf.scale.setScalar(1); for (let i = 0; i < 3; i++) g.add(mesh(GEO.sl, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .25 }), [.2, .13, .05], [Math.sin(i * 2.2) * .6, Math.cos(i * 1.7) * .6, .75], [0, 0, i]));
  if (ring) { const r = mesh(new THREE.TorusGeometry(1.55, .12, 6, 48), std('#ffe9a0', { r: .4, e: '#ffd060', ei: .3 }), [1, 1, .15], null, [Math.PI / 2 - .35, 0, .25]); g.add(r); const r2 = mesh(new THREE.TorusGeometry(1.85, .06, 6, 48), std('#ffc2e0', { r: .4 }), [1, 1, .15], null, [Math.PI / 2 - .35, 0, .25]); g.add(r2); } return g; }
function ringsPath() { const g = new THREE.Group(), rs = []; for (let i = 0; i < 6; i++) { const r = mesh(new THREE.TorusGeometry(1, .09, 8, 28), std(i === 5 ? '#fff27a' : '#ffd23a', { r: .25, m: .6, e: '#ffb020', ei: .5 }), 1 - i * .02, [i * 1.9, Math.sin(i * 1.1) * .8, -i * .3], [0, Math.PI / 2 - .3, 0]); g.add(r); rs.push(r); const sg = glow('#ffd84a', 2.4, .35); sg.position.copy(r.position); g.add(sg); }
  const st = mesh(new THREE.OctahedronGeometry(1), std('#fff27a', { e: '#ffd23a', ei: 1 }), .3, [rs.length * 1.9 - .3, .2, -1.5]); g.add(st); g.userData.upd = t => { rs.forEach((r, i) => r.rotation.z = t * 1.2 + i); st.rotation.y = t * 2; }; return g; }
function balloon(c1, c2) { const g = new THREE.Group(); const tx = stripeTex(c1, c2, 10).clone(); tx.needsUpdate = true; const b = mesh(new THREE.SphereGeometry(1, 28, 18), new THREE.MeshStandardMaterial({ map: tx, roughness: .5 }), [1, 1.18, 1], [0, 1.9, 0]); g.add(b);
  g.add(mesh(GEO.c, std('#ffd84a', { r: .3 }), [.6, .08, .6], [0, .88, 0])); g.add(mesh(new THREE.CylinderGeometry(.34, .26, .38, 12), std('#c8905a'), 1, [0, .22, 0])); g.add(mesh(GEO.s, phys('#ffb3d1'), .22, [0, .5, 0])); const hh = new THREE.Group(); hh.position.set(0, .5, 0); g.add(hh); face(hh, 0, .2, .22 * 1.0, .3);
  for (const [x, z] of [[.3, .3], [-.3, .3], [.3, -.3], [-.3, -.3]]) g.add(mesh(GEO.cl, std('#fff'), [.008, 1.0, .008], [x * .8, 0.8 + .3, z * .8], [z * .3, 0, -x * .3])); g.userData.upd = t => { g.rotation.z = Math.sin(t * .8) * .05; g.rotation.y = Math.sin(t * .4) * .3; }; return g; }
function kart(c) { const g = new THREE.Group(); g.add(mesh(GEO.b, std(c, { r: .35 }), [.5, .16, .8], [0, .16, 0])); g.add(mesh(GEO.sl, phys('#ffd1e6'), .22, [0, .4, -.1])); for (const [x, z] of [[.3, .3], [-.3, .3], [.3, -.3], [-.3, -.3]]) g.add(mesh(GEO.c, std('#3a2a5e'), [.1, .06, .1], [x, .1, z], [0, 0, Math.PI / 2])); g.add(mesh(GEO.k, std('#ffe27a', { e: '#ffe27a' }), [.08, .2, .08], [0, .3, -.5], [-Math.PI / 2, 0, 0])); return g; }

// ---------- isla flotante con camino ----------
function island(seed = 0, decor = []) {
  const g = new THREE.Group(), rk = std(['#9a7ac8', '#c08a9a', '#8aa8d8'][seed % 3], { flat: true, r: .9 });
  g.add(mesh(new THREE.ConeGeometry(1, 1, 8), rk, [4.2, 4.2, 4.2], [0, -2.1, 0], [Math.PI, seed, 0]));
  for (let i = 0; i < 4; i++) g.add(mesh(GEO.sl, rk, [.7, .9, .7], [Math.sin(i * 1.7 + seed) * 2.4, -2.6 - i * .5, Math.cos(i * 1.7 + seed) * 2.4]));
  g.add(mesh(new THREE.CylinderGeometry(4.3, 4.0, .6, 40), std('#ffe0f0', { r: .8 }), 1, [0, -.15, 0])); const gr = mesh(new THREE.CylinderGeometry(4.2, 4.2, .35, 40), std(['#9be3a8', '#aee89a', '#8fe0c0'][seed % 3], { r: .8 }), 1, [0, .1, 0]); g.add(gr);
  // camino serpenteante
  const pts = [[-3.4, 1.2], [-2, -.6], [-.4, .8], [1.2, -.5], [2.6, 1.0], [3.6, -.6]].map(([x, z]) => new THREE.Vector3(x, .3, z)), curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', .5);
  const N = 60, pos = [], idx = [], W = .36; for (let i = 0; i <= N; i++) { const t = i / N, p = curve.getPoint(t), tg = curve.getTangent(t), nx = -tg.z, nz = tg.x; pos.push(p.x + nx * W, .3, p.z + nz * W, p.x - nx * W, .3, p.z - nz * W); if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rg.setIndex(idx); rg.computeVertexNormals(); g.add(new THREE.Mesh(rg, std('#fff0c0', { r: .7 })));
  for (let i = 2; i < N; i += 4) { const p = curve.getPoint(i / N), tg = curve.getTangent(i / N); g.add(mesh(GEO.b, std('#ff9cc8'), [.2, .02, .06], [p.x, .33, p.z], [0, -Math.atan2(tg.z, tg.x), 0])); }
  // decorado
  const put = (o, x, z, s = 1, ry = 0) => { o.position.set(x, .28, z); o.scale.setScalar(s); o.rotation.y = ry; g.add(o); return o; };
  const trees = [[-3, -2, '#ff9cc8'], [-1.2, -2.6, '#5fd08a'], [2.2, -2.3, '#ff9cc8'], [3.2, 2.2, '#7ee3c4'], [-3.2, 2.4, '#5fd08a'], [0, 2.6, '#ff9cc8'], [1.4, -1.5, '#b9f08a']];
  trees.forEach(([x, z, c], i) => put(tree(c), x, z, 1.3 + (i % 3) * .3));
  [[-2.2, -1.6, '#ff6f8f'], [2.8, 0.1, '#b9a2f7'], [-1.0, 1.9, '#ffb36b']].forEach(([x, z, c]) => put(mushroom(c), x, z, 1.4));
  [[-2.6, 0.4], [0.8, 1.3], [3.4, 0.4], [1.8, -3.0]].forEach(([x, z], i) => put(candy(PAS[i]), x, z, 1.3));
  [[-0.6, -0.4], [2.0, 1.4]].forEach(([x, z]) => put(lamp(), x, z, 1.3));
  const ups = []; for (const [k, x, z, s] of decor) { const o = { ferris, windmill, volcano, flan, snake }[k](); if (o) { put(o, x, z, s); if (o.userData.upd) ups.push(o.userData.upd); } }
  // karts por el camino
  const karts = [kart('#ff6fae'), kart('#5fc7a6'), kart('#8fa8ff')]; karts.forEach((k, i) => { k.scale.setScalar(.9); g.add(k); k.userData.o = i / 3; });
  ups.push(t => karts.forEach((k, i) => { const u = ((t * .045 + k.userData.o) % 1), p = curve.getPoint(u), tg = curve.getTangent(u); k.position.set(p.x, .38 + Math.abs(Math.sin(t * 9 + i)) * .03, p.z); k.rotation.y = Math.atan2(tg.x, tg.z); }));
  // mochis paseando
  const walkers = [0, 1, 2, 3].map(i => { const w = new THREE.Group(); w.add(mesh(GEO.s, phys(PAS[(i + seed) % 6], { r: .35 }), [.26, .22, .26], [0, .22, 0])); face(w, .26, .2, .26, .32); g.add(w); w.userData.o = i * .25 + .1; w.userData.d = i % 2 ? 1 : -1; return w; });
  ups.push(t => walkers.forEach((w, i) => { const u = (((t * .02 * w.userData.d + w.userData.o) % 1) + 1) % 1, p = curve.getPoint(u), tg = curve.getTangent(u); w.position.set(p.x + .38, .36 + Math.abs(Math.sin(t * 6 + i * 2)) * .2, p.z); w.rotation.y = Math.atan2(tg.x, tg.z) * (w.userData.d); w.children[0].scale.set(.26, .22 + Math.abs(Math.sin(t * 6 + i * 2)) * .03, .26); }));
  g.userData.upd = t => ups.forEach(f => f(t)); return g;
}

export function buildWorld(scene, camera, api) {
  const world = new THREE.Group(); scene.add(world); const ups = [], fx = [], state = { lite: false };
  const TAN = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const at = (o, sx, sy, d) => { o.position.set((sx * 2 - 1) * d * TAN * camera.aspect, (1 - sy * 2) * d * TAN, -d); world.add(o); return o; };
  const sz = (frac, d) => frac * 2 * d * TAN; // altura en mundo que ocupa una fracción de pantalla
  const land = () => camera.aspect > 1;
  const layers = { far: [], mid: [] };
  function rebuild() {
    for (const c of [...world.children]) { world.remove(c); c.traverse(o => { if (o.isMesh && o.userData.own) o.geometry.dispose(); }); } ups.length = 0; fx.length = 0;
    const L = land(), asp = camera.aspect;
    // sol con rayos, arriba a la izquierda (detrás de todo)
    const sun = new THREE.Group(); at(sun, L ? .1 : .14, L ? .12 : .1, 110); const rays = new THREE.Sprite(new THREE.SpriteMaterial({ map: raysTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .85, fog: false })); rays.scale.setScalar(sz(L ? 1.5 : .9, 110)); sun.add(rays);
    const sg = glow('#fff1b8', sz(.5, 110), .9); sun.add(sg); sun.add(mesh(GEO.s, new THREE.MeshBasicMaterial({ color: 0xfff6c8, fog: false }), sz(.08, 110) * .5)); ups.push(t => { rays.material.rotation = t * .06; });
    // arco iris gigante
    const rb = new THREE.Group(); ['#ff8fa8', '#ffb36b', '#ffe27a', '#8fe8b0', '#8fd0ff', '#b9a2f7'].forEach((c, i) => rb.add(mesh(new THREE.TorusGeometry(1 - i * .035, .018, 8, 80, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .45, depthWrite: false, fog: false }), 1))); rb.scale.setScalar(sz(L ? .75 : .5, 100) * (L ? 1.2 : 1.9)); at(rb, .58, L ? .62 : .5, 100);
    // planetas con cara y anillo, a lo lejos
    const p1 = planet('#c9b2ff', true); p1.scale.setScalar(sz(L ? .16 : .09, 85)); at(p1, L ? .93 : .86, L ? .16 : .1, 85); p1.rotation.x = .3; ups.push(t => { p1.rotation.y = Math.sin(t * .2) * .3; p1.position.y += Math.sin(t * .6) * .003; });
    const p2 = planet('#ffd59e', false); p2.scale.setScalar(sz(L ? .1 : .055, 75)); at(p2, L ? .46 : .1, L ? .1 : .27, 75); ups.push(t => { p2.position.y += Math.sin(t * .7 + 1) * .004; });
    // nubes en tres capas
    const clouds = []; for (let i = 0; i < (state.lite ? 8 : 16); i++) { const d = R(55, 105), c = HOOK.cloud ? HOOK.cloud.make('#ffffff', 1, R(.5, .9), false) : new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex(), transparent: true, depthWrite: false, opacity: R(.5, .9), fog: false })); c.scale.set(sz(R(.22, .4), d) * 2, sz(R(.22, .4), d), 1); at(c, R(-.1, 1.1), R(.04, L ? .7 : .62), d); c.userData.v = R(.15, .5) * (110 - d) / 50; clouds.push(c); }
    ups.push((t, dt) => clouds.forEach(c => { c.position.x += c.userData.v * dt; const lim = 80 * camera.aspect; if (c.position.x > lim) c.position.x = -lim; }));
    // islas flotantes (camino, tiovivo, noria, molino, volcán, flan, serpiente)
    const isl = [
      [island(0, [['ferris', -1.0, -1.0, 1.3], ['windmill', 2.6, -1.4, 1.4]]), L ? .06 : .1, L ? .62 : .27, 52, L ? .42 : .25],
      [island(1, [['volcano', 1.6, -1.2, 1.4], ['snake', -1.6, -1.8, 1.4]]), L ? .52 : .93, L ? .34 : .25, 60, L ? .36 : .22],
      [island(2, [['flan', -1.4, -1.4, 1.3], ['ferris', 2.2, -1.6, .9]]), L ? .3 : .86, L ? .9 : .56, 46, L ? .32 : .2],
    ];
    isl.forEach(([o, sx, sy, d, fr], i) => { o.scale.setScalar(sz(fr, d) / 8.4); o.rotation.set(.38, i * .8 - .4, 0); at(o, sx, sy, d); const y0 = o.position.y; ups.push((t, dt) => { o.userData.upd(t); o.position.y = y0 + Math.sin(t * .5 + i * 2) * .5; o.rotation.y = i * .8 - .4 + Math.sin(t * .15 + i) * .15; }); });
    // globos aerostáticos con mochis
    [['#ff6fae', '#ffffff', L ? .42 : .55, L ? .2 : .2, 34, .09], ['#8fd0ff', '#ffe27a', L ? .78 : .2, L ? .42 : .43, 30, .1], ['#b9a2f7', '#ffffff', L ? .62 : .9, L ? .78 : .41, 38, .08]].forEach(([a, b, sx, sy, d, fr], i) => { const o = balloon(a, b); o.scale.setScalar(sz(fr * 3.2, d) / 5); at(o, sx, sy, d); const y0 = o.position.y; ups.push((t, dt) => { o.userData.upd(t); o.position.y = y0 + Math.sin(t * .6 + i) * .6; }); });
    // aros de «Vuelo de Anillos»
    const rp = ringsPath(); rp.scale.setScalar(sz(.05, 30) / 1.0); rp.rotation.y = -.5; at(rp, L ? .3 : .12, L ? .2 : .36, 30); ups.push((t, dt) => rp.userData.upd(t));
    // destellos de purpurina (parallax)
    const N = state.lite ? 90 : 220, pg = new THREE.BufferGeometry(), pp = new Float32Array(N * 3), pc = new Float32Array(N * 3), cc = new THREE.Color(); for (let i = 0; i < N; i++) { const d = R(12, 70); pp[i * 3] = R(-1, 1) * d * TAN * camera.aspect * 1.1; pp[i * 3 + 1] = R(-1, 1) * d * TAN * 1.05; pp[i * 3 + 2] = -d; cc.set(PAS[i % 6]).lerp(new THREE.Color('#ffffff'), .5); pc[i * 3] = cc.r; pc[i * 3 + 1] = cc.g; pc[i * 3 + 2] = cc.b; }
    pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pg.setAttribute('color', new THREE.BufferAttribute(pc, 3)); const pm = new THREE.PointsMaterial({ size: .55, vertexColors: true, map: glowTex('#ffffff'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .9, sizeAttenuation: true, fog: false }); const pts = new THREE.Points(pg, pm); pts.frustumCulled = false; world.add(pts);
    ups.push((t, dt) => { const a = pg.attributes.position; for (let i = 0; i < N; i++) { a.array[i * 3 + 1] += dt * (.25 + (i % 5) * .06); const d = -a.array[i * 3 + 2], top = d * TAN * 1.08; if (a.array[i * 3 + 1] > top) a.array[i * 3 + 1] = -top; a.array[i * 3] += Math.sin(t * .7 + i) * dt * .15; } a.needsUpdate = true; pm.size = .5 + Math.sin(t * 3) * .08; });
  }
  return { rebuild, update(t, dt) { ups.forEach(f => f(t, dt)); }, setLite(v) { if (state.lite !== v) { state.lite = v; rebuild(); } }, world };
}
