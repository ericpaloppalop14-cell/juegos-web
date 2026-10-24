// ======================================================================
//  MOCHI RACERS v23 · 8 objetos hiperlocos nuevos en las cajas sorpresa
//  Mentiruco (idea de Eric), Chistera de Conejos, Bola de Discoteca, Pato de Goma Gigante,
//  Palomitas Saltarinas, Cañón de Circo, Gallina de Huevos Sorpresa y Pulpo Malabarista.
//  Se enganchan a PowerFX sin tocar la física base. A los rivales nunca les pasa nada triste:
//  bailan, saltan como palomitas o llevan un pollito en la cabeza un ratito.
// ======================================================================
import * as THREE from 'three';
import { PowerFX, POWER, POWER_W, SELF_POWERS } from './powerups.js';
import { toon, mesh, outline, glowTex } from './gfx.js';
import { Audio } from './audio.js';
const V3 = THREE.Vector3, R = Math.random, lerp = (a, b, t) => a + (b - a) * t;

export const LOCO = {
  mentiruco: { name: 'El Mentiruco',          icon: '🫳', hint: '¡Una mano gigante con hilos te maneja como a una marioneta y te da 5 s de turbo!' },
  chistera:  { name: 'Chistera de Conejos',   icon: '🎩', hint: 'Salen 3 conejos saltarines que persiguen a los de delante y los ponen a bailar' },
  discoteca: { name: 'Bola de Discoteca',     icon: '🪩', hint: 'Baja una bola de discoteca sobre los que van delante: ¡todos a bailar!' },
  pato:      { name: 'Pato de Goma Gigante',  icon: '🦆', hint: 'Montas en un pato de goma gigante: ¡cuac! Apartas a todos a tu paso' },
  palomitas: { name: 'Palomitas Saltarinas',  icon: '🍿', hint: 'Dejas granos de maíz detrás: ¡POP! El que los pisa sale botando' },
  canon:     { name: 'Cañón de Circo',        icon: '💥', hint: '¡Te disparan desde un cañón de circo y vuelas por encima de todos!' },
  gallina:   { name: 'Gallina Sorpresa',      icon: '🐔', hint: 'Una gallina gigante vuela sobre los de delante y les deja un huevo sorpresa con pollito' },
  pulpo:     { name: 'Pulpo Malabarista',     icon: '🐙', hint: 'Un pulpo se sube a tu kart y hace malabares: ¡tres turbos seguidos!' },
};
Object.assign(POWER, LOCO);
Object.assign(POWER_W, { mentiruco: [0.4, 1.3, 1.7], chistera: [0.3, 1.3, 1.3], discoteca: [0, 0.9, 1.5], pato: [0.9, 1.2, 1.2], palomitas: [2.0, 1.4, 0.5], canon: [0.1, 1.0, 1.6], gallina: [0.2, 1.2, 1.4], pulpo: [0.7, 1.3, 1.4] });
SELF_POWERS.push('mentiruco', 'pato', 'canon', 'pulpo');

// ---------- sonidos (sintetizados) ----------
const SFX = {
  puppet: A => { const t = A.ctx.currentTime; [0, 4, 7, 12, 7, 4, 12, 16].forEach((s, i) => A.tone(A.midi(72 + s), t + i * 0.07, 0.09, 'triangle', 0.12)); A.tone(220, t, 0.5, 'sine', 0.08, null, 660); },
  hat: A => { const t = A.ctx.currentTime; A.tone(500, t, 0.25, 'sine', 0.12, null, 1500); [0, 1, 2].forEach(i => A.tone(900 + i * 300, t + 0.15 + i * 0.09, 0.08, 'square', 0.06)); },
  disco: A => { const t = A.ctx.currentTime; for (let i = 0; i < 8; i++) { A.hit(t + i * 0.12, 0.05, 0.12, i % 2 ? 6000 : 300); A.tone(A.midi(60 + [0, 7, 12, 7][i % 4]), t + i * 0.12, 0.1, 'sawtooth', 0.05); } },
  cuac: A => { const t = A.ctx.currentTime; A.tone(700, t, 0.12, 'square', 0.12, null, 420); A.tone(650, t + 0.15, 0.14, 'square', 0.12, null, 380); },
  popcorn: A => { const t = A.ctx.currentTime; for (let i = 0; i < 6; i++) A.hit(t + R() * 0.3, 0.04, 0.18, 2500); A.tone(900, t, 0.08, 'sine', 0.12, null, 300); },
  cannon: A => { const t = A.ctx.currentTime; A.hit(t, 0.5, 0.35, 700); A.tone(80, t, 0.4, 'sine', 0.35, null, 30); A.tone(1800, t + 0.1, 1.0, 'sine', 0.05, null, 500); },
  cluck: A => { const t = A.ctx.currentTime; [0, 0.12, 0.22, 0.45].forEach((d, i) => A.tone(i === 3 ? 900 : 600, t + d, i === 3 ? 0.25 : 0.07, 'square', 0.09, null, i === 3 ? 500 : 750)); },
  juggle: A => { const t = A.ctx.currentTime; [0, 5, 9].forEach((s, i) => A.tone(A.midi(76 + s), t + i * 0.06, 0.12, 'triangle', 0.12)); },
};
const sfxOrig = Audio.sfxPlay;
Audio.sfxPlay = function (name, k) { if (SFX[name]) { if (this.ctx && this.on) try { SFX[name](this); } catch (e) {} return; } return sfxOrig.call(this, name, k); };

// ---------- mallas (compartidas) ----------
const G = {}; const geo = (k, f) => G[k] || (G[k] = Object.assign(f(), { _shared: true }));
const sph = () => geo('s', () => new THREE.SphereGeometry(1, 16, 12)), cyl = () => geo('c', () => new THREE.CylinderGeometry(1, 1, 1, 12)), cone = () => geo('k', () => new THREE.ConeGeometry(1, 1, 14)), box = () => geo('b', () => new THREE.BoxGeometry(1, 1, 1));
const cap = () => geo('cap', () => new THREE.CapsuleGeometry(0.5, 1, 4, 10));
const eyes = (p, y, z, s = 1) => { for (const sd of [-1, 1]) { mesh(sph(), toon('#ffffff', { rim: 0 }), p, [sd * 0.3 * s, y, z], null, 0.17 * s); mesh(sph(), toon('#1a1030', { rim: 0 }), p, [sd * 0.3 * s, y, z + 0.12 * s], null, 0.09 * s); } };
const glow = (c, s, op = 0.8) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: op })); sp.scale.setScalar(s); return sp; };
function makeHand() { // v24: guante blanco de marionetista + cruceta de madera + 4 hilos al kart (sin mover el kart)
  const g = new THREE.Group(), u = g.userData, glove = toon('#ffffff', { rim: 0.35 }), seam = toon('#c9c3e6', { rim: 0 }), OL = '#4a3a7a';
  const rig = new THREE.Group(); rig.position.set(0, 7.2, -0.6); g.add(rig); u.rig = rig;
  const hand = new THREE.Group(); hand.position.set(0, 1.25, 0.2); hand.rotation.y = Math.PI; rig.add(hand); u.hand = hand; // dedos hacia la cámara: se lee como un guante
  const palm = mesh(sph(), glove, hand, [0, 0, 0], null, [1.5, 0.75, 1.7]); outline(palm, OL, 1.07);
  for (let i = 0; i < 3; i++) mesh(box(), seam, hand, [(i - 1) * 0.5, 0.7, -0.1], null, [0.09, 0.05, 1.3]); // costuras del dorso
  u.f = []; for (let i = 0; i < 4; i++) { const f = new THREE.Group(); f.position.set((i - 1.5) * 0.72, -0.1, 1.35); hand.add(f);
    const L = i === 1 || i === 2 ? 1.0 : 0.85; const a = mesh(cap(), glove, f, [0, -0.1, 0.45], [Math.PI / 2 - 0.25, 0, 0], [0.62, L, 0.62]); outline(a, OL, 1.08);
    const tip = new THREE.Group(); tip.position.set(0, -0.35, 1.05); f.add(tip); const b2 = mesh(cap(), glove, tip, [0, -0.45, 0.05], [0.15, 0, 0], [0.58, 0.7, 0.58]); outline(b2, OL, 1.08); f.userData.tip = tip; u.f.push(f); }
  const th = new THREE.Group(); th.position.set(1.35, -0.25, 0.5); hand.add(th); const tb = mesh(cap(), glove, th, [0.35, -0.3, 0.35], [0.5, 0, -0.9], [0.66, 0.9, 0.66]); outline(tb, OL, 1.08);
  const cuff = mesh(cyl(), toon('#ffffff', { rim: 0.2 }), hand, [0, 0.3, -1.6], [-1.15, 0, 0], [1.0, 0.8, 0.85]); outline(cuff, OL, 1.06);
  mesh(cyl(), toon('#ff6fb0', { rim: 0.4 }), hand, [0, 0.5, -1.95], [-1.15, 0, 0], [1.05, 0.14, 0.9]); // ribete rosa del puño
  const bar = new THREE.Group(); rig.add(bar); u.bar = bar; const wood = toon('#c98d55', { rim: 0.35 }), dark = '#6a3f1f';
  const p1 = mesh(box(), wood, bar, [0, 0, 0], null, [5.2, 0.38, 0.42]); outline(p1, dark, 1.06); const p2 = mesh(box(), wood, bar, [0, 0.05, 0.2], null, [0.42, 0.38, 4.6]); outline(p2, dark, 1.06);
  u.ends = [[-2.55, 0], [2.55, 0], [0, 2.45], [0, -2.05]]; for (const [x, z] of u.ends) { const kn = mesh(sph(), toon('#ff8fc0', { rim: 0.5 }), bar, [x, 0, z], null, 0.32); outline(kn, '#a03a6a', 1.08); }
  u.str = []; const sm = new THREE.MeshBasicMaterial({ color: '#fff4c2' }); u.att = [[-1.0, 1.5, -0.2], [1.0, 1.5, -0.2], [0, 1.6, 1.1], [0, 1.7, -1.1]];
  for (let i = 0; i < 4; i++) { const s = mesh(cyl(), sm, g, [0, 0, 0], null, [0.06, 1, 0.06]); u.str.push(s); const gl = glow('#fff2a0', 0.5, 0.6); g.add(gl); s.userData.gl = gl; }
  const halo = glow('#ffe58a', 5, 0.22); halo.position.set(0, 1.4, 0); rig.add(halo);
  return g;
}
function makeNose() { const g = new THREE.Group(); const n = mesh(cone(), toon('#e0a070', { rim: 0.5 }), g, [0, 0, 0.5], [Math.PI / 2, 0, 0], [0.22, 1, 0.22]); g.userData.n = n; mesh(sph(), toon('#7fd67a'), g, [0, 0.25, 0.9], null, [0.25, 0.1, 0.4]); return g; }
function makeBunny() { const g = new THREE.Group(), w = toon('#ffffff', { rim: 0.6 }); const b = mesh(sph(), w, g, [0, 0.9, 0], null, [0.9, 0.85, 1.1]); outline(b, '#b080a0', 1.05); mesh(sph(), w, g, [0, 1.8, 0.6], null, 0.65); eyes(g, 1.95, 1.15, 0.9); mesh(sph(), toon('#ff8fc0', { rim: 0 }), g, [0, 1.75, 1.25], null, 0.12);
  g.userData.ears = [-1, 1].map(sd => mesh(cap(), w, g, [sd * 0.28, 2.75, 0.45], [0, 0, sd * 0.2], [0.35, 1.1, 0.25])); mesh(sph(), w, g, [0, 0.9, -1.1], null, 0.35); return g; }
function makeHat() { const g = new THREE.Group(), k = toon('#2a1838', { rim: 0.6 }); mesh(cyl(), k, g, [0, 0.15, 0], null, [2.4, 0.3, 2.4]); mesh(cyl(), k, g, [0, 1.6, 0], null, [1.5, 2.8, 1.5]); mesh(cyl(), toon('#ff4f7a'), g, [0, 0.7, 0], null, [1.55, 0.5, 1.55]); for (let i = 0; i < 6; i++) { const s = glow(['#ffe066', '#ffffff', '#ff8fd8'][i % 3], 1.2); s.position.set(Math.cos(i) * 2, 2 + i * 0.4, Math.sin(i) * 2); g.add(s); } return g; }
function makeDisco() { const g = new THREE.Group(), u = g.userData; u.ball = mesh(geo('ico', () => new THREE.IcosahedronGeometry(1, 1)), toon('#c8c0ff', { flat: true, rim: 0.8, emissive: '#7f6fff', ei: 0.2 }), g, [0, 7, 0], null, 1.6); mesh(cyl(), toon('#c0c0d0'), g, [0, 9, 0], null, [0.05, 3, 0.05]);
  u.beams = ['#ff5fd2', '#5ff5ff', '#ffe066', '#9dff7a'].map((c, i) => { const b = mesh(cone(), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.13, depthWrite: false, blending: THREE.AdditiveBlending }), g, [0, 3.5, 0], null, [1.1, 7, 1.1]); return b; });
  u.notes = [0, 1, 2].map(i => { const s = glow(['#ff8fd8', '#7ff5ff', '#ffe066'][i], 1.1); g.add(s); return s; }); return g; }
function makeDuck() { const g = new THREE.Group(), u = g.userData, y = toon('#ffd83a', { rim: 0.7 }); const b = mesh(sph(), y, g, [0, 0.4, 0], null, [2.6, 1.5, 3.3]); outline(b, '#b08020', 1.03); const hd = mesh(sph(), y, g, [0, 2.6, 2.4], null, 1.35); outline(hd, '#b08020', 1.04);
  u.beak = mesh(sph(), toon('#ff8a2a'), g, [0, 2.4, 3.65], null, [0.75, 0.3, 0.6]); eyes(g, 3, 3.45, 1.4); mesh(sph(), y, g, [0, 1.4, -3.2], [0.6, 0, 0], [1.2, 0.5, 0.9]); u.wings = [-1, 1].map(sd => mesh(sph(), y, g, [sd * 2.5, 0.9, 0], null, [0.4, 0.9, 1.6]));
  u.bub = []; for (let i = 0; i < 6; i++) { const s = mesh(sph(), toon('#e8f8ff', { opacity: 0.5, rim: 1 }), g, [0, 0, 0], null, 0.35); u.bub.push(s); } return g; }
function makeKernel() { const g = new THREE.Group(), u = g.userData; u.k = mesh(sph(), toon('#ffcf3a', { rim: 0.5 }), g, [0, 0.45, 0], null, [0.55, 0.45, 0.45]); u.pop = new THREE.Group(); g.add(u.pop); for (let i = 0; i < 7; i++) mesh(sph(), toon(i % 3 ? '#fffaf0' : '#ffe8a0', { rim: 0.5 }), u.pop, [Math.cos(i * 0.9) * 0.9, 1 + (i % 3) * 0.5, Math.sin(i * 0.9) * 0.9], null, 0.9 + (i % 2) * 0.3); u.pop.visible = false; u.ring = glow('#ffe066', 2.2, 0.6); u.ring.position.y = 0.6; g.add(u.ring); return g; }
function makeCannon() { const g = new THREE.Group(), u = g.userData; const barrel = new THREE.Group(); barrel.position.y = 2; barrel.rotation.x = -0.6; g.add(barrel); u.barrel = barrel; const c = mesh(cyl(), toon('#ff4f7a', { rim: 0.6 }), barrel, [0, 0, 1.5], [Math.PI / 2, 0, 0], [1.5, 5, 1.5]); outline(c, '#7a2040', 1.04); for (let i = 0; i < 3; i++) mesh(geo('tr', () => new THREE.TorusGeometry(1, 0.15, 8, 20)), toon('#ffd24a'), barrel, [0, 0, i * 1.6], null, 1.55);
  for (const sd of [-1, 1]) { const w = mesh(cyl(), toon('#7fd8ff'), g, [sd * 1.8, 1.3, 0], [0, 0, Math.PI / 2], [1.3, 0.4, 1.3]); } u.smoke = []; for (let i = 0; i < 8; i++) { const s = mesh(sph(), toon('#ffffff', { opacity: 0.8, rim: 0.5 }), g, [0, 0, 0], null, 1); u.smoke.push(s); } return g; }
function makeHen() { const g = new THREE.Group(), u = g.userData, w = toon('#ffffff', { rim: 0.6 }); const b = mesh(sph(), w, g, [0, 0, 0], null, [2.2, 2, 2.6]); outline(b, '#c09080', 1.04); mesh(sph(), w, g, [0, 2, 1.8], null, 1.2); eyes(g, 2.3, 2.85, 1.2); mesh(cone(), toon('#ffb020'), g, [0, 1.9, 3.2], [Math.PI / 2, 0, 0], [0.35, 0.8, 0.35]); for (let i = 0; i < 3; i++) mesh(sph(), toon('#ff3f4f'), g, [0, 3.1 + (i === 1 ? 0.2 : 0), 1.4 + i * 0.4], null, 0.35);
  u.wings = [-1, 1].map(sd => { const p = new THREE.Group(); p.position.set(sd * 2, 0.5, 0); g.add(p); mesh(sph(), w, p, [sd * 1.4, 0, 0], null, [1.8, 0.3, 1.3]); return p; }); mesh(sph(), w, g, [0, 1, -2.6], [0.6, 0, 0], [1.2, 1.4, 0.6]); return g; }
function makeEars() { const g = new THREE.Group(), w = toon('#ffffff', { rim: 0.6 }); for (const sd of [-1, 1]) { const e = new THREE.Group(); e.position.x = sd * 0.5; g.add(e); mesh(cap(), w, e, [0, 1, 0], null, [0.45, 1.5, 0.3]); mesh(cap(), toon('#ffb3d0', { rim: 0 }), e, [0, 1, 0.1], null, [0.25, 1.1, 0.2]); } return g; }
function makeEgg() { const g = new THREE.Group(); mesh(sph(), toon('#fff4e0', { rim: 0.6 }), g, [0, 0, 0], null, [0.8, 1.05, 0.8]); for (let i = 0; i < 4; i++) mesh(sph(), toon(['#ff8fc0', '#7fd8ff', '#9dff7a', '#ffe066'][i]), g, [Math.cos(i * 1.57) * 0.75, (i % 2 - 0.5) * 0.5, Math.sin(i * 1.57) * 0.75], null, 0.18); return g; }
function makeChick() { const g = new THREE.Group(); const y = toon('#ffe24a', { rim: 0.6 }); mesh(sph(), y, g, [0, 0.5, 0], null, 0.6); mesh(sph(), y, g, [0, 1.2, 0.1], null, 0.42); eyes(g, 1.3, 0.45, 0.6); mesh(cone(), toon('#ff8a2a'), g, [0, 1.18, 0.55], [Math.PI / 2, 0, 0], [0.12, 0.3, 0.12]); const sh = mesh(geo('half', () => new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)), toon('#fff4e0'), g, [0, 0.45, 0], null, [0.8, 0.6, 0.8]); return g; }
function makeOcto() { const g = new THREE.Group(), u = g.userData, c = toon('#c86fff', { rim: 0.7 }); const hd = mesh(sph(), c, g, [0, 1.6, 0], null, [1.3, 1.5, 1.3]); outline(hd, '#6a2a8a', 1.04); eyes(g, 1.6, 1.15, 1.2); mesh(cyl(), toon('#2a1838'), g, [0, 3.3, 0], null, [0.7, 0.9, 0.7]); mesh(cyl(), toon('#2a1838'), g, [0, 2.9, 0], null, [1.1, 0.1, 1.1]);
  u.arms = []; for (let i = 0; i < 8; i++) { const p = new THREE.Group(); const a = i / 8 * 6.283; p.position.set(Math.cos(a) * 0.9, 0.6, Math.sin(a) * 0.9); p.rotation.y = -a; g.add(p); mesh(cap(), c, p, [0.7, 0, 0], [0, 0, Math.PI / 2], [0.35, 1.2, 0.35]); u.arms.push(p); }
  u.balls = ['#ff5f8f', '#ffe066', '#5ff5ff'].map(col => mesh(sph(), toon(col, { emissive: col, ei: 0.3 }), g, [0, 0, 0], null, 0.4)); return g; }

// ---------- lógica ----------
const P0 = PowerFX.prototype, o = { use: P0.use, input: P0.input, immune: P0.immune, collide: P0.collide, update: P0.update, place: P0.place, prewarm: P0.prewarm, aiWants: P0.aiWants };
P0.immune = function (k) { return o.immune.call(this, k) || k.puppetT > 0 || k.duckT > 0 || k.cannonT > 0; };
P0.use = function (k, it) {
  if (!LOCO[it]) return o.use.call(this, k, it);
  const RC = this.race, P = k.isPlayer, near = P || k.pos.distanceTo(RC.player.pos) < 70, L = this.L || (this.L = { projs: [] });
  const ahead = RC.karts.filter(x => x !== k && !x.finished && !x.out && !x.remote && x.place < k.place).sort((a, b) => b.place - a.place);
  const burst = (cols, n = 18, up = 8) => { for (let i = 0; i < n; i++) RC.emit(k.pos.clone().add(new V3(0, 1.2, 0)), cols[i % cols.length], 0.9, 0.7, new V3((R() - 0.5) * 10, 3 + R() * up, (R() - 0.5) * 10)); };
  switch (it) {
    case 'mentiruco': k.puppetT = 5; k.puppetAge = 0; k.spinT = 0; k.squashT = 0; if (P) { RC.msg('🫳 ¡MENTIRUCO! Turbo 5 s', k, '#ffb36b'); RC.shakeT = 0.2; } burst(['#ffe066', '#ff8fd8', '#ffffff']); if (near) Audio.sfxPlay('puppet'); break;
    case 'chistera': { const tgs = ahead.length ? ahead : RC.karts.filter(x => x !== k && !x.finished && !x.out && !x.remote).sort((a, b) => a.pos.distanceTo(k.pos) - b.pos.distanceTo(k.pos)).slice(0, 3).reverse(); const hat = this.take2('hat', makeHat); hat.position.copy(k.pos); hat.rotation.y = k.yaw; L.projs.push({ type: 'hat', mesh: hat, t: 0, life: 1.6 });
      for (let i = 0; i < 3; i++) { const b = this.take2('bunny', makeBunny); b.position.copy(k.pos).add(new V3((i - 1) * 1.6, 1, 0)); L.projs.push({ type: 'bunny', mesh: b, owner: k, target: tgs[tgs.length - 1 - i] || tgs[0] || null, t: 0, life: 6, ph: i, dir: new V3(Math.sin(k.yaw), 0, Math.cos(k.yaw)), idx: k.idx }); }
      if (P) RC.msg('¡Chistera de conejos!', k, '#ffffff'); if (near) Audio.sfxPlay('hat'); break; }
    case 'discoteca': { let n = 0; for (const x of ahead) { if (x.dist - k.dist > 170) continue; if (x.shieldT > 0) { x.shieldT = 0; continue; } if (this.immune(x)) continue; x.danceT = 2.6; x.danceKind = 'disco'; n++; if (x.isPlayer) RC.msg('¡Bola de discoteca! ¡A bailar!', x, '#ff8fd8'); }
      if (P) RC.msg(n ? `¡${n} bailando en la disco!` : '¡Bola de discoteca!', k, '#ff8fd8'); if (P || RC.player.danceT > 0) Audio.sfxPlay('disco'); break; }
    case 'pato': k.duckT = 6; k.duckAge = 0; k.spinT = 0; if (P) RC.msg('¡PATO DE GOMA GIGANTE! ¡Cuac!', k, '#ffd83a'); burst(['#ffd83a', '#e8f8ff', '#7fd8ff']); if (near) Audio.sfxPlay('cuac'); break;
    case 'palomitas': k.cornN = 5; k.cornT = 0; if (P) RC.msg('¡Palomitas saltarinas!', k, '#ffe066'); if (near) Audio.sfxPlay('throw'); break;
    case 'canon': { k.cannonT = 2.4; k.cannonAge = 0; k.spinT = 0; k.squashT = 0; const c = this.take2('cannon', makeCannon); c.position.copy(k.pos); c.position.y = k.y; c.rotation.y = k.yaw; L.projs.push({ type: 'cannon', mesh: c, t: 0, life: 2.2 });
      if (P) { RC.msg('¡CAÑÓN DE CIRCO! ¡BUUUM!', k, '#ff8fb0'); RC.shakeT = 0.45; } burst(['#ff4f7a', '#ffe066', '#ffffff', '#7fd8ff'], 26, 12); if (near) Audio.sfxPlay('cannon'); break; }
    case 'gallina': { const h = this.take2('hen', makeHen); h.position.copy(k.pos).add(new V3(0, 6, 0)); L.projs.push({ type: 'hen', mesh: h, owner: k, targets: ahead.slice(-3).reverse(), t: 0, life: 9, idx: k.idx });
      if (P) RC.msg('¡Gallina sorpresa!', k, '#ffffff'); if (near) Audio.sfxPlay('cluck'); break; }
    case 'pulpo': k.octoT = 4.6; k.octoAge = 0; k.octoN = 0; if (P) RC.msg('¡PULPO MALABARISTA!', k, '#c86fff'); if (near) Audio.sfxPlay('juggle'); break;
  }
  return true;
};
P0.input = function (k, inp, dt) {
  { const RC = this.race, T = RC.track, sv = T && T.S && T.S[k.idx]; // v24: salvaguarda general fuera de pista
    if (sv && !T.open && RC.state === 'race' && !k.finished && !(k.cannonT > 0) && !(k.flyH > 0.5) && !(k.morphT > 0)) { const lat = Math.abs((k.pos.x - sv.p.x) * sv.right.x + (k.pos.z - sv.p.z) * sv.right.z), off = lat > sv.w * 0.5 + 14 || k.y < sv.p.y - 10 || !isFinite(k.pos.x + k.pos.z + k.y);
      k.offT = off ? (k.offT || 0) + dt : 0; if (k.offT > 1.2) { k.offT = 0; k.puppetT = k.duckT = k.cannonT = k.octoT = 0; RC.respawn(k); if (k.isPlayer) RC.msg('¡De vuelta a la pista!', k, '#7ff5ff'); } } }
  inp = o.input.call(this, k, inp, dt); if (k.remote) return inp;
  let v = k.fxV || 1;
  if (k.puppetT > 0) { k.puppetT -= dt; k.puppetAge += dt; v = Math.max(v, k.puppetAge < 0.4 ? 1.3 : 1.75); k.boostT = Math.max(k.boostT, 0.25); inp = this.auto(k, inp, dt); if (k.puppetT <= 0 && k.isPlayer) this.race.msg('¡Gracias, Mentiruco!', k, '#ffb36b'); }
  if (k.duckT > 0) { k.duckT -= dt; k.duckAge += dt; v = Math.max(v, 1.4); }
  if (k.cannonT > 0) { k.cannonT -= dt; k.cannonAge += dt; v = Math.max(v, 2.5); k.boostT = Math.max(k.boostT, 0.25); inp = this.auto(k, inp, dt); if (k.cannonT <= 0) { k.invT = Math.max(k.invT, 0.8); if (k.isPlayer) { this.race.msg('¡Aterrizaje perfecto!', k, '#ffe066'); Audio.sfxPlay('land'); } } }
  if (k.octoT > 0) { k.octoT -= dt; k.octoAge += dt; v = Math.max(v, 1.15); const n = Math.floor(k.octoAge / 1.5); if (n >= k.octoN && k.octoN < 3) { k.octoN++; k.boostT = Math.max(k.boostT, 1.25); if (k.isPlayer) { Audio.sfxPlay('mini', 1 + k.octoN * 0.2); this.race.msg(`¡Turbo malabar ${k.octoN}/3!`, k, '#c86fff'); } } }
  if (k.cornN > 0) { k.cornT -= dt; if (k.cornT <= 0) { k.cornT = 0.3; k.cornN--; this.dropCorn(k); } }
  if (k.danceT > 0) { k.danceT -= dt; if (this.immune(k)) k.danceT = 0; else { v *= 0.6; inp = { ...inp, drift: false }; } }
  if (k.chickT > 0) { k.chickT -= dt; if (!this.immune(k)) v *= 0.7; }
  if (k.popT > 0) k.popT -= dt;
  k.fxV = v; return inp;
};
P0.dropCorn = function (k) { const L = this.L || (this.L = { projs: [] }), T = this.T, m = this.take2('corn', makeKernel); const fx = Math.sin(k.yaw), fz = Math.cos(k.yaw);
  const pos = k.pos.clone().add(new V3(-fx * 3.5 + (R() - 0.5) * 4, 0, -fz * 3.5 + (R() - 0.5) * 4)); const i = T.nearest(pos.x, pos.z, k.idx, 20, 5); pos.y = T.frame(pos.x, pos.z, i).y; m.position.copy(pos); m.userData.pop.visible = false; m.userData.k.visible = true; m.scale.setScalar(1);
  L.projs.push({ type: 'corn', mesh: m, owner: k, t: 0, life: 14, pos }); };
P0.take2 = function (kind, make) { const pool = (this.pool2 ||= {}); const a = pool[kind] || (pool[kind] = []); const m = a.pop() || make(); m.visible = true; m.userData.kind2 = kind; if (!m.parent) this.race.scene.add(m); return m; };
P0.give2 = function (m) { m.visible = false; this.pool2[m.userData.kind2].push(m); };
P0.collide = function (a, b) {
  const A = a.duckT > 0, B = b.duckT > 0;
  if (A || B) { if (A && !B) this.launch(b, a); else if (B && !A) this.launch(a, b); if (this.race.player === a || this.race.player === b) Audio.sfxPlay('cuac'); return true; }
  if (a.puppetT > 0 || b.puppetT > 0 || a.cannonT > 0 || b.cannonT > 0) return true;
  return o.collide.call(this, a, b);
};
P0.aiWants = function (k, it, dA, dB) {
  switch (it) {
    case 'mentiruco': case 'canon': case 'pulpo': return k.place > 1 || R() < 0.02;
    case 'pato': return dA < 20 || dB < 15 || R() < 0.02;
    case 'chistera': case 'gallina': case 'discoteca': return k.place > 1 && (dA < 140 || R() < 0.02);
    case 'palomitas': return dB < 40 || R() < 0.01;
  }
  return o.aiWants.call(this, k, it, dA, dB);
};
P0.prewarm = function (renderer, camera) {
  o.prewarm.call(this, renderer, camera);
  try { const RC = this.race, g = new THREE.Group(); for (const f of [makeHand, makeNose, makeEars, makeBunny, makeHat, makeDisco, makeDuck, makeKernel, makeCannon, makeHen, makeEgg, makeChick, makeOcto]) g.add(f());
    camera.updateMatrixWorld(); g.position.copy(camera.position).add(new V3(0, 0, -12).applyQuaternion(camera.quaternion)); g.scale.setScalar(0.2); g.traverse(x => x.frustumCulled = false); RC.scene.add(g); renderer.compile(RC.scene, camera); RC.scene.remove(g); } catch (e) {}
};
P0.update = function (dt) {
  o.update.call(this, dt);
  const RC = this.race, t = RC.time, T = this.T, L = this.L || (this.L = { projs: [] });
  for (const k of RC.karts) {
    const u = k.mesh.userData;
    // Mentiruco: mano con hilos encima del kart + nariz que crece
    if (k.puppetT > 0 || u.fx_hand) { const h = this.attach(k, 'hand', makeHand); h.visible = k.puppetT > 0;
      if (h.visible) { const q = h.userData, a = k.puppetAge, e = Math.min(1, a / 0.45, k.puppetT / 0.35), ee = e * e * (3 - 2 * e); h.scale.setScalar(1);
        const wide = RC.camera && RC.camera.aspect > 1.2; q.rig.position.y = (wide ? 3.7 : 4.9) + (1 - ee) * 9 + Math.sin(t * 3) * 0.15; q.rig.scale.setScalar(Math.max(0.01, (0.4 + ee * 0.6) * (wide ? 1.25 : 1.5)));
        q.bar.rotation.z = Math.sin(t * 3.2) * 0.1; q.bar.rotation.x = Math.cos(t * 2.7) * 0.07; q.hand.rotation.z = -q.bar.rotation.z;
        q.f.forEach((f, i) => { f.rotation.x = 0.1 + Math.sin(t * 6 + i * 1.1) * 0.12; f.userData.tip.rotation.x = 0.5 + Math.sin(t * 6 + i * 1.1) * 0.15; });
        h.updateMatrixWorld(true); const UP = new V3(0, 1, 0), inv = new THREE.Matrix4().copy(h.matrixWorld).invert();
        q.str.forEach((s, i) => { const top = new V3(q.ends[i][0], 0, q.ends[i][1]).applyMatrix4(q.bar.matrixWorld).applyMatrix4(inv), bot = new V3(...q.att[i]); const d = top.clone().sub(bot); s.position.copy(bot).addScaledVector(d, 0.5); s.scale.set(0.07, d.length(), 0.07); s.quaternion.setFromUnitVectors(UP, d.normalize()); s.visible = ee > 0.6; s.userData.gl.position.copy(bot); s.userData.gl.visible = s.visible; });
        if (k.isPlayer || R() < 0.3) RC.emit(k.pos.clone().add(new V3(-Math.sin(k.yaw) * 2.2, 0.8, -Math.cos(k.yaw) * 2.2)), ['#ffd24a', '#ff8fd8', '#7ff5ff'][Math.floor(R() * 3)], 0.35, 0.45, new V3((R() - 0.5) * 2, 1 + R(), (R() - 0.5) * 2)); } }
    if (k.duckT > 0 || u.fx_duck) { const d = this.attach(k, 'duck', makeDuck); d.visible = k.duckT > 0; if (d.visible) { const q = d.userData, e = Math.min(1, k.duckAge / 0.35, k.duckT / 0.3); d.scale.setScalar(Math.max(0.01, e) * 1.1); d.position.y = -0.3; d.rotation.z = Math.sin(t * 5) * 0.08;
        q.beak.scale.y = 0.3 + Math.abs(Math.sin(t * 6)) * 0.25; q.wings.forEach((w, i) => w.rotation.z = (i ? -1 : 1) * Math.sin(t * 10) * 0.4); q.bub.forEach((b, i) => { const uu = (t * 0.8 + i / 6) % 1; b.position.set(Math.sin(i * 2) * 2.5, uu * 4, -3 - uu * 2); b.scale.setScalar(0.25 + uu * 0.4); });
        if (R() < 0.5) RC.emit(k.pos.clone().add(new V3((R() - 0.5) * 4, 0.3, (R() - 0.5) * 4)), '#bfefff', 0.6, 0.5, new V3((R() - 0.5) * 4, 3, (R() - 0.5) * 4)); if (k.isPlayer && Math.floor(k.duckAge / 1.5) !== k.duckQ) { k.duckQ = Math.floor(k.duckAge / 1.5); Audio.sfxPlay('cuac'); } } }
    if (k.octoT > 0 || u.fx_octo) { const m = this.attach(k, 'octo', makeOcto); m.visible = k.octoT > 0; if (m.visible) { const q = m.userData, e = Math.min(1, k.octoAge / 0.3, k.octoT / 0.3); m.scale.setScalar(Math.max(0.01, e) * 0.9); m.position.set(0, 2.6, -0.8);
        q.arms.forEach((a, i) => a.rotation.z = Math.sin(t * 6 + i) * 0.5 - 0.2); q.balls.forEach((b, i) => { const ph = (t * 1.6 + i / 3) % 1; b.position.set(Math.cos(ph * Math.PI) * 1.8, 3.5 + Math.sin(ph * Math.PI) * 3, 0.5); }); } }
    if (k.danceT > 0 || u.fx_ears) { const m = this.attach(k, 'ears', makeEars); m.visible = k.danceT > 0 && k.danceKind === 'bunny'; if (m.visible) { m.position.y = 2.9; m.children.forEach((e, i) => e.rotation.z = (i ? -1 : 1) * (0.2 + Math.abs(Math.sin(t * 9)) * 0.4)); } }
    if (k.danceT > 0 || u.fx_disco) { const m = this.attach(k, 'disco', makeDisco); m.visible = k.danceT > 0 && k.danceKind === 'disco'; if (m.visible) { const q = m.userData; q.ball.rotation.y = t * 3; m.position.y = 1 + Math.min(1, (2.6 - k.danceT) / 0.4) * 0 + Math.max(0, k.danceT - 2.3) * 12; q.beams.forEach((b, i) => { b.rotation.z = Math.sin(t * 3 + i * 1.6) * 0.5; b.rotation.x = Math.cos(t * 2.6 + i) * 0.5; }); q.notes.forEach((s, i) => { const uu = (t * 0.8 + i / 3) % 1; s.position.set(Math.sin(i * 2 + t) * 1.5, 2 + uu * 4, 0); s.material.opacity = 1 - uu; }); } }
    if (k.chickT > 0 || u.fx_chick) { const m = this.attach(k, 'chick', makeChick); m.visible = k.chickT > 0; if (m.visible) { m.position.set(0, 3.1 + Math.abs(Math.sin(t * 8)) * 0.3, 0); m.rotation.y = Math.sin(t * 3) * 0.6; } }
    if (k.cannonT > 0 && R() < 0.9) for (let i = 0; i < 2; i++) this.confetti(k.pos.clone().add(new V3((R() - 0.5) * 2, 1 + this.cannonH(k), (R() - 0.5) * 2)), new V3(-k.vx * 0.2 + (R() - 0.5) * 4, 1 + R() * 3, -k.vz * 0.2 + (R() - 0.5) * 4));
  }
  for (const p of L.projs) { p.t += dt;
    if (p.type === 'hat') { const s = Math.min(1, p.t / 0.25) * Math.min(1, (p.life - p.t) / 0.3); p.mesh.scale.setScalar(Math.max(0.01, s) * 1.3); p.mesh.rotation.y += dt * 6; if (p.t > p.life) { p.dead = true; this.give2(p.mesh); } }
    else if (p.type === 'bunny') { p.life -= dt; const tg = p.target && !p.target.finished ? p.target : null; let want;
      if (tg) want = new V3().subVectors(tg.pos, p.mesh.position).setY(0).normalize(); else { p.idx = T.nearest(p.mesh.position.x, p.mesh.position.z, p.idx, 20, 30); const s = T.S[T.open ? Math.min(T.N - 1, p.idx + 6) : (p.idx + 6) % T.N]; want = new V3(s.p.x - p.mesh.position.x, 0, s.p.z - p.mesh.position.z).normalize(); }
      p.dir.lerp(want, 1 - Math.exp(-dt * (p.t < 0.3 ? 2 : 7))).normalize(); p.mesh.position.addScaledVector(p.dir, (tg ? Math.max(95, Math.hypot(tg.vx, tg.vz) + 45) : 68) * dt); const gy = tg ? tg.y : p.mesh.position.y; const hop = Math.abs(Math.sin(p.t * 9 + p.ph)) * 2.5; p.mesh.position.y = lerp(p.mesh.position.y, gy + hop, 1 - Math.exp(-dt * 10));
      p.mesh.rotation.y = Math.atan2(p.dir.x, p.dir.z); p.mesh.scale.setScalar(1.3); p.mesh.userData.ears.forEach((e, i) => e.rotation.x = Math.sin(p.t * 9 + i) * 0.4);
      if (tg && tg.pos.distanceTo(p.mesh.position) < 2.6 + tg.megaS) { if (!this.immune(tg)) { if (tg.shieldT > 0) tg.shieldT = 0; else { tg.danceT = 2.0; tg.danceKind = 'bunny'; if (tg.isPlayer) RC.msg('¡Baile del conejito!', tg, '#ffffff'); if (p.owner.isPlayer) RC.msg('¡' + tg.ch.name + ' baila con el conejito!', p.owner, '#ffd84a'); } } p.life = 0; for (let i = 0; i < 12; i++) RC.emit(p.mesh.position.clone(), ['#ffffff', '#ff8fc0'][i % 2], 0.7, 0.5, new V3((R() - 0.5) * 8, R() * 6, (R() - 0.5) * 8)); if (tg.isPlayer || p.owner.isPlayer) Audio.sfxPlay('pop'); }
      if (p.life <= 0) { p.dead = true; this.give2(p.mesh); } }
    else if (p.type === 'corn') { p.life -= dt; const q = p.mesh.userData; q.ring.material.opacity = 0.35 + Math.abs(Math.sin(t * 5)) * 0.4;
      if (p.popped) { p.pt += dt; q.pop.scale.setScalar(Math.min(1.6, p.pt * 8)); if (p.pt > 0.9) p.life = 0; }
      else { q.k.rotation.y += dt * 3; q.k.position.y = 0.45 + Math.abs(Math.sin(t * 6 + p.pos.x)) * 0.25;
        for (const k of RC.karts) { if ((k === p.owner && p.t < 1.2) || k.remote || k.finished || k.air) continue; const dx = k.pos.x - p.pos.x, dz = k.pos.z - p.pos.z; if (dx * dx + dz * dz > (2.4 * k.megaS) ** 2 || Math.abs(k.y - p.pos.y) > 3) continue;
          p.popped = true; p.pt = 0; q.k.visible = false; q.pop.visible = true; q.pop.scale.setScalar(0.1);
          if (!this.immune(k)) { if (k.shieldT > 0) k.shieldT = 0; else { k.vy = 10; k.air = true; k.hop = true; k.popT = 0.8; k.vx *= 0.75; k.vz *= 0.75; if (k.isPlayer) RC.msg('¡POP! ¡Palomita!', k, '#ffe066'); if (p.owner.isPlayer && k !== p.owner) RC.msg('¡' + k.ch.name + ' salta como una palomita!', p.owner, '#ffd84a'); } }
          for (let i = 0; i < 14; i++) RC.emit(p.pos.clone().add(new V3(0, 1, 0)), ['#fffaf0', '#ffe8a0', '#ffcf3a'][i % 3], 0.8, 0.6, new V3((R() - 0.5) * 10, 4 + R() * 6, (R() - 0.5) * 10)); if (k.isPlayer || p.owner.isPlayer || k.pos.distanceTo(RC.player.pos) < 50) Audio.sfxPlay('popcorn'); break; } }
      if (p.life <= 0) { p.dead = true; this.give2(p.mesh); } }
    else if (p.type === 'cannon') { const q = p.mesh.userData, s = Math.min(1, p.t / 0.15) * Math.min(1, (p.life - p.t) / 0.4); p.mesh.scale.setScalar(Math.max(0.01, s) * 1.4); q.barrel.rotation.x = -0.6 - Math.max(0, 0.3 - p.t) * 1.5;
      q.smoke.forEach((m, i) => { const uu = Math.min(1, p.t * 1.2 + i * 0.03); m.position.set(Math.sin(i * 2) * uu * 3, 2 + uu * 5 + i * 0.3, 4 + uu * 6); m.scale.setScalar(0.6 + uu * 2.2); m.material.opacity = 0.8 * (1 - uu); }); if (p.t > p.life) { p.dead = true; this.give2(p.mesh); } }
    else if (p.type === 'hen') { p.life -= dt; const tg = p.targets.find(x => !x.eggd && !x.finished); const m = p.mesh, q = m.userData; q.wings.forEach((w, i) => w.rotation.z = (i ? 1 : -1) * Math.sin(t * 16) * 0.7); m.scale.setScalar(1.3);
      let want; if (tg) want = new V3(tg.pos.x, tg.y + 9, tg.pos.z); else { p.idx = T.nearest(m.position.x, m.position.z, p.idx, 20, 30); const s = T.S[(p.idx + 20) % T.N]; want = new V3(s.p.x, s.p.y + 30, s.p.z); if (!p.leave) p.leave = p.life = Math.min(p.life, 1.5); }
      const d = want.clone().sub(m.position), dist = d.length(); m.position.addScaledVector(d.normalize(), Math.min(dist, 95 * dt)); m.rotation.y = Math.atan2(d.x, d.z); m.position.y += Math.sin(t * 8) * 0.05;
      if (tg && Math.hypot(tg.pos.x - m.position.x, tg.pos.z - m.position.z) < 3) { tg.eggd = true; const egg = this.take2('egg', makeEgg); egg.position.copy(m.position); egg.scale.setScalar(1.2); L.projs.push({ type: 'egg', mesh: egg, target: tg, owner: p.owner, t: 0 }); Audio.sfxPlay('cluck'); }
      if (p.life <= 0) { p.dead = true; this.give2(m); p.targets.forEach(x => x.eggd = false); } }
    else if (p.type === 'egg') { const tg = p.target, u = Math.min(1, p.t / 0.45); p.mesh.position.set(lerp(p.mesh.position.x, tg.pos.x, 0.4), tg.y + 9 * (1 - u * u) + 2, lerp(p.mesh.position.z, tg.pos.z, 0.4)); p.mesh.rotation.z = p.t * 6;
      if (u >= 1) { p.dead = true; this.give2(p.mesh); tg.eggd = false; if (!this.immune(tg)) { if (tg.shieldT > 0) tg.shieldT = 0; else { tg.chickT = 2.6; if (tg.isPlayer) RC.msg('¡Pío pío! ¡Un pollito en la cabeza!', tg, '#ffe24a'); if (p.owner.isPlayer) RC.msg('¡Huevo sorpresa para ' + tg.ch.name + '!', p.owner, '#ffd84a'); } }
        for (let i = 0; i < 14; i++) RC.emit(tg.pos.clone().add(new V3(0, 2.5, 0)), ['#fff4e0', '#ffe24a', '#ff8fc0'][i % 3], 0.7, 0.6, new V3((R() - 0.5) * 8, 3 + R() * 5, (R() - 0.5) * 8)); if (tg.isPlayer || p.owner.isPlayer) Audio.sfxPlay('pop'); } }
  }
  L.projs = L.projs.filter(p => !p.dead);
};
P0.cannonH = function (k) { if (!(k.cannonT > 0)) return 0; const u = k.cannonAge / (k.cannonAge + k.cannonT); return Math.sin(u * Math.PI) * 14; };
P0.place = function (k) {
  o.place.call(this, k); const t = this.race.time, m = k.mesh;
  if (k.duckT > 0) m.position.y += 1.6 + Math.sin(t * 5) * 0.2;
  if (k.cannonT > 0) { const h = this.cannonH(k); m.position.y += h; if (m.userData.tilt) m.userData.tilt.rotation.x -= Math.cos(k.cannonAge / (k.cannonAge + k.cannonT) * Math.PI) * 0.4; const u = m.userData; if (u.shadow) u.shadow.position.y -= h / k.megaS; }
  if (k.danceT > 0) { m.rotation.y += Math.sin(t * 8) * 0.6; m.position.y += Math.abs(Math.sin(t * 10)) * 0.5; }
  if (k.popT > 0) m.rotation.y += k.popT * 8;
  // v24 salvaguarda: el kart siempre de pie (sin inclinaciones residuales)
  m.rotation.x = 0; m.rotation.z = 0; const tl = m.userData.tilt; if (tl && !k.trick && !(k.flip && k.air)) { tl.rotation.x = Math.max(-0.45, Math.min(0.45, tl.rotation.x)); tl.rotation.z = Math.max(-0.45, Math.min(0.45, tl.rotation.z)); }
};
