// v21: más detalle para los 10 pilotos de siempre (mismo cuerpo y escala; piezas extra en el piloto y en su vehículo)
import * as THREE from 'three';
import { face, puffs, tmat, T, rbox, capsule, lathe, torus, ctex, grp as G, gold } from './premium.js';
const stripes = (a, b, n = 8) => ctex('st' + a + b + n, 128, 32, (x, w, h) => { for (let i = 0; i < n; i++) { x.fillStyle = i % 2 ? a : b; x.fillRect(i * w / n, 0, w / n, h); } });
const candy = () => ctex('candy', 64, 64, (x, w) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, w); x.strokeStyle = '#ff4f6f'; x.lineWidth = 10; for (let i = -64; i < 128; i += 22) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 64, 64); x.stroke(); } }, [1, 3]);
const metal = () => ctex('metal', 64, 128, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#8a6ad0'); g.addColorStop(0.5, '#e8dcff'); g.addColorStop(1, '#8a6ad0'); x.fillStyle = g; x.fillRect(0, 0, w, h); for (let y = 8; y < h; y += 16) { x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.arc(8, y, 2, 0, 6.3); x.arc(w - 8, y, 2, 0, 6.3); x.fill(); } });

export function classicChar(X, rig, root, H) {
  const { mesh, toon, outline, sph, cyl, cone, box, basic } = H; const A = [], m = (g, mt, p, r, s, par = rig) => mesh(g, mt, par, p, r, s), gd = gold(H), white = toon('#ffffff', { rim: 0.5 });
  if (X === 'mochi') { // rizo, horquilla de estrella, collar de cascabel
    const c = m(torus(0.12, 0.035, 14, Math.PI * 1.5), toon('#ff7fb0', { rim: 0.6 }), [0.05, 1.68, 0.1], [0, 0, 0.5]); A.push(t => { c.rotation.z = 0.5 + Math.sin(t * 4) * 0.2; });
    m(H.starGeoS(), toon('#ffe066', { emissive: '#ffcc33', ei: 0.5 }), [0.45, 1.38, 0.62], [-0.3, 0.5, 0.3], 0.08);
    m(torus(0.82, 0.04, 28), toon('#ff4f93'), [0, 0.42, 0.03], [Math.PI / 2 + 0.12, 0, 0]); const bell = m(sph(12), gd, [0, 0.33, 0.9], null, 0.09); A.push(t => { bell.position.x = Math.sin(t * 6) * 0.03; }); }
  if (X === 'tiovivo') { // gorra de feriante a rayas y piruleta
    m(cyl(20), tmat(H, 'tioCap', '#ffffff', stripes('#ff6f9a', '#ffffff')), [0, 1.5, 0], null, [0.52, 0.18, 0.52]); m(rbox(0.5, 0.04, 0.3, 0.02), toon('#ff6f9a'), [0, 1.43, 0.5], [0.3, 0, 0]);
    const lol = G(rig, [0.9, 0.7, 0.35]); m(cyl(6), white, [0, 0.25, 0], null, [0.02, 0.5, 0.02], lol); m(cyl(20), tmat(H, 'lolly', '#ffffff', ctex('lolly', 64, 64, (x) => { for (let i = 0; i < 12; i++) { x.fillStyle = ['#ff6f9a', '#ffe066', '#7ee3c4'][i % 3]; x.beginPath(); x.moveTo(32, 32); x.arc(32, 32, 32, i * 0.52, (i + 1) * 0.52); x.fill(); } })), [0, 0.55, 0], [1.57, 0, 0], [0.2, 0.05, 0.2], lol);
    A.push(t => { lol.rotation.z = Math.sin(t * 3) * 0.3; }); }
  if (X === 'atomo') { // bata de laboratorio, bolígrafo y chispa en la antena
    for (const k of [-1, 1]) m(geo3(H, 'coatL'), white, [k * 0.36, 0.3, 0.83], [0.2, 0, Math.PI + k * 0.4]);
    m(capsule(0.025, 0.2), toon('#4f7fff'), [0.42, 0.35, 0.86], [0.2, 0, 0]); m(sph(6), toon('#ff4f6f'), [0.42, 0.47, 0.86], null, 0.03);
    const sp = m(H.starGeoS(), toon('#fff6a0', { emissive: '#ffe066', ei: 1, rim: 0 }), [0, 2.2, 0], null, 0.08); A.push(t => { sp.rotation.z = t * 6; sp.scale.setScalar(0.06 + Math.abs(Math.sin(t * 8)) * 0.05); }); }
  if (X === 'cosmo') { // casco de astronauta (anillo) y cohete en órbita
    m(torus(0.9, 0.05, 32), toon('#e8e4ff', { rim: 0.9 }), [0, 0.5, 0.02], [Math.PI / 2 + 0.1, 0, 0]);
    const orb = G(rig, [0, 1.2, 0]); const r = G(orb, [1.2, 0.3, 0]); m(capsule(0.06, 0.16), white, null, [0, 0, 1.57], null, r); m(cone(8), toon('#ff6f6f'), [0.16, 0, 0], [0, 0, -1.57], [0.06, 0.1, 0.06], r); m(cone(8), toon('#ffb84a', { emissive: '#ff9f2a', ei: 1 }), [-0.17, 0, 0], [0, 0, 1.57], [0.04, 0.1, 0.04], r);
    A.push(t => { orb.rotation.y = t * 1.5; }); }
  if (X === 'copito') { // orejeras peludas y manoplas
    for (const k of [-1, 1]) { m(sph(12), toon('#ffffff', { rim: 0.9 }), [k * 0.9, 1.05, 0], null, [0.12, 0.2, 0.2]); }
    m(torus(0.88, 0.03, 24, Math.PI), toon('#ff8fb8'), [0, 1.05, 0], [0, 1.57, 0]);
    for (const k of [-1, 1]) m(sph(10), toon('#7fd0ff', { rim: 0.6 }), [k * 0.95, 0.4, 0.15], null, [0.14, 0.12, 0.14]); }
  if (X === 'burbuja') { // tubo de buceo y gafas
    m(rbox(0.85, 0.3, 0.12, 0.1), toon('#ffe066', { rim: 0.6 }), [0, 0.92, 0.9]); m(rbox(0.78, 0.24, 0.05, 0.08), basic('#bfeaff', { opacity: 0.5 }), [0, 0.92, 0.96]);
    m(capsule(0.05, 0.6), toon('#ff6f9a'), [0.72, 1.3, 0.3], [0, 0, -0.15]); m(torus(0.08, 0.03, 10, Math.PI), toon('#ff6f9a'), [0.66, 0.95, 0.4], [0, 0, Math.PI]); }
  if (X === 'lava') { // pelo de llama que tiembla
    const fl = []; for (let i = 0; i < 5; i++) fl.push(m(H.dropGeo(), toon(i % 2 ? '#ffb84a' : '#ff6f3d', { emissive: '#ff7f2a', ei: 0.8, rim: 0 }), [-0.3 + i * 0.15, 1.75, -0.1], [Math.PI, 0, 0], 0.12));
    A.push(t => fl.forEach((f, i) => { f.scale.set(0.1, 0.12 * (1 + Math.sin(t * 12 + i) * 0.25), 0.1); })); }
  if (X === 'tictac') { // reloj de bolsillo con cadena
    const w = G(rig, [-0.6, 0.35, 0.8]); m(cyl(20), gd, null, [1.57, 0, 0], [0.16, 0.04, 0.16], w); m(cyl(20), white, [0, 0, 0.025], [1.57, 0, 0], [0.13, 0.01, 0.13], w); const hd = m(box(), toon('#2a1838'), [0, 0.04, 0.035], null, [0.015, 0.09, 0.01], w);
    for (let i = 0; i < 6; i++) m(torus(0.03, 0.01, 8), gd, [-0.45 + i * 0.07, 0.45 + Math.sin(i) * 0.04, 0.86], [0, i % 2 ? 1.57 : 0, 0]);
    A.push(t => { hd.rotation.z = -t * 3; w.rotation.z = Math.sin(t * 2) * 0.2; }); }
  if (X === 'trueno') { // impermeable con capucha y pendiente de rayo
    m(sph(20), toon('#ffe066', { rim: 0.6 }), [0, 1.15, -0.25], null, [0.95, 0.75, 0.75]);
    m(cone(3), toon('#fff27a', { emissive: '#ffe040', ei: 0.8 }), [0.92, 0.6, 0.2], [0, 0, 0.3], [0.05, 0.16, 0.03]); }
  if (X === 'disco') { // cascos de música y afro
    for (let i = 0; i < 9; i++) m(sph(10), toon('#ff8fd8', { rim: 0.6 }), [Math.cos(i * 0.7) * 0.55, 1.55 + Math.sin(i * 1.3) * 0.08, Math.sin(i * 0.7) * 0.4 - 0.15], null, 0.22);
    m(torus(0.9, 0.04, 24, Math.PI), toon('#2a1838'), [0, 1.0, 0], [0, 1.57, 0]); for (const k of [-1, 1]) { const e = m(cyl(16), toon('#2a1838', { rim: 0.8 }), [k * 0.92, 0.9, 0], [0, 0, 1.57], [0.2, 0.1, 0.2]); m(cyl(16), toon('#7ff5ff', { emissive: '#3fd8ff', ei: 0.7 }), [k * 0.98, 0.9, 0], [0, 0, 1.57], [0.13, 0.02, 0.13]); } }
  if (A.length) root.userData.extra = (root.userData.extra || []).concat(A);
}
function geo3(H, k) { return H.geoShared(k, () => new THREE.ConeGeometry(0.22, 0.5, 3)); }

export function classicVehicle(V, g, anims, H) {
  const { mesh, toon, outline, sph, cyl, cone, box, basic } = H; const m = (gg, mt, p, r, s, par = g) => mesh(gg, mt, par, p, r, s), gd = gold(H), white = toon('#ffffff', { rim: 0.5 });
  if (V === 'teacup') { // banda de porcelana, cara, cucharilla, terrones y vapor
    m(H.geoShared('cupBand', () => new THREE.CylinderGeometry(1.31, 1.2, 0.34, 32, 1, true)), tmat(H, 'porcBand', '#ffffff', T.porcelain(), { side: THREE.DoubleSide }), [0, 0.9, 0]);
    face(H, g, [0, 0.62, 1.32], 0.6, anims, 1);
    const sp = G(g, [0.7, 1.3, -0.6], [0.3, 0, -0.4]); m(capsule(0.03, 0.8), gd, [0, 0.4, 0], null, null, sp); m(sph(10), gd, [0, 0.9, 0], null, [0.1, 0.15, 0.04], sp);
    for (let i = 0; i < 3; i++) m(rbox(0.16, 0.16, 0.16, 0.03), white, [-0.6 + i * 0.2, 0.42, 1.3 - i * 0.05], [0, i, 0]);
    puffs(H, g, 5, toon('#ffffff', { opacity: 0.5, rim: 0.9 }), 0.12, (p, i, t) => { const k = (t * 0.4 + i / 5) % 1; p.position.set(Math.sin(i * 2 + t) * 0.5, 1.6 + k * 1.2, -0.5 - k * 0.3); p.scale.setScalar(0.08 + k * 0.15); }, anims); }
  if (V === 'carousel') { // bombillas que parpadean, guirnalda y cara
    const bulbs = []; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; bulbs.push(m(sph(6), toon('#ffe680', { emissive: '#ffcc33', ei: 1 }), [Math.cos(a) * 1.45, 2.42, Math.sin(a) * 1.45 - 0.2], null, 0.07)); }
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; m(H.geoShared('pen', () => new THREE.ConeGeometry(0.12, 0.25, 3)), toon(['#ff6f9a', '#ffe066', '#7ee3c4', '#8fd8ff'][i % 4], { side: THREE.DoubleSide }), [Math.cos(a) * 1.5, 0.7, Math.sin(a) * 1.5], [Math.PI, a, 0], [1, 1, 0.2]); }
    face(H, g, [0, 0.45, 1.52], 0.55, anims, 1);
    anims.push(t => bulbs.forEach((b, i) => b.visible = ((t * 4 + i) | 0) % 2 === 0)); }
  if (V === 'atom') { face(H, g, [0, 0.95, 0.86], 0.55, anims, 1);
    puffs(H, g, 6, toon('#7ff5ff', { emissive: '#3fd8ff', ei: 1, rim: 0 }), 0.04, (p, i, t) => { const a = t * 6 + i; p.position.set(Math.cos(a) * 1.1, 0.4 + Math.abs(Math.sin(t * 9 + i)) * 0.4, Math.sin(a) * 1.1); }, anims); }
  if (V === 'planet') { const mo = G(g, [0, 0.8, 0]); const moon = m(sph(16), toon('#fff6d0', { rim: 0.7 }), [1.6, 0.3, 0], null, 0.28, mo); face(H, moon, [0, 0, 0.95], 0.9, anims, 0);
    for (let i = 0; i < 3; i++) m(sph(8), toon('#e8dcb0', { rim: 0 }), [Math.cos(i * 2) * 0.5, Math.sin(i * 2) * 0.5, 0.75], null, [0.18, 0.18, 0.1], moon);
    anims.push(t => { mo.rotation.y = t * 1.2; }); }
  if (V === 'sled') { m(rbox(1.92, 0.08, 2.42, 0.04), tmat(H, 'woodDeck', '#ffffff', T.wood('#e0b078', '#9a6a3a')), [0, 0.52, 0]);
    for (const k of [-1, 1]) m(capsule(0.07, 2.4), tmat(H, 'candyR', '#ffffff', candy()), [k * 0.85, 0.15, 0], [1.57, 0, 0]);
    const sm = G(g, [0, 0.6, 1.0]); m(sph(14), white, [0, 0.18, 0], null, 0.22, sm); m(sph(14), white, [0, 0.45, 0], null, 0.16, sm); face(H, sm, [0, 0.47, 0.15], 0.25, anims, 0); m(cone(8), toon('#ff9f4a'), [0, 0.44, 0.2], [1.57, 0, 0], [0.03, 0.1, 0.03], sm);
    puffs(H, g, 6, toon('#ffffff', { opacity: 0.7, rim: 0.9 }), 0.08, (p, i, t) => { const k = (t * 1.2 + i / 6) % 1; p.position.set((i % 2 ? 0.85 : -0.85) + Math.sin(i) * 0.2, 0.1 + k * 0.3, -1.3 - k * 1.2); p.scale.setScalar(0.12 * (1 - k)); }, anims); }
  if (V === 'fishbowl') { face(H, g, [0, 0.27, 1.02], 0.5, anims, 1);
    const weeds = []; for (let i = 0; i < 3; i++) { const w = G(g, [-0.6 + i * 0.6, 0.5, -0.5 + (i % 2) * 0.3]); for (let s = 0; s < 4; s++) m(capsule(0.05, 0.12), toon('#5fc86a', { rim: 0.4 }), [0, s * 0.16, 0], null, null, w); weeds.push(w); }
    m(H.starGeoS(), toon('#ff9f6a', { rim: 0.5 }), [0.7, 0.52, 0.6], [-1.4, 0, 0], 0.12); const cas = G(g, [-0.5, 0.5, 0.5]); m(cyl(8), toon('#ffd6ec'), [0, 0.15, 0], null, [0.15, 0.3, 0.15], cas); m(cone(8), toon('#b9a2f7'), [0, 0.38, 0], null, [0.18, 0.18, 0.18], cas);
    anims.push(t => weeds.forEach((w, i) => w.rotation.z = Math.sin(t * 2 + i) * 0.25)); }
  if (V === 'rocket') { for (const k of [-1, 1]) m(rbox(0.52, 0.12, 0.72, 0.05), tmat(H, 'metalF', '#ffffff', metal()), [k * 0.8, 0.6, -0.9], [0, 0, k * 0.4]);
    puffs(H, g, 6, toon('#e0d8f0', { opacity: 0.5, rim: 0.9 }), 0.15, (p, i, t) => { const k = (t * 0.8 + i / 6) % 1; p.position.set(Math.sin(i * 2) * 0.3 * k, 0.95 + k * 0.4, -2.2 - k * 1.4); p.scale.setScalar(0.1 + k * 0.25); }, anims); }
  if (V === 'clock') { m(rbox(1.72, 0.1, 2.42, 0.04), tmat(H, 'woodClk', '#ffffff', T.wood('#c8904a', '#7a4a1a')), [0, 0.7, 0.2]);
    face(H, g, [0, 0.95, -0.36], 0.5, anims, 1);
    const pen = G(g, [0, 0.9, -0.95]); m(cyl(6), gd, [0, -0.3, 0], null, [0.02, 0.6, 0.02], pen); m(cyl(16), gd, [0, -0.6, 0], [1.57, 0, 0], [0.12, 0.03, 0.12], pen);
    const bird = G(g, [0, 2.45, -0.62]); m(sph(10), toon('#7fd0ff'), null, null, [0.12, 0.1, 0.14], bird); m(cone(6), toon('#ffb84a'), [0, 0, 0.14], [1.57, 0, 0], [0.03, 0.08, 0.03], bird);
    anims.push(t => { pen.rotation.z = Math.sin(t * 3) * 0.4; const c = (t * 0.25) % 1; bird.position.z = -0.62 + (c < 0.15 ? Math.sin(c / 0.15 * Math.PI) * 0.35 : 0); }); }
  if (V === 'cloud') { face(H, g, [0, 0.72, 1.6], 0.6, anims, 1);
    const rb = G(g, [0, 0.5, -1.2]); ['#ff6fa8', '#ffe066', '#7ee38a', '#6fc8ff'].forEach((c, i) => m(torus(0.8 - i * 0.1, 0.05, 24, Math.PI), toon(c, { emissive: c, ei: 0.3, rim: 0 }), null, null, null, rb));
    puffs(H, g, 6, toon('#8fd8ff', { emissive: '#5fc8ff', ei: 0.4 }), 0.05, (d, i, t) => { const k = (t * 1.5 + i / 6) % 1; d.position.set(Math.sin(i * 2.4) * 0.8, 0.15 - k * 0.4, Math.cos(i * 1.9) * 0.6); d.scale.set(0.035, 0.08, 0.035); }, anims); }
  if (V === 'discoball') { const beams = G(g, [0, 0.95, 0]); const bm = basic('#ffffff', { opacity: 0.2 }); bm.blending = THREE.AdditiveBlending;
    for (let i = 0; i < 4; i++) { const b = m(H.geoShared('discoBeam', () => new THREE.ConeGeometry(0.25, 2.2, 10, 1, true)), bm, [Math.cos(i * 1.57) * 1.1, 0.4, Math.sin(i * 1.57) * 1.1], [0, 0, 0], null, beams); b.lookAt(Math.cos(i * 1.57) * 3, 2, Math.sin(i * 1.57) * 3); b.rotateX(Math.PI / 2); }
    for (const k of [-1, 1]) { const sp = G(g, [k * 1.05, 0.45, -0.8]); m(rbox(0.4, 0.55, 0.35, 0.06), toon('#2a1838', { rim: 0.6 }), null, null, null, sp); const w = m(cyl(16), toon('#ff8fd8', { emissive: '#ff4fb0', ei: 0.4 }), [0, 0, 0.18], [1.57, 0, 0], [0.13, 0.03, 0.13], sp); anims.push(t => w.scale.set(0.13 + Math.abs(Math.sin(t * 8)) * 0.04, 0.03, 0.13 + Math.abs(Math.sin(t * 8)) * 0.04)); }
    const nm = toon('#fff6a0', { emissive: '#ffe066', ei: 0.7 }); const notes = []; for (let i = 0; i < 3; i++) { const n = G(g); m(sph(8), nm, null, null, [0.08, 0.06, 0.05], n); m(box(), nm, [0.06, 0.14, 0], null, [0.015, 0.28, 0.015], n); notes.push(n); }
    anims.push(t => { beams.rotation.y = t * 1.5; notes.forEach((n, i) => { const k = (t * 0.6 + i / 3) % 1; n.position.set(Math.sin(i * 2 + t) * 1.0, 1.7 + k * 1.2, -0.4); n.scale.setScalar(1 - k * 0.5); }); }); }
}
