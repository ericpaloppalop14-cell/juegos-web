// parallax-fx.js — noche 3 (25-10-2026): capas de parallax con decorado (estrellas, rayos de luna, castillo y colinas,
// niebla, murciélagos) y partículas al aletear y al puntuar. Solo decorativo: no toca física ni colisiones.
(() => {
  const TAU = Math.PI * 2;
  const P = { q: 2, fr: 0, t0: 0, last: 0, t: 0, px: 0, fx: [], rings: [], built: false };
  { const m = /[?&]fxq=(\d)/.exec(location.search); if (m) { P.q = +m[1]; P.lock = true; } }
  let seed = 77; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  function mk(w, h, f) { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); return c; }
  function build(W, H) {
    P.built = true; P.W = W; P.H = H;
    P.stars = []; for (let i = 0; i < 90; i++) P.stars.push({ x: rnd() * W * 2, y: rnd() * H * 0.6, r: 0.4 + rnd() * 1.4, p: rnd() * TAU, s: 0.6 + rnd() * 2 });
    // colinas lejanas con castillo encantado (tile horizontal que se repite)
    P.far = mk(840, 260, (c, w, h) => {
      const g = c.createLinearGradient(0, 60, 0, h); g.addColorStop(0, 'rgba(120,86,170,0.85)'); g.addColorStop(1, 'rgba(84,58,128,0.95)'); c.fillStyle = g;
      c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w; x += 10) c.lineTo(x, 170 - 30 * Math.sin(x / w * TAU * 2) - 14 * Math.sin(x / w * TAU * 5 + 1)); c.lineTo(w, h); c.fill();
      // castillo
      const cx = 520, by = 150; c.fillStyle = 'rgba(78,52,120,1)';
      c.fillRect(cx - 50, by - 50, 100, 60); for (const [dx, tw, th] of [[-58, 22, 95], [36, 22, 105], [-12, 26, 130]]) { c.fillRect(cx + dx, by - th + 10, tw, th); c.beginPath(); c.moveTo(cx + dx - 5, by - th + 10); c.lineTo(cx + dx + tw / 2, by - th - 26); c.lineTo(cx + dx + tw + 5, by - th + 10); c.fill(); }
      for (let k = 0; k < 8; k++) c.fillRect(cx - 50 + k * 13, by - 58, 7, 9);
      c.fillStyle = 'rgba(255,214,120,0.95)'; for (const [x, y] of [[cx - 50, by - 60], [cx + 42, by - 70], [cx - 3, by - 100], [cx - 3, by - 70], [cx - 30, by - 30], [cx + 15, by - 30]]) { c.beginPath(); c.ellipse(x + 4, y + 6, 3, 5, 0, 0, TAU); c.fill(); }
      // árboles retorcidos
      c.strokeStyle = 'rgba(70,46,108,1)'; c.lineCap = 'round';
      for (const tx of [90, 210, 330, 700, 790]) { const ty = 168 - 30 * Math.sin(tx / w * TAU * 2); c.lineWidth = 5; c.beginPath(); c.moveTo(tx, ty + 4); c.quadraticCurveTo(tx + 6, ty - 22, tx - 2, ty - 40); c.stroke(); c.lineWidth = 2.5;
        for (const [a, l] of [[-0.9, 18], [0.8, 16], [-0.4, 12], [1.2, 10]]) { c.beginPath(); c.moveTo(tx, ty - 26); c.quadraticCurveTo(tx + Math.sin(a) * l * 0.6, ty - 30 - l * 0.4, tx + Math.sin(a) * l, ty - 28 - Math.cos(a) * l); c.stroke(); } }
    });
    // colinas cercanas con lápidas y calabazas
    P.near = mk(840, 200, (c, w, h) => {
      c.fillStyle = 'rgba(58,36,92,1)'; c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w; x += 8) c.lineTo(x, 120 - 18 * Math.sin(x / w * TAU * 3 + 2) - 8 * Math.sin(x / w * TAU * 7)); c.lineTo(w, h); c.fill();
      for (let i = 0; i < 9; i++) { const x = 40 + i * 92 + (i % 3) * 11, y = 118 - 18 * Math.sin(x / w * TAU * 3 + 2) - 8 * Math.sin(x / w * TAU * 7);
        if (i % 3 === 1) { c.fillStyle = '#ff9a4a'; c.beginPath(); c.ellipse(x, y - 6, 9, 7, 0, 0, TAU); c.fill(); c.fillStyle = '#ffe08a'; c.beginPath(); c.moveTo(x - 5, y - 8); c.lineTo(x - 2, y - 5); c.lineTo(x - 6, y - 4); c.fill(); c.beginPath(); c.moveTo(x + 5, y - 8); c.lineTo(x + 2, y - 5); c.lineTo(x + 6, y - 4); c.fill(); c.fillStyle = '#5a8a4a'; c.fillRect(x - 1, y - 16, 3, 4); }
        else { c.fillStyle = 'rgba(92,70,130,1)'; c.beginPath(); c.moveTo(x - 8, y + 2); c.lineTo(x - 8, y - 14); c.arc(x, y - 14, 8, Math.PI, 0); c.lineTo(x + 8, y + 2); c.fill(); c.fillStyle = 'rgba(130,108,170,0.8)'; c.fillRect(x - 1, y - 16, 2, 9); c.fillRect(x - 4, y - 13, 8, 2); } }
    });
    P.fog = mk(512, 96, (c, w, h) => { for (let i = 0; i < 26; i++) { const x = rnd() * w, y = h * (0.35 + rnd() * 0.4), r = 20 + rnd() * 40; for (const dx of [0, -w, w]) { const g = c.createRadialGradient(x + dx, y, 0, x + dx, y, r); g.addColorStop(0, 'rgba(240,226,255,0.55)'); g.addColorStop(1, 'rgba(240,226,255,0)'); c.fillStyle = g; c.fillRect(x + dx - r, y - r, r * 2, r * 2); } } });
    P.bats = []; for (let i = 0; i < 7; i++) P.bats.push({ x: rnd() * W * 1.5, y: H * (0.12 + rnd() * 0.45), s: 0.6 + rnd() * 0.8, v: 18 + rnd() * 30, p: rnd() * TAU });
    P.glow = mk(64, 64, (c) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
  }
  function tick() { const now = performance.now(); const dt = P.last ? Math.min(0.05, (now - P.last) / 1000) : 0.016; P.last = now;
    if (!P.lock) { if (!P.t0) P.t0 = now; P.fr++; if (now - P.t0 > 2000) { const fps = P.fr * 1000 / (now - P.t0); if (fps < 30 && P.q > 1) P.q--; else if (fps < 20 && P.q > 0) P.q--; else if (fps > 55 && P.q < 2) P.q++; P.fr = 0; P.t0 = now; } }
    return dt; }
  function tile(ctx, img, x0, y, w, h, off, vx, vw) { const tw = w; let x = x0 - ((off % tw) + tw) % tw; while (x < vx + vw) { ctx.drawImage(img, x, y, tw, h); x += tw; } }
  function bat(ctx, x, y, s, f) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.beginPath(); ctx.moveTo(0, 0);
    const w = 6 + 4 * f; ctx.quadraticCurveTo(-6, -8 * f, -14, -2 * f - 2); ctx.quadraticCurveTo(-10, 1, -12, 4); ctx.quadraticCurveTo(-6, 2, -3, 4); ctx.lineTo(0, 2);
    ctx.lineTo(3, 4); ctx.quadraticCurveTo(6, 2, 12, 4); ctx.quadraticCurveTo(10, 1, 14, -2 * f - 2); ctx.quadraticCurveTo(6, -8 * f, 0, 0); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 1, 2.6, 3.6, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  // capas de fondo: se llama dentro de drawSky, en coordenadas lógicas del juego
  P.back = function (ctx, vx, vy, vw, vh, LW, LH, playing, motionOff) {
    const dt = tick(); if (!P.built) build(LW, LH); if (!motionOff) { P.t += dt; P.px += dt * (playing ? 1 : 0.25); }
    const t = P.t, px = P.px * 60, bot = vy + vh;
    // 1) estrellas centelleantes (capa más lejana)
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const s of P.stars) { const x = vx + (((s.x - px * 0.04) % (vw + 40)) + vw + 40) % (vw + 40) - 20, y = vy + s.y * (vh / LH); const a = 0.25 + 0.55 * Math.max(0, Math.sin(t * s.s + s.p));
      ctx.globalAlpha = a; ctx.fillStyle = '#fff6e8'; ctx.fillRect(x - s.r / 2, y - s.r / 2, s.r, s.r); if (s.r > 1.3 && P.q > 1) { ctx.globalAlpha = a * 0.5; ctx.fillRect(x - s.r * 2.5, y - 0.4, s.r * 5, 0.8); ctx.fillRect(x - 0.4, y - s.r * 2.5, 0.8, s.r * 5); } }
    // 2) rayos de luna
    if (P.q > 0) { const mx = 122, my = 169; ctx.globalAlpha = 0.06 + 0.02 * Math.sin(t * 0.6); ctx.fillStyle = '#fff1d8';
      for (let i = 0; i < 5; i++) { const a = 0.55 + i * 0.22 + Math.sin(t * 0.15 + i) * 0.04; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + Math.cos(a - 0.05) * 900, my + Math.sin(a - 0.05) * 900); ctx.lineTo(mx + Math.cos(a + 0.05) * 900, my + Math.sin(a + 0.05) * 900); ctx.fill(); }
      ctx.globalAlpha = 0.35 + 0.1 * Math.sin(t); ctx.drawImage(P.glow, mx - 70, my - 70, 140, 140); }
    ctx.restore();
    // 3) murciélagos lejanos (pequeños y lentos)
    ctx.fillStyle = 'rgba(70,44,104,0.75)';
    for (const b of P.bats) { b.x -= b.v * dt * (motionOff ? 0 : 1); if (b.x < vx - 40) { b.x = vx + vw + 40 + Math.random() * 200; b.y = vy + vh * (0.1 + Math.random() * 0.45); }
      bat(ctx, b.x, b.y + Math.sin(t * 2 + b.p) * 8, b.s, Math.sin(t * 14 + b.p) * 0.5 + 0.5); }
    // 4) colinas lejanas con castillo
    const fh = 260 * (vw / 840 > 1 ? vw / 840 : 1) * 0.85; tile(ctx, P.far, vx, bot - fh, 840 * fh / 260, fh, px * 0.18, vx, vw);
    // 5) niebla media
    if (P.q > 0) { ctx.globalAlpha = 0.7; tile(ctx, P.fog, vx, bot - fh * 0.55, 512 * 1.6, 96 * 1.6, px * 0.35 + t * 8, vx, vw); ctx.globalAlpha = 1; }
    // 6) colinas cercanas con lápidas y calabazas
    const nh = 200 * 0.75; tile(ctx, P.near, vx, bot - nh, 840 * 0.75, nh, px * 0.6, vx, vw);
    // 7) niebla baja
    if (P.q > 0) { ctx.globalAlpha = 0.85; tile(ctx, P.fog, vx, bot - 90, 512 * 1.2, 96 * 1.2, px * 0.9 + t * 14, vx, vw); ctx.globalAlpha = 1; }
  };
  // partículas al aletear y al puntuar
  P.flap = function (x, y) { if (P.q < 1) return; const n = P.q > 1 ? 12 : 6;
    for (let i = 0; i < n; i++) { const a = Math.PI * 0.5 + (Math.random() - 0.5) * 1.6, s = 40 + Math.random() * 90; P.fx.push({ x: x - 6, y: y + 8, vx: Math.cos(a) * s * 0.6 - 70, vy: Math.sin(a) * s, r: 2 + Math.random() * 3.5, life: 0.5 + Math.random() * 0.4, max: 0.9, c: Math.random() < 0.5 ? '#bfe6ff' : '#e6c8ff', g: -30 }); }
    P.rings.push({ x: x - 4, y: y + 10, r: 6, life: 0.35, max: 0.35, c: '#ffffff' }); };
  P.score = function (x, y) { const n = P.q > 1 ? 26 : 12;
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = 60 + Math.random() * 160; P.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 1.5 + Math.random() * 3, life: 0.6 + Math.random() * 0.5, max: 1.1, c: ['#ffe56b', '#fff4c0', '#ffb3d9', '#b8f0ff'][i % 4], g: 120, star: i % 3 === 0 }); }
    P.rings.push({ x, y, r: 10, life: 0.5, max: 0.5, c: '#ffe56b' }); P.rings.push({ x, y, r: 4, life: 0.35, max: 0.35, c: '#ffffff' }); };
  P.front = function (ctx) { const dt = Math.min(0.05, P.last ? (performance.now() - (P.lastF || P.last)) / 1000 : 0.016); P.lastF = performance.now();
    if (P.fx.length > 140) P.fx.splice(0, P.fx.length - 140);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const r of P.rings) { r.life -= dt; const e = 1 - r.life / r.max; ctx.globalAlpha = Math.max(0, r.life / r.max) * 0.8; ctx.strokeStyle = r.c; ctx.lineWidth = 3 * (1 - e) + 0.5; ctx.beginPath(); ctx.arc(r.x, r.y, r.r + e * 34, 0, TAU); ctx.stroke(); }
    for (const p of P.fx) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.vx *= 0.97; const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a * 0.5; ctx.drawImage(P.glow || ctx.canvas, p.x - p.r * 3, p.y - p.r * 3, p.r * 6, p.r * 6);
      ctx.globalAlpha = a; ctx.fillStyle = p.c; if (p.star) { ctx.beginPath(); const r = p.r * 1.8; ctx.moveTo(p.x, p.y - r); ctx.quadraticCurveTo(p.x, p.y, p.x + r, p.y); ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + r); ctx.quadraticCurveTo(p.x, p.y, p.x - r, p.y); ctx.quadraticCurveTo(p.x, p.y, p.x, p.y - r); ctx.fill(); } else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); } }
    ctx.restore(); P.fx = P.fx.filter(p => p.life > 0); P.rings = P.rings.filter(r => r.life > 0); };
  window.FGParallax = P;
})();
