// ======================================================================
//  AMBIENTE por mundo (capa extra al estilo de Lianas): capas de fondo, criaturas animadas,
//  partículas y luz. Todo fuera de la zona de juego, apoyado en el suelo o en el aire. Barato: instanciado + Points.
// ======================================================================
import { THREE, toon, mesh, glowSprite, rnd, pick } from '../core3d.js?v=m14';
import { instSet } from './decor.js?v=o13';

const lo = () => innerWidth * innerHeight < 500000;
// punto aleatorio fuera de la zona de juego
function outside(area, dmin, dmax) {
  if (area.track) { const { z0, z1, half } = area.track, s = Math.random() < .5 ? -1 : 1; return [s * (half + rnd(dmin, dmax)), rnd(z1 - 10, z0 + 6)]; }
  const r = area.arena ? area.arena.r : 12, a = rnd(0, 6.28), d = r + rnd(dmin, dmax); return [Math.cos(a) * d, Math.sin(a) * d];
}
function centerZ(area) { return area.track ? (area.track.z0 + area.track.z1) / 2 : 0; }
function points(sc, n, color, size, box, opacity = .9, add = false) { const p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { p[i * 3] = rnd(box[0], box[1]); p[i * 3 + 1] = rnd(box[2], box[3]); p[i * 3 + 2] = rnd(box[4], box[5]); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const m = new THREE.Points(g, new THREE.PointsMaterial({ color, size, transparent: true, opacity, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending })); m.frustumCulled = false; sc.add(m); return { m, p, g, n, box }; }
function rays(sc, n, color, area, op = .09) { const out = []; const zc = centerZ(area); for (let i = 0; i < n; i++) { const r = mesh(new THREE.CylinderGeometry(.8, 3, 26, 10, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }), sc, [rnd(-22, 22), 12, zc + rnd(-25, 15)], [.3, 0, rnd(-.35, .35)]); r.userData.ph = rnd(0, 6); r.userData.op = op; out.push(r); } return out; }
function flyers(sc, n, colors, wing, fn) { const out = []; const wg = new THREE.PlaneGeometry(wing[0], wing[1]); wg.translate(wing[0] / 2, 0, 0);
  for (let i = 0; i < n; i++) { const g = new THREE.Group(), m = toon(pick(colors), { rim: .4 }); m.side = THREE.DoubleSide; const a = new THREE.Mesh(wg, m), b = new THREE.Mesh(wg, m); b.scale.x = -1; g.add(a, b); mesh(new THREE.SphereGeometry(1, 8, 6), m, g, [0, 0, 0], null, [wing[1] * .45, wing[1] * .4, wing[0] * .7]); g.userData = { a, b, ...fn(i) }; sc.add(g); out.push(g); } return out; }

export function ambiente(E, mk, area) {
  const sc = E.scene, L = lo(), zc = centerZ(area), ticks = [];
  const box = [-45, 45, 0, 22, zc - 60, zc + 25];
  if (mk === 'espacio') {
    // nebulosas brillantes, estrellas fugaces, asteroides flotando bajos y cristales que laten
    for (let i = 0; i < 7; i++) { const s = glowSprite(pick(['#ff7ad8', '#8a7aff', '#5ad8ff']), rnd(40, 80), .25); s.position.set(rnd(-120, 120), rnd(25, 70), zc - rnd(90, 180)); s.material.fog = false; sc.add(s); }
    const sh = []; for (let i = 0; i < 4; i++) { const s = glowSprite('#ffffff', 2.2, 1); s.material.fog = false; sc.add(s); const tr = glowSprite('#bfe0ff', 6, .5); tr.material.fog = false; tr.scale.set(9, 1, 1); sc.add(tr); sh.push({ s, tr, t: rnd(0, 6) }); }
    const ast = []; for (let i = 0; i < (L ? 14 : 24); i++) { const [x, z] = outside(area, 5, 22); ast.push({ x, y: rnd(2.5, 7), z, s: rnd(.4, 1.2), anim: 'float', sp: rnd(.3, .8), amp: rnd(.3, .8), ph: rnd(0, 6) }); }
    const A = instSet(sc, 'meteoro', ast);
    const cr = []; for (let i = 0; i < (L ? 10 : 18); i++) { const [x, z] = outside(area, 3, 14); const g = glowSprite(pick(['#c9b2ff', '#7ee3ff', '#ff9cf0']), 2.4, .6); g.position.set(x, .6, z); sc.add(g); cr.push(g); }
    const dust = points(sc, L ? 120 : 220, '#d8c8ff', .18, box, .8, true);
    ticks.push((t, dt) => { A.tick(t); cr.forEach((g, i) => g.material.opacity = .35 + .3 * Math.sin(t * 2 + i));
      for (const o of sh) { o.t += dt; const k = (o.t % 6) / 1.2; if (k < 1) { const x = -80 + k * 160, y = 60 - k * 25, z = zc - 140; o.s.position.set(x, y, z); o.tr.position.set(x - 4, y + .6, z); o.s.visible = o.tr.visible = true; } else o.s.visible = o.tr.visible = false; }
      const p = dust.p; for (let i = 0; i < dust.n; i++) p[i * 3 + 1] += Math.sin(t + i) * dt * .2; dust.g.attributes.position.needsUpdate = true; });
  } else if (mk === 'desierto') {
    // dunas en capas, rodadoras que cruzan rodando, buitres en círculos, arena al viento y calima
    const du = []; for (let i = 0; i < 22; i++) { const [x, z] = outside(area, 18, 60); du.push({ x, z, s: rnd(6, 14), sy: rnd(1.2, 3) }); }
    const dm = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon('#f0c070', { rim: .2 }), du.length); const o = new THREE.Object3D();
    du.forEach((d, i) => { o.position.set(d.x, 0, d.z); o.scale.set(d.s, d.sy, d.s * .7); o.updateMatrix(); dm.setMatrixAt(i, o.matrix); }); dm.frustumCulled = false; sc.add(dm);
    const tw = []; for (let i = 0; i < 5; i++) { const [x, z] = outside(area, 3, 12); tw.push({ x, z, y: 0, s: rnd(.7, 1.1), ph: rnd(0, 60), anim: null }); }
    const TW = instSet(sc, 'rodadora', tw);
    const vul = flyers(sc, 5, ['#5a3a2a', '#6a4a3a'], [1.4, .45], () => ({ cx: rnd(-20, 20), cz: zc + rnd(-30, 0), r: rnd(8, 16), y: rnd(16, 22), sp: rnd(.2, .35), ph: rnd(0, 6) }));
    const sand = points(sc, L ? 140 : 260, '#ffe0a0', .14, [-45, 45, 0, 4, zc - 60, zc + 25], .75);
    const R = rays(sc, 5, '#fff0b0', area, .07);
    ticks.push((t, dt) => { const ob = TW.o; tw.forEach((w, i) => { const k = ((t * 3 + w.ph) % 90) - 45; const y = .02 + Math.abs(Math.sin(t * 4 + i)) * .5; ob.position.set(k, y, w.z); ob.rotation.set(0, t * 2 + i, 0); ob.scale.setScalar(w.s); ob.updateMatrix(); TW.im.setMatrixAt(i, ob.matrix); }); TW.im.instanceMatrix.needsUpdate = true;
      for (const g of vul) { const u = g.userData, k = t * u.sp + u.ph; g.position.set(u.cx + Math.cos(k) * u.r, u.y, u.cz + Math.sin(k) * u.r); g.rotation.set(0, -k, .25); const f = Math.sin(t * 2 + u.ph) * .25; u.a.rotation.z = f; u.b.rotation.z = -f; }
      const p = sand.p; for (let i = 0; i < sand.n; i++) { p[i * 3] += dt * (6 + (i % 4)); if (p[i * 3] > 45) p[i * 3] = -45; p[i * 3 + 1] = Math.abs(Math.sin(t * 1.5 + i)) * 3; } sand.g.attributes.position.needsUpdate = true;
      R.forEach(r => r.material.opacity = r.userData.op * (.6 + .4 * Math.sin(t * .5 + r.userData.ph))); });
  } else if (mk === 'nieve') {
    // aurora boreal, bosque de pinos denso en capas, montículos de nieve, nevada, humo de iglús y destellos en la nieve
    const aur = []; for (let i = 0; i < 3; i++) { const g = new THREE.PlaneGeometry(220, 22, 40, 1); const m = new THREE.MeshBasicMaterial({ color: ['#7affc8', '#8ad0ff', '#c89aff'][i], transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }); const a = mesh(g, m, sc, [0, 60 + i * 6, zc - 170 - i * 10], [-.25, 0, 0]); a.userData.base = g.attributes.position.array.slice(); aur.push(a); }
    const pines = []; for (let i = 0; i < (L ? 50 : 90); i++) { const [x, z] = outside(area, 6, 40); pines.push({ x, z, s: rnd(1.2, 3.2), ry: rnd(0, 6), anim: 'sway', ph: rnd(0, 6) }); }
    const P = instSet(sc, 'pino', pines);
    const mo = []; for (let i = 0; i < 26; i++) { const [x, z] = outside(area, 3, 30); mo.push({ x, z, s: rnd(1, 3), sy: rnd(.4, .9) }); }
    const mm = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), toon('#ffffff', { rim: .4 }), mo.length); const o = new THREE.Object3D();
    mo.forEach((d, i) => { o.position.set(d.x, 0, d.z); o.scale.set(d.s, d.sy, d.s); o.updateMatrix(); mm.setMatrixAt(i, o.matrix); }); mm.frustumCulled = false; sc.add(mm);
    const snow = points(sc, L ? 260 : 450, '#ffffff', .2, [-45, 45, 0, 25, zc - 60, zc + 25], .95);
    const sp = []; for (let i = 0; i < (L ? 14 : 24); i++) { const [x, z] = outside(area, 1.5, 16); const g = glowSprite('#ffffff', .9, .8); g.position.set(x, .25, z); g.userData.ph = rnd(0, 6); sc.add(g); sp.push(g); }
    ticks.push((t, dt) => { P.tick(t); aur.forEach((a, j) => { const ar = a.geometry.attributes.position.array, b = a.userData.base; for (let i = 0; i < ar.length; i += 3) ar[i + 1] = b[i + 1] + Math.sin(b[i] * .05 + t * .6 + j) * 4; a.geometry.attributes.position.needsUpdate = true; a.material.opacity = .16 + .08 * Math.sin(t * .4 + j * 2); });
      const p = snow.p; for (let i = 0; i < snow.n; i++) { let y = p[i * 3 + 1] - dt * (1.2 + (i % 5) * .3); if (y < 0) y = 25; p[i * 3 + 1] = y; p[i * 3] += Math.sin(t + i) * dt * .4; } snow.g.attributes.position.needsUpdate = true;
      sp.forEach(g => { const k = Math.max(0, Math.sin(t * 2.5 + g.userData.ph)); g.material.opacity = k * k * .9; }); });
  } else if (mk === 'selva') {
    const fl = flyers(sc, L ? 10 : 16, ['#ff9cc8', '#ffe27a', '#8fd0ff', '#c9a2ff'], [.32, .24], () => { const [x, z] = outside(area, 1, 8); return { cx: x, cy: rnd(1.2, 4), cz: z, r: rnd(1, 2.5), sp: rnd(.5, 1.1), ph: rnd(0, 6), bf: 1 }; });
    const leaves = points(sc, L ? 80 : 140, '#7ad85a', .22, box, .9);
    const R = rays(sc, 7, '#fff6c0', area, .09);
    ticks.push((t, dt) => { for (const g of fl) { const u = g.userData, k = t * u.sp + u.ph; g.position.set(u.cx + Math.cos(k) * u.r, u.cy + Math.sin(k * 2.3) * .6, u.cz + Math.sin(k) * u.r); g.rotation.y = -k; const f = Math.sin(t * 18 + u.ph) * 1.1; u.a.rotation.y = f; u.b.rotation.y = -f; }
      const p = leaves.p; for (let i = 0; i < leaves.n; i++) { let y = p[i * 3 + 1] - dt * (.6 + (i % 5) * .15); if (y < .05) y = 22; p[i * 3 + 1] = y; p[i * 3] += Math.sin(t * 1.3 + i) * dt * .5; } leaves.g.attributes.position.needsUpdate = true;
      R.forEach(r => r.material.opacity = r.userData.op * (.6 + .4 * Math.sin(t * .6 + r.userData.ph))); });
  }
  return { tick(t, dt) { for (const f of ticks) f(t, dt); } };
}
