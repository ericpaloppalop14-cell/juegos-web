// WebAudio: música procedural alegre por copa + efectos
const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10] };
export const Audio = {
  ctx: null, master: null, mus: null, sfx: null, on: true, musicOn: true, engine: null, seqT: 0, step: 0, song: null, timer: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC(); this.master = this.ctx.createGain(); const cmp = this.ctx.createDynamicsCompressor(); cmp.threshold.value = -14; cmp.ratio.value = 4; this.master.connect(cmp); cmp.connect(this.ctx.destination);
    this.mus = this.ctx.createGain(); this.mus.gain.value = 0.32; this.mus.connect(this.master);
    this.sfx = this.ctx.createGain(); this.sfx.gain.value = 0.55; this.sfx.connect(this.master);
    this.apply();
    const n = this.ctx.sampleRate; const b = this.ctx.createBuffer(1, n, n); const d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; this.noise = b;
  },
  apply() { if (!this.master) return; this.master.gain.value = this.on ? 0.8 : 0; this.mus.gain.value = this.musicOn ? 0.26 : 0; },
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
  // ---------- music (v27: tema por pantalla, fundidos, timbres suaves) ----------
  THEMES: {
    title:   { bpm: 116, root: 60, scale: 'major', lead: 'bell', pad: true, seed: 3 },
    chars:   { bpm: 124, root: 65, scale: 'major', lead: 'pluck', seed: 11 },
    cups:    { bpm: 108, root: 62, scale: 'dorian', lead: 'bell', pad: true, seed: 23 },
    results: { bpm: 96, root: 67, scale: 'major', lead: 'pluck', pad: true, seed: 41, soft: true },
    podium:  { bpm: 132, root: 60, scale: 'major', lead: 'bell', seed: 57 },
    modes:   { bpm: 112, root: 57, scale: 'dorian', lead: 'pluck', seed: 71 },
    settings:{ bpm: 90, root: 64, scale: 'major', lead: 'bell', pad: true, seed: 83, soft: true },
  },
  curTheme: null,
  screen(id) { // llamada desde show()
    if (!id || id === 'race' || id === 'pause' || id === 'orient') return;
    const th = this.THEMES[id] || this.THEMES.title; if (this.curTheme === id && this.timer) return;
    this.curTheme = id; this.pendingTheme = id; if (!this.ctx || this.ctx.state !== 'running') return;
    this.playSong(th, th.seed);
  },
  unlock() { // primer toque: arranca el audio y la música de la pantalla actual
    this.init(); if (!this.ctx) return; const go = () => { if (this.pendingTheme && !this.timer) { const id = this.pendingTheme; this.curTheme = null; this.screen(id); } };
    if (this.ctx.state === 'running') go(); else this.ctx.resume().then(go).catch(() => {});
  },
  playSong(cfg, seed = 1) {
    if (!this.ctx) return;
    this.fadeOutSong(); const bus = this.ctx.createGain(); const t0 = this.ctx.currentTime; bus.gain.setValueAtTime(0.0001, t0); bus.gain.exponentialRampToValueAtTime(cfg.soft ? 0.7 : 1, t0 + 1.2); bus.connect(this.mus);
    let s = seed * 9301 + 49297; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const sc = SCALES[cfg.scale] || SCALES.major;
    const deg = d => cfg.root + sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
    const prog = [[0, 5, 3, 4], [0, 3, 4, 4], [5, 3, 0, 4], [0, 4, 5, 3]][Math.floor(r() * 4)];
    const mel = []; let cur = 4;
    for (let i = 0; i < 64; i++) { if (r() < 0.3) { mel.push(null); continue; } cur += [-2, -1, -1, 0, 1, 1, 2, 3][Math.floor(r() * 8)]; cur = Math.max(0, Math.min(11, cur)); mel.push(cur); }
    this.song = { race: !cfg.lead, cfg, deg, prog, mel, spb: 60 / cfg.bpm / 2, bus, lead: cfg.lead || (r() < 0.5 ? 'bell' : 'pluck'), pad: cfg.pad };
    this.step = 0; this.seqT = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.tick(), 50);
  },
  fadeOutSong() { if (this.timer) clearInterval(this.timer); this.timer = null; const S = this.song; if (S && S.bus && this.ctx) { const t = this.ctx.currentTime; try { S.bus.gain.cancelScheduledValues(t); S.bus.gain.setValueAtTime(S.bus.gain.value, t); S.bus.gain.linearRampToValueAtTime(0, t + 0.9); } catch (_) {} const b = S.bus; setTimeout(() => { try { b.disconnect(); } catch (_) {} }, 1500); } this.song = null; },
  stopSong() { this.fadeOutSong(); this.curTheme = null; },
  bell(f, t, dur, vol, dest) { this.tone(f, t, dur, 'sine', vol, dest); this.tone(f * 2.01, t, dur * 0.5, 'sine', vol * 0.35, dest); this.tone(f * 3.99, t, dur * 0.25, 'sine', vol * 0.12, dest); },
  tick() {
    const c = this.ctx, S = this.song; if (!S || !c) return;
    if (S.race) return this.tickRace();
    while (this.seqT < c.currentTime + 0.25) {
      const st = this.step, t = this.seqT, bar = Math.floor(st / 16) % 4, chord = S.prog[bar], d = S.bus;
      if (st % 4 === 0) this.tone(this.midi(S.deg(chord) - 24), t, S.spb * 1.8, 'triangle', 0.2, d);
      if (st % 4 === 2) this.tone(this.midi(S.deg(chord + 4) - 24), t, S.spb * 0.9, 'triangle', 0.1, d);
      if (S.pad && st % 16 === 0) [0, 2, 4].forEach(k => this.tone(this.midi(S.deg(chord + k) - 12), t, S.spb * 15, 'sine', 0.035, d));
      const arp = [0, 2, 4, 7][st % 4]; this.tone(this.midi(S.deg(chord + arp)), t, S.spb * 0.7, 'triangle', 0.022, d);
      const m = S.mel[st % 64]; if (m != null && st % 2 === 0) { const f = this.midi(S.deg(m + chord % 2) + 12); if (S.lead === 'bell') this.bell(f, t, S.spb * 2.2, 0.05, d); else this.tone(f, t, S.spb * 1.2, 'triangle', 0.06, d); }
      if (st % 32 === 30) this.bell(this.midi(S.deg(chord + 7) + 24), t, 0.6, 0.02, d);
      if (st % 8 === 0) this.tone(110, t, 0.12, 'sine', 0.28, d, 45);
      if (st % 8 === 4) this.hit(t, 0.1, 0.1, 2200, d);
      if (st % 2 === 1) this.hit(t, 0.025, 0.035, 8000, d);
      this.seqT += S.spb; this.step++;
    }
  },
  // ---------- v28: música de carrera ambiental (synthwave espacial) ----------
  intensity: 0, intT: 0,
  setIntensity(x) { this.intT = Math.max(0, Math.min(1, x)); },
  raceFx(S) { if (S.fx) return S.fx; const c = this.ctx; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.7; lp.connect(S.bus);
    const dl = c.createDelay(1.5); dl.delayTime.value = S.spb * 3; const fb = c.createGain(); fb.gain.value = 0.42; const df = c.createBiquadFilter(); df.type = 'lowpass'; df.frequency.value = 2200; const wet = c.createGain(); wet.gain.value = 0.5;
    dl.connect(df); df.connect(fb); fb.connect(dl); df.connect(wet); wet.connect(S.bus);
    return (S.fx = { lp, dl }); },
  padNote(f, t, dur, vol, dest) { const c = this.ctx; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.35); g.gain.setValueAtTime(vol, t + dur * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + dur * 1.05); g.connect(dest);
    for (const dt of [-7, 0, 7]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; o.connect(g); o.start(t); o.stop(t + dur * 1.1); } },
  tickRace() {
    const c = this.ctx, S = this.song, fx = this.raceFx(S);
    while (this.seqT < c.currentTime + 0.3) {
      const st = this.step, t = this.seqT, bar = Math.floor(st / 32) % 4, chord = S.prog[bar];
      this.intensity += (this.intT - this.intensity) * 0.06; const I = this.intensity;
      fx.lp.frequency.setTargetAtTime(700 + I * 1900 + Math.sin(st * 0.02) * 300, t, 0.8);
      if (st % 32 === 0) [0, 2, 4, 6].forEach(k => this.padNote(this.midi(S.deg(chord + k) - 12), t, S.spb * 34, 0.018, fx.lp));
      if (st % 32 === 0) this.padNote(this.midi(S.deg(chord) - 24), t, S.spb * 34, 0.03, fx.lp);
      // arpegio suave que evoluciona (patrón cambia cada 4 compases, con eco)
      const pat = [[0, 2, 4, 7, 4, 2], [0, 4, 7, 9, 7, 4], [2, 4, 6, 9, 11, 9], [0, 7, 4, 9, 2, 11]][Math.floor(st / 128) % 4];
      if (st % 2 === 0 || I > 0.55) { const n = this.midi(S.deg(chord + pat[(st >> (I > 0.55 ? 0 : 1)) % pat.length])); const o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = n; const v = 0.022 + I * 0.012; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + S.spb * 1.8); o.connect(g); g.connect(S.bus); g.connect(fx.dl); o.start(t); o.stop(t + S.spb * 2); }
      // pulso que crece con la intensidad
      if (st % 4 === 0 && I > 0.2) this.tone(58, t, 0.22, 'sine', 0.12 + I * 0.14, S.bus, 40);
      if (st % 2 === 1 && I > 0.35) this.tone(this.midi(S.deg(chord) - 24), t, S.spb * 0.8, 'triangle', 0.05 * I, fx.lp);
      if (st % 8 === 4 && I > 0.6) this.hit(t, 0.18, 0.04 * I, 1800, fx.lp);
      if (st % 2 === 1 && I > 0.75) this.hit(t, 0.02, 0.02, 9000, S.bus);
      if (st % 64 === 60) this.bell(this.midi(S.deg(chord + 9) + 12), t, 2.5, 0.012, fx.dl);
      this.seqT += S.spb; this.step++;
    }
  },
  // ---------- motor v28: zumbido de nave cálido y grave, filtrado, con chorus y shimmer ----------
  engineStart() {
    if (!this.ctx || this.engine) return; const c = this.ctx;
    const o = c.createOscillator(), o2 = c.createOscillator(), sub = c.createOscillator(), sh = c.createOscillator();
    o.type = 'sawtooth'; o2.type = 'sawtooth'; sub.type = 'sine'; sh.type = 'sine'; o2.detune.value = 12;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220; f.Q.value = 2.5;
    const g = c.createGain(); g.gain.value = 0; const sg = c.createGain(); sg.gain.value = 0;
    // chorus: retardo corto modulado
    const cd = c.createDelay(0.05); cd.delayTime.value = 0.018; const cl = c.createOscillator(), clg = c.createGain(); cl.frequency.value = 0.35; clg.gain.value = 0.004; cl.connect(clg); clg.connect(cd.delayTime); const cw = c.createGain(); cw.gain.value = 0.7;
    o.connect(f); o2.connect(f); sub.connect(f); f.connect(g); g.connect(this.sfx); g.connect(cd); cd.connect(cw); cw.connect(this.sfx);
    const shf = c.createBiquadFilter(); shf.type = 'bandpass'; shf.Q.value = 6; shf.frequency.value = 1200; sh.connect(shf); shf.connect(sg); sg.connect(cd); sg.connect(this.sfx);
    for (const x of [o, o2, sub, sh, cl]) x.start();
    this.engine = { o, o2, sub, sh, cl, f, g, sg, shf };
  },
  engineSet(sp, boost) { const e = this.engine; if (!e) return; const t = this.ctx.currentTime, v = Math.min(sp, 70);
    const base = 46 + v * 0.75 + (boost ? 10 : 0);
    e.o.frequency.setTargetAtTime(base, t, 0.25); e.o2.frequency.setTargetAtTime(base * 1.5, t, 0.25); e.sub.frequency.setTargetAtTime(base / 2, t, 0.25);
    e.sh.frequency.setTargetAtTime(base * 8, t, 0.3); e.shf.frequency.setTargetAtTime(base * 8, t, 0.3);
    e.f.frequency.setTargetAtTime(180 + v * 9 + (boost ? 500 : 0), t, 0.3);
    e.g.gain.setTargetAtTime(sp > 1 ? 0.035 + v * 0.0005 : 0.018, t, 0.3);
    e.sg.gain.setTargetAtTime(boost ? 0.012 : 0.003 + v * 0.00006, t, 0.3);
  },
  engineStop() { const e = this.engine; if (!e) return; e.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1); e.sg.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1); setTimeout(() => { for (const x of [e.o, e.o2, e.sub, e.sh, e.cl]) try { x.stop(); } catch (_) {} }, 500); this.engine = null; },
  driftT: 0,
  driftTick(lvl) { const c = this.ctx; if (!c || !this.on || c.currentTime < this.driftT) return; const t = c.currentTime; this.hit(t, 0.12, 0.012 + lvl * 0.004, [2500, 3200, 4000, 5000][lvl] || 2500); this.driftT = t + 0.1; },
  uiSound(key) { // un sonido distinto para cada botón (por su id o texto)
    let h = 0; for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const c = this.ctx; if (!c || !this.on) return; const t = c.currentTime, P = [0, 2, 4, 7, 9, 12, 14, 16];
    const n1 = 72 + P[h % 8], n2 = 72 + P[(h >> 3) % 8], kind = (h >> 6) % 5;
    if (kind === 0) { this.bell(this.midi(n1), t, 0.25, 0.08); this.bell(this.midi(n2), t + 0.06, 0.3, 0.06); }
    else if (kind === 1) this.tone(this.midi(n1 - 12), t, 0.18, 'triangle', 0.12, null, this.midi(n2));
    else if (kind === 2) { this.tone(this.midi(n1), t, 0.07, 'sine', 0.12); this.tone(this.midi(n2 + 5), t + 0.05, 0.12, 'sine', 0.1); }
    else if (kind === 3) { this.tone(260 + (h % 7) * 30, t, 0.16, 'sine', 0.16, null, 90); this.tone(this.midi(n1), t + 0.03, 0.12, 'triangle', 0.06); }
    else [0, 4, 7].forEach((s, i) => this.tone(this.midi(n1 + s), t + i * 0.035, 0.1, 'triangle', 0.06));
  },
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
      case 'boing': T(180, t, 0.3, 'sine', 0.14, null, 520); T(520, t + 0.12, 0.18, 'sine', 0.06, null, 300); break;
      case 'buf': this.hit(t, 0.12, 0.08, 600); T(150, t, 0.14, 'sine', 0.18, null, 70); break;
      case 'whoosh': { const s = this.ctx.createBufferSource(); s.buffer = this.noise; const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(400 * k, t); f.frequency.exponentialRampToValueAtTime(2400 * k, t + 0.35); const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07, t + 0.15); g.gain.linearRampToValueAtTime(0, t + 0.4); s.connect(f); f.connect(g); g.connect(this.sfx); s.start(t, Math.random() * 0.4); s.stop(t + 0.45); break; }
      case 'passup': this.sfxPlay('whoosh', 1.3); [0, 4, 7].forEach((s, i) => this.bell(this.midi(79 + s), t + 0.1 + i * 0.05, 0.25, 0.04)); break;
      case 'passdown': this.sfxPlay('whoosh', 0.7); T(500, t + 0.05, 0.25, 'triangle', 0.05, null, 300); break;
      case 'crowd': this.hit(t, 0.6, 0.035, 1500); for (let i = 0; i < 3; i++) T(800 + Math.random() * 600, t + i * 0.08, 0.1, 'sine', 0.02, null, 1200); break;
      case 'swoosh': this.sfxPlay('whoosh', 1); T(700, t, 0.2, 'sine', 0.05, null, 1400); break;
      case 'select': this.bell(this.midi(76 + (k | 0) % 12), t, 0.35, 0.07); break;
      case 'cannon': this.hit(t, 0.5, 0.25, 700); T(120, t, 0.4, 'sine', 0.3, null, 40); break;
      case 'cluck': [0, 0.12, 0.22].forEach(d => T(700 + Math.random() * 200, t + d, 0.06, 'square', 0.04, null, 450)); break;
      case 'cuac': T(500, t, 0.18, 'sawtooth', 0.04, null, 350); T(480, t + 0.2, 0.15, 'sawtooth', 0.035, null, 340); break;
      case 'disco': [0, 4, 7, 11, 12].forEach((s, i) => this.bell(this.midi(72 + s), t + i * 0.07, 0.3, 0.05)); this.hit(t, 0.1, 0.06, 6000); break;
      case 'hat': T(400, t, 0.3, 'sine', 0.1, null, 1200); for (let i = 0; i < 4; i++) T(1500 + i * 300, t + 0.2 + i * 0.05, 0.1, 'sine', 0.04); break;
      case 'juggle': for (let i = 0; i < 3; i++) T(600 + i * 200, t + i * 0.1, 0.1, 'sine', 0.07, null, 900 + i * 200); break;
      case 'popcorn': for (let i = 0; i < 7; i++) this.hit(t + Math.random() * 0.4, 0.03, 0.08, 2500); break;
      case 'puppet': [0, 3, 7, 10].forEach((s, i) => this.bell(this.midi(67 + s), t + i * 0.06, 0.3, 0.05)); break;

      case 'dig': this.hit(t, 0.35, 0.18, 500); T(110, t, 0.35, 'triangle', 0.18, null, 70); break;
      case 'boom': this.hit(t, 0.6, 0.3, 900); T(90, t, 0.5, 'sine', 0.35, null, 35); T(700, t + 0.02, 0.2, 'triangle', 0.12, null, 1400); break;
      case 'splash': this.hit(t, 0.4, 0.16, 2600); T(500, t, 0.18, 'sine', 0.1, null, 200); break;
      case 'stall': T(120, t, 0.5, 'sawtooth', 0.15, null, 60); break;
    }
  },
};
