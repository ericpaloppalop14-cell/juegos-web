'use strict';
/* MOCHI RIVALS · menú, torneo, 4 pruebas 2D (la carrera de coches es la de Mochi Race, en carrera/) */
(() => {
const $ = id => document.getElementById(id);
const Q = new URLSearchParams(location.search);
const TS = +(Q.get('x') || 1);          // acelerar el tiempo (pruebas automáticas)
const AUTO = Q.has('auto');             // piloto automático (pruebas)
const rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
const pick = a => a[Math.random() * a.length | 0];

// ---------------- Personajes (los mismos de Mochi Race) ----------------
const CHARS = [
  { id: 'mochi', name: 'Mochi', color: '#ff9cc8', ears: 'bunny', inner: '#bfe8ff', pers: 'Optimista sin remedio', lines: ['¡Hoy es mi día, lo presiento!', '¡Qué bonito todo! Y voy a ganar.', 'Abrazos para todos… después de la meta.'] },
  { id: 'tiovivo', name: 'Tiovivo', color: '#7ee3c4', ears: 'bear', inner: '#ffe27a', pers: 'Mareado pero feliz', lines: ['¿Hacia dónde era la meta? Ah, ¡da igual!', '¡Vueltas, vueltas, más vueltas!', 'Estoy mareado de tanto ganar.'] },
  { id: 'atomo', name: 'Átomo', color: '#9fc3ff', ears: 'antenna', inner: '#fff59a', pers: 'Hiperactivo y eléctrico', lines: ['¡Bzzzt! Ya he llegado. ¿Empezamos?', 'Me he tomado tres batidos de rayos.', '¡Más rápido que un electrón con prisa!'] },
  { id: 'cosmo', name: 'Cosmo', color: '#b9a2f7', ears: null, inner: '#2a1650', pers: 'Soñador galáctico', lines: ['Las estrellas dicen que pierdes.', 'Vengo de muy lejos para esto.', 'Mi barriga es una galaxia. ¿Y la tuya?'] },
  { id: 'copito', name: 'Copito', color: '#e8f4ff', ears: null, inner: '#bfe3ff', pers: 'Frío y calculador', lines: ['Mantén la calma. Yo ya la tengo.', 'Brrr… qué escalofrío de victoria.', 'Te dejaré helado.'] },
  { id: 'burbuja', name: 'Burbuja', color: '#8fe3f0', ears: 'fins', inner: '#5fd0ff', pers: 'Escurridiza y bromista', lines: ['¡Blub! A que no me pillas.', 'Me escurro como un pececito.', '¡Glu glu, chao!'] },
  { id: 'lava', name: 'Lava', color: '#ffb36b', ears: null, inner: '#ff6a3d', pers: 'Competitiva y calentita', lines: ['¡Voy a fundir el récord!', 'Ardo en deseos de ganarte.', 'Quema, ¿eh? Es mi estela.'] },
  { id: 'tictac', name: 'Tictac', color: '#ffd98a', ears: 'bear', inner: '#d9a74a', pers: 'Puntual y gruñón', lines: ['Llegas tarde. Como siempre.', 'Tic, tac… se te acaba el tiempo.', 'He calculado tu derrota al segundo.'] },
  { id: 'trueno', name: 'Trueno', color: '#a9b4d6', ears: 'horns', inner: '#5b6aa0', pers: 'Ruidoso y dramático', lines: ['¡¡BROOOM!! Perdón, me emociono.', 'Se avecina tormenta… ¡de victorias!', '¡Escucha mi rugido de gelatina!'] },
  { id: 'disco', name: 'Disco', color: '#ff8fd8', ears: 'cat', inner: '#ffe27a', pers: 'Fiestera y presumida', lines: ['¿Has visto mis gafas? Brillan más que tú.', 'Ganar es mi baile favorito.', '¡Que suene la música de la meta!'] },
];
const CH = id => CHARS.find(c => c.id === id) || CHARS[0];

// ---------------- Dibujo de un mochi kawaii ----------------
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = n >> 8 & 255, b = n & 255; const f = v => clamp(Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k), 0, 255); return `rgb(${f(r)},${f(g)},${f(b)})`; }
function drawMochi(x, c, y, r, o = {}) {
  const t = performance.now() / 1000, sq = o.squish || 0, wob = Math.sin(t * 6 + (o.seed || 0)) * 0.035;
  const rx = r * (1 + wob + sq), ry = r * (0.88 - wob - sq);
  x.save(); x.translate(c, y); if (o.rot) x.rotate(o.rot); if (o.flip) x.scale(-1, 1);
  x.globalAlpha = o.alpha ?? 1;
  if (!o.noShadow) { x.fillStyle = 'rgba(60,20,80,.18)'; x.beginPath(); x.ellipse(0, ry * .92, rx * .85, ry * .2, 0, 0, 7); x.fill(); }
  const ch = o.ch;
  // orejas / complementos
  x.fillStyle = shade(ch.color, -0.12);
  if (ch.ears === 'bunny') { for (const s of [-1, 1]) { x.beginPath(); x.ellipse(s * rx * .38, -ry * 1.05, r * .17, r * .45, s * .25, 0, 7); x.fill(); } }
  if (ch.ears === 'bear') { for (const s of [-1, 1]) { x.beginPath(); x.arc(s * rx * .6, -ry * .7, r * .24, 0, 7); x.fill(); } }
  if (ch.ears === 'cat') { for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * rx * .25, -ry * .8); x.lineTo(s * rx * .75, -ry * 1.15); x.lineTo(s * rx * .8, -ry * .45); x.fill(); } }
  if (ch.ears === 'horns') { x.fillStyle = '#fff6c8'; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * rx * .3, -ry * .8); x.lineTo(s * rx * .55, -ry * 1.25); x.lineTo(s * rx * .65, -ry * .65); x.fill(); } }
  if (ch.ears === 'fins') { for (const s of [-1, 1]) { x.beginPath(); x.ellipse(s * rx * 1.02, 0, r * .3, r * .14, s * .6, 0, 7); x.fill(); } }
  if (ch.ears === 'antenna') { x.strokeStyle = shade(ch.color, -0.3); x.lineWidth = r * .07; x.beginPath(); x.moveTo(0, -ry * .9); x.lineTo(0, -ry * 1.35); x.stroke(); x.fillStyle = '#fff59a'; x.beginPath(); x.arc(0, -ry * 1.4, r * .13, 0, 7); x.fill(); }
  // cuerpo
  const g = x.createRadialGradient(-rx * .3, -ry * .45, r * .1, 0, 0, r * 1.15); g.addColorStop(0, shade(ch.color, 0.55)); g.addColorStop(.6, ch.color); g.addColorStop(1, shade(ch.color, -0.18));
  x.fillStyle = g; x.beginPath(); x.ellipse(0, 0, rx, ry, 0, 0, 7); x.fill();
  // mundo interior
  x.save(); x.beginPath(); x.arc(0, ry * .3, r * .33, 0, 7); x.clip(); x.fillStyle = ch.inner; x.fillRect(-r, -r, 2 * r, 2 * r);
  x.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 4; i++) { const a = t * 1.3 + i * 1.6; x.beginPath(); x.arc(Math.cos(a) * r * .18, ry * .3 + Math.sin(a) * r * .16, r * .045, 0, 7); x.fill(); }
  x.restore(); x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = Math.max(1, r * .04); x.beginPath(); x.arc(0, ry * .3, r * .33, 0, 7); x.stroke();
  // cara
  const ey = -ry * .22, mood = o.mood || 'ok';
  x.fillStyle = '#4a2a4a';
  if (mood === 'ouch') { x.lineWidth = r * .07; x.strokeStyle = '#4a2a4a'; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * rx * .38 - r * .07, ey - r * .07); x.lineTo(s * rx * .38 + r * .07, ey + r * .07); x.moveTo(s * rx * .38 + r * .07, ey - r * .07); x.lineTo(s * rx * .38 - r * .07, ey + r * .07); x.stroke(); } }
  else if (mood === 'happy') { x.lineWidth = r * .07; x.strokeStyle = '#4a2a4a'; for (const s of [-1, 1]) { x.beginPath(); x.arc(s * rx * .36, ey + r * .03, r * .08, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); } }
  else { for (const s of [-1, 1]) { x.beginPath(); x.arc(s * rx * .36, ey, r * .085, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(s * rx * .36 - r * .03, ey - r * .03, r * .03, 0, 7); x.fill(); x.fillStyle = '#4a2a4a'; } }
  x.fillStyle = 'rgba(255,110,150,.45)'; for (const s of [-1, 1]) { x.beginPath(); x.ellipse(s * rx * .58, ey + r * .17, r * .12, r * .065, 0, 0, 7); x.fill(); }
  x.strokeStyle = '#4a2a4a'; x.lineWidth = Math.max(1.2, r * .06); x.beginPath();
  if (mood === 'ouch') x.arc(0, ey + r * .22, r * .08, Math.PI + .3, -.3); else x.arc(0, ey + r * .08, r * .1, .25, Math.PI - .25); x.stroke();
  if (ch.id === 'disco') { x.fillStyle = '#3a2a5a'; x.fillRect(-rx * .6, ey - r * .1, rx * 1.2, r * .17); }
  if (ch.id === 'copito') { x.fillStyle = '#ff9cc8'; x.beginPath(); x.ellipse(0, -ry * .85, rx * .7, r * .2, 0, Math.PI, 0); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(0, -ry * 1.08, r * .1, 0, 7); x.fill(); }
  if (ch.id === 'cosmo') { x.strokeStyle = '#ffe27a'; x.lineWidth = r * .07; x.beginPath(); x.ellipse(0, -ry * .1, rx * 1.25, r * .2, -.2, 0, Math.PI); x.stroke(); }
  if (ch.id === 'lava') { x.fillStyle = '#ff6a3d'; x.beginPath(); x.ellipse(0, -ry * .92, rx * .45, r * .14, 0, 0, 7); x.fill(); }
  if (ch.id === 'tictac') { x.strokeStyle = '#b08a3a'; x.lineWidth = r * .06; x.beginPath(); x.moveTo(rx * .9, 0); x.lineTo(rx * 1.2, 0); x.arc(rx * 1.3, 0, r * .1, Math.PI, Math.PI * 3); x.stroke(); }
  x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.ellipse(-rx * .45, -ry * .55, rx * .17, ry * .09, -.5, 0, 7); x.fill();
  x.restore();
}
function nameTag(x, cx, y, txt, col, me) {
  x.font = `700 ${me ? 14 : 12}px Fredoka`; const w = x.measureText(txt).width + 16;
  x.fillStyle = me ? 'rgba(255,90,160,.9)' : 'rgba(70,35,100,.65)'; x.beginPath(); x.roundRect(cx - w / 2, y - 10, w, 20, 10); x.fill();
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, cx, y + 1);
}

// ---------------- Canvas y entrada ----------------
const cv = $('c'), X = cv.getContext('2d'); let W = 0, H = 0, DPR = 1;
function resize() { DPR = Math.min(3, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; cv.style.width = W + 'px'; cv.style.height = H + 'px'; }
addEventListener('resize', resize); resize();
const input = { taps: [], px: null, down: false, dsy: 0, dsx: 0, swipes: [] };
cv.addEventListener('pointerdown', e => { input.down = true; input.px = e.clientX; input.dsx = e.clientX; input.dsy = e.clientY; input.taps.push({ x: e.clientX, y: e.clientY }); });
cv.addEventListener('pointermove', e => { if (input.down) input.px = e.clientX; });
addEventListener('pointerup', e => { if (input.down && e.clientY - input.dsy > 45 && Math.abs(e.clientY - input.dsy) > Math.abs(e.clientX - input.dsx)) input.swipes.push('down'); input.down = false; });
addEventListener('keydown', e => { if (e.code === 'Space' || e.code === 'ArrowUp') input.taps.push({ x: W / 2, y: H / 2, key: 1 }); if (e.code === 'ArrowLeft') input.taps.push({ x: 10, y: H / 2, key: 1 }); if (e.code === 'ArrowRight') input.taps.push({ x: W - 10, y: H / 2, key: 1 }); if (e.code === 'ArrowDown') input.swipes.push('down'); });

// ---------------- Audio mínimo (WebAudio, sin archivos) ----------------
let AC = null; const beep = (f, d = .08, type = 'sine', v = .08) => { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = f; g.gain.value = v; g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + d); o.connect(g).connect(AC.destination); o.start(); o.stop(AC.currentTime + d); } catch (e) {} };
const SFX = { jump: () => beep(520, .12, 'triangle'), land: () => beep(330, .1), boing: () => beep(160, .25, 'sawtooth', .05), perfect: () => { beep(660, .08); setTimeout(() => beep(990, .12), 70); }, go: () => beep(880, .25, 'square', .05), tick: () => beep(440, .1, 'square', .04), splash: () => beep(240, .08, 'triangle', .06) };

// ---------------- Efectos ----------------
let FX = [];
function fxText(x, y, s, col = '#ff4f9a', d = 0.9) { FX.push({ k: 'txt', x, y, s, col, t: 0, d }); }
function fxBurst(x, y, col, n = 10) { for (let i = 0; i < n; i++) { const a = Math.random() * 7, v = rnd(60, 180); FX.push({ k: 'p', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, col, t: 0, d: rnd(.4, .8), r: rnd(2, 5) }); } }
function drawFX(dt, ox = 0, oy = 0) {
  FX = FX.filter(f => (f.t += dt) < f.d);
  for (const f of FX) { const k = f.t / f.d;
    if (f.k === 'txt') { X.globalAlpha = 1 - k; X.font = '700 22px Fredoka'; X.textAlign = 'center'; X.lineWidth = 5; X.strokeStyle = '#fff'; const tx = clamp(f.x - ox, X.measureText(f.s).width / 2 + 8, W - X.measureText(f.s).width / 2 - 22); X.strokeText(f.s, tx, f.y - oy - k * 40); X.fillStyle = f.col; X.fillText(f.s, tx, f.y - oy - k * 40); }
    else { f.x += f.vx * dt; f.y += f.vy * dt; X.globalAlpha = 1 - k; X.fillStyle = f.col; X.beginPath(); X.arc(f.x - ox, f.y - oy, f.r, 0, 7); X.fill(); } }
  X.globalAlpha = 1;
}
let hintT = null; function hint(s, ms = 3500) { const h = $('hint'); h.textContent = s; h.style.opacity = s ? 1 : 0; clearTimeout(hintT); if (s) hintT = setTimeout(() => h.style.opacity = 0, ms); }

window.MR = { CHARS, CH, drawMochi, nameTag, X: () => X, get W() { return W; }, get H() { return H; }, input, rnd, clamp, lerp, pick, SFX, fxText, fxBurst, drawFX, hint, AUTO, TS };
})();
