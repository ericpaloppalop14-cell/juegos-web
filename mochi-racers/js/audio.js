// WebAudio: música procedural alegre por copa + efectos
const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10] };
export const Audio = {
  ctx: null, master: null, mus: null, sfx: null, on: true, musicOn: true, engine: null, seqT: 0, step: 0, song: null, timer: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    this.mus = this.ctx.createGain(); this.mus.gain.value = 0.32; this.mus.connect(this.master);
    this.sfx = this.ctx.createGain(); this.sfx.gain.value = 0.7; this.sfx.connect(this.master);
    this.apply();
    const n = this.ctx.sampleRate; const b = this.ctx.createBuffer(1, n, n); const d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; this.noise = b;
  },
  apply() { if (!this.master) return; this.master.gain.value = this.on ? 0.9 : 0; this.mus.gain.value = this.musicOn ? 0.32 : 0; },
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
  // ---------- engine ----------
  engineStart() {
    if (!this.ctx || this.engine) return; const c = this.ctx;
    const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 600; g.gain.value = 0.0;
    o.connect(f); o2.connect(f); f.connect(g); g.connect(this.sfx); o.start(); o2.start();
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const ns = c.createBufferSource(); ns.buffer = nb; ns.loop = true; const wf = c.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 500; wf.Q.value = 0.7; const wg = c.createGain(); wg.gain.value = 0;
    ns.connect(wf); wf.connect(wg); wg.connect(this.sfx); ns.start(); this.engine = { o, o2, g, f, ns, wf, wg };
  },
  engineSet(sp, boost) { const e = this.engine; if (!e) return; const t = this.ctx.currentTime; const f = 60 + sp * 3.0 + (boost ? 45 : 0);
    e.o.frequency.setTargetAtTime(f, t, 0.08); e.o2.frequency.setTargetAtTime(f * 1.005 + 2, t, 0.08); e.f.frequency.setTargetAtTime(400 + sp * 25, t, 0.1); e.g.gain.setTargetAtTime(0.06 + Math.min(sp, 60) * 0.0016 + (boost ? 0.03 : 0), t, 0.1); e.wf.frequency.setTargetAtTime(350 + sp * 32 + (boost ? 900 : 0), t, 0.15); e.wg.gain.setTargetAtTime(Math.max(0, sp - 18) * 0.0028 + (boost ? 0.07 : 0), t, 0.15); },
  engineStop() { const e = this.engine; if (!e) return; e.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05); e.wg.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05); setTimeout(() => { try { e.o.stop(); e.o2.stop(); e.ns.stop(); } catch (_) {} }, 300); this.engine = null; },
  // ---------- sfx ----------
  sfxPlay(name, k = 1) {
    const c = this.ctx; if (!c || !this.on) return; const t = c.currentTime;
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
      case 'victory': [[0, 0], [4, 0.12], [7, 0.24], [12, 0.36], [7, 0.6], [12, 0.72], [16, 0.84], [19, 0.96]].forEach(([n, d]) => { T(this.midi(72 + n), t + d, 0.32, 'square', 0.09); T(this.midi(60 + n), t + d, 0.32, 'triangle', 0.12); }); [0, 4, 7, 12].forEach(n => T(this.midi(72 + n), t + 1.15, 1.1, 'triangle', 0.08)); this.hit(t + 1.15, 0.4, 0.12, 2500); break;
      case 'level': T(523 * k, t, 0.09, 'square', 0.11); T(784 * k, t + 0.06, 0.14, 'triangle', 0.12); break;
      case 'kick': this.hit(t, 0.25, 0.25, 3000); T(140, t, 0.25, 'sine', 0.3, null, 50); break;
      case 'firework': T(300 + Math.random() * 300, t, 0.5, 'sine', 0.05, null, 1500); this.hit(t + 0.45, 0.5, 0.2, 2500); for (let i = 0; i < 5; i++) T(2000 + Math.random() * 2500, t + 0.5 + i * 0.05, 0.08, 'sine', 0.04); break;
      case 'cheer': this.hit(t, 0.7, 0.08, 1800); for (let i = 0; i < 4; i++) T(700 + Math.random() * 500, t + i * 0.06, 0.12, 'triangle', 0.05, null, 1100); break;
      case 'click': T(1000, t, 0.05, 'triangle', 0.1); break;
      case 'dig': this.hit(t, 0.35, 0.18, 500); T(110, t, 0.35, 'triangle', 0.18, null, 70); break;
      case 'boom': this.hit(t, 0.6, 0.3, 900); T(90, t, 0.5, 'sine', 0.35, null, 35); T(700, t + 0.02, 0.2, 'triangle', 0.12, null, 1400); break;
      case 'splash': this.hit(t, 0.4, 0.16, 2600); T(500, t, 0.18, 'sine', 0.1, null, 200); break;
      case 'stall': T(120, t, 0.5, 'sawtooth', 0.15, null, 60); break;
    }
  },
};
