'use strict';
// ===== Mochi Olimpiadas — núcleo =====
const cv = document.getElementById('c'), g = cv.getContext('2d');
const BOT = /bot=1/.test(location.search);
let W = 400, H = 700, SC = 1, DPR = 1;
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  const cw = innerWidth, ch = innerHeight; SC = cw / 400; W = 400; H = Math.max(600, ch / SC);
  if (H * SC > ch) { SC = ch / H; W = cw / SC; }
  cv.width = cw * DPR; cv.height = ch * DPR; cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
}
addEventListener('resize', resize); resize();
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, k) => a + (b - a) * k, rnd = (a, b) => a + Math.random() * (b - a);
const mix = (a, b, k) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * k));
const rgbs = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const PINK = [255, 158, 199], LILAC = [185, 161, 245], MOCHI = [255, 196, 220];
let T = 0;

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
};

// ===== Partículas, textos, sacudida =====
let parts = [], pops = [], shake = 0;
function burst(x, y, n, col, sp = 200, life = 0.7, sz = 5) { for (let i = 0; i < n; i++) { const a = rnd(0, 6.283), v = rnd(0.3, 1) * sp; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * 0.3, life, max: life, sz: rnd(0.5, 1) * sz, col, gr: 500 }); } }
function stars(x, y, n = 8) { for (let i = 0; i < n; i++) { const a = rnd(0, 6.283), v = rnd(80, 220); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.8, max: 0.8, sz: rnd(5, 9), col: [255, 225, 120], star: 1, gr: 100 }); } }
function pop(x, y, txt, col = '#f27bb2', sz = 26) { pops.push({ x, y, txt, col, sz, life: 1.1 }); }
function updFx(dt) {
  for (const p of parts) { p.life -= dt; p.vy += p.gr * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  parts = parts.filter(p => p.life > 0); for (const p of pops) { p.life -= dt; p.y -= 40 * dt; } pops = pops.filter(p => p.life > 0); shake = Math.max(0, shake - dt * 30);
}
function star5(x, y, r) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); }
function drawFx() {
  for (const p of parts) { g.globalAlpha = clamp(p.life / p.max, 0, 1); g.fillStyle = rgbs(p.col); if (p.star) { star5(p.x, p.y, p.sz); g.fill(); } else { g.beginPath(); g.arc(p.x, p.y, p.sz, 0, 7); g.fill(); } }
  g.globalAlpha = 1;
  for (const p of pops) { g.globalAlpha = clamp(p.life * 2, 0, 1); txt(p.txt, p.x, p.y, p.sz, p.col); } g.globalAlpha = 1;
}
function txt(s, x, y, sz = 24, col = '#fff', align = 'center', outline = '#e58bb5') {
  g.font = `700 ${sz}px Fredoka, ui-rounded, sans-serif`; g.textAlign = align; g.textBaseline = 'middle';
  g.lineJoin = 'round'; g.lineWidth = sz * 0.22; g.strokeStyle = outline; g.strokeText(s, x, y); g.fillStyle = col; g.fillText(s, x, y);
}
function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// ===== El mochi (misma silueta, brillo, pies, ojos y coloretes que en Mochi) =====
function drawMochi(x, y, size, m = {}) {
  const col = m.col || MOCHI, light = mix(col, [255, 255, 255], 0.65), dark = mix(col, [170, 70, 150], 0.2), deep = mix(col, [90, 30, 100], 0.45);
  const w = size * 1.12, h = size * 0.95 * 0.86;
  g.save(); g.translate(x, y); g.rotate(m.rot || 0); g.scale(m.sx || 1, m.sy || 1); g.globalAlpha = m.alpha == null ? 1 : m.alpha;
  const body = () => { g.beginPath(); g.moveTo(0, -h); g.bezierCurveTo(w * 0.5, -h, w * 0.5, -h * 0.62, w * 0.5, -h * 0.3); g.bezierCurveTo(w * 0.5, -h * 0.02, w * 0.3, -h * 0.02, 0, -h * 0.03); g.bezierCurveTo(-w * 0.3, -h * 0.02, -w * 0.5, -h * 0.02, -w * 0.5, -h * 0.3); g.bezierCurveTo(-w * 0.5, -h * 0.62, -w * 0.5, -h, 0, -h); g.closePath(); };
  // orejitas de gato (personaje por defecto con un toque)
  g.fillStyle = rgbs(dark);
  const fl = m.foot || 0;
  g.beginPath(); g.ellipse(-w * 0.2, -h * 0.05 - Math.max(0, fl) * h * 0.08, w * 0.15, h * 0.085, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(w * 0.2, -h * 0.05 - Math.max(0, -fl) * h * 0.08, w * 0.15, h * 0.085, 0, 0, 7); g.fill();
  body(); const bg = g.createRadialGradient(-w * 0.15, -h * 0.72, w * 0.05, 0, -h * 0.45, h * 0.75);
  bg.addColorStop(0, rgbs(light)); bg.addColorStop(0.45, rgbs(col)); bg.addColorStop(1, rgbs(dark)); g.fillStyle = bg; g.fill();
  g.save(); body(); g.clip();
  const ig = g.createRadialGradient(w * 0.05, -h * 0.12, 0, w * 0.05, -h * 0.12, w * 0.45); ig.addColorStop(0, rgbs(light, 0.55)); ig.addColorStop(1, rgbs(light, 0));
  g.fillStyle = ig; g.fillRect(-w, -h, w * 2, h); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = w * 0.05; g.beginPath(); g.arc(0, -h * 0.45, w * 0.47, -0.5, 0.6); g.stroke(); g.restore();
  body(); g.lineWidth = Math.max(1.5, w * 0.025); g.strokeStyle = rgbs(deep, 0.5); g.stroke();
  // brazos
  g.fillStyle = rgbs(mix(col, light, 0.25), 0.95); g.strokeStyle = rgbs(deep, 0.25); g.lineWidth = Math.max(1, w * 0.012);
  if (m.armsUp) { for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * w * 0.43, -h * 0.62, w * 0.075, h * 0.11, s * 0.45, 0, 7); g.fill(); g.stroke(); } }
  else { for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * w * 0.33, -h * 0.2, w * 0.075, h * 0.05, -s * 0.9, 0, 7); g.fill(); g.stroke(); } }
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.ellipse(-w * 0.23, -h * 0.76, w * 0.1, w * 0.045, -0.75, 0, 7); g.fill();
  g.beginPath(); g.arc(-w * 0.33, -h * 0.62, w * 0.025, 0, 7); g.fill();
  // cara
  const fy = -h * 0.52, ex = w * 0.17, erx = w * 0.085, ery = w * 0.105, f = m.face || 'idle';
  g.lineCap = 'round';
  for (const sd of [-1, 1]) {
    const cx = sd * ex + (m.lookX || 0) * w * 0.03, cy = fy;
    if (f === 'happy') { g.strokeStyle = '#3d2348'; g.lineWidth = w * 0.03; g.beginPath(); g.arc(cx, cy + ery * 0.2, erx * 0.8, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
    else if (f === 'squish') { g.strokeStyle = '#3d2348'; g.lineWidth = w * 0.03; g.beginPath(); g.moveTo(cx - sd * erx, cy - ery * 0.6); g.lineTo(cx + sd * erx * 0.6, cy); g.lineTo(cx - sd * erx, cy + ery * 0.6); g.stroke(); }
    else if (f === 'dizzy') { g.strokeStyle = '#3d2348'; g.lineWidth = w * 0.025; g.beginPath(); for (let a = 0; a < 12; a += 0.4) { const r = a * erx * 0.08; g.lineTo(cx + Math.cos(a + T * 8) * r, cy + Math.sin(a + T * 8) * r); } g.stroke(); }
    else {
      const sc = f === 'wow' ? 1.3 : 1, ry = ery * sc; const eg = g.createLinearGradient(0, cy - ry, 0, cy + ry);
      eg.addColorStop(0, '#24142e'); eg.addColorStop(0.6, '#3a2246'); eg.addColorStop(1, '#7a4f9a'); g.fillStyle = eg; g.beginPath(); g.ellipse(cx, cy, erx * sc, ry, 0, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx - erx * 0.3, cy - ry * 0.38, erx * 0.38, ry * 0.32, -0.3, 0, 7); g.fill(); g.beginPath(); g.arc(cx + erx * 0.35, cy + ry * 0.38, erx * 0.16, 0, 7); g.fill();
    }
  }
  g.fillStyle = 'rgba(255,110,150,0.42)'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * w * 0.3, fy + h * 0.1, w * 0.07, w * 0.04, 0, 0, 7); g.fill(); }
  const my = fy + h * 0.1; g.strokeStyle = '#3d2348'; g.lineWidth = w * 0.025;
  if (f === 'wow' || f === 'squish') { g.fillStyle = '#c0436f'; g.beginPath(); g.ellipse(0, my + h * 0.03, w * 0.05, w * 0.06, 0, 0, 7); g.fill(); }
  else { g.beginPath(); g.moveTo(-w * 0.06, my); g.quadraticCurveTo(-w * 0.03, my + w * 0.05, 0, my); g.quadraticCurveTo(w * 0.03, my + w * 0.05, w * 0.06, my); g.stroke(); }
  if (m.band) { g.fillStyle = '#ff6fa8'; g.fillRect(-w * 0.48, -h * 0.82, w * 0.96, h * 0.09); g.beginPath(); g.moveTo(w * 0.42, -h * 0.78); g.lineTo(w * 0.62, -h * 0.9); g.lineTo(w * 0.6, -h * 0.7); g.fill(); }
  g.restore();
}
// muelle de squash & stretch
function spring(o, dt, k = 180, d = 10) { o.vs = (o.vs || 0) + ((1 - o.s) * k - o.vs * d) * dt; o.s += o.vs * dt; return o.s; }
function shadow(x, y, r, a = 0.18) { g.fillStyle = `rgba(150,80,140,${a})`; g.beginPath(); g.ellipse(x, y, r, r * 0.3, 0, 0, 7); g.fill(); }
function sky(top = '#ffd9e8', bot = '#ffe9d6') { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
function cloud(x, y, s) { g.fillStyle = 'rgba(255,255,255,.8)'; for (const [a, b, r] of [[0, 0, 1], [0.9, 0.2, 0.75], [-0.9, 0.25, 0.7]]) { g.beginPath(); g.arc(x + a * s, y + b * s, r * s, 0, 7); g.fill(); } }

// ===================== PRUEBAS =====================
const EVENTS = [];
// ---------- 1) Bolos Mochi ----------
EVENTS.push({ id: 'bolos', name: 'Bolos Mochi', icon: '🎳', med: [26, 19, 12], unit: 'bolos', fmt: s => s + ' bolos',
  how: 'Arrastra hacia atrás desde el mochi para apuntar y cargar fuerza. ¡Suelta y que se aplaste contra los bolos! 3 tiradas.',
  create() {
    const L = 70, R = 330;
    const e = { throws: 0, score: 0, state: 'aim', m: null, pins: [], aim: null, timer: 0, sq: { s: 1 }, msg: '' };
    e.reset = () => {
      e.pins = []; const top = 150; let k = 0;
      for (let r = 0; r < 4; r++) for (let c = 0; c <= r; c++) e.pins.push({ x: 200 + (c - r / 2) * 34, y: top + (3 - r) * 30, vx: 0, vy: 0, down: false, rot: 0, vr: 0, id: k++ });
      e.m = { x: 200, y: H - 110, vx: 0, vy: 0, r: 22, spin: 0, roll: false }; e.state = 'aim'; e.knock = 0; e.timer = 0; e.firstHit = false;
    };
    e.reset();
    e.down = (x, y) => { if (e.state === 'aim' && Math.hypot(x - e.m.x, y - e.m.y) < 90) { e.aim = { x, y }; Snd.tick(); } };
    e.move = (x, y) => { if (e.aim) { e.aim.x = x; e.aim.y = y; } };
    e.up = () => {
      if (!e.aim) return; let dx = e.m.x - e.aim.x, dy = e.m.y - e.aim.y; const len = Math.hypot(dx, dy); e.aim = null;
      if (len < 20 || dy > -10) return; const pw = clamp(len / 160, 0.25, 1); dx /= len; dy /= len;
      e.m.vx = dx * pw * 950; e.m.vy = dy * pw * 950; e.state = 'roll'; e.sq.vs = 6; Snd.swipe(); burst(e.m.x, e.m.y + 10, 8, [255, 255, 255], 120, 0.5, 4);
    };
    e.update = dt => {
      spring(e.sq, dt);
      if (e.state !== 'roll') return;
      const m = e.m; m.x += m.vx * dt; m.y += m.vy * dt; m.spin += Math.hypot(m.vx, m.vy) * dt / m.r; m.vx *= 1 - 0.25 * dt; m.vy *= 1 - 0.25 * dt;
      if (!m.gutter && !e.firstHit && (m.x < L + 10 || m.x > R - 10)) { m.gutter = true; m.vx = 0; m.x = m.x < 200 ? L - 14 : R + 14; pop(m.x < 200 ? 90 : 310, m.y, '¡Canal!', '#a374c4'); Snd.bad(); }
      if (e.firstHit && !m.gutter && (m.x < L + m.r || m.x > R - m.r)) { m.x = clamp(m.x, L + m.r, R - m.r); m.vx *= -0.5; }
      if (Math.random() < 0.5) parts.push({ x: m.x + rnd(-8, 8), y: m.y + 14, vx: 0, vy: 0, life: 0.3, max: 0.3, sz: 3, col: [255, 220, 240], gr: 0 });
      for (const p of e.pins) {
        if (!m.gutter) { const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy), md = m.r + 11;
          if (d < md && d > 0) { const nx = dx / d, ny = dy / d, rv = (m.vx - p.vx) * nx + (m.vy - p.vy) * ny;
            if (rv > 0) { const j = 2 * rv / (1 / 3 + 1); p.vx += j * nx; p.vy += j * ny; m.vx -= j * nx / 3; m.vy -= j * ny / 3; p.vr = rnd(-12, 12);
              if (!e.firstHit) { e.firstHit = true; e.sq.s = 0.55; e.sq.vs = 0; shake = 8; Snd.squish(); burst(m.x, m.y - 10, 18, PINK, 260, 0.8, 6); } else Snd.hit(); }
            p.x = m.x + nx * md; p.y = m.y + ny * md; } }
        for (const q of e.pins) { if (q.id <= p.id) continue; const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
          if (d < 22 && d > 0) { const nx = dx / d, ny = dy / d, rv = (p.vx - q.vx) * nx + (p.vy - q.vy) * ny;
            if (rv > 0) { p.vx -= rv * nx; p.vy -= rv * ny; q.vx += rv * nx; q.vy += rv * ny; q.vr = rnd(-12, 12); Snd.hit(); }
            const o = (22 - d) / 2; p.x -= nx * o; p.y -= ny * o; q.x += nx * o; q.y += ny * o; } }
      }
      for (const p of e.pins) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - 2 * dt; p.vy *= 1 - 2 * dt; p.rot += p.vr * dt; p.vr *= 1 - 2 * dt;
        if (!p.down && Math.hypot(p.vx, p.vy) > 40) { p.down = true; e.knock++; burst(p.x, p.y, 6, [255, 255, 255], 150, 0.5, 4); pop(p.x, p.y - 20, '+1', '#fff', 20); } }
      const moving = Math.hypot(m.vx, m.vy) > 25 && m.y > -40, pinsMoving = e.pins.some(p => Math.hypot(p.vx, p.vy) > 15);
      if (!moving && !pinsMoving) e.timer += dt; else e.timer = 0;
      if (m.y < -60 || e.timer > 0.6) {
        e.state = 'wait'; e.score += e.knock; e.throws++;
        if (e.knock === 10) { pop(200, 300, '¡PLENO!', '#ffd34d', 48); stars(200, 300, 24); Snd.win(3); } else if (e.knock) pop(200, 300, e.knock + ' bolos', '#f27bb2', 36); else pop(200, 300, '¡Ups!', '#a374c4', 36);
        setTimeout(() => { if (e.throws >= 3) e.done = true; else e.reset(); }, 1200);
      }
    };
    e.draw = () => {
      g.fillStyle = '#c7f0d8'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#b39ddb'; g.fillRect(L - 30, 0, R - L + 60, H);
      const wood = g.createLinearGradient(L, 0, R, 0); wood.addColorStop(0, '#ffe2b8'); wood.addColorStop(0.5, '#fff0d6'); wood.addColorStop(1, '#ffe2b8'); g.fillStyle = wood; g.fillRect(L, 0, R - L, H);
      g.strokeStyle = 'rgba(200,150,100,.25)'; g.lineWidth = 1; for (let x = L; x < R; x += 20) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      g.fillStyle = 'rgba(242,123,178,.6)'; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(200 + i * 26, H - 260); g.lineTo(200 + i * 26 - 7, H - 245); g.lineTo(200 + i * 26 + 7, H - 245); g.fill(); }
      for (const p of e.pins) { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.globalAlpha = p.down ? 0.75 : 1; shadow(2, 6, 12);
        g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 11, 0, 7); g.fill(); g.strokeStyle = '#e8c9e0'; g.lineWidth = 2; g.stroke();
        g.fillStyle = '#ff6fa8'; g.beginPath(); g.arc(0, 0, 6, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-2, -2, 2, 0, 7); g.fill(); g.restore(); }
      const m = e.m, sp = Math.hypot(m.vx, m.vy); shadow(m.x, m.y + 4, 22);
      const s = e.sq.s, wob = e.state === 'roll' ? Math.sin(m.spin) * 0.08 : 0;
      drawMochi(m.x, m.y + 12, 46, { sx: (2 - s) + wob, sy: s - wob, face: e.firstHit && e.state === 'roll' ? 'squish' : sp > 300 ? 'wow' : 'idle', rot: e.state === 'roll' ? Math.sin(m.spin * 0.5) * 0.2 : 0 });
      if (e.aim) { const dx = m.x - e.aim.x, dy = m.y - e.aim.y, len = Math.min(160, Math.hypot(dx, dy)), a = Math.atan2(dy, dx);
        g.strokeStyle = 'rgba(242,123,178,.9)'; g.lineWidth = 5; g.setLineDash([8, 8]); g.beginPath(); g.moveTo(m.x, m.y); g.lineTo(m.x + Math.cos(a) * len * 2.5, m.y + Math.sin(a) * len * 2.5); g.stroke(); g.setLineDash([]);
        rr(m.x - 40, m.y + 36, 80, 10, 5); g.fillStyle = 'rgba(255,255,255,.8)'; g.fill(); rr(m.x - 40, m.y + 36, 80 * len / 160, 10, 5); g.fillStyle = len > 140 ? '#ff6fa8' : '#b9a1f5'; g.fill(); }
      txt('Tirada ' + Math.min(3, e.throws + 1) + '/3', 70, 30, 20, '#fff', 'left'); txt(e.score + ' 🎳', W - 20, 30, 24, '#fff', 'right');
      if (e.state === 'aim' && !e.aim) txt('Arrastra hacia atrás ↓', 200, H - 40, 20, '#fff');
    };
    e.bot = dt => { if (e.state === 'aim' && !e.botT) { e.botT = 1; e.down(e.m.x, e.m.y); e.move(e.m.x + rnd(-6, 6), e.m.y + 170); setTimeout(() => { e.up(); e.botT = 0; }, 300); } };
    e.result = () => e.score; return e;
  } });
// ---------- 2) Salto con muelle ----------
EVENTS.push({ id: 'muelle', name: 'Salto con muelle', icon: '🌀', med: [10, 8, 5], unit: 'm', fmt: s => s.toFixed(2) + ' m',
  how: 'Mantén pulsado: el mochi se aplasta como un muelle. ¡Suelta justo cuando esté al máximo de tensión! 3 intentos, cuenta el mejor.',
  create() {
    const PX = 55;
    const e = { tries: 0, best: 0, state: 'ready', c: 0, cDir: 1, y: 0, vy: 0, cam: 0, sq: { s: 1 }, last: 0, maxH: 0, hold: false };
    const G = () => H - 120;
    e.down = () => { if (e.state === 'ready') { e.state = 'charge'; e.c = 0; e.cDir = 1; Snd.tick(); } };
    e.up = () => {
      if (e.state !== 'charge') return; const c = e.c, perfect = c > 0.93;
      const hm = 11 * Math.pow(c, 1.6) * (perfect ? 1.08 : 1); e.vy = -Math.sqrt(2 * 900 * hm * PX); e.state = 'fly'; e.maxH = 0;
      e.sq.s = 1.6; e.sq.vs = 0; Snd.boing(0.8 + c * 0.6); burst(200, G(), 14, [255, 255, 255], 220, 0.6, 5);
      if (perfect) { pop(200, G() - 120, '¡PERFECTO!', '#ffd34d', 40); stars(200, G() - 40, 14); }
    };
    e.update = dt => {
      spring(e.sq, dt, 140, 8);
      if (e.state === 'charge') { e.c += e.cDir * dt * 1.25; if (e.c > 1) { e.c = 1; e.cDir = -1; } if (e.c < 0) { e.c = 0; e.cDir = 1; } }
      if (e.state === 'fly') { e.vy += 900 * dt; e.y += e.vy * dt; e.maxH = Math.max(e.maxH, -e.y / PX);
        e.cam = lerp(e.cam, Math.min(0, e.y + 250), 0.15);
        if (Math.random() < 0.4) parts.push({ x: 200 + rnd(-10, 10), y: G() + e.y, vx: 0, vy: 0, life: 0.5, max: 0.5, sz: 4, col: LILAC, gr: 0 });
        if (e.y >= 0 && e.vy > 0) { e.y = 0; e.state = 'land'; e.sq.s = 0.5; e.sq.vs = 0; shake = 6; Snd.squish(); burst(200, G(), 16, PINK, 220, 0.6, 5);
          e.tries++; e.last = e.maxH; const rec = e.maxH > e.best; e.best = Math.max(e.best, e.maxH); pop(200, G() - 140, e.maxH.toFixed(2) + ' m' + (rec ? ' ⭐' : ''), '#f27bb2', 38);
          setTimeout(() => { if (e.tries >= 3) e.done = true; else { e.state = 'ready'; e.c = 0; } }, 1300); } }
      else e.cam = lerp(e.cam, 0, 0.1);
    };
    e.draw = () => {
      sky('#bfe3ff', '#ffe9d6'); g.save(); g.translate(0, -e.cam);
      for (let i = 0; i < 12; i++) cloud((i * 137) % 400, G() - 200 - i * 180, 26 + (i % 3) * 8);
      // regla de alturas
      for (let m = 1; m <= 12; m++) { const yy = G() - m * PX; g.fillStyle = m % 5 ? 'rgba(122,75,138,.25)' : 'rgba(242,123,178,.6)'; g.fillRect(300, yy, m % 5 ? 20 : 40, 3); txt(m + ' m', 360, yy, 14, '#fff', 'center', '#a374c4'); }
      if (e.best > 0) { const yy = G() - e.best * PX; g.strokeStyle = '#ffd34d'; g.lineWidth = 3; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(40, yy); g.lineTo(300, yy); g.stroke(); g.setLineDash([]); txt('récord', 60, yy - 12, 14, '#ffd34d', 'center', '#c48a1a'); }
      g.fillStyle = '#9be7a8'; g.fillRect(0, G(), W, 400); g.fillStyle = '#7fd08f'; g.fillRect(0, G(), W, 8);
      // plataforma muelle
      const comp = e.state === 'charge' ? e.c : 0, ph = 40 * (1 - comp * 0.7);
      g.strokeStyle = '#a374c4'; g.lineWidth = 5; g.beginPath(); for (let i = 0; i <= 8; i++) g.lineTo(200 + (i % 2 ? 18 : -18), G() - i * ph / 8); g.stroke();
      rr(160, G() - ph - 8, 80, 10, 5); g.fillStyle = '#ff9ec7'; g.fill();
      const my = e.state === 'fly' || e.state === 'land' ? G() + e.y - (e.state === 'land' ? 0 : 0) : G() - ph - 6;
      shadow(200, G() + 4, 26 * clamp(1 + e.y / 600, 0.3, 1));
      let sx, sy; if (e.state === 'charge') { sy = 1 - comp * 0.5; sx = 1 + comp * 0.45 + Math.sin(T * 50) * comp * 0.03; } else { sy = e.sq.s; sx = 2 - e.sq.s; if (e.state === 'fly') { const st = clamp(-e.vy / 1400, -0.3, 0.4); sy += st; sx -= st * 0.6; } }
      drawMochi(200, my, 70, { sx, sy, face: e.state === 'charge' ? (comp > 0.85 ? 'squish' : 'idle') : e.state === 'fly' ? (e.vy < 0 ? 'wow' : 'happy') : 'happy', armsUp: e.state === 'fly', band: true });
      g.restore();
      txt('Intento ' + Math.min(3, e.tries + 1) + '/3', 20, 30, 20, '#fff', 'left'); txt('Mejor: ' + e.best.toFixed(2) + ' m', W - 20, 30, 20, '#fff', 'right');
      if (e.state === 'fly') txt(e.maxH.toFixed(2) + ' m', 200, 80, 40, '#fff');
      if (e.state === 'charge' || e.state === 'ready') { const bx = 40, by = H - 300, bh = 200; rr(bx - 12, by, 24, bh, 12); g.fillStyle = 'rgba(255,255,255,.8)'; g.fill();
        g.fillStyle = 'rgba(255,211,77,.8)'; g.fillRect(bx - 12, by, 24, bh * 0.07); const fh = bh * e.c; rr(bx - 9, by + bh - fh, 18, fh, 9); g.fillStyle = e.c > 0.93 ? '#ffd34d' : '#ff9ec7'; g.fill(); }
      if (e.state === 'ready') txt('Mantén pulsado…', 200, H - 50, 22, '#fff');
    };
    e.bot = () => { if (e.state === 'ready') e.down(); if (e.state === 'charge' && e.cDir < 0 && e.c > 0.9) e.up(); };
    e.result = () => Math.round(e.best * 100) / 100; return e;
  } });
// ---------- 3) Lanzamiento de mochi ----------
EVENTS.push({ id: 'martillo', name: 'Lanzamiento de mochi', icon: '🔨', med: [80, 62, 45], unit: 'm', fmt: s => s.toFixed(1) + ' m',
  how: 'Mantén pulsado para girar cada vez más rápido. Suelta cuando el mochi pase por la flecha dorada (45°) para mandarlo lejísimos. 3 intentos.',
  create() {
    const R = 70, PXM = 10;
    const e = { tries: 0, best: 0, state: 'ready', a: Math.PI / 2, w: 0, b: null, cam: 0, sq: { s: 1 }, hold: false };
    const G = () => H - 140, PX = 110, PY = () => G() - 70;
    const throwAng = () => { const vx = -Math.sin(e.a), vy = Math.cos(e.a); return Math.atan2(-vy, vx) * 180 / Math.PI; };
    e.down = () => { if (e.state === 'ready') { e.state = 'spin'; e.hold = true; Snd.tick(); } };
    e.up = () => {
      if (e.state !== 'spin') return; e.hold = false;
      const v = R * e.w, bx = PX + Math.cos(e.a) * R, by = PY() + Math.sin(e.a) * R; const th = throwAng();
      e.b = { x: bx, y: by, vx: -Math.sin(e.a) * v, vy: Math.cos(e.a) * v, rot: 0, foul: th < 5 || th > 85 || e.w < 3, th };
      e.state = 'fly'; Snd.swipe(); Snd.boing(1.2); e.sq.s = 1.4; e.sq.vs = 0;
      pop(PX + 30, PY() - 110, Math.round(th) + '°', Math.abs(th - 45) < 6 ? '#ffd34d' : '#fff', 30);
      if (Math.abs(th - 45) < 4 && !e.b.foul) stars(bx, by, 12);
    };
    e.update = dt => {
      spring(e.sq, dt);
      if (e.state === 'spin') { e.w = Math.min(13, e.w + dt * 6); e.a += e.w * dt; if (Math.random() < e.w / 20) parts.push({ x: PX + Math.cos(e.a) * R, y: PY() + Math.sin(e.a) * R, vx: 0, vy: 0, life: 0.25, max: 0.25, sz: 5, col: PINK, gr: 0 }); if (Math.floor(e.a / 6.283) !== Math.floor((e.a - e.w * dt) / 6.283)) Snd.tone(300 + e.w * 40, 0.06, { vol: 0.05 }); }
      if (e.state === 'fly') { const b = e.b; b.vy += 900 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += 10 * dt; e.cam = Math.max(e.cam, b.x - 200);
        if (Math.random() < 0.6) parts.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.4, max: 0.4, sz: 4, col: [255, 255, 255], gr: 0 });
        if (b.y > G() - 2) { b.y = G() - 2; let d = (b.x - PX) / PXM; if (b.foul || d < 0) d = 0; e.state = 'land'; e.tries++; shake = 7; Snd.squish(); burst(b.x, G(), 18, [190, 150, 110], 240, 0.7, 5);
          b.sq = 0.4; const rec = d > e.best; e.best = Math.max(e.best, d); pop(b.x, G() - 100, d ? d.toFixed(1) + ' m' + (rec ? ' ⭐' : '') : '¡NULO!', d ? '#f27bb2' : '#a374c4', 38);
          setTimeout(() => { if (e.tries >= 3) e.done = true; else { e.state = 'ready'; e.w = 0; e.a = Math.PI / 2; e.b = null; e.cam = 0; } }, 1500); } }
      if (e.b && e.b.sq != null) e.b.sq = lerp(e.b.sq, 1, 0.08);
      if (e.state === 'ready') e.cam = lerp(e.cam, 0, 0.2);
    };
    e.draw = () => {
      sky('#ffe0f0', '#fff3e0'); g.save(); g.translate(-e.cam, 0); if (e.b && e.state !== 'ready') { }
      for (let i = 0; i < 14; i++) cloud(i * 160 - (e.cam * 0.5 % 160), 100 + (i % 3) * 40, 22);
      g.fillStyle = '#9be7a8'; g.fillRect(e.cam - 10, G(), W + 20, 300); g.fillStyle = '#7fd08f'; g.fillRect(e.cam - 10, G(), W + 20, 6);
      // sector y marcas
      for (let m = 10; m <= 110; m += 10) { const x = PX + m * PXM; g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(x - 1, G(), 3, 16); txt(m + ' m', x, G() + 32, 14, '#fff', 'center', '#5fb070'); }
      if (e.best > 0) { const x = PX + e.best * PXM; g.fillStyle = '#ffd34d'; g.fillRect(x - 2, G() - 40, 4, 40); g.beginPath(); g.moveTo(x, G() - 40); g.lineTo(x + 22, G() - 32); g.lineTo(x, G() - 24); g.fill(); }
      // jaula
      g.strokeStyle = 'rgba(122,75,138,.25)'; g.lineWidth = 2; g.beginPath(); g.arc(PX, G(), 95, Math.PI, Math.PI * 1.5); g.stroke();
      // flecha guía 45°
      if (e.state === 'spin' || e.state === 'ready') { const ga = -Math.PI * 0.75, gx = PX + Math.cos(ga) * (R + 16), gy = PY() + Math.sin(ga) * (R + 16);
        g.save(); g.translate(gx, gy); g.rotate(-Math.PI / 4); g.fillStyle = 'rgba(255,211,77,.9)'; g.beginPath(); g.moveTo(26, 0); g.lineTo(6, -12); g.lineTo(6, -5); g.lineTo(-14, -5); g.lineTo(-14, 5); g.lineTo(6, 5); g.lineTo(6, 12); g.fill(); g.restore(); }
      // lanzador (mochi lila)
      shadow(PX, G() + 3, 30); const sp = e.state === 'spin' ? e.w : 0;
      drawMochi(PX, G(), 70, { col: [205, 185, 255], sx: 1 + sp * 0.008, sy: 1 - sp * 0.008, rot: Math.sin(e.a) * sp * 0.012, face: sp > 10 ? 'squish' : 'idle', lookX: Math.cos(e.a), armsUp: e.state === 'spin', band: true });
      let bx, by; if (e.b) { bx = e.b.x; by = e.b.y; } else { bx = PX + Math.cos(e.a) * R; by = PY() + Math.sin(e.a) * R; }
      if (!e.b) { g.strokeStyle = '#a374c4'; g.lineWidth = 3; g.beginPath(); g.moveTo(PX, PY()); g.lineTo(bx, by); g.stroke(); }
      if (e.b) shadow(bx, G() + 2, 16 * clamp(1 - (G() - by) / 500, 0.3, 1));
      const st = sp * 0.025, sq = e.b && e.b.sq != null ? e.b.sq : 1;
      drawMochi(bx, by + 16 * sq, 34, { sx: (1 + st) * (2 - sq), sy: (1 - st * 0.5) * sq, rot: e.b ? e.b.rot : e.a + Math.PI / 2, face: e.state === 'land' ? 'dizzy' : sp > 8 || e.state === 'fly' ? 'wow' : 'idle' });
      g.restore();
      txt('Intento ' + Math.min(3, e.tries + 1) + '/3', 20, 30, 20, '#fff', 'left'); txt('Mejor: ' + e.best.toFixed(1) + ' m', W - 20, 30, 20, '#fff', 'right');
      if (e.state === 'fly' && e.b) txt(Math.max(0, (e.b.x - PX) / PXM).toFixed(1) + ' m', 200, 80, 40, '#fff');
      if (e.state === 'spin') { rr(100, H - 60, 200, 14, 7); g.fillStyle = 'rgba(255,255,255,.8)'; g.fill(); rr(100, H - 60, 200 * e.w / 13, 14, 7); g.fillStyle = '#ff6fa8'; g.fill(); txt('¡Suelta en la flecha!', 200, H - 85, 18, '#fff'); }
      if (e.state === 'ready') txt('Mantén pulsado para girar', 200, H - 60, 20, '#fff');
    };
    e.bot = () => { if (e.state === 'ready') e.down(); if (e.state === 'spin' && e.w > 12.5) { const th = throwAng(); if (Math.abs(th - 45) < 7 + (e.botN = (e.botN || 0) + 1) / 200) { e.botN = 0; e.up(); } } };
    e.result = () => Math.round(e.best * 10) / 10; return e;
  } });
// ---------- 4) Halterofilia de dango ----------
EVENTS.push({ id: 'dango', name: 'Halterofilia de dango', icon: '🍡', med: [14, 10, 6], unit: 'dangos', fmt: s => s + ' dangos',
  how: 'El mochi sujeta un palillo con dangos que no para de crecer. Desliza el dedo a izquierda y derecha para mantenerlo en equilibrio 30 segundos.',
  create() {
    const GR = 170, DC = [[255, 182, 206], [255, 255, 255], [178, 230, 160], [255, 220, 140], [200, 180, 255]];
    const e = { th: rnd(-0.05, 0.05), om: 0, x: 200, vx: 0, fx: 200, n: 3, t: 0, add: 0, state: 'play', sq: { s: 1 }, fall: [], score: 0, ax: 0 };
    const G = () => H - 110, L = () => 60 + e.n * 10;
    e.down = (x) => { e.fx = x; }; e.move = (x) => { e.fx = x; }; e.up = () => {};
    e.update = dt => {
      spring(e.sq, dt);
      if (e.state === 'play') {
        e.t += dt; e.add += dt;
        const ax = (clamp(e.fx, 50, 350) - e.x) * 60 - e.vx * 12; e.ax = ax; e.vx += ax * dt; e.x += e.vx * dt;
        if (e.x < 40) { e.x = 40; e.vx = 0; } if (e.x > 360) { e.x = 360; e.vx = 0; }
        const noise = rnd(-1, 1) * 3;
        const al = (GR * Math.sin(e.th) - ax * Math.cos(e.th)) / L() + noise * (0.2 + e.n * 0.03);
        e.om += al * dt; e.om *= 1 - 0.3 * dt; e.th += e.om * dt;
        if (e.add > 2) { e.add = 0; e.n++; e.om += rnd(-0.25, 0.25); e.sq.s = 0.75; e.sq.vs = 0; Snd.squish(); pop(e.x, G() - 120 - L(), '+1 🍡', '#f27bb2', 24);
          const tx = e.x + Math.sin(e.th) * (L() + 30), ty = G() - 70 - Math.cos(e.th) * (L() + 30); burst(tx, ty, 8, DC[e.n % 5], 150, 0.5, 4); }
        if (Math.abs(e.th) > 1.0) { e.state = 'fall'; e.score = Math.max(0, e.n - 2); shake = 10; Snd.bad(); Snd.splash(); pop(200, 200, '¡Se cayó!', '#a374c4', 40);
          for (let i = 0; i < e.n; i++) { const d = 30 + i * 15; e.fall.push({ x: e.x + Math.sin(e.th) * d, y: G() - 70 - Math.cos(e.th) * d, vx: Math.cos(e.th) * e.om * d + rnd(-60, 60), vy: rnd(-200, -50), c: DC[i % 5], r: 0 }); }
          setTimeout(() => e.done = true, 1600); }
        else if (e.t >= 30) { e.state = 'win'; e.score = e.n; Snd.win(3); stars(e.x, G() - 150, 24); pop(200, 200, '¡Aguantaste!', '#ffd34d', 42); setTimeout(() => e.done = true, 1600); }
      }
      for (const f of e.fall) { f.vy += 900 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.r += f.vx * dt / 14; if (f.y > G() - 14) { f.y = G() - 14; f.vy *= -0.4; f.vx *= 0.8; } }
    };
    e.draw = () => {
      sky('#ffe9f4', '#fff1dc'); g.fillStyle = '#ffd6a8'; g.fillRect(0, G(), W, 300); g.fillStyle = '#f1b98a'; g.fillRect(0, G(), W, 6);
      // tarima
      rr(20, G() - 8, W - 40, 14, 7); g.fillStyle = '#d7b6f2'; g.fill();
      // farolillos
      for (let i = 0; i < 5; i++) { const x = 40 + i * 80, y = 70 + Math.sin(T * 2 + i) * 4; g.fillStyle = i % 2 ? '#ff9ec7' : '#ffd34d'; g.beginPath(); g.ellipse(x, y, 14, 18, 0, 0, 7); g.fill(); }
      const tilt = e.state === 'play' ? e.th : e.th;
      shadow(e.x, G() + 2, 30);
      const lean = clamp(-e.vx / 1500, -0.25, 0.25);
      drawMochi(e.x, G(), 74, { sx: 2 - e.sq.s, sy: e.sq.s, rot: lean, armsUp: true, face: e.state === 'fall' ? 'dizzy' : Math.abs(e.th) > 0.5 ? 'wow' : e.state === 'win' ? 'happy' : 'squish', lookX: Math.sin(e.th) * 2 });
      if (e.state === 'play' || e.state === 'win') {
        g.save(); g.translate(e.x, G() - 70); g.rotate(tilt);
        g.strokeStyle = '#d9b07a'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 10); g.lineTo(0, -L() - 45); g.stroke();
        for (let i = 0; i < e.n; i++) { const yy = -30 - i * 15, c = DC[i % 5]; const wob = Math.sin(T * 6 + i) * Math.abs(e.om) * 2;
          const gr = g.createRadialGradient(-4, yy - 5, 2, 0, yy, 15); gr.addColorStop(0, rgbs(mix(c, [255, 255, 255], 0.6))); gr.addColorStop(1, rgbs(c)); g.fillStyle = gr;
          g.beginPath(); g.ellipse(wob, yy, 15, 9, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(150,80,140,.25)'; g.lineWidth = 1.5; g.stroke(); }
        g.restore();
      }
      for (const f of e.fall) { g.fillStyle = rgbs(f.c); g.beginPath(); g.ellipse(f.x, f.y, 15, 10, f.r, 0, 7); g.fill(); }
      // indicador de equilibrio
      rr(100, 110, 200, 14, 7); g.fillStyle = 'rgba(255,255,255,.8)'; g.fill(); g.fillStyle = 'rgba(155,231,168,.9)'; g.fillRect(170, 110, 60, 14);
      g.fillStyle = Math.abs(e.th) > 0.6 ? '#ff6fa8' : '#a374c4'; g.beginPath(); g.arc(200 + clamp(e.th, -1, 1) * 100, 117, 9, 0, 7); g.fill();
      txt('🍡 ' + e.n, 20, 30, 24, '#fff', 'left'); txt(Math.max(0, 30 - e.t).toFixed(1) + ' s', W - 20, 30, 24, '#fff', 'right');
      if (e.t < 3) txt('← Desliza para equilibrar →', 200, H - 40, 18, '#fff');
    };
    e.bot = () => { if (e.state !== 'play') return; const Lp = L(), ref = clamp(-0.003 * (e.x - 200) - 0.004 * e.vx, -0.2, 0.2), er = e.th - ref; const a = (GR * Math.sin(e.th) + Lp * (6 * er + 3.5 * e.om)) / Math.cos(e.th); e.fx = e.x + (a + e.vx * 12) / 60; };
    e.result = () => e.score; return e;
  } });
// ---------- 5) Tiro con arco de palillos ----------
EVENTS.push({ id: 'arco', name: 'Tiro con arco de palillos', icon: '🥢', med: [50, 35, 20], unit: 'puntos', fmt: s => s + ' puntos',
  how: 'Arrastra hacia atrás para tensar el arco y apuntar. Suelta para disparar el palillo a las dianas que se mueven. 8 palillos.',
  create() {
    const SPD = 1150;
    const e = { left: 8, score: 0, aim: null, arrows: [], state: 'play', sq: { s: 1 }, t: 0 };
    e.tg = [0, 1, 2].map(i => ({ y: 150 + i * 105, A: 120 - i * 10, w: 0.9 + i * 0.45, ph: i * 2, r: 36 - i * 4, stuck: [], hitT: 0 }));
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
        for (let s = 0; s < steps && a.fly; s++) { a.x += a.vx * dt / steps; a.y += a.vy * dt / steps;
          for (const t of e.tg) { const cx = tx(t, e.t), d = Math.hypot(a.x - cx, a.y - t.y);
            if (d < t.r) { a.fly = false; const k = d / t.r, pts = k < 0.2 ? 10 : k < 0.45 ? 8 : k < 0.7 ? 5 : 3; e.score += pts; t.stuck.push({ dx: a.x - cx, dy: a.y - t.y, ang: Math.atan2(a.vy, a.vx) }); a.dead = true; t.hitT = 0.3;
              pop(a.x, a.y - 30, pts === 10 ? '¡DIANA! 10' : '+' + pts, pts === 10 ? '#ffd34d' : '#fff', pts === 10 ? 32 : 24); burst(a.x, a.y, pts === 10 ? 20 : 10, pts === 10 ? [255, 211, 77] : PINK, 220, 0.6, 5); if (pts === 10) { stars(a.x, a.y, 10); Snd.win(1); shake = 5; } else Snd.hit(); break; } } }
        if (a.y < -40 || a.x < -40 || a.x > W + 40) { a.fly = false; a.dead = true; pop(clamp(a.x, 40, 360), 60, '¡Fallo!', '#a374c4', 22); } }
      e.arrows = e.arrows.filter(a => !a.dead); e.flying = e.arrows.some(a => a.fly);
      if (e.left === 0 && !e.flying && e.state === 'play') { e.state = 'end'; setTimeout(() => e.done = true, 1000); }
    };
    e.draw = () => {
      sky('#d9f2ff', '#e9ffe6'); g.fillStyle = '#c8efc0'; g.fillRect(0, H - 170, W, 170);
      for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(160,220,150,.7)'; g.beginPath(); g.arc(i * 80, H - 170, 50, Math.PI, 0); g.fill(); }
      for (const t of e.tg) { const x = tx(t, e.t), s = 1 + t.hitT * 0.6;
        g.strokeStyle = 'rgba(122,75,138,.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(200 - t.A - t.r, t.y); g.lineTo(200 + t.A + t.r, t.y); g.stroke();
        g.save(); g.translate(x, t.y); g.scale(s, 2 - s);
        [[1, '#fff'], [0.8, '#ff9ec7'], [0.55, '#fff'], [0.35, '#b9a1f5'], [0.2, '#ffd34d']].forEach(([k, c]) => { g.fillStyle = c; g.beginPath(); g.arc(0, 0, t.r * k, 0, 7); g.fill(); });
        g.strokeStyle = '#e58bb5'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, t.r, 0, 7); g.stroke();
        for (const st of t.stuck) { g.save(); g.translate(st.dx, st.dy); g.rotate(st.ang); g.fillStyle = '#c99a5f'; g.fillRect(4, -2, 26, 4); g.restore(); }
        g.restore(); }
      for (const a of e.arrows) { g.save(); g.translate(a.x, a.y); g.rotate(Math.atan2(a.vy, a.vx)); g.fillStyle = '#d9b07a'; g.fillRect(-30, -2, 34, 4); g.fillStyle = '#ff6fa8'; g.fillRect(-30, -3, 6, 6); g.restore(); }
      // tirador
      shadow(SX, SY() + 4, 28); let ang = -Math.PI / 2, pw = 0; if (e.aim) { const d = dirOf(); if (d) { ang = Math.atan2(d[1], d[0]); pw = d[2]; } }
      drawMochi(SX, SY(), 64, { sx: (2 - e.sq.s) + pw * 0.1, sy: e.sq.s - pw * 0.1, face: e.aim ? 'squish' : 'idle', lookX: Math.cos(ang) * 1.5, band: true });
      g.save(); g.translate(SX, SY() - 40); g.rotate(ang + Math.PI / 2);
      g.strokeStyle = '#a374c4'; g.lineWidth = 5; g.beginPath(); g.arc(0, 8, 34, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      const bx = Math.cos(Math.PI * 1.15) * 34, by = 8 + Math.sin(Math.PI * 1.15) * 34; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(bx, by); g.lineTo(0, by + 10 + pw * 22); g.lineTo(-bx, by); g.stroke();
      if (e.left > 0 && !e.flying) { g.fillStyle = '#d9b07a'; g.fillRect(-2, by - 30 + pw * 22, 4, 40); }
      g.restore();
      if (e.aim && pw > 0) { g.strokeStyle = 'rgba(255,111,168,.6)'; g.lineWidth = 3; g.setLineDash([6, 8]); g.beginPath(); g.moveTo(SX, SY() - 40); g.lineTo(SX + Math.cos(ang) * 700, SY() - 40 + Math.sin(ang) * 700); g.stroke(); g.setLineDash([]); }
      txt('🥢 ' + e.left, 20, 30, 24, '#fff', 'left'); txt(e.score + ' pts', W - 20, 30, 24, '#fff', 'right');
      if (e.left === 8 && !e.aim) txt('Arrastra hacia atrás y suelta', 200, H - 30, 18, '#fff');
    };
    e.bot = () => { if (e.flying || e.aim || e.left === 0 || e.botW > e.t) return; e.botW = e.t + 0.6;
      const t = e.tg[e.left % 3]; let tt = 0.3, px = 0; for (let i = 0; i < 6; i++) { px = tx(t, e.t + tt); tt = Math.hypot(px - SX, t.y - (SY() - 30)) / SPD; }
      const dx = px - SX, dy = t.y - (SY() - 30), l = Math.hypot(dx, dy); e.down(200, H - 200); e.move(200 - dx / l * 100, H - 200 - dy / l * 100); e.up(); };
    e.result = () => e.score; return e;
  } });
// ---------- 6) Charca de los Sapos ----------
EVENTS.push({ id: 'sapos', name: 'Charca de los Sapos', icon: '🐸', med: [30, 20, 10], unit: 'nenúfares', fmt: s => s + ' nenúfares',
  how: 'Toca a la izquierda, centro o derecha para saltar de nenúfar en nenúfar. ¡Cuidado con los sapos locos: sombrereros gruñones, sapos que se inflan, ojazos hipnóticos y lenguas larguísimas! 45 s, 3 vidas.',
  create() {
    const RH = 95, JT = 0.4, HATS = ['copa', 'fiesta', 'corona', 'copa'];
    const e = { rows: [], row: 0, max: 0, lives: 3, t: 0, cam: 0, state: 'play', m: { x: 200, y: 0, pad: null, jump: null, sq: { s: 1 }, inv: 0, sink: 0 }, hypno: 0 };
    const baseY = () => H - 130, RY = r => baseY() - r * RH;
    function makeRow(r) {
      if (r === 0) return { r, pads: [], shore: true };
      const n = r % 4 === 0 ? 3 : 2, dir = r % 2 ? 1 : -1, v = dir * Math.min(110, 35 + r * 2.2 + rnd(0, 20)), off = rnd(0, 480);
      const pads = []; for (let i = 0; i < n; i++) pads.push({ x: (off + i * 480 / n) % 480 - 40, r: 34 - Math.min(8, r * 0.15), ph: rnd(0, 6), frog: null });
      if (r >= 2 && Math.random() < 0.55) { const p = pads[Math.floor(rnd(0, n))]; const k = Math.random();
        p.frog = k < 0.34 ? { type: 'sombrero', hat: HATS[r % 4] } : k < 0.67 ? { type: 'inflador', ph: rnd(0, 6) } : { type: 'ojazos' }; }
      const row = { r, pads, v };
      if (r >= 4 && r % 3 === 1 && Math.random() < 0.8) row.tongue = { side: Math.random() < 0.5 ? -1 : 1, ph: rnd(0, 3), len: 0 };
      return row;
    }
    const rowAt = r => { while (e.rows.length <= r) e.rows.push(makeRow(e.rows.length)); return e.rows[r]; };
    for (let i = 0; i < 14; i++) rowAt(i);
    const inflated = f => f.type === 'inflador' && Math.sin(T * 2 + f.ph) > 0.2;
    const padAt = (row, x) => row.pads.find(p => Math.abs(p.x - x) < p.r + 6);
    e.m.y = RY(0);
    function jumpTo(r, dx, opts = {}) { const m = e.m; m.jump = { x0: m.x, y0: m.y, r, dx, t: 0, dur: opts.dur || JT, h: opts.h || 60, back: opts.back }; m.pad = null; m.sq.s = 0.6; m.sq.vs = 0; Snd.boing(opts.h > 80 ? 1.4 : 1); }
    function splash(msg) { const m = e.m; e.lives--; m.sink = 0.9; m.pad = null; shake = 6; Snd.splash(); burst(m.x, m.y, 20, [150, 210, 255], 260, 0.8, 5); pop(m.x, m.y - 60, msg, '#fff', 28);
      if (e.lives <= 0) { e.state = 'end'; setTimeout(() => e.done = true, 1300); } }
    e.down = (x) => {
      const m = e.m; if (e.state !== 'play' || m.jump || m.sink > 0) return; let dx = x < W / 3 ? -80 : x > W * 2 / 3 ? 80 : 0; if (e.hypno > 0) dx = -dx;
      e.lastFrom = { row: e.row, pad: m.pad }; jumpTo(e.row + 1, dx);
    };
    e.move = () => {}; e.up = () => {};
    e.update = dt => {
      const m = e.m; e.t += dt; e.hypno = Math.max(0, e.hypno - dt); m.inv = Math.max(0, m.inv - dt); spring(m.sq, dt);
      for (let r = Math.max(1, e.row - 3); r < e.row + 12; r++) { const row = rowAt(r);
        for (const p of row.pads) { p.x += row.v * dt; if (p.x > 440) p.x -= 480; if (p.x < -40) p.x += 480; }
        if (row.tongue) { const tg = row.tongue; tg.ph += dt; const c = tg.ph % 3.2; tg.len = c > 2.2 ? Math.sin((c - 2.2) / 1.0 * Math.PI) * 430 : 0; tg.warn = c > 1.6 && c <= 2.2; } }
      if (m.pad && !m.jump) { m.x += rowAt(e.row).v * dt; m.y = RY(e.row);
        if (m.x < 12 || m.x > 388) splash('¡Se fue a la deriva!');
        const tg = rowAt(e.row).tongue; if (tg && tg.len > 0 && m.inv <= 0) { const sx = tg.side < 0 ? -10 : 410; if (Math.abs(m.x - sx) < tg.len) { splash('¡LAMETAZO!'); Snd.croak(); } } }
      if (m.sink > 0) { m.sink -= dt; if (m.sink <= 0 && e.state === 'play') { const row = rowAt(e.row); let best = null; for (const p of row.pads) if (!p.frog && p.x > 40 && p.x < 360 && (!best || Math.abs(p.x - m.x) < Math.abs(best.x - m.x))) best = p;
          if (!best && e.row > 0) { best = row.pads.reduce((a, b) => Math.abs(b.x - 200) < Math.abs(a.x - 200) ? b : a); best.frog = null; best.x = clamp(best.x, 60, 340); }
          if (best) { m.pad = best; m.x = best.x; } else { m.pad = 'shore'; m.x = 200; } m.y = RY(e.row); m.inv = 1.2; m.sq.s = 1.4; m.sq.vs = 0; } }
      if (m.jump) { const j = m.jump; j.t += dt; const k = Math.min(1, j.t / j.dur);
        const row = rowAt(j.r), tx = j.back && j.back.x != null ? j.back.x : j.x0 + j.dx; m.x = lerp(j.x0, tx, k); m.y = lerp(j.y0, RY(j.r), k) - Math.sin(k * Math.PI) * j.h;
        if (k >= 1) { m.jump = null; m.y = RY(j.r); e.row = j.r; const p = j.r === 0 ? 'shore' : padAt(row, m.x);
          if (!p) splash('¡Chof!');
          else if (p === 'shore') { m.pad = 'shore'; m.sq.s = 0.6; }
          else { m.pad = p; m.x = lerp(m.x, p.x, 0.5); m.sq.s = 0.55; m.sq.vs = 0; Snd.squish(); burst(m.x, m.y, 8, [170, 230, 150], 140, 0.5, 4); const f = p.frog;
            if (f && f.type === 'sombrero' && e.lastFrom) { Snd.croak(); pop(m.x, m.y - 70, '¡Fuera de mi nenúfar!', '#7be08a', 20); f.angry = 0.6; const back = e.lastFrom; e.lastFrom = null;
              e.row = back.row; m.pad = null; m.jump = { x0: m.x, y0: m.y, r: back.row, dx: 0, t: 0, dur: 0.45, h: 70, back: back.pad && back.pad !== 'shore' ? back.pad : { x: m.x } }; }
            else if (f && f.type === 'inflador') { if (inflated(f)) { Snd.croak(); f.angry = 0.6; splash('¡PLOF! Sapo globo'); }
              else { pop(m.x, m.y - 70, '¡Supersalto! +2', '#ffd34d', 26); stars(m.x, m.y, 10); e.lastFrom = { row: e.row, pad: p }; setTimeout(() => { if (m.pad === p && e.state === 'play') jumpTo(e.row + 2, 0, { dur: 0.6, h: 130 }); }, 120); } }
            else if (f && f.type === 'ojazos') { e.hypno = 3; Snd.tone(500, 0.6, { type: 'sine', vol: 0.08, to: 900 }); pop(m.x, m.y - 70, '¡Hipnotizado! 🌀', '#b9a1f5', 24); }
            if (e.row > e.max) { e.max = e.row; } } } }
      e.cam = lerp(e.cam, m.y - (H - 230), 0.08);
      if (e.t >= 45 && e.state === 'play') { e.state = 'end'; Snd.win(2); pop(200, 200, '¡Tiempo!', '#ffd34d', 42); setTimeout(() => e.done = true, 1300); }
    };
    function frog(x, y, f, s = 1) {
      const sc = f.type === 'inflador' ? (inflated(f) ? 1.7 + Math.sin(T * 12) * 0.05 : 1) : 1, ang = f.angry > 0 ? Math.sin(T * 40) * 0.2 : 0; if (f.angry) f.angry -= 1 / 60;
      g.save(); g.translate(x, y); g.rotate(ang); g.scale(s * sc, s * (f.type === 'inflador' ? sc * 0.95 : 1));
      const gr = g.createRadialGradient(-6, -16, 3, 0, -8, 30); gr.addColorStop(0, '#c6f7a6'); gr.addColorStop(1, f.type === 'inflador' ? '#62c47a' : '#4fb36a'); g.fillStyle = gr;
      g.beginPath(); g.ellipse(0, -10, 24, 18, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(30,90,50,.4)'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#ffe9a8'; g.beginPath(); g.ellipse(0, -4, 14, 9, 0, 0, 7); g.fill();
      const big = f.type === 'ojazos' ? 2.1 : 1, er = 7 * big; const lx = clamp((e.m.x - x) / 200, -1, 1) * er * 0.4, ly = clamp((e.m.y - y) / 200, -1, 1) * er * 0.4;
      for (const sd of [-1, 1]) { g.fillStyle = '#5fc277'; g.beginPath(); g.arc(sd * 12 * (big > 1 ? 1.1 : 1), -24 - er * 0.3, er + 2, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(sd * 12 * (big > 1 ? 1.1 : 1), -24 - er * 0.3, er, 0, 7); g.fill();
        g.fillStyle = '#24142e'; g.beginPath(); g.arc(sd * 12 * (big > 1 ? 1.1 : 1) + lx, -24 - er * 0.3 + ly, er * (big > 1 ? 0.45 + 0.1 * Math.sin(T * 5) : 0.5), 0, 7); g.fill();
        if (big > 1) { g.strokeStyle = 'rgba(185,161,245,.9)'; g.lineWidth = 1.5; g.beginPath(); g.arc(sd * 13 + lx, -24 - er * 0.3 + ly, er * 0.75, T * 6, T * 6 + 4); g.stroke(); } }
      g.strokeStyle = '#2d6b3f'; g.lineWidth = 2; g.beginPath(); g.arc(0, -10, 8, 0.2, Math.PI - 0.2); g.stroke();
      if (f.type === 'sombrero') { g.save(); g.translate(0, -36); g.rotate(-0.15);
        if (f.hat === 'copa') { g.fillStyle = '#3d2348'; g.fillRect(-16, -2, 32, 5); g.fillRect(-10, -26, 20, 25); g.fillStyle = '#ff6fa8'; g.fillRect(-10, -8, 20, 4); }
        else if (f.hat === 'fiesta') { g.fillStyle = '#ffd34d'; g.beginPath(); g.moveTo(-11, 0); g.lineTo(0, -30); g.lineTo(11, 0); g.fill(); g.fillStyle = '#ff6fa8'; g.beginPath(); g.arc(0, -30, 4, 0, 7); g.fill(); }
        else { g.fillStyle = '#ffd34d'; g.beginPath(); g.moveTo(-13, 0); g.lineTo(-13, -14); g.lineTo(-6, -6); g.lineTo(0, -18); g.lineTo(6, -6); g.lineTo(13, -14); g.lineTo(13, 0); g.fill(); }
        g.restore(); g.strokeStyle = '#3d2348'; g.lineWidth = 2; g.beginPath(); g.moveTo(-10, -14); g.quadraticCurveTo(-4, -10, 0, -14); g.quadraticCurveTo(4, -10, 10, -14); g.stroke(); }
      if (f.type === 'inflador' && inflated(f)) { g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(-10, -20, 6, 3, -0.6, 0, 7); g.fill(); }
      g.restore();
    }
    e.draw = () => {
      const wg = g.createLinearGradient(0, 0, 0, H); wg.addColorStop(0, '#9fdcf0'); wg.addColorStop(1, '#bfeee0'); g.fillStyle = wg; g.fillRect(0, 0, W, H);
      g.save(); if (e.hypno > 0) { g.translate(200, H / 2); g.rotate(Math.sin(T * 3) * 0.04 * e.hypno); g.translate(-200, -H / 2); }
      g.translate(0, -e.cam);
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; for (let i = 0; i < 18; i++) { const y = Math.floor(e.cam / 60) * 60 + i * 60, x = (i * 97 + T * 15) % 440 - 20; g.beginPath(); g.arc(x, y, 14 + (i % 3) * 6, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
      const r0 = Math.max(0, e.row - 4), r1 = e.row + 10;
      for (let r = r0; r < r1; r++) { const row = rowAt(r), y = RY(r);
        if (row.shore) { g.fillStyle = '#ffe2b8'; g.fillRect(0, y - 30, W, 200); g.fillStyle = '#9be7a8'; g.fillRect(0, y - 40, W, 14); continue; }
        for (const p of row.pads) { g.save(); g.translate(p.x, y); g.scale(1, 0.55); g.fillStyle = 'rgba(40,120,110,.2)'; g.beginPath(); g.arc(3, 8, p.r, 0, 7); g.fill();
          g.fillStyle = '#7fd37a'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, p.r, 0.3 + p.ph * 0, 6.283 - 0.0); g.closePath(); g.fill(); g.fillStyle = '#9be694'; g.beginPath(); g.arc(-5, -5, p.r * 0.6, 0, 7); g.fill();
          g.fillStyle = '#5fb366'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, p.r, -0.25, 0.25); g.closePath(); g.fill(); g.restore();
          if (p.frog) frog(p.x, y + 4, p.frog); }
        if (row.tongue) { const tg = row.tongue, sx = tg.side < 0 ? -6 : 406; 
          if (tg.len > 0) { g.strokeStyle = '#ff6f91'; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); g.moveTo(sx, y - 14); g.quadraticCurveTo(sx - tg.side * tg.len / 2, y - 30 + Math.sin(T * 20) * 6, sx - tg.side * tg.len, y - 12); g.stroke(); g.fillStyle = '#ff4f7a'; g.beginPath(); g.arc(sx - tg.side * tg.len, y - 12, 9, 0, 7); g.fill(); }
          if (tg.warn) { g.fillStyle = 'rgba(255,90,140,' + (0.25 + 0.25 * Math.sin(T * 30)) + ')'; g.fillRect(0, y - 26, W, 24); }
          g.fillStyle = '#8a9a8f'; g.beginPath(); g.ellipse(sx, y + 4, 30, 16, 0, 0, 7); g.fill(); frog(sx - tg.side * 4, y - 2, { type: 'ojazos' }, 1.1); }
      }
      const m = e.m; if (m.sink > 0) { g.globalAlpha = clamp(m.sink, 0, 1); }
      if (!m.jump) shadow(m.x, m.y + 2, 18); else shadow(m.x, lerp(m.jump.y0, RY(m.jump.r), Math.min(1, m.jump.t / m.jump.dur)) + 2, 14);
      const air = m.jump ? Math.sin(Math.min(1, m.jump.t / m.jump.dur) * Math.PI) : 0;
      if (!(m.inv > 0 && Math.floor(T * 12) % 2)) drawMochi(m.x, m.y + (m.sink > 0 ? (0.9 - m.sink) * 30 : 0), 44, { sx: (2 - m.sq.s) - air * 0.15, sy: m.sq.s + air * 0.2, face: m.sink > 0 ? 'dizzy' : e.hypno > 0 ? 'dizzy' : m.jump ? 'wow' : 'happy', armsUp: !!m.jump });
      g.globalAlpha = 1; g.restore();
      txt('❤'.repeat(Math.max(0, e.lives)), 20, 30, 24, '#ff6fa8', 'left', '#fff'); txt(e.max + ' 🪷', 200, 30, 28, '#fff'); txt(Math.max(0, 45 - e.t).toFixed(0) + ' s', W - 20, 30, 24, '#fff', 'right');
      if (e.hypno > 0) txt('¡Controles al revés!', 200, 70, 20, '#b9a1f5', 'center', '#fff');
      if (e.t < 4) { g.globalAlpha = 0.5; txt('↖', 60, H - 50, 34); txt('↑', 200, H - 50, 34); txt('↗', 340, H - 50, 34); g.globalAlpha = 1; }
    };
    e.bot = () => { const m = e.m; if (m.jump || m.sink > 0 || e.state !== 'play' || (e.botW || 0) > e.t) return;
      const row = rowAt(e.row + 1); const opts = [0, -80, 80].sort(() => 0);
      for (const dx of opts) { const lx = m.x + dx, cur = m.pad && m.pad !== 'shore' ? rowAt(e.row).v * 0 : 0; if (lx < 30 || lx > 370) continue;
        const ok = row.pads.some(p => { const px = p.x + row.v * JT; return Math.abs(px - lx) < p.r - 4 && !(p.frog && p.frog.type !== 'ojazos'); });
        const tg = row.tongue; const tongueBad = tg && (tg.ph % 3.2) > 1.3;
        if (ok && !tongueBad) { e.down(dx < 0 ? (e.hypno ? 350 : 50) : dx > 0 ? (e.hypno ? 50 : 350) : 200); e.botW = e.t + 0.15; return; } } };
    e.result = () => e.max; return e;
  } });

// ===================== Flujo: menú, intro, resultado, medallero =====================
const $ = id => document.getElementById(id);
const MEDAL = ['🥇', '🥈', '🥉'], NOMED = '🎗️';
const bestOf = id => { const v = store.get('mochiOli_best_' + id, null); return v == null ? null : +v; };
const medalOf = (ev, s) => s == null ? -1 : ev.med.findIndex(t => s >= t);
let cur = null, curIdx = -1, olympic = null, last = performance.now();
function show(id) { for (const s of document.querySelectorAll('.scr')) s.classList.toggle('on', s.id === id); }
function buildMenu() {
  const L = $('evList'); L.innerHTML = '';
  EVENTS.forEach((ev, i) => { const b = document.createElement('button'); b.className = 'ev'; const md = medalOf(ev, bestOf(ev.id));
    b.innerHTML = `<span class="ic">${ev.icon}</span><span class="nm">${ev.name}</span><span class="md">${md >= 0 ? MEDAL[md] : ''}</span>`;
    b.onclick = () => { Snd.init(); olympic = null; intro(i); }; L.appendChild(b); });
}
function intro(i) { curIdx = i; const ev = EVENTS[i]; $('inT').textContent = ev.icon + ' ' + ev.name; $('inH').textContent = ev.how; show('intro'); cur = null; }
$('inGo').onclick = () => { Snd.init(); start(curIdx); };
function start(i) { curIdx = i; parts = []; pops = []; cur = EVENTS[i].create(); cur.ev = EVENTS[i]; show(''); }
function finish() {
  const ev = cur.ev, s = cur.result(), prev = bestOf(ev.id), rec = prev == null || s > prev; if (rec) store.set('mochiOli_best_' + ev.id, s);
  const md = medalOf(ev, s); if (olympic) olympic.push({ id: ev.id, s, md });
  $('rsT').textContent = ev.icon + ' ' + ev.name; $('rsM').textContent = md >= 0 ? MEDAL[md] : NOMED; $('rsS').textContent = ev.fmt(s);
  $('rsR').textContent = rec ? '¡Nuevo récord!' : 'Récord: ' + ev.fmt(prev);
  $('rsN').textContent = md === 0 ? '¡Medalla de oro!' : md > 0 ? 'Oro con ' + ev.fmt(ev.med[0]) : 'Bronce con ' + ev.fmt(ev.med[2]);
  $('rsNext').textContent = olympic ? (curIdx < EVENTS.length - 1 ? 'Siguiente prueba' : 'Ver medallero') : 'Menú';
  if (md >= 0) Snd.win(3 - md); else Snd.bad();
  cur = null; show('res'); window.__lastResult = { id: ev.id, s, md };
}
$('rsAgain').onclick = () => { if (olympic) olympic.pop(); start(curIdx); };
$('rsNext').onclick = () => { if (olympic) { if (curIdx < EVENTS.length - 1) intro(curIdx + 1); else medallero(olympic); } else { buildMenu(); show('menu'); } };
$('bAll').onclick = () => { Snd.init(); olympic = []; intro(0); };
$('bMed').onclick = () => medallero(null);
$('mdBack').onclick = () => { olympic = null; buildMenu(); show('menu'); };
function medallero(list) {
  const rows = EVENTS.map(ev => { const o = list ? list.find(r => r.id === ev.id) : null, s = o ? o.s : bestOf(ev.id); return { ev, s, md: medalOf(ev, s) }; });
  const c = [0, 0, 0]; rows.forEach(r => { if (r.md >= 0) c[r.md]++; });
  $('mdT').textContent = list ? '¡Medallero de tu Olimpiada!' : 'Medallero (récords)';
  $('mdTot').textContent = `🥇${c[0]} 🥈${c[1]} 🥉${c[2]}`;
  $('mdTab').innerHTML = rows.map(r => `<tr><td>${r.ev.icon}</td><td style="text-align:left">${r.ev.name}</td><td>${r.s == null ? '—' : r.ev.fmt(r.s)}</td><td>${r.md >= 0 ? MEDAL[r.md] : '·'}</td></tr>`).join('');
  if (list) { Snd.win(3); for (let i = 0; i < 40; i++) setTimeout(() => stars(rnd(40, 360), rnd(100, 500), 4), i * 40); }
  show('medals');
}
// entrada
function pt(ev) { const r = cv.getBoundingClientRect(); return [(ev.clientX - r.left) / SC, (ev.clientY - r.top) / SC]; }
cv.addEventListener('pointerdown', ev => { Snd.init(); if (cur && cur.down && !BOT) cur.down(...pt(ev)); });
cv.addEventListener('pointermove', ev => { if (cur && cur.move && !BOT) cur.move(...pt(ev)); });
addEventListener('pointerup', ev => { if (cur && cur.up && !BOT) cur.up(...pt(ev)); });
addEventListener('pointercancel', ev => { if (cur && cur.up) cur.up(...pt(ev)); });
// bucle
let menuT = 0;
function drawMenuBg(dt) {
  menuT += dt; sky('#ffd9e8', '#ffe9d6'); for (let i = 0; i < 5; i++) cloud((i * 110 + menuT * 12) % 500 - 50, 80 + i * 120, 24);
  const b = Math.abs(Math.sin(menuT * 3)); shadow(200, H - 60, 30); drawMochi(200, H - 60 - b * 40, 70, { sx: 1 + (1 - b) * 0.15, sy: 1 - (1 - b) * 0.15 + b * 0.05, face: 'happy', armsUp: b > 0.5, band: true });
}
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000); last = now; T += dt;
  g.setTransform(DPR * SC, 0, 0, DPR * SC, 0, 0);
  if (cur) { if (BOT && cur.bot) cur.bot(dt); cur.update(dt); updFx(dt); g.save(); if (shake) g.translate(rnd(-shake, shake) * 0.5, rnd(-shake, shake) * 0.5); cur.draw(); drawFx(); g.restore(); if (cur && cur.done) finish(); }
  else { drawMenuBg(dt); updFx(dt); drawFx(); }
  requestAnimationFrame(frame);
}
buildMenu();
document.fonts && document.fonts.load('700 20px Fredoka').catch(() => {});
requestAnimationFrame(frame);
window.MO = { EVENTS, start, intro, medallero, get cur() { return cur; } };
