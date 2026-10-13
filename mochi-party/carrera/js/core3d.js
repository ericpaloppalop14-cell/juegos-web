// ======================================================================
//  MOCHI RIVALS · las 4 pruebas en 3D con el motor de Mochi Race
//  (Three.js r170, personajes de gfx.js, toon + contornos, audio.js)
//  URL: pruebas.html?p=planetas|vallas|caida|nado&pj=<id>&rv=a,b,c,d,e&sk=0.5,..  (?auto piloto, ?x=2 tiempo, ?q=low)
// ======================================================================
import * as THREE from 'three';
import { CHARS } from './data.js';
import { makeCharacter, animCharacter, toon, outline, mesh, glowTex, shadowMat, starShape } from './gfx.js';
import { Audio } from './audio.js';

const $ = id => document.getElementById(id);
const Q = new URLSearchParams(location.search);
const AUTO = Q.has('auto'), TS = +(Q.get('x') || 1);
const rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, pick = a => a[Math.random() * a.length | 0];
const charOf = id => CHARS.find(c => c.id === id) || CHARS[0];
const PERS = { mochi: ['¡Hoy es mi día!', '¡Qué bonito todo!'], tiovivo: ['¡Vueltas y más vueltas!', 'Estoy mareado de ganar.'], atomo: ['¡Bzzzt! ¡Más rápido!', '¡Tres batidos de rayos!'], cosmo: ['Las estrellas dicen que pierdes.', 'Vengo de muy lejos.'], copito: ['Te dejaré helado.', 'Calma… yo ya la tengo.'], burbuja: ['¡Blub! A que no me pillas.', '¡Glu glu, chao!'], lava: ['¡Voy a fundir el récord!', 'Quema, ¿eh?'], tictac: ['Llegas tarde. Como siempre.', 'Tic, tac…'], trueno: ['¡¡BROOOM!!', '¡Se avecina tormenta!'], disco: ['¡Mis gafas brillan más que tú!', '¡Que suene la música!'] };
const OUCH = ['¡Ay, mi culete!', '¡Eso no vale!', '¡Uy, uy, uy!', '¡Mi cara de gelatina!', '¡Socorro!'];

// ---------------- renderer ----------------
const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, Q.get('q') === 'low' ? 1 : 2));
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 900);
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

// ---------------- HUD ----------------
let toastT = 0, hintT = 0;
const ui = {
  toast(t, c = '#fff') { const e = $('toast'); e.textContent = t; e.style.color = c; e.style.opacity = 1; toastT = 1.5; },
  count(t) { const c = $('count'); c.textContent = t; c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); },
  banner(t, ms = 1800) { const b = $('banner'); b.textContent = t; b.classList.add('on'); clearTimeout(ui._b); ui._b = setTimeout(() => b.classList.remove('on'), ms); },
  hint(t, s = 4) { $('hint').textContent = t; $('hint').style.opacity = t ? 1 : 0; hintT = s; },
  say(r, s) { const box = $('say'); if (box.children.length > 1) return; const d = document.createElement('div'); d.innerHTML = `<span style="color:${r.ch.color};-webkit-text-stroke:.4px #6a3f9a">●</span> <b>${r.ch.name}:</b> ${s}`; box.appendChild(d); setTimeout(() => d.remove(), 2300); },
  flash() { const f = $('flash'); f.style.transition = 'none'; f.style.opacity = .55; requestAnimationFrame(() => { f.style.transition = 'opacity .35s'; f.style.opacity = 0; }); },
};

// ---------------- partículas (sprites brillantes, como en la carrera) ----------------
const parts = [];
function burst(scene, p, color, n = 14, sp = 6, life = 0.8, size = 0.5, grav = -6) {
  const mat = new THREE.SpriteMaterial({ map: glowTex(color), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let i = 0; i < n; i++) { const s = new THREE.Sprite(mat.clone()); s.position.copy(p); const a = Math.random() * 6.28, b = Math.random() * 3.14 - 1.57; s.userData = { v: new THREE.Vector3(Math.cos(a) * Math.cos(b), Math.sin(b) * 0.8 + 0.6, Math.sin(a) * Math.cos(b)).multiplyScalar(sp * rnd(.4, 1)), t: 0, life: life * rnd(.6, 1.2), size: size * rnd(.6, 1.3), grav }; s.scale.setScalar(s.userData.size); scene.add(s); parts.push(s); }
}
const confM = ['#ff9cc8', '#7ee3c4', '#ffe27a', '#b9a2f7', '#8fd0ff'].map(c => toon(c, { rim: 0.3 }));
function confetti(scene, p, n = 40) { for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.4), confM[i % 5]); m.material.side = THREE.DoubleSide; m.position.copy(p).add(new THREE.Vector3(rnd(-3, 3), rnd(0, 2), rnd(-3, 3))); m.userData = { v: new THREE.Vector3(rnd(-3, 3), rnd(4, 9), rnd(-3, 3)), t: 0, life: 2.5, conf: true, spin: rnd(4, 9) }; scene.add(m); parts.push(m); } }
function updParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) { const s = parts[i], u = s.userData; u.t += dt; if (u.t > u.life) { s.parent && s.parent.remove(s); parts.splice(i, 1); continue; }
    if (u.conf) { u.v.y -= 9 * dt; u.v.multiplyScalar(0.98); s.position.addScaledVector(u.v, dt); s.rotation.x += u.spin * dt; s.rotation.y += u.spin * .7 * dt; continue; }
    u.v.y += u.grav * dt; s.position.addScaledVector(u.v, dt); const k = u.t / u.life; s.material.opacity = 1 - k; s.scale.setScalar(u.size * (1 - k * .5)); }
}

// ---------------- personajes ----------------
function makeRunner(ch, idx, scale = 1) {
  const g = new THREE.Group(); const pivot = new THREE.Group(); g.add(pivot);
  const c = makeCharacter(ch); c.userData.seed = idx; pivot.add(c); pivot.scale.setScalar(scale);
  const sh = new THREE.Mesh(new THREE.CircleGeometry(1, 20), shadowMat()); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; sh.scale.setScalar(1.1 * scale); g.add(sh);
  g.userData = { pivot, char: c, shadow: sh };
  return g;
}
function nameSprite(text, color, me) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const x = cv.getContext('2d');
  x.font = '700 34px Fredoka, sans-serif'; const w = Math.min(248, x.measureText(text).width + 30);
  x.fillStyle = me ? 'rgba(240,96,159,.9)' : 'rgba(80,40,110,.72)'; x.beginPath(); x.roundRect((256 - w) / 2, 8, w, 48, 22); x.fill();
  x.fillStyle = color; x.beginPath(); x.arc((256 - w) / 2 + 18, 32, 8, 0, 7); x.fill();
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128 + 8, 33);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(3.2, 0.8, 1); s.renderOrder = 10; return s;
}
function skyDome(scene, top, mid, bot) {
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256; const x = cv.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, top); g.addColorStop(.5, mid); g.addColorStop(1, bot); x.fillStyle = g; x.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false })); scene.add(m); return m;
}
function lights(scene, sky = '#ffffff', ground = '#ffd6ea', hi = 0.95, sun = 2.0) {
  const h = new THREE.HemisphereLight(sky, ground, hi); scene.add(h); const d = new THREE.DirectionalLight('#fff4e8', sun); d.position.set(80, 160, 60); scene.add(d); return { h, d };
}
const glowSprite = (color, s, op = 1) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(color), transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); sp.scale.setScalar(s); return sp; };

// ---------------- entrada ----------------
const input = { taps: [], ups: [], down: false, px: null, swipe: false, swipeUp: false, side: [] };
const cv = $('gl');
cv.addEventListener('pointerdown', e => { Audio.init(); input.down = true; input.px = e.clientX; input.sy = e.clientY; input.sx = e.clientX; input.taps.push(e.clientX); });
cv.addEventListener('pointermove', e => { if (input.down) input.px = e.clientX; });
addEventListener('pointerup', e => { if (input.down) { const dy = e.clientY - input.sy, dx = e.clientX - input.sx; if (dy > 45 && Math.abs(dy) > Math.abs(dx)) input.swipe = true; else if (dy < -45 && Math.abs(dy) > Math.abs(dx)) input.swipeUp = true; else input.ups.push(e.clientX); } input.down = false; });
for (const [id, s] of [['bL', 'L'], ['bR', 'R'], ['bM', 'M']]) $(id).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); Audio.init(); if (s === 'M') input.swipe = true; else input.side.push(s); });
addEventListener('keydown', e => { if (e.code === 'Space' || e.code === 'ArrowUp') input.taps.push(innerWidth / 2); if (e.code === 'ArrowLeft') input.side.push('L'); if (e.code === 'ArrowRight') input.side.push('R'); if (e.code === 'ArrowDown') input.swipe = true; });

// ======================================================================
//  Marco común: cuenta atrás, simulación a paso fijo, cámara, HUD, meta y vuelta al torneo
// ======================================================================
function seeded(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// opts (modo online): { racers:[{id,ch,name,human,me,skill}], seed, net:{isHost, send(d)}, onEnd(order), wait:true }
function run(EV, opts = {}) {
  const ON = !!opts.net;
  let racers;
  if (opts.racers) racers = opts.racers.map(o => ({ ...o, ch: charOf(o.ch) }));
  else {
    const pj = charOf(Q.get('pj') || 'mochi');
    const rvIds = (Q.get('rv') || 'tiovivo,atomo,cosmo,lava,disco').split(','), sk = (Q.get('sk') || '').split(',').map(Number);
    racers = [{ id: 'me', me: true, ch: pj, skill: 1 }, ...rvIds.map((id, i) => ({ id, ch: charOf(id), skill: isFinite(sk[i]) && sk[i] > 0 ? sk[i] : rnd(.4, .9) }))];
  }
  // en online: cada cliente simula a su jugador; el anfitrión además simula la IA. El resto llega por red.
  racers.forEach((r, k) => { r.k = k; r.prog = 0; r.fin = false; r.time = null; r.skill = r.skill || .7; r.remote = ON && !r.me && (r.human || !opts.net.isHost); });
  const me = racers.find(r => r.me) || racers[0];
  parts.forEach(s => s.parent && s.parent.remove(s)); parts.length = 0;
  const scene = new THREE.Scene();
  camera.fov = 70; camera.far = 900; camera.updateProjectionMatrix();
  const E = { scene, racers, me, t: 0, phase: opts.wait ? 'wait' : 'count', cnt: 3.4, fins: [], shake: 0, ui, AUTO, input, online: ON, burst: (p, c, n, s, l, z, g) => burst(scene, p, c, n, s, l, z, g), say: (r, s) => { if (Math.random() < .6) ui.say(r, s); } };
  const nm = r => r.me ? 'Tú' : (r.name || r.ch.name);
  E.finish = r => { if (r.fin) return; r.fin = true; r.time = E.t; E.fins.push(r); if (r.me) { Audio.sfxPlay('finish'); setTimeout(() => Audio.sfxPlay('cheer'), 400); E.meDone = E.t; ui.banner(E.fins.length === 1 ? '¡HAS GANADO! 🏆' : `¡Meta! ${E.fins.length}º`); confetti(scene, r.obj.position.clone().add(new THREE.Vector3(0, 3, 0)), 60); } else if (r.human) ui.toast(`🏁 ${nm(r)} llega ${E.fins.length}º`, '#ffe27a'); };
  // escenario idéntico en todos los clientes: Math.random con semilla durante la construcción
  const R0 = Math.random; if (opts.seed != null) Math.random = seeded(opts.seed);
  try { EV.init(E); } finally { Math.random = R0; }
  for (const r of racers) { r.tag = nameSprite(nm(r), r.ch.color, r.me); r.tag.position.y = EV.tagY || 2.4; if (EV.tagS) r.tag.scale.multiplyScalar(EV.tagS); r.obj.add(r.tag); }
  $('hName').textContent = EV.icon + ' ' + EV.name; $('hIcon').textContent = EV.icon; $('ctl').classList.toggle('on', !!EV.buttons);
  $('load').style.display = 'none'; ui.hint(EV.how, 5);
  Audio.init(); Audio.playSong(EV.music, EV.seed || 5);
  let last = performance.now(), acc = 0, sent = false, cntShown = 4, raf = 0, nstep = 0; const STEP = 1 / 60;
  const KEYS = ['prog', 'fin', 'time', 'expr', ...(EV.netKeys || [])];
  const snap = r => { const o = { id: r.id }; for (const k of KEYS) o[k] = r[k]; return o; };
  E.applySnap = list => { for (const s of list) { const r = racers.find(x => x.id === s.id); if (!r || !r.remote) continue; const wasFin = r.fin; for (const k of KEYS) if (k in s) r[k] = s[k]; if (r.fin && !wasFin) { r.fin = false; const tm = r.time; E.finish(r); r.time = tm; E.fins.sort((a, b) => a.time - b.time); } } };
  // un jugador real se desconecta: le sustituye la IA (la simula el anfitrión)
  E.dropHuman = id => { const r = racers.find(x => x.id === id); if (!r || r.left) return; r.left = true; r.name = (r.name || r.ch.name) + ' (IA)'; if (opts.net.isHost) { r.remote = false; r.human = false; r.timer = 0; r.hop = null; r.fly = null; r.plan = null; r.stun = 0; } ui.toast(`📴 ${r.name.replace(' (IA)', '')} se ha ido: le sustituye la IA`, '#c9b2ff'); };
  E.go = () => { if (E.phase === 'wait') { E.phase = 'count'; last = performance.now(); } };
  const order = () => racers.map(r => ({ id: r.id, time: +(r.fin ? r.time : E.t + (1 - r.prog) * Math.max(4, E.t / Math.max(.15, r.prog))).toFixed(2), fin: r.fin })).sort((a, b) => a.time - b.time);
  function end() {
    if (sent) return; sent = true;
    const res = order();
    if (ON) { if (opts.net.isHost) opts.net.send({ t: 'res', order: res }); opts.onEnd && opts.onEnd(res); return; }
    try { localStorage.setItem('mr_res', JSON.stringify({ ev: EV.id, t: Date.now(), order: res })); } catch (e) {}
    Audio.stopSong();
    setTimeout(() => { location.href = '../index.html?vuelta=' + EV.id + (AUTO ? '&auto' : ''); }, Q.has('stay') ? 1e9 : 400);
  }
  E.end = end;
  E.stop = () => { EV.dispose && EV.dispose(); E.stopped = true; E.phase = 'done'; cancelAnimationFrame(raf); Audio.stopSong(); parts.length = 0; scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => { if (!confM.includes(m)) m.dispose(); }); }); renderer.renderLists.dispose(); };
  function frame(now) {
    let dt = Math.min(0.1, (now - last) / 1000) * TS; last = now; acc += dt;
    let n = 0;
    while (acc >= STEP && n < 8 * TS) { acc -= STEP; n++; step(STEP); }
    if (n >= 8 * TS) acc = 0;
    EV.render(E, dt);
    if (ON) for (const r of racers) if (r.remote) { const p = r.obj.position; if (!r._p) r._p = p.clone(); else { r._p.lerp(p, Math.min(1, dt * 14)); p.copy(r._p); } } else r._p = null;
    if (E.shake > 0) { E.shake -= dt; camera.position.x += rnd(-.15, .15) * E.shake * 4; camera.position.y += rnd(-.15, .15) * E.shake * 4; }
    updParts(dt);
    for (const r of racers) animCharacter(r.obj.userData.char, now / 1000 + r.k, 1, r.expr || '');
    renderer.render(scene, camera);
    hud(dt);
    if (E.phase !== 'done' || (ON && !E.stopped)) raf = requestAnimationFrame(frame);
  }
  function step(dt) {
    if (E.phase === 'wait') { input.taps.length = 0; input.ups.length = 0; input.side.length = 0; input.swipe = input.swipeUp = false; EV.idle && EV.idle(E, dt); return; }
    if (E.phase === 'count') { E.cnt -= dt; const c = Math.ceil(E.cnt); if (c !== cntShown && c <= 3) { cntShown = c; if (c > 0) { ui.count(String(c)); Audio.sfxPlay('beep'); } } if (E.cnt <= 0) { E.phase = 'run'; ui.count('¡YA!'); Audio.sfxPlay('go'); } input.taps.length = 0; input.ups.length = 0; input.side.length = 0; input.swipe = input.swipeUp = false; EV.idle && EV.idle(E, dt); return; }
    if (E.phase === 'run' || (ON && E.phase === 'watch')) {
      E.taps = input.taps.splice(0); E.ups = input.ups.splice(0); E.side = input.side.splice(0); E.swipe = input.swipe; E.swipeUp = input.swipeUp; input.swipe = input.swipeUp = false;
      EV.update(E, dt); E.t += dt;
      if (ON) {
        if (++nstep % 4 === 0) { const mine = racers.filter(r => !r.remote); if (mine.length) opts.net.send({ t: 'st', s: mine.map(snap) }); }
        if (opts.net.isHost) { const hum = racers.filter(r => r.human && !r.left); const allHum = hum.every(r => r.fin); if (E.allHumAt == null && allHum) E.allHumAt = E.t;
          if ((E.allHumAt != null && E.t - E.allHumAt > 2.6) || E.fins.length === racers.length || E.t > EV.maxT) { E.phase = 'done'; end(); } }
        else if (E.t > EV.maxT + 8) { E.phase = 'watch'; }
      } else if ((E.meDone != null && E.t - E.meDone > 2.6) || E.fins.length === racers.length || E.t > EV.maxT) { E.phase = 'done'; end(); }
    }
  }
  function hud(dt) {
    const me = E.me, order = [...racers].sort((a, b) => (b.fin - a.fin) || (a.fin ? a.time - b.time : b.prog - a.prog));
    const pos = order.indexOf(me) + 1; $('hPos').innerHTML = pos + '<small>º/' + racers.length + '</small>'; $('hPos').classList.toggle('p1', pos === 1);
    $('hTime').textContent = E.t.toFixed(1) + ' s'; $('hBarIn').style.width = (me.prog * 100).toFixed(1) + '%';
    $('hBoard').innerHTML = order.map((r, i) => `<div class="${r.me ? 'me' : ''}">${i + 1}º <i style="background:${r.ch.color}"></i>${r.human && !r.me ? '🎮 ' : ''}${nm(r)}${r.fin ? ' 🏁' : ''}</div>`).join('');
    if (toastT > 0 && (toastT -= dt) <= 0) $('toast').style.opacity = 0;
    if (hintT > 0 && (hintT -= dt) <= 0) $('hint').style.opacity = 0;
  }
  raf = requestAnimationFrame(frame);
  window.__p3 = { E, get phase() { return E.phase; }, renderer };
  return E;
}
export { THREE, run, camera, toon, outline, mesh, glowTex, glowSprite, starShape, makeRunner, skyDome, lights, rnd, clamp, lerp, pick, Audio, PERS, OUCH, ui };
