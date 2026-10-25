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
let LH = 1; // semiancho en carriles: 1 = 3 carriles (normal), 2 = 5 carriles (modo Online)
const LP0 = () => { const a = []; for (let l = -LH; l <= LH; l++) a.push({ l, c: -1 }); return a; };
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
  laneW = Math.min(W * 0.29, H * 0.17) * (LH > 1 ? 3.1 / (2 * LH + 1.1) : 1);
  const pr = document.createElement('div'); pr.style.cssText = 'position:fixed;bottom:0;height:env(safe-area-inset-bottom);width:1px;visibility:hidden'; document.body.appendChild(pr); safeBottom = pr.offsetHeight || 0; pr.remove();
  baseY = Math.min(H * 0.80, H - safeBottom - Math.max(118, H * 0.15));
  layoutSelector(); buildDropSprites();
  buildBackdrop(); if (typeof skyCache !== 'undefined') { skyCache.dirty = true; [0, 1, 2, 3].forEach(i => setTimeout(() => { const c = skyCache.th[i]; if (!c || !c.ok) renderSkyCache(i); }, 150 + i * 120)); }
  buildSprites();
}

// ================= Sound (WebAudio, soft & cute) =================
const Snd = {
  ac: null, master: null, music: null, muted: store.get('mochi_mute', '0') === '1',
  // Se crea al cargar (suspendido) para que todo esté precargado; cada gesto lo reanuda y la música arranca al instante.
  create() {
    if (this.ac) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try { this.ac = new AC({ latencyHint: 'interactive' }); } catch (e) { this.ac = new AC(); }
    const comp = this.ac.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4;
    this.master = this.ac.createGain(); this.master.gain.value = this.muted ? 0 : 0.6;
    this.master.connect(comp); comp.connect(this.ac.destination);
    this.music = this.ac.createGain(); this.music.gain.value = 0.32; this.musLP = this.ac.createBiquadFilter(); this.musLP.type = 'lowpass'; this.musLP.frequency.value = 2600; this.musLP.Q.value = 0.5; this.music.connect(this.musLP); this.musLP.connect(this.master); // filtro cálido: nada de agudos que piten
    this.noiseBuf = this.ac.createBuffer(1, this.ac.sampleRate * 0.5, this.ac.sampleRate);
    const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.ac.onstatechange = () => { if (this.ac.state === 'running') Music.kick(); };
  },
  init() {
    this.create(); if (!this.ac) return;
    if (!this.unlocked) { // desbloqueo iOS/WebView: buffer silencioso dentro del gesto
      try { const b = this.ac.createBuffer(1, 1, 22050), s = this.ac.createBufferSource(); s.buffer = b; s.connect(this.ac.destination); s.start(0); this.unlocked = true; } catch (e) {}
    }
    if (this.ac.state !== 'running') { const p = this.ac.resume(); if (p && p.then) p.then(() => Music.kick()).catch(() => {}); }
    Music.start(); Music.kick();
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
  brake() { this.noise(0.22, { vol: 0.07, freq: 900, to: 260, q: 0.9 }); this.tone(420, 0.2, { vol: 0.05, to: 170 }); },
  dash(n = 1) { const k = 1 + Math.min(4, n - 1) * 0.12; this.noise(n > 1 ? 0.28 : 0.42, { vol: n > 1 ? 0.08 : 0.11, freq: 300 * k, to: 3200 * k, q: 0.6 }); this.tone(260 * k, 0.3, { vol: 0.04, to: 1250 * k }); },
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
  tick() { if (this.ac && this.ac.currentTime - (this.uiAt || -1) < 0.06) return; this.tone(880, 0.06, { type: 'sine', vol: 0.05 }); },
  // botones: "pop" suave de burbuja (pentatónica, varía un poco para no cansar)
  ui() { if (!this.ac) return; this.uiAt = this.ac.currentTime; const n = [784, 880, 1047, 1175][(this.uiN = ((this.uiN || 0) + 1) % 4)]; this.tone(n * 0.4, 0.08, { vol: 0.06, to: n * 0.7, attack: 0.004 }); },
  // personaje: nota de caja de música según el índice + armónico; dirección = sube/baja
  sel(i, d = 1) { if (!this.ac) return; this.uiAt = this.ac.currentTime; const sc = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 7, 9, 12, 14, 16], m = 60 + sc[i % sc.length], f = 440 * Math.pow(2, (m - 69) / 12);
    this.noise(0.07, { vol: 0.018, freq: 700, to: d > 0 ? 1300 : 500, q: 0.7, type: 'lowpass' }); this.tone(f, 0.32, { vol: 0.08, attack: 0.005 }); this.tone(f, 0.18, { type: 'triangle', vol: 0.015, attack: 0.005 }); if (CH[i] && CH[i].premium) this.tone(f * 1.5, 0.35, { vol: 0.025, delay: 0.07 }); },
  // salida tipo kart: pip · pip · pip · ¡PIIIP! + golpe; la música de partida entra en el golpe
  fanfare() { if (!this.ac) return 0; const b = 0.36;
    for (let k = 0; k < 3; k++) { this.tone(523, 0.18, { vol: 0.09, delay: k * b, attack: 0.006 }); this.tone(523, 0.12, { type: 'triangle', vol: 0.02, delay: k * b }); }
    const h = 3 * b; this.tone(784, 0.5, { vol: 0.09, delay: h, attack: 0.006 }); [262, 330, 392, 523].forEach((f, i) => this.tone(f, 0.6, { vol: 0.06, delay: h + i * 0.012 })); this.tone(523, 0.45, { type: 'triangle', vol: 0.02, delay: h });
    this.tone(130, 0.35, { vol: 0.22, to: 55, delay: h }); this.noise(0.25, { vol: 0.05, freq: 1400, type: 'lowpass', delay: h }); return h; }
};
// Gentle generative music box loop
const Music = {
  timer: null, next: 0, step: 0,
  start() {
    if (this.timer) return;
    this.next = 0;
    this.timer = setInterval(() => this.sched(), 50);
  },
  holdUntil: 0, wasPlay: false,
  // la música de partida entra justo en el golpe de la salida (compás 1, tiempo 1)
  intro(h) { const ac = Snd.ac; if (!ac) return; this.wasPlay = true; this.step = 0; this.holdUntil = ac.currentTime + h; this.next = this.holdUntil; },
  // Tema del menú: "Nube de azúcar" — Fa mayor, I–V–vi–IV a 100 bpm, melodía pegadiza de caja de música + bajo saltarín
  schedMenu(ac) {
    const spb = 60 / 100 / 2, midi = n => 440 * Math.pow(2, (n - 69) / 12);
    const prog = [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]]; // F C Dm Bb (relativo a Fa)
    // 4 compases × 8 corcheas (null = silencio); se repite con variación en la 2ª vuelta
    const melA = [12, null, 16, 19, 21, 19, 16, null, 14, null, 19, null, 23, 21, 19, null, 16, null, 21, 24, 26, 24, 21, null, 17, 19, 21, null, 19, null, 17, 14];
    const melB = [24, null, 21, 19, 16, null, 19, 21, 19, null, 23, 26, 23, null, 19, null, 21, 24, 26, null, 28, 26, 24, 21, 17, null, 21, 19, 17, null, 12, null];
    while (this.next < ac.currentTime + 0.25) {
      const st = this.step % 32, bar = Math.floor(st / 8), b8 = st % 8, ch = prog[bar], t = this.next - ac.currentTime, root = 53; // F3: melodía entre Fa4 y La5 (sin agudos)
      const mel = (Math.floor(this.step / 32) % 2 ? melB : melA)[st];
      if (mel != null) { Snd.tone(midi(root + 12 + mel), spb * 2.2, { type: 'sine', vol: 0.075, delay: t, out: Snd.music, attack: 0.006 }); Snd.tone(midi(root + 12 + mel), spb * 1.2, { type: 'triangle', vol: 0.018, delay: t, out: Snd.music, attack: 0.006 }); } // piano suave
      if (b8 === 0) Snd.tone(midi(root + 24 + ch[1]), spb * 5, { type: 'sine', vol: 0.02, delay: t + 0.02, out: Snd.music, attack: 0.01 }); // campanita cálida
      if (b8 === 0 || b8 === 3 || b8 === 6) Snd.tone(midi(root - 12 + ch[0] + (b8 === 3 ? 7 : 0)), spb * 2.2, { vol: 0.08, delay: t, out: Snd.music, attack: 0.01 });
      if (b8 === 2 || b8 === 6) ch.forEach((n, k) => Snd.tone(midi(root + n), spb * 1.4, { type: 'sine', vol: 0.016, delay: t + k * 0.008, out: Snd.music }));
      this.next += spb; this.step++;
    }
  },
  // (re)sincroniza y programa ya: primera nota en ~10 ms, sin silencio inicial
  kick() { const ac = Snd.ac; if (!ac || ac.state !== 'running') return; if (this.next < ac.currentTime) { this.next = ac.currentTime + 0.01; } this.sched(); },
  sched() {
    const ac = Snd.ac; if (!ac || ac.state !== 'running') return;
    if (this.next < ac.currentTime - 0.05) this.next = ac.currentTime + 0.01; // tras suspensión: sin ráfaga ni hueco
    if (ac.currentTime < this.holdUntil) { this.next = Math.max(this.next, this.holdUntil); if (this.next > ac.currentTime + 0.25) return; }
    const playing = state === 'play' || state === 'paused' || state === 'cont';
    if (playing !== this.wasPlay) { this.wasPlay = playing; if (!playing) { this.step = 0; this.next = Math.max(this.next, ac.currentTime + 0.02); } }
    if (!playing) return this.schedMenu(ac);
    const bpm = 112;
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
    popup(T('themes')[i], W / 2, H * 0.27, rgbs(mix(THEMES[i].sky[1], [120, 60, 160], 0.35)), 34, 2.0);
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
const SIGNS = T('signs');
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
    g.fillStyle = '#f27bb2'; { let fs = Math.round(h * (txt.length > 2 ? 0.27 : 0.4)); g.font = `700 ${fs}px ${I18N.FONT}`; while (fs > 6 && g.measureText(txt).width > w * 0.8) { fs--; g.font = `700 ${fs}px ${I18N.FONT}`; } } g.textAlign = 'center'; g.textBaseline = 'middle';
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
  if (P.moon > 0.5) { g.fillStyle = 'rgba(255,255,255,0.9)'; g.font = `700 ${Math.round(sr * 0.5)}px ${I18N.FONT}`; g.textAlign = 'center'; g.fillText('z', sx + sr * 1.15, sy - sr * 0.75); g.font = `700 ${Math.round(sr * 0.35)}px ${I18N.FONT}`; g.fillText('z', sx + sr * 1.5, sy - sr * 1.15); }
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
// ===== Mejora gráfica noche 3: parallax en capas, carriles con textura y partículas (calidad automática) =====
const GX = window.__GX = { q: 2, fr: 0, t0: 0, sprk: null, bub: null, dust: null, n: 0 }; { const m = /[?&]gxq=(\d)/.exec(location.search); if (m) { GX.q = +m[1]; GX.lock = true; } }
function gxTick() { if (GX.lock) return; const now = performance.now(); if (!GX.t0) GX.t0 = now; GX.fr++; if (now - GX.t0 > 2000) { const fps = GX.fr * 1000 / (now - GX.t0); if (fps < 30 && GX.q > 1) GX.q--; else if (fps < 20 && GX.q > 0) GX.q--; else if (fps > 56 && GX.q < 2) GX.q++; GX.fr = 0; GX.t0 = now; } }
function gxInit() {
  if (GX.sprk) return; let s = 12345; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  GX.sprk = []; for (let i = 0; i < 150; i++) GX.sprk.push({ x: r() * 2 - 1, z: r() * 24, c: (r() * 5) | 0, a: r() * 6.28, l: 0.5 + r() * 0.8 });
  GX.bub = []; for (let i = 0; i < 14; i++) GX.bub.push({ x: r(), y: r(), r: 4 + r() * 14, sp: 6 + r() * 14, ph: r() * 6.28, d: 0.1 + r() * 0.3 });
  GX.dust = []; for (let i = 0; i < 26; i++) GX.dust.push({ x: r(), y: r(), r: 1 + r() * 2.6, sp: 10 + r() * 30, ph: r() * 6.28 });
}
const SPRK_COL = ['#ff8fc0', '#8fd8ff', '#ffe27a', '#b9a2f7', '#8ff0c4'];
function gxRidges(g, P, px) { // dos cordilleras lejanas a distinta velocidad (parallax)
  if (GX.q < 1) return; const Hh = horizonY;
  for (let L = 0; L < 2; L++) {
    const col = mix(P.ground[0], L ? [255, 255, 255] : [200, 160, 235], L ? 0.25 : 0.3), sp = L ? 0.06 : 0.025, amp = Hh * (L ? 0.05 : 0.08), base = Hh * (L ? 1.0 : 0.985);
    const off = px * sp + t * (L ? 4 : 1.5);
    const gr = g.createLinearGradient(0, base - amp * 2, 0, Hh + 2); gr.addColorStop(0, rgbs(col, (L ? 0.9 : 0.75) * (1 - 0.4 * P.stars))); gr.addColorStop(1, rgbs(mix(col, P.fog, 0.5), 0.9));
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, Hh + 2);
    for (let k = 0; k <= 48; k++) { const x = k / 48 * W, u = (x + off) / W * 6.283; g.lineTo(x, base - amp * (0.55 + 0.3 * Math.sin(u * (L ? 3 : 2) + L) + 0.18 * Math.sin(u * 7.3 + 1.7 * L) + 0.1 * Math.sin(u * 13.1))); }
    g.lineTo(W, Hh + 2); g.closePath(); g.fill();
  }
}
function gxBubbles(g, px) { // burbujas de gelatina flotando delante del cielo (capa más cercana)
  if (GX.q < 1) return; gxInit(); g.save(); g.globalCompositeOperation = 'lighter';
  for (const b of GX.bub) { const y = ((b.y * horizonY * 1.1 - t * b.sp) % (horizonY * 1.1) + horizonY * 1.1) % (horizonY * 1.1) - b.r, x = ((b.x * W + px * b.d + Math.sin(t * 0.7 + b.ph) * 14) % W + W) % W;
    g.globalAlpha = 0.18 * (0.6 + 0.4 * Math.sin(t + b.ph)); g.strokeStyle = '#ffffff'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, b.r, 0, 7); g.stroke();
    g.globalAlpha *= 1.6; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x - b.r * 0.35, y - b.r * 0.35, b.r * 0.22, 0, 7); g.fill(); }
  g.restore();
}
function gxRoad(g, P, RH) { // textura del camino: brillo por carril + virutas de azúcar que avanzan con la carrera
  // franjas de carril alternas con brillo suave
  for (let lx = -LH; lx <= LH; lx++) { if (((lx + LH) & 1) === 0) continue; const a0 = proj(lx - 0.5, -2.8), a1 = proj(lx + 0.5, -2.8);
    g.fillStyle = 'rgba(255,255,255,0.07)'; g.beginPath(); g.moveTo(W / 2 + (lx - 0.5) * 0.001, horizonY); g.lineTo(a1.x, a1.y); g.lineTo(a0.x, a0.y); g.closePath(); g.fill(); }
  // sombreado de bordes (oclusión) para dar volumen
  for (const sd of [-1, 1]) { const e0 = proj(sd * RH, -2.8), e1 = proj(sd * (RH - 0.35), -2.8); const lg = g.createLinearGradient(e0.x, 0, e1.x, 0); lg.addColorStop(0, 'rgba(110,50,120,0.16)'); lg.addColorStop(1, 'rgba(110,50,120,0)');
    g.fillStyle = lg; g.beginPath(); g.moveTo(W / 2, horizonY); g.lineTo(e0.x, e0.y); g.lineTo(e1.x, e1.y); g.closePath(); g.fill(); }
  if (GX.q < 1) return; gxInit();
  const n = GX.q > 1 ? GX.sprk.length : GX.sprk.length >> 1, per = 24, off = dist % per;
  for (let i = 0; i < n; i++) { const s = GX.sprk[i]; let z = s.z - off; if (z < -1.5) z += per; for (let rep = 0; rep < 2; rep++, z += per) { if (z > 40) break;
    const p = proj(s.x * (RH - 0.15), z); const sc = Math.min(p.s * laneW * 0.09, laneW * 0.06), fog = Math.min(1, z / 40) + Math.max(0, (1 - z) * 0.35);
    g.globalAlpha = 0.95 * (1 - fog); g.strokeStyle = SPRK_COL[s.c]; g.lineWidth = Math.max(1, sc * 0.55); g.lineCap = 'round';
    const dx = Math.cos(s.a) * sc * s.l, dy = Math.sin(s.a) * sc * s.l * 0.5; g.beginPath(); g.moveTo(p.x - dx, p.y - dy); g.lineTo(p.x + dx, p.y + dy); g.stroke(); } }
  g.globalAlpha = 1;
}
function gxFore(g) { // partículas delante: polvo brillante y estelas de velocidad
  gxTick(); if (GX.q < 1 || state === 'select') return; gxInit(); g.save(); g.globalCompositeOperation = 'lighter';
  for (const d of GX.dust) { const y = ((d.y * H - t * d.sp) % H + H) % H, x = ((d.x * W + Math.sin(t * 0.8 + d.ph) * 20) % W + W) % W; const tw = 0.5 + 0.5 * Math.sin(t * 3 + d.ph);
    g.globalAlpha = 0.35 * tw; g.fillStyle = '#fff6fb'; g.beginPath(); g.arc(x, y, d.r * (0.7 + tw * 0.6), 0, 7); g.fill(); }
  if (state === 'play' && GX.q > 1) { g.strokeStyle = '#ffffff'; g.lineWidth = 1.5; for (let i = 0; i < 10; i++) { const ph = (t * 1.6 + i * 0.37) % 1, ang = i * 2.39 + 0.3, side = Math.cos(ang) < 0 ? -1 : 1;
      const x0 = W / 2 + side * (W * 0.32 + Math.abs(Math.cos(ang)) * W * 0.15) * (0.3 + ph), y0 = horizonY + (baseY - horizonY) * (0.15 + ph * 0.9) * (0.6 + 0.4 * Math.abs(Math.sin(ang)));
      g.globalAlpha = 0.22 * Math.sin(ph * Math.PI); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + side * 24 * ph, y0 + 30 * ph); g.stroke(); } }
  g.restore();
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
  gxRidges(g, P, px);
  for (const gi of land.giants) {
    const img = gi.alt ? spr.giant2 : spr.giant, h = horizonY * 0.22 * gi.s, w = h * img.width / img.height;
    const x = gi.x * W + px * 0.08, y = horizonY + 2;
    g.save(); g.translate(x, y); g.rotate(Math.sin(t * 0.9 + gi.ph) * 0.03); g.drawImage(img, -w / 2, -h, w, h); g.restore();
  }
  drawSurrealFront(g, P, px);
  gxBubbles(g, px);
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
  const RH = LH + 0.55;
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
  gxRoad(g, P, RH);
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
  for (let lx = -LH + 0.5; lx < LH; lx += 1) {
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
  const li = clamp(Math.round(mochi.x), -LH, LH);
  let best = null; for (const r of rows) if (!r.done && r.z > 0 && r.z < 40 && (!best || r.z < best.z)) best = r;
  if (best) { const c = best.cells[li + LH]; if (c.t === 'w') sel.hintCol = c.c; }
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
  // ---- PREMIUM (solo compra, 0,99 €): borde holográfico, estela propia, baile en reposo y destello al cambiar de color
  { id: 'nebula', name: 'Nébula', premium: true, unlock: Infinity, ears: 'none', acc: 'crown', inner: 'galaxy', shape: { wf: 1.02, hf: 1.02, top: 0.42 },
    trail: [[190, 140, 255], [255, 255, 255], [120, 200, 255]], trailType: 'star',
    desc: 'Lleva una galaxia entera dentro… y un agujero negro que se lo traga todo.', interior: 'una galaxia con agujero negro' },
  { id: 'volcan', name: 'Volcán', premium: true, unlock: Infinity, ears: 'horns3d', acc: null, inner: 'volcano', shape: { wf: 1.06, hf: 0.98, top: 0.4 },
    trail: [[255, 150, 60], [255, 90, 60], [255, 220, 120]], trailType: 'spark',
    desc: 'Tiene un volcán en la tripa. Cuando se emociona, ¡erupción!', interior: 'un volcán en erupción' },
  { id: 'caramelo', name: 'Caramelo', premium: true, unlock: Infinity, ears: 'bear', acc: 'lolli', inner: 'candy', shape: { wf: 1.04, hf: 0.98, top: 0.4 },
    trail: [[255, 130, 190], [120, 220, 255], [255, 220, 90], [150, 240, 160]], trailType: 'confetti',
    desc: 'Una fábrica de golosinas con patas. Huele a fresa.', interior: 'una fábrica de caramelos' },
  { id: 'aurora', name: 'Aurora', premium: true, unlock: Infinity, ears: 'fins3d', acc: null, inner: 'aurora', shape: { wf: 1, hf: 1.04, top: 0.38 },
    trail: [[120, 255, 200], [140, 200, 255], [220, 160, 255]], trailType: 'spark',
    desc: 'Dentro es de noche: auroras boreales y una ballena que vuela.', interior: 'una aurora boreal con ballena' },
  { id: 'prisma', name: 'Prisma', premium: true, unlock: Infinity, ears: 'cat', acc: 'gem', inner: 'crystal', shape: { wf: 0.98, hf: 1.06, top: 0.3 },
    trail: [[255, 120, 120], [255, 220, 100], [120, 240, 160], [120, 180, 255], [210, 140, 255]], trailType: 'star',
    desc: 'Hecho de cristal mágico. Convierte la luz en arcoíris.', interior: 'una geoda de cristales arcoíris' },
];
const isPrem = i => !!(CH[i] && CH[i].premium);
// baile en reposo de los premium: cada ~3,5 s da un giro con saltito
function premIdle(T, i) {
  if (!isPrem(i)) return { sx: 1, lift: 0, rot: 0 };
  const ph = (T + i * 0.7) % 3.5;
  if (ph > 0.9) return { sx: 1, lift: 0, rot: Math.sin(T * 2) * 0.04 };
  const e = ph / 0.9;
  let c = Math.cos(e * Math.PI * 2); if (Math.abs(c) < 0.18) c = c < 0 ? -0.18 : 0.18;
  return { sx: c, lift: Math.sin(e * Math.PI), rot: 0 };
}
const NCH = CH.length;
function fitT2(g, txt, wt, px, maxW, x, y) { let f = px; g.font = `${wt} ${f}px ${I18N.FONT}`; while (f > 8 && g.measureText(txt).width > maxW) { f -= 0.5; g.font = `${wt} ${f}px ${I18N.FONT}`; } g.fillText(txt, x, y); }
const fmtN = n => Math.round(n).toLocaleString(I18N.locale);
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

  // ===== PREMIUM interiors =====
  galaxy(g, w, h, T) {
    const cx = 0, cy = -h * 0.42, R = w * 0.46;
    const bg = g.createRadialGradient(cx, cy, 0, cx, cy, w * 0.75); bg.addColorStop(0, 'rgba(120,80,190,0.35)'); bg.addColorStop(1, 'rgba(70,50,140,0.18)');
    g.fillStyle = bg; g.fillRect(-w, -h, w * 2, h);
    for (let i = 0; i < 14; i++) { const tw = 0.3 + 0.7 * Math.abs(Math.sin(T * 2.3 + i * 1.7)); g.fillStyle = `rgba(255,255,255,${tw})`; g.fillRect((hash(i, 7) - 0.5) * w, -h * hash(i, 8), 1.6, 1.6); }
    // spiral arms of stars being swallowed
    g.save(); g.translate(cx, cy); g.scale(1, 0.55);
    for (let arm = 0; arm < 3; arm++) {
      for (let k = 0; k < 16; k++) {
        const f = ((k / 16) + T * 0.12) % 1, rr2 = R * (1 - f) * 1.05 + R * 0.12, a = arm * 2.094 + f * 5.2 + T * 0.9;
        const col = arm === 0 ? '255,170,240' : arm === 1 ? '150,190,255' : '200,150,255';
        g.fillStyle = `rgba(${col},${0.25 + 0.6 * (1 - f)})`;
        g.beginPath(); g.arc(Math.cos(a) * rr2, Math.sin(a) * rr2, w * (0.012 + 0.022 * (1 - f)), 0, 7); g.fill();
      }
    }
    // accretion disk
    const dk = g.createRadialGradient(0, 0, w * 0.06, 0, 0, w * 0.2); dk.addColorStop(0, 'rgba(255,230,160,0.95)'); dk.addColorStop(0.5, 'rgba(255,120,200,0.6)'); dk.addColorStop(1, 'rgba(160,90,255,0)');
    g.fillStyle = dk; g.beginPath(); g.arc(0, 0, w * 0.2, 0, 7); g.fill();
    g.restore();
    g.fillStyle = '#1a0a2e'; g.beginPath(); g.arc(cx, cy, w * 0.05 * (1 + Math.sin(T * 3) * 0.05), 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,240,200,0.9)'; g.lineWidth = Math.max(1, w * 0.012); g.beginPath(); g.arc(cx, cy, w * 0.056, 0, 7); g.stroke();
  },
  volcano(g, w, h, T) {
    const sky = g.createLinearGradient(0, -h, 0, 0); sky.addColorStop(0, 'rgba(255,170,120,0.45)'); sky.addColorStop(1, 'rgba(255,90,80,0.35)');
    g.fillStyle = sky; g.fillRect(-w, -h, w * 2, h);
    const top = -h * 0.42, er = (T % 2.6) / 2.6, boom = er < 0.35 ? er / 0.35 : 0;
    // smoke puffs
    for (let i = 0; i < 4; i++) { const f = ((T * 0.25 + i / 4) % 1); g.fillStyle = `rgba(120,90,110,${0.45 * (1 - f)})`; g.beginPath(); g.arc(Math.sin(i * 2 + T) * w * 0.08 + f * w * 0.12, top - f * h * 0.45, w * (0.05 + f * 0.1), 0, 7); g.fill(); }
    // mountain
    const mg = g.createLinearGradient(0, top, 0, 0); mg.addColorStop(0, '#8a4a5c'); mg.addColorStop(1, '#5a2d48');
    g.fillStyle = mg; g.beginPath(); g.moveTo(-w * 0.55, 0); g.lineTo(-w * 0.1, top); g.lineTo(w * 0.1, top); g.lineTo(w * 0.55, 0); g.closePath(); g.fill();
    // lava rivers
    g.strokeStyle = '#ff8a3a'; g.lineWidth = w * 0.035; g.lineCap = 'round';
    const flow = 0.4 + 0.6 * Math.min(1, er * 3);
    g.beginPath(); g.moveTo(-w * 0.04, top); g.quadraticCurveTo(-w * 0.12, top * 0.6, -w * 0.2, top * (1 - flow * 0.85)); g.stroke();
    g.beginPath(); g.moveTo(w * 0.05, top); g.quadraticCurveTo(w * 0.15, top * 0.5, w * 0.24, top * (1 - flow * 0.75)); g.stroke();
    const cg = g.createRadialGradient(0, top, 0, 0, top, w * 0.22); cg.addColorStop(0, `rgba(255,230,120,${0.6 + boom * 0.4})`); cg.addColorStop(1, 'rgba(255,120,60,0)');
    g.fillStyle = cg; g.beginPath(); g.arc(0, top, w * 0.22, 0, 7); g.fill();
    // lava bombs
    for (let i = 0; i < 9; i++) {
      const lt = (T * 0.9 + hash(i, 11)) % 1, vx = (hash(i, 12) - 0.5) * w * 0.7, vy = h * (0.55 + hash(i, 13) * 0.35);
      const x = vx * lt, y = top - vy * lt + h * 0.9 * lt * lt;
      if (y > top + h * 0.05) continue;
      g.fillStyle = i % 2 ? '#ffd36b' : '#ff6a3a'; g.beginPath(); g.arc(x, y, w * (0.02 + 0.015 * hash(i, 14)), 0, 7); g.fill();
    }
  },
  candy(g, w, h, T) {
    const bg = g.createLinearGradient(0, -h, 0, 0); bg.addColorStop(0, 'rgba(255,220,240,0.5)'); bg.addColorStop(1, 'rgba(255,180,220,0.45)');
    g.fillStyle = bg; g.fillRect(-w, -h, w * 2, h);
    // pipes with gear
    g.fillStyle = '#c9b6ff'; g.fillRect(-w * 0.3, -h * 0.82, w * 0.12, h * 0.3); g.fillRect(-w * 0.3, -h * 0.55, w * 0.25, h * 0.08);
    g.fillStyle = '#ffd36b'; gearPath(g, w * 0.22, -h * 0.66, w * 0.12, 8, T * 1.5); g.fill();
    g.fillStyle = '#ffb3d1'; g.beginPath(); g.arc(w * 0.22, -h * 0.66, w * 0.04, 0, 7); g.fill();
    // conveyor belt
    const by = -h * 0.28;
    g.fillStyle = '#7a5aa8'; rr(g, -w * 0.5, by, w, h * 0.07, h * 0.035); g.fill();
    g.fillStyle = '#b79be0'; for (let k = 0; k < 7; k++) { const x = -w * 0.5 + ((k / 7 + T * 0.3) % 1) * w; g.fillRect(x, by + h * 0.02, w * 0.04, h * 0.03); }
    const cols = ['#ff7ab0', '#7fd3ff', '#ffd36b', '#8ff0a8', '#c3a8ff'];
    for (let k = 0; k < 5; k++) {
      const x = -w * 0.55 + ((k / 5 + T * 0.3) % 1) * w * 1.1, y = by - w * 0.045, c = cols[k];
      if (k % 2) { g.fillStyle = c; g.beginPath(); g.arc(x, y, w * 0.045, 0, 7); g.fill(); g.beginPath(); g.moveTo(x - w * 0.045, y); g.lineTo(x - w * 0.09, y - w * 0.03); g.lineTo(x - w * 0.09, y + w * 0.03); g.moveTo(x + w * 0.045, y); g.lineTo(x + w * 0.09, y - w * 0.03); g.lineTo(x + w * 0.09, y + w * 0.03); g.fill(); }
      else { g.strokeStyle = '#fff'; g.lineWidth = w * 0.015; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - w * 0.12); g.stroke(); g.fillStyle = c; g.beginPath(); g.arc(x, y - w * 0.14, w * 0.05, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(x, y - w * 0.14, w * 0.025, T * 3, T * 3 + 4); g.stroke(); }
    }
    // candies dropping from pipe
    for (let i = 0; i < 3; i++) { const f = (T * 0.8 + i / 3) % 1; g.fillStyle = cols[i]; g.beginPath(); g.arc(-w * 0.1 + Math.sin(i) * w * 0.02, -h * 0.5 + f * h * 0.2, w * 0.03, 0, 7); g.fill(); }
    // sugar sparkles
    for (let i = 0; i < 6; i++) { const tw = Math.max(0, Math.sin(T * 4 + i * 1.3)); g.fillStyle = `rgba(255,255,255,${tw})`; g.beginPath(); g.arc((hash(i, 21) - 0.5) * w * 0.8, -h * (0.15 + hash(i, 22) * 0.7), w * 0.015, 0, 7); g.fill(); }
  },
  aurora(g, w, h, T) {
    const bg = g.createLinearGradient(0, -h, 0, 0); bg.addColorStop(0, 'rgba(50,70,140,0.4)'); bg.addColorStop(1, 'rgba(80,120,170,0.25)');
    g.fillStyle = bg; g.fillRect(-w, -h, w * 2, h);
    for (let i = 0; i < 12; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + 0.6 * Math.abs(Math.sin(T * 1.7 + i))})`; g.fillRect((hash(i, 31) - 0.5) * w, -h * (0.4 + hash(i, 32) * 0.6), 1.5, 1.5); }
    // aurora ribbons
    const rib = [['120,255,200', -0.72, 0], ['140,190,255', -0.6, 1.7], ['220,150,255', -0.8, 3.1]];
    g.lineCap = 'round';
    rib.forEach(([c, yy, ph]) => {
      for (let L = 0; L < 3; L++) {
        g.strokeStyle = `rgba(${c},${0.18 - L * 0.04})`; g.lineWidth = w * (0.16 - L * 0.04);
        g.beginPath();
        for (let k = 0; k <= 10; k++) { const x = -w * 0.55 + k * w * 0.11, y = h * yy + Math.sin(k * 0.8 + T * 1.4 + ph) * h * 0.06 - L * h * 0.03; k ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
      }
    });
    // flying whale
    const wx = Math.sin(T * 0.5) * w * 0.18, wy = -h * 0.38 + Math.sin(T * 1.1) * h * 0.04, dir = Math.cos(T * 0.5) >= 0 ? 1 : -1;
    g.save(); g.translate(wx, wy); g.scale(dir, 1);
    g.fillStyle = '#6f8fe0'; g.beginPath(); g.ellipse(0, 0, w * 0.2, w * 0.1, 0, 0, 7); g.fill();
    g.fillStyle = '#cfe0ff'; g.beginPath(); g.ellipse(w * 0.02, w * 0.04, w * 0.15, w * 0.05, 0, 0, Math.PI); g.fill();
    const tf = Math.sin(T * 4) * w * 0.04;
    g.fillStyle = '#6f8fe0'; g.beginPath(); g.moveTo(-w * 0.18, 0); g.lineTo(-w * 0.3, -w * 0.07 + tf); g.lineTo(-w * 0.27, w * 0.03 + tf); g.closePath(); g.fill();
    g.fillStyle = '#1f1a3a'; g.beginPath(); g.arc(w * 0.12, -w * 0.02, w * 0.017, 0, 7); g.fill();
    g.restore();
    // spout
    for (let i = 0; i < 3; i++) { const f = (T * 1.2 + i / 3) % 1; g.fillStyle = `rgba(200,240,255,${0.8 * (1 - f)})`; g.beginPath(); g.arc(wx + dir * w * 0.06 + (i - 1) * w * 0.03 * f, wy - w * 0.1 - f * h * 0.15, w * 0.02, 0, 7); g.fill(); }
    // snowy hills
    g.fillStyle = 'rgba(230,245,255,0.9)'; g.beginPath(); g.ellipse(-w * 0.2, -h * 0.02, w * 0.4, h * 0.12, 0, Math.PI, 0); g.ellipse(w * 0.25, 0, w * 0.35, h * 0.09, 0, Math.PI, 0); g.fill();
  },
  crystal(g, w, h, T) {
    const bg = g.createRadialGradient(0, -h * 0.4, 0, 0, -h * 0.4, w * 0.7); bg.addColorStop(0, 'rgba(255,255,255,0.55)'); bg.addColorStop(1, 'rgba(200,180,255,0.35)');
    g.fillStyle = bg; g.fillRect(-w, -h, w * 2, h);
    // rotating rainbow beams
    g.save(); g.translate(0, -h * 0.5); g.rotate(T * 0.6);
    const rc = ['255,110,110', '255,200,90', '120,235,150', '110,180,255', '200,130,255', '255,130,210'];
    for (let k = 0; k < 6; k++) { g.rotate(Math.PI / 3); g.fillStyle = `rgba(${rc[k]},0.28)`; g.beginPath(); g.moveTo(0, 0); g.lineTo(w * 0.7, -w * 0.08); g.lineTo(w * 0.7, w * 0.08); g.closePath(); g.fill(); }
    g.restore();
    // crystal cluster
    const cr = [[-0.22, 0.42, -0.35, '#b9a2f7'], [0.2, 0.46, 0.3, '#7fd3ff'], [0, 0.62, 0, '#ff9cc8'], [-0.08, 0.34, -0.12, '#8ff0d0'], [0.12, 0.36, 0.15, '#ffd36b']];
    cr.forEach(([x, hh, a, c], i) => {
      g.save(); g.translate(w * x, -h * 0.06); g.rotate(a);
      const cw2 = w * 0.08, ch2 = h * hh;
      const gr = g.createLinearGradient(-cw2, 0, cw2, 0); gr.addColorStop(0, c); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(1, c);
      g.fillStyle = gr; g.globalAlpha *= 0.85;
      g.beginPath(); g.moveTo(-cw2, 0); g.lineTo(-cw2, -ch2 * 0.75); g.lineTo(0, -ch2); g.lineTo(cw2, -ch2 * 0.75); g.lineTo(cw2, 0); g.closePath(); g.fill();
      g.globalAlpha /= 0.85;
      const sh = (T * 0.8 + i * 0.3) % 2; if (sh < 1) { g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(-cw2, -ch2 * sh, cw2 * 2, ch2 * 0.06); }
      g.restore();
    });
    for (let i = 0; i < 4; i++) { const tw = Math.max(0, Math.sin(T * 5 + i * 2)); if (tw < 0.3) continue; const x = (hash(i, 41) - 0.5) * w * 0.7, y = -h * (0.3 + hash(i, 42) * 0.5), s2 = w * 0.05 * tw; g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x, y - s2); g.lineTo(x + s2 * 0.25, y); g.lineTo(x, y + s2); g.lineTo(x - s2 * 0.25, y); g.closePath(); g.moveTo(x - s2, y); g.lineTo(x, y + s2 * 0.25); g.lineTo(x + s2, y); g.lineTo(x, y - s2 * 0.25); g.closePath(); g.fill(); }
  },
};


// ================= mini motor 3D (proyección + sombreado plano) para accesorios premium =================
const L3 = (() => { const v = [-0.45, -0.65, 0.62], n = Math.hypot(...v); return v.map(a => a / n); })();
const H3 = (() => { const v = [L3[0], L3[1], L3[2] + 1], n = Math.hypot(...v); return v.map(a => a / n); })();
function rot3(p, o) {
  let [x, y, z] = p;
  if (o.ry) { const c = Math.cos(o.ry), s = Math.sin(o.ry); [x, z] = [x * c + z * s, -x * s + z * c]; }
  if (o.rx) { const c = Math.cos(o.rx), s = Math.sin(o.rx); [y, z] = [y * c - z * s, y * s + z * c]; }
  if (o.rz) { const c = Math.cos(o.rz), s = Math.sin(o.rz); [x, y] = [x * c - y * s, x * s + y * c]; }
  return [x, y, z];
}
// V: vértices [x,y,z] (y hacia abajo, z hacia la cámara). F: {v:[índices], ref:[x,y,z]?, ...}. o: {x,y,s,rx,ry,rz,cull,shade(face,lum,nz,i)}
function mesh3d(g, V, F, o) {
  const P = V.map(p => rot3(p, o));
  const S = P.map(([x, y, z]) => { const f = 1 / (1 - z * 0.12); return [o.x + x * o.s * f, o.y + y * o.s * f]; });
  const cen = o.center ? rot3(o.center, o) : [0, 0, 0];
  const list = [];
  F.forEach((f, i) => {
    const a = P[f.v[0]], b = P[f.v[1]], c = P[f.v[f.v.length > 3 ? 2 : 2]];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const nl = Math.hypot(...n) || 1; n = n.map(q => q / nl);
    let cx = 0, cy = 0, cz = 0; f.v.forEach(k => { cx += P[k][0]; cy += P[k][1]; cz += P[k][2]; }); const m = f.v.length; cx /= m; cy /= m; cz /= m;
    const r = f.ref ? rot3(f.ref, o) : cen;
    if (n[0] * (cx - r[0]) + n[1] * (cy - r[1]) + n[2] * (cz - r[2]) < 0) n = n.map(q => -q);
    if (o.cull !== false && n[2] < -0.02) return;
    const lum = Math.max(0, n[0] * L3[0] + n[1] * L3[1] + n[2] * L3[2]);
    const spec = Math.pow(Math.max(0, n[0] * H3[0] + n[1] * H3[1] + n[2] * H3[2]), 18);
    list.push({ i, f, z: cz, lum, spec, nz: n[2] });
  });
  list.sort((p, q) => p.z - q.z);
  g.lineJoin = 'round';
  for (const it of list) {
    g.beginPath(); it.f.v.forEach((k, j) => j ? g.lineTo(S[k][0], S[k][1]) : g.moveTo(S[k][0], S[k][1])); g.closePath();
    const c = o.shade(it.f, it.lum, it.nz, it.i, it.spec);
    g.fillStyle = c; g.fill(); g.strokeStyle = c; g.lineWidth = 0.6; g.stroke();
  }
  return { P, S };
}
const shadeRGB = (rgb, lum, amb = 0.38, spec = 0) => { const k = amb + (1 - amb) * lum; return `rgb(${Math.min(255, rgb[0] * k + spec * 255) | 0},${Math.min(255, rgb[1] * k + spec * 255) | 0},${Math.min(255, rgb[2] * k + spec * 255) | 0})`; };
// --- mallas
const MESH = {};
(function () {
  // diamante talla brillante: mesa, corona, filetín y pabellón
  const N = 8, V = [], F = [];
  for (let i = 0; i < N; i++) { const a = (i + 0.5) / N * Math.PI * 2; V.push([Math.cos(a) * 0.55, -0.42, Math.sin(a) * 0.55]); } // mesa 0..7
  for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; V.push([Math.cos(a), -0.1, Math.sin(a)]); }               // filetín 8..15
  V.push([0, 1.05, 0]);                                                                                                  // culet 16
  F.push({ v: [0, 1, 2, 3, 4, 5, 6, 7], k: 'table' });
  for (let i = 0; i < N; i++) {
    const t0 = i, t1 = (i + 1) % N, g0 = N + i, g1 = N + (i + 1) % N;
    F.push({ v: [t0, g1, t1], k: 'crown' }); F.push({ v: [t0, g0, g1], k: 'star' });
    F.push({ v: [g0, 16, g1], k: 'pav' });
  }
  MESH.diamond = { V, F, center: [0, 0.2, 0] };
})();
(function () {
  // corona: banda abierta con picos
  const N = 10, V = [], F = [];
  for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; V.push([Math.cos(a), 0, Math.sin(a)]); }
  for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; V.push([Math.cos(a) * 1.04, i % 2 ? -0.55 : -1.05, Math.sin(a) * 1.04]); }
  for (let i = 0; i < N; i++) { const j = (i + 1) % N; F.push({ v: [i, j, N + j, N + i], ref: [0, -0.4, 0] }); }
  MESH.crown = { V, F, center: [0, -0.4, 0] };
})();
(function () {
  // piruleta: disco con grosor
  const N = 16, V = [], F = [], th = 0.22;
  for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; V.push([Math.cos(a), Math.sin(a), th]); }
  for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; V.push([Math.cos(a), Math.sin(a), -th]); }
  F.push({ v: [...Array(N).keys()], k: 'capF' }); F.push({ v: [...Array(N).keys()].map(i => N + i).reverse(), k: 'capB' });
  for (let i = 0; i < N; i++) { const j = (i + 1) % N; F.push({ v: [i, j, N + j, N + i], k: 'side', s: i }); }
  MESH.lolli = { V, F, center: [0, 0, 0] };
})();
(function () {
  // aleta: perfil extruido
  const pr = [[0, -0.35], [0.55, -0.62], [1.05, -0.5], [0.85, 0.05], [0.95, 0.45], [0, 0.35]], th = 0.07, V = [], F = [], n = pr.length;
  pr.forEach(([x, y]) => V.push([x, y, th])); pr.forEach(([x, y]) => V.push([x, y, -th]));
  F.push({ v: [...Array(n).keys()], k: 'face' }); F.push({ v: [...Array(n).keys()].map(i => n + i), k: 'face' });
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; F.push({ v: [i, j, n + j, n + i], k: 'edge', ref: [0.5, 0, 0] }); }
  MESH.fin = { V, F, center: [0.5, 0, 0] };
})();
const hornCache = {};
function hornMesh(sd) {
  if (hornCache[sd]) return hornCache[sd];
  const K = 7, M = 8, V = [], F = [];
  const C = t => [sd * 0.55 * t * t, -1.1 * t, 0.12 * t];
  for (let k = 0; k <= K; k++) {
    const t = k / K, c = C(t), c2 = C(Math.min(1, t + 0.01)), c1 = C(Math.max(0, t - 0.01));
    let T = [c2[0] - c1[0], c2[1] - c1[1], c2[2] - c1[2]]; const tl = Math.hypot(...T); T = T.map(q => q / tl);
    let u = [T[1], -T[0], 0]; const ul = Math.hypot(...u); u = u.map(q => q / ul);
    const v = [T[1] * u[2] - T[2] * u[1], T[2] * u[0] - T[0] * u[2], T[0] * u[1] - T[1] * u[0]];
    const r = 0.3 * (1 - t) + 0.025;
    for (let m = 0; m < M; m++) { const a = m / M * Math.PI * 2; V.push([c[0] + (u[0] * Math.cos(a) + v[0] * Math.sin(a)) * r, c[1] + (u[1] * Math.cos(a) + v[1] * Math.sin(a)) * r, c[2] + (u[2] * Math.cos(a) + v[2] * Math.sin(a)) * r]); }
  }
  for (let k = 0; k < K; k++) for (let m = 0; m < M; m++) { const m2 = (m + 1) % M; F.push({ v: [k * M + m, k * M + m2, (k + 1) * M + m2, (k + 1) * M + m], k, m, ref: C((k + 0.5) / K) }); }
  return hornCache[sd] = { V, F, K };
}
function hsl2rgb(h, s, l) { h = ((h % 360) + 360) % 360 / 360; const f = n => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))); }; return [f(0), f(8), f(4)]; }
function sparkle(g, x, y, s2, a = 1) { g.fillStyle = `rgba(255,255,255,${a})`; g.beginPath(); g.moveTo(x, y - s2); g.lineTo(x + s2 * 0.22, y); g.lineTo(x, y + s2); g.lineTo(x - s2 * 0.22, y); g.closePath(); g.moveTo(x - s2, y); g.lineTo(x, y + s2 * 0.22); g.lineTo(x + s2, y); g.lineTo(x, y - s2 * 0.22); g.closePath(); g.fill(); }

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
  } else if (C.ears === 'horns3d') {
    for (const sd of [-1, 1]) {
      const hm = hornMesh(sd), sway = Math.sin(T * 2.2 + sd) * 0.12;
      const glow = 0.6 + 0.4 * Math.sin(T * 5 + sd * 2);
      mesh3d(g, hm.V, hm.F, { x: sd * w * 0.2, y: -h * 0.86, s: w * 0.36, ry: sd * 0.35 + Math.sin(T * 1.3) * 0.25, rx: 0.15, rz: sway, shade: (f, lum, nz, i, sp) => {
        if (f.k < hm.K - 1 && (f.m + f.k * 3) % 5 === 0) return shadeRGB([255, 110 + 90 * glow, 40], 0.7 + 0.3 * glow, 0.9);
        const t = f.k / hm.K; return shadeRGB([150 + 90 * t, 80 + 120 * t, 90 + 20 * t], lum, 0.45, sp * 0.7);
      } });
    }
  } else if (C.ears === 'fins3d') {
    const base = mix(mix(col, [90, 200, 255], 0.45), [255, 255, 255], 0.15);
    for (const sd of [-1, 1]) {
      const flap = 0.5 + Math.sin(T * 5 + sd * 0.6) * 0.55;
      g.save(); g.translate(sd * w * 0.42, -h * 0.52); g.scale(sd, 1);
      mesh3d(g, MESH.fin.V, MESH.fin.F, { x: 0, y: 0, s: w * 0.3, ry: -flap, rz: -0.35, rx: 0.2, center: MESH.fin.center, cull: false, shade: (f, lum, nz, i, sp) => f.k === 'edge' ? shadeRGB(mix(base, [255, 255, 255], 0.5), lum, 0.45) : shadeRGB(nz > 0 ? mix(base, [140, 255, 220], 0.35) : base, lum, 0.4, sp * 0.5) });
      g.restore();
    }
    g.save(); g.translate(0, -h * 0.94);
    mesh3d(g, MESH.fin.V, MESH.fin.F, { x: 0, y: 0, s: w * 0.24, ry: 1.5 + Math.sin(T * 4) * 0.35, rz: -1.4, cull: false, center: MESH.fin.center, shade: (f, lum, nz, i, sp) => shadeRGB(f.k === 'edge' ? mix(base, [255, 255, 255], 0.5) : base, lum, 0.4, sp * 0.5) });
    g.restore();
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
    g.fillStyle = rgbs(col, C.premium ? 0.36 : 0.24); g.fillRect(-w, -h * 1.1, w * 2, h * 1.2);
    if (C.premium) { const eg = g.createRadialGradient(0, -h * 0.45, w * 0.2, 0, -h * 0.45, w * 0.62); eg.addColorStop(0, rgbs(col, 0)); eg.addColorStop(1, rgbs(light, 0.5)); g.fillStyle = eg; g.fillRect(-w, -h * 1.1, w * 2, h * 1.2); }
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
  if (C.premium && !m.noInner) {
    // luz de borde fina en el color activo (sustituye al borde arcoíris)
    g.save(); body(); g.clip();
    body(); g.lineWidth = Math.max(3, w * 0.11); g.strokeStyle = rgbs(mix(col, [255, 255, 255], 0.35), 0.55); g.stroke();
    g.restore();
    body(); g.lineWidth = Math.max(1.5, w * 0.03); g.strokeStyle = rgbs(dark, 0.9); g.stroke();
    const sg2 = g.createRadialGradient(-w * 0.2, -h * 0.74, 0, -w * 0.2, -h * 0.74, w * 0.28); sg2.addColorStop(0, 'rgba(255,255,255,0.55)'); sg2.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sg2; g.beginPath(); g.arc(-w * 0.2, -h * 0.74, w * 0.28, 0, 7); g.fill();
    const sa = T * 1.8, spx = Math.cos(sa) * w * 0.48, spy = -h * 0.5 + Math.sin(sa) * h * 0.47, ss = w * 0.06 * (0.6 + 0.4 * Math.sin(T * 7));
    g.fillStyle = rgbs(mix(col, [255, 255, 255], 0.55)); g.beginPath(); g.moveTo(spx, spy - ss); g.lineTo(spx + ss * 0.25, spy); g.lineTo(spx, spy + ss); g.lineTo(spx - ss * 0.25, spy); g.closePath(); g.moveTo(spx - ss, spy); g.lineTo(spx, spy + ss * 0.25); g.lineTo(spx + ss, spy); g.lineTo(spx, spy - ss * 0.25); g.closePath(); g.fill();
  }
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
  if (C.acc === 'crown') {
    const bob = Math.sin(T * 3) * h * 0.015, gold = [255, 196, 70];
    const r = mesh3d(g, MESH.crown.V, MESH.crown.F, { x: 0, y: -h * 0.9 + bob, s: w * 0.22, ry: T * 1.1, rx: 0.42, cull: false, center: MESH.crown.center,
      shade: (f, lum, nz, i, sp) => nz < 0 ? shadeRGB([235, 160, 60], lum, 0.55) : shadeRGB(gold, lum, 0.7, sp) });
    const gc = [[255, 90, 150], [90, 200, 255], [120, 230, 150]];
    for (let k = 0; k < 10; k += 2) { const a = k / 10 * Math.PI * 2, p = rot3([Math.cos(a) * 1.06, -0.32, Math.sin(a) * 1.06], { ry: T * 1.1, rx: 0.42 }); if (p[2] < 0) continue;
      const x = r.S[0][0] - r.S[0][0] + p[0] * w * 0.2, y = -h * 0.9 + bob + p[1] * w * 0.2, rr2 = w * 0.032 * (0.6 + 0.4 * p[2]);
      const c = gc[(k / 2) % 3], gg = g.createRadialGradient(x - rr2 * 0.3, y - rr2 * 0.3, 0, x, y, rr2); gg.addColorStop(0, '#fff'); gg.addColorStop(0.35, rgbs(c)); gg.addColorStop(1, rgbs(mix(c, [40, 20, 60], 0.5)));
      g.fillStyle = gg; g.beginPath(); g.arc(x, y, rr2, 0, 7); g.fill(); }
    if (Math.sin(T * 3.3) > 0.7) sparkle(g, w * 0.12, -h * 1.05 + bob, w * 0.05);
  } else if (C.acc === 'lolli') {
    g.save(); g.translate(w * 0.34, -h * 0.88); g.rotate(0.35 + Math.sin(T * 3) * 0.08);
    g.strokeStyle = '#d8d0e8'; g.lineWidth = Math.max(2, w * 0.035); g.lineCap = 'round'; g.beginPath(); g.moveTo(0, h * 0.02); g.lineTo(0, -h * 0.22); g.stroke();
    g.strokeStyle = '#fff'; g.lineWidth = Math.max(1, w * 0.014); g.beginPath(); g.moveTo(-w * 0.006, h * 0.01); g.lineTo(-w * 0.006, -h * 0.2); g.stroke();
    const o = { x: 0, y: -h * 0.31, s: w * 0.14, ry: T * 2.2, rx: 0.15, center: [0, 0, 0] };
    mesh3d(g, MESH.lolli.V, MESH.lolli.F, { ...o, shade: (f, lum, nz, i, sp) => f.k === 'side' ? shadeRGB(f.s % 2 ? [255, 255, 255] : [255, 110, 170], lum, 0.45) : shadeRGB([255, 120, 180], lum, 0.5, sp) });
    for (const zc of [0.22, -0.22]) {
      if (rot3([0, 0, 1], o)[2] * Math.sign(zc) <= 0) continue;
      g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = Math.max(1, w * 0.022); g.beginPath();
      for (let a = 0; a < Math.PI * 5; a += 0.25) { const r2 = 0.92 * a / (Math.PI * 5), q = rot3([Math.cos(a) * r2, Math.sin(a) * r2, zc * 1.02], o), f = 1 / (1 - q[2] * 0.12); const X = q[0] * o.s * f, Y = o.y + q[1] * o.s * f; a ? g.lineTo(X, Y) : g.moveTo(X, Y); }
      g.stroke();
    }
    g.restore();
  } else if (C.acc === 'gem') {
    const gy = -h * 1.24 + Math.sin(T * 2.5) * h * 0.03, ry = T * 1.4;
    // sombra/halo bajo el diamante
    const hg = g.createRadialGradient(0, gy, 0, 0, gy, w * 0.24); hg.addColorStop(0, 'rgba(255,255,255,0.55)'); hg.addColorStop(1, 'rgba(200,180,255,0)');
    g.fillStyle = hg; g.beginPath(); g.arc(0, gy, w * 0.24, 0, 7); g.fill();
    const D = MESH.diamond;
    mesh3d(g, D.V, D.F, { x: 0, y: gy, s: w * 0.21, ry, rx: -0.4, rz: Math.sin(T * 1.7) * 0.08, center: D.center, shade: (f, lum, nz, i, sp) => {
      const hue = (i * 47 + T * 90) % 360;
      if (f.k === 'table') return shadeRGB(mix(hsl2rgb(hue, 0.5, 0.85), [255, 255, 255], 0.5), lum, 0.6, sp);
      const base = f.k === 'pav' ? hsl2rgb(hue + 180, 0.8, 0.75) : hsl2rgb(hue, 0.7, 0.85);
      return shadeRGB(mix(base, [230, 240, 255], 0.12), 0.35 + lum * 0.65, f.k === 'pav' ? 0.62 : 0.7, sp * 0.9 + (Math.sin(T * 6 + i * 1.3) > 0.93 ? 0.6 : 0));
    } });
    for (let k = 0; k < 3; k++) { const tw = Math.sin(T * 4 + k * 2.1); if (tw > 0.4) sparkle(g, Math.cos(k * 2.4 + T) * w * 0.15, gy + Math.sin(k * 1.9) * w * 0.12, w * 0.05 * tw); }
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
let t = 0, runT = 0, dist = 0, speed = 12, score = 0, best = parseInt(store.get('mochi_best', '0'), 10) || 0, bestTurbo = parseInt(store.get('mochi_best_turbo', '0'), 10) || 0;
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
  contUsed = 0; freezeT = 0; invulnT = 0; resetDash();
  runT = 0; dist = 0; speed = 12.5; score = 0; combo = 0; timeScale = 1; tsTarget = 1; shake = 0;
  mochi.lane = 0; mochi.x = 0; mochi.vx = 0; mochi.color = 0; mochi.rgb = PAL[0].rgb.slice(); mochi.dead = false; mochi.wob = 0; mochi.wobV = 0;
  spawnZ = 26; lastPattern = ''; dCur = 0; pending = []; lastPass = LP0(); runUnlocks = []; banners = [];
  tutStep = tutDone ? -1 : 0; tutWaitT = 0;
  setTheme(0, false); menuThemeT = 0;
  if (tutStep === 0) spawnTutorial(); 
  updateHUD(true);
}

// ================= Unlocks & character selection =================
const DEBUG = /[?&]debug=all\b/.test(location.search); // ?debug=all → preview all characters
const MON = window.Monet || { available: false, mode: 'off', ownsChar: () => false, noAds: () => false, onChange() {}, price: () => '' };
const CFGM = window.MOCHI_CONFIG || { maxContinues: 3 };
let unlockPts = parseInt(store.get('mochi_unlpts', '0'), 10) || 0;
let selChar = parseInt(store.get('mochi_char', '0'), 10) || 0;
const maxPts = () => Math.max(best, unlockPts);
const ownedChar = i => i > 0 && MON.ownsChar(CH[i].id);
const isUnlocked = i => DEBUG || CH[i].unlock <= maxPts() || ownedChar(i);
if (!(selChar >= 0 && selChar < NCH) || !isUnlocked(selChar)) selChar = 0;
let runUnlocks = [], banners = [];
// ---- 1.2.4 · Probar personaje 1 partida (anuncio bonificado; gratis con «sin anuncios»), máx. TRIAL_MAX al día
const TRIAL_MAX = 3;
let trialIdx = -1, trialPrev = 0, trialDone = -1, trialBusy = false;
const trialDay = () => new Date().toISOString().slice(0, 10);
function trialsLeft() { const d = store.get('mochi_trial_day', ''); const n = d === trialDay() ? (parseInt(store.get('mochi_trial_n', '0'), 10) || 0) : 0; return Math.max(0, TRIAL_MAX - n); }
function trialUse() { const left = trialsLeft(); store.set('mochi_trial_day', trialDay()); store.set('mochi_trial_n', String(TRIAL_MAX - left + 1)); }
function trialEndRun() { if (trialIdx < 0) return; trialDone = trialIdx; selChar = trialPrev; trialIdx = -1; }
async function startTrial() {
  if (state !== 'select' || trialBusy || isUnlocked(selIdx) || !MON.available || trialsLeft() <= 0) return;
  trialBusy = true; const i = selIdx;
  let ok = MON.noAds();
  if (!ok) { Snd.tick(); ok = await MON.showRewarded(); }
  trialBusy = false;
  if (!ok || state !== 'select') return;
  trialUse(); trialPrev = selChar; trialIdx = i; selChar = i; trialDone = -1;
  startGame();
  showHint(T('trialTag', { n: CH[i].name }), 1.6);
}
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
  g.fillStyle = '#f27bb2'; fitT2(g, T('newChar'), 700, 17, cw - 124, x + 112, y + 32);
  g.fillStyle = '#7a4fb0'; g.font = '700 32px ' + I18N.FONT; g.fillText(CH[b.ch].name, x + 112, y + 64);
  g.fillStyle = '#b08ac8'; fitT2(g, T('pickIn'), 600, 13, cw - 124, x + 112, y + 92);
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
  const pr = !!c.premium, price = premPrice(selIdx);
  document.getElementById('selName').textContent = un || pr ? c.name : '???';
  document.getElementById('selName').classList.toggle('prem', pr);
  document.getElementById('selDesc').textContent = un || pr ? T('desc')[c.id] : T('lockedDesc', { n: fmtN(c.unlock) });
  document.getElementById('selDesc').style.display = (!un && MON.available && !pr) ? 'none' : '';
  if (!un && pr && MON.available) document.getElementById('selDesc').style.display = 'none'; // premium bloqueado: la descripción + botón de compra tapaban la cuadrícula de 15
  const buy = document.getElementById('selBuy');
  buy.style.display = !un && MON.available ? '' : 'none';
  buy.textContent = T('buyFor', { p: price });
  if (pr && !un) buy.style.display = 'none'; // en premium la compra va en el botón principal
  document.getElementById('selShop').style.display = MON.available ? '' : 'none';
  const na = document.getElementById('selNoAds'); na.textContent = MON.noAds() ? T('noAdsOwned') : T('noAdsPrice', { p: MON.price(MOCHI_CONFIG.products.noAds) }); na.classList.toggle('owned', MON.noAds());
  document.getElementById('selPrivacy').style.display = MON.privacyRequired ? '' : 'none';
  document.getElementById('selInner').classList.toggle('prem', pr);
  document.getElementById('selInner').textContent = pr ? (un ? '👑 ' + T('premium') + ' · ' + T('inside', { x: T('inner')[c.id] }) : '👑 ' + T('premiumLocked', { p: price })) : un ? (selIdx ? T('inside', { x: T('inner')[c.id] }) : T('original')) : (MON.available ? T('reachOrBuy', { n: fmtN(c.unlock) }) : T('unlockAt', { n: fmtN(c.unlock) }));
  const n = CH.filter((_, i) => isUnlocked(i)).length;
  document.getElementById('selCount').textContent = `${n}/${NCH}`;
  const pick = document.getElementById('selPick');
  pick.textContent = !un ? (pr && MON.available ? '🔒 ' + T('buyFor', { p: price }) : T('lockedBtn')) : T('playWith', { n: c.name });
  pick.classList.toggle('dis', !un && !(pr && MON.available)); pick.classList.toggle('chosen', un && selIdx === selChar);
  const tb = document.getElementById('selTrial'), tl = document.getElementById('selTrialLeft'), canT = !un && MON.available && !DEBUG;
  const left = trialsLeft();
  tb.style.display = canT && left > 0 ? '' : 'none'; tb.textContent = MON.noAds() ? T('trialFree') : T('trialBtn');
  tl.style.display = canT ? '' : 'none'; tl.textContent = left > 0 ? T('trialLeft', { n: left + '/' + TRIAL_MAX }) : T('trialNone');
  if (canT && !pr) document.getElementById('selDesc').style.display = 'none';
  document.getElementById('selRecord').textContent = T('yourRecord', { n: fmtN(best) }) + (DEBUG ? T('debugMode') : '');
}
function selGo(d) { const n = clamp(selIdx + d, 0, NCH - 1); if (n !== selIdx) { selIdx = n; Snd.sel(n, d); updateSelectUI(); } }
const premPrice = i => MON.price(MON.charProduct(CH[i].id)) || CFGM.refPrices?.char || '0,99 €';
function selPickCur() {
  if (!isUnlocked(selIdx) && isPrem(selIdx) && MON.available) { Snd.tick(); buyPrem(); return; }
  if (!isUnlocked(selIdx)) { Snd.tone(220, 0.15, { vol: 0.08 }); return; }
  selChar = selIdx; store.set('mochi_char', String(selChar)); Snd.color(selChar % 3); updateSelectUI();
  for (let k = 0; k < 14; k++) burst(W / 2, H * 0.34, PAL[k % 3].lrgb, 1, { min: 80, max: 240, g: 200, type: 'star', life: 0.8, rmin: 2, rmax: 5 });
}
// choose the focused character and start a run with it straight away
function selPlay() {
  if (state === 'select' && !isUnlocked(selIdx) && isPrem(selIdx) && MON.available) { Snd.tick(); buyPrem(); return; }
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
  const gw = Math.min(W - 24, 460), cols = 5, rows = Math.ceil(NCH / cols), cw = gw / cols, chh = Math.min(cw * 1.0, H * 0.085);
  const reserve = (MON.available ? 108 : 74) + safeB();
  const gy = Math.min(H * 0.63, H - reserve - ((rows - 1) * (chh + 6) + chh) - chh * 0.15);
  selThumbs = CH.map((c, i) => ({ x: (W - gw) / 2 + cw * (i % cols) + cw / 2, y: gy + Math.floor(i / cols) * (chh + 6) + chh * 0.85, w: cw, h: chh, size: Math.min(cw * 0.5, chh * 0.62) }));
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
    const lockedPrem = !isUnlocked(i) && isPrem(i);
    if (isUnlocked(i) || isPrem(i)) {
      const hop = ad < 0.5 ? Math.abs(Math.sin(t * 4)) * size * 0.08 : 0;
      const pi = ad < 0.5 ? premIdle(t, i) : { sx: 1, lift: 0, rot: 0 };
      if (isPrem(i) && ad < 0.5) { g.save(); g.translate(x, y - size * 0.5); g.rotate(t * 0.5); g.fillStyle = 'rgba(255,214,110,0.22)'; for (let k = 0; k < 10; k++) { g.rotate(Math.PI / 5); g.beginPath(); g.moveTo(0, 0); g.lineTo(size * 1.05, -size * 0.1); g.lineTo(size * 1.05, size * 0.1); g.closePath(); g.fill(); } g.restore(); }
      drawMochi(g, x, y - hop - pi.lift * size * 0.25, size, { ch: i, rgb: PAL[i === selIdx ? (Math.floor(t * 0.6) % 3) : i % 3].rgb, sx: pi.sx * (1 + (ad < 0.5 ? Math.sin(t * 8) * 0.02 : 0)), sy: 1 - (ad < 0.5 ? Math.sin(t * 8) * 0.02 : 0), rot: 0, earL: -0.5 + Math.sin(t * 3 + i) * 0.12, earR: 0.5 - Math.sin(t * 3 + i) * 0.12, earBend: 0.55, foot: 0, arm: Math.sin(t * 4), blink: (t * 0.7 + i) % 3.5 < 0.12 ? 1 : 0, look: 0.2, lookX: 0, happy: i === selChar && ad < 0.5 && (t % 4) < 0.6 });
    } else {
      drawSilhouette(g, x, y, size, i, isPrem(i) ? 'rgba(200,150,60,0.75)' : undefined);
      g.fillStyle = 'rgba(255,255,255,0.95)'; g.font = `700 ${Math.round(size * 0.45)}px ${I18N.FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('?', x, y - size * 0.48);
    }
    if (isPrem(i) && ad < 0.5) premBadge(g, x, y - size * 1.5, size);
    if (lockedPrem && ad < 0.5) priceTag(g, x + size * 0.36, y - size * 0.08, Math.max(size * 0.4, 30), premPrice(i));
    g.globalAlpha = 1;
  }
  // thumbnails grid
  g.textAlign = 'center'; g.textBaseline = 'middle';
  selThumbs.forEach((th, i) => {
    const un = isUnlocked(i), foc = i === selIdx, chosen = i === selChar;
    const pr = isPrem(i);
    rr(g, th.x - th.w / 2 + 3, th.y - th.h * 0.85, th.w - 6, th.h, 14);
    if (pr) { const pg = g.createLinearGradient(th.x - th.w / 2, th.y - th.h, th.x + th.w / 2, th.y); pg.addColorStop(0, foc ? '#fff6d6' : 'rgba(255,240,200,0.85)'); pg.addColorStop(1, foc ? '#f1e4ff' : 'rgba(230,215,255,0.8)'); g.fillStyle = pg; }
    else g.fillStyle = foc ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.6)';
    g.fill();
    if (pr) { const o = (t * 0.4) % 1, hg = g.createLinearGradient(th.x - th.w / 2, th.y - th.h, th.x + th.w / 2, th.y); ['#f2c14e', '#fff0b8', '#e0a83a', '#fff0b8', '#f2c14e'].forEach((c, k) => hg.addColorStop((k / 4 + o) % 1, c)); g.lineWidth = foc ? 3 : 1.5; g.strokeStyle = hg; g.stroke(); }
    else if (foc) { g.lineWidth = 3; g.strokeStyle = '#f08cbc'; g.stroke(); }
    else if (chosen) { g.lineWidth = 2; g.strokeStyle = '#7ee3c4'; g.stroke(); }
    const fy = th.y - th.h * 0.2;
    const img = thumbImg(i, th.size, un || pr);
    g.drawImage(img, th.x - th.size * 1.1, fy - th.size * 1.75, th.size * 2.2, th.size * 2.2);
    g.font = '600 11px ' + I18N.FONT; g.fillStyle = un ? '#8b5cc2' : '#b49ac8';
    if (pr) { g.fillStyle = un ? '#b07a12' : '#a07ac8'; fitT2(g, un ? CH[i].name : MON.price(MON.charProduct(CH[i].id)), 700, 11, th.w - 10, th.x, th.y + th.h * 0.02); drawCrown(g, th.x - th.w / 2 + 13, th.y - th.h * 0.72, 7); if (!un) drawLock(g, th.x + th.w / 2 - 13, th.y - th.h * 0.72, 7); }
    else g.fillText(un ? CH[i].name : fmtN(CH[i].unlock), th.x, th.y + th.h * 0.02);
    if (chosen && un) { g.fillStyle = '#5fc7a6'; g.beginPath(); g.arc(th.x + th.w / 2 - 12, th.y - th.h * 0.72, 7, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(th.x + th.w / 2 - 15, th.y - th.h * 0.72); g.lineTo(th.x + th.w / 2 - 12.5, th.y - th.h * 0.69); g.lineTo(th.x + th.w / 2 - 8.5, th.y - th.h * 0.75); g.stroke(); }
  });
}
function drawLock(g, x, y, r, plate = true) {
  g.save(); g.translate(x, y); g.rotate(Math.sin(t * 2.2 + x * 0.05) * 0.12); // pequeño balanceo
  if (plate) { g.fillStyle = 'rgba(255,255,255,0.92)'; g.beginPath(); g.arc(0, 0, r * 1.4, 0, 7); g.fill(); }
  const bw = r * 1.45, bh = r * 1.08, by = -r * 0.12;
  // sombra
  g.fillStyle = 'rgba(110,50,140,0.28)'; g.beginPath(); g.ellipse(r * 0.08, by + bh + r * 0.12, bw * 0.48, r * 0.16, 0, 0, 7); g.fill();
  // arco metálico con volumen
  const lw = Math.max(1.6, r * 0.32), sg = g.createLinearGradient(-r * 0.5, 0, r * 0.5, 0);
  sg.addColorStop(0, '#9a86b8'); sg.addColorStop(0.35, '#f4eefc'); sg.addColorStop(0.6, '#c8b8de'); sg.addColorStop(1, '#7d6a9c');
  g.lineCap = 'round'; g.strokeStyle = '#6a568a'; g.lineWidth = lw + 1.2; g.beginPath(); g.moveTo(-r * 0.46, by + 1); g.lineTo(-r * 0.46, by - r * 0.22); g.arc(0, by - r * 0.22, r * 0.46, Math.PI, 0); g.lineTo(r * 0.46, by + 1); g.stroke();
  g.strokeStyle = sg; g.lineWidth = lw; g.stroke();
  // cuerpo dorado
  const bg = g.createLinearGradient(0, by, 0, by + bh); bg.addColorStop(0, '#ffe7a0'); bg.addColorStop(0.45, '#f6c552'); bg.addColorStop(1, '#c98a1e');
  rr(g, -bw / 2, by, bw, bh, r * 0.3); g.fillStyle = bg; g.fill();
  g.strokeStyle = '#a8701a'; g.lineWidth = Math.max(1, r * 0.1); g.stroke();
  // canto inferior (grosor) y brillo especular
  g.save(); rr(g, -bw / 2, by, bw, bh, r * 0.3); g.clip();
  g.fillStyle = 'rgba(150,90,10,0.35)'; g.fillRect(-bw / 2, by + bh * 0.78, bw, bh * 0.3);
  const sh = (Math.sin(t * 1.3 + x * 0.03) * 0.5 + 0.5) * bw - bw / 2;
  const hg = g.createLinearGradient(sh - r * 0.5, 0, sh + r * 0.5, 0); hg.addColorStop(0, 'rgba(255,255,255,0)'); hg.addColorStop(0.5, 'rgba(255,255,255,0.55)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = hg; g.save(); g.transform(1, 0, -0.5, 1, 0, 0); g.fillRect(sh - r * 0.5 + by * 0.5, by, r, bh); g.restore();
  g.restore();
  g.fillStyle = 'rgba(255,255,255,0.75)'; rr(g, -bw / 2 + r * 0.16, by + r * 0.1, bw * 0.4, bh * 0.2, bh * 0.1); g.fill();
  // ojo de la cerradura
  g.fillStyle = '#7a4a10'; g.beginPath(); g.arc(0, by + bh * 0.42, r * 0.17, 0, 7); g.fill(); g.beginPath(); g.moveTo(-r * 0.09, by + bh * 0.45); g.lineTo(r * 0.09, by + bh * 0.45); g.lineTo(r * 0.05, by + bh * 0.72); g.lineTo(-r * 0.05, by + bh * 0.72); g.closePath(); g.fill();
  g.restore();
}
function priceTag(g, x, y, s, txt) {
  g.save(); g.font = `700 ${Math.round(s * 0.36)}px ${I18N.FONT}`; const tw = g.measureText(txt).width, w = tw + s * 0.95, h = s * 0.56;
  g.translate(x, y); g.rotate(-0.08);
  g.fillStyle = 'rgba(120,60,150,0.25)'; rr(g, -w / 2 + 2, -h / 2 + 3, w, h, h / 2); g.fill();
  const gr = g.createLinearGradient(0, -h / 2, 0, h / 2); gr.addColorStop(0, '#fff7d8'); gr.addColorStop(1, '#ffd77a'); g.fillStyle = gr; rr(g, -w / 2, -h / 2, w, h, h / 2); g.fill();
  g.strokeStyle = '#d9a43a'; g.lineWidth = 2; g.stroke();
  drawLock(g, -w / 2 + h * 0.5, 0, h * 0.3, false);
  g.fillStyle = '#8a5a10'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, h * 0.22, 1); g.restore();
}
function drawCrown(g, x, y, r) {
  g.save(); g.fillStyle = '#ffc93c'; g.strokeStyle = '#c98a1e'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(x - r, y + r * 0.6); g.lineTo(x - r * 1.1, y - r * 0.5); g.lineTo(x - r * 0.45, y); g.lineTo(x, y - r * 0.8); g.lineTo(x + r * 0.45, y); g.lineTo(x + r * 1.1, y - r * 0.5); g.lineTo(x + r, y + r * 0.6); g.closePath(); g.fill(); g.stroke(); g.restore();
}
function premBadge(g, x, y, size) {
  const txt = T('premium').toLocaleUpperCase(I18N.locale); g.save(); g.font = `700 ${Math.round(Math.max(12, size * 0.13))}px ${I18N.FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const tw = g.measureText(txt).width + 34, hh = Math.max(20, size * 0.2);
  { const rec = document.getElementById('selRecord'); if (rec && state === 'select') { const rb = rec.getBoundingClientRect().bottom; if (rb > 0) y = Math.max(y, rb + hh / 2 + 6); } } // no solapar con «Tu récord»
  const o = (t * 0.35) % 1, hg = g.createLinearGradient(x - tw / 2, 0, x + tw / 2, 0); ['#f2c14e', '#fff0b8', '#e8b445', '#fff0b8', '#f2c14e'].forEach((c, k) => hg.addColorStop((k / 4 + o) % 1, c));
  rr(g, x - tw / 2, y - hh / 2, tw, hh, hh / 2); g.fillStyle = hg; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
  drawCrown(g, x - tw / 2 + 13, y, hh * 0.28);
  g.fillStyle = '#7a4a10'; g.fillText(txt, x + 7, y + 1); g.restore();
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
  if (hit >= 0) { if (hit === selIdx) selPickCur(); else { Snd.sel(hit, hit > selIdx ? 1 : -1); selIdx = hit; updateSelectUI(); } return; }
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
// ================= Acelerón (deslizar hacia arriba) =================
// Envolvente: subida 0,12 s (suave) · meseta 0,50 s · bajada 0,40 s  → 1,02 s en total.
// Recarga: 2,2 s desde que empieza (≈1,2 s tras terminar). Fuerza: +32 % (d=0) … +22 % (d≥1).
// JUSTICIA: el acelerón nunca reduce el tiempo disponible para un muro por debajo del tiempo
// que el generador garantiza para él (reacción + acciones necesarias, r.needT). Cada fotograma se
// calcula un tope kCap con los huecos visibles; si hace falta, el acelerón se recorta o se apaga.
const DASH = { up: 0.12, hold: 0.65, down: 0.4, cd: 2.4, margin: 1.05 };
const dashAmp = d => lerp(0.44, 0.30, d1(d));
let dashT = -1, dashCd = 0, dashK = 1, dashCap = 1, dashUsed = 0, dashReadyFx = 0, dashChain = 0, lungeT = -1, lungeAmp = 1, chainFx = 0, lungePos = 0;
// ===== MODO TURBO: sprint permanente. Los muros se generan YA con la velocidad turbo (vB), así que los
// tiempos de reacción garantizados se mantienen; la dificultad sube antes porque los puntos van ×1,5.
const TURBO = { k: 1.3, mult: 1.5, wind: 0.35 };
let turbo = false;
const vB = () => speed * (turbo ? TURBO.k : 1); // velocidad base real con la que se generan los muros
const sstep = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
function dashEnv(tt) {
  if (tt < 0) return 0;
  if (tt < DASH.up) return sstep(tt / DASH.up);
  if (tt < DASH.up + DASH.hold) return 1;
  if (tt < DASH.up + DASH.hold + DASH.down) return 1 - sstep((tt - DASH.up - DASH.hold) / DASH.down);
  return 0;
}
// Tiempo mínimo que se respeta en cada hueco durante el acelerón:
//  · el que exigiría el juego ~0,35 niveles de dificultad más adelante, ×0,92
//  · nunca por debajo de un suelo absoluto de 0,34 s de reacción + 0,18 s por acción (muy por encima
//    de la reacción humana típica ~0,25 s), ni por encima del que ya garantizaba el hueco sin acelerón.
const DASH_FLOOR = a => 0.34 + 0.18 * a;
function dashNeed(r, d) { const dd = Math.min(d + 0.35, 1.35), a = r.acts != null ? r.acts : 1; return Math.max(DASH_FLOOR(a), 0.92 * Math.min(r.needT != null ? r.needT : 9, reactT(dd) + a * actT(dd))); }
// Para el muro MÁS CERCANO el jugador ya lo ha visto: solo cuentan las acciones que le FALTAN desde
// su carril/color actual (0,18–0,2 s cada una + 0,1 s), no la reacción completa.
function dashNeedFirst(r, d) {
  const acts = transCost([{ l: clamp(Math.round(mochi.lane), -LH, LH), c: mochi.color }], passStates(r.cells));
  return acts === 0 ? 0 : 0.1 + acts * Math.max(0.18, actT(Math.min(d + 0.35, 1.35)));
}
function dashCapNow(d) {
  let cap = 1 + dashAmp(d) + dashExtra(), prevZ = 0, first = true;
  const ahead = rows.filter(r => !r.done && r.z > 0).sort((a, b) => a.z - b.z);
  const range = vB() * (1 + dashAmp(d) + 0.15) * 1.6; // lo que se recorre durante el acelerón + margen
  for (const r of ahead) {
    if (prevZ > range) break; // cuenta cualquier hueco que EMPIECE dentro de lo que recorre el acelerón
    if (r.flip || r.mover) return 1; // muros que cambian/se mueven: sin acelerón mientras estén cerca
    const need = first ? dashNeedFirst(r, d) : dashNeed(r, d), gapZ = r.z - prevZ;
    if (need > 0) cap = Math.min(cap, Math.max(1, gapZ / (vB() * need * 1.03)));
    prevZ = r.z; first = false;
  }
  return cap;
}
// Acelerones ENCADENABLES: sin recarga. Cada deslizamiento dentro de un acelerón activo lo renueva
// (vuelve a la meseta) y suma +5 % de fuerza, hasta +15 % extra (×4). El tope de justicia manda siempre.
// ===== FRENO (deslizar hacia abajo): cancela el acelerón en 0,15 s y frena suave por debajo de la base
// (−20 %; en Turbo baja hasta la velocidad normal): bajada 0,12 s · meseta 0,6 s · vuelta 0,5 s; recarga 0,8 s.
// Ir más lento siempre es justo: no toca la generación de muros.
const BRAKE = { down: 0.12, hold: 0.6, up: 0.5, cd: 0.8, cancel: 0.15 };
let brakeT = -1, brakeCd = 0, brakeK = 1, brakeUsed = 0, dashCancelT = -1, dashCancelFrom = 1;
const brakeLow = () => turbo ? 1 / TURBO.k : 0.8;
function brakeEnv(tt) {
  if (tt < 0) return 0;
  if (tt < BRAKE.down) return sstep(tt / BRAKE.down);
  if (tt < BRAKE.down + BRAKE.hold) return 1;
  return 1 - sstep((tt - BRAKE.down - BRAKE.hold) / BRAKE.up);
}
function tryBrake() {
  if (state !== 'play' || freezeT > 0 || mochi.dead) return false;
  if (brakeT >= 0 || brakeCd > 0) { mochi.wobV += 0.6; return false; }
  if (dashT >= 0) { dashCancelFrom = dashK; dashCancelT = 0; dashT = -1; dashChain = 0; }
  brakeT = 0; brakeUsed++; mochi.wobV += 2.4; Snd.brake();
  const p = proj(mochi.x, 0), sz = laneW * 0.8;
  for (let k = 0; k < 8; k++) particles.push({ x: p.x + (k % 2 ? 1 : -1) * rnd(0.2, 0.45) * sz, y: baseY - rnd(0, 0.08) * sz, vx: (k % 2 ? 1 : -1) * rnd(60, 160), vy: rnd(-40, 10), life: 0, max: rnd(0.35, 0.6), r: rnd(4, 8), col: [235, 205, 175], g: 0, type: 'puff' });
  return true;
}
function updateBrake(gdt) {
  if (brakeCd > 0) brakeCd = Math.max(0, brakeCd - gdt);
  if (brakeT >= 0) { brakeT += gdt; if (brakeT > BRAKE.down + BRAKE.hold + BRAKE.up) { brakeT = -1; brakeCd = BRAKE.cd; mochi.wobV -= 1.5; } }
  brakeK = 1 - (1 - brakeLow()) * brakeEnv(brakeT);
  if (dashCancelT >= 0) { dashCancelT += gdt; if (dashCancelT > BRAKE.cancel) dashCancelT = -1; }
}
const dashExtra = () => Math.min(3, Math.max(0, dashChain - 1)) * 0.05;
function tryDash() {
  if (state !== 'play' || freezeT > 0 || mochi.dead) return false;
  const active = dashT >= 0;
  if (brakeT >= 0) { brakeT = Math.max(brakeT, BRAKE.down + BRAKE.hold); } // acelerar sale del freno
  dashCancelT = -1;
  if (active) { dashChain++; dashT = Math.min(dashT, DASH.up); lungeT = 0; lungeAmp = 0.45; chainFx = 1; }
  else { dashChain = 1; dashT = 0; lungeT = 0; lungeAmp = 1; }
  dashUsed++;
  mochi.wobV -= active ? 1.6 : 2.8; Snd.dash(active ? dashChain : 1);
  const p = proj(mochi.x, 0);
  burst(p.x, baseY - 4, [255, 255, 255], active ? 5 : 8, { min: 60, max: 180, g: 200, rmin: 2, rmax: 4, life: 0.45, vy: 160, type: 'spark' });
  burst(p.x, baseY - laneW * 0.3, PAL[mochi.color].lrgb, 6, { min: 40, max: 140, g: 100, rmin: 2, rmax: 3.5, life: 0.5, vy: 220, type: 'spark' });
  return true;
}
function updateDash(gdt, d) {
  chainFx = Math.max(0, chainFx - gdt * 1.5);
  { const tg = dashT >= 0 && dashT < DASH.up + DASH.hold ? 1 : 0; lungePos += (tg - lungePos) * (1 - Math.exp(-gdt * (tg > lungePos ? 14 : 4))); }
  if (dashT >= 0) {
    dashT += gdt;
    if (dashT > DASH.up + DASH.hold + DASH.down) { dashT = -1; dashChain = 0; mochi.wobV += 3.2; }
    mochi.puffT = (mochi.puffT || 0) - gdt;
    if (mochi.puffT <= 0 && dashEnv(dashT) > 0.3) { mochi.puffT = 0.05; const p = proj(mochi.x, 0), sz = laneW * 0.8;
      particles.push({ x: p.x + rnd(-0.45, 0.45) * sz, y: baseY - dashLunge() * H * 0.08 + rnd(-0.1, 0.25) * sz, vx: rnd(-40, 40), vy: rnd(260, 420), life: 0, max: rnd(0.35, 0.55), r: rnd(6, 12), col: PAL[mochi.color].lrgb, g: 0, type: 'puff' }); }
  }
  dashCap = dashCapNow(d);
  let want = Math.min(1 + (dashAmp(d) + dashExtra()) * dashEnv(dashT), dashCap);
  if (dashCancelT >= 0) want = Math.max(want, Math.min(dashCap, lerp(dashCancelFrom, 1, sstep(dashCancelT / BRAKE.cancel))));
  dashK = want; // el tope manda al instante (frenar siempre es justo); la envolvente ya es suave
}
function resetDash() { brakeT = -1; brakeCd = 0; brakeK = 1; dashCancelT = -1; dashT = -1; dashCd = 0; dashK = 1; dashCap = 1; dashReadyFx = 0; dashChain = 0; lungeT = -1; chainFx = 0; lungePos = 0; }
const dashFx = () => clamp((dashK - 1) / 0.3, 0, 1);
// intensidad VISUAL (viento, embestida, animación): sigue la envolvente aunque el tope limite la velocidad real
const dashVis = () => state === 'play' ? Math.max(dashFx(), dashEnv(dashT) * 0.85, turbo ? TURBO.wind : 0) * (1 - brakeEnv(brakeT)) : 0;
// embestida del muñeco en pantalla: avanza y vuelve con un pequeño rebote
function dashLunge() { const base = turbo && state === 'play' ? 0.25 : 0; return Math.max(base, lungePos + 0.12 * Math.sin(chainFx * Math.PI)); }
// pass states of a row: lane + required colour (-1 = any colour)
function passStates(cells) { const s = []; cells.forEach((c, i) => { if (c.t === 'e') s.push({ l: i - LH, c: -1 }); else if (c.t === 'w') s.push({ l: i - LH, c: c.c }); }); return s; }
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
let lastPass = LP0(), pending = [];
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
function spawnNormal() { if (window.ONL && ONL.active) return ONL.spawn(spawnNormal0); spawnNormal0(); }
function widenRow(q) { const o = rint(2 * LH - 1), cells = []; for (let j = 0; j <= 2 * LH; j++) { if (j >= o && j < o + 3) { const c = { ...q.cells[j - o] }; if (c.from != null) c.from += o - (LH - 1); cells.push(c); } else { const nb = q.cells[j < o ? 0 : 2]; cells.push(nb.t === 'w' ? { ...nb } : B()); } } return { cells, extra: q.extra }; }
function spawnNormal0() {
  while (spawnZ < FAR && !(window.ONL && ONL.active && dist + spawnZ > ONL.goal - 10)) {
    const d = diff();
    if (!pending.length) pending = LH > 1 ? genSequence(d).map(widenRow) : genSequence(d);
    const { cells, extra } = pending.shift();
    const B2 = passStates(cells);
    const actions = transCost(lastPass, B2);
    const gapT = Math.max(minGapT(d), reactT(d) + actions * actT(d));
    const gap = gapT * vB();
    const z = spawnZ + gap;
    const ex = { ...extra };
    if (ex.mover) { ex.moveEnd = Math.min(FAR - 16, gap + vB() * 0.45 + 4); ex.moveStart = Math.min(FAR - 3, ex.moveEnd + 12); }
    if (ex.flip) ex.flipZ = vB() * (reactT(d) + 2 * actT(d) * COLW + 0.2);
    if (Math.random() < 0.7) {
      const opts = []; cells.forEach((cc, i) => { if (cc.t !== 'b') opts.push(i); });
      const lane = opts[rint(opts.length)] - LH;
      const n = 3 + rint(3), sp = Math.min(1.7, gap / (n + 2));
      for (let i = 0; i < n; i++) stars.push({ lane, z: z - gap * 0.5 - (n / 2 - i) * sp, got: false, ph: Math.random() * 6 });
    }
    ex.acts = actions; ex.needT = reactT(d) + actions * actT(d);
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
        for (let i = 0; i < r.cells.length; i++) { const p = proj(i - LH, r.z); burst(p.x, p.y - laneW * 0.5 * p.s, PAL[r.cells[i].c].lrgb, 6, { min: 60, max: 180, g: 0, type: 'spark', life: 0.5, rmin: 2, rmax: 4 }); }
        Snd.tone(1200, 0.12, { type: 'triangle', vol: 0.06 }); Snd.tone(1600, 0.1, { type: 'triangle', vol: 0.05, delay: 0.05 });
      }
    }
  }
}

// Tutorial: scripted rows; game slows down (never kills) until the right action is done.
const TUT = [
  { hint: T('tut1'), need: 'swipe' },
  { hint: T('tut2'), need: 'swipe' },
  { hint: T('tut3'), need: 'tap' },
  { hint: T('tut4'), need: 'any' },
  { hint: T('tutDash') + ' ' + T('tutBrake'), need: 'dash' },
  { hint: T('tut5'), need: 'any' },
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
  else if (TUT[tutStep].need === 'dash') { cells = [E(), E(), E()]; for (let i = 0; i < 5; i++) stars.push({ lane: L, z: z - 8 + i * 1.6, got: false, ph: i }); }
  else { cells = [Wc(0), Wc(1), Wc(2)]; cells[L + 1] = B(); const o = shuffle([0, 1, 2].filter(i => i !== L + 1)); cells[o[0]] = Wc((mochi.color + 1) % NC); cells[o[1]] = Wc((mochi.color + 2) % NC); }
  mkRow(z, cells, { tut: tutStep });
  showHint(s.hint);
}
function cellOK(cell) { return cell.t === 'e' || (cell.t === 'w' && cell.c === mochi.color); }

// ================= Effects =================
const FXGLOW = !/nofx/.test(location.search); // noche 25-10
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
    if (combo >= 2) { elCombo.textContent = T('combo', { n: combo, m: mult() }); elCombo.classList.add('on'); } else elCombo.classList.remove('on');
  }
}
function scorePop() { elScore.classList.add('pop'); clearTimeout(popTO); popTO = setTimeout(() => elScore.classList.remove('pop'), 120); }
function addScore(v) { score += v; scorePop(); }

// ================= Input =================
const keyQ = [];
let ptr = null;
function onAction(a) {
  if (window.__tapGuard && performance.now() < window.__tapGuard) return; // el toque de "Toca para empezar" solo arranca el audio
  Snd.init();
  if (state === 'menu') { if (a === 'tap' || a === 'start') startGame('normal'); return; }
  if (window.ONL && ONL.active && state !== 'play') return;
  if (state === 'over') { if (overT > 0.45 && (a === 'tap' || a === 'start')) AdPace.gate(() => { if (state === 'over') startGame(); }); return; }
  if (state === 'paused') { if (a === 'start') resume(); return; }
  if (state === 'cont') { if (a === 'start') acceptContinue(); return; }
  if (state !== 'play') return;
  if (a === 'down') { tryBrake(); return; }
  if (a === 'up') {
    const tr = rows.find(r => r.tut != null && !r.done && TUT[r.tut] && TUT[r.tut].need === 'dash');
    if (tryDash() && tr) tr.dashed = true;
    return;
  }
  if (a === 'left' || a === 'right') {
    const nl = clamp(mochi.lane + (a === 'left' ? -1 : 1), -LH, LH);
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
  if (isPrem(selChar)) { const C = CH[selChar]; for (let k = 0; k < 14; k++) burst(p.x, baseY - laneW * 0.5, k % 4 === 3 ? [255, 230, 150] : k % 4 === 2 ? [255, 255, 255] : PAL[i].lrgb, 1, { min: 120, max: 300, g: 120, type: k % 2 ? 'star' : C.trailType, life: 0.65, rmin: 2, rmax: 4.5 }); ripples.push({ x: p.x, y: baseY - laneW * 0.4, t: 0.05, col: PAL[i].rgb, big: true }); }
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
  // deslizar hacia ARRIBA = acelerón: ≥ 34 px (o 8 % del ancho), dentro de ±35° de la vertical, rápido (< 350 ms)
  const upY = ptr.y0 - e.clientY, totX = Math.abs(e.clientX - ptr.x0);
  if (!ptr.used && !ptr.up && upY > Math.max(34, Math.min(W, 500) * 0.08) && totX < upY * 0.7 && performance.now() - ptr.t0 < 350) {
    ptr.up = true; ptr.used = true; onAction('up'); return;
  }
  // deslizar hacia ABAJO = freno: mismos umbrales que hacia arriba
  if (!ptr.used && !ptr.up && -upY > Math.max(34, Math.min(W, 500) * 0.08) && totX < -upY * 0.7 && performance.now() - ptr.t0 < 350) {
    ptr.up = true; ptr.used = true; onAction('down'); return;
  }
  if (ptr.up) return;
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
  if ((k === 'Escape' || k === 'p' || k === 'P') && (state === 'play' || state === 'paused')) { state === 'play' ? pause() : resume(); e.preventDefault(); return; }
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') onAction('left');
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') onAction('right');
  else if (k === 'ArrowUp' || k === 'w' || k === 'W') onAction(state === 'play' ? 'up' : 'tap');
  else if (k === 'ArrowDown' || k === 's' || k === 'S') { if (state === 'play') onAction('down'); }
  else if (k === ' ' || k === 'Enter') onAction('tap');
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
function btn(id, fn) { const b = document.getElementById(id); b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); Snd.init(); if (id !== 'mute') Snd.ui(); fn(); }); }
btn('charBtn', () => { if (state === 'menu') { Snd.tick(); openSelect('menu'); } });
btn('turboBtn', () => { if (state === 'menu') startGame('turbo'); });
btn('howBtn', () => { if (state === 'menu') howTo(); });
btn('pauseBtn', () => { if (state === 'play') { Snd.tick(); pause(); } });
btn('skipBtn', () => { if (state === 'play' && tutStep >= 0) { Snd.tick(); skipTutorial(); } });
btn('pResume', () => resume());
btn('pRestart', () => { if (state === 'paused') startGame(); });
btn('pMenu', () => { if (state === 'paused') goMenu(); });
btn('pSound', () => { toggleMute(); updatePauseSound(); });
try { const App = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App; if (App && App.addListener) App.addListener('backButton', () => {
  if (state === 'play') pause(); else if (state === 'paused') resume(); else if (state === 'select') closeSelect(); else if (state === 'over') goMenu(); else if (state === 'menu' && App.exitApp) App.exitApp();
}); } catch (_) {}
btn('charBtn2', () => { if (state === 'over' && overT > 0.3) { Snd.tick(); openSelect('over'); } });
btn('selBack', () => { Snd.tick(); closeSelect(); });
btn('selPrev', () => selGo(-1));
btn('selNext', () => selGo(1));
btn('selPick', () => selPlay());
btn('contGo', () => acceptContinue());
btn('contNo', () => { if (!contBusy) declineContinue(); });
btn('contHome', () => { if (!contBusy && state === 'cont') { Snd.tick(); declineContinue(); goMenu(); } });
btn('overHome', () => { if (state === 'over' && overT > 0.3) { Snd.tick(); AdPace.gate(() => { if (state === 'over') goMenu(); }); } });
btn('contNoAds', async () => { if (contBusy) return; contBusy = true; const ok = await MON.buy(MOCHI_CONFIG.products.noAds, T('prodNoAds')); contBusy = false; if (ok && state === 'cont') { contT = 0; offerContinue(); } });
btn('selBuy', () => buyPrem());
btn('selTrial', () => startTrial());
btn('trialBuy', async () => { if (state !== 'over' || trialDone < 0 || buyPrem.busy) return; const i = trialDone, c = CH[i]; if (isUnlocked(i)) return; buyPrem.busy = true; try { const ok = await MON.buy(MON.charProduct(c.id), T('prodChar', { n: c.name })); if (ok) { selChar = i; store.set('mochi_char', String(i)); document.getElementById('overTrial').style.display = 'none'; const ul = document.getElementById('overUnlock'); ul.className = 'unl new'; ul.textContent = T('unlocked', { n: c.name }); for (let k = 0; k < 18; k++) burst(W / 2, H * 0.3, PAL[k % 3].lrgb, 1, { min: 80, max: 260, g: 200, type: 'star', life: 0.9, rmin: 2, rmax: 5 }); } } finally { buyPrem.busy = false; } });
async function buyPrem() { const c = CH[selIdx]; if (isUnlocked(selIdx) || !MON.available || buyPrem.busy) return; buyPrem.busy = true; try { const ok = await MON.buy(MON.charProduct(c.id), T('prodChar', { n: c.name })); if (ok) { updateSelectUI(); for (let k = 0; k < 18; k++) burst(W / 2, H * 0.34, PAL[k % 3].lrgb, 1, { min: 80, max: 260, g: 200, type: 'star', life: 0.9, rmin: 2, rmax: 5 }); Snd.record(); } } finally { buyPrem.busy = false; } }
btn('selRestore', async () => { await MON.restore(); updateSelectUI(); });
btn('selPrivacy', () => MON.privacyForm());
btn('selNoAds', async () => { if (MON.noAds()) return; const ok = await MON.buy(MOCHI_CONFIG.products.noAds, T('prodNoAds')); if (ok) updateSelectUI(); });
MON.onChange(() => { if (state === 'select') updateSelectUI(); if (trialIdx < 0 && !isUnlocked(selChar)) selChar = 0; });
Snd.create(); Music.start(); try { const p = Snd.ac && Snd.ac.resume(); if (p && p.then) p.then(() => Music.kick()).catch(() => {}); } catch (e) {}
// cualquier primer gesto (toque, tecla) desbloquea el audio; Jugar/Elegir además lo hacen en su propio pointerdown
['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'].forEach(ev => window.addEventListener(ev, () => Snd.init(), { capture: true, passive: true }));
// Invitación sutil si el navegador bloquea el audio: el primer toque en CUALQUIER sitio arranca la música
(() => { const el = document.getElementById('tapStart'); if (!el) return;
  const hide = () => { el.classList.remove('on'); window.__tapGuard = performance.now() + 350; };
  setTimeout(() => { if (Snd.ac && Snd.ac.state !== 'running' && state === 'menu') el.classList.add('on'); }, 350);
  const eat = e => { e.preventDefault(); e.stopPropagation(); Snd.init(); window.__tapGuard = performance.now() + 450; };
  ['pointerdown', 'touchstart', 'mousedown'].forEach(ev => el.addEventListener(ev, eat));
  ['pointerup', 'touchend', 'click'].forEach(ev => el.addEventListener(ev, e => { eat(e); setTimeout(hide, 60); }));
  
})();
const muteBtn = document.getElementById('mute');
const ICON_ON = '<svg viewBox="0 0 24 24"><path d="M4 9h3l5-4v14l-5-4H4z" fill="#c07ad8"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" stroke="#c07ad8" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
const ICON_OFF = '<svg viewBox="0 0 24 24"><path d="M4 9h3l5-4v14l-5-4H4z" fill="#c9a8d8"/><path d="M16 9l5 6M21 9l-5 6" stroke="#e48ab4" stroke-width="2.2" stroke-linecap="round"/></svg>';
function toggleMute() { Snd.init(); Snd.setMuted(!Snd.muted); muteBtn.innerHTML = Snd.muted ? ICON_OFF : ICON_ON; }
muteBtn.innerHTML = Snd.muted ? ICON_OFF : ICON_ON;
muteBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); toggleMute(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (state === 'play') pause(); if (Snd.ac) Snd.ac.suspend(); }
  else if (Snd.ac) { const p = Snd.ac.resume(); if (p && p.then) p.then(() => Music.kick()).catch(() => {}); }
});

function setScreen(id) { ['title', 'over', 'pause', 'select', 'cont'].forEach(s => document.getElementById(s).classList.toggle('on', s === id)); }
function startGame(mode) {
  if (mode != null) turbo = mode === 'turbo';
  if (turbo && !tutDone) { tutDone = true; store.set('mochi_tut', '1'); } // el turbo es para quien ya sabe jugar
  if (trialIdx < 0) trialDone = -1;
  resetRun();
  if (turbo) dCur = 0.2;
  state = 'play'; stateT = 0; setScreen(null); elHud.style.opacity = 1;
  Snd.init(); Music.intro(Snd.fanfare());
  if (tutStep < 0) { showHint(turbo ? T('turboTag') : T('run'), 1.2); spawnNormal(); }
}
// ---- Pausa: botón arriba a la izquierda, al pasar a segundo plano y con «atrás» en Android
function pause() { if (state !== 'play') return; state = 'paused'; setScreen('pause'); hideHint(); updatePauseSound(); }
function resume() { if (state !== 'paused') return; state = 'play'; setScreen(null); freezeT = Math.max(freezeT, 3); Snd.tick(); } // cuenta atrás 3-2-1
function updatePauseSound() { document.getElementById('pSound').textContent = (Snd.muted ? '🔇 ' : '🔊 ') + T('sound'); }
function goMenu() { trialEndRun(); trialDone = -1; resetRun(); hideHint(); state = 'menu'; stateT = 0; setScreen('title'); elHud.style.opacity = 0; updateTitleBest(); }
function skipTutorial() { if (tutStep < 0) return; tutDone = true; store.set('mochi_tut', '1'); store.set('mochi_dashhint', '1'); tutStep = -1; rows = rows.filter(r => r.tut == null); tsTarget = 1; timeScale = 1; hideHint(); spawnZ = Math.max(spawnZ, 12); showHint(T('run'), 1.2); spawnNormal(); }
function howTo() { tutDone = false; store.set('mochi_tut', '0'); startGame('normal'); }
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
  popup(cause === 'wall' ? T('wrongColor') : T('plof'), p.x, baseY - laneW * 1.3, '#fff', 30, 1.2);
}
// ---- "Seguir donde te quedaste" (rewarded ad, or free with "sin anuncios"): 1 oferta por muerte, máx. maxContinues (3) por partida
const CONT_TIME = 7;
const elCont = document.getElementById('cont'), elContBar = document.getElementById('contBar');
// 1.2.4: solo se ofrece si la partida merece la pena (más de 30 s o más de la mitad del récord)
const CONT_MIN_T = 30, CONT_MIN_FRAC = 0.5;
function runWorthIt() { const b = turbo ? bestTurbo : best; return runT > CONT_MIN_T || (b > 0 && score > b * CONT_MIN_FRAC); }
function canContinue() { return !(window.ONL && ONL.active) && (MON.adsAvailable || MON.available) && tutStep < 0 && contUsed < (CFGM.maxContinues ?? 3) && runWorthIt(); }
function offerContinue() {
  state = 'cont'; contT = 0; contBusy = false;
  const left = (CFGM.maxContinues ?? 3) - contUsed, free = MON.noAds();
  document.getElementById('contGo').innerHTML = free ? T('contFree') : T('contAd');
  document.getElementById('contLeft').textContent = left === 1 ? T('lastChance') : T('canContinue', { n: left });
  document.getElementById('contScore').textContent = fmtN(Math.floor(score));
  const ch = document.getElementById('contHelp'), first = store.get('mochi_conthelp', '0') !== '1'; ch.style.display = first ? '' : 'none'; if (first) store.set('mochi_conthelp', '1');
  const up = document.getElementById('contNoAds'); up.style.display = free || !MON.available ? 'none' : '';
  up.textContent = T('noAdsForever', { p: MON.price((window.MOCHI_CONFIG || {}).products ? MOCHI_CONFIG.products.noAds : '') });
  setScreen('cont'); elHud.style.opacity = 0;
}
async function acceptContinue() {
  if (state !== 'cont' || contBusy) return;
  contBusy = true;
  let ok = MON.noAds();
  if (!ok) { Snd.tick(); ok = await MON.showRewarded(); if (ok) AdPace.rewarded(); }
  contBusy = false;
  if (state !== 'cont') return;
  if (ok) revive(); else declineContinue();
}
// ---- Ritmo de intersticiales: solo entre partidas, nunca en la 1.ª sesión, cada N partidas y X minutos, nunca en online
const AdPace = (() => { const C = Object.assign({ everyRuns: 3, minSeconds: 180, afterRewardSeconds: 90, minSession: 2 }, CFGM.interstitial || {});
  const ses = (parseInt(store.get('mochi_sessions', '0'), 10) || 0) + 1; store.set('mochi_sessions', String(ses));
  let runs = 0, lastAd = Date.now(), lastRw = 0, busy = false;
  return { C, session: ses, get runs() { return runs; },
    runEnded() { runs++; }, rewarded() { lastRw = Date.now(); },
    due() { return !!MON.showInterstitial && !MON.noAds() && !(window.ONL && ONL.active) && ses >= C.minSession && runs >= C.everyRuns && Date.now() - lastAd >= C.minSeconds * 1000 && Date.now() - lastRw >= C.afterRewardSeconds * 1000; },
    async gate(cb) { if (busy) return; if (!this.due()) return cb(); busy = true; try { await MON.showInterstitial(); } catch (e) { } runs = 0; lastAd = Date.now(); busy = false; cb(); },
    _force() { runs = 99; lastAd = 0; lastRw = 0; } }; })();
window.__ads = AdPace;
function declineContinue() { if (state !== 'cont') return; gameOver(); }
function revive() {
  contUsed++;
  // fair restart: clear everything close to Mochi, keep the far rows, 3-2-1 countdown then a short shield
  rows = rows.filter(r => r.z > 30); stars = stars.filter(st => st.z > 30);
  pending = []; lastPass = LP0();
  spawnZ = Math.max(spawnZ, 30);
  mochi.dead = false; mochi.deadT = 0; mochi.wob = 0; mochi.wobV = 3; mochi.happyT = 0.6;
  combo = 0; timeScale = 1; tsTarget = 1; shake = 0; flash = 0.35; flashCol = [255, 255, 255];
  freezeT = 3; invulnT = 2.2;
  state = 'play'; setScreen(null); elHud.style.opacity = 1; updateHUD(true); hideHint();
  const p = proj(mochi.x, 0);
  burst(p.x, baseY - laneW * 0.4, PAL[mochi.color].lrgb, 18, { min: 80, max: 260, g: 0, type: 'star', life: 0.8, rmin: 2, rmax: 5 });
  Snd.record();
}
function gameOver() { if (!(window.ONL && ONL.active) && tutStep < 0) AdPace.runEnded();
  if (window.ONL && ONL.active) { state = 'over'; overT = 0; ONL.myEnd(); return; }
  state = 'over'; overT = 0; trialEndRun();
  const s = Math.floor(score), prev = turbo ? bestTurbo : best, isRec = s > prev;
  if (isRec) { if (turbo) { bestTurbo = s; store.set('mochi_best_turbo', String(s)); } else { best = s; store.set('mochi_best', String(best)); } setTimeout(() => Snd.record(), 250); }
  document.getElementById('finalScore').textContent = fmtN(s);
  document.getElementById('finalBest').textContent = fmtN(turbo ? bestTurbo : best);
  document.getElementById('overMode').style.display = turbo ? '' : 'none';
  document.getElementById('newRec').classList.toggle('on', isRec && s > 0);
  document.getElementById('overTitle').textContent = T('over')[rint(4)];
  const ul = document.getElementById('overUnlock');
  if (runUnlocks.length) { ul.className = 'unl new'; ul.textContent = T('unlocked', { n: runUnlocks.map(i => CH[i].name).join(', ') }); }
  else { const nx = CH.find((c, i) => !c.premium && !isUnlocked(i)); ul.className = 'unl'; ul.textContent = nx ? T('nextChar', { n: fmtN(nx.unlock) }) : CH.some((c, i) => c.premium && !isUnlocked(i)) ? T('premHint') : T('allChars'); }
  const ot = document.getElementById('overTrial');
  if (trialDone >= 0 && !isUnlocked(trialDone)) {
    const c = CH[trialDone]; ot.style.display = '';
    document.getElementById('trialEnd').textContent = T('trialEnd', { n: c.name });
    const tb = document.getElementById('trialBuy'); tb.textContent = T('trialBuy', { p: premPrice(trialDone) }); tb.style.display = MON.available ? '' : 'none';
    document.getElementById('trialKeep').textContent = c.premium ? T('trialKeepPrem') : T('trialKeep', { n: fmtN(c.unlock) });
    ul.style.display = 'none';
  } else { ot.style.display = 'none'; ul.style.display = ''; }
  setScreen('over'); elHud.style.opacity = 0;
}
function updateTitleBest() {
  const el = document.getElementById('bestTitle');
  if (best > 0) { el.style.display = ''; el.textContent = T('recordLine', { n: fmtN(best) }); } else el.style.display = 'none';
  document.getElementById('turboSmall').textContent = bestTurbo > 0 ? T('turboRec', { n: fmtN(bestTurbo) }) : T('turboSub');
}

// ================= Update =================
function resolveRow(r) {
  r.done = true;
  const li = clamp(Math.round(mochi.x), -LH, LH);
  const cell = r.cells[li + LH];
  const p = proj(mochi.x, 0);
  const hasWall = r.cells.some(c => c.t === 'w');
  if (cell.t === 'b') { die('block'); return; }
  if (cell.t === 'w') {
    if (cell.c !== mochi.color) { die('wall'); return; }
    cell.passT = t; combo++;
    const m = mult(), db = dashK > 1.08 ? 5 : 0, tm = turbo ? TURBO.mult : 1; addScore(Math.round((10 * m + db) * tm)); // pequeño premio por arriesgar con el acelerón
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
    const words = T('words');
    popup(`+${Math.round((10 * m + db) * tm)}`, p.x + laneW * 0.5, baseY - laneW * 1.0, rgbs(pc.drgb), 26);
    if (words[combo]) popup(words[combo], W / 2, H * 0.36, '#fff', 38, 1.1);
    else if (combo >= 2 && m > 1 && combo % 2 === 0) popup(`x${m}`, p.x - laneW * 0.55, baseY - laneW * 1.1, '#fff', 30);
  } else if (hasWall && r.tut == null && combo > 0) {
    if (combo >= 3) popup(T('comboLost'), W / 2, H * 0.4, 'rgba(255,255,255,0.9)', 22, 0.8);
    combo = 0;
  }
  if (r.tut != null) {
    tutStep++;
    if (tutStep >= TUT.length) {
      tutDone = true; store.set('mochi_tut', '1'); store.set('mochi_dashhint', '1'); tutStep = -1;
      showHint(T('tutDone'), 1.6); setTimeout(() => { if (state === 'play' && tutStep < 0) showHint(T('tutChars'), 2.8); }, 1800);
      spawnZ = r.z + 8; spawnNormal();
    } else setTimeout(() => { if (state === 'play' && tutStep >= 0) spawnTutorial(); }, 250);
  }
  updateHUD();
}

let uiPB = null, uiSK = null;
function update(dt) {
  t += dt; stateT += dt;
  { const pb = state === 'play', sk = state === 'play' && tutStep >= 0;
    if (pb !== uiPB) { uiPB = pb; document.getElementById('pauseBtn').classList.toggle('on', pb); }
    if (sk !== uiSK) { uiSK = sk; document.getElementById('skipBtn').classList.toggle('on', sk); } }
  updateTheme(dt); updateMotes(dt); updateSelector(dt);
  if (hintTimer > 0) { hintTimer -= dt; if (hintTimer <= 0) hideHint(); }
  timeScale = lerp(timeScale, tsTarget, 1 - Math.exp(-dt * (tsTarget < timeScale ? 18 : 6)));
  const gdt = dt * timeScale;
  let worldSpeed = 0;
  if (state === 'menu' || state === 'over' || state === 'select') worldSpeed = state === 'over' ? 0 : state === 'select' ? 3 : 5;
  if (state === 'play' && freezeT > 0) {
    const before = Math.ceil(freezeT); freezeT -= dt; tsTarget = 1;
    if (Math.ceil(freezeT) !== before && freezeT > 0) Snd.tick();
    if (freezeT <= 0) { Snd.start(); showHint(T('goOn'), 0.9); }
  } else if (state === 'play') {
    if (invulnT > 0) invulnT = Math.max(0, invulnT - gdt);
    runT += tutStep >= 0 ? 0 : gdt;
    if (window.ONL && ONL.active) dCur = ONL.dAt(dist); else if (tutStep < 0) dCur = lerp(dCur, diffTarget(score), 1 - Math.exp(-gdt * 0.8));
    const d = diff();
    speed = Math.min(31, 12.5 + 14.5 * Math.min(d, 1) + 8 * Math.max(0, d - 1));
    updateDash(gdt, d); updateBrake(gdt);
    worldSpeed = vB() * dashK * brakeK;
    score += gdt * worldSpeed * 0.25 * (turbo ? TURBO.mult : 1);
    // tutorial slow-motion assist
    tsTarget = 1;
    for (const r of rows) {
      if (r.tut != null && !r.done && r.z < 9) {
        const li = clamp(Math.round(mochi.x), -LH, LH);
        if (TUT[r.tut] && TUT[r.tut].need === 'dash') { if (!r.dashed) tsTarget = r.z < 3.5 ? 0 : r.z < 6 ? 0.12 : 0.4; }
        else if (!cellOK(r.cells[li + LH])) tsTarget = r.z < 3.5 ? 0 : r.z < 6 ? 0.12 : 0.4;
      }
    }
    if (tutStep < 0) spawnNormal();
    if (tutStep < 0 && runT > 2.5 && runT < 3 && store.get('mochi_dashhint', '0') !== '1') { store.set('mochi_dashhint', '1'); showHint(T('tutDash'), 2.6); }
    checkUnlocks();
    if (window.ONL && ONL.active) ONL.tick(gdt);
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
    const li = clamp(Math.round(mochi.x), -LH, LH);
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
  if (state === 'play' && !m.dead && isPrem(selChar)) {
    m.trailT = (m.trailT || 0) - dt;
    if (m.trailT <= 0) {
      m.trailT = 0.045; const C = CH[selChar], tp = proj(m.x, 0), sz = laneW * 0.8;
      particles.push({ x: tp.x + rnd(-0.3, 0.3) * sz, y: baseY - rnd(0.1, 0.7) * sz - m.hop * 0.16 * sz, vx: rnd(-30, 30), vy: rnd(40, 110), life: 0, max: rnd(0.4, 0.7), r: rnd(2, 4), col: Math.random() < 0.7 ? PAL[m.color].lrgb : (Math.random() < 0.5 ? [255, 255, 255] : [255, 225, 140]), g: 60, type: C.trailType === 'confetti' ? 'confetti' : 'spark' });
    }
  }
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
    const p = proj(s.x + Math.sign(s.x) * (LH - 1), s.z), w = laneW * p.s;
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
  const p = proj(s.x + Math.sign(s.x) * (LH - 1), s.z), units = 1.0 * s.sc, w = units * laneW * p.s;
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
    if (TP.stars > 0.05) { const a = TP.stars; const p = proj(s.x + Math.sign(s.x) * (LH - 1), s.z); const w = 1.5 * laneW * p.s, img = spr.houseLit[s.hv], h = w * img.height / img.width; g.globalAlpha = fadeFar(s.z) * a; g.save(); g.translate(p.x, p.y); g.rotate(Math.sin(t * 1.6 + s.x * 3 + s.z * 0.15) * 0.045); if (s.flip) g.scale(-1, 1); g.drawImage(img, -w / 2, -h, w, h); g.restore(); g.globalAlpha = 1; }
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
  if (dashT >= 0 && dashT < 0.06) { const q = Math.sin(dashT / 0.06 * Math.PI); sy *= 1 - 0.15 * q; sx *= 1 + 0.12 * q; }
  else { const de = dashVis(); sy *= 1 + 0.25 * de; sx *= 1 - 0.15 * de; }
  { const be = brakeEnv(brakeT); sy *= 1 - 0.14 * be; sx *= 1 + 0.12 * be; }
  let rot = clamp(m.vx * 0.035, -0.3, 0.3);
  let mouth = m.mouthT > 0 ? 'o' : null;
  if (m.dead) { const e = Math.min(1, m.deadT * 5); sy = lerp(1, 0.5, e) + Math.sin(m.deadT * 25) * 0.05 * Math.exp(-m.deadT * 4); sx = lerp(1, 1.45, e); rot = 0; }
  if (state === 'menu' && !m.dead) { const pi = premIdle(t, selChar); sx *= pi.sx; rot += pi.rot; }
  const dv = dashVis(), bv = brakeEnv(brakeT);
  return { ch: selChar, rgb: m.rgb, sx, sy, rot, earL: m.earL - 0.55 * dv + 0.35 * bv, earR: m.earR + 0.55 * dv - 0.35 * bv, earBend: 0.55 + m.hop * 0.3 + 0.5 * dv, foot: Math.sin(m.hopPh * (1 + dv)), arm: Math.sin(m.hopPh) + dv * 1.2, blink: Math.max(m.blink, 0.45 * dv), look: state === 'menu' ? 0.3 : -1, lookX: clamp(m.vx * 0.3, -1, 1), mouth: bv > 0.3 ? 'o' : mouth, dead: m.dead, happy: m.happyT > 0 };
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
  const fx = lerp(p.x, W / 2, menuBlend), fy = lerp(baseY, H * 0.64, menuBlend) - (state === 'play' ? dashLunge() * H * 0.08 : 0);
  const hopA = (state === 'menu' ? 0.22 : 0.16) * size;
  const lift = m.dead ? 0 : m.hop * hopA;
  // shadow
  const shw = size * 0.5 * (1 - m.hop * 0.25);
  g.fillStyle = 'rgba(150,90,160,0.22)'; g.beginPath(); g.ellipse(fx, fy, shw, shw * 0.22, 0, 0, 7); g.fill();
  if (state === 'play' && !m.dead && dashChain > 1 && dashT >= 0) {
    // contador discreto de acelerones encadenados
    const a = Math.min(1, dashEnv(dashT) * 1.3), sc = 1 + 0.25 * Math.sin(chainFx * Math.PI);
    g.save(); g.globalAlpha = a; g.font = `700 ${Math.round(laneW * 0.2 * sc)}px ${I18N.FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 4; g.strokeStyle = rgbs(PAL[m.color].dprgb, 0.8); g.fillStyle = '#fff';
    const tx = fx + size * 0.62, ty = fy - size * 0.95; g.strokeText('×' + Math.min(dashChain, 99), tx, ty); g.fillText('×' + Math.min(dashChain, 99), tx, ty); g.restore();
  }
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
function drawSpeedLines(g, k) {
  const vx = W / 2, vy = proj(0, FAR).y, D = Math.hypot(W, H), dc = PAL[mochi.color].dprgb, lc = PAL[mochi.color].lrgb;
  // viñeta de velocidad en los bordes, tintada con el color activo
  const vg = g.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, D * 0.62);
  vg.addColorStop(0, rgbs(dc, 0)); vg.addColorStop(1, rgbs(dc, 0.32 * k)); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  g.save(); g.lineCap = 'round';
  for (let i = 0; i < 34; i++) {
    // rachas de viento: salen del punto de fuga y bajan rápido por los lados y alrededor del muñeco
    const side = i % 2 ? 1 : -1, spread = 0.12 + hash(i, 61) * 0.95;
    const a = Math.PI / 2 + side * spread * 1.25, f = (t * (2.2 + 1.4 * hash(i, 62)) + hash(i, 63)) % 1;
    const dx = Math.cos(a), dy = Math.sin(a) * 0.85 + 0.2; if (dy < 0.05) continue;
    const r0 = D * (0.12 + 0.75 * f * f), len = (60 + 150 * hash(i, 64)) * (0.5 + f) * k;
    const x0 = vx + dx * r0, y0 = vy + dy * r0, x1 = vx + dx * (r0 + len), y1 = vy + dy * (r0 + len);
    const al = k * Math.sin(f * Math.PI), lw = (2 + 3 * hash(i, 65)) * (0.6 + f);
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1);
    g.strokeStyle = rgbs(dc, 0.38 * al); g.lineWidth = lw + 3; g.stroke();
    g.strokeStyle = rgbs(mix(lc, [255, 255, 255], 0.6), 0.9 * al); g.lineWidth = lw; g.stroke();
  }
  // remolinos de viento a los lados del muñeco
  const p = proj(mochi.x, 0), cy = baseY - dashLunge() * H * 0.08 - laneW * 0.45;
  for (let s2 = -1; s2 <= 1; s2 += 2) for (let j = 0; j < 2; j++) {
    const ph = (t * 3 + j * 0.5) % 1, x = p.x + s2 * laneW * (0.55 + 0.15 * j), y = cy + ph * laneW * 0.9 - laneW * 0.2;
    g.strokeStyle = rgbs(dc, 0.35 * k * (1 - ph)); g.lineWidth = 5; g.beginPath(); g.arc(x, y, laneW * 0.18, s2 > 0 ? 3.6 : -0.5, s2 > 0 ? 5.6 : 1.5); g.stroke();
    g.strokeStyle = `rgba(255,255,255,${0.9 * k * (1 - ph)})`; g.lineWidth = 2.5; g.stroke();
  }
  g.restore();
}
// dedo animado que enseña el gesto de cada paso del tutorial
function drawFinger(g, x, y, a, press) {
  g.save(); g.globalAlpha = a; g.translate(x, y);
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(0, 0, 22 + press * 10, 0, 7); g.fill();
  g.strokeStyle = 'rgba(200,110,170,0.9)'; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#fff'; g.strokeStyle = '#c96fa8'; g.lineWidth = 2.5;
  rr(g, -9, -2, 18, 46, 9); g.fill(); g.stroke();
  rr(g, -16, 22, 32, 34, 12); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,170,200,0.8)'; g.beginPath(); g.ellipse(0, 4, 5, 6, 0, 0, 7); g.fill();
  g.restore();
}
function drawTutorialHand(g) {
  if (state !== 'play' || tutStep < 0) return;
  const need = TUT[tutStep] && TUT[tutStep].need, r = rows.find(r => r.tut != null && !r.done);
  if (!r || r.z > 18) return;
  const li = clamp(Math.round(mochi.x), -LH, LH), wrong = !cellOK(r.cells[li + LH]);
  const p = proj(mochi.x, 0), cy = baseY - laneW * 0.2, ph = (t * 0.9) % 1, e = sstep(ph / 0.6), fa = ph < 0.75 ? 1 : 1 - (ph - 0.75) / 0.25;
  if (need === 'dash' && !r.dashed) drawFinger(g, p.x + laneW * 0.9, cy - e * laneW * 1.1, fa, 0);
  else if (need === 'tap' && wrong) { const nc = (mochi.color + 1) % NC, bp = sel.pos[nc] || { x: W / 2, y: H - 60 }; drawFinger(g, bp.x + 6, bp.y + 8, 0.95, Math.max(0, Math.sin(t * 6))); }
  else if (need === 'swipe' && wrong) {
    let dir = 0; for (const d of [-1, 1]) for (let q = li + d; q >= -LH && q <= LH; q += d) if (cellOK(r.cells[q + LH]) && !dir) dir = d;
    if (dir) drawFinger(g, p.x + dir * e * laneW * 1.1, cy + laneW * 0.5, fa, 0);
  }
}
// Demostración en bucle (paso del acelerón en tutorial / "Cómo jugar"): dedo ↑ → Mochi acelera con viento; dedo ↓ → frena.
function drawDashDemo(g) {
  if (state !== 'play' || tutStep < 0 || !TUT[tutStep] || TUT[tutStep].need !== 'dash') return;
  const bw = Math.min(W * 0.62, 260), bh = bw * 0.62, bx = (W - bw) / 2, by = Math.max(H * 0.265, 150);
  const P = 3.2, ph = (t % P) / P, up = ph < 0.5, q = up ? ph / 0.5 : (ph - 0.5) / 0.5;
  const sw = sstep(clamp(q / 0.35, 0, 1)), fx = up ? sstep(clamp((q - 0.25) / 0.3, 0, 1)) * (1 - sstep(clamp((q - 0.8) / 0.2, 0, 1))) : sstep(clamp((q - 0.25) / 0.2, 0, 1)) * (1 - sstep(clamp((q - 0.75) / 0.25, 0, 1)));
  g.save(); g.globalAlpha = 0.96;
  g.fillStyle = 'rgba(255,255,255,0.88)'; rr(g, bx, by, bw, bh, 18); g.fill();
  g.strokeStyle = 'rgba(200,120,200,0.45)'; g.lineWidth = 3; g.stroke();
  g.save(); rr(g, bx, by, bw, bh, 18); g.clip();
  // pista en perspectiva
  const hx = bx + bw * 0.36, vy = by + bh * 0.12, ry = by + bh;
  g.fillStyle = '#fbe9f2'; g.beginPath(); g.moveTo(hx - 8, vy); g.lineTo(hx + 8, vy); g.lineTo(hx + bw * 0.3, ry); g.lineTo(hx - bw * 0.3, ry); g.closePath(); g.fill();
  const speed = up ? 1 + 2.4 * fx : 1 - 0.6 * fx; const scroll = (t * 2.2 * speed) % 1;
  g.fillStyle = 'rgba(230,140,190,0.7)';
  for (let i = 0; i < 5; i++) { const z = ((i + scroll) / 5); const y = vy + (ry - vy) * z * z, w = 2 + 5 * z; g.fillRect(hx - w / 2, y, w, 4 + 10 * z); }
  // viento
  if (up && fx > 0.05) { g.strokeStyle = `rgba(255,255,255,${0.9 * fx})`; g.lineCap = 'round';
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + 0.3, k = ((t * 3 + i * 0.37) % 1), r0 = bw * (0.12 + 0.35 * k), x0 = hx + Math.cos(a) * r0, y0 = by + bh * 0.62 + Math.sin(a) * r0 * 0.7;
      g.strokeStyle = i % 2 ? `rgba(255,255,255,${0.95 * fx})` : `rgba(${PAL[mochi.color].rgb.join(',')},${0.6 * fx})`; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + Math.cos(a) * 16 * fx, y0 + Math.sin(a) * 11 * fx); g.stroke(); } }
  // polvo al frenar
  if (!up && fx > 0.05) for (let i = 0; i < 6; i++) { const k = ((t * 2 + i * 0.29) % 1); g.fillStyle = `rgba(230,200,170,${0.6 * fx * (1 - k)})`; g.beginPath(); g.arc(hx + (i % 2 ? 1 : -1) * (14 + 26 * k), by + bh * 0.9 - k * 8, 4 + 5 * k, 0, 7); g.fill(); }
  const ms = bh * 0.42, my = by + bh * 0.9 - (up ? fx * bh * 0.08 : 0);
  drawMochi(g, hx, my, ms, { ch: selChar, rgb: PAL[mochi.color].rgb, sx: up ? 1 - 0.15 * fx : 1 + 0.14 * fx, sy: up ? 1 + 0.25 * fx : 1 - 0.16 * fx, rot: 0, earL: -0.45 - 0.5 * (up ? fx : -0.6 * fx), earR: 0.45 + 0.5 * (up ? fx : -0.6 * fx), earBend: 0.55, foot: Math.sin(t * 10 * speed), arm: Math.sin(t * 10), blink: up ? 0.4 * fx : 0, look: -1, lookX: 0, mouth: !up && fx > 0.3 ? 'o' : undefined, happy: up && fx > 0.5 });
  g.restore();
  // dedo + flecha a la derecha
  const fxX = bx + bw * 0.78, y0 = by + bh * 0.78, y1 = by + bh * 0.24, fy = up ? lerp(y0, y1, sw) : lerp(y1, y0, sw), fa = q < 0.85 ? 1 : 1 - (q - 0.85) / 0.15;
  g.strokeStyle = up ? '#e06aa8' : '#8a7bd8'; g.fillStyle = g.strokeStyle; g.lineWidth = 5; g.lineCap = 'round';
  const ax0 = bx + bw * 0.62, ta = up ? y1 : y0, tb = up ? y0 : y1; g.beginPath(); g.moveTo(ax0, tb); g.lineTo(ax0, ta); g.stroke();
  g.beginPath(); g.moveTo(ax0, ta + (up ? -6 : 6)); g.lineTo(ax0 - 10, ta + (up ? 10 : -10)); g.lineTo(ax0 + 10, ta + (up ? 10 : -10)); g.closePath(); g.fill();
  g.font = `700 ${Math.round(bw * 0.075)}px ${I18N.FONT}`; g.textAlign = 'center'; g.fillStyle = up ? '#c0508e' : '#6c5cc0';
  g.fillText(up ? '⇡ ' + T('demoFast') : '⇣ ' + T('demoBrake'), bx + bw * 0.5, by + bh + bw * 0.1);
  g.restore();
  drawFinger(g, fxX, fy, fa, 0);
}
function drawTutorialCues(g) {
  if (state !== 'play' || tutStep < 0) return;
  drawTutorialHand(g);
  const need = TUT[tutStep] && TUT[tutStep].need;
  const r = rows.find(r => r.tut != null && !r.done);
  if (!r || r.z > 16) return;
  const li = clamp(Math.round(mochi.x), -LH, LH);
  const wrong = !cellOK(r.cells[li + LH]);
  if (!wrong) return;
  const p = proj(mochi.x, 0), cy = baseY - laneW * 0.45;
  const pulse = 0.5 + 0.5 * Math.sin(t * 10);
  // Is a tap enough? (some lane wall matching after tap in current lane)
  const cell = r.cells[li + LH];
  if (cell.t === 'w') {
    g.strokeStyle = `rgba(255,255,255,${0.5 + pulse * 0.5})`; g.lineWidth = 4;
    g.beginPath(); g.arc(p.x, cy, laneW * (0.55 + pulse * 0.12), 0, 7); g.stroke();
    g.fillStyle = '#fff'; g.font = `700 ${Math.round(laneW * 0.2)}px ${I18N.FONT}`; g.textAlign = 'center';
    g.fillText(T('tapCanvas'), p.x, cy - laneW * 0.85);
  }
  if (cell.t === 'b' || need === 'swipe' || cell.t === 'w') {
    // arrows toward ok lanes
    for (const d of [-1, 1]) {
      const nl = li + d; if (nl < -LH || nl > LH) continue;
      let okDir = false; for (let q = nl; q >= -LH && q <= LH; q += d) if (cellOK(r.cells[q + LH])) okDir = true;
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
  const dfx = dashVis();
  if (dfx > 0) { const zc = 1 + 0.045 * dfx; g.translate(W / 2, baseY); g.scale(zc, zc); g.translate(-W / 2, -baseY); }
  drawWorld(g);
  drawMotes(g);
  // collect drawables sorted far->near
  const items = [];
  for (const s of scenery) items.push({ z: s.z, d: () => drawScenery(g, s) });
  for (const r of rows) r.cells.forEach((c, i) => { if (c.t === 'w') items.push({ z: r.z + 0.01, d: () => drawWall(g, i - LH, r.z, c) }); else if (c.t === 'b') items.push({ z: r.z + 0.01, d: () => drawBlock(g, i - LH, r.z, c) }); });
  for (const s of stars) items.push({ z: s.z, d: () => drawStar(g, s) });
  if (state !== 'select') items.push({ z: 0, mochi: true, d: () => drawMochiInWorld(g) });
  if (window.ONL && ONL.active) ONL.items(items, g);
  items.sort((a, b) => b.z - a.z || (a.mochi ? -1 : 1));
  for (const it of items) it.d();
  gxFore(g);
  // ripples
  for (const r of ripples) {
    const e = r.t / 0.5;
    g.strokeStyle = rgbs(r.col, (1 - e) * 0.8); g.lineWidth = (r.big ? 6 : 4) * (1 - e) + 1;
    g.beginPath(); g.ellipse(r.x, r.y, laneW * (0.3 + e * (r.big ? 0.9 : 0.6)), laneW * (0.3 + e * (r.big ? 0.9 : 0.6)) * 0.9, 0, 0, 7); g.stroke();
  }
  // particles
  for (const p of particles) {
    const e = p.life / p.max, a = 1 - e;
    if ((p.type === 'spark' || p.type === 'star') && FXGLOW) { g.globalCompositeOperation = 'lighter'; g.fillStyle = rgbs(p.col, a * 0.22); g.beginPath(); g.arc(p.x, p.y, p.r * 3.2, 0, 7); g.fill(); g.globalCompositeOperation = 'source-over'; } // noche 25-10: halo de luz
    if (p.type === 'spark') { g.fillStyle = rgbs(p.col, a); g.beginPath(); g.arc(p.x, p.y, p.r * (1 - e * 0.5), 0, 7); g.fill(); }
    else if (p.type === 'star') {
      g.fillStyle = rgbs(p.col, a); const r = p.r * 2 * (1 - e * 0.3);
      g.beginPath(); g.moveTo(p.x, p.y - r); g.quadraticCurveTo(p.x, p.y, p.x + r, p.y); g.quadraticCurveTo(p.x, p.y, p.x, p.y + r); g.quadraticCurveTo(p.x, p.y, p.x - r, p.y); g.quadraticCurveTo(p.x, p.y, p.x, p.y - r); g.fill();
    } else if (p.type === 'puff') {
      const rr2 = p.r * (1 + e * 2.2); g.fillStyle = `rgba(255,255,255,${0.55 * a})`; g.beginPath(); g.arc(p.x, p.y, rr2, 0, 7); g.fill();
      g.strokeStyle = rgbs(p.col, 0.7 * a); g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, rr2 * 0.7, e * 6, e * 6 + 3.6); g.stroke();
    } else if (p.type === 'confetti') {
      g.save(); g.translate(p.x, p.y); g.rotate(p.life * 9 + p.r); g.fillStyle = rgbs(p.col, a); g.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r); g.restore();
    } else {
      g.fillStyle = rgbs(p.col, a * 0.9); g.beginPath(); g.ellipse(p.x, p.y, p.r, p.r * (1 + Math.min(1, Math.abs(p.vy) / 600) * 0.6), 0, 0, 7); g.fill();
      g.fillStyle = `rgba(255,255,255,${a * 0.7})`; g.beginPath(); g.arc(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.3, 0, 7); g.fill();
    }
  }
  drawTutorialCues(g); drawDashDemo(g);
  if (dfx > 0.02) drawSpeedLines(g, dfx);
  g.restore();
  // popups
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const p of popups) {
    const e = p.t / p.life;
    const sc = e < 0.15 ? lerp(0.4, 1.15, e / 0.15) : e < 0.25 ? lerp(1.15, 1, (e - 0.15) / 0.1) : 1;
    const y = p.y - e * 40;
    g.globalAlpha = e > 0.7 ? 1 - (e - 0.7) / 0.3 : 1;
    let pfs = Math.round(p.size * sc); g.font = `700 ${pfs}px ${I18N.FONT}`;
    const ptw = g.measureText(p.text).width; if (ptw > W * 0.9) { pfs = Math.floor(pfs * W * 0.9 / ptw); g.font = `700 ${pfs}px ${I18N.FONT}`; }
    const ph = Math.min(ptw, W * 0.9) / 2 + 6, px = Math.max(ph, Math.min(W - ph, p.x));
    g.lineJoin = 'round'; g.lineWidth = Math.max(5, p.size * 0.26); g.strokeStyle = p.col === '#fff' ? 'rgba(220,110,175,0.9)' : p.col; g.strokeText(p.text, px, y);
    g.fillStyle = '#fff'; g.fillText(p.text, px, y);
    g.globalAlpha = 1;
  }
  drawSelector(g);
  if (state === 'select') drawSelect(g);
  drawBanners(g);
  if (state === 'play' && freezeT > 0) {
    const n = Math.ceil(freezeT), f = freezeT - Math.floor(freezeT), sc = 1 + (1 - f) * 0.0 + Math.max(0, f - 0.7) * 1.6;
    g.save(); g.translate(W / 2, H * 0.4); g.scale(sc, sc); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `700 ${Math.round(Math.min(W, H) * 0.3)}px ${I18N.FONT}`; g.lineJoin = 'round';
    g.lineWidth = 16; g.strokeStyle = 'rgba(220,110,175,0.95)'; g.strokeText(String(n), 0, 0); g.fillStyle = '#fff'; g.fillText(String(n), 0, 0);
    g.restore();
    g.font = '700 22px ' + I18N.FONT; g.textAlign = 'center'; g.fillStyle = '#fff'; g.strokeStyle = 'rgba(200,100,170,0.9)'; g.lineWidth = 6;
    g.strokeText(T('ready'), W / 2, H * 0.4 + Math.min(W, H) * 0.2); g.fillText(T('ready'), W / 2, H * 0.4 + Math.min(W, H) * 0.2);
  }
  if (flash > 0) { g.fillStyle = rgbs(flashCol, flash * 0.5); g.fillRect(0, 0, W, H); }
}

// ================= Loop =================
let last = performance.now(), fpsAcc = 0, fpsN = 0, fps = 60;
function frame(now) {
  let dt = (now - last) / 1000; last = now;
  const dtCap = window.ONL && ONL.active ? 0.25 : 0.05; // online: un móvil lento no debe ir más despacio que los demás
  if (dt > dtCap) dt = dtCap; if (dt < 0) dt = 0;
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
window.__mochi = { get selChar() { return selChar; }, get trialIdx() { return trialIdx; }, get trialsLeft() { return trialsLeft(); }, set runT(v) { runT = v; }, get canCont() { return canContinue(); }, openSel(i) { openSelect("menu"); selIdx = i; updateSelectUI(); }, die: c => die(c), get ac() { return Snd.ac; }, get musicNext() { return Music.next; },
  get brakeK() { return brakeK; }, get brakeUsed() { return brakeUsed; }, get brakeT() { return brakeT; }, brake: () => onAction('down'),
  noRows() { rows = []; spawnZ = 1e9; }, get turbo() { return turbo; }, get bestTurbo() { return bestTurbo; }, get dashChain() { return dashChain; }, startGame, pause, resume, goMenu, skipTut: () => skipTutorial(), howTo, gameOver: () => gameOver(), get vB() { return vB(); },
  get dashK() { return dashK; }, get dashCap() { return dashCap; }, get dashCd() { return dashCd; }, get dashT() { return dashT; }, get dashUsed() { return dashUsed; }, dash: () => onAction('up'), act: a => onAction(a),
  fair() { const d = diff(); let prevZ = 0, worst = 9; for (const r of rows.filter(r => !r.done && r.z > 0).sort((a, b) => a.z - b.z)) { if (prevZ > vB() * (1 + dashAmp(d) + 0.15) * 1.6) break; if (r.needT == null) { prevZ = r.z; continue; } const tB = (r.z - prevZ) / (vB() * dashK), t0 = (r.z - prevZ) / vB(); const nf = prevZ === 0 ? dashNeedFirst(r, diff()) : dashNeed(r, diff()); const ratio = nf > 0 ? tB / Math.min(t0, nf) : 9; worst = Math.min(worst, ratio); prevZ = r.z; } return worst; },
  set god(v) { godMode = v; },
  buttons: () => sel.pos.map(p => ({ x: p.x, y: p.y })), get theme() { return themeTo; }, get themeMix() { return themeMix; }, setTheme(i) { setTheme(i, true); }, addScore(v) { score += v; },
  get state() { return state; }, get score() { return score; }, get fps() { return fps; }, get combo() { return combo; },
  get color() { return mochi.color; }, get lane() { return mochi.lane; }, get tutStep() { return tutStep; }, tutGoDash() { rows = rows.filter(r => r.tut == null); tutStep = TUT.findIndex(s => s.need === 'dash'); spawnTutorial(); showHint(TUT[tutStep].hint, 99); },
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
// ===== Mochi · MODO ONLINE v2 (sala pública con matchmaking + bots, sala privada con código, ranking mundial) =====
// Se carga después de game.js y usa su ámbito global (state, mochi, rows, dist, LH, proj, drawMochi...).
(() => {
const NABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', NPRE = 'mochi-online-v1-', NPUB = 'mochi-pub-v2-', PUBSLOTS = 6, NMAX = 6, PUBMAX = 5, GOAL = 1400, PUBWAIT = 5500;
const RANK_URL = 'https://api.restful-api.dev/objects/ff808181a09d98f701a15a4bb90b324f', RANK_NAME = 'mochi-ranking-mundial-v1';
const nCode = () => Array.from({ length: 4 }, () => NABC[(Math.random() * NABC.length) | 0]).join('');
const GCOL = ['#ff6fae', '#5fb8ff', '#ffb43a', '#7ad67a', '#b07cff', '#ff7a5c'];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rnd = (a, b) => a + Math.random() * (b - a);
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t2 = Math.imul(a ^ a >>> 15, 1 | a); t2 = t2 + Math.imul(t2 ^ t2 >>> 7, 61 | t2) ^ t2; return ((t2 ^ t2 >>> 14) >>> 0) / 4294967296; }; }
class Net {
  constructor() { this.peer = null; this.conns = new Map(); this.players = []; this.isHost = false; this.myId = null; this.nextId = 1; this.h = {}; this.alive = true; this.max = NMAX; }
  on(e, f) { this.h[e] = f; } emit(e, ...a) { if (this.h[e]) this.h[e](...a); }
  _peer(id, ms = 10000) { return new Promise((res, rej) => { if (typeof window.Peer !== 'function') return rej(new Error('broker')); let done = false; const opts = { debug: 0, config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] } };
    const p = id ? new window.Peer(id, opts) : new window.Peer(opts); const to = setTimeout(() => { if (!done) { done = true; try { p.destroy(); } catch (e) { } rej(new Error('broker')); } }, ms);
    p.on('open', () => { if (done) return; done = true; clearTimeout(to); res(p); });
    p.on('error', e => { if (!done) { done = true; clearTimeout(to); try { p.destroy(); } catch (x) { } rej(new Error(e.type === 'unavailable-id' ? 'taken' : 'broker')); } else if (e.type === 'peer-unavailable' && this._jr) { const j = this._jr; this._jr = null; j(new Error('nosala')); } }); }); }
  _hostSetup(info) { this.isHost = true; this.myId = 'h'; this.players = [{ id: 'h', ...info }]; if (!this.peer) return; this.peer.on('connection', c => this._hc(c)); this.peer.on('disconnected', () => { try { this.peer.reconnect(); } catch (e) { } }); }
  async create(info) { for (let k = 0; k < 4 && !this.peer; k++) { const code = nCode(); try { this.peer = await this._peer(NPRE + code); this.code = code; } catch (e) { if (e.message !== 'taken') throw e; } } if (!this.peer) throw new Error('broker');
    this._hostSetup(info); return this.code; }
  async hostId(fullId, info) { if (this.peer) { try { this.peer.destroy(); } catch (e) { } this.peer = null; } this.peer = await this._peer(fullId, 2500); this._hostSetup(info); }
  offline(info) { this._hostSetup(info); this.offlineMode = true; }
  realCount() { return this.players.filter(p => !p.bot).length; }
  _hc(c) { c.on('data', d => { if (d.t === 'hello') { if (this.started || this.realCount() >= this.max) { c.send({ t: 'full' }); setTimeout(() => c.close(), 300); return; } const id = 'p' + (this.nextId++); c.pid = id; this.conns.set(id, c);
      // un jugador real ocupa el sitio de un bot si la sala está completa
      if (this.players.length >= this.max) { const bi = this.players.map(p => !!p.bot).lastIndexOf(true); if (bi >= 0) this.players.splice(bi, 1); }
      this.players.push({ id, name: String(d.name || 'Invitado').slice(0, 12), ch: d.ch | 0, uid: String(d.uid || '').slice(0, 24) }); c.send({ t: 'welcome', id }); this.lobby(); this.emit('joined', id); return; } if (!c.pid) return; d.from = c.pid; this.emit('msg', d); });
    c.on('close', () => this._lost(c.pid)); c.on('error', () => this._lost(c.pid)); }
  _lost(id) { if (!id || !this.conns.has(id)) return; this.conns.delete(id); if (!this.started) this.players = this.players.filter(p => p.id !== id); this.lobby(); this.emit('left', id); }
  lobby(extra) { const m = { t: 'lobby', players: this.players, ...(extra || this.lobbyExtra || {}) }; this.send(m); this.emit('lobby', this.players, m); }
  async join(code, info) { code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); if (code.length !== 4) throw new Error('codigo'); this.code = code; return this.joinId(NPRE + code, info); }
  // prueba todos los huecos públicos A LA VEZ; el primero que acepta gana, el resto se cierran
  joinAny(ids, info, ms) { return new Promise((res, rej) => { let done = false, left = ids.length; const cs = [];
    const fail = () => { if (!done && --left <= 0) { done = true; clearTimeout(to); rej(new Error('nosala')); } };
    const to = setTimeout(() => { if (done) return; done = true; cs.forEach(c => { try { c.close(); } catch (e) { } }); rej(new Error('nosala')); }, ms);
    for (const id of ids) { let c; try { c = this.peer.connect(id, { reliable: true, serialization: 'json' }); } catch (e) { fail(); continue; } cs.push(c); let f = false; const ff = () => { if (!f) { f = true; fail(); } };
      c.on('open', () => { if (done) { try { c.close(); } catch (e) { } return; } c.send({ t: 'hello', ...info }); });
      c.on('data', d => { if (c === this.host) { if (d.t === 'lobby') { this.players = d.players; this.emit('lobby', d.players, d); } else this.emit('msg', d); return; }
        if (d.t === 'welcome' && !done) { done = true; clearTimeout(to); this.host = c; this.joined = true; this.myId = d.id; cs.forEach(o => { if (o !== c) try { o.close(); } catch (e) { } }); res(d.id); }
        else if (d.t === 'full') ff(); });
      c.on('close', () => { if (c === this.host) { if (this.alive) this.emit('hostgone'); } else ff(); }); c.on('error', ff); }
    if (!ids.length) fail(); }); }
  async joinId(fullId, info) { if (!this.peer) this.peer = await this._peer(null);
    return new Promise((res, rej) => { this._jr = rej; const c = this.peer.connect(fullId, { reliable: true, serialization: 'json' }); const to = setTimeout(() => { if (this._jr) { this._jr = null; try { c.close(); } catch (e) { } rej(new Error('nosala')); } }, 9000);
      c.on('open', () => c.send({ t: 'hello', ...info })); c.on('data', d => { if (d.t === 'welcome') { clearTimeout(to); this._jr = null; this.host = c; this.joined = true; this.myId = d.id; res(d.id); return; } if (d.t === 'full') { clearTimeout(to); this._jr = null; rej(new Error('llena')); return; }
        if (c !== this.host) return; if (d.t === 'lobby') { this.players = d.players; this.emit('lobby', d.players, d); return; } this.emit('msg', d); }); c.on('close', () => { if (this.alive && c === this.host) this.emit('hostgone'); }); c.on('error', () => { }); }); }
  send(d) { if (this.isHost) { for (const c of this.conns.values()) if (c.open) try { c.send(d); } catch (e) { } } else if (this.host && this.host.open) try { this.host.send(d); } catch (e) { } }
  close() { this.alive = false; setTimeout(() => { try { this.peer && this.peer.destroy(); } catch (e) { } }, 150); }
}
// ---------- bots que parecen jugadores (solo los simula el anfitrión de una sala pública) ----------
const BOTN = ['lucia_08', 'Pablo G', 'xXDaniXx', 'Martiii', 'sofi.r', 'Kenji', 'elcapo77', 'noaaa', 'Hugo', 'Valen☆', 'mateo_pro', 'carla', 'Iker2012', 'Ana M', 'TheRealJuan', 'Nerea', 'zoe', 'Leo_xd', 'minnie', 'Alexx', 'Rubén', 'Gabi_09', 'Mochilover', 'Yuki', 'pepe', 'aitana.x', 'Marcos', 'Irene', 'NicoGamer', 'Sara_33', 'tomás', 'Bruno', 'lolaa', 'Dario', 'kawaii_ari', 'Emma', 'joel10', 'Paula', 'Óscar', 'Mia', 'Thiago', 'nahia', 'Unai', 'Chloe', 'Max', 'luuna'];
function makeBot(taken, i) { let n; let k = 0; do { n = BOTN[(Math.random() * BOTN.length) | 0]; } while (taken.includes(n) && k++ < 50);
  if (Math.random() < 0.25) n += (Math.random() * 99 | 0);
  const free = CH.map((c, j) => j).filter(j => { try { return !isPrem(j); } catch (e) { return j < 3; } }), all = CH.map((c, j) => j);
  const skill = Math.min(0.97, Math.max(0.15, rnd(0.25, 0.85) + rnd(-0.15, 0.15))); // nivel medio de internet: unos mejores, otros peores
  const pool = Math.random() < 0.2 || !free.length ? all : free, ch = pool[(Math.random() * pool.length) | 0] | 0;
  return { id: 'b' + i + '_' + ((Math.random() * 1e4) | 0), name: n.slice(0, 12), ch, bot: 1, skill }; }
function botPlan(b) { // decide si termina y, si no, dónde falla (los fallos se concentran donde sube la dificultad)
  const pFin = 0.08 + 0.55 * Math.pow(b.skill, 1.6);
  b.dieAt = Math.random() < pFin ? Infinity : GOAL * Math.min(0.97, Math.pow(Math.random(), 1 / (0.7 + 2.2 * b.skill)) * 0.95 + 0.04);
  b.tl = 0; b.nextMove = rnd(0.4, 1.6); b.react = rnd(0.25, 0.9) * (1.3 - b.skill); b.cT = rnd(0.8, 2.5); }
// ---------- UI ----------
const css = document.createElement('style'); css.textContent = `
#onlineBtn{font-size:17px;padding:9px 20px;color:#fff;background:linear-gradient(180deg,#7fd0ff,#5b8cff);box-shadow:0 4px 0 #3b62c8;margin-top:8px}
#onl,#onres,#onrk{position:fixed;inset:0;z-index:60;display:none;align-items:center;justify-content:center;background:rgba(80,40,110,.35);font-family:inherit}
#onrk{z-index:61}#onl.on,#onres.on,#onrk.on{display:flex}
.onc{pointer-events:auto;width:min(92vw,380px);max-height:92vh;overflow:auto;background:rgba(255,255,255,.95);border-radius:26px;padding:18px 18px 16px;color:#8b5cc2;text-align:center;box-shadow:0 8px 0 rgba(180,120,200,.45);font-weight:700;box-sizing:border-box}
.onc h2{margin:0 0 8px;font-size:28px;color:#ff6fae}.onc input{font-family:inherit;font-weight:700;font-size:18px;color:#8b5cc2;border:3px solid #e9cdf3;border-radius:16px;padding:8px 12px;width:100%;text-align:center;margin:4px 0;outline:none;box-sizing:border-box}
.onc .pbtn{margin:6px auto;justify-content:center;font-size:18px;padding:9px 22px}.onc .row{display:flex;gap:8px;align-items:center}.onc .row input{flex:1}
.onc .go{background:linear-gradient(180deg,#ff8cc0,#ff5fa2);color:#fff;box-shadow:0 4px 0 #c43c7d}.onc .blue{background:linear-gradient(180deg,#7fd0ff,#5b8cff);color:#fff;box-shadow:0 4px 0 #3b62c8}
.onc .big{display:flex;flex-direction:column;width:100%;font-size:20px;padding:10px 14px}.onc .big small{font-size:12px;font-weight:600;opacity:.9;white-space:normal}
#onCode{font-size:44px;letter-spacing:8px;color:#ff6fae;margin:2px 0}#onMsg{min-height:20px;font-size:14px;color:#c0679a}
.onp{display:flex;align-items:center;gap:8px;padding:5px 10px;margin:4px 0;border-radius:14px;background:#f8eefc;font-size:16px;text-align:left}.onp i{width:14px;height:14px;border-radius:50%;display:inline-block;flex:none}.onp b{margin-left:auto;font-size:14px;white-space:nowrap}
.onp.me{background:#ffe3f0;box-shadow:inset 0 0 0 2px #ff9cc8}.onp.slot{opacity:.45;font-style:italic}
.rktabs{display:flex;gap:6px;justify-content:center;margin:4px 0 6px}.rktabs button{font-family:inherit;font-weight:700;font-size:15px;border:0;border-radius:14px;padding:6px 12px;background:#f3e3fa;color:#8b5cc2}.rktabs button.sel{background:#ff6fae;color:#fff}
#rkList{max-height:46vh;overflow:auto}#rkSrc{font-size:12px;color:#b07cc8;margin:4px 0}
#onHud{position:fixed;right:8px;top:calc(env(safe-area-inset-top) + 60px);z-index:30;pointer-events:none;font-weight:700;font-size:13px;color:#fff;text-shadow:0 1px 3px rgba(120,50,130,.9);display:none;min-width:120px}
#onHud.on{display:block}#onHud .r{display:flex;gap:5px;align-items:center;margin:2px 0;justify-content:flex-end}#onHud i{width:10px;height:10px;border-radius:50%;display:inline-block}
#onBar{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top) + 52px);width:min(60vw,260px);height:10px;border-radius:6px;background:rgba(255,255,255,.45);z-index:30;display:none;overflow:visible}
#onBar.on{display:block}#onBar u{position:absolute;top:-3px;width:16px;height:16px;border-radius:50%;margin-left:-8px;border:2px solid #fff;box-sizing:border-box}#onBar s{position:absolute;right:-6px;top:-8px;font-size:18px;text-decoration:none}`;
document.head.appendChild(css);
const div = document.createElement('div'); div.innerHTML = `
<div id="onl"><div class="onc"><h2>🌐 Online</h2>
<div id="on0"><input id="onName" maxlength="12" placeholder="Tu nombre de jugador"><button class="pbtn go big" id="onPub">🌍 Sala pública<small>Sin código · te emparejamos al momento</small></button><button class="pbtn blue big" id="onPriv">🔒 Sala privada<small>Con código para jugar con amigos (desde 2)</small></button><button class="pbtn" id="onRk">🏆 Ranking mundial</button></div>
<div id="onA" style="display:none"><div style="font-size:15px;margin-bottom:4px">🔒 Sala privada</div><button class="pbtn go" id="onCreate">✨ Crear sala</button><div class="row"><input id="onJoinCode" maxlength="4" placeholder="CÓDIGO" style="text-transform:uppercase"><button class="pbtn" id="onJoin">Unirse</button></div></div>
<div id="onB" style="display:none"><div id="onCodeL" style="font-size:13px">Código de la sala</div><div id="onCode">----</div><div id="onList"></div><button class="pbtn go" id="onStart">▶ ¡Empezar carrera!</button><div id="onWait" style="font-size:14px">Esperando a que el anfitrión empiece…</div></div>
<div id="onMsg"></div><button class="pbtn" id="onBack">← Volver</button></div></div>
<div id="onres"><div class="onc"><h2 id="onResT">Clasificación</h2><div id="onResL"></div><div id="onResP" style="font-size:15px;color:#ff6fae"></div><div id="onResW" style="font-size:14px"></div><button class="pbtn go" id="onAgain" style="display:none">↻ Otra carrera</button><button class="pbtn" id="onRk2">🏆 Ranking mundial</button><button class="pbtn" id="onMenu">Menú</button></div></div>
<div id="onrk"><div class="onc"><h2>🏆 Ranking mundial</h2><div class="rktabs"><button id="rkW" class="sel">🥇 Victorias</button><button id="rkP">⭐ Puntos</button></div><div id="rkSrc"></div><div id="rkList"></div><div id="rkMe" style="font-size:14px;margin-top:6px"></div><button class="pbtn" id="rkClose">← Volver</button></div></div>
<div id="onHud"></div><div id="onBar"><s>🏁</s></div>`;
document.body.appendChild(div);
const $ = id => document.getElementById(id);
const mb = document.createElement('button'); mb.className = 'pbtn'; mb.id = 'onlineBtn'; mb.textContent = '🌐 Online'; $('modeRow').after(mb);
const stop = f => e => { e.preventDefault(); e.stopPropagation(); try { Snd.init(); Snd.ui(); } catch (x) { } f(e); };
['onl', 'onres', 'onrk'].forEach(id => ['pointerdown', 'touchstart', 'keydown'].forEach(ev => $(id).addEventListener(ev, e => e.stopPropagation())));
const tap = (id, f) => $(id).addEventListener('click', stop(f));
mb.addEventListener('pointerdown', stop(() => { if (state === 'menu') openLobby(); }));

const O = window.ONL = { active: false, goal: GOAL, seed: 1, peers: {}, done: false, res: null, mode: '' };
let net = null, myName = '', sendT = 0, startAt = 0, finT = 0, pubTimer = null, botTimer = null, botQueue = [], step = 0;
const myId = () => net ? net.myId : 'h';
const uid = (() => { let u = store.get('mochi_uid', ''); if (!u) { u = 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); store.set('mochi_uid', u); } return u; })();
function msg(t) { $('onMsg').textContent = t || ''; }
function show(s) { step = s; $('on0').style.display = s === 0 ? '' : 'none'; $('onA').style.display = s === 1 ? '' : 'none'; $('onB').style.display = s === 2 ? '' : 'none'; }
function openLobby() { state = 'onlobby'; setScreen(null); $('onl').classList.add('on'); show(0); msg(''); $('onName').value = store.get('mochi_onname', '') || ''; }
function closeAll() { $('onl').classList.remove('on'); $('onres').classList.remove('on'); $('onHud').classList.remove('on'); $('onBar').classList.remove('on'); }
function clearTimers() { clearInterval(pubTimer); pubTimer = null; clearInterval(botTimer); botTimer = null; botQueue.forEach(clearTimeout); botQueue = []; }
function disconnect() { clearTimers(); if (net) net.close(); net = null; }
function leave() { disconnect(); O.active = false; closeAll(); LH = 1; resize(); goMenu(); }
function info() { myName = ($('onName').value || '').trim().slice(0, 12) || ('Mochi' + ((Math.random() * 900 + 100) | 0)); $('onName').value = myName; store.set('mochi_onname', myName); return { name: myName, ch: selChar, uid }; }
function showList(pl, m) { const max = O.mode === 'pub' ? PUBMAX : 0; let h = pl.map((p, i) => `<div class="onp${p.id === myId() ? ' me' : ''}"><i style="background:${GCOL[i % 6]}"></i>${esc(p.name)}${p.id === myId() ? ' (tú)' : ''}<b>${p.id === 'h' && O.mode !== 'pub' ? '👑' : ''}</b></div>`).join('');
  for (let i = pl.length; i < max; i++) h += `<div class="onp slot"><i style="background:#ddd"></i>Buscando jugador…</div>`; $('onList').innerHTML = h;
  if (O.mode === 'pub' && m && m.eta != null) $('onWait').textContent = m.eta > 0 ? `La carrera empieza en ${Math.ceil(m.eta / 1000)} s…` : '¡Empezamos!'; }
function wire() {
  net.on('lobby', (pl, m) => { showList(pl, m); const pub = O.mode === 'pub'; $('onStart').style.display = net.isHost && !pub ? '' : 'none'; $('onWait').style.display = net.isHost && !pub ? 'none' : ''; if (!pub) $('onWait').textContent = 'Esperando a que el anfitrión empiece…'; });
  net.on('msg', d => onMsg(d)); net.on('left', id => { if (O.peers[id]) { O.peers[id].dead = 1; O.peers[id].gone = 1; checkEnd(); } });
  net.on('hostgone', () => { toastLocal('El anfitrión se ha ido'); if (!O.active) { if (O.mode === 'pub' && step === 2) { msg('La sala se ha cerrado, buscando otra…'); disconnect(); setTimeout(publicMatch, 400); } else leave(); } else { O.hostGone = 1; for (const k in O.peers) if (k !== myId()) O.peers[k].dead = 1; if (O.done) showRes(); } });
}
function toastLocal(t) { try { showHint(t, 2); } catch (e) { } }
tap('onPub', () => publicMatch());
tap('onPriv', () => { info(); O.mode = 'priv'; show(1); msg(''); });
tap('onRk', () => openRank()); tap('onRk2', () => openRank()); tap('rkClose', () => $('onrk').classList.remove('on'));
tap('onCreate', async () => { msg('Creando sala…'); try { O.mode = 'priv'; net = new Net(); wire(); const code = await net.create(info()); $('onCode').textContent = code; $('onCode').style.display = ''; $('onCodeL').style.display = ''; show(2); msg('Comparte el código. Con 2 jugadores ya podéis empezar.'); net.lobby(); } catch (e) { msg('No se pudo crear la sala. Revisa tu conexión.'); net = null; } });
tap('onJoin', async () => { msg('Conectando…'); try { O.mode = 'priv'; net = new Net(); wire(); await net.join($('onJoinCode').value, info()); $('onCode').textContent = net.code; $('onCode').style.display = ''; $('onCodeL').style.display = ''; show(2); msg(''); } catch (e) { msg(e.message === 'llena' ? 'La sala está llena o ya ha empezado.' : e.message === 'codigo' ? 'Escribe un código de 4 letras.' : 'No se encontró esa sala.'); disconnect(); } });
tap('onStart', () => { if (!net || !net.isHost) return; if (net.players.length < 2) { msg('Necesitas al menos 2 jugadores.'); return; } startRace(); });
tap('onBack', () => { if (step === 0) leave(); else { disconnect(); O.mode = ''; show(0); msg(''); } });
tap('onMenu', () => leave());
tap('onAgain', () => { if (O.mode === 'pub') { disconnect(); O.active = false; closeAll(); LH = 1; resize(); state = 'onlobby'; $('onl').classList.add('on'); publicMatch(); return; }
  if (!net || !net.isHost) return; net.players = net.players.filter(p => p.id === 'h' || net.conns.has(p.id)); if (net.players.length < 2) { $('onResW').textContent = 'No quedan rivales conectados.'; return; } startRace(); });
// ---------- sala pública: matchmaking automático por huecos fijos ----------
async function publicMatch() {
  O.mode = 'pub'; const me = info(), t0 = performance.now(); show(2); $('onCode').style.display = 'none'; $('onCodeL').style.display = 'none'; $('onStart').style.display = 'none'; $('onWait').style.display = ''; $('onWait').textContent = '';
  showList([{ id: 'h', ...me }], null); msg('🔎 Conectando…');
  const my = net = new Net(); wire(); my.max = PUBMAX; my.myId = 'h';
  const ok = () => net === my;
  // 1) conectar con el servidor PeerJS (máx 2 s; en móvil suele ser lo más lento)
  try { my.peer = await my._peer(null, 2000); } catch (e) { if (ok()) { my.peer = null; my.offline(me); hostPublic(t0); } return; }
  if (!ok()) return; msg('🔎 Buscando sala pública…');
  // 2) probar los 6 huecos en paralelo (máx 1,2 s)
  try { await my.joinAny(Array.from({ length: PUBSLOTS }, (_, s) => NPUB + s), me, 1200); if (ok()) msg('¡Sala encontrada!'); return; } catch (e) { }
  if (!ok()) return;
  // 3) crear sala en un hueco al azar (máx ~2 s); si falla, carrera con bots sin red
  const old = my.peer; my.peer = null; try { old.destroy(); } catch (e) { }
  // hueco más bajo libre; si otro jugador lo acaba de coger a la vez, nos unimos a él
  for (let sl = 0; sl < PUBSLOTS && performance.now() - t0 < 4000; sl++) { if (!ok()) return;
    try { await my.hostId(NPUB + sl, me); if (ok()) hostPublic(t0); return; }
    catch (e) { try { if (my.peer) my.peer.destroy(); } catch (x) { } my.peer = null; if (e.message !== 'taken') break;
      try { my.peer = await my._peer(null, 1500); await my.joinAny([NPUB + sl], me, 900); if (ok()) msg('¡Sala encontrada!'); return; } catch (x) { try { if (my.peer) my.peer.destroy(); } catch (y) { } my.peer = null; } } }
  if (!ok()) return; my.isHost = false; my.offline(me); hostPublic(t0);
}
function hostPublic(t0) {
  msg(net.offlineMode ? '' : 'Esperando rivales…'); let bi = 0; const end = t0 + PUBWAIT;
  // los bots se van "conectando" con pequeños retrasos, como jugadores reales, antes de la salida
  const nB = PUBMAX - 1, now0 = performance.now(), span = Math.max(600, end - now0 - 700); for (let k = 0; k < nB; k++) { const at = span * (k + rnd(0.15, 0.9)) / nB; botQueue.push(setTimeout(() => { if (!net || net.started || net.players.length >= PUBMAX) return; net.players.push(makeBot(net.players.map(p => p.name), bi++)); net.lobbyExtra = { eta: end - performance.now() }; net.lobby(); }, at)); }
  const tick = () => { if (!net || net.started) return; let eta = Math.max(0, end - performance.now()); if (net.realCount() >= PUBMAX) eta = Math.min(eta, 1500);
    net.lobbyExtra = { eta }; net.lobby();
    if (eta <= 0) { while (net.players.length < PUBMAX) net.players.push(makeBot(net.players.map(p => p.name), bi++)); clearTimers(); O.tWait = performance.now() - t0; startRace(); } };
  pubTimer = setInterval(tick, 250); tick();
}
let bots = [], botLastStep = 0;
function startRace() { net.started = true; const d = { t: 'start', seed: (Math.random() * 1e9) | 0, mode: O.mode, players: net.players.map(p => ({ id: p.id, name: p.name, ch: p.ch, uid: p.uid, bot: p.bot ? 1 : 0 })) }; net.send(d); begin(d);
  bots = net.players.filter(p => p.bot); bots.forEach(botPlan); botLastStep = 0;
  if (bots.length) { let last = performance.now();
    // respaldo cuando el anfitrión ya no está jugando (ha caído o terminado): los bots siguen con el reloj real
    botTimer = setInterval(() => { const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now; if (!O.active && !O.done) return; const me = O.peers[myId()]; if (now - startAt < 4000 || (state === 'play' && me && !me.dead && !me.fin)) return; botStep(dt, true); }, 16); }
}
const ease = k => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
// los bots avanzan con el MISMO reloj de juego que el anfitrión (paso a paso por fotograma) -> misma velocidad que un jugador real
function botStep(dt, wall) { if (!wall) botLastStep = performance.now(); let ch = false;
  for (const b of bots) { const p = O.peers[b.id]; if (!p || p.dead || p.fin) continue; ch = true; b.tl += dt;
    const sp = Math.min(31, 12.5 + 14.5 * Math.min(O.dAt(p.d), 1)); b.sk = (b.sk || 1) + (rnd(0.985, 1.015) - (b.sk || 1)) * Math.min(1, dt * 0.5); p.v = sp * b.sk; p.d = Math.min(GOAL, p.d + p.v * dt);
    b.nextMove -= dt; if (b.nextMove <= 0) { b.nextMove = rnd(0.5, 2.2) + b.react; const to = Math.max(-2, Math.min(2, Math.round(b.lane ?? p.x) + (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.85 ? 1 : 2))); b.mv = { from: p.x, to, k: 0, dur: rnd(0.16, 0.3) * Math.abs(to - p.x || 1) }; b.lane = to; }
    if (b.mv) { b.mv.k += dt / b.mv.dur; p.x = b.mv.from + (b.mv.to - b.mv.from) * ease(b.mv.k); if (b.mv.k >= 1) b.mv = null; }
    b.cT -= dt; if (b.cT <= 0) { b.cT = rnd(0.7, 2.6); p.c = (Math.random() * 3) | 0; }
    if (p.d >= b.dieAt) { p.dead = 1; p.d = b.dieAt; p.v = 0; }
    else if (p.d >= GOAL) { p.fin = 1; p.d = GOAL; p.ft = b.tl + rnd(0, 0.6) * (1.1 - b.skill); } }
  if (wall) { sendT -= dt; if (sendT <= 0) { sendT = SEND; push(); } if (O.done) showRes(); }
  else if (!ch && bots.length) checkEnd(); }
// ---------- carrera ----------
function begin(d) {
  O.seed = d.seed; O.rng = mulberry(d.seed); O.done = false; O.res = null; O.hostGone = 0; O.final = 0; O.sent = 0; O.peers = {}; if (d.mode) O.mode = d.mode;
  d.players.forEach((p, i) => O.peers[p.id] = { id: p.id, name: p.name, ch: p.ch | 0, uid: p.uid || '', bot: !!p.bot, col: GCOL[i % 6], d: 0, x: 0, c: 0, dead: 0, fin: 0, ft: 0, v: 0, buf: [], rd: 0, rx: 0, rgb: null, rv: 0 });
  closeAll(); $('onHud').classList.add('on'); $('onBar').classList.add('on');
  $('onBar').querySelectorAll('u').forEach(u => u.remove()); for (const k in O.peers) { const u = document.createElement('u'); u.style.background = O.peers[k].col; u.id = 'ob_' + k; $('onBar').appendChild(u); }
  O.active = true; LH = 2; resize();
  const td = tutDone; tutDone = true; turbo = false; startGame('normal'); tutDone = td;
  freezeT = 3.999; startAt = performance.now(); finT = 0; hideHint();
}
O.dAt = w => Math.min(0.9, 0.08 + 0.82 * w / GOAL);
O.spawn = f => { const r0 = Math.random, dc = dCur, sp = speed; Math.random = O.rng; try { dCur = O.dAt(dist + spawnZ); speed = Math.min(31, 12.5 + 14.5 * Math.min(dCur, 1)); f(); } finally { Math.random = r0; dCur = dc; speed = sp; } };
O.tick = dt => {
  const me = O.peers[myId()]; if (!me) return;
  if (dt > 0) me.v += ((dist - me.d) / dt - me.v) * Math.min(1, dt * 20); me.d = dist; me.x = mochi.x; me.c = mochi.color; finT += dt;
  if (net && net.isHost && bots.length) botStep(dt);
  if (!me.fin && dist >= GOAL) { me.fin = 1; me.ft = finT; me.d = GOAL; Snd.record(); for (let k = 0; k < 30; k++) burst(W / 2, H * 0.35, PAL[k % 3].lrgb, 1, { min: 80, max: 300, g: 300, type: 'confetti', life: 1.2, rmin: 3, rmax: 6 }); state = 'over'; overT = 0; push(true); O.myEnd(); return; }
  sendT -= dt; if (sendT <= 0) { sendT = SEND; push(); }
  hud();
};
const SEND = 1 / 15, DELAY = 130; // 15 paquetes/s; se dibuja ~130 ms en el pasado para poder interpolar
const r2 = v => Math.round(v * 100) / 100;
const snap = p => ({ id: p.id, d: r2(p.d), x: r2(p.x), c: p.c, v: r2(p.v || 0), dead: p.dead, fin: p.fin, ft: p.ft });
function push(force) { const me = O.peers[myId()]; if (!me || !net) return; const ts = performance.now();
  if (net.isHost) { net.send({ t: 'all', ts, ps: Object.values(O.peers).map(snap) }); checkEnd(); } else net.send({ t: 'st', ts, ...snap(me) }); }
// reloj: offset = mínimo (llegada - envío) visto; así el jitter no descoloca las marcas de tiempo
const clk = {};
function feed(src, ts, q) { const p = O.peers[q.id]; if (!p) return; const now = performance.now(); let o = clk[src]; const s0 = now - (ts || now);
  o = clk[src] = o == null ? s0 : Math.min(o + 0.5, s0); const lt = (ts || now) + o; // tiempo local equivalente
  const last = p.buf[p.buf.length - 1]; if (last && lt <= last.t) return; // paquete viejo o duplicado
  p.buf.push({ t: lt, d: q.d, x: q.x, v: q.v || 0 }); if (p.buf.length > 30) p.buf.shift();
  p.d = q.d; p.x = q.x; p.c = q.c; p.v = q.v || 0; p.dead = q.dead; p.fin = q.fin; p.ft = q.ft; }
function onMsg(d) {
  if (d.t === 'start') { begin(d); return; }
  if (d.t === 'st' && net.isHost) { if (O.peers[d.from]) { d.id = d.from; feed(d.from, d.ts, d); } checkEnd(); return; }
  if (d.t === 'all') { for (const q of d.ps) if (q.id !== myId()) feed('h', d.ts, q); if (O.done) showRes(); return; }
  if (d.t === 'end') { for (const q of d.ps) if (O.peers[q.id] && q.id !== myId()) Object.assign(O.peers[q.id], { d: q.d, x: q.x, c: q.c, dead: q.dead, fin: q.fin, ft: q.ft }); O.final = 1; showRes(); }
}
// posición a dibujar: interpolación en el buffer + extrapolación por velocidad + corrección suave
let rLast = 0;
function smoothAll() { const now = performance.now(), dt = Math.min(0.1, rLast ? (now - rLast) / 1000 : 0); rLast = now; const rt = now - DELAY;
  for (const k in O.peers) { if (k === myId()) continue; const p = O.peers[k]; let td, tx;
    if (p.bot && net && net.isHost) { td = p.d; tx = p.x; } // bots locales: ya van suaves por fotograma
    else { const B = p.buf; if (!B.length) { td = p.d; tx = p.x; } else {
      let i = B.length - 1; while (i > 0 && B[i - 1].t > rt) i--;
      if (rt >= B[B.length - 1].t) { const L = B[B.length - 1], ex = Math.min(0.6, (rt - L.t) / 1000); td = L.d + (p.dead || p.fin ? 0 : L.v * ex); tx = L.x; }
      else if (i === 0 && rt < B[0].t) { td = B[0].d; tx = B[0].x; }
      else { const A = B[i - 1], C = B[i], k2 = (rt - A.t) / Math.max(1, C.t - A.t); td = A.d + (C.d - A.d) * k2; tx = A.x + (C.x - A.x) * k2; } } }
    if (p.fin) td = Math.min(td, GOAL);
    if (!p.rs) { p.rs = 1; p.rd = td; p.rx = tx; p.rv = p.v || 0; }
    // avanza con su velocidad y corrige el error poco a poco (salta solo si el error es enorme)
    const err = td - p.rd; if (Math.abs(err) > 40) p.rd = td; else { p.rv += ((p.dead ? 0 : p.v || 0) - p.rv) * Math.min(1, dt * 6); p.rd += p.rv * dt + err * Math.min(1, dt * 5); }
    if (p.dead && Math.abs(err) < 0.3) p.rd = td;
    p.rx += (tx - p.rx) * Math.min(1, dt * 14);
    const tc = PAL[p.c] ? PAL[p.c].rgb : [255, 150, 200]; if (!p.rgb) p.rgb = tc.slice(); for (let j = 0; j < 3; j++) p.rgb[j] += (tc[j] - p.rgb[j]) * Math.min(1, dt * 9); } }
function ranking() { return Object.values(O.peers).sort((a, b) => (b.fin - a.fin) || (a.fin ? a.ft - b.ft : b.d - a.d)); }
function checkEnd() { if (!net || !net.isHost || !O.active) return; const ps = Object.values(O.peers); if (ps.every(p => p.dead || p.fin)) { if (!O.final) { O.final = 1; net.send({ t: 'end', ps }); clearInterval(botTimer); botTimer = null; } showRes(); } }
O.myEnd = () => { const me = O.peers[myId()]; if (me && !me.fin) { me.dead = 1; me.d = dist; } O.done = true; push(true); $('onHud').classList.remove('on'); setTimeout(showRes, 600); if (O.hostGone) { O.final = 1; } };
const PTS = [10, 7, 5, 3, 2, 1];
function racePoints(pos, p) { return (PTS[pos] || 1) + Math.floor(Math.min(p.d, GOAL) / 100) + (p.fin ? 5 : 0); }
function showRes() { if (!O.done) return; const r = ranking(), meI = r.findIndex(p => p.id === myId());
  $('onres').classList.add('on'); const fin = O.final || O.hostGone;
  $('onResT').textContent = fin ? (meI === 0 ? '🏆 ¡Has ganado!' : `Has quedado ${meI + 1}º`) : 'Clasificación';
  $('onResL').innerHTML = r.map((p, i) => `<div class="onp${p.id === myId() ? ' me' : ''}"><span>${['🥇', '🥈', '🥉'][i] || (i + 1) + 'º'}</span><i style="background:${p.col}"></i>${esc(p.name)}${p.id === myId() ? ' (tú)' : ''}<b>${p.fin ? '🏁 ' + p.ft.toFixed(1) + ' s' : Math.round(p.d) + ' m' + (p.dead ? '' : ' …')}</b></div>`).join('');
  $('onResW').textContent = fin ? '' : 'Esperando a que terminen los demás…';
  if (fin && !O.sent && meI >= 0) { O.sent = 1; const pts = racePoints(meI, r[meI]); $('onResP').textContent = `+${pts} puntos${meI === 0 ? ' · +1 victoria' : ''} para el ranking mundial`; Rank.add(meI === 0 ? 1 : 0, pts); } else if (!fin) $('onResP').textContent = '';
  $('onAgain').style.display = fin && (O.mode === 'pub' || (net && net.isHost)) ? '' : 'none'; $('onAgain').textContent = O.mode === 'pub' ? '🔎 Buscar otra carrera' : '↻ Otra carrera'; }
function hud() { if ((O._h = (O._h || 0) + 1) % 6) return; const r = ranking();
  $('onHud').innerHTML = r.map((p, i) => `<div class="r">${i + 1}. ${esc(p.name)}${p.id === myId() ? ' ★' : ''} ${p.fin ? '🏁' : p.dead ? '💥' : Math.round(p.d) + 'm'} <i style="background:${p.col}"></i></div>`).join('');
  for (const p of r) { const u = $('ob_' + p.id); if (u) u.style.left = Math.min(100, p.d / GOAL * 100) + '%'; } }
// ---------- ranking mundial (solo jugadores reales; los bots nunca envían nada) ----------
const Rank = {
  me() { return Object.assign({ w: 0, p: 0, g: 0 }, JSON.parse(store.get('mochi_rank_me', '{}') || '{}')); },
  async fetchAll() { const r = await fetch(RANK_URL, { cache: 'no-store' }); if (!r.ok) throw new Error('rank'); const j = await r.json(); return (j && j.data && j.data.p) || {}; },
  clean(all) { const arr = Object.entries(all).filter(([k, v]) => v && typeof v.w === 'number' && typeof v.p === 'number').sort((a, b) => b[1].p - a[1].p || b[1].w - a[1].w).slice(0, 300); return Object.fromEntries(arr); },
  async sync() { const me = this.me(); if (!me.g) return this.fetchAll(); const all = await this.fetchAll(); const cur = all[uid] || { w: 0, p: 0, g: 0 };
    all[uid] = { n: (myName || store.get('mochi_onname', '') || 'Mochi').slice(0, 12), w: Math.max(cur.w, me.w), p: Math.max(cur.p, me.p), g: Math.max(cur.g || 0, me.g), t: Date.now() };
    const data = { v: 1, p: this.clean(all) }; const r = await fetch(RANK_URL, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: RANK_NAME, data }) }); if (!r.ok) throw new Error('rank'); store.set('mochi_rank_dirty', '0'); return data.p; },
  async safeSync() { // varios jugadores terminan a la vez: escalonar, comprobar y reintentar para no pisarse
    for (let k = 0; k < 4; k++) { await new Promise(r => setTimeout(r, 300 + Math.random() * (k ? 2500 : 3500))); try { await this.sync(); const me = this.me(), all = await this.fetchAll(), e = all[uid]; if (e && e.g >= me.g && e.p >= me.p) return all; } catch (e) { } }
    throw new Error('rank'); },
  add(w, p) { const me = this.me(); me.w += w; me.p += p; me.g += 1; store.set('mochi_rank_me', JSON.stringify(me)); store.set('mochi_rank_dirty', '1'); this.pending = this.safeSync().catch(() => { }); }
};
let rkTab = 'w';
tap('rkW', () => { rkTab = 'w'; renderRank(); }); tap('rkP', () => { rkTab = 'p'; renderRank(); });
let rkData = null, rkOnline = false;
async function openRank() { $('onrk').classList.add('on'); $('rkSrc').textContent = 'Cargando ranking mundial…'; $('rkList').innerHTML = ''; $('rkMe').textContent = '';
  try { if (Rank.pending) await Rank.pending; rkData = await (store.get('mochi_rank_dirty', '0') === '1' ? Rank.sync() : Rank.fetchAll()); rkOnline = true; } catch (e) { rkOnline = false; rkData = null; } renderRank(); }
function renderRank() { $('rkW').classList.toggle('sel', rkTab === 'w'); $('rkP').classList.toggle('sel', rkTab === 'p'); const me = Rank.me();
  let rows = rkData ? Object.entries(rkData).map(([k, v]) => ({ k, n: v.n || '???', w: v.w | 0, p: v.p | 0, g: v.g | 0 })) : [];
  if (!rkOnline) { rows = me.g ? [{ k: uid, n: store.get('mochi_onname', '') || 'Tú', ...me }] : []; }
  rows.sort((a, b) => rkTab === 'w' ? (b.w - a.w || b.p - a.p) : (b.p - a.p || b.w - a.w));
  $('rkSrc').textContent = rkOnline ? `🌍 Mundial · ${rows.length} jugadores` : '📱 Sin conexión: mostrando solo tu marcador local (se subirá cuando vuelva la conexión)';
  $('rkList').innerHTML = rows.slice(0, 100).map((r, i) => `<div class="onp${r.k === uid ? ' me' : ''}"><span>${['🥇', '🥈', '🥉'][i] || (i + 1) + 'º'}</span>${esc(r.n)}${r.k === uid ? ' (tú)' : ''}<b>${rkTab === 'w' ? r.w + ' 🏆' : r.p + ' ⭐'}</b></div>`).join('') || '<div style="font-size:14px">Aún no hay nadie. ¡Juega una carrera online y sé el primero!</div>';
  const pos = rows.findIndex(r => r.k === uid); $('rkMe').textContent = `Tú: ${me.w} victorias · ${me.p} puntos · ${me.g} carreras${pos >= 0 && rkOnline ? ' · puesto ' + (pos + 1) + 'º' : ''}`; }
if (store.get('mochi_rank_dirty', '0') === '1') setTimeout(() => { Rank.pending = Rank.safeSync().catch(() => { }); }, 3000);
// ---------- dibujo: fantasmas semitransparentes + meta ----------
O.items = (items, g) => {
  const zf = GOAL - dist; if (zf > -2 && zf < FAR) items.push({ z: zf + 0.02, d: () => drawFinish(g, zf) });
  smoothAll(); for (const k in O.peers) { if (k === myId()) continue; const p = O.peers[k], z = p.rd - dist; if (z < -2.6 || z > FAR) continue; items.push({ z: z - 0.001, d: () => drawGhost(g, p, z) }); }
};
function drawGhost(g, p, z) {
  const pp = proj(p.rx, Math.max(z, -2.5)), size = laneW * 0.8 * pp.s; if (size < 3) return;
  const T2 = t + p.id.length * 1.7 + (p.id.charCodeAt(1) || 0) * 0.3, hop = Math.abs(Math.sin(T2 * 9)) * (p.dead ? 0 : 1);
  try { drawMochi(g, pp.x, pp.y - hop * size * 0.16, size, { ch: p.ch, rgb: p.rgb || [255, 150, 200], sx: p.dead ? 1.4 : 1, sy: p.dead ? 0.5 : 1, rot: 0, earL: -0.5, earR: 0.5, earBend: 0.55, foot: Math.sin(T2 * 9), arm: Math.sin(T2 * 9), blink: 0, look: -1, lookX: 0, mouth: null, dead: !!p.dead, happy: 0, alpha: 0.45, solid: true }); } catch (e) { }
  g.globalAlpha = 1; const fs = Math.max(10, Math.round(size * 0.24)); g.font = `700 ${fs}px ${I18N.FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  const ty = pp.y - size * 1.25; g.lineWidth = Math.max(3, fs * 0.3); g.strokeStyle = p.col; g.globalAlpha = 0.9; g.strokeText(p.name, pp.x, ty); g.fillStyle = '#fff'; g.fillText(p.name, pp.x, ty); g.globalAlpha = 1;
}
function drawFinish(g, z) { const RH = LH + 0.55, n = 10, z2 = z + 0.8;
  for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) { const x0 = -RH + 2 * RH * i / n, x1 = -RH + 2 * RH * (i + 1) / n, za = z + j * 0.4, zb = za + 0.4; if (zb < -2.8) continue;
    const a = proj(x0, Math.max(za, -2.8)), b = proj(x1, Math.max(za, -2.8)), c = proj(x1, zb), d = proj(x0, zb); g.fillStyle = (i + j) % 2 ? '#ffffff' : '#ff6fae'; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c.x, c.y); g.lineTo(d.x, d.y); g.closePath(); g.fill(); }
  const l = proj(-RH, z2), r = proj(RH, z2), h = laneW * 1.6 * l.s; g.strokeStyle = '#fff'; g.lineWidth = Math.max(2, 6 * l.s);
  g.beginPath(); g.moveTo(l.x, l.y); g.lineTo(l.x, l.y - h); g.moveTo(r.x, r.y); g.lineTo(r.x, r.y - h); g.stroke();
  g.fillStyle = '#ff6fae'; g.fillRect(l.x, l.y - h, r.x - l.x, h * 0.22); g.fillStyle = '#fff'; g.font = `700 ${Math.max(10, Math.round(h * 0.17))}px ${I18N.FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('META', (l.x + r.x) / 2, l.y - h * 0.89);
}
window.__onl = { O, Rank, uid, get net() { return net; }, get state() { return state; }, get LH() { return LH; }, get freezeT() { return freezeT; }, setGod(v) { godMode = v; }, setDist(v) { dist = v; }, getDist() { return dist; }, kill() { godMode = false; invulnT = 0; die('block'); }, rowsSig() { return rows.slice().sort((a, b) => a.z - b.z).slice(0, 4).map(r => r.cells.map(c => c.t + (c.c ?? '')).join('') + '@' + Math.round(r.z + dist)).join(' '); } };
})();
})();
