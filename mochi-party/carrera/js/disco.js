// ======================================================================
//  MOCHI PARTY · Disco (o40) — rehecho a partir de la imagen de referencia de Eric
//  mochi rosa de gelatina con pelito de terciopelo, peluca rubia con tupé y mechones,
//  gafas de sol redondas con montura dorada fina, lacito azul de terciopelo y boquita pequeña.
// ======================================================================
import * as THREE from 'three';

let _fuzz, _lens, _hairBase;
// terciopelo: grano fino y muy suave que se multiplica con el color del cuerpo
export function fuzzTexture() {
  if (_fuzz) return _fuzz;
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d');
  x.fillStyle = '#f4f4f4'; x.fillRect(0, 0, S, S);
  let s = 7; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 5200; i++) { const v = 205 + R() * 50 | 0, a = .12 + R() * .25; x.fillStyle = `rgba(${v},${v},${v},${a})`; x.fillRect(R() * S, R() * S, 1 + R() * 1.4, 1 + R() * 1.4); }
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(255,255,255,${.25 + R() * .4})`; x.fillRect(R() * S, R() * S, 1, 1); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 5); t.anisotropy = 4; _fuzz = t; return t;
}
// lente: marrón oscuro reflectante (cielo rosado arriba, brillo en diagonal)
function lensMat() {
  if (_lens) return _lens;
  const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d');
  const g = x.createLinearGradient(0, 0, S * .4, S); g.addColorStop(0, '#8a6a68'); g.addColorStop(.35, '#4a3436'); g.addColorStop(1, '#241a1a'); x.fillStyle = g; x.fillRect(0, 0, S, S);
  const r = x.createRadialGradient(S * .3, S * .28, 2, S * .3, S * .28, S * .5); r.addColorStop(0, 'rgba(255,220,230,.55)'); r.addColorStop(1, 'rgba(255,220,230,0)'); x.fillStyle = r; x.fillRect(0, 0, S, S);
  x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.ellipse(S * .3, S * .27, S * .13, S * .05, -.7, 0, 7); x.fill();
  x.fillStyle = 'rgba(255,230,240,.18)'; x.beginPath(); x.ellipse(S * .68, S * .74, S * .2, S * .06, -.7, 0, 7); x.fill();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; _lens = new THREE.MeshBasicMaterial({ map: t }); return _lens;
}

// ---- helado de tres bolas que gotea brillantina (o41) ----
let _waf;
function waferTex() {
  if (_waf) return _waf; const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d');
  x.fillStyle = '#e8c27a'; x.fillRect(0, 0, S, S); x.strokeStyle = '#b98a45'; x.lineWidth = 5;
  for (let k = -S; k < S * 2; k += 22) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + S, S); x.stroke(); x.beginPath(); x.moveTo(k + S, 0); x.lineTo(k, S); x.stroke(); }
  x.fillStyle = 'rgba(255,240,200,.35)'; for (let k = 0; k < 120; k++) x.fillRect(Math.random() * S, Math.random() * S, 2, 2);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; _waf = t; return t;
}
const surf = (cy, rx, ry, y) => rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2));
function buildIce(root, ud, H, lite) {
  const { toon, mesh, sph, cyl, box, bodyR, glowTex } = H;
  let sd = 5; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const ice = new THREE.Group(); ice.name = 'helado'; root.add(ice);
  const SC = [ // [color, oscuro, cy, rx, ry, nombre]
    { c: '#ff8fb6', d: '#e5628f', cy: 1.74, rx: 0.72, ry: 0.46, chip: '#d93a6a' },   // fresa
    { c: '#8fe9cc', d: '#5ccaa4', cy: 2.12, rx: 0.58, ry: 0.42, chip: '#6a4a3a' },   // menta con pepitas de chocolate
    { c: '#fff1c8', d: '#f1d495', cy: 2.45, rx: 0.46, ry: 0.38, chip: '#e0b060' } ]; // vainilla
  const mats = SC.map(o => toon(o.c, { rim: 0.7, emissive: o.c, ei: 0.08 })), matD = SC.map(o => toon(o.d, { rim: 0.6 }));
  SC.forEach((o, k) => {
    const m = mesh(sph(lite ? 16 : 28), mats[k], ice, [0, o.cy, 0], null, [o.rx, o.ry, o.rx]); ud.casters.push(m);
    // falda ondulada de la bola (borde de helado servido con cuchara)
    const n = lite ? 10 : 16; for (let a = 0; a < n; a++) { const ph = a / n * Math.PI * 2 + k, r = o.rx * (0.9 + R() * 0.06);
      mesh(sph(8), matD[k], ice, [Math.sin(ph) * r, o.cy - o.ry * 0.5 + R() * 0.03, Math.cos(ph) * r], null, [o.rx * 0.2, o.ry * 0.2, o.rx * 0.2]); }
    mesh(sph(14), mats[k], ice, [0, o.cy - o.ry * 0.5, 0], null, [o.rx * 1.0, o.ry * 0.22, o.rx * 1.0]);
    // brillo húmedo
    const hl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#ffffff'), transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending })); hl.scale.setScalar(o.rx * 0.9); hl.position.set(-o.rx * 0.5, o.cy + o.ry * 0.5, o.rx * 0.6); ice.add(hl);
  });
  // virutas de colores (instanciadas) y pepitas
  const nSp = lite ? 40 : 110, spG = new THREE.CylinderGeometry(0.014, 0.014, 0.085, 5), spM = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: H.gradient() });
  const sp = new THREE.InstancedMesh(spG, spM, nSp), dm = new THREE.Object3D(), pal = ['#ff5f9e', '#ffd84a', '#5fd0ff', '#ffffff', '#a98bff', '#6af0b0', '#ff8a3a'];
  for (let q = 0; q < nSp; q++) { const k = q % 3, o = SC[k], th = Math.acos(1 - R() * 1.45), ph = R() * Math.PI * 2, nx = Math.sin(th) * Math.sin(ph), ny = Math.cos(th), nz = Math.sin(th) * Math.cos(ph);
    dm.position.set(nx * o.rx * 1.0, o.cy + ny * o.ry * 1.0, nz * o.rx * 1.0); dm.rotation.set(R() * 3, R() * 3, R() * 3); dm.updateMatrix(); sp.setMatrixAt(q, dm.matrix); sp.setColorAt(q, new THREE.Color(pal[(q * 3 + k) % pal.length])); }
  sp.instanceColor.needsUpdate = true; ice.add(sp);
  for (let q = 0; q < (lite ? 6 : 18); q++) { const k = q % 3, o = SC[k], th = 0.3 + R() * 1.0, ph = R() * 6.28; mesh(sph(6), toon(o.chip, { rim: 0.2 }), ice, [Math.sin(th) * Math.sin(ph) * o.rx * 0.98, o.cy + Math.cos(th) * o.ry * 0.98, Math.sin(th) * Math.cos(ph) * o.rx * 0.98], null, [0.05, 0.035, 0.05]); }
  // guinda con rabito y brillo
  const ch = mesh(sph(18), toon('#e0123a', { rim: 0.9, emissive: '#7a0018', ei: 0.35 }), ice, [0.03, 2.86, 0], null, 0.16); ud.casters.push(ch);
  const stem = mesh(H.tor(0.07, 14), toon('#3a8a3a', { rim: 0.2 }), ice, [0.1, 3.06, 0], [0, 0, 2.3], [0.13, 0.13, 0.2]);
  const cl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#ffffff'), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })); cl.scale.setScalar(0.12); cl.position.set(-0.05, 2.93, 0.12); ice.add(cl);
  // barquillo clavado en la bola de arriba
  const wf = mesh(box(), toon('#ffffff', { rim: 0.3, nocache: true }), ice, [0.3, 2.82, 0.0], [0, 0.3, -0.45], [0.14, 0.7, 0.025]); wf.material.map = waferTex(); wf.material.map.repeat.set(1, 4); ud.casters.push(wf);
  // chorretones: cada bola gotea sobre la de abajo; la de abajo, sobre la cabeza y el cuerpo
  const drips = [];
  const drip = (mat, ph, yTop, len, w, R0) => {
    const g = new THREE.Group(); g.position.set(Math.sin(ph) * R0, yTop, Math.cos(ph) * R0); g.rotation.y = ph; ice.add(g);
    mesh(sph(10), mat, g, [0, -len / 2, 0], null, [w, len / 2, w * 0.5]); const bulb = mesh(sph(12), mat, g, [0, -len, 0.0], null, [w * 1.3, w * 1.45, w * 0.8]);
    const sh = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#ffffff'), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); sh.scale.setScalar(w * 1.5); sh.position.set(-w * 0.35, -len * 0.55, w * 0.5); g.add(sh);
    drips.push({ bulb, len, ph: R() * 6.28 }); return g; };
  const nD = lite ? 5 : 8;
  for (let a = 0; a < nD; a++) { const ph = a / nD * Math.PI * 2 + 0.3, len = 0.18 + R() * 0.2;
    drip(matD[2], ph, SC[2].cy - SC[2].ry * 0.35, len, 0.05 + R() * 0.02, surf(SC[1].cy, SC[1].rx, SC[1].ry, SC[2].cy - SC[2].ry * 0.35 - len * 0.5) + 0.03);        // vainilla sobre la menta
    drip(matD[1], ph + 0.4, SC[1].cy - SC[1].ry * 0.4, len + 0.1, 0.055 + R() * 0.02, surf(SC[0].cy, SC[0].rx, SC[0].ry, SC[1].cy - SC[1].ry * 0.4 - len * 0.3) + 0.03); }
  for (let a = 0; a < (lite ? 7 : 11); a++) { const ph = a / (lite ? 7 : 11) * Math.PI * 2 + 0.1, len = 0.25 + R() * 0.3, y0 = SC[0].cy - SC[0].ry * 0.42, yb = y0 - len;
    const r0 = Math.max(surf(SC[0].cy, SC[0].rx, SC[0].ry, y0), bodyR(yb + 0.05)) + 0.04; drip(matD[0], ph, y0, len, 0.065 + R() * 0.02, r0); }
  // brillantina: chorretones iridiscentes por el cuerpo + purpurina flotando
  const glM = new THREE.MeshToonMaterial({ color: 0xffffff, emissive: 0xff7fd0, emissiveIntensity: 0.55, gradientMap: H.gradient() });
  const gl = new THREE.Group(); root.add(gl);
  for (const [ph, y0, len] of [[-1.35, 1.12, 0.5], [1.45, 1.1, 0.42], [-2.2, 1.0, 0.55], [2.3, 1.05, 0.4], [0.2, 0.0, 0]]) { if (!len) continue; const w = 0.045, r0 = bodyR(y0 - len * 0.5) + 0.03;
    const g = new THREE.Group(); g.position.set(Math.sin(ph) * r0, y0, Math.cos(ph) * r0); g.rotation.y = ph; gl.add(g);
    mesh(sph(10), glM, g, [0, -len / 2, 0], null, [w, len / 2, w * 0.45]); mesh(sph(12), glM, g, [0, -len, 0], null, [w * 1.4, w * 1.6, w * 0.8]); }
  const det = new THREE.Group(); det.name = 'detalle'; root.add(det);
  const sparks = []; for (let q = 0; q < (lite ? 6 : 16); q++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(['#ffffff', '#ffd1f0', '#d6f6ff', '#fff6b0'][q % 4]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(0.18 + R() * 0.16); det.add(s); sparks.push({ s, ph: R() * 6.28, a: R() * 6.28, r: 0.7 + R() * 0.5, sp: 0.4 + R() * 0.5 }); }
  ud.fx.push(t => {
    ice.rotation.z = Math.sin(t * 1.7) * 0.025; ice.rotation.x = Math.cos(t * 1.3) * 0.02; glM.emissive.setHSL((t * 0.15) % 1, 0.9, 0.55);
    for (const d of drips) { const k = 1 + Math.sin(t * 2.2 + d.ph) * 0.12; d.bulb.scale.y = d.bulb.userData.sy || (d.bulb.userData.sy = d.bulb.scale.y); d.bulb.scale.y *= k; d.bulb.position.y = -d.len * (1 + (k - 1) * 0.4); }
    for (const p of sparks) { const k = (t * p.sp + p.ph) % 1; p.s.position.set(Math.sin(p.a + t * 0.4) * p.r, 3.0 - k * 2.9, Math.cos(p.a + t * 0.4) * p.r * 0.8); p.s.material.opacity = Math.sin(k * Math.PI) * (0.65 + 0.35 * Math.sin(t * 11 + p.ph * 7)); } });
  return ice;
}

export function buildDisco(root, ud, H, ch, lite) {
  const { toon, mesh, sph, cyl, cone, box, tor, bodyR } = H;
  const gold = toon('#c9b196', { rim: 0.6, emissive: '#3a2810', ei: 0.1 });
  buildIce(root, ud, H, lite);
  // gafas redondas de montura dorada fina
  const rb = bodyR(0.92), lensM = lensMat(), ly = 0.93, lx = 0.38, lr = 0.275;
  const zAt = x => Math.sqrt(Math.max(0.05, rb * rb - x * x)) + 0.16;
  for (const s of [-1, 1]) {
    const g = new THREE.Group(), yaw = Math.asin(Math.min(0.9, lx / rb)) * 0.85; g.position.set(s * lx, ly, zAt(lx)); g.rotation.y = s * yaw; root.add(g);
    const lens = mesh(cyl(28), lensM, g, [0, 0, 0], [Math.PI / 2, 0, 0], [lr * 0.97, 0.03, lr * 0.97]); lens.rotation.y = 0;
    mesh(tor(0.075, 40), gold, g, [0, 0, 0.012], null, [lr * 1.01, lr * 1.01, 0.55]);
    // patilla fina hacia la peluca
    const a = new THREE.Vector3(s * (lx + lr * Math.cos(yaw)), ly + 0.01, zAt(lx) - s * 0 - lr * Math.sin(yaw) * 0.0 - 0.02), b = new THREE.Vector3(s * (rb * 1.0), ly + 0.06, 0.35), d = b.clone().sub(a), len = d.length();
    const t = mesh(cyl(6), gold, root, null, null, [0.017, len, 0.017]); t.position.copy(a).addScaledVector(d, 0.5); t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  }
  mesh(cyl(6), gold, root, [0, ly + 0.07, zAt(0.0) - 0.02], [0, 0, Math.PI / 2], [0.018, 0.2, 0.018]);
  // lacito azul de terciopelo en un lado de la cara
  { const bow = new THREE.Group(), ph = -1.0, y = 0.8, p = [Math.sin(ph) * bodyR(y), y, Math.cos(ph) * bodyR(y)];
    bow.position.set(p[0] * 1.015, p[1], p[2] * 1.015); bow.lookAt(p[0] * 3, y - 0.05, p[2] * 3); bow.rotateZ(0.32); root.add(bow);
    const bm = toon('#6fa6ea', { rim: 0.5, nocache: true }), bd = toon('#4a82d2', { rim: 0.3 }); bm.map = fuzzTexture();
    for (const s of [-1, 1]) { mesh(sph(14), bm, bow, [s * 0.16, 0.0, 0.0], [0, s * 0.15, -s * 0.12], [0.19, 0.125, 0.035]); mesh(sph(10), bd, bow, [s * 0.1, 0.0, 0.02], [0, 0, -s * 0.12], [0.08, 0.06, 0.02]);
      mesh(sph(10), bm, bow, [s * 0.07, -0.11, -0.005], [0, 0, s * 0.35], [0.05, 0.12, 0.022]); }
    mesh(sph(10), bm, bow, [0, 0, 0.03], null, [0.07, 0.075, 0.05]); }
  ud.mouthK = 0.62; if (ud.arms) for (const a of ud.arms) { a.scale.setScalar(0.55); a.position.y = 0.6; }
}
