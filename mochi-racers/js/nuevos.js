// v46: 5 pilotos nuevos y gratis (Pipoca, Fresi, Pulpi, Dinito y Lunita): mismo cuerpo y tamaño que los demás,
// con accesorios, animaciones propias y un vehículo muy detallado cada uno (texturas por código, caras que parpadean, partículas).
import * as THREE from 'three';
import { face, puffs, tmat, T, rbox, capsule, lathe, torus, ctex, grp as G, gold } from './premium.js';
const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(46);
const stripesV = (a, b, n = 10) => ctex('nvst' + a + b + n, 256, 64, (x, w, h) => { for (let i = 0; i < n; i++) { x.fillStyle = i % 2 ? a : b; x.fillRect(i * w / n, 0, w / n + 1, h); } });
const TX = {
  wicker: () => ctex('nvwick', 128, 128, (x, w) => { x.fillStyle = '#d9a25c'; x.fillRect(0, 0, w, w); for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const on = (r + c) % 2; x.fillStyle = on ? '#e8b873' : '#b87d3c'; x.beginPath(); x.roundRect(c * 16 + 1, r * 16 + (on ? 1 : 3), 14, on ? 14 : 10, 4); x.fill(); } }, [3, 1]),
  gingham: () => ctex('nving', 128, 128, (x, w) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, w); x.fillStyle = 'rgba(255,90,120,.55)'; for (let i = 0; i < 4; i++) { x.fillRect(i * 32, 0, 16, w); x.fillRect(0, i * 32, w, 16); } }, [2, 1]),
  shell: () => ctex('nvshell', 256, 256, (x, w) => { for (let i = 0; i < 14; i++) { x.fillStyle = i % 2 ? '#ffc2d8' : '#ff8fb8'; x.fillRect(i * w / 14, 0, w / 14 + 1, w); }
    const g = x.createLinearGradient(0, 0, 0, w); g.addColorStop(0, 'rgba(255,255,255,.6)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.25)'); x.fillStyle = g; x.fillRect(0, 0, w, w);
    x.strokeStyle = 'rgba(190,80,130,.35)'; x.lineWidth = 3; for (let k = 1; k < 5; k++) { x.beginPath(); x.moveTo(0, k * 50); x.lineTo(w, k * 50); x.stroke(); } }),
  egg: () => ctex('nvegg', 128, 128, (x, w) => { x.fillStyle = '#fff6e0'; x.fillRect(0, 0, w, w); const cs = ['#8fe06a', '#ff9f4a', '#7fc8ff', '#ff8fb8']; for (let i = 0; i < 26; i++) { x.fillStyle = cs[i % 4]; x.globalAlpha = 0.85; x.beginPath(); x.ellipse(rnd() * w, rnd() * w, 4 + rnd() * 8, 3 + rnd() * 6, rnd() * 3, 0, 6.3); x.fill(); } x.globalAlpha = 1; }, [2, 1]),
  popcorn: () => ctex('nvpop', 128, 128, (x, w) => { x.fillStyle = '#fffbe6'; x.fillRect(0, 0, w, w); for (let i = 0; i < 26; i++) { x.fillStyle = rnd() > 0.5 ? '#ffe08a' : '#ffd05a'; x.globalAlpha = 0.6; x.beginPath(); x.arc(rnd() * w, rnd() * w, 3 + rnd() * 7, 0, 6.3); x.fill(); } x.globalAlpha = 1; }),
  bucketLabel: () => ctex('nvlbl', 128, 128, (x, w) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, w); x.fillStyle = '#ff4f6f'; x.beginPath(); x.roundRect(10, 22, 108, 84, 16); x.fill(); x.fillStyle = '#ffe066'; x.font = 'bold 44px sans-serif'; x.textAlign = 'center'; x.fillText('POP!', 64, 76); x.fillStyle = '#fff'; x.beginPath(); x.arc(30, 36, 4, 0, 6.3); x.arc(98, 36, 4, 0, 6.3); x.fill(); }),
  moon: () => ctex('nvmoon', 128, 128, (x, w) => { const g = x.createLinearGradient(0, 0, w, w); g.addColorStop(0, '#fff6c8'); g.addColorStop(1, '#ffd978'); x.fillStyle = g; x.fillRect(0, 0, w, w); for (let i = 0; i < 9; i++) { const cx = rnd() * w, cy = rnd() * w, r = 4 + rnd() * 9; x.fillStyle = 'rgba(210,160,70,.35)'; x.beginPath(); x.arc(cx, cy, r, 0, 6.3); x.fill(); x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 2; x.beginPath(); x.arc(cx - 1, cy - 1, r, 3.4, 5); x.stroke(); } }, [2, 1]),
  zzz: (c = '#ffffff') => ctex('nvz' + c, 64, 64, (x, w) => { x.font = 'bold 54px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 8; x.strokeStyle = '#5a4ab0'; x.strokeText('Z', 32, 34); x.fillStyle = c; x.fillText('Z', 32, 34); }),
  cap: () => ctex('nvcap', 128, 128, (x, w) => { x.fillStyle = '#5a5ad0'; x.fillRect(0, 0, w, w); x.fillStyle = '#ffe066'; for (let i = 0; i < 8; i++) { x.save(); x.translate(10 + (i % 4) * 32 + (i > 3 ? 16 : 0), 20 + (i > 3 ? 64 : 0)); x.beginPath(); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5, r = k % 2 ? 4 : 9; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.fill(); x.restore(); } }),
  scalesG: () => ctex('nvdino', 128, 128, (x, w) => { x.fillStyle = '#8fe06a'; x.fillRect(0, 0, w, w); x.fillStyle = 'rgba(60,150,60,.28)'; for (let i = 0; i < 12; i++) { x.beginPath(); x.arc(rnd() * w, rnd() * w, 3 + rnd() * 6, 0, 6.3); x.fill(); } }),
};
const glowSprite = (c, s, op = 0.8) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: op })); sp.scale.setScalar(s); return sp; };
const GT = {}; const glowT = c => GT[c] || (GT[c] = ctex('nvg' + c, 64, 64, (x, w) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, c); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); }));
const letterSprite = (c, s) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.zzz(c), transparent: true, depthWrite: false })); sp.scale.setScalar(s); return sp; };

// ================= PILOTOS =================
export function nuevosChar(X, rig, root, H) {
  const { mesh, toon, outline, sph, cyl, cone, box, basic } = H; const A = [], m = (g, mt, p, r, s, par = rig) => mesh(g, mt, par, p, r, s), gd = gold(H), white = toon('#ffffff', { rim: 0.5 });
  if (X === 'pipoca') {
    // sombrero de palomitas: 9 flores esponjosas que saltan «pop», cuello de cucurucho a rayas, gafas de cine 3D y granitos dorados en órbita
    const hat = G(rig, [0, 1.46, 0.02]), pm = tmat(H, 'popM', '#ffffff', TX.popcorn(), { rim: 0.6 }), dent = toon('#ffd05a', { rim: 0.2 });
    const puff = [[0, 0.18, 0, 0.3], [0.3, 0.1, 0.1, 0.22], [-0.3, 0.1, 0.08, 0.22], [0.12, 0.1, -0.3, 0.22], [-0.16, 0.1, -0.28, 0.2], [0.1, 0.1, 0.32, 0.2], [-0.1, 0.34, -0.05, 0.2], [0.22, 0.32, -0.1, 0.17], [-0.26, 0.3, 0.12, 0.17]];
    const pops = puff.map(([x, y, z, r], i) => { const q = G(hat, [x, y, z]); const s = m(sph(14), pm, null, null, [r, r * 0.9, r], q); outline(s, '#c89a3a', 1.07);
      for (let k = 0; k < 3; k++) m(sph(6), dent, [Math.sin(i * 3 + k * 2) * r * 0.8, Math.cos(i + k) * r * 0.5, Math.cos(i * 3 + k * 2) * r * 0.8], null, r * 0.3, q); return [q, y, i]; });
    A.push(t => pops.forEach(([q, y, i]) => { const c = (t * 0.7 + i * 0.37) % 2.4, p = c < 0.35 ? Math.sin(c / 0.35 * Math.PI) : 0; q.position.y = y + p * 0.22; q.scale.setScalar(1 + p * 0.3 - (c > 0.35 && c < 0.5 ? 0.06 : 0)); }));
    m(lathe('popCollar', [[0.8, 0], [0.9, 0.04], [0.98, 0.3], [0.9, 0.34], [0.78, 0.26]], 28), tmat(H, 'popCol', '#ffffff', stripesV('#ff4f6f', '#ffffff', 12), { side: THREE.DoubleSide, rim: 0.4 }), [0, 0.34, 0.03]);
    for (const k of [-1, 1]) { m(rbox(0.36, 0.3, 0.04, 0.03), toon('#2a1838', { rim: 0.4 }), [k * 0.37, 0.89, 0.97], [0, k * 0.38, 0]); m(rbox(0.3, 0.24, 0.02, 0.02), basic(k < 0 ? '#ff4f5f' : '#3fd0ff', { opacity: 0.5 }), [k * 0.37, 0.89, 1.0], [0, k * 0.38, 0]).renderOrder = 5; }
    m(rbox(0.16, 0.05, 0.04, 0.02), toon('#2a1838'), [0, 0.92, 1.02]);
    const orb = G(rig, [0, 0.95, 0]); for (let i = 0; i < 3; i++) { const k = m(sph(8), toon('#ffcf4a', { emissive: '#ffb020', ei: 0.35, rim: 0.6 }), [Math.cos(i * 2.09) * 1.15, 0.2 * Math.sin(i * 2), Math.sin(i * 2.09) * 1.15], null, [0.09, 0.12, 0.09], orb); }
    A.push(t => { orb.rotation.y = t * 1.6; orb.position.y = 0.95 + Math.sin(t * 3) * 0.08; });
  }
  if (X === 'fresi') {
    // fresa con nata: corona de hojas helicóptero, remolino de nata, pepitas por todo el cuerpo y una abejita amiga
    const leaf = toon('#5fd070', { rim: 0.6, side: THREE.DoubleSide }), crown = G(rig, [0, 1.5, 0]); const blades = G(crown, [0, 0.12, 0]);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; const l = G(blades, [Math.sin(a) * 0.12, 0, Math.cos(a) * 0.12], [0.3, a, 0]); const s = m(sph(10), leaf, [0, 0, 0.25], null, [0.13, 0.04, 0.34], l); outline(s, '#2a7a3a', 1.1); m(box(), toon('#3fa850', { rim: 0 }), [0, 0.03, 0.25], null, [0.015, 0.005, 0.6], l); }
    const cr = toon('#ffffff', { rim: 0.9 }); for (let i = 0; i < 4; i++) { const c = m(sph(12), cr, [0, 0.12 + i * 0.13, 0], null, [0.2 - i * 0.04, 0.11, 0.2 - i * 0.04], crown); outline(c, '#d8b0c8', 1.06); }
    m(cone(8), cr, [0, 0.68, 0], null, [0.06, 0.16, 0.06], crown); m(sph(8), toon('#ff3f5f', { emissive: '#ff2a4a', ei: 0.4, rim: 0.8 }), [0.06, 0.5, 0.1], null, 0.05, crown); // cereza
    A.push(t => { blades.rotation.y = t * 1.4; crown.position.y = 1.5 + Math.sin(t * 2.4) * 0.025; });
    const seed = toon('#ffe27a', { rim: 0.3 }); for (let i = 0; i < 16; i++) { const a = -1.3 + (i % 8) * 0.37, y = 0.35 + Math.floor(i / 8) * 0.38 + (i % 3) * 0.08, r = 0.93 - Math.abs(y - 0.8) * 0.2; const sd = m(H.dropGeo(), seed, [Math.sin(a) * r, y, Math.cos(a) * r * 0.9 + 0.04], [Math.PI * 0.5 + 0.3, a, 0], 0.035); if (Math.abs(a) < 0.9 && y > 0.65 && y < 1.1) sd.visible = false; }
    const bee = G(rig, [0, 1.9, 0]); m(sph(10), toon('#ffd23a', { rim: 0.4 }), null, null, [0.1, 0.08, 0.13], bee); for (const z of [-0.03, 0.04]) m(box(), toon('#2a1838', { rim: 0 }), [0, 0, z], null, [0.2, 0.03, 0.025], bee);
    const wg = [-1, 1].map(k => m(sph(8), basic('#ffffff', { opacity: 0.7 }), [k * 0.1, 0.09, 0], [0, 0, k * 0.5], [0.12, 0.02, 0.07], bee)); m(sph(6), toon('#2a1838'), [0, 0.01, 0.12], null, 0.03, bee);
    A.push(t => { const a = t * 1.5; bee.position.set(Math.cos(a) * 1.1, 1.65 + Math.sin(t * 5) * 0.1, Math.sin(a) * 0.9 + 0.1); bee.rotation.y = -a + Math.PI; wg.forEach((w, i) => w.rotation.z = (i ? 1 : -1) * (0.3 + Math.sin(t * 60) * 0.45)); });
  }
  if (X === 'pulpi') {
    // pulpito DJ: 6 coletas de tentáculos con ventosas que ondean, cascos con luces al ritmo, chicle-burbuja y gafas de buceo en la frente
    const tm = toon('#5fa8ff', { rim: 0.6 }), sk = toon('#ffb3d9', { rim: 0.2 }), tents = [];
    for (let i = 0; i < 6; i++) { const a = -0.3 + i / 5 * 3.6 - 1.65, base = G(rig, [Math.sin(a) * 0.62, 1.25 + Math.cos(a) * 0.3, -0.12 + Math.cos(a) * 0.35 * -1], [0, 0, 0]); const segs = [];
      let p = base; for (let k = 0; k < 4; k++) { const sg = G(p, [0, k ? 0.16 : 0.05, 0]); const sz = 0.15 - k * 0.025; const b = m(sph(10), tm, [0, 0.08, 0], null, [sz, 0.14, sz], sg); if (k < 3) outline(b, '#2a5aa8', 1.08); m(sph(5), sk, [0, 0.1, sz * 0.9], null, 0.035, sg); segs.push(sg); p = sg; } tents.push([base, segs, a, i]);
      base.rotation.z = -Math.sin(a) * 0.9; }
    A.push(t => tents.forEach(([b, segs, a, i]) => segs.forEach((s, k) => { s.rotation.z = Math.sin(t * 3.2 - k * 0.7 + i) * 0.28 + (Math.sin(a) > 0 ? -0.2 : 0.2); s.rotation.x = Math.cos(t * 2.6 - k * 0.6 + i) * 0.18; })));
    const hp = toon('#ff6fb0', { rim: 0.7, emissive: '#ff2a8a', ei: 0.2 }); m(torus(0.9, 0.04, 28, Math.PI), toon('#2a1838', { rim: 0.5 }), [0, 0.8, 0], [0, 0, 0], [1, 0.9, 1]);
    const cups = [-1, 1].map(k => { const c = m(cyl(18), hp, [k * 0.9, 0.8, 0.06], [0, 0, Math.PI / 2], [0.27, 0.16, 0.27]); outline(c, '#7a1a50', 1.08); const r = m(torus(0.2, 0.03, 20), toon('#7ff5ff', { emissive: '#3fd8ff', ei: 1, rim: 0 }), [k * 1.0, 0.8, 0.06], [0, Math.PI / 2, 0]); return r; });
    A.push(t => cups.forEach((r, i) => { const p = (Math.sin(t * 8 + i * 0.5) + 1) / 2; r.scale.setScalar(0.9 + p * 0.35); r.material.emissiveIntensity = 0.5 + p; }));
    const g = m(sph(14), toon('#ffb3d9', { opacity: 0.65, rim: 0.9 }), [0.1, 0.62, 1.0], null, 0.1); g.renderOrder = 5;
    A.push(t => { const c = (t * 0.45) % 1; g.scale.setScalar(0.04 + Math.min(1, c * 1.2) * 0.2); g.visible = c < 0.93; g.position.y = 0.62 + c * 0.04; });
    m(torus(0.17, 0.035, 16), toon('#ffe066', { rim: 0.6 }), [-0.35, 1.28, 0.7], [0.5, -0.3, 0]); m(torus(0.17, 0.035, 16), toon('#ffe066', { rim: 0.6 }), [0.35, 1.28, 0.7], [0.5, 0.3, 0]); // gafas de buceo
    for (const k of [-1, 1]) m(sph(10), basic('#bff4ff', { opacity: 0.45 }), [k * 0.35, 1.28, 0.7], [0.5, k * 0.3, 0], [0.16, 0.16, 0.02]).renderOrder = 5;
  }
  if (X === 'dinito') {
    // bebé dino de caramelo: cáscara de huevo de sombrero, cresta arcoíris, cola con bola de caramelo, flotador de donut y lunares
    const sh = toon('#fff6e0', { rim: 0.5, side: THREE.DoubleSide }), cap = G(rig, [0, 1.44, 0], [0.1, 0, 0.05]);
    m(geo2(H, 'eggCap'), sh, [0, 0, 0], null, [0.62, 0.5, 0.62], cap); const ring = G(cap, [0, 0.02, 0]); for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283; m(cone(3), sh, [Math.cos(a) * 0.6, 0.02, Math.sin(a) * 0.6], [0, -a, 0], [0.13, 0.2, 0.05], ring); }
    for (let i = 0; i < 7; i++) m(sph(6), toon(['#8fe06a', '#ff9f4a', '#7fc8ff', '#ff8fb8'][i % 4], { rim: 0.2 }), [Math.sin(i * 2.4) * 0.38, 0.2 + (i % 3) * 0.1, Math.cos(i * 2.4) * 0.38], null, [0.07, 0.05, 0.07], cap);
    const cols = ['#ff6f9a', '#ffb84a', '#ffe066', '#7ee3a8', '#7fc8ff', '#b98cff'], plates = [];
    for (let i = 0; i < 6; i++) { const f = 0.25 + i * 0.3, p = G(rig, [0, 0.8 + Math.cos(f) * 0.86, -Math.sin(f) * 0.84], [-f, 0, 0]); const pl = m(cone(4), toon(cols[i], { rim: 0.6 }), [0, 0.1, 0], [0, Math.PI / 4, 0], [0.13, 0.26 - i * 0.015, 0.06], p); outline(pl, '#6a3a6a', 1.1); plates.push(p); }
    A.push(t => plates.forEach((p, i) => { p.scale.setScalar(1 + Math.sin(t * 4 - i * 0.6) * 0.1); }));
    const tail = G(rig, [0, 0.3, -0.85], [0.4, 0, 0]); const tseg = []; let tp = tail; for (let i = 0; i < 4; i++) { const s = G(tp, [0, 0, -0.17 * (i ? 1 : 0.2)]); m(sph(10), toon('#8fe06a', { rim: 0.6 }), [0, 0, -0.08], null, [0.2 - i * 0.04, 0.17 - i * 0.03, 0.2 - i * 0.02], s); tseg.push(s); tp = s; }
    m(sph(10), toon('#ff6f9a', { emissive: '#ff3f7a', ei: 0.3, rim: 0.9 }), [0, 0, -0.3], null, 0.11, tp); A.push(t => tseg.forEach((s, i) => { s.rotation.y = Math.sin(t * 6 - i * 0.7) * 0.35; }));
    const dn = m(torus(0.82, 0.19, 28), toon('#ff9fc8', { rim: 0.7 }), [0, 0.42, 0.03], [Math.PI / 2 + 0.12, 0, 0]); outline(dn, '#a04a7a', 1.05); const sp = toon('#ffffff', { rim: 0 });
    for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283; m(box(), toon(cols[i % 6], { rim: 0 }), [Math.sin(a) * 0.82, 0.58 - Math.abs(Math.cos(a)) * 0.02, Math.cos(a) * 0.82 * 0.97], [0, a, 0.7 + i], [0.07, 0.025, 0.025]); }
    for (let i = 0; i < 6; i++) m(sph(6), toon('#5fb84a', { rim: 0 }), [Math.sin(i * 2.7) * 0.7, 0.4 + (i % 3) * 0.3, Math.cos(i * 2.7) * 0.5 - 0.5 * (i % 2)], null, 0.06);
  }
  if (X === 'lunita') {
    // dormilona con gorro de dormir de estrellas y pompón que se columpia, Zzz flotantes, collar de lunita y estrella fugaz amiga
    const cap = G(rig, [0, 1.42, 0], [0, 0, -0.1]); m(cyl(20), tmat(H, 'nightcap', '#ffffff', TX.cap(), { rim: 0.5 }), [0, 0.04, 0], null, [0.66, 0.2, 0.66], cap); m(torus(0.64, 0.08, 24), toon('#ffffff', { rim: 0.9 }), [0, -0.04, 0], [Math.PI / 2, 0, 0], null, cap);
    const tail = G(cap, [0, 0.12, 0]); const ts = []; let tp = tail; for (let i = 0; i < 4; i++) { const s = G(tp, [i ? 0.2 : 0.05, i ? 0.08 : 0.12, 0]); m(cone(14), tmat(H, 'nightcap', '#ffffff', TX.cap(), { rim: 0.5 }), [0.0, 0.1, 0], [0, 0, -1.2 + i * 0.1], [0.34 - i * 0.07, 0.38, 0.34 - i * 0.07], s); ts.push(s); tp = s; }
    const pom = m(sph(12), toon('#ffe066', { emissive: '#ffcc33', ei: 0.5, rim: 0.9 }), [0.28, -0.06, 0], null, 0.14, tp); pom.add(glowSprite('#ffe066', 4, 0.6));
    A.push(t => { ts.forEach((s, i) => { s.rotation.z = Math.sin(t * 1.6 - i * 0.5) * 0.12 - 0.18; }); pom.position.y = -0.06 + Math.sin(t * 3) * 0.03; cap.rotation.z = -0.1 + Math.sin(t * 1.2) * 0.04; });
    const zz = [0, 1, 2].map(i => { const s = letterSprite(['#ffffff', '#ffe9a0', '#d8d0ff'][i], 0.3); rig.add(s); return s; });
    A.push(t => zz.forEach((s, i) => { const k = (t * 0.32 + i / 3) % 1; s.position.set(0.55 + k * 0.45 + Math.sin(k * 6) * 0.05, 1.45 + k * 0.9, 0.3); s.scale.setScalar(0.12 + k * 0.28); s.material.opacity = Math.min(1, k * 4) * (1 - k); }));
    m(torus(0.5, 0.025, 20), toon('#ffe066', { rim: 0.6 }), [0, 0.5, 0.78], [0.35, 0, 0], [0.7, 0.8, 1]); m(geo2(H, 'crescent'), gd, [0, 0.2, 0.93], [0, 0, 0.3], 0.13);
    for (let i = 0; i < 3; i++) m(H.starGeoS(), toon('#fff6a0', { emissive: '#ffe066', ei: 0.9, rim: 0 }), [-0.55 + i * 0.1, 0.45 - i * 0.12, 0.8], [0, 0.3, i], 0.05);
    const ss = G(rig, [0, 1.8, 0]); m(H.starGeoS(), toon('#fff6a0', { emissive: '#ffe066', ei: 1, rim: 0 }), null, [0, 0, 0], 0.11, ss); ss.add(glowSprite('#fff0a0', 0.55, 0.9)); const trail = [1, 2, 3, 4].map(k => { const s = glowSprite('#ffe9a0', 0.3 - k * 0.04, 0.6 - k * 0.12); ss.add(s); s.position.set(-k * 0.16, 0.02 * k, 0); return s; });
    A.push(t => { const a = t * 1.2 + 2; ss.position.set(Math.cos(a) * 1.15, 1.8 + Math.sin(t * 2.3) * 0.18, Math.sin(a) * 0.8 + 0.15); ss.rotation.y = -a + Math.PI / 2; ss.children[0].rotation.z = t * 3; });
  }
  if (A.length) root.userData.extra = (root.userData.extra || []).concat(A);
}
function geo2(H, k) {
  return H.geoShared(k, () => {
    if (k === 'eggCap') return new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const s = new THREE.Shape(); s.absarc(0, 0, 1, 0.45 * Math.PI, 1.55 * Math.PI, false); s.absarc(0.45, 0, 0.8, 1.45 * Math.PI, 0.55 * Math.PI, true);
    return new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.08, bevelSegments: 2 });
  });
}

// ================= VEHÍCULOS =================
export function nuevosVehicle(V, g, wheel, anims, C, OL, H) {
  const { mesh, toon, outline, sph, cyl, cone, box, basic } = H; const m = (gg, mt, p, r, s, par = g) => mesh(gg, mt, par, p, r, s), gd = gold(H), white = toon('#ffffff', { rim: 0.5 });
  if (V === 'popbucket') {
    // cubo de palomitas a rayas con etiqueta «POP!», palomitas que saltan, cara con parpadeo y ruedas de caramelo
    const buck = m(lathe('popBucket', [[0.001, 0], [0.82, 0], [0.9, 0.05], [1.05, 0.7], [1.2, 1.05], [1.26, 1.1], [1.14, 1.08], [1.04, 1.0], [0.001, 0.2]], 32), tmat(H, 'popBuckM', '#ffffff', stripesV('#ff4f6f', '#ffffff', 16), { side: THREE.DoubleSide, rim: 0.4 }), [0, 0.3, 0]); outline(buck, '#a02040', 1.03);
    m(torus(1.2, 0.07, 32), toon('#ff4f6f', { rim: 0.6 }), [0, 1.4, 0], [Math.PI / 2, 0, 0]);
    const lb = m(rbox(0.9, 0.7, 0.05, 0.04), tmat(H, 'popLbl', '#ffffff', TX.bucketLabel()), [0, 0.8, 1.1], [-0.2, 0, 0]);
    const pm = tmat(H, 'popM', '#ffffff', TX.popcorn(), { rim: 0.6 }), heap = [];
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 + (i % 2) * 0.2, r = 1.18 + (i % 3) * 0.03; const p = m(sph(12), pm, [Math.cos(a) * r, 1.5 + (i % 3) * 0.05, Math.sin(a) * r * 0.92 - 0.05], null, [0.24, 0.2, 0.24]); outline(p, '#c89a3a', 1.07); heap.push(p); }
    const fly = []; for (let i = 0; i < 7; i++) fly.push(m(sph(10), pm, [0, 2, 0], null, 0.14));
    anims.push((t, sp) => { fly.forEach((f, i) => { const k = (t * (0.5 + sp * 0.5) + i / 7) % 1, a = i * 2.4; f.position.set(Math.cos(a) * 1.3 * (0.8 + k * 0.4), 1.7 + Math.sin(k * Math.PI) * 1.2, Math.sin(a) * 1.2 * (0.8 + k * 0.4) - 0.1); f.rotation.set(t * 4 + i, t * 3, 0); }); heap.forEach((h, i) => { h.position.y = 1.5 + (i % 3) * 0.05 + Math.max(0, Math.sin(t * 5 + i * 1.7)) * 0.05; }); });
    face(H, g, [0, 0.62, 1.12], 0.8, anims, 1, 0);
    for (const [x, z] of [[-1.05, 0.95], [1.05, 0.95], [-1.05, -0.95], [1.05, -0.95]]) { const w = wheel(x, z, 0.32, '#ffe066'); m(sph(6), toon('#ff4f6f'), [0, 0.2, 0], null, 0.06, w); }
    return 1.2;
  }
  if (V === 'basket') {
    // cesta de merienda de mimbre con mantel de cuadros, asa, fresas, sándwich y corazoncitos
    const bk = m(lathe('nvBasket', [[0.001, 0], [0.9, 0], [1.1, 0.2], [1.3, 1.0], [1.36, 1.1], [1.28, 1.1], [1.1, 0.9], [0.001, 0.1]], 32), tmat(H, 'wickM', '#ffffff', TX.wicker(), { side: THREE.DoubleSide, rim: 0.3 }), [0, 0.3, 0]); outline(bk, '#7a4a1a', 1.03);
    m(torus(1.33, 0.08, 32), toon('#b87d3c', { rim: 0.4 }), [0, 1.4, 0], [Math.PI / 2, 0, 0]);
    const cloth = tmat(H, 'gingM', '#ffffff', TX.gingham(), { side: THREE.DoubleSide, rim: 0.3 });
    for (let i = 0; i < 6; i++) { const a = -1.2 + i * 0.48; m(rbox(0.5, 0.5, 0.04, 0.02), cloth, [Math.sin(a) * 1.3, 1.25, Math.cos(a) * 1.3], [0.3, a, 0.1 * (i % 2 ? 1 : -1)]); }
    m(torus(1.1, 0.06, 20, Math.PI), toon('#b87d3c', { rim: 0.4 }), [0, 1.4, -0.4], [0, 0, 0]);
    const fr = []; for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.4; const s = m(H.dropGeo(), toon('#ff3f5f', { rim: 0.8 }), [Math.cos(a) * 1.0, 1.55, Math.sin(a) * 0.95 - 0.1], [Math.PI, 0, 0], 0.17); m(cone(5), toon('#5fc86a'), [0, 0.05, 0], [Math.PI, 0, 0], [0.7, 0.3, 0.7], s); fr.push(s); }
    const hs = []; for (let i = 0; i < 5; i++) hs.push(m(H.starGeoS(), toon('#ff8fb8', { emissive: '#ff4f9a', ei: 0.5, rim: 0 }), [0, 2, 0], null, 0.07));
    anims.push((t) => { hs.forEach((h, i) => { const k = (t * 0.4 + i / 5) % 1; h.position.set(Math.sin(i * 2.1 + t) * 0.8, 1.7 + k * 1.3, Math.cos(i * 1.7) * 0.8 - 0.2); h.scale.setScalar(0.09 * (1 - k)); h.rotation.z = t * 2 + i; }); fr.forEach((f, i) => { f.rotation.z = Math.sin(t * 3 + i) * 0.1; }); });
    face(H, g, [0, 0.85, 1.28], 0.9, anims, 1, 0);
    for (const [x, z] of [[-1.1, 0.95], [1.1, 0.95], [-1.1, -0.95], [1.1, -0.95]]) { const w = wheel(x, z, 0.32, '#fff0f0'); m(sph(6), toon('#ff6f86'), [0, 0.2, 0], null, 0.07, w); }
    return 1.0;
  }
  if (V === 'scallop') {
    // concha de vieira rosa con costillas, tapa que abre y cierra, perla brillante, estrellas de mar y burbujas
    const tex = tmat(H, 'shellM', '#ffffff', TX.shell(), { side: THREE.DoubleSide, rim: 0.5 });
    const lower = m(geo2s(H, 'shellLow'), tex, [0, 0.5, -0.1], null, [1.5, 1.0, 1.5]); outline(lower, '#b04a7a', 1.03);
    const lid = G(g, [0, 0.85, -1.3], [-1.1, 0, 0]); const up = m(geo2s(H, 'shellLow'), tex, [0, 0, 1.3], [0, 0, 0], [1.5, 0.75, 1.5], lid); outline(up, '#b04a7a', 1.03);
    const pearl = m(sph(16), toon('#ffffff', { emissive: '#bff0ff', ei: 0.6, rim: 1 }), [0, 0.7, 1.35], null, 0.2); pearl.add(glowSprite('#cfe8ff', 6, 0.7));
    for (const k of [-1, 1]) { const s = m(H.starGeoS(), toon('#ff9f6a', { rim: 0.6 }), [k * 1.1, 0.95, 0.9], [-0.4, k * 0.4, k * 0.5], 0.2); outline(s, '#a0502a', 1.1); }
    const bub = puffs(H, g, 6, toon('#e8fbff', { opacity: 0.55, rim: 0.9 }), 0.12, (p, i, t) => { const k = (t * 0.5 + i / 6) % 1; p.position.set(Math.sin(i * 2.7 + t) * 1.0, 0.8 + k * 1.8, Math.cos(i * 1.9) * 0.9 - 0.4); p.scale.setScalar(0.06 + k * 0.1); }, anims);
    face(H, g, [0, 0.55, 1.2], 0.9, anims, 1, 0);
    anims.push(t => { lid.rotation.x = -1.1 - Math.sin(t * 1.8) * 0.1; pearl.scale.setScalar(0.2 + Math.sin(t * 4) * 0.02); });
    for (const [x, z] of [[-1.1, 0.8], [1.1, 0.8], [-1.1, -0.9], [1.1, -0.9]]) { const w = wheel(x, z, 0.3, '#bfe8ff'); m(sph(6), toon('#ff8fb8'), [0, 0.2, 0], null, 0.07, w); }
    return 0.85;
  }
  if (V === 'egg') {
    // huevo de dino con lunares abierto por arriba (cascarón con dientes de sierra), nido de paja, huellas, confeti de eclosión
    const eg = m(lathe('nvEgg', [[0.001, 0], [0.7, 0.02], [1.2, 0.45], [1.38, 0.9], [1.3, 1.3], [1.14, 1.5], [1.04, 1.46], [1.2, 1.28], [1.26, 0.9], [1.1, 0.55], [0.001, 0.2]], 32), tmat(H, 'eggM', '#ffffff', TX.egg(), { side: THREE.DoubleSide, rim: 0.4 }), [0, 0.35, 0]); outline(eg, '#b08a50', 1.03);
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; m(cone(3), toon('#fff6e0', { side: THREE.DoubleSide, rim: 0.5 }), [Math.cos(a) * 1.1, 1.98, Math.sin(a) * 1.1], [0, -a, 0], [0.19, 0.34, 0.06]); }
    const hay = toon('#e8c060', { rim: 0.4 }); for (let i = 0; i < 22; i++) { const a = i / 22 * 6.283; m(capsule(0.04, 0.5), hay, [Math.cos(a) * 1.3, 0.45 + (i % 3) * 0.05, Math.sin(a) * 1.3], [0.3 * Math.sin(i), -a, 1.4 + (i % 4) * 0.2]); }
    m(sph(14), toon('#ffd36b', { rim: 0.6 }), [0, 0.85, -0.15], null, [0.9, 0.2, 1.0]);
    for (let i = 0; i < 3; i++) { m(sph(8), toon('#8fe06a', { rim: 0.2 }), [-0.5 + i * 0.5, 0.4, 1.35 - Math.abs(i - 1) * 0.04], null, [0.16, 0.2, 0.05]); for (const k of [-1, 0, 1]) m(sph(5), toon('#8fe06a'), [-0.5 + i * 0.5 + k * 0.12, 0.55, 1.37], null, 0.05); }
    const cf = puffs(H, g, 12, toon('#ffffff', { emissive: '#ffffff', ei: 0.4, rim: 0 }), 0.06, (p, i, t) => { const k = (t * 0.6 + i / 12) % 1; p.position.set(Math.sin(i * 2.3) * (0.3 + k * 0.9), 1.9 + k * 1.1 - k * k * 0.9, Math.cos(i * 1.7) * (0.3 + k * 0.8)); p.scale.setScalar(0.06 * (1 - k)); p.material = cfM[i % 4]; }, anims);
    face(H, g, [0, 0.85, 1.34], 0.9, anims, 1, 0);
    anims.push(t => { g.rotation.z = Math.sin(t * 2) * 0.025; });
    for (const [x, z] of [[-1.15, 0.9], [1.15, 0.9], [-1.15, -0.9], [1.15, -0.9]]) { const w = wheel(x, z, 0.34, '#ffb84a'); m(sph(6), toon('#8fe06a'), [0, 0.2, 0], null, 0.08, w); }
    return 1.3;
  }
  if (V === 'crescent') {
    // luna creciente dorada con cráteres, estrellitas colgantes que titilan, cara dormilona y ruedas de nube
    const cr = m(geo2s(H, 'crescent'), tmat(H, 'moonM', '#ffffff', TX.moon(), { rim: 0.6 }), [0, 0.3, 0.0], null, 0.85); outline(cr, '#b8863a', 1.025);
    for (const k of [-1, 1]) for (let i = 0; i < 4; i++) m(sph(8), toon('#e8b860', { rim: 0.2 }), [k * 0.62, 0.85 + (i % 2) * 0.2, -0.6 + i * 0.42], null, [0.03, 0.12 - i * 0.015, 0.12 - i * 0.015]);
    const st = []; for (let i = 0; i < 5; i++) { const a = i * 1.3; const c = G(g, [Math.cos(a) * 1.0, 2.0, Math.sin(a) * 1.0 - 0.3]); m(cyl(5), toon('#ffffff', { rim: 0 }), [0, -0.25, 0], null, [0.008, 0.5, 0.008], c); m(H.starGeoS(), toon(['#fff6a0', '#ffd0f0', '#bfe8ff'][i % 3], { emissive: '#ffe066', ei: 0.9, rim: 0 }), null, null, 0.1, c).add(glowSprite('#ffe9a0', 4, 0.5)); st.push(c); }
    anims.push(t => st.forEach((c, i) => { c.rotation.y = t * 1.2 + i; c.position.y = 2.0 + Math.sin(t * 2 + i) * 0.1; const s = 1 + Math.sin(t * 6 + i * 2) * 0.2; c.scale.setScalar(s); }));
    face(H, g, [0, 0.95, 1.3], 0.62, anims, 1, 0);
    const cl = toon('#ffffff', { rim: 0.8 }); for (const [x, z] of [[-1.0, 0.9], [1.0, 0.9], [-1.0, -0.9], [1.0, -0.9]]) { const w = wheel(x, z, 0.3, '#e8f0ff'); }
    const zc = [0, 1].map(i => { const s = letterSprite(i ? '#ffe9a0' : '#fff', 0.4); g.add(s); return s; });
    anims.push(t => { g.rotation.z = Math.sin(t * 1.5) * 0.03; zc.forEach((s, i) => { const k = (t * 0.3 + i / 2) % 1; s.position.set(0.3 + k * 0.4, 2.3 + k * 0.9, 1.1); s.scale.setScalar(0.15 + k * 0.3); s.material.opacity = Math.min(1, k * 4) * (1 - k); }); });
    return 0.9;
  }
  return null;
}
const cfM = ['#ff6f9a', '#ffe066', '#7ee3a8', '#7fc8ff'].map(c => new THREE.MeshBasicMaterial({ color: c }));
function geo2s(H, k) {
  return H.geoShared('nv' + k, () => {
    if (k === 'shellLow') { const g = new THREE.SphereGeometry(1, 40, 12, 0, Math.PI * 2, 0, Math.PI * 0.5); // media cúpula con abanico
      const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(x, z); p.setY(i, p.getY(i) * (1 + Math.cos(a * 7) * 0.05)); } g.computeVertexNormals(); return g; }
    // crescent
    const s = new THREE.Shape(); const R = 1.5; s.absarc(0, R, R, Math.PI * 0.84, Math.PI * 2.16, false); s.absarc(0, R + 0.45, R - 0.2, Math.PI * 2.12, Math.PI * 0.88, true);
    const e = new THREE.ExtrudeGeometry(s, { depth: 1.3, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.1, bevelSegments: 3, curveSegments: 28 }); e.rotateY(-Math.PI / 2); e.translate(0.65, 0, 0); return e;
  });
}
