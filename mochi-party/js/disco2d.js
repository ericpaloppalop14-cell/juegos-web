(() => {
// Disco en 2D (o40): peluca rubia con mechones, gafas redondas de montura dorada fina y lacito azul — igual que el modelo 3D
function discoEars(c, w, hh, r) { c.fillStyle = '#f7a3b6'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * w * .42, -hh * .72); c.lineTo(s * w * .78, -hh * 1.12); c.lineTo(s * w * .86, -hh * .5); c.closePath(); c.fill(); } }
function discoIce(c, w, hh, r, t) {
  t = t || 0; c.save(); const k = .5; c.translate(0, -hh * .78); c.scale(k, k);
  const sc = [['#ff8fb6', '#e5628f', -hh * .1, w * .98, hh * .5], ['#8fe9cc', '#5ccaa4', -hh * .72, w * .78, hh * .46], ['#fff1c8', '#f1d495', -hh * 1.2, w * .62, hh * .42]];
  const blob = (col, dk, cy, rx, ry) => { const g = c.createRadialGradient(-rx * .35, cy - ry * .45, 0, 0, cy, rx * 1.1); g.addColorStop(0, '#fff'); g.addColorStop(.18, col); g.addColorStop(1, dk); c.fillStyle = g;
    c.beginPath(); c.ellipse(0, cy, rx, ry, 0, Math.PI, 0); for (let i = 0; i <= 8; i++) { const x = rx - i * rx / 4, y = cy + ry * .12 + (i % 2 ? r * .05 : -r * .01); c.lineTo(x, y); } c.closePath(); c.fill(); };
  // chorretones de arriba abajo
  for (let q = 2; q >= 0; q--) { const [col, dk, cy, rx, ry] = sc[q]; blob(col, dk, cy, rx, ry);
    c.fillStyle = dk; const nd = q === 0 ? 7 : 5; for (let d = 0; d < nd; d++) { const x = (d / (nd - 1) - .5) * rx * 1.7, len = r * (.1 + .09 * ((d * 7 + q * 3) % 4)) * (q === 0 ? 1.5 : 1), y0 = cy + ry * .08, ww = r * .05;
      c.beginPath(); c.roundRect(x - ww, y0, ww * 2, len, ww); c.fill(); c.beginPath(); c.arc(x, y0 + len, ww * 1.35, 0, 7); c.fill(); }
    // virutas
    const pal = ['#ff5f9e', '#ffd84a', '#5fd0ff', '#fff', '#a98bff', '#6af0b0']; for (let d = 0; d < 16; d++) { const a = (d * 2.399 + q) % 6.28, x = Math.cos(a) * rx * .8 * ((d % 5) / 5 + .25), y = cy - Math.abs(Math.sin(a)) * ry * .8; c.save(); c.translate(x, y); c.rotate(d); c.fillStyle = pal[(d + q) % 6]; c.fillRect(-r * .04, -r * .01, r * .08, r * .022); c.restore(); }
    c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(-rx * .45, cy - ry * .45, rx * .16, ry * .1, -.5, 0, 7); c.fill(); }
  // barquillo y guinda
  c.save(); c.translate(w * .3, -hh * 1.5); c.rotate(.4); c.fillStyle = '#e8c27a'; c.fillRect(-r * .06, -r * .38, r * .12, r * .5); c.strokeStyle = '#b98a45'; c.lineWidth = r * .015; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-r * .06, -r * .38 + i * r * .1); c.lineTo(r * .06, -r * .28 + i * r * .1); c.stroke(); } c.restore();
  c.fillStyle = '#e0123a'; c.beginPath(); c.arc(0, -hh * 1.72, r * .13, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(-r * .05, -hh * 1.72 - r * .05, r * .035, 0, 7); c.fill(); c.strokeStyle = '#3a8a3a'; c.lineWidth = r * .025; c.beginPath(); c.moveTo(0, -hh * 1.72 - r * .12); c.quadraticCurveTo(r * .05, -hh * 1.72 - r * .3, r * .14, -hh * 1.72 - r * .28); c.stroke();
  // brillantina
  c.fillStyle = '#fff'; for (let i = 0; i < 6; i++) { const a = t * .8 + i * 1.05, x = Math.sin(a * 1.3 + i) * w * .8, y = -hh * 1.5 + ((a * .3 + i * .17) % 1) * hh * 2.4, s = r * .03 * (1 + Math.sin(t * 9 + i) * .5); c.globalAlpha = .75; c.beginPath(); c.moveTo(x, y - s * 2); c.lineTo(x + s, y); c.lineTo(x, y + s * 2); c.lineTo(x - s, y); c.closePath(); c.fill(); } c.globalAlpha = 1;
  c.restore();
}
function discoShades(c, ex, ey, er, r) {
  const lr = er * 2.05;
  for (const s of [-1, 1]) { const x = s * ex * .98; const g = c.createLinearGradient(x - lr, ey - lr, x + lr * .6, ey + lr); g.addColorStop(0, '#8a6a68'); g.addColorStop(.4, '#4a3436'); g.addColorStop(1, '#241a1a');
    c.fillStyle = g; c.beginPath(); c.arc(x, ey, lr, 0, 7); c.fill(); c.strokeStyle = '#c9b196'; c.lineWidth = Math.max(1.6, r * .04); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(x - lr * .38, ey - lr * .4, lr * .22, lr * .1, -.7, 0, 7); c.fill(); }
  c.strokeStyle = '#c9b196'; c.lineWidth = Math.max(1, r * .02); c.beginPath(); c.moveTo(-ex + lr, ey - lr * .1); c.quadraticCurveTo(0, ey - lr * .45, ex - lr, ey - lr * .1); c.stroke();
}
function discoBow(c, x, y, r) {
  c.save(); c.translate(x, y); c.rotate(-.25); c.fillStyle = '#6fa6ea';
  for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * r * .13, 0, r * .13, r * .085, s * .18, 0, 7); c.fill(); }
  c.fillStyle = '#4a82d2'; c.beginPath(); c.ellipse(0, 0, r * .05, r * .055, 0, 0, 7); c.fill(); c.fillStyle = '#6fa6ea'; c.beginPath(); c.ellipse(-r * .03, r * .09, r * .03, r * .08, .3, 0, 7); c.fill(); c.beginPath(); c.ellipse(r * .04, r * .09, r * .03, r * .08, -.3, 0, 7); c.fill();
  c.restore();
}
window.Disco2D = { discoEars, discoIce, discoShades, discoBow };
})();
