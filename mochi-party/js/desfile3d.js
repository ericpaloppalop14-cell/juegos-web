// MOCHI PARTY · desfile 3D premium (sustituye a desfile.js 2D): camellos alados, medusas translúcidas,
// mochis que saltan/aplastan/saludan, trofeos y medallas metálicos. three.js, capa transparente con
// profundidad real (parallax por distancia, niebla), PMREM para reflejos, calidad automática.
// Solo usa las bandas de arriba/abajo de la pantalla para no tapar botones ni personajes.
import * as THREE from 'three';
import { buildWorld, cloudTex } from './mundo3d.js?v=o49';
import { makeGlowBatch, HOOK } from './glowbatch.js?v=o49';
import { mkLod } from './lod3d.js?v=o49';
const LD = mkLod(.5);
import { bakeStatic, megaMerge } from './batch3d.js?v=o49';
const CFG0 = window.__DESFILE3D || {};
/* o47: createDesfile(rd, {shared:true}) usa el MISMO renderer/canvas que el 3D principal: el mundo se pre-renderiza una vez en 2 capas y solo los personajes del desfile se dibujan en vivo */
export function createDesfile(rd, opts = {}) {
const SH = !!opts.shared, CFG = opts.cfg || CFG0, cv = opts.cv || null;
const isOn = window.__desfileOn || (() => { const m = document.getElementById('sMenu'), c = document.getElementById('sChars'); return !m || m.classList.contains('on') || (c && c.classList.contains('on')); });
const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xf2c6ea, 50, 230);
const cam = new THREE.PerspectiveCamera(34, 1, .5, 180);
// --- entorno para reflejos (estudio pastel) ---
{ const env = new THREE.Scene(); const g = new THREE.SphereGeometry(10, 32, 16); const col = [], p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 10; const c = new THREE.Color().lerpColors(new THREE.Color(0xffc6e0), new THREE.Color(0xd8f0ff), y * .5 + .5); col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  env.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const pan = (x, y, z, s, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s * .6), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); };
  pan(4, 6, 5, 6, 0xffffff); pan(-6, 2, 3, 4, 0xfff0d0); pan(0, -2, -7, 5, 0xffb0d8); pan(-3, 5, -5, 3, 0xc8e8ff);
  const pm = new THREE.PMREMGenerator(rd); scene.environment = pm.fromScene(env, .02).texture; pm.dispose(); }
// --- luces: principal cálida, relleno frío, contraluz (rim) rosa ---
scene.add(new THREE.HemisphereLight(0xfff4fb, 0xffc0d8, .7));
const key = new THREE.DirectionalLight(0xfff1dc, 2.2); key.position.set(4, 7, 6); scene.add(key);
const fill = new THREE.DirectionalLight(0xbfe2ff, .8); fill.position.set(-6, 1, 4); scene.add(fill);
const rim = new THREE.DirectionalLight(0xff9ad0, 2.4); rim.position.set(-2, 4, -8); scene.add(rim);
// --- materiales ---
const M = {
  camel: new THREE.MeshPhysicalMaterial({ color: 0xeab06a, roughness: .55, sheen: 1, sheenColor: new THREE.Color(0xfff0d8), sheenRoughness: .5, clearcoat: .15 }),
  camelD: new THREE.MeshPhysicalMaterial({ color: 0xc98a4c, roughness: .55, sheen: .8, sheenColor: new THREE.Color(0xffe2c0) }),
  hoof: new THREE.MeshStandardMaterial({ color: 0x8a5a44, roughness: .5 }),
  wing: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .35, sheen: 1, sheenColor: new THREE.Color(0xffc8e6), clearcoat: .6, iridescence: .6, iridescenceIOR: 1.3 }),
  scarf: new THREE.MeshPhysicalMaterial({ color: 0xff5e9e, roughness: .7, sheen: 1, sheenColor: new THREE.Color(0xffd0e4), side: THREE.DoubleSide }),
  eye: new THREE.MeshPhysicalMaterial({ color: 0x2a1530, roughness: .1, clearcoat: 1 }),
  shine: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  blush: new THREE.MeshBasicMaterial({ color: 0xff7aa8, transparent: true, opacity: .55, depthWrite: false }),
  gold: new THREE.MeshPhysicalMaterial({ color: 0xffc94a, metalness: 1, roughness: .18, clearcoat: 1, clearcoatRoughness: .1 }),
  silver: new THREE.MeshPhysicalMaterial({ color: 0xe8eef8, metalness: 1, roughness: .2, clearcoat: 1 }),
  ribbon: new THREE.MeshPhysicalMaterial({ color: 0x5aa9ff, roughness: .5, sheen: 1, side: THREE.DoubleSide }),
  base: new THREE.MeshPhysicalMaterial({ color: 0x8f5cd8, roughness: .3, clearcoat: 1 }),
  shadow: new THREE.MeshBasicMaterial({ color: 0x7a3c8c, transparent: true, opacity: .16, depthWrite: false }),
};
M.glowT = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.4, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })();
const MOCHI_COL = [0xffb3d1, 0xffe27a, 0x9fe7ff, 0xc9b2ff, 0xa8f0c6, 0xffc39e, 0xfff6fb, 0xff9c9c];
const JELLY_COL = [0xff6fcf, 0x7f8cff, 0x3fd8c8, 0xff9f5a, 0xb07cff];
const mochiMats = MOCHI_COL.map(c => new THREE.MeshPhysicalMaterial({ color: c, roughness: .42, sheen: 1, sheenColor: new THREE.Color(0xffffff), sheenRoughness: .4, clearcoat: .55, clearcoatRoughness: .3 }));
const G = { sph: LD.Sphere(1, 24, 16), sphL: LD.Sphere(1, 14, 10), cap: LD.Capsule(1, 1, 6, 12) };
const mesh = (g, m, s, p) => { const o = new THREE.Mesh(g, m); if (s) o.scale.set(...(Array.isArray(s) ? s : [s, s, s])); if (p) o.position.set(...p); return o; };
function eyes(parent, x, y, z, r, sep) { for (const sx of [-1, 1]) { const e = mesh(G.sph, M.eye, r, [x + sx * sep, y, z]); parent.add(e); parent.add(mesh(G.sphL, M.shine, r * .38, [x + sx * sep + r * .3, y + r * .35, z + r * .8])); parent.add(mesh(G.sphL, M.shine, r * .18, [x + sx * sep - r * .3, y - r * .3, z + r * .85])); } }
// ---------- CAMELLO ----------
const wingGeo = (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(.2, .5, .5, 1.25, 1.05, 1.35); s.bezierCurveTo(1.0, 1.0, 1.25, .95, 1.2, .7); s.bezierCurveTo(1.15, .5, 1.35, .45, 1.2, .25); s.bezierCurveTo(.9, .1, .5, -.05, 0, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: .04, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 3, curveSegments: 16 }); g.translate(0, 0, -.02); return g; })();
function makeCamel() {
  const root = new THREE.Group(), b = new THREE.Group(); root.add(b);
  b.add(mesh(G.sph, M.camel, [1.15, .72, .7], [0, 0, 0]));
  b.add(mesh(G.sph, M.camel, [.48, .55, .44], [-.38, .52, 0])); b.add(mesh(G.sph, M.camel, [.46, .52, .42], [.34, .5, 0]));
  b.add(mesh(G.sph, M.camelD, [.2, .14, .16], [-.38, 1.0, 0])); b.add(mesh(G.sph, M.camelD, [.19, .13, .15], [.34, .97, 0]));
  const neck = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(.85, .15, 0), new THREE.Vector3(1.25, .45, 0), new THREE.Vector3(1.3, 1.0, 0), new THREE.Vector3(1.42, 1.3, 0)]), 20, .2, 14), M.camel); b.add(neck);
  const head = new THREE.Group(); head.position.set(1.5, 1.42, 0); b.add(head);
  head.add(mesh(G.sph, M.camel, [.42, .36, .36])); head.add(mesh(G.sph, M.camel, [.3, .22, .26], [.34, -.1, 0]));
  head.add(mesh(G.sphL, M.hoof, [.035, .025, .02], [.6, -.06, .1])); head.add(mesh(G.sphL, M.hoof, [.035, .025, .02], [.6, -.06, -.1]));
  for (const z of [-.2, .2]) { const ear = mesh(G.sph, M.camelD, [.07, .16, .07], [-.15, .33, z]); ear.rotation.z = .4; ear.rotation.x = z > 0 ? .4 : -.4; head.add(ear); }
  for (const z of [-1, 1]) { const eg = new THREE.Group(); eg.position.set(.14, .1, z * .26); eg.rotation.y = z > 0 ? -.9 + Math.PI / 2 - Math.PI / 2 : 0; head.add(eg); }
  // ojos grandes kawaii (en el lado que mira a cámara +z y el otro)
  for (const z of [1, -1]) { head.add(mesh(G.sph, M.eye, .085, [.16, .1, z * .28])); head.add(mesh(G.sphL, M.shine, .034, [.19, .14, z * .35])); head.add(mesh(G.sphL, M.shine, .016, [.13, .07, z * .355])); head.add(mesh(G.sphL, M.blush, [.08, .045, .02], [.26, -.06, z * .3])); }
  // bufanda: anillo + punta que ondea
  const ring = new THREE.Mesh(LD.Torus(.24, .085, 10, 24), M.scarf); ring.position.set(1.3, .98, 0); ring.rotation.x = Math.PI / 2; ring.rotation.y = .35; b.add(ring);
  const tailG = new THREE.PlaneGeometry(.7, .16, 14, 1); tailG.translate(-.35, 0, 0); const tail = new THREE.Mesh(tailG, M.scarf); tail.position.set(1.15, .95, .22); b.add(tail);
  tail.userData.base = tailG.attributes.position.array.slice();
  // patas articuladas (muslo + caña + pezuña)
  const legs = [];
  for (const [x, z] of [[.6, .32], [.6, -.32], [-.6, .32], [-.6, -.32]]) { const hip = new THREE.Group(); hip.position.set(x, -.35, z); b.add(hip);
    hip.add(mesh(G.cap, M.camel, [.13, .22, .13], [0, -.25, 0])); const knee = new THREE.Group(); knee.position.y = -.5; hip.add(knee);
    knee.add(mesh(G.cap, M.camel, [.1, .2, .1], [0, -.22, 0])); knee.add(mesh(G.sph, M.hoof, [.13, .08, .13], [.02, -.48, 0])); legs.push({ hip, knee, ph: (x > 0 ? 0 : Math.PI) + (z > 0 ? 0 : Math.PI * .5) }); }
  // cola
  const tl = mesh(G.cap, M.camelD, [.05, .2, .05], [-1.12, .1, 0]); tl.rotation.z = -.8; b.add(tl);
  // alas
  const wings = [];
  for (const z of [1, -1]) { const pv = new THREE.Group(); pv.position.set(.05, .55, z * .35); b.add(pv); const w = new THREE.Mesh(wingGeo, M.wing); w.rotation.y = Math.PI / 2 * (z > 0 ? 1 : -1) * 0; w.scale.set(.9, .9 * 1, 1); w.rotation.z = .25; w.rotation.x = z * -.2; pv.add(w); pv.userData.z = z; wings.push(pv); }
  // manta de rayas con borlas, gorro de fiesta, guirnalda de flores y un mochi jinete saludando
  const bl = mesh(G.cap, new THREE.MeshPhysicalMaterial({ color: 0xff7ab6, roughness: .6, sheen: 1, sheenColor: new THREE.Color(0xffd0e8) }), [.36, .5, .3], [0, .72, 0]); bl.rotation.z = Math.PI / 2; b.add(bl);
  for (let i = 0; i < 4; i++) b.add(mesh(G.sphL, M.gold, .045, [(i - 1.5) * .22, .55, .34])); for (let i = 0; i < 4; i++) b.add(mesh(G.sphL, M.gold, .045, [(i - 1.5) * .22, .55, -.34]));
  const hat = new THREE.Mesh(LD.Cone(.17, .42, 16), new THREE.MeshPhysicalMaterial({ color: 0x7a5ce0, roughness: .4, clearcoat: .5 })); hat.position.set(-.02, .42, 0); hat.rotation.z = -.2; head.add(hat); head.add(mesh(G.sphL, M.shine, .07, [-.06, .65, 0]));
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; b.add(mesh(G.sphL, new THREE.MeshPhysicalMaterial({ color: [0xff7ab6, 0xffe27a, 0x9fe7ff, 0xc9b2ff][i % 4], roughness: .5 }), .07, [1.3 + Math.cos(a) * .22, .98, Math.sin(a) * .22])); }
  const rider = makeMochi(); rider.scale.setScalar(.34); rider.position.set(0, .86, 0); rider.userData.sh.visible = false; b.add(rider);
  root.userData = { b, legs, wings, tail, head, rider };
  return root;
}
function animCamel(o, t, ph) { const u = o.userData, f = t * 9 + ph; if (u.rider) animMochi(u.rider, t, ph + 1, .016);
  for (const w of u.wings) { w.rotation.x = w.userData.z * (-.25 - .95 * (Math.sin(f) * .5 + .5)); }
  u.b.position.y = Math.sin(f) * .08; u.b.rotation.z = Math.sin(t * 1.6 + ph) * .06;
  for (const l of u.legs) { const s = Math.sin(t * 6 + ph + l.ph); l.hip.rotation.z = s * .5; l.knee.rotation.z = Math.max(0, -Math.cos(t * 6 + ph + l.ph)) * .9; }
  u.head.rotation.z = Math.sin(t * 3 + ph) * .1; u.head.rotation.y = Math.sin(t * 1.3 + ph) * .15;
  const a = u.tail.geometry.attributes.position, bs = u.tail.userData.base; for (let i = 0; i < a.count; i++) { const x = bs[i * 3]; a.array[i * 3 + 2] = bs[i * 3 + 2] + Math.sin(x * 9 + t * 12) * .06 * -x; a.array[i * 3 + 1] = bs[i * 3 + 1] + Math.sin(x * 6 + t * 10) * .05 * -x - x * x * .25; } a.needsUpdate = true; }
// ---------- MEDUSA ----------
const bellGeo = (() => { const pts = []; for (let i = 0; i <= 14; i++) { const a = i / 14 * Math.PI / 2; pts.push(new THREE.Vector2(Math.sin(a) * 1, Math.cos(a) * .85)); } pts.push(new THREE.Vector2(1.04, -.08), new THREE.Vector2(.92, -.12), new THREE.Vector2(.8, -.02)); const g = new THREE.LatheGeometry(pts, 32);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < .1) { const ang = Math.atan2(p.getZ(i), p.getX(i)); p.setY(i, y - Math.max(0, Math.cos(ang * 8)) * .07); } } g.computeVertexNormals(); return g; })();
const tentGeo = new THREE.CylinderGeometry(.045, .012, 1.9, 5, 12, true); tentGeo.translate(0, -.95, 0);
const armGeo = new THREE.CylinderGeometry(.11, .02, 1.3, 6, 10, true); armGeo.translate(0, -.65, 0);
function tentMesh(items, mat) { let n = 0, ni = 0; for (const it of items) { n += it.g.attributes.position.count; ni += it.g.index.count; }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), idx = new Uint32Array(ni), ranges = []; let vo = 0, io = 0;
  for (const it of items) { const g = it.g, c = g.attributes.position.count; pos.set(g.attributes.position.array, vo * 3); nor.set(g.attributes.normal.array, vo * 3); for (let k = 0; k < g.index.count; k++) idx[io + k] = g.index.array[k] + vo; ranges.push({ start: vo, count: c, ox: it.x, oz: it.z, ph: it.ph, base: g.attributes.position.array.slice() }); vo += c; io += g.index.count; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setIndex(new THREE.BufferAttribute(idx, 1));
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.userData = { ranges }; return m; }
function makeJelly() {
  const c = JELLY_COL[Math.random() * JELLY_COL.length | 0];
  const root = new THREE.Group(), bell = new THREE.Group(); root.add(bell);
  const mb = new THREE.MeshPhysicalMaterial({ color: c, roughness: .1, transparent: true, opacity: .5, clearcoat: 1, iridescence: .7, iridescenceIOR: 1.4, sheen: 1, sheenColor: new THREE.Color(0xffffff), emissive: c, emissiveIntensity: .45, side: THREE.DoubleSide, depthWrite: false });
  const inner = new THREE.MeshPhysicalMaterial({ color: c, emissive: c, emissiveIntensity: .7, roughness: .3, transparent: true, opacity: .75, depthWrite: false });
  bell.add(mesh(G.sph, inner, [.55, .42, .55], [0, .25, 0]));
  bell.add(new THREE.Mesh(bellGeo, mb));
  eyes(bell, 0, .35, .74, .075, .22); bell.add(mesh(G.sphL, M.blush, [.09, .05, .03], [-.42, .2, .72])); bell.add(mesh(G.sphL, M.blush, [.09, .05, .03], [.42, .2, .72]));
  const smile = new THREE.Mesh(LD.Torus(.06, .016, 6, 12, Math.PI), M.eye); smile.position.set(0, .24, .8); smile.rotation.z = Math.PI; bell.add(smile);
  const tm = new THREE.MeshPhysicalMaterial({ color: c, emissive: c, emissiveIntensity: .8, roughness: .3, transparent: true, opacity: .8, depthWrite: false });
  const tents = [];
  { const gl = GLB.make('#ffffff', 3.4, .55, false, 1), lc = new THREE.Color(c); gl.material.r = lc.r; gl.material.g = lc.g; gl.material.b = lc.b; gl.position.y = .25; root.add(gl); for (let i = 0; i < 7; i++) bell.add(mesh(G.sphL, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55 }), [.06, .035, .03], [Math.sin(i * 2.4) * .5, .55 + (i % 3) * .1, Math.cos(i * 2.4) * .5])); }
  // o46: 12 tentáculos (material tm) y 3 brazos (material inner) fusionados en 2 mallas; su ondulación sigue calculándose por vértice
  { const A = [], B = []; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; A.push({ g: tentGeo, x: Math.cos(a) * .75, z: Math.sin(a) * .75, ph: i * 1.3 }); } for (let i = 0; i < 3; i++) B.push({ g: armGeo, x: (i - 1) * .22, z: 0, ph: i * 2.1 + 5 });
    for (const [it, mat] of [[A, tm], [B, inner]]) { const m = tentMesh(it, mat); root.add(m); tents.push(m); } }
  root.userData = { bell, tents };
  return root;
}
function animJelly(o, t, ph) { const u = o.userData, p = Math.sin(t * 2.4 + ph), sq = 1 + p * .1, yo = -.05 + p * -.06, sy = 1 - p * .08;
  u.bell.scale.set(sq, 1 / sq, sq);
  for (const m of u.tents) { const a = m.geometry.attributes.position, arr = a.array;
    for (const r of m.userData.ranges) { const bs = r.base, k = r.ph, ox = r.ox, oz = r.oz, st = r.start * 3;
      for (let i = 0, n = r.count; i < n; i++) { const j = i * 3, y = bs[j + 1], d = -y; arr[st + j] = ox + bs[j] + Math.sin(d * 3.2 - t * 3.4 + k + ph) * .16 * d; arr[st + j + 2] = oz + bs[j + 2] + Math.cos(d * 2.7 - t * 2.9 + k) * .12 * d; arr[st + j + 1] = yo + y * sy; } }
    a.needsUpdate = true; } }
// ---------- MOCHI ----------
function makeMochi() {
  const mat = mochiMats[Math.random() * mochiMats.length | 0];
  const root = new THREE.Group(), sh = mesh(new THREE.CircleGeometry(1, 24), M.shadow, [.75, .75, 1]); sh.rotation.x = -Math.PI / 2; sh.position.y = .01; root.add(sh);
  const body = new THREE.Group(); root.add(body); const inner = new THREE.Group(); inner.position.y = .62; body.add(inner);
  const bg = new THREE.SphereGeometry(1, 24, 16); { const p = bg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, y < 0 ? y * .78 : y * .92); p.setX(i, p.getX(i) * (1 + (y < -.3 ? .08 : 0))); p.setZ(i, p.getZ(i) * (1 + (y < -.3 ? .08 : 0))); } bg.computeVertexNormals(); }
  inner.add(mesh(bg, mat, .7));
  eyes(inner, 0, .12, .6, .085, .22);
  inner.add(mesh(G.sphL, M.blush, [.11, .06, .03], [-.38, -.02, .55])); inner.add(mesh(G.sphL, M.blush, [.11, .06, .03], [.38, -.02, .55]));
  const mouth = new THREE.Mesh(LD.Torus(.06, .018, 6, 12, Math.PI), M.eye); mouth.position.set(0, -.04, .68); mouth.rotation.z = Math.PI; inner.add(mouth);
  { const E = Math.random() * 3 | 0, em = mat;
    for (const s of [-1, 1]) { if (E === 0) { const g = new THREE.Group(); g.position.set(s * .32, .52, 0); g.rotation.z = -s * .3; inner.add(g); g.add(mesh(G.sph, em, [.15, .5, .12], [0, .42, 0])); g.add(mesh(G.sphL, new THREE.MeshPhysicalMaterial({ color: 0xff9ec4, roughness: .5 }), [.08, .34, .06], [0, .4, .07])); }
      else if (E === 1) inner.add(mesh(G.sph, em, [.2, .19, .12], [s * .5, .54, 0])); else { const c = mesh(LD.Cone(1, 1, 4), em, [.2, .34, .14], [s * .4, .64, 0]); c.rotation.z = -s * .3; inner.add(c); } }
    if (Math.random() < .5) { const h = mesh(LD.Cone(1, 1, 12), new THREE.MeshPhysicalMaterial({ color: [0xff4f8f, 0x4fc3ff, 0xffd84a][Math.random() * 3 | 0], roughness: .4 }), [.22, .5, .22], [0, .8, 0]); h.rotation.z = .2; inner.add(h); inner.add(mesh(G.sphL, M.shine, .07, [.08, 1.05, 0])); }
    for (const s of [-1, 1]) inner.add(mesh(G.sph, em, [.2, .1, .22], [s * .3, -.52, .22])); }
  const arms = []; for (const s of [-1, 1]) { const pv = new THREE.Group(); pv.position.set(s * .6, .0, .1); inner.add(pv); pv.add(mesh(G.cap, mat, [.12, .1, .12], [0, .14, 0])); pv.rotation.z = s * -2.3; pv.userData.s = s; arms.push(pv); }
  root.userData = { body, inner, arms, sh, wave: 0, mouth };
  return root;
}
function animMochi(o, t, ph, dt) { const u = o.userData, c = (t * 1.7 + ph) % 1, hp = Math.sin(c * Math.PI); // salto parabólico
  const land = c < .12 || c > .9; const sq = land ? 1.22 - Math.abs(c < .5 ? c : c - 1) * 1.8 : 1 - hp * .08 + .04;
  u.body.position.y = hp * .9; u.body.scale.set(sq, 1 / sq, sq); u.sh.scale.setScalar(.75 * (1 - hp * .45)); u.sh.material.opacity = .16;
  u.inner.rotation.z = Math.sin(t * 3.4 + ph) * .08;
  if (u.wave <= 0 && Math.random() < dt * .3) u.wave = 1.8; u.wave -= dt; const wv = u.wave > 0;
  const r = u.arms[1]; r.rotation.z = wv ? 2.5 + Math.sin(t * 16) * .45 : THREE.MathUtils.lerp(r.rotation.z, -2.3 + hp * .6, .2);
  const l = u.arms[0]; l.rotation.z = 2.3 - hp * .6; u.mouth.scale.setScalar(wv ? 1.6 : 1); }
// ---------- TROFEO / MEDALLA ----------
const STAR = (() => { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? .07 : .16, a = i / 10 * Math.PI * 2 + Math.PI / 2; s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } return new THREE.ExtrudeGeometry(s, { depth: .03, bevelEnabled: true, bevelSize: .02, bevelThickness: .02, bevelSegments: 2 }); })();
const cupGeo = LD.Lathe([[0, -.7], [.42, -.7], [.42, -.6], [.2, -.55], [.1, -.4], [.08, -.15], [.18, -.05], [.42, .12], [.52, .45], [.55, .62], [.5, .64], [.45, .5], [0, .45]].map(a => new THREE.Vector2(a[0], a[1])), 40);
function makeTrophy() { const root = new THREE.Group(), g = new THREE.Group(); root.add(g);
  g.add(new THREE.Mesh(cupGeo, M.gold)); g.add(mesh(LD.Cylinder(.48, .52, .22, 32), M.base, 1, [0, -.8, 0]));
  for (const s of [-1, 1]) { const h = new THREE.Mesh(LD.Torus(.2, .05, 10, 20, Math.PI * 1.2), M.gold); h.position.set(s * .55, .3, 0); h.rotation.z = s > 0 ? -1.1 : Math.PI + 1.1 - 2.2 + 2.2; if (s < 0) h.rotation.y = Math.PI; h.rotation.z = -1.0; g.add(h); }
  const star = STAR; (() => { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? .07 : .16, a = i / 10 * Math.PI * 2 + Math.PI / 2; s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } return new THREE.ExtrudeGeometry(s, { depth: .03, bevelEnabled: true, bevelSize: .02, bevelThickness: .02, bevelSegments: 2 }); })();
  g.add(mesh(star, M.silver, 1, [0, .2, .45])); root.userData = { g, spin: 1 }; return root; }
function makeMedal() { const root = new THREE.Group(), g = new THREE.Group(); root.add(g);
  const disc = new THREE.Mesh(LD.Cylinder(.5, .5, .1, 40), Math.random() < .5 ? M.gold : M.silver); disc.rotation.x = Math.PI / 2; g.add(disc);
  const rimT = new THREE.Mesh(LD.Torus(.5, .05, 10, 40), M.gold); g.add(rimT);
  const gold = disc.material === M.gold; const st = mesh(STAR, gold ? M.silver : M.gold, 1.6, [0, 0, .05]); g.add(st); const st2 = mesh(STAR, gold ? M.silver : M.gold, 1.6, [0, 0, -.05]); st2.rotation.y = Math.PI; g.add(st2); const ring2 = new THREE.Mesh(LD.Torus(.36, .02, 8, 40), M.base); ring2.position.z = .05; g.add(ring2);
  for (const s of [-1, 1]) { const rb = mesh(new THREE.PlaneGeometry(.26, .9), M.ribbon, 1, [s * .15, .85, -.03]); rb.rotation.z = s * .3; g.add(rb); }
  root.userData = { g, spin: 1 }; return root; }
// ---------- GESTIÓN DEL DESFILE ----------
const R = (a, b) => a + Math.random() * (b - a);
let W = 1, H = 1, ents = [], quality = 1, PR = 1, lite = new URLSearchParams(location.search).get('detalle') === 'bajo';
function size() { W = innerWidth; H = innerHeight; if (SH) PR = rd.getPixelRatio(); else { PR = Math.min(devicePixelRatio || 1, 2); rd.setPixelRatio(PR); rd.setSize(W, H, false); } cam.aspect = W / H; cam.updateProjectionMatrix(); }
if (!SH) addEventListener('resize', size);
const TAN = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
// pantalla (sx,sy en 0..1) + profundidad d -> mundo
const toWorld = (sx, sy, d, v) => v.set((sx * 2 - 1) * d * TAN * cam.aspect, (1 - sy * 2) * d * TAN, -d);
const band = (kind) => { const land = W > H, r = Math.random();
  if (kind === 'ground') return land ? .93 : .955;
  if (r < .58) return R(.05, land ? .17 : .12); return R(land ? .84 : .88, land ? .9 : .93); };
const KINDS = { camel: { make: makeCamel, n: 3, s: 1.0 }, jelly: { make: makeJelly, n: 4, s: .9 }, mochi: { make: makeMochi, n: 5, s: 1.0 }, trophy: { make: makeTrophy, n: 1, s: .9 }, medal: { make: makeMedal, n: 2, s: .8 } };
const GLB = makeGlowBatch(scene, 160, { raw: true, core: .3 }), CLB = makeGlowBatch(scene, 48, { tex: cloudTex(), order: -5, additive: false }); HOOK.glow = GLB; HOOK.cloud = CLB; // o46: destellos y nubes = 1 llamada cada uno
const WORLD = buildWorld(scene, cam, {});
// o46: cada pieza se fusiona UNA vez al crearla y luego se reutiliza (antes se creaban geometrías/materiales nuevos cada vez que una salía de pantalla)
const ST = [0, .37, 1.1, 2.3, 3.7, 5.2, 7.9, 11.3], SP = [0, 1.3, 2.6, 4.1, .7, 5.5, 3.3, 6.2], BAKES = { n: 0, before: 0, after: 0 };
function bakeEntity(k, o) {
  const adv = { camel: i => animCamel(o, ST[i], SP[i]), mochi: i => { o.userData.wave = i % 2 ? 1.8 : 0; animMochi(o, ST[i], SP[i], .016); }, jelly: i => animJelly(o, ST[i], SP[i]),
    trophy: i => { const g = o.userData.g; g.rotation.y = ST[i] * 1.4 + SP[i]; g.position.y = Math.sin(ST[i] * 2 + SP[i]) * .12; o.rotation.z = Math.sin(ST[i] * 1.3) * .15; },
    medal: i => { const g = o.userData.g; g.rotation.y = ST[i] * 1.4 + SP[i]; g.position.y = Math.sin(ST[i] * 2 + SP[i]) * .12; o.rotation.z = Math.sin(ST[i] * 1.3) * .15; } }[k];
  const r = bakeStatic(o, adv, { samples: ST.length }); BAKES.n++; BAKES.before += r.meshesBefore; BAKES.after += r.meshesAfter; return o; }
function spawn(k, init, reuse) { const K = KINDS[k], o = reuse || bakeEntity(k, K.make()), dir = Math.random() < .5 ? 1 : -1, d = R(10, 17);
  const e = { k, o, dir, d, ph: R(0, 9), sy: band(k === 'mochi' ? 'ground' : 'air'), sx: dir > 0 ? -.15 : 1.15, v: R(.045, .075) * 12 / d, s: K.s * R(.85, 1.1) };
  if (k === 'jelly') { e.sx = Math.random() < .5 ? R(.04, .16) : R(.84, .96); e.sy = 1.15; e.v = R(.03, .045) * 12 / d; }
  if (k === 'mochi') { e.d = R(9, 12); e.v = R(.05, .07) * 12 / e.d; }
  if (init) { if (k === 'jelly') e.sy = R(.1, 1.1); else e.sx = R(0, 1); }
  // tamaño: que mida ~ un % fijo del lado menor
  const px = Math.min(W, H) * (k === 'mochi' ? .085 : k === 'camel' ? .19 : .12) * (W > H ? .85 : 1), wpp = 2 * e.d * TAN / H;
  o.scale.setScalar(px * wpp / (k === 'camel' ? 2.6 : 1.6) * e.s);
  if (k === 'camel' || k === 'mochi') o.rotation.y = dir > 0 ? (k === 'camel' ? -.35 : .5) : (k === 'camel' ? Math.PI + .35 : -.5);
  if (!reuse) { o.traverse(m => { if (m.isMesh) m.frustumCulled = false; }); scene.add(o); }
  return e; }
const WT = [3, 8.7, 15.2, 22.9, 31.4, 47.1];
function bakeWorld() { const r = bakeStatic(WORLD.world, i => WORLD.update(WT[i], .016), { samples: WT.length }); BAKES.world = r; }
let MEGA = null, layerA = null, layerB = null;
const ACES = THREE.ACESFilmicToneMapping, EXPO = .95;
function mkLayer(cls) { const c = document.createElement('canvas'); c.className = 'dsfLayer ' + cls; c.setAttribute('aria-hidden', 'true'); c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:' + (CFG.z ?? 8); const ref = document.getElementById('menuBg'); if (ref) ref.parentNode.insertBefore(c, ref.nextSibling); else document.body.prepend(c); return c; }
/* o47: el MUNDO (sol, arcoíris, planetas, nubes, islas, globos, aros, purpurina) se dibuja UNA vez a alta resolución en 2 capas y se anima con CSS (transform): coste 3D = 0 por fotograma */
function prerenderWorld() {
  if (!layerA) { layerB = mkLayer('dsfB'); layerA = mkLayer('dsfA'); }
  WORLD.world.visible = true; CLB.mesh.visible = true; GLB.mesh.visible = true; WORLD.update(3, .016); WORLD.update(3.02, .016);
  cam.position.set(0, 0, 0); cam.lookAt(0, 0, -20); cam.updateMatrixWorld(true);
  const ch = WORLD.world.children.slice(), n = ch.length, A = ch.slice(0, n - 5), B = ch.slice(n - 2); /* [..., 3 islas, 3 globos, aros, purpurina] → A = cielo+islas+globos lejanos, B = aros + purpurina */
  const bal = ch.slice(n - 5, n - 2);
  const tm = rd.toneMapping, ex = rd.toneMappingExposure, ac = rd.autoClear, w = rd.domElement.width, h = rd.domElement.height;
  const one = (vis, cvs) => { for (const c of ch) c.visible = vis.includes(c); rd.setRenderTarget(null); rd.setScissorTest(false); rd.setViewport(0, 0, W, H); rd.setClearColor(0x000000, 0); rd.autoClear = true; rd.toneMapping = ACES; rd.toneMappingExposure = EXPO; rd.clear(); rd.render(scene, cam);
    if (cvs.width !== w || cvs.height !== h) { cvs.width = w; cvs.height = h; } const x = cvs.getContext('2d'); x.clearRect(0, 0, w, h); x.drawImage(rd.domElement, 0, 0); };
  one(A, layerA); one(bal.concat(B), layerB);
  rd.toneMapping = tm; rd.toneMappingExposure = ex; rd.autoClear = ac; rd.clear();
  for (const c of ch) c.visible = true; WORLD.world.visible = false; CLB.mesh.visible = false; GLB.reset(); CLB.reset();
}
// o47: las figuras en vivo se dibujan DESPUÉS de la escena principal y solo donde esta no ha pintado (stencil), así quedan «detrás» del escenario como antes sin un 2.º canvas
function markStencil() { const f = m => { if (!m || !m.userData || m.userData._st) return; m.userData._st = 1; m.stencilWrite = true; m.stencilFunc = THREE.NotEqualStencilFunc; m.stencilRef = 1; m.stencilFail = m.stencilZFail = m.stencilZPass = THREE.KeepStencilOp; };
  scene.traverse(o => { if (o.material) Array.isArray(o.material) ? o.material.forEach(f) : f(o.material); }); }
function populate() { if (MEGA) { MEGA.dispose(); MEGA = null; } GLB.reset(); CLB.reset(); WORLD.setLite(lite); WORLD.rebuild(); for (const e of ents) scene.remove(e.o); ents = [];
  if (SH) { prerenderWorld(); } else bakeWorld();
  if (opts.noEnts) return; // o48: las figuras del desfile son sprites pre-renderizados (ver sprites())
  for (const k in KINDS) for (let i = 0; i < KINDS[k].n; i++) { const e = spawn(k, true); e.idx = i; if (lite && i > 0) e.o.visible = false; ents.push(e); } MEGA = megaMerge(scene); BAKES.mega = { merged: MEGA.merged, before: MEGA.before }; if (SH) markStencil(); }
size(); populate(); addEventListener('orientationchange', () => setTimeout(() => { size(); populate(); }, 300));
let lastLand = W > H; addEventListener('resize', () => { if (SH) size(); if ((W > H) !== lastLand) { lastLand = W > H; populate(); } });
const PXs = { x: 0, y: 0, tx: 0, ty: 0 }; addEventListener('pointermove', e => { PXs.tx = (e.clientX / innerWidth - .5) * 2; PXs.ty = (e.clientY / innerHeight - .5) * -2; }, { passive: true }); addEventListener('deviceorientation', e => { if (e.gamma == null) return; PXs.tx = Math.max(-1, Math.min(1, e.gamma / 30)); PXs.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 30)) * -1; }, { passive: true });
const v = new THREE.Vector3(); let last = performance.now(), cvOn = true;
function step(t, dt) {
  PXs.x += (PXs.tx - PXs.x) * .04; PXs.y += (PXs.ty - PXs.y) * .04; cam.position.set(Math.sin(t * .17) * .5 + PXs.x * .8, Math.cos(t * .13) * .22 + PXs.y * .4, 0); cam.lookAt(0, 0, -20); if (!SH) WORLD.update(t, dt);
  for (let i = 0; i < ents.length; i++) { const e = ents[i], o = e.o;
    if (e.k === 'jelly') { e.sy -= e.v * dt * (.5 + .7 * Math.max(0, Math.sin(t * 2.4 + e.ph - 1))); if (e.sy < -.2) { ents[i] = spawn('jelly', false, o); ents[i].idx = e.idx; if (lite && e.idx > 0) ents[i].o.visible = false; continue; } }
    else { e.sx += e.v * e.dir * dt; if (e.sx < -.25 || e.sx > 1.25) { ents[i] = spawn(e.k, false, o); ents[i].idx = e.idx; if (lite && e.idx > 0) ents[i].o.visible = false; continue; } }
    // trayectoria curva suave
    const wob = e.k === 'jelly' ? 0 : e.k === 'mochi' ? 0 : Math.sin(t * .9 + e.ph) * .015;
    toWorld(e.sx + (e.k === 'jelly' ? Math.sin(t * .7 + e.ph) * .02 : 0), e.sy + wob, e.d, v); o.position.copy(v);
    if (e.k === 'camel') animCamel(o, t, e.ph);
    else if (e.k === 'jelly') { animJelly(o, t, e.ph); o.rotation.z = Math.sin(t * .8 + e.ph) * .15; o.rotation.y = t * .3; }
    else if (e.k === 'mochi') animMochi(o, t, e.ph, dt);
    else { const g = o.userData.g; g.rotation.y = t * 1.4 + e.ph; g.position.y = Math.sin(t * 2 + e.ph) * .12; o.rotation.z = Math.sin(t * 1.3 + e.ph) * .15; }
  }
}
function setOn(on) { if (on === cvOn) return; cvOn = on; if (SH) { if (layerA) layerA.style.display = layerB.style.display = on ? '' : 'none'; } else if (cv) cv.style.display = on ? '' : 'none'; }
/* dibujo en vivo dentro del renderer compartido (después del 3D principal) */
function draw() { const tm = rd.toneMapping, ex = rd.toneMappingExposure, ac = rd.autoClear; rd.setScissorTest(false); rd.setViewport(0, 0, W, H); rd.autoClear = false; rd.clearDepth(); rd.toneMapping = ACES; rd.toneMappingExposure = EXPO; rd.render(scene, cam); rd.toneMapping = tm; rd.toneMappingExposure = ex; rd.autoClear = ac; }
if (!SH) { rd.setClearColor(0, 0); rd.outputColorSpace = THREE.SRGBColorSpace; rd.toneMapping = ACES; rd.toneMappingExposure = EXPO;
  const frame = now => { requestAnimationFrame(frame); const on = isOn() && !document.hidden; setOn(on); if (!on) { last = now; return; } const dt = Math.min(.07, (now - last) / 1000); last = now; step(now / 1000, dt); rd.render(scene, cam); };
  requestAnimationFrame(frame); }
if (SH) { const tm = rd.toneMapping; rd.toneMapping = ACES; try { rd.compile(scene, cam); } catch (e) {} rd.toneMapping = tm; }
/* o48: figuras del desfile (camellos, medusas, mochis, trofeo, medallas) = SPRITES pre-renderizados a alta resolución (tira de 12 fotogramas por figura) que se desplazan solo con transform en GPU (CSS): 0 trabajo de 3D/JS por fotograma */
const SPN = 12; let spHost = null;
async function sprites(prog) {
  if (!SH) return; if (spHost) spHost.remove();
  const host = spHost = document.createElement('div'); host.id = 'dsfSprites'; host.setAttribute('aria-hidden', 'true'); host.style.cssText = 'position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:' + (CFG.z ?? 8) + ';display:none;--vw:' + innerWidth + 'px;--vh:' + innerHeight + 'px';
  if (!document.getElementById('dsfSpCss')) { const st = document.createElement('style'); st.id = 'dsfSpCss'; const pp = [], lp = [], L = 2 * SPN - 2;
    for (let i = 0; i < L; i++) { const k = i < SPN ? i : L - i; pp.push((i / L * 100).toFixed(3) + '%{transform:translate3d(' + (-k * 100 / SPN).toFixed(4) + '%,0,0)}'); }
    for (let i = 0; i < SPN; i++) lp.push((i / SPN * 100).toFixed(3) + '%{transform:translate3d(' + (-i * 100 / SPN).toFixed(4) + '%,0,0)}');
    st.textContent = '#dsfSprites .dsfS{position:absolute;left:0;top:0;width:var(--s);height:var(--s);will-change:transform;animation:dsfX linear infinite}#dsfSprites .dsfS.r{animation-name:dsfXr}#dsfSprites .dsfS.j{animation-name:dsfY}' +
      '@keyframes dsfX{from{transform:translate3d(calc(var(--s)*-1),0,0)}to{transform:translate3d(var(--vw),0,0)}}@keyframes dsfXr{from{transform:translate3d(var(--vw),0,0)}to{transform:translate3d(calc(var(--s)*-1),0,0)}}@keyframes dsfY{from{transform:translate3d(0,var(--vh),0)}to{transform:translate3d(0,calc(var(--s)*-1),0)}}' +
      '#dsfSprites .dsfM.f{transform:scaleX(-1)}#dsfSprites .dsfB{width:100%;height:100%;overflow:hidden;animation:dsfBob var(--bd,3s) ease-in-out infinite alternate}@keyframes dsfBob{from{transform:translate3d(0,-6%,0)}to{transform:translate3d(0,6%,0)}}#dsfSprites .j .dsfB{animation-name:dsfSway}@keyframes dsfSway{from{transform:translate3d(-14%,0,0)}to{transform:translate3d(14%,0,0)}}' +
      '#dsfSprites .dsfF{height:100%;background-size:100% 100%;animation:dsfPP steps(1,end) infinite}#dsfSprites .dsfF.l{animation-name:dsfLP}@keyframes dsfPP{' + pp.join('') + '}@keyframes dsfLP{' + lp.join('') + '}'; document.head.appendChild(st); }
  const tcam = new THREE.PerspectiveCamera(26, 1, .1, 300), PRr = rd.getPixelRatio(), sheets = {};
  const world = WORLD.world, wv = world.visible, tm = rd.toneMapping, ex = rd.toneMappingExposure, ac = rd.autoClear; world.visible = false; GLB.mesh.visible = CLB.mesh.visible = true; rd.toneMapping = ACES; rd.toneMappingExposure = EXPO; rd.setClearColor(0x000000, 0); rd.autoClear = true;
  const m = Math.min(innerWidth, innerHeight) * (innerWidth > innerHeight ? .85 : 1), CELL = { camel: m * .19 * 1.9, jelly: m * .12 * 2.2, mochi: m * .085 * 2.4, trophy: m * .12 * 1.9, medal: m * .12 * 1.9 };
  const POSE = { camel: (o, i, t) => animCamel(o, t, 0), jelly: (o, i, t) => animJelly(o, t, 0), mochi: (o, i, t) => { o.userData.wave = i % 2 ? 1.8 : 0; animMochi(o, t, 0, .016); },
    trophy: (o, i, t) => { const g = o.userData.g; g.rotation.y = t * 1.4; g.position.y = Math.sin(t * 2) * .12; o.rotation.z = Math.sin(t * 1.3) * .15; } }; POSE.medal = POSE.trophy;
  const STEP = { camel: .0875, jelly: .22, mochi: 1 / 1.7 / SPN, trophy: 2 * Math.PI / 1.4 / SPN, medal: 2 * Math.PI / 1.4 / SPN };
  for (const k in KINDS) {
    const o = KINDS[k].make(); o.traverse(q => { if (q.isMesh) q.frustumCulled = false; }); if (k === 'camel') o.rotation.y = -.35; if (k === 'mochi') o.rotation.y = .5; scene.add(o);
    const S = Math.round(CELL[k]), A = Math.round(S * Math.min(PRr, 2)), sheet = document.createElement('canvas'); sheet.width = A * SPN; sheet.height = A; const sx = sheet.getContext('2d');
    for (let i = 0; i < SPN; i++) {
      POSE[k](o, i, i * STEP[k]); o.updateMatrixWorld(true);
      if (i === 0) { const b = new THREE.Box3().setFromObject(o), c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3()), rad = Math.max(sz.x, sz.y) * .5 * (k === 'jelly' ? 1.5 : 1.3), dist = rad / Math.tan(THREE.MathUtils.degToRad(13)); tcam.position.set(c.x, c.y, c.z + dist + sz.z * .5); tcam.lookAt(c); tcam.updateMatrixWorld(true); }
      rd.setScissorTest(false); rd.setViewport(0, 0, S, S); rd.clear(); rd.setScissorTest(true); rd.setScissor(0, 0, S, S); rd.render(scene, tcam);
      sx.drawImage(rd.domElement, 0, rd.domElement.height - S * PRr, S * PRr, S * PRr, i * A, 0, A, A);
      if (i % 4 === 3) await new Promise(r => setTimeout(r, 0));
    }
    scene.remove(o); GLB.reset(); CLB.reset(); rd.setScissorTest(false);
    sheets[k] = await new Promise(r => sheet.toBlob(b => r(URL.createObjectURL(b)), 'image/webp', .92)); if (prog) prog(Object.keys(sheets).length / 5);
  }
  rd.setScissorTest(false); rd.setViewport(0, 0, innerWidth, innerHeight); rd.clear(); world.visible = wv; GLB.mesh.visible = CLB.mesh.visible = false; rd.toneMapping = tm; rd.toneMappingExposure = ex; rd.autoClear = ac;
  const land = innerWidth > innerHeight, vh = innerHeight;
  for (const k in KINDS) for (let i = 0; i < KINDS[k].n; i++) {
    const S = Math.round(CELL[k] * R(.85, 1.1)), w = document.createElement('div'), dir = Math.random() < .5 ? 1 : -1, jelly = k === 'jelly', dur = jelly ? R(26, 38) : k === 'mochi' ? R(15, 22) : R(18, 28);
    const y = jelly ? 0 : k === 'mochi' ? vh * (land ? .93 : .955) - S * .85 : vh * (Math.random() < .58 ? R(.05, land ? .17 : .12) : R(land ? .84 : .88, land ? .9 : .93)) - S * .5;
    w.className = 'dsfS' + (jelly ? ' j' : dir < 0 ? ' r' : ''); w.style.cssText = '--s:' + S + 'px;animation-duration:' + dur.toFixed(1) + 's;animation-delay:-' + (Math.random() * dur).toFixed(1) + 's;' + (jelly ? 'left:' + (innerWidth * (Math.random() < .5 ? R(.02, .16) : R(.78, .94))).toFixed(0) + 'px;' : 'top:' + y.toFixed(0) + 'px;');
    const cyc = k === 'camel' ? 1.05 : k === 'jelly' ? 2.6 * 2 : k === 'mochi' ? .6 : 1.0, loopK = k === 'mochi' || k === 'trophy' || k === 'medal';
    w.innerHTML = '<div class="dsfM' + (dir < 0 && !jelly ? ' f' : '') + '" style="width:100%;height:100%"><div class="dsfB" style="--bd:' + R(2.2, 4).toFixed(1) + 's' + (k === 'mochi' ? ';animation:none' : '') + '"><div class="dsfF' + (loopK ? ' l' : '') + '" style="width:' + SPN * 100 + '%;background-image:url(' + sheets[k] + ');animation-duration:' + cyc + 's"></div></div></div>';
    host.appendChild(w);
  }
  document.body.appendChild(host);
}
function spriteShow(on) { if (spHost) spHost.style.display = on ? '' : 'none'; }
const api = { sprites, spriteShow, step, draw, setOn, isOn: () => isOn() && !document.hidden, resize() { size(); }, scene, cam, get ents() { return ents; }, BAKES, world: WORLD, get info() { return rd.info; }, get quality() { return quality; }, GLB, CLB };
if (!SH) window.__desfile3d = api;
return api;
}
/* modo autónomo (olimpiadas.html y otras): canvas y renderer propios */
if (!CFG0.noAuto) { const cv = document.createElement('canvas'); cv.id = 'desfile'; cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:' + (CFG0.z ?? 8);
  const ref = CFG0.before && document.getElementById(CFG0.before); if (ref) ref.parentNode.insertBefore(cv, ref.nextSibling); else document.body.prepend(cv);
  let rd; try { rd = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: (devicePixelRatio || 1) < 1.5, powerPreference: 'high-performance' }); } catch (e) { cv.remove(); throw e; }
  createDesfile(rd, { cv }); }
