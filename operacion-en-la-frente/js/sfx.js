// Sonidos sintetizados (sin archivos): suaves y kawaii
let ctx = null, master = null, muted = localStorage.getItem('ms_mute') === '1';
function ac() { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ctx.destination); } catch (e) { } } if (ctx && ctx.state === 'suspended') ctx.resume(); return ctx; }
function tone(f, d = 0.12, type = 'sine', v = 0.3, slide = 0, delay = 0) {
  const c = ac(); if (!c) return; const t = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.05);
}
function noise(d = 0.3, v = 0.2, f = 900) { const c = ac(); if (!c) return; const b = c.createBuffer(1, c.sampleRate * d, c.sampleRate), a = b.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / a.length);
  const s = c.createBufferSource(); s.buffer = b; const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = f; const g = c.createGain(); g.gain.value = v; s.connect(fl); fl.connect(g); g.connect(master); s.start(); }
export const Sfx = {
  init: ac,
  get muted() { return muted; },
  toggle() { muted = !muted; localStorage.setItem('ms_mute', muted ? '1' : '0'); if (master) master.gain.value = muted ? 0 : 0.5; return muted; },
  tap() { tone(880, 0.06, 'triangle', 0.15); },
  key() { tone(660 + Math.random() * 120, 0.05, 'sine', 0.12); },
  hop() { tone(520, 0.08, 'sine', 0.08, 260); },
  ok() { tone(660, 0.1, 'triangle', 0.22); tone(990, 0.16, 'triangle', 0.2, 0, 0.08); },
  bad() { tone(220, 0.25, 'square', 0.09, -90); },
  crack() { noise(0.35, 0.25, 1600); tone(140, 0.3, 'sawtooth', 0.05, -60); },
  sink() { noise(0.6, 0.3, 500); tone(300, 0.5, 'sine', 0.15, -230); },
  splash() { noise(0.5, 0.35, 2400); },
  zap() { tone(1400, 0.18, 'sawtooth', 0.08, -1100); noise(0.15, 0.15, 3000); },
  shield() { tone(523, 0.1, 'sine', 0.2); tone(784, 0.12, 'sine', 0.2, 0, 0.07); tone(1046, 0.2, 'sine', 0.2, 0, 0.14); },
  out() { tone(500, 0.5, 'triangle', 0.2, -380); },
  tick() { tone(1200, 0.04, 'square', 0.05); },
  go() { tone(784, 0.3, 'triangle', 0.25); tone(1175, 0.4, 'triangle', 0.2, 0, 0.1); },
  win() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.25, 'triangle', 0.22, 0, i * 0.11)); },
  shuffle() { for (let i = 0; i < 6; i++) tone(600 + i * 90, 0.05, 'triangle', 0.08, 0, i * 0.05); },
};
