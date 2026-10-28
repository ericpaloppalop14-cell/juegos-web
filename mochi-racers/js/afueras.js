// v46: afueras de las pistas más bonitas (golosinas e islotes en instancias, solo decorado lejano), brillo de sol y motas de luz.
// Todo en pocas llamadas de dibujo; los adornos se colocan a más de 34 m de cualquier muro, así que nada del decorado se cruza con la pista ni con los karts.
import * as THREE from 'three';
import { toon } from './gfx.js';
const DAYLOOK = ['sky', 'ocean', 'book'];
function merge(parts) { // parts: [geometry, matrix4, color]
  const pos = [], nor = [], col = [], idx = []; let off = 0, c = new THREE.Color();
  for (const [g0, m, color] of parts) { const g = g0.clone().applyMatrix4(m); const p = g.attributes.position, n = g.attributes.normal; c.set(color);
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); const sh = 0.78 + 0.22 * Math.max(0, Math.min(1, (p.getY(i) + 0.2) / 2.2)); col.push(c.r * sh, c.g * sh, c.b * sh); }
    const ix = g.index; if (ix) for (let i = 0; i < ix.count; i++) idx.push(ix.getX(i) + off); else for (let i = 0; i < p.count; i++) idx.push(i + off); off += p.count; }
  const G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); G.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); G.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); G.setIndex(idx); return G;
}
const M4 = (x, y, z, sx = 1, sy = sx, sz = sx, rx = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, 0)), new THREE.Vector3(sx, sy, sz));
const SPH = new THREE.SphereGeometry(1, 12, 9), CYL = new THREE.CylinderGeometry(1, 1, 1, 8), CONE = new THREE.ConeGeometry(1, 1, 8), TOR = new THREE.TorusGeometry(1, 0.22, 6, 14);
const gumdrop = () => merge([[SPH, M4(0, 1.0, 0, 1.4, 1.1, 1.4), '#ffffff'], [SPH, M4(0, 2.15, 0, 0.35, 0.3, 0.35), '#ffffff'], [TOR, M4(0, 1.0, 0, 1.45, 1.1, 1.45, Math.PI / 2), '#f6f0ff']]);
const lolli = () => merge([[CYL, M4(0, 1.8, 0, 0.16, 3.6, 0.16), '#fff4fa'], [SPH, M4(0, 4.4, 0, 1.5, 1.5, 0.5), '#ffffff'], [TOR, M4(0, 4.4, 0.4, 0.95, 0.95, 0.5), '#fff2c4'], [TOR, M4(0, 4.4, 0.4, 0.45, 0.45, 0.5), '#ffe0f2']]);
const puffTree = () => merge([[CYL, M4(0, 1.3, 0, 0.32, 2.6, 0.32), '#fff0e0'], [SPH, M4(0, 3.3, 0, 1.5, 1.3, 1.5), '#ffffff'], [SPH, M4(0.9, 2.7, 0.3, 1.0, 0.9, 1.0), '#f4fff4'], [SPH, M4(-0.9, 2.8, -0.2, 1.1, 0.95, 1.1), '#ffffff'], [SPH, M4(0.1, 4.3, 0.2, 0.8, 0.7, 0.8), '#fffff0']]);
const islet = () => merge([[CONE, M4(0, -0.9, 0, 2.2, 2.4, 2.2, Math.PI), '#e8d8ff'], [CYL, M4(0, 0.05, 0, 2.3, 0.3, 2.3), '#ffffff'], [SPH, M4(0.3, 0.6, 0, 1.1, 0.9, 1.1), '#fff0f8'], [SPH, M4(-0.9, 0.35, 0.5, 0.5, 0.45, 0.5), '#f4fff8']]);
let glowT; const glowTex = () => glowT || (glowT = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })());
export function addOutskirts(race) {
  const { scene, track: T, cup, quality } = race, hi = quality.hi, floaty = !cup.ground, night = (cup.theme === 'space' && !DAYLOOK.includes(cup.look)) || cup.theme === 'storm';
  let seed = 4601 + cup.id.length * 31; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pal = [cup.curbA, cup.curbB, cup.ground2 || '#ffd7ea', '#ffffff', cup.road].filter(Boolean).map(c => new THREE.Color(c).lerp(new THREE.Color('#ffffff'), night ? 0.05 : 0.3));
  const kinds = floaty ? [islet(), islet(), gumdrop()] : cup.theme === 'ice' ? [gumdrop(), puffTree(), lolli()] : [gumdrop(), lolli(), puffTree()];
  const N = hi ? 54 : 30, mats = kinds.map(() => toon('#ffffff', { vc: true, rim: 0.5, nocache: true, emissive: night ? '#ffffff' : '#000000', ei: night ? 0.18 : 1 }));
  const inst = kinds.map((g, k) => { const m = new THREE.InstancedMesh(g, mats[k], N); m.frustumCulled = false; m.count = 0; m.userData.base = []; scene.add(m); return m; });
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), V = new THREE.Vector3(), Sc = new THREE.Vector3(), S = T.S, n = S.length;
  let placed = 0;
  for (let tries = 0; tries < 900 && placed < N * 3; tries++) {
    const i = (R() * n) | 0, s = S[i], side = R() < 0.5 ? -1 : 1, d = s.wall + 34 + R() * (floaty ? 90 : 150);
    const x = s.p.x + s.right.x * side * d, z = s.p.z + s.right.z * side * d; let ok = true;
    for (let j = 0; j < n; j += 2) { const o = S[j], dx = o.p.x - x, dz = o.p.z - z; if (dx * dx + dz * dz < (o.wall + 30) ** 2) { ok = false; break; } }
    if (!ok) continue;
    const k = floaty ? (R() < 0.7 ? 0 : 2) : (R() * 3) | 0, mesh = inst[k]; if (mesh.count >= N) continue;
    const sc = floaty ? (k === 2 ? 2.2 : 3 + R() * 3) : 2.2 + R() * 3.2, y = floaty ? s.p.y - 18 + R() * 40 : -0.62;
    q.setFromEuler(new THREE.Euler(0, R() * 6.28, 0)); Sc.setScalar(sc); V.set(x, y, z); M.compose(V, q, Sc); mesh.setMatrixAt(mesh.count, M);
    mesh.setColorAt(mesh.count, pal[(R() * pal.length) | 0]); mesh.userData.base.push([x, y, z, sc, R() * 6.28]); mesh.count++; placed++;
  }
  inst.forEach(m => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
  // brillo de sol (solo de día)
  let sun = null; if (!night) { sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#fff0c0', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55, fog: false })); sun.position.set(80, 160, 60).normalize().multiplyScalar(1150); sun.scale.setScalar(520); sun.renderOrder = -9; scene.add(sun); }
  // motas de luz que flotan alrededor de la cámara
  const NP = hi ? 70 : 36, pp = new Float32Array(NP * 3); for (let i = 0; i < NP; i++) { pp[i * 3] = (R() - 0.5) * 70; pp[i * 3 + 1] = R() * 28; pp[i * 3 + 2] = (R() - 0.5) * 70; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp.slice(), 3));
  const motes = new THREE.Points(pg, new THREE.PointsMaterial({ map: glowTex(), color: night ? '#b8a8ff' : '#fff6c8', size: 0.5, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55, fog: false })); motes.frustumCulled = false; scene.add(motes);
  let f = 0;
  return { count: placed, update(t, dt, cam) {
    const a = pg.attributes.position; for (let i = 0; i < NP; i++) { const y = ((pp[i * 3 + 1] + t * (0.6 + (i % 5) * 0.12)) % 28); a.setXYZ(i, cam.x + pp[i * 3] + Math.sin(t * 0.6 + i) * 1.5, cam.y - 6 + y, cam.z + pp[i * 3 + 2] + Math.cos(t * 0.5 + i) * 1.5); } a.needsUpdate = true;
    if (floaty && (++f & 1)) inst.forEach(m => { const b = m.userData.base; for (let i = 0; i < m.count; i++) { const e = b[i]; V.set(e[0], e[1] + Math.sin(t * 0.8 + e[4]) * 1.4, e[2]); q.setFromEuler(new THREE.Euler(0, e[4] + t * 0.05, 0)); Sc.setScalar(e[3]); M.compose(V, q, Sc); m.setMatrixAt(i, M); } m.instanceMatrix.needsUpdate = true; });
  } };
}
