// ======================================================================
//  MOCHI RACERS ONLINE · modo «¡Que viene la Ola de Nata!»
//  Pista procedural sin fin + ola que se come la pista por detrás.
//  La conducción y la física son EXACTAMENTE las de race.js (no se tocan):
//  aquí solo se decide QUÉ karts se simulan en este móvil y se añaden reglas.
// ======================================================================
import * as THREE from 'three';
import { CUPS, CHARS } from './data.js';
import { Race } from './race.js';
import { SELF_POWERS } from './powerups.js';
import { makeKart, toon, mesh } from './gfx.js';
import { Audio } from './audio.js';

const V3 = THREE.Vector3;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
export const MATCH_T = 60;          // segundos de partida
export const START_I = 45;          // índice de la línea de salida (las muestras van cada 2 m)
export const TRACK_LEN = 5600;      // metros de pista generada (nadie llega al final en 60 s)
export const wavePos = t => -80 + 26 * t + 0.22 * t * t; // posición de la ola (m) a los t s de la salida: ~2.300 m a los 60 s (va cada vez más rápida)

// PRNG con semilla (igual en todos los móviles de la partida)
export function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const daySeed = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
export const THEMES = ['gominola', 'girasol', 'helada', 'galaxia', 'tormenta'];

// ---------------- pista procedural ----------------
export function makeEndlessCup(seed) {
  const r = mulberry(seed * 9301 + 49297);
  const base = CUPS.find(c => c.id === THEMES[seed % THEMES.length]);
  const kind = (base.feats.find(f => f.type === 'obstacle') || {}).kind || 'gumdrop';
  const pts = []; let x = 0, z = 0, a = 0, turn = 0, seg = 0; const SEG = 52;
  const n = Math.ceil(TRACK_LEN / SEG);
  for (let i = 0; i < n; i++) {
    const s = i * SEG, hard = clamp(s / 3000, 0, 1);
    const w = lerp(21, 15.5, hard) + (r() - 0.5) * 2;
    const h = Math.max(0, 3 + Math.sin(i * 0.37 + r()) * 2.5 + Math.sin(i * 0.11) * 3);
    pts.push([x, z, i < 3 ? 0 : h, w]);
    if (i >= 3) { if (--seg <= 0) { seg = 2 + Math.floor(r() * 3); turn = (r() - 0.5) * lerp(0.55, 0.95, hard); if (Math.abs(a) > 0.75) turn = -Math.sign(a) * Math.abs(turn); } a = clamp(a + turn, -1.05, 1.05); }
    x += Math.cos(a) * SEG; z += Math.sin(a) * SEG;
  }
  const L = (n - 1) * SEG, T = s => s / L, feats = [];
  for (let s = 140; s < L - 200; s += 230 + r() * 60) feats.push({ t: T(s), type: 'boxes' });
  for (let s = 260; s < L - 200; s += 180 + r() * 90) feats.push({ t: T(s), type: 'boost', off: Math.round((r() - 0.5) * 8) });
  for (let s = 420; s < L - 200; s += 330 + r() * 120) feats.push({ t: T(s), type: 'ramp' });
  for (let s = 600; s < L - 200; s += lerp(320, 170, clamp(s / 3000, 0, 1)) + r() * 60) feats.push({ t: T(s), type: 'obstacle', kind });
  return { ...base, id: 'sinfin-' + base.id, name: 'Huida ' + base.track.replace(/^(Avenida|Campos de|Pista|Circuito)\s*/i, ''), pts, feats, open: true, seed: (seed % 2147483000) + 11 };
}

// ---------------- bots con aspecto humano ----------------
const NAMES = ['Lucía_09', 'pablito_rs', 'Marta G.', 'xX_Dani_Xx', 'kiwi.mx', 'nerea_23', 'Javi kart', 'Sofi🌸', 'AitorPro', 'carmen.lv', 'hugo2011', 'Iker_mochi', 'Valen 💫', 'alexgamer7', 'Noa', 'Rubén_RS', 'lolita_jelly', 'Pau', 'mario.k', 'Ainhoa', 'Teo_77', 'Claudia🍡', 'santi.exe', 'Irene', 'DavidCarreras', 'mimi_uwu', 'Gonzalo', 'ElBicho_10', 'Paula M', 'nachete'];
export function makeBots(n, r = Math.random, taken = []) {
  const pool = NAMES.filter(x => !taken.includes(x)).sort(() => r() - 0.5), out = [];
  for (let i = 0; i < n; i++) { const lvl = r() < 0.3 ? 0 : r() < 0.65 ? 1 : 2; out.push({ name: pool[i], ch: CHARS[Math.floor(r() * 8)].id, lvl, bot: true }); }
  return out;
}

// ---------------- etiqueta de nombre ----------------
function nameTag(text, color, me) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const x = cv.getContext('2d');
  x.font = '700 58px Fredoka, sans-serif'; const w = Math.min(500, x.measureText(text).width + 60);
  x.fillStyle = me ? 'rgba(255,111,176,.92)' : 'rgba(255,255,255,.88)'; x.beginPath(); x.roundRect(256 - w / 2, 18, w, 86, 43); x.fill();
  x.lineWidth = 6; x.strokeStyle = color; x.stroke();
  x.fillStyle = me ? '#ffffff' : '#7a4fb0'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 256, 63);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, sizeAttenuation: false })); s.scale.set(0.15, 0.0375, 1); s.position.y = 4.1; s.renderOrder = 20; return s;
}

// ---------------- la Ola de Nata ----------------
function makeWave(theme) {
  const g = new THREE.Group();
  const cream = toon('#fffaf4', { rim: 0.45 }), pink = toon(theme === 'space' || theme === 'storm' ? '#c9a2ff' : '#ffb3d6', { rim: 0.4 });
  const sph = new THREE.SphereGeometry(1, 16, 12);
  const blobs = [];
  for (let i = 0; i < 22; i++) { const x = (i / 21 - 0.5) * 64, h = 5 + Math.abs(Math.sin(i * 1.7)) * 5; const b = mesh(sph, i % 4 === 0 ? pink : cream, g, [x, h * 0.5, Math.sin(i * 2.3) * 2], null, [4.2, h, 5]); blobs.push([b, h, i]); }
  for (let i = 0; i < 12; i++) { const x = (i / 11 - 0.5) * 50; mesh(sph, cream, g, [x, 9 + Math.sin(i) * 2, -3], null, [5, 5, 5]); }
  // cara gigante kawaii
  const face = new THREE.Group(); face.position.set(0, 9, 4.5); g.add(face);
  const dark = toon('#3a2050', { rim: 0 });
  const eyes = [-1, 1].map(s => { const e = mesh(sph, dark, face, [s * 4.2, 1.2, 0.6], null, [1.25, 1.7, 0.6]); mesh(sph, toon('#ffffff', { rim: 0 }), e, [-0.3, 0.35, 0.8], null, [0.32, 0.25, 0.3]); return e; });
  for (const s of [-1, 1]) mesh(sph, toon('#ff8fb8', { rim: 0, opacity: 0.8 }), face, [s * 6.5, -0.6, 0.4], null, [1.5, 0.8, 0.4]);
  const mouth = mesh(new THREE.TorusGeometry(1.2, 0.32, 8, 18, Math.PI), dark, face, [0, -1, 0.9], [0, 0, Math.PI]);
  // virutas de colores
  const spr = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.18, 0.7, 2, 6), toon('#ffffff', { rim: 0 }), 70); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), cols = ['#ff6fa8', '#7ee3c4', '#ffd36b', '#9fc3ff', '#b9a2f7'];
  for (let i = 0; i < 70; i++) { q.setFromEuler(new THREE.Euler(Math.random() * 3, Math.random() * 3, Math.random() * 3)); m4.compose(new V3((Math.random() - 0.5) * 60, 2 + Math.random() * 11, 3 + Math.random() * 2.5), q, new V3(1, 1, 1)); spr.setMatrixAt(i, m4); spr.setColorAt(i, new THREE.Color(cols[i % 5])); }
  g.add(spr);
  g.userData = { blobs, eyes, mouth, face };
  return g;
}

// ======================================================================
export class EndlessRace extends Race {
  // roster: [{ name, ch (id), bot, lvl, pid }] · me: índice del jugador de este móvil
  constructor(app, { seed, roster, me, quality, simBots = true, ghost = null }) {
    const cup = makeEndlessCup(seed);
    const chars = roster.map(r => ({ ...CHARS.find(c => c.id === r.ch) || CHARS[0] }));
    super(app, { cup, reverse: false, playerChar: chars[me], rivals: chars.filter((_, i) => i !== me), grid: chars, cupIndex: 0, quality });
    this.endless = true; this.seed = seed; this.roster = roster; this.meI = me; this.simBots = simBots;
    const T = this.track;
    this.wave = { d: wavePos(0), mesh: makeWave(cup.theme) }; this.scene.add(this.wave.mesh);
    this.followCam = this.scene.children.filter(o => o === this.sky || o.isPoints || (o.isInstancedMesh && o.material && o.material.fog === false));
    // parrilla: 3 filas de 2 justo antes de la línea (nunca dando la vuelta a la pista)
    this.karts.forEach((k, gi) => {
      const r = roster[gi]; k.slot = gi; k.name = r.name; k.bot = !!r.bot; k.pid = r.pid || null;
      k.remote = gi !== me && (!r.bot || !simBots);
      const row = gi >> 1, sd = gi % 2 ? 1 : -1, back = 6 + row * 7 + (gi % 2) * 2.5;
      const i = START_I - Math.round(back / T.STEP), s = T.S[i];
      k.pos.set(s.p.x + s.right.x * sd * s.w * 0.4, s.p.y, s.p.z + s.right.z * sd * s.w * 0.4);
      k.yaw = Math.atan2(s.fl.x, s.fl.z); k.idx = k.prevIdx = i; k.dist = (i - START_I) * T.STEP; k.y = s.p.y; k.best = k.dist;
      if (k.ai && r.bot) Object.assign(k.ai, this.botProfile(r.lvl, gi));
      k.net = null; k.out = false; k.outT = 0;
      if (gi !== me) k.mesh.add(nameTag(r.name, k.ch.color, false));
    });
    this.difficulty = 1;
    this.ghostRec = []; this.ghostT = 0; this.ghost = null;
    if (ghost && ghost.seed === seed && ghost.path && ghost.path.length > 4) {
      const gm = makeKart(CHARS.find(c => c.id === ghost.ch) || CHARS[0], 0);
      gm.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.38; o.material.depthWrite = false; o.castShadow = false; } });
      gm.add(nameTag('👻 Tu récord · ' + Math.round(ghost.dist) + ' m', '#b9a2f7', false)); this.scene.add(gm);
      this.ghost = { ...ghost, mesh: gm };
    }
    this.placeCamera(true);
  }
  botProfile(lvl, gi) {
    const R = Math.random;
    const P = [
      { laneAmp: 0.45, skill: 0.72, spd: 0.865 + R() * 0.035, react: 3.2, wob: 0.22, errEvery: [5, 10] },   // novato
      { laneAmp: 0.32, skill: 0.88, spd: 0.915 + R() * 0.035, react: 5.5, wob: 0.12, errEvery: [8, 15] },   // normal
      { laneAmp: 0.2, skill: 1.0, spd: 0.965 + R() * 0.03, react: 8, wob: 0.06, errEvery: [12, 22] }][lvl] || null;
    return Object.assign({ lvl, sm: 0, errT: 4 + R() * 8, errD: 0, errS: 0, wph: R() * 10 }, P);
  }
  // objetos que solo afectan a quien los usa o a su propio movimiento (justos en P2P)
  rollItem(k) {
    if (this.forceItem && k.isPlayer) { const f = this.forceItem; this.forceItem = null; return f; }
    const f = (k.place - 1) / Math.max(1, this.karts.length - 1), R = Math.random();
    if (R < 0.38) return SELF_POWERS[Math.floor(Math.random() * SELF_POWERS.length)]; // v10: potenciadores propios
    if (R < 0.2 + f * 0.25) return 'turbo'; if (R < 0.42 + f * 0.25) return f > 0.4 ? 'seta' : 'escudo'; if (R < 0.75) return 'escudo'; return f > 0.2 ? 'iman' : 'turbo';
  }
  // IA humana: la misma IA base + reacción con retardo, temblor, despistes
  aiInput(k, dt) {
    if (k.remote || k.out) return { steer: 0, throttle: 0, brake: false, drift: false, driftEdge: false, itemEdge: false };
    const inp = super.aiInput(k, dt), a = k.ai; if (!a || a.lvl == null) return inp;
    a.wph += dt;
    a.sm = lerp(a.sm, inp.steer, 1 - Math.exp(-dt * a.react));
    let st = a.sm + Math.sin(a.wph * 2.3) * a.wob * 0.6 + Math.sin(a.wph * 5.1 + 1) * a.wob * 0.4;
    a.errT -= dt;
    if (a.errT <= 0 && a.errD <= 0) { a.errD = 0.3 + Math.random() * (a.lvl === 0 ? 0.7 : 0.4); a.errS = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.5); a.errKind = Math.random() < 0.65 ? 'giro' : 'suelta'; a.errT = a.errEvery[0] + Math.random() * (a.errEvery[1] - a.errEvery[0]); }
    if (a.errD > 0) { a.errD -= dt; if (a.errKind === 'giro') st += a.errS; else inp.throttle = 0; inp.drift = false; }
    inp.steer = clamp(st, -1, 1);
    if (inp.drift && a.lvl === 0 && Math.random() < dt * 1.5) inp.drift = false; // los novatos sueltan el derrape antes de tiempo
    if (inp.itemEdge && Math.random() < 0.5) inp.itemEdge = false; // no usan el objeto al instante
    return inp;
  }
  stepKart(k, inp, dt) {
    if (k.out) { this.fallKart(k, dt); return; }
    if (k.remote) { this.netKart(k, dt); return; }
    const d0 = this.difficulty; if (k.ai && k.ai.spd) this.difficulty = k.ai.spd;
    super.stepKart(k, inp, dt); // ← física original intacta
    this.difficulty = d0;
    if (this.raceT < MATCH_T) k.best = Math.max(k.best ?? k.dist, k.dist);
  }
  // kart de otro móvil: interpolación hacia el último estado recibido (con extrapolación)
  netKart(k, dt) {
    const n = k.net; if (!n) { this.placeKartMesh(k, dt); return; }
    n.age += dt; const ex = Math.min(n.age, 0.25);
    const tx = n.x + Math.sin(n.yaw) * n.fs * ex, tz = n.z + Math.cos(n.yaw) * n.fs * ex;
    const f = 1 - Math.exp(-dt * 12);
    if (k.pos.distanceToSquared(new V3(tx, k.pos.y, tz)) > 900) { k.pos.x = tx; k.pos.z = tz; } else { k.pos.x = lerp(k.pos.x, tx, f); k.pos.z = lerp(k.pos.z, tz, f); }
    k.y = lerp(k.y, n.y, f); k.pos.y = k.y; k.yaw += angDiff(k.yaw, n.yaw) * f; k.fs = n.fs;
    k.driftDir = n.dd; k.boostT = n.b ? 0.2 : 0; k.megaT = n.m ? 0.2 : 0; k.shieldT = n.sh ? 1 : 0; k.spinT = n.sp ? 0.5 : 0; k.air = !!n.air; k.trick = !!n.tr;
    k.megaS = lerp(k.megaS, n.m ? 2.1 : 1, 1 - Math.exp(-dt * 6));
    k.idx = this.track.nearest(k.pos.x, k.pos.z, k.idx);
    k.dist = Math.max(k.dist, n.d); k.best = Math.max(k.best ?? k.dist, k.dist);
    if (n.out && !k.out) this.eliminate(k, true);
    this.placeKartMesh(k, dt);
  }
  netApply(k, s) { k.net = { ...s, age: 0 }; if (s.fin) k.finished = true; }
  netState(k) { return { x: +k.pos.x.toFixed(2), z: +k.pos.z.toFixed(2), y: +k.y.toFixed(2), yaw: +k.yaw.toFixed(3), fs: +k.fs.toFixed(1), d: +k.best.toFixed(1), dd: k.driftDir, b: k.boostT > 0 ? 1 : 0, m: k.megaT > 0 ? 1 : 0, sh: k.shieldT > 0 ? 1 : 0, sp: k.spinT > 0 ? 1 : 0, air: k.air ? 1 : 0, tr: k.trick ? 1 : 0, out: k.out ? 1 : 0, fin: k.finished ? 1 : 0 }; }
  takeOverBots() { for (const k of this.karts) if (k.bot && k.remote) { k.remote = false; k.vx = Math.sin(k.yaw) * k.fs; k.vz = Math.cos(k.yaw) * k.fs; if (!k.ai || k.ai.lvl == null) { k.ai = { ...(k.ai || {}), ...this.botProfile(this.roster[k.slot].lvl || 1, k.slot), laneT: 0, lane: 0, itemDelay: 1, drift: false, takeSC: null, noise: 0, aggr: 0.5 }; } } this.simBots = true; }
  releaseBots() { for (const k of this.karts) if (k.bot && !k.out) k.remote = true; this.simBots = false; }
  eliminate(k, fromNet) {
    if (k.out) return; k.out = true; k.outT = 0; k.finished = true; k.finishTime = this.raceT; k.vy = 9; k.driftDir = 0;
    if (k.isPlayer) { Audio.sfxPlay('squash'); this.msg('¡Te ha pillado la Ola de Nata!', k, '#ff8fb0'); this.app.ui.finishBanner && 0; }
    for (let i = 0; i < 18; i++) this.emit(k.pos.clone().add(new V3(0, 1, 0)), ['#ffffff', '#ffb3d6', '#ffe066'][i % 3], 0.9, 0.7, new V3((Math.random() - 0.5) * 12, Math.random() * 9, (Math.random() - 0.5) * 12));
  }
  fallKart(k, dt) { // tragado por la nata: se hunde dando vueltas
    k.outT += dt; k.vy -= 20 * dt; k.y += k.vy * dt * 0.5; k.pos.y = k.y; k.yaw += dt * 6;
    const m = k.mesh; m.position.copy(k.pos); m.rotation.y = k.yaw; m.scale.setScalar(Math.max(0.01, 1 - k.outT * 0.5)); m.visible = k.outT < 2;
  }
  placeCamera(snap, dt) {
    const p = this.player;
    if (p && p.out && p.outT > 1.2 && this.state !== 'intro') { const lead = this.karts.filter(k => !k.out).sort((a, b) => b.best - a.best)[0];
      if (lead) { const st = this.state; this.state = 'race'; this.player = lead; this.spectating = lead; super.placeCamera(snap, dt); this.player = p; this.state = st; return; } }
    this.spectating = null; super.placeCamera(snap, dt);
  }
  update(dt) {
    if (this.state === 'finish') { const allOut = this.karts.every(k => k.out || k.finished); if (!allOut && this.raceT < MATCH_T) this.finishT = 0; if (this.raceT >= MATCH_T && !this._ft) { this._ft = 1; this.finishT = Math.max(this.finishT, 5.5); } }
    super.update(dt);
    const T = this.track;
    if (this.state === 'race' || this.state === 'finish') {
      this.wave.d = wavePos(this.raceT);
      for (const k of this.karts) if (!k.out && !k.remote && !(k.finished && !k.out && this.raceT >= MATCH_T) && k.best < this.wave.d && this.state === 'race') {
        if (k.shieldT > 0) { k.shieldT = 0; k.invT = 1.2; const ti = Math.min(T.N - 10, k.idx + 16); const s = T.S[ti]; k.pos.set(s.p.x, s.p.y, s.p.z); k.y = s.p.y; k.idx = k.prevIdx = ti; k.dist += 32; k.best = Math.max(k.best, k.dist); k.boostT = Math.max(k.boostT, 1.2); if (k.isPlayer) { Audio.sfxPlay('pop'); this.msg('¡La burbuja te salva de la ola!', k, '#7ff5ff'); } }
        else this.eliminate(k);
      }
      if (this.raceT >= MATCH_T && this.state === 'race') {
        for (const k of this.karts) if (!k.remote && !k.finished) { k.finished = true; k.finishTime = MATCH_T; }
        if (!this.timeUp) { this.timeUp = true; Audio.sfxPlay('finish'); this.app.ui.toast('¡Tiempo! ' + Math.round(this.player.best) + ' m', '#ffd84a'); }
      }
      // ghost: grabar y reproducir
      this.ghostT += dt; if (this.ghostT >= 0.1 && !this.player.out && this.raceT < MATCH_T) { this.ghostT = 0; const p = this.player; this.ghostRec.push([+p.pos.x.toFixed(1), +p.pos.z.toFixed(1), +p.y.toFixed(1), +p.yaw.toFixed(2)]); }
      if (this.ghost) { const P = this.ghost.path, f = this.raceT / 0.1, i = Math.floor(f), u = f - i; const g = this.ghost.mesh;
        if (i < P.length - 1) { const a = P[i], b = P[i + 1]; g.visible = true; g.position.set(lerp(a[0], b[0], u), lerp(a[2], b[2], u), lerp(a[1], b[1], u)); g.rotation.y = a[3] + angDiff(a[3], b[3]) * u; } else g.visible = false; }
    } else this.wave.d = wavePos(0);
    if (this.state === 'race' && this.player.finished) { this.state = 'finish'; this.finishT = 0; }
    // la ola: se coloca en la pista, mirando hacia delante
    const wi = clamp(START_I + Math.round(this.wave.d / T.STEP), 0, T.N - 1), s = T.S[wi], W = this.wave.mesh, u = W.userData;
    W.position.set(s.p.x, s.p.y - 0.5, s.p.z); W.rotation.y = Math.atan2(s.fl.x, s.fl.z);
    const tt = this.time; u.blobs.forEach(([b, h, i]) => { b.scale.y = h * (1 + Math.sin(tt * 4 + i) * 0.12); b.position.y = h * 0.5 + Math.sin(tt * 3 + i * 0.7) * 0.6; });
    u.face.position.y = 9 + Math.sin(tt * 3) * 0.5; const bl = (tt % 3.4) > 3.25; u.eyes.forEach(e => e.scale.y = bl ? 0.25 : 1.7);
    if (this.state === 'race' && Math.random() < 0.6) { const sd = (Math.random() - 0.5) * 2 * s.w; this.emit(new V3(s.p.x + s.right.x * sd + s.fl.x * 3, s.p.y + 1 + Math.random() * 6, s.p.z + s.right.z * sd + s.fl.z * 3), Math.random() < 0.5 ? '#ffffff' : '#ffc4e1', 1.2, 0.6, new V3(s.fl.x * 10, 4 + Math.random() * 4, s.fl.z * 10)); }
    for (const o of this.followCam) o.position.set(this.camera.position.x, o === this.sky || o.isPoints ? 0 : 0, this.camera.position.z);
    if (this.player && !this.player.out && this.state === 'race') { const gap = this.player.best - this.wave.d; this.waveGap = gap; if (gap < 45) { this._wb = (this._wb || 0) - dt; if (this._wb <= 0) { this._wb = gap < 20 ? 0.35 : 0.8; Audio.sfxPlay('beep'); } } } else this.waveGap = 999;
  }
  collideKarts() { // solo empuja karts simulados aquí (los remotos los mueve su dueño)
    const K = this.karts;
    for (let i = 0; i < K.length; i++) for (let j = i + 1; j < K.length; j++) {
      const a = K[i], b = K[j]; if (a.out || b.out || (a.remote && b.remote)) continue;
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, dy = Math.abs(b.y - a.y); const r = 1.45 * (a.megaS + b.megaS), d2 = dx * dx + dz * dz;
      if (d2 > r * r || dy > 2.5 * Math.max(a.megaS, b.megaS)) continue;
      if (!a.remote && !b.remote && this.fx.collide(a, b)) continue;
      if (!a.remote && !b.remote) { if (a.megaT > 0 && b.megaT <= 0) { this.squash(b, a); continue; } if (b.megaT > 0 && a.megaT <= 0) { this.squash(a, b); continue; } }
      const d = Math.sqrt(d2) || 0.01, nx = dx / d, nz = dz / d, over = r - d;
      let wa = a.weight * a.megaS, wb = b.weight * b.megaS, ta = wb / (wa + wb), tb = wa / (wa + wb);
      if (a.remote) { ta = 0; tb = 1; } if (b.remote) { tb = 0; ta = 1; }
      a.pos.x -= nx * over * ta; a.pos.z -= nz * over * ta; b.pos.x += nx * over * tb; b.pos.z += nz * over * tb;
      const rv = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
      if (rv < 0) { const imp = -rv * 1.3; if (!a.remote) { a.vx -= nx * imp * ta; a.vz -= nz * imp * ta; } if (!b.remote) { b.vx += nx * imp * tb; b.vz += nz * imp * tb; } if ((a.isPlayer || b.isPlayer) && imp > 3 && a.bumpCD <= 0) { a.bumpCD = 0.3; Audio.sfxPlay('bump'); } }
    }
  }
  rank() {
    const K = this.karts.slice().sort((a, b) => (b.best ?? b.dist) - (a.best ?? a.dist));
    K.forEach((k, i) => k.place = i + 1);
    const p = this.player; if (p && this.state === 'race') { if (p._pp && p.place < p._pp && this.raceT > 3) { p.expr = 'happy'; p.exprT = 1.4; if ((this._cheerCD || 0) < this.raceT) { this._cheerCD = this.raceT + 2.5; Audio.sfxPlay('cheer'); } this.msg('¡Adelantas! ' + p.place + 'º', p, '#ffd84a'); } p._pp = p.place; }
  }
  endRace() {
    if (this.ended) return; this.ended = true; this.rank();
    Audio.engineStop();
    const order = this.karts.slice().sort((a, b) => a.place - b.place).map(k => ({ ch: k.ch, name: k.name, dist: Math.max(0, k.best), out: k.out, isPlayer: k.isPlayer, bot: k.bot, place: k.place, time: k.out ? k.finishTime : MATCH_T }));
    this.app.onRaceEnd(order, { ...this.stats, ghost: this.ghostRec, seed: this.seed });
  }
}
