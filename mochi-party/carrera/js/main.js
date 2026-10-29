import * as THREE from 'three';
import { CONFIG, CHARS, CUPS, ITEMS } from './data.js';
import { makeKart, animKart, toon, mesh, outline } from './gfx.js?v=o45';
import { Race } from './race.js?v=o45';
import { buildTrack } from './track.js';
import { Audio } from './audio.js';
import { makePost } from './post.js?v=o45';
import { Net, netAvailable } from './net.js';

const $ = id => document.getElementById(id);
const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
document.title = CONFIG.title; $('logo').firstChild.textContent = CONFIG.title; $('sub').textContent = CONFIG.subtitle;
const params = new URLSearchParams(location.search);

// ---------------- guardado ----------------
const SKEY = 'mcalles_save_v1';
const DEF = { sound: '1', music: '1', controls: 'toque', quality: 'alta', fps: '0', autoDrift: '0', musV: '80', sfxV: '70', engV: '35' };
const save = Object.assign({ char: 'mochi', name: '', records: {}, route: 0 }, JSON.parse(localStorage.getItem(SKEY) || '{}'));
save.settings = Object.assign({}, DEF, save.settings); save.records ||= {};
// v2: el derrape automático pasa a estar desactivado por defecto (robaba el control del giro)
if (!save.v2) { save.v2 = 1; save.settings.autoDrift = '0'; }
// v3: calidad alta por defecto en todos los dispositivos
if (!save.v3) { save.v3 = 1; save.settings.quality = 'alta'; }
if (!save.name) save.name = ['Gominola', 'Chispa', 'Bombón', 'Nube', 'Pompón', 'Trufa'][Math.floor(Math.random() * 6)] + Math.floor(10 + Math.random() * 89);
const persist = () => { try { localStorage.setItem(SKEY, JSON.stringify(save)); } catch (e) { } };
const charOf = id => CHARS.find(c => c.id === id) || CHARS[0];

// ---------------- renderer ----------------
// Calidad (v3): alta = nitidez hasta 2x y todo el decorado; media = 1,5x; baja = 1x y menos decorado.
// 'auto' empieza en alta y solo baja la nitidez (nunca de 1,25x) si va a menos de 30 fps durante 5 s seguidos.
const QPR = { alta: 2, media: 1.5, baja: 1, auto: 2 };
let qLevel = save.settings.quality in QPR ? save.settings.quality : 'alta';
if (params.get('q') === 'low') qLevel = 'baja';
let qualityHi = qLevel !== 'baja', prCap = QPR[qLevel];
const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, powerPreference: 'high-performance' });
const post = makePost(renderer, { bloom: .45 });
renderer.outputColorSpace = THREE.SRGBColorSpace;
// densidad de píxeles limitada: 1,5 en alta, 1,0 en baja (los móviles de gama media van sobrados)
function applyPR() { renderer.setPixelRatio(Math.min(devicePixelRatio || 1, prCap)); resize(); }
function resize() { renderer.setSize(innerWidth, innerHeight, false); const a = innerWidth / innerHeight; for (const c of [menuCam, app.race && app.race.camera]) if (c) { c.aspect = a; c.zoom = c === (app.race && app.race.camera) && a < 1 ? Math.max(0.55, a / 1.05) : 1; c.updateProjectionMatrix(); } checkRotate(); }
addEventListener('resize', () => resize());

// ---------------- app / UI ----------------
const app = { race: null, state: 'title', autopilot: params.has('auto'), skipIntro: false, speed: 1, cup: null, playerChar: charOf(save.char), mode: 'quick', net: null };
let toastT = 0;
app.ui = {
  toast(text, color = '#ffffff') { const t = $('toast'); t.textContent = text; t.style.color = color; t.style.opacity = 1; toastT = 1.8; },
  countdown(txt) { const c = $('count'); c.textContent = txt; c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); if (txt === '¡YA!') $('startHint').style.display = 'none'; },
  bigBanner(t) { const b = $('banner'); b.textContent = t; b.classList.add('on'); clearTimeout(this._bt); this._bt = setTimeout(() => b.classList.remove('on'), 1800); },
  finishBanner(place) { this.toast(place === 1 ? '¡HAS GANADO!' : `¡Meta! ${place}º`, place <= 3 ? '#ffd84a' : '#ffffff'); },
};
function show(id) {
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('on', s.id === id);
  app.state = id || 'race';
  $('hud').classList.toggle('on', app.state === 'race');
  $('ctl').classList.toggle('on', app.state === 'race' && (isTouch || params.has('touch')));
  if (document.activeElement && document.activeElement.blur && app.state === 'race') document.activeElement.blur();
}
function btn(id, f) { $(id).addEventListener('click', e => { Audio.init(); Audio.sfxPlay('click'); f(e); }); }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtT = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;

// ---------------- escenario del menú (calle gelatina) ----------------
const menuScene = new THREE.Scene();
const menuCam = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.5, 900);
{
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color('#8fcaff') }, mid: { value: new THREE.Color('#ffd0e8') }, bot: { value: new THREE.Color('#ffe9c4') } },
    vertexShader: 'varying vec3 vp; void main(){vp=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vp; void main(){ float h=normalize(vp).y; vec3 c = h<0.1 ? mix(bot,mid,clamp(h/0.1,0.0,1.0)) : mix(mid,top,clamp((h-0.1)/0.5,0.0,1.0)); gl_FragColor=vec4(c,1.0);}' }));
  menuScene.add(sky);
  menuScene.add(new THREE.HemisphereLight('#ffffff', '#ffd6ea', 1.3));
  const d = new THREE.DirectionalLight('#fff4e8', 1.5); d.position.set(30, 60, 40); menuScene.add(d);
  mesh(new THREE.CircleGeometry(300, 48), toon('#c9b6d9', { rim: 0 }), menuScene, [0, 0, 0], [-Math.PI / 2, 0, 0]);
  for (let i = 0; i < 18; i++) mesh(new THREE.PlaneGeometry(1.2, 4), toon('#ffffff', { rim: 0 }), menuScene, [-9 + i * 1.1 * 0 + (i % 6 - 2.5) * 2, 0.02, -14 - Math.floor(i / 6) * 0], [-Math.PI / 2, 0, 0]);
  const plat = mesh(new THREE.CylinderGeometry(5.5, 5.9, 0.6, 40), toon('#fff4fa'), menuScene, [0, 0.3, 0]); outline(plat, '#d08ab8', 1.02);
  const cols = ['#ff9ec7', '#ffd36b', '#9fe3c9', '#c9b2ff', '#ffb38a', '#8fe3f0'];
  for (let i = 0; i < 22; i++) { const a = i / 22 * 6.28 + 0.15, r = 24 + (i % 3) * 8, h = 8 + (i * 7 % 5) * 3; const g = new THREE.Group(); g.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); menuScene.add(g);
    const b = mesh(new THREE.BoxGeometry(6, h, 6), toon(cols[i % 6], { rim: 0.4 }), g, [0, h / 2, 0], null); outline(b, '#a06090', 1.02);
    mesh(new THREE.SphereGeometry(3.3, 14, 8, 0, 6.28, 0, Math.PI / 2), toon(cols[(i + 2) % 6]), g, [0, h, 0]);
    for (let w = 0; w < 3; w++) mesh(new THREE.BoxGeometry(1.2, 1.4, 0.1), toon('#fff6c4', { emissive: '#fff2a0', ei: 0.3 }), b, [(w - 1) * 1.8, h * 0.15, 3.05]);
    g.lookAt(0, 0, 0); }
  menuScene.fog = new THREE.Fog('#ffe3f1', 60, 300);
}
const stage = new THREE.Group(); menuScene.add(stage);
const menuKarts = []; let previewKart = null;
function setTitleStage() { stage.clear(); menuKarts.length = 0; previewKart = null; CHARS.slice(0, 6).forEach((ch, i) => { const k = makeKart(ch, i); stage.add(k); menuKarts.push({ k, a: i / 6 * Math.PI * 2 }); }); }
function setPreview(ch) { stage.clear(); menuKarts.length = 0; previewKart = makeKart(ch, 0); previewKart.position.y = 0.6; previewKart.scale.setScalar(1.3); stage.add(previewKart); }

// ---------------- portada ----------------
$('tName').value = save.name;
$('tName').addEventListener('input', () => { save.name = $('tName').value.trim().slice(0, 14) || 'Piloto'; persist(); });
$('tName').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); e.stopPropagation(); });
const syncTitle = () => { $('tCharN').textContent = app.playerChar.name; };
$('tHint').textContent = isTouch ? 'Se juega en vertical y con una mano' : 'Teclado: ← → girar · Espacio derrapar · X objeto · se acelera solo';
btn('tQuick', () => { tryFullscreen(); app.mode = 'quick'; openRoutes(); });
btn('tOnline', () => { tryFullscreen(); openOnline(); });
btn('tChar', () => openChars('title'));
btn('tRec', () => openRecords());
btn('tSet', () => openSettings('title'));
function goTitle() { show('title'); setTitleStage(); syncTitle(); }

// ---------------- pilotos ----------------
let cSel = Math.max(0, CHARS.findIndex(c => c.id === save.char)), charReturn = 'title';
function openChars(from) { charReturn = from; show('chars'); renderChars(); }
function renderChars() {
  const ch = CHARS[cSel];
  $('cName').textContent = ch.name; $('cName').style.color = ch.color === '#e8f4ff' ? '#7fb0e0' : '';
  $('cVeh').textContent = '🛞 ' + ch.vname; $('cDesc').textContent = ch.desc;
  for (const [k, id] of [['vel', 'sVel'], ['acel', 'sAcel'], ['man', 'sMan'], ['peso', 'sPeso']]) $(id).style.width = ch.stats[k] * 20 + '%';
  $('cGo').textContent = '¡Elegir a ' + ch.name + '!';
  const L = $('cList'); L.innerHTML = '';
  CHARS.forEach((c, i) => { const b = document.createElement('button'); b.className = 'chip' + (i === cSel ? ' on' : ''); b.innerHTML = `<b style="background:${c.color}"></b>${c.name}`; b.onclick = () => { Audio.init(); Audio.sfxPlay('click'); cSel = i; renderChars(); }; L.appendChild(b); });
  setPreview(ch);
}
btn('cBack', () => charReturn === 'lobby' ? openLobby() : goTitle());
btn('cGo', () => { const ch = CHARS[cSel]; save.char = ch.id; persist(); app.playerChar = ch; if (charReturn === 'lobby') { app.net && app.net.pick(ch.id); openLobby(); } else goTitle(); });

// ---------------- barrios (rutas) ----------------
let uSel = save.route || 0;
const best = id => (save.records[id] || [])[0];
function openRoutes() {
  show('routes'); const L = $('rList'); L.innerHTML = '';
  CUPS.forEach((c, i) => {
    const d = document.createElement('div'); d.className = 'route' + (i === uSel ? ' sel' : ''); const b = best(c.id);
    d.innerHTML = `<div class="sw" style="background:linear-gradient(180deg,${c.sky[0]},${c.sky[2] || c.sky[1]} 60%,${c.sky[1]})"></div><div><h3 style="color:${c.color === '#ffffff' ? '#8b5cc2' : c.color};-webkit-text-stroke:.4px #6a4b8a">${c.name}</h3><div class="d">${c.track}</div><div class="b">${b ? '🏆 Récord ' + fmtT(b.t) : 'Sin récord todavía'}</div></div>`;
    d.onclick = () => { Audio.init(); Audio.sfxPlay('click'); uSel = i; save.route = i; persist(); openRoutes(); };
    L.appendChild(d);
  });
  setPreview(app.playerChar);
}
btn('uBack', () => goTitle());
btn('uGo', () => startQuick(CUPS[uSel]));

function startQuick(cup) {
  leaveNet();
  app.mode = 'quick';
  const others = CHARS.filter(c => c !== app.playerChar).sort(() => Math.random() - 0.5).slice(0, CONFIG.racers - 1);
  const grid = [...others.map((ch, i) => ({ ch, kind: 'bot', name: ch.name, id: 'b' + i })), { ch: app.playerChar, kind: 'me', name: save.name, id: 'me' }];
  startRace(cup, grid, null);
}

// ---------------- carrera ----------------
function nameTag(text, color, me) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const x = cv.getContext('2d');
  x.font = '700 34px Fredoka, sans-serif'; const w = Math.min(248, x.measureText(text).width + 30);
  x.fillStyle = 'rgba(80,40,110,.72)'; x.beginPath(); x.roundRect((256 - w) / 2, 8, w, 48, 22); x.fill();
  x.fillStyle = color; x.beginPath(); x.arc((256 - w) / 2 + 18, 32, 8, 0, 7); x.fill();
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128 + 8, 33);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(4, 1, 1); s.position.y = 4; s.renderOrder = 10; return s;
}
function startRace(cup, grid, net) {
  if (app.race) { app.race.dispose(); app.race = null; }
  app.cup = cup; app.lastGrid = grid;
  $('loading').style.display = 'flex'; $('loading').textContent = 'Preparando ' + cup.name + '…';
  setTimeout(() => {
    app.race = new Race(app, { cup, reverse: false, playerChar: app.playerChar, grid, cupIndex: 1, quality: { hi: qualityHi }, net });
    for (const k of app.race.karts) if (!k.isPlayer) k.mesh.add(nameTag(k.pname, k.ch.color));
    resize(); $('loading').style.display = 'none';
    show(null); $('startHint').style.display = 'block'; $('startHint').innerHTML = isTouch ? 'Toca <b>DERRAPE</b> justo al «¡YA!» para salir con turbo' : 'Pulsa <b>Espacio</b> justo al «¡YA!» para salir con turbo';
    $('waitNet').style.display = net ? 'block' : 'none';
    app.ui.toast(cup.name + (net ? ' · online' : ''), '#ffffff');
    Audio.init(); Audio.playSong(cup.music, CUPS.indexOf(cup) * 7 + 3); Audio.engineStart();
    buildMinimap();
    if (net) {
      net.on('msg', d => onNetMsg(d));
      if (net.isHost) { app.ready = new Set(['h']); app.readyTO = setTimeout(() => hostGo(), 12000); checkReady(); }
      else { net.send({ t: 'ready' }); if (app.pendingGo) { app.pendingGo = false; app.race.goNow = true; } }
    }
  }, 30);
}
function checkReady() { if (!app.net || !app.net.isHost || !app.ready) return; if (app.net.players.every(p => app.ready.has(p.id))) hostGo(); }
function hostGo() { clearTimeout(app.readyTO); if (!app.race || app.race.goNow) return; app.race.goNow = true; app.net.send({ t: 'go' }); }

app.onRaceEnd = (order, stats) => { app.lastStats = stats; app.lastResults = order; setTimeout(() => showResults(order), 400); };
function addRecord(cup, o) {
  const L = save.records[cup.id] ||= []; L.push({ t: o.time, ch: o.ch.id, name: save.name, online: app.mode === 'online', d: Date.now() });
  L.sort((a, b) => a.t - b.t); L.splice(5); persist(); return L.findIndex(r => r.d === L.find(x => x.t === o.time)?.d);
}
function showResults(order) {
  show('results'); Audio.stopSong();
  const cup = app.cup, online = app.mode === 'online';
  $('rTitle').textContent = cup.name + (online ? ' · online' : '');
  let h = '<tr><td></td><td>Piloto</td><td class="n">Tiempo</td><td class="n">Pts</td></tr>';
  order.forEach((o, i) => { h += `<tr class="${o.isPlayer ? 'me' : ''}"><td>${i + 1}º</td><td><span class="dot" style="background:${o.ch.color}"></span>${esc(o.name)}${o.isPlayer ? ' (tú)' : o.kind === 'bot' ? ' 🤖' : ''}</td><td class="n">${fmtT(o.time)}${o.fin === false ? '*' : ''}</td><td class="n">${CONFIG.points[i] ?? 0}</td></tr>`; });
  $('rTable').innerHTML = h;
  const me = order.find(o => o.isPlayer); let rec = '';
  if (me && me.fin !== false) { const before = best(cup.id); const pos = addRecord(cup, me); rec = (!before || me.time < before.t) ? '🏆 ¡Nuevo récord del barrio! ' + fmtT(me.time) : pos >= 0 && pos < 5 ? `Entra en tu top 5 (${pos + 1}º)` : 'Récord: ' + fmtT(best(cup.id).t); }
  $('rRec').textContent = rec + (app.lastStats.peds ? ` · Peatones rebotados: ${app.lastStats.peds}` : '');
  $('rNet').textContent = online ? 'Clasificación decidida por el anfitrión: es la misma para todos.' + (order.some(o => o.fin === false) ? ' (* tiempo estimado)' : '') : order.some(o => o.fin === false) ? '* tiempo estimado' : '';
  $('rNext').textContent = online ? (app.net && app.net.isHost ? 'Otra carrera (sala)' : 'Volver a la sala') : 'Repetir';
  $('rNext').style.display = online && !app.net ? 'none' : '';
}
btn('rNext', () => {
  if (app.mode === 'online' && app.net) { if (app.net.isHost) { app.net.started = false; app.net.send({ t: 'tolobby' }); } endRaceObj(); openLobby(); }
  else startQuick(app.cup);
});
btn('rMenu', () => { endRaceObj(); leaveNet(); goTitle(); });
function endRaceObj() { if (app.race) { app.race.dispose(); app.race = null; } Audio.stopSong(); Audio.engineStop(); }

// ---------------- récords ----------------
function openRecords() {
  show('records'); let h = '';
  for (const c of CUPS) { const L = save.records[c.id] || []; h += `<div class="lbl" style="margin-top:8px;color:${c.color === '#ffffff' ? '#8b5cc2' : c.color};-webkit-text-stroke:.3px #6a4b8a;font-size:16px">${c.name}</div>`;
    h += L.length ? '<table>' + L.map((r, i) => `<tr><td>${i + 1}º</td><td><span class="dot" style="background:${charOf(r.ch).color}"></span>${esc(r.name)}</td><td class="n">${fmtT(r.t)}</td><td>${r.online ? '🌐' : '⚡'}</td></tr>`).join('') + '</table>' : '<div class="lbl" style="font-weight:600">Aún no hay tiempos. ¡Corre aquí!</div>'; }
  $('recBody').innerHTML = h;
}
btn('recOk', () => goTitle());

// ---------------- online ----------------
function oMsg(t, err) { $('oMsg').textContent = t; $('oMsg').classList.toggle('err', !!err); $('oBots').style.display = err ? '' : 'none'; }
function openOnline() { leaveNet(); show('online'); oMsg(netAvailable() ? '' : 'No se ha podido cargar el módulo online.', !netAvailable()); setPreview(app.playerChar); }
const ERR = { broker: 'No se puede conectar con el servidor de salas (sin internet o servidor caído). Puedes jugar contra bots mientras tanto.', nosala: 'No existe ninguna sala con ese código (o el anfitrión se ha ido).', llena: 'Esa sala está llena.', empezada: 'Esa sala ya está en plena carrera. Espera a que acabe e inténtalo de nuevo.', codigo: 'El código tiene 4 letras o números.' };
btn('oBack', () => { leaveNet(); goTitle(); });
btn('oBots', () => { app.mode = 'quick'; openRoutes(); });
let busy = false;
btn('oCreate', async () => {
  if (busy) return; busy = true; oMsg('Creando sala…'); const net = new Net();
  try { await net.create(save.name, app.playerChar.id); app.net = net; app.mode = 'online'; wireNet(net); net.setRoute(uSel); openLobby(); }
  catch (e) { oMsg(ERR[e.message] || ERR.broker, true); try { net.close(); } catch (x) { } }
  busy = false;
});
btn('oJoin', async () => {
  if (busy) return; const code = $('jCode').value; busy = true; oMsg('Buscando la sala ' + code.toUpperCase() + '…'); const net = new Net();
  try { await net.join(code, save.name, app.playerChar.id); app.net = net; app.mode = 'online'; wireNet(net); openLobby(); Audio.sfxPlay('join'); }
  catch (e) { oMsg(ERR[e.message] || ERR.broker, true); try { net.close(); } catch (x) { } }
  busy = false;
});
$('jCode').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') $('oJoin').click(); });
$('jCode').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); });
if (params.get('sala')) { $('jCode').value = params.get('sala').toUpperCase().slice(0, 4); }

function wireNet(net) {
  net.on('lobby', () => { if (app.state === 'lobby') renderLobby(); if (net.isHost) Audio.sfxPlay('join'); });
  net.on('msg', d => onNetMsg(d));
  net.on('left', (id, name) => { if (app.race) app.race.netDrop(id); else if (name) app.ui.toast(name + ' ha salido'); });
  net.on('hostgone', () => {
    if (app.race && !app.race.ended) { app.race.netLostHost(); app.ui.toast('El anfitrión se ha ido: terminas contra bots', '#ffd84a'); app.net = null; }
    else { app.net = null; if (app.state === 'lobby') { openOnline(); oMsg('El anfitrión ha cerrado la sala.', true); } }
  });
}
function onNetMsg(d) {
  const net = app.net; if (!net) return;
  if (d.t === 'start' && !net.isHost) { beginNetRace(d); return; }
  if (d.t === 'tolobby' && !net.isHost) { if (app.state === 'results' || app.state === 'lobby') { endRaceObj(); openLobby(); } return; }
  if (d.t === 'ready' && net.isHost) { app.ready && app.ready.add(d.from); checkReady(); return; }
  if (d.t === 'go' && !net.isHost) { if (app.race) app.race.goNow = true; else app.pendingGo = true; }
  if (app.race && app.race.net === net) (app.race.netQ ||= []).push(d);
}
function openLobby() {
  show('lobby'); renderLobby(); setPreview(app.playerChar);
}
function renderLobby() {
  const net = app.net; if (!net) return;
  $('lCode').textContent = net.code;
  const ps = net.players, slots = Math.max(CONFIG.racers, ps.length);
  let h = ps.map(p => `<div class="pl ${p.id === net.myId ? 'me' : ''}"><span class="dot" style="background:${charOf(p.ch).color}"></span>${esc(p.name)}<span class="tag">${charOf(p.ch).name}${p.host ? ' · anfitrión' : ''}${p.id === net.myId ? ' · tú' : ''}</span></div>`).join('');
  for (let i = ps.length; i < slots; i++) h += `<div class="pl bot"><span class="dot" style="background:#ddd"></span>Hueco libre<span class="tag">bot 🤖</span></div>`;
  $('lPlayers').innerHTML = h;
  const R = $('lRoutes'); R.innerHTML = '';
  CUPS.forEach((c, i) => { const b = document.createElement('button'); b.className = 'chip' + (i === net.route ? ' on' : ''); b.innerHTML = `<b style="background:${c.sky[2] || c.color}"></b>${c.short || c.name}`; b.disabled = !net.isHost; b.onclick = () => { if (!net.isHost) return; Audio.sfxPlay('click'); uSel = i; save.route = i; persist(); net.setRoute(i); renderLobby(); }; R.appendChild(b); });
  $('lStart').style.display = net.isHost ? '' : 'none';
  $('lMsg').textContent = net.isHost ? (ps.length < 2 ? 'Comparte el código con tus amigos. Puedes empezar ya: los huecos serán bots.' : `${ps.length} jugadores en la sala`) : 'Esperando a que el anfitrión empiece…';
  $('lRouteL').textContent = net.isHost ? 'Elige barrio' : 'Barrio: ' + CUPS[net.route].name;
}
function shareText() { const url = location.origin + location.pathname + '?sala=' + app.net.code; return { title: CONFIG.title, text: `¡Échame una carrera en ${CONFIG.title}! Código de sala: ${app.net.code}`, url }; }
btn('lShare', async () => { const s = shareText(); try { if (navigator.share) await navigator.share(s); else { await navigator.clipboard.writeText(s.text + ' ' + s.url); app.ui.toast('¡Enlace copiado!'); $('lMsg').textContent = 'Enlace copiado: pégalo en WhatsApp o donde quieras.'; } } catch (e) { } });
btn('lCopy', async () => { try { await navigator.clipboard.writeText(app.net.code); $('lMsg').textContent = 'Código ' + app.net.code + ' copiado'; } catch (e) { $('lMsg').textContent = 'Código: ' + app.net.code; } });
btn('lChar', () => openChars('lobby'));
btn('lBack', () => { leaveNet(); openOnline(); });
btn('lStart', () => hostStart());
function hostStart() {
  const net = app.net; if (!net || !net.isHost) return;
  const humans = net.players.map(p => ({ id: p.id, ch: p.ch, name: p.name, human: true }));
  const used = new Set(humans.map(h => h.ch));
  const bots = CHARS.filter(c => !used.has(c.id)).sort(() => Math.random() - 0.5).slice(0, Math.max(0, CONFIG.racers - humans.length)).map((c, i) => ({ id: 'b' + i, ch: c.id, name: c.name, human: false }));
  const grid = [...bots, ...humans.sort(() => Math.random() - 0.5)];
  net.started = true; const d = { t: 'start', route: net.route, grid };
  net.send(d); beginNetRace(d);
}
function beginNetRace(d) {
  const net = app.net; app.mode = 'online';
  const grid = d.grid.map(g => ({ ch: charOf(g.ch), name: g.name, id: g.id, kind: g.id === net.myId ? 'me' : g.human ? 'remote' : 'bot' }));
  const me = grid.find(g => g.kind === 'me'); if (me) app.playerChar = me.ch;
  endRaceObj(); startRace(CUPS[d.route], grid, net);
}
function leaveNet() { if (app.net) { app.net.close(); app.net = null; } }

// ---------------- ajustes ----------------
let setReturn = 'title';
function openSettings(from) { setReturn = from; show('settings'); syncSettings(); }
function syncSettings() { for (const seg of document.querySelectorAll('.seg')) for (const b of seg.children) b.classList.toggle('on', save.settings[seg.dataset.k] === b.dataset.v); applySettings(); }
for (const seg of document.querySelectorAll('.seg')) for (const b of seg.children) b.addEventListener('click', () => {
  Audio.init(); save.settings[seg.dataset.k] = b.dataset.v; persist(); syncSettings(); Audio.sfxPlay('click');
  if (seg.dataset.k === 'controls' && b.dataset.v === 'tilt') requestTilt();
  if (seg.dataset.k === 'quality') { qLevel = b.dataset.v; qualityHi = qLevel !== 'baja'; prCap = QPR[qLevel]; applyPR(); }
});
for (const r of document.querySelectorAll('input.vol')) r.addEventListener('input', () => { Audio.init(); save.settings[r.dataset.k] = r.value; persist(); applySettings(); if (r.dataset.k === 'sfxV') Audio.sfxPlay('click'); });
function applySettings() {
  Audio.on = save.settings.sound === '1'; Audio.musicOn = save.settings.music === '1'; for (const k of ['mus', 'sfx', 'eng']) Audio.vol[k] = +(save.settings[k + 'V'] ?? DEF[k + 'V']) / 100; Audio.apply();
  for (const r of document.querySelectorAll('input.vol')) r.value = save.settings[r.dataset.k] ?? DEF[r.dataset.k];
  $('fps').style.display = save.settings.fps === '1' ? 'block' : 'none';
  app.autoDrift = true; // v9: derrape asistido como en Mochi Racers (su ajuste por defecto)
  const tilt = save.settings.controls === 'tilt';
  $('bL').style.display = $('bR').style.display = tilt ? 'none' : 'flex'; $('stick').style.display = 'none';
  $('tiltHint').style.display = tilt && isTouch ? 'block' : 'none';
}
btn('sOk', () => { if (setReturn === 'pause') show('pause'); else goTitle(); });

// ---------------- pausa ----------------
function pause() { if (!app.race || app.state !== 'race') return; show('pause'); $('paNote').textContent = app.race.net ? 'Online la carrera sigue mientras estás en pausa.' : ''; $('paRe').style.display = app.race.net ? 'none' : ''; if (!app.race.net) { Audio.stopSong(); Audio.engineSet(0); } }
$('pauseB').addEventListener('pointerdown', e => { e.stopPropagation(); Audio.init(); pause(); });
btn('paGo', () => { show(null); if (!app.race.net) Audio.playSong(app.cup.music, CUPS.indexOf(app.cup) * 7 + 3); });
btn('paRe', () => startQuick(app.cup));
btn('paSet', () => openSettings('pause'));
btn('paQuit', () => { endRaceObj(); leaveNet(); goTitle(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && app.race && !app.race.net) pause(); });

// ---------------- entrada ----------------
const keys = {}; let driftPrev = false, itemPrev = false;
addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.repeat) { if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); return; }
  keys[e.code] = true; Audio.init();
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (app.race && (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW')) app.race.pressAction();
  if ((e.code === 'KeyP' || e.code === 'Escape') && app.state === 'race') pause();
  else if ((e.code === 'KeyP' || e.code === 'Escape') && app.state === 'pause') $('paGo').click();
});
addEventListener('keyup', e => { keys[e.code] = false; });
const held = {};
function holdBtn(id, name) {
  const el = $(id);
  el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); Audio.init(); try { el.setPointerCapture(e.pointerId); } catch (x) { } held[name] = true; el.classList.add('down'); if (name === 'drift' && app.race) app.race.pressAction(); });
  const up = () => { held[name] = false; el.classList.remove('down'); };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
}
holdBtn('bL', 'left'); holdBtn('bR', 'right'); holdBtn('bD', 'drift'); holdBtn('bI', 'item'); holdBtn('bB', 'brake'); // v9: botones de Mochi Racers v6
for (const id of ['bL', 'bR']) $(id).addEventListener('pointerdown', () => { if (app.race && app.race.state === 'intro') app.skipIntro = true; });
let padSteer = 0; const arrowSteer = () => 0; // (el joystick de zona de la v2 se sustituye por los botones ◀ ▶ de Mochi Racers)
// sin scroll, zoom, menú de pulsación larga ni selección durante la carrera
for (const ev of ['touchstart', 'touchmove', 'touchend', 'gesturestart']) $('ctl').addEventListener(ev, e => { if (e.cancelable) e.preventDefault(); }, { passive: false });
document.addEventListener('touchmove', e => { if (app.state === 'race' && e.cancelable) e.preventDefault(); }, { passive: false });
addEventListener('contextmenu', e => { if (app.state === 'race') e.preventDefault(); });
let tiltX = 0;
function requestTilt() { const D = window.DeviceOrientationEvent; if (D && typeof D.requestPermission === 'function') D.requestPermission().catch(() => {}); }
addEventListener('deviceorientation', e => { const ang = (screen.orientation && screen.orientation.angle) || window.orientation || 0; let v = 0;
  if (ang === 90) v = e.beta; else if (ang === -90 || ang === 270) v = -e.beta; else v = e.gamma; tiltX = Math.max(-1, Math.min(1, (v || 0) / 22)); });
$('gl').addEventListener('pointerdown', () => { Audio.init(); if (app.race && app.race.state === 'intro') app.skipIntro = true; });
let adT = 0, adOn = false; const AUTO_DRIFT = { steer: 0.7, hold: 0.22, release: 0.25 };
function readInput(dt) {
  let steer = 0;
  if (keys.ArrowLeft || keys.KeyA) steer -= 1; if (keys.ArrowRight || keys.KeyD) steer += 1;
  if (held.left) steer -= 1; if (held.right) steer += 1;
  if (save.settings.controls === 'tilt' && isTouch) steer += tiltX;
  steer = Math.max(-1, Math.min(1, steer));
  const R = app.race, P = R.player, T = R.track;
  let drift = !!(keys.Space || keys.ShiftLeft || keys.ShiftRight || held.drift);
  if (false) {
    let cv = 0; for (let j = 2; j <= 18; j += 4) cv = Math.max(cv, Math.abs(T.S[(P.idx + j) % T.N].curv));
    if (!adOn) { adT = Math.abs(steer) > AUTO_DRIFT.steer && P.fs > 20 && cv > 0.14 ? adT + dt : 0; if (adT > AUTO_DRIFT.hold) adOn = true; }
    else if (Math.abs(steer) < AUTO_DRIFT.release || P.fs < 8) { adOn = false; adT = 0; }
    drift = adOn;
  } else { adOn = false; adT = 0; }
  const item = !!(keys.KeyX || keys.KeyE || keys.Enter || keys.KeyK || held.item);
  const r = R.input;
  r.steer = -steer; r.brake = !!(keys.ArrowDown || keys.KeyS || held.brake); r.throttle = 1;
  r.drift = drift; r.driftEdge = drift && !driftPrev; r.itemEdge = item && !itemPrev; driftPrev = drift; itemPrev = item;
}

// ---------------- HUD ----------------
const fxLines = Array.from({ length: 42 }, () => ({ a: Math.random() * 6.283, r: Math.random(), s: 0.5 + Math.random() }));
function drawFx(R, P) {
  const cv = $('fx'), w = innerWidth, h = innerHeight; if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const c = cv.getContext('2d'); c.clearRect(0, 0, w, h);
  const sp = Math.max(0, P.fs - 26) / 26 + (P.boostT > 0 ? 0.6 : 0) + (P.turboT > 0 ? 0.8 : 0) + R.kick, I = Math.min(1.8, sp); if (I <= 0.02 || R.state !== 'race') return;
  const cx = w / 2, cy = h * 0.5, maxR = Math.hypot(w, h) * 0.55; c.lineCap = 'round';
  for (const L of fxLines) { L.r += 0.04 * L.s * (1 + I); if (L.r > 1) { L.r = 0; L.a = Math.random() * 6.283; L.s = 0.5 + Math.random(); }
    const r0 = maxR * (0.55 + L.r * 0.45), r1 = r0 + maxR * 0.12 * I * L.s, ca = Math.cos(L.a), sa = Math.sin(L.a);
    c.strokeStyle = P.boostT > 0 ? `rgba(255,236,170,${0.55 * I})` : `rgba(255,255,255,${0.42 * I})`; c.lineWidth = 2 + 2 * L.s;
    c.beginPath(); c.moveTo(cx + ca * r0 * 0.7, cy + sa * r0); c.lineTo(cx + ca * r1 * 0.7, cy + sa * r1); c.stroke(); }
}
let miniPts = null, miniBox = null;
function buildMinimap() {
  const T = app.race.track; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const s of T.S) { x0 = Math.min(x0, s.p.x); x1 = Math.max(x1, s.p.x); z0 = Math.min(z0, s.p.z); z1 = Math.max(z1, s.p.z); }
  const sc = 176 / Math.max(x1 - x0, z1 - z0); miniBox = { x0, z0, sc, ox: (208 - (x1 - x0) * sc) / 2, oz: (208 - (z1 - z0) * sc) / 2 };
  miniPts = T.S.filter((_, i) => i % 3 === 0).map(s => mm(s.p.x, s.p.z));
}
const mm = (x, z) => [miniBox.ox + (x - miniBox.x0) * miniBox.sc, miniBox.oz + (z - miniBox.z0) * miniBox.sc];
let boardT = 0;
function drawHUD(dt) {
  const R = app.race, P = R.player, laps = R.laps;
  $('hPos').innerHTML = `${P.place}<small>º/${R.karts.length}</small>`;
  $('hLap').firstChild.textContent = `Vuelta ${Math.min(laps, Math.max(1, P.lap + 1))}/${laps}`;
  $('hTime').textContent = fmtT(R.raceT);
  $('hPos').classList.toggle('p1', P.place === 1);
  const pip = $('hPips'); if (pip.childElementCount !== laps) pip.innerHTML = '<b></b>'.repeat(laps); [...pip.children].forEach((b, i) => b.classList.toggle('on', i <= P.lap));
  const kmh = Math.max(0, Math.round(P.fs * 3.2)); $('hKmh').textContent = kmh; $('hBar').style.width = Math.min(100, kmh / 2.2) + '%';
  // v9: anillo de carga del derrape, igual que Mochi Racers v6
  const lv = P.driftDir ? (P.driftT > 1.6 ? 3 : P.driftT > 1.0 ? 2 : P.driftT > 0.5 ? 1 : 0) : 0;
  const fr = P.driftDir ? Math.min(1, P.driftT / 1.6) : 0, rg = $('dRing'); rg.style.strokeDashoffset = 283 * (1 - fr); rg.style.stroke = ['#ffffff', '#7fd8ff', '#ffb36b', '#ff7fe0'][lv];
  const bd = $('bD'); for (let i = 1; i <= 3; i++) bd.classList.toggle('l' + i, lv === i);
  $('cream').style.opacity = P.creamT > 0 ? Math.min(1, P.creamT) * 0.92 : 0;
  $('flash').style.opacity = Math.min(1, R.kick * 0.9 + (P.boostT > 0 ? 0.12 : 0));
  drawFx(R, P);
  const hi = $('hItem');
  if (P.rollT > 0) { const k = Object.keys(ITEMS); hi.textContent = ITEMS[k[Math.floor(R.time * 14) % k.length]].icon; hi.classList.add('roll'); $('hItemName').textContent = ''; }
  else { hi.classList.remove('roll'); hi.textContent = P.item ? ITEMS[P.item].icon : ''; $('hItemName').textContent = P.item ? ITEMS[P.item].name : ''; }
  const has = P.item && P.rollT <= 0; $('bI').textContent = has ? ITEMS[P.item].icon : '·'; $('bI').classList.toggle('has', !!has);
  $('blind').style.opacity = P.blindT > 0 ? Math.min(1, P.blindT) * 0.95 : 0;
  $('wrong').style.display = P.wrongT > 1 ? 'block' : 'none';
  $('waitNet').style.display = R.net && !R.goNow && R.state === 'intro' ? 'block' : 'none';
  // aviso de peatones delante
  let warn = false; for (const p of R.peds.list) { const di = (p.cr.idx - P.idx + R.track.N) % R.track.N; if (di > 0 && di < 45 && p.state && p.state !== 'go') warn = true; }
  $('pedWarn').style.display = warn && R.state === 'race' ? 'block' : 'none';
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').style.opacity = 0; }
  // clasificación en vivo (nombres)
  boardT -= dt; if (boardT <= 0) { boardT = 0.25; const K = R.karts.slice().sort((a, b) => a.place - b.place);
    $('hBoard').innerHTML = K.map(k => `<div class="${k.isPlayer ? 'me' : ''}">${k.place}º <i style="background:${k.ch.color}"></i>${esc(k.isPlayer ? 'Tú' : k.pname)}${k.kind === 'remote' ? ' 🌐' : ''}</div>`).join(''); }
  // minimapa
  const c = $('mini').getContext('2d'); c.clearRect(0, 0, 208, 208); c.lineJoin = 'round'; c.lineCap = 'round';
  c.beginPath(); miniPts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
  c.strokeStyle = 'rgba(120,60,140,.55)'; c.lineWidth = 14; c.stroke(); c.strokeStyle = '#ffffff'; c.lineWidth = 8; c.stroke();
  for (const sc of R.track.shortcuts) { c.beginPath(); sc.pts.forEach((p, i) => { const [x, y] = mm(p.x, p.z); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 4; c.setLineDash([4, 5]); c.stroke(); c.setLineDash([]); }
  for (const p of R.peds.list) { const [x, y] = mm(p.s.p.x, p.s.p.z); c.fillStyle = p.state === 'red' ? '#ff3f6f' : p.state === 'amb' ? '#ffc23d' : '#5fdf8a'; c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); }
  const s0 = mm(R.track.S[0].p.x, R.track.S[0].p.z); c.fillStyle = '#3a2050'; c.fillRect(s0[0] - 6, s0[1] - 2, 12, 4);
  for (const k of R.karts.slice().sort((a, b) => (a.isPlayer ? 1 : 0) - (b.isPlayer ? 1 : 0))) { const [x, y] = mm(k.pos.x, k.pos.z); c.beginPath(); c.arc(x, y, k.isPlayer ? 8 : 5.5, 0, 7); c.fillStyle = k.ch.color; c.fill(); c.lineWidth = k.isPlayer ? 3.5 : 2; c.strokeStyle = k.isPlayer ? '#e0609f' : k.kind === 'remote' ? '#ffd84a' : '#ffffff'; c.stroke(); }
}

// ---------------- bucle ----------------
let last = performance.now(), acc = 0, fpsAcc = 0, fpsN = 0, fps = 60, lowFpsT = 0;
const STEP = 1 / 60;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.1, (now - last) / 1000); last = now;
  fpsAcc += dt; fpsN++; if (fpsAcc >= 1) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; $('fps').textContent = fps.toFixed(0) + ' fps · ' + qLevel + ' · ' + renderer.getPixelRatio().toFixed(2) + 'x';
    if (app.state === 'race' && qLevel === 'auto' && app.race && app.race.state === 'race') { lowFpsT = fps < 30 ? lowFpsT + 1 : 0; if (lowFpsT >= 5 && prCap > 1.25) { lowFpsT = 0; prCap = Math.max(1.25, prCap - 0.25); applyPR(); app.ui.toast('Ajustando nitidez para ir más fluido'); } } }
  const t = now / 1000;
  const raceLive = app.race && (app.state === 'race' || (app.race.net && ['pause', 'settings'].includes(app.state)));
  if (raceLive) {
    if (app.state === 'race') readInput(dt); else { const r = app.race.input; r.steer = 0; r.drift = false; r.itemEdge = false; r.driftEdge = false; }
    acc += dt * app.speed; let n = 0;
    while (acc >= STEP && n < 6 * app.speed) { app.race.update(STEP); acc -= STEP; n++; }
    if (acc > STEP * 6) acc = 0;
    if (app.race && app.race.interp) app.race.interp(acc / STEP);
    if (app.race) { if (app.state === 'race') drawHUD(dt); post.render(app.race.scene, topCam || app.race.camera); }
    return;
  }
  if (app.state === 'results' && app.race) { acc += dt; let n = 0; while (acc >= STEP && n < 4) { app.race.update(STEP); acc -= STEP; n++; } post.render(app.race.scene, app.race.camera); return; }
  const por = innerWidth < innerHeight;
  if (app.state === 'title' || (app.state === 'settings' && setReturn === 'title') || app.state === 'records') {
    menuKarts.forEach((m, i) => { const a = m.a + t * 0.35; m.k.position.set(Math.cos(a) * 3.8, 0.6 + Math.abs(Math.sin(t * 3 + i)) * 0.15, Math.sin(a) * 3.8); m.k.rotation.y = -a; animKart(m.k, t, 20); });
    menuCam.position.set(Math.sin(t * 0.1) * 3, por ? 10 : 6.5, por ? 27 : 15); menuCam.lookAt(0, por ? -0.5 : 1.2, 0);
  } else {
    if (previewKart) { previewKart.rotation.y = t * 0.7; animKart(previewKart, t, 15); previewKart.userData.tilt.position.y = Math.abs(Math.sin(t * 3)) * 0.12; }
    menuCam.position.set(0, por ? 5.5 : 4.2, por ? 15 : 13); menuCam.lookAt(0, por ? -2.2 : 1.6, 0);
  }
  post.render(menuScene, menuCam);
}

// ---------------- orientación / pantalla completa ----------------
let rotAny = false;
function checkRotate() { $('rotate').style.display = 'none'; } // v9: se juega en vertical y en horizontal, como Mochi Racers
btn('rotAny', () => { rotAny = true; checkRotate(); });
function tryFullscreen() { if (!isTouch) return; const d = document.documentElement; const p = d.requestFullscreen ? d.requestFullscreen({ navigationUI: 'hide' }) : null; if (p && p.catch) p.catch(() => {}); }

// ---------------- arranque ----------------
const boot = () => { applyPR(); applySettings(); goTitle(); $('loading').style.display = 'none'; requestAnimationFrame(frame); if (params.get('sala')) { openOnline(); oMsg('Te han invitado a la sala ' + $('jCode').value + '. Pulsa «Unirse».'); } };
(document.fonts ? document.fonts.load('700 20px Fredoka').catch(() => {}) : Promise.resolve()).finally(boot);

// vista cenital (pruebas)
let topCam = null;
function topView(on) { if (!on) { topCam = null; return; } const S = app.race.track.S; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const s of S) { x0 = Math.min(x0, s.p.x); x1 = Math.max(x1, s.p.x); z0 = Math.min(z0, s.p.z); z1 = Math.max(z1, s.p.z); }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, a = innerWidth / innerHeight; let hw = (x1 - x0) / 2 + 40, hh = (z1 - z0) / 2 + 40; if (hw / hh > a) hh = hw / a; else hw = hh * a;
  topCam = new THREE.OrthographicCamera(-hw, hw, hh, -hh, 1, 2000); topCam.position.set(cx, 900, cz); topCam.up.set(0, 0, -1); topCam.lookAt(cx, 0, cz); app.race.scene.fog && (app.race.scene._fog = app.race.scene.fog); app.race.scene.fog = null; }
// ganchos para pruebas automáticas
window.__calles = {
  app, CHARS, CUPS, save,
  get state() { return app.state; }, get race() { return app.race; }, get fps() { return fps; }, get net() { return app.net; },
  setSpeed(n) { app.speed = n; }, setAutopilot(v) { app.autopilot = v; },
  pickChar(id) { app.playerChar = charOf(id); save.char = id; }, setName(n) { save.name = n; $('tName').value = n; },
  quick(id) { startQuick(CUPS.find(c => c.id === id)); },
  give(item) { const P = app.race.player; P.item = item; P.rollT = 0; },
  forceFinish() { const R = app.race; for (const k of R.karts) if (!k.finished && k.sim) { k.finished = true; k.finishTime = R.raceT + k.place; if (R.net) R.net.send({ t: 'fin', id: k.netId, t2: k.finishTime }); } },
  kartScreenY() { const R = app.race, v = R.player.mesh.position.clone(); v.y += 1.0; v.project(R.camera); return +((1 - v.y) / 2).toFixed(3); },
  topView, get renderInfo() { const i = renderer.info.render; return { calls: i.calls, tris: i.triangles }; }, get pr() { return renderer.getPixelRatio(); },
  hostStart, openOnline, openLobby, openRoutes, openRecords, openChars, goTitle,
  setPad(v) { padSteer = v; }, setPeerServer(o) { CONFIG.peerServer = o; }, get padSteer() { return padSteer; }, get arrowSteer() { return arrowSteer(); }, get steerIn() { return app.race ? app.race.input.steer : 0; }, get quality() { return { qLevel, pr: renderer.getPixelRatio(), canvas: [renderer.domElement.width, renderer.domElement.height] }; },
  trackShape(id) { const T = buildTrack(CUPS.find(c => c.id === id), false, { hi: false }); return { S: T.S.map(s => [s.p.x, s.p.z, s.w, s.wall, s.p.y]), L: T.L }; },
};

// ======================================================================
//  MOCHI RIVALS · modo "prueba de torneo" (añadido; ?rivals=1&pj=<id>&rv=a,b,c,d,e&barrio=<n>)
//  Corre 1 vuelta contra los rivales del torneo y devuelve la clasificación al menú de Mochi Rivals.
// ======================================================================
if (params.has('rivals')) {
  CONFIG.laps = 1;
  const pj = charOf(params.get('pj') || 'mochi'); app.playerChar = pj;
  const rv = (params.get('rv') || '').split(',').map(id => CHARS.find(c => c.id === id)).filter(Boolean);
  const cup = CUPS[(+params.get('barrio') || 0) % CUPS.length];
  const grid = [...rv.map((ch, i) => ({ ch, kind: 'bot', name: ch.name, id: 'b' + i })), { ch: pj, kind: 'me', name: 'Tú', id: 'me' }];
  app.onRaceEnd = (order, stats) => {
    app.lastStats = stats; app.lastResults = order;
    try { localStorage.setItem('mr_carrera', JSON.stringify({ t: Date.now(), order: order.map(o => ({ id: o.isPlayer ? 'me' : o.ch.id, time: o.time })) })); } catch (e) {}
    setTimeout(() => {
      showResults(order);
      const back = () => { endRaceObj(); location.href = '../index.html?vuelta=carrera'; };
      for (const id of ['rNext', 'rMenu']) { const b = $(id), n = b.cloneNode(true); b.replaceWith(n); }
      $('rNext').textContent = 'Volver a Mochi Rivals'; $('rNext').style.display = ''; $('rNext').addEventListener('click', back);
      $('rMenu').style.display = 'none';
    }, 400);
  };
  setTimeout(() => { Audio.init(); startRace(cup, grid, null); }, 300);
}
