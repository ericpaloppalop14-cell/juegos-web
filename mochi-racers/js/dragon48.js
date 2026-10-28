// ======================================================================
//  MOCHI RACERS v48 · DRAGÓN COLOSAL ÉPICO
//  Cuerpo facetado de escamas (instanciadas), cuello sinuoso, cabeza con cuernos curvos, colmillos y fuego,
//  alas de murciélago con huesos y membrana brillante, cola segmentada con pinchos y hoja, patas con garras,
//  ojos de fuego con pupila rasgada y brasas flotando. Mantiene la interfaz de v32 (root/head/eyes/mouth/wings/tail/reins/bit).
// ======================================================================
import * as THREE from 'three';
import { toon, mesh, glowTex } from './gfx.js';
const V3 = THREE.Vector3, TAU = Math.PI * 2;
const G = {}, M = {};
const sg = (k, f) => G[k] || (G[k] = Object.assign(f(), { _shared: true }));
const mm = (k, f) => M[k] || (M[k] = f());
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.42, metalness: 0.22, flatShading: true, ...o });
const mats = () => ({
  skin: mm('skin', () => std('#ffffff', { vertexColors: true })),
  scale: mm('scale', () => std('#ffffff', { roughness: 0.35, metalness: 0.35 })),
  bone: mm('bone', () => std('#f6e7c2', { roughness: 0.5, metalness: 0.1 })),
  horn: mm('horn', () => std('#ffffff', { vertexColors: true, roughness: 0.5, metalness: 0.05, emissive: '#3a2008', emissiveIntensity: 0.4 })),
  gold: mm('gold', () => std('#ffcf4a', { roughness: 0.25, metalness: 0.75, emissive: '#7a4a00', emissiveIntensity: 0.35 })),
  dark: mm('dark', () => std('#2a0f22', { roughness: 0.6 })),
  wingBone: mm('wingBone', () => std('#4a1230', { roughness: 0.45, metalness: 0.2 })),
  membrane: mm('membrane', () => new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.6, side: THREE.DoubleSide, emissive: '#ff4a1a', emissiveIntensity: 0.28, transparent: true, opacity: 0.95, flatShading: false })),
  eye: mm('eye', () => new THREE.MeshBasicMaterial({ color: '#ffd23a' })),
  slit: mm('slit', () => new THREE.MeshBasicMaterial({ color: '#1a0008' })),
  fireO: mm('fireO', () => new THREE.MeshBasicMaterial({ color: '#ff5a14', transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false })),
  fireM: mm('fireM', () => new THREE.MeshBasicMaterial({ color: '#ffb02a', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })),
  fireI: mm('fireI', () => new THREE.MeshBasicMaterial({ color: '#fff2b0', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })),
  mouth: mm('mouth', () => new THREE.MeshBasicMaterial({ color: '#ff6a1a' })),
});

// ---------- tubo facetado a lo largo de una curva, con radios rx/ry por punto de control y color por vértice ----------
function tubeGeo(pts, rx, ry, radial, segs, col, cap = true) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new V3(...p)), false, 'catmullrom', 0.5), n = pts.length - 1;
  const pos = [], colr = [], idx = [], X = new V3(), Y = new V3(), T = new V3(), P = new V3(), c = new THREE.Color();
  const lerpR = (arr, t) => { const f = t * n, i = Math.min(n - 1, Math.floor(f)), k = f - i; return arr[i] + (arr[i + 1] - arr[i]) * k; };
  const frames = [];
  for (let s = 0; s <= segs; s++) {
    const t = s / segs; curve.getPoint(t, P); curve.getTangent(t, T).normalize();
    const ref = Math.abs(T.y) > 0.95 ? new V3(0, 0, 1) : new V3(0, 1, 0);
    X.crossVectors(ref, T).normalize(); Y.crossVectors(T, X).normalize();
    const a = lerpR(rx, t) * (s % 2 && col && col.ribs ? 0.96 : 1), b = lerpR(ry, t) * (s % 2 && col && col.ribs ? 0.96 : 1);
    frames.push({ P: P.clone(), X: X.clone(), Y: Y.clone(), T: T.clone(), a, b, t });
    for (let r = 0; r < radial; r++) { const an = r / radial * TAU, ca = Math.cos(an), sa = Math.sin(an);
      pos.push(P.x + X.x * a * ca + Y.x * b * sa, P.y + X.y * a * ca + Y.y * b * sa, P.z + X.z * a * ca + Y.z * b * sa);
      if (col) { col.fn(c, t, ca, sa, s); colr.push(c.r, c.g, c.b); } }
  }
  for (let s = 0; s < segs; s++) for (let r = 0; r < radial; r++) { const a = s * radial + r, b = s * radial + (r + 1) % radial, cc = a + radial, d = b + radial; idx.push(a, cc, b, b, cc, d); }
  if (cap) for (const [s, flip] of [[0, true], [segs, false]]) { const f = frames[s], ci = pos.length / 3; pos.push(f.P.x, f.P.y, f.P.z); if (col) { col.fn(c, f.t, 0, s ? 1 : -1, s); colr.push(c.r, c.g, c.b); }
    for (let r = 0; r < radial; r++) { const a = s * radial + r, b = s * radial + (r + 1) % radial; flip ? idx.push(ci, a, b) : idx.push(ci, b, a); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); if (col) g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
  g.setIndex(idx); g.computeVertexNormals(); g.userData.curve = curve; g.userData.frames = frames; g.userData.rx = rx; g.userData.ry = ry; return Object.assign(g, { _shared: true });
}
const C = (h) => new THREE.Color(h);
const mix = (o, a, b, k) => o.copy(a).lerp(b, k);

// ---------- torso + cuello (una sola malla facetada) ----------
const BODY_PTS = [[0, 2.3, -2.7], [0, 2.4, -1.4], [0, 2.5, 0.2], [0, 2.7, 1.8], [0, 3.3, 3.1], [0, 4.2, 4.2], [0, 5.0, 5.2], [0, 5.3, 5.9]];
const BODY_RX = [0.85, 1.55, 1.85, 1.7, 1.3, 1.0, 0.82, 0.78], BODY_RY = [0.8, 1.45, 1.72, 1.6, 1.25, 0.95, 0.78, 0.74];
function bodyGeo() {
  const top = C('#7a0f3a'), side = C('#c21f4a'), belly = C('#ffc65a'), belly2 = C('#ff9a3a');
  return sg('body', () => tubeGeo(BODY_PTS, BODY_RX, BODY_RY, 14, 44, { ribs: true, fn: (o, t, ca, sa, s) => {
    if (sa < -0.35) mix(o, belly2, belly, (s % 2) * 0.7 + 0.15); else { mix(o, side, top, Math.max(0, sa) * 0.9); } } }));
}
function addScales(root, bg) {
  const fr = bg.userData.frames, rx = null; const list = [];
  const rows = [];
  for (let s = 3; s < fr.length - 8; s += 1) rows.push(s);
  const angs = [-0.2, 0.35, 0.8, 1.25, 1.7, 2.15, 2.6, 2.95];
  rows.forEach((s, ri) => { const f = fr[s]; for (const sd of [-1, 1]) angs.forEach((a0, ai) => { const an = a0 + (ri % 2) * 0.22; const ca = Math.cos(an), sa = Math.sin(an);
    const xv = sd * ca; const p = new V3().copy(f.P).addScaledVector(f.X, f.a * xv * 1.03).addScaledVector(f.Y, f.b * sa * 1.03);
    const nrm = new V3().addScaledVector(f.X, xv / f.a).addScaledVector(f.Y, sa / f.b).normalize();
    list.push({ p, nrm, T: f.T, k: (ri + ai) % 3, sz: 0.9 + (f.a > 1 ? 0.25 : 0) }); }); });
  const ig = sg('scaleG', () => new THREE.OctahedronGeometry(1, 0)), im = new THREE.InstancedMesh(ig, mats().scale, list.length);
  const M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qt = new THREE.Quaternion().setFromAxisAngle(new V3(1, 0, 0), -0.38), cols = [C('#ffb347'), C('#e8283c'), C('#a1163d')];
  list.forEach((o, i) => { const z = o.T.clone().multiplyScalar(-1), y = o.nrm.clone(), x = new V3().crossVectors(y, z).normalize(); z.crossVectors(x, y).normalize(); M4.makeBasis(x, y, z); q.setFromRotationMatrix(M4).multiply(qt);
    M4.compose(o.p, q, new V3(0.24 * o.sz, 0.09, 0.36 * o.sz)); im.setMatrixAt(i, M4); im.setColorAt(i, cols[o.k]); });
  im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.frustumCulled = false; root.add(im);
}

// ---------- cuerno curvo ----------
function hornGeo(pts, r0, ring = 4) {
  return tubeGeo(pts, pts.map((_, i) => r0 * (1 - i / pts.length)), pts.map((_, i) => r0 * (1 - i / pts.length)), 7, 14, { fn: (o, t) => { mix(o, C('#5a1830'), C('#fff0b8'), Math.min(1, t * 1.2)); if (Math.floor(t * 14) % 3 === 0 && t < 0.7) o.multiplyScalar(0.82); } });
}
const cone = (n = 5) => sg('cone' + n, () => new THREE.ConeGeometry(1, 1, n));
const boxg = () => sg('box', () => new THREE.BoxGeometry(1, 1, 1));
const octa = () => sg('octa', () => new THREE.OctahedronGeometry(1, 0));
const ico = () => sg('ico', () => new THREE.IcosahedronGeometry(1, 1));

// ---------- membrana del ala: paños festoneados entre dedos ----------
function wingGeo() {
  return sg('wing48', () => {
    const W = [4.4, 1.5], tips = [[11.2, 0.6], [10.2, -3.4], [7.6, -6.0], [4.6, -6.8]], S = [0.3, 0.0], B = [0.5, -3.6];
    const pos = [], col = [], idx = [], c = new THREE.Color(), cb = C('#4a0a2e'), ce = C('#ff7a2a'), cm = C('#c11a52');
    const vtx = (x, z, e) => { pos.push(x, 0, z); mix(c, cb, e < 0.3 ? cm : ce, Math.max(0, e)); if (e > 0.3) c.lerp(cm, 0.1); col.push(c.r, c.g, c.b); return pos.length / 3 - 1; };
    const w = vtx(W[0], W[1], -0.4);
    const edge = (a, b, nSeg, sag) => { const out = []; for (let i = 0; i <= nSeg; i++) { const k = i / nSeg; const x = a[0] + (b[0] - a[0]) * k, z = a[1] + (b[1] - a[1]) * k; const dx = W[0] - (a[0] + b[0]) / 2, dz = W[1] - (a[1] + b[1]) / 2, L = Math.hypot(dx, dz) || 1, s = Math.sin(k * Math.PI) * sag; out.push(vtx(x + dx / L * s, z + dz / L * s, 0.75 + Math.sin(k * Math.PI) * 0.25)); } return out; };
    const chain = [tips[0]]; let prevIdx = null;
    for (let i = 0; i < tips.length - 1; i++) { const e = edge(tips[i], tips[i + 1], 8, 1.7); for (let j = 0; j < e.length - 1; j++) idx.push(w, e[j], e[j + 1]); }
    const e2 = edge(tips[3], B, 6, 1.3); for (let j = 0; j < e2.length - 1; j++) idx.push(w, e2[j], e2[j + 1]);
    const s = vtx(S[0], S[1], 0.0), b = e2[e2.length - 1]; idx.push(w, b, s);
    const e3 = edge(S, W, 1, 0); // brazo (solo para cerrar)
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    // curvatura suave hacia arriba en el centro (efecto "viento")
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, Math.sin(x / 11.2 * Math.PI) * 0.35 - Math.max(0, -z) * 0.08); } g.computeVertexNormals(); return g; });
}
function bone(parent, a, b, r0, r1, m) { // hueso facetado entre dos puntos (sistema local del ala)
  const A = new V3(...a), B = new V3(...b), d = B.clone().sub(A), L = d.length(), g = sg(`bn${r0}_${r1}`, () => new THREE.CylinderGeometry(r1, r0, 1, 6));
  const o = new THREE.Mesh(g, m); o.position.copy(A).addScaledVector(d, 0.5); o.scale.set(1, L, 1); o.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); parent.add(o); return o;
}

export function buildDragon() {
  const m = mats(), g = new THREE.Group(), u = g.userData;
  const root = new THREE.Group(); root.position.y = -3.7; g.add(root); u.root = root;
  // ---- cuerpo y escamas ----
  const bg = bodyGeo(); const body = new THREE.Mesh(bg, m.skin); root.add(body); body.frustumCulled = false; addScales(root, bg);
  // ---- púas dorsales (a lo largo del lomo y el cuello) ----
  const fr = bg.userData.frames;
  for (let s = 2; s < fr.length - 3; s += 3) { const f = fr[s]; if (f.P.z > -1.0 && f.P.z < 1.5) continue; const h = 0.5 + Math.sin(s / fr.length * Math.PI) * 0.8;
    const sp = mesh(cone(5), m.gold, root, [f.P.x, f.P.y + f.b * 0.95, f.P.z], [-0.55 - (s > 28 ? 0.3 : 0), 0, 0], [0.22 + h * 0.18, h, 0.22 + h * 0.18]); 
    const sp2 = mesh(cone(5), m.dark, root, [f.P.x, f.P.y + f.b * 0.78, f.P.z + 0.0], [-0.4, 0, 0], [0.34 + h * 0.2, h * 0.5, 0.34 + h * 0.2]); }
  // ---- pecho brillante ----
  { const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#ffb347'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 })); gl.scale.setScalar(3.6); gl.position.set(0, 2.6, 2.7); root.add(gl); u.chest = gl;
    mesh(octa(), m.gold, root, [0, 2.45, 3.0], [0, 0, 0], [0.5, 0.65, 0.35]); }
  // ---- piernas ----
  const legG = (hind) => sg('leg' + hind, () => tubeGeo(hind ? [[0, 0, 0], [0.35, -0.9, -0.3], [0.1, -1.7, 0.15], [0.12, -2.1, 0.5]] : [[0, 0, 0], [0.25, -0.8, 0.15], [0.05, -1.6, 0.2], [0.05, -1.95, 0.45]], hind ? [0.75, 0.6, 0.34, 0.3] : [0.55, 0.42, 0.28, 0.26], hind ? [0.8, 0.55, 0.3, 0.3] : [0.55, 0.42, 0.28, 0.26], 7, 8, { fn: (o, t, ca, sa) => mix(o, C('#c21f4a'), C('#7a0f3a'), t) }));
  for (const [x, z, h, y0] of [[1.55, 1.9, 0, 2.2], [1.7, -1.5, 1, 2.1]]) for (const sd of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(sd * x, y0, z); root.add(leg); const lm = new THREE.Mesh(legG(h), m.skin); lm.scale.x = sd; leg.add(lm);
    const fy = h ? -2.1 : -1.95, fz = h ? 0.5 : 0.45, fxx = sd * (h ? 0.12 : 0.05);
    mesh(boxg(), m.dark, leg, [fxx, fy, fz + 0.2], null, [0.55, 0.22, 0.75]);
    for (let t = -1; t <= 1; t++) mesh(cone(4), m.bone, leg, [fxx + t * 0.2, fy - 0.02, fz + 0.75], [Math.PI / 2 + 0.25, 0, 0], [0.1, 0.5, 0.1]);
    if (h) mesh(ico(), mm('hanch', () => std('#b01c44', { roughness: 0.4 })), leg, [sd * 0.1, 0.0, -0.1], null, [0.9, 0.85, 0.95]);
    mesh(cone(5), m.gold, leg, [sd * 0.35, -0.9, -0.55], [-1.2, 0, sd * 0.2], [0.14, 0.5, 0.14]); }
  // ---- alas ----
  u.wings = [-1, 1].map(sd => { const w = new THREE.Group(); w.position.set(sd * 1.5, 4.1, 1.3); root.add(w);
    const wing = new THREE.Group(); wing.scale.x = sd; w.add(wing);
    wing.add(new THREE.Mesh(wingGeo(), m.membrane)); wing.children[0].frustumCulled = false;
    const S = [0.3, 0.0, 0.0], Wp = [4.4, 0.05, 1.5];
    bone(wing, S, [2.3, 0.45, 0.95], 0.34, 0.28, m.wingBone); bone(wing, [2.3, 0.45, 0.95], Wp, 0.28, 0.22, m.wingBone); mesh(ico(), m.gold, wing, Wp, null, 0.3);
    [[11.2, 0.6], [10.2, -3.4], [7.6, -6.0], [4.6, -6.8]].forEach(([x, z]) => { bone(wing, Wp, [x, 0.0, z], 0.15, 0.04, m.wingBone); const cl = mesh(cone(4), m.bone, wing, [x, 0.0, z], null, [0.1, 0.55, 0.1]); cl.quaternion.setFromUnitVectors(new V3(0, 1, 0), new V3(x - Wp[0], 0, z - Wp[2]).normalize()); });
    mesh(cone(5), m.bone, wing, [4.9, 0.1, 2.4], [Math.PI / 2 - 0.4, 0, -0.4], [0.14, 0.9, 0.14]); // garra del pulgar
    return w; });
  // ---- cola segmentada ----
  u.tail = []; { let par = root, pos = [0, 2.3, -2.9];
    const N = 11; for (let i = 0; i < N; i++) { const s = new THREE.Group(); s.position.set(...pos); par.add(s); u.tail.push(s);
      const rF = 0.95 * Math.pow(1 - i / (N + 1), 1.15) + 0.12, rB = 0.95 * Math.pow(1 - (i + 1) / (N + 1), 1.15) + 0.12, L = 0.95 - i * 0.025;
      const sgm = sg(`tseg${i}`, () => { const cg = new THREE.CylinderGeometry(rB, rF, L, 8, 1); cg.rotateX(-Math.PI / 2); cg.translate(0, 0, -L / 2); const p = cg.attributes.position, cl = []; const c = new THREE.Color();
        for (let k = 0; k < p.count; k++) { const y = p.getY(k) / (rF); if (y < -0.35) c.copy(C('#ffb347')); else c.copy(C('#c21f4a')).lerp(C('#7a0f3a'), Math.max(0, y)); cl.push(c.r, c.g, c.b); } cg.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3)); cg.computeVertexNormals(); return cg; });
      s.add(new THREE.Mesh(sgm, m.skin));
      const h = rF * 1.15 + 0.1; mesh(cone(4), m.gold, s, [0, rF * 0.95, -L * 0.5], [-0.7, 0, 0], [rF * 0.5, h, rF * 0.5]);
      if (i % 2 === 0 && i < 8) for (const sd of [-1, 1]) mesh(cone(4), m.bone, s, [sd * rF * 0.9, rF * 0.1, -L * 0.45], [-1.2, 0, sd * -1.1], [rF * 0.22, rF * 1.0, rF * 0.22]);
      pos = [0, 0, -L]; par = s; }
    // hoja de la cola
    const bl = new THREE.Group(); bl.position.set(0, 0, -0.9); par.add(bl);
    mesh(octa(), m.gold, bl, [0, 0, -0.7], null, [0.08, 0.9, 1.4]); mesh(octa(), mm('bladeG', () => new THREE.MeshBasicMaterial({ color: '#ff6a1a', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })), bl, [0, 0, -0.7], null, [0.14, 1.05, 1.6]);
    for (const sd of [-1, 1]) mesh(cone(4), m.gold, bl, [sd * 0.2, 0, -0.1], [-Math.PI / 2 - 0.5 * sd * 0, 0, 0], [0.1, 0.5, 0.1]).rotation.z = sd * 0.9;
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#ff8a3a'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.7 })); gl.scale.setScalar(2.4); gl.position.set(0, 0, -0.9); bl.add(gl); }
  // ---- cabeza ----
  const head = new THREE.Group(); head.position.set(0, 5.35, 6.2); head.scale.setScalar(1.25); root.add(head); u.head = head;
  const skullG = sg('skull', () => tubeGeo([[0, 0.1, -1.1], [0, 0.15, -0.1], [0, 0.0, 1.1], [0, -0.12, 2.3], [0, -0.18, 2.95]], [0.85, 0.95, 0.72, 0.52, 0.4], [0.78, 0.82, 0.58, 0.4, 0.3], 8, 12, { fn: (o, t, ca, sa) => { mix(o, C('#c21f4a'), C('#7a0f3a'), Math.max(0, sa)); if (sa < -0.5) o.copy(C('#d9783a')); } }));
  head.add(new THREE.Mesh(skullG, m.skin));
  const jaw = new THREE.Group(); jaw.position.set(0, -0.42, -0.1); jaw.rotation.x = 0.32; head.add(jaw); u.jaw = jaw;
  jaw.add(new THREE.Mesh(sg('jawG', () => tubeGeo([[0, 0, 0], [0, -0.04, 1.2], [0, 0.0, 2.5], [0, 0.04, 2.85]], [0.62, 0.52, 0.3, 0.22], [0.2, 0.18, 0.12, 0.1], 7, 8, { fn: (o, t, ca, sa) => { mix(o, C('#e0834a'), C('#a1163d'), Math.max(0, sa)); } })), m.skin));
  mesh(sph(), m.mouth, jaw, [0, 0.16, 1.4], null, [0.42, 0.06, 1.2]);
  for (const sd of [-1, 1]) { for (let i = 0; i < 4; i++) { const z = 0.5 + i * 0.62; mesh(cone(4), m.bone, jaw, [sd * (0.42 - i * 0.06), 0.22, z], null, [0.07, 0.3 + (i % 2) * 0.08, 0.07]); }
    for (let i = 0; i < 5; i++) { const z = 0.1 + i * 0.6, big = i === 2 || i === 4; mesh(cone(4), m.bone, head, [sd * (0.56 - i * 0.05), -0.4, z + 0.3], [Math.PI, 0, 0], [0.09, big ? 0.55 : 0.28, 0.09]); } }
  // cuernos
  const hg = sg('hornG', () => hornGeo([[0.45, 0.7, -0.3], [0.75, 1.25, -0.9], [1.05, 1.6, -1.9], [1.1, 2.15, -3.0]], 0.3));
  const hg2 = sg('hornG2', () => hornGeo([[0.8, 0.0, -0.75], [1.25, 0.25, -1.3], [1.6, 0.9, -1.9]], 0.2));
  for (const sd of [-1, 1]) { const h1 = new THREE.Mesh(hg, m.horn); h1.scale.x = sd; head.add(h1); const h2 = new THREE.Mesh(hg2, m.horn); h2.scale.x = sd; head.add(h2);
    const brow = mesh(boxg(), m.dark, head, [sd * 0.52, 0.5, 0.78], [0, 0, sd * 0.42], [0.6, 0.12, 0.55]);
    mesh(cone(4), m.gold, head, [sd * 0.85, 0.5, 0.7], [Math.PI / 2, 0, -sd * 1.2 + 0], [0.1, 0.5, 0.1]);
    const fin = new THREE.Group(); fin.position.set(sd * 0.75, -0.05, -0.6); fin.rotation.y = sd * 0.6; head.add(fin);
    for (let i = 0; i < 3; i++) mesh(cone(3), mm('finM', () => new THREE.MeshStandardMaterial({ color: '#ff7a2a', emissive: '#ff3a10', emissiveIntensity: 0.5, side: THREE.DoubleSide, flatShading: true })), fin, [0, -0.1 + i * 0.1, -0.2 - i * 0.2], [-Math.PI / 2 + (i - 1) * 0.3, 0, 0], [0.04, 1.4 - i * 0.3, 0.35]);
    mesh(cone(4), m.dark, head, [sd * 0.22, 0.02, 3.0], [Math.PI / 2, 0, 0], [0.07, 0.12, 0.07]);
    mesh(cone(5), m.gold, head, [sd * 0.3, 0.06, 2.5], [-0.3, 0, sd * 0.2], [0.09, 0.28, 0.09]); }
  // ojos de fuego con pupila rasgada (para parpadeo se escala en Y)
  u.eyes = [-1, 1].map(sd => { const e = new THREE.Group(); e.position.set(sd * 0.54, 0.28, 0.82); head.add(e);
    mesh(ico(), m.eye, e, [0, 0, 0], null, [0.24, 0.2, 0.18]); mesh(boxg(), m.slit, e, [0, 0, 0.17], [0, 0, 0], [0.05, 0.3, 0.03]);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#ffcf3a'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85 })); gl.scale.setScalar(1.3); e.add(gl); return e; });
  // fuego en la boca
  const fire = new THREE.Group(); fire.position.set(0, -0.3, 2.95); head.add(fire); u.fire = fire;
  [[m.fireO, 0.34, 1.8], [m.fireM, 0.22, 1.35], [m.fireI, 0.12, 0.8]].forEach(([mt, r, L], i) => { const c = new THREE.Mesh(cone(6), mt); c.rotation.x = Math.PI / 2; c.scale.set(r, L, r); c.position.z = L / 2; fire.add(c); (u.fireCones ||= []).push(c); });
  for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(cone(5), m.fireO); c.rotation.set(Math.PI / 2 + (i % 2 ? 0.35 : -0.35), 0, (i - 1.5) * 0.5); c.scale.set(0.16, 1.1, 0.16); c.position.set((i - 1.5) * 0.12, 0, 0.5); fire.add(c); (u.fireCones ||= []).push(c); }
  const mg = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#ff8a2a'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 })); mg.scale.setScalar(1.5); mg.position.set(0, 0, 0.3); fire.add(mg); u.fireGlow = mg;
  u.mouth = new THREE.Object3D(); u.mouth.position.set(0, -0.3, 3.3); head.add(u.mouth);
  // ---- silla de montar de guerra ----
  const saddle = new THREE.Group(); saddle.position.set(0, 4.25, 0.2); root.add(saddle);
  const lea = mm('lea', () => std('#4a1a30', { roughness: 0.7, metalness: 0.05 })), cr = mm('crim', () => std('#e0284c', { roughness: 0.55 }));
  mesh(boxg(), cr, saddle, [0, -0.25, 0], null, [2.6, 0.1, 2.5]); mesh(boxg(), m.gold, saddle, [0, -0.3, 0], null, [2.75, 0.05, 2.65]);
  mesh(sg('seat8', () => new THREE.CylinderGeometry(1, 1.1, 1, 8)), lea, saddle, [0, 0.0, 0.0], null, [1.25, 0.34, 1.5]);
  mesh(boxg(), lea, saddle, [0, 0.5, -1.25], [0.3, 0, 0], [1.9, 0.9, 0.3]); mesh(boxg(), m.gold, saddle, [0, 0.98, -1.35], [0.3, 0, 0], [1.9, 0.08, 0.34]);
  mesh(cone(4), m.gold, saddle, [0, 0.55, 1.25], [0, Math.PI / 4, 0], [0.32, 0.6, 0.32]);
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; mesh(octa(), m.gold, saddle, [Math.cos(a) * 1.45, -0.33, Math.sin(a) * 1.4], null, 0.12); }
  for (const sd of [-1, 1]) { mesh(boxg(), mm('strap', () => std('#2a0f22', { roughness: 0.8 })), saddle, [sd * 1.5, -1.0, 0.3], [0, 0, sd * 0.12], [0.1, 1.5, 0.35]); mesh(sg('stir', () => new THREE.TorusGeometry(0.34, 0.07, 4, 4)), m.gold, saddle, [sd * 1.65, -1.85, 0.3], [0, Math.PI / 2, Math.PI / 4], 1); }
  // riendas y bocados
  u.reins = [-1, 1].map(() => mesh(sg('rein', () => new THREE.CylinderGeometry(1, 1, 1, 5)), toon('#ffd84a', { rim: 0.4 }), g, [0, 0, 0], null, [0.06, 1, 0.06]));
  u.bit = [-1, 1].map(sd => { const o = new THREE.Object3D(); o.position.set(sd * 0.72, -0.3, 1.3); head.add(o); mesh(octa(), m.gold, o, [0, 0, 0], null, 0.14); return o; });
  // halo de calor y brasas flotando
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#ff9a5a'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.2 })); halo.scale.setScalar(10); halo.position.set(0, 3.5, 1); root.add(halo);
  const NE = 46, ep = new Float32Array(NE * 3), eseed = []; for (let i = 0; i < NE; i++) eseed.push([Math.random() * 6.28, 0.6 + Math.random(), Math.random()]);
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
  const embers = new THREE.Points(eg, new THREE.PointsMaterial({ map: glowTex('#ffb347'), size: 0.55, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: '#ff9a3a', sizeAttenuation: true })); embers.frustumCulled = false; root.add(embers);
  u.anim = (t, breath) => { // llamas, mandíbula, brasas
    const fl = 0.55 + breath * 0.9; u.fire.scale.set(1 + breath * 0.5, 1 + breath * 0.5, fl * (0.9 + Math.sin(t * 25) * 0.1)); u.fireCones.forEach((c, i) => { c.rotation.z = Math.sin(t * 18 + i * 1.7) * 0.12; });
    u.fireGlow.material.opacity = 0.4 + breath * 0.3 + Math.sin(t * 14) * 0.06; u.jaw.rotation.x = 0.3 + breath * 0.28 + Math.sin(t * 2.6) * 0.03;
    u.chest.material.opacity = 0.45 + Math.sin(t * 3) * 0.12;
    for (let i = 0; i < NE; i++) { const s = eseed[i], ph = (t * 0.35 * s[1] + s[2]) % 1; ep[i * 3] = Math.cos(s[0] + t * 0.5) * (2.6 + ph * 1.2); ep[i * 3 + 1] = 2 + ph * 5.5; ep[i * 3 + 2] = Math.sin(s[0] * 3 + t * 0.4) * 3.6 - 0.5 + (i % 3) * 0.4; }
    eg.attributes.position.needsUpdate = true; };
  return g;
}
const sph = () => sg('sphx', () => new THREE.SphereGeometry(1, 10, 8));
