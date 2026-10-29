// ======================================================================
//  MOCHI PARTY · horizonte con parallax (noche 3, 25-10-2026)
//  3 capas de siluetas lejanas (colinas, montañas, dunas, selva, dulces, coral, nubes de sueño…)
//  + una capa de nubes que se mueve sola. Cada capa sigue a la cámara a distinta velocidad → profundidad.
//  Todo sin niebla, sin escribir profundidad y detrás del juego: no toca la jugabilidad.
// ======================================================================
import * as THREE from 'three';
import { CHARS } from './data.js';
import { makeCharacter, animCharacter, glowTex } from './gfx.js?v=o45';
const TAU = Math.PI * 2;
const C = (h) => new THREE.Color(h);
const css = (c, a = 1) => `rgba(${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0},${a})`;
let sd = 9; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647; // propio: no altera Math.random
const lo = () => innerWidth * innerHeight < 300000;
// perfil periódico (encaja al dar la vuelta): suma de senos con frecuencias enteras
function prof(n, amp, seed) { const f = [], k = [2, 3, 5, 7, 11, 13, 17]; for (let i = 0; i < k.length; i++) f.push([k[i] + (seed % 3), R() * TAU, 1 / (i + 1) ** 1.1]); return u => { let v = 0; for (const [q, p, a] of f) v += Math.sin(u * TAU * q * n + p) * a; return v * amp; }; }
function layerTex(style, i, col, rim, W = 2048, H = 256) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
  const base = H * (.62 - i * .06), P = prof(1, H * (.07 + i * .02), i * 7 + style.length);
  const top = css(col), bot = css(col.clone().lerp(C('#ffffff'), .1));
  const fill = path => { const g = x.createLinearGradient(0, H * .2, 0, H); g.addColorStop(0, top); g.addColorStop(1, bot); x.fillStyle = g; x.beginPath(); x.moveTo(0, H); path(); x.lineTo(W, H); x.closePath(); x.fill(); };
  const ridge = (yf) => { for (let px = 0; px <= W; px += 4) x.lineTo(px, yf(px / W)); };
  const rimLine = (yf, w = 3, a = .55) => { x.strokeStyle = css(rim, a); x.lineWidth = w; x.beginPath(); for (let px = 0; px <= W; px += 4) { const y = yf(px / W) + w * .5; px ? x.lineTo(px, y) : x.moveTo(px, y); } x.stroke(); };
  if (style === 'mountains' || style === 'volcan') {
    // picos: valor absoluto de senos → crestas afiladas
    const Pk = u => { let v = 0; [3, 5, 8, 13].forEach((q, j) => { v += (1 - Math.abs(Math.sin(u * Math.PI * q + j * 1.7 + i))) ** 2 * (1 / (j + 1)); }); return v; };
    const yf = u => base + H * .12 - Pk(u) * H * (.28 + i * .04);
    fill(() => ridge(yf));
    if (style === 'mountains') { x.save(); x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(255,255,255,.92)'; x.beginPath(); x.moveTo(0, 0); for (let px = 0; px <= W; px += 4) { const u = px / W, y = yf(u); x.lineTo(px, Math.min(y + 26 + Math.sin(u * 300) * 6, base - H * .02)); } x.lineTo(W, 0); x.fill(); x.restore(); }
    else { x.save(); x.globalCompositeOperation = 'source-atop'; for (let k = 0; k < 7; k++) { const px = (k + .5) / 7 * W, g = x.createLinearGradient(px, 0, px, H); g.addColorStop(0, 'rgba(255,140,40,.0)'); g.addColorStop(.35, 'rgba(255,150,50,.75)'); g.addColorStop(1, 'rgba(255,80,40,0)'); x.fillStyle = g; x.fillRect(px - 5, 0, 10, H); } x.restore(); }
    rimLine(yf, 2.5, style === 'volcan' ? .7 : .5);
  } else if (style === 'dunes') {
    const yf = u => base - (Math.sin(u * TAU * 3 + i) * .5 + .5) ** 1.6 * H * .2 - P(u) * .3;
    fill(() => ridge(yf)); rimLine(yf, 3, .6);
    if (i === 1) for (let k = 0; k < 3; k++) { const px = (k * .33 + .1) * W, s = 70 + k * 20, y = yf(px / W) + 6; x.fillStyle = top; x.beginPath(); x.moveTo(px - s, y); x.lineTo(px, y - s * .9); x.lineTo(px + s, y); x.fill(); x.fillStyle = css(rim, .35); x.beginPath(); x.moveTo(px, y - s * .9); x.lineTo(px + s, y); x.lineTo(px + s * .35, y); x.fill(); }
  } else if (style === 'jungle' || style === 'candy' || style === 'hills' || style === 'coral') {
    const yf = u => base - P(u) - H * .04; fill(() => ridge(yf)); rimLine(yf, 3, .5);
    // copas / dulces / corales sobre la cresta
    const n = 60 - i * 12; x.fillStyle = top;
    for (let k = 0; k < n; k++) { const u = (k + R() * .6) / n, px = u * W, y = yf(u) + 4, s = (14 + R() * 22) * (1 + i * .25);
      if (style === 'jungle') { x.beginPath(); x.arc(px, y - s * .6, s, 0, TAU); x.arc(px + s * .7, y - s * .3, s * .75, 0, TAU); x.fill(); if (R() < .3) { x.fillRect(px - 2, y - s * 3, 4, s * 2.4); for (let j = 0; j < 5; j++) { x.beginPath(); x.ellipse(px + Math.cos(j * 1.25) * s * .7, y - s * 3 + Math.sin(j * 1.25) * s * .25, s * .8, s * .2, j * 1.25, 0, TAU); x.fill(); } } }
      else if (style === 'candy') { if (R() < .45) { x.fillRect(px - 2, y - s * 2.2, 4, s * 2.2); x.beginPath(); x.arc(px, y - s * 2.4, s * .7, 0, TAU); x.fill(); x.strokeStyle = css(rim, .45); x.lineWidth = 3; x.beginPath(); x.arc(px, y - s * 2.4, s * .4, 0, 5); x.stroke(); } else { x.beginPath(); x.arc(px, y - s * .3, s * .8, Math.PI, 0); x.fill(); } }
      else if (style === 'coral') { x.strokeStyle = top; x.lineCap = 'round'; x.lineWidth = s * .25; x.beginPath(); x.moveTo(px, y); x.quadraticCurveTo(px + s * .6, y - s * 2, px + Math.sin(k) * s * .5, y - s * 3.2); x.stroke(); }
      else if (R() < .35) { x.fillRect(px - 2, y - s * 1.4, 4, s * 1.4); x.beginPath(); x.arc(px, y - s * 1.5, s * .55, 0, TAU); x.arc(px + s * .3, y - s * 1.2, s * .4, 0, TAU); x.fill(); } }
  } else if (style === 'space') {
    const yf = u => base + H * .06 - Math.abs(P(u)) * .8; fill(() => ridge(yf)); rimLine(yf, 2, .8);
    for (let k = 0; k < 24; k++) { const px = R() * W, y = yf(px / W) + 3, s = 10 + R() * 26; x.fillStyle = top; x.beginPath(); x.moveTo(px - s * .3, y); x.lineTo(px, y - s * 1.6); x.lineTo(px + s * .3, y); x.fill(); x.fillStyle = css(rim, .5); x.beginPath(); x.moveTo(px, y - s * 1.6); x.lineTo(px + s * .3, y); x.lineTo(px + s * .08, y); x.fill(); }
  } else if (style === 'dream') {
    const yf = u => base - P(u) * .6; x.fillStyle = top; fill(() => ridge(yf));
    for (let k = 0; k < 40; k++) { const px = (k / 40) * W, y = yf(px / W), s = 26 + R() * 30; x.beginPath(); x.arc(px, y, s, 0, TAU); x.fill(); }
    if (i === 0) for (let k = 0; k < 4; k++) { const px = (k / 4 + .12) * W, y = yf(px / W) - 20; x.fillRect(px - 18, y - 90, 36, 90); x.fillRect(px - 50, y - 50, 22, 50); x.fillRect(px + 28, y - 60, 22, 60); x.beginPath(); x.moveTo(px - 24, y - 90); x.lineTo(px, y - 130); x.lineTo(px + 24, y - 90); x.fill(); }
    rimLine(yf, 3, .4);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
function cloudTex(dark) {
  const W = 2048, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
  for (let k = 0; k < 14; k++) { const cx = (k + .5) / 14 * W + (R() - .5) * 60, cy = H * (.35 + R() * .35), s = 30 + R() * 40;
    for (let j = 0; j < 6; j++) { const px = cx + (j - 2.5) * s * .7, py = cy - Math.sin(j / 5 * Math.PI) * s * .5, r = s * (.6 + Math.sin(j / 5 * Math.PI) * .5);
      for (const ox of [0, -W, W]) { const g = x.createRadialGradient(px + ox, py, 0, px + ox, py, r); g.addColorStop(0, dark ? 'rgba(200,170,255,.35)' : 'rgba(255,255,255,.95)'); g.addColorStop(.7, dark ? 'rgba(180,150,255,.18)' : 'rgba(255,250,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(px + ox, py, r, 0, TAU); x.fill(); } } }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
}

// ---- cielo vivo: mochis en globo / paracaídas / medusas flotando a lo lejos (decorado, no toca la jugabilidad) ----
function cieloVivo(dark, lowRes) {
  const g = new THREE.Group(); g.name = 'cieloVivo'; const items = [];
  const n = lowRes ? 7 : 12, pal = ['#ff7aa8', '#7ee3c4', '#8fd0ff', '#ffd25a', '#b9a2f7', '#ff9d6a'];
  for (let i = 0; i < n; i++) {
    const ch = CHARS[i % CHARS.length], c = makeCharacter(ch, { lite: true }), it = new THREE.Group(), col = new THREE.Color(pal[i % pal.length]), a = i / n * TAU + R() * .4, rad = 62 + R() * 55, y = 14 + R() * 34, kind = i % 3;
    c.scale.setScalar(2.4); c.position.y = -3.4; it.add(c);
    const matM = new THREE.MeshToonMaterial({ color: col, fog: false });
    if (kind < 2) { // globo
      const b = new THREE.Mesh(new THREE.SphereGeometry(3.6, 14, 10), matM); b.position.y = 5.2; b.scale.y = 1.12; it.add(b);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 5, 3), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false })); st.position.y = 1.4; it.add(st);
      const hl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#ffffff'), transparent: true, opacity: .6, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); hl.scale.setScalar(3); hl.position.set(-1.2, 6.6, 2.4); it.add(hl);
    } else { // paracaídas
      const b = new THREE.Mesh(new THREE.SphereGeometry(4.2, 14, 8, 0, TAU, 0, Math.PI * .5), matM); b.material.side = THREE.DoubleSide; b.position.y = 5; it.add(b);
      for (const sx of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 5.2, 3), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false })); l.position.set(sx * 2, 2.4, 0); l.rotation.z = sx * -.38; it.add(l); }
    }
    it.userData = { a, rad, y, sp: (R() < .5 ? -1 : 1) * (.012 + R() * .012), ph: R() * TAU, c, i }; g.add(it); items.push(it);
  }
  g.userData.update = (t, cam) => { g.position.set(cam.position.x * .9, 0, cam.position.z * .9);
    for (const it of items) { const u = it.userData, a = u.a + t * u.sp; it.position.set(Math.cos(a) * u.rad, u.y + Math.sin(t * .6 + u.ph) * 1.6, Math.sin(a) * u.rad); it.rotation.z = Math.sin(t * .8 + u.ph) * .06; it.lookAt(g.position.x * 0, it.position.y, 0); try { animCharacter(u.c, t + u.i, .6, 'happy'); } catch (e) {} } };
  return g;
}
const STY = { espacio: 'space', desierto: 'dunes', nieve: 'mountains', mar: 'coral', selva: 'jungle', dulces: 'candy', suenos: 'dream', volcan: 'volcan' };
// sky: la cúpula; top/mid/bot sus colores; mk: mundo (opcional)
export function horizonte(scene, sky, top, mid, bot, mk) {
  if (/nohz/.test(location.search)) return null;
  const style = STY[mk] || (mk || 'hills'); const T = C(top), M = C(mid), B = C(bot);
  const dark = T.getHSL({}).l < .3;
  const g = new THREE.Group(); g.name = 'horizonte'; scene.add(g);
  const nL = lo() ? 2 : 3, L = [];
  for (let i = 0; i < nL; i++) {
    const far = (nL - 1 - i) / Math.max(1, nL - 1); // 1 = la más lejana
    const col = B.clone().lerp(M, .35).lerp(T, .12 + (1 - far) * .3).lerp(C(dark ? '#140a30' : '#7a4a9a'), (1 - far) * (dark ? .45 : .16) + .03); if (!dark) col.lerp(C('#ffffff'), far * .25);
    const rim = dark ? C(mid).lerp(C('#ffffff'), .4) : C('#fff8f0');
    const r = 430 - i * 60, h = r * (.2 - i * .015);
    const mat = new THREE.MeshBasicMaterial({ map: layerTex(style, i, col, rim), transparent: true, depthWrite: false, fog: false, side: THREE.BackSide });
    mat.map.repeat.x = 2 + i; const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 72, 1, true), mat);
    m.position.y = h * .5 - 6 - i * 2; m.renderOrder = -0.9 + i * .01; m.frustumCulled = false; m.rotation.y = i * 1.3;
    const lay = new THREE.Group(); lay.add(m); g.add(lay); L.push({ lay, k: .92 - i * .1 });
  }
  // nubes que pasan solas (o polvo de estrellas en mundos oscuros)
  const cm = new THREE.MeshBasicMaterial({ map: cloudTex(dark), transparent: true, depthWrite: false, fog: false, side: THREE.BackSide, opacity: dark ? .7 : .85 });
  cm.map.repeat.x = 2; const cl = new THREE.Mesh(new THREE.CylinderGeometry(470, 470, 150, 72, 1, true), cm); cl.position.y = 95; cl.renderOrder = -0.95; cl.frustumCulled = false;
  const cg = new THREE.Group(); cg.add(cl); g.add(cg);
  const cv = cieloVivo(dark, lo()); g.add(cv);
  let last = performance.now();
  const prev = sky.onBeforeRender;
  sky.onBeforeRender = function (r, s, cam) { prev && prev.apply(this, arguments);
    const now = performance.now(), dt = Math.min(.1, (now - last) / 1000); last = now;
    for (const l of L) l.lay.position.set(cam.position.x * l.k, 0, cam.position.z * l.k);
    cv.userData.update(now / 1000, cam);
    cg.position.set(cam.position.x * .97, 0, cam.position.z * .97); cm.map.offset.x += dt * .004; };
  return g;
}
