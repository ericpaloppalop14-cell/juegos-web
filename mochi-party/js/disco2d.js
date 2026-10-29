(() => {
// Disco en 2D (o40): peluca rubia con mechones, gafas redondas de montura dorada fina y lacito azul — igual que el modelo 3D
function discoEars(c, w, hh, r) { c.fillStyle = '#f7a3b6'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * w * .42, -hh * .72); c.lineTo(s * w * .78, -hh * 1.12); c.lineTo(s * w * .86, -hh * .5); c.closePath(); c.fill(); } }
function discoBola(c, w, hh, r, t) {
  t = t || 0; c.save(); const R = Math.min(w * .62, r * .5), cy = -hh * .98;
  c.translate(0, cy);
  c.strokeStyle = '#aab4d8'; c.lineWidth = r * .03; c.beginPath(); c.arc(0, -R * 1.18, R * .16, 0, 7); c.stroke(); c.fillStyle = '#aab4d8'; c.fillRect(-R * .14, -R * 1.05, R * .28, R * .12);
  c.save(); c.beginPath(); c.arc(0, 0, R, 0, 7); c.clip();
  const g = c.createRadialGradient(-R * .4, -R * .45, 0, 0, 0, R * 1.1); g.addColorStop(0, '#ffffff'); g.addColorStop(.5, '#cdd7f3'); g.addColorStop(1, '#8b97c4'); c.fillStyle = g; c.fillRect(-R, -R, R * 2, R * 2);
  const pal = ['#ffffff', '#e4ecff', '#ffdcf0', '#d3ecff', '#ece2ff', '#bcc8ea']; const N = 7, off = (t * .5) % 1;
  for (let i = 0; i < N * 2; i++) for (let j = 0; j < N; j++) { const u = ((i / (N * 2) + off) % 1) * 2 - 1, v = j / N * 2 - 1, x = Math.sin(u * Math.PI / 2 * 1.0) * R * Math.sqrt(Math.max(0, 1 - v * v)), y = v * R, wd = R * .26 * Math.cos(u * Math.PI / 2) * Math.sqrt(Math.max(.1, 1 - v * v));
    if (u > .98 || u < -.98) continue; const h = Math.abs(Math.sin((i * 7 + j * 13) * 12.9898) * 43758.5453) % 1; c.fillStyle = pal[Math.floor(h * pal.length)]; c.globalAlpha = .55 + h * .4; c.fillRect(x - wd / 2, y - R * .13, Math.max(1, wd - 1), R * .26 - 1); }
  c.globalAlpha = 1; c.restore();
  c.strokeStyle = 'rgba(70,60,120,.5)'; c.lineWidth = r * .02; c.beginPath(); c.arc(0, 0, R, 0, 7); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.ellipse(-R * .38, -R * .42, R * .16, R * .08, -.7, 0, 7); c.fill();
  // dos destellos discretos
  for (let i = 0; i < 2; i++) { const a = t * .9 + i * 3.1, k = Math.max(0, Math.sin(t * 2.2 + i * 2)), x = Math.cos(a) * R * 1.15, y = Math.sin(a) * R * .5 - R * .1, s = r * .03 * k; c.fillStyle = 'rgba(255,255,255,' + (.6 * k) + ')'; c.beginPath(); c.moveTo(x, y - s * 2); c.lineTo(x + s, y); c.lineTo(x, y + s * 2); c.lineTo(x - s, y); c.closePath(); c.fill(); }
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
window.Disco2D = { discoEars, discoBola, discoShades, discoBow };
})();
