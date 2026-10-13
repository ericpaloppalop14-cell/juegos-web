'use strict';
(() => {
// ================= Utils =================
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = n => Math.floor(Math.random() * n);
const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgbs = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};

// Jelly palette: rosa, menta, lila
const PAL = [
  { name: 'rosa', base: '#ff9cc8', light: '#ffe0ee', dark: '#ef6fa9', deep: '#c9508a' },
  { name: 'menta', base: '#7ee3c4', light: '#d8fbef', dark: '#45c49f', deep: '#2b9c7c' },
  { name: 'lila', base: '#b9a2f7', light: '#ece4ff', dark: '#8f72e6', deep: '#6b4fc6' },
].map(p => ({ ...p, rgb: hex2rgb(p.base), lrgb: hex2rgb(p.light), drgb: hex2rgb(p.dark), dprgb: hex2rgb(p.deep) }));
const NC = PAL.length;

// ================= Canvas =================
const cv = document.getElementById('c');
const ctx = cv.getContext('2d', { alpha: false });
let safeBottom = 0, W = 0, H = 0, DPR = 1, horizonY = 0, baseY = 0, laneW = 0;
const D = 6;           // perspective distance
const FAR = 62;        // spawn distance
function proj(x, z) {
  const s = D / (D + z);
  return { x: W / 2 + x * laneW * s, y: horizonY + (baseY - horizonY) * s, s };
}
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  horizonY = H * 0.34;
  laneW = Math.min(W * 0.29, H * 0.17);
  const pr = document.createElement('div'); pr.style.cssText = 'position:fixed;bottom:0;height:env(safe-area-inset-bottom);width:1px;visibility:hidden'; document.body.appendChild(pr); safeBottom = pr.offsetHeight || 0; pr.remove();
  baseY = Math.min(H * 0.80, H - safeBottom - Math.max(118, H * 0.15));
  layoutSelector(); buildDropSprites();
  buildBackdrop(); if (typeof skyCache !== 'undefined') { skyCache.dirty = true; [0, 1, 2, 3].forEach(i => setTimeout(() => { const c = skyCache.th[i]; if (!c || !c.ok) renderSkyCache(i); }, 150 + i * 120)); }
  buildSprites();
}

// ================= Sound (WebAudio, soft & cute) =================
const Snd = {
  ac: null, master: null, music: null, muted: store.get('mochi_mute', '0') === '1',
  init() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ac = new AC();
    const comp = this.ac.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4;
    this.master = this.ac.createGain(); this.master.gain.value = this.muted ? 0 : 0.6;
    this.master.connect(comp); comp.connect(this.ac.destination);
    this.music = this.ac.createGain(); this.music.gain.value = 0.32; this.music.connect(this.master);
    this.noiseBuf = this.ac.createBuffer(1, this.ac.sampleRate * 0.5, this.ac.sampleRate);
    const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    Music.start();
  },
  setMuted(m) {
    this.muted = m; store.set('mochi_mute', m ? '1' : '0');
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.6, this.ac.currentTime, 0.03);
  },
  tone(f, dur, { type = 'sine', vol = 0.2, to = null, delay = 0, attack = 0.005, out = null } = {}) {
    if (!this.ac) return;
    const t = this.ac.currentTime + delay;
    const o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out || this.master);
    o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, { vol = 0.1, freq = 1200, q = 1, to = null, delay = 0, type = 'bandpass' } = {}) {
    if (!this.ac) return;
    const t = this.ac.currentTime + delay;
    const s = this.ac.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ac.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = this.ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t + dur + 0.05);
  },
  swipe() { this.noise(0.11, { vol: 0.07, freq: 900, to: 2600, q: 0.8 }); this.tone(500, 0.08, { vol: 0.04, to: 760 }); },
  color(i) { const b = [523, 659, 784][i % 3]; this.tone(b * 0.75, 0.12, { vol: 0.16, to: b * 1.25 }); this.tone(b * 2, 0.08, { type: 'triangle', vol: 0.05, delay: 0.03 }); },
  pass(combo) {
    const sc = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760];
    const n = sc[Math.min(combo, sc.length - 1)];
    this.tone(260, 0.16, { vol: 0.16, to: 120 });
    this.noise(0.12, { vol: 0.05, freq: 500, type: 'lowpass' });
    this.tone(n, 0.25, { type: 'triangle', vol: 0.13, delay: 0.02 });
    this.tone(n * 1.5, 0.2, { type: 'sine', vol: 0.06, delay: 0.07 });
  },
  star(k) { const sc = [1047, 1175, 1319, 1568, 1760, 2093]; const n = sc[k % sc.length]; this.tone(n, 0.14, { type: 'triangle', vol: 0.09 }); this.tone(n * 2, 0.08, { vol: 0.03, delay: 0.02 }); },
  die() { this.tone(420, 0.5, { vol: 0.22, to: 70, type: 'sine' }); this.tone(300, 0.35, { vol: 0.08, to: 90, type: 'triangle', delay: 0.05 }); this.noise(0.25, { vol: 0.12, freq: 300, type: 'lowpass' }); },
  start() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, { type: 'triangle', vol: 0.1, delay: i * 0.07 })); },
  record() { [784, 988, 1175, 1568, 1976].forEach((f, i) => this.tone(f, 0.22, { type: 'triangle', vol: 0.1, delay: i * 0.09 })); },
  tick() { this.tone(880, 0.06, { type: 'sine', vol: 0.05 }); }
};
// Gentle generative music box loop
const Music = {
  timer: null, next: 0, step: 0,
  start() {
    if (this.timer) return;
    this.next = Snd.ac.currentTime + 0.1;
    this.timer = setInterval(() => this.sched(), 90);
  },
  sched() {
    const ac = Snd.ac; if (!ac || ac.state !== 'running') return;
    const bpm = state === 'play' ? 112 : 92;
    const spb = 60 / bpm / 2; // eighth notes
    const prog = [[0, 4, 7, 11], [5, 9, 12, 16], [9, 12, 16, 19], [7, 11, 14, 17]]; // Cmaj7 Fmaj7 Am7 G
    while (this.next < ac.currentTime + 0.25) {
      const bar = Math.floor(this.step / 8) % 4, st = this.step % 8;
      const ch = prog[bar];
      const midi = n => 440 * Math.pow(2, (n - 69) / 12);
      const t = this.next - ac.currentTime;
      const pat = [0, 2, 1, 3, 2, 1, 3, 2];
      Snd.tone(midi(72 + ch[pat[st]]), spb * 1.8, { type: 'triangle', vol: 0.05, delay: t, out: Snd.music, attack: 0.004 });
      if (st === 0) Snd.tone(midi(48 + ch[0]), spb * 7, { type: 'sine', vol: 0.09, delay: t, out: Snd.music, attack: 0.02 });
      if (st === 4) Snd.tone(midi(55 + ch[0]), spb * 3, { type: 'sine', vol: 0.05, delay: t, out: Snd.music, attack: 0.02 });
      if (state === 'play' && (st === 2 || st === 6)) Snd.tone(midi(84 + ch[(st / 2) % 4]), spb, { type: 'sine', vol: 0.025, delay: t, out: Snd.music });
      this.next += spb; this.step++;
    }
  }
};

// ================= Backdrop & sprites (pre-rendered) =================
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
const spr = {};
function buildSprites() {
  if (typeof mipCache !== "undefined") mipCache.clear();
  const R = laneW * 1.6 * DPR; // reference px per world unit at s=1 (oversampled)
  // Star candy
  {
    const sz = R * 0.6, c = mkCanvas(sz, sz), g = c.getContext('2d');
    const cx = sz / 2, cy = sz / 2, ro = sz * 0.44, ri = sz * 0.22;
    const path = () => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? ri : ro; const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); };
    g.lineJoin = 'round';
    path(); g.lineWidth = sz * 0.1; g.strokeStyle = '#ffb04d'; g.stroke();
    const gr = g.createRadialGradient(cx - sz * 0.1, cy - sz * 0.12, 0, cx, cy, ro);
    gr.addColorStop(0, '#fffbe0'); gr.addColorStop(0.5, '#ffe27a'); gr.addColorStop(1, '#ffbf4d');
    path(); g.fillStyle = gr; g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.ellipse(cx - sz * 0.08, cy - sz * 0.12, sz * 0.07, sz * 0.04, -0.6, 0, 7); g.fill();
    // face
    g.fillStyle = '#7a4a2a';
    g.beginPath(); g.arc(cx - sz * 0.07, cy + sz * 0.02, sz * 0.025, 0, 7); g.arc(cx + sz * 0.07, cy + sz * 0.02, sz * 0.025, 0, 7); g.fill();
    g.strokeStyle = '#7a4a2a'; g.lineWidth = sz * 0.018; g.lineCap = 'round'; g.beginPath(); g.arc(cx, cy + sz * 0.05, sz * 0.035, 0.2, Math.PI - 0.2); g.stroke();
    spr.star = c;
  }
  // Chocolate block obstacle (unit: 0.9 lane wide, 0.85 tall)
  {
    const w = R * 0.86, h = R * 0.92, c = mkCanvas(w, h), g = c.getContext('2d');
    const rr = w * 0.16, top = h * 0.1;
    const rrect = (x, y, ww, hh, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + ww, y, x + ww, y + hh, r); g.arcTo(x + ww, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + ww, y, r); g.closePath(); };
    g.fillStyle = 'rgba(90,50,70,0.0)';
    // body
    const bg = g.createLinearGradient(0, top, 0, h);
    bg.addColorStop(0, '#a8705a'); bg.addColorStop(1, '#6e4136');
    rrect(w * 0.02, top, w * 0.96, h - top - 2, rr); g.fillStyle = bg; g.fill();
    g.lineWidth = w * 0.025; g.strokeStyle = '#4f2c27'; g.stroke();
    // chocolate squares
    g.strokeStyle = 'rgba(70,35,30,0.45)'; g.lineWidth = w * 0.02;
    for (let i = 1; i < 3; i++) { g.beginPath(); g.moveTo(w * 0.02 + w * 0.96 * i / 3, top + h * 0.28); g.lineTo(w * 0.02 + w * 0.96 * i / 3, h - h * 0.06); g.stroke(); }
    g.beginPath(); g.moveTo(w * 0.06, h * 0.64); g.lineTo(w * 0.94, h * 0.64); g.stroke();
    g.fillStyle = 'rgba(255,220,200,0.18)';
    for (let i = 0; i < 3; i++) { rrect(w * 0.06 + i * w * 0.32, h * 0.38, w * 0.24, h * 0.06, w * 0.03); g.fill(); }
    // pink frosting with drips
    g.fillStyle = '#ffd1e6'; g.strokeStyle = '#e88ab5'; g.lineWidth = w * 0.02;
    g.beginPath(); g.moveTo(w * 0.04, top + rr);
    g.quadraticCurveTo(w * 0.04, top - h * 0.02, w * 0.18, top - h * 0.02);
    g.lineTo(w * 0.82, top - h * 0.02); g.quadraticCurveTo(w * 0.96, top - h * 0.02, w * 0.96, top + rr);
    const drips = [[0.86, 0.34], [0.7, 0.22], [0.52, 0.38], [0.33, 0.24], [0.16, 0.33]];
    let px = 0.96;
    for (const [dx, dl] of drips) {
      g.lineTo(w * (dx + 0.06), top + h * 0.14);
      g.quadraticCurveTo(w * (dx + 0.05), top + h * dl, w * dx, top + h * dl);
      g.quadraticCurveTo(w * (dx - 0.05), top + h * dl, w * (dx - 0.06), top + h * 0.14);
      px = dx - 0.06;
    }
    g.lineTo(w * 0.04, top + h * 0.15); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.ellipse(w * 0.24, top + h * 0.05, w * 0.1, h * 0.022, 0, 0, 7); g.fill();
    // sprinkles
    const cols = ['#7ee3c4', '#b9a2f7', '#ffd36b', '#ff8fbf', '#8fd3ff'];
    g.lineCap = 'round'; g.lineWidth = w * 0.03;
    const sp = [[0.3, 0.08, 0.5], [0.45, 0.12, -0.4], [0.6, 0.07, 1.2], [0.72, 0.13, 0.2], [0.85, 0.08, -1], [0.15, 0.12, 0.9], [0.52, 0.03, 0]];
    sp.forEach(([x, y, a], i) => { g.strokeStyle = cols[i % cols.length]; g.beginPath(); g.moveTo(w * x - Math.cos(a) * w * 0.03, top + h * y - Math.sin(a) * w * 0.03); g.lineTo(w * x + Math.cos(a) * w * 0.03, top + h * y + Math.sin(a) * w * 0.03); g.stroke(); });
    spr.block = c;
  }
  // Scenery: lollipop, gumdrop, cotton tree, cloud
  {
    const s = R * 1.2;
    // lollipop
    let c = mkCanvas(s * 0.6, s * 1.2), g = c.getContext('2d');
    g.fillStyle = '#fff'; g.strokeStyle = '#e3c6d6'; g.lineWidth = s * 0.012;
    g.fillRect(s * 0.28, s * 0.45, s * 0.04, s * 0.75); g.strokeRect(s * 0.28, s * 0.45, s * 0.04, s * 0.75);
    const cx = s * 0.3, cy = s * 0.3, r = s * 0.26;
    g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    g.lineWidth = s * 0.06; g.strokeStyle = '#ff9cc8'; g.lineCap = 'round'; g.beginPath();
    for (let a = 0; a < Math.PI * 6; a += 0.1) { const rr = r * 0.9 * a / (Math.PI * 6); const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; a ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    g.lineWidth = s * 0.015; g.strokeStyle = '#f08cbc'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(cx - r * 0.4, cy - r * 0.45, r * 0.22, r * 0.1, -0.7, 0, 7); g.fill();
    spr.lolly = c;
    // lollipop mint variant
    c = mkCanvas(s * 0.6, s * 1.2); g = c.getContext('2d'); g.drawImage(spr.lolly, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(126,227,196,0.0)'; spr.lolly2 = recolor(spr.lolly, 'hue-rotate(150deg) saturate(0.8)');
    // gumdrop
    c = mkCanvas(s * 0.6, s * 0.5); g = c.getContext('2d');
    const gd = (col, dk, x, y, w, h) => {
      const gr = g.createLinearGradient(0, y - h, 0, y); gr.addColorStop(0, col[0]); gr.addColorStop(1, col[1]);
      g.fillStyle = gr; g.beginPath(); g.moveTo(x - w / 2, y); g.bezierCurveTo(x - w / 2, y - h * 1.2, x + w / 2, y - h * 1.2, x + w / 2, y); g.closePath(); g.fill();
      g.strokeStyle = dk; g.lineWidth = s * 0.012; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(x - w * 0.15, y - h * 0.62, w * 0.08, h * 0.12, -0.5, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(x + (i * 37 % 10 - 5) / 10 * w * 0.6, y - h * (0.2 + (i * 13 % 7) / 12), s * 0.008, 0, 7); g.fill(); }
    };
    gd(['#ffd0a8', '#ffab7a'], '#e88a5c', s * 0.18, s * 0.48, s * 0.3, s * 0.26);
    gd(['#e4d8ff', '#b9a2f7'], '#8f72e6', s * 0.4, s * 0.48, s * 0.32, s * 0.32);
    spr.gum = c;
    // cotton candy tree
    c = mkCanvas(s * 0.7, s * 1.1); g = c.getContext('2d');
    g.fillStyle = '#e8b9a0'; g.fillRect(s * 0.33, s * 0.55, s * 0.05, s * 0.55);
    const puff = (x, y, r, col) => { const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r); gr.addColorStop(0, '#fff'); gr.addColorStop(0.5, col); gr.addColorStop(1, col); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
    [[0.22, 0.45, 0.15], [0.48, 0.45, 0.16], [0.35, 0.28, 0.2], [0.35, 0.5, 0.14]].forEach(([x, y, r]) => puff(s * x, s * y, s * r, '#ffc3dc'));
    spr.tree = c;
    spr.tree2 = recolor(c, 'hue-rotate(110deg) saturate(0.7) brightness(1.05)');
  }
  buildLandSprites(R);
}
function recolor(src, filter) {
  const c = mkCanvas(src.width, src.height), g = c.getContext('2d');
  if ('filter' in g) { g.filter = filter; }
  g.drawImage(src, 0, 0); return c;
}

// ================= Themes (time of day) =================
const THEMES_RAW = [
  { name: 'Amanecer', sky: ['#c8b6ff', '#f4c3e6', '#ffd6cc', '#ffe9d6'], sun: '#fff6e0', glow: '#ffd2c8', sunX: 0.74, sunY: 0.6, sunR: 0.085, moon: 0,
    m1: ['#cdb8f7', '#efe2ff'], m2: ['#f6b3d4', '#ffdcec'], m3: ['#a9e6cf', '#d6f6e8'], frost: '#ffffff',
    ground: ['#c9f0dd', '#a8e6cc'], road: '#fff3e8', tile: '#ffd6be', fog: '#ffe9d6', cloud: '#ffffff',
    stars: 0, aurora: 0, rainbow: 0.25, rays: 0.55, fire: 0, sparkle: 0.7, bugs: 1, island: 1,
    whale: 1, cups: 1, jelly: 0.55, stairs: 0, stX: 0.9, stDir: -1, donut: 1, donX: 0.2, donY: 0.4, donCol: 'rgb(255,170,210)' },
  { name: 'Día soleado', sky: ['#86c9ff', '#b0dcff', '#d9f2ff', '#f1fbff'], sun: '#fffbe6', glow: '#fff3b8', sunX: 0.26, sunY: 0.34, sunR: 0.075, moon: 0,
    m1: ['#a9c3f2', '#e2ecff'], m2: ['#b9a2f2', '#e6dcff'], m3: ['#94e2bd', '#cdf5df'], frost: '#ffffff',
    ground: ['#bdf0d4', '#98e2bc'], road: '#fffaf2', tile: '#ffe2c8', fog: '#eaf7ff', cloud: '#ffffff',
    stars: 0, aurora: 0, rainbow: 0.85, rays: 0.8, fire: 0, sparkle: 0.6, bugs: 1, island: 1,
    whale: 1, cups: 1, jelly: 0.35, stairs: 1, stX: 0.95, stDir: -1, donut: 0, donX: 0.8, donY: 0.2, donCol: 'rgb(190,170,255)' },
  { name: 'Atardecer', sky: ['#7766d6', '#d985c6', '#ffa58d', '#ffd19a'], sun: '#ffe7b0', glow: '#ff9f80', sunX: 0.62, sunY: 0.86, sunR: 0.12, moon: 0,
    m1: ['#8c6fd0', '#c9a6ee'], m2: ['#e07fb0', '#ffb9d2'], m3: ['#f0a49e', '#ffd0c2'], frost: '#fff1e6',
    ground: ['#f1c9cf', '#e3aec4'], road: '#fff1e8', tile: '#ffcfb8', fog: '#ffc9a8', cloud: '#ffe0e8',
    stars: 0.12, aurora: 0, rainbow: 0, rays: 1, fire: 0.3, sparkle: 0.7, bugs: 0.7, island: 1,
    whale: 0.9, cups: 0.75, jelly: 0.8, stairs: 1, stX: 0.05, stDir: 1, donut: 1, donX: 0.8, donY: 0.4, donCol: 'rgb(200,160,255)' },
  { name: 'Noche estrellada', sky: ['#17154a', '#2f2873', '#56408f', '#8a62aa'], sun: '#fff8e6', glow: '#b8a4ff', sunX: 0.7, sunY: 0.32, sunR: 0.07, moon: 1,
    m1: ['#2a2668', '#4a3f8e'], m2: ['#3f357f', '#6a52a6'], m3: ['#2f5a7e', '#4c7fa0'], frost: '#e6dcff',
    ground: ['#4a4a92', '#383677'], road: '#ece3fb', tile: '#cdbdf2', fog: '#7b5ea9', cloud: '#a99be0',
    stars: 1, aurora: 1, rainbow: 0, rays: 0.25, fire: 1, sparkle: 0.3, bugs: 0, island: 0.8,
    whale: 0.85, cups: 0.4, jelly: 1, stairs: 0, stX: 0.93, stDir: -1, donut: 1, donX: 0.2, donY: 0.42, donCol: 'rgb(255,150,205)' },
];
const THEME_PTS = 400;
function prepTheme(o) {
  const r = {};
  for (const k in o) {
    const v = o[k];
    if (typeof v === 'string' && v[0] === '#') r[k] = hex2rgb(v);
    else if (Array.isArray(v)) r[k] = v.map(hex2rgb);
    else r[k] = v;
  }
  return r;
}
const THEMES = THEMES_RAW.map(prepTheme);
function blendTheme(a, b, f) {
  const r = {};
  for (const k in b) {
    const x = a[k], y = b[k];
    if (typeof y === 'number') r[k] = lerp(x, y, f);
    else if (Array.isArray(y) && Array.isArray(y[0])) r[k] = y.map((c, i) => mix(x[i], c, f));
    else if (Array.isArray(y)) r[k] = mix(x, y, f);
    else r[k] = f < 0.5 ? x : y;
  }
  return r;
}
let themeFromIdx = 0, themeFrom = THEMES[0], themeTo = 0, themeMix = 1, TP = THEMES[0], menuThemeT = 0;
function setTheme(i, announce) {
  if (i === themeTo) return;
  themeFromIdx = themeMix < 0.5 ? themeFromIdx : themeTo; themeFrom = TP; themeTo = i; themeMix = 0;
  if (announce) {
    popup(THEMES[i].name, W / 2, H * 0.27, rgbs(mix(THEMES[i].sky[1], [120, 60, 160], 0.35)), 34, 2.0);
    [784, 988, 1175, 1568].forEach((f, k) => Snd.tone(f, 0.5, { type: 'sine', vol: 0.05, delay: k * 0.12 }));
  }
}
function updateTheme(dt) {
  if (state === 'play') setTheme(Math.floor(Math.sqrt(Math.max(0, score) / 160)) % THEMES.length, true);
  else if (state === 'menu') { menuThemeT += dt; if (menuThemeT > 4.5) { menuThemeT = 0; setTheme((themeTo + 1) % THEMES.length, false); } }
  if (themeMix < 1) {
    themeMix = Math.min(1, themeMix + dt / 3);
    const e = themeMix * themeMix * (3 - 2 * themeMix);
    TP = blendTheme(themeFrom, THEMES[themeTo], e);
  } else TP = THEMES[themeTo];
}

// ================= Landscape geometry (built on resize) =================
const land = {};
function buildBackdrop() {
  const L = land, Wx = W * 1.3, x0 = -W * 0.15;
  // far frosting mountains
  const m1 = new Path2D(), cap = new Path2D();
  const peaks = [];
  let px = x0 - 20, i = 0;
  while (px < x0 + Wx + 60) { const pw = W * rnd(0.28, 0.42), ph = horizonY * rnd(0.32, 0.5); peaks.push({ x: px, w: pw, h: ph }); px += pw * rnd(0.45, 0.7); i++; }
  for (const p of peaks) {
    const bx = p.x, by = horizonY + 2, tx = bx + p.w / 2, ty = horizonY - p.h, r = p.w * 0.09;
    m1.moveTo(bx, by); m1.quadraticCurveTo(tx - r * 2.2, ty + r * 1.4, tx - r, ty + r * 0.3); m1.quadraticCurveTo(tx, ty - r * 0.5, tx + r, ty + r * 0.3); m1.quadraticCurveTo(tx + r * 2.2, ty + r * 1.4, bx + p.w, by); m1.closePath();
    // frosting cap with drips
    const cy = ty + p.h * 0.3, lx = lerp(tx - r, bx, 0.3 * 0.75), rx = lerp(tx + r, bx + p.w, 0.3 * 0.75);
    cap.moveTo(tx - r, ty + r * 0.3); cap.quadraticCurveTo(tx, ty - r * 0.5, tx + r, ty + r * 0.3);
    cap.lineTo(rx, cy);
    const nd = 4;
    for (let k = 0; k < nd; k++) {
      const xa = lerp(rx, lx, k / nd), xb = lerp(rx, lx, (k + 1) / nd), dl = p.h * (k % 2 ? 0.09 : 0.15);
      cap.quadraticCurveTo((xa + xb) / 2, cy + dl * 1.6, xb, cy);
    }
    cap.closePath();
  }
  L.m1 = m1; L.cap = cap; L.m1top = horizonY - horizonY * 0.5;
  const hills = (amp, base, freq, ph, step = 8) => {
    const p = new Path2D(); p.moveTo(x0, horizonY + 3);
    for (let x = x0; x <= x0 + Wx + step; x += step) {
      const y = horizonY - base - amp * (0.5 + 0.5 * Math.sin(x / W * Math.PI * freq + ph)) - amp * 0.3 * Math.sin(x / W * Math.PI * freq * 2.3 + ph * 1.7);
      p.lineTo(x, y);
    }
    p.lineTo(x0 + Wx, horizonY + 3); p.closePath(); return p;
  };
  L.m2 = hills(horizonY * 0.12, horizonY * 0.04, 2.6, 1.3);
  L.m3 = hills(horizonY * 0.06, -3, 4.1, 3.7);
  // stars
  L.stars = []; for (let k = 0; k < 90; k++) L.stars.push({ x: Math.random(), y: Math.pow(Math.random(), 1.3) * 0.85, r: rnd(0.6, 1.8), sp: rnd(1, 3.5), ph: rnd(0, 6) });
  // giant cotton candies on the horizon
  L.giants = [];
  for (let k = 0; k < 5; k++) L.giants.push({ x: (k + 0.3 + Math.random() * 0.4) / 5, s: rnd(0.8, 1.25), ph: rnd(0, 6), alt: k % 2 });
  // floating islands & clouds
  L.islands = [{ x: 0.12, y: 0.2, s: 1, sp: 5 }, { x: 0.68, y: 0.12, s: 0.7, sp: 3.5 }, { x: 1.15, y: 0.27, s: 0.55, sp: 4.2 }];
  L.clouds = []; for (let k = 0; k < 6; k++) L.clouds.push({ x: Math.random() * 1.3, y: rnd(0.08, 0.6), s: rnd(0.5, 1.1), sp: rnd(2, 6) });
  // ambient motes
  L.motes = []; for (let k = 0; k < 28; k++) L.motes.push({ x: Math.random() * W, y: Math.random() * H * 0.8, vx: rnd(-6, 6), vy: rnd(-14, -4), ph: rnd(0, 6), r: rnd(1, 2.5) });
  L.bugs = []; for (let k = 0; k < 3; k++) L.bugs.push({ ph: rnd(0, 100), y: rnd(0.55, 0.9), sp: rnd(18, 30), col: [PAL[k].base, '#ffd36b'][k % 2 ? 1 : 0], c2: PAL[(k + 1) % 3].base });
}
function buildLandSprites(R) {
  // cloud
  { const w = R * 1.3, h = R * 0.5, c = mkCanvas(w, h), g = c.getContext('2d');
    const puffs = [[0.2, 0.68, 0.18], [0.38, 0.5, 0.25], [0.6, 0.45, 0.28], [0.8, 0.65, 0.18], [0.5, 0.72, 0.2]];
    for (const [x, y, r] of puffs) { const gr = g.createRadialGradient(w * x - r * h * 0.3, h * y - r * h * 0.5, 1, w * x, h * y, r * w * 0.6); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0.0)'); g.fillStyle = gr; g.beginPath(); g.arc(w * x, h * y, r * w * 0.6, 0, 7); g.fill(); }
    spr.cloud = c; }
  // floating island: cloud base + cotton tree + lollipop + candy drip
  { const w = R * 1.4, h = R * 1.2, c = mkCanvas(w, h), g = c.getContext('2d');
    const by = h * 0.68;
    // rock (candy) underside
    const rg = g.createLinearGradient(0, by, 0, h); rg.addColorStop(0, '#ffc7de'); rg.addColorStop(1, '#c9a8f2');
    g.fillStyle = rg; g.beginPath(); g.moveTo(w * 0.15, by); g.quadraticCurveTo(w * 0.3, h * 0.98, w * 0.5, h * 0.99); g.quadraticCurveTo(w * 0.72, h * 0.98, w * 0.86, by); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(w * 0.4, by + h * 0.08, w * 0.08, h * 0.03, 0, 0, 7); g.fill();
    // grass top (mint frosting)
    g.fillStyle = '#b6f0d6'; g.beginPath(); g.ellipse(w * 0.5, by, w * 0.37, h * 0.07, 0, 0, 7); g.fill();
    g.fillStyle = '#9fe6c6'; for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(w * (0.2 + k * 0.12), by + h * 0.04, w * 0.04, h * 0.05, 0, 0, Math.PI); g.fill(); }
    // tree
    g.fillStyle = '#e8b9a0'; g.fillRect(w * 0.37, by - h * 0.3, w * 0.03, h * 0.3);
    const puff = (x, y, r, col) => { const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r); gr.addColorStop(0, '#fff'); gr.addColorStop(0.55, col); gr.addColorStop(1, col); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
    [[0.3, 0.36, 0.09], [0.46, 0.36, 0.09], [0.38, 0.25, 0.12]].forEach(([x, y, r]) => puff(w * x, h * y, w * r, '#ffbfd9'));
    // lollipop
    g.fillStyle = '#fff'; g.fillRect(w * 0.64, by - h * 0.22, w * 0.018, h * 0.22);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(w * 0.65, by - h * 0.26, w * 0.07, 0, 7); g.fill();
    g.strokeStyle = '#b9a2f7'; g.lineWidth = w * 0.022; g.beginPath(); for (let a = 0; a < Math.PI * 5; a += 0.15) { const rr = w * 0.06 * a / (Math.PI * 5); const x = w * 0.65 + Math.cos(a) * rr, y = by - h * 0.26 + Math.sin(a) * rr; a ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    // little waterfall of syrup
    const wf = g.createLinearGradient(0, by, 0, h * 1.0); wf.addColorStop(0, 'rgba(200,240,255,0.8)'); wf.addColorStop(1, 'rgba(200,240,255,0)');
    g.fillStyle = wf; g.fillRect(w * 0.74, by, w * 0.025, h * 0.32);
    spr.island = c; }
  // giant cotton candy (horizon)
  { const w = R * 0.9, h = R * 1.5, c = mkCanvas(w, h), g = c.getContext('2d');
    g.fillStyle = '#f3d6c6'; g.fillRect(w * 0.47, h * 0.5, w * 0.06, h * 0.5);
    const puff = (x, y, r) => { const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r); gr.addColorStop(0, '#fff'); gr.addColorStop(0.6, '#ffc9e0'); gr.addColorStop(1, '#f7a9cc'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
    [[0.3, 0.42, 0.2], [0.7, 0.42, 0.2], [0.5, 0.48, 0.2], [0.38, 0.27, 0.22], [0.62, 0.27, 0.22], [0.5, 0.14, 0.2]].forEach(([x, y, r]) => puff(w * x, h * y, w * r));
    spr.giant = c; spr.giant2 = recolor(c, 'hue-rotate(230deg) saturate(0.9)'); }
  // cupcake tree
  { const s = R * 1.2, c = mkCanvas(s * 0.6, s * 0.75), g = c.getContext('2d'); const w = c.width, h = c.height;
    const wr = g.createLinearGradient(0, h * 0.55, 0, h); wr.addColorStop(0, '#ffcf9e'); wr.addColorStop(1, '#f2a66e');
    g.fillStyle = wr; g.beginPath(); g.moveTo(w * 0.18, h * 0.58); g.lineTo(w * 0.82, h * 0.58); g.lineTo(w * 0.72, h * 0.98); g.lineTo(w * 0.28, h * 0.98); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(200,120,70,0.5)'; g.lineWidth = w * 0.02; for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(w * (0.18 + k * 0.128), h * 0.6); g.lineTo(w * (0.28 + k * 0.088), h * 0.97); g.stroke(); }
    const fr = (y, r, col) => { const gr = g.createRadialGradient(w * 0.42, y - r * 0.4, 1, w * 0.5, y, r); gr.addColorStop(0, '#fff'); gr.addColorStop(0.5, col); gr.addColorStop(1, col); g.fillStyle = gr; g.beginPath(); g.ellipse(w * 0.5, y, r, r * 0.62, 0, 0, 7); g.fill(); };
    fr(h * 0.55, w * 0.38, '#cdb8ff'); fr(h * 0.42, w * 0.3, '#ddd0ff'); fr(h * 0.3, w * 0.2, '#ece4ff');
    g.fillStyle = '#ff6f9c'; g.beginPath(); g.arc(w * 0.5, h * 0.16, w * 0.09, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(w * 0.47, h * 0.14, w * 0.025, 0, 7); g.fill();
    spr.cupcake = c; }
  // glow sprite (fireflies / sparkles)
  { const s = 64, c = mkCanvas(s, s), g = c.getContext('2d'); const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.2, 'rgba(255,245,200,0.8)'); gr.addColorStop(1, 'rgba(255,230,180,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); spr.glow = c; }
  buildSurreal(R);
  buildTown(R);
}
// ---- v4 roadside town: jelly inhabitants, houses, signs, lanterns (all in the same jelly style as Mochi)
const INH_COLS = [[255, 156, 200], [126, 227, 196], [185, 162, 247], [255, 190, 150], [255, 222, 120], [150, 205, 255]];
const INH_SHAPES = [0, 1, 2, 4, 9, 1, 0, 2];
const SIGNS = ['¡Vamos!', '¡Mochi!', '♥', '¡Ánimo!', '★'];
function mip(c, f) { const m = mkCanvas(c.width * f, c.height * f), g = m.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, m.width, m.height); return m; }
function buildTown(R) {
  const bs = R * 0.42, cw = bs * 2.3, chh = bs * 2.3;
  spr.inh = [];
  for (let v = 0; v < 12; v++) {
    const frames = [];
    for (let f = 0; f < 2; f++) {
      const c = mkCanvas(cw, chh), g = c.getContext('2d');
      drawMochi(g, cw / 2, chh * 0.9, bs, { ch: INH_SHAPES[v % INH_SHAPES.length], noInner: true, solid: true, T: 0, rgb: INH_COLS[v % INH_COLS.length], sx: 1, sy: 1, rot: 0, earL: -0.5, earR: 0.5, earBend: 0.55, foot: 0, arm: 0, armsUp: f === 1, blink: 0, look: 0.35, lookX: 0, happy: f === 1 });
      frames.push(c);
    }
    spr.inh.push(frames.map(c => ({ big: c, small: mip(c, 0.3) })));
  }
  // signs held up by fans
  spr.signs = SIGNS.map(txt => {
    const w = R * 0.5, h = R * 0.36, c = mkCanvas(w, h), g = c.getContext('2d');
    g.fillStyle = '#f2c9a8'; g.fillRect(w * 0.47, h * 0.55, w * 0.06, h * 0.45);
    rr(g, w * 0.06, h * 0.05, w * 0.88, h * 0.55, h * 0.14); g.fillStyle = '#fffaf4'; g.fill();
    g.lineWidth = Math.max(2, R * 0.012); g.strokeStyle = 'rgba(220,120,170,0.75)'; g.stroke();
    g.fillStyle = '#f27bb2'; g.font = `700 ${Math.round(h * (txt.length > 2 ? 0.27 : 0.4))}px Fredoka, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(txt, w / 2, h * 0.34);
    return c;
  });
  // paper lantern (night)
  { const w = R * 0.16, h = R * 0.3, c = mkCanvas(w, h), g = c.getContext('2d');
    g.strokeStyle = '#c9a080'; g.lineWidth = Math.max(1.5, R * 0.008); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h * 0.2); g.stroke();
    const lg = g.createRadialGradient(w * 0.45, h * 0.5, 1, w / 2, h * 0.55, w * 0.5); lg.addColorStop(0, '#fffbe0'); lg.addColorStop(0.6, '#ffd36b'); lg.addColorStop(1, '#ffa95c');
    g.fillStyle = lg; g.beginPath(); g.ellipse(w / 2, h * 0.56, w * 0.42, h * 0.3, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(220,120,60,0.6)'; g.lineWidth = Math.max(1, R * 0.005); for (const k of [-0.2, 0, 0.2]) { g.beginPath(); g.ellipse(w / 2, h * 0.56, w * 0.42 * (1 - Math.abs(k) * 2.5) + 0.5, h * 0.3, 0, 0, 7); g.stroke(); }
    g.fillStyle = '#e66a8f'; g.fillRect(w * 0.3, h * 0.24, w * 0.4, h * 0.05); g.fillRect(w * 0.3, h * 0.84, w * 0.4, h * 0.05);
    spr.lantern = c; }
  // jelly houses (gumdrop roof + face-like windows), day & lit night versions
  const houseCols = [['#ffb3d3', '#f08cbc'], ['#a8f0d8', '#5fc7a6'], ['#d2c2ff', '#a58cf0']];
  spr.house = []; spr.houseLit = [];
  houseCols.forEach(([roof, roofD]) => {
    for (const lit of [0, 1]) {
      const w = R * 1.0, h = R * 1.05, c = mkCanvas(w, h), g = c.getContext('2d');
      const wallTop = h * 0.5, base = h * 0.97;
      // wall
      const wg = g.createLinearGradient(0, wallTop, 0, base); wg.addColorStop(0, '#fff6ec'); wg.addColorStop(1, '#ffe2cc');
      rr(g, w * 0.16, wallTop, w * 0.68, base - wallTop, w * 0.08); g.fillStyle = wg; g.fill();
      g.lineWidth = Math.max(2, R * 0.014); g.strokeStyle = 'rgba(200,130,150,0.55)'; g.stroke();
      // jelly roof (translucent glossy dome with drips)
      const rg = g.createLinearGradient(0, h * 0.08, 0, wallTop + h * 0.08); rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.25, roof); rg.addColorStop(1, roofD);
      g.fillStyle = rg; g.beginPath(); g.moveTo(w * 0.08, wallTop + h * 0.04);
      g.bezierCurveTo(w * 0.08, h * 0.02, w * 0.92, h * 0.02, w * 0.92, wallTop + h * 0.04);
      for (let k = 0; k < 5; k++) { const xa = w * (0.92 - k * 0.168), xb = w * (0.92 - (k + 1) * 0.168); g.quadraticCurveTo((xa + xb) / 2, wallTop + h * (k % 2 ? 0.1 : 0.16), xb, wallTop + h * 0.04); }
      g.closePath(); g.fill(); g.strokeStyle = 'rgba(150,80,140,0.45)'; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.ellipse(w * 0.3, h * 0.2, w * 0.09, h * 0.04, -0.6, 0, 7); g.fill();
      g.beginPath(); g.arc(w * 0.22, h * 0.3, w * 0.02, 0, 7); g.fill();
      // windows (eyes) + door (smile)
      for (const wx of [0.33, 0.67]) {
        g.fillStyle = lit ? '#ffe28a' : '#8fd3ff'; g.beginPath(); g.arc(w * wx, h * 0.66, w * 0.075, 0, 7); g.fill();
        g.strokeStyle = 'rgba(150,90,140,0.6)'; g.lineWidth = Math.max(1.5, R * 0.01); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(w * (wx - 0.025), h * 0.645, w * 0.022, 0, 7); g.fill();
      }
      g.fillStyle = 'rgba(255,140,180,0.45)'; for (const wx of [0.25, 0.75]) { g.beginPath(); g.ellipse(w * wx, h * 0.77, w * 0.05, h * 0.02, 0, 0, 7); g.fill(); }
      g.fillStyle = '#c98a6a'; g.beginPath(); g.moveTo(w * 0.42, base); g.lineTo(w * 0.42, h * 0.84); g.arc(w * 0.5, h * 0.84, w * 0.08, Math.PI, 0); g.lineTo(w * 0.58, base); g.closePath(); g.fill();
      if (lit) { const gl = g.createRadialGradient(w / 2, h * 0.68, 1, w / 2, h * 0.68, w * 0.45); gl.addColorStop(0, 'rgba(255,230,150,0.35)'); gl.addColorStop(1, 'rgba(255,230,150,0)'); g.fillStyle = gl; g.fillRect(0, 0, w, h); }
      (lit ? spr.houseLit : spr.house).push(c);
    }
  });
}
// ---- v3 surreal sprites
function buildSurreal(R) {
  const rad = (g, x, y, r, c0, c1, c2) => { const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r); gr.addColorStop(0, c0); gr.addColorStop(0.55, c1); gr.addColorStop(1, c2); return gr; };
  // sky whale
  { const w = R * 1.7, h = R * 0.9, c = mkCanvas(w, h), g = c.getContext('2d');
    const body = new Path2D();
    body.moveTo(w * 0.08, h * 0.55);
    body.bezierCurveTo(w * 0.06, h * 0.18, w * 0.42, h * 0.08, w * 0.6, h * 0.3);
    body.bezierCurveTo(w * 0.72, h * 0.42, w * 0.8, h * 0.4, w * 0.86, h * 0.26); // tail stock up
    body.bezierCurveTo(w * 0.9, h * 0.12, w * 0.99, h * 0.12, w * 0.98, h * 0.2);
    body.bezierCurveTo(w * 0.94, h * 0.3, w * 0.92, h * 0.36, w * 0.9, h * 0.42);
    body.bezierCurveTo(w * 0.96, h * 0.48, w * 0.97, h * 0.6, w * 0.92, h * 0.58);
    body.bezierCurveTo(w * 0.86, h * 0.52, w * 0.8, h * 0.52, w * 0.74, h * 0.6);
    body.bezierCurveTo(w * 0.6, h * 0.82, w * 0.2, h * 0.92, w * 0.08, h * 0.55);
    const bg = g.createLinearGradient(0, h * 0.1, 0, h * 0.9); bg.addColorStop(0, '#d7c8ff'); bg.addColorStop(0.6, '#ac95f2'); bg.addColorStop(1, '#9a80e8');
    g.fillStyle = bg; g.fill(body); g.lineWidth = R * 0.012; g.strokeStyle = 'rgba(110,80,180,0.55)'; g.stroke(body);
    // belly
    g.save(); g.clip(body);
    g.fillStyle = '#fbeefe'; g.beginPath(); g.ellipse(w * 0.33, h * 0.84, w * 0.32, h * 0.22, -0.08, 0, 7); g.fill();
    g.strokeStyle = 'rgba(230,170,215,0.8)'; g.lineWidth = R * 0.01;
    for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(w * (0.1 + k * 0.02), h * (0.66 + k * 0.035)); g.quadraticCurveTo(w * 0.33, h * (0.74 + k * 0.035), w * (0.58 - k * 0.03), h * (0.62 + k * 0.03)); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(w * 0.3, h * 0.26, w * 0.14, h * 0.05, -0.2, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.8)'; [[0.42, 0.2, 0.012], [0.5, 0.26, 0.009], [0.36, 0.17, 0.008]].forEach(([x, y, r]) => { g.beginPath(); g.arc(w * x, h * y, R * r * 1.6, 0, 7); g.fill(); });
    g.restore();
    // fin
    g.fillStyle = '#9d84ea'; g.beginPath(); g.ellipse(w * 0.36, h * 0.66, w * 0.07, h * 0.04, 0.6, 0, 7); g.fill();
    // face
    g.strokeStyle = '#4a3470'; g.lineWidth = R * 0.016; g.lineCap = 'round';
    g.beginPath(); g.arc(w * 0.2, h * 0.47, R * 0.03, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    g.beginPath(); g.arc(w * 0.13, h * 0.6, R * 0.035, 0.3, Math.PI - 0.6); g.stroke();
    g.fillStyle = 'rgba(255,130,180,0.55)'; g.beginPath(); g.ellipse(w * 0.22, h * 0.56, R * 0.035, R * 0.02, 0, 0, 7); g.fill();
    spr.whale = c; }
  // flying teacup with little wings
  { const w = R * 0.62, h = R * 0.5, c = mkCanvas(w, h), g = c.getContext('2d');
    // wings
    g.fillStyle = 'rgba(255,255,255,0.92)'; g.strokeStyle = 'rgba(200,170,220,0.9)'; g.lineWidth = R * 0.008;
    for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(w * 0.5 + sd * w * 0.36, h * 0.38, w * 0.15, h * 0.1, sd * -0.5, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.ellipse(w * 0.5 + sd * w * 0.32, h * 0.5, w * 0.1, h * 0.07, sd * -0.3, 0, 7); g.fill(); g.stroke(); }
    // saucer
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(w * 0.5, h * 0.86, w * 0.3, h * 0.08, 0, 0, 7); g.fill(); g.strokeStyle = '#e7a8c8'; g.lineWidth = R * 0.01; g.stroke();
    // cup
    const cg = g.createLinearGradient(w * 0.25, 0, w * 0.75, 0); cg.addColorStop(0, '#ffd3e6'); cg.addColorStop(0.5, '#ffb3d3'); cg.addColorStop(1, '#f592bf');
    g.fillStyle = cg; g.beginPath(); g.moveTo(w * 0.27, h * 0.38); g.lineTo(w * 0.73, h * 0.38); g.bezierCurveTo(w * 0.72, h * 0.75, w * 0.62, h * 0.84, w * 0.5, h * 0.84); g.bezierCurveTo(w * 0.38, h * 0.84, w * 0.28, h * 0.75, w * 0.27, h * 0.38); g.fill(); g.strokeStyle = '#e07aac'; g.stroke();
    g.lineWidth = R * 0.03; g.strokeStyle = '#f592bf'; g.beginPath(); g.arc(w * 0.75, h * 0.55, w * 0.07, -1.3, 1.3); g.stroke();
    g.fillStyle = '#c99079'; g.beginPath(); g.ellipse(w * 0.5, h * 0.39, w * 0.23, h * 0.05, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)'; [[0.38, 0.55], [0.56, 0.62], [0.47, 0.73], [0.63, 0.5]].forEach(([x, y]) => { g.beginPath(); g.arc(w * x, h * y, R * 0.014, 0, 7); g.fill(); });
    g.fillStyle = '#7a4a6a'; g.beginPath(); g.arc(w * 0.44, h * 0.58, R * 0.01, 0, 7); g.arc(w * 0.56, h * 0.58, R * 0.01, 0, 7); g.fill();
    spr.teacup = c; }
  // jellyfish balloon dome
  { const w = R * 0.5, h = R * 0.36, c = mkCanvas(w, h), g = c.getContext('2d');
    const dg = g.createLinearGradient(0, 0, 0, h); dg.addColorStop(0, 'rgba(255,214,240,0.95)'); dg.addColorStop(1, 'rgba(240,150,210,0.85)');
    g.fillStyle = dg; g.beginPath(); g.moveTo(w * 0.04, h * 0.92); g.bezierCurveTo(w * 0.02, h * 0.05, w * 0.98, h * 0.05, w * 0.96, h * 0.92);
    for (let k = 0; k < 5; k++) { const x1 = w * (0.96 - (k + 1) * 0.184); g.quadraticCurveTo((w * (0.96 - k * 0.184) + x1) / 2, h * 1.0, x1, h * 0.92); }
    g.fill(); g.strokeStyle = 'rgba(220,110,170,0.6)'; g.lineWidth = R * 0.008; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(w * 0.32, h * 0.32, w * 0.09, h * 0.14, -0.5, 0, 7); g.fill();
    g.fillStyle = '#7a3f6a'; g.beginPath(); g.arc(w * 0.4, h * 0.6, R * 0.012, 0, 7); g.arc(w * 0.6, h * 0.6, R * 0.012, 0, 7); g.fill();
    g.strokeStyle = '#7a3f6a'; g.lineWidth = R * 0.007; g.beginPath(); g.arc(w * 0.5, h * 0.64, R * 0.016, 0.3, Math.PI - 0.3); g.stroke();
    spr.jelly = c; spr.jelly2 = recolor(c, 'hue-rotate(150deg) saturate(0.85)'); }
  // cake slice island (classic wedge: frosted triangle top + layered front)
  { const w = R * 1.2, h = R * 1.0, c = mkCanvas(w, h), g = c.getContext('2d');
    g.fillStyle = 'rgba(255,255,255,0.92)'; [[0.25, 0.88, 0.11], [0.42, 0.92, 0.14], [0.6, 0.89, 0.13], [0.76, 0.9, 0.1]].forEach(([x, y, r]) => { g.beginPath(); g.arc(w * x, h * y, w * r, 0, 7); g.fill(); });
    const A = [w * 0.1, h * 0.46], Bk = [w * 0.62, h * 0.24], Cr = [w * 0.92, h * 0.36], Cb = [w * 0.92, h * 0.76], Ab = [w * 0.1, h * 0.84];
    // front face layers
    g.save(); g.beginPath(); g.moveTo(...A); g.lineTo(...Cr); g.lineTo(...Cb); g.lineTo(...Ab); g.closePath(); g.clip();
    const lay = [['#f7c98f', 0.0], ['#fff7ee', 0.3], ['#ff9cc8', 0.38], ['#f7c98f', 0.5], ['#fff7ee', 0.76], ['#ff9cc8', 0.84], ['#efb37a', 0.93]];
    for (const [col, f] of lay) { g.fillStyle = col; g.beginPath(); g.moveTo(0, lerp(A[1], Ab[1], f) + (A[1] - Cr[1]) * 0); g.lineTo(w, lerp(Cr[1], Cb[1], f) - (A[1] - Cr[1]) * 0.1); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill(); }
    g.fillStyle = 'rgba(160,90,40,0.25)'; for (let k = 0; k < 14; k++) { g.beginPath(); g.arc(w * (0.15 + (k * 37 % 100) / 130), h * (0.5 + (k * 53 % 100) / 340), R * 0.006, 0, 7); g.fill(); }
    g.restore();
    g.strokeStyle = 'rgba(200,120,90,0.6)'; g.lineWidth = R * 0.01; g.beginPath(); g.moveTo(...A); g.lineTo(...Ab); g.lineTo(...Cb); g.lineTo(...Cr); g.stroke();
    // frosted top
    g.fillStyle = '#fff4fa'; g.strokeStyle = '#f3a6c8'; g.lineWidth = R * 0.01;
    g.beginPath(); g.moveTo(A[0] - w * 0.01, A[1]); g.lineTo(...Bk); g.lineTo(Cr[0] + w * 0.01, Cr[1]);
    for (let k = 0; k < 7; k++) { const f0 = k / 7, f1 = (k + 1) / 7, xa = lerp(Cr[0], A[0], f0), xb = lerp(Cr[0], A[0], f1), ya = lerp(Cr[1], A[1], f0), yb = lerp(Cr[1], A[1], f1), dl = h * (k % 2 ? 0.05 : 0.1); g.quadraticCurveTo((xa + xb) / 2, (ya + yb) / 2 + dl, xb, yb); }
    g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.ellipse(w * 0.45, h * 0.33, w * 0.1, h * 0.02, -0.25, 0, 7); g.fill();
    // strawberry & candle
    const sx = w * 0.6, sy = h * 0.27;
    g.fillStyle = rad(g, sx, sy, w * 0.07, '#ffd0d8', '#ff5d7e', '#e0365c'); g.beginPath(); g.moveTo(sx - w * 0.06, sy - h * 0.02); g.quadraticCurveTo(sx, sy + h * 0.14, sx + w * 0.06, sy - h * 0.02); g.quadraticCurveTo(sx, sy - h * 0.12, sx - w * 0.06, sy - h * 0.02); g.fill();
    g.fillStyle = '#7fd6a4'; g.beginPath(); g.ellipse(sx, sy - h * 0.08, w * 0.045, h * 0.016, 0, 0, 7); g.fill();
    g.fillStyle = '#fff6b0'; [[-0.02, 0.0], [0.02, 0.03], [0.0, 0.05]].forEach(([x, y]) => { g.beginPath(); g.arc(sx + w * x, sy + h * y, R * 0.006, 0, 7); g.fill(); });
    g.fillStyle = '#b9a2f7'; g.fillRect(w * 0.33, h * 0.18, w * 0.022, h * 0.16); g.fillStyle = '#ffd36b'; g.beginPath(); g.ellipse(w * 0.341, h * 0.15, w * 0.014, h * 0.03, 0, 0, 7); g.fill();
    spr.cake = c; }
  // tree with eyes (open / closed)
  { const s = R * 1.2;
    for (const closed of [0, 1]) {
      const c = mkCanvas(s * 0.7, s * 1.1), g = c.getContext('2d');
      g.fillStyle = '#e8b9a0'; g.fillRect(s * 0.33, s * 0.55, s * 0.05, s * 0.55);
      [[0.2, 0.46, 0.15], [0.5, 0.46, 0.16], [0.35, 0.3, 0.22], [0.35, 0.52, 0.15]].forEach(([x, y, r]) => { g.fillStyle = rad(g, s * x, s * y, s * r, '#fff', '#d9c8ff', '#c1a8f5'); g.beginPath(); g.arc(s * x, s * y, s * r, 0, 7); g.fill(); });
      const ex = [s * 0.27, s * 0.44], ey = s * 0.36, er = s * 0.065;
      if (!closed) {
        for (const x of ex) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, ey, er, er * 1.15, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(120,90,170,0.5)'; g.lineWidth = s * 0.008; g.stroke(); g.fillStyle = '#3d2a5c'; g.beginPath(); g.arc(x + er * 0.15, ey + er * 0.15, er * 0.55, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x - er * 0.05, ey - er * 0.1, er * 0.2, 0, 7); g.fill(); }
      } else {
        g.strokeStyle = '#3d2a5c'; g.lineWidth = s * 0.014; g.lineCap = 'round';
        for (const x of ex) { g.beginPath(); g.arc(x, ey - er * 0.2, er * 0.75, 0.25, Math.PI - 0.25); g.stroke(); }
      }
      g.fillStyle = 'rgba(255,140,190,0.55)'; for (const x of ex) { g.beginPath(); g.ellipse(x + (x < s * 0.35 ? -er * 0.6 : er * 0.6), ey + er * 1.4, er * 0.5, er * 0.28, 0, 0, 7); g.fill(); }
      g.strokeStyle = '#3d2a5c'; g.lineWidth = s * 0.01; g.beginPath(); g.arc(s * 0.355, s * 0.44, s * 0.03, 0.2, Math.PI - 0.2); g.stroke();
      spr[closed ? 'eyetreeC' : 'eyetree'] = c;
    } }
  // gummy bears (body without right arm), 3 colours
  { const s = R * 1.2;
    PAL.forEach((pc, i) => {
      const w = s * 0.5, h = s * 0.62, c = mkCanvas(w, h), g = c.getContext('2d');
      const col = pc.rgb, lc = pc.lrgb, dc = pc.drgb;
      const fillG = (y0, y1) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, rgbs(lc, 0.95)); gr.addColorStop(1, rgbs(col, 0.9)); return gr; };
      g.strokeStyle = rgbs(dc, 0.7); g.lineWidth = s * 0.01;
      const blob = (x, y, rx, ry) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); g.stroke(); };
      g.fillStyle = fillG(h * 0.3, h); blob(w * 0.36, h * 0.9, w * 0.12, h * 0.07); blob(w * 0.64, h * 0.9, w * 0.12, h * 0.07); // feet
      blob(w * 0.5, h * 0.7, w * 0.27, h * 0.22); // body
      blob(w * 0.25, h * 0.62, w * 0.08, h * 0.1); // left arm (static)
      g.fillStyle = fillG(0, h * 0.5); blob(w * 0.3, h * 0.14, w * 0.09, w * 0.09); blob(w * 0.7, h * 0.14, w * 0.09, w * 0.09); blob(w * 0.5, h * 0.32, w * 0.27, h * 0.2);
      g.fillStyle = rgbs(lc, 0.9); g.beginPath(); g.ellipse(w * 0.5, h * 0.38, w * 0.12, h * 0.07, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(w * 0.36, h * 0.24, w * 0.05, h * 0.04, -0.6, 0, 7); g.fill(); g.beginPath(); g.ellipse(w * 0.37, h * 0.64, w * 0.04, h * 0.08, -0.3, 0, 7); g.fill();
      g.fillStyle = rgbs(dc); g.beginPath(); g.arc(w * 0.4, h * 0.3, w * 0.03, 0, 7); g.arc(w * 0.6, h * 0.3, w * 0.03, 0, 7); g.fill();
      g.beginPath(); g.ellipse(w * 0.5, h * 0.36, w * 0.035, h * 0.02, 0, 0, 7); g.fill();
      g.strokeStyle = rgbs(dc); g.lineWidth = s * 0.008; g.beginPath(); g.arc(w * 0.5, h * 0.38, w * 0.05, 0.4, Math.PI - 0.4); g.stroke();
      spr['gummy' + i] = c;
    }); }
}
function drawStairs(g, P) {
  // floating candy staircase climbing into the sky (baked into the sky cache)
  const N = 9, dir = P.stDir, sw0 = W * 0.085, x0 = W * P.stX, y0 = horizonY * 0.86;
  const cols = [['#ffb3d3', '#f08cbc'], ['#ffffff', '#e8d8ee'], ['#a8f0d8', '#6fd3b4'], ['#ffffff', '#e8d8ee'], ['#d2c2ff', '#a58cf0']];
  let tp = null;
  for (let i = 0; i < N; i++) {
    const k = i / (N - 1), sc = lerp(1, 0.62, k), sw = sw0 * sc, rise = horizonY * 0.052 * sc, tread = sw * 0.32;
    const x = x0 + dir * (W * 0.032 * i), y = y0 - horizonY * 0.052 * i * lerp(1, 0.8, k);
    const [top, side] = cols[i % cols.length];
    // riser (front)
    g.fillStyle = side; rr(g, x - sw / 2, y - rise * 0.2, sw, rise, rise * 0.25); g.fill();
    // tread (top)
    g.fillStyle = top; g.beginPath(); g.moveTo(x - sw / 2, y - rise * 0.2); g.lineTo(x - sw / 2 + dir * tread * 0.6, y - rise * 0.2 - tread * 0.5); g.lineTo(x + sw / 2 + dir * tread * 0.6, y - rise * 0.2 - tread * 0.5); g.lineTo(x + sw / 2, y - rise * 0.2); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(190,110,170,0.55)'; g.lineWidth = 1; g.stroke();
    // little sugar drip under each step
    g.fillStyle = side; g.beginPath(); g.ellipse(x + sw * 0.2, y + rise * 0.85, sw * 0.04, rise * 0.25, 0, 0, 7); g.fill();
    tp = { x: x + dir * tread * 0.3, y: y - rise * 0.2 - tread * 0.25, s: sc };
  }
  // a little door at the top, standing on a cloud
  const dw = W * 0.034, dh = dw * 1.5, cx = tp.x + dir * dw * 1.1, cy = tp.y;
  g.fillStyle = 'rgba(255,255,255,0.95)'; [[-1.1, 0.25, 0.7], [0, 0.4, 0.9], [1.1, 0.25, 0.7]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(cx + dx * dw, cy + dy * dw, r * dw, 0, 7); g.fill(); });
  g.fillStyle = '#ffd36b'; rr(g, cx - dw / 2, cy - dh + dw * 0.15, dw, dh, dw * 0.5); g.fill(); g.strokeStyle = '#e9a640'; g.lineWidth = 1.2; g.stroke();
  g.fillStyle = '#ff8fbf'; const hx = cx, hy = cy - dh * 0.5, hr = dw * 0.16;
  g.beginPath(); g.moveTo(hx, hy + hr); g.bezierCurveTo(hx - hr * 2, hy - hr * 0.5, hx - hr * 0.6, hy - hr * 1.8, hx, hy - hr * 0.6); g.bezierCurveTo(hx + hr * 0.6, hy - hr * 1.8, hx + hr * 2, hy - hr * 0.5, hx, hy + hr); g.fill();
  g.fillStyle = '#c47a2a'; g.beginPath(); g.arc(cx + dw * 0.28, cy - dh * 0.32, dw * 0.06, 0, 7); g.fill();
  const lg = g.createRadialGradient(cx, cy - dh * 0.5, 1, cx, cy - dh * 0.5, dw * 1.6); lg.addColorStop(0, 'rgba(255,240,180,0.35)'); lg.addColorStop(1, 'rgba(255,240,180,0)'); g.fillStyle = lg; g.fillRect(cx - dw * 2, cy - dh * 1.5, dw * 4, dh * 2);
}
function drawDonutPlanet(g, P) {
  const x = W * P.donX, y = horizonY * P.donY, r = W * 0.085;
  // back half of the sugar ring
  g.save(); g.translate(x, y); g.rotate(-0.35);
  g.strokeStyle = 'rgba(255,240,200,0.55)'; g.lineWidth = r * 0.12; g.beginPath(); g.ellipse(0, 0, r * 1.75, r * 0.42, 0, Math.PI, Math.PI * 2); g.stroke();
  g.restore();
  // dough
  const dough = new Path2D(); dough.arc(x, y, r, 0, 7); dough.arc(x, y, r * 0.36, 0, 7, true);
  g.fillStyle = rad2(g, x, y, r, '#ffe2b8', '#f2b27a', '#d98d58'); g.fill(dough, 'evenodd');
  // icing
  const ic = new Path2D(); const n = 14;
  for (let k = 0; k <= n; k++) { const a = k / n * Math.PI * 2, rr2 = r * (0.86 + (k % 2 ? 0.06 : -0.02)); const px = x + Math.cos(a) * rr2, py = y + Math.sin(a) * rr2 * 0.98; k ? ic.lineTo(px, py) : ic.moveTo(px, py); }
  ic.closePath(); ic.arc(x, y, r * 0.46, 0, 7, true);
  g.fillStyle = P.donCol; g.fill(ic, 'evenodd');
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(x - r * 0.45, y - r * 0.45, r * 0.18, r * 0.07, -0.8, 0, 7); g.fill();
  const sc = ['#7ee3c4', '#fff', '#ffd36b', '#9fd4ff', '#b9a2f7'];
  g.lineCap = 'round'; g.lineWidth = Math.max(1.5, r * 0.06);
  for (let k = 0; k < 16; k++) { const a = k * 2.4, d = r * (0.56 + (k * 37 % 10) / 40); const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d, ang = k * 1.7; g.strokeStyle = sc[k % sc.length]; g.beginPath(); g.moveTo(px - Math.cos(ang) * r * 0.06, py - Math.sin(ang) * r * 0.06); g.lineTo(px + Math.cos(ang) * r * 0.06, py + Math.sin(ang) * r * 0.06); g.stroke(); }
  // front half of ring
  g.save(); g.translate(x, y); g.rotate(-0.35);
  g.strokeStyle = 'rgba(255,245,215,0.8)'; g.lineWidth = r * 0.12; g.beginPath(); g.ellipse(0, 0, r * 1.75, r * 0.42, 0, 0, Math.PI); g.stroke();
  g.restore();
}
function rad2(g, x, y, r, c0, c1, c2) { const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r); gr.addColorStop(0, c0); gr.addColorStop(0.55, c1); gr.addColorStop(1, c2); return gr; }
function drawSunFace(g, P, sx, sy, sr) {
  const ink = P.moon > 0.5 ? 'rgba(90,70,150,0.75)' : 'rgba(200,120,90,0.7)';
  g.strokeStyle = ink; g.lineWidth = Math.max(1.5, sr * 0.07); g.lineCap = 'round';
  for (const d of [-1, 1]) { g.beginPath(); g.arc(sx + d * sr * 0.34, sy - sr * 0.08, sr * 0.14, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
  g.beginPath(); g.arc(sx, sy + sr * 0.12, sr * 0.22, 0.25, Math.PI - 0.25); g.stroke();
  g.fillStyle = 'rgba(255,140,170,0.45)'; for (const d of [-1, 1]) { g.beginPath(); g.ellipse(sx + d * sr * 0.55, sy + sr * 0.15, sr * 0.14, sr * 0.08, 0, 0, 7); g.fill(); }
  if (P.moon > 0.5) { g.fillStyle = 'rgba(255,255,255,0.9)'; g.font = `700 ${Math.round(sr * 0.5)}px Fredoka, sans-serif`; g.textAlign = 'center'; g.fillText('z', sx + sr * 1.15, sy - sr * 0.75); g.font = `700 ${Math.round(sr * 0.35)}px Fredoka, sans-serif`; g.fillText('z', sx + sr * 1.5, sy - sr * 1.15); }
}
// live surreal sky actors
function drawSurrealSky(g, P, px) {
  // sky whale
  if (P.whale > 0.02) {
    const per = 52, k = ((t + 13) % per) / per, w = W * 0.36, h = w * spr.whale.height / spr.whale.width;
    const x = lerp(W * 1.25, -W * 0.45, k) + px * 0.03, y = horizonY * 0.3 + Math.sin(t * 0.5) * horizonY * 0.05;
    g.globalAlpha = P.whale * (1 - 0.3 * P.stars);
    g.save(); g.translate(x, y); g.rotate(Math.sin(t * 0.7) * 0.05); g.scale(1, 1 + Math.sin(t * 1.4) * 0.03); g.drawImage(spr.whale, -w / 2, -h / 2, w, h); g.restore();
    // spout of sparkles
    g.fillStyle = '#fff';
    for (let i = 0; i < 5; i++) { const e = ((t * 0.9 + i / 5) % 1), sx = x - w * 0.3 + Math.sin(i * 2.1) * e * w * 0.08, sy = y - h * 0.42 - e * h * 0.6; g.globalAlpha = P.whale * (1 - e) * 0.9; g.beginPath(); g.arc(sx, sy, 2 + (1 - e) * 2, 0, 7); g.fill(); }
    g.globalAlpha = 1;
  }
  // jellyfish balloons drifting upwards
  if (P.jelly > 0.02) {
    for (let i = 0; i < 3; i++) {
      const per = 26 + i * 7, k = ((t + i * 11) % per) / per;
      const x = W * (0.18 + i * 0.32) + Math.sin(t * 0.6 + i * 2) * W * 0.04 + px * 0.04, y = lerp(horizonY * 1.05, -horizonY * 0.25, k);
      const img = i % 2 ? spr.jelly2 : spr.jelly, w = W * (0.085 + i * 0.012), h = w * img.height / img.width;
      const pulse = 1 + Math.sin(t * 3 + i) * 0.06;
      g.globalAlpha = P.jelly * clamp(Math.min(k * 6, (1 - k) * 6), 0, 1);
      if (P.stars > 0.3) { const s = w * 2.2; g.globalAlpha *= 0.9; g.drawImage(spr.glow, x - s / 2, y - s / 2, s, s); g.globalAlpha = P.jelly * clamp(Math.min(k * 6, (1 - k) * 6), 0, 1); }
      g.strokeStyle = i % 2 ? 'rgba(150,230,210,0.85)' : 'rgba(255,170,215,0.85)'; g.lineWidth = Math.max(1.2, w * 0.05); g.lineCap = 'round';
      for (let tn = 0; tn < 4; tn++) {
        const bx = x - w * 0.3 + tn * w * 0.2; g.beginPath(); g.moveTo(bx, y + h * 0.4);
        for (let sg = 1; sg <= 5; sg++) g.lineTo(bx + Math.sin(t * 3 + sg * 0.9 + tn + i) * w * 0.07, y + h * 0.4 + sg * h * 0.28);
        g.stroke();
      }
      g.drawImage(img, x - w * pulse / 2, y - h / 2 - h * 0.1, w * pulse, h / pulse);
    }
    g.globalAlpha = 1;
  }
}
function drawSurrealFront(g, P, px) {
  // flying teacups (in front of hills, high above the road)
  if (P.cups > 0.02) {
    for (let i = 0; i < 2; i++) {
      const a = t * (0.16 + i * 0.05) + i * 3, x = W * (0.5 + 0.62 * Math.sin(a)) + px * 0.06, y = horizonY * (0.52 + 0.1 * Math.sin(a * 2.3 + i)) - i * horizonY * 0.08;
      const w = W * (0.11 - i * 0.02), h = w * spr.teacup.height / spr.teacup.width, flap = Math.sin(t * 12 + i * 2);
      g.globalAlpha = P.cups * (1 - 0.3 * P.stars);
      g.save(); g.translate(x, y); g.rotate(Math.cos(a) * 0.25); g.scale(1, 1 + flap * 0.05); g.drawImage(spr.teacup, -w / 2, -h / 2, w, h); g.restore();
      g.fillStyle = 'rgba(255,255,255,0.7)';
      for (let k = 0; k < 3; k++) { const e = (t * 0.8 + k / 3) % 1; g.globalAlpha = P.cups * (1 - e) * 0.7; g.beginPath(); g.arc(x + Math.sin(e * 6 + k) * w * 0.08, y - h * 0.15 - e * h * 0.8, w * 0.05 * (0.6 + e), 0, 7); g.fill(); }
    }
    g.globalAlpha = 1;
  }
}
// upward syrup waterfall from the cake island
function drawSyrupUp(g, x, y, w, h) {
  const top = y - h * 0.95, bx = x + w * 0.12, bw = w * 0.045;
  const gr = g.createLinearGradient(0, y, 0, top); gr.addColorStop(0, 'rgba(255,170,120,0.9)'); gr.addColorStop(0.7, 'rgba(255,200,150,0.55)'); gr.addColorStop(1, 'rgba(255,220,180,0)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(bx - bw, y);
  for (let k = 0; k <= 8; k++) { const yy = lerp(y, top, k / 8); g.lineTo(bx - bw * (1 - k * 0.06) + Math.sin(t * 4 + k) * bw * 0.25, yy); }
  for (let k = 8; k >= 0; k--) { const yy = lerp(y, top, k / 8); g.lineTo(bx + bw * (1 - k * 0.06) + Math.sin(t * 4 + k + 1.5) * bw * 0.25, yy); }
  g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,240,220,0.85)';
  for (let k = 0; k < 6; k++) { const e = (t * 0.7 + k / 6) % 1; g.beginPath(); g.ellipse(bx + Math.sin(k * 3 + t) * bw * 0.5, lerp(y, top, e), bw * 0.25 * (1 - e * 0.5), bw * 0.4 * (1 - e * 0.5), 0, 0, 7); g.fill(); }
  // splash ring at the base
  g.strokeStyle = 'rgba(255,190,140,0.8)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(bx, y, bw * (1.6 + Math.sin(t * 5) * 0.2), bw * 0.4, 0, 0, 7); g.stroke();
}

const skyCache = { th: [], frame: 0, set dirty(v) { if (v) for (const c of this.th) if (c) c.ok = false; } };
function skyFor(i) { const c = skyCache.th[i]; if (!c || !c.ok) renderSkyCache(i); return skyCache.th[i]; }
function ensureCanvas(c, w, h, opaque) { if (!c || c.width !== Math.round(w) || c.height !== Math.round(h)) { const n = mkCanvas(w, h); n.opaque = opaque; return n; } return c; }
function renderSkyCache(idx) {
  const P = THEMES[idx], k = DPR, C = skyCache.th[idx] || (skyCache.th[idx] = {}), Hh = horizonY + 4, x0 = W * 0.15;
  C.sky = ensureCanvas(C.sky, W * k, Hh * k);
  let g = C.sky.getContext('2d', { alpha: false }); g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, W, Hh);
  const sg = g.createLinearGradient(0, 0, 0, horizonY);
  sg.addColorStop(0, rgbs(P.sky[0])); sg.addColorStop(0.45, rgbs(P.sky[1])); sg.addColorStop(0.82, rgbs(P.sky[2])); sg.addColorStop(1, rgbs(P.sky[3]));
  g.fillStyle = sg; g.fillRect(0, 0, W, Hh);
  const sx = W * P.sunX, sy = horizonY * P.sunY, sr = W * P.sunR;
  const gl = g.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * (5.5 - 2 * P.moon));
  gl.addColorStop(0, rgbs(P.glow, 0.75 - 0.3 * P.moon)); gl.addColorStop(0.3, rgbs(P.glow, 0.3 - 0.18 * P.moon)); gl.addColorStop(1, rgbs(P.glow, 0));
  g.fillStyle = gl; g.fillRect(0, 0, W, Hh);
  if (P.rays > 0.02) {
    g.save(); g.translate(sx, sy); g.rotate(0.2);
    for (let i = 0; i < 10; i++) { g.rotate(Math.PI * 2 / 10); const rg = g.createLinearGradient(0, 0, W, 0); rg.addColorStop(0, rgbs(P.sun, 0.13 * P.rays)); rg.addColorStop(1, rgbs(P.sun, 0)); g.fillStyle = rg; g.beginPath(); g.moveTo(0, 0); g.lineTo(W * 1.1, -W * 0.08); g.lineTo(W * 1.1, W * 0.08); g.closePath(); g.fill(); }
    g.restore();
  }
  if (P.rainbow > 0.02) {
    const rc = ['#ff9cc8', '#ffc29a', '#fff1a0', '#a8f0c8', '#9fd4ff', '#c4a8ff'];
    const cx = W * 0.62, cy = horizonY + W * 0.05, R0 = W * 0.62;
    g.lineWidth = W * 0.022; g.globalAlpha = 0.38 * P.rainbow;
    rc.forEach((c, i) => { g.strokeStyle = c; g.beginPath(); g.arc(cx, cy, R0 - i * W * 0.021, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); });
    g.globalAlpha = 1;
  }
  const dg = g.createRadialGradient(sx - sr * 0.3, sy - sr * 0.3, sr * 0.1, sx, sy, sr);
  dg.addColorStop(0, '#ffffff'); dg.addColorStop(1, rgbs(P.sun));
  g.fillStyle = dg; g.beginPath(); g.arc(sx, sy, sr, 0, 7); g.fill();
  if (P.moon > 0.02) {
    g.fillStyle = `rgba(200,185,240,${0.55 * P.moon})`;
    [[0.3, -0.2, 0.22], [-0.35, 0.25, 0.15], [0.1, 0.45, 0.12], [-0.2, -0.45, 0.1]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(sx + dx * sr, sy + dy * sr, r * sr, 0, 7); g.fill(); });
  }
  drawSunFace(g, P, sx, sy, sr);
  if (P.donut) drawDonutPlanet(g, P);
  // far frosting mountains baked into the sky
  { const m1g = g.createLinearGradient(0, land.m1top, 0, horizonY); m1g.addColorStop(0, rgbs(P.m1[0])); m1g.addColorStop(1, rgbs(P.m1[1])); g.fillStyle = m1g; g.fill(land.m1); g.fillStyle = rgbs(P.frost, 0.92); g.fill(land.cap); }
  if (P.stairs) drawStairs(g, P);
  // hills layer (cropped to its band, wider than screen for parallax)
  const top = horizonY * 0.74; skyCache.hTop = top;
  C.hills = ensureCanvas(C.hills, W * 1.3 * k, (Hh - top) * k);
  const c = C.hills.getContext('2d'); c.setTransform(k, 0, 0, k, x0 * k, -top * k); c.clearRect(-x0, top, W * 1.3, Hh - top);
  const m2g = c.createLinearGradient(0, horizonY * 0.8, 0, horizonY); m2g.addColorStop(0, rgbs(P.m2[0])); m2g.addColorStop(1, rgbs(P.m2[1])); c.fillStyle = m2g; c.fill(land.m2);
  const m3g = c.createLinearGradient(0, horizonY * 0.9, 0, horizonY); m3g.addColorStop(0, rgbs(P.m3[0])); m3g.addColorStop(1, rgbs(P.m3[1])); c.fillStyle = m3g; c.fill(land.m3);
  C.ok = true;
}
function drawSky(g) {
  const P = TP, px = -mochi.x * laneW, Hh = horizonY + 4;
  skyCache.frame++;
  const cTo = skyFor(themeTo), cFrom = themeMix < 1 ? skyFor(themeFromIdx) : null;
  const fe = themeMix * themeMix * (3 - 2 * themeMix);
  if (cFrom) { g.drawImage(cFrom.sky, 0, 0, W, Hh); g.globalAlpha = fe; }
  g.drawImage(cTo.sky, 0, 0, W, Hh); g.globalAlpha = 1;
  // stars
  if (P.stars > 0.02) {
    g.fillStyle = '#fffbe8';
    for (const s of land.stars) {
      const a = P.stars * (0.45 + 0.55 * Math.sin(t * s.sp + s.ph)); if (a <= 0.03) continue;
      g.globalAlpha = a; const x = s.x * W, y = s.y * horizonY;
      if (s.r > 1.5) { g.beginPath(); g.moveTo(x, y - s.r * 2.5); g.lineTo(x + s.r * 0.5, y); g.lineTo(x, y + s.r * 2.5); g.lineTo(x - s.r * 0.5, y); g.closePath(); g.moveTo(x - s.r * 2.5, y); g.lineTo(x, y + s.r * 0.5); g.lineTo(x + s.r * 2.5, y); g.lineTo(x, y - s.r * 0.5); g.closePath(); g.fill(); }
      else g.fillRect(x - s.r / 2, y - s.r / 2, s.r, s.r);
    }
    g.globalAlpha = 1;
  }
  // aurora
  if (P.aurora > 0.02) {
    for (let b = 0; b < 2; b++) {
      const yb = horizonY * (0.22 + b * 0.16), th = horizonY * 0.18;
      const ag = g.createLinearGradient(0, yb - th, 0, yb + th);
      const c1 = b ? [255, 150, 220] : [130, 255, 210];
      ag.addColorStop(0, rgbs(c1, 0)); ag.addColorStop(0.5, rgbs(c1, 0.32 * P.aurora)); ag.addColorStop(1, rgbs([180, 160, 255], 0));
      g.fillStyle = ag; g.beginPath();
      const N = 14;
      for (let k = 0; k <= N; k++) { const x = k / N * W, y = yb - th + Math.sin(k * 0.9 + t * 0.6 + b * 2) * th * 0.35; k ? g.lineTo(x, y) : g.moveTo(x, y); }
      for (let k = N; k >= 0; k--) { const x = k / N * W, y = yb + th * 0.6 + Math.sin(k * 1.1 + t * 0.5 + b) * th * 0.3; g.lineTo(x, y); }
      g.closePath(); g.fill();
    }
  }
  // far clouds
  g.globalAlpha = 0.85 * (1 - 0.72 * P.stars);
  for (const c of land.clouds) {
    const w = W * 0.42 * c.s, h = w * spr.cloud.height / spr.cloud.width;
    const x = ((c.x * W + t * c.sp + px * 0.02) % (W * 1.4)) - W * 0.2 - w / 2, y = c.y * horizonY;
    g.drawImage(spr.cloud, x, y, w, h);
  }
  g.globalAlpha = 1;
  drawSurrealSky(g, P, px);
  g.globalAlpha = P.island * (1 - 0.35 * P.stars);
  land.islands.forEach((isl, i) => {
    const img = i === 0 ? spr.cake : spr.island;
    const w = W * (i === 0 ? 0.24 : 0.34) * isl.s, h = w * img.height / img.width;
    const x = ((isl.x * W + t * isl.sp + px * 0.05) % (W * 1.5)) - W * 0.25 - w / 2;
    const y = isl.y * horizonY + Math.sin(t * 0.8 + isl.x * 9) * 5 - h * 0.3;
    if (i === 0) drawSyrupUp(g, x + w * 0.5, y + h * 0.3, w, h);
    g.drawImage(img, x, y, w, h);
  });
  g.globalAlpha = 1;
  { const hx = Math.round((-W * 0.15 + px * 0.07) * DPR) / DPR; if (cFrom) { g.drawImage(cFrom.hills, hx, skyCache.hTop, W * 1.3, Hh - skyCache.hTop); g.globalAlpha = fe; } g.drawImage(cTo.hills, hx, skyCache.hTop, W * 1.3, Hh - skyCache.hTop); g.globalAlpha = 1; }
  for (const gi of land.giants) {
    const img = gi.alt ? spr.giant2 : spr.giant, h = horizonY * 0.22 * gi.s, w = h * img.width / img.height;
    const x = gi.x * W + px * 0.08, y = horizonY + 2;
    g.save(); g.translate(x, y); g.rotate(Math.sin(t * 0.9 + gi.ph) * 0.03); g.drawImage(img, -w / 2, -h, w, h); g.restore();
  }
  drawSurrealFront(g, P, px);
  if (P.bugs > 0.05) {
    g.globalAlpha = P.bugs;
    for (const b of land.bugs) {
      const span = W + 80, x = ((t * b.sp + b.ph * 37) % span) - 40, y = horizonY * b.y + Math.sin(t * 2 + b.ph) * 12;
      const f = Math.abs(Math.sin(t * 14 + b.ph));
      g.fillStyle = b.col; g.beginPath(); g.ellipse(x - 3 * f, y - 2, 4 * f + 0.5, 3, -0.4, 0, 7); g.ellipse(x + 3 * f, y - 2, 4 * f + 0.5, 3, 0.4, 0, 7); g.fill();
      g.fillStyle = b.c2; g.beginPath(); g.ellipse(x - 2 * f, y + 2, 2.5 * f + 0.4, 2, -0.3, 0, 7); g.ellipse(x + 2 * f, y + 2, 2.5 * f + 0.4, 2, 0.3, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
  }
}
function drawMotes(g) {
  const P = TP;
  const fire = P.fire, sp = P.sparkle;
  if (fire < 0.03 && sp < 0.03) return;
  for (const m of land.motes) {
    const tw = 0.5 + 0.5 * Math.sin(t * 3 + m.ph);
    if (fire > 0.03) {
      const s = (10 + m.r * 6) * (0.7 + tw * 0.5);
      g.globalAlpha = fire * (0.35 + tw * 0.6); g.drawImage(spr.glow, m.x - s / 2, m.y - s / 2, s, s);
    }
    if (sp > 0.03) { g.globalAlpha = sp * tw * 0.8; g.fillStyle = '#fff'; const r = m.r * 1.6; g.beginPath(); g.moveTo(m.x, m.y - r * 2); g.quadraticCurveTo(m.x, m.y, m.x + r * 2, m.y); g.quadraticCurveTo(m.x, m.y, m.x, m.y + r * 2); g.quadraticCurveTo(m.x, m.y, m.x - r * 2, m.y); g.quadraticCurveTo(m.x, m.y, m.x, m.y - r * 2); g.fill(); }
  }
  g.globalAlpha = 1;
}
function updateMotes(dt) {
  for (const m of land.motes) {
    m.x += (m.vx + Math.sin(t + m.ph) * 8) * dt; m.y += m.vy * dt;
    if (m.y < -10) { m.y = H * rnd(0.5, 0.85); m.x = Math.random() * W; }
    if (m.x < -10) m.x = W + 5; if (m.x > W + 10) m.x = -5;
  }
}
function drawWorld(g) {
  const P = TP;
  drawSky(g);
  // ground
  const gg = g.createLinearGradient(0, horizonY, 0, H);
  gg.addColorStop(0, rgbs(P.ground[0])); gg.addColorStop(1, rgbs(P.ground[1]));
  g.fillStyle = gg; g.fillRect(0, horizonY, W, H - horizonY);
  const Pd = 4, off = dist % (Pd * 2);
  g.fillStyle = `rgba(255,255,255,${0.12 * (1 - 0.65 * P.stars)})`;
  for (let k = 0; k < 40; k++) {
    const z0 = k * Pd * 2 - off - 3, z1 = z0 + Pd;
    if (z0 > FAR + 20) break; if (z1 <= -2.5) continue;
    const a = proj(0, Math.max(z0, -2.5)), b = proj(0, z1);
    g.fillRect(0, b.y, W, a.y - b.y);
  }
  // road
  const RH = 1.55;
  const n0 = proj(-RH, -2.8), n1 = proj(RH, -2.8);
  const rg = g.createLinearGradient(0, horizonY, 0, H);
  rg.addColorStop(0, rgbs(mix(P.road, P.fog, 0.4))); rg.addColorStop(1, rgbs(P.road));
  g.fillStyle = rg;
  g.beginPath(); g.moveTo(W / 2, horizonY); g.lineTo(n1.x, n1.y); g.lineTo(n0.x, n0.y); g.closePath(); g.fill();
  g.fillStyle = rgbs(P.tile, 0.35);
  for (let k = 0; k < 40; k++) {
    const z0 = k * Pd * 2 - off - 3, z1 = z0 + Pd; if (z0 > FAR + 20) break; if (z1 <= -2.8) continue;
    const a0 = proj(-RH, Math.max(z0, -2.8)), a1 = proj(RH, Math.max(z0, -2.8)), b0 = proj(-RH, z1), b1 = proj(RH, z1);
    g.beginPath(); g.moveTo(a0.x, a0.y); g.lineTo(a1.x, a1.y); g.lineTo(b1.x, b1.y); g.lineTo(b0.x, b0.y); g.closePath(); g.fill();
  }
  // glossy sheen on the road (reflection band)
  const sh0 = proj(-RH, 1.2), sh1 = proj(RH, 1.2), sh2 = proj(RH, -1.5), sh3 = proj(-RH, -1.5);
  const shg = g.createLinearGradient(0, sh0.y, 0, sh2.y);
  shg.addColorStop(0, 'rgba(255,255,255,0)'); shg.addColorStop(0.5, 'rgba(255,255,255,0.28)'); shg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = shg; g.beginPath(); g.moveTo(sh0.x, sh0.y); g.lineTo(sh1.x, sh1.y); g.lineTo(sh2.x, sh2.y); g.lineTo(sh3.x, sh3.y); g.closePath(); g.fill();
  // candy curbs (glossy)
  const CP = 1.6;
  for (const side of [-1, 1]) {
    for (let k = 0; k < 90; k++) {
      const z0 = k * CP - (dist % (CP * 2)) - 3.2, z1 = z0 + CP; if (z0 > FAR + 10) break;
      const za = Math.max(z0, -2.8), zb = z1; if (zb < -2.8) continue;
      const a0 = proj(side * RH, za), a1 = proj(side * (RH + 0.24), za), b0 = proj(side * RH, zb), b1 = proj(side * (RH + 0.24), zb);
      g.fillStyle = (k % 2) === 0 ? '#ff94c4' : '#ffffff';
      g.beginPath(); g.moveTo(a0.x, a0.y); g.lineTo(a1.x, a1.y); g.lineTo(b1.x, b1.y); g.lineTo(b0.x, b0.y); g.closePath(); g.fill();
    }
    // gloss line and inner shadow along the curb
    const f0 = proj(side * (RH + 0.07), -2.8), f1 = proj(side * (RH + 0.16), -2.8);
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.beginPath(); g.moveTo(W / 2, horizonY); g.lineTo(f1.x, f1.y); g.lineTo(f0.x, f0.y); g.closePath(); g.fill();
    const o0 = proj(side * (RH + 0.24), -2.8), o1 = proj(side * (RH + 0.3), -2.8);
    g.fillStyle = 'rgba(120,60,130,0.14)';
    g.beginPath(); g.moveTo(W / 2, horizonY); g.lineTo(o1.x, o1.y); g.lineTo(o0.x, o0.y); g.closePath(); g.fill();
  }
  // lane dashes
  g.fillStyle = P.stars > 0.5 ? 'rgba(200,170,255,0.85)' : 'rgba(232,180,215,0.75)';
  const LP = 3.2, loff = dist % LP;
  for (const lx of [-0.5, 0.5]) {
    for (let k = 0; k < 30; k++) {
      const z0 = k * LP - loff - 3, z1 = z0 + 1.5; if (z0 > FAR) break; if (z1 < -2.8) continue;
      const za = Math.max(z0, -2.8);
      const a0 = proj(lx - 0.035, za), a1 = proj(lx + 0.035, za), b0 = proj(lx - 0.035, z1), b1 = proj(lx + 0.035, z1);
      g.beginPath(); g.moveTo(a0.x, a0.y); g.lineTo(a1.x, a1.y); g.lineTo(b1.x, b1.y); g.lineTo(b0.x, b0.y); g.closePath(); g.fill();
    }
  }
  // horizon haze
  const hz = g.createLinearGradient(0, horizonY - horizonY * 0.08, 0, horizonY + (baseY - horizonY) * 0.2);
  hz.addColorStop(0, rgbs(P.fog, 0)); hz.addColorStop(0.35, rgbs(P.fog, 0.85)); hz.addColorStop(1, rgbs(P.fog, 0));
  g.fillStyle = hz; g.fillRect(0, horizonY - horizonY * 0.08, W, horizonY * 0.08 + (baseY - horizonY) * 0.2);
}

// ================= Colour selector (jelly drops) =================
const sel = { sc: [1, 1, 1], v: [0, 0, 0], R: 30, pos: [], hintCol: -1 };
function layoutSelector() {
  sel.R = clamp(Math.min(W, 480) * 0.075, 24, 34);
  const cy = H - safeBottom - Math.max(sel.R * 1.5 + 8, H * 0.055);
  const gap = clamp(Math.min(W, 480) * 0.25, sel.R * 2.6, 110);
  sel.pos = [0, 1, 2].map(i => ({ x: W / 2 + (i - 1) * gap, y: cy }));
}
function selectorHit(x, y) {
  if (state !== 'play') return -1;
  for (let i = 0; i < NC; i++) { const p = sel.pos[i]; if (Math.hypot(x - p.x, y - (p.y - sel.R * 0.15)) < sel.R * 1.5 + 6) return i; }
  return -1;
}
function updateSelector(dt) {
  for (let i = 0; i < NC; i++) {
    const tgt = i === mochi.color ? 1.28 : 0.86;
    sel.v[i] += ((tgt - sel.sc[i]) * 260 - sel.v[i] * 12) * dt; sel.sc[i] += sel.v[i] * dt;
  }
  // next wall colour in Mochi's lane (subtle hint)
  sel.hintCol = -1;
  const li = clamp(Math.round(mochi.x), -1, 1);
  let best = null; for (const r of rows) if (!r.done && r.z > 0 && r.z < 40 && (!best || r.z < best.z)) best = r;
  if (best) { const c = best.cells[li + 1]; if (c.t === 'w') sel.hintCol = c.c; }
}
function dropPath(g, x, y, r) {
  g.beginPath(); g.moveTo(x, y - r * 1.32);
  g.bezierCurveTo(x + r * 0.32, y - r * 0.9, x + r, y - r * 0.5, x + r, y + r * 0.02);
  g.arc(x, y + r * 0.02, r, 0, Math.PI);
  g.bezierCurveTo(x - r, y - r * 0.5, x - r * 0.32, y - r * 0.9, x, y - r * 1.32); g.closePath();
}
const dropSpr = {};
function buildDropSprites() {
  const R = sel.R * 1.3, k = Math.min(DPR, 2);
  for (let i = 0; i < NC; i++) {
    const pc = PAL[i], w = R * 2.4, h = R * 2.8, c = mkCanvas(w * k, h * k), g = c.getContext('2d');
    g.scale(k, k); const x = w / 2, y = h * 0.56, r = R;
    dropPath(g, x, y, r);
    const bg = g.createRadialGradient(x - r * 0.35, y - r * 0.55, r * 0.1, x, y, r * 1.35);
    bg.addColorStop(0, rgbs(pc.lrgb)); bg.addColorStop(0.5, rgbs(pc.rgb)); bg.addColorStop(1, rgbs(pc.drgb));
    g.fillStyle = bg; g.fill(); g.lineWidth = 2.2; g.strokeStyle = rgbs(pc.dprgb, 0.55); g.stroke();
    const ig = g.createRadialGradient(x, y + r * 0.45, 0, x, y + r * 0.45, r * 0.7);
    ig.addColorStop(0, rgbs(pc.lrgb, 0.7)); ig.addColorStop(1, rgbs(pc.lrgb, 0));
    g.fillStyle = ig; dropPath(g, x, y, r); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.ellipse(x - r * 0.42, y - r * 0.38, r * 0.16, r * 0.3, 0.5, 0, 7); g.fill();
    g.beginPath(); g.arc(x - r * 0.5, y + r * 0.12, r * 0.07, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(x + r * 0.45, y - r * 0.1, r * 0.05, 0, 7); g.fill();
    const gs = R * 4.4, gc = mkCanvas(gs * k / 2, gs * k / 2), gg = gc.getContext('2d');
    const gl = gg.createRadialGradient(gc.width / 2, gc.height / 2, gc.width * 0.14, gc.width / 2, gc.height / 2, gc.width / 2);
    gl.addColorStop(0, rgbs(pc.rgb, 0.6)); gl.addColorStop(1, rgbs(pc.rgb, 0)); gg.fillStyle = gl; gg.fillRect(0, 0, gc.width, gc.height);
    dropSpr[i] = { c, w, h, oy: y, R, glow: gc, gs };
  }
}
function drawSelector(g) {
  if (state !== 'play' && state !== 'dying') return;
  const vis = state === 'dying' ? clamp(1 - deathT * 2, 0, 1) : clamp(stateT * 3, 0, 1);
  if (vis <= 0) return;
  g.save(); g.globalAlpha = vis;
  // soft tray behind
  const p0 = sel.pos[0], p2 = sel.pos[2], R = sel.R;
  g.fillStyle = 'rgba(255,255,255,0.28)';
  rr(g, p0.x - R * 1.7, p0.y - R * 1.95, p2.x - p0.x + R * 3.4, R * 3.35, R * 1.6); g.fill();
  const tutTap = tutStep >= 0 && TUT[tutStep] && TUT[tutStep].need === 'tap';
  for (let i = 0; i < NC; i++) {
    const p = sel.pos[i], pc = PAL[i], act = i === mochi.color, s = sel.sc[i], r = R * s;
    const x = p.x, y = p.y + (act ? Math.sin(t * 5) * 1.5 : 0);
    // shadow
    g.fillStyle = 'rgba(120,60,130,0.18)'; g.beginPath(); g.ellipse(x, p.y + R * 1.1, r * 0.8, r * 0.18, 0, 0, 7); g.fill();
    const ds = dropSpr[i];
    if (act) {
      const gsz = ds.gs * (r / ds.R); g.drawImage(ds.glow, x - gsz / 2, y - r * 0.1 - gsz / 2, gsz, gsz);
      const pulse = 0.5 + 0.5 * Math.sin(t * 6);
      g.strokeStyle = `rgba(255,255,255,${0.75 + pulse * 0.25})`; g.lineWidth = 3;
      g.beginPath(); g.arc(x, y - r * 0.12, r * (1.42 + pulse * 0.06), 0, 7); g.stroke();
      g.strokeStyle = rgbs(pc.drgb, 0.7); g.lineWidth = 1.5;
      g.beginPath(); g.arc(x, y - r * 0.12, r * (1.42 + pulse * 0.06) + 2.5, 0, 7); g.stroke();
    }
    // hint: the next wall in your lane has this colour
    if (!act && (sel.hintCol === i || (tutTap && sel.hintCol === i))) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 9);
      g.strokeStyle = rgbs(pc.lrgb, (tutTap ? 0.9 : 0.55) * (0.5 + pulse * 0.5)); g.lineWidth = tutTap ? 4 : 2.5; g.setLineDash([5, 4]);
      g.beginPath(); g.arc(x, y - r * 0.12, r * 1.55 + pulse * 3, 0, 7); g.stroke(); g.setLineDash([]);
      // little bobbing chevron
      const cy = y - r * 1.95 - pulse * 4;
      g.fillStyle = rgbs(pc.drgb, 0.85); g.beginPath(); g.moveTo(x - 7, cy - 4); g.lineTo(x + 7, cy - 4); g.lineTo(x, cy + 4); g.closePath(); g.fill();
    }
    // drop body (pre-rendered jelly sprite)
    { const f = r / ds.R; g.globalAlpha = vis * (act ? 1 : 0.9); g.drawImage(ds.c, x - ds.w * f / 2, y - ds.oy * f, ds.w * f, ds.h * f); }
    // face
    const fy = y + r * 0.12, ex = r * 0.28;
    if (act) {
      const bl = mochi.blink > 0.85;
      for (const sd of [-1, 1]) {
        const cx = x + sd * ex;
        if (bl) { g.strokeStyle = '#3d2348'; g.lineWidth = Math.max(1.5, r * 0.06); g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - r * 0.1, fy); g.lineTo(cx + r * 0.1, fy); g.stroke(); continue; }
        g.fillStyle = '#2c1838'; g.beginPath(); g.ellipse(cx, fy, r * 0.12, r * 0.15, 0, 0, 7); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(cx - r * 0.04, fy - r * 0.06, r * 0.05, 0, 7); g.fill();
        g.beginPath(); g.arc(cx + r * 0.05, fy + r * 0.06, r * 0.022, 0, 7); g.fill();
      }
      g.fillStyle = 'rgba(255,110,150,0.5)';
      g.beginPath(); g.ellipse(x - r * 0.5, fy + r * 0.2, r * 0.11, r * 0.065, 0, 0, 7); g.ellipse(x + r * 0.5, fy + r * 0.2, r * 0.11, r * 0.065, 0, 0, 7); g.fill();
      g.fillStyle = '#7a2a48'; g.beginPath(); g.arc(x, fy + r * 0.16, r * 0.09, 0, Math.PI); g.fill();
      // tiny ears peeking
    } else {
      g.strokeStyle = rgbs(pc.dprgb, 0.75); g.lineWidth = Math.max(1.5, r * 0.07); g.lineCap = 'round';
      for (const sd of [-1, 1]) { g.beginPath(); g.arc(x + sd * ex, fy - r * 0.02, r * 0.09, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
      g.beginPath(); g.arc(x, fy + r * 0.16, r * 0.06, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke();
    }
    g.globalAlpha = vis;
  }
  g.restore();
}

// ================= Characters =================
// unlock = best score needed. shape: wf/hf body size factors, top = roundness of the head.
const CH = [
  { id: 'mochi', name: 'Mochi', unlock: 0, ears: 'bunny', acc: null, inner: null, shape: { wf: 1, hf: 1, top: 0.36 },
    desc: 'Una bolita de gelatina curiosa y saltarina. ¡La de siempre!', interior: 'burbujitas' },
  { id: 'tiovivo', name: 'Tiovivo', unlock: 3000, ears: 'bear', acc: 'flag', inner: 'carousel', shape: { wf: 1.08, hf: 0.92, top: 0.42 },
    desc: 'Lleva una feria dentro y siempre está dando vueltas a las cosas.', interior: 'un tiovivo con caballitos' },
  { id: 'atomo', name: 'Átomo', unlock: 6000, ears: 'antenna', acc: null, inner: 'atom', shape: { wf: 0.96, hf: 1.04, top: 0.34 },
    desc: 'Pequeñito pero lleno de energía. Sus electrones no se están quietos.', interior: 'un átomo con electrones' },
  { id: 'cosmo', name: 'Cosmo', unlock: 10000, ears: 'none', acc: 'ring', inner: 'solar', shape: { wf: 1.02, hf: 1, top: 0.46 },
    desc: 'Tiene el sistema solar en la barriga. Muy soñador.', interior: 'el sistema solar' },
  { id: 'copito', name: 'Copito', unlock: 15000, ears: 'none', acc: 'beanie', inner: 'snow', shape: { wf: 1.04, hf: 0.97, top: 0.44 },
    desc: 'Una bola de nieve con patas. Le encantan el frío y los abrazos.', interior: 'una bola de nieve' },
  { id: 'burbuja', name: 'Burbuja', unlock: 22000, ears: 'fins', acc: null, inner: 'aquarium', shape: { wf: 1.04, hf: 0.98, top: 0.4 },
    desc: 'Un acuario andante con un pececito muy cotilla.', interior: 'un acuario con peces' },
  { id: 'lava', name: 'Lava', unlock: 30000, ears: 'none', acc: 'lampcap', inner: 'lava', shape: { wf: 0.9, hf: 1.12, top: 0.26 },
    desc: 'Tranquilo y retro. Sus burbujas de lava suben y bajan sin prisa.', interior: 'una lámpara de lava' },
  { id: 'tictac', name: 'Tictac', unlock: 40000, ears: 'bear', acc: 'key', inner: 'gears', shape: { wf: 1, hf: 1, top: 0.38 },
    desc: 'Puntual como nadie. Si pegas la oreja, hace tic-tac.', interior: 'engranajes de reloj' },
  { id: 'trueno', name: 'Trueno', unlock: 55000, ears: 'horns', acc: null, inner: 'storm', shape: { wf: 1, hf: 1.02, top: 0.4 },
    desc: 'Lleva una tormenta dentro… ¡pero es un trozo de pan!', interior: 'una tormenta con rayos' },
  { id: 'disco', name: 'Disco', unlock: 75000, ears: 'cat', acc: 'shades', inner: 'disco', shape: { wf: 1.02, hf: 1, top: 0.4 },
    desc: 'La fiesta va con él. ¡Que no pare la música!', interior: 'una bola de discoteca' },
];
const NCH = CH.length;
const fmtN = n => Math.round(n).toLocaleString('es-ES');
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

function gearPath(g, x, y, r, teeth, rot) {
  g.beginPath();
  const n = teeth * 4;
  for (let i = 0; i <= n; i++) {
    const a = rot + i / n * Math.PI * 2, k = i % 4, rr = (k === 1 || k === 2) ? r : r * 0.8;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    i ? g.lineTo(px, py) : g.moveTo(px, py);
  }
  g.closePath();
}
// Interior animations. Local coords: origin at feet, y negative up. T = time.
const INNER = {
  carousel(g, w, h, T) {
    const cx = 0, cy = -h * 0.36, R = w * 0.3;
    const gl = g.createRadialGradient(cx, cy, 0, cx, cy, R * 1.5); gl.addColorStop(0, 'rgba(255,240,190,0.75)'); gl.addColorStop(1, 'rgba(255,240,190,0)');
    g.fillStyle = gl; g.fillRect(-w, -h, w * 2, h);
    // platform
    g.fillStyle = '#e9a94e'; g.beginPath(); g.ellipse(cx, cy + R * 0.66, R * 1.02, R * 0.26, 0, 0, 7); g.fill();
    g.fillStyle = '#ffd36b'; g.beginPath(); g.ellipse(cx, cy + R * 0.58, R, R * 0.24, 0, 0, 7); g.fill();
    const horses = [];
    for (let i = 0; i < 4; i++) {
      const a = T * 1.3 + i * Math.PI / 2, depth = Math.sin(a);
      horses.push({ a, depth, x: cx + Math.cos(a) * R * 0.78, y: cy + R * 0.12 + Math.sin(T * 4.5 + i * 1.7) * R * 0.12, col: ['#ff9cc8', '#7ee3c4', '#b9a2f7', '#ffb98a'][i] });
    }
    const drawHorse = hs => {
      const sc = 0.72 + 0.28 * (hs.depth + 1) / 2, dir = -Math.sin(hs.a) >= 0 ? 1 : -1;
      g.globalAlpha *= hs.depth < 0 ? 0.75 : 1;
      g.strokeStyle = '#fff6d8'; g.lineWidth = Math.max(1, R * 0.05); g.beginPath(); g.moveTo(hs.x, cy - R * 0.5); g.lineTo(hs.x, cy + R * 0.58); g.stroke();
      g.fillStyle = hs.col; g.beginPath(); g.ellipse(hs.x, hs.y, R * 0.24 * sc, R * 0.13 * sc, 0, 0, 7); g.fill();
      g.beginPath(); g.ellipse(hs.x + dir * R * 0.22 * sc, hs.y - R * 0.12 * sc, R * 0.08 * sc, R * 0.12 * sc, dir * 0.5, 0, 7); g.fill();
      g.strokeStyle = hs.col; g.lineWidth = R * 0.05 * sc; g.lineCap = 'round'; g.beginPath();
      g.moveTo(hs.x - R * 0.12 * sc, hs.y + R * 0.08 * sc); g.lineTo(hs.x - R * 0.16 * sc, hs.y + R * 0.22 * sc);
      g.moveTo(hs.x + R * 0.12 * sc, hs.y + R * 0.08 * sc); g.lineTo(hs.x + R * 0.16 * sc, hs.y + R * 0.22 * sc); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(hs.x - dir * R * 0.25 * sc, hs.y - R * 0.04, R * 0.05 * sc, 0, 7); g.fill();
      g.globalAlpha /= hs.depth < 0 ? 0.75 : 1;
    };
    horses.filter(hs => hs.depth < 0).forEach(drawHorse);
    g.fillStyle = '#fff'; g.fillRect(cx - R * 0.06, cy - R * 0.55, R * 0.12, R * 1.15);
    g.fillStyle = '#ff9cc8'; for (let k = 0; k < 5; k++) g.fillRect(cx - R * 0.06, cy - R * 0.45 + k * R * 0.22, R * 0.12, R * 0.08);
    horses.filter(hs => hs.depth >= 0).forEach(drawHorse);
    // canopy with rotating stripes
    const by = cy - R * 0.52, ay = cy - R * 1.05;
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(cx - R * 1.05, by); g.lineTo(cx, ay); g.lineTo(cx + R * 1.05, by); g.closePath(); g.fill();
    g.fillStyle = '#ff8fbf';
    for (let k = 0; k < 8; k++) {
      const a0 = k / 8 * Math.PI * 2 + T * 1.3, a1 = a0 + Math.PI / 8;
      if (Math.sin(a0 + Math.PI / 16) < 0) continue;
      g.beginPath(); g.moveTo(cx, ay); g.lineTo(cx + Math.cos(a0) * R * 1.05, by); g.lineTo(cx + Math.cos(a1) * R * 1.05, by); g.closePath(); g.fill();
    }
    for (let k = 0; k < 7; k++) {
      const x = cx - R * 0.9 + k * R * 0.3; g.fillStyle = k % 2 ? '#ffd36b' : '#ff8fbf'; g.beginPath(); g.arc(x, by, R * 0.13, 0, Math.PI); g.fill();
      g.fillStyle = `rgba(255,255,220,${0.5 + 0.5 * Math.sin(T * 6 + k)})`; g.beginPath(); g.arc(x, by + R * 0.16, R * 0.04, 0, 7); g.fill();
    }
  },
  atom(g, w, h, T) {
    const cx = 0, cy = -h * 0.34, R = w * 0.34;
    const gl = g.createRadialGradient(cx, cy, 0, cx, cy, R * 1.3); gl.addColorStop(0, 'rgba(200,240,255,0.7)'); gl.addColorStop(1, 'rgba(200,240,255,0)');
    g.fillStyle = gl; g.fillRect(-w, -h, w * 2, h);
    g.lineWidth = Math.max(1, w * 0.012);
    for (let i = 0; i < 3; i++) {
      g.save(); g.translate(cx, cy); g.rotate(i * Math.PI / 3 + T * 0.15);
      g.strokeStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(0, 0, R, R * 0.3, 0, 0, 7); g.stroke();
      for (let k = 0; k < 5; k++) {
        const e = T * (2.4 + i * 0.35) + i * 2.1 - k * 0.12;
        const ex = Math.cos(e) * R, ey = Math.sin(e) * R * 0.3;
        g.fillStyle = k ? `rgba(120,220,255,${0.4 - k * 0.07})` : '#5fd0ff';
        g.beginPath(); g.arc(ex, ey, w * (k ? 0.03 - k * 0.004 : 0.042), 0, 7); g.fill();
        if (!k) { g.fillStyle = '#fff'; g.beginPath(); g.arc(ex - w * 0.012, ey - w * 0.012, w * 0.013, 0, 7); g.fill(); }
      }
      g.restore();
    }
    const nuc = [[0, 0, 0], [0.13, 0.05, 1], [-0.12, 0.06, 1], [0.03, -0.13, 0], [-0.06, 0.13, 0], [0.1, -0.09, 1], [-0.11, -0.08, 0]];
    nuc.forEach(([x, y, k], i) => {
      const jx = Math.sin(T * 9 + i) * w * 0.004, px = cx + x * R + jx, py = cy + y * R;
      const gr = g.createRadialGradient(px - w * 0.015, py - w * 0.015, 1, px, py, w * 0.055);
      gr.addColorStop(0, '#fff'); gr.addColorStop(0.4, k ? '#ff7a95' : '#7ab0ff'); gr.addColorStop(1, k ? '#d94f75' : '#4f7fd9');
      g.fillStyle = gr; g.beginPath(); g.arc(px, py, w * 0.055, 0, 7); g.fill();
    });
  },
  solar(g, w, h, T) {
    const cx = 0, cy = -h * 0.36, R = w * 0.4;
    const bg = g.createRadialGradient(cx, cy, 0, cx, cy, w * 0.7); bg.addColorStop(0, 'rgba(40,30,110,0.6)'); bg.addColorStop(1, 'rgba(30,20,80,0.25)');
    g.fillStyle = bg; g.fillRect(-w, -h, w * 2, h);
    g.fillStyle = '#fff'; for (let i = 0; i < 16; i++) { g.globalAlpha *= 0.4 + 0.6 * Math.abs(Math.sin(T * 2 + i)); g.fillRect((hash(i, 1) - 0.5) * w, -h * hash(i, 2), 1.5, 1.5); g.globalAlpha /= 0.4 + 0.6 * Math.abs(Math.sin(T * 2 + i)); }
    const P = [[0.32, 2.4, 0.055, '#ffb3a3'], [0.52, 1.6, 0.075, '#7fd3ff'], [0.74, 1.05, 0.085, '#ffd36b', 1], [0.95, 0.7, 0.06, '#c3a8ff']];
    g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,0.28)';
    P.forEach(([o]) => { g.beginPath(); g.ellipse(cx, cy, R * o, R * o * 0.36, 0, 0, 7); g.stroke(); });
    const planet = ([o, sp, r, col, ring], a) => {
      const x = cx + Math.cos(a) * R * o, y = cy + Math.sin(a) * R * o * 0.36, rr = w * r * (0.85 + 0.15 * Math.sin(a));
      const gr = g.createRadialGradient(x - rr * 0.4, y - rr * 0.4, 1, x, y, rr); gr.addColorStop(0, '#fff'); gr.addColorStop(0.35, col); gr.addColorStop(1, rgbs(mix(hex2rgb(col), [40, 20, 80], 0.45)));
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill();
      if (ring) { g.strokeStyle = 'rgba(255,230,180,0.9)'; g.lineWidth = Math.max(1, rr * 0.25); g.beginPath(); g.ellipse(x, y, rr * 1.7, rr * 0.45, -0.3, 0, 7); g.stroke(); }
    };
    const pl = P.map(p => ({ p, a: T * p[1] + p[0] * 9 }));
    pl.filter(o => Math.sin(o.a) < 0).forEach(o => planet(o.p, o.a));
    const sr = w * 0.11 * (1 + Math.sin(T * 3) * 0.04);
    const sg = g.createRadialGradient(cx, cy, 0, cx, cy, sr * 2.6); sg.addColorStop(0, 'rgba(255,240,150,0.9)'); sg.addColorStop(0.4, 'rgba(255,190,90,0.45)'); sg.addColorStop(1, 'rgba(255,170,80,0)');
    g.fillStyle = sg; g.beginPath(); g.arc(cx, cy, sr * 2.6, 0, 7); g.fill();
    const s2 = g.createRadialGradient(cx - sr * 0.3, cy - sr * 0.3, 1, cx, cy, sr); s2.addColorStop(0, '#fffbe0'); s2.addColorStop(1, '#ffb34d');
    g.fillStyle = s2; g.beginPath(); g.arc(cx, cy, sr, 0, 7); g.fill();
    pl.filter(o => Math.sin(o.a) >= 0).forEach(o => planet(o.p, o.a));
  },
  snow(g, w, h, T) {
    const gl = g.createLinearGradient(0, -h, 0, 0); gl.addColorStop(0, 'rgba(200,230,255,0.45)'); gl.addColorStop(1, 'rgba(230,245,255,0.2)');
    g.fillStyle = gl; g.fillRect(-w, -h, w * 2, h);
    // snowy ground with a pine and a snowman
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(0, -h * 0.08, w * 0.5, h * 0.14, 0, 0, 7); g.fill();
    g.fillStyle = '#5fbf8f'; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-w * 0.2 - w * (0.11 - k * 0.025), -h * (0.16 + k * 0.09)); g.lineTo(-w * 0.2, -h * (0.3 + k * 0.09)); g.lineTo(-w * 0.2 + w * (0.11 - k * 0.025), -h * (0.16 + k * 0.09)); g.closePath(); g.fill(); }
    g.fillStyle = '#ffd36b'; g.beginPath(); g.arc(-w * 0.2, -h * 0.49, w * 0.022, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.strokeStyle = 'rgba(150,170,210,0.6)'; g.lineWidth = 1;
    g.beginPath(); g.arc(w * 0.17, -h * 0.2, w * 0.075, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.arc(w * 0.17, -h * 0.31, w * 0.052, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#ff9a5a'; g.beginPath(); g.moveTo(w * 0.17, -h * 0.31); g.lineTo(w * 0.23, -h * 0.3); g.lineTo(w * 0.17, -h * 0.295); g.fill();
    g.fillStyle = '#3d2348'; g.beginPath(); g.arc(w * 0.155, -h * 0.325, w * 0.008, 0, 7); g.arc(w * 0.19, -h * 0.325, w * 0.008, 0, 7); g.fill();
    // snowflakes
    for (let i = 0; i < 26; i++) {
      const sp = 0.12 + hash(i, 3) * 0.18, y = -h + ((hash(i, 4) + T * sp) % 1) * h * 0.95;
      const x = (hash(i, 5) - 0.5) * w * 0.9 + Math.sin(T * 1.6 + i) * w * 0.03, r = w * (0.008 + hash(i, 6) * 0.014);
      g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
  },
  aquarium(g, w, h, T) {
    const gl = g.createLinearGradient(0, -h, 0, 0); gl.addColorStop(0, 'rgba(140,220,255,0.35)'); gl.addColorStop(1, 'rgba(70,160,230,0.45)');
    g.fillStyle = gl; g.fillRect(-w, -h, w * 2, h);
    g.fillStyle = '#ffe2b8'; g.beginPath(); g.ellipse(0, -h * 0.04, w * 0.5, h * 0.1, 0, 0, 7); g.fill();
    g.lineCap = 'round';
    [[-0.25, 0.42, '#4fcf8f'], [0.28, 0.34, '#3fb57f'], [-0.08, 0.26, '#6fe0a8']].forEach(([x, hh, col], i) => {
      g.strokeStyle = col; g.lineWidth = w * 0.035; g.beginPath(); g.moveTo(w * x, -h * 0.06);
      g.quadraticCurveTo(w * x + Math.sin(T * 1.8 + i) * w * 0.08, -h * (0.06 + hh * 0.5), w * x + Math.sin(T * 1.8 + i + 1) * w * 0.05, -h * (0.06 + hh)); g.stroke();
    });
    const fish = (ph, sz, col, yy) => {
      const s = Math.sin(T * 0.75 + ph), x = s * w * 0.3, dir = Math.cos(T * 0.75 + ph) > 0 ? 1 : -1, y = -h * yy + Math.sin(T * 1.7 + ph) * h * 0.03;
      const r = w * sz, wag = Math.sin(T * 12 + ph) * 0.4;
      g.fillStyle = col;
      g.beginPath(); g.moveTo(x - dir * r * 0.8, y); g.lineTo(x - dir * r * 1.5, y - r * (0.5 + wag * 0.3)); g.lineTo(x - dir * r * 1.5, y + r * (0.5 - wag * 0.3)); g.closePath(); g.fill();
      g.beginPath(); g.ellipse(x, y, r, r * 0.62, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(x - dir * r * 0.1, y - r * 0.25, r * 0.35, r * 0.15, 0, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x + dir * r * 0.45, y - r * 0.1, r * 0.2, 0, 7); g.fill();
      g.fillStyle = '#24142e'; g.beginPath(); g.arc(x + dir * r * 0.5, y - r * 0.1, r * 0.11, 0, 7); g.fill();
    };
    fish(0, 0.1, '#ff9a4d', 0.3); fish(2.3, 0.07, '#ffd34d', 0.45);
    for (let i = 0; i < 9; i++) {
      const sp = 0.25 + hash(i, 7) * 0.3, y = -((hash(i, 8) + T * sp) % 1) * h * 0.9, x = (hash(i, 9) - 0.5) * w * 0.7 + Math.sin(T * 3 + i) * w * 0.02;
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, w * (0.012 + hash(i, 10) * 0.018), 0, 7); g.stroke();
    }
  },
  lava(g, w, h, T) {
    const gl = g.createLinearGradient(0, -h, 0, 0); gl.addColorStop(0, 'rgba(120,60,170,0.45)'); gl.addColorStop(1, 'rgba(255,120,140,0.4)');
    g.fillStyle = gl; g.fillRect(-w, -h, w * 2, h);
    const cols = [['#ffe07a', '#ff9a3c'], ['#ff9ac8', '#ff5a8a'], ['#ffc06b', '#ff7a4d']];
    g.fillStyle = '#ff8a5a'; g.beginPath(); g.ellipse(0, -h * 0.05, w * 0.45, h * 0.1, 0, 0, 7); g.fill();
    for (let i = 0; i < 6; i++) {
      const ph = i * 1.9, sp = 0.32 + hash(i, 11) * 0.25, u = (Math.sin(T * sp + ph) + 1) / 2;
      const vy = Math.cos(T * sp + ph);
      const x = (hash(i, 12) - 0.5) * w * 0.5 + Math.sin(T * 0.4 + i) * w * 0.05, y = -h * (0.1 + u * 0.72), r = w * (0.07 + hash(i, 13) * 0.06);
      const c = cols[i % 3], gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r * 1.1);
      gr.addColorStop(0, c[0]); gr.addColorStop(1, c[1]);
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r * (1 - Math.abs(vy) * 0.12), r * (1 + Math.abs(vy) * 0.2), 0, 0, 7); g.fill();
    }
  },
  gears(g, w, h, T) {
    const gl = g.createRadialGradient(0, -h * 0.35, 0, 0, -h * 0.35, w * 0.5); gl.addColorStop(0, 'rgba(255,245,215,0.65)'); gl.addColorStop(1, 'rgba(255,245,215,0.1)');
    g.fillStyle = gl; g.fillRect(-w, -h, w * 2, h);
    const G = [[-0.12, 0.36, 0.2, 10, 1, '#ffd36b', '#d9a23a'], [0.17, 0.27, 0.13, 7, -10 / 7, '#e6e0f5', '#a99bc9'], [0.12, 0.52, 0.1, 6, -10 / 6, '#ffb98a', '#d98a5a']];
    G.forEach(([x, y, r, n, ratio, c1, c2], i) => {
      const px = w * x, py = -h * y, rr = w * r, rot = T * 0.9 * ratio + i * 0.3;
      gearPath(g, px, py, rr, n, rot); g.fillStyle = c1; g.fill(); g.strokeStyle = c2; g.lineWidth = 1.2; g.stroke();
      g.fillStyle = c2; g.beginPath(); g.arc(px, py, rr * 0.3, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(px - rr * 0.25, py - rr * 0.3, rr * 0.12, 0, 7); g.fill();
    });
    // pendulum
    const a = Math.sin(T * 3.2) * 0.45, px = 0, py = -h * 0.2, L = h * 0.13;
    g.strokeStyle = '#a99bc9'; g.lineWidth = 2; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.sin(a) * L, py + Math.cos(a) * L); g.stroke();
    g.fillStyle = '#ffd36b'; g.beginPath(); g.arc(px + Math.sin(a) * L, py + Math.cos(a) * L, w * 0.04, 0, 7); g.fill();
  },
  storm(g, w, h, T) {
    const cyc = T % 2.4, fl = cyc < 0.22;
    const gl = g.createLinearGradient(0, -h, 0, 0); gl.addColorStop(0, fl ? 'rgba(255,255,230,0.55)' : 'rgba(80,90,150,0.45)'); gl.addColorStop(1, 'rgba(120,140,200,0.25)');
    g.fillStyle = gl; g.fillRect(-w, -h, w * 2, h);
    // rain
    g.strokeStyle = 'rgba(200,230,255,0.85)'; g.lineWidth = Math.max(1, w * 0.012); g.lineCap = 'round'; g.beginPath();
    for (let i = 0; i < 14; i++) { const y = -h * 0.55 + ((hash(i, 14) + T * 1.4) % 1) * h * 0.52, x = (hash(i, 15) - 0.5) * w * 0.7; g.moveTo(x, y); g.lineTo(x - w * 0.02, y + h * 0.05); }
    g.stroke();
    if (fl) {
      const bx = (hash(Math.floor(T / 2.4), 3) - 0.5) * w * 0.3;
      g.strokeStyle = '#fff36b'; g.lineWidth = w * 0.03; g.lineJoin = 'round'; g.beginPath(); g.moveTo(bx, -h * 0.52); g.lineTo(bx - w * 0.07, -h * 0.36); g.lineTo(bx + w * 0.03, -h * 0.34); g.lineTo(bx - w * 0.05, -h * 0.12); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = w * 0.012; g.stroke();
    }
    // cloud
    const cy = -h * 0.56;
    g.fillStyle = fl ? '#d9d6ff' : '#8e8fc4';
    [[-0.16, 0, 0.11], [0, -0.05, 0.14], [0.16, 0, 0.11], [0.05, 0.03, 0.12], [-0.06, 0.03, 0.11]].forEach(([x, y, r]) => { g.beginPath(); g.arc(w * x + Math.sin(T + x * 9) * w * 0.01, cy + h * y, w * r, 0, 7); g.fill(); });
  },
  disco(g, w, h, T) {
    const gl = g.createLinearGradient(0, -h, 0, 0); gl.addColorStop(0, 'rgba(60,30,110,0.5)'); gl.addColorStop(1, 'rgba(110,50,140,0.35)');
    g.fillStyle = gl; g.fillRect(-w, -h, w * 2, h);
    const cols = ['#ff7ac0', '#7ef0d0', '#ffe36b', '#9fb4ff', '#ffa26b'];
    for (let i = 0; i < 7; i++) {
      const a = T * (0.8 + i * 0.13) + i * 1.3, x = Math.cos(a) * w * 0.32, y = -h * 0.42 + Math.sin(a * 1.3) * h * 0.3;
      g.fillStyle = cols[i % 5]; g.globalAlpha *= 0.55; g.beginPath(); g.arc(x, y, w * 0.05, 0, 7); g.fill(); g.globalAlpha /= 0.55;
    }
    const cx = 0, cy = -h * 0.36, r = w * 0.19;
    g.strokeStyle = 'rgba(220,220,240,0.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx, -h * 0.98); g.stroke();
    g.save(); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.clip();
    g.fillStyle = '#9a95b8'; g.fillRect(cx - r, cy - r, r * 2, r * 2);
    const ts = r / 3.2, off = (T * r * 0.9) % ts, fr = Math.floor(T * 5);
    for (let yy = -4; yy <= 4; yy++) for (let xx = -5; xx <= 5; xx++) {
      const hv = hash(xx * 7 + Math.floor((T * r * 0.9) / ts), yy * 13 + fr * 0.0001);
      const b = 150 + hv * 105 | 0; g.fillStyle = hv > 0.93 ? '#ffffff' : `rgb(${b},${b},${Math.min(255, b + 30)})`;
      g.fillRect(cx + xx * ts + off - ts / 2 + 0.6, cy + yy * ts - ts / 2 + 0.6, ts - 1.2, ts - 1.2);
    }
    const sh = g.createRadialGradient(cx - r * 0.4, cy - r * 0.4, 1, cx, cy, r * 1.1); sh.addColorStop(0, 'rgba(255,255,255,0.35)'); sh.addColorStop(1, 'rgba(40,20,80,0.55)');
    g.fillStyle = sh; g.fillRect(cx - r, cy - r, r * 2, r * 2);
    g.restore();
    for (let i = 0; i < 4; i++) { const tw = Math.max(0, Math.sin(T * 5 + i * 2)); if (tw < 0.3) continue; const x = cx + Math.cos(i * 2.2) * r * 0.7, y = cy + Math.sin(i * 1.7) * r * 0.7, s = w * 0.04 * tw; g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.25, y); g.lineTo(x, y + s); g.lineTo(x - s * 0.25, y); g.closePath(); g.moveTo(x - s, y); g.lineTo(x, y + s * 0.25); g.lineTo(x + s, y); g.lineTo(x, y - s * 0.25); g.closePath(); g.fill(); }
  },
};

// x,y = feet point; size = body width in px; m.ch = character index
function drawMochi(g, x, y, size, m) {
  const C = CH[m.ch || 0], S = C.shape;
  const col = m.rgb, light = mix(col, [255, 255, 255], 0.65), dark = mix(col, [170, 70, 150], 0.2), deep = mix(col, [90, 30, 100], 0.45);
  const w = size * S.wf, h = size * 0.95 * S.hf, T = m.T != null ? m.T : t;
  const hasIn = !!C.inner && !m.solid;
  g.save();
  g.translate(x, y);
  g.rotate(m.rot || 0);
  g.scale(m.sx, m.sy);
  g.globalAlpha = m.alpha == null ? 1 : m.alpha;
  const A0 = g.globalAlpha;
  const body = () => {
    const tp = S.top;
    g.beginPath();
    g.moveTo(0, -h);
    g.bezierCurveTo(w * tp, -h, w * 0.5, -h * 0.62, w * 0.5, -h * 0.3);
    g.bezierCurveTo(w * 0.5, -h * 0.02, w * 0.3, -h * 0.02, 0, -h * 0.03);
    g.bezierCurveTo(-w * 0.3, -h * 0.02, -w * 0.5, -h * 0.02, -w * 0.5, -h * 0.3);
    g.bezierCurveTo(-w * 0.5, -h * 0.62, -w * tp, -h, 0, -h);
    g.closePath();
  };
  const fillJelly = (path, a = 1) => { g.fillStyle = rgbs(col, a); path(); g.fill(); };
  // ---- ears / back accessories
  g.lineCap = 'round';
  if (C.ears === 'bunny') {
    const ear = (side, ang) => {
      const bx = side * w * 0.2, by = -h * 0.84, L = w * 0.62;
      const a1 = ang, a2 = ang + side * (m.earBend || 0.5);
      const c1x = bx + Math.sin(a1) * L * 0.55, c1y = by - Math.cos(a1) * L * 0.55;
      const ex = c1x + Math.sin(a2) * L * 0.5, ey = c1y - Math.cos(a2) * L * 0.5;
      const curve = () => { g.beginPath(); g.moveTo(bx, by + h * 0.06); g.quadraticCurveTo(c1x, c1y, ex, ey); };
      curve(); g.strokeStyle = rgbs(deep, 0.55); g.lineWidth = w * 0.2 + 3; g.stroke();
      g.fillStyle = rgbs(deep, 0.55); g.beginPath(); g.arc(ex, ey, w * 0.12 + 1.5, 0, 7); g.fill();
      curve(); g.strokeStyle = rgbs(col); g.lineWidth = w * 0.2; g.stroke();
      g.fillStyle = rgbs(col); g.beginPath(); g.arc(ex, ey, w * 0.12, 0, 7); g.fill();
      g.beginPath(); g.moveTo(bx - side * w * 0.02, by - h * 0.02); g.quadraticCurveTo(c1x - side * w * 0.03, c1y, lerp(c1x, ex, 0.75) - side * w * 0.02, lerp(c1y, ey, 0.75));
      g.strokeStyle = rgbs(light, 0.8); g.lineWidth = w * 0.06; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.ellipse(ex - side * w * 0.03, ey - w * 0.04, w * 0.035, w * 0.022, -0.5 * side, 0, 7); g.fill();
    };
    ear(-1, m.earL); ear(1, m.earR);
  } else if (C.ears === 'bear') {
    for (const sd of [-1, 1]) {
      const wob = (sd < 0 ? m.earL + 0.45 : m.earR - 0.45) * 0.25;
      const ex = sd * w * 0.3 + wob * w * 0.2, ey = -h * 0.86;
      g.fillStyle = rgbs(deep, 0.55); g.beginPath(); g.arc(ex, ey, w * 0.14 + 1.5, 0, 7); g.fill();
      g.fillStyle = rgbs(col); g.beginPath(); g.arc(ex, ey, w * 0.14, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,170,200,0.7)'; g.beginPath(); g.arc(ex, ey + w * 0.01, w * 0.075, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(ex - w * 0.05, ey - w * 0.05, w * 0.025, 0, 7); g.fill();
    }
  } else if (C.ears === 'cat') {
    for (const sd of [-1, 1]) {
      const wob = (sd < 0 ? m.earL + 0.45 : m.earR - 0.45) * 0.15;
      g.save(); g.translate(sd * w * 0.26, -h * 0.82); g.rotate(sd * 0.35 + wob);
      g.beginPath(); g.moveTo(-w * 0.13, 0); g.quadraticCurveTo(-w * 0.04, -w * 0.3, 0, -w * 0.3); g.quadraticCurveTo(w * 0.04, -w * 0.3, w * 0.13, 0); g.closePath();
      g.fillStyle = rgbs(col); g.fill(); g.strokeStyle = rgbs(deep, 0.5); g.lineWidth = 1.5; g.stroke();
      g.fillStyle = 'rgba(255,170,200,0.65)'; g.beginPath(); g.moveTo(-w * 0.06, -w * 0.02); g.quadraticCurveTo(0, -w * 0.22, w * 0.06, -w * 0.02); g.closePath(); g.fill();
      g.restore();
    }
  } else if (C.ears === 'antenna') {
    for (const sd of [-1, 1]) {
      const a = (sd < 0 ? m.earL : m.earR) * 0.8, bx = sd * w * 0.14, by = -h * 0.92, L = w * 0.42;
      const ex = bx + Math.sin(a) * L, ey = by - Math.cos(a) * L;
      g.strokeStyle = rgbs(deep, 0.7); g.lineWidth = w * 0.035; g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + Math.sin(a) * L * 0.3, by - L * 0.6, ex, ey); g.stroke();
      const gr = g.createRadialGradient(ex - w * 0.02, ey - w * 0.02, 1, ex, ey, w * 0.08); gr.addColorStop(0, '#fff'); gr.addColorStop(0.5, '#7fe8ff'); gr.addColorStop(1, 'rgba(90,200,255,0.2)');
      g.fillStyle = gr; g.beginPath(); g.arc(ex, ey, w * 0.08, 0, 7); g.fill();
    }
  } else if (C.ears === 'fins') {
    for (const sd of [-1, 1]) {
      const a = Math.sin(T * 6 + sd) * 0.2;
      g.save(); g.translate(sd * w * 0.46, -h * 0.5); g.rotate(sd * (0.7 + a));
      g.beginPath(); g.moveTo(0, -w * 0.08); g.quadraticCurveTo(sd * w * 0.25, -w * 0.12, sd * w * 0.22, w * 0.1); g.quadraticCurveTo(sd * w * 0.1, w * 0.02, 0, w * 0.08); g.closePath();
      g.fillStyle = rgbs(dark, 0.95); g.fill(); g.restore();
    }
    g.beginPath(); g.moveTo(-w * 0.12, -h * 0.94); g.quadraticCurveTo(w * 0.02 + Math.sin(T * 4) * w * 0.03, -h * 1.22, w * 0.16, -h * 0.95); g.closePath(); g.fillStyle = rgbs(dark, 0.95); g.fill();
  } else if (C.ears === 'horns') {
    for (const sd of [-1, 1]) {
      g.save(); g.translate(sd * w * 0.22, -h * 0.9); g.rotate(sd * 0.3);
      g.beginPath(); g.moveTo(-w * 0.07, 0); g.lineTo(-w * 0.02, -w * 0.13); g.lineTo(-w * 0.07, -w * 0.13); g.lineTo(w * 0.02, -w * 0.28); g.lineTo(0, -w * 0.15); g.lineTo(w * 0.05, -w * 0.15); g.lineTo(w * 0.07, 0); g.closePath();
      g.fillStyle = '#ffe36b'; g.fill(); g.strokeStyle = '#e0a83a'; g.lineWidth = 1.5; g.stroke(); g.restore();
    }
  }
  if (C.acc === 'ring') { g.strokeStyle = 'rgba(255,214,140,0.9)'; g.lineWidth = w * 0.045; g.beginPath(); g.ellipse(0, -h * 0.8, w * 0.62, w * 0.14, -0.15, Math.PI, Math.PI * 2); g.stroke(); }
  // ---- feet
  const fl = m.foot || 0;
  g.fillStyle = rgbs(dark);
  g.beginPath(); g.ellipse(-w * 0.2, -h * 0.05 - Math.max(0, fl) * h * 0.08, w * 0.15, h * 0.085, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(w * 0.2, -h * 0.05 - Math.max(0, -fl) * h * 0.08, w * 0.15, h * 0.085, 0, 0, 7); g.fill();
  // ---- body (more transparent when it has an interior)
  body();
  const bg = g.createRadialGradient(-w * 0.15, -h * 0.72, w * 0.05, 0, -h * 0.45, h * 0.75);
  const ba = hasIn ? 0.5 : 1;
  bg.addColorStop(0, rgbs(light, ba)); bg.addColorStop(0.45, rgbs(col, ba)); bg.addColorStop(1, rgbs(dark, hasIn ? 0.75 : 1));
  g.fillStyle = bg; g.fill();
  g.save(); body(); g.clip();
  if (hasIn && !m.noInner) {
    INNER[C.inner](g, w, h, T);
    g.globalAlpha = A0;
    // jelly tint over the interior so it keeps the colour
    g.fillStyle = rgbs(col, 0.24); g.fillRect(-w, -h * 1.1, w * 2, h * 1.2);
  }
  const ig = g.createRadialGradient(w * 0.05, -h * 0.12, 0, w * 0.05, -h * 0.12, w * 0.45);
  ig.addColorStop(0, rgbs(light, hasIn ? 0.35 : 0.55)); ig.addColorStop(1, rgbs(light, 0));
  g.fillStyle = ig; g.fillRect(-w, -h, w * 2, h);
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = w * 0.05;
  g.beginPath(); g.arc(w * 0.0, -h * 0.45, w * 0.47, -0.5, 0.6); g.stroke();
  // edge darkening for a glassy rim
  if (hasIn) { body(); g.strokeStyle = rgbs(dark, 0.55); g.lineWidth = w * 0.07; g.stroke(); }
  g.restore();
  body(); g.lineWidth = Math.max(1.5, w * 0.025); g.strokeStyle = rgbs(deep, 0.5); g.stroke();
  // ---- arms
  const as = m.arm || 0;
  g.fillStyle = rgbs(mix(col, light, 0.25), 0.9); g.strokeStyle = rgbs(deep, 0.25); g.lineWidth = Math.max(1, w * 0.012);
  if (m.armsUp) {
    g.beginPath(); g.ellipse(-w * 0.43, -h * 0.62, w * 0.075, h * 0.11, -0.45, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(w * 0.43, -h * 0.62, w * 0.075, h * 0.11, 0.45, 0, 7); g.fill(); g.stroke();
  } else {
    g.beginPath(); g.ellipse(-w * 0.33, -h * 0.2 - as * h * 0.04, w * 0.075, h * 0.05, 0.9 + as * 0.25, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(w * 0.33, -h * 0.2 + as * h * 0.04, w * 0.075, h * 0.05, -0.9 + as * 0.25, 0, 7); g.fill(); g.stroke();
  }
  // ---- gloss
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.beginPath(); g.ellipse(-w * 0.23, -h * 0.76, w * 0.1, w * 0.045, -0.75, 0, 7); g.fill();
  g.beginPath(); g.arc(-w * 0.33, -h * 0.62, w * 0.025, 0, 7); g.fill();
  if (!hasIn) {
    g.fillStyle = 'rgba(255,255,255,0.55)';
    [[0.3, 0.7, 0.018], [0.36, 0.22, 0.014], [-0.38, 0.25, 0.016], [0.12, 0.86, 0.012], [0.4, 0.5, 0.012]].forEach(([bx, by, br]) => { g.beginPath(); g.arc(w * bx, -h * by, w * br, 0, 7); g.fill(); });
  }
  // ---- front accessories (head)
  if (C.acc === 'ring') { g.strokeStyle = 'rgba(255,220,150,1)'; g.lineWidth = w * 0.045; g.beginPath(); g.ellipse(0, -h * 0.8, w * 0.62, w * 0.14, -0.15, 0, Math.PI); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-w * 0.45, -h * 0.74 + w * 0.05, w * 0.025, 0, 7); g.fill(); }
  else if (C.acc === 'beanie') {
    const by = -h * 0.84;
    g.fillStyle = '#ff8fbf'; g.beginPath(); g.moveTo(-w * 0.36, by); g.bezierCurveTo(-w * 0.34, -h * 1.12, w * 0.34, -h * 1.12, w * 0.36, by); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = w * 0.02; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(k * w * 0.12, by); g.quadraticCurveTo(k * w * 0.1, by - h * 0.12, k * w * 0.06, by - h * 0.2); g.stroke(); }
    g.fillStyle = '#fff'; rr(g, -w * 0.4, by - h * 0.05, w * 0.8, h * 0.1, h * 0.05); g.fill();
    const pb = Math.sin(T * 5) * w * 0.02; g.beginPath(); g.arc(pb, -h * 1.1, w * 0.09, 0, 7); g.fill();
  } else if (C.acc === 'lampcap') {
    const gr = g.createLinearGradient(-w * 0.2, 0, w * 0.2, 0); gr.addColorStop(0, '#b9b4cc'); gr.addColorStop(0.4, '#f4f2fb'); gr.addColorStop(1, '#8f8aa8');
    g.fillStyle = gr; g.beginPath(); g.moveTo(-w * 0.22, -h * 0.94); g.lineTo(-w * 0.13, -h * 1.12); g.lineTo(w * 0.13, -h * 1.12); g.lineTo(w * 0.22, -h * 0.94); g.closePath(); g.fill();
  } else if (C.acc === 'key') {
    g.save(); g.translate(0, -h * 0.98); g.scale(Math.cos(T * 2.5), 1);
    g.fillStyle = '#ffd36b'; g.strokeStyle = '#d9a23a'; g.lineWidth = 1.5;
    g.fillRect(-w * 0.025, -h * 0.12, w * 0.05, h * 0.12);
    g.beginPath(); g.ellipse(-w * 0.1, -h * 0.17, w * 0.09, w * 0.07, 0, 0, 7); g.ellipse(w * 0.1, -h * 0.17, w * 0.09, w * 0.07, 0, 0, 7); g.fill(); g.stroke();
    g.restore();
  } else if (C.acc === 'flag') {
    g.strokeStyle = rgbs(deep, 0.7); g.lineWidth = 2; g.beginPath(); g.moveTo(0, -h * 0.98); g.lineTo(0, -h * 1.25); g.stroke();
    g.fillStyle = '#ff7ab0'; g.beginPath(); g.moveTo(0, -h * 1.25); g.quadraticCurveTo(w * 0.1, -h * 1.22 + Math.sin(T * 8) * h * 0.02, w * 0.18, -h * 1.2); g.lineTo(0, -h * 1.14); g.closePath(); g.fill();
  }
  // ---- face
  const fy = -h * 0.52, look = m.look || 0, lookX = m.lookX || 0;
  const ex = w * 0.17, erx = w * 0.085, ery = w * 0.105;
  if (m.dead) {
    g.strokeStyle = '#4a2a55'; g.lineWidth = w * 0.035; g.lineCap = 'round';
    for (const sd of [-1, 1]) { const cx = sd * ex; g.beginPath(); g.moveTo(cx - erx * 0.7, fy - erx * 0.7); g.lineTo(cx + erx * 0.7, fy + erx * 0.7); g.moveTo(cx + erx * 0.7, fy - erx * 0.7); g.lineTo(cx - erx * 0.7, fy + erx * 0.7); g.stroke(); }
  } else {
    const bl = m.blink || 0;
    for (const sd of [-1, 1]) {
      const cx = sd * ex + lookX * w * 0.02, cy = fy + look * h * 0.025;
      if (bl > 0.85 || m.happy) {
        g.strokeStyle = '#3d2348'; g.lineWidth = w * 0.03; g.lineCap = 'round';
        g.beginPath(); if (m.happy) g.arc(cx, cy + ery * 0.2, erx * 0.8, Math.PI * 1.15, Math.PI * 1.85); else { g.moveTo(cx - erx, cy + ery * 0.2); g.quadraticCurveTo(cx, cy + ery * 0.6, cx + erx, cy + ery * 0.2); }
        g.stroke();
      } else {
        const ry = ery * (1 - bl);
        const eg = g.createLinearGradient(0, cy - ry, 0, cy + ry);
        eg.addColorStop(0, '#24142e'); eg.addColorStop(0.6, '#3a2246'); eg.addColorStop(1, '#7a4f9a');
        g.fillStyle = eg; g.beginPath(); g.ellipse(cx, cy, erx, ry, 0, 0, 7); g.fill();
        g.fillStyle = '#fff';
        g.beginPath(); g.ellipse(cx - erx * 0.3, cy - ry * 0.38, erx * 0.38, ry * 0.32, -0.3, 0, 7); g.fill();
        g.beginPath(); g.arc(cx + erx * 0.35, cy + ry * 0.38, erx * 0.16, 0, 7); g.fill();
      }
    }
    if (C.acc === 'shades') {
      // heart/star party glasses
      const star = (cx, cy, r) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.55 : r; i ? g.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2) : g.moveTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2); } g.closePath(); };
      for (const sd of [-1, 1]) { star(sd * ex, fy, w * 0.13); g.fillStyle = 'rgba(255,90,170,0.55)'; g.fill(); g.strokeStyle = '#ff4fa0'; g.lineWidth = w * 0.025; g.stroke(); }
      g.beginPath(); g.moveTo(-ex + w * 0.11, fy - w * 0.02); g.quadraticCurveTo(0, fy - w * 0.06, ex - w * 0.11, fy - w * 0.02); g.stroke();
    }
    if (C.id === 'tictac') { g.strokeStyle = '#d9a23a'; g.lineWidth = w * 0.018; g.beginPath(); g.arc(ex, fy, w * 0.12, 0, 7); g.stroke(); g.beginPath(); g.moveTo(ex + w * 0.1, fy + w * 0.07); g.quadraticCurveTo(ex + w * 0.2, fy + w * 0.2, ex + w * 0.15, fy + w * 0.3); g.stroke(); }
  }
  g.fillStyle = 'rgba(255,110,150,0.42)';
  g.beginPath(); g.ellipse(-w * 0.3, fy + h * 0.1, w * 0.07, w * 0.04, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(w * 0.3, fy + h * 0.1, w * 0.07, w * 0.04, 0, 0, 7); g.fill();
  const my = fy + h * 0.1 + (m.look || 0) * h * 0.015;
  if (m.dead) {
    g.strokeStyle = '#4a2a55'; g.lineWidth = w * 0.025; g.beginPath();
    g.moveTo(-w * 0.06, my + w * 0.02); g.quadraticCurveTo(-w * 0.03, my - w * 0.01, 0, my + w * 0.02); g.quadraticCurveTo(w * 0.03, my + w * 0.05, w * 0.06, my + w * 0.02); g.stroke();
  } else if (m.mouth === 'o') {
    g.fillStyle = '#7a2a48'; g.beginPath(); g.ellipse(0, my + w * 0.02, w * 0.035, w * 0.045, 0, 0, 7); g.fill();
  } else {
    const mw = w * 0.05;
    g.fillStyle = '#7a2a48'; g.beginPath(); g.moveTo(-mw, my); g.quadraticCurveTo(0, my + mw * 0.15, mw, my); g.quadraticCurveTo(mw * 0.9, my + mw * 1.4, 0, my + mw * 1.4); g.quadraticCurveTo(-mw * 0.9, my + mw * 1.4, -mw, my); g.fill();
    g.fillStyle = '#ff8fae'; g.beginPath(); g.ellipse(0, my + mw * 1.05, mw * 0.5, mw * 0.32, 0, 0, 7); g.fill();
  }
  g.restore();
}
// Locked characters: flat silhouette
let silCanvas = null;
function drawSilhouette(g, x, y, size, ch, col) {
  const s = Math.ceil(size * 2.2 * DPR);
  if (!silCanvas || silCanvas.width < s) silCanvas = mkCanvas(s, s);
  const sg = silCanvas.getContext('2d');
  sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, silCanvas.width, silCanvas.height); sg.globalCompositeOperation = 'source-over';
  sg.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawMochi(sg, size * 1.1, size * 1.75, size, { ch, rgb: [200, 200, 200], sx: 1, sy: 1, rot: 0, earL: -0.45, earR: 0.45, earBend: 0.55, foot: 0, arm: 0, blink: 0, look: 0, lookX: 0, noInner: true, T: 0 });
  sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = col || 'rgba(110,80,150,0.85)'; sg.fillRect(0, 0, s, s);
  sg.globalCompositeOperation = 'source-over';
  g.drawImage(silCanvas, 0, 0, s, s, x - size * 1.1, y - size * 1.75, s / DPR, s / DPR);
}

// ================= Game state =================
let state = 'menu'; // menu | play | dying | over | paused
let t = 0, runT = 0, dist = 0, speed = 12, score = 0, best = parseInt(store.get('mochi_best', '0'), 10) || 0;
let combo = 0, timeScale = 1, tsTarget = 1, shake = 0, flash = 0, flashCol = [255, 255, 255];
let rows = [], stars = [], scenery = [], particles = [], popups = [], ripples = [];
let spawnZ = 0, lastPattern = '', starStreak = 0, starStreakT = 0;
let tutStep = -1, tutDone = store.get('mochi_tut', '0') === '1', tutWaitT = 0;
let menuBlend = 1; // 1 = menu pose, 0 = game pose
let overT = 0, deathT = 0, stateT = 0;
let contUsed = 0, freezeT = 0, invulnT = 0, contT = 0, contBusy = false;
const mochi = {
  lane: 0, x: 0, vx: 0, color: 0, rgb: PAL[0].rgb.slice(), colPop: 0,
  hopPh: 0, hop: 0, wob: 0, wobV: 0, wobX: 0, earL: -0.5, earR: 0.5, earLV: 0, earRV: 0,
  blinkT: 2, blink: 0, mouthT: 0, happyT: 0, dead: false, deadT: 0
};

function resetRun() {
  rows = []; stars = []; particles = []; popups = []; ripples = [];
  contUsed = 0; freezeT = 0; invulnT = 0;
  runT = 0; dist = 0; speed = 12.5; score = 0; combo = 0; timeScale = 1; tsTarget = 1; shake = 0;
  mochi.lane = 0; mochi.x = 0; mochi.vx = 0; mochi.color = 0; mochi.rgb = PAL[0].rgb.slice(); mochi.dead = false; mochi.wob = 0; mochi.wobV = 0;
  spawnZ = 26; lastPattern = ''; dCur = 0; pending = []; lastPass = [{ l: -1, c: -1 }, { l: 0, c: -1 }, { l: 1, c: -1 }]; runUnlocks = []; banners = [];
  tutStep = tutDone ? -1 : 0; tutWaitT = 0;
  setTheme(0, false); menuThemeT = 0;
  if (tutStep === 0) spawnTutorial(); 
  updateHUD(true);
}

// ================= Unlocks & character selection =================
const DEBUG = /[?&]debug=all\b/.test(location.search); // ?debug=all → preview all characters
const MON = window.Monet || { available: false, mode: 'off', ownsChar: () => false, noAds: () => false, onChange() {}, price: () => '' };
const CFGM = window.MOCHI_CONFIG || { maxContinues: 2 };
let unlockPts = parseInt(store.get('mochi_unlpts', '0'), 10) || 0;
let selChar = parseInt(store.get('mochi_char', '0'), 10) || 0;
const maxPts = () => Math.max(best, unlockPts);
const ownedChar = i => i > 0 && MON.ownsChar(CH[i].id);
const isUnlocked = i => DEBUG || CH[i].unlock <= maxPts() || ownedChar(i);
if (!(selChar >= 0 && selChar < NCH) || !isUnlocked(selChar)) selChar = 0;
let runUnlocks = [], banners = [];
function checkUnlocks() {
  for (let i = 1; i < NCH; i++) {
    const u = CH[i].unlock;
    if (u > maxPts() && score >= u) {
      unlockPts = u; store.set('mochi_unlpts', String(u));
      if (ownedChar(i)) continue; // already bought: no celebration needed
      runUnlocks.push(i); banners.push({ ch: i, t: 0 });
      // celebration
      Snd.record();
      for (let k = 0; k < 4; k++) burst(W * (0.2 + k * 0.2), H * 0.18, PAL[k % 3].lrgb, 10, { min: 80, max: 260, g: 300, type: k % 2 ? 'star' : 'spark', life: 1, rmin: 2, rmax: 5 });
    }
  }
}
function drawBanners(g) {
  if (!banners.length) return;
  const b = banners[0];
  const D = 3.6, e = b.t;
  if (e > D) { banners.shift(); return; }
  const inK = clamp(e / 0.45, 0, 1), outK = clamp((D - e) / 0.4, 0, 1);
  const ease = k => 1 - Math.pow(1 - k, 3) * (1 - 2.2 * k * (1 - k));
  const cw = Math.min(W - 28, 340), ch = 112, x = (W - cw) / 2;
  const y = lerp(-ch - 20, H * 0.15, ease(inK)) - (1 - outK) * (H * 0.15 + ch + 30);
  g.save();
  g.shadowColor = 'rgba(150,80,160,0.35)'; g.shadowBlur = 18; g.shadowOffsetY = 6;
  const gr = g.createLinearGradient(x, y, x + cw, y + ch); gr.addColorStop(0, 'rgba(255,255,255,0.97)'); gr.addColorStop(1, 'rgba(255,236,246,0.97)');
  rr(g, x, y, cw, ch, 26); g.fillStyle = gr; g.fill();
  g.shadowColor = 'transparent';
  g.lineWidth = 3; const rg = g.createLinearGradient(x, 0, x + cw, 0); rg.addColorStop(0, '#ff9cc8'); rg.addColorStop(0.5, '#ffd36b'); rg.addColorStop(1, '#b9a2f7'); g.strokeStyle = rg; g.stroke();
  // rays behind character
  const cx = x + 58, cy = y + ch * 0.55;
  g.save(); g.translate(cx, cy); g.rotate(t * 0.8); g.fillStyle = 'rgba(255,211,107,0.35)';
  for (let k = 0; k < 8; k++) { g.rotate(Math.PI / 4); g.beginPath(); g.moveTo(0, 0); g.lineTo(52, -9); g.lineTo(52, 9); g.closePath(); g.fill(); }
  g.restore();
  const bob = Math.abs(Math.sin(t * 6)) * 5;
  drawMochi(g, cx, y + ch - 14 - bob, 60, { ch: b.ch, rgb: PAL[Math.floor(t * 1.2) % 3].rgb, sx: 1, sy: 1, rot: 0, earL: -0.45 + Math.sin(t * 6) * 0.2, earR: 0.45 - Math.sin(t * 6) * 0.2, earBend: 0.5, foot: Math.sin(t * 8), arm: Math.sin(t * 8), blink: 0, look: 0.2, lookX: 0, happy: true });
  g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillStyle = '#f27bb2'; g.font = '700 17px Fredoka, sans-serif'; g.fillText('¡Nuevo personaje!', x + 112, y + 32);
  g.fillStyle = '#7a4fb0'; g.font = '700 32px Fredoka, sans-serif'; g.fillText(CH[b.ch].name, x + 112, y + 64);
  g.fillStyle = '#b08ac8'; g.font = '600 13px Fredoka, sans-serif'; g.fillText('Elígelo en «Personajes»', x + 112, y + 92);
  g.restore();
}
// ---- selection screen
let selIdx = 0, selView = 0, selPtr = null, selThumbs = [];
const elSelName = () => document.getElementById('selName');
function openSelect(from) {
  rows = []; stars = []; popups = []; mochi.dead = false; hideHint();
  state = 'select'; selFrom = from || 'menu'; selIdx = selChar; selView = selChar; stateT = 0;
  setScreen('select'); elHud.style.opacity = 0; updateSelectUI();
}
let selFrom = 'menu';
function closeSelect() { state = 'menu'; stateT = 0; setScreen('title'); updateTitleBest(); }
function updateSelectUI() {
  const c = CH[selIdx], un = isUnlocked(selIdx);
  document.getElementById('selName').textContent = un ? c.name : '???';
  document.getElementById('selDesc').textContent = un ? c.desc : `??? – Llega a ${fmtN(c.unlock)} puntos`;
  document.getElementById('selDesc').style.display = (!un && MON.available) ? 'none' : '';
  const buy = document.getElementById('selBuy');
  buy.style.display = !un && MON.available ? '' : 'none';
  buy.textContent = `Desbloquear por ${MON.price(MON.charProduct(c.id))}`;
  document.getElementById('selShop').style.display = MON.available ? '' : 'none';
  const na = document.getElementById('selNoAds'); na.textContent = MON.noAds() ? '✓ Sin anuncios' : `Sin anuncios · ${MON.price(MOCHI_CONFIG.products.noAds)}`; na.classList.toggle('owned', MON.noAds());
  document.getElementById('selPrivacy').style.display = MON.privacyRequired ? '' : 'none';
  document.getElementById('selInner').textContent = un ? (selIdx ? 'Dentro lleva ' + c.interior : 'La original') : (MON.available ? 'Llega a ' + fmtN(c.unlock) + ' puntos o desbloquéalo ya' : 'Desbloqueo: ' + fmtN(c.unlock) + ' puntos');
  const n = CH.filter((_, i) => isUnlocked(i)).length;
  document.getElementById('selCount').textContent = `${n}/${NCH}`;
  const pick = document.getElementById('selPick');
  pick.textContent = !un ? 'Bloqueado' : '¡Jugar con ' + c.name + '!';
  pick.classList.toggle('dis', !un); pick.classList.toggle('chosen', un && selIdx === selChar);
  document.getElementById('selRecord').textContent = 'Tu récord: ' + fmtN(best) + (DEBUG ? '  ·  modo debug' : '');
}
function selGo(d) { const n = clamp(selIdx + d, 0, NCH - 1); if (n !== selIdx) { selIdx = n; Snd.tick(); updateSelectUI(); } }
function selPickCur() {
  if (!isUnlocked(selIdx)) { Snd.tone(220, 0.15, { vol: 0.08 }); return; }
  selChar = selIdx; store.set('mochi_char', String(selChar)); Snd.color(selChar % 3); updateSelectUI();
  for (let k = 0; k < 14; k++) burst(W / 2, H * 0.34, PAL[k % 3].lrgb, 1, { min: 80, max: 240, g: 200, type: 'star', life: 0.8, rmin: 2, rmax: 5 });
}
// choose the focused character and start a run with it straight away
function selPlay() {
  if (state !== 'select' || !isUnlocked(selIdx)) return;
  selChar = selIdx; store.set('mochi_char', String(selChar));
  startGame();
}
function safeB() { if (safeB.v == null) { const d = document.createElement('div'); d.style.cssText = 'position:fixed;bottom:0;height:env(safe-area-inset-bottom);visibility:hidden'; document.body.appendChild(d); safeB.v = d.offsetHeight || 0; d.remove(); } return safeB.v; }
function selLayout() {
  const top = Math.max(H * 0.1, 64);
  const short = H < 760;
  const big = { x: W / 2, y: H * (short ? 0.37 : 0.43), size: Math.min(W * (short ? 0.33 : 0.36), H * (short ? 0.165 : 0.19)) };
  const it = Math.round(big.y + 10) + 'px'; if (selLayout.top !== it) { selLayout.top = it; document.getElementById('selInfo').style.top = it; }
  const gw = Math.min(W - 24, 460), cols = 5, cw = gw / cols, chh = Math.min(cw * 1.05, H * 0.1);
  const reserve = (MON.available ? 108 : 74) + safeB();
  const gy = Math.min(H * 0.665, H - reserve - (2 * chh + 8) - chh * 0.45);
  selThumbs = CH.map((c, i) => ({ x: (W - gw) / 2 + cw * (i % cols) + cw / 2, y: gy + Math.floor(i / cols) * (chh + 8) + chh * 0.85, w: cw, h: chh, size: Math.min(cw * 0.5, chh * 0.62) }));
  return { top, big };
}
function drawSelect(g) {
  const L = selLayout();
  // soft veil for readability
  const vg = g.createLinearGradient(0, 0, 0, H); vg.addColorStop(0, 'rgba(255,255,255,0.25)'); vg.addColorStop(0.5, 'rgba(255,240,248,0.55)'); vg.addColorStop(1, 'rgba(255,240,248,0.75)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  // carousel
  const sp = W * 0.36;
  for (let i = Math.max(0, Math.floor(selView) - 2); i <= Math.min(NCH - 1, Math.ceil(selView) + 2); i++) {
    const off = i - selView, ad = Math.abs(off);
    if (ad > 1.8) continue;
    const sc = lerp(1, 0.52, Math.min(1, ad)), x = L.big.x + off * sp, y = L.big.y - (1 - Math.min(1, ad)) * 6;
    const size = L.big.size * sc;
    g.globalAlpha = clamp(1.6 - ad * 0.7, 0, 1);
    // pedestal
    g.fillStyle = 'rgba(200,150,220,0.25)'; g.beginPath(); g.ellipse(x, y + 4, size * 0.62, size * 0.13, 0, 0, 7); g.fill();
    if (isUnlocked(i)) {
      const hop = ad < 0.5 ? Math.abs(Math.sin(t * 4)) * size * 0.08 : 0;
      drawMochi(g, x, y - hop, size, { ch: i, rgb: PAL[i === selIdx ? (Math.floor(t * 0.6) % 3) : i % 3].rgb, sx: 1 + (ad < 0.5 ? Math.sin(t * 8) * 0.02 : 0), sy: 1 - (ad < 0.5 ? Math.sin(t * 8) * 0.02 : 0), rot: 0, earL: -0.5 + Math.sin(t * 3 + i) * 0.12, earR: 0.5 - Math.sin(t * 3 + i) * 0.12, earBend: 0.55, foot: 0, arm: Math.sin(t * 4), blink: (t * 0.7 + i) % 3.5 < 0.12 ? 1 : 0, look: 0.2, lookX: 0, happy: i === selChar && ad < 0.5 && (t % 4) < 0.6 });
    } else {
      drawSilhouette(g, x, y, size, i);
      g.fillStyle = 'rgba(255,255,255,0.95)'; g.font = `700 ${Math.round(size * 0.45)}px Fredoka, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('?', x, y - size * 0.48);
    }
    g.globalAlpha = 1;
  }
  // thumbnails grid
  g.textAlign = 'center'; g.textBaseline = 'middle';
  selThumbs.forEach((th, i) => {
    const un = isUnlocked(i), foc = i === selIdx, chosen = i === selChar;
    rr(g, th.x - th.w / 2 + 3, th.y - th.h * 0.85, th.w - 6, th.h, 14);
    g.fillStyle = foc ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.6)'; g.fill();
    if (foc) { g.lineWidth = 3; g.strokeStyle = '#f08cbc'; g.stroke(); }
    else if (chosen) { g.lineWidth = 2; g.strokeStyle = '#7ee3c4'; g.stroke(); }
    const fy = th.y - th.h * 0.2;
    const img = thumbImg(i, th.size, un);
    g.drawImage(img, th.x - th.size * 1.1, fy - th.size * 1.75, th.size * 2.2, th.size * 2.2);
    g.font = '600 11px Fredoka, sans-serif'; g.fillStyle = un ? '#8b5cc2' : '#b49ac8';
    g.fillText(un ? CH[i].name : fmtN(CH[i].unlock), th.x, th.y + th.h * 0.02);
    if (chosen && un) { g.fillStyle = '#5fc7a6'; g.beginPath(); g.arc(th.x + th.w / 2 - 12, th.y - th.h * 0.72, 7, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(th.x + th.w / 2 - 15, th.y - th.h * 0.72); g.lineTo(th.x + th.w / 2 - 12.5, th.y - th.h * 0.69); g.lineTo(th.x + th.w / 2 - 8.5, th.y - th.h * 0.75); g.stroke(); }
  });
}
const thumbCache = {};
function thumbImg(i, size, un) {
  const key = i + ':' + Math.round(size) + ':' + (un ? 1 : 0) + ':' + DPR;
  if (thumbCache[key]) return thumbCache[key];
  const s2 = Math.ceil(size * 2.2 * DPR), c = mkCanvas(s2, s2), g = c.getContext('2d');
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (un) drawMochi(g, size * 1.1, size * 1.75, size, { ch: i, T: 1.3, rgb: PAL[i % 3].rgb, sx: 1, sy: 1, rot: 0, earL: -0.45, earR: 0.45, earBend: 0.55, foot: 0, arm: 0, blink: 0, look: 0.2, lookX: 0 });
  else drawSilhouette(g, size * 1.1, size * 1.75, size, i, 'rgba(150,120,190,0.6)');
  return thumbCache[key] = c;
}
function selPointerDown(e) { selPtr = { x0: e.clientX, y0: e.clientY, t0: performance.now() }; }
function selPointerUp(e) {
  if (!selPtr) return;
  const dx = e.clientX - selPtr.x0, dy = e.clientY - selPtr.y0; selPtr = null;
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { selGo(dx < 0 ? 1 : -1); return; }
  if (Math.hypot(dx, dy) > 20) return;
  const x = e.clientX, y = e.clientY;
  const hit = selThumbs.findIndex(th => Math.abs(x - th.x) < th.w / 2 && y > th.y - th.h * 0.85 && y < th.y + th.h * 0.15);
  if (hit >= 0) { if (hit === selIdx) selPickCur(); else { selIdx = hit; Snd.tick(); updateSelectUI(); } return; }
  const L = selLayout();
  if (Math.abs(y - (L.big.y - L.big.size * 0.5)) < L.big.size * 0.8) {
    if (x < W / 2 - L.big.size * 0.7) selGo(-1); else if (x > W / 2 + L.big.size * 0.7) selGo(1); else selPickCur();
  }
}

// ================= Rows =================
// cell: {t:'e'|'w'|'b', c, passT}
function mkRow(z, cells, extra = {}) { const r = { z, cells: cells.map(c => ({ ...c, passT: -1 })), done: false, ...extra }; rows.push(r); return r; }
const E = () => ({ t: 'e' }), B = () => ({ t: 'b' }), Wc = c => ({ t: 'w', c });
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rint(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ================= Difficulty & row generator =================
// Difficulty follows the score: friendly until ~1200, real challenge from 3000, hard at 30000+.
function diffTarget(s) {
  if (s < 1200) return 0.22 * s / 1200;
  if (s < 3000) return 0.22 + 0.28 * (s - 1200) / 1800;
  if (s < 10000) return 0.5 + 0.3 * (s - 3000) / 7000;
  if (s < 30000) return 0.8 + 0.2 * (s - 10000) / 20000;
  return 1 + Math.min(0.35, (s - 30000) / 100000);
}
let dCur = 0;
const diff = () => dCur;
const d1 = d => Math.min(d, 1);
const reactT = d => Math.max(0.4, lerp(0.95, 0.44, d1(d)) - 0.1 * Math.max(0, d - 1));
const actT = d => lerp(0.32, 0.2, d1(d));
const minGapT = d => Math.max(0.5, lerp(1.35, 0.6, d1(d)) - 0.25 * Math.max(0, d - 1));
// pass states of a row: lane + required colour (-1 = any colour)
function passStates(cells) { const s = []; cells.forEach((c, i) => { if (c.t === 'e') s.push({ l: i - 1, c: -1 }); else if (c.t === 'w') s.push({ l: i - 1, c: c.c }); }); return s; }
const COLW = 0.85; // a colour change (button or tap) is a bit quicker than a swipe
function transCost(A, B) {
  // worst case over where the player can be after A, best choice for B
  let worst = 0;
  for (const a of A) {
    let bestC = 99;
    for (const b of B) { const c = Math.abs(a.l - b.l) + (b.c === -1 || a.c === b.c ? 0 : COLW); if (c < bestC) bestC = c; }
    if (bestC > worst) worst = bestC;
  }
  return worst;
}
let lastPass = [{ l: -1, c: -1 }, { l: 0, c: -1 }, { l: 1, c: -1 }], pending = [];
function pick(list) { let tot = 0; for (const [, w] of list) tot += Math.max(0, w); let r = Math.random() * tot; for (const [n, w] of list) { r -= Math.max(0, w); if (r <= 0) return n; } return list[0][0]; }
function genSequence(d) {
  const c = rint(NC), o1 = (c + 1) % NC, o2 = (c + 2) % NC, L = rint(3);
  const name = pick([
    ['oneBlock', Math.max(0.1, 1.0 - 0.9 * d)], ['lone', Math.max(0.05, 0.5 - 0.5 * d)], ['fullWall', 0.5], ['rainbow', 0.45],
    ['twoBlock', 0.3 + 0.4 * d], ['wallBlock', 0.25 + 0.55 * d], ['twoWalls', 0.35],
    ['laneColor', d < 0.25 ? 0 : 0.2 + 0.5 * d], ['altSeq', d < 0.3 ? 0 : 0.15 + 0.45 * d], ['slalom', d < 0.4 ? 0 : 0.1 + 0.4 * d],
    ['mover', d < 0.5 ? 0 : 0.15 + 0.35 * d], ['flip', d < 0.62 ? 0 : 0.15 + 0.3 * d],
  ]);
  const one = (cells, extra) => [{ cells, extra: { pat: name, ...extra } }];
  switch (name) {
    case 'oneBlock': { const cells = [E(), E(), E()]; cells[L] = B(); if (Math.random() < 0.5 + 0.3 * d) cells[(L + 1 + rint(2)) % 3] = Wc(c); return one(cells); }
    case 'lone': { const cells = [E(), E(), E()]; cells[L] = Wc(c); return one(cells); }
    case 'fullWall': return one([Wc(c), Wc(c), Wc(c)]);
    case 'rainbow': return one(shuffle([0, 1, 2]).map(Wc));
    case 'twoBlock': { const cells = [B(), B(), B()]; cells[L] = Math.random() < 0.35 + 0.5 * d ? Wc(c) : E(); return one(cells); }
    case 'wallBlock': { const p = shuffle([0, 1, 2]); const cells = p.map(Wc); cells[L] = B(); return one(cells); }
    case 'twoWalls': { const cells = [Wc(c), Wc(c), Wc(c)]; cells[L] = Wc(o1); return one(cells); }
    case 'laneColor': { const cells = [B(), B(), B()]; cells[L] = Wc(c); if (d > 0.55 && Math.random() < 0.5) { const k = (L + 1 + rint(2)) % 3; cells[k] = Wc(o1); } return one(cells); }
    case 'altSeq': { // walls alternating colours in quick succession
      const n = 3 + (d > 0.6 ? 1 : 0) + (d > 0.9 ? 1 : 0), seq = [], cols = [c, o1, c, o2, o1];
      for (let i = 0; i < n; i++) {
        const cc = cols[i % cols.length];
        if (d > 0.45 && Math.random() < 0.5) { const cells = [Wc(cc), Wc(cc), Wc(cc)]; cells[rint(3)] = Math.random() < 0.5 ? B() : Wc((cc + 1) % NC); seq.push({ cells, extra: { pat: name } }); }
        else seq.push({ cells: [Wc(cc), Wc(cc), Wc(cc)], extra: { pat: name } });
      }
      return seq;
    }
    case 'slalom': { // the free lane jumps from side to side
      const n = 3 + (d > 0.75 ? 1 : 0), seq = []; let free = Math.random() < 0.5 ? -1 : 1;
      for (let i = 0; i < n; i++) {
        const cells = [B(), B(), B()]; cells[free + 1] = d > 0.6 && Math.random() < 0.5 ? Wc(rint(NC)) : E();
        seq.push({ cells, extra: { pat: name } }); free = -free;
      }
      return seq;
    }
    case 'mover': { // a chocolate block slides into a new lane (final layout settles early)
      const cells = [E(), E(), E()], to = L, from = to === 1 ? (Math.random() < 0.5 ? 0 : 2) : 1;
      cells[to] = { t: 'b', from: from - 1 };
      const k = 3 - to - from; // the remaining lane
      if (d > 0.7 || Math.random() < 0.5) cells[k] = Wc(c);
      return one(cells, { mover: true });
    }
    case 'flip': { // full wall that changes colour on the way (always 1 colour change away)
      const cells = [Wc(c), Wc(c), Wc(c)].map(x => ({ ...x, fake: o1 }));
      return one(cells, { flip: true });
    }
  }
  return one([E(), E(), E()]);
}
function spawnNormal() {
  while (spawnZ < FAR) {
    const d = diff();
    if (!pending.length) pending = genSequence(d);
    const { cells, extra } = pending.shift();
    const B2 = passStates(cells);
    const actions = transCost(lastPass, B2);
    const gapT = Math.max(minGapT(d), reactT(d) + actions * actT(d));
    const gap = gapT * speed;
    const z = spawnZ + gap;
    const ex = { ...extra };
    if (ex.mover) { ex.moveEnd = Math.min(FAR - 16, gap + speed * 0.45 + 4); ex.moveStart = Math.min(FAR - 3, ex.moveEnd + 12); }
    if (ex.flip) ex.flipZ = speed * (reactT(d) + 2 * actT(d) * COLW + 0.2);
    if (Math.random() < 0.7) {
      const opts = []; cells.forEach((cc, i) => { if (cc.t !== 'b') opts.push(i); });
      const lane = opts[rint(opts.length)] - 1;
      const n = 3 + rint(3), sp = Math.min(1.7, gap / (n + 2));
      for (let i = 0; i < n; i++) stars.push({ lane, z: z - gap * 0.5 - (n / 2 - i) * sp, got: false, ph: Math.random() * 6 });
    }
    mkRow(z, cells, ex);
    lastPass = B2; spawnZ = z;
  }
}
// visual state of special rows (mover / flip)
function updateSpecialRows() {
  for (const r of rows) {
    if (r.mover) for (const c of r.cells) if (c.t === 'b' && c.from != null) {
      const k = clamp((r.moveStart - r.z) / (r.moveStart - r.moveEnd), 0, 1);
      c.vis = k * k * (3 - 2 * k);
    }
    if (r.flip) for (const c of r.cells) c.show = r.flipped ? c.c : c.fake;
    if (r.flip && !r.flipped && r.z <= r.flipZ) {
      for (const c of r.cells) c.show = c.c;
      r.flipped = true;
      if (state === 'play' && r.z > 0) {
        for (let i = 0; i < 3; i++) { const p = proj(i - 1, r.z); burst(p.x, p.y - laneW * 0.5 * p.s, PAL[r.cells[i].c].lrgb, 6, { min: 60, max: 180, g: 0, type: 'spark', life: 0.5, rmin: 2, rmax: 4 }); }
        Snd.tone(1200, 0.12, { type: 'triangle', vol: 0.06 }); Snd.tone(1600, 0.1, { type: 'triangle', vol: 0.05, delay: 0.05 });
      }
    }
  }
}

// Tutorial: scripted rows; game slows down (never kills) until the right action is done.
const TUT = [
  { hint: 'Desliza ← → para cambiar de carril', need: 'swipe' },
  { hint: '¡Otra vez! Esquiva el chocolate', need: 'swipe' },
  { hint: 'Toca la pantalla o un botón de abajo para cambiar de color', need: 'tap' },
  { hint: '¡Atraviesa las paredes de tu mismo color!', need: 'any' },
  { hint: 'Elige carril y color… ¡tú puedes!', need: 'any' },
];
function spawnTutorial() {
  const s = TUT[tutStep]; if (!s) return;
  const z = tutStep === 0 ? 30 : 30;
  const L = mochi.lane;
  let cells;
  if (tutStep === 0) { cells = [E(), E(), E()]; cells[L + 1] = B(); const side = L === 1 ? -1 : 1; for (let i = 0; i < 4; i++) stars.push({ lane: clamp(L + side, -1, 1), z: z - 10 + i * 1.8, got: false, ph: i }); }
  else if (tutStep === 1) { cells = [B(), B(), B()]; const free = L === 0 ? (Math.random() < .5 ? -1 : 1) : -L; cells[free + 1] = E(); }
  else if (tutStep === 2) { const nc = (mochi.color + 1) % NC; cells = [Wc(nc), Wc(nc), Wc(nc)]; }
  else if (tutStep === 3) { const p = shuffle([0, 1, 2]); cells = p.map(Wc); }
  else { cells = [Wc(0), Wc(1), Wc(2)]; cells[L + 1] = B(); const o = shuffle([0, 1, 2].filter(i => i !== L + 1)); cells[o[0]] = Wc((mochi.color + 1) % NC); cells[o[1]] = Wc((mochi.color + 2) % NC); }
  mkRow(z, cells, { tut: tutStep });
  showHint(s.hint);
}
function cellOK(cell) { return cell.t === 'e' || (cell.t === 'w' && cell.c === mochi.color); }

// ================= Effects =================
function burst(x, y, col, n, opt = {}) {
  for (let i = 0; i < n; i++) {
    const a = opt.up ? rnd(-Math.PI * 0.95, -Math.PI * 0.05) : rnd(0, Math.PI * 2), sp = rnd(opt.min || 60, opt.max || 260);
    particles.push({ x, y, vx: Math.cos(a) * sp + (opt.vx || 0), vy: Math.sin(a) * sp + (opt.vy || 0), life: 0, max: rnd(0.4, opt.life || 0.9), r: rnd(opt.rmin || 2, opt.rmax || 6), col, g: opt.g == null ? 500 : opt.g, type: opt.type || 'drop' });
  }
  if (particles.length > 420) particles.splice(0, particles.length - 420);
}
function popup(text, x, y, col = '#fff', size = 28, life = 0.9) { x = clamp(x, size * 2, W - size * 2); popups.push({ text, x, y, col, size, t: 0, life }); }
let hintTimer = 0;
function showHint(txt, dur = 0) {
  const el = document.getElementById('hint'); document.getElementById('hintText').textContent = txt; el.classList.add('on');
  hintTimer = dur;
}
function hideHint() { document.getElementById('hint').classList.remove('on'); hintTimer = 0; }

// ================= HUD =================
const elScore = document.getElementById('score'), elCombo = document.getElementById('combo'), elHud = document.getElementById('hud');
let shownScore = -1, shownCombo = -1, popTO = 0;
function mult() { return 1 + Math.min(5, Math.floor(combo / 3)); }
function updateHUD(force) {
  const s = Math.floor(score);
  if (s !== shownScore || force) { elScore.textContent = s; shownScore = s; }
  if (combo !== shownCombo || force) {
    shownCombo = combo;
    if (combo >= 2) { elCombo.textContent = `Combo ${combo}  ·  x${mult()}`; elCombo.classList.add('on'); } else elCombo.classList.remove('on');
  }
}
function scorePop() { elScore.classList.add('pop'); clearTimeout(popTO); popTO = setTimeout(() => elScore.classList.remove('pop'), 120); }
function addScore(v) { score += v; scorePop(); }

// ================= Input =================
const keyQ = [];
let ptr = null;
function onAction(a) {
  Snd.init();
  if (state === 'menu') { if (a === 'tap' || a === 'start') startGame(); return; }
  if (state === 'over') { if (overT > 0.45 && (a === 'tap' || a === 'start')) startGame(); return; }
  if (state === 'paused') { if (a === 'tap' || a === 'start') resume(); return; }
  if (state === 'cont') { if (a === 'start') acceptContinue(); return; }
  if (state !== 'play') return;
  if (a === 'left' || a === 'right') {
    const nl = clamp(mochi.lane + (a === 'left' ? -1 : 1), -1, 1);
    if (nl !== mochi.lane) {
      mochi.lane = nl; mochi.wobV -= 2.2; Snd.swipe();
      const p = proj(mochi.x, 0);
      burst(p.x, baseY - 4, [255, 255, 255], 5, { up: true, min: 40, max: 120, g: 300, rmin: 2, rmax: 4, life: 0.4, vx: a === 'left' ? 120 : -120 });
    } else { mochi.wobV += 1.5; mochi.vx += (a === 'left' ? -1 : 1) * 3; }
  } else if (a === 'tap' || a === 'start') {
    setColor((mochi.color + 1) % NC);
  } else if (a.startsWith && a.startsWith('col')) {
    setColor(+a.slice(3));
  }
}
function setColor(i) {
  if (i === mochi.color) { sel.v[i] += 4; mochi.wobV += 1; Snd.tick(); return; }
  mochi.color = i; mochi.colPop = 1; mochi.wobV += 2.5; Snd.color(i);
  sel.v[i] += 9;
  const p = proj(mochi.x, 0);
  ripples.push({ x: p.x, y: baseY - laneW * 0.4, t: 0, col: PAL[i].rgb });
  burst(p.x, baseY - laneW * 0.45, PAL[i].lrgb, 10, { min: 80, max: 200, g: 0, type: 'spark', life: 0.5, rmin: 2, rmax: 4 });
  const bp = sel.pos[i]; if (bp) burst(bp.x, bp.y, PAL[i].lrgb, 8, { min: 60, max: 160, g: 0, type: 'spark', life: 0.45, rmin: 2, rmax: 3.5 });
}
cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  ptr = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, t0: performance.now(), used: false, moved: 0 };
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  if (state === 'select') { selPointerDown(e); ptr.used = true; return; }
  if (state !== 'play') { onAction('tap'); ptr.used = true; return; }
  const hb = selectorHit(e.clientX, e.clientY);
  if (hb >= 0) { ptr.used = true; ptr.button = true; onAction('col' + hb); }
}, { passive: false });
cv.addEventListener('pointermove', e => {
  if (!ptr || e.pointerId !== ptr.id || ptr.button) return;
  const dx = e.clientX - ptr.x, th = Math.max(26, Math.min(W, 500) * 0.07);
  ptr.moved = Math.max(ptr.moved, Math.hypot(e.clientX - ptr.x0, e.clientY - ptr.y0));
  const need = ptr.swipes ? th * 4 : th; // 1 lane per flick; a long deliberate drag can chain
  if (Math.abs(dx) > need && Math.abs(dx) > Math.abs(e.clientY - ptr.y0) * 0.6) {
    onAction(dx < 0 ? 'left' : 'right'); ptr.used = true; ptr.x = e.clientX; ptr.swipes = (ptr.swipes || 0) + 1;
  }
});
const endPtr = e => {
  if (!ptr || e.pointerId !== ptr.id) return;
  if (state === 'select') { selPointerUp(e); ptr = null; return; }
  const dtp = performance.now() - ptr.t0;
  if (!ptr.used && ptr.moved < 22 && dtp < 450) onAction('tap');
  ptr = null;
};
cv.addEventListener('pointerup', endPtr);
cv.addEventListener('pointercancel', e => { ptr = null; });
window.addEventListener('keydown', e => {
  const k = e.key;
  if (state === 'select') {
    if (k === 'ArrowLeft' || k === 'a') selGo(-1); else if (k === 'ArrowRight' || k === 'd') selGo(1);
    else if (k === 'Enter' || k === ' ') selPlay(); else if (k === 'Escape' || k === 'Backspace') closeSelect(); else return;
    e.preventDefault(); return;
  }
  if ((k === 'p' || k === 'P') && state === 'menu') { openSelect('menu'); e.preventDefault(); return; }
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') onAction('left');
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') onAction('right');
  else if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W' || k === 'Enter') onAction('tap');
  else if (k === 'm' || k === 'M') toggleMute();
  else if (k === '1' || k === '2' || k === '3') onAction('col' + (+k - 1));
  else return;
  e.preventDefault();
});
document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('contextmenu', e => e.preventDefault());
// Overlay screens forward taps to the game
document.querySelectorAll('.screen:not(#select)').forEach(s => s.addEventListener('pointerdown', e => { e.preventDefault(); onAction('tap'); }));
document.querySelectorAll('.screen:not(#select)').forEach(s => s.style.pointerEvents = 'auto');
function btn(id, fn) { const b = document.getElementById(id); b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); Snd.init(); fn(); }); }
btn('charBtn', () => { if (state === 'menu') { Snd.tick(); openSelect('menu'); } });
btn('charBtn2', () => { if (state === 'over' && overT > 0.3) { Snd.tick(); openSelect('over'); } });
btn('selBack', () => { Snd.tick(); closeSelect(); });
btn('selPrev', () => selGo(-1));
btn('selNext', () => selGo(1));
btn('selPick', () => selPlay());
btn('contGo', () => acceptContinue());
btn('contNo', () => { if (!contBusy) declineContinue(); });
btn('contNoAds', async () => { if (contBusy) return; contBusy = true; const ok = await MON.buy(MOCHI_CONFIG.products.noAds, 'Mochi · Sin anuncios'); contBusy = false; if (ok && state === 'cont') { contT = 0; offerContinue(); } });
btn('selBuy', async () => { const c = CH[selIdx]; if (isUnlocked(selIdx)) return; const ok = await MON.buy(MON.charProduct(c.id), 'Personaje: ' + c.name); if (ok) { updateSelectUI(); for (let k = 0; k < 18; k++) burst(W / 2, H * 0.34, PAL[k % 3].lrgb, 1, { min: 80, max: 260, g: 200, type: 'star', life: 0.9, rmin: 2, rmax: 5 }); Snd.record(); } });
btn('selRestore', async () => { await MON.restore(); updateSelectUI(); });
btn('selPrivacy', () => MON.privacyForm());
btn('selNoAds', async () => { if (MON.noAds()) return; const ok = await MON.buy(MOCHI_CONFIG.products.noAds, 'Mochi · Sin anuncios'); if (ok) updateSelectUI(); });
MON.onChange(() => { if (state === 'select') updateSelectUI(); if (!isUnlocked(selChar)) selChar = 0; });
const muteBtn = document.getElementById('mute');
const ICON_ON = '<svg viewBox="0 0 24 24"><path d="M4 9h3l5-4v14l-5-4H4z" fill="#c07ad8"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" stroke="#c07ad8" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
const ICON_OFF = '<svg viewBox="0 0 24 24"><path d="M4 9h3l5-4v14l-5-4H4z" fill="#c9a8d8"/><path d="M16 9l5 6M21 9l-5 6" stroke="#e48ab4" stroke-width="2.2" stroke-linecap="round"/></svg>';
function toggleMute() { Snd.init(); Snd.setMuted(!Snd.muted); muteBtn.innerHTML = Snd.muted ? ICON_OFF : ICON_ON; }
muteBtn.innerHTML = Snd.muted ? ICON_OFF : ICON_ON;
muteBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); toggleMute(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (state === 'play') pause(); if (Snd.ac) Snd.ac.suspend(); }
  else if (Snd.ac) Snd.ac.resume();
});

function setScreen(id) { ['title', 'over', 'pause', 'select', 'cont'].forEach(s => document.getElementById(s).classList.toggle('on', s === id)); }
function startGame() {
  resetRun();
  state = 'play'; stateT = 0; setScreen(null); elHud.style.opacity = 1;
  Snd.start();
  if (tutStep < 0) { showHint('¡A correr!', 1.2); spawnNormal(); }
}
function pause() { state = 'paused'; setScreen('pause'); }
function resume() { state = 'play'; setScreen(null); }
let godMode = false;
function die(cause) {
  if (state !== 'play' || godMode || invulnT > 0) return;
  state = 'dying'; deathT = 0; mochi.dead = true; mochi.deadT = 0;
  shake = 16; flash = 0.5; flashCol = [255, 180, 200]; tsTarget = 0.25; timeScale = 0.25;
  Snd.die(); hideHint();
  if (navigator.vibrate) try { navigator.vibrate(60); } catch (_) {}
  const p = proj(mochi.x, 0);
  burst(p.x, baseY - laneW * 0.35, mochi.rgb, 26, { min: 120, max: 420, rmin: 3, rmax: 8, g: 900, life: 1 });
  burst(p.x, baseY - laneW * 0.35, PAL[mochi.color].lrgb, 12, { min: 60, max: 220, rmin: 2, rmax: 5, g: 0, type: 'spark', life: 0.7 });
  popup(cause === 'wall' ? '¡Color equivocado!' : '¡Plof!', p.x, baseY - laneW * 1.3, '#fff', 30, 1.2);
}
// ---- "Seguir donde te quedaste" (rewarded ad, or free with "sin anuncios"), max 2 per run
const CONT_TIME = 7;
const elCont = document.getElementById('cont'), elContBar = document.getElementById('contBar');
function canContinue() { return MON.available && tutStep < 0 && contUsed < (CFGM.maxContinues || 2); }
function offerContinue() {
  state = 'cont'; contT = 0; contBusy = false;
  const left = (CFGM.maxContinues || 2) - contUsed, free = MON.noAds();
  document.getElementById('contGo').innerHTML = free ? '▶ Seguir gratis' : '▶ Ver anuncio y seguir';
  document.getElementById('contLeft').textContent = left === 1 ? 'Última oportunidad en esta partida' : `Puedes seguir ${left} veces en esta partida`;
  document.getElementById('contScore').textContent = fmtN(Math.floor(score));
  const up = document.getElementById('contNoAds'); up.style.display = free ? 'none' : '';
  up.textContent = `Sin anuncios para siempre · ${MON.price((window.MOCHI_CONFIG || {}).products ? MOCHI_CONFIG.products.noAds : '')}`;
  setScreen('cont'); elHud.style.opacity = 0;
}
async function acceptContinue() {
  if (state !== 'cont' || contBusy) return;
  contBusy = true;
  let ok = MON.noAds();
  if (!ok) { Snd.tick(); ok = await MON.showRewarded(); }
  contBusy = false;
  if (state !== 'cont') return;
  if (ok) revive(); else declineContinue();
}
function declineContinue() { if (state !== 'cont') return; gameOver(); }
function revive() {
  contUsed++;
  // fair restart: clear everything close to Mochi, keep the far rows, 3-2-1 countdown then a short shield
  rows = rows.filter(r => r.z > 30); stars = stars.filter(st => st.z > 30);
  pending = []; lastPass = [{ l: -1, c: -1 }, { l: 0, c: -1 }, { l: 1, c: -1 }];
  spawnZ = Math.max(spawnZ, 30);
  mochi.dead = false; mochi.deadT = 0; mochi.wob = 0; mochi.wobV = 3; mochi.happyT = 0.6;
  combo = 0; timeScale = 1; tsTarget = 1; shake = 0; flash = 0.35; flashCol = [255, 255, 255];
  freezeT = 3; invulnT = 2.2;
  state = 'play'; setScreen(null); elHud.style.opacity = 1; updateHUD(true); hideHint();
  const p = proj(mochi.x, 0);
  burst(p.x, baseY - laneW * 0.4, PAL[mochi.color].lrgb, 18, { min: 80, max: 260, g: 0, type: 'star', life: 0.8, rmin: 2, rmax: 5 });
  Snd.record();
}
function gameOver() {
  state = 'over'; overT = 0;
  const s = Math.floor(score), isRec = s > best;
  if (isRec) { best = s; store.set('mochi_best', String(best)); setTimeout(() => Snd.record(), 250); }
  document.getElementById('finalScore').textContent = fmtN(s);
  document.getElementById('finalBest').textContent = fmtN(best);
  document.getElementById('newRec').classList.toggle('on', isRec && s > 0);
  document.getElementById('overTitle').textContent = ['¡Plof!', '¡Ups!', '¡Blup!', '¡Ay!'][rint(4)];
  const ul = document.getElementById('overUnlock');
  if (runUnlocks.length) { ul.className = 'unl new'; ul.textContent = '¡Desbloqueado: ' + runUnlocks.map(i => CH[i].name).join(', ') + '!'; }
  else { const nx = CH.find((c, i) => !isUnlocked(i)); ul.className = 'unl'; ul.textContent = nx ? 'Próximo personaje: ' + fmtN(nx.unlock) + ' puntos' : '¡Tienes todos los personajes!'; }
  setScreen('over'); elHud.style.opacity = 0;
}
function updateTitleBest() {
  const el = document.getElementById('bestTitle');
  if (best > 0) { el.style.display = ''; el.textContent = 'Récord: ' + fmtN(best); } else el.style.display = 'none';
}

// ================= Update =================
function resolveRow(r) {
  r.done = true;
  const li = clamp(Math.round(mochi.x), -1, 1);
  const cell = r.cells[li + 1];
  const p = proj(mochi.x, 0);
  const hasWall = r.cells.some(c => c.t === 'w');
  if (cell.t === 'b') { die('block'); return; }
  if (cell.t === 'w') {
    if (cell.c !== mochi.color) { die('wall'); return; }
    cell.passT = t; combo++;
    const m = mult(); addScore(10 * m);
    mochi.wobV -= 3.5; mochi.mouthT = 0.35; mochi.happyT = 0.3;
    const pc = PAL[cell.c];
    burst(p.x, baseY - laneW * 0.4, pc.rgb, 16, { min: 120, max: 340, rmin: 3, rmax: 7, g: 700, vy: 60 });
    burst(p.x, baseY - laneW * 0.4, pc.lrgb, 10, { min: 80, max: 240, rmin: 2, rmax: 4, g: 0, type: 'spark', life: 0.6 });
    burst(p.x, baseY - laneW * 0.4, [255, 255, 255], 6, { min: 60, max: 200, rmin: 1.5, rmax: 3, g: 0, type: 'star', life: 0.7 });
    ripples.push({ x: p.x, y: baseY - laneW * 0.4, t: 0, col: pc.rgb, big: true });
    flash = 0.18; flashCol = pc.lrgb;
    Snd.pass(combo);
    if (combo >= 5 && combo % 5 === 0) cheerTown();
    if (navigator.vibrate) try { navigator.vibrate(8); } catch (_) {}
    const words = { 3: '¡Genial!', 5: '¡Increíble!', 8: '¡Mochi-mágico!', 12: '¡Imparable!', 16: '¡Leyenda!', 20: '¡Gelatina suprema!' };
    popup(`+${10 * m}`, p.x + laneW * 0.5, baseY - laneW * 1.0, rgbs(pc.drgb), 26);
    if (words[combo]) popup(words[combo], W / 2, H * 0.36, '#fff', 38, 1.1);
    else if (combo >= 2 && m > 1 && combo % 2 === 0) popup(`x${m}`, p.x - laneW * 0.55, baseY - laneW * 1.1, '#fff', 30);
  } else if (hasWall && r.tut == null && combo > 0) {
    if (combo >= 3) popup('Combo perdido', W / 2, H * 0.4, 'rgba(255,255,255,0.9)', 22, 0.8);
    combo = 0;
  }
  if (r.tut != null) {
    tutStep++;
    if (tutStep >= TUT.length) {
      tutDone = true; store.set('mochi_tut', '1'); tutStep = -1;
      showHint('¡Muy bien! ¡A correr! 🍬', 1.6);
      spawnZ = r.z + 8; spawnNormal();
    } else setTimeout(() => { if (state === 'play' && tutStep >= 0) spawnTutorial(); }, 250);
  }
  updateHUD();
}

function update(dt) {
  t += dt; stateT += dt;
  updateTheme(dt); updateMotes(dt); updateSelector(dt);
  if (hintTimer > 0) { hintTimer -= dt; if (hintTimer <= 0) hideHint(); }
  timeScale = lerp(timeScale, tsTarget, 1 - Math.exp(-dt * (tsTarget < timeScale ? 18 : 6)));
  const gdt = dt * timeScale;
  let worldSpeed = 0;
  if (state === 'menu' || state === 'over' || state === 'select') worldSpeed = state === 'over' ? 0 : state === 'select' ? 3 : 5;
  if (state === 'play' && freezeT > 0) {
    const before = Math.ceil(freezeT); freezeT -= dt; tsTarget = 1;
    if (Math.ceil(freezeT) !== before && freezeT > 0) Snd.tick();
    if (freezeT <= 0) { Snd.start(); showHint('¡Adelante!', 0.9); }
  } else if (state === 'play') {
    if (invulnT > 0) invulnT = Math.max(0, invulnT - gdt);
    runT += tutStep >= 0 ? 0 : gdt;
    if (tutStep < 0) dCur = lerp(dCur, diffTarget(score), 1 - Math.exp(-gdt * 0.8));
    const d = diff();
    speed = Math.min(31, 12.5 + 14.5 * Math.min(d, 1) + 8 * Math.max(0, d - 1));
    worldSpeed = speed;
    score += gdt * speed * 0.25;
    // tutorial slow-motion assist
    tsTarget = 1;
    for (const r of rows) {
      if (r.tut != null && !r.done && r.z < 9) {
        const li = clamp(Math.round(mochi.x), -1, 1);
        if (!cellOK(r.cells[li + 1])) tsTarget = r.z < 3.5 ? 0 : r.z < 6 ? 0.12 : 0.4;
      }
    }
    if (tutStep < 0) spawnNormal();
    checkUnlocks();
  }
  if (banners.length) banners[0].t += dt;
  if (state === 'select') selView = lerp(selView, selIdx, 1 - Math.exp(-dt * 12));
  if (state === 'dying') { deathT += dt; worldSpeed = speed * 0.0; if (deathT > 0.95) { if (canContinue()) offerContinue(); else gameOver(); } tsTarget = 1; }
  if (state === 'cont') { contT += dt; const k = clamp(1 - contT / CONT_TIME, 0, 1); elContBar.style.transform = `scaleX(${k})`; if (contT > CONT_TIME && !contBusy) declineContinue(); }
  if (state === 'over') overT += dt;
  const move = worldSpeed * (state === 'play' ? gdt : dt);
  dist += move;
  // rows
  if (state === 'play') {
    spawnZ -= move;
    for (const r of rows) {
      r.z -= move;
    }
    updateSpecialRows();
    for (const r of rows) {
      if (!r.done && r.z <= 0) { resolveRow(r); if (state !== 'play') break; }
    }
    rows = rows.filter(r => r.z > -4);
    // stars
    const li = clamp(Math.round(mochi.x), -1, 1);
    for (const s of stars) {
      s.z -= move;
      if (!s.got && s.z <= 0.3 && s.z > -0.8 && s.lane === li) {
        s.got = true; s.gotT = 0;
        if (t - starStreakT < 0.6) starStreak++; else starStreak = 0; starStreakT = t;
        addScore(5 * mult()); Snd.star(starStreak);
        const p = proj(mochi.x, 0);
        burst(p.x, baseY - laneW * 0.8, [255, 226, 122], 7, { min: 60, max: 180, g: 0, type: 'star', rmin: 2, rmax: 4, life: 0.5 });
        popup('+' + 5 * mult(), p.x, baseY - laneW * 1.2, '#f5a23a', 20, 0.6);
        updateHUD();
      }
    }
    stars = stars.filter(s => s.z > -3 && !(s.got && s.gotT > 0.4));
  }
  for (const s of stars) if (s.got) s.gotT += dt;
  // scenery
  for (const s of scenery) s.z -= move;
  scenery = scenery.filter(s => s.z > -3);
  spawnTown(move);
  // mochi physics
  const m = mochi;
  if (state === 'menu') m.lane = 0;
  const tx = m.lane;
  const k = 260, c = 2 * Math.sqrt(k) * 0.95; // snappy spring
  m.vx += ((tx - m.x) * k - m.vx * c) * dt; m.x += m.vx * dt;
  m.wobV += (-m.wob * 300 - m.wobV * 10) * dt; m.wob += m.wobV * dt;
  m.colPop = Math.max(0, m.colPop - dt * 5);
  const target = PAL[m.color].rgb;
  m.rgb = mix(m.rgb, target, 1 - Math.exp(-dt * 22));
  if (!m.dead) {
    const hopRate = state === 'play' ? 7 + speed * 0.28 : 5.5;
    m.hopPh += dt * hopRate * (state === 'play' ? Math.max(0.3, timeScale) : 1);
  }
  const prevHop = m.hop;
  m.hop = Math.abs(Math.sin(m.hopPh));
  const vy = (m.hop - prevHop) / Math.max(dt, 1e-4);
  // ears spring: lag behind vertical & horizontal motion
  const earBase = state === 'menu' ? 0.55 : 0.35;
  const tl = -earBase - clamp(vy * 0.04, -0.6, 0.6) - clamp(m.vx * 0.06, -0.5, 0.5);
  const tr = earBase + clamp(vy * 0.04, -0.6, 0.6) - clamp(m.vx * 0.06, -0.5, 0.5);
  m.earLV += ((tl - m.earL) * 120 - m.earLV * 9) * dt; m.earL += m.earLV * dt;
  m.earRV += ((tr - m.earR) * 120 - m.earRV * 9) * dt; m.earR += m.earRV * dt;
  // blink
  m.blinkT -= dt; if (m.blinkT < 0) { m.blink = 1; m.blinkT = rnd(1.8, 4); }
  m.blink = Math.max(0, m.blink - dt * 7);
  m.mouthT -= dt; m.happyT -= dt;
  if (m.dead) m.deadT += dt;
  // menu blend
  menuBlend = lerp(menuBlend, state === 'menu' ? 1 : 0, 1 - Math.exp(-dt * 7));
  if (state === 'menu') { m.menuColT = (m.menuColT || 0) + dt; if (m.menuColT > 1.6) { m.menuColT = 0; m.color = (m.color + 1) % NC; m.colPop = 1; m.wobV += 2.2; Snd.ac && Snd.tick(); } }
  // particles
  for (const p of particles) { p.life += dt; p.vy += p.g * dt; p.vx *= (1 - dt * 1.5); p.x += p.vx * dt; p.y += p.vy * dt; }
  particles = particles.filter(p => p.life < p.max);
  for (const p of popups) p.t += dt;
  popups = popups.filter(p => p.t < p.life);
  for (const r of ripples) r.t += dt;
  ripples = ripples.filter(r => r.t < 0.5);
  shake = Math.max(0, shake - dt * 40); cheerT = Math.max(0, cheerT - dt);
  flash = Math.max(0, flash - dt * 2.2);
}

// ================= Render =================
function fadeFar(z) { return clamp((FAR - z) / 14, 0, 1); }
const mipCache = new Map();
function drawSprite(g, img, x, z, wUnits, flip, yLift = 0, post) {
  const p = proj(x, z); const w = wUnits * laneW * p.s;
  if (w * DPR < img.width * 0.3) { let m = mipCache.get(img); if (!m) { m = mip(img, 0.33); mipCache.set(img, m); } img = m; }
  const h = w * img.height / img.width;
  if (p.y - h > H || w < 1 || p.x + w < 0 || p.x - w > W || z > FAR - 1) return;
  g.globalAlpha = fadeFar(z);
  g.save(); g.translate(p.x, p.y - yLift * p.s); if (z < 14) g.rotate(Math.sin(t * 1.6 + x * 3 + z * 0.15) * 0.045); if (flip) g.scale(-1, 1);
  g.drawImage(img, -w / 2, -h, w, h); if (post) post(g, w, h); g.restore();
  g.globalAlpha = 1;
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function drawWall(g, lane, z, cell) {
  const p = proj(lane, z), s = p.s;
  const w = laneW * 0.92 * s, h = laneW * 1.08 * s;
  if (p.y - h > H + 40) return;
  const pc = PAL[cell.show != null ? cell.show : cell.c];
  let alpha = fadeFar(z) * 0.9 * (z < 0 ? clamp(1 + z / 0.9, 0, 1) : 1);
  let wob = Math.sin(t * 6 + lane * 2 + z) * 0.015;
  let sx = 1, sy = 1;
  if (cell.passT >= 0) {
    const e = t - cell.passT;
    alpha *= clamp(1 - e * 3.2, 0, 1); if (alpha <= 0.01) return;
    sx = 1 + Math.sin(e * 30) * 0.12 * Math.exp(-e * 6) + e * 0.6; sy = 1 - Math.sin(e * 30) * 0.1 * Math.exp(-e * 6);
  }
  g.save(); g.globalAlpha = alpha;
  g.translate(p.x, p.y); g.scale(sx * (1 + wob), sy * (1 - wob));
  // shadow
  g.fillStyle = rgbs(pc.dprgb, 0.18); g.beginPath(); g.ellipse(0, 0, w * 0.55, h * 0.06, 0, 0, 7); g.fill();
  const x0 = -w / 2, y0 = -h, r = w * 0.22;
  const gr = g.createLinearGradient(x0, y0, x0 + w, 0);
  gr.addColorStop(0, rgbs(pc.lrgb, 0.95)); gr.addColorStop(0.45, rgbs(pc.rgb, 0.82)); gr.addColorStop(1, rgbs(pc.drgb, 0.9));
  rr(g, x0, y0, w, h, r); g.fillStyle = gr; g.fill();
  g.lineWidth = Math.max(1.5, 3 * s); g.strokeStyle = rgbs(pc.dprgb, 0.6); g.stroke();
  // inner wave pattern
  g.save(); rr(g, x0, y0, w, h, r); g.clip();
  g.fillStyle = rgbs(pc.lrgb, 0.35);
  g.beginPath(); g.moveTo(x0, y0 + h * 0.62);
  for (let i = 0; i <= 8; i++) { const xx = x0 + w * i / 8; g.lineTo(xx, y0 + h * 0.62 + Math.sin(i * 1.3 + t * 3 + lane) * h * 0.04); }
  g.lineTo(x0 + w, 0); g.lineTo(x0, 0); g.closePath(); g.fill();
  g.restore();
  // gloss
  g.fillStyle = 'rgba(255,255,255,0.75)';
  rr(g, x0 + w * 0.12, y0 + h * 0.1, w * 0.12, h * 0.5, w * 0.06); g.fill();
  g.beginPath(); g.arc(x0 + w * 0.18, y0 + h * 0.7, w * 0.04, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.4)';
  g.beginPath(); g.arc(x0 + w * 0.7, y0 + h * 0.25, w * 0.05, 0, 7); g.arc(x0 + w * 0.8, y0 + h * 0.4, w * 0.025, 0, 7); g.fill();
  // small face-ish symbol: a mochi silhouette hint = same-colour indicator ring at top
  g.globalAlpha = alpha * 0.9; g.fillStyle = '#fff';
  g.beginPath(); g.arc(0, y0 + h * 0.32, w * 0.13, 0, 7); g.fill();
  g.fillStyle = rgbs(pc.drgb); g.beginPath(); g.arc(0, y0 + h * 0.32, w * 0.085, 0, 7); g.fill();
  if (cell.fake != null && cell.show === cell.fake) { // tricky wall: twinkles, it will change colour
    g.fillStyle = '#fff';
    for (let k = 0; k < 3; k++) {
      const a = t * 2.4 + k * 2.1 + lane, rr2 = w * (0.07 + 0.05 * (0.5 + 0.5 * Math.sin(t * 9 + k * 2)));
      const sx2 = Math.cos(a) * w * 0.36, sy2 = y0 + h * 0.5 + Math.sin(a * 1.3) * h * 0.3;
      g.beginPath(); g.moveTo(sx2, sy2 - rr2); g.quadraticCurveTo(sx2, sy2, sx2 + rr2, sy2); g.quadraticCurveTo(sx2, sy2, sx2, sy2 + rr2); g.quadraticCurveTo(sx2, sy2, sx2 - rr2, sy2); g.quadraticCurveTo(sx2, sy2, sx2, sy2 - rr2); g.fill();
    }
    g.lineWidth = Math.max(1.5, 3 * s); g.setLineDash([w * 0.08, w * 0.07]); g.lineDashOffset = -t * w * 0.6; g.strokeStyle = 'rgba(255,255,255,0.9)';
    rr(g, x0 - w * 0.05, y0 - w * 0.05, w * 1.1, h + w * 0.05, r * 1.1); g.stroke(); g.setLineDash([]);
  }
  g.restore();
}
function drawBlock(g, lane, z, cell) {
  if (cell && cell.from != null) {
    const v = cell.vis || 0; const fl = lerp(cell.from, lane, v);
    if (v < 1 && z < FAR - 2) { // arrow showing where it will slide
      const pa = proj(fl, z), dir = Math.sign(lane - cell.from), aw = laneW * 0.32 * pa.s, ay = pa.y - laneW * 1.2 * pa.s;
      g.globalAlpha = fadeFar(z) * (0.6 + 0.4 * Math.sin(t * 12)); g.fillStyle = '#fff'; g.strokeStyle = 'rgba(120,60,90,0.6)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(pa.x + dir * aw, ay); g.lineTo(pa.x, ay - aw * 0.6); g.lineTo(pa.x, ay + aw * 0.6); g.closePath(); g.fill(); g.stroke(); g.globalAlpha = 1;
    }
    lane = fl;
  }
  const p = proj(lane, z), w = laneW * 0.9 * p.s, h = w * spr.block.height / spr.block.width;
  if (p.y - h > H + 40) return;
  g.globalAlpha = fadeFar(z) * (z < 0 ? clamp(1 + z / 0.9, 0, 1) : 1); if (g.globalAlpha <= 0.01) { g.globalAlpha = 1; return; }
  g.fillStyle = 'rgba(110,60,90,0.22)'; g.beginPath(); g.ellipse(p.x, p.y, w * 0.55, w * 0.07, 0, 0, 7); g.fill();
  g.drawImage(spr.block, p.x - w / 2, p.y - h, w, h);
  g.globalAlpha = 1;
}
// Roadside world in 3 bands per side: A) jelly inhabitants, B) candy trees in rhythm, C) jelly houses
const BANDS = { A: { x: 2.05, step: 2.9 }, B: { x: 2.95, step: 4.2 }, C: { x: 3.95, step: 7 } };
const town = { next: null, treeK: [0, 2], houseK: [0, 1] };
let cheerT = 0;
function cheerTown() {
  cheerT = 1.8;
  for (const s of scenery) if (s.type === 'inh' && s.z > 1 && s.z < 14 && Math.random() < 0.6) {
    const p = proj(s.x, s.z), w = laneW * p.s;
    if (p.x > 0 && p.x < W) burst(p.x, p.y - w * 0.9, [255, 226, 122], 3, { min: 30, max: 90, g: -20, type: 'star', life: 0.9, rmin: 1.5, rmax: 3 });
  }
}
function spawnTown(move) {
  if (!town.next) town.next = { A: [-1.2, 0], B: [-1, 0.6], C: [-1, 1.8] }; // per side: [-1 side, +1 side] next z
  for (const k in town.next) for (let i = 0; i < 2; i++) town.next[k][i] -= move;
  const TREES = ['tree', 'lolly', 'tree2', 'eyetree', 'lolly2', 'tree'];
  for (let i = 0; i < 2; i++) {
    const side = i ? 1 : -1, nx = town.next;
    while (nx.A[i] < FAR + 10) {
      const z = nx.A[i];
      if (Math.random() < 0.18) scenery.push({ z, x: side * (BANDS.A.x + 0.1), type: 'gum', flip: Math.random() < 0.5, ph: 0 });
      else { // a little group: family / friends (1-3)
        const n = 1 + (Math.random() < 0.55 ? 1 : 0) + (Math.random() < 0.25 ? 1 : 0), v0 = rint(12);
        for (let k = 0; k < n; k++) {
          const kid = k > 0 && Math.random() < 0.5;
          const sign = k === 0 && Math.random() < 0.3 ? rint(SIGNS.length) : -1;
          scenery.push({ z: z + k * 0.35, x: side * (BANDS.A.x + k * 0.42 + (kid ? 0.05 : 0)), type: 'inh', v: (v0 + k * 5) % 12, sc: kid ? 0.68 : 1, sign, lantern: k === n - 1 && Math.random() < 0.6, flip: false, ph: Math.random() * 10, side });
        }
      }
      nx.A[i] += BANDS.A.step + rnd(-0.35, 0.35);
    }
    while (nx.B[i] < FAR + 10) { scenery.push({ z: nx.B[i], x: side * BANDS.B.x, type: TREES[town.treeK[i]++ % TREES.length], flip: side > 0, ph: Math.random() * 10 }); nx.B[i] += BANDS.B.step; }
    while (nx.C[i] < FAR + 10) { const hk = town.houseK[i]++; scenery.push({ z: nx.C[i], x: side * BANDS.C.x, type: hk % 4 === 3 ? 'cupcake' : 'house', hv: hk % 3, flip: side < 0, ph: Math.random() * 10 }); nx.C[i] += BANDS.C.step; }
  }
}
function groundShadow(g, x, z, wUnits) {
  const p = proj(x, z); const w = wUnits * laneW * p.s;
  if (w < 20 || z > 18 || p.x + w < 0 || p.x - w > W || p.y > H + 10) return;
  g.globalAlpha = fadeFar(z);
  g.fillStyle = TP.stars > 0.5 ? 'rgba(20,10,60,0.22)' : 'rgba(150,90,160,0.18)'; g.beginPath(); g.ellipse(p.x, p.y, w * 0.42, w * 0.08, 0, 0, 7); g.fill();
  g.globalAlpha = 1;
}
function drawInhabitant(g, s) {
  const p = proj(s.x, s.z), units = 1.0 * s.sc, w = units * laneW * p.s;
  if (w < 3 || p.y > H + 10 || p.x < -w || p.x > W + w || s.z > 33) return;
  const a = clamp((33 - s.z) / 7, 0, 1) * (s.z < 0 ? clamp(1 + s.z / 1.5, 0, 1) : 1); if (a <= 0.02) return;
  const near = s.z > -0.5 && s.z < 7, cheer = cheerT > 0 && s.z < 30;
  const excite = cheer || near;
  const hopF = cheer ? 7 : excite ? 9 : 2.6, hopA = cheer ? 0.7 : excite ? 0.32 : 0.06;
  const hop = Math.abs(Math.sin(t * hopF + s.ph)) * hopA * w;
  const up = excite ? (cheer || Math.sin(t * 8 + s.ph) > -0.2) : (s.sign >= 0 || Math.sin(t * 1.3 + s.ph) > 0.85);
  const fr = spr.inh[s.v][up ? 1 : 0], img = w * DPR < fr.small.width * 1.15 ? fr.small : fr.big, h = w * img.height / img.width;
  const sq = 1 + Math.sin(t * hopF * 2 + s.ph) * (excite ? 0.06 : 0.03);
  g.globalAlpha = a;
  // shadow on the ground
  if (w > 22) { g.fillStyle = TP.stars > 0.5 ? 'rgba(20,10,60,0.25)' : 'rgba(150,90,160,0.2)'; g.beginPath(); g.ellipse(p.x, p.y, w * 0.32 * (1 - hop / w * 0.8), w * 0.07, 0, 0, 7); g.fill(); }
  // lantern glow at night
  const night = TP.stars;
  if (night > 0.3 && s.lantern && s.z < 30) {
    const lx = p.x - s.side * w * 0.42, ly = p.y - w * 0.95 + Math.sin(t * 2 + s.ph) * w * 0.03, gs = w * 1.4;
    g.globalAlpha = a * night * (0.75 + 0.25 * Math.sin(t * 5 + s.ph)); g.drawImage(spr.glow, lx - gs / 2, ly - gs / 2, gs, gs);
    g.globalAlpha = a * night; const lw = w * 0.3, lh = lw * spr.lantern.height / spr.lantern.width; g.drawImage(spr.lantern, lx - lw / 2, ly - lh * 0.55, lw, lh);
    g.globalAlpha = a;
  }
  if (s.z > 16) g.drawImage(img, p.x - w / 2, p.y - hop - h * 0.97, w, h);
  else { g.save(); g.translate(p.x, p.y - hop); g.scale(1 / sq, sq); g.drawImage(img, -w / 2, -h * 0.97, w, h); g.restore(); }
  if (s.sign >= 0 && w > 10) { const sw = w * 0.85, sh = sw * spr.signs[0].height / spr.signs[0].width; if (s.z > 16) g.drawImage(spr.signs[s.sign], p.x - sw / 2, p.y - hop - h * 0.62 - sh, sw, sh); else { g.save(); g.translate(p.x, p.y - hop - h * 0.62); g.rotate(Math.sin(t * (excite ? 8 : 2) + s.ph) * 0.12); g.drawImage(spr.signs[s.sign], -sw / 2, -sh, sw, sh); g.restore(); } }
  g.globalAlpha = 1;
}
function drawScenery(g, s) {
  if (window.__SK && window.__SK[s.type]) return;
  if (s.type === 'inh') { drawInhabitant(g, s); return; }
  if (s.type === 'house') {
    groundShadow(g, s.x, s.z, 1.5);
    drawSprite(g, spr.house[s.hv], s.x, s.z, 1.5, s.flip);
    if (TP.stars > 0.05) { const a = TP.stars; const p = proj(s.x, s.z); const w = 1.5 * laneW * p.s, img = spr.houseLit[s.hv], h = w * img.height / img.width; g.globalAlpha = fadeFar(s.z) * a; g.save(); g.translate(p.x, p.y); g.rotate(Math.sin(t * 1.6 + s.x * 3 + s.z * 0.15) * 0.045); if (s.flip) g.scale(-1, 1); g.drawImage(img, -w / 2, -h, w, h); g.restore(); g.globalAlpha = 1; }
    return;
  }
  groundShadow(g, s.x, s.z, s.type === 'gum' ? 0.9 : s.type === 'cupcake' ? 1.0 : 1.0);
  const ty = s.type;
  if (ty === 'eyetree') { const closed = (t * 0.55 + s.ph) % 3.2 < 0.16; drawSprite(g, closed ? spr.eyetreeC : spr.eyetree, s.x, s.z, 1.3, s.flip); return; }
  if (ty.startsWith('gummy')) {
    const pc = PAL[+ty[5]], ph = s.ph;
    drawSprite(g, spr[ty], s.x, s.z, 0.62, s.flip, 0, (g2, w, h) => { // waving right arm
      const a = -1.9 + Math.sin(t * 7 + ph) * 0.55;
      g2.save(); g2.translate(w * 0.24, -h * 0.4); g2.rotate(a);
      g2.fillStyle = rgbs(pc.lrgb, 0.95); g2.strokeStyle = rgbs(pc.drgb, 0.7); g2.lineWidth = Math.max(1, w * 0.02);
      g2.beginPath(); g2.ellipse(w * 0.1, 0, w * 0.13, w * 0.075, 0, 0, 7); g2.fill(); g2.stroke(); g2.restore();
    });
    return;
  }
  drawSprite(g, spr[ty], s.x, s.z, ty === 'gum' ? 1.0 : ty === 'cupcake' ? 0.9 : 1.25, s.flip);
}
function drawStar(g, s) {
  const lift = laneW * 0.45;
  const p = proj(s.lane, s.z);
  let size = laneW * 0.42 * p.s, y = p.y - lift * p.s + Math.sin(t * 4 + s.ph) * 4 * p.s, x = p.x, a = fadeFar(s.z);
  if (s.got) { const e = s.gotT / 0.4; size *= 1 + e * 0.8; a *= 1 - e; y -= e * 40; }
  if (y - size > H) return;
  const sq = Math.cos(t * 3.5 + s.ph);
  g.globalAlpha = a;
  g.fillStyle = 'rgba(255,190,90,0.18)'; g.beginPath(); g.ellipse(p.x, p.y, size * 0.4, size * 0.08, 0, 0, 7); g.fill();
  g.save(); g.translate(x, y); g.scale(0.6 + 0.4 * Math.abs(sq), 1); g.drawImage(spr.star, -size / 2, -size / 2, size, size); g.restore();
  g.globalAlpha = 1;
}
function mochiParams() {
  const m = mochi;
  const hop = m.hop;
  let sy = 1, sx = 1;
  const land = 1 - hop; // 1 when on ground
  sy = 1 - Math.pow(land, 6) * 0.14 + hop * 0.05; sx = 1 / Math.sqrt(sy);
  sy *= 1 - m.wob; sx *= 1 + m.wob;
  const pop = Math.sin(m.colPop * Math.PI) * 0.12; sx *= 1 + pop; sy *= 1 + pop * 0.6;
  // lane change stretch
  sx *= 1 + Math.min(0.18, Math.abs(m.vx) * 0.025); sy *= 1 - Math.min(0.1, Math.abs(m.vx) * 0.012);
  let rot = clamp(m.vx * 0.035, -0.3, 0.3);
  let mouth = m.mouthT > 0 ? 'o' : null;
  if (m.dead) { const e = Math.min(1, m.deadT * 5); sy = lerp(1, 0.5, e) + Math.sin(m.deadT * 25) * 0.05 * Math.exp(-m.deadT * 4); sx = lerp(1, 1.45, e); rot = 0; }
  return { ch: selChar, rgb: m.rgb, sx, sy, rot, earL: m.earL, earR: m.earR, earBend: 0.55 + m.hop * 0.3, foot: Math.sin(m.hopPh), arm: Math.sin(m.hopPh), blink: m.blink, look: state === 'menu' ? 0.3 : -1, lookX: clamp(m.vx * 0.3, -1, 1), mouth, dead: m.dead, happy: m.happyT > 0 };
}
function drawMochiInWorld(g) {
  if (invulnT > 0 && freezeT <= 0 && Math.sin(t * 30) > 0.3) { g.globalAlpha = 0.45; drawMochiInWorld2(g); g.globalAlpha = 1; return; }
  drawMochiInWorld2(g);
}
function drawMochiInWorld2(g) {
  const m = mochi;
  const p = proj(m.x, 0);
  const gameSize = laneW * 0.8, menuSize = Math.min(W * 0.42, H * 0.24);
  const size = lerp(gameSize, menuSize, menuBlend);
  const fx = lerp(p.x, W / 2, menuBlend), fy = lerp(baseY, H * 0.64, menuBlend);
  const hopA = (state === 'menu' ? 0.22 : 0.16) * size;
  const lift = m.dead ? 0 : m.hop * hopA;
  // shadow
  const shw = size * 0.5 * (1 - m.hop * 0.25);
  g.fillStyle = 'rgba(150,90,160,0.22)'; g.beginPath(); g.ellipse(fx, fy, shw, shw * 0.22, 0, 0, 7); g.fill();
  // colour aura
  if (!m.dead) {
    const ag = g.createRadialGradient(fx, fy - size * 0.45 - lift, size * 0.2, fx, fy - size * 0.45 - lift, size * 0.95);
    ag.addColorStop(0, rgbs(m.rgb, 0.0)); ag.addColorStop(0.6, rgbs(m.rgb, 0.18 + m.colPop * 0.25)); ag.addColorStop(1, rgbs(m.rgb, 0));
    g.fillStyle = ag; g.beginPath(); g.arc(fx, fy - size * 0.45 - lift, size * 0.95, 0, 7); g.fill();
  }
  if (m.dead) {
    // puddle
    const e = Math.min(1, m.deadT * 4);
    g.fillStyle = rgbs(m.rgb, 0.55); g.beginPath(); g.ellipse(fx, fy, size * 0.75 * e, size * 0.16 * e, 0, 0, 7); g.fill();
  }
  const mp = mochiParams();
  if (!m.dead && menuBlend < 0.5) {
    g.save(); g.translate(fx, fy + 2); g.scale(1, -0.38);
    drawMochi(g, 0, -lift, size, { ...mp, alpha: 0.1 * (1 - menuBlend * 2) });
    g.restore();
  }
  drawMochi(g, fx, fy - lift, size, mp);
}
function drawTutorialCues(g) {
  if (state !== 'play' || tutStep < 0) return;
  const need = TUT[tutStep] && TUT[tutStep].need;
  const r = rows.find(r => r.tut != null && !r.done);
  if (!r || r.z > 16) return;
  const li = clamp(Math.round(mochi.x), -1, 1);
  const wrong = !cellOK(r.cells[li + 1]);
  if (!wrong) return;
  const p = proj(mochi.x, 0), cy = baseY - laneW * 0.45;
  const pulse = 0.5 + 0.5 * Math.sin(t * 10);
  // Is a tap enough? (some lane wall matching after tap in current lane)
  const cell = r.cells[li + 1];
  if (cell.t === 'w') {
    g.strokeStyle = `rgba(255,255,255,${0.5 + pulse * 0.5})`; g.lineWidth = 4;
    g.beginPath(); g.arc(p.x, cy, laneW * (0.55 + pulse * 0.12), 0, 7); g.stroke();
    g.fillStyle = '#fff'; g.font = `700 ${Math.round(laneW * 0.2)}px Fredoka, sans-serif`; g.textAlign = 'center';
    g.fillText('¡TOCA!', p.x, cy - laneW * 0.85);
  }
  if (cell.t === 'b' || need === 'swipe' || cell.t === 'w') {
    // arrows toward ok lanes
    for (const d of [-1, 1]) {
      const nl = li + d; if (nl < -1 || nl > 1) continue;
      let okDir = false; for (let q = nl; q >= -1 && q <= 1; q += d) if (cellOK(r.cells[q + 1])) okDir = true;
      if (!okDir) continue;
      const ax = p.x + d * laneW * (0.62 + pulse * 0.12);
      g.fillStyle = `rgba(255,255,255,${0.6 + 0.4 * pulse})`; g.strokeStyle = 'rgba(220,120,180,0.8)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(ax + d * 18, cy); g.lineTo(ax - d * 4, cy - 18); g.lineTo(ax - d * 4, cy - 8); g.lineTo(ax - d * 20, cy - 8); g.lineTo(ax - d * 20, cy + 8); g.lineTo(ax - d * 4, cy + 8); g.lineTo(ax - d * 4, cy + 18); g.closePath(); g.fill(); g.stroke();
    }
  }
}
function render() {
  const g = ctx;
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  g.save();
  if (shake > 0) g.translate(rnd(-shake, shake) * 0.6, rnd(-shake, shake) * 0.6);
  drawWorld(g);
  drawMotes(g);
  // collect drawables sorted far->near
  const items = [];
  for (const s of scenery) items.push({ z: s.z, d: () => drawScenery(g, s) });
  for (const r of rows) r.cells.forEach((c, i) => { if (c.t === 'w') items.push({ z: r.z + 0.01, d: () => drawWall(g, i - 1, r.z, c) }); else if (c.t === 'b') items.push({ z: r.z + 0.01, d: () => drawBlock(g, i - 1, r.z, c) }); });
  for (const s of stars) items.push({ z: s.z, d: () => drawStar(g, s) });
  if (state !== 'select') items.push({ z: 0, mochi: true, d: () => drawMochiInWorld(g) });
  items.sort((a, b) => b.z - a.z || (a.mochi ? -1 : 1));
  for (const it of items) it.d();
  // ripples
  for (const r of ripples) {
    const e = r.t / 0.5;
    g.strokeStyle = rgbs(r.col, (1 - e) * 0.8); g.lineWidth = (r.big ? 6 : 4) * (1 - e) + 1;
    g.beginPath(); g.ellipse(r.x, r.y, laneW * (0.3 + e * (r.big ? 0.9 : 0.6)), laneW * (0.3 + e * (r.big ? 0.9 : 0.6)) * 0.9, 0, 0, 7); g.stroke();
  }
  // particles
  for (const p of particles) {
    const e = p.life / p.max, a = 1 - e;
    if (p.type === 'spark') { g.fillStyle = rgbs(p.col, a); g.beginPath(); g.arc(p.x, p.y, p.r * (1 - e * 0.5), 0, 7); g.fill(); }
    else if (p.type === 'star') {
      g.fillStyle = rgbs(p.col, a); const r = p.r * 2 * (1 - e * 0.3);
      g.beginPath(); g.moveTo(p.x, p.y - r); g.quadraticCurveTo(p.x, p.y, p.x + r, p.y); g.quadraticCurveTo(p.x, p.y, p.x, p.y + r); g.quadraticCurveTo(p.x, p.y, p.x - r, p.y); g.quadraticCurveTo(p.x, p.y, p.x, p.y - r); g.fill();
    } else {
      g.fillStyle = rgbs(p.col, a * 0.9); g.beginPath(); g.ellipse(p.x, p.y, p.r, p.r * (1 + Math.min(1, Math.abs(p.vy) / 600) * 0.6), 0, 0, 7); g.fill();
      g.fillStyle = `rgba(255,255,255,${a * 0.7})`; g.beginPath(); g.arc(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.3, 0, 7); g.fill();
    }
  }
  drawTutorialCues(g);
  g.restore();
  // popups
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const p of popups) {
    const e = p.t / p.life;
    const sc = e < 0.15 ? lerp(0.4, 1.15, e / 0.15) : e < 0.25 ? lerp(1.15, 1, (e - 0.15) / 0.1) : 1;
    const y = p.y - e * 40;
    g.globalAlpha = e > 0.7 ? 1 - (e - 0.7) / 0.3 : 1;
    g.font = `700 ${Math.round(p.size * sc)}px Fredoka, ui-rounded, sans-serif`;
    g.lineJoin = 'round'; g.lineWidth = Math.max(5, p.size * 0.26); g.strokeStyle = p.col === '#fff' ? 'rgba(220,110,175,0.9)' : p.col; g.strokeText(p.text, p.x, y);
    g.fillStyle = '#fff'; g.fillText(p.text, p.x, y);
    g.globalAlpha = 1;
  }
  drawSelector(g);
  if (state === 'select') drawSelect(g);
  drawBanners(g);
  if (state === 'play' && freezeT > 0) {
    const n = Math.ceil(freezeT), f = freezeT - Math.floor(freezeT), sc = 1 + (1 - f) * 0.0 + Math.max(0, f - 0.7) * 1.6;
    g.save(); g.translate(W / 2, H * 0.4); g.scale(sc, sc); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `700 ${Math.round(Math.min(W, H) * 0.3)}px Fredoka, sans-serif`; g.lineJoin = 'round';
    g.lineWidth = 16; g.strokeStyle = 'rgba(220,110,175,0.95)'; g.strokeText(String(n), 0, 0); g.fillStyle = '#fff'; g.fillText(String(n), 0, 0);
    g.restore();
    g.font = '700 22px Fredoka, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.strokeStyle = 'rgba(200,100,170,0.9)'; g.lineWidth = 6;
    g.strokeText('¡Prepárate!', W / 2, H * 0.4 + Math.min(W, H) * 0.2); g.fillText('¡Prepárate!', W / 2, H * 0.4 + Math.min(W, H) * 0.2);
  }
  if (flash > 0) { g.fillStyle = rgbs(flashCol, flash * 0.5); g.fillRect(0, 0, W, H); }
}

// ================= Loop =================
let last = performance.now(), fpsAcc = 0, fpsN = 0, fps = 60;
function frame(now) {
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.05) dt = 0.05; if (dt < 0) dt = 0;
  fpsAcc += dt; fpsN++; if (fpsAcc > 1) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  if (state !== 'paused') {
    // fixed substeps for stable physics
    let rem = dt; while (rem > 0) { const st = Math.min(rem, 1 / 120); update(st); rem -= st; }
  }
  render();
  requestAnimationFrame(frame);
}
window.addEventListener('resize', resize);
resize();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => resize());
updateTitleBest();
requestAnimationFrame(frame);
const _go = gameOver; // refresh title best when returning
// Debug / test hooks
window.__mochi = {
  set god(v) { godMode = v; },
  buttons: () => sel.pos.map(p => ({ x: p.x, y: p.y })), get theme() { return themeTo; }, get themeMix() { return themeMix; }, setTheme(i) { setTheme(i, true); }, addScore(v) { score += v; },
  get state() { return state; }, get score() { return score; }, get fps() { return fps; }, get combo() { return combo; },
  get color() { return mochi.color; }, get lane() { return mochi.lane; }, get tutStep() { return tutStep; },
  rows: () => rows.map(r => ({ z: r.z, pat: r.pat, cells: r.cells.map(c => c.t + (c.c != null ? (c.show != null ? c.show : c.c) : '')), done: r.done, tut: r.tut })),
  skipTutorial() { tutDone = true; store.set('mochi_tut', '1'); },
  get diff() { return dCur; }, get contUsed() { return contUsed; }, get freezeT() { return freezeT; }, get invulnT() { return invulnT; }, ownedChar: i => ownedChar(i), get cheer() { return cheerT; }, cheerNow() { cheerTown(); }, sceneryCount: () => scenery.length, get speed() { return speed; }, get selChar() { return selChar; }, get unlockPts() { return unlockPts; }, get best() { return best; },
  get banners() { return banners.length; }, get selIdx() { return selIdx; }, unlocked: () => CH.map((c, i) => isUnlocked(i)), chars: () => CH.map(c => ({ name: c.name, unlock: c.unlock, interior: c.interior })),
  openSelect() { openSelect('menu'); }, closeSelect, selGo, selPick: selPickCur, selPlay, selectChar(i) { if (isUnlocked(i)) { selChar = i; store.set('mochi_char', String(i)); } },
  banner(i) { banners.push({ ch: i, t: 0 }); }, setDiff(v) { dCur = v; }, debug: DEBUG,
  icon(size, maskable) {
    const c = mkCanvas(size, size), g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, size); bg.addColorStop(0, '#d9c8ff'); bg.addColorStop(0.55, '#ffd0e6'); bg.addColorStop(1, '#ffe6cf');
    g.fillStyle = bg; g.fillRect(0, 0, size, size);
    g.fillStyle = 'rgba(255,255,255,0.5)'; [[0.15, 0.2, 0.02], [0.85, 0.28, 0.015], [0.8, 0.8, 0.02], [0.2, 0.75, 0.012]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x * size, y * size, r * size, 0, 7); g.fill(); });
    const sc = maskable ? 0.42 : 0.52;
    g.fillStyle = 'rgba(160,90,170,0.2)'; g.beginPath(); g.ellipse(size / 2, size * (maskable ? 0.74 : 0.82), size * sc * 0.48, size * sc * 0.1, 0, 0, 7); g.fill();
    drawMochi(g, size / 2, size * (maskable ? 0.74 : 0.82), size * sc, { ch: 0, T: 0.4, rgb: PAL[0].rgb, sx: 1, sy: 1, rot: 0, earL: -0.55, earR: 0.55, earBend: 0.6, foot: 0, arm: 0, blink: 0, look: 0.2, lookX: 0, mouth: null });
    return c.toDataURL('image/png');
  }
};
// keep title "best" fresh
const _setScreen = setScreen;
})();
