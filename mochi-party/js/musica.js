// Mochi Party · música de fondo continua + sonidos suaves de interfaz (WebAudio procedural, sin archivos)
// - Suena en todas las pantallas; al cambiar de página retoma el compás donde iba (sessionStorage) con fundido suave.
// - Se desbloquea con el primer toque (móvil). Botón 🔊/🔇 persistente (localStorage 'mpMusicaOff').
(function () {
  if (window.MPMusica) return;
  const LS = 'mpMusicaOff', SS = 'mpMusicaPos';
  let ctx = null, master, mus, ui, rev, timer = null, step = 0, seqT = 0, off = localStorage.getItem(LS) === '1', started = false;
  const BPM = 96, SPB = 60 / BPM / 2; // corcheas
  const midi = m => 440 * Math.pow(2, (m - 69) / 12);
  // Fa mayor, progresión alegre y tranquila: I – vi – IV – V  /  I – iii – IV – V
  const ROOT = 65, SC = [0, 2, 4, 5, 7, 9, 11];
  const deg = d => ROOT + SC[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
  const PROG = [0, 5, 3, 4, 0, 2, 3, 4];
  // melodía: 8 compases × 8 corcheas (grados relativos a la escala, null = silencio)
  const MEL = [
    [4, null, 2, 4, 5, null, 4, null], [2, null, 0, 2, 4, null, null, null], [3, null, 5, 3, 1, null, 0, 1], [2, null, null, 1, 4, null, null, null],
    [4, 5, 7, null, 6, 4, 5, null], [4, null, 2, null, 4, 2, 0, null], [3, 5, 7, 5, 6, null, 5, 4], [2, null, 1, null, 0, null, null, null]];
  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; comp.connect(master);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200; lp.connect(comp);
    mus = ctx.createGain(); mus.gain.value = 0.16; mus.connect(lp);
    ui = ctx.createGain(); ui.gain.value = 0.22; ui.connect(comp);
    // eco suave (sensación de sala)
    const dl = ctx.createDelay(1); dl.delayTime.value = SPB * 3; const fb = ctx.createGain(); fb.gain.value = 0.22; const dlf = ctx.createBiquadFilter(); dlf.type = 'lowpass'; dlf.frequency.value = 1800;
    rev = ctx.createGain(); rev.gain.value = 0.35; rev.connect(dl); dl.connect(dlf); dlf.connect(fb); fb.connect(dl); dlf.connect(lp);
  }
  function note(f, t, dur, vol, type = 'sine', dest = mus, wet = 0, bright = 0) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); if (wet) { const w = ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(rev); }
    if (bright) { const o2 = ctx.createOscillator(), g2 = ctx.createGain(); o2.type = 'sine'; o2.frequency.value = f * 4; g2.gain.setValueAtTime(vol * bright, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.3); o2.connect(g2); g2.connect(dest); o2.start(t); o2.stop(t + dur); }
    o.start(t); o.stop(t + dur + 0.05);
  }
  function pad(fs, t, dur, vol) { for (const f of fs) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f; o.detune.value = (Math.random() - .5) * 8; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.4); g.gain.linearRampToValueAtTime(vol * .7, t + dur - .3); g.gain.linearRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(mus); o.start(t); o.stop(t + dur + .05); } }
  let noiseB = null;
  function shaker(t, vol) { if (!noiseB) { const n = ctx.sampleRate * .2 | 0; noiseB = ctx.createBuffer(1, n, ctx.sampleRate); const d = noiseB.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; }
    const s = ctx.createBufferSource(); s.buffer = noiseB; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6500; const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + .05); s.connect(f); f.connect(g); g.connect(mus); s.start(t); s.stop(t + .08); }
  function tick() {
    while (seqT < ctx.currentTime + 0.3) {
      const st = step, t = seqT, bar = Math.floor(st / 8) % 8, b8 = st % 8, ch = PROG[bar], loop = Math.floor(st / 64) % 4;
      if (b8 === 0) pad([midi(deg(ch) - 12), midi(deg(ch + 2) - 12), midi(deg(ch + 4) - 12)], t, SPB * 8, 0.05);
      if (b8 === 0 || b8 === 4) note(midi(deg(ch) - 24), t, SPB * 3, 0.32, 'sine');
      if (b8 === 6) note(midi(deg(ch + 4) - 24), t, SPB * 1.5, 0.18, 'sine');
      if (b8 === 0 || b8 === 4) note(70, t, 0.18, 0.22, 'sine'); // bombo suave
      if (st % 2 === 1 && loop !== 0) shaker(t, 0.05);
      // arpegio de campanita (pizzicato) por detrás
      if (loop >= 1) note(midi(deg(ch + [0, 2, 4, 7][b8 % 4])), t, SPB * 0.9, 0.035, 'triangle', mus, 0.4);
      // melodía tipo marimba; en la 3.ª vuelta, una octava arriba; en la 4.ª, descansa a medias
      const m = MEL[bar][b8]; if (m != null && !(loop === 3 && bar < 4)) note(midi(deg(m) + (loop === 2 ? 12 : 0)), t, SPB * 2.6, 0.13, 'sine', mus, 0.5, 0.25);
      seqT += SPB; step++;
    }
  }
  function fade(to, s = 1.2) { if (!ctx) return; const g = master.gain, t = ctx.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(to, t + s); }
  function start() {
    init(); if (!ctx) return; if (ctx.state === 'suspended') ctx.resume();
    if (!started) { started = true;
      try { const p = JSON.parse(sessionStorage.getItem(SS) || 'null'); if (p) step = (p.step + Math.round((Date.now() - p.at) / 1000 / SPB)) % 256; } catch (e) {}
      step -= step % 8; seqT = ctx.currentTime + 0.12; timer = setInterval(tick, 60); }
    fade(off ? 0 : 0.9);
  }
  function save() { try { sessionStorage.setItem(SS, JSON.stringify({ step, at: Date.now() })); } catch (e) {} }
  addEventListener('pagehide', () => { save(); if (ctx) fade(0, .15); });
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) { fade(0, .2); } else if (!off) { ctx.resume(); fade(.9, .8); } });
  // ---------- sonidos de interfaz (suaves, sin agudos estridentes) ----------
  let lastSfx = 0;
  function sfx(kind) {
    if (off || !ctx || ctx.state !== 'running') return; const t = ctx.currentTime; if (t - lastSfx < .06 && kind === 'scroll') return; lastSfx = t;
    if (kind === 'tap') { note(midi(84), t, .12, .14, 'sine', ui, 0, .1); }
    else if (kind === 'scroll') { note(midi([79, 81, 84, 86][Math.random() * 4 | 0]), t, .08, .05, 'sine', ui); }
    else if (kind === 'char') { [0, 4, 7].forEach((s, i) => note(midi(77 + s), t + i * .055, .35, .12, 'sine', ui, 0, .15)); }
    else if (kind === 'screen') { // barrido suave + dos notas
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(880, t + .22); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.08, t + .05); g.gain.exponentialRampToValueAtTime(.0001, t + .3); o.connect(g); g.connect(ui); o.start(t); o.stop(t + .35);
      note(midi(72), t + .12, .4, .1, 'sine', ui); note(midi(79), t + .2, .5, .09, 'sine', ui); }
  }
  // desbloqueo en el primer toque
  const unlock = () => start();
  ['pointerdown', 'touchend', 'keydown'].forEach(e => addEventListener(e, unlock, { capture: true, passive: true }));
  // toques en botones / navegación
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('button,.btn,a,[onclick]'); if (!b || b.id === 'mpMusBtn') return;
    const nav = b.tagName === 'A' || /location/.test(b.getAttribute('onclick') || ''); sfx(nav ? 'screen' : 'tap'); if (nav) save(); }, true);
  // desplazamiento por el menú (cualquier contenedor con scroll)
  let lastY = new WeakMap(); document.addEventListener('scroll', e => { const el = e.target === document ? document.scrollingElement : e.target; if (!el) return; const y = el.scrollTop || 0, p = lastY.get(el) || 0; if (Math.abs(y - p) > 70) { lastY.set(el, y); sfx('scroll'); } }, true);
  // cambio de pantalla (.scr.on) y de personaje (data-key del escenario en modo «chars»)
  function watch() {
    let prevScr = document.querySelector('.scr.on'), prevKey = null;
    new MutationObserver(() => { const s = document.querySelector('.scr.on'); if (s && s !== prevScr) { prevScr = s; sfx('screen'); }
      const st = document.querySelector('.scr.on .stage3d[data-mode="chars"]'); const k = st && st.dataset.key; if (k && prevKey && k !== prevKey) sfx('char'); if (k) prevKey = k; })
      .observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class', 'data-key'] });
    // botón de silencio
    const b = document.createElement('button'); b.id = 'mpMusBtn'; b.type = 'button'; b.setAttribute('aria-label', 'Música');
    b.style.cssText = 'position:fixed;right:12px;top:calc(96px + env(safe-area-inset-top));z-index:99999;width:36px;height:36px;opacity:.9;border-radius:50%;border:2px solid #fff;background:rgba(124,92,214,.85);color:#fff;font-size:17px;line-height:1;padding:0;box-shadow:0 3px 10px rgba(0,0,0,.25);cursor:pointer';
    ['pointerdown', 'touchstart', 'mousedown'].forEach(ev => b.addEventListener(ev, e => { e.stopPropagation(); start(); }, { passive: true }));
    const upd = () => b.textContent = off ? '🔇' : '🎵'; upd();
    b.onclick = () => { off = !off; localStorage.setItem(LS, off ? '1' : '0'); upd(); start(); };
    document.body.appendChild(b);
  }
  if (document.body) watch(); else addEventListener('DOMContentLoaded', watch);
  window.MPMusica = { start, sfx, get off() { return off; }, get step() { return step; }, get state() { return ctx ? ctx.state : 'none'; } };
})();
