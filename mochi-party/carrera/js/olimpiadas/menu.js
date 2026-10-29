// MOCHI PARTY · OLIMPIADAS — pantalla para elegir olimpiada (tarjetas) con tu mochi en 3D
import { CHARS } from '../data.js';
import { OLIMPIADAS } from './catalogo.js?v=o39';
import { saveS, evURL } from './fiesta.js?v=o39';
const $ = id => document.getElementById(id), Q = new URLSearchParams(location.search);
const PERS = { mochi: 'Optimista sin remedio', tiovivo: 'Mareado pero feliz', atomo: 'Hiperactivo y eléctrico', cosmo: 'Soñador galáctico', copito: 'Frío y calculador', burbuja: 'Escurridiza y bromista', lava: 'Competitiva y calentita', tictac: 'Puntual y gruñón', trueno: 'Ruidoso y dramático', disco: 'Fiestera y presumida' };
const LIST = CHARS.filter(c => PERS[c.id]);
let pj = localStorage.getItem('mr_pj') || 'mochi'; if (!LIST.find(c => c.id === pj)) pj = 'mochi';
const med = (() => { try { return JSON.parse(localStorage.getItem('mo_medallas') || '{}'); } catch (e) { return {}; } })();
// ---------- 3D: la misma vitrina del Torneo (js/escena3d.js) ----------
import('../../../js/escena3d.js?v=o39').catch(() => document.body.classList.add('no3d'));
let stK = 0, shownPj = '';
function setHero() { const c = LIST.find(c => c.id === pj); $('who').innerHTML = `${c.name}<small>${PERS[c.id]}</small>`; const e = $('olStage'); const prev = shownPj; shownPj = pj; e.dataset.d = JSON.stringify({ pj, prev }); e.dataset.key = 'ol' + (++stK); }
setHero();
// ---------- personajes ----------
function chars() { const C = $('chars'); C.innerHTML = ''; for (const c of LIST) { const b = document.createElement('button'); b.style.setProperty('--c', c.color); b.title = c.name; b.innerHTML = `<canvas data-mini data-id="${c.id}" width="128" height="128"></canvas>`; b.className = c.id === pj ? 'on' : ''; b.onclick = () => { pj = c.id; localStorage.setItem('mr_pj', pj); setHero(); chars(); }; C.appendChild(b); } }
chars();
// ---------- tarjetas ----------
const G = $('grid');
OLIMPIADAS.forEach((o, i) => { const b = document.createElement('button'); b.className = 'card'; b.style.background = `linear-gradient(150deg,${o.color[0]},${o.color[1]})`; b.style.animationDelay = (i * .06) + 's'; b.dataset.id = o.id;
  b.innerHTML = `<span class="n">${o.pruebas.length} pruebas</span><span class="ic" style="animation-delay:${i * .2}s">${o.icon}</span><b>${o.name}</b><small>${o.lema}</small>${med[o.id] ? `<span class="md">${['🥇', '🥈', '🥉'][med[o.id] - 1] || '🎖️'}</span>` : ''}`;
  b.onclick = () => sheet(o); G.appendChild(b); });
function session(o, mode, idx) {
  const rv = LIST.filter(c => c.id !== pj).sort(() => Math.random() - .5).slice(0, 5).map(c => c.id); const skill = {}; rv.forEach(id => skill[id] = +(0.35 + Math.random() * 0.55).toFixed(2));
  const S = { sid: Date.now(), mode, oid: o.id, idx, pj, rv, skill, pts: { me: 0, ...Object.fromEntries(rv.map(id => [id, 0])) }, res: [], applied: [] }; saveS(S); return S;
}
function sheet(o) {
  $('sh').innerHTML = `<div class="btns top"><button class="btn big" id="bStart">🏅 Empezar ${o.name}</button><button class="btn s" id="bClose">Volver</button></div>
    <div class="hd" style="background:linear-gradient(150deg,${o.color[0]},${o.color[1]})"><span class="ic">${o.icon}</span><div><b>${o.name}</b><small>${o.lema}</small></div></div>
    ${o.pruebas.map((p, i) => `<div class="ev" data-i="${i}" style="animation-delay:${i * .06}s"><span class="ei">${p.icon}</span><div><b>${i + 1}. ${p.name}</b><small>${p.desc}</small></div><span class="go">Suelta ▶</span></div>`).join('')}
    <div class="rv">Compites contra 5 mochis rivales · 10, 7, 5, 3, 2 y 1 puntos por prueba</div>`;
  $('sheet').classList.add('on'); $('sh').scrollTop = 0;
  $('bClose').onclick = () => $('sheet').classList.remove('on');
  $('bStart').onclick = () => { const b = $('bStart'); if (b.disabled) return; b.disabled = true; const S = session(o, 'olimpiada', 0); const go = () => location.href = evURL(S, o.id, o.pruebas[0].id);
    $('sheet').classList.remove('on'); scrollTo({ top: 0, behavior: 'smooth' }); if (window.MP3D && MP3D.select && MP3D.select()) setTimeout(go, 1000); else go(); };
  $('sh').querySelectorAll('.ev').forEach(e => e.onclick = () => { const i = +e.dataset.i; const S = session(o, 'suelta', i); location.href = evURL(S, o.id, o.pruebas[i].id); });
}
$('sheet').onclick = e => { if (e.target.id === 'sheet') $('sheet').classList.remove('on'); };
$('bBack').onclick = () => location.href = '../index.html';
if (Q.get('o')) { const o = OLIMPIADAS.find(x => x.id === Q.get('o')); if (o) sheet(o); }
window.__menu = { OLIMPIADAS, sheet, session };
