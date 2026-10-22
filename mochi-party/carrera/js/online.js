// ======================================================================
//  MOCHI RIVALS · modo online P2P (PeerJS, como la carrera)
//  Anfitrión crea sala (código de 4 letras) · 2-6 amigos · huecos con IA
//  Cada cliente simula a su mochi y difunde su estado; el anfitrión simula la IA,
//  decide el final, los resultados y los puntos del torneo.
// ======================================================================
import { run, Audio } from './core3d.js?v=m10';
import { CHARS } from './data.js';
import { Net, netAvailable } from './net-rivals.js';
const $ = id => document.getElementById(id);
const Q = new URLSearchParams(location.search);
const EVS = [{ id: 'planetas', name: 'Saltos Planetarios', icon: '🪐' }, { id: 'vallas', name: 'Vallas Serpiente', icon: '🐍' }, { id: 'caida', name: 'Caída al Núcleo', icon: '🌋' }, { id: 'nado', name: 'Nado en Gelatina', icon: '🫧' }];
const PTS = [10, 7, 5, 3, 2, 1];
const chOf = id => CHARS.find(c => c.id === id) || CHARS[0];
const esc = s => String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]);
let net = null, myCh = Q.get('pj') && CHARS.some(c => c.id === Q.get('pj')) ? Q.get('pj') : (localStorage.getItem('mr_on_ch') || 'mochi');
let cfg = { mode: 'torneo', ev: 'planetas' }, T = null, E = null, cur = null, ready = new Set(), readyTO = 0, inGame = false;
$('name').value = localStorage.getItem('mr_on_name') || '';

function show(id) { $('ol').classList.toggle('on', !!id); document.querySelectorAll('#ol .scr').forEach(s => s.classList.toggle('on', s.id === id)); }
function chars(box, sel, taken = []) {
  $(box).innerHTML = CHARS.map(c => `<button data-c="${c.id}" class="${c.id === sel ? 'on' : ''} ${taken.includes(c.id) && c.id !== sel ? 'taken' : ''}"><i style="background:${c.color}"></i>${c.name}</button>`).join('');
}
chars('chHome', myCh);
$('chHome').onclick = e => { const b = e.target.closest('button'); if (!b) return; myCh = b.dataset.c; localStorage.setItem('mr_on_ch', myCh); chars('chHome', myCh); };
$('chRoom').onclick = e => { const b = e.target.closest('button'); if (!b || !net) return; myCh = b.dataset.c; localStorage.setItem('mr_on_ch', myCh); net.pick(myCh); room(); };
$('bBack').onclick = $('bMsgHome').onclick = () => { if (net) net.close(); location.href = '../index.html'; };
$('bMsgOnline').onclick = () => { location.href = 'online.html' + location.search; };
const myName = () => { const n = ($('name').value || '').trim().slice(0, 12) || 'Jugador'; localStorage.setItem('mr_on_name', n); return n; };
const ERR = { nosala: 'No hay ninguna sala con ese código. ¿Lo has escrito bien?', llena: 'La sala está llena (máximo 6 jugadores).', empezada: 'Esa sala está en plena partida. Espera a que vuelvan a la sala.', broker: 'No se pudo conectar con el servidor de emparejamiento. Revisa tu conexión e inténtalo otra vez.', codigo: 'El código tiene 4 letras.' };

// ---------------- crear / unirse ----------------
$('bCreate').onclick = async () => {
  if (!netAvailable()) { $('hErr').textContent = ERR.broker; return; }
  $('bCreate').disabled = true; $('hErr').textContent = 'Creando sala…';
  net = wire(new Net());
  try { await net.create(myName(), myCh); $('hErr').textContent = ''; room(); }
  catch (e) { $('hErr').textContent = ERR[e.message] || ERR.broker; net = null; }
  $('bCreate').disabled = false;
};
$('bJoin').onclick = async () => {
  if (!netAvailable()) { $('hErr').textContent = ERR.broker; return; }
  $('bJoin').disabled = true; $('hErr').textContent = 'Buscando la sala…';
  net = wire(new Net());
  try { await net.join($('jCode').value, myName(), myCh); seenHost = Date.now(); $('hErr').textContent = ''; room(); }
  catch (e) { $('hErr').textContent = ERR[e.message] || ERR.broker; try { net.close(); } catch (x) {} net = null; }
  $('bJoin').disabled = false;
};
$('jCode').addEventListener('keydown', e => { if (e.key === 'Enter') $('bJoin').click(); });
$('bLeave').onclick = () => { net.close(); net = null; show('sHome'); };
addEventListener('beforeunload', () => { try { net && net.close(); } catch (e) {} });

// ---------------- sala ----------------
function room() {
  if (!net) return; inGame = false; show('sRoom');
  $('rCode').textContent = net.code; const H = net.isHost;
  $('rList').innerHTML = net.players.map(p => `<div class="${p.id === net.myId ? 'me' : ''}"><i style="background:${chOf(p.ch).color}"></i>${p.host ? '👑 ' : '🎮 '}${esc(p.name)}<small style="margin-left:auto;color:#a888c8">${chOf(p.ch).name}${p.id === net.myId ? ' · tú' : ''}</small></div>`).join('')
    + Array.from({ length: Math.max(0, 6 - net.players.length) }, () => `<div class="ai">🤖 Mochi IA (hueco libre)</div>`).join('');
  chars('chRoom', myCh, net.players.map(p => p.ch));
  $('rHost').style.display = H ? 'flex' : 'none'; $('bStart').style.display = H ? '' : 'none';
  document.querySelectorAll('#rMode button').forEach(b => b.classList.toggle('on', b.dataset.m === cfg.mode));
  $('rEv').style.display = cfg.mode === 'una' ? 'flex' : 'none';
  $('rEv').innerHTML = EVS.map(e => `<button data-e="${e.id}" class="${e.id === cfg.ev ? 'on' : ''}">${e.icon} ${e.name}</button>`).join('');
  const what = cfg.mode === 'torneo' ? 'Torneo de 4 pruebas' : 'Una prueba: ' + EVS.find(e => e.id === cfg.ev).name;
  $('rInfo').textContent = H ? (net.players.length < 2 ? 'Esperando amigos (puedes empezar tú solo con IA)' : `${net.players.length} jugadores · ${what}`) : `${what} · Esperando a que el anfitrión empiece`;
}
$('rMode').onclick = e => { const b = e.target.closest('button'); if (!b) return; cfg.mode = b.dataset.m; net.send({ t: 'cfg', cfg }); room(); };
$('rEv').onclick = e => { const b = e.target.closest('button'); if (!b) return; cfg.ev = b.dataset.e; net.send({ t: 'cfg', cfg }); room(); };
$('bStart').onclick = () => { Audio.init(); T = { list: cfg.mode === 'torneo' ? EVS.map(e => e.id) : [cfg.ev], round: 0, pts: {}, who: {} }; net.started = true; nextRound(); };

// ---------------- partida ----------------
function nextRound() {
  const ev = T.list[T.round];
  const humans = net.players.map(p => ({ id: p.id, ch: p.ch, name: p.name, human: true, skill: 1 }));
  const used = new Set(humans.map(h => h.ch)); const free = CHARS.filter(c => !used.has(c.id)).sort(() => Math.random() - .5);
  const ai = free.slice(0, 6 - humans.length).map((c, i) => ({ id: 'ia-' + c.id, ch: c.id, name: c.name, human: false, skill: +(.55 + Math.random() * .37).toFixed(2) }));
  const msg = { t: 'start', ev, racers: [...humans, ...ai].slice(0, 6), seed: Math.random() * 1e9 | 0, round: T.round, total: T.list.length, mode: cfg.mode };
  ready = new Set(['h']); net.send(msg); begin(msg);
  clearTimeout(readyTO); readyTO = setTimeout(goAll, 15000); // si alguien tarda demasiado, empezamos igualmente
}
function checkReady() { if (!net || !net.isHost || !E || E.phase !== 'wait') return; if (net.players.every(p => ready.has(p.id))) goAll(); }
function goAll() { clearTimeout(readyTO); if (!E || E.phase !== 'wait') return; net.send({ t: 'go' }); E.go(); }
async function begin(msg) {
  cur = msg; inGame = true; if (E) { E.stop(); E = null; }
  show('sWait'); $('wTitle').textContent = `${EVS.find(e => e.id === msg.ev).icon} ${EVS.find(e => e.id === msg.ev).name}` + (msg.total > 1 ? ` · ${msg.round + 1}/${msg.total}` : ''); $('wInfo').textContent = 'Esperando a los demás jugadores';
  const mod = await import(`./ev-${msg.ev}.js?v=m10`);
  if (cur !== msg) return;
  const racers = msg.racers.map(r => ({ ...r, me: r.id === net.myId }));
  // un jugador que se fue antes de cargar: lo lleva la IA
  E = run(mod.default, { racers, seed: msg.seed, wait: true, net: { isHost: net.isHost, send: d => net && net.send(d) }, onEnd: res => { if (net.isHost) hostEnd(res); } });
  for (const r of msg.racers) if (r.human && !net.players.some(p => p.id === r.id)) E.dropHuman(r.id);
  show(null); E.ui.banner(net.isHost ? '¡Que no se escape nadie!' : 'Esperando la salida…', 1500);
  if (net.isHost) checkReady(); else net.send({ t: 'ready' });
}
function hostEnd(order) {
  const names = {}; for (const r of cur.racers) { const here = net.players.some(p => p.id === r.id); names[r.id] = { name: r.name + (r.human && !here ? ' (se fue · IA)' : ''), ch: r.ch, human: r.human && here }; }
  if (cur.mode === 'torneo') order.forEach((o, i) => { T.pts[o.id] = (T.pts[o.id] || 0) + PTS[i]; T.who[o.id] = names[o.id]; });
  const pod = { t: 'pod', order, names, pts: cur.mode === 'torneo' ? T.pts : null, who: T.who, round: T.round, total: T.list.length, ev: cur.ev };
  net.send(pod); podio(pod);
}
function podio(d) {
  // antes del podio: celebración en la pista (el ganador salta de alegría, los demás aplauden)
  if (E && E.celebrate && !E.celeb && !E.stopped) { const E0 = E; E0.celebrate(d.order, () => { if (E === E0) podio(d); }); return; }
  if (E) { E.stop(); E = null; } inGame = false; show('sPodio');
  const ev = EVS.find(e => e.id === d.ev), myPos = d.order.findIndex(o => o.id === net.myId) + 1, last = d.round + 1 >= d.total;
  $('pTitle').textContent = `${ev.icon} ${myPos === 1 ? '¡HAS GANADO!' : myPos ? `¡Has quedado ${myPos}º!` : 'Resultados'}`;
  $('pSub').textContent = ev.name + (d.total > 1 ? ` · prueba ${d.round + 1}/${d.total}` : '');
  const nm = id => { const n = d.names[id] || d.who[id] || { name: id, ch: 'mochi' }; return `<span class="dot" style="background:${chOf(n.ch).color}"></span>${n.human === false || id.startsWith('ia-') ? '🤖 ' : '🎮 '}${esc(n.name)}${id === net.myId ? ' (tú)' : ''}`; };
  $('pRes').innerHTML = d.order.map((o, i) => `<tr class="${o.id === net.myId ? 'me' : ''}" style="animation-delay:${.15 + i * .12}s"><td>${['🥇', '🥈', '🥉'][i] || (i + 1) + 'º'}</td><td>${nm(o.id)}</td><td class="n">${o.fin ? o.time.toFixed(1) + ' s' : 'no llegó'}</td></tr>`).join('');
  const tot = d.pts ? Object.entries(d.pts).sort((a, b) => b[1] - a[1]) : [];
  $('pTotT').style.display = $('pTot').style.display = tot.length ? '' : 'none';
  $('pTotT').textContent = last && d.pts ? '🏆 Clasificación final del torneo' : 'Clasificación del torneo';
  $('pTot').innerHTML = tot.map(([id, p], i) => `<tr class="${id === net.myId ? 'me' : ''}" style="animation-delay:${.6 + i * .12}s"><td>${i + 1}º</td><td>${nm(id)}</td><td class="n">${p} pts</td></tr>`).join('');
  if (last && d.pts && tot[0]) { const champ = tot[0][0]; $('pTitle').textContent = champ === net.myId ? '🏆 ¡Campeón de Mochi Rivals!' : `🏆 Gana ${(d.who[champ] || d.names[champ] || {}).name}`; }
  const H = net.isHost; $('bNext').style.display = H && !last ? '' : 'none'; $('bRoom').style.display = H ? '' : 'none'; $('pWait').style.display = H ? 'none' : '';
  $('bNext').textContent = `Siguiente prueba (${d.round + 2}/${d.total})`;
  Audio.sfxPlay(myPos === 1 ? 'cheer' : 'pop');
}
$('bNext').onclick = () => { T.round++; nextRound(); };
$('bRoom').onclick = () => { net.started = false; net.send({ t: 'room' }); room(); };

// ---------------- red ----------------
function wire(n) {
  n.on('lobby', () => { if (!inGame && document.querySelector('#sRoom.on')) room(); if (n.isHost) n.send({ t: 'cfg', cfg }); });
  n.on('msg', d => {
    if (n.isHost) seen[d.from] = Date.now(); else seenHost = Date.now();
    if (d.t === 'ping') return;
    if (d.t === 'st') { if (E) E.applySnap(d.s); return; }
    if (n.isHost) { if (d.t === 'ready') { ready.add(d.from); checkReady(); } return; }
    if (d.t === 'cfg') { cfg = d.cfg; if (document.querySelector('#sRoom.on')) room(); }
    else if (d.t === 'start') begin(d);
    else if (d.t === 'go') { if (E) E.go(); else setTimeout(() => E && E.go(), 300); }
    else if (d.t === 'pod') podio(d);
    else if (d.t === 'room') room();
    else if (d.t === 'left') { if (E) E.dropHuman(d.id); }
  });
  n.on('left', (id, name) => { if (E) E.dropHuman(id); ready.delete(id); checkReady(); if (!E && !inGame) { $('rErr').textContent = `${name || 'Un jugador'} ha salido de la sala.`; setTimeout(() => $('rErr').textContent = '', 3000); } });
  n.on('hostgone', () => { if (E) { E.stop(); E = null; } inGame = false; net = null; show('sMsg'); $('mTitle').textContent = '😢 El anfitrión se ha ido'; $('mText').textContent = 'La sala se ha cerrado porque el anfitrión se desconectó. Podéis crear otra sala cuando queráis.'; });
  return n;
}
// latido: PeerJS tarda mucho en notar un cierre brusco (pestaña cerrada, móvil sin cobertura)
const seen = {}; let seenHost = Date.now();
setInterval(() => {
  if (!net || !net.code) return; net.send({ t: 'ping' }); const now = Date.now();
  if (net.isHost) { for (const p of net.players) if (p.id !== 'h') { seen[p.id] ??= now; if (now - seen[p.id] > 9000) { const c = net.conns.get(p.id); delete seen[p.id]; net._lost(p.id); try { c && c.close(); } catch (e) {} } } }
  else if (net.myId && now - seenHost > 10000) { net.alive = false; net.emit('hostgone'); }
}, 2000);
window.__on = { get net() { return net; }, get E() { return E; }, get T() { return T; } };
show('sHome');
