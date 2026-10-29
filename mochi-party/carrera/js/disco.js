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

// ---- bola de discoteca de espejitos (o42): clara, legible y con pocos destellos suaves ----
let _ballG;
function ballGeo() {
  if (_ballG) return _ballG;
  const g = new THREE.SphereGeometry(1, 20, 14).toNonIndexed(), pos = g.attributes.position, col = new Float32Array(pos.count * 3);
  const pal = ['#ffffff', '#e4ecff', '#ffdcf0', '#d3ecff', '#ece2ff', '#bcc8ea', '#9fb0d8'].map(h => new THREE.Color(h));
  const cell = (x, y, z) => { const th = Math.acos(Math.max(-1, Math.min(1, y))), ph = Math.atan2(x, z); return Math.floor(th / (Math.PI / 14)) * 40 + Math.floor((ph + Math.PI) / (2 * Math.PI / 20)); };
  for (let f = 0; f < pos.count; f += 3) { const cx = (pos.getX(f) + pos.getX(f + 1) + pos.getX(f + 2)) / 3, cy = (pos.getY(f) + pos.getY(f + 1) + pos.getY(f + 2)) / 3, cz = (pos.getZ(f) + pos.getZ(f + 1) + pos.getZ(f + 2)) / 3, l = Math.hypot(cx, cy, cz) || 1, id = cell(cx / l, cy / l, cz / l);
    const h = Math.abs(Math.sin(id * 12.9898) * 43758.5453) % 1, c = pal[Math.floor(h * pal.length)], k = 0.58 + ((h * 7.3) % 1) * 0.42;
    for (let q = 0; q < 3; q++) { col[(f + q) * 3] = c.r * k; col[(f + q) * 3 + 1] = c.g * k; col[(f + q) * 3 + 2] = c.b * k; } }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); _ballG = g; return g;
}
function buildBall(root, ud, H, lite) {
  const { toon, mesh, tor, cyl, glowTex } = H;
  const grp = new THREE.Group(); grp.name = 'bolaDisco'; grp.position.set(0, 1.95, 0); root.add(grp);
  const bm = toon('#ffffff', { rim: 0.8, vc: true, emissive: '#6a76aa', ei: 0.22, nocache: true }); bm.flatShading = true;
  const ball = new THREE.Mesh(ballGeo(), bm); ball.scale.setScalar(0.56); grp.add(ball); ud.casters.push(ball);
  // casquillo + anilla de colgar
  mesh(cyl(14), toon('#aab4d8', { rim: 0.8 }), grp, [0, 0.56, 0], null, [0.1, 0.07, 0.1]);
  mesh(tor(0.1, 16), toon('#cfd6ee', { rim: 0.8 }), grp, [0, 0.69, 0], null, [0.1, 0.1, 0.1]);
  // pocos destellos suaves y pequeños (en el grupo "detalle": se apagan si el móvil va justo)
  const det = new THREE.Group(); det.name = 'detalle'; grp.add(det); const sp = [];
  for (let q = 0; q < (lite ? 2 : 4); q++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#ffffff'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); s.scale.setScalar(0.17); det.add(s); sp.push({ s, a: q * 1.6 + 0.4, ph: q * 0.37 }); }
  ud.fx.push(t => {
    ball.rotation.y = t * 0.45; grp.rotation.z = Math.sin(t * 1.4) * 0.03;
    for (const p of sp) { const k = (t * 0.28 + p.ph) % 1, a = p.a + t * 0.2; p.s.position.set(Math.sin(a) * 0.62, 0.15 + Math.sin(a * 1.7) * 0.28, Math.cos(a) * 0.62); p.s.material.opacity = Math.max(0, Math.sin(k * Math.PI)) ** 2 * 0.55; } });
  return grp;
}

export function buildDisco(root, ud, H, ch, lite) {
  const { toon, mesh, sph, cyl, cone, box, tor, bodyR } = H;
  const gold = toon('#c9b196', { rim: 0.6, emissive: '#3a2810', ei: 0.1 });
  buildBall(root, ud, H, lite);
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
