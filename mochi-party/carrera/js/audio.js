// WebAudio: música procedural alegre por copa + efectos
const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10] };
export const Audio = {
  ctx: null, master: null, mus: null, sfx: null, on: true, musicOn: true, vol: { mus: 0.8, sfx: 0.7, eng: 0.35 }, eng: null, duckT: 0, engine: null, seqT: 0, step: 0, song: null, timer: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    this.mus = this.ctx.createGain(); this.mus.gain.value = 0.32; this.mus.connect(this.master);
    this.sfx = this.ctx.createGain(); this.sfx.gain.value = 0.7; this.sfx.connect(this.master);
    this.eng = this.ctx.createGain(); this.eng.connect(this.master); this.engDuck = this.ctx.createGain(); this.engDuck.connect(this.eng);
    this.apply();
    const n = this.ctx.sampleRate; const b = this.ctx.createBuffer(1, n, n); const d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; this.noise = b;
  },
  // v5: mezcla con la música por delante: música ×0.56 (antes 0.32), efectos ×0.5, motor ×0.07 y sinusoidal (≈ −20 dB respecto a v4)
  apply() { if (!this.master) return; const v = this.vol; this.master.gain.value = this.on ? 0.9 : 0; this.mus.gain.value = this.musicOn ? 0.7 * v.mus : 0; this.sfx.gain.value = 0.72 * v.sfx; this.eng.gain.value = 0.2 * v.eng; },
  duck(d = 0.45) { if (!this.engDuck) return; const t = this.ctx.currentTime, g = this.engDuck.gain; g.cancelScheduledValues(t); g.setTargetAtTime(0.35, t, 0.02); g.setTargetAtTime(1, t + d, 0.25); },
  tone(f, t0, dur, type = 'square', vol = 0.15, dest, slide) {
    const c = this.ctx; if (!c) return; const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || this.sfx); o.start(t0); o.stop(t0 + dur + 0.05);
  },
  hit(t0, dur, vol, hp = 3000, dest) {
    const c = this.ctx; if (!c) return; const s = c.createBufferSource(); s.buffer = this.noise; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); s.connect(f); f.connect(g); g.connect(dest || this.sfx); s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.02);
  },
  midi: m => 440 * Math.pow(2, (m - 69) / 12),
  // ---------- music ----------
  playSong(cfg, seed = 1) {
    this.stopSong(); if (!this.ctx) return;
    let s = seed * 9301 + 49297; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const sc = SCALES[cfg.scale] || SCALES.major;
    const deg = d => cfg.root + sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
    const prog = [[0, 5, 3, 4], [0, 3, 4, 4], [5, 3, 0, 4]][Math.floor(r() * 3)];
    const mel = []; let cur = 4;
    for (let i = 0; i < 64; i++) { if (r() < 0.25) { mel.push(null); continue; } cur += [-2, -1, -1, 0, 1, 1, 2, 3][Math.floor(r() * 8)]; cur = Math.max(0, Math.min(11, cur)); mel.push(cur); }
    this.song = { cfg, deg, prog, mel, spb: 60 / cfg.bpm / 2 };
    this.step = 0; this.seqT = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.tick(), 50);
  },
  stopSong() { if (this.timer) clearInterval(this.timer); this.timer = null; },
  tick() {
    const c = this.ctx, S = this.song; if (!S || !c) return;
    while (this.seqT < c.currentTime + 0.25) {
      const st = this.step, t = this.seqT, bar = Math.floor(st / 16) % 4, chord = S.prog[bar], d = this.mus;
      if (st % 4 === 0) this.tone(this.midi(S.deg(chord) - 24), t, S.spb * 1.8, 'triangle', 0.22, d);
      if (st % 4 === 2) this.tone(this.midi(S.deg(chord + 4) - 24), t, S.spb * 0.9, 'triangle', 0.12, d);
      const arp = [0, 2, 4, 7][st % 4]; this.tone(this.midi(S.deg(chord + arp) - 12), t, S.spb * 0.8, 'square', 0.025, d);
      const m = S.mel[st % 64]; if (m != null && st % 2 === 0) this.tone(this.midi(S.deg(m + chord % 2)), t, S.spb * 1.6, 'square', 0.05, d);
      if (st % 8 === 0) { this.tone(110, t, 0.12, 'sine', 0.35, d, 45); }
      if (st % 8 === 4) this.hit(t, 0.12, 0.18, 1500, d);
      if (st % 2 === 1) this.hit(t, 0.03, 0.06, 7000, d);
      this.seqT += S.spb; this.step++;
    }
  },
  // ---------- motor de fantasía (v5): zumbido suave + burbujitas ----------
  engineStart() {
    if (!this.ctx || this.engine) return; const c = this.ctx;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.5; const out = c.createGain(); out.gain.value = 0; lp.connect(out); out.connect(this.engDuck);
    const o = c.createOscillator(), o2 = c.createOscillator(), g2 = c.createGain(); o.type = 'sine'; o2.type = 'triangle'; g2.gain.value = 0.35; o.connect(lp); o2.connect(g2); g2.connect(lp);
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 5.5; lg.gain.value = 1.5; lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
    const bub = c.createBiquadFilter(); bub.type = 'lowpass'; bub.frequency.value = 1400; const bg = c.createGain(); bg.gain.value = 1; bub.connect(bg); bg.connect(this.engDuck);
    const ns = c.createBufferSource(); ns.buffer = this.noise; ns.loop = true; const wf = c.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 500; wf.Q.value = 0.6; const wg = c.createGain(); wg.gain.value = 0; ns.connect(wf); wf.connect(wg); wg.connect(this.engDuck);
    o.start(); o2.start(); lfo.start(); ns.start(); this.engine = { o, o2, lfo, out, bub, ns, wf, wg, acc: 0, last: c.currentTime };
  },
  engineSet(sp, boost) { const e = this.engine; if (!e) return; const c = this.ctx, t = c.currentTime, dt = Math.min(0.1, t - e.last); e.last = t;
    const k = Math.min(1, Math.max(0, sp) / 60), semi = k * 9 + (boost ? 3 : 0), f = 82.4 * Math.pow(2, semi / 12); // mi grave → do#, rango estrecho
    e.o.frequency.setTargetAtTime(f, t, 0.12); e.o2.frequency.setTargetAtTime(f * 2, t, 0.12); e.out.gain.setTargetAtTime(0.10 + k * 0.08, t, 0.15);
    e.wf.frequency.setTargetAtTime(400 + k * 300, t, 0.2); e.wg.gain.setTargetAtTime(boost ? 0.05 : 0, t, 0.15);
    e.acc += dt * (1.5 + k * 9 + (boost ? 8 : 0)); // burbujas por segundo
    while (e.acc >= 1) { e.acc -= 1; const t0 = t + Math.random() * 0.05, f0 = 220 + Math.random() * 160 + k * 120, o = c.createOscillator(), g = c.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f0 * (1.8 + Math.random() * 0.6), t0 + 0.07);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.07 + Math.random() * 0.03, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
      o.connect(g); g.connect(e.bub); o.start(t0); o.stop(t0 + 0.12); }
  },
  engineStop() { const e = this.engine; if (!e) return; e.out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05); e.wg.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05); setTimeout(() => { try { e.o.stop(); e.o2.stop(); e.lfo.stop(); e.ns.stop(); } catch (_) {} }, 300); this.engine = null; },
  // ---------- sfx ----------
  sfxPlay(name, k = 1) {
    const c = this.ctx; if (!c || !this.on) return; const t = c.currentTime; if (name !== 'roll' && name !== 'click') this.duck(name === 'boost' || name === 'finish' || name === 'lap' ? 0.7 : 0.4);
    const T = (...a) => this.tone(...a);
    switch (name) {
      case 'beep': T(660, t, 0.18, 'square', 0.12); break;
      case 'go': T(990, t, 0.4, 'square', 0.14); T(1320, t + 0.05, 0.4, 'square', 0.08); break;
      case 'box': [0, 1, 2].forEach(i => T(880 + i * 220, t + i * 0.04, 0.1, 'triangle', 0.12)); break;
      case 'roll': T(1200 + Math.random() * 600, t, 0.04, 'square', 0.04); break;
      case 'got': T(784, t, 0.1, 'square', 0.1); T(1175, t + 0.08, 0.18, 'square', 0.1); break;
      case 'boost': T(220, t, 0.5, 'sawtooth', 0.12, null, 880); this.hit(t, 0.4, 0.15, 2000); break;
      case 'mini': T(440 * k, t, 0.25, 'square', 0.1, null, 880 * k); break;
      case 'drift': this.hit(t, 0.08, 0.05, 4000); break;
      case 'jump': T(300, t, 0.25, 'triangle', 0.15, null, 700); break;
      case 'trick': T(880, t, 0.08, 'square', 0.1); T(1320, t + 0.07, 0.15, 'square', 0.1); break;
      case 'land': T(140, t, 0.12, 'sine', 0.25, null, 60); break;
      case 'hit': T(400, t, 0.4, 'sawtooth', 0.15, null, 90); this.hit(t, 0.2, 0.2, 800); break;
      case 'squash': T(200, t, 0.35, 'square', 0.18, null, 50); T(600, t + 0.05, 0.15, 'triangle', 0.15, null, 1200); break;
      case 'grow': for (let i = 0; i < 6; i++) T(262 * Math.pow(1.26, i), t + i * 0.07, 0.12, 'square', 0.1); break;
      case 'shrink': for (let i = 0; i < 5; i++) T(800 / Math.pow(1.26, i), t + i * 0.06, 0.1, 'square', 0.08); break;
      case 'throw': T(600, t, 0.15, 'triangle', 0.12, null, 300); break;
      case 'missile': T(500, t, 0.6, 'sawtooth', 0.06, null, 1400); break;
      case 'shield': T(520, t, 0.3, 'sine', 0.15, null, 1040); break;
      case 'pop': T(900, t, 0.08, 'sine', 0.2, null, 300); break;
      case 'magnet': T(180, t, 0.6, 'sine', 0.15, null, 360); break;
      case 'stars': for (let i = 0; i < 6; i++) T(1500 + Math.random() * 1500, t + i * 0.05, 0.1, 'sine', 0.06); break;
      case 'bump': T(160, t, 0.1, 'square', 0.12, null, 90); break;
      case 'lap': [0, 4, 7, 12].forEach((s, i) => T(this.midi(72 + s), t + i * 0.08, 0.16, 'square', 0.1)); break;
      case 'thunder': this.hit(t, 0.9, 0.35, 120); T(60, t, 0.8, 'sawtooth', 0.15, null, 30); break;
      case 'finish': [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => T(this.midi(67 + s), t + i * 0.09, 0.3, 'square', 0.09)); break;
      case 'fanfare': [[0, 0], [4, 0.15], [7, 0.3], [12, 0.45], [7, 0.75], [12, 0.9]].forEach(([s, d]) => { T(this.midi(72 + s), t + d, 0.35, 'square', 0.1); T(this.midi(60 + s), t + d, 0.35, 'triangle', 0.12); }); break;
      case 'level': T(523 * k, t, 0.09, 'square', 0.11); T(784 * k, t + 0.06, 0.14, 'triangle', 0.12); break;
      case 'kick': this.hit(t, 0.25, 0.25, 3000); T(140, t, 0.25, 'sine', 0.3, null, 50); break;
      case 'firework': T(300 + Math.random() * 300, t, 0.5, 'sine', 0.05, null, 1500); this.hit(t + 0.45, 0.5, 0.2, 2500); for (let i = 0; i < 5; i++) T(2000 + Math.random() * 2500, t + 0.5 + i * 0.05, 0.08, 'sine', 0.04); break;
      case 'cheer': this.hit(t, 0.7, 0.08, 1800); for (let i = 0; i < 4; i++) T(700 + Math.random() * 500, t + i * 0.06, 0.12, 'triangle', 0.05, null, 1100); break;
      case 'boing': T(180 * k, t, 0.35, 'sine', 0.28, null, 520 * k); T(360 * k, t + 0.05, 0.3, 'triangle', 0.12, null, 900 * k); break;
      case 'tick': T(1800, t, 0.03, 'square', 0.04); break;
      case 'join': [0, 7, 12].forEach((s, i) => T(this.midi(76 + s), t + i * 0.07, 0.12, 'triangle', 0.12)); break;
      case 'click': T(1000, t, 0.05, 'triangle', 0.1); break;
      case 'stall': T(120, t, 0.5, 'sawtooth', 0.15, null, 60); break;
    }
  },
};
