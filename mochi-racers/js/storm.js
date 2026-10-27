// v44: Copa Tormenta a lo grande. Todo instanciado y animado en GPU (rendimiento móvil):
//  - público loquísimo y kawaii llenando las afueras (8 especies, cientos de personajes bailando, mirando a la pista)
//  - personajes que cruzan la zona: congas que pasean por las afueras y globonautas volando muy por encima de la pista
//  - nubecitas de tormenta con carita que lanzan rayos ramificados a pararrayos risueños (destello + onda + chispas)
//  - más definición de pista: líneas de borde de neón con luz que corre, discontinua central y flechas de curva
// Regla de Eric: nada atraviesa nada => todo se coloca con un mapa de ocupación (pista, atajos y decoración existente).
import * as THREE from 'three';
const V3 = THREE.Vector3;
const U = { uT: { value: 0 } }; // tiempo compartido por todos los shaders de este módulo

// ---------- geometría: piezas con color de vértice y máscara (1 = se tiñe con el color de la instancia) ----------
function part(geo, m, color, mask = 0, wave = 0) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(m);
  const n = g.attributes.position.count, c = new THREE.Color(color), col = new Float32Array(n * 3), mk = new Float32Array(n), wv = new Float32Array(n);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; mk[i] = mask; wv[i] = wave; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('aMask', new THREE.BufferAttribute(mk, 1)); g.setAttribute('aWave', new THREE.BufferAttribute(wv, 1));
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color', 'aMask', 'aWave'].includes(k)) g.deleteAttribute(k);
  return g;
}
function merge(parts) {
  const out = new THREE.BufferGeometry(); let n = 0; for (const p of parts) n += p.attributes.position.count;
  for (const [k, sz] of [['position', 3], ['normal', 3], ['color', 3], ['aMask', 1], ['aWave', 1]]) {
    const a = new Float32Array(n * sz); let o = 0; for (const p of parts) { a.set(p.attributes[k].array, o); o += p.attributes[k].array.length; }
    out.setAttribute(k, new THREE.BufferAttribute(a, sz));
  }
  out.computeBoundingSphere(); return out;
}
const M = (x, y, z, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new V3(sx, sy, sz));
const SPH = new THREE.SphereGeometry(1, 12, 9), SPHs = new THREE.SphereGeometry(1, 8, 6), CYL = new THREE.CylinderGeometry(1, 1, 1, 10), CONE = new THREE.ConeGeometry(1, 1, 10), BOX = new THREE.BoxGeometry(1, 1, 1);
const TOR = new THREE.TorusGeometry(1, 0.28, 6, 12, Math.PI);
function starGeo() { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.45 : 1; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } return new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 2 }).translate(0, 0, -0.25); }
// carita kawaii: ojos grandes con brillo, mofletes y sonrisa (siempre afable)
function face(y, z, s = 1, x0 = 0) {
  const P = [];
  for (const sd of [-1, 1]) {
    P.push(part(SPHs, M(x0 + sd * 0.34 * s, y, z, 0.17 * s, 0.21 * s, 0.1 * s), '#2a1838'));
    P.push(part(SPHs, M(x0 + sd * 0.3 * s, y + 0.08 * s, z + 0.08 * s, 0.065 * s), '#ffffff'));
    P.push(part(SPHs, M(x0 + sd * 0.62 * s, y - 0.22 * s, z - 0.06 * s, 0.17 * s, 0.1 * s, 0.06 * s), '#ff8fc0'));
  }
  P.push(part(TOR, M(x0, y - 0.2 * s, z + 0.02, 0.15 * s, 0.15 * s, 0.15 * s, 0, 0, Math.PI), '#2a1838'));
  return P;
}
const SPECIES = {
  gomi: () => [part(SPH, M(0, 1.25, 0, 1.15, 1.3, 1.1), '#ffffff', 1), ...face(1.45, 1.05),
    part(CYL, M(0, 2.85, 0, 0.06, 0.7, 0.06), '#ffffff', 0, 1), part(starGeo(), M(0, 3.35, 0, 0.32), '#ffe066', 0, 1)],
  nube: () => [part(SPH, M(0, 2.2, 0, 1.2), '#ffffff', 1), part(SPH, M(-1.0, 1.9, 0, 0.85), '#ffffff', 1), part(SPH, M(1.0, 1.9, 0, 0.85), '#ffffff', 1), part(SPH, M(0.5, 2.9, -0.2, 0.75), '#ffffff', 1),
    ...face(2.15, 1.12), part(CONE, M(-0.25, 0.85, 0, 0.28, 0.9, 0.12, 0, 0, 0.5), '#ffe066', 0, 1), part(CONE, M(0.25, 0.35, 0, 0.22, 0.7, 0.1, 0, 0, -0.5), '#ffe066', 0, 1)],
  seta: () => { const P = [part(CYL, M(0, 0.85, 0, 0.62, 1.7, 0.62), '#fff3dc'), part(SPH, M(0, 1.9, 0, 1.6, 0.95, 1.6), '#ffffff', 1), ...face(1.0, 0.6, 0.8)];
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; P.push(part(SPHs, M(Math.cos(a) * 1.0, 2.35, Math.sin(a) * 1.0, 0.24, 0.12, 0.24), '#ffffff')); } P.push(part(SPHs, M(0, 2.8, 0, 0.3), '#ffffff')); return P; },
  pato: () => [part(SPH, M(0, 1.0, 0, 1.0, 0.9, 1.15), '#ffffff', 1), part(SPH, M(0, 2.15, 0.25, 0.75), '#ffffff', 1), part(CONE, M(0, 2.0, 1.05, 0.22, 0.55, 0.2, Math.PI / 2), '#ff9a3c'),
    part(BOX, M(-0.27, 2.32, 0.88, 0.42, 0.26, 0.06), '#1d1030'), part(BOX, M(0.27, 2.32, 0.88, 0.42, 0.26, 0.06), '#1d1030'), part(BOX, M(0, 2.36, 0.89, 0.18, 0.05, 0.05), '#ff4fd8'),
    part(CONE, M(0, 3.15, 0.15, 0.4, 0.9, 0.4), '#ff4fd8', 0, 1), part(SPHs, M(0, 3.62, 0.15, 0.14), '#ffe066', 0, 1),
    part(SPH, M(-1.0, 1.2, 0, 0.18, 0.45, 0.35, 0, 0, 0.6), '#ffffff', 1, 1), part(SPH, M(1.0, 1.2, 0, 0.18, 0.45, 0.35, 0, 0, -0.6), '#ffffff', 1, 1)],
  tosta: () => [part(BOX, M(0, 1.45, 0, 1.8, 2.1, 0.55), '#ffffff', 1), part(SPH, M(0, 2.5, 0, 0.95, 0.38, 0.3), '#c98a4a'), part(BOX, M(0, 1.35, 0.29, 1.4, 1.6, 0.04), '#fff1c4'), ...face(1.55, 0.33, 0.9),
    part(CYL, M(-1.15, 2.05, 0, 0.09, 1.0, 0.09, 0, 0, 0.7), '#ffffff', 1, 1), part(CYL, M(1.15, 2.05, 0, 0.09, 1.0, 0.09, 0, 0, -0.7), '#ffffff', 1, 1),
    part(SPHs, M(-1.5, 2.45, 0, 0.18), '#ffffff', 0, 1), part(SPHs, M(1.5, 2.45, 0, 0.18), '#ffffff', 0, 1), part(CYL, M(-0.4, 0.2, 0, 0.1, 0.5, 0.1), '#5a3a2a'), part(CYL, M(0.4, 0.2, 0, 0.1, 0.5, 0.1), '#5a3a2a')],
  estrella: () => [part(starGeo(), M(0, 1.75, 0, 1.3), '#ffffff', 1), ...face(1.8, 0.6, 0.85), part(CYL, M(-0.35, 0.3, 0, 0.09, 0.6, 0.09), '#ff7fb6'), part(CYL, M(0.35, 0.3, 0, 0.09, 0.6, 0.09), '#ff7fb6')],
  helado: () => [part(CONE, M(0, 0.85, 0, 0.75, 1.7, 0.75, Math.PI), '#e8b070'), part(SPH, M(0, 2.0, 0, 0.95), '#ffffff', 1), part(SPH, M(0, 2.85, 0, 0.78), '#ffe0f0'), ...face(2.05, 0.9, 0.85),
    part(SPHs, M(0, 3.72, 0, 0.24), '#ff4060', 0, 1), part(CYL, M(0.12, 4.0, 0, 0.03, 0.4, 0.03, 0, 0, -0.4), '#3a8a3a', 0, 1)],
  pulpo: () => { const P = [part(SPH, M(0, 2.0, 0, 1.2, 1.25, 1.2), '#ffffff', 1), ...face(1.95, 1.08), part(TOR, M(0, 3.25, 0, 0.55, 0.55, 0.55, -Math.PI / 2), '#ffe066', 0, 1)];
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; P.push(part(SPH, M(Math.cos(a) * 0.95, 0.55, Math.sin(a) * 0.95, 0.26, 0.6, 0.26, Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5), '#ffffff', 1, 1)); } return P; },
};
const PAL = ['#ff8fc0', '#7ff5ff', '#ffe066', '#b98aff', '#8fe3a4', '#ffb36b', '#ff6fd8', '#9fd8ff', '#fff0f8'];

// material toon con: color por instancia solo en piezas con máscara, baile en GPU (rebote, balanceo, giro y brazos) y brillo propio
let GRAD = null;
function crowdMat(dance = 1) {
  if (!GRAD) { GRAD = new THREE.DataTexture(new Uint8Array([90, 170, 255, 255]), 4, 1, THREE.RedFormat); GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter; GRAD.needsUpdate = true; }
  const m = new THREE.MeshToonMaterial({ color: '#ffffff', vertexColors: true, gradientMap: GRAD });
  m.onBeforeCompile = sh => {
    sh.uniforms.uT = U.uT; sh.uniforms.uDance = { value: dance };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT; uniform float uDance; attribute float aMask; attribute float aWave;')
      .replace('#include <color_vertex>', `vColor = vec3(1.0); vColor *= color;
        #ifdef USE_INSTANCING_COLOR
          vColor *= mix(vec3(1.0), instanceColor.rgb, aMask);
        #endif`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          #ifdef USE_INSTANCING
            vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
          #else
            vec3 ip = vec3(0.0);
          #endif
          float ph = fract(sin(dot(ip.xz, vec2(12.9898, 78.233))) * 43758.5453) * 6.2831;
          float sp = 2.6 + fract(ph * 7.13) * 2.4;
          float b = abs(sin(uT * sp + ph)) * uDance;
          float sq = (1.0 - b) * 0.07 * uDance;
          transformed.xz *= 1.0 + sq; transformed.y *= 1.0 - sq; transformed.y += b * 0.75;
          float sw = sin(uT * sp * 0.5 + ph) * 0.12 * uDance; transformed.x += sw * transformed.y;
          float ry = sin(uT * 1.1 + ph * 2.0) * 0.55 * uDance; float cr = cos(ry), sr = sin(ry);
          transformed.xz = mat2(cr, -sr, sr, cr) * transformed.xz;
          transformed.x += sin(uT * 7.0 + ph) * 0.28 * aWave; transformed.y += cos(uT * 7.0 + ph) * 0.12 * aWave;
        }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * 0.3;');
  };
  return m;
}

// ---------- mapa de ocupación ----------
function occupancy(T) {
  const C = 8, H = new Map(), key = (i, j) => i * 100003 + j;
  const add = (x, z, r) => { for (let i = Math.floor((x - r) / C); i <= Math.floor((x + r) / C); i++) for (let j = Math.floor((z - r) / C); j <= Math.floor((z + r) / C); j++) { const k = key(i, j); let a = H.get(k); if (!a) H.set(k, a = []); a.push(x, z, r); } };
  const free = (x, z, r) => { const a = H.get(key(Math.floor(x / C), Math.floor(z / C))); if (a) for (let n = 0; n < a.length; n += 3) { const dx = a[n] - x, dz = a[n + 1] - z, rr = a[n + 2] + r; if (dx * dx + dz * dz < rr * rr) return false; }
    // vecinos (objetos grandes ya se registran en todas sus celdas; para el radio propio basta mirar las 8 celdas de alrededor)
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) { if (!di && !dj) continue; const b = H.get(key(Math.floor(x / C) + di, Math.floor(z / C) + dj)); if (b) for (let n = 0; n < b.length; n += 3) { const dx = b[n] - x, dz = b[n + 1] - z, rr = b[n + 2] + r; if (dx * dx + dz * dz < rr * rr) return false; } }
    return true; };
  // decoración existente
  T.group.updateMatrixWorld(true);
  const mw = new THREE.Matrix4(), v = new V3(), sc = new V3(), q = new THREE.Quaternion();
  T.group.traverse(o => {
    if (!o.isMesh || !o.geometry || o.userData.noOcc) return; const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); const bs = g.boundingSphere; if (!bs) return;
    if (o.isInstancedMesh) { for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, mw); mw.premultiply(o.matrixWorld); mw.decompose(v, q, sc); const r = bs.radius * Math.max(sc.x, sc.z); if (r > 45 || v.y > 30) continue; v.add(bs.center.clone().multiply(sc)); add(v.x, v.z, Math.max(0.6, r * 0.8)); } return; }
    o.matrixWorld.decompose(v, q, sc); const r = bs.radius * Math.max(sc.x, sc.z); if (r > 45) return; const c = bs.center.clone().applyMatrix4(o.matrixWorld); if (c.y > 30) return; add(c.x, c.z, Math.max(0.6, r * 0.8));
  });
  return { add, free };
}
// distancia horizontal a la pista (menos el muro de cada tramo, con talud si la pista va elevada) y punto más cercano
function trackField(T) {
  const S = T.S, N = T.N, C = 24, G = new Map(), key = (i, j) => i * 100003 + j;
  for (let n = 0; n < N; n++) { const s = S[n], k = key(Math.floor(s.p.x / C), Math.floor(s.p.z / C)); let a = G.get(k); if (!a) G.set(k, a = []); a.push(n); }
  return (x, z) => { let best = 1e9, bi = 0; const ci = Math.floor(x / C), cj = Math.floor(z / C);
    for (let R = 1; R <= 6; R++) { for (let i = ci - R; i <= ci + R; i++) for (let j = cj - R; j <= cj + R; j++) { const a = G.get(key(i, j)); if (a) for (const n of a) { const s = S[n], d = Math.hypot(s.p.x - x, s.p.z - z) - s.wall - Math.max(0, s.p.y) * 2.5; if (d < best) { best = d; bi = n; } } }
      if (best < (R - 1) * C) break; }
    return { d: best, i: bi }; };
}

// ---------- rayo ramificado (cinta cruzada, se re-quiebra en cada descarga) ----------
const BOLT_SEG = 14, BOLT_BR = 2, BOLT_BSEG = 5, BOLT_N = BOLT_SEG + BOLT_BR * BOLT_BSEG;
export function makeBolt(H = 40, width = 1, colA = '#fffbe0', colB = '#7ff5ff') {
  const quads = BOLT_N * 2, pos = new Float32Array(quads * 6 * 3), geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const core = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: colA, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  const glow = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: colB, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  glow.scale.set(3.2, 1, 3.2); const g = new THREE.Group(); g.add(glow, core); core.frustumCulled = glow.frustumCulled = false; core.userData.noOcc = glow.userData.noOcc = true;
  let q = 0; const seg = (a, b, w) => { // dos quads cruzados (X) para que se vea desde cualquier lado
    for (const [ox, oz] of [[w, 0], [0, w]]) { const P = [a.x - ox, a.y, a.z - oz, a.x + ox, a.y, a.z + oz, b.x + ox * 0.7, b.y, b.z + oz * 0.7, a.x - ox, a.y, a.z - oz, b.x + ox * 0.7, b.y, b.z + oz * 0.7, b.x - ox * 0.7, b.y, b.z - oz * 0.7]; pos.set(P, q * 18); q++; } };
  g.rejag = (rnd = Math.random) => { q = 0; const pts = []; let x = 0, z = 0;
    for (let j = 0; j <= BOLT_SEG; j++) { const y = H * (1 - j / BOLT_SEG); pts.push(new V3(x, y, z)); x += (rnd() - 0.5) * 4.2; z += (rnd() - 0.5) * 4.2; if (j === BOLT_SEG - 1) { x *= 0.3; z *= 0.3; } }
    pts[BOLT_SEG].set(0, 0, 0);
    for (let j = 0; j < BOLT_SEG; j++) seg(pts[j], pts[j + 1], width * (0.5 + 0.5 * (1 - j / BOLT_SEG)) * 0.7 + 0.22);
    for (let b = 0; b < BOLT_BR; b++) { let p = pts[2 + Math.floor(rnd() * (BOLT_SEG - 6))].clone(); const dx = (rnd() - 0.5) * 6, dz = (rnd() - 0.5) * 6;
      for (let j = 0; j < BOLT_BSEG; j++) { const n = p.clone().add(new V3(dx + (rnd() - 0.5) * 3, -H / BOLT_SEG * 0.9, dz + (rnd() - 0.5) * 3)); seg(p, n, width * 0.28 * (1 - j / BOLT_BSEG) + 0.1); p = n; } }
    geo.attributes.position.needsUpdate = true; };
  g.setI = k => { core.material.opacity = Math.min(1, k * 1.2); glow.material.opacity = 0.5 * k; g.visible = k > 0.01; };
  g.rejag(); g.setI(0); return g;
}
// chispas instanciadas para el impacto
function sparks(parent, n = 24, col = '#fff27a') {
  const im = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.35, 0), new THREE.MeshBasicMaterial({ color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), n); im.frustumCulled = false; im.userData.noOcc = true;
  const dir = []; for (let i = 0; i < n; i++) dir.push(new V3(Math.random() - 0.5, Math.random() * 0.9 + 0.3, Math.random() - 0.5).normalize().multiplyScalar(6 + Math.random() * 9));
  const m4 = new THREE.Matrix4(), p = new V3(), qq = new THREE.Quaternion(), s = new V3();
  im.burst = (t) => { // t en segundos desde el impacto
    const k = Math.max(0, 1 - t / 0.9); im.visible = k > 0; im.material.opacity = k;
    for (let i = 0; i < n; i++) { const d = dir[i]; p.set(d.x * t, d.y * t - 9 * t * t + 0.4, d.z * t); if (p.y < 0.2) p.y = 0.2; s.setScalar(k * (0.6 + (i % 3) * 0.3)); qq.setFromEuler(new THREE.Euler(t * 9 + i, t * 7, 0)); m4.compose(p, qq, s); im.setMatrixAt(i, m4); }
    im.instanceMatrix.needsUpdate = true; };
  im.visible = false; parent.add(im); return im;
}
export function shockRing(parent) {
  const r = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.2, 40), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); r.rotation.x = -Math.PI / 2; r.position.y = 0.25; r.userData.noOcc = true;
  r.play = t => { const k = Math.max(0, 1 - t / 0.7); r.visible = k > 0; r.scale.setScalar(1 + t * 16); r.material.opacity = k * 0.9; r.material.color.setHSL((0.85 + t * 0.4) % 1, 1, 0.75); }; r.visible = false; parent.add(r); return r;
}
// nubecita de tormenta kawaii (avisa sonriendo y guiña al descargar)
export function stormCloud(scale = 1) {
  const P = [part(SPH, M(0, 0, 0, 3.2, 2.4, 2.6), '#ffffff', 1), part(SPH, M(-2.9, -0.4, 0, 2.2, 1.8, 2.0), '#ffffff', 1), part(SPH, M(2.9, -0.4, 0, 2.2, 1.8, 2.0), '#ffffff', 1), part(SPH, M(1.2, 1.6, -0.5, 2.0), '#ffffff', 1), part(SPH, M(-1.4, 1.3, -0.4, 1.7), '#ffffff', 1), ...face(-0.1, 2.45, 2.2)];
  const im = new THREE.InstancedMesh(merge(P), crowdMat(0), 1); im.setMatrixAt(0, new THREE.Matrix4().makeScale(scale, scale, scale)); im.setColorAt(0, new THREE.Color('#8f86ff')); im.frustumCulled = false; im.userData.noOcc = true; return im;
}

// ---------- montaje ----------
export function addStorm(T, Q, rnd = Math.random) {
  const lod = Q.hi ? 1 : Math.max(0.45, (typeof window !== 'undefined' && window.__mrLod) || 0.6);
  const root = new THREE.Group(); root.name = 'storm44'; T.group.add(root);
  const occ = occupancy(T), field = trackField(T), S = T.S, N = T.N;
  for (let n = 0; n < N; n += 2) occ.add(S[n].p.x, S[n].p.z, S[n].wall + 2 + Math.max(0, S[n].p.y) * 2.5); // la pista (con margen y talud)
  for (const sc of T.shortcuts) for (const p of sc.pts) occ.add(p.x, p.z, sc.hw + 3);
  const anims = []; const ground = -0.6;
  const spot = (dMin, dMax, r, tries = 60) => { for (let t = 0; t < tries; t++) { const i = Math.floor(rnd() * N), s = S[i], sd = rnd() < 0.5 ? -1 : 1, d = s.wall + Math.max(0, s.p.y) * 2.5 + dMin + Math.pow(rnd(), 1.6) * (dMax - dMin);
      const x = s.p.x + s.right.x * sd * d, z = s.p.z + s.right.z * sd * d; const f = field(x, z); if (f.d < dMin * 0.8 + r) continue; if (T.inShortcut && T.inShortcut(x, z) != null) continue; if (!occ.free(x, z, r)) continue; return { x, z, i: f.i }; } return null; };
  const faceTo = (x, z, i) => Math.atan2(S[i].p.x - x, S[i].p.z - z);

  // 1) pararrayos risueños con nube propia: rayos ramificados que caen a la vista
  const nStrike = Math.round(11 * Math.max(0.7, lod));
  const tower = merge([part(CYL, M(0, 3, 0, 1.4, 6, 1.4), '#ffffff', 1), part(CYL, M(0, 6.3, 0, 1.0, 0.6, 1.0), '#fff7d6'), part(SPH, M(0, 7.4, 0, 1.25), '#ffffff', 1), ...face(7.45, 1.15, 1.2),
    part(CYL, M(0, 9.4, 0, 0.12, 2.8, 0.12), '#fff7d6'), part(SPH, M(0, 10.9, 0, 0.45), '#ffe066'), part(TOR, M(0, 4.2, 0, 1.55, 1.55, 1.55, Math.PI / 2), '#ff5fd2'), part(TOR, M(0, 2.0, 0, 1.55, 1.55, 1.55, Math.PI / 2), '#5ff5ff')]);
  const towers = []; for (let k = 0; k < nStrike; k++) { const p = spot(14, 70, 6); if (!p) continue; occ.add(p.x, p.z, 7); towers.push(p); }
  if (towers.length) {
    const tim = new THREE.InstancedMesh(tower, crowdMat(0.25), towers.length); tim.userData.noOcc = true;
    towers.forEach((p, k) => { tim.setMatrixAt(k, M(p.x, ground, p.z, 1.3, 1.3, 1.3, 0, faceTo(p.x, p.z, p.i), 0)); tim.setColorAt(k, new THREE.Color(PAL[k % PAL.length])); });
    root.add(tim);
    towers.forEach((p, k) => {
      const g = new THREE.Group(); g.position.set(p.x, ground + 14.2, p.z); root.add(g);
      const cl = stormCloud(1.25); cl.position.y = 34; g.add(cl);
      const bolt = makeBolt(32, 1.4); g.add(bolt); const ring = shockRing(g); ring.position.y = -14; const sp = sparks(g); sp.position.y = -0.2;
      const per = 3.2 + (k % 4) * 0.9 + rnd() * 1.5, off0 = rnd() * per; let last = -1;
      anims.push((t, dt, race) => {
        const ph = (t + off0) % per, cyc = Math.floor((t + off0) / per); cl.position.y = 34 + Math.sin(t * 0.8 + k) * 0.8; cl.rotation.y = Math.sin(t * 0.3 + k) * 0.3;
        if (cyc !== last) { last = cyc; bolt.rejag(); if (race && race.player && race.lightningFlash != null) { const d = Math.hypot(race.player.pos.x - p.x, race.player.pos.z - p.z); if (d < 160) race.lightningFlash = Math.max(race.lightningFlash, 0.45 * (1 - d / 160)); } }
        const k1 = ph < 0.08 ? 1 : ph < 0.16 ? 0.25 : ph < 0.24 ? 1 : Math.max(0, 1 - (ph - 0.24) * 5); bolt.setI(k1); if (ph > 0.12 && ph < 0.15) bolt.rejag();
        sp.burst(ph); ring.play(ph); cl.scale.setScalar(1 + (ph < 0.3 ? (0.3 - ph) * 0.5 : 0));
      });
    });
  }

  const keys = Object.keys(SPECIES), geos = {}; for (const k of keys) geos[k] = merge(SPECIES[k]());
  // 3) congas que cruzan la zona (paseando por las afueras, nunca por la pista)
  const congas = Math.round(9 * Math.max(0.6, lod)), walkers = [];
  for (let c = 0; c < congas; c++) { let p = null; for (let t = 0; t < 120 && !p; t++) { const q = spot(18, 80, 15, 1); if (q && field(q.x, q.z).d > 30) p = q; } if (!p) continue;
    occ.add(p.x, p.z, 15); const n = 7, kind = keys[(c * 3) % keys.length]; for (let j = 0; j < n; j++) walkers.push({ c: p, r: 11, a0: j / n * Math.PI * 2 * 0.55, sp: (c % 2 ? 1 : -1) * (0.35 + rnd() * 0.2), kind, col: PAL[(c + j) % PAL.length] }); }
  const byKind = {}; for (const w of walkers) (byKind[w.kind] ||= []).push(w);
  const m4 = new THREE.Matrix4();
  for (const [k, ws] of Object.entries(byKind)) { const im = new THREE.InstancedMesh(geos[k], crowdMat(0.6), ws.length); im.frustumCulled = false; im.userData.noOcc = true; ws.forEach((w, i) => im.setColorAt(i, new THREE.Color(w.col))); root.add(im);
    anims.push(t => { ws.forEach((w, i) => { const a = w.a0 + t * w.sp, x = w.c.x + Math.cos(a) * w.r, z = w.c.z + Math.sin(a) * w.r, hop = Math.abs(Math.sin(t * 6 + i)) * 0.6;
      m4.compose(new V3(x, ground + hop, z), new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), -a + (w.sp > 0 ? 0 : Math.PI)), new V3(1.8, 1.8, 1.8)); im.setMatrixAt(i, m4); }); im.instanceMatrix.needsUpdate = true; }); }

  // 2) público loquísimo: lleno de personajes en las afueras
  const total = Math.round(1800 * lod), per = {}; keys.forEach(k => per[k] = []);
  for (let n = 0; n < total; n++) { const sc = 1.35 + rnd() * 1.25, p = spot(3, 120, 1.4 * sc, 30); if (!p) continue; occ.add(p.x, p.z, 1.4 * sc); const sp = keys[n % keys.length];
    per[sp].push(M(p.x, ground, p.z, sc, sc, sc, 0, faceTo(p.x, p.z, p.i) + (rnd() - 0.5) * 0.6, 0)); }
  // por sectores para que la cámara descarte lo que no ve (frustum culling por bloque)
  const SEC = 8; let cx = 0, cz = 0; for (const s of S) { cx += s.p.x; cz += s.p.z; } cx /= N; cz /= N;
  const crowdMats = keys.map(() => crowdMat(1)); let placed = 0;
  keys.forEach((k, ki) => { const arr = per[k]; placed += arr.length; const buckets = Array.from({ length: SEC }, () => []); const v = new V3();
    for (const m of arr) { v.setFromMatrixPosition(m); const a = (Math.atan2(v.z - cz, v.x - cx) + Math.PI) / (Math.PI * 2); buckets[Math.min(SEC - 1, Math.floor(a * SEC))].push(m); }
    for (const b of buckets) { if (!b.length) continue; const im = new THREE.InstancedMesh(geos[k], crowdMats[ki], b.length); im.userData.noOcc = true;
      b.forEach((m, i) => { im.setMatrixAt(i, m); im.setColorAt(i, new THREE.Color(PAL[Math.floor(rnd() * PAL.length)])); }); im.computeBoundingSphere(); root.add(im); } });

  // 4) globonautas cruzando por el cielo, muy por encima de rampas, dragones y arcoíris
  const flyN = Math.round(16 * Math.max(0.6, lod)); let R0 = 0; for (const s of S) R0 = Math.max(R0, Math.hypot(s.p.x - cx, s.p.z - cz)); R0 += 60;
  const balloons = merge([part(SPH, M(0, 6.5, 0, 1.3, 1.5, 1.3), '#ffffff', 1), part(SPH, M(-1.5, 6.0, 0.3, 1.1, 1.3, 1.1), '#ff8fc0'), part(SPH, M(1.5, 6.1, -0.2, 1.1, 1.3, 1.1), '#7ff5ff'), part(SPH, M(0.2, 8.1, 0.3, 1.0, 1.2, 1.0), '#ffe066'),
    part(CYL, M(0, 4.2, 0, 0.03, 4.4, 0.03), '#ffffff'), part(CYL, M(-0.7, 4.2, 0, 0.03, 4.4, 0.03, 0, 0, 0.32), '#ffffff'), part(CYL, M(0.7, 4.2, 0, 0.03, 4.4, 0.03, 0, 0, -0.32), '#ffffff')]);
  const flyK = keys.filter(k => k !== 'nube' && k !== 'seta'), fl = [];
  for (let i = 0; i < flyN; i++) fl.push({ a: rnd() * Math.PI * 2, y: 40 + rnd() * 14, sp: 0.06 + rnd() * 0.05, k: flyK[i % flyK.length], col: PAL[i % PAL.length], ph: rnd() * 6 });
  const fim = new THREE.InstancedMesh(balloons, crowdMat(0.3), flyN); fim.frustumCulled = false; fim.userData.noOcc = true; root.add(fim);
  const fByK = {}; fl.forEach((f, i) => { (fByK[f.k] ||= []).push(f); fim.setColorAt(i, new THREE.Color(PAL[(i + 3) % PAL.length])); });
  const fIms = Object.entries(fByK).map(([k, a]) => { const im = new THREE.InstancedMesh(geos[k], crowdMat(0.4), a.length); im.frustumCulled = false; im.userData.noOcc = true; a.forEach((f, i) => im.setColorAt(i, new THREE.Color(f.col))); root.add(im); return [im, a]; });
  const flyPos = (f, t) => { const L = R0 * 2, u = ((t * f.sp * 60 + f.ph * 40) % L) - R0; return new V3(cx + Math.cos(f.a) * u - Math.sin(f.a) * (f.ph - 3) * 30, f.y + Math.sin(t * 0.7 + f.ph) * 1.5, cz + Math.sin(f.a) * u + Math.cos(f.a) * (f.ph - 3) * 30); };
  anims.push(t => { const qq = new THREE.Quaternion();
    fl.forEach((f, i) => { const p = flyPos(f, t); qq.setFromAxisAngle(new V3(0, 1, 0), Math.PI / 2 - f.a + Math.sin(t + i) * 0.2); m4.compose(p, qq, new V3(1.3, 1.3, 1.3)); fim.setMatrixAt(i, m4); }); fim.instanceMatrix.needsUpdate = true;
    for (const [im, a] of fIms) { a.forEach((f, i) => { const p = flyPos(f, t); qq.setFromAxisAngle(new V3(0, 1, 0), Math.PI / 2 - f.a + Math.sin(t + i) * 0.2); m4.compose(p, qq, new V3(0.9, 0.9, 0.9)); im.setMatrixAt(i, m4); }); im.instanceMatrix.needsUpdate = true; } });

  // v45: lluvia neón alrededor del jugador y relámpagos de fondo en el cielo
  try { stormRain(T, root, anims, lod); } catch (e) { console.warn('rain45', e); }
  // 5) más definición en la pista: bordes de neón con luz que corre, discontinua central y flechas en las curvas
  roadNeon(T, root, anims);
  T.anims.push((t, dt, race) => { U.uT.value = t; for (const a of anims) a(t, dt, race); });
  T.storm44 = { crowd: placed, towers: towers.length, towerPos: towers.map(p => [p.x, p.z]), walkers: walkers.length, flyers: flyN };
  return T.storm44;
}

function roadNeon(T, root, anims) {
  const S = T.S, N = T.N, closed = !T.open;
  // cinta a cada lado del asfalto, con coordenada a lo largo (u) para animar la luz
  const mat = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uT: { value: 0 } }]), fog: true, transparent: true, depthWrite: false,
    vertexShader: `varying float vU; varying float vV; attribute float aU; attribute float aV;
      #include <fog_pars_vertex>
      void main(){ vU = aU; vV = aV; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `uniform float uT; varying float vU; varying float vV;
      #include <fog_pars_fragment>
      void main(){ float k = fract(vU / 9.0 - uT * 1.6); vec3 a = vec3(1.0, 0.37, 0.82), b = vec3(0.37, 0.96, 1.0); vec3 c = mix(a, b, step(0.5, fract(vU / 18.0 + vV * 0.5)));
        float pulse = smoothstep(0.0, 0.15, k) * (1.0 - smoothstep(0.15, 0.6, k)); float edge = 1.0 - abs(vV - 0.5) * 2.0;
        gl_FragColor = vec4(c * (0.75 + pulse * 1.4) + pulse * 0.35, (0.55 + pulse * 0.45) * smoothstep(0.0, 0.35, edge));
      #include <fog_fragment>
      }` });
  mat.polygonOffset = true; mat.polygonOffsetFactor = -2; mat.polygonOffsetUnits = -2;
  const pos = [], aU = [], aV = [], idx = []; let u = 0; const W = 0.55;
  for (const sd of [-1, 1]) { const base = pos.length / 3; u = 0;
    for (let i = 0; i <= N; i++) { if (!closed && i === N) break; const s = S[i % N]; if (i) u += S[(i - 1) % N].p.distanceTo(s.p);
      for (const e of [0, 1]) { const lat = sd * (s.w - 0.5 - e * W); pos.push(s.p.x + s.right.x * lat, s.p.y + 0.07, s.p.z + s.right.z * lat); aU.push(u); aV.push(e); } }
    const rows = (pos.length / 3 - base) / 2; for (let i = 0; i < rows - 1; i++) { const a = base + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aU', new THREE.Float32BufferAttribute(aU, 1)); g.setAttribute('aV', new THREE.Float32BufferAttribute(aV, 1)); g.setIndex(idx); g.computeBoundingSphere();
  const strip = new THREE.Mesh(g, mat); strip.userData.noOcc = true; strip.renderOrder = 2; root.add(strip);
  // discontinua central (fuera de las rampas)
  const inRamp = i => T.ramps.some(r => { let d = i - r.i0; if (!T.open) d = ((d % N) + N) % N; return d <= r.len + 2; });
  const dash = []; for (let i = 0; i < N; i += 5) if (!inRamp(i) && i > 3) dash.push(i);
  const dg = new THREE.PlaneGeometry(0.45, 3.2).rotateX(-Math.PI / 2);
  const dm = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false });
  const dim = new THREE.InstancedMesh(dg, dm, dash.length); dim.userData.noOcc = true; dim.renderOrder = 2;
  dash.forEach((i, n) => { const s = S[i]; dim.setMatrixAt(n, M(s.p.x, s.p.y + 0.07, s.p.z, 1, 1, 1, 0, Math.atan2(s.fl.x, s.fl.z), 0)); dim.setColorAt(n, new THREE.Color(n % 2 ? '#ff8fe0' : '#8ff8ff')); });
  root.add(dim);
  // flechas de curva fuera del muro (por el lado exterior), parpadeando en cadena
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128; const x = cv.getContext('2d');
  x.fillStyle = '#2a1050'; x.beginPath(); x.roundRect(4, 4, 120, 120, 26); x.fill(); x.lineWidth = 8; x.strokeStyle = '#ff5fd2'; x.stroke();
  x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(42, 28); x.lineTo(86, 64); x.lineTo(42, 100); x.lineTo(58, 64); x.closePath(); x.fill();
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const ch = []; for (let i = 0; i < N; i += 6) { const c = S[i].curv; if (Math.abs(c) > 0.12) ch.push([i, Math.sign(c)]); }
  if (ch.length) {
    const ag = new THREE.PlaneGeometry(2.6, 2.6); ag.translate(0, 2.4, 0);
    const am = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true });
    const aim = new THREE.InstancedMesh(ag, am, ch.length); aim.userData.noOcc = true;
    const base = []; ch.forEach(([i, sg], n) => { const s = S[i], lat = -sg * (s.wall + 1.6); const yaw = Math.atan2(s.fl.x, s.fl.z) + Math.PI / 2 * (sg > 0 ? 1 : -1) + Math.PI;
      // mirando hacia la pista, la flecha apunta hacia donde gira
      aim.setMatrixAt(n, M(s.p.x + s.right.x * lat, s.p.y, s.p.z + s.right.z * lat, sg > 0 ? -1 : 1, 1, 1, 0, yaw, 0)); base.push(n); aim.setColorAt(n, new THREE.Color('#ffffff')); });
    root.add(aim); const c = new THREE.Color();
    anims.push(t => { mat.uniforms.uT.value = t; const k = Math.floor(t * 6); for (const n of base) { const on = (n + k) % 4 === 0; aim.setColorAt(n, c.set(on ? '#ffffff' : '#9a7ac8')); } aim.instanceColor.needsUpdate = true; });
  } else anims.push(t => { mat.uniforms.uT.value = t; });
}

// v45: lluvia barata (un solo Points con shader, sigue a la cámara) + destellos de cielo
function stormRain(T, root, anims, lod) {
  const n = Math.round(1400 * Math.max(0.5, lod)), pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 90; pos[i * 3 + 1] = Math.random() * 40; pos[i * 3 + 2] = (Math.random() - 0.5) * 90; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uC: { value: new V3() } },
    vertexShader: `uniform float uT; uniform vec3 uC; varying float vA; void main(){ vec3 p = position; p.y = mod(p.y - uT * 38.0, 40.0); p.x = mod(p.x + uC.x + 45.0, 90.0) - 45.0 - uC.x; p.z = mod(p.z + uC.z + 45.0, 90.0) - 45.0 - uC.z; vec3 w = vec3(uC.x + p.x, uC.y - 8.0 + p.y, uC.z + p.z);
      vec4 mv = viewMatrix * vec4(w, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(90.0 / -mv.z, 1.0, 5.0); vA = clamp(1.0 - (-mv.z) / 60.0, 0.0, 1.0); }`,
    fragmentShader: `varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float a = smoothstep(0.12, 0.0, abs(c.x)) * (1.0 - abs(c.y) * 2.0); gl_FragColor = vec4(0.7, 0.85, 1.0, a * vA * 0.7); }` });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.userData.noOcc = true; pts.renderOrder = 3; root.add(pts);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(900, 16, 8), new THREE.MeshBasicMaterial({ color: '#b9a8ff', transparent: true, opacity: 0, side: THREE.BackSide, depthWrite: false, fog: false }));
  flash.userData.noOcc = true; flash.frustumCulled = false; root.add(flash); let next = 2;
  anims.push((t, dt, race) => { mat.uniforms.uT.value = t; const c = race && race.player; if (c) { mat.uniforms.uC.value.set(c.pos.x, c.y || 0, c.pos.z); flash.position.set(c.pos.x, 0, c.pos.z); }
    if (t > next) next = t + 2.5 + Math.random() * 4; const f = next - t; flash.material.opacity = f > 2.3 ? 0.22 * Math.abs(Math.sin(f * 40)) : 0; });
}
