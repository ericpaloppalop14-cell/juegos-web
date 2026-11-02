import { Game } from './game.js?v=5';
import A from './audio.js?v=5';
import * as ST from './store.js?v=5';
import { CHARS, SKINS, UPGR, PILLS, DIST } from './data.js?v=5';
import { THREE, clamp, pick } from './util.js?v=5';

const { S } = ST; const $ = id => document.getElementById(id);
const fmt = n => Math.floor(n).toLocaleString('es-ES');
const ICO = {
  turbo: '<svg viewBox="0 0 24 24"><path d="M12 2c3 3 4.5 7 4 11l2.5 2.5V19l-3-1.5L14 21h-4l-1.5-3.5L5.5 19v-3.5L8 13c-.5-4 1-8 4-11Zm0 6.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Z"/></svg>',
  iman: '<svg viewBox="0 0 24 24"><path d="M5 3h5v8a2 2 0 0 0 4 0V3h5v8a7 7 0 0 1-14 0V3Zm0 3h5V3H5v3Zm9 0h5V3h-5v3Z"/></svg>',
  faja: '<svg viewBox="0 0 24 24"><path d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5l-8-3Zm-1 5h2v4h4v2h-4v4h-2v-4H7v-2h4V7Z"/></svg>',
  baston: '<svg viewBox="0 0 24 24"><path d="M9 22V10.5A6.5 6.5 0 1 1 22 10.5h-3.2a3.3 3.3 0 1 0-6.6 0V22H9Z"/></svg>',
  cafe: '<svg viewBox="0 0 24 24"><path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Zm13 1h2a3 3 0 0 1 0 6h-2v-2h2a1 1 0 0 0 0-2h-2V9ZM8 2h2v4H8V2Zm4 0h2v4h-2V2Z"/></svg>',
  oro: '<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17l-6.1 3.6 1.4-6.8L2.2 9.1l6.9-.8L12 2Z"/></svg>',
};
const CHIPCOL = { turbo: '#ff5a3c', iman: '#3b8cff', faja: '#2fd37a', baston: '#d9893a', cafe: '#a8703a' };
const g = new Game();
window.AT = { g, S, A, ST };
const q = new URLSearchParams(location.search);

/* ---------- screens ---------- */
const SCR = ['menu', 'hud', 'pTaller', 'pAbu', 'pMis', 'pSet', 'pPause', 'pCont', 'pOver'];
let panelOpen = null;
function show(...ids) { SCR.forEach(s => $(s).classList.toggle('show', ids.includes(s))); }
function toast(t) { const d = document.createElement('div'); d.textContent = t; $('toast').appendChild(d); setTimeout(() => d.remove(), 2500); }
function refreshMenu() {
  $('mCoins').textContent = fmt(S.coins); document.querySelectorAll('.coinsV').forEach(e => e.textContent = fmt(S.coins));
  $('mBestV').textContent = fmt(S.best); $('mMultV').textContent = 'x' + S.mult;
  const n = S.missions.filter(m => m.p >= m.n && !m.claimed).length; $('misBadge').textContent = n; $('misBadge').classList.toggle('on', n > 0);
}
function openPanel(id, cam) { panelOpen = id; A.click(); g.camMode = cam; show(id); if (id === 'pAbu') { abuIdx = Math.max(0, CHARS.findIndex(c => c.id === S.char)); renderAbu(); } if (id === 'pTaller') renderTaller(); if (id === 'pMis') renderMis(); if (id === 'pSet') renderSet(); refreshMenu(); }
function closePanel() { if (panelOpen === 'pAbu') g.setChar(S.char, S.skin, false); panelOpen = null; A.back(); g.camMode = 'home'; show('menu'); refreshMenu(); }
document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', closePanel));
$('bTaller').onclick = () => openPanel('pTaller', 'taller'); $('bAbu').onclick = () => openPanel('pAbu', 'abuelos'); $('bMis').onclick = () => openPanel('pMis', 'home'); $('bSet').onclick = () => openPanel('pSet', 'home');
$('bPlay').onclick = () => { A.resume(); A.click(); startRun(); };
function startRun() { show('hud'); $('chips').innerHTML = ''; chips = {}; $('bubble').classList.remove('on'); g.startRun(); }

/* ---------- taller ---------- */
function renderTaller() {
  const L = $('upList'); L.innerHTML = '';
  UPGR.forEach(u => {
    const lv = ST.upLevel(u.id), max = u.costs.length, cost = ST.upCost(u.id); const cur = ST.upValue(u.id), nx = lv < max ? u.base + u.per * (lv + 1) : null;
    const d = document.createElement('div'); d.className = 'up';
    const unit = u.unit === '%' ? '%' : ' s'; const f1 = x => x.toFixed(1).replace('.0', ''); const val = f1(cur) + unit;
    d.innerHTML = `<div class="ico">${ICO[u.icon]}</div><div><h4>${u.name}</h4><p>${u.d}</p><div class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div><div class="val">Ahora: ${val}${nx ? ' → ' + f1(nx) + unit : ''}</div></div>`;
    if (cost == null) { const m = document.createElement('div'); m.className = 'max'; m.textContent = '¡MÁXIMO!'; d.appendChild(m); }
    else { const b = document.createElement('button'); b.className = 'btn green' + (S.coins < cost ? ' disabled' : ''); b.innerHTML = `<i class="ic-den"></i> ${fmt(cost)}`; b.style.display = 'flex'; b.style.alignItems = 'center'; b.style.gap = '4px'; b.style.justifyContent = 'center';
      b.onclick = () => { if (ST.buyUp(u.id)) { A.buy(); g.fx.sparkle(0, 1.2, 1, 12); renderTaller(); refreshMenu(); g.say(pick(['¡Qué buen motor!', '¡Esto va a salir volando!', '¡Más potencia, jovencito!']), 2); } else { A.error(); toast(`Te faltan ${fmt(cost - S.coins)} dentaduras`); } }; d.appendChild(b); }
    L.appendChild(d);
  });
}
/* ---------- abuelos ---------- */
let abuIdx = 0;
function renderAbu() {
  const c = CHARS[abuIdx]; const owned = S.chars.includes(c.id); const unlockedSkins = S.skins;
  g.setChar(c.id, owned && c.id === S.char ? S.skin : (owned ? S.skin : 'def'), !owned);
  $('aName').textContent = c.name; $('aSub').textContent = c.sub; $('aAb').textContent = c.ab; $('aAbD').textContent = c.abd;
  const b = $('aBtn'); b.className = 'btn'; 
  if (owned && S.char === c.id) { b.className = 'btn green disabled'; b.innerHTML = 'ELEGIDO'; }
  else if (owned) { b.className = 'btn green'; b.innerHTML = 'ELEGIR'; }
  else { b.className = 'btn ' + (S.coins >= c.price ? 'play' : 'red disabled'); b.style.animation = S.coins >= c.price ? '' : 'none'; b.innerHTML = `COMPRAR <em><i class="ic-den"></i>${fmt(c.price)}</em>`; }
  b.style.fontSize = '26px';
  $('aDots').innerHTML = CHARS.map((x, i) => `<i class="${i === abuIdx ? 'on' : (S.chars.includes(x.id) ? 'own' : '')}"></i>`).join('');
  const row = $('skinRow'); row.innerHTML = '';
  SKINS.forEach(s => { const el = document.createElement('div'); const own = S.skins.includes(s.id); el.className = 'sk' + (own ? '' : ' lock') + (S.skin === s.id ? ' sel' : '');
    const col = s.rainbow ? 'linear-gradient(135deg,#ff4f4f,#ffd23c,#4fe88a,#4fa8ff,#b04fff)' : (s.color == null ? '#' + CHARS[abuIdx].chair.toString(16).padStart(6, '0') : '#' + s.color.toString(16).padStart(6, '0'));
    el.innerHTML = `<i style="background:${col}"></i>${s.name}${own ? '' : `<span class="pr">${fmt(s.price)}</span>`}`;
    el.onclick = () => { if (!owned && !S.chars.includes(c.id)) { toast('Primero consigue a este abuelo'); A.error(); return; } if (!own) { if (ST.buySkin(s.id)) { A.buy(); S.skin = s.id; ST.save(); } else { A.error(); toast(`Te faltan ${fmt(s.price - S.coins)} dentaduras`); return; } } else { S.skin = s.id; ST.save(); A.click(); } g.previewSkin(S.skin); renderAbu(); refreshMenu(); };
    row.appendChild(el); });
  refreshMenu();
}
const abuMove = d => { abuIdx = (abuIdx + d + CHARS.length) % CHARS.length; A.click(); renderAbu(); g.say(pick(CHARS[abuIdx].lines), 2.2); };
$('aPrev').onclick = () => abuMove(-1); $('aNext').onclick = () => abuMove(1);
$('aBtn').onclick = () => { const c = CHARS[abuIdx]; if (S.chars.includes(c.id)) { if (S.char !== c.id) { S.char = c.id; ST.save(); A.buy(); } } else if (ST.buyChar(c.id)) { S.char = c.id; ST.save(); A.fanfare(); g.fx.confetti(0, 1.5, 0, 50); toast(`¡${c.name} desbloqueado!`); } else { A.error(); toast(`Te faltan ${fmt(c.price - S.coins)} dentaduras`); } renderAbu(); };
/* ---------- misiones ---------- */
function renderMis() {
  const L = $('misList'); L.innerHTML = '';
  S.missions.forEach((m, i) => { const d = document.createElement('div'); const done = m.p >= m.n; d.className = 'mis' + (m.claimed ? ' done' : '');
    d.innerHTML = `<h4>${ST.missionText(m)}</h4>` + (m.claimed ? `<div class="got">¡Cobrada!</div>` : (done ? '' : `<small>${fmt(m.p)} / ${fmt(m.n)} · Premio ${m.reward}</small>`)) + `<div class="bar"><i style="width:${Math.min(100, m.p / m.n * 100)}%"></i></div>`;
    if (done && !m.claimed) { const b = document.createElement('button'); b.className = 'btn green'; b.innerHTML = `<i class="ic-den"></i> +${m.reward}`; b.style.display = 'flex'; b.style.alignItems = 'center'; b.style.gap = '4px'; b.onclick = () => { const got = ST.claim(i); A.mission(); toast(`+${got} dentaduras`); if (S.missions.every(x => x.claimed) && got > m.reward) { toast(`¡Multiplicador x${S.mult}!`); A.fanfare(); } renderMis(); refreshMenu(); }; d.appendChild(b); }
    L.appendChild(d); });
  $('misMultV').textContent = 'x' + S.mult;
  $('misStats').innerHTML = `<div><b>${fmt(S.best)}</b>mejor puntuación</div><div><b>${fmt(S.bestDist)} m</b>mejor distancia</div><div><b>${fmt(S.runs)}</b>partidas</div>`;
}
/* ---------- ajustes ---------- */
function renderSet() {
  padOn();
  $('tMus').classList.toggle('on', S.set.music); $('tSfx').classList.toggle('on', S.set.sfx);
  document.querySelectorAll('#sQ button').forEach(b => b.classList.toggle('on', b.dataset.q === S.set.q));
}
$('tMus').onclick = () => { S.set.music = !S.set.music; A.setMusic(S.set.music); ST.save(); renderSet(); A.click(); };
$('tSfx').onclick = () => { S.set.sfx = !S.set.sfx; A.setSfx(S.set.sfx); ST.save(); renderSet(); A.click(); };
document.querySelectorAll('#sQ button').forEach(b => b.onclick = () => { S.set.q = b.dataset.q; ST.save(); g.applyQuality(S.set.q); renderSet(); A.click(); });
let resetArm = 0; $('bReset').onclick = () => { if (!resetArm) { resetArm = 1; $('bReset').textContent = '¿Seguro?'; setTimeout(() => { resetArm = 0; $('bReset').textContent = 'Borrar'; }, 3000); } else { localStorage.removeItem(ST.isPruebas ? 'abuelo-turbo-pruebas-v1' : 'abuelo-turbo-v1'); location.reload(); } };
/* ---------- pausa / fin ---------- */
$('bPause').onclick = () => { if (g.state === 'play') { g.pause(); show('hud', 'pPause'); A.click(); } };
$('bResume').onclick = () => { g.resume(); show('hud'); A.click(); };
$('bRestart').onclick = () => { A.click(); show('hud'); g.startRun(); };
$('bQuit').onclick = () => { A.click(); g.toMenu(); show('menu'); refreshMenu(); $('vig').classList.remove('on'); };
let contTimer = null;
$('bContinue').onclick = () => { clearInterval(contTimer); if (g.doContinue()) { A.buy(); show('hud'); } else { A.error(); } };
$('bSkip').onclick = () => { clearInterval(contTimer); showSummary(); };
$('bAgain').onclick = () => { A.click(); startRun(); };
$('bMenu').onclick = () => { A.click(); g.toMenu(); show('menu'); refreshMenu(); };
function showSummary() {
  const r = g.run; if (!r) return; show('pOver');
  $('oRecord').style.display = r.newBest ? 'block' : 'none'; $('oTitle').textContent = r.newBest ? '¡QUÉ ABUELO!' : '¡FIN DE LA CARRERA!';
  const cnt = (el, to, d = 900) => { const t0 = performance.now(); const f = n => { const k = Math.min(1, (n - t0) / d); el.textContent = fmt(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); };
  cnt($('oScoreV'), r.score); $('oDist').textContent = fmt(r.dist) + ' m'; cnt($('oCoins').querySelector('span'), r.coins, 700); $('oBest').textContent = fmt(r.best);
  $('oMis').innerHTML = r.done.map(m => `<div>✔ ${ST.missionText(m)}</div>`).join('');
  A.fanfare(); if (r.newBest) { g.say(pick(['¡Récord! ¡Que se entere el bar!', '¡Nuevo récord, mis niños!']), 3); }
  refreshMenu();
}
/* ---------- HUD ---------- */
let chips = {};
function chip(type) { if (chips[type]) return chips[type]; const el = document.createElement('div'); el.className = 'chip'; el.innerHTML = `<div class="ci" style="background:${CHIPCOL[type]}">${ICO[type]}</div><div class="cb"><i style="background:${CHIPCOL[type]}"></i></div>`; $('chips').appendChild(el); chips[type] = { el, bar: el.querySelector('i') }; return chips[type]; }
function chipSet(type, v) { if (v > 0) { const c = chip(type); c.bar.style.width = (v * 100).toFixed(0) + '%'; c.el.classList.toggle('warn', v < 0.22); } else if (chips[type]) { chips[type].el.remove(); delete chips[type]; } }
let lastScore = -1;
g.cb.hud = h => {
  $('hScore').textContent = fmt(h.score); $('hCoins').textContent = fmt(h.coins); $('hMult').textContent = 'x' + h.mult; $('hDist').textContent = fmt(h.dist) + ' m'; $('kmh').textContent = h.kmh + ' km/h';
  $('bTutSkip').style.display = h.tut >= 0 ? 'block' : 'none'; chipSet('turbo', h.tur); chipSet('iman', h.mag); chipSet('faja', h.shd); chipSet('baston', h.can); chipSet('cafe', h.caf); $('vig').classList.toggle('on', h.tur > 0);
};
let bubbleTimer = null, lastSay = 0;
g.cb.say = (text, dur, voice) => {
  if (!(g.state === 'play' || g.state === 'menu' || g.state === 'crash' || g.state === 'over')) return; const now = performance.now(); if (now - lastSay < 900 && g.state === 'play') return; lastSay = now;
  const b = $('bubble'); $('bubbleTxt').textContent = text; b.classList.add('on'); A.blip(voice || 1, Math.min(9, 3 + text.length / 5 | 0)); clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => b.classList.remove('on'), dur * 1000);
};
let distTimer = null;
g.cb.district = (d, first) => { const el = $('district'); $('dName').textContent = d.name; $('dSub').textContent = d.sub; el.classList.add('on'); clearTimeout(distTimer); distTimer = setTimeout(() => el.classList.remove('on'), 2800); };
g.cb.pop = (t, col) => { const i = document.createElement('i'); i.textContent = t; i.style.color = col || '#fff'; $('pop').appendChild(i); setTimeout(() => i.remove(), 1400); };
g.cb.pill = type => { g.cb.pop(PILLS[type].name.toUpperCase(), PILLS[type].hud); };
g.cb.flash = (col, a) => { const f = $('flash'); f.style.transition = 'none'; f.style.background = col; f.style.opacity = a; requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transition = 'opacity .5s'; f.style.opacity = 0; })); };
const TUTS = [
  { c: 'tl', t: '¡Esquiva el coche!', d: 'Desliza ← o → para cambiar de carril' },
  { c: 'tj', t: '¡Salta la valla!', d: 'Desliza ↑ (o pulsa ▲ / Espacio) para saltar' },
  { c: 'ts', t: '¡Agáchate bajo el tendedero!', d: 'Desliza ↓ para agacharte' },
];
let tutShown = -9;
g.cb.tut = step => {
  const el = $('tut'); if (step < 0) { el.classList.remove('on'); tutShown = -9; return; } if (step === tutShown) return; tutShown = step; const T = TUTS[step]; if (!T) return;
  $('tTitle').textContent = T.t; $('tSub').textContent = T.d; const st = el.querySelector('.tstage'); st.className = 'tstage ' + T.c; [...$('tDots').children].forEach((d, i) => d.className = i < step ? 'on' : i === step ? 'cur' : ''); el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); A.click();
};
$('bTutSkip').onclick = () => { g.skipTut(); A.click(); };
g.cb.over = run => {
  setTimeout(() => {
    if (g.state !== 'over') return;
    if (g.canContinue() && run.dist > 150) { show('hud', 'pCont'); let t = 6; $('contNum').textContent = t; $('contCost').textContent = fmt(g.continueCost()); const fg = $('contFg'); fg.style.transition = 'none'; fg.style.strokeDashoffset = 0; requestAnimationFrame(() => { fg.style.transition = 'stroke-dashoffset 6s linear'; fg.style.strokeDashoffset = 276.5; });
      clearInterval(contTimer); contTimer = setInterval(() => { t--; $('contNum').textContent = Math.max(0, t); if (t <= 0) { clearInterval(contTimer); if (g.state === 'over' && $('pCont').classList.contains('show')) showSummary(); } }, 1000); }
    else showSummary();
  }, 350);
};
g.cb.state = s => { if (s === 'menu') { $('vig').classList.remove('on'); } if (s === 'play') { /* nothing */ } };
/* ---------- input ---------- */
const app = $('app'); let ptr = null;
app.addEventListener('pointerdown', e => {
  A.resume(); if (e.target.closest('button,.card,.panel')) return; if (g.state !== 'play') return; e.preventDefault();
  ptr = { id: e.pointerId, x0: e.clientX, y0: e.clientY, sx: e.clientX, sy: e.clientY, t0: performance.now(), n: 0 };
  try { app.setPointerCapture(e.pointerId); } catch (_) { }
}, { passive: false });
app.addEventListener('pointermove', e => {
  if (!ptr || e.pointerId !== ptr.id || g.state !== 'play') return;
  const W = Math.min(innerWidth, 500), th = Math.max(26, W * 0.07), vth = Math.max(32, W * 0.075);
  const dx = e.clientX - ptr.sx, dy = e.clientY - ptr.sy, ax = Math.abs(dx), ay = Math.abs(dy), mul = ptr.n ? 2.1 : 1;
  const quick = ptr.n > 0 || performance.now() - ptr.t0 < 420;
  if (ay > vth * mul && ax < ay * 0.7 && quick) { g.action(dy < 0 ? 'jump' : 'slide'); ptr.n++; ptr.sx = e.clientX; ptr.sy = e.clientY; if (navigator.vibrate) try { navigator.vibrate(6); } catch (_) { } return; }
  if (ax > th * mul && ax > ay * 0.6) { g.action(dx < 0 ? 'left' : 'right'); ptr.n++; ptr.sx = e.clientX; ptr.sy = e.clientY; }
});
const up = e => { if (ptr && (!e || e.pointerId === ptr.id)) ptr = null; }; app.addEventListener('pointerup', up); app.addEventListener('pointercancel', up);
document.addEventListener('touchmove', e => { if (g.state !== 'play' && e.target.closest && e.target.closest('.panel')) return; e.preventDefault(); }, { passive: false }); document.addEventListener('contextmenu', e => e.preventDefault());
/* botones en pantalla (opcional) */
const padOn = () => { $('pad').classList.toggle('on', !!S.set.btns); $('tPad') && $('tPad').classList.toggle('on', !!S.set.btns); $('bPadTog').textContent = 'BOTONES EN PANTALLA: ' + (S.set.btns ? 'SÍ' : 'NO'); };
const padBind = (id, a) => $(id).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); A.resume(); g.action(a); });
padBind('pL', 'left'); padBind('pR', 'right'); padBind('pJ', 'jump'); padBind('pS', 'slide');
$('tPad').onclick = () => { S.set.btns = !S.set.btns; ST.save(); padOn(); A.click(); };
$('bPadTog').onclick = () => { S.set.btns = !S.set.btns; ST.save(); padOn(); A.click(); };
$('bTutAgain').onclick = () => { S.seen.tuto = false; ST.save(); A.click(); toast('El tutorial saldrá en tu próxima carrera'); };
window.addEventListener('keydown', e => {
  if (e.repeat) return; A.resume(); const k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') g.action('left'); else if (k === 'ArrowRight' || k === 'd' || k === 'D') g.action('right');
  else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ') { if (g.state === 'play') { g.action('jump'); e.preventDefault(); } else if (g.state === 'menu' && !panelOpen && k === ' ') $('bPlay').click(); }
  else if (k === 'ArrowDown' || k === 's' || k === 'S') g.action('slide');
  else if (k === 'p' || k === 'P' || k === 'Escape') { if (g.state === 'play') $('bPause').click(); else if (g.state === 'paused') $('bResume').click(); else if (panelOpen) closePanel(); }
  else if (k === 'Enter') { if (g.state === 'menu' && !panelOpen) $('bPlay').click(); }
  if (k.startsWith('Arrow') || k === ' ') e.preventDefault();
});
document.addEventListener('visibilitychange', () => { if (document.hidden && g.state === 'play') $('bPause').click(); });
/* bubble follow */
const _v = new THREE.Vector3();
function follow() {
  requestAnimationFrame(follow); const b = $('bubble'); if (!b.classList.contains('on')) return; const rt = g.rig && g.rig.root; if (!rt) return;
  /* el bocadillo va DEBAJO del abuelo (bajo las ruedas y las llamas), nunca tapando la carretera de delante */
  rt.getWorldPosition(_v); _v.z += 2.4; _v.y = 0; _v.project(g.camera); const x = (_v.x * 0.5 + 0.5) * innerWidth, y = (-_v.y * 0.5 + 0.5) * innerHeight;
  const w = b.offsetWidth / 2 + 8, h = b.offsetHeight + 6; b.style.left = clamp(x, w, innerWidth - w) + 'px'; b.style.top = clamp(y + 6, 120, innerHeight - h - 40) + 'px';
}
/* menu quips */
setInterval(() => { if (g.state === 'menu' && !panelOpen && S.set.sfx) g.say(pick(g.char.lines), 2.6); }, 9000);
/* ---------- boot ---------- */
(async function boot() {
  ST.load(); if (q.get('tuto') === '0') S.seen.tuto = true; if (q.get('tuto') === '1') g.forceTut = true; A.musicOn = S.set.music; A.sfxOn = S.set.sfx;
  const bar = $('lbarFill'), txt = $('ltxt'); const msgs = ['Calentando el motor…', 'Inflando los neumáticos…', 'Buscando la dentadura…', 'Afinando la bocina…', 'Tomando la pastilla…'];
  try {
    await new Promise(r => setTimeout(r, 30));
    await g.init($('c'), p => { bar.style.width = (10 + p * 85) + '%'; txt.textContent = msgs[Math.min(msgs.length - 1, p * msgs.length | 0)]; });
  } catch (e) { console.error(e); $('loading').classList.remove('show'); $('nogl').classList.add('show'); return; }
  bar.style.width = '100%'; await new Promise(r => setTimeout(r, 250));
  if (!S.set.music) A.musicOn = false;
  padOn(); show('menu'); $('loading').classList.remove('show'); refreshMenu(); follow(); window.__ready = true;
  const first = () => { A.resume(); if (A.ok) { A.setMusic(S.set.music); A.setSfx(S.set.sfx); if (g.state === 'menu') A.musicStart(0, true); } window.removeEventListener('pointerdown', first); window.removeEventListener('keydown', first); };
  window.addEventListener('pointerdown', first); window.addEventListener('keydown', first);
  if (q.get('auto') === '1') { A.resume(); startRun(); }
  setTimeout(() => g.say(pick(g.char.lines), 2.6), 1200);
})();
