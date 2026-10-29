(() => {
// Disco en 2D (o40): peluca rubia con mechones, gafas redondas de montura dorada fina y lacito azul — igual que el modelo 3D
function discoEars(c, w, hh, r) { c.fillStyle = '#f7a3b6'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * w * .42, -hh * .72); c.lineTo(s * w * .78, -hh * 1.12); c.lineTo(s * w * .86, -hh * .5); c.closePath(); c.fill(); } }
function discoWig(c, w, hh, r) {
  c.save();
  const g = c.createLinearGradient(-w, -hh * 1.2, w * .6, hh * .2); g.addColorStop(0, '#f1dca8'); g.addColorStop(.45, '#dcbf82'); g.addColorStop(1, '#b8904e');
  c.fillStyle = g; c.beginPath();
  c.moveTo(-w * 1.0, hh * .18); c.bezierCurveTo(-w * 1.12, -hh * .6, -w * .7, -hh * 1.3, -w * .05, -hh * 1.24);
  c.bezierCurveTo(w * .6, -hh * 1.22, w * 1.02, -hh * .75, w * .9, -hh * .12);
  c.bezierCurveTo(w * .6, -hh * .3, w * .1, -hh * .42, -w * .35, -hh * .22); c.bezierCurveTo(-w * .6, -hh * .1, -w * .8, hh * .08, -w * 1.0, hh * .18); c.closePath(); c.fill();
  c.clip();
  for (let i = 0; i < 46; i++) { const u = i / 45, x0 = -w * .55 + u * w * .8, y0 = -hh * 1.22 + Math.sin(i * 2.1) * hh * .05, x1 = -w * 1.1 + u * w * 2.1, y1 = -hh * (.12 + .3 * Math.abs(Math.sin(i * 1.3))) + (u < .35 ? hh * .3 * (1 - u / .35) : 0);
    c.strokeStyle = i % 3 ? 'rgba(130,92,40,.28)' : 'rgba(255,246,214,.55)'; c.lineWidth = r * (i % 3 ? .012 : .016); c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2 - w * .2, (y0 + y1) / 2 - hh * .1, x1, y1); c.stroke(); }
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
window.Disco2D = { discoEars, discoWig, discoShades, discoBow };
})();
