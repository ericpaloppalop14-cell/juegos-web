// Vida de la ciudad (v2): público gelatina en aceras y plazas, confeti y banderines en la salida,
// muñecos que se asoman por las ventanas y más cosas surrealistas en el cielo.
// Todo con InstancedMesh o con un pool pequeño reutilizable: no se crean objetos por fotograma.
import * as THREE from 'three';
import { toon, mesh } from './gfx.js?v=o41';
import { addEdificios } from './edificios.js';
const V3 = THREE.Vector3;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new V3(), _p = new V3(), _v = new V3();
const COLS = ['#ff9cc8', '#7ee3c4', '#b9a2f7', '#ffb36b', '#8fe3f0', '#ffd98a', '#c9ff8a', '#ff8f8f', '#ffffff'];
let seed = 99; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const nofog = o => { o.traverse(m => { if (m.material) { m.material = m.material.clone(); m.material.fog = false; } }); return o; };
const ang = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

// Aplana un grupo estático (sin partes que se muevan entre sí) a UNA malla con colores por vértice.
// Las piezas transparentes se quedan aparte. Ahorra decenas de llamadas de dibujo por objeto del cielo.
export function flatten(root, { fog = true, emissive = 0 } = {}) {
  root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), mm = new THREE.Matrix4(); const pos = [], nor = [], col = [], kill = [];
  root.traverse(o => { if (!o.isMesh || o.isInstancedMesh || o.renderOrder === -1) return; const m = o.material; if (Array.isArray(m) || !m.color || m.transparent) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); if (!g.attributes.normal) g.computeVertexNormals(); g.applyMatrix4(mm.multiplyMatrices(inv, o.matrixWorld));
    const P = g.attributes.position.array, Nn = g.attributes.normal.array, c = m.color.clone(); if (m.emissive && m.emissiveIntensity) c.lerp(m.emissive, Math.min(0.5, m.emissiveIntensity * 0.3));
    for (let i = 0; i < P.length; i++) { pos.push(P[i]); nor.push(Nn[i]); } for (let i = 0; i < P.length / 3; i++) col.push(c.r, c.g, c.b); g.dispose(); kill.push(o); });
  for (const o of kill) { for (const ch of o.children.slice()) if (!kill.includes(ch) && ch.renderOrder !== -1) { o.remove(ch); /* hijos no aplanados se pierden solo si eran contornos */ } o.parent && o.parent.remove(o); }
  if (!pos.length) return root;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const mt = toon('#ffffff', { vc: true, rim: 0.5, emissive: emissive ? '#ffffff' : '#000000', ei: emissive || 1, nocache: true }); mt.fog = fog; root.add(new THREE.Mesh(g, mt)); return root;
}
function eyesOn(parent, z, s, y = 0.15) { for (const sd of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(1, 8, 6), toon('#2a1838', { rim: 0 }), parent, [sd * 0.3 * s, y * s, z], null, [0.1 * s, 0.14 * s, 0.05 * s]); mesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffffff' }), e, [0.3, 0.35, 0.8], null, 0.35); } }

export function addVida(T, Q, scene, race) {
  seed = 31 + T.cup.id.length * 7;
  const S = T.S, N = T.N, hi = !!Q.hi, night = !!T.cup.night, upd = [];
  const nearCross = i => (T.crossings || []).some(c => { const d = Math.abs(((i - c.idx) % N + N + N / 2) % N - N / 2); return d < (c.jay ? 9 : 7); });
  // ======================= PÚBLICO =======================
  const fans = [];
  const addFan = (x, y, z, faceX, faceZ, amp = 1) => fans.push({ x, y, z, yaw: Math.atan2(faceX - x, faceZ - z), ph: rnd() * 6.28, c: COLS[Math.floor(rnd() * COLS.length)], amp, sc: 0.8 + rnd() * 0.45, sp: 3.5 + rnd() * 2.5 });
  const cap = hi ? 460 : 300;
  for (let i = 0; i < N && fans.length < cap; i++) {
    const s = S[i], dS = Math.min(i, N - i), start = dS < 16;
    if (nearCross(i)) continue;
    for (const sd of [-1, 1]) {
      const dense = start ? 1 : (((i / 14) | 0) + (sd > 0 ? 1 : 0)) % 3 === 0 ? 0.33 : 0.0;
      if (rnd() > dense) continue;
      const rows = start ? 2 : 1;
      for (let r = 0; r < rows; r++) { const lat = sd * (s.wall + 2.0 + r * 1.7 + rnd() * 0.4), al = (rnd() - 0.5) * 1.6;
        addFan(s.p.x + s.right.x * lat + s.fl.x * al, s.p.y + 0.25, s.p.z + s.right.z * lat + s.fl.z * al, s.p.x, s.p.z, start ? 1.4 : 1); }
    }
  }
  for (const pz of T.plazas || []) for (let k = 0; k < 18 && fans.length < cap + 40; k++) { const a = k / 18 * 6.28; addFan(pz.x + Math.cos(a) * 10.4, -0.6 + 1.2, pz.z + Math.sin(a) * 10.4, pz.x, pz.z, 1.2); }
  const nF = fans.length;
  const body = new THREE.InstancedMesh(new THREE.SphereGeometry(0.75, 9, 6), toon('#ffffff', { rim: 0.6 }), nF);
  const eyes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 4, 3), toon('#2a1838', { rim: 0 }), nF * 2);
  const hands = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 5, 3), toon('#ffffff', { rim: 0.3 }), nF * 2);
  fans.forEach((f, j) => { const c = new THREE.Color(f.c); body.setColorAt(j, c); hands.setColorAt(j * 2, c); hands.setColorAt(j * 2 + 1, c); });
  for (const im of [body, eyes, hands]) { im.frustumCulled = false; if (im.instanceColor) im.instanceColor.needsUpdate = true; scene.add(im); }
  const placeFan = (f, j, t, ex) => {
    const h = Math.abs(Math.sin(t * f.sp + f.ph)) * 0.55 * ex * f.amp, sq = 1 + Math.sin(t * f.sp * 2 + f.ph) * 0.07 * ex, y = f.y + 0.75 * f.sc + h;
    _q.setFromEuler(_e.set(0, f.yaw, Math.sin(t * 2.6 + f.ph) * 0.12 * ex)); _m.compose(_p.set(f.x, y, f.z), _q, _s.set(f.sc / sq, f.sc * sq * 1.12, f.sc / sq)); body.setMatrixAt(j, _m);
    const cy = Math.cos(f.yaw), sy = Math.sin(f.yaw);
    for (let k = 0; k < 2; k++) { const sd = k ? 1 : -1;
      const lx = sd * 0.25 * f.sc, lz = 0.66 * f.sc; _m.makeTranslation(f.x + lx * cy + lz * sy, y + 0.18 * f.sc, f.z - lx * sy + lz * cy); eyes.setMatrixAt(j * 2 + k, _m);
      const wave = Math.sin(t * (f.sp + 3) + f.ph + k * 1.3), hx = sd * 0.85 * f.sc, hy = (0.2 + (0.55 + 0.35 * wave) * Math.min(1.5, ex)) * f.sc, hz = 0.15 * f.sc;
      _m.makeTranslation(f.x + hx * cy + hz * sy, y + hy, f.z - hx * sy + hz * cy); hands.setMatrixAt(j * 2 + k, _m); }
  };
  fans.forEach((f, j) => placeFan(f, j, 0, 1));
  let fanT = 0;
  upd.push((t, dt, R) => {
    const P = R.player; if (!P) return; fanT += dt; const ex0 = 1 + (T.cheer || 0) * 1.3;
    const px = P.pos.x, pz = P.pos.z;
    for (let j = 0; j < nF; j++) { const f = fans[j], dx = f.x - px, dz = f.z - pz, d2 = dx * dx + dz * dz; if (d2 > 140 * 140) continue; // fuera de vista: no se toca
      const near = d2 < 26 * 26 ? 1.6 : 1; placeFan(f, j, t, ex0 * near); }
    body.instanceMatrix.needsUpdate = eyes.instanceMatrix.needsUpdate = hands.instanceMatrix.needsUpdate = true;
  });
  // ======================= SALIDA: banderines + confeti =======================
  { const flagGeo = new THREE.BufferGeometry(); flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.55, 0, 0, 0.55, 0, 0, 0, -1.3, 0], 3)); flagGeo.computeVertexNormals();
    const rows = [7, 15, -9, -18], per = 16, flags = new THREE.InstancedMesh(flagGeo, toon('#ffffff', { rim: 0, side: THREE.DoubleSide }), rows.length * per); let nfg = 0; const fl = [];
    for (const ri of rows) { const s = S[(ri + N) % N], a = new V3(s.p.x - s.right.x * (s.wall + 3), s.p.y + 9.5, s.p.z - s.right.z * (s.wall + 3)), b = new V3(s.p.x + s.right.x * (s.wall + 3), s.p.y + 9.5, s.p.z + s.right.z * (s.wall + 3));
      const mid = a.clone().add(b).multiplyScalar(0.5); mid.y -= 2.2; const crv = new THREE.QuadraticBezierCurve3(a, mid, b);
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(crv, 12, 0.05, 3), toon('#ffffff', { rim: 0 })));
      for (let k = 0; k < per; k++) { const p = crv.getPoint((k + 0.5) / per); fl.push({ p, yaw: Math.atan2(s.right.x, s.right.z) + Math.PI / 2, ph: k }); flags.setColorAt(nfg++, new THREE.Color(COLS[(k + ri) % 8])); } }
    flags.instanceColor.needsUpdate = true; scene.add(flags);
    upd.push(t => { fl.forEach((f, j) => { _q.setFromEuler(_e.set(Math.sin(t * 3 + f.ph) * 0.35, f.yaw, 0)); _m.compose(f.p, _q, _s.set(1, 1, 1)); flags.setMatrixAt(j, _m); }); flags.instanceMatrix.needsUpdate = true; });
    // confeti cayendo sobre la línea de salida
    const nC = hi ? 420 : 240, cp = new Float32Array(nC * 3), cc = new Float32Array(nC * 3), cv = new Float32Array(nC * 2), s0 = S[0];
    const reset = (k, top) => { const lat = (rnd() - 0.5) * 2 * (s0.wall + 4), al = (rnd() - 0.5) * 50; cp[k * 3] = s0.p.x + s0.right.x * lat + s0.fl.x * al; cp[k * 3 + 1] = s0.p.y + (top ? 16 + rnd() * 6 : rnd() * 22); cp[k * 3 + 2] = s0.p.z + s0.right.z * lat + s0.fl.z * al; cv[k * 2] = rnd() * 6.28; cv[k * 2 + 1] = 1.2 + rnd() * 1.6; };
    for (let k = 0; k < nC; k++) { reset(k, false); const c = new THREE.Color(COLS[k % 8]); cc[k * 3] = c.r; cc[k * 3 + 1] = c.g; cc[k * 3 + 2] = c.b; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(cp, 3)); g.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.45, vertexColors: true, sizeAttenuation: true })); pts.frustumCulled = false; scene.add(pts);
    upd.push((t, dt, R) => { const P = R.player; if (!P || P.pos.distanceToSquared(s0.p) > 160 * 160) { pts.visible = false; return; } pts.visible = true;
      for (let k = 0; k < nC; k++) { cp[k * 3 + 1] -= cv[k * 2 + 1] * dt * 1.6; cp[k * 3] += Math.sin(t * 2 + cv[k * 2]) * dt * 0.8; if (cp[k * 3 + 1] < s0.p.y + 0.3) reset(k, true); } g.attributes.position.needsUpdate = true; });
  }
  // ======================= MUÑECOS EN LAS VENTANAS =======================
  // v3: ventanas del primer piso y puertas de las tiendas, pegadas a la calle (antes estaban a ~8 m de altura)
  const wins = [];
  for (const b of T.buildings || []) { if (b.back || b.i < 0) continue; const cy = Math.cos(b.yaw), sy = Math.sin(b.yaw);
    const put = (lx, ly, lz, door) => wins.push({ p: new V3(b.p.x + lx * cy + lz * sy, b.p.y + ly, b.p.z - lx * sy + lz * cy), yaw: b.yaw, i: b.i, cd: rnd() * 4, open: 0, door });
    if (b.h >= 10) put((rnd() - 0.5) * b.wdt * 0.4, 7.9, b.dep / 2 + 0.06, false);
    if (rnd() < 0.6) put((rnd() < 0.5 ? -1 : 1) * b.wdt * 0.28, 1.45, b.dep / 2 + 0.35, true); }
  const nW = wins.length;
  const frame = new THREE.InstancedMesh(new THREE.BoxGeometry(2.6, 2.9, 0.25), toon(night ? '#ffe7a0' : '#4a3a7a', { rim: 0, emissive: night ? '#ffcf6a' : '#000000', ei: night ? 0.6 : 1 }), Math.max(1, nW));
  const shut = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon('#ffffff', { rim: 0.3 }), Math.max(1, nW * 2));
  const dParent = new THREE.Object3D(), dHinge = new THREE.Object3D(), dLeaf = new THREE.Object3D(); dParent.add(dHinge); dHinge.add(dLeaf);
  const shutCols = ['#7ee3c4', '#ff9cc8', '#ffd36b', '#9fc3ff', '#ffb36b'];
  const placeShutters = (w, j) => { dParent.position.copy(w.p); dParent.rotation.set(0, w.yaw, 0);
    for (let k = 0; k < 2; k++) { const sd = k ? 1 : -1; dHinge.position.set(sd * 1.3, 0, 0.16); dHinge.rotation.set(0, sd * w.open * 1.9, 0); dLeaf.position.set(-sd * 0.65, 0, 0); dLeaf.scale.set(1.3, 2.9, 0.12); dParent.updateMatrixWorld(true); shut.setMatrixAt(j * 2 + k, dLeaf.matrixWorld); } };
  wins.forEach((w, j) => { _m.compose(w.p, _q.setFromEuler(_e.set(0, w.yaw, 0)), _s.set(1, 1, 1)); frame.setMatrixAt(j, _m); placeShutters(w, j); const c = new THREE.Color(shutCols[j % 5]); shut.setColorAt(j * 2, c); shut.setColorAt(j * 2 + 1, c); });
  frame.count = nW; shut.count = nW * 2; if (shut.instanceColor) shut.instanceColor.needsUpdate = true; scene.add(frame); scene.add(shut);
  // pool de personajes (cada uno con su "acción")
  const KINDS = ['gato', 'abuela', 'trompeta', 'confeti', 'flores', 'pulpo'];
  const mkChar = kind => { const g = new THREE.Group(); const col = { gato: '#ffb36b', abuela: '#d9c2ff', trompeta: '#7ee3c4', confeti: '#ff9cc8', flores: '#ffd98a', pulpo: '#ff8fd8' }[kind];
    const bd = mesh(new THREE.SphereGeometry(0.8, 14, 10), toon(col, { rim: 0.7, opacity: 0.95 }), g, [0, 0, 0], null, [1, 1.1, 0.9]); eyesOn(bd, 0.7, 1, 0.2);
    const hands = []; for (const sd of [-1, 1]) hands.push(mesh(new THREE.SphereGeometry(0.25, 8, 6), toon(col), g, [sd * 0.85, 0.1, 0.3]));
    if (kind === 'gato') for (const sd of [-1, 1]) mesh(new THREE.ConeGeometry(0.3, 0.55, 4), toon(col), g, [sd * 0.45, 0.95, 0], [0, 0, -sd * 0.3]);
    if (kind === 'abuela') { mesh(new THREE.SphereGeometry(0.42, 10, 8), toon('#f0f0f0'), g, [0, 1.0, -0.2]); for (const sd of [-1, 1]) mesh(new THREE.TorusGeometry(0.17, 0.04, 6, 12), toon('#5a3a6e', { rim: 0 }), g, [sd * 0.27, 0.2, 0.78]); }
    if (kind === 'trompeta') { const tr = mesh(new THREE.ConeGeometry(0.32, 1.2, 10, 1, true), toon('#ffd84a', { emissive: '#ffb000', ei: 0.3, side: THREE.DoubleSide }), g, [0.2, -0.05, 1.1], [-Math.PI / 2, 0, 0]); g.userData.tr = tr; }
    if (kind === 'confeti') mesh(new THREE.ConeGeometry(0.4, 0.9, 10), toon('#5ff5ff'), g, [0, 1.15, 0], [0, 0, 0.2]);
    if (kind === 'flores') { const fl = mesh(new THREE.SphereGeometry(0.28, 8, 6), toon('#ff5f8f', { emissive: '#ff3f6f', ei: 0.3 }), g, [0.85, 0.5, 0.4]); g.userData.fl = fl; }
    if (kind === 'pulpo') for (let k = 0; k < 4; k++) hands.push(mesh(new THREE.CapsuleGeometry(0.13, 0.6, 3, 6), toon(col), g, [-0.6 + k * 0.4, -0.8, 0.4]));
    g.userData.hands = hands; g.userData.kind = kind; g.visible = false; scene.add(g); return g; };
  const pool = []; for (let k = 0; k < (hi ? 10 : 6); k++) pool.push({ g: mkChar(KINDS[k % KINDS.length]), w: null, t: 0 });
  const stats = { pops: 0 }; T.windowStats = stats;
  let scanT = 0, kindRot = 0;
  upd.push((t, dt, R) => {
    const P = R.player; if (!P) return;
    scanT -= dt; if (scanT <= 0) { scanT = 0.1;
      // se asoman según el tiempo que tardará el JUGADOR en pasar por delante (entre 0,8 y 2,6 s), para que dé tiempo a verlos
      for (const w of wins) { if (w.cd > 0 || w.busy) continue; const di = ((w.i - P.idx) % N + N) % N, ahead = di * T.STEP; if (ahead < 20 || ahead > 140) continue; const tr = ahead / Math.max(12, P.fs); if (tr < 0.9 || tr > 3.2) continue;
        const free = pool.filter(s => !s.w); if (!free.length) break; const slot = free[kindRot % free.length];
        // otro tipo de muñeco cada vez: intercambia el grupo con el de otro slot libre si hace falta
        slot.w = w; slot.t = 0; w.busy = true; w.cd = 14; stats.pops++; kindRot++; break; } }
    for (const w of wins) if (w.cd > 0 && !w.busy) w.cd -= dt;
    for (const s of pool) { if (!s.w) continue; const w = s.w, g = s.g; s.t += dt; const tt = s.t;
      w.open = tt < 0.18 ? tt / 0.18 : tt > 4.6 ? Math.max(0, 1 - (tt - 4.6) / 0.4) : 1;
      const pop = tt < 0.12 ? 0 : tt < 0.6 ? 1 - Math.pow(1 - (tt - 0.12) / 0.48, 3) * Math.cos((tt - 0.12) * 10) : tt > 4.2 ? Math.max(0, 1 - (tt - 4.2) / 0.4) : 1;
      g.visible = pop > 0.01; g.position.copy(w.p); g.rotation.set(0, w.yaw, 0); g.translateZ(-0.5 + pop * (w.door ? 6.0 : 5.0)); g.translateY((w.door ? 0.4 : -0.2) + Math.abs(Math.sin(tt * 7)) * (w.door ? 0.7 : 0.25));
      // mira al jugador
      const yawTo = Math.atan2(P.pos.x - g.position.x, P.pos.z - g.position.z); g.rotation.y = w.yaw + Math.max(-0.9, Math.min(0.9, ang(w.yaw, yawTo)));
      g.scale.set(Math.max(0.01, pop) * (w.door ? 5.2 : 4.8) * (1 + Math.sin(tt * 14) * 0.06), Math.max(0.01, pop) * (w.door ? 5.2 : 4.8) * (1 - Math.sin(tt * 14) * 0.06), Math.max(0.01, pop) * 4.8);
      const hs = g.userData.hands; hs.forEach((h, k) => { if (k < 2) h.position.y = 0.1 + (k === 1 || g.userData.kind !== 'trompeta' ? Math.abs(Math.sin(tt * 9 + k)) * 0.8 : 0); else h.rotation.z = Math.sin(tt * 7 + k) * 0.6; });
      if (pop > 0.9 && R.emit && Math.random() < dt * 9) { const k = g.userData.kind; g.getWorldPosition(_v); _v.y += 0.6;
        const col = k === 'flores' ? ['#ff5f8f', '#ffd84a', '#ffffff'][Math.floor(Math.random() * 3)] : k === 'trompeta' ? '#ffe066' : COLS[Math.floor(Math.random() * 8)];
        if (k !== 'gato' && k !== 'abuela') R.emit(_v.clone(), col, k === 'trompeta' ? 0.45 : 0.6, 1.1, new V3((P.pos.x - _v.x) * 0.15 + (Math.random() - 0.5) * 4, 2 + Math.random() * 3, (P.pos.z - _v.z) * 0.15 + (Math.random() - 0.5) * 4)); }
      if (g.userData.fl) g.userData.fl.position.set(0.85, 0.5 + Math.abs(Math.sin(tt * 4)) * 0.5, 0.4);
      const j = wins.indexOf(w); placeShutters(w, j); shut.instanceMatrix.needsUpdate = true;
      if (tt > 5.2) { w.busy = false; w.open = 0; placeShutters(w, j); g.visible = false; s.w = null; } }
  });
  // ======================= CIELO SURREALISTA (extra) =======================
  const th = T.cup.theme; const c = new V3(); S.forEach(s => c.add(s.p)); c.multiplyScalar(1 / N); c.y = 0;
  let Rr = 0; S.forEach(s => Rr = Math.max(Rr, Math.hypot(s.p.x - c.x, s.p.z - c.z)));
  const sky = new THREE.Group(); scene.add(sky); const skySpots = [];
  // globos aerostáticos con forma de fruta / taza de té
  const fruit = kind => { const g = new THREE.Group(); let b;
    if (kind === 'fresa') { b = mesh(new THREE.SphereGeometry(6, 14, 10), toon('#ff4f6f', { rim: 0.6 }), g, [0, 9, 0], null, [1, 1.25, 1]); mesh(new THREE.ConeGeometry(4, 2.5, 7), toon('#5fd05a'), g, [0, 16.5, 0], [Math.PI, 0, 0]); for (let k = 0; k < 10; k++) mesh(new THREE.SphereGeometry(0.4, 5, 4), toon('#fff6a0', { rim: 0 }), g, [Math.cos(k * 2.4) * 5.8, 6 + (k % 4) * 2.2, Math.sin(k * 2.4) * 5.8]); }
    else if (kind === 'sandia') { b = mesh(new THREE.SphereGeometry(6.5, 16, 10), toon('#4fbf5a', { rim: 0.6 }), g, [0, 9, 0], null, [1, 0.95, 1]); mesh(new THREE.SphereGeometry(6.6, 16, 6, 0, 6.28, 0, 0.5), toon('#ff6f8f'), g, [0, 9, 0]); }
    else if (kind === 'naranja') { b = mesh(new THREE.SphereGeometry(6, 14, 10), toon('#ff9f2a', { rim: 0.6 }), g, [0, 9, 0]); mesh(new THREE.SphereGeometry(1.6, 8, 6), toon('#5fd05a'), g, [1.5, 15.2, 0], null, [1.4, 0.4, 0.8]); }
    else if (kind === 'uva') { for (let k = 0; k < 9; k++) mesh(new THREE.SphereGeometry(2.4, 10, 8), toon('#a46fff', { rim: 0.6 }), g, [Math.cos(k * 2.1) * (3 - k * 0.25), 15 - k * 1.3, Math.sin(k * 2.1) * (3 - k * 0.25)]); b = g.children[0]; }
    else { // taza de té voladora
      b = mesh(new THREE.CylinderGeometry(6, 4, 6, 16, 1, true), toon('#ffffff', { rim: 0.5, side: THREE.DoubleSide }), g, [0, 9, 0]); mesh(new THREE.TorusGeometry(2.2, 0.6, 6, 12), toon('#ffffff'), g, [6.3, 9, 0]); mesh(new THREE.CylinderGeometry(7.5, 7.5, 0.6, 18), toon('#ff9cc8'), g, [0, 5.8, 0]); mesh(new THREE.CylinderGeometry(5.7, 5.7, 0.3, 16), toon('#c08a5a'), g, [0, 11, 0]); }
    eyesOn(b, 5.6, 4.5, 0.05);
    for (const sd of [-1, 1]) mesh(new THREE.CylinderGeometry(0.06, 0.06, 4, 3), toon('#ffffff', { rim: 0 }), g, [sd * 1.4, 1.8, 0]);
    mesh(new THREE.CylinderGeometry(1.8, 1.3, 1.8, 10), toon('#c08a5a'), g, [0, -0.6, 0]); const pas = mesh(new THREE.SphereGeometry(0.8, 8, 6), toon(COLS[Math.floor(rnd() * 8)]), g, [0, 0.9, 0]);
    return flatten(nofog(g), { fog: false }); };
  const fruits = { candy: ['fresa', 'sandia', 'taza'], sunflower: ['naranja', 'uva', 'taza', 'fresa'], ice: ['taza', 'uva'], storm: ['taza', 'naranja'] }[th] || ['taza'];
  const balloons = fruits.map((k, n) => { const g = fruit(k); sky.add(g); if (!n) skySpots.push(['globo-fruta', g]); return [g, n]; });
  upd.push(t => balloons.forEach(([g, n]) => { const a = -t * 0.035 + n * 2.2; g.position.set(c.x + Math.cos(a) * (Rr * 0.55 + n * 22), 58 + n * 14 + Math.sin(t * 0.6 + n) * 4, c.z + Math.sin(a) * (Rr * 0.55 + n * 22)); g.rotation.y = t * 0.2 + n; }));
  // aviones de papel (instanciados)
  { const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 1.6, -1.1, 0.15, -1, 0, -0.3, -1, 0, 0, 1.6, 0, -0.3, -1, 1.1, 0.15, -1], 3)); pg.computeVertexNormals();
    const n = hi ? 26 : 16, im = new THREE.InstancedMesh(pg, toon('#ffffff', { rim: 0.2, side: THREE.DoubleSide, emissive: night ? '#9ff5ff' : '#000000', ei: night ? 0.5 : 1 }), n); im.material.fog = false; im.frustumCulled = false; sky.add(im);
    const pp = Array.from({ length: n }, (_, k) => ({ r: Rr * (0.3 + rnd() * 0.7), h: 28 + rnd() * 40, sp: (0.08 + rnd() * 0.08) * (k % 2 ? 1 : -1), ph: rnd() * 6.28, c: COLS[k % 8] }));
    pp.forEach((q, k) => im.setColorAt(k, new THREE.Color(night ? '#ffffff' : q.c))); im.instanceColor.needsUpdate = true;
    upd.push(t => { pp.forEach((q, k) => { const a = t * q.sp + q.ph, y = q.h + Math.sin(t * 0.9 + k) * 5; _p.set(c.x + Math.cos(a) * q.r, y, c.z + Math.sin(a) * q.r); const yaw = Math.atan2(-Math.sin(a) * Math.sign(q.sp), Math.cos(a) * Math.sign(q.sp));
      _m.compose(_p, _q.setFromEuler(_e.set(Math.cos(t * 0.9 + k) * 0.3, yaw, Math.sin(t * 1.3 + k) * 0.5)), _s.set(1.6, 1.6, 1.6)); im.setMatrixAt(k, _m); }); im.instanceMatrix.needsUpdate = true; });
    skySpots.push(['aviones de papel', im]); }
  // banco de peces voladores (instanciado)
  if (th !== 'storm') { const fg = new THREE.ConeGeometry(0.7, 2.6, 6); fg.rotateX(Math.PI / 2); const n = hi ? 46 : 28;
    const im = new THREE.InstancedMesh(fg, toon(th === 'ice' ? '#9fe8ff' : th === 'sunflower' ? '#ffb36b' : '#ff9cc8', { rim: 0.8, emissive: '#ffffff', ei: 0.15 }), n); im.material.fog = false; im.frustumCulled = false; sky.add(im);
    const off = Array.from({ length: n }, () => [(rnd() - 0.5) * 18, (rnd() - 0.5) * 8, (rnd() - 0.5) * 18, rnd() * 6]);
    upd.push(t => { const a = t * 0.07 + 1, cx = c.x + Math.cos(a) * Rr * 0.7, cz = c.z + Math.sin(a) * Rr * 0.7, cy = 40 + Math.sin(t * 0.5) * 10, yaw = Math.atan2(-Math.sin(a), Math.cos(a));
      off.forEach((o, k) => { _p.set(cx + o[0] + Math.sin(t * 2 + o[3]) * 1.5, cy + o[1] + Math.sin(t * 3 + o[3]) * 1.2, cz + o[2]); _m.compose(_p, _q.setFromEuler(_e.set(0, yaw + Math.sin(t * 6 + o[3]) * 0.25, 0)), _s.set(1, 1, 1)); im.setMatrixAt(k, _m); }); im.instanceMatrix.needsUpdate = true; });
    skySpots.push(['peces voladores', im]); }
  // tren volando sobre raíles de arcoíris
  if (th !== 'sunflower') { const pts = []; for (let k = 0; k < 24; k++) { const a = k / 24 * 6.28; pts.push(new V3(c.x + Math.cos(a) * Rr * 1.15, 105 + Math.sin(a * 3) * 18, c.z + Math.sin(a) * Rr * 1.15)); }
    const crv = new THREE.CatmullRomCurve3(pts, true); const tube = new THREE.TubeGeometry(crv, 160, 2.2, 6, true);
    const cols = []; const rb = ['#ff5f6f', '#ffb34a', '#ffe066', '#7fe07a', '#5fb8ff', '#b98aff']; const pc = tube.attributes.position.count; for (let i = 0; i < pc; i++) { const cc = new THREE.Color(rb[i % 7 % 6]); cols.push(cc.r, cc.g, cc.b); }
    tube.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const rail = new THREE.Mesh(tube, toon('#ffffff', { vc: true, rim: 0.3, emissive: night ? '#ffffff' : '#000000', ei: night ? 0.35 : 1 })); rail.material.fog = false; sky.add(rail);
    const cars = []; for (let k = 0; k < 5; k++) { const g = new THREE.Group(); const col = k ? COLS[k] : '#ff6f8f';
      const b = mesh(new THREE.BoxGeometry(5, 4, 8), toon(col, { rim: 0.5 }), g, [0, 3.5, 0]); if (!k) { mesh(new THREE.CylinderGeometry(1, 1.4, 3, 8), toon('#5a3a6e'), g, [0, 7, 2]); eyesOn(b, 4.05, 3, 0.1); }
      for (let w = 0; w < 4; w++) mesh(new THREE.BoxGeometry(1.2, 1.2, 0.2), toon('#fff6a0', { emissive: '#fff2a0', ei: night ? 0.9 : 0.2 }), g, [w % 2 ? 2.55 : -2.55, 4.2, w < 2 ? -1.8 : 1.8], [0, Math.PI / 2, 0]);
      flatten(nofog(g), { fog: false, emissive: night ? 0.15 : 0 }); sky.add(g); cars.push(g); }
    let tu = 0; upd.push((t, dt) => { tu = (tu + dt * 0.012) % 1; cars.forEach((g, k) => { const u = (tu - k * 0.012 + 1) % 1; crv.getPointAt(u, _p); g.position.copy(_p); g.position.y += 1.5; crv.getPointAt((u + 0.003) % 1, _v); g.lookAt(_v.x, _v.y + 1.5, _v.z); }); });
    skySpots.push(['tren arcoíris', cars[0]]); }
  // planetas con anillos (noche y puerto)
  if (th === 'storm' || th === 'ice') for (let k = 0; k < 2; k++) { const g = new THREE.Group(); const col = k ? '#ffb36b' : '#7f9fff';
    const pl = mesh(new THREE.SphereGeometry(30, 20, 14), toon(col, { rim: 0.6, emissive: col, ei: 0.25 }), g); mesh(new THREE.TorusGeometry(48, 3, 4, 40), toon('#ffd0f0', { rim: 0, emissive: '#ff9fe0', ei: 0.3 }), g, [0, 0, 0], [1.3, 0, 0.3], [1, 1, 0.25]);
    if (!k) eyesOn(pl, 28, 22, 0.1); g.position.set(c.x + (k ? 420 : -300), k ? 210 : 170, c.z + (k ? 260 : -480)); g.lookAt(c.x, 40, c.z); flatten(nofog(g), { fog: false, emissive: 0.2 }); sky.add(g); upd.push(t => { g.rotation.z = Math.sin(t * 0.2 + k) * 0.1; }); if (!k) skySpots.push(['planeta', g]); }
  // medusas de gelatina flotando (Puerto Helado) / donuts gigantes (Gominola)
  if (th === 'ice') { const js = []; for (let k = 0; k < (hi ? 6 : 4); k++) { const g = new THREE.Group(); const col = ['#ff9fe0', '#9ff5ff', '#d9b2ff'][k % 3];
      mesh(new THREE.SphereGeometry(4, 14, 8, 0, 6.28, 0, Math.PI / 2), toon(col, { opacity: 0.75, rim: 1, emissive: col, ei: 0.4 }), g); const tent = []; for (let j = 0; j < 5; j++) tent.push(mesh(new THREE.CapsuleGeometry(0.3, 5, 3, 5), toon(col, { opacity: 0.7, emissive: col, ei: 0.4 }), g, [Math.cos(j * 1.26) * 2.4, -3, Math.sin(j * 1.26) * 2.4]));
      nofog(g); sky.add(g); js.push([g, tent, k]); }
    upd.push(t => js.forEach(([g, tent, k]) => { const a = t * 0.05 + k * 1.05; g.position.set(c.x + Math.cos(a) * Rr * (0.4 + k * 0.1), 34 + k * 7 + Math.sin(t * 1.2 + k) * 4, c.z + Math.sin(a) * Rr * (0.4 + k * 0.1)); const pul = 1 + Math.sin(t * 2.4 + k) * 0.12; g.scale.set(pul, 1 / pul, pul); tent.forEach((m, j) => m.rotation.z = Math.sin(t * 3 + j + k) * 0.3); }));
    skySpots.push(['medusas', js[0][0]]); }
  if (th === 'candy' || th === 'storm') { const ds = []; for (let k = 0; k < 3; k++) { const g = new THREE.Group(); mesh(new THREE.TorusGeometry(9, 4.2, 10, 24), toon('#e8b47a'), g); mesh(new THREE.TorusGeometry(9, 4.4, 10, 24, Math.PI * 2), toon(['#ff8fd0', '#9ff5ff', '#ffe066'][k], { rim: 0.5, emissive: th === 'storm' ? '#ff5fd2' : '#000000', ei: 0.3 }), g, [0, 0, 1.4], null, [1, 1, 0.6]);
      flatten(nofog(g), { fog: false }); sky.add(g); ds.push([g, k]); }
    upd.push(t => ds.forEach(([g, k]) => { const a = -t * 0.03 + k * 2.1; g.position.set(c.x + Math.cos(a) * Rr * 0.95, 80 + k * 20 + Math.sin(t * 0.4 + k) * 6, c.z + Math.sin(a) * Rr * 0.95); g.rotation.set(1.1 + Math.sin(t * 0.3 + k) * 0.3, t * 0.2, t * 0.15); }));
    skySpots.push(['donuts gigantes', ds[0][0]]); }
  const edi = addEdificios(T, Q, scene); upd.push((t, dt, R) => edi.update(t, dt, R));
  return { edi, fans: nF, windows: nW, stats, skySpots, pool, update(t, dt, R) { for (const u of upd) u(t, dt, R); } };
}
