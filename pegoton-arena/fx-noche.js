/* fx-noche.js — mejora gráfica común (25-10-2026). Capa de ambiente (bokeh, destellos, rayos de luz, viñeta)
   con calidad automática por fps, y ayuda para 3D (entorno PMREM + luz hemisférica). No toca jugabilidad. */
(function () {
  if (window.__fxNoche) return; const Q = { lv: 2 }; window.__fxNoche = Q;
  const off = /nofx/.test(location.search); if (off) return;
  const opts = window.FX_NOCHE || {}; const tint = opts.tint || [255, 240, 255];
  const cv = document.createElement('canvas'); cv.id = 'fxNoche';
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:' + (opts.z || 5) + ';mix-blend-mode:screen';
  const vg = document.createElement('div'); vg.id = 'fxVig';
  vg.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:' + (opts.z || 5) + ';background:radial-gradient(ellipse at 50% 45%,rgba(0,0,0,0) 55%,rgba(30,0,50,' + (opts.vig ?? .22) + ') 100%)';
  const add = () => { document.body.appendChild(cv); document.body.appendChild(vg); };
  document.body ? add() : addEventListener('DOMContentLoaded', add);
  const x = cv.getContext('2d'); let W = 0, H = 0, dpr = 1;
  const rs = () => { dpr = Math.min(devicePixelRatio || 1, 1.5); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; };
  addEventListener('resize', rs); rs();
  const N = opts.n || 26, P = [];
  for (let i = 0; i < N; i++) P.push({ x: Math.random(), y: Math.random(), r: 2 + Math.random() * (i % 5 ? 5 : 16), s: .004 + Math.random() * .012, ph: Math.random() * 6.3, k: i % 5 ? 0 : 1 });
  let last = performance.now(), acc = 0, fr = 0, t0 = last;
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now; fr++; acc += dt;
    if (now - t0 > 2500) { const fps = fr / ((now - t0) / 1000); if (fps < 40 && Q.lv > 0) Q.lv--; else if (fps > 57 && Q.lv < 2) Q.lv++; fr = 0; t0 = now; cv.style.display = Q.lv ? '' : 'none'; }
    if (Q.lv && !document.hidden) {
      x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
      // rayos de luz suaves desde arriba
      if (Q.lv > 1 && opts.rays !== false) { x.save(); x.globalAlpha = .07; for (let i = 0; i < 4; i++) { const cx = W * (.15 + i * .25) + Math.sin(acc * .2 + i) * 30; const g = x.createLinearGradient(cx, 0, cx + 80, H); g.addColorStop(0, `rgba(${tint},1)`); g.addColorStop(1, `rgba(${tint},0)`); x.fillStyle = g; x.beginPath(); x.moveTo(cx - 30, 0); x.lineTo(cx + 40, 0); x.lineTo(cx + 220, H); x.lineTo(cx + 40, H); x.fill(); } x.restore(); }
      const n = Q.lv > 1 ? P.length : P.length >> 1;
      for (let i = 0; i < n; i++) { const p = P[i]; p.y -= p.s * dt * 6; if (p.y < -.05) { p.y = 1.05; p.x = Math.random(); }
        const px = (p.x + Math.sin(acc * .5 + p.ph) * .02) * W, py = p.y * H, a = (.25 + .2 * Math.sin(acc * 2 + p.ph)) * (p.k ? .5 : 1);
        if (p.k) { const g = x.createRadialGradient(px, py, 0, px, py, p.r * 2); g.addColorStop(0, `rgba(${tint},${a})`); g.addColorStop(1, `rgba(${tint},0)`); x.fillStyle = g; x.beginPath(); x.arc(px, py, p.r * 2, 0, 6.3); x.fill(); }
        else { x.fillStyle = `rgba(255,255,255,${a})`; x.beginPath(); x.moveTo(px, py - p.r); x.quadraticCurveTo(px, py, px + p.r, py); x.quadraticCurveTo(px, py, px, py + p.r); x.quadraticCurveTo(px, py, px - p.r, py); x.quadraticCurveTo(px, py, px, py - p.r); x.fill(); } }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // Ayuda 3D: entorno de cielo degradado (reflejos suaves) + luz hemisférica
  Q.mejora3D = function (THREE, renderer, scene, o) { o = o || {}; try {
    if (!scene.userData.fxHemi) { const h = new THREE.HemisphereLight(o.sky || 0xdff0ff, o.ground || 0xffd9c2, o.hemi ?? .55); scene.add(h); scene.userData.fxHemi = h; }
    if (!scene.environment && THREE.PMREMGenerator) { const pm = new THREE.PMREMGenerator(renderer); const es = new THREE.Scene();
      const geo = new THREE.SphereGeometry(10, 32, 16); const c = document.createElement('canvas'); c.width = 4; c.height = 128; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, o.top || '#bfe3ff'); gr.addColorStop(.5, o.mid || '#fff4fb'); gr.addColorStop(1, o.bot || '#ffd1e6'); g.fillStyle = gr; g.fillRect(0, 0, 4, 128);
      const tx = new THREE.CanvasTexture(c); if (THREE.SRGBColorSpace) tx.colorSpace = THREE.SRGBColorSpace;
      es.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tx, side: THREE.BackSide })));
      const l = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); l.position.set(4, 7, 3); l.material.color.multiplyScalar(6); es.add(l);
      const rt = pm.fromScene(es, .04); scene.environment = rt.texture; if ('environmentIntensity' in scene) scene.environmentIntensity = o.env ?? .45; pm.dispose(); }
  } catch (e) { console.warn('fx3D', e); } };
})();
