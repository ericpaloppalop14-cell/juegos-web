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
    this.setupFx();
  },
  // v30: cadena brillante: sin subgraves (paso alto 2x), brillo arriba y reverb por convolución
  setupFx() { const c = this.ctx; if (this.musIn) return;
    const mk = (type, f, q, g) => { const b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; if (g != null) b.gain.value = g; return b; };
    const h1 = mk('highpass', 150, 0.7), h2 = mk('highpass', 150, 0.7), sh = mk('highshelf', 3500, null, 4), lo = mk('peaking', 300, 1, -3);
    h1.connect(h2); h2.connect(lo); lo.connect(sh); sh.connect(this.mus); this.musIn = h1;
    const sr = c.sampleRate, len = Math.floor(sr * 2.2), ir = c.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    const conv = c.createConvolver(); conv.buffer = ir; const rh = mk('highpass', 400, 0.7); const rg = c.createGain(); rg.gain.value = 0.55; conv.connect(rh); rh.connect(rg); rg.connect(h1); this.rev = conv;
    const echo = c.createDelay(1.5); echo.delayTime.value = 0.3; const efb = c.createGain(); efb.gain.value = 0.33; const ef = mk('bandpass', 2500, 0.6); const eg = c.createGain(); eg.gain.value = 0.4; echo.connect(ef); ef.connect(efb); efb.connect(echo); ef.connect(eg); eg.connect(h1); eg.connect(conv); this.echo = echo;
    const s1 = mk('highpass', 140, 0.7), s2 = mk('highpass', 140, 0.7); s1.connect(s2); s2.connect(this.sfx); this.sfx = s1;
  },
  apply() { if (!this.master) return; this.master.gain.value = this.on ? 0.8 : 0; this.mus.gain.value = this.musicOn ? 0.6 : 0; },
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
    this.fadeOutSong(); const bus = this.ctx.createGain(); const t0 = this.ctx.currentTime; bus.gain.setValueAtTime(0.0001, t0); bus.gain.exponentialRampToValueAtTime(cfg.soft ? 0.7 : 1, t0 + 1.2); bus.connect(this.musIn || this.mus);
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
  stopSong() { this.fadeOutSong(); this.curTheme = null; this.finalLap = false; },
  bell(f, t, dur, vol, dest) { this.tone(f, t, dur, 'sine', vol, dest); this.tone(f * 2.01, t, dur * 0.5, 'sine', vol * 0.35, dest); this.tone(f * 3.99, t, dur * 0.25, 'sine', vol * 0.12, dest); },
  tick() {
    const c = this.ctx, S = this.song; if (!S || !c) return;
    if (S.race) return this.tickRace();
    while (this.seqT < c.currentTime + 0.25) {
      const st = this.step, t = this.seqT, bar = Math.floor(st / 16) % 4, chord = S.prog[bar], d = S.bus;
      if (st % 4 === 0) this.tone(this.midi(S.deg(chord)), t, S.spb * 1.8, 'triangle', 0.1, d);
      if (st % 4 === 2) this.tone(this.midi(S.deg(chord + 4)), t, S.spb * 0.9, 'triangle', 0.06, d);
      if (S.pad && st % 16 === 0) [0, 2, 4].forEach(k => this.tone(this.midi(S.deg(chord + k)), t, S.spb * 15, 'sine', 0.035, d));
      const arp = [0, 2, 4, 7][st % 4]; this.tone(this.midi(S.deg(chord + arp)), t, S.spb * 0.7, 'triangle', 0.022, d);
      const m = S.mel[st % 64]; if (m != null && st % 2 === 0) { const f = this.midi(S.deg(m + chord % 2) + 12); if (S.lead === 'bell') this.bell(f, t, S.spb * 2.2, 0.05, d); else this.tone(f, t, S.spb * 1.2, 'triangle', 0.06, d); }
      if (st % 32 === 30) this.bell(this.midi(S.deg(chord + 7) + 24), t, 0.6, 0.02, d);
      if (st % 8 === 0) this.tone(330, t, 0.05, 'sine', 0.1, d, 220); this.hit(t, 0.012, 0.03, 3000, d);
      if (st % 8 === 4) this.hit(t, 0.1, 0.1, 2200, d);
      if (st % 2 === 1) this.hit(t, 0.025, 0.035, 8000, d);
      this.seqT += S.spb; this.step++;
    }
  },
  // ---------- v30: música de carrera brillante y pegadiza (original), síntesis cuidada ----------
  intensity: 0, intT: 0, finalLap: false, engineOn: false,
  setIntensity(x) { this.intT = Math.max(0, Math.min(1, x)); },
  adsr(g, t, a, d, s, r, dur, pk) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(pk, t + a); g.gain.setTargetAtTime(pk * s, t + a, d / 3); g.gain.setValueAtTime(pk * s, t + Math.max(a, dur)); g.gain.setTargetAtTime(0.0001, t + Math.max(a, dur), r / 3); },
  out(g, S, rev = 0, echo = 0) { g.connect(S.bus); if (rev) { const x = this.ctx.createGain(); x.gain.value = rev; g.connect(x); x.connect(this.rev || S.bus); } if (echo) { const x = this.ctx.createGain(); x.gain.value = echo; g.connect(x); x.connect(this.echo || S.bus); } },
  osc(type, f, t, end, det = 0) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; o.start(t); o.stop(end); return o; },
  iBell(f, t, dur, vol, S) { const c = this.ctx, end = t + dur + 1.2; const car = this.osc('sine', f, t, end), mod = this.osc('sine', f * 3.5, t, end), mg = c.createGain(); mg.gain.setValueAtTime(f * 1.6, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.6); mod.connect(mg); mg.connect(car.frequency);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.setTargetAtTime(vol * 0.35, t + 0.01, 0.12); g.gain.setTargetAtTime(0.0001, t + dur, 0.18); car.connect(g); this.out(g, S, 0.35, 0.18); },
  iBrass(f, t, dur, vol, S) { const c = this.ctx, end = t + dur + 0.4; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2; lp.frequency.setValueAtTime(900, t); lp.frequency.linearRampToValueAtTime(4200, t + 0.05); lp.frequency.setTargetAtTime(2200, t + 0.06, 0.15);
    const vib = this.osc('sine', 5.8, t, end), vg = c.createGain(); vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.01, t + 0.25); vib.connect(vg);
    for (const det of [-9, 9]) { const o = this.osc('sawtooth', f, t, end, det); vg.connect(o.frequency); o.connect(lp); }
    const g = c.createGain(); this.adsr(g, t, 0.025, 0.12, 0.7, 0.09, dur, vol); lp.connect(g); this.out(g, S, 0.25, 0.1); },
  iGlock(f, t, vol, S) { const c = this.ctx; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    [[1, 1], [2.76, 0.4], [5.4, 0.15]].forEach(([m, a]) => { const o = this.osc('sine', f * m, t, t + 0.75), og = c.createGain(); og.gain.value = a; o.connect(og); og.connect(g); }); this.out(g, S, 0.4, 0.25); },
  iStab(fs, t, dur, vol, S) { const c = this.ctx, end = t + dur + 0.3; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(5000, t); lp.frequency.setTargetAtTime(1800, t, 0.08); const g = c.createGain(); this.adsr(g, t, 0.004, 0.1, 0.35, 0.08, dur, vol);
    for (const f of fs) for (const det of [-7, 7]) this.osc('sawtooth', f, t, end, det).connect(lp); lp.connect(g); this.out(g, S, 0.2, 0); },
  iPad(fs, t, dur, vol, S) { const c = this.ctx, end = t + dur + 1; const g = c.createGain(); this.adsr(g, t, 0.4, 0.5, 0.8, 0.6, dur, vol); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2800;
    for (const f of fs) for (const det of [-12, 0, 12]) this.osc('triangle', f, t, end, det).connect(lp); lp.connect(g); this.out(g, S, 0.6, 0.1); },
  iBass(f, t, dur, vol, S) { const c = this.ctx, end = t + dur + 0.2; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 4; lp.frequency.setValueAtTime(2600, t); lp.frequency.setTargetAtTime(700, t, 0.05);
    this.osc('square', f, t, end).connect(lp); this.osc('triangle', f * 2, t, end).connect(lp); const g = c.createGain(); this.adsr(g, t, 0.004, 0.08, 0.5, 0.05, dur, vol); lp.connect(g); this.out(g, S); },
  iNoise(t, dur, vol, type, f, q, S, rev = 0) { const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise; const b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(b); b.connect(g); this.out(g, S, rev); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02); },
  SONG: { // melodía original en grados de la escala mayor (corcheas, '-' = mantener, null = silencio)
    A: [4, '-', 4, 5, 4, '-', 2, '-', 1, '-', 4, 6, '-', 8, '-', '-', 7, '-', 7, 9, 7, '-', 5, '-', 5, '-', 3, 5, 6, '-', 7, '-'],
    A2: [4, '-', 4, 5, 4, '-', 2, '-', 1, '-', 4, 6, '-', 8, '-', '-', 7, '-', 7, 9, 7, '-', 5, '-', 7, '-', 6, 5, 3, '-', 4, '-'],
    B: [7, '-', '-', 5, 7, '-', 8, '-', 8, '-', 6, '-', 4, '-', null, null, 6, '-', '-', 4, 6, '-', 9, '-', 9, '-', 8, 7, 5, '-', null, null],
    B2: [7, '-', '-', 5, 7, '-', 8, '-', 8, '-', 6, '-', 4, '-', 6, 8, 9, '-', 8, '-', 7, '-', 6, '-', 8, '-', 7, '-', 6, '-', 4, '-'],
    ch: { I: [0, 0], A: [0, 4, 5, 3], A2: [0, 4, 5, 3], B: [3, 4, 2, 5], B2: [3, 4, 2, 4], C: [5, 3, 0, 4] },
    order: ['A', 'A2', 'B', 'B2', 'C'],
  },
  tickRace() {
    const c = this.ctx, S = this.song, M = this.SONG, now = c.currentTime;
    if (!S.init) { S.init = true; S.rt = 60 + (((S.cfg.root - 60) % 6) + 6) % 6; S.bpm = 146 + (S.cfg.bpm % 3) * 4; S.tr = 0; }
    const sc = SCALES.major, deg = d => S.rt + S.tr + sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7), mf = n => this.midi(n);
    while (this.seqT < now + 0.25) {
      const fl = this.finalLap, spb = 60 / (S.bpm * (fl ? 1.1 : 1)) / 4, st = this.step, pos = st % 16, bar = Math.floor(st / 16);
      if (pos === 0) S.tr = fl ? 2 : 0;
      const sec = bar < 2 ? 'I' : M.order[Math.floor(((bar - 2) % 20) / 4)], bIn = bar < 2 ? bar : (bar - 2) % 4, chord = M.ch[sec][bIn % M.ch[sec].length];
      const t = this.seqT + (st % 2 ? spb * 0.12 : 0), e8 = pos >> 1, on8 = pos % 2 === 0;
      const triad = k => [0, 2, 4].map(x => mf(deg(chord + x) + k));
      // pads y acordes
      if (pos === 0) this.iPad(triad(24), t, spb * 15, sec === 'C' ? 0.016 : 0.01, S);
      if (sec !== 'I' && sec !== 'C' && [2, 6, 11, 14].includes(pos)) this.iStab(triad(24), t, spb * 0.9, 0.03, S);
      // bajo ligero en registro medio
      if (sec !== 'I') { const bp = [0, null, null, 7, null, null, 0, null, 4, null, 7, null, 5, null, 7, 4][pos]; if (bp != null && (sec !== 'C' || pos % 4 === 0)) this.iBass(mf(deg(chord + bp)), t, spb * 1.6, 0.04, S); }
      // batería viva (sin bombo grave)
      if (sec !== 'I' || bar === 1) {
        if (pos === 0 || pos === 8 || (sec === 'B' && pos === 10)) { this.tone(240, t, 0.05, 'sine', 0.09, S.bus, 160); this.iNoise(t, 0.015, 0.06, 'bandpass', 3000, 1, S); }
        if (pos === 4 || pos === 12) { this.iNoise(t, 0.16, 0.07, 'bandpass', 1900, 0.8, S, 0.2); this.tone(380, t, 0.05, 'triangle', 0.04, S.bus, 260); }
        this.iNoise(t, pos === 14 ? 0.14 : 0.03, on8 ? 0.06 : 0.035, 'highpass', 8000, 0.7, S);
        if (fl && pos % 2 === 1) this.iNoise(t, 0.05, 0.02, 'bandpass', 7000, 2, S);
        if (fl && (pos === 4 || pos === 12)) this.iNoise(t + 0.01, 0.1, 0.05, 'bandpass', 1300, 1.5, S, 0.3);
      }
      if (bar === 1 && pos >= 8) this.iGlock(mf(deg(pos - 8) + 24), t, 0.03, S); // subida de entrada
      // melodía protagonista
      if (on8 && sec !== 'I' && sec !== 'C') { const mel = M[sec], i = bIn * 8 + e8, n = mel[i];
        if (typeof n === 'number') { let L = 1; while (mel[i + L] === '-') L++; const f = mf(deg(n) + 24), dur = spb * 2 * L * 0.92;
          if (sec[0] === 'A') { this.iBell(f, t, dur, 0.11, S); if (sec === 'A2' || fl) this.iGlock(f * 2, t, 0.035, S); }
          else { this.iBrass(f / 2, t, dur, 0.05, S); this.iBell(mf(deg(n - 2) + 24), t, dur, 0.05, S); } } }
      // contramelodía en glockenspiel
      if (sec === 'A2' && [3, 7, 11, 15].includes(pos)) this.iGlock(mf(deg(chord + [4, 2, 7, 4][pos >> 2]) + 24), t, 0.03, S);
      if (sec === 'C' && on8) this.iBell(mf(deg(chord + [0, 2, 4, 7, 9, 7, 4, 2][e8]) + 24), t, spb * 2, 0.07, S);
      // arpegio espacial con eco
      if (sec !== 'I' && (sec === 'C' || sec[0] === 'B' || fl)) { const n = [0, 2, 4, 7][st % 4] + (Math.floor(st / 4) % 2) * 2; const o = this.osc('square', mf(deg(chord + n) + 24), t, t + spb * 1.2), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3500; const g = c.createGain(); this.adsr(g, t, 0.003, 0.06, 0.2, 0.05, spb * 0.8, 0.02); o.connect(lp); lp.connect(g); this.out(g, S, 0.1, 0.5); }
      this.seqT += spb; this.step++;
    }
  },
  // ---------- motor v30: muy discreto, agudo y suave (apagado por defecto en Ajustes) ----------
  engineStart() {
    if (!this.ctx || this.engine || !this.engineOn) return; const c = this.ctx;
    const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(), g2 = c.createGain();
    o.type = 'sine'; o2.type = 'triangle'; g2.gain.value = 0.25; lfo.frequency.value = 6; lg.gain.value = 5; lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
    o.connect(g); o2.connect(g2); g2.connect(g); g.gain.value = 0; g.connect(this.sfx); for (const x of [o, o2, lfo]) x.start();
    this.engine = { o, o2, g, lfo };
  },
  engineSet(sp, boost) { const e = this.engine; if (!e) return; const t = this.ctx.currentTime, v = Math.min(sp, 70);
    const fq = 420 + v * 7 + (boost ? 120 : 0); e.o.frequency.setTargetAtTime(fq, t, 0.15); e.o2.frequency.setTargetAtTime(fq * 1.5, t, 0.15);
    e.g.gain.setTargetAtTime(sp > 1 ? 0.007 + v * 0.00006 : 0.003, t, 0.2); },
  engineStop() { const e = this.engine; if (!e) return; e.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08); setTimeout(() => { for (const x of [e.o, e.o2, e.lfo]) try { x.stop(); } catch (_) {} }, 400); this.engine = null; },
  driftT: 0,
  driftTick(lvl) { const c = this.ctx; if (!c || !this.on || c.currentTime < this.driftT) return; const t = c.currentTime; this.hit(t, 0.08, 0.01 + lvl * 0.005, [3000, 3500, 4200, 5000][lvl] || 3000); if (lvl) this.tone([0, 900, 1200, 1500][lvl] + Math.random() * 120, t, 0.05, 'sine', 0.008); this.driftT = t + 0.09; },
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
      case 'box': [0, 1, 2, 3].forEach(i => this.bell(this.midi(84 + [0, 4, 7, 12][i]), t + i * 0.035, 0.2, 0.05)); break;
      case 'box_old': [0, 1, 2].forEach(i => T(880 + i * 220, t + i * 0.04, 0.1, 'triangle', 0.12)); break;
      case 'roll': this.bell(this.midi(88 + [0, 2, 4, 7, 9, 12][Math.floor(Math.random() * 6)]), t, 0.08, 0.03); break;
      case 'roll_old': T(1200 + Math.random() * 600, t, 0.04, 'square', 0.04); break;
      case 'got': this.bell(this.midi(84), t, 0.15, 0.07); this.bell(this.midi(91), t + 0.08, 0.35, 0.07); break;
      case 'got_old': T(784, t, 0.1, 'square', 0.1); T(1175, t + 0.08, 0.18, 'square', 0.1); break;
      case 'boost': T(330, t, 0.45, 'triangle', 0.1, null, 1320); T(495, t + 0.04, 0.4, 'sine', 0.06, null, 1980); this.sfxPlay('whoosh', 1.4); [0, 4, 7, 12].forEach((n, i) => this.bell(this.midi(84 + n), t + 0.1 + i * 0.04, 0.2, 0.03)); break;
      case 'boost_old': T(220, t, 0.5, 'sawtooth', 0.12, null, 880); this.hit(t, 0.4, 0.15, 2000); break;
      case 'mini': { const lv = Math.round((k - 1) / 0.25); T(520 + lv * 120, t, 0.35, 'triangle', 0.09, null, 1500 + lv * 300); this.sfxPlay('whoosh', 1.2 + lv * 0.2); break; }
      case 'sparklvl': { const base = [0, 76, 79, 83][k] || 76; [0, 7, 12].forEach((n, i) => this.bell(this.midi(base + n), t + i * 0.04, 0.18, 0.045)); break; }
      case 'mini_old': T(440 * k, t, 0.25, 'square', 0.1, null, 880 * k); break;
      case 'drift': T(260, t, 0.12, 'triangle', 0.08, null, 520); this.hit(t, 0.06, 0.03, 4000); break;
      case 'drift_old': this.hit(t, 0.08, 0.05, 4000); break;
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
