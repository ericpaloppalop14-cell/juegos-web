'use strict';
/* Pantalla de inicio: fondo con profundidad y mochi protagonista animado (solo afecta a #sMenu) */
(() => {
const $ = id => document.getElementById(id), M = $('sMenu'), bg = $('menuBg'), hero = $('menuHero');
if (!M || !bg || !hero) return;
const bx = bg.getContext('2d'), hx = hero.getContext('2d');
const L = { x: -0.55, y: -0.8 };               // única fuente de luz: arriba a la izquierda
let dpr = 1, W = 0, H = 0, HW = 0, HH = 0;
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); const f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))); return `rgb(${f(n >> 16)},${f(n >> 8 & 255)},${f(n & 255)})`; }
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; }
function size() {
  dpr = Math.min(3, window.devicePixelRatio || 1);
  W = innerWidth; H = innerHeight; bg.width = W * dpr; bg.height = H * dpr; bg.style.width = W + 'px'; bg.style.height = H + 'px';
  const r = hero.getBoundingClientRect(); HW = r.width || 200; HH = r.height || 170; hero.width = HW * dpr; hero.height = HH * dpr;
}
addEventListener('resize', size);
// textura de grano (una vez)
const grain = document.createElement('canvas'); grain.width = grain.height = 96;
{ const g = grain.getContext('2d'), d = g.createImageData(96, 96); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 9; } g.putImageData(d, 0, 0); }
let grainPat = null;
// partículas del fondo
const rnd = (a, b) => a + Math.random() * (b - a);
const bokeh = Array.from({ length: 16 }, () => ({ x: Math.random(), y: Math.random(), r: rnd(10, 46), z: rnd(.2, 1), c: ['#ffffff', '#ffc2e0', '#cdb8ff', '#bff0ff', '#fff1b8'][Math.floor(Math.random() * 5)], p: Math.random() * 7 }));
const stars = Array.from({ length: 22 }, () => ({ x: Math.random(), y: Math.random() * .75, s: rnd(2, 5), p: Math.random() * 7, v: rnd(1.5, 3.5) }));
const minis = Array.from({ length: 5 }, (_, i) => ({ x: (i + .5) / 5 + rnd(-.06, .06), y: rnd(.12, .5), r: rnd(9, 16), p: Math.random() * 7, c: ['#ff9cc8', '#9fd8ff', '#ffd98a', '#b7f0a8', '#cdb8ff'][i] }));

function hill(y0, amp, freq, ph, c1, c2, t) {
  const g = bx.createLinearGradient(0, H * y0 - amp, 0, H); g.addColorStop(0, c1); g.addColorStop(1, c2);
  bx.fillStyle = g; bx.beginPath(); bx.moveTo(0, H);
  for (let x = 0; x <= W + 10; x += 10) bx.lineTo(x, H * y0 + Math.sin(x * freq + ph + t) * amp + Math.sin(x * freq * 2.3 + ph) * amp * .35);
  bx.lineTo(W, H); bx.fill();
  // borde iluminado (la luz viene de arriba)
  bx.strokeStyle = 'rgba(255,255,255,.55)'; bx.lineWidth = 2; bx.beginPath();
  for (let x = 0; x <= W + 10; x += 10) bx.lineTo(x, H * y0 + Math.sin(x * freq + ph + t) * amp + Math.sin(x * freq * 2.3 + ph) * amp * .35 + 1);
  bx.stroke();
}
function drawBg(t) {
  bx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sky = bx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#ffc6e2'); sky.addColorStop(.45, '#ffe3d6'); sky.addColorStop(1, '#cfefff'); bx.fillStyle = sky; bx.fillRect(0, 0, W, H);
  // sol / luz principal arriba a la izquierda
  const sx = W * .12, sy = H * .06, sg = bx.createRadialGradient(sx, sy, 0, sx, sy, W * .95); sg.addColorStop(0, 'rgba(255,252,235,.95)'); sg.addColorStop(.25, 'rgba(255,240,215,.45)'); sg.addColorStop(1, 'rgba(255,240,215,0)'); bx.fillStyle = sg; bx.fillRect(0, 0, W, H);
  // rayos suaves
  bx.save(); bx.translate(sx, sy); bx.rotate(t * .03); bx.fillStyle = 'rgba(255,255,255,.13)';
  for (let i = 0; i < 9; i++) { bx.rotate(Math.PI * 2 / 9); bx.beginPath(); bx.moveTo(0, 0); bx.lineTo(W * 1.3, -W * .09); bx.lineTo(W * 1.3, W * .09); bx.fill(); }
  bx.restore();
  // capa lejana: bokeh desenfocado
  for (const b of bokeh) { const y = ((b.y - t * .008 * b.z) % 1 + 1) % 1 * H, x = b.x * W + Math.sin(t * .5 + b.p) * 12 * b.z;
    const g = bx.createRadialGradient(x, y, 0, x, y, b.r); g.addColorStop(0, rgba(b.c, .0)); g.addColorStop(.7, rgba(b.c, .22 * b.z)); g.addColorStop(1, rgba(b.c, 0)); bx.fillStyle = g; bx.beginPath(); bx.arc(x, y, b.r, 0, 7); bx.fill(); }
  // mochis lejanos flotando (siluetas suaves, perspectiva atmosférica)
  for (const m of minis) { const x = m.x * W, y = m.y * H + Math.sin(t * 1.2 + m.p) * 6; bx.globalAlpha = .35; bx.fillStyle = m.c; bx.beginPath(); bx.ellipse(x, y, m.r * 1.08, m.r * .9, 0, 0, 7); bx.fill(); bx.fillStyle = '#fff'; bx.beginPath(); bx.ellipse(x - m.r * .35, y - m.r * .4, m.r * .3, m.r * .18, -.5, 0, 7); bx.fill(); bx.globalAlpha = 1; }
  // colinas en 3 capas (de lejos a cerca: más pálidas y azuladas arriba)
  hill(.74, 14, .012, 1, 'rgba(214,200,255,.75)', 'rgba(200,225,255,.9)', t * .05);
  hill(.82, 18, .009, 3, 'rgba(255,190,222,.85)', 'rgba(255,214,232,.95)', t * .08);
  hill(.9, 12, .015, 5, '#ffd0e4', '#ffe9f1', t * .12);
  // destellos
  for (const s of stars) { const a = Math.max(0, Math.sin(t * s.v + s.p)); if (a < .05) continue; const x = s.x * W, y = s.y * H, r = s.s * a;
    bx.fillStyle = `rgba(255,255,255,${.85 * a})`; bx.beginPath(); bx.moveTo(x, y - r * 2); bx.quadraticCurveTo(x, y, x + r * 2, y); bx.quadraticCurveTo(x, y, x, y + r * 2); bx.quadraticCurveTo(x, y, x - r * 2, y); bx.quadraticCurveTo(x, y, x, y - r * 2); bx.fill(); }
  // viñeta suave
  const v = bx.createRadialGradient(W / 2, H * .45, H * .3, W / 2, H * .45, H * .8); v.addColorStop(0, 'rgba(120,60,150,0)'); v.addColorStop(1, 'rgba(120,60,150,.14)'); bx.fillStyle = v; bx.fillRect(0, 0, W, H);
}

// ---------- mochi protagonista (kawaii) ----------
let happy = 0, blinkAt = 1.5, blinkT = -1, fx = [], nextFx = 2;
hero.addEventListener('pointerdown', () => { happy = 1.3; for (let i = 0; i < 4; i++) fx.push({ k: 'h', x: (Math.random() - .5) * .9, y: -.6, vy: .35 + Math.random() * .2, a: 0, life: 1.4, s: .8 + Math.random() * .5 }); try { navigator.vibrate && navigator.vibrate(12); } catch (e) {} });
function ears(x, ch, rx, ry, r, lit) {
  const c = shade(ch.color, -0.1), inner = 'rgba(255,190,215,.85)';
  x.fillStyle = c;
  const fill = (path, ip) => { x.fillStyle = c; path(); x.fill(); if (ip) { x.fillStyle = inner; ip(); x.fill(); } };
  if (ch.ears === 'bunny') for (const s of [-1, 1]) fill(() => { x.beginPath(); x.ellipse(s * rx * .4, -ry * 1.08, r * .19, r * .5, s * .22, 0, 7); }, () => { x.beginPath(); x.ellipse(s * rx * .4, -ry * 1.05, r * .09, r * .36, s * .22, 0, 7); });
  if (ch.ears === 'bear') for (const s of [-1, 1]) fill(() => { x.beginPath(); x.arc(s * rx * .62, -ry * .72, r * .26, 0, 7); }, () => { x.beginPath(); x.arc(s * rx * .62, -ry * .72, r * .13, 0, 7); });
  if (ch.ears === 'cat') for (const s of [-1, 1]) fill(() => { x.beginPath(); x.moveTo(s * rx * .22, -ry * .82); x.quadraticCurveTo(s * rx * .7, -ry * 1.35, s * rx * .82, -ry * .42); x.closePath(); }, () => { x.beginPath(); x.moveTo(s * rx * .36, -ry * .78); x.quadraticCurveTo(s * rx * .66, -ry * 1.12, s * rx * .72, -ry * .55); x.closePath(); });
  if (ch.ears === 'horns') { x.fillStyle = '#fff3c0'; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * rx * .28, -ry * .8); x.quadraticCurveTo(s * rx * .5, -ry * 1.3, s * rx * .58, -ry * 1.32); x.lineTo(s * rx * .66, -ry * .62); x.fill(); } }
  if (ch.ears === 'fins') for (const s of [-1, 1]) fill(() => { x.beginPath(); x.ellipse(s * rx * 1.02, ry * .05, r * .32, r * .15, s * .6, 0, 7); });
  if (ch.ears === 'antenna') { x.strokeStyle = shade(ch.color, -0.3); x.lineWidth = r * .07; x.lineCap = 'round'; x.beginPath(); x.moveTo(0, -ry * .9); x.quadraticCurveTo(r * .1, -ry * 1.2, 0, -ry * 1.36); x.stroke(); const g = x.createRadialGradient(-r * .04, -ry * 1.44, 0, 0, -ry * 1.4, r * .15); g.addColorStop(0, '#fffde0'); g.addColorStop(1, '#ffd84a'); x.fillStyle = g; x.beginPath(); x.arc(0, -ry * 1.4, r * .14, 0, 7); x.fill(); }
}
function body(x, w, h) { // redondito y más ancho abajo
  x.beginPath(); x.moveTo(0, -h);
  x.bezierCurveTo(w * .62, -h, w * .98, -h * .42, w, h * .28); x.bezierCurveTo(w * 1.01, h * .82, w * .62, h, 0, h);
  x.bezierCurveTo(-w * .62, h, -w * 1.01, h * .82, -w, h * .28); x.bezierCurveTo(-w * .98, -h * .42, -w * .62, -h, 0, -h); x.closePath();
}
function heart(x, cx, cy, s) { x.beginPath(); x.moveTo(cx, cy + s * .35); x.bezierCurveTo(cx - s, cy - s * .3, cx - s * .45, cy - s, cx, cy - s * .45); x.bezierCurveTo(cx + s * .45, cy - s, cx + s, cy - s * .3, cx, cy + s * .35); x.fill(); }
function drawHero(t, dt) {
  const ch = MR.CH(localStorage.getItem('mr_pj') || 'mochi'), col = ch.color;
  hx.setTransform(dpr, 0, 0, dpr, 0, 0); hx.clearRect(0, 0, HW, HH);
  happy = Math.max(0, happy - dt);
  // saltito suave cada 2,4 s + respiración continua
  const P = 2.4, ph = (t % P) / P; let h = 0, sq = Math.sin(t * 2.6) * .025;
  if (ph < .1) sq += Math.sin(ph / .1 * Math.PI) * .1;
  else if (ph < .42) { const a = (ph - .1) / .32; h = Math.sin(a * Math.PI); sq -= (a < .3 ? .09 * (1 - a / .3) : 0); }
  else if (ph < .52) sq += Math.sin((ph - .42) / .1 * Math.PI) * .13;
  if (happy > 0) { h = Math.max(h, Math.abs(Math.sin(happy * 7)) * .5); }
  const r = Math.min(HW, HH) * .33, gy = HH - r * .2, jump = h * r * .38;
  const w = r * 1.02 * (1 + sq), hh = r * .86 * (1 - sq);
  const cx = HW / 2, cy = gy - hh - jump + r * .04, tilt = Math.sin(t * .9) * .07;
  // oclusión de contacto
  const k = 1 - h * .4;
  let g = hx.createRadialGradient(cx, gy, 0, cx, gy, w * 1.1 * k); g.addColorStop(0, `rgba(120,50,110,${.16 * k})`); g.addColorStop(1, 'rgba(120,50,110,0)');
  hx.fillStyle = g; hx.beginPath(); hx.ellipse(cx, gy, w * 1.1 * k, r * .2 * k, 0, 0, 7); hx.fill();
  g = hx.createRadialGradient(cx, gy, 0, cx, gy, w * .7 * k); g.addColorStop(0, `rgba(100,30,90,${.3 * k * k})`); g.addColorStop(1, 'rgba(100,30,90,0)');
  hx.fillStyle = g; hx.beginPath(); hx.ellipse(cx, gy, w * .7 * k, r * .08 * k, 0, 0, 7); hx.fill();
  // corazoncitos y brillos de vez en cuando
  if (t > nextFx) { nextFx = t + 2.5 + Math.random() * 2.5; fx.push({ k: Math.random() < .5 ? 'h' : 's', x: (Math.random() < .5 ? -1 : 1) * (.75 + Math.random() * .3), y: -.5 - Math.random() * .4, vy: .25, a: 0, life: 1.6, s: .7 + Math.random() * .4 }); }
  hx.save(); hx.translate(cx, gy); hx.rotate(tilt * .6);
  // pies diminutos
  for (const sd of [-1, 1]) { const fg = hx.createLinearGradient(0, -r * .1, 0, r * .05); fg.addColorStop(0, shade(col, -.05)); fg.addColorStop(1, shade(col, -.28)); hx.fillStyle = fg; hx.beginPath(); hx.ellipse(sd * w * .36, -jump * .9 - r * .03, r * .17, r * .09, 0, 0, 7); hx.fill(); }
  hx.restore();
  hx.save(); hx.translate(cx, cy); hx.rotate(tilt);
  ears(hx, ch, w * .95, hh, r);
  // cuerpo: base + sombreado en capas
  body(hx, w, hh); g = hx.createLinearGradient(0, -hh, 0, hh); g.addColorStop(0, shade(col, .35)); g.addColorStop(.55, col); g.addColorStop(1, shade(col, -.2)); hx.fillStyle = g; hx.fill();
  hx.save(); body(hx, w, hh); hx.clip();
  g = hx.createRadialGradient(-w * .35, -hh * .45, 0, -w * .35, -hh * .45, r * 1.3); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(.45, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(255,255,255,0)'); hx.fillStyle = g; hx.fillRect(-w * 1.1, -hh * 1.1, w * 2.2, hh * 2.2);
  g = hx.createRadialGradient(w * .45, hh * .7, 0, w * .45, hh * .7, r * 1.1); g.addColorStop(0, 'rgba(110,30,90,.26)'); g.addColorStop(1, 'rgba(110,30,90,0)'); hx.fillStyle = g; hx.fillRect(-w * 1.1, -hh * 1.1, w * 2.2, hh * 2.2);
  // luz de borde (abajo-derecha, rebote cálido)
  hx.save(); hx.translate(-w * .07, -hh * .06); body(hx, w, hh); hx.restore(); hx.save(); hx.globalCompositeOperation = 'source-over';
  hx.lineWidth = r * .1; hx.strokeStyle = 'rgba(255,235,245,.45)'; hx.filter = `blur(${(r * .05 * dpr) | 0}px)`; hx.save(); hx.translate(w * .05, hh * .05); body(hx, w * .99, hh * .99); hx.restore();
  hx.beginPath(); hx.ellipse(w * .08, hh * .1, w * 1.02, hh * 1.0, 0, -.2, 2.2); hx.stroke(); hx.filter = 'none'; hx.restore();
  grainPat = grainPat || hx.createPattern(grain, 'repeat'); hx.globalAlpha = .5; hx.globalCompositeOperation = 'overlay'; hx.fillStyle = grainPat; hx.fillRect(-w, -hh, w * 2, hh * 2); hx.globalCompositeOperation = 'source-over'; hx.globalAlpha = 1;
  hx.restore();
  // bracitos (detrás del borde, saludan un poco)
  const wave = Math.sin(t * 3) * .25 + (happy > 0 ? Math.sin(t * 18) * .4 : 0);
  for (const sd of [-1, 1]) { hx.save(); hx.translate(sd * w * .8, hh * .5); hx.rotate(sd * (.5 + (sd > 0 ? wave : .1))); const ag = hx.createRadialGradient(-r * .03, -r * .03, 0, 0, 0, r * .16); ag.addColorStop(0, shade(col, .35)); ag.addColorStop(1, shade(col, -.15)); hx.fillStyle = ag; hx.beginPath(); hx.ellipse(0, 0, r * .09, r * .13, 0, 0, 7); hx.fill(); hx.strokeStyle = 'rgba(120,40,100,.18)'; hx.lineWidth = r * .02; hx.stroke(); hx.restore(); }
  // brillo especular grande y suave + punto
  g = hx.createRadialGradient(-w * .42, -hh * .55, 0, -w * .42, -hh * .55, r * .38); g.addColorStop(0, 'rgba(255,255,255,.85)'); g.addColorStop(.5, 'rgba(255,255,255,.3)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  hx.fillStyle = g; hx.beginPath(); hx.ellipse(-w * .42, -hh * .55, r * .36, r * .22, -.55, 0, 7); hx.fill();
  hx.fillStyle = 'rgba(255,255,255,.95)'; hx.beginPath(); hx.ellipse(-w * .52, -hh * .58, r * .07, r * .045, -.55, 0, 7); hx.fill();
  // cara: ojos grandes, separados y bajos
  if (t > blinkAt) { blinkT = t; blinkAt = t + 2.2 + Math.random() * 2.8; }
  const bl = blinkT >= 0 && t - blinkT < .14 ? Math.sin((t - blinkT) / .14 * Math.PI) : 0;
  const ey = hh * .16, ex = w * .4, er = r * .16, ink = '#3b2238', isH = happy > 0;
  for (const sd of [-1, 1]) {
    const x0 = sd * ex;
    if (isH) { hx.strokeStyle = ink; hx.lineWidth = r * .055; hx.lineCap = 'round'; hx.beginPath(); hx.moveTo(x0 - er * .9, ey + er * .25); hx.quadraticCurveTo(x0, ey - er * 1.1, x0 + er * .9, ey + er * .25); hx.stroke(); continue; }
    hx.save(); hx.translate(x0, ey); hx.scale(1, Math.max(.07, 1 - bl));
    const eg = hx.createLinearGradient(0, -er, 0, er * 1.2); eg.addColorStop(0, '#2a1630'); eg.addColorStop(.7, '#4a2a52'); eg.addColorStop(1, '#7a4f8f');
    hx.fillStyle = eg; hx.beginPath(); hx.ellipse(0, 0, er * .86, er * 1.08, 0, 0, 7); hx.fill();
    hx.fillStyle = '#fff'; hx.beginPath(); hx.ellipse(-er * .28, -er * .4, er * .36, er * .4, -.3, 0, 7); hx.fill();
    hx.beginPath(); hx.arc(er * .32, er * .38, er * .16, 0, 7); hx.fill();
    hx.restore();
  }
  // mofletes difuminados
  for (const sd of [-1, 1]) { g = hx.createRadialGradient(sd * w * .64, ey + r * .2, 0, sd * w * .64, ey + r * .2, r * .2); g.addColorStop(0, 'rgba(255,110,150,.6)'); g.addColorStop(1, 'rgba(255,110,150,0)'); hx.fillStyle = g; hx.beginPath(); hx.ellipse(sd * w * .64, ey + r * .2, r * .22, r * .14, 0, 0, 7); hx.fill();
    hx.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 3; i++) { hx.beginPath(); hx.arc(sd * w * .64 + (i - 1) * r * .055, ey + r * .17 - Math.abs(i - 1) * r * .02, r * .012, 0, 7); hx.fill(); } }
  // boquita ω
  const my = ey + r * .14, mw = r * .07;
  hx.strokeStyle = ink; hx.lineWidth = r * .04; hx.lineCap = 'round'; hx.lineJoin = 'round'; hx.beginPath();
  hx.arc(-mw, my, mw, Math.PI * .05, Math.PI * .95); hx.moveTo(mw * 2, my); hx.arc(mw, my, mw, Math.PI * .05, Math.PI * .95); hx.stroke();
  if (isH) { hx.fillStyle = '#ff7f9f'; hx.beginPath(); hx.ellipse(0, my + mw * 1.1, mw * .7, mw * .55, 0, 0, 7); hx.fill(); }
  if (ch.id === 'disco') { hx.fillStyle = 'rgba(58,42,90,.85)'; hx.beginPath(); hx.roundRect(-ex - er * 1.3, ey - er * 1.3, ex * 2 + er * 2.6, er * 2.4, er * .9); hx.fill(); hx.fillStyle = 'rgba(255,255,255,.55)'; hx.fillRect(-ex - er * .6, ey - er * .9, er * .9, er * .3); hx.fillRect(ex - er * .6, ey - er * .9, er * .9, er * .3); }
  if (ch.id === 'copito') { hx.fillStyle = '#ff9cc8'; hx.beginPath(); hx.ellipse(0, -hh * .9, w * .6, r * .2, 0, Math.PI, 0); hx.fill(); hx.fillStyle = '#fff'; hx.beginPath(); hx.arc(0, -hh * 1.12, r * .1, 0, 7); hx.fill(); }
  hx.restore();
  // partículas
  fx = fx.filter(p => (p.a += dt) < p.life);
  for (const p of fx) { const q = p.a / p.life, x = cx + p.x * r * 1.3 + Math.sin(p.a * 5) * r * .05, y = cy + (p.y - p.vy * p.a * 2.2) * r, al = Math.min(1, q * 6) * (1 - q), s = r * .13 * p.s * (.6 + Math.min(1, q * 4) * .4);
    hx.globalAlpha = al;
    if (p.k === 'h') { hx.fillStyle = '#ff7fae'; heart(hx, x, y, s); hx.fillStyle = 'rgba(255,255,255,.7)'; hx.beginPath(); hx.arc(x - s * .4, y - s * .45, s * .15, 0, 7); hx.fill(); }
    else { hx.fillStyle = '#fff6c0'; hx.beginPath(); hx.moveTo(x, y - s); hx.quadraticCurveTo(x, y, x + s, y); hx.quadraticCurveTo(x, y, x, y + s); hx.quadraticCurveTo(x, y, x - s, y); hx.quadraticCurveTo(x, y, x, y - s); hx.fill(); }
    hx.globalAlpha = 1; }
}
let last = performance.now(), wasOn = false;
function frame(now) {
  const on = M.classList.contains('on');
  if (on) { if (!wasOn) size(); const t = now / 1000, dt = Math.min(.05, (now - last) / 1000); drawBg(t); if (hero.offsetParent) drawHero(t, dt); }
  wasOn = on; last = now; requestAnimationFrame(frame);
}
size(); requestAnimationFrame(frame);
})();
