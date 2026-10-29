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

// ---- peluca ----
const A = 1.04, B = 1.04, C = 0.82, Y0 = 0.98, TILT = 0.0;
const sstep = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const wrap = p => { while (p > Math.PI) p -= 2 * Math.PI; while (p < -Math.PI) p += 2 * Math.PI; return p; };
const thMax = ph => { const w = wrap(ph), a = Math.abs(w), side = w < 0 ? 0.8 : 0.42; return 1.14 + side * sstep(0.35, 1.9, a) + 0.1 * sstep(2.0, 3.0, a) + (w > 0 && w < 1.2 ? 0.06 * Math.sin(w / 1.2 * Math.PI) : 0); };
function WP(th, ph, k = 1) {
  const bump = 0.3 * Math.exp(-((ph + 0.15) ** 2) / 0.6) * Math.exp(-((th - 0.55) ** 2) / 0.22);
  const rr = (1 + bump) * k, st = Math.sin(th);
  return new THREE.Vector3(A * st * Math.sin(ph) * rr, Y0 + C * Math.cos(th) * rr, B * st * Math.cos(ph) * rr + bump * 0.18);
}
const WN = p => new THREE.Vector3(p.x / (A * A), (p.y - Y0) / (C * C), p.z / (B * B)).normalize();

function buildWig(root, mats, lite, casters) {
  let sd = 11; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const P = [], N = [], Cc = [], I = [];
  const push = (p, n, c) => { P.push(p.x, p.y, p.z); N.push(n.x, n.y, n.z); Cc.push(c[0], c[1], c[2]); return P.length / 3 - 1; };
  // base: casquete oscuro que tapa huecos entre mechones
  const NU = lite ? 10 : 16, NV = lite ? 20 : 36, base = [];
  for (let j = 0; j <= NV; j++) { const ph = -Math.PI + j / NV * Math.PI * 2; const row = [];
    for (let i = 0; i <= NU; i++) { const th = i / NU * (thMax(ph) - 0.02), p = WP(th, ph, 1.0), n = WN(p), k = 0.62 + 0.14 * (1 - i / NU); row.push(push(p, n, [0.78 * k + .12, 0.62 * k + .1, 0.34 * k + .05])); }
    base.push(row); }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = base[j][i], b = base[j + 1][i], c = base[j][i + 1], d = base[j + 1][i + 1]; I.push(a, b, c, b, d, c); }
  // mechones: cintas aplastadas con punta que siguen la superficie
  const nS = lite ? 44 : 190, SEG = lite ? 7 : 14;
  for (let s = 0; s < nS; s++) {
    // campo de flujo coherente: los mechones salen de la raya (arriba) y barren hacia la derecha por delante, y caen por los lados/atrás
    let ph0 = -Math.PI + (s + R() * 0.6) / nS * Math.PI * 2; if (s % 3 === 0) ph0 = (R() - 0.85) * 1.7;
    const front = sstep(1.0, 0.0, Math.abs(wrap(ph0))), th0 = 0.04 + R() * 0.16 + (1 - front) * 0.12;
    const dph = front * (1.75 + 0.4 * Math.cos(ph0 * 1.4) + R() * 0.12) + (1 - front) * 0.34, phE = ph0 + dph;
    const thE = thMax(phE) - 0.03 - R() * 0.025;
    const w0 = (lite ? 0.2 : 0.13) + R() * (lite ? 0.06 : 0.06), lay = 1.004 + R() * 0.03, ph1 = R() * 6.28, amp = 0.025 + R() * 0.03;
    const tone = 0.72 + R() * 0.28, cA = [0.35 + 0.26 * tone, 0.25 + 0.22 * tone, 0.12 + 0.14 * tone];
    const pts = [], nrm = [];
    for (let k = 0; k <= SEG; k++) { const u = k / SEG, th = th0 + (thE - th0) * (u ** 0.9), ph = ph0 + dph * u + Math.sin(u * 6 + ph1) * amp * Math.sin(u * Math.PI) * (0.4 + (1 - front));
      const lift = 1 + (lay - 1) + 0.03 * Math.sin(u * Math.PI) + (u > 0.9 ? (u - 0.9) * 0.06 : 0); const p = WP(th, ph, lift); pts.push(p); nrm.push(WN(p)); }
    let prev = null;
    for (let k = 0; k <= SEG; k++) { const u = k / SEG, tg = pts[Math.min(SEG, k + 1)].clone().sub(pts[Math.max(0, k - 1)]).normalize(), n = nrm[k], sdv = new THREE.Vector3().crossVectors(tg, n).normalize();
      const w = w0 * (0.55 + 0.45 * Math.sin(Math.min(1, u * 1.2 + 0.1) * Math.PI * 0.95 + 0.2)) * (1 - Math.pow(u, 14) * 0.55), sh = 0.88 + 0.12 * Math.sin(u * 5 + ph1); // raíz algo más oscura
      const col = cA.map((v, q) => v * (u < 0.25 ? 0.82 + u * 0.7 : 1) * sh * (q === 2 ? 0.95 : 1) + (u > .75 ? .04 : 0));
      const nl = n.clone().addScaledVector(sdv, -0.55).normalize(), nr = n.clone().addScaledVector(sdv, 0.55).normalize();
      const l = push(pts[k].clone().addScaledVector(sdv, -w * 0.5), nl, col), r = push(pts[k].clone().addScaledVector(sdv, w * 0.5), nr, col);
      if (prev) I.push(prev[0], prev[1], l, prev[1], r, l); prev = [l, r]; }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3)); g.setIndex(I);
  const m = new THREE.Mesh(g, mats.hair); m.name = 'peluca'; root.add(m); casters.push(m); return m;
}

export function buildDisco(root, ud, H, ch, lite) {
  const { toon, mesh, sph, cyl, cone, box, tor, bodyR } = H;
  const gold = toon('#c9b196', { rim: 0.6, emissive: '#3a2810', ei: 0.1 });
  const hair = new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.DoubleSide, gradientMap: H.gradient() });
  hair.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
    { vec3 nn = normalize(normal), vv = normalize(vViewPosition); if (!gl_FrontFacing) nn = -nn;
      vec3 h1 = normalize(normalize(vec3(-0.45, 0.65, 0.6)) + vv); float d1 = max(dot(nn, h1), 0.0);
      outgoingLight += vec3(1.0, 0.95, 0.8) * (pow(d1, 26.0) * 0.2 + pow(d1, 6.0) * 0.07);
      outgoingLight += vec3(1.0, 0.93, 0.8) * pow(1.0 - clamp(dot(nn, vv), 0.0, 1.0), 2.2) * 0.2; }
    #include <opaque_fragment>`); };
  hair.customProgramCacheKey = () => 'discohair';
  buildWig(root, { hair }, lite, ud.casters);
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
