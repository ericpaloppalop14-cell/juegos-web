'use strict';
/* Menú, selección de mochi, torneo y podio */
(() => {
const { CHARS, CH, drawMochi, pick, hint } = MR, P = PRUEBAS;
const $ = id => document.getElementById(id);
const Q = new URLSearchParams(location.search);
const EV = [
  { id: 'carrera', name: 'Carrera de Coches', icon: '🏎️', desc: 'Una vuelta por las calles de la ciudad gelatina, con peatones locos y objetos (es la carrera de Mochi Race).', ext: true },
  { id: 'planetas', ...pick0(P.planetas) }, { id: 'vallas', ...pick0(P.vallas) }, { id: 'caida', ...pick0(P.caida) }, { id: 'nado', ...pick0(P.nado) },
  { id: 'anillos', name: 'Vuelo de Anillos', icon: '💫', desc: 'Vuela hacia delante por el cielo de golosinas y atraviesa anillos: cada uno te acelera y el dorado ⭐ vale más.', def: true },
];
function pick0(d) { return { name: d.name, icon: d.icon, desc: d.desc, def: d }; }
const PTS = [10, 7, 5, 3, 2, 1];
const KEY = 'mr_estado';
let S = load();
function load() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
let pj = localStorage.getItem('mr_pj') || 'mochi';
function newSession(mode, evIdx) {
  const rv = CHARS.filter(c => c.id !== pj).sort(() => Math.random() - .5).slice(0, 5).map(c => c.id);
  const skill = {}; rv.forEach(id => skill[id] = +(0.35 + Math.random() * 0.6).toFixed(2));
  S = { mode, pj, rv, skill, idx: evIdx, pts: { me: 0, ...Object.fromEntries(rv.map(id => [id, 0])) }, done: [] }; save();
}
function show(id) { document.querySelectorAll('.scr').forEach(s => s.classList.toggle('on', s.id === id)); $('topbtn').style.display = id ? 'none' : 'block'; if (id) { const X = MR.X(); X.setTransform(1, 0, 0, 1, 0, 0); X.clearRect(0, 0, 9999, 9999); } }
function mini(cv, ch, mood) { const x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height); drawMochi(x, cv.width / 2, cv.height * .58, cv.width * .3, { ch, mood }); }
const nm = id => id === 'me' ? 'Tú' : CH(id).name, chOf = id => CH(id === 'me' ? S.pj : id);

// ---------- menú ----------
function menu() {
  show('sMenu'); const ch = CH(pj); $('menuWho').innerHTML = `${ch.name}<small>${ch.pers}</small>`;
  const L = $('evList'); L.innerHTML = '';
  EV.forEach((e, i) => { const b = document.createElement('button'); b.className = 'ev'; b.innerHTML = `<b>${e.icon}</b>${e.name}<small>Prueba suelta</small>`; b.onclick = () => { newSession('suelta', i); intro(); }; L.appendChild(b); });
}
(function anim() { if ($('sChars').classList.contains('on')) document.querySelectorAll('#charGrid canvas').forEach(c => mini(c, CH(c.dataset.id))); requestAnimationFrame(anim); })();
$('bTorneo').onclick = () => { newSession('torneo', 0); intro(); };
$('bPj').onclick = () => chars();
$('bOnline').onclick = () => { location.href = 'carrera/online.html?pj=' + ((S && S.pj) || 'mochi') + (Q.has('auto') ? '&auto' : ''); };
function chars() {
  show('sChars'); const G = $('charGrid'); G.innerHTML = '';
  CHARS.forEach(c => { const b = document.createElement('button'); b.className = c.id === pj ? 'on' : ''; b.innerHTML = `<canvas width="116" height="116" data-id="${c.id}"></canvas>`; b.onclick = () => { pj = c.id; localStorage.setItem('mr_pj', pj); chars(); }; G.appendChild(b); });
  const c = CH(pj); $('charWho').innerHTML = `${c.name}<small>${c.pers} · «${c.lines[0]}»</small>`;
}
$('bCharOk').onclick = () => menu();

// ---------- presentación de la prueba ----------
function intro() {
  const e = EV[S.idx]; show('sIntro');
  $('iIcon').textContent = e.icon; $('iName').textContent = (S.mode === 'torneo' ? `Prueba ${S.idx + 1}/${EV.length} · ` : '') + e.name; $('iDesc').textContent = e.desc;
  const r = CH(pick(S.rv)); $('iQuote').innerHTML = `<b>${r.name}:</b> «${pick(r.lines)}»`;
  $('iRivals').innerHTML = '<tr><td>Rivales</td><td>Personalidad</td>' + (S.mode === 'torneo' ? '<td class="n">Pts</td>' : '') + '</tr>' + S.rv.map(id => `<tr><td><span class="dot" style="background:${CH(id).color}"></span>${CH(id).name}</td><td>${CH(id).pers}</td>${S.mode === 'torneo' ? `<td class="n">${S.pts[id]}</td>` : ''}</tr>`).join('');
}
$('bIntroBack').onclick = () => menu();
$('bGo').onclick = () => play();
function play() {
  const e = EV[S.idx];
  if (e.ext) { // la carrera de coches vive en carrera/ (Mochi Race) y vuelve aquí con el resultado
    localStorage.removeItem('mr_carrera');
    location.href = `carrera/index.html?rivals=1&pj=${S.pj}&rv=${S.rv.join(',')}&barrio=${Math.floor(Math.random() * 4)}${Q.has('auto') ? '&auto' : ''}`; return;
  }
  if (e.def) { // las 4 pruebas 3D viven en carrera/pruebas.html (mismo motor Three.js que la carrera)
    localStorage.removeItem('mr_res');
    location.href = `carrera/pruebas.html?p=${e.id}&pj=${S.pj}&rv=${S.rv.join(',')}&sk=${S.rv.map(id => (S.skill[id] || .6).toFixed(2)).join(',')}${Q.has('auto') ? '&auto' : ''}${Q.get('x') ? '&x=' + Q.get('x') : ''}${Q.get('q') ? '&q=' + Q.get('q') : ''}`; return;
  }
  show(null);
  const racers = [{ id: 'me', me: true, ch: CH(S.pj), skill: 1 }, ...S.rv.map(id => ({ id, ch: CH(id), skill: S.skill[id] }))];
  window.__ev = P.runEvent(e.def, racers, res => podio(res));
}
$('topbtn').onclick = () => location.reload();

// ---------- podio ----------
function podio(res) {
  const e = EV[S.idx]; show('sPodio');
  res.forEach((r, i) => S.pts[r.id] = (S.pts[r.id] || 0) + (S.mode === 'torneo' ? PTS[i] : 0));
  S.done.push({ ev: e.id, res }); save();
  const meP = res.findIndex(r => r.id === 'me') + 1;
  $('pTitle').textContent = e.icon + ' ' + e.name + (meP === 1 ? ' · ¡GANAS!' : ` · ${meP}º`);
  drawPodio(res.slice(0, 3).map(r => r.id));
  const w = res[0].id === 'me' ? CH(res[1].id) : CH(res[0].id);
  $('pQuote').innerHTML = res[0].id === 'me' ? `<b>${w.name}:</b> «${pick(['¡Ha sido suerte!', 'La próxima no te escapas.', 'Vale, vale… bien jugado.', '¡Exijo la revancha!'])}»` : `<b>${w.name}:</b> «${pick(w.lines)}»`;
  const last = S.mode !== 'torneo' || S.idx >= EV.length - 1;
  let h = '<tr><td></td><td>Mochi</td><td class="n">Tiempo</td>' + (S.mode === 'torneo' ? '<td class="n">+Pts</td><td class="n">Total</td>' : '') + '</tr>';
  res.forEach((r, i) => { h += `<tr class="${r.id === 'me' ? 'me' : ''}"><td>${i + 1}º</td><td><span class="dot" style="background:${chOf(r.id).color}"></span>${nm(r.id)}</td><td class="n">${r.time.toFixed(1)} s${r.fin === false ? '*' : ''}</td>${S.mode === 'torneo' ? `<td class="n">+${PTS[i]}</td><td class="n">${S.pts[r.id]}</td>` : ''}</tr>`; });
  $('pTable').innerHTML = h;
  $('bNext').textContent = S.mode === 'torneo' ? (last ? '🏆 Ver clasificación final' : `Siguiente prueba (${S.idx + 2}/${EV.length})`) : 'Repetir';
  $('bNext').onclick = () => { if (S.mode !== 'torneo') { intro(); return; } if (last) final(); else { S.idx++; save(); intro(); } };
}
function final() {
  show('sPodio'); const order = Object.entries(S.pts).sort((a, b) => b[1] - a[1]).map(([id, p]) => ({ id, p }));
  const meP = order.findIndex(o => o.id === 'me') + 1;
  $('pTitle').textContent = meP === 1 ? '🏆 ¡Campeón de Mochi Rivals!' : `Torneo terminado · ${meP}º`;
  drawPodio(order.slice(0, 3).map(o => o.id));
  const w = CH(order[0].id === 'me' ? S.rv[0] : order[0].id); $('pQuote').innerHTML = `<b>${w.name}:</b> «${meP === 1 ? 'Te has ganado el trofeo de gelatina. Por esta vez.' : pick(w.lines)}»`;
  $('pTable').innerHTML = '<tr><td></td><td>Mochi</td><td class="n">Puntos</td></tr>' + order.map((o, i) => `<tr class="${o.id === 'me' ? 'me' : ''}"><td>${i + 1}º</td><td><span class="dot" style="background:${chOf(o.id).color}"></span>${nm(o.id)}</td><td class="n">${o.p}</td></tr>`).join('');
  $('bNext').textContent = 'Nuevo torneo'; $('bNext').onclick = () => { newSession('torneo', 0); intro(); };
  S.mode = 'fin'; save();
}
$('bPodioMenu').onclick = () => menu();
function drawPodio(ids) {
  const cv = $('podioCv'), x = cv.getContext('2d'); let fr = 0;
  const draw = () => { if (!$('sPodio').classList.contains('on') || fr++ > 900) return;
    x.clearRect(0, 0, cv.width, cv.height);
    const steps = [{ i: 1, x: 120, h: 120, c: '#c8d2e8' }, { i: 0, x: 340, h: 170, c: '#ffd23a' }, { i: 2, x: 560, h: 90, c: '#ffb38a' }];
    for (const s of steps) { const id = ids[s.i]; if (!id) continue; x.fillStyle = s.c; x.beginPath(); x.roundRect(s.x - 95, 400 - s.h, 190, s.h, 16); x.fill(); x.fillStyle = '#fff'; x.font = '700 48px Fredoka'; x.textAlign = 'center'; x.fillText(s.i + 1, s.x, 400 - s.h + 60);
      const jump = Math.abs(Math.sin(performance.now() / 300 + s.i)) * (s.i === 0 ? 18 : 6);
      drawMochi(x, s.x, 400 - s.h - 62 - jump, 58, { ch: chOf(id), mood: s.i === 0 ? 'happy' : 'ok', seed: s.i });
      x.font = '700 28px Fredoka'; x.fillStyle = '#6a3f9a'; x.fillText(nm(id), s.x, 400 - s.h - 140 - jump); }
    for (let i = 0; i < 30; i++) { const t = performance.now() / 1000; x.fillStyle = ['#ff9cc8', '#7ee3c4', '#ffe27a', '#b9a2f7'][i % 4]; x.fillRect((i * 97 + t * 40) % 680, (i * 53 + t * 120) % 260, 8, 12); }
    requestAnimationFrame(draw); };
  draw();
}

// ---------- vuelta desde la carrera de coches ----------
if (Q.get('vuelta') === 'carrera' && S) {
  history.replaceState(null, '', location.pathname + (Q.has('auto') ? '?auto' : ''));
  let r = null; try { r = JSON.parse(localStorage.getItem('mr_carrera')); } catch (e) {}
  if (r && r.order) { const res = r.order.map(o => ({ id: o.id, time: o.time, fin: true })); res.sort((a, b) => a.time - b.time); podio(res); } else menu();
} else if (Q.get('vuelta') && S && EV.some(e => e.id === Q.get('vuelta'))) {
  history.replaceState(null, '', location.pathname + (Q.has('auto') ? '?auto' : ''));
  let r = null; try { r = JSON.parse(localStorage.getItem('mr_res')); } catch (e) {}
  if (r && r.order && r.ev === EV[S.idx].id) podio(r.order.map(o => ({ id: o.id, time: o.time, fin: o.fin }))); else menu();
} else menu();
window.__mr = { get S() { return S; }, EV, play, intro, menu, get ev() { return window.__ev; } };
})();
