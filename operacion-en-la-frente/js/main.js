// ======================================================================
//  OPERACIÓN EN LA FRENTE · Mochi
//  Cada mochi lleva una operación flotando sobre la cabeza. Escribe el
//  resultado de la de otro para eliminarlo. Fallar te bloquea un momento.
//  Las rondas suben de dificultad: sumas → restas → × → ÷ → dos pasos.
// ======================================================================
import * as THREE from 'three';
import { createRenderer, buildWorld, Particles } from './world.js';
import { makeCharacter, animCharacter } from './gfx.js';
import { chOf } from './chars.js';
import { createShell } from './shell.js';
import { Sfx } from './sfx.js';

const $ = id => document.getElementById(id);
const LOCK = 1.6, KILL_CD = 1.2, PU_EVERY = 11, PU_TTL = 7;
const LV_NAMES = ['', 'Sumas', 'Sumas y restas', 'Multiplicaciones', 'Divisiones', 'Dos pasos'];
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.random() * a.length | 0];

function genOp(lv) {
  const k = lv === 2 ? pick(['+', '-', '-']) : lv === 3 ? pick(['×', '×', '+', '-']) : lv === 4 ? pick(['÷', '÷', '×']) : lv >= 5 ? pick(['2a', '2b', '2c', '2d']) : '+';
  let a, b, c;
  switch (k) {
    case '+': a = ri(lv === 1 ? 2 : 11, lv === 1 ? 12 : 49); b = ri(2, lv === 1 ? 12 : 39); return { t: `${a} + ${b}`, a: a + b };
    case '-': a = ri(14, 60); b = ri(3, a - 2); return { t: `${a} − ${b}`, a: a - b };
    case '×': a = ri(3, lv >= 4 ? 12 : 9); b = ri(3, 9); return { t: `${a} × ${b}`, a: a * b };
    case '÷': b = ri(2, 9); c = ri(2, 12); return { t: `${b * c} ÷ ${b}`, a: c };
    case '2a': a = ri(2, 9); b = ri(2, 9); c = ri(2, 20); return { t: `${a} × ${b} + ${c}`, a: a * b + c };
    case '2b': a = ri(3, 9); b = ri(2, 9); c = ri(2, a * b - 1); return { t: `${a} × ${b} − ${c}`, a: a * b - c };
    case '2c': a = ri(5, 15); b = ri(2, a - 1); c = ri(2, 6); return { t: `(${a} − ${b}) × ${c}`, a: (a - b) * c };
    default: b = ri(2, 6); c = ri(2, 9); a = ri(2, 30); return { t: `${b * c} ÷ ${b} + ${a}`, a: c + a };
  }
}

// ---------------------------------------------------------------- SIMULACIÓN
class Sim {
  constructor(cfg) {
    this.T = 0; this.ev = []; this.over = false; this.dead = []; this.lv = 1; this.kills = 0;
    this.P = cfg.roster.map(r => ({ ...r, alive: true, op: null, shield: false, lock: 0, cd: 0, k: 0, ai: r.bot ? { tgt: null, t: 2 + Math.random() * 3 } : null }));
    for (const p of this.P) p.op = this.newOp();
    this.pu = null; this.puT = PU_EVERY * 0.7;
  }
  used() { const s = new Set(this.P.filter(p => p.alive && p.op).map(p => p.op.a)); if (this.pu) s.add(this.pu.a); return s; }
  newOp(lv = this.lv) { const u = this.used(); for (let i = 0; i < 60; i++) { const o = genOp(lv); if (!u.has(o.a)) return o; } return genOp(lv); }
  input(id, d) {
    const p = this.P.find(p => p.id === id); if (!p || !p.alive || this.over || d.k !== 'ans') return;
    if (p.lock > 0) return;
    const v = +d.v;
    if (p.cd > 0) { this.ev.push(['wait', id]); return; }
    if (this.pu && this.pu.a === v) { p.shield = true; this.pu = null; this.puT = PU_EVERY; this.ev.push(['shield', id]); return; }
    if (p.op.a === v) { p.lock = LOCK; this.ev.push(['own', id]); return; }
    const tg = this.P.find(q => q.alive && q !== p && q.op.a === v);
    if (!tg) { p.lock = LOCK; this.ev.push(['wrong', id, v]); return; }
    p.cd = KILL_CD;
    if (tg.shield) { tg.shield = false; tg.op = null; tg.op = this.newOp(); this.ev.push(['block', id, tg.id]); return; }
    tg.alive = false; this.dead.push(tg.id); p.k++; this.kills++; this.ev.push(['hit', id, tg.id]);
    for (const q of this.P) if (q.ai && q.ai.tgt === tg.id) { q.ai.tgt = null; q.ai.t = 0.6 + Math.random(); }
  }
  step(dt) {
    if (this.over) return; this.T += dt;
    const n = this.P.length, alive = this.P.filter(p => p.alive);
    const lvE = 1 + Math.floor(this.kills / Math.max(1, n - 1) * 5.5), lvT = 1 + Math.floor(this.T / 20);
    const lv = Math.min(5, Math.max(lvE, lvT));
    if (lv > this.lv) { this.lv = lv; for (const p of this.P) p.op = null; for (const p of this.P) if (p.alive) p.op = this.newOp(); this.ev.push(['level', lv]);
      for (const p of this.P) if (p.ai) { p.ai.tgt = null; p.ai.t = 0.8 + Math.random(); } }
    // potenciador escudo
    if (this.pu) { this.pu.ttl -= dt; if (this.pu.ttl <= 0) { this.pu = null; this.puT = PU_EVERY; this.ev.push(['puend']); } }
    else if ((this.puT -= dt) <= 0 && alive.length > 2) { const o = genOp(Math.max(1, this.lv - 1)); if (!this.used().has(o.a)) { this.pu = { ...o, ttl: PU_TTL }; this.ev.push(['pu']); } }
    for (const p of this.P) { if (!p.alive) continue; p.lock = Math.max(0, p.lock - dt); p.cd = Math.max(0, p.cd - dt); if (p.ai) this.bot(p, dt); }
    if (alive.length <= 1) { this.over = true; this.ranking = [...alive.map(p => p.id), ...[...this.dead].reverse()]; this.ev.push(['over', alive[0] ? alive[0].id : null]); }
  }
  bot(p, dt) {
    const A = p.ai; if (p.lock > 0 || p.cd > 0) return;
    if (!A.tgt) { // elige objetivo (a veces el escudo)
      const foes = this.P.filter(q => q.alive && q !== p); if (!foes.length) return;
      const goPu = this.pu && Math.random() < 0.35;
      A.tgt = goPu ? 'pu' : pick(foes).id; A.op = goPu ? this.pu.t : this.P.find(q => q.id === A.tgt).op.t;
      const base = [0, 5.2, 6.2, 7.2, 8.6, 10.5][this.lv];
      A.t = base * (2.5 - p.skill * 1.35) * (0.75 + Math.random() * 0.6); return;
    }
    A.t -= dt; if (A.t > 0) return;
    let v;
    if (A.tgt === 'pu') { if (!this.pu || this.pu.t !== A.op) { A.tgt = null; return; } v = this.pu.a; }
    else { const q = this.P.find(q => q.id === A.tgt); if (!q || !q.alive || q.op.t !== A.op) { A.tgt = null; return; } v = q.op.a; }
    if (Math.random() < (1 - p.skill) * 0.22) v += pick([-10, -2, -1, 1, 2, 10]); // se equivoca
    A.tgt = null; this.input(p.id, { k: 'ans', v });
  }
  snap() { return { T: +this.T.toFixed(1), lv: this.lv, p: this.P.map(p => [p.id, p.op ? p.op.t : '', p.alive ? 1 : 0, p.shield ? 1 : 0, +p.lock.toFixed(2), p.k, +p.cd.toFixed(2)]),
    pu: this.pu ? [this.pu.t, +this.pu.ttl.toFixed(1)] : null }; }
}

// ---------------------------------------------------------------- VISTA 3D
const { renderer, scene, camera, composer } = createRenderer($('c3d'));
const world = buildWorld(scene, 'dia', 12);
const parts = new Particles(scene, 700);
const STAGE_Y = 1.6;
// escenario: tarta-plató circular con escalones y focos
const stage = new THREE.Group(); scene.add(stage);
{
  const cols = ['#ffb3d6', '#c8b2ff', '#9fe8cf'];
  for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(15 - k * 1.1, 15.4 - k * 1.1, 0.6, 72), new THREE.MeshPhysicalMaterial({ color: cols[k], roughness: 0.35, clearcoat: 0.7 }));
    m.position.y = STAGE_Y - 1.2 + k * 0.6; m.receiveShadow = true; m.castShadow = true; stage.add(m); }
  const floor = new THREE.Mesh(new THREE.CircleGeometry(12.6, 72), new THREE.MeshPhysicalMaterial({ color: '#ffd9ea', roughness: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.15 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = STAGE_Y + 0.31; floor.receiveShadow = true; stage.add(floor);
  for (let k = 0; k < 8; k++) { const r = new THREE.Mesh(new THREE.RingGeometry(2 + k * 1.35, 2.25 + k * 1.35, 72), new THREE.MeshBasicMaterial({ color: k % 2 ? '#ff9cc8' : '#b9a2f7', transparent: true, opacity: 0.55 }));
    r.rotation.x = -Math.PI / 2; r.position.y = STAGE_Y + 0.32; stage.add(r); }
  // arco de luces al fondo
  const arch = new THREE.Mesh(new THREE.TorusGeometry(13, 0.45, 16, 64, Math.PI), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.3, clearcoat: 1 }));
  arch.position.set(0, STAGE_Y, -8.5); stage.add(arch);
  for (let k = 0; k <= 16; k++) { const a = k / 16 * Math.PI; const b = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), new THREE.MeshStandardMaterial({ color: ['#ff9ec7', '#ffd36b', '#7ee3c4', '#b9a2f7'][k % 4], emissive: ['#ff9ec7', '#ffd36b', '#7ee3c4', '#b9a2f7'][k % 4], emissiveIntensity: 0.6 }));
    b.position.set(Math.cos(a) * 13, STAGE_Y + Math.sin(a) * 13, -8.5); b.userData.k = k; stage.add(b); }
}
const PU_POS = new THREE.Vector3(0, STAGE_Y + 9.5, -6);

function board(w = 1024, h = 400) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; return { cv, tex }; }
function drawBoard(B, txt, o = {}) {
  const x = B.cv.getContext('2d'), W = B.cv.width, H = B.cv.height; x.clearRect(0, 0, W, H);
  const r = 70; x.fillStyle = o.dead ? 'rgba(230,220,240,.85)' : o.pu ? '#fff6d6' : '#ffffff';
  x.strokeStyle = o.me ? '#ff6fae' : o.pu ? '#ffb33b' : o.shield ? '#5fc8ff' : '#b99be6'; x.lineWidth = 26;
  x.beginPath(); x.roundRect(16, 16, W - 32, H - 72, r); x.fill(); x.stroke();
  x.beginPath(); x.moveTo(W / 2 - 34, H - 58); x.lineTo(W / 2, H - 8); x.lineTo(W / 2 + 34, H - 58); x.fill();
  let fs = 190; x.font = `700 ${fs}px Fredoka, sans-serif`; while (x.measureText(txt).width > W - 110 && fs > 70) { fs -= 8; x.font = `700 ${fs}px Fredoka, sans-serif`; }
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = o.dead ? '#b8a8c8' : '#6b3fa0'; x.fillText(txt, W / 2, (H - 56) / 2 + 12);
  if (o.tag) { x.font = '700 64px Fredoka, sans-serif'; x.fillStyle = o.me ? '#ff6fae' : '#ffb33b'; x.textAlign = 'left'; x.fillText(o.tag, 56, 74); }
  B.tex.needsUpdate = true;
}

const seats = new Map(); let me = 'h', roster = [];
let LW = 10; // ancho de la formación (para la cámara)
function layout(n) {
  const port = innerWidth < innerHeight, maxRow = port ? 4 : 5, rows = Math.ceil(n / maxRow), SP = port ? 3.15 : 3.5;
  const per = Math.ceil(n / rows), out = []; LW = Math.min(per, n) * SP + 1.4;
  for (let i = 0; i < n; i++) { const row = Math.floor(i / per), idx = i - row * per, cnt = Math.min(per, n - row * per);
    const x = (idx - (cnt - 1) / 2) * SP, z = 1.6 - row * 4.4 - Math.abs(idx - (cnt - 1) / 2) * 0.4; out.push({ x, z, h: 0.9 + row * 2.5 }); }
  return out;
}
function buildSeats() {
  for (const s of seats.values()) scene.remove(s.root); seats.clear();
  const L = layout(roster.length);
  roster.forEach((r, i) => {
    const root = new THREE.Group(); const P = L[i]; root.position.set(P.x, STAGE_Y + 0.3, P.z); scene.add(root);
    const col = new THREE.Color(chOf(r.ch).color);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.4, P.h, 32), new THREE.MeshPhysicalMaterial({ color: col.clone().lerp(new THREE.Color('#ffffff'), 0.45), roughness: 0.3, clearcoat: 0.8 }));
    ped.position.y = P.h / 2; ped.castShadow = ped.receiveShadow = true; root.add(ped);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.12, 10, 40), new THREE.MeshStandardMaterial({ color: r.id === me ? '#ff6fae' : '#ffffff', emissive: r.id === me ? '#ff6fae' : '#000000', emissiveIntensity: 0.4 }));
    rim.rotation.x = Math.PI / 2; rim.position.y = P.h; root.add(rim);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(1.05, 32), new THREE.MeshBasicMaterial({ color: '#3a2050' })); hole.rotation.x = -Math.PI / 2; hole.position.y = P.h + 0.01; hole.scale.setScalar(0.001); root.add(hole);
    const m = makeCharacter(chOf(r.ch)); m.scale.setScalar(0.9); m.position.y = P.h; m.userData.seed = Math.random() * 10; m.traverse(o => { if (o.isMesh) o.castShadow = true; }); root.add(m);
    const sh = new THREE.Mesh(new THREE.SphereGeometry(1.25, 32, 20), new THREE.MeshPhysicalMaterial({ color: '#8fe0ff', transparent: true, opacity: 0.28, roughness: 0, transmission: 0, clearcoat: 1, emissive: '#5fc8ff', emissiveIntensity: 0.25, depthWrite: false }));
    sh.position.y = P.h + 0.8; sh.visible = false; root.add(sh);
    const B = board(); const bm = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 1.29), new THREE.MeshBasicMaterial({ map: B.tex, transparent: true, toneMapped: false, depthWrite: false }));
    bm.position.y = P.h + 2.75; bm.renderOrder = 10; root.add(bm);
    const nameB = board(512, 120); const nm = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.52), new THREE.MeshBasicMaterial({ map: nameB.tex, transparent: true, toneMapped: false, depthWrite: false }));
    { const x = nameB.cv.getContext('2d'); x.font = '700 70px Fredoka, sans-serif'; const label = r.id === me ? 'TÚ' : r.name; const w = Math.min(500, x.measureText(label).width + 60);
      x.fillStyle = r.id === me ? '#ff6fae' : 'rgba(255,255,255,.9)'; x.beginPath(); x.roundRect(256 - w / 2, 10, w, 100, 50); x.fill();
      x.fillStyle = r.id === me ? '#fff' : '#8a5aa8'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, 256, 62); nameB.tex.needsUpdate = true; }
    nm.position.set(0, P.h * 0.5, 1.45); root.add(nm);
    seats.set(r.id, { root, m, ped, hole, sh, B, bm, h: P.h, txt: '', alive: true, shield: false, dropV: 0, drop: 0, flash: 0, shake: 0, expr: '', exprT: 0 });
  });
}
// potenciador (estrella con su propia operación)
const puG = new THREE.Group(); puG.position.copy(PU_POS); puG.visible = false; scene.add(puG);
{ const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.55 : 1.2; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const st = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 3 }), new THREE.MeshStandardMaterial({ color: '#ffd84d', emissive: '#ffb020', emissiveIntensity: 0.5, roughness: 0.3 }));
  st.position.set(-2.6, 0, 0); puG.add(st); puG.userData.star = st;
  const B = board(); const bm = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.4), new THREE.MeshBasicMaterial({ map: B.tex, transparent: true, toneMapped: false, depthWrite: false })); bm.position.x = 0.9; bm.renderOrder = 10; puG.add(bm); puG.userData.B = B; }
// rayo entre atacante y víctima
const bolts = [];
function bolt(a, b, color) {
  const pts = []; for (let i = 0; i <= 12; i++) { const p = a.clone().lerp(b, i / 12); if (i && i < 12) p.add(new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8)); p.y += Math.sin(i / 12 * Math.PI) * 2.5; pts.push(p); }
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.09, 6); const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, toneMapped: false }));
  scene.add(m); bolts.push({ m, t: 0.45 });
}
const headPos = id => { const s = seats.get(id); return s ? s.root.position.clone().add(new THREE.Vector3(0, s.h + 1.4, 0)) : new THREE.Vector3(); };

// ---------------------------------------------------------------- ESTADO
let sim = null, shell = null, S = null, playing = false, online = false, sendAcc = 0, typed = '', endSent = false, myLock = 0, showcase = null;
const camT = new THREE.Vector3(), camP = new THREE.Vector3(0, 12, 30);
function applySnap(s) {
  S = s;
  for (const [id, txt, alive, shield, lock, k, cd] of s.p) { const st = seats.get(id); if (!st) continue;
    if (st.txt !== txt || st.alive !== !!alive || st.shield !== !!shield) { st.txt = txt; st.shield = !!shield; drawBoard(st.B, alive ? txt : '✖', { me: id === me, shield, dead: !alive, tag: id === me ? 'TÚ' : shield ? '🛡️' : '' }); if (alive) st.pop = 0.3; }
    if (st.alive && !alive) { st.alive = false; st.drop = 0.0001; }
    st.sh.visible = !!shield && !!alive;
    if (id === me) { myLock = lock; } }
  if (s.pu) { if (!puG.visible || puG.userData.txt !== s.pu[0]) { puG.userData.txt = s.pu[0]; drawBoard(puG.userData.B, s.pu[0], { pu: true, tag: '🛡️ Escudo' }); } puG.visible = true; puG.userData.ttl = s.pu[1]; }
  else puG.visible = false;
}
function onEvents(evs) {
  const who = id => { const r = roster.find(r => r.id === id); return r ? (r.id === me ? 'Tú' : r.name) : '?'; };
  for (const e of evs) {
    if (e[0] === 'hit') { Sfx.zap(); bolt(headPos(e[1]), headPos(e[2]), '#ff6fae'); const s = seats.get(e[2]); if (s) { parts.burst(headPos(e[2]), chOf(roster.find(r => r.id === e[2]).ch).color, 46, 6, 7); }
      const a = seats.get(e[1]); if (a) { a.expr = 'happy'; a.exprT = 1.2; }
      if (e[2] === me) { Sfx.out(); shell.big('¡Te han pillado!', 1300); $('spect').classList.add('on'); $('pad').classList.remove('on'); shell.toast(`${who(e[1])} ha resuelto tu operación`, 2000); }
      else if (e[1] === me) { Sfx.ok(); shell.toast(`✅ ¡Eliminas a ${who(e[2])}!`); }
      else shell.toast(`⚡ ${who(e[1])} elimina a ${who(e[2])}`, 1300); }
    if (e[0] === 'block') { Sfx.shield(); bolt(headPos(e[1]), headPos(e[2]), '#5fc8ff'); parts.burst(headPos(e[2]), '#8fe0ff', 30, 5, 5);
      shell.toast(e[2] === me ? '🛡️ ¡Tu escudo te ha salvado! (operación nueva)' : e[1] === me ? `🛡️ ${who(e[2])} tenía escudo` : `🛡️ El escudo salva a ${who(e[2])}`, 1500); }
    if (e[0] === 'shield') { Sfx.shield(); parts.burst(PU_POS, '#ffd84d', 40, 6, 4); shell.toast(e[1] === me ? '🛡️ ¡Tienes escudo! Aguanta un golpe' : `🛡️ ${who(e[1])} consigue un escudo`); }
    if (e[0] === 'pu') { Sfx.tick(); shell.toast('⭐ ¡Escudo en juego! Resuelve la estrella', 1500); }
    if ((e[0] === 'wrong' || e[0] === 'own') && e[1] === me) { Sfx.bad(); const d = $('disp'); d.classList.remove('bad'); void d.offsetWidth; d.classList.add('bad');
      shell.toast(e[0] === 'own' ? '😅 ¡Esa es la tuya! Bloqueado' : `❌ Nadie tiene ${e[2]} · Bloqueado`, 1300); }
    if ((e[0] === 'wrong' || e[0] === 'own')) { const s = seats.get(e[1]); if (s) s.shake = 0.5; }
    if (e[0] === 'wait' && e[1] === me) shell.toast('Un segundito…', 700);
    if (e[0] === 'level') { Sfx.go(); shell.big(`Ronda ${e[1]}`, 1100); setTimeout(() => shell.toast(`Nuevas operaciones: ${LV_NAMES[e[1]]}`, 1600), 300); typed = ''; drawDisp(); }
    if (e[0] === 'over') { playing = false; const w = e[1]; shell.big(w === me ? '¡Victoria!' : w ? `¡Gana ${who(w)}!` : '¡Empate!', 1500); const s = seats.get(w); if (s) { s.expr = 'happy'; s.exprT = 99; } }
  }
}

// ---------------------------------------------------------------- CONTROLES
$('keys').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, '✔'].map(k => `<button data-k="${k}" class="${k === '✔' ? 'ok' : ''}">${k}</button>`).join('');
function drawDisp() { $('disp').innerHTML = (typed || '<span class="ph">Escribe un resultado</span>') + '<i></i>'; }
function submit() { if (!typed || !playing) return; const v = +typed; typed = ''; drawDisp(); const d = { k: 'ans', v }; if (online && !shell.isHost) shell.send({ t: 'gin', ...d }); else sim && sim.input(me, d); }
function press(k) { if (!playing || myLock > 0) return; Sfx.key(); if (k === '⌫') typed = typed.slice(0, -1); else if (k === '✔') return submit(); else if (typed.length < 3) typed += k; drawDisp(); if (typed.length === 3) submit(); }
$('keys').addEventListener('pointerdown', e => { const b = e.target.closest('button'); if (b) { e.preventDefault(); press(b.dataset.k); } });
addEventListener('keydown', e => { if (!playing) return; if (/^[0-9]$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('⌫'); else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); press('✔'); } });

// ---------------------------------------------------------------- BUCLE
const clock = new THREE.Clock(); let t = 0; const NORENDER = /norender/.test(location.search); const SPD = +new URLSearchParams(location.search).get('spd') || 1;
function frame() {
  const rdt = Math.min(0.25, clock.getDelta()), dt = Math.min(0.05, rdt); t += dt;
  if (sim && (playing || (sim.over && !endSent))) {
    { let left = rdt * SPD; while (left > 1e-4) { const h = Math.min(0.033, left); sim.step(h); left -= h; } } const ev = sim.ev.splice(0); applySnap(sim.snap()); if (ev.length) { onEvents(ev); if (online) shell.send({ t: 'gev', e: ev }); }
    sendAcc += dt; if (online && sendAcc > 0.1) { sendAcc = 0; shell.send({ t: 'gs', s: sim.snap() }); }
    if (sim.over && !endSent) { endSent = true; const res = { ranking: sim.ranking, roster }; if (online) shell.send({ t: 'gend', res }); setTimeout(() => finish(res), 900); }
  }
  for (const [id, s] of seats) {
    s.bm.quaternion.copy(camera.quaternion); s.bm.position.y = s.h + 2.75 + Math.sin(t * 2 + s.m.userData.seed) * 0.08;
    if (s.pop > 0) { s.pop -= dt; s.bm.scale.setScalar(1 + Math.sin(s.pop / 0.3 * Math.PI) * 0.18); } else s.bm.scale.setScalar(1);
    if (s.exprT > 0) s.exprT -= dt; else s.expr = '';
    if (s.shake > 0) { s.shake -= dt; s.m.position.x = Math.sin(t * 60) * 0.12 * s.shake; s.expr = 'squash'; } else s.m.position.x = 0;
    if (s.drop > 0) { s.drop += dt; s.hole.scale.setScalar(Math.min(1, s.drop * 5)); if (s.drop > 0.25) { s.dropV += dt * 18; s.m.position.y -= s.dropV * dt; s.m.scale.setScalar(Math.max(0.01, 0.9 - (s.drop - 0.25) * 0.5)); }
      s.expr = 'squash'; s.bm.material.opacity = Math.max(0.35, 1 - s.drop); if (s.drop > 1.1) { s.m.visible = false; s.hole.scale.setScalar(Math.max(0.001, 1 - (s.drop - 1.1) * 3)); } }
    else { const b = Math.abs(Math.sin(t * 2.4 + s.m.userData.seed)) * 0.12; s.m.position.y = s.h + b; const sq = 1 + Math.sin(t * 4.8 + s.m.userData.seed) * 0.03; s.m.scale.set(0.9 / Math.sqrt(sq), 0.9 * sq, 0.9 / Math.sqrt(sq)); }
    s.m.rotation.y = Math.sin(t * 0.7 + s.m.userData.seed) * 0.3;
    if (s.sh.visible) { s.sh.scale.setScalar(1 + Math.sin(t * 4) * 0.04); s.sh.rotation.y = t; }
    animCharacter(s.m, t + s.m.userData.seed, 1, s.expr);
  }
  if (puG.visible) { puG.quaternion.copy(camera.quaternion); puG.userData.star.rotation.z = t * 1.5; puG.position.y = PU_POS.y + Math.sin(t * 2.5) * 0.25; }
  for (let i = bolts.length - 1; i >= 0; i--) { const b = bolts[i]; b.t -= dt; b.m.material.opacity = Math.max(0, b.t / 0.45); if (b.t <= 0) { scene.remove(b.m); b.m.geometry.dispose(); bolts.splice(i, 1); } }
  for (const o of stage.children) if (o.userData.k != null) o.material.emissiveIntensity = 0.35 + 0.35 * Math.max(0, Math.sin(t * 3 - o.userData.k * 0.6));
  if (showcase) { showcase.rotation.y = Math.sin(t * 0.8) * 0.5; showcase.position.y = STAGE_Y + 0.3 + Math.abs(Math.sin(t * 2.2)) * 0.25; animCharacter(showcase, t, 1, (t % 4) < 0.6 ? 'happy' : ''); }
  // HUD
  if (S) { $('hLv').textContent = `Ronda ${S.lv} · ${LV_NAMES[S.lv]}`; const al = S.p.filter(p => p[2]).length; $('hAlive').textContent = `🍡 ${al} de ${S.p.length} en pie`;
    $('pad').classList.toggle('locked', myLock > 0); $('disp').classList.toggle('lock', myLock > 0); const bar = $('disp').querySelector('i'); if (bar) bar.style.width = (myLock / LOCK * 100) + '%'; }
  // cámara
  const port = camera.aspect < 1, tn = Math.tan(camera.fov * Math.PI / 360);
  if (sim || online) { const wdt = LW;
    const land = !port && innerWidth >= 700; const dist = Math.max(wdt * 0.5 / (tn * camera.aspect * (land ? 0.68 : 1)), 9.5 / tn);
    camT.set(land ? wdt * 0.17 : 0, STAGE_Y + (port ? 2.6 : 3.4), port ? -1 : 0); camP.set(camT.x, camT.y + dist * 0.24, camT.z + dist * 0.97); }
  else if ($('sChars').classList.contains('on')) { camT.set(0, STAGE_Y - 1.1, 6); camP.set(0, STAGE_Y + 2.8, 20); } else { camT.set(0, STAGE_Y + 1.8, 4); camP.set(Math.sin(t * 0.1) * 4, STAGE_Y + 5, 17); }
  camera.position.lerp(camP, 1 - Math.exp(-dt * 3)); camera.lookAt(camT);
  world.update(t); parts.update(dt); if (!NORENDER) composer.render();
  requestAnimationFrame(frame);
}

function setShowcase(chId) { if (showcase) scene.remove(showcase); showcase = makeCharacter(chOf(chId)); showcase.scale.setScalar(1.3); showcase.position.set(0, STAGE_Y + 0.3, 6); showcase.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(showcase); }
function finish(res) { $('hud').classList.remove('on'); $('pad').classList.remove('on'); $('spect').classList.remove('on'); shell.end(res); }
function start(cfg, api) {
  shell = api; roster = cfg.roster; online = cfg.online; me = api.myId; endSent = false; typed = ''; drawDisp(); myLock = 0; S = null;
  if (showcase) { scene.remove(showcase); showcase = null; }
  buildSeats(); $('spect').classList.remove('on');
  sim = (!online || api.isHost) ? new Sim(cfg) : null; if (sim) applySnap(sim.snap());
  $('hud').classList.add('on'); $('pad').classList.add('on');
  playing = false; let n = 3; api.big('3', 0); Sfx.tick();
  const cd = setInterval(() => { n--; if (n > 0) { api.big(String(n), 0); Sfx.tick(); } else { clearInterval(cd); api.big('¡Ya!', 700); Sfx.go(); playing = true; } }, 750);
  api.toast('Escribe el resultado de la operación de otro mochi', 2600);
}
function stop() { playing = false; sim = null; S = null; online = false; puG.visible = false; $('hud').classList.remove('on'); $('pad').classList.remove('on'); $('spect').classList.remove('on');
  for (const s of seats.values()) scene.remove(s.root); seats.clear(); setShowcase(localStorage.getItem('ms_ch') || 'mochi'); }

createShell({
  id: 'frente', titleA: 'Operación', titleB: 'en la frente', prefix: 'mochifrente-v1-',
  sub: '¡Resuelve la cuenta de los demás antes que nadie!',
  how: `<ul><li>Cada mochi lleva una <b>operación</b> flotando sobre la cabeza (la tuya también se ve).</li>
    <li><b>Escribe el resultado</b> de la operación de otro y pulsa ✔ para <b>eliminarlo</b>.</li>
    <li>Si te equivocas (o escribes el de tu propia cuenta) te quedas <b>bloqueado</b> un momento.</li>
    <li>Cuando aparece la <b>⭐ estrella</b>, resuelve su cuenta para ganar un <b>🛡️ escudo</b> que aguanta un golpe.</li>
    <li>Cada ronda es más difícil: sumas, restas, multiplicaciones, divisiones y cuentas de dos pasos.</li>
    <li>Gana el <b>último mochi en pie</b>.</li></ul>`,
  onPreview: chId => setShowcase(chId), start, stop,
  onNetMsg(d, api) {
    if (d.t === 'gin' && sim && api.isHost) { sim.input(d.from, d); return; }
    if (sim) return;
    if (d.t === 'gs') applySnap(d.s);
    if (d.t === 'gev') onEvents(d.e);
    if (d.t === 'gend' && !endSent) { endSent = true; playing = false; setTimeout(() => finish(d.res), 900); }
  },
  onLeft(id) { if (sim) { const p = sim.P.find(p => p.id === id); if (p && p.alive) { p.ai = { tgt: null, t: 2 }; p.skill = 0.6; p.bot = true; } } },
});
setShowcase(localStorage.getItem('ms_ch') || 'mochi');
frame();
window.__frente = { get sim() { return sim; }, godMe(on) { if (sim) { sim.P[0].ai = on ? { tgt: null, t: 1 } : null; sim.P[0].skill = 0.9; } } };
