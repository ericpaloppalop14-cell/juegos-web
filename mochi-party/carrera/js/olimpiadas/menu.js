// MOCHI PARTY · OLIMPIADAS — pantalla para elegir olimpiada (tarjetas) con tu mochi en 3D
import * as THREE from 'three';
import { CHARS } from '../data.js';
import { makeCharacter, animCharacter, toon } from '../gfx.js?v=m10';
import { OLIMPIADAS } from './catalogo.js?v=o21';
import { saveS, evURL } from './fiesta.js?v=o21';
const $ = id => document.getElementById(id), Q = new URLSearchParams(location.search);
const PERS = { mochi: 'Optimista sin remedio', tiovivo: 'Mareado pero feliz', atomo: 'Hiperactivo y eléctrico', cosmo: 'Soñador galáctico', copito: 'Frío y calculador', burbuja: 'Escurridiza y bromista', lava: 'Competitiva y calentita', tictac: 'Puntual y gruñón', trueno: 'Ruidoso y dramático', disco: 'Fiestera y presumida' };
const LIST = CHARS.filter(c => PERS[c.id]);
let pj = localStorage.getItem('mr_pj') || 'mochi'; if (!LIST.find(c => c.id === pj)) pj = 'mochi';
const med = (() => { try { return JSON.parse(localStorage.getItem('mo_medallas') || '{}'); } catch (e) { return {}; } })();
// ---------- 3D: tu mochi girando y gominolas flotando ----------
const cv = $('bg'), R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); R.outputColorSpace = THREE.SRGBColorSpace; R.setPixelRatio(Math.min(2, devicePixelRatio || 1));
const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, 1, .1, 200);
sc.add(new THREE.HemisphereLight('#ffffff', '#ffc8e8', 1.2)); const dl = new THREE.DirectionalLight('#fff4e8', 1.6); dl.position.set(4, 8, 6); sc.add(dl);
let hero = null; const holder = new THREE.Group(); sc.add(holder);
function setHero() { if (hero) holder.remove(hero); hero = makeCharacter(LIST.find(c => c.id === pj)); holder.add(hero); const c = LIST.find(c => c.id === pj); $('who').innerHTML = `${c.name}<small>${PERS[c.id]}</small>`; }
const blobs = []; for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(Math.random() * .5 + .25, 16, 12), toon(['#ff9cc8', '#7ee3c4', '#ffe27a', '#b9a2f7', '#8fd0ff', '#ffb36b'][i % 6], { rim: .7, emissive: '#ffffff', ei: .08 })); m.position.set((Math.random() - .5) * 26, Math.random() * 14 - 7, -6 - Math.random() * 10); m.userData.p = Math.random() * 6; sc.add(m); blobs.push(m); }
function size() { const w = innerWidth, h = innerHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
addEventListener('resize', size); size(); setHero();
let jump = 0;
(function loop(n) { const t = n / 1000; const hb = document.querySelector('.hero').getBoundingClientRect(); const port = innerHeight > innerWidth;
  // coloca al mochi a la altura de la zona .hero
  const ndcY = 1 - 2 * ((hb.top + hb.height * .5) / innerHeight); const dist = 12; cam.position.set(0, 0, dist); cam.lookAt(0, 0, 0);
  const hh = Math.tan(cam.fov * Math.PI / 360) * dist; holder.position.set(0, ndcY * hh - (hb.height / innerHeight) * hh * .7, 0); const s = (hb.height / innerHeight) * hh * .5; holder.scale.setScalar(Math.max(.6, s));
  holder.rotation.y = Math.sin(t * .8) * .6; jump = Math.max(0, jump - .03); holder.position.y += Math.abs(Math.sin(t * 3)) * .12 + Math.sin(jump * Math.PI) * 1.2; holder.rotation.y += jump * 6.28;
  if (hero) animCharacter(hero, t, 1, jump > 0 ? 'happy' : '');
  for (const b of blobs) { b.position.y += Math.sin(t + b.userData.p) * .004; b.rotation.y = t; }
  R.render(sc, cam); requestAnimationFrame(loop); })(0);
// ---------- personajes ----------
function chars() { const C = $('chars'); C.innerHTML = ''; for (const c of LIST) { const b = document.createElement('button'); b.style.background = c.color; b.title = c.name; b.className = c.id === pj ? 'on' : ''; b.onclick = () => { pj = c.id; localStorage.setItem('mr_pj', pj); setHero(); jump = 1; chars(); }; C.appendChild(b); } }
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
  $('sh').innerHTML = `<div class="hd" style="background:linear-gradient(150deg,${o.color[0]},${o.color[1]})"><span class="ic">${o.icon}</span><div><b>${o.name}</b><small>${o.lema}</small></div></div>
    ${o.pruebas.map((p, i) => `<div class="ev" data-i="${i}" style="animation-delay:${i * .06}s"><span class="ei">${p.icon}</span><div><b>${i + 1}. ${p.name}</b><small>${p.desc}</small></div><span class="go">Suelta ▶</span></div>`).join('')}
    <div class="rv">Compites contra 5 mochis rivales · 10, 7, 5, 3, 2 y 1 puntos por prueba</div>
    <div class="btns"><button class="btn" id="bStart">🏅 ¡Empezar olimpiada!</button><button class="btn s" id="bClose">Volver</button></div>`;
  $('sheet').classList.add('on');
  $('bClose').onclick = () => $('sheet').classList.remove('on');
  $('bStart').onclick = () => { const S = session(o, 'olimpiada', 0); location.href = evURL(S, o.id, o.pruebas[0].id); };
  $('sh').querySelectorAll('.ev').forEach(e => e.onclick = () => { const i = +e.dataset.i; const S = session(o, 'suelta', i); location.href = evURL(S, o.id, o.pruebas[i].id); });
}
$('sheet').onclick = e => { if (e.target.id === 'sheet') $('sheet').classList.remove('on'); };
$('bBack').onclick = () => location.href = '../index.html';
if (Q.get('o')) { const o = OLIMPIADAS.find(x => x.id === Q.get('o')); if (o) sheet(o); }
window.__menu = { OLIMPIADAS, sheet, session };
