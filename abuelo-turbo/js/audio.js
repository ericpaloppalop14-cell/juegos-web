/* Sonido 100% sintetizado: efectos, motor, voz de abuelo y música por distrito */
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const A = {
  ctx: null, ok: false, musicOn: true, sfxOn: true, style: 0, playing: false, step: 0, nextT: 0, timer: null, bar: 0, intensity: 0, menuMode: true,
  init() {
    if (this.ctx) return; try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return; this.ctx = new C();
      const c = this.ctx; this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.knee.value = 20; this.comp.ratio.value = 6; this.comp.attack.value = 0.004; this.comp.release.value = 0.2;
      this.master = c.createGain(); this.master.gain.value = 0.9; this.sfxBus = c.createGain(); this.musBus = c.createGain(); this.musBus.gain.value = 0.42;
      this.sfxBus.connect(this.comp); this.musBus.connect(this.comp); this.comp.connect(this.master); this.master.connect(c.destination);
      const n = c.sampleRate, buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; this.noiseBuf = buf;
      // distortion curve
      const k = 30, cur = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; cur[i] = (1 + k) * x / (1 + k * Math.abs(x)); } this.dist = c.createWaveShaper(); this.dist.curve = cur; this.dist.oversample = '2x'; this.dist.connect(this.musBus);
      this.ok = true;
    } catch (e) { this.ok = false; }
  },
  resume() { this.init(); if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => { }); },
  now() { return this.ctx.currentTime; },
  setMusic(on) { this.musicOn = on; if (this.musBus) this.musBus.gain.setTargetAtTime(on ? 0.42 : 0, this.ctx.currentTime, 0.05); },
  setSfx(on) { this.sfxOn = on; if (this.sfxBus) this.sfxBus.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.05); },
  osc(type, f0, f1, dur, vol, t0 = 0, dest = null, attack = 0.005) {
    if (!this.ok) return; const c = this.ctx, t = c.currentTime + t0; const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(dest || this.sfxBus); o.start(t); o.stop(t + dur + 0.05); return o;
  },
  noise(dur, vol, ftype, f0, f1, q = 1, t0 = 0, dest = null) {
    if (!this.ok) return; const c = this.ctx, t = c.currentTime + t0; const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; const f = c.createBiquadFilter(); f.type = ftype; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur); f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(dest || this.sfxBus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  },
  /* ---------- SFX ---------- */
  coin(n = 0) { const sc = [0, 2, 4, 7, 9, 12, 14, 16]; const m = 79 + sc[n % 8] + (n >= 8 ? 12 : 0); this.osc('triangle', mtof(m), mtof(m), 0.14, 0.22); this.osc('sine', mtof(m + 12), mtof(m + 12), 0.2, 0.1, 0.045); },
  gold() { [0, 4, 7, 12, 16].forEach((s, i) => this.osc('triangle', mtof(79 + s), 0, 0.2, 0.2, i * 0.05)); },
  jump() { this.osc('sine', 260, 640, 0.22, 0.2); this.noise(0.2, 0.08, 'bandpass', 600, 2400, 1); },
  land(h = 1) { this.osc('sine', 120, 45, 0.16, 0.35 * h); this.noise(0.1, 0.12 * h, 'lowpass', 900, 200, 1); },
  slide() { this.noise(0.34, 0.16, 'bandpass', 2600, 500, 1.2); this.osc('sawtooth', 220, 90, 0.25, 0.05); },
  lane(dir = 1) { this.noise(0.14, 0.09, 'bandpass', dir > 0 ? 700 : 1200, dir > 0 ? 1500 : 600, 1.5); },
  stumble() { this.osc('square', 180, 90, 0.18, 0.15); this.noise(0.14, 0.22, 'lowpass', 800, 150, 1); },
  crash() { this.noise(0.7, 0.55, 'lowpass', 2400, 120, 0.8); this.osc('sawtooth', 200, 40, 0.6, 0.3); this.osc('square', 120, 35, 0.4, 0.25); this.noise(0.2, 0.25, 'highpass', 3000, 5000, 1); this.osc('triangle', 520, 130, 0.5, 0.18, 0.12); },
  pill() { [0, 4, 7, 11, 14, 19].forEach((s, i) => { this.osc('square', mtof(72 + s), 0, 0.14, 0.1, i * 0.045); this.osc('triangle', mtof(84 + s), 0, 0.14, 0.12, i * 0.045); }); },
  turbo() { this.noise(1.1, 0.4, 'bandpass', 300, 5000, 0.9); this.osc('sawtooth', 90, 700, 1.0, 0.18); this.osc('square', 180, 1400, 0.9, 0.06); },
  shield() { [0, 7, 12].forEach((s, i) => this.osc('sine', mtof(64 + s), mtof(64 + s + 12), 0.5, 0.18, i * 0.06)); this.noise(0.4, 0.1, 'highpass', 4000, 7000, 1); },
  shieldBreak() { this.noise(0.5, 0.4, 'highpass', 6000, 1500, 0.8); this.osc('sawtooth', 700, 80, 0.4, 0.22); this.osc('sine', 1200, 300, 0.3, 0.18); },
  magnet() { for (let i = 0; i < 4; i++) this.osc('sine', 400 + i * 80, 900 + i * 80, 0.18, 0.1, i * 0.07); },
  cane() { this.osc('sine', 200, 900, 0.18, 0.2); this.osc('triangle', 300, 1200, 0.2, 0.1, 0.06); },
  coffee() { [0, 3, 7, 10, 12].forEach((s, i) => this.osc('triangle', mtof(65 + s), 0, 0.12, 0.14, i * 0.05)); this.noise(0.25, 0.06, 'bandpass', 3000, 6000, 1); },
  honk() { const f = 300 + Math.random() * 60; this.osc('sawtooth', f, f, 0.38, 0.1); this.osc('square', f * 1.26, f * 1.26, 0.38, 0.06); },
  click() { this.osc('triangle', 700, 900, 0.07, 0.16); },
  back() { this.osc('triangle', 600, 400, 0.08, 0.14); },
  buy() { [0, 5, 9, 12, 17].forEach((s, i) => this.osc('square', mtof(76 + s), 0, 0.11, 0.1, i * 0.055)); this.noise(0.15, 0.1, 'highpass', 6000, 8000, 1, 0.2); },
  error() { this.osc('square', 150, 110, 0.2, 0.14); this.osc('square', 140, 100, 0.22, 0.12, 0.12); },
  fanfare() { [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => { this.osc('square', mtof(67 + s), 0, 0.22, 0.1, i * 0.1); this.osc('triangle', mtof(79 + s), 0, 0.26, 0.12, i * 0.1); }); },
  mission() { [0, 4, 7, 12].forEach((s, i) => { this.osc('triangle', mtof(72 + s), 0, 0.3, 0.2, i * 0.09); this.osc('square', mtof(84 + s), 0, 0.2, 0.05, i * 0.09); }); },
  flip() { this.osc('sine', 500, 1600, 0.35, 0.16); this.osc('triangle', 800, 2400, 0.3, 0.08, 0.05); },
  boing() { this.osc('sine', 150, 600, 0.3, 0.3); this.osc('sine', 600, 150, 0.2, 0.2, 0.18); },
  district() { [0, 7, 12, 16].forEach((s, i) => { this.osc('square', mtof(60 + s), 0, 0.3, 0.08, i * 0.11); this.osc('sawtooth', mtof(48 + s), 0, 0.3, 0.1, i * 0.11); }); },
  boom() { this.noise(0.9, 0.18, 'lowpass', 600, 60, 0.8); this.osc('sine', 90, 30, 0.6, 0.2); },
  whoosh() { this.noise(0.5, 0.18, 'bandpass', 300, 3000, 0.8); },
  blip(p = 1, n = 6) { // voz de abuelo: bla-bla-bla
    if (!this.ok) return; const c = this.ctx; for (let i = 0; i < n; i++) { const t = i * 0.065; const f = (150 + Math.random() * 90) * p; const o = c.createOscillator(), g = c.createGain(), bp = c.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, c.currentTime + t); o.frequency.linearRampToValueAtTime(f * (0.85 + Math.random() * 0.4), c.currentTime + t + 0.06); bp.type = 'bandpass'; bp.frequency.value = 500 + Math.random() * 900; bp.Q.value = 3;
      g.gain.setValueAtTime(0.0001, c.currentTime + t); g.gain.linearRampToValueAtTime(0.11, c.currentTime + t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t + 0.06); o.connect(bp); bp.connect(g); g.connect(this.sfxBus); o.start(c.currentTime + t); o.stop(c.currentTime + t + 0.08); }
  },
  /* ---------- motor del cohete ---------- */
  engineStart() {
    if (!this.ok || this.eng) return; const c = this.ctx; const o = c.createOscillator(), o2 = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(); o.type = 'sawtooth'; o2.type = 'square'; o.frequency.value = 55; o2.frequency.value = 27.5; lp.type = 'lowpass'; lp.frequency.value = 260; g.gain.value = 0.0001;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 900; nf.Q.value = 0.6; const ng = c.createGain(); ng.gain.value = 0.0001; s.connect(nf); nf.connect(ng); ng.connect(this.sfxBus);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this.sfxBus); o.start(); o2.start(); s.start(); this.eng = { o, o2, lp, g, s, nf, ng };
  },
  engineSet(speed, turbo, vol = 1) { if (!this.eng) return; const t = this.ctx.currentTime, e = this.eng; e.o.frequency.setTargetAtTime(52 + speed * 1.7 + (turbo ? 28 : 0), t, 0.1); e.o2.frequency.setTargetAtTime((52 + speed * 1.7) / 2, t, 0.1); e.lp.frequency.setTargetAtTime(240 + speed * 8 + (turbo ? 500 : 0), t, 0.1); e.g.gain.setTargetAtTime(0.07 * vol, t, 0.1); e.nf.frequency.setTargetAtTime(700 + speed * 25 + (turbo ? 1500 : 0), t, 0.1); e.ng.gain.setTargetAtTime((0.015 + speed * 0.0007 + (turbo ? 0.06 : 0)) * vol, t, 0.1); },
  engineStop() { if (!this.eng) return; const e = this.eng, t = this.ctx.currentTime; e.g.gain.setTargetAtTime(0, t, 0.08); e.ng.gain.setTargetAtTime(0, t, 0.08); const x = e; setTimeout(() => { try { x.o.stop(); x.o2.stop(); x.s.stop(); } catch (_) { } }, 400); this.eng = null; },
  /* ---------- música ---------- */
  musicStart(style, menu = false) { if (!this.ok) return; this.menuMode = menu; this.style = style; this.nextT = this.ctx.currentTime + 0.1; this.step = 0; this.bar = 0; if (!this.playing) { this.playing = true; this.timer = setInterval(() => this.sched(), 30); } },
  musicStop() { this.playing = false; clearInterval(this.timer); this.timer = null; },
  setStyle(i) { this.style = i; },
  sched() {
    if (!this.playing || !this.ok) return; const c = this.ctx; const st = STY[this.style]; const sd = 60 / st.bpm / 4 * (this.intensity > 0.5 ? 0.97 : 1);
    while (this.nextT < c.currentTime + 0.14) { this.playStep(st, this.step, this.nextT); this.step++; if (this.step % 16 === 0) this.bar++; this.nextT += sd; }
  },
  playStep(st, step, t) {
    const s16 = step % 16, bar = Math.floor(step / 16) % st.prog.length, ch = st.prog[bar], root = st.root + ch[0], menu = this.menuMode;
    const dt = Math.max(0, t - this.ctx.currentTime);
    const dr = st.drums; if (dr.k[s16]) this.kick(dt, 1); if (dr.s[s16]) this.snare(dt, dr.snareType); if (dr.h[s16] && (!menu || s16 % 4 === 0)) this.hat(dt, dr.h[s16] === 2); if (dr.c && dr.c[s16]) this.clap(dt);
    if (st.shaker && s16 % 2 === 0) this.noise(0.04, 0.03, 'highpass', 8000, 0, 1, dt, this.musBus);
    const bn = st.bass[s16]; if (bn !== undefined && bn !== null && bn !== 0 || bn === 0) { if (bn !== undefined && bn !== null) this.bassN(st, dt, root + ch[1][bn[0] !== undefined ? bn[0] : 0] + (bn[1] || 0) - 12, bn[2] || 0.2); }
    if (st.comp[s16]) this.comp2(st, dt, ch, root, st.comp[s16]);
    const ld = st.lead[(step % (16 * st.leadBars))]; if (ld && !(menu && Math.random() < 0.0)) this.leadN(st, dt, st.root + ld[0] + (ch[2] || 0), ld[1] * 60 / st.bpm / 4);
    if (st.arp && !menu) { const arp = st.arp; const n = arp[s16 % arp.length]; this.arpN(st, dt, root + ch[1][n % ch[1].length] + 12 * Math.floor(n / ch[1].length)); }
  },
  kick(dt, v) { this.osc('sine', 150, 42, 0.16, 0.8 * v, dt, this.musBus); this.noise(0.02, 0.2, 'lowpass', 3000, 0, 1, dt, this.musBus); },
  snare(dt, type) { this.noise(0.15, 0.32, 'bandpass', type === 'rock' ? 2200 : 1700, 0, 0.8, dt, this.musBus); this.osc('triangle', 220, 150, 0.1, 0.3, dt, this.musBus); },
  clap(dt) { for (let i = 0; i < 3; i++) this.noise(0.05, 0.2, 'bandpass', 1500, 0, 1.2, dt + i * 0.012, this.musBus); },
  hat(dt, open) { this.noise(open ? 0.14 : 0.04, 0.1, 'highpass', 7500, 0, 1, dt, this.musBus); },
  bassN(st, dt, m, len) { const f = mtof(m); const o = this.osc(st.bassType || 'triangle', f, f, len * (st.bassLen || 1), 0.42, dt, st.dist ? this.dist : this.musBus, 0.008); if (o && st.bassType === 'sawtooth') { } },
  comp2(st, dt, ch, root, vel) { const notes = ch[1].map(x => root + x + 12); notes.forEach(m => { const f = mtof(m); this.osc(st.compType || 'square', f, f, st.compLen || 0.13, 0.055 * vel, dt, st.dist ? this.dist : this.musBus); }); },
  leadN(st, dt, m, dur) { const c = this.ctx; const f = mtof(m); const t0 = c.currentTime + dt; const L = st.leadI;
    const o = c.createOscillator(), g = c.createGain(); o.type = L.type; o.frequency.setValueAtTime(f, t0); let o2 = null;
    if (L.det) { o2 = c.createOscillator(); o2.type = L.type; o2.frequency.setValueAtTime(f * (1 + L.det), t0); }
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(L.lp, t0); lp.Q.value = 1;
    if (L.vib) { const lf = c.createOscillator(), lg = c.createGain(); lf.frequency.value = 5.5; lg.gain.value = f * 0.012; lf.connect(lg); lg.connect(o.frequency); if (o2) lg.connect(o2.frequency); lf.start(t0); lf.stop(t0 + dur + 0.2); }
    const d = Math.max(0.12, dur * (L.hold || 0.95)); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(L.vol, t0 + (L.att || 0.012)); g.gain.setTargetAtTime(L.vol * (L.sus || 0.5), t0 + (L.att || 0.012), 0.08); g.gain.setTargetAtTime(0.0001, t0 + d, 0.05);
    o.connect(lp); if (o2) o2.connect(lp); lp.connect(g); g.connect(st.dist ? this.dist : this.musBus); o.start(t0); o.stop(t0 + d + 0.4); if (o2) { o2.start(t0); o2.stop(t0 + d + 0.4); }
  },
  arpN(st, dt, m) { const f = mtof(m + 12); const o = this.osc('sawtooth', f, f, 0.16, 0.05, dt, this.musBus); },
};
const rest = null;
/* patrones: lead = { stepIndex: [semitonesFromRoot, durationInSteps] } */
function L(arr, bars) { const o = {}; arr.forEach(a => { o[a[0]] = [a[1], a[2]]; }); return o; }
const MIN = [0, 3, 7], MAJ = [0, 4, 7];
const STY = [
  { // Barrio: pasodoble
    bpm: 132, root: 57, prog: [[0, MIN], [0, MIN], [7, [0, 4, 7], 0], [0, MIN], [5, [0, 3, 7]], [5, [0, 3, 7]], [7, [0, 4, 7]], [0, MIN]], bassType: 'triangle', compType: 'square', compLen: 0.1, shaker: false,
    drums: { k: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], s: [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0], h: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1] },
    bass: { 0: [0, 0], 4: [2, 0], 8: [0, 0], 12: [2, 0] }, comp: { 2: 1, 6: 1, 10: 1, 14: 1 }, leadBars: 4, leadI: { type: 'sawtooth', det: 0.006, lp: 2600, vol: 0.09, vib: true, sus: 0.7 },
    lead: L([[0, 12, 3], [3, 11, 1], [4, 12, 4], [8, 14, 2], [10, 12, 2], [12, 11, 2], [14, 9, 2], [16, 8, 3], [19, 9, 1], [20, 11, 4], [24, 12, 2], [26, 11, 2], [28, 9, 4], [32, 14, 3], [35, 12, 1], [36, 14, 4], [40, 16, 2], [42, 14, 2], [44, 12, 2], [46, 11, 2], [48, 12, 4], [52, 9, 2], [54, 8, 2], [56, 9, 6]]) },
  { // Mercado: cumbia
    bpm: 98, root: 60, prog: [[0, MAJ], [5, MAJ], [7, MAJ], [0, MAJ]], bassType: 'sine', compType: 'triangle', compLen: 0.12, shaker: true,
    drums: { k: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0], s: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1], h: [1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1] },
    bass: { 0: [0, 0], 3: [2, 0], 6: [1, 0], 8: [0, 0], 11: [2, 0], 14: [1, 0] }, comp: { 2: 1, 6: 1, 10: 1, 14: 1 }, leadBars: 4, leadI: { type: 'triangle', det: 0.003, lp: 3200, vol: 0.2, vib: true, sus: 0.6, hold: 0.8 },
    lead: L([[0, 12, 2], [2, 14, 2], [4, 16, 3], [8, 14, 2], [10, 12, 2], [12, 9, 4], [16, 12, 2], [18, 14, 2], [20, 17, 3], [24, 16, 2], [26, 14, 2], [28, 12, 4], [32, 16, 2], [34, 19, 2], [36, 17, 3], [40, 16, 2], [42, 14, 2], [44, 12, 4], [48, 14, 2], [50, 12, 2], [52, 9, 4], [56, 12, 6]]) },
  { // Playa: tropical
    bpm: 104, root: 53, prog: [[0, MAJ], [0, MAJ], [7, MAJ], [5, MAJ]], bassType: 'sine', compType: 'triangle', compLen: 0.16, shaker: true,
    drums: { k: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], s: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1], h: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0] },
    bass: { 0: [0, 0], 6: [0, 0], 8: [1, 0], 14: [2, 0] }, comp: { 2: 1, 6: 1, 10: 1, 14: 1 }, leadBars: 4, leadI: { type: 'sine', det: 0.004, lp: 4000, vol: 0.2, att: 0.004, sus: 0.2, hold: 0.55 },
    lead: L([[0, 16, 2], [2, 19, 2], [4, 21, 2], [6, 19, 2], [8, 16, 2], [10, 14, 2], [12, 16, 4], [16, 16, 2], [18, 19, 2], [20, 23, 2], [22, 21, 2], [24, 19, 2], [26, 16, 2], [28, 14, 4], [32, 14, 2], [34, 16, 2], [36, 19, 2], [38, 16, 2], [40, 14, 2], [42, 12, 2], [44, 14, 4], [48, 12, 2], [50, 14, 2], [52, 16, 2], [54, 19, 2], [56, 16, 6]]) },
  { // Polígono: rock
    bpm: 148, root: 52, prog: [[0, [0, 7, 12]], [0, [0, 7, 12]], [3, [0, 7, 12]], [5, [0, 7, 12]]], bassType: 'sawtooth', compType: 'sawtooth', compLen: 0.2, dist: true,
    drums: { k: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0], s: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], h: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], snareType: 'rock' },
    bass: { 0: [0, 0, 0.2], 2: [0, 0, 0.2], 4: [0, 0, 0.2], 6: [0, 0, 0.2], 8: [0, 0, 0.2], 10: [0, 0, 0.2], 12: [0, 0, 0.2], 14: [0, 0, 0.2] }, comp: { 0: 1.2, 6: 1, 8: 1.2, 10: 1 }, leadBars: 4, leadI: { type: 'sawtooth', det: 0.004, lp: 2200, vol: 0.07, sus: 0.6, vib: true },
    lead: L([[0, 12, 2], [2, 15, 2], [4, 17, 2], [6, 18, 2], [8, 17, 4], [12, 15, 2], [14, 12, 2], [16, 12, 2], [18, 15, 2], [20, 17, 2], [22, 19, 2], [24, 18, 4], [28, 17, 2], [30, 15, 2], [32, 19, 2], [34, 22, 2], [36, 19, 2], [38, 18, 2], [40, 17, 4], [44, 15, 2], [46, 12, 2], [48, 15, 2], [50, 17, 2], [52, 18, 2], [54, 17, 2], [56, 15, 6]]) },
  { // Fiestas: verbena
    bpm: 140, root: 50, prog: [[0, MAJ], [0, MAJ], [7, MAJ], [0, MAJ], [5, MAJ], [0, MAJ], [7, MAJ], [0, MAJ]], bassType: 'triangle', compType: 'sawtooth', compLen: 0.09,
    drums: { k: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], s: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1], h: [0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0] },
    bass: { 0: [0, 0], 4: [2, 0], 8: [0, 0], 12: [2, 0] }, comp: { 2: 1, 6: 1, 10: 1, 14: 1 }, leadBars: 4, leadI: { type: 'sawtooth', det: 0.008, lp: 3000, vol: 0.085, vib: true, sus: 0.8 },
    lead: L([[0, 16, 2], [2, 18, 2], [4, 19, 2], [6, 21, 2], [8, 19, 4], [12, 18, 2], [14, 16, 2], [16, 14, 2], [18, 16, 2], [20, 18, 4], [24, 16, 2], [26, 14, 2], [28, 12, 4], [32, 19, 2], [34, 21, 2], [36, 23, 4], [40, 21, 2], [42, 19, 2], [44, 18, 4], [48, 16, 2], [50, 18, 2], [52, 19, 2], [54, 18, 2], [56, 16, 6]]) },
  { // Noche: synthwave
    bpm: 118, root: 48, prog: [[0, MIN], [8, MAJ], [3, MAJ], [10, MAJ]], bassType: 'sawtooth', compType: 'sawtooth', compLen: 0.3, shaker: false,
    drums: { k: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], s: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], h: [0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 1], c: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] },
    bass: { 0: [0, 0], 2: [0, 0], 4: [0, 0], 6: [0, 0], 8: [0, 0], 10: [0, 0], 12: [0, 0], 14: [0, 0] }, comp: { 0: 0.8 }, arp: [0, 1, 2, 3, 2, 1, 2, 1], leadBars: 4, leadI: { type: 'square', det: 0.005, lp: 1800, vol: 0.06, vib: true, sus: 0.7, att: 0.02 },
    lead: L([[0, 19, 4], [4, 17, 2], [6, 15, 2], [8, 14, 4], [12, 15, 4], [16, 19, 4], [20, 22, 2], [22, 20, 2], [24, 19, 4], [28, 17, 4], [32, 15, 4], [36, 17, 2], [38, 19, 2], [40, 20, 4], [44, 19, 4], [48, 17, 4], [52, 15, 2], [54, 14, 2], [56, 12, 8]]) },
];
window.__A = A;
export default A;
