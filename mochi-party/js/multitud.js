// MOCHI PARTY · multitud 3D instanciada (o39): decenas de mochis animados con muy pocas llamadas de dibujo.
// Cada espectador tiene cuerpo, contorno, ojos con brillo, mejillas, boca, orejas (conejo/oso/gato), brazos que saludan
// y a veces gorro de fiesta, pompón o banderín. Se usa en el escenario del menú, la selección, la presentación y el podio.
import * as THREE from 'three';
import { toon, bodyGeometry } from '../carrera/js/gfx.js?v=o42';

const PAL = ['#ff9cc8', '#7ee3c4', '#9fc3ff', '#b9a2f7', '#ffe27a', '#8fe3f0', '#ffb36b', '#ff8fd8', '#a8f0c6', '#ffc2e0', '#c9b2ff', '#fff0b0'];
const rnd = (a, b) => a + Math.random() * (b - a);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _b = new THREE.Matrix4(), _l = new THREE.Matrix4(), _a = new THREE.Matrix4(), _t = new THREE.Matrix4();
const L = (x, y, z, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
let G;
const geos = () => G || (G = { body: bodyGeometry(true), sph: new THREE.SphereGeometry(1, 14, 10), sphL: new THREE.SphereGeometry(1, 8, 6), cone: new THREE.ConeGeometry(1, 1, 10), cone3: new THREE.ConeGeometry(1, 1, 3), cyl: new THREE.CylinderGeometry(1, 1, 1, 6) });

// members: [{ x, y, z, s, ry, kind: 'bounce'|'sway'|'wave', ear: 'bunny'|'bear'|'cat'|'none', hat: 0|1|2|3, color }]
export function makeCrowd(members) {
  const g = geos(), grp = new THREE.Group(), n = members.length, parts = [];
  const bodyM = toon('#ffffff', { rim: 0.6 }), outM = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.BackSide });
  const eyeM = new THREE.MeshBasicMaterial({ color: '#2a1838' }), whiteM = new THREE.MeshBasicMaterial({ color: '#ffffff' }), cheekM = new THREE.MeshBasicMaterial({ color: '#ff8fb4', transparent: true, opacity: 0.7 });
  const col = members.map(m => new THREE.Color(m.color || PAL[Math.random() * PAL.length | 0]));
  const dark = col.map(c => c.clone().multiplyScalar(0.38));
  const add = (geo, mat, local, idx, colors, key) => { const im = new THREE.InstancedMesh(geo, mat, idx.length); im.frustumCulled = false; if (colors) idx.forEach((mi, k) => im.setColorAt(k, colors[mi])); grp.add(im); parts.push({ im, local, idx, key }); return im; };
  const all = members.map((_, i) => i), pick = f => all.filter(i => f(members[i]));
  add(g.body, bodyM, L(0, 0, 0, 1), all, col); add(g.body, outM, L(0, -0.03, 0, 1.045, 1.04, 1.045), all, dark);
  for (const s of [-1, 1]) { add(g.sph, eyeM, L(s * 0.36, 0.86, 0.9, 0.17, 0.22, 0.1), all); add(g.sphL, whiteM, L(s * 0.36 + 0.06, 0.95, 0.99, 0.065), all); add(g.sphL, whiteM, L(s * 0.36 - 0.05, 0.8, 1.0, 0.03), all); add(g.sphL, cheekM, L(s * 0.62, 0.64, 0.74, 0.16, 0.09, 0.05, 0, s * 0.7, 0), all); }
  add(g.sphL, eyeM, L(0, 0.64, 0.98, 0.07, 0.04, 0.03), all);
  const eb = pick(m => m.ear === 'bunny'), eo = pick(m => m.ear === 'bear'), ec = pick(m => m.ear === 'cat');
  if (eb.length) for (const s of [-1, 1]) { add(g.sph, bodyM, L(s * 0.42 + s * 0.16, 1.9, 0, 0.2, 0.62, 0.17, 0, 0, -s * 0.35), eb, col); add(g.sph, outM, L(s * 0.42 + s * 0.16, 1.9, 0, 0.215, 0.665, 0.185, 0, 0, -s * 0.35), eb, dark); }
  if (eo.length) for (const s of [-1, 1]) { add(g.sph, bodyM, L(s * 0.62, 1.42, 0, 0.26, 0.24, 0.16), eo, col); add(g.sph, outM, L(s * 0.62, 1.42, 0, 0.28, 0.26, 0.18), eo, dark); }
  if (ec.length) for (const s of [-1, 1]) add(g.cone, bodyM, L(s * 0.5, 1.6, 0, 0.26, 0.42, 0.2, 0, 0, -s * 0.3), ec, col);
  const h1 = pick(m => m.hat === 1), h2 = pick(m => m.hat === 2), h3 = pick(m => m.hat === 3);
  const hc = (arr, cols) => arr.map(i => new THREE.Color(cols[i % cols.length]));
  const full = (arr, c) => { const o = new Array(n); arr.forEach((i, k) => o[i] = c[k]); return o; };
  if (h1.length) { add(g.cone, toon('#ffffff', { rim: 0.5 }), L(0, 1.95, 0, 0.34, 0.7, 0.34, 0, 0, 0.18), h1, full(h1, hc(h1, ['#ff4f8f', '#ffd84a', '#4fc3ff', '#7ee3c4']))); add(g.sphL, whiteM, L(0.12, 2.32, 0, 0.1), h1); }
  if (h2.length) { add(g.sph, toon('#ffffff', { rim: 0.5 }), L(0, 1.5, 0, 0.78, 0.42, 0.78), h2, full(h2, hc(h2, ['#ff8fb8', '#8fd0ff', '#ffe27a']))); add(g.sphL, whiteM, L(0, 1.92, 0, 0.17), h2); }
  if (h3.length) { add(g.cyl, toon('#8a6a4a', { rim: 0 }), L(0.95, 1.6, 0.1, 0.03, 1.6, 0.03), h3); add(g.cone3, toon('#ffffff', { rim: 0, side: THREE.DoubleSide }), L(1.2, 2.3, 0.1, 0.34, 0.5, 0.05, 0, 0, -Math.PI / 2), h3, full(h3, hc(h3, ['#ff4f8f', '#ffd84a', '#4fc3ff']))); }
  // brazos que saludan (matriz dinámica)
  const armIm = [-1, 1].map(s => { const im = new THREE.InstancedMesh(g.sph, bodyM, n); im.frustumCulled = false; col.forEach((c, i) => im.setColorAt(i, c)); grp.add(im); return im; });
  const base = new THREE.Matrix4(), pos = new THREE.Vector3(), sc = new THREE.Vector3(), qq = new THREE.Quaternion(), ee = new THREE.Euler();
  const state = members.map(m => ({ ph: rnd(0, 6.28), sp: rnd(0.8, 1.3), ...m }));
  function update(t) {
    for (let i = 0; i < n; i++) { const m = state[i], T = t * m.sp + m.ph; let y = 0, sy = 1, rz = 0, ry = m.ry || 0, aL = 0.5, aR = 0.5;
      if (m.kind === 'bounce') { const k = (T * 0.9) % 1, h = Math.sin(k * Math.PI); y = h * 0.55; sy = k < 0.1 || k > 0.92 ? 0.84 : 1 + h * 0.08; aL = aR = 2.3 + Math.sin(T * 9) * 0.3; }
      else if (m.kind === 'wave') { y = Math.abs(Math.sin(T * 2)) * 0.12; rz = Math.sin(T * 1.5) * 0.08; aR = 2.4 + Math.sin(T * 9) * 0.5; aL = 0.4; }
      else { y = Math.abs(Math.sin(T * 1.4)) * 0.08; rz = Math.sin(T * 1.4) * 0.1; aL = 0.9 + Math.sin(T * 1.4) * 0.3; aR = 0.9 - Math.sin(T * 1.4) * 0.3; }
      const sx = 1 / Math.sqrt(sy); pos.set(m.x, m.y + y * m.s, m.z); sc.set(m.s * sx, m.s * sy, m.s * sx); qq.setFromEuler(ee.set(0, ry, rz)); base.compose(pos, qq, sc);
      m._base = base.clone();
      // brazos
      for (let a = 0; a < 2; a++) { const s = a ? 1 : -1, ang = a ? aR : aL; _a.compose(_p.set(s * 0.93, 0.78, 0.1), _q.setFromEuler(_e.set(0, 0, s * -ang)), _s.set(1, 1, 1)); _t.compose(_p.set(s * 0.1, 0.24 * 0 + 0.0, 0), _q.identity(), _s.set(0.17, 0.3, 0.17)); _a.multiply(_t); _m.multiplyMatrices(base, _a); armIm[a].setMatrixAt(i, _m); } }
    for (const p of parts) { for (let k = 0; k < p.idx.length; k++) { _m.multiplyMatrices(state[p.idx[k]]._base, p.local); p.im.setMatrixAt(k, _m); } p.im.instanceMatrix.needsUpdate = true; }
    for (const im of armIm) im.instanceMatrix.needsUpdate = true;
  }
  update(0);
  grp.userData.update = update; grp.userData.dispose = () => { grp.traverse(o => { if (o.isInstancedMesh) o.dispose(); }); };
  return grp;
}
export { PAL as CROWD_PAL };

// gradas redondas con escalones y banderines: devuelve { group, slots } con los huecos para espectadores
export function makeStands({ rows = 3, r0 = 6.2, dr = 1.15, dh = 0.55, arc = 2.2, z = -0.5, colors = ['#ffd6ea', '#d9ecff', '#fff0c0'], spacing = 0.78 } = {}) {
  const group = new THREE.Group(), slots = [];
  for (let k = 0; k < rows; k++) {
    const R = r0 + k * dr, h = dh * (k + 1);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(R + dr * 0.5, R + dr * 0.5, h, 40, 1, true, Math.PI - arc / 2 - 0.0, arc), toon(colors[k % colors.length], { rim: 0.3, side: THREE.DoubleSide })); m.position.set(0, h / 2 - 0.02, z); m.rotation.y = 0; group.add(m);
    const top = new THREE.Mesh(new THREE.RingGeometry(R - dr * 0.5, R + dr * 0.5, 40, 1, Math.PI / 2 - arc / 2, arc), toon(colors[(k + 1) % colors.length], { rim: 0.3, side: THREE.DoubleSide })); top.rotation.x = -Math.PI / 2; top.position.set(0, h, z); group.add(top);
    const cnt = Math.max(3, Math.floor(R * arc / spacing));
    for (let i = 0; i < cnt; i++) { const a = -arc / 2 + (i + 0.5 + (k % 2) * 0.25) / cnt * arc; slots.push({ x: Math.sin(a) * R, y: h, z: z - Math.cos(a) * R, ry: -a * 0.9 + Math.PI * 0 }); }
  }
  return { group, slots };
}
export function crowdMembers(slots, { scale = 0.52, kinds = ['bounce', 'wave', 'sway', 'bounce'] } = {}) {
  return slots.map((s, i) => ({ x: s.x + rnd(-0.1, 0.1), y: s.y, z: s.z, s: scale * rnd(0.88, 1.12), ry: s.ry + rnd(-0.25, 0.25), kind: kinds[Math.random() * kinds.length | 0], ear: ['bunny', 'bear', 'cat', 'none', 'none'][Math.random() * 5 | 0], hat: Math.random() < 0.5 ? [1, 2, 3][Math.random() * 3 | 0] : 0, color: PAL[(i * 5 + (Math.random() * 3 | 0)) % PAL.length] }));
}
