// v18: pantalla de inicio espectacular + fondo de la selección de piloto + retratos para las casillas
import * as THREE from 'three';
import { toon, mesh, outline, glowTex, makeCharacter, animCharacter, starShape } from './gfx.js';

const add = (m) => new THREE.MeshBasicMaterial({ color: m, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
function sparkles(n, spread, h, cols, size) {
  const g = new THREE.BufferGeometry(), p = new Float32Array(n * 3), c = new Float32Array(n * 3), col = new THREE.Color();
  for (let i = 0; i < n; i++) { p[i * 3] = (Math.random() - 0.5) * spread; p[i * 3 + 1] = Math.random() * h; p[i * 3 + 2] = (Math.random() - 0.5) * spread; col.set(cols[i % cols.length]); c.set([col.r, col.g, col.b], i * 3); }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size, map: glowTex('#ffffff'), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  pts.userData.h = h; return pts;
}
function rainbow(r, w, parent, pos) {
  const cols = ['#ff6fa8', '#ffa64d', '#ffe066', '#7ee38a', '#6fc8ff', '#b28cff'], g = new THREE.Group(); g.position.set(...pos); parent.add(g);
  cols.forEach((c, i) => mesh(new THREE.TorusGeometry(r - i * w, w / 2, 8, 48, Math.PI), toon(c, { emissive: c, ei: 0.35, rim: 0 }), g)); return g;
}
const PAL = ['#ff8fc0', '#7ee3c4', '#b9a2f7', '#ffd36b', '#8fe3f0', '#ffb36b'];

// ---------- INICIO ----------
export function buildTitleFx(scene) {
  const G = new THREE.Group(); scene.add(G); const U = { spots: [], balloons: [], fw: [], islands: [], stars: [] };
  rainbow(26, 1.6, G, [0, -2, -45]);
  // castillo de gominola al fondo
  const cas = new THREE.Group(); cas.position.set(0, 0, -62); G.add(cas);
  mesh(new THREE.BoxGeometry(22, 12, 8), toon('#ffe0f0'), cas, [0, 6, 0]);
  for (const x of [-12, -4, 4, 12]) { const tw = mesh(new THREE.CylinderGeometry(2.4, 2.6, x % 8 ? 20 : 16, 16), toon(x % 8 ? '#ffd0ea' : '#e9dcff'), cas, [x, x % 8 ? 10 : 8, 0]);
    const cone = mesh(new THREE.ConeGeometry(3.2, 6, 16), toon(x % 8 ? '#ff8fc0' : '#b9a2f7'), cas, [x, (x % 8 ? 20 : 16) + 3, 0]); outline(cone, '#a06090', 1.04);
    const fl = mesh(new THREE.PlaneGeometry(2, 1.2), toon('#ffd36b', { emissive: '#ffd36b', ei: 0.3 }), cas, [x + 1, (x % 8 ? 20 : 16) + 7, 0]); U.stars.push(fl); }
  for (let i = 0; i < 9; i++) mesh(new THREE.SphereGeometry(0.6, 8, 6), toon('#fff6a8', { emissive: '#ffe680', ei: 0.9 }), cas, [-9 + i * 2.25, 9, 4.1]);
  // islas flotantes con cascadas de luz
  for (let i = 0; i < 6; i++) { const a = -1.2 + i * 0.48, r = 40 + (i % 2) * 12; const is = new THREE.Group(); is.position.set(Math.sin(a) * r, 14 + (i % 3) * 5, -Math.cos(a) * r); G.add(is);
    mesh(new THREE.ConeGeometry(3.5, 5, 10), toon('#c9a2e8'), is, [0, -2.5, 0], [Math.PI, 0, 0]); mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.8, 14), toon('#a8f0c8'), is, [0, 0.2, 0]);
    mesh(new THREE.SphereGeometry(1.4, 12, 10), toon(PAL[i], { emissive: PAL[i], ei: 0.3 }), is, [0.6, 1.6, 0]); U.islands.push({ g: is, y: is.position.y, p: i }); }
  // focos que barren el cielo
  for (let i = 0; i < 6; i++) { const s = new THREE.Group(); s.position.set(-24 + i * 9.6, 0, -30); G.add(s);
    const c = mesh(new THREE.ConeGeometry(4, 60, 20, 1, true), add(PAL[i]), s, [0, 30, 0]); c.material.opacity = 0.16; U.spots.push({ s, p: i }); }
  // globos
  for (let i = 0; i < 14; i++) { const b = new THREE.Group(); G.add(b); mesh(new THREE.SphereGeometry(1, 14, 10), toon(PAL[i % 6], { rim: 0.7 }), b, [0, 0, 0], null, [1, 1.2, 1]);
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 3, 4), toon('#ffffff'), b, [0, -2.4, 0]); const a = i * 0.9; U.balloons.push({ b, x: Math.cos(a) * (14 + i % 4 * 5), z: -Math.abs(Math.sin(a)) * 20 - 6, o: i * 3.1 }); }
  // estrellas giratorias alrededor de la plataforma
  const sg = new THREE.ExtrudeGeometry(starShape(0.7, 0.32), { depth: 0.25, bevelEnabled: false });
  const ring = new THREE.Group(); G.add(ring); U.ring = ring;
  for (let i = 0; i < 10; i++) { const st = mesh(sg, toon(PAL[i % 6], { emissive: PAL[i % 6], ei: 0.5 }), ring); const a = i / 10 * 6.28; st.position.set(Math.cos(a) * 8, 3 + Math.sin(i) * 0.8, Math.sin(a) * 8); }
  // halo de luz bajo los karts
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#ffb8e0'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); halo.scale.set(22, 22, 1); halo.position.y = 0.6; G.add(halo); U.halo = halo;
  U.sp = sparkles(260, 70, 30, ['#ffffff', '#ffd6f0', '#fff3a0', '#c8b8ff'], 0.9); U.sp.position.z = -6; G.add(U.sp);
  // fuegos artificiales
  for (let i = 0; i < 4; i++) { const f = sparkles(70, 0.1, 0.1, [PAL[i], '#ffffff'], 1.4); const d = new Float32Array(70 * 3); for (let k = 0; k < 70; k++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(6 + Math.random() * 3); d.set([v.x, v.y, v.z], k * 3); } f.userData.dir = d; G.add(f); U.fw.push({ f, o: i * 0.9 }); }
  G.userData = U; return G;
}
export function animTitleFx(G, t) {
  const U = G.userData;
  U.spots.forEach(({ s, p }) => { s.rotation.z = Math.sin(t * 0.7 + p) * 0.45; s.rotation.x = Math.cos(t * 0.5 + p * 1.3) * 0.2; });
  U.islands.forEach(({ g, y, p }) => { g.position.y = y + Math.sin(t * 0.8 + p) * 1.2; g.rotation.y = t * 0.1 + p; });
  U.balloons.forEach(({ b, x, z, o }) => { b.position.set(x + Math.sin(t * 0.4 + o) * 1.5, ((t * 1.6 + o * 4) % 40) - 6, z); });
  U.ring.rotation.y = t * 0.4; U.ring.children.forEach((s, i) => { s.rotation.y = t * 2 + i; });
  U.halo.material.opacity = 0.16 + Math.sin(t * 2) * 0.06;
  U.stars.forEach((f, i) => { f.rotation.y = Math.sin(t * 3 + i) * 0.5; });
  const p = U.sp.geometry.attributes.position; for (let i = 0; i < p.count; i++) { let y = p.getY(i) + 0.03; if (y > U.sp.userData.h) y = 0; p.setY(i, y); } p.needsUpdate = true;
  U.fw.forEach(({ f, o }, i) => { const c = (t * 0.45 + o) % 3.2, k = Math.min(c, 1.6); f.visible = c < 1.6; f.material.opacity = Math.max(0, 1 - c / 1.6);
    if (c < 0.05 || !f.userData.at) f.userData.at = [(-1 + i * 0.66) * 22 + Math.sin(t) * 4, 20 + (i % 2) * 6, -34];
    const P = f.geometry.attributes.position, d = f.userData.dir, a = f.userData.at; for (let j = 0; j < P.count; j++) P.setXYZ(j, a[0] + d[j * 3] * k, a[1] + d[j * 3 + 1] * k - k * k * 1.2, a[2] + d[j * 3 + 2] * k); P.needsUpdate = true; });
}

// ---------- FONDO DE LA SELECCIÓN ----------
export function buildSelBg(scene) {
  const G = new THREE.Group(); G.visible = false; scene.add(G); const U = {};
  rainbow(16, 1.2, G, [0, -1, -26]);
  // anfiteatro de cristal con columnas de luz
  for (let i = 0; i < 9; i++) { const a = -1.1 + i * 0.275, x = Math.sin(a) * 18, z = -Math.cos(a) * 18 + 2;
    const col = mesh(new THREE.CylinderGeometry(0.7, 0.9, 12, 12), toon(PAL[i % 6], { opacity: 0.85, rim: 0.8 }), G, [x, 6, z]); outline(col, '#a06090', 1.04);
    mesh(new THREE.SphereGeometry(1.1, 12, 10), toon('#fff6c0', { emissive: '#ffe680', ei: 0.9 }), G, [x, 12.8, z]); }
  const beams = []; for (let i = 0; i < 4; i++) { const b = mesh(new THREE.ConeGeometry(3.2, 26, 20, 1, true), add(PAL[i]), G, [(i - 1.5) * 4, 13, -2]); b.material.opacity = 0.13; beams.push(b); } U.beams = beams;
  // anillo de luz en el suelo con el color del piloto
  U.disc = mesh(new THREE.RingGeometry(5.4, 7.6, 48), add('#ff9cc8'), G, [0, 0.85, 0], [-Math.PI / 2, 0, 0]); U.disc.material.opacity = 0.5;
  U.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#ffffff'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); U.halo.scale.set(13, 13, 1); U.halo.position.set(0, 3, -3); G.add(U.halo);
  // estrellas en órbita: el "aura" de detalle del piloto
  const sg = new THREE.ExtrudeGeometry(starShape(0.35, 0.16), { depth: 0.12, bevelEnabled: false });
  U.orbit = new THREE.Group(); U.orbit.position.y = 2; G.add(U.orbit);
  for (let i = 0; i < 8; i++) mesh(sg, toon('#ffffff', { emissive: '#ffffff', ei: 0.4 }), U.orbit);
  U.sp = sparkles(160, 30, 16, ['#ffffff', '#fff3a0', '#ffd6f0'], 0.7); U.sp.position.z = -4; G.add(U.sp);
  G.userData = U; return G;
}
export function setSelColor(G, color) { const U = G.userData; U.disc.material.color.set(color); U.halo.material.color.set(color); U.orbit.children.forEach(s => { s.material.color.set(color); s.material.emissive && s.material.emissive.set(color); }); }
export function animSelBg(G, t) {
  const U = G.userData; U.beams.forEach((b, i) => { b.rotation.z = Math.sin(t * 0.8 + i * 1.7) * 0.35; });
  U.disc.rotation.z = t * 0.5; U.disc.material.opacity = 0.4 + Math.sin(t * 3) * 0.15; U.halo.material.opacity = 0.55 + Math.sin(t * 1.7) * 0.2;
  U.orbit.children.forEach((s, i) => { const a = t * 1.1 + i / 8 * 6.28; s.position.set(Math.cos(a) * 3.4, Math.sin(a * 2) * 0.6 + 0.4, Math.sin(a) * 3.4); s.rotation.y = t * 3; });
  const p = U.sp.geometry.attributes.position; for (let i = 0; i < p.count; i++) { let y = p.getY(i) + 0.025; if (y > 16) y = 0; p.setY(i, y); } p.needsUpdate = true;
}

// ---------- RETRATOS (una sola vez, con un render pequeño aparte) ----------
// v23: retratos en segundo plano (uno por tick mientras se ve el inicio) para que «¡Jugar!» pase a la selección al instante
let pR = null;
export function makePortraitsAsync(chars, out, done) {
  let i = 0; const step = () => { if (i >= chars.length || out.__done) { finishP(out); done && done(); return; } const ch = chars[i++]; if (!out[ch.id]) portraitOne(ch, i, out); setTimeout(step, 30); };
  setTimeout(step, 0);
}
function portraitOne(ch, i, out) {
  if (!pR) { try { pR = { r: new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }) }; } catch (e) { return; } pR.r.setSize(160, 160, false); pR.r.setClearColor(0x000000, 0);
    pR.sc = new THREE.Scene(); pR.sc.add(new THREE.HemisphereLight('#ffffff', '#ffd6ea', 1.5)); const d = new THREE.DirectionalLight('#fff4e8', 1.4); d.position.set(3, 5, 6); pR.sc.add(d);
    pR.cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50); pR.cam.position.set(0, 1.25, 5.2); pR.cam.lookAt(0, 0.95, 0); }
  const c = makeCharacter(ch); c.rotation.y = -0.35; pR.sc.add(c); animCharacter(c, 0.4, 1, i % 2 ? 'happy' : '', 0); pR.r.render(pR.sc, pR.cam); out[ch.id] = pR.r.domElement.toDataURL('image/png'); pR.sc.remove(c);
}
function finishP(out) { out.__done = true; if (pR) { pR.r.dispose(); pR.r.forceContextLoss(); pR = null; } }
export function finishPortraits(chars, out) { if (out.__done) return out; chars.forEach((ch, i) => { if (!out[ch.id]) portraitOne(ch, i + 1, out); }); finishP(out); return out; }
export function makePortraits(chars) {
  const out = {}; let r;
  try { r = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }); } catch (e) { return out; }
  r.setSize(160, 160, false); r.setClearColor(0x000000, 0);
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight('#ffffff', '#ffd6ea', 1.5)); const d = new THREE.DirectionalLight('#fff4e8', 1.4); d.position.set(3, 5, 6); sc.add(d);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50); cam.position.set(0, 1.25, 5.2); cam.lookAt(0, 0.95, 0);
  chars.forEach((ch, i) => { const c = makeCharacter(ch); c.rotation.y = -0.35; sc.add(c); animCharacter(c, 0.4, 1, i % 2 ? 'happy' : '', 0); r.render(sc, cam); out[ch.id] = r.domElement.toDataURL('image/png'); sc.remove(c); });
  r.dispose(); r.forceContextLoss(); return out;
}
// animación propia de cada piloto (casilla y piloto grande)
export const ANIMS = ['salta', 'saluda', 'gira', 'bota', 'baila', 'flota', 'asiente', 'brinca'];
export function animPreview(k, t, idx) {
  const a = ANIMS[idx % ANIMS.length], tl = k.userData.tilt; tl.rotation.set(0, 0, 0); tl.position.y = 0; tl.scale.set(1, 1, 1);
  if (a === 'salta' || a === 'brinca') tl.position.y = Math.abs(Math.sin(t * (a === 'salta' ? 3 : 5))) * (a === 'salta' ? 0.7 : 0.35);
  else if (a === 'saluda') tl.rotation.z = Math.sin(t * 5) * 0.18;
  else if (a === 'gira') tl.rotation.y = (t * 2.5) % 6.28 < 1.6 ? ((t * 2.5) % 6.28) * 3.93 : 0;
  else if (a === 'bota') { const s = Math.sin(t * 6); tl.scale.set(1 + s * 0.06, 1 - s * 0.06, 1 + s * 0.06); tl.position.y = Math.max(0, s) * 0.2; }
  else if (a === 'baila') { tl.rotation.z = Math.sin(t * 4) * 0.12; tl.rotation.y = Math.sin(t * 2) * 0.5; }
  else if (a === 'flota') tl.position.y = 0.3 + Math.sin(t * 2) * 0.3;
  else tl.rotation.x = Math.sin(t * 4) * 0.12;
}
