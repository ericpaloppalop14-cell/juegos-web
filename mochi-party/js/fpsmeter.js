// MOCHI PARTY · ?fps=1 → contador de fps y ms/fotograma en pantalla (o47). Para diagnosticar en el móvil.
if (/[?&]fps=1/.test(location.search)) {
  const d = document.createElement('div'); d.id = 'fpsMeter';
  d.style.cssText = 'position:fixed;left:6px;top:calc(env(safe-area-inset-top,0px) + 6px);z-index:2147483647;pointer-events:none;font:700 11px/1.35 ui-monospace,Menlo,monospace;color:#fff;background:rgba(10,0,30,.72);padding:5px 8px;border-radius:8px;white-space:pre;text-shadow:0 1px 2px #000';
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(d)); if (document.body) document.body.appendChild(d);
  const win = []; let last = performance.now(), upd = last, worst = 0, slow = 0, tot = 0;
  const tick = t => { requestAnimationFrame(tick); const dt = t - last; last = t; if (dt > 1000) return; win.push(dt); tot++; if (dt > 33.4) slow++; if (dt > worst) worst = dt;
    if (t - upd > 500) { const n = win.length, avg = win.reduce((a, b) => a + b, 0) / n, srt = win.slice().sort((a, b) => a - b), p95 = srt[Math.floor(n * .95)] || 0, mx = srt[n - 1] || 0; upd = t; win.length = 0;
      const M = window.MP3D, i = M && M.info, r = i && i.render, cv = document.getElementById('st3d'), mode = (document.querySelector('.scr.on') || {}).id || '';
      d.textContent = Math.round(1000 / avg) + ' fps  ' + avg.toFixed(1) + ' ms/frame\np95 ' + p95.toFixed(1) + '  max ' + mx.toFixed(1) + ' ms\n>33ms: ' + slow + ' de ' + tot + '  (peor ' + worst.toFixed(0) + ')\n' + (r ? 'calls ' + r.calls + '  tris ' + (r.triangles / 1000).toFixed(0) + 'k\n' : '') + 'dpr ' + (window.devicePixelRatio || 1) + (cv ? '  3D ' + cv.width + 'x' + cv.height : '') + '\n' + mode; } };
  requestAnimationFrame(tick);
}
