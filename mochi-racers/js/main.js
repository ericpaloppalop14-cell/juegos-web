import { mergeStatic } from './merge.js';
import * as THREE from 'three';
import { CONFIG, CHARS, CUPS, ITEMS, RACES_PER_CUP } from './data.js';
import { POWER } from './powerups.js';
import './locos.js'; // v23: 8 objetos hiperlocos
import './epic.js'; // v32: Taladrín, Dragón Colosal y Tobogán Arcoíris
import { cupForRace, raceNames } from './tracks2.js';
Object.assign(ITEMS, POWER); // v10: iconos y nombres de los potenciadores surrealistas
import { makeKart, animKart, makeTrophy, toon, mesh, outline, makeSeta } from './gfx.js';
import { Race } from './race.js';
import { buildTrack } from './track.js';
import { Audio } from './audio.js';
import { EndlessRace, MATCH_T, daySeed, makeEndlessCup } from './endless.js';
import { Online, soloMatch, MAX_PLAYERS } from './online.js';
import { createCupCarousel } from './cupsel.js';
import { buildPodium } from './podium.js';
import { buildTitleFx, animTitleFx, buildSelBg, animSelBg, setSelColor, makePortraits, makePortraitsAsync, finishPortraits, ANIMS, animPreview } from './showcase.js';

const $ = id => document.getElementById(id);
const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
document.title = CONFIG.title; $('logo').firstChild.textContent = CONFIG.title;

// ---------------- save ----------------
const SKEY = 'mracers_save_v1';
const save = Object.assign({ trophies: {}, char: 'mochi', settings: { sound: '1', music: '1', engine: '0', controls: 'botones', quality: 'auto', fps: '0', autoDrift: '1' } }, JSON.parse(localStorage.getItem(SKEY) || '{}'));
save.settings = Object.assign({ sound: '1', music: '1', engine: '0', controls: 'botones', quality: 'auto', fps: '0', autoDrift: '1' }, save.settings);
const persist = () => localStorage.setItem(SKEY, JSON.stringify(save));
const cupUnlocked = c => !c.unlock || c.unlock.needs.every(id => save.trophies[id] != null);
const charUnlocked = ch => !!ch.premium || (!ch.unlock || save.trophies[ch.unlock.cup] != null || DEBUG_ALL);
const DEBUG_ALL = /[?&]debug=all/.test(location.search);
if (DEBUG_ALL) CUPS.forEach(c => c.unlock = null);

// ---------------- renderer ----------------
const params = new URLSearchParams(location.search);
let qualityHi = save.settings.quality === 'alta' || (save.settings.quality === 'auto' && !isTouch);
if (params.get('q') === 'low') qualityHi = false;
const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
// v2: resolución por niveles (hasta 2×). Auto: arranca en 1,5× en móvil / 2× en PC, baja si va lento y vuelve a subir si sobra.
// v23: un punto más de nitidez (móvil arranca en 1,75×, PC en 2×; sigue bajando sola si va lento)
const PRL = [2.25, 2, 1.75, 1.5, 1.25, 1, 0.85]; let prLv = 0, prGood = 0, prWarned = false;
function prBase() { const q = save.settings.quality; return q === 'alta' ? 0 : q === 'baja' ? (isTouch ? 6 : 5) : (isTouch ? 2 : 1); }
prLv = prBase(); if (params.get('q') === 'low') prLv = 5;
renderer.debug.checkShaderErrors = params.has('debug'); // v13: comprobar errores de shader bloquea el primer uso de cada programa
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// v13: apagar/encender sombras recompila TODOS los materiales (tirón de cientos de ms). Durante una carrera solo se
// permite apagarlas una vez; volver a encenderlas espera a la siguiente carrera (sin ir y venir en mitad de la partida).
let shadowLock = false;
function applyPR() { renderer.setPixelRatio(Math.min(devicePixelRatio, PRL[prLv])); let sh = prLv <= 3 && !params.has('noshadows'); const racing = app.state === 'race' && app.race;
  if (racing && sh && !renderer.shadowMap.enabled && shadowLock) sh = false; if (racing && !sh && renderer.shadowMap.enabled) shadowLock = true;
  if (renderer.shadowMap.enabled !== sh) { renderer.shadowMap.enabled = sh; try { app.race && app.race.scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); }); } catch (e) {} } resize(); }
var booted = false;
function resize() { renderer.setSize(innerWidth, innerHeight, false); if (booted) setTimeout(renderNow, 0); const a = innerWidth / innerHeight; for (const c of [menuCam, app.race && app.race.camera, podCam]) if (c) { c.aspect = a; c.zoom = a < 1 ? Math.max(0.55, a / 1.05) : 1; c.updateProjectionMatrix(); } checkRotate(); }
addEventListener('resize', () => resize()); addEventListener('orientationchange', () => setTimeout(resize, 120));

// ---------------- app / UI ----------------
const app = { race: null, state: 'title', autopilot: params.has('auto'), skipIntro: false, speed: 1, cup: null, raceNo: 0, points: {}, lastOrder: null, playerChar: null };
let toastT = 0;
app.ui = {
  toast(text, color = '#ffffff') { const t = $('toast'); t.textContent = text; t.style.color = color; t.style.opacity = 1; toastT = 1.6; },
  countdown(txt) { const c = $('count'); c.textContent = txt; c.dataset.n = txt; c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); if (txt === '¡YA!') $('startHint').style.display = 'none'; },
  finishBanner(place) { this.toast(place === 1 ? '¡HAS GANADO!' : `¡Meta! ${place}º`, place <= 3 ? '#ffd84a' : '#ffffff'); },
};
function show(id) {
  fest(['results', 'podium', 'title', 'orient', 'modes'].includes(id) ? (id === 'results' || id === 'podium' ? 2 : 1) : 0);
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('on', s.id === id);
  app.state = id || 'race';
  $('hud').classList.toggle('on', app.state === 'race');
  $('ctl').classList.toggle('on', app.state === 'race' && isTouch);
  Audio.screen(id); const mb = document.getElementById('muteB'); if (mb) mb.style.display = app.state === 'race' ? 'none' : '';
}
function btn(id, f) { $(id).addEventListener('click', e => { Audio.unlock(); Audio.uiSound(id); f(e); }); }
// v27: el primer toque desbloquea el audio y arranca la música de la pantalla
for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, () => Audio.unlock(), { capture: true, passive: true });
{ const mb = document.createElement('button'); mb.id = 'muteB'; mb.setAttribute('aria-label', 'Silenciar'); const upd = () => { mb.textContent = Audio.on ? '🔊' : '🔇'; }; mb.addEventListener('click', e => { e.stopPropagation(); Audio.unlock(); Audio.on = !Audio.on; Audio.apply(); if (typeof save !== 'undefined') { save.settings.sound = Audio.on ? '1' : '0'; save.settings.music = Audio.on ? '1' : '0'; Audio.musicOn = Audio.on; Audio.apply(); persist(); } upd(); if (Audio.on) Audio.sfxPlay('select', 7); }); document.body.appendChild(mb); window.__muteUpd = upd; setTimeout(upd, 0); }

// v21: capa festiva (confeti y globos en HTML, ligera)
let festN = -1; function fest(n) { if (n === festN) return; festN = n; const F = $('fest'); F.innerHTML = ''; if (!n) return;
  const cols = ['#ff6fa8', '#ffd36b', '#7ee3c4', '#8fd8ff', '#b9a2f7', '#ff9f6a'];
  for (let i = 0; i < (n > 1 ? 36 : 14); i++) { const d = document.createElement('i'); d.className = 'cf'; d.style.cssText = `left:${(i * 37) % 100}%;background:${cols[i % 6]};animation-delay:-${(i * 0.53) % 6}s;animation-duration:${4 + (i % 5)}s;width:${6 + i % 4}px;height:${10 + i % 6}px`; F.appendChild(d); }
  for (let i = 0; i < (n > 1 ? 8 : 5); i++) { const d = document.createElement('b'); d.className = 'bl'; d.style.cssText = `left:${6 + i * 12}%;--c:${cols[i % 6]};animation-delay:-${i * 1.7}s;animation-duration:${9 + i % 4}s`; F.appendChild(d); } }
// ---------------- menu stage (3D) ----------------
const fxEnv = sc => { if (sc && !sc.userData.fxEnv && window.__fxNoche) { sc.userData.fxEnv = 1; window.__fxNoche.mejora3D(THREE, renderer, sc, { hemi: 0, env: .3 }); } }; // noche 25-10: reflejos suaves
const menuScene = new THREE.Scene();
const menuCam = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.5, 900);
{
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color('#bfe3ff') }, bot: { value: new THREE.Color('#ffd6ec') } },
    vertexShader: 'varying vec3 vp; void main(){vp=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 vp; void main(){ float h=clamp(normalize(vp).y*1.8+0.3,0.0,1.0); gl_FragColor=vec4(mix(bot,top,h),1.0);}' }));
  menuScene.add(sky);
  menuScene.add(new THREE.HemisphereLight('#ffffff', '#ffd6ea', 1.3));
  const d = new THREE.DirectionalLight('#fff4e8', 1.5); d.position.set(30, 60, 40); menuScene.add(d);
  const ground = mesh(new THREE.CircleGeometry(300, 48), toon('#c6f2dc', { rim: 0 }), menuScene, [0, 0, 0], [-Math.PI / 2, 0, 0]);
  const plat = mesh(new THREE.CylinderGeometry(6, 6.4, 0.8, 40), toon('#fff4fa'), menuScene, [0, 0.4, 0]); outline(plat, '#d08ab8', 1.02);
  for (let i = 0; i < 24; i++) mesh(new THREE.SphereGeometry(0.28, 8, 6), toon(i % 2 ? '#ff9ec7' : '#b9a2f7', { emissive: '#fff', ei: 0.2 }), menuScene, [Math.cos(i / 24 * 6.28) * 6.2, 0.8, Math.sin(i / 24 * 6.28) * 6.2]);
  // decor: lollipops & gumdrops around
  const cols = ['#ff8fc0', '#7ee3c4', '#b9a2f7', '#ffd36b', '#8fe3f0'];
  for (let i = 0; i < 26; i++) { const a = i / 26 * 6.28 + 0.1, r = 22 + (i % 3) * 9; const g = new THREE.Group(); g.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); menuScene.add(g);
    if (i % 2) { mesh(new THREE.CylinderGeometry(0.2, 0.2, 7, 8), toon('#ffffff'), g, [0, 3.5, 0]); const c = mesh(new THREE.CylinderGeometry(2, 2, 0.5, 24), toon(cols[i % 5]), g, [0, 7.5, 0], [Math.PI / 2, a, 0]); outline(c, '#a06090', 1.04); }
    else { const b = mesh(new THREE.SphereGeometry(2.2, 16, 12), toon(cols[i % 5], { opacity: 0.9, rim: 0.6 }), g, [0, 1.4, 0], null, [1, 0.9, 1]); } }
  menuScene.fog = new THREE.Fog('#ffe3f1', 60, 300);
}
const titleFx = buildTitleFx(menuScene), selBg = buildSelBg(menuScene); let portraits = Object.assign({ __done: true }, Object.fromEntries(CHARS.map(c => [c.id, 'icons/p/' + c.id + '.png?v=24']))); // v23: retratos ya horneados (sin trabajo al pulsar «¡Jugar!») // v18 (v23: se generan en segundo plano)
const stage = new THREE.Group(); menuScene.add(stage);
const menuKarts = []; let charPopT = -9; let previewKart = null, trophyPreview = null;
function setTitleStage() {
  stage.clear(); menuKarts.length = 0;
  CHARS.slice(0, 6).forEach((ch, i) => { const k = makeKart(ch, i); stage.add(k); menuKarts.push({ k, a: i / 6 * Math.PI * 2 }); });
}
function setPreview(ch) {
  stage.clear(); menuKarts.length = 0;
  previewKart = makeKart(ch, 0); previewKart.position.y = 0.8; previewKart.scale.setScalar(1.25); stage.add(previewKart); charPopT = performance.now() / 1000; setSelColor(selBg, ch.color === '#e8f4ff' ? '#9fd0ff' : ch.color);
}

// ---------------- title ----------------
$('tHint').textContent = isTouch ? 'Elige cómo quieres jugar · podrás cambiarlo en Ajustes' : 'Teclado: ← → girar · Espacio derrapar · X objeto · se acelera solo';
btn('tPlay', () => { tryFullscreen(); openChars(); });
// v28: elegir orientación desde el inicio (bloquea si se puede; si no, pide girar)
function playIn(o) { save.settings.orient = o; persist(); syncSettings(); tryFullscreen(); lockOrient(); checkRotate(); openChars(); }
btn('tV', () => playIn('v')); btn('tH', () => playIn('h'));
function markOri() { for (const k of ['v', 'h']) { const e = $('t' + k.toUpperCase()); if (e) e.classList.toggle('sel', save.settings.orient === k); } }
btn('tSet', () => openSettings('title'));

// ---------------- chars ----------------
let cSel = Math.max(0, CHARS.findIndex(c => c.id === save.char));
function openChars() { finishPortraits(CHARS, portraits); show('chars'); renderChars(); renderNow(); }
function renderChars() {
  const ch = CHARS[cSel], un = charUnlocked(ch);
  $('cName').textContent = ch.name; $('cName').style.color = ch.color === '#e8f4ff' ? '#7fb0e0' : '';
  $('cVeh').textContent = '🛞 ' + ch.vname; $('cDesc').textContent = ch.desc;
  for (const [k, id] of [['vel', 'sVel'], ['acel', 'sAcel'], ['man', 'sMan'], ['peso', 'sPeso']]) $(id).style.width = ch.stats[k] * 20 + '%';
  $('cLock').textContent = ch.premium ? '⭐ Premium · 🎁 Prueba gratis (sin pagar nada)' : un ? '' : ch.premium ? '⭐ Piloto premium · ' + ch.price + ' · muy pronto en la tienda' : '🔒 ' + ch.unlock.text;
  $('cInfo').classList.toggle('prem', !!ch.premium); $('cGo').classList.toggle('prem', !!ch.premium);
  $('cGo').textContent = ch.premium ? '🎁 ¡Probar a ' + ch.name + ' gratis!' : un ? '¡Elegir a ' + ch.name + '!' : ch.premium ? '🔒 Premium · ' + ch.price : 'Bloqueado'; $('cGo').style.opacity = un ? 1 : 0.55;
  const L = $('cList'); L.innerHTML = '';
  CHARS.forEach((c, i) => { const b = document.createElement('button'); b.className = 'chip' + (i === cSel ? ' on' : '') + (charUnlocked(c) ? '' : ' lock'); b.innerHTML = `<b style="background:${c.color}"></b>${charUnlocked(c) ? c.name : '🔒 ' + c.name}`; b.onclick = () => { Audio.init(); Audio.sfxPlay('select', i * 2); cSel = i; renderChars(); }; L.appendChild(b); });
  const G = $('cGrid');
  if (!G.children.length) { portraits = finishPortraits(CHARS, portraits);
    CHARS.forEach((c, i) => { const b = document.createElement('button'); b.className = 'cc a-' + ANIMS[i % ANIMS.length] + (c.premium ? ' pr' : ''); b.setAttribute('aria-label', c.name);
      b.innerHTML = (portraits[c.id] ? `<img alt="" src="${portraits[c.id]}" style="animation-delay:-${(i * 0.37).toFixed(2)}s">` : `<b style="display:block;margin:22%;aspect-ratio:1;border-radius:50%;background:${c.color}"></b>`) + '<span class="lk"></span>' + (c.premium ? `<span class="pt">Gratis</span>` : '');
      b.onclick = () => { Audio.init(); Audio.sfxPlay(c.premium ? 'stars' : 'select', i * 3); Audio.sfxPlay('boing'); if (cSel === i && charUnlocked(c)) { $('cGo').click(); return; } cSel = i; renderChars(); }; G.appendChild(b); }); }
  [...G.children].forEach((b, i) => { const un2 = charUnlocked(CHARS[i]); b.classList.toggle('on', i === cSel); b.classList.toggle('lock', !un2); b.querySelector('.lk').textContent = CHARS[i].premium ? '⭐' : un2 ? '' : '🔒'; });
  setPreview(ch);
}
btn('cPrev', () => { cSel = (cSel + CHARS.length - 1) % CHARS.length; renderChars(); });
btn('cNext', () => { cSel = (cSel + 1) % CHARS.length; renderChars(); });
btn('cBack', () => { show('title'); setTitleStage(); });
btn('cGo', () => { const ch = CHARS[cSel]; if (!charUnlocked(ch)) { const l = $('cLock'); l.classList.remove('shake'); void l.offsetWidth; l.classList.add('shake'); return; } save.char = ch.id; persist(); app.playerChar = ch; if (params.get('sala')) openModes(); else openCups(); });

// ---------------- ONLINE: modos, sala de espera y partida sin fin ----------------
const online = new Online(); app.online = online;
const GKEY = 'mracers_online_ghost_v1';
const ghostLoad = () => { try { return JSON.parse(localStorage.getItem(GKEY) || 'null'); } catch (e) { return null; } };
if (!save.nick) save.nick = ['Piloto', 'Mochi', 'Gominola', 'Nube'][Math.floor(Math.random() * 4)] + Math.floor(10 + Math.random() * 89);
function openModes() {
  show('modes'); $('mName').value = save.nick; const g = ghostLoad(), sd = daySeed();
  const cup = makeEndlessCup(sd);
  $('mDay').textContent = '🗺️ Pista del día: ' + cup.name;
  $('mRec').textContent = g && g.seed === sd ? '👻 Tu récord de hoy: ' + Math.round(g.dist) + ' m (te sale como fantasma)' : '👻 Aún no tienes récord hoy';
  stage.clear(); menuKarts.length = 0; previewKart = makeKart(app.playerChar || CHARS[0], 0); previewKart.position.y = 0.8; previewKart.scale.setScalar(1.2); stage.add(previewKart);
}
$('mName').addEventListener('input', () => { save.nick = $('mName').value.replace(/[<>]/g, '').slice(0, 14) || 'Piloto'; persist(); });
const meInfo = () => ({ name: (save.nick || 'Piloto').slice(0, 14), ch: (app.playerChar || CHARS[0]).id });
btn('mSolo', () => { app.mode = 'solo'; startEndless(soloMatch(meInfo())); });
btn('mOnline', () => { app.mode = 'online'; openLobby(); });
btn('mBack', () => openCups());
btn('uOla', () => openModes());
function openLobby() {
  show('lobby'); $('lList').innerHTML = ''; $('lInfo').textContent = 'Conectando…';
  online.wait(meInfo(), {
    onUpdate: ({ list, host, left, peers }) => {
      $('lList').innerHTML = list.map(p => { const c = CHARS.find(c => c.id === p.ch) || CHARS[0]; return `<div class="lp${p.me ? ' me' : ''}"><b style="background:${c.color}"></b>${esc(p.name)}${p.me ? ' (tú)' : ''}</div>`; }).join('') + '<div class="lp ghost">+ ' + (MAX_PLAYERS - list.length) + ' más…</div>';
      $('lInfo').textContent = list.length > 1 ? `${list.length} pilotos · empezamos en ${Math.ceil(left)} s` : `Buscando pilotos… ${Math.ceil(left)} s (si no llega nadie, juegas contra bots)`;
    },
    onStart: m => startEndless(m),
  }).catch(e => { console.warn(e); app.ui.toast('Sin conexión: juegas contra bots'); startEndless(soloMatch(meInfo())); });
}
btn('lCancel', () => { online.close(); openModes(); });
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function startEndless(match) {
  if (app.race) { app.race.dispose(); app.race = null; }
  app.match = match; app.cup = makeEndlessCup(match.seed);
  $('loading').style.display = 'flex'; $('loading').textContent = 'Generando la ' + app.cup.name + '…';
  setTimeout(() => {
    const t0 = performance.now();
    app.race = new EndlessRace(app, { seed: match.seed, roster: match.roster, me: match.me, quality: { hi: qualityHi }, simBots: match.simBots, ghost: ghostLoad() });
    app.buildMs = performance.now() - t0;
    if (match.online) online.attach(app.race);
    shadowLock = false; applyPR(); try { app.race.fx.prewarm(renderer, app.race.camera); renderer.compile(app.race.scene, app.race.camera); } catch (e) {} $('loading').style.display = 'none';
    show(null); $('startHint').style.display = 'block'; $('startHint').innerHTML = (isTouch ? 'Toca <b>DERRAPE</b>' : 'Pulsa <b>Espacio</b>') + ' al «¡YA!» para salir con turbo · ¡huye de la nata!';
    app.ui.toast(match.online ? (match.humans > 1 ? `¡Online! ${match.humans} pilotos de verdad` : '¡Online!') : 'Partida contra bots', '#ffffff');
    Audio.init(); Audio.playSong(app.cup.music, match.seed % 97); Audio.engineStart();
  }, 30);
}
function showEndResults(order, stats) {
  Audio.stopSong(); show('results');
  const me = order.find(o => o.isPlayer), g = ghostLoad(); let rec = false;
  if (me && (!g || g.seed !== stats.seed || me.dist > g.dist)) { rec = true; try { localStorage.setItem(GKEY, JSON.stringify({ seed: stats.seed, dist: me.dist, ch: me.ch.id, path: stats.ghost })); } catch (e) {} }
  $('rTitle').textContent = (me && me.place === 1 ? '¡Has llegado más lejos que nadie!' : `Has quedado ${me ? me.place : '-'}º`) + (rec ? ' · ¡Nuevo récord!' : '');
  let h = '<tr><td></td><td>Piloto</td><td class="n">Distancia</td><td class="n"></td></tr>';
  order.forEach((o, i) => { h += `<tr class="${o.isPlayer ? 'me' : ''}" style="animation-delay:${(i * 0.07).toFixed(2)}s"><td>${['🥇', '🥈', '🥉'][i] || (i + 1) + 'º'}</td><td><span class="dot" style="background:${o.ch.color}"></span>${esc(o.name)}${o.isPlayer ? ' (tú)' : ''}</td><td class="n">${Math.round(o.dist).toLocaleString('es-ES')} m</td><td class="n">${o.out ? '🍦 ' + fmtS(o.time) : '🏁'}</td></tr>`; });
  $('rTable').innerHTML = h; $('rNext').textContent = app.mode === 'online' ? '🌐 Otra online' : '🔁 Otra partida'; $('rMenu').style.display = '';
}
const fmtS = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
btn('rMenu', () => { if (app.race) { app.race.dispose(); app.race = null; } online.stopRace(); online.close(); openModes(); });

// ---------------- cups ----------------
let uSel = 0;
const trophySVG = (col, dim) => `<svg viewBox="0 0 64 64"><path d="M18 8h28v10c0 10-6 18-14 18S18 28 18 18z" fill="${col}" stroke="#5a3a6e" stroke-width="2.5"/><path d="M18 12H9c0 9 5 14 11 14M46 12h9c0 9-5 14-11 14" fill="none" stroke="${col}" stroke-width="4"/><rect x="28" y="36" width="8" height="10" fill="${col}" stroke="#5a3a6e" stroke-width="2"/><rect x="18" y="46" width="28" height="9" rx="3" fill="#fff4fa" stroke="#5a3a6e" stroke-width="2.5"/>${dim ? '' : '<path d="M32 14l2.4 5 5.4.6-4 3.7 1.1 5.3-4.9-2.7-4.9 2.7 1.1-5.3-4-3.7 5.4-.6z" fill="#fff" opacity=".9"/>'}</svg>`;
const TIER = ['🥇 Oro', '🥈 Plata', '🥉 Bronce'];
let carousel = null, cupBusy = false;
function cupInfo() { const c = CUPS[uSel], un = cupUnlocked(c), tr = save.trophies[c.id];
  $('cupName').textContent = c.name; $('cupName').style.setProperty('--cc', un ? c.color : '#b8a8d0');
  $('cupTrack').innerHTML = '<div class="rlist">' + raceNames(c).map((n, i) => `<span><b>${i + 1}</b>${n}</span>`).join('') + '</div>' + (un ? (tr != null ? `<span class="pill gold">${TIER[tr]}</span>` : '<span class="pill">Sin trofeo</span>') : `<span class="pill lk">🔒 ${c.unlock.text}</span>`);
  [...$('cupGrid').children].forEach((d, i) => d.classList.toggle('sel', i === uSel));
  $('uGo').classList.toggle('locked', !un); $('uGo').innerHTML = un ? '<span>¡A correr!</span>' : '<span>🔒 Bloqueada</span>';
  $('cupPanel').classList.remove('swap'); void $('cupPanel').offsetWidth; $('cupPanel').classList.add('swap');
}
function setCup(i) { if (i === uSel || cupBusy) return; uSel = i; carousel.select(i); cupInfo(); }
function openCups() {
  if (app.match) { online.stopRace(); online.close(); } app.match = null; app.mode = null;
  if (!carousel) carousel = createCupCarousel(renderer, CUPS);
  cupBusy = false; show('cups');
  if (!cupUnlocked(CUPS[uSel])) uSel = 0;
  const G = $('cupGrid'); G.innerHTML = '';
  CUPS.forEach((c, i) => { const un = cupUnlocked(c), tr = save.trophies[c.id];
    const d = document.createElement('button'); d.className = 'ccard' + (un ? '' : ' lock'); d.style.setProperty('--cc', c.color); d.style.animationDelay = (i * 0.05) + 's';
    d.innerHTML = `<div class="cic">${trophySVG(un ? c.trophy : '#8f80ad', !un)}${un ? '' : '<b class="lki">🔒</b>'}${un && tr != null ? `<b class="md">${['🥇', '🥈', '🥉'][tr]}</b>` : ''}</div><div class="cn">${c.name.replace('Copa ', '')}</div>`;
    d.addEventListener('click', () => { Audio.init(); Audio.sfxPlay('select', i * 4); Audio.sfxPlay('swoosh'); setCup(i); }); G.appendChild(d); });
  carousel.setChar(app.playerChar || CHARS[0]);
  carousel.setState(uSel, c => ({ unlocked: cupUnlocked(c), tier: save.trophies[c.id] }));
  cupInfo();
  stage.clear(); menuKarts.length = 0; previewKart = null; trophyPreview = null;
}
btn('uBack', () => { if (!cupBusy) openChars(); });
btn('uGo', () => { const c = CUPS[uSel]; if (cupBusy) return; if (!cupUnlocked(c)) { app.ui.toast('🔒 ' + c.unlock.text); return; }
  cupBusy = true; Audio.sfxPlay('boost'); $('cups').classList.add('going'); carousel.choose(() => { $('cups').classList.remove('going'); startCup(c); }); });

// ---------------- cup flow ----------------
function startCup(cup) {
  app.cup = cup; app.raceNo = 0; app.points = {}; app.lastOrder = null;
  const others = CHARS.filter(c => c !== app.playerChar && !c.premium).sort(() => Math.random() - 0.5).slice(0, CONFIG.racers - 1);
  app.rivals = others; for (const c of [app.playerChar, ...others]) app.points[c.id] = 0;
  startRace();
}
function startRace() {
  if (app.race) { app.race.dispose(); app.race = null; }
  const all = [app.playerChar, ...app.rivals];
  let grid;
  if (!app.lastOrder) grid = [...app.rivals, app.playerChar]; // player starts last in race 1
  else grid = app.lastOrder.slice().reverse();
  $('loading').style.display = 'flex'; const rc = cupForRace(app.cup, app.raceNo); $('loading').textContent = 'Preparando ' + rc.track + '…';
  setTimeout(() => {
    window.__mrLod = prLv >= 5 ? 0.35 : prLv >= 3 ? 0.55 : prLv >= 2 ? 0.7 : 0.85; app.race = new Race(app, { cup: rc, reverse: app.raceNo === 1, playerChar: app.playerChar, rivals: app.rivals, grid, cupIndex: CUPS.indexOf(app.cup), quality: { hi: qualityHi } });
    try { app.race.mergedMeshes = mergeStatic(app.race); } catch (e) {} shadowLock = false; applyPR(); try { app.race.fx.prewarm(renderer, app.race.camera); renderer.compile(app.race.scene, app.race.camera); } catch (e) {} $('loading').style.display = 'none';
    show(null); $('startHint').style.display = 'block'; $('startHint').innerHTML = isTouch ? 'Toca <b>DERRAPE</b> justo al «¡YA!» para salir con turbo' : 'Pulsa <b>Espacio</b> justo al «¡YA!» para salir con turbo';
    app.ui.toast(app.cup.name + ' · Carrera ' + (app.raceNo + 1) + '/' + RACES_PER_CUP + ': ' + raceNames(app.cup)[app.raceNo], '#ffffff');
    Audio.init(); Audio.playSong(app.cup.music, CUPS.indexOf(app.cup) * 7 + app.raceNo + 1); Audio.engineStart();
    buildMinimap();
  }, 30);
}
app.onRaceEnd = (order, stats) => {
  if (app.race && app.race.endless) { app.lastResults = order; app.lastStats = stats; setTimeout(() => showEndResults(order, stats), 400); return; }
  app.lastOrder = order.map(o => o.ch);
  order.forEach((o, i) => { o.pts = CONFIG.points[i]; app.points[o.ch.id] += o.pts; });
  app.lastStats = stats; app.lastResults = order;
  setTimeout(() => showResults(order), 400);
};
const fmtT = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;
function showResults(order) {
  Audio.stopSong(); show('results');
  const last = app.raceNo >= RACES_PER_CUP - 1;
  $('rTitle').textContent = `${app.cup.name} · Carrera ${app.raceNo + 1}/${RACES_PER_CUP}`;
  const byPts = Object.entries(app.points).sort((a, b) => b[1] - a[1]);
  let h = '<tr><td></td><td>Piloto</td><td class="n">Tiempo</td><td class="n">+Pts</td><td class="n">Total</td></tr>';
  order.forEach((o, i) => { h += `<tr class="${o.isPlayer ? 'me' : ''}"><td>${i + 1}º</td><td><span class="dot" style="background:${o.ch.color}"></span>${o.ch.name}${o.isPlayer ? ' (tú)' : ''}</td><td class="n">${fmtT(o.time)}</td><td class="n">+${o.pts}</td><td class="n">${app.points[o.ch.id]}</td></tr>`; });
  $('rTable').innerHTML = h;
  $('rNext').textContent = last ? '🏆 Ver podio' : 'Siguiente carrera ›';
}
btn('rNext', () => { if (app.match) { if (app.race) { app.race.dispose(); app.race = null; } online.stopRace(); if (app.mode === 'online') openLobby(); else startEndless(soloMatch(meInfo())); return; } if (app.raceNo >= RACES_PER_CUP - 1) showPodium(); else { app.raceNo++; startRace(); } });

// ---------------- podium (v11) ----------------
const podCam = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.5, 900);
let podData = null, podBand = [0.3, 0.85], podBandT = 0;
function podMeasure() { const h = innerHeight, hd = $('podHead').getBoundingClientRect(), rw = $('podBtns').getBoundingClientRect(); podBand = [Math.min(0.6, (hd.bottom + 6) / h), Math.max(0.5, (rw.top - 6) / h)]; }
function showPodium() {
  if (app.race) { app.race.dispose(); app.race = null; }
  const ranking = Object.entries(app.points).sort((a, b) => b[1] - a[1]).map(([id, p]) => ({ ch: CHARS.find(c => c.id === id), p }));
  const myPlace = ranking.findIndex(r => r.ch === app.playerChar);
  const cup = app.cup;
  const tier = myPlace <= 2 ? myPlace : -1;
  podData = { p: buildPodium(cup, ranking, myPlace, tier) };
  podCam.aspect = innerWidth / innerHeight;
  $('podium').classList.toggle('win', tier === 0); $('podium').classList.toggle('lose', tier < 0);
  $('podBadge').textContent = tier === 0 ? '¡VICTORIA!' : tier > 0 ? '¡AL PODIO!' : '¡BUENA CARRERA!';
  show('podium');
  if (tier >= 0) {
    const prev = save.trophies[cup.id]; const newUnlocks = [];
    const beforeC = CUPS.filter(cupUnlocked).map(c => c.id), beforeCh = CHARS.filter(charUnlocked).map(c => c.id);
    if (prev == null || tier < prev) save.trophies[cup.id] = tier; persist();
    CUPS.filter(cupUnlocked).forEach(c => { if (!beforeC.includes(c.id)) newUnlocks.push('🏁 ' + c.name); });
    CHARS.filter(charUnlocked).forEach(c => { if (!beforeCh.includes(c.id)) newUnlocks.push('⭐ ' + c.name); });
    $('podTitle').textContent = `¡${cup.name}!`; $('podPlace').textContent = `${TIER[tier]} · ${myPlace + 1}º con ${ranking[myPlace].p} puntos`;
    $('podSub').textContent = newUnlocks.length ? '¡Desbloqueado: ' + newUnlocks.join(' · ') + '!' : '¡Copa guardada en tu vitrina!';
    Audio.sfxPlay(tier === 0 ? 'victory' : 'fanfare');
  } else {
    $('podTitle').textContent = cup.name; $('podPlace').textContent = `Has quedado ${myPlace + 1}º con ${ranking[myPlace].p} puntos`;
    $('podSub').textContent = '¡Sube al podio (top 3) para ganar la copa!'; Audio.sfxPlay('finish');
  }
  app.lastPodium = { ranking: ranking.map(r => r.ch.id), myPlace, tier };
  requestAnimationFrame(podMeasure); podBandT = 0;
}
btn('pOk', () => { podData = null; openCups(); });
btn('pRetry', () => { podData = null; startCup(app.cup); });

// ---------------- settings ----------------
let setReturn = 'title';
function openSettings(from) { setReturn = from; show('settings'); syncSettings(); }
function syncSettings() { for (const seg of document.querySelectorAll('.seg')) for (const b of seg.children) b.classList.toggle('on', save.settings[seg.dataset.k] === b.dataset.v); applySettings(); }
for (const seg of document.querySelectorAll('.seg')) for (const b of seg.children) b.addEventListener('click', () => {
  Audio.init(); save.settings[seg.dataset.k] = b.dataset.v; persist(); syncSettings(); Audio.sfxPlay('click');
  if (seg.dataset.k === 'controls' && b.dataset.v === 'tilt') requestTilt();
  if (seg.dataset.k === 'orient') { lockOrient(); checkRotate(); }
  if (seg.dataset.k === 'quality') { qualityHi = b.dataset.v === 'alta' || (b.dataset.v === 'auto' && !isTouch); prLv = prBase(); applyPR(); }
});
function applySettings() {
  Audio.on = save.settings.sound === '1'; Audio.musicOn = save.settings.music === '1'; Audio.engineOn = save.settings.engine === '1'; if (!Audio.engineOn) Audio.engineStop(); else if (app.race && app.state === 'race') Audio.engineStart(); Audio.apply(); if (window.__muteUpd) window.__muteUpd();
  $('fps').style.display = save.settings.fps === '1' ? 'block' : 'none';
  app.autoDrift = save.settings.autoDrift !== '0';
  const c = save.settings.controls;
  $('bL').style.display = $('bR').style.display = c === 'botones' ? 'flex' : 'none';
  $('stick').style.display = c === 'stick' ? 'flex' : 'none';
  $('tiltHint').style.display = c === 'tilt' ? 'block' : 'none';
}
btn('sOk', () => { if (setReturn === 'pause') show('pause'); else if (setReturn === 'title') { show('title'); } else show(setReturn); });

// ---------------- pause ----------------
function pause() { if (!app.race || app.state !== 'race') return; show('pause'); $('paRe').style.display = app.mode === 'online' ? 'none' : ''; $('paNote').style.display = app.mode === 'online' ? '' : 'none'; Audio.stopSong(); Audio.engineSet(0); }
$('pauseB').addEventListener('pointerdown', e => { e.stopPropagation(); Audio.init(); pause(); });
btn('paGo', () => { show(null); Audio.playSong(app.cup.music, app.match ? app.match.seed % 97 : CUPS.indexOf(app.cup) * 7 + app.raceNo + 1); });
btn('paRe', () => { if (app.match && app.mode !== 'online') startEndless(soloMatch(meInfo())); else if (!app.match) startRace(); });
btn('paSet', () => openSettings('pause'));
btn('paQuit', () => { if (app.race) { app.race.dispose(); app.race = null; } Audio.stopSong(); if (app.match) { online.stopRace(); online.close(); openModes(); } else openCups(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

// ---------------- input ----------------
const keys = {}; const inp = { steer: 0, brake: false, drift: false, item: false };
let driftPrev = false, itemPrev = false;
addEventListener('keydown', e => {
  if (e.repeat) { if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); return; }
  keys[e.code] = true; Audio.init();
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (app.race && (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW')) app.race.pressAction();
  if ((e.code === 'KeyP' || e.code === 'Escape') && app.state === 'race') pause();
  else if ((e.code === 'KeyP' || e.code === 'Escape') && app.state === 'pause') { $('paGo').click(); }
});
addEventListener('keyup', e => { keys[e.code] = false; });
// touch buttons
const held = {};
function holdBtn(id, name) {
  const el = $(id);
  el.addEventListener('pointerdown', e => { e.preventDefault(); Audio.init(); el.setPointerCapture(e.pointerId); held[name] = true; el.classList.add('down'); if (name === 'drift' && app.race) app.race.pressAction(); });
  const up = () => { held[name] = false; el.classList.remove('down'); };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
}
holdBtn('bL', 'left'); holdBtn('bR', 'right'); holdBtn('bD', 'drift'); holdBtn('bI', 'item'); holdBtn('bB', 'brake');
// stick
let stickX = 0; { const st = $('stick'), kn = $('knob'); let id = null;
  const mv = e => { const r = st.getBoundingClientRect(); const dx = e.clientX - (r.left + r.width / 2); stickX = Math.max(-1, Math.min(1, dx / (r.width * 0.4))); kn.style.transform = `translateX(${stickX * r.width * 0.32}px)`; };
  st.addEventListener('pointerdown', e => { id = e.pointerId; st.setPointerCapture(id); mv(e); });
  st.addEventListener('pointermove', e => { if (e.pointerId === id) mv(e); });
  const end = () => { id = null; stickX = 0; kn.style.transform = ''; }; st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end); }
// tilt
let tiltX = 0;
function requestTilt() { const D = window.DeviceOrientationEvent; if (D && typeof D.requestPermission === 'function') D.requestPermission().catch(() => {}); }
addEventListener('deviceorientation', e => { const ang = (screen.orientation && screen.orientation.angle) || window.orientation || 0; let v = 0;
  if (ang === 90) v = e.beta; else if (ang === -90 || ang === 270) v = -e.beta; else v = e.gamma; tiltX = Math.max(-1, Math.min(1, (v || 0) / 22)); });
// canvas tap = skip intro
$('gl').addEventListener('pointerdown', () => { Audio.init(); if (app.race && app.race.state === 'intro') app.skipIntro = true; });
function readInput() {
  let steer = 0;
  if (keys.ArrowLeft || keys.KeyA) steer -= 1; if (keys.ArrowRight || keys.KeyD) steer += 1;
  const c = save.settings.controls;
  if (held.left) steer -= 1; if (held.right) steer += 1;
  if (c === 'stick') steer += stickX; if (c === 'tilt' && isTouch) steer += tiltX;
  steer = Math.max(-1, Math.min(1, steer));
  // NOTE: three.js world: our "right" vector is (-fz,0,fx); yaw increases turning to the left visually -> invert
  const drift = !!(keys.Space || keys.ShiftLeft || keys.ShiftRight || held.drift);
  const item = !!(keys.KeyX || keys.KeyE || keys.Enter || keys.KeyK || held.item);
  const r = app.race.input;
  r.steer = -steer; r.brake = !!(keys.ArrowDown || keys.KeyS || held.brake); r.throttle = 1;
  r.drift = drift; r.driftEdge = drift && !driftPrev; r.itemEdge = item && !itemPrev; driftPrev = drift; itemPrev = item;
}

// ---------------- HUD ----------------
const fxLines = Array.from({ length: 42 }, () => ({ a: Math.random() * 6.283, r: Math.random(), s: 0.5 + Math.random() }));
function drawFx(R, P) {
  const cv = $('fx'), w = innerWidth, h = innerHeight; if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const c = cv.getContext('2d'); c.clearRect(0, 0, w, h);
  const sp = Math.max(0, P.fs - 26) / 26 + (P.boostT > 0 ? 0.6 : 0) + R.kick, I = Math.min(1.4, sp); if (I <= 0.02 || R.state !== 'race') return;
  const cx = w / 2, cy = h * 0.45, maxR = Math.hypot(w, h) * 0.55;
  c.lineCap = 'round';
  for (const L of fxLines) { L.r += 0.04 * L.s * (1 + I); if (L.r > 1) { L.r = 0; L.a = Math.random() * 6.283; L.s = 0.5 + Math.random(); }
    const r0 = maxR * (0.55 + L.r * 0.45), r1 = r0 + maxR * 0.12 * I * L.s, ca = Math.cos(L.a), sa = Math.sin(L.a);
    c.strokeStyle = P.boostT > 0 ? `rgba(255,236,170,${0.55 * I})` : `rgba(255,255,255,${0.42 * I})`; c.lineWidth = 2 + 2 * L.s;
    c.beginPath(); c.moveTo(cx + ca * r0, cy + sa * r0 * 0.75); c.lineTo(cx + ca * r1, cy + sa * r1 * 0.75); c.stroke(); }
}
let miniPts = null, miniBox = null;
function buildMinimap() {
  const T = app.race.track; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const s of T.S) { x0 = Math.min(x0, s.p.x); x1 = Math.max(x1, s.p.x); z0 = Math.min(z0, s.p.z); z1 = Math.max(z1, s.p.z); }
  const sc = 220 / Math.max(x1 - x0, z1 - z0); miniBox = { x0, z0, sc, ox: (260 - (x1 - x0) * sc) / 2, oz: (260 - (z1 - z0) * sc) / 2 };
  miniPts = T.S.filter((_, i) => i % 3 === 0).map(s => mm(s.p.x, s.p.z));
}
const mm = (x, z) => [miniBox.ox + (x - miniBox.x0) * miniBox.sc, miniBox.oz + (z - miniBox.z0) * miniBox.sc];
function drawEndlessHUD(dt) {
  const R = app.race, P = R.player;
  $('hPos').innerHTML = `${P.place}<small>º/${R.karts.length}</small>`; $('hPos').classList.toggle('p1', P.place === 1);
  $('hLap').firstChild.textContent = `${Math.max(0, Math.round(P.best)).toLocaleString('es-ES')} m`;
  $('hTime').textContent = R.state === 'race' || R.state === 'finish' ? '⏱ ' + fmtS(Math.max(0, MATCH_T - R.raceT)) : '⏱ 1:00';
  $('hPips').innerHTML = '';
  const kmh = Math.max(0, Math.round(P.fs * 3.2)); $('hKmh').textContent = kmh; $('hBar').style.width = Math.min(100, kmh / 2.2) + '%';
  const lv = P.driftDir ? (P.driftT > 1.6 ? 3 : P.driftT > 1.0 ? 2 : P.driftT > 0.5 ? 1 : 0) : 0, fr = P.driftDir ? Math.min(1, P.driftT / 1.6) : 0, rg = $('dRing'); rg.style.strokeDashoffset = 283 * (1 - fr); rg.style.stroke = ['#ffffff', '#7fd8ff', '#ffb36b', '#ff7fe0'][lv];
  const bd = $('bD'); for (let i = 1; i <= 3; i++) bd.classList.toggle('l' + i, lv === i);
  $('flash').style.opacity = Math.min(1, R.kick * 0.9 + (P.boostT > 0 ? 0.12 : 0));
  drawFx(R, P);
  const hi = $('hItem');
  if (P.rollT > 0) { const k = ['turbo', 'seta', 'escudo', 'iman', 'tiburon', 'estrella', 'aladelta', 'cohete', 'alfombra', 'chicle']; hi.textContent = ITEMS[k[Math.floor(R.time * 14) % k.length]].icon; hi.classList.add('roll'); $('hItemName').textContent = ''; }
  else { hi.classList.remove('roll'); hi.textContent = P.item ? ITEMS[P.item].icon : ''; $('hItemName').textContent = P.item ? ITEMS[P.item].name : ''; }
  $('bI').textContent = P.item && P.rollT <= 0 ? ITEMS[P.item].icon : '·';
  $('blind').style.opacity = 0;
  const gap = R.waveGap, w = $('wrong');
  if (R.spectating) { w.style.display = 'block'; w.textContent = '👀 Mirando a ' + R.spectating.name; w.classList.add('spec'); }
  else if (gap < 40 && R.state === 'race') { w.style.display = 'block'; w.classList.remove('spec'); w.textContent = `🍦 ¡La ola a ${Math.max(0, Math.round(gap))} m!`; }
  else w.style.display = 'none';
  $('waveV').style.opacity = R.state === 'race' && !P.out ? Math.max(0, Math.min(0.85, (45 - gap) / 40)) : 0;
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').style.opacity = 0; }
  // marcador: clasificación por distancia + la ola
  const c = $('mini').getContext('2d'); c.clearRect(0, 0, 260, 260);
  c.fillStyle = 'rgba(255,255,255,.78)'; c.beginPath(); c.roundRect(2, 2, 256, 256, 30); c.fill();
  const K = R.karts.slice().sort((a, b) => a.place - b.place); c.textBaseline = 'middle';
  K.forEach((k, i) => { const y = 26 + i * 34; c.fillStyle = k.isPlayer ? 'rgba(255,143,192,.35)' : 'transparent'; if (k.isPlayer) { c.beginPath(); c.roundRect(8, y - 16, 244, 32, 14); c.fill(); }
    c.fillStyle = k.ch.color; c.beginPath(); c.arc(26, y, 10, 0, 7); c.fill(); c.lineWidth = 3; c.strokeStyle = '#ffffff'; c.stroke();
    c.font = '700 22px Fredoka, sans-serif'; c.fillStyle = k.out ? '#b9a2c8' : '#6a4b8a'; c.textAlign = 'left'; let nm = (k.out ? '🍦' : '') + (k.isPlayer ? 'Tú' : k.name); while (c.measureText(nm).width > 128 && nm.length > 3) nm = nm.slice(0, -1);
    c.fillText(nm, 44, y + 1); c.textAlign = 'right'; c.fillText(Math.max(0, Math.round(k.best)) + ' m', 248, y + 1); });
  const gy = 236; c.fillStyle = '#ff8fc0'; c.beginPath(); c.roundRect(10, gy - 12, 240, 24, 12); c.fill(); c.fillStyle = '#ffffff'; c.font = '700 18px Fredoka, sans-serif'; c.textAlign = 'center';
  c.fillText(P.out ? '🍦 Te ha pillado la ola' : `🍦 ola a ${Math.max(0, Math.round(gap < 900 ? gap : P.best - R.wave.d))} m`, 130, gy + 1);
}
function drawHUD(dt) {
  if (app.race.endless) return drawEndlessHUD(dt);
  const R = app.race, P = R.player;
  $('hPos').innerHTML = `${P.place}<small>º/${R.karts.length}</small>`;
  $('hLap').firstChild.textContent = `Vuelta ${Math.min(CONFIG.laps, Math.max(1, P.lap + 1))}/${CONFIG.laps}`;
  $('hTime').textContent = fmtT(R.raceT);
  $('hPos').classList.toggle('p1', P.place === 1);
  const pip = $('hPips'); if (pip.childElementCount !== CONFIG.laps) pip.innerHTML = '<b></b>'.repeat(CONFIG.laps); [...pip.children].forEach((b, i) => b.classList.toggle('on', i <= P.lap));
  const kmh = Math.max(0, Math.round(P.fs * 3.2)); $('hKmh').textContent = kmh; $('hBar').style.width = Math.min(100, kmh / 2.2) + '%';
  // drift charge ring
  const DLm = [0.5, 1.0, 1.6], lv = P.driftDir ? (P.driftT > 1.6 ? 3 : P.driftT > 1.0 ? 2 : P.driftT > 0.5 ? 1 : 0) : 0;
  const fr = P.driftDir ? Math.min(1, P.driftT / 1.6) : 0, rg = $('dRing'); rg.style.strokeDashoffset = 283 * (1 - fr); rg.style.stroke = ['#ffffff', '#7fd8ff', '#ffb36b', '#ff7fe0'][lv];
  const bd = $('bD'); for (let i = 1; i <= 3; i++) bd.classList.toggle('l' + i, lv === i);
  $('flash').style.opacity = Math.min(1, R.kick * 0.9 + (P.boostT > 0 ? 0.12 : 0));
  drawFx(R, P);
  const hi = $('hItem');
  if (P.rollT > 0) { const k = Object.keys(ITEMS); hi.textContent = ITEMS[k[Math.floor(R.time * 14) % k.length]].icon; hi.classList.add('roll'); $('hItemName').textContent = ''; }
  else { hi.classList.remove('roll'); hi.textContent = P.item ? ITEMS[P.item].icon : ''; $('hItemName').textContent = P.item ? ITEMS[P.item].name : ''; }
  $('bI').textContent = P.item && P.rollT <= 0 ? ITEMS[P.item].icon : '·';
  $('blind').style.opacity = P.blindT > 0 ? Math.min(1, P.blindT) * 0.95 : 0;
  $('wrong').style.display = P.wrongT > 1 ? 'block' : 'none';
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').style.opacity = 0; }
  // minimap
  const c = $('mini').getContext('2d'); c.clearRect(0, 0, 260, 260);
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.beginPath(); miniPts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
  c.strokeStyle = 'rgba(120,60,140,.55)'; c.lineWidth = 16; c.stroke(); c.strokeStyle = '#ffffff'; c.lineWidth = 9; c.stroke();
  for (const sc of R.track.shortcuts) { c.beginPath(); sc.pts.forEach((p, i) => { const [x, y] = mm(p.x, p.z); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 4; c.setLineDash([4, 5]); c.stroke(); c.setLineDash([]); }
  const s0 = mm(R.track.S[0].p.x, R.track.S[0].p.z); c.fillStyle = '#3a2050'; c.fillRect(s0[0] - 6, s0[1] - 2, 12, 4);
  for (const k of R.karts.slice().sort((a, b) => (a.isPlayer ? 1 : 0) - (b.isPlayer ? 1 : 0))) { const [x, y] = mm(k.pos.x, k.pos.z); c.beginPath(); c.arc(x, y, k.isPlayer ? 9 : 6, 0, 7); c.fillStyle = k.ch.color; c.fill(); c.lineWidth = k.isPlayer ? 4 : 2; c.strokeStyle = k.isPlayer ? '#e0609f' : '#ffffff'; c.stroke(); }
  for (const p of R.projs) { const [x, y] = mm(p.pos.x, p.pos.z); c.fillStyle = p.type === 'misil' ? '#ff3f7a' : '#ff6fa0'; c.fillRect(x - 3, y - 3, 6, 6); }
}

// ---------------- loop ----------------
let last = performance.now(), acc = 0, fpsAcc = 0, fpsN = 0, fps = 60, lowFpsT = 0;
const STEP = 1 / 60;
function frame(now) {
  requestAnimationFrame(frame); step(now);
}
// v23: dibujar un fotograma YA (tras cambiar de pantalla o de tamaño) para que nunca se vea el lienzo en negro
function renderNow() { try { step(performance.now()); } catch (e) {} }
function step(now) {
  let dt = Math.min(0.1, (now - last) / 1000); last = now;
  fpsAcc += dt; fpsN++; if (fpsAcc >= 1) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; $('fps').textContent = fps.toFixed(0) + ' fps · ' + Math.min(devicePixelRatio, PRL[prLv]).toFixed(2) + '×';
    if (app.state === 'race' && save.settings.quality === 'auto' && app.race && app.race.state === 'race') { lowFpsT = fps < 42 ? lowFpsT + 1 : 0;
      if (lowFpsT >= 3 && prLv < PRL.length - 1) { lowFpsT = 0; prGood = 0; prLv++; applyPR(); if (!prWarned && prLv >= 5) { prWarned = true; app.ui.toast('Calidad ajustada para ir más fluido'); } }
      else if (fps > 57) { if (++prGood >= 6 && prLv > (isTouch ? 1 : 0)) { prGood = 0; prLv--; applyPR(); } } else prGood = 0; } }
  const t = now / 1000;
  if (app.state === 'pause' && app.race && app.mode === 'online' && app.match) { acc += dt; let n = 0; app.race.input.steer = 0; app.race.input.drift = false; while (acc >= STEP && n < 6) { app.race.update(STEP); acc -= STEP; n++; } if (app.race) renderer.render(app.race.scene, app.race.camera); return; }
  if (app.state === 'race' && app.race) {
    readInput();
    acc += dt * app.speed; let n = 0;
    while (acc >= STEP && n < 6 * app.speed) { app.race.update(STEP); acc -= STEP; n++; }
    if (app.state === 'race' && app.race) { drawHUD(dt); fxEnv(app.race.scene); renderer.render(app.race.scene, app.race.camera); }
    return;
  }
  if (app.state === 'podium' && podData) {
    const P = podData.p; podBandT -= dt; if (podBandT <= 0) { podMeasure(); podBandT = 0.5; }
    P.update(Math.min(dt, 0.05), { boomSfx: P.win ? () => Audio.sfxPlay('firework') : null });
    P.fit(podCam, podBand[0], podBand[1], t); renderer.render(P.scene, podCam); return;
  }
  if (app.state === 'results' && app.race) { acc += dt; let n = 0; while (acc >= STEP && n < 4) { app.race.update(STEP); acc -= STEP; n++; } renderer.render(app.race.scene, app.race.camera); return; }
  if (app.state === 'cups' && carousel) { carousel.update(dt, t); renderer.render(carousel.scene, carousel.cam); return; }
  // menus
  if (app.state === 'title' || (app.state === 'settings' && setReturn === 'title')) {
    menuKarts.forEach((m, i) => { const a = m.a + t * 0.35; m.k.position.set(Math.cos(a) * 4.2, 0.8 + Math.abs(Math.sin(t * 3 + i)) * 0.15, Math.sin(a) * 4.2); m.k.rotation.y = -a; animKart(m.k, t, 20); });
    if (innerWidth < innerHeight) { menuCam.position.set(Math.sin(t * 0.1) * 4, 4.2, 21); menuCam.lookAt(0, 4.2, 0); } else { menuCam.position.set(Math.sin(t * 0.1) * 4, 5.2, 17); menuCam.lookAt(0, 2.9, 0); } // v18: se ve el cielo, castillo, arcoíris y fuegos
  } else {
    if (previewKart && app.state === 'chars') { previewKart.rotation.y = Math.sin(t * 0.8) * 0.6 + 0.25; animKart(previewKart, t, 15, Math.sin(t * 1.3) > -0.2 ? 'happy' : ''); animPreview(previewKart, t, cSel); }
    else if (previewKart) { previewKart.rotation.y = 0.5 + Math.sin(t * 0.6) * 0.3; const pe = performance.now() / 1000 - charPopT; animKart(previewKart, t, 15, app.state === 'chars' && pe < 1.3 ? 'happy' : ''); previewKart.userData.tilt.position.y = Math.abs(Math.sin(t * 3)) * 0.12 + (pe < 0.5 ? Math.sin(pe / 0.5 * Math.PI) * 0.6 : 0); }
    if (trophyPreview && app.state === 'cups') trophyPreview.rotation.y = t * 0.8;
    const w = innerWidth / innerHeight;
    if (app.state === 'cups' && w < 1) { menuCam.position.set(0.1, 3.4, 18); menuCam.lookAt(0.1, -2.2, 0); } // v6: vertical, piloto y trofeo arriba
    else if (app.state === 'chars' && w < 1) { menuCam.position.set(0, 3.2, 12); menuCam.lookAt(0, -2.6, 0); } // v5: vertical, piloto centrado sobre la ficha
    else if (app.state === 'chars') { const D = 12.5, L = -(0.565 - 0.5) * 2 * Math.tan(21 * Math.PI / 180) * D * w; menuCam.position.set(L, 3.6, D); menuCam.lookAt(L, 2.35, 0); } // v28: piloto grande en el hueco central, sin taparlo
    else { menuCam.position.set(0, 4.5, 13 / Math.min(1.3, w / 1.5)); menuCam.lookAt(0, 1.8, 0); }
  }
  titleFx.visible = app.state === 'title' || (app.state === 'settings' && setReturn === 'title'); if (titleFx.visible) animTitleFx(titleFx, t);
  selBg.visible = app.state === 'chars'; if (selBg.visible) animSelBg(selBg, t);
  fxEnv(menuScene); renderer.render(menuScene, menuCam);
}

// ---------------- orientation / fullscreen ----------------
let rotAny = false;
// v5: el jugador elige vertical u horizontal al abrir; se guarda en ajustes (localStorage)
function checkRotate() { const o = save.settings.orient, portrait = innerHeight > innerWidth * 1.05, land = innerWidth > innerHeight * 1.05;
  const bad = isTouch && !$('orient').classList.contains('on') && ((o === 'h' && portrait) || (o === 'v' && land));
  $('rotate').style.display = bad ? 'flex' : 'none';
  if (bad) { $('rotMsg').textContent = o === 'h' ? 'Has elegido jugar en horizontal: gira el móvil.' : 'Has elegido jugar en vertical: gira el móvil.'; $('rotate').querySelector('.ph').classList.toggle('pv', o === 'v'); } }
function lockOrient() { const o = save.settings.orient; try { if (o && screen.orientation && screen.orientation.lock && document.fullscreenElement) screen.orientation.lock(o === 'v' ? 'portrait' : 'landscape').catch(() => {}); } catch (e) {} }
function pickOrient(o) { save.settings.orient = o; persist(); $('orient').classList.remove('on'); syncSettings(); tryFullscreen(); lockOrient(); checkRotate(); }
btn('oV', () => pickOrient('v')); btn('oH', () => pickOrient('h'));
function openOrient() { $('orient').classList.add('on'); for (const k of ['v', 'h']) $('o' + k.toUpperCase()).classList.toggle('sel', save.settings.orient === k); checkRotate(); }
btn('rotAny', () => openOrient());
function tryFullscreen() { if (!isTouch) return; const d = document.documentElement; const p = d.requestFullscreen ? d.requestFullscreen({ navigationUI: 'hide' }) : null; if (p && p.then) p.then(() => { lockOrient(); setTimeout(checkRotate, 400); }).catch(() => {}); else lockOrient(); }

// ---------------- boot ----------------
document.fonts && document.fonts.load('700 20px Fredoka').finally(() => {
  applyPR(); applySettings(); setTitleStage(); show('title'); $('loading').style.display = 'none'; markOri();
  requestAnimationFrame(frame); booted = true;
  // v23: mientras se ve el inicio, preparar retratos, piloto y fondo de la selección (sin tirones al pulsar «¡Jugar!»)
  CHARS.forEach(c => { const im = new Image(); im.src = portraits[c.id]; im.decode && im.decode().catch(() => {}); });
  setTimeout(() => { try { const k = makeKart(CHARS[cSel], 0); k.position.set(0, -50, 0); menuScene.add(k); const v = selBg.visible; selBg.visible = true; const end = () => { menuScene.remove(k); selBg.visible = v; };
    if (renderer.compileAsync) renderer.compileAsync(menuScene, menuCam).then(end, end); else { renderer.compile(menuScene, menuCam); end(); } } catch (e) {} }, 500);
});

// test hooks
window.__kart = {
  app, CHARS, CUPS, save, renderer, get pr() { return renderer.getPixelRatio(); },
  get state() { return app.state; }, get pod() { return podData; }, get race() { return app.race; }, get fps() { return fps; },
  setSpeed(n) { app.speed = n; }, setAutopilot(v) { app.autopilot = v; },
  sizes() { return CHARS.map(c => { const k = makeKart(c, 0), ch = k.userData.char; k.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(k), bc = new THREE.Box3().setFromObject(ch), v = new THREE.Vector3(), w = new THREE.Vector3(); b.getSize(v); bc.getSize(w); return { id: c.id, prem: !!c.premium, kart: [v.x, v.y, v.z].map(n => +n.toFixed(2)), piloto: [w.x, w.y, w.z].map(n => +n.toFixed(2)), escala: ch.scale.x }; }); },
  pickChar(id) { app.playerChar = CHARS.find(c => c.id === id); }, startCup(id) { startCup(CUPS.find(c => c.id === id)); }, startRaceN(id, n) { const c = CUPS.find(c => c.id === id); app.cup = c; app.points = {}; app.lastOrder = null; app.rivals = CHARS.filter(x => x !== app.playerChar && !x.premium).slice(0, CONFIG.racers - 1); for (const x of [app.playerChar, ...app.rivals]) app.points[x.id] = 0; app.raceNo = n; startRace(); },
  give(item) { const P = app.race.player; P.item = item; P.rollT = 0; }, force(item) { app.race.forceItem = item; }, fx(item, who) { const R = app.race; const k = who == null ? R.player : R.karts[who]; return R.fx.use(k, item); }, use() { app.race.useItem(app.race.player); },
  forceFinish() { const R = app.race; for (const k of R.karts) { if (!k.finished) { k.finished = true; k.finishTime = R.raceT + k.place; } } },
  testPodium(place = 0, cupId = 'gominola', charId = 'mochi') { // modo de pruebas: fuerza el resultado de la copa
    app.playerChar = CHARS.find(c => c.id === charId); app.cup = CUPS.find(c => c.id === cupId); app.match = null; app.points = {};
    const others = CHARS.filter(c => c !== app.playerChar && !c.premium).slice(0, CONFIG.racers - 1); const all = others.slice(); all.splice(Math.min(place, all.length), 0, app.playerChar);
    all.forEach((c, i) => app.points[c.id] = 40 - i * 4); showPodium(); },
  openChars, openCups, showPodium, pickOrient, openOrient, openModes, openLobby, startEndless, soloMatch, meInfo, get match() { return app.match; },
  trackShape(id, rev) { const T = buildTrack(CUPS.find(c => c.id === id), rev, { hi: false }); return { S: T.S.map(s => [s.p.x, s.p.z, s.w, s.wall, s.p.y]), sc: T.shortcuts.map(c => c.pts.map(p => [p.x, p.z])), feats: T.feats.map(f => [f.type, T.idxOf(f.t)]), L: T.L }; }, get quality() { return qualityHi ? 'alta' : 'baja'; },
};
