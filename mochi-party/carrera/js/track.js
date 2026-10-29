import * as THREE from 'three';
import { toon, mesh, outline, makeItemBox, starShape } from './gfx.js?v=o46';
import { wobbleMat } from './edificios.js';

const V3 = THREE.Vector3;
let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const C = c => new THREE.Color(c);

export { ribbon };
export function buildTrack(cup, reverse, quality) {
  seed = 7 + cup.id.length * 13 + (reverse ? 5 : 0);
  let P = cup.pts.map(p => p.slice());
  if (reverse) P = [P[0], ...P.slice(1).reverse()];
  const remap = t => reverse ? (1 - t) % 1 : t;
  const feats = cup.feats.map(f => {
    const g = { ...f, t: remap(f.t) };
    if (f.t2 != null) { if (reverse) { g.t = remap(f.t2); g.t2 = remap(f.t); } }
    if (f.off != null && reverse) g.off = -f.off;
    return g;
  });
  const curve = new THREE.CatmullRomCurve3(P.map(p => new V3(p[0], p[2], p[1])), true, 'centripetal');
  const L = curve.getLength(), STEP = 2, N = Math.round(L / STEP);
  const S = []; const nP = P.length;
  for (let i = 0; i < N; i++) {
    const u = i / N, p = curve.getPointAt(u), tg = curve.getTangentAt(u);
    const t = curve.getUtoTmapping(u) * nP, a = Math.floor(t) % nP, b = (a + 1) % nP, f = t - Math.floor(t);
    const w = P[a][3] * (1 - f) + P[b][3] * f;
    const fl = new V3(tg.x, 0, tg.z).normalize();
    const right = new V3(-fl.z, 0, fl.x); // right-hand side when facing tangent (three: x right, z toward viewer)
    S.push({ p, tg, fl, right, w: w / 2, wall: w / 2 + (cup.city ? 3.4 : cup.theme === 'space' ? 2.2 : 6), slope: tg.y });
  }
  // curvature (for AI)
  for (let i = 0; i < N; i++) { const a = S[(i + N - 4) % N].fl, b = S[(i + 4) % N].fl; S[i].curv = Math.atan2(a.x * b.z - a.z * b.x, a.x * b.x + a.z * b.z); }
  const T = { crossings: [], cup, reverse, curve, L, N, STEP, S, feats, group: new THREE.Group(), boxes: [], pads: [], ramps: [], shortcuts: [], obstacles: [], grav: cup.grav, grip: cup.grip, theme: cup.theme };
  const idxOf = t => ((Math.round(t * N) % N) + N) % N;
  T.idxOf = idxOf;

  // ---------- v4: atajos automáticos por el interior de las curvas (callejones) ----------
  if (!feats.some(f => f.type === 'shortcut')) {
    const cands = [];
    for (let i0 = 0; i0 < N; i0 += 3) for (let span = 45; span <= 230; span += 5) {
      const i1 = (i0 + span) % N, A = S[i0], B = S[i1]; const ch = Math.hypot(B.p.x - A.p.x, B.p.z - A.p.z), arc = span * STEP;
      if (ch > arc * 0.8 || ch < 40) continue; let ok = true;
      for (let q = 0.12; q <= 0.88 && ok; q += 0.04) { const x = A.p.x + (B.p.x - A.p.x) * q, z = A.p.z + (B.p.z - A.p.z) * q;
        for (let j = 0; j < N; j += 2) { const sj = S[j], d = Math.hypot(sj.p.x - x, sj.p.z - z); if (d < sj.wall + 7) { ok = false; break; } } }
      if (ok && arc - ch <= 170) cands.push({ i0, i1, save: arc - ch, ch });
    }
    cands.sort((a, b) => b.save - a.save); const used = [];
    const names = ['Callejón del Gato', 'Atajo de la Plaza', 'Pasaje Secreto'];
    for (const c of cands) { if (used.length >= 2) break; if (used.some(u => { const d = Math.min(Math.abs(u.i0 - c.i0), N - Math.abs(u.i0 - c.i0)); return d < 120; })) continue;
      if (c.i1 < c.i0) continue; // no cruzar la meta
      used.push(c); feats.push({ type: 'shortcut', t: c.i0 / N, t2: c.i1 / N, label: names[used.length - 1], auto: true, save: Math.round(c.save) }); }
  }
  // ---------- shortcuts ----------
  for (const f of feats.filter(f => f.type === 'shortcut')) {
    const i0 = idxOf(f.t), i1 = idxOf(f.t2);
    const A = S[i0], B = S[i1];
    const chord = new V3().subVectors(B.p, A.p); chord.y = 0;
    const side = Math.sign(A.right.dot(chord)) || 1;
    const a = A.p.clone().addScaledVector(A.right, side * (A.w - 1)), b = B.p.clone().addScaledVector(B.right, side * (B.w - 1));
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const pts = []; const M = Math.max(8, Math.round(a.distanceTo(b) / 3));
    for (let k = 0; k <= M; k++) { const s = k / M; const q = new V3().lerpVectors(a, b, s); q.y = A.p.y * (1 - s) + B.p.y * s + Math.sin(s * Math.PI) * 1.0; pts.push(q); }
    T.shortcuts.push({ pts, hw: 4.2, i0, i1, label: f.label, side });
  }
  T.inShortcut = (x, z) => {
    for (const sc of T.shortcuts) for (let k = 0; k < sc.pts.length - 1; k++) {
      const a = sc.pts[k], b = sc.pts[k + 1]; const dx = b.x - a.x, dz = b.z - a.z; const l2 = dx * dx + dz * dz;
      let s = ((x - a.x) * dx + (z - a.z) * dz) / l2; s = Math.max(0, Math.min(1, s));
      const px = a.x + dx * s - x, pz = a.z + dz * s - z;
      if (px * px + pz * pz < sc.hw * sc.hw) return a.y + (b.y - a.y) * s;
    }
    return null;
  };
  // nearest sample within window
  T.nearest = (x, z, hint, back = 25, fwd = 160) => {
    let best = hint, bd = 1e18;
    for (let k = -back; k <= fwd; k++) { const i = ((hint + k) % N + N) % N, p = S[i].p; const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; best = i; } }
    return best;
  };
  T.nearestGlobal = (x, z) => { let best = 0, bd = 1e18; for (let i = 0; i < N; i += 2) { const p = S[i].p; const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; best = i; } } return T.nearest(x, z, best, 4, 4); };
  // local frame: lateral offset & height
  T.frame = (x, z, i) => {
    const s = S[i], n = S[(i + 1) % N];
    const dx = x - s.p.x, dz = z - s.p.z;
    const along = dx * s.fl.x + dz * s.fl.z, lat = dx * s.right.x + dz * s.right.z;
    const f = Math.max(0, Math.min(1, along / STEP));
    return { lat, y: s.p.y + (n.p.y - s.p.y) * f, w: s.w, wall: s.wall };
  };

  T.ptsRing = (i, h) => { const a = []; for (let k = -h; k <= h; k++) a.push(S[((i + k) % N + N) % N].p); return a; };
  T.rightsRing = (i, h) => { const a = []; for (let k = -h; k <= h; k++) a.push(S[((i + k) % N + N) % N].right); return a; };
  T.anims = [];
  buildVisuals(T, quality);
  return T;
}

// ======================================================================
function ribbon(S, N, fnL, fnR, colorFn, closed = true, yOff = 0) {
  const pos = [], cols = [], idx = [];
  const n = closed ? N + 1 : N;
  for (let k = 0; k < n; k++) {
    const i = k % N, s = S[i];
    const l = fnL(s, i), r = fnR(s, i);
    pos.push(l.x, l.y + yOff, l.z, r.x, r.y + yOff, r.z);
    const c = colorFn(i, k); cols.push(c[0].r, c[0].g, c[0].b, c[1].r, c[1].g, c[1].b);
    if (k < n - 1) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const off = (s, d, dy = 0) => new V3(s.p.x + s.right.x * d, s.p.y + dy, s.p.z + s.right.z * d);

function buildVisuals(T, Q) {
  const { S, N, cup, group } = T; const space = cup.theme === 'space';
  const road = C(cup.road), roadB = C(cup.road).lerp(C('#c090c0'), 0.07), cA = C(cup.curbA), cB = C(cup.curbB);
  const vmat = toon('#ffffff', { vc: true, rim: 0, side: THREE.DoubleSide });
  const vmatTop = toon('#ffffff', { vc: true, rim: 0, side: THREE.DoubleSide, po: 2 }); T.vmatTop = vmatTop; // marcas pintadas: sin z-fighting
  // road with soft lane stripes
  group.add(new THREE.Mesh(ribbon(S, N, s => off(s, -s.w), s => off(s, s.w), i => { const c = (i >> 3) % 2 ? road : roadB; return [c, c]; }, true, 0.05), vmat));
  // centre dashes
  const dash = C(cup.curbB).lerp(road, 0.5);
  group.add(new THREE.Mesh(ribbon(S, N, s => off(s, -0.25), s => off(s, 0.25), i => { const c = (i >> 2) % 3 === 0 ? dash : road; return [c, c]; }, true, 0.07), vmatTop));
  // curbs
  for (const sd of [-1, 1]) group.add(new THREE.Mesh(ribbon(S, N, s => off(s, sd * s.w, 0), s => off(s, sd * (s.w + 1.4), 0.25), i => { const c = (i >> 1) % 2 ? cA : cB; return [c, c]; }, true, 0.06), vmat));
  // shoulders (offroad) + embankment skirts
  const g1 = C(cup.ground || '#2a1858'), g2 = C(cup.ground2 || cup.ground || '#3a2a6a');
  if (cup.city) {
    citySurface(T, Q, vmat);
  } else if (!space) {
    for (const sd of [-1, 1]) {
      group.add(new THREE.Mesh(ribbon(S, N, s => off(s, sd * (s.w + 1.4), 0.25), s => off(s, sd * (s.wall + 2)), i => { const c = (i >> 4) % 2 ? g1 : g1.clone().lerp(g2, 0.25); return [c, c]; }, true, 0.0), vmat));
      group.add(new THREE.Mesh(ribbon(S, N, s => off(s, sd * (s.wall + 2)), s => { const q = off(s, sd * (s.wall + 6 + s.p.y * 2.5)); q.y = -0.6; return q; }, i => [g1, g1.clone().lerp(g2, 0.5)], true), vmat));
    }
    // ground plane
    const gp = new THREE.Mesh(new THREE.CircleGeometry(1100, 48), toon(cup.ground, { rim: 0 })); gp.rotation.x = -Math.PI / 2; gp.position.y = -0.62; group.add(gp);
    // ground blotches (flower/sprinkle patches) for texture
    const bl = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 10), toon(cup.ground2, { rim: 0, opacity: 0.6 }), Q.hi ? 160 : 70);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    for (let i = 0; i < bl.count; i++) { const r = 20 + rnd() * 600, a = rnd() * 6.28; m4.compose(new V3(Math.cos(a) * r, -0.58, Math.sin(a) * r), q, new V3(5 + rnd() * 20, 5 + rnd() * 20, 1)); bl.setMatrixAt(i, m4); }
    group.add(bl);
  } else {
    // floating road underside + glowing rails
    group.add(new THREE.Mesh(ribbon(S, N, s => off(s, s.w + 1.4, 0.25), s => off(s, -(s.w + 1.4), 0.25), () => [C('#4a2f8a'), C('#4a2f8a')], true, -1.2), toon('#4a2f8a', { side: THREE.DoubleSide, rim: 0 })));
    for (const sd of [-1, 1]) group.add(new THREE.Mesh(ribbon(S, N, s => off(s, sd * (s.w + 1.4), 0.25), s => off(s, sd * (s.w + 1.4), -1.2), () => [C('#3a2470'), C('#2a1858')], true), toon('#ffffff', { vc: true, side: THREE.DoubleSide, rim: 0 })));
  }
  // rails / bollards at wall line (instanced)
  const rail = space ? new THREE.InstancedMesh(new THREE.SphereGeometry(0.45, 10, 8), toon('#ffffff', { emissive: '#ffffff', ei: 0.7, rim: 0 }), N)
    : new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.55, 0.9, 4, 10), toon('#ffffff', { rim: 0.5 }), N);
  let rc = 0; const m4 = new THREE.Matrix4(), one = new V3(1, 1, 1), qI = new THREE.Quaternion();
  const railCols = space ? [C('#7ff5ff'), C('#ff8fe0')] : [cA, cB];
  for (let i = 0; i < N; i += space ? 2 : 3) for (const sd of [-1, 1]) {
    if (cup.city) break;
    const s = S[i], p = off(s, sd * (s.wall + 0.3), space ? 0.6 : 0.9);
    if (T.inShortcut(p.x, p.z) != null) continue;
    let near = false; for (const sc of T.shortcuts) for (const q of sc.pts) if ((q.x - p.x) ** 2 + (q.z - p.z) ** 2 < 49) near = true;
    if (near) continue;
    m4.compose(p, qI, one); rail.setMatrixAt(rc, m4); rail.setColorAt(rc, railCols[(i / 3 | 0) % 2]); rc++;
  }
  if (!cup.city) { rail.count = rc; group.add(rail); }
  // shortcut paths
  for (const sc of T.shortcuts) {
    const pts = sc.pts; const fake = pts.map((p, k) => { const nx = pts[Math.min(k + 1, pts.length - 1)], pv = pts[Math.max(k - 1, 0)]; const fl = new V3(nx.x - pv.x, 0, nx.z - pv.z).normalize(); return { p, right: new V3(-fl.z, 0, fl.x), w: sc.hw }; });
    const c1 = C(cup.curbA).lerp(C('#ffffff'), 0.4), c2 = C(cup.curbB).lerp(C(cup.curbA), 0.3);
    group.add(new THREE.Mesh(ribbon(fake, fake.length, s => off(s, -s.w), s => off(s, s.w), k => { const c = (k >> 1) % 2 ? c1 : c2; return [c, c]; }, false, 0.12), vmat));
    // sign
    const a = pts[0]; const sign = makeSign(sc.label, cup.curbA); sign.position.set(a.x, a.y, a.z); sign.lookAt(pts[3].x, a.y, pts[3].z); sign.rotateY(Math.PI); sign.translateX(5); group.add(sign);
    // boost pad in the middle of shortcut
    const rights = fake.map(f => f.right); T.pads.push(Object.assign(makePadAlong(group, pts, rights, pts.length >> 1, 0, 2.2, 2), { sc: true }));
  }
  // features
  // v4: más filas de cajas (una extra entre cada pareja de filas)
  { const bt = T.feats.filter(f => f.type === 'boxes').map(f => f.t).sort((a, b) => a - b); bt.forEach((t, j) => { const n = j + 1 < bt.length ? bt[j + 1] : bt[0] + 1; T.feats.push({ t: ((t + n) / 2) % 1, type: 'boxes', extra: true }); }); }
  for (const f of T.feats) {
    const i = T.idxOf(f.t), s = S[i], yaw = Math.atan2(s.fl.x, s.fl.z);
    if (f.type === 'boxes') for (let k = 0; k < 4; k++) {
      const lat = (k - 1.5) * s.w * 0.42; const b = makeItemBox(); const p = off(s, lat, 1.6); b.position.copy(p); group.add(b);
      T.boxes.push({ mesh: b, pos: p, idx: i, lat, t: 0, ph: k * 0.7 });
    }
    if (f.type === 'boost') T.pads.push(Object.assign(makePadAlong(group, T.ptsRing(i, 4), T.rightsRing(i, 4), 4, f.off || 0, 2.6, 3), { idx: i }));
    if (f.type === 'ramp') T.ramps.push(makeRampAlong(T, i, 3, 1.5));
    if (f.type === 'cross' || f.type === 'jay') T.crossings.push(makeCrossing(T, f, i));
    if (f.type === 'plaza') makePlaza(T, i);
    if (f.type === 'obstacle') for (let k = 0; k < (f.kind === 'lightning' ? 2 : 2); k++) T.obstacles.push(makeObstacle(T, f.kind, (i + k * 9) % N, k));
  }
  // start arch
  { const s = S[0]; const yaw = Math.atan2(s.fl.x, s.fl.z); const a = new THREE.Group(); a.position.copy(s.p); a.rotation.y = yaw; group.add(a);
    for (const sd of [-1, 1]) { const p = mesh(new THREE.CylinderGeometry(0.8, 1, 9, 12), toon(cup.curbA), a, [sd * (s.w + 2), 4.5, 0]); outline(p, '#5a3a6e', 1.05); mesh(new THREE.SphereGeometry(1.3, 14, 10), toon(cup.curbB), a, [sd * (s.w + 2), 9.3, 0]); }
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 128; const x = cv.getContext('2d');
    for (let i = 0; i < 32; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? '#ffffff' : '#3a2050'; x.fillRect(i * 32, j * 16, 32, 16); x.fillRect(i * 32, 96 + j * 16, 32, 16); }
    x.fillStyle = cup.curbA; x.fillRect(0, 32, 1024, 64); x.fillStyle = '#ffffff'; x.font = '700 52px Fredoka, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(T.cup.name.toUpperCase() + '  ·  ¡A CORRER!', 512, 66);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const ban = mesh(new THREE.PlaneGeometry(s.w * 2 + 4, 2.8), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }), a, [0, 8, 0], [0, Math.PI, 0]);
    // start line on road
    const lt = document.createElement('canvas'); lt.width = 256; lt.height = 32; const y = lt.getContext('2d'); for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { y.fillStyle = (i + j) % 2 ? '#fff' : '#3a2050'; y.fillRect(i * 16, j * 16, 16, 16); }
    const lx = new THREE.CanvasTexture(lt); mesh(new THREE.PlaneGeometry(s.w * 2, 2), new THREE.MeshBasicMaterial({ map: lx }), a, [0, 0.09, 0], [-Math.PI / 2, 0, 0]);
  }
  if (cup.city) cityScenery(T, Q); else scenery(T, Q);
}

function makeSign(text, color) {
  const g = new THREE.Group();
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 160; const x = cv.getContext('2d');
  x.fillStyle = '#ffffff'; x.beginPath(); x.roundRect(6, 6, 500, 148, 40); x.fill(); x.lineWidth = 10; x.strokeStyle = color; x.stroke();
  x.fillStyle = '#7a4fb0'; x.font = '700 50px Fredoka, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('➜ ' + text, 256, 82);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  mesh(new THREE.CylinderGeometry(0.2, 0.2, 4, 8), toon('#ffffff'), g, [0, 2, 0]);
  mesh(new THREE.PlaneGeometry(6, 1.9), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }), g, [0, 4.4, 0]);
  return g;
}
let padTex;
function padTexture() {
  if (padTex) return padTex;
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256; const x = cv.getContext('2d');
  const gr = x.createLinearGradient(0, 256, 0, 0); gr.addColorStop(0, '#ff6fb0'); gr.addColorStop(0.5, '#ffd84a'); gr.addColorStop(1, '#5ff0ff'); x.fillStyle = gr; x.fillRect(0, 0, 128, 256);
  x.fillStyle = 'rgba(255,255,255,0.95)';
  for (const y0 of [20, 100, 180]) { x.beginPath(); x.moveTo(64, y0); x.lineTo(118, y0 + 50); x.lineTo(90, y0 + 50); x.lineTo(64, y0 + 24); x.lineTo(38, y0 + 50); x.lineTo(10, y0 + 50); x.closePath(); x.fill(); }
  x.strokeStyle = '#ffffff'; x.lineWidth = 8; x.strokeRect(4, 4, 120, 248);
  padTex = new THREE.CanvasTexture(cv); padTex.wrapT = THREE.RepeatWrapping; padTex.colorSpace = THREE.SRGBColorSpace; return padTex;
}
// pad quad following a polyline (pts in race order), centred at index c; arrows point to increasing index (+v)
function makePadAlong(group, pts, rights, c, lat, halfW, halfLen) {
  const pos = [], uv = [], idx = [];
  const n = pts.length; const k0 = Math.max(0, c - halfLen), k1 = Math.min(n - 1, c + halfLen);
  for (let k = k0, j = 0; k <= k1; k++, j++) {
    const p = pts[k], r = rights[k];
    for (const sd of [-1, 1]) { pos.push(p.x + r.x * (lat + sd * halfW), p.y + 0.16, p.z + r.z * (lat + sd * halfW)); uv.push(sd < 0 ? 0 : 1, (k - k0) / (k1 - k0)); }
    if (k < k1) { const a = j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: padTexture(), side: THREE.DoubleSide, transparent: true, opacity: 0.97, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 })); group.add(m);
  const back = new V3(pos[0] + pos[3], 0, pos[2] + pos[5]).multiplyScalar(0.5), L = pos.length / 3; const front = new V3(pos[(L - 2) * 3] + pos[(L - 1) * 3], 0, pos[(L - 2) * 3 + 2] + pos[(L - 1) * 3 + 2]).multiplyScalar(0.5);
  const cp = pts[c], cr = rights[c];
  return { pos: new V3(cp.x + cr.x * lat, cp.y, cp.z + cr.z * lat), r: Math.max(halfW, 2.6), mesh: m, dir: front.clone().sub(back).normalize(), back, front };
}
// ramp wedge built from samples i..i+len: rises along race direction
function makeRampAlong(T, i, len = 3, h = 1.5) {
  const { S, N } = T; const pos = [], col = [], idx = []; const cA = C(T.cup.curbA), cW = C('#ffffff');
  const P = k => S[(i + k) % N];
  const vtx = (p, c) => { pos.push(p.x, p.y, p.z); col.push(c.r, c.g, c.b); return pos.length / 3 - 1; };
  const top = [], bot = [];
  for (let k = 0; k <= len; k++) { const s = P(k), y = h * k / len, w = s.w - 0.4; const c = k % 2 ? cA : cW;
    top.push([vtx(off(s, -w, y + 0.05), c), vtx(off(s, w, y + 0.05), c)]); bot.push([vtx(off(s, -w, 0.02), cA), vtx(off(s, w, 0.02), cA)]); }
  for (let k = 0; k < len; k++) { const [a, b] = top[k], [c2, d] = top[k + 1]; idx.push(a, b, c2, b, d, c2);
    for (const sd of [0, 1]) { const t0 = top[k][sd], t1 = top[k + 1][sd], b0 = bot[k][sd], b1 = bot[k + 1][sd]; idx.push(b0, t0, b1, t0, t1, b1); } }
  const [ta, tb] = top[len], [ba, bb] = bot[len]; idx.push(ba, bb, ta, bb, tb, ta);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, toon('#ffffff', { vc: true, side: THREE.DoubleSide, rim: 0.2 })); T.group.add(m);
  // glowing chevrons on top
  const s0 = P(0), s1 = P(len);
  return { idx: (i + len) % N, i0: i, lowY: s0.p.y + 0.05, highY: s1.p.y + h + 0.05, lowP: s0.p.clone(), highP: s1.p.clone(), mesh: m };
}

// ---------------- obstacles ----------------
function makeObstacle(T, kind, i, k) {
  const s = T.S[i]; const g = new THREE.Group(); T.group.add(g);
  const o = { kind, idx: i, g, r: 1.6, ph: k * 2.1 + i * 0.01, active: true };
  if (kind === 'gumdrop') {
    const col = ['#ff8fc0', '#7ee3c4', '#b9a2f7'][k % 3];
    const b = mesh(new THREE.LatheGeometry([[0.01, 0], [1.4, 0.05], [1.5, 0.5], [1.2, 1.4], [0.6, 2.0], [0.01, 2.2]].map(([r, y]) => new THREE.Vector2(r, y)), 20), toon(col, { opacity: 0.85, rim: 0.6 }), g); outline(b, '#7a3a6e', 1.05);
    for (const sd of [-1, 1]) mesh(new THREE.SphereGeometry(0.16, 8, 6), toon('#2a1838', { rim: 0 }), g, [sd * 0.45, 1.3, 1.15]);
    o.r = 1.6;
  } else if (kind === 'bee') {
    const body = mesh(new THREE.SphereGeometry(1, 16, 12), toon('#ffd24a', { rim: 0.5 }), g, [0, 0, 0], null, [1.1, 1.0, 1.5]); outline(body, '#6a4a1a', 1.05);
    for (const z of [-0.4, 0.3]) mesh(new THREE.TorusGeometry(1.02, 0.14, 6, 20), toon('#5a3a2a'), body, [0, 0, z], null, [1, 1, 1]);
    for (const sd of [-1, 1]) { mesh(new THREE.SphereGeometry(0.16, 8, 6), toon('#2a1838', { rim: 0 }), g, [sd * 0.4, 0.3, 1.35]); const w = mesh(new THREE.SphereGeometry(1, 10, 8), toon('#ffffff', { opacity: 0.6 }), g, [sd * 0.9, 0.9, 0], null, [0.9, 0.12, 0.5]); (o.wings ||= []).push([w, sd]); }
    o.r = 2.0; o.fly = 1.8;
  } else if (kind === 'snowball') {
    const b = mesh(new THREE.IcosahedronGeometry(1.9, 2), toon('#ffffff', { rim: 0.4 }), g, [0, 1.9, 0]); outline(b, '#7a8ab0', 1.04); o.ball = b; o.r = 2.0;
    for (const sd of [-1, 1]) mesh(new THREE.SphereGeometry(0.2, 8, 6), toon('#2a1838', { rim: 0 }), b, [sd * 0.6, 0.4, 1.75]);
    mesh(new THREE.SphereGeometry(0.25, 8, 6), toon('#ff9ec7', { rim: 0 }), b, [0, 0.1, 1.85], null, [1, 0.6, 1]);
  } else if (kind === 'asteroid') {
    const b = mesh(new THREE.TorusGeometry(1.6, 0.8, 10, 20), toon('#ffcf9a'), g, [0, 2, 0]); outline(b, '#7a4a3a', 1.04);
    const ic = mesh(new THREE.TorusGeometry(1.6, 0.82, 10, 20, Math.PI * 2), toon('#ff8fd0', { rim: 0.5 }), b, [0, 0, 0.12], null, [1, 1, 0.75]);
    for (let j = 0; j < 8; j++) mesh(new THREE.BoxGeometry(0.1, 0.35, 0.1), toon(['#ffffff', '#7ff5ff', '#ffe066'][j % 3]), b, [Math.cos(j * 0.8) * 1.6, Math.sin(j * 0.8) * 1.6, 0.85], [0, 0, j]);
    o.ball = b; o.r = 2.3;
  } else if (kind === 'lightning') {
    const ring = mesh(new THREE.RingGeometry(3.2, 4, 28), new THREE.MeshBasicMaterial({ color: '#fff27a', transparent: true, opacity: 0.0, side: THREE.DoubleSide }), g, [0, 0.2, 0], [-Math.PI / 2, 0, 0]);
    const bolt = new THREE.Group(); g.add(bolt);
    const bm = new THREE.MeshBasicMaterial({ color: '#fffbe0' });
    let y = 40, x = 0; for (let j = 0; j < 7; j++) { const nx = (j % 2 ? 1 : -1) * (1 + rnd() * 1.5), ny = y - 6; const len = Math.hypot(nx - x, 6); const seg = mesh(new THREE.CylinderGeometry(0.35, 0.35, len, 5), bm, bolt, [(x + nx) / 2, (y + ny) / 2, 0], [0, 0, Math.atan2(nx - x, 6)]); x = nx; y = ny; }
    bolt.visible = false; o.ring = ring; o.bolt = bolt; o.r = 4; o.period = 4.2 + k * 0.9; o.lat = 0;
  }
  o.update = (t, dt) => {
    const s = T.S[o.idx];
    if (kind === 'lightning') {
      const ph = (t + o.ph) % o.period; const warn = o.period - 1.4;
      if (ph < dt * 1.5 || o.lat == null) o.lat = (rnd() - 0.5) * s.w * 1.4;
      const p = off(s, o.lat, 0); g.position.copy(p);
      o.ring.material.opacity = ph > warn ? 0.35 + 0.5 * Math.abs(Math.sin(t * 14)) : 0;
      const strike = ph > o.period - 0.3; o.bolt.visible = strike; o.active = strike; o.strikeNow = strike;
      return;
    }
    const sw = Math.sin(t * (kind === 'snowball' ? 0.55 : 0.8) + o.ph);
    const lat = sw * (s.w - 1.5);
    const p = off(s, lat, 0); g.position.copy(p);
    const yaw = Math.atan2(s.fl.x, s.fl.z);
    if (kind === 'gumdrop') { g.position.y += Math.abs(Math.sin(t * 3 + o.ph)) * 2.2; const sq = 1 + Math.sin(t * 6 + o.ph) * 0.12; g.scale.set(1 / sq, sq, 1 / sq); g.rotation.y = yaw + Math.PI / 2 * Math.sign(Math.cos(t * 0.8 + o.ph)); }
    if (kind === 'bee') { g.position.y += o.fly + Math.sin(t * 2.5 + o.ph) * 0.6; g.rotation.y = yaw + (Math.cos(t * 0.8 + o.ph) > 0 ? Math.PI / 2 : -Math.PI / 2); o.wings.forEach(([w, sd]) => w.rotation.z = sd * Math.sin(t * 40) * 0.6); }
    if (kind === 'snowball') { g.rotation.y = yaw + Math.PI / 2; o.ball.rotation.x = -sw * 6; }
    if (kind === 'asteroid') { g.position.y += Math.sin(t * 1.5 + o.ph) * 0.6; o.ball.rotation.y = t * 1.2; o.ball.rotation.x = 0.4; }
  };
  return o;
}

// ---------------- scenery (instanced) ----------------
function placeOut(T, minD, maxD) {
  for (let tries = 0; tries < 40; tries++) {
    const i = Math.floor(rnd() * T.N), s = T.S[i], sd = rnd() < 0.5 ? -1 : 1, d = s.wall + minD + rnd() * (maxD - minD);
    const p = off(s, sd * d, 0);
    let ok = true;
    for (let j = 0; j < T.N; j += 3) { const q = T.S[j]; if ((q.p.x - p.x) ** 2 + (q.p.z - p.z) ** 2 < (q.wall + minD * 0.6) ** 2) { ok = false; break; } }
    if (ok && T.inShortcut(p.x, p.z) == null) {
      let near = false; for (const sc of T.shortcuts) for (const q of sc.pts) if ((q.x - p.x) ** 2 + (q.z - p.z) ** 2 < 64) near = true;
      if (near) continue;
      p.y = T.theme === 'space' ? p.y - 6 + rnd() * 20 : -0.6;
      return p;
    }
  }
  return null;
}
// prop = array of parts {geo, mat, m(matrix local), color?:'inst'}
function instProps(T, parts, count, minD, maxD, palette, scaleR = [0.8, 1.4], extra) {
  const ims = parts.map(pt => { const im = new THREE.InstancedMesh(pt.geo, pt.mat, count); T.group.add(im); return im; });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); let n = 0;
  for (let i = 0; i < count; i++) {
    const p = placeOut(T, minD, maxD); if (!p) continue;
    const sc = scaleR[0] + rnd() * (scaleR[1] - scaleR[0]); e.set(0, rnd() * 6.28, 0); q.setFromEuler(e);
    if (extra) extra(p, sc);
    const base = new THREE.Matrix4().compose(p, q, new V3(sc, sc, sc));
    const ci = Math.floor(rnd() * palette.length);
    parts.forEach((pt, k) => { m4.multiplyMatrices(base, pt.m); ims[k].setMatrixAt(n, m4); if (pt.inst) ims[k].setColorAt(n, C(palette[(ci + (pt.shift || 0)) % palette.length])); });
    n++;
  }
  ims.forEach(im => { im.count = n; if (im.instanceColor) im.instanceColor.needsUpdate = true; });
}
const M = (x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new V3(sx, sy, sz));
const W = () => toon('#ffffff', { rim: 0.35 });
function scenery(T, Q) {
  edgeProps(T, Q); stands(T, Q);
  const k = Q.hi ? 1 : 0.55; const n = x => Math.round(x * k);
  const sphG = new THREE.SphereGeometry(1, 14, 10), cylG = new THREE.CylinderGeometry(1, 1, 1, 12), coneG = new THREE.ConeGeometry(1, 1, 12);
  const th = T.theme;
  if (th === 'candy') {
    instProps(T, [{ geo: cylG, mat: toon('#ffffff'), m: M(0, 3, 0, 0.18, 6, 0.18) }, { geo: new THREE.CylinderGeometry(1, 1, 0.4, 24), mat: W(), m: M(0, 6.5, 0, 1.8, 1, 1.8, Math.PI / 2), inst: true },
      { geo: new THREE.TorusGeometry(1.1, 0.18, 6, 24), mat: toon('#ffffff', { rim: 0 }), m: M(0, 6.5, 0.22, 1, 1, 1) }], n(70), 3, 40, ['#ff8fc0', '#7ee3c4', '#b9a2f7', '#ffd36b'], [0.8, 1.5]);
    instProps(T, [{ geo: new THREE.LatheGeometry([[0.01, 0], [1.4, 0.05], [1.5, 0.5], [1.2, 1.4], [0.6, 2.0], [0.01, 2.2]].map(([r, y]) => new THREE.Vector2(r, y)), 16), mat: toon('#ffffff', { opacity: 0.9, rim: 0.6 }), m: M(0, 0, 0), inst: true }], n(90), 2, 60, ['#ff8fc0', '#7ee3c4', '#b9a2f7', '#ffb36b', '#8fe3f0'], [0.8, 2.2]);
    instProps(T, [{ geo: cylG, mat: toon('#fff2e0'), m: M(0, 2.5, 0, 0.3, 5, 0.3) }, { geo: sphG, mat: W(), m: M(0, 6, 0, 2.4, 2.1, 2.4), inst: true }, { geo: sphG, mat: W(), m: M(1.5, 5, 0.6, 1.6, 1.4, 1.6), inst: true, shift: 1 }], n(80), 8, 120, ['#ffc4e1', '#d8fbef', '#ece4ff', '#ffe3c4'], [0.9, 2]);
    instProps(T, [{ geo: new THREE.BoxGeometry(1, 1, 1), mat: W(), m: M(0, 2, 0, 5, 4, 5), inst: true }, { geo: new THREE.ConeGeometry(1, 1, 4), mat: toon('#ffffff'), m: M(0, 5.6, 0, 4.4, 3.2, 4.4, 0, Math.PI / 4), inst: true, shift: 2 },
      { geo: sphG, mat: toon('#2a1838', { rim: 0 }), m: M(-1, 2.8, 2.52, 0.3, 0.35, 0.1) }, { geo: sphG, mat: toon('#2a1838', { rim: 0 }), m: M(1, 2.8, 2.52, 0.3, 0.35, 0.1) }], n(26), 12, 70, ['#ff9ec7', '#7ee3c4', '#b9a2f7', '#ffd98a'], [1, 1.6]);
    instProps(T, [{ geo: new THREE.CylinderGeometry(1, 0.85, 1, 16), mat: toon('#f7d6a8'), m: M(0, 1.2, 0, 3, 2.4, 3) }, { geo: sphG, mat: W(), m: M(0, 2.7, 0, 3.1, 1.6, 3.1), inst: true }, { geo: sphG, mat: toon('#ff5f8f'), m: M(0, 4.4, 0, 0.6, 0.6, 0.6) }], n(30), 6, 80, ['#ffd1ea', '#ffffff', '#d8fbef'], [0.8, 1.6]);
  }
  if (th === 'sunflower') {
    instProps(T, [{ geo: cylG, mat: toon('#5fb04a'), m: M(0, 3, 0, 0.18, 6, 0.18) }, { geo: new THREE.CylinderGeometry(1, 1, 0.3, 14), mat: toon('#ffcf2a', { rim: 0.3 }), m: M(0, 6.3, 0.3, 1.9, 1, 1.9, Math.PI / 2 - 0.25) },
      { geo: new THREE.CylinderGeometry(1, 1, 0.35, 14), mat: toon('#8a5a2a'), m: M(0, 6.3, 0.45, 0.95, 1, 0.95, Math.PI / 2 - 0.25) }, { geo: sphG, mat: toon('#5fb04a'), m: M(0.6, 3, 0, 0.7, 0.15, 0.35) }], n(260), 2, 70, ['#fff'], [0.6, 1.4]);
    instProps(T, [{ geo: cylG, mat: toon('#ffe08a'), m: M(0, 1.1, 0, 1.6, 3.2, 1.6, Math.PI / 2) }], n(30), 4, 40, ['#fff'], [0.8, 1.3]);
    instProps(T, [{ geo: cylG, mat: toon('#a07a5a'), m: M(0, 2.5, 0, 0.4, 5, 0.4) }, { geo: sphG, mat: W(), m: M(0, 6.5, 0, 3.4, 3, 3.4), inst: true }, { geo: sphG, mat: W(), m: M(1.8, 5.5, 0.4, 2, 1.8, 2), inst: true }], n(60), 15, 140, ['#8fd46a', '#a6e07c', '#7cc85a'], [1, 2]);
    instProps(T, [{ geo: new THREE.LatheGeometry([[0.01, 0], [1, 0.1], [1.25, 0.6], [1.15, 1.2], [0.85, 1.8], [0.3, 2.3], [0.01, 2.4]].map(([r, y]) => new THREE.Vector2(r, y)), 14), mat: toon('#ffc23d'), m: M(0, 0, 0, 1.6, 1.6, 1.6) },
      { geo: new THREE.TorusGeometry(1.25, 0.1, 6, 16), mat: toon('#e09a20'), m: M(0, 1.0, 0, 1.6, 1.6, 1.6, Math.PI / 2) }], n(14), 10, 60, ['#fff'], [1, 1.5]);
  }
  if (th === 'ice') {
    instProps(T, [{ geo: coneG, mat: toon('#e8b47a'), m: M(0, 3, 0, 1.3, 6, 1.3, Math.PI) }, { geo: sphG, mat: W(), m: M(0, 6.6, 0, 1.9, 1.7, 1.9), inst: true }, { geo: sphG, mat: W(), m: M(0, 8.5, 0, 1.5, 1.4, 1.5), inst: true, shift: 2 }, { geo: sphG, mat: toon('#ff4f6f'), m: M(0, 10, 0, 0.4, 0.4, 0.4) }],
      n(60), 3, 60, ['#ffc4e1', '#fff3c4', '#c4f0ff', '#d8fbef', '#e4d4ff'], [0.8, 1.8]);
    instProps(T, [{ geo: coneG, mat: toon('#7cc8a8'), m: M(0, 3.5, 0, 2.6, 5, 2.6) }, { geo: coneG, mat: toon('#ffffff'), m: M(0, 5.6, 0, 1.6, 2.4, 1.6) }, { geo: cylG, mat: toon('#a07a5a'), m: M(0, 0.6, 0, 0.4, 1.2, 0.4) }], n(120), 6, 130, ['#fff'], [0.8, 2]);
    instProps(T, [{ geo: sphG, mat: toon('#ffffff', { rim: 0.5 }), m: M(0, 0, 0, 5, 2.5, 5) }], n(50), 4, 100, ['#fff'], [0.8, 2.5]);
  }
  if (th === 'space') {
    instProps(T, [{ geo: sphG, mat: W(), m: M(0, 0, 0, 6, 6, 6), inst: true }, { geo: new THREE.RingGeometry(8, 11, 32), mat: toon('#ffffff', { side: THREE.DoubleSide, opacity: 0.8, depthWrite: true }), m: M(0, 0, 0, 1, 1, 1, -1.2), inst: true, shift: 2 }],
      n(26), 30, 200, ['#ff9ec7', '#7ee3c4', '#b9a2f7', '#ffd36b', '#8fe3f0', '#ffb36b'], [0.8, 3], (p) => { p.y += 10 + rnd() * 40; });
    instProps(T, [{ geo: new THREE.TorusGeometry(1.6, 0.8, 10, 20), mat: toon('#ffcf9a'), m: M(0, 0, 0, 1, 1, 1, 0.8, 0, 0.3) }, { geo: new THREE.TorusGeometry(1.6, 0.82, 10, 20), mat: W(), m: M(0, 0.1, 0, 1, 1, 0.75, 0.8, 0, 0.3), inst: true }],
      n(60), 6, 90, ['#ff8fd0', '#7ff5ff', '#ffe066', '#b9a2f7'], [1, 3], (p) => { p.y += rnd() * 15; });
    instProps(T, [{ geo: new THREE.IcosahedronGeometry(1, 0), mat: toon('#8a7ab0', { flat: true }), m: M(0, 0, 0, 2, 1.6, 2) }], n(60), 5, 120, ['#fff'], [0.6, 2.5], (p) => { p.y += rnd() * 25 - 8; });
  }
  if (th === 'storm') {
    instProps(T, [{ geo: cylG, mat: toon('#ffffff', { emissive: '#ffffff', ei: 0.85, rim: 0 }), m: M(0, 6, 0, 0.5, 12, 0.5), inst: true }, { geo: sphG, mat: toon('#ffffff', { emissive: '#ffffff', ei: 0.9, rim: 0 }), m: M(0, 12.5, 0, 1.2, 1.2, 1.2), inst: true }],
      n(90), 3, 60, ['#ff5fd2', '#5ff5ff', '#b98aff', '#ffe066'], [0.6, 1.4]);
    instProps(T, [{ geo: new THREE.BoxGeometry(1, 1, 1), mat: toon('#2a2050'), m: M(0, 3, 0, 4, 6, 3) }, { geo: new THREE.CylinderGeometry(1, 1, 0.3, 16), mat: toon('#ffffff', { emissive: '#ffffff', ei: 0.6 }), m: M(0, 4.2, 1.55, 1.3, 1, 1.3, Math.PI / 2), inst: true }, { geo: new THREE.CylinderGeometry(1, 1, 0.3, 16), mat: toon('#ffffff', { emissive: '#ffffff', ei: 0.6 }), m: M(0, 1.6, 1.55, 0.8, 1, 0.8, Math.PI / 2), inst: true, shift: 1 }],
      n(40), 6, 60, ['#ff5fd2', '#5ff5ff', '#b98aff'], [0.9, 1.6]);
    instProps(T, [{ geo: new THREE.BoxGeometry(1, 1, 1), mat: toon('#1c1640', { rim: 0.2 }), m: M(0, 15, 0, 14, 30, 14) }, { geo: new THREE.BoxGeometry(1, 1, 1), mat: toon('#ffffff', { emissive: '#ffffff', ei: 0.7, rim: 0 }), m: M(0, 25, 7.1, 10, 0.8, 0.2), inst: true }, { geo: new THREE.BoxGeometry(1, 1, 1), mat: toon('#ffffff', { emissive: '#ffffff', ei: 0.7, rim: 0 }), m: M(0, 18, 7.1, 10, 0.8, 0.2), inst: true, shift: 1 }],
      n(40), 40, 220, ['#ff5fd2', '#5ff5ff', '#b98aff', '#ffe066'], [0.8, 2]);
  }
}

// ---------- dense props right at the track edge (sense of speed) ----------
function edgeProps(T, Q) {
  const { S, N, cup } = T; const step = Q.hi ? 4 : 6; const space = cup.theme === 'space';
  const list = [];
  for (let i = 0; i < N; i += step) for (const sd of [-1, 1]) {
    const s = S[i], p = off(s, sd * (s.wall + (space ? 1.6 : 2.4)), 0);
    if (T.inShortcut(p.x, p.z) != null) continue;
    let near = false; for (const sc of T.shortcuts) for (const q of sc.pts) if ((q.x - p.x) ** 2 + (q.z - p.z) ** 2 < 100) near = true;
    if (near) continue;
    list.push({ p, yaw: Math.atan2(s.fl.x, s.fl.z), k: (i / step | 0) % 4, sd });
  }
  const pal = { candy: ['#ff7fb6', '#7ee3c4', '#b9a2f7', '#ffd36b'], sunflower: ['#ffbf2a', '#ff8f6a', '#ffffff', '#7cc85a'], ice: ['#ff8fc0', '#6fd3ff', '#ffffff', '#b9a2f7'], space: ['#7ff5ff', '#ff8fe0', '#ffe066', '#b48cff'], storm: ['#ff5fd2', '#5ff5ff', '#ffe066', '#b98aff'] }[cup.theme];
  const poleG = new THREE.CylinderGeometry(0.16, 0.2, 5, 6), flagG = new THREE.BufferGeometry();
  flagG.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, -1.3, 0, 0, -0.65, 1.6], 3)); flagG.computeVertexNormals();
  const emiss = cup.theme === 'storm' || space;
  const pole = new THREE.InstancedMesh(poleG, toon('#ffffff', emiss ? { emissive: '#ffffff', ei: 0.4 } : {}), list.length);
  const flag = new THREE.InstancedMesh(flagG, toon('#ffffff', { side: THREE.DoubleSide, rim: 0, emissive: emiss ? '#ffffff' : '#000000', ei: emiss ? 0.5 : 1 }), list.length);
  const ball = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 10, 8), toon('#ffffff', { emissive: '#ffffff', ei: emiss ? 0.9 : 0.25 }), list.length);
  const tree = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 9), toon('#ffffff', { rim: 0.45 }), list.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); let a = 0, b = 0;
  for (const it of list) {
    const c = C(pal[it.k % pal.length]);
    if (it.k % 2 === 0 || space) { // pole + pennant (+ glowing ball on top)
      m4.compose(new V3(it.p.x, it.p.y + 2.5, it.p.z), q.identity(), new V3(1, 1, 1)); pole.setMatrixAt(a, m4);
      e.set(0, it.yaw + Math.PI, 0); q.setFromEuler(e); m4.compose(new V3(it.p.x, it.p.y + 4.9, it.p.z), q, new V3(1, 1, 1)); flag.setMatrixAt(a, m4); flag.setColorAt(a, c);
      m4.compose(new V3(it.p.x, it.p.y + 5.1, it.p.z), q.identity(), new V3(1, 1, 1)); ball.setMatrixAt(a, m4); ball.setColorAt(a, C(pal[(it.k + 1) % pal.length])); a++;
    } else { // round pastel bush / gumdrop / snow mound / neon puff
      const sc = 1.4 + ((it.p.x * 7.3 + it.p.z) % 1 + 1) % 1 * 0.8;
      m4.compose(new V3(it.p.x, it.p.y + sc * 0.6, it.p.z), q.identity(), new V3(sc, sc * 0.9, sc)); tree.setMatrixAt(b, m4); tree.setColorAt(b, c.clone().lerp(C('#ffffff'), 0.15)); b++;
    }
  }
  pole.count = flag.count = ball.count = a; tree.count = b;
  for (const im of [pole, flag, ball, tree]) { if (im.instanceColor) im.instanceColor.needsUpdate = true; T.group.add(im); }
  T.anims.push(t => { flag.rotation.y = 0; });
}
// ---------- stands with cheering Mochi-world inhabitants ----------
function stands(T, Q) {
  const { S, N, cup } = T;
  const per = Q.hi ? 18 : 12, groups = [];
  for (const [i0, sd] of [[N - 22, 1], [N - 22, -1], [Math.round(N * 0.5), 1]]) {
    const s = S[i0]; if (T.inShortcut(off(s, sd * (s.wall + 6)).x, off(s, sd * (s.wall + 6)).z) != null) continue;
    const yaw = Math.atan2(s.fl.x, s.fl.z); const g = new THREE.Group(); g.position.copy(off(s, sd * (s.wall + 7), 0)); g.rotation.y = yaw + (sd > 0 ? -Math.PI / 2 : Math.PI / 2); T.group.add(g);
    for (let r = 0; r < 3; r++) { const st = mesh(new THREE.BoxGeometry(26, 1.2, 3), toon(r % 2 ? cup.curbA : '#fff4fa'), g, [0, 0.6 + r * 1.2, r * 3]); }
    const roof = mesh(new THREE.BoxGeometry(27, 0.5, 10), toon(cup.curbA, { rim: 0.3 }), g, [0, 6.5, 3]); roof.rotation.x = -0.12;
    for (const x of [-13, 13]) mesh(new THREE.CylinderGeometry(0.3, 0.3, 6.5, 8), toon('#ffffff'), g, [x, 3.25, 7]);
    const fans = []; const cols = ['#ff9cc8', '#7ee3c4', '#b9a2f7', '#ffb36b', '#8fe3f0', '#ffd98a'];
    for (let k = 0; k < per; k++) { const r = k % 3; const f = new THREE.Group(); f.position.set(-11 + (k / 3 | 0) * (22 / Math.ceil(per / 3)) + (r % 2) * 1.5, 1.2 + r * 1.2, r * 3); g.add(f);
      const b = mesh(new THREE.SphereGeometry(0.9, 12, 9), toon(cols[k % 6], { opacity: 0.88, rim: 0.6 }), f, [0, 0.8, 0], null, [1, 0.95, 1]);
      for (const e of [-1, 1]) mesh(new THREE.SphereGeometry(0.13, 6, 5), toon('#2a1838', { rim: 0 }), f, [e * 0.3, 0.95, -0.82]);
      mesh(new THREE.SphereGeometry(0.12, 6, 5), toon('#ff7fae', { rim: 0 }), f, [0, 0.7, -0.86], null, [1.2, 0.6, 0.5]);
      if (k % 4 === 0) { mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 4), toon('#ffffff'), f, [0.8, 1.6, 0]); mesh(new THREE.PlaneGeometry(1.4, 0.8), toon(cols[(k + 2) % 6], { side: THREE.DoubleSide, rim: 0 }), f, [0.8, 2.3, -0.02]); }
      fans.push(f); }
    groups.push(fans);
  }
  T.cheer = 0;
  T.anims.push((t, dt) => { const ex = 1 + T.cheer * 2; groups.forEach(fans => fans.forEach((f, k) => { f.position.y = (f.userData.y0 ??= f.position.y) + Math.abs(Math.sin(t * (4 + ex) + k * 1.3)) * 0.5 * ex; f.rotation.z = Math.sin(t * 3 + k) * 0.15 * ex; })); T.cheer = Math.max(0, T.cheer - dt * 0.3); });
}

// ======================================================================
//  CIUDAD: aceras, edificios gelatina, escaparates, farolas, ropa tendida,
//  balcones con público, pasos de peatones con semáforo, plazas/rotondas
// ======================================================================
function citySurface(T, Q, vmat) {
  const { S, N, cup, group } = T;
  const wk = C(cup.walk), wk2 = C(cup.walk).lerp(C(cup.curbA), 0.12), g1 = C(cup.ground), g2 = C(cup.ground2);
  for (const sd of [-1, 1]) {
    // acera (tramada) desde el bordillo hasta el muro + un poco más
    group.add(new THREE.Mesh(ribbon(S, N, s => off(s, sd * (s.w + 1.4), 0.25), s => off(s, sd * (s.wall + 5), 0.25), i => { const c = (i >> 1) % 2 ? wk : wk2; return [c, c]; }, true, 0.0), vmat));
    group.add(new THREE.Mesh(ribbon(S, N, s => off(s, sd * (s.wall + 5), 0.25), s => { const q = off(s, sd * (s.wall + 8 + s.p.y * 2.5)); q.y = -0.6; return q; }, () => [g1, g1.clone().lerp(g2, 0.4)], true), vmat));
  }
  // líneas de borde de carril
  const ln = C('#ffffff');
  for (const sd of [-1, 1]) group.add(new THREE.Mesh(ribbon(S, N, s => off(s, sd * (s.w - 0.9)), s => off(s, sd * (s.w - 0.55)), () => [ln, ln], true, 0.075), T.vmatTop));
  const gp = new THREE.Mesh(new THREE.CircleGeometry(1100, 48), toon(cup.ground, { rim: 0 })); gp.rotation.x = -Math.PI / 2; gp.position.y = -0.62; group.add(gp);
  // adoquines / baldosas de plaza
  const bl = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 6), toon(cup.ground2, { rim: 0, opacity: 0.7 }), Q.hi ? 220 : 90);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  for (let i = 0; i < bl.count; i++) { const r = 20 + rnd() * 500, a = rnd() * 6.28; m4.compose(new V3(Math.cos(a) * r, -0.58, Math.sin(a) * r), q, new V3(3 + rnd() * 9, 3 + rnd() * 9, 1)); bl.setMatrixAt(i, m4); }
  group.add(bl);
}
function clearOfTrack(T, p, rad) {
  for (let j = 0; j < T.N; j += 2) { const q = T.S[j]; const lim = q.wall + 4 + rad; if ((q.p.x - p.x) ** 2 + (q.p.z - p.z) ** 2 < lim * lim) return false; }
  for (const sc of T.shortcuts) for (const q of sc.pts) if ((q.x - p.x) ** 2 + (q.z - p.z) ** 2 < (rad + 11) ** 2) return false;
  for (const c of T.plazas || []) if ((c.x - p.x) ** 2 + (c.z - p.z) ** 2 < (rad + c.r) ** 2) return false;
  return true;
}
let winTex = null;
function windowTexture() {
  if (winTex) return winTex;
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 512; const x = cv.getContext('2d'); x.scale(2, 2);
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 256);
  for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) {
    const X = 14 + c * 38, Y = 14 + r * 40; x.fillStyle = '#5a6ab0'; x.beginPath(); x.roundRect(X, Y, 26, 28, [13, 13, 4, 4]); x.fill();
    x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(X + 4, Y + 6, 6, 12); x.fillStyle = '#ffffff'; x.fillRect(X - 3, Y + 28, 32, 4);
  }
  winTex = new THREE.CanvasTexture(cv); winTex.colorSpace = THREE.SRGBColorSpace; winTex.anisotropy = 8; return winTex;
}
const SHOPS = ['Pastelería Boing', 'Zapatos Flotantes', 'Sombreros Tontos', 'Gominolas 24h', 'Peluquería Nube', 'Relojes Blandos', 'Helados Volcán', 'Calcetines Locos', 'Teteras Bailonas', 'Librería Patas Arriba', 'Pelucas de Algodón', 'Globos de Plomo'];
function shopSign(text, col, night) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 112; const x = cv.getContext('2d');
  x.fillStyle = night ? '#1a1030' : '#ffffff'; x.beginPath(); x.roundRect(4, 4, 504, 104, 30); x.fill(); x.lineWidth = 8; x.strokeStyle = col; x.stroke();
  x.fillStyle = night ? col : '#7a4fb0'; x.font = '700 50px Fredoka, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  if (night) { x.shadowColor = col; x.shadowBlur = 18; } x.fillText(text, 256, 60);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function cityScenery(T, Q) {
  const { S, N, cup, group } = T; const night = !!cup.night; const k = Q.hi ? 1 : 0.6;
  // ---- edificios a lo largo de la calle ----
  const blds = [];
  const step = 7;
  for (let i = 0; i < N; i += step) for (const sd of [-1, 1]) {
    const s = S[i]; const wdt = 10 + rnd() * 5, dep = 9 + rnd() * 4, h = (night ? 14 : 9) + rnd() * (night ? 22 : 15);
    const p = off(s, sd * (s.wall + 4.5 + dep / 2), 0); p.y = -0.6; // v3: fachadas más cerca de la calle
    if (!clearOfTrack(T, p, Math.min(wdt, dep) * 0.5 - 0.5)) continue;
    let hit = false; for (const b of blds) if ((b.p.x - p.x) ** 2 + (b.p.z - p.z) ** 2 < ((Math.max(b.wdt, b.dep) + Math.max(wdt, dep)) * 0.5) ** 2) { hit = true; break; }
    if (hit) continue;
    blds.push({ p, wdt, dep, h, yaw: Math.atan2(s.fl.x, s.fl.z) + (sd > 0 ? -Math.PI / 2 : Math.PI / 2), i, sd, c: cup.bld[Math.floor(rnd() * cup.bld.length)], roof: rnd() < 0.5 });
  }
  // fondo: más edificios en segunda fila (sin chequeo fino de balcones)
  for (let tries = 0; tries < 160 * k; tries++) {
    const i = Math.floor(rnd() * N), s = S[i], sd = rnd() < 0.5 ? -1 : 1; const wdt = 12 + rnd() * 8, dep = 12 + rnd() * 6, h = (night ? 20 : 12) + rnd() * (night ? 40 : 25);
    const p = off(s, sd * (s.wall + 26 + rnd() * 60), 0); p.y = -0.6;
    if (!clearOfTrack(T, p, Math.max(wdt, dep) * 0.6)) continue;
    let hit = false; for (const b of blds) if ((b.p.x - p.x) ** 2 + (b.p.z - p.z) ** 2 < ((Math.max(b.wdt, b.dep) + Math.max(wdt, dep)) * 0.62) ** 2) { hit = true; break; }
    if (hit) continue; blds.push({ p, wdt, dep, h, yaw: Math.atan2(s.fl.x, s.fl.z) + (sd > 0 ? -Math.PI / 2 : Math.PI / 2), i: -1, sd, c: cup.bld[Math.floor(rnd() * cup.bld.length)], roof: rnd() < 0.5, back: true });
  }
  T.buildings = blds;
  const n = blds.length;
  const bodyM = wobbleMat(toon('#ffffff', { rim: 0.35, nocache: true })); bodyM.map = windowTexture();
  if (night) { bodyM.emissive = new THREE.Color('#ffd27a'); bodyM.emissiveMap = windowTexture(); bodyM.emissiveIntensity = 0.0; }
  const body = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), bodyM, n);
  const dome = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 10, 0, 6.28, 0, Math.PI / 2), wobbleMat(toon('#ffffff', { rim: 0.6, nocache: true })), n);
  const cone = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 4), wobbleMat(toon('#ffffff', { rim: 0.4, nocache: true })), n);
  const shop = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), wobbleMat(toon('#ffffff', { emissive: '#ffffff', ei: night ? 0.75 : 0.25, rim: 0, nocache: true })), n);
  const awnTex = (() => { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 8; const x = cv.getContext('2d'); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#ffffff' : '#dddddd'; x.fillRect(i * 8, 0, 8, 8); } const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const awnM = wobbleMat(toon('#ffffff', { rim: 0.2, side: THREE.DoubleSide, nocache: true }), 1); awnM.map = awnTex;
  const awn = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 12, 1, true, 0, Math.PI), awnM, n);
  const nightWin = night ? new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85 }), n * 2) : null;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); let nd = 0, nc = 0, nw = 0;
  const local = (b, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => { const base = new THREE.Matrix4().compose(b.p, q.setFromEuler(e.set(0, b.yaw, 0)), new V3(1, 1, 1)); return new THREE.Matrix4().multiplyMatrices(base, M(x, y, z, sx, sy, sz, rx, ry, rz)); };
  blds.forEach((b, j) => {
    body.setMatrixAt(j, local(b, 0, b.h / 2, 0, b.wdt, b.h, b.dep)); body.setColorAt(j, C(b.c));
    if (b.roof) { dome.setMatrixAt(nd, local(b, 0, b.h, 0, b.wdt * 0.55, Math.min(5, b.wdt * 0.35), b.dep * 0.55)); dome.setColorAt(nd, C(b.c).lerp(C('#ffffff'), 0.35)); nd++; }
    else { cone.setMatrixAt(nc, local(b, 0, b.h + 2.4, 0, b.wdt * 0.78, 4.8, b.dep * 0.78, 0, Math.PI / 4)); cone.setColorAt(nc, C(cup.curbA).lerp(C(b.c), 0.3)); nc++; }
    // escaparate + toldo hacia la calle (+z local mira a la calzada)
    const fz = b.dep / 2 + 0.05;
    shop.setMatrixAt(j, local(b, 0, 2.0, fz, b.wdt * 0.8, 3.0, 0.3)); shop.setColorAt(j, C(['#fff6a0', '#a0f0ff', '#ffc0e8', '#c8ffb0'][j % 4]));
    awn.setMatrixAt(j, local(b, 0, 4.0, fz + 0.9, 1.0, b.wdt * 0.85, 1.0, 0, 0, Math.PI / 2)); awn.setColorAt(j, C([cup.curbA, '#7ee3c4', '#b9a2f7', '#ffb36b'][j % 4]));
    if (nightWin) for (let r = 0; r < 2; r++) { const y = 7 + rnd() * (b.h - 9); nightWin.setMatrixAt(nw, local(b, (rnd() - 0.5) * b.wdt * 0.6, y, fz + 0.02, 1.6, 2.0, 1)); nightWin.setColorAt(nw, C(['#ffe08a', '#ff9fe0', '#9ff5ff'][nw % 3])); nw++; }
  });
  dome.count = nd; cone.count = nc; if (nightWin) nightWin.count = nw;
  for (const im of [body, dome, cone, shop, awn, nightWin]) if (im) { if (im.instanceColor) im.instanceColor.needsUpdate = true; group.add(im); }
  // carteles de tiendas locas (solo primera fila, algunos)
  let si = 0;
  for (const b of blds) { if (b.back || si >= (Q.hi ? 18 : 10) || rnd() < 0.4) continue;
    const col = [cup.curbA, '#7ee3c4', '#b9a2f7', '#ffb36b', '#5ff5ff'][si % 5];
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(b.wdt * 0.8, b.wdt * 0.8 * 0.22), new THREE.MeshBasicMaterial({ map: shopSign(SHOPS[(si + T.cup.id.length) % SHOPS.length], col, night), transparent: true }));
    pl.applyMatrix4(local(b, 0, 5.5, b.dep / 2 + 0.25, 1, 1, 1)); group.add(pl); si++; }
  // ---- balcones con público animando ----
  const fanB = new THREE.InstancedMesh(new THREE.SphereGeometry(0.8, 12, 9), toon('#ffffff', { opacity: 0.92, rim: 0.6 }), 200);
  const fanE = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 6, 5), toon('#2a1838', { rim: 0 }), 400);
  const balc = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon('#ffffff', { rim: 0.3 }), 80);
  const fans = []; let nb = 0;
  const cols = ['#ff9cc8', '#7ee3c4', '#b9a2f7', '#ffb36b', '#8fe3f0', '#ffd98a', '#c9ff8a'];
  for (const b of blds) { if (b.back || nb >= 80 || b.h < 10) continue; if ((b.i / step | 0) % 2) continue;
    const y = 7 + Math.floor(rnd() * 2) * 3.2, fz = b.dep / 2;
    balc.setMatrixAt(nb, local(b, 0, y - 0.3, fz + 0.9, b.wdt * 0.55, 0.4, 1.8)); balc.setColorAt(nb, C('#ffffff').lerp(C(b.c), 0.3)); nb++;
    const cnt = 2 + Math.floor(rnd() * 2);
    for (let f = 0; f < cnt && fans.length < 200; f++) { const lx = (f - (cnt - 1) / 2) * 1.8; const base = local(b, lx, y + 0.6, fz + 1.1, 1, 1, 1); const pos = new V3().setFromMatrixPosition(base); fans.push({ pos, yaw: b.yaw, c: C(cols[fans.length % cols.length]), ph: rnd() * 6 }); }
  }
  balc.count = nb; fanB.count = fans.length; fanE.count = fans.length * 2;
  fans.forEach((f, j) => fanB.setColorAt(j, f.c));
  for (const im of [balc, fanB, fanE]) { if (im.instanceColor) im.instanceColor.needsUpdate = true; group.add(im); }
  T.cheer = T.cheer || 0;
  T.anims.push((t, dt) => {
    const ex = 1 + (T.cheer || 0) * 1.5;
    fans.forEach((f, j) => { const y = f.pos.y + Math.abs(Math.sin(t * (4 + ex) + f.ph)) * 0.45 * ex; const sq = 1 + Math.sin(t * 8 + f.ph) * 0.06 * ex;
      m4.compose(new V3(f.pos.x, y, f.pos.z), q.setFromEuler(e.set(0, f.yaw, Math.sin(t * 3 + f.ph) * 0.15 * ex)), new V3(1 / sq, sq, 1 / sq)); fanB.setMatrixAt(j, m4);
      for (const sdE of [-1, 1]) { const ex2 = new V3(sdE * 0.28, 0.15, 0.74).applyEuler(e.set(0, f.yaw, 0)); m4.compose(new V3(f.pos.x + ex2.x, y + ex2.y, f.pos.z + ex2.z), q.identity(), new V3(1, 1.3, 1)); fanE.setMatrixAt(j * 2 + (sdE > 0 ? 1 : 0), m4); } });
    fanB.instanceMatrix.needsUpdate = true; fanE.instanceMatrix.needsUpdate = true;
  });
  // ---- ropa tendida entre edificios enfrentados ----
  const front = blds.filter(b => !b.back);
  let lines = 0;
  for (const a of front) { if (lines >= (Q.hi ? 12 : 7) || a.sd > 0) continue;
    const b = front.find(o => o.sd > 0 && Math.abs(o.i - a.i) <= 7 && o.h > 9); if (!b || a.h < 9 || rnd() < 0.35) continue;
    const pa = new V3().setFromMatrixPosition(local(a, 0, Math.min(a.h, b.h) - 2.5, a.dep / 2, 1, 1, 1)), pb = new V3().setFromMatrixPosition(local(b, 0, Math.min(a.h, b.h) - 2.5, b.dep / 2, 1, 1, 1));
    const mid = pa.clone().add(pb).multiplyScalar(0.5); mid.y -= 2;
    const crv = new THREE.QuadraticBezierCurve3(pa, mid, pb);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(crv, 16, 0.06, 4), toon('#ffffff', { rim: 0 })));
    const g = new THREE.Group(); group.add(g); const items = [];
    for (let c = 1; c < 9; c++) { const u = c / 9, p = crv.getPoint(u); const cl = new THREE.Group(); cl.position.copy(p); g.add(cl);
      const kind = c % 3; const col = ['#ff7fb6', '#7ee3c4', '#ffd36b', '#b9a2f7', '#ffffff', '#6fd3ff'][(c + lines) % 6];
      const shape = kind === 0 ? new THREE.PlaneGeometry(1.6, 1.8) : kind === 1 ? new THREE.PlaneGeometry(1.0, 2.0) : new THREE.CircleGeometry(0.8, 12);
      const m = mesh(shape, toon(col, { side: THREE.DoubleSide, rim: 0 }), cl, [0, -1.0, 0]); m.lookAt(m.position.clone().add(new V3(pb.z - pa.z, 0, pa.x - pb.x)));
      items.push([cl, c]); }
    T.anims.push(t => items.forEach(([cl, c]) => { cl.rotation.x = Math.sin(t * 2.2 + c) * 0.35; cl.rotation.z = Math.sin(t * 1.7 + c * 2) * 0.15; }));
    lines++;
  }
  // ---- farolas ----
  const lamps = [];
  for (let i = 3; i < N; i += 9) for (const sd of [-1, 1]) { if ((i / 9 | 0) % 2 === (sd > 0 ? 0 : 1)) continue; const s = S[i], p = off(s, sd * (s.wall + 1.0), 0); if (T.inShortcut(p.x, p.z) != null) continue; let near = false; for (const sc of T.shortcuts) for (const q2 of sc.pts) if ((q2.x - p.x) ** 2 + (q2.z - p.z) ** 2 < 64) near = true; if (!near) lamps.push({ p, yaw: Math.atan2(s.fl.x, s.fl.z), sd }); }
  const lp = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.24, 7, 8), toon(night ? '#9a8ad0' : '#ffffff'), lamps.length);
  const la = new THREE.InstancedMesh(new THREE.TorusGeometry(1, 0.13, 6, 12, Math.PI), toon(night ? '#9a8ad0' : '#ffffff'), lamps.length);
  const lb = new THREE.InstancedMesh(new THREE.SphereGeometry(0.6, 12, 8), toon('#ffffff', { emissive: '#fff2b0', ei: night ? 1 : 0.35, rim: 0 }), lamps.length);
  lamps.forEach((l, j) => { lp.setMatrixAt(j, M(l.p.x, l.p.y + 3.5, l.p.z)); const r = new V3(-Math.cos(l.yaw), 0, Math.sin(l.yaw)).multiplyScalar(-l.sd); // hacia la calzada
    m4.compose(new V3(l.p.x + r.x, l.p.y + 7, l.p.z + r.z), q.setFromEuler(e.set(0, Math.atan2(r.x, r.z) - Math.PI / 2, 0)), new V3(1, 1, 1)); la.setMatrixAt(j, m4);
    lb.setMatrixAt(j, M(l.p.x + r.x * 2, l.p.y + 6.6, l.p.z + r.z * 2)); lb.setColorAt(j, C(night ? ['#ff9fe0', '#9ff5ff', '#fff2b0'][j % 3] : '#fff6d0')); });
  for (const im of [lp, la, lb]) { if (im.instanceColor) im.instanceColor.needsUpdate = true; group.add(im); }
  if (night) { const glow = new THREE.InstancedMesh(new THREE.CircleGeometry(3.2, 16), new THREE.MeshBasicMaterial({ color: '#ffd2f0', transparent: true, opacity: 0.18, depthWrite: false }), lamps.length);
    lamps.forEach((l, j) => { const r = new V3(-Math.cos(l.yaw), 0, Math.sin(l.yaw)).multiplyScalar(-l.sd); glow.setMatrixAt(j, M(l.p.x + r.x * 2.5, l.p.y + 0.32, l.p.z + r.z * 2.5, 1, 1, 1, -Math.PI / 2)); }); group.add(glow); }
  stands(T, Q);
}
function makePlaza(T, i) {
  const s = T.S[i]; const sg = Math.sign(s.curv) || 1; // curv>0: gira a la izquierda (-right)
  const p = off(s, sg * -(s.wall + 14), 0); p.y = -0.6; (T.plazas ||= []).push({ x: p.x, z: p.z, r: 10 });
  const g = new THREE.Group(); g.position.copy(p); T.group.add(g);
  const C1 = T.cup.curbA;
  const base = mesh(new THREE.CylinderGeometry(8, 8.6, 1.2, 32), toon('#ffffff'), g, [0, 0.6, 0]); outline(base, '#7a4a8a', 1.02);
  mesh(new THREE.CylinderGeometry(7, 7, 0.4, 32), toon('#8fe3ff', { emissive: '#4fc8ff', ei: 0.3, opacity: 0.85 }), g, [0, 1.25, 0]);
  const pil = mesh(new THREE.CylinderGeometry(0.8, 1.2, 5, 16), toon(C1), g, [0, 3.5, 0]); outline(pil, '#7a4a8a', 1.04);
  const top = mesh(new THREE.SphereGeometry(2.2, 18, 12), toon('#ffffff', { rim: 0.6, opacity: 0.9 }), g, [0, 7, 0]);
  const jets = []; for (let k = 0; k < 8; k++) { const j = mesh(new THREE.SphereGeometry(0.5, 8, 6), toon('#bff4ff', { opacity: 0.8, emissive: '#7ff5ff', ei: 0.3 }), g, [0, 6, 0]); jets.push([j, k]); }
  T.anims.push(t => { top.scale.y = 1 + Math.sin(t * 3) * 0.1; jets.forEach(([j, k]) => { const ph = (t * 0.8 + k / 8) % 1, a = k / 8 * 6.28; j.position.set(Math.cos(a) * ph * 6, 6 + ph * 4 - ph * ph * 9, Math.sin(a) * ph * 6); }); });
}
// paso de peatones (cross) o cruce a mitad de calle (jay): rayas, semáforos/señales
function makeCrossing(T, f, i) {
  const s = T.S[i]; const g = new THREE.Group(); g.position.copy(s.p); g.rotation.y = Math.atan2(s.fl.x, s.fl.z); T.group.add(g);
  const cr = { idx: i, kind: f.kind, jay: f.type === 'jay', g, lights: [], period: 10 + (i % 5), phase: (i * 0.37) % 1 * 10 };
  if (!cr.jay) {
    const stripeM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.92, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
    for (let x = -s.w + 1; x <= s.w - 1; x += 2.2) mesh(new THREE.PlaneGeometry(1.2, 5), stripeM, g, [x, 0.1, 0], [-Math.PI / 2, 0, 0]);
  } else {
    const dm = new THREE.MeshBasicMaterial({ color: '#ffd84a', transparent: true, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
    for (let x = -s.w + 1; x <= s.w - 1; x += 3) mesh(new THREE.PlaneGeometry(1.6, 0.6), dm, g, [x, 0.1, -6], [-Math.PI / 2, 0, 0]);
  }
  // postes con semáforo (o señal de peligro) a ambos lados, adelantados 7 m para verlos llegar
  for (const sd of [-1, 1]) {
    const pole = new THREE.Group(); pole.position.set(sd * (s.w + 2.2), 0, cr.jay ? -14 : -3); g.add(pole);
    mesh(new THREE.CylinderGeometry(0.18, 0.22, 6, 8), toon('#ffffff'), pole, [0, 3, 0]);
    if (cr.jay) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d');
      x.fillStyle = '#ffd84a'; x.strokeStyle = '#ff5f8f'; x.lineWidth = 18; x.beginPath(); x.moveTo(128, 18); x.lineTo(240, 226); x.lineTo(16, 226); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = '#4a2a6a'; x.font = '700 120px Fredoka, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('!', 128, 150);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
      const sign = mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide }), pole, [0, 6.6, 0], [0, Math.PI, 0]);
      cr.lights.push({ sign });
    } else {
      const box = mesh(new THREE.BoxGeometry(1.0, 2.6, 0.8), toon('#4a3a6a'), pole, [0, 6.8, 0]);
      const mk = (y, col) => mesh(new THREE.SphereGeometry(0.33, 12, 8), new THREE.MeshBasicMaterial({ color: col }), pole, [0, y, -0.42]);
      cr.lights.push({ red: mk(7.6, '#ff3f6f'), amb: mk(6.8, '#ffc23d'), grn: mk(6.0, '#5fff9a') });
    }
  }
  return cr;
}
