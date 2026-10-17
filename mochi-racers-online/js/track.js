import * as THREE from 'three';
import { toon, mesh, outline, makeItemBox, starShape } from './gfx.js';
import { addDeco } from './deco.js';

const V3 = THREE.Vector3;
let seed = 1; let OPEN = false; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const C = c => new THREE.Color(c);

export { ribbon };
export function buildTrack(cup, reverse, quality) {
  seed = cup.seed || (7 + cup.id.length * 13 + (reverse ? 5 : 0)); OPEN = !!cup.open; // online: pista abierta (sin fin)
  let P = cup.pts.map(p => p.slice());
  if (reverse) P = [P[0], ...P.slice(1).reverse()];
  const remap = t => reverse ? (1 - t) % 1 : t;
  const feats = cup.feats.map(f => {
    const g = { ...f, t: remap(f.t) };
    if (f.t2 != null) { if (reverse) { g.t = remap(f.t2); g.t2 = remap(f.t); } }
    if (f.off != null && reverse) g.off = -f.off;
    return g;
  });
  const curve = new THREE.CatmullRomCurve3(P.map(p => new V3(p[0], p[2], p[1])), !OPEN, 'centripetal');
  const L = curve.getLength(), STEP = 2, N = Math.round(L / STEP);
  const S = []; const nP = P.length;
  for (let i = 0; i < N; i++) {
    const u = i / N, p = curve.getPointAt(u), tg = curve.getTangentAt(u);
    const t = curve.getUtoTmapping(u) * nP, a = Math.floor(t) % nP, b = (a + 1) % nP, f = t - Math.floor(t);
    const w = P[a][3] * (1 - f) + P[b][3] * f;
    const fl = new V3(tg.x, 0, tg.z).normalize();
    const right = new V3(-fl.z, 0, fl.x); // right-hand side when facing tangent (three: x right, z toward viewer)
    S.push({ p, tg, fl, right, w: w / 2, wall: w / 2 + (cup.theme === 'space' ? 2.2 : 6), slope: tg.y });
  }
  // curvature (for AI)
  for (let i = 0; i < N; i++) { const a = S[(i + N - 4) % N].fl, b = S[(i + 4) % N].fl; S[i].curv = Math.atan2(a.x * b.z - a.z * b.x, a.x * b.x + a.z * b.z); }
  const T = { open: OPEN, cup, reverse, curve, L, N, STEP, S, feats, group: new THREE.Group(), boxes: [], pads: [], ramps: [], shortcuts: [], obstacles: [], grav: cup.grav, grip: cup.grip, theme: cup.theme };
  const idxOf = t => ((Math.round(t * N) % N) + N) % N;
  T.idxOf = idxOf;

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
  const pos = [], cols = [], idx = []; if (OPEN) closed = false;
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
  // road with soft lane stripes
  group.add(new THREE.Mesh(ribbon(S, N, s => off(s, -s.w), s => off(s, s.w), i => { const c = (i >> 3) % 2 ? road : roadB; return [c, c]; }, true, 0.05), vmat));
  // centre dashes
  const dash = C(cup.curbB).lerp(road, 0.5);
  group.add(new THREE.Mesh(ribbon(S, N, s => off(s, -0.25), s => off(s, 0.25), i => { const c = (i >> 2) % 3 === 0 ? dash : road; return [c, c]; }, true, 0.07), vmat));
  // curbs
  for (const sd of [-1, 1]) group.add(new THREE.Mesh(ribbon(S, N, s => off(s, sd * s.w, 0), s => off(s, sd * (s.w + 1.4), 0.25), i => { const c = (i >> 1) % 2 ? cA : cB; return [c, c]; }, true, 0.06), vmat));
  // shoulders (offroad) + embankment skirts
  const g1 = C(cup.ground || '#2a1858'), g2 = C(cup.ground2 || cup.ground || '#3a2a6a');
  if (!space) {
    for (const sd of [-1, 1]) {
      group.add(new THREE.Mesh(ribbon(S, N, s => off(s, sd * (s.w + 1.4), 0.25), s => off(s, sd * (s.wall + 2)), i => { const c = (i >> 4) % 2 ? g1 : g1.clone().lerp(g2, 0.25); return [c, c]; }, true, 0.0), vmat));
      group.add(new THREE.Mesh(ribbon(S, N, s => off(s, sd * (s.wall + 2)), s => { const q = off(s, sd * (s.wall + 6 + s.p.y * 2.5)); q.y = -0.6; return q; }, i => [g1, g1.clone().lerp(g2, 0.5)], true), vmat));
    }
    // ground plane
    let gR = 1100, gcx = 0, gcz = 0; if (T.open) { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const s of S) { x0 = Math.min(x0, s.p.x); x1 = Math.max(x1, s.p.x); z0 = Math.min(z0, s.p.z); z1 = Math.max(z1, s.p.z); } gcx = (x0 + x1) / 2; gcz = (z0 + z1) / 2; gR = Math.hypot(x1 - x0, z1 - z0) / 2 + 900; }
    const gp = new THREE.Mesh(new THREE.CircleGeometry(gR, 64), toon(cup.ground, { rim: 0 })); gp.rotation.x = -Math.PI / 2; gp.position.set(gcx, -0.62, gcz); group.add(gp);
    // ground blotches (flower/sprinkle patches) for texture
    const bl = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 10), toon(cup.ground2, { rim: 0, opacity: 0.6 }), (Q.hi ? 160 : 70) * (T.open ? 3 : 1));
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    for (let i = 0; i < bl.count; i++) { const r = 20 + rnd() * (T.open ? 120 : 600), a = rnd() * 6.28, bs = T.open ? S[Math.floor(rnd() * N)].p : { x: 0, z: 0 }; m4.compose(new V3(bs.x + Math.cos(a) * r, -0.58, bs.z + Math.sin(a) * r), q, new V3(5 + rnd() * 20, 5 + rnd() * 20, 1)); bl.setMatrixAt(i, m4); }
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
    const s = S[i], p = off(s, sd * (s.wall + 0.3), space ? 0.6 : 0.9);
    if (T.inShortcut(p.x, p.z) != null) continue;
    let near = false; for (const sc of T.shortcuts) for (const q of sc.pts) if ((q.x - p.x) ** 2 + (q.z - p.z) ** 2 < 49) near = true;
    if (near) continue;
    m4.compose(p, qI, one); rail.setMatrixAt(rc, m4); rail.setColorAt(rc, railCols[(i / 3 | 0) % 2]); rc++;
  }
  rail.count = rc; group.add(rail);
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
  for (const f of T.feats) {
    const i = T.idxOf(f.t), s = S[i], yaw = Math.atan2(s.fl.x, s.fl.z);
    if (f.type === 'boxes') for (let k = 0; k < 4; k++) {
      const lat = (k - 1.5) * s.w * 0.42; const b = makeItemBox(); const p = off(s, lat, 1.6); b.position.copy(p); group.add(b);
      T.boxes.push({ mesh: b, pos: p, idx: i, lat, t: 0, ph: k * 0.7 });
    }
    if (f.type === 'boost') T.pads.push(Object.assign(makePadAlong(group, T.ptsRing(i, 4), T.rightsRing(i, 4), 4, f.off || 0, 2.6, 3), { idx: i }));
    if (f.type === 'ramp') T.ramps.push(makeRampAlong(T, i, 3, 1.5));
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
  scenery(T, Q);
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
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: padTexture(), side: THREE.DoubleSide, transparent: true, opacity: 0.97 })); group.add(m);
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
  if (T.open) count = Math.round(count * 3);
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
  if (!/nodeco/.test(location.search)) try { T.deco = addDeco(T, Q, { off, rnd }); } catch (e) { console.warn('deco', e); } // v2: decoración extra (solo visual)
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
