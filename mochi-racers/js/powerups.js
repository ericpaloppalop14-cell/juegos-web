// ======================================================================
//  MOCHI RACERS v10 · 10 potenciadores surrealistas
//  Todos los efectos son temporales y se montan ENCIMA de la física normal
//  (multiplicador de velocidad, piloto automático, inmunidad...). La
//  conducción normal no cambia.
// ======================================================================
import * as THREE from 'three';
import { toon, mesh, outline, glowTex, starShape } from './gfx.js';
import { Audio } from './audio.js';

const V3 = THREE.Vector3, R = Math.random;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

export const POWER = {
  tiburon:  { name: 'Tiburón Ciudad',        icon: '🦈', hint: 'Un tiburón de cristal con una ciudad dentro te lleva hasta el 1º puesto' },
  estrella: { name: 'Superestrella',         icon: '🌟', hint: 'Invencible: ¡lanzas por los aires a todo el que tocas!' },
  aladelta: { name: 'Ala Delta',             icon: '🪁', hint: '5 s volando por arriba con turbo y piloto automático' },
  reloj:    { name: 'Reloj Derretido',       icon: '🕰️', hint: 'El tiempo se derrite para los que van delante' },
  piano:    { name: 'Piano del Cielo',       icon: '🎹', hint: 'Cae un piano encima del líder: ¡CHAF!' },
  peces:    { name: 'Banco de Peces Voladores', icon: '🐟', hint: 'Tres peces voladores persiguen a los de delante' },
  tetera:   { name: 'Tetera Tornado',        icon: '🫖', hint: 'Un remolino de té recorre la pista y hace girar a todos' },
  portal:   { name: 'Puerta Espejo',         icon: '🌀', hint: 'Cruzas un espejo y apareces 70 m más adelante' },
  chicle:   { name: 'Globo de Chicle',       icon: '🎈', hint: 'Botas como una pelota por encima de todo' },
  antigrav: { name: 'Burbuja Antigravedad',  icon: '🪐', hint: 'Los que tienes cerca salen flotando en burbujas' },
};
// pesos por posición: [delante, mitad, detrás]
export const POWER_W = {
  tiburon: [0, 0.3, 2.2], estrella: [0, 0.8, 2.0], aladelta: [0.2, 1.2, 1.8], reloj: [0, 1.0, 1.6], piano: [0, 0.8, 1.6],
  peces: [0.4, 1.6, 1.4], tetera: [2.0, 1.6, 0.6], portal: [0.8, 1.4, 1.2], chicle: [1.6, 1.4, 0.8], antigrav: [1.4, 1.2, 0.6],
};
// solo afectan a quien los usa (justos en el online P2P)
export const SELF_POWERS = ['tiburon', 'estrella', 'aladelta', 'portal', 'chicle'];

// ---------------- geometría y materiales compartidos ----------------
const G = {}; const geo = (n, f) => G[n] || (G[n] = f());
const M = {}; const mat = (n, f) => M[n] || (M[n] = f());
const sph = s => geo('ps' + s, () => new THREE.SphereGeometry(1, s, Math.max(6, s * 0.7 | 0)));
const box = () => geo('pbox', () => new THREE.BoxGeometry(1, 1, 1));
const cone = s => geo('pcone' + s, () => new THREE.ConeGeometry(1, 1, s));
const cyl = s => geo('pcyl' + s, () => new THREE.CylinderGeometry(1, 1, 1, s));
const add = (o, b = 1) => new THREE.MeshBasicMaterial({ color: o, transparent: true, opacity: b, blending: THREE.AdditiveBlending, depthWrite: false });
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const sprite = (color, s, op = 0.8) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(color), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: op })); sp.scale.setScalar(s); return sp; };

const windowTex = () => mat('winTex', () => canvasTex(64, 128, (x, w, h) => { x.fillStyle = '#4a3a8a'; x.fillRect(0, 0, w, h); for (let j = 0; j < 8; j++) for (let i = 0; i < 3; i++) { x.fillStyle = R() < 0.75 ? ['#ffe9a0', '#ffd0f0', '#a0f0ff'][(i + j) % 3] : '#2a1a5a'; x.fillRect(6 + i * 20, 6 + j * 15, 12, 9); } }));

// --- Tiburón con ciudad dentro ---
function makeShark() {
  const g = new THREE.Group();
  const glass = mat('sharkGlass', () => toon('#7fd8ff', { opacity: 0.34, rim: 1.2, emissive: '#3fa8ff', ei: 0.25, nocache: true }));
  const fin = mat('sharkFin', () => toon('#5fb0f0', { opacity: 0.55, rim: 1, emissive: '#3f8fff', ei: 0.2, nocache: true }));
  const body = mesh(sph(24), glass, g, [0, 2.2, 0.2], null, [2.4, 2.1, 5.2]); body.renderOrder = 6;
  mesh(cone(10), fin, g, [0, 4.9, -0.4], [-0.35, 0, 0], [0.5, 2.0, 1.3]).renderOrder = 6;
  const tail = new THREE.Group(); tail.position.set(0, 2.4, -5.2); g.add(tail);
  mesh(cone(10), fin, tail, [0, 1.0, -0.9], [-0.9, 0, 0], [0.35, 2.2, 0.9]).renderOrder = 6;
  mesh(cone(10), fin, tail, [0, -0.7, -0.8], [-2.3, 0, 0], [0.3, 1.6, 0.8]).renderOrder = 6;
  for (const s of [-1, 1]) { mesh(cone(8), fin, g, [s * 2.3, 1.3, 0.8], [0.4, 0, s * 1.9], [0.35, 1.8, 1.0]).renderOrder = 6;
    const e = mesh(sph(12), toon('#ffffff'), g, [s * 1.35, 3.0, 4.0], null, 0.42); mesh(sph(10), toon('#1a1030', { rim: 0 }), e, [s * 0.15, 0.1, 0.7], null, 0.55); mesh(sph(6), toon('#ffffff', { rim: 0 }), e, [s * 0.05, 0.4, 0.95], null, 0.18); }
  for (let i = 0; i < 9; i++) { const a = (i / 8 - 0.5) * 2.2; mesh(cone(4), toon('#ffffff', { emissive: '#ffffff', ei: 0.2 }), g, [Math.sin(a) * 1.6, 1.25, 4.3 + Math.cos(a) * 0.4], [Math.PI, 0, 0], [0.16, 0.45, 0.16]); }
  // la ciudad: edificios con ventanas encendidas y una cúpula
  const city = new THREE.Group(); city.position.set(0, 0.6, -1.8); g.add(city);
  const bm = [mat('bA', () => toon('#c9b8ff', { emissive: '#ffffff', ei: 0.1 })), mat('bB', () => toon('#ffb3d6', { emissive: '#ffffff', ei: 0.1 })), mat('bC', () => toon('#9fe8ff', { emissive: '#ffffff', ei: 0.1 }))];
  const wm = mat('winM', () => new THREE.MeshBasicMaterial({ map: windowTex() }));
  const B = [[-1.0, 0.8, 1.6], [0.1, 0.7, 2.4], [1.0, 0.9, 1.3], [-0.5, -0.7, 1.9], [0.7, -0.9, 2.8], [-1.1, -1.8, 1.2], [0.3, -2.2, 1.7], [1.2, -2.6, 1.0]];
  B.forEach(([x, z, h], i) => { const b = mesh(box(), i % 2 ? wm : bm[i % 3], city, [x, h / 2, z], null, [0.6, h, 0.6]); if (i === 1) mesh(sph(10), bm[2], city, [x, h + 0.1, z], null, 0.42); if (i === 4) mesh(cone(6), bm[1], city, [x, h + 0.4, z], null, [0.3, 0.8, 0.3]); });
  for (let i = 0; i < 5; i++) mesh(sph(6), add('#ffe9a0', 0.9), city, [(R() - 0.5) * 2, 0.4 + R() * 2, (R() - 0.5) * 4], null, 0.09);
  const glow = sprite('#7fd8ff', 13, 0.35); glow.position.set(0, 2.2, 0); g.add(glow);
  g.userData = { tail, city, body };
  g.scale.setScalar(0.72); g.position.z = 0.8; // cabe la cámara por detrás: se ve el tiburón entero
  return g;
}
// --- Superestrella ---
function makeStarAura() {
  const g = new THREE.Group();
  const sg = geo('pstar', () => new THREE.ExtrudeGeometry(starShape(0.6, 0.27), { depth: 0.2, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 1 }));
  const stars = []; for (let i = 0; i < 5; i++) { const s = mesh(sg, toon(['#ffe066', '#ff8fd8', '#7ff5ff', '#9dff7a', '#ffb36b'][i], { emissive: '#ffffff', ei: 0.35 }), g); stars.push(s); }
  stars.forEach(s => s.scale.setScalar(1.5));
  const shell = mesh(sph(20), add('#ffe066', 0.16), g, [0, 1.3, 0], null, 2.4);
  const glow = sprite('#fff2a0', 5, 0.45); glow.position.y = 1.3; g.add(glow);
  g.userData = { stars, shell, glow };
  return g;
}
// --- Ala delta ---
function makeGlider() {
  const g = new THREE.Group();
  const tex = mat('gliderTex', () => canvasTex(256, 128, (x, w, h) => { const c = ['#ff6fb0', '#ffd84a', '#7ff5ff', '#b98cff', '#9dff7a', '#ff9f5a']; for (let i = 0; i < 6; i++) { x.fillStyle = c[i]; x.beginPath(); x.moveTo(w / 2, 0); x.lineTo(i * w / 6, h); x.lineTo((i + 1) * w / 6, h); x.closePath(); x.fill(); } }));
  const wg = geo('wing', () => { const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 2.6, -4.2, -0.4, -1.4, 4.2, -0.4, -1.4], 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute([0.5, 0, 0, 1, 1, 1], 2)); gg.computeVertexNormals(); return gg; });
  mesh(wg, mat('wingM', () => new THREE.MeshToonMaterial({ map: tex, side: THREE.DoubleSide })), g, [0, 3.6, 0]);
  const rod = mat('rod', () => toon('#5a3a6e'));
  for (const s of [-1, 1]) mesh(cyl(6), rod, g, [s * 0.7, 2.6, 0.2], [0, 0, s * 0.5], [0.06, 2.1, 0.06]);
  mesh(cyl(6), rod, g, [0, 3.65, 0.6], [Math.PI / 2, 0, 0], [0.07, 4, 0.07]);
  for (const s of [-1, 1]) { const t = sprite('#ffffff', 1.4, 0.6); t.position.set(s * 4.1, 3.2, -1.4); g.add(t); }
  return g;
}
// --- Reloj derretido (encima de la cabeza) ---
function makeClock() {
  const g = new THREE.Group();
  const face = mat('clockFace', () => canvasTex(128, 128, (x) => { x.fillStyle = '#fff4d6'; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill(); x.strokeStyle = '#c08a3a'; x.lineWidth = 8; x.stroke(); x.fillStyle = '#5a3a2a'; x.font = '700 20px Fredoka, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; for (let i = 1; i <= 12; i++) { const a = i / 12 * 6.283 - 1.571; x.fillText(String(i), 64 + Math.cos(a) * 44, 64 + Math.sin(a) * 44); } }));
  const dg = geo('meltClock', () => { const gg = new THREE.CircleGeometry(1, 28); const p = gg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); if (y < 0) p.setY(i, y * (1.4 + Math.max(0, Math.sin(x * 4)) * 0.9)); } return gg; });
  mesh(dg, mat('clockM', () => new THREE.MeshBasicMaterial({ map: face, side: THREE.DoubleSide })), g, [0, 0, 0], null, 1.0);
  const hands = new THREE.Group(); g.add(hands); hands.position.z = 0.02;
  mesh(box(), mat('hand', () => new THREE.MeshBasicMaterial({ color: '#3a2050' })), hands, [0, 0.3, 0], null, [0.07, 0.6, 0.02]);
  const h2 = mesh(box(), M.hand, hands, [0.2, 0, 0], null, [0.42, 0.06, 0.02]);
  g.userData = { hands };
  return g;
}
// --- Piano ---
function makePiano() {
  const g = new THREE.Group();
  const blk = mat('pianoB', () => toon('#2a1838', { rim: 0.9 })), wht = mat('pianoW', () => toon('#ffffff')), gold = mat('pianoG', () => toon('#ffd84a', { emissive: '#ffb000', ei: 0.3 }));
  const b = mesh(box(), blk, g, [0, 1.6, 0], null, [4, 1.3, 3]); outline(b, '#ff8fd8', 1.05);
  mesh(box(), wht, g, [0, 1.95, 1.65], null, [3.7, 0.25, 0.6]);
  for (let i = 0; i < 9; i++) mesh(box(), blk, g, [-1.6 + i * 0.4, 2.12, 1.6], null, [0.18, 0.16, 0.38]);
  mesh(box(), blk, g, [0, 2.8, -0.4], [-0.5, 0, 0], [3.9, 0.12, 2.6]);
  for (const [x, z] of [[-1.7, 1.2], [1.7, 1.2], [0, -1.2]]) mesh(cyl(8), gold, g, [x, 0.5, z], null, [0.18, 1.0, 0.18]);
  for (let i = 0; i < 3; i++) { const n = mesh(sph(8), gold, g, [-1 + i, 4 + i * 0.6, 0], null, 0.25); mesh(box(), gold, n, [0.9, 2.2, 0], null, [0.3, 4, 0.3]); }
  return g;
}
const ringGeo = () => geo('pring', () => new THREE.RingGeometry(0.8, 1, 32));
// --- Pez volador ---
function makeFish(i) {
  const g = new THREE.Group();
  const c = ['#ff9f5a', '#7ff5ff', '#ff8fd8'][i % 3];
  const b = mesh(sph(14), toon(c, { rim: 0.8, emissive: c, ei: 0.15 }), g, [0, 0, 0], null, [0.55, 0.65, 1.2]); outline(b, '#5a3a6e', 1.06);
  const tl = mesh(cone(8), toon(c), g, [0, 0, -1.3], [-Math.PI / 2, 0, 0], [0.5, 0.8, 0.2]);
  const wings = []; for (const s of [-1, 1]) { const w = mesh(sph(10), toon('#ffffff', { opacity: 0.75 }), g, [s * 0.7, 0.2, 0.1], null, [0.9, 0.06, 0.45]); wings.push([w, s]); }
  for (const s of [-1, 1]) { const e = mesh(sph(8), toon('#ffffff'), g, [s * 0.38, 0.22, 0.8], null, 0.2); mesh(sph(6), toon('#1a1030', { rim: 0 }), e, [0, 0, 0.6], null, 0.6); }
  g.userData = { wings, tl }; g.scale.setScalar(1.4);
  return g;
}
// --- Tetera tornado ---
function makeTeapot() {
  const g = new THREE.Group();
  const pot = new THREE.Group(); pot.position.y = 3.6; g.add(pot);
  const pm = toon('#9fe8ff', { rim: 0.8 }), dm = toon('#ff8fd8');
  const b = mesh(geo('potBody', () => new THREE.LatheGeometry([[0.01, -1], [0.9, -0.95], [1.3, -0.4], [1.3, 0.3], [0.8, 0.9], [0.01, 0.95]].map(([r, y]) => new THREE.Vector2(r, y)), 20)), pm, pot); outline(b, '#5a3a6e', 1.05);
  for (let i = 0; i < 6; i++) mesh(sph(8), dm, pot, [Math.cos(i) * 1.28, -0.1, Math.sin(i) * 1.28], null, 0.18);
  mesh(cyl(8), pm, pot, [1.5, 0.2, 0], [0, 0, -0.9], [0.18, 1.3, 0.18]);
  mesh(geo('potHandle', () => new THREE.TorusGeometry(0.55, 0.12, 6, 16, Math.PI * 1.3)), dm, pot, [-1.3, 0.1, 0], [0, 0, 1.0]);
  mesh(sph(10), dm, pot, [0, 1.05, 0], null, 0.25);
  const tw = mesh(geo('twister', () => { const gg = new THREE.ConeGeometry(2.2, 4.4, 20, 4, true); gg.rotateX(Math.PI); gg.translate(0, 2.2, 0); return gg; }), mat('twistM', () => new THREE.MeshBasicMaterial({ color: '#d8a46a', transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false })), g);
  const tw2 = mesh(G.twister, mat('twistM2', () => add('#fff4d6', 0.35)), g, [0, 0, 0], null, [0.7, 1, 0.7]);
  g.userData = { pot, tw, tw2 }; g.scale.setScalar(1.5);
  return g;
}
// --- Portal espejo ---
function makePortal() {
  const g = new THREE.Group();
  const swirl = mat('swirlTex', () => canvasTex(128, 128, (x) => { const gr = x.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, '#c8a8ff'); gr.addColorStop(1, '#5f3fbf'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 5; for (let k = 0; k < 4; k++) { x.beginPath(); for (let a = 0; a < 9; a += 0.1) { const r = a * 6; x.lineTo(64 + Math.cos(a + k * 1.57) * r, 64 + Math.sin(a + k * 1.57) * r); } x.stroke(); } }));
  const disc = mesh(geo('pdisc', () => new THREE.CircleGeometry(3, 32)), new THREE.MeshBasicMaterial({ map: swirl, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }), g, [0, 3.2, 0]);
  const frame = mesh(geo('pframe', () => new THREE.TorusGeometry(3.1, 0.35, 10, 36)), toon('#ffd84a', { emissive: '#ffb000', ei: 0.4, rim: 1 }), g, [0, 3.2, 0]);
  const glow = sprite('#c8a8ff', 11, 0.6); glow.position.y = 3.2; g.add(glow);
  g.userData = { disc, frame }; g.visible = false;
  return g;
}
// --- Globo de chicle / burbuja antigravedad ---
function makeBubble(color, hi) {
  const g = new THREE.Group();
  const b = mesh(sph(20), toon(color, { opacity: 0.42, rim: 1.3, emissive: color, ei: 0.2, nocache: true }), g, [0, 1.4, 0], null, 2.5); b.renderOrder = 7;
  const s = mesh(sph(8), add('#ffffff', 0.7), g, [-0.8, 2.6, 1.2], null, [0.45, 0.3, 0.2]);
  if (hi) for (let i = 0; i < 2; i++) mesh(geo('aring', () => new THREE.TorusGeometry(2.9, 0.06, 6, 40)), mat('aringM', () => add('#c8a8ff', 0.8)), g, [0, 1.4, 0], [1.2 + i * 0.7, i, 0]);
  g.userData = { b };
  return g;
}

// ======================================================================
export class PowerFX {
  constructor(race) {
    this.race = race; this.projs = []; this.portals = [makePortal(), makePortal()]; this.portals.forEach(p => race.scene.add(p)); this.pI = 0;
    // pools para proyectiles
    this.pool = { piano: [], fish: [], tea: [] };
  }
  get T() { return this.race.track; }
  // ---------- estado por kart ----------
  immune(k) { return k.sharkT > 0 || k.starT > 0 || k.flyT > 0 || k.gumT > 0; }
  attach(k, key, make) { const u = k.mesh.userData; if (!u['fx_' + key]) { const m = make(); m.visible = false; k.mesh.add(m); u['fx_' + key] = m; } return u['fx_' + key]; }
  // multiplicador de velocidad, piloto automático, flotar...
  input(k, inp, dt) {
    if (k.remote) return inp;
    let v = 1;
    if (k.sharkT > 0) { k.sharkT -= dt; k.sharkAge = (k.sharkAge || 0) + dt; v = 2.0; k.boostT = Math.max(k.boostT, 0.25); if ((k.place === 1 && k.sharkAge > 1.5) || k.sharkT <= 0) { k.sharkT = 0; k.invT = Math.max(k.invT, 1); if (k.isPlayer) this.race.msg('¡Tiburón: eres el 1º!', k, '#7fd8ff'); } }
    if (k.starT > 0) { k.starT -= dt; v = Math.max(v, 1.22); }
    if (k.flyT > 0) { k.flyT -= dt; v = Math.max(v, 1.6); k.boostT = Math.max(k.boostT, 0.2); }
    if (k.gumT > 0) { k.gumT -= dt; v = Math.max(v, 1.22); if (!k.air && k.gumT > 0.3) { k.vy = 11; k.air = true; k.hop = true; if (k.isPlayer) Audio.sfxPlay('drift'); } }
    if (k.slowT > 0) { k.slowT -= dt; if (!this.immune(k)) v *= 0.58; }
    if (k.floatT > 0) { k.floatT -= dt; if (this.immune(k)) k.floatT = 0; else { k.vy = Math.max(k.vy, 2.2 + Math.sin(this.race.time * 3) * 0.6); k.air = true; k.hop = true; const f = Math.exp(-dt * 1.1); k.vx *= f; k.vz *= f; inp = { ...inp, steer: inp.steer * 0.3 }; } }
    k.fxV = v;
    if (k.sharkT > 0 || k.flyT > 0) inp = this.auto(k, inp, dt);
    k.flyH = lerp(k.flyH || 0, k.flyT > 0.4 ? 7 : 0, 1 - Math.exp(-dt * (k.flyT > 0 ? 3 : 5)));
    return inp;
  }
  // piloto automático por el centro de la pista (solo mientras dura el efecto)
  auto(k, inp, dt) {
    const T = this.T, look = Math.round((8 + Math.max(0, k.fs) * 0.45) / T.STEP);
    const ti = T.open ? Math.min(T.N - 1, k.idx + look) : (k.idx + look) % T.N, s = T.S[ti];
    const want = Math.atan2(s.p.x - k.pos.x, s.p.z - k.pos.z);
    k.yaw += angDiff(k.yaw, want) * (1 - Math.exp(-dt * 6)); k.driftDir = 0; k.spinT = 0; k.squashT = 0;
    return { steer: 0, throttle: 1, brake: false, drift: false, driftEdge: false, itemEdge: inp.itemEdge };
  }
  // choques kart-kart: estrella y tiburón lanzan por los aires
  collide(a, b) {
    const A = a.starT > 0 || a.sharkT > 0, B = b.starT > 0 || b.sharkT > 0;
    if (!A && !B) return a.flyT > 0 || b.flyT > 0; // ala delta: pasa por encima
    const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, r = 1.6 * (a.megaS + b.megaS);
    if (dx * dx + dz * dz > r * r) return true;
    if (A && !B) this.launch(b, a); else if (B && !A) this.launch(a, b);
    return true;
  }
  launch(v, by) {
    if (v.remote || v.invT > 0 || this.immune(v) || v.launchCD > this.race.time) return;
    v.launchCD = this.race.time + 1.2;
    const dx = v.pos.x - by.pos.x, dz = v.pos.z - by.pos.z, d = Math.hypot(dx, dz) || 1;
    v.vx = dx / d * 14 + by.vx * 0.3; v.vz = dz / d * 14 + by.vz * 0.3; v.vy = 15; v.air = true; v.hop = true; v.spinT = 1.4; v.driftDir = 0; v.boostT = 0; v.shieldT = 0;
    Audio.sfxPlay('bump');
    for (let i = 0; i < 14; i++) this.race.emit(v.pos.clone().add(new V3(0, 1, 0)), ['#ffe066', '#ff8fd8', '#7ff5ff'][i % 3], 0.9, 0.6, new V3((R() - 0.5) * 12, R() * 10, (R() - 0.5) * 12));
    if (v.isPlayer) this.race.msg('¡Por los aires!', v, '#ff8fb0');
    if (by.isPlayer) { this.race.msg('¡A volar, ' + v.ch.name + '!', by, '#ffd84a'); this.race.stats.hits = (this.race.stats.hits || 0) + 1; }
  }
  // ---------- usar ----------
  use(k, it) {
    const RC = this.race, T = this.T, P = k.isPlayer, near = P || k.pos.distanceTo(RC.player.pos) < 70;
    const ahead = RC.karts.filter(o => o !== k && !o.finished && !o.out && o.place < k.place).sort((a, b) => b.place - a.place);
    switch (it) {
      case 'tiburon': k.sharkT = 10; k.sharkAge = 0; k.flyT = 0; if (P) RC.msg('¡TIBURÓN CIUDAD!', k, '#7fd8ff'); if (near) Audio.sfxPlay('grow'); break;
      case 'estrella': k.starT = 7; if (P) RC.msg('¡SUPERESTRELLA!', k, '#ffe066'); if (near) Audio.sfxPlay('stars'); break;
      case 'aladelta': k.flyT = 5; if (P) RC.msg('¡Ala delta! ¡A volar!', k, '#7ff5ff'); if (near) Audio.sfxPlay('boost'); break;
      case 'reloj': { let n = 0; for (const o of ahead) { if (o.remote) continue; if (o.dist - k.dist > 180) continue; if (o.shieldT > 0) { o.shieldT = 0; continue; } o.slowT = 3.6; n++; if (o.isPlayer) RC.msg('¡Se te derrite el tiempo!', o, '#ffb36b'); }
        if (P) RC.msg(n ? `¡Tiempo derretido para ${n}!` : '¡Reloj derretido!', k, '#ffb36b'); if (P || RC.player.slowT > 0) Audio.sfxPlay('magnet'); break; }
      case 'piano': { const tg = RC.karts.find(o => o.place === 1 && o !== k && !o.remote) || ahead[ahead.length - 1]; if (!tg) break;
        const m = this.take('piano', makePiano); m.position.copy(tg.pos); m.position.y += 40; this.projs.push({ type: 'piano', mesh: m, owner: k, target: tg, t: 0, ring: this.ringFor() });
        if (P) RC.msg('¡Piano para ' + tg.ch.name + '!', k, '#ffd84a'); if (tg.isPlayer) RC.msg('¡CUIDADO ARRIBA!', tg, '#ff6f9a'); Audio.sfxPlay('missile'); break; }
      case 'peces': { const tgs = ahead.slice(-3).reverse(); for (let i = 0; i < 3; i++) { const tg = tgs[i] || null; const m = this.take('fish', () => makeFish(i)); m.position.copy(k.pos).add(new V3((i - 1) * 1.5, 2, 0)); this.projs.push({ type: 'fish', mesh: m, owner: k, target: tg, t: 0, life: 4.5, dir: new V3(Math.sin(k.yaw), 0, Math.cos(k.yaw)), idx: k.idx, ph: i }); }
        if (P) RC.msg('¡Peces voladores!', k, '#ff9f5a'); if (near) Audio.sfxPlay('throw'); break; }
      case 'tetera': { const m = this.take('tea', makeTeapot); m.position.copy(k.pos); this.projs.push({ type: 'tea', mesh: m, owner: k, t: 0, life: 7, idx: k.idx, lat: 0, speed: Math.max(20, k.fs) + 18 }); if (P) RC.msg('¡Tetera tornado!', k, '#9fe8ff'); if (near) Audio.sfxPlay('throw'); break; }
      case 'portal': this.portal(k); break;
      case 'chicle': k.gumT = 4.5; if (P) RC.msg('¡Globo de chicle!', k, '#ff8fd8'); if (near) Audio.sfxPlay('grow'); break;
      case 'antigrav': { let n = 0; for (const o of RC.karts) { if (o === k || o.remote || o.finished || this.immune(o)) continue; if (o.pos.distanceTo(k.pos) > 55) continue; if (o.shieldT > 0) { o.shieldT = 0; continue; } o.floatT = 2.2; n++; if (o.isPlayer) RC.msg('¡Sin gravedad!', o, '#c8a8ff'); }
        if (P) RC.msg(n ? `¡${n} flotando!` : '¡Burbuja antigravedad!', k, '#c8a8ff'); if (near) Audio.sfxPlay('shield'); break; }
      default: return false;
    }
    return true;
  }
  portal(k) {
    const T = this.T, RC = this.race, n = Math.round(70 / T.STEP);
    const showAt = (p, yaw) => { const g = this.portals[this.pI = (this.pI + 1) % 2]; g.position.copy(p); g.rotation.y = yaw; g.visible = true; g.userData.t = 1.2; };
    showAt(k.pos.clone().add(new V3(Math.sin(k.yaw) * 3, 0, Math.cos(k.yaw) * 3)), k.yaw);
    let ni = k.idx + n; if (T.open) ni = Math.min(T.N - 12, ni); else ni %= T.N;
    const di = T.open ? ni - k.idx : n; const s = T.S[ni];
    k.pos.set(s.p.x, s.p.y, s.p.z); k.y = s.p.y; k.idx = k.prevIdx = ni; k.dist += di * T.STEP; if (k.best != null) k.best = Math.max(k.best, k.dist);
    k.yaw = Math.atan2(s.fl.x, s.fl.z); const sp = Math.max(25, k.fs); k.vx = Math.sin(k.yaw) * sp; k.vz = Math.cos(k.yaw) * sp; k.invT = Math.max(k.invT, 0.8); k.driftDir = 0;
    showAt(k.pos.clone(), k.yaw);
    for (let i = 0; i < 18; i++) RC.emit(k.pos.clone().add(new V3(0, 2, 0)), ['#c8a8ff', '#ffffff', '#ffd84a'][i % 3], 0.9, 0.6, new V3((R() - 0.5) * 10, R() * 8, (R() - 0.5) * 10));
    if (k.isPlayer) { RC.msg('¡Puerta espejo! +70 m', k, '#c8a8ff'); Audio.sfxPlay('pop'); }
  }
  take(kind, make) { const p = this.pool[kind].pop() || make(); p.visible = true; if (!p.parent) this.race.scene.add(p); return p; }
  give(kind, m) { m.visible = false; this.pool[kind].push(m); }
  ringFor() { const m = new THREE.Mesh(ringGeo(), mat('warnRing', () => new THREE.MeshBasicMaterial({ color: '#ff3f7a', transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }))); m.rotation.x = -Math.PI / 2; this.race.scene.add(m); return m; }
  // ¿lo usaría un bot ahora?
  aiWants(k, it, dA, dB) {
    switch (it) {
      case 'tiburon': return k.place > 2 || R() < 0.01;
      case 'estrella': return dA < 35 || dB < 15 || R() < 0.01;
      case 'aladelta': case 'portal': case 'chicle': return R() < 0.03 || k.place > 3;
      case 'reloj': case 'piano': return k.place > 1;
      case 'peces': case 'tetera': return dA < 70 && k.place > 1;
      case 'antigrav': return (dA < 30 || dB < 25);
    }
    return false;
  }
  // ---------- por fotograma ----------
  update(dt) {
    const RC = this.race, t = RC.time, T = this.T;
    // efectos pegados a cada kart
    for (const k of RC.karts) {
      const u = k.mesh.userData;
      if (k.sharkT > 0 || u.fx_shark) { const m = this.attach(k, 'shark', makeShark); m.visible = k.sharkT > 0; if (m.visible) { m.userData.tail.rotation.y = Math.sin(t * 9) * 0.45; m.rotation.z = Math.sin(t * 4) * 0.06; m.userData.city.rotation.y = Math.sin(t * 0.8) * 0.05; if (R() < 0.5) RC.emit(k.pos.clone().add(new V3((R() - 0.5) * 4, 1 + R() * 3, (R() - 0.5) * 4)), '#bff4ff', 0.6, 0.6, new V3(0, 3, 0)); } }
      if (k.starT > 0 || u.fx_star) { const m = this.attach(k, 'star', makeStarAura); m.visible = k.starT > 0; if (m.visible) { m.userData.stars.forEach((s, i) => { const a = t * 3 + i * 1.2566; s.position.set(Math.cos(a) * 2.6, 1.4 + Math.sin(t * 5 + i) * 0.6, Math.sin(a) * 2.6); s.rotation.set(0, -a, t * 4); }); m.userData.shell.material.color.setHSL((t * 0.8) % 1, 1, 0.6); m.userData.shell.material.opacity = 0.18 + Math.sin(t * 12) * 0.06; if (R() < 0.8) RC.emit(k.pos.clone().add(new V3((R() - 0.5) * 2, 0.8 + R() * 2, (R() - 0.5) * 2)), ['#ffe066', '#ff8fd8', '#7ff5ff', '#9dff7a'][Math.floor(R() * 4)], 0.7, 0.5); } }
      if (k.flyT > 0 || u.fx_glider) { const m = this.attach(k, 'glider', makeGlider); m.visible = (k.flyH || 0) > 0.6; if (m.visible) { m.rotation.z = Math.sin(t * 2) * 0.12; if (R() < 0.6) RC.emit(k.pos.clone().add(new V3(0, (k.flyH || 0) + 0.5, 0)), '#ffffff', 0.5, 0.5, new V3(-k.vx * 0.3, -1, -k.vz * 0.3)); } }
      if (k.slowT > 0 || u.fx_clock) { const m = this.attach(k, 'clock', makeClock); m.visible = k.slowT > 0; if (m.visible) { m.position.set(0, 4.6 + Math.sin(t * 2) * 0.2, 0); m.rotation.set(0, -k.yaw + RC.camera.rotation.y * 0 + Math.PI, Math.sin(t * 1.5) * 0.2); m.lookAt(RC.camera.position); m.userData.hands.rotation.z = -t * 5; } }
      if (k.gumT > 0 || u.fx_gum) { const m = this.attach(k, 'gum', () => makeBubble('#ff8fd8')); m.visible = k.gumT > 0; if (m.visible) { const s = 1 + Math.sin(t * 8) * 0.06 + (k.air ? 0 : -0.15); m.scale.set(s * 1.05, s * 0.95, s); } }
      if (k.floatT > 0 || u.fx_float) { const m = this.attach(k, 'float', () => makeBubble('#c8a8ff', true)); m.visible = k.floatT > 0; if (m.visible) { m.rotation.y = t * 1.5; m.children[2] && (m.children[2].rotation.z = t * 2); } }
    }
    for (const p of this.portals) if (p.visible) { p.userData.t -= dt; p.userData.disc.rotation.z = -t * 6; const s = p.userData.t > 0.9 ? (1.2 - p.userData.t) / 0.3 : Math.min(1, p.userData.t / 0.4); p.scale.setScalar(Math.max(0.01, s)); if (p.userData.t <= 0) p.visible = false; }
    // proyectiles
    for (const p of this.projs) {
      p.t += dt;
      if (p.type === 'piano') {
        const tg = p.target, fall = 1.4, u = Math.min(1, p.t / fall);
        p.mesh.position.set(lerp(p.mesh.position.x, tg.pos.x, 1 - Math.exp(-dt * 9)), tg.y + 40 * (1 - u * u), lerp(p.mesh.position.z, tg.pos.z, 1 - Math.exp(-dt * 9)));
        p.mesh.rotation.set(Math.sin(p.t * 3) * 0.3, p.t * 2, Math.cos(p.t * 2) * 0.2);
        p.ring.position.set(tg.pos.x, tg.y + 0.2, tg.pos.z); const rs = 3.5 - u * 1.5; p.ring.scale.setScalar(rs); p.ring.material.opacity = 0.4 + Math.abs(Math.sin(p.t * 14)) * 0.5;
        if (u >= 1 && !p.hit) { p.hit = true; p.mesh.position.y = tg.y; if (!this.immune(tg)) RC.squash(tg, p.owner); RC.shakeT = 0.4; for (let i = 0; i < 20; i++) RC.emit(tg.pos.clone().add(new V3(0, 1, 0)), ['#2a1838', '#ffffff', '#ffd84a'][i % 3], 1.0, 0.7, new V3((R() - 0.5) * 16, R() * 8, (R() - 0.5) * 16)); if (tg.isPlayer || p.owner.isPlayer || tg.pos.distanceTo(RC.player.pos) < 60) Audio.sfxPlay('squash'); }
        if (p.t > fall + 0.7) { p.dead = true; this.give('piano', p.mesh); RC.scene.remove(p.ring); }
      } else if (p.type === 'fish') {
        p.life -= dt; const tg = p.target && !p.target.finished ? p.target : null;
        let want;
        if (tg) want = new V3().subVectors(tg.pos, p.mesh.position).setY(0).normalize();
        else { p.idx = T.nearest(p.mesh.position.x, p.mesh.position.z, p.idx, 20, 30); const s = T.S[T.open ? Math.min(T.N - 1, p.idx + 6) : (p.idx + 6) % T.N]; want = new V3(s.p.x - p.mesh.position.x, 0, s.p.z - p.mesh.position.z).normalize(); }
        p.dir.lerp(want, 1 - Math.exp(-dt * (p.t < 0.4 ? 2 : 7))).normalize();
        p.mesh.position.addScaledVector(p.dir, 72 * dt); const gy = tg ? tg.y : p.mesh.position.y - 2; p.mesh.position.y = lerp(p.mesh.position.y, gy + 1.6 + Math.sin(p.t * 8 + p.ph) * 0.5, 1 - Math.exp(-dt * 4));
        p.mesh.rotation.y = Math.atan2(p.dir.x, p.dir.z); p.mesh.userData.wings.forEach(([w, s]) => w.rotation.z = s * Math.sin(t * 30) * 0.6); p.mesh.userData.tl.rotation.y = Math.sin(t * 20) * 0.5;
        if (R() < 0.5) RC.emit(p.mesh.position.clone(), '#bff4ff', 0.4, 0.4);
        if (tg && tg.pos.distanceTo(p.mesh.position) < 2.4 + tg.megaS) { if (!this.immune(tg)) RC.hitKart(tg, 'peces', p.owner); p.life = 0; for (let i = 0; i < 10; i++) RC.emit(p.mesh.position.clone(), ['#7ff5ff', '#ffffff'][i % 2], 0.7, 0.5); }
        if (p.life <= 0) { p.dead = true; this.give('fish', p.mesh); }
      } else if (p.type === 'tea') {
        p.life -= dt; const steps = p.speed * dt / T.STEP; p.f = (p.f || 0) + steps; const adv = Math.floor(p.f); p.f -= adv;
        p.idx = T.open ? Math.min(T.N - 1, p.idx + adv) : (p.idx + adv) % T.N; const s = T.S[p.idx];
        p.lat = Math.sin(p.t * 1.3) * s.w * 0.6; p.mesh.position.set(s.p.x + s.right.x * p.lat, s.p.y, s.p.z + s.right.z * p.lat);
        const u = p.mesh.userData; u.tw.rotation.y = -t * 9; u.tw2.rotation.y = t * 13; u.pot.rotation.y = t * 4; u.pot.position.y = 3.6 + Math.sin(t * 6) * 0.3;
        if (R() < 0.7) RC.emit(p.mesh.position.clone().add(new V3((R() - 0.5) * 3, R() * 4, (R() - 0.5) * 3)), ['#d8a46a', '#fff4d6'][Math.floor(R() * 2)], 0.6, 0.4, new V3((R() - 0.5) * 6, 3, (R() - 0.5) * 6));
        for (const k of RC.karts) { if (k === p.owner && p.t < 1) continue; if (k.remote || k.finished) continue; const dx = k.pos.x - p.mesh.position.x, dz = k.pos.z - p.mesh.position.z; if (dx * dx + dz * dz < 16 && Math.abs(k.y - s.p.y) < 4 && !this.immune(k)) RC.hitKart(k, 'tetera', p.owner); }
        if (p.life <= 0) { p.dead = true; this.give('tea', p.mesh); }
      }
    }
    this.projs = this.projs.filter(p => !p.dead);
  }
  // offset de vuelo (solo visual: la física sigue en el suelo)
  place(k) { if (k.flyH > 0.01) { k.mesh.position.y += k.flyH; k.mesh.rotation.z = Math.sin(this.race.time * 2) * 0.1; const u = k.mesh.userData; u.shadow.position.y -= k.flyH / k.megaS; } }
}
