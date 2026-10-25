// ======================================================================
//  CAPA DE MENÚS compartida: portada estilo Mochi, selección de personaje,
//  partida en solitario con bots y salas multijugador con código (PeerJS).
// ======================================================================
import * as THREE from 'three';
import { CHARS, chOf } from './chars.js?v=v21';
import { makeCharacter, animCharacter } from './gfx.js?v=v21';
import { Net, netAvailable, CONFIG as NETCFG } from './net.js?v=v21';
import { Sfx } from './sfx.js?v=v21';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]);
const letters = s => [...s].map(ch => ch === ' ' ? ' ' : `<span class="l">${ch}</span>`).join('');
const BOTNAMES = ['Bolita', 'Gomi', 'Pompi', 'Nube', 'Tofu', 'Mimi', 'Kiko', 'Lulú', 'Pipo', 'Chispa', 'Miel', 'Dango', 'Yuzu', 'Pepa'];
export const thumbs = {};

function makeThumbs() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 160;
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
  const s = new THREE.Scene(); s.add(new THREE.HemisphereLight('#fff', '#d8b8f0', 2)); const d = new THREE.DirectionalLight('#fff', 2); d.position.set(2, 4, 5); s.add(d);
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50); cam.position.set(0, 1.6, 5.4); cam.lookAt(0, 0.95, 0);
  for (const c of CHARS) { const m = makeCharacter(c); m.rotation.y = -0.35; animCharacter(m, 0.5); s.add(m); r.render(s, cam); thumbs[c.id] = cv.toDataURL(); s.remove(m); }
  r.dispose();
}

export function createShell(G) {
  // G: { id, titleA, titleB, sub, how (html), prefix, onPreview(chId), start(cfg), onNetMsg(d), stop() }
  NETCFG.peerPrefix = G.prefix;
  const ui = document.createElement('div'); ui.id = 'ui'; document.body.appendChild(ui);
  ui.innerHTML = `
  <div class="topbar"><button class="round" id="bQuit" style="visibility:hidden">✕</button><button class="round" id="bMute">${Sfx.muted ? '🔇' : '🔊'}</button></div>
  <div id="toast"></div><div class="big-msg" id="bigMsg"></div>
  <section class="scr on" id="sHome">
    <div class="logo"><span class="a">${letters(G.titleA)}</span><span class="b">${letters(G.titleB)}</span></div>
    <div class="sub">${G.sub}</div>
    <div class="grow"></div>
    <button class="btn" id="bChar"><img id="myThumb" style="width:34px;height:34px;border-radius:50%"> <span id="myName">Mochi</span> ✎</button>
    <div class="lbl">Rivales</div><div class="chips" id="cBots"></div>
    <div class="lbl">Dificultad de los bots</div><div class="chips" id="cDiff"></div>
    <div class="lbl mapl">Mapa</div><div class="chips" id="cMap"></div>
    <div class="row"><button class="btn big" id="bSolo">▶ Jugar</button></div>
    <div class="row"><button class="btn lila" id="bMulti">👥 Multijugador</button><button class="btn" id="bHow">❓ Cómo se juega</button><button class="btn" id="bSet">⚙️ Ajustes</button></div>
  </section>
  <section class="scr" id="sChars">
    <div class="chartop"><button class="btn" id="bCharBack">‹ Volver</button><h3>Personajes</h3><span style="width:80px"></span></div>
    <div class="grow"></div>
    <div class="charinfo"><div class="nm" id="cName"></div><div class="ds" id="cDesc"></div></div>
    <div class="grid" id="cGrid"></div>
    <div class="row"><button class="btn big" id="bCharOk">¡Elegir!</button></div>
  </section>
  <section class="scr" id="sSet" style="justify-content:center"><div class="card"><h2>Ajustes</h2><div class="lbl" style="color:#b0508a;text-shadow:none">✋ Modo zurdo</div><div class="chips" id="cZurdo"></div><div class="ds" style="font-size:13px;opacity:.8;margin-top:6px">Activado: joystick abajo a la izquierda (con Salto encima) y números a la derecha.</div><div class="row"><button class="btn big" id="bSetOk">Listo</button></div></div></section>
  <section class="scr" id="sHow" style="justify-content:center"><div class="card"><h2>Cómo se juega</h2>${G.how}<div class="row"><button class="btn big" id="bHowOk">¡Entendido!</button></div></div></section>
  <section class="scr" id="sMulti" style="justify-content:center"><div class="card"><h2>Multijugador</h2>
    <div class="lbl" style="color:#b08ac8;text-shadow:none">Tu nombre</div><input class="txt" id="iName" maxlength="12" placeholder="Jugador">
    <div class="row"><button class="btn big" id="bCreate">Crear sala</button></div>
    <div class="lbl" style="color:#b08ac8;text-shadow:none">¿Tienes un código?</div>
    <div class="row" style="margin-top:4px"><input class="txt code" id="iCode" maxlength="4" placeholder="ABCD"><button class="btn mint" id="bJoin">Unirse</button></div>
    <div class="err" id="mErr"></div><div class="row"><button class="btn" id="bMultiBack">‹ Volver</button></div></div></section>
  <section class="scr" id="sRoom" style="justify-content:center"><div class="card">
    <div style="font-weight:700;color:#b08ac8">Código de la sala</div><div class="roomcode" id="rCode">----</div>
    <div style="font-size:14px;color:#b08ac8">Pásaselo a tus amigos para que entren desde «Multijugador»</div>
    <div class="plist" id="rList"></div>
    <div id="rHost"><div class="lbl" style="color:#b08ac8;text-shadow:none;margin-top:0">Rellenar con bots hasta</div><div class="chips" id="rBots"></div>
      <div class="lbl mapl" style="color:#b08ac8;text-shadow:none">Mapa</div><div class="chips" id="rMap"></div></div><div id="rMapG" style="font-weight:700;color:#8b5cc2"></div>
    <div class="err" id="rInfo"></div>
    <div class="row"><button class="btn" id="bLeave">Salir</button><button class="btn big" id="bStart">¡Empezar!</button></div></div></section>
  <section class="scr" id="sOver" style="justify-content:center"><div class="card">
    <h2 id="oTitle">¡Has ganado!</h2><img class="winimg" id="oImg"><div id="oSub" style="font-weight:700;color:#8b5cc2"></div>
    <div class="rank" id="oRank"></div>
    <div class="row"><button class="btn" id="bMenu">Menú</button><button class="btn big" id="bAgain">Revancha</button></div></div></section>`;
  makeThumbs();

  let myCh = localStorage.getItem('ms_ch') || 'mochi'; if (!CHARS.some(c => c.id === myCh)) myCh = 'mochi';
  let pickCh = myCh, nBots = +(localStorage.getItem(G.id + '_bots') || 7), diff = localStorage.getItem(G.id + '_diff') || 'normal';
  let net = null, mode = 'solo', inGame = false, lastCfg = null;
  $('iName').value = localStorage.getItem('ms_name') || '';
  const show = id => { document.querySelectorAll('#ui .scr').forEach(s => s.classList.toggle('on', s.id === id)); $('bQuit').style.visibility = id ? 'hidden' : 'visible'; };
  const myName = () => { const n = ($('iName').value || '').trim().slice(0, 12) || 'Jugador'; localStorage.setItem('ms_name', n); return n; };
  const refreshMe = () => { $('myThumb').src = thumbs[myCh]; $('myName').textContent = chOf(myCh).name; G.onPreview && G.onPreview(myCh); };
  const chips = (box, items, cur, set) => { $(box).innerHTML = items.map(([v, t]) => `<button data-v="${v}" class="${String(v) === String(cur) ? 'on' : ''}">${t}</button>`).join('');
    $(box).onclick = e => { const b = e.target.closest('button'); if (!b) return; Sfx.tap(); set(b.dataset.v); chips(box, items, b.dataset.v, set); }; };
  chips('cBots', [[3, '3'], [5, '5'], [7, '7'], [9, '9']], nBots, v => { nBots = +v; localStorage.setItem(G.id + '_bots', v); });
  chips('cDiff', [['facil', '😊 Fácil'], ['normal', '😼 Normal'], ['dificil', '🔥 Difícil']], diff, v => { diff = v; localStorage.setItem(G.id + '_diff', v); });
  const MAPL = G.maps ? [...G.maps, ['random', '🎲 Al azar']] : null; let map = localStorage.getItem(G.id + '_map') || (MAPL ? MAPL[0][0] : '');
  if (MAPL && !MAPL.some(m => m[0] === map)) map = MAPL[0][0];
  const setMap = v => { map = v; localStorage.setItem(G.id + '_map', v); G.onMap && G.onMap(v); if (net && net.isHost) net.send({ t: 'cfgR', bots: roomBots, map }); };
  if (MAPL) chips('cMap', MAPL, map, setMap); else document.querySelectorAll('.mapl').forEach(e => e.style.display = 'none');
  const realMap = () => map === 'random' ? MAPL[Math.random() * (MAPL.length - 1) | 0][0] : map;
  refreshMe();

  const toastT = { t: 0 };
  const api = {
    toast(msg, ms = 1600) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT.t); toastT.t = setTimeout(() => t.classList.remove('on'), ms); },
    big(msg, ms = 900) { const b = $('bigMsg'); b.textContent = msg; b.classList.add('on'); clearTimeout(api._bt); if (ms) api._bt = setTimeout(() => b.classList.remove('on'), ms); },
    get net() { return net; },
    get myId() { return net ? net.myId : 'h'; },
    get isHost() { return !net || net.isHost; },
    send(d) { if (net) net.send(d); },
    end(res) { // res: { ranking: [ids desc], roster }
      inGame = false; if (net) net.started = false;
      const me = api.myId, win = res.ranking[0], R = res.roster, byId = id => R.find(p => p.id === id);
      const w = byId(win);
      $('oTitle').textContent = !w ? '¡Empate!' : win === me ? '¡Has ganado!' : `¡Gana ${w.name}!`;
      $('oImg').src = w ? thumbs[w.ch] : thumbs[myCh];
      const pos = res.ranking.indexOf(me) + 1; $('oSub').textContent = pos ? `Has quedado ${pos}º de ${res.ranking.length}` : '';
      $('oRank').innerHTML = res.ranking.slice(0, 10).map((id, i) => { const p = byId(id); return `<div class="${id === me ? 'me' : ''}"><b>${i + 1}º</b><img src="${thumbs[p.ch]}">${esc(p.name)}${p.bot ? ' 🤖' : ''}</div>`; }).join('');
      $('bAgain').textContent = mode === 'solo' ? 'Revancha' : (net && net.isHost ? 'Volver a la sala' : 'Volver a la sala');
      setTimeout(() => { show('sOver'); if (win === me) Sfx.win(); }, 1400);
    },
  };

  // ---------- personajes ----------
  function charGrid(taken = []) {
    $('cGrid').innerHTML = CHARS.map(c => `<button data-c="${c.id}" class="${c.id === pickCh ? 'on' : ''} ${taken.includes(c.id) ? 'taken' : ''}"><img src="${thumbs[c.id]}">${c.name}</button>`).join('');
    $('cName').textContent = chOf(pickCh).name; $('cDesc').textContent = chOf(pickCh).desc;
  }
  $('cGrid').onclick = e => { const b = e.target.closest('button'); if (!b) return; Sfx.tap(); pickCh = b.dataset.c; charGrid(); G.onPreview && G.onPreview(pickCh); };
  let charReturn = 'sHome';
  const openChars = ret => { charReturn = ret; pickCh = myCh; charGrid(net ? net.players.filter(p => p.id !== net.myId).map(p => p.ch) : []); show('sChars'); G.onPreview && G.onPreview(pickCh, true); };
  $('bChar').onclick = () => { Sfx.init(); Sfx.tap(); openChars('sHome'); };
  $('bCharBack').onclick = () => { Sfx.tap(); refreshMe(); show(charReturn); };
  $('bCharOk').onclick = () => { Sfx.ok(); myCh = pickCh; localStorage.setItem('ms_ch', myCh); refreshMe(); if (net) { net.pick(myCh); room(); } show(charReturn); };
  // v11: modo zurdo (se guarda en localStorage)
  const applyZurdo = on => document.body.classList.toggle('zurdo', on);
  applyZurdo(localStorage.getItem('hunde_zurdo') === '1');
  chips('cZurdo', [['0', 'No'], ['1', 'Sí']], localStorage.getItem('hunde_zurdo') === '1' ? '1' : '0', v => { localStorage.setItem('hunde_zurdo', v); applyZurdo(v === '1'); });
  $('bSet').onclick = () => { Sfx.init(); Sfx.tap(); show('sSet'); }; $('bSetOk').onclick = () => { Sfx.tap(); show('sHome'); };
  $('bHow').onclick = () => { Sfx.init(); Sfx.tap(); show('sHow'); }; $('bHowOk').onclick = () => { Sfx.tap(); show('sHome'); };
  $('bMute').onclick = () => { $('bMute').textContent = Sfx.toggle() ? '🔇' : '🔊'; };

  // ---------- solo ----------
  function bots(n, used) {
    const free = CHARS.filter(c => !used.has(c.id)).sort(() => Math.random() - 0.5); const names = [...BOTNAMES].sort(() => Math.random() - 0.5);
    const sk = { facil: [0.35, 0.55], normal: [0.55, 0.8], dificil: [0.8, 1.0] }[diff] || [0.55, 0.8];
    return Array.from({ length: n }, (_, i) => { const c = free[i % free.length]; return { id: 'b' + i, name: names[i % names.length], ch: c.id, bot: true, skill: +(sk[0] + Math.random() * (sk[1] - sk[0])).toFixed(2) }; });
  }
  function launch(cfg) { lastCfg = cfg; inGame = true; show(null); G.start(cfg, api); }
  $('bSolo').onclick = () => { Sfx.init(); Sfx.go(); mode = 'solo';
    const roster = [{ id: 'h', name: myName() === 'Jugador' ? 'Tú' : myName(), ch: myCh, bot: false }, ...bots(nBots, new Set([myCh]))];
    launch({ roster, seed: Math.random() * 1e9 | 0, online: false, map: MAPL ? realMap() : null, mode: G.getMode ? G.getMode() : undefined }); };
  $('bQuit').onclick = () => { if (!inGame) return; if (!confirm('¿Salir de la partida?')) return; G.stop(); inGame = false; if (net) { net.close(); net = null; } show('sHome'); refreshMe(); };

  // ---------- multijugador ----------
  const ERR = { nosala: 'No hay ninguna sala con ese código.', llena: 'La sala está llena (máximo 8 personas).', empezada: 'Esa sala está jugando. Espera a que acabe la partida.', broker: 'No se pudo conectar con el servidor de salas. Revisa tu conexión.', codigo: 'El código tiene 4 letras.' };
  let roomBots = 7;
  $('bMulti').onclick = () => { Sfx.init(); Sfx.tap(); $('mErr').textContent = ''; show('sMulti'); };
  $('bMultiBack').onclick = () => { Sfx.tap(); show('sHome'); };
  function wire(n) {
    n.on('lobby', () => { if (!inGame) room(); });
    n.on('msg', d => {
      if (d.t === 'cfgR') { roomBots = d.bots; if (d.map) { map = d.map; G.onMap && G.onMap(map); } if (!inGame) room(); return; }
      if (d.t === 'gstart') { mode = 'online'; launch(d.cfg); return; }
      if (d.t === 'gback') { if (inGame) { G.stop(); inGame = false; } room(); return; }
      G.onNetMsg && G.onNetMsg(d, api);
    });
    n.on('left', (id, name) => { api.toast(`${name || 'Alguien'} se ha ido`); G.onLeft && G.onLeft(id, api); });
    n.on('hostgone', () => { if (inGame) G.stop(); inGame = false; net = null; show('sMulti'); $('mErr').textContent = 'El anfitrión ha cerrado la sala.'; });
    return n;
  }
  $('bCreate').onclick = async () => { if (!netAvailable()) { $('mErr').textContent = ERR.broker; return; }
    $('bCreate').disabled = true; $('mErr').textContent = 'Creando sala…'; net = wire(new Net());
    try { await net.create(myName(), myCh); $('mErr').textContent = ''; mode = 'online'; room(); } catch (e) { $('mErr').textContent = ERR[e.message] || ERR.broker; net = null; }
    $('bCreate').disabled = false; };
  $('bJoin').onclick = async () => { if (!netAvailable()) { $('mErr').textContent = ERR.broker; return; }
    $('bJoin').disabled = true; $('mErr').textContent = 'Buscando la sala…'; net = wire(new Net());
    try { await net.join($('iCode').value, myName(), myCh); $('mErr').textContent = ''; mode = 'online'; room(); } catch (e) { $('mErr').textContent = ERR[e.message] || ERR.broker; try { net.close(); } catch (x) { } net = null; }
    $('bJoin').disabled = false; };
  $('iCode').addEventListener('keydown', e => { if (e.key === 'Enter') $('bJoin').click(); });
  $('bLeave').onclick = () => { Sfx.tap(); if (net) net.close(); net = null; mode = 'solo'; show('sHome'); };
  function room() {
    if (!net) return; show('sRoom'); const H = net.isHost;
    $('rCode').textContent = net.code;
    const total = Math.max(net.players.length, roomBots + 1);
    $('rList').innerHTML = net.players.map(p => `<div class="${p.id === net.myId ? 'me' : ''}"><img src="${thumbs[p.ch] || thumbs.mochi}">${p.host ? '👑 ' : ''}${esc(p.name)}<small style="margin-left:auto;color:#b08ac8">${chOf(p.ch).name}${p.id === net.myId ? ' · tú ✎' : ''}</small></div>`).join('')
      + Array.from({ length: total - net.players.length }, () => `<div class="bot">🤖 Bot (hueco libre)</div>`).join('');
    $('rHost').style.display = H ? '' : 'none'; $('bStart').style.display = H ? '' : 'none';
    if (H) net.send({ t: 'cfgR', bots: roomBots, map });
    if (MAPL) { if (H) chips('rMap', MAPL, map, v => { setMap(v); room(); }); $('rMapG').textContent = H ? '' : 'Mapa: ' + (MAPL.find(m => m[0] === map) || ['', ''])[1]; }
    if (H) chips('rBots', [[1, '2'], [3, '4'], [5, '6'], [7, '8'], [9, '10']], roomBots, v => { roomBots = +v; net.send({ t: 'cfgR', bots: roomBots, map }); room(); });
    $('rInfo').textContent = H ? (net.players.length < 2 ? 'Esperando amigos… (puedes empezar ya con bots)' : `${net.players.length} personas en la sala`) : 'Esperando a que el anfitrión empiece…';
  }
  $('rList').onclick = e => { const d = e.target.closest('.me'); if (d) openChars('sRoom'); };
  $('bStart').onclick = () => {
    if (!net) return; // noche 25-10: evita error si la sala online no llegó a conectarse
    Sfx.init(); Sfx.go(); net.started = true;
    const humans = net.players.map(p => ({ id: p.id, name: p.name, ch: p.ch, bot: false }));
    const nb = Math.max(0, roomBots + 1 - humans.length);
    const cfg = { roster: [...humans, ...bots(nb, new Set(humans.map(h => h.ch)))], seed: Math.random() * 1e9 | 0, online: true, map: MAPL ? realMap() : null, mode: G.getMode ? G.getMode() : undefined };
    net.send({ t: 'gstart', cfg }); launch(cfg);
  };
  $('bAgain').onclick = () => { Sfx.tap(); if (mode === 'solo') { $('bSolo').click(); return; }
    if (net && net.isHost) { net.send({ t: 'gback' }); } G.stop(); room(); };
  $('bMenu').onclick = () => { Sfx.tap(); G.stop(); if (net) { net.close(); net = null; } mode = 'solo'; show('sHome'); refreshMe(); };
  addEventListener('beforeunload', () => { try { net && net.close(); } catch (e) { } });
  // ganchos de prueba
  window.__shell = { api, solo: () => $('bSolo').click(), get inGame() { return inGame; } };
  return api;
}
