'use strict';
// ===== Mochi Olimpiadas v2 — núcleo =====
const cv = document.getElementById('c'); let g = cv.getContext('2d');
const BOT = /bot=1/.test(location.search), FF = /ff=1/.test(location.search), SLOW = +((location.search.match(/slow=([\d.]+)/) || [])[1] || 1); // slow= solo para grabar fotogramas en los tests
let W = 400, H = 700, SC = 1, DPR = 1;
function resize() {
  DPR = Math.min(3, window.devicePixelRatio || 1);
  const cw = innerWidth, ch = innerHeight; SC = cw / 400; W = 400; H = Math.max(600, ch / SC);
  if (H * SC > ch) { SC = ch / H; W = cw / SC; }
  cv.width = Math.round(cw * DPR); cv.height = Math.round(ch * DPR); cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
}
addEventListener('resize', resize); resize();
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, k) => a + (b - a) * k, rnd = (a, b) => a + Math.random() * (b - a);
const mix = (a, b, k) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * k));
const rgbs = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const ease = k => 1 - Math.pow(1 - k, 3);
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const PINK = [255, 158, 199], LILAC = [185, 161, 245], MOCHI = [255, 196, 220];
let T = 0;
// semilla determinista para decorados
function srand(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
// textura de grano fino a resolución nativa (papel/madera/agua), para dar detalle a los fondos
let GRAIN = null;
function grain(a = 0.06) {
  if (!GRAIN) { const c = document.createElement('canvas'); c.width = c.height = 192; const x = c.getContext('2d'), R = srand(99), d = x.createImageData(192, 192);
    for (let i = 0; i < d.data.length; i += 4) { const v = R(); d.data[i] = d.data[i + 1] = d.data[i + 2] = v > 0.5 ? 255 : 60; d.data[i + 3] = Math.abs(v - 0.5) * 2 * 255 * (R() < 0.5 ? 1 : 0.4); } x.putImageData(d, 0, 0); GRAIN = c; }
  const pat = g.createPattern(GRAIN, 'repeat'); if (pat.setTransform) pat.setTransform(new DOMMatrix().scale(1 / (DPR * SC)));
  g.save(); g.globalAlpha = a; g.globalCompositeOperation = 'overlay'; g.fillStyle = pat; g.fillRect(0, 0, W, H); g.restore();
}
// capas estáticas cacheadas (fondos ilustrados): se dibujan una vez por tamaño de pantalla
const LAYERS = {};
function layer(key, fn) {
  const k = key + '|' + cv.width + 'x' + cv.height + '|' + W.toFixed(1) + '|' + H.toFixed(1);
  let c = LAYERS[key];
  if (!c || c.k !== k) { if (key !== 'vig') for (const o in LAYERS) if (o !== 'vig' && o !== key) delete LAYERS[o]; // solo una capa grande en memoria
    const oc = document.createElement('canvas'); oc.width = cv.width; oc.height = cv.height; const old = g; g = oc.getContext('2d'); g.setTransform(DPR * SC, 0, 0, DPR * SC, 0, 0); fn(); g = old; c = LAYERS[key] = { k, oc }; }
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(c.oc, 0, 0); g.restore();
}
// ===== Sonido (mismo sintetizador WebAudio suave que Mochi) =====
const Snd = {
  ac: null, master: null,
  init() {
    if (!this.ac) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; this.ac = new AC();
      const comp = this.ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
      this.master = this.ac.createGain(); this.master.gain.value = 0.6; this.master.connect(comp); comp.connect(this.ac.destination);
      this.noiseBuf = this.ac.createBuffer(1, this.ac.sampleRate * 0.5, this.ac.sampleRate);
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    if (this.ac.state !== 'running') this.ac.resume().catch(() => {});
  },
  tone(f, dur, { type = 'sine', vol = 0.2, to = null, delay = 0, attack = 0.005 } = {}) {
    if (!this.ac) return; const t = this.ac.currentTime + delay, o = this.ac.createOscillator(), gg = this.ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    gg.gain.setValueAtTime(0.0001, t); gg.gain.linearRampToValueAtTime(vol, t + attack); gg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gg); gg.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, { vol = 0.1, freq = 1200, q = 1, to = null, delay = 0, type = 'bandpass' } = {}) {
    if (!this.ac) return; const t = this.ac.currentTime + delay, s = this.ac.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ac.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q; if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const gg = this.ac.createGain(); gg.gain.setValueAtTime(vol, t); gg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(gg); gg.connect(this.master); s.start(t); s.stop(t + dur + 0.05);
  },
  boing(k = 1) { this.tone(220 * k, 0.25, { vol: 0.15, to: 520 * k }); this.tone(440 * k, 0.15, { type: 'triangle', vol: 0.05, delay: 0.04 }); },
  squish() { this.noise(0.15, { vol: 0.09, freq: 500, type: 'lowpass' }); this.tone(300, 0.14, { vol: 0.12, to: 120 }); },
  swipe() { this.noise(0.11, { vol: 0.07, freq: 900, to: 2600, q: 0.8 }); },
  hit() { this.noise(0.08, { vol: 0.12, freq: 2200, q: 2 }); this.tone(880, 0.08, { type: 'triangle', vol: 0.06 }); },
  splash() { this.noise(0.4, { vol: 0.12, freq: 1800, to: 300, q: 0.7 }); },
  bad() { this.tone(330, 0.2, { vol: 0.12, to: 160, type: 'triangle' }); },
  croak() { this.tone(110, 0.18, { type: 'sawtooth', vol: 0.05, to: 80 }); this.tone(140, 0.12, { type: 'square', vol: 0.03, delay: 0.12, to: 90 }); },
  win(n = 3) { [523, 659, 784, 1047].slice(0, n + 1).forEach((f, i) => this.tone(f, 0.22, { type: 'triangle', vol: 0.13, delay: i * 0.1 })); },
  tick() { this.tone(1200, 0.04, { vol: 0.04 }); },
  cheer(k = 1) { this.noise(1.6, { vol: 0.09 * k, freq: 900, to: 1500, q: 0.5 }); this.noise(1.2, { vol: 0.05 * k, freq: 2400, q: 0.9, delay: 0.15 }); for (let i = 0; i < 6; i++) this.tone(700 + Math.random() * 500, 0.12, { type: 'triangle', vol: 0.015 * k, delay: 0.1 + i * 0.13 }); },
};

// ===== Partículas, textos, sacudida =====
let parts = [], pops = [], shake = 0, flash = 0;
function burst(x, y, n, col, sp = 200, life = 0.7, sz = 5) { for (let i = 0; i < n; i++) { const a = rnd(0, 6.283), v = rnd(0.3, 1) * sp; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * 0.3, life, max: life, sz: rnd(0.5, 1) * sz, col, gr: 500 }); } }
function stars(x, y, n = 8) { for (let i = 0; i < n; i++) { const a = rnd(0, 6.283), v = rnd(80, 220); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.8, max: 0.8, sz: rnd(5, 9), col: [255, 225, 120], star: 1, gr: 100, rot: rnd(0, 6) }); } }
const CONF = [[255, 158, 199], [185, 161, 245], [255, 211, 77], [140, 220, 190], [130, 200, 255]];
function confetti(x, y, n = 30, sp = 300) { for (let i = 0; i < n; i++) { const a = rnd(-2.6, -0.5), v = rnd(0.4, 1) * sp; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.6, max: 1.6, sz: rnd(4, 7), col: CONF[i % 5], conf: 1, gr: 380, rot: rnd(0, 6), vr: rnd(-12, 12) }); } }
function puff(x, y, n = 6, col = [255, 255, 255]) { for (let i = 0; i < n; i++) parts.push({ x: x + rnd(-10, 10), y: y + rnd(-4, 4), vx: rnd(-60, 60), vy: rnd(-50, -10), life: 0.6, max: 0.6, sz: rnd(6, 11), col, gr: -20, soft: 1 }); }
function pop(x, y, t, col = '#f27bb2', sz = 26) { pops.push({ x, y, txt: t, col, sz, life: 1.2 }); }
function updFx(dt) {
  for (const p of parts) { p.life -= dt; p.vy += p.gr * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.conf) { p.vx *= 1 - 1.5 * dt; p.rot += p.vr * dt; } if (p.soft) p.sz += 14 * dt; }
  parts = parts.filter(p => p.life > 0); if (parts.length > 500) parts.splice(0, parts.length - 500);
  for (const p of pops) { p.life -= dt; p.y -= 38 * dt; } pops = pops.filter(p => p.life > 0); shake = Math.max(0, shake - dt * 30); flash = Math.max(0, flash - dt * 3);
}
function star5(x, y, r, rot = 0) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + rot + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); }
let FXP = null; // proyección 3D activa
function fxAt(p) { if (!FXP) return null; const q = R3D.proj(p.x, p.y); if (!q || !q[3]) return null; return [q[0] / SC, q[1] / SC, clamp(q[2] / SC, 0.25, 3)]; }
function drawFx() {
  if (FXP) { for (const p of parts) { const q = fxAt(p); if (!q) continue; const a = clamp(p.life / p.max, 0, 1), sz = p.sz * q[2]; g.globalAlpha = p.soft ? a * 0.45 : a; g.fillStyle = rgbs(p.col);
      if (p.star) { star5(q[0], q[1], sz * (0.6 + a * 0.4), (p.rot || 0) + T * 3); g.fill(); } else if (p.conf) { g.save(); g.translate(q[0], q[1]); g.rotate(p.rot); g.scale(1, Math.abs(Math.cos(p.rot * 1.3)) + 0.2); g.fillRect(-sz / 2, -sz / 4, sz, sz / 2); g.restore(); } else { g.beginPath(); g.arc(q[0], q[1], sz, 0, 7); g.fill(); } }
    g.globalAlpha = 1;
    for (const p of pops) { const q = fxAt(p) || [p.x, p.y, 1]; const k = 1.2 - p.life, s = k < 0.15 ? 0.6 + k / 0.15 * 0.55 : k < 0.3 ? 1.15 - (k - 0.15) / 0.15 * 0.15 : 1; g.globalAlpha = clamp(p.life * 2.5, 0, 1); g.save(); g.translate(clamp(q[0], 70, W - 70), clamp(q[1], 110, H - 90)); g.scale(s, s); txt(p.txt, 0, 0, p.sz, p.col); g.restore(); }
    g.globalAlpha = 1; return; }
  for (const p of parts) { const a = clamp(p.life / p.max, 0, 1); g.globalAlpha = p.soft ? a * 0.5 : a; g.fillStyle = rgbs(p.col);
    if (p.star) { star5(p.x, p.y, p.sz * (0.6 + a * 0.4), (p.rot || 0) + T * 3); g.fill(); }
    else if (p.conf) { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.scale(1, Math.abs(Math.cos(p.rot * 1.3)) + 0.2); g.fillRect(-p.sz / 2, -p.sz / 4, p.sz, p.sz / 2); g.restore(); }
    else { g.beginPath(); g.arc(p.x, p.y, p.sz, 0, 7); g.fill(); } }
  g.globalAlpha = 1;
  for (const p of pops) { const k = 1.2 - p.life, s = k < 0.15 ? 0.6 + k / 0.15 * 0.55 : k < 0.3 ? 1.15 - (k - 0.15) / 0.15 * 0.15 : 1; g.globalAlpha = clamp(p.life * 2.5, 0, 1); g.save(); g.translate(p.x, p.y); g.scale(s, s); txt(p.txt, 0, 0, p.sz, p.col); g.restore(); }
  g.globalAlpha = 1;
}
function txt(s, x, y, sz = 24, col = '#fff', align = 'center', outline = 'rgba(30,18,36,.85)') {
  g.font = `700 ${sz}px Fredoka, ui-rounded, sans-serif`; g.textAlign = align; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = sz * 0.28; g.strokeStyle = 'rgba(90,30,80,.18)'; g.strokeText(s, x, y + sz * 0.08);
  g.lineWidth = sz * 0.22; g.strokeStyle = outline; g.strokeText(s, x, y); g.fillStyle = col; g.fillText(s, x, y);
}
function rr(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
// pastilla de HUD (cristal blanco, sombra suave)
function pill(x, y, w, h, label, col = '#a05bb8', align = 'center', icon = '') {
  g.save(); g.fillStyle = 'rgba(0,0,0,.22)'; rr(x, y + 3, w, h, h / 2); g.fill();
  const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(34,28,44,.78)'); gr.addColorStop(1, 'rgba(18,14,24,.72)'); g.fillStyle = gr; rr(x, y, w, h, h / 2); g.fill();
  g.strokeStyle = 'rgba(232,196,120,.55)'; g.lineWidth = 1.2; g.stroke(); g.fillStyle = 'rgba(255,255,255,.08)'; rr(x + 3, y + 2, w - 6, h * 0.42, h * 0.3); g.fill();
  g.font = `700 ${h * 0.5}px Fredoka, ui-rounded, sans-serif`; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillStyle = col === '#e2559a' ? '#f2d27a' : '#f6efe6'; g.fillText(icon + label, x + w / 2, y + h / 2 + 1); g.restore();
}
function hud(l, c, r) { const y = 14; if (l) pill(12, y, 116, 34, l); if (c) pill(200 - 60, y, 120, 34, c, '#e2559a'); if (r) pill(W - 128, y, 116, 34, r); }
function hint(s, y) { const a = 0.75 + 0.25 * Math.sin(T * 4); g.globalAlpha = a; g.font = '700 17px Fredoka, sans-serif'; const w = g.measureText(s).width + 36; g.globalAlpha = 1; g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(16,12,22,.62)'; rr(200 - w / 2, y - 17, w, 34, 17); g.fill(); g.font = '700 17px Fredoka, sans-serif'; g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, 200, y + 1); g.restore(); }
function bar(x, y, w, h, k, col, gold) { g.fillStyle = 'rgba(90,40,100,.25)'; rr(x, y + 2, w, h, h / 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.92)'; rr(x, y, w, h, h / 2); g.fill(); if (gold) { g.fillStyle = 'rgba(255,211,77,.55)'; rr(x + w * gold[0], y, w * (gold[1] - gold[0]), h, h / 2); g.fill(); }
  if (k > 0.01) { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#ffc2dd'); gr.addColorStop(1, col); g.fillStyle = gr; rr(x + 2, y + 2, Math.max(h - 4, (w - 4) * k), h - 4, (h - 4) / 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; rr(x + 5, y + 3, Math.max(0, (w - 10) * k), (h - 4) * 0.35, 3); g.fill(); } }
function vignette() { layer('vig', () => { const gr = g.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H * 0.5, Math.max(W, H) * 0.75); gr.addColorStop(0, 'rgba(80,20,90,0)'); gr.addColorStop(1, 'rgba(80,20,90,.28)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }); }
function glow(x, y, r, col, a = 0.5) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgbs(col, a)); gr.addColorStop(1, rgbs(col, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }

// ===== El mochi (silueta Mochi + parpadeo, respiración, cejas y reflejos) =====
function drawMochi(x, y, size, m = {}) {
  const col = m.col || MOCHI, light = mix(col, [255, 255, 255], 0.65), dark = mix(col, [170, 70, 150], 0.22), deep = mix(col, [90, 30, 100], 0.45);
  const br = m.still ? 0 : Math.sin(T * 3 + x * 0.01) * 0.025;
  const w = size * 1.12, h = size * 0.95 * 0.86;
  g.save(); g.translate(x, y); g.rotate(m.rot || 0); g.scale((m.sx || 1) * (1 + br), (m.sy || 1) * (1 - br)); g.globalAlpha = m.alpha == null ? 1 : m.alpha;
  const body = () => { g.beginPath(); g.moveTo(0, -h); g.bezierCurveTo(w * 0.5, -h, w * 0.5, -h * 0.62, w * 0.5, -h * 0.3); g.bezierCurveTo(w * 0.5, -h * 0.02, w * 0.3, -h * 0.02, 0, -h * 0.03); g.bezierCurveTo(-w * 0.3, -h * 0.02, -w * 0.5, -h * 0.02, -w * 0.5, -h * 0.3); g.bezierCurveTo(-w * 0.5, -h * 0.62, -w * 0.5, -h, 0, -h); g.closePath(); };
  // sombra de contacto
  g.fillStyle = 'rgba(120,40,110,.18)'; g.beginPath(); g.ellipse(0, -h * 0.02, w * 0.42, h * 0.07, 0, 0, 7); g.fill();
  g.fillStyle = rgbs(dark); const fl = m.foot || 0;
  g.beginPath(); g.ellipse(-w * 0.2, -h * 0.05 - Math.max(0, fl) * h * 0.08, w * 0.15, h * 0.085, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(w * 0.2, -h * 0.05 - Math.max(0, -fl) * h * 0.08, w * 0.15, h * 0.085, 0, 0, 7); g.fill();
  body(); const bg = g.createRadialGradient(-w * 0.15, -h * 0.75, w * 0.04, 0, -h * 0.45, h * 0.8);
  bg.addColorStop(0, rgbs(light)); bg.addColorStop(0.5, rgbs(col)); bg.addColorStop(1, rgbs(dark)); g.fillStyle = bg; g.fill();
  g.save(); body(); g.clip();
  const ig = g.createRadialGradient(w * 0.05, -h * 0.1, 0, w * 0.05, -h * 0.1, w * 0.45); ig.addColorStop(0, rgbs(light, 0.55)); ig.addColorStop(1, rgbs(light, 0));
  g.fillStyle = ig; g.fillRect(-w, -h, w * 2, h);
  // luz de borde
  g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = w * 0.06; g.beginPath(); g.arc(0, -h * 0.45, w * 0.47, -0.6, 0.5); g.stroke();
  g.fillStyle = rgbs(deep, 0.1); g.beginPath(); g.ellipse(w * 0.1, -h * 0.02, w * 0.55, h * 0.18, 0, 0, 7); g.fill(); g.restore();
  body(); g.lineWidth = Math.max(1.5, w * 0.025); g.strokeStyle = rgbs(deep, 0.5); g.stroke();
  g.fillStyle = rgbs(mix(col, light, 0.25), 0.97); g.strokeStyle = rgbs(deep, 0.3); g.lineWidth = Math.max(1, w * 0.014);
  if (m.armsUp) { const wv = Math.sin(T * 14) * 0.15; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * w * 0.43, -h * 0.62, w * 0.075, h * 0.11, s * (0.45 + wv), 0, 7); g.fill(); g.stroke(); } }
  else { for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * w * 0.33, -h * 0.2, w * 0.075, h * 0.05, -s * 0.9, 0, 7); g.fill(); g.stroke(); } }
  g.fillStyle = 'rgba(255,255,255,0.92)'; g.beginPath(); g.ellipse(-w * 0.23, -h * 0.76, w * 0.1, w * 0.045, -0.75, 0, 7); g.fill();
  g.beginPath(); g.arc(-w * 0.33, -h * 0.62, w * 0.025, 0, 7); g.fill();
  const fy = -h * 0.52, ex = w * 0.17, erx = w * 0.085, ery = w * 0.105, f = m.face || 'idle';
  const blink = (f === 'idle' || f === 'wow') && !m.still && ((T + x * 0.003) % 3.4) < 0.12;
  g.lineCap = 'round';
  for (const sd of [-1, 1]) {
    const cx = sd * ex + (m.lookX || 0) * w * 0.03, cy = fy + (m.lookY || 0) * w * 0.02;
    if (f === 'happy' || blink) { g.strokeStyle = '#3d2348'; g.lineWidth = w * 0.032; g.beginPath(); if (blink) { g.moveTo(cx - erx, cy); g.quadraticCurveTo(cx, cy + ery * 0.5, cx + erx, cy); } else g.arc(cx, cy + ery * 0.2, erx * 0.8, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
    else if (f === 'squish') { g.strokeStyle = '#3d2348'; g.lineWidth = w * 0.032; g.beginPath(); g.moveTo(cx - sd * erx, cy - ery * 0.6); g.lineTo(cx + sd * erx * 0.6, cy); g.lineTo(cx - sd * erx, cy + ery * 0.6); g.stroke(); }
    else if (f === 'dizzy') { g.strokeStyle = '#3d2348'; g.lineWidth = w * 0.025; g.beginPath(); for (let a = 0; a < 12; a += 0.4) { const r = a * erx * 0.08; g.lineTo(cx + Math.cos(a + T * 8) * r, cy + Math.sin(a + T * 8) * r); } g.stroke(); }
    else {
      const sc = f === 'wow' ? 1.3 : f === 'focus' ? 0.85 : 1, ry = ery * sc; const eg = g.createLinearGradient(0, cy - ry, 0, cy + ry);
      eg.addColorStop(0, '#24142e'); eg.addColorStop(0.6, '#3a2246'); eg.addColorStop(1, '#8a5fae'); g.fillStyle = eg; g.beginPath(); g.ellipse(cx, cy, erx * sc, ry, 0, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx - erx * 0.3, cy - ry * 0.38, erx * 0.38, ry * 0.32, -0.3, 0, 7); g.fill(); g.beginPath(); g.arc(cx + erx * 0.35, cy + ry * 0.38, erx * 0.16, 0, 7); g.fill();
      if (f === 'focus') { g.strokeStyle = '#3d2348'; g.lineWidth = w * 0.025; g.beginPath(); g.moveTo(cx - erx * 1.1, cy - ery * 1.25 - sd * 0); g.lineTo(cx + erx * 1.1, cy - ery * 1.25 + sd * ery * 0.4 * -1); g.stroke(); }
    }
  }
  g.fillStyle = 'rgba(255,110,150,0.45)'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * w * 0.3, fy + h * 0.1, w * 0.075, w * 0.042, 0, 0, 7); g.fill(); }
  const my = fy + h * 0.1; g.strokeStyle = '#3d2348'; g.lineWidth = w * 0.025;
  if (f === 'wow' || f === 'squish') { g.fillStyle = '#c0436f'; g.beginPath(); g.ellipse(0, my + h * 0.03, w * 0.05, w * 0.06, 0, 0, 7); g.fill(); }
  else if (f === 'happy') { g.fillStyle = '#c0436f'; g.beginPath(); g.arc(0, my - w * 0.005, w * 0.06, 0.1, Math.PI - 0.1); g.closePath(); g.fill(); }
  else { g.beginPath(); g.moveTo(-w * 0.06, my); g.quadraticCurveTo(-w * 0.03, my + w * 0.05, 0, my); g.quadraticCurveTo(w * 0.03, my + w * 0.05, w * 0.06, my); g.stroke(); }
  if (m.band) { const bgr = g.createLinearGradient(0, -h * 0.82, 0, -h * 0.73); bgr.addColorStop(0, '#ff8fbd'); bgr.addColorStop(1, '#e8558f'); g.fillStyle = bgr; g.save(); body(); g.clip(); g.fillRect(-w * 0.6, -h * 0.82, w * 1.2, h * 0.09); g.restore(); const fl2 = Math.sin(T * 9) * 0.06; g.beginPath(); g.moveTo(w * 0.42, -h * 0.78); g.lineTo(w * 0.66, -h * (0.92 + fl2)); g.lineTo(w * 0.62, -h * (0.7 + fl2)); g.fill(); }
  if (m.sweat) { g.fillStyle = 'rgba(140,200,255,.9)'; const sy2 = -h * 0.85 + ((T * 1.5) % 1) * h * 0.4; g.beginPath(); g.moveTo(w * 0.42, sy2 - 8); g.quadraticCurveTo(w * 0.47, sy2, w * 0.42, sy2 + 4); g.quadraticCurveTo(w * 0.37, sy2, w * 0.42, sy2 - 8); g.fill(); }
  g.restore();
}
function spring(o, dt, k = 180, d = 10) { o.vs = (o.vs || 0) + ((1 - o.s) * k - o.vs * d) * dt; o.s += o.vs * dt; return o.s; }
function shadow(x, y, r, a = 0.2) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(110,40,110,${a})`); gr.addColorStop(1, 'rgba(110,40,110,0)'); g.fillStyle = gr; g.save(); g.translate(x, y); g.scale(1, 0.32); g.translate(-x, -y); g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.restore(); }
function vgrad(y0, y1, stops) { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); return gr; }
function sky(top = '#ffd9e8', bot = '#ffe9d6', mid) { g.fillStyle = vgrad(0, H, mid ? [top, mid, bot] : [top, bot]); g.fillRect(0, 0, W, H); }
function cloud(x, y, s, a = 0.9) { g.fillStyle = `rgba(255,255,255,${a})`; for (const [p, q, r] of [[0, 0, 1], [0.9, 0.2, 0.75], [-0.9, 0.25, 0.7], [0.4, -0.35, 0.7], [-0.4, -0.25, 0.6]]) { g.beginPath(); g.arc(x + p * s, y + q * s, r * s, 0, 7); g.fill(); } g.fillStyle = `rgba(255,220,240,${a * 0.5})`; g.beginPath(); g.ellipse(x, y + s * 0.6, s * 1.5, s * 0.25, 0, 0, 7); g.fill(); }
function sun(x, y, r) { glow(x, y, r * 3.2, [255, 240, 200], 0.6); g.fillStyle = vgrad(y - r, y + r, ['#fff8d8', '#ffd9a0']); g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
function hills(y, amp, col, seed, step = 70) { const R = srand(seed); g.fillStyle = col; g.beginPath(); g.moveTo(-10, H + 400); g.lineTo(-10, y); let x = -10; while (x < W + 80) { const nx = x + step * (0.7 + R() * 0.6); g.quadraticCurveTo((x + nx) / 2, y - amp * (0.5 + R()), nx, y + R() * amp * 0.3); x = nx; } g.lineTo(W + 80, H + 400); g.fill(); }
// gradas con público de mochis (capa estática)
function stands(y0, y1, seed, cols = [[255, 196, 220], [205, 185, 255], [255, 230, 160], [180, 235, 210], [190, 220, 255]]) {
  g.fillStyle = vgrad(y0, y1, ['#c9a8e8', '#a985d0']); g.fillRect(0, y0, W, y1 - y0);
  const R = srand(seed), rows = Math.floor((y1 - y0) / 16);
  for (let r = 0; r < rows; r++) { const yy = y0 + 10 + r * 16; g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, yy + 5, W, 3);
    for (let x = 6 + (r % 2) * 7; x < W; x += 14) { if (R() < 0.12) continue; const c = cols[Math.floor(R() * cols.length)]; g.fillStyle = rgbs(c); g.beginPath(); g.ellipse(x, yy, 6, 5.5, 0, Math.PI, 0); g.fill(); g.fillStyle = '#4a2c58'; g.fillRect(x - 2.5, yy - 3, 1.2, 1.6); g.fillRect(x + 1.5, yy - 3, 1.2, 1.6); } }
  g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, y1 - 4, W, 4);
}
// ===================== PRUEBAS =====================
const EVENTS = [];
// ---------- 1) Bolos Mochi ----------
function drawPin(x, y, rot, down, a = 1) {
  g.save(); g.translate(x, y); g.globalAlpha = a;
  if (down) { g.rotate(rot); g.scale(0.85, 0.85); g.translate(0, 12); } else { shadow(3, 2, 13, 0.28); }
  const body = () => { g.beginPath(); g.moveTo(-4.5, 0); g.bezierCurveTo(-11, -6, -10, -15, -4, -21); g.bezierCurveTo(-2.5, -24, -3.5, -27, -3.5, -29); g.bezierCurveTo(-6.5, -33, -3.5, -38, 0, -38); g.bezierCurveTo(3.5, -38, 6.5, -33, 3.5, -29); g.bezierCurveTo(3.5, -27, 2.5, -24, 4, -21); g.bezierCurveTo(10, -15, 11, -6, 4.5, 0); g.closePath(); };
  body(); const gr = g.createLinearGradient(-10, 0, 10, 0); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, '#fffafd'); gr.addColorStop(1, '#e6cfe2'); g.fillStyle = gr; g.fill();
  g.save(); body(); g.clip(); g.fillStyle = '#ff6fa8'; g.fillRect(-12, -27, 24, 2.6); g.fillRect(-12, -23.5, 24, 2.6); g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(-3.5, -13, 2, 6, 0.1, 0, 7); g.fill(); g.beginPath(); g.ellipse(-1.5, -34, 1.2, 2.2, 0, 0, 7); g.fill(); g.restore();
  body(); g.strokeStyle = 'rgba(150,90,150,.45)'; g.lineWidth = 1; g.stroke();
  // carita
  g.fillStyle = '#3d2348'; g.beginPath(); g.arc(-1.6, -32, 0.9, 0, 7); g.arc(1.6, -32, 0.9, 0, 7); g.fill();
  g.restore();
}
EVENTS.push({ id: 'bolos', name: 'Bolos Mochi', icon: '🎳', med: [26, 21, 15], unit: 'bolos', fmt: s => s + ' bolos',
  how: 'Arrastra hacia atrás desde el mochi para apuntar y cargar fuerza. ¡Ojo con el viento y el efecto de la bolera! Un pleno es posible, pero hay que afinar. 3 tiradas.',
  create() {
    const L = 92, R = 308, PR = 8.5, BR = 19, MB = 2.0;
    const e = { throws: 0, score: 0, state: 'aim', m: null, pins: [], aim: null, timer: 0, sq: { s: 1 }, strikes: 0, hist: [] };
    e.reset = () => {
      e.pins = []; const top = 128; let k = 0;
      for (let r = 0; r < 4; r++) for (let c = 0; c <= r; c++) e.pins.push({ x: 200 + (c - r / 2) * 38, y: top + (3 - r) * 33, vx: 0, vy: 0, down: false, rot: 0, vr: 0, id: k++ });
      e.m = { x: 200, y: H - 120, vx: 0, vy: 0, r: BR, spin: 0 }; e.state = 'aim'; e.knock = 0; e.timer = 0; e.firstHit = false;
      e.wind = Math.round(rnd(-1, 1) * 3) * 22; // aceleración lateral (px/s²): de -66 a 66
      e.oil = rnd(-1, 1) * 30; // efecto aleatorio de la pista al final
    };
    e.reset();
    e.down = (x, y) => { if (e.state === 'aim' && Math.hypot(x - e.m.x, y - e.m.y) < 100) { e.aim = { x, y }; Snd.tick(); } };
    e.move = (x, y) => { if (e.aim) { e.aim.x = x; e.aim.y = y; } };
    e.up = () => {
      if (!e.aim) return; let dx = e.m.x - e.aim.x, dy = e.m.y - e.aim.y; const len = Math.hypot(dx, dy); e.aim = null;
      if (len < 20 || dy > -10) return; const pw = clamp(len / 160, 0.25, 1); dx /= len; dy /= len;
      // pequeño temblor de pulso: cuanto más fuerza, menos precisión
      const wob = rnd(-1, 1) * 0.018 * pw, c = Math.cos(wob), s = Math.sin(wob); [dx, dy] = [dx * c - dy * s, dx * s + dy * c];
      e.m.vx = dx * pw * 820; e.m.vy = dy * pw * 820; e.pw = pw; e.state = 'roll'; e.sq.vs = 6; Snd.swipe(); puff(e.m.x, e.m.y + 6, 6);
    };
    const knock = p => { if (p.down) return; p.down = true; e.knock++; p.vr = rnd(-9, 9) || 4; puff(p.x, p.y - 10, 3); pop(p.x, p.y - 34, '+1', '#fff', 18); };
    e.update = dt => {
      spring(e.sq, dt);
      if (e.state !== 'roll') return;
      const m = e.m, steps = 3, h = dt / steps;
      for (let st = 0; st < steps; st++) {
        if (!m.gutter) { m.vx += e.wind * h; if (m.y < 330) m.vx += e.oil * h; }
        m.x += m.vx * h; m.y += m.vy * h; m.spin += Math.hypot(m.vx, m.vy) * h / m.r; const fr = 1 - 0.35 * h; m.vx *= fr; m.vy *= fr;
        if (!m.gutter && (m.x < L + 4 || m.x > R - 4)) { m.gutter = true; m.vx = 0; m.x = m.x < 200 ? L - 13 : R + 13; if (!e.firstHit) { pop(200, m.y - 40, '¡Al canal!', '#a374c4', 30); Snd.bad(); } }
        for (const p of e.pins) {
          if (!m.gutter) { const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy), md = BR + PR;
            if (d < md && d > 0) { const nx = dx / d, ny = dy / d, rv = (m.vx - p.vx) * nx + (m.vy - p.vy) * ny;
              if (rv > 0) { const j = (1 + 0.6) * rv / (1 + 1 / MB); p.vx += j * nx; p.vy += j * ny; m.vx -= j * nx / MB; m.vy -= j * ny / MB; if (j > 60) knock(p);
                if (!e.firstHit) { e.firstHit = true; e.sq.s = 0.6; e.sq.vs = 0; shake = 7; Snd.squish(); burst(m.x, m.y - 10, 14, PINK, 240, 0.7, 5); } else Snd.hit(); }
              p.x = m.x + nx * md; p.y = m.y + ny * md; } }
          for (const q of e.pins) { if (q.id <= p.id) continue; const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy), md = PR * 2;
            if (d < md && d > 0) { const nx = dx / d, ny = dy / d, rv = (p.vx - q.vx) * nx + (p.vy - q.vy) * ny;
              if (rv > 0) { const jj = rv * (1 + rnd(0.55, 0.9)) / 2; p.vx -= jj * nx; p.vy -= jj * ny; q.vx += jj * nx; q.vy += jj * ny;
                // los bolos se desvían un poco al chocar (no son bolas perfectas)
                const tw = rnd(-0.35, 0.35); for (const o of [p, q]) { const c = Math.cos(tw), s = Math.sin(tw), vx = o.vx; o.vx = vx * c - o.vy * s; o.vy = vx * s + o.vy * c; }
                if (jj > 38) { knock(p); knock(q); } Snd.hit(); }
              const o = (md - d) / 2; p.x -= nx * o; p.y -= ny * o; q.x += nx * o; q.y += ny * o; } }
        }
        for (const p of e.pins) { p.x += p.vx * h; p.y += p.vy * h; const fr2 = 1 - (p.down ? 2.6 : 9) * h; p.vx *= fr2; p.vy *= fr2; p.rot += p.vr * h; p.vr *= 1 - 2 * h;
          if (!p.down && (p.x < L || p.x > R)) knock(p); }
      }
      if (Math.random() < 0.5) parts.push({ x: m.x + rnd(-8, 8), y: m.y + 10, vx: 0, vy: 0, life: 0.3, max: 0.3, sz: 3, col: [255, 225, 240], gr: 0 });
      const moving = Math.hypot(m.vx, m.vy) > 25 && m.y > -40, pinsMoving = e.pins.some(p => Math.hypot(p.vx, p.vy) > 15);
      if (!moving && !pinsMoving) e.timer += dt; else e.timer = 0;
      if (m.y < -60 || e.timer > 0.6 || (m.y < 60 && !pinsMoving)) {
        e.state = 'wait'; e.score += e.knock; e.throws++; e.hist.push(e.knock);
        if (e.knock === 10) { e.strikes++; pop(200, 300, '¡PLENO!', '#ffd34d', 52); stars(200, 300, 24); confetti(200, 320, 40); flash = 0.6; Snd.win(3); }
        else if (e.knock >= 8) pop(200, 300, e.knock + ' bolos ¡Casi!', '#f27bb2', 34); else if (e.knock) pop(200, 300, e.knock + ' bolos', '#f27bb2', 36); else pop(200, 300, '¡Ups!', '#a374c4', 36);
        e.wt = 1.3;
      }
    };
    const upd0 = e.update; e.update = dt => { if (e.state === 'wait') { e.wt -= dt; if (e.wt <= 0) { if (e.throws >= 3) e.done = true; else e.reset(); } return; } upd0(dt); };
    e.draw = () => {
      layer('bolos', () => {
        g.fillStyle = vgrad(0, H, ['#5b3f8f', '#8e6cc4', '#b89ae0']); g.fillRect(0, 0, W, H);
        // pistas vecinas
        for (const ox of [-230, 230]) { g.fillStyle = vgrad(0, H, ['#c79a6a', '#e9c592']); g.fillRect(L + ox, 70, R - L, H); g.fillStyle = 'rgba(70,40,110,.45)'; g.fillRect(L + ox, 70, R - L, H); }
        // pared del fondo con neón
        g.fillStyle = vgrad(0, 92, ['#3d2768', '#5a3c8c']); g.fillRect(0, 0, W, 92); g.fillStyle = 'rgba(255,255,255,.08)'; for (let x = 0; x < W; x += 24) g.fillRect(x, 0, 2, 92);
        g.save(); g.shadowColor = '#ff7cc0'; g.shadowBlur = 18; g.font = '700 24px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffd1ea'; g.fillText('MOCHI  BOWL', 200, 66); g.shadowColor = '#9fe8ff'; g.strokeStyle = '#9fe8ff'; g.lineWidth = 2.5; rr(118, 50, 164, 32, 16); g.stroke(); g.restore();
        // canales
        for (const [a, b] of [[L - 26, L], [R, R + 26]]) { const gr = g.createLinearGradient(a, 0, b, 0); gr.addColorStop(0, '#6a4c96'); gr.addColorStop(0.5, '#3e2a63'); gr.addColorStop(1, '#6a4c96'); g.fillStyle = gr; g.fillRect(a, 92, b - a, H); }
        // pista de madera
        const R2 = srand(7); for (let x = L; x < R; x += 12) { const t = R2(); g.fillStyle = `rgb(${236 + t * 14},${196 + t * 18},${146 + t * 22})`; g.fillRect(x, 92, 12.5, H); }
        g.fillStyle = 'rgba(150,90,40,.18)'; for (let x = L; x < R; x += 12) g.fillRect(x, 92, 1, H);
        const sh = g.createLinearGradient(L, 0, R, 0); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.3, 'rgba(255,255,255,.28)'); sh.addColorStop(0.42, 'rgba(255,255,255,0)'); sh.addColorStop(0.7, 'rgba(255,255,255,.12)'); sh.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(L, 92, R - L, H);
        g.fillStyle = vgrad(92, 260, ['rgba(255,240,220,.55)', 'rgba(255,240,220,0)']); g.fillRect(L, 92, R - L, 170);
        // flechas y puntos
        g.fillStyle = 'rgba(232,85,143,.75)'; for (let i = -3; i <= 3; i++) { const yy = H - 290 + Math.abs(i) * 14; g.beginPath(); g.moveTo(200 + i * 26, yy); g.lineTo(200 + i * 26 - 6, yy + 16); g.lineTo(200 + i * 26 + 6, yy + 16); g.fill(); }
        for (let i = -2; i <= 2; i++) { g.beginPath(); g.arc(200 + i * 26, H - 190, 2.5, 0, 7); g.fill(); }
        g.fillStyle = 'rgba(232,85,143,.8)'; g.fillRect(L, H - 165, R - L, 3);
        // sombras laterales (profundidad)
        const ls = g.createLinearGradient(L, 0, L + 18, 0); ls.addColorStop(0, 'rgba(80,40,90,.35)'); ls.addColorStop(1, 'rgba(80,40,90,0)'); g.fillStyle = ls; g.fillRect(L, 92, 18, H);
        const rs = g.createLinearGradient(R, 0, R - 18, 0); rs.addColorStop(0, 'rgba(80,40,90,.35)'); rs.addColorStop(1, 'rgba(80,40,90,0)'); g.fillStyle = rs; g.fillRect(R - 18, 92, 18, H);
        // focos
        for (const fx of [120, 200, 280]) glow(fx, 100, 60, [255, 230, 250], 0.35); grain(0.09);
      });
      // bolos (de atrás a delante)
      const sorted = e.pins.slice().sort((a, b) => a.y - b.y);
      for (const p of sorted) drawPin(p.x, p.y, p.rot + Math.PI / 2, p.down, p.down ? 0.8 : 1);
      const m = e.m, sp = Math.hypot(m.vx, m.vy);
      // reflejo en la madera
      g.save(); g.globalAlpha = 0.16; g.translate(m.x, m.y + 18); g.scale(1, -0.5); drawMochi(0, 0, 44, { sx: 2 - e.sq.s, sy: e.sq.s, still: 1 }); g.restore();
      shadow(m.x, m.y + 4, 24, 0.3);
      const s = e.sq.s, wob = e.state === 'roll' ? Math.sin(m.spin) * 0.08 : 0;
      drawMochi(m.x, m.y + 12, 44, { sx: (2 - s) + wob, sy: s - wob, face: e.firstHit && e.state === 'roll' ? 'squish' : sp > 300 ? 'wow' : e.aim ? 'focus' : 'idle', rot: e.state === 'roll' ? Math.sin(m.spin * 0.5) * 0.2 : 0 });
      if (e.aim) { const dx = m.x - e.aim.x, dy = m.y - e.aim.y, len = Math.min(160, Math.hypot(dx, dy)), a = Math.atan2(dy, dx);
        // la guía es corta: hay que intuir la trayectoria
        const gl = 70 + len * 0.6; for (let i = 1; i <= 6; i++) { const k = i / 6; g.globalAlpha = 1 - k * 0.8; g.fillStyle = '#fff'; g.beginPath(); g.arc(m.x + Math.cos(a) * gl * k, m.y + Math.sin(a) * gl * k, 4.5 - k * 2, 0, 7); g.fill(); } g.globalAlpha = 1;
        bar(m.x - 44, m.y + 34, 88, 14, len / 160, len > 140 ? '#ff4f97' : '#b38cf5'); }
      // viento
      const wv = e.wind / 22; pill(W / 2 - 62, H - 112, 124, 30, wv === 0 ? 'Sin viento' : (wv < 0 ? '← ' : '') + 'Viento ' + Math.abs(wv) + (wv > 0 ? ' →' : ''), wv === 0 ? '#5fae7a' : '#4f8fd6');
      if (wv) for (let i = 0; i < 3; i++) { const xx = ((T * 160 * Math.sign(wv) + i * 140) % 400 + 400) % 400; g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(xx, 300 + i * 90); g.quadraticCurveTo(xx + 20, 294 + i * 90, xx + 40, 300 + i * 90); g.stroke(); }
      vignette(); hud('Tirada ' + Math.min(3, e.throws + 1) + '/3', null, e.score + ' 🎳');
      if (e.state === 'aim' && !e.aim) hint('Arrastra hacia atrás ↓ y suelta', H - 40);
    };
    // bot: apunta al bolo 1 con error humano y compensa el viento solo a medias
    e.bot = dt => { if (e.state === 'aim' && !e.botT) { e.botT = 1; const tx = 200 - e.wind * 0.55 * 0.7 + rnd(-1, 1) * 16; const dx = tx - e.m.x, dy = 128 + 99 - e.m.y, l = Math.hypot(dx, dy); e.down(e.m.x, e.m.y); e.move(e.m.x - dx / l * 165, e.m.y - dy / l * 165); e.botWait = 0.3; } if (e.botT && e.state === 'aim') { e.botWait -= dt; if (e.botWait <= 0) { e.up(); e.botT = 0; } } };
    e.result = () => e.score; return e;
  } });
// ---------- 2) Salto con muelle ----------
EVENTS.push({ id: 'muelle', name: 'Salto con muelle', icon: '🌀', med: [10, 8, 5], unit: 'm', fmt: s => s.toFixed(2) + ' m',
  how: 'Mantén pulsado: el mochi se aplasta como un muelle. ¡Suelta justo cuando esté al máximo de tensión! 3 intentos, cuenta el mejor.',
  create() {
    const PX = 55;
    const e = { tries: 0, best: 0, state: 'ready', c: 0, cDir: 1, y: 0, vy: 0, cam: 0, sq: { s: 1 }, last: 0, maxH: 0 };
    const G = () => H - 120;
    e.down = () => { if (e.state === 'ready') { e.state = 'charge'; e.c = 0; e.cDir = 1; Snd.tick(); } };
    e.up = () => {
      if (e.state !== 'charge') return; const c = e.c, perfect = c > 0.93;
      const hm = 11 * Math.pow(c, 1.6) * (perfect ? 1.08 : 1); e.vy = -Math.sqrt(2 * 900 * hm * PX); e.state = 'fly'; e.maxH = 0;
      e.sq.s = 1.6; e.sq.vs = 0; Snd.boing(0.8 + c * 0.6); burst(200, G(), 14, [255, 255, 255], 220, 0.6, 5); puff(200, G(), 8);
      if (perfect) { pop(200, G() - 120, '¡PERFECTO!', '#ffd34d', 40); stars(200, G() - 40, 14); flash = 0.4; }
    };
    e.update = dt => {
      spring(e.sq, dt, 140, 8);
      if (e.state === 'charge') { e.c += e.cDir * dt * 1.25; if (e.c > 1) { e.c = 1; e.cDir = -1; } if (e.c < 0) { e.c = 0; e.cDir = 1; } }
      if (e.state === 'fly') { e.vy += 900 * dt; e.y += e.vy * dt; e.maxH = Math.max(e.maxH, -e.y / PX);
        e.cam = lerp(e.cam, Math.min(0, e.y + 250), 0.15);
        if (Math.random() < 0.5) parts.push({ x: 200 + rnd(-10, 10), y: G() + e.y, vx: 0, vy: 0, life: 0.5, max: 0.5, sz: 4, col: LILAC, gr: 0 });
        if (e.y >= 0 && e.vy > 0) { e.y = 0; e.state = 'land'; e.sq.s = 0.5; e.sq.vs = 0; shake = 6; Snd.squish(); burst(200, G(), 16, PINK, 220, 0.6, 5); puff(200, G(), 8);
          e.tries++; e.last = e.maxH; const rec = e.maxH > e.best; e.best = Math.max(e.best, e.maxH); pop(200, G() - 140, e.maxH.toFixed(2) + ' m' + (rec ? ' ⭐' : ''), '#f27bb2', 38); if (rec) confetti(200, G() - 100, 20);
          e.wt = 1.3; } }
      else e.cam = lerp(e.cam, 0, 0.1);
      if (e.state === 'land') { e.wt -= dt; if (e.wt <= 0) { if (e.tries >= 3) e.done = true; else { e.state = 'ready'; e.c = 0; } } }
    };
    e.draw = () => {
      const hgt = clamp(-e.cam / 700, 0, 1);
      layer('muelle', () => { sky('#a9d8ff', '#ffe3ef', '#d4ecff'); sun(310, 120, 34); grain(0.05); });
      // cielo que se oscurece al subir: estrellas
      if (hgt > 0) { g.fillStyle = `rgba(70,50,140,${hgt * 0.55})`; g.fillRect(0, 0, W, H); const R = srand(3); for (let i = 0; i < 40; i++) { g.globalAlpha = hgt * (0.5 + 0.5 * Math.sin(T * 3 + i)); g.fillStyle = '#fff'; star5(R() * W, R() * H * 0.8, 1.5 + R() * 2); g.fill(); } g.globalAlpha = 1; }
      g.save(); g.translate(0, -e.cam * 0.15); hills(G() - 150, 60, 'rgba(180,170,240,.6)', 11, 90); g.restore();
      g.save(); g.translate(0, -e.cam * 0.4); hills(G() - 90, 40, '#bfe8c2', 12, 60); g.restore();
      g.save(); g.translate(0, -e.cam);
      for (let i = 0; i < 14; i++) cloud(((i * 137 + T * (6 + i % 3 * 4)) % 520) - 60, G() - 220 - i * 170, 22 + (i % 3) * 8, 0.85);
      // gradas
      g.save(); g.translate(0, 0); stands(G() - 70, G() - 10, 21); g.restore();
      for (let i = 0; i < 9; i++) { const x = 20 + i * 45, j = Math.max(0, Math.sin(T * 6 + i * 1.7)) * (e.state === 'fly' ? 6 : 2); g.fillStyle = rgbs(CONF[i % 5]); g.beginPath(); g.ellipse(x, G() - 64 - j, 7, 6, 0, Math.PI, 0); g.fill(); }
      // poste con regla
      rr(326, G() - 12 * PX - 20, 10, 12 * PX + 20, 5); g.fillStyle = '#ffffff'; g.fill(); g.strokeStyle = 'rgba(160,100,180,.35)'; g.stroke();
      for (let m = 1; m <= 12; m++) { const yy = G() - m * PX; g.fillStyle = m % 5 ? '#c9a8e8' : '#ff8fbd'; rr(312, yy - 2, m % 5 ? 14 : 38, 4, 2); g.fill(); txt(m + ' m', 362, yy, 14, '#fff', 'center', '#9a6cc0'); }
      // banderines de medalla
      [[10, '#ffd34d'], [8, '#d6dbe8'], [5, '#e6a46a']].forEach(([mm, c]) => { const yy = G() - mm * PX; g.fillStyle = c; g.beginPath(); g.moveTo(336, yy - 14); g.lineTo(356, yy - 8); g.lineTo(336, yy - 2); g.fill(); });
      if (e.best > 0) { const yy = G() - e.best * PX; g.strokeStyle = '#ffd34d'; g.lineWidth = 3; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(40, yy); g.lineTo(310, yy); g.stroke(); g.setLineDash([]); txt('récord', 64, yy - 12, 14, '#ffd34d', 'center', '#c48a1a'); }
      // suelo: césped a rayas
      g.fillStyle = vgrad(G(), G() + 200, ['#8fe0a0', '#5fbf7f']); g.fillRect(-10, G(), W + 20, 400); g.fillStyle = 'rgba(255,255,255,.12)'; for (let x = 0; x < W; x += 50) g.fillRect(x, G(), 25, 400);
      g.fillStyle = '#7ad391'; g.fillRect(-10, G(), W + 20, 6);
      // muelle metálico
      const comp = e.state === 'charge' ? e.c : 0, ph = 44 * (1 - comp * 0.7);
      rr(150, G() - 8, 100, 12, 6); g.fillStyle = '#8c6bb8'; g.fill();
      for (let i = 0; i < 7; i++) { const y0 = G() - 4 - i * ph / 7; g.strokeStyle = i % 2 ? '#b9a1f5' : '#e2d6ff'; g.lineWidth = 5; g.beginPath(); g.ellipse(200, y0 - ph / 14, 22, 5, 0, 0, Math.PI); g.stroke(); }
      rr(158, G() - ph - 12, 84, 12, 6); g.fillStyle = vgrad(G() - ph - 12, G() - ph, ['#ffc2dd', '#ff86b9']); g.fill();
      const my = e.state === 'fly' || e.state === 'land' ? G() + e.y : G() - ph - 8;
      shadow(200, G() + 4, 34 * clamp(1 + e.y / 600, 0.3, 1), 0.3);
      if (comp > 0.85) glow(200, my - 30, 70, [255, 220, 120], 0.4 * Math.abs(Math.sin(T * 20)));
      let sx, sy; if (e.state === 'charge') { sy = 1 - comp * 0.5; sx = 1 + comp * 0.45 + Math.sin(T * 50) * comp * 0.03; } else { sy = e.sq.s; sx = 2 - e.sq.s; if (e.state === 'fly') { const st = clamp(-e.vy / 1400, -0.3, 0.4); sy += st; sx -= st * 0.6; } }
      drawMochi(200, my, 70, { sx, sy, face: e.state === 'charge' ? (comp > 0.85 ? 'squish' : 'focus') : e.state === 'fly' ? (e.vy < 0 ? 'wow' : 'happy') : 'happy', armsUp: e.state === 'fly', band: true, sweat: e.state === 'charge' && comp > 0.6 });
      g.restore();
      vignette(); hud('Intento ' + Math.min(3, e.tries + 1) + '/3', null, 'Mejor ' + e.best.toFixed(2));
      if (e.state === 'fly') txt(e.maxH.toFixed(2) + ' m', 200, 92, 44, '#fff');
      if (e.state === 'charge' || e.state === 'ready') { g.save(); g.translate(46, H - 120); g.rotate(-Math.PI / 2); bar(0, -14, 220, 28, e.c, e.c > 0.93 ? '#ffb800' : '#ff6fa8', [0.93, 1]); g.restore(); txt('⚡', 46, H - 360, 24); }
      if (e.state === 'ready') hint('Mantén pulsado y suelta en la zona dorada', H - 44);
    };
    e.bot = () => { if (e.state === 'ready') e.down(); if (e.state === 'charge' && e.cDir < 0 && e.c > 0.9) e.up(); };
    e.result = () => Math.round(e.best * 100) / 100; return e;
  } });
// ---------- 3) Lanzamiento de mochi ----------
EVENTS.push({ id: 'martillo', name: 'Lanzamiento de mochi', icon: '🔨', med: [80, 62, 45], unit: 'm', fmt: s => s.toFixed(1) + ' m',
  how: 'Mantén pulsado para girar cada vez más rápido. Suelta cuando el mochi pase por la flecha dorada (45°) para mandarlo lejísimos. 3 intentos.',
  create() {
    const R = 70, PXM = 10;
    const e = { tries: 0, best: 0, state: 'ready', a: Math.PI / 2, w: 0, b: null, cam: 0, sq: { s: 1 } };
    const G = () => H - 140, PX = 110, PY = () => G() - 70;
    const throwAng = () => { const vx = -Math.sin(e.a), vy = Math.cos(e.a); return Math.atan2(-vy, vx) * 180 / Math.PI; };
    e.down = () => { if (e.state === 'ready') { e.state = 'spin'; Snd.tick(); } };
    e.up = () => {
      if (e.state !== 'spin') return;
      const v = R * e.w, bx = PX + Math.cos(e.a) * R, by = PY() + Math.sin(e.a) * R; const th = throwAng();
      e.b = { x: bx, y: by, vx: -Math.sin(e.a) * v, vy: Math.cos(e.a) * v, rot: 0, foul: th < 5 || th > 85 || e.w < 3, th };
      e.state = 'fly'; Snd.swipe(); Snd.boing(1.2); e.sq.s = 1.4; e.sq.vs = 0;
      pop(PX + 30, PY() - 110, Math.round(th) + '°', Math.abs(th - 45) < 6 ? '#ffd34d' : '#fff', 30);
      if (Math.abs(th - 45) < 4 && !e.b.foul) { stars(bx, by, 12); flash = 0.35; }
    };
    e.update = dt => {
      spring(e.sq, dt);
      if (e.state === 'spin') { e.w = Math.min(13, e.w + dt * 6); e.a += e.w * dt; if (Math.random() < e.w / 16) parts.push({ x: PX + Math.cos(e.a) * R, y: PY() + Math.sin(e.a) * R, vx: 0, vy: 0, life: 0.3, max: 0.3, sz: 5, col: PINK, gr: 0 }); if (Math.floor(e.a / 6.283) !== Math.floor((e.a - e.w * dt) / 6.283)) Snd.tone(300 + e.w * 40, 0.06, { vol: 0.05 }); }
      if (e.state === 'fly') { const b = e.b; b.vy += 900 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += 10 * dt; e.cam = Math.max(e.cam, b.x - 200);
        if (Math.random() < 0.7) parts.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.45, max: 0.45, sz: 5, col: [255, 255, 255], gr: 0 });
        if (b.y > G() - 2) { b.y = G() - 2; let d = (b.x - PX) / PXM; if (b.foul || d < 0) d = 0; e.state = 'land'; e.tries++; shake = 7; Snd.squish(); burst(b.x, G(), 18, [170, 220, 150], 240, 0.7, 5); puff(b.x, G(), 8, [230, 255, 230]);
          b.sq = 0.4; const rec = d > e.best; e.best = Math.max(e.best, d); pop(b.x, G() - 100, d ? d.toFixed(1) + ' m' + (rec ? ' ⭐' : '') : '¡NULO!', d ? '#f27bb2' : '#a374c4', 38); if (rec && d) confetti(b.x, G() - 60, 24);
          e.wt = 1.5; } }
      if (e.state === 'land') { e.wt -= dt; if (e.wt <= 0) { if (e.tries >= 3) e.done = true; else { e.state = 'ready'; e.w = 0; e.a = Math.PI / 2; e.b = null; } } }
      if (e.b && e.b.sq != null) e.b.sq = lerp(e.b.sq, 1, 0.08);
      if (e.state === 'ready') e.cam = lerp(e.cam, 0, 0.2);
    };
    e.draw = () => {
      layer('martillo', () => { sky('#ffd4ea', '#fff3e0', '#ffe0ee'); sun(320, 110, 30); grain(0.05); });
      g.save(); g.translate(-(e.cam * 0.08) % 400, 0); for (const o of [0, 400]) { g.save(); g.translate(o, 0); hills(G() - 150, 70, 'rgba(190,170,240,.55)', 31, 100); g.restore(); } g.restore();
      for (let i = 0; i < 6; i++) cloud(((i * 170 - e.cam * 0.2 + T * 8) % 600 + 600) % 600 - 100, 90 + (i % 3) * 45, 20 + (i % 2) * 8, 0.85);
      g.save(); g.translate(-((e.cam * 0.4) % 400), 0); for (const o of [0, 400]) { g.save(); g.translate(o, 0); layer2(); g.restore(); } g.restore();
      function layer2() { stands(G() - 92, G() - 18, 41); }
      g.save(); g.translate(-e.cam, 0);
      const x0 = Math.floor(e.cam / 40) * 40 - 40;
      g.fillStyle = vgrad(G(), G() + 140, ['#8fe0a0', '#55b877']); g.fillRect(e.cam - 10, G(), W + 20, 300);
      g.fillStyle = 'rgba(255,255,255,.13)'; for (let x = x0; x < e.cam + W + 40; x += 80) g.fillRect(x, G(), 40, 300);
      g.fillStyle = '#7ad391'; g.fillRect(e.cam - 10, G(), W + 20, 5);
      for (let m = 10; m <= 120; m += 10) { const x = PX + m * PXM; if (x < e.cam - 40 || x > e.cam + W + 40) continue; g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(x - 1.5, G(), 3, 22); txt(m + ' m', x, G() + 40, 15, '#fff', 'center', '#4f9e68'); }
      [[80, '#ffd34d'], [62, '#d6dbe8'], [45, '#e6a46a']].forEach(([mm, c]) => { const x = PX + mm * PXM; g.fillStyle = '#fff'; g.fillRect(x - 1, G() - 44, 2.5, 44); g.fillStyle = c; g.beginPath(); g.moveTo(x + 1, G() - 44); g.lineTo(x + 22, G() - 37); g.lineTo(x + 1, G() - 30); g.fill(); });
      if (e.best > 0) { const x = PX + e.best * PXM; glow(x, G() - 30, 40, [255, 220, 100], 0.4); g.fillStyle = '#ffd34d'; g.fillRect(x - 2, G() - 50, 4, 50); star5(x, G() - 56, 9); g.fill(); }
      // jaula de red
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3; g.beginPath(); g.moveTo(PX - 100, G()); g.lineTo(PX - 100, G() - 190); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(PX - 100, G() - i * 22); g.quadraticCurveTo(PX - 60, G() - i * 22 - 10, PX - 20, G() - 190 + i * 2); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(PX, G() + 2, 46, 9, 0, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
      if (e.state === 'spin' || e.state === 'ready') { const ga = -Math.PI * 0.75, gx = PX + Math.cos(ga) * (R + 18), gy = PY() + Math.sin(ga) * (R + 18);
        glow(gx, gy, 34, [255, 220, 100], 0.5 + 0.2 * Math.sin(T * 8)); g.save(); g.translate(gx, gy); g.rotate(-Math.PI / 4); g.fillStyle = '#ffd34d'; g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(26, 0); g.lineTo(6, -13); g.lineTo(6, -5); g.lineTo(-14, -5); g.lineTo(-14, 5); g.lineTo(6, 5); g.lineTo(6, 13); g.closePath(); g.stroke(); g.fill(); g.restore(); }
      shadow(PX, G() + 3, 34, 0.3); const sp = e.state === 'spin' ? e.w : 0;
      if (sp > 4) { g.strokeStyle = `rgba(255,255,255,${sp / 30})`; g.lineWidth = 10; g.beginPath(); g.arc(PX, PY(), R, e.a - 1.2, e.a); g.stroke(); }
      drawMochi(PX, G(), 70, { col: [205, 185, 255], sx: 1 + sp * 0.008, sy: 1 - sp * 0.008, rot: Math.sin(e.a) * sp * 0.012, face: sp > 10 ? 'squish' : sp > 0 ? 'focus' : 'idle', lookX: Math.cos(e.a), armsUp: e.state === 'spin', band: true, sweat: sp > 9 });
      let bx, by; if (e.b) { bx = e.b.x; by = e.b.y; } else { bx = PX + Math.cos(e.a) * R; by = PY() + Math.sin(e.a) * R; }
      if (!e.b) { g.strokeStyle = '#8a64b8'; g.lineWidth = 3; g.beginPath(); g.moveTo(PX, PY()); g.lineTo(bx, by); g.stroke(); }
      if (e.b) shadow(bx, G() + 2, 18 * clamp(1 - (G() - by) / 500, 0.3, 1), 0.3);
      const st = sp * 0.025, sq = e.b && e.b.sq != null ? e.b.sq : 1;
      drawMochi(bx, by + 16 * sq, 34, { sx: (1 + st) * (2 - sq), sy: (1 - st * 0.5) * sq, rot: e.b ? e.b.rot : e.a + Math.PI / 2, face: e.state === 'land' ? 'dizzy' : sp > 8 || e.state === 'fly' ? 'wow' : 'idle' });
      g.restore();
      vignette(); hud('Intento ' + Math.min(3, e.tries + 1) + '/3', null, 'Mejor ' + e.best.toFixed(1));
      if (e.state === 'fly' && e.b) txt(Math.max(0, (e.b.x - PX) / PXM).toFixed(1) + ' m', 200, 92, 44, '#fff');
      if (e.state === 'spin') { bar(100, H - 60, 200, 16, e.w / 13, '#ff4f97'); hint('¡Suelta en la flecha dorada!', H - 98); }
      if (e.state === 'ready') hint('Mantén pulsado para girar', H - 54);
    };
    e.bot = () => { if (e.state === 'ready') e.down(); if (e.state === 'spin' && e.w > 12.5) { const th = throwAng(); if (Math.abs(th - 45) < 7 + (e.botN = (e.botN || 0) + 1) / 200) { e.botN = 0; e.up(); } } };
    e.result = () => Math.round(e.best * 10) / 10; return e;
  } });
// ---------- 4) Halterofilia de dango (supervivencia) ----------
EVENTS.push({ id: 'dango', name: 'Halterofilia de dango', icon: '🍡', med: [30, 21, 13], unit: 'dangos', fmt: s => s + ' dangos',
  how: 'Modo supervivencia: el palillo de dangos crece sin parar y cada vez se tambalea más. Desliza el dedo a izquierda y derecha para mantenerlo en equilibrio. ¿Hasta cuántos dangos aguantas?',
  create() {
    const GR = 170, DC = [[255, 182, 206], [255, 255, 255], [178, 230, 160], [255, 220, 140], [200, 180, 255]];
    const e = { th: 0, tx: 200 + rnd(-3, 3), tv: 0, om: 0, x: 200, vx: 0, fx: 200, n: 3, t: 0, add: 0, state: 'play', sq: { s: 1 }, fall: [], score: 0, ax: 0, gust: 0, lvl: 1 };
    const G = () => H - 110, L = () => 60 + e.n * 10;
    // curva de dificultad: todo crece poco a poco con el tiempo
    const every = () => Math.max(0.85, 1.8 - e.t * 0.04);          // ritmo de dangos
    const sigma = () => 0.4 + e.t * 0.6;                            // rachas de viento
    const unst = () => 1.2 + e.t * 1.85 + e.n * 0.03;                // inestabilidad
    const damp = () => Math.max(0.2, 1.3 - e.t * 0.035);            // amortiguación que se va perdiendo
    const TL = 110;             // fuerza de las rachas
    e.down = (x) => { e.fx = x; }; e.move = (x) => { e.fx = x; }; e.up = () => {};
    e.update = dt => {
      spring(e.sq, dt);
      if (e.state === 'play') {
        e.t += dt; e.add += dt;
        // modelo "mantén la punta encima de la mano": la punta (tx) se aleja de la mano cada vez con más fuerza
        const px = e.x; e.x = lerp(e.x, clamp(e.fx, 40, 360), Math.min(1, 14 * dt)); e.vx = (e.x - px) / Math.max(dt, 1e-4);
        e.gust += -e.gust * 2 * dt + rnd(-1, 1) * Math.sqrt(dt) * sigma() * 60;
        const d = e.tx - e.x; e.tv += (unst() * d + e.gust - damp() * e.tv) * dt; e.tx += e.tv * dt;
        const th0 = e.th; e.th = Math.asin(clamp(d / TL, -1, 1)); e.om = (e.th - th0) / Math.max(dt, 1e-4);
        if (e.add > every()) { e.add = 0; e.n++; e.om += rnd(-1, 1) * (0.05 + e.t * 0.006); e.sq.s = 0.75; e.sq.vs = 0; Snd.squish(); pop(e.x, G() - 130 - Math.min(380, e.n * 15) * e.zoom, '+1 🍡', '#f27bb2', 22);
          if (e.n % 5 === 0) { e.lvl++; pop(200, 150, '¡Nivel ' + e.lvl + '!', '#ffd34d', 34); Snd.win(1); } }
        if (Math.abs(e.th) > 1.0) { e.state = 'fall'; e.score = e.n; shake = 10; Snd.bad(); Snd.splash(); pop(200, 200, '¡Se cayó!', '#a374c4', 40);
          for (let i = 0; i < e.n; i++) { const d = (30 + i * 15) * e.zoom; e.fall.push({ x: e.x + Math.sin(e.th) * d, y: G() - 70 - Math.cos(e.th) * d, vx: Math.cos(e.th) * e.om * d + rnd(-60, 60), vy: rnd(-200, -50), c: DC[i % 5], r: 0 }); }
          e.wt = 1.8; }
      } else { e.wt -= dt; if (e.wt <= 0) e.done = true; }
      for (const f of e.fall) { f.vy += 900 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.r += f.vx * dt / 14; if (f.y > G() - 10) { f.y = G() - 10; f.vy *= -0.4; f.vx *= 0.8; } }
    };
    e.zoom = 1;
    e.draw = () => {
      layer('dango', () => {
        g.fillStyle = vgrad(0, H, ['#ffe6f1', '#fff1e2']); g.fillRect(0, 0, W, H);
        // paredes de shoji
        g.fillStyle = 'rgba(255,255,255,.65)'; g.fillRect(0, 90, W, G() - 120);
        g.strokeStyle = 'rgba(190,130,110,.35)'; g.lineWidth = 3; for (let x = 0; x <= W; x += 66) { g.beginPath(); g.moveTo(x, 90); g.lineTo(x, G() - 30); g.stroke(); }
        g.lineWidth = 1.5; for (let y = 90; y < G() - 30; y += 46) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
        g.fillStyle = vgrad(70, 100, ['#c48a6a', '#9c6448']); g.fillRect(0, 74, W, 22); g.fillRect(0, G() - 34, W, 14);
        // estandarte
        g.fillStyle = vgrad(110, 300, ['#ff9ec7', '#f27bb2']); g.beginPath(); g.moveTo(170, 110); g.lineTo(230, 110); g.lineTo(230, 290); g.lineTo(200, 270); g.lineTo(170, 290); g.fill();
        g.font = '700 30px Fredoka, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff'; ['力', '🍡'].forEach((c, i) => g.fillText(c, 200, 160 + i * 60));
        // suelo de tatami
        g.fillStyle = vgrad(G() - 20, H, ['#e8d9a0', '#cdbb7c']); g.fillRect(0, G() - 20, W, H); g.strokeStyle = 'rgba(120,100,40,.25)'; g.lineWidth = 2; for (let x = 0; x < W; x += 100) { g.beginPath(); g.moveTo(x, G() - 20); g.lineTo(x - 40, H); g.stroke(); }
        // foco cenital
        const sp = g.createLinearGradient(0, 0, 0, G()); sp.addColorStop(0, 'rgba(255,255,230,.0)'); sp.addColorStop(1, 'rgba(255,250,220,.4)'); g.fillStyle = sp; g.beginPath(); g.moveTo(170, 0); g.lineTo(230, 0); g.lineTo(330, G()); g.lineTo(70, G()); g.fill(); grain(0.09);
      });
      for (let i = 0; i < 5; i++) { const x = 40 + i * 80, sw = Math.sin(T * 2 + i) * 0.12; g.save(); g.translate(x, 96); g.rotate(sw); g.strokeStyle = '#7a4b3a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 14); g.stroke();
        glow(0, 34, 34, i % 2 ? [255, 160, 200] : [255, 220, 120], 0.45); g.fillStyle = vgrad(18, 50, i % 2 ? ['#ffc2dc', '#ff7fb4'] : ['#ffe9a0', '#ffc94d']); g.beginPath(); g.ellipse(0, 34, 13, 17, 0, 0, 7); g.fill(); g.fillStyle = '#7a4b3a'; g.fillRect(-6, 15, 12, 3); g.fillRect(-6, 50, 12, 3); g.restore(); }
      // tarima
      rr(30, G() - 10, W - 60, 16, 8); g.fillStyle = vgrad(G() - 10, G() + 6, ['#e3c9ff', '#b597e0']); g.fill();
      const danger = Math.abs(e.th);
      shadow(e.x, G() + 2, 36, 0.3);
      const lean = clamp(-e.vx / 1500, -0.25, 0.25);
      drawMochi(e.x, G(), 74, { sx: 2 - e.sq.s, sy: e.sq.s, rot: lean, armsUp: true, face: e.state === 'fall' ? 'dizzy' : danger > 0.5 ? 'wow' : danger > 0.25 ? 'squish' : 'focus', lookX: Math.sin(e.th) * 2, lookY: -1, sweat: danger > 0.3, band: true });
      // torre: si crece mucho, la cámara se aleja
      const tall = 75 + e.n * 15; e.zoom = lerp(e.zoom, Math.min(1, (G() - 120) / tall), 0.05);
      if (e.state === 'play') {
        g.save(); g.translate(e.x, G() - 70); g.rotate(e.th); g.scale(e.zoom, e.zoom);
        g.strokeStyle = '#d9b07a'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 10); g.lineTo(0, -e.n * 15 - 40); g.stroke();
        for (let i = 0; i < e.n; i++) { const yy = -30 - i * 15, c = DC[i % 5]; const wob = Math.sin(T * 6 + i) * Math.abs(e.om) * 2 * (1 + i * 0.05);
          g.fillStyle = 'rgba(120,60,90,.15)'; g.beginPath(); g.ellipse(wob + 2, yy + 3, 15, 9, 0, 0, 7); g.fill();
          const gr = g.createRadialGradient(wob - 5, yy - 5, 1, wob, yy, 16); gr.addColorStop(0, rgbs(mix(c, [255, 255, 255], 0.7))); gr.addColorStop(0.6, rgbs(c)); gr.addColorStop(1, rgbs(mix(c, [180, 100, 150], 0.25))); g.fillStyle = gr;
          g.beginPath(); g.ellipse(wob, yy, 15, 9, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(wob - 6, yy - 4, 4, 2, -0.3, 0, 7); g.fill(); }
        g.restore();
      }
      for (const f of e.fall) { g.fillStyle = rgbs(f.c); g.beginPath(); g.ellipse(f.x, f.y, 15, 10, f.r, 0, 7); g.fill(); }
      if (danger > 0.6 && e.state === 'play') { g.fillStyle = `rgba(255,80,140,${(danger - 0.6) * 0.6 * (0.6 + 0.4 * Math.sin(T * 20))})`; g.fillRect(0, 0, 10, H); g.fillRect(W - 10, 0, 10, H); }
      vignette();
      // indicador de equilibrio
      g.fillStyle = 'rgba(90,40,100,.25)'; rr(90, 62, 220, 18, 9); g.fill(); g.fillStyle = 'rgba(255,255,255,.95)'; rr(90, 60, 220, 18, 9); g.fill(); g.fillStyle = 'rgba(155,231,168,.9)'; rr(170, 60, 60, 18, 9); g.fill();
      g.fillStyle = danger > 0.6 ? '#ff4f97' : '#a374c4'; g.beginPath(); g.arc(200 + clamp(e.th, -1, 1) * 110, 69, 10, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
      hud('🍡 ' + e.n, 'Nivel ' + e.lvl, e.t.toFixed(1) + ' s');
      if (e.t < 3) hint('← Desliza para equilibrar →', H - 40);
    };
    // bot con reflejos humanos: mira cada 0,05 s, con algo de error, y pone la mano bajo la punta
    e.bot = dt => { if (e.state !== 'play') return; e.botC = (e.botC || 0) - dt; if (e.botC > 0) return; e.botC = e.botLag || 0.12;
      e.fx = e.tx + e.tv * (e.botK || 0.35) + (e.tx - 200) * 0.25 + rnd(-1, 1) * (e.botErr || 8); };
    e.result = () => e.score; return e;
  } });
// ---------- 5) Tiro con arco de palillos ----------
EVENTS.push({ id: 'arco', name: 'Tiro con arco de palillos', icon: '🥢', med: [17, 13, 9], unit: 'puntos', fmt: s => s + ' puntos',
  how: 'Arrastra hacia atrás para tensar el arco y apuntar. Suelta para disparar el palillo a las dianas que se mueven. La diana más lejana vale 3 puntos, la del medio 2 y la más cercana 1. 8 palillos.',
  create() {
    const SPD = 1150;
    const e = { left: 8, score: 0, aim: null, arrows: [], state: 'play', sq: { s: 1 }, t: 0 };
    e.tg = [0, 1, 2].map(i => ({ y: 170 + i * 110, A: 120 - i * 10, w: 1.5 - i * 0.3, ph: i * 2, r: 26 + i * 6, val: 3 - i, stuck: [], hitT: 0 })); // lejana = 3, media = 2, cercana = 1
    const tx = (t, time) => 200 + Math.sin(time * t.w + t.ph) * t.A;
    const SX = 200, SY = () => H - 100;
    e.down = (x, y) => { if (e.left > 0 && !e.flying) e.aim = { x, y, x0: x, y0: y }; };
    e.move = (x, y) => { if (e.aim) { e.aim.x = x; e.aim.y = y; } };
    const dirOf = () => { let dx = e.aim.x0 - e.aim.x, dy = e.aim.y0 - e.aim.y; if (dy > -5 && Math.hypot(dx, dy) < 25) return null; const l = Math.hypot(dx, dy); return [dx / l, dy / l, Math.min(1, l / 120)]; };
    e.up = () => { if (!e.aim) return; const d = dirOf(); e.aim = null; if (!d || d[1] > -0.15) return;
      e.arrows.push({ x: SX, y: SY() - 30, vx: d[0] * SPD, vy: d[1] * SPD, fly: true }); e.left--; e.flying = true; e.sq.s = 0.7; e.sq.vs = 0; Snd.swipe(); Snd.tone(600, 0.1, { type: 'triangle', vol: 0.08, to: 300 }); };
    e.update = dt => {
      spring(e.sq, dt); e.t += dt; for (const t of e.tg) t.hitT = Math.max(0, t.hitT - dt);
      for (const a of e.arrows) { if (!a.fly) continue; const steps = 4;
        if (Math.random() < 0.8) parts.push({ x: a.x, y: a.y, vx: 0, vy: 0, life: 0.25, max: 0.25, sz: 2.5, col: [255, 255, 255], gr: 0 });
        for (let s = 0; s < steps && a.fly; s++) { a.x += a.vx * dt / steps; a.y += a.vy * dt / steps;
          for (const t of e.tg) { const cx = tx(t, e.t), d = Math.hypot(a.x - cx, a.y - t.y);
            if (d < t.r) { a.fly = false; const pts = t.val; e.score += pts; t.stuck.push({ dx: a.x - cx, dy: a.y - t.y, ang: Math.atan2(a.vy, a.vx) }); a.dead = true; t.hitT = 0.3;
              pop(a.x, a.y - 30, '+' + pts + (pts === 3 ? ' ¡Lejana!' : ''), pts === 3 ? '#ffd34d' : '#fff', 22 + pts * 4); burst(a.x, a.y, 6 + pts * 5, pts === 3 ? [255, 211, 77] : PINK, 220, 0.6, 5); if (pts === 3) { stars(a.x, a.y, 10); Snd.win(1); shake = 5; flash = 0.25; } else Snd.hit(); break; } } }
        if (a.y < -40 || a.x < -40 || a.x > W + 40) { a.fly = false; a.dead = true; pop(clamp(a.x, 40, 360), 70, '¡Fallo!', '#a374c4', 22); } }
      e.arrows = e.arrows.filter(a => !a.dead); e.flying = e.arrows.some(a => a.fly);
      if (e.left === 0 && !e.flying && e.state === 'play') { e.state = 'end'; e.wt = 1; }
      if (e.state === 'end') { e.wt -= dt; if (e.wt <= 0) e.done = true; }
    };
    e.draw = () => {
      layer('arco', () => {
        sky('#c9ecff', '#f2ffe9', '#e2f6ff'); sun(70, 90, 26);
        hills(H - 330, 60, 'rgba(170,200,240,.6)', 51, 110); hills(H - 270, 40, '#bfe8b8', 52, 80);
        // bosquecillo de bambú y árboles redondos
        const R = srand(53); for (let i = 0; i < 9; i++) { const x = R() * W, y = H - 250 + R() * 20, s = 22 + R() * 14; g.fillStyle = '#9a7356'; g.fillRect(x - 3, y, 6, 26); g.fillStyle = R() < 0.5 ? '#9fdc9a' : '#ffc2dc'; g.beginPath(); g.arc(x, y - s * 0.4, s, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(x - s * 0.35, y - s * 0.75, s * 0.4, 0, 7); g.fill(); }
        g.fillStyle = vgrad(H - 230, H, ['#c4ecb6', '#95d68f']); g.fillRect(0, H - 230, W, 230);
        g.fillStyle = 'rgba(255,255,255,.18)'; for (let y = H - 220; y < H; y += 30) g.fillRect(0, y, W, 12);
        // línea de tiro
        g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(0, H - 150, W, 4);
        for (let i = 0; i < 14; i++) { const x = R() * W, y = H - 200 + R() * 190; g.fillStyle = ['#fff', '#ffd34d', '#ff9ec7'][i % 3]; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + Math.cos(k * 1.256) * 3, y + Math.sin(k * 1.256) * 3, 2.2, 0, 7); g.fill(); } g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); } grain(0.09);
      });
      for (const t of e.tg) { const x = tx(t, e.t), s = 1 + t.hitT * 0.6;
        // raíl de madera
        g.fillStyle = 'rgba(110,70,40,.25)'; rr(200 - t.A - t.r - 6, t.y + t.r + 6, (t.A + t.r + 6) * 2, 7, 3); g.fill(); g.fillStyle = '#c99a5f'; rr(200 - t.A - t.r - 6, t.y + t.r + 3, (t.A + t.r + 6) * 2, 6, 3); g.fill();
        g.fillStyle = '#a37848'; g.fillRect(x - 3, t.y, 6, t.r + 6);
        shadow(x + 4, t.y + t.r + 8, t.r * 0.8, 0.25);
        g.save(); g.translate(x, t.y); g.scale(s, 2 - s);
        g.fillStyle = '#e8c27a'; g.beginPath(); g.arc(0, 0, t.r + 5, 0, 7); g.fill(); g.strokeStyle = 'rgba(150,110,50,.6)'; g.lineWidth = 1; for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283; g.beginPath(); g.moveTo(Math.cos(a) * (t.r + 1), Math.sin(a) * (t.r + 1)); g.lineTo(Math.cos(a) * (t.r + 5), Math.sin(a) * (t.r + 5)); g.stroke(); }
        [[1, '#fff'], [0.8, '#ff9ec7'], [0.55, '#fff'], [0.35, '#b9a1f5'], [0.2, '#ffd34d']].forEach(([k, c]) => { g.fillStyle = c; g.beginPath(); g.arc(0, 0, t.r * k, 0, 7); g.fill(); });
        g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-t.r * 0.35, -t.r * 0.45, t.r * 0.35, t.r * 0.18, -0.5, 0, 7); g.fill();
        for (const st of t.stuck) { g.save(); g.translate(st.dx, st.dy); g.rotate(st.ang); g.fillStyle = '#b98550'; g.fillRect(-28, -2, 30, 4); g.fillStyle = '#ff6fa8'; g.fillRect(-28, -3, 6, 6); g.restore(); }
        g.restore();
        { const bx = x + t.r + 16, by = t.y - t.r + 2, col = ['#e08e55', '#9aa3bd', '#f5b915'][t.val - 1]; g.fillStyle = 'rgba(90,40,100,.25)'; g.beginPath(); g.arc(bx + 1, by + 3, 15, 0, 7); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(bx, by, 15, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.font = '700 17px Fredoka, sans-serif'; g.fillText(t.val, bx, by - 2); g.font = '700 8px Fredoka, sans-serif'; g.fillText('pts', bx, by + 9); } }
      for (const a of e.arrows) { g.save(); g.translate(a.x, a.y); g.rotate(Math.atan2(a.vy, a.vx)); g.fillStyle = vgrad(-2, 2, ['#f0c891', '#b98550']); g.fillRect(-32, -2, 36, 4); g.fillStyle = '#ff6fa8'; g.beginPath(); g.moveTo(-32, -5); g.lineTo(-22, 0); g.lineTo(-32, 5); g.fill(); g.restore(); }
      shadow(SX, SY() + 4, 32, 0.3); let ang = -Math.PI / 2, pw = 0; if (e.aim) { const d = dirOf(); if (d) { ang = Math.atan2(d[1], d[0]); pw = d[2]; } }
      drawMochi(SX, SY(), 64, { sx: (2 - e.sq.s) + pw * 0.1, sy: e.sq.s - pw * 0.1, face: e.aim ? 'focus' : 'idle', lookX: Math.cos(ang) * 1.5, lookY: -1, band: true });
      g.save(); g.translate(SX, SY() - 40); g.rotate(ang + Math.PI / 2);
      g.strokeStyle = '#7e58b0'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.arc(0, 8, 34, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); g.strokeStyle = '#c9b0f5'; g.lineWidth = 2; g.beginPath(); g.arc(0, 7, 34, Math.PI * 1.2, Math.PI * 1.5); g.stroke();
      const bx = Math.cos(Math.PI * 1.15) * 34, by = 8 + Math.sin(Math.PI * 1.15) * 34; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(bx, by); g.lineTo(0, by + 10 + pw * 22); g.lineTo(-bx, by); g.stroke();
      if (e.left > 0 && !e.flying) { g.fillStyle = '#c99a5f'; g.fillRect(-2, by - 30 + pw * 22, 4, 40); }
      g.restore();
      if (e.aim && pw > 0) { for (let i = 1; i < 14; i++) { g.globalAlpha = 0.7 - i * 0.045; g.fillStyle = '#ff6fa8'; g.beginPath(); g.arc(SX + Math.cos(ang) * i * 45, SY() - 40 + Math.sin(ang) * i * 45, 3, 0, 7); g.fill(); } g.globalAlpha = 1; }
      vignette(); hud('🥢 ' + e.left, null, e.score + ' pts');
      if (e.left === 8 && !e.aim) hint('Arrastra hacia atrás y suelta', H - 30);
    };
    e.bot = () => { if (e.flying || e.aim || e.left === 0 || e.botW > e.t) return; e.botW = e.t + 0.6;
      const t = e.tg[[0, 0, 1, 0, 2, 1, 0, 1][e.left - 1] || 0]; let tt = 0.3, px = 0; for (let i = 0; i < 6; i++) { px = tx(t, e.t + tt); tt = Math.hypot(px - SX, t.y - (SY() - 30)) / SPD; }
      const dx = px - SX, dy = t.y - (SY() - 30), l = Math.hypot(dx, dy); e.down(200, H - 200); e.move(200 - dx / l * 100, H - 200 - dy / l * 100); e.up(); };
    e.result = () => e.score; return e;
  } });
// ---------- 6) Charca de los Sapos (v3: carriles fijos, salto siempre vertical) ----------
EVENTS.push({ id: 'sapos', name: 'Charca de los Sapos', icon: '🐸', med: [45, 32, 20], unit: 'nenúfares', fmt: s => s + ' nenúfares',
  how: 'Toca en cualquier sitio: el mochi salta recto hacia delante al nenúfar de su carril. Desliza a izquierda o derecha para cambiar de carril. ¡Mide bien el momento: hay nenúfares que se hunden, lenguas larguísimas, sapos nadadores que se cruzan, sombrereros gruñones, sapos globo y ojazos hipnóticos! 45 s, 3 vidas.',
  create() {
    const RH = 100, JT = 0.34, ST = 0.2, LX = [110, 200, 290], HATS = ['copa', 'fiesta', 'corona', 'copa'];
    const e = { rows: [], row: 0, lane: 1, max: 0, lives: 3, t: 0, cam: 0, state: 'play', hypno: 0, jumps: [], sides: [],
      m: { x: 200, y: 0, jump: null, side: null, sq: { s: 1 }, inv: 0, sink: 0 } };
    const baseY = () => H - 140, RY = r => baseY() - r * RH;
    function makeRow(r) {
      if (r === 0) return { r, shore: true, pads: [null, null, null] };
      const pads = [0, 1, 2].map(l => ({ l, x: LX[l], r: 33, ph: rnd(0, 6), per: rnd(2.8, 3.6), sinker: false, frog: null, flower: Math.random() < 0.3, bob: 0 }));
      // reglas para que SIEMPRE haya camino: el carril central nunca falta ni tiene sapo; huecos y sapos solo en los bordes
      let hole = false;
      if (r >= 3 && Math.random() < 0.45) { pads[Math.random() < 0.5 ? 0 : 2] = null; hole = true; }
      const live = pads.filter(Boolean);
      if (r >= 4) for (const p of live) if (Math.random() < 0.35) p.sinker = true;
      if (r >= 2 && Math.random() < 0.45) { const edge = pads[0] && pads[2] ? pads[Math.random() < 0.5 ? 0 : 2] : (pads[0] || pads[2]); const k = Math.random();
        edge.frog = k < 0.34 ? { type: 'sombrero', hat: HATS[r % 4] } : k < 0.67 ? { type: 'inflador', ph: rnd(0, 6) } : { type: 'ojazos' }; edge.sinker = false; }
      if (hole || live.some(p => p.frog)) pads[1].sinker = false;
      const row = { r, pads };
      if (r >= 4 && r % 3 === 1 && Math.random() < 0.85) row.tongue = { side: Math.random() < 0.5 ? -1 : 1, ph: rnd(0, 3), len: 0 };
      else if (r >= 5 && Math.random() < 0.35) row.swim = { x: rnd(-60, 460), v: (Math.random() < 0.5 ? -1 : 1) * rnd(70, 120) };
      return row;
    }
    const rowAt = r => { while (e.rows.length <= r) e.rows.push(makeRow(e.rows.length)); return e.rows[r]; };
    for (let i = 0; i < 14; i++) rowAt(i);
    const inflated = f => f.type === 'inflador' && Math.sin(T * 2 + f.ph) > 0.2;
    // estado de hundimiento: 0 = a flote, 1 = hundido; avisa con burbujas antes
    const sinkK = p => { if (!p.sinker) return 0; const c = ((e.t + p.ph) % p.per) / p.per; return c < 0.62 ? 0 : c < 0.78 ? (c - 0.62) / 0.16 * 0.5 : c < 0.92 ? 1 : (1 - (c - 0.92) / 0.08); };
    const solid = p => p && sinkK(p) < 0.5;
    const warnK = p => { if (!p || !p.sinker) return 0; const c = ((e.t + p.ph) % p.per) / p.per; return c > 0.45 && c < 0.62 ? 1 : 0; };
    const padOf = (r, l) => r === 0 ? 'shore' : rowAt(r).pads[l];
    e.m.y = RY(0); e.m.x = LX[1];
    function splash(msg) { const m = e.m; e.lives--; m.sink = 0.9; shake = 6; Snd.splash(); burst(m.x, m.y, 22, [150, 210, 255], 260, 0.8, 5); pop(m.x, m.y - 60, msg, '#fff', 28); e.rip = { x: m.x, y: m.y, t: 0 };
      if (e.lives <= 0) { e.state = 'end'; e.wt = 1.3; } }
    const busy = () => e.state !== 'play' || e.m.jump || e.m.side || e.m.sink > 0 || e.superT > 0;
    // salto: SIEMPRE vertical en pantalla, al nenúfar del mismo carril
    function jump(rows = 1, opts = {}) { const m = e.m; m.jump = { x: LX[e.lane], y0: m.y, y1: RY(e.row + rows), r: e.row + rows, t: 0, dur: opts.dur || JT, h: opts.h || 46, back: opts.back, xs: [] };
      m.sq.s = 0.6; m.sq.vs = 0; Snd.boing(rows > 1 ? 1.4 : 1); puff(m.x, m.y, 4, [210, 245, 255]); }
    // cambio de carril: desplazamiento horizontal corto y aparte (nunca diagonal)
    function side(d) { if (e.hypno > 0) d = -d; const nl = e.lane + d; if (nl < 0 || nl > 2) { pop(e.m.x, e.m.y - 50, '¡Borde!', '#fff', 18); return; }
      const m = e.m; m.side = { x0: m.x, x1: LX[nl], y: m.y, l: nl, t: 0, ys: [] }; Snd.swipe(); m.sq.s = 0.8; m.sq.vs = 0; }
    e.jumpFwd = () => { if (!busy()) { e.lastFrom = { row: e.row }; jump(1); } };
    e.side = d => { if (!busy()) side(d); };
    // entrada táctil: toque = salto adelante; deslizar horizontal = cambiar de carril
    e.down = (x, y) => { e.touch = { x, y, used: false }; };
    e.move = (x, y) => { const tc = e.touch; if (!tc || tc.used) return; const dx = x - tc.x, dy = y - tc.y; if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy) * 1.2) { tc.used = true; e.side(Math.sign(dx)); } };
    e.up = () => { const tc = e.touch; e.touch = null; if (tc && !tc.used) e.jumpFwd(); };
    function arrive() {
      const m = e.m, j = m.jump; m.jump = null; m.y = j.y1; m.x = j.x; e.row = j.r; e.jumps.push({ xs: j.xs, x: j.x, y0: j.y0, y1: j.y1 }); if (e.jumps.length > 80) e.jumps.shift();
      const p = padOf(e.row, e.lane);
      if (p === 'shore') { m.sq.s = 0.6; return; }
      if (!p) { splash('¡Chof! No hay nenúfar'); return; }
      if (!solid(p)) { splash('¡Chof! Se hundió'); return; }
      m.sq.s = 0.55; m.sq.vs = 0; p.bob = 1; Snd.squish(); burst(m.x, m.y, 8, [170, 230, 150], 140, 0.5, 4); e.rip = { x: m.x, y: m.y, t: 0 };
      const f = p.frog;
      if (f && f.type === 'sombrero' && !j.back) { Snd.croak(); pop(m.x, m.y - 70, '¡Fuera de mi nenúfar!', '#7be08a', 20); f.angry = 0.6; m.jump = { x: m.x, y0: m.y, y1: RY(e.row - 1), r: e.row - 1, t: 0, dur: 0.4, h: 60, back: true, xs: [] }; return; }
      if (f && f.type === 'inflador') { if (inflated(f)) { Snd.croak(); f.angry = 0.6; splash('¡PLOF! Sapo globo'); return; } pop(m.x, m.y - 70, '¡Supersalto! +2', '#ffd34d', 26); stars(m.x, m.y, 10); e.superT = 0.12; }
      if (f && f.type === 'ojazos') { e.hypno = 3; Snd.tone(500, 0.6, { type: 'sine', vol: 0.08, to: 900 }); pop(m.x, m.y - 70, '¡Hipnotizado! 🌀', '#b9a1f5', 24); }
      if (e.row > e.max) e.max = e.row;
    }
    function step(dt) {
      const m = e.m; e.t += dt; e.hypno = Math.max(0, e.hypno - dt); m.inv = Math.max(0, m.inv - dt); spring(m.sq, dt);
      for (let r = Math.max(1, e.row - 3); r < e.row + 12; r++) { const row = rowAt(r);
        for (const p of row.pads) if (p) p.bob = Math.max(0, p.bob - dt * 2.5);
        if (row.tongue) { const tg = row.tongue; tg.ph += dt; const c = tg.ph % 3.2; tg.len = c > 2.2 ? Math.sin((c - 2.2) / 1.0 * Math.PI) * 250 : 0; /* la lengua alcanza 2 carriles: el tercero es refugio */ tg.warn = c > 1.5 && c <= 2.2; }
        if (row.swim) { row.swim.x += row.swim.v * dt; if (row.swim.x > 470) row.swim.x -= 530; if (row.swim.x < -70) row.swim.x += 530; } }
      const still = !m.jump && !m.side && m.sink <= 0 && e.state === 'play';
      if (still && e.row > 0) { const row = rowAt(e.row), p = row.pads[e.lane];
        if (p && !solid(p)) splash('¡Glu glu! Se hundió');
        else if (row.tongue && row.tongue.len > 0 && m.inv <= 0) { const sx = row.tongue.side < 0 ? -10 : 410; if (Math.abs(m.x - sx) < row.tongue.len) { splash('¡LAMETAZO!'); Snd.croak(); } }
        else if (row.swim && m.inv <= 0 && Math.abs(row.swim.x - m.x) < 30) { splash('¡Empujón de sapo!'); Snd.croak(); } }
      if (e.superT > 0) { e.superT -= dt; if (e.superT <= 0 && !m.jump && m.sink <= 0 && e.state === 'play') jump(2, { dur: 0.55, h: 110 }); }
      if (m.sink > 0) { m.sink -= dt; if (m.sink <= 0 && e.state === 'play') {
          const row = rowAt(e.row); let l = e.lane;
          if (e.row > 0) { const ok = [0, 1, 2].filter(k => row.pads[k] && !row.pads[k].frog); l = ok.length ? ok.sort((a, b) => Math.abs(a - e.lane) - Math.abs(b - e.lane))[0] : e.lane; if (!row.pads[l]) row.pads[l] = { l, x: LX[l], r: 33, ph: 0, per: 3, sinker: false, frog: null, bob: 0 }; row.pads[l].sinker = false; row.pads[l].frog = null; }
          e.lane = l; m.x = LX[l]; m.y = RY(e.row); m.inv = 1.4; m.sq.s = 1.4; m.sq.vs = 0; } }
      if (m.side) { const s = m.side; s.t += dt; const k = Math.min(1, s.t / ST); m.x = lerp(s.x0, s.x1, ease(k)); m.y = s.y - Math.sin(k * Math.PI) * 10; s.ys.push(s.y); if (k >= 1) { m.side = null; m.x = s.x1; m.y = s.y; e.lane = s.l; e.sides.push(s);
          const p = padOf(e.row, e.lane); if (p !== 'shore' && !solid(p)) splash(p ? '¡Chof! Se hundió' : '¡Chof!');
          else { m.sq.s = 0.7; m.sq.vs = 0; if (p && p !== 'shore') { p.bob = 0.6; const f = p.frog;
            if (f && f.type === 'sombrero') { Snd.croak(); f.angry = 0.6; pop(m.x, m.y - 70, '¡Ocupado!', '#7be08a', 20); m.side = { x0: m.x, x1: s.x0, y: s.y, l: LX.indexOf(s.x0), t: 0, ys: [] }; }
            else if (f && f.type === 'inflador' && inflated(f)) { Snd.croak(); f.angry = 0.6; splash('¡PLOF! Sapo globo'); }
            else if (f && f.type === 'ojazos') { e.hypno = 3; pop(m.x, m.y - 70, '¡Hipnotizado! 🌀', '#b9a1f5', 24); } } } } }
      if (m.jump) { const j = m.jump; j.t += dt; const k = Math.min(1, j.t / j.dur); m.x = j.x; const gy = lerp(j.y0, j.y1, k); m.y = gy - Math.sin(k * Math.PI) * j.h; j.xs.push(m.x); if (k >= 1) arrive(); }
      if (e.rip) e.rip.t += dt;
      if (e.t >= 45 && e.state === 'play') { e.state = 'end'; e.wt = 1.3; Snd.win(2); pop(200, 200, '¡Tiempo!', '#ffd34d', 42); }
      if (e.state === 'end') { e.wt -= dt; if (e.wt <= 0) e.done = true; }
    }
    e.update = dt => { step(dt); const fy = e.m.jump ? lerp(e.m.jump.y0, e.m.jump.y1, Math.min(1, e.m.jump.t / e.m.jump.dur)) : e.m.side ? e.m.side.y : e.m.y; e.cam = lerp(e.cam, fy - (H - 250), 1 - Math.pow(0.001, dt)); };
    function frog(x, y, f, s = 1) {
      const sc = f.type === 'inflador' ? (inflated(f) ? 1.7 + Math.sin(T * 12) * 0.05 : 1) : 1, ang = f.angry > 0 ? Math.sin(T * 40) * 0.2 : Math.sin(T * 2 + x) * 0.03; if (f.angry) f.angry -= 1 / 60;
      const breath = 1 + Math.sin(T * 4 + x) * 0.03;
      g.save(); g.translate(x, y); g.rotate(ang); g.scale(s * sc * breath, s * (f.type === 'inflador' ? sc * 0.95 : 1) / breath);
      shadow(0, 2, 26, 0.25);
      // patas
      g.fillStyle = '#3f9d5a'; for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * 20, -2, 10, 5, sd * 0.3, 0, 7); g.fill(); g.fillStyle = '#6fd08a'; for (let k = -1; k <= 1; k++) { g.beginPath(); g.arc(sd * 27 + k * 3, 1, 2.2, 0, 7); g.fill(); } g.fillStyle = '#3f9d5a'; }
      const body = f.type === 'inflador' ? ['#d9ffc2', '#8fe0a8', '#4fae6a'] : f.type === 'ojazos' ? ['#e6d2ff', '#a98ef0', '#6d55c0'] : ['#d4f7b0', '#6fcf7d', '#3d9a59'];
      const gr = g.createRadialGradient(-8, -20, 3, 0, -8, 30); gr.addColorStop(0, body[0]); gr.addColorStop(0.55, body[1]); gr.addColorStop(1, body[2]); g.fillStyle = gr;
      g.beginPath(); g.ellipse(0, -11, 25, 19, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(30,70,50,.35)'; g.lineWidth = 1.5; g.stroke();
      if (f.type === 'inflador') { g.strokeStyle = 'rgba(255,150,200,.6)'; g.lineWidth = 3; for (let k = -1; k <= 1; k++) { g.beginPath(); g.ellipse(0, -11, 24 - Math.abs(k) * 0, 18, 0, -1.2 + k * 0.5, -0.9 + k * 0.5); g.stroke(); } }
      g.fillStyle = 'rgba(40,110,60,.35)'; for (const [a, b, rr2] of [[-12, -20, 3], [10, -22, 2.4], [14, -10, 2], [-16, -8, 2.2]]) { g.beginPath(); g.arc(a, b, rr2, 0, 7); g.fill(); }
      g.fillStyle = '#fff3c4'; g.beginPath(); g.ellipse(0, -4, 15, 9, 0, 0, 7); g.fill();
      const big = f.type === 'ojazos' ? 2.1 : 1, er = 7 * big; const lx = clamp((e.m.x - x) / 200, -1, 1) * er * 0.4, ly = clamp((e.m.y - y) / 200, -1, 1) * er * 0.4;
      for (const sd of [-1, 1]) { const ex = sd * 12 * (big > 1 ? 1.1 : 1), ey = -25 - er * 0.3;
        g.fillStyle = body[1]; g.beginPath(); g.arc(ex, ey, er + 3, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(ex, ey, er, 0, 7); g.fill();
        if (big > 1) { g.strokeStyle = '#6d55c0'; g.lineWidth = 1.6; g.beginPath(); for (let a = 0; a < 14; a += 0.3) { const r2 = a / 14 * er * 0.9; g.lineTo(ex + Math.cos(a - T * 6 * sd) * r2, ey + Math.sin(a - T * 6 * sd) * r2); } g.stroke(); }
        else { g.fillStyle = '#24142e'; g.beginPath(); g.ellipse(ex + lx, ey + ly, er * 0.55, er * 0.3, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(ex + lx - 1.5, ey + ly - 1.5, 1.4, 0, 7); g.fill(); } }
      g.strokeStyle = '#2d6b3f'; g.lineWidth = 2; g.beginPath(); g.arc(0, -11, 9, 0.25, Math.PI - 0.25); g.stroke();
      g.fillStyle = 'rgba(255,120,160,.45)'; for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * 15, -10, 4, 2.5, 0, 0, 7); g.fill(); }
      if (f.type === 'sombrero') { // monóculo de sapo elegante
        g.strokeStyle = '#ffd34d'; g.lineWidth = 1.6; g.beginPath(); g.arc(12, -27, 8.5, 0, 7); g.stroke(); g.beginPath(); g.moveTo(19, -23); g.quadraticCurveTo(24, -10, 18, 0); g.stroke();
        g.save(); g.translate(0, -38); g.rotate(-0.15);
        if (f.hat === 'copa') { g.fillStyle = '#3d2348'; rr(-17, -3, 34, 6, 3); g.fill(); g.fillStyle = vgrad(-28, 0, ['#5b3a6e', '#2e1838']); g.fillRect(-11, -28, 22, 26); g.fillStyle = '#ff6fa8'; g.fillRect(-11, -9, 22, 5); g.fillStyle = '#fff'; g.beginPath(); g.arc(7, -20, 2, 0, 7); g.fill(); }
        else if (f.hat === 'fiesta') { const hg = g.createLinearGradient(-11, 0, 11, 0); hg.addColorStop(0, '#ffd34d'); hg.addColorStop(1, '#ff9ec7'); g.fillStyle = hg; g.beginPath(); g.moveTo(-12, 0); g.lineTo(0, -32); g.lineTo(12, 0); g.fill(); g.fillStyle = '#b9a1f5'; g.beginPath(); g.arc(0, -32, 4.5, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(-3 + k * 3, -8 - k * 7, 1.6, 0, 7); g.fill(); } }
        else { g.fillStyle = vgrad(-18, 0, ['#fff1a8', '#f5b915']); g.beginPath(); g.moveTo(-14, 0); g.lineTo(-14, -15); g.lineTo(-7, -6); g.lineTo(0, -19); g.lineTo(7, -6); g.lineTo(14, -15); g.lineTo(14, 0); g.fill(); g.fillStyle = '#ff6fa8'; g.beginPath(); g.arc(0, -6, 2.5, 0, 7); g.fill(); }
        g.restore(); g.strokeStyle = '#3d2348'; g.lineWidth = 2; g.beginPath(); g.moveTo(-11, -13); g.quadraticCurveTo(-5, -9, 0, -13); g.quadraticCurveTo(5, -9, 11, -13); g.stroke(); }
      if (f.type === 'inflador' && inflated(f)) { g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(-10, -22, 7, 3.5, -0.6, 0, 7); g.fill(); }
      if (f.type === 'ojazos') { g.fillStyle = 'rgba(185,161,245,.35)'; for (let k = 0; k < 3; k++) { const a = T * 2 + k * 2.1; g.beginPath(); g.arc(Math.cos(a) * 34, -18 + Math.sin(a) * 14, 3, 0, 7); g.fill(); } }
      g.restore();
    }
    function lily(p, y) {
      const bob = Math.sin(p.bob * 9) * p.bob * 3, sk = sinkK(p), wk = warnK(p) ? Math.sin(T * 30) * 1.5 : 0;
      if (warnK(p)) for (let k = 0; k < 3; k++) { const bt = (T * 1.7 + k * 0.33) % 1; g.strokeStyle = `rgba(255,255,255,${0.8 * (1 - bt)})`; g.lineWidth = 1.5; g.beginPath(); g.arc(p.x - 16 + k * 16, y - bt * 22, 3 + bt * 3, 0, 7); g.stroke(); }
      if (sk >= 0.99) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.beginPath(); g.ellipse(p.x, y, p.r * 0.8, p.r * 0.3, 0, 0, 7); g.stroke(); return; }
      g.save(); g.globalAlpha = 1 - sk * 0.8; g.translate(p.x + wk, y + bob + sk * 6); g.scale(1 - sk * 0.4, 0.55 * (1 - sk * 0.4));
      g.fillStyle = 'rgba(30,90,110,.22)'; g.beginPath(); g.arc(4, 10, p.r + 2, 0, 7); g.fill();
      const gr = g.createRadialGradient(-p.r * 0.3, -p.r * 0.3, 2, 0, 0, p.r); gr.addColorStop(0, '#b6f0a2'); gr.addColorStop(0.7, '#7fd37a'); gr.addColorStop(1, '#58b05e'); g.fillStyle = gr;
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, p.r, 0.25 + p.ph * 0.3, 6.283 - 0.25 + p.ph * 0.3); g.closePath(); g.fill(); g.strokeStyle = 'rgba(40,110,60,.55)'; g.lineWidth = 1.6; g.stroke();
      g.strokeStyle = 'rgba(60,140,70,.45)'; g.lineWidth = 1.5; for (let k = 0; k < 7; k++) { const a = p.ph * 0.3 + 0.6 + k * 0.8; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * p.r * 0.9, Math.sin(a) * p.r * 0.9); g.stroke(); }
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, p.r - 2, Math.PI * 1.1, Math.PI * 1.5); g.stroke();
      // diana suave en el centro (para ver dónde cae)
      g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(0, 0, 6, 0, 7); g.fill();
      g.restore();
      if (p.flower && !p.frog) { const fx = p.x + p.r * 0.45, fy = y - 4; for (let k = 0; k < 6; k++) { const a = k * 1.047 + T * 0.3; g.fillStyle = k % 2 ? '#ffc2dc' : '#ffe0ee'; g.beginPath(); g.ellipse(fx + Math.cos(a) * 5, fy + Math.sin(a) * 3, 5, 3, a, 0, 7); g.fill(); } g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(fx, fy, 2.5, 0, 7); g.fill(); }
    }
    // sapos surrealistas decorativos en las orillas
    function bankToad(x, y, kind, side) {
      g.save(); g.translate(x, y); g.scale(side, 1);
      g.fillStyle = vgrad(-10, 20, ['#c9b3e6', '#8a72b8']); g.beginPath(); g.ellipse(0, 10, 30, 14, 0, 0, 7); g.fill(); // piedra
      if (kind === 0) { // sapo con taza de té gigante flotando
        frog(0, 2, { type: 'sombrero', hat: 'copa' }, 0.8); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(26, -40 + Math.sin(T * 2) * 4, 9, 6, 0, 0, Math.PI); g.fill(); g.strokeStyle = '#ff9ec7'; g.lineWidth = 2; g.beginPath(); g.arc(35, -38 + Math.sin(T * 2) * 4, 3, -1.5, 1.5); g.stroke(); }
      else if (kind === 1) { // seta-sombrero
        g.fillStyle = '#fff4e0'; g.fillRect(-4, -30, 8, 30); g.fillStyle = vgrad(-50, -26, ['#ff7fae', '#e24f8a']); g.beginPath(); g.ellipse(0, -30, 24, 14, 0, Math.PI, 0); g.fill(); g.fillStyle = '#fff'; for (const [a, b] of [[-10, -36], [6, -40], [14, -32]]) { g.beginPath(); g.arc(a, b, 3, 0, 7); g.fill(); }
        frog(0, 6, { type: 'ojazos' }, 0.6); }
      else { frog(0, 2, { type: 'inflador', ph: x }, 0.75); g.strokeStyle = '#fff'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -28); g.lineTo(-6, -70); g.stroke(); g.fillStyle = '#b9a1f5'; g.beginPath(); g.ellipse(-6, -78, 9, 11, 0, 0, 7); g.fill(); }
      g.restore();
    }
    e.draw = () => {
      layer('sapos', () => { const wg = g.createLinearGradient(0, 0, 0, H); wg.addColorStop(0, '#7fd0e6'); wg.addColorStop(0.5, '#9fe0ea'); wg.addColorStop(1, '#bff0e0'); g.fillStyle = wg; g.fillRect(0, 0, W, H); grain(0.05);
        for (const sd of [0, 1]) { const gr = g.createLinearGradient(sd ? W : 0, 0, sd ? W - 60 : 60, 0); gr.addColorStop(0, 'rgba(40,110,120,.25)'); gr.addColorStop(1, 'rgba(40,110,120,0)'); g.fillStyle = gr; g.fillRect(sd ? W - 60 : 0, 0, 60, H); }
        // carriles: estelas suaves en el agua
        for (const x of LX) { const gr = g.createLinearGradient(x - 40, 0, x + 40, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,.13)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - 40, 0, 80, H); } });
      g.save(); if (e.hypno > 0) { g.translate(200, H / 2); g.rotate(Math.sin(T * 3) * 0.04 * e.hypno); g.translate(-200, -H / 2); }
      g.translate(0, -e.cam);
      g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 2; for (let i = 0; i < 22; i++) { const y = Math.floor(e.cam / 50) * 50 + i * 50, x = (i * 97 + T * 15) % 440 - 20; g.beginPath(); g.arc(x, y, 12 + (i % 3) * 6, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
      if (e.rip && e.rip.t < 1) { g.strokeStyle = `rgba(255,255,255,${0.6 * (1 - e.rip.t)})`; g.lineWidth = 2; for (let k = 0; k < 2; k++) { const rr2 = 10 + (e.rip.t + k * 0.2) * 70; g.beginPath(); g.ellipse(e.rip.x, e.rip.y, rr2, rr2 * 0.4, 0, 0, 7); g.stroke(); } }
      const r0 = Math.max(0, e.row - 4), r1 = e.row + 10;
      for (let r = r0; r < r1; r++) { const y = RY(r); for (const sd of [0, 1]) { const bx = sd ? W - 6 : 6; for (let k = 0; k < 3; k++) { const sw = Math.sin(T * 1.5 + r + k) * 4; g.strokeStyle = k % 2 ? '#5fae6a' : '#7cc77a'; g.lineWidth = 3; g.beginPath(); g.moveTo(bx + (k - 1) * 6, y + 30); g.quadraticCurveTo(bx + (k - 1) * 6, y - 10, bx + (k - 1) * 8 + sw, y - 34 - k * 6); g.stroke(); } g.fillStyle = '#a0704a'; g.beginPath(); g.ellipse(bx + 2 + Math.sin(T * 1.5 + r) * 4, y - 36, 3.5, 9, 0, 0, 7); g.fill(); }
        if (r > 0 && r % 5 === 2) bankToad(r % 2 ? W - 26 : 26, y + 44, (r >> 1) % 3, r % 2 ? -1 : 1); }
      for (let r = r0; r < r1; r++) { const row = rowAt(r), y = RY(r);
        if (row.shore) { g.fillStyle = vgrad(y - 40, y + 200, ['#9be7a8', '#ffe2b8']); g.fillRect(0, y - 40, W, 240); g.fillStyle = '#7fd08f'; g.beginPath(); for (let x = 0; x <= W; x += 20) g.lineTo(x, y - 40 - (x / 20 % 2) * 6); g.lineTo(W, y - 30); g.lineTo(0, y - 30); g.fill();
          for (let k = 0; k < 6; k++) { const fx = 30 + k * 70; g.fillStyle = k % 2 ? '#ffc2dc' : '#fff'; g.beginPath(); g.arc(fx, y + 30 + (k % 3) * 12, 4, 0, 7); g.fill(); } continue; }
        for (const p of row.pads) if (p) { lily(p, y); if (p.frog && sinkK(p) < 0.5) frog(p.x, y + 4, p.frog); }
        if (row.swim) { const sw = row.swim; g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; for (let k = 1; k <= 3; k++) { g.beginPath(); g.arc(sw.x - Math.sign(sw.v) * k * 14, y + 6, 6 + k * 3, 0.3, Math.PI - 0.3); g.stroke(); } g.save(); g.translate(sw.x, y + 8); g.scale(Math.sign(sw.v), 1); g.rotate(0.25); frog(0, 0, { type: 'sombrero', hat: 'fiesta' }, 0.8); g.restore(); }
        if (row.tongue) { const tg = row.tongue, sx = tg.side < 0 ? -6 : 406;
          if (tg.warn) { g.fillStyle = 'rgba(255,90,140,' + (0.2 + 0.2 * Math.sin(T * 30)) + ')'; rr(4, y - 26, W - 8, 24, 12); g.fill(); }
          if (tg.len > 0) { g.strokeStyle = '#ff6f91'; g.lineWidth = 11; g.lineCap = 'round'; g.beginPath(); g.moveTo(sx, y - 14); g.quadraticCurveTo(sx - tg.side * tg.len / 2, y - 30 + Math.sin(T * 20) * 6, sx - tg.side * tg.len, y - 12); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 3; g.stroke(); g.fillStyle = '#ff4f7a'; g.beginPath(); g.arc(sx - tg.side * tg.len, y - 12, 10, 0, 7); g.fill(); }
          g.fillStyle = vgrad(y - 10, y + 20, ['#b0a4c4', '#7d6e96']); g.beginPath(); g.ellipse(sx, y + 4, 32, 17, 0, 0, 7); g.fill(); frog(sx - tg.side * 4, y - 2, { type: 'ojazos' }, 1.1); }
      }
      for (let i = 0; i < 10; i++) { const fx = (i * 83 + Math.sin(T * 0.7 + i) * 30 + 400) % 400, fy = e.cam + (i * 131 % H) + Math.cos(T + i) * 20; glow(fx, fy, 10, [255, 245, 160], 0.5 + 0.4 * Math.sin(T * 4 + i)); }
      const m = e.m; if (m.sink > 0) g.globalAlpha = clamp(m.sink, 0, 1);
      // flecha de salto: siempre recta hacia arriba
      if (!m.jump && !m.side && m.sink <= 0 && e.state === 'play') { const ty = RY(e.row + 1) + 10, a = 0.45 + 0.25 * Math.sin(T * 6); g.fillStyle = `rgba(255,255,255,${a})`; for (let k = 0; k < 3; k++) { const yy = m.y - 58 - k * 12; if (yy < ty) break; g.beginPath(); g.moveTo(m.x, yy - 8); g.lineTo(m.x - 9, yy + 2); g.lineTo(m.x + 9, yy + 2); g.fill(); } }
      if (m.jump) { const k = Math.min(1, m.jump.t / m.jump.dur); shadow(m.x, lerp(m.jump.y0, m.jump.y1, k) + 2, 16 - Math.sin(k * Math.PI) * 5, 0.25); } else shadow(m.x, (m.side ? m.side.y : m.y) + 2, 20, 0.3);
      const air = m.jump ? Math.sin(Math.min(1, m.jump.t / m.jump.dur) * Math.PI) : 0, sl = m.side ? Math.sign(m.side.x1 - m.side.x0) : 0;
      if (!(m.inv > 0 && Math.floor(T * 12) % 2)) drawMochi(m.x, m.y + (m.sink > 0 ? (0.9 - m.sink) * 30 : 0), 44, { sx: (2 - m.sq.s) - air * 0.15 + Math.abs(sl) * 0.1, sy: m.sq.s + air * 0.25, rot: sl * 0.18, lookX: sl, face: m.sink > 0 ? 'dizzy' : e.hypno > 0 ? 'dizzy' : m.jump ? 'wow' : 'happy', armsUp: !!m.jump });
      g.globalAlpha = 1; g.restore();
      if (e.hypno > 0) { g.fillStyle = `rgba(185,161,245,${0.15 + 0.08 * Math.sin(T * 6)})`; g.fillRect(0, 0, W, H); }
      vignette(); hud('❤'.repeat(Math.max(0, e.lives)) || '—', e.max + ' 🪷', Math.max(0, 45 - e.t).toFixed(0) + ' s');
      if (e.hypno > 0) hint('🌀 ¡Deslizar va al revés!', 74);
      if (e.t < 5) hint('Toca: salto adelante ↑   ·   Desliza ← → : carril', H - 40);
    };
    // bot: busca por el nenúfar actual el carril cuyo siguiente nenúfar es seguro, se desplaza hasta él y salta en el momento justo
    const at = (r, l, dtA, fn) => { const t0 = e.t; e.t += dtA; const v = fn(); e.t = t0; return v; };
    const tongueHits = (row, l, dtA) => { const tg = row.tongue; if (!tg) return false; const c = (tg.ph + dtA) % 3.2; if (c < 1.2) return false; const sx = tg.side < 0 ? -10 : 410; return Math.abs(LX[l] - sx) < 262; };
    const standOK = (r, l, dtA, hold) => { if (r === 0) return true; const row = rowAt(r), p = row.pads[l]; if (!p) return false;
      if (!at(r, l, dtA, () => solid(p)) || !at(r, l, dtA + hold, () => solid(p))) return false; const f = p.frog; if (f && f.type !== 'ojazos') return false;
      if (tongueHits(row, l, dtA)) return false; if (row.swim && Math.abs(row.swim.x + row.swim.v * dtA - LX[l]) < 75) return false; return true; };
    e.bot = () => { if (busy() || (e.botW || 0) > e.t) return; e.botW = e.t + 0.1; const go = d => e.side(e.hypno > 0 ? -d : d);
      if (standOK(e.row + 1, e.lane, JT, 0.5)) { e.jumpFwd(); return; }
      const row = rowAt(e.row), canStand = l => e.row === 0 || (row.pads[l] && (!row.pads[l].frog || row.pads[l].frog.type === 'ojazos'));
      for (const d of [-1, 1]) { const l = e.lane + d; if (l < 0 || l > 2 || !canStand(l) || !standOK(e.row, l, ST, 0.2)) continue; const l2 = l + d;
        if (standOK(e.row + 1, l, ST + JT, 0.5) || (l2 >= 0 && l2 <= 2 && canStand(l2) && standOK(e.row + 1, l2, 2 * ST + JT, 0.5))) { go(d); return; } }
      if (!standOK(e.row, e.lane, 0.35, 0)) for (const d of [1, -1]) { const l = e.lane + d; if (l >= 0 && l <= 2 && canStand(l) && standOK(e.row, l, ST, 0.4)) { go(d); return; } } };
    e.result = () => e.max; return e;
  } });
// ===================== HUD sobre el 3D =====================
function vig3() { layer('vig3', () => { const gr = g.createRadialGradient(W / 2, H * 0.5, Math.min(W, H) * 0.42, W / 2, H * 0.5, Math.max(W, H) * 0.78); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(8,4,14,.38)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }); }
function at3(x, y) { const q = R3D.proj(x, y); return q ? [q[0] / SC, q[1] / SC] : [x, y]; }
const HUD = {
  bolos(e) { vig3(); const m = e.m;
    if (e.aim) { const len = Math.min(160, Math.hypot(m.x - e.aim.x, m.y - e.aim.y)); const [px, py] = at3(m.x, m.y); bar(px - 50, Math.min(H - 70, py + 34), 100, 14, len / 160, len > 140 ? '#e0566e' : '#9a86d8'); }
    const wv = e.wind / 22; pill(W / 2 - 62, H - 112, 124, 30, wv === 0 ? 'Sin viento' : (wv < 0 ? '← ' : '') + 'Viento ' + Math.abs(wv) + (wv > 0 ? ' →' : ''));
    if (wv) for (let i = 0; i < 3; i++) { const xx = ((T * 160 * Math.sign(wv) + i * 140) % 400 + 400) % 400; g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 2; g.beginPath(); g.moveTo(xx, 300 + i * 90); g.quadraticCurveTo(xx + 20, 294 + i * 90, xx + 40, 300 + i * 90); g.stroke(); }
    hud('Tirada ' + Math.min(3, e.throws + 1) + '/3', null, e.score + ' 🎳'); if (e.state === 'aim' && !e.aim) hint('Arrastra hacia atrás ↓ y suelta', H - 40); },
  muelle(e) { vig3(); hud('Intento ' + Math.min(3, e.tries + 1) + '/3', null, 'Mejor ' + e.best.toFixed(2));
    if (e.state === 'fly') txt(e.maxH.toFixed(2) + ' m', 200, 92, 44, '#fff');
    if (e.state === 'charge' || e.state === 'ready') { g.save(); g.translate(40, H - 120); g.rotate(-Math.PI / 2); bar(0, -14, 220, 28, e.c, e.c > 0.93 ? '#e8b437' : '#d9667e', [0.93, 1]); g.restore(); txt('⚡', 40, H - 360, 24); }
    if (e.state === 'ready') hint('Mantén pulsado y suelta en la zona dorada', H - 44); },
  martillo(e) { vig3(); hud('Intento ' + Math.min(3, e.tries + 1) + '/3', null, 'Mejor ' + e.best.toFixed(1));
    if (e.state === 'fly' && e.b) txt(Math.max(0, (e.b.x - 110) / 10).toFixed(1) + ' m', 200, 92, 44, '#fff');
    if (e.state === 'spin') { bar(100, H - 60, 200, 16, e.w / 13, '#d9667e'); hint('¡Suelta en la flecha dorada!', H - 98); }
    if (e.state === 'ready') hint('Mantén pulsado para girar', H - 54); },
  dango(e) { vig3(); const danger = Math.abs(e.th);
    if (danger > 0.6 && e.state === 'play') { g.fillStyle = `rgba(230,70,90,${(danger - 0.6) * 0.6 * (0.6 + 0.4 * Math.sin(T * 20))})`; g.fillRect(0, 0, 10, H); g.fillRect(W - 10, 0, 10, H); }
    g.fillStyle = 'rgba(0,0,0,.25)'; rr(90, 62, 220, 18, 9); g.fill(); g.fillStyle = 'rgba(24,18,30,.75)'; rr(90, 60, 220, 18, 9); g.fill(); g.strokeStyle = 'rgba(232,196,120,.5)'; g.lineWidth = 1; g.stroke(); g.fillStyle = 'rgba(140,200,140,.75)'; rr(170, 62, 60, 14, 7); g.fill();
    g.fillStyle = danger > 0.6 ? '#e0566e' : '#f2d27a'; g.beginPath(); g.arc(200 + clamp(e.th, -1, 1) * 110, 69, 10, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
    hud('🍡 ' + e.n, 'Nivel ' + e.lvl, e.t.toFixed(1) + ' s'); if (e.t < 3) hint('← Desliza para equilibrar →', H - 40); },
  arco(e) { vig3(); hud('🥢 ' + e.left, null, e.score + ' pts'); if (e.left === 8 && !e.aim) hint('Arrastra hacia atrás y suelta', H - 30); },
  sapos(e) { if (e.hypno > 0) { g.fillStyle = `rgba(150,120,230,${0.12 + 0.08 * Math.sin(T * 6)})`; g.fillRect(0, 0, W, H); } vig3();
    hud('❤'.repeat(Math.max(0, e.lives)) || '—', e.max + ' 🪷', Math.max(0, 45 - e.t).toFixed(0) + ' s');
    if (e.hypno > 0) hint('🌀 ¡Deslizar va al revés!', 74); if (e.t < 5) hint('Toca: salto adelante ↑   ·   Desliza ← → : carril', H - 40); },
};
let menuT3 = 0; function menuFx(dt) { menuT3 += dt; if (Math.random() < 0.06) parts.push({ x: rnd(0, W), y: -10, vx: rnd(-20, 20), vy: rnd(40, 90), life: 6, max: 6, sz: rnd(3, 6), col: [[243, 198, 211], [242, 210, 122], [255, 255, 255], [214, 205, 240]][Math.floor(rnd(0, 4))], conf: 1, gr: 10, rot: rnd(0, 6), vr: rnd(-5, 5) }); }
// ===================== Flujo: menú, intro, resultado, medallero =====================
const $ = id => document.getElementById(id);
const MEDAL = ['🥇', '🥈', '🥉'], NOMED = '🎗️', MCLS = ['oro', 'plata', 'bronce'];
const bestOf = id => { const v = store.get('mochiOli_best_' + id, null); return v == null ? null : +v; };
const medalOf = (ev, s) => s == null ? -1 : ev.med.findIndex(t => s >= t);
let cur = null, curIdx = -1, olympic = null, last = performance.now(), iris = 0;
function show(id) { for (const s of document.querySelectorAll('.scr')) s.classList.toggle('on', s.id === id); }
function buildMenu() {
  const L = $('evList'); L.innerHTML = '';
  EVENTS.forEach((ev, i) => { const b = document.createElement('button'); b.className = 'ev'; b.style.animationDelay = (i * 0.05) + 's'; const bs = bestOf(ev.id), md = medalOf(ev, bs);
    b.innerHTML = `<span class="ic ic${i}">${ev.icon}</span><span class="nm">${ev.name}<small>${bs == null ? '¡Sin estrenar!' : 'Récord: ' + ev.fmt(bs)}</small></span><span class="md">${md >= 0 ? MEDAL[md] : '›'}</span>`;
    b.onclick = () => { Snd.init(); Snd.tick(); olympic = null; intro(i); }; L.appendChild(b); });
}
let preview = null;
function intro(i) { curIdx = i; const ev = EVENTS[i]; try { preview = ev.create(); preview.ev = ev; } catch (e) { preview = null; } $('inI').textContent = ev.icon; $('inT').textContent = ev.name; $('inH').textContent = ev.how; $('inP').textContent = olympic ? `Prueba ${i + 1} de ${EVENTS.length}` : 'Prueba libre';
  $('inM').innerHTML = ev.med.map((t, k) => `<span class="mm ${MCLS[k]}">${MEDAL[k]} ${ev.fmt(t)}</span>`).join(''); show('intro'); cur = null; }
$('inGo').onclick = () => { Snd.init(); start(curIdx); };
function start(i) { curIdx = i; parts = []; pops = []; cur = EVENTS[i].create(); cur.ev = EVENTS[i]; show(''); iris = 1; setTimeout(() => { if (cur) { pop(200, H * 0.42, '¡Ya!', '#ffd34d', 56); Snd.boing(1.3); } }, 250); }
function finish() {
  const ev = cur.ev, s = cur.result(), prev = bestOf(ev.id), rec = prev == null || s > prev; if (rec) store.set('mochiOli_best_' + ev.id, s);
  const md = medalOf(ev, s); if (olympic) olympic.push({ id: ev.id, s, md });
  $('rsT').textContent = ev.icon + ' ' + ev.name; $('rsM').textContent = md >= 0 ? MEDAL[md] : NOMED; $('rsM').className = 'medal ' + (md >= 0 ? MCLS[md] : 'none'); $('rsS').textContent = ev.fmt(s);
  $('rsR').textContent = rec ? '⭐ ¡Nuevo récord!' : 'Récord: ' + ev.fmt(prev); $('rsR').className = 'sub' + (rec ? ' rec' : '');
  $('rsN').textContent = md === 0 ? '¡Medalla de oro!' : md > 0 ? 'Oro con ' + ev.fmt(ev.med[0]) : 'Bronce con ' + ev.fmt(ev.med[2]);
  $('rsNext').textContent = olympic ? (curIdx < EVENTS.length - 1 ? 'Siguiente prueba' : 'Ver medallero') : 'Menú';
  if (md >= 0) { Snd.win(3 - md); Snd.cheer(1 - md * 0.25); confetti(200, H * 0.35, 30 + (2 - md) * 20, 420); } else Snd.bad();
  window.__lastEv = cur; cur = null; show('res'); window.__lastResult = { id: ev.id, s, md };
}
$('rsAgain').onclick = () => { if (olympic) olympic.pop(); start(curIdx); };
$('rsNext').onclick = () => { if (olympic) { if (curIdx < EVENTS.length - 1) intro(curIdx + 1); else medallero(olympic); } else { buildMenu(); show('menu'); } };
$('bAll').onclick = () => { Snd.init(); olympic = []; intro(0); };
$('bMed').onclick = () => medallero(null);
$('mdBack').onclick = () => { olympic = null; buildMenu(); show('menu'); };
function medallero(list) {
  const rows = EVENTS.map(ev => { const o = list ? list.find(r => r.id === ev.id) : null, s = o ? o.s : bestOf(ev.id); return { ev, s, md: medalOf(ev, s) }; });
  const c = [0, 0, 0]; rows.forEach(r => { if (r.md >= 0) c[r.md]++; });
  $('mdT').textContent = list ? '¡Medallero de tu Olimpiada!' : 'Medallero de récords';
  $('mdPod').innerHTML = [1, 0, 2].map(k => `<div class="pod p${k}"><div class="pm">${MEDAL[k]}</div><div class="pc">${c[k]}</div><div class="pb">${k + 1}º</div></div>`).join('');
  $('mdTab').innerHTML = rows.map(r => `<div class="row ${r.md >= 0 ? MCLS[r.md] : ''}"><span class="ic">${r.ev.icon}</span><span class="nm">${r.ev.name}</span><span class="sc">${r.s == null ? '—' : r.ev.fmt(r.s)}</span><span class="md">${r.md >= 0 ? MEDAL[r.md] : '·'}</span></div>`).join('');
  if (list) { Snd.win(3); for (let i = 0; i < 6; i++) setTimeout(() => confetti(rnd(60, 340), H * 0.3, 30, 420), i * 250); }
  show('medals');
}
// entrada
const AIM3D = { bolos: 1, arco: 1, dango: 1 };
function pt(ev) { const r = cv.getBoundingClientRect(); if (R3D && cur && AIM3D[cur.ev.id]) { const q = R3D.unproj(ev.clientX - r.left, ev.clientY - r.top); if (q) return q; } return [(ev.clientX - r.left) / SC, (ev.clientY - r.top) / SC]; }
cv.addEventListener('pointerdown', ev => { Snd.init(); if (cur && cur.down && !BOT) cur.down(...pt(ev)); });
cv.addEventListener('pointermove', ev => { if (cur && cur.move && !BOT) cur.move(...pt(ev)); });
addEventListener('pointerup', ev => { if (cur && cur.up && !BOT) cur.up(...pt(ev)); });
addEventListener('pointercancel', ev => { if (cur && cur.up) cur.up(...pt(ev)); });
// fondo del menú: estadio pastel con anillos, focos y mochi saltarín
let menuT = 0;
function drawMenuBg(dt) {
  menuT += dt;
  layer('menu', () => { sky('#ffc9e0', '#ffeedd', '#ffe0ec'); sun(200, H * 0.3, 46);
    hills(H * 0.62, 50, 'rgba(200,170,240,.55)', 61, 90); stands(H * 0.66, H * 0.8, 62);
    g.fillStyle = vgrad(H * 0.8, H, ['#9fe6ae', '#6ccb8a']); g.fillRect(0, H * 0.8, W, H * 0.2);
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 3; for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(200, H * 0.92, 160 + k * 40, 40 + k * 14, 0, Math.PI * 1.02, Math.PI * 1.98); g.stroke(); } grain(0.07); });
  g.save(); g.globalAlpha = 0.18; g.translate(200, H * 0.3); g.rotate(menuT * 0.1); g.fillStyle = '#fff'; for (let i = 0; i < 12; i++) { g.rotate(Math.PI / 6); g.beginPath(); g.moveTo(0, 0); g.lineTo(-40, -H); g.lineTo(40, -H); g.fill(); } g.restore();
  for (let i = 0; i < 5; i++) cloud((i * 110 + menuT * 12) % 500 - 50, 60 + i * 50, 20, 0.8);
  if (Math.random() < 0.1) parts.push({ x: rnd(0, W), y: -10, vx: rnd(-20, 20), vy: rnd(40, 90), life: 6, max: 6, sz: rnd(4, 7), col: CONF[Math.floor(rnd(0, 5))], conf: 1, gr: 10, rot: rnd(0, 6), vr: rnd(-5, 5) });
  const b = Math.abs(Math.sin(menuT * 3)); shadow(200, H - 46, 36, 0.3); drawMochi(200, H - 46 - b * 40, 70, { sx: 1 + (1 - b) * 0.15, sy: 1 - (1 - b) * 0.15 + b * 0.05, face: 'happy', armsUp: b > 0.5, band: true });
  vignette();
}
function drawIris(dt) { if (iris <= 0) return; iris = Math.max(0, iris - dt * 2.2); const k = ease(1 - iris), r = k * Math.hypot(W, H);
  g.save(); g.fillStyle = '#17121e'; g.beginPath(); g.rect(0, 0, W, H); g.arc(200, H / 2, Math.max(0.1, r), 0, Math.PI * 2, true); g.fill('evenodd'); g.restore(); }
let R3D = null, lastShake = 0;
function frame(now) {
  const rawDt = (now - last) / 1000, dt = Math.min(0.033, rawDt) * SLOW; last = now; T += dt;
  if (!R3D && window.R3D && !/(^|&|\?)2d=1/.test(location.search)) { R3D = window.R3D; document.body.classList.add('r3d'); }
  if (shake > lastShake + 3 && navigator.vibrate && !BOT) try { navigator.vibrate(Math.min(30, shake * 3)); } catch (e) {} lastShake = shake;
  if (R3D) { const n = FF ? clamp(Math.round(rawDt / 0.0333), 1, 20) : 1, sd = FF ? 0.0333 : dt;
    for (let k = 0; k < n && !(cur && cur.done); k++) { if (cur && BOT && cur.bot) cur.bot(sd); if (cur) cur.update(sd); updFx(sd); if (FF && k) { iris = Math.max(0, iris - sd * 2.2); T += sd; } }
    const bg3 = cur || (($('res').classList.contains('on') && window.__lastEv) || ($('intro').classList.contains('on') && preview) || null); try { R3D.frame(bg3, FF ? n * sd : dt, T, H, shake); } catch (err) { console.error(err); }
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.setTransform(DPR * SC, 0, 0, DPR * SC, 0, 0);
    if (cur) { FXP = 1; HUD[cur.ev.id](cur); drawFx(); FXP = null; if (flash > 0) { g.fillStyle = `rgba(255,250,235,${flash * 0.45})`; g.fillRect(0, 0, W, H); } drawIris(dt); if (cur && cur.done) finish(); }
    else { menuFx(dt); updFx(dt); drawFx(); }
    requestAnimationFrame(frame); return; }
  g.setTransform(DPR * SC, 0, 0, DPR * SC, 0, 0);
  if (cur) { if (BOT && cur.bot) cur.bot(dt); cur.update(dt); updFx(dt); g.save(); if (shake) g.translate(rnd(-shake, shake) * 0.5, rnd(-shake, shake) * 0.5); cur.draw(); drawFx(); g.restore(); if (flash > 0) { g.fillStyle = `rgba(255,255,255,${flash * 0.5})`; g.fillRect(0, 0, W, H); } drawIris(dt); if (cur && cur.done) finish(); }
  else { drawMenuBg(dt); updFx(dt); drawFx(); }
  requestAnimationFrame(frame);
}
buildMenu();
document.fonts && document.fonts.load('700 20px Fredoka').then(() => { for (const k in LAYERS) delete LAYERS[k]; }).catch(() => {});
requestAnimationFrame(frame);
window.MO = { EVENTS, start, intro, medallero, get cur() { return cur; }, get r3d() { return R3D; } };
