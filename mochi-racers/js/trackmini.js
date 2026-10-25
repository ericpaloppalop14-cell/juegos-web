// v38: miniaturas animadas de los 4 circuitos en «Elige copa» (vista cenital 2D, ligera).
// Trazado real (pts de cada pista, Catmull-Rom centrípeta), colores del tema y karts corriendo.
import * as THREE from 'three';
import { CHARS } from './data.js';
import { cupForRace, raceNames } from './tracks2.js';

const cache = new Map();
function pathOf(cup, rev) {
  const key = (cup.base ? cup.base.id + ':' : '') + cup.track + (rev ? ':r' : '');
  if (cache.has(key)) return cache.get(key);
  let P = cup.pts.map(p => p.slice()); if (rev) P = [P[0], ...P.slice(1).reverse()];
  const curve = new THREE.CatmullRomCurve3(P.map(p => new THREE.Vector3(p[0], 0, p[1])), true, 'centripetal');
  const N = 180, pts = curve.getSpacedPoints(N).slice(0, N).map(v => [v.x, v.z]);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const r = { pts, x0, x1, y0, y1, w: P.reduce((s, p) => s + (p[3] || 18), 0) / P.length }; cache.set(key, r); return r;
}
const shade = (hex, k) => { const c = new THREE.Color(hex || '#cccccc'); return '#' + (k > 0 ? c.lerp(new THREE.Color('#ffffff'), k) : c.lerp(new THREE.Color('#2a1640'), -k)).getHexString(); };

export function createTrackMinis(host) {
  let tiles = [], raf = 0, last = 0, visible = true, t0 = performance.now();
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); loop(); }) : null;
  if (io) io.observe(host);
  function setHost(h) { if (h === host) return; if (io) { io.unobserve(host); io.observe(h); } host = h; visible = true; }
  document.addEventListener('visibilitychange', loop);

  function setCup(c, locked) {
    host.innerHTML = ''; tiles = [];
    const names = raceNames(c), dpr = Math.min(2, devicePixelRatio || 1);
    names.forEach((name, i) => {
      const cup = cupForRace(c, i), rev = i === 1, P = pathOf(cup, rev);
      const d = document.createElement('div'); d.className = 'tmini' + (locked ? ' lk' : ''); d.style.setProperty('--cc', c.color); d.style.animationDelay = (i * 0.06) + 's';
      d.innerHTML = `<canvas></canvas><div class="tmn"><b>${i + 1}</b><span>${name}</span></div>`;
      host.appendChild(d);
      const cv = d.querySelector('canvas');
      const karts = CHARS.slice(0, 5).map((ch, k) => ({ col: ch.color || '#fff', u: 0.985 - k * 0.022, sp: 0.075 + ((k * 37 + i * 11) % 7) * 0.003, lane: ((k % 3) - 1) * 0.28, ph: k * 1.7 }));
      tiles.push({ cv, ctx: cv.getContext('2d'), cup, P, karts, dpr, locked });
    });
    resize(); draw(performance.now()); loop();
  }
  function resize() { for (const T of tiles) { const r = T.cv.getBoundingClientRect(); const w = Math.max(40, Math.round(r.width * T.dpr)), h = Math.max(30, Math.round(r.height * T.dpr)); if (T.cv.width !== w || T.cv.height !== h) { T.cv.width = w; T.cv.height = h; T.bg = null; } } }
  addEventListener('resize', () => { resize(); draw(performance.now()); });

  function fit(T) { const { cv, P } = T, W = cv.width, H = cv.height, pad = 0.13 * Math.min(W, H);
    const s = Math.min((W - 2 * pad) / (P.x1 - P.x0), (H - 2 * pad - H * 0.2) / (P.y1 - P.y0));
    return { s, ox: W / 2 - (P.x0 + P.x1) / 2 * s, oy: (H * 0.4) - (P.y0 + P.y1) / 2 * s + H * 0.02 }; }
  // fondo estático (suelo + pista) dibujado una vez por tile en un lienzo aparte
  function bake(T) {
    const { cv, cup, P } = T, W = cv.width, H = cv.height, F = fit(T), b = document.createElement('canvas'); b.width = W; b.height = H; const g = b.getContext('2d');
    const space = !cup.ground, g1 = space ? (cup.sky && cup.sky[0]) || '#1a1040' : cup.ground, g2 = space ? (cup.sky && cup.sky[1]) || '#3b1f6e' : (cup.ground2 || shade(cup.ground, 0.3));
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, g1); gr.addColorStop(1, g2); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    let rs = 9 + cup.track.length; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 26; k++) { g.fillStyle = space ? 'rgba(255,255,255,' + (0.3 + rnd() * 0.6) + ')' : 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(rnd() * W, rnd() * H, (space ? 0.6 : 1.5 + rnd() * 3) * T.dpr, 0, 7); g.fill(); }
    const path = () => { g.beginPath(); P.pts.forEach(([x, y], k) => { const X = F.ox + x * F.s, Y = F.oy + y * F.s; k ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.closePath(); };
    const rw = Math.max(4 * T.dpr, P.w * F.s * 1.25); g.lineJoin = g.lineCap = 'round';
    path(); g.strokeStyle = 'rgba(40,15,60,.28)'; g.lineWidth = rw + 6 * T.dpr; g.save(); g.translate(0, 2 * T.dpr); g.stroke(); g.restore();
    path(); g.strokeStyle = cup.curbB || '#fff'; g.lineWidth = rw + 3.2 * T.dpr; g.stroke();
    path(); g.setLineDash([5 * T.dpr, 5 * T.dpr]); g.strokeStyle = cup.curbA || '#ff7fb6'; g.stroke(); g.setLineDash([]);
    path(); g.strokeStyle = cup.road || '#ffe3f0'; g.lineWidth = rw; g.stroke();
    path(); g.setLineDash([3 * T.dpr, 4 * T.dpr]); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = Math.max(1, T.dpr * 0.8); g.stroke(); g.setLineDash([]);
    // línea de meta a cuadros
    const [ax, ay] = P.pts[0], [bx, by] = P.pts[1], dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, cx = F.ox + ax * F.s, cy = F.oy + ay * F.s, hw = rw / 2, q = Math.max(1.5, hw / 3);
    g.save(); g.translate(cx, cy); g.rotate(Math.atan2(ny, nx)); for (let k = -3; k < 3; k++) for (let j = 0; j < 2; j++) { g.fillStyle = (k + j) & 1 ? '#222' : '#fff'; g.fillRect(k * q, (j - 1) * q, q, q); } g.restore();
    T.bg = b; T.F = F; T.rw = rw;
  }
  function draw(now) {
    const t = (now - t0) / 1000;
    for (const T of tiles) {
      if (!T.bg) bake(T); const { ctx: g, cv, P, F } = T, N = P.pts.length;
      g.clearRect(0, 0, cv.width, cv.height); g.drawImage(T.bg, 0, 0);
      const ks = T.karts.map(k => { const u = ((k.u + t * k.sp * (T.locked ? 0.4 : 1)) % 1 + 1) % 1, f = u * N, a = Math.floor(f) % N, b = (a + 1) % N, e = f - Math.floor(f);
        const [x1, y1] = P.pts[a], [x2, y2] = P.pts[b], x = x1 + (x2 - x1) * e, y = y1 + (y2 - y1) * e, l = Math.hypot(x2 - x1, y2 - y1) || 1, off = (k.lane + Math.sin(t * 1.3 + k.ph) * 0.12) * T.rw / F.s;
        return { k, X: F.ox + (x - (y2 - y1) / l * off) * F.s, Y: F.oy + (y + (x2 - x1) / l * off) * F.s, ang: Math.atan2(y2 - y1, x2 - x1) }; });
      const r = Math.max(3 * T.dpr, T.rw * 0.34);
      for (const o of ks) { g.save(); g.translate(o.X, o.Y); g.rotate(o.ang);
        g.fillStyle = 'rgba(40,15,60,.3)'; g.beginPath(); g.ellipse(0.5, r * 0.5, r * 1.3, r * 0.8, 0, 0, 7); g.fill();
        g.fillStyle = o.k.col; g.strokeStyle = '#fff'; g.lineWidth = Math.max(1, T.dpr * 0.9); g.beginPath(); g.roundRect ? g.roundRect(-r * 1.3, -r * 0.85, r * 2.6, r * 1.7, r * 0.7) : g.rect(-r * 1.3, -r * 0.85, r * 2.6, r * 1.7); g.fill(); g.stroke();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(r * 0.45, 0, r * 0.42, 0, 7); g.fill(); g.restore(); }
    }
  }
  function loop() {
    const run = visible && !document.hidden && host.isConnected && host.offsetParent !== null && tiles.length;
    if (!run) { cancelAnimationFrame(raf); raf = 0; return; }
    if (raf) return;
    const step = now => { raf = 0; if (!(visible && !document.hidden && host.offsetParent !== null)) return; if (now - last >= 32) { last = now; draw(now); } raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  }
  return { setCup, setHost, resume: () => { resize(); loop(); }, stop: () => { cancelAnimationFrame(raf); raf = 0; } };
}
