/* Sonido 100% sintetizado: efectos, motor, voz de abuelo y música por distrito */
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const A = {
  ctx: null, ok: false, musicOn: true, sfxOn: true, style: 0, playing: false, step: 0, nextT: 0, timer: null, bar: 0, intensity: 0, menuMode: true,
  init() {
    if (this.ctx) return; try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return; this.ctx = new C();
      const c = this.ctx; this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.knee.value = 20; this.comp.ratio.value = 6; this.comp.attack.value = 0.004; this.comp.release.value = 0.2;
      this.master = c.createGain(); this.master.gain.value = 0.8; this.sfxBus = c.createGain(); this.musBus = c.createGain(); this.musBus.gain.value = 0.7;
      this.sfxBus.connect(this.comp); this.musBus.connect(this.comp); this.comp.connect(this.master); this.master.connect(c.destination);
      const n = c.sampleRate, buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; this.noiseBuf = buf;
      // eco suave (da aire y calma a la música)
      this.musIn = c.createGain(); this.musIn.gain.value = 1; const dl = c.createDelay(1.0); dl.delayTime.value = 0.36; const fb = c.createGain(); fb.gain.value = 0.34; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; const wet = c.createGain(); wet.gain.value = 0.38;
      this.musIn.connect(this.musBus); this.musIn.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(wet); wet.connect(this.musBus); this.dist = this.musIn;
      this.ok = true;
    } catch (e) { this.ok = false; }
  },
  resume() { this.init(); if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => { }); },
  now() { return this.ctx.currentTime; },
  setMusic(on) { this.musicOn = on; if (this.musBus) this.musBus.gain.setTargetAtTime(on ? 0.7 : 0, this.ctx.currentTime, 0.05); },
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
  land(h = 1) { this.osc('sine', 120, 45, 0.16, 0.26 * h); this.noise(0.1, 0.07 * h, 'lowpass', 900, 200, 1); },
  slide() { this.noise(0.34, 0.09, 'bandpass', 2600, 500, 1.2); this.osc('triangle', 220, 90, 0.25, 0.05); },
  lane(dir = 1) { this.noise(0.14, 0.09, 'bandpass', dir > 0 ? 700 : 1200, dir > 0 ? 1500 : 600, 1.5); },
  stumble() { this.osc('triangle', 180, 90, 0.18, 0.12); this.noise(0.14, 0.12, 'lowpass', 800, 150, 1); },
  crash() { this.noise(0.7, 0.34, 'lowpass', 2400, 120, 0.8); this.osc('triangle', 200, 40, 0.6, 0.3); this.osc('triangle', 120, 35, 0.4, 0.25); this.noise(0.2, 0.25, 'highpass', 3000, 5000, 1); this.osc('triangle', 520, 130, 0.5, 0.18, 0.12); },
  pill() { [0, 4, 7, 11, 14, 19].forEach((s, i) => { this.osc('triangle', mtof(72 + s), 0, 0.14, 0.1, i * 0.045); this.osc('triangle', mtof(84 + s), 0, 0.14, 0.12, i * 0.045); }); },
  turbo() { this.noise(1.1, 0.22, 'bandpass', 300, 5000, 0.9); this.osc('triangle', 90, 700, 1.0, 0.18); this.osc('triangle', 180, 1400, 0.9, 0.06); },
  shield() { [0, 7, 12].forEach((s, i) => this.osc('sine', mtof(64 + s), mtof(64 + s + 12), 0.5, 0.18, i * 0.06)); this.noise(0.4, 0.1, 'highpass', 4000, 7000, 1); },
  shieldBreak() { this.noise(0.5, 0.22, 'highpass', 6000, 1500, 0.8); this.osc('triangle', 700, 80, 0.4, 0.22); this.osc('sine', 1200, 300, 0.3, 0.18); },
  magnet() { for (let i = 0; i < 4; i++) this.osc('sine', 400 + i * 80, 900 + i * 80, 0.18, 0.1, i * 0.07); },
  cane() { this.osc('sine', 200, 900, 0.18, 0.2); this.osc('triangle', 300, 1200, 0.2, 0.1, 0.06); },
  coffee() { [0, 3, 7, 10, 12].forEach((s, i) => this.osc('triangle', mtof(65 + s), 0, 0.12, 0.14, i * 0.05)); this.noise(0.25, 0.06, 'bandpass', 3000, 6000, 1); },
  honk() { const f = 300 + Math.random() * 60; this.osc('triangle', f, f, 0.38, 0.1); this.osc('triangle', f * 1.26, f * 1.26, 0.38, 0.06); },
  click() { this.osc('triangle', 700, 900, 0.07, 0.16); },
  back() { this.osc('triangle', 600, 400, 0.08, 0.14); },
  buy() { [0, 5, 9, 12, 17].forEach((s, i) => this.osc('triangle', mtof(76 + s), 0, 0.11, 0.1, i * 0.055)); this.noise(0.15, 0.1, 'highpass', 6000, 8000, 1, 0.2); },
  error() { this.osc('triangle', 150, 110, 0.2, 0.14); this.osc('triangle', 140, 100, 0.22, 0.12, 0.12); },
  fanfare() { [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => { this.osc('triangle', mtof(67 + s), 0, 0.22, 0.1, i * 0.1); this.osc('triangle', mtof(79 + s), 0, 0.26, 0.12, i * 0.1); }); },
  mission() { [0, 4, 7, 12].forEach((s, i) => { this.osc('triangle', mtof(72 + s), 0, 0.3, 0.2, i * 0.09); this.osc('triangle', mtof(84 + s), 0, 0.2, 0.05, i * 0.09); }); },
  flip() { this.osc('sine', 500, 1600, 0.35, 0.16); this.osc('triangle', 800, 2400, 0.3, 0.08, 0.05); },
  boing() { this.osc('sine', 150, 600, 0.3, 0.3); this.osc('sine', 600, 150, 0.2, 0.2, 0.18); },
  district() { [0, 7, 12, 16].forEach((s, i) => { this.osc('triangle', mtof(60 + s), 0, 0.3, 0.08, i * 0.11); this.osc('triangle', mtof(48 + s), 0, 0.3, 0.1, i * 0.11); }); },
  boom() { this.noise(0.9, 0.12, 'lowpass', 600, 60, 0.8); this.osc('sine', 90, 30, 0.6, 0.2); },
  whoosh() { this.noise(0.5, 0.1, 'bandpass', 300, 3000, 0.8); },
  blip(p = 1, n = 6) { // voz de abuelo: bla-bla-bla
    if (!this.ok) return; const c = this.ctx; for (let i = 0; i < n; i++) { const t = i * 0.065; const f = (150 + Math.random() * 90) * p; const o = c.createOscillator(), g = c.createGain(), bp = c.createBiquadFilter(); o.type = 'triangle'; o.frequency.setValueAtTime(f, c.currentTime + t); o.frequency.linearRampToValueAtTime(f * (0.85 + Math.random() * 0.4), c.currentTime + t + 0.06); bp.type = 'bandpass'; bp.frequency.value = 500 + Math.random() * 900; bp.Q.value = 3;
      g.gain.setValueAtTime(0.0001, c.currentTime + t); g.gain.linearRampToValueAtTime(0.06, c.currentTime + t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t + 0.06); o.connect(bp); bp.connect(g); g.connect(this.sfxBus); o.start(c.currentTime + t); o.stop(c.currentTime + t + 0.08); }
  },
  /* ---------- motor del cohete ---------- */
  engineStart() {
    if (!this.ok || this.eng) return; const c = this.ctx; const o = c.createOscillator(), o2 = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(); o.type = 'triangle'; o2.type = 'sine'; o.frequency.value = 55; o2.frequency.value = 27.5; lp.type = 'lowpass'; lp.frequency.value = 260; g.gain.value = 0.0001;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 900; nf.Q.value = 0.6; const ng = c.createGain(); ng.gain.value = 0.0001; s.connect(nf); nf.connect(ng); ng.connect(this.sfxBus);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this.sfxBus); o.start(); o2.start(); s.start(); this.eng = { o, o2, lp, g, s, nf, ng };
  },
  engineSet(speed, turbo, vol = 1) { if (!this.eng) return; const t = this.ctx.currentTime, e = this.eng; e.o.frequency.setTargetAtTime(52 + speed * 1.7 + (turbo ? 28 : 0), t, 0.1); e.o2.frequency.setTargetAtTime((52 + speed * 1.7) / 2, t, 0.1); e.lp.frequency.setTargetAtTime(240 + speed * 8 + (turbo ? 500 : 0), t, 0.1); e.g.gain.setTargetAtTime(0.05 * vol, t, 0.1); e.nf.frequency.setTargetAtTime(700 + speed * 25 + (turbo ? 1500 : 0), t, 0.1); e.ng.gain.setTargetAtTime((0.01 + speed * 0.0004 + (turbo ? 0.035 : 0)) * vol, t, 0.1); },
  engineStop() { if (!this.eng) return; const e = this.eng, t = this.ctx.currentTime; e.g.gain.setTargetAtTime(0, t, 0.08); e.ng.gain.setTargetAtTime(0, t, 0.08); const x = e; setTimeout(() => { try { x.o.stop(); x.o2.stop(); x.s.stop(); } catch (_) { } }, 400); this.eng = null; },
  /* ---------- música: suave, tranquila y armoniosa (pads de seno/triángulo, graves suaves, notas sueltas con eco; sin percusión) ---------- */
  musicStart(style, menu = false) { if (!this.ok) return; this.menuMode = menu; this.style = style; this.nextT = this.ctx.currentTime + 0.15; this.step = 0; this.bar = 0; if (!this.playing) { this.playing = true; this.timer = setInterval(() => this.sched(), 40); } },
  musicStop() { this.playing = false; clearInterval(this.timer); this.timer = null; },
  setStyle(i) { this.style = i; },
  sched() {
    if (!this.playing || !this.ok) return; const c = this.ctx; const st = STY[this.style] || STY[0]; const sd = 60 / st.bpm / 4;
    while (this.nextT < c.currentTime + 0.2) { this.playStep(st, this.step, this.nextT); this.step++; if (this.step % 16 === 0) this.bar++; this.nextT += sd; }
  },
  playStep(st, step, t) {
    const s16 = step % 16, bi = Math.floor(step / 16), ch = st.prog[bi % st.prog.length], root = st.root + ch[0], notes = ch[1], menu = this.menuMode;
    const dt = Math.max(0, t - this.ctx.currentTime), sd = 60 / st.bpm / 4, barLen = sd * 16, dest = this.musIn || this.musBus;
    if (s16 === 0) { // pad: acorde con ataque lento
      notes.forEach((n, k) => { const f = mtof(root + n + 12); this.osc('sine', f, f, barLen * 1.25, 0.05, dt, dest, barLen * 0.28); this.osc('triangle', f * 1.003, f * 1.003, barLen * 1.2, 0.012, dt, dest, barLen * 0.32); });
      const fb = mtof(root - 12); this.osc('sine', fb, fb, barLen * 0.95, 0.17, dt, dest, 0.06); // bajo suave
    }
    if (s16 === 8 && !menu) { const fb = mtof(root + notes[2] - 12); this.osc('sine', fb, fb, barLen * 0.5, 0.09, dt, dest, 0.06); }
    // melodía: notas sueltas, pentatónica sobre el acorde (patrón fijo por barrio, sin sobresaltos)
    const mel = st.mel[(bi % st.mel.length)]; const mn = mel[s16]; if (mn !== undefined && mn !== null) { const f = mtof(root + notes[mn[0] % notes.length] + 12 * (1 + Math.floor(mn[0] / notes.length)) + (mn[1] || 0)); this.osc('sine', f, f, 1.5, menu ? 0.06 : 0.075, dt, dest, 0.03); this.osc('triangle', f * 2, f * 2, 0.5, 0.008, dt, dest, 0.03); }
    // arpegio de cuna muy suave al correr
    if (!menu && st.arp && s16 % 2 === 0) { const k = st.arp[(s16 / 2) % st.arp.length]; const f = mtof(root + notes[k % notes.length] + 12 * (2 + Math.floor(k / notes.length))); this.osc('sine', f, f, 0.8, 0.03, dt, dest, 0.012); }
  },
};
const rest = null;
/* acordes con séptima mayor / menor: sonido cálido y relajado */
const MAJ7 = [0, 4, 7, 11], MIN7 = [0, 3, 7, 10], DOM = [0, 4, 7, 10], ADD9 = [0, 4, 7, 14];
/* mel: por compás, { paso(0-15): [índice de nota del acorde, ajuste en semitonos] } */
const STY = [
  { // Barrio: paseo tranquilo
    bpm: 76, root: 48, prog: [[0, MAJ7], [9, MIN7], [5, MAJ7], [7, DOM]], arp: [0, 1, 2, 1],
    mel: [{ 0: [2], 6: [1], 10: [2], 12: [3] }, { 0: [1], 4: [2], 8: [3], 14: [2] }, { 2: [2], 8: [1], 12: [2] }, { 0: [3], 6: [2], 10: [1], 14: [0] }] },
  { // Mercado: alegre y suave
    bpm: 84, root: 50, prog: [[0, ADD9], [7, MAJ7], [9, MIN7], [5, MAJ7]], arp: [0, 2, 1, 2],
    mel: [{ 0: [2], 4: [3], 8: [2], 12: [1] }, { 0: [3], 6: [2], 8: [1], 12: [2] }, { 2: [1], 6: [2], 10: [3], 14: [2] }, { 0: [2], 8: [3], 12: [2] }] },
  { // Playa: brisa
    bpm: 80, root: 53, prog: [[0, MAJ7], [5, ADD9], [2, MIN7], [7, DOM]], arp: [0, 1, 2, 3],
    mel: [{ 0: [3], 4: [2], 10: [1], 12: [2] }, { 0: [2], 6: [3], 12: [2] }, { 2: [1], 8: [2], 12: [3] }, { 0: [2], 4: [1], 8: [0], 14: [1] }] },
  { // Polígono: serio pero sereno
    bpm: 72, root: 45, prog: [[0, MIN7], [8, MAJ7], [3, MAJ7], [10, DOM]], arp: [0, 2, 1, 2],
    mel: [{ 0: [2], 8: [3], 12: [2] }, { 4: [2], 8: [1], 14: [2] }, { 0: [3], 6: [2], 12: [1] }, { 2: [1], 8: [2], 12: [3] }] },
  { // Fiestas: ligero y luminoso
    bpm: 88, root: 55, prog: [[0, MAJ7], [7, DOM], [9, MIN7], [5, MAJ7]], arp: [0, 1, 2, 1],
    mel: [{ 0: [2], 4: [3], 6: [2], 12: [1] }, { 0: [3], 8: [2], 12: [1] }, { 2: [2], 6: [1], 10: [2], 14: [3] }, { 0: [2], 8: [1], 12: [0] }] },
  { // Noche: onírico
    bpm: 68, root: 52, prog: [[0, MIN7], [8, MAJ7], [5, MIN7], [7, DOM]], arp: [0, 1, 2, 3],
    mel: [{ 0: [3], 8: [2], 12: [1] }, { 2: [2], 10: [3] }, { 0: [1], 6: [2], 12: [3] }, { 4: [2], 8: [1], 14: [0] }] },
];
window.__A = A;
export default A;
