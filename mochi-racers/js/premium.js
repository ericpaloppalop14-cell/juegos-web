// v20: 8 pilotos premium con mucho detalle: texturas por código (escamas, madera, porcelana, papel, cromo, pan, glaseado, ladrillo),
// geometría redondeada, caras con parpadeo en los vehículos y animaciones propias. Todo cacheado (geometrías, materiales y texturas compartidos).
import * as THREE from 'three';
const G = (p, pos, rot, scl) => { const g = new THREE.Group(); if (pos) g.position.set(...pos); if (rot) g.rotation.set(...rot); if (scl) (typeof scl === 'number' ? g.scale.setScalar(scl) : g.scale.set(...scl)); p.add(g); return g; };
const GEO = {}, geo = (k, f) => GEO[k] || (GEO[k] = f());
const TEX = {}, MAT = {};
function ctex(k, w, h, draw, rep) { if (TEX[k]) return TEX[k]; const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); } return TEX[k] = t; }
// material toon con textura (cacheado por nombre)
function tmat(H, k, color, tex, o = {}) { if (MAT[k]) return MAT[k]; const m = H.toon(color, { ...o, nocache: true }); m.map = tex; m.needsUpdate = true; return MAT[k] = m; }
const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7);
// ---------- texturas ----------
const T = {
  scales: (c1, c2) => ctex('sc' + c1 + c2, 128, 128, (x, w) => { x.fillStyle = c1; x.fillRect(0, 0, w, w); for (let r = 0; r < 9; r++) for (let i = -1; i < 9; i++) { const cx = i * 16 + (r % 2) * 8, cy = r * 16;
    const g = x.createRadialGradient(cx, cy - 4, 1, cx, cy, 11); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(0.6, c1); g.addColorStop(1, c2); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, 10, 0, Math.PI); x.fill();
    x.strokeStyle = 'rgba(80,40,20,.25)'; x.lineWidth = 1.2; x.beginPath(); x.arc(cx, cy, 10, 0.1, Math.PI - 0.1); x.stroke(); } }, [2, 2]),
  wood: (c1, c2) => ctex('wd' + c1, 128, 256, (x, w, h) => { x.fillStyle = c1; x.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { x.strokeStyle = i % 3 ? c2 : 'rgba(255,240,200,.25)'; x.globalAlpha = 0.25 + rnd() * 0.35; x.lineWidth = 1 + rnd() * 3; x.beginPath(); const X = rnd() * w; x.moveTo(X, 0);
    for (let y = 0; y <= h; y += 16) x.lineTo(X + Math.sin(y * 0.05 + i) * 4, y); x.stroke(); } x.globalAlpha = 1; for (let i = 0; i < 3; i++) { x.strokeStyle = c2; x.lineWidth = 1.5; x.beginPath(); x.ellipse(rnd() * w, rnd() * h, 5, 12, 0, 0, 6.3); x.stroke(); } }),
  porcelain: () => ctex('porc', 256, 128, (x, w, h) => { x.fillStyle = '#fbfcff'; x.fillRect(0, 0, w, h); x.strokeStyle = '#4a6ad8'; x.fillStyle = '#4a6ad8';
    x.lineWidth = 3; for (const y of [10, h - 10]) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); } x.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) { const cx = 32 + i * 64, cy = h / 2; for (let k = 0; k < 6; k++) { x.save(); x.translate(cx, cy); x.rotate(k * 1.047); x.beginPath(); x.ellipse(0, -11, 5, 10, 0, 0, 6.3); x.globalAlpha = 0.8; x.fill(); x.restore(); }
      x.globalAlpha = 1; x.fillStyle = '#ffd36a'; x.beginPath(); x.arc(cx, cy, 4, 0, 6.3); x.fill(); x.fillStyle = '#4a6ad8'; x.beginPath(); x.moveTo(cx + 22, cy); x.quadraticCurveTo(cx + 32, cy - 22, cx + 42, cy); x.stroke(); } }, [2, 1]),
  paper: () => ctex('pap', 256, 256, (x, w, h) => { x.fillStyle = '#fffdf3'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(120,150,220,.35)'; x.lineWidth = 1; for (let y = 16; y < h; y += 16) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); }
    x.strokeStyle = 'rgba(255,100,120,.45)'; x.beginPath(); x.moveTo(30, 0); x.lineTo(30, h); x.stroke(); for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(150,130,100,${rnd() * 0.06})`; x.fillRect(rnd() * w, rnd() * h, 2, 2); }
    x.font = 'bold 26px sans-serif'; x.fillStyle = 'rgba(90,110,200,.55)'; x.fillText('★ 1', 150, 200); x.fillText('♥', 60, 90); }),
  chrome: () => ctex('chr', 64, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); [['#ffffff', 0], ['#c8d0e0', 0.25], ['#8a94b0', 0.45], ['#f4f6ff', 0.55], ['#a8b0c8', 0.8], ['#ffffff', 1]].forEach(([c, s]) => g.addColorStop(s, c)); x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(i * 11, 0, 2, h); } }),
  toast: () => ctex('tst', 128, 128, (x, w) => { x.fillStyle = '#b8642a'; x.fillRect(0, 0, w, w); const g = x.createRadialGradient(64, 64, 10, 64, 64, 60); g.addColorStop(0, '#ffe2a8'); g.addColorStop(0.7, '#f2b25c'); g.addColorStop(1, '#c87a3a');
    x.fillStyle = g; x.beginPath(); x.roundRect(10, 10, 108, 108, 18); x.fill(); for (let i = 0; i < 60; i++) { x.fillStyle = 'rgba(160,90,30,.35)'; x.beginPath(); x.arc(15 + rnd() * 98, 15 + rnd() * 98, 1 + rnd() * 2.5, 0, 6.3); x.fill(); }
    x.strokeStyle = 'rgba(120,50,10,.6)'; x.lineWidth = 5; for (const o of [0, 30]) { x.beginPath(); x.moveTo(25 + o, 30); x.lineTo(70 + o, 98); x.stroke(); } }),
  frosting: () => ctex('fro', 128, 128, (x, w) => { x.fillStyle = '#ffd6ec'; x.fillRect(0, 0, w, w); const cs = ['#ff4f8f', '#ffe066', '#7ee3c4', '#7fb0ff', '#b98cff', '#ffffff'];
    for (let i = 0; i < 70; i++) { x.save(); x.translate(rnd() * w, rnd() * w); x.rotate(rnd() * 6.3); x.fillStyle = cs[i % 6]; x.beginPath(); x.roundRect(-5, -1.6, 10, 3.2, 1.6); x.fill(); x.restore(); } }, [3, 1]),
  sponge: () => ctex('spo', 128, 64, (x, w, h) => { x.fillStyle = '#fff2c4'; x.fillRect(0, 0, w, h); x.fillStyle = '#ff6f9a'; x.fillRect(0, h * 0.45, w, h * 0.12); for (let i = 0; i < 120; i++) { x.fillStyle = 'rgba(200,150,60,.25)'; x.beginPath(); x.arc(rnd() * w, rnd() * h, rnd() * 2, 0, 6.3); x.fill(); } }, [4, 1]),
  brick: () => ctex('brk', 128, 128, (x, w) => { x.fillStyle = '#fff6ec'; x.fillRect(0, 0, w, w); for (let r = 0; r < 8; r++) for (let i = -1; i < 5; i++) { x.fillStyle = r < 2 || (r > 3 && r < 6) ? '#ff6f6f' : '#ffffff'; x.fillRect(i * 32 + (r % 2) * 16 + 1, r * 16 + 1, 30, 14);
    x.fillStyle = 'rgba(0,0,0,.06)'; x.fillRect(i * 32 + (r % 2) * 16 + 1, r * 16 + 11, 30, 4); } }, [2, 1]),
  piano: () => ctex('pno', 128, 128, (x, w) => { const g = x.createLinearGradient(0, 0, w, w); g.addColorStop(0, '#3a3050'); g.addColorStop(0.45, '#14101e'); g.addColorStop(0.5, '#5a5078'); g.addColorStop(0.55, '#14101e'); g.addColorStop(1, '#2a2240'); x.fillStyle = g; x.fillRect(0, 0, w, w);
    x.strokeStyle = '#ffd36a'; x.lineWidth = 2; x.strokeRect(6, 6, w - 12, w - 12); }),
  umbrella: () => ctex('umb', 256, 64, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#9a6ae0' : '#ffd6f0'; x.fillRect(i * 32, 0, 32, h); x.fillStyle = i % 2 ? '#ffe066' : '#9a6ae0'; for (let k = 0; k < 3; k++) { x.beginPath(); x.arc(i * 32 + 16, 10 + k * 20, 3.5, 0, 6.3); x.fill(); } } }),
  tile: () => ctex('til', 64, 64, (x, w) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, w); x.strokeStyle = '#bfe6ff'; x.lineWidth = 2; for (let i = 0; i <= 64; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 64); x.moveTo(0, i); x.lineTo(64, i); x.stroke(); } }, [4, 2]),
  snail: () => ctex('snl', 256, 64, (x, w, h) => { x.fillStyle = '#9fe8a8'; x.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(60,140,90,${0.15 + rnd() * 0.2})`; x.beginPath(); x.ellipse(rnd() * w, rnd() * h, 3 + rnd() * 6, 2 + rnd() * 3, 0, 0, 6.3); x.fill(); } x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(0, 8, w, 4); }),
};
// ---------- geometrías ----------
function rbox(w, h, d, r, s = 3) { return geo(`rb${w}_${h}_${d}_${r}`, () => { const g = new THREE.BoxGeometry(w, h, d, s, s, s), p = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3(), hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); c.set(Math.max(-hx, Math.min(hx, v.x)), Math.max(-hy, Math.min(hy, v.y)), Math.max(-hz, Math.min(hz, v.z))); v.sub(c).normalize().multiplyScalar(r).add(c); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g; }); }
const capsule = (r, l) => geo(`cap${r}_${l}`, () => new THREE.CapsuleGeometry(r, l, 6, 12));
const lathe = (k, pts, seg = 28) => geo(k, () => new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), seg));
const torus = (R, r, seg = 24, arc = Math.PI * 2) => geo(`to${R}_${r}_${seg}_${arc}`, () => new THREE.TorusGeometry(R, r, 10, seg, arc));
// cara de vehículo: ojos grandes con brillos, mejillas, sonrisa; parpadeo
function face(H, parent, pos, s, anims, look = 0, rotY = 0) {
  const f = G(parent, pos, [0, rotY, 0], s), eyeM = H.toon('#2a1838', { rim: 0 }), wM = H.basic('#ffffff'), lids = [];
  for (const k of [-1, 1]) { const e = G(f, [k * 0.32, 0, 0]); H.mesh(H.sph(14), eyeM, e, null, null, [0.16, 0.21, 0.09]); H.mesh(H.sph(8), wM, e, [-0.05, 0.07, 0.07], null, [0.065, 0.075, 0.03]); H.mesh(H.sph(6), wM, e, [0.05, -0.08, 0.07], null, 0.03); lids.push(e);
    H.mesh(H.sph(10), H.toon('#ff8fb8', { rim: 0, opacity: 0.6 }), f, [k * 0.52, -0.2, -0.02], null, [0.13, 0.07, 0.03]); }
  H.mesh(torus(0.13, 0.03, 14, Math.PI), eyeM, f, [0, -0.2, 0.02], [0, 0, Math.PI]);
  const ph = rnd() * 5; anims.push(t => { const c = (t * 0.8 + ph) % 3.3, b = c < 0.15 ? Math.sin(c / 0.15 * Math.PI) : 0; lids.forEach(e => { e.scale.y = 1 - b * 0.9; e.position.x = Math.sign(e.position.x) * 0.32 + Math.sin(t * 0.5 + ph) * 0.03 * look; }); });
  return f;
}
// grupo de partículas reutilizable (pocas mallas, una geometría y un material compartidos)
function puffs(H, parent, n, mat, size, fn, anims) { const a = []; for (let i = 0; i < n; i++) a.push(H.mesh(H.sph(8), mat, parent, null, null, size)); anims.push(t => a.forEach((m, i) => fn(m, i, t))); return a; }
const gold = H => H.toon('#ffd36a', { rim: 0.8, emissive: '#c08a20', ei: 0.25 });

// ================= ACCESORIOS DEL PILOTO =================
export function premiumChar(X, rig, root, H) {
  const { mesh, toon, outline, sph, cyl, cone, box, basic } = H;
  const A = [], m = (g, mt, p, r, s, par = rig) => mesh(g, mt, par, p, r, s);
  const blk = toon('#2a1838', { rim: 0.6 }), gd = gold(H), white = toon('#ffffff', { rim: 0.5 });
  if (X === 'capitan') {
    // chistera con cinta, hebilla y pluma
    const hat = G(rig, [0.05, 1.48, 0], [0, 0, -0.12]); const hm = toon('#2a2438', { rim: 0.7, emissive: '#3a2a5a', ei: 0.15 });
    m(lathe('hat', [[0.001, 0], [0.62, 0], [0.64, 0.04], [0.4, 0.06], [0.36, 0.1], [0.38, 0.6], [0.42, 0.72], [0.001, 0.72]]), hm, null, null, null, hat);
    m(cyl(24), toon('#ff6f9a', { rim: 0 }), [0, 0.18, 0], null, [0.375, 0.12, 0.375], hat); m(rbox(0.14, 0.12, 0.04, 0.02), gd, [0, 0.18, 0.37], null, null, hat);
    const fea = G(hat, [-0.3, 0.32, -0.05], [0, 0, 0.5]); m(capsule(0.05, 0.5), toon('#7ee3c4', { rim: 0.6 }), [0, 0.25, 0], null, [1.4, 1, 0.4], fea); m(capsule(0.012, 0.5), white, [0, 0.25, 0.02], null, null, fea);
    A.push(t => { hat.rotation.z = -0.12 + Math.sin(t * 2.2) * 0.06; fea.rotation.z = 0.5 + Math.sin(t * 5) * 0.15; });
    // monóculo con cristal y cadena de eslabones
    m(torus(0.24, 0.035, 24), gd, [0.35, 0.89, 0.97], [0, 0.38, 0]); const ln = m(sph(14), basic('#e8fbff', { opacity: 0.35 }), [0.35, 0.89, 0.96], [0, 0.38, 0], [0.22, 0.22, 0.02]); ln.renderOrder = 5;
    m(sph(6), basic('#ffffff', { opacity: 0.9 }), [0.28, 0.98, 1.0], null, [0.05, 0.03, 0.01]);
    for (let i = 0; i < 7; i++) m(torus(0.035, 0.01, 8), gd, [0.52 + i * 0.03, 0.72 - i * 0.07, 0.86 - i * 0.03], [0, i % 2 ? 1.57 : 0, 0]);
    // bigote rizado y boca de pez
    for (const k of [-1, 1]) m(torus(0.09, 0.03, 12, Math.PI * 1.4), toon('#5a3a2a', { rim: 0.3 }), [k * 0.13, 0.74, 0.96], [0, 0, k > 0 ? -0.3 : Math.PI + 0.3]);
    // aletas dorsal y pectorales a rayas, agallas, cola
    const dor = G(rig, [0, 1.38, -0.25]); for (let i = 0; i < 5; i++) m(capsule(0.04, 0.34 - i * 0.04), toon(i % 2 ? '#ffd36b' : '#ff9f4a', { rim: 0.5 }), [0, 0.15, -i * 0.08], [-0.5 - i * 0.12, 0, 0], null, dor);
    for (const k of [-1, 1]) for (let i = 0; i < 3; i++) m(torus(0.12, 0.012, 10, Math.PI * 0.8), toon('#c86a2a', { rim: 0 }), [k * 0.86, 0.95 - i * 0.1, 0.25], [0, k * 1.2, 0.9]);
    const tail = G(rig, [0, 0.55, -0.95]); const tmM = tmat(H, 'fintex', '#ffb36b', T.scales('#ffb36b', '#d8742a'));
    for (const k of [-1, 1]) { const tf = m(sph(14), tmM, [k * 0.22, 0.08, -0.22], [0.3, 0, k * 0.5], [0.3, 0.12, 0.38], tail); outline(tf, '#a0502a', 1.06); }
    A.push(t => { tail.rotation.y = Math.sin(t * 6) * 0.45; dor.rotation.x = Math.sin(t * 3) * 0.1; });
    // escamas brillantes sobre la barriga
    for (let r = 0; r < 2; r++) for (let i = 0; i < 5; i++) m(sph(8), toon(r ? '#ffe7a3' : '#ffd36b', { rim: 0.9, emissive: '#ffb84a', ei: 0.15 }), [-0.44 + i * 0.22 + r * 0.11, 0.3 + r * 0.14, 0.86 - Math.abs(i - 2) * 0.05], null, [0.1, 0.07, 0.03]);
  }
  if (X === 'tostadin') {
    // corona de mantequilla con gemas y capa real
    const cr = G(rig, [0, 1.5, 0]); m(rbox(0.5, 0.16, 0.5, 0.05), toon('#fff1a0', { rim: 0.7, emissive: '#ffe066', ei: 0.25 }), [0, 0.03, 0], [0, 0.4, 0], null, cr);
    m(cyl(20), gd, [0, 0.16, 0], null, [0.36, 0.1, 0.36], cr);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; m(cone(6), gd, [Math.cos(a) * 0.34, 0.33, Math.sin(a) * 0.34], null, [0.07, 0.2, 0.07], cr); m(sph(8), toon(['#ff4f6f', '#4fc8ff', '#7ee38a'][i % 3], { emissive: '#ffffff', ei: 0.2 }), [Math.cos(a) * 0.36, 0.18, Math.sin(a) * 0.36], null, 0.045, cr); }
    m(sph(8), toon('#fffbe0', { emissive: '#ffe066', ei: 0.5 }), [0.05, 0.18, 0.05], null, [0.2, 0.06, 0.2], cr);
    const cape = G(rig, [0, 1.0, -0.6]); const cm = toon('#c0304a', { side: THREE.DoubleSide, rim: 0.4 });
    m(geo('capeG', () => { const g = new THREE.CylinderGeometry(0.75, 1.05, 1.0, 16, 4, true, Math.PI * 0.6, Math.PI * 0.8); return g; }), cm, [0, -0.4, 0.55], null, null, cape);
    for (let i = 0; i < 7; i++) m(sph(8), white, [Math.sin(Math.PI * 0.6 + i * 0.4) * 0.85 * 1.1, -0.15, Math.cos(Math.PI * 0.6 + i * 0.4) * 0.85 + 0.55], null, [0.1, 0.08, 0.1], cape);
    A.push(t => { cr.rotation.y = Math.sin(t * 1.2) * 0.3; cape.rotation.x = 0.1 + Math.sin(t * 5) * 0.08; });
    // migas en las mejillas y bigotito de mermelada
    for (const k of [-1, 1]) m(sph(8), toon('#c87a3a', { rim: 0 }), [k * 0.22, 1.1, 0.86], null, [0.05, 0.03, 0.02]);
    m(capsule(0.03, 0.16), toon('#ff4f6f', { rim: 0.6, emissive: '#c02040', ei: 0.2 }), [0, 0.76, 0.95], [0, 0, 1.57]);
  }
  if (X === 'madame') {
    // boina con rabito, pendientes de gota, collar de perlas y gafitas de ópera con palo
    const bo = G(rig, [0.1, 1.5, 0], [0, 0, -0.3]); m(sph(20), tmat(H, 'beret', '#7a4ab8', T.umbrella()), null, null, [0.66, 0.18, 0.66], bo); m(torus(0.5, 0.05, 28), toon('#5a2a98'), [0, -0.04, 0], [1.57, 0, 0], null, bo); m(capsule(0.03, 0.1), toon('#5a2a98'), [0, 0.2, 0], null, null, bo);
    for (let i = 0; i < 16; i++) { const a = -1.4 + i * 0.187; m(sph(8), toon('#fffaf0', { rim: 1, emissive: '#ffe8f4', ei: 0.15 }), [Math.sin(a) * 0.83, 0.42 - Math.cos(a * 1.2) * 0.04, Math.cos(a) * 0.73], null, 0.065); }
    for (const k of [-1, 1]) { const e = G(rig, [k * 0.93, 0.78, 0.15]); m(sph(8), gd, null, null, 0.04, e); m(H.dropGeo(), toon('#c9a0ff', { emissive: '#9a6ae0', ei: 0.4, rim: 0.9 }), [0, -0.12, 0], null, 0.07, e); A.push(t => { e.rotation.z = Math.sin(t * 3 + k) * 0.25; }); }
    const op = G(rig, [0.75, 0.7, 0.75]); m(cyl(8), gd, [0, -0.25, 0], [0, 0, 0.3], [0.02, 0.5, 0.02], op);
    A.push(t => { op.rotation.z = Math.sin(t * 1.3) * 0.15; });
    m(capsule(0.025, 0.12), toon('#ff4f8f', { rim: 0.5 }), [0, 0.72, 0.95], [0, 0, 1.57]); // pintalabios
  }
  if (X === 'tecla') {
    // pajarita de satén, frac con solapas, peluca blanca rizada y batuta
    for (const k of [-1, 1]) { const w = m(rbox(0.26, 0.18, 0.06, 0.05), blk, [k * 0.14, 0.42, 0.9], [0, 0, k * 0.25]); outline(w, '#000', 1.08); } m(sph(10), toon('#ff4f6f', { rim: 0.6 }), [0, 0.42, 0.93], null, 0.06);
    for (const k of [-1, 1]) m(geo('lapel', () => new THREE.ConeGeometry(0.22, 0.5, 3)), toon('#2a2438', { rim: 0.6 }), [k * 0.35, 0.28, 0.82], [0.2, 0, Math.PI + k * 0.35]);
    for (let i = 0; i < 3; i++) m(sph(8), gd, [0, 0.12 + i * 0.0, 0.92], null, 0.035).position.set(0, 0.25 - i * 0.12, 0.93);
    for (const k of [-1, 1]) for (let i = 0; i < 3; i++) m(sph(12), toon('#fbfbff', { rim: 0.7 }), [k * (0.6 + i * 0.05), 1.42 - i * 0.24, -0.05], null, [0.22, 0.17, 0.22]);
    m(capsule(0.06, 0.18), toon('#fbfbff'), [0, 0.95, -0.95], [1.57, 0, 0]); m(rbox(0.14, 0.08, 0.04, 0.02), blk, [0, 0.95, -1.1]);
    const bat = G(rig, [0.88, 0.7, 0.35]); m(cyl(6), white, [0, 0.38, 0], null, [0.018, 0.75, 0.018], bat); m(sph(8), toon('#8a5a3a'), [0, 0.02, 0], null, [0.06, 0.09, 0.06], bat);
    const sp = m(H.starGeoS(), toon('#fff6a0', { emissive: '#ffe066', ei: 0.8, rim: 0 }), [0, 0.78, 0], null, 0.06, bat);
    A.push(t => { bat.rotation.z = Math.sin(t * 7) * 0.6 - 0.3; bat.rotation.x = Math.cos(t * 7) * 0.3; sp.rotation.z = t * 5; });
    for (const k of [-1, 1]) { m(cyl(14), toon('#2a1838', { rim: 0.9 }), [k * 0.35, 0.9, 0.93], [1.57, 0, 0], [0.13, 0.02, 0.13]); } // gafitas redondas
  }
  if (X === 'duquesa') {
    // gorro de ducha con volantes, toalla en el hombro, mascarilla de pepino y burbujas
    m(sph(20), tmat(H, 'cap', '#ffb3d1', T.umbrella()), [0, 1.42, 0], null, [0.82, 0.4, 0.82]);
    for (let i = 0; i < 18; i++) { const a = i / 18 * 6.28; m(sph(8), toon('#ffd6ec', { rim: 0.6 }), [Math.cos(a) * 0.8, 1.3, Math.sin(a) * 0.8], null, [0.11, 0.08, 0.11]); }
    const tw = m(rbox(0.5, 0.18, 0.9, 0.08), tmat(H, 'towel', '#ffffff', T.tile()), [0.6, 0.9, -0.1], [0, 0, -0.6]); outline(tw, '#a0c8e8', 1.04);
    for (const k of [-1, 1]) { m(cyl(16), toon('#9fe88a', { rim: 0.4 }), [k * 0.36, 0.89, 0.97], [1.57, 0, 0], [0.17, 0.02, 0.17]); m(cyl(16), toon('#e8ffd8', { rim: 0 }), [k * 0.36, 0.89, 0.985], [1.57, 0, 0], [0.13, 0.01, 0.13]); }
    const bb = []; for (let i = 0; i < 8; i++) bb.push(m(sph(10), toon('#e8fbff', { opacity: 0.5, rim: 1 }), null, null, 0.08));
    A.push(t => bb.forEach((b, i) => { const k = (t * 0.35 + i * 0.125) % 1; b.position.set(Math.sin(i * 2.3 + t) * 0.7, 1.6 + k * 1.0, Math.cos(i * 1.7) * 0.5); b.scale.setScalar((0.06 + (i % 3) * 0.035) * (1 - k * 0.5)); }));
  }
  if (X === 'farito') {
    // gorra de marinero con ancla, pañuelo de cuello, catalejo y barba de espuma
    m(cyl(24), white, [0, 1.52, 0], null, [0.56, 0.16, 0.56]); m(cyl(24), toon('#3a5aa8'), [0, 1.44, 0], null, [0.58, 0.06, 0.58]); m(rbox(0.5, 0.04, 0.26, 0.02), toon('#2a3a68'), [0, 1.43, 0.5], [0.4, 0, 0]);
    const anc = G(rig, [0, 1.52, 0.57]); m(cyl(6), gd, null, null, [0.015, 0.12, 0.015], anc); m(torus(0.04, 0.012, 10, Math.PI), gd, [0, -0.05, 0], [0, 0, Math.PI], null, anc); m(torus(0.02, 0.008, 8), gd, [0, 0.07, 0], null, null, anc);
    for (const k of [-1, 1]) m(cone(4), toon('#3a5aa8', { rim: 0.4 }), [k * 0.18, 0.4, 0.88], [0, 0, k * 1.9], [0.12, 0.22, 0.05]); m(sph(8), toon('#ff6f6f'), [0, 0.42, 0.92], null, 0.06);
    const tel = G(rig, [-0.88, 0.8, 0.3], [0, 0, 0.9]); m(cyl(12), gd, [0, 0.15, 0], null, [0.06, 0.3, 0.06], tel); m(cyl(12), toon('#8a5a3a'), [0, 0.4, 0], null, [0.08, 0.25, 0.08], tel); m(cyl(12), basic('#bfeaff', { opacity: 0.6 }), [0, 0.53, 0], null, [0.07, 0.02, 0.07], tel);
    A.push(t => { tel.rotation.z = 0.9 + Math.sin(t * 1.4) * 0.25; });
    for (let i = 0; i < 6; i++) m(sph(8), toon('#ffffff', { rim: 0.7 }), [-0.3 + i * 0.12, 0.56 - Math.abs(i - 2.5) * 0.03, 0.92], null, 0.08);
  }
  if (X === 'tarta') {
    // gorro de fiesta a rayas con pompón, matasuegas, glaseado que gotea en la cabeza y cereza
    const hat = G(rig, [0.1, 1.55, 0], [0, 0, -0.18]); const hm = tmat(H, 'partyhat', '#7ee3c4', T.frosting());
    const h = m(cone(20), hm, [0, 0.3, 0], null, [0.32, 0.62, 0.32], hat); outline(h, '#3a8a6a', 1.05);
    const pom = m(sph(12), toon('#ffe066', { emissive: '#ffcc33', ei: 0.4 }), [0, 0.64, 0], null, 0.11, hat);
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; m(capsule(0.06, 0.12 + (i % 3) * 0.08), toon('#ffffff', { rim: 0.6 }), [Math.cos(a) * 0.78, 1.38 - (i % 3) * 0.08, Math.sin(a) * 0.78], null, null); }
    const blow = G(rig, [0.12, 0.66, 0.95]); const bl = []; for (let i = 0; i < 6; i++) bl.push(m(cyl(10), toon(i % 2 ? '#ff4f8f' : '#ffe066'), null, [1.57, 0, 0], [0.05, 0.08, 0.05], blow));
    A.push(t => { pom.position.x = Math.sin(t * 5) * 0.05; const e = (Math.sin(t * 2) + 1) / 2; bl.forEach((b, i) => { b.position.set(0, 0, i * 0.07 * e); b.visible = i === 0 || e > i / 6; }); });
  }
  if (X === 'grullita') {
    // casco de aviador de cuero, gafas con cristal azul, bufanda larga ondeando y pañuelo de pecho
    const lm = toon('#c89058', { rim: 0.6 }); m(sph(20), lm, [0, 1.3, -0.05], null, [0.86, 0.46, 0.86]); m(torus(0.86, 0.02, 32), toon('#8a5a2a'), [0, 1.18, -0.05], [1.57, 0, 0], [1, 1, 1]); m(capsule(0.015, 0.7), toon('#8a5a2a'), [0, 1.7, -0.05], [0, 0, 1.57]);
    for (const k of [-1, 1]) m(rbox(0.12, 0.42, 0.24, 0.05), lm, [k * 0.88, 0.95, 0.1]);
    for (const k of [-1, 1]) { m(torus(0.17, 0.05, 20), gd, [k * 0.26, 1.36, 0.72], [-0.55, 0, 0]); m(cyl(16), toon('#9fe8ff', { emissive: '#5fc8ff', ei: 0.4, rim: 0.9, opacity: 0.85 }), [k * 0.26, 1.37, 0.73], [Math.PI / 2 - 0.55, 0, 0], [0.15, 0.03, 0.15]); }
    m(capsule(0.03, 0.6), lm, [0, 1.36, 0.6], [0, 0, 1.57]);
    const sc = G(rig, [-0.3, 0.42, -0.7]); const segs = []; for (let i = 0; i < 6; i++) segs.push(m(rbox(0.22, 0.06, 0.2, 0.03), toon(i % 2 ? '#ffffff' : '#ff6f6f', { rim: 0.3 }), [0, 0, -i * 0.18], null, null, sc));
    m(torus(0.82, 0.13, 28), toon('#ff6f6f', { rim: 0.4 }), [0, 0.42, 0.04], [Math.PI / 2, 0, 0], [1, 1, 0.6]);
    A.push(t => segs.forEach((s, i) => { s.position.y = Math.sin(t * 9 - i * 0.8) * 0.05 * i; s.rotation.x = Math.sin(t * 9 - i * 0.8) * 0.3; }));
  }
  if (A.length) root.userData.extra = (root.userData.extra || []).concat(A);
}

// ================= VEHÍCULOS =================
export function premiumVehicle(V, g, wheel, anims, C, OL, H) {
  const { mesh, toon, outline, sph, cyl, cone, box, basic } = H;
  const m = (gg, mt, p, r, s, par = g) => mesh(gg, mt, par, p, r, s), gd = gold(H), white = toon('#ffffff', { rim: 0.5 });
  if (V === 'whale') {
    const w = G(g); const sk = tmat(H, 'whaleSk', '#5fa8e8', T.scales('#6fb6f0', '#3a7ac8')), belly = toon('#eef8ff', { rim: 0.3 });
    const body = m(sph(28), sk, [0, 0.88, 0.05], null, [1.02, 0.74, 1.45], w); outline(body, '#2a5a8a', 1.03);
    for (let i = 0; i < 7; i++) m(capsule(0.035, 1.3), toon('#d8ecff', { rim: 0 }), [-0.42 + i * 0.14, 0.42, 0.35], [1.57, 0, 0], [1, 1, 0.6], w); // pliegues de la barriga
    m(sph(20), belly, [0, 0.55, 0.4], null, [0.8, 0.36, 1.05], w);
    face(H, w, [0, 0.98, 1.38], 0.95, anims, 1);
    // mancha, pecas y percebes simpáticos
    for (let i = 0; i < 5; i++) m(sph(8), toon('#3a7ac8', { rim: 0 }), [0.55 + (i % 2) * 0.12, 1.25 - i * 0.06, 0.6 - i * 0.18], null, [0.06, 0.04, 0.06], w);
    for (let i = 0; i < 3; i++) m(cone(8), toon('#fff2d8', { rim: 0.5 }), [-0.75, 1.15 - i * 0.12, -0.3 - i * 0.25], [0, 0, 0.9], [0.06, 0.09, 0.06], w);
    // silla de montar con estribos, manta bordada y riendas
    m(rbox(0.95, 0.08, 1.0, 0.04), tmat(H, 'saddleCl', '#c0304a', T.porcelain()), [0, 1.56, -0.05], null, null, w);
    const sad = m(lathe('saddle', [[0.001, 0], [0.5, 0], [0.55, 0.08], [0.45, 0.16], [0.001, 0.14]]), toon('#8a4a2a', { rim: 0.5 }), [0, 1.58, -0.05], null, [1, 1, 1.2], w); outline(sad, '#4a2010', 1.04);
    for (const k of [-1, 1]) { m(cyl(6), toon('#5a3a2a'), [k * 0.85, 1.25, -0.05], [0, 0, k * 0.2], [0.02, 0.6, 0.02], w); m(torus(0.08, 0.02, 12), gd, [k * 0.92, 0.95, -0.05], [0, 1.57, 0], null, w); }
    for (const k of [-1, 1]) m(cyl(6), toon('#8a5a3a'), [k * 0.2, 1.45, 0.75], [1.1, 0, 0], [0.015, 1.1, 0.015], w);
    m(torus(0.5, 0.025, 16, Math.PI), gd, [0, 1.05, 1.15], [0.6, 0, 0], null, w); // bocado de las riendas
    // cola de dos lóbulos y aletas pectorales que remolean
    const tail = G(w, [0, 0.95, -1.3]); m(capsule(0.22, 0.4), sk, [0, 0, -0.15], [1.4, 0, 0], null, tail);
    for (const k of [-1, 1]) { const f = m(sph(16), sk, [k * 0.38, 0.22, -0.42], [0.3, 0, k * 0.45], [0.45, 0.08, 0.26], tail); outline(f, '#2a5a8a', 1.06); }
    const fins = []; for (const k of [-1, 1]) { const f = G(w, [k * 0.95, 0.5, 0.45]); const ff = m(sph(14), sk, [k * 0.25, -0.12, 0], [0, 0, k * 0.6], [0.38, 0.08, 0.22], f); outline(ff, '#2a5a8a', 1.08); fins.push([f, k]); }
    // chorro de agua: columna y gotas
    const spout = G(w, [0, 1.75, 0.55]); const wm = toon('#bfeaff', { opacity: 0.7, rim: 1, emissive: '#8fd8ff', ei: 0.35 });
    const col = m(capsule(0.08, 0.5), wm, [0, 0.35, 0], null, null, spout);
    const drops = puffs(H, spout, 8, wm, 0.1, (b, i, t) => { const k = (t * 0.9 + i / 8) % 1, a = i / 8 * 6.28; b.position.set(Math.cos(a) * k * 0.6, 0.7 + Math.sin(k * Math.PI) * 0.5 - k * 0.4, Math.sin(a) * k * 0.6); b.scale.setScalar(0.09 * (1 - k * 0.6)); }, anims);
    wheel(0, 0, 0.01);
    anims.push(t => { w.position.y = Math.abs(Math.sin(t * 4)) * 0.12; w.rotation.x = Math.sin(t * 4) * 0.05; tail.rotation.x = Math.sin(t * 4) * 0.45; fins.forEach(([f, k]) => f.rotation.x = Math.sin(t * 8 + k) * 0.6); const p = (Math.sin(t * 1.5) + 1) / 2; col.scale.set(1, 0.5 + p, 1); col.position.y = 0.2 + p * 0.25; });
    return 1.3; }
  if (V === 'toaster') {
    const tm = tmat(H, 'chrome', '#ffffff', T.chrome(), { rim: 0.9 });
    const b = m(rbox(1.9, 1.05, 2.4, 0.32, 4), tm, [0, 0.9, 0]); outline(b, '#4a5068', 1.025);
    m(rbox(1.96, 0.18, 2.46, 0.08), toon('#ff6f8f', { rim: 0.5 }), [0, 0.5, 0]); // franja retro
    for (const k of [-1, 1]) m(rbox(0.06, 0.5, 1.6, 0.03), toon('#e8ecf8', { rim: 0.9 }), [k * 0.97, 0.95, 0]);
    face(H, g, [0, 0.95, 1.22], 0.9, anims, 1);
    // palanca, rueda de tostado con números y luz piloto
    const lev = m(rbox(0.12, 0.2, 0.3, 0.05), toon('#2a2a3a'), [0.97, 1.2, -0.6]); const dial = G(g, [0.99, 0.85, -0.2], [0, 1.57, 0]); m(cyl(16), toon('#ffe066'), null, [1.57, 0, 0], [0.16, 0.06, 0.16], dial); m(box(), toon('#2a2a3a'), [0, 0.08, 0.04], null, [0.02, 0.1, 0.02], dial);
    const led = m(sph(8), toon('#ff4f4f', { emissive: '#ff2020', ei: 0.8 }), [0.98, 0.65, 0.6], null, 0.05);
    // ranuras y tostadas texturizadas con mantequilla
    const toast = tmat(H, 'toast', '#ffffff', T.toast()), butter = toon('#fff1a0', { rim: 0.6, emissive: '#ffe066', ei: 0.2 }); const toasts = [];
    for (const z of [-0.55, 0.55]) { m(rbox(1.3, 0.06, 0.24, 0.03), toon('#2a2a3a'), [0, 1.42, z]); const tt = G(g, [0, 1.4, z]); const s = m(rbox(1.0, 0.85, 0.14, 0.12), toast, [0, 0.1, 0], null, null, tt); outline(s, '#8a5020', 1.04); m(rbox(0.3, 0.06, 0.18, 0.03), butter, [0.15, 0.55, 0], [0, 0, 0.2], null, tt); toasts.push(tt); }
    // alas de pájaro con plumas
    const wings = []; for (const k of [-1, 1]) { const w = G(g, [k * 0.98, 1.15, -0.3]); for (let i = 0; i < 4; i++) { const f = m(capsule(0.08, 0.5 - i * 0.07), white, [k * (0.3 + i * 0.05), 0.05 - i * 0.07, -i * 0.12], [0, 0, k * 1.57], null, w); } wings.push([w, k]); }
    // humo de tostado
    const smoke = G(g, [0, 1.5, 0]); puffs(H, smoke, 6, toon('#f0f0f8', { opacity: 0.55, rim: 0.8 }), 0.15, (p, i, t) => { const k = (t * 0.5 + i / 6) % 1; p.position.set(Math.sin(i * 2 + t) * 0.3, 0.4 + k * 1.4, (i % 2 ? 0.55 : -0.55) - k * 0.8); p.scale.setScalar(0.08 + k * 0.2); }, anims);
    for (const [x, z] of [[-0.75, 0.95], [0.75, 0.95], [-0.75, -0.95], [0.75, -0.95]]) wheel(x, z, 0.28, '#ffe066');
    anims.push(t => { toasts.forEach((tt, i) => { const u = Math.max(0, Math.sin(t * 2.6 + i * 1.6)); tt.position.y = 1.4 + u * 0.75; tt.rotation.z = u * Math.sin(t * 6) * 0.2; }); wings.forEach(([w, k]) => w.rotation.z = k * Math.sin(t * 12) * 0.5); lev.position.y = 1.2 - Math.max(0, Math.sin(t * 2.6)) * 0.12; dial.rotation.x = t; led.visible = (t * 2) % 1 < 0.7; });
    return 1.08; }
  if (V === 'umbrella') {
    // nube de lluvia esponjosa con cara, paraguas del revés como barca con borlas, gotas y charquito, mástil con banderín
    const cl = G(g); const cm = toon('#ffffff', { rim: 0.8 }), cs = toon('#e4e8ff', { rim: 0.6 });
    [[0, 0.32, 0, 0.85], [0.78, 0.3, 0.3, 0.6], [-0.78, 0.3, 0.3, 0.6], [0.55, 0.3, -0.8, 0.6], [-0.55, 0.3, -0.8, 0.6], [0, 0.25, 0.9, 0.55], [0.3, 0.55, -0.2, 0.55], [-0.4, 0.5, 0.2, 0.5]].forEach(([x, y, z, r], i) => { const c = m(sph(16), i % 3 ? cm : cs, [x, y, z], null, [r, r * 0.62, r], cl); outline(c, '#a0a8d0', 1.04); });
    face(H, cl, [0, 0.38, 1.38], 0.75, anims, 1);
    const um = m(geo('umbG', () => new THREE.SphereGeometry(1.25, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)), tmat(H, 'umbT', '#ffffff', T.umbrella(), { side: THREE.DoubleSide, rim: 0.4 }), [0, 1.3, 0]); outline(um, '#3a1a6a', 1.03);
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; m(capsule(0.025, 1.0), toon('#5a2a98'), [Math.cos(a) * 0.62, 0.75, Math.sin(a) * 0.62], null, null).lookAt(0, 0.1, 0);
      const bor = G(g, [Math.cos(a) * 1.25, 1.3, Math.sin(a) * 1.25]); m(sph(8), gd, null, null, 0.06, bor); m(cone(8), toon(i % 2 ? '#ffe066' : '#ff9cc8'), [0, -0.12, 0], [Math.PI, 0, 0], [0.06, 0.16, 0.06], bor); anims.push(t => { bor.rotation.z = Math.sin(t * 4 + i) * 0.3; }); }
    const hook = m(torus(0.22, 0.05, 16, Math.PI), toon('#c08a50', { rim: 0.6 }), [0.22, 1.6, -1.1], [0, 0, 0]); m(cyl(10), toon('#c08a50'), [0, 1.0, -1.1], null, [0.05, 1.2, 0.05]);
    const flag = G(g, [0, 1.75, -1.15]); m(cyl(6), gd, [0, 0.3, 0], null, [0.015, 0.6, 0.015], flag); const fl = m(geo('pennant', () => new THREE.ConeGeometry(0.15, 0.5, 3)), toon('#ff6fa8', { side: THREE.DoubleSide }), [0, 0.5, -0.25], [1.57, 0, 0], [1, 1, 0.2], flag);
    const dm = toon('#8fd8ff', { emissive: '#5fc8ff', ei: 0.4, rim: 0.8 }); puffs(H, cl, 10, dm, 0.05, (d, i, t) => { const k = (t * 1.6 + i / 10) % 1; d.position.set(Math.sin(i * 2.4) * 0.85, 0.05 - k * 0.5, Math.cos(i * 1.9) * 0.75); d.scale.set(0.035, 0.08, 0.035); d.visible = k < 0.9; }, anims);
    const pud = m(cyl(24), toon('#9fd8ff', { opacity: 0.45, rim: 0 }), [0, 0.02, 0], null, [1.2, 0.01, 1.2]);
    wheel(0, 0, 0.01);
    anims.push(t => { um.rotation.y = t * 0.6; cl.position.y = Math.sin(t * 2) * 0.06; fl.rotation.x = 1.57 + Math.sin(t * 8) * 0.3; pud.scale.x = pud.scale.z = 1.1 + Math.sin(t * 3) * 0.08; });
    return 0.82; }
  if (V === 'piano') {
    const pm = tmat(H, 'pianoT', '#ffffff', T.piano(), { rim: 0.9 });
    const sh = geo('pianoSh', () => { const s = new THREE.Shape(); s.moveTo(-1, -1.3); s.lineTo(1, -1.3); s.lineTo(1, 0.2); s.bezierCurveTo(1, 1.0, 0.4, 1.45, -0.1, 1.45); s.bezierCurveTo(-0.7, 1.45, -1, 1.0, -1, 0.5); s.lineTo(-1, -1.3);
      return new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 3, curveSegments: 16 }); });
    const top = m(sh, pm, [0, 0.55, -0.1], [-Math.PI / 2, 0, 0]); outline(top, '#000', 1.015);
    // tapa abierta sostenida por su varilla, cuerdas doradas dentro
    const lid = G(g, [-1, 1.15, -0.1]); m(geo('lidG', () => { const s = new THREE.Shape(); s.moveTo(0, -1.3); s.lineTo(2, -1.3); s.lineTo(2, 0.2); s.bezierCurveTo(2, 1, 1.4, 1.45, 0.9, 1.45); s.bezierCurveTo(0.3, 1.45, 0, 1, 0, 0.5); s.lineTo(0, -1.3); return new THREE.ShapeGeometry(s, 12); }), toon('#1a1428', { side: THREE.DoubleSide, rim: 0.8 }), null, [-Math.PI / 2, 0, 0], null, lid);
    m(cyl(6), gd, [1.4, 0.35, 0.5], [0, 0, 0.5], [0.02, 0.8, 0.02]);
    for (let i = 0; i < 9; i++) m(cyl(4), gd, [-0.7 + i * 0.17, 1.12, 0.1], [1.57, 0, 0], [0.008, 2.0 - Math.abs(i - 3) * 0.12, 0.008]);
    // teclado con teclas blancas y negras que se hunden, atril con partitura
    const keys = G(g, [0, 0.85, 1.42]); const kw = toon('#fffdf5', { rim: 0.4 }), kb = toon('#111', { rim: 0.6 }); const ks = [];
    for (let i = 0; i < 12; i++) ks.push(m(rbox(0.15, 0.08, 0.36, 0.02), kw, [-0.94 + i * 0.17, 0, 0], null, null, keys));
    for (let i = 0; i < 11; i++) if (i % 7 !== 2 && i % 7 !== 6) ks.push(m(rbox(0.09, 0.07, 0.22, 0.02), kb, [-0.855 + i * 0.17, 0.06, -0.07], null, null, keys));
    m(rbox(2.15, 0.18, 0.12, 0.04), pm, [0, 0.98, 1.62]);
    m(rbox(0.8, 0.5, 0.03, 0.02), tmat(H, 'sheet', '#ffffff', T.paper()), [-0.72, 1.35, 0.9], [-0.3, 0.5, 0], [0.6, 0.6, 1]);
    face(H, g, [0, 0.72, 1.66], 0.7, anims, 1);
    // patas torneadas con zapatitos que corren y pedales
    const legs = []; for (const [x, z] of [[-0.8, 1.1], [0.8, 1.1], [0, -1.0]]) { const l = G(g, [x, 0.55, z]); m(lathe('pleg', [[0.001, 0], [0.08, 0], [0.12, 0.1], [0.07, 0.25], [0.1, 0.4], [0.06, 0.5], [0.001, 0.5]], 12), tmat(H, 'woodL', '#c8a060', T.wood('#d8a868', '#8a5a2a')), [0, -0.5, 0], null, null, l);
      m(sph(10), toon('#ff6fa8', { rim: 0.5 }), [0, -0.52, 0.08], null, [0.15, 0.08, 0.22], l); legs.push(l); }
    m(rbox(0.4, 0.06, 0.12, 0.02), gd, [0, 0.2, 0.9]);
    const nm = toon('#ffe066', { emissive: '#ffcc33', ei: 0.6 }); const notes = []; for (let i = 0; i < 4; i++) { const n = G(g); m(sph(8), nm, null, null, [0.1, 0.08, 0.06], n); m(box(), nm, [0.08, 0.18, 0], null, [0.02, 0.35, 0.02], n); if (i % 2) m(box(), nm, [0.13, 0.33, 0], [0, 0, -0.4], [0.12, 0.04, 0.02], n); notes.push(n); }
    wheel(0, 0, 0.01);
    anims.push(t => { legs.forEach((l, i) => l.rotation.x = Math.sin(t * 14 + i * 2) * 0.55); ks.forEach((k, i) => k.position.y = (k.position.y > 0.03 ? 0.06 : 0) - (Math.sin(t * 9 + i * 1.7) > 0.85 ? 0.04 : 0)); notes.forEach((n, i) => { const k = (t * 0.6 + i / 4) % 1; n.position.set(Math.sin(i * 2 + t) * 0.9, 1.5 + k * 1.4, -0.4); n.scale.setScalar(1 - k * 0.5); n.rotation.z = Math.sin(t * 3 + i) * 0.3; }); });
    return 1.08; }
  if (V === 'bathtub') {
    const porc = tmat(H, 'porcT', '#ffffff', T.porcelain(), { rim: 0.8 });
    const tub = m(lathe('tub', [[0.001, 0], [0.75, 0.0], [0.95, 0.12], [1.02, 0.45], [1.05, 0.7], [0.98, 0.74], [0.9, 0.5], [0.001, 0.48]], 32), porc, [0, 0.45, 0], null, [1, 1, 1.35]); outline(tub, '#8aa0d8', 1.03);
    m(torus(1.0, 0.06, 32), gd, [0, 1.17, 0], [1.57, 0, 0], [1.02, 1.36, 1]);
    const water = m(cyl(28), toon('#9fe8ff', { opacity: 0.8, emissive: '#5fc8ff', ei: 0.25, rim: 0.6 }), [0, 1.05, 0], null, [0.92, 0.04, 1.24]);
    const foam = toon('#ffffff', { opacity: 0.92, rim: 0.9 }); for (let i = 0; i < 14; i++) m(sph(10), foam, [Math.sin(i * 2.1) * 0.78, 1.12 + (i % 3) * 0.06, Math.cos(i * 1.3) * 1.08], null, 0.14 + (i % 4) * 0.05);
    // patas de león doradas con garritas
    for (const [x, z] of [[-0.75, 0.95], [0.75, 0.95], [-0.75, -0.95], [0.75, -0.95]]) { m(capsule(0.09, 0.25), gd, [x, 0.35, z], [0, 0, x * 0.2]); for (let c = -1; c <= 1; c++) m(sph(8), gd, [x + c * 0.07, 0.07, z + 0.1], null, [0.06, 0.06, 0.09]); }
    // grifo con mandos, ducha de teléfono y chorrito
    m(capsule(0.06, 0.5), gd, [0, 1.4, -1.32]); m(capsule(0.05, 0.25), gd, [0, 1.68, -1.18], [1.57, 0, 0]); for (const k of [-1, 1]) { m(cyl(10), toon(k > 0 ? '#ff6f6f' : '#6fb6ff', { rim: 0.5 }), [k * 0.2, 1.48, -1.32], null, [0.07, 0.05, 0.07]); }
    const jet = m(capsule(0.03, 0.3), toon('#bfeaff', { opacity: 0.7, rim: 1 }), [0, 1.42, -1.06]);
    face(H, g, [0, 0.82, 1.38], 0.75, anims, 1);
    // patito de goma con ojos y pico, y patito bebé
    const duck = (p, s) => { const d = G(g, p, null, s); m(sph(14), toon('#ffe066', { rim: 0.6 }), [0, 0.1, 0], null, [0.22, 0.16, 0.26], d); m(sph(12), toon('#ffe066', { rim: 0.6 }), [0, 0.3, 0.12], null, 0.13, d); m(rbox(0.12, 0.04, 0.12, 0.02), toon('#ff9f4a'), [0, 0.28, 0.27], null, null, d);
      for (const k of [-1, 1]) m(sph(6), toon('#2a1838', { rim: 0 }), [k * 0.06, 0.35, 0.23], null, 0.025, d); m(sph(10), toon('#ffd040'), [0, 0.12, -0.24], [0.6, 0, 0], [0.08, 0.12, 0.05], d); return d; };
    const d1 = duck([0.62, 1.12, 0.85], 1), d2 = duck([0.85, 1.12, 0.35], 0.55);
    const bm = toon('#e8fbff', { opacity: 0.45, rim: 1 }); puffs(H, g, 7, bm, 0.1, (b, i, t) => { const k = (t * 0.3 + i / 7) % 1; b.position.set(Math.sin(i * 2.3 + t * 0.5) * 0.6, 1.2 + k * 1.6, Math.cos(i * 1.7) * 0.8); b.scale.setScalar((0.08 + (i % 3) * 0.05) * (1 - k * 0.4)); }, anims);
    wheel(-0.85, 0.5, 0.01);
    anims.push(t => { d1.position.y = 1.12 + Math.sin(t * 3) * 0.05; d1.rotation.y = Math.sin(t * 1.5) * 0.6; d2.position.y = 1.12 + Math.sin(t * 3 + 1) * 0.05; d2.rotation.y = Math.sin(t * 1.8 + 2) * 0.8; water.rotation.y = t; jet.scale.y = 1 + Math.sin(t * 10) * 0.15; });
    return 1.02; }
  if (V === 'snailhouse') {
    const sk = tmat(H, 'snailT', '#ffffff', T.snail(), { rim: 0.7 });
    const sb = m(capsule(0.42, 1.8), sk, [0, 0.38, 0.15], [1.57, 0, 0], [1.5, 1, 0.75]); outline(sb, '#3a8a5a', 1.04);
    m(sph(18), sk, [0, 0.7, 1.25], null, [0.5, 0.55, 0.5]); face(H, g, [0, 0.75, 1.72], 0.6, anims, 1);
    for (const k of [-1, 1]) { const at = G(g, [k * 0.2, 1.1, 1.35], [0.3, 0, k * 0.35]); m(capsule(0.035, 0.5), sk, [0, 0.25, 0], null, null, at); m(sph(10), toon('#ffe066', { emissive: '#ffcc33', ei: 0.6 }), [0, 0.55, 0], null, 0.07, at); anims.push(t => { at.rotation.z = k * 0.35 + Math.sin(t * 3 + k) * 0.15; }); }
    // faro de ladrillo a rayas con balcón, ventanitas, linterna con luz giratoria y tejadito
    const tw = G(g, [0, 0.55, -0.45]); const br = tmat(H, 'brickT', '#ffffff', T.brick(), { rim: 0.4 });
    m(lathe('tower', [[0.001, 0], [0.72, 0], [0.62, 0.8], [0.5, 1.4], [0.001, 1.4]], 24), br, null, null, null, tw);
    m(cyl(20), white, [0, 1.42, 0], null, [0.62, 0.06, 0.62], tw); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; m(cyl(6), white, [Math.cos(a) * 0.58, 1.55, Math.sin(a) * 0.58], null, [0.015, 0.22, 0.015], tw); } m(torus(0.58, 0.02, 24), white, [0, 1.66, 0], [1.57, 0, 0], null, tw);
    for (const y of [0.45, 0.95]) m(rbox(0.16, 0.2, 0.04, 0.04), toon('#ffe680', { emissive: '#ffcc33', ei: 0.7 }), [0, y, 0.6 - y * 0.08], [-0.1, 0, 0], null, tw);
    m(cyl(16), toon('#fff6a0', { emissive: '#ffe066', ei: 1, opacity: 0.85 }), [0, 1.7, 0], null, [0.34, 0.36, 0.34], tw); m(cone(16), toon('#ff6f6f', { rim: 0.5 }), [0, 2.05, 0], null, [0.44, 0.36, 0.44], tw); m(sph(8), gd, [0, 2.26, 0], null, 0.06, tw);
    const beam = G(tw, [0, 1.7, 0]); const bmM = basic('#fff6a0', { opacity: 0.3 }); bmM.blending = THREE.AdditiveBlending; const bm = m(geo('beamG', () => new THREE.ConeGeometry(0.55, 3, 16, 1, true)), bmM, [1.5, 0, 0], [0, 0, Math.PI / 2], null, beam); bm.renderOrder = 6;
    // rastro brillante de baba arcoíris
    const trail = []; for (let i = 0; i < 5; i++) trail.push(m(cyl(12), toon(['#ff9cc8', '#ffe066', '#7ee3c4', '#8fd8ff', '#b9a2f7'][i], { opacity: 0.55, rim: 0, emissive: '#ffffff', ei: 0.2 }), [0, 0.02, -1.3 - i * 0.28], null, [0.35 - i * 0.04, 0.01, 0.2]));
    for (const [x, z] of [[-0.7, 0.9], [0.7, 0.9], [-0.7, -0.9], [0.7, -0.9]]) wheel(x, z, 0.26, '#9fe8a8');
    anims.push(t => { beam.rotation.y = t * 2; sb.scale.z = 0.75 + Math.sin(t * 6) * 0.04; });
    return 0.95; }
  if (V === 'cake') {
    const fr = tmat(H, 'frost', '#ffffff', T.frosting(), { rim: 0.4 }), sp = tmat(H, 'sponge', '#ffffff', T.sponge(), { rim: 0.3 });
    const l1 = m(cyl(28), sp, [0, 0.62, 0], null, [1.35, 0.45, 1.35]); outline(l1, '#c07090', 1.03); m(cyl(28), fr, [0, 0.88, 0], null, [1.37, 0.08, 1.37]);
    const l2 = m(cyl(28), sp, [0, 1.08, 0], null, [0.98, 0.38, 0.98]); outline(l2, '#c07090', 1.03); m(cyl(28), fr, [0, 1.3, 0], null, [1.0, 0.08, 1.0]);
    // glaseado que gotea, nata, fresas y bolitas
    const cr = toon('#ffffff', { rim: 0.7 }); for (let i = 0; i < 18; i++) { const a = i / 18 * 6.28; m(capsule(0.06, 0.08 + (i % 3) * 0.08), fr, [Math.cos(a) * 1.37, 0.8 - (i % 3) * 0.04, Math.sin(a) * 1.37]); }
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; m(cone(8), cr, [Math.cos(a) * 1.2, 0.98, Math.sin(a) * 1.2], null, [0.11, 0.14, 0.11]); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + 0.2; const s = m(sph(10), toon('#ff3f5f', { rim: 0.6 }), [Math.cos(a) * 0.75, 1.42, Math.sin(a) * 0.75], null, [0.11, 0.13, 0.11]); m(cone(5), toon('#5fc86a'), [0, 1.0, 0], null, [0.6, 0.4, 0.6], s); }
    face(H, g, [0, 0.62, 1.37], 0.75, anims, 1);
    // velas a rayas con llamas y chispas
    const fl = toon('#ffb84a', { emissive: '#ff9f2a', ei: 1, rim: 0 }); const flames = [];
    for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28 + 0.6; const x = Math.cos(a) * 0.45, z = Math.sin(a) * 0.45; m(cyl(8), toon(['#7ee3c4', '#b9a2f7', '#ffd36b', '#ff9cc8', '#8fd8ff'][i]), [x, 1.55, z], null, [0.05, 0.4, 0.05]);
      for (let s = 0; s < 3; s++) m(torus(0.05, 0.012, 8), white, [x, 1.42 + s * 0.12, z], [1.57, 0, 0]); flames.push(m(H.dropGeo(), fl, [x, 1.82, z], [Math.PI, 0, 0], 0.07)); }
    const spk = toon('#fff6a0', { emissive: '#ffe066', ei: 1, rim: 0 }); puffs(H, g, 8, spk, 0.03, (p, i, t) => { const k = (t * 1.2 + i / 8) % 1, a = i * 0.785; p.position.set(Math.cos(a) * 0.45 + Math.cos(a * 3) * k * 0.3, 1.85 + k * 0.6, Math.sin(a) * 0.45 + Math.sin(a * 3) * k * 0.3); p.scale.setScalar(0.035 * (1 - k)); }, anims);
    // patines con ruedas
    for (const k of [-1, 1]) m(rbox(0.5, 0.12, 2.2, 0.05), toon('#ff9cc8', { rim: 0.5 }), [k * 0.9, 0.3, 0]);
    for (const [x, z] of [[-0.9, 0.85], [0.9, 0.85], [-0.9, -0.85], [0.9, -0.85]]) wheel(x, z, 0.23, '#ffe066');
    anims.push(t => flames.forEach((f, i) => { f.scale.set(0.07, 0.07 * (1 + Math.sin(t * 15 + i) * 0.3), 0.07); f.rotation.z = Math.PI + Math.sin(t * 9 + i) * 0.15; }));
    return 1.15; }
  if (V === 'paperplane') {
    const pp = tmat(H, 'paperT', '#ffffff', T.paper(), { side: THREE.DoubleSide, rim: 0.3, flat: true });
    const P = G(g);
    const plane = geo('plane2', () => { const v = [0, 0.62, 1.7, -1.45, 1.3, -1.3, -0.08, 0.6, -1.3, 0, 0.62, 1.7, 0.08, 0.6, -1.3, 1.45, 1.3, -1.3, 0, 0.62, 1.7, 0, 0.1, -1.15, -0.08, 0.6, -1.3, 0, 0.62, 1.7, 0.08, 0.6, -1.3, 0, 0.1, -1.15];
      const uv = [0.5, 1, 0, 0, 0.47, 0, 0.5, 1, 0.53, 0, 1, 0, 0.5, 1, 0.5, 0, 0.45, 0, 0.5, 1, 0.55, 0, 0.5, 0]; const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); gg.computeVertexNormals(); return gg; });
    const pl = m(plane, pp, null, null, null, P); outline(pl, '#9aa0c8', 1.02);
    // pliegues, puntas dobladas hacia arriba, pegatinas y cinta adhesiva
    for (const k of [-1, 1]) { m(capsule(0.01, 2.8), toon('#c8cce8', { rim: 0 }), [k * 0.4, 0.72, 0.15], [1.57, 0, k * 0.14], null, P); m(geo('tipG', () => new THREE.ConeGeometry(0.2, 0.35, 3)), pp, [k * 1.42, 1.45, -1.2], [0, 0, k * -0.3], [1, 1, 0.15], P); }
    m(H.starGeoS(), toon('#ffd36b', { emissive: '#ffcc33', ei: 0.4 }), [0.75, 1.05, -0.6], [-1.2, 0, -0.3], 0.13, P); m(sph(10), toon('#ff6f9a'), [-0.75, 1.05, -0.6], [0, 0, 0.3], [0.13, 0.02, 0.11], P);
    m(rbox(0.5, 0.02, 0.14, 0.01), toon('#fff6c0', { opacity: 0.8, rim: 0 }), [0, 0.64, 0.6], null, null, P);
    face(H, P, [0, 0.55, 1.55], 0.5, anims, 1, 0);
    // hélice de clip y estela de papelitos
    const pr = G(P, [0, 0.62, 1.75]); for (let i = 0; i < 2; i++) m(rbox(0.6, 0.06, 0.02, 0.01), toon('#ff6fa8', { rim: 0.5 }), null, [0, 0, i * 1.57], null, pr); m(sph(8), gd, null, null, 0.05, pr);
    const cs = ['#ff9cc8', '#ffe066', '#7ee3c4', '#8fd8ff'];
    const tr = []; for (let i = 0; i < 10; i++) tr.push(m(box(), toon(cs[i % 4], { side: THREE.DoubleSide, rim: 0 }), null, null, [0.12, 0.01, 0.08]));
    const cloud = toon('#ffffff', { opacity: 0.7, rim: 0.8 }); puffs(H, g, 4, cloud, 0.2, (c, i, t) => { const k = (t * 0.7 + i / 4) % 1; c.position.set((i % 2 ? 0.9 : -0.9), 0.8, -1.4 - k * 1.5); c.scale.setScalar(0.25 * (1 - k)); }, anims);
    wheel(0, 0, 0.01);
    anims.push(t => { P.position.y = 0.2 + Math.sin(t * 2.5) * 0.15; P.rotation.z = Math.sin(t * 1.7) * 0.12; pr.rotation.z = t * 20; tr.forEach((d, i) => { const k = (t * 1.1 + i / 10) % 1; d.position.set(Math.sin(i * 3) * 0.7, 0.6 + Math.cos(i) * 0.3 - k * 0.3, -1.3 - k * 1.8); d.rotation.set(t * 4 + i, t * 3, i); d.scale.setScalar(1); d.scale.set(0.12 * (1 - k), 0.01, 0.08 * (1 - k)); }); });
    return 0.85; }
  return null;
}
