// Sonido sintetizado con WebAudio (sin archivos)
let ctx = null, master, sfx, music, noiseBuf, whoosh = null;
export const S = { sfxOn: true, musicOn: true, voiceOn: true };
try { const v = JSON.parse(localStorage.getItem('dr_snd') || '{}'); Object.assign(S, v); } catch (e) {}
const save = () => { try { localStorage.setItem('dr_snd', JSON.stringify(S)); } catch (e) {} };

export function init() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 5;
  master.connect(comp); comp.connect(ctx.destination);
  sfx = ctx.createGain(); sfx.gain.value = S.sfxOn ? 0.8 : 0; sfx.connect(master);
  music = ctx.createGain(); music.gain.value = S.musicOn ? 0.5 : 0; music.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  startWhoosh();
}
export function setSfx(on) { S.sfxOn = on; save(); if (sfx) sfx.gain.value = on ? 0.8 : 0; }
export function setMusic(on) { S.musicOn = on; save(); if (music) music.gain.value = on ? 0.5 : 0; }
export function setVoice(on) { S.voiceOn = on; save(); }

function env(g, t, a, peak, d) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function tone(type, f, t, dur, vol = 0.3, f2 = null, dest = sfx, a = 0.005) {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  env(g, t, a, vol, dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + a + 0.05);
}
function noise(t, dur, vol, f0, f1, q = 1, type = 'bandpass', dest = sfx) {
  if (!ctx) return;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain(); env(g, t, 0.01, vol, dur); s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + dur + 0.1);
}
const now = () => ctx.currentTime;
const N = (semi) => 440 * Math.pow(2, (semi - 9) / 12); // 0 = Do central

function startWhoosh() {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 400; f.Q.value = 0.8;
  const g = ctx.createGain(); g.gain.value = 0;
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5.5; lg.gain.value = 0.35; lfo.connect(lg);
  const mod = ctx.createGain(); mod.gain.value = 0.65; lg.connect(mod.gain);
  s.connect(f); f.connect(mod); mod.connect(g); g.connect(sfx); s.start(); lfo.start();
  whoosh = { f, g, lfo };
}
export function setWhoosh(level, size) { // level 0..1
  if (!whoosh || !ctx) return; const t = now();
  whoosh.g.gain.setTargetAtTime(S.sfxOn ? level * 0.22 : 0, t, 0.1);
  whoosh.f.frequency.setTargetAtTime(260 + level * 520 / Math.sqrt(size), t, 0.1);
  whoosh.lfo.frequency.setTargetAtTime(3 + level * 4, t, 0.2);
}

export function pop(combo = 0, tier = 0) {
  if (!ctx) return; const t = now();
  const st = Math.min(combo, 14) * 0.9 + tier * 1.5;
  const f = N(7 + st) * (1 + (Math.random() - 0.5) * 0.01);
  tone('triangle', f, t, 0.13, 0.28, f * 1.5);
  tone('sine', f * 2, t + 0.02, 0.09, 0.12);
  noise(t, 0.1, 0.1, 2500, 600, 1.2);
  if (tier >= 2) { tone('sine', 90, t, 0.28, 0.5, 40); noise(t, 0.3, 0.2, 900, 120, 0.7, 'lowpass'); }
  if (tier >= 4) { tone('sawtooth', 70, t, 0.6, 0.3, 28); noise(t, 0.7, 0.3, 700, 80, 0.6, 'lowpass'); }
}
export function coin() { if (!ctx) return; const t = now(); tone('square', N(19), t, 0.07, 0.12); tone('square', N(24), t + 0.07, 0.16, 0.12); }
export function clockBonus() { if (!ctx) return; const t = now(); [0, 4, 7, 12, 16].forEach((s, i) => tone('triangle', N(s + 12), t + i * 0.05, 0.14, 0.2)); }
export function levelUp(lv = 1) {
  if (!ctx) return; const t = now(); const base = Math.min(lv, 6);
  [0, 4, 7, 12, 16, 19].forEach((s, i) => { tone('triangle', N(s + base), t + i * 0.065, 0.22, 0.26); tone('sine', N(s + base + 12), t + i * 0.065, 0.2, 0.1); });
  noise(t, 0.5, 0.2, 400, 4000, 0.8);
}
export function hit() { if (!ctx) return; const t = now(); tone('sawtooth', 340, t, 0.4, 0.3, 70); tone('square', 180, t, 0.3, 0.2, 50); noise(t, 0.25, 0.3, 1800, 200, 0.8); }
export function beep(go = false) { if (!ctx) return; const t = now(); if (go) { [0, 4, 7, 12].forEach((s) => tone('square', N(s + 12), t, 0.5, 0.12)); tone('triangle', N(24), t, 0.6, 0.2); } else tone('square', N(12), t, 0.2, 0.18); }
export function tick(urgent) { if (!ctx) return; const t = now(); tone('square', urgent ? 1500 : 1100, t, 0.05, 0.1); }
export function click() { if (!ctx) return; const t = now(); tone('triangle', 700, t, 0.07, 0.2, 1000); }
export function buy() { if (!ctx) return; const t = now(); [0, 4, 7, 12].forEach((s, i) => tone('square', N(s + 7), t + i * 0.06, 0.15, 0.12)); coin(); }
export function nope() { if (!ctx) return; const t = now(); tone('square', 160, t, 0.18, 0.18, 110); }
export function roundEnd(good) { if (!ctx) return; const t = now(); (good ? [0, 4, 7, 12, 7, 12, 16] : [7, 5, 3, 0]).forEach((s, i) => tone('triangle', N(s + 5), t + i * 0.13, 0.28, 0.25)); }
export function sofaScream() { if (!ctx) return; const t = now(); tone('sine', 900, t, 0.25, 0.14, 500); tone('sine', 1200, t + 0.1, 0.22, 0.1, 700); }
export function swish() { if (!ctx) return; noise(now(), 0.4, 0.2, 300, 3000, 1); }

export function speak(text, pitch = 1.5, rate = 1.05) {
  if (!S.voiceOn || !S.sfxOn || !('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text); u.lang = 'es-ES'; u.pitch = pitch; u.rate = rate; u.volume = 0.9;
    const vs = speechSynthesis.getVoices().filter((v) => /^es/i.test(v.lang)); if (vs.length) u.voice = vs.find((v) => /female|mujer|monica|paulina|helena|laura/i.test(v.name)) || vs[0];
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (e) {}
}

// ---------- música alegre ----------
let mTimer = null, mStep = 0, mNext = 0, mMode = 'game';
const CH = [[0, 4, 7], [9, 0, 4], [5, 9, 12], [7, 11, 14]];
const MEL = [[12, 16, 19, 16, 24, 19, 16, 12], [12, 14, 16, 19, 21, 19, 16, 14], [17, 16, 12, 16, 17, 21, 19, 17], [19, 17, 16, 14, 16, 19, 23, 19]];
function sched() {
  if (!ctx) return; const bpm = mMode === 'game' ? 132 : 108, sp = 60 / bpm / 2;
  while (mNext < ctx.currentTime + 0.3) {
    const bar = (mStep >> 3) % 4, st = mStep & 7, t = mNext, ch = CH[bar];
    if (st % 2 === 0) tone('triangle', N(ch[0] - 12 + (st === 4 ? 7 : 0)), t, sp * 1.7, 0.22, null, music);
    if (st === 2 || st === 6) { tone('square', N(ch[1] + 0), t, sp * 0.7, 0.045, null, music); tone('square', N(ch[2] + 0), t, sp * 0.7, 0.045, null, music); }
    const m = MEL[(mStep >> 5) % 2 ? (bar + 1) % 4 : bar][st];
    if (mMode === 'game' || st % 2 === 0) tone('sine', N(m + (mMode === 'game' ? 0 : -12)), t, sp * 0.9, 0.11, null, music);
    if (st % 2 === 1 && mMode === 'game') noise(t, 0.03, 0.05, 7000, 6000, 1, 'highpass', music);
    if (st === 0 || st === 4) noise(t, 0.08, 0.14, 180, 60, 1, 'lowpass', music);
    mStep++; mNext += sp;
  }
}
export function startMusic(mode = 'game') {
  if (!ctx) return; mMode = mode; if (mTimer) return; mNext = ctx.currentTime + 0.05; mStep = 0; mTimer = setInterval(sched, 90);
}
export function stopMusic() { if (mTimer) { clearInterval(mTimer); mTimer = null; } }
export function setMusicMode(m) { mMode = m; }
export function suspend(on) { if (!ctx) return; on ? ctx.suspend() : ctx.resume(); }

// ---------- v2: sonidos de los personajes locos ----------
export function cuckoo() { if (!ctx) return; const t = now(); tone('sine', N(16), t, 0.16, 0.2, N(15)); tone('sine', N(12), t + 0.2, 0.22, 0.2, N(11)); }
export function quack() { if (!ctx) return; const t = now(); tone('sawtooth', 520, t, 0.12, 0.1, 380); tone('square', 540, t + 0.01, 0.1, 0.05, 400); }
export function toastShot() { if (!ctx) return; const t = now(); tone('square', 300, t, 0.1, 0.12, 800); noise(t, 0.12, 0.12, 2000, 800, 1); }
export function stomp() { if (!ctx) return; const t = now(); tone('sine', 120, t, 0.35, 0.5, 35); noise(t, 0.3, 0.3, 500, 60, 0.7, 'lowpass'); }
export function select() { if (!ctx) return; const t = now(); [0, 7, 12].forEach((s, i) => tone('triangle', N(s + 9), t + i * 0.05, 0.12, 0.2)); }
export function unlock() { if (!ctx) return; const t = now(); [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => { tone('triangle', N(s + 5), t + i * 0.06, 0.25, 0.22); tone('sine', N(s + 17), t + i * 0.06, 0.2, 0.08); }); noise(t, 0.6, 0.15, 500, 6000, 0.8); }
export function puff() { if (!ctx) return; noise(now(), 0.25, 0.14, 900, 200, 0.8, 'bandpass'); tone('sine', 700, now(), 0.15, 0.1, 200); }
