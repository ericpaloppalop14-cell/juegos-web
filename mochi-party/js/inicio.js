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

// ---------- mochi protagonista ----------
let poke = 0, blinkAt = 1.5, blinkT = -1, lookX = 0, lookY = 0, lookTx = 0, lookTy = 0, lookAt = 0;
hero.addEventListener('pointerdown', () => { poke = 1; try { navigator.vibrate && navigator.vibrate(12); } catch (e) {} });
function ears(x, ch, rx, ry, r, lit) {
  const c = shade(ch.color, -0.1), inner = rgba(ch.inner || '#ffffff', .8);
  x.fillStyle = c;
  const fill = (path, ip) => { x.fillStyle = c; path(); x.fill(); if (ip) { x.fillStyle = inner; ip(); x.fill(); } };
  if (ch.ears === 'bunny') for (const s of [-1, 1]) fill(() => { x.beginPath(); x.ellipse(s * rx * .4, -ry * 1.08, r * .19, r * .5, s * .22, 0, 7); }, () => { x.beginPath(); x.ellipse(s * rx * .4, -ry * 1.05, r * .09, r * .36, s * .22, 0, 7); });
  if (ch.ears === 'bear') for (const s of [-1, 1]) fill(() => { x.beginPath(); x.arc(s * rx * .62, -ry * .72, r * .26, 0, 7); }, () => { x.beginPath(); x.arc(s * rx * .62, -ry * .72, r * .13, 0, 7); });
  if (ch.ears === 'cat') for (const s of [-1, 1]) fill(() => { x.beginPath(); x.moveTo(s * rx * .22, -ry * .82); x.quadraticCurveTo(s * rx * .7, -ry * 1.35, s * rx * .82, -ry * .42); x.closePath(); }, () => { x.beginPath(); x.moveTo(s * rx * .36, -ry * .78); x.quadraticCurveTo(s * rx * .66, -ry * 1.12, s * rx * .72, -ry * .55); x.closePath(); });
  if (ch.ears === 'horns') { x.fillStyle = '#fff3c0'; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * rx * .28, -ry * .8); x.quadraticCurveTo(s * rx * .5, -ry * 1.3, s * rx * .58, -ry * 1.32); x.lineTo(s * rx * .66, -ry * .62); x.fill(); } }
  if (ch.ears === 'fins') for (const s of [-1, 1]) fill(() => { x.beginPath(); x.ellipse(s * rx * 1.02, ry * .05, r * .32, r * .15, s * .6, 0, 7); });
  if (ch.ears === 'antenna') { x.strokeStyle = shade(ch.color, -0.3); x.lineWidth = r * .07; x.lineCap = 'round'; x.beginPath(); x.moveTo(0, -ry * .9); x.quadraticCurveTo(r * .1, -ry * 1.2, 0, -ry * 1.36); x.stroke(); const g = x.createRadialGradient(-r * .04, -ry * 1.44, 0, 0, -ry * 1.4, r * .15); g.addColorStop(0, '#fffde0'); g.addColorStop(1, '#ffd84a'); x.fillStyle = g; x.beginPath(); x.arc(0, -ry * 1.4, r * .14, 0, 7); x.fill(); }
}
function drawHero(t, dt) {
  const ch = MR.CH(localStorage.getItem('mr_pj') || 'mochi');
  hx.setTransform(dpr, 0, 0, dpr, 0, 0); hx.clearRect(0, 0, HW, HH);
  // ciclo de salto: 1,1 s. Agachado → despegue (estira) → aire → aterrizaje (aplasta)
  const P = 1.1, ph = (t % P) / P; let h = 0, sq = 0;
  if (ph < .18) { sq = Math.sin(ph / .18 * Math.PI) * .16; }            // se agacha
  else if (ph < .82) { const a = (ph - .18) / .64; h = Math.sin(a * Math.PI); sq = a < .25 ? -.16 * (1 - a / .25) : a > .8 ? -.1 * ((a - .8) / .2) : 0; }
  else { sq = Math.sin((ph - .82) / .18 * Math.PI) * .22; }             // aterriza y se aplasta
  poke = Math.max(0, poke - dt * 2.2); sq += Math.sin(poke * 18) * poke * .25;
  const r = Math.min(HW, HH) * .34, gy = HH - r * .32, jump = h * r * .55;
  const rx = r * (1 + sq), ry = r * .9 * (1 - sq);
  const cx = HW / 2, cy = gy - ry - jump;
  // sombra de contacto (más pequeña y clara en el aire)
  const ss = 1 - h * .45; const sg = hx.createRadialGradient(cx + r * .12, gy, 0, cx + r * .12, gy, rx * ss);
  sg.addColorStop(0, `rgba(110,50,120,${.32 - h * .15})`); sg.addColorStop(1, 'rgba(110,50,120,0)'); hx.fillStyle = sg; hx.beginPath(); hx.ellipse(cx + r * .12, gy, rx * ss, r * .17 * ss, 0, 0, 7); hx.fill();
  hx.save(); hx.translate(cx, cy); hx.rotate(Math.sin(t * 2.2) * .04);
  ears(hx, ch, rx, ry, r);
  // cuerpo con luz arriba-izquierda
  const g = hx.createRadialGradient(L.x * rx * .45, L.y * ry * .5, r * .05, 0, 0, r * 1.2);
  g.addColorStop(0, shade(ch.color, .62)); g.addColorStop(.5, ch.color); g.addColorStop(1, shade(ch.color, -.25));
  hx.fillStyle = g; hx.beginPath(); hx.ellipse(0, 0, rx, ry, 0, 0, 7); hx.fill();
  hx.save(); hx.clip();
  // oclusión abajo-derecha
  const o = hx.createRadialGradient(rx * .5, ry * .8, 0, rx * .5, ry * .8, r); o.addColorStop(0, 'rgba(90,30,90,.22)'); o.addColorStop(1, 'rgba(90,30,90,0)'); hx.fillStyle = o; hx.fillRect(-rx, -ry, rx * 2, ry * 2);
  // luz rebotada del suelo
  hx.fillStyle = 'rgba(255,240,250,.25)'; hx.beginPath(); hx.ellipse(0, ry * 1.05, rx * .8, ry * .25, 0, 0, 7); hx.fill();
  // grano de textura
  grainPat = grainPat || hx.createPattern(grain, 'repeat'); hx.globalCompositeOperation = 'overlay'; hx.fillStyle = grainPat; hx.fillRect(-rx, -ry, rx * 2, ry * 2); hx.globalCompositeOperation = 'source-over';
  hx.restore();
  // brillo especular (misma luz)
  hx.fillStyle = 'rgba(255,255,255,.75)'; hx.beginPath(); hx.ellipse(-rx * .46, -ry * .55, rx * .2, ry * .1, -.6, 0, 7); hx.fill();
  hx.fillStyle = 'rgba(255,255,255,.9)'; hx.beginPath(); hx.arc(-rx * .22, -ry * .7, r * .045, 0, 7); hx.fill();
  // cara
  if (t > lookAt) { lookTx = (Math.random() - .5) * .8; lookTy = (Math.random() - .5) * .5; lookAt = t + 1 + Math.random() * 2; }
  lookX += (lookTx - lookX) * Math.min(1, dt * 8); lookY += (lookTy - lookY) * Math.min(1, dt * 8);
  if (t > blinkAt) { blinkT = t; blinkAt = t + 2 + Math.random() * 2.5; }
  const bl = blinkT >= 0 && t - blinkT < .16 ? Math.sin((t - blinkT) / .16 * Math.PI) : 0;
  const pop = 1 + (ph > .82 ? Math.sin((ph - .82) / .18 * Math.PI) * .14 : 0) + poke * .2;   // ojos saltones al aterrizar
  const ey = -ry * .12, er = r * .2 * pop, ex = rx * .36;
  for (const s of [-1, 1]) {
    hx.save(); hx.translate(s * ex, ey); hx.scale(1, Math.max(.08, 1 - bl));
    hx.fillStyle = 'rgba(80,30,70,.18)'; hx.beginPath(); hx.ellipse(r * .02, er * .1, er * 1.02, er * 1.14, 0, 0, 7); hx.fill();
    hx.fillStyle = '#fff'; hx.beginPath(); hx.ellipse(0, 0, er, er * 1.1, 0, 0, 7); hx.fill();
    const px = lookX * er * .3, py = lookY * er * .3 + er * .08;
    const ig = hx.createRadialGradient(px, py + er * .3, 0, px, py, er * .78); ig.addColorStop(0, '#8a5bd0'); ig.addColorStop(.55, '#3e2459'); ig.addColorStop(1, '#24122f');
    hx.fillStyle = ig; hx.beginPath(); hx.ellipse(px, py, er * .74, er * .82, 0, 0, 7); hx.fill();
    hx.fillStyle = '#fff'; hx.beginPath(); hx.ellipse(px - er * .28, py - er * .32, er * .25, er * .28, 0, 0, 7); hx.fill();
    hx.beginPath(); hx.arc(px + er * .28, py + er * .3, er * .11, 0, 7); hx.fill();
    hx.restore();
  }
  // mofletes
  for (const s of [-1, 1]) { const bg2 = hx.createRadialGradient(s * rx * .62, ey + r * .3, 0, s * rx * .62, ey + r * .3, r * .17); bg2.addColorStop(0, 'rgba(255,100,150,.55)'); bg2.addColorStop(1, 'rgba(255,100,150,0)'); hx.fillStyle = bg2; hx.beginPath(); hx.ellipse(s * rx * .62, ey + r * .3, r * .17, r * .11, 0, 0, 7); hx.fill(); }
  // sonrisa abierta
  const my = ey + r * .3, mw = r * (.2 + h * .05);
  hx.fillStyle = '#5a2140'; hx.beginPath(); hx.moveTo(-mw, my); hx.quadraticCurveTo(0, my + r * .05, mw, my); hx.quadraticCurveTo(mw * .8, my + r * .3, 0, my + r * .3); hx.quadraticCurveTo(-mw * .8, my + r * .3, -mw, my); hx.fill();
  hx.save(); hx.clip(); hx.fillStyle = '#ff7a9e'; hx.beginPath(); hx.ellipse(0, my + r * .3, mw * .6, r * .13, 0, 0, 7); hx.fill(); hx.restore();
  hx.strokeStyle = '#5a2140'; hx.lineWidth = r * .035; hx.lineCap = 'round'; for (const s of [-1, 1]) { hx.beginPath(); hx.arc(s * mw * 1.05, my - r * .02, r * .04, s > 0 ? Math.PI * .9 : -Math.PI * .1, s > 0 ? Math.PI * 1.6 : Math.PI * .1 + .4, s < 0); hx.stroke(); }
  // complementos especiales de algunos mochis
  if (ch.id === 'disco') { hx.fillStyle = 'rgba(58,42,90,.85)'; hx.beginPath(); hx.roundRect(-rx * .66, ey - er * .9, rx * 1.32, er * 1.6, er * .6); hx.fill(); hx.fillStyle = 'rgba(255,255,255,.5)'; hx.fillRect(-rx * .5, ey - er * .6, rx * .25, er * .2); }
  if (ch.id === 'copito') { hx.fillStyle = '#ff9cc8'; hx.beginPath(); hx.ellipse(0, -ry * .86, rx * .7, r * .2, 0, Math.PI, 0); hx.fill(); hx.fillStyle = '#fff'; hx.beginPath(); hx.arc(0, -ry * 1.08, r * .1, 0, 7); hx.fill(); }
  hx.restore();
  // chispitas al aterrizar
  if (ph > .82) { const a = (ph - .82) / .18; hx.fillStyle = `rgba(255,255,255,${1 - a})`; for (let i = 0; i < 6; i++) { const ang = Math.PI + i / 5 * Math.PI, d = r * (.9 + a * .6); hx.beginPath(); hx.arc(cx + Math.cos(ang) * d * 1.2, gy + Math.sin(ang) * d * .25 - 4, 3 * (1 - a) + 1, 0, 7); hx.fill(); } }
}
let last = performance.now(), wasOn = false;
function frame(now) {
  const on = M.classList.contains('on');
  if (on) { if (!wasOn) size(); const t = now / 1000, dt = Math.min(.05, (now - last) / 1000); drawBg(t); drawHero(t, dt); }
  wasOn = on; last = now; requestAnimationFrame(frame);
}
size(); requestAnimationFrame(frame);
})();
