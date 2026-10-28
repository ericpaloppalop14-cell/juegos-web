// ======================================================================
//  v7 · Decoración de los mapas surrealistas (solo visual, sin colisión, siempre fuera de la pista)
//  sky:   islas flotando en el cielo, planetas de gominola con anillos, cascadas que caen al vacío
//  dream: relojes derretidos, escaleras imposibles, objetos flotando y girando
// ======================================================================
import * as THREE from 'three';
import { toon } from './gfx.js';
import { addWonder } from './wonder.js';
const V3 = THREE.Vector3;
export function addDream(T, Q, rnd) {
  if (cup_isWonder(T.cup.look)) return addWonder(T, Q, rnd); // v14: Océano Volador y Biblioteca Infinita
  const { S, N, cup, group } = T, hi = !!Q.hi, look = cup.look, anim = [];
  const G = new THREE.Group(); group.add(G);
  const sph = new THREE.SphereGeometry(1, 20, 14), cyl = new THREE.CylinderGeometry(1, 1, 1, 24), cone = new THREE.ConeGeometry(1, 1, 18), box = new THREE.BoxGeometry(1, 1, 1), tor = new THREE.TorusGeometry(1, 0.08, 8, 48);
  const M = (g, c, o) => new THREE.Mesh(g, toon(c, o));
  const spot = (minD, maxD, dy) => { const s = S[Math.floor(rnd() * N)], side = rnd() < 0.5 ? -1 : 1, d = s.w + minD + rnd() * (maxD - minD); return new V3(s.p.x + s.right.x * d * side, s.p.y + dy, s.p.z + s.right.z * d * side); };
  const n = hi ? 1 : 0.6;
  // v51: el decorado grande (islas, planetas con anillo, nubes) nunca puede invadir la calzada ni el volumen de la cámara.
  // Se comprueba contra TODA la pista (no solo contra el tramo elegido: la pista se acerca a sí misma) y se recoloca con un generador propio,
  // así no cambia el reparto aleatorio del resto del decorado.
  const clearOf = (p, rad) => { for (let i = 0; i < N; i += 2) { const s = S[i], dx = s.p.x - p.x, dy = s.p.y + 6 - p.y, dz = s.p.z - p.z, lim = rad + s.w + 8; if (dx * dx + dy * dy + dz * dz < lim * lim) return false; } return true; };
  const placeClear = (g, rad, minD, maxD, dyF, seed) => { // dyF(r) -> desnivel respecto al tramo elegido
    if (clearOf(g.position, rad)) return true; let q = seed * 7919 + 17; const lr = () => (q = (q * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 60; k++) { const s = S[Math.floor(lr() * N)], side = lr() < 0.5 ? -1 : 1, d = s.w + minD + lr() * (maxD - minD), p = new V3(s.p.x + s.right.x * d * side, s.p.y + dyF(lr()), s.p.z + s.right.z * d * side); if (clearOf(p, rad)) { g.position.copy(p); return true; } }
    return false; };
  if (look === 'sky') {
    const grass = ['#a8f0c0', '#ffd6ec', '#c9b8ff', '#fff2a8'], rock = ['#e7c3ff', '#ffc4e1', '#b8e6ff'];
    for (let i = 0; i < 26 * n; i++) { // islas flotantes
      const g = new THREE.Group(), r = 6 + rnd() * 16; g.position.copy(spot(22, 160, -20 + rnd() * 60));
      const top = M(cyl, grass[i % 4]); top.scale.set(r, 2, r); g.add(top);
      const bot = M(cone, rock[i % 3]); bot.scale.set(r * 0.95, r * 1.4, r * 0.95); bot.rotation.x = Math.PI; bot.position.y = -r * 0.7 - 1; g.add(bot);
      for (let j = 0; j < 3; j++) { const t = M(sph, ['#ff8fc0', '#7ee3c4', '#ffd36b'][j]); const a = rnd() * 6.28, d = rnd() * r * 0.6; t.scale.setScalar(1.5 + rnd() * 2.5); t.position.set(Math.cos(a) * d, 2.5, Math.sin(a) * d); g.add(t); }
      if (rnd() < 0.5) { const w = M(cyl, '#bfeaff', { opacity: 0.7 }); w.scale.set(1.2, 40, 0.4); w.position.set(r * 0.8, -20, 0); g.add(w); }
      g.userData = { y0: g.position.y, ph: rnd() * 6 }; if (!placeClear(g, r * 1.5 + 5, 22, 160, u => -20 + u * 60, i + 1)) continue; g.userData.y0 = g.position.y; G.add(g); anim.push(t => { g.position.y = g.userData.y0 + Math.sin(t * 0.5 + g.userData.ph) * 2.5; });
    }
    for (let i = 0; i < 9 * n; i++) { // planetas de gominola
      const g = new THREE.Group(), r = 14 + rnd() * 34; g.position.copy(spot(120, 420, 30 + rnd() * 120));
      const b = M(sph, ['#ff9cc8', '#7fd8ff', '#ffd36b', '#b9a2f7', '#7ee3c4'][i % 5], { opacity: 0.92 }); b.scale.setScalar(r); g.add(b);
      if (i % 2 === 0) { const ring = M(tor, '#ffffff'); ring.scale.set(r * 1.6, r * 1.6, r * 3); ring.rotation.x = 1.2 + rnd() * 0.3; g.add(ring); }
      for (let j = 0; j < 6; j++) { const sp = M(sph, '#ffffff', { opacity: 0.6 }); sp.scale.setScalar(r * 0.12); const a = rnd() * 6.28, bb = rnd() * 3; sp.position.set(Math.cos(a) * Math.sin(bb) * r, Math.cos(bb) * r, Math.sin(a) * Math.sin(bb) * r); g.add(sp); }
      if (!placeClear(g, (i % 2 === 0 ? r * 1.9 : r * 1.15) + 4, 120, 420, u => 30 + u * 120, i + 101)) continue; // el anillo gira: se cuenta toda su esfera
      G.add(g); anim.push(t => { g.rotation.y = t * 0.05 + i; });
    }
    for (let i = 0; i < 30 * n; i++) { const c = M(sph, '#ffffff', { opacity: 0.85 }); c.scale.set(8 + rnd() * 10, 3 + rnd() * 3, 6 + rnd() * 6); c.position.copy(spot(10, 200, -30 - rnd() * 40)); if (!placeClear(c, 20, 10, 200, u => -30 - u * 40, i + 201)) continue; G.add(c); }
  } else {
    const face = ['#fff6e0', '#ffe2b8', '#ffd0f0'], rim = ['#ffb36b', '#c9a2ff', '#7fd8ff'];
    const clock = (s) => { const g = new THREE.Group(); const f = M(cyl, face[Math.floor(rnd() * 3)]); f.scale.set(s, s * 0.12, s); f.rotation.x = Math.PI / 2; g.add(f);
      const r = M(tor, rim[Math.floor(rnd() * 3)]); r.scale.set(s, s, s * 1.4); g.add(r);
      const h1 = M(box, '#5a3a7a'), h2 = M(box, '#5a3a7a'); h1.scale.set(s * 0.08, s * 0.6, s * 0.05); h1.position.set(0, s * 0.3, s * 0.08); h2.scale.set(s * 0.07, s * 0.42, s * 0.05); const hp = new THREE.Group(); hp.add(h2); h2.position.y = s * 0.21; h2.position.z = s * 0.08; g.add(h1, hp);
      for (let k = 0; k < 3; k++) { const d = M(cone, f.material.color.getStyle()); d.scale.set(s * 0.12, s * (0.4 + rnd() * 0.6), s * 0.12); d.rotation.x = Math.PI; d.position.set((rnd() - 0.5) * s, -s * (0.9 + rnd() * 0.3), 0); g.add(d); } // goterones derretidos
      g.scale.y = 1.15; g.userData.hp = hp; return g; };
    for (let i = 0; i < 18 * n; i++) { const s = 5 + rnd() * 10, g = clock(s); g.position.copy(spot(16, 140, 4 + rnd() * 50)); g.rotation.set(rnd() * 0.8 - 0.4, rnd() * 6.28, rnd() * 1.2 - 0.6); const sp = 0.2 + rnd() * 0.6, y0 = g.position.y, ph = rnd() * 6; G.add(g);
      anim.push(t => { g.userData.hp.rotation.z = -t * sp * 3; g.rotation.y += 0.0015; g.position.y = y0 + Math.sin(t * 0.4 + ph) * 3; }); }
    for (let i = 0; i < 10 * n; i++) { // escaleras imposibles: un cuadrado de escalones que sube por los 4 lados
      const g = new THREE.Group(), L = 6, st = 2.4, c = ['#ffe2b8', '#e7c3ff', '#ffc4e1'][i % 3];
      for (let side = 0; side < 4; side++) for (let k = 0; k < L; k++) { const b = M(box, c); b.scale.set(st, 1.2, 4); const q = side * L + k; const a = side * Math.PI / 2; const x = (k - L / 2) * st; b.position.set(Math.cos(a) * x - Math.sin(a) * L * st / 2, q * 0.55 - (q > 2 * L ? (q - 2 * L) * 1.1 : 0), Math.sin(a) * x + Math.cos(a) * L * st / 2); b.rotation.y = -a; g.add(b); }
      g.position.copy(spot(30, 180, 10 + rnd() * 60)); g.rotation.set(rnd() * 1.4, rnd() * 6, rnd() * 1.4); const sp = (rnd() - 0.5) * 0.12; G.add(g); anim.push((t, dt) => { g.rotation.z += sp * (dt || 0.016); g.rotation.x += sp * 0.5 * (dt || 0.016); });
    }
    const flo = [[sph, '#ff9cc8'], [box, '#7fd8ff'], [cone, '#ffd36b'], [tor, '#ffffff']];
    for (let i = 0; i < 40 * n; i++) { const [gg, c] = flo[i % 4], m = M(gg, c); m.scale.setScalar(1 + rnd() * 3); m.position.copy(spot(8, 90, 6 + rnd() * 30)); const y0 = m.position.y, ph = rnd() * 6, sp = 0.3 + rnd(); G.add(m); anim.push(t => { m.position.y = y0 + Math.sin(t * sp + ph) * 2; m.rotation.x = t * sp; m.rotation.y = t * sp * 0.7; }); }
  }
  T.anims.push((t, dt) => { for (const f of anim) f(t, dt); });
}

function cup_isWonder(l) { return l === 'ocean' || l === 'book'; }
