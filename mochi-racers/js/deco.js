// ======================================================================
//  Decoración extra de los circuitos (solo visual: sin colisión, siempre fuera de la pista).
//  Público kawaii que salta y saluda, mochis bailando, gradas, banderines, globos, carteles,
//  mascotas gigantes y bichitos según la temática. Todo instanciado por trozos de circuito
//  (frustum culling + se apaga lo lejano y los detalles pequeños a media distancia).
// ======================================================================
import * as THREE from 'three';
import { toon } from './gfx.js';
const V3 = THREE.Vector3, C = c => new THREE.Color(c);

// --- fusiona geometrías con color por vértice (1 draw call por pieza)
export function mergeVC(parts) {
  const pos = [], nor = [], col = []; const nm = new THREE.Matrix3();
  for (const { g, m, c } of parts) { const gg = g.index ? g.toNonIndexed() : g.clone(); gg.applyMatrix4(m); const cc = C(c || '#ffffff');
    const p = gg.attributes.position.array, n = gg.attributes.normal.array; for (let i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(n[i]); } for (let i = 0; i < p.length / 3; i++) col.push(cc.r, cc.g, cc.b); gg.dispose(); }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.computeBoundingSphere(); return out; }
const M = (x, y, z, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new V3(sx, sy, sz));

// --- material animado en GPU: salto, aplastado, saludo de bracitos, baile, balanceo
export const TIME = { value: 0 };
export function animMat(color, o = {}, anim = {}) {
  const m = toon(color, { ...o, nocache: true });
  const prev = m.onBeforeCompile; const A = { jump: 0.6, sq: 1, wave: 0, spin: 0, sway: 0, spd: 5, bob: 0, ...anim };
  m.onBeforeCompile = (sh, r) => { if (prev) prev(sh, r);
    sh.uniforms.uT = TIME;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      uniform float uT; attribute float aPh; attribute float aAmp;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      { float tt = uT * ${A.spd.toFixed(2)} + aPh; float j = abs(sin(tt));
        ${A.wave ? `float sd = sign(transformed.x); vec2 pv = vec2(sd * 0.78, 0.95); vec2 q = transformed.xy - pv; float an = sd * (0.6 + sin(tt * 2.0) * 0.9) * aAmp * ${A.wave.toFixed(2)}; transformed.xy = pv + vec2(q.x * cos(an) - q.y * sin(an), q.x * sin(an) + q.y * cos(an));` : ''}
        float sq = 1.0 + (1.0 - j) * 0.12 * ${A.sq.toFixed(2)} * aAmp; transformed.y /= sq; transformed.xz *= mix(1.0, sq, 0.6);
        ${A.spin ? `float ca = cos(sin(tt * 0.5) * ${A.spin.toFixed(2)}), sa = sin(sin(tt * 0.5) * ${A.spin.toFixed(2)}); transformed.xz = vec2(transformed.x * ca - transformed.z * sa, transformed.x * sa + transformed.z * ca);` : ''}
        ${A.sway ? `transformed.x += sin(tt) * transformed.y * ${A.sway.toFixed(2)};` : ''}
        transformed.y += j * ${A.jump.toFixed(2)} * aAmp + sin(uT * 1.3 + aPh) * ${A.bob.toFixed(2)}; }`);
  };
  m.customProgramCacheKey = () => 'deco' + JSON.stringify(A) + JSON.stringify(o);
  return m; }

// --- sistema de instancias por trozos (chunks) del circuito
class Chunks {
  constructor(T, K) { this.T = T; this.K = K; this.sets = []; }
  // parts: [{ geo, mat, detail? }], items: [{ p, yaw, s, c, ph, amp, i }]
  add(parts, items, far = 1) {
    if (!items.length) return; const K = this.K, N = this.T.N, by = Array.from({ length: K }, () => []);
    for (const it of items) by[Math.min(K - 1, Math.floor(((it.i % N) + N) % N / N * K))].push(it);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new V3();
    for (const list of by) { if (!list.length) continue; const ctr = new V3(); list.forEach(it => ctr.add(it.p)); ctr.multiplyScalar(1 / list.length);
      const ch = { ctr, meshes: [], far };
      for (const pt of parts) { const g = pt.geo.clone(); const ph = new Float32Array(list.length), am = new Float32Array(list.length);
        list.forEach((it, k) => { ph[k] = it.ph ?? Math.random() * 6.28; am[k] = it.amp ?? 1; });
        g.setAttribute('aPh', new THREE.InstancedBufferAttribute(ph, 1)); g.setAttribute('aAmp', new THREE.InstancedBufferAttribute(am, 1));
        const im = new THREE.InstancedMesh(g, pt.mat, list.length);
        list.forEach((it, k) => { e.set(0, it.yaw || 0, 0); q.setFromEuler(e); const s = it.s || 1; sc.set(s, s * (it.sy || 1), s); m4.compose(it.p, q, sc); im.setMatrixAt(k, m4); if (pt.tint !== false && it.c) im.setColorAt(k, C(it.c)); });
        if (im.instanceColor) im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); im.userData.detail = !!pt.detail; this.T.group.add(im); ch.meshes.push(im); }
      this.sets.push(ch); } }
  update(cam, hi) { const D = (hi ? 260 : 200), Dd = hi ? 100 : 70;
    for (const ch of this.sets) { const d = ch.ctr.distanceTo(cam); for (const im of ch.meshes) im.visible = d < D * ch.far + 40 && (!im.userData.detail || d < Dd * ch.far + 40); } } }

// --- piezas
const SPH = new THREE.SphereGeometry(1, 12, 8), SPHl = new THREE.SphereGeometry(1, 7, 5), CYL = new THREE.CylinderGeometry(1, 1, 1, 10), CONE = new THREE.ConeGeometry(1, 1, 10), BOX = new THREE.BoxGeometry(1, 1, 1);
// v12: cuerpo con degradado (vientre claro, base más oscura) para dar volumen
export const bodyGeo = () => { const g = new THREE.SphereGeometry(1, 16, 11); g.scale(1, 0.86, 1); g.translate(0, 0.86, 0); const p = g.attributes.position, c = [];
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 1.72, z = p.getZ(i); const k = 0.78 + y * 0.26 + Math.max(0, z) * 0.06; c.push(Math.min(1, k), Math.min(1, k * 0.98), Math.min(1, k)); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); return g; };
// v12: pompones de espumillón en las manos (siguen al saludo de los bracitos)
export const pomGeo = () => mergeVC([-1, 1].flatMap(s => [0, 1, 2, 3, 4, 5].map(k => ({ g: SPHl, m: M(s * 1.15 + Math.cos(k * 1.05) * 0.18, 0.66 + Math.sin(k * 1.05) * 0.18, 0.22 + (k % 2) * 0.1, 0.21), c: ['#ffe066', '#ff8fd8', '#7ff5ff', '#ffffff', '#b98aff', '#9dff7a'][(k + (s > 0 ? 3 : 0)) % 6] }))));
export const faceGeo = () => mergeVC([
  ...[-1, 1].flatMap(s => [{ g: SPHl, m: M(s * 0.36, 1.0, 0.83, 0.14, 0.18, 0.09), c: '#2e1a36' }, { g: SPHl, m: M(s * 0.36 - 0.04, 1.07, 0.9, 0.055), c: '#ffffff' }, { g: SPHl, m: M(s * 0.6, 0.8, 0.72, 0.16, 0.08, 0.06), c: '#ff9ab8' }]),
  { g: SPHl, m: M(0, 0.8, 0.95, 0.07, 0.04, 0.03), c: '#5a2a40' }]);
export const armsGeo = () => mergeVC([-1, 1].map(s => ({ g: SPHl, m: M(s * 0.98, 0.7, 0.1, 0.2, 0.3, 0.2) })));
export function hatGeo(th) {
  if (th === 'candy') return mergeVC([-1, 1].flatMap(s => [{ g: new THREE.CapsuleGeometry(0.17, 0.6, 4, 10), m: M(s * 0.36, 1.95, -0.05, 1, 1, 0.8, 0, 0, -s * 0.25), c: '#ffffff' }, { g: new THREE.CapsuleGeometry(0.08, 0.45, 4, 8), m: M(s * 0.36, 1.95, 0.08, 1, 1, 0.5, 0, 0, -s * 0.25), c: '#ffb3cf' }]));
  if (th === 'sunflower') return mergeVC([{ g: CYL, m: M(0, 1.62, 0, 1.05, 0.06, 1.05), c: '#f2d38a' }, { g: CYL, m: M(0, 1.82, 0, 0.55, 0.38, 0.55), c: '#f2d38a' }, { g: CYL, m: M(0, 1.7, 0, 0.57, 0.1, 0.57), c: '#ff7f9f' }, { g: SPHl, m: M(0.45, 1.75, 0.3, 0.14), c: '#ffc928' }]);
  if (th === 'ice') return mergeVC([{ g: new THREE.SphereGeometry(1, 16, 8, 0, 6.29, 0, Math.PI / 2), m: M(0, 1.4, 0, 0.78, 0.6, 0.78), c: '#ff8fc0' }, { g: new THREE.TorusGeometry(0.75, 0.12, 8, 24), m: M(0, 1.42, 0, 1, 1, 1, Math.PI / 2), c: '#ffffff' }, { g: SPHl, m: M(0, 2.05, 0, 0.18), c: '#ffffff' }]);
  if (th === 'space') return mergeVC([{ g: CYL, m: M(0, 1.95, 0, 0.03, 0.5, 0.03), c: '#c9c2e8' }, { g: SPHl, m: M(0, 2.25, 0, 0.13), c: '#7ff5ff' }, { g: new THREE.TorusGeometry(0.95, 0.07, 6, 24), m: M(0, 1.0, 0, 1, 1, 1, Math.PI / 2), c: '#e6ecff' }]);
  return mergeVC([{ g: new THREE.TorusGeometry(0.82, 0.07, 6, 20, Math.PI), m: M(0, 1.05, 0, 1, 1, 1), c: '#3a3266' }, ...[-1, 1].map(s => ({ g: CYL, m: M(s * 0.85, 1.05, 0, 0.2, 0.16, 0.2, 0, 0, Math.PI / 2), c: '#5ff5ff' }))]);
}
function standGeo(cA, cB) { const P = [];
  for (let r = 0; r < 3; r++) P.push({ g: BOX, m: M(0, 0.6 + r * 1.2, -r * 2.6, 26, 1.2 + r * 2.4, 2.6), c: r % 2 ? cA : '#fff4fa' }), P[P.length - 1].m = M(0, (1.2 + r * 1.2) / 2, -r * 2.6, 26, 1.2 + r * 1.2, 2.6);
  P.push({ g: BOX, m: M(0, 3.5, -8.2, 26.4, 7, 0.5), c: cA });
  for (const x of [-13, 13]) { P.push({ g: BOX, m: M(x, 2.4, -2.6, 0.5, 4.8, 8.2), c: '#ffffff' }); P.push({ g: CYL, m: M(x, 4, 1.2, 0.22, 8, 0.22), c: '#ffffff' }); }
  P.push({ g: BOX, m: M(0, 8.1, -3.4, 27, 0.4, 10.4, 0.1), c: cB });
  for (let k = 0; k < 14; k++) P.push({ g: new THREE.CylinderGeometry(1, 1, 1, 12, 1, false, 0, Math.PI), m: M(-12.6 + k * 1.94, 7.65, 1.75, 0.97, 0.7, 0.5, 0, Math.PI / 2, Math.PI / 2), c: k % 2 ? cA : '#ffffff' });
  P.push({ g: BOX, m: M(0, 0.55, 1.35, 26, 1.1, 0.25), c: cB });
  return mergeVC(P); }
const stageGeo = (c) => mergeVC([{ g: CYL, m: M(0, 0.35, 0, 4.6, 0.7, 4.6), c: '#ffffff' }, { g: new THREE.TorusGeometry(4.6, 0.18, 8, 48), m: M(0, 0.7, 0, 1, 1, 1, Math.PI / 2), c }, { g: CYL, m: M(0, 0.72, 0, 4.2, 0.04, 4.2), c: C(c).lerp(C('#ffffff'), 0.55).getStyle() },
  ...[0, 1, 2, 3, 4, 5].map(k => ({ g: SPHl, m: M(Math.cos(k * 1.047) * 4.6, 0.7, Math.sin(k * 1.047) * 4.6, 0.28), c: '#fff4c8' }))]);
const balloonGeo = () => mergeVC([{ g: SPH, m: M(0, 6, 0, 0.9, 1.1, 0.9) }, { g: CONE, m: M(0, 4.85, 0, 0.18, 0.25, 0.18, Math.PI) }, { g: CYL, m: M(0, 2.4, 0, 0.025, 4.8, 0.025), c: '#ffffff' }, { g: SPHl, m: M(-0.35, 6.45, 0.62, 0.18, 0.26, 0.1), c: '#ffffff' }]);
const flagGeo = () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-0.55, 0, 0, 0.55, 0, 0, 0, -1.1, 0, 0.55, 0, 0, -0.55, 0, 0, 0, -1.1, 0], 3)); g.computeVertexNormals(); return g; };
function critterGeo(th) {
  if (th === 'candy') return mergeVC([{ g: new THREE.CylinderGeometry(1.2, 0.9, 1.3, 16), m: M(0, 0.65, 0), c: '#ffb3cf' }, { g: new THREE.TorusGeometry(1.1, 0.42, 8, 20), m: M(0, 1.45, 0, 1, 1, 1, Math.PI / 2), c: '#fff4fa' }, { g: CONE, m: M(0, 2.2, 0, 1.0, 1.2, 1.0), c: '#fff4fa' }, { g: SPHl, m: M(0, 3.0, 0, 0.35), c: '#ff4f7a' }]);
  if (th === 'sunflower') return mergeVC([{ g: SPH, m: M(0, 0, 0, 0.55, 0.45, 0.7), c: '#ffc928' }, { g: CYL, m: M(0, 0, 0.1, 0.57, 0.12, 0.57, Math.PI / 2), c: '#3a2a2a' }, { g: CYL, m: M(0, 0, -0.25, 0.5, 0.12, 0.5, Math.PI / 2), c: '#3a2a2a' }, ...[-1, 1].map(s => ({ g: SPHl, m: M(s * 0.45, 0.45, 0, 0.42, 0.06, 0.25, 0, 0, s * 0.4), c: '#ffffff' })), ...[-1, 1].map(s => ({ g: SPHl, m: M(s * 0.2, 0.15, 0.62, 0.08), c: '#2e1a36' }))]);
  if (th === 'ice') return mergeVC([{ g: SPH, m: M(0, 1.2, 0, 1.3), c: '#ffffff' }, { g: SPH, m: M(0, 2.9, 0, 0.9), c: '#ffffff' }, { g: CONE, m: M(0, 2.95, 1.05, 0.14, 0.6, 0.14, Math.PI / 2), c: '#ffa64d' }, ...[-1, 1].map(s => ({ g: SPHl, m: M(s * 0.3, 3.15, 0.8, 0.09), c: '#2e1a36' })), { g: new THREE.TorusGeometry(0.75, 0.2, 8, 20), m: M(0, 2.25, 0, 1, 1, 1, Math.PI / 2), c: '#ff6f9a' }, { g: CYL, m: M(0, 3.85, 0, 0.6, 0.15, 0.6), c: '#5a4a8a' }, { g: CYL, m: M(0, 4.2, 0, 0.42, 0.6, 0.42), c: '#5a4a8a' }]);
  if (th === 'space') return mergeVC([{ g: SPH, m: M(0, 0, 0, 3, 0.55, 3), c: '#c9d2f0' }, { g: new THREE.SphereGeometry(1, 16, 8, 0, 6.29, 0, Math.PI / 2), m: M(0, 0.3, 0, 1.5), c: '#9ff0ff' }, ...[0, 1, 2, 3, 4, 5, 6, 7].map(k => ({ g: SPHl, m: M(Math.cos(k * 0.785) * 2.7, -0.1, Math.sin(k * 0.785) * 2.7, 0.22), c: ['#ffe066', '#ff8fe0'][k % 2] }))]);
  return mergeVC([{ g: BOX, m: M(0, 1.6, 0, 2.2, 3.2, 1.8), c: '#2a2050' }, ...[0.9, 2.4].map(y => ({ g: CYL, m: M(0, y, 0.92, y > 2 ? 0.55 : 0.8, 0.12, y > 2 ? 0.55 : 0.8, Math.PI / 2), c: '#5ff5ff' })), { g: BOX, m: M(0, 3.25, 0, 2.3, 0.1, 1.9), c: '#ff5fd2' }]);
}

// --- carteles: atlas procedural nítido (texto + caritas dibujadas con canvas)
const SIGNS = { candy: ['¡VAMOS MOCHI!', 'GOMINOLAS', 'DULCE VUELTA', '♥ MOCHI RACERS'], sunflower: ['¡A TODO GAS!', 'MIEL FRESCA', 'GIRASOL FM', '♥ MOCHI RACERS'], ice: ['¡BRRR-RÁPIDO!', 'HELADOS', 'CUCURUCHO', '♥ MOCHI RACERS'], space: ['¡HACIA LAS ESTRELLAS!', 'SATURNINO', 'ZONA 0 G', '♥ MOCHI RACERS'], storm: ['¡A BAILAR!', 'DISCO RAYO', 'MÁS RÁPIDO', '♥ MOCHI RACERS'] };
function signAtlas(th, cA, cB) { const cv = document.createElement('canvas'); cv.width = 2048; cv.height = 1024; const x = cv.getContext('2d'); const W = 1024, H = 512;
  SIGNS[th].forEach((txt, k) => { const ox = (k % 2) * W, oy = (k >> 1) * H; const dark = th === 'storm' || th === 'space';
    const g = x.createLinearGradient(0, oy, 0, oy + H); g.addColorStop(0, dark ? '#2e2160' : '#ffffff'); g.addColorStop(1, dark ? '#1c1440' : '#fff0f7'); x.fillStyle = g; x.beginPath(); x.roundRect(ox + 16, oy + 16, W - 32, H - 32, 60); x.fill();
    x.lineWidth = 22; x.strokeStyle = k % 2 ? cA : cB === '#ffffff' ? cA : cB; x.beginPath(); x.roundRect(ox + 30, oy + 30, W - 60, H - 60, 50); x.stroke();
    // mochi dibujado
    const mx = ox + 170, my = oy + 270; x.fillStyle = ['#ff9cc8', '#7ee3c4', '#b9a2f7', '#ffd36b'][k]; x.beginPath(); x.ellipse(mx, my, 110, 95, 0, 0, 7); x.fill();
    x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.ellipse(mx - 45, my - 50, 34, 20, -0.5, 0, 7); x.fill();
    x.fillStyle = '#2e1a36'; for (const s of [-1, 1]) { x.beginPath(); x.ellipse(mx + s * 38, my + 5, 15, 20, 0, 0, 7); x.fill(); }
    x.fillStyle = '#fff'; for (const s of [-1, 1]) { x.beginPath(); x.arc(mx + s * 38 - 5, my - 3, 6, 0, 7); x.fill(); }
    x.fillStyle = 'rgba(255,110,150,.6)'; for (const s of [-1, 1]) { x.beginPath(); x.ellipse(mx + s * 66, my + 30, 18, 10, 0, 0, 7); x.fill(); }
    x.strokeStyle = '#2e1a36'; x.lineWidth = 6; x.lineCap = 'round'; x.beginPath(); x.arc(mx - 8, my + 30, 8, 0.2, Math.PI - 0.2); x.moveTo(mx + 16, my + 30); x.arc(mx + 8, my + 30, 8, 0.2, Math.PI - 0.2); x.stroke();
    // texto
    let fs = 118; x.font = `700 ${fs}px Fredoka, sans-serif`; while (x.measureText(txt).width > 660 && fs > 50) { fs -= 6; x.font = `700 ${fs}px Fredoka, sans-serif`; }
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.lineWidth = 18; x.strokeStyle = dark ? '#120a33' : '#ffffff'; x.strokeText(txt, ox + 640, oy + 262);
    x.fillStyle = dark ? (k % 2 ? '#7ff5ff' : '#ff8fe0') : (k % 2 ? '#ff6fa8' : '#8a5ad0'); x.fillText(txt, ox + 640, oy + 262); });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

// ======================================================================
export function addDeco(T, Q, { off, rnd }) {
  const { S, N, cup } = T, th = cup.theme, space = th === 'space', hi = !!Q.hi, dens = hi ? 1 : 0.65;
  const cA = cup.curbA, cB = cup.curbB;
  const pal = { candy: ['#ff9cc8', '#7ee3c4', '#b9a2f7', '#ffd36b', '#9fd8ff', '#ffb3cf'], sunflower: ['#ffd36b', '#ff9f7f', '#9fe0a0', '#ffb3cf', '#9fd8ff', '#fff1c0'], ice: ['#9fd8ff', '#ffffff', '#ffb3cf', '#c4b4ff', '#b8f0e0', '#e8f4ff'], space: ['#b9a2f7', '#7ff5ff', '#ff9ee0', '#ffe066', '#9fc3ff', '#d2bcff'], storm: ['#ff8fe0', '#7ff5ff', '#b98aff', '#ffe066', '#ff9f7f', '#a9b4ff'] }[th];
  const CH = new Chunks(T, 16);
  // ¿punto libre? (lejos de la pista, de los atajos y de las paredes)
  const free = (p, m) => { for (let j = 0; j < N; j += 2) { const q = S[j]; if ((q.p.x - p.x) ** 2 + (q.p.z - p.z) ** 2 < (q.wall + m) ** 2) return false; }
    if (T.inShortcut(p.x, p.z) != null) return false; for (const sc of T.shortcuts) for (const q of sc.pts) if ((q.x - p.x) ** 2 + (q.z - p.z) ** 2 < (sc.hw + m + 2) ** 2) return false; return true; };
  // altura del terreno a una distancia d del eje (talud de la pista → suelo)
  const gy = (s, d) => { if (space) return s.p.y - 1.2; const a = s.wall + 2, b = s.wall + 6 + s.p.y * 2.5; const t = Math.max(0, Math.min(1, (d - a) / (b - a))); return s.p.y * (1 - t) + -0.6 * t; };
  const faceYaw = (s, sd) => Math.atan2(-s.right.x * sd, -s.right.z * sd);
  const fanParts = (hatT, anim = {}) => [{ geo: bodyGeo(), mat: animMat('#ffffff', { rim: 0.45, vc: true }, anim) }, { geo: pomGeo(), mat: animMat('#ffffff', { vc: true, rim: 0.5, emissive: '#ffffff', ei: 0.12 }, { ...anim, wave: 1 }), tint: false, detail: true }, { geo: faceGeo(), mat: animMat('#ffffff', { vc: true, rim: 0 }, anim), tint: false, detail: true },
    { geo: armsGeo(), mat: animMat('#ffffff', { rim: 0.3 }, { ...anim, wave: 1 }), detail: true }, { geo: hatGeo(hatT), mat: animMat('#ffffff', { vc: true, rim: 0.2 }, anim), tint: false, detail: true }];
  const fans = [], stands = [], stageL = [], dancers = [], balloons = [], flags = [], poles = [], crit = [], mascots = [], plats = [];
  const used = []; const farFrom = (p, r) => used.every(([q, rr]) => (q.x - p.x) ** 2 + (q.z - p.z) ** 2 > (r + rr) ** 2);
  // 1) gradas grandes en rectas, con público
  const nSt = Math.round((hi ? 7 : 5) * Math.min(1.6, N / 500));
  for (let k = 0, tries = 0; k < nSt && tries < 200; tries++) { const i = Math.floor(rnd() * N), s = S[i]; if (Math.abs(s.curv) > 0.08) continue; const sd = rnd() < 0.5 ? -1 : 1, d = s.wall + 12;
    const p = off(s, sd * d); const yaw = faceYaw(s, sd), fx = Math.sin(yaw), fz = Math.cos(yaw), rx = fz, rz = -fx;
    const corners = [[-14, 2], [14, 2], [-14, -9], [14, -9]].map(([a, b]) => new V3(p.x + rx * a + fx * b, 0, p.z + rz * a + fz * b)); if (!corners.every(c => free(c, 3)) || !farFrom(p, 22)) continue;
    p.y = gy(s, d) - (space ? 0 : 0.1); used.push([p, 18]); stands.push({ p, yaw, i, s: 1 }); k++;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 11; c++) { const a = -11 + c * 2.2 + (r % 2) * 1.1, b = -r * 2.6 - 0.3; fans.push({ p: new V3(p.x + rx * a + fx * b, p.y + 1.2 + r * 1.2, p.z + rz * a + fz * b), yaw, i, s: 0.82, c: pal[(c + r * 3 + k) % pal.length], amp: 0.8 + rnd() * 0.5 }); }
    for (let b = 0; b < 6; b++) { const a = (b - 2.5) * 5; balloons.push({ p: new V3(p.x + rx * a - fx * 9, p.y + 7.5 + (b % 2) * 1.5, p.z + rz * a - fz * 9), yaw: rnd() * 6, i, s: 1.0, c: pal[b % pal.length] }); } }
  // 2) grupitos de público a pie de pista (saltan y saludan)
  for (let i = 0; i < N; i += Math.round(10 / dens)) { if (rnd() < 0.3) continue; const s = S[i], sd = rnd() < 0.5 ? -1 : 1, n = 3 + Math.floor(rnd() * 5);
    for (let k = 0; k < n; k++) { const d = s.wall + 5 + (k % 2) * 1.9 + rnd() * 0.5, j = (i + Math.round((k - n / 2) * 0.9) + N) % N, sj = S[j]; const p = off(sj, sd * d); if (!free(p, 3.2)) continue; p.y = gy(sj, d);
      fans.push({ p, yaw: faceYaw(sj, sd) + (rnd() - 0.5) * 0.5, i: j, s: 0.75 + rnd() * 0.25, c: pal[Math.floor(rnd() * pal.length)], amp: 0.6 + rnd() * 0.7 }); if (space && k === 0) plats.push({ p: p.clone().setY(p.y - 0.05), yaw: 0, i: j, s: 1, c: '#5a4a9a' }); } }
  // 3) escenarios con mochis bailando
  const nStage = hi ? 5 : 4;
  for (let k = 0, tries = 0; k < nStage && tries < 120; tries++) { const i = Math.floor(rnd() * N), s = S[i], sd = rnd() < 0.5 ? -1 : 1, d = s.wall + 10; const p = off(s, sd * d); if (!free(p, 6.5) || !farFrom(p, 10)) continue; p.y = gy(s, d); used.push([p, 8]); k++;
    stageL.push({ p, yaw: 0, i, s: 1 }); for (let m = 0; m < 5; m++) { const a = m / 5 * 6.283; dancers.push({ p: new V3(p.x + Math.cos(a) * 2.6, p.y + 0.72, p.z + Math.sin(a) * 2.6), yaw: faceYaw(s, sd), i, s: 1.15, c: pal[m % pal.length], ph: m * 1.25, amp: 1 }); }
    for (let b = 0; b < 4; b++) balloons.push({ p: new V3(p.x + Math.cos(b * 1.57 + 0.78) * 4.8, p.y + 0.5, p.z + Math.sin(b * 1.57 + 0.78) * 4.8), yaw: 0, i, s: 1.1, c: pal[(b + 2) % pal.length] }); }
  // 4) guirnaldas de banderines a lo largo de la pista (fuera de la pared)
  for (let i0 = 0; i0 < N; i0 += 70) { const sd = (i0 / 70) % 2 ? 1 : -1; let prev = null;
    for (let i = i0; i < i0 + 42 && i < N; i += 7) { const s = S[i], d = s.wall + 4; const p = off(s, sd * d); if (!free(p, 3.4)) { prev = null; continue; } p.y = gy(s, d); poles.push({ p, yaw: 0, i, s: 1 });
      if (prev) for (let f = 1; f < 7; f++) { const u = f / 7; const q = new V3().lerpVectors(prev, p, u); q.y = prev.y + (p.y - prev.y) * u + 5.6 - Math.sin(u * Math.PI) * 1.2; flags.push({ p: q, yaw: Math.atan2(p.x - prev.x, p.z - prev.z) + Math.PI / 2, i, s: 0.9, c: pal[(f + i) % pal.length], ph: i * 0.3 + f }); }
      prev = p; } }
  // 5) globos sueltos y mascotas gigantes
  for (let k = 0; k < Math.round(40 * dens); k++) { const i = Math.floor(rnd() * N), s = S[i], sd = rnd() < 0.5 ? -1 : 1, d = s.wall + 8 + rnd() * 30; const p = off(s, sd * d); if (!free(p, 4)) continue; p.y = gy(s, d) + (space ? -4 + rnd() * 10 : 0);
    for (let b = 0; b < 3; b++) balloons.push({ p: new V3(p.x + (b - 1) * 0.9, p.y + (b % 2) * 0.8, p.z + (b - 1) * 0.4), yaw: rnd() * 6, i, s: 0.9 + rnd() * 0.3, c: pal[(k + b) % pal.length] }); }
  for (let k = 0, tries = 0; k < 3 && tries < 80; tries++) { const i = Math.floor(rnd() * N), s = S[i], sd = rnd() < 0.5 ? -1 : 1, d = s.wall + 30 + rnd() * 20; const p = off(s, sd * d); if (!free(p, 18) || !farFrom(p, 14)) continue; p.y = gy(s, d) + (space ? -2 : 0); used.push([p, 10]); k++;
    mascots.push({ p, yaw: faceYaw(s, sd), i, s: 6.5, c: pal[k], amp: 1, ph: k }); }
  // 6) bichitos / extras de la temática
  for (let k = 0; k < Math.round((th === 'sunflower' ? 36 : th === 'space' ? 18 : 28) * dens); k++) { const i = Math.floor(rnd() * N), s = S[i], sd = rnd() < 0.5 ? -1 : 1, d = s.wall + 6 + rnd() * 34; const p = off(s, sd * d); if (!free(p, 4)) continue;
    p.y = gy(s, d) + (th === 'sunflower' ? 3 + rnd() * 5 : th === 'space' ? 2 + rnd() * 14 : 0); crit.push({ p, yaw: rnd() * 6.28, i, s: th === 'space' ? 1 + rnd() * 0.6 : 0.9 + rnd() * 0.5, c: '#ffffff', amp: 1 }); }
  // --- montar instancias por trozos
  const hatT = th;
  CH.add(fanParts(hatT, { jump: 0.55, spd: 5.5 }), fans);
  CH.add(fanParts(hatT, { jump: 0.9, spd: 4, spin: 1.2, sway: 0.08 }), dancers);
  CH.add(fanParts(hatT, { jump: 0.35, spd: 1.6, sq: 0.6, sway: 0.03 }), mascots, 2.2);
  CH.add([{ geo: standGeo(cA, cB === '#ffffff' ? '#ffd0e6' : cB), mat: toon('#ffffff', { vc: true, rim: 0.15 }), tint: false }], stands, 1.4);
  CH.add([{ geo: stageGeo(cA), mat: toon('#ffffff', { vc: true, rim: 0.2 }), tint: false }], stageL);
  if (plats.length) CH.add([{ geo: (() => { const g = new THREE.CylinderGeometry(3.4, 2.2, 1.0, 14); g.translate(0, -0.5, 0); return g; })(), mat: toon('#ffffff', { rim: 0.5 }) }], plats);
  CH.add([{ geo: balloonGeo(), mat: animMat('#ffffff', { vc: true, rim: 0.45 }, { jump: 0, sq: 0, bob: 0.45, sway: 0.02, spd: 1.2 }) }], balloons, 1.3);
  CH.add([{ geo: new THREE.CylinderGeometry(0.12, 0.15, 6, 8).translate(0, 3, 0), mat: toon('#ffffff', { rim: 0.3 }) }], poles);
  CH.add([{ geo: flagGeo(), mat: animMat('#ffffff', { side: THREE.DoubleSide, rim: 0 }, { jump: 0, sq: 0, sway: 0.18, spd: 3 }) }], flags);
  const cAnim = { candy: { jump: 0, sq: 0 }, sunflower: { jump: 0, sq: 0, bob: 0.8, spin: 2.5, spd: 1.5 }, ice: { jump: 0.15, sq: 0.4, spd: 2, sway: 0.03 }, space: { jump: 0, sq: 0, bob: 1.2, spin: 3, spd: 0.6 }, storm: { jump: 0, sq: 1.6, spd: 7 } }[th];
  CH.add([{ geo: critterGeo(th), mat: animMat('#ffffff', { vc: true, rim: 0.35 }, cAnim), tint: false }], crit, 1.2);
  // --- carteles (un solo draw call para todos los paneles + uno para marcos)
  { const tex = signAtlas(th, cA, cB), panels = [], frames = []; let k = 0;
    for (let tries = 0; tries < 200 && k < (hi ? 10 : 7); tries++) { const i = Math.floor(rnd() * N), s = S[i], sd = rnd() < 0.5 ? -1 : 1, d = s.wall + 6.5; const p = off(s, sd * d); if (!free(p, 5.5) || !farFrom(p, 7)) continue; p.y = gy(s, d); used.push([p, 6]);
      const yaw = faceYaw(s, sd) + (rnd() - 0.5) * 0.3, cell = k % 4, base = M(p.x, p.y, p.z, 1, 1, 1, 0, yaw, 0);
      const pg = new THREE.PlaneGeometry(8, 4); const uv = pg.attributes.uv; for (let v = 0; v < uv.count; v++) uv.setXY(v, ((cell % 2) + uv.getX(v)) / 2, 1 - ((cell >> 1) + 1 - uv.getY(v)) / 2);
      pg.applyMatrix4(new THREE.Matrix4().multiplyMatrices(base, M(0, 5.2, 0.22))); panels.push(pg);
      frames.push({ g: BOX, m: new THREE.Matrix4().multiplyMatrices(base, M(0, 5.2, 0, 8.6, 4.6, 0.35)), c: cA }, ...[-3, 3].map(x => ({ g: CYL, m: new THREE.Matrix4().multiplyMatrices(base, M(x, 1.6, -0.1, 0.22, 3.2, 0.22)), c: '#ffffff' })),
        ...[-4.3, 4.3].map(x => ({ g: SPHl, m: new THREE.Matrix4().multiplyMatrices(base, M(x, 7.5, 0, 0.35)), c: cB === '#ffffff' ? cA : cB }))); k++; }
    if (panels.length) { const pos = [], nor = [], uvs = []; for (const g of panels) { const gg = g.toNonIndexed(); pos.push(...gg.attributes.position.array); nor.push(...gg.attributes.normal.array); uvs.push(...gg.attributes.uv.array); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      T.group.add(new THREE.Mesh(g, new THREE.MeshToonMaterial({ map: tex, color: th === 'storm' || space ? '#ffffff' : '#ffffff', emissive: th === 'storm' || space ? '#ffffff' : '#000000', emissiveMap: th === 'storm' || space ? tex : null, emissiveIntensity: 0.55 })));
      T.group.add(new THREE.Mesh(mergeVC(frames), toon('#ffffff', { vc: true, rim: 0.3 }))); } }
  T.cheerFans = fans.length + dancers.length;
  T.anims.push((t, dt, race) => { TIME.value = t; const cam = race && race.camera ? race.camera.position : null; if (cam) CH.update(cam, hi); });
  return { fans: fans.length, dancers: dancers.length, stands: stands.length, balloons: balloons.length, flags: flags.length, mascots: mascots.length, critters: crit.length };
}
