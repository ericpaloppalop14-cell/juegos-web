// ======================================================================
//  MOCHI RACERS v14 · dos copas nuevas, surrealistas pero con su lógica
//  ocean: «Océano Volador». El mar se ha subido al cielo: ballenas con un faro en el lomo,
//         medusas-farolillo, islotes de fondo marino flotando, burbujas que suben y arcos de concha.
//  book:  «Biblioteca Infinita». Una biblioteca sin paredes: libros que vuelan aleteando, lápices
//         gigantes como rascacielos, estanterías a la deriva, aviones de papel, letras sueltas y
//         la pista pasa bajo arcos de página. Una lámpara de lectura hace de sol.
//  Todo es decorado (sin colisión) y queda fuera de la calzada o muy por encima.
// ======================================================================
import * as THREE from 'three';
import { toon } from './gfx.js';
const V3 = THREE.Vector3;
const G = {}; const geo = (n, f) => { if (!G[n]) { G[n] = f(); G[n]._shared = true; } return G[n]; };
const sph = () => geo('s', () => new THREE.SphereGeometry(1, 18, 12)), sphL = () => geo('sl', () => new THREE.SphereGeometry(1, 10, 7));
const cyl = () => geo('c', () => new THREE.CylinderGeometry(1, 1, 1, 18)), cone = () => geo('k', () => new THREE.ConeGeometry(1, 1, 16));
const box = () => geo('b', () => new THREE.BoxGeometry(1, 1, 1)), dome = () => geo('d', () => new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2));
const arc = () => geo('a', () => new THREE.TorusGeometry(1, 0.07, 10, 40, Math.PI)), ring = () => geo('r', () => new THREE.TorusGeometry(1, 0.12, 8, 30));
const M = (g, c, o, parent, pos, scl, rot) => { const m = new THREE.Mesh(g, toon(c, o)); if (pos) m.position.set(...pos); if (scl != null) Array.isArray(scl) ? m.scale.set(...scl) : m.scale.setScalar(scl); if (rot) m.rotation.set(...rot); if (parent) parent.add(m); return m; };

// --------- piezas reutilizables (también para los trofeos) ---------
export function makeWhale(lamp = true) {
  const g = new THREE.Group();
  M(sph(), '#5f8fe8', { rim: 0.6 }, g, [0, 0, 0], [2.2, 1.5, 4.2]);
  M(sph(), '#e6f3ff', { rim: 0.3 }, g, [0, -0.55, 0.4], [1.8, 1.0, 3.6]); // barriga
  for (let i = 0; i < 4; i++) M(box(), '#c9defa', { rim: 0 }, g, [0, -1.05 + i * 0.02, 1.6 - i * 0.9], [1.6 - i * 0.15, 0.08, 0.12]); // pliegues
  const tail = new THREE.Group(); tail.position.set(0, 0.3, -4.1); g.add(tail);
  for (const s of [-1, 1]) M(sph(), '#5f8fe8', { rim: 0.6 }, tail, [s * 1.0, 0.1, -0.6], [1.3, 0.18, 0.7], [0, s * 0.5, 0]);
  const fins = []; for (const s of [-1, 1]) { const f = M(sph(), '#4f7fd8', { rim: 0.5 }, g, [s * 2.0, -0.6, 1.0], [1.2, 0.15, 0.6], [0, 0, s * 0.5]); fins.push(f); }
  for (const s of [-1, 1]) { M(sph(), '#ffffff', { rim: 0 }, g, [s * 1.55, 0.25, 2.9], 0.36); M(sph(), '#2a1838', { rim: 0 }, g, [s * 1.7, 0.25, 3.05], 0.2); M(sph(), '#ff8fb8', { opacity: 0.6, rim: 0 }, g, [s * 1.5, -0.25, 3.25], [0.4, 0.2, 0.1]); }
  M(geo('sm', () => new THREE.TorusGeometry(1, 0.2, 6, 14, Math.PI)), '#2a1838', { rim: 0 }, g, [0, -0.25, 4.1], 0.35, [0, 0, Math.PI]);
  let beam = null;
  if (lamp) { // faro de rayas sobre el lomo
    const lh = new THREE.Group(); lh.position.set(0, 1.3, -0.2); g.add(lh);
    for (let i = 0; i < 4; i++) M(cyl(), i % 2 ? '#ffffff' : '#ff5f7a', { rim: 0.3 }, lh, [0, i * 0.55 + 0.27, 0], [0.42 - i * 0.04, 0.55, 0.42 - i * 0.04]);
    M(cyl(), '#fff3a8', { emissive: '#ffd24a', ei: 0.9, rim: 0 }, lh, [0, 2.55, 0], [0.34, 0.5, 0.34]);
    M(cone(), '#ff5f7a', { rim: 0.3 }, lh, [0, 3.1, 0], [0.45, 0.6, 0.45]);
    beam = new THREE.Mesh(geo('beam', () => { const c = new THREE.ConeGeometry(1.4, 9, 16, 1, true); c.translate(0, -4.5, 0); c.rotateZ(Math.PI / 2); return c; }), new THREE.MeshBasicMaterial({ color: '#fff2a0', transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    beam.position.y = 2.55; lh.add(beam);
  }
  // chorro de agua: tres gotas
  const spout = new THREE.Group(); spout.position.set(0, 1.5, 1.8); g.add(spout);
  for (let i = 0; i < 3; i++) M(sph(), '#bff4ff', { opacity: 0.8, rim: 0.6 }, spout, [(i - 1) * 0.35, 0.3 + i * 0.25, 0], 0.22);
  g.userData = { tail, fins, beam, spout };
  return g;
}
export function animWhale(g, t, ph = 0) { const u = g.userData; u.tail.rotation.x = Math.sin(t * 2 + ph) * 0.35; u.fins.forEach((f, i) => f.rotation.x = Math.sin(t * 2.4 + ph + i) * 0.4); if (u.beam) u.beam.rotation.y = t * 1.2; u.spout.position.y = 1.5 + ((t * 0.8 + ph) % 1) * 1.2; u.spout.scale.setScalar(1 - ((t * 0.8 + ph) % 1) * 0.6); }

export function makeBook(cover = '#c0392b', open = 1) {
  const g = new THREE.Group();
  const spine = M(cyl(), cover, { rim: 0.3 }, g, [0, 0, 0], [0.18, 2.6, 0.18], [Math.PI / 2, 0, 0]);
  const wings = [];
  for (const s of [-1, 1]) { const w = new THREE.Group(); g.add(w); wings.push(w);
    M(box(), cover, { rim: 0.4 }, w, [s * 1.0, -0.02, 0], [2.0, 0.08, 2.6]);
    M(box(), '#fffaf0', { rim: 0.1 }, w, [s * 0.95, 0.08, 0], [1.85, 0.14, 2.45]);
    for (let k = 0; k < 4; k++) M(box(), '#c8b89a', { rim: 0 }, w, [s * 0.95, 0.16, -0.8 + k * 0.45], [1.4, 0.01, 0.06]); // renglones
    M(box(), '#ffd36b', { rim: 0.2, emissive: '#ffb030', ei: 0.2 }, w, [s * 1.9, 0, 0], [0.08, 0.1, 2.62]); }
  g.userData = { wings, open };
  return g;
}
export function animBook(g, t, ph = 0, amp = 0.55) { const a = 0.35 + Math.sin(t * 5 + ph) * amp; g.userData.wings[0].rotation.z = -a; g.userData.wings[1].rotation.z = a; }

// adorno que corona el trofeo de cada copa nueva (en el menú y en el podio)
export function makeTopper(kind) {
  const g = new THREE.Group();
  if (kind === 'whale') { const w = makeWhale(true); w.scale.setScalar(0.13); w.rotation.y = 0.55; w.position.y = 0.45; g.add(w); g.userData.anim = t => { animWhale(w, t); w.position.y = 0.45 + Math.sin(t * 2) * 0.08; };
    for (let i = 0; i < 4; i++) { const b = M(sph(), '#dff8ff', { opacity: 0.65, rim: 0.9 }, g, [0, 0, 0], 0.08 + i * 0.02); const p0 = i * 1.7; const f = g.userData.anim; g.userData.anim = t => { f(t); const k = (t * 0.5 + p0) % 1; b.position.set(Math.sin(p0 * 3) * 0.6, 0.2 + k * 1.6, Math.cos(p0 * 3) * 0.3); b.scale.setScalar((0.08 + i * 0.02) * (1 - k * 0.4)); }; } }
  else { const b = makeBook('#7a3cc2'); b.scale.setScalar(0.24); b.position.y = 0.4; b.rotation.x = 1.15; g.add(b);
    const quill = new THREE.Group(); quill.position.set(0.3, 0.75, 0); g.add(quill); M(cone(), '#ffffff', { rim: 0.5 }, quill, [0, 0.45, 0], [0.16, 0.9, 0.05]); M(cyl(), '#ffd36b', { rim: 0.3 }, quill, [0, -0.1, 0], [0.025, 0.4, 0.025]);
    g.userData.anim = t => { animBook(b, t, 0, 0.25); b.position.y = 0.4 + Math.sin(t * 2.4) * 0.06; quill.rotation.z = -0.4 + Math.sin(t * 3) * 0.25; }; }
  return g;
}

function letterTex(ch, col) { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'); x.font = '700 52px Fredoka, Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 6; x.strokeStyle = '#3a2050'; x.strokeText(ch, 32, 35); x.fillStyle = col; x.fillText(ch, 32, 35); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; }

export function addWonder(T, Q, rnd) {
  const { S, N, cup, group } = T, hi = !!Q.hi, look = cup.look, anim = [], n = hi ? 1 : 0.6;
  const W = new THREE.Group(); group.add(W);
  const spot = (minD, maxD, dy) => { const s = S[Math.floor(rnd() * N)], side = rnd() < 0.5 ? -1 : 1, d = s.w + minD + rnd() * (maxD - minD); return new V3(s.p.x + s.right.x * d * side, s.p.y + dy, s.p.z + s.right.z * d * side); };
  const center = new V3(); for (const s of S) center.add(s.p); center.multiplyScalar(1 / N);
  const gate = (tt, build) => { const i = Math.floor(tt * N) % N, s = S[i]; const g = new THREE.Group(); g.position.copy(s.p); g.rotation.y = Math.atan2(s.fl.x, s.fl.z); W.add(g); build(g, s.w + 3.5); return g; };
  const gates = [0.08, 0.28, 0.56, 0.84];
  if (look === 'ocean') {
    // ballenas-faro que nadan en círculos enormes alrededor del circuito
    const whales = [];
    for (let i = 0; i < Math.round(5 * n) + 1; i++) { const w = makeWhale(true); const s = 2.4 + rnd() * 2.4; w.scale.setScalar(s); W.add(w); whales.push({ w, R: 230 + rnd() * 160, y: center.y + 40 + rnd() * 70, sp: (0.025 + rnd() * 0.02) * (i % 2 ? 1 : -1), a0: rnd() * 6.28, ph: rnd() * 6 }); }
    anim.push(t => { for (const o of whales) { const a = o.a0 + t * o.sp; o.w.position.set(center.x + Math.cos(a) * o.R, o.y + Math.sin(t * 0.4 + o.ph) * 5, center.z + Math.sin(a) * o.R); o.w.rotation.y = -a + (o.sp > 0 ? Math.PI : 0); animWhale(o.w, t, o.ph); } });
    // medusas-farolillo: cúpula translúcida que brilla, tentáculos que ondulan
    const jcol = ['#ff9cd8', '#9fe8ff', '#ffe08a', '#c8a8ff'];
    for (let i = 0; i < 22 * n; i++) { const g = new THREE.Group(), c = jcol[i % 4], s = 1.6 + rnd() * 2.2; g.position.copy(spot(8, 70, 8 + rnd() * 26)); g.scale.setScalar(s); W.add(g);
      M(dome(), c, { opacity: 0.62, rim: 1.1, emissive: c, ei: 0.45 }, g, [0, 0, 0], [1.2, 1.0, 1.2]);
      M(sphL(), '#ffffff', { emissive: c, ei: 0.9, rim: 0 }, g, [0, 0.35, 0], 0.4);
      const tents = []; for (let k = 0; k < 5; k++) { const a = k * 1.256; const tg = new THREE.Group(); tg.position.set(Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7); g.add(tg); M(cyl(), c, { opacity: 0.7, rim: 0.6 }, tg, [0, -1.0, 0], [0.07, 2.0, 0.07]); tents.push(tg); }
      const y0 = g.position.y, ph = rnd() * 6; anim.push(t => { const p = Math.sin(t * 1.6 + ph); g.position.y = y0 + p * 1.6; g.scale.y = s * (1 + p * 0.08); tents.forEach((tg, k) => { tg.rotation.x = Math.sin(t * 2.2 + ph + k) * 0.35; tg.rotation.z = Math.cos(t * 1.8 + ph + k) * 0.3; }); }); }
    // islotes de fondo marino flotando: arena, corales, conchas, un ancla y un cofre
    const coral = ['#ff7f9f', '#ffb36b', '#c86fff', '#5fe8c8'];
    for (let i = 0; i < 16 * n; i++) { const g = new THREE.Group(), r = 6 + rnd() * 12; g.position.copy(spot(25, 170, -16 + rnd() * 50)); W.add(g);
      M(cyl(), '#ffe3b0', { rim: 0.2 }, g, [0, 0, 0], [r, 1.6, r]); M(cone(), '#d9a96e', { rim: 0.2 }, g, [0, -r * 0.65 - 0.8, 0], [r * 0.95, r * 1.3, r * 0.95], [Math.PI, 0, 0]);
      for (let k = 0; k < 4; k++) { const a = rnd() * 6.28, d = rnd() * r * 0.7, h = 2 + rnd() * 5, c = coral[(i + k) % 4]; const cg = new THREE.Group(); cg.position.set(Math.cos(a) * d, 0.8, Math.sin(a) * d); g.add(cg);
        M(cyl(), c, { rim: 0.5 }, cg, [0, h / 2, 0], [0.35, h, 0.35]); for (let b = 0; b < 3; b++) M(cyl(), c, { rim: 0.5 }, cg, [Math.cos(b * 2.1) * 0.6, h * (0.45 + b * 0.15), Math.sin(b * 2.1) * 0.6], [0.22, h * 0.45, 0.22], [Math.sin(b * 2.1) * 0.6, 0, -Math.cos(b * 2.1) * 0.6]); M(sphL(), c, { rim: 0.6 }, cg, [0, h, 0], 0.45); }
      if (i % 3 === 0) { M(box(), '#a0612f', { rim: 0.2 }, g, [r * 0.3, 1.5, -r * 0.3], [2.2, 1.4, 1.5]); M(box(), '#ffd24a', { rim: 0.3, emissive: '#ffb000', ei: 0.4 }, g, [r * 0.3, 2.3, -r * 0.3], [2.3, 0.25, 1.6]); }
      const y0 = g.position.y, ph = rnd() * 6; anim.push(t => { g.position.y = y0 + Math.sin(t * 0.45 + ph) * 2.2; }); }
    // arcos de concha sobre la pista (muy por encima, sin colisión)
    for (const tt of gates) gate(tt, (g, R) => { const a = M(arc(), '#ffd6e6', { rim: 0.7, emissive: '#ff9cc8', ei: 0.15 }, g, [0, 0, 0], [R, R, R * 1.2]);
      for (let k = 0; k <= 8; k++) { const q = k / 8 * Math.PI; M(sph(), k % 2 ? '#ffffff' : '#ffe8f2', { rim: 0.8 }, g, [Math.cos(q) * R, Math.sin(q) * R, 0], 0.9); }
      M(sph(), '#bff4ff', { rim: 1, emissive: '#7fe0ff', ei: 0.5 }, g, [0, R + 0.6, 0], 1.3); });
    // burbujas que suben sin parar (una sola malla instanciada)
    const NB = hi ? 160 : 80, bub = new THREE.InstancedMesh(sphL(), toon('#e8fbff', { opacity: 0.55, rim: 1.2, nocache: true }), NB); bub.frustumCulled = false; W.add(bub);
    const bd = []; for (let i = 0; i < NB; i++) { const p = spot(4, 120, 0); bd.push([p.x, p.y - 10, p.z, 0.4 + rnd() * 1.4, rnd() * 40, 2 + rnd() * 3]); }
    const mm = new THREE.Matrix4(), q0 = new THREE.Quaternion(), sv = new V3(), pv = new V3();
    anim.push(t => { for (let i = 0; i < NB; i++) { const b = bd[i], k = ((t * b[5] + b[4]) % 40); pv.set(b[0] + Math.sin(t + i) * 1.2, b[1] + k, b[2]); sv.setScalar(b[3] * (1 - k / 60)); mm.compose(pv, q0, sv); bub.setMatrixAt(i, mm); } bub.instanceMatrix.needsUpdate = true; });
  } else {
    // lámpara de lectura gigante que hace de sol
    { const g = new THREE.Group(); g.position.set(center.x + 260, center.y + 150, center.z - 320); g.scale.setScalar(9); W.add(g);
      M(cyl(), '#3a7a5a', { rim: 0.4 }, g, [0, 0, 0], [0.12, 6, 0.12], [0, 0, 0.4]);
      const sh = M(cone(), '#2f9a6a', { rim: 0.5, side: THREE.DoubleSide }, g, [-1.6, 3.2, 0], [2.2, 1.8, 2.2]);
      M(sph(), '#fff6c8', { emissive: '#ffe08a', ei: 1, rim: 0 }, g, [-1.6, 2.4, 0], 1.0); }
    // libros que vuelan aleteando, en bandadas
    const covers = ['#c0392b', '#2e86de', '#27ae60', '#8e44ad', '#f39c12', '#e84393'], flock = [];
    for (let i = 0; i < Math.round(26 * n); i++) { const b = makeBook(covers[i % 6]); const s = 1.3 + rnd() * 1.6; b.scale.setScalar(s); W.add(b); flock.push({ b, R: 60 + rnd() * 200, y: center.y + 15 + rnd() * 50, sp: (0.05 + rnd() * 0.06) * (i % 3 ? 1 : -1), a0: rnd() * 6.28, ph: rnd() * 6 }); }
    anim.push(t => { for (const o of flock) { const a = o.a0 + t * o.sp; o.b.position.set(center.x + Math.cos(a) * o.R, o.y + Math.sin(t * 1.3 + o.ph) * 3, center.z + Math.sin(a) * o.R); o.b.rotation.y = -a + (o.sp > 0 ? 0 : Math.PI); o.b.rotation.z = Math.sin(t + o.ph) * 0.15; animBook(o.b, t, o.ph); } });
    // lápices y ceras gigantes como rascacielos
    const pc = ['#ffd24a', '#ff6f91', '#5fd0ff', '#8be07a', '#c8a8ff'];
    for (let i = 0; i < 18 * n; i++) { const g = new THREE.Group(), h = 30 + rnd() * 60, r = 2.5 + rnd() * 2; g.position.copy(spot(24, 150, -40)); g.rotation.set((rnd() - 0.5) * 0.3, rnd() * 6, (rnd() - 0.5) * 0.3); W.add(g); const c = pc[i % 5];
      M(geo('hex', () => new THREE.CylinderGeometry(1, 1, 1, 6)), c, { rim: 0.4 }, g, [0, h / 2, 0], [r, h, r]);
      M(geo('hexc', () => new THREE.CylinderGeometry(0.02, 1, 1, 6)), '#ffe2b8', { rim: 0.3 }, g, [0, h + r * 1.1, 0], [r, r * 2.2, r]);
      M(cone(), '#3a2a3a', { rim: 0.2 }, g, [0, h + r * 2.0, 0], [r * 0.3, r * 0.6, r * 0.3]);
      if (i % 2) { M(cyl(), '#c9ccd6', { rim: 0.6 }, g, [0, -0.6, 0], [r * 1.02, 2.2, r * 1.02]); M(cyl(), '#ff9cb8', { rim: 0.3 }, g, [0, -2.4, 0], [r * 1.02, 2.0, r * 1.02]); } }
    // estanterías a la deriva, con libros de colores
    for (let i = 0; i < 9 * n; i++) { const g = new THREE.Group(); g.position.copy(spot(30, 170, 5 + rnd() * 45)); g.rotation.set((rnd() - 0.5) * 0.6, rnd() * 6, (rnd() - 0.5) * 0.8); g.scale.setScalar(1.5 + rnd()); W.add(g);
      M(box(), '#8a5a3a', { rim: 0.2 }, g, [0, 0, 0], [10, 12, 0.4]); for (const x of [-5, 5]) M(box(), '#a06a44', { rim: 0.2 }, g, [x, 0, 1], [0.5, 12, 2.4]);
      for (let sh = 0; sh < 4; sh++) { const y = -5.5 + sh * 3.2; M(box(), '#a06a44', { rim: 0.2 }, g, [0, y, 1], [10, 0.35, 2.4]); let x = -4.5; while (x < 4.3) { const w = 0.4 + rnd() * 0.5, hh = 1.8 + rnd() * 0.9; M(box(), covers[Math.floor(rnd() * 6)], { rim: 0.3 }, g, [x + w / 2, y + hh / 2 + 0.2, 1], [w, hh, 1.8], [0, 0, x > 3 ? -0.3 : 0]); x += w + 0.05; } }
      const ph = rnd() * 6, y0 = g.position.y; anim.push(t => { g.position.y = y0 + Math.sin(t * 0.35 + ph) * 3; g.rotation.y += 0.0008; }); }
    // aviones de papel que dan vueltas de campana
    for (let i = 0; i < 12 * n; i++) { const p = new THREE.Group(); W.add(p); const pl = new THREE.Mesh(geo('plane', () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 1.6, -1.1, 0.1, -1, 0, -0.3, -1, 0, 0, 1.6, 0, -0.3, -1, 1.1, 0.1, -1], 3)); g.computeVertexNormals(); return g; }), toon('#ffffff', { rim: 0.4, side: THREE.DoubleSide })); pl.scale.setScalar(2.2); p.add(pl);
      const o = { R: 25 + rnd() * 50, c: spot(10, 60, 14 + rnd() * 20), sp: 0.5 + rnd() * 0.4, ph: rnd() * 6 }; anim.push(t => { const a = t * o.sp + o.ph; p.position.set(o.c.x + Math.cos(a) * o.R, o.c.y + Math.sin(a * 2) * 6, o.c.z + Math.sin(a) * o.R); p.rotation.set(Math.cos(a * 2) * 0.4, -a, Math.sin(a) * 0.6); }); }
    // letras sueltas que flotan como polen
    const L = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ?!&', lc = ['#ffd24a', '#ff8fc0', '#7fd8ff', '#b9f27a', '#ffffff'];
    for (let i = 0; i < 46 * n; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: letterTex(L[i % L.length], lc[i % 5]), transparent: true, depthWrite: false })); sp.scale.setScalar(2 + rnd() * 2.5); sp.position.copy(spot(4, 60, 5 + rnd() * 18)); W.add(sp); const y0 = sp.position.y, ph = rnd() * 6; anim.push(t => { sp.position.y = y0 + Math.sin(t * 0.9 + ph) * 2; sp.material.rotation = Math.sin(t * 0.7 + ph) * 0.5; }); }
    // arcos de página: una hoja gigante que se curva por encima de la pista
    for (const tt of gates) gate(tt, (g, R) => { const pg = new THREE.Mesh(geo('pageArc', () => new THREE.CylinderGeometry(1, 1, 1, 30, 1, true, -Math.PI / 2, Math.PI)), toon('#fffaf0', { rim: 0.3, side: THREE.DoubleSide })); pg.scale.set(R, 3.2, R); pg.rotation.x = Math.PI / 2; g.add(pg);
      for (let k = 1; k < 8; k++) { const q = k / 8 * Math.PI; M(box(), '#c8b89a', { rim: 0 }, g, [Math.cos(q) * (R - 0.1), Math.sin(q) * (R - 0.1), 0], [1.6, 0.05, 2.6], [0, 0, q + Math.PI / 2]); }
      M(box(), '#c0392b', { rim: 0.4, emissive: '#ff4040', ei: 0.15 }, g, [0, R + 0.1, 0], [3, 0.6, 3.4]); });
  }
  T.anims.push((t, dt) => { for (const f of anim) f(t, dt); });
}
