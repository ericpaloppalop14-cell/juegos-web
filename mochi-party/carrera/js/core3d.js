// ======================================================================
//  MOCHI RIVALS · las 4 pruebas en 3D con el motor de Mochi Race
//  (Three.js r170, personajes de gfx.js, toon + contornos, audio.js)
//  URL: pruebas.html?p=planetas|vallas|caida|nado&pj=<id>&rv=a,b,c,d,e&sk=0.5,..  (?auto piloto, ?x=2 tiempo, ?q=low)
// ======================================================================
import * as THREE from 'three';
import { CHARS } from './data.js';
import { makeCharacter, animCharacter, toon, outline, mesh, glowTex, shadowMat, starShape } from './gfx.js?v=o42';
import { Audio } from './audio.js';
import { makePost } from './post.js?v=o42';
import { horizonte } from './horizonte.js?v=o42';

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
// nitidez: hasta x3 en móviles con pantalla densa; baja sola si el móvil no llega a ~48 fps (ver frame())
const PR_MAX = Math.min(devicePixelRatio || 1, Q.get('q') === 'low' ? 1 : 3); let PR = PR_MAX;
renderer.setPixelRatio(PR);
const post = makePost(renderer);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.3, 900);
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
  if (n >= 10 && parts.length < 300) { sparkle(scene, p, color, Math.min(8, n >> 1), sp * .8, life * 1.2, size * 1.1); shock(scene, p, color, 1.5 + sp * .3); }
}
// noche 3: estrellitas de 4 puntas y onda expansiva en las acciones; lluvia de estrellas en las victorias
let _starTex; function starTex() { if (_starTex) return _starTex; const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(32, 0); x.quadraticCurveTo(36, 28, 64, 32); x.quadraticCurveTo(36, 36, 32, 64); x.quadraticCurveTo(28, 36, 0, 32); x.quadraticCurveTo(28, 28, 32, 0); x.fill(); _starTex = new THREE.CanvasTexture(cv); return _starTex; }
let _ringGeo, _ringTex; function ringTex() { if (_ringTex) return _ringTex; const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'); const g = x.createRadialGradient(64, 64, 30, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.75, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); _ringTex = new THREE.CanvasTexture(cv); return _ringTex; }
function sparkle(scene, p, color, n, sp, life, size) { if (parts.length > 360) return; const mat = new THREE.SpriteMaterial({ map: starTex(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let i = 0; i < n; i++) { const s = new THREE.Sprite(mat.clone()); s.position.copy(p); const a = Math.random() * 6.28; s.userData = { v: new THREE.Vector3(Math.cos(a), rnd(.4, 1.3), Math.sin(a)).multiplyScalar(sp * rnd(.5, 1)), t: 0, life: life * rnd(.7, 1.3), size: size * rnd(.7, 1.4), grav: -3, star: true, rot: rnd(-4, 4) }; s.scale.setScalar(s.userData.size); scene.add(s); parts.push(s); } }
function shock(scene, p, color, r = 2.5, life = .45) { if (parts.length > 360) return; _ringGeo = _ringGeo || new THREE.PlaneGeometry(2, 2); const m = new THREE.Mesh(_ringGeo, new THREE.MeshBasicMaterial({ map: ringTex(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.position.copy(p); m.position.y = Math.max(.08, p.y - .9); m.userData = { t: 0, life, ring: r, v: new THREE.Vector3() }; m.scale.setScalar(.2); scene.add(m); parts.push(m); }
const confM = ['#ff9cc8', '#7ee3c4', '#ffe27a', '#b9a2f7', '#8fd0ff'].map(c => toon(c, { rim: 0.3 }));
function confetti(scene, p, n = 40) { for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.4), confM[i % 5]); m.material.side = THREE.DoubleSide; m.position.copy(p).add(new THREE.Vector3(rnd(-3, 3), rnd(0, 2), rnd(-3, 3))); m.userData = { v: new THREE.Vector3(rnd(-3, 3), rnd(4, 9), rnd(-3, 3)), t: 0, life: 2.5, conf: true, spin: rnd(4, 9) }; scene.add(m); parts.push(m); }
  sparkle(scene, p, '#ffe27a', 22, 7, 1.6, .9); sparkle(scene, p, '#ffffff', 12, 5, 1.2, .6); shock(scene, p, '#ffe9a8', 5, .7); }
function updParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) { const s = parts[i], u = s.userData; u.t += dt; if (u.t > u.life) { s.parent && s.parent.remove(s); parts.splice(i, 1); continue; }
    if (u.conf) { u.v.y -= 9 * dt; u.v.multiplyScalar(0.98); s.position.addScaledVector(u.v, dt); s.rotation.x += u.spin * dt; s.rotation.y += u.spin * .7 * dt; continue; }
    if (u.ring) { const k = u.t / u.life; s.scale.setScalar(.2 + u.ring * (1 - (1 - k) ** 3)); s.material.opacity = (1 - k) * .9; continue; }
    u.v.y += u.grav * dt; s.position.addScaledVector(u.v, dt); const k = u.t / u.life; s.material.opacity = 1 - k; s.scale.setScalar(u.size * (u.star ? (k < .2 ? k * 5 : 1 - (k - .2) * .9) : (1 - k * .5))); if (u.star) s.material.rotation += u.rot * dt; }
}

// ---------------- personajes ----------------
function makeRunner(ch, idx, scale = 1) {
  const g = new THREE.Group(); const pivot = new THREE.Group(); g.add(pivot);
  const c = makeCharacter(ch); c.userData.seed = idx; pivot.add(c); pivot.scale.setScalar(scale);
  const sh = new THREE.Mesh(new THREE.CircleGeometry(1, 20), shadowMat()); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; sh.scale.setScalar(1.1 * scale); g.add(sh);
  g.userData = { pivot, char: c, shadow: sh, sc: scale };
  return g;
}
function nameSprite(text, color, me) {
  const S2 = 2, cv = document.createElement('canvas'); cv.width = 256 * S2; cv.height = 64 * S2; const x = cv.getContext('2d'); x.scale(S2, S2);
  x.font = '700 34px Fredoka, sans-serif'; const w = Math.min(244, x.measureText(text).width + 34), l = (256 - w) / 2;
  x.shadowColor = 'rgba(60,20,80,.35)'; x.shadowBlur = 6; x.shadowOffsetY = 2;
  x.fillStyle = me ? '#f0609f' : 'rgba(80,40,110,.78)'; x.beginPath(); x.roundRect(l, 8, w, 46, 23); x.fill(); x.shadowColor = 'transparent';
  x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 3; x.beginPath(); x.roundRect(l + 1.5, 9.5, w - 3, 43, 21.5); x.stroke();
  x.fillStyle = color; x.beginPath(); x.arc(l + 20, 31, 8, 0, 7); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 2.5; x.stroke();
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128 + 9, 32);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(3.2, 0.8, 1); s.renderOrder = 10; return s;
}
function skyDome(scene, top, mid, bot, mk) {
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 512; const x = cv.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, top); g.addColorStop(.5, mid); g.addColorStop(1, bot); x.fillStyle = g; x.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.SphereGeometry(600, 48, 24), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false })); scene.add(m); try { horizonte(scene, m, top, mid, bot, mk); } catch (e) { console.warn('horizonte', e); } return m;
}
function lights(scene, sky = '#ffffff', ground = '#ffd6ea', hi = 0.95, sun = 2.0) {
  const h = new THREE.HemisphereLight(sky, ground, hi); scene.add(h); const d = new THREE.DirectionalLight('#fff4e8', sun); d.position.set(80, 160, 60); scene.add(d); return { h, d };
}
const glowSprite = (color, s, op = 1) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(color), transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); sp.scale.setScalar(s); return sp; };

// ---------------- entrada ----------------
const input = { taps: [], ups: [], down: false, px: null, swipe: false, swipeUp: false, side: [] };
const cv = $('gl');
cv.addEventListener('pointerdown', e => { Audio.init(); if (input.down && input.pid != null && input.pid !== e.pointerId) { input.taps.push(e.clientX); return; } input.pid = e.pointerId; input.down = true; input.px = e.clientX; input.py = e.clientY; input.sy = e.clientY; input.sx = e.clientX; input.taps.push(e.clientX); });
cv.addEventListener('pointermove', e => { if (input.down && (input.pid == null || e.pointerId === input.pid)) { input.px = e.clientX; input.py = e.clientY; } });
const upFn = e => { if (input.down && input.pid != null && e.pointerId !== input.pid) return; if (input.down && e.type === 'pointerup') { const dy = e.clientY - input.sy, dx = e.clientX - input.sx; if (dy > 45 && Math.abs(dy) > Math.abs(dx)) input.swipe = true; else if (dy < -45 && Math.abs(dy) > Math.abs(dx)) input.swipeUp = true; else input.ups.push(e.clientX); } input.down = false; input.pid = null; };
addEventListener('pointerup', upFn); addEventListener('pointercancel', upFn);
input.held = {}; // botones mantenidos (para pruebas de equilibrio / dirección continua)
for (const [id, s] of [['bL', 'L'], ['bR', 'R'], ['bM', 'M']]) { const el = $(id);
  el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); Audio.init(); input.held[s] = true; try { el.setPointerCapture(e.pointerId); } catch (_) {} if (s === 'M') { input.swipe = true; input.btnM = true; } else input.side.push(s); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(ev, () => { input.held[s] = false; }); }
addEventListener('keydown', e => { if (e.code === 'Space' || e.code === 'ArrowUp') input.taps.push(innerWidth / 2); if (e.code === 'ArrowLeft') input.side.push('L'); if (e.code === 'ArrowRight') input.side.push('R'); if (e.code === 'ArrowDown') { input.swipe = true; input.btnM = true; } });

// ======================================================================
//  Marco común: cuenta atrás, simulación a paso fijo, cámara, HUD, meta y vuelta al torneo
// ======================================================================
function seeded(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// ---------------- celebración final (todas las pruebas) ----------------
// El ganador salta, gira y lanza confeti; los demás le aplauden con saltitos. La cámara enfoca
// primero al ganador y, si no eres tú, después a ti. Al acabar llama a cb().
function celebOverlay() {
  let d = $('celeb'); if (d) return d;
  const st = document.createElement('style'); st.textContent = `#celeb{position:absolute;left:0;right:0;top:calc(10px + env(safe-area-inset-top));display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;opacity:0;transform:translateY(-30px) scale(.8);transition:all .45s cubic-bezier(.3,1.6,.5,1);z-index:6}
#celeb.on{opacity:1;transform:none}
#celeb .cT{font:700 34px Fredoka;color:#fff;-webkit-text-stroke:2px #e0609f;text-shadow:0 4px 0 #e0609f,0 0 22px rgba(255,140,220,.8);text-align:center;padding:0 10px;line-height:1.05;animation:cWob 1.2s ease-in-out infinite}
#celeb .cT.lose{font-size:26px;-webkit-text-stroke-color:#7a6ac0;text-shadow:0 4px 0 #7a6ac0}
@keyframes cWob{50%{transform:rotate(-2deg) scale(1.05)}}
#celeb .cRow{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;max-width:96vw}
#celeb .cRow div{font:700 13px Fredoka;color:#fff;background:linear-gradient(rgba(120,70,160,.75),rgba(95,50,135,.75));border:1.5px solid #fff;border-radius:12px;padding:3px 9px;opacity:0;transform:translateY(14px) scale(.6);animation:cIn .4s cubic-bezier(.3,1.6,.5,1) forwards}
#celeb .cRow div.w{background:linear-gradient(#ffe27a,#ffb030);color:#7a3a00;border-color:#fff}
#celeb .cRow div.me{box-shadow:0 0 0 3px #ff6fae}
@keyframes cIn{to{opacity:1;transform:none}}`; document.head.appendChild(st);
  d = document.createElement('div'); d.id = 'celeb'; $('hud').appendChild(d); return d;
}
function celebrate(E, res, cb) {
  if (E.celeb) return; const racers = E.racers, byId = id => racers.find(r => r.id === id);
  const win = byId(res[0].id) || racers[0], me = E.me, nm = r => r.me ? 'Tú' : (r.name || r.ch.name);
  E.celeb = { t: 0, win, me, cb, dur: win === me ? 3.4 : 4.6, done: false, fw: 0 };
  for (const r of racers) { r.expr = r === win ? 'happy' : ''; r.stun = 0; }
  ['ctl', 'hint', 'say', 'banner', 'toast', 'perf', 'hTop', 'hBoard', 'exitB', 'limite', 'bL', 'bM', 'bR'].forEach(id => { const e = $(id); if (e) e.style.visibility = 'hidden'; });
  const o = celebOverlay(); const mePos = res.findIndex(x => x.id === me.id) + 1;
  o.innerHTML = `<div class="cT${win === me ? '' : ' lose'}">${win === me ? '🏆 ¡HAS GANADO! 🎉' : `🏆 ¡Gana ${nm(win)}!`}</div><div class="cRow">${res.map((x, i) => { const r = byId(x.id); return r ? `<div class="${i === 0 ? 'w' : ''} ${r.me ? 'me' : ''}" style="animation-delay:${.25 + i * .12}s">${['🥇', '🥈', '🥉'][i] || (i + 1) + 'º'} ${nm(r)}${i === 0 ? ' 😄' : ''}</div>` : ''; }).join('')}</div>`;
  requestAnimationFrame(() => o.classList.add('on'));
  if (win === me) { Audio.sfxPlay('cheer'); } else { Audio.sfxPlay('pop'); setTimeout(() => Audio.sfxPlay('cheer'), 300); }
  if (mePos > 1) setTimeout(() => { if (E.celeb && !E.stopped) o.querySelector('.cT').textContent = mePos ? `¡Has quedado ${mePos}º! 👏` : '¡Bien jugado! 👏'; }, 2300);
}
const _wp = new THREE.Vector3(), _cp = new THREE.Vector3();
function celebFrame(E, dt) {
  const C = E.celeb; if (!C) return; C.t += dt; const t = C.t, now = performance.now() / 1000;
  for (const r of E.racers) { const o = r.obj, u = o.userData, p = u.pivot, s = u.sc || 1; if (!p) continue;
    o.visible = true; p.rotation.set(0, 0, 0); if (!(E.EV.celeb && E.EV.celeb.keepRot)) { o.rotation.x = 0; o.rotation.z = 0; }
    if (r === C.win) { // alegría: saltos grandes con giro, estirón en el aire y aplastado al caer
      const ph = (t * 1.9) % 1, hop = Math.sin(ph * Math.PI); p.position.y = hop * 1.3 * s; p.rotation.y = (ph < .5 ? ph * 2 : 1) * Math.PI * 2 * (Math.floor(t * 1.9) % 2 ? 1 : 0);
      const sq = ph > .92 || ph < .06 ? .22 : 0; p.scale.set(s * (1 + sq), s * (1 - sq + hop * .12), s * (1 + sq));
      p.rotation.z = Math.sin(t * 9) * .12;
      C.fw -= dt; if (C.fw <= 0) { C.fw = .35; o.getWorldPosition(_wp); E.burst(_wp.clone().add(new THREE.Vector3(rnd(-1.6, 1.6) * s, (2 + rnd(0, 1.5)) * s, rnd(-1.2, 1.2) * s)), pick(['#ffe27a', '#ff9cc8', '#7ee3c4', '#b9a2f7', '#8fd0ff']), 18, 5 * s, .9, .55 * s, -2); }
    } else { // los demás aplauden al ganador con saltitos (sin tristeza)
      const ph = (now * 2.4 + r.k * .37) % 1; p.position.y = Math.sin(ph * Math.PI) * .22 * s; p.rotation.z = Math.sin(now * 6 + r.k) * .08; p.scale.setScalar(s);
    }
  }
  if (t > .1 && t < .2) { C.win.obj.getWorldPosition(_wp); confetti(E.scene, _wp.clone().add(new THREE.Vector3(0, 2.5 * (C.win.obj.userData.sc || 1), 0)), 70); }
  // cámara: vuelta alrededor del ganador; luego (si has perdido) plano de tu mochi
  const focus = (C.win !== C.me && t > 2.3) ? C.me : C.win, s = focus.obj.userData.sc || 1;
  focus.obj.getWorldPosition(_wp); const CF = E.EV.celeb || {}, U = CF.keepRot ? new THREE.Vector3(0, 1, 0).applyQuaternion(focus.obj.quaternion) : new THREE.Vector3(0, 1, 0);
  // la cámara sale del lado desde el que ya mirabas (así nada se interpone) y gira un poco alrededor
  if (C.cut !== focus) { C.cut = focus; C.ct = t; const d = camera.position.clone().sub(_wp); d.y = 0; if (d.lengthSq() < .01 || Math.abs(camera.position.y - _wp.y) > 3 * Math.hypot(d.x, d.z)) d.set(0, 0, 1); if (CF.dir) d.set(...CF.dir); C.dir = d.normalize(); C.cam = _wp.clone().addScaledVector(C.dir, 5 * s + 3).add(new THREE.Vector3(0, 2 * s + .6, 0)); }
  const a = Math.sin((t - C.ct) * .6) * .55, dist = 4.6 * s + 2.4, cs = Math.cos(a), sn = Math.sin(a);
  _cp.set(_wp.x + (C.dir.x * cs - C.dir.z * sn) * dist, _wp.y, _wp.z + (C.dir.x * sn + C.dir.z * cs) * dist).addScaledVector(U, 1.5 * s + .45);
  C.cam.lerp(_cp, Math.min(1, dt * 4)); camera.position.copy(C.cam);
  // que nadie tape la foto: fuera etiquetas y fuera los mochis que queden entre la cámara y el protagonista
  { const df = C.cam.distanceTo(_wp); for (const r of E.racers) { if (r.tag) r.tag.visible = false; if (r !== focus) { r.obj.getWorldPosition(_cp); if (C.cam.distanceTo(_cp) < df - .3) r.obj.visible = false; } } }
  camera.up.copy(U); camera.fov = lerp(camera.fov, 55, Math.min(1, dt * 4)); camera.updateProjectionMatrix(); camera.lookAt(_wp.clone().addScaledVector(U, .9 * s));
  if (t >= C.dur && !C.done) { C.done = true; const o = $('celeb'); if (o) o.classList.remove('on'); C.cb && C.cb(); }
}

// ---------------- LÍMITE DE TIEMPO (todas las pruebas) ----------------
// Cuando el primero acaba, los demás tienen una ventana: carreras = 35 % del tiempo del ganador (mín. 8 s, máx. 15 s);
// pruebas por puntos con final individual = 10 s. Red de seguridad: maxT de la prueba + 5 s (nunca infinita).
const doneOf = (EV, r) => !!(r.fin || r.done === true || (EV.doneSt && r.st === EV.doneSt));
function winDur(EV, t) { if (EV.limite) return EV.limite; if (EV.mode === 'puntos') return 10; return clamp(Math.round(t * .35), 8, 15); }
function limiteEl() {
  let d = $('limite'); if (d) return d;
  const st = document.createElement('style'); st.textContent = `#limite{position:absolute;left:50%;top:calc(96px + env(safe-area-inset-top));transform:translateX(-50%) scale(.6);opacity:0;pointer-events:none;z-index:7;font:700 30px Fredoka,sans-serif;color:#fff;-webkit-text-stroke:2px #9b5fd0;text-shadow:0 4px 0 #9b5fd0,0 0 18px rgba(200,150,255,.9);white-space:nowrap;transition:opacity .3s,transform .35s cubic-bezier(.3,1.6,.5,1)}
#limite.on{opacity:1;transform:translateX(-50%) scale(1)}
#limite.urg{color:#ffe27a;-webkit-text-stroke-color:#e0405f;text-shadow:0 4px 0 #e0405f,0 0 22px rgba(255,90,120,.9);animation:limP .5s ease-in-out infinite}
@keyframes limP{50%{transform:translateX(-50%) scale(1.15)}}`; document.head.appendChild(st);
  d = document.createElement('div'); d.id = 'limite'; ($('hud') || document.body).appendChild(d); return d;
}
function limiteTick(E, EV, racers, online) {
  for (const r of racers) if (r._dAt == null && doneOf(EV, r)) { r._dAt = E.t; if (r.me && E.meDone == null) E.meDone = E.t; }
  if (E.winT == null && racers.some(r => doneOf(EV, r))) { E.winT = E.t; E.winDur = winDur(EV, E.t); }
  if (E.winT == null) return false;
  let endT = E.winT + E.winDur; if (!online && E.meDone != null) endT = Math.min(endT, Math.max(E.meDone + 8, E.winT + 8));
  const left = Math.max(0, endT - E.t), n = Math.ceil(left), d = limiteEl();
  if (n !== E.limN && racers.some(r => !doneOf(EV, r))) { E.limN = n; d.textContent = n > 0 ? `⏱️ ¡Quedan ${n} s!` : '⏱️ ¡Tiempo!'; d.classList.add('on'); d.classList.toggle('urg', n <= 3); if (n <= 3) Audio.sfxPlay(n > 0 ? 'tick' : 'beep'); }
  return left <= 0;
}
function limiteOff() { const d = $('limite'); if (d) d.classList.remove('on', 'urg'); }
// cierre forzado: los que no acabaron quedan detrás de los que sí, ordenados por su progreso / puntos
function forceEnd(E, EV, racers) {
  if (EV.timeUp) { try { EV.timeUp(E); } catch (e) {} }
  const un = racers.filter(r => !r.fin); if (!un.length) return;
  if (racers.some(r => typeof r.score === 'number')) {
    un.sort((a, b) => (doneOf(EV, b) - doneOf(EV, a)) || ((b.score || 0) - (a.score || 0)) || (b.prog - a.prog));
    un.forEach((r, i) => { if (r.label == null && EV.mode === 'puntos') r.label = r.score + ' pts'; r.prog = Math.max(r.prog || 0, .999); E.finish(r); r.time = E.t + 1 + i * .01; });
  } else for (const r of un) { if (r.label == null) r.label = `${Math.round((r.prog || 0) * 100)} % · sin acabar`; }
}
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
  const E = { EV, scene, racers, me, t: 0, phase: opts.wait ? 'wait' : 'count', cnt: 3.4, fins: [], shake: 0, ui, AUTO, input, online: ON, burst: (p, c, n, s, l, z, g) => burst(scene, p, c, n, s, l, z, g), say: (r, s) => { if (Math.random() < .6) ui.say(r, s); } };
  const nm = r => r.me ? 'Tú' : (r.name || r.ch.name);
  E.finish = r => { if (r.fin) return; r.fin = true; r.time = E.t; E.fins.push(r); if (r.me) { Audio.sfxPlay('finish'); setTimeout(() => Audio.sfxPlay('cheer'), 400); E.meDone = E.t; ui.banner(E.fins.length === 1 ? '¡HAS GANADO! 🏆' : `¡Meta! ${E.fins.length}º`); confetti(scene, r.obj.position.clone().add(new THREE.Vector3(0, 3, 0)), 60); } else if (r.human) ui.toast(`🏁 ${nm(r)} llega ${E.fins.length}º`, '#ffe27a'); };
  // escenario idéntico en todos los clientes: Math.random con semilla durante la construcción
  const R0 = Math.random; if (opts.seed != null) Math.random = seeded(opts.seed);
  try { EV.init(E); } finally { Math.random = R0; }
  for (const r of racers) { r.tag = nameSprite(nm(r), r.ch.color, r.me); r.tag.position.y = EV.tagY || 2.4; if (EV.tagS) r.tag.scale.multiplyScalar(EV.tagS); r.obj.add(r.tag); }
  $('hName').textContent = EV.icon + ' ' + EV.name; $('hIcon').textContent = EV.icon; if (!EV.ownButtons) $('ctl').classList.toggle('on', !!EV.buttons); input.held = {};
  $('load').style.display = 'none'; ui.hint(EV.how, 5);
  Audio.init(); Audio.playSong(EV.music, EV.seed || 5);
  let last = performance.now(), acc = 0, sent = false, cntShown = 4, raf = 0, nstep = 0; const STEP = 1 / 60;
  const KEYS = ['prog', 'fin', 'time', 'expr', ...(EV.netKeys || [])];
  const snap = r => { const o = { id: r.id }; for (const k of KEYS) o[k] = r[k]; return o; };
  E.applySnap = list => { for (const s of list) { const r = racers.find(x => x.id === s.id); if (!r || !r.remote) continue; const wasFin = r.fin; for (const k of KEYS) if (k in s) r[k] = s[k]; if (r.fin && !wasFin) { r.fin = false; const tm = r.time; E.finish(r); r.time = tm; E.fins.sort((a, b) => a.time - b.time); } } };
  // un jugador real se desconecta: le sustituye la IA (la simula el anfitrión)
  E.dropHuman = id => { const r = racers.find(x => x.id === id); if (!r || r.left) return; r.left = true; r.name = (r.name || r.ch.name) + ' (IA)'; if (opts.net.isHost) { r.remote = false; r.human = false; r.timer = 0; r.hop = null; r.fly = null; r.plan = null; r.stun = 0; } ui.toast(`📴 ${r.name.replace(' (IA)', '')} se ha ido: le sustituye la IA`, '#c9b2ff'); };
  E.go = () => { if (E.phase === 'wait') { E.phase = 'count'; last = performance.now(); } };
  const order = () => racers.map(r => ({ id: r.id, time: +(r.fin ? (r.time ?? r._dAt ?? E.t) : E.t + (1 - r.prog) * Math.max(4, E.t / Math.max(.15, r.prog))).toFixed(2), fin: r.fin })).sort((a, b) => a.time - b.time);
  function end() {
    if (sent) return; sent = true;
    const res = order();
    if (ON) { if (opts.net.isHost) opts.net.send({ t: 'res', order: res }); opts.onEnd && opts.onEnd(res); return; }
    try { localStorage.setItem('mr_res', JSON.stringify({ ev: EV.id, t: Date.now(), order: res })); } catch (e) {}
    Audio.stopSong();
    setTimeout(() => { location.href = '../index.html?vuelta=' + EV.id + (AUTO ? '&auto' : ''); }, Q.has('stay') ? 1e9 : 400);
  }
  E.end = end;
  E.celebrate = (res, cb) => { if (E.celeb || E.stopped) { cb && cb(); return; } E.phase = 'celebra'; celebrate(E, res, cb); };
  E.stop = () => { EV.dispose && EV.dispose(); E.stopped = true; E.phase = 'done'; cancelAnimationFrame(raf); Audio.stopSong(); parts.length = 0; scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => { if (!confM.includes(m)) m.dispose(); }); }); renderer.renderLists.dispose(); };
  function frame(now) {
    let dt = Math.min(0.1, (now - last) / 1000) * TS; last = now; acc += dt;
    let n = 0;
    while (acc >= STEP && n < 8 * TS) { acc -= STEP; n++; step(STEP); }
    if (n >= 8 * TS) acc = 0;
    EV.render(E, dt);
    if (E.celeb) celebFrame(E, dt / TS);
    if (ON) for (const r of racers) if (r.remote) { const p = r.obj.position; if (!r._p) r._p = p.clone(); else { r._p.lerp(p, Math.min(1, dt * 14)); p.copy(r._p); } } else r._p = null;
    if (E.shake > 0) { E.shake -= dt; camera.position.x += rnd(-.15, .15) * E.shake * 4; camera.position.y += rnd(-.15, .15) * E.shake * 4; }
    updParts(dt);
    for (const r of racers) { const c = r.obj.userData.char, T = now / 1000 + r.k; let ex = r.expr || '';
      // capa común de animación: esfuerzo al moverse y alegría al acabar (nunca tristeza)
      if (c) { if (E.celeb || EV.noAnimFx) { c.position.y = 0; c.rotation.x = 0; c.rotation.z = 0; }
        else if (r.fin) { const ph = (T * 2.1) % 1; c.position.y = Math.sin(ph * Math.PI) * .35; c.rotation.z = Math.sin(T * 7) * .12; c.rotation.x = 0; if (!ex || ex === 'sad') ex = 'happy'; }
        else if (E.phase === 'run') { const p = r.obj.position, mv = r._lp ? Math.hypot(p.x - r._lp.x, p.z - r._lp.z) / Math.max(dt, 1e-3) : 0; (r._lp || (r._lp = p.clone())).copy(p); r._mv = lerp(r._mv || 0, Math.min(1, mv / 8), Math.min(1, dt * 6));
          c.rotation.x = -.16 * r._mv + Math.sin(T * 15) * .035 * r._mv; c.rotation.z = Math.sin(T * 9) * .05 * r._mv; c.position.y = Math.abs(Math.sin(T * 12)) * .06 * r._mv;
          if (r.me && r._mv > .6 && Math.random() < dt * 1.5) burst(scene, r.obj.position.clone().add(new THREE.Vector3(rnd(-.3, .3), 1.1 * (r.obj.userData.sc || 1), 0)), '#bfe8ff', 2, 1.5, .5, .2, -6); }
        else { c.position.y = 0; c.rotation.x = 0; c.rotation.z = 0; } }
      if (ex === 'sad') ex = '';
      animCharacter(c, T, 1, ex); }
    if (!EV.noFeet) feetFix(racers);
    if (E.celeb) E.shake = 0;
    post.render(scene, camera);
    if (EV.id !== 'anillos' && PR > 1.25) { const ft = (now - (E._fpsT0 || now)); E._fpsN = (E._fpsN || 0) + 1; if (!E._fpsT0) E._fpsT0 = now; else if (ft > 1500) { const fps = E._fpsN * 1000 / ft; E._fpsN = 0; E._fpsT0 = now; if (fps < 48 && E.t > 1) { PR = Math.max(1.25, PR - .5); renderer.setPixelRatio(PR); resize(); } } }
    hud(dt);
    if (E.phase !== 'done' || (ON && !E.stopped) || (E.celeb && !E.stopped)) raf = requestAnimationFrame(frame);
  }
  function step(dt) {
    if (E.phase === 'wait') { input.taps.length = 0; input.ups.length = 0; input.side.length = 0; input.swipe = input.swipeUp = input.btnM = false; EV.idle && EV.idle(E, dt); return; }
    if (E.phase === 'count') { E.cnt -= dt; const c = Math.ceil(E.cnt); if (c !== cntShown && c <= 3) { cntShown = c; if (c > 0) { ui.count(String(c)); Audio.sfxPlay('beep'); } } if (E.cnt <= 0) { E.phase = 'run'; ui.count('¡YA!'); Audio.sfxPlay('go'); } input.taps.length = 0; input.ups.length = 0; input.side.length = 0; input.swipe = input.swipeUp = input.btnM = false; EV.idle && EV.idle(E, dt); return; }
    if (E.phase === 'run' || (ON && E.phase === 'watch')) {
      E.taps = input.taps.splice(0); E.ups = input.ups.splice(0); E.side = input.side.splice(0); E.swipe = input.swipe; E.swipeUp = input.swipeUp; E.btnM = !!input.btnM; input.swipe = input.swipeUp = input.btnM = false;
      EV.update(E, dt); E.t += dt;
      if (ON) {
        if (++nstep % 4 === 0) { const mine = racers.filter(r => !r.remote); if (mine.length) opts.net.send({ t: 'st', s: mine.map(snap) }); }
        const limUp = limiteTick(E, EV, racers, true);
        if (opts.net.isHost) { const hum = racers.filter(r => r.human && !r.left); const allHum = hum.every(r => r.fin); if (E.allHumAt == null && allHum) E.allHumAt = E.t;
          if ((E.allHumAt != null && E.t - E.allHumAt > 2.6) || E.fins.length === racers.length || limUp || E.t > EV.maxT + 5) { limiteOff(); E.phase = 'done'; end(); } }
        else if (E.t > EV.maxT + 8) { E.phase = 'watch'; }
      } else { const limUp = limiteTick(E, EV, racers, false);
        if (E.fins.length === racers.length || limUp || E.t > EV.maxT + 5) { if (E.fins.length < racers.length) forceEnd(E, EV, racers); limiteOff(); const res = order(); E.phase = 'celebra'; celebrate(E, res, () => { E.phase = 'done'; end(); }); } }
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
  window.__p3 = { E, get phase() { return E.phase; }, renderer }; window.__cam = camera;
  return E;
}
// pies siempre sobre el suelo: si el cuerpo (por inclinarse, aplastarse o girar) baja de la base, se sube lo justo
const _fb = new THREE.Box3();
function feetFix(rs) { for (const r of rs) { const o = r.obj, c = o && o.userData.char; if (!c || !o.visible || r.out || o.parent !== o.parent?.parent && false) continue; if (o.position.y > .6 || o.position.y < -.05 || o.parent.type !== 'Scene') continue; o.updateMatrixWorld(true); _fb.setFromObject(c); const d = _fb.min.y - o.position.y; if (d < -.02) o.position.y -= d + .02; } }
export { THREE, renderer, run, camera, toon, outline, mesh, glowTex, glowSprite, starShape, makeRunner, skyDome, lights, rnd, clamp, lerp, pick, Audio, PERS, OUCH, ui };
