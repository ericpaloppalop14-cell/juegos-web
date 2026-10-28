// v47: más detalle y accesorios locos para TODOS los pilotos (solo el modelo 3D del piloto; mismo cuerpo, mismos controles).
// Los 5 nuevos (Pipoca, Fresi, Pulpi, Dinito, Lunita) llevan cejas expresivas, brillos, texturas y 4-5 accesorios con animación leve;
// los otros 18 llevan uno o dos accesorios propios. Geometrías y materiales compartidos y poco poligonales (móvil).
import * as THREE from 'three';
import { tmat, rbox, capsule, torus, ctex, grp as G, gold } from './premium.js';
const SH = g => (g._shared = true, g);
const rb = (...a) => SH(rbox(...a)), cap = (...a) => SH(capsule(...a)), tr = (...a) => SH(torus(...a));
const lerp = (a, b, k) => a + (b - a) * k, pulse = (t, f, ph = 0) => 0.5 + 0.5 * Math.sin(t * f + ph);

// ---------- texturas por código (pequeñas y cacheadas) ----------
const TX = {
  clap: () => ctex('v47clap', 128, 32, (x, w, h) => { x.fillStyle = '#25202e'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; for (let i = -2; i < 8; i++) { x.beginPath(); x.moveTo(i * 20, h); x.lineTo(i * 20 + 11, h); x.lineTo(i * 20 + 27, 0); x.lineTo(i * 20 + 16, 0); x.fill(); } }),
  board: () => ctex('v47board', 128, 96, (x, w, h) => { x.fillStyle = '#2b2636'; x.fillRect(0, 0, w, h); x.strokeStyle = '#fff'; x.lineWidth = 3; x.strokeRect(5, 5, w - 10, h - 10); x.fillStyle = '#fff'; x.font = 'bold 20px sans-serif'; x.fillText('POP!', 14, 36); x.font = '14px sans-serif'; x.fillText('TOMA 1', 14, 62); x.fillText('★ ★ ★', 14, 84); }),
  stripes: (a, b, n = 8) => ctex('v47st' + a + b + n, 128, 32, (x, w, h) => { for (let i = 0; i < n; i++) { x.fillStyle = i % 2 ? a : b; x.fillRect(i * w / n, 0, w / n + 1, h); } x.fillStyle = 'rgba(255,255,255,.22)'; x.fillRect(0, 0, w, 7); x.fillStyle = 'rgba(0,0,0,.1)'; x.fillRect(0, h - 7, w, 7); }),
  stars: (c1, c2, trim) => ctex('v47cp' + c1 + c2, 128, 128, (x, w) => { const g = x.createLinearGradient(0, 0, 0, w); g.addColorStop(0, c1); g.addColorStop(1, c2); x.fillStyle = g; x.fillRect(0, 0, w, w); x.fillStyle = trim; x.fillRect(0, 0, w, 8);
    const st = (cx, cy, r) => { x.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fill(); };
    x.fillStyle = '#ffe9a0'; [[30, 36, 9], [88, 52, 12], [52, 88, 8], [104, 108, 7], [18, 110, 6], [70, 20, 5]].forEach(a => st(...a)); x.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 24; i++) x.fillRect((i * 53) % 128, (i * 37) % 128, 2, 2); }),
  dj: () => ctex('v47dj', 64, 64, (x, w) => { const g = x.createRadialGradient(24, 22, 2, 32, 32, 32); g.addColorStop(0, '#fff6c0'); g.addColorStop(0.5, '#ffcf4a'); g.addColorStop(1, '#c88a20'); x.fillStyle = g; x.fillRect(0, 0, w, w); x.fillStyle = '#2a1838'; x.font = 'bold 30px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('DJ', 32, 34); }),
  patch: () => ctex('v47patch', 64, 64, (x, w) => { x.fillStyle = '#ff9f3a'; x.fillRect(0, 0, w, w); x.fillStyle = '#2b3a8a'; x.beginPath(); x.arc(32, 32, 24, 0, 6.3); x.fill(); x.fillStyle = '#ffe066'; x.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 7 : 17; x.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } x.fill(); }),
  anchor: () => ctex('v47anc', 64, 64, (x, w) => { const g = x.createRadialGradient(24, 22, 2, 32, 32, 32); g.addColorStop(0, '#fff6c0'); g.addColorStop(0.6, '#ffcf4a'); g.addColorStop(1, '#c88a20'); x.fillStyle = g; x.fillRect(0, 0, w, w); x.strokeStyle = '#27407a'; x.lineWidth = 5; x.lineCap = 'round'; x.beginPath(); x.moveTo(32, 14); x.lineTo(32, 50); x.moveTo(22, 24); x.lineTo(42, 24); x.moveTo(14, 38); x.quadraticCurveTo(32, 62, 50, 38); x.stroke(); x.beginPath(); x.arc(32, 12, 4, 0, 6.3); x.stroke(); }),
  ermine: () => ctex('v47erm', 128, 128, (x, w) => { x.fillStyle = '#d63a52'; x.fillRect(0, 0, w, w); x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(0, 0, w, 6); x.fillStyle = '#fff'; x.fillRect(0, 0, w, 22); x.fillStyle = '#2a1838'; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(i * 22 + 8, 6); x.lineTo(i * 22 + 12, 18); x.lineTo(i * 22 + 4, 18); x.fill(); } x.fillStyle = '#ffd36a'; for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(20 + i * 22, 60 + (i % 2) * 30, 4, 0, 6.3); x.fill(); } }),
  hearts: () => ctex('v47hrt', 128, 128, (x, w) => { const g = x.createLinearGradient(0, 0, 0, w); g.addColorStop(0, '#ffa0cc'); g.addColorStop(1, '#ff6fa8'); x.fillStyle = g; x.fillRect(0, 0, w, w); x.fillStyle = 'rgba(255,255,255,.5)'; x.font = '26px sans-serif'; x.textAlign = 'center'; for (let i = 0; i < 6; i++) x.fillText('♥', 24 + (i % 3) * 40, 40 + Math.floor(i / 3) * 50); x.fillStyle = '#fff'; x.fillRect(0, 0, w, 7); }),
  glass: () => ctex('v47glass', 64, 64, (x, w) => { const g = x.createLinearGradient(0, 0, w, w); g.addColorStop(0, 'rgba(255,255,255,.85)'); g.addColorStop(0.35, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.35)'); x.fillStyle = g; x.fillRect(0, 0, w, w); }),
  spark: () => ctex('v47spark', 64, 64, (x, w) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 14); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(32, 0); x.quadraticCurveTo(34, 30, 64, 32); x.quadraticCurveTo(34, 34, 32, 64); x.quadraticCurveTo(30, 34, 0, 32); x.quadraticCurveTo(30, 30, 32, 0); x.fill(); }),
  glow: () => ctex('v47glow', 64, 64, (x, w) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); }),
};
const SPM = {}, GLM = {};
const sprMat = (map, c, bl = THREE.AdditiveBlending) => new THREE.SpriteMaterial({ map, color: c, transparent: true, depthWrite: false, blending: bl });
const spark = (par, c, s, p) => { const sp = new THREE.Sprite(SPM[c] || (SPM[c] = sprMat(TX.spark(), c))); sp.scale.setScalar(s); if (p) sp.position.set(...p); par.add(sp); return sp; };
const glow = (par, c, s, p, op = 1) => { const k = c + op; const sp = new THREE.Sprite(GLM[k] || (GLM[k] = Object.assign(sprMat(TX.glow(), c), { opacity: op }))); sp.scale.setScalar(s); if (p) sp.position.set(...p); par.add(sp); return sp; };

// ---------- piezas reutilizables ----------
// tira articulada (capa, bufanda, serpentina): n tramos que cuelgan hacia -y; devuelve los tramos para ondularlos
function strip(par, pos, rot, n, len, w, mat, taper = 0.05) {
  const root = G(par, pos, rot), segs = []; let p = root;
  for (let i = 0; i < n; i++) { const s = G(p, [0, i ? -len : 0, 0]); const mm = new THREE.Mesh(rb(w * (1 - i * taper), len * 1.1, 0.025, 0.01), mat); mm.position.y = -len / 2; s.add(mm); segs.push(s); p = s; }
  return { root, segs };
}
const wave = (segs, t, base, amp, spd, ph = 0) => segs.forEach((s, i) => { s.rotation.x = base + Math.sin(t * spd - i * 0.9 + ph) * amp * (0.35 + i * 0.3); s.rotation.z = Math.sin(t * spd * 0.7 - i * 0.7 + ph) * amp * 0.3; });
// cejas expresivas (solo se ven con los ojos normales); fn(t,k) -> [subida, giro]
function brows(rig, root, mat, A, fn, y = 1.15) {
  const bs = [-1, 1].map(k => { const b = G(rig, [k * 0.37, y, 0.83], [0, k * 0.38, 0]); const mm = new THREE.Mesh(cap(0.03, 0.15), mat); mm.rotation.z = Math.PI / 2; b.add(mm); return b; });
  A.push(t => { const vis = !!(root.userData.eyes && root.userData.eyes[0].visible); bs.forEach((b, i) => { b.visible = vis; if (!vis) return; const k = i ? 1 : -1, [up, rz] = fn(t, k); b.position.y = y + up; b.rotation.z = rz * -k; }); });
}
// pestañas largas
function lashes(m, rig, mat) { for (const k of [-1, 1]) for (let i = 0; i < 3; i++) m(cap(0.014, 0.1), mat, [k * (0.5 + i * 0.05), 1.03 + i * 0.045, 0.85 - i * 0.02], [0, k * 0.38, -k * (0.7 + i * 0.4)]); }
// notas musicales que suben
function notes(rig, A, cols, cx, cz, H) {
  const { mesh, toon, sph, box } = H; const ns = cols.map((c, i) => { const n = G(rig, [cx, 1.5, cz]); const mt = toon(c, { emissive: c, ei: 0.55, rim: 0.4 }); mesh(sph(6), mt, n, [0, 0, 0], null, [0.09, 0.065, 0.05]); mesh(box(), mt, n, [0.075, 0.14, 0], null, [0.022, 0.28, 0.022]); mesh(box(), mt, n, [0.11, 0.27, 0], [0, 0, -0.5], [0.1, 0.035, 0.022]); return n; });
  A.push(t => ns.forEach((n, i) => { const k = (t * 0.3 + i / ns.length) % 1; n.position.set(cx + Math.sin(k * 7 + i * 2) * 0.16, 1.2 + k * 1.2, cz); n.scale.setScalar(Math.min(1, k * 5) * (1 - k * 0.5) * 1.1); n.rotation.z = Math.sin(t * 2 + i) * 0.3; }));
}

export function detalleChar(X, rig, root, H) {
  const { mesh, toon, outline, sph, cyl, cone, box, basic } = H; const A = [], m = (g, mt, p, r, s, par = rig) => mesh(g, mt, par, p, r, s), gd = gold(H), white = toon('#ffffff', { rim: 0.5 });
  const GL = basic('#ffffff', { opacity: 0.8 }), NEW5 = ['pipoca', 'fresi', 'pulpi', 'dinito', 'lunita'].includes(X), gl = (par, p, s, r) => NEW5 ? m(sph(6), GL, p, r, s, par) : null; // brillo puntual (solo en los 5 nuevos, para cuidar el móvil)
  const dark = toon('#2a1838', { rim: 0 });
  const U = root.userData; const vis = () => !!(U.eyes && U.eyes[0].visible), mvis = () => !!(U.mouth && U.mouth.visible);

  // ======================== LOS 5 NUEVOS ========================
  if (X === 'pipoca') {
    const red = toon('#ff4f6f', { rim: 0.7, emissive: '#ff2a4a', ei: 0.12 });
    // pajarita roja de estreno con brillo
    const bt = G(rig, [0, 0.5, 0.94], [-0.18, 0, 0]); for (const k of [-1, 1]) { const w = m(cone(10), red, [k * 0.15, 0, 0], [0, 0, k * Math.PI / 2], [0.13, 0.17, 0.07], bt); outline(w, '#a02040', 1.1); gl(bt, [k * 0.17, 0.04, 0.05], [0.04, 0.025, 0.02]); }
    m(sph(8), gd, [0, 0, 0.01], null, 0.075, bt); A.push(t => { bt.rotation.z = Math.sin(t * 5) * 0.07; });
    // claqueta de cine que da palmadas
    const cb = G(rig, [1.02, 0.55, 0.5], [0.1, -0.5, -0.18], 1.3); m(rb(0.4, 0.28, 0.05, 0.02), tmat(H, 'v47board', '#ffffff', TX.board(), { rim: 0.3 }), [0, 0, 0], null, null, cb);
    const cm = tmat(H, 'v47clap', '#ffffff', TX.clap(), { rim: 0.3 }); m(rb(0.4, 0.075, 0.055, 0.015), cm, [0, 0.1, 0.0], null, null, cb);
    const hg = G(cb, [-0.2, 0.17, 0.01]); m(rb(0.4, 0.075, 0.055, 0.015), cm, [0.2, 0.04, 0.0], null, null, hg);
    A.push(t => { const c = (t * 0.6) % 1; hg.rotation.z = c < 0.6 ? 0.55 * Math.sin(c / 0.6 * Math.PI * 0.5) : (c < 0.7 ? 0.55 * (1 - (c - 0.6) / 0.1) : 0); cb.rotation.z = -0.18 + Math.sin(t * 3) * 0.04; });
    // chispas de estrella de cine y mantequilla brillante
    const sp = [[0.55, 2.0, 0.3, 0.34], [-0.62, 1.78, 0.2, 0.26], [0.05, 2.28, -0.05, 0.3], [-0.75, 0.95, 0.55, 0.22]].map(([x, y, z, s], i) => [spark(rig, '#fff3b0', s, [x, y, z]), s, i]);
    A.push(t => sp.forEach(([s, b, i]) => { const k = pulse(t, 3 + i, i * 1.7); s.scale.setScalar(b * (0.3 + k * 0.9)); s.material.rotation = t * 0.5 + i; }));
    for (const [x, y, z, r] of [[0.28, 0.98, 0.78, 0.07], [-0.52, 1.2, 0.62, 0.05]]) m(sph(8), toon('#ffd05a', { emissive: '#ffb020', ei: 0.35, rim: 0.9 }), [x, y, z], null, [r * 0.8, r * 1.3, r * 0.6]); // gotas de mantequilla
    // lengüecita traviesa y cejas que saltan
    const tg = m(sph(8), toon('#ff7fa0', { rim: 0.2 }), [0.1, 0.56, 0.93], null, [0.055, 0.04, 0.03]); A.push(t => { tg.visible = mvis() && (t % 3.4) < 0.9; tg.position.x = 0.1 + Math.sin(t * 9) * 0.01; });
    brows(rig, root, dark, A, (t, k) => [Math.max(0, Math.sin(t * 2.2 + (k > 0 ? 0.8 : 0))) * 0.06, -0.15 + Math.sin(t * 2.2) * 0.12]);
  }
  if (X === 'fresi') {
    // gafas de aviador sobre la frente con correa de cuero y cristales brillantes
    const lea = toon('#8a5a3a', { rim: 0.4 }), rim = toon('#ffd36a', { rim: 0.9, emissive: '#c08a20', ei: 0.25 });
    m(tr(0.64, 0.035, 28), lea, [0, 1.17, -0.02], [Math.PI / 2 - 0.12, 0, 0], [1, 0.95, 1]);
    for (const k of [-1, 1]) { const g = G(rig, [k * 0.3, 1.27, 0.66], [-0.45, k * 0.42, 0]); m(tr(0.17, 0.045, 18), rim, null, null, null, g); m(sph(10), basic('#9fe8ff', { opacity: 0.5 }), [0, 0, 0.0], null, [0.16, 0.16, 0.025], g).renderOrder = 5; m(sph(6), GL, [-0.05, 0.06, 0.03], null, [0.06, 0.03, 0.01], g); m(cyl(8), rim, [0, 0, -0.05], [Math.PI / 2, 0, 0], [0.04, 0.05, 0.04], g); }
    m(rb(0.12, 0.05, 0.05, 0.02), rim, [0, 1.27, 0.7], [-0.45, 0, 0]);
    // bufanda a rayas al viento
    const sc = tmat(H, 'v47scF', '#ffffff', TX.stripes('#ffffff', '#ff4f6f', 8), { rim: 0.5, side: THREE.DoubleSide });
    m(tr(1.0, 0.1, 24), sc, [0, 0.6, 0.0], [Math.PI / 2, 0, 0], [1, 0.97, 1]);
    const s1 = strip(rig, [0.5, 0.62, -0.85], [1.25, 0, 0], 5, 0.2, 0.24, sc, 0.03);
    const s2 = strip(rig, [0.25, 0.55, -0.92], [1.3, 0, 0.1], 4, 0.18, 0.2, sc, 0.04);
    A.push((t, sp = 0) => { wave(s1.segs, t, 0.12, 0.2 + sp * 0.2, 5, 0); wave(s2.segs, t, 0.12, 0.2 + sp * 0.2, 5.5, 1.3); s1.root.rotation.x = 1.25 - sp * 0.4; });
    // corazoncitos y chispas de nata
    const hs = [0, 1, 2].map(i => spark(rig, '#ffb0d0', 0.22, [0, 0, 0])); A.push(t => hs.forEach((s, i) => { const k = (t * 0.35 + i / 3) % 1; s.position.set(-0.9 + Math.sin(k * 5 + i) * 0.1, 0.9 + k * 1.1, 0.4); s.scale.setScalar(0.28 * Math.sin(k * Math.PI)); }));
    for (const k of [-1, 1]) gl(rig, [k * 0.12, 0.98, 0.9], [0.02, 0.012, 0.01]);
    brows(rig, root, toon('#7a2a3a', { rim: 0 }), A, (t, k) => [Math.sin(t * 1.3) * 0.02 + (Math.max(0, Math.sin(t * 0.9 + 1)) * 0.05), 0.12 + Math.sin(t * 1.3) * 0.05], 1.13);
  }
  if (X === 'pulpi') {
    // cadena de oro con medallón DJ
    const pts = []; for (let i = 0; i < 9; i++) { const x = -0.5 + i * 0.125, c = 1 - (x / 0.5) ** 2; pts.push([x, 0.62 - 0.26 * c, 0.78 + 0.08 * c * 0 + Math.cos(x * 1.4) * 0.08]); }
    const ch = G(rig, [0, 0, 0]); pts.forEach(p => m(sph(6), gd, p, null, 0.035, ch));
    const md = G(rig, [0, 0.34, 0.9], [0.1, 0, 0]); m(cyl(18), tmat(H, 'v47dj', '#ffffff', TX.dj(), { rim: 0.7 }), [0, 0, 0], [Math.PI / 2, 0, 0], [0.15, 0.03, 0.15], md); m(tr(0.15, 0.02, 20), gd, [0, 0, 0.0], null, null, md); gl(md, [-0.06, 0.06, 0.04], [0.04, 0.02, 0.01]);
    A.push(t => { md.rotation.y = Math.sin(t * 2.3) * 0.35; md.position.y = 0.34 + Math.sin(t * 6) * 0.01; });
    // micrófono brillante que agita un tentáculo, con aro de luz
    const mc = G(rig, [1.02, 0.62, 0.52], [0.3, 0, -0.55]); m(cap(0.045, 0.34), toon('#2a2a3a', { rim: 0.6 }), [0, -0.1, 0], null, null, mc);
    m(sph(10), tmat(H, 'v47chrome', '#ffffff', ctex('v47chr', 64, 64, (x, w) => { const g = x.createLinearGradient(0, 0, w, w); [['#ffffff', 0], ['#a8b8d8', 0.4], ['#ffffff', 0.55], ['#7a88b0', 1]].forEach(([c, s]) => g.addColorStop(s, c)); x.fillStyle = g; x.fillRect(0, 0, w, w); }), { rim: 0.8 }), [0, 0.2, 0], null, 0.11, mc);
    const mr = m(tr(0.11, 0.015, 16), toon('#7ff5ff', { emissive: '#3fe0ff', ei: 1, rim: 0 }), [0, 0.08, 0], [Math.PI / 2, 0, 0], null, mc); gl(mc, [-0.04, 0.25, 0.07], 0.03);
    A.push(t => { mc.rotation.z = -0.55 + Math.sin(t * 4) * 0.18; mr.scale.setScalar(1 + pulse(t, 8) * 0.25); });
    notes(rig, A, ['#ff7fd0', '#7ff5ff', '#ffe066'], 0.95, 0.15, H);
    // pulseras de luz y pestañas largas
    for (const k of [-1, 1]) { const b = m(tr(0.12, 0.025, 14), toon(k < 0 ? '#ff4fd0' : '#7fff7f', { emissive: k < 0 ? '#ff2ab0' : '#3fe03f', ei: 0.9, rim: 0 }), [k * 0.88, 0.5, 0.15], [0.3, 0, k * 0.4]); A.push(t => { b.scale.setScalar(0.9 + pulse(t, 7, k) * 0.2); }); }
    lashes(m, rig, dark);
    brows(rig, root, toon('#1a5aa8', { rim: 0 }), A, (t, k) => [k > 0 ? Math.max(0, Math.sin(t * 1.6)) * 0.07 : 0, k > 0 ? 0.05 : -0.1], 1.15);
  }
  if (X === 'dinito') {
    // hélice de colores en el huevo-casco
    const hub = G(rig, [0.02, 1.93, 0.0], [0.1, 0, 0.05]); m(cyl(8), gd, [0, -0.05, 0], null, [0.025, 0.1, 0.025], hub); m(sph(8), toon('#ff4f6f', { rim: 0.8 }), [0, 0.03, 0], null, 0.06, hub);
    const bl = G(hub, [0, 0.05, 0]); m(rb(0.95, 0.03, 0.16, 0.012), toon('#ffe066', { rim: 0.7 }), [0, 0, 0], null, null, bl); m(rb(0.16, 0.03, 0.95, 0.012), toon('#7fc8ff', { rim: 0.7 }), [0, 0.012, 0], null, null, bl); A.push(t => { bl.rotation.y = t * 11; });
    // bolsito con un cohete de juguete que asoma y echa chispas
    const bg = G(rig, [1.0, 0.32, 0.18], [0, 0, -0.2]); m(rb(0.36, 0.3, 0.28, 0.08), toon('#ff9f3a', { rim: 0.6 }), [0, 0, 0], null, null, bg); m(rb(0.38, 0.1, 0.3, 0.04), toon('#e07a1a', { rim: 0.4 }), [0, 0.13, 0], null, null, bg); m(sph(8), gd, [0, 0.07, 0.15], null, 0.045, bg);
    const rk = G(bg, [0, 0.2, 0], [0, 0, -0.1]); m(cap(0.07, 0.22), toon('#ffffff', { rim: 0.8 }), [0, 0.18, 0], null, null, rk); m(cone(10), toon('#ff4f6f', { rim: 0.6 }), [0, 0.38, 0], null, [0.08, 0.14, 0.08], rk); m(sph(8), basic('#9fe8ff', { opacity: 0.8 }), [0, 0.2, 0.065], null, [0.04, 0.04, 0.02], rk);
    for (const k of [-1, 1]) m(cone(3), toon('#7fc8ff', { rim: 0.4 }), [k * 0.08, 0.06, 0], [0, 0, -k * 0.5], [0.05, 0.12, 0.03], rk); const fl = glow(rk, '#ffb040', 0.28, [0, 0.02, 0], 0.9);
    A.push((t, sp = 0) => { rk.rotation.z = -0.1 + Math.sin(t * 5) * 0.1; fl.scale.setScalar(0.18 + pulse(t, 22) * 0.16); });
    // colmillitos de bebé dino y cejas decididas
    const fg = [-1, 1].map(k => m(cone(6), white, [k * 0.075, 0.6, 0.95], [Math.PI, 0, 0], [0.025, 0.055, 0.02])); A.push(() => fg.forEach(f => { f.visible = mvis(); }));
    brows(rig, root, toon('#2f7a3a', { rim: 0 }), A, (t, k) => [Math.sin(t * 1.9) * 0.02, 0.28 + Math.max(0, Math.sin(t * 2.3)) * 0.12], 1.14);
    for (const [x, y, z] of [[0.55, 0.52, 0.76], [-0.5, 0.45, 0.8]]) for (let i = 0; i < 2; i++) m(cone(5), toon('#5fb84a', { rim: 0.2 }), [x + i * 0.07, y + i * 0.05, z], [0.4, 0, 0], [0.025, 0.05, 0.025]); // pinchitos de las mejillas
    gl(rig, [-0.3, 1.38, 0.5], [0.07, 0.035, 0.03]);
  }
  if (X === 'lunita') {
    // capa de estrellas al viento
    const cm = tmat(H, 'v47capeL', '#ffffff', TX.stars('#4a3ab0', '#1d1a5a', '#ffd36a'), { rim: 0.5, side: THREE.DoubleSide });
    const cp = strip(rig, [0, 1.02, -0.66], [0.3, 0, 0], 5, 0.26, 0.85, cm, 0.03); m(tr(0.3, 0.025, 14, Math.PI), gd, [0, 0.85, -0.55], [0.2, Math.PI, 0]);
    A.push((t, sp = 0) => { wave(cp.segs, t, 0.2 + sp * 0.08, 0.16 + sp * 0.12, 3, 0); cp.root.rotation.x = 0.3 + sp * 0.35; });
    // varita de luna con estela de chispas
    const wd = G(rig, [1.05, 0.78, 0.5], [0.3, 0, -0.45]); m(cyl(8), toon('#d8c8ff', { rim: 0.8 }), [0, 0.3, 0], null, [0.02, 0.6, 0.02], wd);
    const cres = H.geoShared('v47cres', () => { const s = new THREE.Shape(); s.absarc(0, 0, 1, 0.45 * Math.PI, 1.55 * Math.PI, false); s.absarc(0.45, 0, 0.8, 1.45 * Math.PI, 0.55 * Math.PI, true); return new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 }); });
    const tp = G(wd, [0, 0.66, 0]); m(cres, toon('#ffe066', { emissive: '#ffcc33', ei: 0.5, rim: 0.9 }), [0, 0, -0.1], [0, 0, -0.2], 0.13, tp); glow(tp, '#ffe9a0', 0.55, [0, 0, 0], 0.7);
    const tw = [0, 1, 2, 3].map(i => spark(wd, '#fff3b0', 0.2, [0, 0.66, 0])); A.push(t => { wd.rotation.z = -0.45 + Math.sin(t * 2.4) * 0.25; tw.forEach((s, i) => { const k = (t * 0.9 + i / 4) % 1; s.position.set(Math.sin(i * 2 + t) * 0.12, 0.66 + k * 0.5, 0.0); s.scale.setScalar(0.22 * Math.sin(k * Math.PI)); }); });
    // alitas de polvo de estrellas
    const wm = basic('#cfd8ff', { opacity: 0.5, side: THREE.DoubleSide }), wg = [-1, 1].map(k => { const w = G(rig, [k * 0.2, 0.95, -0.75], [0, k * 0.5, 0]); m(sph(10), wm, [k * 0.22, 0.1, 0], [0, 0, k * 0.5], [0.3, 0.14, 0.015], w); m(sph(8), wm, [k * 0.16, -0.08, 0], [0, 0, -k * 0.4], [0.2, 0.09, 0.015], w); gl(w, [k * 0.3, 0.14, 0.02], [0.05, 0.02, 0.01]); return [w, k]; });
    A.push(t => wg.forEach(([w, k]) => { w.rotation.y = k * (0.5 + Math.sin(t * 5) * 0.28); }));
    // párpados dormilones: bajan despacito y se abren de golpe
    const lm = toon('#8f8fec', { rim: 0.4 }), ld = [-1, 1].map(k => { const g = G(rig, [k * 0.35, 0.88, 0.85], [0, k * 0.38, 0]); const l = m(sph(10), lm, [0, 0.2, 0.0], null, [0.185, 0.1, 0.104], g); return [g, l]; });
    A.push(t => { const v = vis(), c = (t * 0.25) % 1, d = c < 0.8 ? lerp(0.12, 0.62, c / 0.8) : lerp(0.62, -0.1, (c - 0.8) / 0.2); ld.forEach(([g, l]) => { g.visible = v; const h = 0.1 + Math.max(0, d) * 0.1; l.scale.y = h; l.position.y = 0.23 - h * 0.7 + (1 - Math.max(0, d)) * 0.06; }); });
    brows(rig, root, toon('#3a2a8a', { rim: 0 }), A, (t, k) => [-0.015, -0.3 - Math.sin(t * 0.8) * 0.06], 1.14);
    for (let i = 0; i < 3; i++) spark(rig, '#c8d0ff', 0.2, [-0.7 + i * 0.05, 1.5 - i * 0.18, 0.4]);
  }

  // ======================== LOS 18 DE SIEMPRE ========================
  if (X === 'mochi') {
    const cp = strip(rig, [0, 1.0, -0.68], [0.35, 0, 0], 3, 0.2, 0.6, tmat(H, 'v47capeM', '#ffffff', TX.hearts(), { rim: 0.5, side: THREE.DoubleSide }), 0.06); A.push((t, sp = 0) => { wave(cp.segs, t, 0.18, 0.18 + sp * 0.1, 4); cp.root.rotation.x = 0.35 + sp * 0.35; });
    const dg = G(rig, [-1.05, 0.7, 0.4], [0.2, 0, 0.35]); m(cyl(6), toon('#d8a86a', { rim: 0 }), [0, 0.1, 0], null, [0.015, 0.7, 0.015], dg);
    ['#ff9fc8', '#ffffff', '#9fe8b0'].forEach((c, i) => { m(sph(10), toon(c, { rim: 0.8 }), [0, 0.28 + i * 0.17, 0], null, 0.09, dg); gl(dg, [-0.03, 0.31 + i * 0.17, 0.06], 0.02); }); A.push(t => { dg.rotation.z = 0.35 + Math.sin(t * 3) * 0.1; });
    spark(rig, '#ffd0ea', 0.26, [0.85, 1.55, 0.3]); spark(rig, '#ffffff', 0.18, [-0.8, 1.1, 0.5]);
  }
  if (X === 'tiovivo') {
    const bm = [], cols = ['#ff6f9a', '#ffe066', '#7ee3a8', '#7fc8ff'];
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283, mt = toon(cols[i % 4], { emissive: cols[i % 4], ei: 0.6, rim: 0.3, nocache: true }); m(sph(6), mt, [Math.sin(a) * 0.42, 1.7, Math.cos(a) * 0.42], null, 0.05); bm.push(mt); }
    A.push(t => bm.forEach((mt, i) => { mt.emissiveIntensity = 0.25 + 0.9 * pulse(t, 6, -i * 0.8); }));
    const cc = G(rig, [-1.05, 0.62, 0.38], [0.2, 0, 0.3]); m(cyl(6), white, [0, 0.0, 0], null, [0.015, 0.6, 0.015], cc);
    [[0, 0.4, 0, 0.17, '#ffb0d8'], [0.1, 0.46, 0.05, 0.12, '#ffffff'], [-0.1, 0.5, -0.03, 0.12, '#ff8fc8'], [0.03, 0.58, 0.04, 0.1, '#ffd0ea']].forEach(([x, y, z, r, c]) => m(sph(8), toon(c, { rim: 0.95 }), [x, y, z], null, r, cc)); glow(cc, '#ffd0ea', 0.7, [0, 0.48, 0], 0.35);
    A.push(t => { cc.rotation.z = 0.3 + Math.sin(t * 2.6) * 0.08; });
  }
  if (X === 'atomo') {
    const fk = G(rig, [-1.02, 0.5, 0.5], [0.1, 0, 0.3]); m(sph(12), basic('#c9f6ff', { opacity: 0.35 }), [0, 0.1, 0], null, [0.2, 0.2, 0.2], fk).renderOrder = 5; m(sph(10), toon('#7fff9f', { emissive: '#3fe070', ei: 0.7, rim: 0.8 }), [0, 0.05, 0], null, [0.16, 0.12, 0.16], fk);
    m(cyl(10), basic('#c9f6ff', { opacity: 0.4 }), [0, 0.3, 0], null, [0.07, 0.2, 0.07], fk).renderOrder = 5; m(cyl(8), toon('#c88a4a', { rim: 0 }), [0, 0.42, 0], null, [0.065, 0.05, 0.065], fk); gl(fk, [-0.09, 0.15, 0.14], [0.03, 0.06, 0.02]);
    const bb = [0, 1, 2].map(i => m(sph(6), basic('#e8ffe8', { opacity: 0.8 }), null, null, 0.03, fk)); A.push(t => { fk.rotation.z = 0.3 + Math.sin(t * 2) * 0.06; bb.forEach((b, i) => { const k = (t * 0.7 + i / 3) % 1; b.position.set(Math.sin(k * 8 + i) * 0.05, 0.1 + k * 0.4, 0.02); b.scale.setScalar(0.035 * (1 - k * 0.4)); }); });
    const lg = [-1, 1].map(k => m(cone(3), toon('#fff27a', { emissive: '#ffe040', ei: 0.9, rim: 0 }), [k * 0.12, 1.98, 0], [0, 0, -k * 0.5], [0.05, 0.22, 0.02])); A.push(t => lg.forEach((l, i) => { l.visible = (t * 3 + i * 1.7) % 2 < 1.4; }));
  }
  if (X === 'cosmo') {
    const jp = G(rig, [0, 0.86, -1.0]); m(rb(0.6, 0.55, 0.26, 0.09), toon('#d8d0ff', { rim: 0.8 }), [0, 0, 0], null, null, jp); const fls = [];
    for (const k of [-1, 1]) { m(cap(0.1, 0.34), tmat(H, 'v47chrome2', '#ffffff', ctex('v47chr2', 32, 64, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, 0); [['#a8a0e0', 0], ['#ffffff', 0.4], ['#8a80c8', 1]].forEach(([c, s]) => g.addColorStop(s, c)); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = '#ff4f6f'; x.fillRect(0, 24, w, 8); }), { rim: 0.7 }), [k * 0.2, -0.05, -0.08], null, null, jp); const f = G(jp, [k * 0.2, -0.38, -0.08]); m(cone(8), toon('#ffb040', { emissive: '#ff8a20', ei: 1, rim: 0 }), [0, -0.12, 0], [Math.PI, 0, 0], [0.08, 0.26, 0.08], f); glow(f, '#ffc060', 0.4, [0, -0.1, 0], 0.7); fls.push(f); }
    A.push((t, sp = 0) => fls.forEach((f, i) => { f.scale.set(1, 0.7 + pulse(t, 25, i) * 0.5 + sp * 0.8, 1); }));
    const pt = G(rig, [-0.55, 0.62, 0.78], [0, -0.55, 0]); m(cyl(16), tmat(H, 'v47patch', '#ffffff', TX.patch(), { rim: 0.6 }), [0, 0, 0], [Math.PI / 2, 0, 0], [0.12, 0.03, 0.12], pt); gl(pt, [-0.04, 0.05, 0.03], 0.02);
  }
  if (X === 'copito') {
    const mg = G(rig, [-1.03, 0.52, 0.45], [0.1, 0, 0.2]); m(cyl(14), toon('#ff6f6f', { rim: 0.8 }), [0, 0.1, 0], null, [0.14, 0.2, 0.14], mg); m(cyl(14), toon('#6a3a2a', { rim: 0.2 }), [0, 0.21, 0], null, [0.12, 0.01, 0.12], mg); m(tr(0.12, 0.03, 12, Math.PI), toon('#ff6f6f', { rim: 0.8 }), [0.14, 0.1, 0], [0, 0, -Math.PI / 2], 1, mg);
    for (const [x, z] of [[-0.04, 0.02], [0.04, -0.03]]) m(sph(6), toon('#ffffff', { rim: 0.9 }), [x, 0.24, z], null, 0.05, mg); gl(mg, [-0.11, 0.16, 0.08], [0.02, 0.06, 0.02]);
    const st = [0, 1, 2].map(i => m(sph(6), basic('#ffffff', { opacity: 0.55 }), null, null, 0.06, mg)); A.push(t => st.forEach((s, i) => { const k = (t * 0.45 + i / 3) % 1; s.position.set(Math.sin(k * 6 + i * 2) * 0.06, 0.3 + k * 0.5, 0); s.scale.setScalar(0.03 + k * 0.08); }));
    for (let i = 0; i < 4; i++) spark(rig, '#e8faff', 0.2, [Math.sin(i * 1.7) * 0.9, 1.3 + (i % 2) * 0.4, Math.cos(i * 1.7) * 0.5]);
  }
  if (X === 'burbuja') {
    const fm = toon('#5fd0e8', { rim: 0.7, opacity: 0.85, side: THREE.DoubleSide }), fs = [0, 1, 2].map(i => { const f = G(rig, [0, 1.15 - i * 0.18, -0.6 - i * 0.2], [-0.5 - i * 0.25, 0, 0]); m(cone(3), fm, [0, 0.14, 0], null, [0.1, 0.34 - i * 0.05, 0.03], f); return f; }); A.push(t => fs.forEach((f, i) => { f.rotation.z = Math.sin(t * 4 - i * 0.8) * 0.18; }));
    for (let i = 0; i < 9; i++) { const x = -0.55 + i * 0.1375, c = 1 - (x / 0.55) ** 2, p = m(sph(8), toon(i % 2 ? '#ffffff' : '#ffe0f0', { rim: 1, emissive: '#ffd0f0', ei: 0.18 }), [x, 0.6 - 0.2 * c, 0.78 + Math.cos(x * 1.4) * 0.1], null, 0.05); }
    spark(rig, '#e8ffff', 0.24, [-0.6, 0.55, 0.7]);
  }
  if (X === 'lava') {
    const bl = [0, 1, 2].map(i => { const g = G(rig, [0, 1.7, 0]); m(sph(8), toon(['#ffb13d', '#ff6f3d', '#ffd36a'][i], { emissive: '#ff7f2a', ei: 0.9, rim: 0.5 }), null, null, [0.1, 0.12, 0.1], g); glow(g, '#ff9f3d', 0.45, null, 0.6); return g; });
    A.push(t => bl.forEach((g, i) => { const a = t * 1.1 + i * 2.1; g.position.set(Math.cos(a) * 0.95, 1.55 + Math.sin(t * 2.4 + i * 2) * 0.28, Math.sin(a) * 0.7 + 0.1); const s = 0.85 + Math.sin(t * 5 + i) * 0.2; g.scale.set(1 / s, s, 1 / s); }));
    for (let i = 0; i < 3; i++) m(sph(6), toon('#ffd36a', { emissive: '#ffb020', ei: 0.8, rim: 0 }), [-0.5 + i * 0.5, 1.5 + (i % 2) * 0.05, 0.62], null, [0.05, 0.1, 0.04]);
  }
  if (X === 'tictac') {
    const mu = G(rig, [0, 0.78, 0.94]), mm = toon('#6a3a2a', { rim: 0.4 }); for (const k of [-1, 1]) { m(sph(8), mm, [k * 0.1, 0, 0], [0, 0, -k * 0.3], [0.16, 0.045, 0.05], mu); m(tr(0.045, 0.014, 10, Math.PI * 1.5), mm, [k * 0.24, 0.035, 0], [0, 0, k > 0 ? 1.2 : -2.2], null, mu); } A.push(t => { mu.rotation.z = Math.sin(t * 3) * 0.04; mu.visible = mvis() || vis(); });
    const ck = G(rig, [0.05, 2.0, 0], [0, 0, -0.12]), ym = toon('#ffe066', { rim: 0.7 }); m(sph(8), ym, [0, 0, 0], null, [0.12, 0.1, 0.11], ck); m(cone(6), toon('#ff9f3a', { rim: 0.2 }), [0, 0.0, 0.13], [Math.PI / 2, 0, 0], [0.04, 0.09, 0.04], ck); for (const k of [-1, 1]) m(sph(5), dark, [k * 0.05, 0.03, 0.09], null, 0.018, ck);
    A.push(t => { const c = (t * 0.33) % 1, u = c < 0.25 ? Math.sin(c / 0.25 * Math.PI * 0.5) : (c < 0.5 ? 1 : (c < 0.62 ? 1 - (c - 0.5) / 0.12 : 0)); ck.position.y = 1.96 + u * 0.2; ck.scale.setScalar(Math.max(0.001, u)); ck.rotation.x = Math.sin(t * 30) * 0.08 * u; });
  }
  if (X === 'trueno') {
    const bolt = (x, y) => { const g = G(rig, [x, y, 0], [0, 0, 0]), mt = toon('#fff27a', { emissive: '#ffe040', ei: 1, rim: 0 }); m(box(), mt, [0, 0.12, 0], [0, 0, 0.5], [0.04, 0.2, 0.02], g); m(box(), mt, [0.05, -0.04, 0], [0, 0, -0.5], [0.04, 0.2, 0.02], g); m(box(), mt, [0, -0.2, 0], [0, 0, 0.5], [0.04, 0.16, 0.02], g); glow(g, '#fff27a', 0.5, [0, 0, 0.02], 0.5); return g; };
    const bs = [bolt(-0.85, 1.95), bolt(0.85, 1.95)]; A.push(t => bs.forEach((b, i) => { b.visible = (t * 2.1 + i * 0.9) % 2 < 0.9; b.rotation.z = Math.sin(t * 20 + i) * 0.12; }));
    const os = [0, 1, 2].map(i => { const s = m(sph(6), toon('#fff27a', { emissive: '#ffe040', ei: 1, rim: 0 }), null, null, 0.05); s.add(glow(s, '#fff27a', 3, null, 0.5)); return s; });
    A.push(t => os.forEach((s, i) => { const a = t * 3 + i * 2.09; s.position.set(Math.cos(a) * 1.0, 1.35 + Math.sin(a * 2) * 0.15, Math.sin(a) * 0.75 + 0.05); }));
    m(cone(8), toon('#ff6f6f', { rim: 0.6 }), [0, 0.52, 0.9], [Math.PI, 0, 0], [0.07, 0.14, 0.05]); // lazo de pico
  }
  if (X === 'disco') {
    const rm = toon('#ff8fd8', { emissive: '#ff4fb0', ei: 0.6, rim: 0.4, nocache: true }), bt = G(rig, [0, 0.55, 0.93], [-0.2, 0, 0]); for (const k of [-1, 1]) m(cone(8), rm, [k * 0.13, 0, 0], [0, 0, k * Math.PI / 2], [0.11, 0.15, 0.06], bt); m(sph(8), gd, null, null, 0.06, bt); A.push(t => { rm.color.setHSL((t * 0.2) % 1, 0.9, 0.65); rm.emissive.setHSL((t * 0.2) % 1, 0.9, 0.45); });
    const mb = G(rig, [-0.28, 2.05, 0.05], [0, 0, 0.15]); m(cyl(6), toon('#8a6ad0', { rim: 0 }), [0, -0.15, 0], null, [0.015, 0.3, 0.015], mb);
    const bl = m(H.geoShared('v47mball', () => new THREE.IcosahedronGeometry(1, 1)), tmat(H, 'v47mir', '#ffffff', ctex('v47mir', 64, 64, (x, w) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? '#ffffff' : '#a8b4d8'; x.fillRect(i * 8, j * 8, 8, 8); } }), { rim: 0.9, emissive: '#6a6aa8', ei: 0.25 }), [0, 0.0, 0], null, 0.15, mb);
    const dots = [0, 1, 2].map(i => spark(mb, ['#ff8fd8', '#7ff5ff', '#ffe066'][i], 0.22, [0, 0, 0])); A.push(t => { bl.rotation.y = t * 2; dots.forEach((d, i) => { const a = t * 2 + i * 2.1; d.position.set(Math.cos(a) * 0.3, Math.sin(a * 1.3) * 0.2, Math.sin(a) * 0.3); }); });
  }
  if (X === 'capitan') {
    for (const k of [-1, 1]) { const e = G(rig, [k * 0.7, 1.05, 0.05], [0, 0, -k * 0.5]); m(cyl(12), gd, [0, 0, 0], null, [0.14, 0.035, 0.14], e); for (let i = 0; i < 5; i++) m(cap(0.012, 0.1), gd, [(i - 2) * 0.05, -0.08, 0], [0, 0, (i - 2) * 0.15], null, e); }
    const md = G(rig, [-0.55, 0.6, 0.83], [0, -0.5, 0]); m(cyl(18), tmat(H, 'v47anc', '#ffffff', TX.anchor(), { rim: 0.7 }), [0, 0, 0], [Math.PI / 2, 0, 0], [0.13, 0.03, 0.13], md); m(rb(0.07, 0.2, 0.012, 0.005), toon('#2a4a9a', { rim: 0.3 }), [0, -0.16, -0.01], null, null, md); gl(md, [-0.05, 0.05, 0.04], 0.02); A.push(t => { md.rotation.z = Math.sin(t * 2) * 0.08; });
  }
  if (X === 'tostadin') {
    const em = tmat(H, 'v47capeT', '#ffffff', TX.ermine(), { rim: 0.4, side: THREE.DoubleSide }), cp = strip(rig, [0, 1.0, -0.7], [0.3, 0, 0], 4, 0.26, 0.82, em, 0.04); A.push((t, sp = 0) => { wave(cp.segs, t, 0.18, 0.15 + sp * 0.1, 3.4); cp.root.rotation.x = 0.3 + sp * 0.35; });
    const sc = G(rig, [-1.05, 0.7, 0.42], [0.15, 0, 0.3]); m(cyl(8), gd, [0, 0.2, 0], null, [0.02, 0.8, 0.02], sc); m(rb(0.2, 0.025, 0.1, 0.01), toon('#e8e8f0', { rim: 0.9 }), [0.0, 0.62, 0], null, null, sc); m(sph(10), toon('#d8284a', { rim: 0.95, emissive: '#a00a2a', ei: 0.25 }), [0, 0.7, 0], null, [0.1, 0.09, 0.1], sc); gl(sc, [-0.04, 0.74, 0.07], 0.025); A.push(t => { sc.rotation.z = 0.3 + Math.sin(t * 2.5) * 0.06; });
  }
  if (X === 'madame') {
    const bm = [toon('#ff9fd0', { rim: 0.95 }), toon('#ffe0f0', { rim: 0.95 })], fl = []; for (let i = 0; i < 12; i++) { const a = (45 + i * 22.5) * Math.PI / 180, s = m(sph(7), bm[i % 2], [Math.sin(a) * 0.9, 0.8 + Math.cos(a * 2) * 0.04, Math.cos(a) * 0.9], null, 0.14 - (i % 3) * 0.015); fl.push([s, i]); }
    A.push(t => fl.forEach(([s, i]) => { s.position.y = 0.8 + Math.sin(t * 3 + i) * 0.015; }));
    m(sph(6), dark, [0.24, 0.7, 0.92], null, 0.018); lashes(m, rig, dark);
  }
  if (X === 'tecla') {
    const bt = G(rig, [1.02, 0.78, 0.45], [0.2, 0, -0.5]); m(cap(0.02, 0.5), toon('#ffffff', { rim: 0.8 }), [0, 0.28, 0], null, null, bt); m(cap(0.04, 0.12), toon('#8a5a3a', { rim: 0.3 }), [0, -0.05, 0], null, null, bt); gl(bt, [0.0, 0.55, 0.03], 0.02);
    A.push(t => { const c = (t * 1.2) % 4; bt.rotation.z = -0.5 + (c < 1 ? -0.2 + c * 0.7 : c < 2 ? 0.3 - (c - 1) * 0.3 : c < 3 ? 0 + (c - 2) * 0.1 : 0.1 - (c - 3) * 0.3); bt.rotation.x = 0.2 + Math.sin(t * 1.2 * Math.PI * 0.5) * 0.15; });
    notes(rig, A, ['#7ff5ff', '#ff8fd0'], -0.95, 0.1, H);
  }
  if (X === 'duquesa') {
    const fm = toon('#ffffff', { rim: 0.95 }); for (const k of [-1, 1]) for (let i = 0; i < 4; i++) m(sph(8), fm, [k * (0.72 + (i % 2) * 0.1), 0.95 + (i > 1 ? 0.1 : 0), 0.15 + (i % 2) * 0.12], null, 0.12 - i * 0.012);
    const bm = basic('#bfe8ff', { opacity: 0.4 }), bm2 = basic('#ffd0f0', { opacity: 0.4 }), bs = [0, 1, 2, 3].map(i => { const g = G(rig, [0, 0, 0]); m(sph(10), i % 2 ? bm : bm2, null, null, 0.1, g).renderOrder = 5; gl(g, [-0.03, 0.04, 0.07], [0.025, 0.015, 0.01]); return g; });
    A.push(t => bs.forEach((b, i) => { const k = (t * 0.25 + i / 4) % 1; b.position.set(Math.sin(i * 2.4 + k * 4) * 0.9, 1.0 + k * 1.3, 0.4 + Math.cos(i * 2.4) * 0.3); b.scale.setScalar(0.5 + k * 0.7); }));
  }
  if (X === 'farito') {
    m(tr(0.92, 0.13, 24), tmat(H, 'v47ring', '#ffffff', TX.stripes('#ff4f4f', '#ffffff', 10), { rim: 0.6 }), [0, 0.4, 0.0], [Math.PI / 2, 0, 0], [1, 1, 0.9]);
    const lp = G(rig, [0, 1.62, 0]); m(cyl(10), basic('#fff6c0', { opacity: 0.6 }), [0, 0, 0], null, [0.1, 0.14, 0.1], lp).renderOrder = 5; glow(lp, '#fff0a0', 0.7, [0, 0, 0], 0.8);
    const bm = new THREE.Mesh(SH(new THREE.ConeGeometry(0.2, 1.2, 10, 1, true)), new THREE.MeshBasicMaterial({ color: '#fff3b0', transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); const bg = G(lp, [0, 0, 0]); bm.position.set(0, 0, 0.62); bm.rotation.x = Math.PI / 2; bm.scale.set(1, 1, 1); bg.add(bm); A.push(t => { bg.rotation.y = t * 1.6; });
  }
  if (X === 'tarta') {
    const cols = ['#ff6f9a', '#7fc8ff', '#ffe066'], ss = cols.map((c, i) => strip(rig, [0.1 + i * 0.1, 1.9, 0.05 - i * 0.05], [0, 0, 0], 5, 0.12, 0.05, toon(c, { rim: 0.4, side: THREE.DoubleSide }), 0.02)); A.push(t => ss.forEach((s, i) => { wave(s.segs, t, 0.2, 0.5, 4, i * 1.3); s.root.rotation.z = -0.5 + i * 0.5; }));
    const cf = [], cc = ['#ff6f9a', '#7fc8ff', '#ffe066', '#7ee3a8', '#b98cff']; for (let i = 0; i < 9; i++) cf.push(m(box(), toon(cc[i % 5], { rim: 0, emissive: cc[i % 5], ei: 0.25 }), null, null, [0.05, 0.02, 0.03]));
    A.push(t => cf.forEach((c, i) => { const k = (t * 0.35 + i / 9) % 1; c.position.set(Math.sin(i * 2.7) * 0.95, 2.2 - k * 1.7, Math.cos(i * 2.7) * 0.7 + 0.1); c.rotation.set(t * 3 + i, t * 2, i); }));
  }
  if (X === 'grullita') {
    const pm = tmat(H, 'v47paper', '#ffffff', ctex('v47pap', 64, 64, (x, w) => { x.fillStyle = '#fffdf3'; x.fillRect(0, 0, w, w); x.strokeStyle = 'rgba(120,150,220,.4)'; for (let y = 8; y < w; y += 8) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); } x.strokeStyle = 'rgba(160,140,120,.5)'; x.beginPath(); x.moveTo(0, 0); x.lineTo(w, w); x.stroke(); }), { rim: 0.5, side: THREE.DoubleSide });
    const wg = H.geoShared('v47wing', () => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.8, 0.15); s.lineTo(0.55, -0.12); s.lineTo(0.7, -0.4); s.lineTo(0.05, -0.2); s.closePath(); return new THREE.ExtrudeGeometry(s, { depth: 0.015, bevelEnabled: false }); });
    const ws = [-1, 1].map(k => { const w = G(rig, [k * 0.2, 0.95, -0.78], [0, 0, 0]); m(wg, pm, [0, 0, 0], [0, 0, 0], [k * 0.75, 0.75, 1], w); return [w, k]; }); A.push((t, sp = 0) => ws.forEach(([w, k]) => { w.rotation.y = k * (0.9 + Math.sin(t * 6) * 0.3); w.rotation.z = k * (0.2 + Math.sin(t * 6) * 0.1 - sp * 0.15); }));
    const sm = toon('#ff4f4f', { rim: 0.5, side: THREE.DoubleSide }), s1 = strip(rig, [0.35, 0.62, -0.7], [1.25, 0, 0], 5, 0.18, 0.2, sm, 0.04); m(tr(0.86, 0.07, 20), sm, [0, 0.6, 0.02], [Math.PI / 2, 0, 0], [1, 0.95, 0.8]); A.push((t, sp = 0) => { wave(s1.segs, t, 0.1, 0.22 + sp * 0.2, 5.5); s1.root.rotation.x = 1.25 - sp * 0.4; });
  }
  if (A.length) U.extra = (U.extra || []).concat(A);
}
