// MOCHI PARTY · desfile de fondo: camellos voladores, medusas, mochis que saltan y saludan, trofeos y globos.
// Va DETRÁS de los botones y del mochi 3D (solo bandas de arriba/abajo y laterales), un solo rAF con delta time.
(function () {
  const cv = document.createElement('canvas'); cv.id = 'desfile'; cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:' + (document.currentScript.dataset.z || 8);
  const ref = document.currentScript.dataset.before && document.getElementById(document.currentScript.dataset.before);
  if (ref) ref.parentNode.insertBefore(cv, ref.nextSibling); else document.body.prepend(cv);
  const x = cv.getContext('2d'); let W = 0, H = 0, PR = 1;
  const size = () => { PR = Math.min(devicePixelRatio || 1, 1.5); W = innerWidth; H = innerHeight; cv.width = W * PR | 0; cv.height = H * PR | 0; };
  addEventListener('resize', size); size();
  const isOn = window.__desfileOn || (() => { const m = document.getElementById('sMenu'), c = document.getElementById('sChars'); return !m || m.classList.contains('on') || (c && c.classList.contains('on')); });
  const R = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.random() * a.length | 0];
  const MO = [['#ffb3d1', '#ff7fae'], ['#ffe27a', '#f5b93a'], ['#9fe7ff', '#4fc3ea'], ['#c9b2ff', '#9b7ce6'], ['#a8f0c6', '#4fcf8e'], ['#ffc39e', '#ff8a5c'], ['#ffffff', '#cfd8ff'], ['#ff9c9c', '#e85a5a']];
  const ICONS = ['🏆', '🥇', '🎈', '⭐', '🍬', '⚽', '🌶️', '🍉', '🎉', '🏅', '🪐', '🍩'];
  const band = () => { const land = W > H; const r = Math.random(); // arriba o abajo, lejos del centro
    if (r < .55) return R(H * .03, H * (land ? .2 : .14)); return R(H * (land ? .86 : .9), H * .97); };
  let ents = [];
  function spawn(k) { const dir = Math.random() < .5 ? 1 : -1, s = Math.min(W, H) / 390 * 1.35;
    if (k === 'camel') return { k, dir, x: dir > 0 ? -90 : W + 90, y: band(), v: R(38, 60) * s, s: R(.75, 1.05) * s, ph: R(0, 9) };
    if (k === 'jelly') { const side = Math.random() < .5 ? R(.02, .12) : R(.88, .98); return { k, x: W * side, y: H + 60, v: R(16, 26) * s, s: R(.7, 1.1) * s, ph: R(0, 9), c: pick(['#ffb3e6', '#b9c8ff', '#a8f0e6', '#ffd0a8']) }; }
    if (k === 'mochi') { const top = W > H ? H * .955 : H * .965; return { k, dir, x: dir > 0 ? -40 : W + 40, y: top, v: R(42, 70) * s, s: R(.8, 1.1) * s, ph: R(0, 9), c: pick(MO), wave: 0, hop: 0 }; }
    return { k: 'icon', ic: pick(ICONS), dir, x: dir > 0 ? -30 : W + 30, y: band(), v: R(40, 80) * s, s: R(.8, 1.2) * s, ph: R(0, 9), rot: R(-1, 1) };
  }
  const want = { camel: 3, jelly: 4, mochi: 4, icon: 6 };
  for (const k in want) for (let i = 0; i < want[k]; i++) { const e = spawn(k); if (e.dir) e.x = R(0, W); else e.y = R(H * .2, H); ents.push(e); }
  function camel(e, t) { const fl = Math.sin(t * 9 + e.ph); x.save(); x.translate(e.x, e.y + Math.sin(t * 2 + e.ph) * 10); x.scale(e.s * e.dir, e.s); x.rotate(Math.sin(t * 2 + e.ph) * .08);
    x.lineCap = 'round'; x.lineJoin = 'round'; const ink = '#7a4a3a';
    // alas
    x.fillStyle = '#fff'; x.strokeStyle = '#ffb3d1'; x.lineWidth = 3; x.save(); x.translate(-4, -16); x.rotate(-.4 - fl * .6); x.beginPath(); x.ellipse(0, -16, 9, 18, 0, 0, 7); x.fill(); x.stroke(); x.restore();
    // patas colgando
    x.strokeStyle = '#d9a066'; x.lineWidth = 5; for (const px of [-18, -8, 8, 18]) { x.beginPath(); x.moveTo(px, 6); x.lineTo(px + Math.sin(t * 5 + px) * 4, 22); x.stroke(); }
    // cuerpo + jorobas
    x.fillStyle = '#f0c27a'; x.strokeStyle = ink; x.lineWidth = 2.5; x.beginPath(); x.ellipse(0, 0, 26, 13, 0, 0, 7); x.fill(); x.stroke();
    x.beginPath(); x.ellipse(-9, -12, 9, 10, 0, Math.PI, 0); x.ellipse(9, -12, 9, 10, 0, Math.PI, 0); x.fill(); x.stroke();
    // cuello y cabeza
    x.beginPath(); x.moveTo(20, -4); x.quadraticCurveTo(34, -10, 32, -26); x.lineWidth = 9; x.strokeStyle = '#f0c27a'; x.stroke();
    x.fillStyle = '#f0c27a'; x.strokeStyle = ink; x.lineWidth = 2.5; x.beginPath(); x.ellipse(36, -30, 11, 8, .2, 0, 7); x.fill(); x.stroke();
    x.fillStyle = ink; x.beginPath(); x.arc(38, -32, 1.8, 0, 7); x.fill(); x.fillStyle = 'rgba(255,110,150,.6)'; x.beginPath(); x.arc(41, -27, 2.6, 0, 7); x.fill();
    // bufanda kawaii
    x.fillStyle = '#ff7fae'; x.fillRect(24, -16, 10, 5); x.beginPath(); x.moveTo(26, -12); x.lineTo(20 - Math.sin(t * 8) * 3, -2); x.lineTo(25, -11); x.fill();
    // ala delantera
    x.fillStyle = '#fff'; x.strokeStyle = '#ffb3d1'; x.lineWidth = 3; x.save(); x.translate(4, -14); x.rotate(.3 + fl * .7); x.beginPath(); x.ellipse(0, -18, 10, 20, 0, 0, 7); x.fill(); x.stroke(); x.restore();
    x.restore(); }
  function jelly(e, t) { const p = Math.sin(t * 2.4 + e.ph); x.save(); x.translate(e.x + Math.sin(t * .8 + e.ph) * 14, e.y); x.scale(e.s, e.s); x.globalAlpha = .85;
    x.strokeStyle = e.c; x.lineWidth = 3; x.lineCap = 'round'; for (let i = -2; i <= 2; i++) { x.beginPath(); x.moveTo(i * 7, 4); for (let k = 1; k <= 4; k++) x.lineTo(i * 7 + Math.sin(t * 3 + k + i + e.ph) * 4, 4 + k * 9); x.stroke(); }
    const g = x.createRadialGradient(-6, -12, 2, 0, -4, 24); g.addColorStop(0, '#fff'); g.addColorStop(1, e.c); x.fillStyle = g;
    x.beginPath(); x.ellipse(0, 0, 22 + p * 2, 18 - p * 2, 0, Math.PI, 0); x.quadraticCurveTo(0, 10, -22 - p * 2, 0); x.fill();
    x.fillStyle = '#5a3a6a'; x.beginPath(); x.arc(-7, -5, 2, 0, 7); x.arc(7, -5, 2, 0, 7); x.fill();
    x.strokeStyle = '#5a3a6a'; x.lineWidth = 1.6; x.beginPath(); x.arc(0, -3, 3, .2, Math.PI - .2); x.stroke(); x.fillStyle = 'rgba(255,110,150,.5)'; x.beginPath(); x.arc(-12, -2, 3, 0, 7); x.arc(12, -2, 3, 0, 7); x.fill();
    x.restore(); }
  function mochi(e, t, dt) { const hp = Math.abs(Math.sin(t * 4.5 + e.ph)), y = e.y - hp * 26 * e.s, sq = 1 + (1 - hp) * .18 * (hp < .25 ? 1 : 0);
    if (e.wave <= 0 && Math.random() < dt * .25) e.wave = 1.8; e.wave -= dt; const wv = e.wave > 0;
    x.save(); x.translate(e.x, y); x.scale(e.s * sq, e.s / sq);
    x.fillStyle = 'rgba(120,60,140,.15)'; x.beginPath(); x.ellipse(0, (e.y - y) / e.s * sq + 2, 16 - hp * 6, 4, 0, 0, 7); x.fill();
    const g = x.createRadialGradient(-6, -26, 3, 0, -16, 24); g.addColorStop(0, e.c[0]); g.addColorStop(1, e.c[1]); x.fillStyle = g; x.strokeStyle = 'rgba(90,50,110,.5)'; x.lineWidth = 2;
    x.beginPath(); x.ellipse(0, -16, 20, 17, 0, 0, 7); x.fill(); x.stroke();
    // bracito que saluda
    x.save(); x.translate(17 * e.dir, -20); x.rotate(wv ? -1.2 * e.dir + Math.sin(t * 14) * .5 : .6 * e.dir); x.fillStyle = e.c[1]; x.beginPath(); x.ellipse(0, -7, 5, 8, 0, 0, 7); x.fill(); x.restore();
    x.fillStyle = '#4a2f5a'; const ex = 3 * e.dir; if (wv) { x.strokeStyle = '#4a2f5a'; x.lineWidth = 2.2; x.beginPath(); x.arc(-6 + ex, -19, 3, Math.PI * 1.1, Math.PI * 1.9); x.moveTo(9 + ex, -19); x.arc(6 + ex, -19, 3, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); } else { x.beginPath(); x.arc(-6 + ex, -18, 2.4, 0, 7); x.arc(6 + ex, -18, 2.4, 0, 7); x.fill(); }
    x.fillStyle = 'rgba(255,100,150,.55)'; x.beginPath(); x.arc(-11 + ex, -13, 3.2, 0, 7); x.arc(11 + ex, -13, 3.2, 0, 7); x.fill();
    x.strokeStyle = '#4a2f5a'; x.lineWidth = 1.8; x.beginPath(); x.arc(ex, -13, wv ? 4 : 2.5, .1, Math.PI - .1); x.stroke();
    x.restore();
    if (wv && e.wave > .6) { x.save(); x.translate(e.x + 14 * e.dir, y - 50 * e.s); x.fillStyle = 'rgba(255,255,255,.95)'; x.strokeStyle = '#ff86bd'; x.lineWidth = 2; x.beginPath(); x.roundRect(-26, -13, 52, 24, 12); x.fill(); x.stroke(); x.fillStyle = '#e0609f'; x.font = '700 13px Fredoka,system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(e.say || (e.say = pick(['¡Hola!', '¡Ánimo!', '¡Yuju!', '¡Vamos!', '¡Hey!'])), 0, -1); x.restore(); } else if (!wv) e.say = 0; }
  function icon(e, t) { x.save(); x.translate(e.x, e.y + Math.sin(t * 2.6 + e.ph) * 9); x.rotate(Math.sin(t * 1.7 + e.ph) * .35 * e.rot); x.font = (26 * e.s | 0) + 'px system-ui,"Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(e.ic, 0, 0); x.restore(); }
  let last = performance.now();
  function frame(now) { requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now;
    const on = isOn(); cv.style.display = on ? '' : 'none'; if (!on) return;
    const t = now / 1000; x.setTransform(PR, 0, 0, PR, 0, 0); x.clearRect(0, 0, W, H);
    for (let i = ents.length - 1; i >= 0; i--) { const e = ents[i];
      if (e.k === 'jelly') { e.y -= e.v * dt * (.6 + .4 * Math.max(0, Math.sin(t * 2.4 + e.ph))); if (e.y < -70) ents[i] = spawn('jelly'); else jelly(e, t); continue; }
      e.x += e.v * e.dir * dt; if (e.x < -120 || e.x > W + 120) { ents[i] = spawn(e.k); continue; }
      if (e.k === 'camel') camel(e, t); else if (e.k === 'mochi') mochi(e, t, dt); else icon(e, t); }
  }
  requestAnimationFrame(frame);
})();
